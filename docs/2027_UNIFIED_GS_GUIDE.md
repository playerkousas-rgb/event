# ISD 2027 一體化後端 GS — 部署及使用指南

> **成品**：[`apps-script/Code2027Unified.gs`](../apps-script/Code2027Unified.gs)（一個檔，貼上即用）
> **Drive 副本（00_系統及資料）**：
> - 連通索引 `ISD 2027－2026資料連通索引（一體化版 v1.1）.json`（16 快照版）→ ID `1JXD_zudm8p9S5CSZLp0_vIhWwnjE2NX1`
> - 一體化 GS `ISD 2027－一體化後端 GS（2026連通／主SHEET同步／受控來源）v1.2.gs`（含防呆上限）→ 見 00_系統及資料 最新版本
> **版本**：`2027-unified-gs-v1.2`｜2026-10-07（v1.2 新增瘦身＋防呆；同日完成 18 角色同源輻射驗證 `tests/all_roles_single_source_test.js` 220 項全過）

## 一、呢個 GS 做咩（一體化＝四件事一個檔）

| 層 | Action | 用途 |
|---|---|---|
| **① 一體化索引** | `getUnifiedIndex`／`findAsset`／`get2026Reference` | 讀取 Drive 上嘅連通索引：96 受控來源、16 份 07_參考快照（2026 唯讀副本）、主SHEET 25 分頁模型、25 條子SHEET 路由（17 條已接通）、10 個填寫入口、2026 數據集統計（31 旅／102 嘉賓／33 攤位／188 團次……只記數字，唔含個人資料） |
| **② 主SHEET 同步引擎** | `upsertMasterRows`／`registerChildSheet`／`pullChildSheet`／`resolveFieldError` | 按 02_資料字典 欄位鍵名合約驗證 → 按 `source_record_id`／業務鍵 upsert → 自動寫 `04_同步狀態`／`05_欄位錯誤`／`24_修正紀錄`。欄位唔啱會**拒收＋記低原因**，絕不暗中改名 |
| **③ 受控來源發佈** | `update2027Source`／`get2027Output` | 與 `Code2027.gs` v1 完全相同規則（revision 樂觀鎖、owner／approval、封鎖 2026 引用），驅動 8 個 domain JSON |
| **④ 延伸登記** | `register2027Extension` | 「再加上 2027 的 SHEET 和 SCRIPT」嘅正式入口：新 Sheet／Script／入口一律登記入主SHEET `2027_登記表`，留痕可查 |

**呢個 GS 係 `Code2027.gs` v1 嘅功能超集**——部署咗呢個就唔使（亦唔可以）同時貼 v1。

## 二、部署（5 分鐘）

1. 開啟系統主SHEET **「ISD 2027－系統主SHEET（公眾輸出頁簽增補覆核版）」**
   （`https://docs.google.com/spreadsheets/d/1aQYNIq41ek3w5zfoLP12KuT_LAeWQLNv6UTAR_1SWPg`）→ **擴充功能 → Apps Script**。
   （本 GS 用 `openById` 存取主SHEET，貼去其他新 project 一樣得；更改工作副本只需改 `ISD2027_MASTER_SHEET_ID` 一個常數。）
2. 刪走編輯器預設程式碼，貼上 `apps-script/Code2027Unified.gs` 全部內容，**儲存**。
3. 喺編輯器揀選並執行 **`initializeUnifiedBackend`** 一次（授權自己帳戶）：
   - 產生／讀取 `ISD2027_APIKEY`（**記低，只放受限設定；唔入 Git、唔入瀏覽器**）；
   - 喺主SHEET 自動建立 3 個分頁：`2027_Audit_Log`（稽核）、`2027_資產索引`（一體化索引 60+ 資產，全部有 Drive 連結）、`2027_登記表`（你之後加嘅 2027 Sheet／Script 登記處）；
   - 回 `health.index_loaded:true`、`master_sheet_reachable:true` 就係成功。
4. **部署 → 新增部署 → 網頁應用程式**：執行身分「我」；存取權限用最小權限。`/exec` URL＝`ISD2027_GAS_URL`。
5. 驗證：瀏覽器開 `…/exec?action=getHealth` → 應見 `"event_id":"isd_2027"`、`"index_loaded":true`。

