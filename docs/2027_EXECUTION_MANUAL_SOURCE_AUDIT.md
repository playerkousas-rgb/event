# 2027 執行手冊資料來源及缺口審核

> 由 `tools/build_2027_manual_source_register.js` 產生。2026 是唯讀歷史輸入；本文件及 register 只改動 2027 source。

## 1. 跨組資料關連與唯一來源

| 資料流 | 來源／協作組別 | 2027 唯一來源 | 手冊分類 | 2026 → 2027 複製狀態 |
|---|---|---|---|---|
| 程序、典禮及會操 | 行政組／會操及典禮組 | programme | programme、ceremony、mc_scripts | copied_as_2027_reference_seed |
| 場地、攤位、遊戲及動線 | 協調組／主題節目組 | venue | activities | copied_as_2027_reference_seed |
| 旅團、報到及單位資料 | 行政組／協調組 | registration | logistics、records | copied_as_2027_reference_seed |
| 膳食、物資及現場後勤 | 協調組／行政組 | logistics | logistics、records | copied_as_2027_reference_seed |
| 各組職責、編更及工作資料 | 秘書處／各總主任 | rosters | staff.job_duties、staff.event_staff_roster | copied_as_2027_reference_seed |
| 安全、危機及應變 | 危機處理組／行政組 | logistics | crisis | copied_as_2027_reference_seed |
| 通告、指引及文件目錄 | 秘書處／行政組／相關內容組別 | notices | documents、documents | copied_as_2027_reference_seed |

## 2. 已複製資料與實體檔案缺口

| 項目 | 已複製 records | 已有 2027-owned files | 缺口 | 處理狀態／下一步 |
|---|---:|---:|---:|---|
| 通告 | 3 | 0 | 3 | needs_2027_owned_copy_or_reissue；把每份 2026 通告副本放入 ISD 2027／02_通知書，或由 2027 擁有人重發，再把 file_url／Drive ID 回填至 2027 record。 |
| 文件目錄 | 79 | 0 | 79 | metadata_copied_file_inventory_pending；先按文件用途標記 keep／replace／retire；保留者必須在相應 2027 Drive folder 有擁有副本，再建立 file_url／Drive ID。 |
| 場地圖及遊戲卡 | 6 | 6 | 0 | 2027_owned_reference_assets_present；活動前只需確認內容、日期及版本，不需再從 2026 Drive 取用。 |

## 3. 清理規則

- **Keep**：仍屬活動日操作、通告、程序、場地、遊戲、安全或法定／必要參考的資料，必須先在 2027 folder 擁有副本。
- **Replace**：內容仍有用但含舊日期、費用、聯絡或年份，保留 2027 reference seed，待相應組別重發 2027 版本。
- **Retire**：只屬已完結 2026 的個人名單、一次性簽收、舊批核或無活動日用途的資料；先在 register 標記決定，再從 2027 工作人員輸出移除。2026 archive 不刪除。

## 4. 文件 review queue

目前有 79 筆歷史文件 metadata 已複製到 2027，但 79 筆尚未綁定 2027-owned 實體檔案；三份通知書亦尚未有 2027-owned 副本。遊戲卡及場地／典禮／危機資產已有 2027-owned 版本。
