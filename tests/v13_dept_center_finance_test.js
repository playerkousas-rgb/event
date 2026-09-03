#!/usr/bin/env node
'use strict';
/* v13 回歸測試（用戶 8 項要求）：
   ① 部門中心「統計」放最頂（可展開收合，默認展開）
   ② 崗位／成員＋職務大綱＋文件＋攤位預算 4 格算一個整體（默認收合，可一鍵全展開／全收合，亦可逐格）
   ③ 協調組「場地佈置及文件」：場地佈置圖＝唯一可上傳項；物資借用表格＋箱頭紙已設定好（毋須再設定）
   ④ 所有上傳文件＝上傳檔案或連結（唔可以只係手打文字）：協調組文件／場地佈置圖／行政文件／文件中心
   ⑤ 各部門新增 開支申報＋口頭報價登記 頁籤，行政組「財務匯總」匯總各部門
   ⑥ 部門開支申報後自動加入財務紀錄（毋須重新輸入），即時反映在本組頁籤／預算格／統計格／行政組匯總
   ⑦ 財務頁唔再有冇用嘅通用「新增」掣（所有操作在下方分頁內）
   ⑧ 各部門都有「財務指引」頁籤（全文內建）
   v13.2 疊加要求（3 大可收合卡片）：
   ⑨ 統計卡只留數字；點統計數字直接跳到詳細資料（崗位→本組資訊成員格；其餘→詳細統計資料對應段並自動展開）
   ⑩ 本組資訊標題刪去「（一個整體）」
   ⑪ 詳細統計資料卡放最下（默認收合），內含 物資／攤位／車輛／膳食／開支 5 段，每段可獨立展開收合
   ⑫ 攤位申請明細加入攤位名稱欄；每段詳細資料右上角「＋」可前往申請 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

/* ── 原始碼層面檢查 ── */
const coreSrc = fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8');
const finSrc = fs.readFileSync(path.join(root, 'js/30-finance.js'), 'utf8');
const quoteSrc = fs.readFileSync(path.join(root, 'js/28-oral-quotes.js'), 'utf8');
const coordSrc = fs.readFileSync(path.join(root, 'js/37-coordinator.js'), 'utf8');
const crisisSrc = fs.readFileSync(path.join(root, 'js/36-crisis.js'), 'utf8');
const actSrc = fs.readFileSync(path.join(root, 'js/21-activities.js'), 'utf8');

/* ① 統計放最頂＋摺疊（默認展開） */
const coreFlat = coreSrc.replace(/\s+/g, ' ');
ok(coreSrc.includes('groupStatsSectionHTML'), '① 應有 groupStatsSectionHTML（統計摺疊區）');
ok(coreFlat.includes('groupStatsOpenState(){ if(this.groupStatsOpen===undefined) this.groupStatsOpen=true;'), '① 統計區默認展開');
ok(coreSrc.includes('toggleGroupStatsSection'), '① 統計區可展開收合');
const appsTab = coreSrc.slice(coreSrc.indexOf('id="group-tab-apps"'), coreSrc.indexOf('id="group-tab-apps"') + 3000);
ok(appsTab.indexOf('groupStatsSectionHTML') < appsTab.indexOf('groupInfoBoxesHTML'), '① apps 頁籤內統計應在 4 格資訊之前（最頂）');

/* v13.2：3 大可收合卡片——① 統計（只留數字）② 本組資訊 ③ 詳細統計資料（最下） */
ok(appsTab.indexOf('groupInfoBoxesHTML') < appsTab.indexOf('groupDetailSectionHTML'), '⑪ 詳細統計資料卡應在本組資訊之後（最下）');
ok(coreSrc.includes('groupStatChipsHTML(groupName){') && coreSrc.includes('groupApplyDetailsHTML(groupName,{printId}={}){'), '⑨ 統計數字卡與詳細資料應拆開兩個渲染方法');
ok(coreSrc.includes('jumpToGroupDetail(key){'), '⑨ 點統計數字應可跳到詳細資料（jumpToGroupDetail）');
ok(coreSrc.includes('goApplyFromGroupDetail(kind){'), '⑫ 每段詳細資料右上角「＋」應可前往申請（goApplyFromGroupDetail）');
ok(coreSrc.includes('>攤位名稱</th>'), '⑫ 攤位申請明細應有「攤位名稱」欄');
ok(!coreSrc.includes('本組資訊（一個整體）'), '⑩ 本組資訊標題應刪去「（一個整體）」');

