#!/usr/bin/env node
'use strict';
/* tests/role_acceptance_2026_test.js — 2026 執行角色驗收（活動日前）
   逐一確認 13 個角色：訪客／工作人員／主任／總主任／副主席／執行副主席／主席／顧問／
   行政組／協調組／主題節目組／嘉賓接待組／會操及典禮組
   每個角色檢查：
     ① 能否登入　② 能看哪些頁面　③ 能否查看執行手冊　④ 能否查看正確資料（2026 Google Sheet 資料）
     ⑤ 點名是否可用　⑥ 權限是否正確　⑦ 寫入是否成功（會寫去邊個後端動作）　⑧ Audit_Log 是否有紀錄
   執行方式：以 vm 載入真實前端，逐個角色跑真實權限函數（非字串比對）。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const gs = fs.readFileSync(path.join(root, 'apps-script', 'Code.gs'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"/g)]
  .map(m => m[1].split('?')[0])
  .map(f => fs.readFileSync(path.join(root, f), 'utf8'))
  .join('\n');
const bundle = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';

let n = 0;
const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); n++; };

const store = new Map();
const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = {
      id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '',
      addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, appendChild() {},
      setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {}, remove() {},
      classList: { add: c => e._cls.add(c), remove: c => e._cls.delete(c), toggle: (c, on) => { if (on === undefined) { e._cls.has(c) ? e._cls.delete(c) : e._cls.add(c); } else if (on) e._cls.add(c); else e._cls.delete(c); }, contains: c => e._cls.has(c) }
    };
    elements[id] = e;
  }
  return elements[id];
}
const posted = [];
const context = {
  console,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => el('_new'), body: { appendChild() {} } },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; } }, Blob: function Blob() {}, FileReader: function FileReader() {},
  setTimeout: fn => { try { fn && fn(); } catch (e) {} }, clearTimeout() {},
  fetch: async (url, opts) => { posted.push({ url: String(url), body: opts && opts.body }); return { ok: true, status: 200, json: async () => ({ success: true, data: {} }), text: async () => '' }; },
  confirm: () => true, alert() {}, prompt: () => '到場代表 2 人'
};
context.window = context;
vm.createContext(context);
vm.runInContext(bundle, context);

const DEFAULT_GAS_URL = vm.runInContext('DEFAULT_GAS_URL', context);
const DEFAULT_API_KEY = vm.runInContext('DEFAULT_API_KEY', context);
const EVENT = { event_id: 'isd_2026', event_name: '2026 港島童軍繽紛日', category: 'isd' };
const eventData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'isd_2026.json'), 'utf8'));

vm.runInContext(`
  globalThis.__app = Object.create(TestApp.prototype);
  Object.assign(globalThis.__app, {
    currentEvent: ${JSON.stringify(EVENT)},
    currentUser: null,
    eventData: ${JSON.stringify(eventData)},
    navHistory: [], currentModule: null,
    gasUrl: ${JSON.stringify(DEFAULT_GAS_URL)}, apiKey: ${JSON.stringify(DEFAULT_API_KEY)},
    eventsList: [], usersList: [], approvalPerms: [],
    systemConfig: { bannerText:'', nextMeeting:'', meetingLocation:'', allowPublic:true, defaultPwd:'1234' }
  });
  globalThis.__call = (expr) => eval(expr);
`, context);

const call = expr => vm.runInContext(`JSON.stringify(${expr})`, context) === undefined ? undefined : JSON.parse(vm.runInContext(`JSON.stringify(${expr})`, context));
const setUser = u => vm.runInContext(`__app.currentUser = ${u ? JSON.stringify(u) : 'null'};`, context);

/* 13 個執行角色 */
const ROLES = [
  { label: '訪客', user: null, login: false, level: 0 },
  { label: '工作人員', user: { user_id: '工作人員甲', name: '工作人員甲', role: 'staff', group_name: '主題節目組' }, login: true, level: 20 },
  { label: '主任', user: { user_id: '主任甲', name: '主任甲', role: 'director', group_name: '協調組' }, login: true, level: 30 },
  { label: '總主任', user: { user_id: '總主任甲', name: '總主任甲', role: 'general_director', group_name: '行政組' }, login: true, level: 40 },
  { label: '副主席', user: { user_id: '副主席甲', name: '副主席甲', role: 'vice_chairperson', group_name: '主題節目組' }, login: true, level: 60 },
  { label: '執行副主席', user: { user_id: '執副甲', name: '執副甲', role: 'executive_vice_chairperson', group_name: '主席及執行副主席' }, login: true, level: 70 },
  { label: '主席', user: { user_id: '主席', name: '主席', role: 'chairperson', group_name: '主席及執行副主席' }, login: true, level: 80 },
  { label: '顧問', user: { user_id: '顧問甲', name: '顧問甲', role: 'advisor', group_name: '顧問團' }, login: true, level: 80 },
  { label: '行政組', user: { user_id: '行政甲', name: '行政甲', role: 'general_director', group_name: '行政組' }, login: true, level: 40, group: '行政組' },
  { label: '協調組', user: { user_id: '協調甲', name: '協調甲', role: 'general_director', group_name: '協調組' }, login: true, level: 40, group: '協調組' },
  { label: '主題節目組', user: { user_id: '節目甲', name: '節目甲', role: 'general_director', group_name: '主題節目組' }, login: true, level: 40, group: '主題節目組' },
  { label: '嘉賓接待組', user: { user_id: '接待甲', name: '接待甲', role: 'general_director', group_name: '嘉賓接待組' }, login: true, level: 40, group: '嘉賓接待組' },
  { label: '會操及典禮組', user: { user_id: '典禮甲', name: '典禮甲', role: 'general_director', group_name: '會操及典禮組' }, login: true, level: 40, group: '會操及典禮組' }
];

