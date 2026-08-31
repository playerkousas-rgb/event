#!/usr/bin/env node
'use strict';
/* v8.4 回歸測試：
   ① 一進來不再見到超舊版「認識活動／參與活動」彩色卡面分組（#full-dashboard-sections 已刪）
   ② 「返回」＝返回上一頁（申請中心 → 子頁 → 返回回申請中心，唔係返主控台）
   ③ 身份卡片登出按鈕已刪（最頂 BAR 已有登出）
   ④ 部門卡片：職務大綱按職位拆段（唔係堆成一堆）；組別介紹下按鈕＝前往申請中心＋我的監察
      （主題節目組另見 攤位總覽、服務及發展組另見 童心捐贈大行動、協調組卡片＝物資・膳食・車輛統計）；
      新增「本組攤位申請及狀態」
   ⑤ 主頁部門中心卡片崗位數 ＝ 進入卡片後崗位數（共用 getGroupOrgNodes）
   ⑥ 預算：原生 Google 試算表（新 sheet_id）直接讀取並分配進各組預算格（parseBudgetGrid 容錯未知組別） */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const coreJsSrc = fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8');
const isd = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));

// 依 <script> 順序載入（本地 js/ 檔；CDN 跳過）
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
const core = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';

// ── 小型 DOM mock：每個 id 獨立元素，classList 記錄 hidden ──
const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = {
      id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '',
      addEventListener() {}, querySelectorAll() { return []; },
      classList: {
        add: c => e._cls.add(c),
        remove: c => e._cls.delete(c),
        toggle: c => { if (e._cls.has(c)) e._cls.delete(c); else e._cls.add(c); },
        contains: c => e._cls.has(c)
      }
    };
    elements[id] = e;
  }
  return elements[id];
}
['dashboard','module','users','bulk','system','approvals','approvalmatrix'].forEach(v => el('view-' + v)._cls.add('hidden'));

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
vm.runInContext(core, context);

function assertFn(cond, msg) { if (!cond) throw new Error(msg); }
let n = 0;
function ok(cond, msg) { assertFn(cond, msg); n++; }

/* ---------- ① 超舊版分組已刪 ---------- */
ok(!html.includes('id="full-dashboard-sections"'), '① 舊版 #full-dashboard-sections 應已刪除');
ok(!/<h3[^>]*>[^<]*認識活動/.test(html) && !/<h3[^>]*>[^<]*參與活動/.test(html) && !/<h3[^>]*>[^<]*協作與管理/.test(html),
  '① 「認識活動／參與活動／協作與管理」分組標題應已刪除');
ok(!html.includes('id="dashboard-mode-toggle"'), '① 「完整模式」切換按鈕應已刪除（舊版才需要）');

/* ---------- ③ 身份卡片登出按鈕已刪（最頂 BAR 保留登出） ---------- */
ok(!html.includes('identity-logout-btn'), '③ 身份卡片登出按鈕 (identity-logout-btn) 應已刪除');
ok(html.includes('id="logout-btn"'), '③ 最頂 BAR 登出按鈕應保留');
ok(!coreJsSrc.includes('identity-logout-btn'), '③ JS 不應再引用 identity-logout-btn');

/* ---------- ④ 部門卡片按鈕（靜態來源檢查） ---------- */
ok(!coreJsSrc.includes('協調組（物資／車輛／膳食批核）'), '④ 各組卡片不應再有「協調組（物資／車輛／膳食批核）」多餘按鈕');
const ogm = coreJsSrc.slice(coreJsSrc.indexOf('openGroupManagement(groupName){'), coreJsSrc.indexOf('async loadEventData(){'));
ok(ogm.includes('前往申請中心提交申請') && ogm.includes('我的監察'), '④ 組別介紹下應有 前往申請中心＋我的監察（正常組別）');
ok(ogm.includes("groupName==='主題節目組'") && ogm.includes('攤位總覽'), '④ 主題節目組應另見「攤位總覽」');
ok(ogm.includes("groupName==='服務及發展組'") && ogm.includes('童心捐贈大行動'), '④ 服務及發展組應另見「童心捐贈大行動」');
ok(ogm.includes('本組攤位申請及狀態'), '④ 部門卡片應有「本組攤位申請及狀態」');
ok(ogm.includes('this.getGroupOrgNodes(groupName)'), '⑤ 部門管理中心應使用共用 getGroupOrgNodes');
// 部門卡片已抽成共用 groupHubCardHTML（儀表板部門管理中心＋底部導覽部門中心列表頁共用一份）
const rqa = coreJsSrc.slice(coreJsSrc.indexOf('groupHubCardHTML(g,currentGroup,isAdmin){'), coreJsSrc.indexOf('renderGroupQuickAccess(){'));
ok(rqa.includes('this.getGroupOrgNodes(g)'), '⑤ 部門卡片應使用共用 getGroupOrgNodes（與卡片內一致）');
ok(rqa.includes('物資・膳食・車輛統計'), '④ 協調組卡片按鈕應為「物資・膳食・車輛統計」');
ok(coreJsSrc.slice(coreJsSrc.indexOf('renderGroupQuickAccess(){'), coreJsSrc.indexOf('openGroupManagement(groupName){')).includes('this.groupHubCardHTML(g,currentGroup,isAdmin)'),
  '⑤ 主頁部門卡片應呼叫共用 groupHubCardHTML（與部門中心列表頁一致）');

