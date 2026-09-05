/* 39-lost-found.js — 失物認領 (Lost & Found) v11.1（2026-08-31 更新）
   用戶定案：執行手冊「各類附加資料」加入失物認領，同時加入「行政組」部門中心；由行政組紀錄。
   v11.1 兩種登記情況：
     ① 有失物登記（type=found）  — 拾獲物品交行政組登記，等物主認領
     ② 有人要尋找物品（type=seeking）— 失主報失，等物品出現
   兩者都會在下方各自出現列表，點入去「處理認領」：
     · 失物 → 找到物主      ＝ 已認領（自動記錄認領時間）
     · 尋物 → 尋回失物      ＝ 已尋回（自動記錄尋回時間）
   所有時間（登記時間 created_at／完成時間 claimed_at）都係系統自動紀錄，唔使人手填。
   · 查閱：任何人（含未登入公眾）都可睇清單（未登入時隱藏聯絡電話）
   · 紀錄：行政組登入成員＋管理層（LOST_FOUND_MANAGERS）可新增／處理／刪除
   · 儲存：localStorage（即時）＋後端 Lost_Found 工作表（跨裝置同步，見 23-sync.js）
   v14.1：確認認領／尋回只改狀態（紀錄唔會刪，只有 🗑️ 先會刪）；新增「尋回率」＋按日摘要（當日失咗乜、物主係邊個、幾多已尋回）；
          匯出改為 Excel／Word（冇 CSV），PDF 用「列印」。 */
