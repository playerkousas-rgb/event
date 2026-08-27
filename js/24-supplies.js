/* 24-supplies.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== Supplies Enhanced Module ===================== */
  getSuppliesData(){
    const key=LS.supplies(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local){
      if(!local.vehicle_passes) local.vehicle_passes=[];
      if(!local.booth_requests) local.booth_requests=[];
      const deletedReq=this.getDeletedRecordIds('Supply_Requests'),deletedVeh=this.getDeletedRecordIds('Vehicle_Passes');
      local.requests=(local.requests||[]).filter(r=>!deletedReq.has(String(r.request_id)));
      local.vehicle_passes=(local.vehicle_passes||[]).filter(v=>!deletedVeh.has(String(v.pass_id)));
      local.requests.forEach(r=>{r.group_name=normalizeGroupName(r.group_name);});
      local.vehicle_passes.forEach(v=>{v.group_name=normalizeGroupName(v.group_name);});
      local.booth_requests.forEach(r=>{r.group_name=normalizeGroupName(r.group_name);});
      return local;
    }
    const raw=this.eventData['supplies']||{inventory:[],requests:[],booth_requests:[]};
    const inventory=(raw.inventory||[]).map((it,i)=>({
      supply_id:it.supply_id||'sup_'+i,
      item_name:it.item_name||'',
      total_qty:parseInt(it.total_qty||0),
      unit:it.unit||'個',
      category:it.category||'營具',
      created_at:it.created_at||''
    }));
    const requests=(raw.requests||[]).map((r,i)=>({
      request_id:r.request_id||'req_'+i,
      event_id:r.event_id||this.currentEvent?.event_id||'isd_2026',
      supply_id:r.supply_id||'',
      item_name:r.item_name||'',
      qty_requested:parseInt(r.qty_requested||0),
      qty_approved:r.qty_approved!==undefined?parseInt(r.qty_approved):null,
      unit:r.unit||'個',
      group_name:normalizeGroupName(r.group_name),
      reason:r.reason||'',
      date_needed:r.date_needed||'',
      deadline:r.deadline||'',
      contact:r.contact||'',
      status:r.status||'pending',
      requested_by:r.requested_by||'',
      requested_by_id:r.requested_by_id||'',
      approved_by:r.approved_by||'',
      approved_at:r.approved_at||'',
      requester_role:r.requester_role||'',
      group_confirmation_status:r.group_confirmation_status||'',
      group_confirmed_by:r.group_confirmed_by||'',
      group_confirmed_at:r.group_confirmed_at||'',
      notes:r.notes||'',
      created_at:r.created_at||''
    })).filter(r=>!this.getDeletedRecordIds('Supply_Requests').has(String(r.request_id)));
    const vehicle_passes=(raw.vehicle_passes||raw.vehicle_requests||[]).map((v,i)=>({
      pass_id:v.pass_id||v.request_id||'veh_'+i,
      event_id:v.event_id||this.currentEvent?.event_id||'isd_2026',
      plate:v.plate||v.car_plate||v.item_name||'',
      driver_name:v.driver_name||v.driver||'',
      driver_contact:v.driver_contact||v.contact||'',
      vehicle_type:v.vehicle_type||'私家車',
      purpose:v.purpose||v.reason||'',
      group_name:normalizeGroupName(v.group_name),
      entry_date:v.entry_date||v.date_needed||'',
      exit_date:v.exit_date||'',
      parking_location:v.parking_location||'',
      deadline:v.deadline||'',
      status:v.status||'pending',
      requested_by:v.requested_by||'',
      requested_by_id:v.requested_by_id||'',
      approved_by:v.approved_by||'',
      approved_at:v.approved_at||'',
      requester_role:v.requester_role||'',
      group_confirmation_status:v.group_confirmation_status||'',
      group_confirmed_by:v.group_confirmed_by||'',
      group_confirmed_at:v.group_confirmed_at||'',
      notes:v.notes||'',
      created_at:v.created_at||''
    })).filter(v=>!this.getDeletedRecordIds('Vehicle_Passes').has(String(v.pass_id)));
    const booth_requests=(raw.booth_requests||[]).map((r,i)=>({
      request_id:r.request_id||'req_booth_'+i,
      event_id:r.event_id||this.currentEvent?.event_id||'isd_2026',
      item_name:r.item_name||'',
      qty_requested:parseInt(r.qty_requested||0),
      qty_approved:r.qty_approved!==undefined&&r.qty_approved!==null?parseInt(r.qty_approved):null,
      unit:r.unit||'個',
      group_name:normalizeGroupName(r.group_name),
      purpose:r.purpose||r.reason||'',
      contact:r.contact||'',
      status:r.status||'pending',
      requested_by:r.requested_by||'',
      requested_by_id:r.requested_by_id||'',
      approved_by:r.approved_by||'',
      approved_at:r.approved_at||'',
      requester_role:r.requester_role||'',
      group_confirmation_status:r.group_confirmation_status||'',
      group_confirmed_by:r.group_confirmed_by||'',
      group_confirmed_at:r.group_confirmed_at||'',
      notes:r.notes||'',
      created_at:r.created_at||''
    }));
    return {inventory, requests, booth_requests, vehicle_passes};
  }
,
  saveSuppliesData(data){
    const key=LS.supplies(this.currentEvent?.event_id||'isd_2026');
    localStorage.setItem(key, JSON.stringify(data));
    this.eventData['supplies']={inventory:data.inventory, requests:data.requests, booth_requests:data.booth_requests||[], vehicle_passes:data.vehicle_passes||[]};
    // 後台紀錄：嘗試同步到 GAS
    if(!this.mockMode && this.gasUrl){
      // Save inventory
      data.inventory.forEach(it=>{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Supplies',record:{supply_id:it.supply_id,event_id:this.currentEvent?.event_id||'isd_2026',item_name:it.item_name,total_qty:it.total_qty,unit:it.unit,category:it.category}})}).catch(()=>{});
      });
      // Save requests
      data.requests.forEach(r=>{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Supply_Requests',record:{request_id:r.request_id,event_id:r.event_id,supply_id:r.supply_id||'',item_name:r.item_name,qty_requested:r.qty_requested,qty_approved:r.qty_approved,unit:r.unit,group_name:r.group_name,reason:r.reason,date_needed:r.date_needed,contact:r.contact,status:r.status,requested_by:r.requested_by,requested_by_id:r.requested_by_id,approved_by:r.approved_by,approved_at:r.approved_at,requester_role:r.requester_role||'',group_confirmation_status:r.group_confirmation_status||'',group_confirmed_by:r.group_confirmed_by||'',group_confirmed_at:r.group_confirmed_at||'',notes:r.notes}})}).catch(()=>{});
      });
      // Save vehicle passes
      (data.vehicle_passes||[]).forEach(v=>{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Vehicle_Passes',record:{pass_id:v.pass_id,event_id:v.event_id,plate:v.plate,driver_name:v.driver_name,driver_contact:v.driver_contact,vehicle_type:v.vehicle_type,purpose:v.purpose,group_name:v.group_name,entry_date:v.entry_date,exit_date:v.exit_date,parking_location:v.parking_location,status:v.status,requested_by:v.requested_by,requested_by_id:v.requested_by_id,approved_by:v.approved_by,approved_at:v.approved_at,requester_role:v.requester_role||'',group_confirmation_status:v.group_confirmation_status||'',group_confirmed_by:v.group_confirmed_by||'',group_confirmed_at:v.group_confirmed_at||'',notes:v.notes}})}).catch(()=>{});
      });
    }
  }
,
  canSubmitSupply(){ return !!this.currentUser; } // 登入成員均可申請；低於總主任須先由本組總主任以上確認
,
  canManageAreaOperations(area){
    if(this.canManageApprovalRouting()) return true;
    return this.roleLevel(this.currentUser?.role)>=40&&(this.canApproveArea(area)||this.canExecuteArea(area));
  }
,
  isCoordinatorViceChair(){
    // 舊函數名稱保留相容；實際跟隨物資路由。
    return this.canManageAreaOperations('supplies');
  }
,
  canManageCoordinatorDocs(){
    return this.canManageApprovalRouting()||(this.roleLevel(this.currentUser?.role)>=40&&normalizeGroupName(this.currentUser?.group_name)==='協調組');
  }
