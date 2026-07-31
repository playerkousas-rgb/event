# 🎪 童軍活動管理系統 v6.0 - 主系統整合與全前端控制說明

> 參考 scoutbadge 同一個 APP 管晒所有旅團，整合主系統 Portal 與獨立運作雙軌，100% 全前端控制，手機友善

---

## 🌟 v6.0 與 scoutbadge 設計對照

| 設計點 | scoutbadge | 本系統 v6.0 |
|---|---|---|
| 同一個 APP 管晒所有 | 一個 Vercel 管理幾十個旅團 (0082,0015...) | 一個 Vercel 管理多個活動 (isd_2026, isd_2027...) |
| URL 公開無妨 | backend /exec 公開 | GAS /exec 公開 |
| API Key 防爬蟲 | `TROOP_0082_APIKEY` 放 Vercel 環境變數，不進 Git | `ISD2026_APIKEY` 同理，`/api/config` 合併 |
| 人類靠登入防 | 無 token 讀不到進度 | 無密碼讀不到 Users 明細 |
| 批量開戶三軌 | CSV 主路 / JSON / GS 直寫 | CSV 主路 / JSON / GS 直寫 (用戶管理) |
| 手機友善 | Bottom Nav + 卡片 + Bottom Sheet | 同款 Bottom Nav + 卡片 + Bottom Sheet + safe-area |
| 全前端控制 | 用戶管理、權限、小隊、系統設定皆前端 | 活動、用戶、財務、Banner、GAS設定、匯出匯入皆前端 |

---

## 🔗 主系統接入兩條路 (有主系統 / 無主系統並存)

### 軌道A：無主系統 / 想獨立用

```
獨立用：scoutbadge.vercel.app 方式
用法：直接打開本系統首頁 → 選活動 → 登入 → 使用
部署：旅團/活動提交 URL+APIKEY 給 APP ADMIN → 改 events.json + 加 ISD2026_APIKEY → Redeploy
```

### 軌道B：有主系統並想接上 (Portal)

```
主系統 Dashboard 插件卡片 → 點卡片 → 自動帶入 ?event=isd_2026&u=...&from=portal&embed=1&backend=...&apikey=...
用法：主系統已登入，免再登入，直接進入活動儀表板
部署：同軌道A，但額外交主系統管理員填入活動設定 → 元件設定 backend+apikey
```

**重點**：有主系統 ≠ 一定要接上，可自由選擇獨立用或接上，兩條路並存不衝突。獨立用靠本系統登入，接入用主系統 SSO。

---

## 🛠️ 全前端控制清單

以下全部可在「全前端控制台」完成，無需開 Google Sheet：

- ✅ 活動 CRUD：新增、編輯、刪除活動，ID、名稱、日期、狀態、密碼
- ✅ 用戶管理：單個新增、編輯、批量開戶 CSV/JSON/GS、角色、組別、小隊、權限、狀態、停用、重設密碼
- ✅ 會議 Banner：橫幅文字、下次會議時間、地點，全前端編輯即時生效
- ✅ GAS 連接：GAS URL、API Key，保存到 localStorage + 測試連接
- ✅ 私隱設定：允許訪客、允許成員互看進度、小隊比較開關
- ✅ 資料匯出匯入：全部 JSON 備份還原，MOCK 載入，清除快取
- ✅ 財務、物資、膳食、會議等8大模組：新增申請，批核中心批量批准
- ✅ 審批流：上級批下級，支援一鍵批量批准全部

---

## 📱 手機友善實現

- 底部導航：`position:fixed; bottom:0; padding-bottom:calc(6px + env(safe-area-inset-bottom))`
- 表格轉卡片：`@media(max-width:768px){ thead{display:none} tbody tr{display:block;border-radius:12px} td::before{content:attr(data-label)} }`
- Modal Bottom Sheet：`align-items:flex-end; border-radius:16px 16px 0 0; max-height:88vh`
- 觸控目標：`.btn-mobile{min-height:44px}`
- 輸入防放大：`font-size:16px` 在 ≤768px

---

## 🔐 角色權限

Level 1 super_admin (sheep/0728) - 隱藏，最高，全前端
Level 2 advisor / admin / chairperson - 主席、顧問
Level 3 vice_chairperson - 副主席，有批核權
Level 4 general_director - 總主任
Level 5 director - 主任，會議通知默認對象
Level 6 staff - 工作人員
Level 7 public - 公開訪客

細緻權限：`allowed_modules` 欄位，`*` 代表全部，或逗號分隔 `meetings,finance,staff,approvals...`，參考 scoutbadge `allowed_badges`

---

## 🚀 主系統卡片設定範例

```json
{
  "id": "isd_2026",
  "name": "2026 ISD 港島童軍繽紛日",
  "icon": "tent",
  "type": "iframe",
  "url": "https://your-event.vercel.app/?event=isd_2026&from=portal&embed=1",
  "backend": "https://script.google.com/macros/s/.../exec",
  "apikey": "scout_xxxx",
  "roles": ["super_admin","advisor","admin","chairperson","vice_chairperson"]
}
```

主系統帶身份：

```
/?event=isd_2026&u=00820001&role=staff&name=陳小明&from=portal&embed=1&backend=EXEC_URL&apikey=KEY&eventName=ISD2026
```

本系統 `handlePortalParams` 同 scoutbadge 做法：若 `from=portal`，自動免登入進入，並顯示 Portal 標籤。

---

## 📦 批量開戶與主系統用戶同步

- 主系統成員庫可一鍵匯出 CSV → 格式轉 `users_template.csv` → 批量開戶中心上傳 → 同步到本系統 Users
- 本系統亦可匯出 JSON → 主系統匯入
- 小隊 `squad` 欄位與主系統小隊制度對齊，支援紅隊/藍隊等

---

## COPYRIGHT 2026 Scout System
參考：https://github.com/playerkousas-rgb/scoutbadge.git
