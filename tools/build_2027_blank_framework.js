#!/usr/bin/env node
'use strict';
/*
 * Build the blank, 2027-owned canonical-source framework.
 *
 * The three detailed review maps are the only input: they preserve 2026 as
 * evidence in their D column, but this builder never opens the 2026 archive.
 * It creates one empty 2027 record for each referenced source ID and one
 * read-only output connection for every reviewed output.  Teams later fill a
 * source record in its own domain; outputs must never become editable copies.
 */
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const writeJson=(file,value)=>{
  const target=path.join(root,file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n');
};
const uniq=items=>[...new Set(items.filter(Boolean))];

const REVIEW_MAPS=[
  {id:'public_documents',file:'data/2027_public_documents_dataflow_map.json',label:'公眾文件及入口',count:26},
  {id:'staff_documents',file:'data/2027_staff_documents_dataflow_map.json',label:'工作人員文件及工作視圖',count:25},
  {id:'department_centre',file:'data/2027_department_centre_dataflow_map.json',label:'部門中心及內部輸出',count:58}
];
const DRIVE_DOMAINS={
  system:{folder_code:'00_系統及資料',folder_key:'system',file:'ISD 2027－00_系統及資料－受控來源（空白實框架）.json'},
  registration:{folder_code:'01_報名',folder_key:'registration',file:'ISD 2027－01_報名－受控來源（空白實框架）.json'},
  notices:{folder_code:'02_通知書',folder_key:'notices',file:'ISD 2027－02_通知書－受控來源（空白實框架）.json'},
  rosters:{folder_code:'03_名單',folder_key:'rosters',file:'ISD 2027－03_名單－受控來源（空白實框架）.json'},
  venue:{folder_code:'04_場地',folder_key:'venue',file:'ISD 2027－04_場地－受控來源（空白實框架）.json'},
  programme:{folder_code:'05_程序',folder_key:'programme',file:'ISD 2027－05_程序－受控來源（空白實框架）.json'},
  logistics:{folder_code:'06_後勤',folder_key:'logistics',file:'ISD 2027－06_後勤－受控來源（空白實框架）.json'},
  reference_snapshot:{folder_code:'07_參考快照',folder_key:'reference_snapshot',file:'ISD 2027－07_參考快照－受控來源（空白實框架）.json'}
};
const domainForLocation=location=>{
  const text=String(location);
  if(text.includes('2027目標：公眾輸出層')) return 'system';
  const hit=text.match(/2027目標：(\d{2}_[^／；]+)/);
  const prefix=hit?.[1]||'';
  return ({'00_系統及資料':'system','01_報名':'registration','02_通知書':'notices','03_名單':'rosters','04_場地':'venue','05_程序':'programme','06_後勤':'logistics','07_參考快照':'reference_snapshot'})[prefix]||null;
};
const sourceIds=location=>uniq((String(location).match(/\b(?:IN\d{2}|[A-Z]+(?:-[A-Z0-9]+)+)\b/g)||[]));
const approvalGroups=value=>uniq(String(value||'').split('／').map(v=>v.trim()).filter(v=>v&&v!=='—'));
const sourceKind=id=>{
  if(id.startsWith('IN')) return 'controlled_intake';
  if(id.startsWith('DOC')||id.startsWith('SCRIPT')) return 'controlled_document';
  if(id.startsWith('MAP')||id.startsWith('ASSET')||id.startsWith('BADGE')) return 'controlled_asset';
  if(id.startsWith('REGISTRY')) return 'system_registry';
  if(id.startsWith('PUBLIC')||id.startsWith('NOTICE')) return 'published_channel';
  if(id.startsWith('ARCHIVE')) return 'owned_reference_snapshot';
  return 'structured_dataset';
};
const payloadSchema=kind=>({
  controlled_intake:['submission_id','submitted_at','submitted_by','status','data'],
  controlled_document:['document_title','document_body','audience_scope','publication_status'],
  controlled_asset:['asset_title','asset_file_id','audience_scope','publication_status'],
  system_registry:['registry_entries'],
  published_channel:['title','content_blocks','audience_scope','publication_status'],
  owned_reference_snapshot:['snapshot_name','source_period','retention_rule','snapshot_file_id'],
  structured_dataset:['records']
}[kind]);
const emptyPayload=kind=>kind==='structured_dataset'||kind==='system_registry'?{records:[]}:{};
const ownerFrom=approvals=>approvals[0]||'行政組';
const outputKey=(scope,index)=>`${scope}:${String(index+1).padStart(2,'0')}`;

const sourceMap=new Map();
const outputs=[];
for(const review of REVIEW_MAPS){
  const data=readJson(review.file);
  const rows=data.sections.flatMap(section=>section.flows.map(flow=>({...flow,section_id:section.section_id,section_name:section.section_name})));
  if(rows.length!==review.count) throw new Error(`${review.id} expected ${review.count} outputs; received ${rows.length}`);
  rows.forEach((row,index)=>{
    const ids=sourceIds(row.update_location);
    if(!ids.length) throw new Error(`${review.id}/${row.final_output} has no controlled source ID`);
    const domain=domainForLocation(row.update_location);
    if(!domain) throw new Error(`${review.id}/${row.final_output} has no recognised 2027 target domain`);
    const approvals=approvalGroups(row.central_approval);
    outputs.push({
      output_id:outputKey(review.id,index),
      review_scope:review.id,
      review_section:row.section_name,
      final_output:row.final_output,
      canonical_source_id:ids[0],
      supporting_source_ids:ids.slice(1),
      canonical_read_rule:'read_only_from_canonical_source; no output-side copy or edit',
      output_target:row.update_location.split('；')[0],
      established_group_approval:row.central_approval,
      evidence_2026:row.reference_source,
      framework_state:'connected_to_blank_2027_source'
    });
    ids.forEach(id=>{
      if(!sourceMap.has(id)) sourceMap.set(id,{source_id:id,source_kind:sourceKind(id),canonical_domain:domain,first_target:row.update_location.split('；')[0],approval_groups:[],evidence:[],outputs:[],output_targets:[]});
      const record=sourceMap.get(id);
      // A source may feed outputs stored in other domains (for example an award
      // roster feeds a certificate). Its first source location remains the one
      // canonical home; later rows are read-only output consumers, not copies.
      record.approval_groups.push(...approvals);
      record.evidence.push(row.reference_source);
      record.outputs.push(outputKey(review.id,index));
      record.output_targets.push(row.update_location.split('；')[0]);
    });
  });
}

const sources=[...sourceMap.values()].sort((a,b)=>a.source_id.localeCompare(b.source_id)).map(record=>{
  const domain=DRIVE_DOMAINS[record.canonical_domain];
  const kind=record.source_kind;
  const approvals=uniq(record.approval_groups);
  return {
    source_id:record.source_id,
    source_kind:kind,
    canonical_domain:record.canonical_domain,
    canonical_home:`ISD 2027／${domain.folder_code}／受控來源／${record.source_id}`,
    source_file:domain.file,
    owner_group:ownerFrom(approvals),
    established_group_approvals:approvals,
    framework_state:'blank_2027_owned_source',
    content_status:'blank_awaiting_2027_owner_entry',
    source_schema:{
      required_metadata:['source_id','schema_version','owner_group','approved_by','revision','updated_by','updated_at','audit_id','publication_status'],
      payload_fields:payloadSchema(kind)
    },
    blank_payload:emptyPayload(kind),
    output_ids:uniq(record.outputs),
    output_targets:uniq(record.output_targets),
    evidence_2026:uniq(record.evidence)
  };
});

const sourceRegistry={
  schema_version:'2027-canonical-source-registry-v1',
  event_id:'isd_2027',
  status:'blank_framework_ready_not_live',
  generated_on:'2026-10-06',
  purpose:'The real, blank 2027 framework. Each source ID below has one owned canonical record; a later approved entry is consumed through the connection registry, never copied into outputs.',
  boundary:'2026 reference text is immutable evidence only. There is no 2026 source ID, URL, Sheet or write-back in this framework.',
  domains:Object.entries(DRIVE_DOMAINS).map(([id,value])=>({id,folder_code:value.folder_code,folder_key:value.folder_key,source_file:value.file})),
  source_count:sources.length,
  sources
};
const connectionRegistry={
  schema_version:'2027-output-connection-registry-v1',
  event_id:'isd_2027',
  status:'blank_framework_ready_not_live',
  generated_on:'2026-10-06',
  rule:'A final output reads its canonical source ID. It cannot become a second editable source, a 2026 live link, or a parallel copy.',
  output_count:outputs.length,
  outputs
};

writeJson('data/2027_canonical_source_registry.json',sourceRegistry);
writeJson('data/2027_output_connection_registry.json',connectionRegistry);
for(const [domainId,domain] of Object.entries(DRIVE_DOMAINS)){
  const records=sources.filter(source=>source.canonical_domain===domainId).map(source=>({
    source_id:source.source_id,
    source_kind:source.source_kind,
    owner_group:source.owner_group,
    approved_by:source.established_group_approvals,
    record_state:'blank_awaiting_2027_owner_entry',
    revision:0,
    updated_by:null,
    updated_at:null,
    audit_id:null,
    publication_status:'draft_not_published',
    payload:source.blank_payload
  }));
  writeJson(`data/2027_blank_sources/${domainId}.json`,{
    schema_version:'2027-blank-canonical-domain-v1',
    event_id:'isd_2027',
    domain_id:domainId,
    drive_folder_code:domain.folder_code,
    status:'blank_framework_ready_not_live',
    update_rule:'Only the named owner updates a source record. Outputs read this record through data/2027_output_connection_registry.json; do not make output-side copies.',
    records
  });
}
console.log(`Built blank 2027 framework: ${sources.length} canonical source IDs, ${outputs.length} output connections, ${Object.keys(DRIVE_DOMAINS).length} domain files.`);
