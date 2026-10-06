/* v25 入口守門測試
   ──────────────────────────────────────────────────────────────────────────
   用戶原話：「我們是直接寫進後端，我們可以規限他填寫時的格式，
               例如旅團 只準填港島第1旅 不能填港島第一旅 或填1 這種的」

   呢份測試要鎖死三樣嘢：
     ① 標準寫法照收，唔好亂改
     ② 認得出意思嘅錯寫法 → 自動改正，而且改出嚟一定係標準寫法
     ③ 有歧義／唔夠資料 → 唔收，而且一定要講到「應該點填」
   ────────────────────────────────────────────────────────────────────────── */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const FF=require(path.join(ROOT,'js/51-field-format.js'));
const KM=require(path.join(ROOT,'js/49-key-match.js'));
const {TEMPLATES}=require(path.join(ROOT,'tools/schema/templates_2027.js'));

let pass=0, fail=0; const bad=[];
function ok(cond,msg){ if(cond){pass++;} else {fail++; bad.push(msg);} }
function eq(a,b,msg){ ok(a===b, `${msg}　得到「${a}」，預期「${b}」`); }

/* ── ① 標準寫法照收 ───────────────────────────────────────────────── */
[['troop','港島第1旅'],['troop','港島第263旅'],['troop','港島第5海童軍旅'],
 ['booth','A01'],['booth','E12'],
 ['phone','92157472'],['phone','28357712'],
 ['person','陳大文'],['person','區永樑先生'],
 ['date','2027-10-03'],
 ['plate','AM1334'],['plate','XY1'],
 ['yesno','Y'],['yesno',''],
 ['count','7'],['count',0]].forEach(([f,v])=>{
  const r=FF.ffCheck(f,v);
  eq(r.state,'ok',`[①] ${f} 標準寫法「${v}」應該照收`);
});

/* 照收 = 一個字都唔准改 */
eq(FF.ffCheck('troop','港島第1旅').value,'港島第1旅','[①] 照收唔准改值');
eq(FF.ffCheck('booth','A01').value,'A01','[①] 照收唔准改值');

/* ── ② 認得出就自動改成標準寫法 ───────────────────────────────────── */
const FIXES=[
  ['troop','港島第一旅','港島第1旅'],
  ['troop','港島第六旅','港島第6旅'],
  ['troop','港島第二六三旅','港島第263旅'],
  ['troop','港島第二三O旅','港島第230旅'],        // 有人打字用英文 O 當〇
  ['troop','港島第一三六Ｏ旅','港島第1360旅'],
  ['troop','港島第 263 旅','港島第263旅'],         // 中間有空格
  ['booth','A1','A01'],
  ['booth','A-1','A01'],
  ['booth','Ａ０１','A01'],
  ['booth','A 01','A01'],
  ['booth','A1 Core','A01'],                       // 攤位名撈埋入編號欄
  ['phone','9215 7472','92157472'],
  ['phone','+852 9215 7472','92157472'],
  ['phone','9215-7472','92157472'],
  ['date','2027年10月3日','2027-10-03'],
  ['date','2027/10/03','2027-10-03'],
  ['count','七',7],
  ['count','約7人',7],
  ['count','7.0',7],
  ['yesno','是','Y'],
  ['yesno','true','Y'],
  ['yesno','✓','Y'],
];
FIXES.forEach(([f,inp,want])=>{
  const r=FF.ffCheck(f,inp);
  eq(r.state,'fixed',`[②] ${f}「${inp}」應該自動改正`);
  eq(r.value,want,`[②] ${f}「${inp}」改正結果`);
  ok(r.why&&r.why.length>0,`[②] ${f}「${inp}」要講返改咗乜`);
});

/* 淨係頭尾空格唔算改正（唔好嘈住人） */
eq(FF.ffCheck('troop','港島第5海童軍旅 ').state,'ok','[②] 淨係尾隨空格唔算填錯');
eq(FF.ffCheck('troop','港島第5海童軍旅 ').value,'港島第5海童軍旅','[②] 尾隨空格會靜靜雞剪走');

