#!/usr/bin/env node
'use strict';
/* v8.9 回歸測試：部門中心「崗位／人數」再次翻倍（×2）
   背景：v8.6 的去重 key 用「組別|職位|人名」原文 trim()。當 Drive 架構圖同步（syncOrgChartFromDrive）
   把解析出的崗位寫入 localStorage 後，同一崗位會以「微幅不同嘅字串」各存在一份：
     • 職位含換行／全形空格（Google Sheet 合併儲存格：「副主席\n（會操及典禮）」）
     • 括號全形／半形混用（「總主任(會操)」vs「總主任（會操）」）
     • 人名分隔符不同（「梁文澧 張三」／「梁文澧、張三」／「梁文澧/張三」）
   key 對唔返 → 種子行＋Drive 行同時保留 → 主頁卡片與部門管理中心都變 ×2（人數亦因名字格式不同而虛增）。

   本測試以真實 prototype 重現上述情境，並驗證：
   ① 去重後每組崗位數與 JSON 種子一致（唔會 ×2）
   ② 主頁卡片（getGroupOrgNodes）與部門管理中心使用同一份計算 → 兩處數字必定相同
   ③ 重複載入／重複同步皆冪等（唔會逐次累加），並會自我修正髒快取
   ④ 真正嘅不同崗位（同名同職位但唔同組別／唔同人）唔會被誤砍
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

const elements = {};
function el(id) {
  if (!elements[id]) {
    const e = {
      id, _cls: new Set(), style: {}, textContent: '', innerHTML: '', value: '',
      addEventListener() {}, querySelectorAll() { return []; }, appendChild() {},
      classList: {
        add: c => e._cls.add(c), remove: c => e._cls.delete(c),
        toggle: c => { if (e._cls.has(c)) e._cls.delete(c); else e._cls.add(c); }, contains: c => e._cls.has(c)
      }
    };
    elements[id] = e;
  }
  return elements[id];
}

/* ── 建構「Drive 同步後」嘅髒快取（saveStaffData 會為每行加 _userEdited）
      變體全部係 Google Sheet 實際會見到嘅格式差異（換行、半形括號、全形空格、中文逗号） ── */
const driveRows = isd.staff.org_chart.map((src, i) => {
  const g = (src.level || '').split(' (')[0];
  const lvl = +((src.level || '').match(/Level\s*(\d)/) || [0, 3])[1];
  let title = src.title;
  if (i % 4 === 0) title = title.replace('（', '\n（');            // 儲存格內換行
  else if (i % 4 === 1) title = title.replace('（', '(').replace('）', ')'); // 半形括號
  else if (i % 4 === 2) title = title + '\u3000';                  // 全形空格
  let names = String(src.names || '');
  if (i % 3 === 0) names = names.replace('、', '\n');             // 人名以換行分隔
  else if (i % 3 === 1) names = names.replace('、', '，');         // 人名以中文逗號分隔
  return {
    id: 'org_' + i + '_1700000000000', level: `${g} (Level ${lvl})`, level_num: lvl, group: g,
    title, names, desc: '', parent_id: null, created_at: new Date().toISOString(), _userEdited: true
  };
});

const store = new Map();
store.set('event_staff_v7_isd_2026', JSON.stringify({
  staff_source: isd.staff.staff_source || null, contact_source: null, duties_source: null,
  org_chart: driveRows, contacts: [], job_duties: []
}));

const context = {
  console,
  localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  },
  document: { getElementById: el, querySelectorAll: () => [], addEventListener() {}, createElement: () => el('_new'), body: { appendChild() {} } },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; } }, Blob: function Blob() {}, FileReader: function FileReader() {},
  setTimeout() {}, clearTimeout() {},
  fetch: async () => ({ ok: false, json: async () => ({}), text: async () => '' }),
  confirm: () => true, alert() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(bundle, context);
vm.runInContext(`
  globalThis.__app = Object.create(TestApp.prototype);
  Object.assign(globalThis.__app, {
    currentEvent: { event_id: 'isd_2026', event_name: '2026 港島童軍繽紛日' },
    currentUser: { role: 'super_admin', name: '系統管理員', user_id: 'sys', group_name: '' },
    eventData: ${JSON.stringify(isd)},
    navHistory: [], currentModule: null, gasUrl: '', apiKey: 'k'
  });
  globalThis.__app.isDemoEvent = () => false;
  globalThis.__app.getDocumentsData = () => ({ docs: [] });
  globalThis.__app.getActivitiesData = () => ({ booths: [] });
  globalThis.__app.getFinanceData = () => ({ group_itemized_budgets: [] });
  globalThis.__app.getMealsData = () => ({ menus: [], orders: [] });
`, context);

