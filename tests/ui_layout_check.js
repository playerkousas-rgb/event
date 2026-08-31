#!/usr/bin/env node
'use strict';
/* 驗證新排版：公開資料先 → 其他組別及工作卡片（會議卡片最前）；我的監察併入頂部活動資訊橫幅（dash-hero-monitor，身份卡片不再佔位）；
   活動橫幅精簡：只留 日期/時間/地點/天氣 + 活動簡介 + 最新消息（大標題/進行中 badge/身份 badge/選擇其他活動掣已刪）；
   我的監察頁：無權限人士只看到身份＋未有紀錄＋前往申請中心；有權限人士看到可點擊的總申請/待處理/已批核/已拒絕 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// 依 <script> 標籤順序載入：本機 js/ 檔讀檔案內容，無 src 的 inline 直接取內文（CDN 外部檔跳過）
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map(match => {
    const attrs = match[1] || '';
    if (/src=/i.test(attrs)) {
      const src = ((attrs.match(/src="([^"]+)"/) || [])[1] || '').split('?')[0];
      return src.startsWith('js/') ? fs.readFileSync(path.join(root, src), 'utf8') : '';
    }
    return match[2];
  })
  .join('\n');
const core = scripts.replace(
  /const app=window\.app=new ScoutEventApp\(\);\s*[\s\S]*$/,
  ''
) + '\nglobalThis.TestApp=ScoutEventApp;';

// 記錄各 element 的 innerHTML / textContent
const store = new Map();
function makeEl(id) {
  if (!store.has(id)) {
    const clsSet = new Set();
    store.set(id, {
      id, classList: {
        _set: clsSet,
        add(...c) { c.forEach(x => clsSet.add(x)); },
        remove(...c) { c.forEach(x => clsSet.delete(x)); },
        toggle(c, on) { if (on === undefined) on = !clsSet.has(c); on ? clsSet.add(c) : clsSet.delete(c); },
        contains(c) { return clsSet.has(c); }
      },
      style: {}, textContent: '', innerHTML: '', value: '',
      addEventListener() {}, querySelectorAll() { return []; }
    });
  }
  return store.get(id);
}
const localStorage = {
  getItem: k => store.has('ls:' + k) ? store.get('ls:' + k) : null,
  setItem: (k, v) => store.set('ls:' + k, String(v)),
  removeItem: k => store.delete('ls:' + k)
};
const document = {
  getElementById: id => makeEl(id),
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: () => makeEl('_new'),
  body: { appendChild() {} }
};
const context = {
  console, localStorage, document, window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; } }, Blob: function Blob() {},
  FileReader: function FileReader() {}, setTimeout() {}, clearTimeout() {},
  fetch: async () => ({ ok: true, json: async () => ({ success: true, data: [] }) }),
  confirm: () => true, alert() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(core, context);

const App = context.TestApp;
const app = Object.create(App.prototype);
Object.assign(app, {
  currentEvent: { event_id: 'mock_demo', event_name: '模擬示範版', category: 'demo' },
  currentUser: null,
  eventData: {}, usersList: [], approvalPerms: [], currentModule: 'my_monitor',
  gasUrl: '', apiKey: 'k', pendingChanges: [], meetingsCache: [], tempFiles: {},
  systemConfig: {}, _catSel: {}
});
// 簡化資料依賴：只測 UI 分支邏輯
app.collectApplications = () => [];
app.monitorScope = () => ({ level: 'self', groups: [] });
app.getEventGroups = () => ['主題節目組', '行政組', '協調組', '會操及典禮組', '顧問團', '主席及執行副主席', '秘書處', '品牌推廣組', '嘉賓接待組', '服務及發展組'];
app.groupMeta = (g) => ({ cls: 'bg-slate-100', icon: 'fa-solid fa-users' });
app.canApproveArea = () => false;
app.canExecuteArea = () => false;
app.isAdmin = () => false;
app.isExecViceOrChair = () => false;
app.isSuperAdmin = () => false;
app.isDemoEvent = () => true;
app.checkAndShowNotifications = () => {};
app.renderGroupQuickAccess = () => {};
app.loadEventData = async () => {};
app.loadUsers = async () => {};
app.loadApprovalPermissions = async () => {};
app.loadApprovalRouting = async () => {};
app.autoSyncDriveSources = () => {};
app.loadHkoWeather = () => {};
app.updateSaveBar = () => {};
app.applyBannerConfig = () => {};
app.handleHashRoute = () => {};
app.updateBottomNav = () => {};

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function htmlOf(id) { return store.get(id) ? store.get(id).innerHTML : ''; }

/* ---------- 1. 未登入：公開資料 + 登入後解鎖 ---------- */
app.currentUser = null;
app.renderRoleCards();
let pub = htmlOf('public-cards-grid');
assert(pub.includes('公告及溝通') && pub.includes('執行手冊') && pub.includes('申請中心') && pub.includes('童心捐贈大行動'),
  'guest 公開資料應含 4 張公開卡');
