#!/usr/bin/env node
/* mock_demo_2026_fill_test.js — 模擬示範版「用 2026 真實資料填滿」回歸測試（v17）
   驗證 tools/fill_mock_demo_from_2026.js 嘅成果：
   ① 參加者相關資料全部有齊（＝同 isd_2026 一樣多）
   ② 工作人員公開資料（15 張 minLevel 0 卡）背後嘅資料集全部有齊
   ③ 正規化契約：org_chart 逐人一行／contacts 8 位電話／組名正式化
   ④ 唔准污染：isd_2026.json 本身唔可以被改（crisis.accidents 必須 0）
   ⑤ APP 真係讀得到內置資料（announcements／unit_guide／ceremony 嘅 fallback 已接線）
*/
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const mk = JSON.parse(read('data/mock_demo.json'));
const d26 = JSON.parse(read('data/isd_2026.json'));
const evs = JSON.parse(read('data/events.json'));

let n = 0;
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); n++; };
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const len = v => Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 0);

/* ── ① 參加者相關資料：示範版 ≥ 2026 ── */
const PARTICIPANT_SETS = [
  ['participants', 31], ['troop_checkin', 31], ['ceremony.meritRoster', 188],
  ['guest_roster.guests', 102], ['ceremony.ug_guests', 8], ['ceremony.adult_awards', 6],
  ['staff.event_staff_roster', 279], ['staff_meals_2026', 290], ['souvenirs.staff_roster_2026', 290],
];
for (const [p, expect] of PARTICIPANT_SETS) {
  const m = len(get(mk, p)), r = len(get(d26, p));
  ok(r === expect, `① 2026 來源 ${p} 應為 ${expect}（實際 ${r}）`);
  ok(m === r, `① 參加者資料 ${p} 示範版應同 2026 一樣齊（${m}/${r}）`);
}
ok(get(mk, 'participants').every(p => p.unit_name && p.area && p.headcount !== undefined), '① 每個參加旅團有旅名／區會／人數');
const totalHead = get(mk, 'participants').reduce((a, p) => a + (+p.headcount || 0), 0);
ok(totalHead > 1000, `① 參加人數總和應 > 1000（實際 ${totalHead}）`);

/* ── ② 工作人員公開資料：每張卡背後嘅資料集都唔可以空 ── */
const PUBLIC_CARD_DATA = [
  ['公告及溝通', 'announcements.announcements', 3],
  ['旅團須知', 'unit_guide.docs', 5],
  ['日程表', 'schedule', 6],
  ['場地與活動總覽', 'activities.booths', 33],
  ['組織架構與聯絡', 'staff.org_chart', 50],
  ['組織架構與聯絡', 'staff.contacts', 60],
  ['組織架構與聯絡', 'staff.job_duties', 11],
  ['膳食管理', 'staff_meals_2026', 290],
  ['膳食管理', 'meal_menu_2026', 9],
  ['膳食管理', 'meal_distribution_2026.staff_groups', 14],
  ['危機處理', 'crisis.team', 14],
  ['危機處理', 'crisis.contacts', 13],
  ['通告及文件', 'documents', 79],
  ['通告及文件', 'notices', 3],
  ['典禮儀式', 'ceremony.rundown_part1_v5.rows', 13],
  ['典禮儀式', 'ceremony.mc_scripts', 3],
  ['典禮儀式', 'ceremony.inspection_route.steps', 6],
  ['優異旅團獲獎名單', 'ceremony.meritRoster', 188],
  ['公眾頻道 2027（示範）', 'public_channel_2027.audiences', 7],
];
for (const [card, p, min] of PUBLIC_CARD_DATA) {
  ok(len(get(mk, p)) >= min, `② 「${card}」嘅 ${p} 應 ≥ ${min}（實際 ${len(get(mk, p))}）`);
}

/* ── ③ 正規化契約 ── */
const org = mk.staff.org_chart;
ok(org.every(r => r.group && r.title && r.names && r.desc && /Level\s*\d/.test(r.level)), '③ org_chart 每行齊 group/title/names/desc/level');
ok(org.every(r => !/[\s、,，]/.test(String(r.names).trim())), '③ org_chart 逐人一行（names 內冇分隔符）');
const GROUPS = ['顧問團', '主席及執行副主席', '秘書處', '會操及典禮組', '主題節目組', '品牌推廣組', '嘉賓接待組', '協調組', '服務及發展組', '行政組'];
const orgGroups = new Set(org.map(r => r.group));
GROUPS.forEach(g => ok(orgGroups.has(g), `③ org_chart 應包含組別 ${g}`));
const namedContacts = mk.staff.contacts.filter(c => c.name);
ok(namedContacts.every(c => /^\d{8}$/.test(String(c.contact)) || c.contact_missing === true),
   '③ 有名嘅 contacts 電話一律 8 位數字（2026 本身未填嗰啲要標 contact_missing）');
