// ============================================================
// 童軍活動管理系統 - Google Apps Script 後端 v6.0 全前端·批量開戶·手機友善版
// 參考 scoutbadge 同一個 APP 管晒所有旅團設計
// COPY RIGHT Scout System
// 支援：全前端控制、批量開戶 CSV/JSON/GS 三軌、手機友善、Mock雙軌、細緻權限
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
function showApiKey(){
  const ss=getSheet(); const apiKey=getApiKey();
  const url=ScriptApp.getService().getUrl()||'未部署';
  try{ SpreadsheetApp.getUi().alert('API Key & URL\n\nKey: '+apiKey+'\n\nURL: '+url); }catch(e){}
  Logger.log('API Key: '+apiKey+' URL: '+url);
  return apiKey;
}
function refreshApiKey() {
  const props = PropertiesService.getScriptProperties();
  const newApiKey = 'scout_' + Utilities.getUuid().replace(/-/g, '').substring(0, 24);
  props.setProperty('API_KEY', newApiKey);
  try{ const ui = SpreadsheetApp.getUi(); if (ui) ui.alert('API Key 已刷新', '新的 API Key：\n\n' + newApiKey, ui.ButtonSet.OK); }catch(e){}
  return newApiKey;
}
function verifyApiKey(key) { return key === getApiKey(); }

function hashPassword(p) {
  if (!p) return '';
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, p, Utilities.Charset.UTF_8);
  return raw.map(function(b){return ('0' + (b & 0xFF).toString(16)).slice(-2);}).join('');
}
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
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
function getRoleLevel(r) { return ROLE_HIERARCHY[r]!==undefined?ROLE_HIERARCHY[r]:0; }

function initializeSheets() {
  const ss = getSheet();
  ensureSheet(ss, 'Events', ['event_id', 'event_name', 'password_hash', 'description', 'start_date', 'end_date', 'status', 'created_at']);
  ensureSheet(ss, 'Users', ['user_id','name','email','role','group_name','contact','password_hash','can_tick','status','allowed_modules','squad','squad_role','job_desc','created_at','last_login','auth_by','auth_date']);
  ensureSheet(ss, 'Meetings', ['meeting_id','event_id','meeting_number','title','date','time','location','status','visibility','agenda','agenda_file_name','agenda_file_data','agenda_uploaded_by','agenda_uploaded_at','minutes','minutes_file_name','minutes_file_data','minutes_uploaded_by','minutes_uploaded_at','attachments_json','group_uploads_json','author','created_by','created_at','updated_at']);
  ensureSheet(ss, 'Staff', ['staff_id', 'event_id', 'name', 'role_title', 'group_name', 'contact', 'job_desc', 'created_at']);
  ensureSheet(ss, 'Documents', ['doc_id', 'event_id', 'title', 'category', 'file_url', 'uploaded_by', 'date', 'created_at']);
  ensureSheet(ss, 'Finance', ['finance_id', 'event_id', 'category', 'item', 'budget_amt', 'actual_amt', 'group_name', 'notes', 'created_at']);
  ensureSheet(ss, 'Activities', ['activity_id', 'event_id', 'title', 'type', 'location', 'description', 'details_json', 'created_at']);
  ensureSheet(ss, 'Meals', ['meal_id', 'event_id', 'date', 'meal_type', 'menu_desc', 'headcount', 'group_name', 'status', 'requested_by', 'approved_by', 'created_at']);
  ensureSheet(ss, 'Schedule', ['schedule_id', 'event_id', 'time_slot', 'title', 'description', 'location', 'group_name', 'created_at']);
  ensureSheet(ss, 'Supplies', ['supply_id', 'event_id', 'item_name', 'total_qty', 'unit', 'category', 'created_at']);
  ensureSheet(ss, 'Supply_Requests', ['request_id','event_id','supply_id','item_name','qty_requested','qty_approved','unit','group_name','reason','date_needed','contact','status','requested_by','requested_by_id','approved_by','approved_at','notes','created_at']);
  ensureSheet(ss, 'Vehicle_Passes', ['pass_id','event_id','plate','driver_name','driver_contact','vehicle_type','purpose','group_name','entry_date','exit_date','parking_location','status','requested_by','requested_by_id','approved_by','approved_at','notes','created_at']);
  ensureSheet(ss, 'SystemConfig', ['key','value','updated_at','updated_by']);
  ensureSheet(ss, 'AuditLog', ['time','actor','action','target','detail']);
  seedInitialData();
}

function ensureSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0c4a6e').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    // 補欄位 (不覆蓋舊資料)
    const existing = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const missing = headers.filter(h=> existing.indexOf(h)===-1);
    if(missing.length){
      const newCol = sheet.getLastColumn()+1;
      missing.forEach((h,i)=>{
        sheet.getRange(1,newCol+i).setValue(h).setFontWeight('bold').setBackground('#0c4a6e').setFontColor('#ffffff');
      });
    }
  }
}

function seedInitialData() {
  const ss = getSheet();
  const evSheet = ss.getSheetByName('Events');
  if (evSheet.getLastRow() <= 1) {
    evSheet.appendRow(['isd_2026', '2026 ISD 港島童軍繽紛日', hashPassword('1234'), '港島地域年度旗艦盛事：步操檢閱與攤位博覽', '2026-10-04', '2026-10-04', 'active', new Date()]);
    evSheet.appendRow(['isd_2027', '2027 ISD 大露營', hashPassword('1234'), '未來展望：國際大露營', '2027-10-01', '2027-10-04', 'upcoming', new Date()]);
  }
  const uSheet = ss.getSheetByName('Users');
  if (uSheet.getLastRow() <= 1) {
    uSheet.appendRow(['sheep', '超級管理員', SUPER_ADMIN_EMAIL, 'super_admin', '行政組', '', hashPassword(SUPER_ADMIN_PASS), 'TRUE', 'active', '*', '', '', '系統維護', new Date(), '', 'system', new Date()]);
    uSheet.appendRow(['advisor01', '黃偉安', 'advisor1@isd.local', 'advisor', '顧問團', '91111111', hashPassword('1234'), 'TRUE', 'active', '*', '', '', '政策指導', new Date(), '', 'system', new Date()]);
    uSheet.appendRow(['chair01', '朱家聰', 'chair@isd.local', 'chairperson', '籌委會', '92222222', hashPassword('1234'), 'TRUE', 'active', '*', '', '', '主席', new Date(), '', 'system', new Date()]);
    uSheet.appendRow(['exec_vp', '袁可秀', 'execvp@isd.local', 'vice_chairperson', '行政組', '93333333', hashPassword('1234'), 'TRUE', 'active', '*', '', '', '執行副主席', new Date(), '', 'system', new Date()]);
    uSheet.appendRow(['vp_parade', '張佳良', 'vpparade@isd.local', 'vice_chairperson', '會操及典禮組', '94444444', hashPassword('1234'), 'TRUE', 'active', '*', '', '', '會操統籌', new Date(), '', 'system', new Date()]);
    uSheet.appendRow(['vp_program', '周恒晉', 'vpprogram@isd.local', 'vice_chairperson', '主題節目組', '95555555', hashPassword('1234'), 'TRUE', 'active', '*', '', '', '主題節目統籌', new Date(), '', 'system', new Date()]);
    uSheet.appendRow(['staff_001', '陳小明', 'staff001@isd.local', 'staff', '主題節目組', '95211111', hashPassword('1234'), 'FALSE', 'active', '', '紅隊', 'member', '遊戲攤位執行', new Date(), '', 'system', new Date()]);
  }
  const mSheet = ss.getSheetByName('Meetings');
  if (mSheet.getLastRow() <= 1) {
    mSheet.appendRow(['m_0', 'isd_2026', '第0次預備會議 (Zoom)', '2026-05-01', '背景簡介、架構確認', '確認 10月4日警察學院舉行', '主席 朱家聰', new Date()]);
    mSheet.appendRow(['m_next', 'isd_2026', '第4次籌備委員會議 (下次會議)', '2026-08-18 19:15', '最後衝刺與物資點算', '主任或以上請準時出席1704室', '秘書處', new Date()]);
  }
  const supSheet = ss.getSheetByName('Supplies');
  if (supSheet.getLastRow() <= 1) {
    supSheet.appendRow(['sup_1', 'isd_2026', '對講機 Walkie-Talkie', 25, '部', '通訊', new Date()]);
    supSheet.appendRow(['sup_2', 'isd_2026', '大型戶外帳篷 (3x3m)', 10, '個', '營具', new Date()]);
  }
  const cSheet = ss.getSheetByName('SystemConfig');
  if (cSheet.getLastRow() <= 1) {
    cSheet.appendRow(['banner_text','第4次籌備委員會議：2026年8月18日晚上7時15分 @ 百周年紀念大樓1704室',new Date(),'system']);
    cSheet.appendRow(['next_meeting','2026-08-18 19:15',new Date(),'system']);
    cSheet.appendRow(['allow_public','true',new Date(),'system']);
    cSheet.appendRow(['allow_member_view','false',new Date(),'system']);
    cSheet.appendRow(['default_pwd','1234',new Date(),'system']);
  }
  try{ SpreadsheetApp.getUi().alert('✅ v6.0 初始化完成！\n\n支援：全前端控制、批量開戶 (CSV/JSON/GS 三軌)、手機友善、Mock雙軌\n\nAPI Key: '+getApiKey()+'\nURL: '+(ScriptApp.getService().getUrl()||'需部署')); }catch(e){}
}

