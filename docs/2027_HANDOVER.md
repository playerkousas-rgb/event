# 2027 交接文件（HANDOVER）— 俾下一個 Agent

> **你嘅任務**：令**所有參加者喺活動當日用手機睇到最新資訊**。
> 階段 0–2 已完成（本文件講明現狀＋你嘅彈藥庫＋建議路線）。
> 日期：2026-10-05｜repo：`playerkousas-rgb/event`｜branch：`arena/01a1066c-event` → 經 PR 合併入 `main`

---

## 一、點解有呢個任務（核心論據，講俾任何人聽都得）

2026 活動**啱啱完**（10月4日）。用戶 10月5日上載咗三個檔案做證據：

| 檔案 | 證明乜嘢 |
|---|---|
| `Seating Plan_20261004_V8.pdf` | 嘉賓席座位表改到**第 8 版，活動當日先 Final** |
| `嘉賓名單 as at 03.10.2026.xlsx` | **活動前一日**仲加人（王偉傑・伍麗明・胡廖可儀＝區Sir師母）、改職銜（區Sir→助理處長）、AWARD→具體獎名 |
| `嘉賓名單 as at 02.10.2026.csv` | 底部手寫合計 97/95，實際逐格加 96/94（人手合計冇人更新） |

**結論**：最後一分鐘變動係常態。印刷品、電郵附件、WhatsApp 派檔——派咗出去就追唔到。
**唯一解**：參加者手機上嘅活體出口（APP 公眾頻道），源頭一改全站即變。
呢個論據已寫入 APP「嘉賓接待站」嘅「⏱️ 2026 實錄」卡同 `docs/2027_SOURCE_MAP.md` 教訓表。

## 二、已建成（點樣運作）

### 制度（三層分工）
```
源頭（Drive/表格） ← 新籌委只做：出內容 → 撳 APP 上傳掣（原名原檔・連 Drive 都唔使入）
出口（APP）        ← 系統自動：七類入口渲染・攞最新・公眾免登入
傳播（QR/Link）    ← 我哋預先設定：通知書信模板預印 QR・APP 入口即 link；籌委零傳播動作
```

### APP 內容（`index.html`，mock_demo 示範，205 項測試鎖實）
- **七類分眾入口**（`?pub=guest/troop/merit/march/ug/awardee_section/awardee_adult`）：各有時間表・報到地圖（示意圖路線）・須知・通知書掣
- **旅團報到 QR**（T001–T031，報名自動生成 T032+）＋**報到站**（工作人員掃碼→人數・餐盒→確認）
- **源頭上傳中心**：15 個掣（7 通知書＋7 場地圖＋1 座位表）→ 後端 Drive 指定資料夾・攞最新
- **嘉賓接待站**：102 位真實 2026 嘉賓（搜尋・分類・頒獎台/大會車/茶聚一鍵篩・接待報到）
- **八大報名表（階段 2）**：免登入提交→申請編號；旅團報名→**T 編號・報到 QR・人數・餐盒一條血脈**；工作人員「報名總覽」＋名額自動着燈（2,000 人／700 餐盒）
- 執行手冊（14 分頁）、攤位、失物、危機處理等原有功能全部保留

### 數據源頭（真實 Drive）
- **ISD 2026 folder**（證據庫）：`1hyzzIuRGxEh9iya4YvcIsKyfCAZ3sVlG`
- **ISD 2027 folder**（範本）：`1qzaHkoua5Se2rOn1z6LljVmlIq-oae3Q` —— 已按 SOURCE_MAP 樹預建 `01_報名`…`99_模板` 資料夾
- 資料夾樹 + 源頭→APP 對應表：`docs/2027_SOURCE_MAP.md`（v0.4）

### 生產後端（寫好待部署）
- `apps-script/Code.gs`：`onIntakeSubmit`（Google Forms 提交觸發）→ `Public_2027_Intake` Sheet → 旅團自動出 T 編號 → `sendIntakeConfirmation` 電郵骨架。部署步驟喺代碼註釋。
- 既有：`listDriveFolder`（公開唯讀讀 Drive）、`autoSyncDriveSources`（`js/21-activities.js`）、Roster_Lists v14 引擎、`data/*_template.xlsx`×8

## 三、你嘅任務拆解（建議次序）

1. **部署生產鏈**：開 8 個 Google Forms（欄位照 `docs/2027_FIELD_CONTRACT.md` §3＋`js/44` intake_forms）→ 接 GAS 觸發器 → 表單 ID 填入 `INTAKE_FORM_MAP`
2. **通知書模板預印 QR**：`99_模板/` 出 7 款信尾模板（每類人專屬 `?pub=xxx` QR）——秘書只改內文
3. **觸達策略（任務核心）**：
   - 每類人收到嘅正式通知書（地域格式）信尾已印專屬 QR → 一掃入自己入口
   - 報名確認電郵自動附 APP link＋T 編號
   - 旅團領袖轉發俾家長嘅係入口 link（唔係檔案）
   - 活動當日：入口「而家進行緊」＋天氣規則（前 3 小時紅雨/8號波→延期）自動頂置
   - 場地印刷品（場地圖・遊戲卡）全部預印同一入口 QR
4. **當日 live 模式**：工作人員端改動（座位表 V8 嗰類）→ 上傳掣 → 全參加者即時見
5. **完場凍結** → 2028 示範資料（照 v15.1 機制）

## 四、開發慣例（唔好破壞）

