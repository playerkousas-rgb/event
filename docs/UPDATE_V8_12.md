# v8.12 — 未登入超清爽版（登入前／登入後兩套介面）

日期：2026-08-31

## 一句話

**未登入＝只有活動資訊＋底部 4 個公開資料按鈕；登入後＝原本設計全部還原。** 登入按鈕全站只有一粒，喺最頂 BAR 右上角。

## 六項改動（對應要求）

| # | 要求 | 實際做法 |
|---|------|----------|
| 1 | 未登入不用顯示「我的監察」 | `renderIdentityBar()` 未登入時把 `#dash-hero-monitor` 清空並加 `hidden`（原本會顯示「登入後顯示」提示條，已刪） |
| 2 | 登入後不用顯示身份卡片 | 整張身份卡片（`#identity-card`／`#identity-name`／`#identity-login-btn`）已由 `index.html` 移除；身份只喺最頂 BAR 右上角 |
| 3 | 登入只喺右上角出現 | `index.html` 只餘 `#login-toggle-btn` 一粒登入掣；其餘位置（我的監察頁、膳食監察、泊車申請、申請中心提示、聯絡名單「登入可見」等）改為純文字提示「請按右上角「登入」」，唔再係掣 |
| 4 | 登入前「公開資料」／「登入後解鎖」兩堆全部唔要 | 未登入時 `#public-section`、`#identity-section`、`#management-tools-section`、`#simple-mode-note` 全部 `hidden`，卡片格線清空；「登入後解鎖」標題／字眼已刪 |
| 5 | 登入前把 4 個公開資料放喺最下方 4 個按鈕位置 | 底部導覽列新增訪客專用 `#bn-pub-announcements`（公告及溝通）及 `#bn-pub-donations`（童心捐贈），連原有 執行手冊・申請中心 合成 **公告及溝通・執行手冊・申請中心・童心捐贈** 4 粒（次序同 `PUBLIC_CARD_ORDER` 一致） |
| 6 | 登入後還原原本按鈕設計 | `updateAdminNav()` 登入後隱藏兩粒訪客掣，還原 **執行手冊・申請中心・批核中心（總主任以上）・部門中心**；儀表板亦還原 公開資料 → 工作卡片 → 管理工具 → 部門管理中心 |

## 改咗邊幾個檔

- `index.html`：底部導覽列（兩套）、刪身份卡片、`identity-section`／`simple-mode-note` 預設 `hidden`、功能介紹說明書同步更新
- `js/10-app-core.js`：`renderIdentityBar()`（未登入直接 return）、`renderRoleCards()`（未登入隱藏全部區塊）、`updateAdminNav()`（兩套底部導覽）、`updateBottomNav()`（訪客掣 active 標示）
- `js/23-sync.js`、`js/26-monitor-apply.js`、`js/27-parking.js`、`js/31-staff.js`：刪走散落各處嘅登入掣，改成文字提示
- `tests/ui_layout_check.js`：更新為新行為（訪客清爽版 + 登入後還原）

## 回歸測試

```bash
node tests/ui_layout_check.js   # UI_LAYOUT_CHECK_OK
for f in tests/*.js; do node "$f" >/dev/null || echo "FAIL $f"; done
```

全 13 個測試檔通過。
