#!/usr/bin/env node
'use strict';
/* v10 回歸測試（2026-08-31，對應用戶八項要求）：
   ① 會議提醒「發送提醒」權限＝執行副主席以上及秘書處（canSendMeetingReminder）
   ② 選擇活動頁 新增/編輯/刪除活動 已移除（活動只由 GIT data/events.json 管理），無 isEventManager、無墓碑
   ③ 執行手冊 > 典禮儀式：所有「新增」均改用「上傳(同遊戲卡)」按鈕，內建 JSON 保留
   ④ 執行手冊新頁面不顯示「對標文件」卡片（比較表只作參考，不貼在頁面）
   ⑤ 參加旅團名單：上傳式（同遊戲卡）
   ⑥ 場地佈置總覽：上傳式（同遊戲卡）
   ⑦ 箱頭紙：只改年份、一頁 A4 印兩張、預設登入組別、部門中心可填寫列印
   ⑧ 許可證式樣：上傳式（同遊戲卡），由協調組／行政組管理 */
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

// 小型 DOM mock：每個 id 獨立元素，classList 記錄 hidden、value/files 可寫
const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = {
      id,
      _cls: new Set(),
      style: {},
      textContent: '',
      innerHTML: '',
      value: '',
      files: [],
      name: '',
      type: '',
      dataset: {},
      addEventListener() {},
      querySelectorAll() { return []; },
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
const store = new Map();
const localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};
const context = {
  console,
  localStorage,
  document: {
    getElementById: el,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => el('_new'),
    createDocumentFragment: () => ({}),
    body: { appendChild() {} }
  },
  window: {},
  navigator: {},
  location: {},
  URL: { createObjectURL() { return ''; } },
  Blob: function Blob() {},
  FileReader: function FileReader() {},
  setTimeout() {},
  clearTimeout() {},
  fetch: async () => ({ ok: false, json: async () => ({}), text: async () => '' }),
  confirm: () => true,
  alert() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(core, context);

const App = context.TestApp;
const app = Object.create(App.prototype);
Object.assign(app, {
  currentEvent: { event_id: 'mock_demo', event_name: '模擬示範版', category: 'demo', start_date: '2026-10-04' },
  currentUser: null,
  eventData: {},
  usersList: [],
  approvalPerms: [],
  gasUrl: '',
  apiKey: 'k',
  pendingChanges: [],
  meetingsCache: [],
  tempFiles: {},
  systemConfig: {},
  _catSel: {}
});
app.isDemoEvent = () => true;
app.isAdmin = () => app.currentUser ? (app.currentUser.role === 'admin' || app.currentUser.role === 'super_admin' || app.currentUser.mock_admin) : false;
app.isExecViceOrChair = () => app.currentUser ? ['chairperson', 'executive_vice_chairperson'].includes(app.currentUser.role) : false;
app.isSuperAdmin = () => app.currentUser && app.currentUser.role === 'super_admin';
app.closeModal = () => {};
app.renderEventsGrid = () => {};
app.getMeetingsData = () => ({ meetings: [] });
app.meetingsJSON = () => [];

function ok(cond, msg) { assert(cond, msg); }
let n = 0;
function check(cond, msg) { ok(cond, msg); n++; }

/* ================= ① 會議提醒權限 ================= */
const core10 = fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8');
check(core10.includes('canSendMeetingReminder'), '① 應有 canSendMeetingReminder()');
// 無登入 → false
check(app.canSendMeetingReminder() === false, '① 未登入不可發送提醒');
// MOCK
app.currentUser = { role: 'staff', mock_admin: true, group_name: '未分組' };
check(app.canSendMeetingReminder() === true, '① MOCK 全權可發送提醒');
// 執行副主席以上
app.currentUser = { role: 'executive_vice_chairperson', group_name: '未分組' };
check(app.canSendMeetingReminder() === true, '① 執行副主席可發送提醒');
app.currentUser = { role: 'chairperson', group_name: '未分組' };
check(app.canSendMeetingReminder() === true, '① 主席可發送提醒');
app.currentUser = { role: 'advisor', group_name: '未分組' };
check(app.canSendMeetingReminder() === true, '① 顧問可發送提醒');
// 秘書處（組別）
app.currentUser = { role: 'general_director', group_name: '秘書處' };
check(app.canSendMeetingReminder() === true, '① 秘書處組別可發送提醒');
// 一般組別（總主任）不可
app.currentUser = { role: 'general_director', group_name: '行政組' };
check(app.canSendMeetingReminder() === false, '① 行政組總主任（非秘書處）不可發送提醒');
// 普通成員不可
app.currentUser = { role: 'staff', group_name: '行政組' };
check(app.canSendMeetingReminder() === false, '① 普通成員不可發送提醒');

/* ================= ② 活動 CRUD 已移除（活動只由 GIT data/events.json 管理） ================= */
check(!core10.includes('isEventManager'), '② 不應再有 isEventManager()');
check(!core10.includes('deletedEvents') && !core10.includes('LS.deletedEvents'), '② 不應再有活動刪除墓碑');
check(!core10.includes('addEventToCategory') && !core10.includes('editEvent') && !core10.includes('deleteEvent'), '② 不應再有新增/編輯/刪除活動方法');
// html 中亦無 modal-event 活動表單
check(!html.includes('id="modal-event"'), '② index.html 不應再有 modal-event 活動表單');

/* ================= ③ 典禮儀式「新增」＝上傳(同遊戲卡) ================= */
const cerSrc = fs.readFileSync(path.join(root, 'js/35-ceremony.js'), 'utf8');
check(cerSrc.includes("openCeremonyFileForm(null,'rundown')"), '③ RUNDOWN「新增」＝上傳(同遊戲卡)');
check(cerSrc.includes("openCeremonyFileForm(null,'mc')"), '③ 司儀稿「新增」＝上傳(同遊戲卡)');
check(cerSrc.includes("openCeremonyFileForm(null,'guests')"), '③ 嘉賓「新增」＝上傳(同遊戲卡)');
check(cerSrc.includes("openCeremonyFileForm(null,'seating')"), '③ 座位「新增」＝上傳(同遊戲卡)');
check(cerSrc.includes("openCeremonyFileForm(null,'awards')"), '③ 獲獎名單「新增」＝上傳(同遊戲卡)');
check(cerSrc.includes('mammoth.extractRawText'), '③ 應有 Word→JSON 文字解析（內嵌）');
check(cerSrc.includes('application\\/pdf'), '③ 應有 PDF 整份內嵌');

/* ================= ④ 新增頁面不顯示「對標文件」卡片（比較表只作參考） ================= */
const monSrc = fs.readFileSync(path.join(root, 'js/26-monitor-apply.js'), 'utf8');
check(!monSrc.includes('execManualCompareNote'), '④ 不應再有 execManualCompareNote helper');
check(!monSrc.includes('2025_EXEC_MANUAL_COMPARISON.md'), '④ 頁面不應連到 2025_EXEC_MANUAL_COMPARISON.md');
const cerSrc2 = fs.readFileSync(path.join(root, 'js/35-ceremony.js'), 'utf8');
check(!cerSrc2.includes('2025_EXEC_MANUAL_COMPARISON.md'), '④ 典禮頁不應連到對標文件');

/* ================= ⑤⑥⑧ 上傳式分頁（participants/venue_setup/permit） ================= */
check(monSrc.includes("renderExecManualUploadTab('venue_setup'"), '⑥ 場地佈置總覽應用上傳式分頁');
check(monSrc.includes("renderExecManualUploadTab('permit'"), '⑧ 許可證式樣應用上傳式分頁');
check(monSrc.includes("renderExecManualParticipants"), '⑤ 參加旅團名單應有獨立渲染');
check(monSrc.includes("renderExecManualBoxLabel"), '⑦ 箱頭紙應有獨立渲染');
check(monSrc.includes("openExecManualFileForm"), '⑤⑥⑧ 應有上傳檔案表單');
check(monSrc.includes('mammoth.extractRawText'), '⑤⑥⑧ 應有 Word→文字解析');
// 權限：participants→行政/文檔；venue_setup、permit→協調/行政/活動
check(monSrc.includes("section==='participants'"), '⑤ 參加旅團名單權限應含行政組/文檔');
check(monSrc.includes("section==='permit'"), '⑧ 許可證式樣權限應含協調/行政');
check(monSrc.includes("section==='venue_setup'"), '⑥ 場地佈置權限應含協調/行政');

/* ================= ⑦ 箱頭紙 ================= */
check(monSrc.includes('1張A4·2張'), '⑦ 列印提示應為「一張 A4 印兩張」');
check(monSrc.includes('.boxlabel'), '⑦ 應有 boxlabel 兩張列印樣式');
check(monSrc.includes('boxLabelYear'), '⑦ 應有年份 helper（只需改年份）');
check(monSrc.includes('normalizeGroupName(this.currentUser.group_name'), '⑦ 組別預設為登入組別');
check(monSrc.includes("openBoxLabelModal"), '⑦ 應有箱頭紙 modal');
// 部門中心有入口 + 預設組別
const coreBtn = fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8');
check(coreBtn.includes('openBoxLabelModal('), '⑦ 部門中心卡應有 箱頭紙 按鈕，並帶入組別');

/* ================= 外部參照字段完整性 ================= */
// 上傳式分頁需要 activityFilePreviewHTML（來自 21-activities.js）
const actSrc = fs.readFileSync(path.join(root, 'js/21-activities.js'), 'utf8');
check(typeof app.activityFilePreviewHTML === 'function' || actSrc.includes('activityFilePreviewHTML'), '上傳預覽 helper 應存在（21-activities）');

console.log('V10_EXEC_MANUAL_COMPARISON_OK (' + n + ' checks)');
