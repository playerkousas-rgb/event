// ===== 批量開戶 Apps Script（直接寫入主資料表版本） - 童軍活動管理系統 v6.0 =====
// 適用：你已有一份「我們的 Sheet」（即本活動系統後端所用的 Google Sheet），
//       想把成員一次過寫入其中的 Users 工作表，實現全前端以外的備用批量軌。
//
// 用法 (參考 scoutbadge 設計)：
//   1. 在 Google Sheets 新建試算表，檔案 > 匯入 > 上載 > 選取本機 CSV，選 data/users_template.csv
//   2. 擴充套件 > Apps Script，貼上本檔，儲存
//   3. 回到試算表，重新整理，出現「批量開戶」選單
//   4. 填好資料後：
//      - ✍️ 直接寫入主資料表：最快，不需後端，直接寫入主 Sheet（支援全新空白 Sheet）
//      - 📤 轉JSON並推送後端：逐列經本系統後端 batchAddUsers
//      - 📝 預覽JSON：檢查轉出的 JSON
//
// 欄位：ymis,name,email,role,group_name,contact,password,can_tick,allowed_modules,squad,squad_role,status,job_desc
//   ymis            ：必填，成員/用戶ID，建議 8-10 位數字或自訂ID (與 scoutbadge YMIS 同理)
//   name            ：必填，姓名
//   email           ：選填，Email (登入用)
//   role            ：必填，super_admin/advisor/admin/chairperson/vice_chairperson/general_director/director/staff/public
//   group_name      ：必填，組別，例如 主題節目組
//   contact         ：選填，電話
//   password        ：選填，有填則開立可登入帳號，以 SHA-256 雜湊儲存，與後端登入一致
//   can_tick        ：true/false，是否可批核
//   allowed_modules ：* 代表全部，或逗號分隔模組 meetings,staff,finance...
//   squad           ：小隊名稱
//   squad_role      ：member/隊長/副隊長
//   status          ：active/inactive/pending
//   job_desc        ：職務描述 / 備註
//
// 直接寫入的工作表結構與本系統後端 Users 工作表完全相同，支援全新 Sheet 自動建表頭。

var CONFIG = {
  BACKEND_URL: 'https://script.google.com/macros/s/你的部署ID/exec', // 本系統後端 doPost 網址 (推送後端時需要)
  APIKEY: '你的API_KEY', // 與 index.html /api/config 相同的 API Key
  MAIN_SHEET_ID: '你的主資料表ID', // 直接寫入主資料表時使用 (主 Sheet ID，網址 /d/.../ 間)
  USERS_SHEET: 'Users' // 主資料表內成員工作表名稱，預設 Users
};

var USERS_HEADER = ['user_id','name','email','role','group_name','contact','password_hash','can_tick','status','allowed_modules','squad','squad_role','job_desc','created_at','last_login','auth_by','auth_date'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('批量開戶')
    .addItem('✍️ 直接寫入主資料表 (全新Sheet支援)', 'writeToMainSheet')
    .addItem('📤 轉JSON並推送後端', 'pushToBackend')
    .addItem('📝 預覽JSON', 'previewJson')
    .addToUi();
}

function hashPassword(p) {
  if(!p) return '';
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, p, Utilities.Charset.UTF_8);
  return raw.map(function(b){return ('0' + (b & 0xFF).toString(16)).slice(-2);}).join('');
}

function readRows() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if(data.length<2) return [];
  var headers = data[0].map(function(h){return String(h).trim();});
  var rows=[];
  for(var i=1;i<data.length;i++){
    var obj={};
    headers.forEach(function(h,idx){ obj[h]=data[i][idx]; });
    if(obj.ymis||obj.user_id) rows.push(obj);
  }
  return rows;
}

function normalizeRow(r){
  var ymis = String(r.ymis||r.user_id||'').trim();
  return {
    user_id: ymis,
    name: String(r.name||'').trim(),
    email: String(r.email||'').trim(),
    role: String(r.role||'staff').trim(),
    group_name: String(r.group_name||r.group||'主題節目組').trim(),
    contact: String(r.contact||'').trim(),
    password: String(r.password||'').trim(),
    can_tick: ['true','1','yes','y','TRUE'].indexOf(String(r.can_tick||'').trim())>=0,
    allowed_modules: String(r.allowed_modules||r.allowed_badges||'*').trim(),
    squad: String(r.squad||'').trim(),
    squad_role: String(r.squad_role||'member').trim(),
    status: String(r.status||'active').trim(),
    job_desc: String(r.job_desc||r.note||'').trim()
  };
}

