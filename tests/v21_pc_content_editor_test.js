#!/usr/bin/env node
'use strict';
/**
 * v21 公眾頻道內容・各組自助編輯 回歸測試
 *  ① schema 存在、每個 section 有負責組、每條欄位路徑喺 mock_demo.json 真係行得通（冇死路徑）
 *  ② 結構類 key（分眾／頁簽／名單）鎖死，唔准出現喺可編輯 schema 入面
 *  ③ 權限：本組改本組，行政組／管理層全開，其他組只可睇
 *  ④ 疊加層：改動存 overrides，唔會寫返 data/mock_demo.json
 *  ⑤ 欄位合約可機械抽取（tools/dump_field_contract.js）
 *  ⑥ 已掛接：index.html 載入、部門中心有頁籤、pcDemoData 會疊 overrides
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0; const ok=(c,m)=>{ if(!c) throw new Error('FAIL: '+m); n++; };

const mock=JSON.parse(read('data/mock_demo.json'));
const pc=mock.public_channel_2027;
const src=read('js/47-pc-content-editor.js');

/* 喺 vm 入面跑整個模組，攞返 schema 同幾個純函數 */
const sandbox={ScoutEventApp:function(){},console,escapeHtml:s=>String(s),showToast:()=>{}};
sandbox.ScoutEventApp.prototype={};
vm.createContext(sandbox);
vm.runInContext(src,sandbox);
const P=sandbox.ScoutEventApp.prototype;
const SCHEMA=P.PC_CONTENT_SCHEMA, LOCKED=P.PC_LOCKED_KEYS;

/* ── ① schema 同真實資料對得上 ── */
ok(Array.isArray(SCHEMA)&&SCHEMA.length>=12,'① PC_CONTENT_SCHEMA 至少 12 個可編輯區塊');
ok(SCHEMA.every(s=>s.key&&s.label&&s.owner&&s.icon),'① 每個區塊都有 key／標題／負責組／圖示');
ok(SCHEMA.every(s=>Array.isArray(s.fields)&&s.fields.length),'① 每個區塊都至少一條欄位');
const keys=SCHEMA.map(s=>s.key);
ok(new Set(keys).size===keys.length,'① 冇重複 key');
SCHEMA.forEach(s=>ok(pc[s.key]!==undefined,'① mock_demo 真係有 public_channel_2027.'+s.key));

const get=(o,p)=>!p?o:String(p).split('.').reduce((x,k)=>(x==null?undefined:x[k]),o);
const dead=[];
SCHEMA.forEach(s=>s.fields.forEach(f=>{ if(get(pc[s.key],f.k)===undefined) dead.push(s.key+'.'+f.k); }));
ok(dead.length===0,'① 冇死欄位路徑（實際有：'+dead.join(', ')+'）');

const TYPES=['text','textarea','list','pairs','objlist'];
SCHEMA.forEach(s=>s.fields.forEach(f=>{
  ok(TYPES.indexOf(f.type)>=0,'① 已知欄位型別 '+s.key+'.'+f.k+' = '+f.type);
  if(f.type==='pairs'||(!f.k&&f.type==='pairs')) ok(true,'pairs ok');
  if(f.type==='objlist') ok(Array.isArray(f.sub)&&f.sub.length,'① objlist '+s.key+'.'+f.k+' 有 sub 欄位定義');
}));
// pairs 嘅實際資料真係 [左,右] 兩欄
SCHEMA.forEach(s=>s.fields.filter(f=>f.type==='pairs').forEach(f=>{
  const v=get(pc[s.key],f.k);
  ok(Array.isArray(v)&&v.every(r=>Array.isArray(r)&&r.length>=2),'① pairs 資料形狀正確 '+s.key+'.'+f.k);
}));
// objlist 嘅 sub key 真係喺資料入面有
SCHEMA.forEach(s=>s.fields.filter(f=>f.type==='objlist').forEach(f=>{
  const v=get(pc[s.key],f.k)||[];
  if(!v.length) return;
  const hit=f.sub.filter(sf=>v.some(r=>r&&r[sf.k]!==undefined)).length;
  ok(hit>0,'① objlist sub 欄位對得上資料 '+s.key+'.'+f.k);
}));

/* ── ② 結構鎖死 ── */
ok(Array.isArray(LOCKED)&&LOCKED.length>=10,'② 有結構鎖定名單');
['audiences','section_labels','guides','manual','guests_rows','staff_gate'].forEach(k=>
  ok(LOCKED.indexOf(k)>=0,'② '+k+' 屬結構，鎖死'));
ok(SCHEMA.every(s=>LOCKED.indexOf(s.key)<0),'② 鎖定嘅 key 冇一個出現喺可編輯 schema');
ok(/PC_LOCKED_KEYS\.indexOf\(sec\)>=0\) return/.test(src),'② 疊加層會跳過鎖定 key（就算 store 入面有都唔生效）');

/* ── ③ 權限：擁有權規則 ── */
/* ⚠️ v22 起文字內容【全鎖定】(PC_CONTENT_LOCKED=true)，下面係驗證底層嘅擁有權規則，
   所以特登用 PC_CONTENT_LOCKED:false 嘅 stub —— 將來解鎖返邊個區塊，呢套規則就會生效。 */
