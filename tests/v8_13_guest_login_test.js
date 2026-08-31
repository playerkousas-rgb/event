#!/usr/bin/env node
'use strict';
/* v8.13 回歸測試（2026-08-31）
   ① 未登入（訪客）唔應該見到「公告及溝通」右上角嘅「新增」掣（舊版係無條件兜底顯示）
   ② 未登入時主頁中間要放出 4 張公開卡（= 底部導覽列嗰 4 個按鈕），唔好留一大片吉位
   ③ 未選活動（「選擇活動」首頁）時唔顯示頂 BAR 嘅「登入」掣
   ④ v8.13 後端：gasPost() 要讀到真正嘅 HTTP 狀態（400）＋ gasUrl 有內建預設值
   ⑤ 後端 POST 失敗（HTTP 400）時，本機有同一個帳號 → 離線登入（標記 offline） */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"/g)]
  .map(m => m[1].split('?')[0])
  .map(f => fs.readFileSync(path.join(root, f), 'utf8'))
  .join('\n');
const bundle = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

const store = new Map();
const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = { id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '',
      addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, appendChild() {},
      setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {},
      classList: { add: c => e._cls.add(c), remove: c => e._cls.delete(c), toggle: (c, on) => { if (on === undefined) { e._cls.has(c) ? e._cls.delete(c) : e._cls.add(c); } else if (on) e._cls.add(c); else e._cls.delete(c); }, contains: c => e._cls.has(c) } };
    elements[id] = e;
  }
  return elements[id];
}
const context = {
  console,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => el('_new'), body: { appendChild() {} } },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; } }, Blob: function Blob() {}, FileReader: function FileReader() {},
  setTimeout: (fn) => { try { fn && fn(); } catch (e) {} }, clearTimeout() {},
  fetch: async (...a) => context.__fetch(...a),
  __fetch: async () => ({ ok: false, status: 404, statusText: 'Not Found', json: async () => ({}), text: async () => '' }),
  confirm: () => true, alert() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(bundle, context);

const EVENT = { event_id: 'isd_2026', event_name: '2026 港島童軍繽紛日', category: 'isd' };
const USERS = [
  { user_id: '陳小明', name: '陳小明', role: 'staff', group_name: '主題節目組', password: '1234', status: 'active' },
  { user_id: '曾令勤', name: '曾令勤', role: 'director', group_name: '主題節目組', password: '1234', status: 'active' }
];
function setUser(u) { vm.runInContext(`__app.currentUser = ${u ? JSON.stringify(u) : 'null'};`, context); }
// ⚠️ vm 入面 top-level `const` 唔會掛上 globalThis，要喺 host 側取出再傳入去
const DEFAULT_GAS_URL = vm.runInContext('DEFAULT_GAS_URL', context);
const DEFAULT_API_KEY = vm.runInContext('DEFAULT_API_KEY', context);
vm.runInContext(`
  globalThis.__app = Object.create(TestApp.prototype);
  Object.assign(globalThis.__app, {
    currentEvent: ${JSON.stringify(EVENT)},
    currentUser: null,
    eventData: { users: ${JSON.stringify(USERS)} },
    navHistory: [], currentModule: null,
    gasUrl: ${JSON.stringify(DEFAULT_GAS_URL)}, apiKey: ${JSON.stringify(DEFAULT_API_KEY)},
    eventsList: [], usersList: [], approvalPerms: [],
    systemConfig: { bannerText: '', nextMeeting: '', meetingLocation: '', allowPublic: true, defaultPwd: '1234' }
  });
`, context);

