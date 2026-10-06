#!/usr/bin/env node
'use strict';
/*
 * Pure controlled-source resolver for the blank ISD 2027 framework.
 *
 * It deliberately has no Drive, GAS, frontend or 2026 dependency. A future
 * adapter may load the same eight Drive files, but all validation and output
 * relationships live here: one approved source record is shared by all of its
 * dependent outputs, never copied into an output-owned record.
 */
const fs=require('fs');
const path=require('path');

const DOMAIN_FILES={
  system:'system.json', registration:'registration.json', notices:'notices.json',
  rosters:'rosters.json', venue:'venue.json', programme:'programme.json',
  logistics:'logistics.json', reference_snapshot:'reference_snapshot.json'
};
const FRAMEWORK_PROFILES={
  blank:{catalog:'data/2027_canonical_source_registry.json',connections:'data/2027_output_connection_registry.json',source_dir:'data/2027_blank_sources',status:'blank_framework_ready_not_live'},
  simulation:{catalog:'data/2027_simulation_source_registry.json',connections:'data/2027_simulation_output_connection_registry.json',source_dir:'data/2027_simulation_sources',status:'simulation_seed_from_2026_evidence_not_live'}
};
function frameworkProfile_(profile){
  const found=FRAMEWORK_PROFILES[profile||'blank'];
  if(!found) throw new Error(`unknown 2027 framework profile: ${profile}`);
  return found;
}
const BLOCKED_LIVE_REFERENCES=['data/isd_2026.json','ISD2026_GAS_URL','event_id=isd_2026'];
const clone=value=>JSON.parse(JSON.stringify(value));
const readJson=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const writeJson=(root,file,value)=>fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2)+'\n');
const nonEmptyString=value=>typeof value==='string'&&value.trim().length>0;

function loadFramework(root,profile='blank'){
  const profileConfig=frameworkProfile_(profile);
  const catalog=readJson(root,profileConfig.catalog);
  const connections=readJson(root,profileConfig.connections);
  const domains={};
  for(const [domain,file] of Object.entries(DOMAIN_FILES)) domains[domain]=readJson(root,`${profileConfig.source_dir}/${file}`);
  const sources=new Map();
  for(const [domain,data] of Object.entries(domains)) for(const record of data.records){
    if(sources.has(record.source_id)) throw new Error(`duplicate controlled source ID: ${record.source_id}`);
    sources.set(record.source_id,{domain,record});
  }
  return {profile,profileConfig,catalog,connections,domains,sources};
}

function validateFramework(framework){
  const errors=[];
  if(framework.catalog.status!==framework.profileConfig.status) errors.push('catalog status does not match the selected framework profile');
  if(framework.connections.status!==framework.profileConfig.status) errors.push('connection registry status does not match the selected framework profile');
  if(framework.catalog.source_count!==framework.sources.size) errors.push('catalog source count does not match domain records');
  if(framework.connections.output_count!==framework.connections.outputs.length) errors.push('connection output count is invalid');
  const catalogIds=new Set(framework.catalog.sources.map(x=>x.source_id));
  for(const id of framework.sources.keys()) if(!catalogIds.has(id)) errors.push(`domain source is absent from catalog: ${id}`);
  for(const item of framework.catalog.sources) if(!framework.sources.has(item.source_id)) errors.push(`catalog source is absent from domain files: ${item.source_id}`);
  for(const output of framework.connections.outputs){
    if(!framework.sources.has(output.canonical_source_id)) errors.push(`${output.output_id} has unknown primary source`);
    for(const id of output.supporting_source_ids||[]) if(!framework.sources.has(id)) errors.push(`${output.output_id} has unknown supporting source ${id}`);
    if(output.canonical_read_rule!=='read_only_from_canonical_source; no output-side copy or edit') errors.push(`${output.output_id} has an unsafe output rule`);
  }
  // A simulation catalogue records the immutable evidence file/hash as provenance.
  // Its actual domain payloads and output connections must still be free of live
  // 2026 URLs/endpoints. The real blank profile checks its whole catalogue too.
  const liveText=JSON.stringify(framework.profile==='simulation'?{connections:framework.connections,domains:framework.domains}:{catalog:framework.catalog,connections:framework.connections,domains:framework.domains});
  for(const blocked of BLOCKED_LIVE_REFERENCES) if(liveText.includes(blocked)) errors.push(`framework contains a blocked live reference: ${blocked}`);
  return errors;
}

function lookupOutput(framework,outputId){
  const output=framework.connections.outputs.find(item=>item.output_id===outputId);
  if(!output) throw new Error(`unknown output ID: ${outputId}`);
  const primary=framework.sources.get(output.canonical_source_id);
  const supporting=(output.supporting_source_ids||[]).map(id=>framework.sources.get(id));
  return {output,primary,supporting};
}

