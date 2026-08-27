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
      // v8.6：保留「2026 攤位總表」欄位（分區／編號／負責單位／招牌名／運送及其他需求）——
      // 舊映射漏了這批欄位，令 JSON／後端載入的攤位申請顯示唔到攤位資料
      zone:r.zone||'',
      booth_no:r.booth_no||'',
      booth_code:r.booth_code||'',
      unit_name:r.unit_name||'',
      booth_name:r.booth_name||'',
      delivery:r.delivery||'',
      other_need:r.other_need||'',
      created_at:r.created_at||'',
      // v8.7：攤位計劃書欄位（對標主題節目組 Google Form）
      activity_desc:r.activity_desc||'',
      fif15_content:r.fif15_content||'',
      qty_tent:parseInt(r.qty_tent||0),
      qty_table:parseInt(r.qty_table||0),
      qty_chair:parseInt(r.qty_chair||0),
      skirting_qty:parseInt(r.skirting_qty||0),
      power_w:parseInt(r.power_w||0),
      other_req:r.other_req||r.other_need||'',
      owner_name:r.owner_name||'',
      owner_age_group:r.owner_age_group||'',
      owner_unit:r.owner_unit||'',
      owner_position:r.owner_position||'',
      owner_phone:r.owner_phone||'',
      owner_email:r.owner_email||'',
      extra_items:Array.isArray(r.extra_items)?r.extra_items.map(it=>({item_name:it.item_name||'',qty_requested:parseInt(it.qty_requested||0),unit:it.unit||'個'})):[]
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
      // Save booth plans (v8.7 攤位計劃書)
      (data.booth_requests||[]).forEach(r=>{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Booth_Requests',record:{request_id:r.request_id,event_id:r.event_id,item_name:r.item_name,qty_requested:r.qty_requested,qty_approved:r.qty_approved,unit:r.unit,group_name:r.group_name,zone:r.zone||'',booth_no:r.booth_no||'',booth_code:r.booth_code||'',unit_name:r.unit_name||'',booth_name:r.booth_name||'',activity_desc:r.activity_desc||'',fif15_content:r.fif15_content||'',qty_tent:r.qty_tent||0,qty_table:r.qty_table||0,qty_chair:r.qty_chair||0,skirting_qty:r.skirting_qty||0,power_w:r.power_w||0,other_req:r.other_req||'',other_need:r.other_need||'',delivery:r.delivery||'',owner_name:r.owner_name||'',owner_age_group:r.owner_age_group||'',owner_unit:r.owner_unit||'',owner_position:r.owner_position||'',owner_phone:r.owner_phone||'',owner_email:r.owner_email||'',extra_items_json:JSON.stringify(r.extra_items||[]),contact:r.contact||'',status:r.status,requested_by:r.requested_by||'',requested_by_id:r.requested_by_id||'',approved_by:r.approved_by||'',approved_at:r.approved_at||'',requester_role:r.requester_role||'',group_confirmation_status:r.group_confirmation_status||'',group_confirmed_by:r.group_confirmed_by||'',group_confirmed_at:r.group_confirmed_at||'',notes:r.notes||'',created_at:r.created_at||''}})}).catch(()=>{});
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
    if(!this.suppliesSubTab||this.suppliesSubTab==='booth') this.suppliesSubTab='requests'; // v8.6：攤位已獨立成卡，舊「booth」頁籤值回退
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
          <b>📦 物資申請（地域物資借用）：</b><br>
          • 所有登入成員可提交；低於總主任提交的申請先由本組總主任以上確認<br>
          • 目前由 ${escapeHtml(this.approvalRouteLabel('supplies','approver_groups'))} 批核／修改，批准後交 ${escapeHtml(this.approvalRouteLabel('supplies','executor_groups'))} 執行及查看最後名單<br>
          • 一次可申請多項物資：每項只填名稱及數量，組別／電話／原因整張申請只填一次<br>
          • <b>與「攤位計劃書」完全獨立：</b>攤位嘅帳篷／摺枱／摺椅等（向外判商租用）喺獨立卡片處理（對標 2026 攤位總表＋總表匯總），兩類申請互不混雜、互不影響<br>
          • <b>不設庫存表：</b>地域物資逾萬種，毋須對照庫存（原「庫存」分頁已移除）
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchSuppliesTab('my')" class="tab-btn ${this.suppliesSubTab==='my'?'active':''}"><i class="fa-solid fa-user mr-1"></i> 我的申請 (${myRequests.length})</button>
          ${(this.canApproveArea('supplies')||this.canExecuteArea('supplies')||isAdmin||isCoordinator)?`
          <button onclick="app.switchSuppliesTab('requests')" class="tab-btn ${this.suppliesSubTab==='requests'?'active':''}"><i class="fa-solid fa-list mr-1"></i> 全部清單 (${data.requests.length})</button>
          <button onclick="app.switchSuppliesTab('pending')" class="tab-btn ${this.suppliesSubTab==='pending'?'active':''}"><i class="fa-solid fa-hourglass-half mr-1"></i> 待批核 (${pendingRequests.length})</button>
          <button onclick="app.switchSuppliesTab('checklist')" class="tab-btn ${this.suppliesSubTab==='checklist'?'active':''}"><i class="fa-solid fa-clipboard-check mr-1"></i> 物資Check List</button>
          <button onclick="app.switchSuppliesTab('stats')" class="tab-btn ${this.suppliesSubTab==='stats'?'active':''}"><i class="fa-solid fa-chart-column mr-1"></i> 統計</button>
          <button onclick="app.switchSuppliesTab('notifications')" class="tab-btn ${this.suppliesSubTab==='notifications'?'active':''}"><i class="fa-solid fa-bell mr-1"></i> 通知</button>
          `:''}
        </div>
        <div id="supplies-tab-requests" class="${this.suppliesSubTab==='requests'?'':'hidden'}"></div>
        <div id="supplies-tab-my" class="${this.suppliesSubTab==='my'?'':'hidden'}"></div>
        <div id="supplies-tab-pending" class="${this.suppliesSubTab==='pending'?'':'hidden'}"></div>
        <div id="supplies-tab-checklist" class="${this.suppliesSubTab==='checklist'?'':'hidden'}"></div>
        <div id="supplies-tab-notifications" class="${this.suppliesSubTab==='notifications'?'':'hidden'}"></div>
        <div id="supplies-tab-stats" class="${this.suppliesSubTab==='stats'?'':'hidden'}"></div>
      </div>
    `;
    if(this.suppliesSubTab==='requests' && !(this.canApproveArea('supplies')||this.canExecuteArea('supplies')||isAdmin)) this.suppliesSubTab='my';
    
    this.renderSuppliesRequests();
    this.renderSuppliesMy();
    this.renderSuppliesPending();
    this.renderSuppliesChecklist();
    this.renderSuppliesNotifications();
    this.renderSuppliesStats();
    // Update module-actions
    const actionsEl=document.getElementById('module-actions');
    if(actionsEl){
      actionsEl.innerHTML=`
        <div class="flex gap-2 flex-wrap">
          ${canSubmit?`<button onclick="app.openSupplyRequestForm()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>提交物資申請</button>`:''}
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
    // 按物資統計（物資逾萬種，不設庫存對照）
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
          <h4 class="font-bold text-[13px] mb-2"><i class="fa-solid fa-boxes-stacked text-blue-600 mr-2"></i>按物資統計（不設庫存對照）</h4>
          <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">物資</th><th class="px-2 py-1 text-right">申請筆數</th><th class="px-2 py-1 text-right">申請總數</th><th class="px-2 py-1 text-right">待批</th><th class="px-2 py-1 text-right">已批核</th></tr></thead><tbody class="divide-y">${Object.keys(byItem).sort().map(it=>{
            const s=byItem[it];
            return `<tr><td class="px-2 py-1 font-medium" data-label="物資">${escapeHtml(it)}</td><td class="px-2 py-1 text-right" data-label="筆數">${s.count}</td><td class="px-2 py-1 text-right" data-label="申請">${s.requested}</td><td class="px-2 py-1 text-right text-amber-700" data-label="待批">${s.pending}</td><td class="px-2 py-1 text-right text-emerald-700" data-label="已批">${s.approved}</td></tr>`;
          }).join('') || '<tr><td colspan="5" class="px-2 py-4 text-center text-slate-400">暫無物資申請</td></tr>'}</tbody></table></div>
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
    // v8.6：每項物資只填「名稱＋數量（＋單位）」；組別／聯絡電話／申請原因是整張申請共用的，只填一次。
    // （電話自動載入登記資料／上次填寫，唔使借十樣嘢填十次。）
    const canEditGroup=this.roleLevel(this.currentUser?.role)>=40||this.isAdmin();
    const rowHTML=(r)=>`<div class="supply-row border rounded-xl p-3 bg-slate-50 space-y-2 relative">
          <button type="button" onclick="if(document.querySelectorAll('.supply-row').length>1)this.parentElement.remove();else showToast('至少保留一項物資','warning')" class="absolute top-2 right-2 text-rose-600 text-[10px] font-bold">刪除這項</button>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="col-span-2"><label class="text-[11px] font-bold">物資名稱 *</label><input class="supply-item w-full px-3 py-2 border rounded-xl text-sm mt-1" required placeholder="輸入物資名稱" value="${escapeHtml(r?.item_name||'')}"></div>
            <div><label class="text-[11px] font-bold">申請數量 *</label><input type="number" class="supply-qty w-full px-3 py-2 border rounded-xl text-sm mt-1" required min="1" value="${r?.qty_requested||''}"></div>
            <div><label class="text-[11px] font-bold">單位</label><input class="supply-unit w-full px-3 py-2 border rounded-xl text-sm mt-1" value="${escapeHtml(r?.unit||'個')}"></div>
          </div>
        </div>`;
    let html=`
      <input type="hidden" id="supply-form-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="supply-form-id" value="${existing?.request_id||''}">
      <div class="bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-[10.5px] text-sky-900 mb-3 leading-relaxed"><b>一次過申請多項物資：</b>每項只需填「物資名稱＋數量」，按「增加一項物資」繼續加；<b>組別／電話／原因屬整張申請，只填一次</b>。</div>
      <div id="supply-rows" class="space-y-3">
        ${rowHTML(existing)}
      </div>
      <div class="text-right mt-1"><button type="button" onclick="app.addSupplyRow()" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-plus mr-1"></i>增加一項物資（只填名稱及數量）</button></div>
      <div class="border rounded-xl p-3 bg-white mt-3"><b class="text-[11px]">是次申請共通資料（只填一次，套用以上每一項）</b>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div><label class="text-[11px] font-bold">所屬組別 *</label><input id="supply-shared-group" class="w-full px-3 py-2 border rounded-xl text-sm mt-1 ${canEditGroup?'':'bg-slate-100'}" ${canEditGroup?'':'readonly'} required value="${escapeHtml(existing?.group_name||this.currentUser?.group_name||'')}"><div class="text-[9.5px] text-slate-400 mt-0.5">${canEditGroup?'管理層／總主任以上可代其他組別填寫':'已自動填入你的組別，無需更改'}</div></div>
          <div><label class="text-[11px] font-bold">聯絡電話</label><input id="supply-shared-contact" class="w-full px-3 py-2 border rounded-xl text-sm mt-1" placeholder="方便協調" value="${escapeHtml(existing?.contact||this.myDefaultContact())}"></div>
          <div class="col-span-2"><label class="text-[11px] font-bold">申請原因/用途（整張申請適用）</label><textarea id="supply-shared-reason" class="w-full px-3 py-2 border rounded-xl text-sm mt-1" rows="2" placeholder="特別要求才填寫（可選）">${escapeHtml(existing?.reason||'')}</textarea></div>
        </div>
      </div>
      <div class="text-[10px] text-slate-500 mt-2">低於總主任提交會先交本組總主任以上確認，再由 ${escapeHtml(this.approvalRouteLabel('supplies','approver_groups'))} 批核，最後交 ${escapeHtml(this.approvalRouteLabel('supplies','executor_groups'))} 執行。</div>
    `;
    document.getElementById('record-modal-title').textContent=title;
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitSupplyRequestForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  // v8.6：申請表「聯絡電話」預設值＝登入資料／聯絡表登記電話（避免每項重複填）
  myDefaultContact(){
    try{
      const u=this.currentUser||{};
      if(u.contact||u.phone) return String(u.contact||u.phone);
      const name=String(u.name||'').trim();
      if(name){ const hit=(this.getStaffData().contacts||[]).find(c=>String(c.name||'').trim()===name&&c.contact); if(hit) return String(hit.contact); }
    }catch(e){}
    return '';
  }
