#!/usr/bin/env node
'use strict';
/**
 * v24 寬鬆對鍵 ＋ 跨組對帳 回歸測試
 *  ① 中英文數字通通都食（用戶明確要求）：六／6／九十／十六／二四三／全形
 *  ② 攤位鍵寬鬆：A01 / A1 / A-1 / Ａ０１ /「A1 Core」/「A3 機電2」都係同一個
 *  ③ 唔會夾錯：第5旅 ≠ 第5海童軍旅；唔同區唔會撈埋
 *  ④ 對 2026 真實資料有效：攤位 0 → 25 夾返；旅團 0 → 25 認得返
 *  ⑤ 跨組對帳：四個「幾多人」數字、逐個攤位夾數、標明要搵邊個組
 *  ⑥ 優異旅團 × 參加旅團【唔會夾埋】——兩件事，只係認得返
 *  ⑦ 已掛接
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0; const ok=(c,m)=>{ if(!c) throw new Error('FAIL: '+m); n++; };

const K=require(path.join(root,'js/49-key-match.js'));
const mock=JSON.parse(read('data/mock_demo.json'));

/* ── ① 中英文數字通通都食 ── */
const numCases=[['六',6],['6',6],['九十',90],['十六',16],['十',10],['二四三',243],['一三一六',1316],
  ['６',6],['１３１６',1316],['零',0],['廿',null],['abc',null],['',null]];
numCases.forEach(([s,want])=>ok(K.kmNum(s)===want,'① kmNum("'+s+'") = '+want+'（實際 '+K.kmNum(s)+'）'));

const troopPairs=[['港島第六旅','港島第6旅'],['港島第二六三旅','港島第263旅'],
  ['港島第一三一六旅','港島第1316旅'],['港島第九十旅','港島第90旅'],
  ['港島第十六旅','港島第16旅'],['港島第５旅','港島第5旅'],['港島第 7 旅','港島第七旅']];
troopPairs.forEach(([a,b])=>{
  const x=K.kmTroop(a),y=K.kmTroop(b);
  ok(x&&y&&x.key===y.key,'① 同一個旅認得返：'+a+' ＝ '+b);
});
ok(K.kmTroop('港島第六旅').canon==='港島第6旅','① canon 用阿拉伯數字（畀機器）');
ok(K.kmTroop('亂七八糟')===null,'① 唔似旅名就老實回 null，唔會亂估');

/* ── ② 攤位鍵寬鬆 ── */
[['A01','A01'],['A1','A01'],['A-1','A01'],['Ａ０１','A01'],['A1 Core','A01'],
 ['A3 機電2','A03'],['A10 Police-國安','A10'],['B07','B07'],['a7','A07'],['',null],['xx',null]]
 .forEach(([s,want])=>ok(K.kmBooth(s)===want,'② kmBooth("'+s+'") = '+want+'（實際 '+K.kmBooth(s)+'）'));

/* ── ③ 唔會夾錯 ── */
ok(K.kmTroop('港島第5海童軍旅').key!==K.kmTroop('港島第5旅').key,'③ 第5海童軍旅 ≠ 第5旅（兩個唔同旅）');
ok(K.kmTroop('港島第6旅').key!==K.kmTroop('新界第6旅').key,'③ 唔同區唔會撈埋');
ok(K.kmBooth('A01')!==K.kmBooth('B01'),'③ 唔同區攤位唔會撈埋');
ok(K.kmPhone('+852 9215 7472')==='92157472','③ 電話剝 852 同空格');
ok(K.kmPhone('1234')==='','③ 唔夠 8 位就唔當有效電話');

/* ── ④ 對 2026 真實資料有效 ── */
const booths=mock.activities.booths;
const roster=mock.staff.event_staff_roster;
const merit=mock.ceremony.meritRoster;
const part=mock.public_channel_2027.manual.participants.rows;

const rawBoothOverlap=(()=>{ const A=new Set(booths.map(b=>String(b.booth_no).trim()));
  const B=new Set(roster.map(r=>String(r.booth||'').trim()).filter(Boolean));
  return [...A].filter(v=>B.has(v)).length; })();
ok(rawBoothOverlap===0,'④ 2026 原狀：攤位編號同編更名單【零重疊】（A01 vs A1 Core）');

const rec=K.kmReconcile(booths,b=>K.kmBooth(b.booth_no), roster.filter(r=>r.booth), r=>K.kmBooth(r.booth));
ok(rec.both>=25,'④ 寬鬆對鍵之後夾得返 '+rec.both+' 個攤位（≥25）');
ok(rec.onlyB.length===0,'④ 編更名單冇一個攤位係攤位表搵唔到嘅');
ok(rec.onlyA.length>=1,'④ 有 '+rec.onlyA.length+' 個攤位冇人編更——呢啲係真缺口，唔係寫法問題');

const rawTroop=(()=>{ const A=new Set(merit.map(r=>String(r.unit).trim()));
  const B=new Set(part.map(r=>String(r[1]).trim()));
  return [...A].filter(v=>B.has(v)).length; })();
