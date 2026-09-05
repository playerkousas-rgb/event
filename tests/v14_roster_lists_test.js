#!/usr/bin/env node
'use strict';
/* v14 回歸測試（2026-09-05，對應用戶要求）：
   ① 先「預定位置及格式」：四張名單喺執行手冊嘅位置固定、欄位格式固定（可下載範本）
   ② 預備可讓用戶上傳名單：EXCEL／WORD／PDF（Excel／Word 解析成行列；PDF 作附件內嵌預覽）
   ③ 支部獎勵獲獎名單（執行手冊內）＋像優異旅團那種點名 → 歸典禮組（會操及典禮組）
   ④ 領袖獎勵獲獎名單（執行手冊內）＋點名 → 歸典禮組
   ⑤ 參加旅團名單（執行手冊內）＋點名 → 歸行政組
   ⑥ 代訂餐盒旅團名單（執行手冊內）＋點名 → 歸協調組 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const cfg = read('js/00-config.js');
const roster = read('js/41-roster-lists.js');
const ceremony = read('js/35-ceremony.js');
const execm = read('js/26-monitor-apply.js');
const acts = read('js/21-activities.js');
const core = read('js/10-app-core.js');
const crisis = read('js/36-crisis.js');
const gs = read('apps-script/Code.gs');

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

/* ══════════ A. 源碼層面：位置／格式／上傳入口 ══════════ */
ok(cfg.includes('const ROSTER_LIST_DEFS=['), 'A1 應有 ROSTER_LIST_DEFS 名單定義（預定格式集中喺 00-config）');
['section_award', 'leader_award', 'participants', 'meal_box'].forEach(k => ok(cfg.includes(`key:'${k}'`), 'A2 應預留名單版位：' + k));
ok(cfg.includes("title:'支部獎勵獲獎名單'") && cfg.includes("owner_group:'會操及典禮組'"), 'A3 支部獎勵獲獎名單歸典禮組（會操及典禮組）');
ok(cfg.includes("title:'領袖獎勵獲獎名單'"), 'A3 領袖獎勵獲獎名單已定義');
ok(cfg.includes("title:'參加旅團名單'") && /key:'participants'[\s\S]{0,400}owner_group:'行政組'/.test(cfg), 'A4 參加旅團名單歸行政組');
ok(cfg.includes("title:'代訂餐盒旅團名單'") && /key:'meal_box'[\s\S]{0,400}owner_group:'協調組'/.test(cfg), 'A5 代訂餐盒旅團名單歸協調組');
ok(cfg.includes('rosterLists:(eid)=>`event_roster_lists_v14_${eid}`'), 'A6 localStorage 版位 key（v14）');

// 位置：執行手冊 → 代訂餐盒名單（新分頁）；參加旅團名單（既有分頁加点名）；兩份獎勵名單喺典礼儀式分頁內
ok(/k:'meal_box',\s*icon:'fa-solid fa-bowl-food',\s*label:'代訂餐盒名單'/.test(execm), 'A7 執行手冊分頁列應有「代訂餐盒名單」');
ok(execm.includes("participants:()=>this.renderExecManualParticipants(panel)") && execm.includes("meal_box:()=>{ this.renderExecManualMealBox(panel); }"), 'A7 執行手冊分頁渲染對照表應接上新分頁');
ok(execm.includes("this.rosterPanelHTML('participants',{scope:'exec'})"), 'A8 參加旅團名單分頁應掛上報到點名');
ok(ceremony.includes("switchCeremonyTab('section_award')") && ceremony.includes("switchCeremonyTab('leader_award')"), 'A9 典禮儀式應有兩張獎勵名單分頁（執行手冊內）');
ok(ceremony.includes("'awards','section_award','leader_award','map'"), 'A9 分頁切換清單包含兩張新名單');
ok(ceremony.includes("rosterPanelHTML('section_award',{scope:'cer'})") && ceremony.includes("rosterPanelHTML('leader_award',{scope:'cer'})"), 'A10 兩張獎勵名單用同一名單引擎渲染');

