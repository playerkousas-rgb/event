#!/usr/bin/env node
/* fill_mock_demo_from_2026.js — 用 2026 真實資料填滿「模擬示範版」(data/mock_demo.json)
   ─────────────────────────────────────────────────────────────────────────────
   目的：令示範版嘅「工作人員公開資料」同「參加者資料」全部有齊真實內容，
         唔再係三幾行 placeholder。

   原則（三類）：
   ① REPLACE  ＝ 2026 有真資料、示範版淨係 placeholder → 直接搬過嚟（覆蓋）
   ② MERGE    ＝ 兩邊各有一部分 → 以 2026 為底，保留示範版獨有嘅欄位
   ③ KEEP     ＝ 2026 係空（真係未做／唔適用），示範版自己嗰套流程示範更有用 → 唔郁

   執行次序（重要）：
     node tools/fill_mock_demo_from_2026.js     ← 先填底層資料
     node tools/build_pc2027_demo.js            ← 再重建 public_channel_2027
     node tools/check_mock_demo_coverage.js     ← 最後睇完成度報告
*/
const fs = require('fs'), path = require('path');
const {readReferenceArchive}=require('./reference_archive.js');
const root = path.join(__dirname, '..');
const PMK = path.join(root, 'data/mock_demo.json');

const {data:d26,lock:referenceLock}=readReferenceArchive(root);
const mock = JSON.parse(fs.readFileSync(PMK, 'utf8'));
const clone = v => JSON.parse(JSON.stringify(v));
const n = v => Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : (v == null ? 0 : 1));

const log = [];
const before = {};
const note = (kind, key, from, to, why) => log.push({ kind, key, from, to, why });

/* ── ① REPLACE：2026 權威資料，整份搬過嚟 ───────────────────────────── */
const REPLACE = [
  ['users', '籌委帳戶 54 個（登入示範：帳號＝中文姓名／密碼 1234）'],
  ['drive', 'Drive 資料夾對照（秘書處／通告／會議／各組／財務指引）'],
  ['documents', '通告及文件：79 份正式文件'],
  ['schedule', '日程表：官方 Run Down 6 段'],
  ['schedule_source', '日程表來源登記'],
  ['participants', '參加旅團：31 旅（人數／餐盒／領隊齊全）'],
  ['participants_source', '旅團報名來源登記（行政組 Sheet）'],
  ['troop_checkin', '旅團點名簽收：31 旅'],
  ['troop_checkin_source', '旅團點名來源登記'],
  ['crisis', '危機處理：小組 14 人／緊急聯絡 13／文件 13／手冊 PDF'],
  ['ceremony', '典禮儀式：Rundown V5、司儀稿 ×3、檢閱路線、優異旅團 188、成人獎勵 6、UG 8'],
  ['guest_roster', '嘉賓名單：102 位（內部權限）'],
  ['guest_transport', '嘉賓車安排（去程／回程／司機）'],
  ['notices', '通告 3 份'],
  ['staff_meals_2026', '工作人員膳食名單：290'],
  ['meal_menu_2026', '餐單 9 項'],
  ['meal_distribution_2026', '派飯分配（14 組／30 攤位／總數 330）'],
  ['meal_logistics_2026', '膳食後勤 3 項'],
  ['meals_source', '膳食資料來源登記'],
  ['souvenirs', '紀念品／派章名單：290'],
  ['roster_seed', '點名種子資料'],
  ['activity_day_sources', '活動日最後版本文件登記：18 份'],
  ['parking_source', '泊車證申請來源登記'],
];
const keepAccidents = clone((mock.crisis && mock.crisis.accidents) || []);
for (const [k, why] of REPLACE) {
  if (d26[k] === undefined || d26[k] === null) { note('MISS', k, n(mock[k]), n(mock[k]), '2026 無此欄位，略過'); continue; }
  before[k] = n(mock[k]);
  mock[k] = clone(d26[k]);
  note('REPLACE', k, before[k], n(mock[k]), why);
}
// 意外報告：2026 正式檔案「必須」保持 0（真實活動無意外紀錄）；示範版就要有一張樣本俾人睇表格
if (keepAccidents.length) { mock.crisis.accidents = keepAccidents; note('KEEP', 'crisis.accidents', keepAccidents.length, keepAccidents.length, '示範用意外報告樣本（2026 正式檔案必須保持 0）'); }

