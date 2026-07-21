// ============================================================
// 童軍活動管理系統 - Google Apps Script 後端 v2.0
// COPY RIGHT Scout System
// 支援 7 級權限（含顧問級 advisor、SHEEP 超管）、會議提醒與電郵廣播、審批中心
// ============================================================

const SUPER_ADMIN_EMAIL = 'sheep';
const SUPER_ADMIN_PASS = '0728';

function getSheet() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hashPassword(p) {
  if (!p) return '';
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, p, Utilities.Charset.UTF_8);
  return raw.map(function(b){return ('0' + (b & 0xFF).toString(16)).slice(-2);}).join('');
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 7級權限架構（含顧問級，與主席、管理員同級）
const ROLE_HIERARCHY = {
  'super_admin': 100,        // 1. 超級管理員 (sheep)
  'advisor': 80,             // 2. 顧問 (黃偉安、何家騏)
  'admin': 80,               // 2. 管理員
  'chairperson': 80,         // 2. 主席 (朱家聰)
  'vice_chairperson': 60,    // 3. 副主席 (袁可秀、張佳良、周恒晉、何嘉駿)
  'general_director': 40,    // 4. 總主任
  'director': 30,            // 5. 主任
  'staff': 20,               // 6. 工作人員
  'public': 0                // 7. 公開
};

function getRoleLevel(r) {
  return ROLE_HIERARCHY[r] !== undefined ? ROLE_HIERARCHY[r] : 0;
}

// 初始化所有工作表（確保不改動舊資料，只補齊缺失欄位）
function initializeSheets() {
  const ss = getSheet();
  
  // 1. Events (活動清單與密碼)
  ensureSheet(ss, 'Events', 
    ['event_id', 'event_name', 'password_hash', 'description', 'start_date', 'end_date', 'status', 'created_at'],
    [
      ['isd_2026', '2026 ISD 港島童軍繽紛日', hashPassword('1234'), '港島地域年度旗艦盛事：步操檢閱與攤位博覽', '2026-10-04', '2026-10-04', 'active', new Date()]
    ]
  );
  
  // 2. Users (用戶與7級權限 - SHEEP 超管與電郵登入)
  ensureSheet(ss, 'Users', 
    ['user_id', 'name', 'email', 'role', 'group_name', 'password_hash', 'status', 'created_at'],
    [
      ['sheep', '超級管理員 (SHEEP)', SUPER_ADMIN_EMAIL, 'super_admin', '行政組', hashPassword(SUPER_ADMIN_PASS), 'active', new Date()]
    ]
  );
  
  // 3. Meetings (會議紀錄與下次會議提示)
  ensureSheet(ss, 'Meetings', ['meeting_id', 'event_id', 'title', 'date', 'agenda', 'minutes', 'author', 'created_at'],
    [
      ['m_next', 'isd_2026', '第4次籌備委員會議 (下次會議)', '2026-08-18 19:15', '各功能組別進度最後衝刺與物資點算', '請各委員準時出席百周年紀念大樓1704室。', '秘書處', new Date()]
    ]
  );
  
  // 4. Staff (組織架構與工作人員)
  ensureSheet(ss, 'Staff', ['staff_id', 'event_id', 'name', 'role_title', 'group_name', 'contact', 'job_desc', 'created_at']);
  
  // 5. Documents (文件與通告)
  ensureSheet(ss, 'Documents', ['doc_id', 'event_id', 'title', 'category', 'file_url', 'uploaded_by', 'date', 'created_at']);
  
  // 6. Finance (財務預算與結算總表)
  ensureSheet(ss, 'Finance', ['finance_id', 'event_id', 'category', 'item', 'budget_amt', 'actual_amt', 'group_name', 'notes', 'created_at']);
  
  // 7. Activities (活動與攤位)
  ensureSheet(ss, 'Activities', ['activity_id', 'event_id', 'title', 'type', 'location', 'description', 'details_json', 'created_at']);
  
  // 8. Meals (膳食內容與統計)
  ensureSheet(ss, 'Meals', ['meal_id', 'event_id', 'date', 'meal_type', 'menu_desc', 'headcount', 'group_name', 'status', 'requested_by', 'approved_by', 'created_at']);
  
  // 9. Schedule (日程表)
  ensureSheet(ss, 'Schedule', ['schedule_id', 'event_id', 'time_slot', 'title', 'description', 'location', 'group_name', 'created_at']);
  
  // 10. Supplies (總物資與車輛通行證)
  ensureSheet(ss, 'Supplies', ['supply_id', 'event_id', 'item_name', 'total_qty', 'unit', 'category', 'created_at']);
  
  // 11. Supply_Requests (物資/車輛申請)
  ensureSheet(ss, 'Supply_Requests', ['request_id', 'event_id', 'supply_id', 'item_name', 'qty_requested', 'group_name', 'status', 'requested_by', 'approved_by', 'created_at']);
  
  SpreadsheetApp.getUi().alert('「童軍活動管理系統」初始化完成！所有 11 個模組工作表已動態檢查並確保結構完整。超管帳號：sheep / 0728');
}

