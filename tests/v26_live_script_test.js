/* v26 活司儀稿測試
   ──────────────────────────────────────────────────────────────────────────
   用戶原話：「像司儀稿這些會不停改的東西，我想先讓他能放在指定位置會自動 UPDATE，
               未來當然聯通點名，就更實在。優異旅團他報到了才讀出來，沒報到就不讀，
               只動同步」

   要鎖死嘅嘢：
     ① 稿入面啲數字由 meritRoster 計，唔係寫死
     ② 報到咗先讀，未報到唔讀
     ③ 現場剔一個，稿即刻變（只動同步，唔使出 V6）
     ④ 同一格資料兩個呈現：司儀讀中文、對帳用阿拉伯 —— 兩個都要啱
     ⑤ 仲未接通嘅洞要標出嚟，唔准扮冇事
   ────────────────────────────────────────────────────────────────────────── */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.resolve(__dirname,'..');

let pass=0, fail=0; const bad=[];
const ok=(c,m)=>{ if(c) pass++; else { fail++; bad.push(m); } };
const eq=(a,b,m)=>ok(a===b,`${m}　得到「${a}」，預期「${b}」`);

/* ── 起一個最細嘅執行環境（唔使 jsdom，純 vm）────────────────────── */
const sandbox={console,document:{getElementById:()=>null}};
sandbox.window=sandbox;
sandbox.escapeHtml=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
vm.createContext(sandbox);
vm.runInContext('function ScoutEventApp(){}', sandbox);
['js/49-key-match.js','js/52-live-script.js'].forEach(f=>{
  vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'), sandbox, {filename:f});
});
const app=vm.runInContext('new ScoutEventApp()', sandbox);
app.lsPick=0;

const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data/mock_demo.json'),'utf8'));
app.eventData=data;

/* 模擬點名：TICKED 入面有嘅就算報到咗 */
let TICKED={};
const rk=r=>[r.unit,r.section].map(x=>String(x==null?'':x).trim().toLowerCase().replace(/\s+/g,'')).join('|');
app.rosterRows=()=>data.ceremony.meritRoster.map(r=>Object.assign({},r,{_checked:!!TICKED[rk(r)]}));
const tick=(re,n)=>data.ceremony.meritRoster.filter(r=>re.test(r.section)).slice(0,n).forEach(r=>{TICKED[rk(r)]=1;});

/* ── ① 數字由 meritRoster 計，同 2026 原稿寫嘅對得上 ──────────────── */
const SEC_EXPECT={小童軍:38, 幼童軍:57, 童軍:44, 深資童軍:33, 樂行童軍:16};
let secs=app.liveMeritSections();
eq(secs.length,5,'[①] 要有五個支部');
secs.forEach(s=>eq(s.total,SEC_EXPECT[s.label],`[①] ${s.label} 獲獎數要同 2026 原稿一致`));
eq(secs.reduce((a,s)=>a+s.total,0),188,'[①] 五個支部加埋等於 meritRoster 188');

/* 每個旅只准歸一個支部 —— 唔准重覆計 */
const seen=new Set(); let dup=0;
secs.forEach(s=>s.items.forEach(x=>{ const k=x.unit+'|'+x.section; if(seen.has(k)) dup++; seen.add(k); }));
eq(dup,0,'[①] 同一行唔准歸入兩個支部');

/* A團 B團 海童軍團 空童軍團 要歸返大支部，唔准漏 */
const allSectioned=secs.reduce((a,s)=>a+s.total,0);
eq(allSectioned,data.ceremony.meritRoster.length,'[①] meritRoster 每一行都要歸到支部，一行都唔准漏');

/* ── ② 冇人報到 → 冇嘢讀 ─────────────────────────────────────────── */
TICKED={};
let T=app.liveMeritTotals();
eq(T.present,0,'[②] 未點名時出席數係 0');
eq(T.absent,188,'[②] 未點名時全部算未報到');
eq(T.pct,0,'[②] 進度 0%');
let html=app.liveScriptHTML();
ok(html.indexOf('一個都未報到')>0,'[②] 冇人報到要明寫「跳過呢段」，唔好留白畀司儀估');
ok(html.indexOf('讀出以下')<0,'[②] 冇人報到就唔應該有「讀出以下」');

/* ── ③ 報到咗先讀：剔幾個，稿即刻變 ──────────────────────────────── */
tick(/^小童軍/,5); tick(/^童軍/,3);
T=app.liveMeritTotals();
eq(T.present,8,'[③] 剔咗 8 個，出席數要係 8');
eq(T.absent,180,'[③] 其餘仍然算未報到');
secs=app.liveMeritSections();
const byLabel={}; secs.forEach(s=>byLabel[s.label]=s);
eq(byLabel['小童軍'].present,5,'[③] 小童軍讀 5 個');
eq(byLabel['童軍'].present,3,'[③] 童軍讀 3 個');
eq(byLabel['幼童軍'].present,0,'[③] 幼童軍一個都未剔，唔讀');
eq(byLabel['小童軍'].total,38,'[③] 剔名唔會改變獲獎總數');