/* ── ② MERGE：以 2026 為底，保留示範版獨有嘅欄位 ─────────────────────── */

// staff：2026 齊晒（org_chart 55／contacts 62／job_duties 11／event_staff_roster 279）
// ⚠ 2026 嘅 org_chart／contacts 係「原始匯入格式」，比示範版嘅內部格式少欄位，
//   所以唔可以照抄 —— 要正規化成示範版格式（APP 同回歸測試都靠呢個格式）：
//   org_chart  : {level, title, names}            → {level, level_num, group, title, names(逐人一行), desc}
//   contacts   : {group_name:'主題節目', contact:'9215 7472'} → {group_name:'主題節目組', contact:'92157472', job_desc}
{
  const oldOrg = clone((mock.staff && mock.staff.org_chart) || []);
  const oldCon = clone((mock.staff && mock.staff.contacts) || []);
  const b = { org: oldOrg.length, con: oldCon.length, duty: n(mock.staff?.job_duties), roster: n(mock.staff?.event_staff_roster) };

  // 2026 聯絡表／架構圖用嘅簡稱 → 示範版（＝APP ORG_GROUPS）正式組名
  const GROUP_ALIAS = {
    '管理': '主席及執行副主席', '典禮及會操': '會操及典禮組', '主題節目': '主題節目組',
    '品牌推廣': '品牌推廣組', '嘉賓接待': '嘉賓接待組', '協調': '協調組',
    '服務及發展': '服務及發展組', '行政': '行政組', '秘書處': '秘書處', '顧問團': '顧問團',
  };
  const canon = g => GROUP_ALIAS[String(g || '').trim()] || String(g || '').trim();
  const splitNames = v => String(v || '').split(/[\s、,，\/]+/).map(x => x.trim()).filter(Boolean);

  /* ① org_chart：2026 為底，逐人一行；2026 冇嘅組（例如秘書處）保留示範版原有行 */
  const descByKey = {}, descByGroup = {};
  oldOrg.forEach(r => {
    if (r.desc) { descByKey[r.group + '|' + r.title] = r.desc; descByGroup[r.group] = descByGroup[r.group] || r.desc; }
  });
  const dutyByGroup = {};
  ((d26.staff && d26.staff.job_duties) || []).forEach(j => {
    const g = canon(j.group_name || j.group || j.title);
    const txt = j.duties || j.scope || j.desc || (Array.isArray(j.items) ? j.items.join('；') : '');
    if (g && txt) dutyByGroup[g] = String(txt).slice(0, 180);
  });
  const org = [];
  ((d26.staff && d26.staff.org_chart) || []).forEach(r => {
    const group = canon(String(r.level || '').replace(/\s*\(Level\s*\d+\)\s*$/, ''));
    const lv = (String(r.level || '').match(/Level\s*(\d+)/) || [, '3'])[1];
    const desc = descByKey[group + '|' + r.title] || descByGroup[group] || dutyByGroup[group] || ('負責' + group + '「' + (r.title || '') + '」相關工作（職務詳見「各組職務範圍」）。');
    splitNames(r.names).forEach(nm => org.push({ level: r.level, level_num: +lv, group, title: r.title || '', names: nm, desc, source: 'isd_2026' }));
  });
  const covered = new Set(org.map(r => r.group));
  const kept = oldOrg.filter(r => !covered.has(r.group));
  const orgAll = org.concat(kept);
  mock.staff = Object.assign({}, mock.staff || {}, clone(d26.staff || {}));
  mock.staff.org_chart = orgAll;

  /* ② contacts：2026 為底，電話去空格；組名正規化；補 job_desc；
        架構圖有名但 2026 聯絡表冇電話嘅人 → 用示範版舊有號碼頂住（標明 placeholder） */
  const groupOfName = {}; orgAll.forEach(r => { if (!groupOfName[r.names]) groupOfName[r.names] = r.group; });
  const descOfName = {}; orgAll.forEach(r => { if (!descOfName[r.names]) descOfName[r.names] = r.desc; });
  const titleOfName = {}; orgAll.forEach(r => { if (!titleOfName[r.names]) titleOfName[r.names] = r.title; });
  const digits = v => String(v || '').replace(/\D/g, '');
  const oldByName = {}; oldCon.forEach(c => { oldByName[c.name] = c; });

  const contacts = ((d26.staff && d26.staff.contacts) || []).map(c => {
    const nm = String(c.name || '').trim();
    let tel = digits(c.contact);
    let placeholder = false;
    if (tel.length !== 8) { const o = oldByName[nm]; if (o && digits(o.contact).length === 8) { tel = digits(o.contact); placeholder = true; } }
    return Object.assign({}, c, {
      name: nm,
      group_name: groupOfName[nm] || canon(c.group_name),
      role_title: c.role_title || titleOfName[nm] || '',
      contact: tel,
      job_desc: descOfName[nm] || '',
      source: 'isd_2026',
    }, placeholder ? { contact_placeholder: true, contact_note: '2026 聯絡表未提供，沿用示範號碼' } : {},
       nm ? {} : { vacant: true, contact_note: '2026 聯絡表此崗位未有人（空缺）' },
       (nm && tel.length !== 8) ? { contact_missing: true, contact_note: '2026 聯絡表未填電話（待行政組補）' } : {});
  });
  // 架構圖有、聯絡表冇嘅人 → 補一行（確保「每個架構圖人名都有 8 位電話」嘅內部契約成立）
  const vacancies = contacts.filter(c => c.vacant).length;
  const noTel = contacts.filter(c => c.contact_missing).length;
  const have = new Set(contacts.map(c => c.name).filter(Boolean));
  let seq = 0;
  const missing = [];
  orgAll.forEach(r => {
    if (have.has(r.names)) return;
    have.add(r.names);
    const o = oldByName[r.names];
    const tel = o && digits(o.contact).length === 8 ? digits(o.contact) : ('9' + String(10000000 + (++seq)).slice(1));
    missing.push({
      name: r.names, role_title: r.title, group_name: r.group, contact: tel, email: (o && o.email) || '',
      job_desc: r.desc, contact_placeholder: true, contact_note: '2026 聯絡表未提供，示範佔位號碼', source: o ? 'mock_demo(舊)' : 'placeholder',
    });
  });
  // 示範版原有嘅虛構籌委：只保留 7 個「示範登入帳戶」（其餘虛構人名由 2026 真人取代，唔再留喺聯絡表）
  const DEMO_LOGIN_NAMES = new Set(['區子君', '羅雅雯', '畢美儀', '潘志強', '龍正謙', '曾令勤', '陳子明']);
  const demoOnly = oldCon.filter(c => !have.has(c.name) && DEMO_LOGIN_NAMES.has(c.name))
    .map(c => Object.assign({}, c, { source: 'mock_demo(示範登入帳戶)', demo_account: true, job_desc: c.job_desc || '示範登入帳戶（非 2026 真實人員），用嚟示範各職級睇到乜。' }));
  mock.staff.contacts = contacts.concat(missing, demoOnly);

  note('NORMALIZE', 'staff.org_chart', b.org, orgAll.length, '2026 55 行 → 逐人一行 ' + org.length + '，另保留示範版獨有組別 ' + kept.length + ' 行');
  note('NORMALIZE', 'staff.contacts', b.con, mock.staff.contacts.length, '電話去空格（#### #### → 8 位）；組名正規化；補架構圖欠缺 ' + missing.length + ' 人；保留示範帳戶 ' + demoOnly.length + ' 人；2026 空缺崗位 ' + vacancies + ' 個（保留並標 vacant）；有名但未填電話 ' + noTel + ' 人（標 contact_missing）');
  note('MERGE', 'staff.job_duties', b.duty, n(mock.staff.job_duties), '各組職務範圍');
  note('MERGE', 'staff.event_staff_roster', b.roster, n(mock.staff.event_staff_roster), '活動日工作人員編更 279');
}

