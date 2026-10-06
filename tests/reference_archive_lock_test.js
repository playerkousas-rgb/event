#!/usr/bin/env node
'use strict';
/* 2026 完結後的完整性閘門：此測試故意不「修正」資料；checksum 不符必須人工核對來源。 */
const assert=require('assert');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const lock=JSON.parse(read('data/2026_reference_lock.json'));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');

assert.strictEqual(lock.reference_event_id,'isd_2026','lock event id must name the completed event');
assert.strictEqual(lock.reference_file,'data/isd_2026.json','lock must identify its reference file');
assert.strictEqual(sha(lock.reference_file),lock.sha256,'2026 reference checksum changed: do not overwrite the archive; recover only from an authorised source');
assert.strictEqual(lock.status,'archived_read_only','2026 must remain archived read-only');
const sourcePolicy=read('docs/2027_SOURCE_OF_TRUTH.md');
assert(sourcePolicy.includes('data/isd_2026.json') && sourcePolicy.includes('data/mock_demo.json') && sourcePolicy.includes('tools/schema/templates_2027.js'),'2027 source-of-truth policy must document the only allowed source chain');
assert(sourcePolicy.includes('MOCK 模式的互動資料只存在當前瀏覽器'),'policy must not claim MOCK browser state is cross-team synchronisation');

const config=read('js/00-config.js');
const core=read('js/10-app-core.js');
assert(/DATA_FROZEN_EVENT_IDS\s*=\s*\[[^\]]*'isd_2026'/.test(config),'isd_2026 must remain in the frozen event list');
assert(core.includes('isReferenceArchiveWriteBlocked'),'all in-app data writes need the archive fence');
assert(core.includes("PIN_STAFF_REFERENCE_CARD_IDS=['exec_manual']" )===false,'staff allow-list belongs in config, not core');
assert(/PIN_STAFF_REFERENCE_CARD_IDS\s*=\s*\['exec_manual'\]/.test(config),'PIN staff must be restricted to the execution-manual reference');
assert(/pinStaffReferenceDefs/.test(core) && /PIN_STAFF_REFERENCE_CARD_IDS/.test(core),'dashboard must use the PIN staff allow-list');

const saveFns=[
  ['js/21-activities.js',['saveActivitiesData','saveScheduleData','saveParticipantsData','saveDocumentsData','saveThemeBadgesData']],
  ['js/22-meals.js',['saveMealsData']], ['js/24-supplies.js',['saveSuppliesData']], ['js/27-parking.js',['saveParkingData']],
  ['js/28-oral-quotes.js',['saveOralQuotesData']], ['js/30-finance.js',['saveFinanceData']], ['js/31-staff.js',['saveStaffData']],
  ['js/34-announcements.js',['saveAnnouncementsData','saveUnitGuideData']], ['js/35-ceremony.js',['saveCeremonyData','saveAwardsData']],
  ['js/36-crisis.js',['saveCrisisData','saveAdminGroupData','saveCoordinatorGroupData']], ['js/38-donations.js',['saveDonationsData']],
  ['js/39-lost-found.js',['saveLostFoundData']], ['js/40-souvenir-stamps.js',['saveSouvenirStampData']],
  ['js/41-roster-lists.js',['saveRosterData']], ['js/46-plate-roll.js',['savePlateData']]
];
for(const [file,names] of saveFns){
  const text=read(file);
  for(const name of names){
    const i=text.indexOf(name+'(');
    assert(i>=0,`${file} is missing ${name}`);
    const window=text.slice(i,i+260);
    assert(window.includes('isReferenceArchiveWriteBlocked'),`${file}:${name} must stop writes to the 2026 archive`);
  }
}
assert(read('js/33-users.js').includes("isReferenceArchiveWriteBlocked('setLocalUsers')") && read('js/33-users.js').includes("isReferenceArchiveWriteBlocked('finalizeUserList',true)"),'2026 accounts must also be write-blocked, including read-time migration caches');
assert(read('js/11-news.js').includes("isReferenceArchiveWriteBlocked('saveEventNews')"),'2026 event news must also be write-blocked');

for(const file of ['tools/build_2026_freeze.py','tools/build_staff2026.py','scripts/import-2026.js'])
  assert(read(file).includes('--confirm-2026-archive-write'),`${file} must require an explicit archive-recovery acknowledgement`);
const build=read('tools/build_pc2027_demo.js');
const fill=read('tools/fill_mock_demo_from_2026.js');
for(const [name,source] of [['MOCK fill builder',fill],['public-channel MOCK builder',build],['MOCK coverage check',read('tools/check_mock_demo_coverage.js')]])
  assert(source.includes("require('./reference_archive.js')") && source.includes('readReferenceArchive(root)'),`${name} must checksum-verify the archived source before reading it`);
assert(build.includes("fs.writeFileSync(path.join(root, 'data/mock_demo.json')"),'2027 mock build must write only its MOCK product');
for(const source of [fill,build])
  assert(!/writeFileSync\([^\n]*isd_2026\.json/.test(source),'2027 MOCK builders must never write the reference archive');
const check=cp.spawnSync(process.execPath,['tools/build_2027_templates.js','--check'],{cwd:root,encoding:'utf8'});
assert.strictEqual(check.status,0,`2027 single-source template schema invalid:\n${check.stdout}${check.stderr}`);
console.log('2026 archive lock + 2027 MOCK/template source-chain test passed');
