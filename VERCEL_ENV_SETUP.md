# 🔒 Vercel 環境變數設定指南 (ISD2026_APIKEY)

正如 `vsbadge` 的設計（如 `TROOP_0082_APIKEY`），您只需要在 Vercel 中設定對應活動的 API Key 環境變數即可。地址暴露在前端並不會造成私隱外洩，因為沒有正確的 API Key，爬蟲無法從 Google Apps Script 拿取任何真實資料。

---

### ⚙️ 在 Vercel 中設定：

1. 進入 Vercel 專案 ➔ **Settings** ➔ **Environment Variables**。
2. 新增以下環境變數：
   - **Key**: `ISD2026_APIKEY`
   - **Value**: `scout_e6451624b1f340078ec6a111`
3. 勾選所有環境 (Production, Preview, Development)，點擊 **Save**。
4. 重新部署專案 (**Redeploy**)。

### 💡 運作原理：
- 前端 `index.html` 直接內置了 GAS Script 網址。
- 當前端請求資料時，會透過 Vercel 後端路由 `/api/config` 獲取對應的 `ISD2026_APIKEY` (`scout_e6451624b1f340078ec6a111`)，並附加到請求中發往 Google Sheet。
- 任何沒有帶有效 API Key 的爬蟲訪問都會被 GAS 後端直接拒絕！
