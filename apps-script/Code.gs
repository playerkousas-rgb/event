// ============================================================
// 童軍活動管理系統 - Google Apps Script 後端 v8.1
//  v8.1 更新：超管不屬行政組；籌委全員種子寫入 Users；會議種子；updateUser（前端「確定更新用戶」才寫入）；批核路由僅超管由前端確定後呼叫 saveApprovalRouting。
//  v8.0 更新：動態 Approval_Routing、跨裝置 Finance_Expenses、本組確認欄位及永久刪除同步。
//  v7.7 更新：新增 Vehicle_Passes（車輛通行證/泊車）工作表；
//            Supply_Requests 補 unit/qty_approved/reason/date_needed/deadline/contact/requested_by_id/approved_at/notes 欄；
//            Meals 補 options/price/deadline/locked/created_by 欄；getEventData 一併回傳 Vehicle_Passes。
//  ⚠️ 更新後請在 Apps Script 執行一次 initializeSheets（只會新增表／於最右加欄，不會改動或刪除既有資料），然後重新部署。
// （原 v5.0 零精簡·全文本實戰版）
// COPY RIGHT Scout System
// 確保 Google Sheet 內包含所有 30+ 份檔案的完整文本、全套詳細預算明細、完整組織名單與政策
// ============================================================

const SUPER_ADMIN_EMAIL = 'sheep';
const SUPER_ADMIN_PASS = '0728';

function getSheet() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getApiKey() {
  const props = PropertiesService.getScriptProperties();
  let apiKey = props.getProperty('API_KEY');
  if (!apiKey) {
    apiKey = 'scout_' + Utilities.getUuid().replace(/-/g, '').substring(0, 24);
    props.setProperty('API_KEY', apiKey);
  }
  return apiKey;
}

function refreshApiKey() {
  const props = PropertiesService.getScriptProperties();
  const newApiKey = 'scout_' + Utilities.getUuid().replace(/-/g, '').substring(0, 24);
  props.setProperty('API_KEY', newApiKey);
  const ui = SpreadsheetApp.getUi();
  if (ui) ui.alert('API Key 已刷新', '新的 API Key：\n\n' + newApiKey, ui.ButtonSet.OK);
  return newApiKey;
}

function verifyApiKey(key) {
  return key === getApiKey();
}

function hashPassword(p) {
  if (!p) return '';
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, p, Utilities.Charset.UTF_8);
  return raw.map(function(b){return ('0' + (b & 0xFF).toString(16)).slice(-2);}).join('');
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══ 會議 Drive 公開讀取版：只讀取「知道連結的任何人可查看」資料夾 ═══
// 不使用需要授權的 Drive 服務，因此部署毋須取得使用者的 Google Drive 權限；UrlFetchApp 只會看到公開內容。
function listDriveFolder(data) {
  try {
    const folderId = (data.folder_id || data.id || '').toString().trim();
    if (!folderId) return { success: false, error: '缺少 folder_id' };
    const root = fetchPublicDriveFolder(folderId);
    const out = {
      success: true,
      folder: root.name || '會議 Drive',
      folder_id: folderId,
      subfolders: [],
      files: root.files
    };
    // 只展開一層子資料夾（每次會議一個），避免大量遞迴請求超出 Apps Script 時限。
    root.subfolders.forEach(function (sf) {
      try {
        const child = fetchPublicDriveFolder(sf.id);
        out.subfolders.push({ id: sf.id, name: sf.name, modified: '', files: child.files });
      } catch (childErr) {
        out.subfolders.push({ id: sf.id, name: sf.name, modified: '', files: [], error: childErr.toString() });
      }
    });
    out.files.sort(publicDriveNameSort);
    out.subfolders.sort(publicDriveNameSort);
    return out;
  } catch (err) {
    return {
      success: false,
      error: '未能公開讀取 Drive 資料夾：' + err.toString() + '。請確認資料夾及檔案已設為「知道連結的任何人可查看」。'
    };
  }
}

function fetchPublicDriveFolder(folderId) {
  const url = 'https://drive.google.com/embeddedfolderview?id=' + encodeURIComponent(folderId) + '#list';
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    followRedirects: true,
    muteHttpExceptions: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ScoutEventPublicDrive/1.0)' }
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 400) throw new Error('HTTP ' + status);
  const html = response.getContentText();
  if (/Request access|You need access|要求存取權|需要存取權/i.test(html)) throw new Error('資料夾並非公開');
  const result = { name: publicDriveFolderName(html), subfolders: [], files: [] };
  const seenFolders = {};
  const seenFiles = {};
  const anchorRe = /<a\b([^>]*?href=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html)) !== null) {
    const attrs = match[1] || '';
    const href = decodePublicDriveHtml(match[2] || '');
    const titleMatch = attrs.match(/\btitle=["']([^"']*)["']/i);
    const name = decodePublicDriveHtml((titleMatch ? titleMatch[1] : match[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim());
    const folderMatch = href.match(/(?:embeddedfolderview\?id=|\/drive\/folders\/)([-\w]{10,})/i);
    if (folderMatch && folderMatch[1] !== folderId && !seenFolders[folderMatch[1]]) {
      seenFolders[folderMatch[1]] = true;
      result.subfolders.push({ id: folderMatch[1], name: name || '會議資料夾' });
      continue;
    }
    const fileMatch = href.match(/(?:\/file\/d\/|[?&]id=)([-\w]{10,})/i);
    if (fileMatch && !seenFiles[fileMatch[1]]) {
      seenFiles[fileMatch[1]] = true;
      result.files.push(publicDriveFileInfo(fileMatch[1], name));
    }
  }
  return result;
}

function publicDriveFolderName(html) {
  const title = String(html || '').match(/<title>([\s\S]*?)<\/title>/i);
  if (!title) return '';
  return decodePublicDriveHtml(title[1]).replace(/\s*[-–]\s*Google Drive\s*$/i, '').trim();
}

function publicDriveFileInfo(id, name) {
  return {
    id: id,
    name: name || 'Drive 檔案',
    mimeType: '',
    modified: '',
    size: '',
    link: 'https://drive.google.com/file/d/' + id + '/view',
    preview: 'https://drive.google.com/file/d/' + id + '/preview'
  };
}

function publicDriveNameSort(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), 'zh-HK');
}

function decodePublicDriveHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(Number(n)); });
}

const ROLE_HIERARCHY = {
  'super_admin': 100,
  'advisor': 80,
  'admin': 80,
  'chairperson': 80,
  'executive_vice_chairperson': 70,
  'vice_chairperson': 60,
  'general_director': 40,
  'director': 30,
  'staff': 20,
  'public': 0
};

function getRoleLevel(r) {
  return ROLE_HIERARCHY[r] !== undefined ? ROLE_HIERARCHY[r] : 0;
}

function hasCjk(s) {
  return /[\u4e00-\u9fff]/.test(String(s || ''));
}

function uniqueChineseUserId(name, existingMap) {
  var base = String(name || '').trim() || '未命名';
  if (!existingMap[base]) return base;
  var n = 2;
  while (existingMap[base + '-' + n]) n++;
  return base + '-' + n;
}

function migrateLegacyEnglishLogins() {
  const ss = getSheet();
  const users = ss.getSheetByName('Users');
  if (!users || users.getLastRow() <= 1) return { success: true, updated: 0 };
  ensureColumns(users, ['job_title', 'contact', 'perm_see', 'perm_edit']);
  const rows = users.getDataRange().getValues();
  const headers = rows[0].map(String);
  const col = function (h) { return headers.indexOf(h); };
  const uId = col('user_id'), uName = col('name'), uRole = col('role');
  if (uId < 0 || uName < 0) return { success: false, error: 'Users 缺欄' };
  const taken = {};
  for (let i = 1; i < rows.length; i++) taken[String(rows[i][uId] || '')] = true;
  let updated = 0;
  for (let i = 1; i < rows.length; i++) {
    const uid = String(rows[i][uId] || '').trim();
    const name = String(rows[i][uName] || '').trim();
    const role = String(uRole >= 0 ? rows[i][uRole] : '');
    if (role === 'super_admin' || uid.toLowerCase() === 'sheep') continue;
    if (!name || hasCjk(uid)) continue;
    let next = name;
    let n = 2;
    while (taken[next] && next !== uid) { next = name + '-' + n; n++; }
    if (next !== uid) {
      users.getRange(i + 1, uId + 1).setValue(next);
      delete taken[uid];
      taken[next] = true;
      updated++;
    }
  }
  return { success: true, updated: updated };
}


// 開戶表職位層級：中文下拉選項 → 系統角色
const ROLE_LABELS_CN = {
  '主席': 'chairperson',
  '顧問': 'advisor',
  '管理員': 'admin',
  '執行副主席': 'executive_vice_chairperson',
  '副主席': 'vice_chairperson',
  '總主任': 'general_director',
  '主任': 'director',
  '工作人員': 'staff'
};

// 批核範疇（頁）：每類申請可分開、多選批核組別及執行／最後名單組別。
const APPROVAL_AREAS = ['supplies', 'vehicle', 'meals', 'finance'];
const APPROVAL_ROUTING_DEFAULTS = {
  supplies: { approver_groups: ['協調組'], executor_groups: ['協調組'] },
  vehicle: { approver_groups: ['協調組'], executor_groups: ['協調組'] },
  meals: { approver_groups: ['行政組'], executor_groups: ['協調組'] },
  finance: { approver_groups: ['行政組'], executor_groups: ['行政組'] }
};

