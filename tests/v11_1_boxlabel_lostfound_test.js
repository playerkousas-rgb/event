#!/usr/bin/env node
'use strict';
/* v11.1 回歸測試（2026-08-31，對應用戶三項要求）：
   ① 箱頭紙改用指定式樣（Drive 版），年份 2025 → 2026
   ② 失物認領兩種登記情況：有失物登記（found）／有人要尋找物品（seeking）
   ③ 兩者都在下方各自出現列表，點入去處理認領；確認時自動紀錄時間
      （失物找到物主＝已認領／尋物者尋回失物＝已尋回；登記時亦自動紀錄登記時間） */
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

/* ================= ① 箱頭紙：指定式樣 · 2026 ================= */
const monSrc = fs.readFileSync(path.join(root, 'js/26-monitor-apply.js'), 'utf8');
check(app.boxLabelYear() === '2026', '① 箱頭紙年份為 2026（由活動 start_date 帶出）');
check(app.boxLabelTripDate('2026') === '4/10/2026', '① 去程日期跟指定式樣 d/m/yyyy＝4/10/2026');

const panel = app.boxLabelPanelHTML();
check(panel.includes('指定式樣'), '① 箱頭紙面板註明採用指定式樣');
check(panel.includes('只需改年份'), '① 只需改年份即可沿用');
check(panel.includes('boxl_seq') && panel.includes('boxl_total'), '① 式樣欄位：序號 / 需運送物資總數');
check(panel.includes('負責人／攤位名稱'), '① 式樣欄位：負責人／攤位名稱');
check(panel.includes('百週年紀念大樓') && panel.includes('香港警察學院'), '① 式樣：去程／回程場地');
check(panel.includes('自行運走') && panel.includes('棄置') && panel.includes('交地域處理'), '① 式樣：活動完結四個選項');
check(panel.includes('4/10/2026'), '① 去程日期已改為 2026');
check(!panel.includes('2025'), '① 式樣內已無 2025 字樣');

const sheet = app.boxLabelSheetHTML({ year: '2026', group: '行政', person: '陳子明', seq: '1', total: '3', outbound: true, ret: '自行運走', trip_date: '4/10/2026' });
check(sheet.includes('香港童軍總會') && sheet.includes('港島地域'), '① 列印式樣有機構抬頭');
check(sheet.includes('港島童軍繽紛日 2026 物資'), '① 列印標題＝港島童軍繽紛日 2026 物資');
check(sheet.includes('（序號 / 需運送物資總數）'), '① 列印有「序號 / 需運送物資總數」說明');
check(sheet.includes('去程 (4/10/2026)'), '① 列印去程日期為 2026');
check(monSrc.includes('1張A4·2張') && monSrc.includes('.boxlabel'), '① 保持一張 A4 印兩張');
check(/@page\{size:A4[^}]*margin:0/.test(monSrc), '① 列印邊距歸零：兩張 A5 啱啱好排滿一張 A4');
check(monSrc.includes('height:148.5mm') && monSrc.includes('width:210mm'), '① 每張箱頭紙為正 A5 尺寸（210×148.5mm），A4 對半剪開');
check(!monSrc.includes('page-break-after:always'), '① 已移除 page-break-after:always（唔會再一張一頁，印兩張 A4 浪費紙）');
check(monSrc.includes('cutline'), '① 兩張之間有虛線剪開線（✂）');
check(monSrc.includes('noprint'), '① 列印時隱藏操作列，紙上只有兩張箱頭紙');
check(monSrc.includes('normalizeGroupName(this.currentUser.group_name'), '① 組別預設為登入組別');
const coreBtn = fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8');
check(coreBtn.includes('openBoxLabelModal('), '① 部門中心卡仍有箱頭紙入口');

/* ================= ② 失物認領：兩種登記情況 ================= */
app.currentUser = { role: 'staff', user_id: '陳子明', name: '陳子明', group_name: '行政組' };
check(app.canManageLostFound() === true, '② 行政組可紀錄失物／尋物');

function register(type, item, by) {
  app.openLostFoundForm(type);
  // mock DOM 唔會由 innerHTML 建立 hidden input，手動補上（真實瀏覽器由表單 HTML 提供）
  el('lf-mode').value = 'create';
  el('lf-id').value = '';
  el('lf-type').value = type;
  el('lf-item').value = item;
  el('lf-desc').value = '測試描述';
  el('lf-date').value = '2026-10-04';
  el('lf-time').value = '14:30';
  el('lf-location').value = 'A 區攤位';
  el('lf-found-by').value = by;
  el('lf-contact').value = '91234567';
  el('lf-status').value = app.lostFoundOpenLabel(type);
  el('lf-recorded-by').value = '陳子明';
  el('lf-notes').value = '';
  app.submitLostFoundForm({ preventDefault() {} });
  return app.getLostFoundData().records.slice(-1)[0];
}

