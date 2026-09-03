# v12.3 → v13.0 更新說明（2026-09-03）

用戶實測回報 8 項，一次完成。回歸測試：**新增** `tests/v13_dept_center_finance_test.js`（90 項）＋全套 21 個測試檔（17 PASS／4 個為 v13 之前已存在嘅既有失敗：`ui_layout_check`／`v8_13`② 公開卡標籤、`v84`④ 舊攤位字眼、`v11_exec_manual`⑤ 舊紀念章字眼——全部係 v12.1／v12.2 改字前嘅過期預期，唔屬今次改動）。

---

## ① 部門中心：統計放最頂（可摺疊）

全部 10 組部門頁面頂部 banner 之下**第一格**就係「📊 本組統計」（原「本組申請統計」），改為可摺疊區塊：

- 預設**展開**（`app.groupStatsOpen`），點標題列或右側「收合／展開」即時切換（`groupStatsSectionHTML`／`toggleGroupStatsSection`），收藏狀態同一次登入內保持。
- 統計卡數字即時反映：攞數據範圍由「全部申請」收窄到「**只計本組**」（物資、攤位、車輛、膳食、人數、開支申報），數字後加「（本組）」。
- 標題列右邊保留「🖨️ 列印」快速鍵（`group-print-{組別}`）。

## ② 4 格資訊合併為一個整體、可摺疊

「👥 本組崗位／成員、📋 職務大綱、📁 本組文件、🎪 攤位・預算」4 格合併為「🏢 本組資訊」一個整體區塊：

- 每格標題列獨立開合（`gib-body-{members|duties|docs|booths}`），**預設全部收合**（`groupInfoOpenState`），淨係睇標題同摘要數字（如「👥 本組崗位／成員（10）」）。
- 區塊右上角「**一鍵全展開**／**一鍵全收合**」按鈕（`toggleGroupInfoAll`），按鈕文字隨狀態切換。
- 攤位／預算格同時顯示攤位申請數＋**預算數字**（千分位）。

## ③ 部門頁籤新增 3 個財務頁籤（全部 10 組通用）

每個部門中心嘅頁籤列（本組申請、本組攤位、本組名單之後）新增：

- **💰 開支申報**（`group_expense`）：本組開支申報表＋**🧾 開支申報**按鈕，撳落去彈出申報表單，**組別自動帶入本組**（`openExpenseForm(null,'本組')`），提交後自動寫入財務紀錄（`fin.expenses`），即時喺本頁顯示，唔使再行去財務頁開表。
- **🗣️ 口頭報價**（`group_quotes`）：本組口頭報價紀錄＋**🗣️ 登記口頭報價**按鈕，組別同樣自動帶入（`openOralQuoteForm(null,'本組')`；組名唔喺標準組別都照顯示）。
- **📖 財務須知**（`group_finance_guide`）：指引・預算・開支申報・口頭報價・結算流程一頁睇晒，唔使周圍搵。

呢 3 個頁籤同時出現喺**全部 10 組**（主題節目組、行政組、協調組、顧問團⋯⋯），令各部門自己開支自己報。

## ④ 財務模組「新增」掣移除（財務頁專用）

財務頁（`openModule('finance')`）頂部嘅通用「➕ 新增」掣已移除——財務嘢全部喺下方分頁（開支申報／口頭報價／結算）處理，唔會再撳錯。其餘模組（如公告）嘅通用新增掣**保留**（訪客／未登入顯示規則唔變）。

## ⑤ 協調組「場地佈置及文件」重整＋真正可上傳

- 頂部 3 張**固定卡片**：🗺️ 場地佈置圖（**真正可上傳**：檔案或連結，撳卡片可開啟；協調組總主任以上／管理層先可上傳，其餘人睇到但唔可改）、📦 箱頭紙（已預設齊全：英女皇徑入口直入、正門入口向東、變壓站側門側門側門、臨時指揮中心——唔再重複設定）、📋 物資借用表格（已預設齊全，一掣去物資申請紀錄）。
- 下方「其他文件」格：任何協調文件都可上傳（**檔案或連結**，必須其一；「場地佈置」「數據紀錄」「工程」分類）。
- 舊版只可以手打文字嘅「新增協調文件」已升級：必須上傳檔案**或**填連結（`submitCoordinatorDocForm` 驗證，只打文字會被拒絕），檔案支援下載（`downloadCoordinatorDocFile`）。
- 場地佈置圖上傳表單（`openCoordinatorVenueForm`）：檔案／連結二選一，無檔案無連結會被拒絕；新圖會即刻喺協調組文件頁同各部門中心顯示。

