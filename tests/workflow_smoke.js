#!/usr/bin/env node
'use strict';

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
  /const app=window\.app=new ScoutEventApp\(\);[\s\S]*$/,
  ''
) + '\nglobalThis.TestApp=ScoutEventApp; globalThis.TestLS=LS; globalThis.TestPERM=PERM_CARDS;';

const store = new Map();
const localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key)
};
const stub = () => ({
  classList: { add() {}, remove() {}, contains() { return true; }, toggle() {} },
  style: {}, textContent: '', innerHTML: '', value: '',
  addEventListener() {}, querySelectorAll() { return []; }, insertAdjacentHTML() {}
});
const document = {
  getElementById: () => stub(),
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: () => stub(),
  body: { appendChild() {} }
};
const context = {
  console, localStorage, document, window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; } }, Blob: function Blob() {},
  FileReader: function FileReader() {}, setTimeout() {}, clearTimeout() {},
  fetch: async () => ({
    ok: true,
    json: async () => ({ data: {
      Meal_Orders: [], Supply_Requests: [], Vehicle_Passes: [],
      Parking_Requests: [], Finance_Expenses: []
    } })
  }),
  confirm: () => true,
  alert() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(core, context);

const App = context.TestApp;
const LS = context.TestLS;
const app = Object.create(App.prototype);
Object.assign(app, {
  currentEvent: { event_id: 'isd_2026' },
  currentUser: { role: 'super_admin', name: '超管', user_id: 'sheep', group_name: '主席及執行副主席' },
  eventData: {
    drive: { groups: { '會議': '1-abBGIs37E_cvrHacd1tG9wgWiDRXnz4' } },
    supplies: { inventory: [], requests: [{ request_id: 'req_1', item_name: '對講機' }], vehicle_passes: [] },
    meals: { menus: [], orders: [] },
    finance: { expenses: [], income: [], group_itemized_budgets: [] }
  },
  systemConfig: { meeting_folder_id: 'wrong' },
  gasUrl: 'https://gas.example',
  apiKey: 'key',
  currentModule: null,
  usersList: [],
  approvalPerms: []
});
app.approvalRouting = {
  supplies: { approver_groups: ['協調組'], executor_groups: ['服務及發展組'] },
  vehicle: { approver_groups: ['協調組'], executor_groups: ['協調組'] },
  meals: { approver_groups: ['行政組'], executor_groups: ['協調組'] },
  finance: { approver_groups: ['行政組'], executor_groups: ['行政組'] }
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const low = { role: 'staff', group_name: '主題節目組' };
const high = { role: 'general_director', group_name: '主題節目組' };
assert(app.applicationConfirmationMeta(low).group_confirmation_status === 'pending', 'low-level submitter skipped group confirmation');
assert(app.applicationConfirmationMeta(high).group_confirmation_status === 'not_required', 'general director incorrectly needs confirmation');
const record = { requester_role: 'staff', group_name: '主題節目組', group_confirmation_status: 'pending' };
assert(app.canConfirmApplication(record, high), 'own-group general director cannot confirm');
assert(!app.canConfirmApplication(record, { role: 'general_director', group_name: '協調組' }), 'other-group director can confirm own-group stage');
assert(app.canApproveArea('supplies', { role: 'general_director', group_name: '協調組', user_id: 'gd' }), 'configured approver cannot approve');
assert(!app.canApproveArea('supplies', { role: 'general_director', group_name: '行政組', user_id: 'gd2' }), 'unconfigured group can approve');
assert(app.canExecuteArea('supplies', { role: 'staff', group_name: '服務及發展組' }), 'configured executor cannot view final list');
assert(!app.canExecuteArea('supplies', { role: 'staff', group_name: '協調組' }), 'approver inherited executor access');

const migrated=context.migrateUsersToChineseLogin([
  {user_id:'chair01',name:'朱家聰',role:'chairperson'},
  {user_id:'exec_vp',name:'袁可秀',role:'executive_vice_chairperson'},
  {user_id:'sheep',name:'超級管理員',role:'super_admin'}
]);
assert(migrated[0].user_id==='朱家聰', 'latin login was not converted to Chinese name');
assert(migrated[1].user_id==='袁可秀', 'exec_vp login was not converted to Chinese name');
assert(migrated[2].user_id==='sheep', 'super admin login should stay sheep');
assert(context.loginIdMatches({user_id:'朱家聰',name:'朱家聰',email:'chair@isd.local'},'朱家聰'), 'Chinese name login should match');
assert(context.nextChineseLoginId('朱家聰', ['朱家聰'])==='朱家聰-2', 'duplicate Chinese login should suffix -2');

const chair={role:'chairperson',name:'朱家聰',user_id:'朱家聰',group_name:'主席及執行副主席'};
const staffUser={role:'staff',name:'陳子明',user_id:'陳子明',group_name:'主題節目組'};
const prevUser=app.currentUser;
const chairPerms=app.permSetsFor(chair);
const staffPerms=app.permSetsFor(staffUser);
assert(app.currentUser===prevUser, 'permSetsFor leaked currentUser');
assert(chairPerms.see.length===(context.TestPERM||[]).length, 'chairperson should see all cards by default, got '+chairPerms.see.length);
assert(chairPerms.edit.includes('announcements') && chairPerms.edit.includes('meetings') && chairPerms.edit.includes('finance'), 'chairperson should have full edit by role default');
assert(!chairPerms.edit.includes('apply_hub'), 'read-only apply hub should not be editable');
assert(staffPerms.see.length<chairPerms.see.length, 'staff should not inherit chair full see');
assert(staffPerms.edit.length<chairPerms.edit.length, 'staff should not inherit chair full edit');
assert(app.permSourceLabel(chair)==='主席預設', 'chair permission source should be role default');

const folder = app.getMeetingFolderConfig();
assert(folder.id === '1-abBGIs37E_cvrHacd1tG9wgWiDRXnz4', 'meeting Drive did not prefer event folder');
app.gasUrl = '';
app.renderApprovalCenter();
app.meetingSubTab = null;
app.openModule('meetings');
assert(app.meetingSubTab === 'list' || app.meetingSubTab === 'drive', 'meeting card did not open a meeting tab');
app.gasUrl = 'https://gas.example';

app.markRecordDeleted('Supply_Requests', 'req_1');
assert(app.getSuppliesData().requests.length === 0, 'deleted supply tombstone was not filtered');

localStorage.setItem(LS.supplies('isd_2026'), JSON.stringify({ inventory: [], requests: [{ request_id: 'stale' }], vehicle_passes: [{ pass_id: 'stale-v' }] }));
localStorage.setItem(LS.meals('isd_2026'), JSON.stringify({ menus: [], orders: [{ order_id: 'stale-o' }] }));
localStorage.setItem(LS.parking('isd_2026'), JSON.stringify({ applications: [{ parking_id: 'stale-p' }] }));
localStorage.setItem(LS.finance('isd_2026'), JSON.stringify({ group_itemized_budgets: [], income: [], expenses: [{ id: 'stale-f' }] }));

(async () => {
  await app.syncApplicationsFromGas();
  const supplies = JSON.parse(localStorage.getItem(LS.supplies('isd_2026')));
  const meals = JSON.parse(localStorage.getItem(LS.meals('isd_2026')));
  const parking = JSON.parse(localStorage.getItem(LS.parking('isd_2026')));
  const finance = JSON.parse(localStorage.getItem(LS.finance('isd_2026')));
  assert(!supplies.requests.length && !supplies.vehicle_passes.length, 'empty backend did not clear stale supply/vehicle cache');
  assert(!meals.orders.length, 'empty backend did not clear stale meal cache');
  assert(!parking.applications.length, 'empty backend did not clear stale parking cache');
  assert(!finance.expenses.length, 'empty backend did not clear stale finance cache');
  console.log('WORKFLOW_SMOKE_OK');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