,
  addSupplyNotification(targetUserId, notification){
    const key=LS.notifications(this.currentEvent?.event_id||'isd_2026', targetUserId);
    const list=JSON.parse(localStorage.getItem(key)||'[]');
    list.unshift({...notification, id:'notif_'+Date.now()+'_'+Math.random().toString(36).slice(2,5), read:false, created_at:new Date().toISOString()});
    localStorage.setItem(key, JSON.stringify(list.slice(0,50))); // keep 50
  }
,
  getMyNotifications(){
    if(!this.currentUser) return [];
    const key=LS.notifications(this.currentEvent?.event_id||'isd_2026', this.currentUser.user_id||this.currentUser.user_id||this.currentUser.user_id);
    // Actually user_id may be in different field, try multiple
    const uid=this.currentUser.user_id||this.currentUser.user_id||'';
    const key1=LS.notifications(this.currentEvent?.event_id||'isd_2026', uid);
    const key2=LS.notifications(this.currentEvent?.event_id||'isd_2026', this.currentUser.name||'');
    let list=JSON.parse(localStorage.getItem(key1)||'[]');
    const list2=JSON.parse(localStorage.getItem(key2)||'[]');
    list=[...list, ...list2];
    return list;
  }
,
  checkAndShowNotifications(){
    if(!this.currentUser) return;
    const notifs=this.getMyNotifications().filter(n=>!n.read);
    if(notifs.length===0) return;
    // Show popup modal for unread
    const latest=notifs[0];
    // Create notification modal if not exists
    let modal=document.getElementById('modal-notifications');
    if(!modal){
      modal=document.createElement('div');
      modal.id='modal-notifications';
      modal.className='fixed inset-0 bg-slate-900/60 modal z-[70] flex items-center justify-center p-4';
      document.body.appendChild(modal);
    }
    modal.innerHTML=`
      <div class="bg-white rounded-[20px] max-w-md w-full p-6 shadow-2xl space-y-4 modal-content-anim max-h-[88vh] overflow-y-auto">
        <div class="flex justify-between items-center"><h3 class="font-bold text-[16px]"><i class="fa-solid fa-bell text-amber-500 mr-2"></i>物資申請通知 (${notifs.length} 條未讀)</h3><button onclick="document.getElementById('modal-notifications').classList.add('hidden')" class="text-slate-400 p-2"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="space-y-3">${notifs.slice(0,5).map(n=>`
          <div class="border rounded-xl p-3 ${n.status==='approved'?'bg-emerald-50 border-emerald-200':n.status==='rejected'?'bg-rose-50 border-rose-200':'bg-amber-50 border-amber-200'}">
            <div class="flex justify-between items-start"><b class="text-[13px]">${escapeHtml(n.item_name||'物資申請')}</b><span class="text-[10px] px-2 py-0.5 rounded-full ${n.status==='approved'?'bg-emerald-100 text-emerald-700':n.status==='rejected'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}">${n.status==='approved'?'已批核':n.status==='rejected'?'已拒絕':'已修改'}</span></div>
            <div class="text-[11px] text-slate-600 mt-1 leading-relaxed">${escapeHtml(n.message||'')}</div>
            <div class="text-[10px] text-slate-400 mt-1">${n.approved_by?`批核人: ${escapeHtml(n.approved_by)} · `:''}${n.approved_at?new Date(n.approved_at).toLocaleString():''}</div>
          </div>
        `).join('')}</div>
        <div class="flex gap-2"><button onclick="app.markAllNotificationsRead()" class="flex-1 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold">全部標為已讀</button><button onclick="document.getElementById('modal-notifications').classList.add('hidden')" class="flex-1 bg-white border py-2.5 rounded-xl text-xs font-bold">關閉</button></div>
        <div class="text-[10px] text-slate-500">登入時自動彈出，批核完成後通知提交人</div>
      </div>
    `;
    modal.classList.remove('hidden');
  }
,
  markAllNotificationsRead(){
    if(!this.currentUser) return;
    const uid=this.currentUser.user_id||'';
    const keys=[LS.notifications(this.currentEvent?.event_id||'isd_2026', uid), LS.notifications(this.currentEvent?.event_id||'isd_2026', this.currentUser.name||'')];
    keys.forEach(k=>{
      const list=JSON.parse(localStorage.getItem(k)||'[]');
      const updated=list.map(n=>({...n, read:true}));
      localStorage.setItem(k, JSON.stringify(updated));
    });
    document.getElementById('modal-notifications')?.classList.add('hidden');
    showToast('已標為已讀','success');
  }
