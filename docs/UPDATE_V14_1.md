# v14.1（2026-09-05）名單工具列白字修正・刪 format_note・全站取消 CSV（只餘 Excel／Word／PDF）・失物尋回率報告

> 用戶六點跟進（原文摘要）：
> ① 上次改嘅名單表格係咪可以俾部門好似「紀念章」咁點名？
> ② 「新增一行／下載格式範本 CSV／匯出 CSV／列印點名表／上傳附件／同步名單至後端／由後端取回」呢行有三粒掣白底白字、完全睇唔到（優異旅團／支部獎勵／領袖獎勵／代訂餐盒四張都係）。
> ③ 代訂餐盒旅團名單面板刪走成段「預設欄位格式（只係呢四張名單用）；未符可改本檔 ROSTER_LIST_DEFS…」。
> ④ 失物認領：物品搵返／交還後可以標記，但唔好刪紀錄；之後要睇到當日失咗乜、物主係邊個、尋回率，最後可以匯出報告。
> ⑤ 全系統唔要 CSV 匯出（普通用戶開唔到）——只可以 PDF（網頁直接列印）、Word 或 Excel。
> ⑥ 亦唔要 CSV 匯入。

---

## ① 名單可以俾部門點名（同紀念章一樣）——本來已可以，今次只係確認＋修正按鈕

| 功能 | 名單引擎（四張執行手冊名單＋優異旅團） | 紀念章派發 |
|---|---|---|
| 逐行 TICK | ✅ `rosterTick`（每行一個 checkbox，即時存 localStorage＋後端 `Roster_Rollcall_Checkins`） | ✅ 逐人 TICK，要按 💾 先寫後端 |
| 邊個可以點 | 負責組別（典禮組／行政組／協調組）登入成員＋管理層（`rosterCanTick`） | 行政組／嘉賓接待組＋管理層 |
| 取消 TICK | ~~必須填「更正原因」（prompt）~~ → **v14.2 起同紀念章一樣：「修正」checkbox**（見 `UPDATE_V14_2.md`） | 「修正」checkbox |
| 分組確認 | ✅ 按區會／支部／獎項分組進度 chip → `rosterConfirmGroup` 整組確認 → 後端 `Roster_Rollcall_Batches` | 冇 |
| 全選 | 「全選本欄」 | 冇 |
| 排序 | 按區會／支部／旅團／姓名／未點名優先 | 點表頭排序 |
| 匯出／列印 | **Excel／Word／列印(PDF)**（v14.1） | **Excel／Word／列印(PDF)**（v14.1） |

結論：五張名單（支部獎勵、領袖獎勵、參加旅團、代訂餐盒、優異旅團）都可以由負責部門當日直接喺手機／電腦 TICK 點名，唔使再靠紙。

## ② 白底白字根因（已修正，並用真 Chromium 驗證）

- 根因：`js/41-roster-lists.js` 工具列嘅上傳 `<label class="… text-white">` 內 `<input … onchange="app.rosterImportFile(…);this.value=''>` **漏咗收尾雙引號**，瀏覽器將後面成串 HTML 當成 `onchange` 屬性值，直至下一個 `"` 先停——結果「貼上文字」「下載格式範本」「匯出」等按鈕全部被吞入 `text-white` 嘅 label 入面，`bg-white` ＋ 繼承 `text-white` ＝ 白底白字。
- 修正：補回引號；淺色按鈕統一用 `bg-white border border-slate-300 text-slate-700`（就算日後再被包住都唔會變白字）；`index.html` 補回編譯版 tailwind 欠缺嘅 `.bg-white/70 .text-amber-300 .accent-emerald-600 .overflow-auto .max-h-[280px] .min-w-[140px] .select-none .md:grid-cols-5` 等工具類。
- 驗證：headless Chromium 逐個位置（協調組代訂餐盒、典禮組三張獎勵名單、執行手冊代訂餐盒、行政組參加旅團）計算樣式：工具列直接子元素由 1 個變 8 個，`invisible(bg===fg)` 全部 0。
- 測試：`tests/v14_roster_lists_test.js` A16c／B5d、`tests/v14_1_no_csv_lost_found_test.js` A12／A13／B4f。

## ③ `format_note` 已全部刪除