// 部門中心入口（同執行手冊共用一份名單）
ok(core.includes("coord_mealbox',label:'🍱 代訂餐盒名單'"), 'A11 協調組部門中心應有代訂餐盒名單頁籤');
ok(core.includes("cer_award_section',label:'🏅 支部獎勵名單'") && core.includes("cer_award_leader',label:'🎖️ 領袖獎勵名單'"), 'A12 典禮組部門中心應有兩份獎勵名單頁籤');
ok(core.includes("case 'coord_mealbox'") && core.includes("case 'cer_award_section'") && core.includes("case 'cer_award_leader'"), 'A13 部門中心頁籤渲染 case');
ok(core.includes("'coord_mealbox','cer_award_section','cer_award_leader']"), 'A14 頁籤切換清單已登記新頁籤');
ok(crisis.includes("this.rosterPanelHTML('participants',{scope:'admin'})"), 'A15 行政組部門中心「參加旅團」頁籤應含點名');

// 上傳入口：EXCEL／WORD／PDF（名單）＋ 附件（PDF／Word／圖片／Drive 連結）
ok(/accept="\.xlsx,\.xls,\.xlsm,\.csv,\.docx,\.doc,\.pdf"/.test(roster) || roster.includes('accept=".xlsx,.xls,.xlsm,.csv,.docx,.doc,.pdf"'), 'A16 名單上傳 input 應收 EXCEL／WORD／PDF');
ok(roster.includes('app.rosterImportFile('), 'A16 名單上傳應交予 rosterImportFile 解析');
ok(roster.includes('rosterParseDocx') && roster.includes('mammoth.convertToHtml'), 'A17 Word 以 mammoth 解析表格');
ok(roster.includes("if(/\\.pdf$/.test(name))") && roster.includes('rosterAttachFile'), 'A18 PDF 以附件方式內嵌預覽');
ok(roster.includes('openRosterPasteForm'), 'A19 應提供「貼上文字」（PDF 複製內容都能變成點名名單）');
ok(execm.includes('.xlsx,.xls,.csv,.json,.txt') && execm.includes('accept=".jpg,.jpeg,.png,.pdf,.docx,.doc,.xlsx,.xls,.csv,.json,.txt"'), 'A20 附件上傳表單同收 Excel');
ok(acts.includes('handleParticipantsUploadFile'), 'A21 應有參加旅團名單上傳統一入口（EXCEL／WORD／PDF）');
ok(execm.includes('app.handleParticipantsUploadFile(this.files[0])') && crisis.includes('app.handleParticipantsUploadFile(this.files[0])'), 'A21 執行手冊＋行政組部門中心兩邊都接同一個上傳入口');

// 權限：roster_* 附件區跟名單負責組別
ok(execm.includes("if(String(section||'').indexOf('roster_')===0)") && execm.includes('this.rosterCanManage(k)'), 'A22 名單附件區權限交返名單引擎（按負責組別）');
// 後端
ok(gs.includes("ensureSheet(ss, 'Roster_Lists'") && gs.includes("ensureSheet(ss, 'Roster_Rollcall_Checkins'") && gs.includes("ensureSheet(ss, 'Roster_Rollcall_Batches'"), 'A23 GAS 應建好三張表（名單／點名留痕／分組確認）');
ok(gs.includes("'Roster_Lists', 'Roster_Rollcall_Checkins', 'Roster_Rollcall_Batches'"), 'A24 getEventData 應回傳名單表（跨裝置）');
ok(gs.includes("moduleName === 'Roster_Rollcall_Checkins'"), 'A25 點名「只接受較新操作」保護應套落四張名單');
// 腳本載入順序
ok(html.includes('js/41-roster-lists.js') && html.indexOf('js/41-roster-lists.js') > html.indexOf('js/40-souvenir-stamps.js'), 'A26 index.html 應按序載入 41-roster-lists.js');