assert(htmlOf('identity-cards-grid') === '', 'guest 其他卡片應為空（登入後解鎖）');
// 未登入：身份卡片應顯示（訪客只見到公開資料，位置多）
assert(!makeEl('identity-card').classList.contains('hidden'), '未登入身份卡片應顯示');
let mon = htmlOf('dash-hero-monitor');
assert(mon.includes('我的監察') && mon.includes('登入後顯示'), 'guest 活動橫幅應顯示我的監察登入提示');

/* ---------- 2. 普通工作人員（無批核權限） ---------- */
app.currentUser = { role: 'staff', name: '陳子明', user_id: '陳子明', group_name: '主題節目組', job_title: '工作人員' };
app.renderRoleCards();
// 登入後：身份卡片隱藏（身份已喺最頂 BAR 右上角，登入後卡片變多）
assert(makeEl('identity-card').classList.contains('hidden'), '登入後身份卡片應隱藏');
pub = htmlOf('public-cards-grid');
assert(pub.includes('公告及溝通'), '登入後公開資料仍最先顯示');
assert(!pub.includes('dash-desc') && !pub.includes('<p class="dash-desc'), '卡片不應再顯示詳細介紹（只留名稱）');
const ids = htmlOf('identity-cards-grid');
// v8.4 起：工作卡片只餘功能卡（會議卡片最前）；組別卡片已移至「部門管理中心」(group-quick-access)
assert(ids.includes('會議卡片'), '工作卡片應含會議卡片');
const idxMeeting = ids.indexOf('會議卡片');
const idxOtherWork = ids.indexOf('物資申請');
assert(idxMeeting !== -1 && (idxOtherWork === -1 || idxMeeting < idxOtherWork), '會議卡片應在其餘工作卡片之前');
assert(!ids.includes('主題節目組'), '組別卡片應已移至部門管理中心，不在工作卡片格線');

mon = htmlOf('dash-hero-monitor');
assert(mon.includes('總申請') || mon.includes('你暫時未有申請紀錄'), '活動橫幅我的監察區塊應有內容');
assert(mon.includes('申請中心'), '無權限人士活動橫幅應提供前往申請中心');

// 我的監察頁：無權限人士只看到身份 + 未有紀錄 + 前往申請中心按鈕
app.renderMyMonitorModule();
let monPage = htmlOf('module-content');
assert(monPage.includes('陳子明'), '我的監察頁應顯示自己身份');
assert(monPage.includes('你暫時未有申請紀錄，可到「申請中心」提交'), '我的監察頁應有未有紀錄提示');
assert(monPage.includes("app.openModule('apply_hub')"), '我的監察頁應有前往申請中心按鈕');
assert(!monPage.includes('總申請'), '無權限人士不應看到總申請統計');

