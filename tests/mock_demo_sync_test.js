#!/usr/bin/env node
'use strict';
/* 模擬示範版（data/mock_demo.json）與主系統 v8.6 架構一致性回歸測試：
   ① 組織架構＝10 組、顧問團 2 人、層級 L1–L5；所有人名有聯絡資料（電話預載用）
   ② 物資申請：無庫存表；requests 帶共用欄位；booth_requests 帶攤位總表欄位（獨立卡資料齊全）
   ③ 膳食：新結構 {menus,orders}；菜單唔再有「組別」欄；訂單覆蓋四種狀態
   ④ 財務：group_itemized_budgets 逐項結構（group_name 乾淨、items 有數字）
   ⑤ 示範登入帳戶（js/33-users.js demo seed）與 mock 名單／電話一致
   ⑥ vm 真渲染：部門卡統計、攤位獨立卡、物資卡冇攤位頁籤、菜單卡冇組別標籤 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const mock = JSON.parse(fs.readFileSync(path.join(root, 'data/mock_demo.json'), 'utf8'));
const usersSrc = fs.readFileSync(path.join(root, 'js/33-users.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

const GROUPS = ['顧問團','主席及執行副主席','秘書處','會操及典禮組','主題節目組','品牌推廣組','嘉賓接待組','協調組','服務及發展組','行政組'];
const org = mock.staff.org_chart;

/* ① 組織架構 */
ok(mock.event_id === 'mock_demo', 'event_id');
const orgGroups = [...new Set(org.map(x => x.group))];
GROUPS.forEach(g => ok(orgGroups.includes(g), `① mock 組織架構應包含組別 ${g}`));
ok(org.every(x => x.group && x.title && x.names && x.desc && /Level\s*[1-5]/.test(x.level)), '① 每個崗位齊 group/title/names/desc + L1–L5 level');
const advisors = org.filter(x => x.group === '顧問團');
ok(advisors.length === 2 && advisors.map(a=>a.names).sort().join('、') === '何家騏、黃偉安', '① 顧問團 2 人兩行（黃偉安／何家騏）');
const orgNames = new Set();
org.forEach(x => String(x.names).split(/[、,，]/).map(s => s.trim()).filter(Boolean).forEach(nm => orgNames.add(nm)));
const contacts = mock.staff.contacts;
[...orgNames].forEach(nm => { const c = contacts.find(x => x.name === nm); ok(c && /^\d{8}$/.test(c.contact), `① 架構圖人名「${nm}」應有 8 位聯絡電話（物資表電話預載依赖）`); });

/* ② 物資／攤位／車輛 */
ok(!('inventory' in mock.supplies), '② mock 不設庫存表（v8.5 起已移除）');
ok(mock.supplies.requests.length >= 3, '② 有地域物資申請示範');
mock.supplies.requests.forEach(r => ok(r.item_name && r.qty_requested > 0 && r.unit && r.group_name && r.requested_by && /^\d{8}$/.test(r.contact), `② 每項申請只載「名稱+數量+單位」，組別/電話/原因屬整張申請（${r.item_name}）`));
mock.supplies.booth_requests.forEach(r => ok(r.zone && r.booth_no && r.unit_name && r.booth_name && r.qty_requested > 0, `② 攤位申請帶總表欄位 分區/編號/負責單位/招牌名（${r.request_id}）`));
ok(mock.supplies.booth_requests.some(r => r.status === 'approved') && mock.supplies.booth_requests.some(r => r.status === 'pending'), '② 攤位申請有已批／待批示範狀態');
mock.supplies.vehicle_passes.forEach(v => ok(v.plate && v.driver_name && v.entry_date, '② 車輛通行證示範齊 車牌/司機/日期'));
const boothGroupOk = mock.supplies.booth_requests.every(r => GROUPS.includes(r.group_name));
ok(boothGroupOk, '② 攤位申請組別屬 10 組正式名稱');

/* ③ 膳食 */
ok(!Array.isArray(mock.meals) && Array.isArray(mock.meals.menus) && Array.isArray(mock.meals.orders), '③ 膳食用新結構 {menus,orders}');
mock.meals.menus.forEach(m => { ok(Array.isArray(m.options) && m.options.length >= 2 && m.deadline, `③ 菜單帶 options/deadline（${m.menu_id}）`); ok(!m.group_name, `③ 菜單唔再設「組別」欄（v8.6 已刪無效欄位：${m.menu_id}）`); });
const mealStatuses = new Set(mock.meals.orders.map(o => o.status));
['pending','group_ok','approved','rejected'].forEach(s => ok(mealStatuses.has(s), `③ 應有 ${s} 狀態嘅訂餐示範（兩級把關全流程可演示）`));
mock.meals.orders.forEach(o => ok(mock.meals.menus.some(m => m.menu_id === o.menu_id), `③ 訂餐 ${o.order_id} 必須對應有效菜單`));

