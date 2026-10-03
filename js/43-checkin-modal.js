/* 43-checkin-modal.js — 統一「快速點名」Modal（免轆頂可關閉）
   適用：典禮嘉賓點名、紀念章派發（工作人員／嘉賓）、代訂餐盒派發、旅團點名簽收。
   特色：
   ① 置頂置底 Sticky（標題＋關閉掣永遠喺畫面內，唔會轆走）
   ② 搜尋（姓名／職銜／單位）＋排序（攤位／組別／姓名／未點名優先）即刻即見
   ③ 剔即寫狀態，撳「儲存」一次過併入（同各分子點名規則一致） */
Object.assign(ScoutEventApp.prototype,{

  /* rows: [{key,name,sub,group,booth,checked}]
     opts: {title, accent:'rose'|'emerald'|'fuchsia'|'sky', onSave(checkedSet), blob?:string, sortOptions:[{k:'booth|group|name|sub|pending',label},...], tickLabel} */
  openCheckinModal(rows, opts){
    opts=opts||{};
    const rowsAll=(rows||[]).slice();
    if(!rowsAll.length){ showToast('名單暫時為空','warning'); return; }
    const accent=opts.accent||'rose';
    this._ckState=Object.fromEntries(rowsAll.map(r=>[r.key,!!r.checked]));
    this._ckSort=opts.initialSort||(opts.sortOptions&&opts.sortOptions[0]&&opts.sortOptions[0].k)||'group';
    this._ckQ='';
    this._ckOpts=opts;
    this._ckRows=rowsAll;

    const modal=document.getElementById('modal-record');
    const title=document.getElementById('record-modal-title');
    const fields=document.getElementById('record-form-fields');
    const form=document.getElementById('record-form');
    if(!modal||!fields||!form) return;
    title.textContent=opts.title||'快速點名';
    fields.innerHTML=this._checkinModalFieldsHTML();
    const self=this;
    form.onsubmit=(e)=>{
      e.preventDefault();
      const checked=new Set(Object.keys(self._ckState).filter(k=>self._ckState[k]));
      if(opts.onSave) opts.onSave(checked);
      else self.closeModal('modal-record');
    };
    // 提交掣標籤
    const submitBtn=form.querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.textContent=opts.saveLabel||'儲存點名';
    modal.classList.remove('hidden');
    this.bindCheckinControls();
  },

  _checkinModalFieldsHTML(){
    const opts=this._ckOpts||{};
    const sortOpts=(opts.sortOptions&&opts.sortOptions.length?opts.sortOptions:[
      {k:'group',label:'按組別／攤位'},{k:'name',label:'按姓名'},{k:'sub',label:'按職銜／項目'},{k:'pending',label:'未點名優先'}
    ]).map(o=>`<option value="${o.k}" ${this._ckSort===o.k?'selected':''}>${escapeHtml(o.label)}</option>`).join('');
    return `<div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <input id="ck-search" value="${escapeHtml(this._ckQ||'')}" placeholder="${escapeHtml(opts.searchPlaceholder||'🔍 搜尋姓名／職銜／攤位／組別')}" oninput="app._ckQ=this.value;app.renderCheckinRows();" class="flex-1 min-w-[160px] px-3 py-2 border rounded-xl text-sm">
        <select id="ck-sort" onchange="app._ckSort=this.value;app.renderCheckinRows();" class="border rounded-lg px-2 py-2 text-sm bg-white">${sortOpts}</select>
      </div>
      <div class="bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold flex items-center justify-between flex-wrap gap-2">
        <span>已到／已剔 <span id="ck-count" class="text-emerald-700"></span> / <span id="ck-total"></span></span>
        <span class="text-[10px] text-slate-400 font-normal">${escapeHtml(opts.hint||'剔一格=已點名，儲存後一次過記錄')}</span>
      </div>
      <div id="ck-rows" class="space-y-2 max-h-[52vh] overflow-y-auto"></div>
    </div>`;
  },

  bindCheckinControls(){
    this.renderCheckinRows();
  },

  renderCheckinRows(){
    const box=document.getElementById('ck-rows'); if(!box) return;
    const opts=this._ckOpts||{};
    const q=(this._ckQ||'').trim().toLowerCase();
    const rows=(this._ckRows||[]).filter(r=>{
      if(!q) return true;
      const blob=[r.name,r.sub,r.group,r.booth,r.unit].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
    const checked=this._ckState||{};
    const cmp=(a,b)=>{
      if(this._ckSort==='name') return String(a.name||'').localeCompare(String(b.name||''),'zh-Hant');
      if(this._ckSort==='sub') return String(a.sub||'').localeCompare(String(b.sub||''),'zh-Hant');
      if(this._ckSort==='pending'){ const ka=checked[a.key]?1:0, kb=checked[b.key]?1:0; if(ka!==kb) return ka-kb; return String(a.group||a.booth||'').localeCompare(String(b.group||b.booth||''),'zh-Hant')||String(a.name||'').localeCompare(String(b.name||''),'zh-Hant'); }
      if(this._ckSort==='booth'){
        const boothA=String(a.booth||'未編攤位'), boothB=String(b.booth||'未編攤位');
        return boothA.localeCompare(boothB,'zh-Hant',{numeric:true})||String(a.group||'').localeCompare(String(b.group||''),'zh-Hant')||String(a.name||'').localeCompare(String(b.name||''),'zh-Hant');
      }
      // 其他自訂欄位（如 section／unit）：按該欄位後按名稱
      if(this._ckSort!=='group'){
        const av=String(a[this._ckSort]??''), bv=String(b[this._ckSort]??'');
        const v=av.localeCompare(bv,'zh-Hant',{numeric:true});
        if(v) return v;
        return String(a.name||'').localeCompare(String(b.name||''),'zh-Hant');
      }
      // group
      return String(a.group||a.booth||'').localeCompare(String(b.group||b.booth||''),'zh-Hant')||String(a.name||'').localeCompare(String(b.name||''),'zh-Hant');
    };
    rows.sort(cmp);
    const rowMeta=r=>typeof opts.rowMeta==='function'
      ?opts.rowMeta(r)
      :[r.sub,r.group,r.booth,r.unit].filter(Boolean).join(' ｜ ');
    box.innerHTML=rows.map(r=>`<label class="flex items-center gap-3 rounded-xl border bg-white p-3 min-h-[52px] cursor-pointer ${checked[r.key]?'border-emerald-300 bg-emerald-50/50':''}">
      <input type="checkbox" class="ck-check w-6 h-6 accent-emerald-600" data-key="${escapeHtml(r.key)}" ${checked[r.key]?'checked':''}>
      <span class="min-w-0">
        <b class="block text-sm truncate">${escapeHtml(r.name||'')}</b>
        <span class="block text-[11px] text-slate-500 truncate">${escapeHtml(rowMeta(r)||'')}</span>
      </span>
    </label>`).join('');
    box.querySelectorAll('.ck-check').forEach(el=>el.addEventListener('change',()=>{
      this._ckState[el.dataset.key]=el.checked;
      el.closest('label').classList.toggle('border-emerald-300',el.checked);
      el.closest('label').classList.toggle('bg-emerald-50/50',el.checked);
      const n=(this._ckRows||[]).filter(r=>this._ckState[r.key]).length;
      const c=document.getElementById('ck-count'); if(c) c.textContent=n;
    }));
    const cnt=document.getElementById('ck-count'); if(cnt) cnt.textContent=(this._ckRows||[]).filter(r=>this._ckState[r.key]).length;
    const tot=document.getElementById('ck-total'); if(tot) tot.textContent=(this._ckRows||[]).length;
  },

  // 由紀念章派發開啟嘉賓同款快速點名；工作人員只顯示「組別／攤位 + 姓名」。
  openStampCheckinModal(scope, initialSort=''){
    if(!this.canManageSouvenirStamps(scope)){ showToast('紀念章派發由'+(SOUVENIR_STAMP_MANAGERS[scope]||[]).join('・')+'管理','error'); return; }
    const roster=this.souvenirRoster(scope);
    const store=this.getSouvenirStampData();
    const map=store[scope]||{};
    const isStaff=scope==='staff';
    const rows=roster.map(p=>({key:p.key,name:p.name,sub:p.job_title||p.title||'',group:p.group_name||'',booth:p.booth||'',unit:p.unit||'',checked:!!(map[p.key]&&map[p.key].ticked)}));
    this.openCheckinModal(rows,{
      title:isStaff?'紀念章派發點名 — 工作人員':'紀念章派發點名 — 嘉賓',
      saveLabel:`儲存（共 ${rows.length} 位）`,
      hint:isStaff?'剔＝已派發；只顯示組別／攤位及姓名':'剔＝已派發；撳「儲存」一次過入賬，之後再撳頁面「💾 儲存」寫入後端',
      initialSort:initialSort||(isStaff?'group':'group'),
      searchPlaceholder:isStaff?'🔍 搜尋姓名／組別／攤位':'🔍 搜尋姓名／職銜／單位',
      rowMeta:isStaff?(r=>`組別／攤位：${r.booth||r.group||'未分組'}`):null,
      sortOptions:isStaff?[
        {k:'group',label:'按全組成員'},
        {k:'booth',label:'按全攤位成員'},
        {k:'name',label:'按姓名'},
        {k:'pending',label:'未派優先'}
      ]:[
        {k:'group',label:'按單位'},
        {k:'name',label:'按姓名'},
        {k:'sub',label:'按職銜'},
        {k:'pending',label:'未派優先'}
      ],
      onSave:(checked)=>{
        const data=this.getSouvenirStampData();
        const now=new Date();
        const stamp=`${now.toLocaleDateString('zh-HK')} ${now.toTimeString().slice(0,5)}`;
        let nChanged=0;
        rows.forEach(r=>{
          const want=checked.has(r.key);
          const e=(data[scope]||{})[r.key]||{};
          if(!!e.ticked===want) return;
          e.name=r.name; e.group_name=r.group||''; e.job_title=r.sub||''; e.booth=r.booth||''; e.unit=r.unit||'';
          if(want){ e.ticked=true; e.ticked_at=stamp; e.ticked_by=this.currentUser?.name||''; e.ticked_by_id=this.currentUser?.user_id||''; e.correction_cancelled=false; }
          else { e.ticked=false; e.ticked_at=''; e.ticked_by=''; e.ticked_by_id=''; e.correction_cancelled=false; }
          e.updated_at=now.toISOString(); if(!e.created_at) e.created_at=e.updated_at;
          data[scope][r.key]=e; nChanged++;
          // 逐行加入待儲存佇列（沿用既有一口氣儲存機制）
          this.markStampDirty&&this._stampSyncQueue&&(this._stampSyncQueue.set(`${scope}::${r.key}`,{scope,key:r.key,row:e}));
        });
        this.saveSouvenirStampData(data);
        this.closeModal('modal-record');
        this.refreshSouvenirStampsPanel&&this.refreshSouvenirStampsPanel(scope);
        this.updateStampSyncUI&&this.updateStampSyncUI();
        showToast(`點名已暫存（變更 ${nChanged} 項）——記得喺頁面撳「💾 儲存」寫入後端`, nChanged?'success':'warning');
      }
    });
  },

  // 通用 roster 快速點名（代訂餐盒／參加旅團／優異旅團…所有名單共用）
  // 與頁面 TICK 完全同步（寫入同一 store；入班 TICK 只加不減；取消請用頁面「修正」格）
  openRosterCheckinModal(rosterKey){
    const def=this.rosterDef(rosterKey); if(!def) return;
    if(!this.rosterCanTick(rosterKey)){ showToast(`點名須已登入${def.owner_group}（${def.owner_note}）或執行副主席以上`,'error'); return; }
    const view=this.rosterViewRows(rosterKey);
    if(!view.length){ showToast(`${def.title}暫時為空`,'warning'); return; }
    const now=new Date().toISOString(), by=this.currentUser?.name||'', byId=this.currentUser?.user_id||this.currentUser?.id||'';
    const gk=def.group_field||'area';
    const subOf=r=>def.columns.map(c=>String(r[c.k]??'')).filter((s,i)=>i>0&&s).slice(0,2).join(' · ')||'';
    const rows=view.map(r=>({
      key:r._key,
      name:String(r[gk]||r.unit||'—')===String(r.unit||'')?String(r.unit||'—'):(String(r[gk]||'')+' '+String(r.unit||'—')),
      sub:subOf(r),
      group:String(r[gk]||''),
      booth:String(r.booth||r.station||''),
      unit:String(r.unit||''),
      section:String(r.section||''),
      checked:!!r._checked
    }));
    // 排序選項：按其餘 sort_fields（如支部／單位）；分組欄（如區）用 row.group 排列
    const extraFields=(def.sort_fields||[]).filter(f=>f!==gk&&f!=='group');
    const fieldOpts=[{k:'group',label:`按${def.columns.find(c=>c.k===gk)?.label||'組別'}`}]
      .concat(extraFields.filter(f=>rows.some(r=>String(r[f]||''))).map(f=>{const c=def.columns.find(x=>x.k===f);return {k:f,label:`按${c?c.label:f}`};}));
    const sortOpts=[...fieldOpts,{k:'name',label:'按名稱'},{k:'sub',label:'按內容'},{k:'pending',label:`未${def.tick_label}優先`}];
    this.openCheckinModal(rows,{
      title:`📱 快速點名 — ${def.title}`,
      saveLabel:`儲存（共 ${rows.length} 項）`,
      hint:`剔＝已${def.tick_label}；同頁面 TICK 完全同步（只加不減，取消請用頁面「修正」格）`,
      sortOptions:sortOpts,
      onSave:(checked)=>{
        const d=this.getRosterData(); const ticks=d.ticks[rosterKey]=d.ticks[rosterKey]||{};
        let n=0;
        view.forEach(r=>{
          const want=checked.has(r._key);
          const cur=!!r._checked;
          if(want===cur||!want) return;
          const e=Object.assign({},ticks[r._key]||{},{checked:true,by,by_id:byId,at:now,correction:false,note:(ticks[r._key]||{}).note||''});
          ticks[r._key]=e; n++;
        });
        this.saveRosterData(d);
        view.forEach(r=>{ if(ticks[r._key]&&ticks[r._key].checked&&!r._checked) this.rosterSaveTickToGas(rosterKey,def,r,ticks[r._key]); });
        this.closeModal('modal-record');
        this.rosterRefresh&&this.rosterRefresh(rosterKey);
        showToast(`點名已儲存（新增 ${n} 項${def.tick_label}）`, n?'success':'warning');
      }
    });
  },

  // 協調組派飯點名（代訂餐盒旅團）
  openMealBoxCheckinModal(){ this.openRosterCheckinModal('meal_box'); },

});