/* ══════════ B. 執行時（vm + DOM mock）：格式／匯入／點名 ══════════ */
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map(m => {
    const attrs = m[1] || '';
    if (/src=/i.test(attrs)) {
      const src = ((attrs.match(/src="([^"]+)"/) || [])[1] || '').split('?')[0];
      return src.startsWith('js/') ? read(src) : '';
    }
    return m[2];
  })
  .join('\n');
const bundle = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);\s*[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';

const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = {
      id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '', files: [], dataset: {},
      addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; },
      getAttribute() { return null; }, closest() { return null }, scrollIntoView() {},
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
let promptAnswer = '';
const context = {
  console, localStorage,
  document: {
    getElementById: el, querySelectorAll: () => [], querySelector: sel => (String(sel || '').includes('rs-imp-mode') ? { value: 'append', checked: true } : null), addEventListener() {},
    createElement: () => el('_new_' + Math.random()), body: { appendChild() {} }
  },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return 'blob:x'; } }, Blob: function Blob() {},
  FileReader: function FileReader() {}, setTimeout() {}, clearTimeout() {},
  fetch: async () => ({ ok: true, json: async () => ({ success: true }) }),
  confirm: () => true, alert() {}, prompt: () => promptAnswer
};
context.window = context;
vm.createContext(context);
vm.runInContext(bundle, context);
context.globalThis = context;

const App = context.TestApp;
function mkApp(user, participants) {
  const app = Object.create(App.prototype);
  Object.assign(app, {
    currentEvent: { event_id: 'isd_2026', event_name: '港島童軍繽紛日2026', start_date: '2026-10-04' },
    currentUser: user, eventData: { participants: participants || [] }, usersList: [], approvalPerms: [],
    gasUrl: '', apiKey: '', pendingChanges: [], meetingsCache: [], tempFiles: {}, systemConfig: {}, execManualSubTab: 'meal_box'
  });
  app.isDemoEvent = () => false;
  return app;
}
const ROLE = { staff: 'staff', director: 'director', gd: 'general_director', vice: 'vice_chairperson' };

const appPublic = mkApp(null);
ok(appPublic.rosterDef('section_award').columns.length === 7, 'B1 支部獎勵格式＝7 欄（區會／支部／旅團／姓名／獎項／編號／備註）');
ok(appPublic.rosterDef('meal_box').columns.map(c => c.k).join(',').includes('qty_a,qty_b,qty_c'), 'B2 代訂餐盒格式含 A／B／C 餐欄');
let panel = appPublic.rosterPanelHTML('section_award', { scope: 'test' });
ok(panel.includes('支部獎勵獲獎名單') && panel.includes('負責組別：會操及典禮組'), 'B3 面板顯示名單名稱＋負責組別');
ok(panel.includes('位置：執行手冊 → 典禮儀式 → 支部獎勵名單'), 'B4 面板講明預定位置');
ok(panel.includes('格式（7 欄）：區會 / 支部') && panel.includes('＋<b>點名 TICK</b>'), 'B4 面板講明預定格式（欄位＋TICK）');
ok(panel.includes('上傳名單（EXCEL／WORD／PDF）') === false && panel.includes('下載格式範本 CSV'), 'B5 公眾只讀：冇上傳掣但有範本');
ok(panel.includes('尚未有支部獎勵獲獎名單'), 'B6 空名單顯示「版位已預留」提示');
ok(panel.includes('名單內容<b>公開可查閱</b>'), 'B7 公眾提示：上傳／點名須登入');