- `js/00-config.js`：`ROSTER_LIST_DEFS` 四張 ＋ `MERIT_AWARD_ROSTER_DEF` 嘅 `format_note` 屬性刪除；`js/41-roster-lists.js` 面板唔再渲染該段。面板仍保留「位置：…｜格式（N 欄）：…＋TICK」一行俾用家知道欄位。

## ④ 失物認領：紀錄唔會刪 ＋ 尋回率 ＋ 按日摘要 ＋ 報告

- 本來就係咁：「確認認領／確認尋回」只改 `status`（已認領／已尋回）＋自動記 `claimed_at`／`claimed_by`／`closed_by`；只有 🗑️ 先會刪。「↩ 取消完成」亦只改狀態。
- v14.1 新增：
  - 統計格加 **尋回率**（已認領＋已尋回 ÷ 全部登記，`lostFoundStats`）。
  - **按日摘要**表（`lostFoundDaily`／`lostFoundDailyHTML`）：每日登記數、失物／尋物、已完成、待處理、當日尋回率、「物品 → 物主／領回人」清單——事後一眼睇到當日失咗乜、物主係邊個。
  - **匯出報告 Excel**（兩張工作表：按日摘要（尋回率）＋全部紀錄）／**匯出報告 Word**（標題＋尋回率摘要＋兩張表）／**列印／PDF**（列印區包含按日摘要）。
- 測試：`tests/v14_1_no_csv_lost_found_test.js` B5–B5g。

## ⑤⑥ 全站取消 CSV：匯出只有 Excel／Word／PDF，匯入只收 Excel（＋JSON 技術備份）

### 共用工具（`js/00-config.js`）
| 函數 | 用途 |
|---|---|
| `downloadExcel(fileName, rows, {sheet, sheets})` | 二維陣列 → `.xlsx`（SheetJS `aoa_to_sheet`＋`writeFile`，自動欄寬，可多工作表）；SheetJS 未載入時退到 HTML 版 `.xls` |
| `downloadWord(fileName, title, bodyHtml, {meta, landscape})` | HTML → `.doc`（`application/msword`，Word／WPS／Pages 直接開；含 @page 直／橫向） |
| `rowsToHtmlTable(rows)` | 二維陣列 → `<table>`（Word／列印共用） |
| `downloadBlob(fileName, blob)` | 通用下載 |
| `readTabularFile(file)` | 讀用戶上傳：`.xlsx/.xls/.xlsm` → 物件陣列（第一行表頭，同舊 `parseCSV` 輸出一致）；`.json` 原樣；**`.csv` 會 throw「系統已不接受 CSV：請用 Excel 開啟後另存為 .xlsx」** |
| `app.exportTableExcel / exportTableWord / downloadCSV` (37) | `downloadCSV` 舊名保留：所有舊呼叫自動變 Excel（`.csv` 檔名改 `.xlsx`） |

`splitCSVLines`／`parseCSV` 只餘內部用途：Google 試算表 `export?format=csv` 同步（`fetchDriveSheetRows`）及內建 `data/committee_accounts.csv`——機器對機器，用戶唔會接觸。

