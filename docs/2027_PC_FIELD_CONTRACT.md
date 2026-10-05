# 2027 欄位合約 — 公眾頻道（機械抽取）

> 由 `js/47-pc-content-editor.js` 嘅 `PC_CONTENT_SCHEMA` 自動產生，請勿手改本檔。
> 重新產生：`node tools/dump_field_contract.js > docs/2027_PC_FIELD_CONTRACT.md`

每一格都有名有主。負責組喺 APP 嘅「部門中心 → 🌐 公眾頻道內容」自己改，即改即生效。

## 協調組（17 格）

| 區塊 | 欄位 | 型別 | 資料路徑 |
|---|---|---|---|
| 全日程序 | 現時階段標示 | 單行文字 | `public_channel_2027.program.now_label` |
| 全日程序 | 現時時間 | 單行文字 | `public_channel_2027.program.now_time` |
| 全日程序 | 附註 | 多行文字 | `public_channel_2027.program.note` |
| 全日程序 | 程序項目 | 項目清單 | `public_channel_2027.program.items` |
| 全日程序 | 　└ 時間 | 單行文字 | `public_channel_2027.program.items[].time` |
| 全日程序 | 　└ 項目 | 單行文字 | `public_channel_2027.program.items[].title` |
| 全日程序 | 　└ 詳情 | 多行文字 | `public_channel_2027.program.items[].detail` |
| 交通與入場 | 地圖標題 | 單行文字 | `public_channel_2027.transport.map_title` |
| 交通與入場 | 地圖連結 | 單行文字 | `public_channel_2027.transport.map_url` |
| 交通與入場 | 入場提示 | 多行文字 | `public_channel_2027.transport.checkin` |
| 交通與入場 | 交通方式 | 項目清單 | `public_channel_2027.transport.items` |
| 交通與入場 | 　└ 方式／入口 | 單行文字 | `public_channel_2027.transport.items[].title` |
| 交通與入場 | 　└ 詳情 | 多行文字 | `public_channel_2027.transport.items[].detail` |
| 午膳安排 | 標題 | 單行文字 | `public_channel_2027.lunch.title` |
| 午膳安排 | 重點 | 多行文字 | `public_channel_2027.lunch.headline` |
| 午膳安排 | 附註 | 多行文字 | `public_channel_2027.lunch.note` |
| 午膳安排 | 安排 | 兩欄表（項目｜內容） | `public_channel_2027.lunch.rows` |

## 嘉賓接待組（7 格）

| 區塊 | 欄位 | 型別 | 資料路徑 |
|---|---|---|---|
| 嘉賓專屬安排 | 標題 | 單行文字 | `public_channel_2027.banner_guest.title` |
| 嘉賓專屬安排 | 安排 | 兩欄表（項目｜內容） | `public_channel_2027.banner_guest.rows` |
| 嘉賓最後一分鐘變動 | 經驗教訓 | 多行文字 | `public_channel_2027.guest_lastmin.lesson` |
| 嘉賓最後一分鐘變動 | 變動實錄 | 項目清單 | `public_channel_2027.guest_lastmin.events` |
| 嘉賓最後一分鐘變動 | 　└ 日期 | 單行文字 | `public_channel_2027.guest_lastmin.events[].date` |
| 嘉賓最後一分鐘變動 | 　└ 發生咩事 | 單行文字 | `public_channel_2027.guest_lastmin.events[].label` |
| 嘉賓最後一分鐘變動 | 　└ 詳情 | 多行文字 | `public_channel_2027.guest_lastmin.events[].detail` |

## 會操及典禮組（21 格）

