/* 55-api-guard.js — 後端傳輸防護層（v1，2026-10-07）「瘦身＋防呆」
   ──────────────────────────────────────────────────────────────────────────
   問題（2026 實測）：
     ・全站 45 個 fetch(gasUrl) 呼叫點，冇 timeout、冇重試、冇大細上限——
       後端一慢／一斷，畫面只會「靜靜地冇反應」，改動仲會丟失（.catch(()=>{}) 吞晒）。
     ・網絡一斷，所有 saveRecord 直接消失，冇任何補救。
     ・localStorage 74 個寫入點冇配額保護——一爆 QuotaExceededError 成個 flow 即炸。
   做法（其他系統標準配備，一個檔搞掂，唔使逐個呼叫點改）：
     ① window.fetch 包一層（只攔 GAS 請求，其他 URL 原封不動照走）：
        ・GET：25 秒 timeout＋自動重試 2 次（指數退避，只重試網絡錯／5xx／429）
             ＋單飛（同一 URL 同一時間只發一次，後嚟者共用結果）
             ＋回應大細上限（>10MB 即斷，唔會食爆瀏覽器）
        ・POST：timeout 有、自動重試冇（避免重複寫入）；網絡級失敗（請求根本冇送到）
             一律排隊入離線補送匣（outbox），後端一返正常就自動補送
     ② 斷路器（circuit breaker）：連續 4 次網絡失敗 → 開路 60 秒，期間唔再轟 Google
       （避免觸發 Google 配額 429）；期滿半開試一次，得就復原
     ③ localStorage.setItem 包一層：爆配額時自動清「其他活動」嘅舊快取（最大的先清，
       永不動 gas_url／api_key／登入身份），清完重試一次；再失敗先照舊 throw
     ④ 補送匣：上限 30 條、每條最多試 5 次、7 日後過期；成功補送會 toast 通知
   注意：
     ・呢層完全被動——所有現有呼叫點（gasPost／23-sync／各模組 raw fetch）即刻受保護，
       唔使改任何一行業務代碼。
     ・喺冇 window／冇 fetch 嘅環境（Node 測試）自動 no-op，唔會影響測試。
     ・離線補送係「盡量一次」語義：網絡級失敗通常＝請求未送達後端；若極端情況下
       後端收咗但回應丟失，補送有機會重複——呢個風險比「改動全部丟失」細得多。
   手動操作：console 可以打 GASGuard.status() 着狀態、GASGuard.flush() 即刻補送。 */
