#!/usr/bin/env node
'use strict';
/* v15.1 回歸測試（2026-10-02）：版本號同快取失效一致性
   起因：index.html 頂 BAR 徽章寫死 v6.1，後端 Code.gs 已行到 v15.1，兩邊脫節咗好耐；
   同時改咗 JS 但無更新 <script src="...?v=">，用戶瀏覽器會食住舊快取，見唔到新功能。
   ① 頂 BAR 版本徽章必須同 apps-script/Code.gs 嘅 GS_VERSION 主版本一致
   ② index.html 註解寫嘅版本都要跟住一致（唔好留舊版號誤導人）
   ③ 所有本機 js/ <script> 都要有 ?v= cache-buster（唔可以漏）
   ④ 全部 cache-buster 必須係同一個值（統一 bump，避免「改咗邊幾個」靠估而漏更新）
   ⑤ js/ 資料夾每個 .js 都要喺 index.html 入面被引用（新增檔案唔好漏掛） */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const gs = read('apps-script/Code.gs');
let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }

/* ══════════ ① 後端版本 → 前端徽章 ══════════ */
const gsVer = (gs.match(/const\s+GS_VERSION\s*=\s*['"]v([0-9]+\.[0-9]+)/) || [])[1];
ok(gsVer, '① Code.gs 搵到 GS_VERSION（格式 vX.Y-日期）');

const badge = (html.match(/<span[^>]*>v([0-9]+\.[0-9]+)<\/span>/) || [])[1];
ok(badge, '① index.html 頂 BAR 搵到版本徽章 <span>vX.Y</span>');
ok(
  badge === gsVer,
  `① 版本徽章 v${badge} 必須同後端 GS_VERSION v${gsVer} 一致（改後端版本時記得一齊改 index.html 個徽章）`
);

/* ══════════ ② 註解版本號唔好留舊 ══════════ */
const staleComments = [...html.matchAll(/<!--[\s\S]*?-->/g)]
  .map(m => m[0])
  .filter(c => /童軍活動管理系統・v([0-9]+\.[0-9]+)・/.test(c))
  .map(c => (c.match(/童軍活動管理系統・v([0-9]+\.[0-9]+)・/) || [])[1])
  .filter(v => v !== gsVer);
ok(
  staleComments.length === 0,
  `② index.html 註解仲寫住舊版本 v${staleComments.join(', v')}（應為 v${gsVer}）`
);

/* ══════════ ③④ cache-buster ══════════ */
const localScripts = [...html.matchAll(/<script[^>]*\ssrc="(js\/[^"]+)"/gi)].map(m => m[1]);
ok(localScripts.length > 0, '③ index.html 有本機 js/ <script> 標籤');

const missing = localScripts.filter(s => !/\?v=/.test(s));
ok(
  missing.length === 0,
  `③ 以下 <script> 冇 ?v= cache-buster：${missing.join(', ')}`
);

const versions = [...new Set(localScripts.map(s => (s.match(/\?v=([^"&]+)/) || [])[1]))];
ok(
  versions.length === 1,
  `④ js/ cache-buster 值唔統一，出現咗 ${versions.length} 個：${versions.join(', ')}` +
  '（改任何 JS 都應該一次過將全部 ?v= bump 到同一個新值，唔好淨係改自己動過嗰幾個）'
);

/* ══════════ ⑤ 唔好漏掛新 JS ══════════ */
const referenced = new Set(localScripts.map(s => s.split('?')[0].replace(/^js\//, '')));
const onDisk = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).sort();
const unreferenced = onDisk.filter(f => !referenced.has(f));
ok(
  unreferenced.length === 0,
  `⑤ js/ 有檔案未喺 index.html 引用：${unreferenced.join(', ')}`
);

console.log(`v15.1 版本號／快取一致性測試通過（${n} 項）｜版本 v${gsVer}｜cache-buster ?v=${versions[0]}｜JS ${onDisk.length} 個`);
