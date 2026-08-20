# 批量開戶 (Bulk Onboarding) - 童軍活動管理系統 v6.0

> ⚠️ v7.1 起：批量開戶已由獨立「用戶·批量」卡片**併入「開戶」卡片**（開戶卡片底部的「批量開戶」區，**僅管理員/超管可見**），同頁支援下載範本 → 上傳 CSV → 預覽 → 一鍵開戶，亦可貼 JSON。「模擬示範版」活動為本地沙盒，批量開戶只寫入你的瀏覽器，不影響正式資料。

> 參考 scoutbadge 同一個 APP 管晒所有旅團 / 活動的批量開戶設計，實現全前端控制、手機友善、三軌並行的開戶流程。

## 三種開戶方式定位

| 方式 | 定位 | 說明 |
|---|---|---|
| ① 前端上傳 CSV 範本 | **批量開戶主路 (推薦·最快)** | 下載範本 → Excel 填寫 → 前端上傳 → 預覽 → 一鍵開戶，全部在瀏覽器完成，支援 Mock |
| ② 前端貼上 JSON 陣列 | **進階/系統對接** | 直接貼 [{ymis,name,...}] 批量建立，適合從其他系統匯出轉入 |
| ③ Google Sheets 直寫 (Code.gs) | **備用/超大量/無前端權限** | 把 CSV 匯入全新 Sheet，用附帶 Code.gs 直寫主資料表，自動建表頭，密碼雜湊儲存 |

> 原則：所有開戶盡量在前端完成。方法③僅作備用，日常不建議。

## 流程總覽

```
下載範本 CSV -> Excel 填寫 -> 前端上傳 -> 預覽 -> 一鍵批量開戶 (全前端·手機友善)
```

主資料表 Users 欄位 (與後端 Code.gs 兼容)：

```
user_id/ymis, name, email, role, group_name, contact, password_hash, can_tick, status, allowed_modules, squad, squad_role, job_desc, created_at, last_login, auth_by, auth_date
```

## 方法一：前端上傳 CSV (主路)

1. 登入系統 → 首頁或「批量開戶中心」或「用戶管理」→ **📥 批量開戶** → **下載範本 CSV** (`data/users_template.csv`)
2. Excel / Google Sheets 打開，填寫每位成員資料
3. 回到對話框，**📥 上傳已填 CSV**，系統自動解析並預覽
4. 確認 **✅ 確認批量開戶**，資料寫入 localStorage (Mock) 或透過 GAS 寫入 Sheet
   - 有填 `password` → 開立可登入帳號 (password 以 SHA-256 雜湊)
   - 只填 `user_id + name` → 只加入成員，不可登入

### 範本欄位

| 欄位 | 說明 |
|---|---|
| ymis / user_id | 必填，帳號ID，建議 8-10 位數字或自訂ID，例如 00820001 |
| name | 必填，姓名 |
| email | 選填，Email (登入用) |
| role | 必填，super_admin / advisor / admin / chairperson / vice_chairperson / general_director / director / staff / public |
| group_name | 必填，組別，例如 主題節目組（組別下拉已移除「顧問團」「主席及執行副主席」兩組） |

> ⚠️ **v7.8 起**：批量 CSV／JSON 屬管理員／超管專用，可填全部職級（副主席及以上由管理員在此處理）；前端「快速批量開戶」逐行選單只提供 工作人員／主任／總主任。
| contact | 選填，電話 |
| password | 選填，有填則開立可登入帳號 |
| can_tick | true/false，是否可批核/可勾選 |
| allowed_modules | * 代表全部，或逗號分隔模組 meetings,staff,finance,activities,meals,schedule,supplies,approvals |
| squad | 選填，小隊名稱 |
| squad_role | member / 隊長 / 副隊長 |
| status | active / inactive / pending |
| job_desc | 選填，職務描述 |

## 方法二：貼上 JSON

在批量中心貼上：

```json
[
  {"user_id":"00820001","name":"陳小明","role":"staff","group_name":"主題節目組","password":"1234","can_tick":false},
  {"user_id":"00820002","name":"李小華","role":"vice_chairperson","group_name":"行政組","password":"1234","can_tick":true,"allowed_modules":"*"}
]
```

按 **由 JSON 批量開戶** → 預覽 → 確認。

## 方法三：Google Sheets + Code.gs 直寫 (全新 Sheet 也支援)

適合無前端權限、超大量 (100+) 或網絡不穩時。

1. Google Sheets 新建空白試算表
2. 檔案 > 匯入 > 上載 CSV，選 `data/users_template.csv`
3. 填寫資料
4. 擴充套件 > Apps Script，貼上 `assets/batch-onboard/Code.gs`，儲存
5. 修改檔首 CONFIG：
   - MAIN_SHEET_ID：主資料表 ID (網址 /d/.../ 間)
   - APIKEY：與系統相同的 API Key
   - BACKEND_URL：系統 GAS /exec 網址 (推送後端時需要)
   - USERS_SHEET：Users
6. 重新整理，選單「批量開戶」：
   - ✍️ 直接寫入主資料表：最快，直接寫入主表 Users，依 user_id 去重
   - 📤 轉JSON並推送後端：逐列 POST 到後端 batchAddUsers
   - 📝 預覽JSON：檢查 JSON

### 全新 Sheet 自動建表頭

- 若 Users 不存在 → 自動建立
- 若空白表無 user_id 表頭 → 自動寫入標準 17 欄表頭
- 密碼以 SHA-256 雜湊儲存，開戶即可登入，建議首次登入更換密碼

## 注意

- ID 重複會被跳過，不會覆蓋舊資料 (保護機制，scoutbadge同款)
- 建議先 2-3 筆測試，確認無誤再全團匯入
- Mock 模式下資料只存瀏覽器 localStorage，可匯出 JSON 備份
- 私隱設定可在「全前端控制台」調整：允許成員互相查看進度、小隊比較等

## 手機友善說明

- 底部固定導航 Bottom Nav：5 個主按鈕，拇指可達，含 iPhone 安全區 safe-area
- 表格 ≤768px 自動轉卡片，data-label 顯示欄位名，避免橫向捲動卡死
- Modal 底部彈出 Bottom Sheet，最大 88vh，滑動友好，輸入框 16px 防 iOS 放大
- 所有按鈕最小 44px 觸控目標

COPYRIGHT 2026 Scout System
