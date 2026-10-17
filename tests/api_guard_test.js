#!/usr/bin/env node
'use strict';
/* v16 瘦身＋防呆機制測試（2026-10-07）
   ① js/55-api-guard.js：fetch 防護層（timeout／重試／單飛／回應上限／斷路器／離線補送／localStorage 配額）
   ② js/10-app-core.js：移除 ?t=Date.now() 快取殺手（每次入 dashboard 唔再重下載 900KB）
   ③ vercel.json／.vercelignore／api/config.js：靜態快取＋部署瘦身
   ④ apps-script/Code2027Unified.gs：rate limit／請求回應上限／getMasterTab limit 參數 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0;
const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); n++; };
const GAS_URL = 'https://script.google.com/macros/s/FAKE/exec';

(async function main(){

/* ── 測試環境工廠：假 window＋假 fetch＋假 localStorage ── */
class FakeStorage {
  constructor(store) { this._s = store; }
  getItem(k) { return this._s.has(k) ? this._s.get(k) : null; }
  setItem(k, v) { this._s.set(k, String(v)); }
  removeItem(k) { this._s.delete(k); }
  key(i) { return Array.from(this._s.keys())[i] ?? null; }
  get length() { return this._s.size; }
}
class QuotaStorage extends FakeStorage {
  constructor(store, throwTimes) { super(store); this.throwTimes = throwTimes; this.calls = 0; }
  setItem(k, v) { if (this.calls++ < this.throwTimes) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } super.setItem(k, v); }
}
function makeEnv(fetchImpl, StorageClass) {
  const store = new Map();
  const S = StorageClass || FakeStorage;
  const ls = new S(store);
  const win = { fetch: fetchImpl };
  win.window = win; win.localStorage = ls;
  const ctx = {
    window: win, localStorage: ls, Storage: S, console,
    setTimeout, clearTimeout, AbortController
  };
  vm.runInNewContext(read('js/55-api-guard.js'), ctx);
  return { win, ls, store, ctx };
}
const fakeRes = (status, opts) => Object.assign({
  ok: status >= 200 && status < 300, status,
  clone() { return fakeRes(status, opts); },
  blob: async () => ({ size: 100 })
}, opts || {});
const makeFetcher = (impls) => {
  const calls = [];
  const fetchImpl = (input, init) => {
    calls.push({ url: String((input && input.url) || input), init });
    const fn = typeof impls === 'function' ? impls : (impls.length ? impls.shift() : () => fakeRes(200));
    return Promise.resolve().then(() => fn(input, init));
  };
  return { calls, fetchImpl };
};
const netErr = () => Promise.reject(new TypeError('Failed to fetch'));
const throws = async (p) => { try { await p; return null; } catch (e) { return e; } };

/* ══ ① 安裝＋直通 ══ */
{
  const { calls, fetchImpl } = makeFetcher([() => fakeRes(200)]);
  const env = makeEnv(fetchImpl);
  ok(env.win.__GASGUARD_INSTALLED__ === true && typeof env.win.GASGuard.status === 'function', '① 防護層安裝（window.GASGuard 就緒）');
  const res = await env.win.fetch('data/mock_demo.json');
  ok(res.ok && calls.length === 1, '① 非 GAS URL（data/*.json）原封不動直通，唔會被攔');
}

