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
 *  ⑩ 報到 QR（公眾端）：只有旅團（團體單位）有 token；個人／隊伍＝工作人員按名單點名
 *  ⑫ 場地示意圖：每類人嘅路線（虛線①②③）＋報到點（📍脈衝）標喺圖上（生產版＝每類一張標註地圖）
 *  ⑬ 七類通知書＝秘書正式信做源頭（資料夾制：原名原檔掉入、系統攞最新）＋每類入口有下載掣
 *  ⑭ 源頭上傳中心（工作人員前端）：7 通知書＋7 地圖上傳掣——撳掣揀檔案，直入後端指定位置
 *  ⑮ 嘉賓接待站：102 位真實 2026 嘉賓——搜尋／分類／頒獎台・大會車・茶聚篩選／接待報到＋最後一分鐘變動實錄
 *  ⑯ 八大報名表（階段2）：免登入提交→申請編號；旅團報名→T 編號・QR・人數・餐盒一條血脈；報名總覽＋名額着燈
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
ok(pc.audiences.every(a => ['schedule', 'arrival'].every(x => a.sections.includes(x))), '① 每類都有：時間表＋報到地圖');
ok(pc.audiences.filter(a => a.sections.includes('qr')).length === 1 && pc.audiences.find(a => a.sections.includes('qr')).id === 'troop', '① 報到 QR 只有旅團（團體單位）');
ok(pc.audiences.filter(a => a.guide).every(a => a.guide.every(k => pc.guides[k])), '① 每類嘅須知都喺七類須知數據入面');
ok(pc.banner_guest && pc.banner_guest.rows.length === 5, '① 嘉賓版基本盤（接待安排 5 行）');
ok(pc.notices && Object.keys(pc.notices).length === 7 && Object.values(pc.notices).every(v => v.startsWith('02_通知書/') && v.endsWith('/')), '① 七類通知書：一類一個資料夾（原名原檔掉入就得）');
ok(!!pc.notice_rule && pc.notice_rule.includes('最後修改'), '① 通知書規則：系統攞最後修改嗰份做最新');
ok(new Set(Object.values(pc.notices)).size === 7, '① 七份通知書檔名全部唔同');
ok(pc.section_labels && Object.keys(pc.section_labels).length === 11, '① 分節標籤 11 個');
ok(Object.keys(pc.schedules).length === 7 && ['guest', 'troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].every(id => (pc.schedules[id].items || []).length >= 6), '① 每類有專屬時間表（7 份・各至少 6 項）');
ok(Object.keys(pc.arrivals).length === 7 && ['guest', 'troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].every(id => (pc.arrivals[id].checkin || []).length === 2), '① 每類有專屬報到地點＋時間（7 份）');
ok(pc.venue_map && pc.venue_map.nodes.length === 10, '① 場地示意圖 10 節點（東閘／報到處／櫃位／大操場／莫榮大樓…）');
{
  const nodeIds = new Set((pc.venue_map.nodes || []).map(n => n.id));
  ok(Object.values(pc.arrivals).every(ar => (ar.route || []).length >= 2 && ar.route.every(id => nodeIds.has(id)) && nodeIds.has(ar.pin_at)), '① 每類有路線（route）＋報到點（pin_at），全部對應示意圖節點');
}
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
ok(!html.includes('優異旅團・須知'), '⑥ 步操隊伍：唔會見到優異旅團版須知（場地示意圖上嘅櫃位標示唔算）');

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

/* ── ⑩ 報到 QR（只有旅團＝團體單位；個人／隊伍＝工作人員按名單點名） ── */
const cd = pc.checkin_demo || {};
const troopEntries = cd.entries.filter(e => e.kind === '旅團');
ok(cd.entries && cd.entries.length === 31 && troopEntries.length === 31, '⑩ checkin_demo：31 個旅團 token（T001–T031，2026 真實名單）——只有旅團');
ok(new Set(cd.entries.map(e => e.token)).size === 31, '⑩ token 全部唯一');
app.pcDemoPickAudience('troop'); html = render();
ok(html.includes('你的報到 QR') && html.includes('報名編號') && html.includes('代訂餐盒'), '⑩ 旅團版面：報到 QR＋人數＋餐盒');
ok(html.includes(troopEntries[0].token) && html.includes(troopEntries[0].name), '⑩ 顯示第一個旅團（' + troopEntries[0].token + ' ' + troopEntries[0].name + '）');
ok((html.match(/data-pcqr-fallback|<svg/g) || []).length >= 1, '⑩ QR 圖有渲染（VM＝佔位，瀏覽器＝真 QR）');
app.pcQrCycle('troop'); html = render();
ok(html.includes(troopEntries[1].token), '⑩ 切換示範旅團 → 第二個 token');
['guest', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].forEach(id => {
  app.pcDemoPickAudience(id); const h = render();
  ok(!h.includes('你的報到 QR'), '⑩ ' + id + '：冇 QR（個人／隊伍＝工作人員按名單點名）');
});
app.pcDemoPickAudience('guest'); html = render();
ok(html.includes('向接待處職員報姓名即可'), '⑩ 嘉賓：點名方式提示（報姓名即可）');
app.pcDemoPickAudience('awardee_adult'); html = render();
ok(html.includes('需覆誓者 10:55 前綵排'), '⑩ 成人獎勵：點名提示（含覆誓提醒）');
app.pcDemoPickAudience('merit'); html = render();
ok(html.includes('核對名單＋領彩帶（工作人員按名單點名）'), '⑩ 優異旅團：櫃位點名提示');

/* ── ⑫ 場地示意圖：每類人嘅路線＋報到點標喺圖上（示意就好） ── */
app.pcDemoPickAudience('troop'); html = render();
ok(html.includes('你要去嘅地方（示意圖）'), '⑫ 旅團：示意圖卡');
ok(html.includes('pc-map-pin') && html.includes('你喺呢度報到'), '⑫ 旅團：📍紅點脈衝標記報到點');
ok(html.includes('有蓋操場・報到處') && html.includes('東閘'), '⑫ 旅團：路線節點（東閘→報到處）');
ok(html.includes('為不同人士製作幾張唔同嘅標註地圖'), '⑫ 註明生產版：籌委提供源點→每類人士一張標註地圖');
app.pcDemoPickAudience('guest'); html = render();
ok(html.includes('pc-map-pin') && html.includes('莫榮大樓'), '⑫ 嘉賓：📍標喺莫榮大樓');
app.pcDemoPickAudience('march'); html = render();
ok(html.includes('步操集結位置') && html.includes('依旗幟'), '⑫ 步操：集結位置標示');
app.pcDemoPickAudience('awardee_section'); html = render();
ok(html.includes('後台排位') && html.includes('大操場左側'), '⑫ 支部得主：後台排位標示');

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

/* ── ⑬ 七類通知書：每類入口有下載掣（出口示範） ── */
['guest', 'troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].forEach(id => {
  app.pcDemoPickAudience(id); const h = render();
  ok(h.includes('你的正式通知書（PDF）') && h.includes(pc.notices[id]), '⑬ ' + id + '：正式通知書掣＋指向資料夾 ' + pc.notices[id]);
});
app.pcDemoPickAudience('guest'); html = render();
ok(html.includes('原名原檔唔使改名') && html.includes('攞最新'), '⑬ 講明機制：原名原檔掉入・系統攞最新（唔生成 PDF，讀秘書出嗰封）');

/* ── ⑭ 源頭上傳中心：見掣→揀檔案→完成（連 Drive 都唔使入） ── */
const ucCard = defs.find(d => d.id === 'upload_center');
ok(ucCard && ucCard.minLevel === 20 && ucCard.requiresData === 'public_channel_2027', '⑭ 源頭上傳中心卡：工作人員等級＋requiresData 隔離');
ok(!visible({ public_channel_2027: pc }).some(d => d.id === 'upload_center') && !visible({}).some(d => d.id === 'upload_center'), '⑭ 上傳中心唔會喺公眾／2026／2027 出現');
ok((pc.upload_slots || []).length === 3 && pc.upload_slots.filter(g => g.group !== 'seating').every(g => (g.items || []).length === 7), '⑭ 上傳入口：7 通知書＋7 地圖＋座位表（3 組）');
app.currentUser = { user_id: '陳子明', role: 'staff', mock_admin: true };
containers['module-content'] = mkEl();
app.renderUploadCenter();
let uc = containers['module-content'].innerHTML;
ok(uc.includes('七類通知書') && uc.includes('七類場地指示圖'), '⑭ 兩組入口（通知書＋地圖）');
ok((uc.match(/📤 上傳檔案/g) || []).length === 15, '⑭ 15 個上傳掣（7 通知書＋7 地圖＋1 座位表）');
ok(uc.includes('ISD2027/02_通知書/02_旅團/') && uc.includes('ISD2027/04_場地/場地指示圖（公眾版）/01_嘉賓/') && uc.includes('ISD2027/04_場地/座位表/'), '⑭ 每個掣標明後端 Drive 指定位置（含座位表）');
ok(uc.includes('未上傳'), '⑭ 未上傳狀態顯示');
ok(app.pcUploadSlot('notices', 'troop').path === '02_通知書/02_旅團', '⑭ slot 對應後端路徑');
app.pcUploadFile('notices', 'troop', { files: [{ name: '旅團通知書_final.pdf', size: 12345 }], value: '' });
uc = containers['module-content'].innerHTML;
ok((app.pcUploadState || {})['notices:troop'] && app.pcUploadState['notices:troop'].file === '旅團通知書_final.pdf', '⑭ 上傳 → 記錄檔名＋時間（原名原檔照收）');
ok(toasts[toasts.length - 1][1] === 'success' && toasts[toasts.length - 1][0].includes('ISD2027/02_通知書/02_旅團'), '⑭ 上傳成功提示含後端位置');
ok(uc.includes('✓ 已上傳') && uc.includes('旅團通知書_final.pdf'), '⑭ 該掣變「✓ 已上傳」＋顯示最新檔案');
app.pcDemoPickAudience('troop'); html = render();
ok(html.includes('最新版本：旅團通知書_final.pdf'), '⑭ 連動出口：公眾旅團入口即時顯示最新通知書版本');
app.currentUser = null;

/* ── ⑮ 嘉賓接待站：最麻煩嘅一群——102 位・逐位唔同安排 ── */
const grCard = defs.find(d => d.id === 'guest_reception');
ok(grCard && grCard.minLevel === 20 && grCard.requiresData === 'public_channel_2027', '⑮ 嘉賓接待站卡：工作人員等級＋requiresData 隔離');
ok(!visible({ public_channel_2027: pc }).some(d => d.id === 'guest_reception') && !visible({}).some(d => d.id === 'guest_reception'), '⑮ 接待站唔會喺公眾／2026／2027 出現');
const G = pc.guests_rows || [];
ok(G.length === 102, '⑮ 真實 2026 嘉賓名單：102 位（跳號 15 已修正為連續數據）');
ok(G.every(g => g.length === 11 && g[2] && g[3]), '⑮ 每位欄位齊全：[序號,組別,姓名,職銜,典禮①②,茶聚,車,角色,車牌,備注]');
const gt = { c1: 0, c2: 0, tea: 0, bus: 0, present: 0, awardee: 0 };
G.forEach(g => { gt.c1 += g[4]; gt.c2 += g[5]; gt.tea += g[6]; gt.bus += g[7]; if (g[8] === '頒獎') gt.present++; if (g[8] === 'AWARD') gt.awardee++; });
ok(gt.c1 === 82 && gt.c2 === 96 && gt.tea === 94 && gt.bus === 4, '⑮ 合計實時計：典①82・典②96・茶聚94・大會車4（2026 檔案手寫 97/95 係錯嘅）');
ok(gt.present === 6 && gt.awardee === 11, '⑮ 頒獎台 6 位・獲獎出席 11 位');
app.currentUser = { user_id: '陳子明', role: 'staff', mock_admin: true };
containers['module-content'] = mkEl();
app.renderGuestReception();
let gr = containers['module-content'].innerHTML;
ok(gr.includes('區永樑先生') && gr.includes('102') && gr.includes('96/94'.replace('96/94','人手合計冇人更新')), '⑮ 渲染全名單＋2026 合計病徵說明');
ok(gr.includes('搜尋姓名／職銜／車牌／備注'), '⑮ 搜尋框（姓名/職銜/車牌/備注）');
ok(gr.includes('活動當日仲改緊') && gr.includes('V8 Final') && gr.includes('座位表'), '⑮ 最後一分鐘變動實錄卡（02.10 合計錯→03.10 加人→04.10 座位表 V8）');
ok(gr.includes('王偉傑') && gr.includes('胡廖可儀') && gr.includes('區Sir師母'), '⑮ 實錄卡記錄 03.10 新增嘉賓（活動前一日加人）');
ok(gr.includes('活體出口'), '⑮ 實錄卡結論：只有活體出口（手機）追到');
ok((gr.match(/接待報到/g) || []).length === 102, '⑮ 102 個接待報到掣');
app.pcGuestSearch('區永樑');
gr = containers['module-content'].innerHTML;
ok(gr.includes('區永樑先生') && !gr.includes('張佩珊'), '⑮ 搜尋：搵到區永樑、唔見張佩珊');
ok(gr.includes('顯示 1/102'), '⑮ 顯示計數 1/102');
app.pcGuestSearch(''); app.pcGuestSetCat('政府');
gr = containers['module-content'].innerHTML;
ok(gr.includes('張佩珊') && !gr.includes('吳家亮'), '⑮ 分組篩選：政府 4 位（唔見總會人）');
app.pcGuestSetCat(''); app.pcGuestSetView('bus');
gr = containers['module-content'].innerHTML;
ok(['馮敬安', '鍾偉言', '鄭定國', '曾滿淦'].every(n => gr.includes(n)) && !gr.includes('張佩珊'), '⑮ 大會車 4 位一鍵篩出');
app.pcGuestSetView('present');
gr = containers['module-content'].innerHTML;
ok(gr.includes('頒獎台') && gr.includes('葉永成') && !gr.includes('張佩珊'), '⑮ 頒獎台 6 位一鍵篩出');
app.pcGuestSetView(''); app.pcGuestToggle(1);
gr = containers['module-content'].innerHTML;
ok((app.pcGuestArr || {})[1] && toasts[toasts.length - 1][1] === 'success' && toasts[toasts.length - 1][0].includes('已到達'), '⑮ 接待報到：記錄時間＋成功提示');
ok(gr.includes('✓ 已到達') && (gr.match(/接待報到/g) || []).length === 101, '⑮ 該位變✓、其餘 101 個掣照舊');
app.pcGuestSetView('arrived');
gr = containers['module-content'].innerHTML;
ok(gr.includes('區永樑') && !gr.includes('張佩珊') && gr.includes('顯示 1/102'), '⑮ 已到達視圖：只見已報到嗰位');
app.pcGuestToggle(1); app.pcGuestSetView(''); app.pcGuestSetCat(''); app.currentUser = null;

/* ── ⑯ 八大報名表（階段 2）：報名→申請編號→T 編號 QR 一條血脈 ── */
const IF = pc.intake_forms || [];
ok(IF.length === 8, '⑯ 八大報名表齊全（照 FIELD_CONTRACT §3）');
const troopForm = IF.find(f => f.id === 'troop_registration');
ok(troopForm && troopForm.prefix === 'T' && (troopForm.fields || []).some(fl => fl.key === 'pt46') && (troopForm.fields || []).some(fl => fl.key === 'meals'), '⑯ 旅團報名：PT/46＋餐盒欄位（照合約）');
ok(IF.find(f => f.id === 'guest' && (f.fields || []).some(fl => fl.key === 'plate')), '⑯ 嘉賓報名：車牌欄位（照 2026 CSV 直搬）');
ok((IF.find(f => f.id === 'section_award').fields.find(fl => fl.key === 'award').options || []).includes('貝登堡獎章'), '⑯ 支部獎：獎章選項（總領袖/榮譽童軍/貝登堡）');
ok((IF.find(f => f.id === 'leader_award').fields.find(fl => fl.key === 'award').options || []).includes('10年長期服務獎狀'), '⑯ 成人獎：獎項選項照 2026 得主結構');
app.currentUser = null; containers['module-content'] = mkEl();
app.pcOpenFormByName('旅團報名');
let fb = containers['module-content'].innerHTML;
ok(app.pcDemoMode === 'form' && fb.includes('旅團報名') && fb.includes('代訂餐盒數量') && fb.includes('提交 → 出申請編號'), '⑯ 公眾開表：免登入・手機表格（餐盒/PT/46 欄位）');
ok(fb.includes('家長同意書 PT/46'), '⑯ PT/46 必填勾選');
// 缺必填 → 擋
ok(app.pcSubmitForm('troop_registration', { troop_no: '第 99 旅', area: 'CHW 柴灣區' }) === false && toasts[toasts.length - 1][1] === 'warning', '⑯ 必填驗證：缺領隊/人數 → 擋＋提示');
// 補齊 → T032 一條血脈
const entriesBefore = pc.checkin_demo.entries.length;
ok(app.pcSubmitForm('troop_registration', { troop_no: '第 99 旅', group: '童軍團', area: 'CHW 柴灣區', leader: '陳大文', phone: '91234567', headcount: 25, meals: 25, pt46: true }) === true, '⑯ 旅團報名提交成功');
const newEntry = pc.checkin_demo.entries[pc.checkin_demo.entries.length - 1];
ok(newEntry.token === 'T032' && newEntry.name.includes('第 99 旅') && newEntry.headcount === 25 && newEntry.meal_boxes === 25 && newEntry.note.includes('陳大文'), '⑲→⑯ 一條血脈：T032＋人數 25＋餐盒 25＋領隊 自動入名冊');
ok(app.pcFormDone && app.pcFormDone.no === 'T032', '⑯ 申請編號＝T032（申請編號=報到編號）');
fb = containers['module-content'].innerHTML;
ok(fb.includes('T032') && fb.includes('報到 QR') && fb.includes('查進度'), '⑯ 確認卡：T032＋報到 QR＋查進度提示');
ok(!app.currentUser, '⑯ 以上全部免登入（公眾身份做到）');
// 報到站即見新旅團
app.currentUser = { user_id: '陳子明', role: 'staff', mock_admin: true };
containers['module-content'] = mkEl();
app.pcCheckinLookup('T032');
ok((app.pcCheckinFound || {}).name && app.pcCheckinFound.name.includes('第 99 旅') && app.pcCheckinFound.headcount === 25, '⑯ 報到站掃 T032 即見新旅團・人數（名冊自動着燈）');
// 其他表：申請編號 prefix
app.currentUser = null; app.pcFormBack();
ok(app.pcSubmitForm('guest', { name: '測試嘉賓', title: '太平紳士', plate: 'AB1234' }) === true && app.pcIntakeSubs.some(x => x.no === 'G001'), '⑯ 嘉賓報名 → G001');
app.pcFormBack();
ok(app.pcSubmitForm('donations', { type: '物品', desc: '文具 100 份', qty: 100, contact: '林小姐', phone: '98765432' }) === true && app.pcIntakeSubs.some(x => x.no === 'D001'), '⑯ 童心捐贈 → D001');
// 報名總覽（工作人員）
ok(defs.find(d => d.id === 'intake_board' && d.minLevel === 20 && d.requiresData === 'public_channel_2027'), '⑯ 報名總覽卡：工作人員＋requiresData');
ok(!visible({ public_channel_2027: pc }).some(d => d.id === 'intake_board'), '⑯ 總覽唔會喺公眾出現');
app.currentUser = { user_id: '陳子明', role: 'staff', mock_admin: true };
containers['module-content'] = mkEl();
app.renderIntakeBoard();
const ib = containers['module-content'].innerHTML;
ok(ib.includes('名額自動着燈') && ib.includes('2,000') && ib.includes('700'), '⑯ 名額自動着燈（2,000 人／700 餐盒）');
ok(ib.includes('旅團報名') && ib.includes('T032') && ib.includes('第 99 旅'), '⑯ 總覽見 T032 提交');
ok(ib.includes('G001') && ib.includes('測試嘉賓'), '⑯ 總覽見 G001 提交');
ok(ib.includes('onIntakeSubmit') || ib.includes('GAS'), '⑯ 生產版說明：GAS onIntakeSubmit');
// 還原（唔影響後續測試嘅 31 隊基數）
pc.checkin_demo.entries.length = entriesBefore;
app.pcIntakeSubs = []; app.pcFormDone = null; app.currentUser = null;

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