function isYes(v) {
  if (v === true || v === 1 || v === '1') return true;
  const s = String(v || '').trim().toLowerCase();
  return ['y', 'yes', '是', '✓', 'true', '批', 'v'].indexOf(s) !== -1;
}
function yn(b) { return b ? 'Y' : ''; }

function initializeSheets() {
  const ss = getSheet();
  ensureSheet(ss, 'Events', ['event_id', 'event_name', 'password_hash', 'description', 'start_date', 'end_date', 'status', 'created_at']);
  ensureSheet(ss, 'Users', ['user_id', 'name', 'email', 'role', 'group_name', 'job_title', 'contact', 'password_hash', 'status', 'created_at']);
  // 訂餐紀錄：登入提交 → 低於總主任先由本組確認 → 指定組別最終批核；完整狀態存於此表。
  // ⚠️ 舊部署更新後，請在 Apps Script 手動執行一次 initializeSheets（只會新增此表，絕不影響舊資料）
  ensureSheet(ss, 'Meal_Orders', ['order_id', 'event_id', 'menu_id', 'user_id', 'user_name', 'group_name', 'selection', 'quantity', 'remarks', 'status', 'confirmed_by', 'approved_by', 'created_at', 'updated_at']);
  // 開戶表：供超管填「名字 / 職位層級 / 職稱 / 組別」一鍵開戶（預設密碼 1234）
  ensureSheet(ss, 'Account_Setup', ['name', 'role', 'job_title', 'group_name', 'user_id', 'email', 'contact']);
  // 批核權限表：供超管直接填「誰有哪個批核範疇的權」（supplies/vehicle/meals/finance）
  ensureSheet(ss, 'Approval_Permissions', ['user_id', 'name', 'group_name', 'supplies', 'vehicle', 'meals', 'finance']);
  const apSheet = ss.getSheetByName('Approval_Permissions');
  if (apSheet) apSheet.getRange('A1').setNote(
    '批核權限表：每行一位批核人。supplies=物資、vehicle=車位/車輛、meals=膳食、finance=財務。\n' +
    '有權的欄位填「Y」或「是」；無權留空。申請的批核組／執行組請在前端批核權限頁以多選按鈕設定。\n' +
    '前端批核權限表僅超管可見；改動須按「確定更新批核表」才寫入本表。批核中心供總主任以上處理待批申請。'
  );
  ensureSheet(ss, 'Approval_Routing', ['event_id', 'area', 'label', 'approver_groups', 'executor_groups', 'updated_by', 'updated_at']);
  const arSheet = ss.getSheetByName('Approval_Routing');
  if (arSheet) arSheet.getRange('A1').setNote(
    '每類申請的動態路由。approver_groups 及 executor_groups 以 JSON 多選陣列儲存。建議直接在 APP「批核權限表」用組別按鈕修改。\n' +
    '膳食預設：行政組批核、協調組執行及持有最後名單。'
  );
  // 遷移舊 Users 表：補上 job_title / contact / perm_see / perm_edit 欄（非破壞性）
  ensureColumns(ss.getSheetByName('Users'), ['job_title', 'contact', 'perm_see', 'perm_edit']);
  seedCommitteeAccounts();
  migrateLegacyEnglishLogins();
  setupAccountSetupSheet(ss);
  ensureSheet(ss, 'Meetings', ['meeting_id', 'event_id', 'title', 'date', 'agenda', 'minutes', 'author', 'created_at']);
  ensureSheet(ss, 'Staff', ['staff_id', 'event_id', 'name', 'role_title', 'group_name', 'contact', 'job_desc', 'created_at']);
  ensureSheet(ss, 'Documents', ['doc_id', 'event_id', 'title', 'category', 'file_url', 'uploaded_by', 'date', 'created_at']);
  ensureSheet(ss, 'Finance', ['finance_id', 'event_id', 'category', 'item', 'budget_amt', 'actual_amt', 'group_name', 'notes', 'created_at']);
  ensureSheet(ss, 'Finance_Expenses', ['id', 'event_id', 'voucher', 'item_name', 'group_name', 'budget', 'actual', 'date', 'description', 'receipt_name', 'receipt_url', 'status', 'submitted_by', 'submitted_by_id', 'requester_role', 'group_confirmation_status', 'group_confirmed_by', 'group_confirmed_at', 'approved_by', 'approved_at', 'created_at']);
  ensureSheet(ss, 'Activities', ['activity_id', 'event_id', 'title', 'type', 'location', 'description', 'details_json', 'created_at']);
  ensureSheet(ss, 'Meals', ['meal_id', 'event_id', 'date', 'meal_type', 'menu_desc', 'headcount', 'group_name', 'status', 'requested_by', 'approved_by', 'created_at']);
  ensureSheet(ss, 'Schedule', ['schedule_id', 'event_id', 'time_slot', 'title', 'description', 'location', 'group_name', 'created_at']);
  ensureSheet(ss, 'Supplies', ['supply_id', 'event_id', 'item_name', 'total_qty', 'unit', 'category', 'created_at']);
  ensureSheet(ss, 'Supply_Requests', ['request_id', 'event_id', 'supply_id', 'item_name', 'qty_requested', 'group_name', 'status', 'requested_by', 'approved_by', 'created_at']);
  // 泊車證申請：登入用戶申請，沿用車輛動態路由完成本組確認、最終批核及入口清單執行。
  ensureSheet(ss, 'Parking_Requests', ['parking_id', 'event_id', 'seq', 'group_name', 'unit', 'plate', 'driver_name', 'position', 'contact', 'park_date', 'entry_time', 'exit_time', 'full_day', 'status', 'requested_by', 'requested_by_id', 'approved_by', 'approved_at', 'notes', 'created_at']);
  // 口頭報價登記（v7.5 新增）：總主任以上登記，行政組及執行副主席以上可查看
  ensureSheet(ss, 'Oral_Quotes', ['oral_id', 'event_id', 'quote_date', 'group_name', 'vendor', 'contact_person', 'contact_phone', 'item_desc', 'amount', 'notes', 'quoted_by', 'quoted_by_id', 'created_at']);
  // ═══ v7.7 新增／補漏（全部非破壞性：只會新增工作表或於最右加欄，不會改動既有資料）═══
  // 車輛通行證（含泊車）：前端一直有寫出，但舊版 GS 未建立此表 → 之前寫出會被丟棄，現正式建立
  ensureSheet(ss, 'Vehicle_Passes', ['pass_id', 'event_id', 'plate', 'driver_name', 'driver_contact', 'vehicle_type', 'purpose', 'group_name', 'entry_date', 'exit_date', 'parking_location', 'deadline', 'status', 'requested_by', 'requested_by_id', 'approved_by', 'approved_at', 'notes', 'created_at']);
  ensureColumns(ss.getSheetByName('Vehicle_Passes'), ['deadline', 'requested_by_id', 'approved_at', 'notes', 'requester_role', 'group_confirmation_status', 'group_confirmed_by', 'group_confirmed_at']);
  // 物資申請：補回批核／需用日期／聯絡及本組確認欄。
  ensureColumns(ss.getSheetByName('Supply_Requests'), ['unit', 'qty_approved', 'reason', 'date_needed', 'deadline', 'contact', 'requested_by_id', 'approved_at', 'notes', 'requester_role', 'group_confirmation_status', 'group_confirmed_by', 'group_confirmed_at']);
  ensureColumns(ss.getSheetByName('Meal_Orders'), ['requester_role', 'group_confirmation_status', 'group_confirmed_by', 'group_confirmed_at']);
  ensureColumns(ss.getSheetByName('Parking_Requests'), ['requester_role', 'group_confirmation_status', 'group_confirmed_by', 'group_confirmed_at']);
  ensureColumns(ss.getSheetByName('Finance_Expenses'), ['event_id', 'voucher', 'item_name', 'group_name', 'budget', 'actual', 'date', 'description', 'receipt_name', 'receipt_url', 'status', 'submitted_by', 'submitted_by_id', 'requester_role', 'group_confirmation_status', 'group_confirmed_by', 'group_confirmed_at', 'approved_by', 'approved_at', 'created_at']);
  // 膳食菜單：補回選項／截止／鎖定等欄
  ensureColumns(ss.getSheetByName('Meals'), ['options', 'price', 'deadline', 'locked', 'created_by']);
  seedInitialData();
  formatSheetsByPurpose();
}

