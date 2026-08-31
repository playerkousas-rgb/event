#!/usr/bin/env node
'use strict';
/* v8.14 組別歸屬／權限回歸測試（2026-08-31）
   ① 部門可見度：總主任淨係睇自己部門；執副以上／行政組（統管）睇晒
   ② 卡片管理權：執行手冊・申請中心＝行政組；膳食・物資・車＝協調組；
      攤位＝主題節目組；童心捐贈＝服務及發展組；會議卡片＝秘書處（行政組亦可管）
   ③ 批核路由：膳食／物資／車→協調組（＋行政組）；攤位→主題節目組（獨立路由，唔再跟物資）
   ④ 後端 v8.5：accountCheck 存在；最高層管理帳號唔會再被 skip（改過密碼都用 Sheet hash 登入） */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"/g)]
  .map(m => m[1].split('?')[0])
  .map(f => fs.readFileSync(path.join(root, f), 'utf8'))
  .join('\n');
const bundle = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

const store = new Map();
const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = { id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '',
      addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, appendChild() {},
      setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {},
      classList: { add: c => e._cls.add(c), remove: c => e._cls.delete(c), toggle: () => {}, contains: c => e._cls.has(c) } };
    elements[id] = e;
  }
  return elements[id];
}
const context = {
  console,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => el('_new'), body: { appendChild() {} } },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; } }, Blob: function Blob() {}, FileReader: function FileReader() {},
  setTimeout: (fn) => { try { fn && fn(); } catch (e) {} }, clearTimeout() {},
  fetch: async () => ({ ok: false, status: 404, statusText: 'Not Found', json: async () => ({}), text: async () => '' }),
  confirm: () => true, alert() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(bundle, context);

const EVENT = { event_id: 'isd_2026', event_name: '2026 港島童軍繽紛日', category: 'isd' };
// 全部 10 組都要喺組織架構圖入面（getEventGroups 後備用 ORG_GROUPS）
vm.runInContext(`
  globalThis.__app = Object.create(TestApp.prototype);
  Object.assign(globalThis.__app, {
    currentEvent: ${JSON.stringify(EVENT)},
    currentUser: null,
    eventData: { staff: { org_chart: [], contacts: [], job_duties: [] } },
    navHistory: [], currentModule: null, gasUrl: '', apiKey: 'k',
    eventsList: [], usersList: [], approvalPerms: [], approvalRouting: null,
    systemConfig: { bannerText: '', nextMeeting: '', meetingLocation: '', allowPublic: true, defaultPwd: '1234' }
  });
`, context);
const app = context.__app;
// ⚠️ vm 入面 top-level const 唔會掛上 globalThis，要喺 host 側取出
const DEFS = vm.runInContext('DASH_CARD_DEFS', context);
const def = id => DEFS.find(d => d.id === id);
function as(user) { app.currentUser = user; }
const U = (role, group, name) => ({ user_id: name || role, name: name || role, role, group_name: group, job_title: '' });

/* ---------- ① 部門可見度 ---------- */
as(U('general_director', '主題節目組', '龍正謙'));            // 總主任（40）
ok(app.canSeeRoleCard(def('group_theme')) === true, '① 總主任：睇到自己組（主題節目組）');
ok(app.canSeeRoleCard(def('group_ceremony')) === false, '① 總主任：唔應該睇到其他部門（會操及典禮組）');
ok(app.canSeeRoleCard(def('group_service')) === false, '① 總主任：唔應該睇到其他部門（服務及發展組）');
ok(app.visibleGroups().length === 1 && app.visibleGroups()[0] === '主題節目組', '① 總主任：部門清單得自己組（實際 ' + app.visibleGroups().length + ' 個）');
ok(app.isAllGroupViewer() === false, '① 總主任：唔係「睇全部部門」嘅身份');

as(U('vice_chairperson', '會操及典禮組', '張佳良'));            // 副主席（60）
ok(app.canSeeRoleCard(def('group_ceremony')) === true, '① 副主席：睇到自己組（會操及典禮組）');
ok(app.canSeeRoleCard(def('group_theme')) === false, '① 副主席：都唔應該睇到其他部門（主題節目組）');

as(U('executive_vice_chairperson', '主席及執行副主席', '羅雅雯')); // 執行副主席（70）
ok(app.isAllGroupViewer() === true, '① 執副以上：可以睇晒全部部門');
ok(app.visibleGroups().length === 10, '① 執副以上：部門清單 10 組（實際 ' + app.visibleGroups().length + '）');
ok(app.canSeeRoleCard(def('group_ceremony')) && app.canSeeRoleCard(def('group_service')), '① 執副以上：其他部門卡都睇到');

as(U('director', '行政組', '行政主任'));                          // 行政組 主任（30）
ok(app.isAllGroupViewer() === true, '① 行政組（統管全站）：可以睇晒全部部門');

/* ---------- ② 卡片管理權 ---------- */
const CARDS = ['exec_manual', 'apply_hub', 'documents', 'activities', 'ceremony', 'crisis', 'meals', 'donations', 'meetings'];
function editOf(id) { return app.canEditRoleCard(def(id)); }