// 權限：負責組別主任以上可管理；其他組別不可
const appCer = mkApp({ name: '典禮主任', role: ROLE.director, group_name: '會操及典禮組', user_id: 'u1' });
const appCoord = mkApp({ name: '協調主任', role: ROLE.director, group_name: '協調組', user_id: 'u2' });
const appAdmin = mkApp({ name: '行政主任', role: ROLE.director, group_name: '行政組', user_id: 'u3' });
const appTheme = mkApp({ name: '節目主任', role: ROLE.director, group_name: '主題節目組', user_id: 'u4' });
ok(appCer.rosterCanManage('section_award') && appCer.rosterCanManage('leader_award'), 'B8 典禮組主任可管理兩份獎勵名單');
ok(!appCer.rosterCanManage('meal_box'), 'B9 典禮組唔可以改代訂餐盒名單');
ok(appCoord.rosterCanManage('meal_box') && !appCoord.rosterCanManage('leader_award'), 'B10 協調組只可管理代訂餐盒名單');
ok(appAdmin.rosterCanManage('meal_box') && appAdmin.rosterCanManage('section_award'), 'B11 行政組統管全站（沿用 v8.14 慣例）');
ok(!appTheme.rosterCanManage('section_award') && !appTheme.rosterCanManage('meal_box'), 'B12 其他組別只讀');
ok(appCoord.rosterCanTick('meal_box') === true, 'B13 負責組別（含普通成員）可點名');
ok(mkApp({ name: '阿明', role: ROLE.staff, group_name: '協調組' }).rosterCanManage('meal_box') === false, 'B14 組內未夠主任級：可點名唔可改名單');
ok(mkApp({ name: '阿明', role: ROLE.staff, group_name: '協調組' }).rosterCanTick('meal_box') === true, 'B14 組內工作人员可點名');
ok(mkApp({ name: '阿明', role: ROLE.staff, group_name: '主題節目組' }).rosterCanTick('meal_box') === false, 'B15 冇關組別唔可以點名');
ok(appCer.canManageExecManualUpload('roster_section_award') === true && appCoord.canManageExecManualUpload('roster_section_award') === false, 'B16 附件區權限跟負責組別');

// Excel 表頭對位（中英文都認）＋ 代訂餐盒自動加總
const excelRows = appCer.rosterMapObjects(appCer.rosterDef('section_award'), [
  { '區會': 'HKW 港島西區', '支部': '童軍', '旅團': '港島第15旅', '姓名': '陳大文', '獎項': '總領袖獎章', '嘉許信編號': 'ISD26/SL/001', '備註': '' },
  { 'area': 'SKW 筲箕灣區', 'section': '深資童軍', 'unit': '港島第6旅', 'name': '李小明', 'award': '榮譽童軍獎章', 'note': '請代領' },
  { '完全唔識嘅欄': 'x' }
]);
ok(excelRows.length === 2 && excelRows[0].name === '陳大文' && excelRows[1].unit === '港島第6旅', 'B17 Excel 匯入按中英表頭對位（冇關鍵欄嘅行會跳過）');
const mealRows = appCoord.rosterMapObjects(appCoord.rosterDef('meal_box'), [
  { '區會': 'HKS 港島南區', '旅團': '港島第175旅', '支部': '小童軍', 'A餐': 20, 'B餐': 15, 'C餐': 5, '備註': '走辣 x3' },
  { '區會': 'CHW 柴灣區', '旅團': '港島第6旅', 'A餐': 25, 'B餐': 20 }
]);
ok(mealRows[0].qty_total === '40' && mealRows[1].qty_total === '45', 'B18 代訂餐盒：總數空缺時 A＋B＋C 自動加總');