/* ---------- 3. 有權限人士（主席：可看全部、可批核） ---------- */
app.currentUser = { role: 'chairperson', name: '朱家聰', user_id: '朱家聰', group_name: '主席及執行副主席', job_title: '主席' };
app.monitorScope = () => ({ level: 'all', groups: [] });
app.canApproveArea = () => true;
app.renderRoleCards();
mon = htmlOf('dash-hero-monitor');
assert(mon.includes('總申請') && mon.includes('待處理') && mon.includes('已批核') && mon.includes('已拒絕'),
  '有權限人士活動橫幅應見 總申請/待處理/已批核/已拒絕');
assert(mon.includes("app.switchTopTab('approvals')"), '活動橫幅數字應可點擊跳轉批核中心');

app.renderMyMonitorModule();
monPage = htmlOf('module-content');
assert(monPage.includes('總申請') && monPage.includes('待處理') && monPage.includes('已批核') && monPage.includes('已拒絕'),
  '有權限人士我的監察頁應見 總申請/待處理/已批核/已拒絕');
assert(monPage.includes("app.switchTopTab('approvals')"), '我的監察頁數字應跳轉批核中心');
assert(htmlOf('module-actions').includes('前往批核中心處理'), '我的監察頁應有前往批核中心按鈕');
// 我的監察橫幅不再寫身份（身份已喺最頂 BAR 右上角），只保留「範圍」標籤
assert(!mon.includes('朱家聰') && !mon.includes('主席'), '活動橫幅我的監察不應再寫身份（身份已喺最頂 BAR 右上角）');
assert(mon.includes('範圍：'), '活動橫幅我的監察應保留範圍標籤');

/* ---------- 4. 排序：公開資料 section 在 其他組別及工作卡片 section 之前（靜態 HTML 順序） ---------- */
// 舊版 #full-dashboard-sections（認識活動/參與活動/協作與管理 彩色分組）已刪除，改以 部門管理中心 為切片終點
assert(!html.includes('id="full-dashboard-sections"'), '舊版 full-dashboard-sections（認識活動/參與活動彩色分組）應已刪除');
const dashHtml = html.slice(html.indexOf('id="simple-card-panel"'), html.indexOf('id="group-management-section"'));
const pubIdx = dashHtml.indexOf('id="public-section"');
const idIdx = dashHtml.indexOf('id="identity-section"');
const mgmtIdx = dashHtml.indexOf('id="management-tools-section"');
assert(pubIdx !== -1 && idIdx !== -1 && pubIdx < idIdx && idIdx < mgmtIdx,
  '靜態 HTML：公開資料 → 其他組別及工作卡片 → 管理工具 順序錯誤');

/* ---------- 4b. 活動資訊橫幅精簡：只留 日期/時間/地點/天氣 + 簡介 + 最新消息 + 我的監察 ---------- */
assert(!html.includes('id="dash-event-title"') && !html.includes('id="dash-status-badge"') && !html.includes('id="dash-role-display"'), '活動橫幅精簡：大標題／進行中 badge／身份 badge 已刪（活動名稱喺最頂 BAR 標題列）');
assert(html.includes('id="dash-event-dates"') && html.includes('id="dash-event-time"') && html.includes('id="dash-event-location"') && html.includes('id="dash-event-weather"'), '活動橫幅應保留 日期/時間/地點/天氣');
assert(html.includes('id="dash-event-desc"') && html.includes('id="dash-news-box"') && html.includes('id="dash-event-news"'), '活動橫幅應保留 活動簡介＋最新消息');
assert(html.includes('id="dash-hero-monitor"'), '活動橫幅應有我的監察併入位 (dash-hero-monitor)');
// 功能介紹按鈕已移入紫色活動資訊橫幅右上角；身份卡片只喺未登入（訪客）時顯示，登入後隱藏
const dashHero = html.slice(html.indexOf('id="view-dashboard"'), html.indexOf('id="simple-card-panel"'));
assert(dashHero.includes('功能介紹') && dashHero.includes("app.openGuideModal()"), '活動資訊橫幅應有 功能介紹 按鈕（右上角）');
assert(html.includes('id="identity-card"') && html.includes('id="identity-name"') && html.includes('id="identity-login-btn"'), '身份卡片應存在（未登入訪客顯示）');
assert(html.includes('選擇活動後即可查看該活動全部資料') && !html.includes('選擇其他活動'), '橫幅「選擇其他活動」掣已刪（按最頂 BAR 標題回選擇活動頁）');

