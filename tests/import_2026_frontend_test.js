#!/usr/bin/env node
'use strict';
/* tests/import_2026_frontend_test.js — 前端一次性遷移流程
   ① 主席按「一次性寫入 Google Sheet」→ 全部分頁以 import2026Data 分批寫出（只送 isd_2026）
   ② 後端仍是舊版（Unknown POST action）→ 自動改用 saveBatchRecords 寫既有分頁，並明確報告未寫入的分頁
   ③ 執行手冊「2026 資料」面板有遷移按鈕及 Google Sheet 狀態
   ④ 一般工作人員不可執行遷移 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"/g)]
  .map(m => m[1].split('?')[0]).map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const bundle = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';

let n = 0;
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); n++; };

const store = new Map();
const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = { id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '',
      addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, appendChild() {},
      setAttribute() {}, getAttribute: () => null, focus() {}, click() {}, remove() {},
      classList: { add: c => e._cls.add(c), remove: c => e._cls.delete(c), toggle: () => {}, contains: c => e._cls.has(c) } };
    elements[id] = e;
  }
  return elements[id];
}
const calls = [];
let mode = 'new';
const context = {
  console,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => el('_new'), body: { appendChild() {} } },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL: () => '' }, Blob: function () {}, FileReader: function () {},
  setTimeout: fn => { try { fn && fn(); } catch (e) {} }, clearTimeout() {},
  confirm: () => true, alert() {}, prompt: () => '',
  fetch: async (url, opts) => {
    const u = String(url);
    if (!opts) {
      if (u.includes('data/isd_2026.json')) return { ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, 'data', 'isd_2026.json'), 'utf8')) };
      return { ok: true, json: async () => ({ success: true, data: {} }) };
    }
    const body = JSON.parse(opts.body);
    calls.push(body);
    if (body.action === 'import2026Data' && mode === 'old') return { ok: true, json: async () => ({ success: false, error: 'Unknown POST action' }) };
    if (body.action === 'import2026Data') {
      const rows = Object.values(body.sections)[0] || [];
      return { ok: true, json: async () => ({ success: true, created: rows.length, updated: 0, unchanged: 0, audit_rows: rows.length + 1 }) };
    }
    if (body.action === 'saveBatchRecords') return { ok: true, json: async () => ({ success: true, count: body.records.length }) };
    return { ok: true, json: async () => ({ success: true }) };
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(bundle, context);

const DEFAULT_GAS_URL = vm.runInContext('DEFAULT_GAS_URL', context);
const DEFAULT_API_KEY = vm.runInContext('DEFAULT_API_KEY', context);
vm.runInContext(`
  globalThis.__app = Object.create(TestApp.prototype);
  Object.assign(globalThis.__app, {
    currentEvent: { event_id:'isd_2026', event_name:'2026', category:'isd' },
    currentUser: { user_id:'主席', name:'主席', role:'chairperson', group_name:'主席及執行副主席' },
    eventData: {}, navHistory: [], currentModule: null,
    gasUrl: ${JSON.stringify(DEFAULT_GAS_URL)}, apiKey: ${JSON.stringify(DEFAULT_API_KEY)},
    eventsList: [], usersList: [], approvalPerms: [],
    systemConfig: { bannerText:'', nextMeeting:'', meetingLocation:'', allowPublic:true, defaultPwd:'1234' }
  });
`, context);
const run = expr => vm.runInContext(expr, context);

(async () => {
  /* ① 新後端：全部以 import2026Data 寫出 */
  const r1 = await run(`__app.runImport2026()`);
  const imports = calls.filter(c => c.action === 'import2026Data');
  ok(imports.length === 13, `應分 13 批 import2026Data（實際 ${imports.length}）`);
  ok(imports.every(c => c.event_id === 'isd_2026'), '每批都必須標明 event_id=isd_2026（不可寫 2027）');
  ok(imports.every(c => c.api_key && c.updated_by === '主席'), '每批都要帶 api_key 及操作者（Audit_Log 用）');
  const sheets = new Set(imports.map(c => Object.keys(c.sections)[0]));
  ['Guests', 'Staff', 'Staff_Meals', 'Schedule', 'Activities', 'Roster_Lists'].forEach(s => ok(sheets.has(s), `必須寫入分頁 ${s}`));
  ok(r1.counts.Guests === 103 && r1.counts.Activities === 31 && r1.counts.Roster_Lists === 4, '數量：103 嘉賓／31 攤位／4 受邀隊伍');
  ok(r1.total.created === 103 + 31 + 4 + r1.counts.Staff + r1.counts.Staff_Meals + r1.counts.Schedule, '全部行都寫出');
  ok(r1.success === true, '新後端下應全部成功');
  // 逐欄寫入，不可把整份 JSON 塞一欄
  const guestRow = imports.find(c => c.sections.Guests).sections.Guests[0];
  ok(guestRow.name && guestRow.guest_id && guestRow.title !== undefined, '嘉賓逐欄寫入');
  ok(!JSON.stringify(guestRow).includes('"guest_roster"'), '不可把整份 JSON 塞入單一欄位');

  /* ② 舊後端：自動後備 saveBatchRecords，並報告未寫入分頁 */
  calls.length = 0; mode = 'old';
  const r2 = await run(`__app.runImport2026()`);
  ok(calls.some(c => c.action === 'saveBatchRecords'), '舊後端應自動改用 saveBatchRecords');
  const fb = calls.filter(c => c.action === 'saveBatchRecords');
  ok(fb.every(c => c.records.every(x => x.record.event_id === 'isd_2026')), '後備寫入同樣只寫 2026');
  ok(r2.fallback === true && r2.skipped.includes('Guests'), '必須明確報告 Guests 等新分頁未寫入（要重新部署 Code.gs）');
  ok(r2.success === false, '有分頁未寫入時不可報告成功');
  mode = 'new';

  /* ③ 執行手冊 2026 資料面板 */
  run(`__app.renderExecManual2026Panel(document.getElementById('panel-test'))`);
  const h = elements['panel-test'].innerHTML;
  ok(h.includes('一次性寫入 2026 資料至 Google Sheet'), '面板應有一次性遷移按鈕（主席可見）');
  ok(h.includes('由 Google Sheet 取回資料') && h.includes('查詢 Google Sheet 狀態'), '面板應有讀回及狀態查詢');
  ok(h.includes('Audit_Log'), '面板應顯示 Audit_Log 狀態');

  /* ④ 一般工作人員不可遷移 */
  run(`__app.currentUser={user_id:'員工',name:'員工',role:'staff',group_name:'主題節目組'}`);
  run(`__app.renderExecManual2026Panel(document.getElementById('panel-staff'))`);
  ok(!elements['panel-staff'].innerHTML.includes('一次性寫入 2026 資料至 Google Sheet'), '工作人員不應見到遷移按鈕');
  const gate = JSON.parse(vm.runInContext('JSON.stringify(__app.import2026Allowed())', context));
  ok(gate.ok === false, '工作人員不可執行遷移');

  console.log(`✓ 前端 2026 遷移流程測試通過（${n} 項）`);
})().catch(e => { console.error(e); process.exit(1); });
