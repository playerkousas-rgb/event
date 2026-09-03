/* 28-oral-quotes.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== 口頭報價登記 (Oral Quotes) =====================
     登記：總主任以上 (lvl>=40)
     查看：行政組、執行副主席以上 (lvl>=70)；登記人自己；該組上級（同組總主任/副主席） */
  getOralQuotesData(){
    const key=LS.oral_quotes(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local && Array.isArray(local.quotes)) return local;
    return {quotes:[]};
  }
,
  saveOralQuotesData(data){
    const key=LS.oral_quotes(this.currentEvent?.event_id||'isd_2026');
    localStorage.setItem(key,JSON.stringify(data));
    if(!this.mockMode && this.gasUrl){
      (data.quotes||[]).forEach(q=>{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Oral_Quotes',record:{oral_id:q.oral_id,event_id:this.currentEvent?.event_id||'isd_2026',quote_date:q.quote_date||'',group_name:q.group_name||'',vendor:q.vendor||'',contact_person:q.contact_person||'',contact_phone:q.contact_phone||'',item_desc:q.item_desc||'',amount:q.amount||0,notes:q.notes||'',quoted_by:q.quoted_by||'',quoted_by_id:q.quoted_by_id||'',created_at:q.created_at||''}})}).catch(()=>{});
      });
    }
  }
,
  canRecordOralQuote(){ return this.isAdmin() || (ROLE_HIERARCHY[this.currentUser?.role]||0)>=40; } // 總主任以上
,
  canViewOralQuotesAll(){ // 行政組、執行副主席以上
    const r=this.currentUser?.role||'', g=this.currentUser?.group_name||'';
    if(['super_admin','admin','chairperson','executive_vice_chairperson','advisor'].includes(r)) return true;
    if(g.includes('行政')) return true;
    return false;
  }
,
  canViewOralQuote(q){
    if(!this.currentUser) return false;
    if(this.canViewOralQuotesAll()) return true;
    if(q.quoted_by_id && q.quoted_by_id===this.currentUser.user_id) return true; // 登記人自己
    // 該組上級：同組總主任/副主席或以上
    const lvl=this.roleLevel(this.currentUser.role);
    if(lvl>=40 && q.group_name && this.currentUser.group_name && q.group_name===this.currentUser.group_name) return true;
    return false;
  }
,
  /* v13：口頭報價登記／刪除後的刷新——留在目前所在的頁面
     （部門中心「口頭報價」頁籤 → 重繪部門頁；財務頁 → 重繪口頭報價分頁；否則重繪口頭報價卡片） */
  refreshOralQuoteViews(){
    if(this.currentModule==='group_management' && this.currentGroupManaged){ this.openGroupManagement(this.currentGroupManaged); return; }
    if(document.getElementById('finance-tab-oral_quotes')){ this.renderFinanceOralQuotesTab(); return; }
    this.renderOralQuotesModule();
  }
,
  /* v13：部門中心「口頭報價」頁籤——各部門登記本組口頭報價（組別自動帶入），行政組匯總全部 */
  renderGroupQuotesTabHTML(groupName){
    groupName=normalizeGroupName(groupName);
    const canRecord=this.canRecordOralQuote();
    const data=this.getOralQuotesData();
    const quotes=(data.quotes||[]).filter(q=>normalizeGroupName(q.group_name)===groupName&&this.canViewOralQuote(q)).sort((a,b)=>(b.quote_date||'').localeCompare(a.quote_date||''));
    const totalAmt=quotes.reduce((s,q)=>s+(Number(q.amount)||0),0);
    return `
      <div class="space-y-3">
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed text-indigo-900">
          <b>📝 本組口頭報價登記（${escapeHtml(groupName)}，對應附件3）：</b>總主任以上可登記本組口頭報價；登記後<b>自動</b>匯入行政組「財務匯總」。<br>
          報價金額達 <b>$500 或以上須作書面報價</b>（豁免商戶 $2,000 以上亦同），詳見本部門「📖 財務指引」頁籤。
        </div>
        <div class="flex gap-2 flex-wrap">
          ${canRecord?`<button onclick="app.openOralQuoteForm(null,'${escapeHtml(groupName)}')" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>登記口頭報價（本組）</button>`:`<span class="text-[11px] bg-slate-100 text-slate-500 px-3 py-2 rounded-full border">僅總主任以上可登記</span>`}
          <span class="text-[11px] bg-indigo-100 text-indigo-700 px-3 py-2 rounded-full border border-indigo-200">本組 ${quotes.length} 筆 · 合計 $${totalAmt.toLocaleString()}</span>
        </div>
        <div class="space-y-3">${quotes.length?quotes.map(q=>`
          <div class="border rounded-xl p-3 bg-white space-y-1">
            <div class="flex justify-between items-start gap-2 flex-wrap">
              <div class="flex flex-wrap items-center gap-2"><b class="text-[13px]">${escapeHtml(q.vendor||'-')}</b><span class="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full border border-indigo-200">$${Number(q.amount)||0}</span></div>
              <div class="text-[10px] text-slate-400">${escapeHtml(q.quote_date||'')} | 登記人: ${escapeHtml(q.quoted_by||'-')}</div>
            </div>
            <div class="text-[11px] text-slate-600">項目: ${escapeHtml(q.item_desc||'-')}</div>
            <div class="text-[11px] text-slate-500">聯絡: ${escapeHtml(q.contact_person||'-')} ${q.contact_phone?`| ${escapeHtml(q.contact_phone)}`:''}</div>
            ${q.notes?`<div class="text-[10px] bg-slate-50 border rounded-xl p-2 mt-1">${escapeHtml(q.notes)}</div>`:''}
          </div>`).join(''):`<p class="text-xs text-slate-400 py-8 text-center">暫無本組口頭報價登記</p>`}</div>
      </div>`;
  }
