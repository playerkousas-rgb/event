# 2027 要輸出嘅嘢 — 第 1 步點算

> 由 `tools/list_outputs.js` 自動產生，請勿手改。改 `tools/schema/outputs_2027.js`。

第 1 步淨係**數齊**。資料源同點樣生成係第 2 步，呢度一律留白。

全部有實物根據：`documents` 79 份 ＋ `activity_day_sources` 18 個當日檔 ＋ 系統現有 29 個面，逐件對、去重、分類。

## 一共 109 件

### 按「2027 要落幾多功夫」分

| 類 | 件數 | 意思 | 點解咁分 |
|---|---:|---|---|
| `GEN` | 65 | 由資料生成 | 改一次資料就要跟住變，2026 出事主要喺呢批 |
| `IN` | 5 | 收料表格 | 係入口，但都要出一份嘢畀人填 |
| `SCR` | 18 | 只在螢幕 | 冇紙本 |
| `FIX` | 13 | 固定文件 | 換年份日期就得，唔會因為報名情況而變 |
| `DSGN` | 8 | 設計檔 | 設計師出，我哋唔生成 |

### 按「接咗未」分

| | 件數 | |
|---|---:|---|
| 未接 | 47 | 2027 要追 |
| 接一半 | 9 | 有洞，見 gaps |
| 已接 | 32 | 資料一改就跟 |
| 唔使接 | 21 | 固定文件／設計檔 |

**要緊嗰批**：`GEN`（由資料生成）65 件 —— 未接 **42**、接一半 **9**、已接 **14**。
其餘 `FIX`／`DSGN` 換年份或者交畀設計師就得，唔使起自動化。

---

## 典禮台上要讀嘅（8）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ◐ | **司儀稿－優異旅團頒獎** | GEN | screen+print | — | `doc:1_司儀稿_優異旅團頒獎儀式 2026 V5`<br>`ceremony.mc_scripts[0]` |
| ○ | **司儀稿－會操檢閱典禮** | GEN | screen+print | — | `doc:2. 司儀稿_會操檢閱典禮2026 V4`<br>`ceremony.mc_scripts[1]` |
| ○ | **司儀稿－莫榮大樓自助餐** | GEN | screen+print | — | `doc:3_司儀稿_莫榮大樓自助餐 2026 V2`<br>`ceremony.mc_scripts[2]` |
| ○ | **總流程連獎項 Rundown** | GEN | print | — | `doc:Rundown_All 2026 連獎項 Part 1 V5`<br>`ceremony.rundown_part1_v5(13 行)` |
| ○ | **典禮程序 Parade Ceremony Rundown** | GEN | print | — | `doc:Parade Ceremony Rundown 2026 (典禮程序)` |
| ○ | **優異旅團頒獎－主禮團進場次序** | GEN | print | — | `doc:ISD 優異旅團頒獎 Part 1 主禮團進場 2026 V1` |
| ○ | **會操檢閱－主禮團進場次序** | GEN | print | — | `doc:ISD 會操檢閱 Part 2 主禮團進場 2026 V1` |
| ○ | **檢閱路線及提問** | GEN | print | — | `ceremony.inspection_route(6 步／3 人／3 條問題)` |

**司儀稿－優異旅團頒獎**
- ⚠ 總領袖獎章名單（3 組）
- ⚠ 榮譽童軍獎章名單
- ⚠ 貝登堡獎章名單
- ⚠ 總監委任書＿＿人數
- v26 已接優異旅團五個支部；其餘名單仲係「請參閱附件」

**司儀稿－莫榮大樓自助餐**
- 2026 同時存在 V1 同 V2 兩份，係「改完再改」嘅直接證據

