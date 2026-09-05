/* 41-roster-lists.js — v14 執行手冊「名單＋點名」引擎（2026-09-05 用戶定案）
   四張名單（位置／格式／負責組別見 js/00-config.js 的 ROSTER_LIST_DEFS）：
     ① 支部獎勵獲獎名單  → 執行手冊 → 典禮儀式 → 支部獎勵名單（會操及典禮組／典禮組負責）
     ② 領袖獎勵獲獎名單  → 執行手冊 → 典禮儀式 → 領袖獎勵名單（會操及典禮組／典禮組負責）
     ③ 參加旅團名單      → 執行手冊 → 參加旅團名單（行政組負責；名單跟結構表，此頁加報到點名）
     ④ 代訂餐盒旅團名單  → 執行手冊 → 代訂餐盒名單（協調組負責）
   每張名單一律提供：預定格式（欄位表＋可下載範本 CSV）、上傳 Excel／Word／PDF、貼上文字、
   手動新增／編輯、點名 TICK（取消 TICK 須填更正原因）、分組進度 chips、匯出 CSV、列印、後端留痕。
   點名做法對標「優異旅團 FULL LIST」（js/35-ceremony.js sortCeremonyResponses 一套）。 */
Object.assign(ScoutEventApp.prototype,{

  /* ══════════════ 基本資料／權限 ══════════════ */
  rosterDef(key){ return ROSTER_LIST_DEFS.find(d=>d.key===key)||null; },

  rosterStoreKey(){ return LS.rosterLists(this.currentEvent?.event_id||'isd_2026'); },

  getRosterData(){
    try{
      const local=JSON.parse(localStorage.getItem(this.rosterStoreKey())||'null');
      if(local&&typeof local==='object') return {rows:local.rows||{},ticks:local.ticks||{},meta:local.meta||{},confirmed:local.confirmed||{}};
    }catch(e){}
    return {rows:{},ticks:{},meta:{},confirmed:{}};
  },

  saveRosterData(d){ localStorage.setItem(this.rosterStoreKey(), JSON.stringify(d||{})); },

  // 行 key＝內容欄位（match_fields）：重新匯入、由不同入口（執行手冊／部門中心）入去，都对得返同一個 TICK
  rosterRowKey(def,row){
    if(!row) return '';
    const fields=def.match_fields||['unit'];
    return fields.map(k=>String(row[k]??'').trim().toLowerCase().replace(/\s+/g,'')).join('|');
  },

  rosterRows(key){
    const def=this.rosterDef(key); if(!def) return [];
    const d=this.getRosterData(), ticks=d.ticks[key]||{};
    let rows;
    if(def.source==='participants'){
      rows=(this.getParticipantsData()||[]).map(p=>({
        id:'pt_'+[p.area,p.unit_name||p.unit,p.section].map(x=>String(x||'').trim()).join('|'),
        area:p.area||'', unit:p.unit_name||p.unit||'', section:p.section||'',
        headcount:p.headcount||'', leader:p.leader||'', notes:p.notes||''
      }));
    } else {
      rows=(d.rows[key]||[]).map(r=>({...r}));
    }
    rows.forEach(r=>{
      const k=this.rosterRowKey(def,r); const t=ticks[k]||{};
      r._key=k; r._checked=!!t.checked; r._by=t.by||''; r._at=t.at||''; r._note=t.note||'';
    });
    return rows;
  },

  rosterViewRows(key){
    const def=this.rosterDef(key); if(!def) return [];
    const rows=this.rosterRows(key);
    const sort=this['_rosterSort_'+key]||def.group_field||'area';
    const desc=!!this['_rosterDesc_'+key];
    rows.sort((a,b)=>{
      let v=0;
      if(sort==='tick') v=Number(!!a._checked)-Number(!!b._checked);
      else v=String(a[sort]||'').localeCompare(String(b[sort]||''),'zh-Hant',{numeric:true}) || String(a.unit||'').localeCompare(String(b.unit||''),'zh-Hant',{numeric:true});
      if(!v) v=String(a.name||'').localeCompare(String(b.name||''),'zh-Hant');
      return desc?-v:v;
    });
    return rows;
  },

  // 可管理（改名單／上載檔案）：管理層／副主席以上／負責組別主任以上（行政組統管全站，沿用 v8.14 慣例）
  rosterCanManage(key){
    const def=this.rosterDef(key); if(!def) return false;
    if(!this.currentUser) return false;
    if(this.isAdmin()||this.currentUser.mock_admin) return true;
    if(this.roleLevel(this.currentUser.role)>=60) return true;
    const g=normalizeGroupName(this.currentUser.group_name||'');
    if(!g) return false;
    const lvl=this.roleLevel(this.currentUser.role);
    if(lvl<CARD_OWNER_MIN_LEVEL) return false;
    if(g==='行政組'||g.includes('行政')) return true;
    return g.includes(normalizeGroupName(def.owner_group));
  },

  // 可點名（TICK）：管理層＋負責組別任何已登入成員（現場由工作人員逐個 TICK）
  rosterCanTick(key){
    const def=this.rosterDef(key); if(!def) return false;
    if(!this.currentUser) return false;
    if(this.rosterCanManage(key)) return true;
    const g=normalizeGroupName(this.currentUser.group_name||'');
    if(!g) return false;
    if(g==='行政組'||g.includes('行政')) return true;
    return g.includes(normalizeGroupName(def.owner_group));
  },

  rosterNeedsLogin(key){
    const def=this.rosterDef(key)||{};
    return `名單內容<b>公開可查閱</b>；<b>上傳及${escapeHtml(def.tick_label||'點名')}須登入</b>，並由<b>${escapeHtml(def.owner_group||'')}</b>（${escapeHtml(def.owner_note||'')}）負責——請按右上角「登入」。`;
  },

  /* ══════════════ 渲染（可掛喺任何容器：典禮儀式分頁／執行手冊分頁／部門中心） ══════════════ */
  renderRosterPanel(key, box, opts){
    const panel=box||document.getElementById('exec-manual-panel'); if(!panel) return;
    panel.innerHTML=this.rosterPanelHTML(key,opts);
  },

  rosterPanelHTML(key, opts){
    const def=this.rosterDef(key); if(!def) return '';
    const scope=(opts&&opts.scope)||'main';
    return `<div class="roster-panel space-y-3" data-roster-panel="${def.key}" data-roster-scope="${scope}">${this.rosterPanelInnerHTML(key,scope)}</div>`;
  },

  rosterPanelInnerHTML(key, scope){
    const def=this.rosterDef(key); if(!def) return '';
    scope=scope||'main';
    const canManage=this.rosterCanManage(key), canTick=this.rosterCanTick(key);
    const a=this.execManualAccentCls(def.accent||'indigo');
    const attachKey=this.rosterAttachSection(key);
    const files=this.getExecManualFiles(attachKey);
    const cols=def.columns||[];
    return `
      <div class="${a.box} border rounded-xl p-3 text-[11px] leading-relaxed text-slate-700 space-y-1.5">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <b class="text-[13px]"><i class="${def.icon} mr-1"></i>${escapeHtml(def.title)}</b>
          <span class="bg-white/70 border px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">負責組別：${escapeHtml(def.owner_group)}（${escapeHtml(def.owner_note)}）</span>
        </div>
        <div>${escapeHtml(def.intro)}</div>
        <div class="text-[10px] text-slate-500">位置：${escapeHtml(def.exec_location)}｜格式（${cols.length} 欄）：${cols.map(c=>escapeHtml(c.label)).join(' / ')}＋<b>${escapeHtml(def.tick_label)} TICK</b></div>
        ${this.currentUser?'':'<div class=\"text-[10px] text-slate-500\">'+this.rosterNeedsLogin(key)+'</div>'}
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        ${canManage?`<label class="${a.btn} text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳名單（EXCEL／WORD／PDF）<input type="file" accept=".xlsx,.xls,.xlsm,.csv,.docx,.doc,.pdf" class="hidden" onchange="app.rosterImportFile('${def.key}',this.files[0]);this.value=''></label>`:''}
        ${canManage?`<button onclick="app.openRosterPasteForm('${def.key}')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-paste mr-1"></i>貼上文字（由 PDF／網頁複製）</button>`:''}
        ${canManage&&def.editable?`<button onclick="app.openRosterRowForm('${def.key}')" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增一行</button>`:''}
        ${def.source==='participants'?'':`<button onclick="app.rosterDownloadTemplate('${def.key}')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>下載格式範本 CSV</button>`}
        <button onclick="app.rosterExportCSV('${def.key}')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>匯出 CSV</button>
        <button onclick="app.printRosterList('${def.key}','${scope}')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印${escapeHtml(def.tick_label)}表</button>
        ${canManage?`<button onclick="app.openExecManualFileForm('${attachKey}')" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-paperclip mr-1"></i>上傳附件（PDF／Word／圖片／Drive 連結）</button>`:''}
        ${this.rosterBackendReady()?`<button onclick="app.rosterPushToGas('${def.key}')" class="bg-sky-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-cloud-arrow-up mr-1"></i>同步名單至後端</button><button onclick="app.rosterPullFromGas('${def.key}')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-cloud-arrow-down mr-1"></i>由後端取回</button>`:''}
      </div>
      <div class="bg-white border rounded-xl p-3 space-y-2">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <b class="text-[12px]"><i class="fa-solid fa-clipboard-check mr-1 text-emerald-600"></i>${escapeHtml(def.tick_label)}表（點名做法同「優異旅團」）</b>
          <div class="flex items-center gap-2 flex-wrap">
            <select onchange="app.rosterSetSort('${def.key}',this.value)" class="border rounded-lg px-2 py-1 text-[11px] bg-white">
              ${(def.sort_fields||[]).map(f=>{const c=cols.find(x=>x.k===f);return `<option value="${f}" ${((this['_rosterSort_'+key])||def.group_field)===f?'selected':''}>按${escapeHtml(c?c.label:f)}</option>`;}).join('')}
              <option value="tick" ${(this['_rosterSort_'+key]||'')==='tick'?'selected':''}>未${escapeHtml(def.tick_label)}優先</option>
            </select>
            <button onclick="app.rosterToggleSortDir('${def.key}')" class="bg-white border rounded-lg px-2 py-1 text-[11px]">↕ ${this['_rosterDesc_'+key]?'倒序':'順序'}</button>
            ${canTick?`<button onclick="app.rosterTickAllVisible('${def.key}')" class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-2 py-1 text-[11px] font-bold">全選本欄${escapeHtml(def.tick_label)}</button>`:''}
          </div>
        </div>
        <div id="roster-print-${scope}-${key}" data-roster-body="${key}">${this.rosterBodyHTML(key)}</div>
      </div>
      ${canManage&&!this.rosterRows(key).length?`<div class="bg-amber-50 border border-dashed border-amber-300 rounded-xl p-4 text-[11px] leading-relaxed text-amber-900"><b>版位已預留、內容待上載：</b>① 按「下載格式範本 CSV」取得欄位樣板 → ② 用 Excel 填入名單 → ③ 按「上傳名單（EXCEL／WORD／PDF）」匯入；若只有 PDF 檔，可直接「上傳附件」作內嵌預覽，或用「貼上文字」把 PDF 內嘅表格複製入來即時生成點名表。</div>`:''}
      ${files.length?`<div class="space-y-2"><b class="text-[12px]"><i class="fa-solid fa-paperclip mr-1"></i>${escapeHtml(def.title)}附件（${files.length}）</b><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${files.map(f=>this.execManualFileCardHTML(f,attachKey,canManage)).join('')}</div></div>`:''}
    `;
  },

  rosterBodyHTML(key){
    const def=this.rosterDef(key); if(!def) return '';
    return `${this.rosterStatusHTML(key)}${this.rosterTableHTML(key)}${this.rosterTotalsHTML(key)}`;
  },

  // 附件版位：參加旅團沿用執行手冊既有嘅「participants」區（兩邊入口見到同一組附件）；其餘另有 roster_ 區
  rosterAttachSection(key){ return key==='participants'?'participants':'roster_'+key; },

  rosterStatusHTML(key){
    const def=this.rosterDef(key);
    const rows=this.rosterViewRows(key);
    const done=rows.filter(r=>r._checked).length;
    const gk=def.group_field||'area';
    const groups=[...new Set(rows.map(r=>String(r[gk]||'').trim()).filter(Boolean))].sort((x,y)=>x.localeCompare(y,'zh-Hant'));
    const canTick=this.rosterCanTick(key);
    const confirmed=this.getRosterData().confirmed[key]||{};
    return `<div class="text-[11px] font-bold text-slate-700 mb-1">目前進度：已${escapeHtml(def.tick_label)}／總數　${done}/${rows.length}${groups.length?`　｜　${def.source==='participants'?'旅團報到':'分組點名'}`:''}</div>
      ${groups.length?`<div class="flex flex-wrap gap-1 mb-2">${groups.map(g=>{
        const rs=rows.filter(r=>String(r[gk]||'').trim()===g), d=rs.filter(r=>r._checked).length, c=confirmed[g]?' · ✅已確認':'';
        return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-slate-100 text-slate-700">${escapeHtml(g)} ${d}/${rs.length}${escapeHtml(c)}${canTick&&d===rs.length&&rs.length?`<button onclick="app.rosterConfirmGroup('${key}','${encodeURIComponent(g)}')" class="text-emerald-700 font-bold underline">確認</button>`:''}</span>`;
      }).join('')}</div>`:''}`;
  },

  rosterTableHTML(key){
    const def=this.rosterDef(key);
    const rows=this.rosterViewRows(key);
    const canManage=this.rosterCanManage(key), canTick=this.rosterCanTick(key);
    const cols=def.columns||[];
    return `<div class="table-responsive"><table class="min-w-full text-[11px]">
      <thead class="bg-slate-100"><tr>
        <th class="px-2 py-1 text-center w-14">${escapeHtml(def.tick_label)}</th>
        ${cols.map(c=>`<th class="px-2 py-1 text-left">${escapeHtml(c.label)}</th>`).join('')}
        ${canTick?'<th class="px-2 py-1 text-left">點名紀錄</th>':''}
        ${canManage&&def.editable?'<th class="px-2 py-1 text-right">操作</th>':''}
      </tr></thead>
      <tbody class="divide-y">
        ${rows.length?rows.map(r=>`<tr class="${r._checked?'bg-emerald-50/50':''}">
          <td class="px-2 py-1 text-center" data-label="${escapeHtml(def.tick_label)}"><input type="checkbox" ${r._checked?'checked':''} ${canTick?'':'disabled'} onchange="app.rosterTick('${key}','${encodeURIComponent(r._key||'')}',this.checked)" class="w-4 h-4 accent-emerald-600" title="${canTick?escapeHtml(def.tick_hint):'請登入『'+escapeHtml(def.owner_group)+'』後點名'}"></td>
          ${cols.map((c,i)=>`<td class="px-2 py-1 ${i===0?'font-medium':''}" data-label="${escapeHtml(c.label)}">${escapeHtml(String(r[c.k]??''))||'<span class="text-slate-300">—</span>'}</td>`).join('')}
          ${canTick?`<td class="px-2 py-1 text-[10px] text-slate-500" data-label="點名紀錄">${r._checked?`${escapeHtml(r._by||'—')} · ${escapeHtml(String(r._at||'').slice(0,16).replace('T',' '))}`:(r._note?`<span class="text-rose-600">取消：${escapeHtml(r._note)}</span>`:'—')}</td>`:''}
          ${canManage&&def.editable?`<td class="px-2 py-1 text-right" data-label="操作"><button onclick="app.openRosterRowForm('${key}','${escapeHtml(r.id||'')}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button> <button onclick="app.deleteRosterRow('${key}','${escapeHtml(r.id||'')}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></td>`:''}
        </tr>`).join(''):`<tr><td colspan="${cols.length+(canTick?2:1)+(canManage&&def.editable?1:0)}" class="px-2 py-6 text-center text-slate-400">尚未有${escapeHtml(def.title)}（版位已預留，可上傳 Excel／Word 或逐行新增）</td></tr>`}
      </tbody>
    </table></div>`;
  },

  // 總數列（代訂餐盒 A／B／C／總數；參加旅團人數）——像攤位總表 TOTAL 一行
  rosterTotalsHTML(key){
    const def=this.rosterDef(key);
    if(!def.total_fields||!def.total_fields.length) return '';
    const rows=this.rosterViewRows(key);
    const sum=f=>rows.reduce((n,r)=>n+(Number(String(r[f.k]||'').replace(/[^0-9.\-]/g,''))||0),0);
    return `<div class="bg-slate-900 text-white rounded-xl p-2.5 text-[11px] font-bold flex flex-wrap gap-3 items-center mt-2"><span class="opacity-70">TOTAL</span>${def.total_fields.map(f=>`<span>${escapeHtml(f.label)}：<span class="text-amber-300">${sum(f)}</span></span>`).join('')}<span class="opacity-70 ml-auto">已${escapeHtml(def.tick_label)} ${rows.filter(r=>r._checked).length}/${rows.length}</span></div>`;
  },

  rosterRefresh(key){
    document.querySelectorAll(`[data-roster-panel="${key}"]`).forEach(el=>{ el.innerHTML=this.rosterPanelInnerHTML(key, el.dataset.rosterScope||'main'); });
  },

  // 匯入／刪除後刷新：本面板全部實例；參加旅團另需重畫宿主（執行手冊分頁／行政組頁籤嘅結構表）
  rosterReloadHosts(key){
    const def=this.rosterDef(key);
    if(def&&def.source==='participants'){
      if(this.currentModule==='exec_manual'&&document.getElementById('exec-manual-panel')){ this.renderExecManualTab(); return; }
      const adminTab=document.getElementById('group-tab-admin_participants');
      if(adminTab&&adminTab.innerHTML.trim()){ adminTab.innerHTML=this.renderAdminParticipantsTabHTML(); return; }
    }
    this.rosterRefresh(key);
  }
