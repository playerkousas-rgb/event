#!/usr/bin/env node
'use strict';
/**
 * v8.3 驗證：
 *  (A) 用戶管理可見範圍
 *      超管＝全部人（包括自己）｜執副／主席／顧問／管理員＝除超管以外全部人
 *      副主席＝只睇自己組｜總主任＝自己組（不包括副主席）｜主任＝自己組普通工作人員
 *  (B) 會議議程／紀錄內建 JSON（data/meeting_records.json）＋ 頁內渲染，不彈出 Drive APP
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const htmlSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const html = htmlSrc + '\n' + [...htmlSrc.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)]
  .map(m => fs.readFileSync(path.join(root, m[1]), 'utf8')).join('\n');

function slice(startMarker, endMarker) {
  const i = html.indexOf(startMarker);
  const j = html.indexOf(endMarker, i);
  assert(i > 0 && j > i, `cannot locate segment: ${startMarker}`);
  return html.slice(i, j);
}

const ROLE_HIERARCHY_SRC = html.match(/const ROLE_HIERARCHY=\{[^}]+\};/)[0];
const NORMALIZE_SRC = slice('function normalizeGroupName(value){', '// 2026 架構固定組別');
const ESCAPE_SRC = html.match(/function escapeHtml\(s\)\{.*?\}\n/s)[0].split('\n')[0];

// js/ 拆檔後方法之間有 Object.assign 的 "," 分隔行；貼入 class Stub 前要清走
const stripCommaLines = (src) => src.replace(/^[ \t]*,[ \t]*$/gm, '');
const userMethods = stripCommaLines(slice('  canSeeAllUsers(){', '  async ensureCommitteeAccounts()'));
const meetingMethods = stripCommaLines(slice('  meetingRecordsKey(){', '  extractDriveFolderId(link){'));

const code = `
${NORMALIZE_SRC}
${ROLE_HIERARCHY_SRC}
${ESCAPE_SRC}
class Stub {
  constructor(user, users, records){ this.currentUser=user; this.usersList=users; this.meetingRecords=records; this.currentEvent={event_id:'isd_2026'}; }
  roleLevel(r){ return ROLE_HIERARCHY[r]||0; }
  isSuperAdmin(){ return this.currentUser?.role==='super_admin'; }
  isAdmin(){ return ['super_admin','advisor','admin','chairperson','executive_vice_chairperson'].includes(this.currentUser?.role); }
  getMeetings(){ return []; }
  renderMeetingsList(){}
${userMethods}
${meetingMethods}
}
Stub;
`;
const Stub = vm.runInNewContext(code, { console });

/* ---------- (A) 可見範圍 ---------- */
console.log('A. 用戶管理可見範圍...');
const users = [
  { user_id: 'root', name: '超管', role: 'super_admin', group_name: '秘書處' },
  { user_id: 'chair', name: '主席', role: 'chairperson', group_name: '主席及執行副主席' },
  { user_id: 'exec', name: '執副', role: 'executive_vice_chairperson', group_name: '主席及執行副主席' },
  { user_id: 'admin1', name: '管理員', role: 'admin', group_name: '秘書處' },
  { user_id: 'vc_a', name: '副主席A', role: 'vice_chairperson', group_name: '協調組' },
  { user_id: 'vc_b', name: '副主席B', role: 'vice_chairperson', group_name: '行政組' },
  { user_id: 'gd_a', name: '總主任A', role: 'general_director', group_name: '協調組' },
  { user_id: 'dir_a', name: '主任A', role: 'director', group_name: '協調組' },
  { user_id: 'staff_a', name: '工作人員A', role: 'staff', group_name: '協調組' },
  { user_id: 'staff_b', name: '工作人員B', role: 'staff', group_name: '行政組' }
];
const ids = list => list.map(u => u.user_id).sort();
const as = uid => new Stub(users.find(u => u.user_id === uid), users, null);

// 超管：全部人（包括自己）
assert.deepStrictEqual(ids(as('root').visibleUsersForManager()), ids(users), '超管應睇到全部人（包括自己）');

// 執副／主席／顧問／管理員：除超管以外全部人
const expectNoSuper = ids(users.filter(u => u.role !== 'super_admin'));
['exec', 'chair', 'admin1'].forEach(uid => {
  assert.deepStrictEqual(ids(as(uid).visibleUsersForManager()), expectNoSuper, uid + ' 應睇到除超管以外全部人');
});

// 副主席：只睇自己組（本組全部職級）
assert.deepStrictEqual(ids(as('vc_a').visibleUsersForManager()),
  ['dir_a', 'gd_a', 'staff_a', 'vc_a'].sort(), '副主席應只睇自己組');

