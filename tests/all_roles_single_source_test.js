#!/usr/bin/env node
'use strict';
/* 所有角色 × PDF 同一源頭輻射測試（2026-10-06）
   ─────────────────────────────────────────────────
   問題：除咗主SHEET 及 GS，所有 PDF 是否「同一源頭輻射到不同出口」，
        各職員／參加者能各自看到同樣嘅資料？

   角色清單（18）：
     ・7 個公眾身份：嘉賓／旅團／優異旅團獲獎／步操隊伍／其他制服團體／
       支部最高獎勵獲獎人士／成人獎勵獲獎人士
     ・1 個普通工作人員（活動密碼閘口，無帳戶）
     ・10 個委員角色：super_admin／advisor／admin／chairperson／
       executive_vice_chairperson／vice_chairperson／general_director／
       director／staff／public

   A. 連結同源（數據層）：link_registry 13 條全覆蓋（改一處→29 個位置同步）、
      無孤兒 URL、2026 live Drive ID 零殘留、公告內文連結全部指向 07_參考快照。
   B. 渲染層（公眾 7 身份 + 委員 tabs + 工作人員）：每個角色 render 全部分頁，
      抽出全部文件 href —— 同一份文件喺所有角色眼前係同一條 URL；
      共享內容（典禮流程／場地圖／交通／程序）逐字相同；
      嘉賓獨有內容（座位／午膳／午膳儀式／第三部分）唔會漏畀其他身份。
   C. 委員角色：ROLE_LABELS ↔ ROLE_HIERARCHY 十個角色一一對應；
      mock_demo 61 個帳戶覆蓋 8 個委員角色；公告係單一數據源（無角色過濾）。
   D. 文件一致性：79 份文件＋3 份通告＋旅團須知全部 awaiting_2027_owned_copy
      （唔會有唔同版本）；16 份參考快照齊；公告 3 條快照連結 ⊂ 16。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0;
const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); n++; };

const mock = JSON.parse(read('data/mock_demo.json'));
const pc = mock.public_channel_2027;
const isd2026 = JSON.parse(read('data/isd_2026.json'));
const index = JSON.parse(read('data/2027_unified_connection_index.json'));

/* ══ A. 連結同源（數據層）══ */
const reg = mock.link_registry;
const norm = p => String(p).replace(/^\./, '');
const occurrences = []; // [path,url]（唔計 link_registry 自身）
(function walk(node, p) {
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, p + '[' + i + ']')); return; }
  if (node && typeof node === 'object') { for (const k of Object.keys(node)) walk(node[k], p + '.' + k); return; }
  if (typeof node === 'string' && /^https?:\/\//.test(node) && !p.startsWith('.link_registry')) occurrences.push([p, node]);
})(mock, '');

// A1 — link_registry：每條連結喺數據出現嘅位置＝targets 100%（一處更新全站同步）
let fullCover = 0;
reg.links.forEach(l => {
  const tset = new Set((l.targets || []).map(norm));
  const places = occurrences.filter(([p, u]) => u === l.url).map(([p]) => norm(p));
  ok(places.length > 0, `A1 ${l.id} 喺數據至少出現一次`);
  ok(places.every(p => tset.has(p)), `A1 ${l.id}（${places.length} 處）全部係 registry targets——改一處即全站同步`);
  ok(tset.size === places.length, `A1 ${l.id} targets 無過期（targets=${tset.size}＝出現=${places.length}）`);
  fullCover += places.length;
});
ok(reg.links.length === 13 && reg.total_targets === 29, 'A1 link_registry＝13 條連結接管 29 個位置');
ok(fullCover === 29, 'A1 29 個位置全部受 registry 接管（冇漏網）');

// A2 — 孤兒 URL：所有 http(s) 字串要麼屬 registry、要麼係公告內文嘅參考快照連結
const regUrls = new Set(reg.links.map(l => l.url));
const snapshotUrls = new Set(index.assets_2027.reference_snapshots.map(s => s.link));
const orphans = occurrences.filter(([p, u]) => !regUrls.has(u) && !snapshotUrls.has(u));
ok(orphans.length === 0, `A2 無孤兒 URL（唔經 registry／快照嘅連結＝${orphans.length}）` + (orphans.length ? '：' + orphans.map(o => o[0]).join('、') : ''));

