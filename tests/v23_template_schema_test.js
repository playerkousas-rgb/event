#!/usr/bin/env node
'use strict';
/**
 * v23 2027 範本 schema 回歸測試
 *  ① schema 完整：每份範本有負責組／唯一鍵／餵去邊／會點改／規矩
 *  ② 三級制：每份至少一個「必須」；標咗「必須」嘅欄位喺 2026 真實資料要真係全齊
 *  ③ 鐵律一：同一件事實唔准喺兩份範本各有一份（fid）；ref 要指得到
 *  ④ target 行得通：每份範本讀返 data/mock_demo.json 都搵到真實資料
 *  ⑤ 合約檔同 schema 一致（APP 同範本讀同一份）
 *  ⑥ 範本檔真係生成咗，而且 mock 版有 2026 真實資料
 *  ⑦ 跨範本共用維度有標 ref，寫法衝突查得出（2026 旅名中文／阿拉伯數字）
 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0; const ok=(c,m)=>{ if(!c) throw new Error('FAIL: '+m); n++; };

const {LEVEL,TEMPLATES}=require(path.join(root,'tools/schema/templates_2027.js'));
const mock=JSON.parse(read('data/mock_demo.json'));
const getAt=(o,p)=>String(p).replace(/\[(\d+)\]/g,'.$1').split('.').reduce((x,k)=>(x==null?undefined:x[k]),o);

/* ── ① schema 完整 ── */
ok(TEMPLATES.length>=6,'① 至少 6 份範本（實際 '+TEMPLATES.length+'）');
const GROUPS=new Set((mock.staff&&mock.staff.org_chart||[]).map(r=>r.group).filter(Boolean));
TEMPLATES.forEach(t=>{
  ['id','seq','kind','file','title','owner','target','key'].forEach(f=>ok(t[f],'① '+t.id+' 有 '+f));
  ok(['xlsx','docx'].indexOf(t.kind)>=0,'① 檔案格式係 Excel 或 Word：'+t.id);
  ok(GROUPS.has(t.owner),'① 負責組「'+t.owner+'」係架構入面真實存在嘅組（'+t.id+'）');
  ok(Array.isArray(t.feeds)&&t.feeds.length>=2,'① '+t.id+' 寫明餵去至少 2 個位');
  ok(t.churn&&t.churn.length>20,'① '+t.id+' 寫明呢張表會點改——2026 病因係改完再改，唔准留空');
  ok(Array.isArray(t.rules)&&t.rules.length>=1,'① '+t.id+' 有填寫規矩');
  ok(Array.isArray(t.columns)&&t.columns.length>=3,'① '+t.id+' 至少 3 條欄位');
});
const ids=TEMPLATES.map(t=>t.id); ok(new Set(ids).size===ids.length,'① 範本 id 冇重複');
const files=TEMPLATES.map(t=>t.file); ok(new Set(files).size===files.length,'① 檔名冇重複');

/* ── ② 三級制 ── */
const LV=[LEVEL.BLOCK,LEVEL.BEST,LEVEL.AUTO];
ok(LEVEL.BLOCK==='必須'&&LEVEL.BEST==='盡量'&&LEVEL.AUTO==='自動','② 三級就係必須／盡量／自動');
TEMPLATES.forEach(t=>{
  t.columns.forEach(c=>{
    ok(c.k&&c.label,'② '+t.id+' 每欄有 k 同 label');
    ok(LV.indexOf(c.level)>=0,'② 級別合法：'+t.id+'.'+c.k);
    ok(['text','number','bool','date','phone','long'].indexOf(c.type)>=0,'② 型別合法：'+t.id+'.'+c.k+'='+c.type);
  });
  ok(t.columns.some(c=>c.level===LEVEL.BLOCK),'② '+t.id+' 至少一個「必須」欄位');
  const ks=t.columns.map(c=>c.k); ok(new Set(ks).size===ks.length,'② '+t.id+' 欄位 k 冇重複');
});

/* 「必須」要同 2026 真實情況對得上——唔好亂標必須，否則一開波就着紅燈 */
const recsOf=t=>{
  const raw=getAt(mock,t.target);
  if(!Array.isArray(raw)) return null;
  if(raw.length&&Array.isArray(raw[0])) return raw.map(r=>{const o={};t.columns.forEach((c,i)=>o[c.k]=r[i]);return o;});
  return raw;
};
TEMPLATES.forEach(t=>{
  const recs=recsOf(t); if(!recs||!recs.length) return;
  t.columns.filter(c=>c.level===LEVEL.BLOCK).forEach(c=>{
    const filled=recs.filter(r=>r&&r[c.k]!=null&&String(r[c.k]).trim()!=='').length;
    ok(filled===recs.length,'② 「必須」欄位 '+t.id+'.'+c.k+' 喺 2026 真係全齊（'+filled+'/'+recs.length+'）');
  });
});
/* 「盡量」要真係有啲係填唔齊嘅——否則三級制冇意思 */
const anyPartial=TEMPLATES.some(t=>{
  const recs=recsOf(t); if(!recs||!recs.length) return false;
  return t.columns.filter(c=>c.level===LEVEL.BEST).some(c=>{
    const f=recs.filter(r=>r&&r[c.k]!=null&&String(r[c.k]).trim()!=='').length;
    return f>0&&f<recs.length;
  });
});
ok(anyPartial,'② 確實有「盡量」欄位喺 2026 冇填齊——呢啲唔應該着紅燈');

