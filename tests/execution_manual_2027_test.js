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
const required=['overview','programme','activities','logistics','ceremony','records','staff','crisis','documents'];
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
ok(manual.document_catalog.records.length===79&&manual.document_catalog.records.every(row=>row.status==='metadata_copied_file_pending'),'manual keeps the complete copied document catalogue while honestly flagging missing 2027-owned files');
const readiness=manual.activity_day_readiness||[];
ok(readiness.length===6&&readiness.every(row=>row.id&&row.status_label&&row.color&&row.description),'manual labels every currently identified activity-day readiness source with a visible status and colour');
ok(readiness.filter(row=>row.color==='emerald').map(row=>row.id).includes('staff_badge_checkin')&&readiness.some(row=>row.id==='guest_checkin'&&row.color==='emerald'),'manual identifies staff and guest check-in/distribution as usable activity-day stations');
ok(readiness.some(row=>row.id==='notices'&&row.color==='rose')&&readiness.some(row=>row.id==='document_catalogue'&&row.status==='file_gap'),'manual visibly marks required notices and documents that still lack 2027-owned files');
const departments=manual.department_activity_day_readiness||[];
const departmentNames=['顧問團','主席及執行副主席','秘書處','會操及典禮組','主題節目組','品牌推廣組','嘉賓接待組','協調組','服務及發展組','行政組'];
ok(departments.length===10&&departmentNames.every(group=>departments.some(row=>row.group===group)),'manual reviews the activity-day documents and operational outputs for every department');
ok(departments.every(row=>row.materials&&row.lists&&row.issue!==undefined&&row.output&&row.status_label&&row.color),'each department review explicitly covers documents, lists/check-in or issue, print/export output and confirmation state');
const integration=manual.system_integration||{};
const domains=integration.domains||[];
ok(integration.title==='2027 一體化活動資料系統'&&domains.length>=8&&domains.every(row=>row.canonical&&row.input_groups?.length&&row.consumer_groups?.length&&row.presentations?.length),'manual defines a 2027 data hub where each domain has one canonical record, input owners and consuming groups');
ok(domains.some(row=>row.id==='staff'&&row.canonical.includes('staff.event_staff_roster'))&&domains.some(row=>row.id==='guest'&&row.canonical.includes('guest_roster.guests')),'manual explicitly distinguishes the 2027 staff and guest system domains from their presentations');
ok((integration.group_relations||[]).length===departmentNames.length&&integration.group_relations.every(row=>row.group&&Array.isArray(row.input_domains)&&Array.isArray(row.consume_domains)),'each group is modeled as a possible input owner and a consumer of shared 2027 domains');
ok(manual.audience_rule.ordinary_staff.includes('不按組別隱藏')&&manual.audience_rule.restricted.includes('個人私隱'),'manual shares non-private operations across staff and restricts only private data');
ok(!manual.task_finder&&manual.manual_catalog.length===9,'manual is a complete category-indexed reference book rather than a prescribed workstation finder');
ok(manual.public_records.participant_units.length===31&&manual.public_records.booth_meal_allocation.length>=25,'manual includes public unit, meal and duty-allocation records in their own category');
ok(manual.public_records.participant_units.every(row=>row.unit_name&&row.area&&!Object.keys(row).some(key=>/leader|phone|email|name$/i.test(key)&&key!=='unit_name')),'public participant records retain operational unit data but no leader identity or contact');
ok(manual.group_playbook.length>=11&&manual.group_playbook.every(row=>!row.duty.includes('黃偉安')&&!row.duty.includes('何家騏')),'manual includes full cross-group duties with personal names redacted');

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
ok(frontend.includes('手冊目錄')&&frontend.includes('旅團、膳食及編更資料')&&frontend.includes("{k:'logistics'"),'manual UI is organized as a complete set of information categories');
ok(frontend.includes('renderExecManualOverview')&&frontend.includes('renderExecManualPublicRecords')&&frontend.includes('renderExecManualGroupTasks')&&!frontend.includes('renderExecManualTaskFinder'),'manual UI presents category index, public records and complete cross-group duties without a prescribed lookup workflow');
ok(frontend.includes('不預設工作人員的查閱方式')&&frontend.includes('只有個人姓名及聯絡資料會被遮蔽'),'manual UI leaves lookup to workers while preserving the privacy-only visibility rule');
ok(!frontend.includes("{k:'finance_guide'")&&!frontend.includes("{k:'participants'")&&!frontend.includes("{k:'meal_box'")&&!frontend.includes("{k:'merit_award'"),'staff manual navigation omits private person-level roster screens');
ok(frontend.includes("const isStaffManual=this.currentModule==='exec_manual'")&&frontend.includes("isStaffManual?'': '<th class=\"px-2 py-2 text-left\">聯絡人"),'booth table keeps operations visible while masking the private contact column in the staff manual');
ok(frontend.includes('renderExecManualDocuments')&&frontend.includes('2027 擁有版本'),'manual UI renders its curated files and readable staff guidance rather than an empty document library');
ok(frontend.includes('活動日資料確認標籤')&&frontend.includes('activity_day_readiness')&&frontend.includes('readinessStyle')&&frontend.includes('readinessPill'),'manual UI makes required-but-unconfirmed sources explicit with colour-coded labels rather than hiding them');
ok(frontend.includes('各組活動日文件／名單／派發及輸出覆核')&&frontend.includes('department_activity_day_readiness'),'manual UI provides a non-workflow department reference for documents, lists, issue and print/export needs');
ok(frontend.includes('2027 一體化活動資料系統')&&frontend.includes('system_integration')&&frontend.includes('輸入／維護方')&&frontend.includes('使用方及呈現')&&frontend.includes('各組的輸入／使用關係'),'manual UI shows one 2027 source-of-truth hub in which a group can input one domain and use another');
ok(activities.includes('execution_manual_2027')&&activities.includes('2027 工作人員場地及動線圖'),'maps UI uses the 2027 manual source');
ok(activities.includes('usePublishedManual')&&activities.includes("this.currentModule==='exec_manual'"),'maps and participant lists ignore stale browser cache inside the manual');
ok(staff.includes("this.currentModule==='exec_manual'")&&staff.includes('browser-local MOCK edit'),'staff manual ignores stale browser-local roster cache');
ok(!activities.includes('game-card-2026.pdf')&&!activities.includes('game-card-p-2026.pdf'),'game-card UI has no hard-coded 2026 cards');

const builder=read('tools/build_execution_manual_2027.js');
ok(builder.includes("data/isd_2027.json")&&!builder.includes("data/isd_2026.json"),'manual builder reads only the independent 2027 source');
console.log(`2027 execution-manual test passed (${n} assertions)｜${manual.venue_assets.length} maps・${manual.all_day_programme.length} timeline rows・${manual.document_catalog.total} documents`);
