#!/usr/bin/env node
'use strict';
/* Verifies that the separately seeded fake profile remains useful for a
   connection review, without weakening the real blank 2027 framework. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {loadFramework,validateFramework,resolveOutput,applyApprovedChange,sourceProjection}=require('../tools/lib/controlled_2027_sources.js');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
let n=0; const ok=(value,message)=>{assert.ok(value,message);n++;};

const seed=cp.spawnSync('node',['tools/build_2027_simulation_from_2026.js'],{cwd:root,encoding:'utf8'});
ok(seed.status===0&&seed.stdout.includes('96 sources, 109 ready outputs'),'the immutable-archive bootstrap creates the complete fake profile');
const rebuild=cp.spawnSync('node',['tools/build_2027_simulation_review.js'],{cwd:root,encoding:'utf8'});
ok(rebuild.status===0&&rebuild.stdout.includes('109 output pointers'),'the review projection rebuilds separately after source changes');
const simulation=loadFramework(root,'simulation');
const blank=loadFramework(root,'blank');
ok(validateFramework(simulation).length===0,'the simulation source and output mappings are internally valid');
ok(simulation.catalog.status==='simulation_seed_from_2026_evidence_not_live'&&simulation.catalog.simulation_only===true&&simulation.catalog.simulation_label,'the populated profile is permanently labelled as fake review data');
for(const file of ['data/2027_simulation_output_connection_registry.json','data/2027_simulation_output_source_projection.json','data/2027_simulation_review.json']){const artifact=json(file); ok(artifact.status==='simulation_seed_from_2026_evidence_not_live'&&artifact.simulation_only===true&&artifact.simulation_label,`${file} carries the explicit simulation-only status and label`);}
const driveRegistry=json('data/2027_simulation_drive_registry.json');
ok(driveRegistry.status==='simulation_seed_from_2026_evidence_not_live'&&driveRegistry.simulation_only===true&&driveRegistry.drive_folder.id&&driveRegistry.source_count===96&&driveRegistry.output_count===109&&driveRegistry.published_artifacts.domains.length===8,'the Drive review pack is separately indexed as simulation-only');
ok(simulation.sources.size===96&&simulation.connections.outputs.length===109,'the fake profile preserves the 96-source and 109-output architecture');
ok([...simulation.sources.values()].every(item=>item.record.revision===1&&item.record.publication_status==='approved'&&item.record.payload.records[0].editable_test_value),'every fake canonical source has a revisioned editable test value');
ok(blank.catalog.status==='blank_framework_ready_not_live'&&[...blank.sources.values()].every(item=>item.record.revision===0&&item.record.publication_status==='draft_not_published'),'the real blank profile remains empty and separate');
const sourceId='DATA-CEREMONY-PROGRAMME';
const outputs=simulation.connections.outputs.filter(item=>item.canonical_source_id===sourceId);
ok(outputs.length===8,'the shared programme source has its eight dependent review outputs');
const existing=simulation.sources.get(sourceId).record;
const payload=JSON.parse(JSON.stringify(existing.payload)); payload.records[0].editable_test_value='連通演練：唯一更新值';
const changed=applyApprovedChange(simulation,{source_id:sourceId,updated_by:existing.owner_group,approved_by:existing.approved_by[0],updated_at:'2027-02-01T09:30:00+08:00',audit_id:'SIM-REVIEW-UNIT-001',publication_status:'approved',payload});
ok(outputs.map(item=>resolveOutput(changed,item.output_id)).every(result=>result.state==='ready_to_render'&&result.canonical_source.revision===2&&result.source_record.payload.records[0].editable_test_value==='連通演練：唯一更新值'),'one fake source update is shared by every dependent output at the next revision');
const projection=sourceProjection(changed);
ok(projection.outputs.filter(item=>item.canonical_source_id===sourceId).every(item=>item.source_revision===2&&!Object.hasOwn(item,'payload')),'the output projection advances pointers but never copies test content');
const sourceBuilder=read('tools/build_2027_simulation_from_2026.js');
const reviewBuilder=read('tools/build_2027_simulation_review.js');
const server=read('tools/serve_2027_simulation_review.js');
ok(sourceBuilder.includes("data/isd_2026.json")&&sourceBuilder.includes('2026_reference_lock.json'),'only the controlled one-time bootstrap reads the locked 2026 evidence');
ok(!reviewBuilder.includes('isd_2026.json')&&!server.includes('isd_2026.json'),'rebuilding and editing the fake profile cannot reread or sync 2026 evidence');
const page=read('simulation-review.html');
ok(page.includes('/api/simulation/source')&&page.includes('演練測試值')&&page.includes('相依輸出'),'the review form makes an editable source and its dependent outputs visible');
console.log(`2027 simulation review passed (${n} checks)`);
