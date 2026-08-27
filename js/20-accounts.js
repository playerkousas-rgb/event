/* 20-accounts.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== 開戶 + 權限管理 (總主任以上) ===================== */
  // 我可授權的下級（同組 + 層級比我低；管理員看全部）
  getMySubordinates(){
    const u=this.currentUser; if(!u) return [];
    const myLvl=this.roleLevel(u.role);
    const iAmSuper=this.isSuperAdmin();
    const isAdmin=this.isAdmin()||myLvl>=100;
    return (this.usersList||[]).filter(x=>{
      if(!x || x.user_id===u.user_id) return false;
      if(!iAmSuper && this.isSuperAdminUser(x)) return false; // 系統帳戶不會出現喺其他人嘅下級名單
      const lvl=this.roleLevel(x.role);
      if(isAdmin) return true;
      if(lvl>=myLvl) return false;         // 只能授權給層級比自己低的下級
      return (x.group_name||'')===(u.group_name||''); // 同組
    });
  }
,
  // 我自己的「看/管」集合（有授權用授權，否則按角色/組別推算）
  getMyPermSets(){
    const see=PERM_CARDS.filter(c=>{ const d=DASH_CARD_DEFS.find(x=>x.id===c.id); return d&&this.canSeeRoleCard(d); }).map(c=>c.id);
    const edit=PERM_CARDS.filter(c=>{ const d=DASH_CARD_DEFS.find(x=>x.id===c.id); return d&&this.canEditRoleCard(d); }).map(c=>c.id);
    return {see, edit};
  }
,
  // 計算任一用戶的「現有／職級預設」看管權（不改 currentUser）。未自訂 perm_see 時，主席／顧問／管理員／執行副主席＝全權。
  permSetsFor(user){
    if(!user) return {see:[], edit:[]};
    const prev=this.currentUser;
    this.currentUser=user;
    try{ return this.getMyPermSets(); }
    finally{ this.currentUser=prev; }
  }
,
  permSourceLabel(user){
    if(Array.isArray(user?.perm_see)||Array.isArray(user?.perm_edit)) return '已自訂';
    return (ROLE_LABELS[user?.role]||user?.role||'職級')+'預設';
  }
,
  permOverviewHTML(user){
    const p=this.permSetsFor(user);
    const src=this.permSourceLabel(user);
    const chips=PERM_CARDS.map(c=>{
      const see=p.see.includes(c.id), edit=p.edit.includes(c.id);
      if(!see&&!edit) return '';
      const cls=edit?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-sky-50 text-sky-800 border-sky-200';
      return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] ${cls}">${escapeHtml(c.label)} ${edit?'看+管':'只看'}</span>`;
    }).join('');
    return `<div class="mt-1.5 text-[11px] text-slate-600">現有權限（${escapeHtml(src)}）：可看 ${p.see.length}／可管 ${p.edit.length}</div><div class="mt-1 flex flex-wrap gap-1 max-h-24 overflow-y-auto">${chips||'<span class="text-[10px] text-slate-400">無卡片權限</span>'}</div>`;
  }
,
  restoreRoleDefaultPerms(){
    const target=document.getElementById('perm-target')?.value;
    if(!target) return;
    if(!this.pendingUsers) this.pendingUsers=JSON.parse(JSON.stringify(this.usersList||[]));
    const u=(this.pendingUsers||[]).find(x=>x.user_id===target);
    if(!u){ showToast('找不到該用戶','error'); return; }
    const roleUser={...u}; delete roleUser.perm_see; delete roleUser.perm_edit;
    const p=this.permSetsFor(roleUser);
    u.perm_see=p.see.slice();
    u.perm_edit=p.edit.slice();
    this.openPermissionEditor(target);
    showToast('已還原職級預設權限（尚未寫入，請按儲存後再「確定更新用戶」）','');
  }
,
  canOpenAccounts(){ return (ROLE_HIERARCHY[this.currentUser?.role]||0)>=40 || this.isAdmin(); }
