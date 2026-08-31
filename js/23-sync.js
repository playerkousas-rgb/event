/* 23-sync.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{
  /* ===================== 跨裝置同步：所有申請（v7.7） =====================
     正式活動（已連後端）一次過從 GAS 拉回 膳食訂餐／物資申請／車輛通行證／泊車證，
     讓目前設定的本組確認人、批核組及執行組跨裝置看到正確狀態；示範沙盒永不連線。 */
  async syncApplicationsFromGas(){
    if(this.isDemoEvent()||!this.gasUrl) return;
    const eid=this.currentEvent?.event_id||'isd_2026';
    let d=null;
    try{
      const res=await fetch(`${this.gasUrl}?action=getEventData&event_id=${encodeURIComponent(eid)}&api_key=${encodeURIComponent(this.apiKey)}`);
      const j=await res.json();
      d=(j&&j.data)?j.data:null;
    }catch(e){ return; }
    if(!d) return;
    let touched=false;
    // ── 膳食訂餐 ──
    const hasOrderRows=Array.isArray(d.Meal_Orders);
    const orderRows=hasOrderRows?d.Meal_Orders:[];
    if(hasOrderRows){
      const meals=this.getMealsData();
      const deleted=this.getDeletedRecordIds('Meal_Orders');
      const map=new Map();
      orderRows.forEach(r=>{ if(!r.order_id||deleted.has(String(r.order_id))) return; map.set(String(r.order_id),{order_id:String(r.order_id),menu_id:String(r.menu_id||''),user_id:String(r.user_id||''),user_name:String(r.user_name||''),group_name:String(r.group_name||''),selection:String(r.selection||''),quantity:Number(r.quantity)||1,remarks:String(r.remarks||''),status:String(r.status||'pending'),confirmed_by:String(r.confirmed_by||''),approved_by:String(r.approved_by||''),requester_role:String(r.requester_role||''),group_confirmation_status:String(r.group_confirmation_status||''),group_confirmed_by:String(r.group_confirmed_by||r.confirmed_by||''),group_confirmed_at:String(r.group_confirmed_at||''),created_at:String(r.created_at||''),updated_at:String(r.updated_at||'')}); });
      meals.orders=[...map.values()];
      this.saveMealsData(meals,true); touched=true;
    }
    // ── 膳食菜單（v8.5 修復：菜單同樣以後端 Meals 表為準合併——之前只拉 Meal_Orders，
    //    令其他裝置／登出後看不到菜單、無法申請 A/B/C 餐。本機新建未同步的菜單保留。）──
    if(Array.isArray(d.Meals)){
      const meals=this.getMealsData();
      const deletedMenus=this.getDeletedRecordIds('Meals');
      const menuMap=new Map((meals.menus||[]).map(m=>[String(m.menu_id),m]));
      let menuChanged=false;
      d.Meals.forEach(r=>{
        if(!r.meal_id||deletedMenus.has(String(r.meal_id))) return;
        const optsRaw=r.options;
        const options=Array.isArray(optsRaw)?optsRaw.map(x=>String(x)):String(optsRaw||'A餐,B餐,C餐,不吃').split(',').map(x=>x.trim()).filter(Boolean);
        const locked=(r.locked===true)||/^(true|1|是|y)$/i.test(String(r.locked??'').trim());
        const menu={menu_id:String(r.meal_id),date:String(r.date||todayISO()),meal_type:String(r.meal_type||'午餐'),menu_desc:String(r.menu_desc||''),options,price:Number(r.price)||0,deadline:String(r.deadline||''),status:String(r.status||'open'),locked,group_name:String(r.group_name||''),created_by:String(r.created_by||r.requested_by||''),created_at:String(r.created_at||'')};
        const prev=menuMap.get(String(r.meal_id));
        if(!prev||prev.date!==menu.date||prev.menu_desc!==menu.menu_desc||prev.deadline!==menu.deadline||prev.locked!==menu.locked||JSON.stringify(prev.options)!==JSON.stringify(options)||prev.group_name!==menu.group_name||prev.status!==menu.status){ menuChanged=true; }
        menuMap.set(String(r.meal_id),menu);
      });
      const menus=[...menuMap.values()].filter(m=>!deletedMenus.has(String(m.menu_id)));
      if(menuChanged||menus.length!==(meals.menus||[]).length){
        meals.menus=menus;
        this.saveMealsData(meals,true); touched=true;
      }
    }
    // ── 物資申請 + 車輛通行證 ──
    const hasReqRows=Array.isArray(d.Supply_Requests),hasVehRows=Array.isArray(d.Vehicle_Passes);
    const reqRows=hasReqRows?d.Supply_Requests:[];
    const vehRows=hasVehRows?d.Vehicle_Passes:[];
    if(hasReqRows||hasVehRows){
      const sup=this.getSuppliesData();
      if(hasReqRows){
        const deleted=this.getDeletedRecordIds('Supply_Requests');
        const map=new Map();
        reqRows.forEach(r=>{ if(!r.request_id||deleted.has(String(r.request_id))) return; const prev=map.get(String(r.request_id))||{};
          map.set(String(r.request_id),{...prev,
            request_id:String(r.request_id), event_id:String(r.event_id||eid), supply_id:String(r.supply_id||''),
            item_name:String(r.item_name||prev.item_name||''), qty_requested:Number(r.qty_requested)||0,
            qty_approved:(r.qty_approved===''||r.qty_approved===undefined||r.qty_approved===null)?null:Number(r.qty_approved),
            unit:String(r.unit||prev.unit||'個'), group_name:String(r.group_name||''), reason:String(r.reason||prev.reason||''),
            date_needed:String(r.date_needed||prev.date_needed||''), deadline:String(r.deadline||prev.deadline||''),
            contact:String(r.contact||prev.contact||''), status:String(r.status||'pending'),
            requested_by:String(r.requested_by||''), requested_by_id:String(r.requested_by_id||''), requester_role:String(r.requester_role||''),
            group_confirmation_status:String(r.group_confirmation_status||''), group_confirmed_by:String(r.group_confirmed_by||''), group_confirmed_at:String(r.group_confirmed_at||''),
            approved_by:String(r.approved_by||''), approved_at:String(r.approved_at||''), notes:String(r.notes||''),
            created_at:String(r.created_at||prev.created_at||'')});
        });
        sup.requests=[...map.values()];
      }
      if(hasVehRows){
        const deleted=this.getDeletedRecordIds('Vehicle_Passes');
        const map=new Map();
        vehRows.forEach(v=>{ if(!v.pass_id||deleted.has(String(v.pass_id))) return; const prev=map.get(String(v.pass_id))||{};
          map.set(String(v.pass_id),{...prev,
            pass_id:String(v.pass_id), event_id:String(v.event_id||eid), plate:String(v.plate||''),
            driver_name:String(v.driver_name||''), driver_contact:String(v.driver_contact||''),
            vehicle_type:String(v.vehicle_type||'私家車'), purpose:String(v.purpose||''), group_name:String(v.group_name||''),
            entry_date:String(v.entry_date||''), exit_date:String(v.exit_date||''), parking_location:String(v.parking_location||''),
            deadline:String(v.deadline||prev.deadline||''), status:String(v.status||'pending'),
            requested_by:String(v.requested_by||''), requested_by_id:String(v.requested_by_id||''), requester_role:String(v.requester_role||''),
            group_confirmation_status:String(v.group_confirmation_status||''), group_confirmed_by:String(v.group_confirmed_by||''), group_confirmed_at:String(v.group_confirmed_at||''),
            approved_by:String(v.approved_by||''), approved_at:String(v.approved_at||''), notes:String(v.notes||''),
            created_at:String(v.created_at||prev.created_at||'')});
        });
        sup.vehicle_passes=[...map.values()];
      }
      // 只寫本地，避免整批倒灌回後端
      localStorage.setItem(LS.supplies(eid), JSON.stringify(sup));
      this.eventData['supplies']=sup;
      touched=true;
    }
    // ── 攤位計劃書（v8.9 補漏：後端 Booth_Requests 合併——之前只寫出唔讀返，
    //    令其他裝置／重開後睇唔到攤位卡／總表／借用統計；現後端 getEventData 已回傳，此處合併。）──
    if(Array.isArray(d.Booth_Requests)){
      const sup=this.getSuppliesData();
      const deleted=this.getDeletedRecordIds('Booth_Requests');
      const map=new Map((sup.booth_requests||[]).map(r=>[String(r.request_id),r]));
      d.Booth_Requests.forEach(r=>{
        if(!r.request_id||deleted.has(String(r.request_id))) return;
        const prev=map.get(String(r.request_id))||{};
        let extra=[];
        try{ const a=JSON.parse(r.extra_items_json||'[]'); if(Array.isArray(a)) extra=a.map(it=>({item_name:it.item_name||'',qty_requested:parseInt(it.qty_requested||0)||0,unit:it.unit||'個'})); }catch(e){ extra=prev.extra_items||[]; }
        map.set(String(r.request_id),{
          request_id:String(r.request_id),event_id:String(r.event_id||eid),item_name:String(r.item_name||prev.item_name||''),
          qty_requested:Number(r.qty_requested)||0,
          qty_approved:(r.qty_approved===''||r.qty_approved===undefined||r.qty_approved===null)?null:Number(r.qty_approved),
          unit:String(r.unit||prev.unit||'份'),group_name:normalizeGroupName(r.group_name||''),
          purpose:String(r.purpose||prev.purpose||''),contact:String(r.contact||prev.contact||''),
          zone:String(r.zone||''),booth_no:String(r.booth_no||''),booth_code:String(r.booth_code||''),
          unit_name:String(r.unit_name||''),booth_name:String(r.booth_name||''),
          activity_desc:String(r.activity_desc||''),fif15_content:String(r.fif15_content||''),
          qty_tent:Number(r.qty_tent)||0,qty_table:Number(r.qty_table)||0,qty_chair:Number(r.qty_chair)||0,
          skirting_qty:Number(r.skirting_qty)||0,power_w:Number(r.power_w)||0,
          other_req:String(r.other_req||''),other_need:String(r.other_need||''),delivery:String(r.delivery||''),
          owner_name:String(r.owner_name||''),owner_age_group:String(r.owner_age_group||''),
          owner_unit:String(r.owner_unit||''),owner_position:String(r.owner_position||''),
          owner_phone:String(r.owner_phone||''),owner_email:String(r.owner_email||''),
          extra_items:extra,
          status:String(r.status||'pending'),requested_by:String(r.requested_by||''),requested_by_id:String(r.requested_by_id||''),
          requester_role:String(r.requester_role||''),group_confirmation_status:String(r.group_confirmation_status||''),
          group_confirmed_by:String(r.group_confirmed_by||''),group_confirmed_at:String(r.group_confirmed_at||''),
          approved_by:String(r.approved_by||''),approved_at:String(r.approved_at||''),
          notes:String(r.notes||''),created_at:String(r.created_at||'')
        });
      });
      sup.booth_requests=[...map.values()];
      localStorage.setItem(LS.supplies(eid), JSON.stringify(sup));
      this.eventData['supplies']=sup;
      touched=true;
    }
    // ── 泊車證申請 ──
    const hasParkRows=Array.isArray(d.Parking_Requests);
    const parkRows=hasParkRows?d.Parking_Requests:[];
    if(hasParkRows){
      const park=this.getParkingData();
      const deleted=this.getDeletedRecordIds('Parking_Requests');
      const map=new Map();
      parkRows.forEach(r=>{ if(!r.parking_id||deleted.has(String(r.parking_id))) return; const prev=map.get(String(r.parking_id))||{};
        map.set(String(r.parking_id),{...prev, ...r, parking_id:String(r.parking_id), status:String(r.status||'pending')});
      });
      park.applications=[...map.values()];
      localStorage.setItem(LS.parking(eid), JSON.stringify(park));
      touched=true;
    }
    // ── 財務開支申報 ──
    const hasFinanceRows=Array.isArray(d.Finance_Expenses);
    const financeRows=hasFinanceRows?d.Finance_Expenses:[];
    if(hasFinanceRows){
      const fin=this.getFinanceData();
      const deleted=this.getDeletedRecordIds('Finance_Expenses');
      fin.expenses=financeRows.filter(e=>e.id&&!deleted.has(String(e.id))).map(e=>({
        id:String(e.id),event_id:String(e.event_id||eid),voucher:String(e.voucher||''),item_name:String(e.item_name||''),group_name:normalizeGroupName(e.group_name||''),budget:Number(e.budget)||0,actual:Number(e.actual)||0,date:String(e.date||''),description:String(e.description||''),receipt_name:String(e.receipt_name||''),receipt_url:String(e.receipt_url||''),receipt_data:'',status:String(e.status||'pending'),submitted_by:String(e.submitted_by||''),submitted_by_id:String(e.submitted_by_id||''),requester_role:String(e.requester_role||''),group_confirmation_status:String(e.group_confirmation_status||''),group_confirmed_by:String(e.group_confirmed_by||''),group_confirmed_at:String(e.group_confirmed_at||''),approved_by:String(e.approved_by||''),approved_at:String(e.approved_at||''),created_at:String(e.created_at||'')
      }));
      localStorage.setItem(LS.finance(eid),JSON.stringify(fin));
      this.eventData.finance=fin;
      touched=true;
    }
    // ── v11 失物認領（Lost_Found）：行政組紀錄，跨裝置合併（同 id 以 updated_at 較新者為準）──
    if(Array.isArray(d.Lost_Found)){
      const lf=this.getLostFoundData();
      const map=new Map((lf.records||[]).map(r=>[String(r.id),r]));
      let lfChanged=false;
      d.Lost_Found.forEach(r=>{
        if(!r.lost_id) return;
        const id=String(r.lost_id);
        const rec={
          id, type:String(r.type||'found'), item_name:String(r.item_name||''), description:String(r.description||''),
          found_date:String(r.found_date||''), found_time:String(r.found_time||''),
          found_location:String(r.found_location||''), found_by:String(r.found_by||''),
          contact:String(r.contact||''),
          status:String(r.status||'待認領'), claimed_by:String(r.claimed_by||''),
          claimed_contact:String(r.claimed_contact||''), claimed_at:String(r.claimed_at||''),
          closed_by:String(r.closed_by||''),
          notes:String(r.notes||''), recorded_by:String(r.recorded_by||''), recorded_by_id:String(r.recorded_by_id||''),
          created_at:String(r.created_at||''), updated_at:String(r.updated_at||'')
        };
        const prev=map.get(id);
        if(!prev||String(prev.updated_at||'')<rec.updated_at){ map.set(id,prev?{...prev,...rec}:rec); lfChanged=true; }
      });
      if(lfChanged){
        this.saveLostFoundData({records:[...map.values()]});
        this.refreshLostFoundViews();
        touched=true;
      }
    }
    // ── v11 紀念章派發（Souvenir_Stamps）：TICK 紀錄跨裝置合併（staff＝工作人員／guests＝嘉賓）──
    if(Array.isArray(d.Souvenir_Stamps)){
      const st=this.getSouvenirStampData();
      let stChanged=false;
      d.Souvenir_Stamps.forEach(r=>{
        const scope=String(r.scope||'')==='guests'?'guests':'staff';
        const key=String(r.person_key||'');
        if(!key) return;
        const rec={
          name:String(r.name||''), group_name:String(r.group_name||''), job_title:String(r.job_title||''),
          ticked:String(r.ticked||'').toUpperCase()==='Y'||r.ticked===true,
          ticked_at:String(r.ticked_at||''), ticked_by:String(r.ticked_by||''), ticked_by_id:String(r.ticked_by_id||''),
          remark:String(r.remark||''), created_at:String(r.created_at||''), updated_at:String(r.updated_at||'')
        };
        const prev=(st[scope]||{})[key];
        if(!prev||String(prev.updated_at||'')<rec.updated_at){
          st[scope]=st[scope]||{};
          st[scope][key]=prev?{...prev,...rec}:rec;
          stChanged=true;
        }
      });
      if(stChanged){ this.saveSouvenirStampData(st); touched=true; }
    }
    if(!touched) return;
    // 留喺目前頁面重新整理
    if(this.currentModule==='coordinator_group') this.renderCoordinatorGroupModule();
    else if(this.currentModule==='my_monitor') this.renderMyMonitorModule();
    else if(this.currentModule==='supplies' && document.getElementById('supplies-tab-requests')) this.renderSuppliesModule();
    else if(this.currentModule==='booth' && document.getElementById('booth-tab-content')) this.renderBoothModule();
    else if(this.currentModule==='meals' && document.getElementById('meals-tab-menus')) this.renderMealsModule();
    else if(this.currentModule==='finance' && document.getElementById('finance-tab-expense')) this.renderFinanceModule();
    else if(this.currentModule==='parking' && document.getElementById('parking-tab-apply')) this.renderParkingModule();
    else if(!document.getElementById('view-approvals')?.classList.contains('hidden')) this.renderApprovalCenter();
    else if(this.currentModule==='group_management' && this.currentGroupManaged) this.openGroupManagement(this.currentGroupManaged);
  }
