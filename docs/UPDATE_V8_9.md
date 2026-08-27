# v8.9 修訂：部門中心「崗位／人數／內容」再次 ×2

> 2026-08-28。呢份文件記錄 v8.6 已修過嘅翻倍 BUG 點解會復發、root cause、修法同回歸測試。
> 測試：`tests/v89_org_chart_duplication_test.js`（69 項斷言）。

---

## 1. 症狀

| 位置 | 表現 |
|---|---|
| 主頁「部門管理中心」卡片 | `N 崗位 · M 人` 變成實際數嘅一倍（例：秘書處 1 崗位變 2） |
| 點入部門管理中心 | 「本組崗位／成員」清單每項出現兩次、「職務大綱（各職位）」數字翻倍 |
| 組織架構樹形圖 | 同一崗位兩行（其中一行冇職務描述） |

## 2. Root cause（三個，全部疊埋先至爆）

### ① 去重 key 太脆弱（v8.6 遺留）
`getStaffData()` 用 `組別|title.trim()|names.trim()` 做 key。但 Drive 架構圖（`syncOrgChartFromDrive` → `parseOrgChartGrid`）
解析出嘅同一崗位，往往只係差喺格式：

- 合併儲存格內嘅換行：`副主席（會操及典禮）` vs `副主席\n（會操及典禮）`
- 全形／半形括號：`總主任（會操）` vs `總主任(會操)`
- 全形空格：`秩序主任　`
- 人名分隔符：`李思諭、袁宇靖` vs `李思諭\n袁宇靖` vs `李思諭，袁宇靖`

key 對唔返 → 種子行與 Drive 行各保留一份 → **×2**；人數方面因為逐個名拆開先入 Set，
分隔符唔同會令 `M 人` 唔準（少計或多計）。

### ② 本機改動合併只用 id
`mergeUser(base, local, 'id')` 靠 id 對回。但 `mergeOrgChartPreserveDesc()` 每次同步都派
`'org_'+i+'_'+Date.now()` 呢種**隨機 id**，永遠對唔返種子嘅 `org_seed_i` → 每次載入都當新行
`push` 落去（追加而非覆蓋）。

### ③ 上傳／同步「無條件 append」
`handleStaffFileUpload()` 舊寫法：`data.job_duties = [...data.job_duties, ...parsed]`
（contacts / org_chart 同樣）。秘書處**重送同一份檔案**就即刻多一倍 —— 呢個正正係
「連入咗部門中心都見到 ×2 嘅內容」來源（org_chart 起碼仲有去重兜底，`job_duties`／`contacts` 完全冇）。

另外 `autoSyncDriveSources()` 每次開 APP 都靜默同步一次並寫 `localStorage`，令 ② ③ 每次重演。

## 3. 修法（v8.9）

| 檔案 | 改動 |
|---|---|
| `js/00-config.js` | 新增共用正規化／去重工具：`normalizeOrgText()`（去換行／空格、統一半全形括號標點）、`orgNamesKey()`（人名拆任何分隔符→排序）、`orgNodeKey()`（組別\|職位\|人名）、`dedupeOrgNodes()`（空人名嘅懸空缺各別計，唔會誤刪）、`uniqOrgNodesBy()`、`orgStableId()`（由 key 推稳定 id）、`dutyKey()`／`contactKey()`／`dedupeByKey()`、`dropContainedDuties()`（同組內一份職務完全包含另一份時只留較齊嗰份）、`orgNameList()`（人名拆分統一） |
| `js/31-staff.js` | ① `mergeUser()` 改為「先按 id，對唔到再按正規化 key」→ 覆蓋而唔係追加；② 讀取時用 `dedupeOrgNodes()`；③ `contacts`／`job_duties` 一律去重（保留資料較齊／較長嗰份）；④ 新增 `healStaffOrgCache()`：發現本機快取有重複行就**自我修正寫回**（只刪重複、唔改內容，冇重複時完全唔寫）；⑤ 上傳改做 **upsert**（同 key 覆蓋、新 key 先追加），toast 講明「更新 N 筆／新增 M 筆」 |
| `js/10-app-core.js` | `getGroupOrgNodes()` 用同一個 `dedupeOrgNodes()`（主頁卡與部門中心共用同一份計算）；人數改用 `orgNameList()` 統一拆名 |
| `js/21-activities.js` | `mergeOrgChartPreserveDesc()` 改用穩定 id ＋ 正規化 key 攞返職務描述 ＋ 同步先自己去重；新增 `orgChartSignature()`，**內容冇變就唔寫快取／唔打後台**；`parseOrgChartGrid()` 先清洗職位格（換行／全形空格／半形括號）先算組別，唔再拆出「會操及典禮)組」呢類幽靈組別 |
| `data/isd_2026.json` | `data_version` → `2026-08-28T00:00:00Z-v8`：觸發 v8.2 機制一次性清走全站舊 `staff`／`crisis` 快取（解決已經中咗嘅腦） |

