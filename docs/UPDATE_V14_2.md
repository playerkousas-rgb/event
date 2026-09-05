# v14.2（2026-09-05）名單點名「取消」改跟紀念章：「修正」格，唔再 prompt 問更正原因

> 用戶更正：「我已經設計咗取消機制（嘉賓紀念章嘅『修正』格＋ `docs/TICK_CONCURRENCY_RULES.md`），五張名單照跟，唔好自己再發明另一套。」
> 本次只改 `js/41-roster-lists.js`（＋ `00-config.js` 提示文字、測試、文件），後端 `apps-script/Code.gs` 已經符合規則，**唔使重新部署 GAS**。

## 之前（v14.0／14.1）vs 而家（v14.2）

| | v14.0／14.1（已廢除） | v14.2（跟紀念章＋規則文件） |
|---|---|---|
| 每行 | 一個 checkbox | **綠色 TICK 格 ＋ 細嘅紅色「修正」格**（同 `40-souvenir-stamps.js` 一模一樣嘅做法） |
| 取消 TICK | 剔走 TICK → `prompt()` 問更正原因，唔填就彈返 | **只有 TICK=Y ＋ 修正=Y 先會取消**呢一次 TICK；取消後兩格清空 |
| 直接剔走 TICK | 當取消（要填原因） | **NO-OP**：格會彈返 ✅，並提示「要取消請同時剔紅色『修正』格」——本機空白永遠唔係刪除指令 |
| 單剔「修正」（未 TICK） | — | NO-OP，修正格彈返空白 |
| 重覆 TICK | 覆蓋操作者／時間 | **冪等**：唔覆蓋原操作者／時間，唔會互相抵消 |
| 修正之後 | 可再 TICK | 可再 TICK（另一位工作人員真係見到到場就 TICK 返；修正唔係永久鎖） |
| 後端送出 | TICK＝`checked_in=Y`；取消＝`checked_in=N`＋`correction_cancelled=Y`＋`checkin_note=原因` | TICK＝`checked_in=Y`；**修正＝`checked_in=Y`＋`correction_cancelled=Y`**（Code.gs 收到先改成 `N`，同紀念章／典禮點名一樣）；**永遠唔會送「裸 N」** |
| 點名紀錄欄 | 「取消：原因」 | 「✅ 已點名 · 操作者 · 時間」／「↩ 修正取消 · 操作者 · 時間」 |
| 匯出（Excel／Word） | 最後一欄「備註(點名)」＝原因 | 最後一欄「**最後動作**」＝`TICK`／`修正取消` |
| 統計 | 已點名／總數 | **按目前顯示範圍**（排序／篩選後）：優異旅團＝`已到／回覆出席／全名單`（例 `1/1/1`）；其餘四張＝`已X／全名單`；每個分組 chip 同一格式 |

## 規則文件檢查表 → 名單引擎對應

| `TICK_CONCURRENCY_RULES.md` 檢查表 | 名單引擎（`rosterTick`） | 測試 |
|---|---|---|
| 正常空白不會覆蓋別人已 TICK | 剔走 TICK ＝ NO-OP，唔建紀錄、唔發 request | B24／B24b |
| 多人 TICK 採用集合合併 | TICK 只 ADD、冪等；後端 upsert by `checkin_id` 並只接受較新操作 | B23b／D6 |
| 修正必須同時有 TICK 及修正動作 | `isCorrection` 而行未 TICK → 彈返、toast | B23a／B32d0 |
| 修正完成後兩格清空 | 修正後 `rosterRefreshBody` 重畫，兩格空白 | B25b |
| 修正後可由另一人重新 TICK | 冇永久鎖 | B26／B32d3 |
| 後端保存最後操作者、時間及動作 | `checked_by／checked_by_id／checked_at／correction_cancelled` | D4／D4c |
| 排序／篩選後統計只計算目前範圍 | `rosterScopeStats(def, rosterViewRows)`＋分組 chip | B27／B32d2 |
| 多裝置重新載入後使用後端最新資料 | `rosterPullFromGas` 以 `Roster_Rollcall_Checkins` 最新一筆（含修正）為準 | D5／D5b／D6 |

## 改動檔案

| 檔案 | 內容 |
|---|---|
| `js/41-roster-lists.js` | 每行 TICK＋「修正」格；`rosterTick(key,rowKey,el,isCorrection)`（**冇 `prompt`**）；`rosterScopeStats`；點名紀錄欄／匯出「最後動作」；`rosterSaveTickToGas` 修正協定同紀念章；`rosterPullFromGas` 保留 `correction` 旗標；`syncMeritAwardTick` 回寫 `correction_cancelled` 到優異旅團回條 |
| `js/00-config.js` | 五張名單 `tick_hint` 改為「取消請同時剔『修正』格（TICK 只加不減）」 |
| `index.html` | `00-config.js`／`41-roster-lists.js` `?v=20260905e` |
| `tests/v14_roster_lists_test.js` | B23–B26、B32d、D4–D6 改為「修正」格流程（151 checks） |
| `docs/UPDATE_V14_0.md`／`UPDATE_V14_1.md`／`TICK_CONCURRENCY_RULES.md` | 更正舊描述；規則文件加「採用狀況」 |

## 驗證

* `node tests/v14_roster_lists_test.js` → 151 checks OK；全部測試 20 pass／4 個係本來就 fail 嘅舊測試（ui_layout_check、v11 ⑤、v84 ④、v8_13 ②，同 v14.1 之前一樣）。
* 真 Chromium（示範版、區子君登入、支部獎勵名單兩行）逐步撳：TICK → ✅ 已點名 · 區子君 · 時間；再剔走 TICK → 彈返 ✅（NO-OP）；單剔第二行「修正」→ 冇動作；第一行 TICK＋修正 → 兩格清空、紀錄「↩ 修正取消」、進度 0/2；再 TICK → 1/2。0 page error；21 個版面工具列 0 白字按鈕、0 CSV 字樣。
