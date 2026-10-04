#!/usr/bin/env node
/* build_pc2027_demo.js — 產生「公眾頻道 2027 形態示範」數據（寫入 data/mock_demo.json）
   ─────────────────────────────────────────────────────────────────────────────
   階段 1（2026-10-04）：以 2026 真實資料示範 2027 公眾頻道最終形態。
   ・ 攤位／參加旅團名單／優異旅團名單 → 直接由 data/isd_2026.json 抽取（公眾版剝離聯絡資料）
   ・ 橫幅／交通／程序／須知分眾／求助 → 按 2026 實況（特別通告 12/26＋司儀稿 Rundown V5）整理
   ・ 此檔案同時係「從尾追回源頭」嘅材料：成品形態 → 欄位 → 將來由八大報名表自動生成
   用法：node tools/build_pc2027_demo.js
*/
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const d26 = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));
const mock = JSON.parse(fs.readFileSync(path.join(root, 'data/mock_demo.json'), 'utf8'));

/* ── 由 2026 JSON 抽取（公眾版：剝離聯絡電話／電郵） ── */
const booths = ((d26.activities && d26.activities.booths) || []).map(b =>
  [b.zone, b.booth_no, b.theme || '', b.group_name || '', b.booth_name || '', String(b.content || '').slice(0, 60)]);
const participants = (d26.participants || []).map(p =>
  [p.no, p.unit_name, p.area, +p.headcount || 0, +p.meal_boxes || 0, p.leader || '']);
const meritByArea = {};
((d26.ceremony && d26.ceremony.meritRoster) || []).forEach(r => {
  (meritByArea[r.area] = meritByArea[r.area] || []).push(r.unit + '・' + r.section);
});
const meritTotal = Object.values(meritByArea).reduce((a, b) => a + b.length, 0);
const totalHeadcount = participants.reduce((a, r) => a + r[3], 0);
const totalMeals = participants.reduce((a, r) => a + r[4], 0);

