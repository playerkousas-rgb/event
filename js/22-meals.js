/* 22-meals.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== Meals Enhanced Module v6.7 ===================== */
  // 訂餐狀態正規化：舊資料（無 status）視作已批核；新訂餐按「本組確認 → 指定組批核」流程。
  normalizeMealsOrders(data){
    if(!data || typeof data!=='object') return {menus:[],orders:[]};
    if(!Array.isArray(data.menus)) data.menus=[];
    if(!Array.isArray(data.orders)) data.orders=[];
    const deleted=this.getDeletedRecordIds('Meal_Orders');
    data.orders=data.orders.filter(o=>!deleted.has(String(o.order_id)));
    const deletedMenus=this.getDeletedRecordIds('Meals');
    if(Array.isArray(data.menus)) data.menus=data.menus.filter(m=>!deletedMenus.has(String(m.menu_id)));
    data.orders.forEach(o=>{ o.group_name=normalizeGroupName(o.group_name); if(!o.status) o.status='approved'; if(o.confirmed_by===undefined) o.confirmed_by=''; if(o.approved_by===undefined) o.approved_by=''; if(o.requester_role===undefined) o.requester_role=''; if(o.group_confirmation_status===undefined) o.group_confirmation_status=o.status==='group_ok'?'confirmed':''; if(o.group_confirmed_by===undefined) o.group_confirmed_by=o.confirmed_by||''; if(o.group_confirmed_at===undefined) o.group_confirmed_at=''; });
    return data;
  }
,
  getMealsData(){
    const key=LS.meals(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local) return this.normalizeMealsOrders(local);
    const raw=this.eventData['meals']||[];
    // Normalize old meals array into menus + orders structure
    // Old structure: meal_id, date, meal_type, menu_desc, headcount, group_name, status
    // New structure: {menus: [], orders: []}
    if(Array.isArray(raw) && raw.length && !raw.menus){
      // Convert old to new
      const menus=raw.map((m,i)=>({
        menu_id:m.meal_id||'menu_'+i,
        date:m.date||todayISO(),
        meal_type:m.meal_type||'午餐',
        menu_desc:m.menu_desc||'精美便當',
        options:m.options||['A餐','B餐','C餐','不吃'],
        price:m.price||0,
        deadline:m.deadline||'',
        status:m.status||'open',
        locked:m.locked||false,
        group_name:m.group_name||'',
        created_by:m.requested_by||'',
        created_at:m.created_at||''
      }));
      return {menus, orders:[]};
    }
    return {
      menus: (raw.menus||[]).map((m,i)=>({
        menu_id:m.menu_id||'menu_'+i,
        date:m.date||todayISO(),
        meal_type:m.meal_type||'午餐',
        menu_desc:m.menu_desc||'',
        options:m.options||['A餐','B餐','C餐','不吃'],
        price:m.price||0,
        deadline:m.deadline||'',
        status:m.status||'open',
        locked:m.locked||false,
        group_name:m.group_name||'',
        created_by:m.created_by||'',
        created_at:m.created_at||''
      })),
      orders: (raw.orders||[]).map((o,i)=>({
        order_id:o.order_id||'order_'+i,
        menu_id:o.menu_id||'',
        user_id:o.user_id||'',
        user_name:o.user_name||o.name||'',
        group_name:normalizeGroupName(o.group_name),
        selection:o.selection||'',
        quantity:o.quantity||1,
        remarks:o.remarks||'',
        status:o.status||'approved',
        confirmed_by:o.confirmed_by||'',
        approved_by:o.approved_by||'',
        requester_role:o.requester_role||'',
        group_confirmation_status:o.group_confirmation_status||(o.status==='group_ok'?'confirmed':''),
        group_confirmed_by:o.group_confirmed_by||o.confirmed_by||'',
        group_confirmed_at:o.group_confirmed_at||'',
        created_at:o.created_at||'',
        updated_at:o.updated_at||''
      })).filter(o=>!this.getDeletedRecordIds('Meal_Orders').has(String(o.order_id)))
    };
  }
,
  saveMealsData(data,skipGasSync=false){
    const key=LS.meals(this.currentEvent?.event_id||'isd_2026');
    localStorage.setItem(key, JSON.stringify(data));
    this.eventData['meals']=data;
    // GAS sync（v8.5 修復：菜單以完整欄位寫入後端 Meals 表——之前漏了 options/price/deadline/locked，
    // 令其他裝置／登出後讀不到菜單；正式活動由 getEventData 回傳 Meals 合併顯示）
    if(!skipGasSync && !this.mockMode && this.gasUrl){
      (data.menus||[]).forEach(m=>{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Meals',record:{meal_id:m.menu_id,event_id:this.currentEvent?.event_id||'isd_2026',date:m.date,meal_type:m.meal_type,menu_desc:m.menu_desc,options:(m.options||[]).join(','),price:m.price||0,deadline:m.deadline||'',locked:!!m.locked,group_name:m.group_name||'',status:m.status||'open',created_by:m.created_by||'',requested_by:m.created_by||''}})}).catch(()=>{});
      });
    }
  }