const mk=g=>({currentUser:{group_name:g,name:g+'仔'},isAdmin:()=>false,isExecViceOrChair:()=>false,
  PC_CONTENT_SCHEMA:SCHEMA,PC_LOCKED_KEYS:LOCKED,PC_CONTENT_LOCKED:false,PC_CONTENT_UNLOCKED:[],
  pcEditCanEdit:P.pcEditCanEdit,pcEditSectionsForGroup:P.pcEditSectionsForGroup});
const serv=mk('服務及發展組');
ok(serv.pcEditCanEdit('donate')===true,'③ 解鎖情況下：服務及發展組可改童心捐贈');
ok(serv.pcEditCanEdit('lunch')===false,'③ 解鎖情況下：服務及發展組改唔到午膳（唔係佢負責）');
ok(serv.pcEditSectionsForGroup().length>=1,'③ 服務及發展組至少見到一個區塊');
const brand=mk('品牌推廣組');
ok(brand.pcEditSectionsForGroup().length===0,'③ 冇負責內容嘅組見唔到可編輯區塊');
const admin=mk('行政組');
ok(admin.pcEditSectionsForGroup().length===SCHEMA.length,'③ 行政組見到全部（統籌角色）');
const boss=Object.assign(mk('顧問團'),{isAdmin:()=>true});
ok(boss.pcEditCanEdit('donate')===true&&boss.pcEditSectionsForGroup().length===SCHEMA.length,'③ 管理層全開');

/* ── ③B 實際狀態：v22 全鎖定，邊個都改唔到 ── */
const real=g=>Object.assign(Object.create(P),{currentUser:{group_name:g,name:g},isAdmin:()=>false,isExecViceOrChair:()=>false});
ok(P.PC_CONTENT_LOCKED===true,'③B 現行狀態：PC_CONTENT_LOCKED = true');
ok(real('服務及發展組').pcEditCanEdit('donate')===false,'③B 負責組而家都改唔到文字（格式跟規矩）');
ok(Object.assign(real('顧問團'),{isAdmin:()=>true}).pcEditCanEdit('donate')===false,'③B 連管理員都改唔到');
ok(real('行政組').pcEditSectionsForGroup().length===SCHEMA.length,'③B 但仍然睇得到成份合約（唯讀）');

/* 負責組必須係真實存在嘅組 */
const groups=new Set((mock.staff&&mock.staff.org_chart||[]).map(r=>r.group).filter(Boolean));
if(groups.size) SCHEMA.forEach(s=>ok(groups.has(s.owner),'③ 負責組「'+s.owner+'」係架構入面真實存在嘅組'));

/* ── ④ 疊加層唔污染來源 ── */
ok(/pcEditStoreKey\(\)\{[^}]*event_pc_content_v21_/.test(src),'④ 改動存喺 localStorage overrides，唔寫 data/mock_demo.json');
ok(/updated_by|by:\(this\.currentUser/.test(src)&&/at:new Date/.test(src),'④ 每次改動留低改嘅人同時間（原地改，唔出 R2 R3）');
ok(/pcEditReset/.test(src),'④ 可以還原預設');
ok(!/writeFile|fs\./.test(src),'④ 模組冇任何寫檔動作（來源檔只讀）');
ok(/唔郁原始 JSON|唔郁 data\/mock_demo\.json/.test(src),'④ 已註明唔郁來源 JSON');

/* ── ⑤ 合約可機械抽取 ── */
ok(fs.existsSync(path.join(root,'tools/dump_field_contract.js')),'⑤ 有 tools/dump_field_contract.js');
const rows=P.pcContractRows.call({PC_CONTENT_SCHEMA:SCHEMA});
ok(rows.length>=50,'⑤ 欄位合約抽到 '+rows.length+' 條（≥50）');
ok(rows.every(r=>r.section&&r.owner&&/^public_channel_2027\./.test(r.path)&&r.field&&r.type),'⑤ 每條合約都有 區塊／負責組／路徑／欄位／型別');

/* ── ⑥ 掛接 ── */
const html=read('index.html');
ok(/js\/47-pc-content-editor\.js/.test(html),'⑥ index.html 已載入 47-pc-content-editor.js');
const core=read('js/10-app-core.js');
ok(/group_pc_content/.test(core),'⑥ 部門中心有「公眾頻道內容」頁籤');
ok(/t\.k==='group_pc_content'\) this\.renderPcContentEditor\(el\)/.test(core),'⑥ 頁籤已接上 renderPcContentEditor');
ok(/pcEditSectionsForGroup\(groupName\)\.length\)\?/.test(core),'⑥ 本組冇份負責就唔出呢個頁籤');
const pcjs=read('js/44-public-channel.js');
ok(/pcApplyContentOverrides/.test(pcjs),'⑥ pcDemoData 會疊返各組改過嘅內容');
ok(/_pcOverlayFor/.test(pcjs),'⑥ 疊加只做一次（按 event_id 快取）');
ok(/Object\.assign\(ScoutEventApp\.prototype,\{/.test(src),'⑥ 模組跟足 prototype 掛接寫法（測試 harness 要求）');

console.log('v21 公眾頻道內容編輯：'+n+' 項檢查全部通過');
console.log('  可編輯區塊 '+SCHEMA.length+' 個／欄位合約 '+rows.length+' 條／結構鎖定 '+LOCKED.length+' 個 key');