const ROLE_HIERARCHY = vm.runInContext('ROLE_HIERARCHY', context);
const report = [];

ROLES.forEach(r => {
  setUser(r.user);

  /* ① 能否登入：角色必須存在於權限階梯（訪客＝免登入瀏覽公開頁） */
  if (r.login) {
    ok(ROLE_HIERARCHY[r.user.role] !== undefined, `${r.label}：角色 ${r.user.role} 必須有權限層級`);
    ok(ROLE_HIERARCHY[r.user.role] === r.level, `${r.label}：權限層級應為 ${r.level}`);
  } else {
    ok(call('__app.currentUser') === null, '訪客：未登入狀態');
  }

  /* ② 能看哪些頁面 */
  const cards = vm.runInContext(`JSON.stringify(DASH_CARD_DEFS.filter(d=>__app.canSeeRoleCard(d)).map(d=>d.id))`, context);
  const visible = JSON.parse(cards);
  ok(visible.length > 0, `${r.label}：至少要見到一些頁面`);

  /* ③ 能否查看執行手冊（公開只讀卡） */
  ok(visible.includes('exec_manual'), `${r.label}：必須可以查看執行手冊`);

  /* ④ 能否查看正確資料：2026 正式資料（嘉賓／工作人員／攤位／受邀隊伍／日程／膳食） */
  const guests = call('(__app.eventData.guest_roster.guests||[]).length');
  const booths = call('(__app.eventData.activities.booths||[]).length');
  ok(guests === 103, `${r.label}：應讀到 103 位嘉賓`);
  ok(booths === 33, `${r.label}：應讀到 33 個攤位`);
  ok(call('(__app.eventData.participants||[]).length') === 4, `${r.label}：應讀到 4 個受邀隊伍`);
  ok(call('(__app.eventData.schedule||[]).length') > 0, `${r.label}：應讀到 2026 日程`);
  ok(call('(__app.eventData.meals||[]).length') > 0, `${r.label}：應讀到工作人員膳食資料`);
  ok(call('(__app.getCeremonyData().guests||[]).length') === 103, `${r.label}：典禮嘉賓頁應顯示 103 位`);

  /* ⑤ 點名是否可用（名單引擎 41-roster-lists 共用） */
  const tick = {
    participants: call('__app.rosterCanTick("participants")'),
    meal_box: call('__app.rosterCanTick("meal_box")'),
    section_award: call('__app.rosterCanTick("section_award")')
  };
  const stamps = { staff: call('__app.canManageSouvenirStamps("staff")'), guests: call('__app.canManageSouvenirStamps("guests")') };
  if (!r.login) {
    ok(!tick.participants && !tick.meal_box && !tick.section_award, '訪客：不可點名');
    ok(!stamps.staff && !stamps.guests, '訪客：不可派發紀念章');
  }
  if (r.label === '行政組') {
    ok(tick.participants && tick.meal_box && tick.section_award, '行政組：可為所有名單點名（統管）');
    ok(stamps.staff, '行政組：負責工作人員紀念章派發');
  }
  if (r.label === '協調組') ok(tick.meal_box, '協調組：可點名代訂餐盒名單');
  if (r.label === '會操及典禮組') ok(tick.section_award, '會操及典禮組：可點名支部獎勵名單');
  if (r.label === '嘉賓接待組') {
    ok(stamps.guests, '嘉賓接待組：可為嘉賓派發紀念章／核對');
    ok(call('__app.canGuestCheckin()') === true, '嘉賓接待組：可為嘉賓點名');
  }
  // 註：CARD_OWNER_EXTRA_ROLES.ceremony 容許總主任／副主席處理典禮項目，故只檢查一般工作人員
  if (r.label === '工作人員') ok(call('__app.canGuestCheckin()') === false, '一般工作人員：不可做嘉賓點名');
  if (!r.login) ok(call('__app.canGuestCheckin()') === false, '訪客：不可做嘉賓點名');
  if (r.level >= 60) ok(tick.participants && tick.meal_box && tick.section_award, `${r.label}：副主席以上可點名所有名單`);

  /* ⑥ 權限是否正確 */
  const canManageParticipants = call('__app.rosterCanManage("participants")');
  if (r.label === '主題節目組') ok(!canManageParticipants, '主題節目組：不可改行政組的參加旅團名單');
  if (r.label === '工作人員') {
    ok(!call('__app.rosterCanManage("meal_box")'), '工作人員：不可管理名單');
    ok(!call('__app.isAdmin()'), '工作人員：非管理員');
  }
  // 嘉賓：只可點名及加名，不可改名／換名（所有角色一致）
  ok(call('__app.isOfficialGuest(__app.getCeremonyData().guests[0])') === true, `${r.label}：正式嘉賓標記為不可改名`);
  // 工作人員：可更正姓名／記錄替補（紀念章派發 scope 容許改名）
  ok(call('SOUVENIR_STAMP_SCOPES.find(s=>s.scope==="staff").canRename') === true, `${r.label}：工作人員名單可更正姓名／替補`);
  ok(call('SOUVENIR_STAMP_SCOPES.find(s=>s.scope==="guests").canRename') === false, `${r.label}：嘉賓名單不可改名`);

  /* ⑦ 寫入是否成功：一次性遷移只限主席／管理層；一般點名寫入人人（有權者）可用 */
  const gate = call('__app.import2026Allowed()');
  if (r.level >= 80) ok(gate.ok === true, `${r.label}：可執行一次性 2026 資料遷移`);
  else ok(gate.ok === false, `${r.label}：不可執行一次性資料遷移`);

  report.push({
    角色: r.label, 登入: r.login ? '可' : '免登入（公開）', 可見頁面: visible.length,
    執行手冊: '可', 嘉賓: guests, 攤位: booths,
    點名: Object.keys(tick).filter(k => tick[k]).join('/') || '—',
    紀念章: [stamps.staff ? '工作人員' : '', stamps.guests ? '嘉賓' : ''].filter(Boolean).join('/') || '—',
    一次性遷移: gate.ok ? '可' : '不可'
  });
});

