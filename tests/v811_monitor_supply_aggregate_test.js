#!/usr/bin/env node
'use strict';
/* v8.11 回歸測試（我的監察：物資／攤位計劃書 匯整一覽）：
   需求：同一個人／同一個組今日借 AB、後日加 CD，希望喺「我的監察」一睇就知累積借咗咩
         （「XX組借了ABCD」／「XX攤位借了CDEF」一眼可見），而唔係逐項散開。
   驗證：approvedSupplyChips ／ approvedBoothChips 會把「已批核」的多項合成一行，
         未批核（pending）唔會計入匯整。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

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
const context = {
  console,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => el('_new'), body: { appendChild() {} } },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; } }, Blob: function Blob() {}, FileReader: function FileReader() {},
  setTimeout() {}, clearTimeout() {},
  fetch: async () => ({ ok: false, json: async () => ({}), text: async () => '' }),
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
    eventData: { supplies: { requests: [], booth_requests: [], vehicle_passes: [] } },
    navHistory: [], currentModule: null, gasUrl: '', apiKey: 'k',
    systemConfig: { bannerText: '', nextMeeting: '', meetingLocation: '', allowPublic: true, defaultPwd: '1234' },
    eventsList: [], usersList: [], approvalPerms: []
  });
  localStorage.setItem('event_supplies_v7_isd_2026', JSON.stringify({
    requests: [
      { request_id:'r1', item_name:'帳篷', qty_requested:2, qty_approved:2, unit:'頂', group_name:'主題節目組', status:'approved', requested_by:'陳子明', requested_by_id:'陳子明' },
      { request_id:'r2', item_name:'摺枱', qty_requested:5, qty_approved:5, unit:'張', group_name:'主題節目組', status:'approved', requested_by:'陳子明', requested_by_id:'陳子明' },
      { request_id:'r3', item_name:'摺椅', qty_requested:10, qty_approved:null, unit:'張', group_name:'主題節目組', status:'pending', requested_by:'陳子明', requested_by_id:'陳子明' }
    ],
    booth_requests: [
      { request_id:'b1', group_name:'主題節目組', zone:'B', booth_no:'01', booth_code:'B01', booth_name:'氣槍體驗站', qty_tent:1, qty_table:3, qty_chair:8, status:'approved', requested_by:'陳子明', requested_by_id:'陳子明' }
    ],
    vehicle_passes: []
  }));
`, context);

/* ① approvedSupplyChips：已批核（approved/modified）合併，pending 唔計入 */
const supHTML = vm.runInContext(`
  __app.approvedSupplyChips(r=>r.group_name==='主題節目組','測試')
`, context);
ok(supHTML.includes('帳篷×2頂'), '① 已批核 帳篷×2 合併入一覽');
ok(supHTML.includes('摺枱×5張'), '① 已批核 摺枱×5 合併入一覽');
ok(!supHTML.includes('摺椅'), '① 待批核（摺椅 pending）唔會計入已批核一覽');
ok(!supHTML.includes('×10'), '① 摺椅×10（pending）唔會出現');

/* ② 同款物品疊加：兩次申請都批核 → 數量相加 */
vm.runInContext(`
  localStorage.setItem('event_supplies_v7_isd_2026', JSON.stringify({
    requests: [
      { request_id:'r1', item_name:'帳篷', qty_requested:2, qty_approved:2, unit:'頂', group_name:'主題節目組', status:'approved', requested_by:'陳子明', requested_by_id:'陳子明' },
      { request_id:'r2', item_name:'帳篷', qty_requested:3, qty_approved:3, unit:'頂', group_name:'主題節目組', status:'approved', requested_by:'陳子明', requested_by_id:'陳子明' }
    ], booth_requests: [], vehicle_passes: []
  }));
  __app.eventData.supplies=null;
`, context);
const supHTML2 = vm.runInContext(`
  __app.approvedSupplyChips(r=>r.group_name==='主題節目組','測試')
`, context);
ok(supHTML2.includes('帳篷×5頂'), '② 同一物資兩次申請（2＋3）合併為 帳篷×5頂');

/* ③ approvedBoothChips：已批核攤位計劃書匯整（含帳篷/枱/椅） */
const boothHTML = vm.runInContext(`
  localStorage.setItem('event_supplies_v7_isd_2026', JSON.stringify({
    requests: [], booth_requests: [
      { request_id:'b1', group_name:'主題節目組', zone:'B', booth_no:'01', booth_code:'B01', booth_name:'氣槍體驗站', qty_tent:1, qty_table:3, qty_chair:8, status:'approved', requested_by:'陳子明', requested_by_id:'陳子明' }
    ], vehicle_passes: []
  }));
  __app.eventData.supplies=null;
  __app.approvedBoothChips(r=>r.group_name==='主題節目組','測試')
`, context);
ok(boothHTML.includes('B01'), '③ 攤位匯整列出攤位代碼');
ok(boothHTML.includes('帳篷×1') && boothHTML.includes('摺枱×3') && boothHTML.includes('摺椅×8'), '③ 攤位匯整列出帳篷/摺枱/摺椅數量');

/* ④ 有權限人士「我的監察」頁：組別區塊內顯示「已批核借用一覽」 */
vm.runInContext(`
  localStorage.setItem('event_supplies_v7_isd_2026', JSON.stringify({
    requests: [
      { request_id:'r1', item_name:'帳篷', qty_requested:2, qty_approved:2, unit:'頂', group_name:'主題節目組', status:'approved', requested_by:'陳子明', requested_by_id:'陳子明' }
    ], booth_requests: [], vehicle_passes: []
  }));
  __app.eventData.supplies=null;
  __app.currentUser={ role:'executive_vice_chairperson', name:'袁可秀', user_id:'袁可秀', group_name:'主席及執行副主席' };
  __app.monitorFilter='all';
  __app.openModule('my_monitor');
`, context);
const monHTML = elements['module-content'].innerHTML;
ok(monHTML.includes('已批核借用一覽') && monHTML.includes('帳篷×2頂'), '④ 有權限監察：組別區塊顯示「已批核借用一覽」並合併物資');

console.log(`OK ${n} assertions — v8.11 我的監察 物資／攤位 匯整一覽`);
