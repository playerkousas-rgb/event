/* v15.4 名單修正回歸（2026-10-03，對應用戶四點投訴）：
   ③ 領袖獎勵名單 ＝ 2026 成年獎勵（委任書／長期服務獎／感謝狀）21 位 —— 由 ceremony.adult_awards 種籽直接點名；
      典禮組上傳／手動行可按（姓名＋獎項）覆蓋、tombstone 遮蔽、附加新人。
   ④ 優異旅團名單預設 📱 1行模式（區／支部可排序、列表緊湊），可切回詳細表。 */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const cfg=fs.readFileSync(path.join(root,'js/00-config.js'),'utf8');
const roster=fs.readFileSync(path.join(root,'js/41-roster-lists.js'),'utf8');
const ceremony=fs.readFileSync(path.join(root,'js/35-ceremony.js'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/isd_2026.json'),'utf8'));

let n=0,fail=0;
const ok=(c,m)=>{ if(c) n++; else { fail++; console.log('FAIL: '+m); } };

/* 源碼層 */
ok(/key:'leader_award'[\s\S]{0,1200}source:'ceremony_adult'/.test(cfg),'領袖獎勵名單來源應為 ceremony_adult（成年獎勵種籽）');
ok(cfg.includes("'感謝狀'")&&cfg.includes("'致送協助單位紀念品'"),'ROSTER_LEADER_AWARDS 應包含 感謝狀／致送協助單位紀念品');
ok(roster.includes('rosterAdultSeedRows()'),'應有成年獎勵種籽生成器');
ok(roster.includes("def.source==='ceremony_adult'"),'rosterRows 應支援 ceremony_adult 來源');
ok(roster.includes('rosterAdultRelaxKey'),'成年獎勵覆蓋應用放寬 key（姓名＋獎項，忽略單位）');
ok(roster.includes("id:'tomb_'+Date.now(),__hidden:true"),'刪除種籽行應落 tombstone 遮起');
ok(roster.includes('rosterIsCompact(key)'),'應有緊湊模式判斷');
ok(/return key==='merit_award';/.test(roster),'優異旅團預設 1行模式');
ok(roster.includes('rosterCompactListHTML(key)'),'應有緊湊清單渲染');
ok(roster.includes("onclick=\"app.rosterToggleCompact('${def.key}')\""),'名單面板應有 1行／詳細表切換掣');
ok(roster.includes('rosterCompactTick(key,rowEnc){ this.rosterTick(key,rowEnc,true,false); }'),'緊湊點名應沿用防錯 TICK 流程');
ok(ceremony.includes('點名請用下面「領袖獎勵獲獎名單」✓ 表'),'成年獎勵靜態顯示應指向點名表');

/* 資料一致性（回歸用戶第①點：參加旅團以『旅團報名人數_2026 as 26.9.2026.xls』為準） */
ok((data.participants||[]).length===31,'參加旅團應為 31 旅團');
ok((data.participants||[]).every(p=>/^港島第|港島地域/.test(p.unit_name||'')),'參加旅團名單不應混入其他制服團體');
const adults=(data.ceremony.adult_awards||[]).reduce((s,a)=>s+(a.recipients||[]).length,0);
ok(adults===21,'成年獎勵種籽應為 21 位（委任書7＋10年獎狀7＋獎章4＋感謝狀2）');
ok((data.ceremony.meritRoster||[]).length===188,'優異旅團獲獎名單應為 188 個獲獎單位');

console.log(`PASS ${n} FAIL ${fail}`);
process.exit(fail?1:0);
