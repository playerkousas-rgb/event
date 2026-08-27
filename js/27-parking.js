/* 27-parking.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== 泊車證申請 (Parking) =====================
     申請：登入用戶可申請（存 GAS Parking_Requests）
     入口檢查清單：只供車輛路由的執行／最後名單組，讀取已批核 Google Sheet。 */
  getParkingData(){
    const key=LS.parking(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    const data=(local&&Array.isArray(local.applications))?local:{source:this.eventData['parking_source']||null,applications:[]};
    const deleted=this.getDeletedRecordIds('Parking_Requests');
    data.applications=(data.applications||[]).filter(p=>!deleted.has(String(p.parking_id))).map(p=>this.normalizeApplicationConfirmation({...p,status:p.status||'pending'}));
    return data;
  }
,
  saveParkingData(data){
    const key=LS.parking(this.currentEvent?.event_id||'isd_2026');
    localStorage.setItem(key,JSON.stringify(data));
    if(!this.mockMode && this.gasUrl){
      (data.applications||[]).forEach(p=>{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Parking_Requests',record:{parking_id:p.parking_id,event_id:this.currentEvent?.event_id||'isd_2026',seq:p.seq||'',group_name:p.group_name||'',unit:p.unit||'',plate:p.plate||'',driver_name:p.driver_name||'',position:p.position||'',contact:p.contact||'',park_date:p.park_date||'',entry_time:p.entry_time||'',exit_time:p.exit_time||'',full_day:p.full_day||'',status:p.status||'',requested_by:p.requested_by||'',requested_by_id:p.requested_by_id||'',requester_role:p.requester_role||'',group_confirmation_status:p.group_confirmation_status||'',group_confirmed_by:p.group_confirmed_by||'',group_confirmed_at:p.group_confirmed_at||'',approved_by:p.approved_by||'',approved_at:p.approved_at||'',notes:p.notes||'',created_at:p.created_at||''}})}).catch(()=>{});
      });
    }
  }
,
  canViewParkingChecklist(){ return this.canExecuteArea('vehicle'); } // 由車輛執行／最後名單組別負責
,
  /* 入口檢查清單：從「已批核 Google Sheet」讀取（用戶提供，已批核填好） */
  async syncParkingChecklistFromDrive(silent){
    if(!this.canViewParkingChecklist()){ if(!silent) showToast(`入口檢查清單只供 ${this.approvalRouteLabel('vehicle','executor_groups')} 檢視`,'error'); return; }
    const src=this.eventData['parking_source']||this.getParkingData().source;
    const sheetId=src&&(src.sheet_id||src.drive_file_id);
    if(!sheetId){ if(!silent) showToast('尚未設定泊車證清單來源 (parking_source)','warning'); return; }
    if(!silent) showToast('正在讀取已批核泊車證清單…','');
    const overlay=document.getElementById('savingOverlay'); if(overlay&&!silent) overlay.classList.add('active');
    try{
      const got=await this.fetchDriveSheetGridRaw(sheetId, src.gid||0);
      if(got.ok && got.rows.length){
        const objRows=this.gridToObjects(got.rows);
        const list=objRows.map(r=>{
          const parkDates=[];
          // 2026 版日期：佈置 3/10、正日 4/10（原表頭 11/10/2025、12/10/2025 自動對應）
          if(String(r['停泊日期 11/10/2025（場地佈置）']||r['停泊日期 3/10/2026（場地佈置）']||r['停泊日期']||'').trim()==='✗') parkDates.push('3/10 佈置');
          if(String(r['12/10/2025 (正日)']||r['4/10/2026 (正日)']||'').trim()==='✗') parkDates.push('4/10 正日');
          return {
            seq:r['編號']||'', group_name:r['組別']||'', unit:r['所屬單位／機構']||'',
            plate:r['車牌']||'', driver_name:r['司機姓名']||'', position:r['職位']||'',
            contact:r['聯絡電話']||'', park_date:parkDates.join('、')||'4/10 正日',
            entry_time:r['入場時間']||'', exit_time:r['預計離場時間']||'', full_day:r['全日停泊']||''
          };
        }).filter(x=>x.plate);
        if(list.length){
          const data=this.getParkingData();
          data.checklist={source_name:src.name||'已批核泊車證清單', updated_at:new Date().toISOString(), vehicles:list};
          this.saveParkingData(data);
          if(!silent) showToast(`已讀取已批核清單 ${list.length} 架車輛`,'success');
          this.renderParkingChecklist();
          return;
        }
      }
      if(!silent) showToast('未能讀取清單。請確認 Google Sheet 已設定「任何有連結者均可檢視」','warning');
    }catch(e){ if(!silent) showToast('同步失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  renderParkingModule(){
    const container=document.getElementById('module-content');
    if(!this.parkingSubTab) this.parkingSubTab='apply';
    const data=this.getSuppliesData();
    const loggedIn=!!this.currentUser;
    const canCheck=this.canExecuteArea('vehicle');
    const canApprove=this.canApproveArea('vehicle');
    const isSuperAdmin=this.isSuperAdmin();
    const myName=this.currentUser?.name||'', myId=this.currentUser?.user_id||'';
    const apps=(data.vehicle_passes||[]).filter(p=> p.requested_by_id===myId || (myName&&p.requested_by===myName));
    const pending=(data.vehicle_passes||[]).filter(p=> p.status==='pending');

    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900">
          <b>🚗 車輛通行證 (含泊車證)：</b><br>
          • 所有登入成員可提交車輛資料；低於總主任提交的申請先由本組確認<br>
          • 目前由 ${escapeHtml(this.approvalRouteLabel('vehicle','approver_groups'))} 批核／修改，批准後交 ${escapeHtml(this.approvalRouteLabel('vehicle','executor_groups'))} 執行<br>
          • <b>入口檢查清單：</b>只供 ${escapeHtml(this.approvalRouteLabel('vehicle','executor_groups'))} 檢視、同步 (由 Excel) 及列印<br>
          • 與物資審批同樣運作，填寫車牌、司機及停泊日期
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchParkingTab('apply')" class="tab-btn ${this.parkingSubTab==='apply'?'active':''}"><i class="fa-solid fa-pen-to-square mr-1"></i> 我的申請 (${apps.length})</button>
          ${canApprove?`<button onclick="app.switchParkingTab('pending')" class="tab-btn ${this.parkingSubTab==='pending'?'active':''}"><i class="fa-solid fa-hourglass-half mr-1"></i> 待批核 (${pending.length})</button>`:''}
          ${canCheck?`<button onclick="app.switchParkingTab('checklist')" class="tab-btn ${this.parkingSubTab==='checklist'?'active':''}"><i class="fa-solid fa-traffic-light mr-1"></i> 入口檢查清單</button>`:''}
        </div>
        <div id="parking-tab-apply" class="${this.parkingSubTab==='apply'?'':'hidden'}"></div>
        <div id="parking-tab-pending" class="${this.parkingSubTab==='pending'?'':'hidden'}"></div>
        <div id="parking-tab-checklist" class="${this.parkingSubTab==='checklist'?'':'hidden'}"></div>
      </div>
    `;
    this.renderParkingApply();
    if(canApprove) this.renderParkingPending();
    if(canCheck) this.renderParkingChecklist();

    const actionsEl=document.getElementById('module-actions');
    if(actionsEl){
      actionsEl.innerHTML=`<div class="flex gap-2 flex-wrap">
        <button onclick="app.openModule('apply_hub')" class="bg-slate-100 border px-3 py-2 rounded-xl text-xs font-bold">← 返回申請中心</button>
        ${loggedIn?`<button onclick="app.openVehiclePassForm()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-car mr-1"></i>申請車輛通行證</button>`:''}
        ${canCheck?`<button onclick="app.syncParkingChecklistFromDrive()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步已批核清單 (Excel)</button>`:''}
        ${(canCheck||canApprove)?`<button onclick="app.exportParkingData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button>`:''}<button onclick="app.printVehiclePassTable()" class="bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印最後名單</button>
      </div>`;
    }
  }
,
  switchParkingTab(tab){
    this.parkingSubTab=tab;
    document.querySelectorAll('[id^="parking-tab-"]').forEach(el=>el.classList.add('hidden'));
    document.getElementById('parking-tab-'+tab)?.classList.remove('hidden');
    document.querySelectorAll('[onclick^="app.switchParkingTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'tab-btn active':'tab-btn';
    });
  }
,
  renderParkingApply(){
    const container=document.getElementById('parking-tab-apply'); if(!container) return;
    if(!this.currentUser){
      container.innerHTML=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3">
        <div class="text-3xl"><i class="fa-solid fa-lock text-amber-400"></i></div>
        <div class="text-[13px] font-bold text-amber-900">車輛通行證申請需登入</div>
        <p class="text-[11px] text-amber-800">登入後即可填寫車輛通行證申請（車牌、司機、停泊日期等）。</p>
        <button onclick="app.openLoginModal()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-right-to-bracket mr-1"></i>登入</button>
      </div>`;
      return;
    }
    const data=this.getSuppliesData();
    const myName=this.currentUser?.name||'', myId=this.currentUser?.user_id||'';
    const apps=(data.vehicle_passes||[]).filter(p=> p.requested_by_id===myId || (myName&&p.requested_by===myName)).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
    
    if(!apps.length){
      container.innerHTML=`<p class="text-xs text-slate-400 py-8 text-center">暫無我的申請，點擊「申請車輛通行證」提交</p>`;
      return;
    }
    
    const st={pending:['bg-amber-100 text-amber-700','待批核'],approved:['bg-emerald-100 text-emerald-700','已批核'],rejected:['bg-rose-100 text-rose-700','已拒絕']};
    container.innerHTML=`<div class="space-y-3">${apps.map(v=>{
      const s=st[v.status]||['bg-slate-100','—'];
      return `<div class="border rounded-xl p-3 bg-white space-y-2">
        <div class="flex justify-between items-start gap-2">
          <div><div class="flex items-center gap-2 flex-wrap"><b class="text-[13px]">${escapeHtml(v.plate)}</b> <span class="text-[10px] px-2 py-0.5 rounded-full border ${s[0]}">${s[1]}</span><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(v.group_name)}</span>${v.status==='pending'?this.applicationStageHTML(v):''}</div>
          <div class="text-[11px] text-slate-500 mt-1">司機: ${escapeHtml(v.driver_name)} | 電話: ${escapeHtml(v.driver_contact)} | 車型: ${escapeHtml(v.vehicle_type)} | 用途: ${escapeHtml(v.purpose)}</div>
          <div class="text-[11px] text-slate-500">進出: ${escapeHtml(v.entry_date||'')} → ${escapeHtml(v.exit_date||'')} | 停泊: ${escapeHtml(v.parking_location||'-')}</div>
          ${v.notes?`<div class="text-[10px] bg-amber-50 border border-amber-200 rounded-xl p-2 mt-1">批核備註: ${escapeHtml(v.notes)}</div>`:''}
          </div>
          <div class="text-[10px] text-slate-400 text-right">${v.approved_by?`批核: ${escapeHtml(v.approved_by)}`:''}</div>
        </div>
      </div>`;
    }).join('')}</div>`;
  }
,
  
  renderParkingPending(){
    const container=document.getElementById('parking-tab-pending'); if(!container) return;
    const data=this.getSuppliesData();
    const list=(data.vehicle_passes||[]).filter(v=>v.status==='pending');
    
    if(!list.length){ container.innerHTML='<p class="text-xs text-slate-400 py-8 text-center">暫無待批核車輛</p>'; return; }
    container.innerHTML=`<div class="space-y-3">${list.map(v=>{
      return `<div class="border rounded-xl p-3 bg-white space-y-2">
        <div class="flex justify-between items-start gap-2">
          <div><div class="flex items-center gap-2 flex-wrap"><b class="text-[13px]">${escapeHtml(v.plate)}</b><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(v.group_name)}</span>${this.applicationStageHTML(v)}</div>
          <div class="text-[11px] text-slate-500 mt-1">司機: ${escapeHtml(v.driver_name)} | 電話: ${escapeHtml(v.driver_contact)} | 車型: ${escapeHtml(v.vehicle_type)} | 用途: ${escapeHtml(v.purpose)}</div>
          <div class="text-[11px] text-slate-500">進出: ${escapeHtml(v.entry_date||'')} → ${escapeHtml(v.exit_date||'')} | 停泊: ${escapeHtml(v.parking_location||'-')} | 申請人: ${escapeHtml(v.requested_by)}</div>
          </div>
          <div class="flex flex-col gap-1 flex-shrink-0">
            ${this.canConfirmApplication(v)?`<button onclick="app.confirmApplication('vehicle','${v.pass_id}')" class="bg-sky-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">本組確認</button>`:''}
            ${this.canApproveArea('vehicle') && this.applicationReadyForApproval(v)?`<div class="flex gap-1"><button onclick="app.approveVehiclePass('${v.pass_id}')" class="bg-emerald-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">批准</button><button onclick="app.openVehicleApproveModifyModal('${v.pass_id}')" class="bg-sky-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">安排車位</button><button onclick="app.rejectVehiclePass('${v.pass_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1 rounded-xl text-[11px]">拒絕</button></div>`:''}
            ${this.isSuperAdmin()?`<button onclick="app.deleteVehiclePass('${v.pass_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️ 刪除</button>`:''}
          </div>
        </div>
      </div>`;
    }).join('')}</div>`;
  }
