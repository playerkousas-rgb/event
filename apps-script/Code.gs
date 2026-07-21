// ============================================================
// 童軍活動管理系統 - Google Apps Script 後端 v4.1 (完整真實試算表對接版)
// COPY RIGHT Scout System
// 當 mockMode 關閉時，前端 100% 讀取 Google Sheet 中的真實資料
// initializeSheets() 會將所有完整組織架構與明細寫入試算表
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

const ROLE_HIERARCHY = {
  'super_admin': 100,
  'advisor': 80,
  'admin': 80,
  'chairperson': 80,
  'vice_chairperson': 60,
  'general_director': 40,
  'director': 30,
  'staff': 20,
  'public': 0
};

function getRoleLevel(r) {
  return ROLE_HIERARCHY[r] !== undefined ? ROLE_HIERARCHY[r] : 0;
}

function initializeSheets() {
  const ss = getSheet();
  ensureSheet(ss, 'Events', ['event_id', 'event_name', 'password_hash', 'description', 'start_date', 'end_date', 'status', 'created_at']);
  ensureSheet(ss, 'Users', ['user_id', 'name', 'email', 'role', 'group_name', 'password_hash', 'status', 'created_at']);
  ensureSheet(ss, 'Meetings', ['meeting_id', 'event_id', 'title', 'date', 'agenda', 'minutes', 'author', 'created_at']);
  ensureSheet(ss, 'Staff', ['staff_id', 'event_id', 'name', 'role_title', 'group_name', 'contact', 'job_desc', 'created_at']);
  ensureSheet(ss, 'Documents', ['doc_id', 'event_id', 'title', 'category', 'file_url', 'uploaded_by', 'date', 'created_at']);
  ensureSheet(ss, 'Finance', ['finance_id', 'event_id', 'category', 'item', 'budget_amt', 'actual_amt', 'group_name', 'notes', 'created_at']);
  ensureSheet(ss, 'Activities', ['activity_id', 'event_id', 'title', 'type', 'location', 'description', 'details_json', 'created_at']);
  ensureSheet(ss, 'Meals', ['meal_id', 'event_id', 'date', 'meal_type', 'menu_desc', 'headcount', 'group_name', 'status', 'requested_by', 'approved_by', 'created_at']);
  ensureSheet(ss, 'Schedule', ['schedule_id', 'event_id', 'time_slot', 'title', 'description', 'location', 'group_name', 'created_at']);
  ensureSheet(ss, 'Supplies', ['supply_id', 'event_id', 'item_name', 'total_qty', 'unit', 'category', 'created_at']);
  ensureSheet(ss, 'Supply_Requests', ['request_id', 'event_id', 'supply_id', 'item_name', 'qty_requested', 'group_name', 'status', 'requested_by', 'approved_by', 'created_at']);

  seedInitialData();
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

// 完整寫入所有真實 ISD 2026 數據與完整 Staff 名單進 Google Sheet
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
    uSheet.appendRow(['sheep', '超級管理員', SUPER_ADMIN_EMAIL, 'super_admin', '行政組', hashPassword(SUPER_ADMIN_PASS), 'active', new Date()]);
    uSheet.appendRow(['advisor01', '黃偉安', 'advisor1@isd.local', 'advisor', '顧問團', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['chair01', '朱家聰', 'chair@isd.local', 'chairperson', '籌委會', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['exec_vp', '袁可秀', 'execvp@isd.local', 'vice_chairperson', '行政組', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['vp_parade', '張佳良', 'vpparade@isd.local', 'vice_chairperson', '會操及典禮組', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['vp_program', '周恒晉', 'vpprogram@isd.local', 'vice_chairperson', '主題節目組', hashPassword('1234'), 'active', new Date()]);
  }
  
  // 3. Meetings
  const mSheet = ss.getSheetByName('Meetings');
  if (mSheet.getLastRow() <= 1) {
    mSheet.appendRow(['m_0', 'isd_2026', '第0次預備會議 (Zoom)', '2026-05-01', '活動背景簡介、上屆活動檢討、籌委會架構確認', '主席朱家聰主持，確認 2026 ISD 於 10 月 4 日警察學院舉行。', '主席 朱家聰', new Date()]);
    mSheet.appendRow(['m_1', 'isd_2026', '第1次籌備委員會議', '2026-05-12', '利益申報、活動內容簡介、各功能組別初步構思', '議決各組財政指引、會計程序及步操檢閱流程方向。', '主席 朱家聰', new Date()]);
    mSheet.appendRow(['m_2', 'isd_2026', '第2次籌備委員會議', '2026-06-16', '各功能組別進度匯報與節目細節確認', '進度良好，重點推進積極公民獎章工作坊及攤位設計。', '執行副主席 袁可秀', new Date()]);
    mSheet.appendRow(['m_3', 'isd_2026', '第3次籌備委員會議', '2026-07-21', '各功能組別進度匯報與財政預算審批', '審議財務指引、報價門檻 ($500/$2000/$5000) 及結算總表 (附件5)。', '主席 朱家聰', new Date()]);
    mSheet.appendRow(['m_next', 'isd_2026', '第4次籌備委員會議 (下次會議)', '2026-08-18 19:15', '各功能組別進度最後衝刺與物資點算', '主任或以上委員請準時出席百周年紀念大樓1704室。', '秘書處', new Date()]);
  }
  
  // 4. Staff (完整收錄所有工作人員、總主任、節目主任)
  const sSheet = ss.getSheetByName('Staff');
  if (sSheet.getLastRow() <= 1) {
    sSheet.appendRow(['s_1', 'isd_2026', '黃偉安 / 何家騏', '顧問', '顧問團', '91111111', '政策指導與總監匯報', new Date()]);
    sSheet.appendRow(['s_2', 'isd_2026', '朱家聰', '主席', '籌委會', '92222222', '全域統籌', new Date()]);
    sSheet.appendRow(['s_3', 'isd_2026', '袁可秀', '執行副主席', '行政組', '93333333', '行政與財務審批', new Date()]);
    sSheet.appendRow(['s_4', 'isd_2026', '張佳良', '副主席', '會操及典禮組', '94444444', '會操與典禮統籌', new Date()]);
    sSheet.appendRow(['s_5', 'isd_2026', '梁文澧', '總主任（會操）', '會操及典禮組', '94222222', '會操後備日統籌', new Date()]);
    sSheet.appendRow(['s_6', 'isd_2026', '黃志樂', '步操統籌主任 / 會操司令員', '會操及典禮組', '94111111', '步操檢閱指揮', new Date()]);
    sSheet.appendRow(['s_7', 'isd_2026', '李懷恩', '副主席（典禮）', '會操及典禮組', '94333333', '典禮與優異旅團統籌', new Date()]);
    sSheet.appendRow(['s_8', 'isd_2026', '周恒晉', '副主席', '主題節目組', '95555555', '攤位與遊戲統籌', new Date()]);
    sSheet.appendRow(['s_9', 'isd_2026', '仇紹謙', '總主任（主題節目）', '主題節目組', '95111111', '節目內容策劃', new Date()]);
    sSheet.appendRow(['s_10', 'isd_2026', '何令勤', '節目主任 (1)', '主題節目組', '95211111', '遊戲攤位執行', new Date()]);
    sSheet.appendRow(['s_11', 'isd_2026', '陳鋑羲', '節目主任 (2)', '主題節目組', '95222222', '遊戲攤位執行', new Date()]);
    sSheet.appendRow(['s_12', 'isd_2026', '張宏剛', '節目主任 (3)', '主題節目組', '95233333', '遊戲攤位執行', new Date()]);
    sSheet.appendRow(['s_13', 'isd_2026', '羅卓華', '節目主任 (4)', '主題節目組', '95244444', '攤位遊戲與印花', new Date()]);
    sSheet.appendRow(['s_14', 'isd_2026', '李庭甄', '節目主任 (5)', '主題節目組', '95255555', '積極公民工作坊', new Date()]);
    sSheet.appendRow(['s_15', 'isd_2026', '何嘉駿', '副主席', '品牌推廣組', '96666666', '宣傳與攝錄統籌', new Date()]);
    sSheet.appendRow(['s_16', 'isd_2026', '林耀鏘', '拍攝/攝錄統籌主任', '品牌推廣組', '96333333', '活動當日錄影及拍照', new Date()]);
  }
  
  // 5. Documents
  const dSheet = ss.getSheetByName('Documents');
  if (dSheet.getLastRow() <= 1) {
    dSheet.appendRow(['d_1', 'isd_2026', '利益申報政策及收受利益指引 (附件一)', '合規政策', '#', '行政組', '2026-05-01', new Date()]);
    dSheet.appendRow(['d_2', 'isd_2026', '財務指引及會計程序 (含 $500/$2000 報價門檻)', '財務', '#', '行政組', '2026-07-01', new Date()]);
    dSheet.appendRow(['d_3', 'isd_2026', '結算總表範本 (附件5 - 報銷憑單對照)', '財務', '#', '財務組', '2026-07-01', new Date()]);
    dSheet.appendRow(['d_4', 'isd_2026', '特別通告第XX/26號 (Scout for SDGs 主軸)', '通告', '#', '行政組', '2026-07-01', new Date()]);
  }
  
  // 6. Finance
  const fSheet = ss.getSheetByName('Finance');
  if (fSheet.getLastRow() <= 1) {
    fSheet.appendRow(['f_1', 'isd_2026', '收入', '繽紛日參加者費用@$10', 10000, 10390, '財務組', '預算表實收', new Date()]);
    fSheet.appendRow(['f_2', 'isd_2026', '收入', '港島地域童軍基金撥款', 260000, 243122.59, '財務組', '地域撥款', new Date()]);
    fSheet.appendRow(['f_3', 'isd_2026', '支出', '會操及典禮組 - 嘉賓紀念品 (憑單#01)', 500, 246, '會操組', '不超過$500免報價', new Date()]);
    fSheet.appendRow(['f_4', 'isd_2026', '支出', '主題節目組 - 節目／攤位遊戲', 26000, 13872.53, '節目組', '道具與佈置', new Date()]);
  }
  
  // 7. Activities
  const actSheet = ss.getSheetByName('Activities');
  if (actSheet.getLastRow() <= 1) {
    actSheet.appendRow(['a_1', 'isd_2026', '步操檢閱與比賽', '儀式/比賽', '警察學院大操場', '各旅團步操隊伍接受檢閱與評審', '會操司令員：黃志樂', new Date()]);
    actSheet.appendRow(['a_2', 'isd_2026', '童軍技能攤位博覽', '攤位遊戲', '主營地 A-F 區', '由各旅團設置之互動遊戲與繩結挑戰攤位', '主題節目組統籌', new Date()]);
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
  }
  
  // 10. Supplies
  const supSheet = ss.getSheetByName('Supplies');
  if (supSheet.getLastRow() <= 1) {
    supSheet.appendRow(['sup_1', 'isd_2026', '對講機 Walkie-Talkie', 25, '部', '通訊', new Date()]);
    supSheet.appendRow(['sup_2', 'isd_2026', '大型戶外帳篷 (3x3m)', 10, '個', '營具', new Date()]);
  }
  
  // 11. Supply_Requests
  const reqSheet = ss.getSheetByName('Supply_Requests');
  if (reqSheet.getLastRow() <= 1) {
    reqSheet.appendRow(['req_1', 'isd_2026', 'sup_1', '對講機 Walkie-Talkie', 5, '主題節目組', 'pending', '周恒晉', '', new Date()]);
  }
  
  SpreadsheetApp.getUi().alert('成功！所有 ISD 2026 完整工作人員名單與真實明細已完整寫入 Google Sheet。');
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
    else if (action === 'deleteRecord') return jsonResponse(deleteRecord(data));
    else if (action === 'updateStatus') return jsonResponse(updateStatus(data));
    else if (action === 'sendMeetingEmail') return jsonResponse(sendMeetingEmailNotification(data));
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
  const loginId = (data.user_id || '').trim();
  const password = data.password;
  
  if (loginId === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASS) {
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
    
    if (rowObj.user_id === loginId || rowObj.email === loginId) {
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
