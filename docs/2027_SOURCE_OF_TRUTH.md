# ISD 2027 單一資料來源規則

> **狀態：2027 籌備系統已啟用。** 這份規則取代「每次由 2026 重建 MOCK」的舊做法。

## 不可跨越的界線

- `data/isd_2026.json` 是 **2026 活動日前的封存參考檔**。它受 `data/2026_reference_lock.json` 的 SHA-256 和 GitHub pre-event provenance 保護；不可編輯、不可作同步目標、不可被 2027 日常 builder 讀取。
- 已於 2026-10-06 完成一次受控種籽遷移。遷移來源 hash 只保留在 2027 的 provenance 欄位作審計用途，**不是 live link**。
- 所有供 2027 使用的資料、文件快照、名單、工作流程和其後更改，都在 **ISD 2027** Drive root（`1qzaHkoua5Se2rOn1z6LljVmlIq-oae3Q`）或 2027 frontend → 2027 backend 的受控路徑完成。
- 2027 backend 必須使用獨立的 `ISD2027_GAS_URL` / `ISD2027_APIKEY`、2027 Main Sheet 和 `2027 Audit_Log`；它必須拒絕 `event_id=isd_2026` 的寫入。現時 endpoint 尚待部署，故不可把 2026 endpoint 當作 2027 frontend 的儲存位置。

## 現行資料鏈（只向前）

```text
2026 archive (immutable provenance only)
  └─ one controlled bootstrap already completed

ISD 2027 Drive — canonical controlled sources
  ├─ 00_系統及資料 / ISD 2027－資料主索引.json
  ├─ 01_報名 / ISD 2027－報名及旅團資料.json
  ├─ 02_通知書 / ISD 2027－通告及公眾資訊.json
  ├─ 03_名單 / ISD 2027－人員、嘉賓及典禮名單.json
  ├─ 04_場地 / ISD 2027－場地、攤位及泊車資料.json
  ├─ 05_程序 / ISD 2027－日程及會議資料.json
  ├─ 06_後勤 / ISD 2027－後勤、安全及財務資料.json
  └─ 07_參考快照（唯讀） / one-time independent reference copies
        │
        ▼ approved 2027 import / publish
repo read model: data/isd_2027.json
        │ tools/build_pc2027_demo.js (2027 data only)
        ▼
data/mock_demo.json — selectable role-based 2027 rehearsal product
        │
        ├─ public / participant / group / guest journeys
        ├─ ordinary staff PIN `2027` (2027 public execution-manual view only)
        └─ committee / administrator accounts (existing account-and-password model)
```

`data/isd_2027.json` is the reviewed **read model** committed with the application, not a second hand-edited source. `data/mock_demo.json` is its renderable rehearsal product, not a department-owned dataset. The live controlled records remain in the Drive domains above; changes require the 2027 importer/publish step or the 2027 frontend/backend flow.


## 工作人員執行手冊（目前優先成品）

普通工作人員 PIN `2027` 只會進入唯讀的 **2027 工作人員執行手冊**。其發佈索引為 `execution_manual_2027`，由 `tools/build_execution_manual_2027.js` 只讀取 `data/isd_2027.json` 產生，再由 `tools/build_mock_demo_from_2027.js` 帶入 MOCK。

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

The root index carries the Drive file IDs and checksums of the seven controlled domain exports. A fact belongs to one domain only. Other pages and teams read its published record instead of copying it into another file.

## Data status and roles

The initial records are labelled `reference_seed_pending_2027_confirmation`: they are a useful 2027 rehearsal starting point, **not confirmation that the person, booking, venue, guest, date or operational decision is valid for 2027**. The responsible 2027 team replaces or confirms each record in place; the audit log records actor, timestamp and previous snapshot.

Visibility is data based, not file-copy based:

- **Public / participants / groups:** only published notices, programme, maps, public lists and their own intake/status data.
- **Guests:** their own arrival, seating, meal and transport instructions; no other guest personal data.
- **Ordinary staff:** PIN `2027`, 2027 public execution-manual data only; no personal/contact roster, finance or approval tools.
- **Committee teams:** their group’s editable source records and operational outputs; confidential lists are restricted by group and level.
- **Administrators:** controlled account setup, permissions, audit and publication; they do not create parallel copies.

## Supported build and release commands

```bash
# One-time bootstrap only — do not run as an ordinary update path.
node tools/bootstrap_2027_source.js

# Rebuild the staff execution-manual index from the 2027 read model.
node tools/build_execution_manual_2027.js

# Rebuild 2027 public defaults, the rehearsal product and its link inventory.
node tools/build_pc2027_demo.js
node tools/build_mock_demo_from_2027.js
node tools/build_link_registry.js

# Produce the domain files to publish into the matching ISD 2027 Drive folders.
node tools/export_2027_drive_sources.js
```

`tools/fill_mock_demo_from_2026.js` remains only as a compatibility shim; it delegates to the 2027 builder and deliberately cannot read the 2026 archive. Never use it to start a new 2026-to-2027 copy.

## Publication guardrails

1. Do not edit `data/isd_2026.json`, a 2026 Drive folder, or a 2026 Sheet to “fix” a 2027 display.
2. Do not hand-edit `data/isd_2027.json` or `data/mock_demo.json`; edit the owned 2027 record through the controlled Drive/frontend flow, then publish a verified read model.
3. Every 2027 write needs `updated_by`, `updated_at`, source domain and an audit entry. A failed build must retain the previous verified publication.
4. Before public release, confirm reference-seed records for the relevant scope and apply the role visibility matrix.
5. 2026 is retained only for traceable historical provenance. It is never mutated by this flow.