// 以工作表顏色及標題備註標示用途，方便後台日常維護。
// 藍色：後台經常改；綠色：活動紀錄；紫色：系統／權限；灰色：外部匯入原始資料。
function formatSheetsByPurpose() {
  const ss = getSheet();
  const frequentlyEdited = ['Events','Account_Setup','Approval_Permissions','Approval_Routing','Supplies','Finance','Schedule','Meals'];
  const records = ['Meetings','Staff','Documents','Activities','Meal_Orders','Supply_Requests','Vehicle_Passes','Parking_Requests','Finance_Expenses','Oral_Quotes'];
  const systemSheets = ['Users'];
  ss.getSheets().forEach(function(sheet) {
    const name = sheet.getName();
    let color = '#94a3b8', purpose = '外部匯入／原始資料：由其他 Sheet 或 Drive 提供，請勿直接在此頁修改。';
    if (frequentlyEdited.indexOf(name) >= 0) { color = '#2563eb'; purpose = '後台經常改動：此頁是管理員／負責組別的主要輸入頁。'; }
    else if (records.indexOf(name) >= 0) { color = '#16a34a'; purpose = '紀錄資料：APP 提交或由後台記錄，主要用作查閱、追蹤及匯出。'; }
    else if (systemSheets.indexOf(name) >= 0) { color = '#7c3aed'; purpose = '系統／權限資料：只限管理員維護。'; }
    sheet.setTabColor(color);
    if (sheet.getLastColumn() > 0) {
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).setNote(purpose);
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).setBackground(color).setFontColor('#ffffff').setFontWeight('bold');
    }
    // 明確標示為匯入原始頁的工作表可隱藏，避免誤改；需要時可在 Google Sheet「顯示」還原。
    if (/(^|[_ -])(raw|import|source|匯入|原始)([_ -]|$)/i.test(name)) sheet.hideSheet();
  });
  return {success:true, message:'已按用途套用工作表顏色；匯入原始頁已隱藏'};
}

function ensureSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0c4a6e').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

// 非破壞性補欄位：只會把缺失的欄位加到最右側，不刪除/覆蓋既有資料
function ensureColumns(sheet, headers) {
  if (!sheet) return;
  let lastCol = sheet.getLastColumn();
  let existing = [];
  if (lastCol >= 1) existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (v) { return String(v); });
  headers.forEach(function (h) {
    if (existing.indexOf(h) === -1) {
      sheet.getRange(1, lastCol + 1).setValue(h);
      lastCol++;
      existing.push(h);
    }
  });
}

// 開戶表：加上「職位層級」下拉選單 + 使用說明
function setupAccountSetupSheet(ss) {
  const sheet = ss.getSheetByName('Account_Setup');
  if (!sheet) return;
  const labels = Object.keys(ROLE_LABELS_CN);
  const dv = SpreadsheetApp.newDataValidation().requireValueInList(labels, true).setAllowInvalid(true).build();
  sheet.getRange(2, 2, 100, 1).setDataValidation(dv); // B 欄 (role) 下拉
  sheet.getRange('A1').setNote(
    '開戶表：從第 2 行起逐行填寫 —— 名字(name)、職位層級(role，下拉選)、職稱(job_title)、組別(group_name)、帳號(user_id 可留空＝自動用中文姓名)、電郵(email)、電話(contact)。\n' +
    '填好後在選單「童軍活動管理 → 開戶（同步帳戶）」執行，即開戶完成。\n' +
    '預設密碼為 1234，用戶登入後可在 APP 內自行修改密碼。'
  );
}

// 開戶：把 Account_Setup 的內容同步成 Users（預設密碼 1234；已存在則更新資料但保留其已改密碼）
function syncAccountsFromSetup() {
  const ss = getSheet();
  const setup = ss.getSheetByName('Account_Setup');
  if (!setup || setup.getLastRow() < 2) return { success: false, error: 'Account_Setup 沒有資料（請先填名字等欄位）' };
  const users = ss.getSheetByName('Users');
  if (!users) return { success: false, error: 'Users sheet missing' };
  ensureColumns(users, ['job_title', 'contact']);

  const sRows = setup.getDataRange().getValues();
  const sHead = sRows[0].map(String);
  const scol = function (h) { return sHead.indexOf(h); };
  const iName = scol('name'), iRole = scol('role'), iJob = scol('job_title'), iGrp = scol('group_name'), iId = scol('user_id'), iEmail = scol('email'), iContact = scol('contact');

  const uRows = users.getDataRange().getValues();
  const uHead = uRows[0].map(String);
  const ucol = function (h) { return uHead.indexOf(h); };
  const uName = ucol('name'), uRole = ucol('role'), uJob = ucol('job_title'), uGrp = ucol('group_name'), uId = ucol('user_id'), uEmail = ucol('email'), uContact = ucol('contact'), uPass = ucol('password_hash'), uStatus = ucol('status'), uCreated = ucol('created_at');

  const existing = {};
  for (let i = 1; i < uRows.length; i++) { existing[String(uRows[i][uId])] = i + 1; }

  let created = 0, updated = 0;
  for (let i = 1; i < sRows.length; i++) {
    const name = sRows[i][iName];
    if (!name || String(name).trim() === '') continue;
    const nameStr = String(name).trim();
    const roleRaw = sRows[i][iRole] ? String(sRows[i][iRole]).trim() : '';
    const role = ROLE_LABELS_CN[roleRaw] || roleRaw || 'staff';
    const job = sRows[i][iJob] || '';
    const grp = sRows[i][iGrp] || '';
    const email = sRows[i][iEmail] || '';
    const contact = sRows[i][iContact] || '';
    let uid = sRows[i][iId];
    if (!uid || String(uid).trim() === '') {
      uid = uniqueChineseUserId(nameStr, existing);
      setup.getRange(i + 1, iId + 1).setValue(uid);
    }
    uid = String(uid).trim();

    if (existing[uid]) {
      const r = existing[uid];
      users.getRange(r, uName + 1).setValue(nameStr);
      users.getRange(r, uRole + 1).setValue(role);
      users.getRange(r, uJob + 1).setValue(job);
      users.getRange(r, uGrp + 1).setValue(grp);
      users.getRange(r, uEmail + 1).setValue(email);
      users.getRange(r, uContact + 1).setValue(contact);
      updated++;
    } else {
      const rowVals = uHead.map(function () { return ''; });
      rowVals[uId] = uid;
      rowVals[uName] = nameStr;
      rowVals[uRole] = role;
      rowVals[uJob] = job;
      rowVals[uGrp] = grp;
      rowVals[uEmail] = email;
      rowVals[uContact] = contact;
      rowVals[uPass] = hashPassword('1234');
      rowVals[uStatus] = 'active';
      rowVals[uCreated] = new Date();
      users.appendRow(rowVals);
      existing[uid] = users.getLastRow();
      created++;
    }
  }
  return { success: true, created: created, updated: updated, message: '開戶完成：新增 ' + created + ' 人，更新 ' + updated + ' 人（預設密碼 1234，登入後可自行修改）' };
}

// 修改密碼（登入用戶自行修改）
function changePassword(data) {
  const userId = (data.user_id || '').trim();
  const oldPwd = data.old_password || '';
  const newPwd = data.new_password || '';
  if (!userId || !newPwd) return { success: false, error: '參數不足' };
  if (String(newPwd).length < 4) return { success: false, error: '新密碼至少 4 個字元' };
  const ss = getSheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Users sheet missing' };
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIdx = headers.indexOf('user_id');
  const emailIdx = headers.indexOf('email');
  const passIdx = headers.indexOf('password_hash');
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIdx]) === userId || String(rows[i][emailIdx]) === userId) {
      const stored = rows[i][passIdx];
      if (stored && stored !== hashPassword(oldPwd)) return { success: false, error: '舊密碼錯誤' };
      sheet.getRange(i + 1, passIdx + 1).setValue(hashPassword(newPwd));
      return { success: true, message: '密碼已更新' };
    }
  }
  return { success: false, error: '找不到帳戶' };
}

// 前端開戶（總主任以上，只能幫自己組別開戶；預設密碼 1234）
function createAccount(data) {
  const ss = getSheet();
  const users = ss.getSheetByName('Users');
  if (!users) return { success: false, error: 'Users sheet missing' };
  ensureColumns(users, ['job_title', 'contact', 'perm_see', 'perm_edit']);
  const name = (data.name || '').trim();
  if (!name) return { success: false, error: '請填寫名字' };
  const role = data.role || 'staff';
  const group = data.group_name || '';
  const job = data.job_title || '';
  const email = (data.email || '').trim();
  const contact = data.contact || '';
  // 輕量防呆：開戶者只能是總主任以上，且只能開自己組別（管理層/執行副主席/超管可跨組）
  const byRole = data.by_role || '';
  const byGroup = data.by_group || '';
  const byLvl = ROLE_HIERARCHY[byRole] !== undefined ? ROLE_HIERARCHY[byRole] : 0;
  const CROSS_GROUP_ROLES = ['admin', 'super_admin', 'executive_vice_chairperson'];
  if (byRole && byLvl < 40 && !CROSS_GROUP_ROLES.includes(byRole)) {
    return { success: false, error: '只有總主任或以上可開戶' };
  }
  if (byRole && !CROSS_GROUP_ROLES.includes(byRole) && byGroup && group !== byGroup) {
    return { success: false, error: '只能為自己組別開戶' };
  }

  const rows = users.getDataRange().getValues();
  const headers = rows[0].map(String);
  const col = function (h) { return headers.indexOf(h); };
  const uId = col('user_id'), uEmail = col('email');
  const existing = {};
  for (let i = 1; i < rows.length; i++) existing[String(rows[i][uId])] = true;
  let uid = (data.user_id || '').trim();
  if (!uid) uid = uniqueChineseUserId(name, existing);
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][uId]) === uid) return { success: false, error: '帳號已存在：' + uid };
    if (email && String(rows[i][uEmail]) === email) return { success: false, error: '電郵已存在：' + email };
  }
  const rowVals = headers.map(function () { return ''; });
  rowVals[uId] = uid;
  rowVals[col('name')] = name;
  rowVals[col('role')] = role;
  rowVals[col('job_title')] = job;
  rowVals[col('group_name')] = group;
  rowVals[uEmail] = email;
  rowVals[col('contact')] = contact;
  rowVals[col('password_hash')] = hashPassword('1234');
  rowVals[col('status')] = 'active';
  rowVals[col('created_at')] = new Date();
  users.appendRow(rowVals);
  return { success: true, id: uid, message: '已開戶：' + name + '（帳號 ' + uid + '，密碼 1234）' };
}

