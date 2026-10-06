#!/usr/bin/env node
'use strict';
/* Archive lock + independent 2027 source-chain gate.
 * The test deliberately verifies the archive but never uses it to build 2027. */
const assert=require('assert');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const json=f=>JSON.parse(read(f));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');

const lock=json('data/2026_reference_lock.json');
assert.strictEqual(lock.reference_event_id,'isd_2026','lock must identify the completed event');
assert.strictEqual(lock.reference_file,'data/isd_2026.json','lock must identify its reference file');
assert.strictEqual(sha(lock.reference_file),lock.sha256,'2026 reference checksum changed: do not overwrite the archive; recover only from an authorised source');
assert.strictEqual(lock.status,'archived_read_only','2026 must remain archived read-only');
assert.strictEqual(lock.verified_pre_event_source?.commit,'1c33386202886dae72f7e728d225b5f82789c024','archive must record the verified final pre-event GitHub source');
assert.strictEqual(lock.verified_pre_event_source?.git_blob,'64939768330e15d58a57af1d7e88e2a9f74f78f7','archive must record the verified pre-event blob');

const events=json('data/events.json');
assert.deepStrictEqual(events.map(e=>e.event_id),['isd_2026','mock_demo'],'activity picker must contain only the archived 2026 reference and the 2027 MOCK');
assert.strictEqual(events[0].event_name,'港島童軍繽紛日 2026（進行中）','2026 reference label must remain the requested active-event label');
assert.strictEqual(events[1].event_name,'模擬示範版 2027 港島童軍繽紛日','MOCK label must identify the 2027 product');

const policy=read('docs/2027_SOURCE_OF_TRUTH.md');
for(const token of ['ISD 2027','1qzaHkoua5Se2rOn1z6LljVmlIq-oae3Q','data/isd_2027.json','data/mock_demo.json','07_參考快照（唯讀）','ISD2027_GAS_URL','2027_canonical_source_registry.json','2027_output_connection_registry.json'])
  assert(policy.includes(token),`2027 source-of-truth policy must document ${token}`);
assert(policy.includes('editable canonical sources')&&policy.includes('rehearsal/read-model artefacts'),'policy must make the blank canonical-source/rehearsal distinction explicit');

const source=json('data/isd_2027.json');
const mock=json('data/mock_demo.json');
const registry=json('data/2027_drive_registry.json');
assert.strictEqual(source.event_id,'isd_2027','the independent 2027 source must be present');
assert.strictEqual(source.drive.root_folder_id,'1qzaHkoua5Se2rOn1z6LljVmlIq-oae3Q','2027 data must target the supplied ISD 2027 folder');
assert.strictEqual(source.drive.source_mode,'drive_folder_canonical','Drive must be the canonical 2027 source location');
assert.strictEqual(source.one_time_reference_seed?.live_reference_dependency,false,'2027 source must record provenance without a live 2026 dependency');
assert.strictEqual(source.source_of_truth?.read_model,'data/isd_2027.json','2027 source must identify its read model');
assert.strictEqual(source.future_data_intake?.backend_separation?.current_2026_backend,'blocked_for_2027','2027 frontend must not target the 2026 backend');
assert(Array.isArray(source.staff_meals)&&source.staff_meals.length>0,'2027 staff meal source must use a 2027-neutral field');
assert(!Object.prototype.hasOwnProperty.call(source,'staff_meals_2026'),'legacy 2026-named operational field must not remain in 2027 source');
assert.strictEqual(mock.event_id,'mock_demo','mock remains the selectable rehearsal event');
assert.strictEqual(mock.mock_demo_source?.source_event_id,'isd_2027','mock must be built from the independent 2027 source');
assert(mock.mock_demo_source?.source_sha256,'mock build must record the 2027 source hash');
assert.strictEqual(mock.drive.root_folder_id,source.drive.root_folder_id,'mock must use the 2027 folder, not legacy Drive');
assert.strictEqual(registry.event_id,'isd_2027','registry must belong to 2027');
assert.strictEqual(registry.status,'blank_framework_ready_not_live','the Drive registry must identify the blank 2027 framework as the current source layer');
assert.strictEqual(registry.domains.length,8,'all eight blank Drive domains, including the 2027-owned reference boundary, must be registered');
assert(registry.domains.every(d=>d.drive_file_id&&d.drive_file_link&&d.status==='blank_framework_ready_not_live'),'every blank 2027 source domain must resolve to its own verified Drive file');
assert.strictEqual(registry.domains.reduce((total,d)=>total+d.record_count,0),96,'the Drive domains contain exactly the 96 canonical source records');
assert.strictEqual(registry.framework_catalog?.source_count,96,'the verified Drive source catalogue covers every canonical source');
assert.strictEqual(registry.output_connection_registry?.output_count,109,'the verified Drive output registry covers all detailed outputs');
assert.strictEqual(registry.output_source_projection?.output_count,109,'the payload-free Drive source projection covers all detailed outputs');
assert.strictEqual(registry.output_source_projection?.payload_free,true,'the Drive output projection must not duplicate source payloads');
assert(registry.historical_rehearsal_exports?.domains?.length===7,'the old seed exports are retained only as explicitly non-canonical history');

