#!/usr/bin/env node
'use strict';
/**
 * tools/donate_copy_sheet.js — 童心捐贈「文案交接表」
 *
 * 用途：程式嘅嘢我哋搞掂；文字內容係籌委會（服務及發展組）嘅嘢。
 *      呢個工具一次過列晒公眾頁每一句字、佢喺 JSON 邊個位置、而家係乜，
 *      籌委會喺最後一欄填新文字，交返轉頭就改得——唔使睇程式、唔使問人。
 *
 * 用法：
 *   node tools/donate_copy_sheet.js          # 文字表（終端機睇）
 *   node tools/donate_copy_sheet.js --md     # Markdown 表（貼落文件／電郵）
 *   node tools/donate_copy_sheet.js --csv    # CSV（開 Excel 畀籌委會直接填）
 *
 * 改完之後：改 tools/build_pc2027_demo.js 入面 donate 嗰舊 → node tools/build_pc2027_demo.js
 */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const pc = JSON.parse(fs.readFileSync(path.join(root, 'data/mock_demo.json'), 'utf8')).public_channel_2027;
const d = pc && pc.donate;
if (!d) { console.error('搵唔到 public_channel_2027.donate'); process.exit(1); }

const rows = [];
const add = (p, what, val, who) => rows.push({ p, what, val: String(val == null ? '' : val), who: who || '服務及發展組' });

add('donate.title', '頁面標題', d.title);
add('donate.tagline', '大字標語', d.tagline);
add('donate.why', '一句講點解要捐', d.why);
add('donate.eligible', '邊個可以捐', d.eligible);
add('donate.collect.date', '收集日期', d.collect.date, '籌委會・大會日程');
add('donate.collect.time', '收集時間', d.collect.time);
add('donate.collect.place', '收集地點／攤位編號', d.collect.place, '籌委會・攤位組');
(d.steps || []).forEach((s, i) => {
  add(`donate.steps[${i}].t`, `第 ${i + 1} 步・標題`, s.t);
  add(`donate.steps[${i}].d`, `第 ${i + 1} 步・說明`, s.d);
});
(d.schemes || []).forEach((sc, i) => {
  const b = `donate.schemes[${i}]`;
  add(`${b}.name`, `計劃 ${i + 1}・名稱`, sc.name);
  add(`${b}.beneficiary`, `計劃 ${i + 1}・受惠機構`, sc.beneficiary);
  add(`${b}.beneficiary_note`, `計劃 ${i + 1}・受惠機構說明`, sc.beneficiary_note);
  add(`${b}.accept[]`, `計劃 ${i + 1}・✓ 收乜（${(sc.accept || []).length} 項）`, (sc.accept || []).join('；'));
  add(`${b}.reject[]`, `計劃 ${i + 1}・✕ 唔收乜（${(sc.reject || []).length} 項）`, (sc.reject || []).join('；'));
  add(`${b}.rules[]`, `計劃 ${i + 1}・規格要求（${(sc.rules || []).length} 項）`, (sc.rules || []).join('；'));
  add(`${b}.badge`, `計劃 ${i + 1}・紀念章規則`, sc.badge);
  if (sc.bonus) add(`${b}.bonus.text`, `計劃 ${i + 1}・特別獎勵`, sc.bonus.text);
  add(`${b}.enquiry`, `計劃 ${i + 1}・查詢聯絡`, sc.enquiry, '行政組／服務及發展組');
});
add('donate.paper.label', '紙本表格掣文字', d.paper && d.paper.label);
add('donate.paper.url', '紙本表格 PDF 連結', d.paper && d.paper.url, '籌委會・品牌推廣組');
add('donate.paper.note', '紙本表格說明', d.paper && d.paper.note);
add('donate.privacy', '私隱說明（資料去咗邊）', d.privacy);
add('donate.note', '頁尾備註', d.note);
add("audiences[].sections 含 'donate'", '邊幾類入口見到呢版',
  pc.audiences.filter(a => (a.sections || []).includes('donate')).map(a => a.name).join('、') +
  '（嘉賓冇：事前大額支票由大會安排）', '籌委會');

const PLACEHOLDER = [
  ['donate.paper.url', '而家指去地域主頁，未係實際 PDF'],
  ['donate.collect.place', '只寫「有蓋操場收集攤位」，未有攤位編號'],
  ['donate.schemes[0].rules[]', '最佳食用日期 2028-06-01 係由 2026 原文順延一年，未經確認']
];

const arg = process.argv.slice(2);
const w = s => [...String(s)].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - w(s)));
const clip = (s, n) => { let o = '', c = 0; for (const ch of String(s)) { const k = ch.charCodeAt(0) > 255 ? 2 : 1; if (c + k > n) { return o + '…'; } o += ch; c += k; } return o; };

if (arg.includes('--csv')) {
  const esc = s => '"' + String(s).replace(/"/g, '""') + '"';
  console.log(['JSON 位置', '內容係乜', '現時文字（示範）', '負責', '籌委會新文字（請填）'].map(esc).join(','));
  rows.forEach(r => console.log([r.p, r.what, r.val, r.who, ''].map(esc).join(',')));
} else if (arg.includes('--md')) {
  console.log('### 童心捐贈・文案交接表\n');
  console.log('> 程式已做好，文字請籌委會填。改最後一欄交返轉頭即可，唔使改程式。\n');
  console.log('| JSON 位置 | 內容係乜 | 現時文字（示範） | 負責 | 新文字 |');
  console.log('|---|---|---|---|---|');
  rows.forEach(r => console.log(`| \`${r.p}\` | ${r.what} | ${r.val.replace(/\|/g, '／')} | ${r.who} | |`));
  console.log('\n**一定要換嘅佔位：**\n');
  PLACEHOLDER.forEach(([p, why]) => console.log(`- \`${p}\` — ${why}`));
} else {
  const W = [34, 26, 62, 18];
  console.log('\n童心捐贈・文案交接表（程式已做好，文字請籌委會填）');
  console.log('─'.repeat(W.reduce((a, b) => a + b + 2, 0)));
  console.log(pad('JSON 位置', W[0]) + '  ' + pad('內容係乜', W[1]) + '  ' + pad('現時文字（示範）', W[2]) + '  ' + pad('負責', W[3]));
  console.log('─'.repeat(W.reduce((a, b) => a + b + 2, 0)));
  rows.forEach(r => console.log(pad(r.p, W[0]) + '  ' + pad(clip(r.what, W[1]), W[1]) + '  ' + pad(clip(r.val, W[2]), W[2]) + '  ' + pad(r.who, W[3])));
  console.log('─'.repeat(W.reduce((a, b) => a + b + 2, 0)));
  console.log(`\n共 ${rows.length} 個文案欄位。\n`);
  console.log('一定要換嘅佔位：');
  PLACEHOLDER.forEach(([p, why]) => console.log('  ⚠️  ' + pad(p, 34) + why));
  console.log('\n改法：改 tools/build_pc2027_demo.js 嘅 donate 區 → node tools/build_pc2027_demo.js\n');
}
