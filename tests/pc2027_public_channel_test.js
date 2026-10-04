#!/usr/bin/env node
'use strict';
/**
 * 階段 1（2026-10-04）：「公眾頻道 2027 形態示範」卡片回歸測試
 *  ① data/mock_demo.json 有 public_channel_2027：公眾入口＝須知分眾七類＋八個分頁數據齊全
 *  ② DASH_CARD_DEFS 有 public_channel_demo 卡：公開（minLevel 0）＋ requiresData
 *  ③ 委員「一頁睇晒」（tabs 模式）：8 個分頁全部 render 到，含關鍵內容
 *  ④ requiresData 過濾＋app-core 接線：冇 public_channel_2027 嘅活動（isd_2026／isd_2027）→ 卡片不顯示
 *  ⑤ 身份入口選擇頁：6 個入口＋專屬連結（?pub=xxx）提示
 *  ⑥ 分眾版面：每類受眾見到唔同內容（旅團=報名+PT/46、嘉賓=接待安排冇名額費用、訪客=攤位+捐贈、優異旅團=彩帶、得主=貝登堡、UG=專櫃）
 *  ⑦ ?pub= 深連結：帶參數開啟即入該受眾版面（生產版專屬 QR 機制）
 *  ⑧ 公眾 landing：mock_demo 未登入 → 一進APP就是公眾頻道（儀表板組件／底部導覽收起；登入後回復正常）
 *  ⑨ 工作人員閘口：頁尾隱藏入口 → 4位密碼（錯=拒絕、啱=登入工作人員）＋籌委帳密分流
 *  ⑩ 報到 QR（公眾端）：每個報名一個獨有 token，自己版面見自己 QR＋人數餐盒
 *  ⑪ 報到站（工作人員端）：輸入／模擬掃描 token → 即見旅團人數餐盒 → 確認報到→紀錄
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

/* ── ① 數據齊全 ── */
const mock = JSON.parse(read('data/mock_demo.json'));
const pc = mock.public_channel_2027;
ok(pc, '① mock_demo.json 有 public_channel_2027');
ok(pc.audiences && pc.audiences.length === 7, '① 公眾入口＝須知分眾七類');
ok(['guest', 'troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].every(id => pc.audiences.some(a => a.id === id)), '① 七類 id 齊：嘉賓/旅團/優異旅團獲獎/步操隊伍/其他制服團體/支部最高獎勵/成人獎勵');
ok(pc.audiences.every(a => Array.isArray(a.sections) && a.sections.length > 0), '① 每個受眾有內容組合');
ok(pc.audiences.every(a => ['schedule', 'arrival', 'qr'].every(x => a.sections.includes(x))), '① 每類都有：時間表＋報到地圖＋報到 QR');
ok(pc.audiences.filter(a => a.guide).every(a => a.guide.every(k => pc.guides[k])), '① 每類嘅須知都喺七類須知數據入面');
ok(pc.banner_guest && pc.banner_guest.rows.length === 5, '① 嘉賓版基本盤（接待安排 5 行）');
ok(pc.section_labels && Object.keys(pc.section_labels).length === 11, '① 分節標籤 11 個');
ok(Object.keys(pc.schedules).length === 7 && ['guest', 'troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].every(id => (pc.schedules[id].items || []).length >= 6), '① 每類有專屬時間表（7 份・各至少 6 項）');
ok(Object.keys(pc.arrivals).length === 7 && ['guest', 'troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].every(id => (pc.arrivals[id].checkin || []).length === 2), '① 每類有專屬報到地點＋時間（7 份）');
ok(pc.banner && pc.banner.event_name === '2027 港島童軍繽紛日', '① banner：2027 港島童軍繽紛日');
ok(pc.transport && pc.transport.items.length === 5, '① 交通與入場 5 項');
ok(pc.program && pc.program.items.length >= 6, '① 當日程序 6 項');
ok(pc.booths && pc.booths.list.length === 33, '① 攤位 33 個');
ok(pc.apply_forms && pc.apply_forms.length === 8, '① 八大報名表');
ok(Object.keys(pc.guides).length === 7, '① 須知分眾 7 類');
ok(pc.manual && pc.manual.tabs.length === 15, '① 執行手冊 15 分頁');
ok(pc.manual.participants.rows.length === 31, '① 參加旅團 31 旅');
const meritTotal = Object.values(pc.manual.merit.byArea).reduce((a, b) => a + b.length, 0);
ok(meritTotal === 188, '① 優異旅團 188 團次');

/* ── 環境：config 定義＋新模組方法＋stub DOM ── */
const cfgSrc = read('js/00-config.js');
const orderSrc = cfgSrc.match(/const PUBLIC_CARD_ORDER=\[[^\]]+\];/)[0];
const defsSrc = cfgSrc.match(/const DASH_CARD_DEFS=\[[\s\S]*?\n\];/)[0];
const escSrc = cfgSrc.match(/function escapeHtml\(s\)\{.*?\}\n/s)[0].split('\n')[0];
const pcSrc = read('js/44-public-channel.js');
const inner = pcSrc.slice(pcSrc.indexOf('Object.assign(ScoutEventApp.prototype,{') + 'Object.assign(ScoutEventApp.prototype,{'.length, pcSrc.lastIndexOf('});'));
const stripCommaLines = s => s.replace(/^[ \t]*,[ \t]*$/gm, '');
const containers = {};
const mkEl = () => ({ innerHTML: '', textContent: '', style: {}, classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } } });
const toasts = [];
const ctx = {
  console,
  setTimeout: () => 0,
  showToast: (m, t) => toasts.push([m, t]),
  document: { getElementById: id => containers[id] || (containers[id] = mkEl()) }
};
const ScoutEventApp = vm.runInNewContext(`
${escSrc}
${orderSrc}
${defsSrc}
class ScoutEventApp{}
Object.assign(ScoutEventApp.prototype,{ ${stripCommaLines(inner)} });
ScoutEventApp;
`, ctx);
const app = new ScoutEventApp();
app.eventData = { public_channel_2027: pc };
const render = () => { containers['module-content'] = mkEl(); app.renderPublicChannelDemo(); return containers['module-content'].innerHTML; };

const visible = ev => defs.filter(d => d.minLevel <= 0 && !d.hideOnDashboard && (!d.requiresData || (ev && ev[d.requiresData])));

/* ── ② 卡片定義 ── */
const defs = vm.runInNewContext('DASH_CARD_DEFS', ctx);
const card = defs.find(d => d.id === 'public_channel_demo');
ok(card, '② DASH_CARD_DEFS 有 public_channel_demo');
ok(card.minLevel === 0, '② 卡片公開（minLevel 0）');
ok(card.requiresData === 'public_channel_2027', '② requiresData＝public_channel_2027');
const order = vm.runInNewContext('PUBLIC_CARD_ORDER', ctx);
ok(order[0] === 'public_channel_demo', '② 排公開資料第一位（mock_demo 內）');

/* ── ⑤ 身份入口選擇頁（預設第一屏） ── */
let html = render();
ok(html.includes('你係邊類人'), '⑤ 入口頁有「你係邊類人」');
ok(['嘉賓', '旅團', '優異旅團獲獎', '步操隊伍', '其他制服團體', '支部最高獎勵獲獎人士', '成人獎勵獲獎人士'].every(n => html.includes(n)), '⑤ 入口卡：七類齊晒（須知分眾七類）');
ok((html.match(/\?pub=/g) || []).length >= 7, '⑤ 每個入口有專屬連結提示（?pub=）');
ok(html.includes('一頁睇晒'), '⑤ 底部有委員預覽入口');

/* ── ⑥ 分眾版面：七類各有各嘅時間表＋報到地點＋須知＋報名 ── */
app.pcDemoPickAudience('guest'); html = render();
ok(html.includes('你的時間表') && html.includes('大會車開出') && html.includes('15:00'), '⑥ 嘉賓：自己時間表（大會車去回程）');
ok(html.includes('你的報到地點') && html.includes('莫榮大樓地下接待處'), '⑥ 嘉賓：報到＝莫榮大樓接待處');
ok(html.includes('嘉賓專屬安排'), '⑥ 嘉賓：接待安排做基本盤');
ok(html.includes('嘉賓報名') && html.includes('立即報名'), '⑥ 嘉賓：嘉賓報名做主角');
ok(!html.includes('名額（先到先得）'), '⑥ 嘉賓：唔講名額費用（獲邀人士）');

app.pcDemoPickAudience('troop'); html = render();
ok(html.includes('按報名時段報到') && html.includes('集印換紀念章'), '⑥ 旅團：自己時間表（報到時段＋集印）');
ok(html.includes('有蓋操場報到處（東閘入）'), '⑥ 旅團：報到＝有蓋操場（東閘入）');
ok(html.includes('旅遊巴'), '⑥ 旅團：專屬交通提示（旅遊巴）');
ok(html.includes('PT/46') && html.includes('普通旅團・須知'), '⑥ 旅團：普通旅團版須知');

app.pcDemoPickAudience('merit'); html = render();
ok(html.includes('10:15') && html.includes('排位'), '⑥ 優異旅團獲獎：自己時間表（10:15 排位）');
ok(html.includes('優異旅團櫃位（核對名單・領取彩帶）'), '⑥ 優異旅團獲獎：報到＝優異旅團櫃位（核對名單・領彩帶）');
ok(html.includes('大操場後方排位區（按區會）'), '⑥ 優異旅團獲獎：報到後排位（後方排位區）');
ok(html.includes('彩帶') && html.includes('優異旅團・須知') && !html.includes('普通旅團・須知'), '⑥ 優異旅團獲獎：只見自己版須知');

app.pcDemoPickAudience('march'); html = render();
ok(html.includes('08:00') && html.includes('綵排') && !html.includes('07:45'), '⑥ 步操隊伍：自己時間表（08:00 綵排，唔係 07:45）');
ok(html.includes('大操場指定位置（依旗幟）'), '⑥ 步操隊伍：報到＝大操場依旗幟');
ok(html.includes('指揮官檢閱'), '⑥ 步操隊伍：檢閱安排');
ok(!html.includes('彩帶'), '⑥ 步操隊伍：唔會見到優異旅團須知');

app.pcDemoPickAudience('ug'); html = render();
ok(html.includes('有蓋操場報到處・UG 專櫃'), '⑥ 其他制服團體：報到＝UG 專櫃');
ok(html.includes('穿梭巴士'), '⑥ 其他制服團體：專屬交通提示（穿梭巴士）');
ok(html.includes('其他制服團體報名') && html.includes('NGO 報名'), '⑥ 其他制服團體：兩個報名入口');

app.pcDemoPickAudience('awardee_section'); html = render();
ok(html.includes('總領袖獎章 → 榮譽童軍獎章 → 貝登堡獎章'), '⑥ 支部最高獎勵：頒獎次序時間表');
ok(html.includes('大操場左側後台排位（依獎章分組）'), '⑥ 支部最高獎勵：報到＝後台（依獎章分組）');
ok(html.includes('親友觀禮區'), '⑥ 支部最高獎勵：親友觀禮提示');
ok(!html.includes('長期服務獎章'), '⑥ 支部最高獎勵：唔會見到成人獎勵內容');

app.pcDemoPickAudience('awardee_adult'); html = render();
ok(html.includes('覆誓') && html.includes('唱名序'), '⑥ 成人獎勵：覆誓＋唱名時間表');
ok(html.includes('大操場左側後台排位（依獎項分組）'), '⑥ 成人獎勵：報到＝後台（依獎項分組）');
ok(html.includes('副會長'), '⑥ 成人獎勵：一星／三星由副會長頒發');
ok(!html.includes('貝登堡獎章'), '⑥ 成人獎勵：唔會見到支部獎章內容');
ok(html.includes('切換身份'), '⑥ 各版面有「切換身份」');

/* ── ⑦ ?pub= 深連結（生產版專屬 QR 機制） ── */
ctx.location = { search: '?pub=merit' };
ctx.URLSearchParams = URLSearchParams;
const app2 = new ScoutEventApp();
app2.eventData = { public_channel_2027: pc };
containers['module-content'] = mkEl();
app2.renderPublicChannelDemo();
ok(app2.pcDemoMode === 'audience' && app2.pcDemoAudience === 'merit', '⑦ ?pub=merit 開啟即入優異旅團版面');
ok(containers['module-content'].innerHTML.includes('彩帶'), '⑦ 深連結內容正確');

/* ── ⑩ 報到 QR（公眾端：自己版面見自己 QR） ── */
const cd = pc.checkin_demo || {};
ok(cd.entries && cd.entries.length >= 40, '⑩ checkin_demo：31 旅團＋各類示範＝' + (cd.entries || []).length + ' 個報到 token');
ok(new Set((cd.entries || []).map(e => e.token)).size === (cd.entries || []).length, '⑩ token 全部唯一');
ok(Object.keys(cd.audience_kinds || {}).length === 7, '⑩ 七類各自對應一種報到 token');
const troopEntries = cd.entries.filter(e => e.kind === '旅團');
ok(troopEntries.length === 31, '⑩ 31 個旅團 token（T001–T031，2026 真實名單）');
app.pcDemoPickAudience('troop'); html = render();
ok(html.includes('你的報到 QR') && html.includes('報名編號') && html.includes('代訂餐盒'), '⑩ 旅團版面：報到 QR＋人數＋餐盒');
ok(html.includes(troopEntries[0].token) && html.includes(troopEntries[0].name), '⑩ 顯示第一個旅團（' + troopEntries[0].token + ' ' + troopEntries[0].name + '）');
ok((html.match(/data-pcqr-fallback|<svg/g) || []).length >= 1, '⑩ QR 圖有渲染（VM 環境＝佔位，瀏覽器＝真 QR）');
app.pcQrCycle('troop'); html = render();
ok(html.includes(troopEntries[1].token), '⑩ 切換示範旅團 → 第二個 token');
app.pcDemoPickAudience('guest'); html = render();
ok(html.includes('你的報到 QR') && html.includes('G001'), '⑩ 嘉賓版面：個人報到 QR（G001）');
app.pcDemoPickAudience('awardee_adult'); html = render();
ok(html.includes('你的報到 QR') && html.includes('需覆誓'), '⑩ 成人獎勵版面：個人 QR＋覆誓備註');

/* ── ⑪ 報到站（工作人員端：一 DO 即知咩旅團・幾多人・有無訂飯盒） ── */
const csCard = defs.find(d => d.id === 'checkin_station');
ok(csCard && csCard.minLevel === 20 && csCard.requiresData === 'public_channel_2027', '⑪ 報到站卡：工作人員等級（minLevel 20）＋requiresData 隔離');
ok(!visible({ public_channel_2027: pc }).some(d => d.id === 'checkin_station'), '⑪ 報到站唔會喺公眾卡片區出現');
ok(!visible({}).some(d => d.id === 'checkin_station'), '⑪ 2026／2027 完全冇報到站（requiresData）');
app.currentUser = { user_id: '陳子明', role: 'staff', mock_admin: true };
app.pcCheckinFound = null; app.pcCheckinArrivals = [];
containers['module-content'] = mkEl();
app.renderCheckinStation();
let st = containers['module-content'].innerHTML;
ok(st.includes('掃描／輸入報到編號') && st.includes('模擬掃描'), '⑪ 報到站：掃描／輸入＋模擬掃描');
ok(st.includes('今日報到紀錄') && st.includes('0/' + cd.entries.length + ' 已報到'), '⑪ 報到站：報到紀錄（0/' + cd.entries.length + '）');
app.pcCheckinLookup('PC2027:T001');
st = containers['module-content'].innerHTML;
ok(app.pcCheckinFound && app.pcCheckinFound.token === 'T001', '⑪ 輸入 QR 內容（PC2027:T001）→ 揾到 T001');
ok(st.includes(troopEntries[0].name) && st.includes('確認報到'), '⑪ 即見旅團名＋確認報到掣');
ok(st.includes('人數') && st.includes('代訂餐盒'), '⑪ 即見人數＋餐盒');
app.pcCheckinConfirm();
st = containers['module-content'].innerHTML;
ok((app.pcCheckinArrivals || []).length === 1 && st.includes('1/' + cd.entries.length + ' 已報到'), '⑪ 確認報到 → 紀錄 1/' + cd.entries.length);
ok(st.includes('✓'), '⑪ 報到紀錄有 ✓ 標記');
const toastsBefore = toasts.length;
app.pcCheckinLookup('ZZZ999');
ok(toasts.length > toastsBefore && toasts[toasts.length - 1][1] === 'error', '⑪ 搵唔到編號 → 錯誤提示（唔會靜靜地失敗）');
app.pcCheckinSimulate();
ok(app.pcCheckinFound && !(app.pcCheckinArrivals || []).some(a => a.token === app.pcCheckinFound.token), '⑪ 模擬掃描 → 抽中一個未報到單位');
app.currentUser = null;

/* ── ⑧ 公眾 landing：一進APP就是公眾頻道（mock_demo・未登入） ── */
app.currentUser = null; app.pcLandAudience = '';
ok(app.pcPublicLandingActive() === true, '⑧ mock_demo 未登入 → 公眾 landing 生效');
app.renderPublicLanding();
let land = containers['public-landing'].innerHTML;
ok(land.includes('你係邊類人'), '⑧ landing：身份入口選擇');
ok(land.includes('步操隊伍') && land.includes('支部最高獎勵獲獎人士') && land.includes('成人獎勵獲獎人士'), '⑧ landing：七類入口齊晒');
ok(land.includes('2027 港島童軍繽紛日'), '⑧ landing：活動名＋日期時間地點');
ok(land.includes('工作人員入口'), '⑧ landing：頁尾隱藏工作人員入口');
ok(!land.includes('一頁睇晒'), '⑧ landing：公眾見唔到委員預覽連結');
ok(containers['dash-hero'].classList.contains('hidden') && containers['simple-card-panel'].classList.contains('hidden'), '⑧ landing：儀表板組件（含會議預告）收起');
ok(containers['bottom-nav'].style.display === 'none', '⑧ landing：底部導覽（工作人員功能）隱藏');
app.pcLandPick('guest'); land = containers['public-landing'].innerHTML;
ok(land.includes('嘉賓專屬安排') && land.includes('切換身份'), '⑧ landing：揀嘉賓 → 專屬版面');
app.pcLandBack();
ok(containers['public-landing'].innerHTML.includes('你係邊類人'), '⑧ landing：切換身份返入口選擇');
app.currentUser = { user_id: '陳子明', name: '陳子明', role: 'staff' };
ok(app.pcPublicLandingActive() === false, '⑧ 已登入 → landing 唔生效（正常儀表板）');
app.currentUser = null;

/* ── ⑨ 工作人員閘口：4位密碼＋籌委帳密（同一入口分流） ── */
app.pcStaffGate();
ok(!containers['modal-staff-gate'].classList.contains('hidden'), '⑨ 閘口 modal 打開');
ok((containers['pc-pin-dots'].innerHTML.match(/rounded-full/g) || []).length === 4, '⑨ PIN 4 點顯示');
'9999'.split('').forEach(d => app.pcPinPress(d));
app.pcPinCheck();
ok(toasts.length >= 1 && toasts[toasts.length - 1][1] === 'error', '⑨ 錯密碼 → 錯誤提示');
ok(!app.currentUser, '⑨ 錯密碼 → 唔會登入');
ok(app.pcPinBuf === '', '⑨ 錯密碼 → 輸入清空');
app.demoLogin = uid => { app.currentUser = { user_id: uid, name: uid, role: 'staff', mock_admin: true }; };
'2027'.split('').forEach(d => app.pcPinPress(d));
app.pcPinCheck();
ok(app.currentUser && app.currentUser.user_id === '陳子明', '⑨ 正確 PIN（2027）→ 登入工作人員（陳子明）');
ok(containers['modal-staff-gate'].classList.contains('hidden'), '⑨ 登入後閘口自動關閉');
app.currentUser = null;
let loginOpened = false;
app.openLoginModal = () => { loginOpened = true; };
app.pcCommitteeLogin();
ok(loginOpened && containers['modal-staff-gate'].classList.contains('hidden'), '⑨ 「籌委登入（帳號密碼）」→ 開現有帳密登入');

/* ── ③ 委員一頁睇晒（tabs 模式） ── */
app.pcDemoOpenTabs();
for (const t of ['home', 'transport', 'program', 'booths', 'apply', 'guide', 'help', 'manual']) {
  app.openPublicChannelTab(t);
  ok(containers['module-content'].innerHTML.length > 400, `③ 分頁 ${t} render 有內容`);
}
app.openPublicChannelTab('home');
ok(containers['module-content'].innerHTML.includes('2027 港島童軍繽紛日'), '③ 基本盤有活動名');
ok(containers['module-content'].innerHTML.includes('惡劣天氣安排'), '③ 基本盤有惡劣天氣安排');
app.openPublicChannelTab('booths');
ok(containers['module-content'].innerHTML.includes('A01'), '③ 攤位列表有 A01');
app.pcDemoZone = 'F'; app.renderPublicChannelDemo();
ok(containers['module-content'].innerHTML.includes('F06') && !containers['module-content'].innerHTML.includes('>A01<'), '③ 攤位 F 區篩選生效');
app.pcDemoZone = 'all';
app.openPublicChannelTab('manual');
ok(containers['module-content'].innerHTML.includes('合共 31 團'), '③ 參加旅團名單合計');
ok(containers['module-content'].innerHTML.includes('188 團次'), '③ 優異旅團名單總數');
ok(containers['module-content'].innerHTML.includes('1,016'), '③ 總人數 1,016');
ok(!containers['module-content'].innerHTML.includes('9722 9989'), '③ 公眾版冇領隊電話');

/* ── ④ requiresData 過濾＋接線 ── */
ok(visible({ public_channel_2027: pc }).some(d => d.id === 'public_channel_demo'), '④ mock_demo（有數據）→ 卡片顯示');
ok(!visible({}).some(d => d.id === 'public_channel_demo'), '④ isd_2026／isd_2027（冇 public_channel_2027）→ 卡片不顯示');
ok(visible({}).filter(d => !d.requiresData).length === 4, '④ 其餘 4 張公開卡不受影響');
const coreSrc = read('js/10-app-core.js');
ok(coreSrc.includes("(!d.requiresData||(this.eventData&&this.eventData[d.requiresData]))"), '④ renderRoleCards 過濾器已接入 requiresData');
ok(coreSrc.includes("if(mod==='public_channel_demo'){this.renderPublicChannelDemo(); return;}"), '④ renderModuleContent 已接入示範模組');
ok(coreSrc.includes("public_channel_demo:'公眾頻道 2027（示範）'"), '④ openModule 標題已接入');
ok(coreSrc.includes("checkin_station:'報到站（示範）'") && coreSrc.includes('renderCheckinStation(); return') && coreSrc.includes("||key==='checkin_station'"), '④ 報到站：標題＋dispatch＋actions 三個接線位');
ok(read('index.html').includes('js/vendor/qrcode.min.js?v='), '④ QR 庫（本地 vendor）已掛載');
ok(coreSrc.includes('pcPublicLandingActive') && coreSrc.includes('renderPublicLanding'), '④ applyDashboardMode 已接入公眾 landing 分流');
const idxSrc = read('index.html');
ok(idxSrc.includes('id="public-landing"') && idxSrc.includes('id="modal-staff-gate"') && idxSrc.includes('id="dash-hero"'), '④ index.html：landing 容器＋工作人員閘口 modal＋dash-hero');

console.log(`公眾頻道 2027 分眾入口＋landing＋工作人員閘口測試通過（${n} 項）｜audiences 7・booths 33・participants 31・merit ${meritTotal}`);
