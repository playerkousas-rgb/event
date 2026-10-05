# v19 童心捐贈「一次入數」：公眾自己部機出 QR，攤位掃一次就入帳

> 範圍：模擬示範版（`data/mock_demo.json` → `public_channel_2027`）＋工作人員端 `js/38-donations.js`。
> `data/isd_2026.json`、`data/isd_2027.json` 照舊凍結。

---

## 0. 要解決嘅問題

v18 嗰陣我做咗個公眾可以提交嘅表，你一眼就指出兩個真問題：

1. **公眾頁一提交就要駁後端** —— 公眾頻道本來係純看，一寫嘢就多一條要維護嘅路。
2. **更大鑊：又收紙又收 online** —— 兩邊都有數，完場對數好煩，仲會出現「同一個旅入咗兩次」。

你提出嘅做法正好一次過解決：**公眾喺自己瀏覽器填 → 自己部機產生 QR → 當日工作人員掃個 QR → 睇完核對完先錄入後端。**

```
公眾部手機                              攤位同事部機
┌──────────────┐                 ┌─────────────────────┐
│ 填名單        │                 │ 掃 QR               │
│ 產生 QR ──────┼─── 畫面／截圖 ──→│ 核對實物同件數       │
│ 零後端・零上傳 │                 │ 撳「確認收貨並入數」  │ ← 全場唯一一次寫入
└──────────────┘                 └─────────────────────┘
                                   紙本／口頭 ─┘（同一個畫面入返，同一本帳）
```

**結論：帳目永遠得一本，完場唔使對數。**

---

## 1. 公眾端（`js/44-public-channel.js`）

六類參加者入口嘅 **❤ 童心捐贈** 頁簽：

1. **📍 幾時・邊度交** — 2027-10-03（日）11:00–15:00・警察學院有蓋操場收集攤位
2. **🧭 四步流程** — ① 出門前填名單 → ② 撳「產生 QR」 → ③ 當日連貨交到攤位 → ④ 同事掃碼核對後即場派章
3. **揀計劃** — 🍚 食品捐贈（循道衛理觀塘社會服務處）／📦 物品回收（國際十字路會），卡面已見收／唔收摘要
4. **合規格自我檢查** — 完整 ✓ 收／✕ 唔收清單＋黃框規格（出門前知帶錯貨，唔使白行一趟）
5. **捐贈者名單** — 一行一位（姓名＋件數），底下即時計「位數／件數／應派紀念章」，>200 件自動提示特別紀念章，填咗件數冇姓名即時紅字
6. **產生 QR** — QR＋6 位校驗碼＋摘要＋「建議先截圖，場內冇網絡都出到」

### 零後端，係真係零

| 保證 | 點做到 | 邊度鎖住 |
|---|---|---|
| 唔寫籌委嗰本捐贈帳 | 公眾頻道源碼完全冇 `getDonationsData`／`saveDonationsData` | `donate_qr_test.js` ⑤ |
| 冇網絡請求 | QR 用本地 vendor `js/vendor/qrcode.min.js` 喺瀏覽器砌 SVG | `donate_qr_test.js` ⑤ |
| 草稿唔會撈亂 | 存喺獨立 key `pc_donate_draft_<event_id>` | `donate_qr_test.js` ⑤ |

> 報到 QR 嘅舊規矩**唔變**：報到 QR 照舊唔喺公開頁出，用電郵發俾負責領袖。呢個係**捐贈單 QR**，兩回事。

---

## 2. QR 載荷（`js/45-donate-qr.js`，新檔）

```
HKIRD1|f|港島第 6 旅|張國強|旅長|91234567|陳大文*12^李小明*250^黃小芳*5|9NQVDQ
└前綴  └計劃                                 └捐贈者*件數 ^ 分隔        └6 位校驗碼
```

| 特性 | 數字／做法 |
|---|---|
| 大細 | 3 位名單 **96 bytes**；30 位名單 **598 bytes** —— 手機一秒掃到 |
| 校驗碼 | 由載荷算出，字元集去走 B/I/O/S/Z（口頭報唔會撈亂） |
| 防改數 | 改件數或旅團 → 校驗碼對唔上 → **拒收** |
| 防重覆 | 同一載荷永遠同一個 code；入帳時存 `qr_code`，掃第二次直接擋 |
| 防爆 | 用家打咗 `\| ^ *` 會剝走，唔會整爛格式 |
| 唔相干 QR | 冇 `HKIRD1` 前綴 → 當唔識，唔會當成捐贈單 |

---

## 3. 工作人員端（`js/38-donations.js`）

「童心捐贈大行動」模組新增第一個分頁 **📷 掃碼收貨**（當日攤位最常用，所以排最前）：

