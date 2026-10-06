#!/usr/bin/env node
'use strict';
/* The 2027 review package must define one master model and fixed-format child Sheets,
   but must not enable live Google Sheet/Drive synchronisation before approval. */
const fs=require('fs'), path=require('path'), cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0; const ok=(v,m)=>{if(!v) throw new Error('FAIL: '+m); n++;};
const r=JSON.parse(read('data/2027_sheet_template_registry.json'));
ok(r.event_id==='isd_2027'&&r.status==='review_only_pending_user_confirmation','registry is a 2027 review package, not a live integration');
ok(r.master_sheet&&r.master_sheet.tabs.length===22,'one master Sheet declares all 22 structured tabs');
ok(r.child_sheets.length===8&&r.child_sheets.every(x=>x.id&&x.tabs.length>=3),'eight fixed-format child Sheet templates are registered');
ok(r.ten_invitation_entry_routes.length===10,'ten invitation-link intake routes are registered');
ok(r.ten_invitation_entry_routes.some(x=>x.includes('工作人員'))&&r.ten_invitation_entry_routes.some(x=>x.includes('攤位')),'staff and booth staffing are first-class intake sources');
ok(r.format_contract.forbidden_changes.includes('field keys')&&r.format_contract.sync_key_rule.includes('source_record_id'),'the contract rejects the 2026-style header changes and uses stable source keys');
ok(r.connection_prerequisites.some(x=>x.includes('reviews and confirms')),'sync remains gated on user confirmation');
ok(Object.keys(r.folders).length===6&&Object.values(r.folders).every(x=>x.id&&x.name),'new Drive review folders are recorded');
const build=path.join(root,'tools/build_2027_sheet_templates.py');
ok(fs.existsSync(build)&&read('tools/build_2027_sheet_templates.py').includes('minimal OOXML writer'),'template builder is dependency-free and reproducible');
const out=path.join(root,'generated/2027_sheet_templates');
fs.rmSync(out,{recursive:true,force:true});
const run=cp.spawnSync('python',[build],{cwd:root,encoding:'utf8'});
ok(run.status===0,'template workbooks build successfully');
const books=fs.readdirSync(out).filter(x=>x.endsWith('.xlsx'));
ok(books.length===9,'builder emits one master and eight child workbooks');
for(const f of books){
  const magic=fs.readFileSync(path.join(out,f)).subarray(0,4).toString('hex');
  ok(magic==='504b0304',`${f} is a valid ZIP-based XLSX package`);
}
fs.rmSync(out,{recursive:true,force:true});
console.log(`2027 Sheet template review package passed (${n} checks)`);
