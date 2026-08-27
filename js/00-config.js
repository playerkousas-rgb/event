/* 00-config.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */

const ROLE_LABELS={'super_admin':'系統管理員','advisor':'顧問','admin':'管理員','chairperson':'主席','executive_vice_chairperson':'執行副主席','vice_chairperson':'副主席','general_director':'總主任','director':'主任','staff':'工作人員','public':'公開'};
const ROLE_HIERARCHY={'super_admin':100,'advisor':80,'admin':80,'chairperson':80,'executive_vice_chairperson':70,'vice_chairperson':60,'general_director':40,'director':30,'staff':20,'public':0};
// 統一清理組別名稱：移除「(Level X)」及多餘括號，並遷移舊稱「籌委會」。
function normalizeGroupName(value){
  let group=String(value||'').trim();
  group=group.replace(/\s*[（(]\s*Level\s*\d+\s*[）)]\s*$/i,'').trim();
  group=group.replace(/^[（(]+\s*/,'').replace(/\s*[）)]+$/,'').trim();
  if(group==='籌委會') return '主席及執行副主席';
  if(group==='管理') return '顧問團'; // Based on mock_demo.json mapping for 黃偉安 & 何家騏

  // Mapping abbreviations to standard names (especially from isd_2026.json)
  const map = {
    '典禮及會操': '會操及典禮組',
    '主題節目': '主題節目組',
    '品牌推廣': '品牌推廣組',
    '嘉賓接待': '嘉賓接待組',
    '協調': '協調組',
    '服務及發展': '服務及發展組',
    '行政': '行政組'
  };
  if(map[group]) return map[group];

  return group;
}
// 2026 架構固定組別（用戶確認：不會有新組，可能有新主任）
// 部門管理中心＝全部 10 組（含 顧問團、主席及執行副主席、秘書處，可查看/統計）
// 開戶/登記下拉提供 8 個組別：顧問團、主席及執行副主席不設一般開戶，其職級由管理員直接處理
const ORG_GROUPS=['顧問團','主席及執行副主席','秘書處','會操及典禮組','主題節目組','品牌推廣組','嘉賓接待組','協調組','服務及發展組','行政組'];
const ACCOUNT_GROUPS=['秘書處','會操及典禮組','主題節目組','品牌推廣組','嘉賓接待組','協調組','服務及發展組','行政組'];
function orgGroupOptions(selected){ return ACCOUNT_GROUPS.map(g=>`<option value="${g}" ${g===selected?'selected':''}>${g}</option>`).join(''); }
// 開戶職級：副主席及以上（副主席/執行副主席/主席/顧問）已全確定由管理員處理
// 一般總主任/主任開戶頁只提供以下三級；管理員（如秘書處受薪職員）可另開「管理員」級帳戶
const ACCOUNT_SETUP_ROLES=['general_director','director','staff'];
const ADMIN_ACCOUNT_SETUP_ROLES=['admin',...ACCOUNT_SETUP_ROLES];
function accountSetupRoleOptions(selected,isAdmin){ const roles=isAdmin?ADMIN_ACCOUNT_SETUP_ROLES:ACCOUNT_SETUP_ROLES; return roles.map(r=>`<option value="${r}" ${r===selected?'selected':''}>${ROLE_LABELS[r]||r}</option>`).join(''); }
function canSetupRole(role,isAdmin){ return (isAdmin?ADMIN_ACCOUNT_SETUP_ROLES:ACCOUNT_SETUP_ROLES).includes(role); }
// 權限卡片清單（= 用戶「可看到 / 可編輯」的內容卡片，上級授權給下級）
const PERM_CARDS=[
  {id:'announcements',label:'公告及溝通',icon:'fa-solid fa-bullhorn'},
  {id:'exec_manual',label:'執行手冊（組織架構·場地·典禮·危機·通告）',icon:'fa-solid fa-book'},
  {id:'apply_hub',label:'申請中心',icon:'fa-solid fa-file-pen'},
  {id:'schedule',label:'日程表',icon:'fa-solid fa-calendar-days'},
  {id:'activities',label:'場地與活動總覽',icon:'fa-solid fa-map-location-dot'},
  {id:'staff',label:'組織架構與聯絡',icon:'fa-solid fa-sitemap'},
  {id:'theme_badges',label:'活動主題章',icon:'fa-solid fa-award'},
  {id:'meals',label:'膳食管理',icon:'fa-solid fa-utensils'},
  {id:'documents',label:'通告及文件',icon:'fa-solid fa-file-shield'},
  {id:'unit_guide',label:'旅團須知',icon:'fa-solid fa-book-open'},
  {id:'ceremony',label:'典禮儀式',icon:'fa-solid fa-crown'},
  {id:'awards',label:'獲獎名單',icon:'fa-solid fa-trophy'},
  {id:'crisis',label:'危機處理',icon:'fa-solid fa-triangle-exclamation'},
  {id:'meetings',label:'會議卡片',icon:'fa-solid fa-handshake'},
  {id:'supplies',label:'物資+車輛',icon:'fa-solid fa-boxes-stacked'},
  {id:'oral_quotes',label:'口頭報價登記',icon:'fa-solid fa-file-signature'},
  {id:'finance',label:'財務管理',icon:'fa-solid fa-wallet'},
  {id:'admin_group',label:'行政組',icon:'fa-solid fa-building'},
  {id:'coordinator_group',label:'協調組',icon:'fa-solid fa-people-roof'},
  {id:'group_ceremony',label:'會操及典禮組',icon:'fa-solid fa-flag'},
  {id:'group_theme',label:'主題節目組',icon:'fa-solid fa-gamepad'},
  {id:'group_brand',label:'品牌推廣組',icon:'fa-solid fa-bullhorn'},
  {id:'group_reception',label:'嘉賓接待組',icon:'fa-solid fa-handshake-angle'},
  {id:'group_service',label:'服務及發展組',icon:'fa-solid fa-hands-holding-child'},
  {id:'donations',label:'童心捐贈大行動',icon:'fa-solid fa-hand-holding-heart'},
  {id:'group_secretariat',label:'秘書處',icon:'fa-solid fa-landmark'},
  {id:'group_advisors',label:'顧問團',icon:'fa-solid fa-user-tie'},
  {id:'group_leadership',label:'主席及執行副主席',icon:'fa-solid fa-crown'}
];
const PERM_IDS=new Set(PERM_CARDS.map(c=>c.id));
const PUBLIC_CARD_ORDER=['announcements','exec_manual','apply_hub','donations'];
const GROUP_CARD_IDS=new Set(['group_advisors','group_leadership','group_secretariat','group_ceremony','group_theme','group_brand','group_reception','coordinator_group','group_service','admin_group']);
const MANAGEMENT_TOOL_ORDER=['account_setup','approvals'];
function parsePerm(v){ if(Array.isArray(v)) return v; if(typeof v==='string'&&v.trim()){ try{ const a=JSON.parse(v); return Array.isArray(a)?a:[]; }catch(e){ return []; } } return undefined; }
function hasCjk(s){ return /[\u4e00-\u9fff]/.test(String(s||'')); }
function isLegacyLatinLogin(id){ const s=String(id||'').trim(); return !!s && !hasCjk(s); }
function nextChineseLoginId(name, used){
  const base=String(name||'').trim() || '未命名';
  const set=used instanceof Set ? used : new Set(used||[]);
  if(!set.has(base)) return base;
  let n=2; while(set.has(base+'-'+n)) n++;
  return base+'-'+n;
}
function migrateUsersToChineseLogin(list){
  const used=new Set();
  return (list||[]).map(u=>{
    const copy={...u};
    if(copy.role==='super_admin'){ used.add(copy.user_id); return copy; }
    if(isLegacyLatinLogin(copy.user_id)){
      copy.user_id=nextChineseLoginId(copy.name||copy.user_id, used);
    }
    used.add(copy.user_id);
    return copy;
  });
}
function loginIdMatches(u, id){
  if(!u||!id) return false;
  return u.user_id===id || u.email===id || u.name===id;
}
// 批核範疇（頁）：每類申請可分開設定批核組及執行組。
const APPROVAL_AREAS=[
  {id:'supplies',label:'物資申請',icon:'fa-solid fa-boxes-stacked',chip:'bg-blue-100 text-blue-700 border-blue-300',dot:'bg-blue-500'},
  {id:'vehicle',label:'車位／車輛申請',icon:'fa-solid fa-car',chip:'bg-amber-100 text-amber-700 border-amber-300',dot:'bg-amber-500'},
  {id:'meals',label:'膳食申請',icon:'fa-solid fa-utensils',chip:'bg-purple-100 text-purple-700 border-purple-300',dot:'bg-purple-500'},
  {id:'finance',label:'財務申請',icon:'fa-solid fa-wallet',chip:'bg-emerald-100 text-emerald-700 border-emerald-300',dot:'bg-emerald-500'}
];
// 多選路由預設：膳食由行政組批核、協調組執行及持有最後名單。
const APPROVAL_ROUTING_DEFAULTS={
  supplies:{approver_groups:['協調組'],executor_groups:['協調組']},
  vehicle:{approver_groups:['協調組'],executor_groups:['協調組']},
  meals:{approver_groups:['行政組'],executor_groups:['協調組']},
  finance:{approver_groups:['行政組'],executor_groups:['行政組']}
};
const APPROVAL_IDS=new Set(APPROVAL_AREAS.map(a=>a.id));
// 首頁 3 大類別活動卡
const EVENT_CATEGORIES=[
  {key:'isd',title:'港島童軍繽紛日',icon:'fa-solid fa-star',desc:'步操檢閱、頒獎典禮與攤位博覽',gradient:'from-brand-600 to-fuchsia-500'},
  {key:'trailwalk',title:'港島毅行',icon:'fa-solid fa-person-hiking',desc:'港島區步行籌款活動',gradient:'from-emerald-500 to-teal-500'},
  {key:'other',title:'其他大型活動',icon:'fa-solid fa-tent',desc:'其他大型露營、培訓及活動',gradient:'from-indigo-500 to-violet-600'},
  {key:'demo',title:'模擬示範版',icon:'fa-solid fa-flask',desc:'完整示範資料·本地沙盒：介紹展示用，改動不影響正式活動',gradient:'from-slate-500 to-slate-700'}
];
// 簡單卡片模式：卡片顯示所有資料。身份 (角色+組別) 由管理員批核，決定：
// - 看到什麼：minLevel / groups 達標才顯示該卡片 (minLevel 0 = 公開，所有人可見)
// - 修改什麼：editLevel / editGroups 達標才顯示「可修改」徽章，否則為「只讀」
// editLabel 顯示「誰可以修改」作提示
const DASH_CARD_DEFS=[
  // ── 公開資料 (所有人可見，無需登入) ──
  {id:'announcements',title:'公告及溝通',desc:'',icon:'fa-solid fa-bullhorn',cardClass:'bg-gradient-to-br from-sky-500 to-blue-600 text-white',iconClass:'bg-white/20 text-white',minLevel:0,editLevel:30,editLabel:'主任以上可發佈'},
  // 執行手冊：組織架構・場地與活動總覽・典禮儀式・危機處理・通告及文件 收埋一卡，內部分頁（如同申請中心）
  {id:'exec_manual',title:'執行手冊',desc:'',icon:'fa-solid fa-book',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:0,readOnly:true,editLabel:'公開可看'},
  {id:'apply_hub',title:'申請中心',desc:'',icon:'fa-solid fa-file-pen',cardClass:'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',iconClass:'bg-white/20 text-white',minLevel:0,editLevel:0,readOnly:true,editLabel:'公開可看'},
  {id:'schedule',title:'日程表',desc:'',icon:'fa-solid fa-calendar-days',cardClass:'bg-white border shadow-sm',iconClass:'bg-teal-100 text-teal-600',minLevel:0,editLevel:60,editLabel:'副主席以上可上傳',hideOnDashboard:true},
  {id:'activities',title:'場地與活動總覽',desc:'',icon:'fa-solid fa-map-location-dot',cardClass:'bg-white border shadow-sm',iconClass:'bg-rose-100 text-rose-600',minLevel:0,editLevel:30,editLabel:'主任/副主席以上可上傳',hideOnDashboard:true},
  {id:'staff',title:'組織架構與聯絡',desc:'',icon:'fa-solid fa-sitemap',cardClass:'bg-white border shadow-sm',iconClass:'bg-indigo-100 text-indigo-600',minLevel:0,editLevel:40,editGroups:['行政組'],editLabel:'行政組可管理',hideOnDashboard:true},
  {id:'theme_badges',title:'活動主題章',desc:'',icon:'fa-solid fa-award',cardClass:'bg-gradient-to-br from-purple-500 to-indigo-600 text-white',iconClass:'bg-white/20 text-white',minLevel:0,editLevel:60,editLabel:'副主席以上可更新',hideOnDashboard:true},
  // 膳食：申請入口在「申請中心」，管理在「協調組 → 膳食」，故不另設儀表板卡片
  {id:'meals',title:'膳食管理',desc:'',icon:'fa-solid fa-utensils',cardClass:'bg-white border shadow-sm',iconClass:'bg-purple-100 text-purple-600',minLevel:0,editLevel:60,editGroups:['膳食','協調','行政'],editLabel:'指定膳食執行組主任以上可管理',hideOnDashboard:true},
  {id:'crisis',title:'危機處理',desc:'',icon:'fa-solid fa-triangle-exclamation',cardClass:'bg-white border shadow-sm',iconClass:'bg-red-100 text-red-700',minLevel:0,editLevel:60,editLabel:'管理員/副主席以上可更新',hideOnDashboard:true},
  {id:'documents',title:'通告及文件',desc:'',icon:'fa-solid fa-file-shield',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:60,editGroups:['行政'],editLabel:'管理員/行政總主任以上可上傳',hideOnDashboard:true},
  {id:'unit_guide',title:'旅團須知',desc:'',icon:'fa-solid fa-book-open',cardClass:'bg-white border shadow-sm',iconClass:'bg-amber-100 text-amber-700',minLevel:0,editLevel:60,editLabel:'管理員/行政總主任以上可上傳',hideOnDashboard:true},
  {id:'ceremony',title:'典禮儀式',desc:'',icon:'fa-solid fa-crown',cardClass:'bg-gradient-to-br from-amber-500 to-orange-600 text-white',iconClass:'bg-white/20 text-white',minLevel:0,editLevel:60,editLabel:'管理員/副主席以上可更新',hideOnDashboard:true},
  {id:'awards',title:'獲獎名單',desc:'',icon:'fa-solid fa-trophy',cardClass:'bg-white border shadow-sm',iconClass:'bg-yellow-100 text-yellow-700',minLevel:0,editLevel:60,editLabel:'管理員/副主席以上可更新',hideOnDashboard:true},
  // ── 管理資料 (登入後按角色/組別解鎖) ──
  {id:'meetings',title:'會議卡片',desc:'',icon:'fa-solid fa-handshake',cardClass:'bg-white border shadow-sm',iconClass:'bg-sky-100 text-sky-600',minLevel:20,editLevel:80,editLabel:'管理員可管理'},
  // 物資+車輛：申請入口在「申請中心」，管理/批核在「協調組 → 物資 / 車輛通行證」，故不另設儀表板卡片
  {id:'supplies',title:'物資申請',desc:'',icon:'fa-solid fa-boxes-stacked',cardClass:'bg-white border shadow-sm',iconClass:'bg-blue-100 text-blue-600',minLevel:40,editLevel:40,editLabel:'總主任/副主席以上可申請·批核',hideOnDashboard:true},
  {id:'vehicle',title:'車輛通行證（含泊車證）',desc:'',icon:'fa-solid fa-car',cardClass:'bg-white border shadow-sm',iconClass:'bg-amber-100 text-amber-700',minLevel:40,groups:['協調組'],editLevel:40,editGroups:['協調組'],editLabel:'協調組可管理',hideOnDashboard:true,action:"app.openModule('parking')"},
  // 泊車證＝車輛通行證申請（同一件事），已併入「協調組 → 車輛通行證」，不另設卡片
  // 口頭報價：申請入口在「申請中心」，內容內嵌於財務卡片，故不另設儀表板卡片
  {id:'oral_quotes',title:'口頭報價登記',desc:'',icon:'fa-solid fa-file-signature',cardClass:'bg-white border shadow-sm',iconClass:'bg-indigo-100 text-indigo-700',minLevel:0,editLevel:40,editLabel:'總主任以上可登記',hideOnDashboard:true},
  {id:'finance',title:'財務管理',desc:'',icon:'fa-solid fa-wallet',cardClass:'bg-white border shadow-sm',iconClass:'bg-amber-100 text-amber-600',minLevel:40,groups:['行政組'],editLevel:60,editGroups:['行政組'],editLabel:'副主席以上批核',hideOnDashboard:true},
  {id:'admin_group',title:'行政組',desc:'',icon:'fa-solid fa-building',cardClass:'bg-white border shadow-sm',iconClass:'bg-emerald-100 text-emerald-700',minLevel:20,groups:['行政組'],editLevel:40,editGroups:['行政組'],editLabel:'行政組可管理'},
  {id:'coordinator_group',title:'協調組',desc:'',icon:'fa-solid fa-people-roof',cardClass:'bg-gradient-to-br from-orange-500 to-amber-600 text-white',iconClass:'bg-white/20 text-white',minLevel:20,groups:['協調組'],editLevel:40,editGroups:['協調組'],editLabel:'協調組可管理'},
  // 全部 10 個組別均有對應卡片；L2 或以上在監察／會議之後顯示自己的組別並標亮；L3 或以下只顯示共 3 張核心卡片。
  {id:'group_advisors',title:'顧問團',desc:'',icon:'fa-solid fa-user-tie',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['顧問團'],editLevel:80,editGroups:['顧問團'],editLabel:'顧問／管理員可管理',action:"app.openGroupManagement('顧問團')"},
  {id:'group_leadership',title:'主席及執行副主席',desc:'',icon:'fa-solid fa-crown',cardClass:'bg-white border shadow-sm',iconClass:'bg-amber-100 text-amber-700',minLevel:20,groups:['主席及執行副主席'],editLevel:70,editGroups:['主席及執行副主席'],editLabel:'主席／執行副主席可管理',action:"app.openGroupManagement('主席及執行副主席')"},
  {id:'group_ceremony',title:'會操及典禮組',desc:'',icon:'fa-solid fa-flag',cardClass:'bg-white border shadow-sm',iconClass:'bg-rose-100 text-rose-700',minLevel:20,groups:['會操及典禮組'],editLevel:40,editGroups:['會操及典禮組'],editLabel:'本組總主任以上可管理',action:"app.openGroupManagement('會操及典禮組')"},
  {id:'group_theme',title:'主題節目組',desc:'',icon:'fa-solid fa-gamepad',cardClass:'bg-white border shadow-sm',iconClass:'bg-fuchsia-100 text-fuchsia-700',minLevel:20,groups:['主題節目組'],editLevel:40,editGroups:['主題節目組'],editLabel:'本組總主任以上可管理',action:"app.openGroupManagement('主題節目組')"},
  {id:'group_brand',title:'品牌推廣組',desc:'',icon:'fa-solid fa-bullhorn',cardClass:'bg-white border shadow-sm',iconClass:'bg-sky-100 text-sky-700',minLevel:20,groups:['品牌推廣組'],editLevel:40,editGroups:['品牌推廣組'],editLabel:'本組總主任以上可管理',action:"app.openGroupManagement('品牌推廣組')"},
  {id:'group_reception',title:'嘉賓接待組',desc:'',icon:'fa-solid fa-handshake-angle',cardClass:'bg-white border shadow-sm',iconClass:'bg-teal-100 text-teal-700',minLevel:20,groups:['嘉賓接待組'],editLevel:40,editGroups:['嘉賓接待組'],editLabel:'本組總主任以上可管理',action:"app.openGroupManagement('嘉賓接待組')"},
  {id:'group_service',title:'服務及發展組',desc:'',icon:'fa-solid fa-hands-holding-child',cardClass:'bg-white border shadow-sm',iconClass:'bg-lime-100 text-lime-700',minLevel:20,groups:['服務及發展組'],editLevel:40,editGroups:['服務及發展組'],editLabel:'本組總主任以上可管理',action:"app.openGroupManagement('服務及發展組')"},
  {id:'group_secretariat',title:'秘書處',desc:'',icon:'fa-solid fa-landmark',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['秘書處'],editLevel:40,editGroups:['秘書處'],editLabel:'秘書處管理員可管理',action:"app.openGroupManagement('秘書處')"},
  {id:'donations',title:'童心捐贈大行動',desc:'',icon:'fa-solid fa-hand-holding-heart',cardClass:'bg-gradient-to-br from-rose-500 to-pink-600 text-white',iconClass:'bg-white/20 text-white',minLevel:0,editLevel:40,editGroups:['服務及發展組'],editLabel:'服務及發展組可管理',action:"app.openModule('donations')"},
  {id:'my_monitor',title:'我的監察 (全部申請批核)',desc:'',icon:'fa-solid fa-eye',cardClass:'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',iconClass:'bg-white/20 text-white',minLevel:20,readOnly:true,editLabel:'只讀監察',action:"app.openModule('my_monitor')"},
  {id:'approvals',title:'批核中心',desc:'',icon:'fa-solid fa-user-check',cardClass:'bg-white border shadow-sm',iconClass:'bg-rose-100 text-rose-600',minLevel:40,editLevel:40,editLabel:'總主任以上可批核',action:"app.switchTopTab('approvals')"},
  {id:'account_setup',title:'開戶',desc:'',icon:'fa-solid fa-user-plus',cardClass:'bg-white border shadow-sm',iconClass:'bg-teal-100 text-teal-700',minLevel:40,editLevel:40,editLabel:'總主任以上可開戶'},
  {id:'permissions',title:'權限管理',desc:'',icon:'fa-solid fa-key',cardClass:'bg-white border shadow-sm',iconClass:'bg-indigo-100 text-indigo-700',minLevel:40,editLevel:40,editLabel:'上級可授權給下級',hideOnDashboard:true}
];
const LS={gasUrl:'gas_url',apiKey:'api_key',currentUser:'current_user',currentEvent:'current_event',mockMode:'mock_mode',events:'event_events_v7',users:(eid)=>`event_users_v7_${eid}`,meetings:(eid)=>`event_meetings_v7_${eid}`,staff:(eid)=>`event_staff_v7_${eid}`,finance:(eid)=>`event_finance_v7_${eid}`,supplies:(eid)=>`event_supplies_v7_${eid}`,meals:(eid)=>`event_meals_v7_${eid}`,activities:(eid)=>`event_activities_v7_${eid}`,theme_badges:(eid)=>`event_theme_badges_v7_${eid}`,documents:(eid)=>`event_documents_v7_${eid}`,announcements:(eid)=>`event_announcements_v7_${eid}`,safety:(eid)=>`event_safety_v7_${eid}`,unit_guide:(eid)=>`event_unit_guide_v7_${eid}`,crisis:(eid)=>`event_crisis_v7_${eid}`,ceremony:(eid)=>`event_ceremony_v7_${eid}`,awards:(eid)=>`event_awards_v7_${eid}`,parking:(eid)=>`event_parking_v7_${eid}`,oral_quotes:(eid)=>`event_oral_quotes_v7_${eid}`,notifications:(eid,uid)=>`event_notifications_v7_${eid}_${uid}`,myMealOrders:(eid)=>`event_my_meal_orders_v7_${eid}`,pending:(eid)=>`event_pending_v7_${eid}`,config:(eid)=>`event_config_v7_${eid}`,schedule:(eid)=>`event_schedule_v7_${eid}`,participants:(eid)=>`event_participants_v7_${eid}`,approvalRouting:(eid)=>`event_approval_routing_v8_${eid}`,deletedRecords:(eid)=>`event_deleted_records_v8_${eid}`};
function todayISO(){return new Date().toISOString().split('T')[0];}
function escapeHtml(s){return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showToast(m,t=''){const e=document.getElementById('toast');e.textContent=m;e.className='toast show '+t;setTimeout(()=>e.className='toast',3500);}
function splitCSVLines(text){
  const lines=[]; let cur='', inQ=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"') inQ=!inQ;
    else if(ch==='\n' && !inQ){ if(cur.trim()||!lines.length) lines.push(cur.replace(/\r$/,'')); cur=''; continue; }
    cur+=ch;
  }
  if(cur.trim()) lines.push(cur.replace(/\r$/,''));
  return lines;
}
function parseCSV(text){let lines=splitCSVLines(text);while(lines.length&&!String(lines[0]||'').replace(/[",]/g,'').trim())lines.shift();if(!lines.length)return[];const headers=lines[0].split(',').map(h=>h.trim().replace(/^\"|\"$/g,''));const out=[];for(let i=1;i<lines.length;i++){const line=lines[i];if(!line.trim())continue;const cols=[];let cur='',inQ=false;for(let c=0;c<line.length;c++){const ch=line[c];if(ch==='\"')inQ=!inQ;else if(ch===','&&!inQ){cols.push(cur.trim().replace(/^\"|\"$/g,''));cur='';}else cur+=ch;}cols.push(cur.trim().replace(/^\"|\"$/g,''));const obj={};headers.forEach((h,idx)=>obj[h]=cols[idx]||'');out.push(obj);}return out;}
function downloadDataUrl(fileName,dataUrl){const a=document.createElement('a');a.href=dataUrl;a.download=fileName||'download';document.body.appendChild(a);a.click();a.remove();}
function fileToDataUrl(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}
