'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   2027 範本 SCHEMA —— 整件事嘅主人
   ──────────────────────────────────────────────────────────────────────────
   一份 schema 出四樣嘢，所以永遠唔會互相脫節：
     ① 空白範本  templates/2027/blank/*.xlsx|docx   ← 下屆籌委開工第一日就攞到
     ② MOCK 範本 templates/2027/mock/*.xlsx|docx    ← 用 2026 最終版填滿，示範「填好係咁樣」
     ③ 人睇嘅說明 docs/2027_TEMPLATE_GUIDE.md
     ④ 程式讀返入 APP（同一份定義，唔會各有各讀）

   2026 嘅真正病因（用戶更正）：唔係遲交，係【改完再改再改】。
   所以設計跟三條鐵律：
     鐵律一　一格資料只准喺一個範本出現。一複製就會走樣，走樣就係下次對唔上嗰格。
     鐵律二　唔好問「交齊未」，要問「呢格幾時更新過」。永遠唔會有齊晒嗰一刻。
     鐵律三　欄位分三級。大方向齊就算齊——請警察擺攤位，佢唔會乖乖畀你四個人名。
   ══════════════════════════════════════════════════════════════════════════ */

/* 級別
   必須 blocking    冇就成件事唔成立 → 着紅燈
   盡量 best_effort 填得幾多得幾多   → 唔着燈，只記低填咗幾多
   自動 derived     程式計，唔好填   → 範本入面灰色鎖住
*/
const LEVEL={BLOCK:'必須',BEST:'盡量',AUTO:'自動'};

