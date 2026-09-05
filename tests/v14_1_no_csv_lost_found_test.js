#!/usr/bin/env node
'use strict';
/* v14.1 回歸測試（2026-09-05，對應用戶六點跟進）：
   ① 名單引擎可俾部門點名（TICK／取消需原因／分組確認）——同紀念章一樣
   ② 名單工具列按鈕唔會白底白字（<label> onchange 屬性收尾引號；淺色掣明寫深色字）
   ③ 面板冇「預設欄位格式…ROSTER_LIST_DEFS…」段落
   ④ 失物認領：確認認領／尋回唔會刪紀錄；有尋回率、按日摘要、報告匯出
   ⑤⑥ 全站冇 CSV 匯出／匯入：只有 Excel（.xlsx）／Word（.doc）／PDF（列印） */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const jsFiles = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).sort();
const allJs = jsFiles.map(f => ({ f, src: read('js/' + f) }));
let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

/* ══════════ A. 源碼層面 ══════════ */
// ⑤⑥ 冇 CSV：冇 text/csv Blob、冇 .csv accept、冇「CSV」按鈕字樣（內部 Google 試算表 export=csv 同 committee_accounts.csv 除外）
allJs.forEach(({ f, src }) => {
  ok(!/text\/csv/.test(src), `A1 ${f} 冇 text/csv Blob`);
  ok(!/accept="[^"]*\.csv/.test(src), `A2 ${f} 上傳 input 唔收 .csv`);
  ok(!/download=['"`][^'"`]*\.csv/.test(src) && !/a\.download=`[^`]*\.csv`/.test(src), `A3 ${f} 冇下載 .csv 檔名`);
});
ok(!/accept="[^"]*\.csv/.test(html) && !/下載範本 CSV|匯出 CSV|CSV \/ JSON/.test(html), 'A4 index.html 冇 CSV 上傳／範本／匯出字樣');
// 按鈕文字：唔可以出現「匯出 CSV」「範本 CSV」「上傳CSV」等
const uiCsv = [];
allJs.forEach(({ f, src }) => {
  const m = src.match(/(匯出[^<`'"]{0,12}CSV|範本 CSV|上傳 ?CSV[^<`'"]{0,8}|CSV 批量|CSV\/JSON 上傳)/g);
  if (m) uiCsv.push(f + ': ' + m.join(' | '));
});
ok(uiCsv.length === 0, 'A5 介面按鈕／標題冇 CSV 字樣：' + uiCsv.join('; '));
// 內部同步保留（Google 試算表 export=csv 係機器對機器，唔係俾用戶落手）
ok(read('js/21-activities.js').includes('export?format=csv') && read('js/00-config.js').includes('function parseCSV'), 'A6 內部 Google 試算表 export=csv 同步保留');
// 共用匯出器
const cfg = read('js/00-config.js');
ok(cfg.includes('function downloadExcel(') && cfg.includes('XLSX.utils.aoa_to_sheet') && cfg.includes('XLSX.writeFile'), 'A7 downloadExcel 用 SheetJS 出 .xlsx');
ok(cfg.includes('function downloadWord(') && cfg.includes('application/msword'), 'A8 downloadWord 出 .doc');
ok(cfg.includes('function readTabularFile(') && cfg.includes('系統已不接受 CSV'), 'A9 readTabularFile 只收 Excel／JSON，CSV 會俾清楚提示');
ok(html.includes('xlsx.full.min.js'), 'A10 index.html 已載入 SheetJS');
// ③ format_note 已刪
ok(!cfg.includes('format_note') && !read('js/41-roster-lists.js').includes('format_note'), 'A11 format_note 已由 ROSTER_LIST_DEFS／MERIT_AWARD_ROSTER_DEF／面板移除');
// ② 工具列 label 屬性收尾
const roster = read('js/41-roster-lists.js');
ok(roster.includes(`onchange="app.rosterImportFile('\${def.key}',this.files[0]);this.value=''"></label>`), 'A12 上傳 <label> onchange 有收尾引號（修正白底白字根因）');
ok(roster.includes("const light='bg-white border border-slate-300 text-slate-700"), 'A13 淺色按鈕統一明寫深色字');
ok(html.includes('.md\\:grid-cols-5') && html.includes('.bg-white\\/70') && html.includes('.text-amber-300'), 'A14 index.html 補回欠缺工具類（含尋回率第 5 格）');
// ① 點名能力（同紀念章模組一樣可俾部門逐行 TICK）
ok(roster.includes('rosterTick(') && roster.includes('rosterCanTick(') && roster.includes('rosterConfirmGroup') && roster.includes('Roster_Rollcall'), 'A15 名單引擎有逐行 TICK／權限／分組確認／後端留痕');
// ④ 失物認領
const lf = read('js/39-lost-found.js');
ok(lf.includes('lostFoundStats(') && lf.includes('lostFoundDaily(') && lf.includes('尋回率'), 'A16 失物認領有尋回率＋按日摘要');
ok(lf.includes('exportLostFoundExcel(') && lf.includes('exportLostFoundWord(') && lf.includes("printCoordArea('lost-found-print'"), 'A17 失物認領報告：Excel／Word／列印(PDF)');

/* ══════════ B. 執行時（vm + DOM mock） ══════════ */
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].map(m => {
  const attrs = m[1] || '';
  if (/src=/i.test(attrs)) { const src = ((attrs.match(/src="([^"]+)"/) || [])[1] || '').split('?')[0]; return src.startsWith('js/') ? read(src) : ''; }
  return m[2];
}).join('\n');
const bundle = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);\s*[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';
const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = { id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '', files: [], dataset: {}, addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, getAttribute() { return null; }, closest() { return null; }, scrollIntoView() {}, appendChild() {}, remove() {}, click() { clicks.push(e); },
      classList: { add: c => e._cls.add(c), remove: c => e._cls.delete(c), toggle: (c, on) => { const want = on === undefined ? !e._cls.has(c) : !!on; want ? e._cls.add(c) : e._cls.delete(c); }, contains: c => e._cls.has(c) } };
    elements[id] = e;
  }
  return elements[id];
}
const clicks = [];
const blobs = [];
const store = new Map();
const localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
// SheetJS mock：記錄 writeFile 檔名＋工作表
const xlsxCalls = [];
const XLSX = {
  utils: { book_new: () => ({ SheetNames: [], Sheets: {} }), aoa_to_sheet: aoa => ({ aoa }), book_append_sheet: (wb, ws, name) => { wb.SheetNames.push(name); wb.Sheets[name] = ws; }, sheet_to_json: () => [] },
  writeFile: (wb, fn) => xlsxCalls.push({ fn, sheets: wb.SheetNames.slice(), wb }),
  read: () => ({ SheetNames: ['S'], Sheets: { S: {} } })
};
const context = {
  console, localStorage, XLSX,
  document: { getElementById: el, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, createElement: () => el('_new_' + Math.random()), body: { appendChild() {} } },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL(b) { return 'blob:' + blobs.push(b); }, revokeObjectURL() {} },
  Blob: function Blob(parts, o) { this.parts = parts; this.type = (o || {}).type; },
  FileReader: function FileReader() {}, setTimeout(fn) { return 0; }, clearTimeout() {},
  fetch: async () => ({ ok: true, json: async () => ({ success: true }) }),
  confirm: () => true, alert() {}, prompt: () => '更正原因：按錯', Date, Math, JSON, Number, String, Array, Object, RegExp, Promise, Error, Set, Map
};
context.window = context; context.globalThis = context;
vm.createContext(context);
vm.runInContext(bundle, context);
const App = context.TestApp;
function mkApp(user) {
  const app = Object.create(App.prototype);
  Object.assign(app, { currentEvent: { event_id: 'isd_2026', event_name: '港島童軍繽紛日2026', start_date: '2026-10-04' }, currentUser: user, eventData: { participants: [] }, usersList: [], approvalPerms: [], gasUrl: '', apiKey: '', pendingChanges: [], meetingsCache: [], tempFiles: {}, systemConfig: {} });
  app.isDemoEvent = () => false;
  return app;
}
const admin = mkApp({ name: '行政主任', role: 'director', group_name: '行政組', user_id: 'u_admin', mock_admin: true });

// B1 downloadExcel → .xlsx via SheetJS；.csv 檔名會改成 .xlsx
context.downloadExcel('test_export.csv', [['a', 'b'], [1, 2]], { sheet: '工作表' });
ok(xlsxCalls.length === 1 && xlsxCalls[0].fn === 'test_export.xlsx' && xlsxCalls[0].sheets[0] === '工作表', 'B1 downloadExcel 出 .xlsx（.csv 檔名自動改 .xlsx）');
// B2 downloadWord → .doc blob
context.downloadWord('report.doc', '測試報告', '<table><tr><td>x</td></tr></table>', { meta: 'm' });
const lastBlob = blobs[blobs.length - 1];
ok(lastBlob && /msword/.test(lastBlob.type) && /測試報告/.test(lastBlob.parts.join('')) && /<table>/.test(lastBlob.parts.join('')), 'B2 downloadWord 出 application/msword，內容含標題＋表格');
// B3 app.downloadCSV 舊名 → Excel
xlsxCalls.length = 0;
admin.downloadCSV('物資最終清單_x.csv', [['h'], ['v']]);
ok(xlsxCalls.length === 1 && xlsxCalls[0].fn === '物資最終清單_x.xlsx', 'B3 舊 downloadCSV 呼叫一律變 Excel');

// B4 名單引擎：可 TICK（部門點名）→ 匯出 Excel／Word 帶狀態
const cer = mkApp({ name: '典禮主任', role: 'director', group_name: '會操及典禮組', user_id: 'u_cer' });
el('record-modal-title'); el('record-form-fields'); el('record-form'); el('modal-record');
el('rs-mode').value = 'create'; el('rs-id').value = ''; el('rs-key').value = 'section_award';
el('rs-f-area').value = 'HKW 港島西區'; el('rs-f-section').value = '童軍'; el('rs-f-unit').value = '港島第15旅';
el('rs-f-name').value = '陳大文'; el('rs-f-award').value = '總領袖獎章'; el('rs-f-cert_no').value = ''; el('rs-f-notes').value = '';
cer.submitRosterRowForm('section_award');
ok(cer.rosterRows('section_award').length === 1 && cer.rosterCanTick('section_award'), 'B4 負責組別（典禮組）主任可新增行＋可點名');
cer.rosterTick('section_award', encodeURIComponent(cer.rosterRows('section_award')[0]._key), true);
ok(cer.rosterViewRows('section_award')[0]._checked === true, 'B4b TICK 成功（同紀念章一樣逐行點名）');
xlsxCalls.length = 0; cer.rosterExportExcel('section_award');
ok(xlsxCalls[0] && /支部獎勵獲獎名單_.*\.xlsx$/.test(xlsxCalls[0].fn) && xlsxCalls[0].wb.Sheets[xlsxCalls[0].sheets[0]].aoa[1][0] === '已點名', 'B4c 匯出 Excel 第一欄「出席」＝已點名');
cer.rosterExportWord('section_award');
ok(/msword/.test(blobs[blobs.length - 1].type) && /已點名/.test(blobs[blobs.length - 1].parts.join('')), 'B4d 匯出 Word 帶點名狀態');
const panel = cer.rosterPanelInnerHTML('section_award', 'test');
ok(!panel.includes('CSV') && !panel.includes('ROSTER_LIST_DEFS') && panel.includes('匯出 Excel') && panel.includes('匯出 Word') && panel.includes('列印／PDF'), 'B4e 面板：冇 CSV、冇 format_note，有 Excel／Word／PDF');
// 工具列結構：<label ...></label> 之後先係 button（唔會被吞入）
const tb = panel.slice(panel.indexOf('<label class="'), panel.indexOf('</label>') + 8);
ok(!tb.includes('<button'), 'B4f 上傳 <label> 內冇 button（工具列按鈕係兄弟元素，唔會繼承 text-white）');

// B5 失物認領：確認認領後紀錄保留＋尋回率＋按日摘要＋報告
const lfd = admin.getLostFoundData(); lfd.records = [
  { id: 'l1', type: 'found', item_name: '水樽', found_date: '2026-10-04', found_by: '陳同學', status: '待認領', created_at: '2026-10-04 10:00' },
  { id: 'l2', type: 'seeking', item_name: '銀包', found_date: '2026-10-04', found_by: '李領袖', contact: '9123', status: '尋找中', created_at: '2026-10-04 11:00' },
  { id: 'l3', type: 'found', item_name: '童軍帽', found_date: '2026-10-05', found_by: '王同學', status: '待認領', created_at: '2026-10-05 09:00' }
]; admin.saveLostFoundData(lfd);
el('lfc-id').value = 'l1'; el('lfc-by').value = '張小明'; el('lfc-contact').value = '9876'; el('lfc-notes').value = '核對學生證';
admin.confirmLostFoundClaim();
const after = admin.getLostFoundData().records;
ok(after.length === 3 && after.find(r => r.id === 'l1').status === '已認領' && after.find(r => r.id === 'l1').claimed_by === '張小明' && after.find(r => r.id === 'l1').claimed_at, 'B5 確認認領：紀錄保留（唔會刪）、狀態＝已認領、有物主＋自動時間');
const st = admin.lostFoundStats();
ok(st.total === 3 && st.closed === 1 && st.rate === 33 && st.found === 2 && st.seeking === 1, 'B5b 尋回率＝已完成÷全部＝33%');
const daily = admin.lostFoundDaily();
ok(daily.length === 2 && daily[1].day === '2026-10-04' && daily[1].stats.total === 2 && daily[1].stats.rate === 50 && daily[1].owners.join(';').includes('水樽→張小明') && daily[1].owners.join(';').includes('銀包→李領袖'), 'B5c 按日摘要：當日失咗乜、物主／尋物者係邊個、當日尋回率');
const lfHtml = admin.renderLostFoundHTML({});
ok(lfHtml.includes('尋回率') && lfHtml.includes('33%') && lfHtml.includes('按日摘要') && lfHtml.includes('匯出報告 Excel') && lfHtml.includes('匯出報告 Word') && lfHtml.includes('列印／PDF') && !lfHtml.includes('CSV'), 'B5d 失物頁：尋回率格、按日摘要、Excel／Word／PDF 報告，冇 CSV');
xlsxCalls.length = 0; admin.exportLostFoundExcel();
ok(xlsxCalls[0] && /失物認領報告_.*\.xlsx$/.test(xlsxCalls[0].fn) && xlsxCalls[0].sheets.length === 2 && xlsxCalls[0].sheets[0].includes('尋回率'), 'B5e 失物報告 Excel：兩張工作表（按日摘要＋全部紀錄）');
admin.exportLostFoundWord();
ok(/msword/.test(blobs[blobs.length - 1].type) && /尋回率 33%/.test(blobs[blobs.length - 1].parts.join('')) && /張小明/.test(blobs[blobs.length - 1].parts.join('')), 'B5f 失物報告 Word 含尋回率＋物主');
admin.reopenLostFound('l1');
ok(admin.getLostFoundData().records.length === 3 && admin.getLostFoundData().records.find(r => r.id === 'l1').status === '待認領', 'B5g 取消完成都係改狀態，唔會刪');

// B6 readTabularFile：CSV 會俾清楚提示；Excel／JSON 可讀
(async () => {
  let err = null; try { await context.readTabularFile({ name: 'x.csv', text: async () => 'a,b' }); } catch (e) { err = e; }
  ok(err && /不接受 CSV/.test(err.message), 'B6 上傳 .csv 會提示「系統已不接受 CSV」');
  const j = await context.readTabularFile({ name: 'x.json', text: async () => '[{"a":1}]' });
  ok(j.kind === 'json' && j.rows[0].a === 1, 'B6b JSON 仍可讀（技術備份）');
  const x = await context.readTabularFile({ name: 'x.xlsx', arrayBuffer: async () => new ArrayBuffer(0) });
  ok(x.kind === 'excel' && Array.isArray(x.rows), 'B6c Excel 經 SheetJS 讀');
  console.log(`V14_1_NO_CSV_LOST_FOUND_OK (${n} checks)`);
})().catch(e => { console.error(e.message); process.exit(1); });