(function () {
  'use strict';
  try {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;   // Node／測試環境：no-op
    if (window.__GASGUARD_INSTALLED__) return; window.__GASGUARD_INSTALLED__ = true;
  } catch (e) { return; }

  var CFG = {
    timeoutMs: 25000,            // 單一請求 25 秒上限
    maxRetries: 2,               // GET 自動重試次數（POST 永不自動重試）
    retryBackoffMs: 800,         // 重試退避基數（800ms → 1600ms）
    maxResponseBytes: 10 * 1024 * 1024,  // 回應上限 10MB
    breakerThreshold: 4,         // 連續網絡失敗幾多次開路
    breakerOpenMs: 60000,        // 開路 60 秒
    outboxMax: 30,               // 補送匣上限
    outboxMaxTries: 5,           // 每條最多補送 5 次
    outboxMaxAgeMs: 7 * 86400000 // 7 日過期
  };
  var OUTBOX_KEY = 'gas_outbox_v1';
  var rawFetch = window.fetch.bind(window);
  var state = { breakerFails: 0, breakerOpenUntil: 0, inflight: {}, flushing: false, lastQueueToast: 0 };

  /* ── 工具 ── */
  function isGASUrl(url) {
    try {
      var s = String(url);
      if (/script\.google\.com|script\.googleusercontent\.com/.test(s)) return true;
      var g = (typeof localStorage === 'object' && localStorage) ? localStorage.getItem('gas_url') : '';
      return !!(g && s.indexOf(g) === 0);
    } catch (e) { return false; }
  }
  function reqInfo(input, init) {
    var url = '', method = 'GET';
    try {
      if (typeof input === 'string' || (typeof URL !== 'undefined' && input instanceof URL)) {
        url = String(input); method = String((init && init.method) || 'GET').toUpperCase();
      } else if (input && typeof input.url === 'string') {
        url = input.url; method = String(input.method || (init && init.method) || 'GET').toUpperCase();
      }
    } catch (e) {}
    return { url: url, method: method };
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function guardError(code, msg) { var e = new Error(msg || ('GAS_GUARD_' + code)); e.gasGuard = code; return e; }
  function isNetworkError(err) {
    // 用 name 判斷而唔係 instanceof：瀏覽器／Worker／vm 沙盒各有自己嘅 TypeError realm，
    // instanceof 跨 realm 會判錯（測試實測發現）；name 係純字串，跨環境一致。
    var name = (err && err.name) || '';
    return name === 'TypeError' || name === 'AbortError' || name === 'NetworkError';
  }
  function toast(msg, type) {
    try { if (typeof showToast === 'function') showToast(msg, type || 'info'); } catch (e) {}
  }
  function hashStr(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); }

  /* ── 斷路器 ── */
  function breakerOpen() { return Date.now() < state.breakerOpenUntil; }
  function noteFailure() { if (++state.breakerFails >= CFG.breakerThreshold) state.breakerOpenUntil = Date.now() + CFG.breakerOpenMs; }
  function noteSuccess() { state.breakerFails = 0; state.breakerOpenUntil = 0; }

  /* ── 回應大細上限（用 clone 量，唔食掉原本 body）── */
  async function capCheck(res) {
    try {
      if (res && typeof res.clone === 'function') {
        var c = res.clone();
        var size = (typeof c.blob === 'function') ? (await c.blob()).size : 0;
        if (size > CFG.maxResponseBytes) throw guardError('RESPONSE_TOO_LARGE', '後端回應 ' + Math.round(size / 1048576) + 'MB 超過 10MB 上限（請改用分頁／section 參數細分請求）');
      }
    } catch (err) { if (err && err.gasGuard) throw err; } // 量唔到（例如 stub）就放行
  }

  /* ── 離線補送匣 ── */
  var WRITE_ACTION_RE = /^(save|create|update|delete|upsert|register|pull|resolve|send|remove|toggle|confirm|approve)/i;
  function loadOutbox() {
    try { var a = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function saveOutbox(list) { try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); } catch (e) {} }
  function queueOutbox(url, init) {
    try {
      var body = init && typeof init.body === 'string' ? init.body : '';
      if (!body) return;
      var action = ''; try { action = String((JSON.parse(body) || {}).action || ''); } catch (e) {}
      if (!action || !WRITE_ACTION_RE.test(action)) return;                 // 只有寫入操作先需要補送
      var list = loadOutbox();
      var h = hashStr(url + '|' + body);
      if (list.some(function (x) { return x.h === h; })) return;            // 同一內容唔重複排隊
      list.push({ h: h, url: url, body: body, action: action, at: Date.now(), tries: 0 });
      while (list.length > CFG.outboxMax) list.shift();
      saveOutbox(list);
      if (Date.now() - state.lastQueueToast > 30000) {
        state.lastQueueToast = Date.now();
        toast('後端暫時連唔到：已將「' + action + '」改動排隊，後端復原後自動補送（現有 ' + list.length + ' 項）', 'info');
      }
    } catch (e) {}
  }
  async function flushOutbox() {
    if (state.flushing || breakerOpen()) return { sent: 0, kept: loadOutbox().length };
    state.flushing = true;
    var sent = 0;
    try {
      var list = loadOutbox(), keep = [], now = Date.now();
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        if (now - it.at > CFG.outboxMaxAgeMs || it.tries >= CFG.outboxMaxTries) continue; // 過期／試夠＝唔要
        if (sent >= 5) { keep.push(it); continue; }                                        // 每次最多補 5 條：限額外原樣保留
        var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 20000) : null;
        var okOne = false;
        try {
          var res = await rawFetch(it.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: it.body, redirect: 'follow', credentials: 'omit', signal: ctrl ? ctrl.signal : undefined });
          okOne = !!(res && res.status >= 200 && res.status < 500); // 2xx／3xx／4xx＝後端收到咗（4xx＝業務拒絕，都算送達，唔使再補）
        } catch (e) { okOne = false; }
        if (timer) clearTimeout(timer);
        if (okOne) sent++; else { it.tries++; keep.push(it); }
      }
      saveOutbox(keep);
      if (sent > 0) { noteSuccess(); toast('✓ 已補送 ' + sent + ' 項離線改動去後端', 'success'); }
    } finally { state.flushing = false; }
    return { sent: sent, kept: loadOutbox().length };
  }

  /* ── GET：單飛＋重試＋timeout＋大細上限 ── */
  async function gasGet(url, init) {
    if (state.inflight[url]) return state.inflight[url];                    // 單飛：同一 URL 大家共用一個請求
    var p = (async function () {
      var lastErr = null;
      for (var attempt = 0; attempt <= CFG.maxRetries; attempt++) {
        if (attempt > 0) await sleep(CFG.retryBackoffMs * Math.pow(2, attempt - 1));
        if (breakerOpen()) throw guardError('BREAKER_OPEN', '後端連續失敗中，暫停 60 秒再試（斷路器保護，避免觸發 Google 配額）');
        var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, CFG.timeoutMs) : null;
        try {
          var res = await rawFetch(url, ctrl ? Object.assign({}, init, { signal: ctrl.signal }) : init);
          if (timer) clearTimeout(timer);
          if (res && (res.status === 429 || res.status >= 500) && attempt < CFG.maxRetries) continue;  // 429／5xx：值得重試
          await capCheck(res);
          noteSuccess();
          setTimeout(function () { try { flushOutbox(); } catch (e) {} }, 3000);                        // 後端返生：3 秒後自動補送
          return (res && typeof res.clone === 'function') ? res.clone() : res;                          // 每個等緊嘅呼叫者攞自己嘅 clone，body 唔會爭
        } catch (err) {
          if (timer) clearTimeout(timer);
          lastErr = err;
          if (err && err.gasGuard) throw err;                                // 我哋自己嘅防護錯（太大／開路）唔重試
          if (isNetworkError(err)) { noteFailure(); if (attempt < CFG.maxRetries) continue; }
          throw err;
        }
      }
      throw lastErr;
    })();
    state.inflight[url] = p;
    try { return await p; } finally { delete state.inflight[url]; }
  }

  /* ── POST：timeout＋失敗排隊（永不自動重試，避免重複寫入）── */
  async function gasPost(url, init) {
    if (breakerOpen()) { queueOutbox(url, init); throw guardError('BREAKER_OPEN_QUEUED', '後端連續失敗中：改動已排隊補送，60 秒後會再試'); }
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, CFG.timeoutMs) : null;
    try {
      var res = await rawFetch(url, ctrl ? Object.assign({}, init, { signal: ctrl.signal }) : init);
      if (timer) clearTimeout(timer);
      await capCheck(res);
      noteSuccess();
      return res;
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err && err.gasGuard) throw err;
      noteFailure();
      if (isNetworkError(err)) queueOutbox(url, init);                      // 網絡級失敗＝請求未送達：排隊補送
      throw err;
    }
  }

  /* ── 安裝 fetch 包裝 ── */
  window.fetch = function (input, init) {
    try {
      var info = reqInfo(input, init);
      if (!info.url || !isGASUrl(info.url)) return rawFetch(input, init);   // 非 GAS（data/*.json／天氣 API／圖片）原封不動
      return (info.method === 'GET' || info.method === 'HEAD') ? gasGet(info.url, init) : gasPost(info.url, init);
    } catch (e) { return Promise.reject(e); }
  };

  /* ── localStorage 配額防護 ── */
  var PROTECTED_LS = { gas_url: 1, api_key: 1, current_user: 1, current_event: 1, mock_mode: 1, event_events_v7: 1, gas_outbox_v1: 1 };
  function currentEventId() {
    try { var c = JSON.parse(localStorage.getItem('current_event') || 'null'); return (c && c.event_id) || ''; } catch (e) { return ''; }
  }
  function evictForQuota() {
    var eid = currentEventId(), removed = 0;
    try {
      var sizes = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || PROTECTED_LS[k]) continue;
        if (!/^event_/.test(k)) continue;                                    // 只清「活動資料快取」類 key
        if (eid && k.indexOf('_' + eid) >= 0) continue;                      // 而家緊用嘅活動唔清
        var v = localStorage.getItem(k) || '';
        sizes.push([v.length, k]);
      }
      sizes.sort(function (a, b) { return b[0] - a[0]; });                   // 最大嘅先清，一次清 5 個
      sizes.slice(0, 5).forEach(function (x) { localStorage.removeItem(x[1]); removed++; });
    } catch (e) {}
    return removed;
  }
  try {
    if (typeof Storage === 'function' && Storage.prototype && typeof Storage.prototype.setItem === 'function') {
      var rawSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        try { return rawSetItem.call(this, k, v); }
        catch (err) {
          var quotaish = (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014));
          if (!quotaish || this !== (typeof window !== 'undefined' ? window.localStorage : null)) throw err;
          if (evictForQuota() > 0) {
            try { return rawSetItem.call(this, k, v); } catch (e2) {}        // 清咗舊嘢再試一次
          }
          console.warn('[GASGuard] localStorage 已滿：寫入失敗（key=' + k + '）', err);
          throw err;
        }
      };
    }
  } catch (e) {}

  /* ── 對外介面（console 用）── */
  window.GASGuard = {
    config: CFG,
    status: function () {
      return { outbox: loadOutbox().length, breakerOpen: breakerOpen(), consecutiveFailures: state.breakerFails, inflightGets: Object.keys(state.inflight).length };
    },
    flush: function () { return flushOutbox(); },
    pendingOutbox: loadOutbox
  };
})();
