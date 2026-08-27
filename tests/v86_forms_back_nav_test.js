#!/usr/bin/env node
'use strict';
/* v8.6 回歸測試（2026-08-28 五項修正）：
   ① 主頁／部門卡片「崗位數 ×2」修復：舊 localStorage（level 舊編號／隨機 id）與 JSON 併入時，
      按「組別|職位|人名」去重，顧問團保持 2 人、其他組不翻倍；data_version 已上調清走舊快取
   ② 物資申請表簡化：每項物資只填「名稱＋數量（＋單位）」；組別／聯絡電話／申請原因屬整張申請只填一次；
      電話自動載入登記聯絡（借十樣嘢唔使填十次電話）
   ③ 攤位物資申請＝獨立模組卡片（不再掛在「物資申請」的頁籤／按鈕／統計內）
   ④ 膳食菜單刪除無效「組別」欄（該欄不影響篩選／統計，只是裝飾）
   ⑤ 返回按鈕統一：刪除各卡重覆的「← 返回申請中心」；統一用頂部「返回」回上一層級；
      backToDashboard 無歷史時亦安全（回選擇活動頁，唔會白屏出錯） */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const isd = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));

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

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

const coreSrc = fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8');
const staffSrc = fs.readFileSync(path.join(root, 'js/31-staff.js'), 'utf8');
const supSrc = fs.readFileSync(path.join(root, 'js/24-supplies.js'), 'utf8');
const syncSrc = fs.readFileSync(path.join(root, 'js/23-sync.js'), 'utf8');
const parkSrc = fs.readFileSync(path.join(root, 'js/27-parking.js'), 'utf8');
const crisisSrc = fs.readFileSync(path.join(root, 'js/36-crisis.js'), 'utf8');

/* ---------- ① 主頁岗位翻倍 ---------- */
ok(staffSrc.includes("id:n.id||('org_seed_'+i)"), '① JSON 種子崗位應有穩定 id（org_seed_i），本機編輯按 id 對回，不再整份追加');
ok(staffSrc.includes('uniqOrgNodes') && staffSrc.includes("org_chart:uniqOrgNodes"), '① getStaffData 應按「組別|職位|人名」去重後才輸出 org_chart');
const nodesStart = coreSrc.indexOf('getGroupOrgNodes(groupName){');
const nodesEnd = coreSrc.indexOf('splitDutySections');
const nodesFn = coreSrc.slice(nodesStart, nodesEnd);
ok(!nodesFn.includes("+(n.level||'')"), "① getGroupOrgNodes 去重 key 不應再計 level 字串（舊快取 level 不同會翻倍）");
ok(isd.data_version === '2026-08-28T00:00:00Z-v6', '① data_version 應上調至 v6（自動清除全站舊 staff/crisis 快取）');

