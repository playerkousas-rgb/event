#!/usr/bin/env node
'use strict';
/*
 * Create a review-only explanation of how verified 2026 operational evidence
 * can become one 2027 system.  It intentionally creates no live connection:
 * 2026 stays a read-only evidence archive, while every proposed 2027 location
 * is explicitly marked as a review proposal for the later blank framework.
 */
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const {OUTPUTS,INVENTORY_FLAGS}=require(path.join(root,'tools/schema/outputs_2027.js'));
const lock=JSON.parse(fs.readFileSync(path.join(root,'data/2026_reference_lock.json'),'utf8'));
const target=path.join(root,'data/2027_source_explanation_register.json');

const GROUPS=['主席及執行副主席','顧問團','秘書處','行政組','協調組','嘉賓接待組','會操及典禮組','主題節目組','服務及發展組','品牌推廣組'];
const clean=v=>String(v||'').trim();

function profile(output){
  const id=output.id;
  const text=[id,output.title,...(output.ev||[])].join(' ').toLowerCase();
  const pick=(location,approval,input,domain,extraGaps=[])=>({location,approval,input,domain,extraGaps});
  if(/mc-|rundown|inspection|merit|section-award|leader-award|commission|party-entry|ug-list|award-letter|service-cert|thanks-cert|live-script/.test(id)){
    return pick('主SHEET：21_典禮；子SHEET：CS05_典禮及會操','秘書處／行政組','會操及典禮組受控輸入／2026 典禮檔案','programme_ceremony');
  }
  if(/guest|invitation|invite-card/.test(id)){
    return pick('主SHEET：11_人員、12_邀請、13_報名、14_出席、20_交通泊車、21_典禮、22_報到；子SHEET：CS02_嘉賓獎勵及典禮對象','秘書處／行政組','IN04 嘉賓入口／嘉賓接待組受控輸入／2026 嘉賓名單','guest');
  }
  if(/troop|enroll|ngo-notice|participant/.test(id)){
    return pick('主SHEET：10_組織、13_報名、14_出席、19_膳食、20_交通泊車、22_報到；子SHEET：CS01_參加單位及旅團','行政組','IN01／IN02／IN03／IN07 對應入口／2026 旅團資料','registration');
  }
  if(/staff|org-chart|job-duties|ticket|group-apps/.test(id)){
    return pick('主SHEET：10_組織、11_人員、15_工作人員、16_當值安排；子SHEET：CS03_工作人員及攤位人手','行政組','IN09／IN10 工作人員入口／各既有組別受控輸入／2026 編更及職責表','staff');
  }
  if(/booth|theme|game|borrow|badge-poster|badge-booklet|carton|signage/.test(id)){
    return pick('主SHEET：17_攤位、18_攤位人手、23_物資、26_日程及地圖；子SHEET：CS04_攤位及主題活動','秘書處／行政組','IN08 合作／攤位入口／主題節目組受控輸入／2026 攤位資料','venue_programme');
  }
  if(/meal|lunch/.test(id)){
    return pick('主SHEET：19_膳食；子SHEET：CS07_膳食物資及後勤','行政組','對應受邀入口的膳食欄／協調組受控輸入／2026 膳食資料','meals');
  }
  if(/site|map|parking|vehicle|plate|marquee|radio/.test(id)){
    return pick('主SHEET：20_交通泊車、26_日程及地圖；子SHEET：CS06_場地交通及泊車','行政組','對應受邀入口的交通欄／協調組受控輸入／2026 場地及泊車資料','venue_transport');
  }
  if(/crisis|incident|weather|lost-found/.test(id)){
    return pick('主SHEET：27_公告及求助；子SHEET：CS08_安全醫療及服務','行政組','行政組受控輸入／2026 危機處理手冊；2027 由行政組提供及確認危機處理手冊','safety');
  }
  if(id==='o-supplies'){
    return pick('主SHEET：23_物資；子SHEET：CS07_膳食物資及後勤','行政組','協調組受控輸入／2026 物資批核資料','supplies');
  }
  if(/finance|budget|expense|quote|settlement|fin-/.test(id)){
    return pick('2027目標：06_後勤／財務（唯一受控資料及文件）；受控財務範本','行政組','由 2026 財務文件核實後新建 2027 唯一財務來源','finance');
  }
  if(/agenda|minutes|workplan|wish-list|activity-sheet|post-report/.test(id)){
    return pick('2027目標：05_程序／會議及工作計劃（唯一受控資料及文件）；空白工作計劃範本','秘書處','由 2026 會議及工作計劃文件核實後新建 2027 唯一來源','governance');
  }
  if(id==='o-schedule'){
    return pick('主SHEET：26_日程及地圖；子SHEET：CS05_典禮及會操','秘書處／行政組','秘書處／會操及典禮組受控輸入／2026 日程及 Rundown','programme_ceremony');
  }
  if(id==='o-ngo-contact'){
    return pick('主SHEET：10_組織、11_人員、13_報名；子SHEET：CS04_攤位及主題活動','行政組','IN08 合作／攤位入口／2026 NGO 聯絡表','registration');
  }
  if(id==='o-crosscheck'){
    return pick('主SHEET：24_修正紀錄；子SHEET：不需要','行政組','各受控主SHEET資料頁／2026 跨組對帳規則','audit');
  }
  if(/notice|circular|donate|compliance|public-page|brand|link-registry|output-board|admin-docs|coord-docs|special-circ|oc-invite|oc-reply|pc-content/.test(id)){
    return pick('主SHEET：25_基本資訊、27_公告及求助；子SHEET：不需要','秘書處','秘書處受控輸入／2026 通告、指引或活動日文件；2027 由秘書處提供及確認','notices_documents');
  }
  return pick('主SHEET：待確認；子SHEET：待確認','待確認','2026 已驗證來源；2027 入口待確認','unclassified',["未能按既有資料域自動歸類，需在本次覆核逐項決定。"]);
}

