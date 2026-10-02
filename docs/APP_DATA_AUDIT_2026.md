# 2026 APP 現況盤點（資料置入前基準）

本文件只記錄現有結構，不新增功能。

## 已有功能模組

- `js/00-config.js`：已載入；約 20 個 prototype 方法
- `js/10-app-core.js`：已載入；約 80 個 prototype 方法
- `js/11-news.js`：已載入；約 8 個 prototype 方法
- `js/20-accounts.js`：已載入；約 20 個 prototype 方法
- `js/21-activities.js`：已載入；約 73 個 prototype 方法
- `js/22-meals.js`：已載入；約 18 個 prototype 方法
- `js/23-sync.js`：已載入；約 18 個 prototype 方法
- `js/24-supplies.js`：已載入；約 49 個 prototype 方法
- `js/25-vehicle.js`：已載入；約 16 個 prototype 方法
- `js/26-monitor-apply.js`：已載入；約 40 個 prototype 方法
- `js/27-parking.js`：已載入；約 13 個 prototype 方法
- `js/28-oral-quotes.js`：已載入；約 12 個 prototype 方法
- `js/30-finance.js`：已載入；約 25 個 prototype 方法
- `js/31-staff.js`：已載入；約 26 個 prototype 方法
- `js/32-meetings.js`：已載入；約 58 個 prototype 方法
- `js/33-users.js`：已載入；約 43 個 prototype 方法
- `js/34-announcements.js`：已載入；約 18 個 prototype 方法
- `js/35-ceremony.js`：已載入；約 41 個 prototype 方法
- `js/36-crisis.js`：已載入；約 52 個 prototype 方法
- `js/37-coordinator.js`：已載入；約 36 個 prototype 方法
- `js/38-donations.js`：已載入；約 20 個 prototype 方法
- `js/39-lost-found.js`：已載入；約 25 個 prototype 方法
- `js/40-souvenir-stamps.js`：已載入；約 23 個 prototype 方法
- `js/41-roster-lists.js`：已載入；約 51 個 prototype 方法
- `js/90-bootstrap.js`：已載入；約 0 個 prototype 方法

## 2026 JSON 狀態

| 區域 | 狀態 |
|---|---|
| `staff` | 已有資料容器，項目／欄位數 9 |
| `activities` | 已有資料容器，項目／欄位數 6 |
| `participants` | 已有資料容器，項目／欄位數 0 |
| `schedule` | 已有資料容器，項目／欄位數 0 |
| `meals` | 已有資料容器，項目／欄位數 0 |
| `supplies` | 已有資料容器，項目／欄位數 3 |
| `guest_roster` | 已有資料容器，項目／欄位數 16 |
| `guest_transport` | 已有資料容器，項目／欄位數 6 |
| `documents` | 已有資料容器，項目／欄位數 77 |
| `crisis` | 已有資料容器，項目／欄位數 11 |

## 已確認的正式來源

- 嘉賓：CSV，103 位，已置入 `guest_roster.guests`。
- 工作人員：`ISD2026 staff list ver2 (FROZEN).xlsx`，已登記來源，尚未把來源內容強行覆蓋現有 staff 結構。
- 外間團體：未提供姓名的欄位保留空白，不自行推算。

## 目前資料置入缺口

- 工作人員 frozen 檔案與既有 `staff`／名單點名欄位的逐欄對應及安全匯入。
- 旅團／派隊正式名單的結構化內容。
- 日程表的結構化內容。
- 膳食名單的結構化內容。
- 攤位資料與 `activities` 現有欄位的安全對應。

## 約束

- 不新增與現有功能重複的頁面或點名引擎。
- 正式來源資料與現場修訂資料分開。
- 嘉賓只可點名／加名；工作人員才可換人／更正。

## Progress

- Completed: structure audit, guest roster import, guest check-in connection, baseline integration validation.
- Next: staff frozen roster placement into existing staff/check-in structures.

## 2027 預備（不啟用於 2026）

已登記 5 份 ISD PDF 作為 2027 旅團自助申報及取代舊 Google Forms 的來源；目標模組包括旅團報名、優異旅團出席、餐盒、交通及活動資料。2026 繼續沿用現行舊方法。
