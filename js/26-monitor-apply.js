/* 26-monitor-apply.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== 我的監察 (所有申請批核集中一頁) =====================
     ① 先睇「我自己」：訂餐／物資／車輛／開支／報價 批到未
     ② 上級再按組別分開睇下級申請了什麼（主席可看全部組別，一組一格，不會一次過幾百項） */
  monitorScope(){
    const u=this.currentUser;
    if(!u) return {level:'none', groups:[]};
    const lvl=this.roleLevel(u.role);
    if(this.isAdmin()||this.isExecViceOrChair()||lvl>=70) return {level:'all', groups:this.getEventGroups()};
    if(lvl>=30){ const g=u.group_name||''; return {level:'group', groups:g?[g]:[]}; }
    return {level:'self', groups:[]};
  }
,
  // 把所有申請正規化成同一格式，方便集中顯示
  collectApplications(){
    const out=[];
    const meals=this.getMealsData();
    const sup=this.getSuppliesData();
    const fin=this.getFinanceData();
    const quotes=this.getOralQuotesData();
    const park=this.getParkingData();
    const mealSt={pending:{t:'待組長確認',c:'amber'},group_ok:{t:'本組已確認·待指定組批核',c:'sky'},approved:{t:'已審批',c:'emerald'},rejected:{t:'已拒絕',c:'rose'}};
    const genSt={pending:{t:'待批核',c:'amber'},approved:{t:'已批核',c:'emerald'},modified:{t:'已批核(修改)',c:'sky'},rejected:{t:'已拒絕',c:'rose'}};
    (meals.orders||[]).forEach(o=>{
      const m=(meals.menus||[]).find(x=>x.menu_id===o.menu_id)||{};
      const st=mealSt[o.status]||mealSt.pending;
      out.push({type:'meals',typeLabel:'膳食',icon:'fa-solid fa-utensils',color:'text-purple-600',
        person:o.user_name||'', person_id:o.user_id||'', group:o.group_name||'未分組',
        title:`${m.date||''} ${m.meal_type||''} · ${o.selection||''}`, sub:`${m.menu_desc||''}${o.remarks?' · 備註：'+o.remarks:''}`,
        status:st.t, color_name:st.c, who:o.approved_by||o.confirmed_by||'', date:o.created_at||''});
    });
    (sup.requests||[]).forEach(r=>{
      const st=genSt[r.status]||genSt.pending;
      out.push({type:'supplies',typeLabel:'物資',icon:'fa-solid fa-boxes-stacked',color:'text-blue-600',
        person:r.requested_by||'', person_id:r.requested_by_id||'', group:r.group_name||'未分組',
        title:`${r.item_name||''} × ${r.qty_requested||0}${r.unit||''}`,
        sub:`批核數量：${r.qty_approved!==null&&r.qty_approved!==undefined?r.qty_approved:'-'} · 需用：${r.date_needed||'-'}`,
        status:st.t, color_name:st.c, who:r.approved_by||'', date:r.created_at||''});
    });
    (sup.vehicle_passes||[]).forEach(v=>{
      const st=genSt[v.status]||genSt.pending;
      out.push({type:'vehicle',typeLabel:'車輛',icon:'fa-solid fa-car',color:'text-amber-600',
        person:v.requested_by||'', person_id:v.requested_by_id||'', group:v.group_name||'未分組',
        title:`${v.plate||''} · 司機 ${v.driver_name||''}`,
        sub:`進出：${v.entry_date||''}→${v.exit_date||''} · 停泊：${v.parking_location||'待定'}`,
        status:st.t, color_name:st.c, who:v.approved_by||'', date:v.created_at||''});
    });
    (park.applications||[]).forEach(a=>{
      const st=genSt[a.status]||genSt.pending;
      out.push({type:'vehicle',typeLabel:'泊車證',icon:'fa-solid fa-square-parking',color:'text-sky-600',
        person:a.driver_name||a.requested_by||'', person_id:a.requested_by_id||'', group:a.group_name||'未分組',
        title:`${a.plate||''} · ${a.park_date||''}`, sub:`${a.unit||''} ${a.position||''}`,
        status:st.t, color_name:st.c, who:a.approved_by||'', date:a.created_at||''});
    });
    (fin.expenses||[]).forEach(e=>{
      const st=genSt[e.status]||genSt.pending;
      out.push({type:'expense',typeLabel:'開支',icon:'fa-solid fa-wallet',color:'text-emerald-600',
        person:e.submitted_by||'', person_id:e.submitted_by_id||'', group:e.group_name||'未分組',
        title:`${e.item_name||''} · $${e.actual||0}`, sub:`${e.description||''}`,
        status:st.t, color_name:st.c, who:e.approved_by||'', date:e.created_at||e.date||''});
    });
    (quotes.quotes||[]).forEach(q=>{
      out.push({type:'quote',typeLabel:'口頭報價',icon:'fa-solid fa-file-signature',color:'text-indigo-600',
        person:q.quoted_by||'', person_id:q.quoted_by_id||'', group:q.group_name||'未分組',
        title:`${q.vendor||''} · $${q.amount||0}`, sub:`${q.item_desc||''}`,
        status:'已登記', color_name:'slate', who:q.quoted_by||'', date:q.created_at||q.quote_date||''});
    });
    return out;
  }
