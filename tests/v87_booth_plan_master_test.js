#!/usr/bin/env node
'use strict';
/* v8.7 回歸測試（攤位計劃書＋總表＋MOCK 全部管理權限）：
   ① MOCK（模擬示範版）示範登入＝所有管理權限全開（mock_admin 標記：isAdmin/isSuperAdmin/roleLevel=100/批核權/用戶名單）
   ② 攤位卡升級為「攤位計劃書」：表單欄位對標主題節目組 Google Form（活動內容／十五五主題／帳篷 3mW x 3mD／摺枱／摺椅／負責人資料）
   ③ 「總表」頁籤：按 2026 攤位總表 分區＋編號匯總——TOTAL 總數（帳篷／摺枱／摺椅／圍布／電源）＋每攤位一行明細；未提交攤位顯示「未提交」
   ④ 兼容舊版「一項一紀錄」（枱／椅／帳篷圍布／電源）：同攤位多筆合併為一行，總數正確
   ⑤ 真實活動（isd_2026）同樣有總表網格（0 計劃書時 TOTAL 0，唔放虛構資料）
   ⑥ 提交計劃書（vm 實跑）：新紀錄帶齊欄位並即時反映喺總表；collectApplications 收入「我的監察」 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const mock = JSON.parse(fs.readFileSync(path.join(root, 'data/mock_demo.json'), 'utf8'));
const isd = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

/* ---------- ① 資料層 ---------- */
ok(Array.isArray(mock.supplies.booth_requests) && mock.supplies.booth_requests.length === 3, '① mock 攤位計劃書示範 3 筆（每攤位一筆）');
mock.supplies.booth_requests.forEach(r => {
  ok(r.item_name === '攤位計劃書' && r.zone && r.booth_no && r.unit_name && r.booth_name, `① 計劃書帶總表欄位（${r.request_id}）`);
  ok(r.activity_desc && r.fif15_content, `① 計劃書帶活動內容＋「十五五」主題（${r.request_id}）`);
  ok(r.owner_name && r.owner_age_group && r.owner_unit && r.owner_position && r.owner_phone && r.owner_email, `① 計劃書帶負責人完整資料（${r.request_id}）`);
  ok(typeof r.qty_tent === 'number' && typeof r.qty_table === 'number' && typeof r.qty_chair === 'number', `① 計劃書帶帳篷／摺枱／摺椅數量（${r.request_id}）`);
});
const a01 = mock.supplies.booth_requests.find(r => r.booth_code === 'A01');
ok(a01 && a01.qty_tent === 1 && a01.qty_table === 3 && a01.qty_chair === 8 && a01.skirting_qty === 2 && a01.power_w === 500, '① A01 示範：1 帳篷 3 枱 8 椅 2 圍布 500W');
ok(Array.isArray(isd.supplies.booth_requests) && isd.supplies.booth_requests.length === 0, '① 真實活動 isd_2026 唔放虛構計劃書（總表網格由程式內嵌）');
ok(isd.data_version >= '2026-08-28T00:00:00Z-v8', '① isd_2026 data_version 已上調（v8.9）');