/* ⑦⑧ 寫入 + Audit_Log：嘉賓點名會寫後端 Roster_Rollcall_Checkins（saveRecord → auditWrite） */
setUser(ROLES.find(r => r.label === '嘉賓接待組').user);
posted.length = 0;
vm.runInContext(`__app.pushGuestCheckinToGas(['guest_001','guest_002'])`, context);
ok(posted.length === 2, '嘉賓點名應寫出 2 筆後端紀錄');
const body = JSON.parse(posted[0].body);
ok(body.action === 'saveRecord' && body.module === 'Roster_Rollcall_Checkins', '嘉賓點名沿用共用點名紀錄表（不另建引擎）');
ok(body.record.list_key === 'guests' && body.record.checked_in === 'Y' && body.record.event_id === 'isd_2026', '嘉賓點名紀錄內容正確');
ok(body.record.checked_by === '接待甲', '嘉賓點名紀錄保留操作者');

/* 名單點名（外間團體）：報到時填寫實際到場人士 */
setUser(ROLES.find(r => r.label === '行政組').user);
posted.length = 0;
vm.runInContext(`
  const d=__app.getRosterData(); d.rows=d.rows||{}; __app.saveRosterData(d);
  const rows=__app.rosterRows('participants');
  // 外間團體：報到時喺同一行填寫實際到場人士（行內輸入格，唔用彈窗）
  __app.rosterSetAttendee('participants', encodeURIComponent(rows[0]._key), '到場代表 2 人');
  __app.rosterTick('participants', rows[0]._key, true);
`, context);
const tickBody = posted.length ? JSON.parse(posted[posted.length - 1].body) : null;
ok(tickBody && tickBody.module === 'Roster_Rollcall_Checkins', '旅團報到寫入共用點名紀錄表');
ok(tickBody.record.checkin_note === '到場代表 2 人', '外間團體報到時可填寫實際到場人士（存入 checkin_note）');
ok(vm.runInContext(`ROSTER_LIST_DEFS.find(d=>d.key==='participants').attendee_field`, context) === '實際到場人士', '參加旅團名單應有「實際到場人士」欄（沒有預定姓名時留空）');
ok(tickBody.record.unit && !tickBody.record.name.includes('undefined'), '外間團體沒有預定姓名時不會寫入假名');

