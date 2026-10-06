#!/usr/bin/env node
'use strict';
/*
 * Assemble the 2027 staff execution manual from the controlled 2027 read model.
 *
 * It intentionally never reads the 2026 archive.  The material already in the
 * 2027 source is a one-time reference seed; this command turns it into the
 * staff-facing, role-aware manual index used by the rehearsal product.
 */
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'data/isd_2027.json');
const registryFile=path.join(root,'data/2027_drive_registry.json');
const event=JSON.parse(fs.readFileSync(file,'utf8'));
const driveRegistry=fs.existsSync(registryFile)?JSON.parse(fs.readFileSync(registryFile,'utf8')):{};
if(event.event_id!=='isd_2027') throw new Error('Expected data/isd_2027.json');

const list=value=>Array.isArray(value)?value:[];
const assetById=Object.fromEntries(list(driveRegistry.execution_manual_assets).map(asset=>[asset.asset_id,asset]));
const withDriveRef=(assetId,record)=>{
  const asset=assetById[assetId];
  return asset?Object.assign(record,{drive_file_id:asset.drive_file_id,drive_file_link:asset.drive_file_link}):record;
};
const count=value=>list(value).length;
const copy=value=>JSON.parse(JSON.stringify(value));
const sourceRef='2027_reference_seed_pending_2027_confirmation';
const today=new Date().toISOString().slice(0,10);

/* Replace every staff-facing active asset with a 2027-owned copy.  The archive
 * names remain only in provenance records, not in a manual link. */
event.activities=event.activities||{};
event.activities.maps=[
  withDriveRef('map_2027_site_setup',{
    id:'map_2027_site_setup',
    title:'警察學院場地佈置及攤位圖',
    description:'工作人員活動日主場地圖：攤位、服務點、典禮及後勤位置。',
    audience:'所有工作人員',
    status:sourceRef,
    file_name:'site-setup-plan-2027.pdf',
    file_url:'assets/event-day/site-setup-plan-2027.pdf'
  }),
  withDriveRef('map_2027_troop_route',{
    id:'map_2027_troop_route',
    title:'參加旅團場地指示圖',
    description:'東閘入場、報到處及旅團活動動線；供報到、秩序和主題活動組使用。',
    audience:'所有工作人員',
    status:sourceRef,
    file_name:'ISD 2027－參加旅團場地指示圖.pdf',
    file_url:'google_drive/ISD 2027－參加旅團場地指示圖.pdf'
  }),
  withDriveRef('map_2027_guest_reception',{
    id:'map_2027_guest_reception',
    title:'嘉賓接待及典禮位置圖',
    description:'嘉賓接待、典禮及座位區域的工作參考圖；嘉賓個人資料仍只限獲授權角色。',
    audience:'嘉賓接待組、會操及典禮組及管理層',
    status:sourceRef,
    file_name:'guest-reception-map-2027.pdf',
    file_url:'assets/event-day/guest-reception-map-2027.pdf'
  }),
  withDriveRef('map_2027_inspection_route',{
    id:'map_2027_inspection_route',
    title:'會操檢閱路線圖',
    description:'會操及典禮組工作人員的檢閱行進路線參考。',
    audience:'會操及典禮組',
    status:sourceRef,
    file_name:'inspection-route-2027.svg',
    file_url:'assets/event-day/inspection-route-2027.svg'
  })
];
event.activities.gameCards=[
  withDriveRef('gc_2027',{
    id:'gc_2027', title:'主題活動遊戲卡',
    description:'攤位集印及活動日派發使用。', audience:'所有工作人員',
    status:sourceRef, file_name:'game-card-2027.pdf', file_url:'assets/event-day/game-card-2027.pdf'
  }),
  withDriveRef('gc_p_2027',{
    id:'gc_p_2027', title:'主題活動遊戲卡（P 版）',
    description:'指定工作崗位使用的遊戲卡版本。', audience:'主題節目組及指定工作人員',
    status:sourceRef, file_name:'game-card-p-2027.pdf', file_url:'assets/event-day/game-card-p-2027.pdf'
  })
];