const foundRec = register('found', '藍色水樽', '陳子明');
check(foundRec.type === 'found' && foundRec.status === '待認領', '② 情況一：有失物登記＝found／待認領');
check(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(foundRec.created_at), '③ 失物登記時自動紀錄登記時間');
check(!foundRec.claimed_at, '③ 未處理時未有認領時間');

const seekRec = register('seeking', '啡色銀包', '李小明');
check(seekRec.type === 'seeking' && seekRec.status === '尋找中', '② 情況二：有人要尋找物品＝seeking／尋找中');
check(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(seekRec.created_at), '③ 尋物登記時自動紀錄登記時間');

check(app.lostFoundSorted('found').length === 1 && app.lostFoundSorted('seeking').length === 1, '② 兩種登記分開儲存');
check(foundRec.id !== seekRec.id, '② 同一毫秒連續登記亦有唯一 ID（不會互相覆蓋）');

/* ================= ③ 兩者都在下方出現列表 ================= */
const lfHTML = app.renderLostFoundHTML();
check(lfHTML.includes('① 失物登記列表'), '③ 下方有「失物登記列表」');
check(lfHTML.includes('② 尋物登記列表'), '③ 下方有「尋物登記列表」');
check(lfHTML.includes('藍色水樽') && lfHTML.includes('啡色銀包'), '③ 兩張列表分別顯示各自紀錄');
check(lfHTML.includes('openLostFoundClaim'), '③ 列表可點入去處理認領');
check(lfHTML.includes('處理認領'), '③ 有「處理認領」按鈕');
check(lfHTML.includes('登記失物（拾獲物品）') && lfHTML.includes('登記尋物'), '② 兩個登記入口按鈕');
check(lfHTML.includes('登記時間'), '③ 列表顯示自動登記時間');

/* ================= ③ 處理認領：自動紀錄時間 ================= */
app.openLostFoundClaim(foundRec.id);
check(elements['record-modal-title'].textContent.includes('找到物主'), '③ 失物處理＝找到物主');
el('lfc-id').value = foundRec.id;
el('lfc-by').value = '王大文';
el('lfc-contact').value = '98765432';
el('lfc-notes').value = '已核對身分';
app.confirmLostFoundClaim();
const done1 = app.getLostFoundData().records.find(r => r.id === foundRec.id);
check(done1.status === '已認領', '③ 失物找到物主＝已認領');
check(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(done1.claimed_at), '③ 認領時間由系統自動紀錄');
check(done1.closed_by === '陳子明' && done1.claimed_by === '王大文', '③ 記錄認領人及處理人');

app.openLostFoundClaim(seekRec.id);
check(elements['record-modal-title'].textContent.includes('尋回失物'), '③ 尋物處理＝尋回失物');
el('lfc-id').value = seekRec.id;
el('lfc-by').value = '李小明';
el('lfc-contact').value = '91234567';
el('lfc-notes').value = '物品已交還';
app.confirmLostFoundClaim();
const done2 = app.getLostFoundData().records.find(r => r.id === seekRec.id);
check(done2.status === '已尋回', '③ 尋物者尋回失物＝已尋回');
check(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(done2.claimed_at), '③ 尋回時間由系統自動紀錄');

// 取消完成會清走自動時間
app.reopenLostFound(seekRec.id);
const reopened = app.getLostFoundData().records.find(r => r.id === seekRec.id);
check(reopened.status === '尋找中' && !reopened.claimed_at, '③ 取消完成後回復尋找中並清走時間');

/* ================= 權限：只讀 ================= */
app.currentUser = { role: 'staff', user_id: '張家輝', name: '張家輝', group_name: '主題節目組' };
check(app.canManageLostFound() === false, '② 其他組別只可查閱');
check(!app.renderLostFoundHTML().includes('openLostFoundClaim'), '② 非行政組唔可以點入去處理認領');
app.currentUser = null;
check(app.renderLostFoundHTML().includes('只讀 — 失物由行政組紀錄'), '② 未登入＝只讀');
check(app.renderLostFoundHTML().includes('🔒 需登入查看'), '② 未登入隱藏聯絡電話');

/* ================= 後端欄位 ================= */
const gs = fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8');
check(/ensureSheet\(ss, 'Lost_Found'[^)]*'type'/.test(gs), '後端 Lost_Found 有 type 欄');
check(/ensureColumns\(ss\.getSheetByName\('Lost_Found'\)/.test(gs), '後端非破壞性補欄 type/contact/closed_by');
const sync = fs.readFileSync(path.join(root, 'js/23-sync.js'), 'utf8');
check(sync.includes("type:String(r.type||'found')"), '跨裝置同步保留登記類別');

console.log('V11_1_BOXLABEL_LOSTFOUND_OK (' + n + ' checks)');
