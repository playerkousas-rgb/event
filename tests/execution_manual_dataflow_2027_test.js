#!/usr/bin/env node
'use strict';
/* The first detailed source review must cover the existing staff execution
   manual one page at a time.  2026 format/version/count noise is not a blocker. */
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0; const ok=(v,m)=>{if(!v) throw new Error('FAIL: '+m); n++;};
const map=JSON.parse(read('data/2027_execution_manual_dataflow_map.json'));
const pageNames=['手冊目錄及資料說明','全日程序及交接','場地、攤位、遊戲及動線','報到、服務點、膳食及後勤','典禮、會操及司儀資料','旅團、膳食及編更資料','各組職責及工作資料','安全及應變','通告、指引及活動日文件'];
ok(map.schema_version==='2027-execution-manual-output-to-source-v1'&&map.status==='review_only_2026_evidence_to_2027_framework','manual source map is review-only');
ok(map.pages.length===9&&pageNames.every(name=>map.pages.some(page=>page.page_name===name)),'all existing execution-manual pages have their own source-explanation tab');
const flows=map.pages.flatMap(page=>page.flows.map(flow=>({...flow,page_name:page.page_name})));
ok(flows.length===35&&flows.every(flow=>flow.final_output&&flow.update_location&&flow.central_approval!==undefined&&flow.reference_source),'every manual output item has the four agreed columns');
ok(!JSON.stringify(map).includes('後勤組')&&!JSON.stringify(map).includes('報到組')&&!JSON.stringify(map).includes('交通組'),'map does not invent departments');
ok(flows.filter(flow=>flow.status==='needs_user_decision').length===0,'no manual source remains red after the user resolved the three structural decisions');
const groupHours=flows.find(flow=>flow.final_output==='各組工作開始／結束時間');
ok(groupHours&&groupHours.update_location.includes('16_當值安排')&&groupHours.update_location.includes('CS03／02')&&groupHours.reference_source.includes('不設交接或換位資料'),'each group has one work type; 2027 records its start/end time without a handover domain');
const safety=flows.find(flow=>flow.final_output==='指揮中心、集合位置及當日緊急資源位置');
ok(safety&&safety.central_approval==='行政組'&&safety.reference_source.includes('危機處理手冊'),'administration owns safety and emergency material comes from the crisis manual');
const documentRows=flows.filter(flow=>flow.page_name==='通告、指引及活動日文件');
ok(documentRows.length===3&&documentRows.every(flow=>flow.central_approval==='秘書處'&&flow.update_location.includes('子SHEET：不需要')),'Secretariat provides the manual notices, guidance and activity-day documents');
ok(map.rules.some(rule=>rule.includes('格式、版本或數字差異不在本輪列為阻塞問題')),'legacy format/version/count differences are not treated as red blockers');
const builder=read('tools/build_2027_execution_manual_dataflow_sheet.py');
ok(builder.includes('A．手冊最終頁面內容')&&builder.includes('needs_user_decision')&&builder.includes('目前沒有紅色待決'),'builder keeps the four-column layout and shows that all current manual decisions are resolved');
const templateRegistry=JSON.parse(read('data/2027_sheet_template_registry.json'));
ok(templateRegistry.execution_manual_dataflow_review_sheet&&templateRegistry.execution_manual_dataflow_review_sheet.status==='review_only_2026_evidence_to_2027_framework','published execution-manual dataflow Sheet is registered as review-only');
const out=path.join(root,'generated/2027_execution_manual_dataflow');
fs.rmSync(out,{recursive:true,force:true});
const run=cp.spawnSync('python',['tools/build_2027_execution_manual_dataflow_sheet.py'],{cwd:root,encoding:'utf8'});
ok(run.status===0,'execution-manual source workbook builds successfully');
const files=fs.readdirSync(out).filter(file=>file.endsWith('.xlsx'));
ok(files.length===1&&fs.readFileSync(path.join(out,files[0])).subarray(0,4).toString('hex')==='504b0304','execution-manual source workbook is a valid XLSX package');
fs.rmSync(out,{recursive:true,force:true});
console.log(`2027 execution-manual dataflow package passed (${n} checks)`);
