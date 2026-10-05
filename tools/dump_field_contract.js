#!/usr/bin/env node
'use strict';
/**
 * 由 js/47-pc-content-editor.js 嘅 PC_CONTENT_SCHEMA 機械抽取「2027 欄位合約」。
 *
 * 點解要有呢個：第 2 步（回追源頭）唔靠人諗，靠程式抽。
 * schema 一改，合約即刻跟住改，兩邊永遠唔會脫節 —— 表單同合約係同一份嘢。
 *
 *   node tools/dump_field_contract.js           → Markdown 表（貼落 docs/）
 *   node tools/dump_field_contract.js --csv     → CSV（畀籌委 / 試算表）
 *   node tools/dump_field_contract.js --json    → JSON
 *   node tools/dump_field_contract.js --check   → 核對每條路徑喺 data/mock_demo.json 行唔行得通
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'js/47-pc-content-editor.js'),'utf8');

const sandbox={ScoutEventApp:function(){},console,escapeHtml:s=>String(s),showToast:()=>{}};
sandbox.ScoutEventApp.prototype={};
vm.createContext(sandbox); vm.runInContext(src,sandbox);
const SCHEMA=sandbox.ScoutEventApp.prototype.PC_CONTENT_SCHEMA;
const LOCKED=sandbox.ScoutEventApp.prototype.PC_LOCKED_KEYS;

const TYPE_ZH={text:'單行文字',textarea:'多行文字',list:'清單（一行一項）',pairs:'兩欄表（項目｜內容）',objlist:'項目清單'};
const rows=[];
SCHEMA.forEach(s=>s.fields.forEach(f=>{
  const base={section:s.label,owner:s.owner,path:'public_channel_2027.'+s.key+(f.k?'.'+f.k:''),field:f.label,type:TYPE_ZH[f.type]||f.type};
  rows.push(base);
  if(f.type==='objlist') (f.sub||[]).forEach(sf=>rows.push({
    section:s.label,owner:s.owner,path:base.path+'[].'+sf.k,field:'　└ '+sf.label,type:TYPE_ZH[sf.type]||sf.type}));
}));

const arg=process.argv.slice(2);
const has=f=>arg.indexOf(f)>=0;

if(has('--json')){ console.log(JSON.stringify({generated_from:'js/47-pc-content-editor.js',locked:LOCKED,rows},null,2)); process.exit(0); }

if(has('--csv')){
  const esc=v=>/[",\n]/.test(v)?'"'+String(v).replace(/"/g,'""')+'"':v;
  console.log(['區塊','負責組','欄位','型別','資料路徑'].join(','));
  rows.forEach(r=>console.log([r.section,r.owner,r.field,r.type,r.path].map(esc).join(',')));
  process.exit(0);
}

if(has('--check')){
  const pc=JSON.parse(fs.readFileSync(path.join(root,'data/mock_demo.json'),'utf8')).public_channel_2027;
  const get=(o,p)=>String(p).split('.').reduce((x,k)=>(x==null?undefined:x[k]),o);
  let bad=0;
  rows.filter(r=>r.path.indexOf('[]')<0).forEach(r=>{
    const v=get({public_channel_2027:pc},r.path);
    if(v===undefined){ bad++; console.log('✖ 死路徑  '+r.path); }
  });
  console.log(bad?`\n${bad} 條路徑接唔到資料`:`\n✓ ${rows.filter(r=>r.path.indexOf('[]')<0).length} 條路徑全部接得到 data/mock_demo.json`);
  process.exit(bad?1:0);
}

/* 預設：Markdown */
const byOwner={};
rows.forEach(r=>{ (byOwner[r.owner]=byOwner[r.owner]||[]).push(r); });
console.log('# 2027 欄位合約 — 公眾頻道（機械抽取）\n');
console.log('> 由 `js/47-pc-content-editor.js` 嘅 `PC_CONTENT_SCHEMA` 自動產生，請勿手改本檔。');
console.log('> 重新產生：`node tools/dump_field_contract.js > docs/2027_PC_FIELD_CONTRACT.md`\n');
console.log('每一格都有名有主。負責組喺 APP 嘅「部門中心 → 🌐 公眾頻道內容」自己改，即改即生效。\n');
Object.keys(byOwner).sort().forEach(o=>{
  console.log(`## ${o}（${byOwner[o].length} 格）\n`);
  console.log('| 區塊 | 欄位 | 型別 | 資料路徑 |');
  console.log('|---|---|---|---|');
  byOwner[o].forEach(r=>console.log(`| ${r.section} | ${r.field} | ${r.type} | \`${r.path}\` |`));
  console.log('');
});
console.log('## 結構（鎖死，組改唔到）\n');
console.log('以下屬於**框**唔係**內容**：分眾入口、頁簽組合、欄位名、名單之間點連。改呢啲等於改規矩，要經技術組。\n');
console.log(LOCKED.map(k=>'`public_channel_2027.'+k+'`').join('、')+'\n');
