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
  /* ── 工作人員閘口：公眾 landing 頁尾有一個隱藏入口，工作人員打 4 位密碼即入；
     籌委就用帳號密碼（一個登入口分流）。示範版 login_as＝內置示範帳戶「陳子明」（工作人員） ── */
  staff_gate: { pin: '2027', login_as: '陳子明' },
  /* ── 分眾入口：公眾（非工作人員）揀身份入嚟，各有各嘅版面組合（階段 1 形態） ──
     生產版：每類受眾一條專屬連結／QR（index.html?pub=troop 等），開門即見自己嘅版本 */
  section_labels: {
    banner: '活動基本盤', apply: '參與／報名', guide: '你的須知', program: '當日程序',
    booths: '攤位與地圖', transport: '交通與入場', help: '活動日求助', donate: '童心捐贈'
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
    { id: 'visitor', icon: '👨‍👩‍👧', name: '家長・親友・訪客', desc: '參觀繽紛日：攤位・典禮・主題活動',
      sections: ['banner', 'program', 'booths', 'transport', 'help', 'donate'] },
    { id: 'troop', icon: '🏃', name: '旅團領袖', desc: '帶隊參加：報名・餐盒・旅遊巴',
      sections: ['apply', 'guide', 'program', 'transport', 'help'],
      guide: ['普通旅團'], featured: ['旅團報名'] },
    { id: 'merit', icon: '🏆', name: '優異旅團領袖', desc: '出席頒獎禮：排位・彩帶・派隊',
      sections: ['apply', 'guide', 'program', 'help'],
      guide: ['優異旅團'], featured: ['優異旅團報名'] },
    { id: 'awardee', icon: '🎖️', name: '獎項得主', desc: '支部最高獎勵・成人獎勵：上台領獎',
      sections: ['apply', 'guide', 'program', 'help'],
      guide: ['支部最高獎勵得主', '成人獎勵得主'], featured: ['支部最高獎勵得主報名', '成人獎勵得主報名'] },
    { id: 'guest', icon: '🎩', name: '嘉賓', desc: '獲邀出席典禮及茶聚',
      sections: ['banner', 'guide', 'program', 'help'], guide: ['嘉賓'], banner: 'guest' },
    { id: 'ug', icon: '🧢', name: '制服團體・NGO', desc: '隊伍參加或設攤位',
      sections: ['apply', 'guide', 'program', 'help'],
      guide: ['其他制服團體'], featured: ['其他制服團體報名', 'NGO 報名'] }
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
      ['到達', '10:15 前（大操場後方排位）'],
      ['集合', '大操場指定排位區（按區會）'],
      ['服裝', '制服編號 3（常規制服）'],
      ['頒獎', '11:00 第一部分典禮：小童軍＝證書；幼童軍／童軍／深資／樂行＝彩帶'],
      ['影相', '頒獎後於大操場指定位置合影'],
      ['解散', '12:00 檢閱後隨旅團自由參觀']
    ],
    '步操隊伍': [
      ['到達', '07:45–08:30（綵排）'],
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
