#!/usr/bin/env node
'use strict';
/* v9.0 回歸測試（2026-08-31，對應用戶四項要求）：
   ② 場地與活動總覽「地圖上傳方式同遊戲卡」：地圖頁移除散落嘅「上傳文件」掣，格式/版本欄同遊戲卡一致，
      兩者都支援 PDF／Word／圖片／Drive 連結；Word 用 mammoth 解析成文字內嵌、PDF 整份內嵌。
   ③ 典禮儀式所有項目上傳方式同遊戲卡：新增「附件（PDF／Word／連結）」區（7 個項目），
      可解析 JSON／Word 文字內嵌，無法解析時整份 PDF 內嵌。
   ④ 身份／登出按鈕只在最頂 BAR 右上角：申請中心、我的監察等模組頁不再出現身份卡／登出按鈕；
      全站僅 #logout-btn（頂 BAR）同登入 modal 內嘅 MOCK 切換掣呼叫 app.logout()。 */
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

// ── 小型 DOM mock：每個 id 獨立元素，classList 記錄 hidden、value/files 可寫 ──
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
  currentEvent: { event_id: 'mock_demo', event_name: '模擬示範版', category: 'demo' },
  currentUser: { role: 'general_director', name: '測試總主任', user_id: '測試總主任', group_name: '行政組' },
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
// 只測 UI 分支所依賴的少量方法（其餘用不到）
app.isDemoEvent = () => true;
app.isAdmin = () => false;
app.isExecViceOrChair = () => false;
app.isSuperAdmin = () => false;
app.closeModal = () => {};
app.getMeetingFolderConfig = () => ({ id: '' });
app.uploadFileToDriveFolder = async () => ({ success: false });
app.renderActivitiesBooths = () => {};
app.renderActivitiesList = () => {};

function ok(cond, msg) { assert(cond, msg); }
let n = 0;
function check(cond, msg) { ok(cond, msg); n++; }

/* ================= ② 地圖上傳方式同遊戲卡 ================= */
const actSrc = fs.readFileSync(path.join(root, 'js/21-activities.js'), 'utf8');
check(!actSrc.includes("onchange=\"app.handleActivityFileUpload(this.files[0],'map')\""),
  '② 地圖頁應移除散落嘅「上傳文件」掣（只留「上傳地圖」按鈕，同遊戲卡一致）');
check(actSrc.includes('activity-map-version'), '② 地圖表單應有「版本」欄（同遊戲卡）');
check(actSrc.includes('accept=".jpg,.jpeg,.png,.pdf,.docx,.doc"'), '② 地圖/遊戲卡應接受 PDF/Word/圖片');
check(actSrc.includes("mammoth.extractRawText"), '② 應有 mammoth 解析 Word 文字（JSON 內嵌）');
check(actSrc.includes('activityFilePreviewHTML'), '② 應有共用檔案預覽 helper');

// 實測地圖頁渲染：有「上傳地圖」+「下載地圖範本」+ 共用預覽，無 inline 上傳
el('activities-tab-maps');
app.activitiesSubTab = 'maps';
app.renderActivitiesMaps();
let mapsHtml = elements['activities-tab-maps'].innerHTML;
check(mapsHtml.includes('app.openActivityMapForm()'), '② 地圖頁應有「上傳地圖」按鈕');
check(mapsHtml.includes("app.downloadActivityTemplate('map')"), '② 地圖頁應有下載範本');
check(!mapsHtml.includes('handleActivityFileUpload'), '② 地圖頁不應再有 inline 檔案上傳');
check(mapsHtml.includes('上傳方式同「遊戲卡」'), '② 地圖頁應說明上傳方式同遊戲卡');

// 實測地圖表單：含版本欄 + PDF/Word 接受類型
app.openActivityMapForm();
let formId = 'record-form-fields';
check(elements[formId].innerHTML.includes('activity-map-version'), '② 地圖表單應有版本欄');
check(elements[formId].innerHTML.includes('accept=".jpg,.jpeg,.png,.pdf,.docx,.doc"'), '② 地圖表單應接受 PDF/Word/圖片');