/* ---------- 5. 最頂 BAR（標題列）及底部導覽列 ---------- */
const headerHtml = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
// 最頂 BAR＝標題列本身：身份・改密碼・登出（未登入顯示登入）；我的監察／介紹已寫入身份卡片，不再佔用頂部
assert(headerHtml.includes('身份') && headerHtml.includes('改密碼')
  && headerHtml.includes('登出') && headerHtml.includes('登入'), '最頂 BAR 標題列應有 身份/改密碼/登出（未登入顯示登入）');
assert(!headerHtml.includes('我的監察') && !headerHtml.includes('介紹'), '最頂 BAR 不應再有 我的監察/介紹（已寫入身份卡片）');
// 手機三畫功能鍵及側欄選單已刪除
assert(!headerHtml.includes('fa-bars'), '不應有手機三畫功能鍵');
assert(!html.includes('id="mobile-drawer"') && !html.includes('toggleDrawer'), '側欄功能選單（drawer）已刪除');
// 執行手冊・申請中心・批核中心・開戶 只集中在底部導覽列（頂部重覆 BAR 已刪）
assert(!html.includes('id="top-tabs-wrap"'), '頂部重覆的 執行手冊/申請中心/批核中心/開戶 BAR 已刪（集中在底部導覽列）');
assert(!headerHtml.includes('overflow-x-auto'), '頂部 BAR 不應左右滑動 (無 overflow-x-auto)');
assert(html.includes('html,body{overflow-x:clip}'), '全站應防左右滑動 (overflow-x:clip)');
// 手機：長方形卡片開成 2 個正方形（兩欄）
const mqStart = html.indexOf('@media(max-width:768px)');
const mq = html.slice(mqStart, html.indexOf('}\n</style>') > mqStart ? html.indexOf('}\n</style>') : mqStart+4000);
assert(mq.includes('.dash-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important'), '手機儀表板卡片應兩欄正方形');
assert(mq.includes('#group-quick-access{grid-template-columns:repeat(2,minmax(0,1fr))!important') && mq.includes('#events-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important'), '部門管理中心及首頁活動卡手機應兩欄正方形');
const navHtml = html.slice(html.indexOf('<nav id="bottom-nav"'), html.indexOf('</nav>'));
assert(navHtml.includes('執行手冊') && navHtml.includes('申請中心') && navHtml.includes('批核中心') && navHtml.includes('部門中心') && !navHtml.includes('開戶'),
  '底部導覽應有 執行手冊/申請中心/批核中心/部門中心（開戶已移去最頂 BAR）');
assert(!navHtml.includes('md:hidden'), '底部導覽列應手機／電腦同步顯示（不再只限手機）');
// 開戶掣移去最頂 BAR（身份 badge 旁，登入後總主任以上可見，一按跳入開戶頁）
assert(html.includes('id="topbar-account-setup"'), '最頂 BAR 應有開戶掣 (topbar-account-setup)');
assert(headerHtml.includes("topbar-account-setup") && headerHtml.includes("app.openModule('account_setup')"), '最頂 BAR 開戶掣應跳入開戶頁 (account_setup)');
// 部門中心：一按即見（執副以上＝全部部門列表；普通人＝直接入自己部門）
assert(core.includes("dept_hub:'部門管理中心'") && core.includes('renderDeptHubModule') && core.includes('openDeptHub'),
  '應有 dept_hub 模組（部門中心列表頁）及 openDeptHub 入口');

