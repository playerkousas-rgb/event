#!/usr/bin/env node
/* Independent 2027 rehearsal source test.
 * Kept at the historical filename so existing test runners continue to run it. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const mk=JSON.parse(read('data/mock_demo.json'));
const source=JSON.parse(read('data/isd_2027.json'));
const archive=JSON.parse(read('data/isd_2026.json'));
const events=JSON.parse(read('data/events.json'));
let n=0;
const ok=(c,m)=>{assert(c,m);n++;};
const get=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
const len=v=>Array.isArray(v)?v.length:(v&&typeof v==='object'?Object.keys(v).length:0);

/* A rehearsal product must faithfully be built from 2027-owned source records. */
const SETS=[
  ['participants',31],['troop_checkin',31],['ceremony.meritRoster',188],
  ['guest_roster.guests',102],['ceremony.ug_guests',8],['ceremony.adult_awards',6],
  ['staff.event_staff_roster',279],['staff_meals',290],['souvenirs.staff_roster',290]
];
for(const [p,expect] of SETS){
  const s=len(get(source,p)),m=len(get(mk,p));
  ok(s===expect,`2027 source ${p} should retain ${expect} one-time seed records (got ${s})`);
  ok(m===s,`mock ${p} must be built from the 2027 source (${m}/${s})`);
}
ok(get(mk,'participants').every(p=>p.unit_name&&p.area&&p.headcount!==undefined),'participant source includes unit/area/headcount');
ok(get(mk,'participants').reduce((a,p)=>a+(+p.headcount||0),0)>1000,'participant seed has usable rehearsal scale');

const PUBLIC_CARD_DATA=[
  ['announcements.announcements',3],['unit_guide.docs',5],['schedule',6],['activities.booths',33],
  ['staff.org_chart',50],['staff.contacts',60],['staff.job_duties',11],['staff_meals',290],
  ['meal_menu',9],['meal_distribution.staff_groups',14],['crisis.team',14],['crisis.contacts',13],
  ['documents',79],['notices',3],['ceremony.rundown_part1_v5.rows',13],['ceremony.mc_scripts',3],
  ['ceremony.inspection_route.steps',6],['ceremony.meritRoster',188],['public_channel_2027.audiences',7]
];
for(const [p,min] of PUBLIC_CARD_DATA) ok(len(get(mk,p))>=min,`2027 mock ${p} should be ready for its role view`);

/* Normalized role structures are carried forward under 2027 ownership. */
const org=mk.staff.org_chart;
ok(org.every(r=>r.group&&r.title&&r.names&&r.desc&&/Level\s*\d/.test(r.level)),'org chart rows are complete');
ok(org.every(r=>!/[\s、,，]/.test(String(r.names).trim())),'org chart remains one person per row');
for(const group of ['顧問團','主席及執行副主席','秘書處','會操及典禮組','主題節目組','品牌推廣組','嘉賓接待組','協調組','服務及發展組','行政組']) ok(new Set(org.map(r=>r.group)).has(group),`org must include ${group}`);
const named=mk.staff.contacts.filter(c=>c.name);
ok(named.every(c=>/^\d{8}$/.test(String(c.contact))||c.contact_missing===true),'named contacts have normalized phone or explicit missing marker');
ok(mk.users.length>=54&&mk.users.every(u=>/^\d{8}$/.test(String(u.contact))||u.contact===''),'2027 committee seed keeps account model and normalized contacts');
ok(mk.users.some(u=>u.name==='陳子明'),'role rehearsal account is retained');

/* 2026 is checked only for non-mutation, never for source equality. */
ok(Array.isArray(archive.crisis.accidents)&&archive.crisis.accidents.length===0,'2026 archive remains untouched');
ok(mk.crisis.accidents.length>0,'2027 rehearsal preserves its workflow sample');
ok(mk.event_id==='mock_demo','mock event id remains stable');
ok(mk.mock_demo_source?.source_event_id==='isd_2027','mock source is the independent 2027 event');
ok(mk.mock_demo_source?.source_sha256,'mock records its exact 2027 source build');
const card=events.find(e=>e.event_id==='mock_demo');
ok(card&&card.event_name===mk.event_name,'picker and mock name remain aligned');
ok(mk.drive.root_folder_id==='1qzaHkoua5Se2rOn1z6LljVmlIq-oae3Q','mock uses ISD 2027 Drive root');
ok(!Object.hasOwn(mk,'staff_meals_2026')&&Array.isArray(mk.staff_meals),'runtime field names no longer bind operations to 2026');

/* Tool contracts: all normal builders use only independent 2027 data. */
const pc=read('tools/build_pc2027_demo.js');
const rebuild=read('tools/build_mock_demo_from_2027.js');
const oldNameShim=read('tools/fill_mock_demo_from_2026.js');
for(const text of [pc,rebuild]){
  ok(text.includes('data/isd_2027.json'),'2027 builder reads the 2027 source');
  ok(!text.includes("require('./reference_archive.js')"),'2027 builder cannot read the reference archive');
}
ok(oldNameShim.includes('DEPRECATED')&&!oldNameShim.includes("require('./reference_archive.js')"),'old fill command is a safe 2027-only compatibility shim');
ok(fs.existsSync(path.join(root,'tools/export_2027_drive_sources.js')),'Drive domain exporter exists');

console.log(`2027 rehearsal source test passed (${n} assertions)｜participants ${len(mk.participants)}・staff shifts ${len(mk.staff.event_staff_roster)}・merit ${len(mk.ceremony.meritRoster)}・documents ${len(mk.documents)}`);
