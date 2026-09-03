#!/usr/bin/env node
'use strict';
/* v12.2 回歸測試（用戶回報修正）：
   ① 紀念章派發「手動儲存鍵」防呆：TICK／備註只存本機入佇列，唔自動打後端；
      撳「💾 儲存」先一次過批次串行寫入（幾十人 tick 都係一批），失敗重試＋保留暫存
   ② 最高層系統帳戶唔算工作人員：不計入紀念章派發名單／統計
   ③ 紀念章名單可 SORT（姓名／組別／攤位／派發狀態）
   ④ 行政組頁右上角唔再出現多餘通用「新增」掣
   ⑤ 部門中心統一基本形態：行政組、協調組都用 openGroupManagement（與顧問團同款基本盤：
      成員/職務/文件/攤位 4 格＋本組申請統計 5 格＋列印），特色功能做頂部頁籤（唔再下方另開頁籤列）
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const isd = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));

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
const bundle = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

/* ── 原始碼層面檢查 ── */
const coreSrc = fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8');
const stampSrc = fs.readFileSync(path.join(root, 'js/40-souvenir-stamps.js'), 'utf8');
const crisisSrc = fs.readFileSync(path.join(root, 'js/36-crisis.js'), 'utf8');
const coordSrc = fs.readFileSync(path.join(root, 'js/37-coordinator.js'), 'utf8');
const bootSrc = fs.readFileSync(path.join(root, 'js/90-bootstrap.js'), 'utf8');