/* ---------- 實例（vm 內建立，方法用真 prototype） ---------- */
vm.runInContext(`
  globalThis.__isd = null;
  globalThis.__app = Object.create(TestApp.prototype);
  Object.assign(globalThis.__app, {
    currentEvent: { event_id: 'isd_2026', event_name: '2026 港島童軍繽紛日' },
    currentUser: { role: 'super_admin', name: '系統管理員', user_id: 'sys', group_name: '' },
    eventData: { staff: null },
    navHistory: [], currentModule: null, gasUrl: '', apiKey: 'k'
  });
  globalThis.__app.getStaffData = () => ({ org_chart: globalThis.__isd.staff.org_chart || [], contacts: globalThis.__isd.staff.contacts || [], job_duties: globalThis.__isd.staff.job_duties || [] });
`, context);
vm.runInContext('globalThis.__isd = ' + JSON.stringify({ staff: isd.staff }) + ';', context);

/* ---------- ④ 職務大綱按職位拆段（服務及發展組：副主席／總主任／服務主任／發展主任） ---------- */
const dutySecs = vm.runInContext(`
  (function(){
    const j = globalThis.__isd.staff.job_duties.find(x => x.group === '服務及發展組');
    return globalThis.__app.splitDutySections(j.duty);
  })()
`, context);
ok(dutySecs.length === 4, '④ 服務組職務大綱應拆出 4 個職位（實際 ' + dutySecs.length + '）');
ok(dutySecs[0].title === '副主席（服務及發展）（黎姵伶）', '④ 第一段應為 副主席（服務及發展）（黎姵伶）');
ok(dutySecs[3].title === '發展主任', '④ 最後一段應為 發展主任');
dutySecs.forEach(s => ok(s.body.some(l => l.trim()), '④ 各職位段應有內容'));

/* ---------- ⑤ 主頁卡片崗位數 ＝ 卡片內崗位數（共用 helper ＝ 舊卡片內邏輯） ---------- */
const homePosts = vm.runInContext(`
  (function(){
    const a = globalThis.__app; const out = {};
    for (const g of ORG_GROUPS) out[g] = a.getGroupOrgNodes(g).length;
    return out;
  })()
`, context);
// 獨立重算「卡片內（正確）邏輯」：同組過濾 + 職級排序 + title|names|level 去重
function expectedDetailPosts(g) {
  const norm = v => {
    let x = String(v || '').trim().replace(/\s*[（(]\s*Level\s*\d+\s*[）)]\s*$/i, '').trim().replace(/^\s*[（(]+\s*/, '').replace(/\s*[）)]+$/, '').trim();
    const map = { '典禮及會操': '會操及典禮組', '主題節目': '主題節目組', '品牌推廣': '品牌推廣組', '嘉賓接待': '嘉賓接待組', '協調': '協調組', '服務及發展': '服務及發展組', '行政': '行政組' };
    if (x === '管理') return '顧問團'; if (map[x]) return map[x]; return x;
  };
  const fromLevel = s => (s ? norm(String(s).split('(')[0].trim()) : '');
  const raw = (isd.staff.org_chart || []).filter(x => norm(x.group || fromLevel(x.level)) === g || (x.group || '') === g);
  const seen = new Set();
  return raw.filter(x => { const k = (x.title || '') + '|' + (x.names || '') + '|' + (x.level || ''); if (seen.has(k)) return false; seen.add(k); return true; }).length;
}
for (const g of ['顧問團','主席及執行副主席','秘書處','會操及典禮組','主題節目組','品牌推廣組','嘉賓接待組','協調組','服務及發展組','行政組']) {
  ok(homePosts[g] === expectedDetailPosts(g), '⑤ ' + g + ' 主頁崗位數(' + homePosts[g] + ') 應等於卡片內崗位數(' + expectedDetailPosts(g) + ')');
}