// 儲存用戶權限（上級把「自己有的」看/管權授權給下級；perm_see / perm_edit 為卡片 ID 陣列）
function saveUserPermissions(data) {
  const userId = (data.user_id || '').trim();
  if (!userId) return { success: false, error: '缺少 user_id' };
  const permSee = Array.isArray(data.perm_see) ? data.perm_see : [];
  const permEdit = Array.isArray(data.perm_edit) ? data.perm_edit : [];
  const ss = getSheet();
  const users = ss.getSheetByName('Users');
  if (!users) return { success: false, error: 'Users sheet missing' };
  ensureColumns(users, ['perm_see', 'perm_edit']);
  const rows = users.getDataRange().getValues();
  const headers = rows[0].map(String);
  const idIdx = headers.indexOf('user_id');
  const seeIdx = headers.indexOf('perm_see');
  const editIdx = headers.indexOf('perm_edit');
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIdx]) === userId) {
      users.getRange(i + 1, seeIdx + 1).setValue(JSON.stringify(permSee));
      users.getRange(i + 1, editIdx + 1).setValue(JSON.stringify(permEdit));
      return { success: true, message: '已更新 ' + userId + ' 的權限' };
    }
  }
  return { success: false, error: '找不到帳戶：' + userId };
}

// 讀取批核權限表
function getApprovalPermissions() {
  const ss = getSheet();
  const sheet = ss.getSheetByName('Approval_Permissions');
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, permissions: [] };
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(String);
  const col = function (h) { return headers.indexOf(h); };
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const uid = r[col('user_id')];
    if (!uid || String(uid).trim() === '') continue;
    const item = { user_id: String(uid).trim(), name: r[col('name')] || '', group_name: r[col('group_name')] || '' };
    APPROVAL_AREAS.forEach(function (a) { item[a] = isYes(r[col(a)]); });
    list.push(item);
  }
  return { success: true, permissions: list };
}

// 儲存批核權限表（整批重寫）
function saveApprovalPermissions(data) {
  const permissions = Array.isArray(data.permissions) ? data.permissions : [];
  const ss = getSheet();
  let sheet = ss.getSheetByName('Approval_Permissions');
  if (!sheet) {
    sheet = ss.insertSheet('Approval_Permissions');
    sheet.appendRow(['user_id', 'name', 'group_name', 'supplies', 'vehicle', 'meals', 'finance']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  permissions.forEach(function (p) {
    sheet.appendRow([p.user_id || '', p.name || '', p.group_name || '', yn(p.supplies), yn(p.vehicle), yn(p.meals), yn(p.finance)]);
  });
  return { success: true, count: permissions.length };
}

function parseGroupArray(value, fallback) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value !== '' && value != null) {
    try {
      const parsed = JSON.parse(String(value));
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch (e) {
      return String(value).split(/[、,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
    }
  }
  return (fallback || []).slice();
}

// 讀取每類申請的「批核組別／執行組別」多選路由；未初始化時直接回傳安全預設。
function getApprovalRouting(data) {
  const eventId = String((data && data.event_id) || 'isd_2026');
  const routing = {};
  APPROVAL_AREAS.forEach(function (area) {
    routing[area] = {
      approver_groups: APPROVAL_ROUTING_DEFAULTS[area].approver_groups.slice(),
      executor_groups: APPROVAL_ROUTING_DEFAULTS[area].executor_groups.slice()
    };
  });
  const sheet = getSheet().getSheetByName('Approval_Routing');
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, event_id: eventId, routing: routing };
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(String);
  const col = function (h) { return headers.indexOf(h); };
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][col('event_id')] || 'isd_2026') !== eventId) continue;
    const area = String(rows[i][col('area')] || '');
    if (APPROVAL_AREAS.indexOf(area) === -1) continue;
    routing[area] = {
      approver_groups: parseGroupArray(rows[i][col('approver_groups')], routing[area].approver_groups),
      executor_groups: parseGroupArray(rows[i][col('executor_groups')], routing[area].executor_groups)
    };
  }
  return { success: true, event_id: eventId, routing: routing };
}

// 整批儲存單一活動的多選路由，保留工作表內其他活動的設定。
function saveApprovalRouting(data) {
  const eventId = String(data.event_id || 'isd_2026');
  const incoming = data.routing || {};
  const ss = getSheet();
  let sheet = ss.getSheetByName('Approval_Routing');
  if (!sheet) {
    sheet = ss.insertSheet('Approval_Routing');
    sheet.appendRow(['event_id', 'area', 'label', 'approver_groups', 'executor_groups', 'updated_by', 'updated_at']);
    sheet.setFrozenRows(1);
  }
  ensureColumns(sheet, ['event_id', 'area', 'label', 'approver_groups', 'executor_groups', 'updated_by', 'updated_at']);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(String);
  const eventIdx = headers.indexOf('event_id');
  // 只刪除此活動的舊路由列，其他活動原位保留，避免 clearContent 後累積空白列。
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][eventIdx] || 'isd_2026') === eventId) sheet.deleteRow(i + 1);
  }
  const labelMap = {supplies:'物資申請', vehicle:'車位／車輛申請', meals:'膳食申請', finance:'財務申請'};
  APPROVAL_AREAS.forEach(function (area) {
    const base = APPROVAL_ROUTING_DEFAULTS[area];
    const row = incoming[area] || base;
    const approvers = parseGroupArray(row.approver_groups, base.approver_groups);
    const executors = parseGroupArray(row.executor_groups, base.executor_groups);
    sheet.appendRow([eventId, area, labelMap[area], JSON.stringify(approvers), JSON.stringify(executors), data.updated_by || '', new Date()]);
  });
  return { success: true, event_id: eventId, routing: getApprovalRouting({event_id:eventId}).routing };
}

// 列出所有用戶（不含密碼），供前端用戶管理
function getAllUsers() {
  const ss = getSheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, users: [] };
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const hashIdx = headers.indexOf('password_hash');
  const defaultHash = hashPassword('1234');
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    headers.forEach(function (h, idx) { obj[h] = rows[i][idx]; });
    const hash = hashIdx >= 0 ? String(rows[i][hashIdx] || '') : '';
    if (obj.role === 'super_admin') obj.password = SUPER_ADMIN_PASS;
    else if (hash && hash === defaultHash) obj.password = '1234';
    else obj.password = hash ? '(已改密碼)' : '1234';
    delete obj.password_hash;
    if (obj.role === 'super_admin' && (obj.group_name === '行政組' || !obj.group_name)) obj.group_name = '系統';
    list.push(obj);
  }
  return { success: true, users: list };
}


