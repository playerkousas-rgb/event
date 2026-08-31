# v8.14 — 部門／卡片歸屬：邊個組管邊張卡

日期：2026-08-31（用戶定案）

## 一句話

**部門只畀自己組＋執副以上（＋行政組統管）睇；卡片按「負責組別」分權：執行手冊・申請中心＝行政組，膳食・物資・車＝協調組，攤位＝主題節目組，童心捐贈＝服務及發展組，會議卡片＝秘書處。** 後端 Code.gs 升 v8.5（最高層管理帳號改過密碼後都入到＋帳號體檢 `accountCheck`）。

## 定案一覽

| # | 定案 | 實際做法 |
|---|------|----------|
| 1 | 最高層管理帳號登入唔到（總主任正常） | 見下面「後端 v8.5」 |
| 2 | 總主任淨係睇自己部門；除執副以上唔可以睇其他部門 | `canSeeRoleCard()`、`visibleGroups()`、`renderGroupQuickAccess()`、`renderDeptHubModule()`、`openGroupManagement()`、`openDeptHub()` 全部用 `isAllGroupViewer()`／`canViewGroup()` 把關：執副以上／行政組＝全部，其餘＝淨係自己組（上級 `perm_see` 明確授權除外）。嘗試直接開第二個部門會彈提示並踢返 |
| 3 | 執行手冊歸行政組（其他組只可看） | `CARD_OWNER_GROUPS.exec_manual=['行政組']`；`canEditRoleCard()` 嘅 `readOnly` 卡改為「負責組可改」；典禮儀式／危機處理／通告及文件／場地與活動總覽等執行手冊內頁同步畀行政組主任以上編輯 |
| 4 | 申請中心歸行政組統管；膳食・物資・車＝協調組；攤位＝主題節目組 | `APPROVAL_ROUTING_DEFAULTS`：膳食／物資／車 approver+executor＝`協調組`＋`行政組`；新增 **攤位獨立路由** `booth`＝`主題節目組`＋`行政組`（唔再跟 `supplies`）；攤位嘅批准／拒絕改用 `canApproveArea('booth')`，申請中心顯示「批核：主題節目組」 |
| 5 | 童心捐贈歸服務組（行政組亦可管） | `CARD_OWNER_GROUPS.donations=['服務及發展組']` ＋ 行政組統管；`canViewDonationsStats()` 同步 |
| 6 | 會議卡片歸秘書處（行政組亦可管） | `CARD_OWNER_GROUPS.meetings=['秘書處']`（原本 `meetings:()=>this.isAdmin()`，即係只有管理員）＋ 行政組統管 |
> 補充：會議**內頁**入面所有「管理員先用得」嘅掣（新增會議／改／刪／上載議程・紀錄・附件／睇整理用 private 會議／改內建議程 JSON），原本係 `isAdmin()`，v8.14 一律改為 `canManageMeetings() = isAdmin() || isCardOwnerGroup('meetings')`，所以秘書處・行政組主任以上真係改到（唔再係淨係「卡面寫可修改、入去冇掣撳」）。

## 核心機制

```
isCardOwnerGroup(cardId)   負責組別？（行政組＝統管全站，任何卡都 true；其餘查 CARD_OWNER_GROUPS）
                           組內要 CARD_OWNER_MIN_LEVEL(30)＝主任以上先可以改
isAllGroupViewer()         可以睇晒全部部門？執副以上／管理層／行政組（主任以上）
canViewGroup(groupName)    可以睇／入呢個部門？＝ isAllGroupViewer() || 自己組 || perm_see 授權
```

改歸屬只要改 `js/00-config.js` 嘅 `CARD_OWNER_GROUPS` 就得（一個 Map）。
改批核／執行組別改 `APPROVAL_ROUTING_DEFAULTS`（v8.14 會自動清一次舊 localStorage 路由快取，用 `APPROVAL_ROUTING_VERSION` 旗標，只做一次）。

## 後端 v8.5（要人手重新部署）

1. **最高層管理帳號鎖死問題**：舊 `handleLogin` 有 `if (rowObj.role === 'super_admin' && rowObj.user_id === <最高層帳號>) continue;`
   —— 即係最高層嗰行永遠唔會用 Users 表對密碼。只要用過前端「改密碼」（寫入 Sheet），SCRIPT 常數密碼就失效，
   而 Sheet 嗰行又被 skip → 變「找不到用戶帳號」，**帳號永久鎖死**（一般委員帳號唔受影響，所以總主任照入到）。
   v8.5 刪咗嗰行 skip：常數密碼對唔到就落 Sheet 用已存嘅 hash 對，改過密碼一樣入到。