/* ---------- 6. updateAdminNav：登入後只顯示登出，批核中心／開戶僅有權限人士可見 ---------- */
function styleOf(id) { return store.get(id) ? store.get(id).style.display : 'MISSING'; }
app.currentUser = { role: 'staff', name: '陳子明', user_id: '陳子明', group_name: '主題節目組' };
app.updateAdminNav();
assert(styleOf('login-toggle-btn') === 'none', '登入後最頂 BAR 不應顯示登入');
assert(styleOf('logout-btn') === '', '登入後最頂 BAR 應顯示登出');
assert(styleOf('topbar-changepwd') === '', '登入後最頂 BAR 應顯示改密碼');
assert(styleOf('bn-approvals') === 'none', '工作人員不應見底部批核中心');
assert(styleOf('bn-dept') === '', '工作人員（登入）應見底部部門中心（一按直接入自己部門）');
assert(styleOf('topbar-account-setup') === 'none', '工作人員不應見最頂 BAR 開戶');
assert(styleOf('bn-exec') !== 'none' && styleOf('bn-apply') !== 'none', '執行手冊／申請中心人人可用');

app.currentUser = { role: 'general_director', name: '蘇國樑', user_id: '蘇國樑', group_name: '主題節目組' };
app.updateAdminNav();
assert(styleOf('bn-approvals') === '', '總主任應見底部批核中心');
assert(styleOf('bn-dept') === '', '總主任應見底部部門中心（一按見全部部門列表）');
assert(styleOf('topbar-account-setup') === '', '總主任應見最頂 BAR 開戶');

app.currentUser = null;
app.updateAdminNav();
assert(styleOf('login-toggle-btn') === '', '未登入最頂 BAR 應顯示登入');
assert(styleOf('logout-btn') === 'none', '未登入最頂 BAR 不應顯示登出');
assert(styleOf('topbar-changepwd') === 'none', '未登入不應顯示改密碼');
assert(styleOf('bn-approvals') === 'none', '未登入不應見底部批核中心');
assert(styleOf('bn-dept') === 'none', '未登入不應見底部部門中心');
assert(styleOf('topbar-account-setup') === 'none', '未登入不應見最頂 BAR 開戶');

/* ---------- 6b. openDeptHub：執副以上＝全部部門列表；普通人＝一按直接入自己部門 ---------- */
const deptCalls=[];
app.openGroupManagement=(g)=>deptCalls.push(['group',g]);
app.openModule=(k)=>deptCalls.push(['module',k]);
app.openLoginModal=()=>deptCalls.push(['login']);
app.isExecViceOrChair=()=>['super_admin','admin','chairperson','advisor','executive_vice_chairperson'].includes(app.currentUser?.role);
app.currentUser = { role: 'staff', name: '陳子明', user_id: '陳子明', group_name: '主題節目組' };
app.openDeptHub();
assert(JSON.stringify(deptCalls).includes('["group","主題節目組"]'), '普通人一按部門中心應直接跳自己部門（唔見列表）');
deptCalls.length=0;
app.currentUser = { role: 'executive_vice_chairperson', name: '羅雅雯', user_id: '羅雅雯', group_name: '主席及執行副主席' };
app.openDeptHub();
assert(JSON.stringify(deptCalls).includes('["module","dept_hub"]'), '執副以上一按部門中心應見全部部門列表');
deptCalls.length=0;
app.currentUser = null;
app.openDeptHub();
assert(JSON.stringify(deptCalls).includes('["login"]'), '未登入按部門中心應彈登入');
// dept_hub 列表頁實跑：應見到各部門卡（同儀表板部門管理中心同一份卡）
delete app.openGroupManagement; delete app.openModule; delete app.openLoginModal;
app.isExecViceOrChair=()=>false;
app.currentUser = { role: 'chairperson', name: '朱家聰', user_id: '朱家聰', group_name: '主席及執行副主席' };
app.getGroupOrgNodes=()=>[];
app.groupApplyStats=()=>({requests:[],boothReqs:[],vehicles:[],orders:[],supPending:0,boothPending:0,vehPending:0,mealPending:0});
app.openModule('dept_hub');
const hub = htmlOf('module-content');
assert(hub.includes('主題節目組') && hub.includes('行政組') && hub.includes('協調組') && hub.includes('服務及發展組'),
  '部門中心列表頁應見到各部門卡');