,
  submitSupplyRequestForm(){
    const mode=document.getElementById('supply-form-mode').value;
    const id=document.getElementById('supply-form-id').value;
    const data=this.getSuppliesData();
    const requested_by=(document.getElementById('supply-requested-by')?.value.trim()||this.currentUser?.name||'');
    // v8.6：組別／電話／原因屬整張申請（只填一次），套用於每項物資
    let group_name=(document.getElementById('supply-shared-group')?.value||'').trim();
    if(this.roleLevel(this.currentUser?.role)<40) group_name=normalizeGroupName(this.currentUser?.group_name);
    const contact=(document.getElementById('supply-shared-contact')?.value||'').trim();
    const reason=(document.getElementById('supply-shared-reason')?.value||'').trim();
    if(!group_name){ showToast('請填寫所屬組別','error'); return; }
    if(mode==='edit'){
      const row=document.querySelector('.supply-row');
      if(!row){ showToast('表單無效','error'); return; }
      const item_name=row.querySelector('.supply-item').value.trim();
      const qty_str=row.querySelector('.supply-qty').value;
      const qty=parseInt(qty_str||'0');
      const unit=row.querySelector('.supply-unit').value.trim()||'個';
      if(!item_name||!qty_str){ showToast('請填寫物資名稱及數量','error'); return; }
      if(isNaN(qty)||qty<1){ showToast('數量須為大於0的整數','error'); return; }
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
        if(!item_name||!qty_str){ showToast('第'+(i+1)+'項：請填寫物資名稱及數量','error'); return; }
        if(isNaN(qty)||qty<1){ showToast('第'+(i+1)+'項：數量須為大於0的整數','error'); return; }
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
        <div><label class="text-[11px] font-bold">批核備註</label><textarea id="approve-notes" rows="2" placeholder="例如：只批5個，或已修改為..." class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></textarea></div>
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
    // v8.6：新增一項只填「物資名稱＋數量（＋單位）」；組別／電話／原因是整張申請共用的，不需要重複填
    const container=document.getElementById('supply-rows');
    if(!container) return;
    const row=document.createElement('div');
    row.className='supply-row border rounded-xl p-3 bg-slate-50 space-y-2 relative';
    row.innerHTML=`<button type="button" onclick="if(document.querySelectorAll('.supply-row').length>1)this.parentElement.remove();else showToast('至少保留一項物資','warning')" class="absolute top-2 right-2 text-rose-600 text-[10px] font-bold">刪除這項</button><div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div class="col-span-2"><label class="text-[11px] font-bold">物資名稱 *</label><input class="supply-item w-full px-3 py-2 border rounded-xl text-sm mt-1" required placeholder="輸入物資名稱"></div><div><label class="text-[11px] font-bold">申請數量 *</label><input type="number" class="supply-qty w-full px-3 py-2 border rounded-xl text-sm mt-1" required min="1"></div><div><label class="text-[11px] font-bold">單位</label><input class="supply-unit w-full px-3 py-2 border rounded-xl text-sm mt-1" value="個"></div></div>`;
    container.appendChild(row);
  },
  // ═══ 攤位計劃書：獨立模組卡片（與地域「物資申請」完全分開；v8.6 起公開——任何人無需登入可填）═══
  // v8.7：由「攤位物資申請」升級為「攤位計劃書」——表單對標主題節目組「港島童軍繽紛日2026 - 主題節目攤位計劃書」
  // Google Form（攤位活動內容／「十五五」主題／帳篷／摺枱／摺椅／負責人資料），並新增「總表」頁籤：
  // 按「2026 攤位總表」分區＋編號匯總所有計劃書——上面 TOTAL 總數（例：TOTAL 50 BOOTH 100 CHAIR），
  // 下面每個攤位一行明細（例：其中 A01 2 BOOTH 4 CHAIR）；未提交嘅攤位總表顯示「未提交」。
  // ═══ 攤位計劃書：獨立模組卡片（與地域「物資申請」完全分開；v8.6 起公開——任何人無需登入可填）═══
  // v8.8：填完計劃書後資料分兩部分——
  //   ① 本卡＝「借用統計」（像物資卡）：要借什麼（TOTAL＋每攤位＋每項）＋招牌統計＋計劃書明細（確認／批核）
  //   ② 「執行手冊 → 攤位總表」（公開）：完整 2026 攤位總表（已聯絡/已回覆/確認出席＋負責單位＋招牌＋內容＋十五五＋物資）
  // 主題節目組卡片另有「攤位資料(Drive)／攤位總表／借用統計」三個頁籤。
  // ═══ 攤位計劃書：獨立模組卡片（與地域「物資申請」完全分開；v8.6 起公開——任何人無需登入可填）═══
  // v8.8：填完計劃書後資料分兩部分——
  //   ① 本卡＝「借用統計」（像物資卡）：要借什麼（TOTAL＋每攤位＋每項）＋招牌統計＋計劃書明細（確認／批核）
  //   ② 「執行手冊 → 攤位總表」（公開）：完整 2026 攤位總表（已聯絡/已回覆/確認出席＋負責單位＋招牌＋內容＋十五五＋物資）
  // 主題節目組卡片另有「攤位資料(Drive)／攤位總表／借用統計」三個頁籤。
  renderBoothModule(){
    const container=document.getElementById('module-content'); if(!container) return;
    const data=this.getSuppliesData();
    const plans=data.booth_requests||[];
    if(!this.boothSubTab||!['borrow','sign','list'].includes(this.boothSubTab)) this.boothSubTab='borrow';
    const agg=this.boothPlanAggregates(plans);
    const isPublic=!this.currentUser;
    const isAdmin=this.isAdmin();
    const isCoordinator=this.isCoordinatorViceChair();
    const canExport=(isAdmin||isCoordinator);
    const chip=(v,l,cls)=>`<div class="${cls} rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold">${v}</div><div class="text-[10px]">${l}</div></div>`;
    const t=agg.totals;
    const tabBtn=(id,label)=>`<button onclick="app.switchBoothTab('${id}')" class="px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap ${this.boothSubTab===id?'bg-white shadow text-slate-900':'text-slate-500'}">${label}</button>`;
    container.innerHTML=`<div class="space-y-4">
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900"><b>攤位計劃書（取代 Google Form——未登入嘅負責人直接喺呢度填寫）</b>：提交後籌辦方即得<b>兩種資料</b>——① 本卡＝<b>借用統計</b>（要借什麼：帳篷／摺枱／摺椅等＋招牌統計，像物資卡）；② <b>「執行手冊 → 攤位總表」</b>（自動填入嘅完整總表，含已聯絡／已回覆／確認出席及計劃內容；主題節目組卡片亦有）。分區／編號／負責單位按總表選擇；攤位名稱、活動內容、「十五五」主題及負責人資料由申請人填寫；帳篷（3mW x 3mD）、摺枱、摺椅只需填數量，不設庫存。<b class="text-emerald-700">全公開：任何人無需登入都可填寫</b>。${isPublic?'負責人電話／電郵需登入先見到。':''}</div>
      <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 max-w-2xl">${chip(t.booths,'有計劃書攤位','bg-slate-100 text-slate-700 border')}${chip(t.tent,'TOTAL 帳篷(頂)','bg-orange-50 text-orange-700 border border-orange-200')}${chip(t.table,'TOTAL 摺枱(張)','bg-sky-50 text-sky-700 border border-sky-200')}${chip(t.chair,'TOTAL 摺椅(張)','bg-emerald-50 text-emerald-700 border border-emerald-200')}${chip(t.skirting,'TOTAL 帳篷圍布(塊)','bg-violet-50 text-violet-700 border border-violet-200')}${chip(t.power_w,'TOTAL 電源(W)','bg-rose-50 text-rose-700 border border-rose-200')}</div>
      <div class="flex gap-2 flex-wrap items-center">
        <div class="inline-flex bg-slate-100 rounded-xl p-1 overflow-x-auto max-w-full">${tabBtn('borrow','📊 借用統計（要借什麼）')}${tabBtn('sign','🪧 招牌統計')}${tabBtn('list',`📄 計劃書明細（${plans.length}）`)}</div>
        <button onclick="app.openBoothSupplyForm()" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>提交攤位計劃書${isPublic?'（無需登入）':''}</button>
        ${canExport?`<button onclick="app.exportBoothCSV()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>匯出總表 CSV</button><button onclick="app.exportBoothData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button>`:''}
        <button onclick="app.openModule('exec_manual'); setTimeout(()=>app.switchExecManualTab('booth_master'),200)" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-table-cells mr-1"></i>執行手冊 → 攤位總表</button>
      </div>
      <div id="booth-tab-content">${this.boothSubTab==='list'?this.renderBoothPlanListHTML(isPublic):(this.boothSubTab==='sign'?this.renderBoothSignboardHTML(isPublic):this.renderBoothBorrowStatsHTML(agg,isPublic))}</div>
    </div>`;
    const actionsEl=document.getElementById('module-actions');
    if(actionsEl){
      actionsEl.innerHTML=`<div class="flex gap-2 flex-wrap"><button onclick="app.openBoothSupplyForm()" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-store mr-1"></i>提交攤位計劃書</button>${canExport?`<button onclick="app.exportBoothCSV()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出總表 CSV</button>`:''}<button onclick="app.openModule('exec_manual'); setTimeout(()=>app.switchExecManualTab('booth_master'),200)" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold">執行手冊 → 攤位總表</button></div>`;
    }
  },
  switchBoothTab(tab){ this.boothSubTab=tab; this.renderBoothModule(); },
  // 攤位計劃書：v8.6 起公開——任何人（無需登入）都可填寫；地域物資借用則需登入
  canSubmitBooth(){ return true; },
  /* —— 總表統計：把所有「攤位計劃書」紀錄按「2026 攤位總表」分區＋編號合併 ——
     兼容舊版「一項一紀錄」（item_name＝枱／椅／帳篷圍布／電源）：同一攤位多筆紀錄合併為同一行。 */
  boothEquipOf(r){
    const e={tent:0,table:0,chair:0,skirting:0,power_w:0,other:[]};
    if(!r) return e;
    const KEY2EQ={'qty_tent':'tent','qty_table':'table','qty_chair':'chair','skirting_qty':'skirting','power_w':'power_w'};
    const addFromName=(name,qty)=>{
      const k=BOOTH_ITEM_KEY_MAP[String(name||'').trim()];
      if(k){ const p=KEY2EQ[k]; if(p) e[p]+=qty; }
      else if(String(name||'').trim()&&String(name||'').trim()!=='攤位計劃書'){ e.other.push(`${name} × ${qty}${r.unit||''}`); }
    };
    e.tent+=parseInt(r.qty_tent||0)||0;
    e.table+=parseInt(r.qty_table||0)||0;
    e.chair+=parseInt(r.qty_chair||0)||0;
    e.skirting+=parseInt(r.skirting_qty||0)||0;
    e.power_w+=parseInt(r.power_w||0)||0;
    addFromName(r.item_name,parseInt(r.qty_requested||0)||0);
    (r.extra_items||[]).forEach(it=>{
      const k=BOOTH_ITEM_KEY_MAP[String(it.item_name||'').trim()];
      const qty=parseInt(it.qty_requested||0)||0;
      if(k){ const p=KEY2EQ[k]; if(p) e[p]+=qty; }
      else if(it.item_name){ e.other.push(`${it.item_name} × ${qty}${it.unit||''}`); }
    });
    return e;
  },
  boothPlanAggregates(plans){
    const rows={}; const totals={booths:0,tent:0,table:0,chair:0,skirting:0,power_w:0};
    (plans||[]).forEach(r=>{
      const key=(r.zone&&r.booth_no)?`${r.zone}${r.booth_no}`:(r.unit_name||'__custom__'+String(r.booth_code||Math.random()));
      let row=rows[key];
      if(!row){
        row={key, zone:r.zone||'', booth_no:r.booth_no||'', booth_code:r.booth_code||'',
          unit_name:r.unit_name||'', booth_name:r.booth_name||'', activity_desc:r.activity_desc||'', fif15_content:r.fif15_content||'',
          other_req:r.other_req||'', delivery:r.delivery||'', group_name:r.group_name||'', contact:r.contact||'',
          owner_name:r.owner_name||'', owner_age_group:r.owner_age_group||'', owner_unit:r.owner_unit||'', owner_position:r.owner_position||'',
          owner_phone:r.owner_phone||'', owner_email:r.owner_email||'',
          requested_by:r.requested_by||'', status:'', notes:r.notes||'',
          equip:{tent:0,table:0,chair:0,skirting:0,power_w:0,other:[]}};
        rows[key]=row;
      }
      ['unit_name','booth_name','activity_desc','fif15_content','other_req','delivery','group_name','contact','owner_name','owner_age_group','owner_unit','owner_position','owner_phone','owner_email','requested_by','notes'].forEach(f=>{ if(!row[f]&&r[f]) row[f]=r[f]; });
      if(r.booth_code&&!row.booth_code) row.booth_code=r.booth_code;
      if(!row.status) row.status=r.status;
      if(r.status==='pending') row.status='pending';
      const e=this.boothEquipOf(r);
      totals.tent+=e.tent; totals.table+=e.table; totals.chair+=e.chair; totals.skirting+=e.skirting; totals.power_w+=e.power_w;
      row.equip.tent+=e.tent; row.equip.table+=e.table; row.equip.chair+=e.chair; row.equip.skirting+=e.skirting; row.equip.power_w+=e.power_w;
      row.equip.other.push(...e.other);
    });
    totals.booths=Object.keys(rows).length;
    return {rows,totals};
  },
  boothStatusBadge(st){
    const cls=st==='pending'?'bg-amber-100 text-amber-700 border-amber-200':(st==='rejected'?'bg-rose-100 text-rose-700 border-rose-200':(st==='modified'?'bg-sky-100 text-sky-700 border-sky-200':'bg-emerald-100 text-emerald-700 border-emerald-200'));
    const label={pending:'待批核',approved:'已批核',rejected:'已拒絕',modified:'已批核(修改)',group_ok:'待批核'}[st]||st;
    return `<span class="text-[9.5px] px-1.5 py-0.5 rounded-full border font-bold whitespace-nowrap ${cls}">${label}</span>`;
  },
  /* —— 總表：按 2026 攤位總表 分區＋編號逐攤位一行；頂部 TOTAL 總數、每行即該攤位明細 —— */
  /* —— 借用統計（像物資卡）：要借什麼——每項統計＋每攤位明細＋TOTAL —— */
  renderBoothBorrowStatsHTML(agg,isPublic){
    const rows=Object.values(agg.rows).sort((a,b)=>String(a.key).localeCompare(String(b.key)));
    const codeOf=r=>[r.zone,r.booth_no].filter(Boolean).join('')||r.booth_code||r.unit_name||r.key;
    const itemStat=(key,label,unit,total)=>{
      const codes=rows.filter(r=>r.equip[key]>0).map(codeOf).sort();
      return `<tr><td class="border px-2 py-1 font-bold">${label}</td><td class="border px-2 py-1 text-center font-extrabold text-[13px]">${total}</td><td class="border px-2 py-1">${unit}</td><td class="border px-2 py-1 text-[10px] text-slate-500">${codes.length?codes.join('、'):'—'}</td></tr>`;
    };
    const q=v=>v?`<b>${v}</b>`:'<span class="text-slate-300">—</span>';
    const boothRows=rows.map(r=>{
      const other=[];
      (r.equip.other||[]).forEach(x=>other.push(x));
      return `<tr><td class="border px-2 py-1 font-mono font-extrabold whitespace-nowrap">${escapeHtml(codeOf(r))}</td><td class="border px-2 py-1">${escapeHtml(r.unit_name||'-')}</td><td class="border px-2 py-1 font-bold">${escapeHtml(r.booth_name||'-')}</td><td class="border px-2 py-1 text-center">${q(r.equip.tent)}</td><td class="border px-2 py-1 text-center">${q(r.equip.table)}</td><td class="border px-2 py-1 text-center">${q(r.equip.chair)}</td><td class="border px-2 py-1 text-center">${q(r.equip.skirting)}</td><td class="border px-2 py-1 text-center">${r.equip.power_w?`<b>${r.equip.power_w}</b>`:'<span class="text-slate-300">—</span>'}</td><td class="border px-2 py-1 text-[10px]">${other.length?escapeHtml(other.join('；')):'—'}</td><td class="border px-2 py-1 text-center">${this.boothStatusBadge(r.status||'pending')}</td></tr>`;
    }).join('');
    const t=agg.totals;
    return `<div class="space-y-3">
      <div class="bg-white border rounded-xl p-3">
        <b class="text-[12px]"><i class="fa-solid fa-chart-column text-blue-600 mr-1"></i>每項物資統計（要借什麼 → 總數及邊個攤位要）</b>
        <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">項目</th><th class="border px-2 py-1">總數</th><th class="border px-2 py-1">單位</th><th class="border px-2 py-1">攤位（代號）</th></tr></thead><tbody>
          ${itemStat('tent','帳篷（3mW x 3mD）','頂',t.tent)}
          ${itemStat('table','摺枱','張',t.table)}
          ${itemStat('chair','摺椅','張',t.chair)}
          ${itemStat('skirting','帳篷圍布','塊',t.skirting)}
          ${itemStat('power_w','電源','W',t.power_w)}
        </tbody></table></div>
      </div>
      <div class="bg-white border rounded-xl p-3">
        <b class="text-[12px]"><i class="fa-solid fa-store text-orange-600 mr-1"></i>每攤位借用明細（${rows.length} 攤位有計劃書）</b>
        <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">攤位</th><th class="border px-2 py-1">負責單位</th><th class="border px-2 py-1">攤位名稱（招牌）</th><th class="border px-2 py-1">帳篷</th><th class="border px-2 py-1">摺枱</th><th class="border px-2 py-1">摺椅</th><th class="border px-2 py-1">圍布</th><th class="border px-2 py-1">電源(W)</th><th class="border px-2 py-1">其他</th><th class="border px-2 py-1">狀態</th></tr></thead><tbody>
          ${boothRows||'<tr><td colspan="10" class="border px-2 py-4 text-center text-slate-400">暫無計劃書 — 提交後即時出現</td></tr>'}
          ${rows.length?`<tr class="bg-slate-900 text-white font-extrabold"><td colspan="3" class="border px-2 py-1">TOTAL（全部分區總數）</td><td class="border px-2 py-1 text-center">${t.tent}</td><td class="border px-2 py-1 text-center">${t.table}</td><td class="border px-2 py-1 text-center">${t.chair}</td><td class="border px-2 py-1 text-center">${t.skirting}</td><td class="border px-2 py-1 text-center">${t.power_w}</td><td colspan="2" class="border px-2 py-1 text-[10px]">${t.booths} 攤位有計劃書</td></tr>`:''}
        </tbody></table></div>
      </div>
      <p class="text-[10px] text-slate-400">借用統計由「攤位計劃書」提交自動匯總（兼容舊版一項一紀錄）。完整攤位總表（含已聯絡／已回覆／確認出席）見<b>執行手冊 → 攤位總表</b>或<b>主題節目組卡片</b>。</p>
    </div>`;
  },
  /* —— 招牌統計：大會據此製作招牌嘅清單 —— */
  renderBoothSignboardHTML(isPublic){
    const agg=this.boothPlanAggregates(this.getSuppliesData().booth_requests||[]);
    const rows=Object.values(agg.rows).filter(r=>r.booth_name).sort((a,b)=>String(a.key).localeCompare(String(b.key)));
    if(!rows.length){ return '<p class="text-xs text-slate-400 py-8 text-center">暫無招牌 — 計劃書填咗「攤位名稱（招牌用）」後自動列入</p>'; }
    const codeOf=r=>[r.zone,r.booth_no].filter(Boolean).join('')||r.booth_code||r.unit_name||r.key;
    const rowsHTML=rows.map(r=>`<tr><td class="border px-2 py-1 font-mono font-extrabold whitespace-nowrap">${escapeHtml(codeOf(r))}</td><td class="border px-2 py-1 font-bold text-[13px]">${escapeHtml(r.booth_name)}</td><td class="border px-2 py-1">${escapeHtml(r.unit_name||'-')}</td><td class="border px-2 py-1">${r.owner_name?`<b>${escapeHtml(r.owner_name)}</b>${r.owner_position?' <span class="text-[10px] text-slate-400">'+escapeHtml(r.owner_position)+'</span>':''}`:'<span class="text-slate-300">—</span>'}</td><td class="border px-2 py-1 text-[10px] text-slate-500">${isPublic?'🔒 聯絡資料登入後可見':escapeHtml([r.owner_phone,r.owner_email].filter(Boolean).join(' / ')||r.contact||'-')}</td><td class="border px-2 py-1 text-center">${this.boothStatusBadge(r.status||'pending')}</td></tr>`).join('');
    return `<div class="bg-white border rounded-xl p-3">
      <b class="text-[12px]"><i class="fa-solid fa-sign-hanging text-amber-600 mr-1"></i>招牌製作清單（${rows.length} 個招牌）</b>
      <div class="text-[10px] text-slate-500 mt-1">大會據計劃書「攤位名稱（招牌用）」製作招牌；計劃書提交／更新後此清單即時反映。</div>
      <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">攤位</th><th class="border px-2 py-1">招牌名稱</th><th class="border px-2 py-1">負責單位</th><th class="border px-2 py-1">負責人</th><th class="border px-2 py-1">聯絡</th><th class="border px-2 py-1">狀態</th></tr></thead><tbody>${rowsHTML}</tbody></table></div>
    </div>`;
  },
  /* —— 2026 攤位總表（完整版：含已聯絡/已回覆/確認出席；供「執行手冊」及主題節目組卡片）——
     由程式內嵌 BOOTH_ZONES_2026（品牌推廣組 2026 攤位總表）＋「攤位計劃書」提交自動填入。 */
  renderBoothMasterTableHTML(agg,isPublic){
    const t=agg.totals;
    const usedKeys=new Set();
    const contactCell=v=>`<td class="border px-2 py-1 text-center font-bold ${v==='Y'?'text-emerald-700':(v==='N'?'text-rose-600':(v==='?'?'text-amber-600':'text-slate-300'))}">${boothContactMark(v)}</td>`;
    let html=`<div class="table-responsive"><table class="min-w-full text-xs border bg-white"><thead class="bg-slate-800 text-white"><tr>
      <th class="border px-2 py-1.5 text-left whitespace-nowrap">分區</th><th class="border px-2 py-1.5 text-left">編號</th><th class="border px-2 py-1.5 text-left">主題範疇</th>
      <th class="border px-2 py-1.5 text-center">已聯絡</th><th class="border px-2 py-1.5 text-center">已回覆</th><th class="border px-2 py-1.5 text-center">確認出席</th>
      <th class="border px-2 py-1.5 text-left">負責單位</th><th class="border px-2 py-1.5 text-left">聯絡人</th><th class="border px-2 py-1.5 text-left">攤位名稱（招牌）</th><th class="border px-2 py-1.5 text-left">預計攤位內容</th><th class="border px-2 py-1.5 text-left">「十五五」元素</th>
      <th class="border px-2 py-1.5 text-center">帳篷(頂)</th><th class="border px-2 py-1.5 text-center">摺枱(張)</th><th class="border px-2 py-1.5 text-center">摺椅(張)</th><th class="border px-2 py-1.5 text-center">圍布(塊)</th><th class="border px-2 py-1.5 text-center">電源(W)</th>
      <th class="border px-2 py-1.5 text-left">其他場地及物資需求</th><th class="border px-2 py-1.5 text-left">運送物資需求</th><th class="border px-2 py-1.5 text-center">狀態</th>
    </tr></thead><tbody>`;
    BOOTH_ZONES_2026.forEach(z=>{
      html+=`<tr class="bg-amber-50"><td colspan="19" class="border px-2 py-1 text-[11px] font-extrabold text-amber-900">分區 ${z.zone} · ${escapeHtml(z.theme)}${(z.units||[]).length?`（${z.units.length} 攤位）`:'（編號待定）'}</td></tr>`;
      if(!(z.units||[]).length){
        html+=`<tr><td colspan="19" class="border px-2 py-1 text-slate-400 text-center">總表暫未設單位</td></tr>`;
        return;
      }
      z.units.forEach(u=>{
        const key=z.zone+u.no;
        if(agg.rows[key]) usedKeys.add(key);
        const row=agg.rows[key];
        let contactHTML='<span class="text-slate-300">—</span>';
        if(row){
          if(row.owner_name){
            contactHTML=`<b>${escapeHtml(row.owner_name)}</b>`;
            if(!isPublic&&(row.owner_phone||row.owner_email)) contactHTML+=`<div class="text-slate-500">${escapeHtml([row.owner_phone,row.owner_email].filter(Boolean).join(' / '))}</div>`;
            else if(isPublic&&(row.owner_phone||row.owner_email)) contactHTML+=` <span class="text-slate-300">🔒</span>`;
          } else if(row.contact&&!isPublic){
            contactHTML=escapeHtml(row.contact);
          }
        }
        html+=`<tr class="${row?'bg-amber-50/40':''}">
          <td class="border px-2 py-1.5 font-mono font-extrabold">${z.zone}</td><td class="border px-2 py-1.5 font-mono font-bold">${u.no}</td><td class="border px-2 py-1.5 text-[10px] text-slate-500">${escapeHtml(z.theme)}</td>
          ${contactCell(u.c)}${contactCell(u.r)}${contactCell(u.cf)}
          <td class="border px-2 py-1.5">${escapeHtml(u.name)}</td>
          <td class="border px-2 py-1.5 text-[10px]">${contactHTML}</td>
          <td class="border px-2 py-1.5 font-bold">${row?escapeHtml(row.booth_name||'-'):'<span class="text-slate-400">未提交</span>'}</td>
          <td class="border px-2 py-1.5" title="${row?escapeHtml(row.activity_desc||''):''}">${row&&row.activity_desc?escapeHtml(String(row.activity_desc).replace(/\s+/g,' ').slice(0,40)):'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5" title="${row?escapeHtml(row.fif15_content||''):''}">${row&&row.fif15_content?escapeHtml(String(row.fif15_content).replace(/\s+/g,' ').slice(0,30)):'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row&&row.equip.tent?`<b>${row.equip.tent}</b>`:'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row&&row.equip.table?`<b>${row.equip.table}</b>`:'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row&&row.equip.chair?`<b>${row.equip.chair}</b>`:'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row&&row.equip.skirting?`<b>${row.equip.skirting}</b>`:'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row&&row.equip.power_w?`<b>${row.equip.power_w}</b>`:'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-[10px]">${row&&row.other_req?escapeHtml(row.other_req):'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-[10px]">${row&&row.delivery?escapeHtml(row.delivery):'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row?this.boothStatusBadge(row.status||'pending'):'<span class="text-[10px] text-slate-300">未提交</span>'}</td>
        </tr>`;
      });
    });
    Object.values(agg.rows).forEach(row=>{
      if(row.key.startsWith('__custom__')||!usedKeys.has(row.key)){
        const other=[];
        (row.equip.other||[]).forEach(x=>other.push(x));
        let contactHTML2='<span class="text-slate-300">—</span>';
        if(row.owner_name){
          contactHTML2=`<b>${escapeHtml(row.owner_name)}</b>`;
          if(!isPublic&&(row.owner_phone||row.owner_email)) contactHTML2+=`<div class="text-slate-500">${escapeHtml([row.owner_phone,row.owner_email].filter(Boolean).join(' / '))}</div>`;
          else if(isPublic&&(row.owner_phone||row.owner_email)) contactHTML2+=` <span class="text-slate-300">🔒</span>`;
        }
        html+=`<tr class="bg-sky-50/50">
          <td class="border px-2 py-1.5 font-mono font-extrabold">${row.zone||'?'}</td><td class="border px-2 py-1.5 font-mono font-bold">${row.booth_no||'-'}</td><td class="border px-2 py-1.5 text-[10px] text-slate-500">${escapeHtml(row.zone?boothZoneLabel(row.zone):'（總表以外）')}</td>
          <td class="border px-2 py-1.5 text-center text-slate-300">—</td><td class="border px-2 py-1.5 text-center text-slate-300">—</td><td class="border px-2 py-1.5 text-center text-slate-300">—</td>
          <td class="border px-2 py-1.5">${escapeHtml(row.unit_name||'（自行填寫）')}</td>
          <td class="border px-2 py-1.5 text-[10px]">${contactHTML2}</td>
          <td class="border px-2 py-1.5 font-bold">${escapeHtml(row.booth_name||'-')}</td>
          <td class="border px-2 py-1.5">${row.activity_desc?escapeHtml(String(row.activity_desc).replace(/\s+/g,' ').slice(0,40)):'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5">${row.fif15_content?escapeHtml(String(row.fif15_content).replace(/\s+/g,' ').slice(0,30)):'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row.equip.tent?`<b>${row.equip.tent}</b>`:'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row.equip.table?`<b>${row.equip.table}</b>`:'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row.equip.chair?`<b>${row.equip.chair}</b>`:'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row.equip.skirting?`<b>${row.equip.skirting}</b>`:'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${row.equip.power_w?`<b>${row.equip.power_w}</b>`:'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-[10px]">${row.other_req?escapeHtml(row.other_req):(other.length?escapeHtml(other.join('；')):'<span class="text-slate-300">—</span>')}</td>
          <td class="border px-2 py-1.5 text-[10px]">${row.delivery?escapeHtml(row.delivery):'<span class="text-slate-300">—</span>'}</td>
          <td class="border px-2 py-1.5 text-center">${this.boothStatusBadge(row.status||'pending')}</td>
        </tr>`;
      }
    });
    html+=`<tr class="bg-slate-900 text-white font-extrabold"><td colspan="11" class="border px-2 py-1.5">TOTAL（全部分區總數）· ${t.booths} 攤位有計劃書</td><td class="border px-2 py-1.5 text-center">${t.tent}</td><td class="border px-2 py-1.5 text-center">${t.table}</td><td class="border px-2 py-1.5 text-center">${t.chair}</td><td class="border px-2 py-1.5 text-center">${t.skirting}</td><td class="border px-2 py-1.5 text-center">${t.power_w}</td><td colspan="3" class="border px-2 py-1.5 text-[10px]">已批核 ${Object.values(agg.rows).filter(r=>['approved','modified'].includes(r.status)).length} · 待批核 ${Object.values(agg.rows).filter(r=>r.status==='pending').length}</td></tr></tbody></table></div>`;
    html+=`<p class="text-[10px] text-slate-400">攤位總表按「2026 攤位總表」（品牌推廣組）分區＋編號，<b>已聯絡／已回覆／確認出席</b>為品牌推廣組聯絡進度（🤷＝待確認）；攤位名稱／內容／「十五五」元素／物資需求由「攤位計劃書」提交自動填入，<b>TOTAL</b> 行為所有攤位總數。${isPublic?' 為保障私隱，聯絡人電話／電郵需登入先可見。':''}</p>`;
    return html;
  },
  /* —— 計劃書明細：全部提交紀錄（完整負責人資料）＋本組確認／批核動作 —— */
  renderBoothPlanListHTML(isPublic){
    const plans=(this.getSuppliesData().booth_requests||[]).slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    if(!plans.length){ return '<p class="text-xs text-slate-400 py-8 text-center">暫無攤位計劃書 — 按「提交攤位計劃書」填寫（無需登入）</p>'; }
    const isAdmin=this.isAdmin();
    const canApprove=this.canApproveArea('supplies');
    return `<div class="space-y-3">${plans.map(r=>{
      const e=this.boothEquipOf(r);
      const eq=[e.tent?`帳篷 <b>${e.tent}</b> 頂`:null,e.table?`摺枱 <b>${e.table}</b> 張`:null,e.chair?`摺椅 <b>${e.chair}</b> 張`:null,e.skirting?`帳篷圍布 <b>${e.skirting}</b> 塊`:null,e.power_w?`電源 <b>${e.power_w}</b> W`:null,...(e.other||[])].filter(Boolean).join(' · ')||'—';
      const code=[r.zone,r.booth_no].filter(Boolean).join('')||r.booth_code||'-';
      const isMine=this.currentUser&&(r.requested_by_id===this.currentUser.user_id||r.requested_by===this.currentUser.name);
      const canEdit=isAdmin||this.isCoordinatorViceChair()||isMine;
      const ownerLine=r.owner_name
        ?`<b>${escapeHtml(r.owner_name)}</b>（${escapeHtml(r.owner_age_group||'年齡組別未填')}${r.owner_unit?' · '+escapeHtml(r.owner_unit):''}${r.owner_position?' · '+escapeHtml(r.owner_position):''}）${isPublic?'':((r.owner_phone||r.owner_email)?` · ${escapeHtml([r.owner_phone,r.owner_email].filter(Boolean).join(' / '))}`:'')}`
        :(isPublic?'<span class="text-slate-300">—</span>':escapeHtml(r.contact||'-'));
      return `<div class="border rounded-xl p-3 bg-white space-y-1.5">
        <div class="flex justify-between items-start gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap"><b class="text-[13px] font-mono">${code}</b><b class="text-[13px]">${escapeHtml(r.booth_name||'')}</b>${this.boothStatusBadge(r.status)}<span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(r.group_name||'')}</span>${r.status==='pending'?this.applicationStageHTML(r):''}</div>
            <div class="text-[11px] text-slate-500 mt-1">負責單位：${escapeHtml(r.unit_name||'-')}</div>
            ${r.activity_desc?`<div class="text-[11px] text-slate-600 bg-slate-50 border rounded-xl p-2 mt-1">活動內容：${escapeHtml(r.activity_desc)}</div>`:''}
            ${r.fif15_content?`<div class="text-[11px] text-slate-600 mt-1">「十五五」主題：${escapeHtml(r.fif15_content)}</div>`:''}
            <div class="text-[11px] text-slate-700 mt-1">物資：${eq}</div>
            ${(r.other_req||r.delivery)?`<div class="text-[11px] text-slate-500 mt-0.5">${r.other_req?'其他要求：'+escapeHtml(r.other_req):''}${r.other_req&&r.delivery?' · ':''}${r.delivery?'運送：'+escapeHtml(r.delivery):''}</div>`:''}
            <div class="text-[11px] text-slate-500 mt-0.5">負責人：${ownerLine}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">提交人：${escapeHtml(r.requested_by||'-')}${isPublic?'':` | 聯絡：${escapeHtml(r.contact||'-')}`}${r.created_at?' | '+new Date(r.created_at).toLocaleDateString():''}${r.approved_by?' | 批核：'+escapeHtml(r.approved_by)+(r.approved_at?'（'+new Date(r.approved_at).toLocaleDateString()+'）':''):''}</div>
            ${r.notes?`<div class="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2 mt-1">備註：${escapeHtml(r.notes)}</div>`:''}
          </div>
          <div class="flex flex-col gap-1 flex-shrink-0 items-end">
            ${this.canConfirmApplication(r)?`<button onclick="app.confirmBoothApplication('${r.request_id}')" class="bg-sky-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">本組確認</button>`:''}
            ${canApprove&&r.status==='pending'&&this.applicationReadyForApproval(r)?`<div class="flex gap-1"><button onclick="app.boothSetStatus('${r.request_id}','approved')" class="bg-emerald-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">批准</button><button onclick="app.boothSetStatus('${r.request_id}','rejected')" class="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1 rounded-xl text-[11px] font-bold">拒絕</button></div>`:''}
            ${canEdit?`<button onclick="app.openBoothSupplyForm('${r.request_id}')" class="bg-white border px-3 py-1 rounded-xl text-[10px]">✏️ 編輯</button>`:''}
          </div>
        </div>
      </div>`;
    }).join('')}</div>`;
  },
  confirmBoothApplication(id){
    const data=this.getSuppliesData(); const r=(data.booth_requests||[]).find(x=>x.request_id===id); if(!r) return;
    if(!this.canConfirmApplication(r)){ showToast('只可由申請所屬組別的總主任以上確認','error'); return; }
    r.group_confirmation_status='confirmed'; r.group_confirmed_by=this.currentUser?.name||''; r.group_confirmed_at=new Date().toISOString();
    this.saveSuppliesData(data); this.refreshSuppliesViews();
    showToast('已本組確認，待指定批核組批核','success');
  },
  boothSetStatus(id,status){
    if(!(this.canApproveArea('supplies')||this.isAdmin())){ showToast('只供指定物資批核組批核','error'); return; }
    const data=this.getSuppliesData(); const r=(data.booth_requests||[]).find(x=>x.request_id===id); if(!r) return;
    if(!this.applicationReadyForApproval(r)){ showToast('須先由申請人所屬組別總主任以上確認','warning'); return; }
    if(status==='approved') r.qty_approved=r.qty_requested;
    r.status=status; r.approved_by=(this.currentUser?.name||'')+`（${this.approvalRouteLabel('supplies','approver_groups')}）`; r.approved_at=new Date().toISOString();
    if(status==='rejected') r.notes='已拒絕';
    const targetId=r.requested_by_id||r.requested_by;
    const label=`${[r.zone,r.booth_no].filter(Boolean).join('')||r.booth_code||''} ${r.booth_name||r.unit_name||''}`;
    this.addSupplyNotification(targetId,{type:'booth_approved',item_name:'攤位計劃書 '+label,qty_requested:0,qty_approved:0,status,approved_by:r.approved_by,approved_at:r.approved_at,message:`你嘅攤位計劃書「${label}」已由 ${r.approved_by} ${status==='approved'?'批准':'拒絕'}。`});
    this.saveSuppliesData(data); this.refreshSuppliesViews();
    showToast(status==='approved'?'已批准攤位計劃書，已通知提交人':'已拒絕攤位計劃書，已通知提交人',status==='approved'?'success':'warning');
  },
  // 攤位計劃書表單（對標主題節目組「港島童軍繽紛日2026 - 主題節目攤位計劃書」Google Form）：
  // 分區＋編號＋負責單位來自 2026 攤位總表；攤位名稱／活動內容／「十五五」主題／負責人資料由申請人填；帳篷／摺枱／摺椅只需填數量，不設庫存。
  openBoothSupplyForm(editId=null){
    const data=this.getSuppliesData();
    const existing=editId?data.booth_requests.find(r=>r.request_id===editId):null;
    const title=existing?'編輯攤位計劃書':'提交攤位計劃書（取代 Google Form，無需登入）';
    const zoneOpts=BOOTH_ZONES_2026.map(z=>`<option value="${z.zone}" ${existing?.zone===z.zone?'selected':''}>${z.zone} ${escapeHtml(z.theme)}</option>`).join('');
    const stdRows=BOOTH_STD_ITEMS.map(it=>{
      const legacyVal=existing&&BOOTH_ITEM_KEY_MAP[existing.item_name]===it.key?(existing.qty_requested||''):'';
      return `<div><label class="text-[11px] font-bold">${escapeHtml(it.name)}數量${it.hint?` <span class="font-normal text-slate-400">（${escapeHtml(it.hint)}）</span>`:''}</label><input type="number" id="booth-qty-${it.key}" min="0" value="${existing?(existing[it.key]||''):legacyVal}" placeholder="0" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>`;
    }).join('');
    const ageOpts=BOOTH_OWNER_AGE_GROUPS.map(g=>`<option value="${escapeHtml(g)}" ${existing?.owner_age_group===g?'selected':''}>${escapeHtml(g)}</option>`).join('');
    const legacyExtra=(()=>{
      if(!existing) return '';
      const n=String(existing.item_name||'').trim();
      if(n&&n!=='攤位計劃書'&&!BOOTH_ITEM_KEY_MAP[n]) return this.boothItemRowHTML({item_name:n,qty_requested:existing.qty_requested||'',unit:existing.unit||''});
      const xs=(existing.extra_items||[]);
      return xs.length?xs.map(x=>this.boothItemRowHTML(x)).join(''):'';
    })();
    let html=`<input type="hidden" id="booth-form-mode" value="${existing?'edit':'create'}"><input type="hidden" id="booth-form-id" value="${existing?.request_id||''}"><div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[10.5px] text-amber-900 mb-3 leading-relaxed"><b>呢張表取代 Google Form，未登入都可以填寫。</b>喺「2026 攤位總表」<b>分區＋編號＋負責單位</b>；<b>攤位名稱</b>由申請人填寫（大會據此製作招牌）；帳篷／摺枱／摺椅大會已有（向外判商租用），<b>只需填數量</b>，不設庫存。「十五五」主題內容及負責人資料用於活動統計及 WhatsApp 群組協調。<b>提交後籌辦方即得兩種資料：① 借用統計（要借什麼＋招牌）② 執行手冊→攤位總表（自動填入）。</b></div>
    <div class="text-[11px] font-extrabold text-amber-700 mb-1"><i class="fa-solid fa-location-dot mr-1"></i>① 攤位位置（對標「2026 攤位總表」）</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="text-[11px] font-bold">分區 *</label><select id="booth-zone" onchange="app.renderBoothUnitOptions()" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1"><option value="">請選分區</option>${zoneOpts}</select></div><div><label class="text-[11px] font-bold">攤位編號 *</label><select id="booth-no" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1">${Array.from({length:15},(_,i)=>String(i+1).padStart(2,'0')).map(no=>`<option value="${no}" ${existing?.booth_no===no?'selected':''}>${no}</option>`).join('')}</select></div><div class="col-span-2"><label class="text-[11px] font-bold">負責單位 *</label><div class="flex gap-2 mt-1"><select id="booth-unit-select" onchange="app.onBoothUnitChange()" class="flex-1 px-3 py-2 border rounded-xl text-sm bg-white"></select><input id="booth-unit-custom" value="${escapeHtml(existing?.unit_name||'')}" placeholder="自行輸入單位名稱" class="flex-1 px-3 py-2 border rounded-xl text-sm hidden"></div></div></div>
    <div class="text-[11px] font-extrabold text-amber-700 mb-1 mt-3"><i class="fa-solid fa-clipboard-list mr-1"></i>② 攤位計劃內容</div>
    <div class="space-y-3"><div><label class="text-[11px] font-bold">攤位名稱（招牌用）*</label><input id="booth-name" value="${escapeHtml(existing?.booth_name||'')}" required placeholder="例：皮藝體驗站（做招牌用；沒有特別名稱可填跟負責單位同名）" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">攤位活動內容 *</label><textarea id="booth-activity" rows="2" required placeholder="描述攤位嘅遊戲／體驗／內容" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.activity_desc||'')}</textarea></div><div><label class="text-[11px] font-bold">攤位對應主題「十五五」各範疇的具體內容 *</label><textarea id="booth-fif15" rows="2" required placeholder="例如：創新科技、AI等（或未通配合）" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.fif15_content||'')}</textarea></div></div>
    <div class="text-[11px] font-extrabold text-amber-700 mb-1 mt-3"><i class="fa-solid fa-tent mr-1"></i>③ 場地及物資需求（只需填數量）</div>
    <div class="grid grid-cols-3 gap-3">${stdRows}</div>
    <div class="mt-3"><label class="text-[11px] font-bold">其他要求，如圍布、電力要求等，請詳細說明</label><textarea id="booth-other" rows="2" placeholder="例：需兩側圍布（防西斜）、需獨立斷電開關（可選）" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.other_req||existing?.other_need||'')}</textarea></div>
    <div id="booth-extra-rows" class="space-y-2 mt-3">${legacyExtra}</div>
    <div class="text-right mt-1"><button type="button" onclick="app.addBoothItemRow()" class="bg-amber-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-plus mr-1"></i>增加其他物資（帳篷／枱／椅以外）</button></div>
    <div class="mt-3"><label class="text-[11px] font-bold">運送物資需求（可選）</label><textarea id="booth-delivery" rows="2" placeholder="例：需大會協助運送大型道具" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.delivery||'')}</textarea></div>
    <div class="text-[11px] font-extrabold text-amber-700 mb-1 mt-3"><i class="fa-solid fa-user-tie mr-1"></i>④ 攤位負責人資料</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="text-[11px] font-bold">攤位負責人姓名 *</label><input id="booth-owner-name" value="${escapeHtml(existing?.owner_name||this.currentUser?.name||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">攤位負責人年齡組別 *</label><select id="booth-owner-age" required class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1"><option value="">請選年齡組別</option>${ageOpts}</select><div class="text-[9.5px] text-slate-400 mt-0.5">相關資料只會用作是次活動統計之用，並不會作其他用途</div></div><div><label class="text-[11px] font-bold">所屬單位 *</label><input id="booth-owner-unit" value="${escapeHtml(existing?.owner_unit||this.currentUser?.group_name||'')}" required placeholder="例：港島第99旅" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">職位 *</label><input id="booth-owner-position" value="${escapeHtml(existing?.owner_position||this.currentUser?.job_title||'')}" required placeholder="例：主任／總監／隊長" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">攤位負責人電話（可供whatsapp聯絡）*</label><input id="booth-owner-phone" value="${escapeHtml(existing?.owner_phone||this.myDefaultContact())}" required placeholder="主題節目組將會開設攤位負責人WhatsApp群組" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">攤位負責人電郵地址 *</label><input id="booth-owner-email" type="email" value="${escapeHtml(existing?.owner_email||'')}" required placeholder="活動完結後，所有主題攤位之工作人員感謝狀將會電郵至此地址" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div></div>
    <div class="text-[11px] font-extrabold text-amber-700 mb-1 mt-3"><i class="fa-solid fa-building mr-1"></i>⑤ 組別及提交資料</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="text-[11px] font-bold">所屬組別 / 單位 *</label><input id="booth-group" value="${escapeHtml(existing?.group_name||this.currentUser?.group_name||'')}" required placeholder="${this.currentUser?'':'例：主題節目組 或 港島第99旅'}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">聯絡電話 ${this.currentUser?'':'*'}</label><input id="booth-contact" value="${escapeHtml(existing?.contact||this.myDefaultContact())}" placeholder="方便協調（大會跟進用）" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div class="col-span-2"><label class="text-[11px] font-bold">${this.currentUser?'提交人':'提交人姓名 *'}</label><input id="booth-requested-by" value="${escapeHtml(existing?.requested_by||this.currentUser?.name||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1 ${this.currentUser?'bg-slate-50':''}" placeholder="${this.currentUser?'':'填寫你嘅姓名'}" ${this.currentUser?'readonly':''}></div></div>
    <div class="text-[10px] text-slate-500 mt-2">攤位物資由大會向外判商租用，<b>不設庫存</b>；低於總主任提交會先交本組總主任以上確認，再交指定批核組。</div>`;
    document.getElementById('record-modal-title').textContent=title;
    document.getElementById('record-form-fields').innerHTML=html;
    this.renderBoothUnitOptions(existing?.unit_name||'');
    document.getElementById('record-form').onsubmit=(e)=>{ e.preventDefault(); this.submitBoothSupplyForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  },
  // 依分區填入負責單位下拉（來自 BOOTH_ZONES_2026）；選「其他」改為自行輸入
  renderBoothUnitOptions(selected=''){
    const zoneSel=document.getElementById('booth-zone'); const wrap=document.getElementById('booth-unit-select'); const custom=document.getElementById('booth-unit-custom');
    if(!zoneSel||!wrap) return;
    const z=BOOTH_ZONES_2026.find(x=>x.zone===zoneSel.value);
    const units=(z&&z.units)?z.units:[];
    const isCustom=selected&&!units.some(x=>x.name===selected);
    wrap.innerHTML='<option value="">請選負責單位</option>'+units.map(u=>`<option value="${escapeHtml(u.name)}" data-no="${u.no}" ${u.name===selected?'selected':''}>${escapeHtml(u.no)} ${escapeHtml(u.name)}</option>`).join('')+'<option value="__custom__" '+(isCustom?'selected':'')+'>其他（自行輸入）</option>';
    // 選了單位後自動帶出總表上的攤位編號
    const opt=wrap.options&&wrap.options[wrap.selectedIndex];
    const noSel=document.getElementById('booth-no');
    if(opt&&opt.getAttribute&&opt.getAttribute('data-no')&&noSel) noSel.value=opt.getAttribute('data-no');
    if(custom) custom.classList.toggle('hidden',!isCustom);
  },
  onBoothUnitChange(){
    const wrap=document.getElementById('booth-unit-select'); const custom=document.getElementById('booth-unit-custom');
    if(!wrap||!custom) return;
    custom.classList.toggle('hidden',wrap.value!=='__custom__');
    // 選了單位後自動帶出總表上的攤位編號（選「其他」則不動）
    const opt=wrap.options&&wrap.options[wrap.selectedIndex];
    const noSel=document.getElementById('booth-no');
    if(opt&&opt.getAttribute&&opt.getAttribute('data-no')&&noSel) noSel.value=opt.getAttribute('data-no');
  },
  boothItemRowHTML(existing=null){
    return `<div class="booth-item-row border rounded-xl p-3 bg-slate-50 space-y-2 relative"><button type="button" onclick="this.parentElement.remove()" class="absolute top-2 right-2 text-rose-600 text-[10px] font-bold">刪除這項</button><div class="grid grid-cols-3 gap-2"><div class="col-span-3 sm:col-span-2"><label class="text-[11px] font-bold">其他物資名稱 *</label><input class="booth-item w-full px-3 py-2 border rounded-xl text-sm mt-1" required placeholder="例：射燈、延長線、展示板" value="${escapeHtml(existing?.item_name||'')}"></div><div><label class="text-[11px] font-bold">數量 *</label><input type="number" class="booth-qty w-full px-3 py-2 border rounded-xl text-sm mt-1" required min="1" value="${existing?.qty_requested||''}"></div><div><label class="text-[11px] font-bold">單位</label><input class="booth-unit w-full px-3 py-2 border rounded-xl text-sm mt-1" value="${escapeHtml(existing?.unit||'個')}"></div></div></div>`;
  },
  addBoothItemRow(){
    const container=document.getElementById('booth-extra-rows');
    if(!container) return;
    const tmp=document.createElement('div');
    tmp.innerHTML=this.boothItemRowHTML();
    container.appendChild(tmp.firstElementChild);
  },
  submitBoothSupplyForm(){
    const mode=document.getElementById('booth-form-mode').value;
    const id=document.getElementById('booth-form-id').value;
    const zone=document.getElementById('booth-zone').value;
    const booth_no=(document.getElementById('booth-no')||{}).value||'';
    let unit_name=document.getElementById('booth-unit-select').value;
    if(unit_name==='__custom__') unit_name=document.getElementById('booth-unit-custom').value.trim();
    const booth_name=document.getElementById('booth-name').value.trim();
    const activity_desc=document.getElementById('booth-activity').value.trim();
    const fif15_content=document.getElementById('booth-fif15').value.trim();
    let group_name=document.getElementById('booth-group').value.trim();
    // 總主任以下登入成員自動用本組；未登入（公眾）自行填寫組別／單位
    if(this.currentUser&&this.roleLevel(this.currentUser.role)<40) group_name=normalizeGroupName(this.currentUser.group_name);
    const contact=document.getElementById('booth-contact').value.trim()||'';
    const requested_by=document.getElementById('booth-requested-by').value.trim()||this.currentUser?.name||'';
    const other_req=document.getElementById('booth-other').value.trim()||'';
    const delivery=document.getElementById('booth-delivery').value.trim()||'';
    const owner_name=document.getElementById('booth-owner-name').value.trim();
    const owner_age_group=document.getElementById('booth-owner-age').value;
    const owner_unit=document.getElementById('booth-owner-unit').value.trim();
    const owner_position=document.getElementById('booth-owner-position').value.trim();
    const owner_phone=document.getElementById('booth-owner-phone').value.trim();
    const owner_email=document.getElementById('booth-owner-email').value.trim();
    if(!zone||!unit_name||!booth_name||!activity_desc||!fif15_content||!group_name){ showToast('請填寫分區、負責單位、攤位名稱、活動內容、「十五五」主題及組別','error'); return; }
    if(!owner_name||!owner_age_group||!owner_unit||!owner_position||!owner_phone||!owner_email){ showToast('請填寫完整攤位負責人資料（姓名／年齡組別／所屬單位／職位／電話／電郵）','error'); return; }
    // 公開申請：未登入必須留姓名＋電話，方便大會跟進
    if(!this.currentUser&&(!requested_by||!contact)){ showToast('請填寫提交人姓名及聯絡電話（未登入申請需以電話跟進）','error'); return; }
    // 標準數量：帳篷／摺枱／摺椅（留空／0＝不需要）
    const qty={};
    BOOTH_STD_ITEMS.forEach(it=>{ const el=document.getElementById('booth-qty-'+it.key); qty[it.key]=el?(parseInt(el.value||'0')||0):0; });
    // 其他物資（額外行）
    const extra_items=[];
    document.querySelectorAll('#booth-extra-rows .booth-item-row').forEach(row=>{
      const name=row.querySelector('.booth-item').value.trim();
      const q=parseInt(row.querySelector('.booth-qty').value||'0');
      const unit=row.querySelector('.booth-unit').value.trim()||'個';
      if(name&&q>0) extra_items.push({item_name:name, qty_requested:q, unit});
    });
    if(!qty.qty_tent&&!qty.qty_table&&!qty.qty_chair&&!other_req&&!extra_items.length&&!delivery){ showToast('請填寫至少一項場地及物資需求（帳篷／枱／椅數量或其他要求）','error'); return; }
    const data=this.getSuppliesData();
    const booth_code=boothCodeOfUnit(unit_name)||(zone+booth_no);
    const rec={
      item_name:'攤位計劃書', qty_requested:1, qty_approved:null, unit:'份',
      group_name, zone, booth_no, booth_code, unit_name, booth_name,
      activity_desc, fif15_content,
      qty_tent:qty.qty_tent, qty_table:qty.qty_table, qty_chair:qty.qty_chair,
      skirting_qty:0, power_w:0,
      other_req, other_need:other_req, delivery,
      owner_name, owner_age_group, owner_unit, owner_position, owner_phone, owner_email,
      extra_items,
      purpose:'',
      contact, requested_by, requested_by_id:this.currentUser?.user_id||''
    };
    const confirmation=this.applicationConfirmationMeta(this.currentUser);
    if(mode==='edit'){
      const idx=data.booth_requests.findIndex(r=>r.request_id===id);
      if(idx>=0) data.booth_requests[idx]={...data.booth_requests[idx],...rec,...confirmation,status:'pending',approved_by:'',approved_at:'',notes:''};
    }else{
      data.booth_requests.push({request_id:'req_booth_'+Date.now()+'_'+Math.floor(Math.random()*10000),event_id:this.currentEvent?.event_id||'isd_2026',...rec,...confirmation,status:'pending',approved_by:'',approved_at:'',notes:'',created_at:new Date().toISOString()});
    }
    this.saveSuppliesData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新攤位計劃書，重新進入流程':(this.applicationNeedsGroupConfirmation(rec)?'已提交攤位計劃書：待本組總主任確認（資料已入借用統計＋執行手冊攤位總表）':'已提交攤位計劃書：已交批核組（資料已入借用統計＋執行手冊攤位總表）'),'success');
    this.refreshSuppliesViews();
  },
  /* —— 匯出：總表 CSV（對標 2026 攤位總表，供大會／外判商下單）＋完整 JSON —— */
  exportBoothCSV(){
    if(!(this.isAdmin()||this.isCoordinatorViceChair())){ showToast('匯出只供指定物資批核／執行組總主任以上','error'); return; }
    const agg=this.boothPlanAggregates(this.getSuppliesData().booth_requests||[]);
    const t=agg.totals;
    const esc=v=>{ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
    const lines=[];
    lines.push(['分區','編號','攤位','主題範疇','負責單位','攤位名稱（招牌）','攤位活動內容','「十五五」主題內容','帳篷(頂)','摺枱(張)','摺椅(張)','帳篷圍布(塊)','電源(W)','其他要求','其他物資','運送需求','攤位負責人','負責人電話(WhatsApp)','負責人電郵','所屬組別','提交人','狀態'].map(esc).join(','));
    lines.push(['TOTAL','','TOTAL','','','','','',t.tent,t.table,t.chair,t.skirting,t.power_w,'','','',`${t.booths} 攤位有計劃書`,'','',''].map(esc).join(','));
    const rowLine=(z,no,code,theme,unit,row)=>{
      const st=row?(row.status==='pending'?'待批核':row.status==='rejected'?'已拒絕':row.status==='modified'?'已批核(修改)':'已批核'):'未提交';
      return [z,no,code,theme,unit,row?(row.booth_name||''):'未提交',row?(row.activity_desc||''):'',row?(row.fif15_content||''):'',
        row?row.equip.tent:0,row?row.equip.table:0,row?row.equip.chair:0,row?row.equip.skirting:0,row?row.equip.power_w:0,
        row?(row.other_req||''):'',row?(row.equip.other||[]).join('; '):'',row?(row.delivery||''):'',
        row?(row.owner_name||''):'',row?(row.owner_phone||''):'',row?(row.owner_email||''):'',row?(row.group_name||''):'',row?(row.requested_by||''):'',st].map(esc).join(',');
    };
    const known=new Set();
    BOOTH_ZONES_2026.forEach(z=>{
      (z.units||[]).forEach(u=>{ known.add(z.zone+u.no); lines.push(rowLine(z.zone,u.no,z.zone+u.no,z.theme,u.name,agg.rows[z.zone+u.no])); });
      if(!(z.units||[]).length) lines.push([z.zone,'',z.zone+'-',z.theme,'','','未提交','','','','','','','','','','','','','未提交'].map(esc).join(','));
    });
    Object.values(agg.rows).forEach(row=>{
      const k=(row.zone&&row.booth_no)?row.zone+row.booth_no:null;
      if(!k||!known.has(k)) lines.push(rowLine(row.zone||'',row.booth_no||'',k||'（自行填寫）',row.zone?boothZoneLabel(row.zone):'',row.unit_name||'',row));
    });
    const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`booth_master_${todayISO()}.csv`; a.click();
    showToast('已匯出總表 CSV（含 BOM，Excel 直接開啟）','success');
  },
  exportBoothData(){
    const data=this.getSuppliesData();
    const blob=new Blob([JSON.stringify(data.booth_requests||[],null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='booth_plans.json'; a.click(); showToast('已匯出攤位計劃書 JSON','success');
  }
,
});
