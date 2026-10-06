#!/usr/bin/env node
'use strict';
/**
 * 攞 2026 真實資料，照 2027 嘅入口格式規矩驗一次。
 *
 * 目的唔係話 2026 做得差 —— 2026 源頭係 Google Form，人想點填就點填，冇規矩可言。
 * 目的係答一條題：【如果 2027 入口就守門，會擋到幾多嘢？】
 *
 *   ✓ ok      本身就合格
 *   ⟳ fixed   認得出，入口會自動改成標準寫法（唔使人手跟）
 *   ✗ reject  入口會即場彈返，要填嘅人當場改（唔會流落下游）
 *
 *   node tools/audit_2026_against_2027_rules.js
 *   node tools/audit_2026_against_2027_rules.js --md > docs/2026_FORMAT_AUDIT.md
 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const FF=require(path.join(root,'js/51-field-format.js'));
const {TEMPLATES}=require(path.join(root,'tools/schema/templates_2027.js'));
const mock=JSON.parse(fs.readFileSync(path.join(root,'data/mock_demo.json'),'utf8'));
const getAt=(o,p)=>String(p).replace(/\[(\d+)\]/g,'.$1').split('.').reduce((x,k)=>(x==null?undefined:x[k]),o);
const MD=process.argv.indexOf('--md')>=0;

const results=[];
TEMPLATES.forEach(t=>{
  const specs=t.columns.filter(c=>c.format).map(c=>({k:c.k,label:c.label,format:c.format}));
  if(!specs.length) return;
  const raw=getAt(mock,t.target);
  if(!Array.isArray(raw)||!raw.length) return;
  const rows=Array.isArray(raw[0])
    ? raw.map(r=>{const o={};t.columns.forEach((c,i)=>o[c.k]=r[i]);return o;}) : raw;
  const a=FF.ffAudit(rows,specs);
  results.push({t,rows:rows.length,a});
});

const tot=results.reduce((s,r)=>({ok:s.ok+r.a.ok,fixed:s.fixed+r.a.fixed,reject:s.reject+r.a.reject,total:s.total+r.a.total}),
  {ok:0,fixed:0,reject:0,total:0});
const pct=n=>tot.total?Math.round(n/tot.total*100):0;

if(!MD){
  console.log('2026 真實資料 × 2027 入口規矩\n');
  console.log(`  驗咗 ${tot.total} 格`);
  console.log(`  ✓ 本身合格　　　${String(tot.ok).padStart(5)}　${pct(tot.ok)}%`);
  console.log(`  ⟳ 入口自動改正　${String(tot.fixed).padStart(5)}　${pct(tot.fixed)}%`);
  console.log(`  ✗ 入口當場彈返　${String(tot.reject).padStart(5)}　${pct(tot.reject)}%`);
  console.log('');
  results.forEach(({t,rows,a})=>{
    console.log(`── ${t.title}（${rows} 行）`);
    Object.entries(a.byField).forEach(([k,b])=>{
      const bar=(b.ok?'✓'+b.ok:'')+(b.fixed?'　⟳'+b.fixed:'')+(b.reject?'　✗'+b.reject:'');
      console.log(`   ${b.label.padEnd(14)} ${String(b.format).padEnd(8)} ${bar}`);
    });
    const bad=a.samples.filter(s=>s.state==='reject');
    if(bad.length){
      console.log('   會被彈返嘅例子：');
      bad.slice(0,4).forEach(s=>console.log(`     第${s.row}行 ${s.label}：「${String(s.was).slice(0,28)}」—— ${s.why}`));
    }
    const fx=a.samples.filter(s=>s.state==='fixed');
    if(fx.length) console.log(`   自動改正例子：「${String(fx[0].was).slice(0,24)}」→「${String(fx[0].value).slice(0,24)}」`);
    console.log('');
  });
  process.exit(0);
}

/* Markdown */
const L=[];
L.push('# 2026 資料 × 2027 入口規矩 — 擋得到幾多？\n');
L.push('> 由 `tools/audit_2026_against_2027_rules.js` 自動產生，請勿手改。\n');
L.push('2026 源頭係 Google Form，人想點填就點填，所以唔存在「填錯」——冇規矩就冇對錯。');
L.push('2027 直接寫後端，入口就可以守門。呢份報告答一條題：**如果當時有守門，會擋到幾多？**\n');
L.push('| | 格數 | 佔比 |');
L.push('|---|---:|---:|');
L.push(`| ✓ 本身就合格 | ${tot.ok} | ${pct(tot.ok)}% |`);
L.push(`| ⟳ 入口自動改正（唔使人手跟） | ${tot.fixed} | ${pct(tot.fixed)}% |`);
L.push(`| ✗ 入口當場彈返（唔會流落下游） | ${tot.reject} | ${pct(tot.reject)}% |`);
L.push(`| **合計** | **${tot.total}** | |\n`);
L.push('---\n');
results.forEach(({t,rows,a})=>{
  L.push(`## ${t.title}　\`${t.file}\`　（${rows} 行）\n`);
  L.push('| 欄位 | 格式 | ✓ 合格 | ⟳ 自動改正 | ✗ 彈返 |');
  L.push('|---|---|---:|---:|---:|');
  Object.values(a.byField).forEach(b=>L.push(`| ${b.label} | \`${b.format}\` | ${b.ok} | ${b.fixed} | ${b.reject} |`));
  L.push('');
  const fx=a.samples.filter(s=>s.state==='fixed');
  if(fx.length){
    L.push('**自動改正（入口幫你搞掂，唔使人跟）**\n');
    L.push('| 原本填 | 變成 | 點解 |');
    L.push('|---|---|---|');
    const seen=new Set();
    fx.forEach(s=>{ const k=s.field+'|'+s.why; if(seen.has(k)||seen.size>=6) return; seen.add(k);
      L.push(`| \`${String(s.was).slice(0,30)}\` | \`${String(s.value).slice(0,30)}\` | ${s.why} |`); });
    L.push('');
  }
  const bad=a.samples.filter(s=>s.state==='reject');
  if(bad.length){
    L.push('**當場彈返（填嘅人即刻改，唔會流落下游）**\n');
    L.push('| 行 | 欄位 | 原本填 | 點解唔收 | 應該點填 |');
    L.push('|---:|---|---|---|---|');
    bad.slice(0,12).forEach(s=>L.push(`| ${s.row} | ${s.label} | \`${String(s.was).slice(0,24)}\` | ${s.why} | ${s.how} |`));
    if(bad.length>12) L.push(`| … | | 另外 ${bad.length-12} 格 | | |`);
    L.push('');
  }
});
console.log(L.join('\n'));
