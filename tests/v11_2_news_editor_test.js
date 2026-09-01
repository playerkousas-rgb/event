#!/usr/bin/env node
'use strict';
/* v11.2 回歸測試：「最新消息」APP 內可改（執副以上＋秘書處）＋ 與「會議預告」互換位置
   ① 權限：執行副主席以上（系統管理員／管理員／顧問／主席／執行副主席）＋ 秘書處 ＝ 可改；其他人／訪客 ＝ 唔可以
   ② 橫幅：未選活動收起；有消息就顯示；無消息但有權限者見到「發佈」提示同修改掣
   ③ 儲存：寫本機 override ＋ POST 後端 saveEventNews；跟住橫幅即時更新
   ④ 版位互換：最新消息喺全站最頂橫幅、會議預告喺活動資訊橫幅內
   ⑤ loadEvents：後端 Events 表嘅 news 會蓋過 data/events.json 嘅預設消息 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map(match => {
    const attrs = match[1] || '';
    if (/src=/i.test(attrs)) {
      const src = ((attrs.match(/src="([^"]+)"/) || [])[1] || '').split('?')[0];
      return src.startsWith('js/') ? fs.readFileSync(path.join(root, src), 'utf8') : '';
    }
    return match[2];
  })
  .join('\n');
const core = scripts.replace(/const app=window\.app=new ScoutEventApp\(\);\s*[\s\S]*$/, '') + '\nglobalThis.TestApp=ScoutEventApp;';

const store = new Map();
function makeEl(id) {
  if (!store.has(id)) {
    const clsSet = new Set();
    store.set(id, {
      id,
      classList: {
        _set: clsSet,
        add(...c) { c.forEach(x => clsSet.add(x)); },
        remove(...c) { c.forEach(x => clsSet.delete(x)); },
        toggle(c, on) { if (on === undefined) on = !clsSet.has(c); on ? clsSet.add(c) : clsSet.delete(c); },
        contains(c) { return clsSet.has(c); }
      },
      style: {}, textContent: '', innerHTML: '', value: '',
      addEventListener() {}, querySelectorAll() { return []; }
    });
  }
  return store.get(id);
}
const localStorage = {
  getItem: k => store.has('ls:' + k) ? store.get('ls:' + k) : null,
  setItem: (k, v) => store.set('ls:' + k, String(v)),
  removeItem: k => store.delete('ls:' + k)
};
const posted = [];
const context = {
  console, localStorage,
  document: { getElementById: id => makeEl(id), querySelectorAll: () => [], addEventListener() {}, createElement: () => makeEl('_new'), body: { appendChild() {} } },
  window: {}, navigator: {}, location: {},
  URL: { createObjectURL() { return ''; } }, Blob: function Blob() {}, FileReader: function FileReader() {},
  setTimeout() {}, clearTimeout() {}, confirm: () => true, alert() {},
  fetch: async (url, opts) => {
    if (opts && opts.method === 'POST') { posted.push(JSON.parse(opts.body)); return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify({ success: true }) }; }
    return { ok: true, status: 200, json: async () => ({ success: true, data: [] }), text: async () => '{"success":true,"data":[]}' };
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(core, context);

const App = context.TestApp;
const app = Object.create(App.prototype);
Object.assign(app, {
  currentEvent: { event_id: 'isd_2026', event_name: '2026 港島童軍繽紛日', news: '活動如期舉行，敬請留意最新消息。' },
  currentUser: null, eventsList: [], eventData: {}, usersList: [],
  gasUrl: 'https://example.com/exec', apiKey: 'k', systemConfig: {}, _catSel: {}
});
app.isDemoEvent = () => false;

let n = 0;
function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); n++; }
const U = (role, group) => ({ user_id: 'u', name: '測試', role, group_name: group });

/* ---------- ① 權限：執副以上 ＋ 秘書處 ---------- */
app.currentUser = null;
ok(app.canEditEventNews() === false, '① 訪客唔可以改最新消息');
[['super_admin', ''], ['admin', '行政組'], ['advisor', '顧問團'], ['chairperson', '主席及執行副主席'], ['executive_vice_chairperson', '主席及執行副主席']].forEach(([r, g]) => {
  app.currentUser = U(r, g);
  ok(app.canEditEventNews() === true, `① ${r} 可以改最新消息（執副以上）`);
});
app.currentUser = U('staff', '秘書處');
ok(app.canEditEventNews() === true, '① 秘書處（即使只係工作人員）可以改最新消息');
app.currentUser = U('director', '秘書處');
ok(app.canEditEventNews() === true, '① 秘書處主任可以改最新消息');
[['vice_chairperson', '主題節目組'], ['general_director', '協調組'], ['director', '行政組'], ['staff', '行政組']].forEach(([r, g]) => {
  app.currentUser = U(r, g);
  ok(app.canEditEventNews() === false, `① ${r}（${g}）唔可以改最新消息`);
});

