#!/usr/bin/env node
'use strict';
/* 2026→2027 一體化連通測試：
   ① data/2027_unified_connection_index.json 可由 builder 確定性重建；
   ② 索引內所有 source／master tab／child route 對得上受控框架；
   ③ 2026 數據集統計與 checksum 鎖定嘅封存檔一致，且索引不含個人資料；
   ④ apps-script/Code2027Unified.gs 語法正確、接線齊全、無 2026 live 依賴。 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const crypto = require('crypto');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
let n = 0;
const ok = (value, message) => { assert.ok(value, message); n++; };

/* ① builder 確定性重建 */
const build = cp.spawnSync('node', ['tools/build_2027_unified_connection_index.js'], { cwd: root, encoding: 'utf8' });
ok(build.status === 0 && build.stdout.includes('unified connection index written'), 'the unified connection index builder runs');
const before = fs.readFileSync(path.join(root, 'data/2027_unified_connection_index.json'), 'utf8');
cp.spawnSync('node', ['tools/build_2027_unified_connection_index.js'], { cwd: root, encoding: 'utf8' });
const after = fs.readFileSync(path.join(root, 'data/2027_unified_connection_index.json'), 'utf8');
ok(before === after, 'the index rebuild is deterministic (idempotent)');

const index = readJson('data/2027_unified_connection_index.json');
const sourceRegistry = readJson('data/2027_canonical_source_registry.json');
const outputRegistry = readJson('data/2027_output_connection_registry.json');
const sheetRegistry = readJson('data/2027_sheet_template_registry.json');
const driveRegistry = readJson('data/2027_drive_registry.json');
const sourceIds = new Set(sourceRegistry.sources.map((s) => s.source_id));

/* ② 索引結構與受控框架對得上 */
ok(index.schema_version === '2027-unified-connection-index-v1' && index.event_id === 'isd_2027', 'index has the 2027 event boundary');
ok(index.status === 'connected_reference_index_gs_ready_not_live', 'index is an explicit not-live connection layer');
const allMappedSourceRefs = [];
const collectSourceRefs = (node) => {
  if (Array.isArray(node)) return node.forEach(collectSourceRefs);
  if (node && typeof node === 'object') {
    Object.entries(node).forEach(([k, v]) => {
      if (k === 'source_id' && typeof v === 'string') allMappedSourceRefs.push(v);
      else collectSourceRefs(v);
    });
  }
};
collectSourceRefs(index.master_sheet.tabs);
collectSourceRefs(index.assets_2027.reference_snapshots);
collectSourceRefs(index.datasets_2026);
collectSourceRefs(index.assets_2026_reference.key_assets);
ok(allMappedSourceRefs.length > 40, `the index carries ${allMappedSourceRefs.length} source cross-references`);
ok(allMappedSourceRefs.every((id) => sourceIds.has(id)), 'every cross-referenced source ID exists in the 96-source canonical registry');

ok(index.master_sheet.tabs.length === 25, 'the master model covers all 25 tabs');
ok(index.master_sheet.tabs.map((t) => t.tab).join(',') === sheetRegistry.master_sheet.tabs.join(','), 'master model tabs match the sheet template registry exactly');
ok(index.master_sheet.drive_file_id === sheetRegistry.master_sheet.id, 'master sheet ID matches the sheet template registry');
const dataTabs = index.master_sheet.tabs.filter((t) => t.kind === 'data');
ok(dataTabs.length === 18, `18 data tabs accept upsert (got ${dataTabs.length})`);
ok(dataTabs.every((t) => t.business_key && t.field_keys.includes(t.business_key.split('+')[0])), 'every data tab has a business key present in its field contract');
ok(dataTabs.every((t) => t.owner && t.field_keys.length >= 7), 'every data tab carries an owner and a full field contract');