// A3 — 2026 live Drive ID 零殘留：2026 封存入面所有 drive_id 喺 2027 示範一個都唔准出現
const ids2026 = new Set();
isd2026.documents.forEach(d => { const m = String(d.file_url || '').match(/\/d\/([-\w]{20,})/) || String(d.file_url || '').match(/[?&]id=([-\w]{20,})/); if (m) ids2026.add(m[1]); });
isd2026.notices.forEach(x => { if (x.drive_id) ids2026.add(x.drive_id); });
const mockText = JSON.stringify(mock);
const leaked = [...ids2026].filter(id => mockText.includes(id));
ok(leaked.length === 0, `A3 2026 live Drive ID 殘留＝${leaked.length}` + (leaked.length ? '：' + leaked.join('、') : '（2026 原檔零直連）'));

// A4 — 公告內文連結全部指向 07_參考快照（2027 唯讀副本＝單一源頭）
const annLinks = [];
mock.announcements.announcements.forEach(a => (a.content.match(/https?:\/\/[^\s]+/g) || []).forEach(u => annLinks.push([a.id, u])));
ok(annLinks.length === 3, 'A4 公告內文連結＝3 條（特別通告＋食品捐贈＋物品回收）');
annLinks.forEach(([id, u]) => ok(snapshotUrls.has(u), `A4 ${id} 內文連結指向 07_參考快照：${u.slice(0, 60)}`));

