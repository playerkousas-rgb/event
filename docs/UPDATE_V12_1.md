# v12.1 更新說明（2026-09-03）

用戶實測回報 5 項，全部完成。回歸測試：`tests/v121_souvenir_admin_coordin_test.js`（36 項）。

---

## ① 紀念章派發防呆（唔再 1 TICK 即刻打後端）

**之前**：每剔一個 checkbox 就即時 `fetch` 一次後端 `Souvenir_Stamps`。現場快速連 tick（例如一次過派十幾個）會瞬間產生十幾個 request，後端 Apps Script 很易被打爆／超時，失敗咗亦靜默掉資料。

**而家**（`js/40-souvenir-stamps.js`）：

- TICK／取消／備註改動先寫 `localStorage`（UI 即時反應，唔等網絡），再放入同步佇列 `_stampSyncQueue`；
- **800ms 合併視窗**：視窗內同一人的多次改動只會保留最新狀態，合併成 1 個 request；
- **串行發送**（`_stampSyncBusy` 鎖）：一筆一筆送，唔會同時開大量連線；
- **失敗自動重試 3 次**（指數退避 0.5s／1s），重試都失敗會保留喺佇列，下一輪視窗自動再送，**唔會靜默掉資料**；
- 工具列新增**同步狀態指示**：「同步中…／已同步後端／同步失敗，重試中」；
- `beforeunload`（關頁／重新整理）前會嘗試把未送改動送出（`flushStampSyncBeforeUnload`，`js/90-bootstrap.js`）。

> 後端 `apps-script/Code.gs` 唔使改——沿用 `saveRecord`（stamp_id 為 `staff_<key>`／`guests_<key>`，upsert 性質）。

## ② 最高層系統帳戶唔算工作人員

**之前**：紀念章「工作人員」名單由開戶用戶＋組織架構＋聯絡表合併，最高層系統帳戶（`isSuperAdminUser`）都被當工作人員計入派發名單同總人數。

**而家**：名單構建時排除最高層系統帳戶；即使該帳戶名字殘留喺組織架構圖或聯絡表，都一樣唔計入（`souvenirStaffRoster()`）。

## ③ 紀念章名單可 SORT（方便觀看及派發）

表格 header 可點擊排序，再點轉 ▲升／▼降：

- 工作人員：**姓名／組別／攤位／派發狀態**
- 嘉賓：**姓名／單位／派發狀態**

派發狀態預設降序（未派排前），現場可以「未派嘅排最前」逐個派。排序後搜尋／篩選（只睇未派發等）依然生效。

## ④ 行政組身份卡片右上多餘「新增」掣移除

**之前**：部門中心入「行政組」開 `admin_group` 模組，`openModule` 嘅特殊處理名單漏咗 `admin_group`，跌落兜底分支顯示一粒通用「**新增**」掣（點咗會開通用新增紀錄彈窗，同行政組無關）。

**而家**（`js/10-app-core.js`）：`admin_group` 加入「唔顯示通用新增掣」名單（同 `coordinator_group` 一樣）。行政組自己嘅新增（上傳文件、票券等）喺頁面內本來就有按鈕，唔受影響。

## ⑤ 行政組、協調組補回統計資料＋可列印

**之前**：普通組別部門頁有「**N 崗位・N 物資申請・N 攤位申請・N 車輛申請・N 膳食訂餐**」5 格統計＋4 張明細表＋「列印本組統計」；但行政組（`admin_group`）同協調組（`coordinator_group`）行自己嘅專屬頁，冇呢一塊。

**而家**：

- 抽出共用方法 `groupApplyStatsHTML(groupName)`（`js/10-app-core.js`），三個入口（普通組部門頁／行政組頁／協調組頁）共用同一份口徑；
- **行政組**總覽頁、**協調組**頁頂部都新增「本組申請統計」區塊（5 格數字＋物資／攤位／車輛／膳食 4 張狀態明細表），數字同部門卡、其他組完全一致；
- 兩頁頂部 action bar 同區塊內都有「**列印本組統計／列印統計**」掣（`printCoordArea`），直接列印統計。

---

## 改動檔案

| 檔案 | 改動 |
|---|---|
| `js/40-souvenir-stamps.js` | ① 防呆同步佇列／合併／串行／重試／狀態指示；② 排除最高層帳戶；③ 表格排序 |
| `js/10-app-core.js` | ④ `admin_group` 唔顯示通用新增掣；⑤ 抽出 `groupApplyStatsHTML`，部門頁改用 |
| `js/36-crisis.js` | ⑤ 行政組頁加本組申請統計區塊＋列印 |
| `js/37-coordinator.js` | ⑤ 協調組頁加本組申請統計區塊＋列印 |
| `js/90-bootstrap.js` | ① beforeunload 前嘗試沖出未同步 TICK |
| `index.html` | ③ 排序 active 欄位樣式 |
| `tests/v121_souvenir_admin_coordin_test.js` | 新增回歸測試（36 項） |
