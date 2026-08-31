/* 40-souvenir-stamps.js — 紀念章派發 (Souvenir Stamp Distribution) v11（2026-08-31 新增）
   用戶定案：紀念章只派發俾工作人員及典禮嘉賓，活動前已有全人名，所以派發時只需 TICK 人名。
   ① 行政組部門中心 →「紀念章派發（工作人員）」：TICK 派咗俾邊位工作人員；
      另有「備註」欄，用作紀錄改名／替假嘅工作人員（例：「改為 陳大文（替假）」）。
   ② 嘉賓接待組部門中心 →「紀念章派發（嘉賓）」：TICK 派咗俾邊位嘉賓；
      嘉賓名單唔可以改名（冇代嘉賓），名單跟「典禮儀式 → 嘉賓名單」。
   管理組別：行政組（工作人員＋嘉賓）＋嘉賓接待組（嘉賓）。
   儲存：localStorage（即時）＋後端 Souvenir_Stamps 工作表（跨裝置同步，見 23-sync.js）。 */
Object.assign(ScoutEventApp.prototype,{

  getSouvenirStampData(){
    const key=LS.souvenirStamps(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local&&typeof local==='object') return {staff:local.staff||{},guests:local.guests||{}};
    return {staff:{},guests:{}};
  }
,
  saveSouvenirStampData(data, changed){
    const key=LS.souvenirStamps(this.currentEvent?.event_id||'isd_2026');
    localStorage.setItem(key,JSON.stringify(data));
    // 只把改動咗嗰一行寫去後端（唔好成份 60 行逐次重寫）
    if(changed&&changed.row&&!this.mockMode&&this.gasUrl){
      const r=changed.row;
      fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Souvenir_Stamps',record:{stamp_id:`${changed.scope}_${changed.key}`,event_id:this.currentEvent?.event_id||'isd_2026',scope:changed.scope,person_key:changed.key,name:r.name||'',group_name:r.group_name||'',job_title:r.job_title||r.title||'',ticked:r.ticked?'Y':'',ticked_at:r.ticked_at||'',ticked_by:r.ticked_by||'',ticked_by_id:r.ticked_by_id||'',remark:r.remark||'',updated_at:r.updated_at||'',created_at:r.created_at||r.updated_at||''}})}).catch(()=>{});
    }
  }
,
  // 行政組＝工作人員＋嘉賓；嘉賓接待組＝嘉賓（管理層／MOCK 全權）
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
  /* —— 工作人員全人名（活動前已有）：已開戶用戶 → 聯絡表 → 組織架構，同一姓名只列一次 —— */
  souvenirStaffRoster(){
    const out=[],seen=new Set();
    const push=(name,group,job)=>{
      const n=String(name||'').trim(); if(!n) return;
      const k=normalizeOrgText(n);
      if(seen.has(k)) return; seen.add(k);
      out.push({key:k,name:n,group_name:normalizeGroupName(group||'')||'未分組',job_title:String(job||'')});
    };
    let users=(this.usersList&&this.usersList.length)?this.usersList:[];
    if(!users.length){ try{ users=this.getLocalUsers()||[]; }catch(e){ users=[]; } }
    (users||[]).forEach(u=>{
      if(!u) return;
      if((u.status||'active')!=='active') return;
      if(u.role==='public') return;
      push(u.name||u.user_id,u.group_name,u.job_title||ROLE_LABELS[u.role]||'');
    });
    // 未開戶但喺聯絡表／架構圖嘅工作人員一併列入（派紀念章唔關有冇帳戶）
    let staff=null;
    try{ staff=this.getStaffData(); }catch(e){ staff=null; }
    ((staff&&staff.contacts)||[]).forEach(c=>{ if(c&&c.name) push(c.name,c.group_name||c.group,c.role_title||c.role||''); });
    ((staff&&staff.org_chart)||[]).forEach(n=>{
      if(!n) return;
      const g=normalizeGroupName(String(n.level||'').replace(/\s*[(（][^)）]*[)）]\s*$/,''));
      orgNameList(n.names).forEach(nm=>push(nm,g,n.title||''));
    });
    const gi=g=>{ const i=ORG_GROUPS.indexOf(normalizeGroupName(g)); return i<0?99:i; };
    out.sort((a,b)=>(gi(a.group_name)-gi(b.group_name))||String(a.name).localeCompare(String(b.name),'zh-HK'));
    return out;
  }
,
  /* —— 典禮嘉賓名單（跟「典禮儀式 → 嘉賓名單」，唔可以改名）—— */
  souvenirGuestRoster(){
    const out=[],seen=new Set();
    let cer=null;
    try{ cer=this.getCeremonyData(); }catch(e){ cer=null; }
    ((cer&&cer.guests)||[]).forEach(g=>{
      const n=String((g&&g.name)||'').trim(); if(!n) return;
      const k=normalizeOrgText(n);
      if(seen.has(k)) return; seen.add(k);
      out.push({key:k,name:n,group_name:'典禮嘉賓',title:String(g.title||''),job_title:String(g.title||'')});
    });
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
  /* —— 派發表（TICK 人名）：行政組（工作人員）／嘉賓接待組（嘉賓）部門中心共用 —— */
  renderSouvenirStampsHTML(scope){
    const def=this.souvenirStampScopeDef(scope);
    const roster=this.souvenirRoster(scope);
    const map=this.getSouvenirStampData()[scope]||{};
    const canManage=this.canManageSouvenirStamps(scope);
    const st=this.souvenirStampStats(scope);
    const pct=st.total?Math.round(st.ticked/st.total*100):0;
    // 組別統計（工作人員版：逐組睇派咗幾多个）
    const byGroup={};
    roster.forEach(p=>{ const g=p.group_name||'未分組'; byGroup[g]=byGroup[g]||{total:0,ticked:0}; byGroup[g].total++; if(map[p.key]&&map[p.key].ticked) byGroup[g].ticked++; });
    const groupChips=Object.keys(byGroup).map(g=>`<span class="text-[10px] bg-white border px-2 py-1 rounded-full whitespace-nowrap">${escapeHtml(g)} <b>${byGroup[g].ticked}</b>/${byGroup[g].total}</span>`).join('');
    const rows=roster.map((p,i)=>{
      const e=map[p.key]||{};
      const ticked=!!e.ticked;
      const search=`${p.name} ${p.group_name} ${p.job_title||p.title||''} ${e.remark||''}`.toLowerCase();
      return `<tr class="${ticked?'bg-emerald-50/60':''}" data-search="${escapeHtml(search)}">
        <td class="border px-2 py-1 text-center"><input type="checkbox" class="w-4 h-4 accent-emerald-600" ${ticked?'checked':''} ${canManage?'':'disabled'} onchange="app.toggleSouvenirStamp('${scope}','${escapeHtml(p.key)}',this)" title="派咗紀念章就剔"></td>
        <td class="border px-2 py-1 font-bold whitespace-nowrap" data-label="姓名">${escapeHtml(p.name)}</td>
        <td class="border px-2 py-1 whitespace-nowrap" data-label="組別">${escapeHtml(p.group_name||'')}</td>
        <td class="border px-2 py-1 text-[10px]" data-label="${scope==='guests'?'職銜':'職位'}">${escapeHtml(p.job_title||p.title||'')}</td>
        <td class="border px-2 py-1 text-[10px] stamp-status-cell" data-label="派發紀錄">${ticked?`<span class="text-emerald-700 font-bold">✅ 已派</span><br><span class="text-slate-500">${escapeHtml(e.ticked_at||'')} · ${escapeHtml(e.ticked_by||'')}</span>`:'<span class="text-slate-400">⬜ 未派</span>'}</td>
        ${def.canRename?`<td class="border px-2 py-1" data-label="備註">${canManage
          ?`<input value="${escapeHtml(e.remark||'')}" placeholder="改名／替假請註明" onchange="app.saveSouvenirStampRemark('${scope}','${escapeHtml(p.key)}',this.value)" class="w-full min-w-[140px] px-2 py-1 border rounded-lg text-[11px]">`
          :escapeHtml(e.remark||'')}</td>`:`<td class="border px-2 py-1 text-[10px] text-slate-400" data-label="備註">—（嘉賓名單不可改名）</td>`}
      </tr>`;
    }).join('');
    return `<div class="space-y-3">
      <div class="bg-fuchsia-50 border border-fuchsia-200 rounded-xl p-3 text-[11px] leading-relaxed text-fuchsia-900"><b>🏅 紀念章派發（${escapeHtml(def.label)}）：</b>${escapeHtml(def.hint)}<br>管理：<b>${escapeHtml((SOUVENIR_STAMP_MANAGERS[scope]||[]).join('・'))}</b>${canManage?'（你可以 TICK 派發）':'（你只可以查閱）'}</div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
        <div class="bg-white border rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold">${st.total}</div><div class="text-[10px]">${escapeHtml(def.label)}總人數</div></div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold text-emerald-700" id="stamp-count-${scope}">${st.ticked}</div><div class="text-[10px]">已派發</div></div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold text-amber-700" id="stamp-pending-${scope}">${st.pending}</div><div class="text-[10px]">未派發</div></div>
        <div class="bg-fuchsia-50 border border-fuchsia-200 rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold text-fuchsia-700" id="stamp-pct-${scope}">${pct}%</div><div class="text-[10px]">派發進度</div></div>
      </div>
      ${scope==='staff'?`<div class="flex flex-wrap gap-1.5"><span class="text-[10px] text-slate-500 py-1">按組別進度：</span>${groupChips}</div>`:''}
      <div class="flex gap-2 flex-wrap items-center">
        <input id="stamp-search-${scope}" oninput="app.filterSouvenirStamps('${scope}')" placeholder="🔍 搜尋姓名／組別${def.canRename?'／備註':''}" class="px-3 py-2 border rounded-xl text-xs min-w-[180px]">
        <select id="stamp-filter-${scope}" onchange="app.filterSouvenirStamps('${scope}')" class="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="all">全部</option><option value="pending">只睇未派發</option><option value="ticked">只睇已派發</option>
        </select>
        <button onclick="app.exportSouvenirStampsCSV('${scope}')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>匯出派發紀錄 CSV</button>
        <button onclick="app.printCoordArea('stamp-print-${scope}','紀念章派發紀錄（${escapeHtml(def.label)}）')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印名單</button>
      </div>
      <div id="stamp-print-${scope}" class="bg-white border rounded-xl p-3">
        <div class="table-responsive"><table class="min-w-full text-[11px] border" id="stamp-table-${scope}">
          <thead class="bg-slate-100"><tr>
            <th class="border px-2 py-1">派發<br>(TICK)</th><th class="border px-2 py-1 text-left">姓名</th><th class="border px-2 py-1 text-left">組別</th><th class="border px-2 py-1 text-left">${scope==='guests'?'職銜':'職位'}</th><th class="border px-2 py-1 text-left">派發紀錄</th><th class="border px-2 py-1 text-left">備註</th>
          </tr></thead>
          <tbody>${rows||`<tr><td colspan="6" class="border px-2 py-4 text-center text-slate-400">暫無${escapeHtml(def.label)}名單</td></tr>`}</tbody>
        </table></div>
        <p class="text-[10px] text-slate-400 mt-2">${scope==='guests'
          ?'嘉賓名單來自「執行手冊 → 典禮儀式 → 嘉賓名單」，唔可以改名（冇代嘉賓）；如名單有變請先改嘉賓名單。派發由行政組及嘉賓接待組管理。'
          :'工作人員名單來自開戶用戶＋組織架構與聯絡表（活動前已有全人名）；有工作人員改名／替假，請喺「備註」註明實際領取人。派發由行政組管理。'}</p>
      </div>
    </div>`;
  }
,
  /* —— TICK 派發（記錄派咗俾邊個、幾時、邊個派）—— */
  toggleSouvenirStamp(scope,key,el){
    if(!this.canManageSouvenirStamps(scope)){ showToast('紀念章派發由'+(SOUVENIR_STAMP_MANAGERS[scope]||[]).join('・')+'管理','error'); if(el) el.checked=!el.checked; return; }
    const person=this.souvenirRoster(scope).find(p=>p.key===key)||{key,name:key,group_name:''};
    const data=this.getSouvenirStampData();
    const map=data[scope]||{};
    const now=new Date();
    const stamp=`${now.toLocaleDateString('zh-HK')} ${now.toTimeString().slice(0,5)}`;
    const e=map[key]||{};
    const ticked=el?!!el.checked:!e.ticked;
    e.name=person.name; e.group_name=person.group_name||''; e.job_title=person.job_title||person.title||'';
    if(ticked){
      e.ticked=true; e.ticked_at=stamp; e.ticked_by=this.currentUser?.name||''; e.ticked_by_id=this.currentUser?.user_id||'';
    }else{
      e.ticked=false; e.ticked_at=''; e.ticked_by=''; e.ticked_by_id='';
    }
    e.updated_at=now.toISOString();
    if(!e.created_at) e.created_at=e.updated_at;
    map[key]=e; data[scope]=map;
    this.saveSouvenirStampData(data,{scope,key,row:e});
    // 只更新呢一行＋頂部數字（唔重畫成個表，避免搜尋關鍵字消失）
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
    showToast(ticked?`已記錄派發紀念章俾 ${person.name}`:`已取消 ${person.name} 嘅派發紀錄`,'success');
  }
,
  /* —— 備註（工作人員版专用：紀錄改名／替假）—— */
  saveSouvenirStampRemark(scope,key,value){
    if(!this.souvenirStampScopeDef(scope).canRename){ showToast('嘉賓名單唔可以改名','warning'); return; }
    if(!this.canManageSouvenirStamps(scope)){ showToast('紀念章派發由'+(SOUVENIR_STAMP_MANAGERS[scope]||[]).join('・')+'管理','error'); return; }
    const person=this.souvenirRoster(scope).find(p=>p.key===key)||{key,name:key,group_name:''};
    const data=this.getSouvenirStampData();
    const map=data[scope]||{};
    const e=map[key]||{};
    e.name=person.name; e.group_name=person.group_name||''; e.job_title=person.job_title||'';
    e.remark=String(value||'').trim();
    e.updated_at=new Date().toISOString();
    if(!e.created_at) e.created_at=e.updated_at;
    map[key]=e; data[scope]=map;
    this.saveSouvenirStampData(data,{scope,key,row:e});
    showToast(e.remark?`已記錄備註：${person.name} — ${e.remark}`:`已清除 ${person.name} 嘅備註`,'success');
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
    const head=['姓名','組別',(scope==='guests'?'職銜':'職位'),'已派發','派發時間','派發人','備註'];
    const esc=s=>`"${String(s??'').replace(/"/g,'""')}"`;
    const rows=roster.map(p=>{
      const e=map[p.key]||{};
      return [p.name,p.group_name,p.job_title||p.title||'',e.ticked?'已派發':'未派發',e.ticked_at||'',e.ticked_by||'',e.remark||''].map(esc).join(',');
    });
    const csv='\ufeff'+[head.map(esc).join(','),...rows].join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=`紀念章派發紀錄_${def.label}.csv`; a.click();
    showToast('已匯出紀念章派發紀錄','success');
  }
,
});
