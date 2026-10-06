#!/usr/bin/env node
'use strict';
/* Rebuild the fake-2027 projection/review after a simulation source change.
   Unlike the bootstrap builder, this never opens the 2026 archive. */
const fs=require('fs');
const path=require('path');
const {loadFramework,validateFramework,sourceProjection}=require('./lib/controlled_2027_sources.js');
const root=path.resolve(__dirname,'..');
const write=(file,value)=>fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2)+'\n');
const framework=loadFramework(root,'simulation');
const errors=validateFramework(framework);
if(errors.length) throw new Error(`simulation framework failed validation:\n- ${errors.join('\n- ')}`);
const projection=sourceProjection(framework);
projection.schema_version='2027-simulation-output-source-projection-v1';
projection.simulation_only=true;
projection.simulation_label='2027 演練輸出指標（非 live）';
const catalog=framework.catalog;
const review={
  schema_version:'2027-simulation-review-v1',event_id:'isd_2027',status:projection.status,simulation_only:true,
  simulation_label:'2027 演練覆核畫面資料（非 live）',
  note:'Review display only. This profile is derived once from 2026 evidence and must never become a real 2027 source.',
  source_count:catalog.source_count,output_count:projection.output_count,
  outputs:projection.outputs.map(pointer=>{
    const source=framework.sources.get(pointer.canonical_source_id).record;
    const first=source.payload.records[0]||{};
    const catalogSource=catalog.sources.find(item=>item.source_id===pointer.canonical_source_id);
    return {...pointer,preview_title:first.simulation_title||first.document_title||first.title||pointer.final_output,preview_value:first.editable_test_value||first.template_body||pointer.final_output,dependent_output_count:catalogSource.output_ids.length};
  })
};
write('data/2027_simulation_output_source_projection.json',projection);
write('data/2027_simulation_review.json',review);
console.log(`Rebuilt fake 2027 simulation review: ${projection.output_count} output pointers.`);