// ===================== API Handlers =====================
function doGet(e) {
  try {
    const action = e.parameter.action || 'getEvents';
    const apiKey = e.parameter.api_key || e.parameter.apikey || '';
    const eventId = e.parameter.event_id || '';
    if (action !== 'getEvents' && !verifyApiKey(apiKey)) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid API Key' });
    }
    if (action === 'getEvents') return jsonResponse({ success: true, data: getAllEvents() });
    else if (action === 'getEventData') return jsonResponse({ success: true, data: getEventAllData(eventId) });
    else if (action === 'getAllUsers') return jsonResponse({ success: true, users: getAllUsersRaw() });
    else if (action === 'getConfig') return jsonResponse({ success: true, config: getSystemConfig() });
    else return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const apiKey = data.api_key || data.apikey || '';
    // login & verifyEventPassword 允許無 key (方便前端切換) 但若有提供必須正確
    if (action !== 'login' && action !== 'verifyEventPassword' && apiKey && !verifyApiKey(apiKey)) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid API Key' });
    }
    // 若完全無 key 且非公開 action，則檢查是否 mock 模式允許，否則仍需 key (安全)
    if (['getAllUsers','batchAddUsers','batchSave','saveRecord','deleteRecord','updateStatus','sendMeetingEmail','getConfig','updateConfig','deactivateUser','resetPassword','uploadFileToFolder'].indexOf(action)>=0 && !apiKey) {
      // 若完全無 apiKey，仍允許在測試階段 (相容 scoutbadge：人類靠登入防，URL公開)
      // 不阻擋
    }
    if (action === 'login') return jsonResponse(handleLogin(data));
    else if (action === 'verifyEventPassword') return jsonResponse(verifyEventPassword(data));
    else if (action === 'getAllUsers') return jsonResponse({ success: true, users: getAllUsersRaw(true) });
    else if (action === 'batchAddUsers') return jsonResponse(handleBatchAddUsers(data));
    else if (action === 'saveRecord') return jsonResponse(saveRecord(data));
    else if (action === 'batchSave') return jsonResponse(handleBatchSave(data));
    else if (action === 'deleteRecord') return jsonResponse(deleteRecord(data));
    else if (action === 'updateStatus') return jsonResponse(updateStatus(data));
    else if (action === 'sendMeetingEmail') return jsonResponse(sendMeetingEmailNotification(data));
    else if (action === 'getConfig') return jsonResponse({ success: true, config: getSystemConfig() });
    else if (action === 'updateConfig') return jsonResponse(updateSystemConfig(data));
    else if (action === 'deactivateUser') return jsonResponse(deactivateUser(data));
    else if (action === 'resetPassword') return jsonResponse(resetPassword(data));
    else if (action === 'uploadFileToFolder') return jsonResponse(handleUploadFileToDriveFolder(data));
    else return jsonResponse({ success: false, error: 'Unknown POST action: '+action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString(), stack: err.stack });
  }
}

// ===================== Core Logic =====================
function getAllEvents() {
  const ss = getSheet(); const sheet = ss.getSheetByName('Events');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const rows = sheet.getDataRange().getValues(); const headers = rows[0]; const list=[];
  for (let i=1;i<rows.length;i++){ const obj={}; headers.forEach((h, idx)=>{ obj[h]=rows[i][idx]; }); delete obj.password_hash; list.push(obj); }
  return list;
}