,
  
  renderParkingChecklist(){
    const container=document.getElementById('parking-tab-checklist'); if(!container) return;
    const data=this.getSuppliesData();
    const list=(data.vehicle_passes||[]).filter(v=>v.status==='approved');
    
    // Also merge parking checklist if any
    const parkData=this.getParkingData();
    const externalList=(parkData.checklist&&parkData.checklist.vehicles)||[];
    
    if(!list.length && !externalList.length){
      container.innerHTML=`<div class="bg-white border rounded-xl p-6 text-center space-y-2">
        <div class="text-3xl"><i class="fa-solid fa-traffic-light text-slate-300"></i></div>
        <p class="text-[12px] text-slate-500">尚未有已批核車輛清單。</p>
        <button onclick="app.syncParkingChecklistFromDrive()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步外部已批核清單 (Excel)</button>
      </div>`;
      return;
    }
    
    container.innerHTML=`
      <div class="space-y-3">
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-900"><b>🚦 入口檢查清單（已批核 ${list.length + externalList.length} 架）：</b>入口工作人員可按車牌核對，可列印貼於入口。</div>
        <div class="flex gap-2 flex-wrap"><button onclick="app.printParkingChecklist()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印清單</button></div>
        <div id="parking-checklist-print-area" class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100 font-bold"><tr><th class="px-2 py-1 text-left">車牌</th><th class="px-2 py-1 text-left">司機</th><th class="px-2 py-1 text-left">電話</th><th class="px-2 py-1 text-left">組別</th><th class="px-2 py-1 text-left">車型</th><th class="px-2 py-1 text-left">停泊日期</th><th class="px-2 py-1 text-left">停泊位置</th></tr></thead><tbody class="divide-y bg-white">
        ${list.map(v=>`<tr><td class="px-2 py-1 font-mono font-bold" data-label="車牌">${escapeHtml(v.plate)}</td><td class="px-2 py-1" data-label="司機">${escapeHtml(v.driver_name)}</td><td class="px-2 py-1 font-mono" data-label="電話">${escapeHtml(v.driver_contact)}</td><td class="px-2 py-1" data-label="組別">${escapeHtml(v.group_name||'-')}</td><td class="px-2 py-1" data-label="車型">${escapeHtml(v.vehicle_type||'-')}</td><td class="px-2 py-1" data-label="停泊">${escapeHtml(v.entry_date||'')} → ${escapeHtml(v.exit_date||'')}</td><td class="px-2 py-1" data-label="位置">${escapeHtml(v.parking_location||'-')}</td></tr>`).join('')}
        ${externalList.map(v=>`<tr><td class="px-2 py-1 font-mono font-bold text-sky-700" data-label="車牌">${escapeHtml(v.plate)} (外部)</td><td class="px-2 py-1" data-label="司機">${escapeHtml(v.driver_name)}</td><td class="px-2 py-1 font-mono" data-label="電話">${escapeHtml(v.contact)}</td><td class="px-2 py-1" data-label="組別">${escapeHtml(v.group_name||'-')}</td><td class="px-2 py-1" data-label="車型">${escapeHtml(v.unit||'-')}</td><td class="px-2 py-1" data-label="停泊">${escapeHtml(v.park_date||'-')}</td><td class="px-2 py-1" data-label="位置">-</td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
  }
