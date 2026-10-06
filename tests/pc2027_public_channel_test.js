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
 *  ⑰ 活動日版（v15）：頁簽化（唔再長版）＋刪走參與報名／名額費用／公開 QR；
 *     改名（基本資訊・日程・須知・求助・報到資訊）；新增 活動地圖（全部人）・典禮儀式流程（全部人）・
 *     座位表／午膳安排／午膳儀式（嘉賓）；報到 QR 改為電郵發俾負責領袖
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
ok(pc.audiences && pc.audiences.length === 7, '① 公眾身份＝須知分眾七類');
ok(pc.entry_summary && pc.entry_summary.total === 8 && pc.entry_summary.public_audiences === 7 && pc.entry_summary.staff_entry === 1, '① 首屏入口＝7 類公眾身份＋第 8 個工作人員入口');
ok(['guest', 'troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].every(id => pc.audiences.some(a => a.id === id)), '① 七類 id 齊：嘉賓/旅團/優異旅團獲獎/步操隊伍/其他制服團體/支部最高獎勵/成人獎勵');
ok(pc.audiences.every(a => Array.isArray(a.sections) && a.sections.length > 0), '① 每個受眾有內容組合');
ok(pc.audiences.every(a => ['schedule', 'arrival'].every(x => a.sections.includes(x))), '① 每類都有：時間表＋報到地圖');
ok(pc.audiences.every(a => !a.sections.includes('qr') && !a.sections.includes('apply')), '① 活動日版：冇「參與／報名」、冇公開「報到 QR」分節');
ok(pc.audiences.filter(a => a.guide).every(a => a.guide.every(k => pc.guides[k])), '① 每類嘅須知都喺七類須知數據入面');
ok(pc.banner_guest && pc.banner_guest.rows.length === 5, '① 嘉賓版基本盤（接待安排 5 行）');
ok(pc.notices && Object.keys(pc.notices).length === 7 && Object.values(pc.notices).every(v => v.startsWith('02_通知書/') && v.endsWith('/')), '① 七類通知書：一類一個資料夾（原名原檔掉入就得）');
ok(!!pc.notice_rule && pc.notice_rule.includes('最後修改'), '① 通知書規則：系統攞最後修改嗰份做最新');
ok(new Set(Object.values(pc.notices)).size === 7, '① 七份通知書檔名全部唔同');
ok(pc.section_labels && Object.keys(pc.section_labels).length === 14, '① 分節標籤 14 個');
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
const qrSrc = read('js/45-donate-qr.js');
const innerOf = src => src.slice(src.indexOf('Object.assign(ScoutEventApp.prototype,{') + 'Object.assign(ScoutEventApp.prototype,{'.length, src.lastIndexOf('});'));
const inner = innerOf(pcSrc);
const innerQr = innerOf(qrSrc);
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
Object.assign(ScoutEventApp.prototype,{ ${stripCommaLines(innerQr)} });
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
ok((html.match(/\?pub=/g) || []).length >= 7, '⑤ 每個公眾身份入口有專屬連結提示（?pub=）');
ok(html.includes('8 個入口') && html.includes('data-pc-entry="staff"'), '⑤ 首屏清楚列出第 8 個工作人員入口');
ok(html.includes('活動密碼') && html.includes('籌委會成員') && html.includes('2027'), '⑤ 工作人員入口清楚分流：普通工作人員密碼 2027／籌委帳戶登入');
ok(html.includes('一頁睇晒'), '⑤ 底部有委員預覽入口');

/* ── ⑥ 分眾版面（v15 頁簽制）：揀身份後一個頁簽一版，唔再長長一版拖拉 ── */
const renderTab = (audId, tab) => { app.pcDemoPickAudience(audId); if (tab) app.pcAudTab = tab; return render(); };

app.pcDemoPickAudience('guest'); html = render();
ok(html.includes('id="pc-aud-tabs"'), '⑥ 受眾版面有頁簽列（pc-aud-tabs）');
ok(html.includes('id="pc-aud-panel"'), '⑥ 一次只 render 當前頁簽嘅內容（pc-aud-panel）');
ok(html.includes("app.pcSetAudTab('schedule')") && html.includes("app.pcSetAudTab('ceremony')"), '⑥ 頁簽可切換');
ok(html.includes('1 / 10'), '⑥ 嘉賓 10 個頁簽（有座位表／午膳安排／午膳儀式）');
ok(html.includes('嘉賓專屬安排') && !html.includes('大會車開出'), '⑥ 預設第一個頁簽＝基本資訊（唔會同時出埋日程）');

html = renderTab('guest', 'schedule');
ok(html.includes('大會車開出') && html.includes('15:00'), '⑥ 嘉賓・日程：自己時間表（大會車去回程）');
html = renderTab('guest', 'arrival');
ok(html.includes('你的報到地點') && html.includes('莫榮大樓地下接待處'), '⑥ 嘉賓・報到資訊＝莫榮大樓接待處');
ok(!html.includes('名額（先到先得）'), '⑥ 嘉賓：唔講名額費用（獲邀人士）');

html = renderTab('troop', 'schedule');
ok(html.includes('按報名時段報到') && html.includes('集印換紀念章'), '⑥ 旅團・日程（報到時段＋集印）');
html = renderTab('troop', 'arrival');
ok(html.includes('有蓋操場報到處（東閘入）'), '⑥ 旅團・報到資訊＝有蓋操場（東閘入）');
ok(html.includes('旅遊巴'), '⑥ 旅團：專屬交通提示（旅遊巴）');
html = renderTab('troop', 'guide');
ok(html.includes('PT/46') && html.includes('普通旅團・須知'), '⑥ 旅團・須知：普通旅團版');
html = renderTab('troop', 'booths');
ok(html.includes('攤位遊戲一覽') && html.includes('A01') && html.includes('F06'), '⑥ 旅團・攤位遊戲一覽：33 個攤位按編號可查');
ok(html.includes('攤位遊戲地圖') && html.includes('pc-booth-game-list') && html.includes('完整攤位遊戲地圖'), '⑥ 旅團・攤位遊戲地圖：分區地圖＋完整 PDF 下載');

html = renderTab('merit', 'schedule');
ok(html.includes('10:15') && html.includes('排位'), '⑥ 優異旅團獲獎・日程（10:15 排位）');
html = renderTab('merit', 'arrival');
ok(html.includes('優異旅團櫃位（核對名單・領取彩帶）'), '⑥ 優異旅團獲獎・報到＝優異旅團櫃位');
ok(html.includes('大操場後方排位區（按區會）'), '⑥ 優異旅團獲獎：報到後排位');
html = renderTab('merit', 'guide');
ok(html.includes('彩帶') && html.includes('優異旅團・須知') && !html.includes('普通旅團・須知'), '⑥ 優異旅團獲獎：只見自己版須知');

html = renderTab('march', 'schedule');
ok(html.includes('08:00') && html.includes('綵排') && !html.includes('07:45'), '⑥ 步操隊伍・日程（08:00 綵排）');
html = renderTab('march', 'arrival');
ok(html.includes('大操場指定位置（依旗幟）'), '⑥ 步操隊伍・報到＝大操場依旗幟');
html = renderTab('march', 'guide');
ok(html.includes('指揮官檢閱') && !html.includes('優異旅團・須知'), '⑥ 步操隊伍：檢閱安排＋唔會見到優異旅團版須知');

html = renderTab('ug', 'arrival');
ok(html.includes('有蓋操場報到處・UG 專櫃'), '⑥ 其他制服團體・報到＝UG 專櫃');
ok(html.includes('穿梭巴士'), '⑥ 其他制服團體：專屬交通提示（穿梭巴士）');

html = renderTab('awardee_section', 'schedule');
ok(html.includes('總領袖獎章 → 榮譽童軍獎章 → 貝登堡獎章'), '⑥ 支部最高獎勵・日程：頒獎次序');
html = renderTab('awardee_section', 'arrival');
ok(html.includes('大操場左側後台排位（依獎章分組）'), '⑥ 支部最高獎勵・報到＝後台（依獎章分組）');
ok(html.includes('親友觀禮區'), '⑥ 支部最高獎勵・報到資訊：親友觀禮提示');
html = renderTab('awardee_section', 'guide');
ok(html.includes('觀禮區預留') && !html.includes('長期服務獎章'), '⑥ 支部最高獎勵・須知：唔會見到成人獎勵內容');

html = renderTab('awardee_adult', 'schedule');
ok(html.includes('覆誓') && html.includes('唱名序'), '⑥ 成人獎勵・日程：覆誓＋唱名');
html = renderTab('awardee_adult', 'arrival');
ok(html.includes('大操場左側後台排位（依獎項分組）'), '⑥ 成人獎勵・報到＝後台（依獎項分組）');
html = renderTab('awardee_adult', 'guide');
ok(html.includes('副會長') && !html.includes('貝登堡獎章'), '⑥ 成人獎勵：一星／三星由副會長頒發、唔會見到支部獎章內容');
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

/* ── ⑩ 報到 QR（v15）：公開頁唔顯示 QR；QR 以電郵發俾負責領袖，當日出示俾登記 BOOTH 掃描 ── */
const cd = pc.checkin_demo || {};
const troopEntries = cd.entries.filter(e => e.kind === '旅團');
ok(cd.entries && cd.entries.length === 31 && troopEntries.length === 31, '⑩ checkin_demo：31 個旅團 token（T001–T031，後台報到站用）');
ok(new Set(cd.entries.map(e => e.token)).size === 31, '⑩ token 全部唯一');
ok(pc.checkin_qr_rule && pc.checkin_qr_rule.headline.includes('電郵'), '⑩ 數據有「QR 以電郵發俾負責領袖」規則');
['guest', 'troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].forEach(id => {
  const h = renderTab(id, 'arrival');
  ok(!h.includes('你的報到 QR'), '⑩ ' + id + '：公開頁冇報到 QR（唔使登入嘅頁唔顯示 QR）');
  ok(!/<svg[^>]*>[\s\S]*?<rect[^>]*fill="#000000"/.test(h), '⑩ ' + id + '：冇 QR 圖');
});
html = renderTab('troop', 'arrival');
ok(html.includes('報到 QR Code 已電郵給負責領袖'), '⑩ 旅團：報到 QR 已電郵俾負責領袖');
ok(html.includes('負責領袖（旅長／領隊）') && html.includes('報到 QR Code 及場地指示'), '⑩ 旅團：顯示收件人＋電郵主旨（示範）');
ok(html.includes('代訂餐盒數量') && html.includes('出席人數'), '⑩ 旅團：講明登記 BOOTH 掃描後會見到咩資料');
ok(html.includes('登記 BOOTH') || html.includes('登記處'), '⑩ 旅團：講明由負責領袖出示俾登記處掃描');
html = renderTab('guest', 'arrival');
ok(html.includes('向接待處職員報姓名即可'), '⑩ 嘉賓：點名方式提示（報姓名即可）');
html = renderTab('awardee_adult', 'arrival');
ok(html.includes('需覆誓者 10:55 前綵排'), '⑩ 成人獎勵：點名提示（含覆誓提醒）');
html = renderTab('merit', 'arrival');
ok(html.includes('核對名單＋領彩帶（工作人員按名單點名）'), '⑩ 優異旅團：櫃位點名提示');

/* ── ⑫ 每個人自己嘅地圖：報到資訊頁簽內，路線＋報到點標喺圖上 ── */
html = renderTab('troop', 'arrival');
ok(html.includes('你要去嘅地方（示意圖）'), '⑫ 旅團：自己嘅示意圖');
ok(html.includes('pc-map-pin') && html.includes('你喺呢度報到'), '⑫ 旅團：📍紅點脈衝標記報到點');
ok(html.includes('有蓋操場・報到處') && html.includes('東閘'), '⑫ 旅團：路線節點（東閘→報到處）');
ok(html.includes('你的路線（由入口行到報到點）'), '⑫ 旅團：逐步路線清單');
html = renderTab('guest', 'arrival');
ok(html.includes('pc-map-pin') && html.includes('莫榮大樓'), '⑫ 嘉賓：📍標喺莫榮大樓');
html = renderTab('march', 'arrival');
ok(html.includes('步操集結位置') && html.includes('依旗幟'), '⑫ 步操：集結位置標示');
html = renderTab('awardee_section', 'arrival');
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
ok(land.includes('步操隊伍') && land.includes('支部最高獎勵獲獎人士') && land.includes('成人獎勵獲獎人士'), '⑧ landing：七類公眾身份入口齊晒');
ok(land.includes('8 個入口') && land.includes('data-pc-entry="staff"'), '⑧ landing：第 8 個工作人員入口與七類公眾身份並列');
ok(land.includes('2027 港島童軍繽紛日'), '⑧ landing：活動名＋日期時間地點');
ok(land.includes('普通工作人員') && land.includes('籌委會成員'), '⑧ landing：工作人員入口預先說明兩條登入路');
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

/* ── ⑨ 工作人員入口：分流選擇 → ①普通工作人員(PIN) ②籌委(帳密) ── */
app.currentUser = null;
app.pcStaffGate();
ok(!containers['modal-staff-gate'].classList.contains('hidden'), '⑨ 閘口 modal 打開');
ok(app.pcGateMode === 'choose', '⑨ 入口預設＝分流選擇（唔係直接彈 PIN）');
ok(containers['pc-gate-pin'].classList.contains('hidden'), '⑨ 分流時 PIN 鍵盤收起');
const gateHTML = containers['pc-gate-choose'].innerHTML;
ok(gateHTML.includes('普通工作人員') && gateHTML.includes('籌委'), '⑨ 分流：兩條路都列出');
ok(gateHTML.includes('只需活動密碼') && gateHTML.includes('帳號＋密碼'), '⑨ 分流：標明各自登入方式');
ok(gateHTML.includes('部門中心'), '⑨ 分流：明寫部門中心屬籌委');
ok(gateHTML.includes("pcGatePick('staff')") && gateHTML.includes("pcGatePick('committee')"), '⑨ 分流：兩個掣各自接線');
ok(containers['pc-gate-remember'].textContent.includes('記住'), '⑨ 分流：有「瀏覽器會記住登入」說明');

// ① 普通工作人員：揀咗先見 PIN 鍵盤
app.pcGatePick('staff');
ok(app.pcGateMode === 'pin' && containers['pc-gate-choose'].classList.contains('hidden'), '⑨A 揀普通工作人員 → 轉 PIN 畫面');
ok((containers['pc-pin-dots'].innerHTML.match(/rounded-full/g) || []).length === 4, '⑨A PIN 4 點顯示');
ok(containers['pc-pin-scope'].innerHTML.includes('睇到') && containers['pc-pin-scope'].innerHTML.includes('部門中心'), '⑨A PIN 畫面列明睇到／睇唔到');
'9999'.split('').forEach(d => app.pcPinPress(d));
app.pcPinCheck();
ok(toasts.length >= 1 && toasts[toasts.length - 1][1] === 'error', '⑨A 錯密碼 → 錯誤提示');
ok(!app.currentUser, '⑨A 錯密碼 → 唔會登入');
ok(app.pcPinBuf === '', '⑨A 錯密碼 → 輸入清空');
ok(app.pcVerifyStaffPin('2027') === true && app.pcVerifyStaffPin('9999') === false, '⑨A 驗證收口喺 pcVerifyStaffPin（日後換後端只改呢一個）');
ok(/verifyStaffPin/.test(read('js/44-public-channel.js')), '⑨A 已標明後端 action: verifyStaffPin 嘅換接位');
'2027'.split('').forEach(d => app.pcPinPress(d));
app.pcPinCheck();
ok(!!app.currentUser, '⑨A 正確 PIN（2027）→ 入到');
ok(app.currentUser.staff_pin === true, '⑨A PIN 身份帶 staff_pin 旗標');
ok(app.currentUser.role === 'staff' && !app.currentUser.mock_admin, '⑨A PIN 身份＝staff，唔會攞到 mock_admin 全開權限');
ok(app.isPinStaff() === true, '⑨A isPinStaff() 認得出');
ok(containers['modal-staff-gate'].classList.contains('hidden'), '⑨A 入咗之後閘口自動關閉');
ok(app.pcPublicLandingActive() === false, '⑨A 入咗之後唔再停喺公眾 landing');
const pinNotice = app.pcPinStaffNoticeHTML();
ok(pinNotice.includes('普通工作人員') && pinNotice.includes('pcUpgradeToCommittee'), '⑨A 儀表板提示條有「升級做籌委登入」掣');
app.currentUser = null;

// pcPinCheck 同時食 boolean 同 Promise（方便日後改 async 叫後端）
app.currentUser = null;
{
  const realVerify = app.pcVerifyStaffPin;
  app.pcVerifyStaffPin = () => Promise.resolve(true);
  app.pcPinBuf = '0000';
  app.pcPinCheck();
  app.pcVerifyStaffPin = realVerify;
}

// ② 籌委：帳號＋密碼（沿用既有登入視窗）
let loginOpened = false;
app.openLoginModal = () => { loginOpened = true; };
app.pcStaffGate();
app.pcGatePick('committee');
ok(loginOpened && containers['modal-staff-gate'].classList.contains('hidden'), '⑨B 揀籌委 → 開帳號密碼登入視窗');
loginOpened = false; app.pcUpgradeToCommittee();
ok(loginOpened, '⑨B 普通工作人員可由提示條升級做籌委登入');
app.currentUser = null;

/* ── ⑱ 權限分流：普通工作人員只開「工作人員公開資料」 ── */
{
  const coreSrc = read('js/10-app-core.js');
  const grab = (name) => {
    const i = coreSrc.indexOf('\n  ' + name + '(');
    if (i < 0) return '';
    const j = coreSrc.indexOf('\n,\n', i);
    return coreSrc.slice(i, j < 0 ? coreSrc.length : j);
  };
  const seeSrc = grab('canSeeRoleCard');
  ok(/staff_pin.*minLevel\s*<=\s*0/s.test(seeSrc), '⑱ canSeeRoleCard：staff_pin → 只開 minLevel 0');
  const navSrc = grab('updateAdminNav');
  ok(/pinStaff/.test(navSrc) && /setNav\('bn-dept',\s*loggedIn&&!pinStaff\)/.test(navSrc), '⑱ 底部導覽：普通工作人員冇部門中心');
  ok(/chiefOrAbove=!pinStaff/.test(navSrc), '⑱ 底部導覽：普通工作人員冇批核中心／開戶');
  ok(/topbar-changepwd[\s\S]{0,120}loggedIn&&!pinStaff/.test(navSrc), '⑱ 頂部：普通工作人員冇改密碼（冇帳戶）');
  const cardsSrc = grab('renderRoleCards');
  ok(/user\.staff_pin/.test(cardsSrc) && /pin-staff-notice/.test(cardsSrc), '⑱ 儀表板：staff_pin 分支＋提示條');
  ok(/identitySection\.classList\.add\('hidden'\)/.test(cardsSrc.slice(cardsSrc.indexOf('user.staff_pin'))), '⑱ 儀表板：工作卡片區隱藏');
  ok(/staff_pin[\s\S]{0,500}要籌委帳戶/.test(grab('openModule')), '⑱ openModule：非公開模組擋住普通工作人員');
  ok(/grpSec[\s\S]{0,120}staff_pin/.test(coreSrc), '⑱ 部門管理中心區塊對普通工作人員隱藏');
  ok(/user\.staff_pin[\s\S]{0,140}heroMon/.test(grab('renderIdentityBar')), '⑱ 普通工作人員冇「我的監察」');
  // 實際用卡片定義行一次：模擬 canSeeRoleCard 嘅 staff_pin 規則
  const pinVisible = defs.filter(d => d.minLevel <= 0 && !d.hideOnDashboard && (!d.requiresData || pc));
  ok(pinVisible.some(d => d.id === 'exec_manual') && pinVisible.some(d => d.id === 'announcements'), '⑱ 公開資料含執行手冊／公告');
  ok(!pinVisible.some(d => String(d.id).startsWith('group_')) && !pinVisible.some(d => d.id === 'dept_hub'), '⑱ 公開資料唔含部門卡');
  const sg = app.pcStaffGateDef();
  ok(sg.lanes.length === 2 && sg.lanes[0].id === 'staff' && sg.lanes[1].id === 'committee', '⑱ staff_gate 資料：兩條路');
  ok(sg.pin_user && sg.pin_user.role === 'staff', '⑱ staff_gate 資料：PIN 身份＝staff');
  ok((sg.lanes[0].cannot || []).some(x => x.includes('部門中心')), '⑱ 文案：普通工作人員明寫冇部門中心');
  ok((sg.lanes[1].can || []).some(x => x.includes('部門中心')), '⑱ 文案：籌委明寫有部門中心');
}

/* ── ③ 委員一頁睇晒（tabs 模式） ── */
app.pcDemoOpenTabs();
for (const t of ['home', 'program', 'venue', 'ceremony', 'seating', 'lunch', 'mess', 'transport', 'booths', 'guide', 'help', 'manual']) {
  app.openPublicChannelTab(t);
  ok(containers['module-content'].innerHTML.length > 400, `③ 分頁 ${t} render 有內容`);
}
app.openPublicChannelTab('home');
ok(containers['module-content'].innerHTML.includes('2027 港島童軍繽紛日'), '③ 基本盤有活動名');
ok(containers['module-content'].innerHTML.includes('惡劣天氣安排'), '③ 基本盤有惡劣天氣安排');
ok(!containers['module-content'].innerHTML.includes('名額（先到先得）') && !containers['module-content'].innerHTML.includes('費用（連紀念章）'), '③ 基本資訊：名額／費用已刪走（活動日唔使再講）');
app.openPublicChannelTab('booths');
ok(containers['module-content'].innerHTML.includes('A01'), '③ 攤位列表有 A01');
app.pcDemoZone = 'F'; app.renderPublicChannelDemo();
{
  const rendered=containers['module-content'].innerHTML;
  const from=rendered.indexOf('id="pc-booth-game-list"');
  const until=rendered.indexOf('🗺️ 攤位遊戲地圖', from);
  const boothList=rendered.slice(from,until);
  ok(boothList.includes('F06') && !boothList.includes('>A01<'), '③ 攤位 F 區篩選生效（地圖仍保留全部分區作對照）');
}
app.pcDemoZone = 'all';
app.openPublicChannelTab('manual');
ok(containers['module-content'].innerHTML.includes('合共 31 團'), '③ 參加旅團名單合計');
ok(containers['module-content'].innerHTML.includes('188 團次'), '③ 優異旅團名單總數');
ok(containers['module-content'].innerHTML.includes('1,016'), '③ 總人數 1,016');
ok(!containers['module-content'].innerHTML.includes('9722 9989'), '③ 公眾版冇領隊電話');

/* ── ⑰ 活動日版（v15）：改名・頁簽・刪走報名/名額費用・新增地圖/典禮/座位/午膳 ── */
const L = pc.section_labels;
ok(L.banner === '基本資訊' && L.schedule === '日程' && L.guide === '須知' && L.help === '求助' && L.arrival === '報到資訊',
  '⑰ 改名：活動基本盤→基本資訊、你的時間表→日程、你的須知→須知、活動日求助→求助、報到與地圖→報到資訊');
ok(L.venue === '活動地圖' && L.ceremony === '典禮儀式流程' && L.seating === '座位表' && L.lunch === '午膳安排' && L.mess === '午膳儀式',
  '⑰ 新分節：活動地圖／典禮儀式流程／座位表／午膳安排／午膳儀式');
ok(!('apply' in L) && !('qr' in L), '⑰ 已刪分節：參與／報名、你的報到 QR');
ok(!('quota' in pc.banner) && !('fee' in pc.banner), '⑰ 基本資訊：名額／費用欄位已由數據刪走');
ok(pc.audiences.every(a => a.sections.includes('venue') && a.sections.includes('ceremony')), '⑰ 全部七類都有「活動地圖」＋「典禮儀式流程」');
{
  const g = pc.audiences.find(a => a.id === 'guest');
  ok(['seating', 'lunch', 'mess'].every(x => g.sections.includes(x)), '⑰ 嘉賓額外有 座位表／午膳安排／午膳儀式');
  ok(pc.audiences.filter(a => a.id !== 'guest').every(a => !a.sections.some(x => ['seating', 'lunch', 'mess'].includes(x))), '⑰ 其餘六類唔會見到嘉賓專屬三個頁簽');
}

/* 活動地圖（全部人） */
html = renderTab('troop', 'venue');
ok(html.includes('全場活動地圖'), '⑰ 活動地圖：全場地圖');
ok(html.includes('場內設施位置') && html.includes('急救站') && html.includes('洗手間') && html.includes('失物認領處'), '⑰ 活動地圖：設施位置（急救／洗手間／失物）');
ok(html.includes('圖例'), '⑰ 活動地圖：有圖例');
ok(html.includes('官方場地指示圖'), '⑰ 活動地圖：官方場地指示圖（可下載）');
['guest', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].forEach(id => {
  ok(renderTab(id, 'venue').includes('全場活動地圖'), '⑰ ' + id + '：都有活動地圖');
});

/* 典禮儀式流程（全部人） */
['troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].forEach(id => {
  const h = renderTab(id, 'ceremony');
  ok(h.includes('典禮儀式流程') && h.includes('優異旅團及各項獎勵頒發儀式') && h.includes('會操檢閱暨步操比賽頒獎典禮'), '⑰ ' + id + '：典禮儀式流程（第一、二部分）');
  ok(!h.includes('莫榮大樓午膳儀式'), '⑰ ' + id + '：唔會見到只限嘉賓嘅第三部分');
});
html = renderTab('guest', 'ceremony');
ok(html.includes('莫榮大樓午膳儀式'), '⑰ 嘉賓：典禮流程包埋第三部分（莫榮大樓）');
ok(html.includes('風笛手引領主禮團進場') && html.includes('分列式步操'), '⑰ 典禮流程：來自司儀稿／Rundown 嘅關鍵環節');