,
  // ═══ 訂餐流程：登入提交 → 低於總主任先由本組總主任以上確認 → 設定的組別最終批核 → 設定的執行組按已批核名單落單及派飯 ═══
  mealStatusMeta(s){ return {pending:{t:'待本組確認',cls:'bg-amber-100 text-amber-700 border-amber-300'},group_ok:{t:'本組已確認',cls:'bg-sky-100 text-sky-700 border-sky-300'},approved:{t:'指定組已審批',cls:'bg-emerald-100 text-emerald-700 border-emerald-300'},rejected:{t:'已拒絕',cls:'bg-rose-100 text-rose-700 border-rose-300'}}[s||'pending']; }
,
  getMyMealOrderIds(){ try{ return JSON.parse(localStorage.getItem(LS.myMealOrders(this.currentEvent?.event_id||'isd_2026'))||'[]'); }catch(e){ return []; } }
,
  addMyMealOrderId(id){ const k=LS.myMealOrders(this.currentEvent?.event_id||'isd_2026'); const l=this.getMyMealOrderIds(); if(!l.includes(id)){ l.push(id); localStorage.setItem(k,JSON.stringify(l)); } }
,
  removeMyMealOrderId(id){ const k=LS.myMealOrders(this.currentEvent?.event_id||'isd_2026'); localStorage.setItem(k,JSON.stringify(this.getMyMealOrderIds().filter(x=>x!==id))); }
,
  // 「我的訂餐」：登入者按帳號／姓名匹配；舊版匿名紀錄仍可按本裝置 ID 顯示。
  isMyMealOrder(o){ if(!o) return false; if(this.currentUser && o.user_id && o.user_id===this.currentUser.user_id) return true; if(this.currentUser && o.user_name && o.user_name===this.currentUser.name) return true; return this.getMyMealOrderIds().includes(o.order_id); }
,
  canEditMealOrder(o){ if(!o) return false; if(this.canManageMealMenu()||this.isAdmin()) return true; return this.isMyMealOrder(o); }
,
  // 組長確認：總主任/副主席以上 且與訂單組別相符（行政/管理層可確認任何組）
  canConfirmGroupOrder(o){ return this.canConfirmApplication(o); }
,
  // 膳食最終審批跟隨可多選路由；預設行政組，管理層可代批。
  canFinalApproveMealOrder(){ return this.canApproveArea('meals'); }
,
  // 逐張訂單 best-effort 寫出後端 Meal_Orders 表（示範沙盒永不寫出；正式活動未重跑 initializeSheets 建立工作表前會靜默略過，資料仍存本地）
  syncMealOrderToGas(o){
    if(this.isDemoEvent()||!this.gasUrl||!o) return;
    fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Meal_Orders',record:{order_id:o.order_id,event_id:this.currentEvent?.event_id||'isd_2026',menu_id:o.menu_id,user_id:o.user_id||'',user_name:o.user_name,group_name:o.group_name,selection:o.selection,quantity:o.quantity||1,remarks:o.remarks||'',status:o.status||'pending',confirmed_by:o.confirmed_by||'',approved_by:o.approved_by||'',requester_role:o.requester_role||'',group_confirmation_status:o.group_confirmation_status||'',group_confirmed_by:o.group_confirmed_by||'',group_confirmed_at:o.group_confirmed_at||'',created_at:o.created_at||'',updated_at:o.updated_at||''}})}).catch(()=>{});
  }
,
  deleteMealOrderGas(o){ if(!o) return; return this.deleteGasRecord('Meal_Orders',o.order_id); }
,
  confirmMealOrder(orderId){
    const data=this.getMealsData(); const o=data.orders.find(x=>x.order_id===orderId);
    if(!o) return; if(o.status!=='pending'&&o.status!=='rejected'){ showToast('此訂單無需確認','warning'); return; }
    if(!this.canConfirmGroupOrder(o)){ showToast('只可由該組總主任/副主席（或管理層）確認','error'); return; }
    o.status='group_ok'; o.confirmed_by=this.currentUser.name; o.group_confirmation_status='confirmed'; o.group_confirmed_by=this.currentUser.name; o.group_confirmed_at=new Date().toISOString(); o.updated_at=new Date().toISOString();
    this.saveMealsData(data); this.syncMealOrderToGas(o); showToast(`已確認 ${o.user_name} 的訂餐，待 ${this.approvalRouteLabel('meals','approver_groups')} 審批`,'success'); this.refreshMealsViews();
  }