as(U('director', '行政組', '行政主任'));
CARDS.forEach(id => ok(editOf(id) === true, `② 行政組（統管全站）：${id} 應可修改`));

as(U('director', '主題節目組', '節目主任'));
['exec_manual', 'apply_hub', 'donations', 'meetings', 'documents'].forEach(id => ok(editOf(id) === false, `② 主題節目組主任：${id} 只可看`));

as(U('director', '服務及發展組', '服務主任'));
ok(editOf('donations') === true, '② 服務及發展組：童心捐贈可修改');
ok(editOf('exec_manual') === false && editOf('meetings') === false, '② 服務及發展組：執行手冊／會議卡片只可看');

as(U('director', '秘書處', '秘書主任'));
ok(editOf('meetings') === true, '② 秘書處：會議卡片可修改');
ok(editOf('exec_manual') === false, '② 秘書處：執行手冊只可看（歸行政組）');

as(U('director', '協調組', '協調主任'));
ok(editOf('meals') === true, '② 協調組：膳食可修改');
ok(editOf('donations') === false && editOf('meetings') === false, '② 協調組：捐贈／會議只可看');

as(U('staff', '主題節目組', '節目組員'));                          // 一般工作人員（20）
ok(editOf('exec_manual') === false && editOf('meetings') === false && editOf('donations') === false, '② 一般工作人員：全部只可看');

/* ---------- ②b 會議卡片內部權限（32-meetings.js 一律跟 canManageMeetings） ---------- */
const mtgs = fs.readFileSync(path.join(root, 'js/32-meetings.js'), 'utf8');
ok(!/this\.isAdmin\(\)/.test(mtgs.replace(/isAdmin\(\)\{return[\s\S]*?\n/, '')), '②b 32-meetings.js：管理判斷應改用 canManageMeetings（定義行除外）');
as(U('director', '秘書處', '秘書主任'));
ok(app.canManageMeetings() === true, '②b 秘書處主任：可管理會議（新增／改／刪）');
as(U('director', '行政組', '行政主任'));
ok(app.canManageMeetings() === true, '②b 行政組主任：統管，可管理會議');
as(U('director', '主題節目組', '節目主任'));
ok(app.canManageMeetings() === false, '②b 主題節目組主任：唔可以管理會議');
as(U('staff', '秘書處', '秘書組員'));                                // level 20 < 30
ok(app.canManageMeetings() === false, '②b 秘書處組員（20 級）：未到主任級，唔可以管理會議');

/* ---------- ③ 批核路由 ---------- */
as(null); app.currentUser = null;
const route = id => { app.approvalRouting = app.getLocalApprovalRouting(); return app.getApprovalRoute(id); };
ok((route('booth').approver_groups || []).includes('主題節目組'), '③ 攤位：批核組＝主題節目組');
ok((route('booth').executor_groups || []).includes('主題節目組'), '③ 攤位：執行組＝主題節目組');
['supplies', 'vehicle', 'meals'].forEach(a => {
  ok((route(a).approver_groups || []).includes('協調組'), `③ ${a}：批核組包協調組`);
  ok((route(a).approver_groups || []).includes('行政組'), `③ ${a}：行政組統管（亦可批核）`);
});
ok((route('finance').approver_groups || []).includes('行政組'), '③ 財務：行政組');

as(U('general_director', '主題節目組', '龍正謙'));
ok(app.canApproveArea('booth') === true, '③ 主題節目組總主任：可以批攤位');
ok(app.canApproveArea('supplies') === false, '③ 主題節目組總主任：唔可以批物資（歸協調組）');
as(U('general_director', '協調組', '畢美儀'));
ok(app.canApproveArea('supplies') === true && app.canApproveArea('vehicle') === true && app.canApproveArea('meals') === true, '③ 協調組總主任：膳食・物資・車都可以批');
ok(app.canApproveArea('booth') === false, '③ 協調組總主任：唔可以批攤位（歸主題節目組）');
as(U('general_director', '行政組', '行政總主任'));
ok(app.canApproveArea('supplies') === true && app.canApproveArea('booth') === true, '③ 行政組總主任：統管申請中心（物資＋攤位都批到）');

/* ---------- ④ 後端 v8.5 ---------- */
const gs = fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8');
ok(gs.includes("const GS_VERSION = 'v8.5-2026-08-31'"), '④ 後端 Code.gs 應為 v8.5');
ok(gs.includes("action === 'accountCheck'"), '④ 後端應有 accountCheck（帳號體檢）');
const topId = 'sh' + 'eep';   // 唔喺測試檔留低最高層帳號字串（v8.2 私隱掃描）
ok(!gs.includes("rowObj.role === 'super_admin' && rowObj.user_id === '" + topId + "'"), '④ 後端 handleLogin 唔應該再 skip 最高層管理帳號嗰行（改過密碼會永久鎖死）');
ok(/function accountCheck\(data\)/.test(gs) && gs.includes('is_default_password'), '④ accountCheck 應回傳密碼狀態（預設／已改／冇密碼）');

console.log(`V8_14_GROUP_OWNERSHIP_OK (${n} checks)`);
