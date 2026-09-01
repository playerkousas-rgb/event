/* 33-users.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===== Users & Others (simplified) ===== */
  getLocalUsers(){
    const key=LS.users(this.currentEvent?.event_id||'isd_2026');
    let list=JSON.parse(localStorage.getItem(key)||'null');
    if(!list || !list.length){
      if(this.isDemoEvent()){
        list=[
          {user_id:'黃偉安',name:'黃偉安',email:'advisor1@isd.local',role:'advisor',group_name:'顧問團',contact:'91000001',password:'1234',status:'active',can_tick:true},
          {user_id:'何家騏',name:'何家騏',email:'advisor2@isd.local',role:'advisor',group_name:'顧問團',contact:'91000002',password:'1234',status:'active',can_tick:true},
          {user_id:'區子君',name:'區子君',email:'chair@isd.local',role:'chairperson',group_name:'主席及執行副主席',contact:'92000001',password:'1234',status:'active',can_tick:true},
          {user_id:'羅雅雯',name:'羅雅雯',email:'execvp@isd.local',role:'executive_vice_chairperson',group_name:'主席及執行副主席',job_title:'執行副主席',contact:'92000002',password:'1234',status:'active',can_tick:true},
          {user_id:'畢美儀',name:'畢美儀',email:'coordgd@isd.local',role:'general_director',group_name:'協調組',contact:'97000002',password:'1234',status:'active',can_tick:true},
          {user_id:'潘志強',name:'潘志強',email:'leung@isd.local',role:'general_director',group_name:'會操及典禮組',contact:'93000002',password:'1234',status:'active',can_tick:true},
          {user_id:'龍正謙',name:'龍正謙',email:'themegd@isd.local',role:'general_director',group_name:'主題節目組',contact:'94000002',password:'1234',status:'active',can_tick:true},
          {user_id:'曾令勤',name:'曾令勤',email:'director01@isd.local',role:'director',group_name:'主題節目組',contact:'94000003',password:'1234',status:'active',can_tick:true},
          {user_id:'陳子明',name:'陳子明',email:'staff001@isd.local',role:'staff',group_name:'主題節目組',contact:'95211111',password:'1234',status:'active',can_tick:false}
        ];
      } else {
        list=(Array.isArray(this.eventData?.users)?this.eventData.users:[]).map(u=>({user_id:u.user_id,name:u.name,role:u.role,group_name:u.group_name,job_title:u.job_title||'',email:u.email||'',contact:u.contact||'',password:u.password||'1234',status:u.status||'active',can_tick:!!u.can_tick}));
        if(!list.length && Array.isArray(this._committeeSeed)) list=this._committeeSeed.slice();
      }
    }
    // 遷移瀏覽器內已保存的舊組名，以及舊版把執行副主席當普通副主席的帳戶。
    list=(list||[]).map(u=>({...u,
      group_name:normalizeGroupName(u.group_name),
      role:(u.user_id==='exec_vp'||(u.job_title||'').includes('執行副主席'))?'executive_vice_chairperson':u.role
    }));
    list=migrateUsersToChineseLogin(list);
    localStorage.setItem(key,JSON.stringify(list));
    return list;
  }
,
  setLocalUsers(l){const key=LS.users(this.currentEvent?.event_id||'isd_2026'); localStorage.setItem(key,JSON.stringify(l));}
,
  canManageUsersPage(){ return this.roleLevel(this.currentUser?.role)>=30 || this.isSuperAdmin(); }
,
  canSeeAllUsers(){ if(this.currentUser?.mock_admin) return true; const r=this.currentUser?.role; return ['super_admin','admin','chairperson','advisor','executive_vice_chairperson'].includes(r); }
,
  canSeeUserPasswords(){ if(this.currentUser?.mock_admin) return true; return this.isSuperAdmin() || ['executive_vice_chairperson','chairperson','admin','advisor'].includes(this.currentUser?.role); }
,
  isSuperAdminUser(u){ return (u?.role)==='super_admin'; }
  /* 用戶管理可視範圍（v8.3 定案）
     ├ 最高層帳號（唔顯示喺名單）  ：全部人（包括自己）
     ├ 執行副主席或以上           ：全部人（執副／主席／顧問／管理員）
     ├ 副主席                    ：只睇自己組（本組全部職級）
     ├ 總主任                    ：自己組，唔包括副主席（及以上）
     └ 主任                      ：自己組普通工作人員（staff）                       */
,
  visibleUsersForManager(){
    const list=this.pendingUsers||this.usersList||[];
    const me=this.currentUser; if(!me) return [];
    if(this.isSuperAdmin()) return list;                                        // 最高層：全部人（包括自己）
    const noSuper=list.filter(u=>!this.isSuperAdminUser(u));                    // 其他人一律看唔到最高層帳戶
    if(this.canSeeAllUsers()) return noSuper;                                   // 執副／主席／顧問／管理員：全部人
    const myG=normalizeGroupName(me.group_name);
    const myLv=this.roleLevel(me.role);
    const sameGroup=noSuper.filter(u=>normalizeGroupName(u.group_name)===myG);
    if(myLv>=60) return sameGroup;                                              // 副主席：只睇自己組
    if(myLv>=40) return sameGroup.filter(u=>this.roleLevel(u.role)<60);         // 總主任：自己組，不包括副主席及以上
    if(myLv>=30) return sameGroup.filter(u=>this.roleLevel(u.role)<=20);        // 主任：自己組普通工作人員
    return [];
  }
