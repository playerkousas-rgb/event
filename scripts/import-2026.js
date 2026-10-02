#!/usr/bin/env node
/* scripts/import-2026.js — 一次性把 data/isd_2026.json 寫入 2026 Google Sheet
 *
 * 用法：
 *   node scripts/import-2026.js --dry-run          # 只產生映射結果（唔會連網）
 *   node scripts/import-2026.js                    # 真正寫入（需要網絡）
 *   ISD2026_GAS_URL=... ISD2026_APIKEY=... node scripts/import-2026.js
 *
 * 後端只接受 event_id=isd_2026；2027 Sheet 會被 Apps Script 直接拒絕。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const mapper = require(path.join(root, 'js', '42-import-2026.js'));

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwT1dZuvymSVaHrBmW31RcnKxWoNHSabRnJVxIkPCevlHvIsPVYJFBDjgwhPS5t_ZQ8mw/exec';
const DEFAULT_API_KEY = 'scout_e6451624b1f340078ec6a111';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const gasUrl = process.env.ISD2026_GAS_URL || DEFAULT_GAS_URL;
const apiKey = process.env.ISD2026_APIKEY || process.env.API_KEY || DEFAULT_API_KEY;
const updatedBy = process.env.IMPORT_2026_BY || 'scripts/import-2026.js';
const chunkSize = Number(process.env.IMPORT_2026_CHUNK || 80);

const json = JSON.parse(fs.readFileSync(path.join(root, 'data', 'isd_2026.json'), 'utf8'));
const sections = mapper.build2026ImportSections(json);
const counts = mapper.import2026Counts(sections);
const jobs = mapper.chunk2026Sections(sections, chunkSize);

console.log('來源：data/isd_2026.json');
console.log('映射結果：', counts);
console.log('批次數：', jobs.length, '（每批最多', chunkSize, '行）');

if (dryRun) {
  const out = path.join(root, 'tmp-import-2026-preview.json');
  fs.writeFileSync(out, JSON.stringify({ counts, sections }, null, 2));
  console.log('--dry-run：已輸出映射預覽到', path.relative(root, out), '（唔會寫入 Google Sheet）');
  process.exit(0);
}

(async () => {
  let created = 0, updated = 0, unchanged = 0, audit = 0;
  const failed = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    let ok = false, last = null;
    for (let t = 0; t < 3 && !ok; t++) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'import2026Data', api_key: apiKey, event_id: 'isd_2026',
            updated_by: updatedBy, source: 'data/isd_2026.json', sections: job.sections
          })
        });
        last = await res.json();
        ok = !!(last && last.success);
      } catch (e) { last = { success: false, error: String(e) }; }
    }
    if (ok) {
      created += last.created || 0; updated += last.updated || 0;
      unchanged += last.unchanged || 0; audit += last.audit_rows || 0;
      console.log(`[${i + 1}/${jobs.length}] ${job.sheet}@${job.from} → 新增 ${last.created} / 更新 ${last.updated} / 相同 ${last.unchanged}`);
    } else {
      failed.push(`${job.sheet}@${job.from}: ${(last && last.error) || '未知錯誤'}`);
      console.error(`[${i + 1}/${jobs.length}] ${job.sheet}@${job.from} 失敗：${(last && last.error) || '未知錯誤'}`);
    }
  }
  console.log('—— 完成 ——');
  console.log('新增', created, '更新', updated, '相同略過', unchanged, 'Audit_Log 新增', audit, '行');
  if (failed.length) { console.error('失敗批次：', failed); process.exit(1); }

  try {
    const res = await fetch(`${gasUrl}?action=getImport2026Status&api_key=${encodeURIComponent(apiKey)}`);
    const st = await res.json();
    console.log('Google Sheet 現況：', JSON.stringify(st.counts), 'Audit_Log 行數：', st.audit_rows);
  } catch (e) { console.warn('狀態查詢失敗（寫入已完成）：', String(e)); }
})();