,
  printParkingChecklist(){
    const area=document.getElementById('parking-checklist-print-area');
    if(!area){ showToast('找不到列印區域','error'); return; }
    const win=window.open('','_blank');
    win.document.write(`<html><head><title>車輛通行證入口檢查清單</title><style>body{padding:20px;font-family:Noto Sans TC,sans-serif} h1{font-size:16px} table{width:100%;border-collapse:collapse;margin-top:10px} th,td{border:1px solid #999;padding:6px;font-size:12px} th{background:#eee}</style></head><body><h1>🚦 車輛通行證入口檢查清單（已批核）</h1><p>列印日期 ${new Date().toLocaleDateString()}</p>${area.innerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    win.document.close();
  }
,
  approveParkingRequest(id){
    const data=this.getParkingData(),p=(data.applications||[]).find(x=>x.parking_id===id);
    if(!p){ showToast('找不到泊車證申請','error'); return; }
    if(!this.applicationReadyForApproval(p)){ showToast('此申請尚待本組總主任確認','warning'); return; }
    if(!this.canApproveArea('vehicle')){ showToast(`只供 ${this.approvalRouteLabel('vehicle','approver_groups')} 批核`,'error'); return; }
    p.status='approved'; p.approved_by=this.currentUser?.name||''; p.approved_at=new Date().toISOString();
    this.saveParkingData(data); showToast('泊車證申請已批准','success');
    if(this.currentModule==='parking') this.renderParkingModule();
  }
,
  rejectParkingRequest(id){
    const data=this.getParkingData(),p=(data.applications||[]).find(x=>x.parking_id===id);
    if(!p){ showToast('找不到泊車證申請','error'); return; }
    if(!this.applicationReadyForApproval(p)){ showToast('此申請尚待本組總主任確認','warning'); return; }
    if(!this.canApproveArea('vehicle')){ showToast(`只供 ${this.approvalRouteLabel('vehicle','approver_groups')} 批核`,'error'); return; }
    p.status='rejected'; p.approved_by=this.currentUser?.name||''; p.approved_at=new Date().toISOString();
    this.saveParkingData(data); showToast('泊車證申請已拒絕','warning');
    if(this.currentModule==='parking') this.renderParkingModule();
  }
,
  async deleteParkingRequest(id){
    if(!this.isSuperAdmin()){ showToast('權限不足，無法永久刪除紀錄','error'); return; }
    if(!confirm('確定永久刪除此泊車證申請？APP、本機快取及後台紀錄都會刪除。')) return;
    this.markRecordDeleted('Parking_Requests',id);
    const data=this.getParkingData();
    data.applications=(data.applications||[]).filter(p=>p.parking_id!==id);
    this.saveParkingData(data);
    const result=await this.deleteGasRecord('Parking_Requests',id);
    showToast(result.success?'已從 APP 及後台永久刪除':`APP 已隱藏，但後台刪除失敗：${result.error}`,result.success?'warning':'error');
    if(this.currentModule==='parking') this.renderParkingModule();
    if(!document.getElementById('view-approvals')?.classList.contains('hidden')) this.renderApprovalCenter();
  }
,
  exportParkingData(){
    const data=this.getSuppliesData();
    const blob=new Blob([JSON.stringify(data.vehicle_passes||[],null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`vehicle_passes_${todayISO()}.json`; a.click();
    showToast('已匯出 JSON','success');
  }
,
});