/* ── ③ 鐵律一 ── */
const home={};
TEMPLATES.forEach(t=>t.columns.forEach(c=>{
  if(!c.fid) return;
  ok(!home[c.fid],'③ 鐵律一：同一件事實「'+c.fid+'」唔准喺兩份範本各有一份');
  home[c.fid]=t.id+'.'+c.k;
}));
TEMPLATES.forEach(t=>t.columns.filter(c=>c.ref).forEach(c=>{
  if(/^external:/.test(c.ref)){ ok(c.ref.length>9,'③ external ref 要寫明邊個名冊：'+t.id+'.'+c.k); return; }
  const [rt,rk]=String(c.ref).split('.');
  const tt=TEMPLATES.find(x=>x.id===rt);
  ok(tt&&tt.columns.some(x=>x.k===rk),'③ ref 指得到：'+t.id+'.'+c.k+' → '+c.ref);
}));

/* ── ④ target 行得通 ── */
TEMPLATES.forEach(t=>{
  const v=getAt(mock,t.target);
  ok(v!==undefined,'④ target 搵到資料：'+t.id+' → '+t.target);
  ok(Array.isArray(v)&&v.length>0,'④ '+t.id+' 喺 2026 有真實資料（'+(Array.isArray(v)?v.length:0)+' 行）');
});

/* ── ⑤ 合約檔同 schema 一致 ── */
const contract=JSON.parse(read('data/template_contract_2027.json'));
ok(contract.templates.length===TEMPLATES.length,'⑤ 合約檔範本數同 schema 一致');
contract.templates.forEach(ct=>{
  const t=TEMPLATES.find(x=>x.id===ct.id);
  ok(t,'⑤ 合約檔每份範本喺 schema 有對應：'+ct.id);
  ok(ct.columns.length===t.columns.length,'⑤ '+ct.id+' 欄位數一致');
  ct.columns.forEach((cc,i)=>{
    ok(cc.k===t.columns[i].k,'⑤ '+ct.id+' 第 '+(i+1)+' 欄 k 一致');
    ok(cc.level===t.columns[i].level,'⑤ '+ct.id+'.'+cc.k+' 級別一致');
    ok(/^[A-Z]+$/.test(cc.col),'⑤ '+ct.id+'.'+cc.k+' 有 Excel 欄號 '+cc.col);
  });
});
ok(contract.levels&&contract.levels['BLOCK']==='必須','⑤ 合約檔帶住三級定義');

/* ── ⑥ 範本檔真係存在 ── */
TEMPLATES.forEach(t=>{
  ['blank','mock'].forEach(v=>{
    const f=path.join(root,'templates/2027',v,t.file);
    ok(fs.existsSync(f),'⑥ '+v+'/'+t.file+' 存在');
    const sz=fs.statSync(f).size;
    ok(sz>4000,'⑥ '+v+'/'+t.file+' 唔係空檔（'+sz+' bytes）');
    ok(fs.readFileSync(f).slice(0,2).toString()==='PK','⑥ '+v+'/'+t.file+' 係真 Office 檔（zip 格式）');
  });
  const b=fs.statSync(path.join(root,'templates/2027/blank',t.file)).size;
  const m=fs.statSync(path.join(root,'templates/2027/mock',t.file)).size;
  ok(m>b,'⑥ mock 版大過空白版（真係填咗 2026 資料）：'+t.file);
});
ok(fs.existsSync(path.join(root,'docs/2027_TEMPLATE_GUIDE.md')),'⑥ 有人睇嘅指引');
const guide=read('docs/2027_TEMPLATE_GUIDE.md');
ok(/必須|盡量|自動/.test(guide),'⑥ 指引解釋咗三級');
ok(/只准喺一張範本存在/.test(guide),'⑥ 指引寫明鐵律一');
ok(/改完再改/.test(guide),'⑥ 指引寫明 2026 真正病因係改完再改，唔係唔交');

/* ── ⑦ 跨範本共用維度：2026 真係對唔上，而家查得出 ── */
const dimCols=[];
TEMPLATES.forEach(t=>t.columns.filter(c=>/^external:/.test(c.ref||'')).forEach(c=>dimCols.push({t,c,dim:c.ref})));
ok(dimCols.length>=4,'⑦ 有標共用維度（旅名／區名）');
const byDim={};
dimCols.forEach(({t,c,dim})=>{
  const recs=recsOf(t)||[];
  (byDim[dim]=byDim[dim]||{})[t.id]=new Set(recs.map(r=>String((r&&r[c.k])||'').trim()).filter(Boolean));
});
const troop=byDim['external:旅團名冊'];
ok(troop&&Object.keys(troop).length===2,'⑦ 旅名喺兩份範本出現（優異旅團／參加旅團）');
const [A,B]=Object.values(troop);
const overlap=[...A].filter(v=>B.has(v)).length;
ok(overlap===0,'⑦ 2026 實況：兩張表嘅旅名零重疊（'+A.size+' × '+B.size+' → '+overlap+'）——即係自動 join 做唔到，要人手夾');
const area=byDim['external:區名'];
const [C,D]=Object.values(area);
ok([...C].filter(v=>D.has(v)).length>0,'⑦ 區名寫法對得返（證明唔係全部維度都爛，查得出分別）');

console.log('v23 2027 範本 schema：'+n+' 項檢查全部通過');
console.log('  '+TEMPLATES.length+' 份範本 ／ '+TEMPLATES.reduce((s,t)=>s+t.columns.length,0)+' 條欄位 ／ '+
  TEMPLATES.filter(t=>t.kind==='xlsx').length+' Excel ＋ '+TEMPLATES.filter(t=>t.kind==='docx').length+' Word');
console.log('  機械查出：優異旅團表 '+A.size+' 個旅名 × 參加旅團表 '+B.size+' 個 → 夾得返 '+overlap+' 個');
