#!/usr/bin/env node
'use strict';
/* 驗證新排版：公開資料先 → 其他組別及工作卡片（會議卡片最前）；我的監察寫入身份卡片；
   我的監察頁：無權限人士只看到身份＋未有紀錄＋前往申請中心；有權限人士看到可點擊的總申請/待處理/已批核/已拒絕 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(match => !match[1].toLowerCase().includes('src='))
  .map(match => match[2])
  .join('\n');
const core = scripts.replace(
  /const app=window\.app=new ScoutEventApp\(\);\s*[\s\S]*$/,
  ''
) + '\nglobalThis.TestApp=ScoutEventApp;';

// 記錄各 element 的 innerHTML / textContent
const store = new Map();
function makeEl(id) {
  if (!store.has(id)) {
    store.set(id, {
      id, classList: { _set: new Set(), add() {}, remove() {}, toggle() {}, contains() { return false; } },
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
let mon = htmlOf('identity-monitor');
assert(mon.includes('我的監察') && mon.includes('登入後顯示'), 'guest 身份卡片應顯示我的監察登入提示');

/* ---------- 2. 普通工作人員（無批核權限） ---------- */
app.currentUser = { role: 'staff', name: '陳子明', user_id: '陳子明', group_name: '主題節目組', job_title: '工作人員' };
app.renderRoleCards();
pub = htmlOf('public-cards-grid');
assert(pub.includes('公告及溝通'), '登入後公開資料仍最先顯示');
assert(!pub.includes('dash-desc') && !pub.includes('<p class="dash-desc'), '卡片不應再顯示詳細介紹（只留名稱）');
const ids = htmlOf('identity-cards-grid');
// 會議卡片應在功能卡片最前（在所有 group 卡之前）
assert(ids.includes('會議卡片'), '其他組別及工作卡片應含會議卡片');
const idxMeeting = ids.indexOf('會議卡片');
const idxOwnGroup = ids.indexOf('主題節目組');
assert(idxMeeting !== -1 && idxOwnGroup !== -1 && idxMeeting < idxOwnGroup, '會議卡片應在組別卡片之前');
mon = htmlOf('identity-monitor');
assert(mon.includes('總申請') || mon.includes('你暫時未有申請紀錄'), '身份卡片我的監察區塊應有內容');
assert(mon.includes('申請中心'), '無權限人士身份卡應提供前往申請中心');

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
mon = htmlOf('identity-monitor');
assert(mon.includes('總申請') && mon.includes('待處理') && mon.includes('已批核') && mon.includes('已拒絕'),
  '有權限人士身份卡片應見 總申請/待處理/已批核/已拒絕');
assert(mon.includes("app.switchTopTab('approvals')"), '身份卡片數字應可點擊跳轉批核中心');

app.renderMyMonitorModule();
monPage = htmlOf('module-content');
assert(monPage.includes('總申請') && monPage.includes('待處理') && monPage.includes('已批核') && monPage.includes('已拒絕'),
  '有權限人士我的監察頁應見 總申請/待處理/已批核/已拒絕');
assert(monPage.includes("app.switchTopTab('approvals')"), '我的監察頁數字應跳轉批核中心');
assert(htmlOf('module-actions').includes('前往批核中心處理'), '我的監察頁應有前往批核中心按鈕');

/* ---------- 4. 排序：公開資料 section 在 其他組別及工作卡片 section 之前（靜態 HTML 順序） ---------- */
const dashHtml = html.slice(html.indexOf('id="simple-card-panel"'), html.indexOf('id="full-dashboard-sections"'));
const pubIdx = dashHtml.indexOf('id="public-section"');
const idIdx = dashHtml.indexOf('id="identity-section"');
const mgmtIdx = dashHtml.indexOf('id="management-tools-section"');
assert(pubIdx !== -1 && idIdx !== -1 && pubIdx < idIdx && idIdx < mgmtIdx,
  '靜態 HTML：公開資料 → 其他組別及工作卡片 → 管理工具 順序錯誤');

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
assert(navHtml.includes('執行手冊') && navHtml.includes('申請中心') && navHtml.includes('批核中心') && navHtml.includes('開戶'),
  '底部導覽應有 執行手冊/申請中心/批核中心/開戶');
assert(!navHtml.includes('md:hidden'), '底部導覽列應手機／電腦同步顯示（不再只限手機）');

/* ---------- 6. updateAdminNav：登入後只顯示登出，批核中心／開戶僅有權限人士可見 ---------- */
function styleOf(id) { return store.get(id) ? store.get(id).style.display : 'MISSING'; }
app.currentUser = { role: 'staff', name: '陳子明', user_id: '陳子明', group_name: '主題節目組' };
app.updateAdminNav();
assert(styleOf('login-toggle-btn') === 'none', '登入後最頂 BAR 不應顯示登入');
assert(styleOf('logout-btn') === '', '登入後最頂 BAR 應顯示登出');
assert(styleOf('topbar-changepwd') === '', '登入後最頂 BAR 應顯示改密碼');
assert(styleOf('bn-approvals') === 'none', '工作人員不應見底部批核中心');
assert(styleOf('bn-accounts') === 'none', '工作人員不應見底部開戶');
assert(styleOf('bn-exec') !== 'none' && styleOf('bn-apply') !== 'none', '執行手冊／申請中心人人可用');

app.currentUser = { role: 'general_director', name: '蘇國樑', user_id: '蘇國樑', group_name: '主題節目組' };
app.updateAdminNav();
assert(styleOf('bn-approvals') === '', '總主任應見底部批核中心');
assert(styleOf('bn-accounts') === '', '總主任應見底部開戶');

app.currentUser = null;
app.updateAdminNav();
assert(styleOf('login-toggle-btn') === '', '未登入最頂 BAR 應顯示登入');
assert(styleOf('logout-btn') === 'none', '未登入最頂 BAR 不應顯示登出');
assert(styleOf('topbar-changepwd') === 'none', '未登入不應顯示改密碼');
assert(styleOf('bn-approvals') === 'none', '未登入不應見底部批核中心');

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
mon = htmlOf('identity-monitor');
assert(mon.includes('總申請') && mon.includes('待處理') && mon.includes("app.switchTopTab('approvals')"), '有權限人士身份卡片應見可跳轉批核中心的數字');
assert(mon.includes('我的申請') && mon.includes("app.openModule('my_monitor')"), '有批核權同時自己有申請：身份卡應有「我的申請」一行（跳轉我的監察）');

// 我的監察頁：有權限人士「我自己」未有紀錄時，也應有「前往申請中心」跳轉按鈕
app.collectApplications = () => [];
app.renderMyMonitorModule();
monPage = htmlOf('module-content');
assert(monPage.includes('總申請'), '有權限人士我的監察頁應見統計');
assert(monPage.includes('你暫時未有申請紀錄') && monPage.includes("app.openModule('apply_hub')"), '有權限人士我自己未有紀錄時應有前往申請中心按鈕');

console.log('UI_LAYOUT_CHECK_OK');
