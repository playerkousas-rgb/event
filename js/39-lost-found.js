/* 39-lost-found.js — 失物認領 (Lost & Found) v11（2026-08-31 新增）
   用戶定案：執行手冊「各類附加資料」加入失物認領，同時加入「行政組」部門中心；由行政組紀錄。
   · 查閱：任何人（含未登入公眾）都可睇失物清單（未登入時隱藏認領人聯絡電話）
   · 紀錄：行政組登入成員＋管理層（LOST_FOUND_MANAGERS）可新增／修改／刪除
   · 儲存：localStorage（即時）＋後端 Lost_Found 工作表（跨裝置同步，見 23-sync.js） */
Object.assign(ScoutEventApp.prototype,{

  getLostFoundData(){
    const key=LS.lostFound(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local&&Array.isArray(local.records)) return local;
    return {records:[]};
  }
,
  saveLostFoundData(data){
    const key=LS.lostFound(this.currentEvent?.event_id||'isd_2026');
    localStorage.setItem(key,JSON.stringify(data));
    if(!this.mockMode&&this.gasUrl){
      (data.records||[]).forEach(r=>{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Lost_Found',record:{lost_id:r.id,event_id:this.currentEvent?.event_id||'isd_2026',item_name:r.item_name||'',description:r.description||'',found_date:r.found_date||'',found_time:r.found_time||'',found_location:r.found_location||'',found_by:r.found_by||'',status:r.status||'待認領',claimed_by:r.claimed_by||'',claimed_contact:r.claimed_contact||'',claimed_at:r.claimed_at||'',notes:r.notes||'',recorded_by:r.recorded_by||'',recorded_by_id:r.recorded_by_id||'',created_at:r.created_at||'',updated_at:r.updated_at||''}})}).catch(()=>{});
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
  lostFoundSorted(){
    const list=(this.getLostFoundData().records||[]).slice();
    return list.sort((a,b)=>`${b.found_date||''}${b.found_time||''}`.localeCompare(`${a.found_date||''}${a.found_time||''}`));
  }
,
  /* —— 清單 HTML（執行手冊「各類附加資料」及「行政組」部門中心共用同一份）—— */
  renderLostFoundHTML(opts){
    const o=opts||{};
    const canManage=this.canManageLostFound();
    const isPublic=!this.currentUser;
    const list=this.lostFoundSorted();
    const pending=list.filter(r=>(r.status||'待認領')!=='已認領').length;
    const claimed=list.length-pending;
    const chip=(v,l,cls)=>`<div class="${cls} rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold">${v}</div><div class="text-[10px]">${l}</div></div>`;
    const rows=list.map(r=>{
      const done=(r.status||'待認領')==='已認領';
      return `<tr class="${done?'bg-emerald-50/60':''}">
        <td class="border px-2 py-1 whitespace-nowrap" data-label="日期">${escapeHtml(r.found_date||'-')}${r.found_time?`<br><span class="text-[10px] text-slate-500">${escapeHtml(r.found_time)}</span>`:''}</td>
        <td class="border px-2 py-1 font-medium" data-label="物品">${escapeHtml(r.item_name||'-')}${r.description?`<div class="text-[10px] text-slate-500">${escapeHtml(r.description)}</div>`:''}</td>
        <td class="border px-2 py-1" data-label="拾獲地點">${escapeHtml(r.found_location||'-')}</td>
        <td class="border px-2 py-1" data-label="拾獲/交來者">${escapeHtml(r.found_by||'-')}</td>
        <td class="border px-2 py-1 text-center" data-label="狀態"><span class="text-[10px] px-2 py-0.5 rounded-full border ${done?'bg-emerald-100 text-emerald-700 border-emerald-300':'bg-amber-100 text-amber-700 border-amber-300'}">${escapeHtml(r.status||'待認領')}</span></td>
        <td class="border px-2 py-1" data-label="認領人">${escapeHtml(r.claimed_by||'-')}${r.claimed_contact?`<br><span class="text-[10px] text-slate-500">${isPublic?'🔒 需登入查看':escapeHtml(r.claimed_contact)}</span>`:''}${r.claimed_at?`<br><span class="text-[10px] text-slate-400">${escapeHtml(r.claimed_at)}</span>`:''}</td>
        <td class="border px-2 py-1 text-[10px]" data-label="備註">${escapeHtml(r.notes||'')}</td>
        <td class="border px-2 py-1 text-[10px] whitespace-nowrap" data-label="紀錄人">${escapeHtml(r.recorded_by||'-')}</td>
        ${canManage?`<td class="border px-2 py-1 text-right whitespace-nowrap" data-label="操作"><button onclick="app.openLostFoundForm('${escapeHtml(r.id)}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button> <button onclick="app.deleteLostFoundRecord('${escapeHtml(r.id)}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></td>`:''}
      </tr>`;
    }).join('');
    return `<div class="space-y-3">
      <div class="bg-teal-50 border border-teal-200 rounded-xl p-3 text-[11px] leading-relaxed text-teal-900"><b>🧳 失物認領：</b>活動期間拾獲或待認領嘅失物清單。<b>由行政組紀錄</b>（行政組登入成員可新增／修改／刪除，同時設於「行政組 → 部門管理中心」）；其他組別及公眾只可查閱${isPublic?'（認領人聯絡電話需登入先可見）':''}。</div>
      <div class="grid grid-cols-3 gap-2 max-w-md">
        ${chip(list.length,'失物總數','bg-slate-100 text-slate-700 border')}
        ${chip(pending,'待認領','bg-amber-50 text-amber-700 border border-amber-200')}
        ${chip(claimed,'已認領','bg-emerald-50 text-emerald-700 border border-emerald-200')}
      </div>
      <div class="flex gap-2 flex-wrap">
        ${canManage?`<button onclick="app.openLostFoundForm()" class="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>登記失物／更新認領</button>`:`<span class="text-[11px] text-slate-500 bg-white border px-3 py-2 rounded-xl"><i class="fa-solid fa-lock mr-1"></i>只讀 — 失物由行政組紀錄</span>`}
        <button onclick="app.exportLostFoundCSV()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>匯出 CSV</button>
        <button onclick="app.printCoordArea('lost-found-print','失物認領清單')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印清單</button>
        <span id="lost-found-count" class="text-[11px] bg-teal-100 text-teal-700 px-3 py-2 rounded-full border border-teal-200">${list.length} 筆</span>
      </div>
      <div id="lost-found-print" class="bg-white border rounded-xl p-3">
        <div class="table-responsive"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr>
          <th class="border px-2 py-1 text-left">日期／時間</th><th class="border px-2 py-1 text-left">物品</th><th class="border px-2 py-1 text-left">拾獲地點</th><th class="border px-2 py-1 text-left">拾獲／交來者</th><th class="border px-2 py-1">狀態</th><th class="border px-2 py-1 text-left">認領人／聯絡</th><th class="border px-2 py-1 text-left">備註</th><th class="border px-2 py-1 text-left">紀錄人</th>${canManage?'<th class="border px-2 py-1 text-right">操作</th>':''}
        </tr></thead><tbody>${rows||`<tr><td colspan="${canManage?9:8}" class="border px-2 py-4 text-center text-slate-400">暫無失物紀錄 — 拾獲失物請交行政組登記</td></tr>`}</tbody></table></div>
        <p class="text-[10px] text-slate-400 mt-2">失物認領由行政組紀錄：登記拾獲日期／地點／物品，認領時更新狀態為「已認領」並填認領人及聯絡。${o.compact?'本頁與「執行手冊 → 各類附加資料 → 失物認領」共用同一份紀錄。':''}</p>
      </div>
    </div>`;
  }
,
  /* —— 表單（用 modal-record，同箱頭紙一樣以 onsubmit 覆寫）—— */
  openLostFoundForm(id){
    if(!this.canManageLostFound()){ showToast('失物認領由行政組紀錄','error'); return; }
    const existing=id?(this.getLostFoundData().records||[]).find(r=>r.id===id):null;
    const d=existing||{};
    document.getElementById('record-modal-title').textContent=existing?'編輯失物紀錄':'登記失物';
    document.getElementById('record-form-fields').innerHTML=`
      <input type="hidden" id="lf-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="lf-id" value="${escapeHtml(d.id||'')}">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">物品名稱 *</label><input id="lf-item" value="${escapeHtml(d.item_name||'')}" placeholder="例如：水樽／銀包／童軍帽" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">狀態</label><select id="lf-status" class="w-full px-3 py-2 border rounded-xl text-sm mt-1 bg-white"><option ${(!d.status||d.status==='待認領')?'selected':''}>待認領</option><option ${d.status==='已認領'?'selected':''}>已認領</option><option ${d.status==='已處理'?'selected':''}>已處理</option></select></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">物品描述</label><input id="lf-desc" value="${escapeHtml(d.description||'')}" placeholder="顏色／特徵／內容" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">拾獲日期 *</label><input id="lf-date" type="date" value="${escapeHtml(d.found_date||todayISO())}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">拾獲時間</label><input id="lf-time" type="time" value="${escapeHtml(d.found_time||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">拾獲地點</label><input id="lf-location" value="${escapeHtml(d.found_location||'')}" placeholder="例如：A 區攤位／大操場" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">拾獲人／交來者</label><input id="lf-found-by" value="${escapeHtml(d.found_by||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">認領人姓名</label><input id="lf-claimed-by" value="${escapeHtml(d.claimed_by||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">認領人聯絡</label><input id="lf-claimed-contact" value="${escapeHtml(d.claimed_contact||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">認領日期</label><input id="lf-claimed-at" type="date" value="${escapeHtml(d.claimed_at||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
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
    const id=v('lf-id')||('lost_'+Date.now().toString(36));
    const status=v('lf-status')||'待認領';
    const rec={
      id, item_name:item, description:v('lf-desc'),
      found_date:v('lf-date')||todayISO(), found_time:v('lf-time'),
      found_location:v('lf-location'), found_by:v('lf-found-by'),
      status, claimed_by:v('lf-claimed-by'), claimed_contact:v('lf-claimed-contact'), claimed_at:v('lf-claimed-at'),
      notes:v('lf-notes'), recorded_by:v('lf-recorded-by')||this.currentUser?.name||'', recorded_by_id:this.currentUser?.user_id||'',
      updated_at:new Date().toISOString()
    };
    const idx=(data.records||[]).findIndex(r=>r.id===id);
    if(mode==='edit'&&idx>=0){ rec.created_at=data.records[idx].created_at||rec.updated_at; data.records[idx]=rec; }
    else { rec.created_at=rec.updated_at; (data.records=data.records||[]).push(rec); }
    this.saveLostFoundData(data);
    this.closeModal('modal-record');
    showToast(status==='已認領'?'已記錄認領':'已登記失物','success');
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
    ['exec-misc-tab-lost_found','group-tab-lost_found'].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&el.innerHTML) el.innerHTML=this.renderLostFoundHTML({compact:id==='group-tab-lost_found'});
    });
    const counter=document.getElementById('lost-found-count');
    if(counter) counter.textContent=`${this.lostFoundSorted().length} 筆`;
  }
,
  exportLostFoundCSV(){
    const list=this.lostFoundSorted();
    const head=['拾獲日期','拾獲時間','物品','描述','拾獲地點','拾獲/交來者','狀態','認領人','認領人聯絡','認領日期','備註','紀錄人'];
    const esc=s=>`"${String(s??'').replace(/"/g,'""')}"`;
    const rows=list.map(r=>[r.found_date,r.found_time,r.item_name,r.description,r.found_location,r.found_by,r.status,r.claimed_by,r.claimed_contact,r.claimed_at,r.notes,r.recorded_by].map(esc).join(','));
    const csv='\ufeff'+[head.map(esc).join(','),...rows].join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='失物認領清單.csv'; a.click();
    showToast('已匯出失物認領 CSV','success');
  }
,
});