/* ---------- ② 返回＝返回上一頁（申請中心 → 子頁 → 返回回申請中心） ---------- */
vm.runInContext(`
  (function(){
    const a = globalThis.__app;
    a.renderModuleContent = () => {};
    a.updateBottomNav = () => {};
    // 與真實行為一致：顯示儀表板（隱藏 module）
    a.showDashboard = () => { document.getElementById('view-module').classList.add('hidden'); document.getElementById('view-dashboard').classList.remove('hidden'); };
  })()
`, context);
// 用 vm 內的真實 view 元素狀態走流程（el mock 已建立）
const backNav = vm.runInContext(`
  (function(){
    const a = globalThis.__app;
    const vis = id => { const e = document.getElementById('view-' + id); return e && !e.classList.contains('hidden'); };
    // 起始：儀表板可見（landing/module 隱藏，與真實 showDashboard 一致）
    document.getElementById('view-landing').classList.add('hidden');
    document.getElementById('view-dashboard').classList.remove('hidden');
    document.getElementById('view-module').classList.add('hidden');
    a.navHistory = [];
    a.openModule('apply_hub');
    const afterHub = { module: a.currentModule, hist: a.navHistory.slice(), moduleVisible: vis('module') };
    a.openModule('supplies');
    const afterSupplies = { module: a.currentModule, hist: a.navHistory.slice(), moduleVisible: vis('module') };
    a.backToDashboard();
    const afterBack = { module: a.currentModule, hist: a.navHistory.slice(), moduleVisible: vis('module') };
    a.backToDashboard();
    const afterBack2 = { dashboardVisible: vis('dashboard'), moduleVisible: vis('module'), hist: a.navHistory.slice() };
    // 重複進入同一頁不重疊入棧
    a.openModule('apply_hub'); const len1 = a.navHistory.length;
    a.openModule('apply_hub'); const len2 = a.navHistory.length;
    return { afterHub, afterSupplies, afterBack, afterBack2, len1, len2 };
  })()
`, context);
ok(backNav.afterHub.module === 'apply_hub' && backNav.afterHub.moduleVisible, '② 進入申請中心（視圖切換正常）');
ok(backNav.afterHub.hist[backNav.afterHub.hist.length - 1].view === 'dashboard', '② 申請中心的上頁應為儀表板');
ok(backNav.afterSupplies.hist[backNav.afterSupplies.hist.length - 1].view === 'module' && backNav.afterSupplies.hist[backNav.afterSupplies.hist.length - 1].module === 'apply_hub',
  '② 由申請中心進入物資申請：上頁應為申請中心（不是主控台）');
ok(backNav.afterBack.module === 'apply_hub' && backNav.afterBack.moduleVisible, '② 按「返回」應回到申請中心');
ok(backNav.afterBack2.dashboardVisible && !backNav.afterBack2.moduleVisible, '② 再按「返回」才回到儀表板');
ok(backNav.len1 === backNav.len2, '② 重複進入同一頁不應重疊入棧');

/* ---------- ⑥ 預算：原生 Google 試算表 → 各組預算格 ---------- */
ok(isd.finance.budget_source.sheet_id === '1cvLzydr4SUWXxUa-QJ_nMqZiqhTd7myZoleITd7zWBE', '⑥ budget_source 應指向新建原生 Google 試算表');
ok(isd.finance.budget_source.kind === 'budget_grid', '⑥ budget_source.kind 應為 budget_grid（合併儲存格格式）');

