#!/usr/bin/env node
'use strict';
/**
 * 童心捐贈「一次入數」QR 方案（v19）回歸測試 — js/45-donate-qr.js
 *
 * 要守住嘅承諾：
 *  ① 公眾端出 QR＝純本機運算，載荷夠細掃得到
 *  ② 載荷改一個字都會被校驗碼捉到（防手民之誤／防改數）
 *  ③ 同一張 QR 有固定 code → 攤位可以用嚟擋重覆入數
 *  ④ 解碼出嚟嘅結構，啱晒 js/38-donations.js 本身嘅紀錄格式
 *  ⑤ 公眾頻道源碼唔准掂後端或捐贈存檔；寫入只可以喺工作人員端發生
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0;
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); n++; };

/* ── 載入 codec（唔要 DOM，純函數部分） ── */
const sandbox = { ScoutEventApp: function () { }, window: undefined, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
sandbox.ScoutEventApp.prototype = {};
sandbox.Object = Object;
vm.runInContext(read('js/45-donate-qr.js'), sandbox, { filename: '45-donate-qr.js' });
const app = Object.create(sandbox.ScoutEventApp.prototype);

/* ── ① 編碼 ── */
const head = { group: '港島第 6 旅', leader: '張國強', pos: '旅長', phone: '91234567' };
const rows = [{ name: '陳大文', qty: '12' }, { name: '李小明', qty: '250' }, { name: '黃小芳', qty: 5 }];
const packed = app.pcDonatePack('food', head, rows);
ok(packed.text.indexOf('HKIRD1|f|') === 0, '① 載荷有版本前綴，可以分辨係咪我哋張單');
ok(packed.donors === 3 && packed.items === 267, '① 統計正確：3 位・267 件');
ok(packed.bytes < 300, `① 載荷夠細（${packed.bytes} bytes）—— QR 版本細，手機掃得快`);
ok(/^[0-9ACDEFGHJKLMNPQRTUVWXY]{6}$/.test(packed.code), '① 校驗碼＝6 位易讀字元（冇 B/I/O/S/Z，口頭報唔會撈亂）');

/* 30 位捐贈者都仲掃得到 */
const big = app.pcDonatePack('goods', head, Array.from({ length: 30 }, (_, i) => ({ name: '陳大文' + i, qty: 99 })));
ok(big.bytes < 900, `① 30 位名單仍然得 ${big.bytes} bytes，QR 掃得到`);

/* 空行／壞資料會自動濾走 */
const clean = app.pcDonatePack('food', head, [{ name: '甲', qty: 1 }, { name: '', qty: 9 }, { name: '乙', qty: 0 }, { name: '丙', qty: 'abc' }]);
ok(clean.donors === 1 && clean.items === 1, '① 冇姓名／冇件數／件數唔係數字嘅行自動濾走');

/* 分隔符唔會被人打爛 */
const evil = app.pcDonatePack('food', { group: 'A|B^C*D', leader: '張|國強' }, [{ name: '陳*大|文', qty: 3 }]);
const evilP = app.pcDonateParse(evil.text);
ok(evilP && evilP.ok, '① 用家打咗分隔符都唔會整爛載荷');
ok(evilP.items.length === 1 && evilP.items[0].quantity === 3, '① 分隔符剝走後資料仍然啱');

/* ── ② 解碼 ── */
const p = app.pcDonateParse(packed.text);
ok(p && p.ok, '② 自己出嘅 QR 自己解得返');
ok(p.scheme === 'food', '② 計劃：食品');
ok(p.scout_group === '港島第 6 旅' && p.leader_name === '張國強' && p.leader_position === '旅長' && p.leader_phone === '91234567', '② 交表人資料完整還原');
ok(p.donors === 3 && p.total === 267, '② 人數件數還原');
ok(p.items.every(x => typeof x.name === 'string' && typeof x.quantity === 'number'), '② items[] 格式＝{name, quantity}，直接入得 js/38-donations.js');
ok(app.pcDonateParse(app.pcDonatePack('goods', head, rows).text).scheme === 'goods', '② 物品回收計劃一樣解得返');

/* ── ③ 防呆 ── */
ok(app.pcDonateParse('https://example.com') === null, '③ 唔相干嘅 QR → null（唔會當成捐贈單）');
ok(app.pcDonateParse('') === null, '③ 空白 → null');
const tampered = app.pcDonateParse(packed.text.replace('*12', '*9999'));
ok(tampered && tampered.ok === false, '③ 改咗件數 → 校驗碼對唔上，拒收');
const tampered2 = app.pcDonateParse(packed.text.replace('港島第 6 旅', '港島第 7 旅'));
ok(tampered2 && tampered2.ok === false, '③ 改咗旅團 → 拒收');
ok(app.pcDonateParse('HKIRD1|f|a|b|c').ok === false, '③ 掃到一半 → 拒收');
ok(app.pcDonateCode('x') !== app.pcDonateCode('y'), '③ 唔同內容 → 唔同碼');
ok(app.pcDonateCode(packed.text) === app.pcDonateCode(packed.text), '③ 同一內容 → 永遠同一個碼（可以用嚟擋重覆入數）');

/* ── ④ 紀念章計算（2026 兩份特別通告規則） ── */
let b = app.pcDonateBadges(p);
ok(b.badges === 3, '④ 每位捐贈者 1 枚紀念章');
ok(b.bonus === 1, '④ 食品：同一位 >200 件 → 特別紀念章及感謝狀');
b = app.pcDonateBadges(app.pcDonateParse(app.pcDonatePack('goods', head, [{ name: '甲', qty: 500 }]).text));
ok(b.badges === 1 && b.bonus === 0, '④ 物品回收冇 >200 件呢個特別獎（只有食品有）');

/* ── ⑤ 寫入邊界：公眾端唔准掂後端或捐贈存檔 ── */
const pcSrc = read('js/44-public-channel.js');
const donateBlock = pcSrc.slice(pcSrc.indexOf('pcDonateDef(d){'), pcSrc.indexOf('pcDemoTabsBody(d){'));
ok(!/saveDonationsData|getDonationsData/.test(pcSrc), '⑤ 公眾頻道完全唔掂捐贈存檔（唔會寫入籌委嗰本帳）');
ok(!/fetch\s*\(/.test(donateBlock), '⑤ 捐贈版面冇任何網絡請求（QR 係本機砌）');
ok(/pcDonateDraftKey\(\)\{[^}]*pc_donate_draft_/.test(pcSrc), '⑤ 草稿用獨立 localStorage key，同捐贈紀錄分開');
ok(/pcQrSvg\(q\.text\)/.test(pcSrc), '⑤ QR 用本地 vendor 產生（js/vendor/qrcode.min.js）');

const donSrc = read('js/38-donations.js');
ok(/donScanConfirm\(\)\{/.test(donSrc), '⑤ 工作人員端有「確認收貨並入數」＝全場唯一寫入點');
ok(/qr_code:p\.code/.test(donSrc), '⑤ 紀錄帶住 qr_code，之後可以對返邊張單');
ok(/some\(r=>r&&r\.qr_code===p\.code\)/.test(donSrc), '⑤ 寫入前再查一次重覆（擋住掃兩次）');
ok(/source:'攤位掃碼'/.test(donSrc), '⑤ 紀錄標明來源＝攤位掃碼（同紙本分得出，但入同一本帳）');
ok(/received_by:/.test(donSrc), '⑤ 紀錄留低邊位同事收貨');
ok(donSrc.indexOf("{k:'scan'") < donSrc.indexOf("{k:'dashboard'"), '⑤ 「掃碼收貨」排第一個分頁（當日攤位最常用）');
ok(/pcDonateScanStop\(\)/.test(donSrc), '⑤ 切分頁會熄鏡頭（唔會偷電）');
ok(/openGoodsDonationForm\(\)|openFoodDonationForm\(\)/.test(donSrc), '⑤ 紙本後備：同一個畫面入返同一本帳（唔會兩本數）');

/* 掃描器本身 */
const qrSrc = read('js/45-donate-qr.js');
ok(/BarcodeDetector/.test(qrSrc) && /jsQR/.test(qrSrc), '⑤ 掃描器：原生 BarcodeDetector 行先，後備 jsQR');
ok(/pcDonateLoadJsQR\(\)/.test(qrSrc) && /createElement\('script'\)/.test(qrSrc), '⑤ jsQR 用到先至載（唔會拖慢公眾頁）');
ok(fs.existsSync(path.join(root, 'js/vendor/jsqr.min.js')), '⑤ jsQR 已放入本地 vendor（唔靠 CDN）');
ok(read('index.html').includes('js/45-donate-qr.js?v='), '⑤ index.html 已掛載 45-donate-qr.js');

console.log(`童心捐贈 QR 一次入數測試通過（${n} 項）｜載荷 ${packed.bytes} bytes・校驗碼 ${packed.code}・30 位名單 ${big.bytes} bytes`);