ok(index.child_sheet_routes.length === 25, 'all 25 child-sheet routes are indexed');
ok(index.child_sheet_routes.filter((r) => r.state === 'route_ready').length === 17, '17 routes are ready; 8 are pending owner field confirmation');
const masterTabNames = new Set(index.master_sheet.tabs.map((t) => t.tab));
index.child_sheet_routes.forEach((r) => {
  ok(r.fixed_fields.includes('source_record_id') && r.fixed_fields.includes('template_version'), `route ${r.route_id} keeps the child contract key fields`);
  if (r.state === 'route_ready') {
    r.master_tabs.forEach((mt) => {
      const tab = index.master_sheet.tabs.find((t) => t.tab === mt);
      ok(!!tab, `route ${r.route_id} targets a known master tab`);
      r.match_fields[mt].forEach((f) => {
        ok(r.fixed_fields.includes(f), `route ${r.route_id} match field ${f} exists in the child contract`);
        ok(tab.field_keys.includes(f), `route ${r.route_id} match field ${f} exists in master tab ${mt}`);
      });
    });
  } else {
    ok(r.master_tabs.length === 0 && r.note, `pending route ${r.route_id} explains what the owner must confirm`);
  }
});
ok(new Set(index.child_sheet_routes.map((r) => r.route_id)).size === 25, 'route IDs are unique');

ok(index.entry_routes.length === 10 && index.entry_routes.map((r) => r.route_id).join(',') === 'IN01,IN02,IN03,IN04,IN05,IN06,IN07,IN08,IN09,IN10', 'the ten invitation entry routes are indexed in order');

ok(index.assets_2027.controlled_domains.length === 8 && index.assets_2027.controlled_domains.every((d) => d.drive_file_id), 'all 8 controlled-domain Drive files are indexed');
ok(index.assets_2027.controlled_domains.reduce((sum, d) => sum + d.record_count, 0) === 96, 'controlled domains still total the 96 canonical sources');
ok(index.assets_2027.reference_snapshots.length === 16, 'all 16 2027 reference snapshots (2026 read-only copies) are indexed');
ok(new Set(index.assets_2027.reference_snapshots.map((s) => s.drive_file_id)).size === 16, 'snapshot Drive IDs are unique');
ok(index.assets_2027.reference_snapshots.every((s) => s.maps_to_source_ids.length && s.origin_2026 && s.drive_file_id), 'every snapshot maps to 2027 source IDs and keeps its 2026 origin provenance');
ok(index.assets_2027.framework_catalogs.some((a) => a.asset_id === 'REG-DRIVE' && a.drive_file_id === '1mUiVpt-DIvCLHZnySt-sruhnfQBIqGcR'), 'the Drive source registry file the GS reads is itself indexed');
ok(index.child_sheet_templates.length === 8 && new Set(index.child_sheet_templates.map((t) => t.template_code)).size === 8, 'all 8 child-sheet templates (CS01–CS08) are indexed');
ok(index.child_sheet_templates.every((t) => index.child_sheet_routes.some((r) => r.template_code === t.template_code)), 'every child template has its routes indexed');

/* ③ 2026 數據集統計：checksum 鎖定＋無個人資料 */
const lock = readJson('data/2026_reference_lock.json');
const archiveSha = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, lock.reference_file))).digest('hex');
ok(archiveSha === lock.sha256, 'the 2026 archive is still checksum-locked');
ok(index.boundary.reference_lock.sha256 === lock.sha256, 'the index pins the same 2026 lock checksum');
ok(index.boundary.prohibited.length >= 3 && index.boundary.privacy.includes('個人資料'), 'the index states its read-only and no-PII boundary');
const evidence = readJson(lock.reference_file);
const expectCount = {
  'users': (d) => d.users.length,
  'participants': (d) => d.participants.length,
  'guest_roster.guests': (d) => d.guest_roster.guests.length,
  'activities.booths': (d) => d.activities.booths.length,
  'ceremony.meritRoster': (d) => d.ceremony.meritRoster.length,
  'meals': (d) => d.meals.length,
  'documents': (d) => d.documents.length
};
index.datasets_2026.forEach((d) => {
  ok(typeof d.record_count === 'number', `dataset ${d.key} has a numeric count`);
  if (expectCount[d.key]) ok(d.record_count === expectCount[d.key](evidence), `dataset ${d.key} count matches the locked 2026 archive`);
  d.related_master_tabs.forEach((t) => ok(masterTabNames.has(t), `dataset ${d.key} master tab ${t} exists`));
});
ok(index.datasets_2026.some((d) => d.key === 'guest_roster.guests' && d.record_count === 102), 'the 2026 guest count is registered as statistics only');
const indexText = JSON.stringify(index);
const privacyText = indexText.replace(/"sha256":"[a-f0-9]+"/g, '').replace(/\d{4}-\d{2}-\d{2}/g, '').replace(/\b20\d{6}\b/g, '');
ok(!/\b[2-9]\d{7}\b/.test(privacyText), 'the index contains no raw 8-digit phone numbers');
ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(indexText), 'the index contains no email addresses');
ok(!/\b[A-Z]{2}\d{3,4}\b/.test(indexText.replace(/R10|V\d+/g, '')), 'the index carries no car-plate-like values');
ok(index.assets_2026_reference.repo_file_snapshots.length >= 20 && index.assets_2026_reference.repo_file_snapshots.every((f) => /^[a-f0-9]{64}$/.test(f.sha256)), 'the repo 2026 file snapshots are SHA-256 pinned');