function committeeSeedRows() {
  // user_id, name, email, role, group_name, job_title, contact, defaultPwd
  return [
    ['黃偉安','黃偉安','','advisor','顧問團','顧問','','1234'],
    ['何家騏','何家騏','','advisor','顧問團','顧問','','1234'],
    ['朱家聰','朱家聰','','chairperson','主席及執行副主席','主席','','1234'],
    ['袁可秀','袁可秀','','executive_vice_chairperson','主席及執行副主席','執行副主席','','1234'],
    ['張佳良','張佳良','','vice_chairperson','會操及典禮組','副主席（會操及典禮）','','1234'],
    ['梁文澧','梁文澧','','general_director','會操及典禮組','總主任（會操）','','1234'],
    ['黃志樂','黃志樂','','director','會操及典禮組','會操顧問','','1234'],
    ['李懷恩','李懷恩','','general_director','會操及典禮組','總主任（典禮）','','1234'],
    ['黃凱琳','黃凱琳','','director','會操及典禮組','典禮統籌主任','','1234'],
    ['林雋逸','林雋逸','','director','會操及典禮組','優異旅團統籌主任','','1234'],
    ['馮玉成','馮玉成','','director','會操及典禮組','獎勵統籌主任','','1234'],
    ['范紫晴','范紫晴','','director','會操及典禮組','司儀統籌主任','','1234'],
    ['林卓衡','林卓衡','','director','會操及典禮組','司儀統籌主任','','1234'],
    ['周恒晉','周恒晉','','vice_chairperson','主題節目組','副主席（主題節目）','','1234'],
    ['仇紹謙','仇紹謙','','general_director','主題節目組','總主任（主題節目）','','1234'],
    ['何令勤','何令勤','','director','主題節目組','節目主任 (1)','','1234'],
    ['陳鋑羲','陳鋑羲','','director','主題節目組','節目主任 (2)','','1234'],
    ['張宏剛','張宏剛','','director','主題節目組','節目主任 (3)','','1234'],
    ['羅卓華','羅卓華','','director','主題節目組','節目主任 (4)','','1234'],
    ['李庭甄','李庭甄','','director','主題節目組','節目主任 (5)','','1234'],
    ['何嘉駿','何嘉駿','','vice_chairperson','品牌推廣組','副主席（品牌推廣）','','1234'],
    ['陳鈞翰','陳鈞翰','','director','品牌推廣組','社交媒體主任','','1234'],
    ['林耀鏘','林耀鏘','','director','品牌推廣組','拍攝/攝錄統籌主任','','1234'],
    ['曾麗珊','曾麗珊','','vice_chairperson','嘉賓接待組','副主席（嘉賓接待）','','1234'],
    ['張嘉政','張嘉政','','general_director','嘉賓接待組','總主任（嘉賓接待）','','1234'],
    ['黃培芳','黃培芳','','director','嘉賓接待組','嘉賓接待主任','','1234'],
    ['張敬浩','張敬浩','','director','嘉賓接待組','交通主任','','1234'],
    ['朱浩銘','朱浩銘','','director','嘉賓接待組','嘉賓支援主任','','1234'],
    ['羅添駿','羅添駿','','vice_chairperson','協調組','副主席（協調）','','1234'],
    ['鍾偉志','鍾偉志','','general_director','協調組','總主任（協調）','','1234'],
    ['馬一波','馬一波','','director','協調組','場地佈置主任','','1234'],
    ['吳卓藍','吳卓藍','','director','協調組','膳食主任','','1234'],
    ['郭慧敏','郭慧敏','','director','協調組','後勤主任','','1234'],
    ['施珍淇','施珍淇','','director','協調組','物資主任','','1234'],
    ['黃嘉恩','黃嘉恩','','general_director','協調組','總主任（協調）','','1234'],
    ['布瀚文','布瀚文','','director','協調組','秩序主任','','1234'],
    ['鄺逸俊','鄺逸俊','','director','協調組','交通管制主任','','1234'],
    ['李思諭','李思諭','','director','協調組','物流運輸主任','','1234'],
    ['袁宇靖','袁宇靖','','director','協調組','物流運輸主任','','1234'],
    ['黎姵伶','黎姵伶','','vice_chairperson','服務及發展組','副主席（服務及發展）','','1234'],
    ['李卓琪','李卓琪','','general_director','服務及發展組','總主任（服務及發展）','','1234'],
    ['郭成威','郭成威','','director','服務及發展組','服務主任','','1234'],
    ['李婉顏','李婉顏','','director','服務及發展組','機構聯絡主任','','1234'],
    ['徐嘉皓','徐嘉皓','','vice_chairperson','行政組','副主席（行政）','','1234'],
    ['文幹皓','文幹皓','','general_director','行政組','總主任（運作）','','1234'],
    ['陳銘彥','陳銘彥','','director','行政組','旅團報到主任','','1234'],
    ['何仲康','何仲康','','director','行政組','紀念品主任','','1234'],
    ['莫穎民','莫穎民','','general_director','行政組','總主任（行政）','','1234'],
    ['蔡天欣','蔡天欣','','director','行政組','財政主任','','1234'],
    ['何家耀','何家耀','','admin','秘書處','助理執行幹事 (Assistant Scout Executive) Oscar','2835 7712','1234'],
    ['陸詠德','陸詠德','','admin','秘書處','活動幹事 (Programme Officer) Fiona','2835 7713','1234'],
    ['譚健祥','譚健祥','','admin','秘書處','執行幹事 (Scout Executive) Figo','2835 7711','1234'],
    ['鄧倩姸','鄧倩姸','','admin','秘書處','發展幹事 (Development Officer) Cindy','2835 7714','1234'],
    ['曾凱瑩','曾凱瑩','','admin','秘書處','訓練幹事 (Training Officer) Sandy','2835 7715','1234'],
  ];
}

function seedCommitteeAccounts() {
  const ss = getSheet();
  const users = ss.getSheetByName('Users');
  if (!users) return { success: false, error: 'Users sheet missing' };
  ensureColumns(users, ['job_title', 'contact', 'perm_see', 'perm_edit']);
  const rows = users.getDataRange().getValues();
  const headers = rows[0].map(String);
  const col = function (h) { return headers.indexOf(h); };
  const uId = col('user_id'), uName = col('name');
  const existing = {};
  for (let i = 1; i < rows.length; i++) {
    existing[String(rows[i][uId] || '')] = true;
    existing[String(rows[i][uName] || '')] = true;
  }
  // 修正已存在超管組別
  if (uId >= 0) {
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][col('role')]) === 'super_admin' && String(rows[i][col('group_name')]) === '行政組') {
        users.getRange(i + 1, col('group_name') + 1).setValue('系統');
      }
    }
  }
  const seed = committeeSeedRows();
  seed.forEach(function (r) {
    const uid = r[0], name = r[1];
    if (existing[uid] || existing[name]) return;
    const rowVals = headers.map(function () { return ''; });
    rowVals[uId] = uid;
    rowVals[col('name')] = name;
    if (col('email') >= 0) rowVals[col('email')] = r[2];
    if (col('role') >= 0) rowVals[col('role')] = r[3];
    if (col('group_name') >= 0) rowVals[col('group_name')] = r[4];
    if (col('job_title') >= 0) rowVals[col('job_title')] = r[5];
    if (col('contact') >= 0) rowVals[col('contact')] = r[6];
    if (col('password_hash') >= 0) rowVals[col('password_hash')] = hashPassword(r[7] || '1234');
    if (col('status') >= 0) rowVals[col('status')] = 'active';
    if (col('created_at') >= 0) rowVals[col('created_at')] = new Date();
    users.appendRow(rowVals);
    existing[uid] = true;
    existing[name] = true;
  });
  return { success: true };
}

function updateUser(data) {
  const ss = getSheet();
  const users = ss.getSheetByName('Users');
  if (!users) return { success: false, error: 'Users sheet missing' };
  ensureColumns(users, ['job_title', 'contact', 'perm_see', 'perm_edit']);
  const uid = String(data.user_id || '').trim();
  if (!uid) return { success: false, error: '缺少 user_id' };
  const rows = users.getDataRange().getValues();
  const headers = rows[0].map(String);
  const col = function (h) { return headers.indexOf(h); };
  const uId = col('user_id');
  let rowNum = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][uId]) === uid) { rowNum = i + 1; break; }
  }
  if (rowNum < 0) return { success: false, error: '找不到帳戶' };
  function setIf(h, v) {
    const c = col(h);
    if (c >= 0 && v !== undefined && v !== null) users.getRange(rowNum, c + 1).setValue(v);
  }
  if (data.name) setIf('name', data.name);
  if (data.email !== undefined) setIf('email', data.email);
  if (data.role) setIf('role', data.role);
  if (data.group_name !== undefined) setIf('group_name', data.group_name);
  if (data.job_title !== undefined) setIf('job_title', data.job_title);
  if (data.contact !== undefined) setIf('contact', data.contact);
  if (data.perm_see) setIf('perm_see', JSON.stringify(data.perm_see));
  if (data.perm_edit) setIf('perm_edit', JSON.stringify(data.perm_edit));
  if (data.password && String(data.password) !== '(已改密碼)') setIf('password_hash', hashPassword(String(data.password)));
  if (data.role === 'super_admin') setIf('group_name', '系統');
  return { success: true };
}

function saveUsers(data) {
  const list = data.users || [];
  let ok = 0, fail = [];
  list.forEach(function (u) {
    const r = updateUser(u);
    if (r && r.success) ok++;
    else fail.push((u && u.name) || (u && u.user_id) || '?' );
  });
  return { success: fail.length === 0, updated: ok, failed: fail };
}

// 選單（在 Google Sheet 內手動執行）
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('童軍活動管理')
    .addItem('初始化工作表', 'initializeSheets')
    .addItem('開戶（同步 Account_Setup → Users）', 'syncAccountsFromSetup')
    .addItem('補齊籌委帳戶（不覆蓋現有）', 'seedCommitteeAccounts')
    .addItem('登入帳號改為中文姓名', 'migrateLegacyEnglishLogins')
    .addItem('同步批核權限（Approval_Permissions）', 'getApprovalPermissions')
    .addItem('刷新 API Key', 'refreshApiKey')
    .addItem('整理工作表顏色／隱藏匯入頁', 'formatSheetsByPurpose')
    .addToUi();
}

