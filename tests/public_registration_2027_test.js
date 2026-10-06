#!/usr/bin/env node
'use strict';
/* Minimal public registration is a 2027-only, standard-record contract. */
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0; const ok=(v,m)=>{if(!v) throw new Error('FAIL: '+m); n++;};

const source=JSON.parse(read('data/isd_2027.json'));
const mock=JSON.parse(read('data/mock_demo.json'));
const registration=source.public_channel_2027 && source.public_channel_2027.public_registration_2027;
ok(registration && registration.title==='2027 公眾報名','2027 source owns public-registration definition');
ok(JSON.stringify(registration).indexOf('2026')===-1,'new standard does not preserve historical 2026 rules');
ok(mock.public_channel_2027 && JSON.stringify(mock.public_channel_2027.public_registration_2027)===JSON.stringify(registration),'MOCK is built from the independent 2027 source');
const ids=['unit_group','guest_awardee','partner_organisation','family_public'];
ok((registration.categories||[]).map(x=>x.id).join('|')===ids.join('|'),'four clear registrant categories are exposed');
ok(registration.categories.every(c=>c.target && c.reports && c.reports.length>=4),'every type says who fills it and what it supplies');
ok(registration.categories.every(c=>c.fields.some(f=>f.key==='attending_count'&&f.required)&&c.fields.some(f=>f.key==='meal_count')&&c.fields.some(f=>f.key==='dietary_needs')&&c.fields.some(f=>f.key==='accessibility_needs')&&c.fields.some(f=>f.key==='transport')&&c.fields.some(f=>f.key==='privacy_consent'&&f.required)),'all types collect attendance and standard planning needs');
ok(registration.categories.every(c=>c.fields.some(f=>f.key==='phone'&&f.required)),'all types give a contact telephone');

const js=read('js/44-public-channel.js');
ok(js.includes("pcOpenPublicRegistration('select')") && js.includes('pcPublicRegistrationHTML'),'public landing has a registration selector and form renderer');
ok(js.includes('pcCanonicalPublicRegistration') && js.includes("schema:'isd2027.public_registration.v1'"),'submission uses one canonical record model');
ok(js.includes('2027 標準公眾報名摘要') && js.includes('個人聯絡及需要留在受權限保護'),'internal intake summary is aggregated and privacy-aware');
ok(read('docs/2027_PUBLIC_REGISTRATION_CONTRACT.md').includes('Google Sheet、GAS 或後端'),'contract expressly defers backend implementation');

const inner=js.slice(js.indexOf('Object.assign(ScoutEventApp.prototype,{')+'Object.assign(ScoutEventApp.prototype,{'.length,js.lastIndexOf('});'));
const memory={};
const ctx={
  localStorage:{getItem:k=>Object.prototype.hasOwnProperty.call(memory,k)?memory[k]:null,setItem:(k,v)=>{memory[k]=v;}},
  showToast:()=>{}, console, document:{querySelector:()=>null,getElementById:()=>null}, setTimeout:()=>0
};
const App=vm.runInNewContext(`
function escapeHtml(s){ return String(s); }
class ScoutEventApp{}
Object.assign(ScoutEventApp.prototype,{${inner.replace(/^[ \t]*,[ \t]*$/gm,'')}});
ScoutEventApp;
`,ctx);
const app=new App(); app.eventData={id:'mock_demo',public_channel_2027:mock.public_channel_2027};
const unit=registration.categories.find(c=>c.id==='unit_group');
const vals={unit_name:'測試第 1 旅',unit_type:'童軍旅',contact_name:'陳大文',phone:'91234567',email:'test@example.test',attending_count:25,youth_count:20,adult_count:5,meal_count:22,dietary_needs:'素食 1',accessibility_needs:'輪椅通道',transport:'旅遊巴',vehicle_count:1,privacy_consent:true};
const record=app.pcCanonicalPublicRegistration(unit,vals,'PR-U0001');
ok(record.registration_id==='PR-U0001'&&record.registrant_type==='unit_group'&&record.status==='submitted','one submission receives a stable canonical identity and type');
ok(record.contact.phone==='91234567'&&record.organisation.name==='測試第 1 旅','contact and organisation normalize into the standard record');
ok(record.attendance.total===25&&record.needs.meal_count===22&&record.transport.vehicle_count===1,'attendance, needs and transport normalize into shared fields');
ok(record.field_values===vals,'category-specific source values remain on the same record, not a separate list');
app.pcSavePublicRegistrationSubmissions([record]);
const stats=app.pcPublicRegistrationStats();
ok(stats.submissions===1&&stats.people===25&&stats.meals===22&&stats.dietary===1&&stats.access===1&&stats.vehicles===1,'summary derives planning totals from the canonical record');
ok(stats.byCategory.find(x=>x.id==='unit_group').people===25&&stats.byCategory.find(x=>x.id==='guest_awardee').people===0,'summary groups records by registrant type without creating a second dataset');
console.log(`✓ public registration 2027 (${n} assertions)`);