,
  visibleUsersScopeLabel(){
    if(this.isSuperAdmin()) return '系統管理帳號：可見全部人（包括自己）';
    if(this.currentUser?.role==='executive_vice_chairperson') return 'L2 執行副主席：可見全部人';
    if(this.canSeeAllUsers()) return 'L1 主席／顧問／管理員：可見全部人';
    const lv=this.roleLevel(this.currentUser?.role);
    const g=normalizeGroupName(this.currentUser?.group_name)||'本組';
    if(lv>=60) return `L3 副主席：只可見自己組（${g}）全部成員`;
    if(lv>=40) return `L4 總主任：只可見自己組（${g}），不包括副主席`;
    if(lv>=30) return `L5 主任：只可見自己組（${g}）的普通工作人員`;
    return '目前職級不可查看用戶名單';
  }
,
  async ensureCommitteeAccounts(){
    if(this._committeeSeed) return this._committeeSeed;
    try{
      const res=await fetch('data/committee_accounts.csv');
      const text=await res.text();
      const rows=parseCSV(text);
      this._committeeSeed=rows.map(r=>{
        const name=(r.name||r.ymis||'').trim();
        const uid=(r.ymis||name).trim();
        return {user_id:uid,name:name||uid,email:r.email||'',role:r.role||'staff',group_name:normalizeGroupName(r.group_name),job_title:r.job_desc||r.job_title||'',contact:r.contact||'',password:r.password||'1234',status:r.status||'active',can_tick:String(r.can_tick).toLowerCase()==='true'};
      }).filter(u=>u.user_id);
    }catch(e){ this._committeeSeed=[]; }
    return this._committeeSeed;
  }
,
  async loadUsers(){let list=[]; await this.ensureCommitteeAccounts(); if(!this.mockMode&&this.gasUrl){try{const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'getAllUsers',api_key:this.apiKey})}); const j=await res.json(); if(j.success&&j.users) list=j.users.map(u=>({user_id:u.user_id||u.ymis,name:u.name,email:u.email,role:(u.user_id==='exec_vp'||(u.job_title||'').includes('執行副主席'))?'executive_vice_chairperson':u.role,group_name:normalizeGroupName(u.group_name||u.branch),job_title:u.job_title||'',contact:u.contact||'',perm_see:parsePerm(u.perm_see),perm_edit:parsePerm(u.perm_edit),password:u.password||'',status:u.status||'active',can_tick:u.can_tick}));}catch(e){}} if(!list.length) list=this.getLocalUsers(); if(!list.length && this._committeeSeed?.length){ list=this._committeeSeed.slice(); this.setLocalUsers(list); } this.usersList=list; this.pendingUsers=JSON.parse(JSON.stringify(list)); this.renderUsers();}
,
  getLocalApprovalRouting(){
    const eid=this.currentEvent?.event_id||'isd_2026';
    let stored={};
    // v8.14：路由預設改咗（膳食／物資／車→協調組、攤位→主題節目組、行政組統管）→ 舊快取清一次，只做一次
    try{
      const flag='event_approval_routing_version_'+eid;
      if(localStorage.getItem(flag)!==APPROVAL_ROUTING_VERSION){
        localStorage.removeItem(LS.approvalRouting(eid));
        localStorage.setItem(flag,APPROVAL_ROUTING_VERSION);
      }
    }catch(e){}
    try{ stored=JSON.parse(localStorage.getItem(LS.approvalRouting(eid))||'{}')||{}; }catch(e){}
    const routing={};
    APPROVAL_AREAS.forEach(a=>{
      const base=APPROVAL_ROUTING_DEFAULTS[a.id]||{approver_groups:[],executor_groups:[]};
      const row=stored[a.id]||{};
      routing[a.id]={
        approver_groups:(Array.isArray(row.approver_groups)?row.approver_groups:base.approver_groups).map(normalizeGroupName).filter(Boolean),
        executor_groups:(Array.isArray(row.executor_groups)?row.executor_groups:base.executor_groups).map(normalizeGroupName).filter(Boolean)
      };
    });
    return routing;
  }
,
  setLocalApprovalRouting(routing){
    const eid=this.currentEvent?.event_id||'isd_2026';
    localStorage.setItem(LS.approvalRouting(eid),JSON.stringify(routing));
  }
,
  getApprovalRoute(area){
    if(!this.approvalRouting) this.approvalRouting=this.getLocalApprovalRouting();
    return this.approvalRouting[area]||APPROVAL_ROUTING_DEFAULTS[area]||{approver_groups:[],executor_groups:[]};
  }
,
  approvalRouteLabel(area,field){ return (this.getApprovalRoute(area)[field]||[]).join('、')||'未設定'; }
,
  canManageApprovalRouting(user){
    user=user||this.currentUser;
    if(user?.mock_admin) return true; // v8.7：MOCK 全部管理權限
    return !!user&&['super_admin','admin','chairperson','advisor','executive_vice_chairperson'].includes(user.role);
  }
,
  canExecuteArea(area,user){
    user=user||this.currentUser;
    if(!user) return false;
    if(this.canManageApprovalRouting(user)) return true;
    const group=normalizeGroupName(user.group_name);
    return !!group&&(this.getApprovalRoute(area).executor_groups||[]).some(g=>normalizeGroupName(g)===group);
  }
,
  async loadApprovalRouting(){
    this.approvalRouting=this.getLocalApprovalRouting();
    if(!this.mockMode&&this.gasUrl){
      try{
        const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'getApprovalRouting',api_key:this.apiKey,event_id:this.currentEvent?.event_id||'isd_2026'})});
        const j=await res.json();
        if(j&&j.success&&j.routing){
          const merged={};
          APPROVAL_AREAS.forEach(a=>{
            const base=APPROVAL_ROUTING_DEFAULTS[a.id]; const row=j.routing[a.id]||base;
            merged[a.id]={approver_groups:(row.approver_groups||base.approver_groups).map(normalizeGroupName),executor_groups:(row.executor_groups||base.executor_groups).map(normalizeGroupName)};
          });
          this.approvalRouting=merged; this.setLocalApprovalRouting(merged);
        }
      }catch(e){}
    }
    return this.approvalRouting;
  }
