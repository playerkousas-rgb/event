#!/usr/bin/env node
'use strict';
/* v8.5 回歸測試（11 項修正）：
   ① 協調組／行政組卡片加入與其他部門卡片相同的 4 格（成員／職務大綱／文件／攤位·預算）
   ② 預算逐項顯示（不再只寫「共 N 項」）
   ③ 財務預算明細：只有 2025 紀錄（2026 預算全空）的組別排最後
   ④ 財務預算明細：底部分「收入」不再重複（已有「收入」組別卡時不重覆渲染）
   ⑤ 主頁部門卡片人數只計架構圖崗位（顧問團 2 人，不再被舊聯絡表「管理」分組撑大）
   ⑥ 部門卡片內「返回儀表板」按鈕已刪
   ⑦ 防幽靈點擊：觸控中／剛觸控完會延遲替換儀表板卡片 DOM（主頁自動跳入部門卡片 BUG）
   ⑧ 攤位物資申請對標 2026 攤位總表（分區/編號/負責單位 + 攤位名稱招牌 + 標準項目只填數量）
   ⑨⑩ 攤位／地域物資均不設庫存（庫存分頁及對照庫存欄位已移除）
   ⑪ 膳食菜單寫入及讀回後端 Meals 表（含 options/price/deadline/locked），登出後／他機仍可見可申請 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const isd = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));

// 依 index.html 的 <script src="js/..."> 順序串接本地 JS（CDN 跳過）
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

/* ---------- ①⑥ 部門卡片 ---------- */
const coreSrc = fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8');
ok(coreSrc.includes('groupInfoBoxesHTML(groupName){'), '① 應有共用 groupInfoBoxesHTML');
ok(coreSrc.includes("${this.groupInfoBoxesHTML(groupName)}"), '① 部門管理中心應使用共用 4 格');
ok(!coreSrc.includes('返回儀表板'), '⑥ 「返回儀表板」按鈕應已從部門卡片刪除');
const coordSrc = fs.readFileSync(path.join(root, 'js/37-coordinator.js'), 'utf8');
ok(coordSrc.includes("this.groupInfoBoxesHTML('協調組')"), '① 協調組管理頁應有 成員/職務大綱/文件/預算 4 格');
const crisisSrc = fs.readFileSync(path.join(root, 'js/36-crisis.js'), 'utf8');
ok(crisisSrc.includes("this.groupInfoBoxesHTML('行政組')"), '① 行政組管理頁應有 成員/職務大綱/文件/預算 4 格');

/* ---------- ② 預算逐項顯示 ---------- */
ok(coreSrc.includes('本組預算（逐項）'), '② 部門卡片預算應逐項列出');
ok(!coreSrc.includes('共 ${groupBudget.items.length} 項'), '② 不應再只寫「共 N 項」');
ok(coreSrc.includes('預算總額'), '② 逐項之後應有預算總額');

/* ---------- ③④ 財務預算明細 ---------- */
const finSrc = fs.readFileSync(path.join(root, 'js/30-finance.js'), 'utf8');
ok(finSrc.includes('has2026'), '③ 預算明細應按「有無 2026 預算」排序');
ok(finSrc.includes('僅 2025 紀錄'), '③ 只有 2025 紀錄的組別應有標示');
ok(finSrc.includes("orderedBudgets.map(groupCard)"), '③ 應以排序後清單渲染');
ok(!/<div class="border rounded-xl p-4 bg-white"><h4 class="font-bold text-sm mb-2"><i class="fa-solid fa-coins text-emerald-600 mr-2"><\/i>收入<\/h4>/.test(finSrc.replace(/\s+/g, ' ').split('income.length && !budgets.some')[0].split('container.innerHTML')[1] || ''), '④ 預算明細主渲染不應再有無條件的底部分「收入」');
ok(finSrc.includes("income.length && !budgets.some(g=>normalizeGroupName(g.group_name)==='收入')"), '④ 「收入」只應在冇「收入」組別卡時才渲染（不再重複）');

/* ---------- ⑤ 主頁卡片人數 ---------- */
const rqaStart = coreSrc.indexOf('renderGroupQuickAccess(){');
const rqaEnd = coreSrc.indexOf('openGroupManagement(groupName){');
const rqa = coreSrc.slice(rqaStart, rqaEnd);
ok(!rqa.includes('contacts.filter(c=>normalizeGroupName(c.group_name)===g)'), '⑤ 主頁卡片人數不應再併計舊聯絡表（顧問團 4 人 BUG）');
ok(rqa.includes("uniqPosts.forEach(n=>{ (n.names||'')"), '⑤ 人數應只計架構圖崗位人名');

/* ---------- ⑦ 防幽靈點擊 ---------- */
ok(coreSrc.includes('deferredDashWrite(el,html){'), '⑦ 應有 deferredDashWrite 安全寫入');
ok(coreSrc.includes("addEventListener('touchstart'"), '⑦ 應追蹤 touchstart');
ok(rqa.includes('this.deferredDashWrite(container,html)'), '⑦ 主頁部門卡片應經 deferredDashWrite 寫入');

