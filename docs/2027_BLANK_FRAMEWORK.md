# ISD 2027 空白實框架（2026 證據覆核後）

**狀態：可開始由各既有組別填寫；未連接 live form、同步、GAS 或公眾發佈。**

這是 2026 證據覆核完成後的第一份可運作 2027 框架，而不是 2026 資料的複製品。它把 2026 作為歷史證據（D 欄），並為每一個日後要更新的資料、受控文件、資產、入口及登記表建立一個空白的 2027-owned source ID。

## 成果範圍

| 項目 | 數量 | 依據 |
|---|---:|---|
| 詳細覆核輸出連通 | 109 | 公眾文件及入口 26、工作人員文件及工作視圖 25、部門／中心／內部輸出 58 |
| 2027 唯一受控 source ID | 96 | 每個 ID 只在一個 canonical domain 建立一份空白記錄 |
| Domain source files | 8 | `00_系統及資料` 至 `07_參考快照` |
| 公眾七類／工作人員手冊 | 7／9 | 已完成覆核；其輸出日後讀取本框架的受控來源，不另建平行資料 |

## 檔案及用途

| 檔案 | 作用 |
|---|---|
| `data/2027_canonical_source_registry.json` | 96 個 source ID 的唯一目錄：canonical home、主責組別、中央批核、source schema、消費輸出及 2026 證據。 |
| `data/2027_output_connection_registry.json` | 109 個輸出對應的 primary source ID、支援 source ID、讀取規則、核准組別及 2026 證據。 |
| `data/2027_blank_sources/*.json` | 八個可部署至 ISD 2027 Drive 的空白 domain files；所有 record 為 revision 0、無 `updated_by`、無發佈狀態。 |
| `tools/build_2027_blank_framework.js` | 唯一 builder。它只讀取三份已覆核的 dataflow map，絕不讀取 `data/isd_2026.json`。 |
| `tools/lib/controlled_2027_sources.js` | 純 source resolver：只會由一個已核准的 source record 供應其相依輸出；不含 Drive、GAS、frontend 或 2026 dependency。 |
| `tools/build_2027_output_source_projection.js` | 產生 109 個不含 payload 的 output pointers，讓將來 renderer 以 source ID／revision 解析目前的 canonical record。 |
| `tests/blank_2027_framework_test.js` | 檢查覆蓋、唯一性、空白狀態、owner／approval、審計欄位和禁止 2026 live dependency。 |
| `tests/controlled_2027_source_connection_test.js` | 以共享的 `DATA-CEREMONY-PROGRAMME` 驗證：一次 owner-approved 更新會讓八個相依輸出同時讀取 revision 1，沒有輸出端副本。 |

## 唯一來源規則

1. 每一個 `source_id` 只可以在其 `canonical_home` 的 domain record 更新。
2. `data/2027_output_connection_registry.json` 的 `canonical_source_id` 是輸出的唯一主要來源；`supporting_source_ids` 只是明確列出的相依資料，不能變成輸出端副本。
3. 所有更新必須先填寫 `updated_by`、`updated_at`、`audit_id`、revision 和 `publication_status`，然後才可重建 read model／公眾或工作人員輸出。
4. 2026 evidence 只保留在 registry 的 `evidence_2026` 字段，沒有 URL、Sheet ID、backend 或 write-back。
5. `ARCHIVE-REFERENCE-BOOTH-2025` 只可保留於 `07_參考快照` 的 2027-owned reference boundary；不可作 2026 live link。

## 由空白框架變成受控資料的次序

1. 對應 owner 在自己的 source record 填入第一筆 2027 資料或文件內容。
2. 依 `established_group_approvals` 完成核准，記錄 audit metadata。
3. 發佈程序讀取 source record，更新對應 read model／文件／頁面。
4. `output_connection_registry` 所列輸出只渲染／讀取已核准 source；不得在輸出端直接改字或儲存第二份資料。
5. `tools/build_2027_output_source_projection.js` 建立的 projection 只含 source pointer／revision，沒有 payload；renderer 必須用 resolver 讀取同一筆已核准 source record。
6. 加入表單或 GAS 前，先把入口 (`IN…`) 接到同一 source record，並以測試覆核 2027 event boundary。

> 現有 `data/isd_2027.json` 與 `data/mock_demo.json` 是過往的 rehearsal/read-model 工件，並非這個空白實框架的可編輯主來源。未來僅可經上述受控 source → publish 流程重建它們；本輪不把其中的 2026 種籽當作 2027 真實資料。