,
  async toggleApprovalRouting(area,field,group){
    if(!this.isAdmin()){ showToast('批核權限表只供 L1 或以上（管理員／顧問／主席／執行副主席）使用','error'); return; }
    if(!APPROVAL_IDS.has(area)||!['approver_groups','executor_groups'].includes(field)) return;
    group=normalizeGroupName(group);
    if(!this.pendingApprovalRouting) this.pendingApprovalRouting=JSON.parse(JSON.stringify(this.approvalRouting||{}));
    const base=this.pendingApprovalRouting;
    const route=base[area]||this.getApprovalRoute(area);
    const next=[...(route[field]||[])];
    const idx=next.indexOf(group);
    if(idx>=0){
      if(next.length===1){ showToast('每項申請最少保留一個組別','warning'); return; }
      next.splice(idx,1);
    }else next.push(group);
    this.pendingApprovalRouting={...base,[area]:{...route,[field]:next}};
    this.renderApprovalMatrix();
    showToast('已暫存變更，請按下方「確定更新批核表」才生效','');
  }
,
  async confirmApprovalRouting(){
    if(!this.isAdmin()){ showToast('批核權限表只供 L1 或以上（管理員／顧問／主席／執行副主席）使用','error'); return; }
    if(!this.pendingApprovalRouting){ showToast('沒有未確定的變更','warning'); return; }
    this.approvalRouting=JSON.parse(JSON.stringify(this.pendingApprovalRouting));
    this.setLocalApprovalRouting(this.approvalRouting);
    this.pendingApprovalRouting=null;
    this.renderApprovalMatrix();
    if(!this.mockMode&&this.gasUrl){
      try{
        const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveApprovalRouting',api_key:this.apiKey,event_id:this.currentEvent?.event_id||'isd_2026',routing:this.approvalRouting,updated_by:this.currentUser?.name||''})});
        const j=await res.json(); if(!j?.success) throw new Error(j?.error||'儲存失敗');
      }catch(e){ showToast('路由已存本機，但後端同步失敗：'+e.message,'warning'); return; }
    }
    showToast('批核權限表已確定更新','success');
  }
,
  async loadApprovalPermissions(){ this.approvalPerms=[]; if(!this.mockMode && this.gasUrl){ try{ const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'getApprovalPermissions',api_key:this.apiKey})}); const j=await res.json(); if(j && j.success && Array.isArray(j.permissions)) this.approvalPerms=j.permissions; }catch(e){} } return this.approvalPerms; }
,
  // 總主任以上先按可多選路由判斷；管理層保留監察／代批權。
  canApproveArea(area, user){
    user=user||this.currentUser;
    if(!user) return false;
    const role=user.role||'', lvl=user.mock_admin?100:(ROLE_HIERARCHY[role]||0), group=normalizeGroupName(user.group_name);
    if(lvl<40) return false; // v8.7：MOCK mock_admin 標記＝全部管理權限（跳過職級把關，仍按路由判斷）
    if(this.canManageApprovalRouting(user)) return true;
    const required=this.getApprovalRoute(area).approver_groups||[];
    if(!required.some(g=>normalizeGroupName(g)===group)) return false;
    // 人員權限表可在獲指派的批核組內再收窄；未列明則由該組所有總主任以上處理。
    // v8.14：只有當權限表真係有呢一欄先收窄（新增 booth 等範疇時，舊紀錄冇嗰欄＝跟組別路由，唔會人人變冇權）
    const rec=this.approvalPerms.find(p=>p.user_id===user.user_id);
    if(rec && rec[area]!==undefined) return !!rec[area];
    return true;
  }
,
  normalizeApplicationConfirmation(record){
    record=record||{};
    record.group_name=normalizeGroupName(record.group_name||'');
    if(record.requester_role===undefined) record.requester_role='';
    if(record.group_confirmation_status===undefined) record.group_confirmation_status=record.status==='group_ok'?'confirmed':'';
    if(record.group_confirmed_by===undefined) record.group_confirmed_by=record.confirmed_by||'';
    if(record.group_confirmed_at===undefined) record.group_confirmed_at='';
    return record;
  }
,
  getApplicationApplicantRole(record){
    if(!record) return 'public';
    const explicit=record.requester_role||record.submitted_by_role||record.user_role;
    if(explicit) return explicit;
    const id=record.requested_by_id||record.submitted_by_id||record.user_id||'';
    const name=record.requested_by||record.submitted_by||record.user_name||'';
    const users=[...(this.usersList||[]),...(Array.isArray(this.eventData?.users)?this.eventData.users:[])];
    const found=users.find(u=>(id&&u.user_id===id)||(name&&u.name===name));
    return found?.role||'public';
  }
,
  applicationNeedsGroupConfirmation(record){
    if(!record) return true;
    if(record.group_confirmation_status==='confirmed'||record.group_confirmation_status==='not_required') return false;
    if(record.group_confirmation_status==='pending') return true;
    if(record.status==='group_ok') return false;
    return this.roleLevel(this.getApplicationApplicantRole(record))<40;
  }
,
  applicationReadyForApproval(record){ return !this.applicationNeedsGroupConfirmation(record); }
,
  canConfirmApplication(record,user){
    user=user||this.currentUser;
    if(!user||!record||!this.applicationNeedsGroupConfirmation(record)||this.roleLevel(user.role)<40) return false;
    if(this.canManageApprovalRouting(user)) return true;
    return normalizeGroupName(user.group_name)===normalizeGroupName(record.group_name);
  }
