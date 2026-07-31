# 🎪 童軍活動管理系統 v6.0 - 全前端控制·批量開戶·手機友善版

> 參考 [playerkousas-rgb/scoutbadge](https://github.com/playerkousas-rgb/scoutbadge.git) 同一個 APP 管晒所有旅團/活動的設計哲學，全面升級為 **全前端可控、批量開戶三軌、100%手機友善** 的智慧執行指揮中心，完全取代傳統靜態 Google Sites。

> COPYRIGHT 2026 Scout System

---

## ✨ v6.0 核心升級 (相對於 v5.0)

### 1️⃣ 全前端控制 (Frontend Control Center)
- **零 Google Sheet 操作**：所有活動、用戶、財務、會議 Banner、系統設定皆可在前端完成
- **同一個 APP 管晒所有活動**：參考 scoutbadge 設計，旅團/活動提交 URL+APIKEY 給 APP ADMIN，改 `troops.json` + 加 `TROOP_XXX_APIKEY` (此項目為 `ISD2026_APIKEY`)，Redeploy 即完成
- **Mock 雙軌**：Mock 純前端模式資料存瀏覽器 localStorage，不寫入 Sheet，適合手機測試；GAS 雲端模式實時同步試算表
- **系統設定全前端**：Banner 文字、下次會議、私隱開關、預設密碼、GAS URL、API Key 皆在「全前端控制台」編輯，立即生效
- **匯出/匯入**：一鍵匯出全部 JSON 備份，一鍵匯入還原

### 2️⃣ 批量開戶 (Bulk Onboarding) 三軌流程 - scoutbadge 同款

| 軌道 | 定位 | 說明 |
|---|---|---|
| **① 前端上傳 CSV 範本 (主路·最快)** | 批量開戶主路 | 下載 `data/users_template.csv` → Excel 填寫 → 前端上傳 → 預覽 → 一鍵開戶 |
| **② 前端貼上 JSON 陣列** | 進階/系統對接 | 直接貼 `[{ymis,name,...}]` 批量建立 |
| **③ Google Sheets + Code.gs 直寫** | 備用/超大量/無前端權限 | 用附帶 `assets/batch-onboard/Code.gs` 直接寫入主資料表，支援全新空白 Sheet 自動建表頭 |

- **範本欄位**：`ymis/user_id, name, email, role, group_name, contact, password, can_tick, allowed_modules, squad, squad_role, status, job_desc`
- **密碼處理**：SHA-256 雜湊儲存，與後端登入一致，開戶即可登入
- **去重保護**：依 `user_id` 去重，不覆蓋舊資料，與 scoutbadge 相同保護機制
- **本地快取歷史**：批量紀錄存 localStorage，可追溯
- **附帶腳本**：`assets/batch-onboard/Code.gs` 支援「直接寫入主資料表」「轉JSON推送後端」兩模式

### 3️⃣ 手機友善 (Mobile Friendly) 100%

- **底部固定導航 Bottom Nav**：5 個主功能 (首頁/成員/批量/批核/設定)，拇指可達，含 iPhone safe-area
- **表格轉卡片**：`@media (max-width:768px)` 表格 thead 隱藏，tbody tr 變卡片，td 用 `data-label` 顯示欄位名，避免橫向捲動卡死
- **觸控目標**：所有按鈕最小 44px，輸入框 16px 防 iOS 自動放大
- **Modal 底部彈出 Bottom Sheet**：手機上 modal 對齊底部，圓角只有頂部，最大 88vh，滑動友好
- **粘性導航**：頂部 header sticky，漢堡抽屜 Drawer，快速切換模組
- **卡片 Hover**：`.card-hover` 微動效，提升觸感

---

## 🗂️ 系統原有功能 (保留並增強)

### 多活動架構
- 首頁多活動卡片，私隱活動密碼，localStorage 安全儲存，靈活擴展

### 7 級 RBAC 權限
- Level 1 super_admin (sheep/0728 隱藏)
- Level 2 advisor / admin / chairperson
- Level 3 vice_chairperson (具審批權)
- Level 4 general_director
- Level 5 director (會議通知默認對象)
- Level 6 staff
- Level 7 public

### 8 大卡片模組 + 2 大新控制台
- 📋 會議卡片：紀錄與下次會議 Banner (全前端可編輯)
- 👥 工作人員卡片：組織架構圖/聯絡名單/職務大綱 三子分頁
- 📁 文件檔案
- 💰 財務管理：零精簡詳細預算，憑單編號，報價門檻 $500/$2000/$5000
- 🎪 活動與攤位
- 🍱 膳食管理：各組提交，批核中心一鍵批核
- 📅 日程表
- 📦 物資管理：總物資清單、車輛通行證
- ⭐ 批核中心：上級批下級，支援批量一鍵批准
- 👥 用戶管理 (新增)：單個+批量開戶，角色/組別/小隊/權限/狀態，搜尋過濾，手機卡片排版
- 📥 批量開戶中心 (新增)：三軌流程，範本下載，預覽，歷史紀錄
- 🛠️ 全前端控制台 (新增)：Banner、會議、GAS連接、私隱設定、匯出匯入、MOCK工具

---

## 🚀 快速開始

### 前端 (Vercel / GitHub Pages)
1. Fork 本倉庫
2. Vercel 匯入，Framework 選 Other，Output Directory 空 (index.html 在根目錄)
3. 設定環境變數：
   - `ISD2026_APIKEY=scout_xxxx` (從 GAS `getApiKey()` 獲取)
   - `GAS_URL=https://script.google.com/macros/s/.../exec` (可選，前端也可改)
4. Deploy，開啟網址即用
5. 默認 Mock 模式已可體驗所有功能，無需後端

### 後端 (Google Apps Script)
1. Google Drive 新建 Google 試算表，命名「活動行政管理總庫 v6.0」
2. 擴充功能 → Apps Script，貼上 `apps-script/Code.gs` (v6.0)
3. 保存，執行 `initializeSheets()`，授權，彈出 API Key + URL，複製
4. 部署 → 新增部署 → 類型 網頁應用程式 → 說明 v6.0 → 執行身分 我 → 存取權 任何人 → 部署，複製 /exec URL
5. 將 Key 填入 Vercel `ISD2026_APIKEY`，URL 填入前端控制台或 Vercel `GAS_URL`
6. 重新部署前端，測試批量開戶

### 批量開戶測試
1. 前端首頁 → **下載批量模板 & 一鍵開戶**
2. 下載 `data/users_template.csv`，用 Excel 填寫 2-3 筆測試資料
3. 回到批量中心 → 上傳已填 CSV → 預覽 → 確認批量開戶
4. 前往用戶管理，檢視新成員，測試登入 (密碼 1234)

---

## 📁 檔案結構

```
/
├── index.html                  # 主前端 v6.0 (全前端·批量·手機友善，單檔 3000+ 行)
├── data/
│   ├── events.json             # 活動清單 (Mock)
│   ├── isd_2026.json           # ISD 2026 完整數據 (Mock)
│   └── users_template.csv      # 批量開戶範本 (新增，scoutbadge同款)
├── assets/batch-onboard/
│   └── Code.gs                 # GS 批量直寫腳本 (新增，支援全新Sheet自動建頭)
├── api/
│   └── config.js               # Vercel Serverless，合併環境變數，回傳 gasUrl+apiKey+features
├── apps-script/
│   └── Code.gs                 # GAS 後端 v6.0，支援 batchAddUsers, getConfig, batchSave, AuditLog
├── docs/
│   ├── MAIN_SYSTEM_INTEGRATION.md
│   └── BULK_ONBOARD.md         # 批量開戶說明 (新增，scoutbadge同款三軌)
├── DEPLOY_GUIDE.md
├── VERCEL_ENV_SETUP.md
└── README.md
```

---

## 🔒 安全設計 (參考 scoutbadge)

- **URL 公開無妨**：backend /exec 公開放 `data/troops.json` 或前端，無 API Key 也拿不到私隱資料
- **API Key 防爬蟲**：放 Vercel 環境變數 `ISD2026_APIKEY`，不進 GitHub，避免被 GitHub 爬蟲掃到，`/api/config` 合併後前端才拿到
- **人類靠登入防**：即使拿到 backend+apikey，無 token (登入密碼) 也讀不到用戶密碼雜湊以外資料
- **同一個 APP ADMIN**：集中維護，一個 Vercel Project 管多個活動，流程：活動方提交 URL+APIKEY → 管理員改 events.json + 加環境變數 → Redeploy 完成

---

## 📱 手機友善細節

```css
/* 表格轉卡片 */
@media(max-width:768px){
  thead{display:none}
  tbody tr{display:block;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:10px;padding:8px}
  tbody td{display:flex;justify-content:space-between}
  tbody td::before{content:attr(data-label);font-weight:700}
  .modal{align-items:flex-end!important} /* Bottom Sheet */
  .form-group input{min-height:44px;font-size:16px!important} /* 防 iOS 放大 */
  .bottom-nav{padding-bottom:calc(6px + env(safe-area-inset-bottom))} /* iPhone 安全區 */
}
```

---

## 🔄 更新日誌

- **v6.0 (2026-07-30)**: 參考 scoutbadge，實現全前端控制、批量開戶三軌 (CSV/JSON/GS)、手機友善 (Bottom Nav + 卡片排版 + Bottom Sheet + 44px觸控)，新增 用戶管理、批量中心、全前端控制台、AuditLog、SystemConfig，兼容舊 v5.0 數據
- **v5.0**: 零精簡完整文本、詳細預算明細、完整組織名單
- **v4.x**: 8大卡片模組與批核中心

---

## 📚 參考

- https://github.com/playerkousas-rgb/scoutbadge.git (全前端控制、批量開戶、手機友善、同一個APP管晒所有旅團設計)
- https://scoutsinfohub.org.hk/ (童軍訓練綱要)
- https://www.scout.org.hk/

COPYRIGHT 2026 Scout System