const scriptAssets={
  mc_part1:'assets/event-day/mc-awards-2027.pdf',
  mc_part2:'assets/event-day/mc-inspection-2027.pdf',
  mc_part3:'assets/event-day/mc-buffet-2027.pdf'
};
for(const item of list(event.ceremony&&event.ceremony.mc_scripts)){
  if(scriptAssets[item.id]) {
    item.file_url=scriptAssets[item.id];
    item.status=sourceRef;
    const asset=assetById[item.id];
    if(asset){ item.drive_file_id=asset.drive_file_id; item.drive_file_link=asset.drive_file_link; }
  }
}
if(event.ceremony&&event.ceremony.inspection_route){
  event.ceremony.inspection_route.image='assets/event-day/inspection-route-2027.svg';
  event.ceremony.inspection_route.status=sourceRef;
}
if(event.crisis){
  event.crisis.manual_file='assets/event-day/crisis-manual-2027.pdf';
  event.crisis.manual_file_status=sourceRef;
  for(const manual of list(event.crisis.manuals)){
    manual.title='2027 港島童軍繽紛日｜危機處理手冊';
    manual.version='2027 參考種籽（待 2027 危機處理組確認）';
    manual.file_name='crisis-manual-2027.pdf';
    manual.file_url='assets/event-day/crisis-manual-2027.pdf';
    manual.open_url='assets/event-day/crisis-manual-2027.pdf';
    manual.status=sourceRef;
    const asset=assetById.crisis_manual_2027;
    if(asset){ manual.drive_file_id=asset.drive_file_id; manual.drive_file_link=asset.drive_file_link; }
  }
}
for(const notice of list(event.announcements&&event.announcements.announcements)){
  if(notice.id==='ann_crisis_manual'){
    notice.title='危機處理手冊（2027 參考種籽）';
    notice.content='《crisis-manual-2027.pdf》已整理至 2027 工作人員執行手冊。活動日前請由 2027 危機處理組確認最終程序、日期、地點及聯絡安排。';
    notice.file_url='assets/event-day/crisis-manual-2027.pdf';
    notice.status=sourceRef;
  }
}

const schedule=list(event.schedule).map(row=>({
  time:row.time_slot||'', title:row.title||'', location:row.location||'',
  owner:row.group_name||'', instruction:row.description||''
}));
const mealLogistics=list(event.meal_logistics).map(row=>({
  label:row.label||'', place:row.place||'', time:row.time||'', note:row.note||''
}));
/* Build one cross-role timeline from the 2027 public schedule plus the
 * controlled official rundown.  It gives staff a single activity-day view
 * without exposing a participant's private record. */
const allDayByKey=new Map();
const addAllDay=(row,audience)=>{
  const time=String(row.time||row.time_slot||'');
  const title=String(row.title||'');
  if(!time||!title) return;
  const key=`${time}|${title}`;
  const detail=String(row.location||row.detail||row.description||'');
  const owner=String(row.owner||row.group_name||audience||'全體工作人員');
  const prior=allDayByKey.get(key);
  if(!prior) allDayByKey.set(key,{time,title,detail,location:detail,owner});
  else {
    if(detail&&!prior.detail.includes(detail)) prior.detail=[prior.detail,detail].filter(Boolean).join('；');
    if(owner&&!prior.owner.includes(owner)) prior.owner=[prior.owner,owner].filter(Boolean).join('／');
  }
};
for(const row of schedule) addAllDay(row,row.owner);
const publicSchedules=event.public_channel_2027&&event.public_channel_2027.schedules||{};
for(const audience of ['troop','guest','march']) for(const row of list(publicSchedules[audience]&&publicSchedules[audience].items)) addAllDay(row,audience==='troop'?'旅團及報到人員':audience==='guest'?'嘉賓接待組':'會操及典禮組');
const timeRank=time=>{ const m=String(time).match(/^(\d{1,2}):(\d{2})/); return m?(+m[1])*60+(+m[2]):9999; };
const allDayProgramme=[...allDayByKey.values()].sort((a,b)=>timeRank(a.time)-timeRank(b.time)||a.title.localeCompare(b.title,'zh-Hant'));
const docs=list(event.documents);
const documentsByCategory={};
for(const doc of docs){
  const category=doc.category||doc.folder||'其他活動文件';
  documentsByCategory[category]=(documentsByCategory[category]||0)+1;
}
const boothCount=count(event.activities.booths);
const staffRosterCount=count(event.staff&&event.staff.event_staff_roster);
const groupDuties=list(event.staff&&event.staff.job_duties).map(row=>({
  group:row.group||'', duty:row.duty||'', status:sourceRef
}));
const publicChannel=event.public_channel_2027||{};
/* The manual is a complete reference book, not a workflow wizard.  Keep every
 * non-private activity record, while redacting a named person's identity from
 * source duty text before it reaches the shared-PIN edition. */