- **掃描** — 原生 `BarcodeDetector` 行先（Android Chrome，最快最慳電）；冇就 **lazy-load jsQR**（本地 vendor，用到先至載，唔會拖慢公眾頁）
- **核對畫面** — 旅團／領袖／電話／逐位姓名件數（**件數可以就住實物改**）／位數・件數・應派章數／食品規格最後檢查提示
- **確認收貨並入數** — 寫入 `items[{name,quantity}]`，另加 `qr_code`、`source:'攤位掃碼'`、`received_by`（邊位同事收）
- **人手輸入** — 貼上載荷；紙本／口頭就撳「紙本・物品登記／紙本・食品登記」，**入同一本帳**
- 切分頁自動熄鏡頭

---

## 4. 改咗咩檔

| 檔案 | 改動 |
|---|---|
| `js/45-donate-qr.js` | **新檔**：載荷編碼／解碼、校驗碼、紀念章計算、掃描器（BarcodeDetector + jsQR 後備） |
| `js/vendor/jsqr.min.js` | **新檔**：jsQR 1.4.0（Apache-2.0），本地 vendor 唔靠 CDN，lazy-load |
| `index.html` | 掛載 `js/45-donate-qr.js` |
| `js/44-public-channel.js` | `pcDemoDonateHTML` 寫成填表＋本機出 QR；新增 `pcDonatePick/AddRow/DelRow/ReadForm/Totals/Recalc/Repaint/MakeQR/SaveDraft/LoadDraft`。**完全冇掂捐贈存檔** |
| `js/38-donations.js` | 新增「掃碼收貨」分頁：`renderDonScan / donScanToggle / donScanManual / donScanHandle / donScanReviewHTML / donScanConfirm / donScanCancel` |
| `tools/build_pc2027_demo.js` | `donate` 資料區：`collect`・`steps`（4 步）・`schemes`・`paper`・`privacy` |
| `tests/donate_qr_test.js` | **新檔**，40 項：codec／防改數／防重覆／紀念章／寫入邊界 |
| `tests/pc2027_public_channel_test.js` | ⑱ 重寫，296 → **339 項** |

---

## 5. 回歸測試

| 測試 | 結果 |
|---|---|
| `scripts/verify-project.js` | ✓ |
| `tests/donate_qr_test.js` | **40 項**（載荷 120 bytes・30 位名單 598 bytes） |
| `tests/pc2027_public_channel_test.js` | **339 項** |
| `tests/mock_demo_sync_test.js` | 139 ✓ |
| `tests/mock_demo_2026_fill_test.js` | 125 ✓ |
| `scripts/run-tests.js`（36 套） | 14 失敗＝同基線一樣，**冇新增失敗** |

**JSDOM 全鏈實跑**（公眾 landing → 旅團 → 童心捐贈 → 食品 → 填 3 位 → 出 QR → 切工作人員 → 掃同一載荷 → 確認入數）：

```
③ QR bytes: 96 | code: 9NQVDQ | donors: 3 items: 267
④ 真係畫咗 QR SVG: true
⑤ 公眾端冇寫過 donations: true
   草稿 key 獨立: pc_donate_draft_mock_demo
⑧ 寫入 food: 1 | qr_code:"9NQVDQ" source:"攤位掃碼" received_by:"鄧倩姸"
⑨ 再掃一次 → food 仍然: 1（唔會入兩次）
⑩ 改過嘅 QR: {"ok":false,"reason":"校驗碼對唔上（QR 花咗或被改過）"}
⑪ 唔相干 QR: null
ERRORS: none
```

---

## 6. 文字要改嘅時候

公眾頁所有文字（標題、四步說明、收／唔收清單、規格、紀念章規則、查詢電話、私隱說明）
全部喺同一個地方：`tools/build_pc2027_demo.js` 入面 `donate:` 嗰一舊。

改法：改嗰舊 → `node tools/build_pc2027_demo.js` → 全頁更新。唔使改程式邏輯。

用落如果有人覺得邊句寫得唔好、流程唔順，講個位出嚟改就得。

### 已知佔位（示範數據頂住先，正式版要換）

| 欄位 | 而家係乜 |
|---|---|
| `donate.paper.url` | 指住地域主頁，未係實際 PDF |
| `donate.collect.place` | 只寫「有蓋操場收集攤位」，未有攤位編號 |
| `donate.schemes[0].rules[]` | 食品最佳食用日期 2028-06-01，由 2026 原文順延一年 |

### 已定範圍

- **嘉賓入口冇呢一版**：嘉賓要捐通常係事前捐大額支票、由大會另行安排，唔會當日拎實物去排隊。
- 見到呢一版嘅六類：旅團、優異旅團獲獎、步操隊伍、其他制服團體、支部最高獎勵獲獎人士、成人獎勵獲獎人士。

### 技術側

- 鏡頭要 https 先開到；正式部署冇問題，內部測試用 `localhost` 一樣得。掃碼純本機運算，場內離線都掃到（寫入會等有網再同步 GAS）。