/* ── 示範內容（2026 實況整理／2027 形態） ── */
const pc = {
  note: '模擬示範版專用卡片：確認形態後，呢套分頁將升格為 2027 正式公開頁，資料由八大報名表自動生成。',
  banner: {
    tag: '香港童軍總會港島地域・周年認可慶祝活動',
    event_name: '2027 港島童軍繽紛日',
    en_name: 'Island Scout Day 2027',
    date: '2027年10月3日（星期日）',
    time: '頒獎典禮及會操檢閱 11:00–13:00｜主題活動 13:00–17:00',
    location: '香港黃竹坑海洋公園道18號 香港警察學院',
    quota: '2,000 人（先到先得，額滿即止）',
    fee: 'HK$10／人（連大會紀念章乙枚）',
    news: {
      text: '活動如期舉行。各旅團請依報名時段由東閘入場，前往有蓋操場報到處報到。',
      updated_at: '2027-10-03 07:00',
      updated_by: '行政組'
    },
    weather_rule: '如天文台於活動前 3 小時發出紅色暴雨警告或 3 號強風信號或以上，活動將延期至 2027年10月10日（星期日）同一地點舉行；大會保留因應實際天氣預測提前作出延期決定之權利。公佈渠道＝本 APP 最新消息。'
  },
  transport: {
    items: [
      { icon: 'fa-solid fa-door-open', title: '入口：東閘（警校道）', detail: '唯一公眾入口，請依指示排隊入場。' },
      { icon: 'fa-solid fa-train-subway', title: '公共交通', detail: '港鐵海洋公園站步行約 10 分鐘；多條巴士路線直達黃竹坑。' },
      { icon: 'fa-solid fa-van-shuttle', title: '穿梭巴士', detail: '海洋公園停車場 ↔ 學院東閘，10:00 起每 15 分鐘一班。' },
      { icon: 'fa-solid fa-ban', title: '不設公眾泊車', detail: '場內車位只限持證車輛（泊車證須經所屬單位申請）。', danger: true },
      { icon: 'fa-solid fa-bus', title: '旅遊巴', detail: '報名時已申報之旅遊巴請前往指定落客點，司機依警衛指示停泊。' }
    ],
    checkin: [
      { who: '旅團／UG 隊伍', where: '有蓋操場報到處' },
      { who: '嘉賓', where: '莫榮大樓接待處' }
    ],
    map_title: '場地指示圖',
    map_url: 'assets/ceremony/guest_map.png',
    map_pdf: 'google_drive/附件2_參加旅團場地指示圖2026 v2.pdf'
  },
  program: {
    now_time: '11:00',
    now_label: '第一部分典禮（示範・活動日會按實際時間自動浮動）',
    items: [
      { time: '08:00', title: '旅團報到開始', detail: '東閘入場 → 有蓋操場報到處' },
      { time: '10:45', title: '嘉賓到達', detail: '莫榮大樓地下接待處（專人接待）' },
      { time: '11:00', title: '第一部分典禮：優異旅團及各項獎勵頒發儀式', detail: '大操場（至 11:55）・風笛手引領嘉賓進場' },
      { time: '12:00', title: '第二部分典禮：會操檢閱', detail: '大操場・港島總區指揮官主禮' },
      { time: '13:00', title: '主題活動區開始・攤位博覽', detail: '六大主題 33 攤位（A–F 區）｜嘉賓茶聚（莫榮大樓）' },
      { time: '17:00', title: '活動結束', detail: '請依指示由東閘離場' }
    ],
    note: '※ 只列公眾須知時段；內部綵排及後台時間不公開。'
  },
  booths: {
    stats: [
      ['六大主題', '積極公民・五年規劃・創新科技・社區福祉・生態文明・童軍技能'],
      ['33 個攤位', 'A12・B3・C4・D5・E3・F6']
    ],
    list: booths,
    game_card: 'assets/event-day/game-card-2026.pdf',
    site_plan: 'assets/event-day/site-setup-plan-2026.pdf',
    note: '※ 公眾版隱藏攤位負責人聯絡（登記負責人可見）。'
  },
  apply_forms: [
    { icon: '🏃', name: '旅團報名', target: '旅領袖', desc: '人數・餐盒・旅遊巴・PT/46' },
    { icon: '🏆', name: '優異旅團報名', target: '獲獎旅團領袖', desc: '出席／派隊人數' },
    { icon: '🎩', name: '嘉賓報名', target: '獲邀人士／秘書處', desc: '典禮・茶聚・車牌' },
    { icon: '🧢', name: '其他制服團體報名', target: 'UG 領隊', desc: '隊伍＋嘉賓代表' },
    { icon: '🤝', name: 'NGO 報名', target: '機構代表', desc: '攤位／服務／觀禮' },
    { icon: '🎖️', name: '支部最高獎勵得主報名', target: '總領袖／榮譽童軍／貝登堡', desc: '出席・親友人數' },
    { icon: '🏅', name: '成人獎勵得主報名', target: '長期服務獎等', desc: '出席・覆誓' },
    { icon: '❤️', name: '童心捐贈', target: '任何人', desc: '物品／食品・QR' }
  ],
  apply_note: '全部免登入、填完即有申請編號可查進度。費用（$10／人・餐盒 $60／份）於確認後一併通知繳付。',
  /* ── 報到 QR（階段1）：每個報名單位／個人一個專屬 token（QR 內容＝PC2027:token）
     公眾端：自己版面見自己嘅 QR；工作人員端：「報到站」輸入／掃描 token 即見旅團・人數・餐盒等 ── */
  checkin_demo: {
    audience_kinds: { troop: '旅團', merit: '優異旅團', march: '步操隊伍', ug: '其他制服團體', guest: '嘉賓', awardee_section: '支部最高獎勵得主', awardee_adult: '成人獎勵得主' },
    entries: [].concat(
      participants.map(p => ({ token: 'T' + String(p[0]).padStart(3, '0'), kind: '旅團', name: p[1], area: p[2], headcount: p[3], meal_boxes: p[4], note: '領隊：' + p[5] })),
      Object.values(meritByArea).flat().slice(0, 3).map((u, i) => ({ token: 'M' + String(i + 1).padStart(3, '0'), kind: '優異旅團', name: u.split('・')[0], area: u.split('・')[1] || '', headcount: 12, meal_boxes: 0, note: '出席頒獎：派隊上台領彩帶＋獎狀' })),
      participants.slice(0, 3).map((p, i) => ({ token: 'W' + String(i + 1).padStart(3, '0'), kind: '步操隊伍', name: p[1], area: p[2], headcount: 24, meal_boxes: p[4], note: '旗幟：有｜綵排 08:00 報到' })),
      [
        { token: 'U001', kind: '其他制服團體', name: '香港聖約翰救傷隊（示範）', area: '—', headcount: 18, meal_boxes: 6, note: 'UG 專櫃報到' },
        { token: 'U002', kind: '其他制服團體', name: '香港海事青年團（示範）', area: '—', headcount: 15, meal_boxes: 5, note: 'UG 專櫃報到' },
        { token: 'G001', kind: '嘉賓', name: '李偉明先生 BBS, MH（示範）', area: '—', headcount: 1, meal_boxes: 0, note: '茶聚：是｜大會車：是' },
        { token: 'G002', kind: '嘉賓', name: '王秀蘭女士 MH（示範）', area: '—', headcount: 1, meal_boxes: 0, note: '茶聚：是｜大會車：否' },
        { token: 'A001', kind: '支部最高獎勵得主', name: '貝登堡獎章得主（示範）', area: '—', headcount: 1, meal_boxes: 0, note: '親友觀禮：2 位' },
        { token: 'A002', kind: '支部最高獎勵得主', name: '榮譽童軍獎章得主（示範）', area: '—', headcount: 1, meal_boxes: 0, note: '親友觀禮：3 位' },
        { token: 'A003', kind: '成人獎勵得主', name: '長期服務獎章得主（示範）', area: '—', headcount: 1, meal_boxes: 0, note: '需覆誓：是' },
        { token: 'A004', kind: '成人獎勵得主', name: '一星服務獎章得主（示範）', area: '—', headcount: 1, meal_boxes: 0, note: '需覆誓：否' }
      ]
    )
  },
  /* ── 工作人員閘口：公眾 landing 頁尾有一個隱藏入口，工作人員打 4 位密碼即入；
     籌委就用帳號密碼（一個登入口分流）。示範版 login_as＝內置示範帳戶「陳子明」（工作人員） ── */
  staff_gate: { pin: '2027', login_as: '陳子明' },
  /* ── 分眾入口：公眾（非工作人員）揀身份入嚟，各有各嘅版面組合（階段 1 形態） ──
     生產版：每類受眾一條專屬連結／QR（index.html?pub=troop 等），開門即見自己嘅版本 */
  /* ── 每類受眾專屬時間表（同一日，各自睇自己嗰條線；now 示範用） ── */
  schedules: {
    guest: { now: '13:00', now_label: '茶聚（莫榮大樓）', items: [
      { time: '10:15', title: '大會車開出', detail: '灣仔愛群道伊利沙伯體育館門口' },
      { time: '10:45', title: '到達・專人接待', detail: '莫榮大樓地下接待處' },
      { time: '10:55', title: '就座', detail: '大操場嘉賓席' },
      { time: '11:00', title: '第一部分典禮', detail: '風笛手引領進場・頒發優異旅團及各項獎勵' },
      { time: '12:00', title: '第二部分典禮・會操檢閱', detail: '港島總區指揮官主禮' },
      { time: '13:00', title: '茶聚', detail: '莫榮大樓地下自助餐' },
      { time: '15:00', title: '回程', detail: '大會車於學院門口開出' }
    ] },
    troop: { now: '09:00', now_label: '攤位主題活動（集印換紀念章）', items: [
      { time: '08:00', title: '按報名時段報到', detail: '東閘入場 → 有蓋操場報到處（領物資・餐盒）' },
      { time: '09:00', title: '攤位主題活動開始', detail: '六大主題 33 攤位（A–F 區）・集印換紀念章' },
      { time: '10:45', title: '帶隊往大操場集合', detail: '準備參加典禮' },
      { time: '11:00', title: '第一部分典禮', detail: '頒發優異旅團及各項獎勵' },
      { time: '12:00', title: '第二部分典禮・會操檢閱', detail: '港島總區指揮官主禮' },
      { time: '13:00', title: '午餐＋攤位博覽', detail: '餐盒於報到時領取' },
      { time: '17:00', title: '回程', detail: '請依指示由東閘離場（旅遊巴依指示上客）' }
    ] },
    merit: { now: '11:00', now_label: '典禮開始・準備上台', items: [
      { time: '10:00', title: '報到', detail: '有蓋操場報到處・優異旅團櫃位（核對名單・領取彩帶）' },
      { time: '10:15', title: '排位', detail: '大操場後方排位區（按區會）' },
      { time: '10:30', title: '等候進場', detail: '依工作人員指示' },
      { time: '11:00', title: '第一部分典禮', detail: '優異旅團頒獎：派隊上台領取彩帶＋獎狀（按區會序）' },
      { time: '12:00', title: '第二部分典禮・會操檢閱', detail: '於所属位置觀禮' },
      { time: '13:00', title: '午餐＋合照', detail: '與區會領袖及親友合照' },
      { time: '15:00', title: '回程', detail: '東閘離場' }
    ] },
    march: { now: '08:30', now_label: '綵排中（依司儀及總指揮指示）', items: [
      { time: '08:00', title: '綵排報到', detail: '大操場指定位置（依旗幟集結）' },
      { time: '08:30', title: '綵排開始', detail: '08:30–10:30 依司儀及總指揮指示' },
      { time: '10:30', title: '整裝待命', detail: '原地休息（大會飲水點・雨具自備）' },
      { time: '11:00', title: '第一部分典禮', detail: '列隊參與' },
      { time: '12:00', title: '第二部分典禮：指揮官檢閱', detail: '港島總區指揮官檢閱步操隊伍' },
      { time: '13:00', title: '午餐', detail: '大會飲水點' },
      { time: '17:00', title: '退場', detail: '依指示帶隊離場' }
    ] },
    ug: { now: '11:00', now_label: '典禮開始', items: [
      { time: '依大會通知', title: '領隊帶隊到達', detail: '東閘（警校道）入場' },
      { time: '到場後', title: '報到', detail: '有蓋操場報到處・UG 專櫃' },
      { time: '09:00', title: '攤位主題活動', detail: '六大主題 33 攤位（A–F 區）' },
      { time: '11:00', title: '第一部分典禮', detail: '於指定位置觀禮' },
      { time: '12:00', title: '第二部分典禮・會操檢閱', detail: '港島總區指揮官主禮' },
      { time: '13:00', title: '攤位博覽', detail: '主題活動區' },
      { time: '17:00', title: '離場', detail: '領隊帶隊依指示由東閘離場' }
    ] },
    awardee_section: { now: '11:05', now_label: '頒獎進行中（依獎章分組）', items: [
      { time: '10:15', title: '集合', detail: '大操場左側後台排位（依獎章分組）' },
      { time: '10:55', title: '頒獎流程綵排', detail: '依工作人員指示' },
      { time: '11:00', title: '第一部分典禮', detail: '典禮開始' },
      { time: '11:05', title: '上台領獎', detail: '次序：總領袖獎章 → 榮譽童軍獎章 → 貝登堡獎章（會長頒發嘉許信）' },
      { time: '12:00', title: '觀禮', detail: '第二部分典禮・會操檢閱' },
      { time: '13:00', title: '午餐＋親友合照', detail: '親友觀禮區（報名時申報人數）' }
    ] },
    awardee_adult: { now: '10:55', now_label: '覆誓綵排', items: [
      { time: '10:15', title: '集合', detail: '大操場左側後台排位（依獎項分組）' },
      { time: '10:55', title: '覆誓綵排', detail: '委任書得主須覆誓' },
      { time: '11:00', title: '第一部分典禮', detail: '典禮開始' },
      { time: '11:10', title: '上台領獎', detail: '10年長期服務獎狀・長期服務獎章（會長頒發）；一星／三星服務獎章（副會長頒發）；按唱名序上台' },
      { time: '12:00', title: '觀禮', detail: '第二部分典禮・會操檢閱' },
      { time: '13:00', title: '茶聚＋合照', detail: '莫榮大樓' }
    ] }
  },
  /* ── 每類受眾嘅報到地點＋路線重點（各不相同）；地圖用同一基底圖，生產版每類有標註自己位置嘅專屬地圖 ── */
  arrivals: {
    guest:       { checkin: ['10:45', '莫榮大樓地下接待處（專人接待）'], points: ['灣仔伊利沙伯體育館（大會車上車）', '莫榮大樓地下接待處', '大操場嘉賓席', '莫榮大樓地下（茶聚）'], transport: ['大會車：去程 10:15 灣仔開出；回程 15:00 學院門口', '查詢：2835 7712（助理執行幹事何家耀先生）'] },
    troop:       { checkin: ['按報名時段（08:00 起）', '有蓋操場報到處（東閘入）'], points: ['東閘（警校道）落客', '有蓋操場報到處（領物資・餐盒）', '攤位活動區（A–F）', '大操場（典禮）'], transport: ['旅遊巴：報名時申報嘅旅遊巴前往指定落客點，司機依警衛指示停泊', '公共交通：港鐵海洋公園站步行約 10 分鐘；多條巴士路線直達黃竹坑'] },
    merit:       { checkin: ['10:00–10:15', '有蓋操場報到處・優異旅團櫃位（核對名單・領取彩帶）'], points: ['東閘入場', '有蓋操場 優異旅團櫃位（報到＋領彩帶）', '大操場後方排位區（按區會）', '頒獎台前（頒獎時）'], transport: ['公共交通：港鐵海洋公園站步行約 10 分鐘', '報到後先去排位區按區會排位，頒獎時依指示上台'] },
    march:       { checkin: ['08:00–08:30', '大操場指定位置（依旗幟）'], points: ['東閘（08:00 起到達）', '有蓋操場報到處', '大操場（依旗幟集結）'], transport: ['請預早出發：08:30 綵排前必須到位', '大會飲水點：大操場側；雨具自備'] },
    ug:          { checkin: ['按大會通知時段', '有蓋操場報到處・UG 專櫃'], points: ['東閘（領隊帶隊）', '有蓋操場 UG 專櫃', '攤位／活動區'], transport: ['穿梭巴士：海洋公園停車場 ↔ 東閘，10:00 起每 15 分鐘一班'] },
    awardee_section: { checkin: ['10:15–10:30', '大操場左側後台排位（依獎章分組）'], points: ['東閘入場', '大操場左側後台排位區', '頒獎台（上台路線）'], transport: ['親友觀禮區：大操場預留（報名時申報人數）'] },
    awardee_adult:   { checkin: ['10:15–10:30', '大操場左側後台排位（依獎項分組）'], points: ['東閘入場', '大操場左側後台排位區', '頒獎台（上台路線）'], transport: ['服裝：制服編號 3 或常服＋佩戴原有勳章'] }
  },
  section_labels: {
    banner: '活動基本盤', schedule: '你的時間表', arrival: '報到與地圖', qr: '你的報到 QR', apply: '參與／報名',
    guide: '你的須知', program: '全日程序', booths: '攤位與地圖', transport: '交通與入場',
    help: '活動日求助', donate: '童心捐贈'
  },
  banner_guest: {
    title: '嘉賓專屬安排',
    rows: [
      ['到達', '10:45 莫榮大樓地下接待處（專人接待）'],
      ['座位', '大操場嘉賓席（10:55 就座）'],
      ['茶聚', '13:00 莫榮大樓地下自助餐'],
      ['大會車', '去程 10:15 灣仔愛群道伊利沙伯體育館門口開出；回程 15:00 學院門口'],
      ['查詢', '大會熱線 2835 7712（助理執行幹事何家耀先生）']
    ]
  },
  audiences: [
    /* 公眾入口＝須知分眾七類（每類須知有少許不同）：嘉賓／旅團／優異旅團獲獎／步操隊伍／其他制服團體／支部最高獎勵獲獎人士／成人獎勵獲獎人士 */
    { id: 'guest', icon: '🎩', name: '嘉賓', desc: '獲邀出席典禮及茶聚：接待・座位・大會車',
      sections: ['banner', 'schedule', 'arrival', 'qr', 'guide', 'apply', 'help'],
      guide: ['嘉賓'], banner: 'guest', featured: ['嘉賓報名'] },
    { id: 'troop', icon: '🏃', name: '旅團', desc: '帶隊參加：報名・餐盒・旅遊巴・報到',
      sections: ['banner', 'schedule', 'arrival', 'qr', 'guide', 'apply', 'help'],
      guide: ['普通旅團'], featured: ['旅團報名'] },
    { id: 'merit', icon: '🏆', name: '優異旅團獲獎', desc: '出席頒獎禮：排位・彩帶・派隊',
      sections: ['banner', 'schedule', 'arrival', 'qr', 'guide', 'apply', 'help'],
      guide: ['優異旅團'], featured: ['優異旅團報名'] },
    { id: 'march', icon: '🥁', name: '步操隊伍', desc: '參與步操：綵排・集結・檢閱・退場',
      sections: ['banner', 'schedule', 'arrival', 'qr', 'guide', 'apply', 'help'],
      guide: ['步操隊伍'], featured: ['旅團報名'] },
    { id: 'ug', icon: '🧢', name: '其他制服團體', desc: '制服團體／NGO：隊伍參加或設攤位',
      sections: ['banner', 'schedule', 'arrival', 'qr', 'guide', 'apply', 'help'],
      guide: ['其他制服團體'], featured: ['其他制服團體報名', 'NGO 報名'] },
    { id: 'awardee_section', icon: '🎖️', name: '支部最高獎勵獲獎人士', desc: '總領袖獎章・榮譽童軍獎章・貝登堡獎章',
      sections: ['banner', 'schedule', 'arrival', 'qr', 'guide', 'apply', 'help'],
      guide: ['支部最高獎勵得主'], featured: ['支部最高獎勵得主報名'] },
    { id: 'awardee_adult', icon: '🎗️', name: '成人獎勵獲獎人士', desc: '長期服務獎狀・長期服務獎章・一星／三星服務獎章',
      sections: ['banner', 'schedule', 'arrival', 'qr', 'guide', 'apply', 'help'],
      guide: ['成人獎勵得主'], featured: ['成人獎勵得主報名'] }
  ],
  guides: {
    '嘉賓': [
      ['到達', '10:45'],
      ['接待', '莫榮大樓地下接待處（專人接待）'],
      ['服裝', '西式常服／制服＋佩戴勳章'],
      ['典禮', '第一部分 11:00（頒獎）＋第二部分 12:00（檢閱）・大操場座位預留'],
      ['茶聚', '13:00 莫榮大樓自助餐'],
      ['交通', '車牌已預登記可直接入場；大會車 10:15 灣仔伊利沙伯體育館門口開出']
    ],
    '普通旅團': [
      ['到達', '按報名時段（08:00 起）'],
      ['報到', '東閘 → 有蓋操場報到處'],
      ['服裝', '成員整齊童軍制服・親友便服'],
      ['帶隊', '每旅最少 1 名領袖；未滿 18 歲家長同意書 PT/46 由領袖保存'],
      ['餐盒', '代訂餐盒（$60/份）於報到處領取餐券'],
      ['活動', '13:00 起攤位博覽・主題活動區（紀念章每位乙枚）']
    ],
    '優異旅團': [
      ['到達', '10:00–10:15 先到優異旅團櫃位報到（領彩帶），10:15 前排位'],
      ['集合', '大操場指定排位區（按區會）'],
      ['服裝', '制服編號 3（常規制服）'],
      ['頒獎', '11:00 第一部分典禮：小童軍＝證書；幼童軍／童軍／深資／樂行＝彩帶'],
      ['影相', '頒獎後於大操場指定位置合影'],
      ['解散', '12:00 檢閱後隨旅團自由參觀']
    ],
    '步操隊伍': [
      ['到達', '08:00–08:30（綵排）'],
      ['集合', '大操場指定位置（依旗幟）'],
      ['服裝', '制服編號 3（常規制服）'],
      ['綵排', '08:30–10:30 依司儀及總指揮指示'],
      ['檢閱', '12:00 第二部分典禮：港島總區指揮官檢閱'],
      ['支援', '大會提供飲水點；雨具自備']
    ],
    '其他制服團體': [
      ['到達', '領隊帶隊按大會通知時段'],
      ['報到', '有蓋操場報到處（UG 專櫃）'],
      ['服裝', '自家整齊制服'],
      ['人數', '領隊於報到時核對出席人數'],
      ['出席隊伍（2026）', '女童軍總會 17 人・紅十字會 17 人・聖約翰少青團 18 人'],
      ['觀禮', '大操場 UG 觀禮區']
    ],
    '支部最高獎勵得主': [
      ['到達', '10:15–10:30 集合'],
      ['集合', '大操場左側後台排位（依獎章分組）'],
      ['服裝', '整齊童軍制服／正裝'],
      ['頒獎', '11:00 會長頒發嘉許信；次序：總領袖獎章 → 榮譽童軍獎章 → 貝登堡獎章'],
      ['親友', '觀禮區預留（報名時申報人數）']
    ],
    '成人獎勵得主': [
      ['到達', '10:15–10:30 集合'],
      ['集合', '大操場左側後台排位（依獎項分組）'],
      ['服裝', '制服編號 3／常服＋佩戴原有勳章'],
      ['頒獎', '10 年長期服務獎狀・長期服務獎章由會長頒發；一星／三星由副會長頒發'],
      ['唱名', '按名單唱名序上台；委任書得主須覆誓（10:55 前綵排）']
    ]
  },
  guide_common: [
    ['日期', '2027年10月3日（星期日）・延期後備日 10月10日'],
    ['惡劣天氣', '活動前 3 小時紅雨／3 號波 → 延期（公佈於最新消息）'],
    ['查詢熱線', '2835 7712（助理執行幹事何家耀先生）'],
    ['家長同意書', '未滿 18 歲參加者須填妥 PT/46，由隨隊領袖保存至活動結束'],
    ['紀念品', '每位參加者獲大會紀念章乙枚']
  ],
  help: {
    lost_found: '拾獲／遺失兩向登記＋認領',
    hotline: '2835 7712（助理執行幹事何家耀先生）',
    first_aid: '香港聖約翰救傷隊急救站（有蓋操場側）'
  },
  manual: {
    tabs: [
      ['組織架構與聯絡', '資料'], ['場地與活動總覽', '資料'], ['攤位列表', '自動生成'], ['日程表', '資料'],
      ['典禮儀式', '資料'], ['優異旅團獲獎名單', '由報名生成'], ['支部獎勵名單', '由報名生成'], ['領袖獎勵名單', '由報名生成'],
      ['嘉賓名單', '權限內部'], ['參加旅團名單', '由報名生成'], ['代訂餐盒名單', '由報名生成'], ['危機處理', '文件'],
      ['通告及文件', '文件'], ['財務指引', '文件'], ['各類附加資料', '資料']
    ],
    participants: {
      stats: [participants.length + ' 旅團', totalHeadcount.toLocaleString() + ' 人', totalMeals + ' 餐盒'],
      cols: ['#', '旅團', '區會', '人數', '餐盒', '領隊'],
      rows: participants,
      note: '※ 名單結果公開；領隊電話／電郵須登入後才可見。活動日此頁加「報到 ✓」點名欄。（示範・2026 資料）'
    },
    merit: {
      total: meritTotal,
      byArea: meritByArea,
      note: '（示範・2026 資料）'
    }
  }
};

mock.public_channel_2027 = pc;
mock.data_version = '2026-10-04T00:00:00Z-demo-v4-public-channel';
fs.writeFileSync(path.join(root, 'data/mock_demo.json'), JSON.stringify(mock, null, 2) + '\n');
console.log('OK public_channel_2027 → mock_demo.json｜booths:' + booths.length + ' participants:' + participants.length + ' merit:' + meritTotal);