/* ④ 行政組頁唔應該有通用「新增」兜底掣 */
ok(/key===['"]my_monitor['"][^;]*admin_group/.test(coreSrc.replace(/\s+/g, ' ')), '④ openModule 應把 admin_group 列入唔顯示通用新增掣名單');

/* ⑤ 統一部門形態：行政組／協調組卡片都用 openGroupManagement */
ok(!/openModule\('coordinator_group'\)/.test(coreSrc), '⑤ 協調組卡片唔應再跳獨立 coordinator_group 模組');
ok(!/openModule\('admin_group'\)/.test(coreSrc), '⑤ 行政組卡片唔應再跳獨立 admin_group 模組');
ok(crisisSrc.includes("this.openGroupManagement('行政組')"), '⑤ 行政組特色應由統一部門頁 openGroupManagement 承載');
ok(crisisSrc.includes("renderAdminGroupModule(){ this.openGroupManagement('行政組'); }"), '⑤ 舊行政組模組應重定向到統一部門頁');
ok(coordSrc.includes("renderCoordinatorGroupModule(){ this.openGroupManagement('協調組'); }"), '⑤ 舊協調組模組應重定向到統一部門頁');
/* ⑤ 特色功能做頂部頁籤 */
ok(coreSrc.includes("k:'admin_finance'") && coreSrc.includes("k:'admin_participants'") && coreSrc.includes("k:'admin_tickets'"), '⑤ 行政組特色（財務/旅團/票券）應為頂部頁籤');
ok(coreSrc.includes("k:'coord_supplies'") && coreSrc.includes("k:'coord_vehicle'") && coreSrc.includes("k:'coord_meals'") && coreSrc.includes("k:'coord_docs'"), '⑤ 協調組特色（物資/車輛/膳食/文件）應為頂部頁籤');
ok(coreSrc.includes('groupApplyStatsHTML(groupName'), '⑤ 基本形態應用共用 groupApplyStatsHTML（統計 5 格＋列印）');
ok(coreSrc.includes("renderAdminFinanceTabHTML") && coreSrc.includes("renderCoordSupplies(el)"), '⑤ 特色頁籤內容應掛入統一部門頁');
/* 協調組唔再喺下方另開頁籤列（舊協調頁嘅 tab 列只喺兼容方法內，唔再係入口） */
ok(/renderCoordinatorGroupModule\(\)\{[^}]*openGroupManagement/.test(coordSrc.replace(/\s+/g, ' ')), '⑤ 協調組入口應直接係統一部門頁（下方頁籤列唔再出現）');

/* ① 手動儲存鍵 */
ok(stampSrc.includes('saveSouvenirStampsToBackend'), '① 應有手動儲存鍵方法 saveSouvenirStampsToBackend');
ok(stampSrc.includes('data-stamp-save-btn'), '① 工具列應有「💾 儲存」按鈕');
ok(stampSrc.includes('data-stamp-pending-count'), '① 應顯示未儲存項數');
ok(!stampSrc.includes('scheduleStampSync'), '① 唔應再有自動 debounce 同步（改為手動儲存）');
ok(stampSrc.includes('_stampSyncBusy'), '① 批次儲存應串行（唔同時開大量連線）');
ok(/for\s*\(\s*let\s+attempt\s*=\s*0\s*;\s*attempt\s*<\s*3/.test(stampSrc), '① 失敗應自動重試（最多 3 次）');
ok(bootSrc.includes('flushStampSyncBeforeUnload'), '① 關頁前應嘗試把未儲存 TICK 送出');
ok(/未儲存（已暫存）|未儲存/.test(bootSrc), '① 有未儲存改動關頁應有提示');

/* ③ 排序 */
ok(stampSrc.includes('setStampSort') && stampSrc.includes('data-sort-key'), '③ 表格 header 應可點擊排序');

/* ② 最高層帳戶排除 */
ok(stampSrc.includes('isSuperAdminUser'), '② 名單構建應排除最高層帳戶');

/* ── 行為層面測試（VM 真實 prototype）── */
const elements = {};
function makeEl(id) {
  if (elements[id]) return elements[id];
  const e = {
    id, _cls: new Set(), style: {}, textContent: '', _innerHTML: '', value: '', dataset: {},
    disabled: false, files: [],
    set innerHTML(v) { this._innerHTML = String(v); }, get innerHTML() { return this._innerHTML; },
    addEventListener() {}, appendChild(c) { this._lastChild = c; },
    closest() { return null; },
    querySelectorAll(sel) { return sel === '[data-stamp-sync-status]' || sel === '[data-stamp-pending-count]' || sel === '[data-stamp-save-btn]' ? [e] : []; },
    querySelector() { return null; },
    classList: {
      add: c => e._cls.add(c), remove: c => e._cls.delete(c),
      toggle: c => { if (e._cls.has(c)) e._cls.delete(c); else e._cls.add(c); },
      contains: c => e._cls.has(c)
    }
  };
  elements[id] = e;
  return e;
}
const store = new Map();
const context = {
  console,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: {
    getElementById: id => makeEl(id),
    querySelectorAll: () => [],
    addEventListener() {}, createElement: () => makeEl('_new_' + Math.random()),
    body: { appendChild() {} }
  },
  window: {}, navigator: { sendBeacon: () => true }, location: {},
  URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
  Blob: function Blob() {}, FileReader: function FileReader() {},
  XLSX: { read: () => ({ SheetNames: [], Sheets: {} }), utils: { sheet_to_json: () => [] } },
  setTimeout: (fn, ms) => { if (typeof fn === 'function' && (!ms || ms < 100)) { try { fn(); } catch (e) {} return 0; } return setTimeout(fn, ms || 0); },
  clearTimeout(id) { try { clearTimeout(id); } catch (e) {} },
  fetch: async () => { context.__postCount = (context.__postCount || 0) + 1; return { ok: true, status: 200, json: async () => ({ success: true }), text: async () => '' }; },
  confirm: () => true, alert() {}
};
context.window = context; context.globalThis = context;
vm.createContext(context);
vm.runInContext(bundle, context);

vm.runInContext(`
  globalThis.__app = Object.create(TestApp.prototype);
  Object.assign(globalThis.__app, {
    currentEvent: { event_id: 'isd_2026', event_name: '2026 港島童軍繽紛日' },
    currentUser: { role: 'admin', name: '陳 admin', user_id: 'admin1', group_name: '行政組' },
    eventData: ${JSON.stringify(isd)},
    navHistory: [], currentModule: null, gasUrl: 'https://gas.example.com/mock', apiKey: 'k',
    usersList: [
      { user_id: 'sys.ops', name: '最高層帳戶', role: 'super_admin', group_name: '系統', status: 'active' },
      { user_id: 'u1', name: '陳大文', role: 'staff', group_name: '行政組', status: 'active' },
      { user_id: 'u2', name: '李小明', role: 'director', group_name: '協調組', status: 'active' }
    ]
  });
  globalThis.__app.isDemoEvent = () => false;
  globalThis.__app.getStaffData = () => ({ org_chart: [], contacts: [], job_duties: [] });
  globalThis.__app.getDocumentsData = () => ({ docs: [] });
  globalThis.__app.getActivitiesData = () => ({ booths: [] });
  globalThis.__app.getFinanceData = () => ({ group_itemized_budgets: [], expenses: [], income: [] });
  globalThis.__app.getMealsData = () => ({ menus: [], orders: [] });
  globalThis.__app.getSuppliesData = () => ({ requests: [], booth_requests: [], vehicle_passes: [] });
  globalThis.__app.getCeremonyData = () => ({ guests: [] });
  globalThis.__app.getAdminGroupData = () => ({ docs: [], tickets: [] });
  globalThis.__app.getCoordinatorGroupData = () => ({ docs: [] });
  globalThis.__app.getParticipantsData = () => [];
`, context);

/* ② 行為：最高層帳戶唔出現喺工作人員名單 */
let rosterArr = JSON.parse(vm.runInContext(`JSON.stringify(globalThis.__app.souvenirStaffRoster().map(p=>({name:p.name,group:p.group_name})))`, context));
ok(!rosterArr.some(p => p.name === '最高層帳戶'), '② 最高層帳戶唔應出現喺紀念章工作人員名單');
ok(rosterArr.some(p => p.name === '陳大文') && rosterArr.some(p => p.name === '李小明'), '② 普通工作人員／主任應出現喺名單');

/* ① 行為：連續 TICK 5 次 —— 只入本機佇列，唔自動發後端 request */
vm.runInContext(`(()=>{
  globalThis.__postCount = 0;
  const a = globalThis.__app;
  for (let i = 0; i < 5; i++) {
    const data = a.getSouvenirStampData();
    data.staff = data.staff || {};
    data.staff['陳大文'] = Object.assign(data.staff['陳大文']||{}, { name:'陳大文', group_name:'行政組', ticked: i%2===0, updated_at: new Date().toISOString() });
    a.saveSouvenirStampData(data, { scope:'staff', key:'陳大文', row: data.staff['陳大文'] });
  }
  globalThis.__queuedAfter5 = a._stampSyncQueue ? a._stampSyncQueue.size : -1;
})();`, context);
ok(vm.runInContext(`globalThis.__queuedAfter5`, context) === 1, '① 5 次 TICK 同一人，佇列應合併成 1 筆');
ok(vm.runInContext(`globalThis.__postCount`, context) === 0, '① TICK 後唔應自動發後端 request（要撳儲存鍵，實際=' + vm.runInContext(`globalThis.__postCount`, context) + '）');

/* ① 撳儲存鍵：一次過批次寫入（合併成 1 個 request） */
vm.runInContext(`(async () => { await globalThis.__app.saveSouvenirStampsToBackend('staff'); globalThis.__saved1 = true; })();`, context);
setTimeout(() => {
  const r1 = JSON.parse(vm.runInContext(`JSON.stringify({ done: !!globalThis.__saved1, posts: globalThis.__postCount, q: globalThis.__app._stampSyncQueue.size, busy: !!globalThis.__app._stampSyncBusy })`, context));
  ok(r1.done, '① 儲存鍵應完成');
  ok(r1.posts === 1, '① 5 次連 tick 撳一次儲存，應只發 1 個後端 request（實際=' + r1.posts + '）');
  ok(r1.q === 0, '① 儲存成功後佇列應清空（實際 q=' + r1.q + '）');
  ok(r1.busy === false, '① 完成後串行鎖應釋放');

  /* ① 幾十個工作人員 tick → 一次過批次（多筆但只一次按鈕，串行唔打爆後端） */
  vm.runInContext(`(()=>{
    globalThis.__postCount = 0;
    const a = globalThis.__app;
    for (let i = 1; i <= 30; i++) {
      const nm = '組員' + i;
      const data = a.getSouvenirStampData();
      data.staff = data.staff || {};
      data.staff[nm] = { name: nm, group_name: i<=15?'協調組':'主題節目組', ticked: true, updated_at: new Date().toISOString() };
      a.saveSouvenirStampData(data, { scope:'staff', key: nm, row: data.staff[nm] });
    }
    globalThis.__queued30 = a._stampSyncQueue.size;
  })();`, context);
  ok(vm.runInContext(`globalThis.__queued30`, context) === 30, '① 30 個工作人員 TICK 應入 30 筆待儲存（合併視窗前）');
  ok(vm.runInContext(`globalThis.__postCount`, context) === 0, '① TICK 30 次期間唔應有任何自動後端 request');
  vm.runInContext(`(async () => { await globalThis.__app.saveSouvenirStampsToBackend('staff'); globalThis.__saved2 = true; })();`, context);
  setTimeout(() => {
    const r2 = JSON.parse(vm.runInContext(`JSON.stringify({ done: !!globalThis.__saved2, posts: globalThis.__postCount, q: globalThis.__app._stampSyncQueue.size })`, context));
    ok(r2.done, '① 30 人批次儲存應完成');
    ok(r2.posts === 30, '① 一次按儲存應把 30 筆全部串行寫入（實際=' + r2.posts + '）');
    ok(r2.q === 0, '① 30 筆儲存後佇列應清空');

    /* ③ 排序狀態切換 */
    vm.runInContext(`(()=>{
      globalThis.__app._stampSort = null;
      globalThis.__app.setStampSort('staff','name');
      globalThis.__s1 = JSON.stringify(globalThis.__app.stampSortState('staff'));
      globalThis.__app.setStampSort('staff','name');
      globalThis.__s2 = JSON.stringify(globalThis.__app.stampSortState('staff'));
      globalThis.__app.setStampSort('staff','ticked');
      globalThis.__s3 = JSON.stringify(globalThis.__app.stampSortState('staff'));
    })();`, context);
    const s1 = JSON.parse(vm.runInContext(`globalThis.__s1`, context));
    const s2 = JSON.parse(vm.runInContext(`globalThis.__s2`, context));
    const s3 = JSON.parse(vm.runInContext(`globalThis.__s3`, context));
    ok(s1.key === 'name' && s1.dir === 'asc', '③ 首次按姓名排序應為 asc');
    ok(s2.key === 'name' && s2.dir === 'desc', '③ 再按姓名應切換為 desc');
    ok(s3.key === 'ticked' && s3.dir === 'desc', '③ 按派發狀態預設 desc（未派排前）');

    /* ⑤ 統一部門頁：行政組／協調組 openGroupManagement 應出基本盤＋特色頂部頁籤 */
    vm.runInContext(`(()=>{
      globalThis.__app.openGroupManagement('行政組');
      globalThis.__adminHTML = document.getElementById('module-content').innerHTML;
      globalThis.__app.openGroupManagement('協調組');
      globalThis.__coordHTML = document.getElementById('module-content').innerHTML;
      globalThis.__app.openGroupManagement('顧問團');
      globalThis.__advisorHTML = document.getElementById('module-content').innerHTML;
    })();`, context);
    const adminH = vm.runInContext(`globalThis.__adminHTML`, context);
    const coordH = vm.runInContext(`globalThis.__coordHTML`, context);
    const advH = vm.runInContext(`globalThis.__advisorHTML`, context);
    // 基本盤（三組一致）
    const actionsH = (vm.runInContext(`document.getElementById('module-actions').innerHTML`, context) || '');
    [['行政組', adminH], ['協調組', coordH], ['顧問團', advH]].forEach(([g, h]) => {
      ok(h.includes('本組物資申請') && h.includes('本組攤位申請') && h.includes('本組車輛通行證') && h.includes('本組膳食訂餐'), '⑤ ' + g + ' 應有基本形態 4 張申請明細表');
      ok(h.includes('本組崗位／成員'), '⑤ ' + g + ' 應有成員/職務基本 4 格');
    });
    ok(actionsH.includes('列印本組統計') || adminH.includes('列印本組統計'), '⑤ 部門頁應可列印本組統計（action bar）');
    // 行政組特色頂部頁籤
    ok(adminH.includes('財務') && adminH.includes('參加旅團') && adminH.includes('票券') && adminH.includes('紀念章-工作人員') && adminH.includes('失物認領'), '⑤ 行政組特色應為頂部頁籤（財務/旅團/票券/紀念章/失物）');
    ok(adminH.includes('group-tab-admin_finance') && adminH.includes('group-tab-admin_tickets'), '⑤ 行政組特色頁籤容器應存在');
    // 協調組特色頂部頁籤（物資/車輛/膳食批核＋場地文件），且唔再係下方另一頁籤列
    ok(coordH.includes('物資批核') && coordH.includes('車輛批核') && coordH.includes('膳食批核') && coordH.includes('場地佈置及文件'), '⑤ 協調組特色應為頂部頁籤（物資/車輛/膳食/場地文件）');
    ok(coordH.includes('group-tab-coord_supplies') && coordH.includes('group-tab-coord_meals'), '⑤ 協調組特色頁籤容器應存在（頂部，非下方另開）');

    console.log(`\n全部 v12.2 驗證通過 ✅（${n} 項）`);
    process.exit(0);
  }, 4000);
}, 300);
