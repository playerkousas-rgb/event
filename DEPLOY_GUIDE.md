# 📦 部署指南 v6.0 - 全前端·批量開戶·手機友善版

> 參考 scoutbadge 同一個 APP 管晒所有旅團/活動設計，實現全前端控制，手機友善，批量三軌

---

## 第一步：Google Sheet 與 Apps Script 後端 v6.0

1. Google Drive 新建 Google 試算表，命名「活動行政管理總庫 v6.0」
2. 頂部 擴充功能 → Apps Script，清除預設，貼上 `apps-script/Code.gs` (v6.0 全前端版)
3. 保存，執行 `initializeSheets()`，授權
   - 自動建立：Events, Users (17欄), Meetings, Staff, Documents, Finance, Activities, Meals, Schedule, Supplies, Supply_Requests, SystemConfig, AuditLog 共13張表
   - Seed 初始數據：2個活動 (isd_2026, isd_2027)，7個用戶 (含 sheep 超管)
   - 彈出 API Key + URL，複製
4. 部署為網頁應用程式：
   - 部署 → 新增部署 → 類型 網頁應用程式
   - 說明 v6.0，執行身分 我，存取權 任何人
   - 部署，複製 /exec URL

### v6.0 新增後端功能

- `batchAddUsers`: 批量開戶，去重保護，SHA-256 密碼雜湊
- `getAllUsers`: 獲取全部用戶 (全前端用戶管理用)
- `getConfig` / `updateConfig`: 系統設定全前端控制 (Banner, 私隱開關等)
- `batchSave`: 批量保存未保存變更
- `deactivateUser` / `resetPassword`: 用戶停用/重設密碼
- `AuditLog`: 操作日誌，追蹤批量開戶等操作
- `ensureSheet` 自動補欄位，不覆蓋舊資料 (非破壞性更新)

---

## 第二步：前端部署到 Vercel (全前端控制，手機友善)

1. Fork / 上傳至 GitHub (本倉庫)
2. Vercel → Add New Project → Import GitHub
3. Framework: Other，Root Directory: ./，Build Command 空，Output Directory 空 (因為 index.html 在根)
4. Environment Variables：
   - `ISD2026_APIKEY` = 剛才複製的 API Key (例 `scout_xxxx`)
   - `GAS_URL` = /exec URL (可选，前端控制台也能改)
5. Deploy → 開啟網址

### 前端特性

- 預設 Mock 模式：零後端依賴，所有功能可在瀏覽器 localStorage 體驗 (批量、用戶、批核)
- 全前端控制台：右上角齒輪 / 底部導航「設定」，可改 GAS URL、API Key、Banner、會議時間、私隱開關
- 手機友善：底部固定導航 Bottom Nav，表格轉卡片，Bottom Sheet Modal，44px 觸控目標，iPhone safe-area
- 批量開戶中心：「下載範本 CSV」→ Excel 填寫 → 上傳 → 預覽 → 一鍵開戶，支援 JSON 與 GS 直寫三軌

---

## 第三步：新活動接入流程 (同一個 APP 管晒所有活動 - scoutbadge 同款)

```
[活動A] --\
           +--> 提交 URL + APIKEY --> [event APP ADMIN] --> 改 data/events.json + 加 ISD2026_APIKEY(或EVENT_XXX_APIKEY) --> Redeploy
[活動B] --/
```

活動方需提交：
- 活動ID (例 isd_2026)
- 名稱 (例 2026 ISD 港島童軍繽紛日)
- Backend URL (/exec)
- API Key (scout_xxxx)

管理員做：
1. 編輯 `data/events.json` 加入新活動
2. Vercel 加環境變數 `ISD2026_APIKEY` 或 `EVENT_{ID}_APIKEY` (防爬蟲，不進 Git)
3. Redeploy，完成，前端自動出現新活動卡片，全前端可編輯

---

## 第四步：新旅團/用戶批量開戶流程

### 前端主路 (推薦)

1. 登入 (sheep/0728 超管)
2. 用戶管理 → 下載範本 CSV
3. Excel 填寫：
   - ymis/user_id 必填
   - name 必填
   - role 必填 (super_admin/advisor/admin/chairperson/vice_chairperson/general_director/director/staff/public)
   - group_name 必填
   - password 有填即可登入
4. 批量開戶中心 → 上傳 CSV → 預覽 → 確認批量開戶
5. 用戶管理查看新成員，測試登入

### Google Sheets 備用

1. 全新 Google Sheets → 匯入 CSV
2. 擴充功能 → Apps Script → 貼上 `assets/batch-onboard/Code.gs`
3. 修改 CONFIG (MAIN_SHEET_ID, APIKEY, BACKEND_URL)
4. 重新整理 → 選單「批量開戶」→ 直接寫入主資料表

---

## 📱 手機測試清單

- [ ] iPhone / Android Chrome 開啟前端，底部導航是否可見，含 safe-area
- [ ] 活動卡片是否單欄排版，點擊進入無橫向捲動
- [ ] 用戶管理是否卡片排版，非表格，data-label 是否正確顯示
- [ ] 批量開戶 Modal 是否底部彈出，最大 88vh，可滑動
- [ ] 輸入框點擊是否不自動放大 (需 16px)
- [ ] 按鈕是否至少 44px，拇指可點

---

## 🔄 不改舊有資料的安全更新

- `ensureSheet()` 自動補缺失欄位，不刪除舊資料
- `batchAddUsers` 依 user_id 去重，不覆蓋
- 前端 Mock 數據存 localStorage，清除快取才重置，不影響 GAS 雲端

COPYRIGHT 2026 Scout System