### 逐個模組
| 模組 | 匯出（舊 → 新） | 匯入（舊 → 新） |
|---|---|---|
| 41 名單引擎（五張名單） | 下載格式範本 CSV → **下載 Excel 範本**；匯出 CSV → **匯出 Excel ＋ 匯出 Word**；列印 → **列印／PDF** | accept 去 `.csv`；`.csv` 上傳會提示 |
| 39 失物認領 | 匯出 CSV → **匯出報告 Excel／Word**＋列印／PDF | （本來只收 Excel） |
| 40 紀念章派發 | 匯出派發紀錄 CSV → **Excel ＋ Word** | （本來只收 Excel） |
| 24／26／10 攤位總表 | 匯出總表 CSV → **匯出總表 Excel ＋ Word**（`boothMasterGrid` 共用） | 物資「上傳CSV批量」→ **上傳 Excel 批量**（`readTabularFile`） |
| 37 協調組最終清單（物資／車輛／膳食） | 匯出最終清單 → **Excel**（預設）＋ **Word** 掣 | — |
| 38 童心捐贈 | 匯出 CSV／物品 CSV／食品 CSV → **Excel**；另加 **Word** | — |
| 20／33／index 批量開戶 | 下載範本 CSV → **下載 Excel 範本**（`downloadUsersTemplate` 出 `.xlsx`） | 上傳已填 CSV → **上傳已填 Excel**；批量開戶彈窗加「上傳已填 Excel」（`handleBulkModalExcel`） |
| 21 活動（攤位／地圖／遊戲卡／文件／日程／參加旅團範本） | 全部範本 → **Excel** | `handleActivityFileUpload`／`handleParticipantsUploadFile` `.csv` → 提示 |
| 23 膳食 | — | 上傳CSV批量 → **上傳 Excel 批量** |
| 25 車輛 | 範本 → Excel | 上傳CSV批量 → **上傳 Excel 批量** |
| 30 財務 | 申報範本 → Excel | 上傳 CSV 批量申報 → **上傳 Excel 批量申報** |
| 31 工作人員（名單／架構／職務） | 三個範本 → Excel（職務多行內容用儲存格內換行） | 上傳 CSV/JSON → **上傳 Excel／JSON** |
| 35 典禮 | — | accept 去 `.csv` |
| 36 行政組參加旅團 | 下載欄位範本 CSV → 下載 Excel 範本 | accept 去 `.csv` |
| `data/*_template.csv` | 全部轉成 `data/*_template.xlsx`（內容不變） | — |

舊函數名（`rosterExportCSV`／`exportBoothCSV`／`exportLostFoundCSV`／`exportSouvenirStampsCSV`／`exportDonationsCSV`／`exportCoord*CSV`／`handleAccBulkCSV`／`downloadCSV`）全部保留為 Excel 別名，避免任何漏改嘅 onclick 出錯。

### PDF 點樣出？
所有「列印／PDF」掣都係既有 `printCoordArea`：開新視窗 → 瀏覽器列印對話框 → 目的地揀「另存為 PDF」即可，手機 Safari／Chrome 同樣支援，唔使外掛。

---

## 測試
- 新增 `tests/v14_1_no_csv_lost_found_test.js`（108 checks）：全站源碼冇 `text/csv`／冇 `.csv` accept／冇 CSV 按鈕字樣；`downloadExcel`／`downloadWord`／`readTabularFile` 行為；名單 TICK → Excel／Word 帶狀態；工具列 label 結構；失物認領保留紀錄／尋回率／按日摘要／報告。
- 更新 `tests/v14_roster_lists_test.js`（A16／A16b／A16c／A20／B5–B5d／B20e／B30–B31b）、`tests/v87_booth_plan_master_test.js`（③b）。
- 全套 24 個測試：20 pass；4 個失敗係 v14.0 之前已存在、與本次無關（`ui_layout_check`、`v11_exec_manual_activities_extras ⑤`、`v84_group_cards_back_budget ④`、`v8_13_guest_login ②`）。
- 真瀏覽器（headless Chromium）驗證：五個名單位置工具列全部可見；由 UI 實際下載 `.xlsx`（SheetJS 讀返：代訂餐盒 13 欄含「派發」狀態；失物報告兩張工作表）及 `.doc`（含標題、meta、表格）成功。

## 改動檔案
`index.html`（CSV 字樣、彈窗 Excel 上傳、工具類、`?v=20260905d`）、`js/00-config.js`、`js/10-app-core.js`、`js/20-accounts.js`、`js/21-activities.js`、`js/23-sync.js`、`js/24-supplies.js`、`js/25-vehicle.js`、`js/26-monitor-apply.js`、`js/30-finance.js`、`js/31-staff.js`、`js/33-users.js`、`js/35-ceremony.js`、`js/36-crisis.js`、`js/37-coordinator.js`、`js/38-donations.js`、`js/39-lost-found.js`、`js/40-souvenir-stamps.js`、`js/41-roster-lists.js`、`data/*_template.xlsx`（取代 `.csv`）、`docs/BULK_ONBOARD.md`、`docs/FEATURE_GUIDE.md`、`docs/STAFF_CARD_UPGRADE.md`、`assets/batch-onboard/Code.gs`、`tests/*`。Apps Script（`apps-script/Code.gs`）無改動。
