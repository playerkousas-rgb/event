/* 40-souvenir-stamps.js — 紀念章派發 (Souvenir Stamp Distribution) v11-v12
   任務 5/6：支援 EXCEL 匯入
   ① 工作人員：姓名 組別 攤位(如有) 身份 備註(改名) + TICK + 列印
   ② 嘉賓：姓名 單位 職銜 + TICK
   儲存：localStorage + 後端 Souvenir_Stamps */
Object.assign(ScoutEventApp.prototype,{

  getSouvenirStampData(){
    const key=LS.souvenirStamps(this.currentEvent?.event_id||'isd_2026');
    try{
      const local=JSON.parse(localStorage.getItem(key)||'null');
      if(local&&typeof local==='object'){
        return {
          staff:local.staff||{},
          guests:local.guests||{},
          staff_custom:Array.isArray(local.staff_custom)?local.staff_custom:[],
          guests_custom:Array.isArray(local.guests_custom)?local.guests_custom:[]
        };
      }
    }catch(e){}
    return {staff:{},guests:{},staff_custom:[],guests_custom:[]};
  }
,
  saveSouvenirStampData(data, changed){
    const key=LS.souvenirStamps(this.currentEvent?.event_id||'isd_2026');
    const toSave={
      staff:data.staff||{},
      guests:data.guests||{},
      staff_custom:data.staff_custom||[],
      guests_custom:data.guests_custom||[]
    };
    localStorage.setItem(key,JSON.stringify(toSave));
    if(changed&&changed.row){
      // v12.2 防呆：TICK／備註只存本機＋入待儲存佇列，唔會即時打後端。
      // 使用者 TICK 完整個組別（幾十人）後，撳「💾 儲存到後端」先一次過批次寫入，避免逐 tick 打爆後端。
      this._stampSyncQueue=this._stampSyncQueue||new Map();
      this._stampSyncQueue.set(`${changed.scope}::${changed.key}`,{scope:changed.scope,key:changed.key,row:changed.row});
      this.markStampDirty();
    }
    if(changed&&changed.custom){
      this._stampCustomSyncQueue=this._stampCustomSyncQueue||new Map();
      this._stampCustomSyncQueue.set(changed.scope,{scope:changed.scope,custom:changed.custom});
      this.markStampDirty();
    }
  }
,
  // 有待儲存改動：更新所有紀念章頁面嘅「儲存」按鈕／狀態列
  markStampDirty(){
    const n=(this._stampSyncQueue?this._stampSyncQueue.size:0)+(this._stampCustomSyncQueue?this._stampCustomSyncQueue.size:0);
    document.querySelectorAll('[data-stamp-pending-count]').forEach(el=>{
      el.textContent=n;
      el.classList.toggle('hidden',n===0);
    });
    document.querySelectorAll('[data-stamp-sync-status]').forEach(el=>{
      el.dataset.stampSyncStatus=n?'dirty':'idle';
      el.innerHTML=n
        ?`<i class="fa-solid fa-circle-exclamation mr-1 text-amber-600"></i><span class="stamp-sync-text text-amber-700 font-bold">有 ${n} 項未儲存到後端</span>`
        :'<i class="fa-solid fa-cloud-arrow-up mr-1"></i><span class="stamp-sync-text">變更會先存本機，撳「儲存到後端」先同步</span>';
    });
  }
,
  setStampSyncStatus(state){
    document.querySelectorAll('[data-stamp-sync-status]').forEach(el=>{
      el.dataset.stampSyncStatus=state;
      el.innerHTML=state==='syncing'
        ?'<i class="fa-solid fa-cloud-arrow-up fa-spin mr-1"></i><span class="stamp-sync-text">儲存中…</span>'
        :state==='error'
        ?'<i class="fa-solid fa-triangle-exclamation mr-1 text-rose-600"></i><span class="stamp-sync-text text-rose-700 font-bold">部分儲存失敗，請再按儲存重試</span>'
        :state==='ok'
        ?'<i class="fa-solid fa-circle-check mr-1 text-emerald-600"></i><span class="stamp-sync-text text-emerald-700 font-bold">✅ 已全部儲存到後端</span>'
        :'<i class="fa-solid fa-cloud-arrow-up mr-1"></i><span class="stamp-sync-text">變更會先存本機，撳「儲存到後端」先同步</span>';
    });
  }
,
  // 手動儲存鍵：把所有未儲存嘅 TICK／備註／匯入名單一次過批次寫入後端
  async saveSouvenirStampsToBackend(scope){
    if(this.mockMode||!this.gasUrl){ showToast('示範模式（或未連後端）：紀錄已存本機','success'); return; }
    const n=(this._stampSyncQueue?this._stampSyncQueue.size:0)+(this._stampCustomSyncQueue?this._stampCustomSyncQueue.size:0);
    if(!n){ showToast('冇未儲存嘅變更','warning'); return; }
    const btns=document.querySelectorAll('[data-stamp-save-btn]');
    btns.forEach(b=>{ b.disabled=true; b.classList.add('opacity-60','pointer-events-none'); });
    this.setStampSyncStatus('syncing');
    showToast(`正在儲存 ${n} 項紀錄到後端…`,'success');
    await this.flushStampSync();
    const left=(this._stampSyncQueue?this._stampSyncQueue.size:0)+(this._stampCustomSyncQueue?this._stampCustomSyncQueue.size:0);
    btns.forEach(b=>{ b.disabled=false; b.classList.remove('opacity-60','pointer-events-none'); });
    document.querySelectorAll('[data-stamp-pending-count]').forEach(el=>{ el.textContent=left; el.classList.toggle('hidden',left===0); });
    if(left===0){ showToast('✅ 全部紀錄已儲存到後端','success'); this.setStampSyncStatus('ok'); }
    else { showToast(`⚠️ 仍有 ${left} 項儲存失敗，網絡恢復後再按「儲存到後端」（本機紀錄無丟失）`,'error'); this.setStampSyncStatus('error'); }
  }
,
  async flushStampSync(){
    if(this._stampSyncBusy) return; // 串行：上一批未完唔會開新一批
    if(this.mockMode||!this.gasUrl) return;
    if(!this._stampSyncQueue) this._stampSyncQueue=new Map();
    if(!this._stampCustomSyncQueue) this._stampCustomSyncQueue=new Map();
    if(!this._stampSyncQueue.size&&!this._stampCustomSyncQueue.size) return;
    // 快照本批要送嘅改動；儲存期間新 tick 會累積落 Map，下次按儲存再送
    const pending=[];
    this._stampSyncQueue.forEach((item,id)=>{ pending.push({type:'row',id,item}); });
    this._stampCustomSyncQueue.forEach((item,scope)=>{ pending.push({type:'custom',id:scope,item}); });
    this._stampSyncBusy=true;
    const delay=ms=>new Promise(r=>{ try{ setTimeout(r,ms); }catch(e){ r(); } });
    const stampPost=async (payload)=>{
      let err=null;
      for(let attempt=0;attempt<3;attempt++){
        try{
          const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload)});
          if(res&&res.ok) return true;
          err=new Error('HTTP '+(res&&res.status));
        }catch(e){ err=e; }
        if(attempt<2) await delay(400*(attempt+1));
      }
      throw err||new Error('sync failed');
    };
    let anyError=false;
    // 逐筆串行（唔同時開大量連線打爆後端）；成功就喺佇列刪走，失敗留返（再按儲存重試，本機紀錄唔會丟）
    for(const job of pending){
      try{
        if(job.type==='row'){
          const r=job.item.row;
          await stampPost({action:'saveRecord',api_key:this.apiKey,module:'Souvenir_Stamps',record:{stamp_id:`${job.item.scope}_${job.item.key}`,event_id:this.currentEvent?.event_id||'isd_2026',scope:job.item.scope,person_key:job.item.key,name:r.name||'',group_name:r.group_name||'',job_title:r.job_title||r.title||'',ticked:r.ticked?'Y':'',ticked_at:r.ticked_at||'',ticked_by:r.ticked_by||'',ticked_by_id:r.ticked_by_id||'',remark:r.remark||'',booth:r.booth||'',unit:r.unit||'',updated_at:r.updated_at||'',created_at:r.created_at||r.updated_at||''}});
        }else{
          await stampPost({action:'saveRecord',api_key:this.apiKey,module:'Souvenir_Stamps',record:{stamp_id:`${job.item.scope}_custom_${Date.now()}`,event_id:this.currentEvent?.event_id||'isd_2026',scope:job.item.scope+'_custom',person_key:'custom_batch',custom_data:JSON.stringify(job.item.custom||[]),updated_at:new Date().toISOString()}});
        }
        this._stampSyncQueue.delete(job.id);
        if(job.type==='custom') this._stampCustomSyncQueue.delete(job.id);
      }catch(e){ anyError=true; }
    }
    this._stampSyncBusy=false;
    if(anyError) this.setStampSyncStatus('error');
    else this.setStampSyncStatus('ok');
  }