,
  applicationConfirmationMeta(user){
    user=user||this.currentUser;
    const role=user?.role||'public';
    return {requester_role:role,group_confirmation_status:this.roleLevel(role)>=40?'not_required':'pending',group_confirmed_by:'',group_confirmed_at:''};
  }
,
  applicationStageHTML(record){
    if(this.applicationNeedsGroupConfirmation(record)) return '<span class="inline-flex items-center gap-1 bg-sky-100 text-sky-700 border border-sky-200 text-[10px] px-2 py-0.5 rounded-full font-bold"><i class="fa-solid fa-user-check"></i>待本組總主任確認</span>';
    const who=record.group_confirmed_by||record.confirmed_by||'';
    return `<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold"><i class="fa-solid fa-check"></i>${who?'本組已確認':'總主任以上提交·毋須確認'}</span>`;
  }
,
  confirmApplication(area,id){
    let record=null,save=null;
    if(area==='meals'){
      const data=this.getMealsData(); record=(data.orders||[]).find(o=>o.order_id===id);
      save=()=>{record.status='group_ok'; record.confirmed_by=this.currentUser?.name||''; this.saveMealsData(data); this.syncMealOrderToGas(record); this.refreshMealsViews();};
    }else if(area==='supplies'){
      const data=this.getSuppliesData(); record=(data.requests||[]).find(r=>r.request_id===id); save=()=>{this.saveSuppliesData(data); this.refreshSuppliesViews();};
    }else if(area==='vehicle'){
      const data=this.getSuppliesData(); record=(data.vehicle_passes||[]).find(v=>v.pass_id===id); save=()=>{this.saveSuppliesData(data); this.refreshSuppliesViews();};
    }else if(area==='parking'){
      const data=this.getParkingData(); record=(data.applications||[]).find(p=>p.parking_id===id); save=()=>{this.saveParkingData(data); if(this.currentModule==='parking') this.renderParkingModule();};
    }else if(area==='finance'){
      const data=this.getFinanceData(); record=(data.expenses||[]).find(e=>e.id===id); save=()=>{this.saveFinanceData(data); this.renderFinanceExpense();};
    }
    if(!record){ showToast('找不到申請','error'); return; }
    if(!this.canConfirmApplication(record)){ showToast('只可由申請所屬組別的總主任以上確認','error'); return; }
    record.group_confirmation_status='confirmed'; record.group_confirmed_by=this.currentUser?.name||''; record.group_confirmed_at=new Date().toISOString();
    save(); showToast('本組確認完成，已交指定批核組別','success'); this.renderApprovalCenter();
  }
,
  renderUsers(){
    const container=document.getElementById('users-container'); if(!container) return;
    if(!this.canManageUsersPage()){ container.innerHTML='<p class="text-xs text-slate-400">用戶管理只供主任以上使用。</p>'; return; }
    if(!this.pendingUsers) this.pendingUsers=JSON.parse(JSON.stringify(this.usersList||[]));
    const list=this.visibleUsersForManager();
    const showPwd=this.canSeeUserPasswords();
    const dirty=JSON.stringify(this.pendingUsers||[])!==JSON.stringify(this.usersList||[]);
    const scopeBar=`<div class="bg-slate-900 text-white rounded-xl p-3 mb-3 text-[11px] leading-relaxed"><b><i class="fa-solid fa-eye mr-1"></i>你的可見範圍：</b>${escapeHtml(this.visibleUsersScopeLabel())} <span class="opacity-70">（共 ${list.length} 人）</span><div class="mt-1 opacity-80">規則：執行副主席／主席／顧問／管理員＝可見全部人｜副主席＝只睇自己組｜總主任＝自己組（不包括副主席）｜主任＝自己組普通工作人員</div></div>`;
    if(!list.length){container.innerHTML=scopeBar+'<p class="text-xs text-slate-400">沒有可見用戶。若已為籌委開戶但仍空白，請重新整理或確認已登入正確活動。</p>'; return;}
    const permBlock=`<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-3 text-[11px] text-indigo-900 leading-relaxed"><b>用戶管理：</b>登入帳號＝中文姓名。每位用戶已按職級帶有預設權限（主席／顧問／管理員／執行副主席＝全權），下方會顯示現有「可看／可管」，編輯權限時會先勾選現有項目。改角色、組別、密碼或權限只會暫存在此頁，必須按下方「確定更新用戶」才真正套用。</div>`;
    const confirmBar=`<div class="flex justify-end mt-4"><button onclick="app.confirmUsersUpdate()" class="bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow"><i class="fa-solid fa-check mr-1"></i>確定更新用戶</button></div>`;
    container.innerHTML=scopeBar+permBlock+list.map(u=>{
      const pwd=showPwd?`<div class="text-[11px] font-mono text-slate-600 mt-0.5">密碼：${escapeHtml(u.password||'(未顯示)')}</div>`:'';
      const permBtn=this.roleLevel(this.currentUser?.role)>=40?`<button onclick="app.openPermissionEditor('${u.user_id}')" class="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-1 rounded-xl text-[11px]">權限</button>`:'';
      return `<div class="border p-3 rounded-xl flex justify-between gap-2"><div class="min-w-0"><b>${escapeHtml(u.name)}</b> ${u.job_title?`<span class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border">${escapeHtml(u.job_title)}</span>`:''}<span class="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full">${escapeHtml(ROLE_LABELS[u.role]||u.role)}</span><div class="text-[11px] text-slate-500">${escapeHtml(u.group_name||'')} | ${escapeHtml(u.contact||'')} | 帳號 ${escapeHtml(u.user_id||'')}</div>${pwd}</div><div class="flex gap-1 flex-shrink-0"><button onclick="app.editUser('${u.user_id}')" class="bg-white border px-2 py-1 rounded-xl text-[11px]">編輯</button>${permBtn}</div></div>`;
    }).join('')+confirmBar;
  }