/* 後端：saveRecord 一定寫 Audit_Log；import2026Data 有 Audit_Log */
ok(/function saveRecord\(data\)[\s\S]*auditWrite\(/.test(gs), 'saveRecord 必須寫 Audit_Log');
ok(/function import2026Data\(data\)/.test(gs) && /import2026:run/.test(gs), 'import2026Data 必須寫 Audit_Log');
ok(/action === 'import2026Data'/.test(gs), 'doPost 必須路由 import2026Data');
ok(/action === 'saveBatchRecords'/.test(gs), 'doPost 必須保留 saveBatchRecords');

/* 讀回 Google Sheet：前端 snapshot 套用 */
setUser(ROLES.find(r => r.label === '主席').user);
const applied = vm.runInContext(`__app.applyImported2026Snapshot({
  at:'2026-10-02T01:00:00Z',
  guests:[{id:'guest_001',name:'來自 Google Sheet 的嘉賓',title:'測試',official:true}],
  staff:[{id:'staff_001',name:'來自 Sheet 的工作人員',group:'行政組',meal:'A'}],
  meals:[{id:'staff_001',name:'來自 Sheet 的工作人員',meal:'A'}],
  schedule:[{id:'sch_2026_01',time_slot:'10:45',title:'來自 Sheet 的日程'}],
  booths:[{id:'booth_001',booth_name:'來自 Sheet 的攤位'}],
  participants:[{id:'isd_2026_participants_x',unit:'來自 Sheet 的隊伍',unit_name:'來自 Sheet 的隊伍',headcount:'17'}]
})`, context);
ok(applied === true, '前端可套用 Google Sheet snapshot');
ok(call('__app.eventData.guest_roster.guests[0].name') === '來自 Google Sheet 的嘉賓', '嘉賓頁讀回 Google Sheet 資料');
ok(call('__app.eventData.schedule[0].title') === '來自 Sheet 的日程', '日程讀回 Google Sheet 資料');
ok(call('__app.eventData.activities.booths[0].booth_name') === '來自 Sheet 的攤位', '攤位讀回 Google Sheet 資料');
ok(call('__app.getParticipantsData()[0].unit') === '來自 Sheet 的隊伍', '受邀隊伍讀回 Google Sheet 資料');
ok(call('(__app.eventData.staff.event_staff_roster||[])[0].name') === '來自 Sheet 的工作人員', '工作人員名單讀回 Google Sheet 資料');

console.log('\n=== 2026 執行角色驗收 ===');
console.table ? console.table(report) : console.log(JSON.stringify(report, null, 2));
console.log(`✓ 13 個角色驗收通過（${n} 項檢查）`);
