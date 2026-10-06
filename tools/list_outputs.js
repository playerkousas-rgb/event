#!/usr/bin/env node
'use strict';
/* 第 1 步嘅點算工具：數齊，唔做嘢。
     node tools/list_outputs.js            逐類列出
     node tools/list_outputs.js --gaps     只列未接同有洞嘅
     node tools/list_outputs.js --md > docs/2027_OUTPUT_INVENTORY.md
*/
const path=require('path');
const {KIND,STATUS,OUTPUTS,INVENTORY_FLAGS}=require(path.join(__dirname,'schema/outputs_2027.js'));
const MD=process.argv.includes('--md'), GAPS=process.argv.includes('--gaps');

const by=(k)=>{const m={};OUTPUTS.forEach(o=>{(m[o[k]]=m[o[k]]||[]).push(o);});return m;};
const kindN=by('kind'), statN=by('status');
const KORDER=['GEN','IN','SCR','FIX','DSGN'];
const SORDER=['unlinked','partial','linked','na'];
const n=a=>(a||[]).length;

/* 分組：用 id 開頭嘅意義分唔到，所以用人手分嘅十二組 —— 由清單出現次序推返 */
const GROUPS=[
 ['典禮台上要讀嘅',      /^o-(mc|rundown|party-entry|inspection)/],
 ['獎項名單',           /^o-(merit|section-award|leader-award|commission|ug-list)/],
 ['嘉賓',               /^o-(guest|invit)/],
 ['旅團（參加者）',      /^o-(troop|ngo-notice|enroll)/],
 ['工作人員',           /^o-(org-chart|staff|job-duties)/],
 ['攤位／節目',         /^o-(booth|borrow|game|badge|theme)/],
 ['膳食',               /^o-meal/],
 ['場地／物流',         /^o-(site|police-map|marquee|carton|supplies|lost|clean)/],
 ['車輛／泊車',         /^o-(parking|vehicle|plate)/],
 ['財務',               /^o-(budget|fin|expense|quote|settlement)/],
 ['通告／對外',         /^o-(main-circ|special|oc-|food|goods|compliance|public|brand)/],
 ['會議／內部',         /^o-(agenda|minutes|workplan|schedule|crisis|ngo-contact|wish|activity-sheet|tickets|admin-docs|coord-docs|link|cross|group-apps|pc-content|live-script-tab|participants-admin)/],
 ['點算時補返嘅',        /^o-(booths-2025ref|venue-quote)/]
];
const grouped=[]; const used=new Set();
GROUPS.forEach(([label,re])=>{
  const items=OUTPUTS.filter(o=>!used.has(o.id)&&re.test(o.id));
  items.forEach(o=>used.add(o.id));
  if(items.length) grouped.push([label,items]);
});
const rest=OUTPUTS.filter(o=>!used.has(o.id));
if(rest.length) grouped.push(['未分類',rest]);

const mark=o=>({linked:'●',partial:'◐',unlinked:'○',na:'—'}[o.status]||'?');

if(!MD){
  console.log('2027 要輸出嘅嘢 —— 第 1 步點算\n');
  console.log(`  一共 ${OUTPUTS.length} 件\n`);
  console.log('  按「2027 要落幾多功夫」分：');
  KORDER.forEach(k=>console.log(`    ${k.padEnd(5)} ${String(n(kindN[k])).padStart(3)} 件　${KIND[k].label}　${KIND[k].note}`));
  console.log('\n  按「接咗未」分：');
  SORDER.forEach(s=>console.log(`    ${STATUS[s].label.padEnd(5)} ${String(n(statN[s])).padStart(3)} 件　${STATUS[s].note}`));
  const gen=kindN.GEN||[];
  const genU=gen.filter(o=>o.status==='unlinked').length, genP=gen.filter(o=>o.status==='partial').length;
  console.log(`\n  要緊嗰批：GEN ${gen.length} 件入面，未接 ${genU}、接一半 ${genP}、已接 ${gen.length-genU-genP}`);
  console.log('\n' + '─'.repeat(70));
  grouped.forEach(([label,items])=>{
    console.log(`\n■ ${label}（${items.length}）`);
    items.forEach(o=>{
      if(GAPS && o.status!=='unlinked' && !(o.gaps&&o.gaps.length)) return;
      console.log(`  ${mark(o)} [${o.kind.padEnd(4)}] ${o.title}`);
      if(o.who) console.log(`        出：${o.who}`);
      (o.gaps||[]).forEach(g=>console.log(`        ⚠ ${g}`));
      if(o.note) console.log(`        · ${o.note}`);
    });
  });
  console.log('\n' + '─'.repeat(70));
  console.log('\n■ 清單本身揭到嘅問題\n');
  INVENTORY_FLAGS.forEach(f=>{
    console.log(`  ✖ ${f.what}`);
    console.log(`      ${f.detail}`);
    console.log(`      → ${f.why}\n`);
  });
  console.log('● 已接　◐ 接一半　○ 未接　— 唔使接');
  process.exit(0);
}

