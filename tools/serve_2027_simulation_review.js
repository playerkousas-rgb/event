#!/usr/bin/env node
'use strict';
/* Local, review-only source editor for the fake 2027 profile.
 * It never opens 2026 data and never writes the blank / production framework. */
const http=require('http');
const fs=require('fs');
const path=require('path');
const {loadFramework,applyApprovedChange,writeFramework,sourceProjection}=require('./lib/controlled_2027_sources.js');
const root=path.resolve(__dirname,'..');
const port=Number(process.env.PORT||4177);
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const writeJson=(file,value)=>fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2)+'\n');
const SIMULATION_AUDIT_FILE='data/2027_simulation_change_audit.json';
const send=(res,status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(typeof body==='string'?body:JSON.stringify(body));};
function rebuildReview(){
  const framework=loadFramework(root,'simulation');
  const projection=sourceProjection(framework);
  projection.schema_version='2027-simulation-output-source-projection-v1';
  projection.simulation_only=true;
  projection.simulation_label='2027 演練輸出指標（非 live）';
  const review={
    schema_version:'2027-simulation-review-v1',event_id:'isd_2027',status:projection.status,simulation_only:true,
    simulation_label:'2027 演練覆核畫面資料（非 live）',
    note:'Review display only. This fake profile must never become real 2027 data.',
    source_count:framework.catalog.source_count,output_count:projection.output_count,
    outputs:projection.outputs.map(pointer=>{
      const record=framework.sources.get(pointer.canonical_source_id).record;
      const first=record.payload.records[0]||{};
      const catalog=framework.catalog.sources.find(item=>item.source_id===pointer.canonical_source_id);
      return {...pointer,preview_title:first.simulation_title||first.document_title||first.title||pointer.final_output,preview_value:first.editable_test_value||first.template_body||pointer.final_output,dependent_output_count:catalog.output_ids.length};
    })
  };
  writeJson('data/2027_simulation_output_source_projection.json',projection);
  writeJson('data/2027_simulation_review.json',review);
  return {framework,review};
}
function loadAudit(){
  const audit=readJson(SIMULATION_AUDIT_FILE);
  if(audit.status!=='simulation_seed_from_2026_evidence_not_live'||audit.simulation_only!==true||!Array.isArray(audit.entries)) throw new Error('invalid simulation audit log');
  return audit;
}
function appendAudit(entry){
  const audit=loadAudit();
  audit.entries.unshift(entry);
  audit.entry_count=audit.entries.length;
  writeJson(SIMULATION_AUDIT_FILE,audit);
  return entry;
}
function state(){
  const {framework,review}=rebuildReview();
  const audit=loadAudit();
  const latestBySource=new Map();
  for(const entry of audit.entries) if(entry.source_id&&!latestBySource.has(entry.source_id)) latestBySource.set(entry.source_id,entry);
  return {
    review,
    audit_entry_count:audit.entry_count,
    recent_audit_entries:audit.entries.slice(0,12),
    sources:framework.catalog.sources.map(source=>{
      const record=framework.sources.get(source.source_id).record;
      const first=record.payload.records[0]||{};
      return {source_id:source.source_id,owner_group:source.owner_group,canonical_domain:source.canonical_domain,revision:record.revision,approved_by:record.approved_by,editable_test_value:first.editable_test_value||'',last_audit:latestBySource.get(source.source_id)||null,dependent_outputs:source.output_ids.map(id=>framework.connections.outputs.find(output=>output.output_id===id)?.final_output).filter(Boolean)};
    })
  };
}
function applyTestValue(body){
  const sourceId=String(body.source_id||'');
  const value=String(body.editable_test_value||'').trim();
  const expectedRevision=body.expected_revision;
  if(!sourceId||!value) throw new Error('source_id and editable_test_value are required');
  if(!Number.isInteger(expectedRevision)||expectedRevision<1) throw new Error('expected_revision must be the currently displayed simulation revision');
  const framework=loadFramework(root,'simulation');
  const located=framework.sources.get(sourceId);
  if(!located) throw new Error(`unknown simulation source: ${sourceId}`);
  if(located.record.revision!==expectedRevision) throw new Error(`Revision conflict: ${sourceId} is now revision ${located.record.revision}; refresh and review the latest simulation value before retrying`);
  const payload=JSON.parse(JSON.stringify(located.record.payload));
  if(!Array.isArray(payload.records)||!payload.records.length) payload.records=[{record_id:`SIM-${sourceId}-001`}];
  const previousValue=payload.records[0].editable_test_value||'';
  payload.records[0].editable_test_value=value;
  const updatedAt=new Date().toISOString();
  const auditId=`SIM-REVIEW-${sourceId}-${Date.now()}`;
  const next=applyApprovedChange(framework,{
    source_id:sourceId,
    updated_by:located.record.owner_group,
    approved_by:located.record.approved_by[0],
    updated_at:updatedAt,
    audit_id:auditId,
    publication_status:'approved',
    payload
  });
  const updated=next.sources.get(sourceId).record;
  writeFramework(root,next);
  appendAudit({
    audit_id:auditId,
    action:'simulation_source_edit',
    occurred_at:updatedAt,
    source_id:sourceId,
    source_domain:located.domain,
    actor_group:located.record.owner_group,
    approved_by:located.record.approved_by[0],
    before_revision:located.record.revision,
    after_revision:updated.revision,
    changed_record_id:payload.records[0].record_id||null,
    previous_preview_value:previousValue,
    updated_preview_value:value,
    dependent_output_ids:framework.connections.outputs.filter(output=>output.canonical_source_id===sourceId).map(output=>output.output_id),
    simulation_only:true
  });
  return state();
}
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/simulation-review.html')){
    return send(res,200,fs.readFileSync(path.join(root,'simulation-review.html'),'utf8'),'text/html; charset=utf-8');
  }
  if(req.method==='GET'&&url.pathname==='/api/simulation/state'){
    try{return send(res,200,state());}catch(error){return send(res,500,{error:String(error)});}
  }
  if(req.method==='POST'&&url.pathname==='/api/simulation/source'){
    let text='';
    req.on('data',chunk=>{text+=chunk; if(text.length>200000) req.destroy();});
    req.on('end',()=>{try{return send(res,200,applyTestValue(JSON.parse(text||'{}')));}catch(error){return send(res,400,{error:String(error)});}});
    return;
  }
  send(res,404,{error:'not found'});
});
server.listen(port,'0.0.0.0',()=>console.log(`2027 simulation review → http://0.0.0.0:${port}`));
