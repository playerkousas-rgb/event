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
function state(){
  const {framework,review}=rebuildReview();
  return {
    review,
    sources:framework.catalog.sources.map(source=>{
      const record=framework.sources.get(source.source_id).record;
      const first=record.payload.records[0]||{};
      return {source_id:source.source_id,owner_group:source.owner_group,canonical_domain:source.canonical_domain,revision:record.revision,approved_by:record.approved_by,editable_test_value:first.editable_test_value||'',dependent_outputs:source.output_ids.map(id=>framework.connections.outputs.find(output=>output.output_id===id)?.final_output).filter(Boolean)};
    })
  };
}
function applyTestValue(body){
  const sourceId=String(body.source_id||'');
  const value=String(body.editable_test_value||'').trim();
  if(!sourceId||!value) throw new Error('source_id and editable_test_value are required');
  const framework=loadFramework(root,'simulation');
  const located=framework.sources.get(sourceId);
  if(!located) throw new Error(`unknown simulation source: ${sourceId}`);
  const payload=JSON.parse(JSON.stringify(located.record.payload));
  if(!Array.isArray(payload.records)||!payload.records.length) payload.records=[{record_id:`SIM-${sourceId}-001`}];
  payload.records[0].editable_test_value=value;
  const next=applyApprovedChange(framework,{
    source_id:sourceId,
    updated_by:located.record.owner_group,
    approved_by:located.record.approved_by[0],
    updated_at:new Date().toISOString(),
    audit_id:`SIM-REVIEW-${sourceId}-${Date.now()}`,
    publication_status:'approved',
    payload
  });
  writeFramework(root,next);
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
