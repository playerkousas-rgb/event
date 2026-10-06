#!/usr/bin/env node
'use strict';
/*
 * Build a REVIEW-ONLY fake 2027 profile from immutable 2026 evidence.
 *
 * This is deliberately separate from data/2027_blank_sources.  It gives the
 * user realistic, editable test values to prove source-to-output propagation,
 * but every generated file is labelled simulation and must never become a
 * 2027 live source without being cleared and re-approved.
 */
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {loadFramework,sourceProjection}=require('./lib/controlled_2027_sources.js');
const root=path.resolve(__dirname,'..');
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const writeJson=(file,value)=>{
  const target=path.join(root,file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n');
};
const clone=value=>JSON.parse(JSON.stringify(value));
const hashFile=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const SIMULATION_STATUS='simulation_seed_from_2026_evidence_not_live';
const SIMULATION_UPDATED_AT='2027-01-15T09:00:00+08:00';
const SIMULATION_AUDIT='SIM-2027-BOOTSTRAP-2026-EVIDENCE';

const evidence=readJson('data/isd_2026.json');
const lock=readJson('data/2026_reference_lock.json');
if(hashFile(lock.reference_file)!==lock.sha256) throw new Error('2026 evidence lock checksum failed');
const blankCatalog=readJson('data/2027_canonical_source_registry.json');
const blankConnections=readJson('data/2027_output_connection_registry.json');
const outputsById=new Map(blankConnections.outputs.map(output=>[output.output_id,output]));

function shiftToSimulation(value){ return String(value||'').replace(/2026/g,'2027 演練').replace(/2025/g,'2026 參考'); }
function trimText(value,max=180){ const text=String(value||'').replace(/\s+/g,' ').trim(); return text.length>max?text.slice(0,max)+'…':text; }
function safeParticipants(){
  return (evidence.participants||[]).map((row,index)=>({
    record_id:`SIM-PARTICIPANT-${String(index+1).padStart(3,'0')}`,
    unit_code:`UNIT-${String(index+1).padStart(3,'0')}`,
    unit_label:`演練旅團 ${String(index+1).padStart(3,'0')}`,
    area:row.area||'未分類',
    headcount:Number(row.headcount||0),
    meal_boxes:Number(row.meal_boxes||0),
    simulation_origin:'2026 participant aggregate (personal contacts removed)'
  }));
}
function safeGuests(){
  return (evidence.guest_roster?.guests||[]).map((row,index)=>({
    record_id:`SIM-GUEST-${String(index+1).padStart(3,'0')}`,
    guest_code:`GUEST-${String(index+1).padStart(3,'0')}`,
    section:row.section||'嘉賓',
    role_title:trimText(row.title||row.scout_title||'受邀嘉賓',90),
    ceremony_part_1:!!row.ceremony_part_1,
    ceremony_part_2:!!row.ceremony_part_2,
    guest_tea:!!row.guest_tea,
    simulation_origin:'2026 guest aggregate (name, car plate and contact removed)'
  }));
}
function safeSchedule(){
  return (evidence.schedule||[]).map((row,index)=>({
    record_id:`SIM-SCHEDULE-${String(index+1).padStart(3,'0')}`,
    sequence:index+1,
    time_slot:row.time_slot||'',
    title:shiftToSimulation(row.title||'活動程序'),
    location:row.location||'待 2027 演練確認',
    owner_group:row.group_name||'行政組',
    simulation_origin:'2026 programme timing pattern'
  }));
}
function safeBooths(){
  const rows=evidence.activities?.booths||evidence.activities?.activities||[];
  return rows.slice(0,60).map((row,index)=>({
    record_id:`SIM-BOOTH-${String(index+1).padStart(3,'0')}`,
    booth_code:`BOOTH-${String(index+1).padStart(3,'0')}`,
    zone:row.zone||row.area||row.location||'演練區',
    title:shiftToSimulation(row.name||row.title||row.activity_name||`主題活動 ${index+1}`),
    simulation_origin:'2026 booth/activity structure (contacts removed)'
  }));
}
function safeOrganisation(){
  return (evidence.staff?.org_chart||[]).slice(0,80).map((row,index)=>({
    record_id:`SIM-ORG-${String(index+1).padStart(3,'0')}`,
    group_name:row.group||row.group_name||row.level||'未分類組別',
    role_title:row.title||row.role||'演練職務',
    assigned_count:String(row.names||'').split(/[、，,/\n]+/).filter(Boolean).length,
    simulation_origin:'2026 organisation structure (names removed)'
  }));
}
function safeMeals(){
  const distribution=evidence.meal_distribution_2026||{};
  const menu=(evidence.meal_menu_2026||[]).slice(0,12).map((row,index)=>({
    record_id:`SIM-MENU-${String(index+1).padStart(2,'0')}`,
    option_code:`MEAL-${String(index+1).padStart(2,'0')}`,
    label:trimText(Array.isArray(row)?row.filter(Boolean).join('／'):Object.values(row||{}).filter(Boolean).join('／'),120),
    simulation_origin:'2026 meal menu structure'
  }));
  return {menu,summary:[{
    record_id:'SIM-MEAL-SUMMARY-001',
    ordered_total:Number(distribution.ordered||distribution.totals?.ordered||0),
    staff_group_count:Array.isArray(distribution.staff_groups)?distribution.staff_groups.length:0,
    booth_count:Array.isArray(distribution.booths)?distribution.booths.length:0,
    simulation_origin:'2026 meal distribution aggregate'
  }]};
}
function safeCeremony(){
  const scripts=(evidence.ceremony?.mc_scripts||[]).map((row,index)=>({
    record_id:`SIM-SCRIPT-${String(index+1).padStart(2,'0')}`,
    part:row.part||`第 ${index+1} 部分`,
    title:shiftToSimulation(row.title||'典禮司儀稿'),
    version:`SIM-${row.version||'1'}`,
    pages:Number(row.pages||0),
    note:shiftToSimulation(trimText(row.note,160)),
    simulation_origin:'2026 ceremony script metadata (people and full script removed)'
  }));
  const routeSource=evidence.ceremony?.inspection_route||{};
  const routeRows=Array.isArray(routeSource)?routeSource:(routeSource.steps||[]);
  const route=routeRows.map((row,index)=>({
    record_id:`SIM-ROUTE-${String(index+1).padStart(2,'0')}`,
    sequence:index+1,
    step:shiftToSimulation(trimText(row.step||row.title||row.question||String(row),140)),
    simulation_origin:'2026 inspection route structure'
  }));
  return {scripts,route};
}
function safeDocuments(source){
  const outputTitle=source.output_ids.map(id=>outputsById.get(id)?.final_output).filter(Boolean)[0]||source.source_id;
  const candidate=(evidence.documents||[]).find(doc=>String(doc.title||'').includes(String(outputTitle).slice(0,4)));
  return [{
    record_id:`SIM-${source.source_id}-001`,
    document_title:shiftToSimulation(candidate?.title||outputTitle),
    template_body:`2027 演練文件：${outputTitle}。修改此句可驗證 ${source.source_id} 的相依輸出。`,
    source_file_state:'simulation_template_only',
    simulation_origin:candidate?'2026 document metadata (file URL omitted)':'2026 output evidence mapping'
  }];
}
function genericRecord(source){
  const outputTitles=source.output_ids.map(id=>outputsById.get(id)?.final_output).filter(Boolean);
  return [{
    record_id:`SIM-${source.source_id}-001`,
    simulation_title:`2027 演練：${outputTitles[0]||source.source_id}`,
    editable_test_value:`測試值：${source.source_id}／revision 1`,
    dependent_output_count:source.output_ids.length,
    evidence_basis:source.evidence_2026[0]||'2026 evidence review',
    simulation_origin:'2026 evidence interpretation; no live link'
  }];
}
function seedRecords(source,assets){
  const id=source.source_id;
  if(id==='DATA-PARTICIPANT'||id==='DATA-UG-ATTENDANCE') return assets.participants;
  if(id==='DATA-GUEST') return assets.guests;
  if(id==='DATA-BOOTH'||id==='DATA-THEME-PROGRAMME'||id==='DATA-BORROW') return assets.booths;
  if(id==='DATA-ORGANISATION'||id==='DATA-JOB-DUTY'||id==='SCHEDULE-STAFF') return assets.organisation;
  if(id==='DATA-MENU') return assets.meals.menu;
  if(id.startsWith('DATA-MEAL')||id==='DATA-STAFF-MEAL') return assets.meals.summary;
  if(id==='DATA-CEREMONY-PROGRAMME'||id.startsWith('SCRIPT-')) return assets.ceremony.scripts;
  if(id==='DATA-INSPECTION-ROUTE') return assets.ceremony.route;
  if(id.startsWith('SCHEDULE-')) return assets.schedule;
  if(id.startsWith('DOC-')||id.startsWith('NOTICE-')||id.startsWith('ASSET-')||id.startsWith('MAP-')||id.startsWith('BADGE-')) return safeDocuments(source);
  return genericRecord(source);
}

const assets={participants:safeParticipants(),guests:safeGuests(),schedule:safeSchedule(),booths:safeBooths(),organisation:safeOrganisation(),meals:safeMeals(),ceremony:safeCeremony()};
const simulationCatalog=clone(blankCatalog);
simulationCatalog.schema_version='2027-simulation-source-registry-v1';
simulationCatalog.status=SIMULATION_STATUS;
simulationCatalog.simulation_only=true;
simulationCatalog.simulation_label='2027 演練資料（由 2026 封存證據一次性推導，非 live）';
simulationCatalog.generated_on='2026-10-06';
simulationCatalog.domains.forEach(domain=>{domain.source_file=domain.source_file.replace('空白實框架','模擬覆核（非 live）');});
simulationCatalog.purpose='Review-only fake 2027 data derived once from locked 2026 evidence. It exists so reviewers can alter a canonical simulation source and observe dependent outputs. Never use it as a live 2027 source.';
simulationCatalog.simulation_boundary={source_event:'isd_2026',reference_file:lock.reference_file,reference_sha256:lock.sha256,mode:'one_time_derived_simulation_not_live',reset_rule:'Delete/rebuild this simulation profile before real 2027 entry.'};
simulationCatalog.sources.forEach(source=>{
  source.source_file=source.source_file.replace('空白實框架','模擬覆核（非 live）');
  source.framework_state='simulation_2027_owned_source';
  source.content_status='simulation_seed_ready_for_review';
  source.simulation_only=true;
  source.simulation_label='2027 演練資料（由 2026 封存證據一次性推導）';
});
const simulationConnections=clone(blankConnections);
simulationConnections.schema_version='2027-simulation-output-connection-registry-v1';
simulationConnections.status=SIMULATION_STATUS;
simulationConnections.simulation_only=true;
simulationConnections.simulation_label='2027 演練 output pointers（非 live）';
simulationConnections.rule='Simulation only: each output resolves its current simulation canonical source. It is never a 2026 live link or a production output copy.';
simulationConnections.outputs.forEach(output=>{output.framework_state='connected_to_simulation_2027_source';output.simulation_only=true;});
writeJson('data/2027_simulation_source_registry.json',simulationCatalog);
writeJson('data/2027_simulation_output_connection_registry.json',simulationConnections);
for(const domain of simulationCatalog.domains){
  const records=simulationCatalog.sources.filter(source=>source.canonical_domain===domain.id).map(source=>({
    source_id:source.source_id,
    source_kind:source.source_kind,
    owner_group:source.owner_group,
    approved_by:source.established_group_approvals,
    record_state:'approved_2027_source',
    revision:1,
    updated_by:source.owner_group,
    updated_at:SIMULATION_UPDATED_AT,
    audit_id:SIMULATION_AUDIT,
    approval_record:{approved_by:source.established_group_approvals[0]||source.owner_group,approved_at:SIMULATION_UPDATED_AT},
    publication_status:'approved',
    simulation_only:true,
    simulation_origin:'2026 immutable evidence; generated once for 2027 review',
    payload:{records:seedRecords(source,assets).map((record,index)=>({
      ...record,
      editable_test_value:record.editable_test_value||`測試值：${source.source_id}／樣本 ${index+1}／revision 1`
    }))}
  }));
  writeJson(`data/2027_simulation_sources/${domain.id}.json`,{
    schema_version:'2027-simulation-canonical-domain-v1',
    event_id:'isd_2027',
    domain_id:domain.id,
    drive_folder_code:domain.folder_code,
    status:SIMULATION_STATUS,
    simulation_only:true,
    update_rule:'Review profile only. Change a canonical simulation source, then rebuild the projection/review to inspect its dependent outputs. Never publish this profile as real 2027 data.',
    records
  });
}
const framework=loadFramework(root,'simulation');
const errors=require('./lib/controlled_2027_sources.js').validateFramework(framework);
if(errors.length) throw new Error(`simulation framework failed validation:\n- ${errors.join('\n- ')}`);
const projection=sourceProjection(framework);
projection.schema_version='2027-simulation-output-source-projection-v1';
projection.simulation_only=true;
projection.simulation_label='2027 演練輸出指標（非 live）';
projection.generated_from_2026_sha256=lock.sha256;
writeJson('data/2027_simulation_output_source_projection.json',projection);
const review={
  schema_version:'2027-simulation-review-v1',event_id:'isd_2027',status:SIMULATION_STATUS,simulation_only:true,
  simulation_label:'2027 演練覆核畫面資料（非 live）',
  note:'Review display only. Change a simulation source using the local review server or source-change tool, then regenerate this file. Real 2027 data remains blank and untouched.',
  source_count:simulationCatalog.source_count,output_count:projection.output_count,
  outputs:projection.outputs.map(pointer=>{
    const source=framework.sources.get(pointer.canonical_source_id).record;
    const first=source.payload.records[0]||{};
    return {...pointer,preview_title:first.simulation_title||first.document_title||first.title||pointer.final_output,preview_value:first.editable_test_value||first.template_body||pointer.final_output,dependent_output_count:simulationCatalog.sources.find(item=>item.source_id===pointer.canonical_source_id).output_ids.length};
  })
};
writeJson('data/2027_simulation_review.json',review);
writeJson('data/2027_simulation_change_audit.json',{
  schema_version:'2027-simulation-change-audit-v1',event_id:'isd_2027',status:SIMULATION_STATUS,simulation_only:true,
  simulation_label:'2027 演練來源變更審計（非 live）',
  note:'Simulation-only audit history. Re-running the locked-evidence bootstrap resets this log and fake source revisions to their reproducible seed.',
  entry_count:1,
  entries:[{
    audit_id:SIMULATION_AUDIT,
    action:'simulation_bootstrap_from_locked_2026_evidence',
    occurred_at:SIMULATION_UPDATED_AT,
    actor_group:'system simulation builder',
    source_count:simulationCatalog.source_count,
    output_count:projection.output_count,
    evidence_sha256:lock.sha256,
    rule:'One-time seed only; never a 2026 live link or real 2027 publication.'
  }]
});
console.log(`Built fake 2027 simulation from locked 2026 evidence: ${simulationCatalog.source_count} sources, ${projection.output_count} ready outputs, ${assets.participants.length} anonymised participant patterns, ${assets.guests.length} anonymised guest patterns.`);
