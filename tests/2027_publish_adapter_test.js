#!/usr/bin/env node
'use strict';
/* Guard the deployable 2027 Apps Script adapter without invoking any backend. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const registry=JSON.parse(read('data/2027_drive_registry.json'));
const code=read('apps-script/Code2027.gs');
const guide=read('docs/2027_SOURCE_PUBLISH_ADAPTER.md');
const publicConfig=read('api/config.js');
const publicIntake=read('intake.html');
let n=0; const ok=(value,message)=>{assert.ok(value,message);n++;};

ok(registry.event_id==='isd_2027'&&registry.status==='blank_framework_ready_not_live','the adapter is anchored to the blank 2027 framework');
ok(registry.output_source_projection?.drive_file_id==='1BDCPaD1b8m0PaDj4hXr4f530TbHnqgzo','the adapter has a verified Drive output-projection target');
ok(code.includes("ISD2027_EVENT_ID = 'isd_2027'")&&code.includes("ISD2027_DRIVE_REGISTRY_FILE_ID = '1mUiVpt-DIvCLHZnySt-sruhnfQBIqGcR'"),'the isolated adapter has fixed verified 2027 source metadata');
ok(code.includes('function initialize2027Backend()')&&code.includes('ISD2027_APIKEY')&&code.includes('2027_Audit_Log'),'a distinct 2027 backend key and audit Sheet are required');
ok(code.includes("action === 'update2027Source'")&&code.includes("action === 'get2027Output'")&&code.includes("action === 'get2027Health'"),'the adapter exposes only the health, controlled-update and output-resolution actions');
ok(code.includes("event_id=isd_2027")&&code.includes('verify2027Request_')&&code.includes('Unauthorized 2027 API key'),'every request is fenced to the 2027 event and its distinct API key');
ok(code.includes('expected_revision')&&code.includes('Revision conflict'),'source writes use optimistic concurrency instead of last-write-wins');
ok(code.includes('Only the source owner group may update')&&code.includes('established approval group'),'source writes enforce the reviewed owner and approval group');
ok(code.includes("publication_status || '') !== 'approved'")&&code.includes('audit_id is required')&&code.includes('updated_at must be an ISO timestamp'),'only fully audited, approved source changes can publish');
ok(code.includes('ISD2027_BLOCKED_REFERENCES')&&code.includes('Blocked 2026/live reference in source payload'),'the adapter rejects 2026 live references inside a proposed 2027 record');
ok(code.includes('rebuild2027Projection_')&&code.includes('Pointers only: output endpoints resolve the current approved source record; no payload is duplicated here.'),'every successful source update rebuilds a payload-free projection');
ok(code.includes('previousDomain')&&code.includes('previousProjection')&&code.includes("outcome: 'reverted'"),'a failed source/pointer/audit operation restores the prior source and projection');
ok(code.includes("payload: ready === 'ready_to_render' ? primary.record.payload : null"),'outputs resolve only an approved canonical payload, without output-side persistence');
ok(code.split('ISD2026_GAS_URL').length-1===1&&code.split('data/isd_2026.json').length-1===1&&code.split('event_id=isd_2026').length-1===1,'2026 strings occur only in the adapter blocklist, never as an endpoint or archive dependency');
ok(guide.includes('Code2027.gs')&&guide.includes('ISD2027_GAS_URL')&&guide.includes('ISD2027_APIKEY')&&guide.includes('expected_revision'),'the deployment guide gives the independent 2027 setup and safety contract');
ok(guide.includes('repository 沒有替你部署 Apps Script')&&guide.includes('現有公眾／工作人員畫面仍是 rehearsal view'),'the guide does not represent the blank framework as an already-live frontend');
ok(!publicConfig.includes('apiKey2027')&&!publicConfig.includes('gasUrl2027')&&publicConfig.includes('sourceAdapter2027Configured'),'the public config endpoint reveals neither the 2027 write URL nor its API key');
ok(!publicIntake.includes('api_key')&&!publicIntake.includes('gas_url')&&publicIntake.includes('受控申報入口尚未啟用'),'the public intake page cannot submit source writes or receive the private adapter credential');
ok(guide.includes('不得')&&guide.includes('/api/config')&&guide.includes('browser JavaScript'),'the deployment guide explicitly forbids browser and public-config API-key exposure');
console.log(`2027 publish adapter package passed (${n} checks)`);
