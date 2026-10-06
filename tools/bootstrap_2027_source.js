#!/usr/bin/env node
'use strict';
/*
 * 一次性 2026 → 2027 種籽遷移器。
 *
 * 這不是日常 builder：它把已完成、唯讀的 2026 參考快照轉成一份
 * 2027 自有的 starting snapshot。完成後，2027 的日常重建只讀
 * data/isd_2027.json／ISD 2027 Drive folder，絕不再讀 isd_2026。
 *
 * This script deliberately reads the current 2027 rehearsal product rather than
 * the 2026 archive. That product was the approved one-time 2026-derived seed;
 * retaining the provenance hash below makes the lineage auditable without
 * retaining a live data dependency.
 */
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const writeJson=(file,value)=>fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2)+'\n');
const clone=value=>JSON.parse(JSON.stringify(value));

const DRIVE={
  root_folder_id:'1qzaHkoua5Se2rOn1z6LljVmlIq-oae3Q',
  root_folder_link:'https://drive.google.com/drive/folders/1qzaHkoua5Se2rOn1z6LljVmlIq-oae3Q',
  folders:{
    system:'1hMIWMjJx02er0B-sAyviJ2IzYdqLjWZR',
    registration:'1CW5QljmlMUKQa69vNQwkMb_1EvKkF59n',
    notices:'1AmFGWgduaiFDwQ7vnG4R3ny0W4moCR8S',
    rosters:'1--quc9LEdyZMJOPSGnGMjR5BGv1gtG00',
    venue:'1rg4ikkJAEz1C0qonfh0x7QepFqMxCPHE',
    programme:'1F0j-3qQhqvEXNUpBh0748BY4sMZbG0pC',
    logistics:'1T8nK5yuFiUc-LS4_Rv8N1x8dYirB9e1g',
    templates:'1upCRCZ-i05Nx49zctaBwv6QK42_5QFsE',
    reference_snapshot:'16xOvkXVcxLJcVGSej9g9xvVDKunfvAgc'
  }
};

/* 2026 Drive URLs must never remain live dependencies of the 2027 data set.
 * Keep a field empty until a 2027-owned copy is linked in the Drive registry. */
function stripLegacyUrls(value,key=''){
  if(Array.isArray(value)) return value.map(v=>stripLegacyUrls(v));
  if(value&&typeof value==='object'){
    const out={};
    for(const [k,v] of Object.entries(value)){
      if(typeof v==='string' && /^https?:\/\//i.test(v) && /(url|link)$/i.test(k)){
        out[k]='';
        out[`${k}_state`]='awaiting_2027_owned_copy';
      } else if(/(?:^|_)(?:source_)?(?:drive_)?file_id$|(?:^|_)(?:drive_id|google_drive_id|source_drive_id|sheet_id|folder_id|doc_id|gid)$/i.test(k)) {
        // A copied record may keep its stable record `id`, but never an ID that
        // addresses the old Drive/Sheet object. A 2027 owner links its own copy.
        out[k]='';
        out[`${k}_state`]='awaiting_2027_owned_copy';
      } else out[k]=stripLegacyUrls(v,k);
    }
    return out;
  }
  return value;
}
function rename2026DataKeys(value){
  if(Array.isArray(value)) return value.map(rename2026DataKeys);
  if(value&&typeof value==='object'){
    const out={};
    for(const [rawKey,rawValue] of Object.entries(value)){
      const key={
        staff_meals_2026:'staff_meals', meal_menu_2026:'meal_menu',
        meal_distribution_2026:'meal_distribution', meal_logistics_2026:'meal_logistics',
        staff_roster_2026:'staff_roster'
      }[rawKey]||rawKey;
      out[key]=rename2026DataKeys(rawValue);
    }
    return out;
  }
  return value;
}
function replaceSourceLabels(value){
  if(Array.isArray(value)) return value.map(replaceSourceLabels);
  if(value&&typeof value==='object'){
    const out={};
    for(const [k,v] of Object.entries(value)) out[k]=replaceSourceLabels(v);
    return out;
  }
  if(typeof value==='string') return value
    .replaceAll('data/isd_2026.json','2027_reference_seed')
    .replaceAll('isd_2026','2027_reference_seed')
    .replaceAll('ISD2026','ISD2027');
  return value;
}

const referenceLock=readJson('data/2026_reference_lock.json');
const priorRegistry=fs.existsSync(path.join(root,'data/2027_drive_registry.json')) ? readJson('data/2027_drive_registry.json') : null;
const rehearsal=readJson('data/mock_demo.json');
let event=replaceSourceLabels(rename2026DataKeys(stripLegacyUrls(clone(rehearsal))));