/* ---------- ⑧ 攤位物資申請對標總表 ---------- */
const cfgSrc = fs.readFileSync(path.join(root, 'js/00-config.js'), 'utf8');
const supSrc = fs.readFileSync(path.join(root, 'js/24-supplies.js'), 'utf8');
ok(cfgSrc.includes('const BOOTH_ZONES_2026='), '⑧ 應內建 2026 攤位總表分區/負責單位');
ok(cfgSrc.includes("theme:'積極公民 / 「十五五」規劃'"), '⑧ 分區 A 應為 積極公民／「十五五」規劃');
ok(cfgSrc.includes('const BOOTH_STD_ITEMS='), '⑧ 應有標準物資清單');
ok(cfgSrc.includes("{key:'qty_tent', name:'帳篷', unit:'頂'") && cfgSrc.includes("{key:'qty_table', name:'摺枱', unit:'張'}") && cfgSrc.includes("{key:'qty_chair', name:'摺椅', unit:'張'}"), '⑧ 標準物資應為 v8.7 帳篷／摺枱／摺椅（只填數量，對標主題節目組表單）');
ok(cfgSrc.includes('3mW x 3mD'), '⑧ 帳篷應標明 3mW x 3mD');
ok(cfgSrc.includes('BOOTH_OWNER_AGE_GROUPS'), '⑧ 應有攤位負責人年齡組別選項（Google Form 原樣）');
ok(cfgSrc.includes('BOOTH_ITEM_KEY_MAP'), '⑧ 應有舊版 item_name 映射（兼容舊紀錄總表統計）');
ok(supSrc.includes("id=\"booth-zone\""), '⑧ 表單應有分區選擇');
ok(supSrc.includes("id=\"booth-no\""), '⑧ 表單應有攤位編號');
ok(supSrc.includes("id=\"booth-unit-select\""), '⑧ 表單應有負責單位下拉');
ok(supSrc.includes("id=\"booth-name\""), '⑧ 表單應有攤位名稱（招牌用）');
ok(supSrc.includes('booth-qty-'), '⑧ 標準項目只填數量');
ok(supSrc.includes('id="booth-delivery"') && supSrc.includes('id="booth-other"'), '⑧ 表單應有運送物資需求／其他需求');
ok(supSrc.includes('id="booth-activity"') && supSrc.includes('id="booth-fif15"'), '⑧ 表單應有攤位活動內容／「十五五」主題（v8.7 計劃書欄位）');
ok(supSrc.includes('id="booth-owner-age"') && supSrc.includes('id="booth-owner-email"'), '⑧ 表單應有負責人年齡組別／電郵（v8.7 計劃書欄位）');
ok(cfgSrc.includes('function boothCodeOfUnit'), '⑧ 應可由負責單位反查攤位代碼');

/* ---------- ⑨⑩ 不設庫存 ---------- */
ok(!supSrc.includes("switchSuppliesTab('inventory')\""), '⑨⑩ 物資模組不應再有庫存分頁按鈕');
ok(!supSrc.includes('id="supplies-tab-inventory"'), '⑨⑩ 庫存分頁容器應已刪');
ok(!supSrc.includes('庫存總數'), '⑨⑩ 統計不應再對照庫存');
ok(!supSrc.includes('新增總物資</button>'), '⑨⑩ 「新增總物資」按鈕應已刪');

/* ---------- ⑪ 膳食後端 ---------- */
const mealsSrc = fs.readFileSync(path.join(root, 'js/22-meals.js'), 'utf8');
const syncSrc = fs.readFileSync(path.join(root, 'js/23-sync.js'), 'utf8');
ok(mealsSrc.includes('saveMealsData(data,skipGasSync=false)'), '⑪ saveMealsData 應支援跳過回寫');
ok(mealsSrc.includes("options:(m.options||[]).join(',')") && mealsSrc.includes('deadline:m.deadline||\'\'') && mealsSrc.includes('locked:!!m.locked'), '⑪ 菜單寫入後端應含 options/deadline/locked');
ok(syncSrc.includes('膳食菜單（v8.5 修復'), '⑪ 同步應合併後端 Meals 表');
ok(syncSrc.includes('Array.isArray(d.Meals)'), '⑪ syncApplicationsFromGas 應處理 d.Meals');
ok(syncSrc.includes("this.deleteGasRecord('Meals',menuId)"), '⑪ 刪除菜單應同步刪後端');
ok(syncSrc.includes('填寫訂餐（無需登入）'), '⑪ 訂餐按鈕應標明無需登入');
ok(mealsSrc.includes("getDeletedRecordIds('Meals')"), '⑪ 已刪除菜單不應被後端舊資料還原');

