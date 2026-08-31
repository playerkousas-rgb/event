# v9.0 — 2025 執行手冊對標＋上傳方式統一＋身份/登出位置校正

日期：2026-08-31

## 一句話

**2025 有的項目 2026 全部有對應位置**（14 項文件，0 項完全缺失；7 項「版位待填」需用戶提供 2026 文件）；地圖／遊戲卡／典禮儀式附件上傳統一為 **PDF／Word／圖片／Drive 連結**（Word→mammoth 解析文字 JSON 內嵌，PDF→整份 base64 內嵌 iframe）；身份與登出按鈕**只保留最頂 BAR 右上角**。

## 四項要求對應

| # | 要求 | 做法 |
|---|------|------|
| 1 | 執行手冊對標 2025，分類及標亮 | 新增 `docs/2025_EXEC_MANUAL_COMPARISON.md`：逐頁抓取 2025 Google Sites（首頁／行政組／主題節目組／協調組），14 項文件逐項對應 2026 位置並分類（✅已有／🟢升級／🟡版位待填／⚠️已轉移／❌未有），待決項目用 `<mark>` 標亮 |
| 2 | 地圖上傳方式同遊戲卡 | `js/21-activities.js`：地圖頁移除散落「上傳文件」掣；地圖表單加「版本」欄（同遊戲卡）；兩者 accept 改為 `.pdf,.docx,.doc,.jpg,.jpeg,.png`；新增共用 `activityFilePreviewHTML()`（Drive 連結→iframe、圖片→img、PDF→整份內嵌 iframe、Word→mammoth 解析文字內嵌）；地圖／遊戲卡卡面支援編輯＋顯示版本 |
| 3 | 典禮儀式所有項目上傳同遊戲卡 | `js/35-ceremony.js`：`getCeremonyData()` 加 `files:[]`；新增附件區（7 個項目：RUNDOWN／司儀稿／嘉賓名單／座位表／致辭稿／獲獎名單／嘉賓地圖）；`openCeremonyFileForm`／`submitCeremonyFileForm`／`deleteCeremonyFile`／`downloadCeremonyFile`；Word→mammoth 解析 JSON 文字內嵌，JSON 檔→pretty-print 內嵌，PDF→整份 base64 內嵌 iframe；原內建 JSON（rundown／mc／guests／seating／speech）保留 |
| 4 | 身份／登出只在右上角 | `js/26-monitor-apply.js`：申請中心登入後綠 bar 移除「姓名（角色·組別）＋登出按鈕」，改為純文字提示「身份及登出位於最頂 BAR 右上角」；我的監察無權限頁移除身份卡（姓名／角色／組別徽章），只留說明；`index.html` 登入 modal 內 MOCK 掣改名「🌍 切換為訪客（公開）」；全站 `app.logout()` 只餘 頂 BAR `#logout-btn` 及 modal 內 MOCK 切換掣 |
| 5 | 訪客身份指引卡 | **保留**（用戶確認正確）：未登入時儀表板仍顯示「你好，訪客！公開」指引卡（初始帳戶＝中文姓名、密碼 1234、開戶找所屬組別總主任），屬 v8.12 設計，不在移除範圍 |

## 改咗邊幾個檔

- `js/21-activities.js`：地圖頁／表單、遊戲卡表單、共用預覽 helper、Word/PDF 處理
- `js/35-ceremony.js`：附件區＋上傳／編輯／刪除／下載方法
- `js/26-monitor-apply.js`：申請中心、我的監察移除身份卡／登出按鈕
- `index.html`：登入 modal MOCK 掣改標籤
- `README.md`、`docs/2025_EXEC_MANUAL_COMPARISON.md`、`docs/UPDATE_V9_0.md`
- `tests/ui_layout_check.js`：我的監察無權限頁改為「不顯示身份」斷言
- 新增 `tests/v9_0_2026_manual_uploads_identity_test.js`（36 checks）

## 回歸測試

```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
for t in tests/*.js; do node "$t" >/dev/null || echo "FAIL $t"; done
```

全數通過（含新增 v9.0 測試）。

## 待用戶決定（見對標文件標亮項）

A3 急救申請 2026 回條、A4 膳食安排圖、A5 參加旅團名單來源、B1 2026 遊戲卡（機電先鋒）、B5 考驗回條獨立項、C1 2026 場地佈置圖、C3 箱頭紙、C4 2026 佈置數據 Sheet。
