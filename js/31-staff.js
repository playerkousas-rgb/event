/* 31-staff.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== Staff Enhanced Module ===================== */
  getStaffData(){
    // v8.2：JSON 為單一事實來源。localStorage 只允許保留帶 _userEdited 標記的項目
    // （防止過往 localStorage 快取住舊的排序 / 舊聯絡表，強制刷新也沒用的問題）。
    const key=LS.staff(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    const jsonStaff=this.eventData['staff']||{org_chart:[],contacts:[],job_duties:[]};
    let raw;
    if(this.isDemoEvent()){
      // 示範沙盒 (mock_demo)：維持原本 local 優先的行為，方便自由玩沙
      raw=local||jsonStaff;
    } else {
      // 正式活動：JSON 為底，若 local 有 _userEdited 項則覆蓋 / 追加對應 id
      // v8.6：種子節點改派「穩定 id」（org_seed_i，不再帶 Date.now），令本機改動能按 id 對回
      // JSON 原節點直接覆蓋；以前 id 每次載入都不同，merge 永不命中，local 全份被追加 →
      // 各組岗位節點翻倍（主頁「N 崗位」×2，人數因按姓名去重所以冇事）。
      raw={
        staff_source: jsonStaff.staff_source||local?.staff_source||null,
        contact_source: jsonStaff.contact_source||local?.contact_source||null,
        duties_source: jsonStaff.duties_source||local?.duties_source||null,
        org_chart: (jsonStaff.org_chart||[]).map((n,i)=>({...n,id:n.id||('org_seed_'+i)})),
        contacts: [...(jsonStaff.contacts||[])],
        job_duties: [...(jsonStaff.job_duties||[])],
      };
      if(local){
        // v8.9：本機（含 Drive 同步結果）嘅行先按 id 對回；對唔到時改用「正規化崗位 key」再試一次，
        // 令同一崗位係「覆蓋」種子行，而唔係當新行追加（追加＝以前 ×2 嘅根源）。
        const mergeUser=(baseArr,localArr,keyField,keyOf)=>{
          if(!Array.isArray(localArr)) return baseArr;
          const edits=localArr.filter(x=>x&&x._userEdited);
          if(!edits.length) return baseArr;
          const out=[...baseArr];
          edits.forEach(u=>{
            let idx=keyField?out.findIndex(x=>x[keyField]===u[keyField]):-1;
            if(idx<0&&keyOf) idx=out.findIndex(x=>keyOf(x)===keyOf(u));
            if(idx>=0){ const keepId=out[idx].id; out[idx]={...out[idx],...u,id:keepId||u.id}; }
            else out.push(u);
          });
          return out;
        };
        raw.org_chart=mergeUser(raw.org_chart, local.org_chart, 'id', orgNodeKey);
        raw.contacts=mergeUser(raw.contacts, local.contacts, 'id');
        raw.job_duties=mergeUser(raw.job_duties, local.job_duties, 'id');
      }
    }
    // Normalize both seeded and previously saved data so displayed group names never retain wrapping parentheses.
    const orgNodes=[];
    (raw.org_chart||[]).forEach((n,i)=>{
      const group=((n.title||'').includes('執行副主席')||(n.title||'')==='主席')?'主席及執行副主席':(this.parseGroupFromLevel(n.level)||n.group||'未分組');
      const base={id:n.id||'org_'+i+'_'+Date.now(),level:n.level||'未知 (Level 3)',level_num:this.parseLevelNum(n.level),group:normalizeGroupName(group),title:n.title||'職位',names:n.names||'',desc:n.desc||'',parent_id:n.parent_id||null,created_at:n.created_at||''};
      // v8.2 層級編號更新：L1=顧問／主席／秘書處、L2=執行副主席、L3=副主席、L4=總主任、L5=主任、L6=工作人員。
      // 舊資料（顧問/主席/秘書處=L2、執行副主席=L3）自動遷移，即使本機舊快取亦會顯示新編號。
      this.migrateOrgNodeLevel(base);
      if(normalizeOrgText(base.title)==='顧問' && orgNameList(base.names).length>1){   // v8.9：用正規化結果判「顧問」，Drive 版有換行／空格都照樣拆開
        orgNameList(base.names).forEach((nm,k)=>orgNodes.push({...base,id:base.id+'_'+k,names:nm}));
      } else orgNodes.push(base);
    });
    // v8.6 去重：JSON 與本機快取是兩個來源，同一崗位可能各有一份（舊快取 id 對唔返被整份追加）。
    // v8.9 去重 key 改用「正規化後」的 組別|職位|人名（去換行／空格、統一半全形括號、人名拆分隔符後排序），
    // 因為 Drive 架構圖解析出嘅同一崗位往往只係差一個換行／括號格式，舊 key 擋唔住 → 「N 崗位 · M 人」×2。
    // 保留內容較齊嘅一份（有職務描述／經本機編輯者），id 用種子行 id 以保持穩定。
    const uniqOrgNodes=dedupeOrgNodes(orgNodes,(n,cur)=>(n._userEdited&&!cur._userEdited)||(!String(cur.desc||'').trim()&&String(n.desc||'').trim()));
    // v8.9 自我修正：舊版遺留嘅「重複行已寫入 localStorage」情況（例如每次 Drive 同步都整份追加），
    // 去重後把乾淨嘅結果寫回本機快取（只刪重複行，唔改任何內容），下一次開啟就係正確數字。
    this.healStaffOrgCache(local);
    return {
      staff_source: raw.staff_source||null,
      contact_source: raw.contact_source||this.eventData.staff?.contact_source||null,
      duties_source: raw.duties_source||this.eventData.staff?.duties_source||null,
      org_chart:uniqOrgNodes,
      // v8.9：名單／職務大綱都要去重（以前只有 org_chart 去重 → 上傳同一檔兩次就會「點入部門中心見內容 ×2」）
      contacts:dedupeByKey((raw.contacts||[]).map((c,i)=>{const roleTitle=c.role_title||c.role||''; const group=c.group_name||c.group||''; return {id:c.id||'contact_'+i,name:c.name||'',role_title:roleTitle,group_name:group,level:c.level||'',contact:c.contact||c.phone||'',job_desc:c.job_desc||c.duty||'',email:c.email||'',squad:c.squad||'',status:c.status||'active'};}),
        contactKey,
        (a,b)=>{ const filled=o=>['contact','email','job_desc','level','squad'].reduce((s,k)=>s+(String(o[k]||'').trim()?1:0),0); return filled(a)>filled(b); }),
      job_duties:dropContainedDuties(dedupeByKey((raw.job_duties||[]).map((jj,i)=>({id:jj.id||'duty_'+i,group:normalizeGroupName(jj.group||'未分組'),duty:jj.duty||jj.description||'',file_name:jj.file_name||'',file_url:jj.file_url||'',updated_by:jj.updated_by||'',updated_at:jj.updated_at||''})),
        dutyKey,
        (a,b)=>String(a.duty||'').length>String(b.duty||'').length))
    };
  }
,
  // v8.9 快取自愈：只做「刪重複行」，唔改任何內容。
  // 舊版（v8.6 前）會將 Drive 同步結果整份追加落本機快取，令同一崗位喺 localStorage 出現兩次；
  // 讀取時雖然已經去重（畫面正確），但快取本身仍然係脏嘅。呢度把「同一正規化 key 嘅第二份起」剔除後寫回，
  // 冇重複時完全唔寫（避免每次 render 都改快取），下一次開 APP 就係乾淨資料。
  healStaffOrgCache(local){
    try{
      if(this.isDemoEvent() || !local || !Array.isArray(local.org_chart) || !local.org_chart.length) return false;
      const orgPruned=uniqOrgNodesBy(local.org_chart);
      const dutyPruned=Array.isArray(local.job_duties)?dropContainedDuties(dedupeByKey(local.job_duties,dutyKey)):local.job_duties;
      const cPruned=Array.isArray(local.contacts)?dedupeByKey(local.contacts,contactKey):local.contacts;
      const removed=(local.org_chart.length-orgPruned.length)
        +(Array.isArray(local.job_duties)?local.job_duties.length-(dutyPruned||[]).length:0)
        +(Array.isArray(local.contacts)?local.contacts.length-(cPruned||[]).length:0);
      if(!removed) return false;
      localStorage.setItem(LS.staff(this.currentEvent?.event_id||'isd_2026'), JSON.stringify({...local, org_chart:orgPruned, job_duties:dutyPruned, contacts:cPruned}));
      console.log('[ISD] staff 快取自愈：移除重複行 '+removed+' 行（崗位／職務大綱／名單）');
      return true;
    }catch(e){ return false; }
  }
,
  parseLevelNum(levelStr){
    if(!levelStr) return 3;
    const m=String(levelStr).match(/Level\s*(\d+)/i);
    return m?parseInt(m[1]):3;
  }
,
  // v8.2 層級遷移（新編號）：L1=顧問／主席／秘書處、L2=執行副主席、L3=副主席、L4=總主任、L5=主任、L6=工作人員。
  // 只校正舊編號資料：顧問團／主席／秘書處 → L1；執行副主席 → L2；其餘照舊。
  migrateOrgNodeLevel(node){
    if(!node) return node;
    const g=normalizeGroupName(node.group||'')||this.parseGroupFromLevel(node.level);
    const t=String(node.title||'');
    let target=null;
    if(g==='顧問團'||t==='主席'||g==='秘書處') target=1;
    else if(t.includes('執行副主席')) target=2;
    if(target!==null && node.level_num!==target){
      node.level_num=target;
      node.level=`${g||'未分組'} (Level ${target})`;
    }
    return node;
  }
,
  parseGroupFromLevel(levelStr){
    if(!levelStr) return '';
    const m=String(levelStr).split('(')[0].trim();
    return normalizeGroupName(m);
  }
,
  saveStaffData(data){
    const key=LS.staff(this.currentEvent?.event_id||'isd_2026');
    // v8.2：正式活動中把即將寫入 localStorage 的項目全部打上 _userEdited，
    // 這樣 getStaffData() 才會保留這些改動（其他項目仍以 JSON 為準）。
    if(!this.isDemoEvent() && data && typeof data==='object'){
      const stamp=(arr)=>Array.isArray(arr)?arr.map(x=>({...x,_userEdited:true})):arr;
      data={...data, org_chart:stamp(data.org_chart), contacts:stamp(data.contacts), job_duties:stamp(data.job_duties)};
    }
    localStorage.setItem(key,JSON.stringify(data));
    this.eventData['staff']=data;
    // 同步到後端（GAS）
    if(!this.mockMode && this.gasUrl){
      fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Staff_Contacts',record:{event_id:this.currentEvent?.event_id||'isd_2026',data_json:JSON.stringify(data.contacts||[]),updated_by:this.currentUser?.name||''}})}).catch(()=>{});
    }
  }
,
  renderStaffModule(box){
    const container=box||document.getElementById('module-content');
    const isAdmin=this.isAdmin();
    const isViceChairOrAbove=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    const isExecViceChairOrAbove=!!this.currentUser?.mock_admin||(ROLE_HIERARCHY[this.currentUser?.role]||0)>=80 || ['vice_chairperson','chairperson','admin','super_admin','advisor'].includes(this.currentUser?.role);
    // Sub tab handling
    if(!this.staffSubTab) this.staffSubTab='org_chart';
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] text-indigo-900">
          組織架構公開可看；電話／Email 需登入；名單及職務大綱由有權限者管理。
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchStaffTab('org_chart')" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${this.staffSubTab==='org_chart'?'bg-indigo-600 text-white shadow':'bg-slate-100 text-slate-600 hover:bg-slate-200'}"><i class="fa-solid fa-sitemap mr-1"></i> 組織架構圖 (樹形)</button>
          <button onclick="app.switchStaffTab('contacts')" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${this.staffSubTab==='contacts'?'bg-indigo-600 text-white shadow':'bg-slate-100 text-slate-600 hover:bg-slate-200'}"><i class="fa-solid fa-address-book mr-1"></i> 名單及聯絡 (批量)</button>
          <button onclick="app.switchStaffTab('job_duties')" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${this.staffSubTab==='job_duties'?'bg-indigo-600 text-white shadow':'bg-slate-100 text-slate-600 hover:bg-slate-200'}"><i class="fa-solid fa-clipboard-list mr-1"></i> 職務大綱（2026 人名／年份）</button>
        </div>
        <div id="staff-tab-org_chart" class="${this.staffSubTab==='org_chart'?'':'hidden'}"></div>
        <div id="staff-tab-contacts" class="${this.staffSubTab==='contacts'?'':'hidden'}"></div>
        <div id="staff-tab-job_duties" class="${this.staffSubTab==='job_duties'?'':'hidden'}"></div>
      </div>
    `;
    // Render sub tabs
    this.renderOrgChartTree();
    this.renderStaffContacts();
    this.renderStaffJobDuties();
  }
,
  switchStaffTab(tab){
    this.staffSubTab=tab;
    document.querySelectorAll('[id^="staff-tab-"]').forEach(el=>el.classList.add('hidden'));
    document.getElementById('staff-tab-'+tab)?.classList.remove('hidden');
    // update button styles
    document.querySelectorAll('[onclick^="app.switchStaffTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      if(t===tab) btn.className='px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-indigo-600 text-white shadow';
      else btn.className='px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200';
    });
  }
,
  renderOrgChartTree(){
    const container=document.getElementById('staff-tab-org_chart');
    if(!container) return;
    const data=this.getStaffData();
    const org=data.org_chart||[];
    const isAdmin=this.isAdmin();
    const isExec=this.isExecViceOrChair();
    const myLvl=(ROLE_HIERARCHY[this.currentUser?.role]||0);
    const canAddNode=myLvl>=60 || isAdmin || isExec; // vice_chair or above
    // Build groups
    const groups={};
    org.forEach(node=>{
      const g=node.group||'未分組';
      if(!groups[g]) groups[g]=[];
      groups[g].push(node);
    });
    // Sort each group by level_num
    Object.keys(groups).forEach(g=>{ groups[g].sort((a,b)=>a.level_num-b.level_num); });
    // Build tree HTML
    let html=`<div class="space-y-4">
      <div class="flex flex-wrap gap-2">
        ${isAdmin||isExec?`<button onclick="app.openOrgNodeForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增頂級崗位 (主席/顧問)</button>`:''}
        <button onclick="app.exportStaffData('org_chart')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button>
        ${canAddNode||isAdmin||isExec?`<button onclick="app.downloadStaffTemplate('org')" class="bg-slate-100 border px-3 py-2 rounded-xl text-xs font-bold">下載範本 CSV</button>
        <label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"><i class="fa-solid fa-upload mr-1"></i>上傳 CSV／組織圖檔案<input type="file" accept=".csv,.json" class="hidden" onchange="app.handleStaffFileUpload(this.files[0],'org_chart')"></label>`:''}
        ${(data.staff_source)?`<button onclick="app.syncOrgChartFromDrive()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步最新架構 (Google Sheet)</button>`:''}
      </div>
      ${(data.staff_source)?`<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-800 leading-relaxed"><i class="fa-solid fa-sync mr-1"></i><b>內置讀取：</b>組織架構直接讀取「${escapeHtml(data.staff_source.name||'Google Sheet')}」（行政組在該試算表更新職位／人名），APP 開啟即自動同步最新資料，也可按上方「同步最新架構」手動更新。</div>`:''}
      <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-[11px] leading-relaxed text-indigo-950 shadow-sm">
        <div class="font-bold text-[13px] text-indigo-900 mb-1.5 flex items-center"><i class="fa-solid fa-sitemap mr-2 text-indigo-600"></i>組織架構樹形圖 (各副主席可新增下屬)</div>
        • <b>顧問團是兩人、兩行：黃偉安；何家騏</b>（審核活動目的、政策指導與主禮嘉賓確認）<br>
        • <b>樹形圖層級（已更新）：</b> L1=顧問／主席／秘書處, L2=執行副主席, L3=副主席層 (各副主席可新增下屬崗位及人名), L4=總主任, L5=主任, L6=工作人員<br>
        • <b>副主席權限：</b>各副主席可於自己組別下點擊「+ 新增下屬」或「+ 新增崗位」，為所屬組別新增下屬崗位及人名；行政副主席、執行副主席或主席可修改全部
      </div>
      <div class="bg-white border rounded-2xl p-4">
        <h4 class="font-bold text-sm mb-3"><i class="fa-solid fa-sitemap text-indigo-600 mr-2"></i>組織架構樹形圖 (各副主席可新增下屬)</h4>
        <div class="space-y-6">`;
    // For each group, render as tree
    const groupOrder=['顧問團','主席及執行副主席','行政組','會操及典禮組','主題節目組','品牌推廣組','嘉賓接待組','協調組','服務及發展組','秘書處'];
    Object.keys(groups).sort((a,b)=>(groupOrder.indexOf(a)<0?999:groupOrder.indexOf(a))-(groupOrder.indexOf(b)<0?999:groupOrder.indexOf(b))).forEach(groupName=>{
      const nodes=groups[groupName];
      const isMyGroup=normalizeGroupName(this.currentUser?.group_name)===normalizeGroupName(groupName);
      const canGroupAdd=isAdmin||isExec||(canAddNode && isMyGroup);
      html+=`<div class="border border-slate-200 rounded-xl p-3 bg-slate-50">
        <div class="flex justify-between items-center mb-2 flex-wrap gap-2"><div class="font-bold text-[13px] flex items-center"><i class="fa-solid fa-people-group text-indigo-600 mr-2"></i>${escapeHtml(groupName)} <span class="ml-2 bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full">${nodes.length} 崗位</span></div><div class="flex gap-1">${canGroupAdd?`<button onclick="app.openOrgNodeForm('${escapeHtml(groupName)}')" class="bg-white border hover:bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl text-[11px] font-bold">+ 新增崗位</button>`:''}</div></div>
        <div class="space-y-2">`;
      // Build hierarchy: for each level, indent
      nodes.forEach(node=>{
        const canEdit=isAdmin||isExec||(canAddNode && isMyGroup);
        const canDelete=isAdmin||isExec||(canAddNode && isMyGroup);
        const canAddSub=isAdmin||isExec||(canAddNode && isMyGroup);
        const levelColor={0:'bg-slate-950 text-white',1:'bg-slate-900 text-white',2:'bg-purple-700 text-white',3:'bg-indigo-600 text-white',4:'bg-sky-600 text-white',5:'bg-emerald-600 text-white',6:'bg-amber-600 text-white'}[node.level_num]||'bg-slate-200';
        const parentNode=node.parent_id?nodes.find(p=>p.id===node.parent_id):null;
        const indentMargin=Math.max(0, (node.level_num-1)*16);
        html+=`<div class="flex gap-2 items-start bg-white border rounded-xl p-3" style="margin-left:${indentMargin}px">
          <div class="w-10 h-10 rounded-xl ${levelColor} flex items-center justify-center text-[12px] font-bold flex-shrink-0">L${node.level_num}</div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <b class="text-[13px]">${escapeHtml(node.title)}</b>
              <span class="text-[11px] text-slate-500">${escapeHtml(node.level||node.group||'')}</span>
              ${orgNameList(node.names).map(nm=>`<span class="bg-slate-900 text-white text-[11px] px-2 py-0.5 rounded-full font-medium">${escapeHtml(nm)}</span>`).join("")}
            </div>
            ${parentNode?`<div class="text-[10px] text-indigo-600 font-semibold mt-0.5"><i class="fa-solid fa-arrow-turn-up fa-rotate-90 mr-1"></i>上級崗位：${escapeHtml(parentNode.title)} (${escapeHtml(parentNode.names||'待定')})</div>`:''}
            <div class="text-[11px] text-slate-600 mt-1 leading-relaxed">${escapeHtml(node.desc||'暫無描述')}</div>
            <div class="mt-2 flex flex-wrap gap-1">
              ${canEdit?`<button onclick="app.openOrgNodeForm('${escapeHtml(groupName)}','${node.id}')" class="bg-white border hover:bg-slate-50 px-2 py-1 rounded-xl text-[10px] font-bold">✏️ 編輯</button>`:''}
              ${canDelete?`<button onclick="app.deleteOrgNode('${node.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px] font-bold">🗑️ 刪除</button>`:''}
              ${canAddSub?`<button onclick="app.openOrgNodeForm('${escapeHtml(groupName)}',null,'${node.id}')" class="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-1 rounded-xl text-[10px] font-bold">+ 新增下屬</button>`:''}
            </div>
          </div>
        </div>`;
      });
      html+=`</div></div>`;
    });
    html+=`</div></div>
      <div class="bg-white border rounded-xl p-3 text-[11px] text-slate-500"><b>樹形圖說明（已更新編號）：</b> L1=顧問（黃偉安／何家騏 各佔一行）／主席／秘書處, L2=執行副主席, L3=副主席層 (可新增下屬), L4=總主任, L5=主任, L6=工作人員。行政副主席、執行副主席、主席可修改全部；各副主席可新增自己組別下的崗位及人名。點擊「新增下屬」可自動關聯上級崗位。</div>
    </div>`;
    container.innerHTML=html;
  }
,
  isExecViceOrChair(){
    const role=this.currentUser?.role;
    const group=normalizeGroupName(this.currentUser?.group_name);
    return ['super_admin','admin','chairperson','advisor','executive_vice_chairperson'].includes(role)
      || (role==='vice_chairperson' && group==='主席及執行副主席');
  }
,
  openOrgNodeForm(groupName='', editId=null, parentId=null){
    if(!this.isAdmin() && (ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isExecViceOrChair()){ showToast('僅副主席或以上可新增崗位','error'); return; }
    const data=this.getStaffData();
    const existing=editId?data.org_chart.find(n=>n.id===editId):null;
    const parentNode=parentId?data.org_chart.find(n=>n.id===parentId):null;
    const targetGroup=normalizeGroupName(existing?.group || (existing?this.parseGroupFromLevel(existing.level):'') || groupName || parentNode?.group || (parentNode?this.parseGroupFromLevel(parentNode.level):''));
    const groupNodes=data.org_chart.filter(n=>normalizeGroupName(n.group || this.parseGroupFromLevel(n.level))===(targetGroup||''));
    // 新編號：L1=顧問/主席/秘書處、L2=執行副主席、L3=副主席、L4=總主任、L5=主任、L6=工作人員；新增下屬預設比上級低一級
    const defaultLevel=existing?existing.level_num:(parentNode?Math.min(6, (parentNode.level_num||2)+1):4);
    const title=existing?'編輯崗位':(parentNode?`新增下屬崗位（上級：${parentNode.title} ${parentNode.names?`— ${parentNode.names}`:''}）`:'新增崗位');
    const selParentId=existing?.parent_id||parentId||'';

    let html=`<div class="space-y-3">
      <input type="hidden" id="org-form-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="org-form-id" value="${existing?.id||''}">
      <div><label class="text-[11px] font-bold">所屬組別 *</label><input id="org-group" value="${escapeHtml(targetGroup)}" placeholder="例如 主題節目組" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">職級 Level *</label><select id="org-level-num" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1">
          <option value="1" ${defaultLevel===1?'selected':''}>Level 1 顧問／主席／秘書處</option>
          <option value="2" ${defaultLevel===2?'selected':''}>Level 2 執行副主席</option>
          <option value="3" ${defaultLevel===3?'selected':''}>Level 3 副主席</option>
          <option value="4" ${defaultLevel===4?'selected':''}>Level 4 總主任</option>
          <option value="5" ${defaultLevel===5?'selected':''}>Level 5 主任</option>
          <option value="6" ${defaultLevel===6?'selected':''}>Level 6 工作人員</option>
        </select></div>
        <div><label class="text-[11px] font-bold">職銜 *</label><input id="org-title" value="${escapeHtml(existing?.title||'')}" placeholder="例如 總主任（主題節目）" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      </div>
      <div><label class="text-[11px] font-bold">人名 (多人名用 、 或 / 分隔)</label><input id="org-names" value="${escapeHtml(existing?.names||'')}" placeholder="例如 周恒晉 / 仇紹謙" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div><label class="text-[11px] font-bold">職務描述</label><textarea id="org-desc" rows="3" placeholder="職務大綱..." class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.desc||'')}</textarea></div>
      <div><label class="text-[11px] font-bold">上級崗位（樹形關聯）</label>
        <select id="org-parent-id" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1">
          <option value="">(無上級 / 頂級崗位)</option>
          ${groupNodes.filter(n=>!existing||n.id!==existing.id).map(n=>`<option value="${escapeHtml(n.id)}" ${selParentId===n.id?'selected':''}>${escapeHtml(n.title)} (L${n.level_num}${n.names?` - ${n.names}`:''})</option>`).join('')}
        </select>
      </div>
      <div class="text-[10px] text-slate-500">各副主席可新增/管理自己組別下崗位；行政副主席、執行副主席、主席可修改全部</div>
    </div>`;
    // Use generic modal-record to show form
    document.getElementById('record-modal-title').textContent=title+' (樹形圖)';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitOrgNodeForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitOrgNodeForm(){
    const mode=document.getElementById('org-form-mode').value;
    const id=document.getElementById('org-form-id').value;
    const group=document.getElementById('org-group').value.trim();
    const level_num=parseInt(document.getElementById('org-level-num').value);
    const title=document.getElementById('org-title').value.trim();
    const names=document.getElementById('org-names').value.trim();
    const desc=document.getElementById('org-desc').value.trim();
    const parent_id=document.getElementById('org-parent-id').value.trim();
    if(!group||!title){ showToast('請填寫組別和職銜','error'); return; }
    const data=this.getStaffData();
    if(mode==='edit'){
      const idx=data.org_chart.findIndex(n=>n.id===id);
      if(idx>=0){ data.org_chart[idx]={...data.org_chart[idx],group,level:`${group} (Level ${level_num})`,level_num,title,names,desc,parent_id}; }
    }else{
      data.org_chart.push({id:'org_'+Date.now(),level:`${group} (Level ${level_num})`,level_num,group,title,names,desc,parent_id,created_at:new Date().toISOString()});
    }
    this.saveStaffData(data);
    this.closeModal('modal-record');
    // restore original form handler
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新崗位':'已新增崗位 (樹形)','success');
    this.renderOrgChartTree();
  }
,
  deleteOrgNode(id){
    if(!this.isAdmin() && !this.isExecViceOrChair()){
      const data=this.getStaffData();
      const node=data.org_chart.find(n=>n.id===id);
      const myGroup=normalizeGroupName(this.currentUser?.group_name);
      const myLvl=ROLE_HIERARCHY[this.currentUser?.role]||0;
      if(!(myLvl>=60 && node && normalizeGroupName(node.group)===myGroup)){
        showToast('僅行政副主席/執行副主席/主席可刪除全部，副主席可刪自己組','error'); return;
      }
    }
    if(!confirm('確定刪除此崗位？下屬崗位將變為頂級，需手動重新關聯')) return;
    const data=this.getStaffData();
    data.org_chart=data.org_chart.filter(n=>n.id!==id);
    // also remove parent references
    data.org_chart.forEach(n=>{ if(n.parent_id===id) n.parent_id=null; });
    this.saveStaffData(data);
    showToast('已刪除崗位','warning');
    this.renderOrgChartTree();
  }
,
  canManageStaffContacts(){
    if(!this.currentUser) return false;
    const lvl=this.roleLevel(this.currentUser.role); const g=this.currentUser.group_name||'';
    return this.isAdmin()||this.isExecViceOrChair()||lvl>=40||g.includes('行政');
  }
,
  staffSortKey(person){
    const role=String(person.role_title||person.title||'');
    const group=String(person.group_name||person.group||'');
    const top=group.includes('顧問')?0:group.includes('主席')||group.includes('籌委')?1:2;
    const rank=/副主席/.test(role)?0:/總主任/.test(role)?1:/主任/.test(role)?2:3;
    return top*10+rank;
  }
,
  renderStaffContacts(){
    const container=document.getElementById('staff-tab-contacts');
    if(!container) return;
    const data=this.getStaffData();
    const contacts=(data.contacts||[]).slice().sort((a,b)=>this.staffSortKey(a)-this.staffSortKey(b));
    const loggedIn=!!this.currentUser;
    const canManage=this.canManageStaffContacts();
    container.innerHTML=`
      <div class="space-y-4">
        ${!loggedIn?`<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex flex-wrap items-center gap-2 justify-between"><span><i class="fa-solid fa-lock mr-1"></i><b>聯絡資料受保護：</b>姓名、職銜、組別公開可看；電話及 Email 需登入後才顯示（請按右上角「登入」）。</span></div>`:''}
        <div class="flex flex-wrap gap-2">
          ${canManage?`<button onclick="app.syncOrgChartFromDrive()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步最新架構 (Google Sheet)</button>
          <label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">⬆️ 上傳 Excel 名單<input type="file" accept=".xlsx,.xls" class="hidden" onchange="app.handleStaffExcelUpload(this.files[0])"></label>
          <button onclick="app.openStaffFormModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>單欄新增</button>
          <button onclick="app.downloadStaffTemplate('contacts')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載範本 CSV</button>
          <label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"><i class="fa-solid fa-upload mr-1"></i>上傳 CSV/JSON<input type="file" accept=".csv,.json" class="hidden" onchange="app.handleStaffFileUpload(this.files[0],'contacts')"></label>`:''}
          ${loggedIn?`<button onclick="app.exportStaffData('contacts')" class="bg-slate-100 border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button>`:''}
          <input id="staff-search" placeholder="${loggedIn?'搜尋姓名/組別/電話':'搜尋姓名/組別/職務'}" oninput="app.filterStaffContacts()" class="px-3 py-2 border rounded-xl text-xs flex-1 min-w-[180px]">
        </div>
        ${(data.staff_source)?this.driveSyncNotice():''}
        ${(data.contact_source)?`<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900">📞 聯絡表已連通：「${escapeHtml(data.contact_source.name||'聯絡表 2026')}」（gid ${escapeHtml(String(data.contact_source.gid||''))}）。行政組在該分頁更新電話／電郵後，APP 開啟即自動同步。 ${canManage?`<button onclick="app.syncContactListFromDrive()" class="ml-1 underline font-bold">立即同步</button>`:''}</div>`:''}
        ${(data.staff_source && loggedIn && !data.contact_source)?`<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-sky-900">👥 名單來源：「${escapeHtml(data.staff_source.name||'Org Chart')}」由行政組在 Google Sheet 更新。</div>`:''}
        <div class="bg-white border rounded-xl overflow-hidden"><div class="table-responsive"><table class="min-w-full text-sm"><thead class="bg-slate-100 font-bold"><tr><th class="px-3 py-2 text-left">組別</th><th class="px-3 py-2 text-left">級別</th><th class="px-3 py-2 text-left">職位</th><th class="px-3 py-2 text-left">姓名</th><th class="px-3 py-2 text-left">電話</th><th class="px-3 py-2 text-left">電郵</th>${canManage?'<th class="px-3 py-2 text-right">操作</th>':''}</tr></thead><tbody id="staff-contacts-tbody" class="divide-y bg-white"></tbody></table></div></div>
        <div id="staff-contacts-cards" class="grid grid-cols-1 md:grid-cols-2 gap-3 md:hidden"></div>
      </div>
    `;
    this.filterStaffContacts();
  }
,
  filterStaffContacts(){
    const q=(document.getElementById('staff-search')?.value||'').toLowerCase();
    const data=this.getStaffData();
    const loggedIn=!!this.currentUser;
    const canManage=this.canManageStaffContacts();
    // 未登入：不以電話欄位搜尋（避免藉搜尋反查電話）
    let list=data.contacts||[];
    if(q) list=list.filter(c=> (loggedIn?(c.name+c.role_title+c.group_name+(c.level||'')+c.contact+(c.email||'')+c.job_desc):(c.name+c.role_title+c.group_name+(c.level||'')+c.job_desc)).toLowerCase().includes(q));
    const phoneCell=(c,cls)=>loggedIn?`<span class="${cls||''}">${escapeHtml(c.contact||'—')}</span>`:`<span class="bg-slate-100 border text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap" title="登入後可見"><i class="fa-solid fa-lock mr-0.5"></i>登入可見</span>`;
    const emailCell=(c)=>loggedIn?`<span class="font-mono text-[11px]">${escapeHtml(c.email||'—')}</span>`:`<span class="bg-slate-100 border text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap" title="登入後可見"><i class="fa-solid fa-lock mr-0.5"></i>登入可見</span>`;
    const tbody=document.getElementById('staff-contacts-tbody');
    const cards=document.getElementById('staff-contacts-cards');
    if(tbody) tbody.innerHTML=list.map(c=>`<tr class="hover:bg-slate-50"><td class="px-3 py-2" data-label="組別">${escapeHtml(c.group_name||'')}</td><td class="px-3 py-2" data-label="級別">${escapeHtml(c.level||'')}</td><td class="px-3 py-2" data-label="職位">${escapeHtml(c.role_title||'')}</td><td class="px-3 py-2 font-bold" data-label="姓名">${escapeHtml(c.name||'（待定）')}</td><td class="px-3 py-2 font-mono text-sky-700" data-label="電話">${phoneCell(c)}</td><td class="px-3 py-2" data-label="電郵">${emailCell(c)}</td>${canManage?`<td class="px-3 py-2 text-right" data-label="操作"><div class="flex gap-1 justify-end"><button onclick="app.openStaffFormModal('${c.id}')" class="bg-white border px-2 py-1 rounded-xl text-[11px]">✏️</button><button onclick="app.deleteStaffContact('${c.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[11px]">🗑️</button></div></td>`:''}</tr>`).join('') || `<tr><td colspan="${canManage?7:6}" class="px-3 py-4 text-center text-slate-400">無符合條件</td></tr>`;
    if(cards) cards.innerHTML=list.map(c=>`<div class="border rounded-xl p-3 bg-white"><div class="flex justify-between"><div><b>${escapeHtml(c.name||'（待定）')}</b> <span class="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full">${escapeHtml(c.role_title||'')}</span><div class="text-[11px] text-slate-500 mt-1">${escapeHtml(c.group_name||'')} ${c.level?('· '+escapeHtml(c.level)):''} | ${phoneCell(c)}</div><div class="text-[11px] text-slate-600 mt-1">${emailCell(c)}</div></div>${canManage?`<div class="flex flex-col gap-1"><button onclick="app.openStaffFormModal('${c.id}')" class="bg-white border px-2 py-1 rounded-xl text-[11px]">✏️</button><button onclick="app.deleteStaffContact('${c.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[11px]">🗑️</button></div>`:''}</div></div>`).join('');
  }
,
  openStaffFormModal(id=null){
    if(!this.canManageStaffContacts()){ showToast(this.currentUser?'你無權限修改名單':'請先登入（名單管理需總主任以上/行政組）','warning'); if(!this.currentUser) this.openLoginModal(); return; }
    const data=this.getStaffData();
    const existing=id?data.contacts.find(c=>c.id===id):null;
    const title=existing?'編輯工作人員':'新增工作人員 (單欄)';
    let html=`<input type="hidden" id="staff-form-mode" value="${existing?'edit':'create'}"><input type="hidden" id="staff-form-id" value="${existing?.id||''}">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">姓名 *</label><input id="staff-name" value="${escapeHtml(existing?.name||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">職銜 *</label><input id="staff-role" value="${escapeHtml(existing?.role_title||'')}" placeholder="例如 總主任" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">組別 *</label><input id="staff-group" value="${escapeHtml(existing?.group_name||'')}" placeholder="例如 主題節目組" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">電話</label><input id="staff-contact" value="${escapeHtml(existing?.contact||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">職務描述</label><textarea id="staff-job-desc" rows="2" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.job_desc||'')}</textarea></div>
        <div><label class="text-[11px] font-bold">Email</label><input id="staff-email" value="${escapeHtml(existing?.email||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">小隊</label><input id="staff-squad" value="${escapeHtml(existing?.squad||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      </div>`;
    document.getElementById('record-modal-title').textContent=title;
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitStaffForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitStaffForm(){
    if(!this.canManageStaffContacts()){ showToast('無權限修改名單','error'); return; }
    const mode=document.getElementById('staff-form-mode').value;
    const id=document.getElementById('staff-form-id').value;
    const obj={
      id: id||'contact_'+Date.now(),
      name:document.getElementById('staff-name').value.trim(),
      role_title:document.getElementById('staff-role').value.trim(),
      group_name:document.getElementById('staff-group').value.trim(),
      contact:document.getElementById('staff-contact').value.trim(),
      job_desc:document.getElementById('staff-job-desc').value.trim(),
      email:document.getElementById('staff-email')?.value.trim()||'',
      squad:document.getElementById('staff-squad')?.value.trim()||''
    };
    if(!obj.name||!obj.role_title||!obj.group_name){ showToast('請填寫姓名、職銜、組別','error'); return; }
    const data=this.getStaffData();
    if(mode==='edit'){
      const idx=data.contacts.findIndex(c=>c.id===id);
      if(idx>=0) data.contacts[idx]={...data.contacts[idx],...obj};
    }else data.contacts.push(obj);
    this.saveStaffData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新工作人員':'已新增工作人員','success');
    this.renderStaffContacts();
  }
,
  deleteStaffContact(id){
    if(!this.isAdmin() && !this.isExecViceOrChair()){ showToast('僅管理員或副主席以上可刪除','error'); return; }
    if(!confirm('確定刪除此工作人員？')) return;
    const data=this.getStaffData();
    data.contacts=data.contacts.filter(c=>c.id!==id);
    this.saveStaffData(data);
    showToast('已刪除','warning');
    this.renderStaffContacts();
  }
,
  downloadStaffTemplate(type){
    let csv='', filename='';
    if(type==='contacts'){
      csv='name,role_title,group_name,contact,job_desc,email,squad\n朱家聰,主席,主席及執行副主席,,全域統籌與會議主持,chair@isd.local,\n袁可秀,執行副主席,主席及執行副主席,,行政、秘書處與財政審批,execvp@isd.local,\n';
      filename='staff_contacts_template.csv';
    }else if(type==='org'){
      csv='group,level_num,title,names,desc,parent_id\n主題節目組,3,副主席,周恒晉,統籌攤位遊戲、遊戲卡、樂隊,\n主題節目組,4,總主任（主題節目）,仇紹謙,帶領5位節目主任,\n主題節目組,5,節目主任 (1),何令勤,執行遊戲攤位與挑戰站,org_xxxx\n';
      filename='staff_org_template.csv';
    }else{
      csv='group,duty\n行政組,1. 擬訂財政指引及會計程序；\\n2. 開設活動檔案；\\n3. 統籌保險及秘書處\n會操及典禮組,1. 擬訂會操及典禮流程；\\n2. 統籌優異旅團獎勵\n';
      filename='staff_duties_template.csv';
    }
    const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); showToast('已下載範本 '+filename,'success');
  }
,
  handleStaffFileUpload(file, type){
    if(!file){ showToast('請選擇檔案','warning'); return; }
    // 名單(含聯絡資料)上傳需管理權；架構圖上傳需副主席以上（與介面按鈕一致）
    if(type==='contacts' && !this.canManageStaffContacts()){ showToast('無權限上傳名單','error'); return; }
    if(type==='org_chart' && (ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isAdmin() && !this.isExecViceOrChair()){ showToast('僅副主席以上/管理員可上傳架構','error'); return; }
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const text=e.target.result;
        let parsed=[];
        if(file.name.endsWith('.json')){
          const json=JSON.parse(text);
          parsed=Array.isArray(json)?json:(json.contacts||json.org_chart||json.job_duties||[json]);
        }else{
          // CSV
          const rows=parseCSV(text);
          if(type==='contacts'){
            parsed=rows.map(r=>({id:'contact_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),name:r.name||r.姓名||'',role_title:r.role_title||r.role||r.職銜||'',group_name:r.group_name||r.group||r.組別||'',contact:r.contact||r.phone||r.電話||'',job_desc:r.job_desc||r.duty||r.職務||'',email:r.email||'',squad:r.squad||''})).filter(r=>r.name);
          }else if(type==='org_chart'){
            parsed=rows.map(r=>({id:'org_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),group:r.group||r.組別||'',level_num:parseInt(r.level_num||r.Level||3),level:`${r.group||''} (Level ${r.level_num||3})`,title:r.title||r.職銜||'',names:r.names||r.姓名||r.name||'',desc:r.desc||r.描述||r.duty||'',parent_id:r.parent_id||''})).filter(r=>r.title);
          }else if(type==='job_duties'){
            parsed=rows.map(r=>({id:'duty_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),group:r.group||r.組別||'',duty:r.duty||r.職務||r.duty||''})).filter(r=>r.group);
          }
        }
        if(!parsed.length){ showToast('文件無有效資料','error'); return; }
        const data=this.getStaffData();
        // v8.9：上傳改為「同 key 覆蓋、新 key 先追加」（upsert）。
        // 以前係無條件 append，秘書處重送同一份檔案就會令名單／職務大綱／崗位各多一倍。
        const keyOf=type==='contacts'?contactKey:(type==='job_duties'?dutyKey:orgNodeKey);
        const base=type==='contacts'?data.contacts:(type==='job_duties'?data.job_duties:data.org_chart);
        const before=(base||[]).length;
        const merged=[...parsed,...(base||[])];
        const uniq=type==='job_duties'?dropContainedDuties(dedupeByKey(merged,dutyKey)):(type==='org_chart'?dedupeOrgNodes(merged,null,true):dedupeByKey(merged,keyOf));
        if(type==='contacts') data.contacts=uniq;
        else if(type==='job_duties') data.job_duties=uniq;
        else data.org_chart=uniq;
        this.saveStaffData(data);
        const added=uniq.length-before;
        showToast(`已寫入 ${type}：更新 ${parsed.length-Math.max(0,added)} 筆、新增 ${Math.max(0,added)} 筆${added<parsed.length?'（同一崗位／同一組別內容已覆蓋舊行，唔會重複追加）':''}`,'success');
        if(type==='contacts') this.renderStaffContacts();
        else if(type==='org_chart') this.renderOrgChartTree();
        else if(type==='job_duties') this.renderStaffJobDuties();
      }catch(err){ showToast('解析失敗: '+err.message,'error'); }
    };
    if(file.name.endsWith('.json')||file.type.includes('csv')||file.name.endsWith('.csv')) reader.readAsText(file);
    else reader.readAsText(file);
  }
,
  exportStaffData(type){
    // 聯絡名單含電話/Email：需登入才能匯出；組織架構/職務大綱公開可匯出
    if(type==='contacts' && !this.currentUser){ showToast('聯絡資料需登入後才能匯出','warning'); this.openLoginModal(); return; }
    const data=this.getStaffData();
    let exportData=data[type]||data.contacts;
    const blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`staff_${type}_${todayISO()}.json`; a.click(); showToast('已匯出 JSON','success');
  }
,
  renderStaffJobDuties(){
    const container=document.getElementById('staff-tab-job_duties');
    if(!container) return;
    const data=this.getStaffData();
    const duties=data.job_duties||[];
    const isAdmin=this.isAdmin();
    const canEdit=isAdmin||this.isExecViceOrChair()||(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60; // 副主席以上可改
    container.innerHTML=`
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          ${canEdit?`<button onclick="app.openJobDutyFormModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增職務大綱</button>`:''}
          <button onclick="app.downloadStaffTemplate('duties')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載範本 CSV</button>
          <label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"><i class="fa-solid fa-file-word mr-1"></i>上傳 Word 轉 JSON<input type="file" accept=".docx,.doc" class="hidden" onchange="app.handleWordUpload(this.files[0])"></label>
          <label class="bg-slate-100 border px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"><i class="fa-solid fa-upload mr-1"></i>上傳 CSV/JSON<input type="file" accept=".csv,.json" class="hidden" onchange="app.handleStaffFileUpload(this.files[0],'job_duties')"></label>
          <button onclick="app.exportStaffData('job_duties')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
          <b>Word 上傳轉 JSON 說明：</b><br>
          管理員可上傳 .docx 檔 (例如各組職務大綱 Word)，系統用 mammoth.js 自動解析文字，再轉成 JSON 寫入後端，所有人前端可觀看。行政副主席、執行副主席或主席以上可在前端直接修改，完成後儲存同步後端。
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${duties.map(d=>`
          <div class="border rounded-xl p-4 bg-white space-y-2">
            <div class="flex justify-between items-start"><div class="font-bold text-[13px] flex items-center"><i class="fa-solid fa-people-group text-indigo-600 mr-2"></i>${escapeHtml(d.group)}</div><div class="flex gap-1">${canEdit?`<button onclick="app.openJobDutyFormModal('${d.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️ 編輯</button>`:''}${isAdmin?`<button onclick="app.deleteJobDuty('${d.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`:''}</div></div>
            <div class="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 border rounded-xl p-2.5">${escapeHtml(d.duty)}</div>
            ${d.file_name?`<div class="text-[10px] text-slate-500"><i class="fa-solid fa-file-word text-sky-600 mr-1"></i>${escapeHtml(d.file_name)} ${d.updated_by?`· ${escapeHtml(d.updated_by)}`:''}</div>`:''}${d.file_url?`<a href="${escapeHtml(d.file_url)}" target="_blank" class="text-[10px] text-sky-700 underline">開啟工作大綱原文 ↗</a>`:''}
          </div>
        `).join('') || '<p class="text-xs text-slate-400 py-4 text-center col-span-2">暫無職務大綱，請上傳 Word 或新增</p>'}</div>
      </div>
    `;
  }
,
  openJobDutyFormModal(id=null){
    if(!(this.isAdmin()||this.isExecViceOrChair()||(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60)){ showToast('僅行政副主席/執行副主席/主席或副主席以上可修改','error'); return; }
    const data=this.getStaffData();
    const existing=id?data.job_duties.find(d=>d.id===id):null;
    let html=`<input type="hidden" id="duty-form-mode" value="${existing?'edit':'create'}"><input type="hidden" id="duty-form-id" value="${existing?.id||''}">
      <div><label class="text-[11px] font-bold">組別 *</label><input id="duty-group" value="${escapeHtml(existing?.group||'')}" placeholder="例如 行政組" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">職務大綱 *</label><textarea id="duty-text" rows="8" placeholder="每行一項，可貼上 Word 解析後的文字..." class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.duty||'')}</textarea></div>
      <div class="text-[10px] text-slate-500 mt-2">主席/行政副主席/執行副主席可修改全部，完成後按「儲存」先會記錄</div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯職務大綱':'新增職務大綱';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitJobDutyForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitJobDutyForm(){
    const mode=document.getElementById('duty-form-mode').value;
    const id=document.getElementById('duty-form-id').value;
    const group=document.getElementById('duty-group').value.trim();
    const duty=document.getElementById('duty-text').value.trim();
    if(!group||!duty){ showToast('請填寫組別和職務','error'); return; }
    const data=this.getStaffData();
    if(mode==='edit'){
      const idx=data.job_duties.findIndex(d=>d.id===id);
      if(idx>=0) data.job_duties[idx]={...data.job_duties[idx],group,duty,updated_by:this.currentUser?.name||'',updated_at:new Date().toISOString()};
    }else data.job_duties.push({id:'duty_'+Date.now(),group,duty,updated_by:this.currentUser?.name||'',updated_at:new Date().toISOString()});
    this.saveStaffData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('職務大綱已保存','success');
    this.renderStaffJobDuties();
  }
,
  deleteJobDuty(id){
    if(!this.isAdmin()){ showToast('僅管理員可刪除','error'); return; }
    if(!confirm('確定刪除此職務大綱？')) return;
    const data=this.getStaffData();
    data.job_duties=data.job_duties.filter(d=>d.id!==id);
    this.saveStaffData(data);
    this.renderStaffJobDuties();
    showToast('已刪除','warning');
  }
,
  async handleWordUpload(file){
    if(!file){ showToast('請選擇 Word 檔','warning'); return; }
    if(!file.name.endsWith('.docx') && !file.name.endsWith('.doc')){ showToast('請上傳 .docx Word 檔 (支援 mammoth 解析)','error'); return; }
    const overlay=document.getElementById('savingOverlay');
    overlay.classList.add('active');
    document.getElementById('savingText').textContent='正在解析 Word 檔...';
    try{
      const arrayBuffer=await file.arrayBuffer();
      const result=await mammoth.extractRawText({arrayBuffer});
      const text=result.value||'';
      if(!text.trim()){ showToast('Word 解析結果為空，請檢查檔案','error'); return; }
      // Try to split into groups: Assume file contains sections like "行政組" etc. Simple parse: split by group keywords
      // For demo, we ask admin to edit after parse
      document.getElementById('savingText').textContent='解析完成，轉換中...';
      // Auto parse: if text contains multiple groups, split by known groups or by blank lines
      // Here we create one or multiple duties based on heuristics
      const groups=['顧問團','主席及執行副主席','行政組','會操及典禮組','主題節目組','品牌推廣組','協調組','接待組','財務組','秘書處'];
      const parsed=[];
      let currentGroup='未分組';
      let currentDuty='';
      const lines=text.split(/\r?\n/);
      // If file contains "組" keyword, try to detect group changes
      lines.forEach(line=>{
        const trimmed=line.trim();
        if(!trimmed) return;
        const foundGroup=groups.find(g=>trimmed.includes(g));
        if(foundGroup){
          if(currentDuty.trim()){
            parsed.push({id:'duty_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),group:currentGroup,duty:currentDuty.trim(),file_name:file.name,updated_by:this.currentUser?.name||'',updated_at:new Date().toISOString()});
            currentDuty='';
          }
          currentGroup=foundGroup;
          // If line contains duty after group, add remaining
          const after=trimmed.split(foundGroup)[1]?.replace(/[:：]/,'').trim();
          if(after) currentDuty+=after+'\\n';
        }else{
          currentDuty+=trimmed+'\\n';
        }
      });
      if(currentDuty.trim()) parsed.push({id:'duty_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),group:currentGroup,duty:currentDuty.trim(),file_name:file.name,updated_by:this.currentUser?.name||'',updated_at:new Date().toISOString()});
      if(!parsed.length) parsed.push({id:'duty_'+Date.now(),group:'未分組',duty:text.slice(0,2000),file_name:file.name,updated_by:this.currentUser?.name||'',updated_at:new Date().toISOString()});
      const data=this.getStaffData();
      data.job_duties=[...data.job_duties,...parsed];
      this.saveStaffData(data);
      showToast(`Word 解析成功，已轉 ${parsed.length} 筆職務大綱，按儲存後生效`,'success');
      this.renderStaffJobDuties();
      // Also open form for editing first parsed if needed
    }catch(err){
      console.error(err);
      showToast('Word 解析失敗: '+err.message+'，請改上傳 CSV/JSON','error');
    }finally{
      overlay.classList.remove('active');
      document.getElementById('savingText').textContent='正在寫入雲端...';
      document.getElementById('savingProgress').style.width='0%';
    }
  }
,
});
