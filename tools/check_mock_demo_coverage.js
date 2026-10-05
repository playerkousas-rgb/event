#!/usr/bin/env node
/* check_mock_demo_coverage.js — 「模擬示範版」資料完成度報告
   ─────────────────────────────────────────────────────────────────────────────
   逐張公開資料卡（DASH_CARD_DEFS 入面 minLevel 0 嗰 15 張）＋ 參加者相關資料，
   對比 data/mock_demo.json 同 data/isd_2026.json，計出完成度。

   用法：node tools/check_mock_demo_coverage.js
        node tools/check_mock_demo_coverage.js --md     （輸出 Markdown 表，寫文件用）
*/
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const mk = JSON.parse(fs.readFileSync(path.join(root, 'data/mock_demo.json'), 'utf8'));
const d26 = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));
const MD = process.argv.includes('--md');

const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const cnt = v => Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : (v ? 1 : 0));

/* card: 卡片名｜rows: [資料集名, mock 路徑, 2026 路徑 (null＝2026 本身無), 單位] */
const CARDS = [
  ['公告及溝通', 'announcements', [
    ['公告', 'announcements.announcements', null, '條', '由 2026 通告／危機手冊／派飯／泊車生成'],
  ]],
  ['執行手冊', 'exec_manual', [
    ['分頁（匯總以下各卡）', null, null, '—', '內容來自下列各張資料卡'],
  ]],
  ['申請中心', 'apply_hub', [
    ['申請表單（內建流程）', null, null, '—', '八大表單：物資／攤位／車輛／訂餐／財務等'],
  ]],
  ['日程表', 'schedule', [
    ['日程段落', 'schedule', 'schedule', '段', '官方 Run Down'],
    ['來源登記', 'schedule_source', 'schedule_source', '欄', ''],
  ]],
  ['場地與活動總覽', 'activities', [
    ['攤位', 'activities.booths', 'activities.booths', '個', 'A–F 六區'],
    ['場地圖', 'activities.maps', 'activities.maps', '張', ''],
    ['遊戲卡／集印卡', 'activities.gameCards', 'activities.gameCards', '張', ''],
    ['活動流程示範', 'activities.activities', 'activities.activities', '項', '2026 本身為 0；示範版自備 3 項'],
  ]],
  ['組織架構與聯絡', 'staff', [
    ['組織架構圖', 'staff.org_chart', 'staff.org_chart', '人', ''],
    ['聯絡表', 'staff.contacts', 'staff.contacts', '人', '電話／電郵限本組＋副主席以上'],
    ['各組職務範圍', 'staff.job_duties', 'staff.job_duties', '組', ''],
    ['活動日工作人員編更', 'staff.event_staff_roster', 'staff.event_staff_roster', '人次', ''],
  ]],
  ['膳食管理', 'meals', [
    ['工作人員膳食名單', 'staff_meals_2026', 'staff_meals_2026', '人', ''],
    ['餐單', 'meal_menu_2026', 'meal_menu_2026', '項', ''],
    ['派飯分配（組別）', 'meal_distribution_2026.staff_groups', 'meal_distribution_2026.staff_groups', '組', ''],
    ['派飯分配（攤位）', 'meal_distribution_2026.booths', 'meal_distribution_2026.booths', '個', ''],
    ['膳食後勤', 'meal_logistics_2026', 'meal_logistics_2026', '項', ''],
    ['訂餐流程示範', 'meals.orders', null, '張', '2026 無訂餐紀錄；示範版自備'],
  ]],
  ['危機處理', 'crisis', [
    ['危機應變小組', 'crisis.team', 'crisis.team', '人', ''],
    ['緊急聯絡', 'crisis.contacts', 'crisis.contacts', '個', ''],
    ['相關文件', 'crisis.docs', 'crisis.docs', '份', ''],
    ['手冊 PDF', 'crisis.manual_file', 'crisis.manual_file', '份', ''],
  ]],
  ['通告及文件', 'documents', [
    ['文件', 'documents', 'documents', '份', ''],
    ['特別通告', 'notices', 'notices', '份', ''],
    ['活動日最後版本登記', 'activity_day_sources.files', 'activity_day_sources.files', '份', ''],
  ]],
  ['旅團須知', 'unit_guide', [
    ['須知條目', 'unit_guide.docs', null, '條', '由特別通告第 12/26 號逐項抽出'],
  ]],
  ['典禮儀式', 'ceremony', [
    ['Rundown 第一部分', 'ceremony.rundown_part1_v5.rows', 'ceremony.rundown_part1_v5.rows', '行', 'V5'],
    ['司儀稿', 'ceremony.mc_scripts', 'ceremony.mc_scripts', '份', ''],
    ['會操檢閱路線', 'ceremony.inspection_route.steps', 'ceremony.inspection_route.steps', '步', ''],
    ['其他制服團體', 'ceremony.ug_guests', 'ceremony.ug_guests', '位', ''],
    ['嘉賓名單', 'guest_roster.guests', 'guest_roster.guests', '位', '內部權限'],
    ['嘉賓車安排', 'guest_transport.guests', 'guest_transport.guests', '位', ''],
  ]],
  ['優異旅團獲獎名單', 'awards', [
    ['優異旅團', 'ceremony.meritRoster', 'ceremony.meritRoster', '團次', ''],
    ['成人獎勵', 'ceremony.adult_awards', 'ceremony.adult_awards', '項', ''],
  ]],
  ['口頭報價登記', 'oral_quotes', [
    ['報價紀錄', 'oral_quotes.quotes', null, '張', '活動期間逐單登記；2026 無存檔'],
  ]],
  ['童心捐贈大行動', 'donations', [
    ['捐贈紀錄', 'donations.records', null, '張', '活動日逐單填；2026 無存檔（v18 起公眾可喺手機預填，捐贈單直接入呢度）'],
  ]],
  ['公眾頻道 2027（示範）', 'public_channel_demo', [
    ['分眾身份', 'public_channel_2027.audiences', null, '類', ''],
    ['參加旅團名單', 'public_channel_2027.manual.participants.rows', null, '旅', ''],
    ['攤位', 'public_channel_2027.booths.list', null, '個', ''],
    ['嘉賓（內部）', 'public_channel_2027.guests_rows', null, '位', ''],
    ['童心捐贈計劃', 'public_channel_2027.donate.schemes', null, '個', 'v18：食品捐贈＋物品回收，含收／唔收清單及規格'],
  ]],
];