/* ══ ② GAS GET：成功＋重試＋單飛 ══ */
{
  const { calls, fetchImpl } = makeFetcher([() => fakeRes(200)]);
  const env = makeEnv(fetchImpl);
  const res = await env.win.fetch(GAS_URL + '?action=getEventData');
  ok(res.ok === true && calls.length === 1, '② GAS GET 成功：回應照常畀返呼叫者');
}
{
  const { calls, fetchImpl } = makeFetcher([netErr, netErr, () => fakeRes(200)]);
  const env = makeEnv(fetchImpl);
  env.win.GASGuard.config.retryBackoffMs = 0;
  const res = await env.win.fetch(GAS_URL + '?action=getUsers');
  ok(res.ok === true && calls.length === 3, '② GAS GET 網絡錯誤：自動重試 2 次後成功（原版會直接死）');
}
{
  const { calls, fetchImpl } = makeFetcher([() => fakeRes(200)]);
  const env = makeEnv(fetchImpl);
  const [a, b] = await Promise.all([env.win.fetch(GAS_URL + '?action=getUsers'), env.win.fetch(GAS_URL + '?action=getUsers')]);
  ok(calls.length === 1 && a.ok && b.ok, '② 單飛：兩個並發同 URL GET 只發一次請求，兩邊都攞到回應');
}
{
  const { calls, fetchImpl } = makeFetcher([() => fakeRes(200), () => fakeRes(200)]);
  const env = makeEnv(fetchImpl);
  await Promise.all([env.win.fetch(GAS_URL + '?a=1'), env.win.fetch(GAS_URL + '?a=2')]);
  ok(calls.length === 2, '② 唔同 URL 唔會俾單飛合併');
}
{
  const { calls, fetchImpl } = makeFetcher([() => fakeRes(500), () => fakeRes(429), () => fakeRes(200)]);
  const env = makeEnv(fetchImpl);
  env.win.GASGuard.config.retryBackoffMs = 0;
  const res = await env.win.fetch(GAS_URL + '?action=x');
  ok(res.ok === true && calls.length === 3, '② GAS 回 500／429 會重試（Google 配額 Google 自己叫你 retry）');
}

/* ══ ③ 回應大細上限＋timeout ══ */
{
  const { fetchImpl } = makeFetcher([() => fakeRes(200, { blob: async () => ({ size: 11 * 1024 * 1024 }) })]);
  const env = makeEnv(fetchImpl);
  const err = await throws(env.win.fetch(GAS_URL + '?action=getAll'));
  ok(err && err.gasGuard === 'RESPONSE_TOO_LARGE', '③ 回應超過 10MB 上限即斷（唔會食爆瀏覽器／Vercel）');
}
{
  const fetchImpl = (input, init) => new Promise((_, rej) => {
    init.signal.addEventListener('abort', () => { const e = new Error('The operation was aborted'); e.name = 'AbortError'; rej(e); });
  });
  const env = makeEnv(fetchImpl);
  env.win.GASGuard.config.timeoutMs = 30; env.win.GASGuard.config.maxRetries = 0;
  const t0 = Date.now();
  const err = await throws(env.win.fetch(GAS_URL + '?action=slow'));
  ok(err && Date.now() - t0 < 5000, '③ 25 秒（測試 30ms）timeout：唔會永遠等一個死咗嘅後端');
}

/* ══ ④ POST：失敗排隊補送（永不自動重試＝唔會重複寫入）══ */
{
  const { fetchImpl } = makeFetcher([netErr]);
  const env = makeEnv(fetchImpl);
  const body = JSON.stringify({ action: 'saveRecord', api_key: 'k', module: 'Meals', record: { order_id: 'M1' } });
  const err = await throws(env.win.fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body }));
  ok(err instanceof TypeError || (err && err.message), '④ POST 網絡失敗：照舊 throw（呼叫者 catch 得到）');
  ok(env.win.GASGuard.status().outbox === 1, '④ 失敗嘅 saveRecord 已排入離線補送匣（原版會直接丟失）');
  const q = JSON.parse(env.store.get('gas_outbox_v1'));
  ok(q[0].action === 'saveRecord' && q[0].tries === 0, '④ 補送匣記錄 action＋tries');
}
{
  const { fetchImpl } = makeFetcher([netErr]);
  const env = makeEnv(fetchImpl);
  const init = { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ action: 'saveRecord', record: { x: 1 } }) };
  await throws(env.win.fetch(GAS_URL, init));
  await throws(env.win.fetch(GAS_URL, init));
  ok(env.win.GASGuard.status().outbox === 1, '④ 同一內容唔會重複排隊（hash 去重）');
}
{
  const { fetchImpl } = makeFetcher([() => fakeRes(400)]);
  const env = makeEnv(fetchImpl);
  const res = await env.win.fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'saveRecord' }) });
  ok(res.status === 400 && env.win.GASGuard.status().outbox === 0, '④ 後端有回應（4xx＝業務拒絕）＝已送達，唔排隊');
}
{
  const { fetchImpl } = makeFetcher([netErr]);
  const env = makeEnv(fetchImpl);
  await throws(env.win.fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getEventData' }) }));
  ok(env.win.GASGuard.status().outbox === 0, '④ 讀取操作（get*）唔會排隊補送');
}
{
  const { fetchImpl } = makeFetcher([netErr, netErr]);
  const env = makeEnv(fetchImpl);
  await throws(env.win.fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'saveRecord', record: { y: 2 } }) }));
  const r = await env.win.GASGuard.flush();
  ok(r.kept === 1, '④ 後端仲係死：補送失敗會保留（tries+1），唔會掉');
  const q = JSON.parse(env.store.get('gas_outbox_v1'));
  ok(q[0].tries === 1, '④ 補送失敗 tries 加 1（5 次後先放棄）');
}
{
  const { fetchImpl } = makeFetcher([netErr, () => fakeRes(200)]);
  const env = makeEnv(fetchImpl);
  await throws(env.win.fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'saveRecord', record: { z: 3 } }) }));
  const r = await env.win.GASGuard.flush();
  ok(r.sent === 1 && r.kept === 0, '④ 後端返生：flush 成功補送，補送匣清空');
  ok(env.win.GASGuard.status().outbox === 0, '④ 補送後 status().outbox 歸零');
}

