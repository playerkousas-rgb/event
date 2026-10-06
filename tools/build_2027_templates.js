#!/usr/bin/env node
'use strict';
/**
 * 由 tools/schema/templates_2027.js 生成四樣嘢。schema 一改，四樣一齊跟。
 *
 *   templates/2027/blank/*.xlsx|docx   空白範本 —— 下屆開工第一日攞到手
 *   templates/2027/mock/*.xlsx|docx    MOCK 範本 —— 2026 最終版填滿，示範「填好係咁樣」
 *   docs/2027_TEMPLATE_GUIDE.md        人睇嘅說明
 *   data/template_contract_2027.json   程式讀嘅合約（APP 用同一份，唔會各有各讀）
 *
 *   node tools/build_2027_templates.js            # 全部生成
 *   node tools/build_2027_templates.js --check    # 只驗 schema，唔寫檔
 *
 * 需要 exceljs 同 docx：npm i exceljs docx
 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const {LEVEL,TEMPLATES}=require('./schema/templates_2027.js');
const FF=require('../js/51-field-format.js');

const CHECK=process.argv.indexOf('--check')>=0;
const colLetter=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=(i-m-1)/26;}return s;};
const getAt=(o,p)=>String(p).replace(/\[(\d+)\]/g,'.$1').split('.').reduce((x,k)=>(x==null?undefined:x[k]),o);

/* ══════════════ ① 驗 schema（鐵律一：一格只准喺一個範本出現）══════════════ */
const problems=[];
const seenId=new Set(), seenFile=new Set();
const fieldHome={};                       // 欄位 k -> 邊份範本話事
TEMPLATES.forEach(t=>{
  if(seenId.has(t.id)) problems.push(`範本 id 重複：${t.id}`); seenId.add(t.id);
  if(seenFile.has(t.file)) problems.push(`檔名重複：${t.file}`); seenFile.add(t.file);
  ['id','file','title','owner','target','kind'].forEach(f=>{ if(!t[f]) problems.push(`${t.id} 缺 ${f}`); });
  if(!Array.isArray(t.feeds)||!t.feeds.length) problems.push(`${t.id} 冇寫餵去邊（feeds）`);
  if(!t.churn) problems.push(`${t.id} 冇寫會點樣改（churn）——呢個係 2026 嘅病因，唔准留空`);
  const ks=new Set();
  (t.columns||[]).forEach(c=>{
    if(!c.k||!c.label) problems.push(`${t.id} 有欄位冇 k 或 label`);
    if(ks.has(c.k)) problems.push(`${t.id} 欄位重複：${c.k}`); ks.add(c.k);
    if([LEVEL.BLOCK,LEVEL.BEST,LEVEL.AUTO].indexOf(c.level)<0) problems.push(`${t.id}.${c.k} 級別唔啱：${c.level}`);
    if(c.format&&!FF.FIELD_FORMATS[c.format]) problems.push(`${t.id}.${c.k} 用咗未定義嘅格式：${c.format}`);
    if(c.format&&c.eg!==''&&c.eg!=null){
      const r=FF.ffCheck(c.format,c.eg);
      if(r.state==='reject') problems.push(`${t.id}.${c.k} 嘅例子「${c.eg}」自己都唔合格：${r.why}`);
    }
    // 鐵律一只針對【同一件事實】。欄名撞名唔算——「嘉賓姓名」同「職員姓名」係兩回事。
    // 要判定係同一件事實，schema 要明寫 fid（語意身分）。
    const home=t.id+'.'+c.k;
    if(c.fid){
      if(fieldHome[c.fid]&&fieldHome[c.fid]!==home)
        problems.push(`⚠ 鐵律一：同一件事實「${c.fid}」喺兩份範本各有一份（${fieldHome[c.fid]} 同 ${home}）——一定會走樣`);
      if(!fieldHome[c.fid]) fieldHome[c.fid]=home;
    }
    if(c.ref&&!/^external:/.test(c.ref)){
      const [rt,rk]=String(c.ref).split('.');
      const tt=TEMPLATES.find(x=>x.id===rt);
      if(!tt||!(tt.columns||[]).some(x=>x.k===rk)) problems.push(`${t.id}.${c.k} 嘅 ref 指唔到：${c.ref}`);
    }
  });
  if(!(t.columns||[]).some(c=>c.level===LEVEL.BLOCK)) problems.push(`${t.id} 一個「必須」欄位都冇`);
});