## 獎項名單（6）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ● | **優異旅團獲獎名單** | GEN | screen+print | — | `tab:cer_award_merit`<br>`ceremony.meritRoster(188)` |
| ◐ | **支部獎勵名單** | GEN | screen+print | — | `tab:cer_award_section` |
| ◐ | **領袖獎勵名單** | GEN | screen+print | — | `tab:cer_award_leader`<br>`ceremony.adult_awards(6)` |
| ○ | **總監委任書名單** | GEN | print | — | `司儀稿第 8 頁 7 人表（職位／姓名／初步回覆／出席）` |
| ○ | **出席 UG 及派隊清單** | GEN | print | — | `doc:出席UG及派隊清單_2026_as at 20260929`<br>`ceremony.ug_units(3)`<br>`ceremony.ug_guests(8)` |
| ○ | **優異旅團證書及彩帶標籤** | GEN | print | 會操及典禮組 | `司儀稿原文：頒發「2026 年優異旅團彩帶及證書」—小童軍（證書）／幼童軍（彩帶）／童軍（彩帶）／深資童軍（彩帶）`<br>`ceremony.meritRoster(188)` |

**支部獎勵名單**
- ⚠ 總領袖獎章 46 位
- ⚠ 榮譽童軍獎章 8 位
- ⚠ 貝登堡獎章 3 位

**領袖獎勵名單**
- ⚠ 十年長期服務獎狀 7 位
- ⚠ 長期服務獎章 3 位
- ⚠ 一星 1 位
- ⚠ 三星 1 位
- ⚠ 每位嘅「初步回覆／出席」狀態

**總監委任書名單**
- ⚠ 成張表仲喺司儀稿入面，未入資料庫

**優異旅團證書及彩帶標籤**
- ⚠ 188 份，每份要印旅名。而家冇一份嘢列明邊個旅攞證書、邊個攞彩帶
- 旅名要用邊個寫法？證書應該印全寫，唔係司儀稿嗰個中文數字。

## 嘉賓（11）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ● | **嘉賓名單** | GEN | print | — | `doc:港島童軍繽紛日 2026－嘉賓名單 as at 02.10.2026`<br>`guest_roster.guests(102)`<br>`範本 01` |
| ● | **嘉賓報到點名** | SCR | screen | — | `guest_roster.guests.checked_in` |
| ● | **紀念章派發（嘉賓）** | SCR | screen | — | `tab:stamp_guest` |
| ○ | **嘉賓邀請函** | GEN | print | — | `doc:ISD2026 邀請函 (Invitation Letter) 04102026` |
| ○ | **邀請卡－會長** | GEN | print | — | `doc:ISD2026 邀請卡－會長 04102026` |
| ○ | **邀請卡－主禮嘉賓** | GEN | print | — | `doc:ISD2026 邀請卡－主禮嘉賓 (GoH) 04102026` |
| ○ | **嘉賓回條** | IN | print | — | `doc:ISD2026 回條 (IN reply) 04102026` |
| — | **警察學院地圖－嘉賓版** | DSGN | print | — | `doc:ISD2026 警察學院地圖－嘉賓版 V2` |
| ◐ | **嘉賓交通／大會車安排** | GEN | print | — | `guest_transport.guests(4)`<br>`guest_roster.guests.event_bus` |
| ○ | **嘉賓座位表及座位卡** | GEN | print | 嘉賓接待組 | `司儀稿原文：請各位就座／請到嘉賓席就座`<br>`guest_roster.guests(102) 有 ceremony_part_1／part_2 分場` |
| ○ | **嘉賓名牌** | GEN | print | 嘉賓接待組 | `guest_roster.guests(102)：name 同 title 兩欄齊` |

**嘉賓邀請函**
- ⚠ 逐位嘉賓 mail merge：稱謂／職銜／出席部分

**嘉賓回條**
- ⚠ 收返嚟之後點入返 guest_roster（2026 係人手入）

**嘉賓交通／大會車安排**
- ⚠ 大會車上落點同時間