assert(hub.includes('app.openGroupManagement'), '部門中心列表卡應可點擊進入部門管理');
delete app.getGroupOrgNodes; delete app.groupApplyStats;

/* ---------- 7. 全部卡片白底無顏色；頁尾精簡；有批核權＋自己有申請的身份卡顯示 ---------- */
app.currentUser = { role: 'staff', name: '陳子明', user_id: '陳子明', group_name: '主題節目組' };
app.renderRoleCards();
pub = htmlOf('public-cards-grid');
assert(!pub.includes('bg-gradient') && pub.includes('bg-white border shadow-sm'), '公開資料卡片應全部白底無顏色');
assert(!htmlOf('identity-cards-grid').includes('bg-gradient'), '功能／組別卡片應全部白底無顏色');
assert(!htmlOf('management-tools-grid').includes('bg-gradient'), '管理工具卡片應全部白底無顏色');

// 頁尾精簡（刪走 v7.7 及長功能描述）
const footerHtml = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
assert(!footerHtml.includes('v7.7') && !footerHtml.includes('協調組管理中心'), '頁尾不應再有 v7.7 及長功能描述');

// 有批核權＋自己亦有申請：身份卡片四個數字（自己＋下級合計）之外，另有「我的申請」一行只計自己
app.currentUser = { role: 'general_director', name: '蘇國樑', user_id: '蘇國樑', group_name: '主題節目組' };
app.monitorScope = () => ({ level: 'group', groups: ['主題節目組'] });
app.canApproveArea = () => true;
app.collectApplications = () => [
  { type:'supplies', typeLabel:'物資', icon:'fa-solid fa-boxes-stacked', color:'text-blue-600', person:'蘇國樑', person_id:'蘇國樑', group:'主題節目組', title:'膠尺 × 10', sub:'', status:'待批核', color_name:'amber', who:'', date:'' },
  { type:'meals', typeLabel:'膳食', icon:'fa-solid fa-utensils', color:'text-purple-600', person:'陳大文', person_id:'陳大文', group:'主題節目組', title:'午宴 · 白飯', sub:'', status:'待批核', color_name:'amber', who:'', date:'' }
];
app.renderRoleCards();
mon = htmlOf('dash-hero-monitor');
assert(mon.includes('總申請') && mon.includes('待處理') && mon.includes("app.switchTopTab('approvals')"), '有權限人士活動橫幅應見可跳轉批核中心的數字');
assert(mon.includes('我的申請') && mon.includes("app.openModule('my_monitor')"), '有批核權同時自己有申請：活動橫幅應有「我的申請」一行（跳轉我的監察）');
assert(!html.includes('id="identity-monitor"'), '我的監察已併入活動橫幅，身份卡片不應再有 identity-monitor');

// 我的監察頁：有權限人士「我自己」未有紀錄時，也應有「前往申請中心」跳轉按鈕
app.collectApplications = () => [];
app.renderMyMonitorModule();
monPage = htmlOf('module-content');
assert(monPage.includes('總申請'), '有權限人士我的監察頁應見統計');
assert(monPage.includes('你暫時未有申請紀錄') && monPage.includes("app.openModule('apply_hub')"), '有權限人士我自己未有紀錄時應有前往申請中心按鈕');

console.log('UI_LAYOUT_CHECK_OK');
