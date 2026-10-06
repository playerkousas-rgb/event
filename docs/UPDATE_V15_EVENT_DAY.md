# v15 — 公眾頻道 2027（示範）改為「活動日版」＋頁簽化

> 範圍：**只改模擬示範版（`mock_demo`）**。2026（凍結）／2027（範本）完全不受影響
> （全部內容仍由 `requiresData: 'public_channel_2027'` gating，只有 `data/mock_demo.json` 有呢個 key）。
> 階段：**UI 先行，資料全部 MOCK**。

資料來源（source of truth）＝ `tools/build_pc2027_demo.js` → 執行後寫入 `data/mock_demo.json`。
**改內容請改 builder，然後 `node tools/build_pc2027_demo.js`**，唔好直接手改 JSON。

---

## 逐項對照（19 點）

| # | 要求 | 做咗乜 |
|---|------|--------|
| 1 | 先集中處理 UI，可以全用 MOCK | 全部內容寫死喺 builder（2026 真實資料整理），冇接後端 |
| 2 | 喺「模擬示範版」度改 | 只動 `mock_demo.json` ＋ `js/44-public-channel.js`；其他活動照舊 |
| 3 | 一入就直接入「公眾頻道 2027（示範）」 | `js/10-app-core.js` 新增 `autoEnterPublicDemo()`，`init()` 自動進入 `mock_demo` → 未登入即顯示公眾頻道。想返活動選擇頁＝按最頂 BAR 營帳圖示 |
| 4 | 刪走「參與／報名」 | `apply` 分節由全部七類受眾移除；`pcDemoApplyForHTML`／`pcDemoApplyHTML` 已刪；委員「一頁睇晒」亦刪走「報名」頁簽 |
| 5 | 活動基本盤 → **基本資訊** | `section_labels.banner` |
| 6 | 你的時間表 → **日程** | `section_labels.schedule` |
| 7 | 你的須知 → **須知** | `section_labels.guide` |
| 8 | 活動日求助 → **求助** | `section_labels.help` |
| 9 | 點入去要有**頁簽**，唔好長長一版拖拉 | `pcDemoAudienceBody()` 改為頁簽制：黐頂（避開最頂 BAR）嘅橫向捲動 chip 列＋`#pc-aud-panel` 一次只 render 一頁＋底部「上一頁／下一頁」 |
| 10 | 刪走名額（2,000 人）／費用（HK$10） | `banner.quota`／`banner.fee` 由數據移除，基本資訊卡亦刪走嗰兩格 |
| 11 | 每個參加者要有自己嘅地圖，知道去邊報到、路線點走 | 報到資訊頁簽內：報到點大字卡 ＋ 自己路線（虛線①②③）＋📍報到點脈衝 ＋ 逐步路線清單（最後一步紅色＝報到點） |
| 12 | 報到 QR **唔可以喺度顯示**，要電郵俾負責領袖 | 公開頁完全冇 QR（`pcDemoQrHTML`／`pcQrCycle` 已刪、`qr` 分節移除）。改為「📧 報到 QR Code 已電郵給負責領袖」卡：收件人／主旨／發送時間／掃描後會見到乜（`checkin_qr_rule` ＋ `arrivals.troop.qr_email`）|
| 13 | 旅團／所有參加者都要有活動地圖 | 新分節 `venue`＝**活動地圖**，七類受眾全部都有 |
| 14 | 報到與地圖 → **報到資訊** | `section_labels.arrival` |
| 15 | 加入**活動地圖** | 全場地圖（彩色分區）＋場內設施位置（洗手間／急救站／失物認領／飲水站／查詢處／餐盒區／穿梭巴士／停車場）＋圖例＋官方場地指示圖下載 |
| 16 | 嘉賓加入**座位表** | 新分節 `seating`：檢閱台方向示意圖＋A–F 分區＋「你的座位」（示範 B07）＋就座須知 |
| 17 | 所有人加入**典禮儀式流程** | 新分節 `ceremony`：第一部分（優異旅團及各項獎勵頒發）＋第二部分（會操檢閱暨步操比賽頒獎）；第三部分（莫榮大樓）標示 `guest_only`，只有嘉賓睇到。內容出自 Rundown Part 1 V5 ＋ 司儀稿（頒獎 V5／會操檢閱 V4） |
| 18 | 嘉賓加入**午膳安排** | 新分節 `lunch`：13:00–14:00 莫榮大樓地下 茶水部（Officer Mess）、形式／入場／座位／特別膳食／散席；並講明旅團用代訂餐盒 |
| 19 | 嘉賓加入**午膳儀式**（Officer Mess 小型典禮） | 新分節 `mess`：出自「3_司儀稿_莫榮大樓自助餐 V2」——13:30 致送感謝狀予三個青少年制服團隊代表、13:40 致送紀念品予會操檢閱官、13:45 合照；另有致送名單＋注意事項 |

---

## 每類受眾嘅頁簽

| 受眾 | 頁簽 |
|------|------|
| 嘉賓 | 基本資訊・日程・報到資訊・活動地圖・典禮儀式流程・**座位表**・**午膳安排**・**午膳儀式**・須知・求助（10 個）|
| 旅團／優異旅團獲獎／步操隊伍／其他制服團體／支部最高獎勵／成人獎勵 | 基本資訊・日程・報到資訊・活動地圖・典禮儀式流程・須知・求助（7 個）|

---

## 改咗嘅檔案

- `tools/build_pc2027_demo.js`（**源頭**：新增 `ceremony_flow`／`seating`／`lunch`／`mess_ceremony`／`checkin_qr_rule`／`venue_map.facilities`＋`legend`；刪 `banner.quota`／`banner.fee`；改 `section_labels`／`audiences[].sections`）
- `data/mock_demo.json`（由 builder 重新產生）
- `js/44-public-channel.js`（頁簽制＋5 個新 section renderer＋報到資訊改版＋刪報名／公開 QR）
- `js/10-app-core.js`（`autoEnterPublicDemo()`）
- `index.html`（`.no-scrollbar` / `.pc-tabbar` 樣式）
- `tests/pc2027_public_channel_test.js`（264 項，新增 ⑰ 活動日版驗收）

## 回歸測試

```bash
node tests/pc2027_public_channel_test.js     # 264 項
node tools/build_pc2027_demo.js              # 重新產生示範數據
```

## 仲未做（生產版待接）

- 座位表／午膳名單／嘉賓個人座位，生產版要由嘉賓名單＋典禮組座位表自動帶出（示範版寫死 B07）。
- 報到 QR 電郵，生產版要由後端（GAS）按報名時填嘅負責領袖電郵發出＋記錄發送時間。
- 每類受眾嘅專屬標註地圖，生產版由籌委提供源點（報到點＋路線節點）自動產生。