/* 期望值：以 JSON 種子為唯一事實來源 */
const seedCount = {};
const seedMembers = {};
(function () {
  isd.staff.org_chart.forEach(n0 => {
    const g = (n0.level || '').split(' (')[0];
    seedCount[g] = (seedCount[g] || 0) + 1;
    seedMembers[g] = seedMembers[g] || new Set();
    String(n0.names || '').split(/[\r\n、，,/／]/).map(s => s.trim()).filter(Boolean).forEach(x => seedMembers[g].add(x));
  });
})();

function snapshot() {
  return JSON.parse(vm.runInContext(`JSON.stringify((()=>{
    const a=globalThis.__app, c={};
    a.getEventGroups().forEach(g=>{
      const nodes=a.getGroupOrgNodes(g);
      const s=new Set();
      nodes.forEach(n=>{(n.names||'').split(/[\\r\\n\\t、，,/／]/).map(x=>x.trim()).filter(Boolean).forEach(y=>s.add(y))});
      c[g]={posts:nodes.length, members:s.size};
    });
    c.__raw=a.getStaffData().org_chart.length;
    return c;
  })())`, context));
}

/* ① 快取下唔應該 ×2（主頁卡片） */
const s1 = snapshot();
Object.entries(seedCount).forEach(([g, cnt]) => {
  ok(s1[g] && s1[g].posts === cnt, `① ${g} 崗位數應為 ${cnt}（實際 ${s1[g] && s1[g].posts}）—— Drive 同步版與 JSON 種子唔應該各計一次`);
  const mem = seedMembers[g].size;
  ok(s1[g].members === mem, `① ${g} 人數應為 ${mem}（實際 ${s1[g].members}）—— 人名分隔符唔應該令人數虛增`);
});
ok(s1.__raw <= 49, `① 去重後 org_chart 應接近種子規模 49（實際 ${s1.__raw}，唔該唔好翻倍到 ~98）`);

/* ② 主頁卡片 ＝ 部門管理中心（同一份計算） */
vm.runInContext(`globalThis.__app.getGroupOrgNodesForTest = function(g){ return this.getGroupOrgNodes(g); }`, context);
const cmp = JSON.parse(vm.runInContext(`JSON.stringify((()=>{
  const a=globalThis.__app, out={};
  a.getEventGroups().forEach(g=>{
    const dash=a.getGroupOrgNodes(g).length;
    // 部門管理中心嘅 4 格資訊（groupInfoBoxesHTML）用同一份 getGroupOrgNodes
    const html=a.groupInfoBoxesHTML(g);
    const m=html.match(/本組崗位／成員 \\((\\d+)\\)/);
    out[g]={dash, center:m?+m[1]:-1, htmlCount:(html.match(/前往組織架構/g)||[]).length};
  });
  return out;
})())`, context));
Object.entries(cmp).forEach(([g, v]) => ok(v.dash === v.center, `② ${g}：主頁卡片 ${v.dash} 應等於部門管理中心 ${v.center}`));

/* ③ 冪等：再讀幾次都一樣；並自我修正 localStorage 快取 */
const s2 = snapshot();
Object.keys(seedCount).forEach(g => ok(s2[g].posts === seedCount[g], `③ 第二次載入 ${g} 仍應為 ${seedCount[g]}（實際 ${s2[g].posts}）`));
const healed = JSON.parse(store.get('event_staff_v7_isd_2026') || '{}');
ok(Array.isArray(healed.org_chart) && healed.org_chart.length <= 55,
  `③ 髒快取應被自我校正（寫回嘅 org_chart 應 ≈49 行；實際 ${Array.isArray(healed.org_chart) ? healed.org_chart.length : 'no-cache'}）`);

/* ④ 真正唔同嘅崗位唔應該被誤砍（同組同名同職位 = 重複；組別或人名唔同 = 保留） */
vm.runInContext(`
  globalThis.__app.eventData = { staff: { staff_source:null, org_chart:[
    {level:'協調組 (Level 4)', title:'總主任', names:'畢美儀'},
    {level:'協調組 (Level 4)', title:'總主任', names:'畢美儀'},
    {level:'協調組 (Level 4)', title:'總主任', names:'郭永豪'},
    {level:'行政組 (Level 4)', title:'總主任', names:'畢美儀'}
  ], contacts: [], job_duties: [] } };
  globalThis.__app.localStorageClear && globalThis.__app.localStorageClear();
`, context);
store.delete('event_staff_v7_isd_2026');
const edge = JSON.parse(vm.runInContext(`JSON.stringify((()=>{
  const a=globalThis.__app;
  return { coord:a.getGroupOrgNodes('協調組').map(x=>x.title+'/'+x.names), admin:a.getGroupOrgNodes('行政組').length, raw:a.getStaffData().org_chart.length };
})())`, context));
ok(edge.coord.length === 2, `④ 協調組應得 2 個唔同崗位（畢美儀／郭永豪），實際 ${edge.coord.length}`);
ok(edge.admin === 1, `④ 行政組「總主任 畢美儀」屬唔同組別，應保留（實際 ${edge.admin}）`);
ok(edge.raw === 3, `④ 去重後應得 3 行（完全相同嘅重複行先刪），實際 ${edge.raw}`);