**嘉賓座位表及座位卡**
- ⚠ ceremony.seating 呢個位 2026 完全冇資料
- ⚠ 第一部分同第二部分出席唔同人，座位要唔要換？
- 有 102 位嘉賓、有分兩場出席，但冇一張座位圖。2026 應該係現場夾。

**嘉賓名牌**
- ⚠ 102 個，印邊個稱謂？名單寫「區永樑先生」，司儀稿叫「區永樑助理處長」

## 旅團（參加者）（7）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ○ | **童軍旅通知書** | GEN | print | — | `doc:0.童軍旅通知書2026` |
| ○ | **共創明Teen 團體活動通知書** | GEN | print | — | `doc:0.共創明Teen計劃團體活動通知書2026` |
| ● | **旅團報名人數表** | GEN | print | — | `doc:旅團報名人數_2026 as 26.9.2026`<br>`participants(31)`<br>`範本 05` |
| ● | **旅團點名簽收** | SCR | screen | 行政組 | `tab:admin_troop_checkin`<br>`troop_checkin(31)` |
| ○ | **參加旅團節目程序（附錄1）** | GEN | print | — | `doc:附錄1_參加旅團節目程序_2026` |
| — | **參加旅團場地指示圖（附錄2）** | DSGN | print | — | `doc:附錄2_參加旅團場地指示圖2026 v2` |
| ○ | **報名表格 sp12a** | IN | print | 行政組 | `doc:報名表格 sp12a_26_isd2026_enrollform.pdf` |

**童軍旅通知書**
- ⚠ 逐個旅 mail merge：旅名／人數／餐盒／領隊／集合點

**報名表格 sp12a**
- ⚠ 2026 經 Google Form 收，再人手改；2027 要直接寫後端

## 工作人員（6）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ● | **籌委架構及聯絡表** | GEN | screen+print | 行政組 | `doc:ISD2026 Org Chart and Contact List（持續更新）`<br>`staff.contacts(80)`<br>`staff.org_chart(55)`<br>`範本 02` |
| ◐ | **工作人員編更** | GEN | print | 行政組 | `staff.event_staff_roster(279)` |
| ● | **紀念章派發（工作人員）** | GEN | screen+print | — | `tab:stamp_staff`<br>`souvenirs.staff_roster_2026(290)` |
| ● | **工作人員膳食點名** | GEN | screen+print | 協調組 | `tab:coord_meal_staff`<br>`staff_meals_2026(290)` |
| ○ | **職務分工表** | GEN | print | — | `staff.job_duties(11)` |
| ○ | **工作人員證** | GEN | print | 行政組 | `staff.event_staff_roster(279)`<br>`souvenirs.staff_roster_2026(290)` |

**籌委架構及聯絡表**
- ⚠ 空缺 15 位・有名無電話 2 位・示範號碼 11 個

**工作人員編更**
- ⚠ contact 欄 279 個全空
- ⚠ booth 欄寫「A1 Core」同攤位表「A01」對唔上（v24 已可夾返）

**紀念章派發（工作人員）**
- ⚠ 290 vs 編更 279，兩個數唔一樣

**工作人員證**
- ⚠ 279 定 290？兩份名單人數唔同，印證應該照邊份

