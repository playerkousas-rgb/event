#!/usr/bin/env node
'use strict';
/**
 * v20 工作人員 × 參加者對接回歸測試
 *  ① 點名：執行手冊四張名單（優異旅團／參加旅團／代訂餐盒／支部・領袖獎勵）有定義同真實行數
 *  ② 派嘉賓章：嘉賓名單＝正式 102 位（唔再係硬編 10 位示範）
 *  ③ 司儀稿：3 份全文入咗執行手冊，可搵字、可放大、可列印
 *  ④ 成年獎勵及 RUNDOWN：示範版唔再早退（v17 已填真實資料）
 *  ⑤ 點車牌：三個來源自動歸邊；閘口查冊；明寫放行權在警方
 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0; const ok=(c,m)=>{ if(!c) throw new Error('FAIL: '+m); n++; };

const mock=JSON.parse(read('data/mock_demo.json'));

/* ── ① 點名 ── */
const cfg=read('js/00-config.js');
['section_award','leader_award','participants','meal_box'].forEach(k=>
  ok(cfg.includes(`key:'${k}'`),`① ROSTER_LIST_DEFS 有 ${k}`));
ok(cfg.includes("tick_label:'點名'"),'① 名單引擎有「點名」');
ok(/TICK 只加不減/.test(cfg),'① 防錯點名：TICK 只加不減，取消要剔「修正」');
ok((mock.ceremony.meritRoster||[]).length===188,'① 優異旅團獲獎 188 團次');
ok((mock.public_channel_2027.manual.participants.rows||[]).length===31,'① 參加旅團 31 旅');
ok((mock.ceremony.adult_awards||[]).length===6,'① 成年獎勵 6 項');
const rl=read('js/41-roster-lists.js');
ok(/rosterRowKey\(def,row\)/.test(rl),'① 行 key 由內容欄位組成（重新匯入都對得返同一個 TICK）');

/* ── ② 派嘉賓章 ── */
ok((mock.guest_roster.guests||[]).length===102,'② guest_roster 有正式 102 位嘉賓');
const cer=read('js/35-ceremony.js');
ok(/const gr=this\.eventData&&this\.eventData\.guest_roster&&this\.eventData\.guest_roster\.guests;/.test(cer),
  '② getCeremonyData 示範版改用 guest_roster 正式名單');