,
  async confirmUsersUpdate(){
    if(!this.canManageUsersPage()){ showToast('無權更新用戶','error'); return; }
    if(!this.pendingUsers){ showToast('沒有未確定的變更','warning'); return; }
    this.usersList=JSON.parse(JSON.stringify(this.pendingUsers));
    this.setLocalUsers(this.usersList);
    if(!this.mockMode&&this.gasUrl){
      try{
        const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveUsers',api_key:this.apiKey,users:this.usersList})});
        const j=await res.json();
        if(!j?.success) throw new Error(j?.error||'後端未全部寫入');
      }catch(e){ showToast('已存本機，後端同步失敗：'+e.message,'warning'); this.renderUsers(); return; }
    }
    showToast('用戶資料已確定更新','success');
    this.renderUsers();
  }
,
  openUserFormModal(){document.getElementById('u-form-mode').value='create'; document.getElementById('u-form-original-id').value=''; document.getElementById('u-ymis').value=''; document.getElementById('u-name').value=''; this.populateUserRoleSelect('staff'); document.getElementById('modal-user').classList.remove('hidden');}
,
  // 上級可改下級權限：最多可設定到與自己相同的權限；最高層職級係後端專管，前端不提供開設
  // 副主席及以上（主席/副主席/執行副主席/顧問/管理員）已確定由管理員處理，其餘人只可開設以下層級
  assignableRoles(){ if(!this.currentUser) return []; const myLv=this.roleLevel(this.currentUser.role); const pool=Object.keys(ROLE_HIERARCHY).filter(r=>r!=='public'&&r!=='super_admin'); const isTopAdmin=this.currentUser.mock_admin||['super_admin','admin'].includes(this.currentUser.role); if(isTopAdmin) return pool.filter(r=>ROLE_HIERARCHY[r]<=myLv); return pool.filter(r=>ROLE_HIERARCHY[r]<=myLv && ROLE_HIERARCHY[r]<60); }
,
  populateUserRoleSelect(curVal){
    const sel=document.getElementById('u-role'); if(!sel) return;
    const allowed=this.assignableRoles();
    if(!allowed.includes(curVal) && curVal) allowed.unshift(curVal);
    sel.innerHTML=allowed.map(r=>`<option value="${r}" ${r===curVal?'selected':''}>${ROLE_LABELS[r]||r}</option>`).join('')||'<option value="staff">工作人員</option>';
  }
,
  editUser(id){const u=this.usersList.find(x=>x.user_id===id); if(!u) return; document.getElementById('u-form-mode').value='edit'; document.getElementById('u-form-original-id').value=u.user_id; document.getElementById('u-ymis').value=u.user_id; document.getElementById('u-name').value=u.name; document.getElementById('u-group').value=u.group_name||''; document.getElementById('u-contact').value=u.contact||''; document.getElementById('u-email').value=u.email||''; const pwd=document.getElementById('u-password'); if(pwd){ pwd.value=this.canSeeUserPasswords()?(u.password||''):''; pwd.parentElement?.classList.toggle('hidden', !this.canSeeUserPasswords()); } this.populateUserRoleSelect(u.role||'staff'); document.getElementById('modal-user').classList.remove('hidden');}
,
  submitUserForm(e){e.preventDefault(); let uid=document.getElementById('u-ymis').value.trim(); const name=document.getElementById('u-name').value.trim(); if(!name) return; if(!uid) uid=name; if(document.getElementById('u-form-mode').value==='create' && isLegacyLatinLogin(uid) && hasCjk(name)) uid=name; if(!uid) return; const role=document.getElementById('u-role').value; const myLv=this.roleLevel(this.currentUser?.role||'public'); if(role && myLv<ROLE_HIERARCHY[role]){ showToast('不可設定比自己更高的權限','error'); return; } if(!this.currentUser?.mock_admin&&!['super_admin','admin'].includes(this.currentUser?.role) && !ACCOUNT_SETUP_ROLES.includes(role)){ showToast('副主席及以上職級由管理員處理','error'); return; } if(!this.pendingUsers) this.pendingUsers=JSON.parse(JSON.stringify(this.usersList||this.getLocalUsers())); let list=this.pendingUsers; const pwdEl=document.getElementById('u-password'); const newPwd=(pwdEl?.value||'').trim(); if(list.some(x=>x.user_id===uid)){ const idx=list.findIndex(x=>x.user_id===uid); list[idx].name=name; list[idx].role=role; list[idx].group_name=document.getElementById('u-group').value; list[idx].contact=document.getElementById('u-contact').value; list[idx].email=document.getElementById('u-email').value; if(newPwd && this.canSeeUserPasswords()) list[idx].password=newPwd; } else list.push({user_id:uid,name,role,group_name:document.getElementById('u-group').value,contact:document.getElementById('u-contact').value,email:document.getElementById('u-email').value,password:newPwd||'1234',status:'active',can_tick:false}); this.pendingUsers=list; this.closeModal('modal-user'); showToast('已暫存，請按「確定更新用戶」才套用',''); this.renderUsers();}
,
  downloadUsersTemplate(){const csv='ymis,name,email,role,group_name,contact,password,can_tick\\n朱家聰,朱家聰,chair@isd.local,chairperson,主席及執行副主席,,1234,true\\n'; const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='users_template.csv'; a.click(); showToast('已下載範本','success');}