/* 對返真實資料：target 行唔行得通、每欄實際填咗幾多 */
let mock=null;
try{ mock=JSON.parse(fs.readFileSync(path.join(root,'data/mock_demo.json'),'utf8')); }catch(e){}
const coverage={};
if(mock) TEMPLATES.forEach(t=>{
  const rows=getAt(mock,t.target);
  if(rows===undefined){ problems.push(`${t.id} 嘅 target 喺 mock_demo.json 搵唔到：${t.target}`); return; }
  const arr=Array.isArray(rows)?rows:[];
  coverage[t.id]={rows:arr.length,cols:{}};
  if(!arr.length) return;
  // 陣列式（participants.rows）按欄序對返落 columns
  const recs=Array.isArray(arr[0])
    ? arr.map(r=>{const o={};t.columns.forEach((c,i)=>o[c.k]=r[i]);return o;}) : arr;
  (t.columns||[]).forEach(c=>{
    const filled=recs.filter(r=>r&&r[c.k]!==undefined&&r[c.k]!==null&&String(r[c.k]).trim()!=='').length;
    coverage[t.id].cols[c.k]=filled;
    if(c.level===LEVEL.BLOCK&&recs.length&&filled<recs.length)
      problems.push(`✖ ${t.id}.${c.k} 標咗【必須】但 2026 實際只填咗 ${filled}/${recs.length} ——級別定錯咗`);
  });
});

/* 真正會出事嗰種：同一個名喺兩張表寫法唔同（港島第六旅 vs 港島6旅）。
   唔當錯，只係報出嚟——因為 2026 就係死喺呢度。 */
const drift=[];
if(mock){
  const dims={};
  TEMPLATES.forEach(t=>{
    const rows=getAt(mock,t.target); if(!Array.isArray(rows)) return;
    const arr=rows.length&&Array.isArray(rows[0])
      ? rows.map(r=>{const o={};t.columns.forEach((c,i)=>o[c.k]=r[i]);return o;}) : rows;
    (t.columns||[]).forEach(c=>{
      if(!c.ref||!/^external:/.test(c.ref)) return;
      const dim=c.ref.replace('external:','');
      const set=(dims[dim]=dims[dim]||{});
      set[t.id]=new Set(arr.map(r=>String((r&&r[c.k])||'').trim()).filter(Boolean));
    });
  });
  Object.keys(dims).forEach(dim=>{
    const ids=Object.keys(dims[dim]); if(ids.length<2) return;
    for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){
      const A=dims[dim][ids[i]],B=dims[dim][ids[j]];
      const both=[...A].filter(v=>B.has(v)).length;
      drift.push({dim,a:ids[i],b:ids[j],an:A.size,bn:B.size,both});
    }
  });
}

if(problems.length){
  console.error('Schema 有問題：');
  problems.forEach(p=>console.error('  '+p));
  process.exit(1);
}
console.log(`✓ schema 驗過：${TEMPLATES.length} 份範本，${TEMPLATES.reduce((s,t)=>s+t.columns.length,0)} 條欄位，零衝突`);
if(drift.length){
  console.log('\n跨範本共用維度（寫法要一致，唔一致就係下次對唔上嗰格）：');
  drift.forEach(d=>console.log(`  ${d.dim}：${d.a}(${d.an}) × ${d.b}(${d.bn}) → 寫法夾得返 ${d.both} 個`));
}
if(CHECK){
  Object.keys(coverage).forEach(id=>{
    const c=coverage[id];
    const t=TEMPLATES.find(x=>x.id===id);
    const best=t.columns.filter(x=>x.level===LEVEL.BEST);
    const avg=best.length&&c.rows?Math.round(best.reduce((s,x)=>s+(c.cols[x.k]||0),0)/best.length/c.rows*100):0;
    console.log(`  ${id.padEnd(16)} ${String(c.rows).padStart(4)} 行　必須欄全齊　盡量欄平均填 ${avg}%`);
  });
  process.exit(0);
}

/* ══════════════ ② 生成 ══════════════ */
let ExcelJS,docx;
try{ ExcelJS=require('exceljs'); docx=require('docx'); }
catch(e){ console.error('缺 exceljs / docx：npm i exceljs docx'); process.exit(1); }