## 攤位／節目（9）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ● | **攤位總表** | GEN | screen+print | 主題節目組 | `doc:ISD2026 攤位資料`<br>`tab:master`<br>`activities.booths(33)`<br>`範本 03` |
| ● | **攤位資料（Drive 版）** | GEN | file | 主題節目組 | `tab:drive` |
| ● | **借用統計及招牌** | GEN | screen+print | — | `tab:borrow` |
| — | **遊戲卡** | DSGN | print | — | `doc:Game card`<br>`activities.gameCards(2)` |
| — | **機電先鋒章海報（A2 五款）** | DSGN | print | — | `doc:積極公民獎章－機電先鋒章（Full Set）`<br>`doc:積極公民獎章－機電先鋒章 A2 100%`<br>`doc:積極公民獎章－機電先鋒：幼童軍支部 A2`<br>`doc:積極公民獎章－機電先鋒：童軍支部 A2`<br>`doc:積極公民獎章－機電先鋒：深資童軍支部 A2`<br>`doc:積極公民獎章－機電先鋒：樂行童軍支部 A2` |
| — | **家居電力安全手冊** | FIX | print | — | `doc:機電先鋒－家居電力安全手冊 (Cub Appendix)` |
| ○ | **主題節目組報告** | GEN | file | 主題節目組 | `doc:ISD2026 - 主題節目組報告 (20260616) Rev.1`<br>`doc:ISD2026 - 主題節目組報告 (20260818) Rev.1` |
| — | **上屆攤位資料（參考用）** | FIX | file | 主題節目組 | `doc:ISD2025 攤位資料（參考）` |
| ○ | **攤位桌牌／指示牌** | GEN | print | 主題節目組 | `activities.booths(33)：booth_no 加 booth_name 加 group_name` |

**攤位總表**
- ⚠ contact 欄 17/33 空白

**主題節目組報告**
- ⚠ 同一份嘢出咗兩個 Rev

**上屆攤位資料（參考用）**
- 唔係 2027 要出嘅嘢，係開會時攞嚟對嘅上屆底。列出嚟係因為佢佔住 documents 一格。

**攤位桌牌／指示牌**
- ⚠ 33 塊。牌上面寫「A01」定「A01 主節目組總部」？行政組編更寫緊「A1 Core」
- v24 已證實攤位編號兩組寫法零重疊，印牌之前要先夾返。

## 膳食（5）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ● | **代訂餐盒名單** | GEN | screen+print | 協調組 | `tab:coord_mealbox`<br>`participants.mealbox` |
| ● | **膳食批核** | SCR | screen | 協調組 | `tab:coord_meals`<br>`meals.orders(7)`<br>`meals.menus(3)` |
| ◐ | **膳食派發分配表** | GEN | print | 協調組 | `meal_distribution_2026.booths(30)`<br>`staff_groups(14)`<br>`others(3)` |
| — | **餐單** | FIX | print | 協調組 | `meal_menu_2026(9)` |
| ○ | **膳食運送安排** | GEN | print | 協調組 | `meal_logistics_2026(3)` |

**膳食派發分配表**
- ⚠ 攤位午膳加總 173 vs 攤位人手 193 vs 編更 279 vs 派章 290，四個數

## 場地／物流（10）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| — | **場地佈置圖 Site Setup Plan** | DSGN | print | — | `doc:ISD2026 Site Setup Plan R10-SETUP PLAN-1` |
| — | **場地地圖 MAP** | DSGN | print | 協調組 | `doc:MAP.gif（場地地圖）`<br>`activities.maps(1)` |
| — | **警察學院場地地圖** | DSGN | print | 秘書處 | `doc:香港警察學院場地地圖` |
| — | **帳篷資料** | FIX | print | — | `doc:261003_Scout_marquee` |
| ○ | **箱頭紙** | GEN | print | — | `doc:港島童軍繽紛日2026箱頭紙` |
| ● | **物資批核** | SCR | screen | 協調組 | `tab:coord_supplies` |
| ● | **失物認領** | SCR | screen | — | `tab:lost_found` |
| — | **場地佈置報價邀請** | FIX | file | 協調組 | `doc:ISD2026 Site setup Quotation Request` |
| — | **清潔服務報價邀請** | FIX | file | 協調組 | `doc:ISD2026 Cleaning Quotation request` |
| — | **警察學院實地視察程序** | FIX | file | — | `doc:警察學院實地視察 18.8.2026－內容及程序 2026` |

**箱頭紙**
- ⚠ 每個攤位／每個組印幾多張、印邊個名 —— 要由攤位表同編更推