// 零精簡：完整寫入所有文件、完整人員、完整預算明細進 Google Sheet
function seedInitialData() {
  const ss = getSheet();
  
  // 1. Events
  const evSheet = ss.getSheetByName('Events');
  if (evSheet.getLastRow() <= 1) {
    evSheet.appendRow(['isd_2026', '2026 ISD 港島童軍繽紛日', hashPassword('1234'), '港島地域年度旗艦盛事：步操檢閱與攤位博覽', '2026-10-04', '2026-10-04', 'active', new Date()]);
  }
  
  // 2. Users
  const uSheet = ss.getSheetByName('Users');
  if (uSheet.getLastRow() <= 1) {
    uSheet.appendRow(['sheep', '超級管理員', SUPER_ADMIN_EMAIL, 'super_admin', '系統', '超管', '', hashPassword(SUPER_ADMIN_PASS), 'active', new Date()]);
    uSheet.appendRow(['黃偉安', '黃偉安', 'advisor1@isd.local', 'advisor', '顧問團', '顧問', '', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['朱家聰', '朱家聰', 'chair@isd.local', 'chairperson', '主席及執行副主席', '主席', '', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['袁可秀', '袁可秀', 'execvp@isd.local', 'executive_vice_chairperson', '主席及執行副主席', '執行副主席', '', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['張佳良', '張佳良', 'vpparade@isd.local', 'vice_chairperson', '會操及典禮組', '副主席（會操及典禮）', '', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['周恒晉', '周恒晉', 'vpprogram@isd.local', 'vice_chairperson', '主題節目組', '副主席（主題節目）', '', hashPassword('1234'), 'active', new Date()]);
  }
  
  // 3. Meetings
  const mSheet = ss.getSheetByName('Meetings');
  if (mSheet.getLastRow() <= 1) {
    mSheet.appendRow(['m_0', 'isd_2026', '第0次預備會議 (Zoom)', '2026-05-01', '活動背景簡介、上屆活動檢討、籌委會架構確認', '主席朱家聰主持，確認 2026 ISD 於 10 月 4 日警察學院舉行，主軸定為 Scout for SDGs。', '主席 朱家聰', new Date()]);
    mSheet.appendRow(['m_1', 'isd_2026', '第1次籌備委員會議', '2026-05-12', '利益申報政策及保護個人私隱政策、各功能組別初步構思', '正式通過利益申報政策與個人私隱政策，各委員必須嚴格遵守以避免利益衝突嫌疑。議決各組財政指引、會計程序及步操檢閱流程方向。', '主席 朱家聰', new Date()]);
    mSheet.appendRow(['m_2', 'isd_2026', '第2次籌備委員會議', '2026-06-16', '各功能組別進度匯報與節目細節確認', '進度良好，重點推進積極公民獎章工作坊、攤位設計及嘉賓邀請。', '執行副主席 袁可秀', new Date()]);
    mSheet.appendRow(['m_3', 'isd_2026', '第3次籌備委員會議', '2026-07-21', '各功能組別進度匯報與財政預算審批', '審議財務指引、報價門檻 ($500/$2000/$5000) 及結算總表 (附件5)。', '主席 朱家聰', new Date()]);
    mSheet.appendRow(['m_next', 'isd_2026', '第4次籌備委員會議 (下次會議)', '2026-08-18 19:15', '各功能組別進度最後衝刺與物資點算', '主任或以上委員請準時出席百周年紀念大樓1704室。', '秘書處', new Date()]);
  }
  
  // 4. Staff (零精簡：2026 真實組織架構圖 — 完整收錄所有顧問、主席、副主席、總主任、主任)
  const sSheet = ss.getSheetByName('Staff');
  if (sSheet.getLastRow() <= 1) {
    const STAFF = [
      ['黃偉安', '顧問', '顧問團'], ['何家騏', '顧問 / 危機處理主任', '顧問團 / 行政組'],
      ['朱家聰', '主席', '主席及執行副主席'], ['袁可秀', '執行副主席', '主席及執行副主席'],
      ['張佳良', '副主席（會操及典禮）', '會操及典禮組'], ['梁文澧', '總主任（會操）', '會操及典禮組'], ['黃志樂', '會操顧問', '會操及典禮組'],
      ['李懷恩', '總主任（典禮）', '會操及典禮組'], ['黃凱琳', '典禮統籌主任', '會操及典禮組'], ['林雋逸', '優異旅團統籌主任', '會操及典禮組'], ['馮玉成', '獎勵統籌主任', '會操及典禮組'], ['范紫晴', '司儀統籌主任', '會操及典禮組'], ['林卓衡', '司儀統籌主任', '會操及典禮組'],
      ['周恒晉', '副主席（主題節目）', '主題節目組'], ['仇紹謙', '總主任（主題節目）', '主題節目組'], ['何令勤', '節目主任 (1)', '主題節目組'], ['陳鋑羲', '節目主任 (2)', '主題節目組'], ['張宏剛', '節目主任 (3)', '主題節目組'], ['羅卓華', '節目主任 (4)', '主題節目組'], ['李庭甄', '節目主任 (5)', '主題節目組'],
      ['何嘉駿', '副主席（品牌推廣）', '品牌推廣組'], ['陳鈞翰', '社交媒體主任', '品牌推廣組'], ['林耀鏘', '拍攝/攝錄統籌主任', '品牌推廣組'],
      ['曾麗珊', '副主席（嘉賓接待）', '嘉賓接待組'], ['張嘉政', '總主任（嘉賓接待）', '嘉賓接待組'], ['黃培芳', '嘉賓接待主任', '嘉賓接待組'], ['張敬浩', '交通主任', '嘉賓接待組'], ['朱浩銘', '嘉賓支援主任', '嘉賓接待組'],
      ['羅添駿', '副主席（協調）', '協調組'], ['鍾偉志', '總主任（協調）', '協調組'], ['馬一波', '場地佈置主任', '協調組'], ['吳卓藍', '膳食主任', '協調組'], ['郭慧敏', '後勤主任', '協調組'], ['施珍淇', '物資主任', '協調組'],
      ['黃嘉恩', '總主任（協調）', '協調組'], ['布瀚文', '秩序主任', '協調組'], ['鄺逸俊', '交通管制主任', '協調組'], ['李思諭', '物流運輸主任', '協調組'], ['袁宇靖', '物流運輸主任', '協調組'],
      ['黎姵伶', '副主席（服務及發展）', '服務及發展組'], ['李卓琪', '總主任（服務及發展）', '服務及發展組'], ['郭成威', '服務主任', '服務及發展組'], ['李婉顏', '機構聯絡主任', '服務及發展組'],
      ['徐嘉皓', '副主席（行政）', '行政組'], ['文幹皓', '總主任（運作）', '行政組'], ['陳銘彥', '旅團報到主任', '行政組'], ['何仲康', '紀念品主任', '行政組'], ['莫穎民', '總主任（行政）', '行政組'], ['蔡天欣', '財政主任', '行政組']
    ];
    STAFF.forEach(function (p, i) {
      sSheet.appendRow(['s_' + (i + 1), 'isd_2026', p[0], p[1], p[2], '', '', new Date()]);
    });
  }
  
  // 5. Documents (零精簡：2026 真實通告與文件，file_url 指向 ISD 2026 Staff Drive)
  const dSheet = ss.getSheetByName('Documents');
  if (dSheet.getLastRow() <= 1) {
    const DOCS = [
      ['活動通告 sp12_26_isd2026.pdf', '通告', 'https://drive.google.com/file/d/1rmV3zqrBex803aiyjrf20QddudOBoTFf/view', '行政組', '2026-07-07'],
      ['報名表格 sp12a_26_isd2026_enrollform.pdf', '表格', 'https://drive.google.com/file/d/1TsqPjL57LooYZ21OqP_dXjnt_L_Q0b1Q/view', '行政組', '2026-07-07'],
      ['工作計劃及進度 V2.docx', '通告', 'https://drive.google.com/file/d/1OPRHxG3x_fLvpLDBEqmdb8dlsq0HuSe1/view', '秘書處', '2026-05-12'],
      ['食物捐贈通告 (FoodDonation)', '通告', 'https://drive.google.com/file/d/1AXsmbK59MFz-ODLtZ-ysgvW2RcF8mu7j/view', '秘書處', '2026-07-24'],
      ['食物捐贈表格 (FoodDonation_Form)', '表格', 'https://drive.google.com/file/d/1SuqR2x-Ws0F8zqcX9-tZKUbEndDbS7xJ/view', '秘書處', '2026-07-24'],
      ['物資捐贈通告 (Goods Donating)', '通告', 'https://drive.google.com/file/d/1WbfGCy90Pkau6TLNg9J_DdohEqPzdknQ/view', '秘書處', '2026-07-24'],
      ['物資捐贈表格 (Goods Donating_Form)', '表格', 'https://drive.google.com/file/d/1eLhBg1yJxo99hG-nUhL9kjtfR15KizxW/view', '秘書處', '2026-07-24'],
      ['收受利益及申報政策 (pc132018c)', '合規政策', 'https://drive.google.com/file/d/1V-Kj7xIu8ow9ncVF9dJ6j680IEP9qHZl/view', '秘書處', '2026-03-29'],
      ['收受利益及申報政策 (pc142018c)', '合規政策', 'https://drive.google.com/file/d/1w-u50e3cMpMf2SCAw-3BQfJ66l4qBFzy/view', '秘書處', '2026-03-29'],
      ['財務指引及會計程序 ver 1', '財務', 'https://drive.google.com/file/d/1QNWNG1BnVab3oHlI7yvIK_2YMMSFV-p4/view', '行政組', '2026-04-27'],
      ['附件1 - 報價要求', '財務', 'https://drive.google.com/file/d/176X1zGzH_k7DJzzuzE5fHkAr6GE3_IHm/view', '行政組', '2026-04-27'],
      ['附件2 - 豁免商戶名單', '財務', 'https://drive.google.com/file/d/1Z_VqtQ1LjKGI7fFqRCvN9sI8XrmJLbL2/view', '行政組', '2026-03-29'],
      ['附件3 - 口頭報價資料記錄', '財務', 'https://drive.google.com/file/d/1s5X9v7FJfbCZG1zDX5GX_yXpE2C_8BIq/view', '行政組', '2026-03-29'],
      ['附件4 - 書面報價比較表', '財務', 'https://drive.google.com/file/d/1Qal9KVjgN54cb6GwxideH_lsRXJquVWy/view', '行政組', '2026-03-29'],
      ['附件5 - 結算總表 (WORD)', '財務', 'https://drive.google.com/file/d/1FwpuK79mWDToX_p_csO_8Fg085lT0QkC/view', '行政組', '2026-03-29'],
      ['附件5A - 結算總表 (autosum)', '財務', 'https://drive.google.com/file/d/16krtzQYD11b2cyL8h_Qdb0a8X4_wyDN-/view', '行政組', '2026-03-29'],
      ['附件5B - 結算總表 (EXCEL)', '財務', 'https://drive.google.com/file/d/1boZYb4XxiZllAP_2sxxcdatiOQIZMfbJ/view', '行政組', '2026-03-29'],
      ['附件6 - 四格印簽名位置', '財務', 'https://drive.google.com/file/d/19bmvieiDcnFBcQ6qPAGagN8UDXc3tAG2/view', '行政組', '2026-03-29'],
      ['ISD2026 Budget.xlsx', '財務', 'https://drive.google.com/file/d/1tFl8f_E--bwDo6Jl3PcCgMRs06-hg3c_/view', '行政組', '2026-08-16'],
      ['ISD2026 Org Chart and Contact List', '名單', 'https://drive.google.com/file/d/1__vfReg_Hal8qXBDXaidDVvN_lRgRKcp/view', '行政組', '2026-08-19'],
      ['ISD2026 Site setup Quotation Request', '協調', 'https://drive.google.com/file/d/1ryQltDGazkf_l2qPPnxc6DmomfIlMu-x/view', '協調組', '2026-07-21'],
      ['ISD2026 Cleaning Quotation request', '協調', 'https://drive.google.com/file/d/1n_vRIZ4X_NV3523r89hd8mODQpyNMvbL/view', '協調組', '2026-07-20'],
      ['泊車證申請表格', '協調', 'https://drive.google.com/file/d/1_O_7VZAeASGPEk5BqSD0VxTEPPLH5_h7/view', '協調組', '2026-07-20'],
      ['ISD2026 攤位資料', '活動', 'https://drive.google.com/file/d/1Po1UGjl1E3Q6HWlYlFqnE_tcXjblmFle/view', '主題節目組', '2026-08-19'],
      ['ISD2025 攤位資料（參考）', '活動', 'https://drive.google.com/file/d/179nQJYbzar3AqddmPf3cstWO65LT_gBM/view', '主題節目組', '2026-08-14']
    ];
    DOCS.forEach(function (p, i) {
      dSheet.appendRow(['d_' + (i + 1), 'isd_2026', p[0], p[1], p[2], p[3], p[4], new Date()]);
    });
  }
  
  // 6. Finance (零精簡：完整收錄所有收支明細與各組憑單)
  const fSheet = ss.getSheetByName('Finance');
  if (fSheet.getLastRow() <= 1) {
    fSheet.appendRow(['f_1', 'isd_2026', '收入', '繽紛日參加者費用@$10', 10000, 10390, '財務組', '預算表實收', new Date()]);
    fSheet.appendRow(['f_2', 'isd_2026', '收入', '旅團代訂餐費@$55', 0, 12705, '財務組', '代訂餐費實收', new Date()]);
    fSheet.appendRow(['f_3', 'isd_2026', '收入', '港島地域童軍基金撥款', 260000, 243122.59, '財務組', '地域撥款', new Date()]);
    fSheet.appendRow(['f_4', 'isd_2026', '收入', '比賽報名費', 0, 600, '會操組', '步操比賽', new Date()]);
    fSheet.appendRow(['f_5', 'isd_2026', '收入', '童軍攝影暨多媒體創作專章工作坊@$65', 0, 2795, '節目組', '專章工作坊', new Date()]);
    fSheet.appendRow(['f_6', 'isd_2026', '支出', '會操及典禮組 - 嘉賓紀念品 (憑單#01)', 500, 246, '會操組', '不超過$500免報價 (副主席批核)', new Date()]);
    fSheet.appendRow(['f_7', 'isd_2026', '支出', '會操及典禮組 - 步操比賽獎盃與獎牌訂製 (憑單#01-2)', 2500, 2400, '會操組', '得獎隊伍獎勵', new Date()]);
    fSheet.appendRow(['f_8', 'isd_2026', '支出', '會操及典禮組 - 警察學院大操場樂隊及音響租用 (憑單#01-3)', 15000, 15000, '會操組', '已簽訂承辦商合約', new Date()]);
    fSheet.appendRow(['f_9', 'isd_2026', '支出', '主題節目組 - 節目／攤位遊戲道具與材料 (憑單#02)', 26000, 13872.53, '節目組', '各旅團攤位遊戲支援費', new Date()]);
    fSheet.appendRow(['f_10', 'isd_2026', '支出', '主題節目組 - 遊戲卡設計與批量印刷 (憑單#02-1)', 4000, 3028.97, '節目組', '集印花換紀念品用卡', new Date()]);
    fSheet.appendRow(['f_11', 'isd_2026', '支出', '主題節目組 - 遊戲獎品與紀念品採購 (憑單#03)', 5000, 2800.00, '節目組', '小隊挑戰獎品', new Date()]);
    fSheet.appendRow(['f_12', 'isd_2026', '支出', '品牌推廣組 - 宣傳海報及橫額印製 (憑單#04)', 5000, 4800, '品牌組', '各區及學校宣傳', new Date()]);
    fSheet.appendRow(['f_13', 'isd_2026', '支出', '品牌推廣組 - 場刊設計與批量印刷 (憑單#04-1)', 8000, 7500, '品牌組', '典禮場刊', new Date()]);
    fSheet.appendRow(['f_14', 'isd_2026', '支出', '行政及協調組 - 參加者集體保險費用 (憑單#05-2)', 10000, 9500, '行政組', '承保全體營員', new Date()]);
  }
  
  // 7. Activities
  const actSheet = ss.getSheetByName('Activities');
  if (actSheet.getLastRow() <= 1) {
    actSheet.appendRow(['a_1', 'isd_2026', '步操檢閱與比賽', '儀式/比賽', '警察學院大操場', '各旅團步操隊伍接受檢閱與評審', '會操司令員：黃志樂', new Date()]);
    actSheet.appendRow(['a_2', 'isd_2026', '童軍技能攤位博覽', '攤位遊戲', '主營地 A-F 區', '由各旅團設置之互動遊戲與繩結挑戰攤位', '主題節目組統籌', new Date()]);
    actSheet.appendRow(['a_3', 'isd_2026', '积极公民獎章工作坊 (VS & RS)', '專章培訓', '課室 1-3', 'Scout for Innovative Community Builders 培訓', '專章導師指導', new Date()]);
  }
  
  // 8. Meals
  const mealSheet = ss.getSheetByName('Meals');
  if (mealSheet.getLastRow() <= 1) {
    mealSheet.appendRow(['meal_1', 'isd_2026', '2026-10-04', '午餐 (旅團代訂餐)', '精美便當連飲品 (每位$55)', 150, '主題節目組', 'pending', '周恒晉', '', new Date()]);
  }
  
  // 9. Schedule
  const schSheet = ss.getSheetByName('Schedule');
  if (schSheet.getLastRow() <= 1) {
    schSheet.appendRow(['sch_1', 'isd_2026', '07:45 - 08:30', '會操及頒獎禮場地設置劃位', '各功能組別場地佈置', '大操場', '協調組', new Date()]);
    schSheet.appendRow(['sch_2', 'isd_2026', '08:30 - 10:30', '參加旅團報到 / 步操比賽後備日', '各隊員於警察學院報到處報到', '報到處', '接待組', new Date()]);
    schSheet.appendRow(['sch_3', 'isd_2026', '11:00 - 12:00', '優異旅團及獎勵頒發典禮', '主禮嘉賓檢閱及頒獎', '大操場 / 有蓋操場', '會操及典禮組', new Date()]);
    schSheet.appendRow(['sch_4', 'isd_2026', '13:00 - 16:30', '攤位博覽與積極公民工作坊', '各項挑戰活動及專章培訓', '營地全區', '主題節目組', new Date()]);
  }
  
  // 10. Supplies
  const supSheet = ss.getSheetByName('Supplies');
  if (supSheet.getLastRow() <= 1) {
    supSheet.appendRow(['sup_1', 'isd_2026', '對講機 Walkie-Talkie', 25, '部', '通訊', new Date()]);
    supSheet.appendRow(['sup_2', 'isd_2026', '大型戶外帳篷 (3x3m)', 10, '個', '營具', new Date()]);
    supSheet.appendRow(['sup_3', 'isd_2026', '車輛通行證 (11-12/10佈置/正日)', 35, '張', '交通', new Date()]);
  }
  
  // 11. Supply_Requests 是真實申請紀錄，不加入測試資料。
  // 即使超管清空工作表後再次執行 initializeSheets，也不會重新建立「周恒晉／對講機」示例。
  
  SpreadsheetApp.getUi().alert('成功！所有 ISD 2026 零精簡、完整文本政策、詳細預算與完整職員名單已寫入 Google Sheet。');
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'getEvents';
    const apiKey = e.parameter.api_key || '';
    const eventId = e.parameter.event_id || '';
    
    if (action !== 'getEvents' && !verifyApiKey(apiKey)) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid API Key' });
    }
    
    if (action === 'getEvents') {
      return jsonResponse({ success: true, data: getAllEvents() });
    } else if (action === 'getEventData') {
      return jsonResponse({ success: true, data: getEventAllData(eventId) });
    } else {
      return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const apiKey = data.api_key || '';
    
    if (action !== 'login' && !verifyApiKey(apiKey)) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid API Key' });
    }
    
    if (action === 'login') return jsonResponse(handleLogin(data));
    else if (action === 'verifyEventPassword') return jsonResponse(verifyEventPassword(data));
    else if (action === 'saveRecord') return jsonResponse(saveRecord(data));
    else if (action === 'saveBooths') return jsonResponse(saveBooths(data));
    else if (action === 'changePassword') return jsonResponse(changePassword(data));
    else if (action === 'getAllUsers') return jsonResponse(getAllUsers());
    else if (action === 'createAccount') return jsonResponse(createAccount(data));
    else if (action === 'saveUserPermissions') return jsonResponse(saveUserPermissions(data));
    else if (action === 'getApprovalPermissions') return jsonResponse(getApprovalPermissions());
    else if (action === 'saveApprovalPermissions') return jsonResponse(saveApprovalPermissions(data));
    else if (action === 'getApprovalRouting') return jsonResponse(getApprovalRouting(data));
    else if (action === 'saveApprovalRouting') return jsonResponse(saveApprovalRouting(data));
    else if (action === 'updateUser') return jsonResponse(updateUser(data));
    else if (action === 'saveUsers') return jsonResponse(saveUsers(data));
    else if (action === 'syncAccountsFromSetup') return jsonResponse(syncAccountsFromSetup());
    else if (action === 'deleteRecord') return jsonResponse(deleteRecord(data));
    else if (action === 'updateStatus') return jsonResponse(updateStatus(data));
    else if (action === 'sendMeetingEmail') return jsonResponse(sendMeetingEmailNotification(data));
    else if (action === 'listDriveFolder') return jsonResponse(listDriveFolder(data));
    else return jsonResponse({ success: false, error: 'Unknown POST action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function getAllEvents() {
  const ss = getSheet();
  const sheet = ss.getSheetByName('Events');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = rows[i][idx]; });
    delete obj.password_hash;
    list.push(obj);
  }
  return list;
}

function verifyEventPassword(data) {
  const eventId = data.event_id;
  const password = data.password;
  const ss = getSheet();
  const sheet = ss.getSheetByName('Events');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIdx = headers.indexOf('event_id');
  const passIdx = headers.indexOf('password_hash');
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === eventId) {
      const storedHash = rows[i][passIdx];
      if (!storedHash || storedHash === hashPassword(password)) {
        return { success: true, message: '密碼正確' };
      } else {
        return { success: false, error: '活動密碼錯誤' };
      }
    }
  }
  return { success: false, error: '找不到該活動' };
}

