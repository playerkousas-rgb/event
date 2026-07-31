# 工作人員卡片全面升級 - v6.3

> 根據用戶需求：名單及聯絡批量、職務大綱 Word 解析、組織架構樹形圖

## 1. 工作人員名單及聯絡

### 功能
- **單欄新增**：點擊「+ 單欄新增」可一欄欄新增姓名、職銜、組別、電話、職務、Email、小隊
- **上傳文件轉 JSON**：支援 CSV / JSON 批量匯入
  - CSV 欄位：`name,role_title,group_name,contact,job_desc,email,squad`
  - JSON：陣列 `[{name,role_title,group_name,contact,...}]` 或包含 `contacts` 欄位
  - 流程：上傳文件 → APP 讀取 → 轉 JSON → 寫入 `event_staff_v6_{event_id}` localStorage + 嘗試同步 GAS
  - 支援從 `data/staff_template.csv` 範本
- **下載範本批量輸入**
  - `data/staff_template.csv` 名單範本
  - `data/org_template.csv` 架構範本
  - `data/duties_template.csv` 職務範本
  - 前端提供「下載範本 CSV」按鈕，一鍵下載
- **匯出 JSON**：匯出全部名單為 JSON 備份

### 實作
- `getStaffData()` 合併 localStorage 與 `data/isd_2026.json` 原始數據
- `saveStaffData()` 存 localStorage `event_staff_v6_{id}`，GAS 模式嘗試同步
- `handleStaffFileUpload(file, type)` 解析 CSV (parseCSV) 或 JSON，轉對應結構寫入
- 手機友善：表格在 ≤768px 自動轉卡片 `data-label`

## 2. 職務大綱

### 功能
- **Word 上傳轉 JSON**：管理員上傳 .docx 檔，系統用 `mammoth.js` 解析
  - 引入：`https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.18/mammoth.browser.min.js`
  - 流程：`file.arrayBuffer()` → `mammoth.extractRawText({arrayBuffer})` → 文本 → 按已知組別關鍵字 (顧問團、籌委會、行政組等) 拆分 → 每組生成一筆 `job_duties`
  - 每筆包含：`group, duty (多行), file_name, updated_by, updated_at`
  - 解析後自動寫入 JSON，顯示在職務大綱 Tab
- **前端觀看**：所有人可在「職務大綱」Tab 觀看，卡片式顯示組別 + 職務內容
- **前端修改**：行政副主席、執行副主席或主席以上 (Level >=60 或 execViceOrChair) 可點擊「✏️ 編輯」直接修改，完成後儲存同步後端 (localStorage + GAS)
- **範本**：`data/duties_template.csv` `group,duty` 兩欄

### 權限
- 查看：所有籌委
- 新增/編輯：`isAdmin()` 或 `isExecViceOrChair()` 或 Level >=60 (副主席以上)
- 刪除：僅管理員 `isAdmin()`

## 3. 組織架構圖 - 樹形圖

### 設計
- **資料結構**：`org_chart` 每筆 `id, level (組別 + Level X), level_num, group, title, names, desc, parent_id`
- **Level**：L2 顧問/主席層, L3 副主席層, L4 總主任, L5 主任, L6 工作人員
- **樹形顯示**：
  - 按組別分組 (行政組、會操及典禮組、主題節目組等)，每組一個卡片
  - 組內按 `level_num` 排序，`margin-left: (level_num-2)*16px` 產生縮進樹形視覺
  - 每節點顯示：L徽章 + 職銜 + Level + 人名膠囊 + 描述 + 操作按鈕
  - 使用 `border-left` 效果可擴充為連線樹

### 權限與新增
- **副主席或以上 (Level>=60)**：可在自己組別下「+ 新增崗位」或「+ 新增下屬」
  - 新增表單：組別*、職級 Level、職銜*、人名、描述、上級崗位 ID (可空，樹形關聯 parent_id)
- **行政副主席、執行副主席、主席可修改全部**：
  - `isExecViceOrChair()` = super_admin/admin/chairperson/advisor 或 vice_chair 在行政組
  - 可編輯任意節點、刪除任意節點，刪除時下屬變頂級
- **管理員**：可刪除全部

### 操作
- 新增頂級崗位：組織架構頂部按鈕「新增頂級崗位」
- 新增下屬：每節點旁「+ 新增下屬」自動填 parent_id
- 編輯：每節點「✏️ 編輯」
- 刪除：每節點「🗑️ 刪除」僅管理員/行政副主席等可見
- 匯出/範本：頂部「匯出 JSON」「下載範本 CSV」「上傳文件轉JSON」

## 檔案

- `data/staff_template.csv` 名單範本
- `data/org_template.csv` 架構範本 `group,level_num,title,names,desc,parent_id`
- `data/duties_template.csv` 職務範本 `group,duty`
- 前端範本下載按鈕直接生成 CSV Blob，無需後端

## 手機友善

- 樹形圖：手機上縮進減半，卡片式，橫向捲動避免
- 名單：表格轉卡片
- 職務大綱：2 欄 Grid 在手機變 1 欄，卡片式

COPYRIGHT 2026 Scout System