/* 改正結果本身一定要合格 —— 唔准改完仲係唔合格 */
FIXES.forEach(([f,inp,want])=>{
  const again=FF.ffCheck(f,want);
  eq(again.state,'ok',`[②] ${f}「${inp}」改正成「${want}」之後應該係合格寫法`);
});

/* ── ③ 有歧義／唔夠資料 → 唔收，而且要講到應該點填 ─────────────────── */
const REJECTS=[
  ['troop','1','淨係一個數字唔知邊區'],
  ['troop','第1旅','冇區名'],
  ['troop','港島1','冇「第」同「旅」'],
  ['troop','港島地域（鄧靄兒）','根本唔係旅名'],
  ['booth','1','冇區字母'],
  ['booth','主節目組總部','填咗攤位名唔係編號'],
  ['phone','1234','唔夠位'],
  ['phone','92157472/98765432','一格兩個號碼'],
  ['person','陳大文、李小明','一格兩個人'],
  ['person','盧國怡 / 胡芷菱','一格兩個人'],
  ['date','3/10/27','日月次序不明'],
  ['yesno','maybe','唔係 Y 又唔係空'],
  ['count','Pannie','填咗人名入數量欄'],
  ['count','好多','唔係數字'],
];
REJECTS.forEach(([f,inp,reason])=>{
  const r=FF.ffCheck(f,inp);
  eq(r.state,'reject',`[③] ${f}「${inp}」應該唔收（${reason}）`);
  ok(r.why&&r.why.length>0,`[③] ${f}「${inp}」要講點解唔收`);
  ok(r.how&&r.how.length>0,`[③] ${f}「${inp}」要講應該點填`);
  eq(r.value,'',`[③] ${f}「${inp}」唔收就唔准亂估一個值出嚟`);
});

/* 唔准為咗交數而亂改：reject 嘅嘢唔可以變 fixed */
ok(FF.ffCheck('troop','1').state!=='fixed','[③] 「1」唔准估成某一區');
ok(FF.ffCheck('person','陳大文、李小明').value!=='陳大文','[③] 一格兩個人唔准靜靜雞剩返一個');

/* ── ④ 每種格式都要有齊 label / canon / rule / good / bad ──────────── */
const FMTS=Object.keys(FF.FIELD_FORMATS);
ok(FMTS.length>=8,`[④] 至少 8 種格式，得到 ${FMTS.length}`);
FMTS.forEach(k=>{
  const F=FF.FIELD_FORMATS[k];
  ok(!!F.label,`[④] ${k} 要有 label`);
  ok(!!F.canon,`[④] ${k} 要有標準寫法 canon`);
  ok(!!F.rule,`[④] ${k} 要有規矩文字`);
  ok(Array.isArray(F.good)&&F.good.length>0,`[④] ${k} 要有 ✓ 例子`);
  ok(Array.isArray(F.bad)&&F.bad.length>0,`[④] ${k} 要有 ✗ 例子`);
  ok(typeof F.check==='function',`[④] ${k} 要有 check()`);
  // 自己寫嘅 ✓ 例子自己要過
  F.good.forEach(g=>{
    const v=String(g).replace(/（.*?）/g,'').trim();
    if(!v) return;
    const r=FF.ffCheck(k,v);
    ok(r.state==='ok',`[④] ${k} 自己標示嘅 ✓ 例子「${v}」自己應該合格，但係 ${r.state}`);
  });
});

/* ── ⑤ 規矩要出得到落 Excel 輸入提示 ──────────────────────────────── */
FMTS.forEach(k=>{
  const p=FF.ffPrompt(k);
  ok(p&&p.title&&p.text,`[⑤] ${k} 要出得到 Excel 輸入提示`);
  ok(p.text.indexOf('✓')>=0&&p.text.indexOf('✗')>=0,`[⑤] ${k} 提示要同時講得同唔得`);
  ok(p.text.length<=255,`[⑤] ${k} 提示 ${p.text.length} 字元，Excel 提示上限 255`);
});
ok(FF.ffPrompt('冇呢種格式')===null,'[⑤] 唔存在嘅格式要回 null');

