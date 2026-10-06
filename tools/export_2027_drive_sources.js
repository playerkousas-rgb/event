#!/usr/bin/env node
'use strict';
/* Build the files that belong in the ISD 2027 Drive source folders.
 * They are deployable data exports, deliberately ignored by Git; Drive is the
 * canonical editable location and data/isd_2027.json is the reviewed read model.
 */
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const outDir=path.join(root,'tmp','isd_2027_drive_sources');
const event=JSON.parse(fs.readFileSync(path.join(root,'data/isd_2027.json'),'utf8'));
const registry=JSON.parse(fs.readFileSync(path.join(root,'data/2027_drive_registry.json'),'utf8'));
const get=(object,key)=>object[key];
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const legacyNeedles=['1fqFMBRpMaujqoUSOMR0gzRprTeG-O8jF','13P0gJ3c-1zXTzniZFZL6VT2EZP_FDTYM','ISD2026_GAS_URL'];
const assertNoLegacy=(value,name)=>{
  const text=JSON.stringify(value);
  for(const needle of legacyNeedles) if(text.includes(needle)) throw new Error(`${name} still has a 2026 live source reference: ${needle}`);
};
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});
const manifest={
  schema_version:'2027-drive-export-v1',
  event_id:'isd_2027',
  generated_at:new Date().toISOString(),
  source_of_truth:'ISD 2027 Drive controlled source files',
  read_model:'data/isd_2027.json',
  mock_product:'data/mock_demo.json',
  files:[]
};
for(const domain of registry.domains){
  const data={};
  for(const p of domain.paths) if(get(event,p)!==undefined) data[p]=get(event,p);
  const output={
    schema_version:'2027-source-domain-v1', event_id:'isd_2027', domain_id:domain.id,
    record_state:'reference_seed_pending_2027_confirmation',
    update_instruction:'Edit this 2027-owned source through its approved owner/frontend flow. Keep one record in one domain; every edit needs audit metadata. Do not re-link this file to a 2026 location.',
    data
  };
  assertNoLegacy(output,domain.id);
  const filePath=path.join(outDir,domain.file);
  fs.writeFileSync(filePath,JSON.stringify(output,null,2)+'\n');
  manifest.files.push({domain_id:domain.id,folder_key:domain.folder,file:domain.file,drive_file_id:domain.drive_file_id||'',drive_file_link:domain.drive_file_link||'',sha256:sha(output),record_count:Object.values(data).reduce((n,v)=>n+(Array.isArray(v)?v.length:0),0)});
}
assertNoLegacy(manifest,'manifest');
fs.writeFileSync(path.join(outDir,'ISD 2027－資料主索引.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Exported ${manifest.files.length+1} 2027 Drive source files → ${path.relative(root,outDir)}`);