const privateNames=[...new Set(list(event.staff&&event.staff.event_staff_roster).map(row=>String(row.name||'').trim()).filter(name=>name.length>=3))].sort((a,b)=>b.length-a.length);
const redactNames=text=>privateNames.reduce((out,name)=>out.split(name).join('〔姓名已遮蔽〕'),String(text||''));
const publicGroupDuties=groupDuties.map(row=>({
  group:row.group, duty:redactNames(row.duty), status:row.status
}));
const publicParticipantUnits=list(event.participants).map(row=>({
  unit_name:row.unit_name||'', area:row.area||'', headcount:row.headcount||0,
  meal_boxes:row.meal_boxes||0
}));
const mealAllocation=list(event.meal_distribution&&event.meal_distribution.booths).map(row=>({
  label:row.label||'', headcount:row.headcount||0, rice:row.rice??'', snack:row.snack??''
}));
const ceremonySummary={
  adult_awards:list(event.ceremony&&event.ceremony.adult_awards).map(row=>({
    award:row.award||'', recipient_count:list(row.recipients).length
  })),
  merit_award_count:list(event.ceremony&&event.ceremony.merit_award).length
};
const manualCatalog=[
  {id:'overview', title:'手冊目錄及資料說明', icon:'fa-book-open', description:'本手冊按活動資料類別編排，工作人員可按需要自行查閱。'},
  {id:'programme', title:'全日程序及交接', icon:'fa-clock', description:'跨組的完整時間線、位置、環節及適用資料。'},
  {id:'activities', title:'場地、攤位、遊戲及動線', icon:'fa-map-location-dot', description:'場地圖、A–F 攤位總表、活動內容及遊戲卡。'},
  {id:'logistics', title:'報到、服務點、膳食及後勤', icon:'fa-clipboard-check', description:'旅團／嘉賓動線、報到、服務點、餐單、派發及後勤資料。'},
  {id:'ceremony', title:'典禮、會操及司儀資料', icon:'fa-crown', description:'典禮程序、檢閱路線、rundown 與司儀稿。'},
  {id:'records', title:'旅團、膳食及編更資料', icon:'fa-table-list', description:'非私人版本的旅團、餐盒、攤位編更及獎勵資料。'},
  {id:'staff', title:'各組職責及工作資料', icon:'fa-people-group', description:'各組及職位職責；個人姓名以外的工作資料完整保留。'},
  {id:'crisis', title:'安全及應變', icon:'fa-triangle-exclamation', description:'危機定義、即時行動、回報、集合及對外發言資料。'},
  {id:'documents', title:'通告、指引及活動日文件', icon:'fa-folder-open', description:'2027 擁有版本的場地、遊戲、典禮、安全及工作指引文件。'}
];
const staffGuidance=list(event.unit_guide&&event.unit_guide.docs).map(row=>({
  id:row.id||'', title:row.title||'', category:row.category||'工作人員須知',
  description:row.description||'', status:sourceRef,
  note:'內容來自 2027 參考種籽；活動日的日期、費用、聯絡及安排須由相關總主任確認。'
}));
const crisisDocs=list(event.crisis&&event.crisis.docs).map(row=>({
  title:row.title||'', category:row.category||'', description:row.description||''
}));
const documentCatalogRecords=docs.map(row=>({
  id:row.id||'', title:row.title||'', category:row.category||row.folder||'其他活動文件',
  status:(row.file_url||row.drive_file_id||row.drive_file_link)?'2027_owned_file_linked':'metadata_copied_file_pending',
  note:'2026 reference metadata copied to the 2027 source; retain, replace or retire is recorded in the 2027 source register.'
}));

/* This index is the worker-facing table of contents.  It deliberately contains
 * operational material for every worker; only personally identifying or
 * private-record fields are withheld, while editing remains role-controlled. */
