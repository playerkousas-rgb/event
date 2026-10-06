# ISD 2027 單一資料來源規則

> **狀態：2026 證據覆核已完成；2027 空白實框架已建立，尚未啟用 live 表單、同步、GAS 或公眾發佈。** 這份規則取代「每次由 2026 重建 MOCK」的舊做法。空白框架的實作細節見 [`2027_BLANK_FRAMEWORK.md`](2027_BLANK_FRAMEWORK.md)。

## 不可跨越的界線

- `data/isd_2026.json` 是 **2026 活動日前的封存參考檔**。它受 `data/2026_reference_lock.json` 的 SHA-256 和 GitHub pre-event provenance 保護；不可編輯、不可作同步目標、不可被 2027 日常 builder 讀取。
- 舊有的一次性種籽及 rehearsal data 只保留作歷史工件；它們不是本框架的資料來源。任何 provenance 只可作審計，**不是 live link**。
- 2027 的真實資料、文件、名單和工作流程日後只可由 **ISD 2027** Drive root（`1qzaHkoua5Se2rOn1z6LljVmlIq-oae3Q`）內的 blank canonical source records 開始填寫；目前沒有已核准的 live frontend/backend 寫入路徑。
- 日後 backend 必須使用獨立的 `ISD2027_GAS_URL` / `ISD2027_APIKEY`、2027 Main Sheet 和 `2027 Audit_Log`，並拒絕 `event_id=isd_2026`。endpoint 尚未部署，故不可把 2026 endpoint 當作 2027 frontend 的儲存位置。

## 現行資料鏈（只向前）

```text
2026 archive (immutable provenance / evidence only)
        │ no read-model, API, Sheet or write-back dependency
        ▼
reviewed dataflow maps (109 outputs; 2026 evidence → 2027 source decision)
        │ tools/build_2027_blank_framework.js
        ▼
ISD 2027 Drive — eight blank canonical domain files
  ├─ 00_系統及資料 / ISD 2027－00_系統及資料－受控來源（空白實框架）.json
  ├─ 01_報名 / ISD 2027－01_報名－受控來源（空白實框架）.json
  ├─ 02_通知書 / ISD 2027－02_通知書－受控來源（空白實框架）.json
  ├─ 03_名單 / ISD 2027－03_名單－受控來源（空白實框架）.json
  ├─ 04_場地 / ISD 2027－04_場地－受控來源（空白實框架）.json
  ├─ 05_程序 / ISD 2027－05_程序－受控來源（空白實框架）.json
  ├─ 06_後勤 / ISD 2027－06_後勤－受控來源（空白實框架）.json
  └─ 07_參考快照（唯讀） / ISD 2027－07_參考快照－受控來源（空白實框架）.json
        │ owner update + approval + audit + publish (future controlled step)
        ▼
future read model and output renderer
        │
        ▼
public, staff and internal outputs read the one approved source ID
```

`data/2027_canonical_source_registry.json` is the source-of-truth index for the blank framework; `data/2027_output_connection_registry.json` is the binding that prevents an output from becoming an editable duplicate. The historical `data/isd_2027.json` and `data/mock_demo.json` remain rehearsal/read-model artefacts only. They are **not** editable canonical sources and must be rebuilt from the blank controlled records when the later controlled publish path is implemented.


## 工作人員執行手冊（目前優先成品）

普通工作人員 PIN `2027` 的現有頁面仍是 rehearsal view，並非 live 2027 source。工作人員執行手冊九個頁簽已完成來源覆核；日後每個頁面只可從空白框架內經核准的程序、場地、名單、後勤和危機處理 source ID 讀取資料。`execution_manual_2027` 與 MOCK 將在後續受控 publish adapter 完成後才重建。

執行手冊是一冊完整的活動資料說明書，首屏只提供**資料分類目錄**，不預設工作人員應如何搜尋或處理工作。分類涵蓋全日程序及交接、警察學院場地／旅團／典禮動線、攤位和遊戲卡、報到與膳食後勤、典禮與司儀稿、旅團／膳食／編更資料、各組職責、安全及應變，以及活動日必讀文件。工作人員可自行按分類標籤查閱資料。

所有**非個人私隱**的活動日操作資料均供所有工作人員唯讀查閱，不會因所屬組別而遮蔽。唯一的資料界線是私隱：姓名對應崗位、電話／電郵、嘉賓個人資料、車牌、帳戶、個人簽收紀錄和事故個資不可因放入手冊而公開；編輯權和受限名單則仍需籌委帳戶。

所有面向工作人員的地圖、遊戲卡、危機手冊、司儀稿和檢閱路線，必須使用 repository／ISD 2027 folder 中的 **2027 擁有檔案**；不可在手冊頁面直接開啟 2026 Drive 或 2026-named asset。這些初始內容仍標記為 `reference_seed_pending_2027_confirmation`，由相關總主任確認後在原有 2027 record 更新。