// 總主任：自己組，唔包括副主席
const gdSeen = ids(as('gd_a').visibleUsersForManager());
assert.deepStrictEqual(gdSeen, ['dir_a', 'gd_a', 'staff_a'].sort(), '總主任應睇自己組但不包括副主席');
assert(!gdSeen.includes('vc_a'), '總主任不應睇到副主席');

// 主任：自己組普通工作人員
assert.deepStrictEqual(ids(as('dir_a').visibleUsersForManager()), ['staff_a'], '主任應只睇自己組普通工作人員');

// 工作人員：無權
assert.strictEqual(as('staff_a').visibleUsersForManager().length, 0, '工作人員不應睇到用戶名單');

// 超管帳戶對其他人完全隱藏
['exec', 'chair', 'admin1', 'vc_a', 'gd_a', 'dir_a'].forEach(uid => {
  assert(!ids(as(uid).visibleUsersForManager()).includes('root'), uid + ' 不應睇到超管帳戶');
});

/* ---------- (B) 內建議程／紀錄 JSON ---------- */
console.log('B. 內建議程／會議紀錄 JSON...');
const recPath = path.join(root, 'data/meeting_records.json');
assert(fs.existsSync(recPath), '缺少 data/meeting_records.json');
const records = JSON.parse(fs.readFileSync(recPath, 'utf8'));
assert(Array.isArray(records.meetings) && records.meetings.length >= 5, 'meeting_records.json 應包含全部會議');
const isd = JSON.parse(fs.readFileSync(path.join(root, 'data/isd_2026.json'), 'utf8'));
isd.meetings.forEach(m => {
  const r = records.meetings.find(x => x.meeting_id === m.meeting_id);
  assert(r, `會議 ${m.meeting_id} 未有內建 JSON 議程／紀錄`);
  assert(Array.isArray(r.agenda_items) && r.agenda_items.length, `會議 ${m.meeting_id} 內建議程項目為空`);
  assert(Array.isArray(r.minutes_sections), `會議 ${m.meeting_id} 缺少 minutes_sections`);
});

const app = new Stub(users[0], users, records);
const meeting = { meeting_id: 'm_1', meeting_number: 1, title: '第1次籌備委員會議', agenda: '', minutes: '' };
const agendaHtml = app.renderBuiltInAgendaHtml(meeting, 'card');
assert(agendaHtml.includes('利益申報政策'), '內建議程未渲染議程項目');
// 摘要為預設；全文需要用家主動按（頁內開啟 / Drive 跳轉），唔會自動彈出
assert(agendaHtml.includes('睇全文（頁內開啟）'), '內建議程缺少「睇全文」入口');
assert(agendaHtml.includes('toggleInlineDrivePreview'), '「睇全文」應可頁內開啟原檔');
const minutesHtml = app.renderBuiltInMinutesHtml(meeting, 'card');
assert(minutesHtml.includes('議決事項') && minutesHtml.includes('跟進事項'), '內建紀錄未渲染議決／跟進事項');
assert(minutesHtml.includes('睇全文（頁內開啟）'), '內建紀錄缺少「睇全文」入口');
// 卡片與詳情各自獨立 id，唔會撞
assert(app.renderBuiltInAgendaHtml(meeting, 'detail').includes('mrfull-m_1-agenda-detail'), '詳情頁全文容器 id 應獨立');

// 檔案改為頁內 iframe 預覽，唔會彈出 Drive APP
const filesHtml = app.renderMeetingFilesHtml({
  meeting_id: 'm_1', meeting_number: 1,
  agenda_file_name: 'a.pdf', agenda_file_url: 'https://drive.google.com/file/d/ABC123/view',
  classified_files: [], attachments: []
});
assert(filesHtml.includes('toggleInlineDrivePreview'), '檔案列表應提供頁內預覽');
assert(!filesHtml.includes('/view" target="_blank"'), '檔案列表不應以新分頁開啟 Drive');

/* ---------- (C) 介面接線 ---------- */
console.log('C. 介面接線...');
assert(html.includes("app.toggleMeetingInline('${m.meeting_id}','agenda')"), '會議卡片缺少內建議程展開按鈕');
assert(html.includes("app.toggleMeetingInline('${m.meeting_id}','minutes')"), '會議卡片缺少內建紀錄展開按鈕');
assert(html.includes('await this.loadMeetingRecords();'), 'loadEventData 未載入 meeting_records.json');
assert(html.includes('toggleMeetingDetailPreview'), '會議詳情缺少頁內預覽');
assert(html.includes('downloadDriveFile'), '缺少 Drive 直接下載（免彈 APP）');

console.log('=== v8.3 用戶可見範圍 + 內建會議 JSON 全部檢查通過 ===');