function handleLogin(data) {
  const loginId = String(data.user_id || '').trim();
  const password = String(data.password == null ? '' : data.password);
  
  // 超管帳號：只存在本 SCRIPT，不在任何 Sheet/前端；帳號不區分大小寫，密碼區分
  if (loginId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && password === SUPER_ADMIN_PASS) {
    return { success: true, user: { user_id: 'sheep', name: '超級管理員', email: SUPER_ADMIN_EMAIL, role: 'super_admin', group_name: '行政組' } };
  }

  const ss = getSheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Users sheet missing' };
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  for (let i = 1; i < rows.length; i++) {
    const rowObj = {};
    headers.forEach((h, idx) => { rowObj[h] = rows[i][idx]; });
    if (rowObj.role === 'super_admin' && rowObj.user_id === 'sheep') continue;
    
    if (rowObj.user_id === loginId || rowObj.email === loginId || String(rowObj.name || '') === loginId) {
      if (rowObj.password_hash === hashPassword(password)) {
        delete rowObj.password_hash;
        return { success: true, user: rowObj };
      } else {
        return { success: false, error: '密碼錯誤' };
      }
    }
  }
  return { success: false, error: '找不到用戶帳號或電郵' };
}

function sendMeetingEmailNotification(data) {
  const meetingTitle = data.meeting_title || '第4次籌備委員會議';
  const meetingDate = data.meeting_date || '2026-08-18 19:15';
  const minLevel = data.min_level !== undefined ? parseInt(data.min_level) : 30;
  
  const ss = getSheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: '沒有找到任何委員' };
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const emailIdx = headers.indexOf('email');
  const nameIdx = headers.indexOf('name');
  const roleIdx = headers.indexOf('role');
  
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const role = rows[i][roleIdx];
    if (role === 'super_admin') continue;
    const level = getRoleLevel(role);
    if (level < minLevel) continue;
    
    const email = rows[i][emailIdx];
    const name = rows[i][nameIdx];
    if (email && email.indexOf('@') !== -1) {
      try {
        MailApp.sendEmail(
          email,
          `[童軍活動管理系統] 會議提醒 (主任或以上)：${meetingTitle}`,
          `親愛的 ${name} 委員：\n\n這是一封來自「童軍活動管理系統」的自動會議提示。\n\n會議名稱：${meetingTitle}\n會議時間：${meetingDate}\n地點：香港童軍百周年紀念大樓 1704 室\n\n請依時出席。\n\nCOPY RIGHT Scout System`
        );
        count++;
      } catch (err) {
        Logger.log(`Failed to email ${email}: ${err}`);
      }
    }
  }
  return { success: true, message: `成功向 ${count} 位主任或以上層級委員發送會議提醒電郵！` };
}