## Drive layout and ownership

| Drive folder | Canonical domain | Primary owners | What it feeds |
|---|---|---|---|
| `01_報名` | public intakes, troop, meal and check-in records | 行政組／協調組 | participant lists, meal list, check-in |
| `02_通知書` | notices, public content, unit guidance and file catalogue | 秘書處／行政組 | public pages and execution manual |
| `03_名單` | role accounts, staff, guests and ceremony records | 秘書處／嘉賓接待／典禮組 | role views, restricted rosters, ceremony |
| `04_場地` | venue, booths, supplies and parking | 行政組／協調組／主題節目組 | maps, booth list, logistics |
| `05_程序` | public/internal programme and meetings | 行政組／典禮組 | programme and run-down |
| `06_後勤` | catering, safety, finance, souvenirs | 協調組／行政組 | staff operations and statistics |
| `07_參考快照（唯讀）` | independent copies of selected historical working materials | system custodians | planning reference only; never a live 2026 link |

The canonical source registry carries every source ID's one domain, owner, approval group, schema and consuming outputs. The output connection registry assigns every reviewed output one primary source ID. A fact belongs to one source record only; other pages and teams read its approved record instead of copying it into another file.

## Data status and roles

Every initial canonical record is labelled `blank_awaiting_2027_owner_entry`: it has no inherited person, booking, venue, guest, date, finance, asset or operational value. The responsible 2027 team creates the first value in place; the future audit log records actor, timestamp, revision and previous approved snapshot.

Visibility is data based, not file-copy based:

- **Public / participants / groups:** only published notices, programme, maps, public lists and their own intake/status data.
- **Guests:** their own arrival, seating, meal and transport instructions; no other guest personal data.
- **Ordinary staff:** PIN `2027`, 2027 public execution-manual data only; no personal/contact roster, finance or approval tools.
- **Committee teams:** their group’s editable source records and operational outputs; confidential lists are restricted by group and level.
- **Administrators:** controlled account setup, permissions, audit and publication; they do not create parallel copies.

## Supported framework commands

```bash
# Rebuild the blank source catalogue, 109 output connections and eight domain files.
# Reads only the reviewed 2027 dataflow maps; never reads 2026 event data.
node tools/build_2027_blank_framework.js
node tools/build_2027_output_source_projection.js
node tests/blank_2027_framework_test.js
node tests/controlled_2027_source_connection_test.js

# Historical rehearsal builders: do not use these as a source-entry path.
# They operate on the old rehearsal/read-model artefacts until the controlled
# publish adapter is deliberately implemented in a later phase.
node tools/build_execution_manual_2027.js
node tools/build_pc2027_demo.js
node tools/build_mock_demo_from_2027.js
node tools/build_link_registry.js

# The old seed exporter is superseded for new work; do not use it to re-seed
# 2027 from historical data.
node tools/export_2027_drive_sources.js
```

`tools/fill_mock_demo_from_2026.js` remains only as a compatibility shim; it delegates to the 2027 builder and deliberately cannot read the 2026 archive. Never use it to start a new 2026-to-2027 copy.

## Publication guardrails

1. Do not edit `data/isd_2026.json`, a 2026 Drive folder, or a 2026 Sheet to “fix” a 2027 display.
2. Do not hand-edit generated `data/2027_canonical_source_registry.json`, `data/2027_output_connection_registry.json` or `data/2027_blank_sources/*.json`; update the reviewed mapping and run `tools/build_2027_blank_framework.js`. Once source entry is enabled, owners update only their approved Drive source record.
3. Every future 2027 source write needs `updated_by`, `updated_at`, revision, source domain and an audit entry. A failed publish must retain the previous verified publication.
4. `data/isd_2027.json` and `data/mock_demo.json` are rehearsal artefacts, not editable source records. They can only be rebuilt through a future controlled publish adapter.
5. Before public release, confirm the 2027 record for the relevant scope and apply the role visibility matrix.
6. 2026 is retained only for traceable historical provenance. It is never mutated by this flow.

## 執行手冊資料關連及缺口審核

執行手冊的資料關連不是另一份由組別各自維護的副本。九個手冊頁簽的已核對輸出會透過 `data/2027_output_connection_registry.json` 讀取程序、場地／攤位／遊戲、報到、後勤、各組職責、安全及文件目錄的唯一 source ID；不得為手冊另存平行資料。

完整 2026 證據覆核可在 [`2027_EXECUTION_MANUAL_SOURCE_AUDIT.md`](2027_EXECUTION_MANUAL_SOURCE_AUDIT.md) 及已發佈的覆核 Sheet 查閱。空白 framework 只保留相應 source ID 和 evidence text，絕不改寫或 live 連結 2026 archive。
