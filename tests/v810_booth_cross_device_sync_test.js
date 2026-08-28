#!/usr/bin/env node
'use strict';
/* v8.10 回歸測試（攤位計劃書 跨裝置同步補漏）：
   問題：前端 saveSuppliesData 一直有把「攤位計劃書」寫出後端 Booth_Requests，但
   ① 後端 getEventAllData 冇回傳 Booth_Requests（Code.gs modules 漏列）
   ② 前端 syncApplicationsFromGas 冇合併 Booth_Requests
   → 其他裝置／重開後睇唔到攤位計劃書（攤位卡／總表／借用統計只係本機）。
   本測試驗證：syncApplicationsFromGas 收到後端 Booth_Requests 後會合併入本機 supplies.booth_requests，
   並喺攤位模組／執行手冊總表反映。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const isd = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));
const code = fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8');

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

/* ① 後端 getEventAllData 必須包含 Booth_Requests（Code.gs） */
ok(/const modules = \[[^\]]*\bBooth_Requests\b/.test(code), '① Code.gs getEventAllData 已列出 Booth_Requests');

/* ---------- vm harness ---------- */
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map(m => {
    const attrs = m[1] || '';
    if (/src=/i.test(attrs)) {
      const src = ((attrs.match(/src="([^"]+)"/) || [])[1] || '').split('?')[0];
      return src.startsWith('js/') ? fs.readFileSync(path.join(root, src), 'utf8') : '';
    }
    return m[2];
  })
  .join('\n');
const bundle = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);[\\\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';
const store = new Map();
const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = { id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '',
      addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, appendChild() {},
      setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {},
      classList: { add: c => e._cls.add(c), remove: c => e._cls.delete(c), toggle: () => {}, contains: c => e._cls.has(c) } };
    elements[id] = e;
  }
  return elements[id];
}
const backendBooth = [
  { request_id:'req_b1', event_id:'isd_2026', item_name:'攤位計劃書', qty_requested:1, qty_approved:null, unit:'份', group_name:'主題節目組',
    zone:'B', booth_no:'01', booth_code:'B01', unit_name:'港島童軍氣槍射擊會', booth_name:'氣槍體驗站',
    activity_desc:'氣槍射擊體驗', fif15_content:'未通配合', qty_tent:1, qty_table:3, qty_chair:8, skirting_qty:2, power_w:500,
    other_req:'需圍布', other_need:'需圍布', delivery:'', owner_name:'陳子明', owner_age_group:'25-39歲', owner_unit:'港島童軍氣槍射擊會',
    owner_position:'隊長', owner_phone:'95211111', owner_email:'staff@isd.local', extra_items_json:'[{"item_name":"射燈","qty_requested":2,"unit":"支"}]',
    contact:'95211111', status:'pending', requested_by:'陳子明', requested_by_id:'陳子明', requester_role:'staff',
    group_confirmation_status:'pending', group_confirmed_by:'', group_confirmed_at:'', approved_by:'', approved_at:'',
    notes:'', created_at:'2026-08-28T04:00:00Z' }
];
let fetchCalls = 0;
const context = {
  console,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => el('_new'), body: { appendChild() {} } },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; } }, Blob: function Blob() {}, FileReader: function FileReader() {},
  setTimeout() {}, clearTimeout() {},
  fetch: async (url) => {
    fetchCalls++;
    if (String(url).includes('action=getEventData')) {
      return { ok: true, json: async () => ({ success: true, data: { Booth_Requests: backendBooth } }) };
    }
    return { ok: false, json: async () => ({}), text: async () => '' };
  },
  confirm: () => true, alert() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(bundle, context);
vm.runInContext(`
  globalThis.__app = Object.create(TestApp.prototype);
  Object.assign(globalThis.__app, {
    currentEvent: { event_id: 'isd_2026', event_name: '港島童軍繽紛日' },
    currentUser: { role: 'general_director', name: '仇紹謙', user_id: '仇紹謙', group_name: '主題節目組' },
    eventData: ${JSON.stringify(isd)},
    navHistory: [], currentModule: null, gasUrl: 'https://script.google.com/macros/s/x/exec', apiKey: 'k',
    systemConfig: { bannerText: '', nextMeeting: '', meetingLocation: '', allowPublic: true, defaultPwd: '1234' },
    eventsList: [], usersList: [], approvalPerms: []
  });
`, context);

/* ② 攤位卡：同步前 0 筆計劃書 */
vm.runInContext(`__app.openModule('booth');`, context);
let html0 = elements['module-content'].innerHTML;
ok(html0.includes('暫無計劃書'), '② 同步前 0 筆計劃書（顯示暫無）');

/* ③ syncApplicationsFromGas：把後端 Booth_Requests 合併入本機 */
const done = vm.runInContext(`(async()=>{ await __app.syncApplicationsFromGas(); return __app.getSuppliesData(); })()`, context);
done.then((sup) => {
  const plans = sup.booth_requests || [];
  ok(plans.length === 1, `③ 同步後合併 1 筆攤位計劃書（實際 ${plans.length}）`);
  const b = plans[0];
  ok(b.booth_code === 'B01' && b.booth_name === '氣槍體驗站', '③ 計劃書帶總表欄位');
  ok(b.qty_tent === 1 && b.qty_table === 3 && b.qty_chair === 8 && b.power_w === 500, '③ 計劃書帶帳篷／摺枱／摺椅／電源數量');
  ok(Array.isArray(b.extra_items) && b.extra_items.length === 1 && b.extra_items[0].item_name === '射燈', '③ extra_items_json 正確解析');
  ok(b.owner_name === '陳子明' && b.owner_phone === '95211111', '③ 負責人資料齊全');
  ok(b.group_name === '主題節目組' && b.status === 'pending', '③ 組別／狀態保留');

  /* ④ 重新渲染攤位模組：總表反映後端來的計劃書 */
  vm.runInContext(`__app.boothSubTab='borrow'; __app.openModule('booth');`, context);
  const html1 = elements['module-content'].innerHTML;
  ok(html1.includes('氣槍體驗站'), '④ 攤位借用統計反映後端計劃書');

  /* ⑤ 執行手冊 → 攤位總表 反映 */
  vm.runInContext(`__app.openModule('exec_manual'); __app.switchExecManualTab('booth_master');`, context);
  const master = elements['exec-manual-panel'].innerHTML;
  ok(master.includes('氣槍體驗站') && master.includes('待批核'), '⑤ 攤位總表填入計劃書');

  console.log(`OK ${n} assertions — v8.10 攤位計劃書 跨裝置同步`);
}).catch((e) => { console.error('ASYNC ERROR: ', e); process.exit(1); });