,
  renderSuppliesModule(){
    const container=document.getElementById('module-content');
    if(!this.suppliesSubTab) this.suppliesSubTab='requests';
    const data=this.getSuppliesData();
    const isAdmin=this.isAdmin();
    const canSubmit=this.canSubmitSupply();
    const isCoordinator=this.isCoordinatorViceChair();
    const myUserId=this.currentUser?.user_id||'';
    const myName=this.currentUser?.name||'';
    const myRequests=data.requests.filter(r=> r.requested_by_id===myUserId || r.requested_by===myName);
    const pendingRequests=data.requests.filter(r=> r.status==='pending');
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] leading-relaxed text-blue-900">
          <b>📦 物資管理升級：</b><br>
          • 所有登入成員可提交；低於總主任提交的申請先由本組總主任以上確認<br>
          • 目前由 ${escapeHtml(this.approvalRouteLabel('supplies','approver_groups'))} 批核／修改，批准後交 ${escapeHtml(this.approvalRouteLabel('supplies','executor_groups'))} 執行及查看最後名單<br>
          • 表格可在 APP 內直接填寫，後台紀錄好
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchSuppliesTab('my')" class="tab-btn ${this.suppliesSubTab==='my'?'active':''}"><i class="fa-solid fa-user mr-1"></i> 我的申請 (${myRequests.length})</button>
          <button onclick="app.switchSuppliesTab('booth')" class="tab-btn ${this.suppliesSubTab==='booth'?'active':''}"><i class="fa-solid fa-store mr-1"></i> 攤位物資 (${(data.booth_requests||[]).length})</button>
          ${(this.canApproveArea('supplies')||this.canExecuteArea('supplies')||isAdmin||isCoordinator)?`
          <button onclick="app.switchSuppliesTab('requests')" class="tab-btn ${this.suppliesSubTab==='requests'?'active':''}"><i class="fa-solid fa-list mr-1"></i> 全部清單 (${data.requests.length})</button>
          <button onclick="app.switchSuppliesTab('pending')" class="tab-btn ${this.suppliesSubTab==='pending'?'active':''}"><i class="fa-solid fa-hourglass-half mr-1"></i> 待批核 (${pendingRequests.length})</button>
          <button onclick="app.switchSuppliesTab('inventory')" class="tab-btn ${this.suppliesSubTab==='inventory'?'active':''}"><i class="fa-solid fa-warehouse mr-1"></i> 庫存</button>
          <button onclick="app.switchSuppliesTab('checklist')" class="tab-btn ${this.suppliesSubTab==='checklist'?'active':''}"><i class="fa-solid fa-clipboard-check mr-1"></i> 物資Check List</button>
          <button onclick="app.switchSuppliesTab('stats')" class="tab-btn ${this.suppliesSubTab==='stats'?'active':''}"><i class="fa-solid fa-chart-column mr-1"></i> 統計</button>
          <button onclick="app.switchSuppliesTab('notifications')" class="tab-btn ${this.suppliesSubTab==='notifications'?'active':''}"><i class="fa-solid fa-bell mr-1"></i> 通知</button>
          `:''}
        </div>
        <div id="supplies-tab-requests" class="${this.suppliesSubTab==='requests'?'':'hidden'}"></div>
        <div id="supplies-tab-my" class="${this.suppliesSubTab==='my'?'':'hidden'}"></div>
        <div id="supplies-tab-pending" class="${this.suppliesSubTab==='pending'?'':'hidden'}"></div>
        <div id="supplies-tab-inventory" class="${this.suppliesSubTab==='inventory'?'':'hidden'}"></div>
        <div id="supplies-tab-checklist" class="${this.suppliesSubTab==='checklist'?'':'hidden'}"></div>
        <div id="supplies-tab-notifications" class="${this.suppliesSubTab==='notifications'?'':'hidden'}"></div>
        <div id="supplies-tab-stats" class="${this.suppliesSubTab==='stats'?'':'hidden'}"></div>
        <div id="supplies-tab-booth" class="${this.suppliesSubTab==='booth'?'':'hidden'}"></div>
      </div>
    `;
    if(this.suppliesSubTab==='requests' && !(this.canApproveArea('supplies')||this.canExecuteArea('supplies')||isAdmin)) this.suppliesSubTab='my';
    
    this.renderSuppliesRequests();
    this.renderSuppliesMy();
    this.renderSuppliesPending();
    this.renderSuppliesInventory();
    this.renderSuppliesChecklist();
    this.renderSuppliesNotifications();
    this.renderSuppliesStats();
    // Update module-actions
    const actionsEl=document.getElementById('module-actions');
    if(actionsEl){
      actionsEl.innerHTML=`
        <div class="flex gap-2 flex-wrap">
          <button onclick="app.openModule('apply_hub')" class="bg-slate-100 border px-3 py-2 rounded-xl text-xs font-bold">← 返回申請中心</button>
          ${canSubmit?`<button onclick="app.openSupplyRequestForm()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>提交物資申請</button><button onclick="app.openBoothSupplyForm()" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-store mr-1"></i>攤位物資申請</button>`:''}
          ${isCoordinator?`<button onclick="app.openInventoryForm()" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-boxes-stacked mr-1"></i>新增總物資</button>`:''}
          ${(this.canApproveArea('supplies')||this.canExecuteArea('supplies')||isCoordinator||isAdmin)?`<button onclick="app.exportSuppliesData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button>`:''}
          ${isCoordinator?`<label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">上傳CSV批量<input type="file" accept=".csv,.json" class="hidden" onchange="app.handleSuppliesFileUpload(this.files[0])"></label>`:''}
        </div>
      `;
    }
  }
,
  switchSuppliesTab(tab){
    this.suppliesSubTab=tab;
    document.querySelectorAll('[id^="supplies-tab-"]').forEach(el=>el.classList.add('hidden'));
    document.getElementById('supplies-tab-'+tab)?.classList.remove('hidden');
    if(tab==='booth') this.renderSuppliesBooth();
    if(tab==='inventory') this.renderSuppliesInventory();
    if(tab==='stats') this.renderSuppliesStats();
    document.querySelectorAll('[onclick^="app.switchSuppliesTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'tab-btn active':'tab-btn';
    });
  }
,
  renderSuppliesRequests(){
    const container=document.getElementById('supplies-tab-requests');
    if(!container) return;
    const data=this.getSuppliesData();
    const myId=this.currentUser?.user_id||'',myName=this.currentUser?.name||'';
    const list=[...data.requests].filter(r=>{
      const mine=(r.requested_by_id&&r.requested_by_id===myId)||(myName&&r.requested_by===myName);
      if(mine||this.canManageApprovalRouting()) return true;
      if(r.status==='pending') return this.canApproveArea('supplies')||this.canConfirmApplication(r);
      if(['approved','modified'].includes(r.status)) return this.canExecuteArea('supplies');
      return this.canApproveArea('supplies');
    }).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    if(!list.length){ container.innerHTML='<p class="text-xs text-slate-400 py-8 text-center">暫無物資申請，點擊右上「提交物資申請」可直接在 APP 填表</p>'; return; }
    container.innerHTML=`<div class="space-y-3">${list.map(r=>{
      const statusColor={pending:'bg-amber-100 text-amber-700 border-amber-200',approved:'bg-emerald-100 text-emerald-700 border-emerald-200',rejected:'bg-rose-100 text-rose-700 border-rose-200',modified:'bg-sky-100 text-sky-700 border-sky-200'}[r.status]||'bg-slate-100';
      return `<div class="border rounded-xl p-3 bg-white space-y-2">
        <div class="flex justify-between items-start gap-2">
          <div><div class="flex items-center gap-2 flex-wrap"><b class="text-[13px]">${escapeHtml(r.item_name)}</b><span class="text-[10px] px-2 py-0.5 rounded-full border ${statusColor}">${r.status==='pending'?'待批核':r.status==='approved'?'已批核':r.status==='rejected'?'已拒絕':r.status==='modified'?'已修改批核':r.status}</span><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(r.group_name)}</span>${r.status==='pending'?this.applicationStageHTML(r):''}</div>
          <div class="text-[11px] text-slate-500 mt-1">申請數量: <b>${r.qty_requested} ${escapeHtml(r.unit)}</b> ${r.qty_approved!==null&&r.qty_approved!==r.qty_requested?`→ 批核數量: <b class="text-emerald-700">${r.qty_approved} ${escapeHtml(r.unit)}</b> (已修改)`:''} | 申請人: ${escapeHtml(r.requested_by)} | 需用日期: ${escapeHtml(r.date_needed||'-')}</div>
          ${r.reason?`<div class="text-[11px] text-slate-600 mt-1 bg-slate-50 border rounded-xl p-2">${escapeHtml(r.reason)}</div>`:''}
          ${r.notes?`<div class="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2 mt-1">批核備註: ${escapeHtml(r.notes)}</div>`:''}
          </div>
          <div class="flex flex-col gap-1 flex-shrink-0">
            ${this.canConfirmApplication(r)?`<button onclick="app.confirmApplication('supplies','${r.request_id}')" class="bg-sky-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">本組確認</button>`:''}
            ${this.canApproveArea('supplies') && r.status==='pending' && this.applicationReadyForApproval(r)?`<div class="flex gap-1"><button onclick="app.approveSupplyRequest('${r.request_id}')" class="bg-emerald-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">批准</button><button onclick="app.openSupplyApproveModifyModal('${r.request_id}')" class="bg-sky-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">修改批核</button><button onclick="app.rejectSupplyRequest('${r.request_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1 rounded-xl text-[11px] font-bold">拒絕</button></div>`:''}
            ${this.isSuperAdmin()?`<button onclick="app.deleteSupplyRequest('${r.request_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️ 刪除</button>`:''}
            <span class="text-[10px] text-slate-400">${r.approved_by?`批核: ${escapeHtml(r.approved_by)}<br>${r.approved_at?new Date(r.approved_at).toLocaleString():''}`:''}</span>
          </div>
        </div>
      </div>`;
    }).join('')}</div>`;
  }
,
  renderSuppliesMy(){
    const container=document.getElementById('supplies-tab-my');
    if(!container) return;
    const data=this.getSuppliesData();
    const myName=this.currentUser?.name||'';
    const myId=this.currentUser?.user_id||'';
    const myRequests=data.requests.filter(r=> r.requested_by_id===myId || r.requested_by===myName).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
    const myVehicles=(data.vehicle_passes||[]).filter(v=> v.requested_by_id===myId || v.requested_by===myName).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
    if(!myRequests.length && !myVehicles.length){ container.innerHTML='<p class="text-xs text-slate-400 py-8 text-center">暫無我的申請，點擊右上提交物資申請或申請車輛通行證</p>'; return; }
    const stLabel={pending:'待批核',approved:'已批核',rejected:'已拒絕',modified:'已修改批核'};
    const stCls={pending:'bg-amber-100 text-amber-700',approved:'bg-emerald-100 text-emerald-700',rejected:'bg-rose-100 text-rose-700',modified:'bg-sky-100 text-sky-700'};
    const reqRows=myRequests.map(r=>{
      const statusColor=stCls[r.status]||'bg-slate-100';
      return `<div class="border rounded-xl p-3 bg-white"><div class="flex justify-between"><div><b class="text-[13px]">📦 ${escapeHtml(r.item_name)}</b> <span class="text-[10px] px-2 py-0.5 rounded-full ${statusColor}">${stLabel[r.status]||r.status}</span><div class="text-[11px] text-slate-500 mt-1">數量: ${r.qty_requested} → ${r.qty_approved!==null&&r.qty_approved!==undefined?r.qty_approved:r.qty_requested} ${r.unit} | ${r.group_name}</div>${r.reason?`<div class="text-[11px] text-slate-600 mt-1 bg-slate-50 border rounded-xl p-2">${escapeHtml(r.reason)}</div>`:''}</div><div class="text-[10px] text-slate-400">${r.approved_by?`批核: ${escapeHtml(r.approved_by)}`:''}</div></div></div>`;
    }).join('');
    const vehRows=myVehicles.map(v=>{
      const statusColor=stCls[v.status]||'bg-slate-100';
      return `<div class="border rounded-xl p-3 bg-white"><div class="flex justify-between"><div><b class="text-[13px]">🚗 ${escapeHtml(v.plate)}</b> <span class="text-[10px] px-2 py-0.5 rounded-full ${statusColor}">${stLabel[v.status]||v.status}</span><div class="text-[11px] text-slate-500 mt-1">司機: ${escapeHtml(v.driver_name)} | ${escapeHtml(v.group_name)}</div><div class="text-[11px] text-slate-500">進出: ${escapeHtml(v.entry_date||'-')} → ${escapeHtml(v.exit_date||'-')} | 停泊: ${escapeHtml(v.parking_location||'待定')}</div>${v.notes?`<div class="text-[10px] bg-amber-50 border border-amber-200 rounded-xl p-2 mt-1">${escapeHtml(v.notes)}</div>`:''}</div><div class="text-[10px] text-slate-400">${v.approved_by?`批核: ${escapeHtml(v.approved_by)}`:''}</div></div></div>`;
    }).join('');
    container.innerHTML=`<div class="space-y-4">
      ${myRequests.length?`<div><h5 class="font-bold text-[12px] text-blue-700 mb-2"><i class="fa-solid fa-boxes-stacked mr-1"></i>我的物資申請 (${myRequests.length})</h5><div class="space-y-3">${reqRows}</div></div>`:''}
      ${myVehicles.length?`<div><h5 class="font-bold text-[12px] text-amber-700 mb-2"><i class="fa-solid fa-car mr-1"></i>我的車輛通行證 (${myVehicles.length})</h5><div class="space-y-3">${vehRows}</div></div>`:''}
    </div>`;
  }
,
  renderSuppliesPending(){
    const container=document.getElementById('supplies-tab-pending');
    if(!container) return;
    if(!this.canApproveArea('supplies')){
      container.innerHTML=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-900"><b>指定物資批核組專用：</b>目前由 ${escapeHtml(this.approvalRouteLabel('supplies','approver_groups'))} 批核；執行／最後名單交 ${escapeHtml(this.approvalRouteLabel('supplies','executor_groups'))}。低於總主任提交的申請須先經本組總主任以上確認。</div>`;
      return;
    }
    const data=this.getSuppliesData();
    const pending=data.requests.filter(r=>r.status==='pending');
    if(!pending.length){ container.innerHTML='<p class="text-xs text-slate-400 py-8 text-center">暫無待批核申請</p>'; return; }
    container.innerHTML=`<div class="space-y-3"><div class="bg-orange-50 border border-orange-200 rounded-xl p-3 text-[11px] text-orange-900">待處理 ${pending.length} 筆；已完成本組確認的申請，${escapeHtml(this.approvalRouteLabel('supplies','approver_groups'))} 可批核／修改數量，批准後交 ${escapeHtml(this.approvalRouteLabel('supplies','executor_groups'))} 執行。</div>${pending.map(r=>`
      <div class="border rounded-xl p-3 bg-white space-y-2">
        <div class="flex justify-between gap-2"><div><div class="flex flex-wrap gap-1.5"><b class="text-[13px]">${escapeHtml(r.item_name)}</b><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(r.group_name)}</span>${this.applicationStageHTML(r)}</div><div class="text-[11px] text-slate-500 mt-1">申請: ${r.qty_requested} ${r.unit} | 申請人: ${escapeHtml(r.requested_by)} | 需用: ${escapeHtml(r.date_needed||'-')} | 聯絡: ${escapeHtml(r.contact||'-')}</div><div class="text-[11px] bg-slate-50 border rounded-xl p-2 mt-1">${escapeHtml(r.reason||'無原因')}</div></div>${this.applicationReadyForApproval(r)?`<div class="flex flex-col gap-1"><button onclick="app.approveSupplyRequest('${r.request_id}')" class="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">批准 (原數量)</button><button onclick="app.openSupplyApproveModifyModal('${r.request_id}')" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">修改數量批核</button><button onclick="app.rejectSupplyRequest('${r.request_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1.5 rounded-xl text-[11px] font-bold">拒絕</button></div>`:'<span class="text-[10px] text-slate-400">等待本組確認</span>'}</div>
      </div>
    `).join('')}</div>`;
  }
,
  renderSuppliesInventory(){
    const container=document.getElementById('supplies-tab-inventory');
    if(!container) return;
    const data=this.getSuppliesData();
    // Calculate remaining
    const inventory=data.inventory.map(it=>{
      const allocated=data.requests.filter(r=> r.item_name===it.item_name && r.status==='approved').reduce((sum,r)=> sum + (r.qty_approved!==null?r.qty_approved:r.qty_requested),0);
      return {...it, allocated, remaining: Math.max(0, it.total_qty - allocated)};
    });
    container.innerHTML=`
      <div class="space-y-3">
        <div class="flex gap-2 flex-wrap"><button onclick="app.openInventoryForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">+ 新增總物資</button><button onclick="app.downloadSuppliesTemplate()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載範本 CSV</button><label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">上傳CSV批量<input type="file" accept=".csv,.json" class="hidden" onchange="app.handleSuppliesFileUpload(this.files[0])"></label></div>
        <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100 font-bold"><tr><th class="px-3 py-2 text-left">物資名稱</th><th class="px-3 py-2 text-left">總數</th><th class="px-3 py-2 text-left">已分配</th><th class="px-3 py-2 text-left">剩餘</th><th class="px-3 py-2 text-left">單位/分類</th><th class="px-3 py-2 text-right">操作</th></tr></thead><tbody class="divide-y bg-white">${inventory.map(it=>`
          <tr><td class="px-3 py-2 font-medium" data-label="物資">${escapeHtml(it.item_name)}</td><td class="px-3 py-2" data-label="總數">${it.total_qty}</td><td class="px-3 py-2 text-amber-700" data-label="已分配">${it.allocated}</td><td class="px-3 py-2 font-bold ${it.remaining===0?'text-rose-600':'text-emerald-700'}" data-label="剩餘">${it.remaining}</td><td class="px-3 py-2" data-label="單位">${escapeHtml(it.unit)}/${escapeHtml(it.category)}</td><td class="px-3 py-2 text-right" data-label="操作"><div class="flex gap-1 justify-end">${this.isCoordinatorViceChair()?`<button onclick="app.openInventoryForm('${it.supply_id}')" class="bg-white border px-2 py-1 rounded-xl text-[11px]">✏️</button><button onclick="app.deleteInventory('${it.supply_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[11px]">🗑️</button>`:''}</div></td></tr>
        `).join('') || '<tr><td colspan="6" class="px-3 py-4 text-center text-slate-400">暫無總物資，請新增</td></tr>'}</tbody></table></div>
      </div>
    `;
  }
,
  renderSuppliesNotifications(){
    const container=document.getElementById('supplies-tab-notifications');
    if(!container) return;
    const notifs=this.getMyNotifications().slice(0,20);
    if(!notifs.length){ container.innerHTML='<p class="text-xs text-slate-400 py-8 text-center">暫無通知，批核完成後提交人再登入時會彈出通知</p>'; return; }
    container.innerHTML=`<div class="space-y-2">${notifs.map(n=>`
      <div class="border rounded-xl p-3 ${n.read?'bg-white':'bg-amber-50 border-amber-200'}">
        <div class="flex justify-between"><b class="text-[12px]">${escapeHtml(n.item_name||'物資申請')}</b><span class="text-[10px] px-2 py-0.5 rounded-full ${n.status==='approved'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}">${n.status}</span></div>
        <div class="text-[11px] text-slate-600 mt-1">${escapeHtml(n.message||'')}</div>
        <div class="text-[10px] text-slate-400 mt-1">${n.approved_by?`批核: ${escapeHtml(n.approved_by)} · `:''}${n.created_at?new Date(n.created_at).toLocaleString():''} ${n.read?'· 已讀':'· 未讀'}</div>
      </div>
    `).join('')}</div><div class="mt-3 flex gap-2"><button onclick="app.markAllNotificationsRead()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold">全部已讀</button><button onclick="app.clearMyNotifications()" class="bg-white border px-4 py-2 rounded-xl text-xs font-bold">清空通知</button></div>`;
  }
,
  clearMyNotifications(){
    if(!this.currentUser) return;
    const uid=this.currentUser.user_id||'';
    const keys=[LS.notifications(this.currentEvent?.event_id||'isd_2026', uid), LS.notifications(this.currentEvent?.event_id||'isd_2026', this.currentUser.name||'')];
    keys.forEach(k=> localStorage.removeItem(k));
    showToast('已清空通知','warning');
    this.renderSuppliesNotifications();
  }
,
  renderSuppliesStats(){
    const container=document.getElementById('supplies-tab-stats');
    if(!container) return;
    const data=this.getSuppliesData();
    const requests=data.requests||[];
    // 按狀態統計
    const byStatus={};
    requests.forEach(r=>{ byStatus[r.status]=(byStatus[r.status]||0)+1; });
    // 按組別統計 (申請數量 及 已批核數量)
    const byGroup={};
    requests.forEach(r=>{
      const g=r.group_name||'未分組';
      if(!byGroup[g]) byGroup[g]={count:0, qty:0, approvedQty:0, pendingQty:0};
      byGroup[g].count++;
      byGroup[g].qty += r.qty_requested||0;
      if(r.status==='approved') byGroup[g].approvedQty += (r.qty_approved!==null?r.qty_approved:r.qty_requested)||0;
      if(r.status==='pending') byGroup[g].pendingQty += r.qty_requested||0;
    });
    // 按物資統計 + 對照總庫存
    const byItem={};
    requests.forEach(r=>{
      const it=r.item_name||'未命名';
      if(!byItem[it]) byItem[it]={count:0, requested:0, approved:0, pending:0, rejected:0};
      byItem[it].count++;
      byItem[it].requested += r.qty_requested||0;
      if(r.status==='approved') byItem[it].approved += (r.qty_approved!==null?r.qty_approved:r.qty_requested)||0;
      if(r.status==='pending') byItem[it].pending += r.qty_requested||0;
      if(r.status==='rejected') byItem[it].rejected += r.qty_requested||0;
    });
    const statusLabel={pending:'待批核',approved:'已批核',rejected:'已拒絕',modified:'已修改批核'};
    container.innerHTML=`
      <div class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3"><div class="text-2xl font-extrabold text-amber-700">${byStatus.pending||0}</div><div class="text-[11px] text-amber-800">待批核</div></div>
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><div class="text-2xl font-extrabold text-emerald-700">${byStatus.approved||0}</div><div class="text-[11px] text-emerald-800">已批核</div></div>
          <div class="bg-rose-50 border border-rose-200 rounded-xl p-3"><div class="text-2xl font-extrabold text-rose-700">${byStatus.rejected||0}</div><div class="text-[11px] text-rose-800">已拒絕</div></div>
          <div class="bg-sky-50 border border-sky-200 rounded-xl p-3"><div class="text-2xl font-extrabold text-sky-700">${requests.length}</div><div class="text-[11px] text-sky-800">申請總數</div></div>
        </div>
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-[13px] mb-2"><i class="fa-solid fa-people-group text-indigo-600 mr-2"></i>按組別統計</h4>
          <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">組別</th><th class="px-2 py-1 text-right">申請筆數</th><th class="px-2 py-1 text-right">申請數量</th><th class="px-2 py-1 text-right">待批核</th><th class="px-2 py-1 text-right">已批核</th></tr></thead><tbody class="divide-y">${Object.keys(byGroup).sort().map(g=>{const s=byGroup[g]; return `<tr><td class="px-2 py-1 font-medium" data-label="組別">${escapeHtml(g)}</td><td class="px-2 py-1 text-right" data-label="申請筆數">${s.count}</td><td class="px-2 py-1 text-right" data-label="申請數量">${s.qty}</td><td class="px-2 py-1 text-right text-amber-700" data-label="待批核">${s.pendingQty}</td><td class="px-2 py-1 text-right text-emerald-700" data-label="已批核">${s.approvedQty}</td></tr>`;}).join('') || '<tr><td colspan="5" class="px-2 py-4 text-center text-slate-400">暫無物資申請</td></tr>'}</tbody></table></div>
        </div>
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-[13px] mb-2"><i class="fa-solid fa-boxes-stacked text-blue-600 mr-2"></i>按物資統計（對照庫存）</h4>
          <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">物資</th><th class="px-2 py-1 text-right">申請筆數</th><th class="px-2 py-1 text-right">申請總數</th><th class="px-2 py-1 text-right">待批</th><th class="px-2 py-1 text-right">已批核</th><th class="px-2 py-1 text-right">庫存總數</th><th class="px-2 py-1 text-right">剩餘</th></tr></thead><tbody class="divide-y">${Object.keys(byItem).sort().map(it=>{
            const s=byItem[it];
            const inv=(data.inventory||[]).find(i=>i.item_name===it);
            const total=inv?inv.total_qty:null;
            const remain=total!=null?Math.max(0,total-(s.approved||0)):null;
            return `<tr><td class="px-2 py-1 font-medium" data-label="物資">${escapeHtml(it)}</td><td class="px-2 py-1 text-right" data-label="筆數">${s.count}</td><td class="px-2 py-1 text-right" data-label="申請">${s.requested}</td><td class="px-2 py-1 text-right text-amber-700" data-label="待批">${s.pending}</td><td class="px-2 py-1 text-right text-emerald-700" data-label="已批">${s.approved}</td><td class="px-2 py-1 text-right" data-label="庫存">${total!=null?total:'—'}</td><td class="px-2 py-1 text-right font-bold ${remain===0?'text-rose-600':(remain!=null?'text-emerald-700':'')}" data-label="剩餘">${remain!=null?remain:'—'}</td></tr>`;
          }).join('') || '<tr><td colspan="7" class="px-2 py-4 text-center text-slate-400">暫無物資申請</td></tr>'}</tbody></table></div>
        </div>
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-[13px] mb-2"><i class="fa-solid fa-store text-orange-600 mr-2"></i>攤位物資統計</h4>
          ${(()=>{
            const booths=data.booth_requests||[];
            if(!booths.length) return '<p class="text-xs text-slate-400">暫無攤位物資申請</p>';
            const byB={};
            booths.forEach(r=>{
              const it=r.item_name||'未命名';
              if(!byB[it]) byB[it]={count:0,requested:0,approved:0,pending:0};
              byB[it].count++; byB[it].requested+=r.qty_requested||0;
              if(r.status==='approved'||r.status==='modified') byB[it].approved+=(r.qty_approved!=null?r.qty_approved:r.qty_requested)||0;
              if(r.status==='pending') byB[it].pending+=r.qty_requested||0;
            });
            return `<div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">攤位物資</th><th class="px-2 py-1 text-right">筆數</th><th class="px-2 py-1 text-right">申請</th><th class="px-2 py-1 text-right">待批</th><th class="px-2 py-1 text-right">已批</th></tr></thead><tbody class="divide-y">${Object.keys(byB).sort().map(it=>{const s=byB[it]; return `<tr><td class="px-2 py-1 font-medium">${escapeHtml(it)}</td><td class="px-2 py-1 text-right">${s.count}</td><td class="px-2 py-1 text-right">${s.requested}</td><td class="px-2 py-1 text-right text-amber-700">${s.pending}</td><td class="px-2 py-1 text-right text-emerald-700">${s.approved}</td></tr>`;}).join('')}</tbody></table></div>`;
          })()}
        </div>
      </div>
    `;
  }
,
  openSupplyRequestForm(editId=null){
    if(!this.canSubmitSupply()){ showToast('請先登入後提交申請','error'); this.openLoginModal(); return; }
    const isCoordinator=this.isCoordinatorViceChair();
    const data=this.getSuppliesData();
    const existing=editId?data.requests.find(r=>r.request_id===editId):null;
    const title=existing?'編輯物資申請':'提交物資申請 (總主任/副主席可提交，APP內直接填寫)';
    let html=`
      <input type="hidden" id="supply-form-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="supply-form-id" value="${existing?.request_id||''}">
      
      <div id="supply-rows" class="space-y-3">
        <div class="supply-row border rounded-xl p-3 bg-slate-50 space-y-2 relative">
          <button type="button" onclick="this.parentElement.remove()" class="absolute top-2 right-2 text-rose-600 text-[10px] font-bold">刪除這項</button>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="col-span-2"><label class="text-[11px] font-bold">物資名稱 *</label><input class="supply-item w-full px-3 py-2 border rounded-xl text-sm mt-1" required placeholder="輸入物資名稱" value="${escapeHtml(existing?.item_name||'')}"></div>
            <div><label class="text-[11px] font-bold">申請數量 *</label><input type="number" class="supply-qty w-full px-3 py-2 border rounded-xl text-sm mt-1" required min="1" value="${existing?.qty_requested||''}"></div>
            <div><label class="text-[11px] font-bold">單位</label><input class="supply-unit w-full px-3 py-2 border rounded-xl text-sm mt-1" value="${escapeHtml(existing?.unit||'個')}"></div>
            <div><label class="text-[11px] font-bold">所屬組別 *</label><input class="supply-group w-full px-3 py-2 border rounded-xl text-sm mt-1" required value="${escapeHtml(existing?.group_name||this.currentUser?.group_name||'')}"></div>
            <div class="col-span-2"><label class="text-[11px] font-bold">申請原因/用途</label><textarea class="supply-reason w-full px-3 py-2 border rounded-xl text-sm mt-1" rows="2" placeholder="特別要求才填寫（可選）">${escapeHtml(existing?.reason||'')}</textarea></div>
            <div><label class="text-[11px] font-bold">聯絡電話</label><input class="supply-contact w-full px-3 py-2 border rounded-xl text-sm mt-1" placeholder="方便協調" value="${escapeHtml(existing?.contact||'')}"></div>
          </div>
        </div>
      </div>
      <div class="text-right"><button type="button" onclick="app.addSupplyRow()" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-plus mr-1"></i>增加一項物資</button></div>
      <div class="text-[10px] text-slate-500 mt-2">低於總主任提交會先交本組總主任以上確認，再由 ${escapeHtml(this.approvalRouteLabel('supplies','approver_groups'))} 批核，最後交 ${escapeHtml(this.approvalRouteLabel('supplies','executor_groups'))} 執行。</div>
    `;
    document.getElementById('record-modal-title').textContent=title;
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitSupplyRequestForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitSupplyRequestForm(){
    const mode=document.getElementById('supply-form-mode').value;
    const id=document.getElementById('supply-form-id').value;
    const data=this.getSuppliesData();
    const requested_by=(document.getElementById('supply-requested-by')?.value.trim()||this.currentUser?.name||'');
    if(mode==='edit'){
      const row=document.querySelector('.supply-row');
      if(!row){ showToast('表單無效','error'); return; }
      const item_name=row.querySelector('.supply-item').value.trim();
      const qty_str=row.querySelector('.supply-qty').value;
      const qty=parseInt(qty_str||'0');
      const unit=row.querySelector('.supply-unit').value.trim()||'個';
      let group_name=row.querySelector('.supply-group').value.trim();
      const reason=row.querySelector('.supply-reason').value.trim()||'';
      const contact=row.querySelector('.supply-contact').value.trim()||'';
      if(!item_name||!qty_str||!group_name){ showToast('請填寫物資名稱、數量、組別','error'); return; }
      if(isNaN(qty)||qty<1){ showToast('數量須為大於0的整數','error'); return; }
      if(this.roleLevel(this.currentUser?.role)<40) group_name=normalizeGroupName(this.currentUser?.group_name);
      const idx=data.requests.findIndex(r=>r.request_id===id);
      if(idx>=0){
        const confirmation=this.applicationConfirmationMeta(this.currentUser);
        data.requests[idx]={...data.requests[idx],...confirmation,item_name,qty_requested:qty,unit,group_name,reason,contact,requested_by,requested_by_id:this.currentUser?.user_id||'',status:'pending',approved_by:'',approved_at:''};
      }
    }else{
      const rows=document.querySelectorAll('.supply-row');
      if(!rows.length){ showToast('請至少填寫一項物資','error'); return; }
      const items=[];
      for(let i=0;i<rows.length;i++){
        const row=rows[i];
        const item_name=row.querySelector('.supply-item').value.trim();
        const qty_str=row.querySelector('.supply-qty').value;
        const qty=parseInt(qty_str||'0');
        const unit=row.querySelector('.supply-unit').value.trim()||'個';
        let group_name=row.querySelector('.supply-group').value.trim();
        const reason=row.querySelector('.supply-reason').value.trim()||'';
        const contact=row.querySelector('.supply-contact').value.trim()||'';
        if(!item_name||!qty_str||!group_name){ showToast('第'+(i+1)+'項：請填寫物資名稱、數量、組別','error'); return; }
        if(isNaN(qty)||qty<1){ showToast('第'+(i+1)+'項：數量須為大於0的整數','error'); return; }
        if(this.roleLevel(this.currentUser?.role)<40) group_name=normalizeGroupName(this.currentUser?.group_name);
        items.push({item_name,qty_requested:qty,unit,group_name,reason,contact,requested_by,requested_by_id:this.currentUser?.user_id||''});
      }
      for(const it of items){
        data.requests.push({
          request_id:'req_'+Date.now()+'_'+Math.floor(Math.random()*10000),
          event_id:this.currentEvent?.event_id||'isd_2026',
          item_name:it.item_name,
          qty_requested:it.qty_requested,
          qty_approved:null,
          unit:it.unit,
          group_name:it.group_name,
          reason:it.reason,
          contact:it.contact,
          ...this.applicationConfirmationMeta(this.currentUser),
          status:'pending',
          requested_by:it.requested_by,
          requested_by_id:it.requested_by_id,
          approved_by:'',
          approved_at:'',
          notes:'',
          created_at:new Date().toISOString()
        });
      }
    }
    this.saveSuppliesData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    const lastId = mode==='edit'?id:(data.requests[data.requests.length-1]?.request_id);
    const saved=data.requests.find(r=>r.request_id===lastId);
    showToast(mode==='edit'?'已更新物資申請並重新進入流程':(this.applicationNeedsGroupConfirmation(saved)?'已提交物資申請：待本組總主任確認':'已提交物資申請：已交指定批核組'),'success');
    this.refreshSuppliesViews();
  },
  openSupplyApproveModifyModal(requestId){
    if(!this.canApproveArea('supplies')){ showToast('你不屬於目前指定的物資批核組別','error'); return; }
    const data=this.getSuppliesData();
    const req=data.requests.find(r=>r.request_id===requestId);
    if(!req) return;
    if(!this.applicationReadyForApproval(req)){ showToast('須先完成本組確認','warning'); return; }
    const html=`
      <input type="hidden" id="approve-request-id" value="${req.request_id}">
      <div class="space-y-3">
        <div class="bg-slate-50 border rounded-xl p-3 text-[11px]"><b>原申請：</b>${escapeHtml(req.item_name)} x ${req.qty_requested} ${escapeHtml(req.unit)} | 組別: ${escapeHtml(req.group_name)} | 申請人: ${escapeHtml(req.requested_by)}<br>原因: ${escapeHtml(req.reason)}</div>
        <div><label class="text-[11px] font-bold">批核數量 (可修改) *</label><input type="number" id="approve-qty" value="${req.qty_requested}" min="0" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">批核備註</label><textarea id="approve-notes" rows="2" placeholder="例如：庫存不足，只批5個，或已修改為..." class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></textarea></div>
        <div class="flex gap-2"><button type="button" onclick="app.approveSupplyRequest('${req.request_id}', true)" class="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold">批准 (可含修改)</button><button type="button" onclick="app.rejectSupplyRequest('${req.request_id}')" class="flex-1 bg-rose-50 border border-rose-200 text-rose-600 py-2 rounded-xl text-xs font-bold">拒絕</button></div>
      </div>
    `;
    document.getElementById('record-modal-title').textContent=`${this.approvalRouteLabel('supplies','approver_groups')} 批核／修改`;
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.approveSupplyRequest(req.request_id, true); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  approveSupplyRequest(requestId, isModify=false){
    if(!this.canApproveArea('supplies')){ showToast('你沒有物資批核權','error'); return; }
    const data=this.getSuppliesData();
    const idx=data.requests.findIndex(r=>r.request_id===requestId);
    if(idx<0) return;
    if(!this.applicationReadyForApproval(data.requests[idx])){ showToast('須先由申請人所屬組別總主任以上確認','warning'); return; }
    let approvedQty=data.requests[idx].qty_requested;
    let notes='';
    if(isModify){
      const qtyInput=document.getElementById('approve-qty');
      if(qtyInput) approvedQty=parseInt(qtyInput.value)||approvedQty;
      const notesInput=document.getElementById('approve-notes');
      if(notesInput) notes=notesInput.value.trim();
    }
    data.requests[idx].qty_approved=approvedQty;
    data.requests[idx].status= approvedQty!==data.requests[idx].qty_requested ? 'modified' : 'approved';
    data.requests[idx].approved_by=(this.currentUser?.name||'')+`（${this.approvalRouteLabel('supplies','approver_groups')}）`;
    data.requests[idx].approved_at=new Date().toISOString();
    data.requests[idx].notes=notes||`原申請 ${data.requests[idx].qty_requested} → 批核 ${approvedQty}`;
    this.saveSuppliesData(data);
    // Notify submitter
    const targetId=data.requests[idx].requested_by_id||data.requests[idx].requested_by;
    this.addSupplyNotification(targetId, {
      type:'supply_approved',
      item_name:data.requests[idx].item_name,
      qty_requested:data.requests[idx].qty_requested,
      qty_approved:approvedQty,
      status:data.requests[idx].status,
      approved_by:data.requests[idx].approved_by,
      approved_at:data.requests[idx].approved_at,
      message:`你的物資申請「${data.requests[idx].item_name} x ${data.requests[idx].qty_requested} ${data.requests[idx].unit}」已由 ${this.approvalRouteLabel('supplies','approver_groups')} ${this.currentUser?.name||''} ${data.requests[idx].status==='approved'?'批准':'修改批核'}為 ${approvedQty} ${data.requests[idx].unit}。${notes?`備註：${notes}`:''} 執行組：${this.approvalRouteLabel('supplies','executor_groups')}。申請組別：${data.requests[idx].group_name}`
    });
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(`已${approvedQty!==data.requests[idx].qty_requested?'修改批核':'批准'}，已通知提交人 (再登入時彈出)`,'success');
    this.refreshSuppliesViews();
  }
,
  rejectSupplyRequest(requestId){
    if(!this.canApproveArea('supplies')) return;
    const data=this.getSuppliesData();
    const idx=data.requests.findIndex(r=>r.request_id===requestId);
    if(idx<0) return;
    if(!this.applicationReadyForApproval(data.requests[idx])){ showToast('須先完成本組確認','warning'); return; }
    data.requests[idx].status='rejected';
    data.requests[idx].approved_by=this.currentUser?.name||'';
    data.requests[idx].approved_at=new Date().toISOString();
    data.requests[idx].notes='已拒絕';
    this.saveSuppliesData(data);
    const targetId=data.requests[idx].requested_by_id||data.requests[idx].requested_by;
    this.addSupplyNotification(targetId, {
      type:'supply_approved',
      item_name:data.requests[idx].item_name,
      qty_requested:data.requests[idx].qty_requested,
      qty_approved:0,
      status:'rejected',
      approved_by:data.requests[idx].approved_by,
      approved_at:data.requests[idx].approved_at,
      message:`你的物資申請「${data.requests[idx].item_name}」已被拒絕，請聯絡 ${this.approvalRouteLabel('supplies','approver_groups')}`
    });
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已拒絕並通知提交人','warning');
    this.refreshSuppliesViews();
  }
,
  async deleteSupplyRequest(requestId){
    if(!this.isSuperAdmin()){ showToast('權限不足，無法永久刪除紀錄','error'); return; }
    if(!confirm('確定永久刪除此申請？APP、本機快取及後台紀錄都會刪除。')) return;
    this.markRecordDeleted('Supply_Requests',requestId);
    const data=this.getSuppliesData();
    data.requests=data.requests.filter(r=>r.request_id!==requestId);
    this.saveSuppliesData(data);
    const result=await this.deleteGasRecord('Supply_Requests',requestId);
    showToast(result.success?'已從 APP 及後台永久刪除':`APP 已隱藏，但後台刪除失敗：${result.error}` ,result.success?'warning':'error');
    this.refreshSuppliesViews();
    if(document.getElementById('view-approvals')&&!document.getElementById('view-approvals').classList.contains('hidden')) this.renderApprovalCenter();
  }
,
  openInventoryForm(supplyId=null){
    if(!this.isCoordinatorViceChair()){ showToast(`僅物資指定批核／執行組的總主任以上可管理總物資`,'error'); return; }
    const data=this.getSuppliesData();
    const existing=supplyId?data.inventory.find(i=>i.supply_id===supplyId):null;
    const title=existing?'編輯總物資':`新增總物資 (${this.approvalRouteLabel('supplies','executor_groups')})`;
    let html=`
      <input type="hidden" id="inv-form-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="inv-form-id" value="${existing?.supply_id||''}">
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2"><label class="text-[11px] font-bold">物資名稱 *</label><input id="inv-name" value="${escapeHtml(existing?.item_name||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">總數量 *</label><input type="number" id="inv-qty" value="${existing?.total_qty||''}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">單位</label><input id="inv-unit" value="${escapeHtml(existing?.unit||'個')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">分類</label><select id="inv-category" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1"><option value="營具" ${existing?.category==='營具'?'selected':''}>營具</option><option value="通訊" ${existing?.category==='通訊'?'selected':''}>通訊</option><option value="交通" ${existing?.category==='交通'?'selected':''}>交通</option><option value="音響" ${existing?.category==='音響'?'selected':''}>音響</option><option value="文具" ${existing?.category==='文具'?'selected':''}>文具</option><option value="其他" ${existing?.category==='其他'?'selected':''}>其他</option></select></div>
      </div>
    `;
    document.getElementById('record-modal-title').textContent=title;
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitInventoryForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitInventoryForm(){
    const mode=document.getElementById('inv-form-mode').value;
    const id=document.getElementById('inv-form-id').value;
    const name=document.getElementById('inv-name').value.trim();
    const qty=parseInt(document.getElementById('inv-qty').value);
    const unit=document.getElementById('inv-unit').value.trim()||'個';
    const category=document.getElementById('inv-category').value;
    if(!name||!qty){ showToast('請填寫名稱和數量','error'); return; }
    const data=this.getSuppliesData();
    if(mode==='edit'){
      const idx=data.inventory.findIndex(i=>i.supply_id===id);
      if(idx>=0) data.inventory[idx]={...data.inventory[idx], item_name:name, total_qty:qty, unit, category};
    }else{
      data.inventory.push({supply_id:'sup_'+Date.now(), item_name:name, total_qty:qty, unit, category, created_at:new Date().toISOString()});
    }
    this.saveSuppliesData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('總物資已保存','success');
    this.refreshSuppliesViews();
  }
,
  deleteInventory(supplyId){
    if(!this.isCoordinatorViceChair()) return;
    if(!confirm('確定刪除此總物資？')) return;
    const data=this.getSuppliesData();
    data.inventory=data.inventory.filter(i=>i.supply_id!==supplyId);
    this.saveSuppliesData(data);
    this.refreshSuppliesViews();
    showToast('已刪除總物資','warning');
  }
,
  downloadSuppliesTemplate(){
    const csv='item_name,total_qty,unit,category\n對講機 Walkie-Talkie,25,部,通訊\n大型戶外帳篷 (3x3m),10,個,營具\n車輛通行證,35,張,交通\n';
    const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='supplies_inventory_template.csv'; a.click(); showToast('已下載總物資範本','success');
  }
,
  handleSuppliesFileUpload(file){
    if(!this.isCoordinatorViceChair()){ showToast('只供指定物資批核／執行組總主任以上批量匯入','error'); return; }
    if(!file) return;
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const text=e.target.result;
        let parsed=[];
        if(file.name.endsWith('.json')){
          const json=JSON.parse(text);
          parsed=Array.isArray(json)?json:json.inventory||[json];
        }else{
          const rows=parseCSV(text);
          // Check if it's inventory or requests
          if(rows[0] && rows[0].item_name!==undefined && rows[0].total_qty!==undefined){
            // inventory
            parsed=rows.map(r=>({supply_id:'sup_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),item_name:r.item_name||'',total_qty:parseInt(r.total_qty||0),unit:r.unit||'個',category:r.category||'其他'})).filter(r=>r.item_name);
            const data=this.getSuppliesData();
            data.inventory=[...data.inventory,...parsed];
            this.saveSuppliesData(data);
            showToast(`已批量匯入 ${parsed.length} 項總物資`,'success');
            this.refreshSuppliesViews();
            return;
          }else{
            // requests
            parsed=rows.map(r=>({request_id:'req_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),item_name:r.item_name||r.item||'',qty_requested:parseInt(r.qty_requested||r.qty||0),unit:r.unit||'個',group_name:r.group_name||r.group||'',reason:r.reason||'',date_needed:r.date_needed||'',contact:r.contact||'',status:'pending',requested_by:r.requested_by||this.currentUser?.name||'',requested_by_id:this.currentUser?.user_id||'',created_at:new Date().toISOString()})).filter(r=>r.item_name);
            const data=this.getSuppliesData();
            data.requests=[...data.requests,...parsed];
            this.saveSuppliesData(data);
            showToast(`已批量匯入 ${parsed.length} 筆物資申請`,'success');
            this.refreshSuppliesViews();
            return;
          }
        }
      }catch(err){ showToast('解析失敗:'+err.message,'error'); }
    };
    reader.readAsText(file);
  }
,
  exportSuppliesData(){
    const canSup=this.canApproveArea('supplies')||this.canExecuteArea('supplies');
    const canVeh=this.canApproveArea('vehicle')||this.canExecuteArea('vehicle');
    if(!canSup&&!canVeh){ showToast('只供指定物資／車輛批核或執行組匯出','error'); return; }
    const source=this.getSuppliesData();
    const data={inventory:canSup?(source.inventory||[]):[],requests:canSup?(source.requests||[]):[],vehicle_passes:canVeh?(source.vehicle_passes||[]):[]};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`supplies_${todayISO()}.json`; a.click(); showToast('已匯出物資／車輛 JSON','success');
  },
  addSupplyRow(){
    const container=document.getElementById('supply-rows');
    if(!container) return;
    const row=document.createElement('div');
    row.className='supply-row border rounded-xl p-3 bg-slate-50 space-y-2 relative';
    row.innerHTML=`<button type="button" onclick="this.parentElement.remove()" class="absolute top-2 right-2 text-rose-600 text-[10px] font-bold">刪除這項</button><div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div class="col-span-2"><label class="text-[11px] font-bold">物資名稱 *</label><input class="supply-item w-full px-3 py-2 border rounded-xl text-sm mt-1" required placeholder="輸入物資名稱"></div><div><label class="text-[11px] font-bold">申請數量 *</label><input type="number" class="supply-qty w-full px-3 py-2 border rounded-xl text-sm mt-1" required min="1"></div><div><label class="text-[11px] font-bold">單位</label><input class="supply-unit w-full px-3 py-2 border rounded-xl text-sm mt-1" value="個"></div><div><label class="text-[11px] font-bold">所屬組別 *</label><input class="supply-group w-full px-3 py-2 border rounded-xl text-sm mt-1" required value="${escapeHtml(this.currentUser?.group_name||'')}"></div><div class="col-span-2"><label class="text-[11px] font-bold">申請原因/用途</label><textarea class="supply-reason w-full px-3 py-2 border rounded-xl text-sm mt-1" rows="2" placeholder="特別要求才填寫（可選）"></textarea></div><div><label class="text-[11px] font-bold">聯絡電話</label><input class="supply-contact w-full px-3 py-2 border rounded-xl text-sm mt-1" placeholder="方便協調"></div></div>`;
    container.appendChild(row);
  },
  renderSuppliesBooth(){
    const container=document.getElementById('supplies-tab-booth'); if(!container) return;
    const data=this.getSuppliesData();
    const list=(data.booth_requests||[]).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    const canSubmit=this.canSubmitSupply();
    const isAdmin=this.isAdmin();
    const isCoordinator=this.isCoordinatorViceChair();
    container.innerHTML=`<div class="space-y-4"><div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px]"><b>攤位物資申請（與外判商租用）</b>：與「地域物資借用」分開，申請攤位所需物資（如枱、椅、布置等）。低於總主任先由本組總主任以上確認，再交批核組。</div><div class="flex gap-2">${canSubmit?`<button onclick="app.openBoothSupplyForm()" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>提交攤位物資申請</button>`:''}${(isCoordinator||isAdmin)?`<button onclick="app.exportBoothData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button>`:''}</div><div class="space-y-3">${list.length?list.map(r=>`<div class="border rounded-xl p-3 bg-white"><div class="flex justify-between"><b class="text-[13px]">${escapeHtml(r.item_name||'')}</b><span class="text-[10px] px-2 py-0.5 rounded-full border ${r.status==='pending'?'bg-amber-100 text-amber-700':r.status==='approved'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}">${r.status==='pending'?'待批核':r.status==='approved'?'已批核':'已拒絕'}</span><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(r.group_name||'')}</span></div><div class="text-[11px] text-slate-500 mt-1">數量: ${r.qty_requested||0} ${escapeHtml(r.unit||'個')} | 申請人: ${escapeHtml(r.requested_by||'')} | 聯絡: ${escapeHtml(r.contact||'-')}</div><div class="text-[11px] text-slate-500">用途: ${escapeHtml(r.purpose||r.reason||'-')}</div></div>`).join(''):`<p class="text-xs text-slate-400 py-8 text-center">暫無攤位物資申請</p>`}</div></div>`;
  },
  openBoothSupplyForm(editId=null){
    if(!this.canSubmitSupply()){ showToast('請先登入後提交','error'); this.openLoginModal(); return; }
    const data=this.getSuppliesData();
    const existing=editId?data.booth_requests.find(r=>r.request_id===editId):null;
    const title=existing?'編輯攤位物資申請':'提交攤位物資申請';
    let html=`<input type="hidden" id="booth-form-mode" value="${existing?'edit':'create'}"><input type="hidden" id="booth-form-id" value="${existing?.request_id||''}"><div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div class="col-span-2"><label class="text-[11px] font-bold">物資名稱 *</label><input id="booth-item-name" value="${escapeHtml(existing?.item_name||'')}" required placeholder="攤位所需物資（如枱、椅、布、燈等）" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">申請數量 *</label><input type="number" id="booth-qty" value="${existing?.qty_requested||''}" required min="1" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">單位</label><input id="booth-unit" value="${escapeHtml(existing?.unit||'個')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">所屬組別 *</label><input id="booth-group" value="${escapeHtml(existing?.group_name||this.currentUser?.group_name||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div class="col-span-2"><label class="text-[11px] font-bold">用途 / 與外判商說明</label><textarea id="booth-purpose" rows="2" placeholder="說明租用用途、外判商要求等" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.purpose||existing?.reason||'')}</textarea></div><div><label class="text-[11px] font-bold">聯絡電話</label><input id="booth-contact" value="${escapeHtml(existing?.contact||'')}" placeholder="方便協調" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">提交人</label><input id="booth-requested-by" value="${escapeHtml(existing?.requested_by||this.currentUser?.name||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1 bg-slate-50" readonly></div></div><div class="text-[10px] text-slate-500 mt-2">低於總主任提交會先交本組總主任以上確認，再交指定批核組。</div>`;
    document.getElementById('record-modal-title').textContent=title;
    document.getElementById('record-form-fields').innerHTML=html;
    document.getElementById('record-form').onsubmit=(e)=>{ e.preventDefault(); this.submitBoothSupplyForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  },
  submitBoothSupplyForm(){
    const mode=document.getElementById('booth-form-mode').value;
    const id=document.getElementById('booth-form-id').value;
    const item_name=document.getElementById('booth-item-name').value.trim();
    const qty=parseInt(document.getElementById('booth-qty').value);
    const unit=document.getElementById('booth-unit').value.trim()||'個';
    let group_name=document.getElementById('booth-group').value.trim();
    if(this.roleLevel(this.currentUser?.role)<40) group_name=normalizeGroupName(this.currentUser?.group_name);
    const purpose=document.getElementById('booth-purpose').value.trim()||'';
    const contact=document.getElementById('booth-contact').value.trim()||'';
    const requested_by=document.getElementById('booth-requested-by').value.trim()||this.currentUser?.name||'';
    if(!item_name||!qty||!group_name){ showToast('請填寫物資名稱、數量、組別','error'); return; }
    if(isNaN(qty)||qty<1){ showToast('數量須大於0','error'); return; }
    const data=this.getSuppliesData();
    if(mode==='edit'){
      const idx=data.booth_requests.findIndex(r=>r.request_id===id);
      if(idx>=0){
        const confirmation=this.applicationConfirmationMeta(this.currentUser);
        data.booth_requests[idx]={...data.booth_requests[idx],...confirmation,item_name,qty_requested:qty,unit,group_name,purpose,contact,requested_by,requested_by_id:this.currentUser?.user_id||'',status:'pending',approved_by:'',approved_at:''};
      }
    }else{
      data.booth_requests.push({
        request_id:'req_booth_'+Date.now(),
        event_id:this.currentEvent?.event_id||'isd_2026',
        item_name,qty_requested:qty,qty_approved:null,unit,group_name,purpose,contact,
        ...this.applicationConfirmationMeta(this.currentUser),
        status:'pending',requested_by,requested_by_id:this.currentUser?.user_id||'',approved_by:'',approved_at:'',notes:'',created_at:new Date().toISOString()
      });
    }
    this.saveSuppliesData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新攤位物資申請':'已提交攤位物資申請：待本組總主任確認','success');
    this.refreshSuppliesViews();
  },
  exportBoothData(){
    const data=this.getSuppliesData();
    const blob=new Blob([JSON.stringify(data.booth_requests||[],null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='booth_requests.json'; a.click(); showToast('已匯出攤位申請','success');
  }
,
});