// activities：2026 有 33 攤位／1 地圖／2 遊戲卡，但 activities.activities 係 0 → 保留示範版嗰 3 項
{
  const b = { act: n(mock.activities?.activities), booth: n(mock.activities?.booths), maps: n(mock.activities?.maps), gc: n(mock.activities?.gameCards) };
  const keepActivities = (mock.activities && mock.activities.activities) || [];
  mock.activities = Object.assign({}, mock.activities || {}, clone(d26.activities || {}));
  if (!n(mock.activities.activities) && keepActivities.length) mock.activities.activities = keepActivities;
  note('MERGE', 'activities.booths', b.booth, n(mock.activities.booths), '攤位總表 33 個（A–F 區）');
  note('MERGE', 'activities.maps', b.maps, n(mock.activities.maps), '場地圖');
  note('MERGE', 'activities.gameCards', b.gc, n(mock.activities.gameCards), '遊戲卡／集印卡');
  note('KEEP', 'activities.activities', b.act, n(mock.activities.activities), '2026 為 0；保留示範版 3 項活動流程示範');
}

// meetings：2026 六次會議欄位較齊（16 keys），示範版頭 5 次只有 13 keys → 用 2026
{
  const b = n(mock.meetings);
  if (n(d26.meetings)) mock.meetings = clone(d26.meetings);
  note('MERGE', 'meetings', b, n(mock.meetings), '六次籌備會議（含議程／紀錄／Drive 連結）');
}

