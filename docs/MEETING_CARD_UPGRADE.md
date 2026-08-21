# 會議卡片全面升級 - v6.1

> 根據用戶需求：管理員上傳議程及紀錄、所有籌委可觀看、分次會議、上傳會員資料、權限控制、下載

## 0-A. 內建議程／會議紀錄 JSON（v8.3，免彈出 Drive APP）

> 需求：「唔想彈出 APP……可以將議程紀錄轉為 JSON 內建嗎？唔係同去 Drive 睇有咩分別。」

- **資料檔**：`data/meeting_records.json`（隨 APP 發佈，離線可讀）
  - 結構：`meetings[] = { meeting_id, meeting_number, title, date, time, location, chair, recorder, content_status, agenda_items[{no,topic,presenter,notes}], minutes_sections[{heading,points[]}], decisions[], action_items[{item,owner,due}], source{...} }`
  - `content_status`：`summary`（摘要／重點版）或 `full`（已錄入全文）→ 卡片會顯示對應徽章。
- **讀取**：`loadEventData()` 內 `await this.loadMeetingRecords()`；本機編輯版本（localStorage `isd_meeting_records_{event_id}`）會覆蓋內建版本。
- **頁內閱讀（無彈窗）**：每張會議卡片有三個按鈕，直接喺卡片內展開，唔會開新分頁／Drive APP
  - 「議程（內建·即睇）」→ `renderBuiltInAgendaHtml()`：議程表（項次／議題／負責）
  - 「會議紀錄（內建·即睇）」→ `renderBuiltInMinutesHtml()`：重點分段 + 議決事項 + 跟進事項表
  - 「檔案（頁內預覽）」→ `renderMeetingFilesHtml()` + `toggleInlineDrivePreview()`：Drive PDF 以頁內 `iframe .../preview` 打開
- **摘要為主、全文按需**（用戶定案）：內建 JSON 只放摘要／重點；每個議程／紀錄面板底部有「睇全文（頁內開啟）／下載原檔／Drive 開啟 ↗」，用家主動按先會載入原檔（`builtInFullTextBar()`，卡片與詳情各自獨立容器 id）。
- **下載唔再彈 Drive APP**：`downloadDriveFile()` 用隱藏 iframe 觸發 `uc?export=download`，會議詳情、附件、組資料、打包下載全部改用此方法。
- **會議詳情**：議程／紀錄分頁直接渲染內建 JSON 內容；檔案區由「開啟」改為「頁內預覽 + 下載」。
- **秘書處更新流程**：管理員 → 會議卡片 → 右上「內建議程 JSON」→ 直接改 JSON → 「儲存到本機並套用」即時預覽 → 「匯出 JSON」覆蓋 `data/meeting_records.json` 發佈；「還原內建版本」可清走本機覆蓋。
- **測試**：`node tests/user_visibility_and_meeting_records_test.js`

## 0. ISD 2026 會議 Drive 即時同步（原有分頁，仍保留）

- 點擊「會議卡片」會直接開啟公開 Drive 根目錄 `13P0gJ3c-1zXTzniZFZL6VT2EZP_FDTYM`，毋須先進入本地會議列表。
- 畫面按 0 Pre-Meeting、第1次、第2次等子資料夾排列議程、會議紀錄及附件；可切換清單／內嵌模式。
- 秘書處直接在該 Drive 上載或更新檔案後，使用者重新進入卡片或按「重新整理（讀取最新）」即可看到變更。
- 正式環境由 GAS `listDriveFolder` 以 `UrlFetchApp` 讀取公開內容；未連後端時使用 Google Drive 內嵌資料夾。資料夾及檔案必須設為「知道連結的任何人可查看」。
- 原有本地／Sheet 會議列表仍保留在「會議列表」分頁，供結構化會議紀錄及權限功能使用。

## 1. 管理員上傳議程及會議紀錄，所有籌委可觀看

- **權限**：`isAdmin()` = super_admin / advisor / admin / chairperson 才可新增/編輯會議、上傳議程/紀錄
- **上傳**：會議表單內
  - 議程文字 `agenda` + 議程檔案 `agenda_file` (PDF/Word/PPT/Excel/圖片) → 存為 base64 DataURL，全前端，支援下載
  - 會議紀錄文字 `minutes` + 紀錄檔案 `minutes_file`
  - 附加文件 `attachments` 多檔上傳