/* ---------- ④ 後端預設值 / gasPost ---------- */
ok(/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(vm.runInContext('DEFAULT_GAS_URL', context)), '④ 前端內建 DEFAULT_GAS_URL（/api/config 死咗都唔會失聯）');
ok(vm.runInContext('DEFAULT_API_KEY', context).length > 10, '④ 前端內建 DEFAULT_API_KEY');
ok(/localStorage\.getItem\(LS\.gasUrl\)\|\|DEFAULT_GAS_URL/.test(fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8')), '④ 10-app-core 用 DEFAULT_GAS_URL 做底');

/* ---------- ① 未登入唔見「新增」掣 ---------- */
setUser(null);
vm.runInContext(`__app.openModule('announcements')`, context);
ok(el('module-actions').innerHTML === '', '① 未登入：公告及溝通右上角唔應該有「新增」掣');

setUser({ user_id: '曾令勤', name: '曾令勤', role: 'director', group_name: '主題節目組' }); // 主任（30）
vm.runInContext(`__app.openModule('announcements')`, context);
ok(el('module-actions').innerHTML.includes('openAddRecordModal'), '① 主任（含以上）：公告及溝通有「新增」掣');

setUser({ user_id: '陳小明', name: '陳小明', role: 'staff', group_name: '主題節目組' }); // 工作人員（20）
vm.runInContext(`__app.openModule('announcements')`, context);
ok(el('module-actions').innerHTML === '', '① 一般工作人員（20）：公告及溝通無「新增」掣');

setUser(null);
vm.runInContext(`__app.openModule('unit_guide')`, context);
ok(el('module-actions').innerHTML === '', '① 未登入：旅團須知（副主席以上）都唔應該有「新增」掣');

/* ---------- ② 未登入都要見到 4 張公開卡 ---------- */
el('public-cards-grid').innerHTML = '';
setUser(null);
vm.runInContext(`__app.renderRoleCards()`, context);
const guestHTML = el('public-cards-grid').innerHTML;
ok(guestHTML.includes('公告及溝通') && guestHTML.includes('執行手冊') && guestHTML.includes('申請中心') && guestHTML.includes('童心捐贈大行動'), '② 未登入：中間放出 4 張公開卡（公告及溝通・執行手冊・申請中心・童心捐贈）');
ok(!el('public-section')._cls.has('hidden'), '② 未登入：「公開資料」區塊要顯示（唔好收起）');
ok(el('identity-section')._cls.has('hidden') && el('management-tools-section')._cls.has('hidden'), '② 未登入：工作卡片／管理工具仍然收起');
ok(el('public-cards-grid').innerHTML.includes('公開可看'), '② 未登入：公開卡一律標「公開可看」');
ok(el('identity-cards-grid').innerHTML === '', '② 未登入：工作卡片格要清空');

/* ---------- ③ 未選活動唔顯示登入掣 ---------- */
setUser(null);
vm.runInContext(`__app.currentEvent = null; __app.updateAdminNav();`, context);
ok(el('login-toggle-btn').style.display === 'none', '③ 未選活動（首頁）：頂 BAR「登入」掣要收起');
vm.runInContext(`__app.currentEvent = ${JSON.stringify(EVENT)}; __app.updateAdminNav();`, context);
ok(el('login-toggle-btn').style.display === '', '③ 已選活動 + 未登入：頂 BAR「登入」掣要顯示');
setUser({ user_id: '曾令勤', name: '曾令勤', role: 'director', group_name: '主題節目組' });
vm.runInContext(`__app.updateAdminNav();`, context);
ok(el('login-toggle-btn').style.display === 'none', '③ 已登入：照舊只顯示登出（登入掣收起）');
setUser(null);

/* ---------- ④ gasPost：讀到真正嘅 HTTP 狀態 ---------- */
(async () => {
  // 模擬 Google 回 HTTP 400（HTML，唔係 JSON）
  context.__fetch = async () => ({ ok: false, status: 400, statusText: 'Bad Request', text: async () => '<html><body>Bad Request</body></html>' });
  const r = await vm.runInContext(`__app.gasPost({action:'login',user_id:'x',password:'y'})`, context);
  ok(r.ok === false && r.status === 400, '④ gasPost：HTTP 400 要讀到 status=400（以前只會當「回應唔係 JSON」）');
  ok(/400/.test(r.error), '④ gasPost：錯誤訊息要帶住狀態碼');
  ok(vm.runInContext(`__app.loginFailureHint(400)`, context).includes('部署'), '④ loginFailureHint(400) 要指去「重新部署 Apps Script」');
  ok(vm.runInContext(`__app.loginFailureHint(404)`, context).includes('網址'), '④ loginFailureHint(404) 要指去「GAS 網址失效」');

  // 模擬正常後端（JSON）
  context.__fetch = async () => ({ ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify({ success: false, error: '找不到用戶帳號或電郵', version: 'v8.4-2026-08-31' }) });
  const r2 = await vm.runInContext(`__app.gasPost({action:'login',user_id:'__probe__',password:'x'})`, context);
  ok(r2.ok === true && r2.json && r2.json.error === '找不到用戶帳號或電郵', '④ gasPost：正常後端 JSON 要解析到（doPost 有執行）');

  /* ---------- ⑤ 後端死咗（HTTP 400）＋ 本機有同一個帳號 → 離線登入 ---------- */
  context.__fetch = async () => ({ ok: false, status: 400, statusText: 'Bad Request', text: async () => 'Bad Request' });
  el('login-email-input').value = '陳小明';
  el('login-password-input').value = '1234';
  await vm.runInContext(`__app.submitLogin({preventDefault(){}})`, context);
  const cu = vm.runInContext('JSON.stringify(__app.currentUser||null)', context);
  const cuObj = JSON.parse(cu);
  ok(cuObj && cuObj.name === '陳小明' && cuObj.offline === true, '⑤ 後端 HTTP 400 時：本機有同一帳號 → 離線登入（標記 offline）');
  ok(el('nav-role').textContent.includes('離線'), '⑤ 離線身份：頂 BAR 角色名要標「離線」');

  // 密碼錯／本機冇呢個帳號：應該失敗，且 currentUser 保持 null
  vm.runInContext(`__app.currentUser = null;`, context);
  el('login-email-input').value = '不存在的帳號';
  el('login-password-input').value = 'wrong';
  await vm.runInContext(`__app.submitLogin({preventDefault(){}})`, context);
  ok(vm.runInContext('__app.currentUser===null', context), '⑤ 後端 400 ＋ 本機冇呢個帳號／密碼錯：唔應該登入到');

  console.log(`V8_13_GUEST_LOGIN_OK (${n} checks)`);
})().catch(e => { console.error(e.message); process.exit(1); });