// users：2026 54 個真實籌委帳戶（電話去空格）＋保留示範版原有虛構帳戶（示範登入用）
{
  const DEMO_ACCOUNTS = [
    { user_id: '區子君', name: '區子君', email: 'chair@isd.local', role: 'chairperson', group_name: '主席及執行副主席', contact: '92000001' },
    { user_id: '羅雅雯', name: '羅雅雯', email: 'execvp@isd.local', role: 'executive_vice_chairperson', group_name: '主席及執行副主席', job_title: '執行副主席', contact: '92000002' },
    { user_id: '畢美儀', name: '畢美儀', email: 'coordgd@isd.local', role: 'general_director', group_name: '協調組', contact: '97000002' },
    { user_id: '潘志強', name: '潘志強', email: 'leung@isd.local', role: 'general_director', group_name: '會操及典禮組', contact: '93000002' },
    { user_id: '龍正謙', name: '龍正謙', email: 'themegd@isd.local', role: 'general_director', group_name: '主題節目組', contact: '94000002' },
    { user_id: '曾令勤', name: '曾令勤', email: 'director01@isd.local', role: 'director', group_name: '主題節目組', contact: '94000003' },
    { user_id: '陳子明', name: '陳子明', email: 'staff001@isd.local', role: 'staff', group_name: '主題節目組', contact: '95211111', can_tick: false },
  ];
  const b = n(mock.users);
  const real = (mock.users || []).map(u => Object.assign({}, u, { contact: String(u.contact || '').replace(/\D/g, ''), password: u.password || '1234', status: u.status || 'active' }));
  const have = new Set(real.map(u => u.name));
  const extra = DEMO_ACCOUNTS.filter(u => !have.has(u.name)).map(u => Object.assign({ password: '1234', status: 'active', can_tick: true, demo_account: true }, u));
  mock.users = real.concat(extra);
  note('NORMALIZE', 'users', b, mock.users.length, '2026 真實籌委 ' + real.length + '（電話去空格）＋示範帳戶 ' + extra.length + '；密碼一律 1234');
}