/* ④ 財務 */
mock.finance.group_itemized_budgets.forEach(b => {
  ok(GROUPS.includes(b.group_name) || b.group_name === '收入', `④ 預算組別名應為乾淨正式名（${b.group_name}）`);
  ok(Array.isArray(b.items) && b.items.length > 0 && b.items.every(i => i.item_name && typeof i.budget === 'number'), `④ ${b.group_name} 應有逐項預算`);
});
ok(mock.finance.expenses.length > 0 && mock.finance.expenses.every(e => e.item_name && GROUPS.includes(e.group_name)), '④ 開支申報示範齊（組別為正式名）');

/* ⑤ 示範登入帳戶與 mock 一致 */
GROUPS.length; // noop
const seedBlock = usersSrc.slice(usersSrc.indexOf('if(this.isDemoEvent()){'), usersSrc.indexOf('} else {'));
const seedAccounts = [...seedBlock.matchAll(/user_id:'([^']+)'[^]*?contact:'(\d{8})'/g)].map(m => ({ name: m[1], contact: m[2] }));
ok(seedAccounts.length >= 8, `⑤ 示範登入應至少 8 個帳戶（涵蓋職員→批核組→L1）（實際 ${seedAccounts.length}）`);
seedAccounts.forEach(a => {
  const c = contacts.find(x => x.name === a.name);
  ok(c && c.contact === a.contact, `⑤ 示範帳戶 ${a.name} 嘅電話應與 mock 聯絡表一致（申請表電話預載先至正確）`);
});
ok(!seedBlock.includes('朱家聰'), '⑤ 示範主席應改用 mock 名單「區子君」（唔好再掛正式活動人名）');

/* ⑥ vm 真渲染 */
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
const bundle = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';
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
    currentEvent: { event_id: 'mock_demo', event_name: '模擬示範版（完整示範資料）' },
    currentUser: { role: 'chairperson', name: '區子君', user_id: '區子君', group_name: '主席及執行副主席', contact: '92000001' },
    eventData: ${JSON.stringify(mock)},
    navHistory: [], currentModule: null, gasUrl: '', apiKey: 'k',
    systemConfig: { bannerText: '', nextMeeting: '', meetingLocation: '', allowPublic: true, defaultPwd: '1234' },
    eventsList: [], usersList: [], approvalPerms: []
  });
`, context);
const cnt = JSON.parse(vm.runInContext(`JSON.stringify((()=>{const c={};__app.getEventGroups().forEach(g=>{const nodes=__app.getGroupOrgNodes(g);const s=new Set();nodes.forEach(n=>{(n.names||'').split(/[\\/、,，]/).map(x=>x.trim()).filter(Boolean).forEach(y=>s.add(y))});c[g]=nodes.length+'/'+s.size});return c})())`, context));
ok(cnt['顧問團'] === '2/2', `⑥ 部門卡：顧問團應 2 崗位 · 2 人（實際 ${cnt['顧問團']}）`);
ok(cnt['主題節目組'] === '7/7', `⑥ 部門卡：主題節目組應 7 崗位 · 7 人（實際 ${cnt['主題節目組']}）`);
ok(cnt['協調組'] === '9/9', `⑥ 部門卡：協調組應 9 崗位 · 9 人（實際 ${cnt['協調組']}）`);
const st = vm.runInContext(`JSON.stringify(__app.groupApplyStats('主題節目組'))`, context);
const stJ = JSON.parse(st);
ok(stJ.requests.length === 4 && stJ.boothReqs.length === 3, `⑥ 主題節目組統計：物資 4＋攤位 3（實際 物資 ${stJ.requests.length}／攤位 ${stJ.boothReqs.length}）`);
vm.runInContext(`__app.openModule('booth')`, context);
const boothHTML = elements['module-content'].innerHTML;
ok(boothHTML.includes('帳篷圍布') && !boothHTML.includes('Megaphone'), '⑥ 攤位模組只列攤位申請（唔混地域物資）');
ok(boothHTML.includes('積極公民任務站'), '⑥ 攤位模組顯示招牌名（getSuppliesData 已保留總表欄位）');
vm.runInContext(`__app.openModule('supplies')`, context);
const supHTML = elements['module-content'].innerHTML;
ok(!supHTML.includes("switchSuppliesTab('booth')") && !supHTML.includes('返回申請中心'), '⑥ 物資卡冇攤位頁籤、冇重複返回');
const mealsHTML = (() => { vm.runInContext(`__app.openModule('meals')`, context); return (elements['module-content'].innerHTML || '') + (elements['meals-tab-menus'].innerHTML || ''); })();
ok(mealsHTML.includes('午餐') && !mealsHTML.includes('組別: 全部'), '⑥ 膳食卡冇「組別: 全部」標籤（菜單欄位已退役）');

console.log(`MOCK_DEMO_SYNC_OK (${n} checks)`);
