#!/usr/bin/env node
'use strict';
/* Proves the new source connection is causal: one approved source update is
   consumed by every dependent endpoint, without creating output-side copies. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {loadFramework,validateFramework,resolveOutput,applyApprovedChange,sourceProjection}=require('../tools/lib/controlled_2027_sources.js');
const root=path.resolve(__dirname,'..');
let n=0; const ok=(value,message)=>{assert.ok(value,message);n++;};

const build=cp.spawnSync('node',['tools/build_2027_output_source_projection.js'],{cwd:root,encoding:'utf8'});
ok(build.status===0&&build.stdout.includes('109 output source pointers'),'the pointer-only output projection builds from the blank source layer');
const framework=loadFramework(root);
ok(validateFramework(framework).length===0,'the blank source layer is internally consistent and has no 2026 live dependency');
const projection=JSON.parse(fs.readFileSync(path.join(root,'data/2027_output_source_projection.json'),'utf8'));
ok(projection.output_count===109&&projection.outputs.length===109,'the projection exposes all detailed endpoints');
ok(!projection.outputs.some(row=>Object.prototype.hasOwnProperty.call(row,'payload'))&&projection.outputs.every(row=>row.state==='waiting_for_approved_2027_source'),'the blank projection holds pointers only and does not publish unapproved content');
const sourceId='DATA-CEREMONY-PROGRAMME';
const dependent=framework.connections.outputs.filter(row=>row.canonical_source_id===sourceId);
ok(dependent.length===8,'the shared ceremony programme has all eight reviewed dependent outputs');
ok(dependent.every(row=>resolveOutput(framework,row.output_id).source_record===null),'unapproved canonical records are unavailable to every dependent output');
const changed=applyApprovedChange(framework,{
  source_id:sourceId,
  updated_by:'會操及典禮組',
  approved_by:'會操及典禮組',
  updated_at:'2027-01-15T09:30:00+08:00',
  audit_id:'AUD-2027-TEST-CEREMONY-001',
  publication_status:'approved',
  payload:{records:[{programme_item_id:'CER-001',title:'2027 測試典禮程序',status:'approved'}]}
});
const changedRecord=changed.sources.get(sourceId).record;
ok(changedRecord.revision===1&&changedRecord.record_state==='approved_2027_source'&&changedRecord.approval_record.approved_by==='會操及典禮組','an owner-approved change advances only its canonical source record');
const resolutions=dependent.map(row=>resolveOutput(changed,row.output_id));
ok(resolutions.every(row=>row.state==='ready_to_render'&&row.canonical_source.revision===1),'one approved source change makes every dependent output renderable at the same revision');
ok(resolutions.every(row=>row.source_record===changedRecord),'every dependent output points to the exact shared source record rather than an output-side clone');
ok(resolutions.every(row=>row.source_record.payload.records[0].title==='2027 測試典禮程序'),'every dependent output reads the changed source value');
const changedProjection=sourceProjection(changed);
ok(changedProjection.outputs.filter(row=>row.canonical_source_id===sourceId).every(row=>row.source_revision===1&&row.state==='ready_to_render'),'a rebuilt projection changes source pointers, not copied output payloads');
assert.throws(()=>applyApprovedChange(framework,{source_id:sourceId,updated_by:'行政組',approved_by:'會操及典禮組',updated_at:'2027-01-15T09:30:00+08:00',audit_id:'AUD-FAIL-01',publication_status:'approved',payload:{records:[]}}),/not the owner group/);
n++; // owner guard above
assert.throws(()=>applyApprovedChange(framework,{source_id:sourceId,updated_by:'會操及典禮組',approved_by:'會操及典禮組',updated_at:'2027-01-15T09:30:00+08:00',audit_id:'AUD-FAIL-02',publication_status:'approved',payload:{records:[{url:'data/isd_2026.json'}]}}),/blocked live reference/);
n++; // 2026 live-reference guard above
console.log(`controlled 2027 source connection passed (${n} checks)`);