/* ── ②b 由 2026 通告／文件「生成」兩張本來只有 placeholder 嘅公開卡 ───────
   announcements（公告及溝通）同 unit_guide（旅團須知）喺 isd_2026.json 根本冇對應欄位，
   APP 內一路用住 hardcode 嘅 2–3 條示範。而家改為由 2026 真實材料生成：
   ・公告 ← notices（3 份特別通告）＋ 危機處理手冊 ＋ 膳食後勤 ＋ 泊車證來源
   ・旅團須知 ← 特別通告第 12/26 號逐項（日期／地點／時間／資格／名額／費用／報名／膳食／
     紀念品／交通／服裝／截止／惡劣天氣／查詢）
   全部逐字取自 2026 文件，冇任何杜撰。 */
{
  const notices = d26.notices || [];
  const iso = (dt) => (dt || '2026-01-01') + 'T09:00:00Z';
  const anns = notices.map((nt, i) => ({
    id: 'ann_notice_' + (i + 1),
    title: nt.title,
    content: (nt.summary || '') + (nt.drive_url ? '\n\n正式文件：' + nt.drive_url : ''),
    category: nt.category || '通告',
    created_by: '秘書處',
    created_at: iso(nt.date),
    pinned: i === 0,
    source: 'isd_2026.notices',
    file_url: nt.drive_url || '',
  }));
  const cm = (d26.crisis && d26.crisis.manual_file) || null;
  if (cm) anns.push({
    id: 'ann_crisis_manual', title: '危機處理手冊（' + (d26.crisis.version || '2026') + '）已上載',
    content: '《' + cm.name + '》已上載，全體工作人員請於活動日前閱讀。活動日期 ' + (d26.crisis.event_date || '') + '，地點 ' + (d26.crisis.event_location || '') + '。',
    category: '安全', created_by: '危機應變小組', created_at: iso(d26.crisis.updated_at), pinned: true,
    source: 'isd_2026.crisis.manual_file', file_url: cm.url || '',
  });
  const md = d26.meal_distribution_2026;
  if (md && md.totals) anns.push({
    id: 'ann_meals', title: '活動日膳食派發安排',
    content: '總人數 ' + md.totals.headcount + ' 人；飯盒 ' + md.totals.rice + ' 份（訂 ' + (md.ordered && md.ordered.rice) + '）、小食 ' + md.totals.snack + ' 份（訂 ' + (md.ordered && md.ordered.snack) + '）。按 ' + (md.staff_groups || []).length + ' 個組別及 ' + (md.booths || []).length + ' 個攤位派發，詳見「膳食管理 → 派飯名單」。',
    category: '膳食', created_by: '行政組', created_at: iso('2026-10-02'), pinned: false, source: 'isd_2026.meal_distribution_2026',
  });
  if (d26.parking_source) anns.push({
    id: 'ann_parking', title: '泊車證申請',
    content: (d26.parking_source.note || '') + '（來源：' + (d26.parking_source.name || '') + '）',
    category: '交通', created_by: '協調組', created_at: iso('2026-09-20'), pinned: false, source: 'isd_2026.parking_source',
  });
  const b = n(mock.announcements && mock.announcements.announcements);
  mock.announcements = { announcements: anns };
  note('BUILD', 'announcements', b, anns.length, '由 2026 通告／危機手冊／派飯／泊車生成（原本係 hardcode 2 條）');

  // 旅團須知：由特別通告第 12/26 號逐項抽出
  const main = notices.find(x => x.id === 'notice_main_2026');
  const docs = [];
  if (main) {
    const u = (id, title, category, description) => docs.push({ id, title, category, description, file_url: main.drive_url || '', source: '特別通告第 12/26 號' });
    u('ug_when', '日期・時間・地點', '基本', '日期：2026 年 10 月 4 日（星期日）\n地點：香港黃竹坑海洋公園道 18 號 香港警察學院\n時間：頒獎典禮及會操檢閱 上午 11 時至下午 1 時；主題節目活動 下午 1 時至下午 5 時');
    u('ug_who', '參加資格', '報名', '1. 青少年成員、成年成員、家長及親友（港島地域成員將獲優先考慮）；\n2. 所有參加童軍旅必須最少由一名領袖帶隊。');
    u('ug_quota', '名額及費用', '報名', '名額：2,000 人（香港警察學院對入場人數有嚴格規定，額滿即止）。\n費用：每位港幣 10 元（包括節目及紀念章等）。費用必須以劃線支票「一旅一票」方式繳付，支票抬頭「港島童軍」或「SCOUTS (HKIR)」。');
    u('ug_apply', '報名辦法及截止日期', '報名', '備妥下列各項，於截止日期前遞交或郵寄香港灣仔日善街 23 號香港童軍百周年紀念大樓 19 樓港島地域辦事處：\n1. 填妥夾附之表格（可於地域網頁 www.hkirscout.org.hk 下載或到地域辦事處索取）；未滿 18 歲之參加者必須填妥家長同意書 PT/46，並交由隨隊領袖保存直至活動結束為止；\n2. 報名費支票。\n\n截止日期：2026 年 9 月 11 日（星期五）。報名以先到先得方式處理，並於 2026 年 9 月 25 日或以前以電郵通知各童軍單位。');
    u('ug_meal', '代訂餐盒', '膳食', '如有需要，大會可代訂購小食餐盒，限額 700 份，每份 $60。餐盒價格可能因應實際情況及大會訂購數量而有所更改。');
    u('ug_gift', '紀念品', '基本', '每位參加者將獲得大會紀念章乙枚。');
    u('ug_transport', '交通及旅遊巴安排', '交通', '1. 大會鼓勵參加者盡量使用公共交通工具前往會場；\n2. 如自行安排旅遊巴士前往會場，請於報名表上註明；\n3. 參加童軍旅可於報名表格標示預計到場及離場時間，大會將按需要作出協調，以確保到場及離場秩序。');
    u('ug_dress', '服裝', '裝備', '童軍成員：整齊童軍制服。\n非童軍成員：便服。');
    u('ug_weather', '惡劣天氣安排', '安全', '如天文台在活動前 3 小時發出紅色暴雨警告、3 號強風或更高信號，活動將延期至 2026 年 10 月 11 日（星期日）於同一地點舉行；大會亦保留因應實際天氣預測而提前作出延期決定之權利。');
    u('ug_enquiry', '查詢', '基本', '如有任何查詢，請致電 2835 7712 與助理執行幹事何家耀先生聯絡。');
  }
  const foodN = notices.find(x => x.id === 'notice_food_2026');
  const goodsN = notices.find(x => x.id === 'notice_goods_2026');
  if (foodN) docs.push({ id: 'ug_donate_food', title: '童心捐贈大行動（食品捐贈）', category: '服務', description: foodN.summary || '', file_url: foodN.drive_url || '', source: foodN.title });
  if (goodsN) docs.push({ id: 'ug_donate_goods', title: '童心捐贈大行動（物品回收）', category: '服務', description: goodsN.summary || '', file_url: goodsN.drive_url || '', source: goodsN.title });
  const bu = n(mock.unit_guide && mock.unit_guide.docs);
  mock.unit_guide = { docs };
  note('BUILD', 'unit_guide', bu, docs.length, '由特別通告第 12/26 號逐項抽出（原本係 hardcode 3 條）');
}

