#!/usr/bin/env node
'use strict';
/**
 * v22 連結總表（一處更新、全站同步）＋ 內容格式全鎖定 回歸測試
 *  ① 登記處存在、每條連結有主人／類型／URL／用喺邊幾個位
 *  ② targets 全部真係指到 data/mock_demo.json 入面嘅位（零死路徑）
 *  ③ 同一條 URL 唔會分裂成兩條記錄；同一個位唔會被兩條連結爭
 *  ④ 改一條 → 全部 targets 一齊變（純函數層面驗證）
 *  ⑤ 權限：本組改本組；秘書處／行政組／管理層統籌
 *  ⑥ 公眾頻道文字內容【全鎖定】，連管理員都改唔到
 *  ⑦ 已掛接：index.html 載入、loadEventData 會套用、部門中心有頁籤
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0; const ok=(c,m)=>{ if(!c) throw new Error('FAIL: '+m); n++; };

const mock=JSON.parse(read('data/mock_demo.json'));
const reg=mock.link_registry;

/* 喺 vm 跑模組，攞返純函數 */
const sb={ScoutEventApp:function(){},console,escapeHtml:s=>String(s),showToast:()=>{}};
sb.ScoutEventApp.prototype={}; vm.createContext(sb);
vm.runInContext(read('js/48-link-registry.js'),sb);
const P=sb.ScoutEventApp.prototype;

