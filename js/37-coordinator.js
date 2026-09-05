/* 37-coordinator.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{
  /* ===================== 協調組 (物資 · 車輛 · 膳食 · 場地) =====================
     協調組是物資借用、車輛通行證及膳食的管理組：
     1 頁物資、1 頁車輛、1 頁膳食，睇到具體資料同狀態，可批核、統計、列印、匯出最終清單 */
  coordTabs(){
    return [
      {k:'overview', icon:'fa-solid fa-gauge-high', label:'總覽'},
      {k:'supplies', icon:'fa-solid fa-boxes-stacked', label:'物資'},
      {k:'vehicle',  icon:'fa-solid fa-car', label:'車輛通行證'},
      {k:'meals',    icon:'fa-solid fa-utensils', label:'膳食'},
      {k:'docs',     icon:'fa-solid fa-folder-open', label:'場地佈置及文件'}
    ];
  }
,
  // v12.2：協調組統一用 openGroupManagement 部門中心基本形態（特色＝頂部頁籤）；保留方法名作兼容
  renderCoordinatorGroupModule(){ this.openGroupManagement('協調組'); }
,
  renderCoordinatorGroupModuleOld(){
    const container=document.getElementById('module-content');
    if(!container) return;
    if(!this.coordSubTab) this.coordSubTab='overview';
    // v12.2：協調組統一為部門中心基本形態（同其他組／行政組）——頁籤全部喺頂部；
    // 「總覽」＝基本盤（本組成員/職務/文件/攤位＋本組申請統計＋列印）＋協調批核總覽；物資/車輛/膳食/文件為特色頁籤。
    const actionsEl=document.getElementById('module-actions');
    if(actionsEl) actionsEl.innerHTML=`<div class="flex gap-2 flex-wrap"><button onclick="app.printCoordArea('coord-group-stats-print','協調組 - 本組申請統計')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印本組統計</button></div>`;
    const sup=this.getSuppliesData();
    const meals=this.getMealsData();
    const routeVisible=(area,items,approved)=>this.canApproveArea(area)?(items||[]):this.canExecuteArea(area)?(items||[]).filter(x=>approved.includes(x.status)):[];
    const visibleSup=routeVisible('supplies',sup.requests,['approved','modified']);
    const visibleVeh=routeVisible('vehicle',sup.vehicle_passes,['approved']);
    const visibleMeals=routeVisible('meals',meals.orders,['approved']);
    const counts={supplies:visibleSup.length,vehicle:visibleVeh.length,meals:visibleMeals.length,docs:(this.getCoordinatorGroupData().docs||[]).length};
    const pend={supplies:visibleSup.filter(r=>r.status==='pending').length,vehicle:visibleVeh.filter(v=>v.status==='pending').length,meals:visibleMeals.filter(o=>o.status==='pending'||o.status==='group_ok').length};
    const actualCoordinator=normalizeGroupName(this.currentUser?.group_name)==='協調組';
    const allowedTabs=new Set(['overview',...(this.canApproveArea('supplies')||this.canExecuteArea('supplies')?['supplies']:[]),...(this.canApproveArea('vehicle')||this.canExecuteArea('vehicle')?['vehicle']:[]),...(this.canApproveArea('meals')||this.canExecuteArea('meals')?['meals']:[]),...(actualCoordinator||this.canManageApprovalRouting()?['docs']:[])]);
    if(!allowedTabs.has(this.coordSubTab)) this.coordSubTab='overview';
    const tabCls=t=>this.coordSubTab===t?'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-900 text-white shadow':'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200';
    const tabBtns=this.coordTabs().filter(t=>allowedTabs.has(t.k)).map(t=>{
      const c=counts[t.k]!==undefined?` (${counts[t.k]})`:'';
      const badge=pend[t.k]?`<span class="ml-1 bg-amber-500 text-white text-[9.5px] px-1.5 py-0.5 rounded-full">${pend[t.k]} 待批</span>`:'';
      return `<button onclick="app.switchCoordTab('${t.k}')" class="${tabCls(t.k)}"><i class="${t.icon} mr-1"></i> ${t.label}${c}${badge}</button>`;
    }).join('');
    const active=this.coordSubTab;
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-orange-50 border border-orange-200 rounded-xl p-3 text-[11px] leading-relaxed">
          <b>部門管理中心 - 協調組</b><br>
          <b>🏗️ 協調組職能：</b>物資借用、車輛通行證及膳食的批核／執行組（實際批核組與執行／最後名單組以「批核權限表」的多選設定為準，可隨時改為一組或多組）。<br>
          申請入口統一在「申請中心」（各組提交），提交後即時在「待批核」出現。場地佈置圖、物資借用表格、箱頭紙及數據在「場地佈置及文件」頁。
        </div>
        <div class="flex gap-2 flex-wrap">
          <button onclick="app.openModule('apply_hub')" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-pen mr-1"></i>前往申請中心提交申請</button>
          <button onclick="app.openModule('my_monitor')" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-eye mr-1"></i>我的監察</button>
          <button onclick="app.openBoxLabelModal('協調組')" class="bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-box-open mr-1"></i>箱頭紙</button>
        </div>
        <div class="flex gap-2 border-b pb-2 overflow-x-auto flex-wrap">${tabBtns}</div>

        <div id="coord-tab-overview" class="space-y-4 ${active==='overview'?'':'hidden'}">
          ${this.groupInfoBoxesHTML('協調組')}
          <div class="bg-white border rounded-xl p-3" id="coord-group-stats-print">
            <div class="flex items-center justify-between flex-wrap gap-2 mb-2 no-print">
              <h4 class="font-bold text-[13px] flex items-center gap-2"><i class="fa-solid fa-chart-column text-indigo-600"></i>本組申請統計（協調組）</h4>
              <button onclick="app.printCoordArea('coord-group-stats-print','協調組 - 本組申請統計')" class="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-print mr-1"></i>列印統計</button>
            </div>
            ${this.groupApplyStatsHTML('協調組',{printId:'coord-group-stats-print-inner'})}
          </div>
          <div id="coord-overview-body"></div>
        </div>
        <div id="coord-tab-supplies" class="${active==='supplies'?'':'hidden'}"></div>
        <div id="coord-tab-vehicle" class="${active==='vehicle'?'':'hidden'}"></div>
        <div id="coord-tab-meals" class="${active==='meals'?'':'hidden'}"></div>
        <div id="coord-tab-docs" class="${active==='docs'?'':'hidden'}"></div>
      </div>`;
    const ov=document.getElementById('coord-overview-body');
    if(ov) this.renderCoordOverview(ov);
    const supEl=document.getElementById('coord-tab-supplies');
    if(supEl) this.renderCoordSupplies(supEl);
    const vehEl=document.getElementById('coord-tab-vehicle');
    if(vehEl) this.renderCoordVehicles(vehEl);
    const mealEl=document.getElementById('coord-tab-meals');
    if(mealEl) this.renderCoordMeals(mealEl);
    const docEl=document.getElementById('coord-tab-docs');
    if(docEl) this.renderCoordDocs(docEl);
  }
,
  // v12.2：頁籤只切換顯示（全部內容已一併渲染，唔使重繪）
  switchCoordTab(tab){
    this.coordSubTab=tab;
    ['overview','supplies','vehicle','meals','docs'].forEach(t=>{
      const el=document.getElementById('coord-tab-'+t);
      if(el) el.classList.toggle('hidden',t!==tab);
    });
    document.querySelectorAll('[onclick^="app.switchCoordTab"]').forEach(btn=>{
      const m=btn.getAttribute('onclick').match(/'([^']+)'/);
      const t=m?m[1]:'';
      btn.className=t===tab?'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-900 text-white shadow':'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200';
    });
  }
,
  coordStatusChip(status){
    const M={pending:{t:'待批核',c:'bg-amber-100 text-amber-700 border-amber-300'},
      approved:{t:'已批核',c:'bg-emerald-100 text-emerald-700 border-emerald-300'},
      modified:{t:'已批核(修改數量)',c:'bg-sky-100 text-sky-700 border-sky-300'},
      rejected:{t:'已拒絕',c:'bg-rose-100 text-rose-700 border-rose-300'},
      group_ok:{t:'組長已確認',c:'bg-sky-100 text-sky-700 border-sky-300'}};
    const m=M[status]||{t:status||'-',c:'bg-slate-100 text-slate-600 border-slate-300'};
    return `<span class="text-[10px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${m.c}">${m.t}</span>`;
  }
,
  renderCoordOverview(box){
    const sup=this.getSuppliesData();
    const meals=this.getMealsData();
    const visible=(area,items,approvedStatuses)=>{
      if(this.canApproveArea(area)) return items||[];
      if(this.canExecuteArea(area)) return (items||[]).filter(x=>approvedStatuses.includes(x.status));
      return [];
    };
    const reqs=visible('supplies',sup.requests,['approved','modified']);
    const vehs=visible('vehicle',sup.vehicle_passes,['approved']);
    const orders=visible('meals',meals.orders,['approved']);
    const n=(arr,st)=>arr.filter(x=>x.status===st).length;
    const card=(icon,color,title,total,rows,tab)=>`
      <div class="border rounded-2xl p-4 bg-white space-y-2 cursor-pointer hover:shadow-md transition" onclick="app.switchCoordTab('${tab}')">
        <div class="flex items-center gap-2"><i class="${icon} ${color}"></i><b class="text-[13px]">${title}</b><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border">${total} 宗</span></div>
        <div class="grid grid-cols-3 gap-1.5 text-center">${rows}</div>
        <button class="w-full bg-slate-900 text-white py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-arrow-right mr-1"></i>進入處理</button>
      </div>`;
    const cell=(v,l,cls)=>`<div class="${cls} rounded-lg py-1.5"><div class="text-[15px] font-extrabold">${v}</div><div class="text-[9.5px]">${l}</div></div>`;
    // 按組別統計（所有申請一覽）
    const groups=this.getEventGroups();
    const rowsByGroup=groups.map(g=>{
      const match=x=>normalizeGroupName(x.group_name)===normalizeGroupName(g);
      const gr=reqs.filter(match),gv=vehs.filter(match),go=orders.filter(match);
      if(!gr.length&&!gv.length&&!go.length) return '';
      return `<tr><td class="border px-2 py-1 font-bold">${escapeHtml(g)}</td>
        <td class="border px-2 py-1 text-center">${gr.length} <span class="text-[10px] text-amber-600">(${gr.filter(x=>x.status==='pending').length} 待批)</span></td>
        <td class="border px-2 py-1 text-center">${gv.length} <span class="text-[10px] text-amber-600">(${gv.filter(x=>x.status==='pending').length} 待批)</span></td>
        <td class="border px-2 py-1 text-center">${go.length} <span class="text-[10px] text-amber-600">(${go.filter(x=>x.status==='pending'||x.status==='group_ok').length} 待處理)</span></td></tr>`;
    }).join('');
    box.innerHTML=`
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          ${card('fa-solid fa-boxes-stacked','text-blue-600','物資借用申請',reqs.length,
            cell(n(reqs,'pending'),'待批核','bg-amber-50 text-amber-700 border border-amber-100')+
            cell(n(reqs,'approved')+n(reqs,'modified'),'已批核','bg-emerald-50 text-emerald-700 border border-emerald-100')+
            cell(n(reqs,'rejected'),'已拒絕','bg-rose-50 text-rose-700 border border-rose-100'),'supplies')}
          ${card('fa-solid fa-car','text-amber-600','車輛通行證（泊車）',vehs.length,
            cell(n(vehs,'pending'),'待批核','bg-amber-50 text-amber-700 border border-amber-100')+
            cell(n(vehs,'approved'),'已批核','bg-emerald-50 text-emerald-700 border border-emerald-100')+
            cell(n(vehs,'rejected'),'已拒絕','bg-rose-50 text-rose-700 border border-rose-100'),'vehicle')}
          ${card('fa-solid fa-utensils','text-purple-600','膳食訂餐',orders.length,
            cell(n(orders,'pending'),'待組長確認','bg-amber-50 text-amber-700 border border-amber-100')+
            cell(n(orders,'group_ok'),'待指定組批核','bg-sky-50 text-sky-700 border border-sky-100')+
            cell(n(orders,'approved'),'已審批','bg-emerald-50 text-emerald-700 border border-emerald-100'),'meals')}
        </div>
        <div class="bg-white border rounded-2xl p-4">
          <div class="flex justify-between items-center flex-wrap gap-2 mb-2">
            <b class="text-[13px]"><i class="fa-solid fa-chart-column text-indigo-600 mr-1"></i>各組申請統計一覽</b>
            <button onclick="app.printCoordArea('coord-overview-print','各組申請統計一覽')" class="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-print mr-1"></i>列印統計</button>
          </div>
          <div id="coord-overview-print" class="table-responsive">
            <table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1 text-left">組別</th><th class="border px-2 py-1">物資申請</th><th class="border px-2 py-1">車輛通行證</th><th class="border px-2 py-1">膳食訂餐</th></tr></thead>
            <tbody>${rowsByGroup||'<tr><td colspan="4" class="border px-2 py-4 text-center text-slate-400">暫無任何申請</td></tr>'}</tbody></table>
          </div>
        </div>
      </div>`;
  }
,
  /* ── 物資頁：具體資料 · 狀態 · 批核 · 統計 · 列印 · 匯出最終清單 ── */
  renderCoordSupplies(box){
    const canApprove=this.canApproveArea('supplies'),canExecute=this.canExecuteArea('supplies');
    if(!canApprove&&!canExecute){ box.innerHTML=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px]">物資目前由 ${escapeHtml(this.approvalRouteLabel('supplies','approver_groups'))} 批核、${escapeHtml(this.approvalRouteLabel('supplies','executor_groups'))} 執行。</div>`; return; }
    const data=this.getSuppliesData();
    const reqs=(data.requests||[]).filter(r=>canApprove||['approved','modified'].includes(r.status)).slice().sort((a,b)=>(a.status==='pending'?-1:1)-(b.status==='pending'?-1:1));
    const byGroup={};
    reqs.forEach(r=>{ const g=r.group_name||'未分組'; if(!byGroup[g]) byGroup[g]={count:0,qty:0,approved:0}; byGroup[g].count++; byGroup[g].qty+=Number(r.qty_requested)||0; if(r.status==='approved'||r.status==='modified') byGroup[g].approved+=Number(r.qty_approved!==null&&r.qty_approved!==undefined?r.qty_approved:r.qty_requested)||0; });
    const byItem={};
    reqs.forEach(r=>{ const i=r.item_name||'未命名'; if(!byItem[i]) byItem[i]={req:0,app:0}; byItem[i].req+=Number(r.qty_requested)||0; if(r.status==='approved'||r.status==='modified') byItem[i].app+=Number(r.qty_approved!==null&&r.qty_approved!==undefined?r.qty_approved:r.qty_requested)||0; });
    const rows=reqs.map(r=>`
      <tr>
        <td class="border px-2 py-1">${escapeHtml(r.group_name||'-')}</td>
        <td class="border px-2 py-1 font-bold">${escapeHtml(r.item_name||'')}</td>
        <td class="border px-2 py-1 text-center">${r.qty_requested||0} ${escapeHtml(r.unit||'')}</td>
        <td class="border px-2 py-1 text-center">${r.qty_approved!==null&&r.qty_approved!==undefined?r.qty_approved:'-'}</td>
        <td class="border px-2 py-1">${escapeHtml(r.date_needed||'-')}</td>
        <td class="border px-2 py-1">${escapeHtml(r.requested_by||'')}<div class="text-[10px] text-slate-400">${escapeHtml(r.contact||'')}</div></td>
        <td class="border px-2 py-1">${escapeHtml(r.reason||'')}</td>
        <td class="border px-2 py-1 text-center">${this.coordStatusChip(r.status)}<div class="text-[10px] text-slate-400">${escapeHtml(r.approved_by||'')}</div></td>
        <td class="border px-2 py-1 no-print">${canApprove&&r.status==='pending'&&this.applicationReadyForApproval(r)?`<div class="flex flex-wrap gap-1"><button onclick="app.approveSupplyRequest('${r.request_id}')" class="bg-emerald-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold">批准</button><button onclick="app.openSupplyApproveModifyModal('${r.request_id}')" class="bg-sky-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold">改量</button><button onclick="app.rejectSupplyRequest('${r.request_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-lg text-[10px] font-bold">拒絕</button></div>`:'<span class="text-[10px] text-slate-400">-</span>'}</td>
      </tr>`).join('');
    box.innerHTML=`
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2 items-center">
          ${canApprove?`<span class="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full font-bold"><i class="fa-solid fa-user-check mr-1"></i>你可批核物資</span>`:`<span class="text-[11px] bg-slate-100 text-slate-500 border px-3 py-1.5 rounded-full">只讀（無物資批核權）</span>`}
          <button onclick="app.printCoordArea('coord-supplies-print','物資申請及批核清單')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印清單</button>
          ${canExecute?`<button onclick="app.exportCoordSuppliesCSV()" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>匯出最終清單 (已批核)</button>`:''}
          <button onclick="app.openModule('supplies')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">開啟完整物資模組</button>
        </div>
        <div id="coord-supplies-print" class="space-y-3">
          <div class="text-center border-b-2 border-slate-900 pb-2 hidden print-title"><h2 class="text-lg font-extrabold">物資申請及批核清單</h2></div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="bg-white border rounded-xl p-3">
              <b class="text-[12px]"><i class="fa-solid fa-layer-group text-blue-600 mr-1"></i>按組別統計</b>
              <table class="min-w-full text-[11px] border mt-2"><thead class="bg-slate-100"><tr><th class="border px-2 py-1 text-left">組別</th><th class="border px-2 py-1">宗數</th><th class="border px-2 py-1">申請數量</th><th class="border px-2 py-1">已批數量</th></tr></thead>
              <tbody>${Object.keys(byGroup).map(g=>`<tr><td class="border px-2 py-1">${escapeHtml(g)}</td><td class="border px-2 py-1 text-center">${byGroup[g].count}</td><td class="border px-2 py-1 text-center">${byGroup[g].qty}</td><td class="border px-2 py-1 text-center font-bold text-emerald-700">${byGroup[g].approved}</td></tr>`).join('')||'<tr><td colspan="4" class="border px-2 py-3 text-center text-slate-400">暫無</td></tr>'}</tbody></table>
            </div>
            <div class="bg-white border rounded-xl p-3">
              <b class="text-[12px]"><i class="fa-solid fa-boxes-stacked text-blue-600 mr-1"></i>按物資統計（落單用）</b>
              <table class="min-w-full text-[11px] border mt-2"><thead class="bg-slate-100"><tr><th class="border px-2 py-1 text-left">物資</th><th class="border px-2 py-1">申請總數</th><th class="border px-2 py-1">批核總數</th></tr></thead>
              <tbody>${Object.keys(byItem).map(i=>`<tr><td class="border px-2 py-1">${escapeHtml(i)}</td><td class="border px-2 py-1 text-center">${byItem[i].req}</td><td class="border px-2 py-1 text-center font-bold text-emerald-700">${byItem[i].app}</td></tr>`).join('')||'<tr><td colspan="3" class="border px-2 py-3 text-center text-slate-400">暫無</td></tr>'}</tbody></table>
            </div>
          </div>
          <div class="bg-white border rounded-xl p-3">
            <b class="text-[12px]"><i class="fa-solid fa-list text-blue-600 mr-1"></i>全部物資申請詳情 (${reqs.length})</b>
            <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">組別</th><th class="border px-2 py-1">物資</th><th class="border px-2 py-1">申請</th><th class="border px-2 py-1">批核</th><th class="border px-2 py-1">需用日期</th><th class="border px-2 py-1">申請人</th><th class="border px-2 py-1">用途</th><th class="border px-2 py-1">狀態</th><th class="border px-2 py-1 no-print">操作</th></tr></thead>
            <tbody>${rows||'<tr><td colspan="9" class="border px-2 py-6 text-center text-slate-400">暫無物資申請（各組於「申請中心 → 物資申請」提交）</td></tr>'}</tbody></table></div>
          </div>
        </div>
      </div>`;
  }
