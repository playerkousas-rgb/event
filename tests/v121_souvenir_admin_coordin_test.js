#!/usr/bin/env node
'use strict';
/* v12.1 回歸測試（用戶回報 5 項）：
   ① 紀念章派發防呆：TICK 唔再即時每 tick 打後端——改動入佇列、合併視窗後串行同步（快速連 tick 唔會打爆後端）
   ② 系統管理員（最高層 super_admin）唔算工作人員：不計入紀念章派發名單／統計
   ③ 紀念章名單可 SORT（姓名／組別／攤位／派發狀態），方便觀看及派發
   ④ 行政組部門頁右上角唔再出現多餘嘅通用「新增」掣（admin_group 唔跌落兜底分支）
   ⑤ 行政組、協調組同其他組一樣有「崗位／物資申請／攤位申請／車輛申請／膳食訂餐」統計，且可列印
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

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

/* ── 原始碼層面檢查（④⑤③ 結構）── */
const coreSrc = fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8');
const stampSrc = fs.readFileSync(path.join(root, 'js/40-souvenir-stamps.js'), 'utf8');
const crisisSrc = fs.readFileSync(path.join(root, 'js/36-crisis.js'), 'utf8');
const coordSrc = fs.readFileSync(path.join(root, 'js/37-coordinator.js'), 'utf8');
const bootSrc = fs.readFileSync(path.join(root, 'js/90-bootstrap.js'), 'utf8');

