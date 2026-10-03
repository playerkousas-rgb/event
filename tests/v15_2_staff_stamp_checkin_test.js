#!/usr/bin/env node
'use strict';
/* 2026 event-day regression: 行政組工作人員紀念章派發必須是精簡的嘉賓點名式流程。 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const stamps = read('js/40-souvenir-stamps.js');
const modal = read('js/43-checkin-modal.js');
const html = read('index.html');
let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };

const start = stamps.indexOf('renderStaffStampCheckinHTML(){');
const end = stamps.indexOf('refreshSouvenirStampsPanel(scope){');
ok(start >= 0 && end > start, '有獨立的工作人員派章簡化頁面');
const staffPanel = stamps.slice(start, end);
ok(staffPanel.includes("openStampCheckinModal('staff','group')") && staffPanel.includes('按全組成員點名'), '可直接按全組成員點名');
ok(staffPanel.includes("openStampCheckinModal('staff','booth')") && staffPanel.includes('按全攤位成員點名'), '可直接按全攤位成員點名');
ok(staffPanel.includes('姓名') && staffPanel.includes('組別／攤位'), '派章頁清楚說明只需姓名及組別／攤位');
ok(!staffPanel.includes('<table') && !staffPanel.includes('匯入 EXCEL'), '工作人員派章頁不再顯示冗長表格或匯入工具');

ok(modal.includes("rowMeta:isStaff?(r=>`組別／攤位：${r.booth||r.group||'未分組'}`):null"), '工作人員快速點名列只顯示組別／攤位及姓名');
ok(modal.includes("{k:'group',label:'按全組成員'}") && modal.includes("{k:'booth',label:'按全攤位成員'}"), '點名 modal 提供組別及攤位排序');
ok(modal.includes("if(this._ckSort==='booth')") && modal.includes("String(a.booth||'未編攤位')"), '攤位排序按實際攤位欄位而非組別');
ok(modal.includes('opts.initialSort||'), '兩個快捷鍵可帶入相應的預設排序');
ok(html.includes('js/40-souvenir-stamps.js?v=20261003c') && html.includes('js/43-checkin-modal.js?v=20261003c'), '更新兩個前端檔案的快取版本');

console.log(`V15_2_STAFF_STAMP_CHECKIN_OK (${checks} checks)`);
