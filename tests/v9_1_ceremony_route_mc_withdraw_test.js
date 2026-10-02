/* v9.1 — 2026 最新變動：司儀稿 3 份、會操檢閱新路線、民安隊退出 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// ① 司儀稿
const mc = data.ceremony && data.ceremony.mc_scripts;
ok(Array.isArray(mc) && mc.length === 3, '3 份司儀稿已置入');
ok(mc.find(x => x.part === '第一部分').version === 'V5', '優異旅團頒獎 = V5');
ok(mc.find(x => x.part === '第二部分').version === 'V4', '會操檢閱典禮 = V4');
ok(mc.find(x => x.part === '第三部分').version === 'V2', '自助餐 = V2');
mc.forEach(s => ok(/drive\.google\.com/.test(s.file_url || ''), s.part + ' 有 Drive 連結'));

// 文件庫同步收錄新版本
const docs = data.documents || [];
ok(docs.some(d => d.source_file_id === '1bBdWpJy90PhWEDz2hq7Hd2dz-IuLGuYV'), '文件庫有 V5 優異旅團司儀稿');
ok(docs.some(d => d.source_file_id === '1UKPMQUj0amiZFBhyMfFXDZWrxdds8R5e'), '文件庫有 V2 自助餐司儀稿');
ok((docs.find(d => d.id === 'isd_final_1G67Aw7C') || {}).superseded_by === 'isd_final_1UKPMQUj', '自助餐 V1 已標示被取代');

// ② 檢閱新路線
const r = data.ceremony.inspection_route;
ok(r && Array.isArray(r.steps) && r.steps.length >= 5, '檢閱路線有完整步驟');
ok(/旗隊/.test(JSON.stringify(r.steps)), '新路線包含地域旗隊一段');
ok(Array.isArray(r.inspection_questions) && r.inspection_questions.length === 3, '檢閱官 3 條問題已記錄');
ok(/區永樑/.test(r.reviewing_officer || ''), '檢閱官為區永樑先生');
ok(r.image === 'assets/ceremony/inspection_route_2026.svg' && fs.existsSync(path.join(root, r.image)), '檢閱路線圖已存在於 APP');

// ③ 民安隊退出
const mas = (data.participants || []).find(p => /民眾安全服務隊/.test(p.unit || ''));
ok(mas && mas.status === 'withdrawn', '民安隊標示為退出');
ok(mas.headcount === 0 && mas.attendance_count === 0, '民安隊人數歸零');
ok(/未能出席/.test(mas.notes || ''), '民安隊備註說明原因');
ok(mas.original_headcount === 20, '保留原報人數 20 以供對帳');
ok((data.ceremony.attendance_changes || []).some(c => /民眾安全服務隊/.test(c.unit)), '典禮頁有出席變動提示');
ok((data.participants || []).length === 4, '受邀隊伍仍為 4 隊（保留紀錄不刪除）');

// ④ 遷移：退出狀態會寫入 Google Sheet 備註
const mig = fs.readFileSync(path.join(root, 'js/42-import-2026.js'), 'utf8');
ok(/已退出（不出席）/.test(mig), 'import2026Data 會把退出狀態寫入名單備註');

// ⑤ 前端渲染
const ceremony = fs.readFileSync(path.join(root, 'js/35-ceremony.js'), 'utf8');
ok(/ceremonyRouteHTML/.test(ceremony) && /ceremonyMcScriptsHTML/.test(ceremony), '典禮頁有路線及司儀稿版面');
ok(/ceremonyAttendanceChangeHTML/.test(ceremony), '典禮頁有出席變動提示版面');

console.log('✓ v9.1 ceremony route / MC scripts / 民安隊退出：' + n + ' 項通過');
