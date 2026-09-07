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
ok(html.includes('<script src="js/00-config.js?v=20260906a">') && html.includes('<script src="js/41-roster-lists.js?v=20260907a">'),
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
ok(/src="js\/26-monitor-apply\.js\?v=2026090[67][a-g]/.test(html) && /src="js\/10-app-core\.js\?v=2026090[67][a-g]/.test(html), 'H7 改動咗嘅 js 已更新版本號');

/* ══════════ I. v15.5 分頁短名（電腦全稱／手機 2–4 字） ══════════ */
ok(html.includes('SHORT_TAB_LABELS') && html.includes("['優異旅團獲獎名單','優異旅團']"), 'I1 長名→短名對照表存在');
ok(html.includes("'組織架構與聯絡','架構聯絡'") && html.includes("'代訂餐盒名單','餐盒名單'"), 'I2 執行手冊分頁短名齊全');
ok(html.includes("'應變指引 (急救·保險)','危機指引'") && !html.includes("'危機指引','指引'"),
  'I3a 短名必留物件關鍵詞（應變指引→危機指引，唔會齋叫「指引」）');
ok(html.includes("'意外事件報告表','意外報告'") && html.includes("'借用統計＋招牌','借用統計'"), 'I3 危機處理／部門中心分頁短名齊全');
ok(html.includes("'組織架構與聯絡','架構聯絡'") && html.includes("'場地與活動總覽','場地總覽'"), 'I3b 短名 4 字內但語意完整（架構聯絡／場地總覽）');
ok(!html.includes("'財務指引','財務'"), 'I3c 4 字或以內唔郁（財務指引原樣保留）');
ok(/\.lbl-short\{display:none\}/.test(html) && /@media\(max-width:768px\)\{\.lbl-long\{display:none\}\.lbl-short\{display:inline\}\}/.test(html),
  'I4 電腦顯示全稱、手機顯示短名（純 CSS 按闊度切換）');
ok(html.includes("btn.title=lng"), 'I5 全稱保留喺 title（長撳／無障礙讀到）');
ok(html.includes("createTreeWalker(btn,4)"), 'I6 用 TreeWalker 只動文字節點（icon／徽章元素唔會整爛）');
ok(html.includes("data-st-done"), 'I7 每粒掣只縮一次，排序／換 class 唔會重複包 span');

/* ══════════ J. v15.6 執行手冊「章→節」手風琴（大總管分類試點） ══════════ */
const j26 = read('js/26-monitor-apply.js');
ok(j26.includes('sectionizeExecPanel(panel, chapterKey)') && j26.includes("this.execManualSubTab==='participants'||this.execManualSubTab==='meal_box'"),
  'J1 平面長章（參加旅團名單／代訂餐盒名單）掛手風琴；有內部分頁條嘅章唔加工');
ok(j26.includes("matchMedia('(max-width:768px)')") && j26.includes("typeof window.matchMedia==='function'"),
  'J2 電腦預設全開、手機預設只開第一節（matchMedia 有守衛，mock 環境唔炸）');
ok(j26.includes("localStorage.setItem(this.execSecStoreKey()") && j26.includes("exec_sections_open_"),
  'J3 每節開關有落盤（活動＋章＋節名），下次入嚟見返');
ok(j26.includes("/緊急/.test(title)"), 'J4 標題含「緊急」嘅節永遠預設展開（救命資料唔收埋）');
ok(j26.includes('execSecToggleAll') && j26.includes('全部展開') && j26.includes('全部收合'),
  'J5 ≥2 節會出「全部展開／全部收合」工具列');
ok(html.includes('details.exec-sec>summary.exec-sec-sum') && html.includes('.m-subtab{background:#f1f5f9'),
  'J6 節卡＋節列（灰底膠囊條）CSS 齊');
ok(read('js/31-staff.js').includes('m-tabbar m-subtab') && j26.includes('m-tabbar m-subtab') &&
   read('js/21-activities.js').includes('m-subtab') && read('js/35-ceremony.js').includes('m-subtab') && read('js/36-crisis.js').includes('m-subtab'),
  'J7 五條章內分頁條全部掛 m-tabbar＋m-subtab（手機一排橫滑＋視覺分層）');
ok(/src="js\/31-staff\.js\?v=20260907a/.test(html) && /src="js\/26-monitor-apply\.js\?v=20260907[a-g]/.test(html),
  'J8 今轉改動咗嘅 js 版本號已 bump');

/* ══════════ K. v15.7 執行手冊路線列（執行手冊 › 章 › 節） ══════════ */
ok(j26.includes('id="exec-crumb"') && html.includes('.exec-crumb{'), 'K1 章頁最頂常駐路線列（div#exec-crumb＋CSS）');
ok(j26.includes('execCrumbUpdate()') && j26.includes(".m-tabbar:not(.m-subtab)") && j26.includes(".m-subtab"),
  'K2 路線列讀 DOM：章＝章列 active、節＝節列 active（唔使逐個模組改 label）');
ok(j26.includes("'switchStaffTab','switchActivitiesTab','switchCeremonyTab','switchCrisisTab','switchExecManualMiscTab'") && j26.includes('_crumbWrapped'),
  'K3 五個內部分頁切換函數已包更新；_crumbWrapped 防重複包');
ok(j26.includes("btn.querySelector('.lbl-long')"), 'K4 路線列用全稱（.lbl-long 優先），手機短名唔會走樣');
ok(html.includes('.exec-crumb-sec{color:#6d28d9'), 'K5 節名用主色突出（層次一眼可見）');
ok(/src="js\/26-monitor-apply\.js\?v=20260907[b-g]/.test(html), 'K6 js 版本號 bump');

/* ══════════ L. v15.11 目錄只屬列印版；APP 內唔要 ══════════ */
ok(!j26.includes("{k:'toc'") && !j26.includes('renderExecManualTOC') && !j26.includes('execManualTOC'),
  'L1 APP 目錄已撤走（用戶定案：對用 APP 嘅人冇用）');
ok(j26.includes("if(!this.execManualSubTab) this.execManualSubTab='staff';"),
  'L2 章預設還原 staff（手機電腦一致）');
ok(!html.includes('.exec-toc-q{') && !j26.includes('exec-toc-q'), 'L3 目錄頁 CSS／捷徑死碼已清走');
/* ══════════ M. v15.9 公告資訊內容併入執行手冊（掛原 renderer，零複製） ══════════ */
ok(j26.includes("{k:'ann_list'") && j26.includes("{k:'schedule'") && j26.includes("{k:'unit_guide'") && j26.includes("{k:'theme_badges'"),
  'M1 手冊加四章：公告／日程表／旅團須知／活動主題章');
ok(j26.includes('this.renderAnnList(document.getElementById') && j26.includes("id=\"ann-tab-list\""),
  'M2 公告章照用 renderAnnList，並以 ann-tab-list 包裝保佢內部搜尋重繪唔散');
ok(j26.includes('this.renderScheduleModule(panel)') && j26.includes('this.renderUnitGuideModule(panel)') && j26.includes('this.renderThemeBadgesModule(panel)'),
  'M3 日程／須知／主題章掛原 renderer（資料得一份，零同步風險）');
ok(html.includes("['活動主題章','主題章']"), 'M4 活動主題章短名對照（手機 3 字）');
/* ══════════ N. v15.10/15.11 清走溝通推廣＋列印整本手冊（附目錄頁） ══════════ */
const j34 = read('js/34-announcements.js');
ok(!j34.includes('跨部門溝通') && !j34.includes('任務跟進') && !j34.includes('搜尋公告/協作'),
  'N1 公告模組清走溝通功能宣傳/分類/字眼（用戶定案：組別溝通唔推）');
ok(j34.includes("title:'使用貼士'"), 'N2 種子公告改做「使用貼士」教路（替代原協作指引）');
ok(j34.includes('執行手冊」內都搵到'), 'N3 公告卡簡介有指向執行手冊');
ok(j26.includes('execPrintAll()') && j26.includes('const BOOK=[') && j26.includes('.chapter{page-break-before:always'),
  'N4 列印整本：逐章真 render → clone 剷掣、每章一頁新開');
ok(j26.includes('目錄頁只屬列印版') && j26.includes("'嘉賓地圖'") && j26.includes("'緊急聯絡'") && j26.includes("'箱頭紙','許可證式樣','失物認領'"),
  'N5 列印版自動附目錄頁（章＋節兩層，APP 內見唔到）');
ok(j26.includes('this.switchExecManualTab(orig)') && j26.includes('}finally{'),
  'N6 印完還原用戶原本開緊嗰章（finally，唔會卡喺最後一章）');
ok(j26.includes('列印整本手冊') && !j26.includes('列印本章'), 'N7 只剩「列印整本手冊」一粒掣');
ok(/src="js\/26-monitor-apply\.js\?v=20260907g/.test(html) && /src="js\/34-announcements\.js\?v=20260907a/.test(html),
  'N8 兩個 js 版本號已 bump');

/* ══════════ O. v15.12 前線視覺：🆘 緊急掣＋部門頁統計沉底 ══════════ */
ok(/v6\.1<\/span><button onclick="event\.stopPropagation\(\);app\.goEmergency\(\)"/.test(html) && html.includes('fa-phone-volume') && html.includes('animate-pulse'),
  'O1 頂 BAR 版本號隔籬有醒目紅色緊急掣（任何頁見到，唔會觸發首頁跳轉）');
ok(j26.includes('goEmergency(){') && j26.includes("this.openModule('exec_manual')") && j26.includes("this.switchExecManualTab('crisis')") && j26.includes("this.switchCrisisTab('contacts')") && j26.includes('scrollIntoView'),
  'O2 緊急掣路線：執行手冊 → 危機處理 → 緊急聯絡 → 自動碌落去');
const j10 = read('js/10-app-core.js');
const iInfo=j10.indexOf('${this.groupInfoBoxesHTML(groupName)}'), iDetail=j10.indexOf('${this.groupDetailSectionHTML(groupName)}'), iStats=j10.indexOf('${this.groupStatsSectionHTML(groupName)}');
ok(iInfo>0 && iInfo<iDetail && iDetail<iStats, 'O3 部門頁預設排版改為 資訊→詳細→統計數字沉底（前線優先）');
ok(j10.includes('前線優先排序') && j10.includes('統計</b>（最下'), 'O4 部門頁簡介用返新次序');
ok(/src="js\/26-monitor-apply\.js\?v=20260907g/.test(html) && /src="js\/10-app-core\.js\?v=20260907[a-c]/.test(html), 'O5 版本號 bump');

/* ══════════ P. v15.13 部門頁 3 大卡自行調序（本組總主任以上） ══════════ */
ok(j10.includes("groupCardOrder(groupName)") && j10.includes("const DEF=['info','detail','stats']") && j10.includes('grp_card_order_'),
  'P1 卡次序存 localStorage（按活動＋組），預設 資訊→詳細→統計');
ok(j10.includes("ROLE_HIERARCHY[this.currentUser?.role]||0") && j10.includes('>=40') && j10.includes('isAllGroupViewer()'),
  'P2 調序權限＝管理員／執副以上／本組總主任以上');
ok(j10.includes("applyGroupCardOrder(groupName)") && j10.includes('data-grp-card') && j10.includes('box.appendChild(el)'),
  'P3 重排用 appendChild 搬節點（唔使全版重繪，慳電）');
ok(j10.includes('moveGroupCard(groupName, key, dir)') && j10.includes('saveGroupCardOrder(groupName, order)') && j10.includes('呢部機'),
  'P4 調序即存即用；文案講明只影響呢部機（將來全組統一要搬後端）');
ok(j10.includes('id="group-apps-cards"') && j10.includes('querySelectorAll(\'.grp-card-ctl\').forEach(n=>n.remove())'),
  'P5 卡區獨立容器＋調序欄重建防重複');
ok(html.includes('.grp-card-ctl{') && /src="js\/10-app-core\.js\?v=20260907[b-c]/.test(html), 'P6 調序欄 CSS＋版本號 bump');

/* ══════════ Q. v15.14 實戰分層：管理區摺合＋慣用 tab 記憶 ══════════ */
const j41 = read('js/41-roster-lists.js');
const j40 = read('js/40-souvenir-stamps.js');
ok(j41.includes('opsAdminOpen(zone)') && j41.includes("matchMedia('(max-width:768px)')") && j41.includes('ops_admin_'),
  'Q1 管理區摺合 helper：手機預設收、電腦預設開、每格 localStorage 記住');
ok(j41.includes('class="ops-admin"') && j41.includes("opsAdminSave('roster_${key}'"),
  'Q2 點名面板：上載/匯出/列印/同步/說明/附件 入 ⚙️ 名單管理摺合格');
ok(j41.indexOf('ops-admin-sum') < j41.indexOf('fa-clipboard-check'),
  'Q3 摺合格喺 TICK 卡之前（收埋時點名卡貼頂）');
ok(j40.includes("opsAdminSave('stamp_${scope}'") && j40.includes('ops-admin-tools'),
  'Q4 派章面板：說明＋匯入/匯出/列印/清除 入摺合格');
ok(j40.includes('stamp-search-${scope}') && j40.includes('stamp-filter-${scope}') && j40.includes('data-stamp-save-btn'),
  'Q5b 戰鬥嘢全留面：搜尋／攤位下拉／篩選／💾儲存');
const tbStart=j40.indexOf('roster-toolbar'); const tbEnd=j40.indexOf('id="stamp-print-');
const tb=j40.slice(tbStart,tbEnd);
ok(!tb.includes('匯入 EXCEL') && !tb.includes('列印名單') && !tb.includes('清除匯入名單'),
  'Q6 管理掣已搬離戰鬥工具列');
ok(j10.includes("grp_last_tab_") && j10.includes('記住本組慣用 tab'),
  'Q7 部門頁記住本組上次慣用 tab（重入直達）');
ok(/src="js\/40-souvenir-stamps\.js\?v=20260907a/.test(html) && /src="js\/41-roster-lists\.js\?v=20260907a/.test(html) && /src="js\/10-app-core\.js\?v=20260907c/.test(html),
  'Q8 三個 js 版本號 bump');

console.log('V15_MOBILE_ROLLCALL_OK (' + n + ' checks)');