function ensureSheet(ss, sheetName, headers, defaultRows) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0c4a6e').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    if (defaultRows && defaultRows.length > 0) {
      defaultRows.forEach(row => sheet.appendRow(row));
    }
  } else {
    const lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      headers.forEach(h => {
        if (existingHeaders.indexOf(h) === -1) {
          sheet.getRange(1, lastCol + 1).setValue(h);
          sheet.getRange(1, lastCol + 1).setFontWeight('bold').setBackground('#0c4a6e').setFontColor('#ffffff');
        }
      });
    } else {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0c4a6e').setFontColor('#ffffff');
    }
  }
}

// API GET 處理
function doGet(e) {
  try {
    const action = e.parameter.action || 'getEvents';
    const eventId = e.parameter.event_id || '';
    
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

// API POST 處理
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'login') {
      return jsonResponse(handleLogin(data));
    } else if (action === 'verifyEventPassword') {
      return jsonResponse(verifyEventPassword(data));
    } else if (action === 'saveRecord') {
      return jsonResponse(saveRecord(data));
    } else if (action === 'deleteRecord') {
      return jsonResponse(deleteRecord(data));
    } else if (action === 'updateStatus') {
      return jsonResponse(updateStatus(data));
    } else if (action === 'sendMeetingEmail') {
      return jsonResponse(sendMeetingEmailNotification(data));
    } else {
      return jsonResponse({ success: false, error: 'Unknown POST action' });
    }
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
  const loginId = (data.user_id || '').trim(); // 可以是 username 或 email
  const password = data.password;
  const ss = getSheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Users sheet missing' };
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  const idIdx = headers.indexOf('user_id');
  const emailIdx = headers.indexOf('email');
  const passIdx = headers.indexOf('password_hash');
  
  for (let i = 1; i < rows.length; i++) {
    const rowObj = {};
    headers.forEach((h, idx) => { rowObj[h] = rows[i][idx]; });
    
    if (rowObj.user_id === loginId || rowObj.email === loginId) {
      if (rowObj.password_hash === hashPassword(password)) {
        delete rowObj.password_hash;
        return { success: true, user: rowObj };
      } else {
        return { success: false, error: '密碼錯誤' };
      }
    }
  }
  
  // 支援 SHEEP 超管直接登入
  if (loginId === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASS) {
    return {
      success: true,
      user: { user_id: 'sheep', name: '超級管理員 (SHEEP)', email: SUPER_ADMIN_EMAIL, role: 'super_admin', group_name: '行政組' }
    };
  }
  
  return { success: false, error: '找不到用戶帳號或電郵' };
}

function sendMeetingEmailNotification(data) {
  const meetingTitle = data.meeting_title || '第4次籌備委員會議';
  const meetingDate = data.meeting_date || '2026-08-18 19:15';
  const ss = getSheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: '沒有找到任何委員電郵' };
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const emailIdx = headers.indexOf('email');
  const nameIdx = headers.indexOf('name');
  
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const email = rows[i][emailIdx];
    const name = rows[i][nameIdx];
    if (email && email.indexOf('@') !== -1) {
      try {
        MailApp.sendEmail(
          email,
          `[童軍活動管理系統] 會議提醒：${meetingTitle}`,
          `親愛的 ${name} 委員：\n\n這是一封來自「童軍活動管理系統」的自動會議提示。\n\n會議名稱：${meetingTitle}\n會議時間：${meetingDate}\n地點：香港童軍百周年紀念大樓 1704 室\n\n請準時出席並預早查閱系統內各項議程與檔案。\n\nCOPY RIGHT Scout System`
        );
        count++;
      } catch (err) {
        Logger.log(`Failed to send email to ${email}: ${err}`);
      }
    }
  }
  return { success: true, message: `成功向 ${count} 位委員發送會議電郵提示！` };
}

function getEventAllData(eventId) {
  const ss = getSheet();
  const modules = ['Meetings', 'Staff', 'Documents', 'Finance', 'Activities', 'Meals', 'Schedule', 'Supplies', 'Supply_Requests', 'Users'];
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
  if (!sheet) return { success: false, error: 'Module sheet not found: ' + moduleName };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idField = headers[0];
  const recordId = record[idField] || (moduleName.toLowerCase().slice(0, 3) + '_' + Date.now());
  record[idField] = recordId;
  if (!record.created_at) record.created_at = new Date();
  
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === recordId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const rowValues = headers.map(h => record[h] !== undefined ? record[h] : '');
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  
  return { success: true, id: recordId };
}

function deleteRecord(data) {
  const moduleName = data.module;
  const recordId = data.id;
  const ss = getSheet();
  const sheet = ss.getSheetByName(moduleName);
  if (!sheet) return { success: false, error: 'Module sheet not found' };
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === recordId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
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
      if (statusIdx !== -1) {
        sheet.getRange(rowNum, statusIdx + 1).setValue(newStatus);
      }
      if (approverIdx !== -1 && approver) {
        sheet.getRange(rowNum, approverIdx + 1).setValue(approver);
      }
      return { success: true };
    }
  }
  return { success: false, error: 'Record not found' };
}