// Word 表格 → 行列（有表頭 / 冇表頭都可以），同埋「貼上文字」用同一個 grid parser
const wDef = appCer.rosterDef('leader_award');
const withHeader = appCer.rosterGridToRows(wDef, [
  ['唱名編號', '區會', '所屬單位', '職位', '姓名', '獎項', '覆誓', '備註'],
  ['LS5-1', 'VIC 維多利亞城區', '港島第16旅', '團高級指導員', '張三', '五年長期服務獎狀', '', ''],
  ['LM-1', 'HKN 港島北區', '地域執行委員會', '總監', '李四', '總監委任書', '是', '10:55 前排練覆誓']
]);
ok(withHeader.rows.length === 2 && withHeader.rows[1].oath === '是', 'B19 Word/文字表格（有表頭）按表頭對位');
ok(withHeader.rows[0].no === 'LS5-1' && withHeader.rows[0].rank === '團高級指導員', 'B19b 手冊「編號／職位」表頭（别名）亦對到欄');
const noHeader = appCer.rosterGridToRows(wDef, [
  ['LS3-1', 'CHW 柴灣區', '港島第2旅', '助理總監', '王五', '優異服務獎章', '否', '']
]);
ok(noHeader.rows.length === 1 && noHeader.rows[0].name === '王五' && noHeader.rows[0].no === 'LS3-1', 'B20 冇表頭行時按欄位順序對位');
// 2017 手冊核對：兩張獎勵名單用「出席」做 TICK 欄名；四張名單都俾到格式來源
ok(['section_award', 'leader_award'].every(k => appCer.rosterDef(k).tick_col_label === '出席'), 'B20c 獎勵名單 TICK 欄名跟手冊「出席」');
ok(['section_award', 'leader_award', 'participants', 'meal_box'].every(k => /ROSTER_LIST_DEFS/.test(appCer.rosterDef(k).format_note || '')), 'B20e 每張名單都註明「預設欄位、可改 ROSTER_LIST_DEFS」（唔係死格式）');
{
  const defsBlock0 = (cfg.match(/const ROSTER_LIST_DEFS=\[[\s\S]*?\n\];/) || [''])[0];
  ok(!/20[01]\d/.test(defsBlock0) && !/工作人員手冊/.test(defsBlock0), 'B20g 名單 def／UI 字樣唔引用十年前去處（2025／2026 除外；出處只記喺 docs）');
}
ok(appCer.rosterTableHTML('leader_award', appCer.rosterViewRows('leader_award'), true, false).includes('出席') , 'B20f 表頭顯示「出席」');
const blank = appCer.rosterGridToRows(wDef, [['a'], ['b']]);
ok(blank.rows.length === 0, 'B21 冇必填欄（姓名）嘅行唔會入名單');

// 手動新增／編輯＋TICK（含取消 TICK 必須填原因）
const appGd = mkApp({ name: '典禮總主任', role: ROLE.gd, group_name: '會操及典禮組', user_id: 'u5' });
el('record-modal-title'); el('record-form-fields'); el('record-form'); el('modal-record');
el('rs-mode').value = 'create'; el('rs-id').value = ''; el('rs-key').value = 'section_award';
el('rs-f-area').value = 'HKW 港島西區'; el('rs-f-section').value = '童軍'; el('rs-f-unit').value = '港島第99旅';
el('rs-f-name').value = '趙六'; el('rs-f-award').value = '貝登堡獎章'; el('rs-f-cert_no').value = ''; el('rs-f-notes').value = '試場';
appGd.submitRosterRowForm('section_award');
let rows = appGd.rosterRows('section_award');
ok(rows.length === 1 && rows[0].name === '趙六' && rows[0].award === '貝登堡獎章', 'B22 可逐行新增（版位已預留，未上載前都填到）');
appGd.rosterTick('section_award', encodeURIComponent(rows[0]._key), true);
rows = appGd.rosterRows('section_award');
ok(rows[0]._checked === true && rows[0]._by === '典禮總主任', 'B23 點名 TICK 生效（做法同優異旅團）');
promptAnswer = '';
appGd.rosterTick('section_award', encodeURIComponent(rows[0]._key), false);
ok(appGd.rosterRows('section_award')[0]._checked === true, 'B24 取消 TICK 冇填原因會被打回');
promptAnswer = '誤點';
appGd.rosterTick('section_award', encodeURIComponent(rows[0]._key), false);
ok(appGd.rosterRows('section_award')[0]._checked === false && appGd.rosterRows('section_award')[0]._note === '誤點', 'B25 取消 TICK 需原因並留紀錄');
appGd.rosterTick('section_award', encodeURIComponent(rows[0]._key), true);
ok(appGd.rosterViewRows('section_award')[0]._checked === true, 'B26 重新 TICK 返（唔設永久鎖，同優異旅團一致）');