,
  rosterRefreshBody(key){
    const rows=this.rosterViewRows(key);
    document.querySelectorAll(`[data-roster-body="${key}"]`).forEach(el=>{ el.innerHTML=this.rosterBodyHTML(key); });
    void rows;
  },

  rosterSetSort(key,val){ this['_rosterSort_'+key]=val; this.rosterRefreshBody(key); },
  rosterToggleSortDir(key){ this['_rosterDesc_'+key]=!this['_rosterDesc_'+key]; this.rosterRefreshBody(key); },

  /* ══════════════ 點名（TICK）：本機即時＋後端留痕；取消 TICK 必須填更正原因 ══════════════ */
  rosterTick(key,rowKey,checked){
    const def=this.rosterDef(key); if(!def) return;
    rowKey=decodeURIComponent(String(rowKey||''));
    if(!this.rosterCanTick(key)){ showToast(`僅已登入嘅${def.owner_group}（${def.owner_note}）／管理層可以${def.tick_label}`,'error'); this.rosterRefreshBody(key); return; }
    const d=this.getRosterData(); const ticks=d.ticks[key]||{};
    const row=this.rosterRows(key).find(r=>r._key===rowKey); if(!row) return;
    let note='';
    if(!checked && ticks[rowKey] && ticks[rowKey].checked){
      note=prompt(`你正在取消已保存嘅${def.tick_label}。請輸入更正原因（例如：誤點、核對後未到）：`,'')||'';
      if(!note.trim()){ showToast(`取消${def.tick_label}必須填寫更正原因`,'error'); this.rosterRefreshBody(key); return; }
    }
    const rec=Object.assign({},ticks[rowKey]||{},{checked:!!checked,by:this.currentUser?.name||'',at:new Date().toISOString()});
    if(note.trim()) rec.note=note.trim(); else if(checked) rec.note='';
    ticks[rowKey]=rec; d.ticks[key]=ticks; this.saveRosterData(d);
    this.rosterSaveTickToGas(key,def,row,rec);
    this.rosterRefreshBody(key);
  },

  rosterTickAllVisible(key){
    if(!this.rosterCanTick(key)){ showToast('你無權限進行點名','error'); return; }
    const def=this.rosterDef(key);
    const rows=this.rosterViewRows(key).filter(r=>!r._checked);
    if(!rows.length){ showToast('目前已经全部' + def.tick_label,'warning'); return; }
    if(!confirm(`確定將目前顯示嘅 ${rows.length} 行一次過${def.tick_label}？`)) return;
    const d=this.getRosterData(); const ticks=d.ticks[key]||{};
    const now=new Date().toISOString(), by=this.currentUser?.name||'';
    rows.forEach(r=>{ ticks[r._key]=Object.assign({},ticks[r._key]||{},{checked:true,by,at:now,note:''}); this.rosterSaveTickToGas(key,def,r,ticks[r._key]); });
    d.ticks[key]=ticks; this.saveRosterData(d);
    this.rosterRefreshBody(key); showToast(`已一次過${def.tick_label} ${rows.length} 行`,'success');
  },

  rosterConfirmGroup(key,group){
    if(!this.currentUser){ showToast('請先登入','error'); return; }
    if(!this.rosterCanTick(key)){ showToast('你無權限確認','error'); return; }
    const def=this.rosterDef(key), gk=def.group_field||'area';
    group=decodeURIComponent(String(group||''));
    const rows=this.rosterViewRows(key).filter(r=>String(r[gk]||'').trim()===group);
    const done=rows.filter(r=>r._checked).length;
    if(!confirm(`確認「${group}」已完成${def.tick_label}？目前 ${done}/${rows.length} 已 TICK。`)) return;
    const d=this.getRosterData(); d.confirmed[key]=d.confirmed[key]||{};
    d.confirmed[key][group]={confirmed:true,by:this.currentUser.name||'',at:new Date().toISOString(),total:rows.length,ticked:done};
    this.saveRosterData(d);
    const url=this.gasUrl||localStorage.getItem(LS.gasUrl), ak=this.apiKey||localStorage.getItem(LS.apiKey);
    if(url&&ak&&!this.isDemoEvent()&&typeof fetch==='function'){
      const eid=this.currentEvent?.event_id||'isd_2026';
      fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:ak,module:'Roster_Rollcall_Batches',record:{batch_id:`${eid}_${key}_${group}`,event_id:eid,list_key:key,list_title:def.title,group_value:group,confirmed:'Y',confirmed_by:this.currentUser.name||'',confirmed_by_id:this.currentUser.user_id||this.currentUser.id||'',confirmed_at:new Date().toISOString(),total:rows.length,ticked:done}})}).then(()=>showToast(`${group} 已確認完成`,'success')).catch(()=>showToast('本區確認同步失敗','error'));
    } else showToast(`${group} 已於本機確認（未設後端，未能同步）`,'warning');
    this.rosterRefreshBody(key);
  },

  rosterBackendReady(){ return !!(this.gasUrl||localStorage.getItem(LS.gasUrl)) && !this.isDemoEvent(); },

  rosterSaveTickToGas(key,def,row,rec){
    // 示範沙盒永不連線（同 23-sync.js 慣例）；未設後端連線時亦唔會亂發 request
    if(this.isDemoEvent()) return;
    const url=this.gasUrl||localStorage.getItem(LS.gasUrl), ak=this.apiKey||localStorage.getItem(LS.apiKey);
    if(!url||!ak||typeof fetch!=='function') return;
    const eid=this.currentEvent?.event_id||'isd_2026', uid=this.currentUser?.user_id||this.currentUser?.id||'';
    const cancelled=(!rec.checked&&rec.note)?'Y':'';
    fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:ak,module:'Roster_Rollcall_Checkins',record:{checkin_id:`${eid}_${key}_${row._key||row.id}`,event_id:eid,list_key:key,list_title:def.title,row_key:row._key||'',area:row.area||'',unit:row.unit||'',name:row.name||row.unit||'',section:row.section||'',award:row.award||'',checked_in:(cancelled?'Y':(rec.checked?'Y':'N')),correction_cancelled:cancelled,checked_by:this.currentUser?.name||'未登入',checked_by_id:uid,checked_at:rec.at||new Date().toISOString(),checkin_note:rec.note||''}})}).catch(()=>showToast(`${def.tick_label}已本機保存，後端同步失敗`,'warning'));
  },

  /* ══════════════ 逐行新增／編輯／刪除（參加旅團名單不在此改，改回結構表） ══════════════ */
  openRosterRowForm(key,id){
    const def=this.rosterDef(key); if(!def) return;
    if(!this.rosterCanManage(key)){ showToast(`僅${def.owner_group}（${def.owner_note}）主任以上及管理層可編輯名單`,'error'); return; }
    const existing=id?this.rosterRows(key).find(r=>r.id===id):null;
    const listVals=v=>v==='areas'?ROSTER_AREAS:(v==='sections'?ROSTER_SECTIONS:(v==='section_awards'?ROSTER_SECTION_AWARDS:(v==='leader_awards'?ROSTER_LEADER_AWARDS:[])));
    const html=`
      <input type="hidden" id="rs-mode" value="${existing?'edit':'create'}"><input type="hidden" id="rs-id" value="${existing?.id||''}"><input type="hidden" id="rs-key" value="${key}">
      <div class="text-[11px] text-slate-500 mb-2">預定格式（${escapeHtml(def.title)}）— 帶 * 為必填；點名（${escapeHtml(def.tick_label)}）喺列表勾选，不需要喺呢度填。</div>
      <div class="space-y-2">
      ${def.columns.map(c=>{
        const val=escapeHtml(String(existing?.[c.k]??''));
        if(c.type==='select') return `<div><label class="text-[11px] font-bold">${escapeHtml(c.label)}</label><select id="rs-f-${c.k}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${(c.options||['']).map(o=>`<option value="${escapeHtml(o)}" ${o===String(existing?.[c.k]||'')?'selected':''}>${escapeHtml(o||'（未選擇）')}</option>`).join('')}</select></div>`;
        const dl=c.list?` list="rs-dl-${c.k}"`:'';
        return `<div><label class="text-[11px] font-bold">${escapeHtml(c.label)}${c.k===def.required?' *':''}</label><input id="rs-f-${c.k}"${dl} value="${val}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"${c.type==='number'?' inputmode="numeric"':''}></div>${c.list?`<datalist id="rs-dl-${c.k}">${listVals(c.list).map(o=>`<option value="${escapeHtml(o)}"></option>`).join('')}</datalist>`:''}`;
      }).join('')}
      </div>`;
    document.getElementById('record-modal-title').textContent=(existing?'編輯':'新增')+def.title+'（一行）';
    document.getElementById('record-form-fields').innerHTML=html;
    document.getElementById('record-form').onsubmit=(e)=>{ e.preventDefault(); this.submitRosterRowForm(key); };
    document.getElementById('modal-record').classList.remove('hidden');
  },

  submitRosterRowForm(key){
    const def=this.rosterDef(key); if(!def) return;
    const mode=document.getElementById('rs-mode').value, id=document.getElementById('rs-id').value;
    const o={};
    def.columns.forEach(c=>{ const el=document.getElementById('rs-f-'+c.k); o[c.k]=this.rosterCoerce(c,el?String(el.value||'').trim():''); });
    this.rosterApplyAutoSum(def,o);
    if(!String(o[def.required]||'').trim()){ showToast(`請填寫「${(def.columns.find(c=>c.k===def.required)||{}).label||def.required}」`,'error'); return; }
    const d=this.getRosterData(); const rows=d.rows[key]||[];
    if(mode==='edit'){ const i=rows.findIndex(r=>r.id===id); if(i>=0) rows[i]=Object.assign({},rows[i],o,{id,updated_at:new Date().toISOString()}); }
    else rows.push(Object.assign({id:'rr_'+Date.now(),created_at:new Date().toISOString(),created_by:this.currentUser?.name||''},o));
    d.rows[key]=rows; this.saveRosterData(d);
    this.closeModal('modal-record'); document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存','success'); this.rosterRefresh(key);
  },

  deleteRosterRow(key,id){
    const def=this.rosterDef(key); if(!def) return;
    if(!this.rosterCanManage(key)){ showToast(`僅${def.owner_group}（${def.owner_note}）主任以上及管理層可刪除`,'error'); return; }
    if(!confirm('確定刪除此行？（點名紀錄會一併移除）')) return;
    const d=this.getRosterData();
    const row=(d.rows[key]||[]).find(r=>r.id===id);
    d.rows[key]=(d.rows[key]||[]).filter(r=>r.id!==id);
    if(row && d.ticks[key]) delete d.ticks[key][this.rosterRowKey(def,row)];
    this.saveRosterData(d); this.rosterRefresh(key); showToast('已刪除','warning');
  },

  /* ══════════════ 匯入：Excel／CSV／Word（表格）／PDF（附件）／貼上文字 ══════════════ */
  // 代訂餐盒：「餐盒總數」空缺時以 A＋B＋C 自動加總（格式預設，減少判單對數錯漏）
  rosterApplyAutoSum(def,row){
    const cfg=ROSTER_AUTO_SUM&&ROSTER_AUTO_SUM[def.key]; if(!cfg) return row;
    const num=v=>Number(String(v??'').replace(/[^0-9.\-]/g,''))||0;
    if(String(row[cfg.field]??'').trim()===''){
      const t=cfg.parts.reduce((n,k)=>n+num(row[k]),0);
      if(t) row[cfg.field]=String(t);
    }
    return row;
  },
  rosterCoerce(col,val){
    if(val===undefined||val===null) return '';
    let s=String(val).replace(/\r?\n/g,' ').trim();
    if(col.type==='number'){ const n=s.replace(/[^0-9.\-]/g,''); return n&&!isNaN(Number(n))?String(Number(n)):''; }
    return s;
  },

  // 表頭對位：中文 label／英文 aliases 都認（先精準後寬鬆）
  rosterHeaderIndex(def,col,headers){
    const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,'').replace(/[（(].*?[）)]/g,'').replace(/[:：]/g,'');
    const want=[col.label,...(col.aliases||[]),col.k].map(norm).filter(Boolean);
    const hs=headers.map(norm);
    let i=hs.findIndex(h=>h&&want.includes(h));
    // 寬鬆對位：只喺「兩邊都夠長」先至用包含關係，以免「a」呢類單字表頭亂咁配中 area/award/oath
    if(i<0) i=hs.findIndex(h=>h&&h.length>=2&&want.some(w=>w.length>=2&&(h.includes(w)||w.includes(h))));
    return i;
  },

  rosterMapObjects(def,rawRows){
    const out=[];
    (rawRows||[]).forEach(r=>{
      const headers=Object.keys(r||{});
      if(!headers.length) return;
      const o={}; let any=false;
      def.columns.forEach(col=>{ const i=this.rosterHeaderIndex(def,col,headers); const v=i>=0?r[headers[i]]:''; o[col.k]=this.rosterCoerce(col,v); if(String(o[col.k]||'')!=='') any=true; });
      if(!any) return;
      out.push(this.rosterApplyAutoSum(def,o));
    });
    return out;
  },

  // 陣列行（Word 表格／貼上文字）：先搵表頭行，搵唔到就按欄位順序對位
  rosterGridToRows(def,grid){
    const rows=(grid||[]).map(r=>(r||[]).map(c=>String(c||'').trim()));
    if(rows.length<1) return {rows:[],note:''};
    let hi=-1, map=null;
    for(let i=0;i<Math.min(8,rows.length);i++){
      const m={}, used=new Set(); let hits=0;
      def.columns.forEach(col=>{ const idx=this.rosterHeaderIndex(def,col,rows[i]); if(idx>=0&&!used.has(idx)){ m[col.k]=idx; used.add(idx); hits++; } });
      // 必須係「有兩格以上非空、而且配到兩個以上欄」先當表頭，避免把內容行誤認做表頭
      if(hits>=2&&rows[i].filter(Boolean).length>=2){ hi=i; map=m; break; }
    }
    const out=[]; let skipped=0;
    for(let i=(hi>=0?hi+1:0);i<rows.length;i++){
      const cells=rows[i]; if(!cells.some(c=>c)){ continue; }
      const o={};
      def.columns.forEach((col,ci)=>{ const idx=map?(map[col.k]??-1):ci; o[col.k]=idx>=0?this.rosterCoerce(col,cells[idx]):''; });
      if(!String(o[def.required]||'').trim()){ skipped++; continue; }
      out.push(this.rosterApplyAutoSum(def,o));
    }
    return {rows:out,note:hi<0?'（未見表頭行，已按欄位順序對位）':(skipped?`（${skipped} 行缺少必填欄位已跳過）`:'')};
  },

  async rosterParseDocx(def,file){
    if(typeof mammoth==='undefined') throw new Error('未載入 Word 解析庫（需連線 CDN）');
    const ab=await file.arrayBuffer();
    let text='', html='';
    try{ const r=await mammoth.extractRawText({arrayBuffer:ab}); text=String(r&&r.value||''); }catch(e){}
    try{ const r=await mammoth.convertToHtml({arrayBuffer:ab}); html=String(r&&r.value||''); }catch(e){}
    // 1) Word 內嘅表格 → grid
    const tables=[...(html.match(/<table[^>]*>[\s\S]*?<\/table>/gi)||[])];
    for(const t of tables){
      const grid=[...(t.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)||[])].map(tr=>[...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>String(c[1]).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim()));
      const g=this.rosterGridToRows(def,grid);
      if(g.rows.length) return {rows:g.rows,text,note:'（已由 Word 表格解析）'};
    }
    // 2) 無表格：按行＋（Tab／多空白／逗號）分欄
    const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const grid=lines.map(l=>l.split(/\t| {2,}|,|，|、/).map(s=>s.trim()).filter((s,ix,arr)=>s!==''||ix===0||ix<arr.length-1));
    const g=this.rosterGridToRows(def,grid);
    return {rows:g.rows,text,note:g.rows.length?'（已由文字分行解析，請務必核對）':'（Word 冇可辨識嘅表格／行列）'};
  },

  async rosterImportFile(key,file){
    const def=this.rosterDef(key); if(!def) return;
    if(!this.rosterCanManage(key)){ showToast(`僅${def.owner_group}（${def.owner_note}）主任以上及管理層可上載名單`,'error'); return; }
    if(!file){ showToast('請選擇檔案','error'); return; }
    const name=String(file.name||'').toLowerCase();
    const overlay=document.getElementById('savingOverlay'); if(overlay) overlay.classList.add('active');
    try{
      if(/\.(xlsx|xlsm|xls|csv)$/.test(name)){
        if(typeof XLSX==='undefined') throw new Error('未載入 Excel 解析庫（需連線 CDN）');
        const raw=await this.parseExcelToRows(file);
        const rows=this.rosterMapObjects(def,raw);
        if(!rows.length) throw new Error(`Excel 搵唔到可用欄位（表頭需包含：${def.columns.slice(0,3).map(c=>c.label).join('／')}…）`);
        this.openRosterImportPreview(key,rows,{source:file.name,note:`（Excel：${raw.length} 行 → 配對 ${rows.length} 行）`});
        return;
      }
      if(/\.docx?$/.test(name)){
        const p=await this.rosterParseDocx(def,file);
        await this.rosterAttachFile(key,file,p.text?String(p.text).slice(0,20000):'');
        if(p.rows.length){ this.openRosterImportPreview(key,p.rows,{source:file.name,note:`（Word 解析 ${p.rows.length} 行）${p.note||''}`}); return; }
        this.rosterRefresh(key);
        showToast('Word 已內嵌為附件（冇可辨識嘅表格／行列）；如需點名名單請用 Excel 或「貼上文字」','warning');
        return;
      }
      if(/\.pdf$/.test(name)){
        await this.rosterAttachFile(key,file,'');
        this.rosterRefresh(key);
        showToast('PDF 已內嵌預覽；PDF 唔支援自動解析成行列 — 請用 EXCEL／WORD 匯入點名名單，或「貼上文字」','warning');
        return;
      }
      throw new Error('不支援嘅檔案格式（可用：.xlsx .xls .csv .docx .pdf）');
    }catch(e){ showToast('名單讀取失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  },

  // 匯入前預覽＋揀「取代／附加」
  openRosterImportPreview(key,rows,meta){
    const def=this.rosterDef(key); if(!def) return;
    this._rosterPending=this._rosterPending||{};
    this._rosterPending[key]={rows,meta:meta||{}};
    const cur=this.rosterRows(key).length;
    const html=`
      <div class="text-[11px] text-slate-600 leading-relaxed mb-2"><b>${escapeHtml((meta&&meta.source)||'上傳檔案')}</b> 解析到 <b>${rows.length}</b> 行${escapeHtml((meta&&meta.note)||'')}；現有名單 <b>${cur}</b> 行。</div>
      <div class="space-y-1.5 mb-3">
        <label class="flex items-center gap-2 text-[12px]"><input type="radio" name="rs-imp-mode" value="replace" checked> <b>取代</b>現有名單（${cur} 行→${rows.length} 行；現有${def.tick_label}紀錄保留相同行）</label>
        <label class="flex items-center gap-2 text-[12px]"><input type="radio" name="rs-imp-mode" value="append"> <b>附加</b>喺現有名單之後（合併後最多 ${cur+rows.length} 行，重複行會合併）</label>
      </div>
      <div class="max-h-[280px] overflow-auto border rounded-xl"><table class="min-w-full text-[10.5px]"><thead class="bg-slate-100 sticky top-0"><tr>${def.columns.map(c=>`<th class="px-1.5 py-1 text-left whitespace-nowrap">${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
      <tbody class="divide-y">${rows.slice(0,60).map(r=>`<tr>${def.columns.map(c=>`<td class="px-1.5 py-1">${escapeHtml(String(r[c.k]||''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${rows.length>60?`<div class="text-[10px] text-slate-400 mt-1">（預覽只列首 60 行，匯入會包含全部 ${rows.length} 行）</div>`:''}`;
    document.getElementById('record-modal-title').textContent='確認匯入——'+def.title;
    document.getElementById('record-form-fields').innerHTML=html;
    document.getElementById('record-form').onsubmit=(e)=>{ e.preventDefault(); this.applyRosterImport(key); };
    document.getElementById('modal-record').classList.remove('hidden');
  },

  applyRosterImport(key){
    const def=this.rosterDef(key); if(!def) return;
    const pending=(this._rosterPending||{})[key]; if(!pending||!pending.rows.length){ showToast('冇待匯入嘅資料','error'); return; }
    const mode=(document.querySelector('input[name="rs-imp-mode"]:checked')||{}).value||'replace';
    const d=this.getRosterData();
    const stamp={updated_at:new Date().toISOString(),updated_by:this.currentUser?.name||'',source_file:pending.meta.source||''};
    const incoming=pending.rows.map((o,i)=>Object.assign({id:`rr_${Date.now()}_${i}`},o,stamp));
    if(def.source==='participants'){
      // 名單本身仍由 participants（Drive 結構表／Excel）承載——呢度只係將匯入結果寫返過去
      const base=mode==='replace'?[]:(this.getParticipantsData()||[]).map(p=>({...p}));
      const keyOf=p=>[String(p.area||''),String(p.unit_name||p.unit||''),String(p.section||'')].map(x=>x.trim()).join('|');
      const idx=new Map(base.map(p=>[keyOf(p),p]));
      incoming.forEach(o=>{
        const rec={unit_name:String(o.unit||'').trim(),section:String(o.section||'').trim(),headcount:String(o.headcount||'').trim(),area:String(o.area||'').trim(),notes:[o.leader?('領隊：'+o.leader):'',String(o.notes||'')].filter(Boolean).join('；')};
        const k=keyOf(rec);
        if(idx.has(k)) Object.assign(idx.get(k),rec); else { base.push(rec); idx.set(k,rec); }
      });
      this.saveParticipantsData(base);
      d.meta=d.meta||{}; d.meta[key]={count:base.length,imported_at:new Date().toISOString(),imported_by:this.currentUser?.name||'',file:pending.meta.source||''};
      this.saveRosterData(d);
      delete (this._rosterPending||{})[key];
      this.closeModal('modal-record'); document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
      this.rosterReloadHosts(key);
      showToast(`已匯入參加旅團名單：${base.length} 個旅團（${mode==='replace'?'取代':'附加'}）`,'success');
      return;
    }
    let rows=(d.rows[key]||[]).map(r=>({...r}));
    if(mode==='replace'){
      const oldTicks=d.ticks[key]||{}; const nextTicks={};
      // 內容 key 相同即視為同一行：點名狀態保留（例如只係補多一欄獎項／改名重新上載）
      incoming.forEach(r=>{ const k=this.rosterRowKey(def,r); if(oldTicks[k]) nextTicks[k]=oldTicks[k]; });
      rows=incoming; d.ticks[key]=nextTicks;
    } else {
      const seen=new Map(rows.map(r=>[this.rosterRowKey(def,r),r]));
      incoming.forEach(r=>{ const k=this.rosterRowKey(def,r); if(seen.has(k)) Object.assign(seen.get(k),r,{id:seen.get(k).id}); else { rows.push(r); seen.set(k,r); } });
    }
    d.rows[key]=rows; d.meta=d.meta||{}; d.meta[key]={count:rows.length,imported_at:new Date().toISOString(),imported_by:this.currentUser?.name||'',file:pending.meta.source||''};
    this.saveRosterData(d);
    delete (this._rosterPending||{})[key];
    this.closeModal('modal-record'); document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    this.rosterReloadHosts(key);
    showToast(`已匯入${def.title}：${rows.length} 行（${mode==='replace'?'取代':'附加'}）`,'success');
  }
,
  openRosterPasteForm(key){
    const def=this.rosterDef(key); if(!def) return;
    if(!this.rosterCanManage(key)){ showToast(`僅${def.owner_group}（${def.owner_note}）主任以上及管理層可上載名單`,'error'); return; }
    const html=`
      <div class="text-[11px] text-slate-500 leading-relaxed mb-2">喺 PDF／Word／網頁選取名單（含表頭嗰行）複製後貼入呢度；每行一組，欄位用 Tab、兩格以上空白或「,」分隔。格式：${def.columns.map(c=>escapeHtml(c.label)).join(' → ')}</div>
      <textarea id="rs-paste" rows="10" class="w-full px-3 py-2 border rounded-xl text-[12px] font-mono" placeholder="${escapeHtml(def.columns.map(c=>c.label).join('\t'))}"></textarea>
      <label class="flex items-center gap-2 text-[11px] mt-2"><input type="checkbox" id="rs-paste-replace" checked> 取代現有名單（唔 TICK 就附加）</label>`;
    document.getElementById('record-modal-title').textContent='貼上文字匯入——'+def.title;
    document.getElementById('record-form-fields').innerHTML=html;
    document.getElementById('record-form').onsubmit=(e)=>{ e.preventDefault(); this.submitRosterPasteForm(key); };
    document.getElementById('modal-record').classList.remove('hidden');
  },

  submitRosterPasteForm(key){
    const def=this.rosterDef(key);
    const text=String(document.getElementById('rs-paste')?.value||'');
    const replace=!!document.getElementById('rs-paste-replace')?.checked;
    const grid=text.split(/\r?\n/).map(l=>l.replace(/\s+$/,'')).filter(l=>l.trim()!=='').map(l=>l.split(/\t| {2,}|,|，/).map(s=>s.trim()));
    const g=this.rosterGridToRows(def,grid);
    if(!g.rows.length){ showToast('解析唔到行列，請確認每行以 Tab／多空白分隔','error'); return; }
    this.closeModal('modal-record'); document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    this.openRosterImportPreview(key,g.rows,{source:'貼上文字',note:`（文字解析 ${g.rows.length} 行）${g.note||''}`});
    if(!replace) { const m=document.querySelector('input[name="rs-imp-mode"][value="append"]'); if(m) m.checked=true; }
  },

  /* ══════════════ 範本／匯出／列印 ══════════════ */
  rosterDownloadTemplate(key){
    const def=this.rosterDef(key); if(!def) return;
    const grid=[def.columns.map(c=>c.label)].concat(def.sample_rows||[]);
    this.downloadCSV(`roster_${key}_template_${todayISO()}.csv`, grid);
  },

  rosterExportCSV(key){
    const def=this.rosterDef(key); if(!def) return;
    const rows=this.rosterViewRows(key);
    const grid=[[def.tick_label,...def.columns.map(c=>c.label),'點名時間','點名人','備註(點名)']];
    rows.forEach(r=>grid.push([r._checked?'已'+def.tick_label:'未'+def.tick_label,...def.columns.map(c=>String(r[c.k]??'')),String(r._at||'').replace('T',' ').slice(0,19),r._by||'',r._note||'']));
    this.downloadCSV(`roster_${key}_${todayISO()}.csv`, grid);
  },

  printRosterList(key,scope){
    const el=document.getElementById(`roster-print-${scope||'main'}-${key}`);
    if(!el){ showToast('找不到列印區域','error'); return; }
    this.printCoordArea(el.id,`${(this.rosterDef(key)||{}).title||'名單'}（${(this.rosterDef(key)||{}).tick_label||'點名'}表）`);
  },

  /* ══════════════ 附件（沿用執行手冊上傳機制：PDF／Word／圖片／Drive 連結） ══════════════ */
  async rosterAttachFile(key,file,fileText){
    const attachKey=this.rosterAttachSection(key);
    const files=this.getExecManualFiles(attachKey);
    const rec={id:'emf_'+Date.now(), section:attachKey, title:file.name, description:'上載名單時自動附加', version:'v1',
      file_name:file.name, file_data:await fileToDataUrl(file), file_url:'', file_text:fileText||'',
      created_by:this.currentUser?.name||'', created_at:new Date().toISOString()};
    files.push(rec); this.saveExecManualFiles(attachKey,files);
    return rec;
  },

  /* ══════════════ 後端同步（跨裝置：名單行＋點名留痕） ══════════════ */
  async rosterPushToGas(key){
    const def=this.rosterDef(key); if(!def) return;
    if(!this.rosterBackendReady()){ showToast('未設定後端連線（示範模式唔會寫後端）','warning'); return; }
    if(!this.rosterCanManage(key)){ showToast('僅負責組別及管理層可同步名單','error'); return; }
    const url=this.gasUrl||localStorage.getItem(LS.gasUrl), ak=this.apiKey||localStorage.getItem(LS.apiKey);
    const eid=this.currentEvent?.event_id||'isd_2026', rows=this.rosterRows(key), ticks=this.getRosterData().ticks[key]||{};
    if(!rows.length){ showToast('名單係空嘅，冇嘢可同步','warning'); return; }
    showToast(`正在同步 ${rows.length} 行至後端…`,'');
    let okc=0, bad=[];
    for(const r of rows){
      const rec={row_id:`${eid}_${key}_${r._key||r.id}`,event_id:eid,list_key:key,list_title:def.title,
        row_json:JSON.stringify(def.columns.reduce((o,c)=>{o[c.k]=String(r[c.k]??'');return o;},{})),
        ticked:r._checked?'Y':'N',tick_json:JSON.stringify(ticks[r._key]||{}),
        updated_by:this.currentUser?.name||'',updated_at:new Date().toISOString(),created_at:new Date().toISOString()};
      let done=false;
      for(let i=0;i<3&&!done;i++){
        try{ const res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:ak,module:'Roster_Lists',record:rec})}); const j=await res.json(); done=!!(j&&j.success); }catch(e){}
      }
      if(done) okc++; else bad.push(rec.row_id);
    }
    showToast(bad.length?`已同步 ${okc}/${rows.length} 行，${bad.length} 行失敗（網絡好啲再按一次）`:`已同步 ${okc} 行至後端`,bad.length?'error':'success');
  },

  async rosterPullFromGas(key){
    const def=this.rosterDef(key); if(!def) return;
    if(!this.rosterBackendReady()){ showToast('未設定後端連線（示範模式只用本機資料）','warning'); return; }
    const url=this.gasUrl||localStorage.getItem(LS.gasUrl), ak=this.apiKey||localStorage.getItem(LS.apiKey);
    const eid=this.currentEvent?.event_id||'isd_2026';
    try{
      const res=await fetch(`${url}?action=getEventData&event_id=${encodeURIComponent(eid)}&api_key=${encodeURIComponent(ak)}`);
      const j=await res.json(); const list=((j&&j.data)||{}).Roster_Lists||[];
      const mine=list.filter(r=>String(r.list_key||'')===key);
      if(!mine.length){ showToast('後端暫時冇呢份名單嘅紀錄（可先「同步名單至後端」）','warning'); return; }
      const d=this.getRosterData(); const rows=[]; const ticks=d.ticks[key]||{};
      mine.forEach(r=>{
        let o={}; try{ o=JSON.parse(r.row_json||'{}'); }catch(e){}
        const row=Object.assign({id:'rr_gas_'+String(r.row_id||'').replace(/[^0-9A-Za-z_\-.|]/g,'_')},o);
        const k=this.rosterRowKey(def,row);
        try{ const t=JSON.parse(r.tick_json||'null'); if(t&&t.checked&&!ticks[k]) ticks[k]=t; }catch(e){}
        if(/^(Y|y|true|1|是)$/.test(String(r.ticked||''))) ticks[k]=Object.assign({checked:true,by:'後端同步',at:String(r.updated_at||'')},ticks[k]||{},{checked:true});
        rows.push(row);
      });
      d.rows[key]=rows; d.ticks[key]=ticks; d.meta=d.meta||{}; d.meta[key]={count:rows.length,pulled_at:new Date().toISOString(),pulled_by:this.currentUser?.name||''};
      this.saveRosterData(d); this.rosterRefresh(key);
      showToast(`已由後端取回 ${rows.length} 行`,'success');
    }catch(e){ showToast('取回失敗：'+e.message,'error'); }
  },

  /* ══════════════ 給其他模組嘅小工具 ══════════════ */
  rosterCounts(key){
    const rows=this.rosterViewRows(key);
    return {total:rows.length,ticked:rows.filter(r=>r._checked).length};
  }
,
});