,
  // 關閉／重新整理頁面前：若有未儲存 TICK，用 sendBeacon 逐筆盡量送出（本機已有備份，唔會丟）
  flushStampSyncBeforeUnload(){
    if(!this.gasUrl||this.mockMode) return;
    const q=this._stampSyncQueue||new Map();
    const cq=this._stampCustomSyncQueue||new Map();
    if(!q.size&&!cq.size) return;
    try{
      const send=rec=>{
        const blob=new Blob([JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Souvenir_Stamps',record:rec})],{type:'text/plain'});
        navigator.sendBeacon?navigator.sendBeacon(this.gasUrl,blob):null;
      };
      q.forEach(item=>{ const r=item.row; send({stamp_id:`${item.scope}_${item.key}`,event_id:this.currentEvent?.event_id||'isd_2026',scope:item.scope,person_key:item.key,name:r.name||'',group_name:r.group_name||'',job_title:r.job_title||r.title||'',ticked:r.ticked?'Y':'',ticked_at:r.ticked_at||'',ticked_by:r.ticked_by||'',ticked_by_id:r.ticked_by_id||'',remark:r.remark||'',booth:r.booth||'',unit:r.unit||'',updated_at:r.updated_at||'',created_at:r.created_at||r.updated_at||''}); });
      cq.forEach(item=>send({stamp_id:`${item.scope}_custom_${Date.now()}`,event_id:this.currentEvent?.event_id||'isd_2026',scope:item.scope+'_custom',person_key:'custom_batch',custom_data:JSON.stringify(item.custom||[]),updated_at:new Date().toISOString()}));
    }catch(e){}
  }
,
  canManageSouvenirStamps(scope){
    if(!this.currentUser) return false;
    if(this.isAdmin()||this.currentUser.mock_admin) return true;
    if(this.roleLevel(this.currentUser.role)>=100) return true;
    const g=normalizeGroupName(this.currentUser.group_name||'');
    if(!g) return false;
    return (SOUVENIR_STAMP_MANAGERS[scope]||[]).some(x=>{const ox=normalizeGroupName(x); return ox===g||g.includes(ox)||ox.includes(g);});
  }
,
  souvenirStampScopeDef(scope){ return SOUVENIR_STAMP_SCOPES.find(s=>s.scope===scope)||SOUVENIR_STAMP_SCOPES[0]; }
,
  souvenirStaffRoster(){
    const out=[],seen=new Set();
    const push=(name,group,job,extra)=>{
      const n=String(name||'').trim(); if(!n) return;
      const k=normalizeOrgText(n);
      if(seen.has(k)) return; seen.add(k);
      out.push({key:k,name:n,group_name:normalizeGroupName(group||'')||'未分組',job_title:String(job||''),booth:(extra&&extra.booth)||'',remark:(extra&&extra.remark)||'',unit:(extra&&extra.unit)||''});
    };
    let users=(this.usersList&&this.usersList.length)?this.usersList:[];
    if(!users.length){ try{ users=this.getLocalUsers()||[]; }catch(e){ users=[]; } }
    // v12.1：最高層系統帳戶（isSuperAdminUser 判定）唔係工作人員——不計入紀念章派發名單同統計
    const superAdminNames=new Set();
    (users||[]).forEach(u=>{
      if(!u) return;
      if((u.status||'active')!=='active') return;
      if(u.role==='public') return;
      if(typeof this.isSuperAdminUser==='function'&&this.isSuperAdminUser(u)){
        superAdminNames.add(normalizeOrgText(u.name||u.user_id||''));
        return;
      }
      push(u.name||u.user_id,u.group_name,u.job_title||ROLE_LABELS[u.role]||'');
    });
    let staff=null;
    try{ staff=this.getStaffData(); }catch(e){ staff=null; }
    ((staff&&staff.contacts)||[]).forEach(c=>{
      if(!c||!c.name) return;
      if(superAdminNames.has(normalizeOrgText(c.name))) return; // 系統管理員即使出現喺聯絡表都唔計
      push(c.name,c.group_name||c.group,c.role_title||c.role||'');
    });
    ((staff&&staff.org_chart)||[]).forEach(n=>{
      if(!n) return;
      const g=normalizeGroupName(String(n.level||'').replace(/\s*[(（][^)）]*[)）]\s*$/,''));
      orgNameList(n.names).forEach(nm=>{
        if(superAdminNames.has(normalizeOrgText(nm))) return; // 系統管理員即使出現喺架構圖都唔計
        push(nm,g,n.title||'');
      });
    });
    // 匯入的自訂名單（EXCEL）
    try{
      const custom=this.getSouvenirStampData().staff_custom||[];
      custom.forEach(c=>{
        if(!c||!c.name) return;
        push(c.name,c.group_name||c.group,c.job_title||c.role||c.identity,{booth:c.booth||'',remark:c.remark||'',unit:c.unit||''});
      });
    }catch(e){}
    const gi=g=>{ const i=ORG_GROUPS.indexOf(normalizeGroupName(g)); return i<0?99:i; };
    out.sort((a,b)=>(gi(a.group_name)-gi(b.group_name))||String(a.name).localeCompare(String(b.name),'zh-HK'));
    return out;
  }
,
  souvenirGuestRoster(){
    const out=[],seen=new Set();
    const pushGuest=(name,unit,title)=>{
      const n=String(name||'').trim(); if(!n) return;
      const k=normalizeOrgText(n);
      if(seen.has(k)) return; seen.add(k);
      out.push({key:k,name:n,group_name:'典禮嘉賓',title:String(title||''),job_title:String(title||''),unit:String(unit||''),booth:''});
    };
    let cer=null;
    try{ cer=this.getCeremonyData(); }catch(e){ cer=null; }
    ((cer&&cer.guests)||[]).forEach(g=>{
      const n=String((g&&g.name)||'').trim(); if(!n) return;
      pushGuest(n,g.unit||g.organization||'',g.title||'');
    });
    try{
      const custom=this.getSouvenirStampData().guests_custom||[];
      custom.forEach(c=>{
        if(!c||!c.name) return;
        pushGuest(c.name,c.unit||'',c.title||c.job_title||'');
      });
    }catch(e){}
    return out;
  }
,
  souvenirRoster(scope){ return scope==='guests'?this.souvenirGuestRoster():this.souvenirStaffRoster(); }
,
  souvenirStampStats(scope){
    const roster=this.souvenirRoster(scope);
    const map=this.getSouvenirStampData()[scope]||{};
    const ticked=roster.filter(p=>map[p.key]&&map[p.key].ticked).length;
    return {total:roster.length,ticked,pending:roster.length-ticked};
  }
,
  // v12.1：紀念章名單排序（預設組別→姓名；可按 姓名／組別／攤位／派發狀態 排序，方便現場派發）
  stampSortState(scope){
    this._stampSort=this._stampSort||{};
    if(!this._stampSort[scope]) this._stampSort[scope]={key:'group',dir:'asc'};
    return this._stampSort[scope];
  }
,
  setStampSort(scope,key){
    const s=this.stampSortState(scope);
    if(s.key===key) s.dir=s.dir==='asc'?'desc':'asc';
    else { s.key=key; s.dir=key==='ticked'?'desc':'asc'; }
    this.sortSouvenirStampRows(scope);
  }
,
  sortSouvenirStampRows(scope){
    const table=document.getElementById('stamp-table-'+scope);
    if(!table) return;
    const tbody=table.querySelector('tbody');
    if(!tbody) return;
    const s=this.stampSortState(scope);
    const rows=Array.from(tbody.querySelectorAll('tr[data-key]'));
    const val=tr=>{
      if(s.key==='ticked') return tr.querySelector('input[type=checkbox]')?.checked?1:0;
      return String(tr.dataset['sort_'+s.key]||'');
    };
    const cmp=(a,b)=>{
      const va=val(a), vb=val(b);
      let r;
      if(s.key==='ticked') r=Number(va)-Number(vb);
      else if(s.key==='booth'||s.key==='unit') r=String(va).localeCompare(String(vb),'zh-HK',{numeric:true});
      else r=String(va).localeCompare(String(vb),'zh-HK');
      return s.dir==='asc'?r:-r;
    };
    rows.sort(cmp);
    // 穩定排序：姓名欄次序相同時保持原名單次序（roster index 已寫入 data-idx）
    rows.forEach((tr,i)=>tbody.appendChild(tr));
    // 更新 header 排序標示
    table.querySelectorAll('th[data-sort-key]').forEach(th=>{
      const k=th.getAttribute('data-sort-key');
      const base=th.getAttribute('data-label-base')||'';
      th.classList.toggle('stamp-th-active',k===s.key);
      const arrow=k===s.key?(s.dir==='asc'?' ▲':' ▼'):'';
      th.innerHTML=base+arrow;
    });
    // 排序後重新套用搜尋／篩選（否則 hidden 狀態會亂）
    this.filterSouvenirStamps(scope);
  }
,
  renderSouvenirStampsHTML(scope){
    const def=this.souvenirStampScopeDef(scope);
    const roster=this.souvenirRoster(scope);
    const store=this.getSouvenirStampData();
    const map=store[scope]||{};
    const canManage=this.canManageSouvenirStamps(scope);
    const st=this.souvenirStampStats(scope);
    const pct=st.total?Math.round(st.ticked/st.total*100):0;
    const sortState=this.stampSortState(scope);
    const sortTh=(key,label)=>`<th class="border px-2 py-1 cursor-pointer select-none hover:bg-slate-200 ${sortState.key===key?'stamp-th-active':''}" data-sort-key="${key}" data-label-base="${escapeHtml(label)}" onclick="app.setStampSort('${scope}','${key}')">${escapeHtml(label)}${sortState.key===key?(sortState.dir==='asc'?' ▲':' ▼'):''}</th>`;
    const byGroup={};
    roster.forEach(p=>{ const g=p.group_name||'未分組'; byGroup[g]=byGroup[g]||{total:0,ticked:0}; byGroup[g].total++; if(map[p.key]&&map[p.key].ticked) byGroup[g].ticked++; });
    const groupChips=Object.keys(byGroup).map(g=>`<span class="text-[10px] bg-white border px-2 py-1 rounded-full whitespace-nowrap">${escapeHtml(g)} <b>${byGroup[g].ticked}</b>/${byGroup[g].total}</span>`).join('');
    const isStaff=scope==='staff';
    const rows=roster.map((p,i)=>{
      const e=map[p.key]||{};
      const ticked=!!e.ticked;
      const remarkVal=e.remark||p.remark||'';
      const boothVal=p.booth||e.booth||'';
      const unitVal=p.unit||e.unit||'';
      const search=`${p.name} ${p.group_name} ${p.job_title||p.title||''} ${remarkVal} ${boothVal} ${unitVal}`.toLowerCase();
      const nameCell=escapeHtml(p.name);
      const groupCell=escapeHtml(p.group_name||'');
      const boothCell=escapeHtml(boothVal);
      const titleCell=escapeHtml(p.job_title||p.title||'');
      const unitCell=escapeHtml(unitVal);
      return `<tr class="${ticked?'bg-emerald-50/60':''}" data-key="${escapeHtml(p.key)}" data-search="${escapeHtml(search)}" data-sort_name="${escapeHtml(p.name)}" data-sort_group="${groupCell}" data-sort_booth="${boothCell}" data-sort_unit="${unitCell}" data-sort_ticked="${ticked?1:0}">
        <td class="border px-2 py-1 text-center"><input type="checkbox" class="w-4 h-4 accent-emerald-600" ${ticked?'checked':''} ${canManage?'':'disabled'} onchange="app.toggleSouvenirStamp('${scope}','${escapeHtml(p.key)}',this)" title="派咗紀念章就剔"></td>
        <td class="border px-2 py-1 font-bold whitespace-nowrap" data-label="姓名">${nameCell}</td>
        ${isStaff?`<td class="border px-2 py-1 whitespace-nowrap" data-label="組別">${groupCell}</td><td class="border px-2 py-1 whitespace-nowrap text-[11px]" data-label="攤位">${boothCell||'<span class=text-slate-300>—</span>'}</td><td class="border px-2 py-1 text-[10px]" data-label="身份">${titleCell}</td>`
        :`<td class="border px-2 py-1 whitespace-nowrap text-[11px]" data-label="單位">${unitCell||'<span class=text-slate-300>—</span>'}</td><td class="border px-2 py-1 text-[10px]" data-label="職銜">${titleCell}</td>`}
        <td class="border px-2 py-1 text-[10px] stamp-status-cell" data-label="派發紀錄">${ticked?`<span class="text-emerald-700 font-bold">✅ 已派</span><br><span class="text-slate-500">${escapeHtml(e.ticked_at||'')} · ${escapeHtml(e.ticked_by||'')}</span>`:'<span class="text-slate-400">⬜ 未派</span>'}</td>
        ${isStaff?`<td class="border px-2 py-1" data-label="備註(改名)">${canManage?`<input value="${escapeHtml(remarkVal)}" placeholder="改名／替假請註明" onchange="app.saveSouvenirStampRemark('${scope}','${escapeHtml(p.key)}',this.value)" class="w-full min-w-[140px] px-2 py-1 border rounded-lg text-[11px]">`:escapeHtml(remarkVal)}</td>`
        :`<td class="border px-2 py-1 text-[10px] text-slate-400" data-label="備註">—</td>`}
      </tr>`;
    }).join('');
    const headerStaff=`<th class="border px-2 py-1">派發<br>(TICK)</th>${sortTh('name','姓名')}${sortTh('group','組別')}${sortTh('booth','攤位(如有)')}<th class="border px-2 py-1 text-left">身份</th>${sortTh('ticked','派發狀態')}<th class="border px-2 py-1 text-left">備註(改名)</th>`;
    const headerGuest=`<th class="border px-2 py-1">派發<br>(TICK)</th>${sortTh('name','姓名')}${sortTh('unit','單位')}<th class="border px-2 py-1 text-left">職銜</th>${sortTh('ticked','派發狀態')}<th class="border px-2 py-1 text-left">備註</th>`;
    return `<div class="space-y-3">
      <div class="bg-fuchsia-50 border border-fuchsia-200 rounded-xl p-3 text-[11px] leading-relaxed text-fuchsia-900"><b>🏅 紀念章派發（${escapeHtml(def.label)}）：</b>${escapeHtml(def.hint)}<br>管理：<b>${escapeHtml((SOUVENIR_STAMP_MANAGERS[scope]||[]).join('・'))}</b>${canManage?'（你可以 TICK 派發 + 匯入 EXCEL）':'（你只可以查閱）'}<br>${isStaff?'欄位：<b>姓名 組別 攤位(如有) 身份 備註(改名) TICK</b>（支援 EXCEL 匯入，備註欄紀錄改名／替假）':'欄位：<b>姓名 單位 職銜 TICK</b>（支援 EXCEL 匯入，不設改名）'}${canManage?'<br><b class="text-fuchsia-700">💡 TICK 同備註會先存本機，可以一口氣 TICK 完整個組別，撳「💾 儲存到後端」先一次過寫入（唔會逐 tick 打後端）。</b>':''}</div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
        <div class="bg-white border rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold">${st.total}</div><div class="text-[10px]">${escapeHtml(def.label)}總人數</div></div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold text-emerald-700" id="stamp-count-${scope}">${st.ticked}</div><div class="text-[10px]">已派發</div></div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold text-amber-700" id="stamp-pending-${scope}">${st.pending}</div><div class="text-[10px]">未派發</div></div>
        <div class="bg-fuchsia-50 border border-fuchsia-200 rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold text-fuchsia-700" id="stamp-pct-${scope}">${pct}%</div><div class="text-[10px]">派發進度</div></div>
      </div>
      ${isStaff?`<div class="flex flex-wrap gap-1.5"><span class="text-[10px] text-slate-500 py-1">按組別進度：</span>${groupChips}</div>`:''}
      <div class="flex gap-2 flex-wrap items-center">
        <input id="stamp-search-${scope}" oninput="app.filterSouvenirStamps('${scope}')" placeholder="🔍 搜尋姓名／組別／備註" class="px-3 py-2 border rounded-xl text-xs min-w-[180px]">
        <select id="stamp-filter-${scope}" onchange="app.filterSouvenirStamps('${scope}')" class="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="all">全部</option><option value="pending">只睇未派發</option><option value="ticked">只睇已派發</option>
        </select>
        ${canManage?`<button data-stamp-save-btn onclick="app.saveSouvenirStampsToBackend('${scope}')" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm hover:bg-emerald-700"><i class="fa-solid fa-floppy-disk mr-1"></i>💾 儲存到後端<span data-stamp-pending-count class="hidden ml-1 bg-white/25 text-white text-[10px] px-1.5 py-0.5 rounded-full"></span></button>`:''}
        <span data-stamp-sync-status class="text-[10px] text-slate-400 py-2 whitespace-nowrap"></span>
        <span class="text-[10px] text-slate-400 py-2">💡 點 header（姓名／組別／攤位／派發狀態）可排序，方便現場派發</span>
        ${canManage?`<label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"><i class="fa-solid fa-file-excel mr-1"></i>匯入 EXCEL 名單<input type="file" accept=".xlsx,.xls" class="hidden" onchange="app.handleSouvenirStampsExcelUpload('${scope}',this.files[0])"></label>`:''}
        <button onclick="app.exportSouvenirStampsCSV('${scope}')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>匯出派發紀錄 CSV</button>
        <button onclick="app.printCoordArea('stamp-print-${scope}','紀念章派發紀錄（${escapeHtml(def.label)}）')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印名單</button>
        ${canManage&&((isStaff&&(store.staff_custom||[]).length)||(!isStaff&&(store.guests_custom||[]).length))?`<button onclick="app.clearSouvenirCustom('${scope}')" class="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i>清除匯入名單</button>`:''}
      </div>
      <div id="stamp-print-${scope}" class="bg-white border rounded-xl p-3">
        <div class="table-responsive"><table class="min-w-full text-[11px] border" id="stamp-table-${scope}">
          <thead class="bg-slate-100"><tr>${isStaff?headerStaff:headerGuest}</tr></thead>
          <tbody>${rows||`<tr><td colspan="${isStaff?7:6}" class="border px-2 py-4 text-center text-slate-400">暫無${escapeHtml(def.label)}名單</td></tr>`}</tbody>
        </table></div>
        <p class="text-[10px] text-slate-400 mt-2">${isStaff
          ?'工作人員名單來自開戶用戶＋組織架構與聯絡表＋EXCEL 匯入（活動前已有全人名）；有工作人員改名／替假，請喺「備註(改名)」註明實際領取人。欄位：姓名 組別 攤位(如有) 身份 備註(改名) TICK。派發由行政組管理。'
          :'嘉賓名單來自「執行手冊 → 典禮儀式 → 嘉賓名單」＋EXCEL 匯入，唔可以改名（冇代嘉賓）；如名單有變請先改嘉賓名單。欄位：姓名 單位 職銜 TICK。派發由行政組及嘉賓接待組管理。'}</p>
      </div>
    </div>`;
  }
,
  toggleSouvenirStamp(scope,key,el){
    if(!this.canManageSouvenirStamps(scope)){ showToast('紀念章派發由'+(SOUVENIR_STAMP_MANAGERS[scope]||[]).join('・')+'管理','error'); if(el) el.checked=!el.checked; return; }
    const person=this.souvenirRoster(scope).find(p=>p.key===key)||{key,name:key,group_name:''};
    const data=this.getSouvenirStampData();
    const map=data[scope]||{};
    const now=new Date();
    const stamp=`${now.toLocaleDateString('zh-HK')} ${now.toTimeString().slice(0,5)}`;
    const e=map[key]||{};
    const ticked=el?!!el.checked:!e.ticked;
    e.name=person.name; e.group_name=person.group_name||''; e.job_title=person.job_title||person.title||''; e.booth=person.booth||e.booth||''; e.unit=person.unit||e.unit||'';
    if(ticked){
      e.ticked=true; e.ticked_at=stamp; e.ticked_by=this.currentUser?.name||''; e.ticked_by_id=this.currentUser?.user_id||'';
    }else{
      e.ticked=false; e.ticked_at=''; e.ticked_by=''; e.ticked_by_id='';
    }
    e.updated_at=now.toISOString();
    if(!e.created_at) e.created_at=e.updated_at;
    map[key]=e; data[scope]=map;
    this.saveSouvenirStampData(data,{scope,key,row:e});
    if(el){
      const tr=el.closest?el.closest('tr'):null;
      if(tr){
        const cell=tr.querySelector('.stamp-status-cell');
        if(cell) cell.innerHTML=ticked?`<span class="text-emerald-700 font-bold">✅ 已派</span><br><span class="text-slate-500">${escapeHtml(e.ticked_at)} · ${escapeHtml(e.ticked_by)}</span>`:'<span class="text-slate-400">⬜ 未派</span>';
        tr.classList.toggle('bg-emerald-50/60',ticked);
      }
    }
    const st=this.souvenirStampStats(scope);
    const c=document.getElementById('stamp-count-'+scope); if(c) c.textContent=st.ticked;
    const p=document.getElementById('stamp-pending-'+scope); if(p) p.textContent=st.pending;
    const pc=document.getElementById('stamp-pct-'+scope); if(pc) pc.textContent=(st.total?Math.round(st.ticked/st.total*100):0)+'%';
    // v12.2：TICK 已即時存本機（唔打後端），唔再逐次 toast；狀態列會顯示「有 N 項未儲存到後端」
  }
,
  saveSouvenirStampRemark(scope,key,value){
    if(!this.souvenirStampScopeDef(scope).canRename){ showToast('嘉賓名單唔可以改名','warning'); return; }
    if(!this.canManageSouvenirStamps(scope)){ showToast('紀念章派發由'+(SOUVENIR_STAMP_MANAGERS[scope]||[]).join('・')+'管理','error'); return; }
    const person=this.souvenirRoster(scope).find(p=>p.key===key)||{key,name:key,group_name:''};
    const data=this.getSouvenirStampData();
    const map=data[scope]||{};
    const e=map[key]||{};
    e.name=person.name; e.group_name=person.group_name||''; e.job_title=person.job_title||''; e.booth=person.booth||e.booth||'';
    e.remark=String(value||'').trim();
    e.updated_at=new Date().toISOString();
    if(!e.created_at) e.created_at=e.updated_at;
    map[key]=e; data[scope]=map;
    this.saveSouvenirStampData(data,{scope,key,row:e});
    showToast(e.remark?`備註已存本機（${person.name}）：${e.remark} — 撳「儲存到後端」先同步`:`已清除 ${person.name} 嘅備註（未儲存到後端）`,'success');
  }
,
  filterSouvenirStamps(scope){
    const q=(document.getElementById('stamp-search-'+scope)?.value||'').trim().toLowerCase();
    const mode=document.getElementById('stamp-filter-'+scope)?.value||'all';
    const table=document.getElementById('stamp-table-'+scope);
    if(!table||!table.querySelectorAll) return;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const text=String((tr.getAttribute&&tr.getAttribute('data-search'))||'').toLowerCase();
      const cb=tr.querySelector?tr.querySelector('input[type=checkbox]'):null;
      const ticked=!!(cb&&cb.checked);
      const hitQ=!q||text.includes(q);
      const hitM=mode==='all'||(mode==='ticked'?ticked:!ticked);
      tr.classList.toggle('hidden',!(hitQ&&hitM));
    });
  }
,
  exportSouvenirStampsCSV(scope){
    const def=this.souvenirStampScopeDef(scope);
    const roster=this.souvenirRoster(scope);
    const map=this.getSouvenirStampData()[scope]||{};
    const isStaff=scope==='staff';
    const head=isStaff?['姓名','組別','攤位','身份','已派發','派發時間','派發人','備註(改名)']:['姓名','單位','職銜','已派發','派發時間','派發人'];
    const esc=s=>`"${String(s??'').replace(/"/g,'""')}"`;
    const rows=roster.map(p=>{
      const e=map[p.key]||{};
      if(isStaff){
        return [p.name,p.group_name,p.booth||e.booth||'',p.job_title||p.title||'',e.ticked?'已派發':'未派發',e.ticked_at||'',e.ticked_by||'',e.remark||p.remark||''].map(esc).join(',');
      }else{
        return [p.name,p.unit||e.unit||'',p.job_title||p.title||'',e.ticked?'已派發':'未派發',e.ticked_at||'',e.ticked_by||''].map(esc).join(',');
      }
    });
    const csv='\ufeff'+[head.map(esc).join(','),...rows].join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=`紀念章派發紀錄_${def.label}.csv`; a.click();
    showToast('已匯出紀念章派發紀錄','success');
  }
