/* Smoke test: call every edited render path with different users; flag runtime errors */
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const stub=`
globalThis.__els={};
var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
var document={
  getElementById:(id)=>{ if(!globalThis.__els[id]) globalThis.__els[id]={innerHTML:'',value:'',files:[],textContent:'',className:'',classList:{toggle:()=>{},add:()=>{},remove:()=>{}}}; return globalThis.__els[id]; },
  querySelectorAll:()=>[],
  createElement:()=>({style:{},classList:{add:()=>{},remove:()=>{},toggle:()=>{}},setAttribute:()=>{},click:()=>{}}),
  addEventListener:()=>{}, body:{appendChild:()=>{}}
};
var window={addEventListener:()=>{}, open:()=>({document:{write:()=>{},close:()=>{},open:()=>{}}}), print:()=>{}, location:{origin:'https://x.c',pathname:'/',hash:''}};
var location={hash:''};
var navigator={};
var fetch=()=>Promise.reject(new Error('no net'));
function showToast(){}
function confirm(){return true;}
function alert(){}
var URLS=globalThis.URL;
`;
const order=['00-config','10-app-core','11-news','20-accounts','21-activities','22-meals','23-sync','24-supplies','25-vehicle','26-monitor-apply','27-parking','28-oral-quotes','30-finance','31-staff','32-meetings','33-users','34-announcements','35-ceremony','36-crisis','37-coordinator','38-donations','39-lost-found','40-souvenir-stamps','41-roster-lists','42-import-2026','43-checkin-modal'];
const code=order.map(f=>fs.readFileSync(path.join(root,'js',f+'.js'),'utf8')).join('\n');
eval(stub+code+`\nglobalThis.T={ScoutEventApp};`);
const {ScoutEventApp}=T;
const __els=globalThis.__els;
const app=Object.create(ScoutEventApp.prototype);
app.currentEvent={event_id:'mock_demo',title:'模擬示範版'};
app.eventData=JSON.parse(fs.readFileSync(path.join(root,'data/mock_demo.json'),'utf8'));
app.isDataFrozen=()=>false;

// Seed supplies/vehicles/booth/quotes data with contacts
app.getSuppliesData=()=>({
  vehicle_passes:[{pass_id:'v1',plate:'AB1234',driver_name:'陳車手',driver_contact:'91234567',vehicle_type:'私家車',purpose:'運物資',group_name:'主題節目組',entry_date:'2026-10-04',exit_date:'2026-10-04',parking_location:'P1',status:'approved',requested_by:'申請人甲',created_at:'2026-09-01'}],
  requests:[{request_id:'r1',item_name:'帳篷',qty_requested:2,qty_approved:2,unit:'頂',group_name:'主題節目組',reason:'遮陰',date_needed:'2026-10-04',contact:'98765432',requested_by:'申請人甲',status:'pending',created_at:'2026-09-01'}],
  booth_requests:[{request_id:'b1',zone:'A',booth_no:'01',unit_name:'港島第1旅',booth_name:'測試攤位',group_name:'主題節目組',owner_name:'攤主',owner_phone:'95556666',owner_email:'a@b.c',requested_by:'申請人甲',contact:'98765432',status:'pending',created_at:'2026-09-01'}],
  supplies:[]
});
app.getParkingData=()=>({checklist:{vehicles:[{plate:'ZZ9',driver_name:'外部司機',contact:'91112222',group_name:'嘉賓接待組',unit:'校巴',park_date:'4/10'}]}});
app.getQuotesData=()=>({quotes:[{oral_id:'q1',quote_date:'2026-09-01',group_name:'主題節目組',vendor:'文具公司',contact_person:'陳老闆',contact_phone:'27777777',item_desc:'文具',amount:500,quoted_by:'記人',created_at:'2026-09-01'}]});
app.getDonationsData=()=>({goods:[{id:'g1',scout_group:'港島第99旅',leader_name:'李領袖',leader_position:'團長',leader_phone:'93333333',leader_email:'l@x.c',date:'2026-09-01',items:[{name:'玩具',quantity:3}]}],food:[{id:'f1',scout_group:'港島第88旅',leader_name:'王領',leader_phone:'94444444',leader_email:'w@x.c',date:'2026-09-01',items:[{name:'餅',quantity:2}]}]});
app.getLostFoundData=()=>({records:[{id:'lf1',type:'found',found_date:'2026-10-04',item_name:'銀包',found_location:'舞台',found_by:'路人甲',contact:'90001111',status:'待認領',notes:'',created_at:'2026-10-04T10:00'}]});
app.getActivitiesData=()=>({booths:[{id:'bt1',booth_number:'A01',booth_name:'試攤',location:'操場',group_name:'主題節目組',theme:'科學',game_type:'遊戲',responsible:'負責人甲',contact:'97777777',description:''}]});
app.getOralQuotesData=app.getQuotesData;
app.canApproveArea=()=>true; app.canExecuteArea=()=>true; app.canManageApprovalRouting=()=>false; app.canManageAreaOperations=()=>false; app.canSubmitSupply=()=>true;
app.applicationStageHTML=()=>''; app.canConfirmApplication=()=>false; app.applicationReadyForApproval=()=>true; app.approvalRouteLabel=()=> '協調組';
app.activitiesSubTab='booths';