ok(rawTroop===0,'④ 2026 原狀：兩張旅團表【零重疊】（中文數字 vs 阿拉伯數字）');
const trec=K.kmReconcile(merit,r=>{const v=K.kmTroop(r.unit);return v&&v.key;},
                         part, r=>{const v=K.kmTroop(r[1]);return v&&v.key;});
ok(trec.both>=20,'④ 寬鬆對鍵之後認得返 '+trec.both+' 個旅（≥20）');

/* ── ⑤ 跨組對帳 ── */
const sb={ScoutEventApp:function(){},console,escapeHtml:s=>String(s),showToast:()=>{},window:{}};
sb.ScoutEventApp.prototype={}; vm.createContext(sb);
vm.runInContext(read('js/49-key-match.js'),sb);
vm.runInContext(read('js/50-cross-check.js'),sb);
const app=Object.create(sb.ScoutEventApp.prototype);
app.eventData=mock;

const totals=app.crossCheckTotals();
ok(totals.roster===279&&totals.stamp===290&&totals.plan===193&&totals.lunch===173,
  '⑤ 四個「幾多人」數字：編更 '+totals.roster+'／派章 '+totals.stamp+'／人手 '+totals.plan+'／午膳 '+totals.lunch);
ok(new Set([totals.roster,totals.stamp,totals.plan,totals.lunch]).size>1,
  '⑤ 2026 實況：四個數字唔一樣——呢個就係派錯章訂錯飯嘅根源');

const rows=app.crossCheckRows();
ok(rows.length===booths.length,'⑤ 逐個攤位夾數，'+rows.length+' 行');
rows.forEach(r=>{
  ok(/^[A-Z]+\d{2}$/.test(r.key),'⑤ 每行有正規化攤位鍵：'+r.key);
  ok(Array.isArray(r.flags),'⑤ 每行有 flags');
  r.flags.forEach(f=>ok(f.t&&f.who,'⑤ 每個警示寫明係咩事同埋搵邊個組：'+r.key));
});
const bad=rows.filter(r=>r.flags.some(f=>f.c!=='slate'));
ok(bad.length>=10,'⑤ 查出 '+bad.length+' 個攤位對唔上（≥10）');
const whos=new Set(); rows.forEach(r=>r.flags.forEach(f=>whos.add(f.who)));
['主題節目組 × 行政組','行政組','協調組 × 行政組'].forEach(w=>
  ok(whos.has(w),'⑤ 有標明責任方：'+w));
ok(Object.keys(app.CROSS_OWNERS).length===4,'⑤ 四份資料各有主人（格有名字）');
Object.values(app.CROSS_OWNERS).forEach(o=>ok(o.label&&o.owner&&o.where,'⑤ 每份資料有標籤／負責組／喺邊度'));

/* ── ⑥ 兩件事，唔夾埋 ── */
const tr=app.crossCheckTroops();
ok(tr.merit>0&&tr.part>0,'⑥ 兩張旅團表各自獨立計');
ok(tr.recognised>=20,'⑥ 認得返 '+tr.recognised+' 個係同一個旅');
ok(tr.spelling.length>=20,'⑥ 其中 '+tr.spelling.length+' 個兩邊寫法唔同');
ok(tr.recognised<tr.merit&&tr.recognised<tr.part,
  '⑥ 唔係全部都夾到——有人攞獎唔等如個旅有嚟，個旅有嚟唔等如會攞獎');
const html=app.crossCheckHTML();
ok(/唔會夾埋/.test(html),'⑥ 版面寫明兩張表唔會夾埋');
ok(/有人嚟攞獎唔等如個旅有嚟/.test(html),'⑥ 版面解釋咗點解唔夾埋');
const src50=read('js/50-cross-check.js');
ok(/唔會夾硬改人哋啲資料/.test(src50),'⑥ 明寫呢頁唔會改人哋嘅資料');

/* ── ⑦ 掛接 ── */
const htmlIdx=read('index.html');
ok(/js\/49-key-match\.js/.test(htmlIdx),'⑦ index.html 載入 49-key-match.js');
ok(/js\/50-cross-check\.js/.test(htmlIdx),'⑦ index.html 載入 50-cross-check.js');
const core=read('js/10-app-core.js');
ok(/group_crosscheck/.test(core),'⑦ 部門中心有「跨組對帳」頁籤');
ok(/t\.k==='group_crosscheck'\) this\.renderCrossCheck\(el\)/.test(core),'⑦ 已接上 renderCrossCheck');
ok(/Object\.assign\(ScoutEventApp\.prototype,\{/.test(src50),'⑦ 跟足 prototype 掛接寫法');
ok(/module\.exports/.test(read('js/49-key-match.js')),'⑦ 對鍵庫 node 同瀏覽器共用同一份（唔會各有各寫）');

console.log('v24 寬鬆對鍵＋跨組對帳：'+n+' 項檢查全部通過');
console.log('  攤位　原狀 0 重疊 → 寬鬆對鍵後夾返 '+rec.both+' 個（'+rec.onlyA.length+' 個攤位真係冇人編更）');
console.log('  旅團　原狀 0 重疊 → 認得返 '+tr.recognised+' 個（唔夾埋，兩件事）');
console.log('  對帳　'+rows.length+' 個攤位，'+bad.length+' 個對唔上');
