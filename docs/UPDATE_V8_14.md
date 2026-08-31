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

1. **最高層管理帳號鎖死問題**：舊 `handleLogin` 有 `if (rowObj.role === 'super_admin' && rowObj.user_id === 'sheep') continue;`
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