ok(/if\(Array\.isArray\(gr\)&&gr\.length\)\{\s*demo\.guests=gr\.map/.test(cer),'② 有真名單就覆蓋硬編示範嘉賓');
const sv=read('js/40-souvenir-stamps.js');
ok(/souvenirGuestRoster\(\)\{/.test(sv)&&/cer=this\.getCeremonyData\(\)/.test(sv),'② 派嘉賓章由 getCeremonyData().guests 餵');
ok(cfg.includes("scope:'guests'")&&cfg.includes('嘉賓接待組'),'② 嘉賓章 scope 屬嘉賓接待組');
ok(/嘉賓名單唔可以改名/.test(cfg),'② 嘉賓唔可以換名（冇代嘉賓）');
ok(mock.guest_roster.checkin_policy.identity_changes==='not_allowed','② 點名政策：唔准換身份，只准新增');

/* ── ③ 司儀稿入執行手冊 ── */
const mc=mock.ceremony.mc_scripts||[];
ok(mc.length===3,'③ 3 份官方司儀稿');
ok(mc.every(s=>s.content&&s.content.trim().length>500),'③ 三份都有全文（唔係淨係 PDF 連結）');
ok(mc.reduce((a,s)=>a+s.content.length,0)>16000,'③ 全文合共 16,000 字以上');
const mm=read('js/26-monitor-apply.js');
ok(/\{k:'mc_scripts', icon:'fa-solid fa-microphone-lines', label:'司儀稿'\}/.test(mm),'③ 執行手冊有「司儀稿」分頁');
ok(/mc_scripts:\(\)=>\{ panel\.innerHTML=this\.execManualMcScriptsHTML\(\); \}/.test(mm),'③ 分頁已接線');
ok(/execManualMcScriptsHTML\(\)\{/.test(cer),'③ 手冊版渲染器存在');
ok(/execMcSetQ\(v\)/.test(cer)&&/execMcHighlight\(line,q\)/.test(cer),'③ 可搵字＋高亮（綵排改稿用）');
ok(/execMcSetSize\(d\)/.test(cer),'③ 字級可調（台上睇手機）');
ok(/execMcPrint\(i\)/.test(cer),'③ 可以淨係列印一份');
ok(/場內冇網絡都讀得到/.test(cer),'③ 明寫離線都讀到');

/* ── ④ 成年獎勵及 RUNDOWN 唔再早退 ── */
ok(!/ceremonyPart1RundownV5HTML\(\)\{\s*if\(this\.isDemoEvent&&this\.isDemoEvent\(\)\) return '';/.test(cer),
  '④ RUNDOWN V5 唔再喺示範版早退');
ok(!/adultAwards2026HTML\(\)\{\s*if\(this\.isDemoEvent&&this\.isDemoEvent\(\)\) return '';/.test(cer),
  '④ 成年獎勵唔再喺示範版早退');
ok((mock.ceremony.rundown_part1_v5.rows||[]).length===13,'④ Rundown Part1 V5 13 行');

/* ── ⑤ 點車牌 ── */
const pr=read('js/46-plate-roll.js');
ok(/放唔放行由警察決定/.test(pr),'⑤ 明寫：放行權在警方，呢度唔係批核系統');
ok(/入校放行與否由警察學院閘門當值人員決定/.test(pr),'⑤ 交警校名單印上免責聲明');
ok(/plateNorm\(s\)\{.*toUpperCase\(\)\.replace\(\/\[\^A-Z0-9\]\/g,''\)/.test(pr),'⑤ 車牌正規化（人手輸入格式唔一）');
['guest_roster','vehicle_passes','extra'].forEach(k=>ok(pr.includes(k),`⑤ 車牌來源：${k}`));
ok(/v\.status&&v\.status!=='approved'\) return;/.test(pr),'⑤ 工作人員車牌只計已批核');
ok(/ex\.dup=\(ex\.dup\|\|\[\]\)\.concat/.test(pr),'⑤ 同一車牌兩處出現 → 合併並標示');
ok(/r\.norm\.includes\(q\)/.test(pr),'⑤ 閘口查冊：打尾 4 位都搵到');
ok(/platePrintSubmission\(\)\{/.test(pr)&&/plateExport\(\)\{/.test(pr),'⑤ 可印可匯出交警校名單');
ok(/plateMarkSubmitted\(\)\{/.test(pr)&&/之後新增嘅車牌要另行補交/.test(pr),'⑤ 標示已交＋提醒補交');
ok(/platePresent\(norm\)\{/.test(pr),'⑤ 閘口點到咗');
const core=read('js/10-app-core.js');
ok(/\{k:'coord_plate',label:'🔢 點車牌（交警校／閘口查冊）'\}/.test(core),'⑤ 協調組部門中心有「點車牌」頁籤');
ok(/case 'coord_plate': this\.renderPlateRoll\(el\); break;/.test(core),'⑤ 已接線');
ok(read('index.html').includes('js/46-plate-roll.js?v='),'⑤ index.html 已掛載');
const plated=(mock.guest_roster.guests||[]).filter(g=>g.car_plate&&g.car_plate.trim()).length;
ok(plated===23,`⑤ 嘉賓名單本身有 ${plated} 個車牌（2026 真實資料）`);

console.log(`v20 工作人員×參加者對接測試通過（${n} 項）｜嘉賓 102・司儀稿 3 份 ${mc.reduce((a,s)=>a+s.content.length,0).toLocaleString()} 字・優異旅團 188・嘉賓車牌 ${plated}`);