### 為什麼咁改係安全嘅
- **唔改儲存內容**：正規化只用於「比對」，畫面顯示仍然係 Drive／上傳嘅原文（包括半形括號）。
- **唔刪真實資料**：只有 key 完全相同（＝同一組、同一職位、同一組人）先合併；空人名嘅懸空缺行逐行保留。
- **改動優先權不變**：本機編輯／Drive 同步仍然覆蓋種子行內容（`_userEdited`、有 desc 者優先），只係唔會再變兩份。
- **自我修正係單次**：`healStaffOrgCache()` 只喺真係刪到重複行時寫一次，其後載入就冇嘢好改。

## 4. 回歸測試

`tests/v89_org_chart_duplication_test.js`（用 vm 載入真 prototype，唔改任何產品碼）：

1. ① 以「Drive 同步後嘅髒快取」重現 ×2 → 斷言每組 `posts`／`members` 與 JSON 種子一致，`org_chart` 行數唔超过種子規模
2. ② 主頁卡片（`getGroupOrgNodes`）與部門管理中心（`groupInfoBoxesHTML` 嘅「本組崗位／成員 (N)」）數字必定相同
3. ③ 重複載入冪等 ＋ 快取自愈（寫回嘅 `org_chart` 冇重複行）
4. ④ 真正唔同嘅崗位唔會誤砍（同名同職位但唔同組別 → 保留；完全相同 → 合併）
5. ⑤ Drive 同步：同 key 覆蓋而唔係追加、沿用穩定 `org_seed_*` id、再同步一次行數唔變、內容真係改咗就要更新到
6. ⑧ `job_duties`／`contacts` 重覆上傳 → 部門中心內容唔再 ×2，並保留資料較齊嗰份

```bash
for f in js/*.js; do node --check "$f" || echo "FAIL: $f"; done
for t in tests/*.js; do node "$t"; done     # 11 個測試全部 PASS
```

## 5. 用家Side要做嘅嘢

- **冇需要**清瀏覽器或改檔案：`data_version` 上調後，第一次開啟會自動清走舊 staff 快取（console 會見 `[ISD] data_version changed → cleared staff/crisis local cache`）。
- 若某部機仍然睇到舊數：撳 F5 一次即可（讀取時本身都會去重，畫面唔會再翻倍）。
- 各組繼續「改 Drive 檔 → APP 自動同步」嘅做法；**上傳 JSON/CSV 而家係覆蓋同一崗位**，重送同一檔唔會再變兩份。

## 6. 日後防呆建議（未做，留 record）

1. `apps-script/Code.gs` 嘅 `Staff_Org` 寫入時以 `org_stable_id` 做唯一鍵（後端層面再擋一次）。
2. 架構圖上載前做一次 dry-run preview（顯示「更新 N／新增 M／刪除 K」），確認後先寫入。
3. 為 `job_duties` 加「一組一份」嘅唯一約束（或明確支援一組多份而以 `dutyKey` 去重）。
