# 2026 一次性資料遷移：3 分鐘操作指引

目的：把 `data/isd_2026.json`（103 位嘉賓、frozen 工作人員名單、31 個攤位、4 個受邀隊伍、2026 日程、工作人員膳食）
寫入**2026** Google Sheet，前端再由 Google Sheet 讀回。**只寫 2026，永不寫 2027。**

---

## 第 1 步：更新並重新部署 Apps Script（約 2 分鐘，只做一次）

1. 開啟 2026 的 Google Sheet → 擴充功能 → Apps Script。
2. 用本專案 `apps-script/Code.gs` 的**全文**覆蓋編輯器內容（版本 `v15.0-2026-10-02`）。
3. 執行一次 `initializeSheets`（選單揀 `initializeSheets` → 執行）。
   會新增兩張資料分頁：`Guests`、`Staff_Meals`，並為 `Staff`／`Schedule`／`Activities` 於最右補欄（非破壞性，不動既有資料）。
4. 部署 → 管理部署 → 編輯（鉛筆）→ 版本「新增版本」→ 部署。
   **網址不變**，前端毋須改設定。

確認成功：瀏覽器開
`<GAS 網址>?action=getEvents` → `version` 應該係 `v15.0-2026-10-02`。

---

## 第 2 步：執行遷移（二選一）

### A. 在 APP 內按鈕（推薦，手機／電腦都得）

以**主席／顧問／管理員**登入 2026 活動 →
`執行手冊` → `2026 資料` → 按 **「一次性寫入 2026 資料至 Google Sheet」**。

畫面會顯示每批進度，完成後顯示：新增 / 更新 / 相同略過 的行數。

### B. 指令（有 Node 的電腦）

```bash
npm run import:2026:dry   # 只檢查映射，不寫入
npm run import:2026       # 真正寫入
```

可用環境變數覆寫：`ISD2026_GAS_URL`、`ISD2026_APIKEY`。

---

## 第 3 步：驗收（1 分鐘）

1. 同一頁按 **「查詢 Google Sheet 狀態」**：
   `Guests 103`、`Activities 31`、`Roster_Lists 4`、`Schedule`、`Staff`、`Staff_Meals` 應有行數，
   並顯示 `Audit_Log` 行數及最後一次遷移時間。
2. 按 **「由 Google Sheet 取回資料」**：頁面上方會變成「資料來源：Google Sheet（最後下載 …）」。
3. 開 Google Sheet 睇 `Audit_Log` 分頁：應見 `import2026:create`、`import2026:summary`、`import2026:run`。

---

## 重要行為

| 項目 | 行為 |
|---|---|
| 重複執行 | 同 ID 更新、冇就新增、內容相同就跳過——**唔會重複寫入** |
| 現場紀錄 | 重跑遷移**唔會**清走 `checked_in`／`ticked`／`tick_json`（現場點名保留） |
| 2027 保護 | `event_id` 唔係 `isd_2026`，或試算表係 2027 表 → 後端直接拒絕 |
| Audit_Log | 每行寫入（create／update）＋每張分頁匯總＋每次執行，全部留痕 |
| 舊後端 | 若未完成第 1 步，APP 會自動改用 `saveBatchRecords` 寫既有分頁，並明確提示 `Guests`／`Staff_Meals` 未寫入 |

## 2026 使用規則（已在 APP 內強制）

- **嘉賓**：只可點名及加名；正式名單行唔會有「✏️／🗑️」，只顯示「正式名單・只可點名」。
  加名用「加名（新增嘉賓）」掣。點名會寫入 `Roster_Rollcall_Checkins`（list_key=`guests`）→ 有 Audit_Log。
  點名權限：嘉賓接待組／行政組／典禮負責組／副主席以上。
- **工作人員**：可點名、換人、更正姓名、記錄替補——沿用「紀念章派發（工作人員）」既有流程（可改名＋備註）。
- **外間團體**：沒有預定姓名就留空；「參加旅團名單」每行多咗「實際到場人士」欄，報到時填寫，
  內容寫入該次點名紀錄的 `checkin_note`。

## 測試

```bash
npm run check   # 靜態檢查
npm test        # 全部 27 個測試（含遷移、角色驗收）
```