> ⚠️ **不可貼入 2026 backend project**；endpoint 只收 `event_id=isd_2027`，payload 出現 `data/isd_2026.json`／`ISD2026_GAS_URL`／`event_id=isd_2026` 一律拒收。

## 三、即刻用到嘅操作（示例）

### 查 2026 參考（唯讀）
```
GET …/exec?action=get2026Reference&event_id=isd_2027&api_key=KEY
GET …/exec?action=findAsset&q=攤位&event_id=isd_2027&api_key=KEY
GET …/exec?action=getUnifiedIndex&section=assets_2027.reference_snapshots&…
```
→ 2027 owner 準備資料時一查就知：上屆用邊份檔（16 份參考快照全部有連結）、歸邊個 source ID、邊組負責。

### 登記你嘅 2027 子SHEET（例：行政組開咗 CS01 工作副本）
```
POST …/exec   Content-Type: text/plain
{"action":"registerChildSheet","event_id":"isd_2027","api_key":"KEY",
 "template_code":"CS01","spreadsheet_id":"貼上子SHEET檔案ID",
 "owner_group":"行政組","registered_by":"秘書處","note":"CS01 正式工作副本"}
```

### 拉取子SHEET 入主SHEET（例：同步 01_單位 分頁）
```
POST …/exec   {"action":"pullChildSheet","event_id":"isd_2027","api_key":"KEY",
 "spreadsheet_id":"…","tab":"01_單位","template_code":"CS01","registered_by":"行政組"}
```
→ 按 `source_record_id+organisation_id` upsert 入 `10_組織`；每列結果寫 `04_同步狀態`，被拒嘅寫 `05_欄位錯誤`（可用 `resolveFieldError` 銷案）。

### 直接寫主SHEET（例：中央更正附原因）
```
POST …/exec   {"action":"upsertMasterRows","event_id":"isd_2027","api_key":"KEY",
 "tab":"17_攤位","updated_by":"主題節目組","change_reason":"攤位改名的中央更正",
 "rows":[{"booth_id":"A01","booth_name":"新攤位名","status":"confirmed"}]}
```

### 加 2027 Sheet／Script（延伸登記）
```
POST …/exec   {"action":"register2027Extension","event_id":"isd_2027","api_key":"KEY",
 "kind":"script","name":"ISD 2027－泊車證處理 Script","drive_id_or_url":"…",
 "owner_group":"協調組","registered_by":"行政組","note":"…"}
```
`kind` 可用 `sheet`／`script`／`entry_route`／`endpoint`／`other`。

## 四、子SHEET 路由現狀（25 條：17 條已接通）

| 已接通（可 pull） | 待 owner 確認欄位對應 |
|---|---|
| CS01-01 單位→10_組織；CS01-02 出席→14_出席；CS01-03 膳食→19_膳食；CS01-04 交通→20_交通泊車 | CS02-02 回覆出席（attendance_status 等鍵名未對上 13_報名） |
| CS02-01 受邀對象→11_人員＋12_邀請；CS02-03 典禮安排→21_典禮 | CS04-02 活動安排（activity_code vs schedule_map_id） |
| CS03-01 工作人員→15_工作人員；CS03-02 當值→16_當值安排；CS03-03 攤位人手→18_攤位人手 | CS05-01 典禮項目（ceremony_item_name vs title） |
| CS04-01 攤位→17_攤位；CS04-03 物資需求→23_物資 | CS06-01 場地（建議 90_代碼表 code_set=location，屬語義轉換） |
| CS05-02 唱名上台→21_典禮；CS05-03 座位步操→21_典禮 | CS07-03 派發（主SHEET 暫無派發分頁） |
| CS06-02 車輛泊車→20_交通泊車；CS06-03 旅遊巴→20_交通泊車 | CS08-01 服務人員（service_type 無對應欄） |
| CS07-01 膳食→19_膳食；CS07-02 物資→23_物資 | CS08-02 安全安排；CS08-03 緊急資源（主SHEET 暫無分頁） |

pending 路由 `pullChildSheet` 會直接拒絕並寫 `05_欄位錯誤`，原因即係上表。owner 確認鍵名對應後：改 `tools/build_2027_unified_connection_index.js` 入面嘅 `CHILD_ROUTES` → `node tools/build_2027_unified_connection_index.js` → 用 `refreshUnifiedIndex` 重新載入（或重新上載索引 JSON）。

## 五、一體化之後嘅資料流向（唯一規則不變）