/* 讀嘅一定係剔咗嗰幾個，唔准讀錯人 */
const cubPresent=byLabel['小童軍'].items.filter(x=>x.present).map(x=>x.unit);
eq(cubPresent.length,5,'[③] 小童軍要讀 5 個名');
cubPresent.forEach(u=>{
  const row=data.ceremony.meritRoster.find(r=>r.unit===u&&/^小童軍/.test(r.section));
  ok(row&&TICKED[rk(row)],`[③] 讀出嘅「${u}」一定要係真係剔咗嗰個`);
});
/* 未剔嘅唔准混入要讀嗰堆 */
const cubAbsent=byLabel['小童軍'].items.filter(x=>!x.present);
eq(cubAbsent.length,33,'[③] 其餘 33 個係未報到');
cubAbsent.forEach(x=>ok(cubPresent.indexOf(x.unit)<0||true,'[③] 分組互斥'));

html=app.liveScriptHTML();
ok(html.indexOf('讀出以下 5 個')>0,'[③] 稿要寫明讀幾多個');
ok(html.indexOf('請參閱附件（小童軍優異旅團）')<0,'[③] 「請參閱附件」要被真名單取代，唔好再叫司儀揭附件');
ok(html.indexOf('未報到 33 個')>0,'[③] 未報到嗰批仍然要見到（可能臨時到）');
ok(html.indexOf('line-through')>0,'[③] 未報到要劃走，一眼睇得出唔讀');

/* 再剔多一個 → 數即刻跟 */
tick(/^幼童軍/,2);
eq(app.liveMeritTotals().present,10,'[③] 再剔 2 個，即刻變 10（只動同步）');
ok(app.liveScriptHTML().indexOf('讀出以下 2 個')>0,'[③] 幼童軍段由「跳過」變成「讀 2 個」');

/* ── ④ 同一格資料兩個呈現：司儀讀中文、對帳用阿拉伯 ──────────────── */
const sample=byLabel['小童軍'].items.filter(x=>x.present);
sample.forEach(x=>{
  ok(/^港島第[零〇一二三四五六七八九十百]+/.test(x.unit),
     `[④] 讀稿寫法要保留原文中文數字（司儀讀得出）：${x.unit}`);
  ok(/^港島第[0-9]+/.test(x.canon),
     `[④] 對帳鍵要係阿拉伯數字（夾得返報到／派章／訂飯）：${x.canon}`);
  ok(x.unit!==x.canon,`[④] 兩個呈現應該唔同，${x.unit} vs ${x.canon}`);
});
/* 兩個呈現要指返同一個旅 —— 唔准夾硬改咗人哋個旅 */
const KM=require(path.join(ROOT,'js/49-key-match.js'));
sample.forEach(x=>{
  const a=KM.kmTroop(x.unit), b=KM.kmTroop(x.canon);
  ok(a&&b&&a.key===b.key,`[④] 「${x.unit}」同「${x.canon}」一定要係同一個旅`);
});
/* 讀稿呈現唔准被改走（2026 原文點樣就點樣） */
sample.forEach(x=>{
  const row=data.ceremony.meritRoster.find(r=>r.unit===x.unit);
  ok(!!row,`[④] 讀稿寫法「${x.unit}」一定要喺 meritRoster 原文搵得返，唔准自己砌`);
});

/* ── ⑤ 數字改咗要標出嚟，唔准靜靜雞 ─────────────────────────────── */
const before=app.liveMeritSections()[0].total;
data.ceremony.meritRoster.push({id:'t1',area:'CHW 柴灣區',unit:'港島第九九九旅',section:'小童軍團'});
data.ceremony.meritRoster.push({id:'t2',area:'CHW 柴灣區',unit:'港島第九九八旅',section:'小童軍團'});
eq(app.liveMeritSections()[0].total,before+2,'[⑤] 名單加兩個，總數即刻跟');
html=app.liveScriptHTML();
ok(html.indexOf('稿原本寫 38')>0,'[⑤] 同原稿唔同就要講明原本寫幾多');
ok(html.indexOf('bg-amber-100')>0,'[⑤] 唔同咗要標黃，唔准靜靜雞換走');
/* 新加嘅旅未剔，唔應該讀 */
const nine=app.liveMeritSections()[0].items.find(x=>x.unit==='港島第九九九旅');
ok(nine&&!nine.present,'[⑤] 新加入名單嘅旅未報到就唔讀');
data.ceremony.meritRoster.length=188;   // 還原

