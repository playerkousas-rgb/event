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
    (sup.booth_requests||[]).forEach(r=>{
      const st=genSt[r.status]||genSt.pending;
      const e=this.boothEquipOf(r);
      const eq=[e.tent?`帳篷${e.tent}`:'',e.table?`枱${e.table}`:'',e.chair?`椅${e.chair}`:'',e.skirting?`圍布${e.skirting}`:'',e.power_w?`電${e.power_w}W`:'',...e.other].filter(Boolean).join(' · ');
      out.push({type:'booth',typeLabel:'攤位計劃書',icon:'fa-solid fa-store',color:'text-orange-600',
        person:r.owner_name||r.requested_by||'', person_id:r.requested_by_id||'', group:r.group_name||'未分組',
        title:`${[r.zone,r.booth_no].filter(Boolean).join('')||r.booth_code||'-'} ${r.booth_name||r.unit_name||''}`, sub:`${r.unit_name||''}${eq?' · '+eq:''}${r.activity_desc?' · '+String(r.activity_desc).slice(0,30):''}`,
        status:st.t, color_name:st.c, who:r.approved_by||'', date:r.created_at||''});
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
  /* ── 匯整：把一組（或本人）的「已批核物資申請」合成「借了A×2、B×3…」一眼可見 ──
     目的：同一個人／同一個組今日借AB、後日加CD，喺「我的監察」一睇就知累積借咗咩。
     filterFn 用嚟收窄（組別／本人）；approved/modified 先計入（= 已經批咗、確定會借）。 */
  approvedSupplyChips(filterFn, heading){
    const sup=this.getSuppliesData();
    const rows=(sup.requests||[]).filter(r=>filterFn(r)&&['approved','modified'].includes(r.status));
    if(!rows.length) return '';
    const byItem={};
    rows.forEach(r=>{
      const k=String(r.item_name||'未命名').trim();
      const q=r.qty_approved!=null&&r.qty_approved!==undefined?Number(r.qty_approved):(Number(r.qty_requested)||0);
      const cur=byItem[k]||{q:0,unit:r.unit||'個'};
      cur.q+=q; byItem[k]=cur;
    });
    const chips=Object.entries(byItem).map(([name,c])=>`<span class="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">${escapeHtml(name)}×${c.q}${escapeHtml(c.unit||'')}</span>`).join('');
    return `<div class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-[11px] text-emerald-900 leading-relaxed"><i class="fa-solid fa-boxes-stacked mr-1"></i><b>${escapeHtml(heading)}</b><div class="flex flex-wrap gap-1 mt-1">${chips}</div></div>`;
  }
,
  /* ── 攤位計劃書匯整：把一組（或本人）的「已批核攤位計劃書」合成「XX攤位（帳篷×N、枱×N…）」── */
  approvedBoothChips(filterFn, heading){
    const sup=this.getSuppliesData();
    const rows=(sup.booth_requests||[]).filter(r=>filterFn(r)&&['approved','modified'].includes(r.status));
    if(!rows.length) return '';
    const t={tent:0,table:0,chair:0,skirt:0,pow:0}; const stalls=[];
    rows.forEach(r=>{
      const code=[r.zone,r.booth_no].filter(Boolean).join('')||r.booth_code||r.booth_name||'攤位';
      if(!stalls.includes(code)) stalls.push(code);
      t.tent+=Number(r.qty_tent)||0; t.table+=Number(r.qty_table)||0; t.chair+=Number(r.qty_chair)||0;
      t.skirt+=Number(r.skirting_qty)||0; t.pow+=Number(r.power_w)||0;
    });
    const parts=[];
    if(t.tent) parts.push(`帳篷×${t.tent}`);
    if(t.table) parts.push(`摺枱×${t.table}`);
    if(t.chair) parts.push(`摺椅×${t.chair}`);
    if(t.skirt) parts.push(`圍布×${t.skirt}`);
    if(t.pow) parts.push(`電源${t.pow}W`);
    return `<div class="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-[11px] text-orange-900 leading-relaxed"><i class="fa-solid fa-store mr-1"></i><b>${escapeHtml(heading)}</b><div class="mt-0.5"><b>${escapeHtml(stalls.join('、'))}</b>${parts.length?'（'+parts.join('、')+'）':''}</div></div>`;
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
      container.innerHTML=`<div class="text-center py-10"><div class="text-3xl mb-2">🔒</div><p class="text-xs text-slate-500">「我的監察」顯示你（及你下級）的所有申請批核進度，登入後才顯示</p><p class="text-[11px] text-slate-400 mt-1"><i class="fa-solid fa-arrow-up mr-1"></i>請按右上角「登入」</p></div>`;
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
      container.innerHTML=`
        <div class="space-y-4">
          <div class="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center gap-3">
            <div class="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-lg flex-shrink-0"><i class="fa-solid fa-eye"></i></div>
            <div class="min-w-0">
              <div class="font-bold text-sm">我的監察</div>
              <p class="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed">只顯示你自己的申請批核進度（膳食·物資·車輛·開支·報價）。你的姓名及角色顯示於最頂 BAR 右上角。</p>
            </div>
          </div>
          ${this.approvedSupplyChips(r=>this.monitorIsMine({person:r.requested_by,person_id:r.requested_by_id}),'我（已批核）借用一覽')}
          ${this.approvedBoothChips(r=>this.monitorIsMine({person:r.requested_by,person_id:r.requested_by_id}),'我（已批核）攤位計劃書')}
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
    const showSupAgg=this.monitorFilter==='all'||this.monitorFilter==='supplies';
    const showBoothAgg=this.monitorFilter==='all';
    const groupSections=groupNames.map((g,idx)=>{
      const recs=visibleOthers.filter(r=>(r.group||'未分組')===g);
      const pend=pendingCount(recs);
      const meta=this.groupMeta(g);
      return `<details class="border rounded-2xl bg-white" ${idx===0?'open':''}>
        <summary class="cursor-pointer list-none p-3 flex items-center justify-between gap-2">
          <span class="flex items-center gap-2"><span class="w-8 h-8 ${meta.cls} rounded-lg flex items-center justify-center text-[12px]"><i class="${meta.icon}"></i></span><b class="text-[13px]">${escapeHtml(g)}</b><span class="text-[10px] bg-slate-100 border px-2 py-0.5 rounded-full">${recs.length} 項</span>${pend?`<span class="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">${pend} 待處理</span>`:''}</span>
          <i class="fa-solid fa-chevron-down text-slate-400 text-[11px]"></i>
        </summary>
        <div class="px-3 pb-3 space-y-1.5">
          ${showSupAgg?this.approvedSupplyChips(r=>normalizeGroupName(r.group_name)===normalizeGroupName(g),`${g} 已批核借用一覽`):''}
          ${showBoothAgg?this.approvedBoothChips(r=>normalizeGroupName(r.group_name)===normalizeGroupName(g),`${g} 已批核攤位計劃書`):''}
          ${recs.map(r=>this.monitorRowHTML(r)).join('')}
        </div>
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
            <div class="p-3 space-y-1.5">
              ${showSupAgg?this.approvedSupplyChips(r=>this.monitorIsMine({person:r.requested_by,person_id:r.requested_by_id}),'我（已批核）借用一覽'):''}
              ${showBoothAgg?this.approvedBoothChips(r=>this.monitorIsMine({person:r.requested_by,person_id:r.requested_by_id}),'我（已批核）攤位計劃書'):''}
              ${mine.map(r=>this.monitorRowHTML(r)).join('')||`<div class="py-3 text-center"><p class="text-[11px] text-slate-400">你暫時未有申請紀錄，可到「申請中心」提交</p><button onclick="app.openModule('apply_hub')" class="mt-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10.5px] font-bold btn-mobile"><i class="fa-solid fa-file-pen mr-1"></i>前往申請中心</button></div>`}</div>
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
  /* ===================== 執行手冊 ===================== */
  renderExecManualModule(){
    const container=document.getElementById('module-content');
    if(!container) return;
    if(!this.execManualSubTab) this.execManualSubTab='activities';
    const tabs=[
      {k:'activities', icon:'fa-solid fa-map-location-dot', label:'場地圖、攤位總表及遊戲卡'},
      {k:'ceremony', icon:'fa-solid fa-crown', label:'典禮儀式'},
      {k:'adult_awards', icon:'fa-solid fa-user-shield', label:'成年獎勵及 RUNDOWN'},
      {k:'merit_award', icon:'fa-solid fa-trophy', label:'優異旅團獲獎'},
      {k:'participants', icon:'fa-solid fa-people-group', label:'參加旅團名單'},
      {k:'meal_box', icon:'fa-solid fa-bowl-food', label:'代訂餐盒'},
      {k:'staff', icon:'fa-solid fa-sitemap', label:'組織架構與聯絡'},
      {k:'crisis', icon:'fa-solid fa-triangle-exclamation', label:'危機處理'},
      {k:'finance_guide', icon:'fa-solid fa-file-invoice-dollar', label:'財務指引'},
      {k:'documents', icon:'fa-solid fa-file-shield', label:'通告及文件'}
    ];
    const tabBtns=tabs.map(t=>`<button onclick="app.switchExecManualTab('${t.k}')" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${this.execManualSubTab===t.k?'bg-slate-900 text-white shadow':'bg-slate-100 text-slate-600 hover:bg-slate-200'}"><i class="${t.icon} mr-1"></i>${t.label}</button>`).join('');
    container.innerHTML=`<div class="space-y-4"><div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">${tabBtns}</div><div id="exec-manual-panel"></div></div>`;
    this.renderExecManualTab();
  }
,
  switchExecManualTab(tab){
    const moved={booth_master:{tab:'activities',activitiesSubTab:'booth_master'},venue_setup:{tab:'activities',activitiesSubTab:'maps'}};
    if(moved[tab]){ const m=moved[tab]; this.activitiesSubTab=m.activitiesSubTab; tab=m.tab; }
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
      adult_awards:()=>{ panel.innerHTML=`<div class="space-y-3">${this.ceremonyPart1RundownV5HTML()}${this.adultAwards2026HTML()}</div>`; },
      merit_award:()=>{ panel.innerHTML=`<div class="bg-white border rounded-xl p-4">${this.rosterPanelHTML('merit_award',{scope:'exec'})}</div>`; },
      crisis:()=>this.renderCrisisModule(panel),
      participants:()=>this.renderExecManualParticipants(panel),
      meal_box:()=>{ this.renderExecManualMealBox(panel); },
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
      // 執行手冊只收活動當日真正會用到的文件；會議、籌備及活動教材仍留在完整文件庫。
      documents:()=>this.renderDocumentsModule(panel,true),
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
      {key:'booth', icon:'fa-store', color:'bg-orange-100 text-orange-700', title:'攤位計劃書', desc:`${routeText('booth')}｜取代 Google Form：未登入嘅負責人直接喺呢度填寫（招牌名／活動內容／「十五五」／帳篷／摺枱／摺椅／負責人）。提交後籌辦方即得兩種資料——① 借用統計（要借什麼＋招牌）② 執行手冊→攤位總表（自動填入）。公開填寫，無需登入`, badge:'公開可填寫（無需登入）', badgeCls:'bg-emerald-100 text-emerald-700 border-emerald-200', action:`app.openModule('booth'); setTimeout(()=>app.openBoothSupplyForm(),350)`, enabled:true},
      {key:'vehicle', icon:'fa-car', color:'bg-amber-100 text-amber-700', title:'車輛通行證申請 (含泊車證)', desc:`車牌／司機／用途；${routeText('vehicle')}`, badge:canSubmitSupply?'登入可申請':'請先登入', badgeCls:canSubmitSupply?'bg-amber-100 text-amber-700 border-amber-200':'bg-slate-100 text-slate-600 border-slate-200', action:`app.openModule('parking')`, enabled:canSubmitSupply},
      {key:'oral_quotes', icon:'fa-file-signature', color:'bg-indigo-100 text-indigo-700', title:'口頭報價登記', desc:'商戶/項目/金額，財務查核用', badge:canRecordQuote?'可登記':'總主任以上', badgeCls:canRecordQuote?'bg-indigo-100 text-indigo-700 border-indigo-200':'bg-slate-100 text-slate-600 border-slate-200', action:`app.openModule('oral_quotes')`, enabled:canRecordQuote},
      {key:'expense', icon:'fa-receipt', color:'bg-emerald-100 text-emerald-700', title:'開支申報', desc:`填表＋上傳單據；${routeText('finance')}`, badge:canSubmitExpense?'可申報':'請先登入', badgeCls:canSubmitExpense?'bg-emerald-100 text-emerald-700 border-emerald-200':'bg-slate-100 text-slate-600 border-slate-200', action:`app.openModule('finance'); setTimeout(()=>app.switchFinanceTab('expense'),300)`, enabled:canSubmitExpense},
    ];
    const grid=items.map(it=>{
      const btn=it.enabled
        ?`<button onclick="${it.action}" class="mt-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold w-full"><i class="fa-solid fa-arrow-right mr-1"></i>前往申請</button>`
        :`<div class="mt-2 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl text-[11px] font-bold w-full text-center"><i class="fa-solid fa-lock mr-1"></i>請按右上角「登入」</div>`;
      return `<div class="border rounded-xl p-4 bg-white flex flex-col">
        <div class="flex items-center gap-2 mb-1"><div class="w-9 h-9 ${it.color} rounded-xl flex items-center justify-center text-base"><i class="fa-solid ${it.icon}"></i></div><b class="text-[13px]">${it.title}</b></div>
        <p class="text-[11px] text-slate-500 flex-1">${it.desc}</p>
        <div class="mt-2 flex items-center justify-between gap-2"><span class="text-[10px] px-2 py-0.5 rounded-full border ${it.badgeCls}">${it.badge}</span>${btn}</div>
      </div>`;
    }).join('');
    const loginBar=u
      ?`<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900"><i class="fa-solid fa-circle-check mr-1 text-emerald-600"></i>已登入：膳食及攤位計劃書可公開申請；物資（地域借用）、車輛及開支可提交。你的身份及登出按鈕位於<b>最頂 BAR 右上角</b>。</div>`
      :`<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2"><span><i class="fa-solid fa-circle-info mr-1"></i>膳食及攤位計劃書可公開申請（無需登入）；物資（地域借用）、車輛及開支需登入（請按右上角「登入」）。低於總主任提交的申請會先交本組總主任以上確認。</span></div>`;
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

  /* ===================== 執行手冊新分頁：上傳式＋箱頭紙 ＝====================
     （PDF／Word／圖片／Drive 連結，Word→文字內嵌、PDF→整份內嵌、JSON→美化顯示），
     「箱頭紙」則係互動填寫＋一頁列印兩張。 */
  execManualAccentCls(accent){
    const M={indigo:{box:'bg-indigo-50 border-indigo-200',btn:'bg-indigo-600',btnText:'text-indigo-700'},sky:{box:'bg-sky-50 border-sky-200',btn:'bg-sky-600',btnText:'text-sky-700'},rose:{box:'bg-rose-50 border-rose-200',btn:'bg-rose-600',btnText:'text-rose-700'},emerald:{box:'bg-emerald-50 border-emerald-200',btn:'bg-emerald-600',btnText:'text-emerald-700'},amber:{box:'bg-amber-50 border-amber-200',btn:'bg-amber-600',btnText:'text-amber-700'}};
    return M[accent]||M.indigo;
  }
,

  getExecManualFiles(section){
    const key=LS.execManual(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    const all=(local&&local.files)||{};
    return all[section]||[];
  }
,
  saveExecManualFiles(section, files){
    const key=LS.execManual(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null')||{};
    const all=local.files||{};
    all[section]=files||[];
    local.files=all;
    localStorage.setItem(key,JSON.stringify(local));
  }
,
  canManageExecManualUpload(section){
    if(this.isDataFrozen&&this.isDataFrozen()) return false;
    if(!this.currentUser) return false;
    if(this.currentUser.mock_admin||this.isAdmin()) return true;
    const g=normalizeGroupName(this.currentUser.group_name||'');
    // v14：四張名單嘅附件區（roster_<list>）→ 交返比名單引擎判斷（典禮組／行政組／協調組）
    if(String(section||'').indexOf('roster_')===0){ const k=String(section).slice(7); if(this.rosterDef(k)) return this.rosterCanManage(k); }
    if(section==='meal_box') return g.includes('協調')||g.includes('行政')||this.canUploadDocument();
    if(section==='participants') return g.includes('行政')||this.canUploadDocument();
    if(section==='permit') return g.includes('協調')||g.includes('行政')||this.canUploadActivity();
    if(section==='venue_setup') return g.includes('協調')||g.includes('行政')||this.canUploadActivity();
    return false;
  }
,
  execManualFileCardHTML(f, key, canUp){
    let prev=this.activityFilePreviewHTML(f,key);
    return `<div class="border rounded-xl p-3 bg-white space-y-2">
      <div class="flex justify-between items-start gap-2">
        <div class="min-w-0"><b class="text-[13px]">${escapeHtml(f.title||'未命名檔案')}</b><div class="text-[11px] text-slate-500 mt-1">${escapeHtml(f.description||'')}</div><div class="text-[10px] text-slate-400 mt-0.5">上傳: ${escapeHtml(f.created_by||'')} | ${f.created_at?new Date(f.created_at).toLocaleString():''} | 版本: ${escapeHtml(f.version||'v1')}</div></div>
        <div class="flex flex-col gap-1">${canUp?`<button onclick="app.openExecManualFileForm('${key}','${f.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteExecManualFile('${key}','${f.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`:''}</div>
      </div>
      ${prev}
      <div class="flex gap-2 flex-wrap">${f.file_url?`<a href="${escapeHtml(f.file_url)}" target="_blank" class="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">開啟</a>`:''}${(f.file_data||f.file_name)?`<button onclick="app.downloadExecManualFile('${key}','${f.id}')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold">下載</button>`:''}</div>
    </div>`;
  }
,
  /* 附件分頁內容（回傳 HTML 字串）——可內嵌於執行手冊或部門頁面。 */
  execManualUploadTabHTML(key, opts){
    const files=this.getExecManualFiles(key);
    const canUp=this.canManageExecManualUpload(key);
    const a=this.execManualAccentCls(opts.accent||'indigo');
    return `
      <div class="space-y-3">
        <div class="${a.box} border rounded-xl p-3 text-[11px] leading-relaxed text-slate-700"><b>${escapeHtml(opts.title)}</b>${opts.intro?`：${escapeHtml(opts.intro)}`:''}</div>
        <div class="flex flex-wrap gap-2">
          ${canUp?`<button onclick="app.openExecManualFileForm('${key}')" class="${a.btn} text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳檔案 (${escapeHtml(opts.title)})</button>`:''}
          <button onclick="app.exportExecManualFiles('${key}')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>匯出 ${escapeHtml(opts.title)} JSON</button>
        </div>
        ${files.length?`<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${files.map(f=>this.execManualFileCardHTML(f,key,canUp)).join('')}</div>`:`<p class="text-xs text-slate-400 py-8 text-center">${escapeHtml(opts.empty||'暫無檔案')}</p>`}
      </div>`;
  }
,
  renderExecManualUploadTab(key, opts, box){
    const panel=box||document.getElementById('exec-manual-panel'); if(!panel) return;
    panel.innerHTML=this.execManualUploadTabHTML(key,opts);
  }
,
  /* ===================== v11 執行手冊分頁「各類附加資料」=====================
     箱頭紙・許可證式樣・失物認領（失物認領同時設於「行政組 → 部門管理中心」，由行政組紀錄） */
  renderExecManualMisc(panel){
    const box=panel||document.getElementById('exec-manual-panel'); if(!box) return;
    if(!this.execManualMiscTab) this.execManualMiscTab='box_label';
    const tabs=[
      {k:'box_label',  icon:'fa-solid fa-box-open',      label:'箱頭紙'},
      {k:'permit',     icon:'fa-solid fa-file-contract', label:'許可證式樣'},
      {k:'lost_found', icon:'fa-solid fa-box-archive',   label:'失物認領'}
    ];
    const cls=t=>this.execManualMiscTab===t?'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-900 text-white shadow':'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200';
    box.innerHTML=`
      <div class="space-y-3">
        <div class="bg-slate-50 border rounded-xl p-3 text-[11px] leading-relaxed text-slate-700"><b>📎 各類附加資料：</b>箱頭紙・許可證式樣・失物認領。<b>失物認領由行政組紀錄</b>，同一份紀錄亦設於「行政組 → 部門管理中心」。</div>
        <div class="flex gap-2 border-b pb-2 overflow-x-auto flex-wrap">
          ${tabs.map(t=>`<button onclick="app.switchExecManualMiscTab('${t.k}')" class="exec-misc-tab-btn ${cls(t.k)}"><i class="${t.icon} mr-1"></i>${t.label}</button>`).join('')}
        </div>
        <div id="exec-misc-tab-box_label" class="${this.execManualMiscTab==='box_label'?'':'hidden'}">${this.boxLabelPanelHTML()}</div>
        <div id="exec-misc-tab-permit" class="${this.execManualMiscTab==='permit'?'':'hidden'}"></div>
        <div id="exec-misc-tab-lost_found" class="${this.execManualMiscTab==='lost_found'?'':'hidden'}">${this.renderLostFoundHTML()}</div>
      </div>`;
    this.renderExecManualUploadTab('permit',{title:'許可證式樣',accent:'rose',empty:'暫無許可證式樣'},document.getElementById('exec-misc-tab-permit'));
  }
,
  switchExecManualMiscTab(tab){
    this.execManualMiscTab=tab;
    ['box_label','permit','lost_found'].forEach(t=>{
      const el=document.getElementById('exec-misc-tab-'+t);
      if(el) el.classList.toggle('hidden',t!==tab);
    });
    document.querySelectorAll('.exec-misc-tab-btn').forEach(btn=>{
      const t=(btn.getAttribute('onclick').match(/'([^']+)'/)||[])[1];
      btn.className='exec-misc-tab-btn '+(t===tab?'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-900 text-white shadow':'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200');
    });
  }
,
  /* —— 攤位總表（2026 總表）內容：v11 由「場地與活動總覽」內部分頁顯示 —— */
  boothMasterPanelHTML(){
    const booths=(this.getActivitiesData().booths||[]);
    const rows=booths.slice().sort((a,b)=>String(a.booth_number||'').localeCompare(String(b.booth_number||''),undefined,{numeric:true}));
    const ref2025=[
      ['A01','主題節目組','主題節目攤位'],['A02','港島航空組','飛行模擬體驗'],['A03','港島手工藝坊','童軍繩結挑戰'],['B02','港島童軍總會','童軍技能創新'],['B03','灣仔區','AR 解碼謎團'],['C01','膳食回收組','衣物回收'],['D02','港島第6旅','海洋探險 2.0'],['E03','港島第243旅','正向價值大轉盤'],['F01','香港青少年服務中心','情緒急救站'],['F08','港島童軍聯會','快問快答']
    ];
    return `<div class="space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2"><b class="text-[13px]"><i class="fa-solid fa-store mr-1 text-amber-600"></i>攤位總表</b><span class="text-[11px] text-slate-500">${rows.length} 個攤位</span></div>
      <div class="table-responsive bg-white border rounded-xl"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-2 text-left">編號</th><th class="px-2 py-2 text-left">負責單位</th><th class="px-2 py-2 text-left">攤位名稱／內容</th><th class="px-2 py-2 text-left">聯絡人</th><th class="px-2 py-2 text-center">人手</th><th class="px-2 py-2 text-center">確認</th></tr></thead><tbody class="divide-y">${rows.map(b=>`<tr><td class="px-2 py-1.5 font-mono font-bold" data-label="編號">${escapeHtml(b.booth_number||'')}</td><td class="px-2 py-1.5" data-label="負責單位">${escapeHtml(b.group_name||'')}</td><td class="px-2 py-1.5" data-label="攤位名稱／內容"><b>${escapeHtml(b.booth_name||'')}</b>${b.description?`<span class="block text-[10px] text-slate-500">${escapeHtml(b.description)}</span>`:''}</td><td class="px-2 py-1.5" data-label="聯絡人">${escapeHtml(b.responsible||b.contact||'')}</td><td class="px-2 py-1.5 text-center" data-label="人手">${escapeHtml(String(b.staff_count||b.staff||'—'))}</td><td class="px-2 py-1.5 text-center" data-label="確認">${String(b.confirmed||'').toUpperCase()==='Y'?'<span class="text-emerald-700 font-bold">✓</span>':'—'}</td></tr>`).join('')||'<tr><td colspan="6" class="px-2 py-6 text-center text-slate-400">暫無攤位資料</td></tr>'}</tbody></table></div>
      <details class="bg-slate-50 border rounded-xl p-3"><summary class="cursor-pointer text-[12px] font-bold text-slate-700">2025 攤位資料（參考）</summary><div class="table-responsive mt-3"><table class="min-w-full text-[11px]"><thead class="bg-white"><tr><th class="px-2 py-1 text-left">編號</th><th class="px-2 py-1 text-left">單位</th><th class="px-2 py-1 text-left">攤位</th></tr></thead><tbody class="divide-y">${ref2025.map(r=>`<tr>${r.map((c,i)=>`<td class="px-2 py-1 ${i===0?'font-mono':''}">${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
    </div>`;
  }
,
  openExecManualFileForm(key,id=null){
    if(!this.canManageExecManualUpload(key)){ showToast('無權限','error'); return; }
    const files=this.getExecManualFiles(key);
    const existing=id?files.find(f=>f.id===id):null;
    let html=`
      <input type="hidden" id="emf-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="emf-id" value="${existing?.id||''}">
      <input type="hidden" id="emf-section" value="${key}">
      <div class="space-y-3">
        <div><label class="text-[11px] font-bold">標題 *</label><input id="emf-title" value="${escapeHtml(existing?.title||'')}" required placeholder="檔案名稱" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">描述</label><textarea id="emf-desc" rows="2" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>
        <div><label class="text-[11px] font-bold">版本</label><input id="emf-version" value="${escapeHtml(existing?.version||'v1')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">上傳檔案 (PDF/Word/JSON/圖片)</label><input type="file" id="emf-file" accept=".jpg,.jpeg,.png,.pdf,.docx,.doc,.xlsx,.xls,.json,.txt" class="w-full text-xs mt-1"></div>
        <div><label class="text-[11px] font-bold">或貼上 Drive 連結</label><input id="emf-url" value="${escapeHtml(existing?.file_url||'')}" placeholder="https://drive.google.com/file/d/.../view" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        ${existing?.file_name?`<div class="text-[11px]">已上傳: ${escapeHtml(existing.file_name)}</div>`:''}
      </div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯檔案':'上傳檔案';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=async (e)=>{ e.preventDefault(); await this.submitExecManualFileForm(key); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async submitExecManualFileForm(key){
    const mode=document.getElementById('emf-mode').value, id=document.getElementById('emf-id').value;
    const title=document.getElementById('emf-title').value.trim();
    const desc=document.getElementById('emf-desc').value.trim();
    const version=document.getElementById('emf-version').value.trim()||'v1';
    const url=document.getElementById('emf-url').value.trim();
    const fileInput=document.getElementById('emf-file');
    let file_name='', file_data='', file_url=url, file_text='';
    if(fileInput.files[0]){
      const f=fileInput.files[0];
      file_name=f.name; file_data=await fileToDataUrl(f);
      if(/\.docx?$/i.test(f.name) && typeof mammoth!=='undefined'){
        try{ const ab=await f.arrayBuffer(); const r=await mammoth.extractRawText({arrayBuffer:ab}); file_text=(r.value||'').trim(); }catch(e){ file_text=''; }
      }
      if(/\.json$/i.test(f.name)){ try{ const text=await f.text(); file_text=JSON.stringify(JSON.parse(text),null,2); }catch(e){} }
    }
    if(!title){ showToast('請填寫標題','error'); return; }
    let files=this.getExecManualFiles(key);
    if(mode==='edit'){
      const i=files.findIndex(x=>x.id===id);
      if(i>=0) files[i]={...files[i], title, description:desc, version, file_name:file_name||files[i].file_name, file_data:file_data||files[i].file_data, file_url:file_url||files[i].file_url, file_text:file_text||files[i].file_text||'', updated_at:new Date().toISOString()};
    } else {
      files.push({id:'emf_'+Date.now(), section:key, title, description:desc, version, file_name, file_data, file_url, file_text, created_by:this.currentUser?.name||'', created_at:new Date().toISOString()});
    }
    this.saveExecManualFiles(key, files);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新檔案':'已上傳檔案','success');
    this.renderExecManualTab();
  }
,
  deleteExecManualFile(key,id){
    if(!this.canManageExecManualUpload(key)){ showToast('無權限','error'); return; }
    if(!confirm('確定刪除此檔案？')) return;
    this.saveExecManualFiles(key, this.getExecManualFiles(key).filter(f=>f.id!==id));
    this.renderExecManualTab();
    showToast('已刪除','warning');
  }
,
  downloadExecManualFile(key,id){
    const f=this.getExecManualFiles(key).find(x=>x.id===id);
    if(!f){ showToast('找不到檔案','error'); return; }
    if(f.file_url){ window.open(f.file_url,'_blank'); return; }
    if(f.file_data) downloadDataUrl(f.file_name||'download', f.file_data);
    else showToast('無檔案','warning');
  }
,
  exportExecManualFiles(key){
    const files=this.getExecManualFiles(key);
    const blob=new Blob([JSON.stringify(files,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`exec_manual_${key}_${todayISO()}.json`; a.click();
    showToast('已匯出 JSON','success');
  }
,
  // ── 參加旅團名單分頁：結構表（同步／上傳 Excel）＋ 上傳檔案──
  renderExecManualParticipants(panel){
    const box=panel||document.getElementById('exec-manual-panel'); if(!box) return;
    const participants=this.getParticipantsData();
    box.innerHTML=`<div class="space-y-3"><div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[12px] text-emerald-950"><b><i class="fa-solid fa-people-group mr-1"></i>參加旅團名單</b><span class="ml-2">共 ${participants.length} 旅團</span></div><div class="bg-white border rounded-xl p-4">${this.rosterPanelHTML('participants',{scope:'exec'})}</div></div>`;
  },

  /* 2026-10-04 各類餐食領取地點及供應時間（已定稿） */
  mealLogistics2026HTML(){
    const items=(this.eventData?.meal_logistics_2026)||[
      {label:'飯盒',place:'JPO 餐廳',time:'11:00',note:'旅團代訂餐盒（A/C 飯 + B/D 小食互通）'},
      {label:'小食餐盒',place:'JPO 餐廳',time:'12:00',note:'工作人員小食餐盒'},
      {label:'自助餐',place:'莫榮大樓',time:'12:30',note:'嘉賓／工作人員自助餐（莫榮大樓自助餐 司儀稿 V2）'}
    ];
    return `<div class="bg-rose-50 border-2 border-rose-200 rounded-xl p-3">
      <b class="text-[13px] text-rose-900"><i class="fa-solid fa-utensils mr-1"></i>10 月 4 日餐食領取地點及供應時間</b>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-[12px]">
        ${items.map(i=>`<div class="bg-white border border-rose-100 rounded-xl p-2.5">
          <div class="font-bold text-rose-800">${escapeHtml(i.label||'')}</div>
          <div class="mt-0.5"><i class="fa-solid fa-location-dot mr-1 text-rose-400"></i>${escapeHtml(i.place||'')}　<i class="fa-regular fa-clock ml-1 mr-1 text-rose-400"></i>${escapeHtml(i.time||'')}</div>
          ${i.note?`<div class="text-[10px] text-slate-500 mt-0.5">${escapeHtml(i.note)}</div>`:''}
        </div>`).join('')}
      </div>
    </div>`;
  },

  /* ══ v14 執行手冊新分頁「代訂餐盒名單」（協調組負責）══════════════════════════
     預定位置：執行手冊 → 代訂餐盒名單；提供結構表、點名及附件。
     名單來源：Excel／Word 上載（或「貼上文字」）；PDF 只可作附件內嵌預覽。 */
  renderExecManualMealBox(panel){
    const box=panel||document.getElementById('exec-manual-panel'); if(!box) return;
    box.innerHTML=`<div class="space-y-3"><div class="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[12px] text-rose-950"><b><i class="fa-solid fa-bowl-food mr-1"></i>旅團代訂餐盒</b></div><div class="bg-white border rounded-xl p-4">${this.rosterPanelHTML('meal_box',{scope:'exec'})}</div></div>`;
  },

  staffMealDigestHTML(){
    const rows=this.rosterViewRows('staff_meals');
    const done=rows.filter(r=>r._checked).length;
    const byMeal={};
    rows.forEach(r=>{ const m=String(r.meal||'未填餐款'); byMeal[m]=(byMeal[m]||0)+1; });
    const chips=Object.entries(byMeal).sort((a,b)=>b[1]-a[1]).map(([m,n])=>`<span class="bg-slate-100 border rounded-full px-2 py-0.5">${escapeHtml(m)} <b>${n}</b></span>`).join(' ');
    return `<div class="bg-slate-50 border rounded-xl p-3 text-[11px] text-slate-700 space-y-1">
      <b><i class="fa-solid fa-clipboard-check mr-1"></i>派發進度：</b>${done}/${rows.length} 已派
      <div class="flex gap-1.5 flex-wrap pt-1">${chips}</div>
      <div class="text-[10px] text-slate-500">工作人員餐膳名單。</div>
    </div>`;
  },

  mealMenuHTML(){
    const menu=this.eventData?.meal_menu_2026||[];
    const dist=this.eventData?.meal_distribution_2026||{};
    const line=(i)=>`${i.headcount!=null?i.headcount+' 人':''}${i.rice!=null?'｜飯 '+i.rice:''}${i.snack!=null?'｜小食 '+i.snack:''}`;
    return `
      ${this.mealLogistics2026HTML()}
      <div class="bg-white border rounded-xl p-4 space-y-3">
        <h4 class="font-bold text-sm"><i class="fa-solid fa-book-open mr-1 text-rose-600"></i>餐單</h4>
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[12px]">
          ${menu.map(m=>`<li class="bg-slate-50 border rounded-lg px-2.5 py-1.5">${escapeHtml(m)}</li>`).join('')}
        </ul>
        <div class="text-[10px] text-slate-500">餐盒 $60/份，限額 700 份（特別通告第12/26號）。已訂：飯 ${escapeHtml(dist.ordered?.rice||'—')}、小食 ${escapeHtml(String(dist.ordered?.snack||'—'))} 份。</div>
      </div>
      <div class="bg-white border rounded-xl p-4 space-y-2">
        <h4 class="font-bold text-sm"><i class="fa-solid fa-chart-simple mr-1 text-rose-600"></i>膳食派發總表</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
          <div><b class="text-slate-700">工作人員（按組）</b>
            <table class="min-w-full mt-1"><tbody class="divide-y">${(dist.staff_groups||[]).map(i=>`<tr><td class="py-1">${escapeHtml(i.label)}</td><td class="py-1 text-right text-slate-600">${escapeHtml(line(i))}</td></tr>`).join('')}</tbody></table>
          </div>
          <div><b class="text-slate-700">攤位工作人員</b>
            <div class="max-h-56 overflow-y-auto mt-1"><table class="min-w-full"><tbody class="divide-y">${(dist.booths||[]).map(i=>`<tr><td class="py-1">${escapeHtml(i.label)}</td><td class="py-1 text-right text-slate-600">${escapeHtml(line(i))}</td></tr>`).join('')}</tbody></table></div>
          </div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] mt-2 flex gap-2 flex-wrap">
          ${(dist.others||[]).map(i=>`<span class="bg-white border rounded-full px-2 py-0.5">${escapeHtml(i.label)}：${escapeHtml(line(i).replace(/^｜/,''))||'—'}</span>`).join('')}
          <span class="bg-emerald-600 text-white rounded-full px-2 py-0.5 font-bold">合共：${dist.totals?.headcount??'—'} 人｜飯 ${dist.totals?.rice||'—'}｜小食 ${dist.totals?.snack||'—'}</span>
        </div>
      </div>`;
  },
  /* 代訂餐盒 ↔ 膳食訂餐 對照（方便協調組落單：APP 訂餐數字 vs 名單數字） */
  mealBoxDigestHTML(){
    const roster=this.rosterViewRows('meal_box');
    const num=v=>Number(String(v??'').replace(/[^0-9.\-]/g,''))||0;
    const rosterTotal=roster.reduce((n,r)=>n+(num(r.qty_total)||num(r.qty_a)+num(r.qty_b)+num(r.qty_c)),0);
    const units=roster.length;
    const meals=this.getMealsData?this.getMealsData():{orders:[]};
    const approved=(meals.orders||[]).filter(o=>o.status==='approved'||o.status==='modified');
    const appTotal=approved.reduce((n,o)=>n+(Number(o.quantity)||0),0);
    const diff=appTotal-rosterTotal;
    return `<div class="bg-slate-50 border rounded-xl p-3 text-[11px] leading-relaxed text-slate-700">
      <b><i class="fa-solid fa-scale-balanced mr-1"></i>對數（自動）：</b>名單 ${units} 個旅團／<b>${rosterTotal}</b> 盒　｜　膳食管理已批核訂餐 <b>${appTotal}</b> 份　｜　差額 <b class="${diff===0?'text-emerald-700':'text-rose-600'}">${diff>0?'+':''}${diff}</b>${diff!==0?'（名單與訂餐紀錄唔一致，落單前請與行政組／旅團核實）':'（兩邊一致）'}
      <div class="text-[10px] text-slate-500 mt-1">如旅團係自行訂餐（冇經大會代訂），請喺名單「備註」註明，避免重複落單。</div>
    </div>`;
  },
/* —— 旅團點名簽收（行政組簽核領取紀念品等；名單沿用 admin_participants 數據；編號排序）—— */
  troopCheckinKey(){ return 'isd2026_troop_checkin_'+(this.currentEvent?.event_id||'isd_2026'); },
  getTroopCheckin(){ try{ return JSON.parse(localStorage.getItem(this.troopCheckinKey())||'{}'); }catch(e){ return {}; } },
  saveTroopCheckin(s){ localStorage.setItem(this.troopCheckinKey(), JSON.stringify(s||{})); },
  renderTroopCheckinHTML(){
    const troops=(this.eventData?.troop_checkin&&this.eventData.troop_checkin.length?this.eventData.troop_checkin:(this.eventData.participants||[])).filter(t=>t.unit_name||t.unit);
    const st=this.getTroopCheckin();
    const sort=this._troopCheckinSort||'no';
    const CHECK_ITEMS=['紀念品袋','襟章','禮物袋','遊戲卡','期票/單據','簽到表/抽籤令'];
    const sorted=[...troops].sort((a,b)=>{
      if(sort==='area') return String(a.area||'').localeCompare(String(b.area||''),'zh-Hant');
      if(sort==='unit') return String(a.unit_name||a.unit||'').localeCompare(String(b.unit_name||b.unit||''),'zh-Hant');
      if(sort==='leader') return String(a.resp_leader||a.leader||'').localeCompare(String(b.resp_leader||b.leader||''),'zh-Hant');
      if(sort==='pending'){ const k=t=>(st[this.troopCheckinRowKey(t)]||{}).signed?1:0; return k(a)-k(b); }
      return (Number(a.no)||0)-(Number(b.no)||0);
    });
    const canTick=this.rosterCanTick('participants')||this.isAdmin();
    const doneCount=Object.values(st).filter(v=>v&&v.signed).length;
    const rows=sorted.map((t,i)=>{
      const key=this.troopCheckinRowKey(t);
      const r=st[key]||{};
      const itemChecks=CHECK_ITEMS.map((it,j)=>{
        const on=!!(r.items&&r.items[j]);
        return `<label class="inline-flex items-center gap-1 text-[10px] border rounded-lg px-1.5 py-0.5 ${on?'bg-emerald-50 border-emerald-300 text-emerald-800':'bg-slate-50 text-slate-400'}"><input type="checkbox" data-troop-item="${j}" data-row="${this.troopCheckinRowKey(t)}" ${on?'checked':''} ${canTick?'':'disabled'} onchange="app.troopCheckinSet(this)" class="accent-emerald-600">${it}</label>`;
      }).join('');
      return `<tr class="${r.signed?'bg-emerald-50/60':''}">
        <td class="px-2 py-1 font-mono" data-label="編號">${escapeHtml(String(t.no||i+1))}</td>
        <td class="px-2 py-1" data-label="區">${escapeHtml(t.area||'')}</td>
        <td class="px-2 py-1 font-medium" data-label="旅團">${escapeHtml(t.unit_name||t.unit||'')}</td>
        <td class="px-2 py-1" data-label="總人數">${escapeHtml(String(t.headcount||''))}</td>
        <td class="px-2 py-1" data-label="代訂餐盒">${t.meal_boxes?escapeHtml(String(t.meal_boxes)):'<span class="text-slate-300">—</span>'}</td>
        <td class="px-2 py-1" data-label="領隊">${escapeHtml(t.leader||'')}</td>
        <td class="px-2 py-1 text-center" data-label="簽收"><input type="checkbox" data-troop-sign="1" data-row="${this.troopCheckinRowKey(t)}" ${r.signed?'checked':''} ${canTick?'':'disabled'} onchange="app.troopCheckinSet(this)" class="w-4 h-4 accent-emerald-600"></td>
        <td class="px-2 py-1 text-[10px]" data-label="領取時間/簽收人">${r.signed?`<span class="text-emerald-700 font-bold">${escapeHtml(r.time||'')}${r.signed_by?' · '+escapeHtml(r.signed_by):''}</span>`:'<span class="text-slate-300">—</span>'}</td>
        <td class="px-2 py-1" data-label="領取組件"><div class="flex flex-wrap gap-1">${itemChecks}</div></td>
        <td class="px-2 py-1 text-center" data-label="預備"><input type="checkbox" data-troop-prep="1" data-row="${this.troopCheckinRowKey(t)}" ${r.prepared?'checked':''} ${canTick?'':'disabled'} onchange="app.troopCheckinSet(this)" class="w-4 h-4 accent-sky-600"></td>
        <td class="px-2 py-1" data-label="收據(簽名)">${canTick?`<input data-troop-receipt="1" data-row="${this.troopCheckinRowKey(t)}" value="${escapeHtml(r.receipt||'')}" onchange="app.troopCheckinSet(this)" placeholder="領取人簽名" class="w-full border rounded px-1 py-0.5 text-[11px]">`:(r.receipt?escapeHtml(r.receipt):'<span class="text-slate-300">—</span>')}</td>
      </tr>`;
    }).join('');
    const headerCols=['編號','區','旅團','總人數','代訂餐盒','領隊','簽收','領取時間/簽收人','領取組件','預備','收據(簽名)'];
    return `<div class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <b class="text-[13px]"><i class="fa-solid fa-clipboard-check mr-1 text-emerald-600"></i>旅團點名簽收 (簽收進度 ${doneCount}/${sorted.length})</b>
        <div class="flex items-center gap-2 flex-wrap">
          <select onchange="app._troopCheckinSort=this.value;app.renderExecManualTab();" class="border rounded-lg px-2 py-1 text-[11px] bg-white">
            <option value="no" ${sort==='no'?'selected':''}>按編號</option>
            <option value="area" ${sort==='area'?'selected':''}>按區</option>
            <option value="unit" ${sort==='unit'?'selected':''}>按旅團</option>
            <option value="leader" ${sort==='leader'?'selected':''}>按領隊</option>
            <option value="pending" ${sort==='pending'?'selected':''}>未簽收優先</option>
          </select>
          <button onclick="app.printTroopCheckin()" class="bg-slate-900 text-white px-2 py-1 rounded-lg text-[11px] font-bold"><i class="fa-solid fa-print mr-1"></i>列印</button>
        </div>
      </div>
      <div id="troop-checkin-print" class="table-responsive bg-white border rounded-xl"><table class="min-w-full text-[11px]">
        <thead class="bg-slate-100"><tr>${headerCols.map(h=>`<th class="px-2 py-1 ${['簽收','預備'].includes(h)?'text-center':'text-left'}">${h}</th>`).join('')}</tr></thead>
        <tbody class="divide-y">${rows||'<tr><td colspan="11" class="px-2 py-6 text-center text-slate-400">暫無旅團名單</td></tr>'}</tbody>
      </table></div>
    </div>`;
  },
  troopCheckinRowKey(t){ return String(t.no||'')+'|'+(t.unit_name||t.unit||''); },
  troopCheckinState(t){ const st=this.getTroopCheckin(); return st[this.troopCheckinRowKey(t)]||null; },
  troopCheckinSet(el){
    const key=el.dataset.row; if(!key) return;
    const st=this.getTroopCheckin(); const r=st[key]||{};
    if(el.dataset.troopSign==='1'){ r.signed=el.checked; if(el.checked){ r.time=new Date().toLocaleString('zh-Hant-HK',{hour12:false}).slice(0,19); r.signed_by=this.currentUser?.name||''; } }
    else if(el.dataset.troopPrep==='1'){ r.prepared=el.checked; }
    else if(el.dataset.troopReceipt==='1'){ r.receipt=el.value; }
    else if(el.dataset.troopItem){ const j=parseInt(el.dataset.troopItem)||0; r.items=r.items||[false,false,false,false,false,false]; r.items[j]=el.checked; }
    st[key]=r; this.saveTroopCheckin(st);
    if(this.rosterBackendReady&&this.rosterBackendReady()){
      const parts=key.split('|');
      fetch(this.gasUrl||localStorage.getItem(LS.gasUrl),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey||localStorage.getItem(LS.apiKey),module:'Troop_Checkin',record:{row_key:key,no:parts[0]||'',unit:parts[1]||'',signed:r.signed?'Y':'',time:r.time||'',signed_by:r.signed_by||'',items:(r.items||[]).map((b,j)=>b?['紀念品袋','襟章','禮物袋','遊戲卡','期票/單據','簽到表/抽籤令'][j]:'').filter(Boolean).join('、'),prepared:r.prepared?'Y':'',receipt:r.receipt||'',updated_at:new Date().toISOString()}})}).catch(()=>{});
    }
  },
  printTroopCheckin(){ if(this.printCoordArea) this.printCoordArea('troop-checkin-print','旅團點名簽收'); },

  /* ===================== 箱頭紙 (Box Label)：指定式樣（2026）＝====================
     v11.1 用戶定案：改用地域指定式樣（Drive：港島童軍繽紛日 物資箱頭紙），年份由 2025 改為 2026。
     式樣內容：香港童軍總會 港島地域／港島童軍繽紛日 2026 物資／組別・負責人或攤位名稱／
     數量（序號 / 需運送物資總數）／去程 (4/10/2026) 百週年紀念大樓 → 香港警察學院／
     活動完結：香港警察學院 → 百週年紀念大樓・自行運走・棄置・交地域處理。
     只需改年份即可沿用；預設帶入登入組別；一張 A4 上下印兩張 A5，沿中間虛線自行剪開（慳紙環保）。 */
  boxLabelYear(){ return (this.currentEvent&&this.currentEvent.start_date||'').slice(0,4)||'2026'; }
,
  // 去程日期＝活動首日，按指定式樣以 d/m/yyyy 顯示（例：4/10/2026）
  boxLabelTripDate(year){
    const sd=(this.currentEvent&&this.currentEvent.start_date)||'';
    const y=String(year||this.boxLabelYear());
    if(/^\d{4}-\d{2}-\d{2}$/.test(sd)){
      const [sy,m,d]=sd.split('-');
      return `${Number(d)}/${Number(m)}/${y||sy}`;
    }
    return `4/10/${y}`;
  }
,
  boxLabelFormHTML(prefix, defaults){
    const d=defaults||{};
    const year=d.year||this.boxLabelYear();
    const group=d.group||(this.currentUser?normalizeGroupName(this.currentUser.group_name||''):'');
    const sel=(v,val)=>String(v||'')===val?'selected':'';
    return `
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">年份 *（只需改年份）</label><input id="${prefix}year" value="${escapeHtml(year)}" oninput="app.syncBoxLabelYearHint('${prefix}')" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">組別 *</label><input id="${prefix}group" value="${escapeHtml(group)}" placeholder="例如 行政" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">負責人／攤位名稱</label><input id="${prefix}person" value="${escapeHtml(d.person||'')}" placeholder="式樣：負責人／攤位名稱" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">序號</label><input id="${prefix}seq" value="${escapeHtml(d.seq||'')}" placeholder="第幾箱" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">需運送物資總數</label><input id="${prefix}total" value="${escapeHtml(d.total||'')}" placeholder="共幾箱" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2 bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2">
          <label class="flex items-center gap-2 text-[12px] font-bold"><input type="checkbox" id="${prefix}outbound" ${d.outbound===false?'':'checked'}> 去程 (<span id="${prefix}trip-date">${escapeHtml(this.boxLabelTripDate(year))}</span>)　百週年紀念大樓 → 香港警察學院</label>
          <div>
            <label class="text-[11px] font-bold">活動完結</label>
            <select id="${prefix}return" class="w-full px-3 py-2 border rounded-xl text-sm mt-1 bg-white">
              <option value="" ${sel(d.ret,'')}>（未選擇）</option>
              <option value="香港警察學院 → 百週年紀念大樓" ${sel(d.ret,'香港警察學院 → 百週年紀念大樓')}>香港警察學院 → 百週年紀念大樓</option>
              <option value="自行運走" ${sel(d.ret,'自行運走')}>自行運走</option>
              <option value="棄置" ${sel(d.ret,'棄置')}>棄置</option>
              <option value="交地域處理" ${sel(d.ret,'交地域處理')}>交地域處理</option>
            </select>
          </div>
        </div>
      </div>`;
  }
,
  syncBoxLabelYearHint(prefix){
    const y=document.getElementById((prefix||'boxl_')+'year');
    const t=document.getElementById((prefix||'boxl_')+'trip-date');
    if(y&&t) t.textContent=this.boxLabelTripDate(y.value.trim());
  }
,
  readBoxLabelFields(prefix){
    const v=id=>{ const el=document.getElementById(prefix+id); return el?String(el.value||'').trim():''; };
    const chk=id=>{ const el=document.getElementById(prefix+id); return el?!!el.checked:true; };
    const year=v('year')||this.boxLabelYear();
    return { year, group:v('group'), person:v('person'), seq:v('seq'), total:v('total'),
             outbound:chk('outbound'), ret:v('return'), trip_date:this.boxLabelTripDate(year) };
  }
,
  boxLabelPanelHTML(){
    const d={};
    return `
      <div class="space-y-3">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900"><b>箱頭紙（Box Label）：</b>採用地域<b>指定式樣</b>（香港童軍總會 港島地域 · 港島童軍繽紛日 物資），<b>只需改年份（現為 ${escapeHtml(this.boxLabelYear())}）</b>即可沿用；組別預設為你的登入組別，其餘可自選填。列印時<b>一張 A4 上下印兩張 A5（每張 210×148.5mm）</b>，沿中間虛線自行剪開即可貼上各箱，慳紙環保。任何登入成員（尤其部門中心）都可填寫及列印。</div>
        <div class="flex gap-2 flex-wrap items-center">
          <button onclick="app.printBoxLabels()" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印箱頭紙 (1張A4·2張A5)</button>
          ${this.currentUser?`<button onclick="app.openBoxLabelModal()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">放大填寫／預覽</button>`:''}
        </div>
        <div class="bg-white border rounded-xl p-4 space-y-3">
          ${this.boxLabelFormHTML('boxl_', d)}
          <div class="text-[11px] text-slate-500">💡 可先係上方填好，再按「列印」；部門中心入口亦可用同一個表單，組別自動帶入你嘅登入組別。式樣與地域指定版本一致，只係年份改為 ${escapeHtml(this.boxLabelYear())}。列印建議設定 <b>A4 · 邊距「無」· 縮放 100%</b>，出嚟沿中間虛線剪開就係兩張 A5。</div>
        </div>
      </div>`;
  }
,
  renderExecManualBoxLabel(panel){
    const box=panel||document.getElementById('exec-manual-panel');
    if(box) box.innerHTML=this.boxLabelPanelHTML();
  }
,
  // 指定式樣一張標籤（HTML）——與 Drive 版面一致，只改年份
  boxLabelSheetHTML(f){
    const box=(on,txt)=>`<span class="opt"><span class="tick">${on?'&#9635;':'&#9633;'}</span>${escapeHtml(txt)}</span>`;
    const ret=f.ret||'';
    return `
      <div class="boxlabel">
        <div class="hdr">香港童軍總會　港島地域</div>
        <div class="title">港島童軍繽紛日 ${escapeHtml(f.year)} 物資</div>
        <div class="line">
          <span class="lbl">組別：</span><span class="fill grp">${escapeHtml(f.group||'')}</span><span class="unit">組</span>
          <span class="lbl">負責人／攤位名稱</span><span class="fill">${escapeHtml(f.person||'')}</span>
        </div>
        <div class="line">
          <span class="lbl">數量：</span><span class="fill num">${escapeHtml(f.seq||'')}</span><span class="slash">/</span><span class="fill num">${escapeHtml(f.total||'')}</span>
          <span class="cap">（序號 / 需運送物資總數）</span>
        </div>
        <table class="trip">
          <tr><td class="c1">${box(f.outbound!==false,`去程 (${f.trip_date})`)}</td><td class="c2">百週年紀念大樓 &rarr; 香港警察學院</td></tr>
          <tr><td class="c1">${box(!!ret,'活動完結')}</td><td class="c2">
            ${box(ret==='香港警察學院 → 百週年紀念大樓','香港警察學院 → 百週年紀念大樓')}
            ${box(ret==='自行運走','自行運走')}
            ${box(ret==='棄置','棄置')}
            ${box(ret==='交地域處理','交地域處理')}
          </td></tr>
        </table>
      </div>`;
  }
,
  printBoxLabels(){
    const f=this.readBoxLabelFields('boxl_');
    const win=window.open('','_blank');
    if(!win){ showToast('請允許彈出視窗以列印','warning'); return; }
    win.document.write(`<!DOCTYPE html><html lang="zh-HK"><head><meta charset="utf-8"><title>箱頭紙 ${escapeHtml(f.year)}</title><style>
      /* 一張 A4 上下印兩張 A5：A4=210×297mm，每張標籤=210×148.5mm（正 A5），
         邊距歸零先可以兩張啱啱好排滿一頁；中間虛線＝剪開線。 */
      @page{size:A4 portrait; margin:0;}
      html,body{margin:0; padding:0; background:#fff;}
      body{font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif; color:#000;}
      .a4{position:relative; width:210mm;}
      .boxlabel{width:210mm; height:148.5mm; border:2px solid #000; padding:9mm 8mm; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-evenly; gap:5mm; overflow:hidden; page-break-inside:avoid; break-inside:avoid;}
      .cutline{position:absolute; left:5mm; right:5mm; top:148.5mm; border-top:2px dashed #888; z-index:5;}
      .cutline .sc{position:absolute; left:0; top:-4.5mm; font-size:12pt; color:#888; background:#fff; padding:0 2px; line-height:1;}
      .hdr{font-size:16pt; font-weight:700; text-align:center; letter-spacing:2px;}
      .title{font-size:24pt; font-weight:800; text-align:center; border-bottom:2px solid #000; padding-bottom:3mm;}
      .line{display:flex; align-items:flex-end; gap:4px; font-size:13pt; flex-wrap:wrap;}
      .line .lbl{font-weight:700; white-space:nowrap;}
      .line .fill{flex:1; min-width:28mm; border-bottom:1.5px solid #000; min-height:8mm; font-size:15pt; font-weight:700; text-align:center; padding:0 4px;}
      .line .fill.grp{flex:0 0 40mm;} .line .fill.num{flex:0 0 22mm;}
      .line .unit{font-weight:700;} .line .slash{font-size:15pt; font-weight:700;}
      .line .cap{font-size:9pt; color:#333; white-space:nowrap;}
      table.trip{width:100%; border-collapse:collapse; font-size:11pt;}
      table.trip td{border:1.5px solid #000; padding:3mm 3mm; vertical-align:middle;}
      table.trip td.c1{width:38%; font-weight:700;}
      .opt{display:inline-block; margin-right:5mm; white-space:nowrap;}
      .opt .tick{font-family:'DejaVu Sans',sans-serif; margin-right:3px; font-size:13pt;}
      @media print{ .noprint{display:none !important;} }
    </style></head><body>
      <div class="noprint" style="position:sticky; top:0; z-index:10; background:#f5f5f4; border-bottom:1px solid #ddd; padding:10px 14px; font-family:sans-serif; font-size:13px; color:#333;">
        <button onclick="window.print()" style="background:#111;color:#fff;padding:8px 20px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">列印（1張A4｜上下2張A5）</button>
        <span style="margin-left:10px;">✂ 列印後沿中間虛線剪開＝兩張 A5 箱頭紙。建議列印設定：<b>A4 · 邊距「無」· 縮放 100%</b>。</span>
      </div>
      <div class="a4">
        <div class="cutline"><span class="sc">&#9986;</span></div>
        ${this.boxLabelSheetHTML(f)}
        ${this.boxLabelSheetHTML(f)}
      </div>
    </body></html>`);
    win.document.close();
  }
,
  openBoxLabelModal(groupName){
    const defaults={ group: groupName||(this.currentUser?normalizeGroupName(this.currentUser.group_name||''):'') };
    document.getElementById('record-modal-title').textContent=`箱頭紙 ${this.boxLabelYear()}（指定式樣 · 填寫／列印）`;
    document.getElementById('record-form-fields').innerHTML=this.boxLabelFormHTML('boxl_', defaults)+`
      <div class="flex justify-end gap-2 pt-3 border-t mt-3"><button onclick="app.printBoxLabels()" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印箱頭紙 (1張A4·2張A5)</button></div>`;
    document.getElementById('record-form').onsubmit=(e)=>e.preventDefault();
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
});