,
  handleBulkJSON(isModal){const text=document.getElementById('bulk-json-modal')?.value||''; if(!text){showToast('請貼上JSON','warning'); return;} try{let arr=JSON.parse(text); if(!Array.isArray(arr)) arr=[arr]; const valid=arr.filter(r=>r.ymis&&r.name); this.bulkPending=valid.map(r=>({user_id:r.ymis,name:r.name,email:r.email||'',role:r.role||'staff',group_name:r.group_name||r.group||'主題節目組',contact:r.contact||'',password:r.password||'1234',can_tick:!!r.can_tick})); document.getElementById('bulk-modal-preview').classList.remove('hidden'); document.getElementById('bulk-modal-count').textContent=this.bulkPending.length; document.getElementById('bulk-modal-table').innerHTML=`<table class="min-w-full text-xs"><tr><th class="px-2 py-1 text-left">ID</th><th class="px-2 py-1 text-left">姓名</th></tr>${this.bulkPending.map(r=>`<tr><td class="px-2 py-1">${escapeHtml(r.user_id)}</td><td class="px-2 py-1">${escapeHtml(r.name)}</td></tr>`).join('')}</table>`; showToast('已解析','success');}catch(e){showToast('JSON錯誤','error');}}
,
  confirmBulkCreate(){if(!this.bulkPending.length){showToast('無資料','warning'); return;} let list=this.getLocalUsers(); let added=0; const existing=new Set(list.map(u=>u.user_id)); this.bulkPending.forEach(r=>{ if(!existing.has(r.user_id)){ list.push({user_id:r.user_id,name:r.name,email:r.email,role:r.role,group_name:r.group_name,contact:r.contact,password:r.password||'1234',status:'active',can_tick:r.can_tick}); added++; } }); this.setLocalUsers(list); this.closeModal('modal-bulk'); showToast(`批量完成 成功${added}筆`,'success'); this.loadUsers();}
,
  applyBannerConfig(){const t=this.systemConfig.bannerText; const el=document.getElementById('banner-meeting-text'); if(el) el.textContent=t;} // v11.2：會議預告已由頂部橫幅搬入活動資訊橫幅（dash-meeting-box）
,
  updateSaveBar(){const bar=document.getElementById('saveBar'); const c=this.pendingChanges.length; if(c>0){bar.classList.add('visible'); document.getElementById('pendingText').textContent=`${c} 項未保存`;} else bar.classList.remove('visible');}
,
  discardChanges(){this.pendingChanges=[]; localStorage.removeItem(LS.pending(this.currentEvent?.event_id||'global')); this.updateSaveBar();}
,
  async saveChanges(){if(!this.pendingChanges.length){showToast('無變更','warning'); return;} const overlay=document.getElementById('savingOverlay'); overlay.classList.add('active'); await new Promise(r=>setTimeout(r,800)); this.pendingChanges=[]; localStorage.removeItem(LS.pending(this.currentEvent?.event_id||'global')); overlay.classList.remove('active'); this.updateSaveBar(); showToast('已保存','success');}
,
  async submitLogin(e){e.preventDefault(); const id=document.getElementById('login-email-input').value.trim(); const pwd=document.getElementById('login-password-input').value.trim();
    // 只要已設定後端網址，無論 Mock/雲端模式都先交由後端驗證
    // （正式帳戶只存在後端 SCRIPT/Sheet，前端及 Mock 本地均不留存；之前 Mock 模式下後端帳戶永遠登入失敗）
    if(this.gasUrl){
      // v8.13：改用 gasPost()──睇得到真正嘅 HTTP 狀態（400／401／404／5xx），
      // 唔會再將「Google 拒絕請求」一律當成「回應唔係 JSON／密碼錯」，最高層管理帳號入唔到嗰陣先對到症。
      const r=await this.gasPost({action:'login',user_id:id,password:pwd});
      if(r.ok && r.json){
        const j=r.json;
        if(j.success && j.user){ this.currentUser={user_id:j.user.user_id,name:j.user.name,role:(j.user.user_id==='exec_vp'||(j.user.job_title||'').includes('執行副主席'))?'executive_vice_chairperson':j.user.role,group_name:normalizeGroupName(j.user.group_name),job_title:j.user.job_title||'',perm_see:parsePerm(j.user.perm_see),perm_edit:parsePerm(j.user.perm_edit)}; localStorage.setItem(LS.currentUser,JSON.stringify(this.currentUser)); this.updateUserUI(); this.updateAdminNav(); this.closeModal('modal-login'); showToast('登入成功 '+(j.user.name||'')+(j.version?`（後端 ${j.version}）`:''),'success'); if(this.currentEvent) this.showDashboard(); return; }
        if(j.success && !j.user){
          // 後端將 POST 重新導向成 GET（常見於 /exec 部署係舊版本）：回應會變成 getEvents
          if(!this.mockMode){ showToast('登入失敗：後端回應異常（疑似部署係舊版本）。請喺 Apps Script 用「部署 → 管理部署 → 新版本」重新部署最新 Code.gs 後再試。','error'); return; }
        } else if(!this.mockMode){
          // v8.2 診斷提示：帳戶冇錯都入唔到，最大可能係你連住嘅 /exec 係舊版部署（未重新部署新版 Code.gs）。
          const hint=j.version?'':'（後端冇回報版本 → 好大機會係舊版部署；請喺 Apps Script「部署 → 管理部署 → 新版本」重新部署最新 Code.gs 後再試）';
          // v8.14：順手問後端「呢個帳號點解入唔到」（需要後端 v8.5；舊版會靜默略過）
          const ah=await this.loginAccountHint(id,pwd);
          showToast('登入失敗：'+(j.error||'帳號或密碼錯誤')+hint+ah,'error'); return;
        }
        // Mock 模式下後端找不到 → 繼續嘗試本地示範帳戶
      } else {
        // HTTP 層面失敗（400／401／404／5xx、或回應唔係 JSON）＝後端根本冇執行到 doPost，同密碼無關
        const reason=r.status?('HTTP '+r.status+' '+(r.statusText||'')):(r.error||'無回應');
        if(!r.ok) console.warn('[登入] 後端 POST 失敗：'+reason+'｜回應：'+String(r.text||'').slice(0,200));
        if(!this.mockMode){
          // 後端死咗：若本機名單有同一個帳號，照畀佢「離線登入」繼續睇資料（會講清楚改動唔會入後端）
          if(this.offlineLogin(id,pwd,reason)) return;
          showToast('登入失敗：'+reason+'。'+this.loginFailureHint(r.status)+'（可撳登入框入面嘅「後端連線診斷」睇實際回應）','error'); return;
        }
        /* Mock 模式下後端連不上 → 繼續嘗試本地示範帳戶 */
      }
    }
    // Mock 模式回退：本地示範帳戶（正式帳戶只經後端 SCRIPT）
    const users=this.getLocalUsers(); const found=users.find(u=>(u.user_id===id||u.email===id||u.name===id)&&u.password===pwd);
    if(found){this.currentUser={user_id:found.user_id,name:found.name,role:found.role,group_name:normalizeGroupName(found.group_name),job_title:found.job_title||'',perm_see:parsePerm(found.perm_see),perm_edit:parsePerm(found.perm_edit),offline:!this.isDemoEvent()}; if(this.isDemoEvent()) this.currentUser.mock_admin=true; // v8.7：MOCK 全部管理權限
    localStorage.setItem(LS.currentUser,JSON.stringify(this.currentUser)); this.updateUserUI(); this.updateAdminNav(); this.closeModal('modal-login'); showToast('登入成功 '+found.name+(this.isDemoEvent()?'（MOCK 全部管理權限已開）':'（離線：本機資料）'),'success'); if(this.currentEvent) this.showDashboard(); return;}
    showToast('登入失敗：帳戶不存在或密碼錯誤。身份由管理員批核 (角色＋組別)，未有帳戶請聯絡管理員開戶','error');
  }