const BLANK=path.join(root,'templates/2027/blank');
const MOCK =path.join(root,'templates/2027/mock');
[BLANK,MOCK].forEach(p=>fs.mkdirSync(p,{recursive:true}));

const LEVEL_FILL={[LEVEL.BLOCK]:'FFFECACA',[LEVEL.BEST]:'FFFEF3C7',[LEVEL.AUTO]:'FFE5E7EB'};
const LEVEL_NOTE={[LEVEL.BLOCK]:'必須 — 冇就唔成立',[LEVEL.BEST]:'盡量 — 填得幾多得幾多',[LEVEL.AUTO]:'自動 — 程式計，唔好填'};

function rowsFor(t){
  if(!mock) return [];
  const raw=getAt(mock,t.target);
  if(!Array.isArray(raw)) return [];
  if(raw.length&&Array.isArray(raw[0]))                        // participants.rows 係陣列式
    return raw.map(r=>{ const o={}; t.columns.forEach((c,i)=>o[c.k]=r[i]); return o; });
  return raw;
}

async function buildXlsx(t,filled){
  const wb=new ExcelJS.Workbook();
  wb.creator='ISD 2027 範本產生器'; wb.created=new Date();

  /* Sheet 1：填寫區 */
  const ws=wb.addWorksheet(t.sheet||'資料',{views:[{state:'frozen',ySplit:2}]});
  ws.addRow(t.columns.map(c=>c.label));
  ws.addRow(t.columns.map(c=>c.level));
  ws.getRow(1).font={bold:true,size:11};
  ws.getRow(1).height=22;
  ws.getRow(2).font={size:9,color:{argb:'FF6B7280'}};
  t.columns.forEach((c,i)=>{
    const col=ws.getColumn(i+1);
    col.width=Math.min(44,Math.max(10,String(c.label).length*2.4+6));
    [1,2].forEach(r=>{ ws.getCell(r,i+1).fill={type:'pattern',pattern:'solid',fgColor:{argb:LEVEL_FILL[c.level]}};
      ws.getCell(r,i+1).alignment={vertical:'middle',horizontal:'center',wrapText:true}; });
    const fp=c.format?FF.ffPrompt(c.format):null;
    ws.getCell(1,i+1).note=`${LEVEL_NOTE[c.level]}\n型別：${c.type}\n例：${c.eg===''?'(可留空)':c.eg}${c.note?'\n'+c.note:''}${fp?'\n\n'+fp.text:''}`;
    if(fp){
      // 撳落格就彈出規矩 —— 人填嗰陣就睇到，唔使翻文件
      for(let r=3;r<=500;r++) ws.getCell(r,i+1).dataValidation={
        type:'any',allowBlank:true,showInputMessage:true,promptTitle:fp.title,prompt:fp.text};
    }
  });
  if(filled) rowsFor(t).forEach(r=>ws.addRow(t.columns.map(c=>{
    const v=r[c.k];
    if(c.type==='bool') return v===true?'Y':(v===false||v===''||v==null?'':String(v));
    if(c.type==='long') return String(v==null?'':v).slice(0,3000);
    return v==null?'':v;
  })));
  ws.autoFilter={from:{row:1,column:1},to:{row:1,column:t.columns.length}};

  /* Sheet 2：點樣填 */
  const gs=wb.addWorksheet('點樣填');
  const put=(a,b,opt)=>{ const r=gs.addRow([a,b]); if(opt&&opt.bold) r.font={bold:true}; r.getCell(2).alignment={wrapText:true,vertical:'top'}; return r; };
  gs.getColumn(1).width=16; gs.getColumn(2).width=92;
  put('範本',t.title,{bold:true});
  put('負責組',t.owner);
  put('餵去邊',t.feeds.join('　·　'));
  put('呢張表會點改',t.churn);
  gs.addRow([]);
  put('規矩','',{bold:true});
  (t.rules||[]).forEach((r,i)=>put('　'+(i+1)+'.',r));
  gs.addRow([]);
  const hdr=gs.addRow(['欄','欄名','級別','格式','例子','說明']);
  hdr.font={bold:true};
  gs.getColumn(2).width=18; gs.getColumn(3).width=8; gs.getColumn(4).width=8; gs.getColumn(5).width=28; gs.getColumn(6).width=52;
  t.columns.forEach((c,i)=>{
    const F=c.format?FF.FIELD_FORMATS[c.format]:null;
    const r=gs.addRow([colLetter(i),c.label,c.level,F?F.canon:c.type,
      String(c.eg===''?'(可留空)':c.eg).slice(0,40),
      (F?F.rule+'　✓'+F.good.join('／')+'　✗'+F.bad.join('／')+(c.note?'　'+c.note:''):(c.note||''))]);
    r.getCell(3).fill={type:'pattern',pattern:'solid',fgColor:{argb:LEVEL_FILL[c.level]}};
    r.getCell(6).alignment={wrapText:true};
  });
  gs.addRow([]);
  put('三級意思','必須＝冇就成件事唔成立，會着紅燈　／　盡量＝填得幾多得幾多，唔會催你　／　自動＝程式計，唔好填');
  put('最緊要一句','呢啲資料只准喺呢張表存在。唔好抄去第二度再改——一抄就會走樣，走樣就係下次對唔上嗰格。');

  const out=path.join(filled?MOCK:BLANK,t.file);
  await wb.xlsx.writeFile(out);
  return out;
}

