#!/usr/bin/env node
'use strict';
/* The normal-staff manual is a 2027-owned published output, never a live 2026 page. */
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=JSON.parse(read('data/isd_2027.json'));
const mock=JSON.parse(read('data/mock_demo.json'));
let n=0;
const ok=(condition,message)=>{ assert(condition,message); n++; };

const manual=source.execution_manual_2027;
ok(manual&&manual.schema_version==='2027-execution-manual-v1','2027 source has a versioned execution-manual record');
ok(manual.status==='2027_reference_seed_pending_2027_confirmation','manual makes its reference-seed state explicit');
ok(/ISD 2027/.test(manual.source_rule),'manual states the 2027-only update route');
const required=['overview','venue','programme','checkin_logistics','safety','teams','documents'];
ok(required.every(id=>manual.sections.some(section=>section.id===id)),'manual has all operational staff sections');
ok(manual.event_day_snapshot.staff_roster_count===279,'manual carries the complete staff-shift reference count');
ok(manual.event_day_snapshot.participant_unit_count===31,'manual carries the complete participant-unit reference count');
ok(manual.event_day_snapshot.booth_count===33,'manual carries the complete booth reference count');
ok(manual.all_day_programme.length>=18,'manual has an all-day cross-role timeline, not only ceremony rows');
ok(manual.all_day_programme.some(row=>row.time==='08:00')&&manual.all_day_programme.some(row=>row.time==='17:00'),'timeline covers start-of-day to departure');
ok(manual.logistics.meal_collection.length===3&&manual.logistics.staff_meal_records===290,'manual has meal collection and staff-meal operating figures');
ok(manual.safety.immediate_steps.length===4&&manual.safety.topics.length>=3,'manual includes practical emergency actions and sourced topics');
ok(manual.staff_guidance.length===12&&manual.document_catalog.staff_guidance===12,'manual includes all 12 staff-facing guidance records as readable content');
ok(manual.staff_document_assets.length>=10,'manual has a curated, directly usable activity-day document set');
ok(manual.audience_rule.ordinary_staff.includes('唯讀')&&manual.audience_rule.restricted.includes('財務'),'manual explicitly separates staff information from restricted data');

const activeAssets=[...manual.venue_assets,...manual.game_cards,{file_url:manual.safety.manual_asset},...source.ceremony.mc_scripts.map(row=>({file_url:row.file_url})),{file_url:source.ceremony.inspection_route.image}];
ok(activeAssets.length>=10,'manual has maps, game cards, crisis material, scripts and inspection route');
for(const asset of activeAssets){
  ok(asset.file_url&&!asset.file_url.includes('2026'),'staff-facing manual asset does not use a 2026-named file');
  ok(!/^https?:\/\//i.test(asset.file_url),'staff-facing manual asset is local/2027-owned, not a legacy external link');
  ok(fs.existsSync(path.join(root,asset.file_url)),'staff-facing manual asset exists: '+asset.file_url);
}
ok(source.activities.maps.every(map=>/2027/.test(map.file_url)||/ISD 2027/.test(map.file_name)),'venue module itself points to 2027-owned map assets');
ok(source.activities.gameCards.every(card=>/2027/.test(card.file_url)),'game-card module itself points to 2027-owned assets');
ok(source.crisis.manuals.every(row=>/2027/.test(row.file_url)),'crisis manual itself points to a 2027-owned asset');
ok(source.notices.every(row=>!row.drive_id&&row.drive_id_state==='awaiting_2027_owned_copy'),'unmigrated notices retain no legacy Drive ID');
ok(JSON.stringify(mock.execution_manual_2027)===JSON.stringify(manual),'MOCK manual is built exactly from the 2027 source manual');

const frontend=read('js/26-monitor-apply.js');
const activities=read('js/21-activities.js');
const staff=read('js/31-staff.js');
const announcements=read('js/34-announcements.js');
const crisis=read('js/36-crisis.js');
for(const text of [frontend,activities,announcements,crisis]){
  ok(!text.includes('site-setup-plan-2026.pdf'),'rendered staff map has no 2026 site-plan fallback');
  ok(!text.includes('crisis-manual-2026.pdf'),'rendered staff crisis view has no 2026-manual fallback');
}
ok(frontend.includes("{k:'overview'")&&frontend.includes("{k:'logistics'"),'manual UI starts with overview and includes logistics');
ok(frontend.includes('renderExecManualOverview')&&frontend.includes('renderExecManualProgramme')&&frontend.includes('renderExecManualLogistics'),'manual UI renders the worker-oriented pages');
ok(frontend.includes('renderExecManualDocuments')&&frontend.includes('2027 擁有版本'),'manual UI renders its curated files and readable staff guidance rather than an empty document library');
ok(activities.includes('execution_manual_2027')&&activities.includes('2027 工作人員場地及動線圖'),'maps UI uses the 2027 manual source');
ok(activities.includes('usePublishedManual')&&activities.includes("this.currentModule==='exec_manual'"),'maps and participant lists ignore stale browser cache inside the manual');
ok(staff.includes("this.currentModule==='exec_manual'")&&staff.includes('browser-local MOCK edit'),'staff manual ignores stale browser-local roster cache');
ok(!activities.includes('game-card-2026.pdf')&&!activities.includes('game-card-p-2026.pdf'),'game-card UI has no hard-coded 2026 cards');

const builder=read('tools/build_execution_manual_2027.js');
ok(builder.includes("data/isd_2027.json")&&!builder.includes("data/isd_2026.json"),'manual builder reads only the independent 2027 source');
console.log(`2027 execution-manual test passed (${n} assertions)｜${manual.venue_assets.length} maps・${manual.all_day_programme.length} timeline rows・${manual.document_catalog.total} documents`);