/* ---------- ② 橫幅顯示 ---------- */
const banner = makeEl('top-news-banner'), text = makeEl('dash-event-news'), actions = makeEl('news-admin-actions');
app.currentUser = null;
app.renderEventNews();
ok(!banner.classList.contains('hidden') && text.textContent.includes('活動如期舉行'), '② 有最新消息時橫幅顯示內容');
ok(actions.classList.contains('hidden'), '② 訪客見唔到修改掣');

app.currentEvent.news = '';
app.renderEventNews();
ok(banner.classList.contains('hidden'), '② 無消息＋無權限＝整條橫幅收起');

app.currentUser = U('executive_vice_chairperson', '主席及執行副主席');
app.renderEventNews();
ok(!banner.classList.contains('hidden') && !actions.classList.contains('hidden'), '② 無消息但有權限＝顯示橫幅同修改掣（可即時發佈）');

const savedEvent = app.currentEvent;
app.currentEvent = null;
app.renderEventNews();
ok(banner.classList.contains('hidden'), '② 未選活動（首頁）＝收起最新消息橫幅');
app.currentEvent = savedEvent;

/* ---------- ③ 儲存：本機即時 ＋ 寫後端 ---------- */
(async () => {
  makeEl('news-input').value = '  比賽改期至 11 月 8 日，詳情稍後公佈。  ';
  app.currentUser = U('staff', '秘書處');
  app.eventsList = [{ event_id: 'isd_2026', event_name: '2026 港島童軍繽紛日', news: '' }];
  await app.saveEventNews();
  ok(app.currentEvent.news === '比賽改期至 11 月 8 日，詳情稍後公佈。', '③ 儲存後活動物件即時更新（自動去頭尾空白）');
  ok(app.currentEvent.news_updated_by === '測試' && !!app.currentEvent.news_updated_at, '③ 記低更新人／時間');
  ok(text.textContent.includes('比賽改期'), '③ 橫幅即時顯示新消息');
  const req = posted.find(p => p.action === 'saveEventNews');
  ok(!!req && req.event_id === 'isd_2026' && req.news === '比賽改期至 11 月 8 日，詳情稍後公佈。' && req.updated_by === '測試',
    '③ 有 POST saveEventNews 去後端（唔使再改 GitHub JSON）');
  const override = JSON.parse(localStorage.getItem('event_news_override_v1_isd_2026'));
  ok(override && override.news === '比賽改期至 11 月 8 日，詳情稍後公佈。', '③ 本機 override 已寫入（後端未讀返都即時生效）');

  // 無權限者唔可以儲存
  posted.length = 0;
  app.currentUser = U('staff', '行政組');
  makeEl('news-input').value = '未經授權嘅消息';
  await app.saveEventNews();
  ok(posted.length === 0 && app.currentEvent.news === '比賽改期至 11 月 8 日，詳情稍後公佈。', '③ 無權限者儲存唔到（消息不變）');

  /* ---------- ⑤ loadEvents：後端 news 覆蓋 events.json 預設值 ---------- */
  const app2 = Object.create(App.prototype);
  Object.assign(app2, { currentEvent: null, currentUser: null, eventsList: [], gasUrl: 'https://example.com/exec', apiKey: 'k', _catSel: {} });
  app2.renderEventsGrid = () => {}; app2.updateAdminNav = () => {};
  context.fetch = async (url) => {
    if (String(url).includes('data/events.json')) return { ok: true, json: async () => ([{ event_id: 'isd_2026', event_name: 'ISD', category: 'isd', news: 'JSON 預設消息' }]) };
    return { ok: true, json: async () => ({ success: true, data: [{ event_id: 'isd_2026', news: '後端最新消息', news_updated_by: '秘書處', news_updated_at: new Date().toISOString() }] }) };
  };
  await app2.loadEvents();
  const merged = app2.eventsList.find(e => e.event_id === 'isd_2026');
  ok(merged.news === '後端最新消息' && merged.news_updated_by === '秘書處', '⑤ 後端 Events 表嘅 news 蓋過 events.json 預設消息');
  ok(merged.event_name === 'ISD', '⑤ 其他欄位仍以 events.json 為準（後端只覆蓋 news）');

  /* ---------- ④ 版位互換 ---------- */
  ok(html.indexOf('id="top-news-banner"') < html.indexOf('id="view-dashboard"'), '④ 最新消息＝全站最頂橫幅');
  ok(html.indexOf('id="dash-meeting-box"') > html.indexOf('id="view-dashboard"') && html.includes('id="banner-meeting-text"'), '④ 會議預告＝活動資訊橫幅內');
  ok(!html.includes('id="next-meeting-banner"'), '④ 舊頂部會議預告橫幅已移走');
  const gs = fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8');
  ok(gs.includes("action === 'saveEventNews'") && gs.includes('news_updated_at'), '④ 後端 Code.gs 支援 saveEventNews（自動補建 news 欄）');

  console.log(`v11.2 最新消息（執副以上＋秘書處可改）／版位互換 測試全部通過（${n} 項）`);
})().catch(err => { console.error(err.message); process.exit(1); });