async function buildDocx(t,filled){
  const {Document,Packer,Paragraph,TextRun,HeadingLevel,Table,TableRow,TableCell,WidthType}=docx;
  const rows=filled?rowsFor(t):[{}];
  const kids=[];
  kids.push(new Paragraph({text:t.title+(filled?'（MOCK — 2026 最終版內容）':'（空白範本）'),heading:HeadingLevel.HEADING_1}));
  kids.push(new Paragraph({children:[new TextRun({text:`負責組：${t.owner}　｜　餵去：${t.feeds.join('、')}`,size:18,color:'6B7280'})]}));
  kids.push(new Paragraph({children:[new TextRun({text:t.churn,size:18,color:'B45309'})]}));
  kids.push(new Paragraph({text:''}));
  kids.push(new Paragraph({text:'規矩',heading:HeadingLevel.HEADING_2}));
  (t.rules||[]).forEach(r=>kids.push(new Paragraph({text:r,bullet:{level:0}})));

  rows.forEach((r,idx)=>{
    kids.push(new Paragraph({text:''}));
    kids.push(new Paragraph({text:filled?`${r.part||''}　${r.title||''}`:'（一份一個部分，照抄呢個格式）',heading:HeadingLevel.HEADING_2}));
    const head=t.columns.filter(c=>c.type!=='long');
    const trs=head.map(c=>{
      const left=new TableCell({width:{size:22,type:WidthType.PERCENTAGE},
        children:[new Paragraph({children:[new TextRun({text:String(c.label),bold:true,size:20})]})]});
      const txt=filled?String(r[c.k]==null?'':r[c.k]):('〔'+c.level+'〕'+String(c.note||c.eg||''));
      const right=new TableCell({
        children:[new Paragraph({children:[new TextRun({text:txt,size:20})]})]});
      return new TableRow({children:[left,right]});
    });
    kids.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:trs}));
    kids.push(new Paragraph({text:''}));
    kids.push(new Paragraph({text:'正文',heading:HeadingLevel.HEADING_3}));
    const body=filled?String(r.content||''):'〔必須〕由呢度開始打正文。直接打字，唔好貼圖——APP 要搵字同放大畀台上睇手機。';
    body.split(/\n/).forEach(line=>kids.push(new Paragraph({children:[new TextRun({text:line,size:20})]})));
    if(idx<rows.length-1) kids.push(new Paragraph({text:'',pageBreakBefore:false}));
  });

  const doc=new Document({sections:[{children:kids}]});
  const out=path.join(filled?MOCK:BLANK,t.file);
  fs.writeFileSync(out,await Packer.toBuffer(doc));
  return out;
}