2. **`accountCheck`（需 api_key）**：畀「後端連線診斷」查某個帳號嘅狀態 —— 存唔存在、角色、組別、有冇密碼、
   係咪仲用預設 1234／SCRIPT 內建密碼。**只回傳狀態，唔回傳密碼或 hash**。
   前端喺「後端連線診斷」加咗「要體檢嘅帳號」輸入框；登入失敗時亦會自動查一次，直接講「後端冇呢個帳號」／「冇密碼」／「仲用緊 1234」。

⚠️ 改完 Code.gs 必須 **「部署 → 管理部署 → ✏️ 編輯 → 版本：新版本 → 部署」**，只撳「儲存」唔會更新 `/exec`。
部署後「後端連線診斷」版本號應顯示 `v8.5-2026-08-31`；未部署前「④ 帳號體檢」會提示「後端未支援 accountCheck」。

## 改咗邊啲檔

- `js/00-config.js`：`CARD_OWNER_GROUPS`／`CARD_OWNER_MIN_LEVEL`、`APPROVAL_ROUTING_DEFAULTS`（＋`booth` 路由）、`APPROVAL_ROUTING_VERSION`、卡片 `editLabel` 更新
- `js/10-app-core.js`：`isCardOwnerGroup()`、`isAllGroupViewer()`、`canViewGroup()`、`visibleGroups()`、`canSeeRoleCard()`（部門卡收窄）、`canEditRoleCard()`（負責組＋readOnly 卡）、權限表 f-map（documents／activities／meals／ceremony／crisis／unit_guide／schedule／meetings／donations）、`renderGroupQuickAccess()`、`renderDeptHubModule()`、`openGroupManagement()`（擋非自己部門）、`openDeptHub()`、後端連線診斷加「④ 帳號體檢」
- `js/33-users.js`：`getLocalApprovalRouting()`（v8.14 清一次舊路由快取）、`canApproveArea()`（權限表冇嗰欄時跟組別路由，唔會人人變冇權）、`loginAccountHint()`、`submitLogin()` 失敗提示
- `js/24-supplies.js`：攤位批准／拒絕改用 `canApproveArea('booth')`
- `js/26-monitor-apply.js`：申請中心攤位卡顯示「批核：主題節目組…」
- `js/21-activities.js`／`js/35-ceremony.js`／`js/36-crisis.js`／`js/38-donations.js`：行政組（負責組）／服務組權限同步
- `apps-script/Code.gs`：v8.5（handleLogin 唔再 skip 最高層帳號 ＋ `accountCheck`）
- `tests/v8_14_group_ownership_test.js`：新增 50 項檢查；`tests/ui_layout_check.js`、`tests/workflow_smoke.js` 更新為新預期

全部 15 個測試檔通過。


---

## v8.14c（2026-08-31 補）

### 1. 會議卡片：加埋「執副以上」
`canManageMeetings()` 由 `isAdmin() || isCardOwnerGroup('meetings')` 改為
`isAdmin() || isExecViceOrChair() || isCardOwnerGroup('meetings')`，
所以**秘書處（負責）・行政組（統管）・執副主席／主席／顧問／管理員**全部管到會議；卡面標示改為「秘書處・行政組・執副以上可管理」。
留意：副主席（level 60）唔屬於「執副以上」，除咗本身係秘書處／行政組，否則仍然只可看。

### 2. 後端 v8.6：最高層管理帳號「點解入唔到」一次過分得出
| 新增 | 用途 |
|------|------|
| `isBuiltinSuper(loginId)` | 判斷打入去嘅 id 係咪就係 SCRIPT 常數嗰個最高層管理帳號（唔分大小寫） |
| `handleLogin` 專屬錯誤 | id 啱但常數密碼對唔上、Users 表又冇呢行 → 回 `reason:'builtin_password_mismatch'`「最高層管理帳號：密碼唔啱（SCRIPT 常數對唔上）…」，唔會再淨係講「找不到用戶帳號」 |
| `accountCheck` 密碼探針 | 前端將啱啱打錯嘅密碼一齊 POST（只同 SCRIPT 常數比較，**唔寫入任何表、唔回傳密碼**）→ `script_password_match: true/false` |
| `maskId()` 遮罩 | 回傳 `super_admin_id_masked`（例如 `s***（共 5 個字）`／`s***@gmail.com`），帳號打錯字時提示「SCRIPT 內建嗰個 id 長乜嘢樣」，但唔會外洩完整帳號 |

前端配套：
- 登入失敗時 `loginAccountHint(id, pwd)` 帶埋密碼探針，提示會直接講邊一樣出事（帳號唔存在／密碼唔啱常數／後端係舊版本）。
- 「後端連線診斷」多咗一格**「密碼（選填，只作比對用）」**，體檢結果會多一列「④ 密碼探針」。