,
  /* ── 車輛通行證頁（含泊車）── */
  renderCoordVehicles(box){
    const canApprove=this.canApproveArea('vehicle'),canExecute=this.canExecuteArea('vehicle');
    if(!canApprove&&!canExecute){ box.innerHTML=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px]">車輛目前由 ${escapeHtml(this.approvalRouteLabel('vehicle','approver_groups'))} 批核、${escapeHtml(this.approvalRouteLabel('vehicle','executor_groups'))} 執行。</div>`; return; }
    const data=this.getSuppliesData();
    const vehs=(data.vehicle_passes||[]).filter(v=>canApprove||v.status==='approved').slice().sort((a,b)=>(a.status==='pending'?-1:1)-(b.status==='pending'?-1:1));
    const approved=vehs.filter(v=>v.status==='approved');
    const rows=vehs.map(v=>`
      <tr>
        <td class="border px-2 py-1">${escapeHtml(v.group_name||'-')}</td>
        <td class="border px-2 py-1 font-bold">${escapeHtml(v.plate||'')}</td>
        <td class="border px-2 py-1">${escapeHtml(v.driver_name||'')}<div class="text-[10px] text-slate-400">${escapeHtml(v.driver_contact||'')}</div></td>
        <td class="border px-2 py-1">${escapeHtml(v.vehicle_type||'')}</td>
        <td class="border px-2 py-1">${escapeHtml(v.purpose||'')}</td>
        <td class="border px-2 py-1">${escapeHtml(v.entry_date||'')} → ${escapeHtml(v.exit_date||'')}</td>
        <td class="border px-2 py-1">${escapeHtml(v.parking_location||'待定')}</td>
        <td class="border px-2 py-1 text-center">${this.coordStatusChip(v.status)}<div class="text-[10px] text-slate-400">${escapeHtml(v.approved_by||'')}</div></td>
        <td class="border px-2 py-1 no-print">${canApprove&&v.status==='pending'&&this.applicationReadyForApproval(v)?`<div class="flex flex-wrap gap-1"><button onclick="app.approveVehiclePass('${v.pass_id}')" class="bg-emerald-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold">批准</button><button onclick="app.openVehicleApproveModifyModal('${v.pass_id}')" class="bg-sky-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold">改停泊</button><button onclick="app.rejectVehiclePass('${v.pass_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-lg text-[10px] font-bold">拒絕</button></div>`:'<span class="text-[10px] text-slate-400">-</span>'}</td>
      </tr>`).join('');
    box.innerHTML=`
      <div class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px]"><b>🚗 車輛通行證（已包含泊車證）：</b>各組於「申請中心 → 車輛通行證申請」提交；${escapeHtml(this.approvalRouteLabel('vehicle','approver_groups'))} 批核後，由 ${escapeHtml(this.approvalRouteLabel('vehicle','executor_groups'))} 取得入口檢查清單。</div>
        <div class="flex flex-wrap gap-2 items-center">
          ${canApprove?`<span class="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full font-bold"><i class="fa-solid fa-user-check mr-1"></i>你可批核車輛</span>`:`<span class="text-[11px] bg-slate-100 text-slate-500 border px-3 py-1.5 rounded-full">只讀（無車輛批核權）</span>`}
          ${canExecute?`<button onclick="app.printCoordArea('coord-vehicle-print','車輛通行證及入口檢查清單')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印入口檢查清單</button>
          <button onclick="app.exportCoordVehiclesCSV()" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>匯出最終清單 (已批核)</button>`:''}
        </div>
        <div id="coord-vehicle-print" class="space-y-3">
          <div class="bg-white border rounded-xl p-3">
            <b class="text-[12px]"><i class="fa-solid fa-list text-amber-600 mr-1"></i>全部車輛通行證申請 (${vehs.length})</b>
            <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">組別</th><th class="border px-2 py-1">車牌</th><th class="border px-2 py-1">司機</th><th class="border px-2 py-1">車種</th><th class="border px-2 py-1">用途</th><th class="border px-2 py-1">進出</th><th class="border px-2 py-1">停泊</th><th class="border px-2 py-1">狀態</th><th class="border px-2 py-1 no-print">操作</th></tr></thead>
            <tbody>${rows||'<tr><td colspan="9" class="border px-2 py-6 text-center text-slate-400">暫無車輛申請</td></tr>'}</tbody></table></div>
          </div>
          <div class="bg-white border rounded-xl p-3">
            <b class="text-[12px]"><i class="fa-solid fa-clipboard-check text-emerald-600 mr-1"></i>入口檢查清單（已批核 ${approved.length}）</b>
            <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">車牌</th><th class="border px-2 py-1">司機</th><th class="border px-2 py-1">組別</th><th class="border px-2 py-1">進出日期</th><th class="border px-2 py-1">停泊位置</th><th class="border px-2 py-1">入口核對 ✓</th></tr></thead>
            <tbody>${approved.map(v=>`<tr><td class="border px-2 py-1 font-bold">${escapeHtml(v.plate||'')}</td><td class="border px-2 py-1">${escapeHtml(v.driver_name||'')} ${escapeHtml(v.driver_contact||'')}</td><td class="border px-2 py-1">${escapeHtml(v.group_name||'')}</td><td class="border px-2 py-1">${escapeHtml(v.entry_date||'')} → ${escapeHtml(v.exit_date||'')}</td><td class="border px-2 py-1">${escapeHtml(v.parking_location||'待定')}</td><td class="border px-2 py-1"></td></tr>`).join('')||'<tr><td colspan="6" class="border px-2 py-6 text-center text-slate-400">尚未有已批核車輛</td></tr>'}</tbody></table></div>
          </div>
        </div>
      </div>`;
  }