/* 參加者相關資料（用家特別問起） */
const PARTICIPANTS = [
  ['參加旅團名單', 'participants', 'participants', '旅'],
  ['旅團點名簽收', 'troop_checkin', 'troop_checkin', '旅'],
  ['報名來源登記', 'participants_source', 'participants_source', '欄'],
  ['優異旅團獲獎', 'ceremony.meritRoster', 'ceremony.meritRoster', '團次'],
  ['嘉賓名單', 'guest_roster.guests', 'guest_roster.guests', '位'],
  ['其他制服團體', 'ceremony.ug_guests', 'ceremony.ug_guests', '位'],
  ['工作人員編更', 'staff.event_staff_roster', 'staff.event_staff_roster', '人次'],
  ['工作人員膳食', 'staff_meals_2026', 'staff_meals_2026', '人'],
  ['派章名單', 'souvenirs.staff_roster_2026', 'souvenirs.staff_roster_2026', '人'],
];

const statusOf = (m, r, has26) => {
  if (!has26) return m > 0 ? ['✅', '齊（2026 無對應欄位，已由 2026 文件生成／示範版自備）'] : ['⬜', '空（2026 本身無此資料，正常）'];
  if (r === 0) return m > 0 ? ['✅', '齊（2026 為 0，示範版自備）'] : ['⬜', '2026 本身為 0'];
  if (m >= r) return ['✅', '齊（100%）'];
  if (m > 0) return ['⚠️', Math.round(m / r * 100) + '%'];
  return ['❌', '未填'];
};

const rows = [];
let cardsFull = 0, cardsPart = 0, cardsNA = 0;
for (const [cardName, cardId, datasets] of CARDS) {
  let allOK = true, anyData = false, anyApplicable = false;
  for (const [label, mPath, rPath, unit, memo] of datasets) {
    if (!mPath) { rows.push([cardName, label, '—', '—', '✅', memo || '內建']); anyApplicable = true; anyData = true; continue; }
    const m = cnt(get(mk, mPath));
    const has26 = !!rPath;
    const r = has26 ? cnt(get(d26, rPath)) : 0;
    const [icon, text] = statusOf(m, r, has26);
    rows.push([cardName, label, m + unit, has26 ? r + unit : '—', icon, (memo ? memo + '｜' : '') + text]);
    if (icon === '✅') { anyData = true; anyApplicable = true; }
    else if (icon === '⬜') { /* 不適用 */ }
    else { allOK = false; anyApplicable = true; }
  }
  if (!anyApplicable) cardsNA++; else if (allOK && anyData) cardsFull++; else cardsPart++;
}