/* ── ③ KEEP：2026 係空，示範版自己嗰套流程示範更有用 ─────────────────── */
const KEEP = [
  ['oral_quotes', '口頭報價係活動期間逐單登記（localStorage），2026 無存檔；示範版留空＝正常'],
  ['donations', '童心捐贈收集紀錄活動日先逐單填（localStorage），2026 無存檔；通告已收入 announcements／unit_guide'],
  ['finance', '2026 income/expenses 全部 0；示範版有 8 組預算＋3 收入＋3 支出，示範批核流程'],
  ['supplies', '2026 全部 0；示範版有 7 物資申請＋3 攤位申請＋3 車輛通行證，示範申請→批核'],
  ['meals', '2026 嘅 meals 係舊版「逐人一行」名單（已由 staff_meals_2026 取代）；示範版 {menus, orders} 係訂餐流程示範，保留'],
];
for (const [k, why] of KEEP) note('KEEP', k, n(mock[k]), n(mock[k]), why);

/* ── 寫檔 ────────────────────────────────────────────────────────────── */
mock.event_name = '模擬示範版（2026 真實資料・完整）';
mock.description = '模擬示範版本：底層資料已用 2026 港島童軍繽紛日真實資料填滿（組織架構 55／聯絡 62／工作人員編更 279／參加旅團 31／攤位 33／文件 79／典禮儀式全套／嘉賓 102／膳食 290），另加示範用嘅申請與批核流程（物資／攤位／車輛／財務／訂餐）。';
mock.data_version = new Date().toISOString().slice(0, 19) + 'Z-demo-v5-filled-from-2026';
mock.mock_fill_source = {
  from: 'data/isd_2026.json',
  reference_sha256: referenceLock.sha256,
  tool: 'tools/fill_mock_demo_from_2026.js',
  filled_at: new Date().toISOString().slice(0, 10),
  policy: 'REPLACE＝2026 權威資料覆蓋；MERGE＝以 2026 為底保留示範版獨有欄位；KEEP＝2026 為空時保留示範流程',
  note: '示範版唔好手改 JSON：改 tool 再 node tools/fill_mock_demo_from_2026.js && node tools/build_pc2027_demo.js',
};
fs.writeFileSync(PMK, JSON.stringify(mock, null, 2) + '\n');