function getEventAllData(eventId) {
  const ss = getSheet();
  const modules = ['Meetings', 'Staff', 'Documents', 'Finance', 'Activities', 'Meals', 'Meal_Orders', 'Schedule', 'Supplies', 'Supply_Requests', 'Vehicle_Passes', 'Parking_Requests', 'Finance_Expenses', 'Oral_Quotes', 'Users'];
  const result = {};
  
  modules.forEach(mod => {
    const sheet = ss.getSheetByName(mod);
    if (!sheet || sheet.getLastRow() <= 1) {
      result[mod] = [];
      return;
    }
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const dataList = [];
    const eventIdIdx = headers.indexOf('event_id');
    
    for (let i = 1; i < rows.length; i++) {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = rows[i][idx]; });
      
      if (mod === 'Users' || mod === 'Staff') {
        if (obj.role === 'super_admin' || obj.user_id === 'sheep' || (obj.name && obj.name.indexOf('超級管理員') !== -1)) {
          continue;
        }
      }

      if (mod !== 'Users' && eventIdIdx !== -1 && obj.event_id && obj.event_id !== eventId) {
        if (eventId && obj.event_id !== eventId) continue;
      }
      if (obj.password_hash) delete obj.password_hash;
      dataList.push(obj);
    }
    result[mod] = dataList;
  });
  
  return result;
}

function saveRecord(data) {
  const moduleName = data.module;
  const record = data.record;
  const ss = getSheet();
  const sheet = ss.getSheetByName(moduleName);
  if (!sheet) return { success: false, error: 'Module sheet not found' };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idField = headers[0];
  const recordId = record[idField] || (moduleName.toLowerCase().slice(0, 3) + '_' + Date.now());
  record[idField] = recordId;
  if (!record.created_at) record.created_at = new Date();
  
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === recordId) { rowIndex = i + 1; break; }
  }
  
  const rowValues = headers.map(h => record[h] !== undefined ? record[h] : '');
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  else sheet.appendRow(rowValues);
  
  return { success: true, id: recordId };
}

// 攤位總表：清空該活動現有攤位紀錄後，整批重寫（供節目組副主席上傳 Excel 後同步）
function saveBooths(data) {
  const eventId = data.event_id || 'isd_2026';
  const booths = data.booths || [];
  const ss = getSheet();
  const sheet = ss.getSheetByName('Activities');
  if (!sheet) return { success: false, error: 'Activities sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const eventIdx = headers.indexOf('event_id');
  if (eventIdx === -1) return { success: false, error: 'event_id column missing' };
  // 刪除該活動既有攤位紀錄（type === 'booth' 的紀錄）
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][eventIdx] === eventId) sheet.deleteRow(i + 1);
  }
  const now = new Date();
  booths.forEach(function (b, idx) {
    const title = b.booth_name || b.booth_number || ('攤位 ' + (idx + 1));
    const type = 'booth';
    const location = b.location || '';
    const description = b.description || b.theme || '';
    const detailsJson = JSON.stringify(b);
    sheet.appendRow(['booth_' + Date.now() + '_' + idx, eventId, title, type, location, description, detailsJson, now]);
  });
  return { success: true, count: booths.length };
}

function deleteRecord(data) {
  const moduleName = data.module;
  const recordId = data.id;
  const ss = getSheet();
  const sheet = ss.getSheetByName(moduleName);
  if (!sheet) return { success: false, error: 'Module sheet not found' };
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === recordId) { sheet.deleteRow(i + 1); return { success: true }; }
  }
  return { success: false, error: 'Record not found' };
}

function updateStatus(data) {
  const moduleName = data.module;
  const recordId = data.id;
  const newStatus = data.status;
  const approver = data.approver || '';
  const ss = getSheet();
  const sheet = ss.getSheetByName(moduleName);
  if (!sheet) return { success: false, error: 'Module sheet not found' };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIdx = 0;
  const statusIdx = headers.indexOf('status');
  const approverIdx = headers.indexOf('approved_by');
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === recordId) {
      const rowNum = i + 1;
      if (statusIdx !== -1) sheet.getRange(rowNum, statusIdx + 1).setValue(newStatus);
      if (approverIdx !== -1 && approver) sheet.getRange(rowNum, approverIdx + 1).setValue(approver);
      return { success: true };
    }
  }
  return { success: false, error: 'Record not found' };
}
