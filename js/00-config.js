/* 00-config.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */

const ROLE_LABELS={'super_admin':'系統管理員','advisor':'顧問','admin':'管理員','chairperson':'主席','executive_vice_chairperson':'執行副主席','vice_chairperson':'副主席','general_director':'總主任','director':'主任','staff':'工作人員','public':'公開'};
const ROLE_HIERARCHY={'super_admin':100,'advisor':80,'admin':80,'chairperson':80,'executive_vice_chairperson':70,'vice_chairperson':60,'general_director':40,'director':30,'staff':20,'public':0};
/* ── 後端（Google Apps Script）預設連線 v8.13 ─────────────────────────────────
   以前 GAS 網址只由 /api/config（Vercel serverless function）提供，前端初值是空字串。
   一旦 /api/config 失敗（Vercel 回 400／500、環境變數未設、函式未部署），gasUrl 就變 '' →
   mockMode 變 true → 所有只存在後端嘅帳戶（最高層管理帳號等）永遠登入唔到，畫面只會出「登入失敗」，
   好難對症。故改為：前端內建同一組預設值做底，/api/config 只做「可選覆寫」，
   就算 /api/config 死咗，後端連線都唔會斷。（可在「系統設定」自行覆寫，存 localStorage） */
const DEFAULT_GAS_URL='https://script.google.com/macros/s/AKfycbwT1dZuvymSVaHrBmW31RcnKxWoNHSabRnJVxIkPCevlHvIsPVYJFBDjgwhPS5t_ZQ8mw/exec';
const DEFAULT_API_KEY='scout_e6451624b1f340078ec6a111';
// 統一清理組別名稱：移除「(Level X)」及多餘括號，並遷移舊稱「籌委會」。
function normalizeGroupName(value){
  let group=String(value||'').trim();
  group=group.replace(/\s*[（(]\s*Level\s*\d+\s*[）)]\s*$/i,'').trim();
  group=group.replace(/^[（(]+\s*/,'').replace(/\s*[）)]+$/,'').trim();
  if(group==='籌委會') return '主席及執行副主席';
  if(group==='管理') return '顧問團'; // Based on mock_demo.json mapping for 黃偉安 & 何家騏
  if(group==='行政') return '行政組'; // prevent duplicate fake admin

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
/* ── v8.9 組織架構崗位正規化（修「部門中心 崗位／人數 ×2」復發）──────────────────
   JSON 種子與「Drive 架構圖同步」係兩個來源，同一崗位嘅字串可以有：
   • 換行／Tab／全形空格（Google Sheet 合併儲存格：「副主席\n（會操及典禮）」）
   • 括號全形／半形混用（「總主任(會操)」vs「總主任（會操）」）
   • 人名分隔符唔同（「甲 乙」／「甲、乙」／「甲/乙」）
   v8.6 嘅去重 key 用「原文 trim()」，以上變體全部對唔返 → 同一崗位各計一次 →
   主頁部門卡與部門管理中心嘅「N 崗位 · M 人」翻倍（人數亦因名字格式唔同而虛增）。
   故去重／比對一律用下面嘅正規化 key（只影響比對，唔改儲存嘅原文，畫面仍顯示 Drive 版原字）。 */
function normalizeOrgText(value){
  return String(value||'')
    .replace(/[\r\n\t\u3000]+/g,'')
    .replace(/\s+/g,'')
    .replace(/[（]/g,'(').replace(/[）]/g,')')
    .replace(/[【]/g,'[').replace(/[】]/g,']')
    .replace(/[：]/g,':').replace(/[；]/g,';')
    .replace(/[，、,／]/g,'/')
    .replace(/[\-–—_·・．.]/g,'')
    .replace(/\(level\s*\d+\)/gi,'')
    .toLowerCase();
}
// 人名欄：拆開任何分隔符（含空格／換行）、逐個正規化、排序後先做 key（順序唔同都算同一組人）
function orgNamesKey(names){
  return String(names||'').split(/[\r\n\t\u3000 ,，、/／;｜|]+/).map(s=>normalizeOrgText(s)).filter(Boolean).sort().join('|');
}
// 崗位唯一 key ＝ 組別 | 職位 | 人名（三者正規化後相同即視為同一崗位）
function orgNodeKey(node){
  if(!node) return '';
  const g=normalizeOrgText(node.group||'')||(typeof node.level==='string'?normalizeOrgText(node.level.split('(')[0]):'');
  return g+'|'+normalizeOrgText(node.title)+'|'+orgNamesKey(node.names);
}
// 拆人名：主頁部門卡、部門管理中心、組織架構樹形圖共用同一個口徑
// （含換行 —— Google Sheet 儲存格常以換行分隔多人，以前只用「、/，」會把「甲\n乙」計成 1 人）
function orgNameList(names){ return String(names||'').split(/[\r\n\t、，,/／]+/).map(x=>x.trim()).filter(Boolean); }
// 去重（Drive 架構圖／JSON 種子／本機快取三邊共用）：
// · key 用正規化結果，所以「換行、半全形括號、人名分隔符、多餘空格」都唔會再令同一崗位計兩次
// · 屬空人名嘅行（懸空缺）各別計，唔會因為「未填人」而被誤刪
// · preferFn(新行, 已存行) 決定保留邊份（預設保留先入嘅一份）
function dedupeOrgNodes(nodes, preferFn, keepOriginal){
  const at=new Map(), out=[], emptySeq={};
  (nodes||[]).forEach(n=>{
    if(!n) return;
    let k=orgNodeKey(n);
    if(!orgNamesKey(n.names)){ const c=emptySeq[k]||0; emptySeq[k]=c+1; k=k+'#vacancy'+c; }
    const idx=at.get(k);
    if(idx===undefined){ at.set(k,out.length); out.push(n); return; }
    if(keepOriginal) return;                       // 只刪重複行，保留原物件
    const cur=out[idx];
    const better=!preferFn||preferFn(n,cur);
    if(better) out[idx]={...cur,...n,desc:n.desc||cur.desc,id:cur.id};
  });
  return out;
}
// 同一次同步內嘅防呆：完全相同 key 只計一次（架構圖合併儲存格偶發重複解出）
function uniqOrgNodesBy(nodes){ return dedupeOrgNodes(nodes, null, true); }
// 職務大綱／聯絡名單嘅重複偵測（v8.9）：上傳同一檔兩次、或 Drive 重覆同步，
// 都會令「點入部門管理中心後嘅內容」出現兩次（職務大綱、本組崗位清單）——舊版只喺 org_chart 去重。
function dutyKey(d){ return normalizeOrgText(d&&d.group||'')+'|'+normalizeOrgText((d&&(d.duty||d.description))||''); }
// 冇人名嘅聯絡列通常係「空缺」（isd_2026 有兩行「步操統籌主任」name 空白＝兩個缺），
// 所以 name 空時回傳空字串，令去重跳過呢啲行（dedupeByKey 見 key 屬空即視為唯一）。
function contactKey(c){
  const nm=normalizeOrgText(c&&c.name||'');
  if(!nm) return '';
  return nm+'|'+normalizeOrgText((c&&(c.group_name||c.group))||'')+'|'+normalizeOrgText((c&&(c.role_title||c.role))||'');
}
// 通用去重：同 key 只留一份（betterFn 決定保留邊份，預設留先入嗰份）；id 一律保留舊行 id 俾快取對得返
function dedupeByKey(list, keyOf, betterFn){
  const at=new Map(), out=[];
  (list||[]).forEach(x=>{
    if(!x) return;
    const k=keyOf(x);
    if(!k){ out.push(x); return; }   // 無 key（例如空缺列）＝永遠視為獨立行
    const i=at.get(k);
    if(i===undefined){ at.set(k,out.length); out.push(x); return; }
    const cur=out[i];
    if(!betterFn||betterFn(x,cur)) out[i]={...cur,...x,id:cur.id};
  });
  return out;
}
// 職務大綱特例：同一組內若一份內容完全包含另一份（重送檔案最常見），只保留較齊嗰份
function dropContainedDuties(duties){
  const arr=(duties||[]).map(d=>d?{...d,__n:normalizeOrgText(d.duty||d.description||'')}:null).filter(Boolean);
  return arr.filter((d,i)=>{
    if(!d.__n) return arr.filter(x=>x!==d&&x.group===d.group).length===0;   // 冇內容嘅空行：同組有其他行就唔顯示
    return !arr.some((x,j)=>j!==i&&x.group===d.group&&x.__n.length>d.__n.length&&x.__n.includes(d.__n));
  }).map(({__n,...d})=>d);
}
// v8.9 穩定 id：由正規化 key 推出（同一崗位无论如何同步都係同一個 id），
// 令「本機快取 ↔ JSON 種子」按 id 就對得返，唔再靠落後嘅 append（＝以前翻倍嘅根源）。
function orgStableId(node){
  const k=orgNodeKey(node)||('row'+Math.random());
  let h1=0, h2=0;
  for(let i=0;i<k.length;i++){ const c=k.charCodeAt(i); h1=(h1*31+c)>>>0; h2=(h2*17+c*7+13)>>>0; }
  return 'org_'+h1.toString(36)+h2.toString(36);
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
/* 多選路由預設 v8.14（用戶定案 2026-08-31）：
   膳食／物資／車 → 協調組；攤位 → 主題節目組；財務 → 行政組；
   行政組「統管申請中心」，所以每類申請都加埋行政組做批核／執行組。 */
const APPROVAL_ROUTING_DEFAULTS={
  supplies:{approver_groups:['協調組','行政組'],executor_groups:['協調組','行政組']},
  vehicle:{approver_groups:['協調組','行政組'],executor_groups:['協調組','行政組']},
  meals:{approver_groups:['協調組','行政組'],executor_groups:['協調組','行政組']},
  finance:{approver_groups:['行政組'],executor_groups:['行政組']},
  // 攤位計劃書獨立一條路由（唔再跟物資用 supplies）：歸主題節目組，行政組亦可管
  booth:{approver_groups:['主題節目組','行政組'],executor_groups:['主題節目組','行政組']}
};
// v8.14：路由預設改咗，舊 localStorage 快取要清一次（用版本旗標，只做一次）
const APPROVAL_ROUTING_VERSION='v8.14';
/* ── v8.14 卡片「負責組別」──────────────────────────────────────────────────
   用戶定案：執行手冊／申請中心 歸行政組；膳食・物資・車 歸協調組；攤位 歸主題節目組；
   童心捐贈 歸服務及發展組；會議卡片 歸秘書處 —— 行政組「統管全站」，任何卡都可以管。
   組內要「主任（30）」以上先可以改（CARD_OWNER_MIN_LEVEL）。 */
const CARD_OWNER_GROUPS={
  exec_manual:['行政組'],
  apply_hub:['行政組'],
  documents:['行政組'],
  activities:['行政組'],
  ceremony:['行政組'],
  crisis:['行政組'],
  schedule:['行政組'],
  unit_guide:['行政組'],
  meals:['協調組'],
  supplies:['協調組'],
  vehicle:['協調組'],
  parking:['協調組'],
  booth:['主題節目組'],
  donations:['服務及發展組'],
  meetings:['秘書處']
};
const CARD_OWNER_MIN_LEVEL=30;   // 負責組內要主任（30）以上先可以改
// v8.14d：呢啲角色「唔理邊一組」都可以改呢張卡（一樣要主任級以上）
//   執行手冊 → 總主任（自己部門相關項目自己改，唔使吓吓經行政組）
//   會議卡片 → 副主席・總主任（要將部門報告／會議文件上傳）
const CARD_OWNER_EXTRA_ROLES={
  // 執行手冊系列：副主席・總主任都可以自己改部門相關項目（唔使吓吓經行政組）
  exec_manual:['general_director','vice_chairperson'],
  activities:['general_director','vice_chairperson'],
  documents:['general_director','vice_chairperson'],
  ceremony:['general_director','vice_chairperson'],
  crisis:['general_director','vice_chairperson'],
  // 會議卡片：副主席・總主任要將部門報告／會議文件上傳
  meetings:['general_director','vice_chairperson']
};
const APPROVAL_IDS=new Set(APPROVAL_AREAS.map(a=>a.id));
// 首頁 3 大類別活動卡
const EVENT_CATEGORIES=[
  {key:'isd',title:'港島童軍繽紛日',icon:'fa-solid fa-star',desc:'步操檢閱、頒獎典禮與攤位博覽',gradient:'from-brand-600 to-fuchsia-500'},
  {key:'trailwalk',title:'港島毅行',icon:'fa-solid fa-person-hiking',desc:'港島區步行籌款活動',gradient:'from-emerald-500 to-teal-500'},
  {key:'other',title:'其他大型活動',icon:'fa-solid fa-tent',desc:'其他大型露營、培訓及活動',gradient:'from-indigo-500 to-violet-600'},
  {key:'demo',title:'模擬示範版',icon:'fa-solid fa-flask',desc:'完整示範資料·供試用體驗：改動只會暫存喺你部電話／電腦，唔會影響正式活動',gradient:'from-slate-500 to-slate-700'}
];
// 簡單卡片模式：卡片顯示所有資料。身份 (角色+組別) 由管理員批核，決定：
// - 看到什麼：minLevel / groups 達標才顯示該卡片 (minLevel 0 = 公開，所有人可見)
// - 修改什麼：editLevel / editGroups 達標才顯示「可修改」徽章，否則為「只讀」
// editLabel 顯示「誰可以修改」作提示
const DASH_CARD_DEFS=[
  // ── 公開資料 (所有人可見，無需登入) ── 全部白底無顏色；右上已標示可讀／可修改，小字說明已刪
  {id:'announcements',title:'公告及溝通',desc:'',icon:'fa-solid fa-bullhorn',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:30},
  {id:'exec_manual',title:'執行手冊',desc:'',icon:'fa-solid fa-book',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:0,readOnly:true},
  {id:'apply_hub',title:'申請中心',desc:'',icon:'fa-solid fa-file-pen',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:0,readOnly:true},
  {id:'schedule',title:'日程表',desc:'',icon:'fa-solid fa-calendar-days',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:60,hideOnDashboard:true},
  {id:'activities',title:'場地與活動總覽',desc:'',icon:'fa-solid fa-map-location-dot',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:30,hideOnDashboard:true},
  {id:'staff',title:'組織架構與聯絡',desc:'',icon:'fa-solid fa-sitemap',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:40,editGroups:['行政組'],hideOnDashboard:true},
  {id:'theme_badges',title:'活動主題章',desc:'',icon:'fa-solid fa-award',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:60,hideOnDashboard:true},
  {id:'meals',title:'膳食管理',desc:'',icon:'fa-solid fa-utensils',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:60,editGroups:['膳食','協調','行政'],hideOnDashboard:true},
  {id:'crisis',title:'危機處理',desc:'',icon:'fa-solid fa-triangle-exclamation',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:60,hideOnDashboard:true},
  {id:'documents',title:'通告及文件',desc:'',icon:'fa-solid fa-file-shield',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:60,editGroups:['行政'],hideOnDashboard:true},
  {id:'unit_guide',title:'旅團須知',desc:'',icon:'fa-solid fa-book-open',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:60,hideOnDashboard:true},
  {id:'ceremony',title:'典禮儀式',desc:'',icon:'fa-solid fa-crown',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:60,hideOnDashboard:true},
  {id:'awards',title:'獲獎名單',desc:'',icon:'fa-solid fa-trophy',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:60,hideOnDashboard:true},
  {id:'meetings',title:'會議卡片',desc:'',icon:'fa-solid fa-handshake',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,editLevel:80},
  {id:'supplies',title:'物資申請',desc:'',icon:'fa-solid fa-boxes-stacked',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:40,editLevel:40,hideOnDashboard:true},
  {id:'vehicle',title:'車輛通行證（含泊車證）',desc:'',icon:'fa-solid fa-car',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:40,groups:['協調組'],editLevel:40,editGroups:['協調組'],hideOnDashboard:true,action:"app.openModule('parking')"},
  {id:'oral_quotes',title:'口頭報價登記',desc:'',icon:'fa-solid fa-file-signature',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:40,hideOnDashboard:true},
  {id:'finance',title:'財務管理',desc:'',icon:'fa-solid fa-wallet',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:40,groups:['行政組'],editLevel:60,editGroups:['行政組'],hideOnDashboard:true},
  {id:'admin_group',title:'行政組',desc:'',icon:'fa-solid fa-building',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['行政組'],editLevel:40,editGroups:['行政組']},
  {id:'coordinator_group',title:'協調組',desc:'',icon:'fa-solid fa-people-roof',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['協調組'],editLevel:40,editGroups:['協調組']},
  {id:'group_advisors',title:'顧問團',desc:'',icon:'fa-solid fa-user-tie',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['顧問團'],editLevel:80,editGroups:['顧問團'],action:"app.openGroupManagement('顧問團')"},
  {id:'group_leadership',title:'主席及執行副主席',desc:'',icon:'fa-solid fa-crown',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['主席及執行副主席'],editLevel:70,editGroups:['主席及執行副主席'],action:"app.openGroupManagement('主席及執行副主席')"},
  {id:'group_ceremony',title:'會操及典禮組',desc:'',icon:'fa-solid fa-flag',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['會操及典禮組'],editLevel:40,editGroups:['會操及典禮組'],action:"app.openGroupManagement('會操及典禮組')"},
  {id:'group_theme',title:'主題節目組',desc:'',icon:'fa-solid fa-gamepad',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['主題節目組'],editLevel:40,editGroups:['主題節目組'],action:"app.openGroupManagement('主題節目組')"},
  {id:'group_brand',title:'品牌推廣組',desc:'',icon:'fa-solid fa-bullhorn',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['品牌推廣組'],editLevel:40,editGroups:['品牌推廣組'],action:"app.openGroupManagement('品牌推廣組')"},
  {id:'group_reception',title:'嘉賓接待組',desc:'',icon:'fa-solid fa-handshake-angle',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['嘉賓接待組'],editLevel:40,editGroups:['嘉賓接待組'],action:"app.openGroupManagement('嘉賓接待組')"},
  {id:'group_service',title:'服務及發展組',desc:'',icon:'fa-solid fa-hands-holding-child',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['服務及發展組'],editLevel:40,editGroups:['服務及發展組'],action:"app.openGroupManagement('服務及發展組')"},
  {id:'group_secretariat',title:'秘書處',desc:'',icon:'fa-solid fa-landmark',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,groups:['秘書處'],editLevel:40,editGroups:['秘書處'],action:"app.openGroupManagement('秘書處')"},
  {id:'donations',title:'童心捐贈大行動',desc:'',icon:'fa-solid fa-hand-holding-heart',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:0,editLevel:40,editGroups:['服務及發展組','行政組'],action:"app.openModule('donations')"},
  {id:'my_monitor',title:'我的監察 (全部申請批核)',desc:'',icon:'fa-solid fa-eye',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:20,readOnly:true,action:"app.openModule('my_monitor')"},
  {id:'approvals',title:'批核中心',desc:'',icon:'fa-solid fa-user-check',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:40,editLevel:40,action:"app.switchTopTab('approvals')"},
  {id:'account_setup',title:'開戶',desc:'',icon:'fa-solid fa-user-plus',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:40,editLevel:40},
  {id:'permissions',title:'權限管理',desc:'',icon:'fa-solid fa-key',cardClass:'bg-white border shadow-sm',iconClass:'bg-slate-100 text-slate-700',minLevel:40,editLevel:40,hideOnDashboard:true}
];
const LS={gasUrl:'gas_url',apiKey:'api_key',currentUser:'current_user',currentEvent:'current_event',mockMode:'mock_mode',events:'event_events_v7',users:(eid)=>`event_users_v7_${eid}`,meetings:(eid)=>`event_meetings_v7_${eid}`,staff:(eid)=>`event_staff_v7_${eid}`,finance:(eid)=>`event_finance_v7_${eid}`,supplies:(eid)=>`event_supplies_v7_${eid}`,meals:(eid)=>`event_meals_v7_${eid}`,activities:(eid)=>`event_activities_v7_${eid}`,theme_badges:(eid)=>`event_theme_badges_v7_${eid}`,documents:(eid)=>`event_documents_v7_${eid}`,announcements:(eid)=>`event_announcements_v7_${eid}`,safety:(eid)=>`event_safety_v7_${eid}`,unit_guide:(eid)=>`event_unit_guide_v7_${eid}`,crisis:(eid)=>`event_crisis_v7_${eid}`,ceremony:(eid)=>`event_ceremony_v7_${eid}`,awards:(eid)=>`event_awards_v7_${eid}`,parking:(eid)=>`event_parking_v7_${eid}`,oral_quotes:(eid)=>`event_oral_quotes_v7_${eid}`,notifications:(eid,uid)=>`event_notifications_v7_${eid}_${uid}`,myMealOrders:(eid)=>`event_my_meal_orders_v7_${eid}`,pending:(eid)=>`event_pending_v7_${eid}`,config:(eid)=>`event_config_v7_${eid}`,schedule:(eid)=>`event_schedule_v7_${eid}`,participants:(eid)=>`event_participants_v7_${eid}`,approvalRouting:(eid)=>`event_approval_routing_v8_${eid}`,deletedRecords:(eid)=>`event_deleted_records_v8_${eid}`,execManual:(eid)=>`event_exec_manual_v10_${eid}`,
  // v11：失物認領（行政組紀錄）＋紀念章派發（行政組＝工作人員／嘉賓接待組＝嘉賓）
  lostFound:(eid)=>`event_lost_found_v11_${eid}`,souvenirStamps:(eid)=>`event_souvenir_stamps_v11_${eid}`,
  // v14：執行手冊四張名單（支部獎勵／領袖獎勵／參加旅團／代訂餐盒）——行＋點名＋附件；附件本身沿用 execManual sections
  rosterLists:(eid)=>`event_roster_lists_v14_${eid}`};
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

/* ── 攤位計劃書對標資料 ──
   ① 品牌推廣組「2026 攤位總表」Google Sheet（分區 A-G＋編號＋負責單位）：
      docs.google.com/spreadsheets/d/1Po1UGjl1E3Q6HWlYlFqnE_tcXjblmFle
   ② 主題節目組「港島童軍繽紛日2026 - 主題節目攤位計劃書」Google Form：
      docs.google.com/forms/d/e/1FAIpQLSfo-rLX88DI7teSF0_19VFkdzmoWAxxfCVt92S0_ZsJApFikg
   分區＋編號＋負責單位按總表選擇；攤位名稱／活動內容／「十五五」主題／負責人資料由申請人填寫。
   帳篷（3mW x 3mD）／摺枱／摺椅由大會向外判商租用，申請人只需填數量，不設庫存。
   v8.7：攤位卡由「攤位物資申請」升級為「攤位計劃書」，並新增「總表」頁籤
   （TOTAL 總數＋各攤位明細：TOTAL 50 BOOTH 100 CHAIR，其中 A01 2 BOOTH 4 CHAIR 睇法）。 */
const BOOTH_STD_ITEMS=[
  {key:'qty_tent', name:'帳篷', unit:'頂', hint:'每個帳篷為 3mW x 3mD'},
  {key:'qty_table', name:'摺枱', unit:'張'},
  {key:'qty_chair', name:'摺椅', unit:'張'}
];
// 舊版「一項一紀錄」嘅 item_name 對應新欄位（兼容 mock／後端舊紀錄嘅總表統計）
const BOOTH_ITEM_KEY_MAP={'帳篷':'qty_tent','帳篷（3mW x 3mD）':'qty_tent','枱':'qty_table','摺枱':'qty_table','椅':'qty_chair','摺椅':'qty_chair','帳篷圍布':'skirting_qty','電源':'power_w'};
// 攤位負責人年齡組別（Google Form 原樣選項）
const BOOTH_OWNER_AGE_GROUPS=[
  '15-20歲，並為深資童軍支部成員',
  '18-25歲，並為樂行童軍支部成員',
  '18-25歲，為持有有效領袖委任書/委任證的各級領袖/總監，而並非青少年成員',
  '25-39歲','40-49歲','50-59歲','60歲及以上'
];
const BOOTH_ZONES_2026=[
  {zone:'A',theme:'積極公民 / 「十五五」規劃',units:[{no:'01',name:'主題節目組總部',c:'Y',r:'',cf:''},{no:'02',name:'積極公民工作坊 - 機電1',c:'Y'},{no:'03',name:'積極公民工作坊 - 機電2',c:'Y'},{no:'04',name:'積極公民工作坊 - 機電3',c:'Y'},{no:'05',name:'積極公民工作坊 - 機電4',c:'Y'},{no:'06',name:'積極公民工作坊 - 機電5',c:'Y'},{no:'07',name:'積極公民工作坊 - 機電6',c:'Y'},{no:'08',name:'香港警務處 - 跨部門反恐專責組',c:'N'},{no:'09',name:'香港警務處 - 網絡安全及科技罪案調查科',c:'N'},{no:'10',name:'香港警務處 - 毒品調查科',c:'N'},{no:'11',name:'香港警務處 - 國家安全處',c:'N'},{no:'12',name:'香港警務處 - 交通總區',c:'N'},{no:'13',name:'香港警務處 - 鑑證科',c:'N'},{no:'14',name:'香港島青年聯會',c:'Y',r:'Y',cf:'Y'}]},
  {zone:'B',theme:'創新變革',units:[{no:'01',name:'港島童軍氣槍射擊會',c:'Y',r:'Y',cf:'Y'},{no:'02',name:'港島地域 - 航空活動',c:'Y',r:'Y',cf:'Y'},{no:'03',name:'航天航空展',c:'Y',r:'Y',cf:'Y'},{no:'04',name:'無人機體驗',c:'Y',r:'Y',cf:'Y'}]},
  {zone:'C',theme:'服務社群',units:[{no:'01',name:'港島地域 - 發展部1',c:'Y',r:'?'},{no:'02',name:'港島地域 - 發展部2',c:'Y',r:'?'},{no:'03',name:'港島地域 - 深資童軍議會',c:'Y',r:'?'},{no:'04',name:'港島地域 - 樂行童軍議會',c:'Y',r:'?'},{no:'05',name:'港島地域 - 社區參與及服務1',c:'Y',r:'Y',cf:'Y'},{no:'06',name:'港島地域 - 社區參與及服務2',c:'Y',r:'Y',cf:'Y'},{no:'07',name:'港島地域 - 灣仔區 - 社區參與章1',c:'Y',r:'Y',cf:'Y'},{no:'08',name:'香港童軍總會 - 發展署',c:'Y',r:'Y',cf:'Y'}]},
  {zone:'D',theme:'童軍技能',units:[{no:'02',name:'港島童軍生態小組'},{no:'03',name:'港島童軍章會'},{no:'04',name:'港島童軍射藝會'},{no:'05',name:'港島童軍泳會',c:'Y',r:'Y',cf:'N'},{no:'06',name:'港島童軍資訊科技會',c:'Y',r:'?'},{no:'07',name:'港島童軍先鋒工程會',c:'Y',r:'Y',cf:'Y'},{no:'08',name:'港島地域童軍樂隊'},{no:'09',name:'港島童軍皮藝會',c:'Y'},{no:'10',name:'港島地域 - 海上活動'},{no:'11',name:'港島地域 - 大潭童軍中心',c:'Y',r:'?'}]},
  {zone:'E',theme:'品格價值',units:[]},
  {zone:'F',theme:'身心全健',units:[{no:'01',name:'港島地域 - 維多利亞城區 - 精神健康章',c:'Y',r:'Y',cf:'Y'},{no:'02',name:'港島地域 - 維多利亞城區 - 公共衞生章',c:'Y',r:'Y',cf:'Y'},{no:'03',name:'童軍知友社',c:'Y',r:'Y',cf:'N'}]},
  {zone:'G',theme:'旅團／其他',units:[{no:'01',name:'港島第6旅'},{no:'02',name:'港島第10旅'},{no:'03',name:'港島第99旅'}]}
];
/* ── v11 失物認領＋紀念章派發（用戶定案 2026-08-31）──────────────────────────
   ① 失物認領：喺執行手冊「各類附加資料」公開查閱，同時設於「行政組」部門中心；
      由行政組紀錄（行政組登入成員＋管理層可新增／修改／刪除），其他組別及公眾只可查閱。
   ② 紀念章派發：紀念章只派發俾工作人員及典禮嘉賓，活動前已有全人名，派發時只需 TICK 人名。
      · 工作人員名單（行政組部門中心）：可填「備註」紀錄改名／替假嘅工作人員
      · 嘉賓名單（嘉賓接待組部門中心）：唔可以改名（冇代嘉賓），只 TICK 派咗俾邊位嘉賓
      · 管理組別：行政組（工作人員＋嘉賓）＋嘉賓接待組（嘉賓） */
const LOST_FOUND_MANAGERS=['行政組'];
const SOUVENIR_STAMP_MANAGERS={staff:['行政組'],guests:['行政組','嘉賓接待組']};
const SOUVENIR_STAMP_SCOPES=[
  {scope:'staff',label:'工作人員',group:'行政組',icon:'fa-solid fa-users',canRename:true,hint:'紀念章只派發俾工作人員，活動前已有全人名；派發時 TICK 人名，如有改名／替假請喺「備註」紀錄。'},
  {scope:'guests',label:'嘉賓',group:'嘉賓接待組',icon:'fa-solid fa-user-tie',canRename:false,hint:'派發紀念章俾典禮嘉賓：TICK 派咗俾邊位嘉賓。嘉賓名單唔可以改名（冇代嘉賓），名單跟「典禮儀式 → 嘉賓名單」。'}
];
/* ══ v14（2026-09-05 用戶定案）執行手冊「名單＋點名」四張名單 ══════════════════
   用戶要求：先**預定位置及格式**，同時預備可讓用戶**上傳名單（EXCEL／WORD／PDF）**，
   並加入「像優異旅團那種的點名」（TICK 點名＋更正需填原因＋分組確認＋後端留痕）。
   ┌────────────────┬──────────────────────────┬──────────────┐
   │ 名單            │ 位置                      │ 負責組別      │
   ├────────────────┼──────────────────────────┼──────────────┤
   │ 支部獎勵獲獎名單 │ 執行手冊 → 典禮儀式 → 支部獎勵名單 │ 會操及典禮組  │
   │ 領袖獎勵獲獎名單 │ 執行手冊 → 典禮儀式 → 領袖獎勵名單 │ 會操及典禮組  │
   │ 參加旅團名單     │ 執行手冊 → 參加旅團名單（既有分頁加點名）│ 行政組     │
   │ 代訂餐盒旅團名單 │ 執行手冊 → 代訂餐盒名單（新分頁）      │ 協調組     │
   └────────────────┴──────────────────────────┴──────────────┘
   各名單亦並設於所屬組別「部門中心」頁籤（典禮組＝兩份獎勵名單、行政組＝參加旅團、協調組＝代訂餐盒）。
   欄位格式（columns）即「預定格式」：匯入 Excel／Word 時按 aliases 對位（中英文表頭均可），
   「下載格式範本 CSV」則按 labels 產生表頭，用家照樣板填回覆上即可。 */
const ROSTER_AREAS=['CHW 柴灣區','HKN 港島北區','HKS 港島南區','HKW 港島西區','SKW 筲箕灣區','VIC 維多利亞城區','WCH 灣仔區'];
const ROSTER_SECTIONS=['小童軍','幼童軍','童軍','深資童軍','樂行童軍'];
// 支部最高獎章（2026 執行手冊：頒發支部最高獎章嘉許信）
const ROSTER_SECTION_AWARDS=['總領袖獎章','榮譽童軍獎章','貝登堡獎章'];
// 領袖及委員獎勵（下拉建議值；唔限死——「5年／五年」等舊寫法保留做別名，方便任何版本嘅 Excel／Word 匯入）
const ROSTER_LEADER_AWARDS=['總監委任書','副總監委任書','五年長期服務獎狀','長期服務獎章','5年長期服務獎狀','10年長期服務獎狀','15年長期服務獎狀','20年長期服務獎狀','長期服務一星獎章','長期服務二星獎章','長期服務三星獎章','長期服務四星獎章','優異服務獎章','嘉許信'];
const ROSTER_LIST_DEFS=[
  {
    key:'section_award', match_fields:['name','award'], title:'支部獎勵獲獎名單', tab_label:'支部獎勵名單', icon:'fa-solid fa-medal',
    accent:'amber', owner_group:'會操及典禮組', owner_note:'典禮組',
    exec_location:'執行手冊 → 典禮儀式 → 支部獎勵名單', dept_tab:'cer_award_section',
    tick_label:'點名', tick_col_label:'出席', tick_hint:'獲獎人上台前由典禮組逐一點名；取消 TICK 必須填寫更正原因。',
    intro:'對應執行手冊「第一部分典禮——優異旅團及各項獎勵頒發儀式」內之『頒發支部最高獎章嘉許信』。名單由會操及典禮組（典禮組）負責上載及點名，公眾可查閱。',
    format_note:'欄位跟手冊該頁格式（2017 版 P.32『支部獎勵獲獎名單』已係咁，沿用至今）；要加減欄位改本檔 ROSTER_LIST_DEFS 就得，匯入按表頭名對位，TICK 唔會冇。',
    source:'roster', editable:true, required:'name', group_field:'section', sort_fields:['area','section','unit','name'],
    columns:[
      {k:'area',label:'區會',type:'text',list:'areas',aliases:['區會','area','區','所屬區會','District']},
      {k:'section',label:'支部',type:'text',list:'sections',aliases:['支部','所屬支部','section','組別','Branch']},
      {k:'unit',label:'旅團／單位',type:'text',aliases:['旅團','旅號','單位','童軍旅','所屬單位','unit','Group']},
      {k:'name',label:'獲獎人姓名',type:'text',aliases:['姓名','獲獎人','獲獎人士','獲獎者','name','Name']},
      {k:'award',label:'獎項（支部最高獎章）',type:'text',list:'section_awards',aliases:['獎項','獎章','最高獎章','項目','award','Award','奬項']},
      {k:'cert_no',label:'嘉許信／證書編號',type:'text',aliases:['嘉許信編號','證書編號','編號','文件編號','no','cert','Cert No']},
      {k:'notes',label:'備註',type:'text',aliases:['備註','說明','事項','note','notes','Remarks']}
    ],
    sample_rows:[['HKW 港島西區','童軍','港島第15旅','陳大文','總領袖獎章','ISD26/SL/001',''],['SKW 筲箕灣區','深資童軍','港島第6旅','李小明','榮譽童軍獎章','','請代領']]
  },
  {
    key:'leader_award', match_fields:['name','award','unit'], title:'領袖獎勵獲獎名單', tab_label:'領袖獎勵名單', icon:'fa-solid fa-award',
    accent:'indigo', owner_group:'會操及典禮組', owner_note:'典禮組',
    exec_location:'執行手冊 → 典禮儀式 → 領袖獎勵名單', dept_tab:'cer_award_leader',
    tick_label:'點名', tick_col_label:'出席', tick_hint:'獲獎領袖／委員上台前由典禮組逐一點名；取消 TICK 必須填寫更正原因。',
    intro:'對應執行手冊「第一部分典禮——優異旅團及各項獎勵頒發儀式」內之『頒發領袖及委員獎勵』（長期服務獎狀／獎章、優異服務獎章、總監委任書等；獲頒總監委任書者需進行覆誓）。名單由會操及典禮組（典禮組）負責上載及點名，公眾可查閱。',
    format_note:'欄位跟手冊該頁格式（2017 版 P.33『領袖奬勵獲獎名單』；唱名用「編號＋職位＋姓名」，故設『編號』欄，形如 5yr-1／LM-1／LS3-1）；要加減欄位改本檔 ROSTER_LIST_DEFS 就得。',
    source:'roster', editable:true, required:'name', group_field:'award', sort_fields:['area','unit','award','name'],
    columns:[
      {k:'no',label:'編號（唱名序）',type:'text',aliases:['編號','唱名編號','序號','序','call no','no','No.','No']},
      {k:'area',label:'區會',type:'text',list:'areas',aliases:['區會','area','區','所屬區會','District']},
      {k:'unit',label:'所屬單位（旅團／委員會）',type:'text',aliases:['所屬單位','單位','旅團','旅號','委員會','unit','Group']},
      {k:'rank',label:'職級／職銜',type:'text',aliases:['職級','職銜','職位','會職','rank','position','Appointment']},
      {k:'name',label:'獲獎人姓名',type:'text',aliases:['姓名','獲獎人','獲獎人士','name','Name']},
      {k:'award',label:'獎項（領袖及委員獎勵）',type:'text',list:'leader_awards',aliases:['獎項','獎狀','獎章','委任書','項目','award','Award','奬項']},
      {k:'oath',label:'需覆誓',type:'select',options:['','是','否'],aliases:['覆誓','需覆誓','監誓','宣誓','oath']},
      {k:'notes',label:'備註',type:'text',aliases:['備註','說明','事項','note','notes','Remarks']}
    ],
    sample_rows:[['LS5-1','VIC 維多利亞城區','港島第16旅','團高級指導員','張三','10年長期服務獎狀','',''],['LM-1','HKN 港島北區','地域執行委員會','總監','李四','總監委任書','是','10:55 前排練覆誓']]
  },
  {
    // 參加旅團名單：既有執行手冊分頁（結構表＝Drive 同步／Excel 上傳）——v14 只加「點名」，名單本身仍跟 participants
    key:'participants', match_fields:['unit','section'], title:'參加旅團名單', tab_label:'參加旅團名單', icon:'fa-solid fa-people-group',
    accent:'emerald', owner_group:'行政組', owner_note:'行政組',
    exec_location:'執行手冊 → 參加旅團名單', dept_tab:'admin_participants',
    tick_label:'報到', tick_hint:'旅團報到處逐團 TICK（已報到）；取消 TICK 必須填寫更正原因。',
    format_note:'欄位跟手冊該頁格式（2017 版 P.34–35『參加旅團名單』按區會分組、逐團列旅團＋團別）；人數／領隊以 2026 報名結構表為準，要加減欄位改本檔 ROSTER_LIST_DEFS 就得。',
    intro:'對應執行手冊行政組「參加旅團名單」（2025 版為「旅團報名人數」PDF）。名單本身沿用行政組維護之結構表（Drive 同步／Excel 上傳），v14 於同一頁加入報到點名。',
    source:'participants', editable:false, required:'unit', group_field:'section', sort_fields:['area','section','unit'],
    total_fields:[{k:'headcount',label:'人數'}],
    columns:[
      {k:'area',label:'區會',type:'text',list:'areas',aliases:['區會','area','區','所屬區會','District']},
      {k:'unit',label:'旅團',type:'text',aliases:['旅團','旅號','單位','童軍旅','unit_name','unit','Group','旅團名稱']},
      {k:'section',label:'支部',type:'text',list:'sections',aliases:['支部','所屬支部','section','組別','Branch']},
      {k:'headcount',label:'人數',type:'number',aliases:['人數','參加人數','_headcount','count','headcount','Participants']},
      {k:'leader',label:'領隊／旅長',type:'text',aliases:['領隊','旅長','負責人','领袖','leader']},
      {k:'notes',label:'備註',type:'text',aliases:['備註','說明','note','notes','Remarks']}
    ],
    sample_rows:[['CHW 柴灣區','港島第6旅','幼童軍','42','陳旅長',''],['HKS 港島南區','港島第175旅','小童軍','25','','延至 10/10']]
  },
  {
    key:'meal_box', match_fields:['unit'], title:'代訂餐盒旅團名單', tab_label:'代訂餐盒名單', icon:'fa-solid fa-bowl-food',
    accent:'rose', owner_group:'協調組', owner_note:'協調組',
    exec_location:'執行手冊 → 代訂餐盒名單', dept_tab:'coord_mealbox',
    tick_label:'派發', tick_hint:'領取餐盒時由協調組逐團 TICK（已派發）；取消 TICK 必須填寫更正原因。',
    format_note:'欄位跟手冊該頁格式（2017 版 P.36『代訂餐盒旅團名單』每團按支部人數訂購）；A／B／C 餐為 2026 供應商分類，如改用飯卷數目可只填其中一欄；要加減欄位改本檔 ROSTER_LIST_DEFS 就得。',
    intro:'對應執行手冊「代訂餐盒」名單（2025 版列於行政組膳食安排內）。名單由協調組上載及點名，用以向判單對數及派發時核對；各組仍可在「膳食管理」自行訂餐，兩邊數字如有出入以本名單為準並註明備註。',
    source:'roster', editable:true, required:'unit', group_field:'area', sort_fields:['area','section','unit'],
    total_fields:[{k:'qty_a',label:'A餐'},{k:'qty_b',label:'B餐'},{k:'qty_c',label:'C餐'},{k:'qty_total',label:'總數'}],
    columns:[
      {k:'area',label:'區會',type:'text',list:'areas',aliases:['區會','area','區','所屬區會','District']},
      {k:'unit',label:'旅團',type:'text',aliases:['旅團','旅號','單位','童軍旅','unit_name','unit','Group','旅團名稱']},
      {k:'section',label:'支部',type:'text',list:'sections',aliases:['支部','所屬支部','section','組別','Branch']},
      {k:'qty_a',label:'A餐',type:'number',aliases:['A餐','A','A飯','Qty A','qty_a']},
      {k:'qty_b',label:'B餐',type:'number',aliases:['B餐','B','B飯','Qty B','qty_b']},
      {k:'qty_c',label:'C餐',type:'number',aliases:['C餐','C','C飯','素','素食','Qty C','qty_c']},
      {k:'qty_total',label:'餐盒總數',type:'number',aliases:['總數','餐盒總數','合共','合計','人數','total','Total','qty']},
      {k:'pickup',label:'取餐時間／地點',type:'text',aliases:['取餐時間','派發時間','取餐地點','領取','pickup','time']},
      {k:'notes',label:'備註（走辣／額外）',type:'text',aliases:['備註','要求','特殊要求','說明','note','notes','Remarks']}
    ],
    sample_rows:[['HKS 港島南區','港島第175旅','小童軍','20','15','5','40','11:45／有蓋操場側','走辣 x3'],['CHW 柴灣區','港島第6旅','幼童軍','25','20','0','45','11:45／有蓋操場側','']]
  }
];
// 匯入時「總數」若空缺，則以 A＋B＋C 自動加總（代訂餐盒）
const ROSTER_AUTO_SUM={'meal_box':{field:'qty_total',parts:['qty_a','qty_b','qty_c']}};
function rosterListsOf(){ return ROSTER_LIST_DEFS; }
// 2026 攤位總表聯絡狀態顯示：Y / N / 🤷（原表「待確認」）／ —（未有紀錄）
function boothContactMark(v){ return v==='Y'?'Y':(v==='N'?'N':(v==='?'?'🤷':'—')); }
function boothUnitOf(zone,no){ const z=BOOTH_ZONES_2026.find(x=>x.zone===zone); const u=(z&&z.units||[]).find(x=>x.no===String(no).padStart(2,'0')); return u||null; }
function boothZoneLabel(z){ const zt=BOOTH_ZONES_2026.find(x=>x.zone===z); return z?`${z} ${zt?zt.theme:''}`:'未指定'; }
// 由「負責單位」反查 攤位代碼（如 A03）；找不到回空字串（自行填寫的單位不會有代碼）
function boothCodeOfUnit(unit){ if(!unit) return ''; const u=String(unit).trim(); for(const z of BOOTH_ZONES_2026){ const hit=(z.units||[]).find(x=>x.name===u); if(hit) return `${z.zone}${hit.no}`; } return ''; }