,
  monitorIsMine(rec){
    const u=this.currentUser; if(!u) return false;
    if(rec.person_id && u.user_id && rec.person_id===u.user_id) return true;
    if(rec.person && u.name && rec.person===u.name) return true;
    return false;
  }
,
  monitorRowHTML(rec){
    const cls={amber:'bg-amber-100 text-amber-700 border-amber-300',emerald:'bg-emerald-100 text-emerald-700 border-emerald-300',sky:'bg-sky-100 text-sky-700 border-sky-300',rose:'bg-rose-100 text-rose-700 border-rose-300',slate:'bg-slate-100 text-slate-600 border-slate-300'}[rec.color_name]||'bg-slate-100 text-slate-600 border-slate-300';
    return `<div class="flex items-start justify-between gap-2 border rounded-xl p-2.5 bg-slate-50">
      <div class="min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap"><i class="${rec.icon} ${rec.color} text-[11px]"></i><b class="text-[12px]">${escapeHtml(rec.title)}</b><span class="text-[9.5px] bg-white border px-1.5 py-0.5 rounded-full">${escapeHtml(rec.typeLabel)}</span></div>
        <div class="text-[10.5px] text-slate-500 mt-0.5">${escapeHtml(rec.sub||'')}</div>
        <div class="text-[10px] text-slate-400 mt-0.5">申請人：${escapeHtml(rec.person||'-')}${rec.who?' · 處理：'+escapeHtml(rec.who):''}${rec.date?' · '+new Date(rec.date).toLocaleDateString():''}</div>
      </div>
      <span class="text-[10px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${cls}">${escapeHtml(rec.status)}</span>
    </div>`;
  }
,
  setMonitorFilter(t){ this.monitorFilter=t; this.renderMyMonitorModule(); }
