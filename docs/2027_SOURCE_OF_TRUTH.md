# 2027 資料單一來源規則（現階段：MOCK 預製）

## 狀態與界線

- `data/isd_2026.json` 是 **2026 活動日前的封存參考檔**。其 SHA-256 由 `data/2026_reference_lock.json` 鎖定，並已核對為 GitHub commit `1c333862`（2026-10-03 14:24 HKT）的完全相同版本；不可作日常修正、匯入或同步目標。
- 現有工作範圍仍是 **MOCK 示範版**。因此可更新的預製成品是 `data/mock_demo.json`，不是正式的 `data/isd_2027.json`。
- `data/isd_2027.json` 在獲正式批准開啟 2027 活動前，維持不動。不要以「先填少少」方式同時維護它和 MOCK，否則立即再次出現兩套版本。

## 唯一資料流

```
2026 封存參考資料（只讀；checksum 驗證）
  data/isd_2026.json + data/2026_reference_lock.json
          │  tools/fill_mock_demo_from_2026.js
          │  tools/build_pc2027_demo.js
          ▼
2027 MOCK 預製成品（可重建）
  data/mock_demo.json
          │
          ├─ 公眾／工作人員示範介面
          └─ tools/schema/templates_2027.js
                   │  tools/build_2027_templates.js
                   ▼
     空白可填範本 + 2026 填寫示例 + template_contract_2027.json
```

- `tools/fill_mock_demo_from_2026.js` 及 `tools/build_pc2027_demo.js` 均會先驗證 2026 reference checksum，通過後才可讀取封存資料並重建 MOCK 產物。
- `tools/schema/templates_2027.js` 是 2027 範本欄位、負責組、唯一鍵、流向和填寫規則的**唯一合約**。
- `tools/build_2027_templates.js` 從同一份 schema 產生所有範本、示例、程式合約及說明；不可分別手改其中一份輸出。
- 每個事實只可有一個「主表／主欄位」。跨組介面、統計、名單、場地圖和司儀稿都只讀其主表的產物，不能各自複製再改。
- 先跑 `node tools/build_2027_templates.js --check`；它會阻止同一語意欄位同時出現在兩份範本，並驗證產物目標。

## 何時可以填寫正式 2027

在獲批准開啟正式 2027 資料前，請只用 `templates/2027/blank/` 收集欄位建議或演練，**不要**把填寫結果回寫到 `data/isd_2027.json`。

正式啟動時必須先一次過決定並實作以下項目，再讓任何組別填資料：

1. 指定每份範本的唯一受控儲存位置（例如受管理的 Sheet／資料庫表），並將其對應 schema 的 `id`。
2. 建立「受控來源 → 單一匯入器／API → 2027 資料產物」流程；APP 只讀該產物，不能從多個組別副本合併猜測。
3. 每次更新帶來源、更新人、時間和版本；失敗時不覆蓋上一個已驗證版本。
4. 在單一產物成功生成後，才向各組和公眾介面發佈；所有介面讀同一個版本號。

> 注意：MOCK 模式的互動資料只存在當前瀏覽器，故它不是跨人員同步系統。它目前用來驗證欄位、流程和最終畫面；要做到正式跨組同步，須先按上述流程啟用一個受控後端來源。

## 防止回寫 2026 的閘門

- APP 對 `isd_2026` 的共用儲存函式均經 `isReferenceArchiveWriteBlocked()` 封鎖。
- `tools/build_2026_freeze.py`、`tools/build_staff2026.py` 及 `scripts/import-2026.js` 不能在沒有明確 `--confirm-2026-archive-write` 的情況下寫入。
- `tests/reference_archive_lock_test.js` 驗證 checksum、前端儲存閘門、舊工具確認字串，以及 2027 MOCK／schema 產物鏈。

若發現 2026 檔內容不正確，這不是一般編輯工作：必須先找回獲授權的原始資料、審核差異，然後才可進行一次明確的復原和更新封存 checksum。
