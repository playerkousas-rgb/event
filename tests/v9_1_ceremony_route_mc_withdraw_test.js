#!/usr/bin/env node
'use strict';
/* 2026 ceremony regression: current MC material, inspection route and other uniformed teams. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));
let n = 0;
const ok = (condition, message) => { assert.ok(condition, message); n++; };

const ceremony = data.ceremony || {};
const sourceText = JSON.stringify({ceremony, participants: data.participants || []});

// ① Three current MC scripts remain embedded and their shipped PDFs open locally.
const mc = ceremony.mc_scripts || [];
ok(Array.isArray(mc) && mc.length === 3, '3 份司儀稿已置入');
ok(mc.find(x => x.part === '第一部分')?.version === 'V5', '優異旅團頒獎 = V5');
ok(mc.find(x => x.part === '第二部分')?.version === 'V4', '會操檢閱典禮 = V4');
ok(mc.find(x => x.part === '第三部分')?.version === 'V2', '自助餐 = V2');
mc.forEach(s => {
  ok(s.content && s.content.trim(), `${s.part} 有內建全文`);
  ok(s.file_url && fs.existsSync(path.join(root, s.file_url)), `${s.part} PDF 已隨 APP 提供`);
});

// ② The separate inspection-route tab uses the current route image and wording.
const route = ceremony.inspection_route || {};
ok(Array.isArray(route.steps) && route.steps.length >= 5, '檢閱路線有完整步驟');
ok(/旗隊/.test(JSON.stringify(route.steps)), '路線包含地域旗隊一段');
ok(Array.isArray(route.inspection_questions) && route.inspection_questions.length === 3, '檢閱官 3 條問題已記錄');
ok(/區永樑/.test(route.reviewing_officer || ''), '檢閱官為區永樑先生');
ok(route.image === 'assets/ceremony/inspection_route_2026.svg' && fs.existsSync(path.join(root, route.image)), '檢閱路線圖已存在於 APP');
ok(!(route.change_summary || '').trim(), '沒有過時的路線修改說明');

// ③ CSD Cadet Corps is absent from all 2026 ceremony and participant data.
ok(!/民眾安全服務隊|民安隊|\bCSD\b|Cadet Corps/i.test(sourceText), '2026 典禮及旅團資料沒有已退出制服團體');
ok(Array.isArray(ceremony.ug_units) && ceremony.ug_units.length === 3, '其他制服團體派隊名單保留 3 隊');
ok(Array.isArray(ceremony.ug_guests) && ceremony.ug_guests.length === 8, '其他制服團體嘉賓名單已置入');
ok(!/民眾安全服務隊|民安隊|\bCSD\b|Cadet Corps/i.test(JSON.stringify(ceremony.ug_guests)), '其他制服團體嘉賓名單沒有已退出單位');
ok(!Array.isArray(ceremony.attendance_changes), '不顯示過時的出席變動通知');

// ④ Front-end exposes current ceremony content, the route, and embedded MC PDF links.
const ui = fs.readFileSync(path.join(root, 'js/35-ceremony.js'), 'utf8');
ok(/ceremonyRouteHTML/.test(ui) && /ceremonyMcScriptsHTML/.test(ui), '典禮頁有路線及司儀稿版面');
ok(/renderCeremonyUg/.test(ui) && /其他制服團體/.test(ui), '典禮頁有其他制服團體版面');
ok(/file_url/.test(ui) && /開啟 PDF/.test(ui), '司儀稿保留 PDF 開啟按鈕');

console.log('✓ 2026 ceremony / route / MC / other-uniformed-teams：' + n + ' 項通過');
