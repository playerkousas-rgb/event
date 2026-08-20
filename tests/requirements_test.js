#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

console.log('=== Running Full Requirements Validation ===');

// Check 1: Guest prompt & initial credentials
console.log('1. Guest prompt & credentials...');
assert(html.includes('初始帳戶') && html.includes('初始密碼') && html.includes('1234'), 'Missing initial credentials prompt');
assert(html.includes('如需要開戶請找所屬組別的總主任'), 'Missing account opening contact info');

// Check 2: Org chart tree & 2 advisors
console.log('2. Org chart tree & 2 advisors...');
assert(html.includes('組織架構樹形圖 (各副主席可新增下屬)'), 'Missing org chart title');
assert(html.includes('黃偉安') && (html.includes('何家騏') || html.includes('何家麒')), 'Missing 2 advisors');

// Check 3: Two upload modes (Direct upload & Drive LINK)
console.log('3. Two upload modes (Direct Upload & Link)...');
assert(html.includes('方式一：直接上傳檔案') || html.includes('直接上傳檔案'), 'Missing direct upload label');
assert(html.includes('方式二：') || html.includes('提供檔案指向連結 LINK') || html.includes('提供檔案連結 LINK'), 'Missing link upload label');

// Check 4: Accident Report Form in Crisis Management (acc-rpt201907c.pdf)
console.log('4. Accident Report Form in Crisis Management...');
assert(html.includes('意外事件報告表'), 'Missing Accident Report Form in HTML');
assert(html.includes('renderCrisisAccidents'), 'Missing renderCrisisAccidents JS method');
assert(html.includes('openAccidentReportForm'), 'Missing openAccidentReportForm JS method');
assert(html.includes('submitAccidentReportForm'), 'Missing submitAccidentReportForm JS method');
assert(html.includes('printAccidentReport'), 'Missing printAccidentReport JS method');
assert(html.includes('deleteAccidentReport'), 'Missing deleteAccidentReport JS method');
assert(html.includes('exportAccidentReports'), 'Missing exportAccidentReports JS method');

// Check 5: Meetings drive links & renaming
console.log('5. Meetings Drive links & group uploads renaming...');
assert(html.includes('各小組資料'), 'Missing 各小組資料 tab name');
assert(html.includes('上傳本組資料'), 'Missing 上傳本組資料 form title');
assert(html.includes('上傳資料'), 'Missing 上傳資料 submit button');
assert(html.includes('備註 (文字)'), 'Missing 備註 (文字) textarea label');
assert(html.includes('.ppt') && html.includes('.png') && html.includes('.jpg'), 'Missing PPT / image accepts in upload input');

// Check 6: Check JSON data files
const isd = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));
const mock = JSON.parse(fs.readFileSync(path.join(root, 'data/mock_demo.json'), 'utf8'));
assert(Array.isArray(isd.crisis.accidents) && isd.crisis.accidents.length === 0, 'ISD 2026 must not contain mock accident records');
assert(Array.isArray(mock.crisis.accidents) && mock.crisis.accidents.length > 0, 'mock.crisis missing accidents array');
assert(isd.meetings.every(m => m.agenda_file_url && m.minutes_file_url), 'isd.meetings not all linked to Drive');

console.log('=== ALL UNIT & INTEGRATION CHECKS PASSED ===');