| 區塊 | 欄位 | 型別 | 資料路徑 |
|---|---|---|---|
| 典禮儀式流程 | 標題 | 單行文字 | `public_channel_2027.ceremony_flow.title` |
| 典禮儀式流程 | 場地 | 單行文字 | `public_channel_2027.ceremony_flow.venue` |
| 典禮儀式流程 | 服裝 | 單行文字 | `public_channel_2027.ceremony_flow.dress` |
| 典禮儀式流程 | 敬禮提示 | 多行文字 | `public_channel_2027.ceremony_flow.salute_note` |
| 典禮儀式流程 | 附註 | 多行文字 | `public_channel_2027.ceremony_flow.note` |
| 典禮儀式流程 | 公眾注意 | 多行文字 | `public_channel_2027.ceremony_flow.public_note` |
| 座位表 | 標題 | 單行文字 | `public_channel_2027.seating.title` |
| 座位表 | 副題 | 單行文字 | `public_channel_2027.seating.subtitle` |
| 座位表 | 台嘅標示 | 單行文字 | `public_channel_2027.seating.stage_label` |
| 座位表 | 搵自己位嘅說明 | 多行文字 | `public_channel_2027.seating.my_seat` |
| 座位表 | 座位規則 | 清單（一行一項） | `public_channel_2027.seating.rules` |
| 午膳儀式（嘉賓） | 標題 | 單行文字 | `public_channel_2027.mess_ceremony.title` |
| 午膳儀式（嘉賓） | 副題 | 單行文字 | `public_channel_2027.mess_ceremony.subtitle` |
| 午膳儀式（嘉賓） | 時間 | 單行文字 | `public_channel_2027.mess_ceremony.time` |
| 午膳儀式（嘉賓） | 司儀 | 單行文字 | `public_channel_2027.mess_ceremony.mc` |
| 午膳儀式（嘉賓） | 引言 | 多行文字 | `public_channel_2027.mess_ceremony.intro` |
| 午膳儀式（嘉賓） | 提示 | 清單（一行一項） | `public_channel_2027.mess_ceremony.reminders` |
| 午膳儀式（嘉賓） | 流程 | 項目清單 | `public_channel_2027.mess_ceremony.rows` |
| 午膳儀式（嘉賓） | 　└ 時間 | 單行文字 | `public_channel_2027.mess_ceremony.rows[].time` |
| 午膳儀式（嘉賓） | 　└ 內容 | 單行文字 | `public_channel_2027.mess_ceremony.rows[].item` |
| 午膳儀式（嘉賓） | 　└ 對象 | 單行文字 | `public_channel_2027.mess_ceremony.rows[].who` |

## 服務及發展組（24 格）

| 區塊 | 欄位 | 型別 | 資料路徑 |
|---|---|---|---|
| 童心捐贈 | 標題 | 單行文字 | `public_channel_2027.donate.title` |
| 童心捐贈 | 大字標語 | 單行文字 | `public_channel_2027.donate.tagline` |
| 童心捐贈 | 點解要捐 | 多行文字 | `public_channel_2027.donate.why` |
| 童心捐贈 | 邊個可以捐 | 多行文字 | `public_channel_2027.donate.eligible` |
| 童心捐贈 | 收集日期 | 單行文字 | `public_channel_2027.donate.collect.date` |
| 童心捐贈 | 收集時間 | 單行文字 | `public_channel_2027.donate.collect.time` |
| 童心捐贈 | 收集地點／攤位編號 | 單行文字 | `public_channel_2027.donate.collect.place` |
| 童心捐贈 | 四步流程 | 項目清單 | `public_channel_2027.donate.steps` |
| 童心捐贈 | 　└ 標題 | 單行文字 | `public_channel_2027.donate.steps[].t` |
| 童心捐贈 | 　└ 說明 | 多行文字 | `public_channel_2027.donate.steps[].d` |
| 童心捐贈 | 捐贈計劃 | 項目清單 | `public_channel_2027.donate.schemes` |
| 童心捐贈 | 　└ 計劃名稱 | 單行文字 | `public_channel_2027.donate.schemes[].name` |
| 童心捐贈 | 　└ 受惠機構 | 單行文字 | `public_channel_2027.donate.schemes[].beneficiary` |
| 童心捐贈 | 　└ 機構說明 | 單行文字 | `public_channel_2027.donate.schemes[].beneficiary_note` |
| 童心捐贈 | 　└ ✓ 收呢啲 | 清單（一行一項） | `public_channel_2027.donate.schemes[].accept` |
| 童心捐贈 | 　└ ✕ 唔收呢啲 | 清單（一行一項） | `public_channel_2027.donate.schemes[].reject` |
| 童心捐贈 | 　└ 規格要求 | 清單（一行一項） | `public_channel_2027.donate.schemes[].rules` |
| 童心捐贈 | 　└ 紀念章規則 | 單行文字 | `public_channel_2027.donate.schemes[].badge` |
| 童心捐贈 | 　└ 查詢 | 單行文字 | `public_channel_2027.donate.schemes[].enquiry` |
| 童心捐贈 | 紙本表格掣文字 | 單行文字 | `public_channel_2027.donate.paper.label` |
| 童心捐贈 | 紙本表格連結 | 單行文字 | `public_channel_2027.donate.paper.url` |
| 童心捐贈 | 紙本表格說明 | 多行文字 | `public_channel_2027.donate.paper.note` |
| 童心捐贈 | 私隱說明 | 多行文字 | `public_channel_2027.donate.privacy` |
| 童心捐贈 | 頁尾備註 | 多行文字 | `public_channel_2027.donate.note` |

