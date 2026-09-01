# v11.2（2026-09-01）最新消息改為 APP 內可改 ＋ 與「會議預告」互換位置

## 一、改咗啲乜

| | 之前 | 而家（v11.2） |
|---|---|---|
| **最新消息位置** | 活動資訊橫幅（紫色）內，活動簡介下方 | **全站最頂橫幅**（橙色，原「會議預告」個位） |
| **會議預告位置** | 全站最頂橫幅（藍色） | **活動資訊橫幅內**（原「最新消息」個位，連「發送提醒」掣一齊搬） |
| **邊個改到最新消息** | 只有有 GitHub repo 寫入權限嘅人（改 `data/events.json` → commit → push → 等 Vercel 重新部署） | **執行副主席以上 ＋ 秘書處**，喺 APP 內按「修改最新消息」即時發佈 |
| **資料來源** | 淨係 `data/events.json` | 後端 `Events` 表（`news`／`news_updated_by`／`news_updated_at`）；`events.json` 只做未改過時嘅預設值 |

## 二、邊個可以改

`canEditEventNews()`（`js/11-news.js`）——同「發送會議提醒」同一批人：

- **執行副主席以上**：`super_admin`（系統管理員）／`admin`（管理員）／`advisor`（顧問）／`chairperson`（主席）／`executive_vice_chairperson`（執行副主席）
- **秘書處**：`group_name` 正規化後等於「秘書處」（或包含「秘書」）——**不論職級**（主任／工作人員都改到）
- 其他人（副主席、總主任、其他組主任／工作人員、訪客）：**見唔到修改掣，亦改唔到**（前端會擋，POST 亦唔會發出）

> 呢個權限**唔屬於**卡片嗰套 `editLevel` 系統，係活動基本資料級別，所以獨立寫喺 `canEditEventNews()`。

## 三、點樣用（APP 內）

1. 用有權限嘅帳戶登入 → 入活動
2. 最頂橙色「最新消息」橫幅右邊按 **「修改最新消息」**
3. 輸入內容（最多 300 字，留空 ＝ 清除消息、橫幅收起）→ 按 **發佈**
4. 即時生效；其他人重新載入（或下次開 APP）就見到，橫幅右邊會顯示「更新：發佈人 · 時間」

未發佈過消息時：**有權限嘅人**會見到橫幅同修改掣（提示「暫未有最新消息」），**其他人／訪客**完全見唔到橫幅（唔會多咗一條空 BAR）。

## 四、技術細節

**前端**
- 新檔 `js/11-news.js`：`canEditEventNews()`、`renderEventNews()`、`openNewsEditor()`、`saveEventNews()`、`clearEventNews()`、本機 override（`event_news_override_v1_<event_id>`）
- `index.html`：頂部 `#top-news-banner`（內含 `#dash-event-news`、`#news-admin-actions`）、活動橫幅內 `#dash-meeting-box`（內含 `#banner-meeting-text`、`#banner-admin-actions`）、編輯視窗 `#modal-news`
- `js/10-app-core.js`：
  - `showDashboard()` / `goHome()` / `loadEvents()` 都會叫 `renderEventNews()`
  - `loadEvents()` 合併規則微調：內建 `events.json` 嘅活動**仍然唔會**被後端整個蓋過，但**`news` 例外**——後端有 `news` 或 `news_updated_at` 就以後端為準（其他欄位維持 JSON 為準）
- `js/33-users.js`：登入／登出後刷新橫幅（修改掣顯示與否）

**後端 `apps-script/Code.gs`（要重新部署！）**
- 新 POST action：`saveEventNews`（`event_id`／`news`／`updated_by`）
- 自動喺 `Events` 表補建 `news`、`news_updated_by`、`news_updated_at` 三個欄位（唔使人手改試算表，亦唔會動到現有資料）
- `Events` 表若未有該活動（活動只存在於 `data/events.json`），會補一行淨帶 `event_id` ＋ 最新消息
- `getEvents` 本身已回傳全部欄位，所以前端自動讀到
- `GS_VERSION` → `v11.2-2026-09-01`

**使唔使 run setup（initializeSheets）？** → **唔使**。`saveEventNews` 第一次執行時會自動補建三個欄位。（`initializeSheets` 亦已同步加咗 `news`／`news_updated_by`／`news_updated_at`，想手動 run 一次都得，係非破壞性，只會喺最右側補欄，唔會刪／改任何現有資料。）

> ⚠️ **未重新部署 Code.gs 之前**：APP 內改動仍然即時顯示（本機 override），但唔會同步俾其他人，並會彈提示「寫入後端失敗…請重新部署」。部署方法見 `DEPLOY_GUIDE.md`（Apps Script → 部署 → 管理部署 → 新版本；存取權＝任何人）。

**離線／示範**
- 「模擬示範版」活動同未設定後端網址時：只寫本機（沙盒），會彈黃色提示。

## 五、回歸測試

```bash
node tests/v11_2_news_editor_test.js   # 29 項：權限、橫幅顯示、儲存流程、後端合併、版位互換
node tests/ui_layout_check.js          # 已更新：最頂＝最新消息、活動橫幅＝會議預告
```