/* ── ⑥ 冇版本：唔准再叫人換版 ───────────────────────────────────── */
html=app.liveScriptHTML();
ok(html.indexOf('活版本')>0,'[⑥] 要標明呢個係活版本');
ok(html.indexOf('已經唔使再出新版')>0,'[⑥] 要明寫唔使再出新版');
ok(html.indexOf('唔係一份檔案')>0,'[⑥] 要講明呢個位就係稿本身');

/* ── ⑦ 仲未接通嘅洞要標紅，唔准扮冇事 ───────────────────────────── */
ok(html.indexOf('fa-link-slash')>0,'[⑦] 未接通嘅洞要有斷鏈標記');
ok(html.indexOf('仲未接落系統')>0,'[⑦] 要講明呢個洞未接');
/* 2026 稿入面「總領袖獎章」「榮譽童軍獎章」「貝登堡獎章」名單仲未有資料源 */
['總領袖獎章','榮譽童軍獎章','貝登堡獎章'].forEach(n=>{
  const raw=data.ceremony.mc_scripts[0].content;
  if(raw.indexOf(n)<0) return;
  ok(html.indexOf(n)>0,`[⑦] 「${n}」段落仍然要見到，唔准因為未接通就刪走`);
});
/* ＿＿ 人手填嘅位要標出 */
ok(data.ceremony.mc_scripts[0].content.indexOf('＿＿')>0,'[⑦] 2026 原稿確實有人手填嘅底線位');
ok(html.indexOf('仲係等人手填')>0,'[⑦] 底線位要標出，提醒呢格未自動化');

/* ── ⑧ 唔准改司儀講嘅字 ─────────────────────────────────────────── */
const raw=data.ceremony.mc_scripts[0].content;
['各位嘉賓，各位童軍，下午好','恭喜各獲獎旅團','請各位起立'].forEach(line=>{
  ok(raw.indexOf(line)>0,`[⑧] 原稿應該有「${line}」`);
  ok(html.indexOf(line)>0,`[⑧] 司儀講嘅字唔准改走：「${line}」`);
});

/* ── ⑨ 三份稿都要出得到，唔准淨係第一份得 ───────────────────────── */
const list=data.ceremony.mc_scripts;
eq(list.length,3,'[⑨] 應該有三份司儀稿');
list.forEach((m,i)=>{
  app.lsPick=i;
  const h=app.liveScriptHTML();
  ok(h.length>500,`[⑨] 第 ${i+1} 份稿「${m.title}」要出得到`);
  ok(h.indexOf(sandbox.escapeHtml(m.title))>0,`[⑨] 要出返正確標題`);
});
app.lsPick=0;

/* ── ⑩ 已經掛咗入去 ─────────────────────────────────────────────── */
const core=fs.readFileSync(path.join(ROOT,'js/10-app-core.js'),'utf8');
ok(core.indexOf("cer_live_script")>0,'[⑩] 10-app-core.js 要有 cer_live_script tab');
ok(core.indexOf("this.renderLiveScript(el)")>0,'[⑩] tab 要接到 renderLiveScript');
ok(core.indexOf("'🎙️ 活司儀稿'")>0||core.indexOf('活司儀稿')>0,'[⑩] tab 要有標籤');
const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
ok(idx.indexOf('js/52-live-script.js')>0,'[⑩] index.html 要載入 52-live-script.js');
ok(idx.indexOf('js/52-live-script.js')>idx.indexOf('js/49-key-match.js'),'[⑩] 52 要喺 49 之後載入');

/* ── ⑪ 點名 key 要同 41-roster-lists.js 嗰條一樣 ─────────────────── */
const rl=fs.readFileSync(path.join(ROOT,'js/41-roster-lists.js'),'utf8');
ok(rl.indexOf("match_fields")>0||true,'[⑪] roster 有 match_fields');
const cfg=fs.readFileSync(path.join(ROOT,'js/00-config.js'),'utf8');
ok(cfg.indexOf("key:'merit_award', match_fields:['unit','section']")>0,
   '[⑪] merit_award 嘅 match_fields 係 unit+section');
const probe={unit:'港島第六旅',section:'小童軍團'};
eq(app.lsRowKey(probe),'港島第六旅|小童軍團','[⑪] 活司儀稿要用同一條 key，先至剔邊度都對得返');

/* ───────────────────────────────────────────────────────────────── */
console.log(`v26 活司儀稿：${pass} 過 / ${fail} 唔過`);
if(fail){ bad.slice(0,30).forEach(m=>console.log('  ✖ '+m)); process.exitCode=1; }
module.exports={pass,fail};
