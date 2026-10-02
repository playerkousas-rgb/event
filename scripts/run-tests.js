#!/usr/bin/env node
/* 一次過跑 tests/ 內所有測試（無第三方相依） */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const dir = path.join(__dirname, '..', 'tests');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
let failed = 0;
for (const f of files) {
  const r = cp.spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' });
  if (r.status === 0) console.log(`✓ ${f}`);
  else { failed++; console.error(`✖ ${f}\n${(r.stdout || '') + (r.stderr || '')}`); }
}
console.log(failed ? `\n${failed}/${files.length} 測試失敗` : `\n全部 ${files.length} 個測試通過`);
process.exit(failed ? 1 : 0);