,
  /* ── 膳食頁：菜單 · 訂餐狀態 · 統計 · 列印派發 ── */
  renderCoordMeals(box){
    if(!this.canExecuteArea('meals')&&!this.canApproveArea('meals')){ box.innerHTML=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-900">膳食目前由 ${escapeHtml(this.approvalRouteLabel('meals','approver_groups'))} 批核，並由 ${escapeHtml(this.approvalRouteLabel('meals','executor_groups'))} 執行及持有最後名單。你可到批核中心查看自己的權限。</div>`; return; }
    const data=this.getMealsData();
    const canRouteApprove=this.canApproveArea('meals'),canRouteExecute=this.canExecuteArea('meals');
    const menus=data.menus||[],orders=(data.orders||[]).filter(o=>canRouteApprove||o.status==='approved');
    const canManageMenu=this.canManageMealMenu()||this.isAdmin();
    const canConfirm=!!this.currentUser && (this.isAdmin()||this.isExecViceOrChair()||this.roleLevel(this.currentUser.role)>=40);
    const canFinal=this.canFinalApproveMealOrder();
    const menuBlocks=menus.map(m=>{
      const list=orders.filter(o=>o.menu_id===m.menu_id && o.status!=='rejected');
      const approvedList=list.filter(o=>o.status==='approved');
      const stat={};
      approvedList.forEach(o=>{ stat[o.selection]=(stat[o.selection]||0)+(Number(o.quantity)||1); });
      const statAll={};
      list.forEach(o=>{ statAll[o.selection]=(statAll[o.selection]||0)+(Number(o.quantity)||1); });
      const byGroup={};
      approvedList.forEach(o=>{ const g=o.group_name||'未分組'; if(!byGroup[g]) byGroup[g]={}; byGroup[g][o.selection]=(byGroup[g][o.selection]||0)+(Number(o.quantity)||1); });
      return `<div class="bg-white border rounded-xl p-3 space-y-2">
        <div class="flex justify-between items-start flex-wrap gap-2">
          <div><b class="text-[13px]">${escapeHtml(m.date||'')} ${escapeHtml(m.meal_type||'')} · ${escapeHtml(m.menu_desc||'')}</b>
          <div class="text-[10.5px] text-slate-500">截止：${m.deadline?new Date(m.deadline).toLocaleString():'無'} ${this.isMealLocked(m)?'🔒 已鎖定':'開放中'} ${m.group_name?'· 限 '+escapeHtml(m.group_name):'· 全部組別'}</div></div>
          <div class="flex gap-1 no-print">${canManageMenu?`<button onclick="app.openMealMenuForm('${m.menu_id}')" class="bg-white border px-2 py-1 rounded-lg text-[10px]">✏️ 編輯菜單</button>`:''}</div>
        </div>
        <div class="text-[11px]"><b>訂購總數（指定組別已審批）：</b>${Object.keys(stat).map(k=>`${escapeHtml(k)}: <b>${stat[k]}</b>`).join(' ｜ ')||'0'}　<span class="text-slate-400">(全部提交：${Object.keys(statAll).map(k=>escapeHtml(k)+': '+statAll[k]).join(' ｜ ')||'0'})</span></div>
        <div class="table-responsive"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">組別</th><th class="border px-2 py-1">姓名</th><th class="border px-2 py-1">選擇</th><th class="border px-2 py-1">備註</th><th class="border px-2 py-1">狀態</th><th class="border px-2 py-1">簽收</th><th class="border px-2 py-1 no-print">操作</th></tr></thead>
        <tbody>${list.map(o=>`<tr>
          <td class="border px-2 py-1">${escapeHtml(o.group_name||'')}</td>
          <td class="border px-2 py-1">${escapeHtml(o.user_name||'')}</td>
          <td class="border px-2 py-1 font-bold">${escapeHtml(o.selection||'')}</td>
          <td class="border px-2 py-1">${escapeHtml(o.remarks||'')}</td>
          <td class="border px-2 py-1 text-center">${this.coordStatusChip(o.status)}</td>
          <td class="border px-2 py-1"></td>
          <td class="border px-2 py-1 no-print"><div class="flex flex-wrap gap-1">${o.status==='pending'&&canConfirm?`<button onclick="app.confirmMealOrder('${o.order_id}')" class="bg-sky-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold">組長確認</button>`:''}${(o.status==='group_ok'||o.status==='pending')&&canFinal&&this.applicationReadyForApproval(o)?`<button onclick="app.approveMealOrder('${o.order_id}')" class="bg-emerald-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold">審批</button>`:''}${o.status!=='rejected'&&(canConfirm||canFinal)?`<button onclick="app.rejectMealOrder('${o.order_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-lg text-[10px] font-bold">拒絕</button>`:''}</div></td>
        </tr>`).join('')||'<tr><td colspan="7" class="border px-2 py-4 text-center text-slate-400">暫無訂餐</td></tr>'}</tbody></table></div>
        <div class="text-[11px] bg-purple-50 border border-purple-100 rounded-lg p-2"><b>派發統計（按組別，已審批）：</b>${Object.keys(byGroup).map(g=>`${escapeHtml(g)} — ${Object.keys(byGroup[g]).map(k=>escapeHtml(k)+' × '+byGroup[g][k]).join('、')}`).join('；　')||'暫無'}</div>
      </div>`;
    }).join('');
    box.innerHTML=`
      <div class="space-y-4">
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-3 text-[11px] leading-relaxed"><b>🍱 膳食動態分工：</b>目前由 <b>${escapeHtml(this.approvalRouteLabel('meals','approver_groups'))}</b> 批核，<b>${escapeHtml(this.approvalRouteLabel('meals','executor_groups'))}</b> 執行並持有最後名單。流程為待本組確認 → 指定組別審批 → 執行組統計、列印及派發。</div>
        <div class="flex flex-wrap gap-2 items-center">
          ${canManageMenu?`<button onclick="app.openMealMenuForm()" class="bg-purple-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>加入菜單</button>`:''}
          ${canFinal?`<button onclick="app.approveAllConfirmedMeals()" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-check-double mr-1"></i>一鍵審批已確認</button>`:''}
          ${canRouteExecute?`<button onclick="app.printCoordArea('coord-meals-print','膳食派發清單')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印派發清單</button>
          <button onclick="app.exportCoordMealsCSV()" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>匯出最終清單 (已審批)</button>`:''}
          <button onclick="app.openModule('meals')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">開啟完整膳食模組</button>
        </div>
        <div id="coord-meals-print" class="space-y-3">${menuBlocks||'<p class="text-xs text-slate-400 py-6 text-center">暫無菜單，按「加入菜單」開始</p>'}</div>
      </div>`;
  }
,
  /* ── v13 場地佈置及文件頁：場地佈置圖（唯一未設定，可上傳檔案／連結）＋
        物資借用表格（已全部設定好，毋須再設定）＋箱頭紙（已全部設定好，填寫／列印即可）＋其他場地文件 ── */
  renderCoordDocs(box){
    const data=this.getCoordinatorGroupData();
    const canUpload=this.canManageCoordinatorDocs();
    const vm=data.venue_map||{};
    const hasMap=!!(vm.file_url||vm.file_data);
    const supplyForm=data.supply_form||{};
    // v13：箱頭紙／物資借用表格已改為固定卡片，舊紀錄（例如示範活動快取）唔再喺文件格重複出現
    const docs=(data.docs||[]).filter(d=>!['箱頭紙','物資借用','物資借用表格'].includes(String(d.category||'').trim()) && !(String(d.title||'').includes('物資借用表格')));
    const docCard=(d)=>`
      <div class="border rounded-xl p-4 bg-white space-y-2 flex flex-col">
        <div class="flex justify-between items-start gap-2"><b class="text-[13px]">${escapeHtml(d.title)}</b><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap">${escapeHtml(d.category||'文件')}</span></div>
        ${d.description?`<div class="text-[11px] text-slate-600">${escapeHtml(d.description)}</div>`:''}
        ${d.updated_by?`<div class="text-[10px] text-slate-400">上載：${escapeHtml(d.updated_by||'')} ${d.updated_at?' · '+escapeHtml(String(d.updated_at).slice(0,10)):''}</div>`:''}
        <div class="flex gap-2 flex-wrap mt-auto pt-1">
          ${d.file_url?`<a href="${escapeHtml(d.file_url)}" target="_blank" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>開啟</a>`:''}
          ${d.file_data?`<button onclick="app.downloadCoordinatorDocFile('${d.id}')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載</button>`:''}
          ${canUpload?`<button onclick="app.openCoordinatorDocForm('${d.id}')" class="bg-white border px-2 py-1.5 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteCoordinatorDoc('${d.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1.5 rounded-xl text-[10px]">🗑️</button>`:''}
        </div>
      </div>`;
    box.innerHTML=`
      <div class="space-y-4">
        <div class="bg-orange-50 border border-orange-200 rounded-xl p-3 text-[11px] leading-relaxed">
          <b>🗂️ 場地佈置及文件：</b>場地佈置圖、物資借用表格及箱頭紙集中在此。<b>物資借用表格及箱頭紙已全部設定好，毋須再設定</b>；目前只有<b>場地佈置圖</b>尚未上傳——用下方「上傳場地佈置圖」以<b>檔案或連結</b>加入。
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="border rounded-xl p-4 bg-white space-y-2 flex flex-col ${hasMap?'':'border-amber-300'}">
            <div class="flex justify-between items-start gap-2"><b class="text-[13px]">🗺️ 場地佈置圖</b>${hasMap?'<span class="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">✅ 已上傳</span>':'<span class="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">未上傳</span>'}</div>
            ${hasMap?`
              <div class="text-[11px] text-slate-600">檔案：${escapeHtml(vm.file_name||'—')}<br>上載：${escapeHtml(vm.updated_by||'—')}${vm.updated_at?' · '+escapeHtml(String(vm.updated_at).slice(0,10)):''}</div>
              <div class="flex gap-2 flex-wrap mt-auto pt-1">
                ${vm.file_url?`<a href="${escapeHtml(vm.file_url)}" target="_blank" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>開啟</a>`:''}
                ${vm.file_data?`<button onclick="app.downloadCoordinatorVenueMap()" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載</button>`:''}
                ${canUpload?`<button onclick="app.openCoordinatorVenueForm()" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold">更換</button>`:''}
              </div>`:`
              <div class="text-[11px] text-slate-500 flex-1">場地佈置圖尚未上傳（目前唯一未設定項目）。可上傳 PDF／圖片檔案，或貼上 Drive 連結。</div>
              ${canUpload?`<button onclick="app.openCoordinatorVenueForm()" class="bg-orange-600 text-white px-3 py-2 rounded-xl text-xs font-bold mt-auto"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳場地佈置圖（檔案／連結）</button>`:'<div class="text-[10.5px] text-slate-400">僅協調組總主任以上或管理層可上傳</div>'}`}
          </div>
          <div class="border rounded-xl p-4 bg-white space-y-2 flex flex-col">
            <div class="flex justify-between items-start gap-2"><b class="text-[13px]">📋 物資借用表格</b><span class="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">✅ 已設定</span></div>
            <div class="text-[11px] text-slate-500 flex-1">物資借用表格已全部設定好，<b>毋須再設定</b>。各組借用物資請到「申請中心 → 物資申請」提交，協調組在「物資批核」頁籤處理。</div>
            <div class="flex gap-2 flex-wrap mt-auto pt-1">
              ${supplyForm.file_url?`<a href="${escapeHtml(supplyForm.file_url)}" target="_blank" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>開啟表格</a>`:''}
              <button onclick="app.openModule('supplies')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold">物資申請紀錄</button>
            </div>
          </div>
          <div class="border rounded-xl p-4 bg-white space-y-2 flex flex-col">
            <div class="flex justify-between items-start gap-2"><b class="text-[13px]">📦 箱頭紙</b><span class="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">✅ 已設定</span></div>
            <div class="text-[11px] text-slate-500 flex-1">箱頭紙已採用地域<b>指定式樣</b>（一張 A4 上下兩張 A5），<b>毋須再設定</b>；填寫年份／組別等資料後即可列印貼箱。</div>
            <div class="flex gap-2 flex-wrap mt-auto pt-1">
              <button onclick="app.openBoxLabelModal('協調組')" class="bg-amber-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-print mr-1"></i>填寫／列印箱頭紙</button>
            </div>
          </div>
        </div>
        <div class="bg-white border rounded-xl p-3 space-y-2">
          <div class="flex justify-between items-center flex-wrap gap-2">
            <b class="text-[12px]"><i class="fa-solid fa-folder-open text-orange-600 mr-1"></i>其他場地文件 (${docs.length})</b>
            <div class="flex gap-2 flex-wrap">${canUpload?`<button onclick="app.openCoordinatorDocForm()" class="bg-orange-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳文件（檔案／連結）</button>`:''}<button onclick="app.exportCoordinatorGroup()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${docs.map(docCard).join('')||'<p class="text-xs text-slate-400 col-span-full py-4 text-center">暫無其他場地文件（場地佈置數據、舊版平面圖等可在此上傳）</p>'}</div>
        </div>
      </div>`;
  }
,
  /* v13：協調文件儲存後刷新——留在部門中心頁（或其他當前頁） */
  refreshCoordinatorDocViews(){
    if(this.currentModule==='group_management' && this.currentGroupManaged){ this.openGroupManagement(this.currentGroupManaged); return; }
    this.renderCoordinatorGroupModule();
  }
,
  /* v13：上傳場地佈置圖——必須是「上傳檔案」或「連結」，唔可以只係手打文字 */
  openCoordinatorVenueForm(){
    if(!this.canManageCoordinatorDocs()){ showToast('僅協調組總主任以上或管理層可上傳','error'); return; }
    const data=this.getCoordinatorGroupData();
    const vm=data.venue_map||{};
    const html=`<input type="hidden" id="cvm-mode" value="edit">
      <div><label class="text-[11px] font-bold">名稱</label><input id="cvm-name" value="${escapeHtml(vm.file_name||'場地佈置圖')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">① 上傳檔案（PDF／圖片／Word／Excel）</label><input type="file" id="cvm-file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx" class="w-full text-xs mt-1">${vm.file_name?`<div class="text-[10px] text-slate-500 mt-1">現有檔案：${escapeHtml(vm.file_name)}</div>`:''}</div>
      <div class="mt-3"><label class="text-[11px] font-bold">② 或貼上連結（Drive／外部連結）</label><input id="cvm-url" value="${escapeHtml(vm.file_url||'')}" placeholder="https://drive.google.com/..." class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="text-[10px] text-slate-500 mt-2">⚠️ 須提供「檔案」或「連結」其中一項（唔可以只填文字描述）。</div>`;
    document.getElementById('record-modal-title').textContent='上傳場地佈置圖（檔案／連結）';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitCoordinatorVenueForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async submitCoordinatorVenueForm(){
    if(!this.canManageCoordinatorDocs()){ showToast('僅協調組總主任以上或管理層可上傳','error'); return; }
    const data=this.getCoordinatorGroupData();
    const old=data.venue_map||{};
    const url=document.getElementById('cvm-url').value.trim();
    const nameInput=document.getElementById('cvm-name').value.trim();
    const file=document.getElementById('cvm-file').files[0];
    // 檔案或連結二選一（可以兩樣都有）；一定要有其中一樣，唔可以淨係文字
    let fileData=old.file_data||'', fileUrl=old.file_url||'', fileName=nameInput||old.file_name||'場地佈置圖';
    if(file){ fileData=await fileToDataUrl(file); fileName=nameInput||file.name; fileUrl=url; }
    else if(url){ fileUrl=url; fileData=''; }
    else if(!old.file_data&&!old.file_url){ showToast('請上傳檔案或填寫連結（唔可以只填文字描述）','error'); return; }
    data.venue_map={file_name:fileName, file_url:fileUrl, file_data:fileData, updated_by:this.currentUser?.name||'', updated_at:new Date().toISOString()};
    this.saveCoordinatorGroupData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已上傳場地佈置圖','success');
    this.refreshCoordinatorDocViews();
  }
,
  downloadCoordinatorVenueMap(){
    const vm=this.getCoordinatorGroupData().venue_map||{};
    if(vm.file_url){ window.open(vm.file_url,'_blank'); return; }
    if(vm.file_data){ downloadDataUrl(vm.file_name||'場地佈置圖', vm.file_data); return; }
    showToast('尚未上傳場地佈置圖','warning');
  }
,
  downloadCoordinatorDocFile(id){
    const d=(this.getCoordinatorGroupData().docs||[]).find(x=>x.id===id);
    if(!d){ showToast('找不到文件','error'); return; }
    if(d.file_data){ downloadDataUrl(d.file_name||d.title||'文件', d.file_data); return; }
    if(d.file_url){ window.open(d.file_url,'_blank'); return; }
    showToast('此文件無附件檔案','warning');
  }
,
  openCoordinatorDocForm(id=null){
    if(!this.canManageCoordinatorDocs()){ showToast('僅協調組總主任以上或管理層可上傳','error'); return; }
    const data=this.getCoordinatorGroupData();
    const existing=id?data.docs.find(d=>d.id===id):null;
    // v13：上傳文件＝上傳檔案或連結（唔再係淨係手打描述文字）；描述改為選填
    let html=`<input type="hidden" id="coord-doc-mode" value="${existing?'edit':'create'}"><input type="hidden" id="coord-doc-id" value="${existing?.id||''}">
      <div><label class="text-[11px] font-bold">標題 *</label><input id="coord-doc-title" value="${escapeHtml(existing?.title||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">分類</label><input id="coord-doc-category" value="${escapeHtml(existing?.category||'場地文件')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">① 上傳檔案（PDF／圖片／Word／Excel）</label><input type="file" id="coord-doc-file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx" class="w-full text-xs mt-1">${existing?.file_name?`<div class="text-[10px] text-slate-500 mt-1">現有檔案：${escapeHtml(existing.file_name)}</div>`:''}</div>
      <div class="mt-3"><label class="text-[11px] font-bold">② 或貼上連結（Drive／外部連結）</label><input id="coord-doc-url" value="${escapeHtml(existing?.file_url||'')}" placeholder="https://drive.google.com/..." class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">描述（選填）</label><textarea id="coord-doc-desc" rows="2" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>
      <div class="text-[10px] text-slate-500 mt-2">⚠️ 須提供「檔案」或「連結」其中一項（唔可以只填文字描述）。</div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯場地文件':'上傳場地文件（檔案／連結）';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitCoordinatorDocForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async submitCoordinatorDocForm(){
    const mode=document.getElementById('coord-doc-mode').value;
    const id=document.getElementById('coord-doc-id').value;
    const title=document.getElementById('coord-doc-title').value.trim();
    const category=document.getElementById('coord-doc-category').value.trim();
    const desc=document.getElementById('coord-doc-desc').value.trim();
    const url=document.getElementById('coord-doc-url').value.trim();
    const file=document.getElementById('coord-doc-file').files[0];
    if(!title){ showToast('請填寫標題','error'); return; }
    const data=this.getCoordinatorGroupData();
    const existing=mode==='edit'?(data.docs||[]).find(d=>d.id===id):null;
    let fileData=existing?.file_data||'', fileName=existing?.file_name||'', fileUrl=existing?.file_url||'';
    if(file){ fileData=await fileToDataUrl(file); fileName=file.name; fileUrl=url||''; }
    else if(url){ fileUrl=url; fileData=''; }
    else if(!existing?.file_data&&!existing?.file_url){ showToast('請上傳檔案或填寫連結（唔可以只填文字描述）','error'); return; }
    if(mode==='edit'){
      const idx=data.docs.findIndex(d=>d.id===id);
      if(idx>=0) data.docs[idx]={...data.docs[idx], title, category, description:desc, file_name:fileName, file_data:fileData, file_url:fileUrl, updated_by:this.currentUser?.name||'', updated_at:new Date().toISOString()};
    }else data.docs.push({id:'coord_'+Date.now(), title, category, description:desc, file_name:fileName, file_data:fileData, file_url:fileUrl, updated_by:this.currentUser?.name||'', updated_at:new Date().toISOString(), created_at:new Date().toISOString()});
    this.saveCoordinatorGroupData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存場地文件','success');
    this.refreshCoordinatorDocViews();
  }
,
  /* 通用列印：把管理頁的統計/清單直接印出 */
  printCoordArea(areaId, title){
    const access=areaId==='coord-supplies-print'?(this.canApproveArea('supplies')||this.canExecuteArea('supplies')):areaId==='coord-vehicle-print'?this.canExecuteArea('vehicle'):areaId==='coord-meals-print'?this.canExecuteArea('meals'):true;
    if(!access){ showToast('你無權列印此批核／最後名單','error'); return; }
    const area=document.getElementById(areaId);
    if(!area){ showToast('找不到列印區域','error'); return; }
    const win=window.open('','_blank');
    win.document.write(`<html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:'Noto Sans TC',sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:6px} th,td{border:1px solid #999;padding:5px;font-size:11px;text-align:left} h1{font-size:17px;margin-bottom:2px} .no-print{display:none !important} .meta{font-size:11px;color:#555;margin-bottom:10px}</style></head><body><h1>${title}</h1><div class="meta">活動：${escapeHtml(this.currentEvent?.event_name||'')}　列印日期：${new Date().toLocaleString()}　列印人：${escapeHtml(this.currentUser?.name||'公開')}</div>${area.innerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    win.document.close();
  }
,
  csvCell(v){ const s=String(v===null||v===undefined?'':v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
,
  downloadCSV(filename, rows){
    const csv='\ufeff'+rows.map(r=>r.map(c=>this.csvCell(c)).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    showToast('已匯出 '+filename,'success');
  }
,
  exportCoordSuppliesCSV(){
    if(!this.canExecuteArea('supplies')){ showToast(`物資最後名單只供 ${this.approvalRouteLabel('supplies','executor_groups')} 匯出`,'error'); return; }
    const reqs=(this.getSuppliesData().requests||[]).filter(r=>r.status==='approved'||r.status==='modified');
    if(!reqs.length){ showToast('尚未有已批核物資','warning'); return; }
    const rows=[['組別','物資','申請數量','批核數量','單位','需用日期','申請人','聯絡','用途','批核人','狀態']];
    reqs.forEach(r=>rows.push([r.group_name,r.item_name,r.qty_requested,(r.qty_approved!==null&&r.qty_approved!==undefined)?r.qty_approved:r.qty_requested,r.unit,r.date_needed,r.requested_by,r.contact,r.reason,r.approved_by,r.status]));
    this.downloadCSV(`物資最終清單_${todayISO()}.csv`, rows);
  }
,
  exportCoordVehiclesCSV(){
    if(!this.canExecuteArea('vehicle')){ showToast(`車輛最後名單只供 ${this.approvalRouteLabel('vehicle','executor_groups')} 匯出`,'error'); return; }
    const vehs=(this.getSuppliesData().vehicle_passes||[]).filter(v=>v.status==='approved');
    if(!vehs.length){ showToast('尚未有已批核車輛','warning'); return; }
    const rows=[['車牌','司機','聯絡','車種','用途','組別','進場','離場','停泊位置','批核人']];
    vehs.forEach(v=>rows.push([v.plate,v.driver_name,v.driver_contact,v.vehicle_type,v.purpose,v.group_name,v.entry_date,v.exit_date,v.parking_location,v.approved_by]));
    this.downloadCSV(`車輛通行證最終清單_${todayISO()}.csv`, rows);
  }
,
  exportCoordMealsCSV(){
    if(!this.canExecuteArea('meals')){ showToast(`膳食最後名單只供 ${this.approvalRouteLabel('meals','executor_groups')} 匯出`,'error'); return; }
    const data=this.getMealsData();
    const orders=(data.orders||[]).filter(o=>o.status==='approved');
    if(!orders.length){ showToast('尚未有已審批訂餐','warning'); return; }
    const rows=[['日期','餐別','菜單','組別','姓名','選擇','數量','備註','組長確認','行政審批']];
    orders.forEach(o=>{ const m=(data.menus||[]).find(x=>x.menu_id===o.menu_id)||{}; rows.push([m.date,m.meal_type,m.menu_desc,o.group_name,o.user_name,o.selection,o.quantity||1,o.remarks,o.confirmed_by,o.approved_by]); });
    this.downloadCSV(`膳食最終清單_${todayISO()}.csv`, rows);
  }
,
  /* v13：openCoordinatorDocForm／submitCoordinatorDocForm／openCoordinatorVenueForm 已移至上方
     （上傳文件＝上傳檔案或連結，唔可以只係手打文字）；舊版本已刪除，避免 Object.assign 後者覆蓋前者 */
  deleteCoordinatorDoc(id){
    if(!this.canManageCoordinatorDocs()) return;
    if(!confirm('確定刪除？')) return;
    const data=this.getCoordinatorGroupData();
    data.docs=data.docs.filter(d=>d.id!==id);
    this.saveCoordinatorGroupData(data);
    this.refreshCoordinatorDocViews();
  }
,
  exportCoordinatorGroup(){
    const data=this.getCoordinatorGroupData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`coordinator_group_${todayISO()}.json`; a.click();
  }
,
  renderTransportModule(){ document.getElementById('module-content').innerHTML=`<div class="bg-white border rounded-xl p-4"><h4 class="font-bold text-sm">交通及泊車</h4><p class="text-[11px] text-slate-500 mt-2">泊車證申請已整合於「物資+車輛 → 車輛通行證」：車牌、司機、用途、進出日期、停泊位置、截止日期、批核、通知。批核完成後可一鍵查看「入口檢查清單」（已批核車輛）方便入口檢查。</p><div class="flex gap-2 mt-3 flex-wrap"><button onclick="app.openModule('parking')" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">前往物資+車輛 → 車輛通行證</button></div></div>`; }
,
  renderScheduleModule(c){
    const container=c||this._scheduleContainer||document.getElementById('module-content');
    this._scheduleContainer=container;
    if(!container) return;
    if(!this.scheduleSubTab) this.scheduleSubTab='overall';
    const data=this.getScheduleData();
    const schSrc=this.eventData['schedule_source']||{};
    // ISD typical run down - 上午攤位、下午儀式 (2025 實際流程)；僅模擬示範活動顯示
    const isdRunDown=this.isDemoEvent()||this.currentEvent?.event_id==='isd_2026'?[
      {time:'07:45 - 08:30', location:'大操場 / 有蓋操場', program:'會操及頒獎禮場地設置劃位，各功能組別場地佈置', groups:{'協調組':'場地佈置、物資運送','步操及典禮組':'步操報到處 set up, 樂隊報到','節目組':'到達會場及拿物資','服務組':'到達會場及拿物資','行政組':'行政組 set up、運作'}},
      {time:'08:30 - 10:30', location:'報到處 / 大操場', program:'參加旅團報到、制服團隊報到，攤位負責人報到及最後佈置；嘉賓接待處準備', groups:{'協調組':'場內秩序及交通組開始運作','步操及典禮組':'優異旅團/獲獎人士報到，貼嘉賓座位紙','節目組':'攤位負責人報到及最後佈置','行政組':'旅團報到處 set up、運作'}},
      {time:'10:45 - 10:55', location:'莫榮大樓地下 → 大操場', program:'嘉賓接待（莫榮大樓地下）→ 嘉賓就座（大操場）', groups:{'行政組':'嘉賓接待運作','步操及典禮組':'典禮準備就緒'}},
      {time:'11:00 - 12:00', location:'大操場', program:'第一部分典禮：優異旅團及各項獎勵頒發儀式（吳家麗會長主禮）— 頒發彩帶及證書、支部最高獎章嘉許信、領袖及委員獎勵、致送紀念品', groups:{'步操及典禮組':'典禮主持、頒獎流程','協調組':'秩序及交通','行政組':'運作'}},
      {time:'12:00 - 13:00', location:'大操場', program:'第二部分典禮：會操檢閱及頒獎儀式（港島總區指揮官區永樑先生主禮）— 主禮嘉賓進場、檢閱步操隊伍、致辭、頒發升旗／步操／隊列比賽獎項及區際錦標', groups:{'步操及典禮組':'檢閱、頒獎流程','協調組':'秩序及交通','行政組':'運作'}},
      {time:'13:00 - 14:00', location:'莫榮大樓地下', program:'嘉賓茶聚（莫榮大樓地下）；工作人員午膳', groups:{'行政組':'接待嘉賓','協調組':'派發工作人員膳食','節目組':'攤位午間休息/輪換'}},
      {time:'14:00 - 17:00', location:'營地全區', program:'主題攤位節目／參觀主題活動區（公眾）：攤位博覽、積極公民工作坊、禮物換領', groups:{'節目組':'攤位遊戲、積極公民工作坊','協調組':'物資運送、攤位支援','行政組':'領袖聯誼閣運作、禮物換領','服務組':'支援'}},
      {time:'17:00 - 18:00', location:'全區', program:'所有節目完結、拆卸設施、清潔、運送物資、對數', groups:{'協調組':'承建商清理場地、運送物資回地域','節目組':'收拾物資+裝箱','行政組':'攤位負責人提交財政報告及收據','常務組':'對數'}}
    ]:[];
    const isAdmin=this.isAdmin();
    container.innerHTML=`
      <div class="space-y-4">
        ${(schSrc.sheet_id||schSrc.drive_file_id)?this.driveSyncNotice():''}
        <div class="bg-teal-50 border border-teal-200 rounded-xl p-3 text-[11px] leading-relaxed">
          <b>📅 ISD Run Down：</b>下方為詳細工作人員日程交叉表 (時間 x 組別)，方便各組一目了然。
          ${(schSrc.sheet_id||schSrc.drive_file_id)?`<div class="mt-1 text-teal-800">資料來源：「${escapeHtml(schSrc.name||'日程表')}」（由秘書處更新），可一鍵同步或自動同步。</div>`:''}
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="app.syncScheduleFromDrive()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步最新日程 (Drive)</button>
          ${((ROLE_HIERARCHY[this.currentUser?.role]||0)>=60)?`<label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">⬆️ 上傳 Excel 日程<input type="file" accept=".xlsx,.xls" class="hidden" onchange="app.handleScheduleExcelUpload(this.files[0])"></label>`:''}
          <button onclick="app.downloadScheduleTemplate()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載欄位範本 CSV</button>
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchScheduleTab('overall')" class="tab-btn ${this.scheduleSubTab==='overall'?'active':''}">總表 (參加者)</button>
          <button onclick="app.switchScheduleTab('staff')" class="tab-btn ${this.scheduleSubTab==='staff'?'active':''}">工作人員日程 (時間×組別)</button>
          <button onclick="app.switchScheduleTab('ceremony')" class="tab-btn ${this.scheduleSubTab==='ceremony'?'active':''}">典禮程序</button>
          <button onclick="app.switchScheduleTab('raw')" class="tab-btn ${this.scheduleSubTab==='raw'?'active':''}">原始資料</button>
        </div>
        <div id="schedule-tab-overall" class="${this.scheduleSubTab==='overall'?'':'hidden'}"></div>
        <div id="schedule-tab-staff" class="${this.scheduleSubTab==='staff'?'':'hidden'}"></div>
        <div id="schedule-tab-ceremony" class="${this.scheduleSubTab==='ceremony'?'':'hidden'}"></div>
        <div id="schedule-tab-raw" class="${this.scheduleSubTab==='raw'?'':'hidden'}"></div>
      </div>
    `;
    this.renderScheduleOverall(isdRunDown);
    this.renderScheduleStaff(isdRunDown);
    this.renderScheduleCeremony();
    this.renderScheduleRaw(data);
  }
,
  switchScheduleTab(tab){
    this.scheduleSubTab=tab;
    document.querySelectorAll('[id^="schedule-tab-"]').forEach(el=>el.classList.add('hidden'));
    document.getElementById('schedule-tab-'+tab)?.classList.remove('hidden');
    document.querySelectorAll('[onclick^="app.switchScheduleTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'tab-btn active':'tab-btn';
    });
  }
,
  renderScheduleOverall(runDown){
    const container=document.getElementById('schedule-tab-overall');
    if(!container) return;
    container.innerHTML=`
      <div class="space-y-3">
        <div class="flex gap-2"><button onclick="app.printSchedule()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印總表</button><button onclick="app.exportSchedule()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button><label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">上傳 Word 轉日程<input type="file" accept=".docx" class="hidden" onchange="app.handleScheduleWordUpload(this.files[0])"></label></div>
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-sm mb-3">ISD 活動日程表 (參加者視角) - 每年差不多</h4>
          <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-3 py-2 text-left">時間</th><th class="px-3 py-2 text-left">位置</th><th class="px-3 py-2 text-left">節目</th></tr></thead><tbody class="divide-y">${runDown.map(r=>`<tr><td class="px-3 py-2 font-mono font-bold" data-label="時間">${escapeHtml(r.time)}</td><td class="px-3 py-2" data-label="位置">${escapeHtml(r.location)}</td><td class="px-3 py-2" data-label="節目">${escapeHtml(r.program)}</td></tr>`).join('')}</tbody></table></div>
        </div>
      </div>
    `;
  }
,
  renderScheduleStaff(runDown){
    const container=document.getElementById('schedule-tab-staff');
    if(!container) return;
    const groups=['協調組','步操及典禮組','節目組','服務組','行政組'];
    container.innerHTML=`
      <div class="space-y-3">
        <div class="bg-white border rounded-xl p-4 overflow-x-auto">
          <h4 class="font-bold text-sm mb-3">工作人員日程表 (時間×組別交叉表) - 參考 2017 手冊，一目了然</h4>
          <div class="table-responsive"><table class="min-w-full text-[11px] border"><thead class="bg-slate-900 text-white"><tr><th class="border px-2 py-1 text-left">時間</th>${groups.map(g=>`<th class="border px-2 py-1 text-left">${escapeHtml(g)}</th>`).join('')}</tr></thead><tbody>${runDown.map(r=>`<tr><td class="border px-2 py-1 font-mono font-bold bg-slate-50">${escapeHtml(r.time)}</td>${groups.map(g=>`<td class="border px-2 py-1">${escapeHtml(r.groups[g]||'-')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          <div class="text-[10px] text-slate-500 mt-2">此為 ISD 每年差不多之 Run Down，協調組負責場地佈置、步操組負責報到及典禮、節目組負責攤位佈置、服務組提早到場拿物資、行政組設攤位及運作，各組可按此一目了然自己何時做什麼。</div>
        </div>
      </div>
    `;
  }
,
  renderScheduleCeremony(){
    const container=document.getElementById('schedule-tab-ceremony');
    if(!container) return;
    container.innerHTML=`
      <div class="space-y-3">
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-sm mb-2">典禮程序（2026-10-04 官方定稿，內建於「典禮儀式」卡片）</h4>
          <div class="text-[11px] leading-relaxed space-y-1">
            <div><b>10:45</b> 嘉賓接待（莫榮大樓地下） ｜ <b>10:55</b> 嘉賓就座（大操場）</div>
            <div><b>11:00 第一部分典禮：優異旅團及各項獎勵頒發儀式</b>（吳家麗會長主禮）— 頒發優異旅團彩帶及證書、支部最高獎章嘉許信、領袖及委員獎勵、致送協助單位紀念品</div>
            <div><b>12:00 第二部分典禮：會操檢閱及頒獎儀式</b>（港島總區指揮官區永樑先生主禮）— 主禮嘉賓進場、檢閱步操比賽隊伍、幼童軍團呼及頒獎、主禮嘉賓致辭、頒發升旗／步操／隊列比賽獎項、頒發區際錦標、步操隊伍離場</div>
            <div><b>13:00</b> 頒獎典禮完畢；嘉賓茶聚（莫榮大樓地下）</div>
            <div><b>14:00</b> 參觀主題活動區</div>
            <div class="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5"><b>司儀稿、優異旅團獲獎名單、嘉賓地圖：</b>詳見「典禮儀式」卡片（司儀稿／嘉賓名單／座位表／優異旅團獲獎名單／嘉賓地圖分頁），全部人可查閱。</div>
          </div>
        </div>
      </div>
    `;
  }
,
  renderScheduleRaw(data){
    const container=document.getElementById('schedule-tab-raw');
    if(!container) return;
    container.innerHTML=`<div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">時段</th><th class="px-2 py-1 text-left">項目</th><th class="px-2 py-1 text-left">地點</th><th class="px-2 py-1 text-left">組別</th></tr></thead><tbody>${data.map(s=>`<tr><td class="px-2 py-1">${escapeHtml(s.time_slot||'')}</td><td class="px-2 py-1">${escapeHtml(s.title||'')}</td><td class="px-2 py-1">${escapeHtml(s.location||'')}</td><td class="px-2 py-1">${escapeHtml(s.group_name||'')}</td></tr>`).join('') || '<tr><td colspan="4" class="px-2 py-4 text-center text-slate-400">暫無原始資料</td></tr>'}</tbody></table></div>`;
  }
,
  printSchedule(){
    const area=document.getElementById('module-content');
    if(!area){ showToast('找不到日程內容','error'); return; }
    const win=window.open('','_blank');
    if(!win){ showToast('請允許彈出視窗以列印','warning'); return; }
    win.document.write(`<html><head><title>日程表</title><link rel="stylesheet" href="${location.origin}/assets/tailwind.css"><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:6px;font-size:11px} @media print{button,label,input,select{display:none!important}}</style></head><body>${area.innerHTML}<div class="mt-6 text-center"><button onclick="window.print()" class="bg-slate-900 text-white px-6 py-2 rounded-xl">列印</button></div></body></html>`);
    win.document.close();
  }
,
  exportSchedule(){
    const data={event_id:this.currentEvent?.event_id||'isd_2026', exported_at:new Date().toISOString(), schedule:this.eventData['schedule']||[], custom:JSON.parse(localStorage.getItem(LS.config(this.currentEvent?.event_id||'isd_2026')+'_custom_schedule')||'null')};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`schedule_${todayISO()}.json`; a.click(); showToast('已匯出日程 JSON','success');
  }
,
  async handleScheduleWordUpload(file){
    if(!file){ showToast('請選擇 Word','warning'); return; }
    const overlay=document.getElementById('savingOverlay');
    overlay.classList.add('active');
    document.getElementById('savingText').textContent='正在解析 Word 日程...';
    try{
      const ab=await file.arrayBuffer();
      const result=await mammoth.extractRawText({arrayBuffer:ab});
      const text=result.value||'';
      if(!text.trim()){ showToast('解析為空','error'); return; }
      // Simple parse: try to extract time slots like 07:45, 08:30 etc.
      // For demo, save as announcement or just show preview
      showToast(`Word 解析成功，共 ${text.length} 字，已轉文字，可手動複製到日程`, 'success');
      // Save to localStorage as custom schedule
      const key=LS.config(this.currentEvent?.event_id||'isd_2026')+'_custom_schedule';
      localStorage.setItem(key, JSON.stringify({text:text.slice(0,5000), fileName:file.name, uploaded_at:new Date().toISOString()}));
    }catch(e){ showToast('解析失敗:'+e.message,'error'); }
    finally{ overlay.classList.remove('active'); }
  }
,
  globalSearch(query){
    const q=(query||'').toLowerCase().trim();
    const resultsEl=document.getElementById('global-search-results');
    if(!resultsEl) return;
    if(!q){ resultsEl.classList.add('hidden'); resultsEl.innerHTML=''; return; }
    resultsEl.classList.remove('hidden');
    const results=[];
    // Search meetings
    const meetings=this.getMeetings().filter(m=> (m.title+m.agenda+m.location).toLowerCase().includes(q)).slice(0,5).forEach(m=> results.push({type:'會議', title:m.title, desc:`${m.date} ${m.location}`, action:`app.openMeetingDetail('${m.meeting_id}')`}));
    // Search staff
    const staffData=this.getStaffData();
    (staffData.contacts||[]).filter(c=> (c.name+c.role_title+c.group_name).toLowerCase().includes(q)).slice(0,5).forEach(c=> results.push({type:'工作人員', title:c.name, desc:`${c.role_title} | ${c.group_name}`, action:`app.openModule('staff')`}));
    // Search finance guidance files
    const fin=this.getFinanceData();
    const driveFiles=[
      {name:'財務指引', desc:'報銷程序'},
      {name:'報價要求', desc:'附件1'},
      {name:'豁免名單', desc:'附件2'},
      {name:'結算總表', desc:'附件5'},
    ].filter(f=> f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)).forEach(f=> results.push({type:'財務指引', title:f.name, desc:f.desc, action:`app.openModule('finance')`}));
    // Search activities booths
    const actData=this.getActivitiesData();
    (actData.booths||[]).filter(b=> (b.booth_name+b.location+b.group_name).toLowerCase().includes(q)).slice(0,5).forEach(b=> results.push({type:'攤位', title:b.booth_name, desc:`${b.location} | ${b.group_name}`, action:`app.openModule('activities')`}));
    // Search announcements
    const annData=this.getAnnouncementsData();
    (annData.announcements||[]).filter(a=> (a.title+a.content).toLowerCase().includes(q)).slice(0,5).forEach(a=> results.push({type:'公告', title:a.title, desc:a.category, action:`app.openModule('announcements')`}));
    // Search events
    (this.eventsList||[]).filter(ev=> (ev.event_name+ev.description).toLowerCase().includes(q)).forEach(ev=> results.push({type:'活動', title:ev.event_name, desc:ev.description, action:`app.accessEvent('${ev.event_id}')`}));

    if(!results.length){
      resultsEl.innerHTML=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">無符合「${escapeHtml(q)}」的結果，試試搜尋 會議、財務、物資、膳食、地圖 等關鍵字 (公開可看)</div>`;
      return;
    }
    resultsEl.innerHTML=`<div class="bg-white border rounded-xl p-3"><div class="text-[11px] font-bold mb-2">搜尋結果：${results.length} 項 (公開可看，點擊前往)</div><div class="space-y-2">${results.map(r=>`<div class="flex justify-between items-center border rounded-xl p-2 hover:bg-slate-50 cursor-pointer" onclick="${r.action}; document.getElementById('global-search-results').classList.add('hidden');"><div><div class="flex items-center gap-2"><span class="bg-sky-100 text-sky-700 text-[10px] px-2 py-0.5 rounded-full">${escapeHtml(r.type)}</span><b class="text-[12px]">${escapeHtml(r.title)}</b></div><div class="text-[10px] text-slate-500 mt-0.5">${escapeHtml(r.desc||'')}</div></div><i class="fa-solid fa-arrow-right text-slate-400 text-xs"></i></div>`).join('')}</div></div>`;
  }
,

  sendMeetingEmails(){if(!this.canSendMeetingReminder()){ showToast('僅執行副主席以上或秘書處可發送會議提醒','error'); return; } if(!confirm('發送會議提醒 Email？')) return; showToast('已發送 (Mock)','success');}
,
  handleHashRoute(){
    const hash=window.location.hash;
    if(hash==='#donate-goods'){
      setTimeout(()=>{ if(this.currentEvent) this.openGoodsDonationForm(); else this.enterFirstEvent().then(()=>this.openGoodsDonationForm()); },800);
    } else if(hash==='#donate-food'){
      setTimeout(()=>{ if(this.currentEvent) this.openFoodDonationForm(); else this.enterFirstEvent().then(()=>this.openFoodDonationForm()); },800);
    }
  }
,
});