// 分組進度 chips／排序／匯出／範本
const g = appGd.rosterPanelInnerHTML('section_award', 'test');
ok(g.includes('目前進度：已點名／總數　1/1'), 'B27 進度顯示已點名／總數');
ok(g.includes('按區會') && g.includes('未點名優先'), 'B28 排序選項（按區會／支部／旅團／姓名／未點名優先）');
appGd.rosterSetSort('section_award', 'tick'); ok(appGd['_rosterSort_section_award'] === 'tick', 'B29 排序狀態保存');
let csv = null;
appGd.downloadCSV = (fn, grid) => { csv = { fn, grid }; };
appGd.rosterExportCSV('section_award');
ok(csv && csv.grid[0][0] === '出席' && csv.grid[1][csv.grid[0].indexOf('獲獎人姓名')] === '趙六', 'B30 匯出 CSV 帶點名狀態（欄名跟手冊「出席」）');
ok(appGd.rosterDef('meal_box').tick_col_label === undefined && appGd.rosterDef('meal_box').tick_label === '派發', 'B30b 無 tick_col_label 時 CSV 用 tick_label（派發）');
appGd.rosterDownloadTemplate('section_award');
ok(csv.grid.length === 3 && csv.grid[0].join(',') === '區會,支部,旅團／單位,獲獎人姓名,獎項（支部最高獎章）,嘉許信／證書編號,備註', 'B31 格式範本 CSV＝預定格式表頭＋樣板行');
ok(appGd.rosterDef('participants').columns.map(c => c.label).join('|') === '區會|旅團|支部|人數|領隊／旅長|備註', 'B32 參加旅團名單格式（含區會／領隊）');

// 參加旅團名單：名單仍跟 participants（Drive／Excel），點名存喺名單引擎
const appA = mkApp({ name: '行政總主任', role: ROLE.gd, group_name: '行政組', user_id: 'u6' }, [
  { unit_name: '港島第1旅', section: '童軍', headcount: '30', notes: '' },
  { unit_name: '港島第2旅', section: '幼童軍', headcount: '45', notes: '10:00 前排到' }
]);
ok(appA.rosterRows('participants').length === 2 && appA.rosterRows('participants')[0].unit === '港島第1旅', 'B33 參加旅團點名表直接讀結構表');
appA.rosterTick('participants', encodeURIComponent(appA.rosterRows('participants')[0]._key), true);
ok(appA.rosterRows('participants')[0]._checked === true && appA.getParticipantsData().length === 2 && appA.getParticipantsData()[0].ticked === undefined, 'B34 點名唔污染名單資料（名單仍以結構表為準）');
appA._rosterPending = { participants: { rows: [{ area: '', unit: '港島第3旅', section: '小童軍', headcount: '25', notes: '' }], meta: { source: 'list.xlsx' } } };
appA.applyRosterImport('participants');
ok(appA.getParticipantsData().length === 3, 'B35 匯入（附加）寫返入 participants');
ok(appA.rosterRows('participants')[0]._checked === true, 'B36 匯入後原有報到 TICK 唔會消失');
// 之後補「區會」欄（重新匯入）唔應該弄丟已報到嘅 TICK
appA._rosterPending = { participants: { rows: [{ area: 'CHW 柴灣區', unit: '港島第1旅', section: '童軍', headcount: '32', notes: '' }], meta: { source: 'v2.xlsx' } } };
appA.applyRosterImport('participants');
const p2 = appA.rosterViewRows('participants').find(r => r.unit === '港島第1旅');
ok(p2 && p2._checked === true, 'B37b 補區會後 TICK 保留（對位用旅團＋支部）');
ok(p2 && String(p2.area).includes('柴灣') && String(p2.headcount) === '32', 'B37c 匯入會更新人數／區會');
// 名額總數（TOTAL 一行）
ok(appA.rosterTotalsHTML('participants').includes('人數'), 'B37 參加旅團名單顯示 TOTAL 人數');
// 代訂餐盒 TOTAL ＋對數
const appC = mkApp({ name: '協調總主任', role: ROLE.gd, group_name: '協調組', user_id: 'u7' });
appC.getMealsData = () => ({ menus: [], orders: [{ quantity: 30, status: 'approved' }, { quantity: 5, status: 'pending' }] });
ok(appC.mealBoxDigestHTML().includes('差額'), 'B38 代訂餐盒分頁有「名單 vs 訂餐」對數');