const publicSevenRows=[
  ['嘉賓','ISD 2027－活動日輸出頁簽及輸入對照表／02_嘉賓'],
  ['參加旅團','ISD 2027－活動日輸出頁簽及輸入對照表／03_參加旅團'],
  ['優異旅團','ISD 2027－活動日輸出頁簽及輸入對照表／04_優異旅團'],
  ['步操隊伍','ISD 2027－活動日輸出頁簽及輸入對照表／05_步操隊伍'],
  ['其他制服團體','ISD 2027－活動日輸出頁簽及輸入對照表／06_其他制服團體'],
  ['支部最高獎勵得主','ISD 2027－活動日輸出頁簽及輸入對照表／07_支部最高獎勵得主'],
  ['成人獎勵得主','ISD 2027－活動日輸出頁簽及輸入對照表／08_成人獎勵得主'],
].map(([name,source])=>({final_output:name,update_location:'另見已覆核的公眾七類四欄表。',central_approval:'按各頁 C 欄。',reference_source:source,status:'already_modelled'}));

const manualPages=[
  ['手冊目錄及資料說明','主SHEET：25_基本資訊、27_公告及求助；子SHEET：不需要','秘書處','2026 documents、notices、活動日資料目錄；2027 由秘書處提供及確認活動日文件'],
  ['全日程序及各組工作時間','主SHEET：16_當值安排、26_日程及地圖、21_典禮；子SHEET：CS03_工作人員及攤位人手、CS05_典禮及會操','行政組','2026 schedule、ceremony.rundown_part1_v5、司儀稿；2027 每個既有大組別填寫其全日工作的開始及結束時間，不設交接或換位資料'], 
  ['場地、攤位、遊戲及動線','主SHEET：17_攤位、23_物資、26_日程及地圖；子SHEET：CS04_攤位及主題活動、CS06_場地交通及泊車','秘書處／行政組','2026 activities.maps、activities.booths、activities.gameCards、場地圖及攤位資料'],
  ['報到、服務點、膳食及後勤','主SHEET：19_膳食、22_報到；子SHEET：CS01_參加單位及旅團、CS02_嘉賓獎勵及典禮對象、CS07_膳食物資及後勤','行政組','2026 participants、troop_checkin、guest_roster、meal_distribution、meal_logistics'],
  ['典禮、會操及司儀資料','主SHEET：21_典禮；子SHEET：CS05_典禮及會操','秘書處／行政組','2026 ceremony、司儀稿、檢閱路線'],
  ['旅團、膳食及編更資料','主SHEET：14_出席、16_當值安排、19_膳食；子SHEET：CS01、CS03、CS07','行政組','2026 participants、staff.event_staff_roster、staff_meals、meal_distribution'],
  ['各組職責及工作資料','主SHEET：10_組織、11_人員、15_工作人員、16_當值安排；子SHEET：CS03_工作人員及攤位人手','行政組','2026 staff.contacts、staff.org_chart、staff.job_duties、staff.event_staff_roster'],
  ['安全及應變','主SHEET：27_公告及求助；子SHEET：CS08_安全醫療及服務','行政組','2026 ISD2026-RiskMangementManual_V1(Clean).pdf、crisis；2027 由行政組提供及確認危機處理手冊'],
  ['通告、指引及活動日文件','主SHEET：25_基本資訊、27_公告及求助；子SHEET：不需要','秘書處','2026 notices、documents（79 項）、活動日檔案；2027 由秘書處提供及確認活動日文件'], 
].map(([final_output,update_location,central_approval,reference_source])=>({final_output,update_location,central_approval,reference_source,status:'review_required'}));