,
  renderOralQuotesModule(){
    const container=document.getElementById('module-content');
    const canRecord=this.canRecordOralQuote();
    const data=this.getOralQuotesData();
    const canAll=this.canViewOralQuotesAll();
    const quotes=(data.quotes||[]).filter(q=>this.canViewOralQuote(q)).sort((a,b)=> (b.quote_date||'').localeCompare(a.quote_date||''));
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed text-indigo-900">
          <b>📝 口頭報價登記（附件3 口頭報價資料記錄）：</b><br>
          • <b>總主任以上</b>可登記（商戶、項目、金額等），報價金額達 $500 或以上須作書面報價（見財務指引）<br>
          • <b>行政組及執行副主席以上</b>可查看全部；登記人及該組上級（同組總主任/副主席）可查看本組及自己的登記<br>
          • 紀錄儲存於後端 Oral_Quotes 表，供財務組查核
        </div>
        <div class="flex gap-2 flex-wrap">
          ${canRecord?`<button onclick="app.openOralQuoteForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>登記口頭報價</button>`:''}
          <button onclick="app.exportOralQuotes()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button>
          <span class="text-[11px] bg-indigo-100 text-indigo-700 px-3 py-2 rounded-full border border-indigo-200">可見 ${quotes.length} 筆${canAll?'（全部）':'（本組/自己）'}</span>
        </div>
        <div class="space-y-3">${quotes.length?quotes.map(q=>{
          return `<div class="border rounded-xl p-3 bg-white space-y-1">
            <div class="flex justify-between items-start gap-2 flex-wrap">
              <div class="flex flex-wrap items-center gap-2"><b class="text-[13px]">${escapeHtml(q.vendor||'-')}</b><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(q.group_name||'-')}</span><span class="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full border border-indigo-200">$${Number(q.amount)||0}</span></div>
              <div class="text-[10px] text-slate-400">${escapeHtml(q.quote_date||'')} | 登記人: ${escapeHtml(q.quoted_by||'-')}</div>
            </div>
            <div class="text-[11px] text-slate-600">項目: ${escapeHtml(q.item_desc||'-')}</div>
            <div class="text-[11px] text-slate-500">聯絡: ${escapeHtml(q.contact_person||'-')} ${q.contact_phone?`| ${escapeHtml(q.contact_phone)}`:''}</div>
            ${q.notes?`<div class="text-[10px] bg-slate-50 border rounded-xl p-2 mt-1">${escapeHtml(q.notes)}</div>`:''}
            ${(q.quoted_by_id===this.currentUser?.user_id||this.canViewOralQuotesAll())?`<div class="flex gap-1 mt-1"><button onclick="app.openOralQuoteForm('${q.oral_id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteOralQuote('${q.oral_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></div>`:''}
          </div>`;
        }).join(''):'<p class="text-xs text-slate-400 py-8 text-center">暫無口頭報價登記</p>'}</div>
      </div>`;
    const actionsEl=document.getElementById('module-actions');
    if(actionsEl){
      actionsEl.innerHTML=canRecord?`<div class="flex gap-2 flex-wrap"><button onclick="app.openOralQuoteForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>登記口頭報價</button><button onclick="app.exportOralQuotes()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button></div>`:'';
    }
  }
,
  openOralQuoteForm(id=null, presetGroup=null){
    if(!this.canRecordOralQuote()){ showToast('僅總主任以上可登記口頭報價','error'); return; }
    const data=this.getOralQuotesData();
    const existing=id?(data.quotes||[]).find(q=>q.oral_id===id):null;
    // v13：部門中心「口頭報價」頁籤會帶入本組組別（presetGroup）
    const groupDefault=existing?.group_name||presetGroup||normalizeGroupName(this.currentUser?.group_name)||'';
    const groupOpts=ACCOUNT_GROUPS.includes(groupDefault)?orgGroupOptions(groupDefault):`<option value="${escapeHtml(groupDefault)}" selected>${escapeHtml(groupDefault)}</option>${orgGroupOptions('')}`;
    const title=existing?'編輯口頭報價登記':'登記口頭報價 (總主任以上)';
    let html=`
      <input type="hidden" id="oq-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="oq-id" value="${existing?.oral_id||''}">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">報價日期 *</label><input type="date" id="oq-date" value="${existing?.quote_date||new Date().toISOString().split('T')[0]}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">所屬組別 *</label><select id="oq-group" required class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1">${groupOpts}</select></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">商戶／供應商名稱 *</label><input id="oq-vendor" value="${escapeHtml(existing?.vendor||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">聯絡人</label><input id="oq-contact-person" value="${escapeHtml(existing?.contact_person||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">聯絡電話</label><input id="oq-contact-phone" value="${escapeHtml(existing?.contact_phone||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">報價項目／內容 *</label><textarea id="oq-item" rows="2" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.item_desc||'')}</textarea></div>
        <div><label class="text-[11px] font-bold">報價金額 (HK$)</label><input type="number" id="oq-amount" value="${existing?.amount||''}" min="0" step="0.01" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">備註</label><input id="oq-notes" value="${escapeHtml(existing?.notes||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      </div>
      <div class="text-[10px] text-slate-500 mt-2">登記人：${escapeHtml(this.currentUser?.name||'')}（自動記錄）。行政組及執行副主席以上可查看全部；登記人及該組上級可查看本組。</div>
    `;
    document.getElementById('record-modal-title').textContent=title;
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitOralQuoteForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitOralQuoteForm(){
    const mode=document.getElementById('oq-mode').value, id=document.getElementById('oq-id').value;
    const quote_date=document.getElementById('oq-date').value;
    const group_name=document.getElementById('oq-group').value;
    const vendor=document.getElementById('oq-vendor').value.trim();
    const contact_person=document.getElementById('oq-contact-person').value.trim();
    const contact_phone=document.getElementById('oq-contact-phone').value.trim();
    const item_desc=document.getElementById('oq-item').value.trim();
    const amount=parseFloat(document.getElementById('oq-amount').value)||0;
    const notes=document.getElementById('oq-notes').value.trim();
    if(!quote_date||!vendor||!item_desc){ showToast('請填寫日期、商戶、報價項目','error'); return; }
    const data=this.getOralQuotesData();
    if(mode==='edit'){
      const idx=(data.quotes||[]).findIndex(q=>q.oral_id===id);
      if(idx>=0) data.quotes[idx]={...data.quotes[idx], quote_date, group_name, vendor, contact_person, contact_phone, item_desc, amount, notes};
    }else{
      if(!data.quotes) data.quotes=[];
      data.quotes.push({oral_id:'oq_'+Date.now(), event_id:this.currentEvent?.event_id||'isd_2026', quote_date, group_name, vendor, contact_person, contact_phone, item_desc, amount, notes, quoted_by:this.currentUser?.name||'', quoted_by_id:this.currentUser?.user_id||'', created_at:new Date().toISOString()});
    }
    this.saveOralQuotesData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新口頭報價登記':'已登記口頭報價','success');
    this.refreshOralQuoteViews();
  }
,
  deleteOralQuote(id){
    if(!this.canViewOralQuotesAll()){ showToast('僅行政組或執行副主席以上可刪除','error'); return; }
    if(!confirm('確定刪除此報價登記？')) return;
    const data=this.getOralQuotesData();
    data.quotes=(data.quotes||[]).filter(q=>q.oral_id!==id);
    this.saveOralQuotesData(data);
    showToast('已刪除','warning');
    this.refreshOralQuoteViews();
  }
,
  exportOralQuotes(){
    const data=this.getOralQuotesData();
    const blob=new Blob([JSON.stringify(data.quotes||[],null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`oral_quotes_${todayISO()}.json`; a.click();
    showToast('已匯出口頭報價 JSON','success');
  }
,
});