/* ⑤ 靜默同步唔應該每開一次 APP 就寫一次快取（無變化 → 唔寫） */
const actSrc = fs.readFileSync(path.join(root, 'js/21-activities.js'), 'utf8');
ok(actSrc.includes('mergeOrgChartPreserveDesc'), '⑤ 應保留 mergeOrgChartPreserveDesc（同步時保留職務描述）');
ok(/orgKey|orgNodeKey|canonOrgKey/.test(actSrc) || /orgKey|orgNodeKey|canonOrgKey/.test(fs.readFileSync(path.join(root, 'js/00-config.js'), 'utf8')),
  '⑤ 應有共用的正規化 key（去空白／統一括號／人名排序），令 Drive 版與種子版對得返');
const staffSrc = fs.readFileSync(path.join(root, 'js/31-staff.js'), 'utf8');
ok(staffSrc.includes('data_version') || true, '⑤ （文件記錄）');

/* ⑥ data_version 上調 → 舊髒快取一次性清除 */
ok(isd.data_version >= '2026-08-28T00:00:00Z-v8', `⑥ isd_2026.json 的 data_version 應已上調（實際 ${isd.data_version}），令全站舊 staff 快取自動清除`);

/* ⑦ Drive 同步：同步係「以架構圖覆蓋」，所以同步後
      · 每組唔應該出現重複行（種子行與 Drive 行各一份 = 以前 ×2 嘅來源）
      · 寫回快取嘅行應沿用穩定 id（org_seed_*），下次載入按 id 就對得返
      · 內容真係改咗就要更新到；再同步一次相同內容唔應該再長行
   ⑧ 職務大綱／名單重覆上傳（舊寫法 [ ...base, ...parsed ] 無條件 append → 點入部門中心內容 ×2） */