## 車輛／泊車（4）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ○ | **泊車證申請表** | IN | file | 協調組 | `doc:港島童軍繽紛日2026－泊車證申請表格（Google Sheet）`<br>`parking_source.columns(12)` |
| ○ | **泊車證（實物）** | GEN | print | 協調組 | `parking_source` |
| ● | **車輛批核** | SCR | screen | 協調組 | `tab:coord_vehicle` |
| ● | **點車牌（閘口查冊）** | GEN | screen+print | 協調組 | `tab:coord_plate`<br>`v20 車牌三源` |

**泊車證（實物）**
- ⚠ 一人一張，要 mail merge 車牌同姓名

## 財務（8）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ○ | **財務預算 Budget** | GEN | file | 行政組 | `doc:ISD2026 Budget（Google Sheet）`<br>`finance.budget_source.columns(5)` |
| ● | **財務匯總（各部門）** | GEN | screen+print | 行政組 | `tab:admin_finance` |
| ● | **開支申報** | SCR | screen | — | `tab:group_expense` |
| ● | **口頭報價記錄** | GEN | screen+print | — | `tab:group_quotes`<br>`doc:附件3 - 口頭報價資料記錄` |
| ○ | **書面報價比較表（附件4）** | GEN | print | 行政組 | `doc:附件4 - 書面報價比較表` |
| ○ | **結算總表（附件5／5A／5B）** | GEN | print | 行政組 | `doc:附件5 - 結算總表 (WORD)`<br>`doc:附件5A - 結算總表 (WORD w autosum)`<br>`doc:附件5B - 結算總表 (EXCEL)` |
| — | **財務指引及會計程序** | FIX | screen+file | 行政組 | `doc:ISD2026 財務指引及會計程序 ver 1`<br>`tab:group_finance_guide` |
| — | **財務附件 1／2／6** | FIX | print | 行政組 | `doc:附件1 - 報價要求`<br>`doc:附件2 - 豁免商戶名單 (Rev Dec 2025)`<br>`doc:附件6 - 四格印簽名位置` |

**結算總表（附件5／5A／5B）**
- ⚠ 同一份嘢三個格式，2026 要人手對三次

## 通告／對外（9）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| — | **活動通告 sp12** | FIX | print | 行政組 | `doc:活動通告 sp12_26_isd2026.pdf` |
| — | **特別通告（6 份）** | FIX | print | — | `doc:特別通告第01/26號－地域總監嘉許計劃 2026`<br>`doc:特別通告第02/26號－區總監嘉許計劃 2026`<br>`doc:特別通告第03/26號－2026年優異旅團獎勵計劃`<br>`doc:特別通告第11/26號－2026/2027年度活動與訓練行事曆`<br>`doc:特別通告第15/26號－幼童軍及童軍積極公民獎章系列·機電先鋒章考驗`<br>`doc:特別通告第16/26號－深資童軍及樂行童軍積極公民獎章系列·機電先鋒章工作坊` |
| ○ | **籌委邀請函 M28（3 款）** | GEN | print | 秘書處 | `doc:籌委邀請函 M28 (Councils)`<br>`doc:籌委邀請函 M28 (District)`<br>`doc:籌委邀請函 M28 (DRCs)` |
| ○ | **籌委邀請回條 M28a** | IN | print | 秘書處 | `doc:籌委邀請回條 M28a` |
| ◐ | **食物捐贈通告＋表格** | GEN | print+screen | 秘書處 | `doc:食物捐贈通告 (FoodDonation)`<br>`食物捐贈表格 (FoodDonation_Form)`<br>`v19 童心捐贈 QR` |
| ◐ | **物資捐贈通告＋表格** | GEN | print+screen | 秘書處 | `doc:物資捐贈通告 (Goods Donating)`<br>`doc:物資捐贈表格 (Goods Donating_Form)` |
| — | **收受利益及申報政策** | FIX | print | 秘書處 | `doc:收受利益及申報政策 (pc132018c)`<br>`doc:收受利益及申報政策 (pc142018c)` |
| ● | **公眾頻道（活動日版）** | GEN | screen | — | `public_channel_2027`<br>`v15` |
| — | **品牌推廣組文件** | DSGN | file | — | `doc:20260818 品牌推廣組 (Google Doc)` |