,
  renderMyMonitorModule(){
    const container=document.getElementById('module-content');
    if(!container) return;
    const actionsEl=document.getElementById('module-actions');
    if(!this.currentUser){
      if(actionsEl) actionsEl.innerHTML='';
      container.innerHTML=`<div class="text-center py-10"><div class="text-3xl mb-2">🔒</div><p class="text-xs text-slate-500 mb-3">「我的監察」顯示你（及你下級）的所有申請批核進度，登入後才顯示</p><button onclick="app.openLoginModal()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold">登入查看</button></div>`;
      return;
    }
    if(!this.monitorFilter) this.monitorFilter='all';
    const sum=this.monitorSummary();
    const all=sum.all;
    const filtered=this.monitorFilter==='all'?all:all.filter(r=>r.type===this.monitorFilter);
    const scope=sum.scope;
    const mine=filtered.filter(r=>this.monitorIsMine(r));
    const others=filtered.filter(r=>!this.monitorIsMine(r));
    const inScope=(g)=> scope.level==='all' || scope.groups.some(x=>x&&(g.includes(x)||x.includes(g)));
    const visibleOthers=scope.level==='self'?[]:others.filter(r=>inScope(r.group||''));
    const pendingCount=(arr)=>arr.filter(r=>r.color_name==='amber'||r.color_name==='sky').length;

    // ── 沒有權限人士（如普通工作人員）：只看到自己的身份＋申請紀錄（如有）＋「未有紀錄」提示＋前往申請中心按鈕 ──
    if(!sum.privileged){
      if(actionsEl) actionsEl.innerHTML='';
      const u=this.currentUser;
      container.innerHTML=`
        <div class="space-y-4">
          <div class="bg-white border rounded-2xl p-4 flex items-center gap-3">
            <div class="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-lg flex-shrink-0"><i class="fa-solid fa-user-shield"></i></div>
            <div class="min-w-0">
              <div class="font-bold text-sm flex items-center flex-wrap gap-2">${escapeHtml(u.name||'')} <span class="bg-sky-100 text-sky-700 text-[10px] px-2 py-0.5 rounded-full border border-sky-200 whitespace-nowrap">${escapeHtml(ROLE_LABELS[u.role]||u.role)}</span>${u.group_name?`<span class="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full border border-indigo-200 whitespace-nowrap">${escapeHtml(normalizeGroupName(u.group_name))}</span>`:''}</div>
              <p class="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed">我的監察：只顯示你自己的申請批核進度（膳食·物資·車輛·開支·報價）。</p>
            </div>
          </div>
          ${mine.length?`<div class="space-y-1.5">${mine.map(r=>this.monitorRowHTML(r)).join('')}</div>`:''}
          ${mine.length?'':`
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <div class="text-3xl mb-2">📭</div>
            <p class="text-[12px] text-amber-900 font-bold">你暫時未有申請紀錄，可到「申請中心」提交</p>
            <button onclick="app.openModule('apply_hub')" class="mt-3 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold btn-mobile"><i class="fa-solid fa-file-pen mr-1"></i>前往申請中心</button>
          </div>`}
        </div>`;
      return;
    }

    // ── 有權限人士：完整監察 + 總申請／待處理／已批核／已拒絕（點擊跳轉批核中心查看內容並處理）──
    if(actionsEl) actionsEl.innerHTML=`<button onclick="app.printCoordArea('monitor-print','我的監察 - 申請批核總表')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印</button><button onclick="app.switchTopTab('approvals')" class="bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-user-check mr-1"></i>前往批核中心處理</button>`;
    // 分組（自己 → XX組 → XX組），避免一入去就幾百個
    const groupNames=[];
    visibleOthers.forEach(r=>{ const g=r.group||'未分組'; if(!groupNames.includes(g)) groupNames.push(g); });
    const order=this.getEventGroups();
    groupNames.sort((a,b)=>{ const ia=order.indexOf(a), ib=order.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib); });
    const types=[{k:'all',l:'全部'},{k:'meals',l:'膳食'},{k:'supplies',l:'物資'},{k:'vehicle',l:'車輛/泊車'},{k:'expense',l:'開支'},{k:'quote',l:'報價'}];
    const filterBtns=types.map(t=>`<button onclick="app.setMonitorFilter('${t.k}')" class="px-3 py-1.5 rounded-xl text-[11px] font-bold ${this.monitorFilter===t.k?'bg-slate-900 text-white':'bg-white border text-slate-600'}">${t.l}</button>`).join('');
    const scopeText=scope.level==='all'?'你可看到<b>全部組別</b>的申請（已按組別分開）'
      :(scope.level==='group'?`你可看到<b>${escapeHtml(scope.groups.join('、')||'本組')}</b>下級的申請`:'你可看到<b>自己</b>的申請');
    const groupSections=groupNames.map((g,idx)=>{
      const recs=visibleOthers.filter(r=>(r.group||'未分組')===g);
      const pend=pendingCount(recs);
      const meta=this.groupMeta(g);
      return `<details class="border rounded-2xl bg-white" ${idx===0?'open':''}>
        <summary class="cursor-pointer list-none p-3 flex items-center justify-between gap-2">
          <span class="flex items-center gap-2"><span class="w-8 h-8 ${meta.cls} rounded-lg flex items-center justify-center text-[12px]"><i class="${meta.icon}"></i></span><b class="text-[13px]">${escapeHtml(g)}</b><span class="text-[10px] bg-slate-100 border px-2 py-0.5 rounded-full">${recs.length} 項</span>${pend?`<span class="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">${pend} 待處理</span>`:''}</span>
          <i class="fa-solid fa-chevron-down text-slate-400 text-[11px]"></i>
        </summary>
        <div class="px-3 pb-3 space-y-1.5">${recs.map(r=>this.monitorRowHTML(r)).join('')}</div>
      </details>`;
    }).join('');
    const canGoApprovals=sum.canApproveAny||this.roleLevel(this.currentUser.role)>=40;
    const goApprovals=canGoApprovals?"onclick=\"app.switchTopTab('approvals')\" ":'';
    const chip=(v,l,cls)=>`<button ${goApprovals}class="${cls} rounded-xl px-3 py-2 text-center ${canGoApprovals?'cursor-pointer hover:shadow transition':''}"><div class="text-[16px] font-extrabold">${v}</div><div class="text-[10px]">${l}</div></button>`;
    const scopeRecs=[...mine,...visibleOthers];
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed">
          <b>👁️ 我的監察（所有申請批核集中一頁）：</b>膳食、物資、車輛通行證／泊車證、開支申報、口頭報價全部在此，一睇就知批到未。<br>
          先顯示「<b>我自己</b>」，之後<b>按組別分開</b>顯示下級的申請（點開才展開，唔會一次過幾百項）。${scopeText}。<br>
          點擊下方 <b>總申請／待處理／已批核／已拒絕</b> 數字可跳轉<b>批核中心</b>查看申請內容並處理。
        </div>
        <div class="flex gap-2 flex-wrap items-center">${filterBtns}<button onclick="app.renderMyMonitorModule()" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-rotate mr-1"></i>重新整理</button></div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${chip(scopeRecs.length,'總申請','bg-slate-100 text-slate-700 border')}
          ${chip(pendingCount(scopeRecs),'待處理','bg-amber-50 text-amber-700 border border-amber-200')}
          ${chip(scopeRecs.filter(r=>r.color_name==='emerald').length,'已批核','bg-emerald-50 text-emerald-700 border border-emerald-200')}
          ${chip(scopeRecs.filter(r=>r.color_name==='rose').length,'已拒絕','bg-rose-50 text-rose-700 border border-rose-200')}
        </div>
        <div id="monitor-print" class="space-y-3">
          <div class="border-2 border-indigo-200 rounded-2xl bg-white">
            <div class="p-3 flex items-center justify-between gap-2 border-b bg-indigo-50 rounded-t-2xl">
              <span class="flex items-center gap-2"><span class="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-[12px]"><i class="fa-solid fa-user"></i></span><b class="text-[13px]">我自己 · ${escapeHtml(this.currentUser.name||'')}</b><span class="text-[10px] bg-white border px-2 py-0.5 rounded-full">${mine.length} 項</span></span>
              ${pendingCount(mine)?`<span class="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">${pendingCount(mine)} 待處理</span>`:'<span class="text-[10px] text-emerald-600 font-bold">全部已處理</span>'}
            </div>
            <div class="p-3 space-y-1.5">${mine.map(r=>this.monitorRowHTML(r)).join('')||`<div class="py-3 text-center"><p class="text-[11px] text-slate-400">你暫時未有申請紀錄，可到「申請中心」提交</p><button onclick="app.openModule('apply_hub')" class="mt-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10.5px] font-bold btn-mobile"><i class="fa-solid fa-file-pen mr-1"></i>前往申請中心</button></div>`}</div>
          </div>
          ${scope.level!=='self'?(groupSections||'<p class="text-[11px] text-slate-400 py-3 text-center bg-white border rounded-2xl">下級暫未有申請紀錄</p>'):''}
        </div>
        <div class="bg-white border rounded-xl p-3 text-[11px] text-slate-500">提示：批核在負責的組內處理 —— 物資／車輛／膳食在「協調組」，開支／報價在「財務」。此頁只作查閱及列印；要處理申請請到「批核中心」。</div>
      </div>`;
  }
,

  /* ===================== 申請中心 (Apply Hub) =====================
     集中所有申請表，一頁睇晒；各表仍保留於原卡片（物資/財務等）
     公開/登入/權限 標示清楚，一鍵直達該申請表 */
  /* ===================== 執行手冊 (集中一卡，內部分頁) =====================
     組織架構與聯絡、場地與活動總覽、典禮儀式、危機處理、通告及文件
     全部收埋入「執行手冊」卡，進入後分頁切換（同申請中心一樣）。 */
  renderExecManualModule(){
    const container=document.getElementById('module-content');
    if(!container) return;
    if(!this.execManualSubTab) this.execManualSubTab='staff';
    const tabs=[
      {k:'staff',     icon:'fa-solid fa-sitemap',              label:'組織架構與聯絡'},
      {k:'activities',icon:'fa-solid fa-map-location-dot',     label:'場地與活動總覽'},
      {k:'ceremony',  icon:'fa-solid fa-crown',                label:'典禮儀式'},
      {k:'crisis',    icon:'fa-solid fa-triangle-exclamation', label:'危機處理'},
      {k:'finance_guide', icon:'fa-solid fa-file-invoice-dollar', label:'財務指引'},
      {k:'documents', icon:'fa-solid fa-file-shield',          label:'通告及文件'}
    ];
    const tabBtns=tabs.map(t=>`<button onclick="app.switchExecManualTab('${t.k}')" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${this.execManualSubTab===t.k?'bg-slate-900 text-white shadow':'bg-slate-100 text-slate-600 hover:bg-slate-200'}"><i class="${t.icon} mr-1"></i>${t.label}</button>`).join('');
    container.innerHTML=`
      <div class="space-y-4">
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">${tabBtns}</div>
        <div id="exec-manual-panel"></div>
      </div>`;
    this.renderExecManualTab();
  }