/* ══ ⑤ 斷路器 ══ */
{
  const { calls, fetchImpl } = makeFetcher([netErr, netErr, netErr, netErr, netErr]);
  const env = makeEnv(fetchImpl);
  env.win.GASGuard.config.maxRetries = 0; env.win.GASGuard.config.breakerThreshold = 2;
  await throws(env.win.fetch(GAS_URL + '?a=1'));
  await throws(env.win.fetch(GAS_URL + '?a=2'));
  ok(env.win.GASGuard.status().breakerOpen === true, '⑤ 連續失敗達門檻：斷路器開路');
  const before = calls.length;
  const err = await throws(env.win.fetch(GAS_URL + '?a=3'));
  ok(err && err.gasGuard === 'BREAKER_OPEN' && calls.length === before, '⑤ 開路期間 GET 即拒，唔再轟 Google（防 429 配額）');
  const perr = await throws(env.win.fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'saveRecord', record: { q: 1 } }) }));
  ok(perr && perr.gasGuard === 'BREAKER_OPEN_QUEUED' && env.win.GASGuard.status().outbox === 1, '⑤ 開路期間 POST 直接排隊（BREAKER_OPEN_QUEUED）');
}

/* ══ ⑥ localStorage 配額防護 ══ */
{
  const store = new Map();
  store.set('current_event', JSON.stringify({ event_id: 'isd_2027' }));
  store.set('event_staff_v7_isd_2026', 'x'.repeat(100000));   // 舊活動快照（大舊嘢）
  store.set('gas_outbox_v1', '[]');
  const qs = new QuotaStorage(store, 1);                       // 第一次 setItem 爆配額，之後正常
  const { fetchImpl } = makeFetcher([() => fakeRes(200)]);
  const win = { fetch: fetchImpl }; win.window = win; win.localStorage = qs;
  const ctx = { window: win, localStorage: qs, Storage: QuotaStorage, console, setTimeout, clearTimeout, AbortController };
  vm.runInNewContext(read('js/55-api-guard.js'), ctx);
  ctx.window.localStorage.setItem('event_meals_v7_isd_2027', JSON.stringify({ orders: [1, 2, 3] }));
  ok(store.has('event_meals_v7_isd_2027'), '⑥ 爆配額：清走舊活動快取後寫入成功（原版直接炸）');
  ok(!store.has('event_staff_v7_isd_2026'), '⑥ 被清嘅係「其他活動」嘅舊快取（最大先清）');
  ok(store.has('current_event') && store.has('gas_outbox_v1'), '⑥ 保護 key（current_event／outbox）永不被清');
}
{
  const store = new Map();
  store.set('current_event', JSON.stringify({ event_id: 'isd_2027' }));
  const qs = new QuotaStorage(store, 99);                      // 點寫都爆
  const { fetchImpl } = makeFetcher([() => fakeRes(200)]);
  const win = { fetch: fetchImpl }; win.window = win; win.localStorage = qs;
  const ctx = { window: win, localStorage: qs, Storage: QuotaStorage, console, setTimeout, clearTimeout, AbortController };
  vm.runInNewContext(read('js/55-api-guard.js'), ctx);
  const err = await (async () => { try { ctx.window.localStorage.setItem('gas_url', 'https://x'); return null; } catch (e) { return e; } })();
  ok(err && err.name === 'QuotaExceededError', '⑥ 清無可清：照舊 throw（語義同原版一致，唔會靜靜哞吞數據）');
}