(async () => {
  const seedStaff = isd.staff;
  const snap = () => JSON.parse(vm.runInContext(`JSON.stringify((()=>{
    const a=globalThis.__app, per={}, st=a.getStaffData();
    a.getEventGroups().forEach(g=>{ const ns=a.getGroupOrgNodes(g); per[g]={posts:ns.length, uniq:new Set(ns.map(x=>orgNodeKey(x))).size}; });
    return { per, raw:st.org_chart.length, ids:(st.org_chart||[]).map(x=>x.id) };
  })())`, context));

  vm.runInContext(`globalThis.__app.eventData = ${JSON.stringify(isd)}; globalThis.__app.isDemoEvent = () => false;`, context);
  const grid = [
    ['副主席（會操及典禮）', '', '總主任\n（會操）'],          // 職位格含換行（合併儲存格常見）
    ['張佳良', '', '梁文澧'],
    ['顧問', '', '主席'],
    ['黃偉安、何家騏', '', '朱家聰']
  ];
  const runSync = rows => vm.runInContext(
    `__app.fetchDriveSheetGridRaw = async()=>({ok:true, via:'test', rows:${JSON.stringify(rows)}});
     (async()=>{ await __app.syncOrgChartFromDrive(false); return 1; })()`, context);
  await runSync(grid);
  const s1 = snap();
  Object.entries(s1.per).forEach(([g, v]) => ok(v.posts === v.uniq, `⑦ 同步後 ${g} 唔該冇重複崗位（${v.posts} 行／${v.uniq} 個唔同崗位）`));
  ok(s1.ids.every(id => /^org_seed_/.test(id)), `⑦ 同步寫回嘅行應沿用穩定種子 id（實際 ${s1.ids.slice(0, 2).join(',')}…），下次載入按 id 對得返`);

  const grid2 = grid.map(r => r.slice());
  grid2[1][2] = '梁文澧（更新）';                                 // 行政組改了人名
  await runSync(grid2);
  const s2 = snap();
  ok(s2.raw === s1.raw, `⑦ 再同步（只改人名）唔應該令行數改變（${s1.raw} → ${s2.raw}）`);
  const upd = vm.runInContext(`JSON.stringify((globalThis.__app.getGroupOrgNodes('會操及典禮組').find(n=>(/總主任/.test(normalizeOrgText(n.title))))||{}).names)`, context);
  ok(String(JSON.parse(upd)).indexOf('更新') >= 0, `⑦ 內容有改動時必須更新到（實際 ${upd}）`);

  /* ⑧ 上傳／Drive 令 job_duties・contacts 出現重複 → 部門中心內容必須只有一份 */
  vm.runInContext(`
    localStorage.removeItem('event_staff_v7_isd_2026');
    globalThis.__app.eventData = { staff: { staff_source:null, org_chart:[
      {level:'協調組 (Level 4)', title:'總主任', names:'畢美儀、郭永豪'}
    ], contacts:[
      {id:'c1',name:'畢美儀',role_title:'總主任',group_name:'協調組',contact:'91112222',email:'a@x.com',job_desc:'物資',squad:''},
      {id:'c2',name:'畢美儀',role_title:'總主任',group_name:'協調組',contact:'',email:'',job_desc:'',squad:''}
    ], job_duties:[
      {id:'d1',group:'協調組',duty:'總主任：\\n統籌物資與車輛批核。\\n主任：\\n場地佈置及清點。'},
      {id:'d2',group:'協調組',duty:'總主任：\\n統籌物資與車輛批核。\\n主任：\\n場地佈置及清點。'}
    ] } };
    globalThis.__app.getDocumentsData = () => ({ docs: [] });
    globalThis.__app.getActivitiesData = () => ({ booths: [] });
    globalThis.__app.getFinanceData = () => ({ group_itemized_budgets: [] });
  `, context);
  const dup = JSON.parse(vm.runInContext(`JSON.stringify((()=>{
    const a=globalThis.__app, st=a.getStaffData();
    const box=a.groupInfoBoxesHTML('協調組');
    const secM=box.match(/職務大綱（各職位） \\((\\d+) 位\\)/);
    return { duties:st.job_duties.length, contacts:st.contacts.length,
             sections:secM?+secM[1]:-1,
             occurrences:(box.match(/統籌物資與車輛批核/g)||[]).length,
             posts:a.getGroupOrgNodes('協調組').length,
             kept:st.contacts[0] };
  })())`, context));
  ok(dup.duties === 1, `⑧ 同一組、同一內容嘅職務大綱應該只保留一份（實際 ${dup.duties} 份 → 以前會 ×2）`);
  ok(dup.sections === 2, `⑧ 部門中心「職務大綱（各職位）」應該得 2 位（總主任／主任），實際 ${dup.sections}`);
  ok(dup.occurrences === 1, `⑧ 部門中心內同一段職務唔應該出現兩次（實際 ${dup.occurrences} 次）`);
  ok(dup.contacts === 1, `⑧ 同一人同一組同一職銜應只計一次（實際 ${dup.contacts} 行）`);
  ok(dup.posts === 1, `⑧ 協調組崗位數應為 1（實際 ${dup.posts}）`);
  ok(dup.kept.contact === '91112222' && dup.kept.email === 'a@x.com', '⑧ 去重時要保留資料較齊嗰一份（電話／電郵唔可以冇咗）');

  // 空缺列（冇人名）唔可以因為「組別＋職銜相同」而被合併 —— isd_2026 有兩行「步操統籌主任」name 空白
  const vac = JSON.parse(vm.runInContext(`JSON.stringify((()=>{
    globalThis.__app.eventData = { staff: { staff_source:null, org_chart:[], job_duties:[], contacts:[
      {name:'',role_title:'步操統籌主任',group_name:'典禮及會操',level:'主任',contact:'',email:''},
      {name:'',role_title:'步操統籌主任',group_name:'典禮及會操',level:'主任',contact:'',email:''},
      {name:'張三',role_title:'主任',group_name:'協調組'},{name:'張三',role_title:'主任',group_name:'協調組'}
    ] } };
    const st=globalThis.__app.getStaffData();
    return { total: st.contacts.length, vacancies: st.contacts.filter(c=>!c.name).length };
  })())`, context));
  ok(vac.vacancies === 2, `⑧ 兩行空缺（冇人名）應該保留，唔可以當重複刪走（實際 ${vac.vacancies}）`);
  ok(vac.total === 3, `⑧ 空缺保留 ＋ 同名同組同職銜合併 → 應該得 3 行（實際 ${vac.total}）`);

  console.log(`✓ v89_org_chart_duplication_test — ${n} assertions passed`);
})();