// 實測試算表 1cvLzydr... 的真實格線（2026-08-27 抓取）
const budgetRows = [
  ['香港童軍總會~港島地域 港島童軍繽紛日 2026 財務預算 收入','','','預算','','ISD 2025實際支出 HK$','ISD 2025預算 HK$'],
  ['','繽紛日參加者費用@$10','','10,000','','10,390.00','$15,000'],
  ['','旅團代訂餐費@$60','','-','','12,705.00','-'],
  ['','港島地域童軍基金撥款','','260,000','','243,122.59','$260,000'],
  ['','比賽報名費','','','','600.00','$1,400'],
  ['','童軍攝影暨多媒體創作專章工作坊@$65','','','','2,795.00',''],
  ['','總收入','','270,000','','269,612.59','$275,000'],
  ['支出','','','','','',''],
  ['會操及典禮組','','','','','',''],
  ['','嘉賓紀念品','','500.00','','246.00','500'],
  ['','','','','','','500'],
  ['主題節目組','','','','','',''],
  ['','節目／攤位遊戲','','18,000','','13,872.53','26,000'],
  ['','遊戲卡','','4,000','','3,028.97','4,000'],
  ['','遊戲獎品','','5,000','','2,800.00','5,000'],
  ['','樂隊車費','','2,000','','-','2,000'],
  ['','雜項','','250','','-','750'],
  ['','積極公民獎章系列工作坊（VS&RS）','','1,000','','-','1,000'],
  ['','積極公民獎章及證書（CS&SC）','','4,200','','4,158.00','4,200'],
  ['','','','','','','42,950'],
  ['成員參與姐','','','','','',''],
  ['','比賽獎盃(快樂傘及團呼）','','','','2,820.00','4,500'],
  ['','支部比賽','','','','-','2,000'],
  ['','支部工作坊','','','','2,637.00','1,000'],
  ['','比賽及成員參與紀念章','','','','2,640.00','1,000'],
  ['','','','','','','8,500'],
  ['品牌推廣組','','','','','',''],
  ['','雜項','','500','','-','-'],
  ['嘉賓接待組','','','','','',''],
  ['','嘉賓輕食','','','','6,000.00','2,000'],
  ['','嘉賓午膳120@$95','','11,400','','-','-'],
  ['','嘉賓穿梭巴士 x1','','2,000','','145.40','1,600'],
  ['','','','','','','3,600'],
  ['協調組','','','','','',''],
  ['','場地佈置及音響','','130,000','','122,900.00','130,000'],
  ['','旅團代訂餐盒','','-','','12,705.00','-'],
  ['','工作人員膳食300@$60','','18,000','','29,408.90','20,000'],
  ['','工作人員蒸餾水','','500','','228.00','400'],
  ['','衛生服務','','22,000','','21,700.00','16,000'],
  ['','救傷服務','','','','1,200.00','-'],
  ['','運輸及物資','','12,000','','10,887.90','10,000'],
  ['','物資購置','','5,000','','10,784.80','4,500'],
  ['','','','','','','180,900'],
  ['服務及發展組','','','','','',''],
  ['','捐贈紀念章','','1,500','','1,500.00','1,500'],
  ['','捐贈物品運輸費','','1,800','','1,800.00','2,000'],
  ['','NGO 車費 x2','','4,000','','4,300.00','6,000'],
  ['','NGO 午餐100@$60','','6,000','','4,730.00','10,000'],
  ['','相架及證書','','-','','-','500'],
  ['','NGO 長者褔袋','','','','775.00','1,000'],
  ['','','','','','','21,000'],
  ['行政組','','','','','',''],
  ['','大會紀念章','','10,000','','5,000.00','10,000'],
  ['','文具','','450','','-','450'],
  ['','會議場租','','1,000','','220.00','1,000'],
  ['','雜項','','1,000','','32.46','1,000'],
  ['','','','','','','12,450'],
  ['可持續發展組','','','','','',''],
  ['','Survey 紀念品','','','','3,092.63','2,800.00'],
  ['','','','','','','2,800.00'],
  ['備用支出 (3%)','','','7,900','3.0%','','$3,700'],
  ['','總支出','','270,000','','269,612.59','$276,400'],
  ['剩餘 （超支）','','-','','(0.00)','(1,400.00)']
];
vm.runInContext('globalThis.__budgetRows = ' + JSON.stringify(budgetRows) + ';', context);
const budget = vm.runInContext(`
  (function(){
    const gb = globalThis.__app.parseBudgetGrid(globalThis.__budgetRows);
    const by = {};
    gb.forEach(g => { by[g.group_name] = g.items; });
    return { groups: Object.keys(by).length, by };
  })()
`, context);
const gsum = name => budget.by[name].reduce((s, i) => s + i.budget, 0);
ok(budget.by['會操及典禮組'] && budget.by['會操及典禮組'].length === 1 && gsum('會操及典禮組') === 500, '⑥ 會操及典禮組 1 項 $500');
ok(budget.by['主題節目組'].length === 7 && gsum('主題節目組') === 34450, '⑥ 主題節目組 7 項 總 $34,450');
ok(budget.by['協調組'].length === 8 && gsum('協調組') === 187500, '⑥ 協調組 8 項 總 $187,500');
ok(budget.by['服務及發展組'].length === 6 && gsum('服務及發展組') === 13300, '⑥ 服務及發展組 6 項 總 $13,300');
ok(budget.by['行政組'].length === 4 && gsum('行政組') === 12450, '⑥ 行政組 4 項 總 $12,450');
ok(budget.by['品牌推廣組'].length === 1 && gsum('品牌推廣組') === 500, '⑥ 品牌推廣組 1 項 $500');
ok(budget.by['嘉賓接待組'].length === 3 && gsum('嘉賓接待組') === 13400, '⑥ 嘉賓接待組 3 項 總 $13,400');
ok(budget.by['收入'].length === 5 && gsum('收入') === 270000, '⑥ 收入 5 項 總 $270,000');
// 非 2026 架構組別：獨立成組，唔好錯混入上一組（主題節目組）
ok(budget.by['成員參與姐'] && budget.by['成員參與姐'].length === 4, '⑥ 「成員參與姐」4 項應獨立成組（唔好混入主題節目組）');
ok(budget.by['可持續發展組'] && budget.by['可持續發展組'].length === 1, '⑥ 「可持續發展組」1 項應獨立成組');
// 合計行唔好變成項目
const allItems = Object.values(budget.by).flat().map(i => i.item_name);
ok(!allItems.some(x => /^(總收入|總支出|剩餘|備用支出)/.test(x)), '⑥ 合計行（總收入/總支出/剩餘/備用支出）不應成為預算項目');
// 2025 參考數字入備註
const game = budget.by['主題節目組'].find(i => i.item_name === '節目／攤位遊戲');
ok(game && game.notes.includes('ISD2025實際: 13,872.53'), '⑥ 項目備註應帶 ISD2025 實際數');