function verifyEventPassword(data) {
  const eventId = data.event_id; const password = data.password;
  const ss = getSheet(); const sheet = ss.getSheetByName('Events');
  if(!sheet) return { success: false, error: 'Events sheet missing' };
  const rows = sheet.getDataRange().getValues(); const headers=rows[0]; const idIdx=headers.indexOf('event_id'); const passIdx=headers.indexOf('password_hash');
  for (let i=1;i<rows.length;i++){
    if (rows[i][idIdx]===eventId){
      const storedHash=rows[i][passIdx];
      if (!storedHash || storedHash===hashPassword(password) || storedHash===password){ return { success:true, message:'密碼正確' }; }
      else return { success:false, error:'活動密碼錯誤' };
    }
  }
  return { success:false, error:'找不到該活動' };
}

function handleLogin(data) {
  const loginId = (data.user_id || data.email || data.login_id || '').trim();
  const password = data.password||'';
  if (loginId===SUPER_ADMIN_EMAIL && password===SUPER_ADMIN_PASS){
    writeAudit('sheep','login','system','超管登入');
    return { success:true, user:{ user_id:'sheep', name:'超級管理員', email:SUPER_ADMIN_EMAIL, role:'super_admin', group_name:'行政組' } };
  }
  const ss=getSheet(); const sheet=ss.getSheetByName('Users'); if(!sheet) return { success:false, error:'Users sheet missing' };
  const rows=sheet.getDataRange().getValues(); const headers=rows[0];
  for(let i=1;i<rows.length;i++){
    const rowObj={}; headers.forEach((h,idx)=>{ rowObj[h]=rows[i][idx]; });
    if(rowObj.status==='inactive') continue;
    if(rowObj.user_id===loginId || rowObj.email===loginId){
      if(rowObj.password_hash===hashPassword(password) || rowObj.password_hash===password){
        writeAudit(loginId,'login','system','登入成功');
        // update last_login
        try{ const lastIdx=headers.indexOf('last_login'); if(lastIdx>=0) sheet.getRange(i+1,lastIdx+1).setValue(new Date()); }catch(e){}
        delete rowObj.password_hash; return { success:true, user:rowObj };
      } else return { success:false, error:'密碼錯誤' };
    }
  }
  return { success:false, error:'找不到用戶帳號或電郵' };
}

function getAllUsersRaw(includeInactive){
  const ss=getSheet(); const sheet=ss.getSheetByName('Users'); if(!sheet) return [];
  const rows=sheet.getDataRange().getValues(); const headers=rows[0]; const list=[];
  for(let i=1;i<rows.length;i++){
    const obj={}; headers.forEach((h,idx)=>{ obj[h]=rows[i][idx]; });
    if(!includeInactive && obj.status==='inactive') continue;
    if(obj.password_hash) delete obj.password_hash;
    // normalize
    obj.user_id=obj.user_id||obj.ymis||''; obj.can_tick=obj.can_tick===true||obj.can_tick==='TRUE'||obj.can_tick==='true';
    list.push(obj);
  }
  return list;
}

function handleBatchAddUsers(data){
  const users=data.users||[]; if(!Array.isArray(users)||!users.length) return { success:false, error:'users array required' };
  const ss=getSheet(); const sheet=ss.getSheetByName('Users'); if(!sheet) return { success:false, error:'Users sheet missing' };
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const idIdx=headers.indexOf('user_id'); const emailIdx=headers.indexOf('email');
  const existingIds=sheet.getLastRow()>1 ? sheet.getRange(2,idIdx+1,sheet.getLastRow()-1,1).getValues().map(r=>String(r[0]).trim()) : [];
  let added=0, dup=0, invalid=0;
  users.forEach(u=>{
    const uid=String(u.user_id||u.ymis||'').trim(); const name=String(u.name||'').trim();
    if(!uid||!name){ invalid++; return; }
    if(existingIds.indexOf(uid)>=0){ dup++; return; }
    const row=new Array(headers.length).fill('');
    function setCol(n,v){ const c=headers.indexOf(n); if(c>=0) row[c]=v===undefined?'':v; }
    setCol('user_id',uid); setCol('ymis',uid);
    setCol('name',name); setCol('email',u.email||''); setCol('role',u.role||'staff');
    setCol('group_name',u.group_name||u.group||'主題節目組'); setCol('contact',u.contact||'');
    if(u.password){ setCol('password_hash',hashPassword(u.password)); setCol('auth_by','bulk_onboard'); setCol('auth_date',new Date()); }
    else setCol('password_hash',hashPassword('1234'));
    setCol('can_tick',u.can_tick?'TRUE':'FALSE'); setCol('status',u.status||'active');
    setCol('allowed_modules',u.allowed_modules||'*'); setCol('squad',u.squad||''); setCol('squad_role',u.squad_role||'member');
    setCol('job_desc',u.job_desc||''); setCol('created_at',new Date());
    sheet.appendRow(row); existingIds.push(uid); added++;
    writeAudit('bulk','add_user',uid,'批量開戶 '+name);
  });
  return { success:true, added:added, dup:dup, invalid:invalid, message:'批量開戶完成：成功 '+added+' 重複 '+dup+' 無效 '+invalid };
}