## 秘書處（1 格）

| 區塊 | 欄位 | 型別 | 資料路徑 |
|---|---|---|---|
| 通知書規則 | 規則說明 | 多行文字 | `public_channel_2027.notice_rule` |

## 行政組（17 格）

| 區塊 | 欄位 | 型別 | 資料路徑 |
|---|---|---|---|
| 活動基本資訊 | 標籤 | 單行文字 | `public_channel_2027.banner.tag` |
| 活動基本資訊 | 活動名稱 | 單行文字 | `public_channel_2027.banner.event_name` |
| 活動基本資訊 | 英文名稱 | 單行文字 | `public_channel_2027.banner.en_name` |
| 活動基本資訊 | 日期 | 單行文字 | `public_channel_2027.banner.date` |
| 活動基本資訊 | 時間 | 單行文字 | `public_channel_2027.banner.time` |
| 活動基本資訊 | 地點 | 單行文字 | `public_channel_2027.banner.location` |
| 活動基本資訊 | 惡劣天氣安排 | 多行文字 | `public_channel_2027.banner.weather_rule` |
| 活動基本資訊 | 最新消息 | 多行文字 | `public_channel_2027.banner.news.text` |
| 活動基本資訊 | 消息日期 | 單行文字 | `public_channel_2027.banner.news.updated_at` |
| 活動基本資訊 | 消息發布者 | 單行文字 | `public_channel_2027.banner.news.updated_by` |
| 求助 | 大會熱線 | 單行文字 | `public_channel_2027.help.hotline` |
| 求助 | 急救站 | 單行文字 | `public_channel_2027.help.first_aid` |
| 求助 | 失物處理 | 單行文字 | `public_channel_2027.help.lost_found` |
| 報到 QR 規則 | 標題 | 單行文字 | `public_channel_2027.checkin_qr_rule.headline` |
| 報到 QR 規則 | 說明 | 多行文字 | `public_channel_2027.checkin_qr_rule.detail` |
| 報到 QR 規則 | 要點 | 清單（一行一項） | `public_channel_2027.checkin_qr_rule.points` |
| 共同須知（七類都見到） | 共同須知 | 兩欄表（項目｜內容） | `public_channel_2027.guide_common` |

## 結構（鎖死，組改唔到）

以下屬於**框**唔係**內容**：分眾入口、頁簽組合、欄位名、名單之間點連。改呢啲等於改規矩，要經技術組。

`public_channel_2027.audiences`、`public_channel_2027.section_labels`、`public_channel_2027.guides`、`public_channel_2027.notices`、`public_channel_2027.schedules`、`public_channel_2027.arrivals`、`public_channel_2027.manual`、`public_channel_2027.guests_rows`、`public_channel_2027.booths`、`public_channel_2027.venue_map`、`public_channel_2027.apply_forms`、`public_channel_2027.intake_forms`、`public_channel_2027.staff_gate`、`public_channel_2027.upload_slots`、`public_channel_2027.checkin_demo`

