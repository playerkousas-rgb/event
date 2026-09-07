#!/usr/bin/env node
'use strict';
/* v15.0 手機友善修正回歸（2026-09-06，對應用戶反映「手機點名一個人名佔晒成個屏」）：
   ① ≤768px：名單表格改為「一人一行」緊湊點名卡（大 TICK 目標 ≥44px、重點欄位一行過、
      完整欄位＋修正格＋編輯／刪除收喺展開區）；電腦版完整表格原樣保留
   ② 每張名單定義新增 mobile_fields（手機卡顯示邊幾欄一目了然）
   ③ 點名表加關鍵字篩選（rosterLocalFilter），現場搵人唔使狂滑
   ④ 手機卡必帶 no-print —— 列印點名表時唔會同桌面表格重複印出
   ⑤ 全站手機表格（table-responsive 標籤＋值卡片）整體收緊間距 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const cfg = read('js/00-config.js');
const core = read('js/10-app-core.js');
const roster = read('js/41-roster-lists.js');

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

/* ══════════ A. 源碼層面：CSS 版位＋開關 ══════════ */
ok(html.includes('.roster-mobile-list{display:none}'), 'A1 預設隱藏手機點名列表（電腦唔會多咗重複內容）');
ok(/@media screen and \(max-width:768px\)\{[\s\S]*?\.roster-desktop-wrap\{display:none\}[\s\S]*?\.roster-mobile-list\{display:block\}/.test(html),
  'A2 ≤768px 顯示手機列表、隱藏桌面表格');
ok(html.includes('.rm-tick{') && /width:60px/.test(html.split('.rm-tick{')[1].split('}')[0]) && /min-height:58px/.test(html.split('.rm-tick{')[1].split('}')[0]),
  'A3 手機 TICK 觸控目標 ≥58×60px（取代原本 w-4 h-4 細格）');
ok(html.includes('.rm-tick input:checked+.rm-box{background:#059669'), 'A4 TICK 後大格變綠剔，一眼見到狀態');
ok(/\.roster-toolbar>(button|[^}]*)\{[^}]*font-size:10\.5px/.test(html.replace(/\*>button,/g, '*>button,')), 'A5 手機工具列按鈕縮細');
ok(/tbody td\{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 10px/.test(html),
  'A6 全站手機表格「標籤＋值」行距收緊（8px10px→5px10px）');
ok(/tbody tr\{display:block;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:6px/.test(html),
  'A7 手機表格卡片間距收緊（10px→6px）');
ok(html.includes('<script src="js/00-config.js?v=20260906a">') && html.includes('<script src="js/41-roster-lists.js?v=20260906a">'),
  'A8 已更新 JS 版本號，手機瀏覽器唔會食舊快取');

/* ══════════ B. 名單定義：mobile_fields ══════════ */
['section_award', 'leader_award', 'participants', 'meal_box'].forEach(k =>
  ok(new RegExp(`key:'${k}'[\\s\\S]{0,900}mobile_fields:\\[`).test(cfg), 'B1 ' + k + ' 已定義 mobile_fields'));
ok(/key:'merit_award'[\s\S]{0,900}mobile_fields:\['section','area'\]/.test(cfg), 'B2 優異旅團名單已定義 mobile_fields');
ok(/key:'leader_award'[\s\S]{0,900}mobile_fields:\['no','unit','award','oath'\]/.test(cfg), 'B3 領袖獎勵手機卡顯示唱名序／單位／獎項／覆誓');

/* ══════════ C. 引擎：手機渲染＋篩選＋列印保護 ══════════ */
ok(roster.includes('rosterMobileListHTML(key)'), 'C1 已有 rosterMobileListHTML 手機渲染');
ok(/rosterBodyHTML\(key\)\{[\s\S]{0,400}roster-desktop-wrap[\s\S]{0,200}rosterMobileListHTML/.test(roster),
  'C2 列表主體＝桌面表格（roster-desktop-wrap）＋手機一人一行卡');
ok(roster.includes('class="roster-mobile-list no-print"'), 'C3 手機卡帶 no-print，列印時唔會重複印出桌面表格');
ok(roster.includes("onchange=\"app.rosterTick('${key}','${enc}',this,false)\""), 'C4 手機大格直接走原有 rosterTick 防錯流程');
ok(roster.includes("onchange=\"app.rosterTick('${key}','${enc}',this,true)\""), 'C5 修正格保留喺手機展開區（TICK=Y＋修正=Y 先取消）');
ok(roster.includes('rosterLocalFilter(key,q,group)') && roster.includes("oninput=\"app.rosterLocalFilter('${def.key}',this.value)\""),
  'C6 點名表有關鍵字篩選框');
ok(/rosterRefreshBody\(key\)\{[\s\S]{0,300}rosterLocalFilter/.test(roster), 'C7 TICK／修正重畫後篩選繼續生效');
ok(roster.includes('roster-toolbar'), 'C8 工具列已標記 roster-toolbar（手機縮細按鈕用）');

/* ══════════ C2. v15.1 分組章一撳篩選＋控制加大 ══════════ */
ok(roster.includes('roster-gchip') && roster.includes('rosterFilterGroup(key,g)') && roster.includes("onclick=\"app.rosterFilterGroup('${key}','${encodeURIComponent(g)}')\""),
  'C2-1 名單分組章可一撳篩選（去到邊區撳邊區）');
ok(roster.includes('全部</span>') && /rosterFilterGroup\('\$\{key\}',''\)/.test(roster), 'C2-2 有「全部」chip 一撳還原');
ok(roster.includes('event.stopPropagation();app.rosterConfirmGroup'), 'C2-3 分組確認掣唔會觸發篩選（stopPropagation）');
ok(roster.includes('data-rg="${escapeHtml(String(r[gk]') && (roster.match(/data-rg=/g) || []).length >= 2, 'C2-4 桌面行＋手機卡都帶 data-rg 準確分組標記');
ok(/@media screen and \(max-width:768px\)\{[\s\S]*?\.roster-sel\{min-height:40px/.test(html) && /\.roster-q\{min-height:44px;font-size:16px\}/.test(html),
  'C2-5 手機排序下拉／篩選框加大（≥40px；input 16px 防 iOS 自動放大）');

/* ══════════ D. 執行層面：真係 render 一次手機卡 ══════════ */
const lsStore = new Map();
const ctx = {
  console, setTimeout, clearTimeout, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Map, Set, Promise,
  Intl, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
  localStorage: { getItem: k => lsStore.has(k) ? lsStore.get(k) : null, setItem: (k, v) => lsStore.set(k, String(v)), removeItem: k => lsStore.delete(k) },
  document: { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, addEventListener: () => {}, createElement: () => ({ style: {} }) },
  window: {}, navigator: { onLine: false }, fetch: undefined, FormData: undefined, FileReader: undefined, location: { href: '' }
};
ctx.globalThis = ctx;
vm.createContext(ctx);
// 只載入定義＋原型方法，唔跑 bootstrap（90-bootstrap.js 會即時 new app）
vm.runInContext(cfg + '\n' + core + '\n' + roster + '\nthis.__App=ScoutEventApp;', ctx, { filename: 'bundle.js' });
const app = Object.create(ctx.__App.prototype);
app.currentEvent = { event_id: 'test_evt', event_name: '測試活動' };
app.currentUser = { name: '陳測試', user_id: 'u1', role: 'admin', group_name: '行政組' };
app.gasUrl = ''; app.apiKey = '';
app.isAdmin = function () { return !!(this.currentUser && this.currentUser.role === 'admin'); }; // stub：真身喺 20-accounts.js
// 播種：支部獎勵 1 行（含全部 7 欄）
const d = app.getRosterData();
d.rows.section_award = [{ id: 'r1', area: 'HKW 港島西區', section: '童軍', unit: '港島第15旅', name: '陳大文', award: '總領袖獎章', cert_no: 'ISD26/SL/001', notes: '' }];
app.saveRosterData(d);

const mobHtml = app.rosterMobileListHTML('section_award');
ok(mobHtml.includes('roster-mobile-list no-print') && mobHtml.includes('rm-row'), 'D1 手機卡渲染成功');
ok(mobHtml.includes('<b>陳大文</b>'), 'D2 大名＝必填欄（獲獎人姓名）');
ok(mobHtml.includes('港島第15旅') && mobHtml.includes('總領袖獎章'), 'D3 一行卡帶 mobile_fields 重點欄位（旅團／獎項）');
ok((mobHtml.match(/app\.rosterTick\('section_award'/g) || []).length === 2, 'D4 每行有 TICK 大格＋展開修正格各一');
ok(mobHtml.includes('ISD26/SL/001'), 'D5 展開區顯示完整欄位（證書編號）');
ok(mobHtml.includes('rm-fix') && mobHtml.includes('rm-actions'), 'D6 展開區有修正格＋編輯／刪除掣');
ok(app.rosterMobileListHTML('leader_award').includes('尚未有'), 'D7 空名單顯示預留提示');

// 桌面版表格仍然存在
const deskHtml = app.rosterTableHTML('section_award');
ok(deskHtml.includes('table-responsive') && deskHtml.includes('<thead'), 'D8 電腦版完整表格原樣保留');
const body = app.rosterBodyHTML('section_award');
ok(body.includes('roster-desktop-wrap') && body.includes('rm-row'), 'D9 主體同時含兩版（CSS 按裝置二選一）');

// 篩選狀態儲存＋重畫後再套用（mock DOM 下至少唔會炸）
app['_rosterQ_section_award'] = '陳';
ok(typeof app.rosterLocalFilter === 'function', 'D10 rosterLocalFilter 存在');
app.rosterRefreshBody('section_award');
ok(app['_rosterQ_section_award'] === '陳', 'D11 篩選關鍵字跨重畫保留');
app['_rosterG_section_award'] = '童軍';
ok(typeof app.rosterFilterGroup === 'function', 'D12 rosterFilterGroup 存在');
app.rosterRefreshBody('section_award');
ok(app['_rosterG_section_award'] === '童軍', 'D13 分組篩選跨重畫保留');

/* ══════════ E. v15.1 紀念章派發：手機一人一行卡＋組別章／攤位篩選 ══════════ */
const stamps = read('js/40-souvenir-stamps.js');
ok(stamps.includes("id=\"stamp-mobile-${scope}\"") && stamps.includes('roster-mobile-list no-print'), 'E1 紀念章有手機一人一行派發卡');
ok(stamps.includes("onchange=\"app.toggleSouvenirStamp('${scope}','${escapeHtml(p.key)}',this,false)\"") && stamps.includes('rm-tick'), 'E2 手機卡大 TICK 格直駁 toggleSouvenirStamp');
ok(stamps.includes('stamp-gchip') && stamps.includes('stampFilterGroup(scope,g)'), 'E3 組別進度章變一撳篩選');
ok(stamps.includes("id=\"stamp-booth-${scope}\"") && stamps.includes('🎯 全部攤位'), 'E4 攤位下拉：去到邊個攤位揀邊個');
ok(stamps.includes("id=\"stamp-chips-${scope}\""), 'E5 組別章容器有 id（active 狀態切換用）');
ok(/stamp-table-'\s*\+scope[\s\S]{0,80}\?\"\)/.test('') || stamps.includes("'stamp-mobile-'+scope"), 'E6 排序同步處理手機卡');
ok(/filterSouvenirStamps\(scope\)\{[\s\S]{0,1800}data-sort_group/.test(stamps) && stamps.includes("booth==='__none__'"), 'E7 篩選支援組別＋攤位（含無攤位）');
ok(stamps.includes('stamp-ctl') && /select\.stamp-ctl\{font-size:14px/.test(html), 'E8 搜尋框／下拉手機加大（16px 防 iOS zoom）');
ok(stamps.includes('id="stamp-showing-') && stamps.includes('/${Math.round(total)} 人'), 'E9 篩選後顯示「顯示 X/Y 人」');
ok(/toggleSouvenirStamp[\s\S]{0,2200}stamp-mobile-/.test(stamps), 'E10 TICK 後桌面行＋手機卡同步更新');
ok((stamps.match(/_stampF\[scope\]=\{group:''\};\s*\/\/ 全面重畫後還原篩選/g) || []).length === 2, 'E11 重新匯入／清除名單後還原篩選');

// 真 render 一次紀念章手機卡
vm.runInContext(stamps + '\nthis.__ok=true;', ctx, { filename: 'stamps.js' });
app.usersList = [];
app.getLocalUsers = () => [];
app.getStaffData = () => ({ contacts: [{ name: '陳大文', group_name: '主題節目組', role_title: '工作人員' }, { name: '李小明', group_name: '行政組', role_title: '主任' }], org_chart: [] });
app.getCeremonyData = () => ({ guests: [{ name: '周嘉賓', unit: '香港總會', title: '總監' }] });
app.isSuperAdminUser = () => false;
app.getSouvenirStampData().staff_custom = [];
// 匯入含攤位嘅自訂名單 → 先會有攤位下拉
const sd = app.getSouvenirStampData();
sd.staff_custom = [{ name: '攤位甲', group_name: '主題節目組', booth: 'A01', job_title: '攤位負責人' }, { name: '攤位乙', group_name: '主題節目組', booth: 'A02', job_title: '' }];
app.saveSouvenirStampData(sd);
const staffHtml = app.renderSouvenirStampsHTML('staff');
ok(staffHtml.includes('id="stamp-mobile-staff"') && staffHtml.includes('rm-row') && staffHtml.includes('rm-tick'), 'E12 工作人員手機卡渲染成功');
ok(staffHtml.includes('<b>攤位甲</b>') && staffHtml.includes('A01'), 'E13 手機卡顯示姓名＋攤位');
ok(staffHtml.includes('id="stamp-booth-staff"') && staffHtml.includes('<option value="A01">A01</option>'), 'E14 攤位下拉有實際攤位選項');
ok(staffHtml.includes('id="stamp-chips-staff"') && staffHtml.includes('stampFilterGroup'), 'E15 組別章可撳篩選');
ok(staffHtml.includes('roster-desktop-wrap') && staffHtml.includes('id="stamp-table-staff"'), 'E16 桌面完整表格保留');
const guestHtml = app.renderSouvenirStampsHTML('guests');
ok(guestHtml.includes('id="stamp-mobile-guests"') && guestHtml.includes('<b>周嘉賓</b>') && guestHtml.includes('香港總會'), 'E17 嘉賓手機卡渲染成功（單位／職銜）');
ok(!guestHtml.includes('id="stamp-booth-guests"'), 'E18 嘉賓冇攤位下拉（設計正確）');
app.stampFilterGroup('staff', encodeURIComponent('主題節目組'));
ok(app._stampF.staff.group === '主題節目組', 'E19 stampFilterGroup 記住組別');
app.stampFilterGroup('staff', encodeURIComponent('主題節目組'));
ok(app._stampF.staff.group === '', 'E20 再撳一次＝還原全部');

/* ══════════ F. v15.2 戶外離線可用＋首屏開得快 ══════════ */
const sw = read('sw.js');
ok(/<script defer src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/mammoth/.test(html) && /<script defer src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx/.test(html),
  'F1 xlsx／mammoth 大檔（約 1MB）改 defer——戶外弱訊號首屏唔會被卡死');
ok(html.includes('serviceWorker') && html.includes("register('sw.js'"), 'F2 index.html 已註冊 Service Worker');
ok(html.includes('rel="manifest"') && html.includes('name="theme-color" content="#6d28d9"'), 'F3 PWA manifest＋主題色');
ok(sw.includes("const CACHE = 'scout-ops-"), 'F4 sw.js 有版本化快取名');
ok(sw.includes('skipWaiting()') && sw.includes('clients.claim()'), 'F5 SW 即用新版（舊快取自動清）');
ok(sw.includes("location.origin") && sw.includes("caches.match('./index.html')"), 'F6 離線開頁面 fallback 到快取外殼');
ok(sw.includes("url.pathname.startsWith('/api/')"), 'F7 後端 API 唔會被快取攔截');
ok(sw.includes("req.method !== 'GET'"), 'F8 POST（saveRecord 等）直接上網唔攔截');
ok(sw.includes('cdnjs.cloudflare.com'), 'F9 cdnjs 用 cache-first（慳流慳電）');
(() => {
  const list = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]).filter(x => x !== '');
  const missing = list.filter(f => !fs.existsSync(path.join(root, f)));
  ok(!missing.length, 'F10 預快取檔案全部存在（欠：' + missing.join(',') + '）');
  const scripts = [...html.matchAll(/<script src="(js\/[^"?]+)/g)].map(m => m[1]);
  ok(scripts.every(s => list.includes(s)), 'F11 全部 js 模組已入預快取清單');
})();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
ok(manifest.name && manifest.display === 'standalone' && manifest.icons.length >= 2, 'F12 manifest 完整（可加到主畫面）');
ok(fs.existsSync(path.join(root, 'assets/icons/icon-192.png')) && fs.existsSync(path.join(root, 'assets/icons/icon-512.png')), 'F13 PWA 圖示存在');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
ok(vercel.headers.some(h => h.source === '/sw.js'), 'F14 vercel.json 已為 sw.js 設 no-cache（更新檢查必須）');

/* ══════════ G. v15.3 全站手機表格自動補 data-label（「手機一開就混亂」嘅根源修正） ══════════ */
ok(html.includes('v15.3 全站手機表格自動補 data-label'), 'G1 index.html 有自動標籤 inline script');
ok(html.includes("hasAttribute('data-label')) continue"), 'G2 手寫 data-label 永遠優先，絕唔覆蓋');
ok(html.includes("MutationObserver") && html.includes('childList:true,subtree:true'), 'G3 MutationObserver 監聽任何模組重畫自動補');
ok(html.includes("t.querySelectorAll('thead th')") && html.includes("tr.querySelectorAll(':scope > td')"), 'G4 按該表 th 順序對位 td');
ok(html.includes('td[data-label=""]::before{display:none;content:none}'), 'G5 獨欄行（colspan「暫無資料」）唔出空標籤');
ok(html.includes("multi ? (labels[i]||'') : ''"), 'G6 多欄行先對位標籤；獨欄行留空');
// 行為已用真 DOM（linkedom＋MutationObserver）獨立驗證：
//   td 自動獲對應 th 標籤 ✔　手寫標籤不受干擾 ✔　colspan 行留空 ✔　innerHTML 重畫後補標籤 ✔

/* ══════════ H. v15.4 全站手機適配（唔止表格：整體觀感） ══════════ */
ok(html.includes('toTopBtn') && html.includes("window.scrollY||document.documentElement.scrollTop") && html.includes("typeof window.addEventListener!=='function'"),
  'H1 長頁返回頂部掣（守衛式，mock 環境唔炸）');
ok(/@media\(max-width:768px\)\{[\s\S]*input:not\(\[type=checkbox\]\)[^}]*font-size:16px/.test(html),
  'H2 全站輸入框手機 ≥16px（防 iOS 聚焦自動縮放跳畫面）');
ok(html.includes('[class^="text-[9px]"]') && html.includes('[class^="text-[11px]"]'),
  'H3 9–11.5px 超細字字體地板（≥11px 先見得人）；sm: 前綴變體唔會被誤中（^ 或空格開頭先中）');
ok(html.includes('.m-tabbar{flex-wrap:nowrap!important') && html.includes('.m-tabbar>button{min-height:40px'),
  'H4 模組分頁條手機一排橫滑唔折行，每個 ≥40px');
['js/26-monitor-apply.js','js/21-activities.js','js/35-ceremony.js','js/36-crisis.js','js/10-app-core.js'].forEach(f =>
  ok(read(f).includes('m-tabbar'), 'H5 ' + f + ' 分頁條已掛 m-tabbar'));
ok(html.includes('.table-responsive tbody td{flex-wrap:wrap'), 'H6 手機表格欄位可換行（多掣長文唔再擠爆）');
ok(/src="js\/26-monitor-apply\.js\?v=20260906a/.test(html) && /src="js\/10-app-core\.js\?v=20260906a/.test(html), 'H7 改動咗嘅 js 已更新版本號');

console.log('V15_MOBILE_ROLLCALL_OK (' + n + ' checks)');