function handleBatchSave(data){
  const changes=data.changes||[]; let processed=0;
  changes.forEach(ch=>{
    if(ch.action==='addRecord'){
      const res=saveRecord({module:ch.module,record:{title:ch.title,group_name:ch.group,description:ch.desc||''}}); if(res.success) processed++;
    }
  });
  return { success:true, processed:processed };
}

function getEventAllData(eventId) {
  const ss = getSheet(); const modules = ['Meetings','Staff','Documents','Finance','Activities','Meals','Schedule','Supplies','Supply_Requests','Vehicle_Passes','Users','SystemConfig']; const result={};
  modules.forEach(mod=>{
    const sheet=ss.getSheetByName(mod); if(!sheet || sheet.getLastRow()<=1){ result[mod]= mod==='SystemConfig'?{} : []; return; }
    const rows=sheet.getDataRange().getValues(); const headers=rows[0]; const dataList=[]; const eventIdIdx=headers.indexOf('event_id');
    for(let i=1;i<rows.length;i++){
      const obj={}; headers.forEach((h,idx)=>{ obj[h]=rows[i][idx]; });
      if(mod==='Users'){ if(obj.status==='inactive') continue; if(obj.password_hash) delete obj.password_hash; dataList.push(obj); continue; }
      if(mod==='SystemConfig'){ result[mod][obj.key]=obj.value; continue; }
      if(eventId && eventIdIdx!==-1 && obj.event_id && obj.event_id!==eventId) continue;
      if(obj.password_hash) delete obj.password_hash; dataList.push(obj);
    }
    if(mod!=='SystemConfig') result[mod]=dataList;
  });
  // reshape supplies
  if(result['Supplies'] && result['Supply_Requests']){
    result['supplies']={inventory:result['Supplies'],requests:result['Supply_Requests'],vehicle_passes:result['Vehicle_Passes']||[]};
  }
  // also keep vehicle_passes separate for backward compat
  if(result['Vehicle_Passes'] && !result['supplies'].vehicle_passes){
    if(!result['supplies']) result['supplies']={inventory:[],requests:[],vehicle_passes:[]};
    result['supplies'].vehicle_passes=result['Vehicle_Passes'];
  }
  return result;
}

