/* 42-import-2026.js — 2026 一次性資料遷移（data/isd_2026.json → 2026 Google Sheet）
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ 本檔只做「資料遷移 + 由 Google Sheet 讀回」，不新增任何點名／名單引擎：
      嘉賓頁、工作人員頁、紀念章點名、41-roster-lists 共用名單／點名、部門管理中心、
      膳食頁、攤位頁、執行手冊全部沿用原有功能。
   寫入對象：後端 apps-script/Code.gs 的 action=import2026Data（只寫 2026 Sheet）。
   映射（逐欄寫入，絕不把整份 JSON 塞入單一欄位）：
      guest_roster.guests      → Guests
      staff.event_staff_roster → Staff（含 meal／booth 欄）
      meals                    → Staff_Meals
      schedule                 → Schedule
      activities.booths        → Activities（type=booth，details_json 為該攤位自身欄位）
      participants             → Roster_Lists（list_key=participants，沿用既有點名名單）
*/
(function (global) {
  'use strict';

  var IMPORT_2026_EVENT_ID = 'isd_2026';
  var YN = function (v) { return (v === true || v === 'Y' || v === 'y' || v === 1 || v === '1' || v === '是') ? 'Y' : ''; };
  var S = function (v) { return (v === undefined || v === null) ? '' : String(v); };

  // 與 41-roster-lists.js rosterRowKey 完全一致（match_fields:['unit','section']）
  function participantsRowKey(row) {
    return ['unit', 'section'].map(function (k) {
      return S(row[k]).trim().toLowerCase().replace(/\s+/g, '');
    }).join('|');
  }

  /* 由 data/isd_2026.json 產生各分頁的「行」——純函數，前端及 CLI 共用 */
  function build2026ImportSections(json) {
    var d = json || {};
    var eid = IMPORT_2026_EVENT_ID;
    var sections = { Guests: [], Staff: [], Staff_Meals: [], Schedule: [], Activities: [], Roster_Lists: [] };

    // ① 嘉賓（103 位）：只可點名及加名，不可改名／換名 → 遷移只寫正式名單欄位，不碰 checked_in
    var guestSource = (d.guest_roster && d.guest_roster.source_file_name) || 'guest roster';
    ((d.guest_roster && d.guest_roster.guests) || []).forEach(function (g, i) {
      sections.Guests.push({
        guest_id: S(g.id) || ('guest_' + String(i + 1)),
        event_id: eid,
        serial: S(g.serial),
        section: S(g.section),
        name: S(g.name),
        title: S(g.title),
        ceremony_part_1: YN(g.ceremony_part_1),
        ceremony_part_2: YN(g.ceremony_part_2),
        guest_tea: YN(g.guest_tea),
        event_bus: YN(g.event_bus),
        duty: S(g.column_1),
        car_plate: S(g.car_plate),
        note: S(g.note),
        source: guestSource
      });
    });

    // ② 工作人員（frozen 名單）：可點名、換人、更正姓名、記錄替補（現場改動在點名／紀念章紀錄，不改本表來源）
    ((d.staff && d.staff.event_staff_roster) || []).forEach(function (s, i) {
      sections.Staff.push({
        staff_id: S(s.id) || ('staff_' + String(i + 1)),
        event_id: eid,
        name: S(s.name),
        role_title: S(s.role),
        group_name: S(s.group),
        contact: S(s.contact),
        job_desc: S(s.job_desc || s.duty || ''),
        meal: S(s.meal),
        booth: S(s.booth),
        assignment_status: S(s.assignment_status),
        source: S(s.source)
      });
    });

    // ③ 工作人員膳食
    (d.meals || []).forEach(function (m, i) {
      var sid = S(m.id) || ('staff_' + String(i + 1));
      sections.Staff_Meals.push({
        meal_row_id: 'meal_' + sid,
        event_id: eid,
        staff_id: sid,
        name: S(m.name),
        group_name: S(m.group),
        meal: S(m.meal),
        booth: S(m.booth),
        source: S(m.source)
      });
    });

    // ④ 2026 日程
    (d.schedule || []).forEach(function (x, i) {
      sections.Schedule.push({
        schedule_id: S(x.id) || ('sch_2026_' + String(i + 1)),
        event_id: eid,
        time_slot: S(x.time_slot),
        title: S(x.title),
        description: S(x.description),
        location: S(x.location),
        group_name: S(x.group_name),
        source: S(x.source)
      });
    });

    // ⑤ 攤位（31 個）：沿用 Activities 既有欄位設計
    ((d.activities && d.activities.booths) || []).forEach(function (b, i) {
      var details = {
        zone: S(b.zone), booth_no: S(b.booth_no), theme: S(b.theme), group_name: S(b.group_name),
        booth_name: S(b.booth_name), content: S(b.content), contact: S(b.contact),
        contact_person: S(b.contact_person), staff_count: S(b.staff_count), lunch: S(b.lunch), confirmed: S(b.confirmed)
      };
      sections.Activities.push({
        activity_id: S(b.id) || ('booth_' + String(i + 1)),
        event_id: eid,
        title: S(b.booth_name) || S(b.group_name) || ('攤位 ' + S(b.booth_no)),
        type: 'booth',
        location: [S(b.zone), S(b.booth_no) ? ('攤位 ' + S(b.booth_no)) : ''].filter(Boolean).join(' '),
        description: [S(b.theme), S(b.content)].filter(Boolean).join('｜'),
        details_json: JSON.stringify(details)
      });
    });

    // ⑥ 受邀隊伍（4 隊外間團體）：寫入共用名單引擎的「參加旅團名單」，
    //    沒有預定姓名的欄位一律保留空白，點名時才填寫實際到場人士。
    (d.participants || []).forEach(function (p, i) {
      var row = {
        area: S(p.area),
        unit: S(p.unit_name || p.unit),
        section: S(p.section),
        headcount: S(p.headcount || p.attendance_count),
        leader: S(p.leader),
        notes: [S(p.leader_role), S(p.source)].filter(Boolean).join('｜')
      };
      sections.Roster_Lists.push({
        row_id: eid + '_participants_' + (participantsRowKey(row) || ('ug_' + String(i + 1))),
        event_id: eid,
        list_key: 'participants',
        list_title: '參加旅團名單',
        row_json: JSON.stringify(row),
        updated_by: 'import2026Data'
      });
    });

    return sections;
  }

  function import2026Counts(sections) {
    return Object.keys(sections).reduce(function (o, k) { o[k] = sections[k].length; return o; }, {});
  }

  // 把 sections 切成多個請求（避免單一 POST 過大／Apps Script 逾時）
  function chunk2026Sections(sections, size) {
    size = size || 80;
    var jobs = [];
    Object.keys(sections).forEach(function (name) {
      var rows = sections[name] || [];
      for (var i = 0; i < rows.length; i += size) {
        var part = {};
        part[name] = rows.slice(i, i + size);
        jobs.push({ sheet: name, from: i, sections: part });
      }
    });
    return jobs;
  }

  var api = {
    IMPORT_2026_EVENT_ID: IMPORT_2026_EVENT_ID,
    build2026ImportSections: build2026ImportSections,
    import2026Counts: import2026Counts,
    chunk2026Sections: chunk2026Sections,
    participantsRowKey: participantsRowKey
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  Object.keys(api).forEach(function (k) { global[k] = api[k]; });

  /* ══════════════ 前端：執行遷移＋由 Google Sheet 讀回 ══════════════ */
  // 註：classic script 的 top-level `const` 唔會掛上 window，所以要直接用識別字
  if (typeof ScoutEventApp === 'undefined') return;

  Object.assign(ScoutEventApp.prototype, {

    import2026Allowed() {
      var eid = (this.currentEvent && this.currentEvent.event_id) || '';
      if (eid !== IMPORT_2026_EVENT_ID) return { ok: false, msg: '只可在 2026 活動執行（目前：' + (eid || '未選活動') + '）' };
      if (this.isDemoEvent && this.isDemoEvent()) return { ok: false, msg: '示範沙盒不會寫入 Google Sheet' };
      if (!this.gasUrl || !this.apiKey) return { ok: false, msg: '未設定後端連線（gasUrl／apiKey）' };
      var lvl = (typeof ROLE_HIERARCHY !== 'undefined' && this.currentUser) ? (ROLE_HIERARCHY[this.currentUser.role] || 0) : 0;
      if (lvl < 80) return { ok: false, msg: '只有主席／管理員／顧問層級可執行一次性資料遷移' };
      return { ok: true };
    },

    async fetch2026SourceJson() {
      if (this._isd2026SourceJson) return this._isd2026SourceJson;
      var res = await fetch('data/' + IMPORT_2026_EVENT_ID + '.json?t=' + Date.now());
      this._isd2026SourceJson = await res.json();
      return this._isd2026SourceJson;
    },

    // 一次性遷移：按分頁分批 POST import2026Data；同 ID 更新、冇就新增、相同內容跳過
    async runImport2026(opts) {
      opts = opts || {};
      var gate = this.import2026Allowed();
      if (!gate.ok) { showToast(gate.msg, 'error'); return { success: false, error: gate.msg }; }
      var json = await this.fetch2026SourceJson();
      var sections = build2026ImportSections(json);
      var counts = import2026Counts(sections);
      var jobs = chunk2026Sections(sections, opts.chunkSize || 80);
      showToast('開始寫入 2026 資料至 Google Sheet（' + jobs.length + ' 批）…', '');
      // 後端未更新（仍是 v14，未有 import2026Data）時的後備路線：
      // 用既有 saveBatchRecords 寫入既有分頁（Staff／Schedule／Activities／Roster_Lists），
      // Guests／Staff_Meals 兩張新分頁必須更新並重新部署 Code.gs 先寫得入。
      var FALLBACK_SHEETS = { Staff: 1, Schedule: 1, Activities: 1, Roster_Lists: 1 };
      var fallback = false, skipped = [];
      var total = { created: 0, updated: 0, unchanged: 0, audit_rows: 0 }, failed = [];
      for (var i = 0; i < jobs.length; i++) {
        var job = jobs[i], done = false, last = null;
        if (fallback && !FALLBACK_SHEETS[job.sheet]) { skipped.push(job.sheet); continue; }
        for (var t = 0; t < 3 && !done; t++) {
          try {
            var payload = fallback
              ? { action: 'saveBatchRecords', api_key: this.apiKey, updated_by: (this.currentUser && this.currentUser.name) || 'import2026Data',
                  records: (job.sections[job.sheet] || []).map(function (rec) { return { module: job.sheet, record: rec }; }) }
              : { action: 'import2026Data', api_key: this.apiKey, event_id: IMPORT_2026_EVENT_ID,
                  updated_by: (this.currentUser && this.currentUser.name) || 'import2026Data',
                  source: 'data/isd_2026.json', sections: job.sections };
            var res = await fetch(this.gasUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) });
            last = await res.json();
            done = !!(last && last.success);
            if (!done && !fallback && /Unknown POST action|import2026Data is not defined/.test(String(last && last.error || ''))) {
              fallback = true; this._import2026Fallback = true; t = -1;
              showToast('後端仍是舊版（未有 import2026Data）：改用 saveBatchRecords 寫入既有分頁，Guests／Staff_Meals 需更新並重新部署 Code.gs', 'warning');
              if (!FALLBACK_SHEETS[job.sheet]) { skipped.push(job.sheet); break; }
            }
            if (done && fallback) last = { success: true, created: (job.sections[job.sheet] || []).length, updated: 0, unchanged: 0, audit_rows: (job.sections[job.sheet] || []).length };
          } catch (e) { last = { success: false, error: String(e) }; }
        }
        if (done) {
          total.created += last.created || 0; total.updated += last.updated || 0;
          total.unchanged += last.unchanged || 0; total.audit_rows += last.audit_rows || 0;
        } else failed.push(job.sheet + '@' + job.from + '：' + ((last && last.error) || '未知錯誤'));
        this._import2026Progress = { done: i + 1, total: jobs.length };
        if (typeof this.renderExecManual2026Panel === 'function') this.renderExecManual2026Panel();
      }
      var summary = { success: !failed.length && !skipped.length, counts: counts, total: total, failed: failed, skipped: skipped, fallback: fallback, at: new Date().toISOString() };
      if (skipped.length) showToast('以下分頁未寫入（需更新並重新部署 apps-script/Code.gs）：' + [...new Set(skipped)].join('、'), 'warning');
      try { localStorage.setItem('isd2026_import_summary', JSON.stringify(summary)); } catch (e) {}
      showToast(failed.length ? ('部分批次失敗（' + failed.length + '）：' + failed[0]) : ('已寫入 Google Sheet：新增 ' + total.created + '、更新 ' + total.updated + '、相同略過 ' + total.unchanged), failed.length ? 'error' : 'success');
      await this.syncImported2026FromGas();
      if (typeof this.renderExecManual2026Panel === 'function') this.renderExecManual2026Panel();
      return summary;
    },

    async checkImport2026Status() {
      if (!this.gasUrl || !this.apiKey) return null;
      try {
        var res = await fetch(this.gasUrl + '?action=getImport2026Status&api_key=' + encodeURIComponent(this.apiKey));
        var j = await res.json();
        if (j && j.success) { this._import2026Status = j; try { localStorage.setItem('isd2026_import_status', JSON.stringify(j)); } catch (e) {} }
        return j;
      } catch (e) { return null; }
    },

    import2026StatusCached() {
      if (this._import2026Status) return this._import2026Status;
      try { return JSON.parse(localStorage.getItem('isd2026_import_status') || 'null'); } catch (e) { return null; }
    },

    /* 由 Google Sheet 讀回 2026 正式資料（嘉賓／工作人員／膳食／日程／攤位），
       並保存 snapshot，令場地網絡唔穩時仍睇到最後一次已下載資料。 */
    sheetSnapshotKey() { return 'isd2026_sheet_snapshot_' + ((this.currentEvent && this.currentEvent.event_id) || IMPORT_2026_EVENT_ID); },

    applyImported2026Snapshot(snap) {
      if (!snap || typeof snap !== 'object') return false;
      var d = this.eventData = this.eventData || {};
      if (Array.isArray(snap.guests) && snap.guests.length) {
        d.guest_roster = Object.assign({}, d.guest_roster || {}, { guests: snap.guests, count: snap.guests.length, source: 'Google Sheet（Guests）' });
      }
      if (Array.isArray(snap.staff) && snap.staff.length) {
        d.staff = d.staff || {};
        d.staff.event_staff_roster = snap.staff;
      }
      if (Array.isArray(snap.meals) && snap.meals.length) d.meals = snap.meals;
      if (Array.isArray(snap.participants) && snap.participants.length) {
        d.participants = snap.participants;
        try {
          var pk = (typeof LS !== 'undefined' && LS.participants) ? LS.participants((this.currentEvent && this.currentEvent.event_id) || IMPORT_2026_EVENT_ID) : '';
          if (pk) localStorage.setItem(pk, JSON.stringify(snap.participants));
        } catch (e) {}
      }
      if (Array.isArray(snap.schedule) && snap.schedule.length) d.schedule = snap.schedule;
      if (Array.isArray(snap.booths) && snap.booths.length) {
        d.activities = d.activities || {};
        d.activities.booths = snap.booths;
      }
      this._sheetSnapshotAt = snap.at || '';
      return true;
    },

    loadImported2026Snapshot() {
      try {
        var snap = JSON.parse(localStorage.getItem(this.sheetSnapshotKey()) || 'null');
        return this.applyImported2026Snapshot(snap);
      } catch (e) { return false; }
    },

    /* 執行手冊 → 2026 資料：總覽＋一次性遷移按鈕＋Google Sheet 狀態 */
    renderExecManual2026Panel(panel) {
      panel = panel || this._execManual2026Panel || document.getElementById('exec-manual-panel');
      if (!panel) return;
      var d = this.eventData || {};
      var esc = (typeof escapeHtml === 'function') ? escapeHtml : function (x) { return String(x === undefined || x === null ? '' : x); };
      var gate = this.import2026Allowed();
      var st = this.import2026StatusCached();
      var prog = this._import2026Progress;
      var snapAt = this._sheetSnapshotAt || '';
      var rows = (d.schedule || []).map(function (x) {
        return '<tr><td class="px-2 py-1">' + esc(x.time_slot || '') + '</td><td class="px-2 py-1">' + esc(x.title || '') + '</td><td class="px-2 py-1">' + esc(x.location || '') + '</td></tr>';
      }).join('');
      var cards = [
        ['嘉賓', (d.guest_roster && d.guest_roster.guests || []).length],
        ['工作人員', (d.staff && d.staff.event_staff_roster || []).length],
        ['攤位', (d.activities && d.activities.booths || []).length],
        ['受邀隊伍', (d.participants || []).length],
        ['餐膳資料', (d.meals || []).length]
      ].map(function (x) {
        return '<div class="bg-white border rounded-xl p-3"><b class="text-lg">' + x[1] + '</b><div class="text-[10px] text-slate-500">' + x[0] + '</div></div>';
      }).join('');
      var sheetRows = st && st.counts ? Object.keys(st.counts).map(function (k) {
        return '<span class="bg-white border rounded-full px-2 py-0.5 mr-1 mb-1 inline-block">' + esc(k) + '：<b>' + st.counts[k] + '</b></span>';
      }).join('') : '<span class="text-slate-400">未查詢</span>';
      var lastRun = (st && st.last_run) ? ('最後一次遷移：' + esc(String(st.last_run.at || '').slice(0, 19).replace('T', ' ')) + '（' + esc(st.last_run.by || '') + '）') : '尚未見 import2026:run 紀錄';
      panel.innerHTML =
        '<div class="space-y-4">' +
        '<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px]">2026 已置入資料總覽；原始來源及現場修訂分開保存。' +
        (snapAt ? '<br>資料來源：Google Sheet（最後下載 ' + esc(String(snapAt).slice(0, 19).replace('T', ' ')) + '）' : '<br>資料來源：內建 JSON（未由 Google Sheet 下載）') + '</div>' +
        '<div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">' + cards + '</div>' +
        '<div class="bg-white border rounded-xl p-4 space-y-2">' +
        '<h4 class="font-bold text-sm">Google Sheet 寫入狀態（Audit_Log：' + esc(st ? String(st.audit_rows || 0) : '—') + ' 行）</h4>' +
        '<div class="text-[11px] leading-relaxed">' + sheetRows + '</div>' +
        '<div class="text-[11px] text-slate-500">' + lastRun + '</div>' +
        '<div class="flex gap-2 flex-wrap pt-1">' +
        '<button onclick="app.checkImport2026Status().then(()=>app.renderExecManual2026Panel())" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold">查詢 Google Sheet 狀態</button>' +
        '<button onclick="app.syncImported2026FromGas().then(()=>app.renderExecManual2026Panel())" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold">由 Google Sheet 取回資料</button>' +
        (gate.ok
          ? '<button onclick="app.runImport2026()" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold">一次性寫入 2026 資料至 Google Sheet</button>'
          : '<span class="text-[11px] text-slate-500 self-center">一次性遷移：' + esc(gate.msg) + '</span>') +
        '</div>' +
        (prog ? '<div class="text-[11px] text-emerald-700">寫入進度：' + prog.done + '/' + prog.total + ' 批</div>' : '') +
        '</div>' +
        '<div class="bg-white border rounded-xl p-4"><h4 class="font-bold text-sm mb-2">2026 日程</h4><div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">時間</th><th class="px-2 py-1 text-left">項目</th><th class="px-2 py-1 text-left">地點</th></tr></thead><tbody class="divide-y">' +
        (rows || '<tr><td colspan="3" class="p-3 text-center text-slate-400">暫無資料</td></tr>') +
        '</tbody></table></div></div></div>';
    },

    async syncImported2026FromGas() {
      if (!this.gasUrl || !this.apiKey) return null;
      if (this.isDemoEvent && this.isDemoEvent()) return null;
      var eid = (this.currentEvent && this.currentEvent.event_id) || IMPORT_2026_EVENT_ID;
      var all = null;
      try {
        var res = await fetch(this.gasUrl + '?action=getEventData&event_id=' + encodeURIComponent(eid) + '&api_key=' + encodeURIComponent(this.apiKey));
        var j = await res.json();
        all = (j && j.data) || null;
      } catch (e) { return null; }
      if (!all) return null;
      var snap = { at: new Date().toISOString() };

      snap.guests = (all.Guests || []).filter(function (r) { return r && r.name; }).map(function (r) {
        return {
          id: S(r.guest_id), serial: S(r.serial), section: S(r.section), name: S(r.name), title: S(r.title),
          ceremony_part_1: YN(r.ceremony_part_1) === 'Y', ceremony_part_2: YN(r.ceremony_part_2) === 'Y',
          guest_tea: YN(r.guest_tea) === 'Y', event_bus: YN(r.event_bus) === 'Y',
          column_1: S(r.duty), car_plate: S(r.car_plate), note: S(r.note),
          official: true, source: S(r.source), checked_in: YN(r.checked_in) === 'Y'
        };
      });
      snap.staff = (all.Staff || []).filter(function (r) { return r && r.name && S(r.staff_id).indexOf('staff_') === 0; }).map(function (r) {
        return { id: S(r.staff_id), name: S(r.name), role: S(r.role_title), group: S(r.group_name), meal: S(r.meal), booth: S(r.booth), assignment_status: S(r.assignment_status), source: S(r.source) };
      });
      snap.meals = (all.Staff_Meals || []).filter(function (r) { return r && r.name; }).map(function (r) {
        return { id: S(r.staff_id), name: S(r.name), group: S(r.group_name), meal: S(r.meal), booth: S(r.booth), source: S(r.source) };
      });
      snap.schedule = (all.Schedule || []).filter(function (r) { return r && (r.title || r.time_slot); }).map(function (r) {
        return { id: S(r.schedule_id), time_slot: S(r.time_slot), title: S(r.title), location: S(r.location), group_name: S(r.group_name), description: S(r.description), source: S(r.source) };
      });
      snap.booths = (all.Activities || []).filter(function (r) { return S(r.type) === 'booth'; }).map(function (r) {
        var o = {};
        try { o = JSON.parse(r.details_json || '{}') || {}; } catch (e) { o = {}; }
        return Object.assign({ id: S(r.activity_id), booth_name: S(r.title) }, o);
      });

      // 受邀隊伍／參加旅團：由 Roster_Lists（list_key=participants）取回，點名引擎沿用原有 participants 來源
      snap.participants = (all.Roster_Lists || []).filter(function (r) { return S(r.list_key) === 'participants'; }).map(function (r) {
        var o = {};
        try { o = JSON.parse(r.row_json || '{}') || {}; } catch (e) { o = {}; }
        return { id: S(r.row_id), area: S(o.area), unit: S(o.unit), unit_name: S(o.unit), section: S(o.section), headcount: S(o.headcount), leader: S(o.leader), notes: S(o.notes) };
      });

      // 嘉賓點名（跨裝置）：沿用 Roster_Rollcall_Checkins（list_key=guests）
      try { if (typeof this.mergeGuestCheckinFromGas === 'function') this.mergeGuestCheckinFromGas(all); } catch (e) {}

      if (!snap.guests.length && !snap.staff.length && !snap.schedule.length && !snap.booths.length && !snap.meals.length && !snap.participants.length) return null;
      try { localStorage.setItem(this.sheetSnapshotKey(), JSON.stringify(snap)); } catch (e) {}
      this.applyImported2026Snapshot(snap);
      return snap;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
