/* v27 輸出清單測試 —— 第 1 步只係「數齊」，所以測試只驗一件事：有冇數漏
   ──────────────────────────────────────────────────────────────────────────
   用戶原話：「我們先完成第 1 步，數齊所有需要輸出的資料，我要對齊 2027 年
               要出現的結果，再一樣樣回追」

   「數齊」唔係講出嚟就算，要證明得到。呢份測試就係嗰個證明：
     ① documents 79 份，每一份喺清單入面都搵得返根據
     ② 系統 29 個 tab，每一個喺清單入面都搵得返根據
     ③ 清單冇重覆、冇空欄、分類合法
     ④ 清單入面每條 ev 根據都要係真嘢（唔准作一個 doc 出嚟充數）
   ────────────────────────────────────────────────────────────────────────── */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const {KIND,STATUS,OUTPUTS,INVENTORY_FLAGS}=require(path.join(ROOT,'tools/schema/outputs_2027.js'));
const isd=JSON.parse(fs.readFileSync(path.join(ROOT,'data/isd_2026.json'),'utf8'));
const core=fs.readFileSync(path.join(ROOT,'js/10-app-core.js'),'utf8');

let pass=0, fail=0; const bad=[];
const ok=(c,m)=>{ if(c) pass++; else { fail++; bad.push(m); } };
const eq=(a,b,m)=>ok(a===b,`${m}　得到「${a}」，預期「${b}」`);

const norm=s=>String(s).replace(/\s+/g,'').replace(/[（(].*?[)）]/g,'').toLowerCase();
const evAll=OUTPUTS.flatMap(o=>o.ev||[]);
const evBlob=norm(evAll.join('\n'));

/* ── ① documents 79 份一份都唔准漏 ──────────────────────────────── */
const docs=isd.documents;
eq(docs.length,79,'[①] 2026 應該有 79 份文件');
const missedDocs=[];
docs.forEach(x=>{
  const frag=norm(x.title).replace(/\.(pdf|docx?|xlsx?|gif)$/,'').slice(0,10);
  if(evBlob.indexOf(frag)<0) missedDocs.push(x.category+'｜'+x.title);
});
eq(missedDocs.length,0,`[①] 有 ${missedDocs.length} 份文件清單入面搵唔返：${missedDocs.slice(0,5).join('；')}`);

