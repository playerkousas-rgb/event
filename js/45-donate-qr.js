/* 45-donate-qr.js — 童心捐贈「一次入數」QR 方案（v19）
   ──────────────────────────────────────────────────────────────────────────
   點解要咁做：
     以前係「又收紙、又收 online」，活動完咗之後兩邊對數好煩。
     而家只有一條路：公眾喺自己部瀏覽器填 → 本機產生 QR（完全唔駁後端、唔寫任何嘢）
     → 當日攤位同事掃個 QR → 核對實物 → 撳「確認收貨」→ 【全場唯一一次寫入後端】。
     紙本只係後備（冇手機先用），一樣要由同事喺同一個畫面入返，所以帳目永遠得一本。

   呢個檔淨係放「公眾端同工作人員端都要用」嘅共用部分：
     ① 載荷編碼／解碼（pcDonatePack / pcDonateParse）
     ② 校驗碼（pcDonateCode）——掃唔到都可以口頭報 6 位碼
     ③ 掃描器（pcDonateScanStart / Stop）——BarcodeDetector 行先，冇就 lazy-load jsQR
   產生 QR 圖用返現成嘅 pcQrSvg()（js/44-public-channel.js，本地 vendor qrcode.min.js）。
   ────────────────────────────────────────────────────────────────────────── */