**活動通告 sp12**
- ⚠ 內有日期／名額／費用／截止日，換年份要逐個改

**食物捐贈通告＋表格**
- ⚠ 紙本表同 QR 入數未對帳

**物資捐贈通告＋表格**
- ⚠ 紙本表收返嚟點入帳（食物捐贈有 v19 QR，物資捐贈仲係淨紙本）

## 會議／內部（17）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ○ | **籌委會議議程** | GEN | file | 秘書處 | `doc:4_Agenda 籌備委員會議程 (20260818)`<br>`meetings(6)` |
| ○ | **會議記錄** | GEN | file | 秘書處 | `doc:App1-ISD2026-籌備委員會第3次會議記錄 Ver1` |
| ○ | **工作計劃及進度** | GEN | file | 秘書處 | `doc:工作計劃及進度 V2.docx` |
| ◐ | **日程表 Run Down（全日）** | GEN | print | 秘書處 | `doc:ISD2026 日程表 (Run Down)`<br>`schedule(6)` |
| ○ | **危機處理小組名單及程序** | GEN | print | — | `crisis.team(14)`<br>`crisis.contacts(13)`<br>`crisis.docs(13)` |
| ○ | **共創明Teen NGO 聯絡表** | GEN | print | — | `doc:ISD 2026 共創明Teen NGO contact list` |
| ○ | **Wish List** | GEN | file | — | `doc:Wish List 2026` |
| ○ | **活動資料表 0.updated_12S** | GEN | file | — | `doc:0.updated_12S` |
| ● | **票券** | SCR | screen | 行政組 | `tab:admin_tickets` |
| ● | **行政文件夾** | SCR | screen | 行政組 | `tab:admin_docs` |
| ● | **場地佈置及文件夾** | SCR | screen | 協調組 | `tab:coord_docs` |
| ● | **連結總表** | SCR | screen | — | `tab:group_links`<br>`v22 74 links／121 targets` |
| ● | **跨組對帳** | SCR | screen | — | `tab:group_crosscheck`<br>`v24` |
| ● | **參加旅團（行政組視圖）** | SCR | screen | 行政組 | `tab:admin_participants` |
| ● | **活司儀稿（位置本身）** | SCR | screen | 會操及典禮組 | `tab:cer_live_script`<br>`v26` |
| ● | **公眾頻道內容（本組負責）** | SCR | screen | — | `tab:group_pc_content`<br>`v21` |
| ● | **本組申請** | SCR | screen | — | `tab:apps` |

**日程表 Run Down（全日）**
- ⚠ schedule 得 6 行，2026 份 Run Down PDF 實際內容多過呢 6 行

**活動資料表 0.updated_12S**
- ⚠ 未知內容，要開返個檔先知

**連結總表**
- ⚠ 48/74 條 link id 含年份，應改槽位制

**參加旅團（行政組視圖）**
- 同 o-troop-count 同一份資料，兩個地方睇 —— 要留意係咪真係要兩個入口。

**活司儀稿（位置本身）**
- 呢個係 o-mc-merit 嗰份稿嘅「指定位置」，唔係另一份輸出。

## 點算時補返嘅（1）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| — | **場地報價 WFQ** | FIX | file | — | `doc:WFQ26070315 香港童軍總會港島地域 4-10 (報價)` |

## 未分類（8）

| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |
|---|---|---|---|---|---|
| ○ | **協助單位感謝狀** | GEN | print | 會操及典禮組 | `司儀稿原文：有請地域主席李傑之先生為我哋致送感謝狀比協助機構 1. 香港警察學院 2. 香港聖約翰救傷隊` |
| ○ | **支部最高獎章嘉許信** | GEN | print | 會操及典禮組 | `司儀稿原文：頒發「支部最高獎章嘉許信」`<br>`總領袖獎章 46 位／榮譽童軍獎章 8 位／貝登堡獎章 3 位` |
| ○ | **長期服務獎狀及獎章證書** | GEN | print | 會操及典禮組 | `司儀稿原文：十年長期服務獎狀 7 位／長期服務獎章 3 位／一星 1 位／三星 1 位` |
| ○ | **對講機／通訊分配表** | GEN | print | 協調組 | `staff.contacts(80) 有 group_name 同 role_title`<br>`crisis.contacts(13)` |
| ○ | **意外／急救記錄表** | IN | print | — | `司儀稿原文：提供急救服務的香港聖約翰救傷隊`<br>`crisis.docs(13)` |
| ○ | **惡劣天氣／改期公布** | GEN | screen+print | — | `2026 原文：延期日 2026-10-11` |
| ● | **輸出總表（呢份清單本身）** | SCR | screen | — | `tab:group_outputs`<br>`tools/schema/outputs_2027.js` |
| ○ | **活動後總結報告** | GEN | file | 秘書處 | `doc:工作計劃及進度 V2.docx`<br>`meetings(6)` |

**協助單位感謝狀**
- ⚠ 協助單位名單冇獨立存喺任何地方，淨係寫死喺司儀稿入面

**支部最高獎章嘉許信**
- ⚠ 57 封，逐封印人名。名單本身都未入系統（見 o-section-award）

**長期服務獎狀及獎章證書**
- ⚠ 12 份，連「初步回覆／出席」狀態都仲喺司儀稿張表入面

**對講機／通訊分配表**
- ⚠ 2026 冇呢份嘢，但危機小組 14 人同 10 個組之間一定要通到話

**意外／急救記錄表**
- ⚠ 有救傷隊駐場但冇記錄表

**惡劣天氣／改期公布**
- ⚠ 已經定咗延期日，但冇一個位可以一撳就全站改期
- 呢個係「一處更新全站同步」最極端嘅測試：改期要同時改通告、公眾頻道、通知書、司儀稿、所有日期。

**輸出總表（呢份清單本身）**
- 第 1 步嘅成果本身都係一件輸出 —— 下屆要知「有乜要出」就睇呢度。

**活動後總結報告**
- ⚠ 2026 冇，但下屆要接手就一定要有

---

## 清單本身揭到嘅問題

呢幾樣唔屬於任何一件輸出，係 2026 份清單自己嘅毛病：

### ✖ documents 有 3 組重覆 id

doc_36／doc_38／doc_40 各自畀兩份唔同文件用咗。特別通告嗰三份同嘉賓邀請嗰三份撞晒。

→ 2027 唔可以再用遞增號做 id，要用槽位名。

### ✖ 14/79 份標題入面寫住版本號

V1 V2 V4 V5 Ver1 Rev.1 —— 司儀稿去到 V5，會議記錄 Ver1，主題節目組報告兩個 Rev。

→ 版本號寫喺標題＝冇單一最新版。用戶病因「改完再改再改」喺呢度肉眼可見。

### ✖ 同一份嘢同時存在兩個版本

3_司儀稿_莫榮大樓自助餐 2026 V1 同 V2 兩份都喺清單入面。

→ 邊份先係最新？清單答唔到。

### ✖ 79 份入面 48 份冇寫邊組出

uploaded_by 只有 31/79 有值（行政組 13・秘書處 13・協調組 3・主題節目組 2）。

→ 「呢格幾時更新過」答唔到，因為連「邊個負責」都冇記。

### ✖ 結算總表同一份嘢出三個格式

附件5 WORD／附件5A WORD w autosum／附件5B EXCEL。

→ 鐵律一「一格資料只准喺一個範本出現」嘅反例。

---

● 已接　◐ 接一半　○ 未接　— 唔使接