const rows=OUTPUTS.map(output=>{
  const p=profile(output);
  return {
    output_id:output.id,
    audience:output.aud,
    final_output:output.title,
    output_kind:output.kind,
    delivery:output.medium,
    status_2026:output.status,
    update_location:p.location,
    central_approval:p.approval,
    reference_source:(output.ev||[]).join('；'),
    proposed_2027_input:p.input,
    canonical_domain:p.domain,
    known_gaps:[...(output.gaps||[]),...p.extraGaps],
    note:clean(output.note),
  };
});

const uniqueGaps=[];
for(const row of rows){
  for(const detail of row.known_gaps) uniqueGaps.push({type:'output_gap',output_id:row.output_id,output:row.final_output,detail,source:row.reference_source});
}
for(const flag of INVENTORY_FLAGS) uniqueGaps.push({type:'archive_structure',output_id:flag.id,output:flag.what,detail:flag.detail,source:flag.why});

const register={
  schema_version:'2027-source-explanation-register-v1',
  status:'review_only_2026_evidence_to_2027_framework',
  generated_at:lock.locked_on,
  boundary:{
    reference_event_id:lock.reference_event_id,
    reference_file:lock.reference_file,
    reference_sha256:lock.sha256,
    rule:'所有 2026 來源只作封存、唯讀證據。此表提出 2027 資料位置及輸入草案，但不會建立同步、寫入 2026 或把 2026 變成 live source。'
  },
  column_rule:'所有覆核列均按 A 最終輸出、B 主SHEET／子SHEET更新位置、C 中央批核、D 2026已驗證來源／未來2027輸入草案閱讀。',
  review_progress:{
    completed:['公眾七類活動日輸出','工作人員執行手冊九個頁簽','公眾文件及入口（26項）','工作人員文件及工作視圖（25項）','部門中心及內部輸出（58項）'],
    next:'全部 109 項2026實物根據輸出及工作人員執行手冊已按類別完成來源解釋。下一步只可在確認沒有遺漏後，於下一個對話建立 2027-owned sources 與輸出連通；現有 2027 資料夾及 MOCK 可按此設計重建。'
  },
  established_groups:GROUPS,
  public_seven:publicSevenRows,
  execution_manual:manualPages,
  outputs:rows,
  source_clusters:[
    {source:'2026 participants／troop_checkin',feeds:'旅團報到、餐盒、交通、旅團公開頁、行政旅團視圖',future_domain:'registration'},
    {source:'2026 guest_roster／guest_transport',feeds:'嘉賓報到、交通、座位、名牌、嘉賓公開頁、典禮',future_domain:'guest'},
    {source:'2026 ceremony／司儀稿／rundown',feeds:'典禮、會操、頒獎、司儀稿、獎項及各類儀式通知',future_domain:'programme_ceremony'},
    {source:'2026 staff／staff_meals／souvenirs',feeds:'編更、工作人員證、膳食、點名、紀念章及執行手冊',future_domain:'staff'},
    {source:'2026 activities／場地圖／攤位資料',feeds:'地圖、攤位、遊戲卡、物資、指示牌及工作人員手冊',future_domain:'venue_programme'},
    {source:'2026 documents／notices',feeds:'通知書、通告、固定文件、文件目錄及公眾資訊',future_domain:'notices_documents'},
    {source:'2026 finance',feeds:'預算、部門財務、報價、結算及財務指引',future_domain:'finance'},
    {source:'2026 crisis',feeds:'危機手冊、求助、安全、急救及惡劣天氣公布',future_domain:'safety'},
  ],
  structural_questions:[], // Every current source domain has a 2027 folder and a controlled MOCK/blank format; remaining archive differences are reference notes only.
  gaps:uniqueGaps,
};
fs.writeFileSync(target,JSON.stringify(register,null,2)+'\n');
console.log(`Built ${path.relative(root,target)}: ${rows.length} output rows, ${manualPages.length} manual sections, ${uniqueGaps.length} source/gap findings.`);