const TEMPLATES=[

/* ───────────────────────────────────────────── 01 嘉賓名單 ── */
{
  id:'guest-roster', seq:'01', kind:'xlsx',
  file:'01_嘉賓名單.xlsx', sheet:'嘉賓名單',
  title:'嘉賓名單',
  owner:'嘉賓接待組',
  target:'guest_roster.guests',
  key:'name',
  feeds:['嘉賓接待站','派嘉賓章','閘口點車牌','典禮座位表','午膳儀式名單','公眾頻道嘉賓入口'],
  churn:'呢張表一定會改到最後一日。2026 由 as at 02.10 改到 as at 03.10，加咗四位、改咗頭銜。'
        +'所以唔好另外抄一份名單出嚟用——全部位置都讀返呢張。',
  rules:[
    '一行一位嘉賓。同一個人唔好出現兩次。',
    '姓名要連稱謂（先生／女士／太平紳士），因為司儀稿同名牌直接攞嚟用。',
    '唔好中途換人：嘉賓走咗就喺「備註」寫明，新嘉賓開新一行。對得返 2026 嘅點名規矩。'
  ],
  columns:[
    {k:'serial',          label:'編號',          type:'number', level:LEVEL.AUTO,  eg:1,            note:'程式自動排，唔好手改'},
    {k:'name',            label:'姓名（連稱謂）', type:'text',   level:LEVEL.BLOCK, eg:'區永樑先生',  note:'唯一鍵。司儀稿、名牌、紀念章都認呢個'},
    {k:'title',           label:'職銜',          type:'text',   level:LEVEL.BLOCK, eg:'香港警務處港島總區指揮官', note:'可以多過一行，司儀會照讀'},
    {k:'section',         label:'界別',          type:'text',   level:LEVEL.BEST,  eg:'政府',        note:'政府／議員／友好團體／童軍'},
    {k:'ceremony_part_1', label:'出席第一部分',   type:'bool',   level:LEVEL.BEST,  eg:'',           note:'優異旅團頒獎'},
    {k:'ceremony_part_2', label:'出席第二部分',   type:'bool',   level:LEVEL.BEST,  eg:true,         note:'會操檢閱'},
    {k:'guest_tea',       label:'出席午膳',       type:'bool',   level:LEVEL.BEST,  eg:true},
    {k:'event_bus',       label:'坐大會車',       type:'bool',   level:LEVEL.BEST,  eg:'',           note:'影響嘉賓交通安排'},
    {k:'car_plate',       label:'車牌',          type:'text',   level:LEVEL.BEST,  eg:'AM1334',     note:'要入警察學院就要有。放唔放行由警方決定'},
    {k:'column_1',        label:'典禮角色',       type:'text',   level:LEVEL.BEST,  eg:'頒獎'},
    {k:'note',            label:'備註',          type:'text',   level:LEVEL.BEST,  eg:'區Sir副官',   note:'換人、取消、特別安排寫喺度'},
    {k:'checked_in',      label:'已報到',        type:'bool',   level:LEVEL.AUTO,  eg:'',           note:'活動日由 APP 點名，唔好手填'}
  ]
},

/* ───────────────────────────────────── 02 組織架構及聯絡 ── */
{
  id:'org-contacts', seq:'02', kind:'xlsx',
  file:'02_組織架構及聯絡.xlsx', sheet:'架構及聯絡',
  title:'組織架構及聯絡',
  owner:'秘書處',
  target:'staff.contacts',
  key:'name',
  feeds:['組織架構圖','聯絡清單','APP 登入帳號','編更','各組部門中心權限'],
  churn:'2026 由 55 行正規化成 54 人（有一行寫咗兩個人名）。人會加會走，所以唔好印死一份 PDF 傳嚟傳去。',
  rules:[
    '一行一個人。兩個人唔好擠喺同一格——2026 就係咁出事。',
    '電話淨係填 8 位數字，唔好加 +852、空格或者「/」。',
    '職位未搵到人，照留一行，姓名留空並喺備註寫「待定」——空缺要睇得見，唔好隱形。',
    'APP 登入帳號由電話自動開，所以電話錯＝登入唔到。'
  ],
  columns:[
    {k:'group_name', label:'組別',     type:'text', level:LEVEL.BLOCK, eg:'協調組',   note:'要同「組別一覽」表一致'},
    {k:'level',      label:'層級',     type:'text', level:LEVEL.BEST,  eg:'副主席'},
    {k:'role_title', label:'職位',     type:'text', level:LEVEL.BLOCK, eg:'顧問'},
    {k:'name',       label:'姓名',     type:'text', level:LEVEL.BEST,  eg:'黃偉安',   note:'空缺就留空，備註寫「待定」'},
    {k:'contact',    label:'電話',     type:'phone',level:LEVEL.BEST,  eg:'92157472', note:'8 位數字。錯咗就登入唔到 APP'},
    {k:'email',      label:'電郵',     type:'text', level:LEVEL.BEST,  eg:'a@b.com'},
    {k:'job_desc',   label:'職務描述', type:'text', level:LEVEL.BEST,  eg:'統籌物資、車輛、膳食及場地佈置'},
    {k:'note',       label:'備註',     type:'text', level:LEVEL.BEST,  eg:'待定'}
  ]
},

/* ───────────────────────────────────────────── 03 攤位資料 ── */
{
  id:'booths', seq:'03', kind:'xlsx',
  file:'03_攤位資料.xlsx', sheet:'攤位',
  title:'攤位資料',
  owner:'主題節目組',
  target:'activities.booths',
  key:'booth_no',
  feeds:['攤位總表','場地平面圖','遊戲卡','午膳點算','公眾頻道攤位頁'],
  churn:'攤位由外間團體提供，佢哋嘅人手名單好遲先至定，有啲到當日先知。'
       +'所以「聯絡人」同「人數」係【盡量】，唔會着紅燈——但攤位編號同名稱一定要有，因為場地圖靠佢。',
  rules:[
    '攤位編號＝區＋兩位數（A01、B07）。場地圖、遊戲卡、箱頭紙全部認呢個編號。',
    '2026 有兩欄「聯絡」同「聯絡人」內容重疊（16/33 同 25/33），今次合併成一欄。',
    '請外間團體（例如警察、消防）擺嘅攤位，交唔到人名係正常，填「待定」就得。'
  ],
  columns:[
    {k:'booth_no',   label:'攤位編號',   type:'text',  level:LEVEL.BLOCK, eg:'A01', note:'唯一鍵。場地圖同遊戲卡認呢個'},
    {k:'zone',       label:'區',        type:'text',  level:LEVEL.AUTO,  eg:'A',   note:'由攤位編號第一個字自動取'},
    {k:'booth_name', label:'攤位名稱',   type:'text',  level:LEVEL.BLOCK, eg:'主節目組總部'},
    {k:'group_name', label:'負責單位',   type:'text',  level:LEVEL.BLOCK, eg:'主題節目組總部'},
    {k:'theme',      label:'主題',      type:'text',  level:LEVEL.BEST,  eg:'積極公民實踐'},
    {k:'content',    label:'活動內容',   type:'text',  level:LEVEL.BEST,  eg:'攤位遊戲'},
    {k:'contact',    label:'聯絡人及電話',type:'text', level:LEVEL.BEST,  eg:'CHOW Hang-chun 6471 9696', note:'外間團體交唔到就寫「待定」'},
    {k:'staff_count',label:'人手',      type:'number',level:LEVEL.BEST,  eg:7},
    {k:'lunch',      label:'午膳數',     type:'number',level:LEVEL.BEST,  eg:7,     note:'影響代訂餐盒'},
    {k:'confirmed',  label:'已確認',    type:'bool',  level:LEVEL.BEST,  eg:'Y'}
  ]
},

/* ─────────────────────────────────── 04 優異旅團獲獎名單 ── */
{
  id:'merit-roster', seq:'04', kind:'xlsx',
  file:'04_優異旅團獲獎名單.xlsx', sheet:'優異旅團',
  title:'優異旅團獲獎名單',
  owner:'會操及典禮組',
  target:'ceremony.meritRoster',
  key:'unit+section',
  feeds:['典禮頒獎點名','司儀稿唱名','獎座數量','公眾頻道優異旅團入口'],
  churn:'呢張表一經總部公佈就唔應該改。如果真係要改，喺備註寫明原因——2026 就係靠呢個查返邊個團次漏咗。',
  rules:[
    '一行一個「團次」：同一旅唔同支部要分開行，因為獎座係逐個支部派。',
    '旅名要寫全（港島第六旅），唔好簡寫，唱名會照讀。'
  ],
  columns:[
    {k:'area',    label:'區',   type:'text', level:LEVEL.BLOCK, eg:'CHW 柴灣區', ref:'external:區名'},
    {k:'unit',    label:'旅名', type:'text', level:LEVEL.BLOCK, eg:'港島第六旅', ref:'external:旅團名冊', note:'同「支部」一齊做唯一鍵。寫法要同參加旅團表一致'},
    {k:'section', label:'支部', type:'text', level:LEVEL.BLOCK, eg:'小童軍團',   note:'獎座逐個支部派'},
    {k:'note',    label:'備註', type:'text', level:LEVEL.BEST,  eg:''}
  ]
},

/* ─────────────────────────────────────────── 05 參加旅團 ── */
{
  id:'participants', seq:'05', kind:'xlsx',
  file:'05_參加旅團報名.xlsx', sheet:'參加旅團',
  title:'參加旅團報名',
  owner:'行政組',
  target:'public_channel_2027.manual.participants.rows',
  key:'unit',
  feeds:['旅團點名簽收','代訂餐盒','場地分區','公眾頻道旅團入口'],
  churn:'報名截止之後仲會有加減人數。所以人數欄係【盡量】，當日以點名為準。',
  rules:[
    '一行一旅。人數改咗就改返呢度，唔好另開一份「最新版」。',
    '領隊姓名同電話係當日搵人嘅唯一途徑，盡量填。'
  ],
  columns:[
    {k:'seq',      label:'序號',   type:'number', level:LEVEL.AUTO,  eg:1},
    {k:'unit',     label:'旅名',   type:'text',   level:LEVEL.BLOCK, eg:'港島第175旅', ref:'external:旅團名冊', note:'唯一鍵。寫法要同優異旅團表一致'},
    {k:'area',     label:'區',     type:'text',   level:LEVEL.BLOCK, eg:'HKN 港島北區', ref:'external:區名'},
    {k:'headcount',label:'人數',   type:'number', level:LEVEL.BEST,  eg:28, note:'當日以點名為準'},
    {k:'mealbox',  label:'代訂餐盒',type:'number', level:LEVEL.BEST,  eg:0},
    {k:'leader',   label:'領隊',   type:'text',   level:LEVEL.BEST,  eg:'朱耀文'}
  ]
},

/* ─────────────────────────────────────────── 06 司儀稿 ── */
{
  id:'mc-script', seq:'06', kind:'docx',
  file:'06_司儀稿.docx',
  title:'司儀稿',
  owner:'會操及典禮組',
  target:'ceremony.mc_scripts',
  key:'part',
  feeds:['執行手冊司儀稿分頁（場內離線可讀）','典禮流程對時','Rundown 核對'],
  churn:'2026 改到活動當日先定稿（V5，2026-10-04）。所以司儀手上嗰份同 APP 入面嗰份一定要係同一份——'
       +'唔好印完紙再改 Word，APP 要讀返最後嗰份。',
  rules:[
    '每一部分一份文件，開頭要有「部分／版本／日期／司儀姓名」四行。',
    '正文直接打字，唔好貼圖——APP 要搵字、要放大畀台上睇手機。',
    '改完記得更新「版本」同「更新日期」兩行，APP 靠佢判斷邊份係最新。'
  ],
  columns:[
    {k:'part',      label:'部分',    type:'text', level:LEVEL.BLOCK, eg:'第一部分'},
    {k:'title',     label:'標題',    type:'text', level:LEVEL.BLOCK, eg:'優異旅團及各項獎勵頒獎典禮 司儀稿'},
    {k:'version',   label:'版本',    type:'text', level:LEVEL.BLOCK, eg:'V5'},
    {k:'updated_at',label:'更新日期', type:'date', level:LEVEL.BLOCK, eg:'2026-10-02', note:'APP 靠呢個判斷邊份最新'},
    {k:'mc',        label:'司儀',    type:'text', level:LEVEL.BEST,  eg:'林汶珊小姐（女）／林卓衡先生（男）'},
    {k:'note',      label:'重點提示', type:'text', level:LEVEL.BEST,  eg:'1045 宣佈就座｜1055 嘉賓進場'},
    {k:'content',   label:'正文',    type:'long', level:LEVEL.BLOCK, eg:'（全文）', note:'直接打字，唔好貼圖'}
  ]
}

];

module.exports={LEVEL,TEMPLATES};
