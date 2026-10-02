#!/usr/bin/env node
/* tests/import_2026_migration_test.js
   2026 一次性資料遷移（import2026Data）離線驗收：
   ① data/isd_2026.json → 各分頁逐欄映射（103 嘉賓／frozen 工作人員／31 攤位／4 受邀隊伍／日程／膳食）
   ② 第一次執行＝新增；第二次執行＝全部 unchanged（唔會重複寫入）
   ③ 改一行再執行＝只更新該行
   ④ 每次寫入都有 Audit_Log 紀錄（create／update／summary／run）
   ⑤ 只寫 2026：event_id 唔係 isd_2026、或試算表係 2027 → 拒絕
   做法：用假的 SpreadsheetApp 執行真正的 apps-script/Code.gs。 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const mapper = require(path.join(root, 'js', '42-import-2026.js'));
const sourceJson = JSON.parse(fs.readFileSync(path.join(root, 'data', 'isd_2026.json'), 'utf8'));

/* ── 假 Google Sheet ───────────────────────────────────────────── */
function makeSheet(name) {
  const data = []; // data[0] = headers
  const api = {
    _name: name,
    _data: data,
    getName: () => name,
    appendRow(row) { data.push(row.slice()); },
    getLastRow: () => data.length,
    getLastColumn: () => (data[0] ? data[0].length : 0),
    setFrozenRows() { return api; },
    getDataRange() { return api.getRange(1, 1, Math.max(data.length, 1), Math.max(data[0] ? data[0].length : 1, 1)); },
    getRange(r, c, nr, nc) {
      nr = nr === undefined ? 1 : nr; nc = nc === undefined ? 1 : nc;
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = data[r - 1 + i] || [];
            const line = [];
            for (let j = 0; j < nc; j++) line.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]);
            out.push(line);
          }
          return out;
        },
        setValues(values) {
          values.forEach((line, i) => {
            const ri = r - 1 + i;
            if (!data[ri]) data[ri] = [];
            line.forEach((v, j) => { data[ri][c - 1 + j] = v; });
          });
          return this;
        },
        setValue(v) { return this.setValues([[v]]); },
        setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; },
        setNote() { return this; }
      };
    }
  };
  return api;
}

function makeSpreadsheet() {
  const sheets = new Map();
  return {
    _sheets: sheets,
    getSheetByName: n => sheets.get(n) || null,
    insertSheet(n) { const s = makeSheet(n); sheets.set(n, s); return s; },
    getSheets: () => [...sheets.values()]
  };
}

function loadCode(ss) {
  const src = fs.readFileSync(path.join(root, 'apps-script', 'Code.gs'), 'utf8');
  const ctx = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    Utilities: { computeDigest: () => [1, 2, 3], DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, base64Encode: () => 'x' },
    ContentService: { createTextOutput: t => ({ setMimeType: () => t }), MimeType: { JSON: 'json' } },
    MailApp: { sendEmail() {} }, UrlFetchApp: { fetch: () => ({ getContentText: () => '' }) },
    Session: { getActiveUser: () => ({ getEmail: () => 'test@test' }) },
    Logger: { log() {} }, Date, JSON, Math, String, Number, Array, Object, Boolean, isNaN, parseInt, parseFloat
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'Code.gs' });
  return ctx;
}

let n = 0;
const ok = (cond, msg) => { if (!cond) throw new Error('✖ ' + msg); n++; };

/* ── ① 映射 ───────────────────────────────────────────────────── */
const sections = mapper.build2026ImportSections(sourceJson);
const counts = mapper.import2026Counts(sections);
ok(counts.Guests === 103, `嘉賓應 103 位（實際 ${counts.Guests}）`);
ok(counts.Activities === 31, `攤位應 31 個（實際 ${counts.Activities}）`);
ok(counts.Roster_Lists === 4, `受邀隊伍應 4 隊（實際 ${counts.Roster_Lists}）`);
ok(counts.Schedule === (sourceJson.schedule || []).length && counts.Schedule > 0, '日程應全部映射');
ok(counts.Staff === (sourceJson.staff.event_staff_roster || []).length && counts.Staff > 0, 'frozen 工作人員名單應全部映射');
ok(counts.Staff_Meals === (sourceJson.meals || []).length && counts.Staff_Meals > 0, '工作人員膳食應全部映射');
ok(sections.Guests.every(g => g.event_id === 'isd_2026'), '所有嘉賓行必須 event_id=isd_2026');
ok(sections.Guests.every(g => g.name && g.guest_id), '嘉賓行必須有 ID 及姓名');
// 逐欄寫入，而非整份 JSON 塞一欄
ok(Object.keys(sections.Guests[0]).length >= 10, '嘉賓必須逐欄寫入（非單一欄 JSON）');
ok(!Object.keys(sections.Guests[0]).some(k => /^(json|payload|raw)$/i.test(k)), '嘉賓不可有整份 JSON 欄位');
ok(sections.Activities.every(a => a.type === 'booth'), '攤位行 type 必須 booth');
// 外間團體：沒有預定姓名就保留空白
const ugRow = JSON.parse(sections.Roster_Lists[0].row_json);
ok(Object.prototype.hasOwnProperty.call(ugRow, 'unit') && ugRow.unit, '受邀隊伍必須有單位名');
ok(!Object.prototype.hasOwnProperty.call(ugRow, 'name'), '受邀隊伍沒有預定出席者姓名欄，應點名時才填寫');
// 名單 row_id 要同 41-roster-lists 的 row key 對得上
ok(sections.Roster_Lists.every(r => r.row_id.indexOf('isd_2026_participants_') === 0 && r.list_key === 'participants'),
  '受邀隊伍必須寫入共用名單引擎 list_key=participants');