/* 座位表（嘉賓） */
html = renderTab('guest', 'seating');
ok(html.includes('嘉賓席座位表'), '⑰ 嘉賓：座位表');
ok(html.includes('檢閱台（主禮台）'), '⑰ 座位表：主禮台方向');
ok(['A 區・主禮團', 'B 區・會長及副會長', 'F 區・獲獎人士及親友觀禮區'].every(x => html.includes(x)), '⑰ 座位表：A–F 分區');
ok(html.includes('你的座位') && html.includes('B07'), '⑰ 座位表：顯示自己座位（示範）');
ok(html.includes('就座須知'), '⑰ 座位表：就座須知');

/* 午膳安排（嘉賓） */
html = renderTab('guest', 'lunch');
ok(html.includes('13:00–14:00') && html.includes('Officer Mess'), '⑰ 午膳安排：時間＋地點（Officer Mess）');
ok(html.includes('特別膳食') && html.includes('入場'), '⑰ 午膳安排：入場及特別膳食');
ok(html.includes('代訂餐盒'), '⑰ 午膳安排：講明旅團用餐盒（午膳只供嘉賓）');

/* 午膳儀式（嘉賓・Officer Mess 小型典禮） */
html = renderTab('guest', 'mess');
ok(html.includes('午膳儀式') && html.includes('只限嘉賓'), '⑰ 午膳儀式：只限嘉賓');
ok(html.includes('香港女童軍總會') && html.includes('香港紅十字會青年團') && html.includes('香港聖約翰救傷隊少青團'), '⑰ 午膳儀式：致送感謝狀 3 個制服團隊（司儀稿 V2）');
ok(html.includes('會操檢閱官'), '⑰ 午膳儀式：致送紀念品予檢閱官');
ok(html.includes('13:30'), '⑰ 午膳儀式：13:30 開始');

