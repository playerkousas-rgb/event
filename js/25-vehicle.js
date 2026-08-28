/* 25-vehicle.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{
  /* ===================== Vehicle Pass (車輛通行證) - 同物資審批 ===================== */
  renderSuppliesVehicle(){
    const container=document.getElementById('supplies-tab-vehicle');
    if(!container) return;
    const data=this.getSuppliesData();
    const myId=this.currentUser?.user_id||'',myName=this.currentUser?.name||'';
    const list=[...(data.vehicle_passes||[])].filter(v=>{
      const mine=(v.requested_by_id&&v.requested_by_id===myId)||(myName&&v.requested_by===myName);
      if(mine||this.canManageApprovalRouting()) return true;
      if(v.status==='pending') return this.canApproveArea('vehicle')||this.canConfirmApplication(v);
      if(v.status==='approved') return this.canExecuteArea('vehicle');
      return this.canApproveArea('vehicle');
    }).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    const isAdmin=this.isAdmin();
    const canSubmit=this.canSubmitSupply();
    const isCoordinator=this.canManageAreaOperations('vehicle');
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] leading-relaxed text-emerald-900">
          <b>🚗 泊車證／車輛通行證申請 (和物資審批同樣，登記車輛)</b><br>
          • 所有登入成員可提交車輛資料；低於總主任提交的申請先由本組總主任以上確認<br>
          • 目前由 ${escapeHtml(this.approvalRouteLabel('vehicle','approver_groups'))} 批核／修改，批准後交 ${escapeHtml(this.approvalRouteLabel('vehicle','executor_groups'))} 執行及查看入口／最後名單<br>
          • <b>批核後相關人士可一鍵查看「入口檢查清單」</b>（已批核車輛）方便入口檢查；申請人可在「我的」分頁查看自己的申請項目及狀態<br>
          • 後台紀錄於 localStorage + GAS Vehicle_Passes Sheet
        </div>
        <div class="flex flex-wrap gap-2">
          
          <button onclick="app.openEntranceChecklist()" class="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-traffic-light mr-1"></i>🚦 入口檢查清單 (已批核)</button>
          <button onclick="app.downloadVehicleTemplate()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載範本 CSV</button>
          ${isCoordinator?`<label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">上傳CSV批量<input type="file" accept=".csv,.json" class="hidden" onchange="app.handleVehicleFileUpload(this.files[0])"></label>`:''}
          ${(this.canApproveArea('vehicle')||this.canExecuteArea('vehicle'))?`<button onclick="app.exportVehicleData()" class="bg-slate-100 border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button>`:''}
        </div>
        <div class="space-y-3">${list.length?list.map(v=>{
          const statusColor={pending:'bg-amber-100 text-amber-700 border-amber-200',approved:'bg-emerald-100 text-emerald-700 border-emerald-200',rejected:'bg-rose-100 text-rose-700 border-rose-200'}[v.status]||'bg-slate-100';
          return `<div class="border rounded-xl p-3 bg-white space-y-2">
            <div class="flex justify-between items-start gap-2">
              <div><div class="flex items-center gap-2 flex-wrap"><b class="text-[13px]">${escapeHtml(v.plate)}</b> <span class="text-[10px] px-2 py-0.5 rounded-full border ${statusColor}">${v.status==='pending'?'待批核':v.status==='approved'?'已批核':'已拒絕'}</span><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(v.group_name)}</span>${v.status==='pending'?this.applicationStageHTML(v):''}</div>
              <div class="text-[11px] text-slate-500 mt-1">司機: ${escapeHtml(v.driver_name)} | 電話: ${escapeHtml(v.driver_contact)} | 車型: ${escapeHtml(v.vehicle_type)} | 用途: ${escapeHtml(v.purpose)}</div>
              <div class="text-[11px] text-slate-500">進出: ${escapeHtml(v.entry_date||'')} → ${escapeHtml(v.exit_date||'')} | 停泊: ${escapeHtml(v.parking_location||'-')} | 申請人: ${escapeHtml(v.requested_by)}</div>
              ${v.notes?`<div class="text-[10px] bg-amber-50 border border-amber-200 rounded-xl p-2 mt-1">批核備註: ${escapeHtml(v.notes)}</div>`:''}
              </div>
              <div class="flex flex-col gap-1 flex-shrink-0">
                ${this.canConfirmApplication(v)?`<button onclick="app.confirmApplication('vehicle','${v.pass_id}')" class="bg-sky-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">本組確認</button>`:''}
                ${this.canApproveArea('vehicle') && v.status==='pending' && this.applicationReadyForApproval(v)?`<div class="flex gap-1"><button onclick="app.approveVehiclePass('${v.pass_id}')" class="bg-emerald-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">批准</button><button onclick="app.openVehicleApproveModifyModal('${v.pass_id}')" class="bg-sky-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">修改批核</button><button onclick="app.rejectVehiclePass('${v.pass_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1 rounded-xl text-[11px]">拒絕</button></div>`:''}
                ${this.isSuperAdmin()?`<button onclick="app.deleteVehiclePass('${v.pass_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️ 刪除</button>`:''}
                <span class="text-[10px] text-slate-400">${v.approved_by?`批核: ${escapeHtml(v.approved_by)}<br>${v.approved_at?new Date(v.approved_at).toLocaleString():''}`:''}</span>
              </div>
            </div>
          </div>`;
        }).join(''):`<p class="text-xs text-slate-400 py-8 text-center">暫無車輛通行證申請，點擊上方「申請車輛通行證」直接在 APP 填寫 (登記車輛)</p>`}</div>
      </div>
    `;
  }
,
  /* ── 入口檢查清單：一鍵查看已批核車輛（入口檢查用） ── */
  openEntranceChecklist(){
    if(!this.canExecuteArea('vehicle')){ showToast(`入口／最後名單只供 ${this.approvalRouteLabel('vehicle','executor_groups')} 檢視`,'error'); return; }
    const data=this.getSuppliesData();
    const approved=(data.vehicle_passes||[]).filter(v=>v.status==='approved').sort((a,b)=>(a.entry_date||'').localeCompare(b.entry_date||''));
    if(!approved.length){ showToast('暫無已批核車輛','warning'); return; }
    const printAreaId='entrance-check-print-area';
    let html=`
      <div class="space-y-3">
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-900"><b>🚦 入口檢查清單：</b>以下為已批核車輛（${approved.length} 架），入口工作人員可按車牌核對。可列印貼於入口。</div>
        <div class="flex gap-2 flex-wrap"><button onclick="app.printEntranceChecklist()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印清單</button><button onclick="app.exportVehicleData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button></div>
        <div id="${printAreaId}">
          <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100 font-bold"><tr><th class="px-2 py-1 text-left">車牌</th><th class="px-2 py-1 text-left">司機</th><th class="px-2 py-1 text-left">電話</th><th class="px-2 py-1 text-left">組別</th><th class="px-2 py-1 text-left">用途</th><th class="px-2 py-1 text-left">進出日期</th><th class="px-2 py-1 text-left">停泊位置</th></tr></thead><tbody class="divide-y bg-white">${approved.map(v=>`<tr><td class="px-2 py-1 font-mono font-bold" data-label="車牌">${escapeHtml(v.plate)}</td><td class="px-2 py-1" data-label="司機">${escapeHtml(v.driver_name)}</td><td class="px-2 py-1 font-mono" data-label="電話">${escapeHtml(v.driver_contact)}</td><td class="px-2 py-1" data-label="組別">${escapeHtml(v.group_name||'-')}</td><td class="px-2 py-1" data-label="用途">${escapeHtml(v.purpose||'-')}</td><td class="px-2 py-1" data-label="進出">${escapeHtml(v.entry_date||'')}${v.exit_date&&v.exit_date!==v.entry_date?' → '+escapeHtml(v.exit_date):''}</td><td class="px-2 py-1" data-label="停泊">${escapeHtml(v.parking_location||'-')}</td></tr>`).join('')}</tbody></table></div>
          <div class="mt-2 text-[10px] text-slate-400">共 ${approved.length} 架已批核車輛 · 列印日期 ${new Date().toLocaleDateString()}</div>
        </div>
      </div>`;
    document.getElementById('record-modal-title').textContent=`入口檢查清單（已批核 ${approved.length} 架）`;
    document.getElementById('record-form-fields').innerHTML=html;
    document.getElementById('record-form').onsubmit=(e)=>e.preventDefault();
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  printEntranceChecklist(){
    if(!this.canExecuteArea('vehicle')){ showToast(`入口名單只供 ${this.approvalRouteLabel('vehicle','executor_groups')} 列印`,'error'); return; }
    const area=document.getElementById('entrance-check-print-area');
    if(!area){ showToast('找不到列印區域','error'); return; }
    const win=window.open('','_blank');
    win.document.write(`<html><head><title>入口檢查清單 - 已批核車輛</title><style>body{padding:20px;font-family:Noto Sans TC,sans-serif} h1{font-size:16px} table{width:100%;border-collapse:collapse;margin-top:10px} th,td{border:1px solid #999;padding:6px;font-size:12px} th{background:#eee}</style></head><body><h1>🚦 入口檢查清單（已批核車輛）</h1>${area.innerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    win.document.close();
  }
,
  /* ── 物資 CHECK LIST：已批核物資按組別點算（可剔選、列印） ── */
  getSuppliesChecklistState(){
    const key=LS.supplies(this.currentEvent?.event_id||'isd_2026')+'_checklist';
    return JSON.parse(localStorage.getItem(key)||'{}');
  }
,
  saveSuppliesChecklistState(st){
    const key=LS.supplies(this.currentEvent?.event_id||'isd_2026')+'_checklist';
    localStorage.setItem(key,JSON.stringify(st));
  }
,
  renderSuppliesChecklist(){
    const container=document.getElementById('supplies-tab-checklist'); if(!container) return;
    if(!this.canExecuteArea('supplies')){ container.innerHTML=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-900">物資執行／最後名單目前交由 ${escapeHtml(this.approvalRouteLabel('supplies','executor_groups'))} 負責。</div>`; return; }
    const data=this.getSuppliesData();
    const approved=(data.requests||[]).filter(r=>r.status==='approved'||r.status==='modified');
    const state=this.getSuppliesChecklistState();
    if(!approved.length){ container.innerHTML='<p class="text-xs text-slate-400 py-8 text-center">暫無已批核物資申請。批核完成後自動出現在此 Check List，方便按組別安排派發。</p>'; return; }
    const groups={};
    approved.forEach(r=>{ const g=r.group_name||'未分組'; if(!groups[g]) groups[g]=[]; groups[g].push(r); });
    const totalChecked=approved.filter(r=>state[r.request_id]).length;
    container.innerHTML=`
      <div class="space-y-3">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900"><b>✅ 物資 Check List：</b>已批核物資 ${approved.length} 項（已剔 ${totalChecked} 項），按組別點算派發。剔選狀態自動儲存於本裝置，可列印作核對。</div>
        <div class="flex gap-2 flex-wrap">
          <button onclick="app.printSupplyChecklist()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印 Check List</button>
          <button onclick="app.resetSupplyChecklist()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">重設全部剔選</button>
        </div>
        <div id="supplies-checklist-print-area" class="space-y-3">${Object.keys(groups).sort().map(g=>{
          const items=groups[g];
          const done=items.filter(r=>state[r.request_id]).length;
          return `<div class="bg-white border rounded-xl p-3">
            <div class="flex justify-between items-center mb-2"><b class="text-[13px]"><i class="fa-solid fa-people-group text-emerald-600 mr-1"></i>${escapeHtml(g)}</b><span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border">${done}/${items.length} 已點</span></div>
            <div class="space-y-1.5">${items.map(r=>`
              <label class="flex items-start gap-2 border rounded-xl p-2 ${state[r.request_id]?'bg-emerald-50 border-emerald-300':'bg-slate-50'} cursor-pointer">
                <input type="checkbox" ${state[r.request_id]?'checked':''} onchange="app.toggleSupplyChecklist('${r.request_id}')" class="mt-0.5">
                <span class="flex-1"><b class="text-[12px]">${escapeHtml(r.item_name)}</b> <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full border">${escapeHtml(r.qty_approved!==null&&r.qty_approved!==undefined?r.qty_approved:r.qty_requested)} ${escapeHtml(r.unit||'個')}</span><span class="text-[10px] text-slate-500 ml-1">需用: ${escapeHtml(r.date_needed||'-')} | 申請: ${escapeHtml(r.requested_by||'-')}</span></span>
                <span class="text-[10px] ${state[r.request_id]?'text-emerald-600 font-bold':'text-slate-300'}">${state[r.request_id]?'✓ 已點':'未點'}</span>
              </label>`).join('')}</div>
          </div>`;
        }).join('')}</div>
      </div>`;
  }
,
  toggleSupplyChecklist(id){
    if(!this.canExecuteArea('supplies')){ showToast('你不屬於指定物資執行組','error'); return; }
    const state=this.getSuppliesChecklistState();
    state[id]=!state[id];
    this.saveSuppliesChecklistState(state);
    this.renderSuppliesChecklist();
  }
,
  resetSupplyChecklist(){
    if(!this.canExecuteArea('supplies')){ showToast('你不屬於指定物資執行組','error'); return; }
    if(!confirm('重設全部剔選？')) return;
    this.saveSuppliesChecklistState({});
    this.renderSuppliesChecklist();
  }
,
  printSupplyChecklist(){
    if(!this.canExecuteArea('supplies')){ showToast(`物資最後名單只供 ${this.approvalRouteLabel('supplies','executor_groups')} 列印`,'error'); return; }
    const area=document.getElementById('supplies-checklist-print-area');
    if(!area){ showToast('找不到列印區域','error'); return; }
    const win=window.open('','_blank');
    win.document.write(`<html><head><title>物資 Check List</title><style>body{padding:20px;font-family:Noto Sans TC,sans-serif} h1{font-size:16px} .group{border:1px solid #ccc;border-radius:8px;padding:10px;margin-bottom:10px} table{width:100%;border-collapse:collapse;margin-top:6px} th,td{border:1px solid #999;padding:5px;font-size:12px;text-align:left} .done{background:#e7f6ec}</style></head><body><h1>✅ 物資 Check List（已批核）</h1><p>列印日期 ${new Date().toLocaleDateString()}</p>${area.innerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    win.document.close();
  }
,

  downloadVehicleTemplate(){
    const csv='plate,driver_name,driver_contact,vehicle_type,purpose,group_name,entry_date,exit_date,parking_location\nAM1234,陳大文,91234567,私家車,運送物資及音響器材,會操及典禮組,2026-10-03,2026-10-04,警察學院停車場A\nBV5678,李小明,92345678,貨車,運送帳篷及營具,主題節目組,2026-10-04,2026-10-04,主營地側\n';
    const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='vehicle_pass_template.csv'; a.click(); showToast('已下載車輛通行證範本','success');
  }
,
  handleVehicleFileUpload(file){
    if(!this.canManageAreaOperations('vehicle')){ showToast('只供指定車輛批核／執行組總主任以上批量匯入','error'); return; }
    if(!file) return;
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const text=e.target.result;
        let parsed=[];
        if(file.name.endsWith('.json')){
          const json=JSON.parse(text);
          parsed=Array.isArray(json)?json:json.vehicle_passes||[json];
        }else{
          const rows=parseCSV(text);
          parsed=rows.map(r=>({
            pass_id:'veh_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
            plate:r.plate||r.car_plate||r.車牌||'',
            driver_name:r.driver_name||r.driver||r.司機||'',
            driver_contact:r.driver_contact||r.contact||r.電話||'',
            vehicle_type:r.vehicle_type||r.車型||'私家車',
            purpose:r.purpose||r.reason||r.用途||'',
            group_name:r.group_name||r.group||'',
            entry_date:r.entry_date||r.entry||'',
            exit_date:r.exit_date||r.exit||'',
            parking_location:r.parking_location||r.parking||'',
            status:'pending',
            requested_by:r.requested_by||this.currentUser?.name||'',
            requested_by_id:this.currentUser?.user_id||'',
            created_at:new Date().toISOString()
          })).filter(v=>v.plate);
        }
        if(!parsed.length){ showToast('無有效資料','error'); return; }
        const data=this.getSuppliesData();
        data.vehicle_passes=[...(data.vehicle_passes||[]), ...parsed];
        this.saveSuppliesData(data);
        showToast(`已批量匯入 ${parsed.length} 筆車輛通行證`,'success');
        this.refreshSuppliesViews();
      }catch(err){ showToast('解析失敗:'+err.message,'error'); }
    };
    reader.readAsText(file);
  }
,
  exportVehicleData(){
    if(!this.canApproveArea('vehicle')&&!this.canExecuteArea('vehicle')){ showToast('只供指定車輛批核或執行組匯出','error'); return; }
    const data=this.getSuppliesData();
    const blob=new Blob([JSON.stringify(data.vehicle_passes||[],null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`vehicle_passes_${todayISO()}.json`; a.click(); showToast('已匯出車輛通行證 JSON','success');
  }
,
  openVehiclePassForm(editId=null){
    if(!this.canSubmitSupply()){ showToast('請先登入後提交申請','error'); this.openLoginModal(); return; }
    const data=this.getSuppliesData();
    const existing=editId?(data.vehicle_passes||[]).find(v=>v.pass_id===editId):null;
    const title=existing?'編輯車輛通行證':'申請車輛通行證 (登記車輛，和物資審批同樣)';
    let html=`
      <input type="hidden" id="vehicle-form-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="vehicle-form-id" value="${existing?.pass_id||''}">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">車牌號碼 *</label><input id="vehicle-plate" value="${escapeHtml(existing?.plate||'')}" required placeholder="例如 AM1234" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">司機姓名 *</label><input id="vehicle-driver" value="${escapeHtml(existing?.driver_name||'')}" required placeholder="司機姓名" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">司機聯絡電話 *</label><input id="vehicle-driver-contact" value="${escapeHtml(existing?.driver_contact||'')}" required placeholder="電話" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">車輛類型</label><select id="vehicle-type" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1"><option value="私家車" ${existing?.vehicle_type==='私家車'?'selected':''}>私家車</option><option value="貨車" ${existing?.vehicle_type==='貨車'?'selected':''}>貨車</option><option value="客貨車" ${existing?.vehicle_type==='客貨車'?'selected':''}>客貨車</option><option value="旅遊巴" ${existing?.vehicle_type==='旅遊巴'?'selected':''}>旅遊巴</option><option value="其他" ${existing?.vehicle_type==='其他'?'selected':''}>其他</option></select></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">用途/運送物資 *</label><input id="vehicle-purpose" value="${escapeHtml(existing?.purpose||'')}" required placeholder="例如 運送音響器材、帳篷" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">所屬組別 *</label><input id="vehicle-group" value="${escapeHtml(existing?.group_name||this.currentUser?.group_name||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">停泊位置</label><input id="vehicle-parking" value="${escapeHtml(existing?.parking_location||'')}" placeholder="例如 警察學院停車場A" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">進場日期 *</label><input type="date" id="vehicle-entry-date" value="${existing?.entry_date||''}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">離場日期</label><input type="date" id="vehicle-exit-date" value="${existing?.exit_date||''}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        
        <div class="col-span-2"><label class="text-[11px] font-bold">備註</label><textarea id="vehicle-notes" rows="2" placeholder="其他備註" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.notes||'')}</textarea></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">申請人</label><input value="${escapeHtml(this.currentUser?.name||'')}" readonly class="w-full px-3 py-2 border rounded-xl text-sm mt-1 bg-slate-50"></div>
      </div>
      <div class="text-[10px] text-slate-500 mt-2">低於總主任提交會先由本組確認，再交 ${escapeHtml(this.approvalRouteLabel('vehicle','approver_groups'))} 批核，最後由 ${escapeHtml(this.approvalRouteLabel('vehicle','executor_groups'))} 執行及查看最後名單。</div>
    `;
    document.getElementById('record-modal-title').textContent=title;
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitVehiclePassForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitVehiclePassForm(){
    const mode=document.getElementById('vehicle-form-mode').value;
    const id=document.getElementById('vehicle-form-id').value;
    const plate=document.getElementById('vehicle-plate').value.trim();
    const driver_name=document.getElementById('vehicle-driver').value.trim();
    const driver_contact=document.getElementById('vehicle-driver-contact').value.trim();
    const vehicle_type=document.getElementById('vehicle-type').value;
    const purpose=document.getElementById('vehicle-purpose').value.trim();
    let group_name=document.getElementById('vehicle-group').value.trim();
    if(this.roleLevel(this.currentUser?.role)<40) group_name=normalizeGroupName(this.currentUser?.group_name);
    const entry_date=document.getElementById('vehicle-entry-date').value;
    const exit_date=document.getElementById('vehicle-exit-date').value;
    
    const parking_location=document.getElementById('vehicle-parking').value.trim();
    const notes=document.getElementById('vehicle-notes')?.value.trim()||'';
    if(!plate||!driver_name||!driver_contact||!purpose||!group_name||!entry_date){ showToast('請填寫車牌、司機、聯絡、用途、組別、進場日期','error'); return; }
    const data=this.getSuppliesData();
    if(mode==='edit'){
      const idx=(data.vehicle_passes||[]).findIndex(v=>v.pass_id===id);
      if(idx>=0) data.vehicle_passes[idx]={...data.vehicle_passes[idx],...this.applicationConfirmationMeta(this.currentUser),plate,driver_name,driver_contact,vehicle_type,purpose,group_name,entry_date,exit_date,parking_location,notes,requested_by:this.currentUser?.name||'',requested_by_id:this.currentUser?.user_id||'',status:'pending',approved_by:'',approved_at:''};
    }else{
      if(!data.vehicle_passes) data.vehicle_passes=[];
      data.vehicle_passes.push({
        pass_id:'veh_'+Date.now(),
        event_id:this.currentEvent?.event_id||'isd_2026',
        plate,driver_name,driver_contact,vehicle_type,purpose,group_name,entry_date,exit_date,deadline:exit_date||entry_date,parking_location,notes,
        ...this.applicationConfirmationMeta(this.currentUser),
        status:'pending',requested_by:this.currentUser?.name||'',requested_by_id:this.currentUser?.user_id||'',approved_by:'',approved_at:'',created_at:new Date().toISOString()
      });
    }
    this.saveSuppliesData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    const saved=(data.vehicle_passes||[]).find(v=>v.pass_id===(id||(data.vehicle_passes||[]).at(-1)?.pass_id));
    showToast(mode==='edit'?'已更新車輛申請並重新進入流程':(this.applicationNeedsGroupConfirmation(saved)?'已提交車輛申請：待本組總主任確認':'已提交車輛申請：已交指定批核組'),'success');
    this.refreshSuppliesViews();
  }
,
  openVehicleApproveModifyModal(passId){
    if(!this.canApproveArea('vehicle')){ showToast('你不屬於目前指定的車輛批核組別','error'); return; }
    const data=this.getSuppliesData();
    const v=(data.vehicle_passes||[]).find(x=>x.pass_id===passId);
    if(!v) return;
    if(!this.applicationReadyForApproval(v)){ showToast('須先完成本組確認','warning'); return; }
    const html=`
      <input type="hidden" id="vehicle-approve-id" value="${v.pass_id}">
      <div class="space-y-3">
        <div class="bg-slate-50 border rounded-xl p-3 text-[11px]"><b>原申請：</b>${escapeHtml(v.plate)} | 司機: ${escapeHtml(v.driver_name)} | 組別: ${escapeHtml(v.group_name)}<br>用途: ${escapeHtml(v.purpose)} | 進出: ${escapeHtml(v.entry_date)}→${escapeHtml(v.exit_date)}</div>
        <div><label class="text-[11px] font-bold">批核停泊位置 (可修改)</label><input id="vehicle-approve-parking" value="${escapeHtml(v.parking_location||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">批核備註</label><textarea id="vehicle-approve-notes" rows="2" placeholder="例如：已安排停車場A車位" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></textarea></div>
        <div class="flex gap-2"><button type="button" onclick="app.approveVehiclePass('${v.pass_id}', true)" class="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold">批准</button><button type="button" onclick="app.rejectVehiclePass('${v.pass_id}')" class="flex-1 bg-rose-50 border border-rose-200 text-rose-600 py-2 rounded-xl text-xs font-bold">拒絕</button></div>
      </div>
    `;
    document.getElementById('record-modal-title').textContent=`${this.approvalRouteLabel('vehicle','approver_groups')} 批核車輛通行證`;
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.approveVehiclePass(v.pass_id, true); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  approveVehiclePass(passId, isModify=false){
    if(!this.canApproveArea('vehicle')){ showToast('你沒有車位/車輛批核權','error'); return; }
    const data=this.getSuppliesData();
    const idx=(data.vehicle_passes||[]).findIndex(v=>v.pass_id===passId);
    if(idx<0) return;
    if(!this.applicationReadyForApproval(data.vehicle_passes[idx])){ showToast('須先由申請人所屬組別總主任以上確認','warning'); return; }
    let parking=data.vehicle_passes[idx].parking_location;
    let notes='';
    if(isModify){
      const p=document.getElementById('vehicle-approve-parking'); if(p) parking=p.value.trim()||parking;
      const n=document.getElementById('vehicle-approve-notes'); if(n) notes=n.value.trim();
    }
    data.vehicle_passes[idx].parking_location=parking;
    data.vehicle_passes[idx].status='approved';
    data.vehicle_passes[idx].approved_by=(this.currentUser?.name||'')+`（${this.approvalRouteLabel('vehicle','approver_groups')}）`;
    data.vehicle_passes[idx].approved_at=new Date().toISOString();
    data.vehicle_passes[idx].notes=notes||'已批核';
    this.saveSuppliesData(data);
    const targetId=data.vehicle_passes[idx].requested_by_id||data.vehicle_passes[idx].requested_by;
    this.addSupplyNotification(targetId, {
      type:'vehicle_pass',
      item_name:'車輛通行證 '+data.vehicle_passes[idx].plate,
      qty_requested:1,
      qty_approved:1,
      status:'approved',
      approved_by:data.vehicle_passes[idx].approved_by,
      approved_at:data.vehicle_passes[idx].approved_at,
      message:`你的車輛通行證申請「${data.vehicle_passes[idx].plate} 司機 ${data.vehicle_passes[idx].driver_name}」已由 ${this.approvalRouteLabel('vehicle','approver_groups')} 批准，停泊：${parking||'待定'}。執行組：${this.approvalRouteLabel('vehicle','executor_groups')}。申請組別：${data.vehicle_passes[idx].group_name}`
    });
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已批准車輛通行證，已通知提交人','success');
    this.refreshSuppliesViews();
  }
,
  rejectVehiclePass(passId){
    if(!this.canApproveArea('vehicle')) return;
    const data=this.getSuppliesData();
    const idx=(data.vehicle_passes||[]).findIndex(v=>v.pass_id===passId);
    if(idx<0) return;
    if(!this.applicationReadyForApproval(data.vehicle_passes[idx])){ showToast('須先完成本組確認','warning'); return; }
    if(!confirm('確定拒絕此車輛通行證申請？')) return;
    data.vehicle_passes[idx].status='rejected';
    data.vehicle_passes[idx].approved_by=this.currentUser?.name||'';
    data.vehicle_passes[idx].approved_at=new Date().toISOString();
    data.vehicle_passes[idx].notes='已拒絕';
    this.saveSuppliesData(data);
    const targetId=data.vehicle_passes[idx].requested_by_id||data.vehicle_passes[idx].requested_by;
    this.addSupplyNotification(targetId, {
      type:'vehicle_pass',
      item_name:'車輛通行證 '+data.vehicle_passes[idx].plate,
      status:'rejected',
      approved_by:data.vehicle_passes[idx].approved_by,
      approved_at:data.vehicle_passes[idx].approved_at,
      message:`你的車輛通行證申請「${data.vehicle_passes[idx].plate}」已被拒絕，請聯絡 ${this.approvalRouteLabel('vehicle','approver_groups')}`
    });
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已拒絕並通知','warning');
    this.refreshSuppliesViews();
  }
,
  async deleteVehiclePass(passId){
    if(!this.isSuperAdmin()){ showToast('權限不足，無法永久刪除紀錄','error'); return; }
    if(!confirm('確定永久刪除此車輛通行證？APP、本機快取及後台紀錄都會刪除。')) return;
    this.markRecordDeleted('Vehicle_Passes',passId);
    const data=this.getSuppliesData();
    data.vehicle_passes=(data.vehicle_passes||[]).filter(v=>v.pass_id!==passId);
    this.saveSuppliesData(data);
    const result=await this.deleteGasRecord('Vehicle_Passes',passId);
    showToast(result.success?'已從 APP 及後台永久刪除':`APP 已隱藏，但後台刪除失敗：${result.error}`,result.success?'warning':'error');
    this.refreshSuppliesViews();
  }
,
});