const prohibitedLegacyDriveIds=['1fqFMBRpMaujqoUSOMR0gzRprTeG-O8jF','13P0gJ3c-1zXTzniZFZL6VT2EZP_FDTYM'];
for(const value of [JSON.stringify(source),JSON.stringify(mock)])
  for(const id of prohibitedLegacyDriveIds) assert(!value.includes(id),`2027 data must not retain a live 2026 Drive ID (${id})`);

const config=read('js/00-config.js');
const core=read('js/10-app-core.js');
assert(/DATA_FROZEN_EVENT_IDS\s*=\s*\[[^\]]*'isd_2026'/.test(config),'isd_2026 must remain in the frozen event list');
assert(core.includes('isReferenceArchiveWriteBlocked'),'all in-app data writes need the archive fence');
assert(core.includes("PIN_STAFF_REFERENCE_CARD_IDS=['exec_manual']")===false,'staff allow-list belongs in config, not core');
assert(/PIN_STAFF_REFERENCE_CARD_IDS\s*=\s*\['exec_manual'\]/.test(config),'PIN staff must remain restricted to the execution-manual view');
assert(/pinStaffReferenceDefs/.test(core) && /PIN_STAFF_REFERENCE_CARD_IDS/.test(core),'dashboard must use the PIN staff allow-list');
const loadEventsStart=core.indexOf('async loadEvents()');
const loadEventsEnd=core.indexOf('\n,',loadEventsStart);
const loadEventsSource=core.slice(loadEventsStart,loadEventsEnd);
assert(loadEventsSource.includes("event_id:'mock_demo'") && !loadEventsSource.includes("event_id:'isd_2027'"),'offline event-picker fallback must keep the same two-event scope');

const saveFns=[
  ['js/21-activities.js',['saveActivitiesData','saveScheduleData','saveParticipantsData','saveDocumentsData','saveThemeBadgesData']],
  ['js/22-meals.js',['saveMealsData']], ['js/24-supplies.js',['saveSuppliesData']], ['js/27-parking.js',['saveParkingData']],
  ['js/28-oral-quotes.js',['saveOralQuotesData']], ['js/30-finance.js',['saveFinanceData']], ['js/31-staff.js',['saveStaffData']],
  ['js/34-announcements.js',['saveAnnouncementsData','saveUnitGuideData']], ['js/35-ceremony.js',['saveCeremonyData','saveAwardsData']], ['js/36-crisis.js',['saveCrisisData','saveAdminGroupData','saveCoordinatorGroupData']], ['js/38-donations.js',['saveDonationsData']], ['js/39-lost-found.js',['saveLostFoundData']], ['js/40-souvenir-stamps.js',['saveSouvenirStampData']], ['js/41-roster-lists.js',['saveRosterData']], ['js/46-plate-roll.js',['savePlateData']]
];
for(const [file,names] of saveFns){
  const text=read(file);
  for(const name of names){
    const i=text.indexOf(name+'(');
    assert(i>=0,`${file} is missing ${name}`);
    assert(text.slice(i,i+260).includes('isReferenceArchiveWriteBlocked'),`${file}:${name} must stop writes to the 2026 archive`);
  }
}
assert(read('js/33-users.js').includes("isReferenceArchiveWriteBlocked('setLocalUsers')")&&read('js/33-users.js').includes("isReferenceArchiveWriteBlocked('finalizeUserList',true)"),'2026 accounts must also be write-blocked');
assert(read('js/11-news.js').includes("isReferenceArchiveWriteBlocked('saveEventNews')"),'2026 event news must also be write-blocked');
for(const file of ['tools/build_2026_freeze.py','tools/build_staff2026.py','scripts/import-2026.js']) assert(read(file).includes('--confirm-2026-archive-write'),`${file} must require an explicit archive-recovery acknowledgement`);

const build=read('tools/build_pc2027_demo.js');
const mockBuild=read('tools/build_mock_demo_from_2027.js');
const legacyShim=read('tools/fill_mock_demo_from_2026.js');
const coverage=read('tools/check_mock_demo_coverage.js');
for(const [name,text] of [['public-channel builder',build],['mock builder',mockBuild],['coverage report',coverage]]){
  assert(text.includes('data/isd_2027.json'),`${name} must use the independent 2027 source`);
  assert(!text.includes("require('./reference_archive.js')")&&!text.includes('readReferenceArchive(root)'),`${name} must not read the 2026 archive`);
}
assert(!legacyShim.includes("require('./reference_archive.js')"),'legacy fill entrypoint must be unable to read the 2026 archive');
assert(read('tools/bootstrap_2027_source.js').includes('live_reference_dependency:false'),'bootstrap must explicitly record one-way provenance');
assert(read('tools/export_2027_drive_sources.js').includes('assertNoLegacy'),'Drive export must reject legacy live source IDs');
for(const sourceText of [build,mockBuild]) assert(!/writeFileSync\([^\n]*isd_2026\.json/.test(sourceText),'2027 builders must never write the reference archive');

const check=cp.spawnSync(process.execPath,['tools/build_2027_templates.js','--check'],{cwd:root,encoding:'utf8'});
assert.strictEqual(check.status,0,`2027 single-source template schema invalid:\n${check.stdout}${check.stderr}`);
console.log('2026 archive lock + independent 2027 Drive/source-chain test passed');