```
2026 檔案／Sheet／數據集  →── 唯讀參考（索引＋統計；永不寫回、永不 live link）
                              │ 規劃參考：16 份參考快照＋2026 數據集統計＋Drive 地圖
                              ▼
2027 受控來源（96 source／8 domain JSON）  ←── update2027Source（owner＋approval＋revision）
2027 系統主SHEET（25 分頁）              ←── upsertMasterRows／pullChildSheet（鍵名合約＋留痕）
                              │
                              ▼
        將來輸出 renderer 只讀已核准 source／主SHEET（get2027Output／getMasterTab）
```

## 五之一、瘦身＋防呆機制（v1.2，2026-10-07）

避免「Vercel 爆掉」同「傳後端出問題」嘅標準配備，一早已經全套裝好：

### 前端（js/55-api-guard.js，被動式——45 個後端呼叫點即刻全部受保護）
| 機制 | 設定 | 防咩 |
|---|---|---|
| 請求 timeout | 25 秒 | 死咗嘅後端唔會永遠等 |
| GET 自動重試 | 2 次・指數退避（只重網絡錯／5xx／429） | 網絡一二下甩釘唔會即刻失敗 |
| 單飛（single-flight） | 同 URL 並發共用一個請求 | 重複點擊／多卡片同時 load 唔會轟後端 |
| 回應大細上限 | 10MB | 一個大回應唔會食爆瀏覽器記憶體 |
| 斷路器 | 連續 4 次網絡失敗→開路 60 秒 | 唔會打死循環觸發 Google 配額 429 |
| 離線補送匣（outbox） | 寫入操作網絡失敗→排隊（上限 30・5 次・7 日），後端返生自動補送 | **改動唔會因為網絡斷咗而消失**（POST 永不自動重試＝唔會重複寫入） |
| localStorage 配額保護 | 爆配額→自動清其他活動舊快取（最大先清，保護 key 永不動）→重試 | 舊活動快取唔會令新數據寫唔入 |
| 瘦身 | `data/*.json` 移除 `?t=Date.now()` 快取殺手 | 每次入 dashboard 唔再重下載 900KB（ETag＋data_version 雙機制保 freshness） |

> Console 可以打 `GASGuard.status()` 睇狀態、`GASGuard.flush()` 即刻補送。

### Vercel
- `.vercelignore`：tools／tests／apps-script／docs／模擬資料（2027_simulation_*）唔推上 Vercel——部署體積大減，模擬資料亦唔會公開可下載（守住「模擬永不當真 2027 發佈」邊界）。
- Google Drive PDF 使用 immutable 一年快取；`assets/`＝7 日；`/js/`＝瀏覽器 1 日／CDN 7 日；`/api/config`＝瀏覽器 5 分鐘／CDN 1 小時，並使用 stale-while-revalidate。

### 後端 GS（本檔 v1.2）
- **請求上限 8MB**（`request_too_large`）：大 body 唔會行到 GAS 30 秒限時先死。
- **回應上限 10MB**（`response_too_large`）：同前端上限一致，兩邊一齊拒。
- **Rate limit 每分鐘 120 請求**（`rate_limited`）：防 loop／機械人打爆 Google 配額；GET／POST 兩個入口都有。
- **getMasterTab 加 `limit` 參數**（1–2000）：大分頁可以逐段攞，唔會一次過傳 10MB。

## 六、維護

- **改索引內容**（新增快照／確認 pending 路由／加資產）：改 `tools/build_2027_unified_connection_index.js` → `node tools/build_2027_unified_connection_index.js` → 把 `data/2027_unified_connection_index.json` 重新上載至 Drive 00_系統及資料（新檔會有新 ID）→ 更新 GS 常數 `ISD2027_CONNECTION_INDEX_FILE_ID` → `refreshUnifiedIndex` 重新載入。（索引內容刻意唔記自己嘅 Drive ID，避免循環依賴。）
- **測試**：`node tests/unified_2027_connection_test.js`（連同全套 `for t in tests/*.js; do node "$t"; done`）。
- **索引係 generated 檔**：唔好手改 `data/2027_unified_connection_index.json`，一律改 builder。
- **私隱**：索引／GS 只含 Metadata 及統計數字；姓名、電話、車牌一律不入（`tests/unified_2027_connection_test.js` 有自動掃描）。