## ⑥ 行政組（管理層）「財務匯總（各部門）」頁籤

行政組部門中心頁籤列新增 **💰 財務匯總（各部門）**（`admin_finance`）：

- 每組一張卡：申報總數、⏳待批、✅已批、❌已拒、待批金額、已批金額（千分位）。
- 下方待批清單：一掣 **✅ 批**／**❌ 拒**（`approveExpense`／`rejectExpense`），批完即時刷新，並保留喺部門頁睇到結果。
- 管理層唔使再入財務頁逐筆搵——匯總頁一頁睇晒各部門財政狀態。

## ⑦ 上傳檔案或連結：所有「文件上傳」必須其一

`submitDocumentForm`（各部門文件）：描述文字唔可以代替檔案——必須上傳檔案**或**填連結，否則 toast「請上傳檔案或填寫連結，唔可以只填文字描述」。協調組文件、管理層行政文件、場地佈置圖表單同樣規則。

## ⑧ 行政文件（管理層）可上傳檔案／連結

行政組「行政文件」頁籤（`admin_docs`）由只有連結改為**檔案或連結都得**：

- 上傳後每份文件有「📄 開啟連結」（有連結）或「📥 下載」（有檔案，`downloadAdminDocFile`）按鈕。
- 新增／編輯表單（`openAdminDocForm`／`submitAdminDocForm`）必須檔案或連結其一，只打文字會被拒絕。

---

## 統計卡新增「開支申報」

部門中心統計卡（①）新增第 6 格「💰 開支申報」：顯示本組申報總數＋⏳待批／✅已批／❌已拒三色狀態數字（`groupApplyStats` 新增 `expTotal`／`expPending`／`expApproved`／`expRejected`／`expPendingAmt`／`expApprovedAmt`）。各部門喺自己頁面開表提交，統計即刻跳，管理層喺「財務匯總」見到並批核。

## 涉及檔案

- `js/10-app-core.js` — 部門中心重排（統計最頂＋摺疊、4 格合併＋摺疊）、groupCommonTabs（3 個財務頁籤容器）、switchGroupTab 新鍵、openModule 財務分支（移除通用新增）、groupApplyStats 開支欄位＋防禦性預設值。
- `js/30-finance.js` — `refreshFinanceViews`（提交／批／拒／刪／批次批後所有開緊嘅財務視圖即時刷新）、`openExpenseForm` 支援預設組別、`renderGroupExpenseTabHTML`、`renderGroupFinanceGuideTabHTML`。
- `js/28-oral-quotes.js` — `refreshOralQuoteViews`、`renderGroupQuotesTabHTML`、`openOralQuoteForm` 支援預設組別。
- `js/37-coordinator.js` — `renderCoordDocs` 重整（3 固定卡＋其他文件格）、場地佈置圖上傳（`openCoordinatorVenueForm`／`submitCoordinatorVenueForm`／`downloadCoordinatorVenueMap`）、協調文件表單升級（檔案／連結必填其一、`downloadCoordinatorDocFile`）、`refreshCoordinatorDocViews`。
- `js/36-crisis.js` — 協調組示範資料（場地圖／箱頭紙／物資借用表格／2 份文件）、`renderAdminFinanceTabHTML` 匯總頁、管理層行政文件表單升級（`openAdminDocForm`／`submitAdminDocForm`／`downloadAdminDocFile`）。
- `js/21-activities.js` — `submitDocumentForm` 檔案或連結必填其一。
- `tests/v13_dept_center_finance_test.js` — **新增**，90 項：① 統計最頂＋摺疊 ② 4 格預設收合＋一鍵全展開 ③ 3 財務頁籤×4 組 ④ 財務頁無通用新增 ⑤ 口頭報價自動帶組 ⑥ 開支申報自動入紀錄＋統計跳數＋匯總可見＋批核即時刷新 ⑦⑧ 檔案或連結必填其一（協調文件／場地圖／行政文件）＋下載掣。