/* ══ ⑦ 檔案級：接線＋瘦身 ══ */
const html = read('index.html');
ok(/<script src="js\/55-api-guard\.js\?v=[^"]+"><\/script>/.test(html), '⑦ index.html 已掛載 55-api-guard.js');
const vers = [...new Set([...html.matchAll(/<script[^>]+src="[^"]+\?v=([^"]+)"/g)].map(m => m[1]))];
ok(vers.length === 1 && vers[0] === '20261007a', `⑦ 全部 40 個 script 統一 cache-buster（而家＝${vers[0]}）`);
ok(html.indexOf('js/55-api-guard.js') < html.indexOf('js/10-app-core.js'), '⑦ 防護層喺業務模組之前載入');
const core = read('js/10-app-core.js');
ok(!core.includes('.json?t=${Date.now()}'), '⑦ loadEventData 已移除 ?t=Date.now() 快取殺手（唔再每次重下載 900KB）');
ok(core.includes('ETag 協商'), '⑧ 以 ETag＋data_version 雙機制代替（有註解説明）');
const vercel = JSON.parse(read('vercel.json'));
const hdr = (src) => (vercel.headers.find(h => h.source === src) || {}).headers || [];
ok(hdr('/google_drive/(.*)').some(h => h.value.includes('immutable')), '⑦ google_drive（唯讀 PDF）＝immutable 一年快取');
ok(hdr('/assets/(.*)').some(h => h.value.includes('604800')), '⑦ assets＝7 日快取（以前 1 小時）');
ok(hdr('/js/(.*)').some(h => h.value === 'public, max-age=86400, s-maxage=604800'), '⑦ JS 使用瀏覽器 1 日／CDN 7 日快取');
ok(vercel.buildCommand === 'true', '⑦ Vercel 使用 no-op build command');
ok(vercel.git?.deploymentEnabled?.main === true, '⑦ 只允許 main 分支部署');
ok(vercel.rewrites.some(r => r.source === '/assets/event-day/crisis-manual-2026.pdf' && r.destination === '/assets/event-day/crisis-manual-2027.pdf'), '⑦ 2026 歷史 PDF URL 轉至唯一保留檔案');
const ig = read('.vercelignore');
ok(/tools|tests|apps-script|docs/.test(ig) && /2027_simulation/.test(ig), '⑦ .vercelignore：開發工具＋模擬資料唔推上 Vercel（部署瘦身＋模擬邊界）');
ok(read('api/config.js').includes("public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"), '⑦ /api/config 設定短期瀏覽器／CDN 快取');

/* ══ ⑧ GS：後端防呆 ══ */
const gs = read('apps-script/Code2027Unified.gs');
const tmp = path.join(os.tmpdir(), 'gs-v12-check.js');
fs.writeFileSync(tmp, gs);
const gsCheck = cp.spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
ok(gsCheck.status === 0, '⑧ Code2027Unified.gs 語法正確');
ok(gs.includes("ISD2027_UNIFIED_VERSION = '2027-unified-gs-v1.2'"), '⑧ GS 版本 bump 至 v1.2');
ok(gs.includes('ISD2027_MAX_REQUEST_CHARS') && gs.includes('request_too_large'), '⑧ 請求 body 8MB 上限（超過即拒，唔會行到 30 秒限時先死）');
ok(gs.includes('ISD2027_MAX_RESPONSE_CHARS') && gs.includes('response_too_large'), '⑧ 回應 10MB 上限（同前端 GASGuard 一致）');
ok(gs.includes('function rateLimitOk_()') && gs.includes('ISD2027_RATE_LIMIT'), '⑧ 每分鐘 120 請求 rate limit（防 loop 打爆 Google 配額）');
ok(/doGet[\s\S]{0,400}rateLimitOk_\(\)/.test(gs) && /doPost[\s\S]{0,600}rateLimitOk_\(\)/.test(gs), '⑧ GET＋POST 兩個入口都有 rate limit');
ok(gs.includes('Number((data && data.limit) || MASTER_MAX_ROWS)'), '⑧ getMasterTab 有 limit 分頁參數（大分頁可以逐段攞）');

console.log(`v16 瘦身＋防呆機制測試通過（${n} 項）`);

})().catch(e => { console.error(e); process.exit(1); });
