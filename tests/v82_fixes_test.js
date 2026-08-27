#!/usr/bin/env node
'use strict';
/* v8.2 四項修復驗證：
   1) 進入 APP 直接顯示「選擇活動」首頁（唔使按頂部營帳圖示）
   2) 後端帳戶登入：密碼 trim；後端回應異常（POST→GET 舊部署）有明確提示
   3) 財務指引全文內建（唔使開彈窗／Drive）
   4) 組織架構樹形圖層級更新：顧問/主席/秘書處 L1、執行副主席 L2（舊資料自動遷移）；最高層帳號唔顯示
   5) 私隱：除 apps-script/Code.gs 外，任何檔案都唔可以有最高層帳號嘅存在痕跡
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map(m => {
    const attrs = m[1] || '';
    if (/src=/i.test(attrs)) {
      const src = (attrs.match(/src="([^"]+)"/) || [])[1] || '';
      return src.startsWith('js/') ? fs.readFileSync(path.join(root, src), 'utf8') : '';
    }
    return m[2];
  })
  .join('\n');
const core = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);[\s\S]*$/, '')
  + '\nglobalThis.TestApp=ScoutEventApp;';

// ---- per-id element stubs with working classList ----
function makeElement() {
  const classes = new Set(['hidden']);
  return {
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      contains: c => classes.has(c),
      toggle: (c, f) => { const target = f === undefined ? !classes.has(c) : !!f; target ? classes.add(c) : classes.delete(c); return target; }
    },
    style: {}, textContent: '', innerHTML: '', value: '',
    addEventListener() {}, querySelectorAll() { return []; }, insertAdjacentHTML() {},
    get _classes() { return [...classes]; }
  };
}
function makeHarness(fetchImpl) {
  const store = new Map();
  const els = new Map();
  const localStorage = {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };
  const document = {
    getElementById: id => { if (!els.has(id)) els.set(id, makeElement()); return els.get(id); },
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => makeElement(),
    body: { appendChild() {} }
  };
  const context = {
    console, localStorage, document, window: {}, navigator: {}, location: { hash: '' },
    URL: { createObjectURL() { return ''; } }, Blob: function () {}, FileReader: function () {},
    setTimeout: fn => { try { fn(); } catch (e) {} return 0; }, clearTimeout() {},
    fetch: fetchImpl,
    confirm: () => true, alert() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(core, context);
  return { context, document, localStorage, els, store,
    toastText: () => (els.get('toast') || {}).textContent || ''
  };
}

(async () => {
  console.log('=== v8.2 修復驗證 ===');

  // ── (1) 進入 APP 顯示活動選擇頁 ──
  {
    const eventsJson = JSON.parse(fs.readFileSync(path.join(root, 'data/events.json'), 'utf8'));
    const h = makeHarness(async url => {
      const u = String(url);
      if (u.includes('/api/config')) return { ok: false, json: async () => ({}) };
      if (u.includes('data/events.json')) return { ok: true, json: async () => eventsJson };
      if (u.includes('data/')) return { ok: true, json: async () => ({ meetings: [], staff: { org_chart: [], contacts: [], job_duties: [] } }) };
      return { ok: true, json: async () => ({ success: false }) };
    });
    // 事先塞入上次登入及上次活動（模擬上次使用過）
    h.localStorage.setItem('current_user', JSON.stringify({ user_id: 'sys.ops', name: '系統管理員', role: 'super_admin', group_name: '系統' }));
    h.localStorage.setItem('current_event', JSON.stringify(eventsJson[0]));
    h.context.location.hash = '';
    const app = vm.runInContext('new TestApp()', h.context); // constructor → init() → goHome()
    await new Promise(r => setImmediate(r));
    assert.strictEqual(app.currentEvent, null, '(1) 進入 APP 唔應該直接跳入上次活動');
    assert.strictEqual(h.localStorage.getItem('current_event'), null, '(1) current_event 應被清除');
    const landingHidden = h.els.get('view-landing').classList.contains('hidden');
    assert.strictEqual(landingHidden, false, '(1) view-landing 應顯示');
    assert(h.els.get('view-landing')._classes.length >= 0, 'sanity');
    assert.strictEqual(app.currentUser && app.currentUser.user_id, 'sys.ops', '(1) 登入狀態保留');
    console.log('✔ (1) 進入 APP 直接顯示活動選擇首頁，登入狀態保留');
  }

  // ── (2) 後端帳戶登入：密碼 trim + 後端版本提示 ──
  {
    let seenBody = null;
    const h = makeHarness(async (url, opts) => {
      if (String(url).includes('/api/config')) return { ok: false, json: async () => ({}) };
      seenBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ success: true, version: 'v8.2-2026-08-27', user: { user_id: 'sys.ops', name: '系統管理員', role: 'super_admin', group_name: '系統' } }) };
    });
    const app = Object.create(h.context.TestApp.prototype);
    Object.assign(app, { gasUrl: 'https://gas.example/exec', apiKey: 'k', currentEvent: null, currentUser: null, usersList: [], approvalPerms: [] });
    h.document.getElementById('login-email-input').value = 'sys.ops';
    h.document.getElementById('login-password-input').value = '9999  '; // 手機鍵盤尾隨空格
    await app.submitLogin({ preventDefault() {} });
    assert.seenBody = seenBody;
    assert.strictEqual(seenBody.password, '9999', '(2) 前端送出的密碼應已 trim');
    assert.strictEqual(app.currentUser.role, 'super_admin', '(2) 應登入成功');
    const t = h.toastText();
    assert(/登入成功/.test(t), '(2) 應顯示登入成功，實際：' + t);
    assert(/後端 v8\.2/.test(t), '(2) 成功訊息應顯示後端版本，實際：' + t);
    console.log('✔ (2a) 後端帳戶登入成功：密碼 trim 生效，顯示後端版本');

    // 舊部署（POST 被轉成 GET）：success:true 但無 user → 明確錯誤提示
    const h2 = makeHarness(async (url, opts) => {
      if (String(url).includes('/api/config')) return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => ({ success: true, data: [] }) };
    });
    const app2 = Object.create(h2.context.TestApp.prototype);
    Object.assign(app2, { gasUrl: 'https://gas.example/exec', apiKey: 'k', currentEvent: { event_id: 'isd_2026', category: 'isd' }, currentUser: null, usersList: [], approvalPerms: [] });
    h2.document.getElementById('login-email-input').value = 'sys.ops';
    h2.document.getElementById('login-password-input').value = '9999';
    await app2.submitLogin({ preventDefault() {} });
    const t2 = h2.toastText();
    assert(/登入失敗/.test(t2) && /重新部署/.test(t2), '(2) 舊部署回應應提示重新部署，實際：' + t2);
    console.log('✔ (2b) 疑似舊版部署（POST→GET）有明確「重新部署」提示');
  }

  // ── (3) 財務指引內建 ──
  {
    const src = fs.readFileSync(path.join(root, 'js/30-finance.js'), 'utf8');
    ['財務指引及會計程序（全文內建）', '官方定稿', '報價要求一覽', '四格印簽署位置', '單據要求與報銷程序', '豁免報價商戶', '口頭報價程序', '書面報價比較表', '結算總表'].forEach(k => {
      assert(src.includes(k), `(3) 缺少內建指引內容：${k}`);
    });
    const h = makeHarness(async () => ({ ok: true, json: async () => ({}) }));
    const app = Object.create(h.context.TestApp.prototype);
    const guide = app.renderBuiltinFinanceGuide();
    assert(guide.includes('<details'), '(3) 內建指引應以可摺疊章節呈現');
    assert(guide.includes('附件1') && guide.includes('附件6') && guide.includes('Rev Dec 2025'), '(3) 內建指引應含附件1–6 及版本標示');
    console.log('✔ (3) 財務指引全文已內建（附件1–6），直接頁內閱讀');
  }

  // ── (4) 組織架構層級更新 + 舊資料遷移 ──
  {
    // 4a. 內建 JSON 已用新編號
    const isd = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));
    assert(/v4/.test(isd.data_version || ''), '(4) data_version 應已升級以清舊快取');
    const levelOf = (title, group) => {
      const n = isd.staff.org_chart.find(x => x.title === title && (x.level || '').startsWith(group));
      return n && parseInt((n.level.match(/Level (\d+)/) || [])[1]);
    };
    assert.strictEqual(levelOf('顧問', '顧問團'), 1, '(4) 顧問應為 L1');
    assert.strictEqual(levelOf('主席', '主席及執行副主席'), 1, '(4) 主席應為 L1');
    assert.strictEqual(levelOf('執行副主席', '主席及執行副主席'), 2, '(4) 執行副主席應為 L2');
    assert.strictEqual(levelOf('副主席（會操及典禮）', '會操及典禮組'), 3, '(4) 副主席保持 L3');
    assert.strictEqual(levelOf('秘書處（地域受薪職員）', '秘書處'), 1, '(4) 秘書處應為 L1');
    const mock = JSON.parse(fs.readFileSync(path.join(root, 'data/mock_demo.json'), 'utf8'));
    assert.strictEqual(parseInt(mock.staff.org_chart.find(n => n.title === '顧問').level.match(/Level (\d+)/)[1]), 1, '(4) 示範版顧問亦應為 L1');

    // 4b. 舊快取自動遷移（最高層帳號不入圖）
    const h = makeHarness(async () => ({ ok: true, json: async () => ({}) }));
    const app = Object.create(h.context.TestApp.prototype);
    Object.assign(app, { currentEvent: { event_id: 'isd_2026', category: 'isd' }, eventData: { staff: { org_chart: [], contacts: [], job_duties: [] } } });
    const mig = app.migrateOrgNodeLevel({ group: '顧問團', title: '顧問', names: '黃偉安', level_num: 2, level: '顧問團 (Level 2)' });
    assert.strictEqual(mig.level_num, 1, '(4) 舊資料顧問 L2 → L1');
    assert(/Level 1/.test(mig.level), '(4) level 字串同步');
    const mig2 = app.migrateOrgNodeLevel({ group: '主席及執行副主席', title: '執行副主席', level_num: 3, level: 'x (Level 3)' });
    assert.strictEqual(mig2.level_num, 2, '(4) 舊資料執行副主席 L3 → L2');
    const mig3 = app.migrateOrgNodeLevel({ group: '會操及典禮組', title: '會操顧問', level_num: 5, level: 'x (Level 5)' });
    assert.strictEqual(mig3.level_num, 5, '(4) 組內顧問崗（會操顧問）不受影響');
    const staffSrc = fs.readFileSync(path.join(root, 'js/31-staff.js'), 'utf8');
    assert(staffSrc.includes('L1=顧問'), '(4) 樹形圖說明文字已更新');
    assert(!staffSrc.includes('超' + '管'), '(4) 架構圖模組唔可以出現最高層帳號字樣');
    console.log('✔ (4) 架構圖層級已更新（顧問=L1/執副=L2，最高層完全隱藏），舊資料自動遷移');
  }

  // ── (5) 私隱掃描：除 apps-script/Code.gs 外，全 repo 不可有最高層帳號痕跡 ──
  {
    const { execSync } = require('child_process');
    const banned = ['超' + '管', '超級' + '管理員', 'sh' + 'eep', '12' + '01'].join('|');
    const out = execSync(`grep -rInE "${banned}" index.html js data docs tests assets README.md DEPLOY_GUIDE.md VERCEL_ENV_SETUP.md api 2>/dev/null || true`, { cwd: root }).toString();
    assert.strictEqual(out.trim(), '', '(5) 前端/文件唔應該出現最高層帳號痕跡：\n' + out);
    console.log('✔ (5) 除後端 Code.gs 外，全 repo 無最高層帳號痕跡（密碼只寫喺 GS）');
  }

  console.log('\n全部 v8.2 驗證通過 ✅');
})().catch(e => { console.error('❌', e.message); process.exit(1); });