/* Markdown */
const L=[];
L.push('# 2027 要輸出嘅嘢 — 第 1 步點算\n');
L.push('> 由 `tools/list_outputs.js` 自動產生，請勿手改。改 `tools/schema/outputs_2027.js`。\n');
L.push('第 1 步淨係**數齊**。資料源同點樣生成係第 2 步，呢度一律留白。\n');
L.push('全部有實物根據：`documents` 79 份 ＋ `activity_day_sources` 18 個當日檔 ＋ 系統現有 29 個面，逐件對、去重、分類。\n');
L.push(`## 一共 ${OUTPUTS.length} 件\n`);
L.push('### 按「2027 要落幾多功夫」分\n');
L.push('| 類 | 件數 | 意思 | 點解咁分 |');
L.push('|---|---:|---|---|');
KORDER.forEach(k=>L.push(`| \`${k}\` | ${n(kindN[k])} | ${KIND[k].label} | ${KIND[k].note} |`));
L.push('');
L.push('### 按「接咗未」分\n');
L.push('| | 件數 | |');
L.push('|---|---:|---|');
SORDER.forEach(s=>L.push(`| ${STATUS[s].label} | ${n(statN[s])} | ${STATUS[s].note} |`));
L.push('');
const gen=kindN.GEN||[];
const gu=gen.filter(o=>o.status==='unlinked').length, gp=gen.filter(o=>o.status==='partial').length;
L.push(`**要緊嗰批**：\`GEN\`（由資料生成）${gen.length} 件 —— 未接 **${gu}**、接一半 **${gp}**、已接 **${gen.length-gu-gp}**。`);
L.push('其餘 `FIX`／`DSGN` 換年份或者交畀設計師就得，唔使起自動化。\n');
L.push('---\n');
grouped.forEach(([label,items])=>{
  L.push(`## ${label}（${items.length}）\n`);
  L.push('| | 名 | 類 | 出口 | 邊組出 | 2026 根據 |');
  L.push('|---|---|---|---|---|---|');
  items.forEach(o=>{
    const evs=(o.ev||[]).map(e=>'`'+e+'`').join('<br>');
    L.push(`| ${mark(o)} | **${o.title}** | ${o.kind} | ${o.medium} | ${o.who||'—'} | ${evs} |`);
  });
  L.push('');
  const withGaps=items.filter(o=>(o.gaps&&o.gaps.length)||o.note);
  if(withGaps.length){
    withGaps.forEach(o=>{
      L.push(`**${o.title}**`);
      (o.gaps||[]).forEach(g=>L.push(`- ⚠ ${g}`));
      if(o.note) L.push(`- ${o.note}`);
      L.push('');
    });
  }
});
L.push('---\n');
L.push('## 清單本身揭到嘅問題\n');
L.push('呢幾樣唔屬於任何一件輸出，係 2026 份清單自己嘅毛病：\n');
INVENTORY_FLAGS.forEach(f=>{
  L.push(`### ✖ ${f.what}\n`);
  L.push(`${f.detail}\n`);
  L.push(`→ ${f.why}\n`);
});
L.push('---\n');
L.push('● 已接　◐ 接一半　○ 未接　— 唔使接\n');
console.log(L.join('\n'));