,
  switchExecManualTab(tab){
    this.execManualSubTab=tab;
    document.querySelectorAll('[onclick^="app.switchExecManualTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-900 text-white shadow':'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200';
    });
    this.renderExecManualTab();
  }
,
  renderExecManualTab(){
    const panel=document.getElementById('exec-manual-panel');
    if(!panel) return;
    const map={
      staff:()=>this.renderStaffModule(panel),
      activities:()=>this.renderActivitiesModule(panel),
      ceremony:()=>this.renderCeremonyModule(panel),
      crisis:()=>this.renderCrisisModule(panel),
      finance_guide:()=>{
        const fin=this.getFinanceData();
        const driveFiles=[
          {name:'ISD2026 財務指引及會計程序 ver 1.docx', id:'1QNWNG1BnVab3oHlI7yvIK_2YMMSFV-p4', type:'docx', desc:'總指引，含報銷程序、預算控制、會計程序'},
          {name:'ISD2026 附件1 - 報價要求.docx', id:'176X1zGzH_k7DJzzuzE5fHkAr6GE3_IHm', type:'docx', desc:'報價要求範本'},
          {name:'ISD2026 附件2 - 豁免商戶名單 (Rev Dec 2025).pdf', id:'1Z_VqtQ1LjKGI7fFqRCvN9sI8XrmJLbL2', type:'pdf', desc:'豁免報價商戶清單'},
          {name:'ISD2026 附件3 - 口頭報價資料記錄.xlsx', id:'1s5X9v7FJfbCZG1zDX5GX_yXpE2C_8BIq', type:'xlsx', desc:'口頭報價記錄表格'},
          {name:'ISD2026 附件4 - 書面報價比較表.docx', id:'1Qal9KVjgN54cb6GwxideH_lsRXJquVWy', type:'docx', desc:'書面報價比較表 (需3間報價)'},
          {name:'ISD2026 附件5 - 結算總表 (WORD).docx', id:'1FwpuK79mWDToX_p_csO_8Fg085lT0QkC', type:'docx', desc:'結算總表 Word 版'},
          {name:'ISD2026 附件5A - 結算總表 (WORD w autosum).docx', id:'16krtzQYD11b2cyL8h_Qdb0a8X4_wyDN-', type:'docx', desc:'結算總表 Word 自動計算版'},
          {name:'ISD2026 附件5B - 結算總表 (EXCEL).xlsx', id:'1boZYb4XxiZllAP_2sxxcdatiOQIZMfbJ', type:'xlsx', desc:'結算總表 Excel 版 (推薦)'},
          {name:'ISD2026 附件6 - 四格印簽名位置.docx', id:'19bmvieiDcnFBcQ6qPAGagN8UDXc3tAG2', type:'docx', desc:'簽名位置範本'},
        ];
        panel.innerHTML=`<div class="space-y-4">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed"><b>財務指引及會計程序</b><br>報銷及結算程序，文件由行政組(財務)提供。</div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${driveFiles.map(f=>`<div class="border rounded-xl p-3 bg-white hover:bg-slate-50 transition cursor-pointer" onclick="window.open('https://drive.google.com/file/d/${f.id}/view','_blank')">
              <div class="flex items-start gap-2">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${f.type==='pdf'?'bg-rose-100 text-rose-600':(f.type==='xlsx'?'bg-emerald-100 text-emerald-600':'bg-blue-100 text-blue-600')}"><i class="fa-solid ${f.type==='pdf'?'fa-file-pdf':(f.type==='xlsx'?'fa-file-excel':'fa-file-word')}"></i></div>
                <div><div class="text-[12px] font-bold line-clamp-2">${escapeHtml(f.name)}</div><div class="text-[10px] text-slate-500 mt-1">${escapeHtml(f.desc)}</div></div>
              </div>
            </div>`).join('')}
          </div>
        </div>`;
      },
      documents:()=>this.renderDocumentsModule(panel)
    };
    (map[this.execManualSubTab]||map.staff)();
  }