/* ── ⑥ schema 嘅 format 標註要對得上，例子自己要合格 ──────────────── */
let tagged=0;
TEMPLATES.forEach(t=>t.columns.forEach(c=>{
  if(!c.format) return;
  tagged++;
  ok(!!FF.FIELD_FORMATS[c.format],`[⑥] ${t.id}.${c.k} 用咗未定義格式「${c.format}」`);
  if(c.eg==='' || c.eg==null) return;
  const r=FF.ffCheck(c.format,c.eg);
  ok(r.state!=='reject',`[⑥] ${t.id}.${c.k} 嘅例子「${c.eg}」自己都唔合格`);
}));
ok(tagged>=15,`[⑥] 至少 15 條欄位要標咗格式，得到 ${tagged}`);

/* 旅名欄一定要標 troop —— 呢個就係 2026 兩張表對唔上嗰格 */
TEMPLATES.forEach(t=>t.columns.forEach(c=>{
  if(c.k==='unit') eq(c.format,'troop',`[⑥] ${t.id}.unit 一定要標 troop 格式`);
}));

/* ── ⑦ 合約檔要帶埋格式，下游先至跟得到 ───────────────────────────── */
const cPath=path.join(ROOT,'data/template_contract_2027.json');
if(fs.existsSync(cPath)){
  const C=JSON.parse(fs.readFileSync(cPath,'utf8'));
  let withFmt=0;
  C.templates.forEach(t=>t.columns.forEach(c=>{
    if(!c.format) return;
    withFmt++;
    ok(!!c.canon,`[⑦] 合約 ${t.id}.${c.k} 標咗格式就要有 canon`);
    ok(!!c.rule, `[⑦] 合約 ${t.id}.${c.k} 標咗格式就要有 rule`);
    eq(c.canon,FF.FIELD_FORMATS[c.format].canon,`[⑦] 合約 ${t.id}.${c.k} 嘅 canon 要同 51 一致`);
  }));
  eq(withFmt,tagged,'[⑦] 合約帶格式嘅欄位數要同 schema 一樣');
}else{ ok(false,'[⑦] 搵唔到 data/template_contract_2027.json'); }

/* ── ⑧ 攞 2026 真資料跑：答「如果 2027 守門會擋到幾多」 ───────────── */
const mock=JSON.parse(fs.readFileSync(path.join(ROOT,'data/mock_demo.json'),'utf8'));
const at=(o,p)=>String(p).split('.').reduce((x,k)=>(x==null?undefined:x[k]),o);

const merit=at(mock,'ceremony.meritRoster');
ok(Array.isArray(merit)&&merit.length>0,'[⑧] 要讀到優異旅團名單');
const mAudit=FF.ffAudit(merit,[{k:'unit',label:'旅名',format:'troop'}]);
eq(mAudit.total,merit.length,'[⑧] 優異旅團每行都要驗到');
ok(mAudit.fixed>100,`[⑧] 2026 優異旅團大多數係中文數字寫法，應該有大量自動改正，得到 ${mAudit.fixed}`);
ok(mAudit.reject<=5,`[⑧] 真係救唔返嘅應該係少數，得到 ${mAudit.reject}`);

const booths=at(mock,'activities.booths');
const bAudit=FF.ffAudit(booths,[{k:'booth_no',label:'攤位編號',format:'booth'},
                                {k:'staff_count',label:'人手',format:'count'},
                                {k:'lunch',label:'午膳數',format:'count'}]);
ok(bAudit.reject>0,'[⑧] 攤位表有人填咗非數字入數量欄，守門應該捉到');
const pannie=bAudit.samples.filter(s=>s.state==='reject'&&/[A-Za-z]/.test(String(s.was)));
ok(pannie.length>0,'[⑧] 要捉到「數量欄填咗人名」呢種錯');

const contacts=at(mock,'staff.contacts');
const cAudit=FF.ffAudit(contacts,[{k:'contact',label:'電話',format:'phone'}]);
eq(cAudit.reject,0,'[⑧] 2026 電話欄已經乾淨，唔應該有彈返');