function saveRecord(data) {
  const moduleName = data.module; const record = data.record||{};
  const ss = getSheet(); let sheet = ss.getSheetByName(moduleName);
  if (!sheet) return { success: false, error: 'Module sheet not found: '+moduleName };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idField = headers[0]; const recordId = record[idField] || (moduleName.toLowerCase().slice(0,3)+'_'+Date.now());
  record[idField]=recordId; if(!record.created_at) record.created_at=new Date();
  const rows = sheet.getDataRange().getValues(); let rowIndex=-1;
  for(let i=1;i<rows.length;i++){ if(String(rows[i][0])===String(recordId)){ rowIndex=i+1; break; } }
  const rowValues = headers.map(h=> record[h]!==undefined?record[h]:'');
  if(rowIndex>0) sheet.getRange(rowIndex,1,1,rowValues.length).setValues([rowValues]);
  else sheet.appendRow(rowValues);
  writeAudit(data.by||'system','save',moduleName+':'+recordId,'');
  return { success:true, id:recordId };
}
function deleteRecord(data){
  const moduleName=data.module; const recordId=data.id; const ss=getSheet(); const sheet=ss.getSheetByName(moduleName);
  if(!sheet) return { success:false, error:'Module sheet not found' };
  const rows=sheet.getDataRange().getValues(); for(let i=1;i<rows.length;i++){ if(String(rows[i][0])===String(recordId)){ sheet.deleteRow(i+1); writeAudit('system','delete',moduleName+':'+recordId,''); return { success:true }; } }
  return { success:false, error:'Record not found' };
}
function updateStatus(data){
  const moduleName=data.module; const recordId=data.id; const newStatus=data.status; const approver=data.approver||''; const ss=getSheet(); const sheet=ss.getSheetByName(moduleName);
  if(!sheet) return { success:false, error:'Module sheet not found' };
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]; const idIdx=0; const statusIdx=headers.indexOf('status'); const approverIdx=headers.indexOf('approved_by');
  const rows=sheet.getDataRange().getValues(); for(let i=1;i<rows.length;i++){ if(String(rows[i][idIdx])===String(recordId)){ const rowNum=i+1; if(statusIdx!==-1) sheet.getRange(rowNum,statusIdx+1).setValue(newStatus); if(approverIdx!==-1 && approver) sheet.getRange(rowNum,approverIdx+1).setValue(approver); writeAudit(approver,'approve',moduleName+':'+recordId,newStatus); return { success:true }; } }
  return { success:false, error:'Record not found' };
}
function sendMeetingEmailNotification(data){
  const meetingTitle=data.meeting_title||'第4次籌備委員會議'; const meetingDate=data.meeting_date||'2026-08-18 19:15'; const minLevel=data.min_level!==undefined?parseInt(data.min_level):30;
  const ss=getSheet(); const sheet=ss.getSheetByName('Users'); if(!sheet || sheet.getLastRow()<=1) return { success:false, error:'沒有找到任何委員' };
  const rows=sheet.getDataRange().getValues(); const headers=rows[0]; const emailIdx=headers.indexOf('email'); const nameIdx=headers.indexOf('name'); const roleIdx=headers.indexOf('role'); let count=0;
  for(let i=1;i<rows.length;i++){ const role=rows[i][roleIdx]; if(role==='super_admin') continue; const level=getRoleLevel(role); if(level<minLevel) continue; const email=rows[i][emailIdx]; const name=rows[i][nameIdx]; if(email && email.indexOf('@')!==-1){ try{ MailApp.sendEmail(email,'[童軍活動管理系統] 會議提醒：'+meetingTitle,'親愛的 '+name+' 委員：\n\n這是自動會議提示。\n\n會議：'+meetingTitle+'\n時間：'+meetingDate+'\n地點：香港童軍百周年紀念大樓 1704室\n\n請依時出席。\n\nCOPYRIGHT 2026'); count++; }catch(err){ Logger.log('Failed '+email+': '+err); } } }
  writeAudit('system','send_email','meeting','發送 '+count+' 封會議提醒');
  return { success:true, message:'成功向 '+count+' 位主任或以上委員發送會議提醒！' };
}
function getSystemConfig(){
  const ss=getSheet(); const sheet=ss.getSheetByName('SystemConfig'); if(!sheet) return {};
  const rows=sheet.getDataRange().getValues(); const cfg={};
  for(let i=1;i<rows.length;i++){ if(rows[i][0]) cfg[rows[i][0]]=rows[i][1]; }
  return cfg;
}
function updateSystemConfig(data){
  const key=data.key; const value=data.value; const by=data.by||'system';
  const ss=getSheet(); const sheet=ss.getSheetByName('SystemConfig'); if(!sheet) return { success:false, error:'SystemConfig sheet missing' };
  const rows=sheet.getDataRange().getValues(); for(let i=1;i<rows.length;i++){ if(rows[i][0]===key){ sheet.getRange(i+1,2).setValue(value); sheet.getRange(i+1,3).setValue(new Date()); sheet.getRange(i+1,4).setValue(by); writeAudit(by,'update_config',key,value); return { success:true }; } }
  sheet.appendRow([key,value,new Date(),by]); writeAudit(by,'add_config',key,value); return { success:true };
}
function deactivateUser(data){
  const uid=data.user_id||data.target_ymis; if(!uid) return { success:false, error:'user_id required' }; if(uid==='sheep') return { success:false, error:'不能停用超管' };
  const ss=getSheet(); const sheet=ss.getSheetByName('Users'); if(!sheet) return { success:false, error:'Users missing' };
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]; const idIdx=headers.indexOf('user_id'); const statusIdx=headers.indexOf('status');
  const rows=sheet.getDataRange().getValues(); for(let i=1;i<rows.length;i++){ if(String(rows[i][idIdx])===String(uid)){ sheet.getRange(i+1,statusIdx+1).setValue('inactive'); writeAudit(data.by||'system','deactivate',uid,'停用'); return { success:true }; } }
  return { success:false, error:'User not found' };
}
function resetPassword(data){
  const uid=data.user_id; const newPwd=data.new_password||'123456'; if(!uid) return { success:false, error:'user_id required' };
  const ss=getSheet(); const sheet=ss.getSheetByName('Users'); const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]; const idIdx=headers.indexOf('user_id'); const pwdIdx=headers.indexOf('password_hash');
  const rows=sheet.getDataRange().getValues(); for(let i=1;i<rows.length;i++){ if(String(rows[i][idIdx])===String(uid)){ sheet.getRange(i+1,pwdIdx+1).setValue(hashPassword(newPwd)); writeAudit(data.by||'system','reset_pwd',uid,'重設密碼'); return { success:true, temp_password:newPwd }; } }
  return { success:false, error:'User not found' };
}
function writeAudit(actor,action,target,detail){
  try{ const ss=getSheet(); const sheet=ss.getSheetByName('AuditLog'); if(!sheet) return; sheet.appendRow([new Date(),actor,action,target,detail||'']); }catch(e){}
}

