# GS 簡潔填寫版設定

`apps-script/Code.gs` 最頂已整理成單一 `CONFIG` 填寫區。更新 Google Apps Script 時，請只保留／修改這一段，不要再貼舊版多個 CONFIG，避免互相覆蓋。

```js
const CONFIG = {
  API_KEY: '',
  SUPER_ADMIN_LOGIN: 'sheep',
  SUPER_ADMIN_PASSWORD: '1201',
  DEFAULT_USER_PASSWORD: '1234',
  DEFAULT_EVENT_PASSWORD: '1234',

  NOTIFY_STAFF_EMAIL: '',
  notifyFrom: '童軍活動管理系統',
  approverEmail: ''
};
```

## 3 個 email 欄位點填？

- `NOTIFY_STAFF_EMAIL`：選填，系統通知副本／工作人員收件箱。
- `notifyFrom`：不是 email；只是電郵顯示寄件人名稱，例如 `童軍活動管理系統`。
- `approverEmail`：選填，集中批核／回覆收件人。

## 是否全部都要用 Sheet 那個 Gmail？

不用。Apps Script 真正寄信的帳戶一定是「部署／授權此 GS 的 Google 帳戶」（通常即係 Sheet 擁有人或部署者）。

所以：

- `NOTIFY_STAFF_EMAIL` 可填任何可收信 email。
- `approverEmail` 可填任何可收信 email。
- `notifyFrom` 只填顯示名稱，不填 Gmail。

如果想電郵真正由某個 Gmail／Workspace alias 寄出，必須用該帳戶授權及部署 Apps Script；不能單靠填 `notifyFrom` 改變真正寄件帳戶。