,

  renderApplyHubModule(){
    const container=document.getElementById('module-content');
    if(!container) return;
    const u=this.currentUser;
    const lvl=u?(ROLE_HIERARCHY[u.role]||0):0;
    const isAdmin=this.isAdmin();
    const canSubmitSupply=this.canSubmitSupply();          // 登入成員均可；低於總主任先由本組確認
    const canRecordQuote=this.canRecordOralQuote();        // lvl>=40
    const canViewChecklist=this.canViewParkingChecklist(); // lvl>=40
    const canSubmitExpense=!!u;
    const routeText=(area)=>`批核：${this.approvalRouteLabel(area,'approver_groups')}；執行／最後名單：${this.approvalRouteLabel(area,'executor_groups')}`;
    const items=[
      {key:'meals', icon:'fa-utensils', color:'bg-purple-100 text-purple-700', title:'膳食申請 (訂餐)', desc:`揀餐／改餐；${routeText('meals')}`, badge:'公開可申請', badgeCls:'bg-emerald-100 text-emerald-700 border-emerald-200', action:`app.openModule('meals'); setTimeout(()=>app.switchMealsTab('menus'),300)`, enabled:true},
      {key:'supplies', icon:'fa-boxes-stacked', color:'bg-blue-100 text-blue-600', title:'物資申請', desc:routeText('supplies'), badge:canSubmitSupply?'登入可申請':'請先登入', badgeCls:canSubmitSupply?'bg-blue-100 text-blue-700 border-blue-200':'bg-slate-100 text-slate-600 border-slate-200', action:`app.openModule('supplies'); setTimeout(()=>app.openSupplyRequestForm(),350)`, enabled:canSubmitSupply},
      {key:'booth', icon:'fa-store', color:'bg-orange-100 text-orange-700', title:'攤位物資申請', desc:'與外判商租用枱／椅／布置等；與地域物資借用完全分開。公開填寫，無需登入', badge:'公開可申請（無需登入）', badgeCls:'bg-emerald-100 text-emerald-700 border-emerald-200', action:`app.openModule('booth')`, enabled:true},
      {key:'vehicle', icon:'fa-car', color:'bg-amber-100 text-amber-700', title:'車輛通行證申請 (含泊車證)', desc:`車牌／司機／用途；${routeText('vehicle')}`, badge:canSubmitSupply?'登入可申請':'請先登入', badgeCls:canSubmitSupply?'bg-amber-100 text-amber-700 border-amber-200':'bg-slate-100 text-slate-600 border-slate-200', action:`app.openModule('parking')`, enabled:canSubmitSupply},
      {key:'oral_quotes', icon:'fa-file-signature', color:'bg-indigo-100 text-indigo-700', title:'口頭報價登記', desc:'商戶/項目/金額，財務查核用', badge:canRecordQuote?'可登記':'總主任以上', badgeCls:canRecordQuote?'bg-indigo-100 text-indigo-700 border-indigo-200':'bg-slate-100 text-slate-600 border-slate-200', action:`app.openModule('oral_quotes')`, enabled:canRecordQuote},
      {key:'expense', icon:'fa-receipt', color:'bg-emerald-100 text-emerald-700', title:'開支申報', desc:`填表＋上傳單據；${routeText('finance')}`, badge:canSubmitExpense?'可申報':'請先登入', badgeCls:canSubmitExpense?'bg-emerald-100 text-emerald-700 border-emerald-200':'bg-slate-100 text-slate-600 border-slate-200', action:`app.openModule('finance'); setTimeout(()=>app.switchFinanceTab('expense'),300)`, enabled:canSubmitExpense},
    ];
    const grid=items.map(it=>{
      const btn=it.enabled
        ?`<button onclick="${it.action}" class="mt-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold w-full"><i class="fa-solid fa-arrow-right mr-1"></i>前往申請</button>`
        :`<button onclick="app.openLoginModal()" class="mt-2 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl text-[11px] font-bold w-full"><i class="fa-solid fa-lock mr-1"></i>登入後解鎖</button>`;
      return `<div class="border rounded-xl p-4 bg-white flex flex-col">
        <div class="flex items-center gap-2 mb-1"><div class="w-9 h-9 ${it.color} rounded-xl flex items-center justify-center text-base"><i class="fa-solid ${it.icon}"></i></div><b class="text-[13px]">${it.title}</b></div>
        <p class="text-[11px] text-slate-500 flex-1">${it.desc}</p>
        <div class="mt-2 flex items-center justify-between gap-2"><span class="text-[10px] px-2 py-0.5 rounded-full border ${it.badgeCls}">${it.badge}</span>${btn}</div>
      </div>`;
    }).join('');
    const loginBar=u
      ?`<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2"><span><i class="fa-solid fa-user-check mr-1"></i>已登入：<b>${escapeHtml(u.name)}</b>（${ROLE_LABELS[u.role]||u.role}${u.group_name?' · '+escapeHtml(u.group_name):''}）</span><button onclick="app.logout()" class="bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-xl text-[11px] font-bold">登出</button></div>`
      :`<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2"><span><i class="fa-solid fa-circle-info mr-1"></i>膳食及攤位物資可公開申請（無需登入）；物資（地域借用）、車輛及開支需登入。低於總主任提交的申請會先交本組總主任以上確認。</span><button onclick="app.openLoginModal()" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">登入</button></div>`;
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-4">
          <div class="flex items-center gap-3"><div class="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-xl"><i class="fa-solid fa-file-pen"></i></div><div><h3 class="font-bold text-sm">申請中心</h3><p class="text-[11px] text-emerald-100 mt-0.5">集中所有申請表。低於總主任提交會先由本組確認，再按批核頁的多選設定交指定組別批核及執行。</p></div></div>
        </div>
        ${loginBar}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${grid}</div>
        <div class="bg-white border rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed">
          <b>備註：</b>「申請中心」是全部申請表的<b>唯一入口</b>。低於總主任提交的申請一律先由本組總主任以上確認，再交指定批核組；批准後由指定執行組查看、統計、通知、列印及匯出最後名單。<br>
          • 批核組及執行組可在「批核中心 → 設定批核／執行組別」隨時修改，兩者均以組別按鈕顯示；執行組支援多選<br>
          • 膳食預設由<b>行政組批核、協調組執行及持有最後名單</b><br>
          • 想知自己（及下級）申請批到未？請看「<b>我的監察</b>」卡片，所有申請批核集中一頁。
        </div>
      </div>`;
    const actionsEl=document.getElementById('module-actions');
    if(actionsEl) actionsEl.innerHTML='';
  }
,
});