/* 一進 APP 直接入公眾頻道 */
{
  const core = read('js/10-app-core.js');
  ok(core.includes('autoEnterPublicDemo') && core.includes("AUTO_DEMO_EVENT_ID:'mock_demo'"), '⑰ 一入 APP 自動進入模擬示範版（公眾頻道）');
  ok(/await this\.autoEnterPublicDemo\(\);/.test(core), '⑰ init() 已接線');
}

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

/* ══════ ⑱ 童心捐贈（v19）：公眾自己部機出 QR，攤位掃一次入數 ══════
   設計重點＝唔好「又收紙又收 online」。公眾端只係砌 QR（零後端），
   全場唯一一次寫入係攤位同事掃完確認嗰下 → 完場唔使對數。
   （codec／掃描器／寫入邊界嘅詳細斷言喺 tests/donate_qr_test.js） */
{
  const dn = pc.donate;
  ok(dn && typeof dn === 'object', '⑱ public_channel_2027.donate 存在');
  ok(pc.section_labels.donate === '童心捐贈', '⑱ section_labels 有 donate');
  const parts = pc.audiences.filter(a => a.id !== 'guest');
  ok(parts.length === 6 && parts.every(a => a.sections.includes('donate')), '⑱ 6 類參加者入口都有「童心捐贈」頁簽');
  ok(!pc.audiences.find(a => a.id === 'guest').sections.includes('donate'), '⑱ 嘉賓入口暫不顯示（待確認）');

  /* 兩個計劃＝2026 兩份特別通告 */
  ok((dn.schemes || []).map(x => x.id).join(',') === 'food,goods', '⑱ 兩個計劃：食品捐贈＋物品回收');
  const food = dn.schemes[0], goods = dn.schemes[1];
  ok(food.beneficiary === '循道衛理觀塘社會服務處', '⑱ 食品受惠機構＝循道衛理觀塘社會服務處');
  ok(goods.beneficiary === '國際十字路會', '⑱ 物品受惠機構＝國際十字路會');
  ok(food.bonus && food.bonus.threshold === 200, '⑱ 食品 >200 件 → 特別紀念章及感謝狀');
  ok(goods.stationery_unit === 10, '⑱ 文具 10 件 = 1 單位');
  ok(food.rules.some(r => /2028 年 6 月 1 日/.test(r)), '⑱ 最佳食用日期 2028-06-01（2026 規則順延一年）');
  ok(food.rules.some(r => /75 克/.test(r)), '⑱ 每件 75 克或以上');
  ['散裝食米', '熟食', '奶類製品', '罐頭類', '玻璃容器'].forEach(x =>
    ok(food.reject.some(r => r.includes(x)), `⑱ 食品唔收：${x}`));
  ok(goods.reject.some(r => r.includes('二手文具')), '⑱ 物品唔收：二手文具');
  ok(dn.schemes.every(x => /2835 7714/.test(x.enquiry || '')), '⑱ 查詢電話 2835 7714（發展幹事鄧倩姸女士）');
  ok(/11:00/.test(dn.collect.time) && /3:00/.test(dn.collect.time), '⑱ 收集時間 11:00–15:00');
  ok(/2027/.test(dn.collect.date), '⑱ 收集日期已轉 2027 示範');
  ok((dn.steps || []).length === 4 && /QR/.test(dn.steps[1].t), '⑱ 4 步流程，第 2 步＝產生 QR');
  ok(/掃/.test(dn.steps[3].t), '⑱ 第 4 步＝同事掃碼核對後即場派章');
  ok(dn.paper && dn.paper.url && /唔會做兩本帳|同一個系統/.test(dn.paper.note || ''),
    '⑱ 紙本後備：明寫會入返同一個系統，唔會兩本帳');
  ok(/只留喺你自己部手機/.test(dn.privacy || '') && /冇上傳/.test(dn.privacy || ''),
    '⑱ 私隱講清楚：填嘅嘢淨係留喺自己部機，產生 QR 都冇上傳');
  ok(/掃兩次只會入一次/.test(dn.privacy || ''), '⑱ 明寫同一張 QR 唔會重覆入數');

  /* ── 渲染：① 揀計劃 ── */
  let h = renderTab('troop', 'donate');
  ok(h.includes('童心捐贈大行動') && h.includes('收集攤位'), '⑱ 渲染：標題＋收集地點');
  ok(h.includes('循道衛理觀塘社會服務處') && h.includes('國際十字路會'), '⑱ 渲染：兩個受惠機構同時見到');
  ok(h.includes('pcDonatePick'), '⑱ 渲染：有揀計劃掣');
  ok(h.includes('id="pc-donate-body"'), '⑱ 渲染：獨立重畫容器（手機打字唔會彈走）');

  /* ── ② 填表：出門前合規格自我檢查 ── */
  app.pcDonateScheme = 'food'; app.pcDonateRows = [{ name: '', qty: '' }]; app.pcDonateQR = null; app.pcDonateHead = null;
  h = app.pcDonateBodyHTML(pc);
  ok(h.includes('唔收呢啲') && h.includes('散裝食米'), '⑱ 揀咗計劃即見「收／唔收」清單（出門前知唔合規格）');
  ok(h.includes('data-donor-name') && h.includes('data-donor-qty'), '⑱ 捐贈者名單：一行一位（姓名＋件數）');
  ok(h.includes('產生 QR') && h.includes('唔會上傳'), '⑱ 提交掣寫明「唔會上傳」');

  /* 自動計數＋提示 */
  app.pcDonateRows = [{ name: '陳大文', qty: '12' }, { name: '李小明', qty: '250' }, { name: '黃小芳', qty: '5' }];
  let t = app.pcDonateTotals(pc);
  ok(t.donors === 3 && t.items === 267, '⑱ 自動計：3 位捐贈者・267 件');
  ok(t.bonus === 1, '⑱ 自動計：1 位超過 200 件 → 特別紀念章');
  app.pcDonateRows = [{ name: '', qty: '8' }];
  ok(app.pcDonateTotals(pc).missingName === 1, '⑱ 填咗件數冇姓名 → 即時提示（紙表最常見甩漏）');
  app.pcDonateRows = [{ name: '甲', qty: '' }];
  ok(app.pcDonateTotals(pc).missingQty === 1, '⑱ 填咗姓名冇件數 → 即時提示');

  /* ── ③ QR 畫面 ── */
  const packed = app.pcDonatePack('food', { group: '港島第 6 旅', leader: '張國強' },
    [{ name: '陳大文', qty: 12 }, { name: '李小明', qty: 250 }]);
  app.pcDonateQR = Object.assign({ scheme: 'food', head: { group: '港島第 6 旅', leader: '張國強' } }, packed);
  h = app.pcDonateBodyHTML(pc);
  ok(h.includes(packed.code), '⑱ QR 畫面：顯示 6 位校驗碼（掃唔到可以口頭報）');
  ok(h.includes('當日俾攤位同事掃呢個'), '⑱ QR 畫面：講明點用');
  ok(/掃嗰一刻先會入大會系統/.test(h), '⑱ QR 畫面：明寫掃嗰一刻先入系統');
  ok(/建議先截圖/.test(h), '⑱ QR 畫面：提你截圖（場內可能冇網絡）');
  ok(h.includes('app.pcDonateEdit()'), '⑱ QR 畫面：改得返名單');
  app.pcDonateQR = null; app.pcDonateScheme = ''; app.pcDonateRows = null; app.pcDonateHead = null;

  /* ── 接線 ── */
  ok(pcSrc.includes("['donate','童心捐贈'"), '⑱ 委員「一頁睇晒」都睇到童心捐贈分頁');
  ok(!/saveDonationsData|getDonationsData/.test(pcSrc), '⑱ 公眾頻道完全唔掂捐贈存檔（入數只可以喺工作人員端）');
}

console.log(`公眾頻道 2027 分眾入口＋landing＋工作人員閘口測試通過（${n} 項）｜7 公眾身份＋1 工作人員入口・booths 33・participants 31・merit ${meritTotal}`);
