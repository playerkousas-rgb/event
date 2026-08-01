# 🎪 大型活動行政管理工具 (Event Administration Management Tool)

> 參考 `indonesia-trip` 及 `vsbadge` 架構，結合 Google Sheet 與 Google Apps Script (GAS) 遠端控制，支援多活動接入、活動密碼私隱保護、7級角色權限控制與 8大卡片管理模組。

---

## ✨ 系統核心功能特色

1. **多活動接入首頁 (Multi-Event Landing Page)**：
   - 可以在首頁看到多個不同的大型活動卡片（如：年度週年活動、領袖培訓、冬季大露營）。
2. **活動密碼私隱保護**：
   - 每個活動均可設定專屬密碼。首次接入時輸入密碼後將自動安全儲存於瀏覽器 `localStorage`，保障私隱。
3. **7 級帳戶權限與職級架構 (7-Level RBAC)**：
   - **Level 1**: 超級管理員 / 我 (隱藏 / 最高全權限)
   - **Level 2**: 管理員 (地域 / 新職員 / 行政組) 及 主席 (同級)
   - **Level 3**: 副主席 (各組別，因應活動設立)
   - **Level 4**: 總主任 (各組別，因應活動設立)
   - **Level 5**: 主任 (各組別，因應活動設立)
   - **Level 6**: 工作人員 (Staff)
   - **Level 7**: 公開 (Public，公開資料僅管理員以上可設定)
4. **8 大卡片管理模組**：
   - 📋 **1. 會議卡片**：會議紀錄、議程安排、各組會議摘要。
   - 👥 **2. 工作人員卡片**：組織架構、職員名單、職務大綱、聯絡資料。
   - 📁 **3. 文件檔案**：通告、保險相關文件與活動檔案。
   - 💰 **4. 財務管理**：活動預算、各組財政報告（參考印尼財務模版）。
   - 🎪 **5. 活動與攤位**：攤位總覽、遊戲卡設計、地圖與活動項目。
   - 🍱 **6. 膳食管理**：膳食內容與統計（各組提交申請，再由膳食組批核）。
   - 📅 **7. 日程表**：全活動時間表、各組行程與時段安排。
   - 📦 **8. 物資管理**：總物資清單、各組物資要求（各組提交申請，再由協調組批核）。
5. **不改舊有資料的安全更新架構 (Non-Destructive Schema Update)**：
   - 後端 GAS 採用智慧結構檢驗 (`ensureSheet`)：當你新增功能或測試時，只會自動補齊缺失的欄位，**絕對不會覆蓋或刪除現有的工作表與舊資料**。

---

## 🚀 部署指南 (Deployment Guide)

### 第一步：設置 Google Sheet 與 Apps Script 後端
1. 在 Google Drive 建立一個新的 **Google 試算表**（例如命名為「活動行政管理總庫」）。
2. 點擊頂部選單的 **擴充功能 (Extensions)** ➔ **Apps Script**。
3. 清除編輯器中的預設程式碼，並將本項目中的 `apps-script/Code.gs` 完整貼上。
4. 點擊上方的 **儲存 (Save)** 按鈕。
5. 執行一次 `initializeSheets` 函數（點擊上方「執行」），授權權限後，它會自動建立所有 11 個模組工作表（Events, Users, Meetings, Staff, Documents, Finance, Activities, Meals, Schedule, Supplies, Supply_Requests）。
6. **部署為網頁應用程式 (Deploy as Web App)**：
   - 點擊右上角 **部署 (Deploy)** ➔ **新增部署 (New deployment)**。
   - 類型選擇 **網頁應用程式 (Web app)**。
   - 說明填寫 `v1.0`。
   - 執行身分 (Execute as)：**我 (Me)**。
   - 誰可以存取 (Who has access)：**任何人 (Anyone)**。
   - 點擊部署，複製產生的 **網頁應用程式 URL** (`https://script.google.com/macros/s/.../exec`)。

### 第二步：部署前端到 GitHub 與 Vercel
1. 將前端文件（`index.html`）上傳至你的 GitHub 倉庫。
2. 登入 [Vercel](https://vercel.com)，匯入該 GitHub 倉庫。
3. 部署完成後，開啟網頁。
4. 點擊右上角 **「⚙️ 系統設定 / GAS URL」**，將剛才複製的 **Google Apps Script URL** 貼上並儲存。
5. 即完成前後端完整聯動！你可以隨時測試新增會議、提交膳食申請、審批物資等功能，試算表數據實時同步。