,
  renderAccountSetupModule(){
    const container=document.getElementById('module-content');
    if(!container) return;
    if(!this.canOpenAccounts()){ container.innerHTML='<p class="text-xs text-slate-400">僅總主任或以上可開戶</p>'; return; }
    const u=this.currentUser;
    const myGroup=u.group_name||'';
    const isAdmin=this.isAdmin();
    const roleOptions=accountSetupRoleOptions('',isAdmin);
    const myAccounts=(this.usersList||[]).filter(x=>isAdmin?true:(x.group_name||'')===myGroup);
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-teal-50 border border-teal-200 rounded-xl p-3 text-[11px] leading-relaxed text-teal-900">
          <b><i class="fa-solid fa-user-plus mr-1"></i>開戶（預設密碼 1234，登入後自行修改）：</b><br>
          • 總主任或以上可為<b>本組</b>開戶（管理員可跨組）<br>
          • 職級僅提供 <b>工作人員／主任／總主任</b>；管理員（如秘書處受薪職員）可另開「管理員」級帳戶（副主席及以上已確定，由管理員直接處理）<br>
          • <b>登入帳號留空＝自動用中文姓名</b>（例：朱家聰），同名自動加 -2/-3；預設密碼 1234
        </div>
        <div class="bg-white border rounded-xl p-4 space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label class="text-[11px] font-bold">名字 *</label><input id="acc-name" placeholder="姓名" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
            <div><label class="text-[11px] font-bold">職位層級 *</label><select id="acc-role" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1">${roleOptions}</select></div>
            <div><label class="text-[11px] font-bold">職稱</label><input id="acc-job" placeholder="例如 總主任（協調）" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
            <div><label class="text-[11px] font-bold">組別 *</label>${isAdmin?`<select id="acc-group" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1">${orgGroupOptions(myGroup)}</select>`:`<select id="acc-group" disabled class="w-full px-3 py-2 border rounded-xl text-sm bg-slate-50 mt-1">${orgGroupOptions(myGroup)}</select>`}</div>
            <div><label class="text-[11px] font-bold">登入帳號（可留空＝自動用中文名）</label><input id="acc-id" placeholder="留空自動用中文姓名作登入帳號" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
            <div><label class="text-[11px] font-bold">電郵（選填）</label><input id="acc-email" placeholder="name@example.com" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
          </div>
          <button onclick="app.submitAccountSetup()" class="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-user-plus mr-1"></i>開戶</button>
        </div>
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-sm mb-2">本組帳戶 (${myAccounts.length})</h4>
          <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">名字</th><th class="px-2 py-1 text-left">職稱</th><th class="px-2 py-1 text-left">層級</th><th class="px-2 py-1 text-left">組別</th><th class="px-2 py-1 text-left">帳號</th></tr></thead><tbody class="divide-y">${myAccounts.map(x=>`<tr><td class="px-2 py-1 font-medium" data-label="名字">${escapeHtml(x.name)}</td><td class="px-2 py-1" data-label="職稱">${escapeHtml(x.job_title||'')}</td><td class="px-2 py-1" data-label="層級">${escapeHtml(ROLE_LABELS[x.role]||x.role)}</td><td class="px-2 py-1" data-label="組別">${escapeHtml(x.group_name||'')}</td><td class="px-2 py-1 font-mono" data-label="帳號">${escapeHtml(x.user_id||'')}</td></tr>`).join('')||'<tr><td colspan="5" class="px-2 py-4 text-center text-slate-400">暫無帳戶</td></tr>'}</tbody></table></div>
        </div>
        ${this.canBulkOnboard()?`
        <div class="bg-white border rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h4 class="font-bold text-sm"><i class="fa-solid fa-users-gear text-teal-600 mr-1"></i>快速批量開戶（逐行新增，一次過開） <span class="text-[10px] bg-teal-100 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">管理員專用</span></h4>
            <div class="flex gap-2"><button onclick="app.addQuickBulkRow()" class="bg-slate-100 border px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-plus mr-1"></i>加一行</button><button onclick="app.submitQuickBulk()" class="bg-teal-600 text-white px-4 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-user-plus mr-1"></i>全部開戶</button></div>
          </div>
          <div class="bg-teal-50 border border-teal-200 rounded-xl p-3 text-[11px] leading-relaxed text-teal-900">
            • 每行填：<b>中文姓名</b>（登入帳號自動＝中文名，同名自動加 -2/-3）、職稱、職級、組別<br>
            • 預設密碼 <b>1234</b>；開完即出現於「本組帳戶」清單，可即時發給同事登入
          </div>
          <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left w-32">中文姓名 *</th><th class="px-2 py-1 text-left">職稱</th><th class="px-2 py-1 text-left w-28">職級</th><th class="px-2 py-1 text-left">組別</th><th class="px-2 py-1 text-left">登入帳號（留空=中文名）</th><th class="px-2 py-1 text-right w-14">刪</th></tr></thead><tbody id="quick-bulk-tbody"></tbody></table></div>
          <div id="quick-bulk-result" class="hidden bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900"></div>
        </div>
        <div class="bg-white border rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h4 class="font-bold text-sm"><i class="fa-solid fa-file-csv text-amber-600 mr-1"></i>批量開戶（CSV/JSON 上傳） <span class="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">管理員專用</span></h4>
            <button onclick="app.downloadUsersTemplate()" class="bg-amber-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載範本 CSV</button>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900">
            • Excel 填好範本後上傳，預覽無誤再一次過開戶；<b>ID 重複會自動跳過，不覆蓋舊帳及已改密碼</b><br>
            • 範本有填 <b>password</b> → 可登入帳號；只填 帳號+姓名 → 僅加入名單（不可登入）。後端開戶一律預設密碼 1234<br>
            • 建議先試 2-3 筆，確認無誤再全團匯入
          </div>
          <div class="flex flex-wrap gap-2 items-center">
            <label class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"><i class="fa-solid fa-upload mr-1"></i>上傳已填 CSV<input type="file" accept=".csv,.json" class="hidden" onchange="app.handleAccBulkCSV(this.files[0])"></label>
            <span class="text-[10px] text-slate-400">或</span>
            <button onclick="app.previewAccBulkJSON()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-code mr-1"></i>由下方 JSON 預覽</button>
          </div>
          <textarea id="acc-bulk-json" rows="3" placeholder='[{"user_id":"陳小明","name":"陳小明","role":"staff","group_name":"主題節目組","password":"1234"}]' class="w-full p-3 border rounded-xl text-xs font-mono"></textarea>
          <div id="acc-bulk-preview" class="hidden">
            <div class="flex justify-between items-center mt-1"><h5 class="font-bold text-xs">預覽 <span id="acc-bulk-count" class="bg-slate-900 text-white px-2 py-0.5 rounded-full text-[10px]">0</span> 筆</h5><button onclick="app.confirmAccBulkCreate()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-check mr-1"></i>確認批量開戶</button></div>
            <div id="acc-bulk-table" class="table-responsive mt-2 max-h-56 overflow-y-auto border rounded-xl"></div>
          </div>
        </div>`:''}
      </div>
    `;
    if(this.canBulkOnboard()) this.renderQuickBulkTable();
  }
,
  /* ── 快速批量開戶（管理員）：逐行中文名，一次過開 ── */
  renderQuickBulkTable(){
    const tb=document.getElementById('quick-bulk-tbody'); if(!tb) return;
    if(!this._quickBulkRows || !this._quickBulkRows.length) this._quickBulkRows=[{name:'',job:'',role:'staff',group:''}];
    const roleOptions=accountSetupRoleOptions('',this.isAdmin());
    tb.innerHTML=this._quickBulkRows.map((row,i)=>`
      <tr class="border-b">
        <td class="px-1 py-1"><input class="qb-name w-full px-2 py-1.5 border rounded-lg text-xs" placeholder="中文姓名" value="${escapeHtml(row.name)}"></td>
        <td class="px-1 py-1"><input class="qb-job w-full px-2 py-1.5 border rounded-lg text-xs" placeholder="例如 總主任（協調）" value="${escapeHtml(row.job)}"></td>
        <td class="px-1 py-1"><select class="qb-role w-full px-2 py-1.5 border rounded-lg text-xs bg-white">${roleOptions.replace('<option value="'+row.role+'"','<option value="'+row.role+'" selected')}</select></td>
        <td class="px-1 py-1"><select class="qb-group w-full px-2 py-1.5 border rounded-lg text-xs bg-white">${orgGroupOptions(row.group)}</select></td>
        <td class="px-1 py-1"><input class="qb-uid w-full px-2 py-1.5 border rounded-lg text-xs" placeholder="留空＝中文名" value="${escapeHtml(row.uid||'')}"></td>
        <td class="px-1 py-1 text-right"><button onclick="app.removeQuickBulkRow(${i})" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-lg text-[10px]">✕</button></td>
      </tr>`).join('');
  }
,
  addQuickBulkRow(){
    if(!this.canBulkOnboard()) return;
    const rows=this.collectQuickBulkRows();
    rows.push({name:'',job:'',role:'staff',group:''});
    this._quickBulkRows=rows;
    this.renderQuickBulkTable();
  }
,
  removeQuickBulkRow(i){
    if(!this.canBulkOnboard()) return;
    const rows=this.collectQuickBulkRows();
    rows.splice(i,1);
    if(!rows.length) rows.push({name:'',job:'',role:'staff',group:''});
    this._quickBulkRows=rows;
    this.renderQuickBulkTable();
  }
,
  collectQuickBulkRows(){
    const tb=document.getElementById('quick-bulk-tbody'); if(!tb) return this._quickBulkRows||[];
    return [...tb.querySelectorAll('tr')].map(tr=>({
      name:(tr.querySelector('.qb-name')?.value||'').trim(),
      job:(tr.querySelector('.qb-job')?.value||'').trim(),
      role:tr.querySelector('.qb-role')?.value||'staff',
      group:tr.querySelector('.qb-group')?.value||'',
      uid:(tr.querySelector('.qb-uid')?.value||'').trim()
    }));
  }
,
  async submitQuickBulk(){
    if(!this.canBulkOnboard()){ showToast('僅管理員可用','error'); return; }
    const rows=this.collectQuickBulkRows().filter(r=>r.name);
    if(!rows.length){ showToast('請至少填寫一行中文姓名','error'); return; }
    if(!confirm(`確認一次過開 ${rows.length} 個帳戶？預設密碼 1234`)) return;
    const result=document.getElementById('quick-bulk-result');
    if(result) result.classList.remove('hidden');
    const used=new Set((this.usersList||[]).map(u=>u.user_id));
    let ok=0, fail=[];
    for(const r of rows){
      if(!canSetupRole(r.role,this.isAdmin())){ fail.push(`${r.name}：副主席及以上職級由管理員處理`); continue; }
      let uid=r.uid||r.name;
      if(used.has(uid)){ let base=uid, n=2; while(used.has(base+'-'+n)) n++; uid=base+'-'+n; }
      used.add(uid);
      const payload={action:'createAccount',api_key:this.apiKey,name:r.name,role:r.role,job_title:r.job,group_name:r.group,user_id:uid,email:'',contact:'',by_role:this.currentUser.role,by_group:this.currentUser.group_name};
      try{
        if(!this.mockMode && this.gasUrl){
          const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload)});
          const j=await res.json();
          if(j&&j.success){ ok++; }
          else fail.push(`${r.name}：${j&&j.error||'失敗'}`);
        }else{
          const list=this.getLocalUsers();
          list.push({user_id:uid,name:r.name,role:r.role,group_name:r.group,job_title:r.job,email:'',contact:'',password:'1234',status:'active',can_tick:false});
          this.setLocalUsers(list); ok++;
        }
      }catch(e){ fail.push(`${r.name}：${e.message}`); }
    }
    await this.loadUsers();
    if(result) result.innerHTML=`<b>完成：成功 ${ok} 筆</b>${fail.length?`<br>失敗 ${fail.length} 筆：${escapeHtml(fail.join('；'))}`:''}`;
    showToast(`批量開戶完成：成功 ${ok} 筆${fail.length?'，失敗 '+fail.length+' 筆':''}`, fail.length?'warning':'success');
    this._quickBulkRows=[{name:'',job:'',role:'staff',group:''}];
    this.renderQuickBulkTable();
    this.renderAccountSetupModule();
  }
,
  // 批量開戶：僅管理員（從獨立「用戶·批量」卡片併入此處）
  canBulkOnboard(){ return ['super_admin','admin'].includes(this.currentUser?.role); }
,
  normalizeBulkRows(rows){
    return (rows||[]).map(r=>({user_id:String(r.user_id||r.ymis||'').trim(),name:String(r.name||'').trim(),email:r.email||'',role:r.role||'staff',group_name:r.group_name||r.group||'主題節目組',contact:r.contact||'',password:r.password||'1234',job_title:r.job_title||r.job_desc||'',can_tick:!!r.can_tick})).filter(r=>r.user_id&&r.name);
  }
,
  renderAccBulkPreview(){
    const box=document.getElementById('acc-bulk-preview'); if(!box) return;
    box.classList.remove('hidden');
    document.getElementById('acc-bulk-count').textContent=this.bulkPending.length;
    document.getElementById('acc-bulk-table').innerHTML=`<table class="min-w-full text-xs"><thead class="bg-slate-100 sticky top-0"><tr><th class="px-2 py-1 text-left">帳號</th><th class="px-2 py-1 text-left">姓名</th><th class="px-2 py-1 text-left">層級</th><th class="px-2 py-1 text-left">組別</th><th class="px-2 py-1 text-left">可登入</th></tr></thead><tbody class="divide-y">${this.bulkPending.map(r=>`<tr><td class="px-2 py-1 font-mono">${escapeHtml(r.user_id)}</td><td class="px-2 py-1">${escapeHtml(r.name)}</td><td class="px-2 py-1">${escapeHtml(ROLE_LABELS[r.role]||r.role)}</td><td class="px-2 py-1">${escapeHtml(r.group_name)}</td><td class="px-2 py-1">${r.password?'✅':'—'}</td></tr>`).join('')}</tbody></table>`;
  }
,
  handleAccBulkCSV(file){
    if(!this.canBulkOnboard()){ showToast('批量開戶僅管理員可用','error'); return; }
    if(!file){ showToast('請選擇檔案','warning'); return; }
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        let rows=[];
        if(file.name.endsWith('.json')){ const j=JSON.parse(e.target.result); rows=Array.isArray(j)?j:[j]; }
        else rows=parseCSV(e.target.result);
        this.bulkPending=this.normalizeBulkRows(rows);
        if(!this.bulkPending.length){ showToast('解析不到有效資料（需要 user_id/ymis + name）','error'); return; }
        this.renderAccBulkPreview();
        showToast(`已解析 ${this.bulkPending.length} 筆，請預覽確認`,'success');
      }catch(err){ showToast('檔案解析失敗：'+err.message,'error'); }
    };
    reader.readAsText(file);
  }
,
  previewAccBulkJSON(){
    if(!this.canBulkOnboard()){ showToast('批量開戶僅管理員可用','error'); return; }
    const text=(document.getElementById('acc-bulk-json')?.value||'').trim();
    if(!text){ showToast('請先貼上 JSON 陣列','warning'); return; }
    try{ let arr=JSON.parse(text); if(!Array.isArray(arr)) arr=[arr]; this.bulkPending=this.normalizeBulkRows(arr); if(!this.bulkPending.length){ showToast('無有效資料（需要 user_id + name）','error'); return; } this.renderAccBulkPreview(); showToast(`已解析 ${this.bulkPending.length} 筆`,'success'); }
    catch(e){ showToast('JSON 格式錯誤','error'); }
  }
,
  async confirmAccBulkCreate(){
    if(!this.canBulkOnboard()){ showToast('批量開戶僅管理員可用','error'); return; }
    if(!this.bulkPending.length){ showToast('無資料','warning'); return; }
    // 1) 本地名單（所有事件的小組資料庫；示範沙盒只留此步）
    let list=this.getLocalUsers(); let added=0; const existing=new Set(list.map(u=>u.user_id)); const newRows=[];
    this.bulkPending.forEach(r=>{ if(!existing.has(r.user_id)){ const row={user_id:r.user_id,name:r.name,email:r.email,role:r.role,group_name:r.group_name,contact:r.contact,job_title:r.job_title||'',password:r.password||'1234',status:'active',can_tick:r.can_tick}; list.push(row); newRows.push(row); added++; } });
    this.setLocalUsers(list);
    // 2) 正式活動 + 已連後端：逐筆呼叫後端 createAccount 寫入 Users 表（best-effort；重複 ID 後端亦會跳過）
    let gasMsg='';
    if(!this.isDemoEvent() && this.gasUrl && newRows.length){
      let ok=0,fail=0;
      for(const r of newRows){
        try{
          const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'createAccount',api_key:this.apiKey,name:r.name,role:r.role,job_title:r.job_title||'',group_name:r.group_name,user_id:r.user_id,email:r.email,contact:r.contact,by_role:this.currentUser.role,by_group:this.currentUser.group_name})});
          const j=await res.json(); if(j&&j.success) ok++; else fail++;
        }catch(e){ fail++; }
      }
      gasMsg=`；後端已寫 ${ok} 筆${fail?`（${fail} 筆失敗/已存在）`:''}`;
    }
    this.bulkPending=[];
    showToast(`批量完成 成功 ${added} 筆${gasMsg}`,'success');
    await this.loadUsers(); this.renderAccountSetupModule();
  }
,
  async submitAccountSetup(){
    if(!this.canOpenAccounts()){ showToast('僅總主任或以上可開戶','error'); return; }
    const name=(document.getElementById('acc-name')?.value||'').trim();
    const role=(document.getElementById('acc-role')?.value||'staff');
    const job=(document.getElementById('acc-job')?.value||'').trim();
    const group=(document.getElementById('acc-group')?.value||'').trim();
    let uid=(document.getElementById('acc-id')?.value||'').trim();
    const email=(document.getElementById('acc-email')?.value||'').trim();
    if(!name){ showToast('請填寫名字','error'); return; }
    if(!canSetupRole(role,this.isAdmin())){ showToast('此職級不可在此開設（副主席及以上由管理員處理）','error'); return; }
    // 帳號留空＝自動用中文姓名作登入帳號；同名自動加 -2/-3
    if(!uid) uid=name;
    const used=new Set((this.usersList||[]).map(u=>u.user_id));
    if(used.has(uid)){ let base=uid, n=2; while(used.has(base+'-'+n)) n++; uid=base+'-'+n; }
    const myLvl=this.roleLevel(this.currentUser.role);
    if(ROLE_HIERARCHY[role]>myLvl){ showToast('不可開設層級比自己高的帳戶','error'); return; }
    if(!group){ showToast('請填寫組別','error'); return; }
    const payload={action:'createAccount',api_key:this.apiKey,name,role,job_title:job,group_name:group,user_id:uid,email,contact:'',by_role:this.currentUser.role,by_group:this.currentUser.group_name};
    if(!this.mockMode && this.gasUrl){
      try{
        const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload)});
        const j=await res.json();
        if(j&&j.success){ showToast(j.message||'已開戶','success'); await this.loadUsers(); this.renderAccountSetupModule(); }
        else showToast('開戶失敗：'+(j&&j.error||'未知錯誤'),'error');
      }catch(e){ showToast('無法連線後端：'+e.message,'error'); }
      return;
    }
    // Mock 模式：本地新增
    const list=this.getLocalUsers();
    if(list.some(x=>x.user_id===uid)){ showToast('帳號已存在','error'); return; }
    list.push({user_id:uid||name,name,role,group_name:group,job_title:job,email,contact:'',password:'1234',status:'active',can_tick:false});
    this.setLocalUsers(list);
    await this.loadUsers();
    showToast('已開戶（示範，密碼 1234）','success');
    this.renderAccountSetupModule();
  }
,
  renderPermissionsModule(){
    const container=document.getElementById('module-content');
    if(!container) return;
    if(!this.currentUser||this.roleLevel(this.currentUser.role)<40){ container.innerHTML='<p class="text-xs text-slate-400">權限管理只供總主任以上使用</p>'; return; }
    const mine=this.getMyPermSets();
    const subs=this.getMySubordinates();
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed text-indigo-900">
          <b><i class="fa-solid fa-key mr-1"></i>權限管理：</b>每位用戶已按職級帶有預設權限（例如主席／顧問／管理員／執行副主席＝全看全管），編輯時會先顯示現有權限，只需改要調整的項目。<br>
          • 我「可看」${mine.see.length} 張卡片、「可管」${mine.edit.length} 張卡片<br>
          • 授權給下級時，只能勾選<b>你自己也有的</b>卡片；授出「看」後，才能授「管」
        </div>
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-sm mb-3">我的下級 (${subs.length})</h4>
          ${subs.length===0?'<p class="text-xs text-slate-400">暫無可授權的下級（同組、層級比你低）</p>':`
          <div class="space-y-2">${subs.map(s=>{
            const p=this.permSetsFor(s);
            return `<div class="border rounded-xl p-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div class="min-w-0"><b class="text-[13px]">${escapeHtml(s.name)}</b> ${s.job_title?`<span class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">${escapeHtml(s.job_title)}</span>`:''}<span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border">${escapeHtml(ROLE_LABELS[s.role]||s.role)}</span>
                <div class="text-[11px] text-slate-500 mt-1">${escapeHtml(s.group_name||'')} · ${escapeHtml(this.permSourceLabel(s))} · 看 ${p.see.length} / 管 ${p.edit.length}</div>
                ${this.permOverviewHTML(s)}</div>
              <button onclick="app.openPermissionEditor('${escapeHtml(s.user_id)}')" class="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">編輯權限</button>
            </div>`;}).join('')}
          </div>`}
        </div>
      </div>
    `;
  }
,
  openPermissionEditor(userId){
    if(!this.currentUser){ showToast('請先登入','error'); return; }
    const sub=(this.pendingUsers||this.usersList||[]).find(x=>x.user_id===userId);
    if(!sub){ showToast('找不到該用戶','error'); return; }
    const mine=this.getMyPermSets();
    const theirs=this.permSetsFor(sub);
    const see=theirs.see;
    const edit=theirs.edit;
    const rows=PERM_CARDS.map(c=>{
      const canSee=mine.see.includes(c.id);
      const canEdit=mine.edit.includes(c.id)&&canSee;
      if(!canSee) return '';
      return `<tr><td class="px-2 py-1">${c.icon?`<i class="${c.icon} text-slate-400 mr-1"></i>`:''}${escapeHtml(c.label)}</td>
        <td class="px-2 py-1 text-center"><input type="checkbox" id="psee-${c.id}" ${see.includes(c.id)?'checked':''} onchange="app.onPermSeeToggle('${c.id}')"></td>
        <td class="px-2 py-1 text-center">${canEdit?`<input type="checkbox" id="pedit-${c.id}" ${edit.includes(c.id)?'checked':''}>`:'<span class="text-[10px] text-slate-400">無</span>'}</td></tr>`;
    }).join('');
    document.getElementById('record-modal-title').textContent=`授權給 ${sub.name}（看 / 管）`;
    document.getElementById('record-form-fields').innerHTML=`
      <input type="hidden" id="perm-target" value="${escapeHtml(userId)}">
      <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-[11px] text-indigo-900 leading-relaxed mb-2">已按<strong>現有／${escapeHtml(this.permSourceLabel(sub))}</strong>勾選（可看 ${see.length}／可管 ${edit.length}）。例如主席本身已有全權限，無需由零開始重新勾選；只需改要調整的項目。</div>
      <div class="flex flex-wrap gap-2 mb-2"><button type="button" onclick="app.restoreRoleDefaultPerms()" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold">還原職級預設</button></div>
      <div class="text-[11px] text-slate-500 mb-2">勾選「看」可查看該卡片；勾選「管」可編輯該卡片內容。你只能授出自己有的權利。</div>
      <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">卡片</th><th class="px-2 py-1 text-center">可看</th><th class="px-2 py-1 text-center">可管</th></tr></thead><tbody>${rows||'<tr><td colspan="3" class="px-2 py-4 text-center text-slate-400">你目前沒有可授權的卡片</td></tr>'}</tbody></table></div>
    `;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitPermissionEditor(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  onPermSeeToggle(cardId){
    const seeChk=document.getElementById('psee-'+cardId);
    const editChk=document.getElementById('pedit-'+cardId);
    if(editChk && !seeChk.checked){ editChk.checked=false; }
  }
,
  async submitPermissionEditor(){
    const target=document.getElementById('perm-target').value;
    const mine=this.getMyPermSets();
    const perm_see=[], perm_edit=[];
    PERM_CARDS.forEach(c=>{
      if(!mine.see.includes(c.id)) return;
      const sc=document.getElementById('psee-'+c.id);
      if(sc && sc.checked) perm_see.push(c.id);
      const ec=document.getElementById('pedit-'+c.id);
      if(ec && ec.checked && perm_see.includes(c.id)) perm_edit.push(c.id);
    });
    if(!this.pendingUsers) this.pendingUsers=JSON.parse(JSON.stringify(this.usersList||[]));
    const u=(this.pendingUsers||[]).find(x=>x.user_id===target);
    if(u){ u.perm_see=perm_see; u.perm_edit=perm_edit; }
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('權限已暫存，請按「確定更新用戶」才套用','');
    this.renderUsers();
  }
,
});