ok(namedContacts.filter(c => c.contact_missing).length <= 5, '③ 未填電話嘅人唔多過 5 個（多過就係匯入出錯）');
ok(mk.staff.contacts.filter(c => !c.name).every(c => c.vacant === true), '③ 2026 聯絡表嘅空缺崗位保留並標 vacant:true（唔好靜靜雞刪走）');
const contactNames = new Set(mk.staff.contacts.map(c => c.name));
org.forEach(r => ok(contactNames.has(r.names), `③ 架構圖人名「${r.names}」喺聯絡表揾得到`));
ok(mk.users.length >= 54 && mk.users.every(u => /^\d{8}$/.test(String(u.contact)) || u.contact === ''), '③ users ≥ 54 且電話已正規化');
ok(mk.users.some(u => u.name === '朱家聰' && u.role === 'chairperson'), '③ users 含 2026 真實主席 朱家聰');
ok(mk.users.some(u => u.name === '陳子明'), '③ users 保留示範登入帳戶 陳子明');

/* ── ④ 唔准污染 isd_2026（正式凍結檔） ── */
ok(Array.isArray(d26.crisis.accidents) && d26.crisis.accidents.length === 0, '④ isd_2026 意外報告必須保持 0（唔准寫示範資料入正式檔）');
ok(mk.crisis.accidents.length > 0, '④ 示範版保留意外報告樣本（俾人睇表格）');
ok(mk.event_id === 'mock_demo', '④ event_id 冇變');
const mev = evs.find(e => e.event_id === 'mock_demo');
ok(mev && mev.event_name === mk.event_name, '④ events.json 同 mock_demo.json 嘅活動名一致');
ok(mk.mock_fill_source && mk.mock_fill_source.from === 'data/isd_2026.json', '④ 有填充來源登記（mock_fill_source）');

/* ── ⑤ APP 接線：三個 getter 要識得讀內置資料 ── */
const ann = read('js/34-announcements.js');
ok(/eventData\['announcements'\][\s\S]{0,160}return ed/.test(ann), '⑤ getAnnouncementsData 會優先用內置公告');
ok(/eventData\['unit_guide'\][\s\S]{0,160}return ed/.test(ann), '⑤ getUnitGuideData 會優先用內置旅團須知');
const cer = read('js/35-ceremony.js');
ok(/const demo=\{/.test(cer) && /return demo;/.test(cer), '⑤ getCeremonyData 改為可覆蓋嘅 demo 物件');
ok(/eventData&&this\.eventData\.ceremony/.test(cer) && /meritRoster/.test(cer), '⑤ getCeremonyData 用內置 ceremony 覆蓋硬編示範（優異旅團先顯示到 188）');
const usr = read('js/33-users.js');
ok(/isDemoEvent\(\)\{?[\s\S]{0,400}eventData\?\.users/.test(usr) || /fromData\.length/.test(usr), '⑤ getLocalUsers 示範版會用內置 54 個真實籌委帳戶');
ok(/finalizeUserList\(list,key\)/.test(usr), '⑤ getLocalUsers 收尾邏輯已抽成 finalizeUserList');

/* ── ⑥ 工具存在且可重複執行 ── */
ok(fs.existsSync(path.join(root, 'tools/fill_mock_demo_from_2026.js')), '⑥ 有 tools/fill_mock_demo_from_2026.js');
ok(fs.existsSync(path.join(root, 'tools/check_mock_demo_coverage.js')), '⑥ 有 tools/check_mock_demo_coverage.js（完成度報告）');
const fill = read('tools/fill_mock_demo_from_2026.js');
ok(/REPLACE/.test(fill) && /MERGE/.test(fill) && /KEEP/.test(fill), '⑥ 填充工具有三類策略標示');

console.log(`模擬示範版 2026 填充測試通過（${n} 項）｜參加旅團 ${len(mk.participants)}・工作人員編更 ${len(mk.staff.event_staff_roster)}・優異旅團 ${len(mk.ceremony.meritRoster)}・文件 ${len(mk.documents)}`);
