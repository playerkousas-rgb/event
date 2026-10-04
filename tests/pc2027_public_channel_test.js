#!/usr/bin/env node
'use strict';
/**
 * 階段 1（2026-10-04）：「公眾頻道 2027 形態示範」卡片回歸測試
 *  ① data/mock_demo.json 有 public_channel_2027，八個分頁所需數據齊全
 *     （booths 33・participants 31・merit 188・guides 7 類・manual tabs 15）
 *  ② DASH_CARD_DEFS 有 public_channel_demo 卡：公開（minLevel 0）＋ requiresData
 *  ③ renderPublicChannelDemo 喺 stub DOM 下 8 個分頁全部 render 到，含關鍵內容
 *  ④ requiresData 過濾：活動 JSON 冇 public_channel_2027（如 isd_2026／isd_2027）→ 卡片不顯示
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

/* ── ① 數據齊全 ── */
const mock = JSON.parse(read('data/mock_demo.json'));
const pc = mock.public_channel_2027;
ok(pc, '① mock_demo.json 有 public_channel_2027');
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

/* ── 卡片定義 + 渲染方法（由 config／新模組抽源碼，stub DOM 跑） ── */
const cfgSrc = read('js/00-config.js');
const orderSrc = cfgSrc.match(/const PUBLIC_CARD_ORDER=\[[^\]]+\];/)[0];
const defsSrc = cfgSrc.match(/const DASH_CARD_DEFS=\[[\s\S]*?\n\];/)[0];
const escSrc = cfgSrc.match(/function escapeHtml\(s\)\{.*?\}\n/s)[0].split('\n')[0];
const pcSrc = read('js/44-public-channel.js');
const inner = pcSrc.slice(pcSrc.indexOf('Object.assign(ScoutEventApp.prototype,{') + 'Object.assign(ScoutEventApp.prototype,{'.length, pcSrc.lastIndexOf('});'));
const stripCommaLines = s => s.replace(/^[ \t]*,[ \t]*$/gm, '');

const containers = {};
const mkEl = () => ({ innerHTML: '', textContent: '', classList: { add() {}, remove() {}, toggle() {} } });
const ctx = {
  console,
  showToast: () => {},
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

/* ── ② 卡片定義 ── */
const def = (0, eval) ? null : null; // (no-op 保持 lint 安靜)
const defs = vm.runInNewContext('DASH_CARD_DEFS', ctx);
const card = defs.find(d => d.id === 'public_channel_demo');
ok(card, '② DASH_CARD_DEFS 有 public_channel_demo');
ok(card.minLevel === 0, '② 卡片公開（minLevel 0）');
ok(card.requiresData === 'public_channel_2027', '② requiresData＝public_channel_2027');
ok(String(card.action).includes("app.openModule('public_channel_demo')"), '② action 指向模組');
const order = vm.runInNewContext('PUBLIC_CARD_ORDER', ctx);
ok(order[0] === 'public_channel_demo', '② 排公開資料第一位（mock_demo 內）');

/* ── ③ 八個分頁 render ── */
const app = new ScoutEventApp();
app.eventData = { public_channel_2027: pc };
const TABS = ['home', 'transport', 'program', 'booths', 'apply', 'guide', 'help', 'manual'];
for (const t of TABS) { app.openPublicChannelTab(t); ok(containers['module-content'].innerHTML.length > 400, `③ 分頁 ${t} render 有內容`); }
app.pcDemoTab = 'home'; app.renderPublicChannelDemo();
ok(containers['module-content'].innerHTML.includes('2027 港島童軍繽紛日'), '③ 基本盤有活動名');
ok(containers['module-content'].innerHTML.includes('惡劣天氣安排'), '③ 基本盤有惡劣天氣安排');
app.openPublicChannelTab('booths');
ok(containers['module-content'].innerHTML.includes('A01'), '③ 攤位列表有 A01');
app.pcDemoZone = 'F'; app.renderPublicChannelDemo();
ok(containers['module-content'].innerHTML.includes('F06') && !containers['module-content'].innerHTML.includes('>A01<'), '③ 攤位 F 區篩選生效');
app.pcDemoZone = 'all';
app.openPublicChannelTab('guide');
ok(containers['module-content'].innerHTML.includes('莫榮大樓'), '③ 嘉賓須知有莫榮大樓');
app.pcDemoGuideKey = '支部最高獎勵得主'; app.renderPublicChannelDemo();
ok(containers['module-content'].innerHTML.includes('貝登堡獎章'), '③ 支部獎勵須知有頒獎次序');
app.openPublicChannelTab('manual');
ok(containers['module-content'].innerHTML.includes('合共 31 團'), '③ 參加旅團名單合計');
ok(containers['module-content'].innerHTML.includes('188 團次'), '③ 優異旅團名單總數');
ok(containers['module-content'].innerHTML.includes('1,016'), '③ 總人數 1,016');
ok(!containers['module-content'].innerHTML.includes('9722 9989'), '③ 公眾版冇領隊電話');

/* ── ④ requiresData 過濾（照 renderRoleCards 同一套條件） ── */
const visible = ev => defs.filter(d => d.minLevel <= 0 && !d.hideOnDashboard && (!d.requiresData || (ev && ev[d.requiresData])));
ok(visible({ public_channel_2027: pc }).some(d => d.id === 'public_channel_demo'), '④ mock_demo（有數據）→ 卡片顯示');
ok(!visible({}).some(d => d.id === 'public_channel_demo'), '④ isd_2026／isd_2027（冇 public_channel_2027）→ 卡片不顯示');
ok(visible({}).filter(d => !d.requiresData).length === 4, '④ 其餘 4 張公開卡不受影響');
const coreSrc = read('js/10-app-core.js');
ok(coreSrc.includes("(!d.requiresData||(this.eventData&&this.eventData[d.requiresData]))"), '④ renderRoleCards 過濾器已接入 requiresData');
ok(coreSrc.includes("if(mod==='public_channel_demo'){this.renderPublicChannelDemo(); return;}"), '④ renderModuleContent 已接入示範模組');
ok(coreSrc.includes("public_channel_demo:'公眾頻道 2027（示範）'"), '④ openModule 標題已接入');

console.log(`公眾頻道 2027 形態示範測試通過（${n} 項）｜booths 33・participants 31・merit ${meritTotal}・guides 7・manual tabs 15`);
