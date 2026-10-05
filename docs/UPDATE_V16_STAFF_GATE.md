# v16 · 工作人員入口「一個入口・兩條路」分流

> 更新日期：2026-10-05　｜　範圍：**模擬示範版（mock_demo / public_channel_2027）**，2026 與 2027 範本資料未受影響。
> 續 v15《活動日版》（見 `docs/UPDATE_V15_EVENT_DAY.md`），公眾頻道頁尾嗰個「工作人員入口」由「直接彈 PIN 鍵盤」改為**先揀身份再登入**。

---

## 1. 要解決咩

以前撳「工作人員入口」→ 即刻彈 4 位密碼鍵盤 → 打啱就用 `demoLogin('陳子明')` 登入，
而 `demoLogin` 會帶 `mock_admin:true`，即係**所有管理權限全開**。
結果：任何知道活動密碼嘅人，都入到部門中心、批核中心、開戶、嘉賓名單。

今次分成兩條路：

| | 普通工作人員 | 籌委／職員 |
|---|---|---|
| 登入方式 | **只需 4 位活動密碼**（冇帳戶都用得） | **帳號＋密碼**（管理員開設） |
| 身份 | `role: staff`、`staff_pin: true`、**冇** `mock_admin` | 原有帳戶職級（同 2026 設計一樣） |
| 睇到 | 工作人員公開資料（5 張公開卡） | 工作人員公開資料 **＋** 部門中心、工作卡片、批核中心、管理工具 |
| 睇唔到 | 部門中心／工作卡片／批核中心／管理工具／嘉賓名單 | —（按職級） |

> 瀏覽器會記住登入（`localStorage`），下次入嚟唔使再打；撳「登出」即清除。

---

## 2. 畫面流程

```
公眾頻道 2027（示範）頁尾
        └─ 撳「工作人員入口」
               ↓
        ┌──────────────────────────────┐
        │ 分流選擇（新）                 │
        │ 🦺 普通工作人員  [只需活動密碼] │──→ 4 位 PIN 鍵盤 ──→ 工作人員公開資料
        │    ✓睇到… ✕睇唔到…            │       （返回揀身份）
        │ 🎖️ 籌委／職員   [帳號＋密碼]   │──→ 既有帳密登入視窗 ──→ 全部（同 2026）
        │    ✓睇到…                     │
        └──────────────────────────────┘
```

兩張卡都會**當場列出「✓ 睇到乜 / ✕ 睇唔到乜」**，撳之前已經知道分別。
PIN 畫面下面亦會再列一次同一份清單，同埋有「← 返回揀身份」。

入咗之後，儀表板最頂有一條**黃色提示條**：

> 🦺 **普通工作人員模式（活動密碼登入）**
> 你而家睇到嘅係**工作人員公開資料**。未開放：部門中心、工作卡片、批核中心等——需要籌委帳戶。
> 　　　　　　　　　　　　　　　　　　　　　　　　　　［ 我係籌委・帳號登入 ］

撳嗰個掣可以即刻升級做籌委帳密登入，唔使登出再嚟過。

---

## 3. 普通工作人員實際見到乜

| 區域 | 普通工作人員 | 籌委 |
|---|---|---|
| 公開資料（5 張：公告及溝通・執行手冊・申請中心・童心捐贈・公眾頻道 2027 示範） | ✅ | ✅ |
| 工作卡片（會議・物資・攤位・車輛・膳食・財務…） | ❌ 整區隱藏 | ✅ 按職級 |
| 管理工具（開戶・權限・用戶管理） | ❌ 整區隱藏 | ✅ 總主任以上 |
| 部門管理中心 | ❌ 整區隱藏 | ✅ |
| 底部導覽「部門中心」／「批核中心」 | ❌ 唔出現 | ✅ |
| 頂部「改密碼」／「開戶」 | ❌ 唔出現（冇帳戶） | ✅ |
| 活動橫幅「我的監察」 | ❌ 唔出現 | ✅ |
| 登出 | ✅ | ✅ |

就算有人直接叫 `app.openModule('dept_hub')`，都會被擋住並彈：
「呢部分要籌委帳戶（帳號＋密碼）先入到，請撳『我係籌委・帳號登入』」。

---

## 4. 改咗邊啲檔

| 檔案 | 改動 |
|---|---|
| `tools/build_pc2027_demo.js` | `staff_gate` 由 `{pin, login_as}` 擴成完整分流定義：`title / intro / remember_note / lanes[2] / pin_hint / pin_label / pin_user / account_hint`。**所有文案都喺呢度改**，改完行 `node tools/build_pc2027_demo.js`。 |
| `data/mock_demo.json` | 由上面個 generator 重新產生（唔好手改）。 |
| `index.html` | `#modal-staff-gate` 重寫成兩頁：`#pc-gate-choose`（分流，JS 砌）／`#pc-gate-pin`（鍵盤＋`#pc-pin-scope`＋返回掣），底部 `#pc-gate-remember`。儀表板新增 `#pin-staff-notice`（公開資料區之上）。 |
| `js/44-public-channel.js` | 新增 `pcStaffGateDef() / pcStaffLaneDef() / pcGateRender() / pcGateSetMode() / pcGatePick() / pcUpgradeToCommittee() / isPinStaff() / pcPinStaffNoticeHTML()`；`pcStaffLogin()` 改為建立受限身份（唔再叫 `demoLogin`）。 |
| `js/10-app-core.js` | `canSeeRoleCard()` 加 `staff_pin → 只開 minLevel 0`（一個關口擋晒全站）；`renderRoleCards()` 加 staff_pin 分支；`updateAdminNav()` 加 `pinStaff`；`showDashboard()` 隱藏部門管理中心；`renderIdentityBar()` 隱藏我的監察；`openModule()` 加白名單守門。 |
| `tests/pc2027_public_channel_test.js` | ⑨ 改寫成分流測試（⑨／⑨A／⑨B），新增 ⑱ 權限分流測試。 |

---

## 5. 驗證

```bash
node tests/pc2027_public_channel_test.js   # → 294 項全過（v15 時係 264）
node scripts/run-tests.js                  # → 14/35 失敗，同改動前一模一樣（無新增失敗）
node scripts/verify-project.js             # → 乾淨
```

---

## 6. 仲未做（上正式版要補）

1. **真密碼要出後端。** 而家 `staff_gate.pin = '2027'` 係寫死喺前端 JSON，任何人開 DevTools 都睇到。
   正式版應由 GAS 驗（`action:'verifyStaffPin'`），前端只收一個短效 token。
2. **密碼要可以換。** 建議每次活動換一次，並喺籌委端加一個「重設活動密碼」掣。
3. **普通工作人員嘅活動日工具。** 而家 `報到站／嘉賓接待站／源頭上傳中心／報名總覽`（示範）屬 `minLevel 20`，
   即係**淨係籌委先入到**。如果想前線工作人員用活動密碼就開到報到站，
   喺 `js/10-app-core.js` 的 `canSeeRoleCard()` staff_pin 分支加一個 id 白名單即可（例如 `['checkin_station']`）。
4. **稽核紀錄。** 用活動密碼入嘅人冇名冇姓，如果要知邊個做過咩，報到站等寫入動作要另外要求填名或者改用帳戶。