/* ② 4 格一個整體：默認收合＋一鍵全展開 */
ok(coreFlat.includes('groupInfoOpenState(){ if(!this.groupInfoOpen) this.groupInfoOpen={members:false,duties:false,docs:false,booths:false};'), '② 4 格默認全部收合');
ok(coreSrc.includes('toggleGroupInfoAll'), '② 應有一鍵全展開／全收合');
ok(coreSrc.includes('toggleGroupInfoBox'), '② 每格可個別展開收合');
ok(coreSrc.includes('一鍵全展開'), '② 應有「一鍵全展開」按鈕文字');

/* ⑤⑧ 全部門 3 個財務頁籤 */
ok(coreSrc.includes("k:'group_expense',label:'💰 開支申報'"), '⑤ 各部門應有「開支申報」頁籤');
ok(coreSrc.includes("k:'group_quotes',label:'📝 口頭報價'"), '⑤ 各部門應有「口頭報價」頁籤');
ok(coreSrc.includes("k:'group_finance_guide',label:'📖 財務指引'"), '⑧ 各部門應有「財務指引」頁籤');
ok(finSrc.includes('renderGroupExpenseTabHTML'), '⑤ 應有部門開支申報頁籤渲染');
ok(finSrc.includes('renderGroupFinanceGuideTabHTML'), '⑧ 應有部門財務指引頁籤渲染');
ok(quoteSrc.includes('renderGroupQuotesTabHTML'), '⑤ 應有部門口頭報價頁籤渲染');
ok(crisisSrc.includes('各部門開支申報及口頭報價匯總'), '⑤ 行政組應有各部門開支申報及口頭報價匯總');

/* ⑥ 自動入數 */
ok(finSrc.includes('refreshFinanceViews'), '⑥ 開支申報後應有 context-aware 刷新');
ok(quoteSrc.includes('refreshOralQuoteViews'), '⑥ 口頭報價登記後應有 context-aware 刷新');
ok(coreSrc.includes('開支申報（待批'), '⑥ 預算格應顯示開支申報（待批／已批核）自動滙入');
ok(coreSrc.includes('expTotal') && coreSrc.includes('開支申報</div>'), '⑥ 統計 6 格應包含開支申報');

/* ③ 協調組場地佈置及文件 */
ok(coordSrc.includes('openCoordinatorVenueForm'), '③ 應有上傳場地佈置圖表單');
ok(coordSrc.includes('毋須再設定'), '③ 物資借用表格／箱頭紙應標示已設定（毋須再設定）');
ok(crisisSrc.includes('venue_map'), '③ 協調組資料應有 venue_map（場地佈置圖）欄位');

/* ④ 上傳＝檔案或連結 */
ok(coordSrc.includes('coord-doc-file') && coordSrc.includes('請上傳檔案或填寫連結'), '④ 協調組文件上傳須檔案或連結');
ok(crisisSrc.includes('admin-doc-file') && crisisSrc.includes('admin-doc-url'), '④ 行政文件上傳應有檔案＋連結欄位');
ok(actSrc.includes('請上傳檔案或填寫連結（文件必須有檔案或連結）'), '④ 文件中心上傳須檔案或連結');