const prow = [];
for (const [label, mPath, rPath, unit] of PARTICIPANTS) {
  const m = cnt(get(mk, mPath)), r = cnt(get(d26, rPath));
  prow.push([label, m + unit, r + unit, m >= r && r > 0 ? '✅ 齊' : (m ? '⚠️ ' + Math.round(m / r * 100) + '%' : '❌ 未填')]);
}

/* 資料品質：2026 本身嘅缺口（唔係示範版填得唔夠，係源頭未填） */
const cons = (mk.staff && mk.staff.contacts) || [];
const roster = (mk.staff && mk.staff.event_staff_roster) || [];
const booths = (mk.activities && mk.activities.booths) || [];
const GAPS = [
  ['聯絡表：空缺崗位（未有人）', cons.filter(c => c.vacant).length + ' 個', '2026 聯絡表留空；APP 已保留並標 vacant，唔會自己填人'],
  ['聯絡表：有名但未填電話', cons.filter(c => c.contact_missing).length + ' 人', '標 contact_missing，待行政組補'],
  ['聯絡表：沿用示範號碼', cons.filter(c => c.contact_placeholder).length + ' 人', '架構圖有名但 2026 聯絡表冇，暫用示範號碼頂住'],
  ['工作人員編更：空名額（NA）', roster.filter(r => !r.name || /^NA$/i.test(String(r.name).trim())).length + ' 個', '來源保留嘅攤位預留位'],
  ['攤位：未填負責人', booths.filter(b => !String(b.contact_person || '').trim()).length + ' / ' + booths.length, 'ISD2026 攤位總表部分攤位負責人欄空白（已知）'],
  ['攤位：未填人手數目', booths.filter(b => !String(b.staff_count || '').trim()).length + ' / ' + booths.length, '同上'],
  ['財務：收入／支出', (mk.finance && mk.finance.income || []).length + ' / ' + (mk.finance && mk.finance.expenses || []).length + ' 項（示範）', '2026 正式檔案為 0，預算只有 Google Sheet 連結'],
  ['口頭報價・童心捐贈紀錄', '0 張', '活動期間逐單登記，2026 無存檔（童心捐贈 v18 起由公眾頻道預填入數）'],
];

if (MD) {
  console.log('| 公開資料卡 | 資料集 | 示範版 | 2026 來源 | 狀態 | 備註 |');
  console.log('|---|---|---|:--:|:--:|---|');
  for (const r of rows) console.log('| ' + r[0] + ' | ' + r[1] + ' | **' + r[2] + '** | ' + r[3] + ' | ' + r[4] + ' | ' + r[5] + ' |');
  console.log('\n| 參加者相關資料 | 示範版 | 2026 來源 | 狀態 |');
  console.log('|---|--:|--:|:--:|');
  for (const r of prow) console.log('| ' + r[0] + ' | **' + r[1] + '** | ' + r[2] + ' | ' + r[3] + ' |');
  console.log('\n| 源頭缺口（2026 本身未填，示範版照實反映） | 數量 | 說明 |');
  console.log('|---|--:|---|');
  for (const g of GAPS) console.log('| ' + g[0] + ' | ' + g[1] + ' | ' + g[2] + ' |');
} else {
  const w = s => { let L = 0; for (const c of String(s)) L += /[\u3000-\u9fff\uff00-\uffef\u2460-\u24ff]/.test(c) ? 2 : 1; return L; };
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - w(s)));
  console.log('\n模擬示範版（mock_demo）資料完成度 — 對比 isd_2026');
  console.log('═'.repeat(110));
  console.log(pad('公開資料卡', 22) + pad('資料集', 26) + pad('示範版', 12) + pad('2026', 12) + pad('', 4) + '備註');
  console.log('─'.repeat(110));
  let last = '';
  for (const r of rows) { console.log(pad(r[0] === last ? "" : r[0], 22) + pad(r[1], 26) + pad(r[2], 12) + pad(r[3], 12) + pad(r[4], 4) + r[5]); last = r[0]; }
  console.log('═'.repeat(110));
  console.log('公開資料卡：' + cardsFull + ' 張齊全 ✅　' + cardsPart + ' 張未齊 ⚠️　' + cardsNA + ' 張不適用 ⬜　（共 ' + CARDS.length + ' 張）');
  console.log('\n參加者相關資料');
  console.log('─'.repeat(70));
  for (const r of prow) console.log(pad(r[0], 24) + pad(r[1], 14) + pad(r[2], 14) + r[3]);
  console.log('─'.repeat(70));
  console.log('\n源頭缺口（2026 本身未填，示範版照實反映，唔會自己作）');
  console.log('─'.repeat(100));
  for (const g of GAPS) console.log(pad(g[0], 30) + pad(g[1], 14) + g[2]);
  console.log('─'.repeat(100) + '\n');
}