/* ---------- 行為測試（vm 載入真 prototype） ---------- */
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
    eventData: {}, navHistory: [], currentModule: null, gasUrl: '', apiKey: 'k'
  });
  globalThis.__app.getStaffData = () => globalThis.__isd.staff;
  globalThis.__app.getDocumentsData = () => ({ docs: [] });
  globalThis.__app.getActivitiesData = () => ({ booths: [] });
`, context);
vm.runInContext('globalThis.__isd = ' + JSON.stringify({ staff: isd.staff }) + ';', context);

/* ② 行為：groupInfoBoxesHTML 逐項預算 */
vm.runInContext(`
  globalThis.__app.getFinanceData = () => ({ group_itemized_budgets: [
    { group_name: '主題節目組', items: [
      { voucher: 'T-01', item_name: '攤位遊戲物資', budget: 5000, actual: 1000, notes: 'ISD2025實際: 4000 ／ ISD2025預算: 4500' },
      { voucher: 'T-02', item_name: '工作人員膳食', budget: 3000, actual: 0, notes: '' }
    ] },
    { group_name: '品牌推廣組', items: [ { voucher: '', item_name: '招牌製作', budget: 0, actual: 0, notes: 'ISD2025實際: 1200 ／ ISD2025預算: 1200' } ] }
  ]});
`, context);
const boxes = vm.runInContext(`globalThis.__app.groupInfoBoxesHTML('主題節目組')`, context);
ok(boxes.includes('攤位遊戲物資') && boxes.includes('工作人員膳食'), '② 逐項預算應列出每個項目名');
ok(boxes.includes('$5,000') && boxes.includes('$3,000'), '② 逐項預算應列出每項金額');
ok(boxes.includes('$8,000'), '② 應有預算總額 $8,000');
ok(boxes.includes('ISD2025實際: 4000'), '② 備註（2025 紀錄）應保留在 title');
const boxes2025only = vm.runInContext(`globalThis.__app.groupInfoBoxesHTML('品牌推廣組')`, context);
ok(boxes2025only.includes('招牌製作') && boxes2025only.includes('$0'), '② 2025-only 組別亦逐項顯示');

/* ⑤ 行為：顧問團人數（org 2 崗位 2 人；舊聯絡表「管理」4 人不再併計） */
const advNodes = vm.runInContext(`globalThis.__app.getGroupOrgNodes('顧問團')`, context);
ok(advNodes.length === 2, '⑤ 顧問團應只有 2 個崗位');

/* ③④ 行為：renderFinanceBudgets 排序及不重複收入 */
vm.runInContext(`
  globalThis.__box = { id:'finance-tab-budgets', _cls:new Set(), style:{}, textContent:'', value:'',
    addEventListener(){}, querySelectorAll(){return [];}, appendChild(){},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}} };
  globalThis.__app.getFinanceData = () => ({ group_itemized_budgets: [
    { group_name: '顧問團', items: [ { voucher:'', item_name:'舊紀錄', budget: 0, actual: 0, notes: 'ISD2025實際: 500' } ] },
    { group_name: '收入', items: [ { voucher:'', item_name:'報名費', budget: 90000, actual: 0, notes: '' } ] },
    { group_name: '行政組', items: [ { voucher:'', item_name:'保險', budget: 10000, actual: 0, notes: '' } ] }
  ], income: [ { item: '報名費', budget: 90000, actual: 0 } ] });
  globalThis.__app.canApproveArea = () => false; globalThis.__app.canExecuteArea = () => false;
`, context);
elements['finance-tab-budgets'] = vm.runInContext(`globalThis.__box`, context);
vm.runInContext(`globalThis.__app.renderFinanceBudgets()`, context);
const finHTML = elements['finance-tab-budgets'].innerHTML;
const idxAdmin = finHTML.indexOf('行政組');
const idxAdv = finHTML.indexOf('顧問團');
ok(idxAdmin >= 0 && idxAdv >= 0 && idxAdmin < idxAdv, '③ 2025-only 組別（顧問團）應排在有 2026 預算組別（行政組）之後');
ok(finHTML.includes('僅 2025 紀錄'), '③ 2025-only 組別應有「僅 2025 紀錄」標示');
ok(finHTML.includes('小計'), '③ 每組應有小計行');
ok((finHTML.match(/收入/g) || []).length === 1, '④ 「收入」只出現一次（不重複）');
ok(finHTML.includes('報名費') && finHTML.includes('$90,000'), '④ 收入組別卡應保留收入內容');

/* ⑧ 行為：boothCodeOfUnit */
const code = vm.runInContext(`boothCodeOfUnit('港島童軍皮藝會')`, context);
ok(code === 'D09', '⑧ 港島童軍皮藝會 應反查為 D09');
const code2 = vm.runInContext(`boothCodeOfUnit('港島第99旅')`, context);
ok(code2 === 'G03', '⑧ 旅團（G 區）應反查為 G03');

console.log(`V85_FIXES_OK (${n} checks)`);