/* ⑦ 財務頁通用「新增」掣移除 */
ok(/key===['"]finance['"]\)\{[^}]*module-actions/.test(coreSrc.replace(/\s+/g, ' ')), '⑦ openModule 應有 finance 專屬分支（唔跌落通用新增兜底）');

/* ── 行為層面測試（VM 真實 prototype）── */
const elements = {};
function makeEl(id) {
  if (elements[id]) return elements[id];
  const e = {
    id, _cls: new Set(), style: {}, textContent: '', _innerHTML: '', value: '', dataset: {},
    disabled: false, files: [],
    set innerHTML(v) { this._innerHTML = String(v); }, get innerHTML() { return this._innerHTML; },
    addEventListener() {}, appendChild(c) { this._lastChild = c; },
    closest() { return null; },
    querySelectorAll() { return []; }, querySelector() { return null; },
    classList: {
      add: c => e._cls.add(c), remove: c => e._cls.delete(c),
      toggle: (c, on) => { if (on === undefined) on = !e._cls.has(c); on ? e._cls.add(c) : e._cls.delete(c); },
      contains: c => e._cls.has(c)
    }
  };
  elements[id] = e;
  return e;
}
const store = new Map();
const context = {
  console,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: {
    getElementById: id => makeEl(id),
    querySelectorAll: () => [],
    addEventListener() {}, createElement: () => makeEl('_new_' + Math.random()),
    body: { appendChild() {} }
  },
  window: {}, navigator: { sendBeacon: () => true }, location: { origin: 'http://test' },
  URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
  Blob: function Blob() {}, FileReader: function FileReader() {},
  XLSX: { read: () => ({ SheetNames: [], Sheets: {} }), utils: { sheet_to_json: () => [] } },
  setTimeout: (fn, ms) => { if (typeof fn === 'function' && (!ms || ms < 100)) { try { fn(); } catch (e) {} } return 0; },
  clearTimeout(id) { try { clearTimeout(id); } catch (e) {} },
  fetch: async () => ({ ok: true, status: 200, json: async () => ({ success: true }), text: async () => '' }),
  confirm: () => true, alert() {}
};
context.window = context; context.globalThis = context;
vm.createContext(context);
vm.runInContext(bundle, context);

vm.runInContext(`
  globalThis.__app = Object.create(TestApp.prototype);
  Object.assign(globalThis.__app, {
    currentEvent: { event_id: 'isd_2026', event_name: '2026 港島童軍繽紛日' },
    currentUser: { role: 'admin', name: '陳 admin', user_id: 'admin1', group_name: '行政組' },
    eventData: {},
    navHistory: [], currentModule: null, gasUrl: 'https://gas.example.com/mock', apiKey: 'k',
    usersList: []
  });
  globalThis.__app.isDemoEvent = () => false;
  globalThis.__app.getStaffData = () => ({ org_chart: [], contacts: [], job_duties: [] });
  globalThis.__app.getDocumentsData = () => ({ docs: [] });
  globalThis.__app.getActivitiesData = () => ({ booths: [] });
  globalThis.__app.getMealsData = () => ({ menus: [], orders: [] });
  globalThis.__app.getSuppliesData = () => ({ requests: [], booth_requests: [], vehicle_passes: [] });
  globalThis.__app.getParticipantsData = () => [];
  globalThis.__app.getAdminGroupData = () => ({ docs: [], tickets: [] });
  // getFinanceData／getOralQuotesData／getCoordinatorGroupData 用真實版本（localStorage stub），驗證「自動入數」
`, context);

/* ①②⑤⑧ 行為：部門中心排版＋摺疊＋新頁籤 */
vm.runInContext(`(()=>{ globalThis.__app.openGroupManagement('主題節目組'); })();`, context);
const themeHTML = vm.runInContext(`document.getElementById('module-content').innerHTML`, context);
/* v13.2：3 大卡片次序＝統計（最頂）→ 本組資訊 → 詳細統計資料（最下） */
const posStats = themeHTML.indexOf('id="group-stats-body"');
const posInfo = themeHTML.indexOf('id="gib-body-members"');
const posDetail = themeHTML.indexOf('id="group-detail-body"');
ok(posStats >= 0 && posInfo > posStats && posDetail > posInfo, '①②⑪ 部門中心 3 大卡片次序：統計 → 本組資訊 → 詳細統計資料');
ok(!themeHTML.includes('本組資訊（一個整體）') && themeHTML.includes('本組資訊<span id="gib-card-hint"'), '⑩ 本組資訊標題應已刪去「（一個整體）」（整體可收合）');
ok(themeHTML.includes('id="group-stats-body" class="p-3 space-y-3 "'), '① 統計區默認展開（HTML 無 hidden）');
const statsCardHTML = vm.runInContext(`globalThis.__app.groupStatsSectionHTML('主題節目組')`, context);
ok(!statsCardHTML.includes('本組物資申請（共'), '⑨ 統計卡只留數字（明細表移去「詳細統計資料」卡）');
ok(statsCardHTML.includes("app.jumpToGroupDetail('members')") && statsCardHTML.includes("app.jumpToGroupDetail('supplies')") && statsCardHTML.includes("app.jumpToGroupDetail('expense')"), '⑨ 統計數字格可點擊（跳到詳細資料）');
vm.runInContext(`globalThis.__app.toggleGroupStatsSection();`, context);
ok(vm.runInContext(`document.getElementById('group-stats-body').classList.contains('hidden')`, context) === true, '① 統計區可收合');
vm.runInContext(`globalThis.__app.toggleGroupStatsSection();`, context);
ok(vm.runInContext(`document.getElementById('group-stats-body').classList.contains('hidden')`, context) === false, '① 統計區可再展開');
ok(themeHTML.includes('id="gib-body-members" class="p-3 hidden"'), '② 崗位／成員格默認收合');
ok(themeHTML.includes('id="gib-body-booths" class="p-3 hidden'), '② 攤位／預算格默認收合');
ok(themeHTML.includes('一鍵全展開'), '② 應有「一鍵全展開」按鈕（默認收合狀態）');
vm.runInContext(`globalThis.__app.toggleGroupInfoAll();`, context);
['members', 'duties', 'docs', 'booths'].forEach(k => {
  ok(vm.runInContext(`document.getElementById('gib-body-${k}').classList.contains('hidden')`, context) === false, '② 一鍵全展開後 ' + k + ' 應展開');
});
ok(vm.runInContext(`document.getElementById('gib-all-btn').innerHTML`, context).includes('一鍵全收合'), '② 全展開後按鈕應變「一鍵全收合」');
vm.runInContext(`globalThis.__app.toggleGroupInfoAll();`, context);
['members', 'duties', 'docs', 'booths'].forEach(k => {
  ok(vm.runInContext(`document.getElementById('gib-body-${k}').classList.contains('hidden')`, context) === true, '② 一鍵全收合後 ' + k + ' 應收合');
});
vm.runInContext(`globalThis.__app.toggleGroupInfoBox('duties');`, context);
ok(vm.runInContext(`document.getElementById('gib-body-duties').classList.contains('hidden')`, context) === false, '② 職務大綱格可個別展開');
ok(vm.runInContext(`document.getElementById('gib-body-members').classList.contains('hidden')`, context) === true, '② 個別展開唔影響其他格');

/* v13.2：詳細統計資料卡（最下）——默認收合＋5 段獨立收合＋攤位名稱＋「＋」前往申請 */
ok(themeHTML.includes('id="group-detail-body" class="p-3 space-y-3 hidden"'), '⑪ 詳細統計資料卡默認收合');
ok(themeHTML.includes('id="gds-body-supplies" class="p-3 hidden"'), '⑪ 每段詳細資料默認收合');
ok(themeHTML.includes('id="gib-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3 "'), '⑩ 本組資訊卡默認展開（3 大卡片全部可收合）');
vm.runInContext(`globalThis.__app.toggleGroupInfoCard();`, context);
ok(vm.runInContext(`document.getElementById('gib-grid').classList.contains('hidden')`, context) === true, '⑩ 本組資訊卡可整體收合');
vm.runInContext(`globalThis.__app.toggleGroupInfoCard();`, context);
ok(vm.runInContext(`document.getElementById('gib-grid').classList.contains('hidden')`, context) === false, '⑩ 本組資訊卡可再展開');
const detHTML = vm.runInContext(`globalThis.__app.groupApplyDetailsHTML('主題節目組')`, context);
ok(detHTML.includes('本組物資申請（共') && detHTML.includes('本組攤位申請（共') && detHTML.includes('本組車輛通行證（共') && detHTML.includes('本組膳食訂餐（共') && detHTML.includes('本組開支申報（共'), '⑪ 詳細資料應含 物資／攤位／車輛／膳食／開支 5 段');
ok(detHTML.includes('>攤位名稱</th>'), '⑫ 攤位申請明細應有攤位名稱欄');
ok((detHTML.match(/goApplyFromGroupDetail/g) || []).length >= 5, '⑫ 每段詳細資料右上角應有「＋」前往申請');
vm.runInContext(`globalThis.__app.toggleGroupDetailCard();`, context);
ok(vm.runInContext(`document.getElementById('group-detail-body').classList.contains('hidden')`, context) === false, '⑪ 詳細統計資料卡可展開');
vm.runInContext(`globalThis.__app.toggleGroupDetailSection('booth');`, context);
ok(vm.runInContext(`document.getElementById('gds-body-booth').classList.contains('hidden')`, context) === false, '⑪ 攤位段可獨立展開');
vm.runInContext(`globalThis.__app.toggleGroupDetailSection('vehicle');`, context);
ok(vm.runInContext(`document.getElementById('gds-body-vehicle').classList.contains('hidden')`, context) === false, '⑪ 車輛段可獨立展開');
vm.runInContext(`globalThis.__app.toggleGroupDetailSection('booth');`, context);
ok(vm.runInContext(`document.getElementById('gds-body-booth').classList.contains('hidden')`, context) === true, '⑪ 攤位段可再收合');
ok(vm.runInContext(`document.getElementById('gds-body-vehicle').classList.contains('hidden')`, context) === false, '⑪ 收合攤位段唔影響車輛段（獨立收合）');
/* ⑨ 點統計數字 → 跳到詳細（自動展開大卡＋對應段） */
vm.runInContext(`globalThis.__app.toggleGroupDetailCard(false);`, context);
vm.runInContext(`globalThis.__app.jumpToGroupDetail('supplies');`, context);
ok(vm.runInContext(`document.getElementById('group-detail-body').classList.contains('hidden')`, context) === false, '⑨ 點數字：詳細統計資料卡自動展開');
ok(vm.runInContext(`document.getElementById('gds-body-supplies').classList.contains('hidden')`, context) === false, '⑨ 點數字：對應段落自動展開');
vm.runInContext(`globalThis.__app.toggleGroupInfoCard(false);`, context);
vm.runInContext(`globalThis.__app.jumpToGroupDetail('members');`, context);
ok(vm.runInContext(`document.getElementById('gib-grid').classList.contains('hidden')`, context) === false, '⑨ 點「本組人數」：本組資訊大卡自動展開');
ok(vm.runInContext(`document.getElementById('gib-body-members').classList.contains('hidden')`, context) === false, '⑨ 點「本組人數」：成員格自動展開');

/* ⑤⑧ 行為：各部門 3 個財務頁籤（主題節目組＋行政組＋協調組＋顧問團） */
[['主題節目組', themeHTML], ['行政組', null], ['協調組', null], ['顧問團', null]].forEach(([g]) => {
  if (g !== '主題節目組') vm.runInContext(`globalThis.__app.openGroupManagement('${g}');`, context);
  const h = vm.runInContext(`document.getElementById('module-content').innerHTML`, context);
  ok(h.includes('💰 開支申報') && h.includes('📝 口頭報價') && h.includes('📖 財務指引'), '⑤⑧ ' + g + ' 應有 開支申報／口頭報價／財務指引 3 個頁籤');
  ok(h.includes('group-tab-group_expense') && h.includes('group-tab-group_quotes') && h.includes('group-tab-group_finance_guide'), '⑤⑧ ' + g + ' 3 個頁籤容器應存在');
  ok(vm.runInContext(`document.getElementById('group-tab-group_expense').innerHTML`, context).includes('新增開支申報（本組）'), '⑤ ' + g + ' 開支申報頁籤應有本組新增按鈕');
  ok(vm.runInContext(`document.getElementById('group-tab-group_quotes').innerHTML`, context).includes('口頭報價登記'), '⑤ ' + g + ' 口頭報價頁籤應有登記說明');
  ok(vm.runInContext(`document.getElementById('group-tab-group_finance_guide').innerHTML`, context).includes('財務指引及會計程序（全文內建）'), '⑧ ' + g + ' 財務指引頁籤應有內建全文');
});

/* ⑤⑥ 行為：部門提交開支申報 → 自動入財務（本組頁籤＋統計＋行政組匯總全部即時見到） */
vm.runInContext(`(()=>{
  const a=globalThis.__app;
  a.currentModule='group_management'; a.currentGroupManaged='主題節目組';
  a.openGroupManagement('主題節目組');
  a.openExpenseForm(null,'主題節目組');
})();`, context);
ok(vm.runInContext(`document.getElementById('record-form-fields').innerHTML`, context).includes('id="exp-group" value="主題節目組"'), '⑥ 部門頁籤開表：組別應自動帶入本組');
vm.runInContext(`(()=>{
  document.getElementById('exp-voucher').value='V-TEST';
  document.getElementById('exp-item').value='測試開支項目';
  document.getElementById('exp-group').value='主題節目組';
  document.getElementById('exp-budget').value='600';
  document.getElementById('exp-actual').value='500';
  document.getElementById('exp-date').value='2026-10-04';
  document.getElementById('exp-submitter').value='陳大文';
  document.getElementById('exp-desc').value='';
  globalThis.__app.submitExpenseForm();
})();`, context);
const finState = JSON.parse(vm.runInContext(`JSON.stringify(globalThis.__app.getFinanceData().expenses.map(e=>({g:e.group_name,i:e.item_name,s:e.status,a:e.actual})))`, context));
ok(finState.length === 1 && finState[0].g === '主題節目組' && finState[0].i === '測試開支項目' && finState[0].s === 'pending' && finState[0].a === 500, '⑥ 提交後應自動寫入財務紀錄（毋須重新輸入）');
ok(vm.runInContext(`document.getElementById('group-tab-group_expense').innerHTML`, context).includes('測試開支項目'), '⑥ 提交後本組「開支申報」頁籤應即時顯示');
ok(vm.runInContext(`document.getElementById('module-content').innerHTML`, context).includes('開支申報'), '⑥ 統計格應包含開支申報');
const stExp = JSON.parse(vm.runInContext(`JSON.stringify({t:globalThis.__app.groupApplyStats('主題節目組').expTotal,p:globalThis.__app.groupApplyStats('主題節目組').expPending})`, context));
ok(stExp.t === 1 && stExp.p === 1, '⑥ 統計口徑：本組開支申報 1 宗（待批 1）');
const adminFin = vm.runInContext(`globalThis.__app.renderAdminFinanceTabHTML()`, context);
ok(adminFin.includes('各部門開支申報及口頭報價匯總'), '⑤ 行政組財務匯總應有匯總表');
ok(adminFin.includes('主題節目組') && adminFin.includes('測試開支項目'), '⑥ 行政組匯總應即時見到主題節目組嘅新申報');

/* ⑥ 行為：批核後刷新留在部門頁 */
vm.runInContext(`globalThis.__app.approveExpense(globalThis.__app.getFinanceData().expenses[0].id);`, context);
ok(vm.runInContext(`globalThis.__app.getFinanceData().expenses[0].status`, context) === 'approved', '⑥ 批核開支應生效');
ok(vm.runInContext(`document.getElementById('group-tab-group_expense').innerHTML`, context).includes('已批核'), '⑥ 批核後部門頁籤應刷新見到已批核');

/* ⑤ 行為：部門口頭報價登記 → 自動入紀錄（組別帶入） */
vm.runInContext(`(()=>{
  const a=globalThis.__app;
  a.currentModule='group_management'; a.currentGroupManaged='協調組';
  a.openGroupManagement('協調組');
  a.openOralQuoteForm(null,'協調組');
  document.getElementById('oq-date').value='2026-09-01';
  document.getElementById('oq-group').value='協調組';
  document.getElementById('oq-vendor').value='測試商戶';
  document.getElementById('oq-contact-person').value='';
  document.getElementById('oq-contact-phone').value='';
  document.getElementById('oq-item').value='測試報價項目';
  document.getElementById('oq-amount').value='800';
  document.getElementById('oq-notes').value='';
  a.submitOralQuoteForm();
})();`, context);
ok(vm.runInContext(`document.getElementById('record-form-fields').innerHTML`, context).includes('value="協調組" selected'), '⑤ 口頭報價表：組別應自動帶入本組');
const qState = JSON.parse(vm.runInContext(`JSON.stringify(globalThis.__app.getOralQuotesData().quotes.map(q=>({g:q.group_name,v:q.vendor,a:q.amount})))`, context));
ok(qState.length === 1 && qState[0].g === '協調組' && qState[0].v === '測試商戶' && qState[0].a === 800, '⑤ 部門口頭報價登記應自動寫入紀錄');
ok(vm.runInContext(`document.getElementById('group-tab-group_quotes').innerHTML`, context).includes('測試商戶'), '⑤ 提交後本組「口頭報價」頁籤應即時顯示');

/* ③ 行為：協調組場地佈置及文件＝3 個固定卡＋其他文件 */
vm.runInContext(`(()=>{
  globalThis.__app.currentModule='group_management'; globalThis.__app.currentGroupManaged='協調組';
  globalThis.__app.openGroupManagement('協調組');
})();`, context);
const coordDocsHTML = vm.runInContext(`document.getElementById('group-tab-coord_docs').innerHTML`, context);
ok(coordDocsHTML.includes('場地佈置圖') && coordDocsHTML.includes('上傳場地佈置圖（檔案／連結）'), '③ 場地佈置圖應有上傳（檔案／連結）功能');
ok(coordDocsHTML.includes('物資借用表格') && coordDocsHTML.includes('毋須再設定'), '③ 物資借用表格＝已設定（毋須再設定）');
ok(coordDocsHTML.includes('箱頭紙') && coordDocsHTML.includes('填寫／列印箱頭紙'), '③ 箱頭紙＝已設定（填寫／列印即可）');
ok(!/上傳.*物資借用表格/.test(coordDocsHTML), '③ 物資借用表格唔應再有上傳按鈕');

/* ④ 行為：場地佈置圖須檔案或連結（只打字唔得） */
vm.runInContext(`globalThis.__app.openCoordinatorVenueForm();`, context);
vm.runInContext(`(()=>{ document.getElementById('cvm-name').value='場地佈置圖'; document.getElementById('cvm-url').value=''; globalThis.__app.submitCoordinatorVenueForm(); })();`, context);
ok(vm.runInContext(`document.getElementById('toast').textContent`, context).includes('請上傳檔案或填寫連結'), '④ 場地佈置圖：無檔案無連結應拒絕（唔可以只填文字）');
vm.runInContext(`(()=>{ document.getElementById('cvm-url').value='https://drive.google.com/file/d/TESTMAP123/view'; globalThis.__app.submitCoordinatorVenueForm(); })();`, context);
const vmState = JSON.parse(vm.runInContext(`JSON.stringify(globalThis.__app.getCoordinatorGroupData().venue_map||{})`, context));
ok(vmState.file_url === 'https://drive.google.com/file/d/TESTMAP123/view', '④ 場地佈置圖：貼連結應可上傳成功');
const coordDocsHTML2 = vm.runInContext(`document.getElementById('group-tab-coord_docs').innerHTML`, context);
ok(coordDocsHTML2.includes('已上傳') && coordDocsHTML2.includes('TESTMAP123'), '④ 場地佈置圖上傳後應顯示已上傳＋開啟連結');

/* ④ 行為：協調組其他文件須檔案或連結 */
vm.runInContext(`(()=>{ globalThis.__app.openCoordinatorDocForm(); document.getElementById('coord-doc-title').value='測試文件'; document.getElementById('coord-doc-category').value='數據'; document.getElementById('coord-doc-desc').value=''; document.getElementById('coord-doc-url').value=''; globalThis.__app.submitCoordinatorDocForm(); })();`, context);
ok(vm.runInContext(`document.getElementById('toast').textContent`, context).includes('請上傳檔案或填寫連結'), '④ 協調組文件：無檔案無連結應拒絕');
vm.runInContext(`(()=>{ document.getElementById('coord-doc-url').value='https://example.com/doc.pdf'; globalThis.__app.submitCoordinatorDocForm(); })();`, context);
const coordDocs = JSON.parse(vm.runInContext(`JSON.stringify(globalThis.__app.getCoordinatorGroupData().docs.map(d=>({t:d.title,u:d.file_url})))`, context));
ok(coordDocs.some(d => d.t === '測試文件' && d.u === 'https://example.com/doc.pdf'), '④ 協調組文件：連結應可上傳成功');

/* ④ 行為：行政文件須檔案或連結 */
vm.runInContext(`(()=>{ globalThis.__app.openAdminDocForm(); document.getElementById('admin-doc-title').value='行政測試文件'; document.getElementById('admin-doc-category').value='通告'; document.getElementById('admin-doc-desc').value=''; document.getElementById('admin-doc-url').value=''; globalThis.__app.submitAdminDocForm(); })();`, context);
ok(vm.runInContext(`document.getElementById('toast').textContent`, context).includes('請上傳檔案或填寫連結'), '④ 行政文件：無檔案無連結應拒絕');
ok(vm.runInContext(`document.getElementById('record-form-fields').innerHTML`, context).includes('type="file"'), '④ 行政文件表單應有檔案上傳欄位');

/* ④ 行為：文件中心（通告及文件）須檔案或連結 */
vm.runInContext(`(()=>{ globalThis.__app.getDocumentsData = () => ({ docs: [] }); globalThis.__app.renderDocumentsModule(); globalThis.__app.openDocumentForm(); document.getElementById('doc-title').value='文件中心測試'; document.getElementById('doc-category').value='通告'; document.getElementById('doc-url').value=''; globalThis.__app.submitDocumentForm(); })();`, context);
ok(vm.runInContext(`document.getElementById('toast').textContent`, context).includes('請上傳檔案或填寫連結'), '④ 文件中心：無檔案無連結應拒絕');

/* ⑦ 行為：財務頁 module-actions＝提示，唔係通用「新增」 */
vm.runInContext(`globalThis.__app.currentModule=null; globalThis.__app.openModule('finance');`, context);
const finActions = vm.runInContext(`document.getElementById('module-actions').innerHTML`, context);
ok(!finActions.includes('openAddRecordModal'), '⑦ 財務頁唔應有通用「新增」掣');
ok(finActions.includes('全部在下方分頁內處理'), '⑦ 財務頁應顯示分頁操作提示');

/* ⑦（重新解讀）審查上傳地方：紀錄／口頭性質保持純文字；文件／指引性質可附檔案或連結 */
const annSrc=fs.readFileSync('js/34-announcements.js','utf8');
const oqSrc=fs.readFileSync('js/28-oral-quotes.js','utf8');
const lfSrc=fs.readFileSync('js/39-lost-found.js','utf8');
ok(!oqSrc.includes('type="file"') && !oqSrc.includes('id="oq-url"'), '⑦ 口頭報價保持純文字（口頭性質，唔設附件）');
ok((lfSrc.match(/type="file"/g)||[]).length===1 && lfSrc.includes('匯入 EXCEL 失物紀錄'), '⑦ 失物認領保持純文字紀錄（唯一檔案掣係 EXCEL 批量匯入）');
ok(annSrc.includes('id="ug-file"') && annSrc.includes('id="ug-url"'), '⑦ 旅團須知表單應有檔案／連結附件欄位');
ok(crisisSrc.includes('id="cr-file"') && crisisSrc.includes('id="cr-url"'), '⑦ 危機指引表單應有檔案／連結附件欄位');

/* ⑦ 行為：旅團須知 — 可附連結，純文字亦照儲（附件可選） */
vm.runInContext(`(()=>{ globalThis.__app.openUnitGuideForm(); document.getElementById('ug-title').value='測試須知附件'; document.getElementById('ug-category').value='報到'; document.getElementById('ug-desc').value='純文字都得'; document.getElementById('ug-url').value='https://drive.example.com/guide.pdf'; globalThis.__app.submitUnitGuideForm(); })();`, context);
let ugSaved=JSON.parse(vm.runInContext(`JSON.stringify(globalThis.__app.getUnitGuideData().docs.find(d=>d.title==='測試須知附件')||null)`, context));
ok(ugSaved && ugSaved.file_url==='https://drive.example.com/guide.pdf', '⑦ 旅團須知：可附連結');
ok(vm.runInContext(`document.getElementById('module-content').innerHTML`, context).includes('開啟附件'), '⑦ 旅團須知：卡片顯示「開啟附件」');
vm.runInContext(`(()=>{ globalThis.__app.openUnitGuideForm(); document.getElementById('ug-title').value='純文字須知'; document.getElementById('ug-desc').value='冇附件都儲到'; document.getElementById('ug-url').value=''; globalThis.__app.submitUnitGuideForm(); })();`, context);
ok(vm.runInContext(`globalThis.__app.getUnitGuideData().docs.some(d=>d.title==='純文字須知'&&!d.file_url&&!d.file_data)`, context) === true, '⑦ 旅團須知：純文字仍可儲存（附件可選）');

/* ⑦ 行為：危機指引 — 可附連結＋_userEdited（修正重新載入後消失）；純文字亦照儲 */
vm.runInContext(`(()=>{ globalThis.__app.openCrisisDocForm(null,'其他'); document.getElementById('cr-title').value='測試危機指引附件'; document.getElementById('cr-url').value='https://drive.example.com/crisis.pdf'; globalThis.__app.submitCrisisDocForm(); })();`, context);
let crSaved=JSON.parse(vm.runInContext(`JSON.stringify((globalThis.__app.getCrisisData().docs||[]).find(d=>d.title==='測試危機指引附件')||null)`, context));
ok(crSaved && crSaved.file_url==='https://drive.example.com/crisis.pdf' && crSaved._userEdited===true, '⑦ 危機指引：可附連結＋_userEdited（重新載入唔會消失）');
ok(vm.runInContext(`document.getElementById('crisis-tab-docs').innerHTML`, context).includes('開啟附件'), '⑦ 危機指引：卡片顯示「開啟附件」');
vm.runInContext(`(()=>{ globalThis.__app.openCrisisDocForm(null,'其他'); document.getElementById('cr-title').value='純文字危機指引'; document.getElementById('cr-url').value=''; globalThis.__app.submitCrisisDocForm(); })();`, context);
ok(vm.runInContext(`(globalThis.__app.getCrisisData().docs||[]).some(d=>d.title==='純文字危機指引'&&!d.file_url&&!d.file_data)`, context) === true, '⑦ 危機指引：純文字仍可儲存（附件可選）');

console.log(`\n全部 v13 驗證通過 ✅（${n} 項）`);
process.exit(0);
