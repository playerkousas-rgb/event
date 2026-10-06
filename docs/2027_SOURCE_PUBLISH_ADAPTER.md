# ISD 2027 受控來源 Publish Adapter

此 adapter 將 2027 blank framework 的「一個受控來源 → 所有相依輸出」規則接到真正的 ISD 2027 Drive 檔案。它仍然**沒有**接到 2026 backend、2026 Drive、2026 Sheet 或任何 2026 write-back。

## 已交付的程式

`apps-script/Code2027.gs` 是獨立 Apps Script backend，必須部署到一份新的 **ISD 2027 Audit Log** Google Sheet。它不應與舊 `apps-script/Code.gs` 或 2026 deployment 共用。

| Action | 用途 |
|---|---|
| `get2027Health` | 只回傳 endpoint 是否已設定、版本及 2027 event boundary。 |
| `update2027Source` | 更新一個 source record、遞增 revision、寫入 audit、重建 109-output projection。 |
| `get2027Output` | 只在 primary source 已核准後回傳該 output 的即時 source payload；不建立 output-side storage。 |

所有請求必須同時有：

- `event_id: "isd_2027"`
- `api_key` 與 Apps Script Property `ISD2027_APIKEY` 一致
- 正確的 `expected_revision`（optimistic concurrency）
- source owner group 的 `updated_by`
- 已登記的 approval group `approved_by`
- ISO `updated_at`、非空 `audit_id`
- `publication_status: "approved"`

`structured_dataset` 及 `system_registry` source 必須以 `payload.records` array 更新。payload 內若含 `data/isd_2026.json`、`ISD2026_GAS_URL` 或 `event_id=isd_2026`，adapter 會拒絕。

## 初次部署

1. 在 Google Drive 建立一份全新 Google Sheet，例如：`ISD 2027－Audit Log`。
2. 開啟 **擴充功能 → Apps Script**，把 `apps-script/Code2027.gs` 的內容貼到該新 project，覆蓋預設檔案。
3. 在 Apps Script 編輯器手動執行一次 `initialize2027Backend()`：
   - 建立 `2027_Audit_Log` tab；
   - 建立獨立 `ISD2027_APIKEY` Script Property；
   - 回傳一次 API key。把 key 儲於受限的密碼管理工具；**不得**放入 Git、資料檔、`/api/config`、公眾頁面或 browser JavaScript。
4. 部署為 **Web app**：
   - Execute as：擁有 ISD 2027 Drive source files 的帳戶；
   - Access：只給實際使用者所需的最小權限；
   - `/exec` URL 可保存在將來的 server-side deployment setting（例如受限環境的 `ISD2027_GAS_URL`）；browser 不應直接取得 source-write URL 或 key。
5. 先以受限的管理工具／server-side request 使用 `get2027Health` + API key 測試，確認回傳 `event_id: isd_2027`。
6. 在正式前端接線前，先以一筆測試 source update 驗證 revision、Drive projection 和 `2027_Audit_Log` 三者同步變更。

> **此 repository 沒有替你部署 Apps Script、沒有寫入 API key，亦沒有自動啟用 frontend。** 在 blank data 階段這是刻意的安全界線。

## 安全寫入格式

以 `DATA-CEREMONY-PROGRAMME` 為例（只作格式範本；不可把此測試資料當成活動內容）：

```json
{
  "action": "update2027Source",
  "event_id": "isd_2027",
  "api_key": "set-in-deployment-only",
  "source_id": "DATA-CEREMONY-PROGRAMME",
  "expected_revision": 0,
  "updated_by": "會操及典禮組",
  "approved_by": "會操及典禮組",
  "updated_at": "2027-01-15T09:30:00+08:00",
  "audit_id": "AUD-2027-EXAMPLE-001",
  "publication_status": "approved",
  "payload": {
    "records": []
  }
}
```

成功後 adapter 只會：

1. 更新 `05_程序` 中該唯一 source record；
2. 將它由 revision 0 改為 1；
3. 重建 `ISD 2027－輸出來源指標（空白實框架）.json` 的 source pointers；
4. 在獨立的 `2027_Audit_Log` 寫一行 audit；
5. 令該 source 的八個 dependent outputs 可由 `get2027Output` 解析同一個 approved payload。

若 source 寫入、pointer 重建或 audit 任一步失敗，adapter 會嘗試還原 source domain file 和 projection，並記錄 `reverted` 結果。

## 前端接線的下一道閘門

現有公眾／工作人員畫面仍是 rehearsal view，不能因為設定了 URL 就直接載入資料。正式接線前需要另外確認：

1. 來源 record 已有 2027 真實內容並由 owner 核准；
2. 每個 payload 明確有可發佈 audience / privacy classification；
3. 每個 output renderer 只呼叫 `get2027Output` 或 source projection，不保存獨立 copy；
4. role visibility、rate limiting、error handling 及 cache invalidation 已測試；
5. 2027 endpoint 與 2026 endpoint 的 credentials、Sheet、audit logs 完全分隔。