/* ---------- vm 真渲染 harness（沿用 mock_demo_sync_test 模式） ---------- */
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
const bundle = scripts.replace(/const app=window\.app=new ScoutEventApp\([\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';
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
    currentEvent: { event_id: 'mock_demo', event_name: '模擬示範版（完整示範資料）' },
    currentUser: { role: 'chairperson', name: '區子君', user_id: '區子君', group_name: '主席及執行副主席', contact: '92000001' },
    eventData: ${JSON.stringify(mock)},
    navHistory: [], currentModule: null, gasUrl: '', apiKey: 'k',
    systemConfig: { bannerText: '', nextMeeting: '', meetingLocation: '', allowPublic: true, defaultPwd: '1234' },
    eventsList: [], usersList: [], approvalPerms: []
  });
`, context);
const run = code => vm.runInContext(code, context);

/* ---------- ② MOCK 全部管理權限 ---------- */
run(`__app.showDashboard=function(){}; __app.demoLogin('陳子明');`);
let cu = JSON.parse(run(`JSON.stringify(__app.currentUser)`));
ok(cu.mock_admin === true, '② 示範登入（staff 陳子明）帶 mock_admin 標記');
ok(run(`__app.isAdmin()`) === true, '② MOCK staff 亦 isAdmin()＝true（全部管理權限）');
ok(run(`__app.isSuperAdmin()`) === true, '② MOCK staff 亦 isSuperAdmin()＝true');
ok(run(`__app.roleLevel(__app.currentUser.role)`) === 100, '② MOCK roleLevel 返回 100（最高層）');
ok(run(`__app.canApproveArea('supplies')`) === true, '② MOCK 有物資批核權（批核權限表路由全開）');
ok(run(`__app.canApproveArea('finance')`) === true, '② MOCK 有財務批核權');
ok(run(`__app.canSeeAllUsers()`) === true, '② MOCK 可看全部用戶名單');
ok(run(`__app.canManageApprovalRouting()`) === true, '② MOCK 可改批核權限表');
run(`__app.demoLogin('某個臨時示範者');`);
cu = JSON.parse(run(`JSON.stringify(__app.currentUser)`));
ok(cu.mock_admin === true && cu.role === 'super_admin', '② 示範登入任意姓名＝系統管理員＋全部管理權限');
run(`__app.demoLogin('畢美儀');`); // 協調組總主任（批核物資）
ok(run(`__app.roleLevel('staff')`) === 20, '② 其他角色嘅 level 唔受影響（只提升登入者自己）');
ok(run(`__app.isAdmin()`) === true, '② 各示範身份（協調組總主任）都係全權限');
// 正式活動唔會有 mock_admin
run(`__app.currentEvent={event_id:'isd_2026',event_name:'港島童軍繽紛日'}; __app.currentUser={role:'staff',name:'某人',user_id:'某人',group_name:'主題節目組'};`);
ok(run(`__app.isAdmin()`) === false && run(`__app.roleLevel(__app.currentUser.role)`) === 20, '② 正式活動 staff 唔受影響（無 mock_admin）');

/* ---------- ③ 借用統計卡（像物資卡）＋招牌統計＋計劃書明細（mock 有 3 筆計劃書） ---------- */
run(`__app.currentEvent={event_id:'mock_demo',event_name:'模擬示範版（完整示範資料）'}; __app.currentUser=JSON.parse('${JSON.stringify(JSON.parse(run(`JSON.stringify(__app.currentUser)`)))}');`);
run(`__app.currentUser.mock_admin=true; __app.boothSubTab='borrow'; __app.openModule('booth');`);
let boothHTML = elements['module-content'].innerHTML;
ok(boothHTML.includes('攤位計劃書'), '③ 攤位卡標題為「攤位計劃書」');
ok(boothHTML.includes('借用統計') && boothHTML.includes('招牌統計') && boothHTML.includes('計劃書明細'), '③ 攤位卡三個頁籤：借用統計／招牌統計／計劃書明細');
ok(boothHTML.includes('每項物資統計（要借什麼') , '③ 借用統計有「要借什麼」每項統計');
ok(boothHTML.includes('A01') && boothHTML.includes('積極公民任務站'), '③ 借用統計顯示 A01 積極公民任務站（每攤位明細）');
ok(boothHTML.includes('TOTAL（全部分區總數）'), '③ 借用統計有 TOTAL 行');
// TOTAL 數字：帳篷 2、摺枱 6、摺椅 18、圍布 2、電源 1300W、3 攤位
ok(boothHTML.includes('TOTAL 帳篷(頂)') && boothHTML.includes('>2<'), '③ TOTAL 帳篷＝2（A01 1＋B01 1）');
ok(boothHTML.includes('>18<'), '③ TOTAL 摺椅＝18（8+6+4）');
ok(boothHTML.includes('3 攤位有計劃書'), '③ TOTAL 有計劃書攤位＝3');
ok(boothHTML.includes('執行手冊 → 攤位總表'), '③ 攤位卡有直達「執行手冊 → 攤位總表」入口');
// 招牌統計頁籤
run(`__app.switchBoothTab('sign');`);
boothHTML = elements['module-content'].innerHTML;
ok(boothHTML.includes('招牌製作清單（3 個招牌）'), '③ 招牌統計：3 個招牌');
ok(boothHTML.includes('氣槍體驗站') && boothHTML.includes('義工招募站'), '③ 招牌統計列出各招牌名稱');
// 計劃書明細頁籤
run(`__app.switchBoothTab('list');`);
boothHTML = elements['module-content'].innerHTML;
ok(boothHTML.includes('18-25歲，並為樂行童軍支部成員'), '③ 計劃書明細顯示完整負責人年齡組別');
ok(boothHTML.includes('本組確認'), '③ B01 待本組確認：MOCK 全權限可見「本組確認」');
ok(boothHTML.includes('射燈 × 2支'), '③ 明細顯示額外物資（射燈）');
// 完整流程：本組確認 → 批准
run(`__app.confirmBoothApplication('req_booth_4');`);
let b01 = JSON.parse(run(`JSON.stringify(__app.getSuppliesData().booth_requests.find(r=>r.request_id==='req_booth_4'))`));
ok(b01.group_confirmation_status === 'confirmed', '③ MOCK 全權限可代本組確認');
run(`__app.switchBoothTab('list');`);
boothHTML = elements['module-content'].innerHTML;
ok(boothHTML.includes('>批准<') && boothHTML.includes('>拒絕<'), '③ 確認後 MOCK 全權限可喺明細批核');
run(`__app.boothSetStatus('req_booth_4','approved');`);
b01 = JSON.parse(run(`JSON.stringify(__app.getSuppliesData().booth_requests.find(r=>r.request_id==='req_booth_4'))`));
ok(b01.status === 'approved' && b01.approved_by, '③ 批准後狀態＝已批核＋批核人');
run(`__app.boothSubTab='borrow'; __app.openModule('booth');`);
boothHTML = elements['module-content'].innerHTML;
ok(boothHTML.includes('已批核'), '③ 借用統計即時反映 B01 已批核');

/* ---------- ③b 執行手冊 → 攤位總表（公開，完整版含聯絡狀態） ---------- */
run(`__app.openModule('exec_manual'); __app.switchExecManualTab('booth_master');`);
let manualHTML = elements['exec-manual-panel'].innerHTML;
ok(manualHTML.includes('2026 攤位總表'), '③b 執行手冊有「攤位總表」頁籤內容');
ok(manualHTML.includes('已聯絡') && manualHTML.includes('已回覆') && manualHTML.includes('確認出席'), '③b 攤位總表含已聯絡／已回覆／確認出席欄（原 OUTPUT 表）');
ok(manualHTML.includes('font-extrabold">A</td><td class="border px-2 py-1.5 font-mono font-bold">01</td>') && manualHTML.includes('積極公民任務站'), '③b 總表填入計劃書（A 01 行＋招牌名）');
ok(manualHTML.includes('未提交'), '③b 無計劃書嘅攤位顯示「未提交」');
ok(manualHTML.includes('分區 A · 積極公民') && manualHTML.includes('分區 G'), '③b 總表涵蓋全部 2026 攤位總表分區');
ok(manualHTML.includes('TOTAL（全部分區總數）'), '③b 總表有 TOTAL 行');
ok(manualHTML.includes('🤷'), '③b 聯絡狀態顯示待確認（原表 🤷）');
ok(manualHTML.includes('94000002'), '③b 登入後總表顯示負責人電話');
ok(manualHTML.includes('匯出總表 Excel') && manualHTML.includes('匯出總表 Word') && !manualHTML.includes('CSV'), '③b 管理層可匯出總表 Excel／Word（v14.1：冇 CSV）');
// 未登入（公眾）：電話隱藏
run(`__app.currentUser=null; __app.switchExecManualTab('booth_master');`);
manualHTML = elements['exec-manual-panel'].innerHTML;
ok(!manualHTML.includes('94000002') && manualHTML.includes('🔒'), 'b 公眾睇攤位總表：聯絡電話隱藏（🔒）');
run(`__app.currentUser={role:'staff',name:'某人',user_id:'某人',group_name:'主題節目組',mock_admin:true};`);

/* ---------- ③c 主題節目組卡片：攤位資料(Drive)／攤位總表／借用統計 ---------- */
run(`__app.currentEvent={event_id:'mock_demo',event_name:'模擬示範版（完整示範資料）'}; __app.openGroupManagement('主題節目組');`);
let groupHTML = elements['module-content'].innerHTML;
ok(groupHTML.includes('📁 攤位資料 (Drive)') && groupHTML.includes('🗒️ 攤位總表') && groupHTML.includes('📊 借用統計＋招牌'), '③c 節目組卡片有 4 個頁籤（本組申請／攤位資料/Drive／攤位總表／借用統計）');
run(`__app.switchGroupTab('drive');`);
groupHTML = elements['group-tab-drive'].innerHTML;
ok(groupHTML.includes('攤位資料總表 (共 8 個攤位'), '③c 攤位資料(Drive)頁籤顯示完整 8 個示範攤位（同 DRIVE 內攤位資料）');
ok(groupHTML.includes('同步最新 (Drive 直接讀)'), '③c 有 Drive 同步按鈕');
run(`__app.switchGroupTab('master');`);
groupHTML = elements['group-tab-master'].innerHTML;
ok(groupHTML.includes('TOTAL（全部分區總數）') && groupHTML.includes('已聯絡'), '③c 節目組卡片「攤位總表」頁籤＝完整總表');
run(`__app.switchGroupTab('borrow');`);
groupHTML = elements['group-tab-borrow'].innerHTML;
ok(groupHTML.includes('每項物資統計（要借什麼') && groupHTML.includes('招牌製作清單'), '③c 節目組卡片「借用統計」頁籤＝借用統計＋招牌統計');

/* ---------- ④ 兼容舊版「一項一紀錄」 ---------- */
const legacyTotals = run(`JSON.stringify(__app.boothPlanAggregates([
  {item_name:'枱',qty_requested:3,unit:'張',zone:'A',booth_no:'01',unit_name:'X',booth_name:'Y',status:'approved'},
  {item_name:'椅',qty_requested:8,unit:'張',zone:'A',booth_no:'01',unit_name:'X',booth_name:'Y',status:'approved'},
  {item_name:'帳篷圍布',qty_requested:2,unit:'塊',zone:'A',booth_no:'01',status:'pending'},
  {item_name:'電源',qty_requested:800,unit:'W',zone:'A',booth_no:'01',status:'pending'},
  {item_name:'射燈',qty_requested:2,unit:'支',zone:'A',booth_no:'01',status:'pending'}
]))`);
const lt = JSON.parse(legacyTotals);
ok(lt.totals.tent === 0 && lt.totals.table === 3 && lt.totals.chair === 8 && lt.totals.skirting === 2 && lt.totals.power_w === 800, '④ 舊版一項一紀錄合併：枱3 椅8 圍布2 電源800W');
ok(lt.totals.booths === 1, '④ 同攤位 5 筆舊紀錄合併為 1 行');
ok(lt.rows['A01'].equip.other.some(x => x.startsWith('射燈')), '④ 舊版非常規物資列入「其他」');
ok(lt.rows['A01'].status === 'pending', '④ 舊紀錄狀態：有 pending 即顯示待批核');
const equip = JSON.parse(run(`JSON.stringify(__app.boothEquipOf({item_name:'帳篷',qty_requested:2,qty_tent:1,extra_items:[{item_name:'摺椅',qty_requested:4,unit:'張'}]}))`));
ok(equip.tent === 3 && equip.chair === 4, '④ 新版欄位＋extra_items 一併計入（帳篷 1+2=3、摺椅 4）');

/* ---------- ⑤ 真實活動（isd_2026）：借用統計卡＋執行手冊總表 ---------- */
run(`__app.currentEvent={event_id:'isd_2026',event_name:'港島童軍繽紛日'};
     __app.eventData=${JSON.stringify(isd)};
     __app.currentUser={role:'staff',name:'某人',user_id:'某人',group_name:'主題節目組'};
     __app.boothSubTab='borrow'; __app.openModule('booth');`);
boothHTML = elements['module-content'].innerHTML;
ok(boothHTML.includes('暫無計劃書 — 提交後即時出現'), '⑤ 真實活動 0 計劃書：借用統計顯示暫無（提交後即時出現）');
ok(boothHTML.includes('TOTAL 帳篷(頂)'), '⑤ 真實活動借用統計 TOTAL chips 照常');
run(`__app.openModule('exec_manual'); __app.switchExecManualTab('booth_master');`);
manualHTML = elements['exec-manual-panel'].innerHTML;
ok(manualHTML.includes('TOTAL（全部分區總數）') && manualHTML.includes('0 攤位有計劃書'), '⑤ 真實活動 0 計劃書：總表 TOTAL 0（網格照常顯示）');
ok(manualHTML.includes('港島童軍皮藝會') && manualHTML.includes('未提交'), '⑤ 真實活動總表網格（2026 攤位總表）全顯示、未提交');
ok(manualHTML.includes('已聯絡'), '⑤ 真實活動總表含聯絡狀態欄');

/* ---------- ⑥ 提交計劃書（vm 實跑）＋collectApplications ---------- */
run(`__app.currentEvent={event_id:'mock_demo',event_name:'模擬示範版（完整示範資料）'};
     __app.eventData=${JSON.stringify(mock)};
     __app.currentUser={role:'director',name:'曾令勤',user_id:'曾令勤',group_name:'主題節目組',mock_admin:true};`);
// 填表單（harness el 有 value 欄位）
['booth-zone','booth-no','booth-unit-select','booth-name','booth-activity','booth-fif15','booth-qty-qty_tent','booth-qty-qty_table','booth-qty-qty_chair','booth-other','booth-delivery','booth-owner-name','booth-owner-age','booth-owner-unit','booth-owner-position','booth-owner-phone','booth-owner-email','booth-group','booth-contact','booth-requested-by'].forEach(id => { elements[id] && (elements[id].value = ''); });
run(`
  document.getElementById('booth-zone').value='D';
  document.getElementById('booth-no').value='09';
  document.getElementById('booth-unit-select').value='港島童軍皮藝會';
  document.getElementById('booth-name').value='皮藝體驗站';
  document.getElementById('booth-activity').value='皮繩製作體驗';
  document.getElementById('booth-fif15').value='未通配合';
  document.getElementById('booth-qty-qty_tent').value='2';
  document.getElementById('booth-qty-qty_table').value='4';
  document.getElementById('booth-qty-qty_chair').value='4';
  document.getElementById('booth-owner-name').value='測試負責人';
  document.getElementById('booth-owner-age').value='25-39歲';
  document.getElementById('booth-owner-unit').value='港島童軍皮藝會';
  document.getElementById('booth-owner-position').value='隊長';
  document.getElementById('booth-owner-phone').value='91234567';
  document.getElementById('booth-owner-email').value='test@isd.local';
  document.getElementById('booth-group').value='主題節目組';
  document.getElementById('booth-contact').value='91234567';
  document.getElementById('booth-requested-by').value='曾令勤';
`);
run(`__app.openBoothSupplyForm();`);
let formHTML = elements['record-form-fields'].innerHTML;
ok(formHTML.includes('id="booth-qty-qty_tent"') && formHTML.includes('id="booth-qty-qty_table"') && formHTML.includes('id="booth-qty-qty_chair"'), '⑥ 表單有帳篷／摺枱／摺椅數量欄');
ok(formHTML.includes('3mW x 3mD'), '⑥ 表單帳篷標明 3mW x 3mD');
ok(formHTML.includes('id="booth-activity"') && formHTML.includes('id="booth-fif15"') && formHTML.includes('id="booth-owner-age"') && formHTML.includes('id="booth-owner-email"'), '⑥ 表單有活動內容／十五五主題／年齡組別／電郵');
ok(formHTML.includes('60歲及以上'), '⑥ 年齡組別選項完整（Google Form 原樣 7 項）');
// 再填值（openBoothSupplyForm 會重寫 innerHTML，harness el 值需重設）
run(`
  document.getElementById('booth-zone').value='D';
  document.getElementById('booth-no').value='09';
  document.getElementById('booth-unit-select').value='港島童軍皮藝會';
  document.getElementById('booth-name').value='皮藝體驗站';
  document.getElementById('booth-activity').value='皮繩製作體驗';
  document.getElementById('booth-fif15').value='未通配合';
  document.getElementById('booth-qty-qty_tent').value='2';
  document.getElementById('booth-qty-qty_table').value='4';
  document.getElementById('booth-qty-qty_chair').value='4';
  document.getElementById('booth-owner-name').value='測試負責人';
  document.getElementById('booth-owner-age').value='25-39歲';
  document.getElementById('booth-owner-unit').value='港島童軍皮藝會';
  document.getElementById('booth-owner-position').value='隊長';
  document.getElementById('booth-owner-phone').value='91234567';
  document.getElementById('booth-owner-email').value='test@isd.local';
  document.getElementById('booth-group').value='主題節目組';
  document.getElementById('booth-contact').value='91234567';
  document.getElementById('booth-requested-by').value='曾令勤';
  __app.submitBoothSupplyForm();
`);
const saved = JSON.parse(store.get('event_supplies_v7_mock_demo'));
const newPlan = (saved.booth_requests || []).find(r => r.booth_code === 'D09');
ok(!!newPlan, '⑥ 提交後 D09 計劃書已入紀錄');
ok(newPlan && newPlan.zone === 'D' && newPlan.unit_name === '港島童軍皮藝會' && newPlan.booth_name === '皮藝體驗站', '⑥ D09 帶總表欄位');
ok(newPlan && newPlan.qty_tent === 2 && newPlan.qty_table === 4 && newPlan.qty_chair === 4, '⑥ D09 數量正確');
ok(newPlan && newPlan.owner_name === '測試負責人' && newPlan.owner_age_group === '25-39歲' && newPlan.owner_phone === '91234567' && newPlan.owner_email === 'test@isd.local', '⑥ D09 負責人資料完整');
ok(newPlan && newPlan.group_confirmation_status === 'not_required', '⑥ 主任(mock_admin 全權限)提交免本組確認');
// 總表即時反映
run(`__app.boothSubTab='master'; __app.openModule('booth');`);
boothHTML = elements['module-content'].innerHTML;
ok(boothHTML.includes('皮藝體驗站') && boothHTML.includes('4 攤位有計劃書'), '⑥ 總表即時反映新提交（4 攤位）');
ok(boothHTML.includes('>4<'), '⑥ TOTAL 帳篷由 2 變 4');
// 我的監察
const apps = JSON.parse(run(`JSON.stringify(__app.collectApplications().filter(x=>x.type==='booth').map(x=>x.typeLabel))`));
ok(apps.length >= 4 && apps.every(x => x === '攤位計劃書'), '⑥ collectApplications 收入攤位計劃書（我的監察/批核中心可追蹤）');

/* ---------- ⑦ 模組標題／申請中心改名 ---------- */
const coreSrc = fs.readFileSync(path.join(root, 'js/10-app-core.js'), 'utf8');
const applySrc = fs.readFileSync(path.join(root, 'js/26-monitor-apply.js'), 'utf8');
ok(coreSrc.includes("booth:'攤位計劃書'"), '⑦ 模組標題改名攤位計劃書');
ok(applySrc.includes("title:'攤位計劃書'") && applySrc.includes('公開填寫，無需登入'), '⑦ 申請中心入口改名＋保留公開申請');
ok(!/title:'攤位物資申請'/.test(applySrc), '⑦ 申請中心唔再叫攤位物資申請');

console.log(`OK ${n} assertions — v8.7 攤位計劃書＋總表＋MOCK 全權限`);