// 執行手冊：代訂餐盒分頁渲染
const execPanel = el('exec-manual-panel');
appC.renderExecManualMealBox(execPanel);
ok(execPanel.innerHTML.includes('代訂餐盒旅團名單：') && execPanel.innerHTML.includes('由協調組負責上載及點名'), 'B39 代訂餐盒分頁（負責組別＝協調組）');
ok(execPanel.innerHTML.includes('TOTAL'), 'B40 代訂餐盒分頁含 TOTAL 匯總');
const tabs = (execPanel.innerHTML.match(/data-roster-panel="meal_box"/g) || []).length;
ok(tabs === 1, 'B41 同一頁唔會重複渲染同一張名單');

// 後端同步：未設 gasUrl 時不發 request（唔會靜靜失真／誤寫）
let fetchCalls = 0;
context.fetch = async () => { fetchCalls++; return { ok: true, json: async () => ({ success: true }) }; };
ok(appC.rosterBackendReady() === false, 'B42 未設後端連線時 rosterBackendReady=false');
appC.rosterPushToGas('meal_box');
appC.rosterPullFromGas('meal_box');
ok(fetchCalls === 0, 'B43 未設後端時名單同步唔會發 request');

// 典禮儀式模組：新分頁（位置喺執行手冊 → 典禮儀式內）
const mod = el('module-content');
appCer.renderCeremonyModule(mod);
ok(mod.innerHTML.includes("switchCeremonyTab('section_award')") && mod.innerHTML.includes('支部獎勵名單'), 'B43 典禮儀式分頁列有「支部獎勵名單」');
ok(mod.innerHTML.includes("switchCeremonyTab('leader_award')") && mod.innerHTML.includes('領袖獎勵名單'), 'B44 典禮儀式分頁列有「領袖獎勵名單」');
ok(mod.innerHTML.includes('ceremony-tab-section_award') && mod.innerHTML.includes('ceremony-tab-leader_award'), 'B45 兩個新分頁有容器');
el('ceremony-tab-section_award').innerHTML = '';
appCer.switchCeremonyTab('section_award');
ok(el('ceremony-tab-section_award').innerHTML.includes('data-roster-panel="section_award"'), 'B46 進入分頁即渲染名單面板');
ok(el('ceremony-tab-section_award').innerHTML.includes('roster-print-cer-section_award'), 'B47 面板有專屬列印區 id（多入口唔會撞 id）');

// 參加旅團名單分頁（執行手冊）：結構表 ＋ 點名 ＋ EXCEL／WORD／PDF 入口
const pPanel = el('exec-manual-panel');
appAdmin.renderExecManualParticipants(pPanel);
ok(pPanel.innerHTML.includes('data-roster-panel="participants"') && pPanel.innerHTML.includes('上傳名單（EXCEL／WORD／PDF）'), 'B48 參加旅團名單分頁掛上點名及上傳入口');
ok(appAdmin.rosterPanelHTML('meal_box', { scope: 'coord' }).includes('roster-print-coord-meal_box'), 'B49 不同入口（scope）產生唔同 id');

// 公眾上傳會被拒（唔會郁資料）
const before = JSON.stringify(appCer.getRosterData());
appPublic.rosterImportFile('section_award', { name: 'list.xlsx' });
ok(JSON.stringify(appCer.getRosterData()) === before, 'B50 未登入者上傳名單會被拒，資料唔變');