/* ffAudit 回傳形狀 */
['total','ok','fixed','reject','byField','samples'].forEach(k=>
  ok(k in mAudit,`[⑧] ffAudit 要有 ${k}`));
eq(mAudit.ok+mAudit.fixed+mAudit.reject, mAudit.total,'[⑧] 三態加埋要等於總數');
Object.values(mAudit.byField).forEach(b=>{
  ok(!!b.label&&!!b.format,'[⑧] byField 要帶 label 同 format');
  eq(b.ok+b.fixed+b.reject,merit.length,'[⑧] 每欄三態加埋要等於行數');
});

/* ── ⑨ 守門同對鍵要同一套認字能力，唔准各寫各 ─────────────────────── */
[['港島第一旅','港島第1旅'],['港島第二六三旅','港島第263旅'],['港島第二三O旅','港島第230旅']].forEach(([a,b])=>{
  const t1=KM.kmTroop(a), t2=KM.kmTroop(b);
  ok(t1&&t2&&t1.key===t2.key,`[⑨] 對鍵要認得「${a}」＝「${b}」`);
  eq(FF.ffCheck('troop',a).value,b,`[⑨] 守門改正結果要同對鍵嘅標準寫法一致`);
});
/* 唔准亂認：海童軍旅 ≠ 陸上旅 */
ok(KM.kmTroop('港島第5海童軍旅').key!==KM.kmTroop('港島第5旅').key,'[⑨] 海童軍旅唔准當成陸上旅');
eq(FF.ffCheck('troop','港島第5海童軍旅').state,'ok','[⑨] 海童軍旅係合法寫法');

/* ── ⑩ 空值處理：唔准把「冇填」當成「填錯」 ──────────────────────── */
['troop','booth','phone','person','date','plate','count'].forEach(f=>{
  const r=FF.ffCheck(f,'');
  ok(r.state!=='fixed',`[⑩] ${f} 空值唔准自動填嘢入去`);
  eq(r.value,'',`[⑩] ${f} 空值出返空值`);
});
const emptyAudit=FF.ffAudit([{unit:''},{unit:null},{unit:'港島第1旅'}],[{k:'unit',label:'旅名',format:'troop'}]);
eq(emptyAudit.total,3,'[⑩] 空值都要計入總數（因為「冇填」都係一種狀態）');

/* ── ⑪ 守門面板已經掛入去 ─────────────────────────────────────────── */
const cc=fs.readFileSync(path.join(ROOT,'js/50-cross-check.js'),'utf8');
ok(cc.indexOf('gateAudit')>0,'[⑪] 50-cross-check.js 要有 gateAudit');
ok(cc.indexOf('gateHTML')>0,'[⑪] 50-cross-check.js 要有 gateHTML');
ok(cc.indexOf('this.gateHTML()')>0,'[⑪] gateHTML 要真係掛咗落面板');
ok(cc.indexOf('入口守門')>0,'[⑪] 面板要寫明「入口守門」');
const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
ok(idx.indexOf('js/51-field-format.js')>0,'[⑪] index.html 要載入 51-field-format.js');
ok(idx.indexOf('js/51-field-format.js')>idx.indexOf('js/49-key-match.js'),'[⑪] 51 要喺 49 之後載入');

/* ── ⑫ 生成器要驗 format ──────────────────────────────────────────── */
const gen=fs.readFileSync(path.join(ROOT,'tools/build_2027_templates.js'),'utf8');
ok(gen.indexOf('51-field-format')>0,'[⑫] 生成器要讀同一份格式定義，唔准複製一份');
ok(gen.indexOf('showInputMessage')>0,'[⑫] 生成器要出 Excel 輸入提示（人撳落格就見到）');
ok(gen.indexOf('未定義嘅格式')>0,'[⑫] 生成器要驗 format 名有冇寫錯');

/* ───────────────────────────────────────────────────────────────── */
console.log(`v25 入口守門：${pass} 過 / ${fail} 唔過`);
if(fail){ bad.slice(0,30).forEach(m=>console.log('  ✖ '+m)); process.exitCode=1; }
module.exports={pass,fail};
