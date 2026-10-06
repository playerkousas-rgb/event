#!/usr/bin/env node
'use strict';
/* The detailed evidence maps must now result in a blank, real 2027 source
   framework: one source record per source ID and outputs that only consume it. */
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const maps=[
  ['public_documents','data/2027_public_documents_dataflow_map.json',26],
  ['staff_documents','data/2027_staff_documents_dataflow_map.json',25],
  ['department_centre','data/2027_department_centre_dataflow_map.json',58]
];
const sourceIds=text=>[...new Set((String(text).match(/\b(?:IN\d{2}|[A-Z]+(?:-[A-Z0-9]+)+)\b/g)||[]))];
let n=0; const ok=(value,message)=>{assert.ok(value,message);n++;};

const build=cp.spawnSync('node',['tools/build_2027_blank_framework.js'],{cwd:root,encoding:'utf8'});
ok(build.status===0&&build.stdout.includes('96 canonical source IDs, 109 output connections'),'the deterministic builder produces the blank 2027 framework');
const catalog=readJson('data/2027_canonical_source_registry.json');
const connections=readJson('data/2027_output_connection_registry.json');
const detailed=maps.flatMap(([scope,file,count])=>{
  const data=readJson(file); const rows=data.sections.flatMap(section=>section.flows);
  ok(rows.length===count,`${scope} retains its complete reviewed-output count`);
  return rows.map(row=>({scope,row}));
});
const expectedSourceIds=[...new Set(detailed.flatMap(({row})=>sourceIds(row.update_location)))].sort();
ok(detailed.length===109,'all 109 detailed review outputs are the connection-framework input');
ok(catalog.status==='blank_framework_ready_not_live'&&connections.status==='blank_framework_ready_not_live','the framework is explicitly blank and not live');
ok(catalog.source_count===96&&catalog.sources.length===96,'all 96 distinct reviewed source IDs exist exactly once in the canonical catalog');
ok(JSON.stringify(catalog.sources.map(x=>x.source_id).sort())===JSON.stringify(expectedSourceIds),'the canonical catalog covers exactly the source IDs referenced by detailed evidence maps');
ok(connections.output_count===109&&connections.outputs.length===109,'each of the 109 reviewed outputs has an explicit connection record');
ok(new Set(connections.outputs.map(x=>x.output_id)).size===109,'output connection IDs are unique');
ok(connections.outputs.every(x=>x.canonical_source_id&&x.canonical_read_rule.includes('no output-side copy or edit')),'every output has exactly one primary canonical source and cannot become a parallel editable copy');
ok(connections.outputs.every(x=>x.framework_state==='connected_to_blank_2027_source'),'each reviewed output is connected to the blank 2027-owned source layer');
ok(catalog.sources.every(x=>x.framework_state==='blank_2027_owned_source'&&x.content_status==='blank_awaiting_2027_owner_entry'),'every source starts as a 2027-owned blank record awaiting its owner rather than inherited event data');
ok(catalog.sources.every(x=>x.canonical_home.startsWith('ISD 2027／')&&x.owner_group&&x.established_group_approvals.length),'every source has one 2027 home and established-group ownership/approval');
ok(catalog.sources.every(x=>x.source_schema.required_metadata.includes('audit_id')&&x.source_schema.required_metadata.includes('updated_by')),'every source requires audit metadata before an approved update');
ok(catalog.sources.every(x=>x.output_ids.length&&x.evidence_2026.length),'each source retains evidence provenance and at least one consuming output');
ok(!JSON.stringify(catalog).includes('data/isd_2026.json')&&!JSON.stringify(connections).includes('ISD2026_GAS_URL'),'the blank framework has no direct 2026 live dependency');
const domainFiles=fs.readdirSync(path.join(root,'data/2027_blank_sources')).filter(f=>f.endsWith('.json')).sort();
ok(domainFiles.length===8,'there is one blank controlled source file for each 2027 Drive domain, including the reference-snapshot boundary');
const domainRecords=domainFiles.flatMap(file=>readJson(`data/2027_blank_sources/${file}`).records);
ok(domainRecords.length===96&&new Set(domainRecords.map(x=>x.source_id)).size===96,'domain files contain every canonical source record exactly once');
ok(domainRecords.every(x=>x.record_state==='blank_awaiting_2027_owner_entry'&&x.revision===0&&x.updated_by===null&&x.updated_at===null&&x.audit_id===null&&x.publication_status==='draft_not_published'),'blank source files contain no inherited live values, audit actor, revision, or publication');
ok(domainRecords.every(x=>Object.keys(x.payload).length===0||Object.values(x.payload).every(value=>Array.isArray(value)&&value.length===0)),'blank source payloads contain no 2026-seeded records');
const driveRegistry=readJson('data/2027_drive_registry.json');
ok(driveRegistry.status==='blank_framework_ready_not_live'&&driveRegistry.domains.length===8,'the Drive registry identifies all eight verified blank-domain source files as current');
ok(driveRegistry.domains.reduce((total,domain)=>total+domain.record_count,0)===96&&driveRegistry.framework_catalog.source_count===96&&driveRegistry.output_connection_registry.output_count===109&&driveRegistry.output_source_projection.output_count===109&&driveRegistry.output_source_projection.payload_free===true,'the Drive registry links the 96-source catalogue, the 109 output connections and the payload-free source projection');
const builder=fs.readFileSync(path.join(root,'tools/build_2027_blank_framework.js'),'utf8');
ok(!builder.includes("data/isd_2026.json")&&builder.includes('read_only_from_canonical_source'),'the builder only reads reviewed maps and enforces source-to-output consumption');
const retiredExporter=cp.spawnSync('node',['tools/export_2027_drive_sources.js'],{cwd:root,encoding:'utf8'});
ok(retiredExporter.status!==0&&retiredExporter.stderr.includes('Superseded'),'the old seed exporter is blocked from writing rehearsal data into the blank framework');
console.log(`blank 2027 framework passed (${n} checks)`);
