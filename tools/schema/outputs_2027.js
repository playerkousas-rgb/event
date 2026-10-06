/* outputs_2027.js — 第 1 步：數齊所有要輸出嘅嘢
   ──────────────────────────────────────────────────────────────────────────
   用戶原話：「我們先完成第 1 步，數齊所有需要輸出的資料，我要對齊 2027 年
               要出現的結果，再一樣樣回追」

   所以呢個檔【淨係一份清單】。冇功能、冇介面、冇自動化。
   資料源同埋點樣生成係第 2 步嘅事，呢度一律留白。

   ── 點數出嚟 ──
   全部有實物根據，唔係估：
     data/isd_2026.json → documents            79 份
     data/isd_2026.json → activity_day_sources 18 個當日檔（同上面有重疊）
     系統現有 tab／面板                          29 個
   逐件對，去重，再分類。

   ── 五個類別（分類標準：2027 要落幾多功夫）──
     GEN   由我哋啲資料生成。改一次資料，呢份嘢就要跟住變。
           ← 呢批先係要做自動化嗰批，亦都係 2026 出事嗰批
     FIX   固定文件。每年換個年份／日期就得，內容唔會因為邊個報咗名而變。
     IN    收料用嘅表格。係入口唔係出口，但都要出一份嘢畀人填。
     DSGN  設計檔。地圖、海報、遊戲卡 —— 設計師出，我哋唔生成。
     SCR   淨係喺螢幕出現，冇紙本。

   ── status ──
     linked    已經接咗落系統，資料一改就跟
     partial   接咗一部分，仲有洞
     unlinked  仲未接，2027 要追
     na        唔使接（固定文件／設計檔）
   ────────────────────────────────────────────────────────────────────────── */