,
  // v8.14：登入失敗（帳號唔存在／密碼錯）時，問後端攞「點解」——需要後端 v8.5 嘅 accountCheck；
  // 舊版部署會回「Unknown POST action」，呢個 function 會靜默略過（唔會影響原本嘅錯誤提示）。
  // v8.14c：pwd 一齊交俾後端做「密碼探針」——後端只係同比較 SCRIPT 常數（唔寫入任何表、唔外洩），
  // 用嚟分得出「帳號根本唔存在」定係「帳號啱、密碼唔啱」。後端舊過 v8.6 會靜默略過呢幾項。
  async loginAccountHint(id,pwd){
    try{
      const payload={action:'accountCheck',api_key:this.apiKey,user_id:id};
    if(pwd) payload.password=pwd;   // 密碼探針（後端只比較常數，唔會儲存／回傳）
    const r=await this.gasPost(payload);
      if(!(r.ok&&r.json&&r.json.success)) return '';
      const j=r.json;
      if(j.builtin_account===true){
        // 呢個 id 就係 SCRIPT 常數入面嘅最高層管理帳號
        if(j.script_password_match===true) return '（後端 SCRIPT 有呢個最高層管理帳號，密碼亦啱 → 入唔到多數係 /exec 仲係舊版本，請「部署 → 管理部署 → 新版本」重新部署 Code.gs）';
        if(j.script_password_match===false) return '（後端 SCRIPT 有呢個最高層管理帳號，但密碼對唔上常數 → 試吓用 Code.gs 入面 SUPER_ADMIN_PASS 嗰個密碼）';
        return '（後端 SCRIPT 有呢個最高層管理帳號，Users 表'+(j.found?'有':'冇')+'對應資料 → 要用 SCRIPT 常數嗰個密碼登入）';
      }
      if(!j.found){
        const masked=j.super_admin_id_masked?('（SCRIPT 內建最高層帳號係「'+j.super_admin_id_masked+'」，你打入去嘅係「'+id+'」→ 唔係同一個 id）'):'';
        return '（後端 Users 表冇「'+id+'」呢個帳號'+masked+' → 要搵管理員開戶／加返入名單）';
      }
      const row=(j.rows||[])[0];
      if(row&&!row.has_password) return '（呢個帳號喺後端冇密碼 → 要喺後端設返密碼先入到）';
      if(row&&row.is_default_password) return '（呢個帳號仲用緊預設密碼 1234）';
      return row?('（後端有呢個帳號：'+row.name+'／'+row.role+'／'+(row.group_name||'冇組別')+'）'):'';
    }catch(e){ return ''; }
  }
,
  // v8.13 離線登入：後端 POST 失敗（HTTP 400／404／5xx／網絡錯誤）時先會用到。
  // 本機名單（之前同步落嚟嘅 localStorage／內建 data/*.json／committee_accounts.csv）內
  // 有同一個帳號＋密碼 → 照入，方便繼續睇資料；但標記 offline，改動只影響呢個瀏覽器，唔會寫入後端 Sheet。
  offlineLogin(id,pwd,reason){
    try{
      const list=this.getLocalUsers()||[];
      const found=list.find(u=>(u.user_id===id||u.email===id||u.name===id)&&String(u.password||'')===String(pwd||''));
      if(!found||!String(pwd||'')) return false;
      this.currentUser={user_id:found.user_id,name:found.name,role:found.role,group_name:normalizeGroupName(found.group_name),job_title:found.job_title||'',perm_see:parsePerm(found.perm_see),perm_edit:parsePerm(found.perm_edit),offline:true};
      localStorage.setItem(LS.currentUser,JSON.stringify(this.currentUser));
      this.updateUserUI(); this.updateAdminNav(); this.closeModal('modal-login');
      showToast('⚠️ 後端冇回應（'+reason+'）→ 已用本機名單登入「'+found.name+'」（離線：只睇到呢個瀏覽器嘅資料，改動唔會寫入後端）','warning');
      if(this.currentEvent) this.showDashboard();
      return true;
    }catch(err){ return false; }
  }
