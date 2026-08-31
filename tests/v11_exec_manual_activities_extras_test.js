#!/usr/bin/env node
'use strict';
/* v11 回歸測試（2026-08-31，對應用戶六項要求）：
   ① 執行手冊 → 場地與活動總覽：原「攤位總表」改名「攤位列表」
   ② 「攤位總表」（2026 總表）移入「場地與活動總覽」
   ③ 「場地佈置總覽」移入「場地與活動總覽」
   ④ 新分頁「各類附加資料」＝箱頭紙＋許可證式樣＋失物認領；失物認領亦加入行政組，由行政組紀錄
   ⑤ 行政組部門中心加「紀念章派發（工作人員）」：TICK 人名＋備註（紀錄改名／替假）
   ⑥ 嘉賓接待組部門中心加「紀念章派發（嘉賓）」：TICK 人名、不可改名；由行政組及嘉賓接待組管理 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// 依 <script> 順序載入（本機 js/ 檔；CDN 跳過）
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
const core = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);\s*[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';

// 小型 DOM mock
const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = {
      id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '', files: [],
      dataset: {},
      addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; },
      getAttribute() { return null; }, closest() { return null; },
      classList: {
        add: c => e._cls.add(c), remove: c => e._cls.delete(c),
        toggle: (c, on) => { const want = on === undefined ? !e._cls.has(c) : !!on; want ? e._cls.add(c) : e._cls.delete(c); },
        contains: c => e._cls.has(c)
      }
    };
    elements[id] = e;
  }
  return elements[id];
}
const store = new Map();
const localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};
const context = {
  console, localStorage,
  document: {
    getElementById: el, querySelectorAll: () => [], addEventListener() {},
    createElement: () => el('_new'), body: { appendChild() {} }
  },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; } }, Blob: function Blob() {},
  FileReader: function FileReader() {}, setTimeout() {}, clearTimeout() {},
  fetch: async () => ({ ok: false, json: async () => ({}), text: async () => '' }),
  confirm: () => true, alert() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(core, context);

const App = context.TestApp;
const app = Object.create(App.prototype);
Object.assign(app, {
  currentEvent: { event_id: 'mock_demo', event_name: '模擬示範版', category: 'demo', start_date: '2026-10-04' },
  currentUser: null, eventData: {}, usersList: [], approvalPerms: [], gasUrl: '', apiKey: 'k',
  pendingChanges: [], meetingsCache: [], tempFiles: {}, systemConfig: {}, _catSel: {}
});
app.isDemoEvent = () => true;
app.isAdmin = () => app.currentUser ? (['admin', 'super_admin'].includes(app.currentUser.role) || !!app.currentUser.mock_admin) : false;
app.isExecViceOrChair = () => app.currentUser ? ['chairperson', 'executive_vice_chairperson', 'advisor'].includes(app.currentUser.role) : false;
app.isSuperAdmin = () => !!app.currentUser && app.currentUser.role === 'super_admin';
app.closeModal = () => {};
app.getMeetingsData = () => ({ meetings: [] });
app.pushNavHistory = () => {};
app.getStaffData = () => ({ org_chart: [], contacts: [], job_duties: [] });
app.getGroupOrgNodes = () => [];
app.groupApplyStats = () => ({ requests: [], vehicles: [], orders: [], boothReqs: [], supPending: 0, vehPending: 0, mealPending: 0, boothPending: 0 });
app.groupInfoBoxesHTML = () => '';
app.getFinanceData = () => ({ group_itemized_budgets: [] });
app.getMealsData = () => ({ menus: [], orders: [] });
app.getSuppliesData = () => ({ requests: [], booth_requests: [] });
app.canViewGroup = () => true;
app.canViewDonationsStats = () => false;

// 工作人員名單（紀念章派發用）：模擬活動前已有全人名
app.usersList = [
  { user_id: '陳子明', name: '陳子明', role: 'staff', group_name: '行政組', job_title: '工作人員', status: 'active' },
  { user_id: '李美玲', name: '李美玲', role: 'director', group_name: '行政組', job_title: '主任', status: 'active' },
  { user_id: '黃志強', name: '黃志強', role: 'staff', group_name: '嘉賓接待組', job_title: '工作人員', status: 'active' },
  { user_id: '張家輝', name: '張家輝', role: 'staff', group_name: '主題節目組', job_title: '工作人員', status: 'active' }
];

let n = 0;
function check(cond, msg) { assert(cond, msg); n++; }

/* ================= ① 場地與活動總覽：攤位總表 → 攤位列表 ================= */
app.activitiesSubTab = 'maps';
app.renderActivitiesModule(el('module-content'));
const actHTML = elements['module-content'].innerHTML;
check(actHTML.includes("switchActivitiesTab('booths')") && actHTML.includes('攤位列表 ('), '① 場地與活動總覽分頁名已改為「攤位列表」');
check(!/> 攤位總表 \(/.test(actHTML), '① 舊「攤位總表 (N)」分頁名已消失（改名為攤位列表）');
app.renderActivitiesBooths();
check(elements['activities-tab-booths'].innerHTML.includes('攤位列表 (共'), '① 攤位列表內容標題＝攤位列表');

/* ================= ②③ 攤位總表＋場地佈置總覽 移入場地與活動總覽 ================= */
check(actHTML.includes('activities-tab-booth_master'), '② 場地與活動總覽內有「攤位總表」分頁');
check(actHTML.includes('2026 攤位總表'), '② 攤位總表（2026 總表）內容已放入場地與活動總覽');
check(actHTML.includes('activities-tab-venue_setup'), '③ 場地與活動總覽內有「場地佈置總覽」分頁');
check(elements['activities-tab-venue_setup'].innerHTML.includes('場地佈置總覽'), '③ 場地佈置總覽（上傳式）已渲染於場地與活動總覽');
check(actHTML.includes('已聯絡') && actHTML.includes('TOTAL（全部分區總數）'), '② 攤位總表（含聯絡進度欄＋TOTAL 行）由 boothMasterPanelHTML() 內嵌於場地與活動總覽');

/* ================= 執行手冊分頁重整 ================= */
app.execManualSubTab = 'staff';
app.renderExecManualModule();
const emHTML = elements['module-content'].innerHTML;
check(emHTML.includes('各類附加資料'), '④ 執行手冊新增「各類附加資料」分頁');
check(!emHTML.includes("switchExecManualTab('booth_master')"), '② 執行手冊頂部已無獨立「攤位總表」分頁（已移入場地與活動總覽）');
check(!emHTML.includes("switchExecManualTab('venue_setup')"), '③ 執行手冊頂部已無獨立「場地佈置總覽」分頁');
check(!emHTML.includes("switchExecManualTab('box_label')") && !emHTML.includes("switchExecManualTab('permit')"), '④ 箱頭紙／許可證式樣已移入「各類附加資料」');
check(emHTML.includes("switchExecManualTab('activities')"), '② 執行手冊保留「場地與活動總覽」分頁');

// 舊連結（其他卡片嘅跳轉按鈕）自動轉去新位置
app.switchExecManualTab('booth_master');
check(app.execManualSubTab === 'activities' && app.activitiesSubTab === 'booth_master', '② 舊連結 switchExecManualTab(\'booth_master\') 自動轉去 場地與活動總覽 → 攤位總表');
check(elements['exec-manual-panel'].innerHTML.includes('2026 攤位總表'), '② 舊連結仍見到攤位總表內容');
app.switchExecManualTab('venue_setup');
check(app.execManualSubTab === 'activities' && app.activitiesSubTab === 'venue_setup', '③ 舊連結 venue_setup 自動轉去 場地與活動總覽 → 場地佈置總覽');
app.switchExecManualTab('box_label');
check(app.execManualSubTab === 'misc' && app.execManualMiscTab === 'box_label', '④ 舊連結 box_label 自動轉去 各類附加資料 → 箱頭紙');

/* ================= ④ 各類附加資料：箱頭紙＋許可證式樣＋失物認領 ================= */
app.switchExecManualTab('misc');
const miscHTML = elements['exec-manual-panel'].innerHTML;
check(miscHTML.includes('exec-misc-tab-box_label') && miscHTML.includes('箱頭紙'), '④ 各類附加資料含「箱頭紙」');
check(miscHTML.includes('exec-misc-tab-permit'), '④ 各類附加資料含「許可證式樣」');
check(elements['exec-misc-tab-permit'].innerHTML.includes('許可證式樣'), '④ 許可證式樣（上傳式）已渲染');
check(miscHTML.includes('exec-misc-tab-lost_found') && miscHTML.includes('失物認領'), '④ 各類附加資料含「失物認領」');

/* ================= ④ 失物認領：由行政組紀錄 ================= */
app.currentUser = null;
check(app.canManageLostFound() === false, '④ 未登入不可紀錄失物');
app.currentUser = { role: 'staff', user_id: '張家輝', name: '張家輝', group_name: '主題節目組' };
check(app.canManageLostFound() === false, '④ 其他組別（主題節目組）只可查閱失物');
app.currentUser = { role: 'staff', user_id: '陳子明', name: '陳子明', group_name: '行政組' };
check(app.canManageLostFound() === true, '④ 行政組成員可紀錄失物');
app.currentUser = { role: 'staff', user_id: '某人', name: '某人', group_name: '行政組', mock_admin: true };
check(app.canManageLostFound() === true, '④ MOCK 全權可紀錄失物');

// 登記一筆失物（走真實 save → render 路徑）
app.currentUser = { role: 'staff', user_id: '陳子明', name: '陳子明', group_name: '行政組' };
el('lf-mode').value = 'create';
el('lf-id').value = '';
el('lf-item').value = '藍色水樽';
el('lf-desc').value = '約 600ml';
el('lf-date').value = '2026-10-04';
el('lf-time').value = '14:30';
el('lf-location').value = 'A 區攤位';
el('lf-found-by').value = '陳子明';
el('lf-status').value = '待認領';
el('lf-claimed-by').value = '';
el('lf-claimed-contact').value = '';
el('lf-claimed-at').value = '';
el('lf-recorded-by').value = '陳子明';
el('lf-notes').value = '';
app.submitLostFoundForm({ preventDefault() {} });
const lf = app.getLostFoundData();
check(lf.records.length === 1 && lf.records[0].item_name === '藍色水樽', '④ 行政組登記失物成功（存入紀錄）');
check(lf.records[0].recorded_by === '陳子明' && !!lf.records[0].recorded_by_id, '④ 失物紀錄帶紀錄人');
const lfHTML = app.renderLostFoundHTML();
check(lfHTML.includes('藍色水樽') && lfHTML.includes('待認領'), '④ 失物清單顯示登記內容');
app.currentUser = { role: 'staff', user_id: '張家輝', name: '張家輝', group_name: '主題節目組' };
check(!app.renderLostFoundHTML().includes('openLostFoundForm'), '④ 非行政組睇失物清單＝只讀（無登記按鈕）');
check(app.renderLostFoundHTML().includes('🔒 需登入查看') === false, '④ 登入後唔會遮認領人聯絡');
app.currentUser = null;
check(app.renderLostFoundHTML().includes('只讀 — 失物由行政組紀錄'), '④ 未登入＝只讀提示');

/* ================= ⑤ 行政組部門中心：紀念章派發（工作人員）＋失物認領 ================= */
app.currentUser = { role: 'staff', user_id: '陳子明', name: '陳子明', group_name: '行政組' };
app.openGroupManagement('行政組');
const adminHTML = elements['module-content'].innerHTML;
check(adminHTML.includes('🏅 紀念章派發（工作人員）'), '⑤ 行政組部門中心有「紀念章派發（工作人員）」頁籤');
check(adminHTML.includes('🧳 失物認領'), '⑤ 行政組部門中心有「失物認領」頁籤');
const stampHTML = elements['group-tab-stamp_staff'].innerHTML;
check(stampHTML.includes('陳子明') && stampHTML.includes('李美玲') && stampHTML.includes('張家輝'), '⑤ 工作人員全人名列出（活動前已有全人名）');
check(stampHTML.includes('type="checkbox"'), '⑤ 派發用 TICK（checkbox）人名');
check(stampHTML.includes('saveSouvenirStampRemark'), '⑤ 有「備註」欄（紀錄改名／替假）');
check(stampHTML.includes('改名／替假請註明'), '⑤ 備註欄提示用作紀錄改名／替假');
check(elements['group-tab-lost_found'].innerHTML.includes('失物認領'), '⑤ 行政組「失物認領」頁籤內容已渲染');

// TICK 派發＋備註
const key陳 = app.souvenirStaffRoster().find(p => p.name === '陳子明').key;
app.toggleSouvenirStamp('staff', key陳, { checked: true });
let stamps = app.getSouvenirStampData();
check(stamps.staff[key陳].ticked === true, '⑤ TICK 後記錄為已派發');
check(stamps.staff[key陳].ticked_by === '陳子明' && !!stamps.staff[key陳].ticked_at, '⑤ 記錄派發人及時間（派咗俾邊個）');
app.saveSouvenirStampRemark('staff', key陳, '改為 陳大文（替假）');
stamps = app.getSouvenirStampData();
check(stamps.staff[key陳].remark === '改為 陳大文（替假）', '⑤ 備註記錄改名／替假');
app.toggleSouvenirStamp('staff', key陳, { checked: false });
check(app.getSouvenirStampData().staff[key陳].ticked === false, '⑤ 可取消 TICK（取消派發紀錄）');
check(app.getSouvenirStampData().staff[key陳].remark === '改為 陳大文（替假）', '⑤ 取消 TICK 不會清走備註');
check(app.souvenirStampStats('staff').total === 4, '⑤ 工作人員名冊總數正確（4 人）');

/* ================= ⑥ 嘉賓接待組部門中心：紀念章派發（嘉賓） ================= */
app.currentUser = { role: 'staff', user_id: '黃志強', name: '黃志強', group_name: '嘉賓接待組' };
app.openGroupManagement('嘉賓接待組');
const receptionHTML = elements['module-content'].innerHTML;
check(receptionHTML.includes('🏅 紀念章派發（嘉賓）'), '⑥ 嘉賓接待組部門中心有「紀念章派發（嘉賓）」頁籤');
check(!receptionHTML.includes('🧳 失物認領'), '⑥ 失物認領只喺行政組（嘉賓接待組冇）');
const guestHTML = elements['group-tab-stamp_guest'].innerHTML;
check(guestHTML.includes('盧詠儀') && guestHTML.includes('區子君會長'), '⑥ 嘉賓名單來自典禮儀式嘉賓名單');
check(guestHTML.includes('type="checkbox"'), '⑥ 嘉賓派發用 TICK（checkbox）人名');
check(!guestHTML.includes('saveSouvenirStampRemark'), '⑥ 嘉賓版冇備註／改名欄（不可改名）');
check(guestHTML.includes('嘉賓名單不可改名'), '⑥ 明確標示嘉賓名單不可改名');

// 權限：嘉賓派發由行政組＋嘉賓接待組管理；工作人員派發由行政組管理
check(app.canManageSouvenirStamps('guests') === true, '⑥ 嘉賓接待組可管理嘉賓紀念章派發');
check(app.canManageSouvenirStamps('staff') === false, '⑥ 嘉賓接待組不可管理工作人員紀念章派發（屬行政組）');
app.currentUser = { role: 'staff', user_id: '陳子明', name: '陳子明', group_name: '行政組' };
check(app.canManageSouvenirStamps('staff') === true && app.canManageSouvenirStamps('guests') === true, '⑥ 行政組可管理工作人員＋嘉賓紀念章派發');
app.currentUser = { role: 'staff', user_id: '張家輝', name: '張家輝', group_name: '主題節目組' };
check(app.canManageSouvenirStamps('staff') === false && app.canManageSouvenirStamps('guests') === false, '⑥ 其他組別不可管理紀念章派發');
app.currentUser = null;
check(app.canManageSouvenirStamps('staff') === false, '⑥ 未登入不可管理紀念章派發');

// 嘉賓 TICK（不可改名）
app.currentUser = { role: 'staff', user_id: '黃志強', name: '黃志強', group_name: '嘉賓接待組' };
const gKey = app.souvenirGuestRoster().find(g => g.name === '盧詠儀').key;
app.toggleSouvenirStamp('guests', gKey, { checked: true });
check(app.getSouvenirStampData().guests[gKey].ticked === true, '⑥ TICK 後記錄嘉賓已獲派紀念章');
check(app.getSouvenirStampData().guests[gKey].ticked_by === '黃志強', '⑥ 記錄派發人（嘉賓接待組）');
app.saveSouvenirStampRemark('guests', gKey, '改名測試');
check(!app.getSouvenirStampData().guests[gKey].remark, '⑥ 嘉賓版拒絕改名／備註');
check(app.souvenirStampStats('guests').total === 10, '⑥ 嘉賓名冊總數＝典禮嘉賓名單 10 位');

/* ================= ② 主題節目組原有頁籤未受影響 ================= */
app.currentUser = { role: 'staff', user_id: '張家輝', name: '張家輝', group_name: '主題節目組', mock_admin: true };
app.getActivitiesData = () => ({ activities: [], maps: [], booths: [], gameCards: [], booth_source: null, drive_folder_link: '' });
app.renderGroupBoothDataHTML = () => '<div>攤位資料總表</div>';
app.openGroupManagement('主題節目組');
const themeHTML = elements['module-content'].innerHTML;
check(themeHTML.includes('📁 攤位資料 (Drive)') && themeHTML.includes('🗒️ 攤位總表') && themeHTML.includes('📊 借用統計＋招牌'), '② 主題節目組 4 個頁籤照舊');
check(!themeHTML.includes('紀念章派發'), '⑤⑥ 紀念章派發只喺行政組／嘉賓接待組');

console.log('V11_EXEC_MANUAL_ACTIVITIES_EXTRAS_OK (' + n + ' checks)');