'use strict';
(function(){

const KIND={
  GEN :{code:'GEN', label:'由資料生成', note:'改一次資料就要跟住變，2026 出事主要喺呢批'},
  FIX :{code:'FIX', label:'固定文件',   note:'換年份日期就得，唔會因為報名情況而變'},
  IN  :{code:'IN',  label:'收料表格',   note:'係入口，但都要出一份嘢畀人填'},
  DSGN:{code:'DSGN',label:'設計檔',     note:'設計師出，我哋唔生成'},
  SCR :{code:'SCR', label:'只在螢幕',   note:'冇紙本'}
};

const STATUS={
  linked  :{code:'linked',  label:'已接',   note:'資料一改就跟'},
  partial :{code:'partial', label:'接一半', note:'有洞，見 gaps'},
  unlinked:{code:'unlinked',label:'未接',   note:'2027 要追'},
  na      :{code:'na',      label:'唔使接', note:'固定文件／設計檔'}
};

/* ══════════════════════════════════════════════════════════════════════
   清單本身
   ev  = 2026 實物根據（doc 標題／系統 tab key）
   who = 邊組出（documents.uploaded_by；冇寫就留 '' 唔好作）
   ══════════════════════════════════════════════════════════════════════ */
const OUTPUTS=[

/* ── 一、典禮台上要讀、要叫名嘅 ───────────────────────────────────
   共通點：有名單、有出席狀態、司儀當場要讀。2026 全部靠附件＋人手填。 */
{id:'o-mc-merit', aud:'dept', have:'have',    title:'司儀稿－優異旅團頒獎',  kind:'GEN', medium:'screen+print', who:'',
 ev:['doc:1_司儀稿_優異旅團頒獎儀式 2026 V5','ceremony.mc_scripts[0]'],
 status:'partial', gaps:['總領袖獎章名單（3 組）','榮譽童軍獎章名單','貝登堡獎章名單','總監委任書＿＿人數'],
 note:'v26 已接優異旅團五個支部；其餘名單仲係「請參閱附件」'},
{id:'o-mc-parade', aud:'dept', have:'have',   title:'司儀稿－會操檢閱典禮',  kind:'GEN', medium:'screen+print', who:'',
 ev:['doc:2. 司儀稿_會操檢閱典禮2026 V4','ceremony.mc_scripts[1]'], status:'unlinked', gaps:[]},
{id:'o-mc-lunch', aud:'dept', have:'have',    title:'司儀稿－莫榮大樓自助餐',kind:'GEN', medium:'screen+print', who:'',
 ev:['doc:3_司儀稿_莫榮大樓自助餐 2026 V2','ceremony.mc_scripts[2]'], status:'unlinked', gaps:[],
 note:'2026 同時存在 V1 同 V2 兩份，係「改完再改」嘅直接證據'},
{id:'o-rundown-all', aud:'dept', have:'have', title:'總流程連獎項 Rundown', kind:'GEN', medium:'print', who:'',
 ev:['doc:Rundown_All 2026 連獎項 Part 1 V5','ceremony.rundown_part1_v5(13 行)'], status:'unlinked', gaps:[]},
{id:'o-rundown-parade', aud:'dept', have:'gap',title:'典禮程序 Parade Ceremony Rundown',kind:'GEN',medium:'print',who:'',
 ev:['doc:Parade Ceremony Rundown 2026 (典禮程序)'], status:'unlinked', gaps:[]},
{id:'o-party-entry-1', aud:'dept', have:'gap',title:'優異旅團頒獎－主禮團進場次序',kind:'GEN',medium:'print',who:'',
 ev:['doc:ISD 優異旅團頒獎 Part 1 主禮團進場 2026 V1'], status:'unlinked', gaps:[]},
{id:'o-party-entry-2', aud:'dept', have:'gap',title:'會操檢閱－主禮團進場次序',kind:'GEN',medium:'print',who:'',
 ev:['doc:ISD 會操檢閱 Part 2 主禮團進場 2026 V1'], status:'unlinked', gaps:[]},
{id:'o-inspection', aud:'dept', have:'have',  title:'檢閱路線及提問',        kind:'GEN', medium:'print', who:'',
 ev:['ceremony.inspection_route(6 步／3 人／3 條問題)'], status:'unlinked', gaps:[]},

/* ── 二、獎項名單 ─────────────────────────────────────────────── */
{id:'o-merit-roster', aud:'dept', have:'have',title:'優異旅團獲獎名單',      kind:'GEN', medium:'screen+print', who:'',
 ev:['tab:cer_award_merit','ceremony.meritRoster(188)'], status:'linked', gaps:[]},
{id:'o-section-award', aud:'dept', have:'gap',title:'支部獎勵名單',         kind:'GEN', medium:'screen+print', who:'',
 ev:['tab:cer_award_section'], status:'partial', gaps:['總領袖獎章 46 位','榮譽童軍獎章 8 位','貝登堡獎章 3 位']},
{id:'o-leader-award', aud:'dept', have:'gap',title:'領袖獎勵名單',          kind:'GEN', medium:'screen+print', who:'',
 ev:['tab:cer_award_leader','ceremony.adult_awards(6)'], status:'partial',
 gaps:['十年長期服務獎狀 7 位','長期服務獎章 3 位','一星 1 位','三星 1 位','每位嘅「初步回覆／出席」狀態']},
{id:'o-commission', aud:'dept', have:'gap',  title:'總監委任書名單',        kind:'GEN', medium:'print', who:'',
 ev:['司儀稿第 8 頁 7 人表（職位／姓名／初步回覆／出席）'], status:'unlinked', gaps:['成張表仲喺司儀稿入面，未入資料庫']},
{id:'o-ug-list', aud:'dept', have:'have',     title:'出席 UG 及派隊清單',    kind:'GEN', medium:'print', who:'',
 ev:['doc:出席UG及派隊清單_2026_as at 20260929','ceremony.ug_units(3)','ceremony.ug_guests(8)'], status:'unlinked', gaps:[]},

/* ── 三、嘉賓 ─────────────────────────────────────────────────── */
{id:'o-guest-roster', aud:'dept', have:'have',title:'嘉賓名單',              kind:'GEN', medium:'print', who:'',
 ev:['doc:港島童軍繽紛日 2026－嘉賓名單 as at 02.10.2026','guest_roster.guests(102)','範本 01'], status:'linked', gaps:[]},
{id:'o-guest-checkin', aud:'dept', have:'have',title:'嘉賓報到點名',         kind:'SCR', medium:'screen', who:'',
 ev:['guest_roster.guests.checked_in'], status:'linked', gaps:[]},
{id:'o-guest-stamp', aud:'dept', have:'have', title:'紀念章派發（嘉賓）',    kind:'SCR', medium:'screen', who:'',
 ev:['tab:stamp_guest'], status:'linked', gaps:[]},
{id:'o-invitation', aud:'public', have:'gap',  title:'嘉賓邀請函',            kind:'GEN', medium:'print', who:'',
 ev:['doc:ISD2026 邀請函 (Invitation Letter) 04102026'], status:'unlinked',
 gaps:['逐位嘉賓 mail merge：稱謂／職銜／出席部分']},
{id:'o-invite-card-pres', aud:'public', have:'gap',title:'邀請卡－會長',      kind:'GEN', medium:'print', who:'',
 ev:['doc:ISD2026 邀請卡－會長 04102026'], status:'unlinked', gaps:[]},
{id:'o-invite-card-goh', aud:'public', have:'gap',title:'邀請卡－主禮嘉賓',   kind:'GEN', medium:'print', who:'',
 ev:['doc:ISD2026 邀請卡－主禮嘉賓 (GoH) 04102026'], status:'unlinked', gaps:[]},
{id:'o-guest-reply', aud:'public', have:'gap', title:'嘉賓回條',              kind:'IN',  medium:'print', who:'',
 ev:['doc:ISD2026 回條 (IN reply) 04102026'], status:'unlinked',
 gaps:['收返嚟之後點入返 guest_roster（2026 係人手入）']},
{id:'o-guest-map', aud:'public', have:'have',   title:'警察學院地圖－嘉賓版',  kind:'DSGN',medium:'print', who:'',
 ev:['doc:ISD2026 警察學院地圖－嘉賓版 V2'], status:'na', gaps:[]},
{id:'o-guest-transport', aud:'dept', have:'have',title:'嘉賓交通／大會車安排',kind:'GEN',medium:'print', who:'',
 ev:['guest_transport.guests(4)','guest_roster.guests.event_bus'], status:'partial', gaps:['大會車上落點同時間']},

/* ── 四、旅團（參加者）────────────────────────────────────────── */
{id:'o-troop-notice', aud:'public', have:'gap',title:'童軍旅通知書',          kind:'GEN', medium:'print', who:'',
 ev:['doc:0.童軍旅通知書2026'], status:'unlinked',
 gaps:['逐個旅 mail merge：旅名／人數／餐盒／領隊／集合點']},
{id:'o-ngo-notice', aud:'public', have:'gap',  title:'共創明Teen 團體活動通知書',kind:'GEN',medium:'print', who:'',
 ev:['doc:0.共創明Teen計劃團體活動通知書2026'], status:'unlinked', gaps:[]},
{id:'o-troop-count', aud:'dept', have:'have', title:'旅團報名人數表',        kind:'GEN', medium:'print', who:'',
 ev:['doc:旅團報名人數_2026 as 26.9.2026','participants(31)','範本 05'], status:'linked', gaps:[]},
{id:'o-troop-checkin', aud:'dept', have:'have',title:'旅團點名簽收',         kind:'SCR', medium:'screen', who:'行政組',
 ev:['tab:admin_troop_checkin','troop_checkin(31)'], status:'linked', gaps:[]},
{id:'o-troop-program', aud:'public', have:'gap',title:'參加旅團節目程序（附錄1）',kind:'GEN',medium:'print', who:'',
 ev:['doc:附錄1_參加旅團節目程序_2026'], status:'unlinked', gaps:[]},
{id:'o-troop-sitemap', aud:'public', have:'have',title:'參加旅團場地指示圖（附錄2）',kind:'DSGN',medium:'print',who:'',
 ev:['doc:附錄2_參加旅團場地指示圖2026 v2'], status:'na', gaps:[]},
{id:'o-enroll-form', aud:'public', have:'gap', title:'報名表格 sp12a',        kind:'IN',  medium:'print', who:'行政組',
 ev:['doc:報名表格 sp12a_26_isd2026_enrollform.pdf'], status:'unlinked',
 gaps:['2026 經 Google Form 收，再人手改；2027 要直接寫後端']},

/* ── 五、工作人員 ─────────────────────────────────────────────── */
{id:'o-org-chart', aud:'staff', have:'have',   title:'籌委架構及聯絡表',      kind:'GEN', medium:'screen+print', who:'行政組',
 ev:['doc:ISD2026 Org Chart and Contact List（持續更新）','staff.contacts(80)','staff.org_chart(55)','範本 02'],
 status:'linked', gaps:['空缺 15 位・有名無電話 2 位・示範號碼 11 個']},
{id:'o-staff-roster', aud:'staff', have:'have',title:'工作人員編更',          kind:'GEN', medium:'print', who:'行政組',
 ev:['staff.event_staff_roster(279)'], status:'partial',
 gaps:['contact 欄 279 個全空','booth 欄寫「A1 Core」同攤位表「A01」對唔上（v24 已可夾返）']},
{id:'o-staff-stamp', aud:'staff', have:'have', title:'紀念章派發（工作人員）',kind:'GEN', medium:'screen+print', who:'',
 ev:['tab:stamp_staff','souvenirs.staff_roster_2026(290)'], status:'linked',
 gaps:['290 vs 編更 279，兩個數唔一樣']},
{id:'o-staff-meal', aud:'staff', have:'have',  title:'工作人員膳食點名',      kind:'GEN', medium:'screen+print', who:'協調組',
 ev:['tab:coord_meal_staff','staff_meals_2026(290)'], status:'linked', gaps:[]},
{id:'o-job-duties', aud:'staff', have:'have',  title:'職務分工表',            kind:'GEN', medium:'print', who:'',
 ev:['staff.job_duties(11)'], status:'unlinked', gaps:[]},

/* ── 六、攤位／節目 ───────────────────────────────────────────── */
{id:'o-booth-master', aud:'staff', have:'have',title:'攤位總表',              kind:'GEN', medium:'screen+print', who:'主題節目組',
 ev:['doc:ISD2026 攤位資料','tab:master','activities.booths(33)','範本 03'], status:'linked',
 gaps:['contact 欄 17/33 空白']},
{id:'o-booth-drive', aud:'staff', have:'have', title:'攤位資料（Drive 版）',  kind:'GEN', medium:'file', who:'主題節目組',
 ev:['tab:drive'], status:'linked', gaps:[]},
{id:'o-borrow-stat', aud:'dept', have:'have', title:'借用統計及招牌',        kind:'GEN', medium:'screen+print', who:'',
 ev:['tab:borrow'], status:'linked', gaps:[]},
{id:'o-game-card', aud:'public', have:'have',   title:'遊戲卡',                kind:'DSGN',medium:'print', who:'',
 ev:['doc:Game card','activities.gameCards(2)'], status:'na', gaps:[]},
{id:'o-badge-poster', aud:'public', have:'have',title:'機電先鋒章海報（A2 五款）',kind:'DSGN',medium:'print', who:'',
 ev:['doc:積極公民獎章－機電先鋒章（Full Set）','doc:積極公民獎章－機電先鋒章 A2 100%',
     'doc:積極公民獎章－機電先鋒：幼童軍支部 A2','doc:積極公民獎章－機電先鋒：童軍支部 A2',
     'doc:積極公民獎章－機電先鋒：深資童軍支部 A2','doc:積極公民獎章－機電先鋒：樂行童軍支部 A2'],
 status:'na', gaps:[]},
{id:'o-badge-booklet', aud:'public', have:'have',title:'家居電力安全手冊',     kind:'FIX', medium:'print', who:'',
 ev:['doc:機電先鋒－家居電力安全手冊 (Cub Appendix)'], status:'na', gaps:[]},
{id:'o-theme-report', aud:'dept', have:'gap',title:'主題節目組報告',        kind:'GEN', medium:'file', who:'主題節目組',
 ev:['doc:ISD2026 - 主題節目組報告 (20260616) Rev.1',
     'doc:ISD2026 - 主題節目組報告 (20260818) Rev.1'], status:'unlinked',
 gaps:['同一份嘢出咗兩個 Rev']},

/* ── 七、膳食 ─────────────────────────────────────────────────── */
{id:'o-mealbox', aud:'dept', have:'have',     title:'代訂餐盒名單',          kind:'GEN', medium:'screen+print', who:'協調組',
 ev:['tab:coord_mealbox','participants.mealbox'], status:'linked', gaps:[]},
{id:'o-meal-approve', aud:'dept', have:'have',title:'膳食批核',              kind:'SCR', medium:'screen', who:'協調組',
 ev:['tab:coord_meals','meals.orders(7)','meals.menus(3)'], status:'linked', gaps:[]},
{id:'o-meal-dist', aud:'dept', have:'have',   title:'膳食派發分配表',        kind:'GEN', medium:'print', who:'協調組',
 ev:['meal_distribution_2026.booths(30)','staff_groups(14)','others(3)'], status:'partial',
 gaps:['攤位午膳加總 173 vs 攤位人手 193 vs 編更 279 vs 派章 290，四個數']},
{id:'o-meal-menu', aud:'staff', have:'have',   title:'餐單',                  kind:'FIX', medium:'print', who:'協調組',
 ev:['meal_menu_2026(9)'], status:'na', gaps:[]},
{id:'o-meal-logistics', aud:'dept', have:'have',title:'膳食運送安排',        kind:'GEN', medium:'print', who:'協調組',
 ev:['meal_logistics_2026(3)'], status:'unlinked', gaps:[]},

/* ── 八、場地／物流 ───────────────────────────────────────────── */
{id:'o-site-plan', aud:'staff', have:'have',   title:'場地佈置圖 Site Setup Plan',kind:'DSGN',medium:'print', who:'',
 ev:['doc:ISD2026 Site Setup Plan R10-SETUP PLAN-1'], status:'na', gaps:[]},
{id:'o-site-map', aud:'public', have:'have',    title:'場地地圖 MAP',          kind:'DSGN',medium:'print', who:'協調組',
 ev:['doc:MAP.gif（場地地圖）','activities.maps(1)'], status:'na', gaps:[]},
{id:'o-police-map', aud:'public', have:'have',  title:'警察學院場地地圖',      kind:'DSGN',medium:'print', who:'秘書處',
 ev:['doc:香港警察學院場地地圖'], status:'na', gaps:[]},
{id:'o-marquee', aud:'staff', have:'have',     title:'帳篷資料',              kind:'FIX', medium:'print', who:'',
 ev:['doc:261003_Scout_marquee'], status:'na', gaps:[]},
{id:'o-carton', aud:'staff', have:'gap',      title:'箱頭紙',                kind:'GEN', medium:'print', who:'',
 ev:['doc:港島童軍繽紛日2026箱頭紙'], status:'unlinked',
 gaps:['每個攤位／每個組印幾多張、印邊個名 —— 要由攤位表同編更推']},
{id:'o-supplies', aud:'dept', have:'have',    title:'物資批核',              kind:'SCR', medium:'screen', who:'協調組',
 ev:['tab:coord_supplies'], status:'linked', gaps:[]},
{id:'o-lost-found', aud:'staff', have:'have',  title:'失物認領',              kind:'SCR', medium:'screen', who:'',
 ev:['tab:lost_found'], status:'linked', gaps:[]},
{id:'o-site-quote', aud:'dept', have:'have',  title:'場地佈置報價邀請',      kind:'FIX', medium:'file', who:'協調組',
 ev:['doc:ISD2026 Site setup Quotation Request'], status:'na', gaps:[]},
{id:'o-clean-quote', aud:'dept', have:'have', title:'清潔服務報價邀請',      kind:'FIX', medium:'file', who:'協調組',
 ev:['doc:ISD2026 Cleaning Quotation request'], status:'na', gaps:[]},

/* ── 九、車輛／泊車 ───────────────────────────────────────────── */
{id:'o-parking-form', aud:'public', have:'gap',title:'泊車證申請表',          kind:'IN',  medium:'file', who:'協調組',
 ev:['doc:港島童軍繽紛日2026－泊車證申請表格（Google Sheet）','parking_source.columns(12)'], status:'unlinked', gaps:[]},
{id:'o-parking-pass', aud:'dept', have:'gap',title:'泊車證（實物）',        kind:'GEN', medium:'print', who:'協調組',
 ev:['parking_source'], status:'unlinked', gaps:['一人一張，要 mail merge 車牌同姓名']},
{id:'o-vehicle-approve', aud:'dept', have:'have',title:'車輛批核',           kind:'SCR', medium:'screen', who:'協調組',
 ev:['tab:coord_vehicle'], status:'linked', gaps:[]},
{id:'o-plate-roll', aud:'dept', have:'have',  title:'點車牌（閘口查冊）',    kind:'GEN', medium:'screen+print', who:'協調組',
 ev:['tab:coord_plate','v20 車牌三源'], status:'linked', gaps:[]},

/* ── 十、財務 ─────────────────────────────────────────────────── */
{id:'o-budget', aud:'dept', have:'gap',      title:'財務預算 Budget',       kind:'GEN', medium:'file', who:'行政組',
 ev:['doc:ISD2026 Budget（Google Sheet）','finance.budget_source.columns(5)'], status:'unlinked', gaps:[]},
{id:'o-fin-summary', aud:'dept', have:'have', title:'財務匯總（各部門）',    kind:'GEN', medium:'screen+print', who:'行政組',
 ev:['tab:admin_finance'], status:'linked', gaps:[]},
{id:'o-expense', aud:'staff', have:'have',     title:'開支申報',              kind:'SCR', medium:'screen', who:'',
 ev:['tab:group_expense'], status:'linked', gaps:[]},
{id:'o-quotes', aud:'staff', have:'have',      title:'口頭報價記錄',          kind:'GEN', medium:'screen+print', who:'',
 ev:['tab:group_quotes','doc:附件3 - 口頭報價資料記錄'], status:'linked', gaps:[]},
{id:'o-quote-compare', aud:'dept', have:'gap',title:'書面報價比較表（附件4）',kind:'GEN',medium:'print', who:'行政組',
 ev:['doc:附件4 - 書面報價比較表'], status:'unlinked', gaps:[]},
{id:'o-settlement', aud:'dept', have:'gap',  title:'結算總表（附件5／5A／5B）',kind:'GEN',medium:'print', who:'行政組',
 ev:['doc:附件5 - 結算總表 (WORD)','doc:附件5A - 結算總表 (WORD w autosum)',
     'doc:附件5B - 結算總表 (EXCEL)'], status:'unlinked',
 gaps:['同一份嘢三個格式，2026 要人手對三次']},
{id:'o-fin-guide', aud:'staff', have:'have',   title:'財務指引及會計程序',    kind:'FIX', medium:'screen+file', who:'行政組',
 ev:['doc:ISD2026 財務指引及會計程序 ver 1','tab:group_finance_guide'], status:'na', gaps:[]},
{id:'o-fin-annex', aud:'staff', have:'have',   title:'財務附件 1／2／6',      kind:'FIX', medium:'print', who:'行政組',
 ev:['doc:附件1 - 報價要求','doc:附件2 - 豁免商戶名單 (Rev Dec 2025)',
     'doc:附件6 - 四格印簽名位置'], status:'na', gaps:[]},

/* ── 十一、通告／對外 ─────────────────────────────────────────── */
{id:'o-main-circular', aud:'public', have:'have',title:'活動通告 sp12',        kind:'FIX', medium:'print', who:'行政組',
 ev:['doc:活動通告 sp12_26_isd2026.pdf'], status:'na',
 gaps:['內有日期／名額／費用／截止日，換年份要逐個改']},
{id:'o-special-circ', aud:'public', have:'have',title:'特別通告（6 份）',      kind:'FIX', medium:'print', who:'',
 ev:['doc:特別通告第01/26號－地域總監嘉許計劃 2026',
     'doc:特別通告第02/26號－區總監嘉許計劃 2026',
     'doc:特別通告第03/26號－2026年優異旅團獎勵計劃',
     'doc:特別通告第11/26號－2026/2027年度活動與訓練行事曆',
     'doc:特別通告第15/26號－幼童軍及童軍積極公民獎章系列·機電先鋒章考驗',
     'doc:特別通告第16/26號－深資童軍及樂行童軍積極公民獎章系列·機電先鋒章工作坊'], status:'na', gaps:[]},
{id:'o-oc-invite', aud:'public', have:'gap',   title:'籌委邀請函 M28（3 款）',kind:'GEN', medium:'print', who:'秘書處',
 ev:['doc:籌委邀請函 M28 (Councils)','doc:籌委邀請函 M28 (District)',
     'doc:籌委邀請函 M28 (DRCs)'], status:'unlinked', gaps:[]},
{id:'o-oc-reply', aud:'public', have:'gap',    title:'籌委邀請回條 M28a',     kind:'IN',  medium:'print', who:'秘書處',
 ev:['doc:籌委邀請回條 M28a'], status:'unlinked', gaps:[]},
{id:'o-food-donate', aud:'public', have:'have', title:'食物捐贈通告＋表格',    kind:'GEN', medium:'print+screen', who:'秘書處',
 ev:['doc:食物捐贈通告 (FoodDonation)','食物捐贈表格 (FoodDonation_Form)','v19 童心捐贈 QR'], status:'partial',
 gaps:['紙本表同 QR 入數未對帳']},
{id:'o-goods-donate', aud:'public', have:'gap',title:'物資捐贈通告＋表格',    kind:'GEN', medium:'print+screen', who:'秘書處',
 ev:['doc:物資捐贈通告 (Goods Donating)','doc:物資捐贈表格 (Goods Donating_Form)'], status:'partial',
 gaps:['紙本表收返嚟點入帳（食物捐贈有 v19 QR，物資捐贈仲係淨紙本）']},
{id:'o-compliance', aud:'public', have:'have',  title:'收受利益及申報政策',    kind:'FIX', medium:'print', who:'秘書處',
 ev:['doc:收受利益及申報政策 (pc132018c)','doc:收受利益及申報政策 (pc142018c)'], status:'na', gaps:[]},
{id:'o-public-page', aud:'public', have:'have', title:'公眾頻道（活動日版）',  kind:'GEN', medium:'screen', who:'',
 ev:['public_channel_2027','v15'], status:'linked', gaps:[]},
{id:'o-brand', aud:'dept', have:'have',       title:'品牌推廣組文件',        kind:'DSGN',medium:'file', who:'',
 ev:['doc:20260818 品牌推廣組 (Google Doc)'], status:'na', gaps:[]},

/* ── 十二、會議／內部 ─────────────────────────────────────────── */
{id:'o-agenda', aud:'dept', have:'have',      title:'籌委會議議程',          kind:'GEN', medium:'file', who:'秘書處',
 ev:['doc:4_Agenda 籌備委員會議程 (20260818)','meetings(6)'], status:'unlinked', gaps:[]},
{id:'o-minutes', aud:'dept', have:'gap',     title:'會議記錄',              kind:'GEN', medium:'file', who:'秘書處',
 ev:['doc:App1-ISD2026-籌備委員會第3次會議記錄 Ver1'], status:'unlinked', gaps:[]},
{id:'o-workplan', aud:'dept', have:'gap',    title:'工作計劃及進度',        kind:'GEN', medium:'file', who:'秘書處',
 ev:['doc:工作計劃及進度 V2.docx'], status:'unlinked', gaps:[]},
{id:'o-schedule', aud:'public', have:'have',    title:'日程表 Run Down（全日）',kind:'GEN',medium:'print', who:'秘書處',
 ev:['doc:ISD2026 日程表 (Run Down)','schedule(6)'], status:'partial',
 gaps:['schedule 得 6 行，2026 份 Run Down PDF 實際內容多過呢 6 行']},
{id:'o-crisis', aud:'staff', have:'have',      title:'危機處理小組名單及程序',kind:'GEN', medium:'print', who:'',
 ev:['crisis.team(14)','crisis.contacts(13)','crisis.docs(13)'], status:'unlinked', gaps:[]},
{id:'o-ngo-contact', aud:'dept', have:'gap', title:'共創明Teen NGO 聯絡表', kind:'GEN', medium:'print', who:'',
 ev:['doc:ISD 2026 共創明Teen NGO contact list'], status:'unlinked', gaps:[]},
{id:'o-wish-list', aud:'dept', have:'gap',   title:'Wish List',             kind:'GEN', medium:'file', who:'',
 ev:['doc:Wish List 2026'], status:'unlinked', gaps:[]},
{id:'o-site-visit', aud:'dept', have:'have',  title:'警察學院實地視察程序',  kind:'FIX', medium:'file', who:'',
 ev:['doc:警察學院實地視察 18.8.2026－內容及程序 2026'], status:'na', gaps:[]},
{id:'o-activity-sheet', aud:'dept', have:'gap',title:'活動資料表 0.updated_12S',kind:'GEN',medium:'file', who:'',
 ev:['doc:0.updated_12S'], status:'unlinked', gaps:['未知內容，要開返個檔先知']},
{id:'o-tickets', aud:'staff', have:'have',     title:'票券',                  kind:'SCR', medium:'screen', who:'行政組',
 ev:['tab:admin_tickets'], status:'linked', gaps:[]},
{id:'o-admin-docs', aud:'dept', have:'have',  title:'行政文件夾',            kind:'SCR', medium:'screen', who:'行政組',
 ev:['tab:admin_docs'], status:'linked', gaps:[]},
{id:'o-coord-docs', aud:'dept', have:'have',  title:'場地佈置及文件夾',      kind:'SCR', medium:'screen', who:'協調組',
 ev:['tab:coord_docs'], status:'linked', gaps:[]},
{id:'o-link-registry', aud:'staff', have:'have',title:'連結總表',             kind:'SCR', medium:'screen', who:'',
 ev:['tab:group_links','v22 74 links／121 targets'], status:'linked', gaps:['48/74 條 link id 含年份，應改槽位制']},
{id:'o-crosscheck', aud:'staff', have:'have',  title:'跨組對帳',              kind:'SCR', medium:'screen', who:'',
 ev:['tab:group_crosscheck','v24'], status:'linked', gaps:[]},
/* ── 十三、點算時補返嘅（覆蓋檢查捉返出嚟）─────────────────────── */
{id:'o-booths-2025ref', aud:'dept', have:'have',title:'上屆攤位資料（參考用）',kind:'FIX', medium:'file', who:'主題節目組',
 ev:['doc:ISD2025 攤位資料（參考）'], status:'na',
 gaps:[], note:'唔係 2027 要出嘅嘢，係開會時攞嚟對嘅上屆底。列出嚟係因為佢佔住 documents 一格。'},
{id:'o-venue-quote', aud:'dept', have:'have',  title:'場地報價 WFQ',        kind:'FIX', medium:'file', who:'',
 ev:['doc:WFQ26070315 香港童軍總會港島地域 4-10 (報價)'], status:'na', gaps:[]},
{id:'o-participants-admin', aud:'dept', have:'have',title:'參加旅團（行政組視圖）',kind:'SCR',medium:'screen', who:'行政組',
 ev:['tab:admin_participants'], status:'linked',
 gaps:[], note:'同 o-troop-count 同一份資料，兩個地方睇 —— 要留意係咪真係要兩個入口。'},
{id:'o-live-script-tab', aud:'dept', have:'have',title:'活司儀稿（位置本身）',kind:'SCR',medium:'screen', who:'會操及典禮組',
 ev:['tab:cer_live_script','v26'], status:'linked',
 gaps:[], note:'呢個係 o-mc-merit 嗰份稿嘅「指定位置」，唔係另一份輸出。'},
{id:'o-pc-content', aud:'staff', have:'have',   title:'公眾頻道內容（本組負責）',kind:'SCR',medium:'screen', who:'',
 ev:['tab:group_pc_content','v21'], status:'linked', gaps:[]},
{id:'o-group-apps', aud:'staff', have:'have',   title:'本組申請',            kind:'SCR', medium:'screen', who:'',
 ev:['tab:apps'], status:'linked', gaps:[]},

/* ── 十四、我建議 2027 加（🟡）────────────────────────────────────
   全部喺 2026 司儀稿／資料入面搵得到根據，但從來冇做成一份可以出嘅嘢。
   唔係我憑空諗出嚟，每條都附返原文。 */
{id:'o-merit-cert', aud:'dept', have:'suggest', title:'優異旅團證書及彩帶標籤',
 kind:'GEN', medium:'print', who:'會操及典禮組',
 ev:['司儀稿原文：頒發「2026 年優異旅團彩帶及證書」—小童軍（證書）／幼童軍（彩帶）／童軍（彩帶）／深資童軍（彩帶）',
     'ceremony.meritRoster(188)'],
 status:'unlinked', gaps:['188 份，每份要印旅名。而家冇一份嘢列明邊個旅攞證書、邊個攞彩帶'],
 note:'旅名要用邊個寫法？證書應該印全寫，唔係司儀稿嗰個中文數字。'},
{id:'o-thanks-cert', aud:'dept', have:'suggest', title:'協助單位感謝狀',
 kind:'GEN', medium:'print', who:'會操及典禮組',
 ev:['司儀稿原文：有請地域主席李傑之先生為我哋致送感謝狀比協助機構 1. 香港警察學院 2. 香港聖約翰救傷隊'],
 status:'unlinked', gaps:['協助單位名單冇獨立存喺任何地方，淨係寫死喺司儀稿入面']},
{id:'o-award-letter', aud:'dept', have:'suggest', title:'支部最高獎章嘉許信',
 kind:'GEN', medium:'print', who:'會操及典禮組',
 ev:['司儀稿原文：頒發「支部最高獎章嘉許信」','總領袖獎章 46 位／榮譽童軍獎章 8 位／貝登堡獎章 3 位'],
 status:'unlinked', gaps:['57 封，逐封印人名。名單本身都未入系統（見 o-section-award）']},
{id:'o-service-cert', aud:'dept', have:'suggest', title:'長期服務獎狀及獎章證書',
 kind:'GEN', medium:'print', who:'會操及典禮組',
 ev:['司儀稿原文：十年長期服務獎狀 7 位／長期服務獎章 3 位／一星 1 位／三星 1 位'],
 status:'unlinked', gaps:['12 份，連「初步回覆／出席」狀態都仲喺司儀稿張表入面']},
{id:'o-guest-seating', aud:'dept', have:'suggest', title:'嘉賓座位表及座位卡',
 kind:'GEN', medium:'print', who:'嘉賓接待組',
 ev:['司儀稿原文：請各位就座／請到嘉賓席就座','guest_roster.guests(102) 有 ceremony_part_1／part_2 分場'],
 status:'unlinked',
 gaps:['ceremony.seating 呢個位 2026 完全冇資料','第一部分同第二部分出席唔同人，座位要唔要換？'],
 note:'有 102 位嘉賓、有分兩場出席，但冇一張座位圖。2026 應該係現場夾。'},
{id:'o-guest-badge', aud:'dept', have:'suggest', title:'嘉賓名牌',
 kind:'GEN', medium:'print', who:'嘉賓接待組',
 ev:['guest_roster.guests(102)：name 同 title 兩欄齊'],
 status:'unlinked', gaps:['102 個，印邊個稱謂？名單寫「區永樑先生」，司儀稿叫「區永樑助理處長」']},
{id:'o-staff-badge', aud:'staff', have:'suggest', title:'工作人員證',
 kind:'GEN', medium:'print', who:'行政組',
 ev:['staff.event_staff_roster(279)','souvenirs.staff_roster_2026(290)'],
 status:'unlinked', gaps:['279 定 290？兩份名單人數唔同，印證應該照邊份']},
{id:'o-booth-signage', aud:'dept', have:'suggest', title:'攤位桌牌／指示牌',
 kind:'GEN', medium:'print', who:'主題節目組',
 ev:['activities.booths(33)：booth_no 加 booth_name 加 group_name'],
 status:'unlinked',
 gaps:['33 塊。牌上面寫「A01」定「A01 主節目組總部」？行政組編更寫緊「A1 Core」'],
 note:'v24 已證實攤位編號兩組寫法零重疊，印牌之前要先夾返。'},
{id:'o-radio-alloc', aud:'dept', have:'suggest', title:'對講機／通訊分配表',
 kind:'GEN', medium:'print', who:'協調組',
 ev:['staff.contacts(80) 有 group_name 同 role_title','crisis.contacts(13)'],
 status:'unlinked', gaps:['2026 冇呢份嘢，但危機小組 14 人同 10 個組之間一定要通到話']},
{id:'o-incident-log', aud:'dept', have:'suggest', title:'意外／急救記錄表',
 kind:'IN', medium:'print', who:'',
 ev:['司儀稿原文：提供急救服務的香港聖約翰救傷隊','crisis.docs(13)'],
 status:'unlinked', gaps:['有救傷隊駐場但冇記錄表']},
{id:'o-weather-call', aud:'public', have:'suggest', title:'惡劣天氣／改期公布',
 kind:'GEN', medium:'screen+print', who:'',
 ev:['2026 原文：延期日 2026-10-11'],
 status:'unlinked',
 gaps:['已經定咗延期日，但冇一個位可以一撳就全站改期'],
 note:'呢個係「一處更新全站同步」最極端嘅測試：改期要同時改通告、公眾頻道、通知書、司儀稿、所有日期。'},
{id:'o-output-board', aud:'staff', have:'have', title:'輸出總表（呢份清單本身）',
 kind:'SCR', medium:'screen', who:'',
 ev:['tab:group_outputs','tools/schema/outputs_2027.js'], status:'linked',
 gaps:[], note:'第 1 步嘅成果本身都係一件輸出 —— 下屆要知「有乜要出」就睇呢度。'},
{id:'o-post-report', aud:'staff', have:'suggest', title:'活動後總結報告',
 kind:'GEN', medium:'file', who:'秘書處',
 ev:['doc:工作計劃及進度 V2.docx','meetings(6)'],
 status:'unlinked', gaps:['2026 冇，但下屆要接手就一定要有']}

];

/* ── 2026 清單本身揭到嘅問題（唔喺上面任何一行，但要記低）────────── */
const INVENTORY_FLAGS=[
 {id:'f-dup-id',  what:'documents 有 3 組重覆 id',
  detail:'doc_36／doc_38／doc_40 各自畀兩份唔同文件用咗。特別通告嗰三份同嘉賓邀請嗰三份撞晒。',
  why:'2027 唔可以再用遞增號做 id，要用槽位名。'},
 {id:'f-version', what:'14/79 份標題入面寫住版本號',
  detail:'V1 V2 V4 V5 Ver1 Rev.1 —— 司儀稿去到 V5，會議記錄 Ver1，主題節目組報告兩個 Rev。',
  why:'版本號寫喺標題＝冇單一最新版。用戶病因「改完再改再改」喺呢度肉眼可見。'},
 {id:'f-dup-doc', what:'同一份嘢同時存在兩個版本',
  detail:'3_司儀稿_莫榮大樓自助餐 2026 V1 同 V2 兩份都喺清單入面。',
  why:'邊份先係最新？清單答唔到。'},
 {id:'f-owner',   what:'79 份入面 48 份冇寫邊組出',
  detail:'uploaded_by 只有 31/79 有值（行政組 13・秘書處 13・協調組 3・主題節目組 2）。',
  why:'「呢格幾時更新過」答唔到，因為連「邊個負責」都冇記。'},
 {id:'f-three-fmt',what:'結算總表同一份嘢出三個格式',
  detail:'附件5 WORD／附件5A WORD w autosum／附件5B EXCEL。',
  why:'鐵律一「一格資料只准喺一個範本出現」嘅反例。'}
];

/* UMD：node（工具／測試）同 browser（面板）共用同一份，唔准複製第二份出嚟。
   鐵律一 —— 一格資料只准喺一個地方出現。 */
const API={KIND,STATUS,OUTPUTS,INVENTORY_FLAGS};
if(typeof window!=='undefined') window.OUTPUTS_2027=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
})();
