# 🔒 Vercel 環境變數設定指南 v6.0 (全前端·批量·手機友善)

參考 scoutbadge `TROOP_0082_APIKEY` 防爬蟲設計，本系統使用 `ISD2026_APIKEY` + `GAS_URL`

> 設計原則：
> - URL 公開無妨：backend /exec 公開放 troops.json / 前端 config，無 API Key 也拿不到私隱
> - API Key 防爬蟲：放 Vercel 環境變數，不進 GitHub，`/api/config` 合併後前端才拿到
> - 人類靠登入防：即使有 backend+apikey，無密碼 token 也讀不到敏感資料
> - 同一個 APP ADMIN：一個 Vercel Project 管多個活動，流程：活動方提交 URL+APIKEY → 管理員改 events.json + 加環境變數 → Redeploy

---

## ⚙️ 在 Vercel 設定

1. 進入 Vercel 專案 → Settings → Environment Variables
2. 新增：

| Key | Value 範例 | 說明 |
|---|---|---|
| `ISD2026_APIKEY` | `scout_e6451624b1f340078ec6a111` | 從 GAS `getApiKey()` / `showApiKey()` 獲取，防爬蟲 |
| `GAS_URL` | `https://script.google.com/macros/s/xxx/exec` | 可選，前端控制台也可全前端修改 |
| `API_KEY` | 同上，fallback | 相容舊版 |
| `ISD2026_GAS_URL` | 同 GAS_URL，fallback | 相容 |

3. 勾選 Production / Preview / Development
4. Save → Redeploy

## 💡 運作

- 前端 `index.html` 啟動時 fetch `/api/config` 獲取 `gasUrl` + `apiKey`
- `/api/config.js` 優先讀環境變數，否則用 fallback 硬編碼，永不暴露在 GitHub 原始碼掃描
- 前端所有模組（活動、用戶、批量、財務等）皆透過該 apikey 附加到 GAS 請求，GAS `verifyApiKey()` 拒絕無效 key
- 全前端控制：即使不設定環境變數，Mock 模式下所有功能（用戶管理、批量開戶、手機友善）已可在瀏覽器 localStorage 完成，零後端依賴，方便手機測試

## 🧪 測試

- Mock 模式：無需任何環境變數，直接打開前端即可體驗批量開戶、用戶管理、批核中心
- GAS 模式：設定後，關閉 Mock (右上角 Mock: 開 → 關)，測試連接按鈕應顯示「連接成功」

## 📥 批量開戶與環境變數關係

- 前端批量 CSV 上傳 → Mock 模式直接寫 localStorage，無需環境變數
- 前端批量 CSV 上傳 → GAS 模式需 `ISD2026_APIKEY` 有效，否則 GAS 拒絕 `batchAddUsers`
- GS 直寫 `assets/batch-onboard/Code.gs` 需手動填 `MAIN_SHEET_ID` + `APIKEY` + `BACKEND_URL`，走直寫軌，不經 `/api/config`

COPYRIGHT 2026 Scout System