event.execution_manual_2027={
  schema_version:'2027-execution-manual-v1',
  title:'2027 港島童軍繽紛日｜工作人員執行手冊',
  event_id:'isd_2027',
  status:sourceRef,
  generated_at:today,
  source_rule:'本手冊由 ISD 2027 受控資料整理而成。2026 只屬一次性封存參考，日後修訂只可在 ISD 2027 folder／2027 前端流程進行。',
  audience_rule:{
    ordinary_staff:'所有不涉及個人私隱的活動日操作資料均可在此唯讀查閱：崗位、場地、流程、攤位、報到、膳食、服務點、應變和常見問題不按組別隱藏。',
    committee:'同一份操作資料供所有工作人員查閱；籌委帳戶只額外提供來源編輯、個人／受限名單和管理操作。',
    restricted:'只保護個人私隱及其衍生資料：姓名對應崗位、電話、電郵、嘉賓個人資料、車牌、帳戶、事故個資及簽收紀錄。'
  },
  manual_catalog:manualCatalog,
  public_records:{
    participant_units:publicParticipantUnits,
    booth_meal_allocation:mealAllocation,
    ceremony:ceremonySummary
  },
  event_day_snapshot:{
    event_name:event.event_name,
    location:'黃竹坑香港警察學院（2027 演練資料）',
    staff_roster_count:staffRosterCount,
    participant_unit_count:count(event.participants),
    booth_count:boothCount,
    activity_schedule:schedule,
    staff_start_checklist:[
      '到指定工作人員集合／報到位置報到，確認所屬組別及崗位。',
      '按本手冊分類查閱場地、程序及所需資料，確認所在位置及下一個交接點。',
      '按本組工作指引執行；遇到未列情況，向所屬總主任或指揮中心回報。',
      '任何事故先保障安全；依「安全及應變」程序處理，未獲授權不得對外發言。'
    ]
  },
  sections:manualCatalog,
  venue_assets:copy(event.activities.maps),
  game_cards:copy(event.activities.gameCards),
  programme:schedule,
  all_day_programme:allDayProgramme,
  logistics:{
    meal_collection:mealLogistics,
    meal_options:copy(list(event.meal_menu)),
    participant_units:count(event.participants),
    staff_meal_records:count(event.staff_meals),
    note:'個人餐膳紀錄及簽收資料只向獲授權後勤人員顯示。'
  },
  safety:{
    command_post:'活動中由指揮中心統籌；實際位置須由 2027 籌委確認後更新。',
    immediate_steps:['先確保人身安全及避免擴大風險。','即時通知所屬總主任／指揮中心。','記錄時間、地點、涉及人員及已採取行動。','未獲活動主席授權，不向傳媒或無關人士發表事故資料。'],
    manual_asset:'assets/event-day/crisis-manual-2027.pdf',
    topics:crisisDocs
  },
  staff_guidance:staffGuidance,
  staff_document_assets:[
    ...copy(event.activities.maps).map(row=>({id:row.id,title:row.title,category:'場地及動線',description:row.description,file_url:row.file_url,drive_file_id:row.drive_file_id||'',drive_file_link:row.drive_file_link||'',tab:'activities'})),
    ...copy(event.activities.gameCards).map(row=>({id:row.id,title:row.title,category:'主題活動',description:row.description,file_url:row.file_url,drive_file_id:row.drive_file_id||'',drive_file_link:row.drive_file_link||'',tab:'activities'})),
    ...list(event.crisis.manuals).map(row=>({id:row.id,title:row.title,category:'安全及應變',description:row.summary||row.description||'',file_url:row.file_url,drive_file_id:row.drive_file_id||'',drive_file_link:row.drive_file_link||'',tab:'crisis'})),
    ...list(event.ceremony&&event.ceremony.mc_scripts).map(row=>({id:row.id,title:row.title,category:'典禮及司儀',description:row.note||'',file_url:row.file_url,drive_file_id:row.drive_file_id||'',drive_file_link:row.drive_file_link||'',tab:'mc_scripts'}))
  ],
  group_playbook:publicGroupDuties,
  document_catalog:{total:docs.length, by_category:documentsByCategory, notices:count(event.notices), unit_guides:count(event.unit_guide&&event.unit_guide.docs), staff_guidance:staffGuidance.length, records:documentCatalogRecords},
  completion_checklist:[
    '確認全部活動日文件均已有 2027 擁有的檔案／連結。',
    '由各總主任確認所屬組別崗位、集合位置、交接及聯絡安排。',
    '由行政組在活動日前發佈最終版並標示修訂日期。',
    '確認普通工作人員版本不顯示受限個人及管理資料。'
  ]
};

event.source_of_truth=event.source_of_truth||{};
event.source_of_truth.execution_manual={
  canonical_record:'execution_manual_2027 in ISD 2027 活動主資料',
  staff_output:'MOCK / 2027 工作人員執行手冊',
  update_rule:'先更新 ISD 2027 受控來源，再重建 read model、MOCK 和前端輸出；不得為各組建立平行版本。'
};

fs.writeFileSync(file,JSON.stringify(event,null,2)+'\n');
/* Keep the Drive registry aligned: the manual lives inside the master source,
 * not in a parallel staff-only file.  Existing Drive IDs are intentionally
 * preserved for an in-place controlled-source update. */
if(fs.existsSync(registryFile)){
  const registry=JSON.parse(fs.readFileSync(registryFile,'utf8'));
  const master=(registry.domains||[]).find(domain=>domain.id==='event_master');
  if(!master) throw new Error('2027 Drive registry has no event_master domain');
  master.paths=master.paths||[];
  if(!master.paths.includes('execution_manual_2027')) master.paths.push('execution_manual_2027');
  fs.writeFileSync(registryFile,JSON.stringify(registry,null,2)+'\n');
}
console.log(`Built 2027 execution-manual index: ${schedule.length} programme items, ${event.activities.maps.length} maps, ${boothCount} booths, ${docs.length} document records.`);
