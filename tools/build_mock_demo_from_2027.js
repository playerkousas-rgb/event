#!/usr/bin/env node
'use strict';
/* Build the selectable 2027 rehearsal event from the 2027-owned read model.
 * No 2026 data file is opened by this command. */
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const P2027=path.join(root,'data/isd_2027.json');
const PMOCK=path.join(root,'data/mock_demo.json');
const PEVENTS=path.join(root,'data/events.json');
const sourceBytes=fs.readFileSync(P2027);
const source=JSON.parse(sourceBytes);
if(source.event_id!=='isd_2027') throw new Error('Expected the independent 2027 source event_id isd_2027');
const mock=JSON.parse(JSON.stringify(source));
mock.event_id='mock_demo';
mock.event_name='模擬示範版 2027 港島童軍繽紛日';
mock.description='2027 港島童軍繽紛日一體化演練版：資料只來自 ISD 2027 的受控來源快照；所有角色按權限模擬 2027 工作。';
mock.data_version=`2027-mock-from-source-${new Date().toISOString().slice(0,10)}`;
mock.mock_demo_source={
  source_event_id:'isd_2027',
  source_read_model:'data/isd_2027.json',
  source_sha256:crypto.createHash('sha256').update(sourceBytes).digest('hex'),
  builder:'tools/build_mock_demo_from_2027.js',
  policy:'This rehearsal product is rebuilt only from the independent 2027 source. 2026 is immutable provenance only and is never read at runtime.',
  rebuilt_at:new Date().toISOString()
};
fs.writeFileSync(PMOCK,JSON.stringify(mock,null,2)+'\n');

const events=JSON.parse(fs.readFileSync(PEVENTS,'utf8'));
const card=events.find(event=>event.event_id==='mock_demo');
if(!card) throw new Error('events.json must retain the mock_demo picker entry');
card.event_name=mock.event_name;
card.description='2027 角色式一體化演練：受控來源在 ISD 2027 資料夾，前端／後端更新只寫入 2027。2026 封存資料不會被改動或同步。';
card.start_date='2027-10-03'; card.end_date='2027-10-03';
card.time='09:00 - 18:00';
card.location='黃竹坑香港警察學院（2027 演練環境）';
card.weather='待 2027 籌委確認';
card.news='2027 演練版：資料由 ISD 2027 受控來源載入，請在所屬 2027 資料夾／前端流程更新。';
fs.writeFileSync(PEVENTS,JSON.stringify(events,null,2)+'\n');
console.log(`Built mock_demo from independent 2027 source (${mock.mock_demo_source.source_sha256.slice(0,12)}…)`);