/* ── ② 第一次寫入 ─────────────────────────────────────────────── */
const ss = makeSpreadsheet();
ss.insertSheet('Events').appendRow(['event_id', 'event_name']);
ss.getSheetByName('Events').appendRow(['isd_2026', '2026 港島童軍繽紛日']);
const ctx = loadCode(ss);

const run1 = ctx.import2026Data({ event_id: 'isd_2026', updated_by: '測試', sections: JSON.parse(JSON.stringify(sections)) });
ok(run1.success, '第一次 import2026Data 應成功：' + JSON.stringify(run1.error || ''));
const expectTotal = Object.values(counts).reduce((a, b) => a + b, 0);
ok(run1.created === expectTotal, `第一次應全部新增 ${expectTotal}（實際 ${run1.created}）`);
ok(run1.updated === 0 && run1.unchanged === 0, '第一次不應有更新／略過');
ok(ss.getSheetByName('Guests')._data.length - 1 === 103, 'Guests 分頁應有 103 行');
ok(ss.getSheetByName('Activities')._data.length - 1 === 31, 'Activities 分頁應有 31 行攤位');
ok(ss.getSheetByName('Roster_Lists')._data.length - 1 === 4, 'Roster_Lists 應有 4 行受邀隊伍');
ok(ss.getSheetByName('Staff_Meals')._data.length - 1 === counts.Staff_Meals, 'Staff_Meals 應有全部膳食資料');

// 欄位對位：Guests 的 name 欄真係人名
const gHeaders = ss.getSheetByName('Guests')._data[0];
const gRow = ss.getSheetByName('Guests')._data[1];
ok(gRow[gHeaders.indexOf('name')] === sections.Guests[0].name, 'Guests.name 欄位對位正確');
ok(gRow[gHeaders.indexOf('event_id')] === 'isd_2026', 'Guests.event_id 欄位對位正確');

/* ── ④ Audit_Log ──────────────────────────────────────────────── */
const audit = ss.getSheetByName('Audit_Log');
ok(!!audit, 'Audit_Log 分頁必須存在');
const auditRows = audit._data.slice(1);
ok(auditRows.length >= expectTotal, `Audit_Log 應有每行寫入紀錄（${auditRows.length} >= ${expectTotal}）`);
ok(auditRows.some(r => r[3] === 'import2026:create'), 'Audit_Log 應有 create 紀錄');
ok(auditRows.some(r => r[3] === 'import2026:summary'), 'Audit_Log 應有分頁匯總紀錄');
ok(auditRows.some(r => r[3] === 'import2026:run'), 'Audit_Log 應有整次執行紀錄');
ok(auditRows.every(r => String(r[5] || '').length > 0), 'Audit_Log 每行都要有時間');

/* ── ② 重複執行：冪等 ─────────────────────────────────────────── */
const auditBefore = audit._data.length;
const run2 = ctx.import2026Data({ event_id: 'isd_2026', updated_by: '測試', sections: JSON.parse(JSON.stringify(sections)) });
ok(run2.success, '第二次 import2026Data 應成功');
ok(run2.created === 0, `第二次不應再新增（實際 ${run2.created}）`);
ok(run2.unchanged === expectTotal, `第二次應全部略過（實際 ${run2.unchanged}）`);
ok(ss.getSheetByName('Guests')._data.length - 1 === 103, '重複執行後 Guests 仍然 103 行（不重複寫入）');
ok(audit._data.length > auditBefore, '重複執行仍會寫入匯總 Audit_Log');