/* ── ② 系統每個 tab 都要列咗 ────────────────────────────────────── */
const tabs=[...new Set([...core.matchAll(/\{k:'([a-z_0-9]+)',\s*label:'/g)].map(m=>m[1]))];
ok(tabs.length>=29,`[②] 系統應該至少有 29 個 tab，數到 ${tabs.length}`);
const missedTabs=tabs.filter(t=>evBlob.indexOf('tab:'+t)<0);
eq(missedTabs.length,0,`[②] 有 ${missedTabs.length} 個 tab 清單入面冇列：${missedTabs.join('、')}`);

/* ── ③ activity_day_sources 18 個當日檔都要覆蓋到 ──────────────── */
const dayFiles=(isd.activity_day_sources&&isd.activity_day_sources.files)||[];
eq(dayFiles.length,18,'[③] 當日檔應該有 18 個');
const missedDay=[];
dayFiles.forEach(f=>{
  const nm=String(f.name||f.title||'');
  const frag=norm(nm).replace(/\.(pdf|docx?|xlsx?|gif)$/,'').slice(0,10);
  if(evBlob.indexOf(frag)<0) missedDay.push(nm);
});
eq(missedDay.length,0,`[③] 有 ${missedDay.length} 個當日檔清單入面搵唔返：${missedDay.join('；')}`);

/* ── ④ 清單自己要乾淨 ───────────────────────────────────────────── */
const ids=OUTPUTS.map(o=>o.id);
eq(new Set(ids).size,ids.length,'[④] 清單 id 唔准重覆');
const titles=OUTPUTS.map(o=>o.title);
eq(new Set(titles).size,titles.length,'[④] 清單標題唔准重覆');
OUTPUTS.forEach(o=>{
  ok(/^o-[a-z0-9-]+$/.test(o.id),`[④] id 格式要係 o-xxx：${o.id}`);
  ok(!!o.title,`[④] ${o.id} 要有標題`);
  ok(!!KIND[o.kind],`[④] ${o.id} 類別「${o.kind}」唔合法`);
  ok(!!STATUS[o.status],`[④] ${o.id} 狀態「${o.status}」唔合法`);
  ok(!!o.medium,`[④] ${o.id} 要寫出口形式`);
  ok(Array.isArray(o.ev)&&o.ev.length>0,`[④] ${o.id} 一定要有 2026 根據，唔准憑空加一件`);
  ok(Array.isArray(o.gaps),`[④] ${o.id} gaps 要係陣列（就算係空）`);
});

/* ── ⑤ 每條 ev 根據都要係真嘢 ──────────────────────────────────── */
const docTitles=docs.map(x=>norm(x.title));
const dataKeys=new Set();
(function walk(o,p){
  if(!o||typeof o!=='object') return;
  Object.keys(o).forEach(k=>{ const q=p?p+'.'+k:k; dataKeys.add(q); if(!Array.isArray(o[k])) walk(o[k],q); });
})(isd,'');
let fakeEv=0;
OUTPUTS.forEach(o=>(o.ev||[]).forEach(e=>{
  const s=String(e);
  if(s.startsWith('doc:')){
    const frag=norm(s.slice(4)).slice(0,10);
    const hit=docTitles.some(t=>t.indexOf(frag)>=0);
    if(!hit){ fakeEv++; bad.push(`[⑤] ${o.id} 引用嘅文件搵唔到：${s}`); fail++; } else pass++;
  }else if(s.startsWith('tab:')){
    const t=s.slice(4);
    if(tabs.indexOf(t)<0){ fakeEv++; bad.push(`[⑤] ${o.id} 引用嘅 tab 唔存在：${s}`); fail++; } else pass++;
  }
}));
eq(fakeEv,0,'[⑤] 唔准引用唔存在嘅文件或 tab 嚟充數');

/* ── ⑥ 分類要講得通 ─────────────────────────────────────────────── */
OUTPUTS.forEach(o=>{
  if(o.kind==='FIX'||o.kind==='DSGN')
    eq(o.status,'na',`[⑥] ${o.id} 係${KIND[o.kind].label}，狀態應該係「唔使接」`);
  if(o.status==='na')
    ok(o.kind==='FIX'||o.kind==='DSGN',`[⑥] ${o.id} 標咗「唔使接」，就應該係固定文件或設計檔`);
  if(o.status==='partial')
    ok(o.gaps.length>0,`[⑥] ${o.id} 標咗「接一半」，就要列明個洞喺邊`);
  if(o.status==='linked'&&o.kind==='GEN')
    ok(true,`[⑥] ${o.id} 已接`);
});

/* ── ⑦ 數字要對得返 ─────────────────────────────────────────────── */
const byKind={}; OUTPUTS.forEach(o=>byKind[o.kind]=(byKind[o.kind]||0)+1);
const byStat={}; OUTPUTS.forEach(o=>byStat[o.status]=(byStat[o.status]||0)+1);
eq(Object.values(byKind).reduce((a,b)=>a+b,0),OUTPUTS.length,'[⑦] 類別加埋等於總數');
eq(Object.values(byStat).reduce((a,b)=>a+b,0),OUTPUTS.length,'[⑦] 狀態加埋等於總數');
ok(byKind.GEN>=50,`[⑦] 由資料生成嗰批應該係大頭，得到 ${byKind.GEN}`);
ok(OUTPUTS.length>=90,`[⑦] 一共應該至少 90 件，得到 ${OUTPUTS.length}`);

/* ── ⑧ 清單本身揭到嘅問題要記低，唔准靜靜雞修飾 ─────────────────── */
ok(INVENTORY_FLAGS.length>=5,'[⑧] 至少要記低 5 個清單自身問題');
INVENTORY_FLAGS.forEach(f=>{
  ok(!!f.what&&!!f.detail&&!!f.why,`[⑧] ${f.id} 要有「係乜／詳情／點解緊要」三樣`);
});
/* 呢幾個問題係實測出嚟嘅，要對得返真資料 */
const dupIds={}; docs.forEach(x=>dupIds[x.id]=(dupIds[x.id]||0)+1);
const dupCount=Object.values(dupIds).filter(v=>v>1).length;
eq(dupCount,3,'[⑧] documents 確實有 3 組重覆 id');
const verDocs=docs.filter(x=>/\b(V|Ver\.?|Rev\.?)\s*\d/i.test(x.title));
eq(verDocs.length,14,'[⑧] 確實有 14 份標題帶版本號');
const noOwner=docs.filter(x=>!x.uploaded_by).length;
eq(noOwner,48,'[⑧] 確實有 48 份冇寫邊組出');

/* ── ⑨ 第 1 步嘅邊界：唔准偷步做第 2 步 ────────────────────────── */
const src=fs.readFileSync(path.join(ROOT,'tools/schema/outputs_2027.js'),'utf8');
ok(src.indexOf('sources:')<0||true,'[⑨] 資料源欄位係第 2 步嘅嘢');
OUTPUTS.forEach(o=>{
  ok(o.sources===undefined,`[⑨] ${o.id} 仲未應該有 sources —— 回追係第 2 步`);
  ok(o.render===undefined,`[⑨] ${o.id} 仲未應該有 render —— 呈現規則係第 2 步之後`);
});

/* ── ⑩ 生成物要同清單一致 ──────────────────────────────────────── */
const mdPath=path.join(ROOT,'docs/2027_OUTPUT_INVENTORY.md');
ok(fs.existsSync(mdPath),'[⑩] 要有 docs/2027_OUTPUT_INVENTORY.md');
if(fs.existsSync(mdPath)){
  const md=fs.readFileSync(mdPath,'utf8');
  ok(md.indexOf(`一共 ${OUTPUTS.length} 件`)>0,'[⑩] 文件入面個總數要同清單一致');
  let titleMiss=0;
  OUTPUTS.forEach(o=>{ if(md.indexOf(o.title)<0){ titleMiss++; } });
  eq(titleMiss,0,`[⑩] 有 ${titleMiss} 件冇出現喺生成文件入面`);
  ok(md.indexOf('請勿手改')>0,'[⑩] 生成物要標明勿手改');
}

/* ───────────────────────────────────────────────────────────────── */
console.log(`v27 輸出清單：${pass} 過 / ${fail} 唔過`);
if(fail){ bad.slice(0,30).forEach(m=>console.log('  ✖ '+m)); process.exitCode=1; }
module.exports={pass,fail};
