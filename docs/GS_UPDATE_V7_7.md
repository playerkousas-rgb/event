# ⚠️ 後端 GS 需要更新（v7.7）

**要唔要更新 GS？→ 要。** 而家 v7.7 把物資／車輛通行證／膳食全部集中喺「協調組」處理，但舊版 GS 有兩個問題會令資料**存唔到試算表**（只留喺自己部機）：

| 問題 | 影響 | v7.7 已修正 |
| --- | --- | --- |
| 冇 `Vehicle_Passes` 工作表 | 車輛通行證／泊車申請寫出後端時被丟棄（`Module sheet not found`），換部機／換人就見唔到 | 新增 `Vehicle_Passes` 表，並在 `getEventData` 一併回傳 |
| `Supply_Requests` 欄位不足 | 批核數量、需用日期、用途、聯絡、批核人時間等**全部寫唔入**試算表 | 非破壞性補欄（只喺最右加，唔會郁舊資料） |
| `Meals` 欄位不足 | 菜單的選項／截止／鎖定存唔到後端 | 非破壞性補欄 |

前端亦已配合加入 **跨裝置回讀**：正式活動載入時會由 GAS 一次過拉返 `Meal_Orders`、`Supply_Requests`、`Vehicle_Passes`、`Parking_Requests`，協調組喺自己部機都睇到其他組提交嘅申請同批核狀態。

---

## 更新步驟（約 3 分鐘，唔會影響現有資料）

1. 喺 Git 開啟 **`apps-script/Code.gs`**（最新 main），**全文複製**。
2. 打開你嘅 Google 試算表 → **擴充功能 (Extensions) → Apps Script**。
3. 將編輯器內舊有 `Code.gs` 內容 **全選刪除**，貼上新版本 → **儲存**。
4. 上方函數選單揀 **`initializeSheets`** → 撳 **執行 (Run)**（如彈授權，照樣授權）。
   - 只會：新增 `Vehicle_Passes` 表 + 喺 `Supply_Requests` / `Meals` 最右加欄。
   - **絕不會**刪除或覆蓋任何現有工作表同資料。
5. **重新部署**：右上 **部署 (Deploy) → 管理部署 (Manage deployments)** → 選現有網頁應用程式 → 鉛筆 ✏️ → 版本揀 **新版本 (New version)** → 說明填 `v7.7` → **部署**。
   - 用「管理部署 → 新版本」就會**保留同一條 URL**，前端／Vercel 環境變數唔使改。
   - 如果係「新增部署」會產生新 URL，就要把新 URL 更新到 Vercel 環境變數 `GAS_URL`。

## 更新後點檢查

- Google 試算表底部應見到新 tab：**`Vehicle_Passes`**。
- `Supply_Requests` 標題列最右多咗：`unit, qty_approved, reason, date_needed, deadline, contact, requested_by_id, approved_at, notes`。
- `Meals` 標題列最右多咗：`options, price, deadline, locked, created_by`。
- 喺 APP 用正式活動（非「模擬示範版」）提交一張車輛通行證申請 → 試算表 `Vehicle_Passes` 應即刻多一行。
- 另一部機／另一個帳戶登入 → 協調組 → 車輛通行證，應該見到同一張申請。

## 唔更新會點？

APP 唔會壞，所有嘢照用，但物資批核詳情／車輛通行證只會存喺**提交嗰部機**嘅瀏覽器，做唔到跨裝置共用同備份。