Object.assign(ScoutEventApp.prototype,{

  /* 載荷格式（純文字，夠細先掃得快）：
       HKIRD1|<f|g>|<旅團>|<領袖>|<職銜>|<電話>|<姓名*件數^姓名*件數…>|<校驗碼>
     例：HKIRD1|f|港島第6旅|張國強|旅長|91234567|陳大文*12^李小明*250|7K3Q9M
     分隔符 | ^ * 會喺輸入時剝走，所以唔會撞。 */
  DONATE_QR_PREFIX: 'HKIRD1',

  pcDonateClean(s) {
    return String(s == null ? '' : s).replace(/[|^*\\]/g, ' ').replace(/\s+/g, ' ').trim();
  },

  /* 校驗碼：由載荷本身計出嚟，改一個字都會變。
     用途 ①防手民之誤 ②掃唔到時口頭報碼 ③防同一張單入兩次。 */
  pcDonateCode(s) {
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    const str = String(s || '');
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = ((h1 ^ c) >>> 0) * 16777619 >>> 0;
      h2 = ((h2 + c * (i + 1)) >>> 0) * 2654435761 >>> 0;
    }
    const A = '0123456789ACDEFGHJKLMNPQRTUVWXY'; // 去走 B/I/O/S/Z，口頭報唔會撈亂
    let out = '', n = (h1 ^ h2) >>> 0;
    for (let i = 0; i < 6; i++) { out += A[n % A.length]; n = Math.floor(n / A.length) + (h1 >>> (i * 3)); }
    return out;
  },

  /* 砌載荷。rows = [{name,qty}]；回傳 {text, code, donors, items, bytes} */
  pcDonatePack(scheme, head, rows) {
    const c = s => this.pcDonateClean(s);
    const list = (rows || [])
      .map(r => ({ name: c(r.name), qty: parseInt(r.qty, 10) || 0 }))
      .filter(r => r.name && r.qty > 0);
    const body = [
      this.DONATE_QR_PREFIX,
      scheme === 'goods' ? 'g' : 'f',
      c(head && head.group), c(head && head.leader), c(head && head.pos), c(head && head.phone),
      list.map(r => r.name + '*' + r.qty).join('^')
    ].join('|');
    const code = this.pcDonateCode(body);
    const text = body + '|' + code;
    return {
      text, code, rows: list,
      donors: list.length,
      items: list.reduce((s, r) => s + r.qty, 0),
      bytes: (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(text).length : text.length * 2
    };
  },

  /* 拆載荷。回傳 null = 唔係我哋張單；{ok:false,reason} = 校驗唔過。 */
  pcDonateParse(text) {
    const raw = String(text || '').trim();
    if (raw.indexOf(this.DONATE_QR_PREFIX + '|') !== 0) return null;
    const p = raw.split('|');
    if (p.length < 8) return { ok: false, reason: '格式不完整（可能掃到一半）' };
    const code = p[p.length - 1];
    const body = p.slice(0, p.length - 1).join('|');
    if (this.pcDonateCode(body) !== code) return { ok: false, reason: '校驗碼對唔上（QR 花咗或被改過）' };
    const rows = (p[6] || '').split('^').filter(Boolean).map(x => {
      const i = x.lastIndexOf('*');
      return { name: i < 0 ? x : x.slice(0, i), quantity: i < 0 ? 0 : (parseInt(x.slice(i + 1), 10) || 0) };
    }).filter(r => r.name);
    return {
      ok: true, code, raw,
      scheme: p[1] === 'g' ? 'goods' : 'food',
      scout_group: p[2] || '', leader_name: p[3] || '', leader_position: p[4] || '', leader_phone: p[5] || '',
      items: rows,
      donors: rows.length,
      total: rows.reduce((s, r) => s + (r.quantity || 0), 0)
    };
  },

  /* 應派紀念章：每位捐贈者 1 枚；食品捐贈同一位 >200 件再加特別紀念章＋感謝狀。 */
  pcDonateBadges(parsed) {
    if (!parsed || !parsed.items) return { badges: 0, bonus: 0 };
    const badges = parsed.items.filter(r => (r.quantity || 0) > 0).length;
    const bonus = parsed.scheme === 'food' ? parsed.items.filter(r => (r.quantity || 0) > 200).length : 0;
    return { badges, bonus };
  },

  /* ── 掃描器 ──────────────────────────────────────────────────────────
     行先：BarcodeDetector（Android Chrome 原生，最慳電最快）
     後備：jsQR（本地 vendor，用到先至載，唔會拖慢其他頁） */
  pcScan: null,

  pcDonateLoadJsQR() {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.jsQR) return Promise.resolve(window.jsQR);
    if (this._jsqrLoading) return this._jsqrLoading;
    this._jsqrLoading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/jsqr.min.js';
      s.onload = () => window.jsQR ? res(window.jsQR) : rej(new Error('jsQR 載入失敗'));
      s.onerror = () => rej(new Error('jsQR 載入失敗'));
      document.head.appendChild(s);
    });
    return this._jsqrLoading;
  },

  async pcDonateScanStart(videoId, onResult) {
    this.pcDonateScanStop();
    const video = document.getElementById(videoId);
    if (!video) return;
    const fail = msg => { const b = document.getElementById('don-scan-msg'); if (b) b.textContent = msg; };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (e) {
      fail('開唔到鏡頭（可能未批准權限，或者唔係 https）。可以用下面「人手輸入」。');
      return;
    }
    video.srcObject = stream; video.setAttribute('playsinline', 'true');
    try { await video.play(); } catch (e) { }
    const state = { stream, stop: false, seen: '' };
    this.pcScan = state;

    let detector = null;
    try {
      if (typeof window !== 'undefined' && window.BarcodeDetector) {
        const fmts = await window.BarcodeDetector.getSupportedFormats();
        if (fmts.indexOf('qr_code') >= 0) detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      }
    } catch (e) { }
    let jsQR = null;
    if (!detector) { try { jsQR = await this.pcDonateLoadJsQR(); } catch (e) { fail('掃描器載入失敗，請用「人手輸入」。'); } }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tick = async () => {
      if (state.stop) return;
      try {
        if (video.readyState === 4) {
          let text = '';
          if (detector) {
            const codes = await detector.detect(video);
            if (codes && codes.length) text = codes[0].rawValue || '';
          } else if (jsQR) {
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            if (canvas.width && canvas.height) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
              if (r) text = r.data || '';
            }
          }
          if (text && text !== state.seen) { state.seen = text; onResult(text); }
        }
      } catch (e) { }
      state.raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(tick) : setTimeout(tick, 120);
    };
    tick();
  },

  pcDonateScanStop() {
    const s = this.pcScan;
    if (!s) return;
    s.stop = true;
    try { if (s.raf) { cancelAnimationFrame(s.raf); clearTimeout(s.raf); } } catch (e) { }
    try { (s.stream.getTracks() || []).forEach(t => t.stop()); } catch (e) { }
    this.pcScan = null;
  }

});