Object.assign(ScoutEventApp.prototype,{

  // 系統自動時間戳（本地時間，格式 YYYY-MM-DD HH:MM）——登記／認領一律自動紀錄
  lostFoundNowStamp(){
    const d=new Date(), p=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
,
  getLostFoundData(){
    const key=LS.lostFound(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    const data=(local&&Array.isArray(local.records))?local:{records:[]};
    // 舊資料（v11.0 未有 type）一律當作「失物登記」
    (data.records||[]).forEach(r=>{ if(!r.type) r.type='found'; });
    return data;
  }
,
  saveLostFoundData(data){
    const key=LS.lostFound(this.currentEvent?.event_id||'isd_2026');
    localStorage.setItem(key,JSON.stringify(data));
    if(!this.mockMode&&this.gasUrl){
      (data.records||[]).forEach(r=>{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Lost_Found',record:{lost_id:r.id,event_id:this.currentEvent?.event_id||'isd_2026',type:r.type||'found',item_name:r.item_name||'',description:r.description||'',found_date:r.found_date||'',found_time:r.found_time||'',found_location:r.found_location||'',found_by:r.found_by||'',contact:r.contact||'',status:r.status||'待認領',claimed_by:r.claimed_by||'',claimed_contact:r.claimed_contact||'',claimed_at:r.claimed_at||'',closed_by:r.closed_by||'',notes:r.notes||'',recorded_by:r.recorded_by||'',recorded_by_id:r.recorded_by_id||'',created_at:r.created_at||'',updated_at:r.updated_at||''}})}).catch(()=>{});
      });
    }
  }
,
  // 由行政組紀錄（行政組任何登入成員＋管理層／MOCK 全權）
  canManageLostFound(){
    if(!this.currentUser) return false;
    if(this.isAdmin()||this.currentUser.mock_admin) return true;
    if(this.roleLevel(this.currentUser.role)>=100) return true;
    const g=normalizeGroupName(this.currentUser.group_name||'');
    if(!g) return false;
    return LOST_FOUND_MANAGERS.some(x=>{const ox=normalizeGroupName(x); return ox===g||g.includes(ox)||ox.includes(g);});
  }
,
  lostFoundSorted(type){
    let list=(this.getLostFoundData().records||[]).slice();
    if(type) list=list.filter(r=>(r.type||'found')===type);
    return list.sort((a,b)=>`${b.found_date||''}${b.found_time||''}`.localeCompare(`${a.found_date||''}${a.found_time||''}`));
  }
,
  // 該筆紀錄是否已完成（失物＝已認領／尋物＝已尋回）
  isLostFoundClosed(r){
    const s=r.status||'';
    return s==='已認領'||s==='已尋回'||s==='已處理';
  }
,
  lostFoundDoneLabel(type){ return (type==='seeking')?'已尋回':'已認領'; }
,
  lostFoundOpenLabel(type){ return (type==='seeking')?'尋找中':'待認領'; }
,
  /* —— 單一種類的列表 table —— */
  lostFoundTableHTML(type){
    const canManage=this.canManageLostFound();
    const isPublic=!this.currentUser;
    const seeking=type==='seeking';
    const list=this.lostFoundSorted(type);
    const rows=list.map(r=>{
      const done=this.isLostFoundClosed(r);
      const cls=canManage?'cursor-pointer hover:bg-teal-50':'';
      const click=canManage?`onclick="app.openLostFoundClaim('${escapeHtml(r.id)}')"`:'';
      return `<tr class="${done?'bg-emerald-50/60':''} ${cls}" ${click} title="${canManage?'點擊處理認領':''}">
        <td class="border px-2 py-1 whitespace-nowrap" data-label="${seeking?'遺失日期':'拾獲日期'}">${escapeHtml(r.found_date||'-')}${r.found_time?`<br><span class="text-[10px] text-slate-500">${escapeHtml(r.found_time)}</span>`:''}</td>
        <td class="border px-2 py-1 font-medium" data-label="物品">${escapeHtml(r.item_name||'-')}${r.description?`<div class="text-[10px] text-slate-500">${escapeHtml(r.description)}</div>`:''}</td>
        <td class="border px-2 py-1" data-label="${seeking?'遺失地點':'拾獲地點'}">${escapeHtml(r.found_location||'-')}</td>
        <td class="border px-2 py-1" data-label="${seeking?'尋物者':'拾獲/交來者'}">${escapeHtml(r.found_by||'-')}${r.contact?`<br><span class="text-[10px] text-slate-500">${isPublic?'🔒 需登入查看':escapeHtml(r.contact)}</span>`:''}</td>
        <td class="border px-2 py-1 text-center" data-label="狀態"><span class="text-[10px] px-2 py-0.5 rounded-full border ${done?'bg-emerald-100 text-emerald-700 border-emerald-300':'bg-amber-100 text-amber-700 border-amber-300'}">${escapeHtml(r.status||this.lostFoundOpenLabel(r.type))}</span></td>
        <td class="border px-2 py-1" data-label="${seeking?'交還／尋回':'認領人'}">${escapeHtml(r.claimed_by||'-')}${r.claimed_contact?`<br><span class="text-[10px] text-slate-500">${isPublic?'🔒 需登入查看':escapeHtml(r.claimed_contact)}</span>`:''}${r.claimed_at?`<br><span class="text-[10px] text-emerald-600">⏱ ${escapeHtml(r.claimed_at)}${r.closed_by?`（${escapeHtml(r.closed_by)}）`:''}</span>`:''}</td>
        <td class="border px-2 py-1 text-[10px]" data-label="備註">${escapeHtml(r.notes||'')}</td>
        <td class="border px-2 py-1 text-[10px] whitespace-nowrap" data-label="登記時間／紀錄人">${escapeHtml((r.created_at||'').replace('T',' ').slice(0,16)||'-')}<br><span class="text-slate-500">${escapeHtml(r.recorded_by||'-')}</span></td>
        ${canManage?`<td class="border px-2 py-1 text-right whitespace-nowrap" data-label="操作" onclick="event.stopPropagation()">
          <button onclick="app.openLostFoundClaim('${escapeHtml(r.id)}')" class="bg-teal-600 text-white px-2 py-1 rounded-xl text-[10px] font-bold">${done?'查看':'處理認領'}</button>
          <button onclick="app.openLostFoundForm('${escapeHtml(r.type||'found')}','${escapeHtml(r.id)}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button>
          <button onclick="app.deleteLostFoundRecord('${escapeHtml(r.id)}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></td>`:''}
      </tr>`;
    }).join('');
    const empty=seeking?'暫無尋物登記 — 有人遺失物品請交行政組登記':'暫無失物紀錄 — 拾獲失物請交行政組登記';
    return `<div class="table-responsive"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr>
      <th class="border px-2 py-1 text-left">${seeking?'遺失日期／時間':'拾獲日期／時間'}</th>
      <th class="border px-2 py-1 text-left">物品</th>
      <th class="border px-2 py-1 text-left">${seeking?'遺失地點':'拾獲地點'}</th>
      <th class="border px-2 py-1 text-left">${seeking?'尋物者／聯絡':'拾獲／交來者'}</th>
      <th class="border px-2 py-1">狀態</th>
      <th class="border px-2 py-1 text-left">${seeking?'尋回紀錄（自動時間）':'認領人／聯絡（自動時間）'}</th>
      <th class="border px-2 py-1 text-left">備註</th>
      <th class="border px-2 py-1 text-left">登記時間／紀錄人</th>
      ${canManage?'<th class="border px-2 py-1 text-right">操作</th>':''}
    </tr></thead><tbody>${rows||`<tr><td colspan="${canManage?9:8}" class="border px-2 py-4 text-center text-slate-400">${empty}</td></tr>`}</tbody></table></div>`;
  }
,
  /* —— 統計：總數／已完成／尋回率（已認領＋已尋回 ÷ 全部登記）；按日分組供報告用 —— */
  lostFoundStats(list){
    const all=list||this.lostFoundSorted();
    const found=all.filter(r=>(r.type||'found')!=='seeking'), seeking=all.filter(r=>(r.type||'found')==='seeking');
    const closed=all.filter(r=>this.isLostFoundClosed(r));
    const rate=all.length?Math.round(closed.length*100/all.length):0;
    const seekClosed=seeking.filter(r=>this.isLostFoundClosed(r)).length, foundClosed=found.filter(r=>this.isLostFoundClosed(r)).length;
    return {total:all.length,found:found.length,seeking:seeking.length,closed:closed.length,pending:all.length-closed.length,rate,
      seekRate:seeking.length?Math.round(seekClosed*100/seeking.length):0,foundRate:found.length?Math.round(foundClosed*100/found.length):0,seekClosed,foundClosed};
  }
,
  // 按日摘要：每日登記幾多、已完成幾多、尋回率、物主／尋物者名單（供當日回顧同報告）
  lostFoundDaily(list){
    const all=list||this.lostFoundSorted();
    const byDay={};
    all.forEach(r=>{ const d=r.found_date||(r.created_at||'').slice(0,10)||'（未填日期）'; (byDay[d]=byDay[d]||[]).push(r); });
    return Object.keys(byDay).sort((a,b)=>b.localeCompare(a)).map(day=>{
      const rows=byDay[day], st=this.lostFoundStats(rows);
      const owners=rows.map(r=>{ const who=r.claimed_by||((r.type||'found')==='seeking'?r.found_by:''); return who?`${r.item_name||'物品'}→${who}`:''; }).filter(Boolean);
      return {day,rows,stats:st,owners};
    });
  }
,
  lostFoundDailyHTML(){
    const days=this.lostFoundDaily();
    if(!days.length) return '';
    const isPublic=!this.currentUser;
    return `<div class="bg-white border rounded-xl p-3">
      <h4 class="font-bold text-[12px] mb-2 flex items-center gap-2"><i class="fa-solid fa-calendar-day text-teal-700"></i>按日摘要（當日失咗乜／物主／尋回率）</h4>
      <div class="table-responsive"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr>
        <th class="border px-2 py-1 text-left">日期</th><th class="border px-2 py-1">登記</th><th class="border px-2 py-1">失物</th><th class="border px-2 py-1">尋物</th><th class="border px-2 py-1">已完成</th><th class="border px-2 py-1">待處理</th><th class="border px-2 py-1">尋回率</th><th class="border px-2 py-1 text-left">物品 → 物主／領回人</th></tr></thead>
        <tbody>${days.map(d=>`<tr><td class="border px-2 py-1 whitespace-nowrap font-bold">${escapeHtml(d.day)}</td><td class="border px-2 py-1 text-center">${d.stats.total}</td><td class="border px-2 py-1 text-center">${d.stats.found}</td><td class="border px-2 py-1 text-center">${d.stats.seeking}</td><td class="border px-2 py-1 text-center text-emerald-700 font-bold">${d.stats.closed}</td><td class="border px-2 py-1 text-center ${d.stats.pending?'text-amber-700 font-bold':''}">${d.stats.pending}</td><td class="border px-2 py-1 text-center font-bold ${d.stats.rate>=80?'text-emerald-700':d.stats.rate>=50?'text-amber-700':'text-rose-700'}">${d.stats.rate}%</td><td class="border px-2 py-1 text-[10px]">${d.owners.length?d.owners.map(escapeHtml).join('；'):'<span class="text-slate-400">—</span>'}</td></tr>`).join('')}</tbody></table></div>
      <p class="text-[10px] text-slate-400 mt-1">尋回率＝（已認領＋已尋回）÷ 該日全部登記。${isPublic?'':'確認認領／尋回後紀錄會保留（唔會刪），所以事後仍可查返當日失物同物主。'}</p>
    </div>`;
  }
,
  /* —— 清單 HTML（執行手冊「各類附加資料」及「行政組」部門中心共用同一份）—— */
  renderLostFoundHTML(opts){
    const o=opts||{};
    const canManage=this.canManageLostFound();
    const isPublic=!this.currentUser;
    const all=this.lostFoundSorted();
    const found=this.lostFoundSorted('found');
    const seeking=this.lostFoundSorted('seeking');
    const pendingFound=found.filter(r=>!this.isLostFoundClosed(r)).length;
    const pendingSeek=seeking.filter(r=>!this.isLostFoundClosed(r)).length;
    const closed=all.filter(r=>this.isLostFoundClosed(r)).length;
    const st=this.lostFoundStats(all);
    const chip=(v,l,cls)=>`<div class="${cls} rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold">${v}</div><div class="text-[10px]">${l}</div></div>`;
    return `<div class="space-y-3">
      <div class="bg-teal-50 border border-teal-200 rounded-xl p-3 text-[11px] leading-relaxed text-teal-900"><b>🧳 失物認領：</b>兩種登記情況 —— <b>①有失物登記</b>（拾獲物品交來）及 <b>②有人要尋找物品</b>（失主報失）。兩者都會在下方列表出現，<b>點入該筆紀錄即可處理認領</b>（失物找到物主＝已認領／尋物者尋回失物＝已尋回），確認時<b>系統自動紀錄時間</b>。<b>由行政組紀錄</b>（同時設於「行政組 → 部門管理中心」）；其他組別及公眾只可查閱${isPublic?'（聯絡電話需登入先可見）':''}。</div>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2 max-w-3xl" data-lost-found-stats>
        ${chip(found.length,'失物登記','bg-slate-100 text-slate-700 border')}
        ${chip(seeking.length,'尋物登記','bg-slate-100 text-slate-700 border')}
        ${chip(pendingFound+pendingSeek,'待處理','bg-amber-50 text-amber-700 border border-amber-200')}
        ${chip(closed,'已完成（已認領／已尋回）','bg-emerald-50 text-emerald-700 border border-emerald-200')}
        ${chip(`${st.rate}%`,`尋回率（${st.closed}／${st.total}）`,st.rate>=80?'bg-emerald-600 text-white border border-emerald-700':st.total?'bg-teal-50 text-teal-800 border border-teal-200':'bg-slate-100 text-slate-500 border')}
      </div>
      <div class="flex gap-2 flex-wrap">
        ${canManage?`<button onclick="app.openLostFoundForm('found')" class="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-box-archive mr-1"></i>① 登記失物（拾獲物品）</button>
        <button onclick="app.openLostFoundForm('seeking')" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-magnifying-glass mr-1"></i>② 登記尋物（有人要尋找物品）</button>`:`<span class="text-[11px] text-slate-500 bg-white border px-3 py-2 rounded-xl"><i class="fa-solid fa-lock mr-1"></i>只讀 — 失物由行政組紀錄</span>`}
        ${canManage?`<label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"><i class="fa-solid fa-file-excel mr-1"></i>匯入 EXCEL 失物紀錄<input type="file" accept=".xlsx,.xls" class="hidden" onchange="app.handleLostFoundExcelUpload(this.files[0])"></label>`:''}
        <button onclick="app.exportLostFoundExcel()" class="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-excel mr-1"></i>匯出報告 Excel</button>
        <button onclick="app.exportLostFoundWord()" class="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-word mr-1"></i>匯出報告 Word</button>
        <button onclick="app.printCoordArea('lost-found-print','失物認領報告')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印／PDF</button>
        <span id="lost-found-count" class="text-[11px] bg-teal-100 text-teal-700 px-3 py-2 rounded-full border border-teal-200">${all.length} 筆</span>
      </div>
      <div id="lost-found-print" class="space-y-4">
        ${this.lostFoundDailyHTML()}
        <div class="bg-white border rounded-xl p-3">
          <h4 class="font-bold text-[12px] mb-2 flex items-center gap-2"><i class="fa-solid fa-box-archive text-teal-700"></i>① 失物登記列表（拾獲物品 · 等候物主認領）<span class="text-[10px] text-slate-400 font-normal">${found.length} 筆${canManage?' · 點擊該行處理認領':''}</span></h4>
          ${this.lostFoundTableHTML('found')}
        </div>
        <div class="bg-white border rounded-xl p-3">
          <h4 class="font-bold text-[12px] mb-2 flex items-center gap-2"><i class="fa-solid fa-magnifying-glass text-indigo-700"></i>② 尋物登記列表（有人要尋找物品）<span class="text-[10px] text-slate-400 font-normal">${seeking.length} 筆${canManage?' · 點擊該行處理認領':''}</span></h4>
          ${this.lostFoundTableHTML('seeking')}
        </div>
        <p class="text-[10px] text-slate-400">失物認領由行政組紀錄：兩種登記（失物／尋物）之登記時間與認領（尋回）時間<b>全部由系統自動紀錄</b>，毋須人手填寫。${o.compact?'本頁與「執行手冊 → 各類附加資料 → 失物認領」共用同一份紀錄。':''}</p>
      </div>
    </div>`;
  }
,
  /* —— 登記表單（type：found＝有失物登記／seeking＝有人要尋找物品）—— */
  openLostFoundForm(type,id){
    if(!this.canManageLostFound()){ showToast('失物認領由行政組紀錄','error'); return; }
    // 舊版簽名 openLostFoundForm(id)：第一個參數若非 found/seeking 當作 id
    if(type&&type!=='found'&&type!=='seeking'){ id=type; type=null; }
    const existing=id?(this.getLostFoundData().records||[]).find(r=>r.id===id):null;
    const d=existing||{};
    const t=type||d.type||'found';
    const seeking=t==='seeking';
    document.getElementById('record-modal-title').textContent=existing?(seeking?'編輯尋物登記':'編輯失物登記'):(seeking?'② 登記尋物（有人要尋找物品）':'① 登記失物（拾獲物品）');
    document.getElementById('record-form-fields').innerHTML=`
      <input type="hidden" id="lf-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="lf-id" value="${escapeHtml(d.id||'')}">
      <input type="hidden" id="lf-type" value="${escapeHtml(t)}">
      <div class="${seeking?'bg-indigo-50 border-indigo-200 text-indigo-900':'bg-teal-50 border-teal-200 text-teal-900'} border rounded-xl p-3 text-[11px] mb-3">
        ${seeking?'<b>尋物登記：</b>有人遺失物品前來查詢，先登記物品及聯絡方法；日後物品出現，喺列表點入去按「確認尋回」，系統會自動記錄尋回時間。':'<b>失物登記：</b>拾獲物品交來行政組先行登記；物主出現時，喺列表點入去按「確認認領」，系統會自動記錄認領時間。'}
        <br>⏱ 登記時間由系統自動紀錄，毋須填寫。
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">物品名稱 *</label><input id="lf-item" value="${escapeHtml(d.item_name||'')}" placeholder="例如：水樽／銀包／童軍帽" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">狀態</label><select id="lf-status" class="w-full px-3 py-2 border rounded-xl text-sm mt-1 bg-white">
          <option ${(!d.status||d.status===this.lostFoundOpenLabel(t))?'selected':''}>${this.lostFoundOpenLabel(t)}</option>
          <option ${d.status===this.lostFoundDoneLabel(t)?'selected':''}>${this.lostFoundDoneLabel(t)}</option>
          <option ${d.status==='已處理'?'selected':''}>已處理</option>
        </select></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">物品描述</label><input id="lf-desc" value="${escapeHtml(d.description||'')}" placeholder="顏色／特徵／內容" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">${seeking?'遺失日期 *':'拾獲日期 *'}</label><input id="lf-date" type="date" value="${escapeHtml(d.found_date||todayISO())}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">${seeking?'遺失時間':'拾獲時間'}</label><input id="lf-time" type="time" value="${escapeHtml(d.found_time||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">${seeking?'遺失地點':'拾獲地點'}</label><input id="lf-location" value="${escapeHtml(d.found_location||'')}" placeholder="例如：A 區攤位／大操場" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">${seeking?'尋物者姓名 *':'拾獲人／交來者'}</label><input id="lf-found-by" value="${escapeHtml(d.found_by||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">${seeking?'尋物者聯絡電話':'拾獲人聯絡'}</label><input id="lf-contact" value="${escapeHtml(d.contact||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">紀錄人</label><input id="lf-recorded-by" value="${escapeHtml(d.recorded_by||this.currentUser?.name||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">備註</label><textarea id="lf-notes" rows="2" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(d.notes||'')}</textarea></div>
      </div>`;
    document.getElementById('record-form').onsubmit=(e)=>this.submitLostFoundForm(e);
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitLostFoundForm(e){
    if(e&&e.preventDefault) e.preventDefault();
    if(!this.canManageLostFound()){ showToast('失物認領由行政組紀錄','error'); return; }
    const v=id=>{ const el=document.getElementById(id); return el?String(el.value||'').trim():''; };
    const item=v('lf-item');
    if(!item){ showToast('請填寫物品名稱','warning'); return; }
    const data=this.getLostFoundData();
    const mode=v('lf-mode')||'create';
    const id=v('lf-id')||('lost_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7));
    const type=v('lf-type')||'found';
    const status=v('lf-status')||this.lostFoundOpenLabel(type);
    const stamp=this.lostFoundNowStamp();
    const idx=(data.records||[]).findIndex(r=>r.id===id);
    const prev=idx>=0?data.records[idx]:null;
    const rec={
      id, type, item_name:item, description:v('lf-desc'),
      found_date:v('lf-date')||todayISO(), found_time:v('lf-time'),
      found_location:v('lf-location'), found_by:v('lf-found-by'), contact:v('lf-contact'),
      status,
      claimed_by:(prev&&prev.claimed_by)||v('lf-claimed-by'),
      claimed_contact:(prev&&prev.claimed_contact)||v('lf-claimed-contact'),
      claimed_at:(prev&&prev.claimed_at)||v('lf-claimed-at'),
      closed_by:(prev&&prev.closed_by)||'',
      notes:v('lf-notes'), recorded_by:v('lf-recorded-by')||this.currentUser?.name||'', recorded_by_id:this.currentUser?.user_id||'',
      updated_at:new Date().toISOString()
    };
    // 完成狀態一定有自動時間（例如直接喺表單改成已認領）
    if(this.isLostFoundClosed(rec)&&!rec.claimed_at){ rec.claimed_at=stamp; rec.closed_by=this.currentUser?.name||''; }
    if(!this.isLostFoundClosed(rec)){ rec.claimed_at=''; rec.closed_by=''; }
    if(mode==='edit'&&idx>=0){ rec.created_at=prev.created_at||stamp; data.records[idx]=rec; }
    else { rec.created_at=stamp; (data.records=data.records||[]).push(rec); }  // ⏱ 登記時間自動紀錄
    this.saveLostFoundData(data);
    this.closeModal('modal-record');
    showToast(this.isLostFoundClosed(rec)?`已記錄${this.lostFoundDoneLabel(type)}（${rec.claimed_at}）`:(type==='seeking'?'已登記尋物':'已登記失物'),'success');
    this.refreshLostFoundViews();
  }
,
  /* —— 點入列表處理認領：失物找到物主／尋物者尋回失物；確認即自動紀錄時間 —— */
  openLostFoundClaim(id){
    if(!this.canManageLostFound()){ showToast('失物認領由行政組紀錄','error'); return; }
    const rec=(this.getLostFoundData().records||[]).find(r=>r.id===id);
    if(!rec){ showToast('找不到紀錄','error'); return; }
    const seeking=(rec.type||'found')==='seeking';
    const done=this.isLostFoundClosed(rec);
    document.getElementById('record-modal-title').textContent=seeking?'處理尋物 — 尋回失物':'處理失物 — 找到物主';
    document.getElementById('record-form-fields').innerHTML=`
      <input type="hidden" id="lfc-id" value="${escapeHtml(rec.id)}">
      <div class="bg-slate-50 border rounded-xl p-3 text-[11px] space-y-1 mb-3">
        <div><b>登記類別：</b>${seeking?'② 有人要尋找物品（尋物登記）':'① 有失物登記（拾獲物品）'}</div>
        <div><b>物品：</b>${escapeHtml(rec.item_name||'')}${rec.description?`（${escapeHtml(rec.description)}）`:''}</div>
        <div><b>${seeking?'遺失':'拾獲'}：</b>${escapeHtml(rec.found_date||'-')} ${escapeHtml(rec.found_time||'')} @ ${escapeHtml(rec.found_location||'-')}</div>
        <div><b>${seeking?'尋物者':'拾獲／交來者'}：</b>${escapeHtml(rec.found_by||'-')}${rec.contact?`（${escapeHtml(rec.contact)}）`:''}</div>
        <div><b>登記時間：</b>⏱ ${escapeHtml((rec.created_at||'').replace('T',' ').slice(0,16)||'-')}（系統自動）　<b>紀錄人：</b>${escapeHtml(rec.recorded_by||'-')}</div>
        <div><b>現時狀態：</b>${escapeHtml(rec.status||this.lostFoundOpenLabel(rec.type))}${rec.claimed_at?`　⏱ ${escapeHtml(rec.claimed_at)}${rec.closed_by?`（${escapeHtml(rec.closed_by)}）`:''}`:''}</div>
      </div>
      <div class="${seeking?'bg-indigo-50 border-indigo-200':'bg-teal-50 border-teal-200'} border rounded-xl p-3 text-[11px] mb-3">
        ${seeking?'<b>尋回失物：</b>填寫交還詳情後按「確認尋回」。':'<b>找到物主：</b>填寫認領人資料後按「確認認領」。'}<br>⏱ 確認時系統會<b>自動紀錄時間</b>，毋須人手填寫。
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">${seeking?'交還／領回人姓名 *':'認領人姓名 *'}</label><input id="lfc-by" value="${escapeHtml(rec.claimed_by||(seeking?rec.found_by||'':''))}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">聯絡電話</label><input id="lfc-contact" value="${escapeHtml(rec.claimed_contact||(seeking?rec.contact||'':''))}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">處理備註</label><textarea id="lfc-notes" rows="2" placeholder="例如：核對身分證明／由攤位負責人代領" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(rec.notes||'')}</textarea></div>
      </div>
      <div class="flex justify-end gap-2 pt-3 border-t mt-3 flex-wrap">
        ${done?`<button type="button" onclick="app.reopenLostFound('${escapeHtml(rec.id)}')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">↩ 取消完成（改回${escapeHtml(this.lostFoundOpenLabel(rec.type))}）</button>`:''}
        <button type="button" onclick="app.confirmLostFoundClaim()" class="${seeking?'bg-indigo-600':'bg-teal-600'} text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-circle-check mr-1"></i>${seeking?'確認尋回（自動記錄時間）':'確認認領（自動記錄時間）'}</button>
      </div>`;
    document.getElementById('record-form').onsubmit=(e)=>{ if(e&&e.preventDefault) e.preventDefault(); this.confirmLostFoundClaim(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  confirmLostFoundClaim(){
    if(!this.canManageLostFound()){ showToast('失物認領由行政組紀錄','error'); return; }
    const v=id=>{ const el=document.getElementById(id); return el?String(el.value||'').trim():''; };
    const id=v('lfc-id');
    const data=this.getLostFoundData();
    const idx=(data.records||[]).findIndex(r=>r.id===id);
    if(idx<0){ showToast('找不到紀錄','error'); return; }
    const rec=data.records[idx];
    const seeking=(rec.type||'found')==='seeking';
    const by=v('lfc-by');
    if(!by){ showToast(seeking?'請填寫領回人姓名':'請填寫認領人姓名','warning'); return; }
    const stamp=this.lostFoundNowStamp();   // ⏱ 自動紀錄認領／尋回時間
    rec.claimed_by=by;
    rec.claimed_contact=v('lfc-contact');
    rec.notes=v('lfc-notes');
    rec.status=this.lostFoundDoneLabel(rec.type);
    rec.claimed_at=stamp;
    rec.closed_by=this.currentUser?.name||'';
    rec.updated_at=new Date().toISOString();
    data.records[idx]=rec;
    this.saveLostFoundData(data);
    this.closeModal('modal-record');
    showToast(`${seeking?'已確認尋回失物':'已確認失物認領'}（自動記錄時間 ${stamp}；紀錄已保留，可於按日摘要查閱）`,'success');
    this.refreshLostFoundViews();
  }
,
  reopenLostFound(id){
    if(!this.canManageLostFound()){ showToast('失物認領由行政組紀錄','error'); return; }
    const data=this.getLostFoundData();
    const idx=(data.records||[]).findIndex(r=>r.id===id);
    if(idx<0) return;
    const rec=data.records[idx];
    rec.status=this.lostFoundOpenLabel(rec.type);
    rec.claimed_at=''; rec.closed_by='';
    rec.updated_at=new Date().toISOString();
    data.records[idx]=rec;
    this.saveLostFoundData(data);
    this.closeModal('modal-record');
    showToast('已改回待處理','success');
    this.refreshLostFoundViews();
  }
,
  deleteLostFoundRecord(id){
    if(!this.canManageLostFound()){ showToast('失物認領由行政組紀錄','error'); return; }
    if(!confirm('確定刪除此失物紀錄？')) return;
    const data=this.getLostFoundData();
    data.records=(data.records||[]).filter(r=>r.id!==id);
    this.saveLostFoundData(data);
    showToast('已刪除','success');
    this.refreshLostFoundViews();
  }
,
  // 執行手冊「各類附加資料」及「行政組」部門中心兩處同時出現，改完一齊刷新
  refreshLostFoundViews(){
    ['exec-misc-tab-lost_found','group-tab-lost_found','admin-tab-lost_found'].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&el.innerHTML!==undefined) el.innerHTML=this.renderLostFoundHTML({compact:id==='group-tab-lost_found'});
    });
    // admin_group 專用：若目前在行政組頁，重繪整個模組以保持分頁狀態
    if(this.currentModule==='admin_group' && this.adminGroupTab==='lost_found'){
      const lfEl=document.getElementById('admin-tab-lost_found');
      if(lfEl) lfEl.innerHTML=this.renderLostFoundHTML({compact:false});
    }
    const counter=document.getElementById('lost-found-count');
    if(counter) counter.textContent=`${this.lostFoundSorted().length} 筆`;
  }
,
  // 報告用二維陣列（第一行表頭）——Excel／Word 共用
  lostFoundReportGrid(list){
    const head=['登記類別','登記時間(自動)','日期','時間','物品','描述','地點','拾獲者/尋物者','聯絡','狀態','認領/領回人','認領人聯絡','認領/尋回時間(自動)','處理人','備註','紀錄人'];
    const rows=(list||this.lostFoundSorted()).map(r=>[(r.type||'found')==='seeking'?'尋物登記':'失物登記',(r.created_at||'').replace('T',' ').slice(0,16),r.found_date||'',r.found_time||'',r.item_name||'',r.description||'',r.found_location||'',r.found_by||'',r.contact||'',r.status||this.lostFoundOpenLabel(r.type),r.claimed_by||'',r.claimed_contact||'',r.claimed_at||'',r.closed_by||'',r.notes||'',r.recorded_by||'']);
    return [head,...rows];
  }
,
  lostFoundSummaryGrid(){
    const st=this.lostFoundStats();
    const grid=[['日期','登記總數','失物登記','尋物登記','已完成（已認領／已尋回）','待處理','尋回率','物品 → 物主／領回人']];
    this.lostFoundDaily().forEach(d=>grid.push([d.day,d.stats.total,d.stats.found,d.stats.seeking,d.stats.closed,d.stats.pending,d.stats.rate+'%',d.owners.join('；')]));
    grid.push(['合計',st.total,st.found,st.seeking,st.closed,st.pending,st.rate+'%','']);
    return grid;
  }
,
  exportLostFoundExcel(){
    const list=this.lostFoundSorted();
    if(!list.length){ showToast('暫無失物認領紀錄','warning'); return; }
    downloadExcel(`失物認領報告_${todayISO()}.xlsx`,null,{sheets:[{name:'按日摘要（尋回率）',rows:this.lostFoundSummaryGrid()},{name:'全部紀錄',rows:this.lostFoundReportGrid(list)}]});
  }
,
  exportLostFoundWord(){
    const list=this.lostFoundSorted();
    if(!list.length){ showToast('暫無失物認領紀錄','warning'); return; }
    const st=this.lostFoundStats(list);
    const meta=`活動：${escapeHtml(this.currentEvent?.event_name||'')}　登記 ${st.total} 筆（失物 ${st.found}／尋物 ${st.seeking}）　已完成 ${st.closed}　待處理 ${st.pending}　<b>尋回率 ${st.rate}%</b>　匯出：${new Date().toLocaleString()}（${escapeHtml(this.currentUser?.name||'公開')}）`;
    const body=`<h3>一、按日摘要</h3>${rowsToHtmlTable(this.lostFoundSummaryGrid())}<h3>二、全部紀錄</h3>${rowsToHtmlTable(this.lostFoundReportGrid(list))}<p style="font-size:9pt;color:#555">失物認領由行政組紀錄：登記時間與認領（尋回）時間全部由系統自動紀錄；確認認領／尋回後紀錄保留，不會刪除。</p>`;
    downloadWord(`失物認領報告_${todayISO()}.doc`,'失物認領報告',body,{meta,landscape:true});
  }
,
  // 舊名保留（一律出 Excel）
  exportLostFoundCSV(){ return this.exportLostFoundExcel(); }
,
  /* —— EXCEL 匯入失物紀錄 —— */
  async handleLostFoundExcelUpload(file){
    if(!this.canManageLostFound()){ showToast('失物認領由行政組紀錄','error'); return; }
    if(!file){ showToast('請選擇 EXCEL 檔案','warning'); return; }
    
    const overlay=document.getElementById('savingOverlay');
    overlay.classList.add('active');
    document.getElementById('savingText').textContent='正在解析 EXCEL 失物紀錄...';
    
    try{
      const data=await this.readExcelFile(file);
      const results=[];
      
      // 失物認領 EXCEL：類型、物品名稱、描述、日期、時間、地點、拾獲者/尋物者、聯絡、備註
      const headerMap={};
      const headers=data[0]||[];
      headers.forEach((h,i)=>{ headerMap[String(h||'').trim().toLowerCase()]=i; });
      
      for(let i=1;i<data.length;i++){
        const row=data[i]||[];
        if(!row.length) continue;
        
        const type=String(row[headerMap['類型']]||row[headerMap['type']]||'found').trim();
        const item_name=String(row[headerMap['物品名稱']]||row[headerMap['物品']]||row[headerMap['item_name']]||row[0]||'').trim();
        if(!item_name) continue;
        
        const description=String(row[headerMap['描述']]||row[headerMap['description']]||'').trim();
        const found_date=String(row[headerMap['日期']]||row[headerMap['date']]||'').trim();
        const found_time=String(row[headerMap['時間']]||row[headerMap['time']]||'').trim();
        const found_location=String(row[headerMap['地點']]||row[headerMap['location']]||row[headerMap['found_location']]||'').trim();
        const found_by=String(row[headerMap['拾獲者']]||row[headerMap['尋物者']]||row[headerMap['found_by']]||'').trim();
        const contact=String(row[headerMap['聯絡']]||row[headerMap['contact']]||row[headerMap['電話']]||'').trim();
        const notes=String(row[headerMap['備註']]||row[headerMap['notes']]||'').trim();
        
        results.push({
          type: type==='seeking'?'seeking':'found',
          item_name: item_name,
          description: description,
          found_date: found_date,
          found_time: found_time,
          found_location: found_location,
          found_by: found_by,
          contact: contact,
          notes: notes,
          status: type==='seeking'?'尋找中':'待認領'
        });
      }
      
      if(!results.length){ showToast('EXCEL 中未找到有效失物紀錄','warning'); return; }
      
      // 合併到現有紀錄（舊紀錄保留，新紀錄追加）
      const existingData=this.getLostFoundData();
      const existingIds=new Set((existingData.records||[]).map(r=>r.id));
      
      results.forEach(r=>{
        if(!existingIds.has(r.id)){
          r.id='lost_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
          r.created_at=new Date().toISOString();
          r.updated_at=r.created_at;
          r.recorded_by=this.currentUser?.name||'';
          r.recorded_by_id=this.currentUser?.user_id||'';
          existingData.records.push(r);
          existingIds.add(r.id);
        }
      });
      
      this.saveLostFoundData(existingData);
      
      showToast(`成功匯入 ${results.length} 筆失物紀錄`,'success');
      this.refreshLostFoundViews();
      
    }catch(e){
      showToast('匯入失敗：'+(e.message||e),'error');
    }finally{
      overlay.classList.remove('active');
    }
  }
,
  /* —— 讀取 EXCEL 文件通用函數 —— */
  async readExcelFile(file){
    return new Promise((resolve, reject)=>{
      try{
        const reader=new FileReader();
        reader.onload=e=>{
          try{
            const data=new Uint8Array(e.target.result);
            const workbook=XLSX.read(data, {type: 'array'});
            const firstSheet=workbook.Sheets[workbook.SheetNames[0]];
            const jsonData=XLSX.utils.sheet_to_json(firstSheet, {header: 1});
            resolve(jsonData);
          }catch(e){ reject(e); }
        };
        reader.onerror=reject;
        reader.readAsArrayBuffer(file);
      }catch(e){ reject(e); }
    });
  }
,
});