,
  approveMealOrder(orderId){
    if(!this.canFinalApproveMealOrder()){ showToast('你不屬於目前指定的膳食批核組別','error'); return; }
    const data=this.getMealsData(); const o=data.orders.find(x=>x.order_id===orderId);
    if(!o) return; if(!this.applicationReadyForApproval(o)){ showToast('須先由申請人所屬組別總主任以上確認','warning'); return; } if(o.status==='approved'){ showToast('已審批過','warning'); return; }
    const wasPending=o.status==='pending';
    o.status='approved'; o.approved_by=this.currentUser.name; if(wasPending&&!o.confirmed_by) o.confirmed_by='(行政直接審批)'; o.updated_at=new Date().toISOString();
    this.saveMealsData(data); this.syncMealOrderToGas(o); showToast(`已審批 ${o.user_name} 的訂餐`,'success'); this.refreshMealsViews();
  }
,
  rejectMealOrder(orderId){
    const data=this.getMealsData(); const o=data.orders.find(x=>x.order_id===orderId);
    if(!o) return;
    if(!this.canConfirmGroupOrder(o) && !this.canFinalApproveMealOrder()){ showToast('無權拒絕此訂餐','error'); return; }
    if(!confirm(`確定拒絕 ${o.user_name} 的訂餐？（會標記為已拒絕，不計入訂購）`)) return;
    o.status='rejected'; o.updated_at=new Date().toISOString();
    this.saveMealsData(data); this.syncMealOrderToGas(o); showToast('已拒絕該訂餐','warning'); this.refreshMealsViews();
  }
,
  // 組長一鍵確認本組全部待批訂餐
  confirmGroupMealOrders(groupName){
    const data=this.getMealsData();
    const targets=data.orders.filter(o=>o.status==='pending'&&this.canConfirmGroupOrder(o)&&(groupName==='*'||o.group_name===groupName));
    if(!targets.length){ showToast('本組無待確認訂餐','warning'); return; }
    targets.forEach(o=>{ o.status='group_ok'; o.confirmed_by=this.currentUser.name; o.group_confirmation_status='confirmed'; o.group_confirmed_by=this.currentUser.name; o.group_confirmed_at=new Date().toISOString(); o.updated_at=new Date().toISOString(); this.syncMealOrderToGas(o); });
    this.saveMealsData(data); showToast(`已確認 ${targets.length} 張訂餐，待 ${this.approvalRouteLabel('meals','approver_groups')} 審批`,'success'); this.refreshMealsViews();
  }
,
  // 指定膳食批核組一鍵審批全部已完成本組確認的訂餐
  approveAllConfirmedMeals(){
    if(!this.canFinalApproveMealOrder()){ showToast('你不屬於目前指定的膳食批核組別','error'); return; }
    const data=this.getMealsData();
    const targets=data.orders.filter(o=>(o.status==='group_ok'||o.status==='pending')&&this.applicationReadyForApproval(o));
    if(!targets.length){ showToast('無待審批訂餐','warning'); return; }
    targets.forEach(o=>{ o.status='approved'; o.approved_by=this.currentUser.name; o.updated_at=new Date().toISOString(); this.syncMealOrderToGas(o); });
    this.saveMealsData(data); showToast(`已審批 ${targets.length} 張訂餐`,'success'); this.refreshMealsViews();
  }
,
  // 正式活動：從後端 Meal_Orders 表拉取合併（後端為準；本地新建未同步的保留）
  async syncMealOrdersFromGas(){
    if(this.isDemoEvent()||!this.gasUrl) return;
    const eid=this.currentEvent?.event_id||'isd_2026';
    try{
      const res=await fetch(`${this.gasUrl}?action=getEventData&event_id=${encodeURIComponent(eid)}&api_key=${encodeURIComponent(this.apiKey)}`);
      const j=await res.json();
      if(!j?.data||!Array.isArray(j.data.Meal_Orders)) return;
      const rows=j.data.Meal_Orders;
      const data=this.getMealsData();
      const deleted=this.getDeletedRecordIds('Meal_Orders');
      const map=new Map();
      rows.forEach(r=>{ if(!r.order_id||deleted.has(String(r.order_id))) return; map.set(r.order_id,{order_id:String(r.order_id),menu_id:String(r.menu_id||''),user_id:String(r.user_id||''),user_name:String(r.user_name||''),group_name:String(r.group_name||''),selection:String(r.selection||''),quantity:Number(r.quantity)||1,remarks:String(r.remarks||''),status:String(r.status||'pending'),confirmed_by:String(r.confirmed_by||''),approved_by:String(r.approved_by||''),requester_role:String(r.requester_role||''),group_confirmation_status:String(r.group_confirmation_status||''),group_confirmed_by:String(r.group_confirmed_by||r.confirmed_by||''),group_confirmed_at:String(r.group_confirmed_at||''),created_at:String(r.created_at||''),updated_at:String(r.updated_at||'')}); });
      data.orders=[...map.values()];
      this.saveMealsData(data,true);
      if(this.currentModule==='meals') this.refreshMealsViews();
    }catch(e){}
  }
,
});