/* ---------- ② 物資申請表單 ---------- */
ok(supSrc.includes('supply-shared-group') && supSrc.includes('supply-shared-contact') && supSrc.includes('supply-shared-reason'), '② 組別／電話／原因應為整張申請共用的單一欄位');
ok(supSrc.includes('myDefaultContact(){'), '② 應有 myDefaultContact 預載聯絡電話');
const formStart = supSrc.indexOf('openSupplyRequestForm(editId=null){');
const formBody = supSrc.slice(formStart, supSrc.indexOf('submitSupplyRequestForm(){'));
ok(!/class="supply-group/.test(formBody), '② 每項物資行不應再有 supply-group（所屬組別不逐項填）');
ok(!/class="supply-reason/.test(formBody) && !/class="supply-contact/.test(formBody), '② 每項物資行不應再有 supply-reason／supply-contact');
ok(formBody.includes('class="supply-item') && formBody.includes('class="supply-qty'), '② 每項物資仍需 名稱＋數量');
const addRowStart = supSrc.indexOf('addSupplyRow(){');
const addRow = supSrc.slice(addRowStart, supSrc.indexOf('renderBoothModule'));
ok(!addRow.includes('supply-group') && !addRow.includes('supply-contact') && !addRow.includes('supply-reason'), '② 「增加一項物資」行只應有 名稱／數量／單位');
ok(supSrc.includes('請填寫物資名稱及數量'), '② 逐項校驗應只要求 名稱＋數量');
ok(supSrc.includes('${canEditGroup?\'\':\'readonly\'}') || supSrc.includes('readonly'), '② 一般成員的所屬組別欄應為唯讀（自動填入本組）');

/* ---------- ③ 攤位物資獨立 ---------- */
ok(coreSrc.includes("if(mod==='booth'){ this.renderBoothModule(); return; }"), '③ openModule(booth) 應直入獨立攤位模組');
ok(supSrc.includes('renderBoothModule(){'), '③ 應有獨立 renderBoothModule');
ok(!supSrc.includes("switchSuppliesTab('booth')") && !supSrc.includes('supplies-tab-booth'), '③ 物資申請卡不應再掛「攤位物資」頁籤');
ok(!supSrc.includes("openBoothSupplyForm()\" class=\"bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold\"><i class=\"fa-solid fa-store mr-1\"></i>攤位物資申請</button>`:''}\n          ${(this.canApproveArea") , '③ 物資卡顶欄不應再有「攤位物資申請」按鈕');
ok(!supSrc.includes('攤位物資統計'), '③ 物資統計不應再混入攤位統計');
ok(crisisSrc.includes("this.currentModule==='booth'){ this.renderBoothModule(); return; }"), '③ refreshSuppliesViews 應支援攤位模組原地刷新');
ok(supSrc.includes('與「物資申請」（地域物資借用）是兩項完全獨立'), '③ 攤位模組應註明與物資申請完全獨立');

/* ---------- ④ 菜單「組別」欄 ---------- */
ok(!syncSrc.includes('meal-menu-group'), '④ 加入菜單表單不應再有「組別」欄（舊欄不影響篩選／統計）');
ok(!syncSrc.includes("| 組別: ${escapeHtml(menu.group_name"), '④ 菜單卡片不應再顯示「組別: 全部」');
ok(syncSrc.includes("const group_name=''"), '④ 提交菜單應固定清空 group_name（欄位退役）');

/* ---------- ⑤ 返回按鈕統一 ---------- */
const allJs = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\n');
ok(!allJs.includes('返回申請中心'), '⑤ 全站不應再有重覆的「← 返回申請中心」按鈕（返回統一用頂部「返回」＝回上一層）');
ok(html.includes('app.backToDashboard()') && html.includes('> 返回<'), '⑤ 模組頁頂部應保留通用「返回」按鈕');
ok(coreSrc.includes("if(!prev&&!this.currentEvent){ this.goHome(); return; }"), '⑤ backToDashboard 無歷史且無活動時應回選擇活動頁（唔會出錯）');
ok(coreSrc.includes("pushNavHistory({view:'module',module:key})"), '⑤ openModule 應入棧（返回＝上一層）');
ok(!parkSrc.includes("openModule('apply_hub')") && !syncSrc.includes("openModule('apply_hub')"), '⑤ 泊車／膳食模組不應再有跳去申請中心的「返回」');
ok(allJs.includes('← 返回') === false, '⑤ 各模組不應再有第二個「← 返回」樣式的按鈕');

/* ================= 行為測試（vm 載入真 prototype） ================= */
const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = { id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '',
      addEventListener() {}, querySelectorAll() { return []; }, appendChild() {},
      classList: { add: c => e._cls.add(c), remove: c => e._cls.delete(c), toggle: c => { if (e._cls.has(c)) e._cls.delete(c); else e._cls.add(c); }, contains: c => e._cls.has(c) } };
    elements[id] = e;
  }
  return elements[id];
}
const store = new Map();
// 舊快取場景：同 49 個崗位以「舊 level 編號＋隨機 id＋全部 _userEdited」存在 localStorage
const legacy = isd.staff.org_chart.map((n, i) => {
  const lvl = +((n.level || '').match(/Level\s*(\d)/) || [0, 3])[1];
  const g = (n.level || '').split(' (')[0];
  return { id: 'org_' + i + '_1690000000000', level: g + ' (Level ' + Math.max(1, lvl - 1) + ')', level_num: Math.max(1, lvl - 1), group: g, title: n.title, names: n.names, desc: n.desc || '', parent_id: null, _userEdited: true };
});
store.set('event_staff_v7_isd_2026', JSON.stringify({ staff_source: null, contact_source: null, duties_source: null, org_chart: legacy, contacts: [], job_duties: [] }));

const context = {
  console,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: { getElementById: el, querySelectorAll: () => [], addEventListener() {}, createElement: () => el('_new'), body: { appendChild() {} } },
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
    currentEvent: { event_id: 'isd_2026', event_name: '2026 港島童軍繽紛日' },
    currentUser: { role: 'super_admin', name: '系統管理員', user_id: 'sys', group_name: '' },
    eventData: ${JSON.stringify(isd)},
    navHistory: [], currentModule: null, gasUrl: '', apiKey: 'k'
  });
  globalThis.__app.isDemoEvent = () => false;
  globalThis.__app.getDocumentsData = () => ({ docs: [] });
  globalThis.__app.getActivitiesData = () => ({ booths: [] });
  globalThis.__app.getFinanceData = () => ({ group_itemized_budgets: [] });
  globalThis.__app.getMealsData = () => ({ menus: [], orders: [] });