- 測試：`node tests/pc2027_public_channel_test.js`（205 項）＋全套 `for t in tests/*.js`（基線 21/14，14 個 FAIL 係 2026 舊 demo 嘅預期基線，**唔好修**）
- 改 `js/` 之後：`node --check`＋`sed -i 's/?v=OLD/?v=NEW/g' index.html`（cache-bust，29 處）＋ rebuild `node tools/build_pc2027_demo.js`
- 數據改動一律改 `tools/build_pc2027_demo.js` 再 rebuild，**唔好直接改 `data/mock_demo.json`**
- 用戶鍾意：結果先行（交「成品」唔係交「機制」）・廣東話回覆・真實 2026 數據打底
- 用戶定案：QR 只有旅團；示意圖唔使真圖；優異旅團專屬櫃位；march 08:00；通知書＝秘書出嘅正式信做源頭（APP 唔生成 PDF）；連結全部預先貼好

## 五、關鍵檔案索引

| 檔案 | 內容 |
|---|---|
| `docs/2027_FIELD_CONTRACT.md` | 欄位合約（八大表欄位・資料流・待決問題 5 條） |
| `docs/2027_SOURCE_MAP.md` | 源頭地圖（制度・資料夾樹・對應表） |
| `tools/build_pc2027_demo.js` | 全部示範數據源頭（改呢度→rebuild） |
| `js/44-public-channel.js` | 公眾頻道＋報到站＋上傳中心＋接待站＋報名表 |
| `js/00-config.js`／`js/10-app-core.js` | 卡片定義＋接線（三個位：title/dispatch/requiresData） |
| `tests/pc2027_public_channel_test.js` | 205 項測試 |
| `google_drive/` | 2026 真實檔案快照（病徵證據） |

— 完。祝順利，記住：**唔係俾佢哋更多工具，係俾參加者一個掣掣都唔使㩒嘅最新資訊。**

## 六、真實 Drive 資料夾 ID（2026-10-05 已建好，直接用）

ISD 2027 root：`1qzaHkoua5Se2rOn1z6LljVmlIq-oae3Q`
（ GAS 寫入時用 `DriveApp.getFolderById()`；「攞最新」＝`getFiles()` 按 `getLastUpdated()` 排）

| 資料夾 | ID |
|---|---|
| 01_報名 | `1CW5QljmlMUKQa69vNQwkMb_1EvKkF59n` |
| 02_通知書 | `1AmFGWgduaiFDwQ7vnG4R3ny0W4moCR8S` |
| ├ 01_嘉賓 | `1Y4Pw57NqddEWRVT6c_E0SrdKLTppFdC3` |
| ├ 02_旅團 | `1qCWdMevEt7n3qBuCZyFezM1_DtSxnL5b` |
| ├ 03_優異旅團獲獎 | `1s1_4OeIv1GPgkP5pPyiFrUECLH7FrR2g` |
| ├ 04_步操隊伍 | `1V82H1K6B8Q9D-wZyu9mJrXTTpt6mc4x3` |
| ├ 05_其他制服團體 | `1JZmlxQQI5BQHeBEispwFQeYIqMTy4Ofl` |
| ├ 06_支部最高獎勵獲獎人士 | `11_hQGUvdHe6lNbsUBmf4ZNnQdSJ7x7DY` |
| └ 07_成人獎勵獲獎人士 | `1AIYjtEX1deWZdD2YIvrrG7ToOy0fUf1c` |
| 03_名單 | `1--quc9LEdyZMJOPSGnGMjR5BGv1gtG00` |
| ├ 參加旅團 | `1pa_5BwZAeQjpkZ3wg7QwuX9eUOnOkh1W` |
| ├ 優異旅團獲獎 | `1stTFeU2wpLihVKJxJgSzkJvRfbQlpyGZ` |
| ├ 嘉賓 | `1jkBKnQoXY2UKx-DBUy5izIqwDzs7819S` |
| ├ 支部最高獎勵得主 | `1gT_hbosrCxmqSjEaaozfjKPhPwb_VNmN` |
| └ 成人獎勵得主 | `1jrkV05G8vd5jbD8Xh4Tf5eTy71P_ihEy` |
| 04_場地 | `1rg4ikkJAEz1C0qonfh0x7QepFqMxCPHE` |
| ├ 場地指示圖（公眾版） | `1bnTcwFhFIquSC1fQKnoi1HypSOeIMZTn` |
| ├ 場地佈置圖 | `1x4FecMKqa3cQc9n3hT0p7ZUxb_qMPTkS` |
| ├ 座位表 | `1_rvgNwkIP4phUHrJzNtCuuIpsgvvXLKB` |
| └ 泊車安排 | `1ganG4OxvlvGS0ao-qHU3FSzj4_471RMp` |
| 05_程序 | `1F0j-3qQhqvEXNUpBh0748BY4sMZbG0pC` |
| ├ 全日程序 | `1uiD2XNMSgqqvXaVbNPidYvhrQTw0BIYw` |
| └ 司儀稿 | `1fDChaYRRLVxp4LFtp4lQ9RQvrFfmCXhi` |
| 06_後勤 | `1T8nK5yuFiUc-LS4_Rv8N1x8dYirB9e1g` |
| ├ 餐盒統計 | `1e2iZN8ApcmzEpRXpT4Gq-oyB_BMeFWd8` |
| ├ 旅遊巴名單 | `1f3Cbaw-UljDkOen1YX3dTthDZrj2eMA8` |
| └ 工作人員名單 | `13OOk6i9bhUA54Ro94J7-APZo9fswwEzg` |
| 99_模板 | `1upCRCZ-i05Nx49zctaBwv6QK42_5QFsE` |

2026 證據庫（ISD folder，含 V8 座位表＋03.10 名單）：`1hyzzIuRGxEh9iya4YvcIsKyfCAZ3sVlG`