/* ── 同步首頁活動清單（data/events.json）嘅示範版描述 ──────────────────── */
{
  const PEV = path.join(root, 'data/events.json');
  const evs = JSON.parse(fs.readFileSync(PEV, 'utf8'));
  const ev = evs.find(e => e.event_id === 'mock_demo');
  if (ev) {
    ev.event_name = mock.event_name;
    ev.description = '模擬示範版：底層資料已用 2026 港島童軍繽紛日真實資料填滿（組織架構 55／聯絡 62／工作人員編更 279／參加旅團 31／攤位 33／文件 79／典禮儀式全套／嘉賓 102／膳食 290），再加示範用嘅申請與批核流程。本地沙盒——所有改動只儲存喺你嘅瀏覽器，絕不影響正式活動資料。';
    ev.start_date = '2026-10-04'; ev.end_date = '2026-10-04';
    ev.time = '07:45 - 17:30';
    ev.location = '黃竹坑香港警察學院（示範環境）';
    ev.weather = '示範資料';
    ev.news = '示範版：資料取自 2026 港島童軍繽紛日，供籌委試用體驗；改動只留喺你部機。';
    fs.writeFileSync(PEV, JSON.stringify(evs, null, 2) + '\n');
    note('SYNC', 'events.json(mock_demo)', '-', '-', '首頁活動卡描述同日期／地點同步');
  }
}

/* ── 報告 ────────────────────────────────────────────────────────────── */
const pad = (s, w) => { s = String(s); let L = 0; for (const c of s) L += /[\u3000-\u9fff\uff00-\uffef]/.test(c) ? 2 : 1; return s + ' '.repeat(Math.max(0, w - L)); };
console.log('\n用 2026 真實資料填滿 mock_demo.json');
console.log('─'.repeat(96));
console.log(pad('動作', 10) + pad('欄位', 30) + pad('前', 8) + pad('後', 8) + '說明');
console.log('─'.repeat(96));
for (const r of log) console.log(pad(r.kind, 10) + pad(r.key, 30) + pad(r.from, 8) + pad(r.to, 8) + r.why);
console.log('─'.repeat(96));
console.log('OK → data/mock_demo.json（記得跟住行 node tools/build_pc2027_demo.js）\n');