delete event.mock_fill_source;
delete event.mock_demo_source;
delete event.link_registry;
event.event_id='isd_2027';
event.event_name='2027 港島童軍繽紛日';
event.description='2027 港島童軍繽紛日的受控籌備資料。此為一次性參考種籽，後續只可在 ISD 2027 來源資料夾或 2027 前端流程更新。';
event.data_version='2027-drive-source-v1';
event.drive=Object.assign({},DRIVE,{
  source_mode:'drive_folder_canonical',
  update_rule:'只可經 ISD 2027 資料夾受控來源或 2027 前端／後端流程修改；repo JSON 是發佈快照，不是手改來源。',
  registry_file:'ISD 2027－資料主索引.json'
});
event.source_of_truth={
  canonical_location:'Google Drive / ISD 2027',
  canonical_folder_id:DRIVE.root_folder_id,
  read_model:'data/isd_2027.json',
  mock_product:'data/mock_demo.json',
  write_channels:['ISD 2027 Drive controlled sources','2027 frontend through the 2027 backend'],
  forbidden_write_channels:['data/isd_2026.json','2026 Drive folders','2026 Google Sheet / backend'],
  audit_required:true
};
event.one_time_reference_seed={
  status:'completed',
  reference_event:'isd_2026',
  reference_archive_sha256:referenceLock.sha256,
  reference_archive_git_commit:referenceLock.verified_pre_event_source?.commit||'',
  seed_scope:'2026 operational experience copied once as 2027 rehearsal starting records',
  live_reference_dependency:false,
  copied_at:'2026-10-06',
  handling:'Each copied record is a 2027 reference seed, not a confirmed 2027 operational record. Replace or confirm it in the 2027 source before publishing.'
};
event.record_state={
  default_seed_state:'reference_seed_pending_2027_confirmation',
  rule:'2027 owners update the existing 2027 record in place; the audit log records who, when and what changed. Do not create parallel department copies.'
};
event.future_data_intake={
  status:'active_2027_source_contract',
  source_folder_id:DRIVE.root_folder_id,
  public_intake_page:true,
  direct_write_to_main_sheet:true,
  committee_frontend_access:true,
  committee_can_correct:true,
  backend_separation:{
    current_2026_backend:'blocked_for_2027',
    future_2027_backend:'ISD2027_GAS_URL / ISD2027_APIKEY (deployment required)',
    rule:'2027 frontend writes only to the 2027 backend and its 2027-owned Sheet / Drive sources; it must reject event_id isd_2026.',
    status:'2027 endpoint pending deployment'
  },
  audit_trail:{enabled:true,storage:'2027 Audit_Log',immutable_source_rows:true,fields:['audit_id','module','record_id','action','updated_by','updated_at','record_snapshot']}
};

const domains=[
  {id:'event_master',folder:'system',file:'ISD 2027－活動主資料.json',paths:['event_id','event_name','description','data_version','drive','source_of_truth','one_time_reference_seed','record_state','future_data_intake','public_channel_2027','execution_manual_2027']},
  {id:'registration',folder:'registration',file:'ISD 2027－報名及旅團資料.json',paths:['participants','participants_source','troop_checkin','troop_checkin_source','roster_seed']},
  {id:'notices',folder:'notices',file:'ISD 2027－通告及公眾資訊.json',paths:['notices','announcements','unit_guide','documents']},
  {id:'rosters',folder:'rosters',file:'ISD 2027－人員、嘉賓及典禮名單.json',paths:['users','staff','guest_roster','guest_transport','ceremony']},
  {id:'venue',folder:'venue',file:'ISD 2027－場地、攤位及泊車資料.json',paths:['activities','supplies','parking_source']},
  {id:'programme',folder:'programme',file:'ISD 2027－日程及會議資料.json',paths:['schedule','schedule_source','meetings']},
  {id:'logistics',folder:'logistics',file:'ISD 2027－後勤、安全及財務資料.json',paths:['meals','staff_meals','meal_menu','meal_distribution','meal_logistics','meals_source','finance','crisis','souvenirs','activity_day_sources']}
];
const priorDomainById=Object.fromEntries(((priorRegistry&&priorRegistry.domains)||[]).map(domain=>[domain.id,domain]));
domains.forEach(domain=>{
  const prior=priorDomainById[domain.id]||{};
  if(prior.drive_file_id) domain.drive_file_id=prior.drive_file_id;
  if(prior.drive_file_link) domain.drive_file_link=prior.drive_file_link;
});
const registry={
  schema_version:'2027-drive-registry-v1', event_id:'isd_2027',
  canonical_root:DRIVE,
  generated_from:'data/isd_2027.json',
  update_policy:'The Drive files below are the 2027-controlled source. Regenerate the repo read model and mock only through the 2027 importer/builders; never edit a 2026 source to change 2027.',
  registry_file:(priorRegistry&&priorRegistry.registry_file)||null,
  execution_manual_assets:(priorRegistry&&priorRegistry.execution_manual_assets)||[],
  domains
};
writeJson('data/isd_2027.json',event);
writeJson('data/2027_drive_registry.json',registry);
console.log('Created independent 2027 source snapshot: data/isd_2027.json');
console.log('Created Drive source registry: data/2027_drive_registry.json');
console.log('2026 live reference was not read; provenance hash only:',referenceLock.sha256);