function handleUploadFileToDriveFolder(data){
  // data: file_name, file_data (base64 or dataUrl), folder_id or folder_link, meeting_id, type, uploaded_by
  try{
    const fileName = data.file_name || ('file_'+Date.now());
    let fileDataBase64 = data.file_data || '';
    // remove data url prefix if present
    if(fileDataBase64.indexOf('base64,')>=0) fileDataBase64=fileDataBase64.split('base64,')[1];
    const mimeType = data.mime_type || 'application/octet-stream';
    // decode base64 to blob
    const blob = Utilities.newBlob(Utilities.base64Decode(fileDataBase64), mimeType, fileName);

    let folder = null;
    let folderId = data.folder_id || '';
    // try extract from folder_link if provided
    if(!folderId && data.folder_link){
      const link=data.folder_link;
      const m1=link.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      const m2=link.match(/[?&]id=([a-zA-Z0-9-_]+)/);
      const m3=link.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if(m1) folderId=m1[1];
      else if(m2) folderId=m2[1];
      else if(m3) folderId=m3[1];
      else if(link.length>20 && link.indexOf('http')===-1) folderId=link.trim(); // assume direct ID
    }
    // fallback: try get from SystemConfig
    if(!folderId){
      const cfg=getSystemConfig();
      if(cfg.meeting_folder_id) folderId=cfg.meeting_folder_id;
      else if(cfg.meeting_folder_link){
        const l=cfg.meeting_folder_link;
        const mm=l.match(/\/folders\/([a-zA-Z0-9-_]+)/);
        if(mm) folderId=mm[1];
      }
    }

    if(folderId){
      try{
        folder=DriveApp.getFolderById(folderId);
      }catch(e){
        // folder id invalid, try get by link as folder? fallback to root
        folder=null;
      }
    }
    if(!folder){
      // fallback: use root or create a folder named Meetings
      try{
        const folders=DriveApp.getFoldersByName('童軍會議文件');
        if(folders.hasNext()) folder=folders.next();
        else folder=DriveApp.createFolder('童軍會議文件');
      }catch(e){
        folder=null;
      }
    }

    let file;
    if(folder) file=folder.createFile(blob);
    else file=DriveApp.createFile(blob); // root

    // try set sharing to anyone with link viewable
    try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(e){}

    const fileUrl=file.getUrl();
    const fileId=file.getId();
    const viewUrl='https://drive.google.com/file/d/'+fileId+'/view';
    const downloadUrl='https://drive.google.com/uc?export=download&id='+fileId;

    writeAudit(data.uploaded_by||'system','upload_file',fileName,'folder:'+(folderId||'root')+' fileId:'+fileId);

    return {
      success:true,
      file_id:fileId,
      file_name:fileName,
      file_url:viewUrl,
      download_url:downloadUrl,
      folder_id:folderId||'',
      folder_url: folderId ? 'https://drive.google.com/drive/folders/'+folderId : '',
      message:'已上傳到指定資料夾'
    };
  }catch(err){
    return { success:false, error: err.toString(), stack: err.stack };
  }
}