/* ── ① 登記處 ── */
ok(reg&&Array.isArray(reg.links),'① data/mock_demo.json 有 link_registry.links');
ok(reg.links.length>=1,'① 至少一條已發佈的 2027 連結（實際 '+reg.links.length+'）；舊 2026 Drive 連結已刻意脫鈎');
ok(reg.total_targets>=reg.links.length,'① 接管位置（'+reg.total_targets+'）唔少過連結數');
const GROUPS=new Set((mock.staff&&mock.staff.org_chart||[]).map(r=>r.group).filter(Boolean));
const KINDS=Object.keys(P.LINK_KIND_META);
reg.links.forEach(l=>{
  ok(l.id&&typeof l.id==='string','① 每條有 id');
  ok(l.label&&l.label.trim(),'① 每條有名：'+l.id);
  ok(KINDS.indexOf(l.kind)>=0,'① 類型已知：'+l.id+' = '+l.kind);
  ok(/^https?:\/\//.test(l.url),'① URL 格式正確：'+l.id);
  ok(GROUPS.has(l.owner),'① 負責組「'+l.owner+'」係架構入面真實存在嘅組（'+l.id+'）');
  ok(Array.isArray(l.targets)&&l.targets.length>=1,'① 至少用喺一個位：'+l.id);
  ok(l.uses===l.targets.length,'① uses 同 targets 數目一致：'+l.id);
});
const ids=reg.links.map(l=>l.id);
ok(new Set(ids).size===ids.length,'① id 冇重複');

/* ── ② targets 零死路徑 ── */
const get=(o,p)=>String(p).replace(/\[(\d+)\]/g,'.$1').split('.').reduce((x,k)=>(x==null?undefined:x[k]),o);
const dead=[];
reg.links.forEach(l=>l.targets.forEach(t=>{ if(typeof get(mock,t)!=='string') dead.push(l.id+' → '+t); }));
ok(dead.length===0,'② 全部 '+reg.total_targets+' 個 target 都指到真實欄位（死路徑：'+dead.slice(0,3).join(', ')+'）');
// 每個 target 現時嘅值真係等於登記嘅 URL
const mismatch=[];
reg.links.forEach(l=>l.targets.forEach(t=>{ if(get(mock,t)!==l.url) mismatch.push(l.id+' → '+t); }));
ok(mismatch.length===0,'② 每個 target 現值同登記 URL 一致（唔一致：'+mismatch.slice(0,3).join(', ')+'）');

/* ── ③ 唔分裂、唔爭位 ── */
const byUrl={}; reg.links.forEach(l=>(byUrl[l.url]=byUrl[l.url]||[]).push(l.id));
const split=Object.entries(byUrl).filter(([,v])=>v.length>1);
ok(split.length===0,'③ 同一條 URL 得一筆記錄（分裂咗：'+split.slice(0,2).map(e=>e[1].join('/')).join(' ; ')+'）');
const owner={}; const fight=[];
reg.links.forEach(l=>l.targets.forEach(t=>{ if(owner[t]) fight.push(t); else owner[t]=l.id; }));
ok(fight.length===0,'③ 一個位置淨係由一條連結話事（爭位：'+fight.slice(0,3).join(', ')+'）');

/* 最高重覆連結可由多個 2027 domain 使用；即使現時只一處，登記處仍是唯一受控入口。 */
const hot=reg.links.slice().sort((a,b)=>b.uses-a.uses)[0];
ok(hot.uses>=1,'③ 最高重覆嘅 2027 連結至少接管一處（實際 '+hot.uses+'）');

/* ── ④ 一處更新 → 全站同步 ── */
const app=Object.create(P);
app.eventData=JSON.parse(JSON.stringify(mock));
app.currentEvent={event_id:'mock_demo'};
const NEW='https://drive.google.com/file/d/TEST2027/view';
app.getLinkOverrides=()=>({[hot.id]:{url:NEW,updated_by:'測試',updated_at:'2027-01-01 00:00'}});
const r=app.applyLinkRegistry(app.eventData);
ok(r.links===1,'④ 認得有 1 條連結改咗');
ok(r.targets===hot.uses,'④ 一次過同步咗 '+r.targets+' 個位置');
ok(r.missed.length===0,'④ 冇一個位置寫唔到');
ok(hot.targets.every(t=>get(app.eventData,t)===NEW),'④ 全部 '+hot.uses+' 個位置真係變咗新 URL');
// 冇連累其他連結
const other=reg.links.find(l=>l.id!==hot.id);
ok(other.targets.every(t=>get(app.eventData,t)===other.url),'④ 其他連結完全冇被郁到');
// 路徑讀寫支援陣列索引
ok(P.linkPathGet({a:[{b:'x'}]},'a[0].b')==='x','④ 路徑讀取支援 a[0].b');
const tmp={a:[{b:'x'}]}; ok(P.linkPathSet(tmp,'a[0].b','y')&&tmp.a[0].b==='y','④ 路徑寫入支援 a[0].b');
ok(P.linkPathSet({},'no.such.path','v')===false,'④ 寫唔到會老實回報 false，唔會靜靜雞起個新物件');

/* ── ⑤ 權限 ── */
const mk=g=>Object.assign(Object.create(P),{currentUser:{group_name:g,name:g},isAdmin:()=>false,isExecViceOrChair:()=>false});
const owned=reg.links[0];
const differentGroup=[...GROUPS].find(g=>g!==owned.owner)||'顧問團';
ok(owned&&owned.owner,'⑤ 每條已發佈 2027 連結均有負責組');
ok(mk(owned.owner).linkCanEdit(owned)===true,'⑤ 本組改得本組');
ok(mk(differentGroup).linkCanEdit(owned)===false,'⑤ 非負責組改唔到連結');
ok(mk('秘書處').linkCanEdit(owned)===true,'⑤ 秘書處統籌全部');
ok(mk('行政組').linkCanEdit(owned)===true,'⑤ 行政組統籌全部');
ok(Object.assign(mk('顧問團'),{isAdmin:()=>true}).linkCanEdit(owned)===true,'⑤ 管理層全開');
const owners=new Set(reg.links.map(l=>l.owner));
ok(owners.size>=1,'⑤ 現時 2027 發佈連結有 '+owners.size+' 個受控負責組');

/* 着燈 */
ok(P.linkFlags.call(P,{label:'x',url:'',uses:1,inline_uses:0}).some(f=>f.t==='冇連結'),'⑤ 冇連結會着燈');
ok(P.linkFlags.call(P,{label:'ISD2026 嘢',url:'https://a.b',uses:1,inline_uses:0,updated_at:''}).some(f=>/2026/.test(f.t)),'⑤ 仲係 2026 版會着燈');
ok(P.linkFlags.call(P,{label:'x',url:'https://a.b',uses:1,inline_uses:3}).some(f=>/內文/.test(f.t)),'⑤ 夾喺內文嘅連結會着燈叫人手跟');

/* ── ⑥ 內容全鎖定 ── */
const pcSrc=read('js/47-pc-content-editor.js');
const sb2={ScoutEventApp:function(){},console,escapeHtml:s=>String(s),showToast:()=>{}};
sb2.ScoutEventApp.prototype={}; vm.createContext(sb2); vm.runInContext(pcSrc,sb2);
const P2=sb2.ScoutEventApp.prototype;
ok(P2.PC_CONTENT_LOCKED===true,'⑥ PC_CONTENT_LOCKED = true（全鎖定）');
ok(Array.isArray(P2.PC_CONTENT_UNLOCKED)&&P2.PC_CONTENT_UNLOCKED.length===0,'⑥ 例外名單係空（真係全鎖）');
const locked=g=>Object.assign(Object.create(P2),{currentUser:{group_name:g,name:g},isAdmin:()=>false,isExecViceOrChair:()=>false});
ok(locked('服務及發展組').pcEditCanEdit('donate')===false,'⑥ 負責組都改唔到文字');
ok(Object.assign(locked('顧問團'),{isAdmin:()=>true}).pcEditCanEdit('donate')===false,'⑥ 連管理員都改唔到——規矩就係規矩');
ok(/格式已鎖定/.test(pcSrc),'⑥ 唯讀視圖寫明「格式已鎖定」');
ok(/連結總表/.test(pcSrc),'⑥ 唯讀視圖指路去連結總表換文件');
ok(/搵技術組/.test(pcSrc),'⑥ 唯讀視圖寫明改細字搵技術組');
ok(P2.PC_CONTENT_SCHEMA.length>=12,'⑥ 合約視圖仍然睇到 '+P2.PC_CONTENT_SCHEMA.length+' 個區塊屬邊組');

/* ── ⑦ 掛接 ── */
const html=read('index.html');
ok(/js\/48-link-registry\.js/.test(html),'⑦ index.html 已載入 48-link-registry.js');
const core=read('js/10-app-core.js');
ok(/applyLinkRegistry\(this\.eventData\)/.test(core),'⑦ loadEventData 載完資料即刻套用連結總表');
ok(/group_links/.test(core),'⑦ 部門中心有「連結總表」頁籤');
ok(/t\.k==='group_links'\) this\.renderLinkRegistry/.test(core),'⑦ 頁籤已接上 renderLinkRegistry');
ok(/scope:'group'/.test(core),'⑦ 一般組只見到本組連結，秘書處／行政組／管理員見全部');
const src48=read('js/48-link-registry.js');
ok(/Object\.assign\(ScoutEventApp\.prototype,\{/.test(src48),'⑦ 跟足 prototype 掛接寫法（測試 harness 要求）');
ok(!/writeFile|require\(/.test(src48),'⑦ 前端模組冇寫檔動作');
ok(fs.existsSync(path.join(root,'tools/build_link_registry.js')),'⑦ 有 tools/build_link_registry.js 可重新產生登記處');

console.log('v22 連結總表：'+n+' 項檢查全部通過');
console.log('  '+reg.links.length+' 條連結 ／ 接管 '+reg.total_targets+' 個位置 ／ 分佈 '+owners.size+' 個組');
console.log('  最高重覆：'+hot.uses+' 處（'+hot.label.slice(0,30)+'）→ 而家改一次就夠');