- **觀看**：所有籌委成員點擊會議卡片進入詳情，分頁：議程 / 紀錄 / 文件下載 / 各組會員資料
  - 卡片顯示：會議次數徽章、第X次、標題、日期時間地點、記錄人、可見度徽章、議程/紀錄/附件/組資料數量
  - 手機友善：卡片式，點擊進入

## 2. 分不同會議上傳及觀看 (第1次第2次第3次)

- **會議次數欄位** `meeting_number`：0=第0次預備, 1=第1次, 2=第2次, 3=第3次, 4=第4次(下次), 5,6,99=特別/臨時
- **列表**：按 `meeting_number` 升序 + 日期排序，自動分組顯示
- **篩選**：頂部搜尋框可搜尋「第2次」或標題；可見度篩選
- **儲存**：`event_meetings_v6_{event_id}` localStorage，Mock 模式全前端；GAS 模式透過 `saveRecord` 寫入 `Meetings` Sheet (已升級表頭 25 欄，自動補欄位不覆蓋舊資料)

## 3. 各組總主任上傳會員資料，管理員決定可見度

- **上傳權限**：`canUploadGroup()` = general_director 及以上 (Level >=40) 包括 general_director, vice_chairperson, chairperson, admin, advisor, super_admin
- **上傳表單** (會議詳情 → 各組會員資料 分頁)：
  - 組別 * (例如 主題節目組)
  - 標題 * (會員名單/分工表)
  - 會員資料文字 (可貼上名單、聯絡)
  - 檔案 (Excel/Word/PDF)
  - 可見度 (管理員可後續更改)
    - `public` 公開 - 全部與會者可看
    - `private` 僅管理員 (整理用) - 其他人不可見，但管理員可下載統計
    - `attendees` 僅主任或以上
- **管理員控制**：
  - 在組資料列表，每筆可下拉改可見度 `changeGroupVisibility()`
  - 可刪除任意組資料
  - 私有資料僅管理員可見，非管理員過濾
- **下載**：每筆組資料獨立下載按鈕；若僅文字，自動生成 txt 下載

## 4. 所有會議文件同時可提供下載功能

- **單個下載**：
  - 議程檔案 `downloadCurrentMeetingFile('agenda')`
  - 紀錄檔案 `downloadCurrentMeetingFile('minutes')`
  - 附件 `downloadAttachment(meetingId,fileId)`
  - 組資料 `downloadGroupFile(meetingId,uploadId)`
- **打包下載**：
  - 單場會議：`downloadAllMeetingFiles(meetingId)` 逐個彈出下載 (瀏覽器限制，需逐個，延遲 400ms)
  - 全部會議：`downloadAllMeetingsFiles()` 打包下載全部會議的議程、紀錄、附件，按 `第X次_檔名` 命名
  - 匯出 JSON：`exportMeetings()` 匯出全部會議資料 JSON 備份
- **實作**：`downloadDataUrl(fileName,dataUrl)` 創建 `<a download>` 觸發，DataURL 來自 FileReader `readAsDataURL`

## 手機友善

- 會議卡片：`.meeting-card` 卡片排版，點擊進入詳情，44px 按鈕
- 詳情 Modal：Bottom Sheet 88vh，頂部黏性 Tab 切換 (`tab-btn`)，內容可滾動
- 文件 Chip：`.file-chip` 圓形標籤，顯示文件類型
- 可見度徽章：`visibility-public/private/attendees` 顏色區分

## 後端變更

- `apps-script/Code.gs` Meetings Sheet 表頭從 8 欄升級至 25 欄：`meeting_number,time,location,status,visibility,agenda_file_name,data,minutes_file_name,data,attachments_json,group_uploads_json...`
- `ensureSheet` 自動補欄位，不覆蓋舊資料 (非破壞性)
- 前端 `saveMeetings()` 同時寫 localStorage + GAS `saveRecord` (若非 Mock)

## 使用流程

1. 管理員登入（帳密僅存後端 SCRIPT）→ 進入活動 → 會議卡片
2. 右上「新增會議」→ 選擇第X次 → 標題日期地點 → 可見度 (公開/僅管理員/僅主任以上) → 上傳議程/紀錄檔案 → 保存 (全前端)
3. 所有籌委登入 → 會議卡片 → 點擊卡片 → 查看議程/紀錄分頁 → 下載文件
4. 各組總主任登入 (梁文澧 general_director 等) → 會議詳情 → 各組會員資料分頁 → 上傳本組會員資料 → 選擇可見度
5. 管理員 → 同一分頁 → 改可見度 (下拉) → 決定是否全部與會者可看或僅管理員整理用 → 下載統計

COPYRIGHT 2026 Scout System