`, context);

/* ① 行為：舊髒快取下，主頁岗位數不應翻倍 */
const counts = JSON.parse(vm.runInContext(`JSON.stringify((()=>{const c={};__app.getEventGroups().forEach(g=>{c[g]=__app.getGroupOrgNodes(g).length});c.__raw=__app.getStaffData().org_chart.length;return c})())`, context));
const EXPECT = { '顧問團': 2, '主席及執行副主席': 2, '秘書處': 1, '會操及典禮組': 8, '主題節目組': 7, '品牌推廣組': 3, '嘉賓接待組': 5, '協調組': 10, '服務及發展組': 4, '行政組': 7 };
Object.entries(EXPECT).forEach(([g, v]) => ok(counts[g] === v, `① 舊快取下 ${g} 崗位數應為 ${v}（實際 ${counts[g]}，不應 ×2）`));
ok(counts.__raw === 49, '① 去重後 org_chart 應恰好 49 個崗位（實際 ' + counts.__raw + '）');
const advMembers = vm.runInContext(`(()=>{const s=new Set();__app.getGroupOrgNodes('顧問團').forEach(n=>{(n.names||'').split(/[\\/、,，]/).map(x=>x.trim()).filter(Boolean).forEach(y=>s.add(y))});return s.size})()`, context);
ok(advMembers === 2, '① 顧問團人數應為 2（黃偉安／何家騏）');

/* ③ 行為：混資料下兩卡互不混雜 */
vm.runInContext(`
  globalThis.__app.getSuppliesData = () => ({
    inventory: [],
    requests: [{ request_id: 'r1', item_name: '對講機（地域借用）', qty_requested: 5, unit: '部', group_name: '主題節目組', status: 'pending', requested_by: '周恒晉', created_at: '2026-08-20T00:00:00Z' }],
    booth_requests: [{ request_id: 'b1', item_name: '帳篷', qty_requested: 2, unit: '個', group_name: '主題節目組', status: 'pending', requested_by: '周恒晉', created_at: '2026-08-21T00:00:00Z', zone: 'A', booth_no: '01', unit_name: '測試單位', booth_name: '測試攤位' }],
    vehicle_passes: []
  });
  globalThis.__app.canApproveArea = () => false;
  globalThis.__app.canExecuteArea = () => false;
  globalThis.__app.canManageApprovalRouting = () => false;
  globalThis.__app.canManageAreaOperations = () => false;
  globalThis.__app.isCoordinatorViceChair = () => false;
  globalThis.__app.approvalRouteLabel = () => '協調組';
  globalThis.__app.getMyNotifications = () => [];
`, context);
vm.runInContext(`globalThis.__app.renderBoothModule()`, context);
const boothHTML = elements['module-content'].innerHTML;
ok(boothHTML.includes('帳篷') && !boothHTML.includes('對講機'), '③ 攤位模組只列攤位申請，不應混入地域物資');
vm.runInContext(`globalThis.__app.renderSuppliesModule()`, context);
const supHTML = elements['module-content'].innerHTML;
ok(supHTML.includes('攤位物資') ? supHTML.includes('與「攤位物資申請」') : true, '③ 物資卡只可提「獨立」說明');
ok(!supHTML.includes('<p class="text-xs text-slate-400 py-8 text-center">暫無攤位物資申請'), '③ 物資卡不應再渲染攤位清單');
ok(!elements['module-actions'].innerHTML.includes('攤位物資申請'), '③ 物資卡頂欄不應再有「攤位物資申請」按鈕');

/* ② 行為：電話預載自登記資料 */
vm.runInContext(`
  globalThis.__app.currentUser = { role: 'director', name: '周恒晉', user_id: '周恒晉', group_name: '主題節目組' };
  globalThis.__app.getStaffData = () => ({ org_chart: [], contacts: [{ name: '周恒晉', contact: '91234567' }], job_duties: [] });
`, context);
ok(vm.runInContext(`__app.myDefaultContact()`, context) === '91234567', '② myDefaultContact 應從聯絡表載入申請人電話');

/* ⑤ 行為：申請中心 → 子頁 →「返回」回上一頁（含獨立攤位頁） */
vm.runInContext(`
  globalThis.__app.currentUser = { role: 'super_admin', name: '系統管理員', user_id: 'sys', group_name: '' };
  globalThis.__app.getStaffData = () => globalThis.__isd_staff;
  globalThis.__isd_staff = { staff_source: null, org_chart: [], contacts: [], job_duties: [] };
  globalThis.__app.navHistory = [];
  globalThis.__app.showDashboard();
`, context);
const navR = JSON.parse(vm.runInContext(`(()=>{
  const a=globalThis.__app;
  a.openModule('apply_hub');
  a.openModule('booth');
  const onBooth = a.currentModule==='booth';
  a.backToDashboard();
  const backToHub = a.currentModule==='apply_hub';
  return JSON.stringify({ onBooth, backToHub });
})()`, context));
ok(navR.onBooth, '⑤ 申請中心→「前往申請」應進入獨立攤位模組');
ok(navR.backToHub, '⑤ 攤位頁按「返回」應回到上一層（申請中心）');
console.log(`V86_FORMS_BACK_NAV_OK (${n} checks)`);
