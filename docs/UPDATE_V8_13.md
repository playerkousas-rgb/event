# v8.13 — 訪客權限收緊 + 未登入版面填位 + 後端連線自救

日期：2026-08-31

## 一句話

**未登入（訪客）唔會再見到任何「新增」掣、主頁中間照樣有 4 張公開卡填滿版面、未選活動嗰陣唔會出現登入掣；後端（GAS）網址改為前端內建，並新增「後端連線診斷」，登入唔到時可以即場睇到邊一層斷。**

## 四項改動（對應要求）

| # | 要求 | 實際做法 |
|---|------|----------|
| 1 | 未登入竟然有「公告及溝通」嘅新增掣 | `openModule()` 嘅兜底分支以前係「無條件出新增掣」，任何模組、任何人都會出。而家改用 `canAddModuleRecord(key, def)`：未登入一律唔出；已登入就跟 `canEditRoleCard()`（同一套權限＝卡入面嗰啲新增／編輯掣），例如公告＝主任以上、旅團須知／日程表／危機處理＝副主席以上 |
| 2 | 未登入中間太吉 | `renderRoleCards()` 未登入時唔再收起「公開資料」區塊，改為照出 4 張公開卡（公告及溝通・執行手冊・申請中心・童心捐贈，即係底部導覽列嗰 4 個按鈕），一律標「公開可看」；工作卡片／管理工具仍然收起 |
| 3 | 未選活動唔好有登入掣 | `updateAdminNav()`：未選活動（`#view-landing`）時收起頂 BAR `#login-toggle-btn`（滑鼠提示：「請先選擇並進入活動，再按登入」）。`goHome()` / `switchTopTab()` 都會同步 call 一次 `updateAdminNav()` |
| 4 | 最高層管理帳號登入唔到（console 見 HTTP 400） | 見下面「後端連線」一節 |

## 後端連線（#4）

### 根因：GAS 網址只靠 `/api/config`，一斷就全斷

```
constructor: gasUrl = localStorage || ''      ← 以前係空字串
init():      由 /api/config 拎 gasUrl
```

只要 `/api/config`（Vercel serverless function）返 4xx／5xx／無回應，`gasUrl` 就係 `''` →
`mockMode` 變 `true` → **只存在後端嘅帳戶（最高層管理帳戶等）無論密碼啱唔啱都登入唔到**，
畫面只會出「登入失敗」，完全睇唔出係後端斷線。

### 改法

1. **前端內建預設值**：`js/00-config.js` 新增 `DEFAULT_GAS_URL` / `DEFAULT_API_KEY`；
   `constructor` 改用佢哋做底，`/api/config` 只做「可選覆寫」（`api/config.js` 亦改成 CommonJS，避免 Vercel 用 ESM loader 時失敗）。
2. **睇到真正嘅 HTTP 狀態**：新增 `gasPost()`，統一回傳 `{ok,status,statusText,json,text,error}`。
   以前 `try/catch + res.json()` 遇到 Google 回 400（HTML／空內容）只會報「回應唔係 JSON」，而家會報 `HTTP 400 Bad Request`。
3. **對症提示**：`loginFailureHint(status)` —— 400/401/403 → 叫你「部署 → 管理部署 → 新版本」重新部署；404 → 網址失效；429 → 配額；5xx → Google 端錯誤。
4. **後端連線診斷**：登入框底部 / 系統設定入面有「後端連線診斷」，一次過測
   **前端設定 → /api/config → ① GET getEvents（部署存活＋版本號）→ ② POST doPost（有冇執行到）→ ③ API Key（getAllUsers）**，
   並畀結論＋「複製報告」。
5. **離線登入（後備）**：後端 POST 失敗時，若本機名單有同一個帳號＋密碼，照畀登入，但標記 `offline`，
   頂 BAR 角色名會顯示「離線」，並提示改動只會留喺呢個瀏覽器、唔會寫入後端。

### 部署方面（需要人手做一次）

`apps-script/Code.gs` 已升到 **v8.4**（`doPost` 兼容表單編碼 payload；`GS_VERSION='v8.4-2026-08-31'`）。
改完 Code.gs 一定要喺 Apps Script 做 **「部署 → 管理部署 → ✏️ 編輯 → 版本：新版本 → 部署」**，
只撳「儲存」唔會更新 `/exec`。部署完可以用「後端連線診斷」睇版本號確認。

## 改咗邊啲檔

- `js/00-config.js`：`DEFAULT_GAS_URL` / `DEFAULT_API_KEY`
- `js/10-app-core.js`：`constructor`（預設值）、`init()`（記低 `/api/config` 狀態）、`gasPost()`、`loginFailureHint()`、後端連線診斷（3 個 method）、`canAddModuleRecord()`、`openModule()`、`renderRoleCards()`、`updateAdminNav()`、`goHome()`、`switchTopTab()`
- `js/33-users.js`：`submitLogin()` 改用 `gasPost()` ＋ 準確提示、新增 `offlineLogin()`、`updateUserUI()` 顯示「離線」
- `index.html`：新增「後端連線診斷」彈窗 `#modal-diag` ＋ 登入框／系統設定入口；js 快取版本號 → `20260831a`
- `api/config.js`：改 CommonJS（同時 export default 兼容 ESM）
- `apps-script/Code.gs`：v8.4（doPost 雙軌讀 payload）
- `tests/v8_13_guest_login_test.js`：新增 23 項檢查
- `tests/ui_layout_check.js`：更新為 v8.13 行為（訪客有 4 張公開卡）

全部 14 個測試檔通過（含 `tests/v82_fixes_test.js` 嘅「全 repo 唔可以有最高層帳號痕跡」私隱掃描）。