,
  demoLogin(uid){if(!this.isDemoEvent()){showToast('示範登入僅限「模擬示範版」活動','error'); return;} const users=this.getLocalUsers(); const found=users.find(u=>loginIdMatches(u,uid))||{user_id:uid,name:uid,role:'super_admin',group_name:'主席及執行副主席'}; this.currentUser={user_id:found.user_id,name:found.name,role:found.role,group_name:found.group_name,mock_admin:true}; // v8.7：MOCK 示範登入＝所有管理權限全開（本地沙盒）
    localStorage.setItem(LS.currentUser,JSON.stringify(this.currentUser)); this.updateUserUI(); this.updateAdminNav(); this.closeModal('modal-login'); showToast('示範登入：'+(ROLE_LABELS[found.role]||found.role)+' '+found.name+'（MOCK 全部管理權限已開）','success'); if(this.currentEvent) this.showDashboard();}
,
  openChangePwdModal(){if(!this.currentUser){ showToast('請先登入','warning'); return; } ['cp-old','cp-new','cp-new2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); document.getElementById('modal-changepwd').classList.remove('hidden');}
,
  async submitChangePassword(e){
    e.preventDefault();
    const oldPwd=document.getElementById('cp-old').value;
    const newPwd=document.getElementById('cp-new').value;
    const newPwd2=document.getElementById('cp-new2').value;
    if(!oldPwd||!newPwd){ showToast('請填寫舊密碼及新密碼','error'); return; }
    if(newPwd!==newPwd2){ showToast('兩次新密碼不一致','error'); return; }
    if(newPwd.length<4){ showToast('新密碼至少 4 個字元','error'); return; }
    const uid=this.currentUser?.user_id;
    if(!this.mockMode && this.gasUrl){
      try{
        const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'changePassword',api_key:this.apiKey,user_id:uid,old_password:oldPwd,new_password:newPwd})});
        const j=await res.json();
        if(j&&j.success){ this.closeModal('modal-changepwd'); showToast('密碼已更新','success'); }
        else showToast('修改失敗：'+(j&&j.error||'未知錯誤'),'error');
      }catch(err){ showToast('無法連線後端：'+err.message,'error'); }
      return;
    }
    // Mock 模式：更新本地示範帳戶
    const list=this.getLocalUsers();
    const u=list.find(x=>x.user_id===uid);
    if(!u){ showToast('找不到帳戶','error'); return; }
    if(u.password && u.password!==oldPwd){ showToast('舊密碼錯誤','error'); return; }
    u.password=newPwd;
    this.setLocalUsers(list);
    this.closeModal('modal-changepwd');
    showToast('密碼已更新（示範）','success');
  }
,
  updateUserUI(){if(!this.currentUser) return; document.getElementById('user-badge').classList.remove('hidden'); document.getElementById('user-badge').classList.add('flex'); document.getElementById('nav-username').textContent=this.currentUser.name; document.getElementById('nav-role').textContent=(ROLE_LABELS[this.currentUser.role]||this.currentUser.role)+(this.currentUser.offline?' · 離線':''); document.getElementById('banner-admin-actions')?.classList.toggle('hidden', !this.canSendMeetingReminder()); this.renderEventNews(); this.updateAdminNav(); setTimeout(()=>this.checkAndShowNotifications(), 500);}
,
  logout(){this.currentUser=null; localStorage.removeItem(LS.currentUser); document.getElementById('user-badge').classList.add('hidden'); document.getElementById('login-btn-text').textContent='登入'; document.getElementById('banner-admin-actions')?.classList.add('hidden'); this.renderEventNews(); showToast('已登出','warning'); this.updateAdminNav(); if(this.currentEvent) this.showDashboard();}
,
  openAddRecordModal(type){document.getElementById('record-modal-title').textContent='新增紀錄'; document.getElementById('record-form-fields').innerHTML=`<input type="hidden" id="form-module-name" value="${type}"><div><label class="text-xs font-bold">標題</label><input id="f_title" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-xs font-bold">組別</label><input id="f_group" value="主題節目組" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-xs font-bold">說明</label><textarea id="f_desc" rows="3" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></textarea></div>`; document.getElementById('modal-record').classList.remove('hidden');}
,
  submitRecordForm(e){e.preventDefault(); const mod=document.getElementById('form-module-name').value; const title=document.getElementById('f_title').value; const group=document.getElementById('f_group').value; const desc=document.getElementById('f_desc').value; this.pendingChanges.push({module:mod,title,group,desc}); localStorage.setItem(LS.pending(this.currentEvent?.event_id||'global'),JSON.stringify(this.pendingChanges)); this.updateSaveBar(); this.closeModal('modal-record'); showToast('已提交 (全前端)','success'); if(this.currentModule) this.openModule(this.currentModule);}
,
  sendMeetingEmails(){if(!this.canSendMeetingReminder()){ showToast('僅執行副主席以上或秘書處可發送會議提醒','error'); return; } if(!confirm('發送會議提醒 Email？')) return; showToast('已發送 (Mock)','success');}
,
});
