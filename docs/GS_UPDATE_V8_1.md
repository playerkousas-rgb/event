# 後端 GS 更新 v8.1（請從 Git 下載）

本工作階段**不能直接推 `main`**。請把 PR 合進 `main` 後，再從 Git 複製最新 `apps-script/Code.gs`。

檔案位置：[`apps-script/Code.gs`](../apps-script/Code.gs)

## 這次 GS 改了什麼

- 後端專管帳號 `group_name` 改為「系統」，不再寫成行政組；舊表執行 `initializeSheets` 會自動修正。
- `seedCommitteeAccounts()`：把籌委名單補進 `Users`（**只加沒有的人，不覆蓋現有列**）。
- 會議種子仍在 `seedInitialData()`（第 0–4 次籌備會議）。
- `getAllUsers` 給前端顯示預設密碼 `1234`（已改過的顯示「已改密碼」）。
- 新 action：`updateUser`、`saveUsers`（對應 APP「確定更新用戶」才寫入）。
- 批核路由仍用現有 `saveApprovalRouting`；APP 必須按「確定更新批核表」才呼叫。

## 你要做的步驟（約 3 分鐘）

1. 等 PR 合進 **main**，或直接用這個分支的檔：
   - GitHub：`apps-script/Code.gs` → **Raw** → 全文複製
2. Google 試算表 → **擴充功能 → Apps Script**
3. 舊 `Code.gs` **全選刪除**，貼上新版本 → 儲存
4. 函數選單揀 **`initializeSheets`** → **執行**（授權照准）
   - 只會加欄、補未開戶籌委、修正專管帳號組別
   - **不會刪現有資料**
5. 可再執行一次 **`seedCommitteeAccounts`**（選單：童軍活動管理 → 補齊籌委帳戶）
6. **重新部署**：部署 → 管理部署 → 現有網頁應用程式 → 鉛筆 → 版本揀 **新版本** → 說明 `v8.1` → 部署  
   （同一條 URL，Vercel `GAS_URL` 不用改）

## 不更新會點

APP 前端仍可用。但正式活動的用戶名單／會議若只在瀏覽器，換機就看不到；「確定更新用戶」也寫不到試算表。