,
  clearSouvenirCustom(scope){
    if(!this.canManageSouvenirStamps(scope)) return;
    if(!confirm('確定清除所有匯入的自訂名單？（已 TICK 紀錄會保留）')) return;
    const data=this.getSouvenirStampData();
    if(scope==='staff') data.staff_custom=[];
    else data.guests_custom=[];
    this.saveSouvenirStampData(data,{scope,custom:[]});
    showToast('已清除匯入名單','success');
    if(this.currentModule==='admin_group'){
      this.adminGroupTab=scope==='staff'?'stamp_staff':'stamp_guest';
      this.renderAdminGroupModule();
      return;
    }
    const ids=[`admin-tab-${scope==='staff'?'stamp_staff':'stamp_guest'}`,`group-tab-${scope==='staff'?'stamp_staff':'stamp_guest'}`];
    for(const id of ids){
      const el=document.getElementById(id);
      if(el){ el.innerHTML=this.renderSouvenirStampsHTML(scope); return; }
    }
    const mc=document.getElementById('module-content');
    if(mc) mc.innerHTML=this.renderSouvenirStampsHTML(scope);
  }
,
  async handleSouvenirStampsExcelUpload(scope, file){
    if(!this.canManageSouvenirStamps(scope)){ showToast('紀念章派發由'+(SOUVENIR_STAMP_MANAGERS[scope]||[]).join('・')+'管理','error'); return; }
    if(!file){ showToast('請選擇 EXCEL 檔案','warning'); return; }
    const overlay=document.getElementById('savingOverlay');
    if(overlay) overlay.classList.add('active');
    const savingText=document.getElementById('savingText');
    if(savingText) savingText.textContent='正在解析 EXCEL 名單...';
    try{
      const sheetData=await this.readExcelFile(file);
      if(!sheetData||!sheetData.length){ showToast('EXCEL 空白','warning'); return; }
      const headers=(sheetData[0]||[]).map(h=>String(h||'').trim());
      const lowerHeaders=headers.map(h=>String(h||'').toLowerCase().replace(/\s+/g,''));
      const findCol=names=>{
        for(const n of names){
          const nl=String(n).toLowerCase().replace(/\s+/g,'');
          let idx=lowerHeaders.indexOf(nl);
          if(idx>=0) return idx;
          idx=lowerHeaders.findIndex(h=>h.includes(nl)||nl.includes(h));
          if(idx>=0) return idx;
        }
        return -1;
      };
      const results=[];
      if(scope==='staff'){
        const idxName=findCol(['姓名','名字','name','姓名(全名)']);
        const idxGroup=findCol(['組別','組','部門','group','組別名稱','group_name']);
        const idxBooth=findCol(['攤位','攤位編號','booth','攤位(如有)','攤位號','攤位名稱']);
        const idxRole=findCol(['身份','職位','身份/職位','role','job_title','身分','崗位','身份/組別','職銜']);
        const idxRemark=findCol(['備註','備註(改名)','改名','備注','remark','notes','備註/改名','備註改名']);
        for(let i=1;i<sheetData.length;i++){
          const row=sheetData[i]||[];
          if(!row||!row.length) continue;
          const name=String(row[idxName>=0?idxName:0]||'').trim();
          if(!name) continue;
          const group=String(row[idxGroup>=0?idxGroup:1]||'').trim();
          const booth=String(row[idxBooth>=0?idxBooth:2]||'').trim();
          const role=String(row[idxRole>=0?idxRole:(idxBooth>=0?3:2)]||'').trim();
          const remark=String(row[idxRemark>=0?idxRemark:4]||'').trim();
          if(name.toLowerCase()==='姓名' || name.toLowerCase()==='name') continue;
          results.push({name,group_name:normalizeGroupName(group)||group||'未分組',booth,role,job_title:role,identity:role,remark,group});
        }
      }else{
        const idxName=findCol(['姓名','名字','name']);
        const idxUnit=findCol(['單位','機構','unit','organization','單位名稱','organisation']);
        const idxTitle=findCol(['職銜','職稱','職銜/職位','title','job_title','職位','身份']);
        for(let i=1;i<sheetData.length;i++){
          const row=sheetData[i]||[];
          if(!row||!row.length) continue;
          const name=String(row[idxName>=0?idxName:0]||'').trim();
          if(!name) continue;
          if(name.toLowerCase()==='姓名' || name.toLowerCase()==='name') continue;
          const unit=String(row[idxUnit>=0?idxUnit:1]||'').trim();
          const title=String(row[idxTitle>=0?idxTitle:2]||'').trim();
          results.push({name,unit,title,job_title:title,group_name:'典禮嘉賓'});
        }
      }
      if(!results.length){ showToast('EXCEL 中未找到有效名單（請檢查欄位：姓名／組別／身份 等）','warning'); return; }
      const store=this.getSouvenirStampData();
      const customKey=scope==='staff'?'staff_custom':'guests_custom';
      const existingCustom=store[customKey]||[];
      const existingMap=new Map();
      existingCustom.forEach(c=>{ if(c&&c.name) existingMap.set(normalizeOrgText(c.name), c); });
      // 合併：同名覆蓋
      results.forEach(r=>{
        const k=normalizeOrgText(r.name);
        existingMap.set(k,r);
      });
      const merged=Array.from(existingMap.values());
      store[customKey]=merged;
      this.saveSouvenirStampData(store,{scope,custom:merged});
      showToast(`成功匯入 ${results.length} 個名單，共 ${merged.length} 個自訂名單（同名會覆蓋）`,'success');
      if(this.currentModule==='admin_group'){
        this.adminGroupTab=scope==='staff'?'stamp_staff':'stamp_guest';
        this.renderAdminGroupModule();
      }else{
        const tabId=scope==='staff'?'stamp_staff':'stamp_guest';
        const candidates=[`admin-tab-${tabId}`,`group-tab-${tabId}`];
        let done=false;
        for(const cid of candidates){
          const el=document.getElementById(cid);
          if(el){ el.innerHTML=this.renderSouvenirStampsHTML(scope); done=true; break; }
        }
        if(!done){
          const mc=document.getElementById('module-content');
          if(mc) mc.innerHTML=this.renderSouvenirStampsHTML(scope);
        }
      }
    }catch(e){
      console.error(e);
      showToast('匯入失敗：'+(e&&e.message||e),'error');
    }finally{
      if(overlay) overlay.classList.remove('active');
    }
  }
,
  async readExcelFile(file){
    return new Promise((resolve, reject)=>{
      try{
        const reader=new FileReader();
        reader.onload=e=>{
          try{
            const data=new Uint8Array(e.target.result);
            const workbook=XLSX.read(data, {type: 'array'});
            const firstSheet=workbook.Sheets[workbook.SheetNames[0]];
            const jsonData=XLSX.utils.sheet_to_json(firstSheet, {header: 1});
            resolve(jsonData);
          }catch(err){ reject(err); }
        };
        reader.onerror=reject;
        reader.readAsArrayBuffer(file);
      }catch(err){ reject(err); }
    });
  }
,
});