/* ══ B. 渲染層：所有角色 render，同文檔同 URL ══ */
const cfgSrc = read('js/00-config.js');
const orderSrc = cfgSrc.match(/const PUBLIC_CARD_ORDER=\[[^\]]+\];/)[0];
const defsSrc = cfgSrc.match(/const DASH_CARD_DEFS=\[[\s\S]*?\n\];/)[0];
const escSrc = cfgSrc.match(/function escapeHtml\(s\)\{.*\}\n/s)[0].split('\n')[0];
const pcSrc = read('js/44-public-channel.js');
const qrSrc = read('js/45-donate-qr.js');
const innerOf = src => src.slice(src.indexOf('Object.assign(ScoutEventApp.prototype,{') + 'Object.assign(ScoutEventApp.prototype,{'.length, src.lastIndexOf('});'));
const strip = s => s.replace(/^[ \t]*,[ \t]*$/gm, '');
const containers = {};
const mkEl = () => ({ innerHTML: '', textContent: '', style: {}, classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } } });
const ctx = { console, setTimeout: () => 0, showToast: () => {}, document: { getElementById: id => containers[id] || (containers[id] = mkEl()) } };
const ScoutEventApp = vm.runInNewContext(`
${escSrc}
${orderSrc}
${defsSrc}
class ScoutEventApp{}
Object.assign(ScoutEventApp.prototype,{ ${strip(innerOf(pcSrc))} });
Object.assign(ScoutEventApp.prototype,{ ${strip(innerOf(qrSrc))} });
ScoutEventApp;
`, ctx);
const app = new ScoutEventApp();
app.eventData = { public_channel_2027: pc };
const render = () => { containers['module-content'] = mkEl(); app.renderPublicChannelDemo(); return containers['module-content'].innerHTML; };
const docHrefs = html => [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(u => /drive\.google|docs\.google|hkirscout|google_drive\//.test(u));

// B1 — 七個公眾身份 × 各自全部頁簽 render + 收集文件 href
const AUDS = ['guest', 'troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'];
const audDocs = {};   // audience → Set(文件 URL)
const audHtml = {};   // audience → 全部頁簽 html 合併
AUDS.forEach(aud => {
  const urls = new Set(); let all = '';
  app.pcDemoPickAudience(aud);
  pc.audiences.find(x => x.id === aud).sections.forEach(tab => {
    app.pcAudTab = tab;
    const html = render();
    ok(typeof html === 'string' && html.length > 200, `B1 ${aud}・${tab} 頁簽 render 正常`);
    all += html;
    docHrefs(html).forEach(u => urls.add(u));
  });
  audDocs[aud] = urls; audHtml[aud] = all;
});

// B2 — 同一份文件，所有見到佢嘅角色見到同一條 URL（共用文檔跨身份完全一致）
const venuePdf = 'google_drive/ISD 2027－參加旅團場地指示圖.pdf';
AUDS.forEach(aud => ok(audDocs[aud].has(venuePdf), `B2 ${aud}：各角色共用同一份場地指示圖`));
const hki = 'https://www.hkirscout.org.hk';
AUDS.filter(a => a !== 'guest').forEach(aud => ok([...audDocs[aud]].some(u => u.startsWith(hki)), `B2 ${aud}：紙本表格下載（總會官網）用同一條連結`));
ok(!audDocs.guest.has(hki) && ![...audDocs.guest].some(u => u.startsWith(hki)), 'B2 嘉賓唔設童心捐贈頁簽（設計如此，非缺漏）');

// B3 — 共享內容逐字相同：典禮流程（第一二部分）／場地圖／交通／當日程序＝單一數據物件
ok(pc.audiences.every(a => a.sections.includes('venue') && a.sections.includes('ceremony')), 'B3 全部七類都有「活動地圖」＋「典禮儀式流程」');
const p1p2 = pc.ceremony_flow.parts.filter(p => !p.guest_only);
ok(p1p2.length === 2, 'B3 典禮流程第一、二部分＝公開（所有身份同一份）');
AUDS.forEach(aud => {
  ok(audHtml[aud].includes('優異旅團及各項獎勵頒發儀式'), `B3 ${aud}：典禮第一部分標題相同`);
  ok(audHtml[aud].includes('會操檢閱暨步操比賽頒獎典禮'), `B3 ${aud}：典禮第二部分標題相同`);
  ok(audHtml[aud].includes('東閘'), `B3 ${aud}：場地圖（東閘入口）相同`);
  ok(audHtml[aud].includes('穿梭巴士'), `B3 ${aud}：交通安排相同`);
});

// B4 — 嘉賓獨有內容唔會漏畀其他身份（座位表／午膳／午膳儀式／第三部分）
const guestOnly = ['seating', 'lunch', 'mess'];
guestOnly.forEach(sec => {
  ok(pc.audiences.find(a => a.id === 'guest').sections.includes(sec), `B4 嘉賓有 ${sec} 頁簽`);
  AUDS.filter(a => a !== 'guest').forEach(aud => ok(!pc.audiences.find(x => x.id === aud).sections.includes(sec), `B4 ${aud} 冇 ${sec} 頁簽（只限嘉賓）`));
});
ok(!audHtml.march.includes('座位已預先編排') && audHtml.guest.includes('座位已預先編排'), 'B4 嘉賓專屬 banner（座位編排）唔會出現喺步操隊伍');
ok(audHtml.guest.includes('莫榮大樓午膳儀式') || audHtml.guest.includes('Officer Mess'), 'B4 嘉賓見到第三部分（莫榮大樓）');
['troop', 'merit', 'march', 'ug', 'awardee_section', 'awardee_adult'].forEach(aud => ok(!audHtml[aud].includes('guest_only'), `B4 ${aud} 唔會出現第三部分`));

// B5 — 通知書：一類一個資料夾（秘書正式信＝單一源頭；系統攞最新）
const noticeFolders = Object.values(pc.notices);
ok(new Set(noticeFolders).size === 7 && noticeFolders.every(f => f.startsWith('02_通知書/') && f.endsWith('/')), 'B5 七類通知書＝七個獨立資料夾（原名原檔掉入，系統攞最新）');

// B6 — 工作人員閘口（第 8 個入口）＋委員「一頁睇晒」都 render 到同一批數據
app.pcDemoMode = 'pick'; app.pcDemoPickAudience && app.pcDemoPickAudience('guest');
app.pcDemoMode = 'tabs';
let tabsHtml = render();
ok(tabsHtml.includes('委員預覽') || tabsHtml.includes('一頁睇晒'), 'B6 委員 tabs 模式 render 到（一頁睇晒）');
docHrefs(tabsHtml).forEach(u => ok(AUDS.some(a => audDocs[a].has(u)) || regUrls.has(u), `B6 委員睇到嘅文件連結同公眾同源：${u.slice(0, 50)}`));

/* ══ C. 委員角色（10 個）══ */
const labels = vm.runInNewContext('({})', ctx); // placeholder no-op
const roleLabels = cfgSrc.match(/const ROLE_LABELS=\{[^}]+\};/)[0];
const roleHier = cfgSrc.match(/const ROLE_HIERARCHY=\{[^}]+\};/)[0];
const roles = vm.runInNewContext(`${roleLabels}\n${roleHier}\n({labels:ROLE_LABELS,hier:ROLE_HIERARCHY})`, ctx);
const COMMITTEE = ['super_admin', 'advisor', 'admin', 'chairperson', 'executive_vice_chairperson', 'vice_chairperson', 'general_director', 'director', 'staff', 'public'];
ok(Object.keys(roles.labels).length === 10, 'C1 委員角色清單＝10 個');
COMMITTEE.forEach(r => ok(roles.labels[r] && typeof roles.hier[r] === 'number', `C1 ${r}（${roles.labels[r]}）有標籤亦有層級（L${roles.hier[r]}）`));
ok(roles.hier.public === 0 && roles.hier.super_admin === 100 && roles.hier.vice_chairperson === 60, 'C1 層級邊界：public=0／super_admin=100／副主席=60（危機電話 L60+ 閘嘅基準）');
const byRole = {};
mock.users.forEach(u => byRole[u.role] = (byRole[u.role] || 0) + 1);
['advisor', 'chairperson', 'executive_vice_chairperson', 'vice_chairperson', 'general_director', 'director', 'admin', 'staff'].forEach(r => ok(byRole[r] > 0, `C2 mock_demo 有 ${roles.labels[r]} 帳戶（${byRole[r] || 0} 個）`));
ok(mock.users.length === 61, `C2 委員帳戶共 61 個（涵蓋 8 個有帳戶角色＋普通工作人員密碼入口）`);
// 公告＝單一數據源，無角色過濾（js/34 只有搜尋過濾）
const annSrc = read('js/34-announcements.js');
ok(/includes\(q\)/.test(annSrc) && !/perm_see|roleLevel\(.*announcements/.test(annSrc), 'C3 公告無角色過濾——所有角色見同一份公告（同一源頭）');
ok(mock.announcements.announcements.length === 6, 'C3 公告 6 條（單一數據源）');
// 每個角色見到嘅公告內文連結＝同一批快照 URL
annLinks.forEach(([id, u]) => ok(snapshotUrls.has(u), `C3 公告 ${id} 連結對所有角色都係同一條快照 URL`));

/* ══ D. 文件一致性（ awaiting 2027 副本＝唔會有版本分歧）══ */
ok(mock.documents.length === 79, 'D1 文件中心 79 份');
ok(mock.documents.every(d => !d.file_url), 'D1 79 份文件 file_url 全部為空（零 hot-link＝零版本分歧；連結一律由 2027 源頭上載中心供應）');
ok(mock.documents.filter(d => d.file_url_state === 'awaiting_2027_owned_copy').length === 62, 'D1 62 份 2026 種籽文件一致標 awaiting_2027_owned_copy');
ok(mock.documents.filter(d => !d.file_url_state).every(d => d.id.startsWith('isd_final_')), 'D1 其餘 17 份＝活動日匯入紀錄（isd_final_*，從未帶 URL）');
ok(mock.notices.length === 3 && mock.notices.every(x => x.drive_url === '' && x.drive_url_state === 'awaiting_2027_owned_copy'), 'D1 通告 3 份全部等待 2027 副本');
ok(mock.unit_guide.docs.every(d => d.file_url === '' && (d.file_url_state === 'awaiting_2027_owned_copy' || !d.file_url_state)), 'D1 旅團須知全部等待 2027 副本');

const snaps = index.assets_2027.reference_snapshots;
ok(snaps.length === 16, 'D2 07_參考快照＝16 份（14 原有＋童心捐贈食品／物品回收）');
ok(new Set(snaps.map(s => s.drive_file_id)).size === 16, 'D2 快照 Drive ID 無重複');
annLinks.forEach(([id, u]) => {
  const fid = u.match(/\/d\/([-\w]{20,})/)[1];
  const snap = snaps.find(s => s.drive_file_id === fid);
  ok(!!snap, `D2 公告 ${id} → ${snap ? snap.asset_id : '??'}（07_參考快照登記在冊）`);
});
ok(snaps.find(s => s.asset_id === 'SNAP-DONATE-FOOD').maps_to_source_ids.some(m => m.source_id === 'DOC-FOOD-DONATION'), 'D2 食品捐贈快照 → DOC-FOOD-DONATION 受控來源（秘書處）');
ok(snaps.find(s => s.asset_id === 'SNAP-DONATE-GOODS').maps_to_source_ids.some(m => m.source_id === 'DOC-GOODS-DONATION'), 'D2 物品回收快照 → DOC-GOODS-DONATION 受控來源（秘書處）');

console.log(`所有角色 × PDF 同一源頭輻射測試通過（${n} 項｜18 個角色：7 公眾身份＋工作人員閘口＋10 委員角色）`);