/* ④ 行政組頁唔應該有通用「新增」兜底掣 */
ok(/key===['"]my_monitor['"][^;]*admin_group/.test(coreSrc.replace(/\s+/g,' ')), '④ openModule 應把 admin_group 列入「唔顯示通用新增掣」名單');
ok(coreSrc.includes('groupApplyStatsHTML(groupName'), '⑤ 應抽出共用 groupApplyStatsHTML 統計方法');

/* ⑤ 行政組／協調組頁有統計＋列印 */
ok(crisisSrc.includes("this.groupApplyStatsHTML('行政組'"), '⑤ 行政組頁應有本組申請統計區塊');
ok(crisisSrc.includes("printCoordArea('admin-group-stats-print'"), '⑤ 行政組應可列印本組統計');
ok(coordSrc.includes("this.groupApplyStatsHTML('協調組'"), '⑤ 協調組頁應有本組申請統計區塊');
ok(coordSrc.includes("printCoordArea('coord-group-stats-print'"), '⑤ 協調組應可列印本組統計');
/* 統計 5 格口徑：崗位／物資申請／攤位申請／車輛申請（+膳食）*/
ok(coreSrc.includes("'崗位'") && coreSrc.includes("'物資申請'") && coreSrc.includes("'攤位申請'") && coreSrc.includes("'車輛申請'"), '⑤ 共用統計應含 崗位／物資申請／攤位申請／車輛申請');

/* ① 防呆：佇列＋合併視窗＋串行 */
ok(stampSrc.includes('_stampSyncQueue'), '① 應有同步佇列 _stampSyncQueue');
ok(stampSrc.includes('scheduleStampSync'), '① 應有 debounce 排程 scheduleStampSync');
ok(stampSrc.includes('flushStampSync'), '① 應有串行同步 flushStampSync');
ok(stampSrc.includes('_stampSyncBusy'), '① 應有串行鎖（唔同時開大量連線）');
ok(/for\s*\(\s*let\s+attempt\s*=\s*0\s*;\s*attempt\s*<\s*3/.test(stampSrc), '① 失敗應自動重試（最多 3 次）');
ok(bootSrc.includes('flushStampSyncBeforeUnload'), '① 關頁前應嘗試把未同步 TICK 送出');

/* ③ 排序 */
ok(stampSrc.includes('setStampSort'), '③ 應有 setStampSort 排序方法');
ok(stampSrc.includes('sortSouvenirStampRows'), '③ 應有 sortSouvenirStampRows 排序執行');
ok(stampSrc.includes('data-sort-key'), '③ 表格 header 應可點擊排序（data-sort-key）');
ok(stampSrc.includes("sortTh('ticked'"), '③ 應可按派發狀態排序（未派排前方便派發）');

/* ② 最高層帳戶排除 */
ok(stampSrc.includes('isSuperAdminUser'), '② 名單構建應排除 isSuperAdminUser 最高層帳戶');
ok(!/super_admin/.test(stampSrc.replace(/isSuperAdminUser/g,'')), '② 不應硬寫 super_admin 字樣（私隱掃描）');

/* ── 行為層面測試（VM 真實 prototype）── */
const elements = {};
function makeEl(id) {
  if (elements[id]) return elements[id];
  const e = {
    id, _cls: new Set(), style: {}, textContent: '', _innerHTML: '', value: '',
    dataset: {},
    set innerHTML(v){ this._innerHTML = String(v); }, get innerHTML(){ return this._innerHTML; },
    addEventListener() {}, appendChild(c){ this._lastChild = c; },
    closest(){ return null; },
    querySelectorAll(){ return []; }, querySelector(){ return null; },
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
  localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  },
  document: {
    getElementById: id => makeEl(id),
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => makeEl('_new_' + Math.random()),
    body: { appendChild() {} }
  },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
  Blob: function Blob() {}, FileReader: function FileReader() {}, XLSX: { read: () => ({ SheetNames: [], Sheets: {} }), utils: { sheet_to_json: () => [] } },
  // debounce 排程（無 ms 或短 ms）即時執行；retry delay（長 ms）保持真實非同步，避免 await hang
  setTimeout: (fn, ms) => { if (typeof fn === 'function' && (!ms || ms < 100)) { try { fn(); } catch (e) {} return 0; } return setTimeout(fn, ms || 0); },
  clearTimeout(id) { try { clearTimeout(id); } catch (e) {} },
  fetch: async () => { context.__postCount = (context.__postCount || 0) + 1; return { ok: true, status: 200, json: async () => ({ success: true }), text: async () => '' }; },
  confirm: () => true, alert() {}
};
context.globalThis = context;
context.window = context;
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
`, context);

/* ② 行為：最高層帳戶唔出現喺工作人員名單 */
const roster = vm.runInContext(`JSON.stringify(globalThis.__app.souvenirStaffRoster().map(p=>({name:p.name,group:p.group_name})))`, context);
const rosterArr = JSON.parse(roster);
ok(!rosterArr.some(p => p.name === '最高層帳戶'), '② 最高層帳戶唔應出現喺紀念章工作人員名單');
ok(rosterArr.some(p => p.name === '陳大文'), '② 普通工作人員應出現喺名單');
ok(rosterArr.some(p => p.name === '李小明'), '② 主任應出現喺名單');
const stats = vm.runInContext(`JSON.stringify(globalThis.__app.souvenirStampStats('staff'))`, context);
ok(JSON.parse(stats).total === rosterArr.length, '② 統計總人數唔應計入最高層帳戶');

/* ② 聯絡表／架構圖若混入最高層帳戶名字，都唔計 */
vm.runInContext(`
  globalThis.__app.getStaffData = () => ({
    org_chart: [{ level: '行政組 (Level 6)', group: '行政組', title: '系統', names: '最高層帳戶' }],
    contacts: [{ name: '最高層帳戶', group_name: '系統', role_title: '系統' }],
    job_duties: []
  });
`, context);
const roster2 = JSON.parse(vm.runInContext(`JSON.stringify(globalThis.__app.souvenirStaffRoster().map(p=>p.name))`, context));
ok(!roster2.includes('最高層帳戶'), '② 最高層帳戶即使混入架構圖／聯絡表都唔計入名單');
ok(roster2.includes('陳大文') && roster2.includes('李小明'), '② 其他人員仍正常出現');

/* ① 行為：連續 TICK 多次，localStorage 即時更新但後端合併成一筆（合併視窗＋串行） */
vm.runInContext(`
  globalThis.__app.getStaffData = () => ({ org_chart: [], contacts: [], job_duties: [] });
  globalThis.__postCount = 0;
  globalThis.__autoFlushed = 0;
  // debounce setTimeout 同步執行 → 每次 save 都會即時觸發 flush；統計真正發出嘅 request 數
  const a = globalThis.__app;
  for (let i = 0; i < 5; i++) {
    const data = a.getSouvenirStampData();
    data.staff = data.staff || {};
    data.staff['陳大文'] = Object.assign(data.staff['陳大文']||{}, { name:'陳大文', group_name:'行政組', ticked: i%2===0, ticked_at:'', ticked_by:'', updated_at: new Date().toISOString() });
    a.saveSouvenirStampData(data, { scope:'staff', key:'陳大文', row: data.staff['陳大文'] });
  }
  globalThis.__queuedAfter5 = a._stampSyncQueue ? a._stampSyncQueue.size : -1;
`, context);
const queued = vm.runInContext(`globalThis.__queuedAfter5`, context);
ok(queued === 1, '① 連續 5 次 TICK 同一人，佇列應只合併成 1 筆（而非 5 筆，實際=' + queued + '）');

// 手動 flush（等 async 完成後先驗 request 數）
vm.runInContext(`(async () => {
  await globalThis.__app.flushStampSync();
  await new Promise(r=>setTimeout(r,10));
  globalThis.__postsAfter5 = globalThis.__postCount;
  globalThis.__queueAfterFlush = globalThis.__app._stampSyncQueue.size;
  globalThis.__flushDone = true;
})();`, context);
setTimeout(() => {
  const after = vm.runInContext(`JSON.stringify({ posts: globalThis.__postsAfter5, q: globalThis.__queueAfterFlush, done: !!globalThis.__flushDone, busy: !!globalThis.__app._stampSyncBusy })`, context);
  const a = JSON.parse(after);
  ok(a.done === true, '① flushStampSync 應完成');
  ok(a.posts === 1, '① 5 次連 tick 同一人應合併成 1 個後端 request（防呆，實際=' + a.posts + '）');
  ok(a.q === 0, '① 同步成功後佇列應清空（實際 q=' + a.q + '）');
  ok(a.busy === false, '① 完成後串行鎖應釋放');

  /* ① 失敗重試：fetch 一直失敗 → 重試 3 次後保留喺佇列（唔靜默掉資料） */
  vm.runInContext(`
    globalThis.__postCount = 0;
    globalThis.fetch = async () => { globalThis.__postCount++; throw new Error('network down'); };
    const d2 = globalThis.__app.getSouvenirStampData();
    d2.staff = d2.staff || {};
    d2.staff['李小明'] = { name:'李小明', group_name:'協調組', ticked:true, updated_at:new Date().toISOString() };
    // 直接入佇列（唔經 schedule，避免同步 timer 干擾）
    globalThis.__app._stampSyncQueue.set('staff::李小明', { scope:'staff', key:'李小明', row: d2.staff['李小明'] });
  `, context);
  vm.runInContext(`(async () => { await globalThis.__app.flushStampSync(); globalThis.__flushDone2 = true; })();`, context);
  setTimeout(() => {
    const r = JSON.parse(vm.runInContext(`JSON.stringify({ q: globalThis.__app._stampSyncQueue.size, posts: globalThis.__postCount, done: !!globalThis.__flushDone2 })`, context));
    ok(r.done === true, '① 失敗場景 flush 應完成');
    ok(r.posts >= 3, '① 失敗應重試至少 3 次（實際 request=' + r.posts + '）');
    ok(r.q >= 1, '① 重試都失敗應保留喺佇列（唔掉資料，q>=1，實際=' + r.q + '）');

    /* ③ 行為：排序狀態切換 */
    vm.runInContext(`
      globalThis.__app._stampSort = null;
      globalThis.__app.setStampSort('staff','name');
      globalThis.__s1 = JSON.stringify(globalThis.__app.stampSortState('staff'));
      globalThis.__app.setStampSort('staff','name');
      globalThis.__s2 = JSON.stringify(globalThis.__app.stampSortState('staff'));
      globalThis.__app.setStampSort('staff','ticked');
      globalThis.__s3 = JSON.stringify(globalThis.__app.stampSortState('staff'));
    `, context);
    const s1 = JSON.parse(vm.runInContext(`globalThis.__s1`, context));
    const s2 = JSON.parse(vm.runInContext(`globalThis.__s2`, context));
    const s3 = JSON.parse(vm.runInContext(`globalThis.__s3`, context));
    ok(s1.key === 'name' && s1.dir === 'asc', '③ 首次按姓名排序應為 asc');
    ok(s2.key === 'name' && s2.dir === 'desc', '③ 再按姓名應切換為 desc');
    ok(s3.key === 'ticked' && s3.dir === 'desc', '③ 按派發狀態預設 desc（已派排後／未派排前）');

    console.log(`\n全部 v12.1 驗證通過 ✅（${n} 項）`);
    process.exit(0);
  }, 2500);
}, 3000);