/* ── ③ 有改動就更新該行 ───────────────────────────────────────── */
const modified = JSON.parse(JSON.stringify(sections));
modified.Guests[0].note = '改咗備註';
const run3 = ctx.import2026Data({ event_id: 'isd_2026', updated_by: '測試', sections: modified });
ok(run3.updated === 1 && run3.created === 0, `只應更新 1 行（實際 updated=${run3.updated} created=${run3.created}）`);
const gRow2 = ss.getSheetByName('Guests')._data[1];
ok(gRow2[gHeaders.indexOf('note')] === '改咗備註', '更新後內容正確');
ok(audit._data.slice(1).some(r => r[3] === 'import2026:update'), 'Audit_Log 應有 update 紀錄');

/* 現場點名資料不被遷移覆蓋 */
const ciIdx = gHeaders.indexOf('checked_in');
ss.getSheetByName('Guests')._data[1][ciIdx] = 'Y';
ctx.import2026Data({ event_id: 'isd_2026', updated_by: '測試', sections: JSON.parse(JSON.stringify(sections)) });
ok(ss.getSheetByName('Guests')._data[1][ciIdx] === 'Y', '重跑遷移不可清走現場點名紀錄');

/* ── ⑤ 只寫 2026 ──────────────────────────────────────────────── */
const bad = ctx.import2026Data({ event_id: 'isd_2027', sections: { Guests: sections.Guests.slice(0, 1) } });
ok(!bad.success && /isd_2026/.test(bad.error || ''), '非 2026 的 event_id 必須拒絕');

const badRow = ctx.import2026Data({ event_id: 'isd_2026', sections: { Guests: [Object.assign({}, sections.Guests[0], { event_id: 'isd_2027' })] } });
ok(badRow.results.Guests && badRow.results.Guests.error, '含 2027 行的分頁必須拒絕');

const ss2027 = makeSpreadsheet();
ss2027.insertSheet('Events').appendRow(['event_id', 'event_name']);
ss2027.getSheetByName('Events').appendRow(['isd_2027', '2027']);
const ctx2027 = loadCode(ss2027);
const blocked = ctx2027.import2026Data({ event_id: 'isd_2026', sections: { Guests: sections.Guests.slice(0, 1) } });
ok(!blocked.success && /2027/.test(blocked.error || ''), '2027 試算表必須拒絕 import2026Data');
ok(!ss2027.getSheetByName('Guests'), '2027 試算表不可建立 Guests 分頁');

/* ── 狀態查詢 ─────────────────────────────────────────────────── */
const st = ctx.getImport2026Status();
ok(st.success && st.counts.Guests === 103, 'getImport2026Status 應回報 Guests 103 行');
ok(st.audit_rows > 0 && st.last_run && st.last_run.at, 'getImport2026Status 應回報 Audit_Log 及最後執行時間');

/* ── 後端其他動作仍然可用 ─────────────────────────────────────── */
ok(typeof ctx.saveRecord === 'function' && typeof ctx.saveBatchRecords === 'function', 'saveRecord／saveBatchRecords 必須保留');
const sr = ctx.saveRecord({ module: 'Guests', record: { guest_id: 'guest_new_001', event_id: 'isd_2026', name: '現場加名嘉賓' } });
ok(sr.success, 'saveRecord 可對 Guests 加名');
ok(ss.getSheetByName('Guests')._data.length - 1 === 104, '加名後 Guests 應 104 行');
const batch = ctx.saveBatchRecords({ records: [{ module: 'Guests', record: { guest_id: 'guest_new_002', event_id: 'isd_2026', name: '批次加名' } }] });
ok(batch.success && batch.count === 1, 'saveBatchRecords 可用');
ok(ss.getSheetByName('Audit_Log')._data.slice(1).some(r => r[2] === 'guest_new_001'), 'saveRecord 寫入亦有 Audit_Log');

/* ── getEventData 要回傳新分頁（前端先讀得返）────────────────── */
const all = ctx.getEventAllData('isd_2026');
ok(Array.isArray(all.Guests) && all.Guests.length >= 103, 'getEventData 必須回傳 Guests');
ok(Array.isArray(all.Staff_Meals) && all.Staff_Meals.length === counts.Staff_Meals, 'getEventData 必須回傳 Staff_Meals');
ok(Array.isArray(all.Schedule) && all.Schedule.length === counts.Schedule, 'getEventData 必須回傳 Schedule');
ok(Array.isArray(all.Roster_Lists) && all.Roster_Lists.length === 4, 'getEventData 必須回傳 Roster_Lists');

console.log(`✓ import2026Data 遷移測試全部通過（${n} 項）`);
