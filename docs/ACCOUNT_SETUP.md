# 👤 帳戶開設與密碼管理（開戶表 + 自行改密碼）

> 目的：超管（你）在 Google Sheet 內用「開戶表」一次過為各組開戶，預設密碼 1234；用戶登入後可在 APP 內自行修改密碼。

## 一、開戶表（Account_Setup）

`initializeSheets()` 會自動生成一個名為 **`Account_Setup`** 的工作表，欄位如下（第 1 列為表頭）：

| 欄位 | 說明 |
|---|---|
| `name` | 名字（必填） |
| `role` | 職位層級（下拉選：主席／顧問／管理員／副主席／總主任／主任／工作人員） |
| `job_title` | 職稱（例：副主席（主題節目）） |
| `group_name` | 組別（例：主題節目組） |
| `user_id` | 帳號（可留空，系統自動產生 `staff_10001` 等，並回寫到本表） |
| `email` | 電郵（選填，登入時可當帳號用） |
| `contact` | 電話（選填） |

## 二、如何開戶

1. 在 Google Sheet 打開 `Account_Setup`，從第 2 行起逐行填寫。
2. 選單列「**童軍活動管理 → 開戶（同步 Account_Setup → Users）**」。
3. 完成後每個新帳戶：
   - 帳號 = `user_id`（或自動產生）
   - **預設密碼 = 1234**
   - 已存在的帳戶只更新名字/職銜/組別，**不會覆蓋其已修改的密碼**。

> 也可透過前端 POST `action: syncAccountsFromSetup`（含 api_key）觸發同步。

## 三、用戶自行改密碼

1. 用戶登入後，右上角會出現「**修改密碼**」按鈕。
2. 輸入舊密碼 → 新密碼（至少 4 字元）→ 確認，即更新。
3. 後端 `changePassword` 驗證舊密碼後，把新密碼雜湊寫入 `Users.password_hash`。

## 四、角色權限對照

| 職位層級（下拉） | 系統角色 | 權限 |
|---|---|---|
| 主席 | `chairperson` | Level 2 |
| 顧問 | `advisor` | Level 2 |
| 管理員 | `admin` | Level 2 |
| 副主席 | `vice_chairperson` | Level 3 |
| 總主任 | `general_director` | Level 4 |
| 主任 | `director` | Level 5 |
| 工作人員 | `staff` | Level 6 |

> 超管（`sheep`）帳密僅存於 `Code.gs` 後端，不在開戶表內。

COPYRIGHT 2026 Scout System