### 點解最高層管理帳號會「一直用到，某次更新後入唔到」
呢個帳號**淨係寫喺 Apps Script 嘅 SCRIPT 常數入面，Users 表冇佢嘅紀錄**（呢個係設計，唔係 bug）。
所以佢一定要靠 `handleLogin` 最頂嗰段常數檢查先入到；只要 `/exec` 部署嘅 Code.gs **舊過嗰段常數檢查存在嘅版本**，
後端就只會去 Users 表搵 → 梗係搵唔到 → 「找不到用戶帳號」。
其他委員（例如總主任）本來就喺 Users 表，舊版本一樣讀到，所以會出現「總主任入到、最高層管理帳號入唔到」嘅現象。
👉 **唯一解法：喺 Apps Script「部署 → 管理部署 → ✏️ 編輯 → 版本：新版本 → 部署」。**（只撳「儲存」唔會更新 /exec）


---

## ✅ 結案（2026-08-31 用戶確認）

「最高層管理帳號入唔到」**唔係 bug**：早前因為開會時密碼外洩，用戶已經喺 Apps Script 入面改咗
`SUPER_ADMIN_PASS`（所以前端／Sheet 點睇都唔會對到），用新密碼登入一切正常。

> 教訓：呢個帳號**只存在 Code.gs 嘅 SCRIPT 常數**，Users 表冇紀錄；只要改過 `SUPER_ADMIN_PASS`，
> 就一定要用 Code.gs 入面嗰個新密碼登入（前端「改密碼」唔適用於佢）。

保留落嚟嘅改動（當係韌性＋自救工具，日後再遇到一睇就知邊度出事）：

| 版本 | 留低嘅嘢 | 點解留 |
|------|---------|--------|
| v8.5 | `handleLogin` 唔再 skip 最高層管理帳號嗰行 | 萬一日後喺 Users 表加返佢嘅紀錄／用「改密碼」，都唔會永久鎖死 |
| v8.6 | `isBuiltinSuper()`・`maskId()`・`accountCheck` 密碼探針・`builtin_password_mismatch` | 再入唔到時，診斷報告會直接講：帳號唔存在／密碼唔啱常數／部署係舊版本 |

日後再遇到「入唔到」：開「後端連線診斷」→ 填帳號＋（選填）密碼 → 睇「④ 帳號體檢／密碼探針」一列就得。


---

## v8.14d（2026-08-31 權限再放寬）

### 1. 會議卡片：開畀副主席・總主任（佢哋要上傳部門報告／會議文件）

| 角色 | 會議卡片 |
|------|---------|
| 秘書處（負責組） | ✅ |
| 行政組（統管） | ✅ |
| 執副以上（主席／顧問／執副主席／管理員） | ✅ |
| **副主席** | ✅（v8.14d 新加） |
| **各組總主任** | ✅（v8.14d 新加） |
| 一般主任／工作人員 | 只可看 |

卡面標示：**秘書處・行政組・副主席以上・總主任可管理**

### 2. 執行手冊系列：開畀總主任
總主任可以自己改部門相關項目，唔使吓吓經行政組。覆蓋嘅卡／分頁：
`執行手冊`、`場地與活動總覽`、`通告及文件`、`典禮儀式`、`危機處理`
（即係執行手冊入面除咗「攤位總表」同「財務指引」以外嘅分頁；「攤位總表」維持歸主題節目組）。

主任級（30）同一般工作人員維持只可看；卡面標示統一為 **行政組・副主席以上・總主任可修改／上傳／更新**。

### 3. 「睇晒全部部門」嘅名單（其餘一律淨睇自己部門）

```
執副以上（主席／顧問／執副主席／管理員）
＋ 副主席
＋ 行政組總主任
＋ 參事主任          ← 認 job_title 含「參事」＋主任級以上
＋ 行政組（統管全站，主任級以上）
```
**各組總主任（非行政組）仍然淨係睇自己部門** —— 呢點維持不變。

### 改咗邊度
| 檔案 | 改動 |
|------|------|
| `js/00-config.js` | 新增 `CARD_OWNER_EXTRA_ROLES`（唔理邊組都改到嘅角色：`exec_manual`/`activities`/`documents`/`ceremony`/`crisis`→總主任；`meetings`→副主席・總主任）；更新相關 `editLabel` |
| `js/10-app-core.js` | `isAllGroupViewer()` 加入副主席・行政組總主任・參事主任；`isCardOwnerGroup()` 加讀 `CARD_OWNER_EXTRA_ROLES` |
| `js/35-ceremony.js`・`js/36-crisis.js` | 提示語改為「僅管理員／副主席以上／行政組・總主任（負責組）可…」 |

日後再改：淨係加／減 `CARD_OWNER_EXTRA_ROLES` 入面嗰幾行就得，其餘唔使掂。