(async()=>{
  const made=[];
  for(const t of TEMPLATES){
    for(const filled of [false,true]){
      const f=t.kind==='docx'?await buildDocx(t,filled):await buildXlsx(t,filled);
      made.push(path.relative(root,f));
    }
  }

  /* ③ 程式讀嘅合約 */
  const contract={
    generated_at:new Date().toISOString().slice(0,10),
    generated_by:'tools/build_2027_templates.js',
    note:'由 tools/schema/templates_2027.js 產生。APP 同範本讀同一份，唔會各有各讀。唔好手改。',
    levels:LEVEL,
    templates:TEMPLATES.map(t=>({id:t.id,file:t.file,kind:t.kind,title:t.title,owner:t.owner,
      target:t.target,key:t.key,feeds:t.feeds,churn:t.churn,rules:t.rules,
      columns:t.columns.map((c,i)=>({col:colLetter(i),k:c.k,label:c.label,type:c.type,level:c.level,
        format:c.format||'',canon:c.format?FF.FIELD_FORMATS[c.format].canon:'',
        rule:c.format?FF.FIELD_FORMATS[c.format].rule:'',note:c.note||''}))}))
  };
  fs.writeFileSync(path.join(root,'data/template_contract_2027.json'),JSON.stringify(contract,null,2)+'\n');

  /* ④ 人睇嘅說明 */
  const L=[];
  L.push('# 2027 範本指引 — 下屆籌委由呢度開始\n');
  L.push('> 本檔由 `tools/schema/templates_2027.js` 自動產生，**請勿手改**。');
  L.push('> 重新產生：`node tools/build_2027_templates.js`\n');
  L.push('## 你要做嘅事\n');
  L.push('1. 由 `templates/2027/blank/` 攞範本，放入自己組嘅 Google Drive 資料夾。');
  L.push('2. 唔肯定點填就開 `templates/2027/mock/` 同一個檔——嗰啲係 2026 最終版真實內容，照住個樣填。');
  L.push('3. 填完唔使交，唔使改名，唔使通知人。APP 會自己讀。\n');
  L.push('## 三個級別\n');
  L.push('| 級別 | 意思 | 會唔會催你 |');
  L.push('|---|---|---|');
  L.push('| **必須** | 冇就成件事唔成立（攤位編號、嘉賓姓名） | 會着紅燈 |');
  L.push('| **盡量** | 填得幾多得幾多（聯絡人、人數） | 唔會。請警察擺攤位，佢唔會乖乖畀你四個人名 |');
  L.push('| **自動** | 程式計（序號、已報到） | 唔好填 |\n');
  L.push('## 一條最緊要嘅規矩\n');
  L.push('**一格資料只准喺一張範本存在。** 唔好抄去第二度再改。');
  L.push('2026 嘅問題唔係有人唔交，係**改完再改再改**——只要同一格喺兩個地方有，就一定有一邊係舊嘅。\n');
  L.push('所以我哋唔問「交齊未」，只問「呢格幾時更新過」。\n');
  L.push('---\n');
  L.push(`## ${TEMPLATES.length} 份範本\n`);
  L.push('| # | 範本 | 負責組 | 欄位 | 餵去邊 |');
  L.push('|---|---|---|---|---|');
  TEMPLATES.forEach(t=>L.push(`| ${t.seq} | [\`${t.file}\`](../templates/2027/blank/${encodeURIComponent(t.file)}) | ${t.owner} | ${t.columns.length} | ${t.feeds.join('、')} |`));
  L.push('');
  TEMPLATES.forEach(t=>{
    L.push(`### ${t.seq}　${t.title}　\`${t.file}\`\n`);
    L.push(`**負責組**：${t.owner}　**唯一鍵**：\`${t.key}\`\n`);
    L.push(`> ${t.churn}\n`);
    L.push('**規矩**\n');
    (t.rules||[]).forEach(r=>L.push('- '+r));
    L.push('');
    L.push('| 欄 | 欄名 | 級別 | 只准咁填 | ✗ 唔好咁填 | 說明 |');
    L.push('|---|---|---|---|---|---|');
    t.columns.forEach((c,i)=>{
      const F=c.format?FF.FIELD_FORMATS[c.format]:null;
      L.push(`| ${colLetter(i)} | ${c.label} | ${c.level} | ${F?'`'+F.canon+'`':c.type} | ${F?F.bad.join('、'):''} | ${c.note||''} |`);
    });
    const cv=coverage[t.id];
    if(cv) L.push(`\n*2026 實際：${cv.rows} 行*\n`);
  });
  fs.writeFileSync(path.join(root,'docs/2027_TEMPLATE_GUIDE.md'),L.join('\n'));

  console.log(`✓ 範本 ${made.length} 個：`);
  made.forEach(f=>console.log('   '+f));
  console.log('✓ data/template_contract_2027.json');
  console.log('✓ docs/2027_TEMPLATE_GUIDE.md');
})();