const users=[
  ['public',null],
  ['staff 主題節目組',{user_id:'陳子明',name:'陳子明',role:'staff',group_name:'主題節目組'}],
  ['staff 嘉賓接待組',{user_id:'禮文',name:'禮文',role:'staff',group_name:'嘉賓接待組'}],
  ['總主任 協調組',{user_id:'畢美儀',name:'畢美儀',role:'general_director',group_name:'協調組'}],
  ['副主席',{user_id:'vc',name:'副主',role:'vice_chairperson',group_name:'品牌推廣組'}],
];
const tasks=[
  ['renderCrisisModule',a=>a.renderCrisisModule()],
  ['renderStaffContacts',a=>a.renderStaffContacts()],
  ['renderSuppliesVehicle',a=>a.renderSuppliesVehicle()],
  ['renderParkingModule',a=>a.renderParkingModule()],
  ['printVehiclePassTable',a=>a.printVehiclePassTable()],
  ['renderBoothSignboardHTML',a=>{const h=a.renderBoothSignboardHTML(!a.currentUser); if(!h.includes('table')) throw new Error('empty sign html');}],
  ['renderBoothMasterTableHTML',a=>{const h=a.renderBoothMasterTableHTML({rows:{}},!a.currentUser); if(h.length<100) throw new Error('empty master html');}],
  ['renderBoothPlanListHTML',a=>{const h=a.renderBoothPlanListHTML(!a.currentUser); if(h.length<50) throw new Error('empty plan html');}],
  ['renderCoordSupplies',a=>a.renderCoordSupplies({innerHTML:''})],
  ['renderCoordVehicles',a=>a.renderCoordVehicles({innerHTML:''})],
  ['renderOralQuotesModule',a=>a.renderOralQuotesModule()],
  ['renderFinanceModule',a=>a.renderFinanceModule()],
  ['renderDonationsModule',a=>a.renderDonationsModule()],
  ['lostFoundTableHTML',a=>{const h=a.lostFoundTableHTML('found'); if(!h.includes('銀包')) throw new Error('lost-found empty');}],
  ['boothMasterPanelHTML',a=>{const h=a.boothMasterPanelHTML(); if(!h.includes('A01')) throw new Error('booth panel empty');}],
  ['renderActivitiesBooths',a=>a.renderActivitiesBooths()],
  ['renderCrisisContacts',a=>a.renderCrisisContacts()],
  ['printAccidentReport',a=>a.printAccidentReport((a.getCrisisData().accidents||[])[0]?.id)],
];

let pass=0,fail=0;
for(const [ulabel,u] of users){
  app.currentUser=u;
  for(const [name,fn] of tasks){
    try{ fn(app); pass++; }
    catch(e){ fail++; console.log(`FAIL [${ulabel}] ${name}: ${e.message}`); }
  }
}
// Direct assertions on quote masking (quotes already 總主任以上自己才可見；本組總主任要見到本組電話)
app.currentUser={user_id:'龍正謙',name:'龍正謙',role:'general_director',group_name:'主題節目組'};
let ghtml=app.renderGroupQuotesTabHTML('主題節目組');
if(!ghtml.includes('27777777')){ fail++; console.log('FAIL: 主題總主任 should see own-group quote phone'); } else pass++;
// 職務大綱 tab renders for a foreign member would not even list the record (existing rule); lock badge helper sanity:
app.currentUser=users[2][1]; // 嘉賓 staff
const lockSample=app.contactLockHTML();
if(!lockSample.includes('fa-lock')){ fail++; console.log('FAIL: contactLockHTML missing lock icon'); } else pass++;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