/* ④ GS 檔案：語法＋接線＋邊界 */
const gsPath = path.join(root, 'apps-script/Code2027Unified.gs');
const gs = fs.readFileSync(gsPath, 'utf8');
const tmp = path.join(os.tmpdir(), 'code2027unified-check.js');
fs.writeFileSync(tmp, gs);
const check = cp.spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
ok(check.status === 0, `Code2027Unified.gs is syntactically valid JavaScript (${check.stderr.split('\n')[0]})`);
[
  'getHealth', 'getUnifiedIndex', 'get2026Reference', 'findAsset', 'getMasterModel', 'getMasterTab',
  'getEntryRoutes', 'getChildRoutes', 'listSyncStatus', 'listFieldErrors', 'get2027Output',
  'initializeUnifiedBackend', 'refreshUnifiedIndex', 'upsertMasterRows', 'registerChildSheet',
  'pullChildSheet', 'register2027Extension', 'resolveFieldError', 'update2027Source'
].forEach((action) => ok(gs.includes(`'${action}'`), `the GS routes the ${action} action`));
ok(gs.includes('2027-unified-gs-v1') && gs.includes("'isd_2027'"), 'the GS pins its version and 2027 event boundary');
ok(gs.includes(`ISD2027_MASTER_SHEET_ID = '${sheetRegistry.master_sheet.id}'`), 'the GS master sheet ID matches the registry');
ok(gs.includes("ISD2027_DRIVE_REGISTRY_FILE_ID = '1mUiVpt-DIvCLHZnySt-sruhnfQBIqGcR'"), 'the GS reads the verified Drive source registry file');
ok(!gs.includes('__CONNECTION_INDEX_FILE_ID__'), 'the GS connection-index file ID is filled in (no placeholder left)');
ok(/^const ISD2027_CONNECTION_INDEX_FILE_ID = '[A-Za-z0-9_-]{20,}';$/m.test(gs), 'the GS connection-index file ID is a real Drive file ID');
ok(gs.includes('ISD2027_BLOCKED_REFERENCES') && gs.includes("event_id=isd_2026"), 'the GS keeps the blocked 2026 live references');
ok(!gs.includes('getActiveSpreadsheet'), 'the GS never depends on being bound to a spreadsheet (openById only)');
ok(gs.includes('initialize2027Backend') && gs.includes('function initializeUnifiedBackend()'), 'the GS keeps v1 entry names plus the new editor entry');
ok(gs.includes('04_同步狀態') && gs.includes('05_欄位錯誤') && gs.includes('24_修正紀錄'), 'the GS writes the master sheet sync/error/correction logs');
ok(gs.includes('2027_登記表') && gs.includes('register2027Extension'), 'the GS provides the register-2027-sheet-and-script extension point');
ok(gs.includes('route_pending_mapping') && gs.includes('不會暗中改名'), 'the GS refuses pending routes and never silently remaps headers');
ok(gs.includes('MASTER_LAYOUT = { title_row: 1, note_row: 2, header_row: 3, data_from_row: 4 }'), 'the GS reads the master sheet with the verified template layout');

/* ⑤ 文件存在 */
ok(fs.existsSync(path.join(root, 'docs/2027_UNIFIED_GS_GUIDE.md')), 'the deployment guide exists');

console.log(`unified 2027 connection passed (${n} checks)`);