/* ---------- ④ 行政組／協調組專屬模組（臨時版保持）亦要有 前往申請中心＋我的監察 ---------- */
const coordBtns = vm.runInContext(`
  (function(){
    const a = globalThis.__app;
    delete a.renderModuleContent; // 還原真 dispatch，實測兩個專屬模組
    a.getSuppliesData = () => ({ inventory: [], requests: [], booth_requests: [], vehicle_passes: [] });
    a.getMealsData = () => ({ menus: [], orders: [] });
    a.canApproveArea = () => false;
    a.canExecuteArea = () => false;
    a.getCoordinatorGroupData = () => ({ docs: [] });
    a.currentUser = { role: 'chairperson', name: '朱家聰', user_id: '朱家聰', group_name: '主席及執行副主席' };
    a.openModule('coordinator_group');
    const h1 = document.getElementById('module-content').innerHTML;
    const intro1 = h1.indexOf('協調組管理中心');
    const apply1 = h1.indexOf('前往申請中心提交申請');
    const mon1 = h1.indexOf('我的監察');
    const tabs1 = h1.indexOf('border-b pb-3 overflow-x-auto');
    const out1 = { hasApply: h1.includes("app.openModule('apply_hub')"), hasMonitor: h1.includes("app.openModule('my_monitor')"),
      underIntro: intro1 < apply1 && apply1 < tabs1 && apply1 < mon1 && mon1 < tabs1 };
    // 行政組
    a.getAdminGroupData = () => ({ docs: [], tickets: [] });
    a.canUploadDocument = () => false;
    a.isAdmin = () => true;
    a.getParticipantsData = () => [];
    a.getFinanceData = () => ({ group_itemized_budgets: [], income: [], expenses: [], budget_source: null });
    a.eventData['participants_source'] = null;
    a.openModule('admin_group');
    const h2 = document.getElementById('module-content').innerHTML;
    const intro2 = h2.indexOf('行政組 (完全取代舊手冊行政組頁面)');
    const apply2 = h2.indexOf('前往申請中心提交申請');
    const mon2 = h2.indexOf('我的監察');
    const fin2 = h2.indexOf('財務管理（行政組轄下）');
    return { out1, out2: { hasApply: h2.includes("app.openModule('apply_hub')"), hasMonitor: h2.includes("app.openModule('my_monitor')"),
      underIntro: intro2 < apply2 && apply2 < fin2 && apply2 < mon2 && mon2 < fin2 } };
  })()
`, context);
ok(coordBtns.out1.hasApply && coordBtns.out1.hasMonitor, '④ 協調組模組應有 前往申請中心＋我的監察 掣');
ok(coordBtns.out1.underIntro, '④ 協調組兩個掣應放喺組別介紹下（分頁之前）');
ok(coordBtns.out2.hasApply && coordBtns.out2.hasMonitor, '④ 行政組模組應有 前往申請中心＋我的監察 掣');
ok(coordBtns.out2.underIntro, '④ 行政組兩個掣應放喺組別介紹下（財務區之前）');

console.log('V84_GROUP_CARDS_BACK_BUDGET_OK (' + n + ' checks)');