// ===== C) 範圍守則：v14 只加咗用戶指定嘅四張名單，冇將 2017 手冊其他章節抄落 app =====
{
  const defKeys = [...cfg.matchAll(/^\s*key:'([a-z_]+)'/gm)].map(m => m[1]).filter(k => ['section_award', 'leader_award', 'participants', 'meal_box'].includes(k)).sort();
  ok(JSON.stringify(defKeys) === JSON.stringify(['leader_award', 'meal_box', 'participants', 'section_award']), 'C1 名單版位只有四張（唔多唔少）');
  // 2017 手冊其他章節（通訊錄／車許可證／水劵飯劵／保險文件／意外通報／攤位設備清單）唔應該因為跟手冊而新增
  const rosterSrc = read('js/41-roster-lists.js') + cfg + read('js/35-ceremony.js') + read('js/36-crisis.js');
  ['車許可證', '水劵', '飯劵', '保險文件', '意外通報指引', '攤位設備清單'].forEach(banned => {
    ok(!rosterSrc.includes(banned), `C2 名單模組冇混入手冊其他章節「${banned}」`);
  });
  // 執行手冊分頁：只有 meal_box 屬新增（participants 屬既有版位）
  const execTabs = (read('js/26-monitor-apply.js').match(/if\(!this\.execManualSubTab\)[\s\S]*?const tabs=\[([\s\S]*?)\];/) || ['', ''])[1];
  const execKeys = [...execTabs.matchAll(/\{k:'([a-z_]+)'/g)].map(m => m[1]);
  ok(JSON.stringify(execKeys) === JSON.stringify(['staff', 'activities', 'ceremony', 'crisis', 'finance_guide', 'documents', 'participants', 'meal_box', 'misc']), 'C3 執行手冊分頁只多咗「代訂餐盒名單」');
  ok((execTabs.match(/label:'[^']*名單'/g) || []).length === 2, 'C3b 執行手冊只有兩張名單分頁（參加旅團／代訂餐盒）');
  // 典禮儀式子分頁：只多咗兩張獎勵名單
  const cerTabs = (read('js/35-ceremony.js').match(/\['rundown'[^\]]*\]/) || [''])[0];
  ok(cerTabs.includes("'section_award'") && cerTabs.includes("'leader_award'") && !/通訊錄|來賓名簿/.test(cerTabs), 'C4 典禮儀式子分頁只加兩張獎勵名單');
  // 部門中心：只加咗 3 個頁籤（協調組餐盒、典禮組兩張名單）
  const core = read('js/10-app-core.js');
  ok((core.match(/k:'coord_mealbox'|k:'cer_award_section'|k:'cer_award_leader'/g) || []).length === 3, 'C5 部門中心只加三個名單頁籤');
  ok(!/k:'(coord_guestbook|coord_carpark|coord_insurance|cer_manual_catalog)'/.test(core), 'C5b 冇為咗跟手冊而新增其他組別頁籤');
  const defsBlock = (cfg.match(/const ROSTER_LIST_DEFS=\[[\s\S]*?\n\];/) || [''])[0];
  const defLabels = [...defsBlock.matchAll(/\{k:'[a-z_]+',label:'([^']+)'/g)].map(m => m[1]);
  ok(defLabels.length >= 20, 'C7a 欄位標籤攞到（每張名單嘅 columns）');
  ok(defLabels.every(l => /區會|支部|旅團|姓名|獎項|嘉許信|證書|備註|人數|領隊|職|需覆誓|編號|餐|總數|取餐/.test(l)), 'C7 欄位清單只包含名單本身欄位（冇混入手冊其他章節欄位）');
  ok(!/通訊錄|車許可證|水劵|飯劵|保險|意外通報|攤位設備|場地圖|遊戲劵|升國旗/.test(defsBlock), 'C8 def 冇混入手冊其他章節（通訊錄／車輛／水飯劵／保險／攤位／地圖／升旗等）');
  // 引擎只認四張名單嘅 key（防止其他人硬塞第五張入嚟但冇 config）
  ok(['section_award', 'leader_award', 'participants', 'meal_box'].every(k => appCer.rosterDef(k)), 'C6 四張名單都搵到 def（config 與引擎一一對應）');
}

console.log(`V14_ROSTER_LISTS_OK (${n} checks)`);