// 模擬提交地圖：URL 版
el('activity-map-mode').value = 'create';
el('activity-map-id').value = '';
el('activity-map-title').value = '測試場地圖';
el('activity-map-desc').value = '';
el('activity-map-version').value = 'v2';
el('activity-map-url').value = 'https://drive.google.com/file/d/abc/view';
el('activity-map-file').files = [];
app.submitActivityMapForm().then(() => {
  const data = app.getActivitiesData();
  const m = data.maps.find(x => x.title === '測試場地圖');
  check(!!m && m.version === 'v2', '② 提交後地圖應有版本 v2');
  check(!!m && m.file_url === 'https://drive.google.com/file/d/abc/view', '② 提交後地圖應保留連結');

  // 遊戲卡表單同格式
  app.openGameCardForm();
  check(elements[formId].innerHTML.includes('gamecard-version'), '② 遊戲卡表單應有版本欄');
  check(elements[formId].innerHTML.includes('accept=".jpg,.jpeg,.png,.pdf,.docx,.doc"'), '② 遊戲卡表單應接受 PDF/Word/圖片');

  /* ================= ③ 典禮儀式上傳方式同遊戲卡 ================= */
  const cerSrc = fs.readFileSync(path.join(root, 'js/35-ceremony.js'), 'utf8');
  check(cerSrc.includes('openCeremonyFileForm'), '③ 應有典禮附件上傳表單');
  check(cerSrc.includes('mammoth.extractRawText'), '③ 典禮附件應有 Word 解析（JSON 內嵌）');
  check(cerSrc.includes('application\\/pdf'), '③ 典禮附件應有「整份 PDF 內嵌」iframe');

  const cer = app.getCeremonyData();
  check(Array.isArray(cer.files), '③ 典禮 JSON 應有 files 附件陣列');
  check(cer.rundown.length > 0 && typeof cer.mc_script !== 'undefined', '③ 典禮流程/司儀稿維持「內建 JSON」');

  app.renderCeremonyModule();
  const cerHtml = elements['module-content'].innerHTML;
  check(cerHtml.includes('上傳附件'), '③ 典禮頁應有「上傳附件」按鈕');
  check(cerHtml.includes('ceremony-files-list'), '③ 典禮頁應有附件清單區');
  check(cerHtml.includes('PDF／Word／連結'), '③ 典禮頁應注明上傳 PDF／Word／連結');

  app.openCeremonyFileForm();
  const cf = elements[formId].innerHTML;
  check(cf.includes('crf-section') && cf.includes('獲獎名單') && cf.includes('嘉賓地圖'),
    '③ 附件表單應可揀 7 個典禮項目（RUNDOWN…嘉賓地圖）');
  check(cf.includes('accept=".jpg,.jpeg,.png,.pdf,.docx,.doc"'), '③ 附件表單應接受 PDF/Word/圖片');

  el('crf-mode').value = 'create';
  el('crf-id').value = '';
  el('crf-section').value = 'rundown';
  el('crf-title').value = '測試 RUNDOWN 官方版';
  el('crf-desc').value = '';
  el('crf-version').value = 'v1';
  el('crf-url').value = '';
  el('crf-file').files = [];
  app.submitCeremonyFileForm().then(() => {
    const c2 = app.getCeremonyData();
    const f = (c2.files || []).find(x => x.title === '測試 RUNDOWN 官方版');
    check(!!f && f.section === 'rundown', '③ 提交後附件應寫入 JSON 並標示所屬項目');

    /* ================= ④ 身份／登出只在最頂 BAR ================= */
    const monSrc = fs.readFileSync(path.join(root, 'js/26-monitor-apply.js'), 'utf8');
    check(!monSrc.includes('onclick="app.logout()"'), '④ 申請中心/我的監察 JS 不應再有登出按鈕');
    check(!monSrc.includes('已登入：<b>'), '④ 申請中心不應再顯示「已登入：姓名（角色）身份卡」');

    // 申請中心實測：登入後無身份卡、無登出按鈕
    app.renderApplyHubModule();
    const hub = elements['module-content'].innerHTML;
    check(!hub.includes('app.logout()'), '④ 申請中心實測不應有登出按鈕');
    check(!hub.includes('測試總主任'), '④ 申請中心實測不應顯示姓名（身份只喺最頂 BAR）');
    check(hub.includes('最頂 BAR 右上角'), '④ 申請中心應提示身份/登出喺最頂 BAR 右上角');

    // 我的監察實測（無權限）：無身份卡
    app.monitorScope = () => ({ level: 'self', groups: [] });
    app.collectApplications = () => [];
    app.currentUser = { role: 'staff', name: '陳子明', user_id: '陳子明', group_name: '主題節目組' };
    app.renderMyMonitorModule();
    const monPage = elements['module-content'].innerHTML;
    check(!monPage.includes('陳子明'), '④ 我的監察不應顯示姓名身份卡');
    check(!monPage.includes('app.logout'), '④ 我的監察不應有登出按鈕');

    // 全站：頂 BAR 保留登出按鈕；登出按鈕只餘頂 BAR 同 MOCK 切換掣
    check(html.includes('id="logout-btn"'), '④ 最頂 BAR 登出按鈕應保留');
    check((html.match(/app\.logout\(\)/g) || []).length <= 2, '④ 全站 app.logout() 只應剩頂 BAR + 登入 modal 內 MOCK 切換掣');
    check(!html.includes('公開 (登出)'), '④ 登入 modal 內 MOCK 掣不應再叫「(登出)』');

    console.log(`V9_0_2026_MANUAL_UPLOADS_IDENTITY_OK (${n} checks)`);
  }).catch(e => { console.error(e); process.exit(1); });
}).catch(e => { console.error(e); process.exit(1); });