function resolveOutput(framework,outputId){
  const {output,primary,supporting}=lookupOutput(framework,outputId);
  const record=primary.record;
  const approved=record.publication_status==='approved'&&record.record_state==='approved_2027_source'&&record.revision>0;
  return {
    output_id:output.output_id,
    final_output:output.final_output,
    state:approved?'ready_to_render':'waiting_for_approved_2027_source',
    canonical_source:{source_id:record.source_id,domain:primary.domain,revision:record.revision,publication_status:record.publication_status},
    supporting_sources:supporting.map(item=>({source_id:item.record.source_id,domain:item.domain,revision:item.record.revision,publication_status:item.record.publication_status})),
    // This is intentionally a direct source record pointer, not a copied output value.
    source_record:approved?record:null
  };
}

function validateChange(change,existing){
  if(!change||typeof change!=='object') throw new Error('source change must be an object');
  if(!nonEmptyString(change.source_id)) throw new Error('source change needs source_id');
  if(!nonEmptyString(change.updated_by)) throw new Error('source change needs updated_by');
  if(!nonEmptyString(change.updated_at)||Number.isNaN(Date.parse(change.updated_at))) throw new Error('source change needs an ISO updated_at timestamp');
  if(!nonEmptyString(change.audit_id)) throw new Error('source change needs audit_id');
  if(!nonEmptyString(change.approved_by)) throw new Error('source change needs approved_by');
  if(change.publication_status!=='approved') throw new Error('only an approved change can enter the controlled source layer');
  if(!Object.prototype.hasOwnProperty.call(change,'payload')||!change.payload||typeof change.payload!=='object'||Array.isArray(change.payload)) throw new Error('source change needs an object payload');
  if(!Array.isArray(existing.approved_by)||!existing.approved_by.includes(change.approved_by)) throw new Error(`${change.approved_by} is not an established approval group for ${existing.source_id}`);
  if(existing.owner_group!==change.updated_by) throw new Error(`${change.updated_by} is not the owner group for ${existing.source_id}`);
  if(existing.source_kind==='structured_dataset'||existing.source_kind==='system_registry'){
    if(!Array.isArray(change.payload.records)) throw new Error(`${existing.source_id} needs payload.records as an array`);
  }
  const payloadText=JSON.stringify(change.payload);
  for(const blocked of BLOCKED_LIVE_REFERENCES) if(payloadText.includes(blocked)) throw new Error(`source payload contains a blocked live reference: ${blocked}`);
}

function applyApprovedChange(framework,change){
  const current=framework.sources.get(change?.source_id);
  if(!current) throw new Error(`unknown source ID: ${change?.source_id||''}`);
  validateChange(change,current.record);
  const next=clone(framework);
  const record=next.domains[current.domain].records.find(item=>item.source_id===change.source_id);
  record.payload=clone(change.payload);
  record.record_state='approved_2027_source';
  record.revision+=1;
  record.updated_by=change.updated_by;
  record.updated_at=change.updated_at;
  record.audit_id=change.audit_id;
  record.approval_record={approved_by:change.approved_by,approved_at:change.updated_at};
  record.publication_status='approved';
  next.sources=new Map();
  for(const [domain,data] of Object.entries(next.domains)) for(const item of data.records) next.sources.set(item.source_id,{domain,record:item});
  return next;
}

function sourceProjection(framework){
  const errors=validateFramework(framework);
  if(errors.length) throw new Error(`invalid framework:\n- ${errors.join('\n- ')}`);
  return {
    schema_version:'2027-output-source-projection-v1',
    event_id:'isd_2027',
    status:framework.profileConfig.status,
    rule:'Pointers only: output endpoints resolve the current approved source record; no payload is duplicated here.',
    output_count:framework.connections.outputs.length,
    outputs:framework.connections.outputs.map(output=>{
      const primary=framework.sources.get(output.canonical_source_id);
      return {
        output_id:output.output_id,
        final_output:output.final_output,
        canonical_source_id:primary.record.source_id,
        canonical_domain:primary.domain,
        source_file:`${framework.profileConfig.source_dir}/${DOMAIN_FILES[primary.domain]}`,
        source_revision:primary.record.revision,
        source_publication_status:primary.record.publication_status,
        state:resolveOutput(framework,output.output_id).state,
        supporting_source_ids:output.supporting_source_ids||[]
      };
    })
  };
}

function writeFramework(root,framework){
  for(const [domain,file] of Object.entries(DOMAIN_FILES)) writeJson(root,`${framework.profileConfig.source_dir}/${file}`,framework.domains[domain]);
}

module.exports={DOMAIN_FILES,loadFramework,validateFramework,resolveOutput,applyApprovedChange,sourceProjection,writeFramework};
