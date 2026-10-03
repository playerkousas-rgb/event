/* Render smoke test: verify masked/unmasked contact HTML per role */
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const stub=`
globalThis.__els={};
var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
var document={
  getElementById:(id)=>{ if(!__els[id]) __els[id]={innerHTML:'',classList:{toggle:()=>{},add:()=>{},remove:()=>{}}}; return __els[id]; },
  querySelectorAll:()=>[],
  createElement:()=>({style:{},classList:{add:()=>{},remove:()=>{},toggle:()=>{}},setAttribute:()=>{}}),
  addEventListener:()=>{}, body:{appendChild:()=>{}}
};
var window={addEventListener:()=>{}};
var location={hash:''};
var navigator={};
var fetch=()=>Promise.reject(new Error('no net'));
function showToast(){}
function confirm(){return true;}
function alert(){}
`;
const order=['00-config','10-app-core','11-news','20-accounts','21-activities','22-meals','23-sync','24-supplies','25-vehicle','26-monitor-apply','27-parking','28-oral-quotes','30-finance','31-staff','32-meetings','33-users','34-announcements','35-ceremony','36-crisis','37-coordinator','38-donations','39-lost-found','40-souvenir-stamps','41-roster-lists','42-import-2026','43-checkin-modal'];
const code=order.map(f=>fs.readFileSync(path.join(root,'js',f+'.js'),'utf8')).join('\n');
eval(stub+code+`
globalThis.T={ScoutEventApp,escapeHtml};
`);
const {ScoutEventApp}=T; const __els=globalThis.__els;
const app=Object.create(ScoutEventApp.prototype);
app.currentEvent={event_id:'mock_demo',title:'模擬示範版'};
app.eventData=JSON.parse(fs.readFileSync(path.join(root,'data/mock_demo.json'),'utf8'));
app.isDataFrozen=()=>false;

let pass=0,fail=0;
function ck(desc,cond){ if(cond)pass++; else {fail++; console.log('FAIL: '+desc);} }

// ── Crisis team phone: public → locked; 副主席 → visible
app.currentUser=null;
app.renderCrisisTeam();
let html=__els['crisis-tab-team'].innerHTML;
ck('public crisis team: lock shown', html.includes('副主席以上可見'));
ck('public crisis team: no raw phone', !/font-mono" data-label="電話">\d{4}/.test(html));
ck('public crisis team: 姓名 kept', html.includes('data-label="姓名"') && !html.includes('暫無成員'));

app.currentUser={user_id:'vc',name:'副主',role:'vice_chairperson',group_name:'品牌推廣組'};
app.renderCrisisTeam();
html=__els['crisis-tab-team'].innerHTML;
ck('副主席 crisis team: phone visible', /data-label="電話">\s*[^<]*\d{3}/.test(html));
ck('副主席 crisis team: no lock', !html.includes('副主席以上可見</span>'));

// ── Staff contacts: 主題節目組員工 sees own group only
app.currentUser={user_id:'陳子明',name:'陳子明',role:'staff',group_name:'主題節目組'};
app.renderStaffContacts();
app.filterStaffContacts();
html=__els['staff-contacts-tbody'].innerHTML;
const hasLock=html.includes('本組＋副主席以上可見')||html.includes('登入可見');
ck('主題組員 contacts: some rows locked', hasLock);
ck('主題組員 contacts: own group phone raw', /font-mono text-sky-700" data-label="電話"><span class="">\d{8}/.test(html)||html.includes('95211111'));

// 行政組 sees all
app.currentUser={user_id:'行總',name:'行總',role:'general_director',group_name:'行政組'};
app.filterStaffContacts();
html=__els['staff-contacts-tbody'].innerHTML;
ck('行政 contacts: no locks', !html.includes('本組＋副主席以上可見'));

// ── Vehicle list: 協調組 sees driver phone (module owner), 主題組員工 locked
app.getSuppliesData=()=>({vehicle_passes:[{pass_id:'v1',plate:'AB1234',driver_name:'陳車手',driver_contact:'91234567',vehicle_type:'私家車',purpose:'運物資',group_name:'主題節目組',entry_date:'2026-10-04',exit_date:'2026-10-04',parking_location:'P1',status:'approved',requested_by:'申請人甲'}],requests:[],booth_requests:[],supplies:[]});
app.canApproveArea=()=>false; app.canExecuteArea=()=>true; app.canManageApprovalRouting=()=>false; app.canManageAreaOperations=()=>false; app.canSubmitSupply=()=>true;
app.applicationStageHTML=()=>''; app.canConfirmApplication=()=>false; app.applicationReadyForApproval=()=>false;
app.currentUser={user_id:'陳子明',name:'陳子明',role:'staff',group_name:'主題節目組'};
app.renderSuppliesVehicle();
html=__els['supplies-tab-vehicle'].innerHTML;
ck('主題組員 vehicle: own group phone visible', html.includes('91234567'));
app.currentUser={user_id:'禮文',name:'禮文',role:'staff',group_name:'嘉賓接待組'};
app.renderSuppliesVehicle();
html=__els['supplies-tab-vehicle'].innerHTML;
ck('嘉賓組員 vehicle: phone locked', html.includes('本組＋副主席以上可見')&&!html.includes('91234567'));
app.currentUser={user_id:'畢美儀',name:'畢美儀',role:'general_director',group_name:'協調組'};
app.renderSuppliesVehicle();
html=__els['supplies-tab-vehicle'].innerHTML;
ck('協調總主任 vehicle: phone visible (負責組)', html.includes('91234567'));

// ── Accident detail phones
app.currentUser=null;
__els['crisis-tab-accident']={innerHTML:'',classList:{toggle:()=>{},add:()=>{},remove:()=>{}}};
app.renderCrisisAccidents();
html=__els['crisis-tab-accident'].innerHTML;
ck('public accident: phone locked', html.includes('副主席以上可見'));
ck('public accident: no victim phone raw', !html.includes('2890 1234'));
app.currentUser={user_id:'行總',name:'行總',role:'general_director',group_name:'行政組'};
app.renderCrisisAccidents();
html=__els['crisis-tab-accident'].innerHTML;
ck('行政 accident: victim phone visible', html.includes('2890 1234'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