function toJson(rows){
  return rows.map(normalizeRow).filter(function(r){return r.user_id && r.name;});
}

function previewJson(){
  var json=toJson(readRows());
  var ui=SpreadsheetApp.getUi();
  ui.alert('將轉換 '+json.length+' 筆：\n\n'+JSON.stringify(json,null,2).slice(0,4000));
}

function pushToBackend(){
  var json=toJson(readRows());
  if(!json.length){ SpreadsheetApp.getUi().alert('沒有資料'); return; }
  var ok=0, fail=0, fails=[];
  json.forEach(function(m){
    var payload={action:'batchAddUsers',api_key:CONFIG.APIKEY,users:[m]};
    try{
      var res=UrlFetchApp.fetch(CONFIG.BACKEND_URL,{method:'post',contentType:'text/plain',payload:JSON.stringify(payload)});
      var d=JSON.parse(res.getContentText());
      if(d.success) ok++; else { fail++; fails.push(m.user_id+': '+(d.error||'失敗')); }
    }catch(e){ fail++; fails.push(m.user_id+': '+e.message); }
  });
  SpreadsheetApp.getUi().alert('推送完成：成功 '+ok+' 筆，失敗 '+fail+' 筆'+(fails.length?'\n\n'+fails.join('\n'):''));
}

function ensureUsersSheet(ss){
  var sh=ss.getSheetByName(CONFIG.USERS_SHEET);
  if(!sh){ sh=ss.insertSheet(CONFIG.USERS_SHEET); }
  var needsHeader=true;
  if(sh.getLastRow()>=1 && sh.getLastColumn()>=1){
    var firstRow=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(function(h){return String(h).trim();});
    if(firstRow.indexOf('user_id')>=0 || firstRow.indexOf('ymis')>=0) needsHeader=false;
  }
  if(needsHeader){
    sh.clearContents();
    sh.getRange(1,1,1,USERS_HEADER.length).setValues([USERS_HEADER]);
    sh.getRange(1,1,1,USERS_HEADER.length).setFontWeight('bold').setBackground('#0c4a6e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return {sh:sh, needsHeader:needsHeader};
}

function writeToMainSheet(){
  var json=toJson(readRows());
  if(!json.length){ SpreadsheetApp.getUi().alert('沒有資料'); return; }
  var ss=SpreadsheetApp.openById(CONFIG.MAIN_SHEET_ID);
  var info=ensureUsersSheet(ss);
  var sh=info.sh;
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(function(h){return String(h).trim();});
  var idCol=headers.indexOf('user_id'); if(idCol<0) idCol=headers.indexOf('ymis');
  if(idCol<0){ SpreadsheetApp.getUi().alert('主資料表找不到 user_id / ymis 欄位'); return; }
  var lastRow=sh.getLastRow();
  var existing=lastRow>1 ? sh.getRange(2,idCol+1,lastRow-1,1).getValues().map(function(r){return String(r[0]).trim();}) : [];
  var nowStr=Utilities.formatDate(new Date(),'Asia/Hong_Kong','yyyy-MM-dd HH:mm:ss');
  var added=0, dup=0, skipped=0;
  json.forEach(function(m){
    if(existing.indexOf(m.user_id)>=0){ dup++; return; }
    if(!m.user_id){ skipped++; return; }
    var row=new Array(headers.length).fill('');
    function set(name,val){ var c=headers.indexOf(name); if(c>=0) row[c]=(val===undefined?'':val); }
    set('user_id',m.user_id); set('ymis',m.user_id);
    set('name',m.name); set('email',m.email); set('role',m.role);
    set('group_name',m.group_name); set('contact',m.contact);
    if(m.password){ set('password_hash',hashPassword(m.password)); set('auth_by','bulk_onboard'); set('auth_date',nowStr); }
    set('can_tick',m.can_tick?'TRUE':'FALSE'); set('status',m.status||'active');
    set('allowed_modules',m.allowed_modules); set('squad',m.squad); set('squad_role',m.squad_role);
    set('job_desc',m.job_desc); set('created_at',nowStr);
    sh.appendRow(row); added++;
  });
  SpreadsheetApp.getUi().alert('寫入主資料表完成：新增 '+added+' 筆，略過重複 '+dup+' 筆'+(skipped?'，跳過無效 '+skipped+' 筆':'')+(info.needsHeader?'（已自動建立 Users 表頭）':''));
}
