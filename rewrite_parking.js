const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /renderParkingModule\(\)\{[\s\S]*?exportParkingData\(\)\{[\s\S]*?\}\n/g;

const replacement = `renderParkingModule(){
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

    container.innerHTML=\`
      <div class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900">
          <b>🚗 車輛通行證 (含泊車證)：</b><br>
          • 所有登入成員可提交車輛資料；低於總主任提交的申請先由本組確認<br>
          • 目前由 \${escapeHtml(this.approvalRouteLabel('vehicle','approver_groups'))} 批核／修改，批准後交 \${escapeHtml(this.approvalRouteLabel('vehicle','executor_groups'))} 執行<br>
          • <b>入口檢查清單：</b>只供 \${escapeHtml(this.approvalRouteLabel('vehicle','executor_groups'))} 檢視、同步 (由 Excel) 及列印<br>
          • 與物資審批同樣運作，填寫車牌、司機及停泊日期
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchParkingTab('apply')" class="tab-btn \${this.parkingSubTab==='apply'?'active':''}"><i class="fa-solid fa-pen-to-square mr-1"></i> 我的申請 (\${apps.length})</button>
          \${canApprove?\`<button onclick="app.switchParkingTab('pending')" class="tab-btn \${this.parkingSubTab==='pending'?'active':''}"><i class="fa-solid fa-hourglass-half mr-1"></i> 待批核 (\${pending.length})</button>\`:''}
          \${canCheck?\`<button onclick="app.switchParkingTab('checklist')" class="tab-btn \${this.parkingSubTab==='checklist'?'active':''}"><i class="fa-solid fa-traffic-light mr-1"></i> 入口檢查清單</button>\`:''}
        </div>
        <div id="parking-tab-apply" class="\${this.parkingSubTab==='apply'?'':'hidden'}"></div>
        <div id="parking-tab-pending" class="\${this.parkingSubTab==='pending'?'':'hidden'}"></div>
        <div id="parking-tab-checklist" class="\${this.parkingSubTab==='checklist'?'':'hidden'}"></div>
      </div>
    \`;
    this.renderParkingApply();
    if(canApprove) this.renderParkingPending();
    if(canCheck) this.renderParkingChecklist();

    const actionsEl=document.getElementById('module-actions');
    if(actionsEl){
      actionsEl.innerHTML=\`<div class="flex gap-2 flex-wrap">
        \${loggedIn?\`<button onclick="app.openVehiclePassForm()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-car mr-1"></i>申請車輛通行證</button>\`:''}
        \${canCheck?\`<button onclick="app.syncParkingChecklistFromDrive()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步已批核清單 (Excel)</button>\`:''}
        \${canCheck||canApprove?\`<button onclick="app.exportParkingData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button>\`:''}
      </div>\`;
    }
  }
  switchParkingTab(tab){
    this.parkingSubTab=tab;
    document.querySelectorAll('[id^="parking-tab-"]').forEach(el=>el.classList.add('hidden'));
    document.getElementById('parking-tab-'+tab)?.classList.remove('hidden');
    document.querySelectorAll('[onclick^="app.switchParkingTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'tab-btn active':'tab-btn';
    });
  }
  renderParkingApply(){
    const container=document.getElementById('parking-tab-apply'); if(!container) return;
    if(!this.currentUser){
      container.innerHTML=\`<div class="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3">
        <div class="text-3xl"><i class="fa-solid fa-lock text-amber-400"></i></div>
        <div class="text-[13px] font-bold text-amber-900">車輛通行證申請需登入</div>
        <p class="text-[11px] text-amber-800">登入後即可填寫車輛通行證申請（車牌、司機、停泊日期等）。</p>
        <button onclick="app.openLoginModal()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-right-to-bracket mr-1"></i>登入</button>
      </div>\`;
      return;
    }
    const data=this.getSuppliesData();
    const myName=this.currentUser?.name||'', myId=this.currentUser?.user_id||'';
    const apps=(data.vehicle_passes||[]).filter(p=> p.requested_by_id===myId || (myName&&p.requested_by===myName)).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
    
    if(!apps.length){
      container.innerHTML=\`<p class="text-xs text-slate-400 py-8 text-center">暫無我的申請，點擊「申請車輛通行證」提交</p>\`;
      return;
    }
    
    const st={pending:['bg-amber-100 text-amber-700','待批核'],approved:['bg-emerald-100 text-emerald-700','已批核'],rejected:['bg-rose-100 text-rose-700','已拒絕']};
    container.innerHTML=\`<div class="space-y-3">\${apps.map(v=>{
      const s=st[v.status]||['bg-slate-100','—'];
      return \`<div class="border rounded-xl p-3 bg-white space-y-2">
        <div class="flex justify-between items-start gap-2">
          <div><div class="flex items-center gap-2 flex-wrap"><b class="text-[13px]">\${escapeHtml(v.plate)}</b> <span class="text-[10px] px-2 py-0.5 rounded-full border \${s[0]}">\${s[1]}</span><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">\${escapeHtml(v.group_name)}</span>\${v.status==='pending'?this.applicationStageHTML(v):''}</div>
          <div class="text-[11px] text-slate-500 mt-1">司機: \${escapeHtml(v.driver_name)} | 電話: \${escapeHtml(v.driver_contact)} | 車型: \${escapeHtml(v.vehicle_type)} | 用途: \${escapeHtml(v.purpose)}</div>
          <div class="text-[11px] text-slate-500">進出: \${escapeHtml(v.entry_date||'')} → \${escapeHtml(v.exit_date||'')} | 停泊: \${escapeHtml(v.parking_location||'-')}</div>
          \${v.notes?\`<div class="text-[10px] bg-amber-50 border border-amber-200 rounded-xl p-2 mt-1">批核備註: \${escapeHtml(v.notes)}</div>\`:''}
          </div>
          <div class="text-[10px] text-slate-400 text-right">\${v.approved_by?\`批核: \${escapeHtml(v.approved_by)}\`:''}</div>
        </div>
      </div>\`;
    }).join('')}</div>\`;
  }
  
  renderParkingPending(){
    const container=document.getElementById('parking-tab-pending'); if(!container) return;
    const data=this.getSuppliesData();
    const list=(data.vehicle_passes||[]).filter(v=>v.status==='pending');
    
    if(!list.length){ container.innerHTML='<p class="text-xs text-slate-400 py-8 text-center">暫無待批核車輛</p>'; return; }
    container.innerHTML=\`<div class="space-y-3">\${list.map(v=>{
      return \`<div class="border rounded-xl p-3 bg-white space-y-2">
        <div class="flex justify-between items-start gap-2">
          <div><div class="flex items-center gap-2 flex-wrap"><b class="text-[13px]">\${escapeHtml(v.plate)}</b><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">\${escapeHtml(v.group_name)}</span>\${this.applicationStageHTML(v)}</div>
          <div class="text-[11px] text-slate-500 mt-1">司機: \${escapeHtml(v.driver_name)} | 電話: \${escapeHtml(v.driver_contact)} | 車型: \${escapeHtml(v.vehicle_type)} | 用途: \${escapeHtml(v.purpose)}</div>
          <div class="text-[11px] text-slate-500">進出: \${escapeHtml(v.entry_date||'')} → \${escapeHtml(v.exit_date||'')} | 停泊: \${escapeHtml(v.parking_location||'-')} | 申請人: \${escapeHtml(v.requested_by)}</div>
          </div>
          <div class="flex flex-col gap-1 flex-shrink-0">
            \${this.canConfirmApplication(v)?\`<button onclick="app.confirmApplication('vehicle','\${v.pass_id}')" class="bg-sky-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">本組確認</button>\`:''}
            \${this.canApproveArea('vehicle') && this.applicationReadyForApproval(v)?\`<div class="flex gap-1"><button onclick="app.approveVehiclePass('\${v.pass_id}')" class="bg-emerald-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">批准</button><button onclick="app.openVehicleApproveModifyModal('\${v.pass_id}')" class="bg-sky-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold">安排車位</button><button onclick="app.rejectVehiclePass('\${v.pass_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1 rounded-xl text-[11px]">拒絕</button></div>\`:''}
            \${this.isSuperAdmin()?\`<button onclick="app.deleteVehiclePass('\${v.pass_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️ 刪除</button>\`:''}
          </div>
        </div>
      </div>\`;
    }).join('')}</div>\`;
  }
  
  renderParkingChecklist(){
    const container=document.getElementById('parking-tab-checklist'); if(!container) return;
    const data=this.getSuppliesData();
    const list=(data.vehicle_passes||[]).filter(v=>v.status==='approved');
    
    // Also merge parking checklist if any
    const parkData=this.getParkingData();
    const externalList=(parkData.checklist&&parkData.checklist.vehicles)||[];
    
    if(!list.length && !externalList.length){
      container.innerHTML=\`<div class="bg-white border rounded-xl p-6 text-center space-y-2">
        <div class="text-3xl"><i class="fa-solid fa-traffic-light text-slate-300"></i></div>
        <p class="text-[12px] text-slate-500">尚未有已批核車輛清單。</p>
        <button onclick="app.syncParkingChecklistFromDrive()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步外部已批核清單 (Excel)</button>
      </div>\`;
      return;
    }
    
    container.innerHTML=\`
      <div class="space-y-3">
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-900"><b>🚦 入口檢查清單（已批核 \${list.length + externalList.length} 架）：</b>入口工作人員可按車牌核對，可列印貼於入口。</div>
        <div class="flex gap-2 flex-wrap"><button onclick="app.printParkingChecklist()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印清單</button></div>
        <div id="parking-checklist-print-area" class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100 font-bold"><tr><th class="px-2 py-1 text-left">車牌</th><th class="px-2 py-1 text-left">司機</th><th class="px-2 py-1 text-left">電話</th><th class="px-2 py-1 text-left">組別</th><th class="px-2 py-1 text-left">車型</th><th class="px-2 py-1 text-left">停泊日期</th><th class="px-2 py-1 text-left">停泊位置</th></tr></thead><tbody class="divide-y bg-white">
        \${list.map(v=>\`<tr><td class="px-2 py-1 font-mono font-bold" data-label="車牌">\${escapeHtml(v.plate)}</td><td class="px-2 py-1" data-label="司機">\${escapeHtml(v.driver_name)}</td><td class="px-2 py-1 font-mono" data-label="電話">\${escapeHtml(v.driver_contact)}</td><td class="px-2 py-1" data-label="組別">\${escapeHtml(v.group_name||'-')}</td><td class="px-2 py-1" data-label="車型">\${escapeHtml(v.vehicle_type||'-')}</td><td class="px-2 py-1" data-label="停泊">\${escapeHtml(v.entry_date||'')} → \${escapeHtml(v.exit_date||'')}</td><td class="px-2 py-1" data-label="位置">\${escapeHtml(v.parking_location||'-')}</td></tr>\`).join('')}
        \${externalList.map(v=>\`<tr><td class="px-2 py-1 font-mono font-bold text-sky-700" data-label="車牌">\${escapeHtml(v.plate)} (外部)</td><td class="px-2 py-1" data-label="司機">\${escapeHtml(v.driver_name)}</td><td class="px-2 py-1 font-mono" data-label="電話">\${escapeHtml(v.contact)}</td><td class="px-2 py-1" data-label="組別">\${escapeHtml(v.group_name||'-')}</td><td class="px-2 py-1" data-label="車型">\${escapeHtml(v.unit||'-')}</td><td class="px-2 py-1" data-label="停泊">\${escapeHtml(v.park_date||'-')}</td><td class="px-2 py-1" data-label="位置">-</td></tr>\`).join('')}
        </tbody></table></div>
      </div>\`;
  }
  printParkingChecklist(){
    const area=document.getElementById('parking-checklist-print-area');
    if(!area){ showToast('找不到列印區域','error'); return; }
    const win=window.open('','_blank');
    win.document.write(\`<html><head><title>車輛通行證入口檢查清單</title><style>body{padding:20px;font-family:Noto Sans TC,sans-serif} h1{font-size:16px} table{width:100%;border-collapse:collapse;margin-top:10px} th,td{border:1px solid #999;padding:6px;font-size:12px} th{background:#eee}</style></head><body><h1>🚦 車輛通行證入口檢查清單（已批核）</h1><p>列印日期 \${new Date().toLocaleDateString()}</p>\${area.innerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\\/script></body></html>\`);
    win.document.close();
  }
  exportParkingData(){
    const data=this.getSuppliesData();
    const blob=new Blob([JSON.stringify(data.vehicle_passes||[],null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=\`vehicle_passes_\${todayISO()}.json\`; a.click();
    showToast('已匯出 JSON','success');
  }
`;

html = html.replace(regex, replacement);

fs.writeFileSync('index.html', html, 'utf8');
