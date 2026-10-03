/* Quick harness: load real config + app core in one eval scope and test contact-privacy matrix */
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const stub=`
var localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
var document={getElementById:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{},classList:{add:()=>{},remove:()=>{},toggle:()=>{}},setAttribute:()=>{}}),addEventListener:()=>{},body:{appendChild:()=>{}}};
var window={addEventListener:()=>{}};
var location={hash:''};
var navigator={};
var fetch=()=>Promise.reject(new Error('no net'));
function showToast(){}
`;
const files=['js/00-config.js','js/10-app-core.js','js/32-meetings.js'];
const code=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
eval(stub+code+`
globalThis.T={ScoutEventApp,ROLE_HIERARCHY,normalizeGroupName};
`);
const {ScoutEventApp}=T;
const app=Object.create(ScoutEventApp.prototype); // skip constructor (it touches later modules/DOM)

function as(user){ app.currentUser=user; }
const U={
  pub:null,
  staff_theme:{user_id:'陳子明',name:'陳子明',role:'staff',group_name:'主題節目組'},
  gd_coord:{user_id:'畢美儀',name:'畢美儀',role:'general_director',group_name:'協調組'},
  gd_admin:{user_id:'adm1',name:'行總',role:'general_director',group_name:'行政組'},
  vc_brand:{user_id:'vc1',name:'副主',role:'vice_chairperson',group_name:'品牌推廣組'},
  staff_admin:{user_id:'adm2',name:'行文',role:'staff',group_name:'行政組'},
  admin:{user_id:'a',name:'管',role:'admin',group_name:''},
  svc_staff:{user_id:'s',name:'服文',role:'staff',group_name:'服務及發展組'},
};

let pass=0,fail=0;
function ck(desc,got,want){ const ok=got===want; if(ok)pass++; else {fail++; console.log(`FAIL: ${desc} — got ${got}, want ${want}`);} }

// ── Rule 1: 危機應變小組電話 = 副主席及以上 only
as(U.pub);        ck('crisis phone public', app.canSeeCrisisTeamPhone(), false);
as(U.staff_theme);ck('crisis phone staff 主題', app.canSeeCrisisTeamPhone(), false);
as(U.gd_coord);   ck('crisis phone 協調總主任', app.canSeeCrisisTeamPhone(), false);
as(U.gd_admin);   ck('crisis phone 行政總主任', app.canSeeCrisisTeamPhone(), false);
as(U.vc_brand);   ck('crisis phone 副主席', app.canSeeCrisisTeamPhone(), true);
as(U.admin);      ck('crisis phone admin', app.canSeeCrisisTeamPhone(), true);
as({user_id:'m',role:'staff',group_name:'主題節目組',mock_admin:true}); ck('crisis phone mock_admin', app.canSeeCrisisTeamPhone(), true);

// ── Rule 2: 其他聯絡 = 本組 + 副主席以上 (+行政組全見 +模組負責組)
as(U.pub);        ck('public sees staff contact', app.canSeeContactInfo('主題節目組'), false);
as(U.staff_theme);ck('主題組員 see 主題組 contact', app.canSeeContactInfo('主題節目組'), true);
as(U.staff_theme);ck('主題組員 see 協調組 contact', app.canSeeContactInfo('協調組'), false);
as(U.staff_theme);ck('主題組員 see booth contact (負責組)', app.canSeeContactInfo('嘉賓接待組','booth'), true);
as(U.staff_theme);ck('主題組員 see vehicle contact? no', app.canSeeContactInfo('','vehicle'), false);
as(U.gd_coord);   ck('協調總主任 see vehicle contact (負責組)', app.canSeeContactInfo('主題節目組','vehicle'), true);
as(U.gd_coord);   ck('協調總主任 see supplies contact (負責組)', app.canSeeContactInfo('主題節目組','supplies'), true);
as(U.gd_coord);   ck('協調總主任 see 主題組 staff contact? no', app.canSeeContactInfo('主題節目組'), false);
as(U.svc_staff);  ck('服務組員 see donations contact (負責組)', app.canSeeContactInfo(null,'donations'), true);
as(U.svc_staff);  ck('服務組員 see lostfound contact? no', app.canSeeContactInfo(null), false);
as(U.gd_admin);   ck('行政 see anything', app.canSeeContactInfo('品牌推廣組'), true);
as(U.gd_admin);   ck('行政 see donations', app.canSeeContactInfo(null,'donations'), true);
as(U.staff_admin);ck('行政工作人員 see anything', app.canSeeContactInfo('主題節目組'), true);
as(U.vc_brand);   ck('副主席 see anything', app.canSeeContactInfo('主題節目組'), true);
as(U.admin);      ck('admin see anything', app.canSeeContactInfo('主題節目組'), true);
// 組別簡稱 normalize
as(U.staff_theme);ck('主題組員 see 「主題節目」abbr', app.canSeeContactInfo('主題節目'), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
