#!/usr/bin/env node
'use strict';
/* 2027 review templates have fixed schemas, but no live Google Drive/Sheet sync. */
const fs=require('fs'), path=require('path'), cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0; const ok=(v,m)=>{if(!v) throw new Error('FAIL: '+m); n++;};
const r=JSON.parse(read('data/2027_sheet_template_registry.json'));
const flow=JSON.parse(read('data/2027_public7_dataflow_map.json'));
const expectedAudienceIds=['guest','troop','merit','march','ug','awardee_section','awardee_adult'];
const guestPages=['基本資訊','日程','報到資訊','活動地圖','典禮／儀式流程','座位表','午膳安排','午膳／儀式須知','求助'];
ok(r.event_id==='isd_2027'&&r.status==='review_only_pending_user_confirmation','registry is a 2027 review package, not a live integration');
ok(flow.schema_version==='2027-public7-final-output-tabs-v5','public-seven map uses the compact output-page schema');
ok(flow.audiences.length===7&&expectedAudienceIds.every(id=>flow.audiences.some(a=>a.audience_id===id)),'all seven existing public audiences have a review tab');
ok(flow.audiences.every(a=>a.flows.length>0&&a.flows.every(row=>row.final_output_tab&&row.master_child_update_location&&row.central_approval!==undefined&&row.input_location)),'every final output page maps to maintenance, approval and input columns');
const guest=flow.audiences.find(a=>a.audience_id==='guest');
ok(guestPages.every(page=>guest.flows.some(row=>row.final_output_tab===page)),'the guest output page list is explicit and complete');
ok(guest.flows.some(row=>row.final_output_tab==='報到資訊'&&row.input_location==='IN04 嘉賓報名表'),'guest check-in has the direct, simple invitation-form input location');
ok(flow.audiences.every(a=>a.flows.every(row=>row.master_child_update_location.includes('主SHEET：'))),'each maintainable output maps to a master-Sheet page');
ok(flow.audiences.every(a=>a.flows.every(row=>row.central_approval==='—'||!row.central_approval.includes('需要時'))),'approval cells are compact and do not invent an extra process');
ok(!JSON.stringify(flow).includes('後勤組')&&!JSON.stringify(flow).includes('報到組')&&!JSON.stringify(flow).includes('交通組'),'flow uses the actual 2026 major groups rather than invented departments');
ok(r.master_sheet&&r.master_sheet.tabs.length===25,'the master Sheet includes the three public-output data pages');
ok(['25_基本資訊','26_日程及地圖','27_公告及求助'].every(tab=>r.master_sheet.tabs.includes(tab)),'master Sheet has dedicated basic-information, schedule/map and notice/help pages');
ok(r.data_flow_review_sheets&&r.data_flow_review_sheets.length===1&&r.data_flow_review_sheets[0].scope.includes('A欄'),'the public-seven data-flow Sheet is registered with the four-column scope');
ok(r.child_sheets.length===8&&r.child_sheets.every(x=>x.id&&x.tabs.length>=3),'eight fixed-format child Sheet templates are registered');
ok(r.ten_invitation_entry_routes.length===10,'ten invitation-link intake routes are registered');
ok(r.ten_invitation_entry_routes.some(x=>x.includes('工作人員'))&&r.ten_invitation_entry_routes.some(x=>x.includes('攤位')),'staff and booth staffing are first-class intake sources');
ok(r.format_contract.forbidden_changes.includes('field keys')&&r.format_contract.sync_key_rule.includes('source_record_id'),'the contract uses stable source keys');
ok(r.connection_prerequisites.some(x=>x.includes('reviews and confirms')),'sync remains gated on user confirmation');
ok(Object.keys(r.folders).length===6&&Object.values(r.folders).every(x=>x.id&&x.name),'new Drive review folders are recorded');
const build=path.join(root,'tools/build_2027_sheet_templates.py');
ok(fs.existsSync(build)&&read('tools/build_2027_sheet_templates.py').includes('minimal OOXML writer'),'template builder is dependency-free and reproducible');
const flowBuild=read('tools/build_2027_public7_dataflow_sheet.py');
ok(flowBuild.includes('A．最終輸出頁簽')&&flowBuild.includes('B．主SHEET／子SHEET更新位置')&&flowBuild.includes('D．輸入地方'),'each audience gets the requested four compact columns');
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