,
  canManageMealMenu(){
    // 菜單／最後名單由目前多選的膳食執行組負責；預設協調組。
    const role=this.currentUser?.role||'';
    if(this.canManageApprovalRouting()) return true;
    return this.roleLevel(role)>=30&&this.canExecuteArea('meals');
  }
,
  isMealLocked(menu){
    if(menu.locked) return true;
    if(!menu.deadline) return false;
    const now=new Date();
    const deadline=new Date(menu.deadline);
    return now > deadline;
  }
,
  renderMealsModule(){
    const container=document.getElementById('module-content');
    if(!this.mealsSubTab) this.mealsSubTab='menus';
    const data=this.getMealsData();
    const isManager=this.canManageMealMenu();
    const canManage=isManager||this.isAdmin();
    // v8.6：公眾（未登入）/一般成員只見到「菜單＋我的訂餐」；
    // 訂餐紀錄/統計 與 列印派發 屬管理視角（本組總主任以上／批核組／執行組／路由管理員）
    const myLvl=this.roleLevel(this.currentUser?.role||'');
    const canViewRecords=!!this.currentUser&&(myLvl>=40||this.canApproveArea('meals')||this.canExecuteArea('meals')||this.canManageApprovalRouting());
    if(!canViewRecords&&(this.mealsSubTab==='orders'||this.mealsSubTab==='print')) this.mealsSubTab='menus';
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-3 text-[11px] leading-relaxed text-purple-900">
          <b>🍱 膳食流程（公開訂餐 · 兩級把關防浪費）：</b><br>
          ① 提供菜單（列明截止，可選不吃）→ ② <b>所有人無需登入</b>到此頁揀飯 → ③ 低於總主任提交的訂餐由<b>本組總主任以上</b>確認 → ④ <b>${escapeHtml(this.approvalRouteLabel('meals','approver_groups'))}</b>審批 → ⑤ <b>${escapeHtml(this.approvalRouteLabel('meals','executor_groups'))}</b>按已審批最後名單落單及派飯<br>
          • 未完成本組確認及指定組別審批的訂餐<b>不會計入最後訂購總數</b>；修改後會重新進入流程<br>
          • 各組負責人登入後可一鍵確認本組訂餐、查看名下工作人員訂了什麼；膳食組可於截止後鎖定菜單；物資及車輛也有截止日期；訂餐/物資/車輛審批進度可看「<b>我的監察</b>」卡片<br>
          • <b>膳食動態分工：</b>批核組及執行／最後名單組可在批核權限頁以多選按鈕隨時修改；目前執行組為 <b>${escapeHtml(this.approvalRouteLabel('meals','executor_groups'))}</b>
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchMealsTab('menus')" class="tab-btn ${this.mealsSubTab==='menus'?'active':''}"><i class="fa-solid fa-utensils mr-1"></i> 菜單 (${data.menus.length})</button>
          ${canViewRecords?`<button onclick="app.switchMealsTab('orders')" class="tab-btn ${this.mealsSubTab==='orders'?'active':''}"><i class="fa-solid fa-list-check mr-1"></i> 訂餐紀錄/統計</button>`:''}
          <button onclick="app.switchMealsTab('my')" class="tab-btn ${this.mealsSubTab==='my'?'active':''}"><i class="fa-solid fa-user mr-1"></i> 我的訂餐</button>
          ${canViewRecords?`<button onclick="app.switchMealsTab('print')" class="tab-btn ${this.mealsSubTab==='print'?'active':''}"><i class="fa-solid fa-print mr-1"></i> 列印派發</button>`:''}
                  </div>
        <div id="meals-tab-menus" class="${this.mealsSubTab==='menus'?'':'hidden'}"></div>
        <div id="meals-tab-orders" class="${this.mealsSubTab==='orders'?'':'hidden'}"></div>
        <div id="meals-tab-my" class="${this.mealsSubTab==='my'?'':'hidden'}"></div>
        <div id="meals-tab-print" class="${this.mealsSubTab==='print'?'':'hidden'}"></div>
              </div>
    `;
    this.renderMealsMenus();
    this.renderMealsOrders();
    this.renderMealsMy();
    this.renderMealsPrint();
    // 監察已集中至「我的監察」；meals-tab-monitor 已移除
    // Update module-actions
    const actionsEl=document.getElementById('module-actions');
    if(actionsEl){
      actionsEl.innerHTML=`
        <div class="flex gap-2 flex-wrap">
          ${canManage?`<button onclick="app.openMealMenuForm()" class="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>加入菜單 (${escapeHtml(this.approvalRouteLabel('meals','executor_groups'))})</button>
          <label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">上傳CSV批量<input type="file" accept=".csv,.json" class="hidden" onchange="app.handleMealsFileUpload(this.files[0])"></label>`:''}
          ${this.canExecuteArea('meals')?`<button onclick="app.exportMealsData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出最後名單</button>`:'<span class="text-[11px] bg-purple-50 text-purple-700 px-3 py-2 rounded-full border border-purple-200"><i class="fa-solid fa-lock mr-1"></i>登入後提交；最後名單只供指定執行組</span>'}
        </div>
      `;
    }
  }
,
  switchMealsTab(tab){
    this.mealsSubTab=tab;
    document.querySelectorAll('[id^="meals-tab-"]').forEach(el=>el.classList.add('hidden'));
    document.getElementById('meals-tab-'+tab)?.classList.remove('hidden');
    document.querySelectorAll('[onclick^="app.switchMealsTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'tab-btn active':'tab-btn';
    });
  }
,
  renderMealsMenus(){
    const container=document.getElementById('meals-tab-menus');
    if(!container) return;
    const data=this.getMealsData();
    const canManage=this.canManageMealMenu()||this.isAdmin();
    if(!data.menus.length){
      container.innerHTML=`<div class="text-center py-8"><div class="text-3xl mb-2">🍱</div><p class="text-xs text-slate-500">暫無菜單，由 ${escapeHtml(this.approvalRouteLabel('meals','executor_groups'))} 的總主任以上加入菜單並列明截止日期</p>${canManage?`<button onclick="app.openMealMenuForm()" class="mt-3 bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold">+ 加入菜單</button>`:''}</div>`;
      return;
    }
    container.innerHTML=`<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${data.menus.map(menu=>{
      const isLocked=this.isMealLocked(menu);
      const deadlineText=menu.deadline?new Date(menu.deadline).toLocaleString():'無截止';
      const now=new Date();
      const deadlinePassed=menu.deadline && new Date(menu.deadline) < now;
      return `<div class="border rounded-xl p-4 bg-white space-y-2 ${isLocked?'bg-slate-50 border-slate-300':''}">
        <div class="flex justify-between items-start gap-2">
          <div><div class="flex items-center gap-2 flex-wrap"><b class="text-[14px]">${escapeHtml(menu.meal_type)} - ${escapeHtml(menu.menu_desc||'未命名菜單')}</b><span class="text-[10px] px-2 py-0.5 rounded-full border ${isLocked?'bg-rose-100 text-rose-700 border-rose-200':deadlinePassed?'bg-amber-100 text-amber-700 border-amber-200':'bg-emerald-100 text-emerald-700 border-emerald-200'}">${isLocked?'已鎖定':deadlinePassed?'已截止':'開放中'}</span></div>
          <div class="text-[11px] text-slate-500 mt-1">日期: ${escapeHtml(menu.date)} | 截止: ${escapeHtml(deadlineText)} ${deadlinePassed?'(已過)':''}</div>
          <div class="text-[11px] text-slate-600 mt-1">選項: ${(menu.options||[]).map(o=>`<span class="bg-slate-100 border px-1.5 py-0.5 rounded-full text-[10px] mr-1">${escapeHtml(o)}</span>`).join('')}</div></div>
          <div class="flex flex-col gap-1 flex-shrink-0">
            ${!isLocked?`<button onclick="app.openMealOrderForm('${menu.menu_id}')" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">填寫訂餐（無需登入）</button>`:''}
            ${canManage?`<button onclick="app.openMealMenuForm('${menu.menu_id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️ 編輯</button>`:''}
            ${canManage?`<button onclick="app.toggleMealLock('${menu.menu_id}')" class="bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-xl text-[10px]">${menu.locked?'🔓 解鎖':'🔒 鎖定'}</button>`:''}
            ${this.isAdmin()?`<button onclick="app.deleteMealMenu('${menu.menu_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️ 刪除</button>`:''}
          </div>
        </div>
        <div class="text-[11px]">已訂: ${data.orders.filter(o=>o.menu_id===menu.menu_id&&o.status!=='rejected').length} 人（已審批 ${data.orders.filter(o=>o.menu_id===menu.menu_id&&o.status==='approved').length}） | ${menu.locked?'鎖定後不可更改':`截止前可修改，截止後膳食組可鎖定`}</div>
      </div>`;
    }).join('')}</div>`;
  }
,
  renderMealsOrders(){
    const container=document.getElementById('meals-tab-orders');
    if(!container) return;
    const data=this.getMealsData();
    const lvl=this.roleLevel(this.currentUser?.role);
    if(lvl<40&&!this.canExecuteArea('meals')&&!this.canApproveArea('meals')){ container.innerHTML=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-900">訂餐明細只供本組總主任以上、指定批核組及執行組檢視；你的個人訂餐仍可在「我的訂餐」查看。</div>`; return; }
    const canViewAll=this.canExecuteArea('meals')||this.canApproveArea('meals')||this.canManageApprovalRouting();
    const ownGroup=normalizeGroupName(this.currentUser?.group_name);
    const orders=canViewAll?(data.orders||[]):(data.orders||[]).filter(o=>normalizeGroupName(o.group_name)===ownGroup);
    const active=orders.filter(o=>o.status!=='rejected');
    const statusCount=s=>orders.filter(o=>o.status===s).length;
    // Group by group_name and selection
    const groups={};
    orders.forEach(o=>{
      const g=o.group_name||'未分組';
      if(!groups[g]) groups[g]={};
      const sel=o.selection||'未選';
      if(!groups[g][sel]) groups[g][sel]=[];
      groups[g][sel].push(o);
    });
    // 執行組落單用：只計已完成指定組批核的訂餐；另列待本組確認／待最終批核作參考。
    const approvedStats={}, pendingStats={}, confirmedStats={};
    orders.forEach(o=>{
      const sel=o.selection||'未選';
      if(o.status==='approved') approvedStats[sel]=(approvedStats[sel]||0)+1;
      else if(o.status==='group_ok') confirmedStats[sel]=(confirmedStats[sel]||0)+1;
      else if(o.status==='pending') pendingStats[sel]=(pendingStats[sel]||0)+1;
    });
    const allSels=[...new Set([...Object.keys(approvedStats),...Object.keys(confirmedStats),...Object.keys(pendingStats)])];
    const chip=o=>{ const m=this.mealStatusMeta(o.status); return `<span class="${m.cls} border px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">${escapeHtml(o.user_name)}${o.remarks?` (${escapeHtml(o.remarks)})`:''} · ${m.t}</span>`; };
    const canFinal=this.canFinalApproveMealOrder();
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-emerald-50 border border-emerald-300 rounded-xl p-4">
          <div class="flex justify-between items-center flex-wrap gap-2 mb-2"><h4 class="font-bold text-xs text-emerald-900"><i class="fa-solid fa-cart-shopping mr-1"></i>最後訂購總數（只計「指定批核組已審批」= 執行組照此落單）</h4>${canFinal&&statusCount('group_ok')?`<button onclick="app.approveAllConfirmedMeals()" class="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-check-double mr-1"></i>一鍵審批全部已確認 (${statusCount('group_ok')})</button>`:''}</div>
          <div class="flex flex-wrap gap-2">${allSels.map(sel=>`<span class="bg-white border border-emerald-200 px-3 py-1 rounded-full text-[11px]"><b>${escapeHtml(sel)}</b>: <b class="text-emerald-700">${approvedStats[sel]||0}</b>${confirmedStats[sel]?` <span class="text-sky-600">+${confirmedStats[sel]}待批</span>`:''}${pendingStats[sel]?` <span class="text-amber-600">+${pendingStats[sel]}未核</span>`:''}</span>`).join('') || '<span class="text-xs text-slate-400">暫無訂餐</span>'}</div>
          <div class="mt-2 text-[10px] text-slate-500">流程：提交訂餐 → <span class="text-amber-700 font-bold">待組長確認 (${statusCount('pending')})</span> → <span class="text-sky-700 font-bold">組長已確認 (${statusCount('group_ok')})</span> → <span class="text-emerald-700 font-bold">指定組已審批 (${statusCount('approved')})</span>${statusCount('rejected')?` · <span class="text-rose-600">已拒絕 (${statusCount('rejected')})</span>`:''} ｜ 有效訂餐共 ${active.length} 張</div>
        </div>
        ${Object.keys(groups).sort().map(groupName=>{
          const gOrders=orders.filter(o=>(o.group_name||'未分組')===groupName);
          const gPending=gOrders.filter(o=>o.status==='pending');
          const canConfirmHere=gPending.some(o=>this.canConfirmGroupOrder(o));
          return `
          <div class="bg-white border rounded-xl p-4">
            <div class="flex justify-between items-center flex-wrap gap-2 mb-2">
              <h4 class="font-bold text-[13px]"><i class="fa-solid fa-people-group text-purple-600 mr-2"></i>${escapeHtml(groupName)} <span class="text-[10px] text-slate-400 font-normal">${gOrders.length} 張訂餐 · ${gPending.length?`<span class="text-amber-600 font-bold">${gPending.length} 待組長確認</span>`:'全部已核實'}</span></h4>
              ${canConfirmHere?`<button onclick="app.confirmGroupMealOrders('${escapeHtml(groupName)}')" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-check mr-1"></i>確認本組全部待批 (${gPending.length})</button>`:''}
            </div>
            <div class="space-y-2">${Object.keys(groups[groupName]).map(sel=>`
              <div class="border rounded-xl p-2 bg-slate-50">
                <div class="font-bold text-[11px]">${escapeHtml(sel)} (${groups[groupName][sel].length}人)</div>
                <div class="text-[11px] text-slate-600 mt-1 flex flex-wrap gap-1">${groups[groupName][sel].map(chip).join('')}</div>
              </div>
            `).join('')}</div>
          </div>`;
        }).join('') || '<p class="text-xs text-slate-400 py-4 text-center">暫無分組訂餐紀錄</p>'}
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-xs mb-2">詳細紀錄（派飯核對用：誰人訂了什麼）</h4>
          <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">姓名</th><th class="px-2 py-1 text-left">組別/攤位</th><th class="px-2 py-1 text-left">菜單</th><th class="px-2 py-1 text-left">選擇</th><th class="px-2 py-1 text-left">狀態</th><th class="px-2 py-1 text-left">操作</th></tr></thead><tbody class="divide-y">${orders.map(o=>{
            const menu=data.menus.find(m=>m.menu_id===o.menu_id);
            const st=this.mealStatusMeta(o.status);
            const locked=menu?this.isMealLocked(menu):false;
            const acts=[];
            if((o.status==='pending'||o.status==='rejected')&&this.canConfirmGroupOrder(o)) acts.push(`<button onclick="app.confirmMealOrder('${o.order_id}')" class="bg-sky-600 text-white px-2 py-1 rounded-xl text-[10px] font-bold">✓組長確認</button>`);
            if(o.status!=='approved'&&canFinal&&this.applicationReadyForApproval(o)) acts.push(`<button onclick="app.approveMealOrder('${o.order_id}')" class="bg-emerald-600 text-white px-2 py-1 rounded-xl text-[10px] font-bold">✓指定組別審批</button>`);
            if(o.status!=='rejected'&&(this.canConfirmGroupOrder(o)||canFinal)) acts.push(`<button onclick="app.rejectMealOrder('${o.order_id}')" class="bg-white border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px] font-bold">✗</button>`);
            if(this.canEditMealOrder(o)&&(!locked||this.canManageMealMenu()||this.isAdmin())) acts.push(`<button onclick="app.openMealOrderForm('${o.menu_id}','${o.order_id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteMealOrder('${o.order_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`);
            return `<tr><td class="px-2 py-1 font-medium" data-label="姓名">${escapeHtml(o.user_name)}</td><td class="px-2 py-1" data-label="組別">${escapeHtml(o.group_name)}</td><td class="px-2 py-1" data-label="菜單">${escapeHtml(menu?.meal_type||'')}-${escapeHtml(menu?.menu_desc||o.menu_id)}${o.created_at?`<div class="text-[9px] text-slate-400">${new Date(o.created_at).toLocaleString()}</div>`:''}</td><td class="px-2 py-1 font-bold" data-label="選擇">${escapeHtml(o.selection)}${o.remarks?`<div class="text-[9px] font-normal text-slate-400">${escapeHtml(o.remarks)}</div>`:''}</td><td class="px-2 py-1" data-label="狀態"><span class="${st.cls} border px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">${st.t}</span>${o.confirmed_by?`<div class="text-[9px] text-slate-400 mt-0.5">確認:${escapeHtml(o.confirmed_by)}</div>`:''}${o.approved_by?`<div class="text-[9px] text-slate-400">審批:${escapeHtml(o.approved_by)}</div>`:''}</td><td class="px-2 py-1" data-label="操作"><div class="flex flex-wrap gap-1">${acts.join('')||'<span class="text-[10px] text-slate-300">—</span>'}</div></td></tr>`;
          }).join('') || '<tr><td colspan="6" class="px-2 py-4 text-center text-slate-400">暫無紀錄</td></tr>'}</tbody></table></div>
        </div>
      </div>
    `;
  }
,
  renderMealsMy(){
    const container=document.getElementById('meals-tab-my');
    if(!container) return;
    const data=this.getMealsData();
    // 顯示登入帳號／姓名匹配的訂餐；同時兼容舊版此裝置提交 ID。
    const myOrders=data.orders.filter(o=>this.isMyMealOrder(o));
    if(!myOrders.length){
      container.innerHTML=`<div class="text-center py-8"><div class="text-3xl mb-2">🍱</div><p class="text-xs text-slate-500">暫無你的訂餐紀錄 — 訂餐<b>無需登入</b>，到「菜單」分頁揀飯，填姓名+組別/攤位即可${this.currentUser?'':'；其他裝置提交的訂餐請在該裝置查看（或登入後按姓名匹配）'}</p></div>`;
      return;
    }
    container.innerHTML=`${!this.currentUser?`<div class="bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-[10.5px] text-sky-800 mb-2"><i class="fa-solid fa-circle-info mr-1"></i>以下為<b>此裝置</b>提交的訂餐；登入後可按姓名匹配你所有訂餐。</div>`:''}<div class="space-y-3">${myOrders.map(o=>{
      const menu=data.menus.find(m=>m.menu_id===o.menu_id);
      const isLocked=menu?this.isMealLocked(menu):false;
      const st=this.mealStatusMeta(o.status);
      return `<div class="border rounded-xl p-3 bg-white"><div class="flex justify-between gap-2"><div><b class="text-[13px]">${escapeHtml(menu?.meal_type||'膳食')} - ${escapeHtml(menu?.menu_desc||'')}</b><div class="text-[11px] text-slate-500 mt-1">選擇: <b>${escapeHtml(o.selection)}</b> | 組別: ${escapeHtml(o.group_name)} | 日期: ${escapeHtml(menu?.date||'')}</div><div class="text-[11px] text-slate-400 mt-1">${o.remarks?`備註: ${escapeHtml(o.remarks)}<br>`:''}${o.created_at?`訂餐時間: ${new Date(o.created_at).toLocaleString()}<br>`:''}${isLocked?'🔒 已鎖定，不可更改':'可修改 (截止前，修改後需重新確認)'}</div></div><div class="flex flex-col gap-1 items-end flex-shrink-0"><span class="${st.cls} border px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">${st.t}</span>${!isLocked?`<button onclick="app.openMealOrderForm('${o.menu_id}','${o.order_id}')" class="bg-white border px-3 py-1 rounded-xl text-[11px]">✏️ 修改</button><button onclick="app.deleteMealOrder('${o.order_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1 rounded-xl text-[11px]">🗑️ 刪除</button>`:''}</div></div></div>`;
    }).join('')}</div>`;
  }
,
  renderMealsPrint(){
    const container=document.getElementById('meals-tab-print');
    if(!container) return;
    if(!this.canExecuteArea('meals')){ container.innerHTML=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-900">膳食派發／最後名單只供 ${escapeHtml(this.approvalRouteLabel('meals','executor_groups'))} 檢視。</div>`; return; }
    const data=this.getMealsData();
    container.innerHTML=`
      <div class="space-y-4">
        <div class="flex gap-2"><button onclick="app.printMeals()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印派發清單</button><button onclick="app.exportMealsData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button></div>
        <div id="meals-print-area" class="bg-white border rounded-xl p-6 space-y-4">
          <div class="text-center border-b-2 border-slate-900 pb-3"><h2 class="text-lg font-extrabold">膳食派發清單 (供派發用)</h2><p class="text-[11px] text-slate-500 mt-1">活動: ${escapeHtml(this.currentEvent?.event_name||'')} | 列印日期: ${todayISO()} | 列印人: ${escapeHtml(this.currentUser?.name||'')}</p></div>
          ${data.menus.map(menu=>{
            const orders=data.orders.filter(o=>o.menu_id===menu.menu_id);
            const stats={};
            orders.forEach(o=>{ stats[o.selection]=(stats[o.selection]||0)+1; });
            return `<div class="border rounded-xl p-4"><h4 class="font-bold text-sm">${escapeHtml(menu.date)} ${escapeHtml(menu.meal_type)} - ${escapeHtml(menu.menu_desc)} (截止: ${menu.deadline?new Date(menu.deadline).toLocaleString():'無'} ${menu.locked?'🔒已鎖定':''})</h4>
              <div class="text-[11px] mt-2">統計: ${Object.keys(stats).map(k=>`${escapeHtml(k)}: ${stats[k]}人`).join(' | ') || '無訂餐'}</div>
              <div class="table-responsive mt-3"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">組別</th><th class="border px-2 py-1">姓名</th><th class="border px-2 py-1">選擇</th><th class="border px-2 py-1">狀態</th><th class="border px-2 py-1">備註</th><th class="border px-2 py-1">簽收</th></tr></thead><tbody>${orders.filter(o=>o.status==='approved').map(o=>{const st=this.mealStatusMeta(o.status); return `<tr><td class="border px-2 py-1">${escapeHtml(o.group_name)}</td><td class="border px-2 py-1">${escapeHtml(o.user_name)}</td><td class="border px-2 py-1 font-bold">${escapeHtml(o.selection)}</td><td class="border px-2 py-1">${st.t}</td><td class="border px-2 py-1">${escapeHtml(o.remarks||'')}</td><td class="border px-2 py-1"></td></tr>`;}).join('') || '<tr><td colspan="6" class="border px-2 py-4 text-center text-slate-400">暫無訂餐</td></tr>'}</tbody></table></div>
            </div>`;
          }).join('') || '<p class="text-xs text-slate-400">暫無菜單</p>'}
        </div>
      </div>
    `;
  }
,
  renderMealsMonitor(){
    const container=document.getElementById('meals-tab-monitor');
    if(!container) return;
    if(!this.currentUser){ container.innerHTML=`<div class="text-center py-8"><div class="text-3xl mb-2">🔒</div><p class="text-xs text-slate-500">監察卡片顯示你的個人申請 (訂餐/物資/車輛)，登入後才顯示</p><p class="text-[11px] text-slate-400 mt-1"><i class="fa-solid fa-arrow-up mr-1"></i>請按右上角「登入」</p></div>`; return; }
    // Combined monitoring for meal, supplies, vehicle
    const mealsData=this.getMealsData();
    const suppliesData=this.getSuppliesData();
    const myName=this.currentUser?.name||'';
    const myId=this.currentUser?.user_id||'';
    const myMealOrders=mealsData.orders.filter(o=> o.user_id===myId || o.user_name===myName);
    const mySupplies=suppliesData.requests.filter(r=> r.requested_by_id===myId || r.requested_by===myName);
    const myVehicles=(suppliesData.vehicle_passes||[]).filter(v=> v.requested_by_id===myId || v.requested_by===myName);
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed flex flex-wrap items-center justify-between gap-2">
          <span><b>👁️ 已升級：</b>所有申請批核（自己＋下級，按組別分開）已集中在「我的監察」卡片。</span>
          <button onclick="app.openModule('my_monitor')" class="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-eye mr-1"></i>前往我的監察</button>
        </div>
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed">
          <b>👁️ 監察卡片 (專門監察)：</b>各工作人員可查閱自己訂了什麼餐、借了什麼物資是否已獲批、車輛登記是否已獲批<br>
          • 膳食：可查自己訂餐，截止後鎖定不可改<br>
          • 物資：可查借用申請是否已獲批 (pending/approved/modified/rejected)<br>
          • 車輛：可查車輛通行證是否已獲批<br>
          • 物資及車輛也列明截止日期 (date_needed/entry_date 即為需用日期，deadline 為申請截止)
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white border rounded-xl p-4">
            <h4 class="font-bold text-xs mb-2"><i class="fa-solid fa-utensils text-purple-600 mr-2"></i>我的訂餐 (${myMealOrders.length})</h4>
            <div class="space-y-2">${myMealOrders.length?myMealOrders.map(o=>{
              const menu=mealsData.menus.find(m=>m.menu_id===o.menu_id);
              const isLocked=menu?this.isMealLocked(menu):false;
              return `<div class="border rounded-xl p-2 bg-slate-50"><div class="font-bold text-[11px]">${escapeHtml(menu?.meal_type||'')} - ${escapeHtml(menu?.menu_desc||'')}</div><div class="text-[11px]">選擇: <b>${escapeHtml(o.selection)}</b> | ${isLocked?'🔒已鎖定':'開放中'}</div><div class="text-[10px] text-slate-400">${o.created_at?new Date(o.created_at).toLocaleString():''}</div></div>`;
            }).join(''):'<p class="text-xs text-slate-400">暫無訂餐</p>'}</div>
          </div>
          <div class="bg-white border rounded-xl p-4">
            <h4 class="font-bold text-xs mb-2"><i class="fa-solid fa-boxes-stacked text-blue-600 mr-2"></i>我的物資 (${mySupplies.length})</h4>
            <div class="space-y-2">${mySupplies.length?mySupplies.map(r=>{
              const statusColor={pending:'bg-amber-100 text-amber-700',approved:'bg-emerald-100 text-emerald-700',rejected:'bg-rose-100 text-rose-700',modified:'bg-sky-100 text-sky-700'}[r.status]||'bg-slate-100';
              return `<div class="border rounded-xl p-2 bg-slate-50"><div class="flex justify-between"><b class="text-[11px]">${escapeHtml(r.item_name)} x ${r.qty_requested}</b><span class="text-[10px] px-1.5 py-0.5 rounded-full ${statusColor}">${r.status}</span></div><div class="text-[11px] text-slate-500 mt-1">批核數量: ${r.qty_approved!==null?r.qty_approved:r.qty_requested} | 需用: ${escapeHtml(r.date_needed||'-')} | 截止: ${r.deadline?new Date(r.deadline).toLocaleString():'無'}</div><div class="text-[10px] text-slate-400">${r.approved_by?`批核: ${escapeHtml(r.approved_by)}`:''}</div></div>`;
            }).join(''):'<p class="text-xs text-slate-400">暫無物資申請</p>'}</div>
          </div>
          <div class="bg-white border rounded-xl p-4">
            <h4 class="font-bold text-xs mb-2"><i class="fa-solid fa-car text-emerald-600 mr-2"></i>我的車輛通行證 (${myVehicles.length})</h4>
            <div class="space-y-2">${myVehicles.length?myVehicles.map(v=>{
              const statusColor={pending:'bg-amber-100 text-amber-700',approved:'bg-emerald-100 text-emerald-700',rejected:'bg-rose-100 text-rose-700'}[v.status]||'bg-slate-100';
              return `<div class="border rounded-xl p-2 bg-slate-50"><div class="flex justify-between"><b class="text-[11px]">${escapeHtml(v.plate)} - ${escapeHtml(v.driver_name)}</b><span class="text-[10px] px-1.5 py-0.5 rounded-full ${statusColor}">${v.status}</span></div><div class="text-[11px] text-slate-500 mt-1">進出: ${escapeHtml(v.entry_date)}→${escapeHtml(v.exit_date)} | 停泊: ${escapeHtml(v.parking_location)}</div><div class="text-[10px] text-slate-400">${v.approved_by?`批核: ${escapeHtml(v.approved_by)}`:''} | 截止: ${v.deadline?new Date(v.deadline).toLocaleString():'無'}</div></div>`;
            }).join(''):'<p class="text-xs text-slate-400">暫無車輛申請</p>'}</div>
          </div>
        </div>
      </div>
    `;
  }
,
  openMealMenuForm(editId=null){
    if(!this.canManageMealMenu() && !this.isAdmin()){ showToast(`僅 ${this.approvalRouteLabel('meals','executor_groups')} 的總主任以上可加入菜單`,'error'); return; }
    const data=this.getMealsData();
    const existing=editId?data.menus.find(m=>m.menu_id===editId):null;
    const title=existing?'編輯菜單':`加入菜單 (${this.approvalRouteLabel('meals','executor_groups')}，列明截止日期)`;
    let html=`
      <input type="hidden" id="meal-menu-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="meal-menu-id" value="${existing?.menu_id||''}">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">日期 *</label><input type="date" id="meal-menu-date" value="${existing?.date||todayISO()}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">餐別 *</label><select id="meal-menu-type" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1"><option value="早餐" ${existing?.meal_type==='早餐'?'selected':''}>早餐</option><option value="午餐" ${!existing||existing?.meal_type==='午餐'?'selected':''}>午餐</option><option value="晚餐" ${existing?.meal_type==='晚餐'?'selected':''}>晚餐</option><option value="宵夜" ${existing?.meal_type==='宵夜'?'selected':''}>宵夜</option></select></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">菜單描述 *</label><input id="meal-menu-desc" value="${escapeHtml(existing?.menu_desc||'')}" required placeholder="例如 精美便當連飲品 A餐: 叉燒飯 B餐: 雞扒飯" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">選項 (逗號分隔，可含 不吃)</label><input id="meal-menu-options" value="${escapeHtml((existing?.options||['A餐','B餐','C餐','不吃']).join(','))}" placeholder="A餐,B餐,C餐,不吃" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">截止日期 (列明) *</label><input type="datetime-local" id="meal-menu-deadline" value="${existing?.deadline||''}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      </div>
      <div class="text-[10px] text-slate-400 mt-1">菜單開放給<b>所有組別</b>填寫訂餐；舊版「組別」欄不影響任何篩選／統計，屬無效欄位，已刪</div>
      <div class="text-[10px] text-slate-500 mt-2">截止日期後膳食組可鎖定，鎖定後不可更改，各人可查自己訂了什麼</div>
    `;
    document.getElementById('record-modal-title').textContent=title;
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitMealMenuForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitMealMenuForm(){
    if(!this.canManageMealMenu() && !this.isAdmin()){ showToast(`僅 ${this.approvalRouteLabel('meals','executor_groups')} 的總主任以上可管理菜單`,'error'); return; }
    const mode=document.getElementById('meal-menu-mode').value;
    const id=document.getElementById('meal-menu-id').value;
    const date=document.getElementById('meal-menu-date').value;
    const meal_type=document.getElementById('meal-menu-type').value;
    const menu_desc=document.getElementById('meal-menu-desc').value.trim();
    const optionsStr=document.getElementById('meal-menu-options').value.trim();
    const deadline=document.getElementById('meal-menu-deadline').value;
    const group_name=''; // v8.6：菜單不再設「組別」欄（舊欄不影響任何篩選/統計，屬無效欄位）
    if(!date||!meal_type||!menu_desc||!deadline){ showToast('請填寫日期、餐別、描述、截止日期','error'); return; }
    const options=optionsStr?optionsStr.split(',').map(o=>o.trim()).filter(o=>o):['A餐','B餐','不吃'];
    const data=this.getMealsData();
    if(mode==='edit'){
      const idx=data.menus.findIndex(m=>m.menu_id===id);
      if(idx>=0) data.menus[idx]={...data.menus[idx], date, meal_type, menu_desc, options, deadline, group_name};
    }else{
      data.menus.push({menu_id:'menu_'+Date.now(), date, meal_type, menu_desc, options, price:0, deadline, status:'open', locked:false, group_name, created_by:this.currentUser?.name||'', created_at:new Date().toISOString()});
    }
    this.saveMealsData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新菜單':'已加入菜單 (已列明截止日期，開放填寫)','success');
    this.refreshMealsViews();
  }
,
  deleteMealMenu(menuId){
    if(!this.canManageMealMenu() && !this.isAdmin()){ showToast(`僅管理層或 ${this.approvalRouteLabel('meals','executor_groups')} 的總主任以上可刪除菜單`,'error'); return; }
    if(!confirm('確定刪除此菜單？相關訂餐紀錄也會一併刪除')) return;
    const data=this.getMealsData();
    data.menus=data.menus.filter(m=>m.menu_id!==menuId);
    data.orders=data.orders.filter(o=>o.menu_id!==menuId);
    this.saveMealsData(data);
    this.deleteGasRecord('Meals',menuId);
    showToast('已刪除菜單','warning');
    this.refreshMealsViews();
  }
,
  toggleMealLock(menuId){
    if(!this.canManageMealMenu()){ showToast(`只有膳食執行組（${this.approvalRouteLabel('meals','executor_groups')}）主任以上可鎖定`,'error'); return; }
    const data=this.getMealsData();
    const idx=data.menus.findIndex(m=>m.menu_id===menuId);
    if(idx<0) return;
    data.menus[idx].locked=!data.menus[idx].locked;
    this.saveMealsData(data);
    showToast(data.menus[idx].locked?'已鎖定訂購紀錄，不給其他人更改':'已解鎖，可繼續填寫','success');
    this.refreshMealsViews();
  }
,
  openMealOrderForm(menuId, orderId=null){
    // 登入訂餐：帳號自動記錄身份；低於總主任先由本組確認，再交設定的組別最終批核。
    const data=this.getMealsData();
    const menu=data.menus.find(m=>m.menu_id===menuId);
    if(!menu){ showToast('找不到菜單','error'); return; }
    if(this.isMealLocked(menu)){ showToast('此菜單已鎖定或已截止，不可更改','error'); return; }
    const existing=orderId?data.orders.find(o=>o.order_id===orderId):null;
    if(existing && !this.canEditMealOrder(existing)){ showToast('只可以修改自己的訂餐（管理人員除外）','error'); return; }
    const myName=this.currentUser?.name||'';
    const myGroup=this.currentUser?.group_name||'';
    // Check if group leader can fill for group? For now allow anyone
    let html=`
      <input type="hidden" id="meal-order-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="meal-order-id" value="${existing?.order_id||''}">
      <input type="hidden" id="meal-order-menu-id" value="${menuId}">
      <div class="bg-purple-50 border border-purple-200 rounded-xl p-3 text-[11px] mb-3"><b>${escapeHtml(menu.date)} ${escapeHtml(menu.meal_type)} - ${escapeHtml(menu.menu_desc)}</b><br>截止: ${menu.deadline?new Date(menu.deadline).toLocaleString():'無'} | 選項: ${(menu.options||[]).join(', ')}</div>
      <div class="bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-[10.5px] text-sky-800 mb-3 leading-relaxed"><i class="fa-solid fa-shield-halved mr-1"></i><b>登入訂餐：</b>低於總主任提交 → 本組總主任以上確認 → ${escapeHtml(this.approvalRouteLabel('meals','approver_groups'))} 審批 → ${escapeHtml(this.approvalRouteLabel('meals','executor_groups'))} 執行及持有最後名單。請如實填寫姓名及組別／攤位。</div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">姓名 *</label><input id="meal-order-name" value="${escapeHtml(existing?.user_name||myName)}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">組別 / 攤位 *</label><input id="meal-order-group" value="${escapeHtml(existing?.group_name||myGroup)}" placeholder="例：主題節目組 或 攤位A12" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">選擇 *</label><select id="meal-order-selection" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1">${(menu.options||[]).map(opt=>`<option value="${escapeHtml(opt)}" ${existing?.selection===opt?'selected':''}>${escapeHtml(opt)}</option>`).join('')}</select></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">備註 (可選不吃原因等)</label><input id="meal-order-remarks" value="${escapeHtml(existing?.remarks||'')}" placeholder="例如 不吃辣、由組別主管代填" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      </div>
      <div class="text-[10px] text-slate-500 mt-2">可選不吃，亦可由所屬組別主管代填寫</div>
    `;
    document.getElementById('record-modal-title').textContent=existing?'修改訂餐':'填寫訂餐 (可選不吃)';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitMealOrderForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitMealOrderForm(){
    const mode=document.getElementById('meal-order-mode').value;
    const orderId=document.getElementById('meal-order-id').value;
    const menuId=document.getElementById('meal-order-menu-id').value;
    const user_name=document.getElementById('meal-order-name').value.trim();
    let group_name=document.getElementById('meal-order-group').value.trim();
    if(this.currentUser&&this.roleLevel(this.currentUser.role)<40) group_name=normalizeGroupName(this.currentUser.group_name);
    const selection=document.getElementById('meal-order-selection').value;
    const remarks=document.getElementById('meal-order-remarks').value.trim();
    if(!user_name||!group_name||!selection){ showToast('請填寫姓名、組別/攤位、選擇','error'); return; }
    const data=this.getMealsData();
    const menu=data.menus.find(m=>m.menu_id===menuId);
    if(menu && this.isMealLocked(menu)){ showToast('已鎖定或已截止，不可更改','error'); return; }
    let savedOrder=null;
    if(mode==='edit'){
      const idx=data.orders.findIndex(o=>o.order_id===orderId);
      if(idx>=0){
        if(!this.canEditMealOrder(data.orders[idx])){ showToast('只可以修改自己的訂餐','error'); return; }
        const applicantRole=this.getApplicationApplicantRole(data.orders[idx]);
        const confirmation=this.applicationConfirmationMeta({role:applicantRole});
        // 修改後按原申請人職級重新走流程；總主任以上提交可跳過本組確認。
        data.orders[idx]={...data.orders[idx],...confirmation,user_name,group_name,selection,remarks,status:confirmation.group_confirmation_status==='not_required'?'group_ok':'pending',confirmed_by:'',approved_by:'',updated_at:new Date().toISOString()};
        savedOrder=data.orders[idx];
      }
    }else{
      const confirmation=this.applicationConfirmationMeta(this.currentUser);
      savedOrder={order_id:'order_'+Date.now(), menu_id:menuId, user_id:this.currentUser?.user_id||'', user_name, group_name, selection, quantity:1, remarks,...confirmation,status:confirmation.group_confirmation_status==='not_required'?'group_ok':'pending',confirmed_by:'',approved_by:'',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      data.orders.push(savedOrder);
      this.addMyMealOrderId(savedOrder.order_id);
    }
    this.saveMealsData(data);
    if(savedOrder) this.syncMealOrderToGas(savedOrder);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已修改訂餐並重新進入批核流程':(this.applicationNeedsGroupConfirmation(savedOrder)?'已提交訂餐：待本組總主任確認':'已提交訂餐：已交指定批核組'),'success');
    this.refreshMealsViews();
  }
,
  deleteMealOrder(orderId){
    const data=this.getMealsData();
    const target=data.orders.find(o=>o.order_id===orderId);
    if(target && !this.canEditMealOrder(target)){ showToast('只可以刪除自己的訂餐（管理人員除外）','error'); return; }
    if(!confirm('確定刪除此訂餐？')) return;
    data.orders=data.orders.filter(o=>o.order_id!==orderId);
    this.saveMealsData(data);
    if(target) this.deleteMealOrderGas(target);
    this.removeMyMealOrderId(orderId);
    showToast('已刪除訂餐','warning');
    this.refreshMealsViews();
  }
,
  printMeals(){
    if(!this.canExecuteArea('meals')){ showToast(`膳食最後名單只供 ${this.approvalRouteLabel('meals','executor_groups')} 列印`,'error'); return; }
    const area=document.getElementById('meals-print-area');
    if(!area){ showToast('找不到列印區域','error'); return; }
    const win=window.open('','_blank');
    win.document.write(`<html><head><title>膳食派發清單</title><link rel="stylesheet" href="${location.origin}/assets/tailwind.css"><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:6px;font-size:11px} @media print{button{display:none}}</style></head><body>${area.innerHTML}<div class="mt-6 text-center"><button onclick="window.print()" class="bg-slate-900 text-white px-6 py-2 rounded-xl">列印</button></div></body></html>`);
    win.document.close();
  }
,
  exportMealsData(){
    if(!this.canExecuteArea('meals')){ showToast(`膳食最後名單只供 ${this.approvalRouteLabel('meals','executor_groups')} 匯出`,'error'); return; }
    const source=this.getMealsData();
    const data={menus:source.menus||[],orders:(source.orders||[]).filter(o=>o.status==='approved')};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`meals_${todayISO()}.json`; a.click(); showToast('已匯出膳食 JSON','success');
  }
,
  handleMealsFileUpload(file){
    if(!file) return;
    if(!this.canManageMealMenu() && !this.isAdmin()){ showToast(`只有膳食執行組（${this.approvalRouteLabel('meals','executor_groups')}）主任以上或管理員可上傳`,'error'); return; }
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const text=e.target.result;
        let parsed=[];
        if(file.name.endsWith('.json')){
          const json=JSON.parse(text);
          parsed=json.menus||json.orders||[];
        }else{
          const rows=parseCSV(text);
          // Assume orders
          parsed=rows.map(r=>({order_id:'order_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),menu_id:r.menu_id||'',user_name:r.user_name||r.name||'',group_name:r.group_name||r.group||'',selection:r.selection||r.選項||'',remarks:r.remarks||'',created_at:new Date().toISOString()}));
        }
        if(!parsed.length){ showToast('無有效資料','error'); return; }
        const data=this.getMealsData();
        // Distinguish menus vs orders by presence of meal_type
        if(parsed[0].meal_type || parsed[0].menu_desc){
          data.menus=[...data.menus,...parsed];
        }else{
          data.orders=[...data.orders,...parsed];
        }
        this.saveMealsData(data);
        showToast(`已批量匯入 ${parsed.length} 筆膳食資料`,'success');
        this.refreshMealsViews();
      }catch(err){ showToast('解析失敗:'+err.message,'error'); }
    };
    reader.readAsText(file);
  }
,
});
