/* 34-announcements.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== Announcements & Additional Cards v7.0 - Complete Replacement ===================== */
  getAnnouncementsData(){
    const key=LS.announcements(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local) return local;
    if(!this.isDemoEvent()) return {announcements:[]}; // 真實活動：預留版位
    return {announcements:[
      {id:'ann_1',title:'歡迎使用全新執行手冊 v7.0',content:'本系統已完全取代舊 Google Sites，所有資料公開可看，僅修改需登入，登入一次永久有效 (儲存於瀏覽器)。各部門間可在此發佈公告、溝通協作。',category:'系統公告',created_by:'系統',created_at:new Date().toISOString(),pinned:true},
      {id:'ann_2',title:'跨部門溝通指引',content:'各組如有需要協調事項，請在此發佈公告並@相關組別，其他組會收到通知。主任以上可發佈公告。',category:'協作指引',created_by:'主席 何家聰',created_at:new Date().toISOString(),pinned:false}
    ]};
  }
,
  saveAnnouncementsData(data){
    const key=LS.announcements(this.currentEvent?.event_id||'isd_2026');
    localStorage.setItem(key, JSON.stringify(data));
    this.eventData['announcements']=data;
    if(!this.mockMode && this.gasUrl){
      fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Announcements',record:{event_id:this.currentEvent?.event_id||'isd_2026',data_json:JSON.stringify(data),updated_by:this.currentUser?.name||''}})}).catch(()=>{});
    }
  }
,
  renderAnnouncementsModule(){
    const container=document.getElementById('module-content');
    if(!this.annSubTab) this.annSubTab='list';
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] leading-relaxed">
          <b>📢 公告及溝通 - 活動資訊總匯：</b><br>
          • 公告、日程表、旅團須知、活動主題章全部集中在此卡，公開可看，無需登入<br>
          • 僅修改需登入：發佈公告需主任以上登入，登入儲存於瀏覽器，一次登入永久有效<br>
          • 跨部門溝通：可@組別，支援任務跟進、重要公告、問題回報<br>
          • 比舊 Google Sites 更易找到：置頂公告、分類篩選、搜尋
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchAnnTab('list')" class="tab-btn ${this.annSubTab==='list'?'active':''}"><i class="fa-solid fa-bullhorn mr-1"></i> 公告</button>
          <button onclick="app.switchAnnTab('schedule')" class="tab-btn ${this.annSubTab==='schedule'?'active':''}"><i class="fa-solid fa-calendar-days mr-1"></i> 日程表</button>
          <button onclick="app.switchAnnTab('guide')" class="tab-btn ${this.annSubTab==='guide'?'active':''}"><i class="fa-solid fa-book-open mr-1"></i> 旅團須知</button>
          <button onclick="app.switchAnnTab('theme')" class="tab-btn ${this.annSubTab==='theme'?'active':''}"><i class="fa-solid fa-award mr-1"></i> 活動主題章</button>
          <button onclick="app.switchAnnTab('map')" class="tab-btn ${this.annSubTab==='map'?'active':''}"><i class="fa-solid fa-map mr-1"></i> 場地地圖</button>
        </div>
        <div id="ann-tab-list" class="${this.annSubTab==='list'?'':'hidden'}"></div>
        <div id="ann-tab-schedule" class="${this.annSubTab==='schedule'?'':'hidden'}"></div>
        <div id="ann-tab-guide" class="${this.annSubTab==='guide'?'':'hidden'}"></div>
        <div id="ann-tab-theme" class="${this.annSubTab==='theme'?'':'hidden'}"></div>
        <div id="ann-tab-map" class="${this.annSubTab==='map'?'':'hidden'}"></div>
      </div>
    `;
    this.renderAnnList(document.getElementById('ann-tab-list'));
    if(this.annSubTab==='schedule') this.renderScheduleModule(document.getElementById('ann-tab-schedule'));
    if(this.annSubTab==='guide') this.renderUnitGuideModule(document.getElementById('ann-tab-guide'));
    if(this.annSubTab==='theme') this.renderThemeBadgesModule(document.getElementById('ann-tab-theme'));
  }
,
  switchAnnTab(tab){
    this.annSubTab=tab;
    ['list','schedule','guide','theme','map'].forEach(t=>{const el=document.getElementById('ann-tab-'+t); if(el) el.classList.toggle('hidden',t!==tab);});
    document.querySelectorAll('[onclick^="app.switchAnnTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'tab-btn active':'tab-btn';
    });
    if(tab==='schedule') this.renderScheduleModule(document.getElementById('ann-tab-schedule'));
    else if(tab==='guide') this.renderUnitGuideModule(document.getElementById('ann-tab-guide'));
    else if(tab==='theme') this.renderThemeBadgesModule(document.getElementById('ann-tab-theme'));
    else if(tab==='map') this.renderAnnMapTab(document.getElementById('ann-tab-map'));
    else if(tab==='list') this.renderAnnList(document.getElementById('ann-tab-list'));
  }
,
  renderAnnMapTab(container){
    if(!container) return;
    container.innerHTML='<div class="space-y-4">'
      +'<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] leading-relaxed text-emerald-900"><b><i class="fa-solid fa-map mr-1"></i>場地地圖：</b>香港黃竹坑香港警察學院活動場地地圖。</div>'
      +'<div class="bg-white border rounded-xl p-4 space-y-3">'
      +'<div class="flex items-center gap-3"><div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl"><i class="fa-solid fa-map"></i></div><div><b class="text-[14px]">香港警察學院場地地圖</b><div class="text-[11px] text-slate-500 mt-0.5">活動場地地圖 PDF</div></div></div>'
      +'<div class="mt-3"><iframe src="https://drive.google.com/file/d/1yCBNv88GEh7rdNSbebtdv6vGtU5omvoA/preview" class="w-full h-[500px] border rounded-xl" allow="autoplay"></iframe></div>'
      +'<a href="https://drive.google.com/file/d/1yCBNv88GEh7rdNSbebtdv6vGtU5omvoA/view" target="_blank" class="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 mt-2"><i class="fa-solid fa-download mr-1"></i>下載場地地圖 PDF</a>'
      +'</div></div>';
  }
,
  renderAnnList(container){
    if(!container) return;
    const data=this.getAnnouncementsData();
    const canPost=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=30; // 主任以上可發佈
    container.innerHTML=`
      <div class="space-y-3">
        <div class="flex gap-2 flex-wrap">
          ${canPost?`<button onclick="app.openAnnouncementForm()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>發佈公告 (主任以上)</button>`:''}
          <input id="announcement-search" placeholder="搜尋公告/協作" oninput="app.renderAnnList(document.getElementById('ann-tab-list'))" class="px-3 py-2 border rounded-xl text-xs flex-1 min-w-[180px]">
          <button onclick="app.exportAnnouncements()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button>
        </div>
        <div class="space-y-3">${data.announcements.filter(a=>{
          const q=(document.getElementById('announcement-search')?.value||'').toLowerCase();
          if(!q) return true;
          return (a.title+a.content+a.category).toLowerCase().includes(q);
        }).map(a=>`
          <div class="border rounded-xl p-4 bg-white ${a.pinned?'border-amber-300 bg-amber-50':''} space-y-2">
            <div class="flex justify-between items-start gap-2"><div><div class="flex items-center gap-2"><b class="text-[14px]">${escapeHtml(a.title)}</b>${a.pinned?'<span class="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">置頂</span>':''}<span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(a.category)}</span></div><div class="text-[11px] text-slate-500 mt-1">發佈: ${escapeHtml(a.created_by)} | ${new Date(a.created_at).toLocaleString()}</div></div><div class="flex gap-1">${canPost?`<button onclick="app.openAnnouncementForm('${a.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteAnnouncement('${a.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`:''}</div></div>
            <div class="text-[12px] leading-relaxed whitespace-pre-line bg-slate-50 border rounded-xl p-2.5">${escapeHtml(a.content)}</div>
          </div>
        `).join('') || '<p class="text-xs text-slate-400 py-8 text-center">暫無公告</p>'}</div>
      </div>
    `;
  }
,
  openAnnouncementForm(editId=null){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<30){ showToast('僅主任以上可發佈公告','error'); return; }
    const data=this.getAnnouncementsData();
    const existing=editId?data.announcements.find(a=>a.id===editId):null;
    let html=`
      <input type="hidden" id="ann-form-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="ann-form-id" value="${existing?.id||''}">
      <div class="space-y-3">
        <div><label class="text-[11px] font-bold">標題 *</label><input id="ann-title" value="${escapeHtml(existing?.title||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">分類</label><select id="ann-category" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1"><option value="系統公告" ${existing?.category==='系統公告'?'selected':''}>系統公告</option><option value="跨部門協作" ${existing?.category==='跨部門協作'?'selected':''}>跨部門協作</option><option value="任務跟進" ${existing?.category==='任務跟進'?'selected':''}>任務跟進</option><option value="問題回報" ${existing?.category==='問題回報'?'selected':''}>問題回報</option><option value="一般公告" ${existing?.category==='一般公告'?'selected':''}>一般公告</option></select></div>
        <div><label class="text-[11px] font-bold">內容 *</label><textarea id="ann-content" rows="5" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.content||'')}</textarea></div>
        <div><label class="flex items-center gap-2 text-[11px]"><input type="checkbox" id="ann-pinned" ${existing?.pinned?'checked':''} class="w-4 h-4"> 置頂公告</label></div>
      </div>
    `;
    document.getElementById('record-modal-title').textContent=existing?'編輯公告':'發佈公告 (主任以上，跨部門溝通)';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitAnnouncementForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitAnnouncementForm(){
    const mode=document.getElementById('ann-form-mode').value;
    const id=document.getElementById('ann-form-id').value;
    const title=document.getElementById('ann-title').value.trim();
    const category=document.getElementById('ann-category').value;
    const content=document.getElementById('ann-content').value.trim();
    const pinned=document.getElementById('ann-pinned').checked;
    if(!title||!content){ showToast('請填寫標題和內容','error'); return; }
    const data=this.getAnnouncementsData();
    if(mode==='edit'){
      const idx=data.announcements.findIndex(a=>a.id===id);
      if(idx>=0) data.announcements[idx]={...data.announcements[idx], title, category, content, pinned, updated_at:new Date().toISOString()};
    }else{
      data.announcements.unshift({id:'ann_'+Date.now(), title, category, content, pinned, created_by:this.currentUser?.name||'', created_at:new Date().toISOString()});
    }
    this.saveAnnouncementsData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新公告':'已發佈公告 (跨部門溝通)','success');
    this.renderAnnouncementsModule();
  }
,
  deleteAnnouncement(id){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60){ showToast('僅副主席以上可刪除','error'); return; }
    if(!confirm('確定刪除此公告？')) return;
    const data=this.getAnnouncementsData();
    data.announcements=data.announcements.filter(a=>a.id!==id);
    this.saveAnnouncementsData(data);
    this.renderAnnouncementsModule();
    showToast('已刪除公告','warning');
  }
,
  exportAnnouncements(){
    const data=this.getAnnouncementsData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`announcements_${todayISO()}.json`; a.click(); showToast('已匯出公告 JSON','success');
  }
,
  // 「安全及醫療」卡片已冊除並併入「危機處理」：把舊有 safety 本地資料搬入 crisis（急救/保險/安全指引）
  migrateLegacySafety(){
    try{
      const safetyKey=LS.safety(this.currentEvent?.event_id||'isd_2026');
      const safetyRaw=JSON.parse(localStorage.getItem(safetyKey)||'null');
      if(!safetyRaw || !Array.isArray(safetyRaw.docs) || !safetyRaw.docs.length) return;
      const data=this.getCrisisData();
      const catMap={'急救':'急救','保險':'保險','安全指引':'其他','危機處理':'其他'};
      let added=0;
      (safetyRaw.docs||[]).forEach(d=>{
        const title=(d.title||'').trim();
        if(!title) return;
        if(data.docs.some(x=>x.title===title)) return;
        data.docs.push({id:'cr_mig_'+Date.now()+'_'+(added++), title, category:catMap[d.category]||'其他', description:d.description||'', created_at:new Date().toISOString(), note:'由「安全及醫療」卡片併入'});
      });
      if(added){ this.saveCrisisData(data); localStorage.removeItem(safetyKey); showToast(`已將「安全及醫療」${added} 項內容併入危機處理`,'success'); }
    }catch(e){}
  }
,

  /* ===================== 旅團須知 (公開) ===================== */
  getUnitGuideData(){
    const key=LS.unit_guide(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local) return local;
    if(!this.isDemoEvent()) return {docs:[]}; // 真實活動：預留版位
    return {docs:[
      {id:'ug_1',title:'旅團報到須知',description:'請各旅團於指定時間到報到處報到，並帶同報名表及參加者名單。',category:'報到'},
      {id:'ug_2',title:'服飾及裝備',description:'請穿整齊童軍制服及合適鞋履，自備水樽、雨具及防曬用品。',category:'裝備'},
      {id:'ug_3',title:'停車及入場安排',description:'車輛需出示通行證，於指定位置停泊；參加者經正門入場。',category:'交通'}
    ]};
  }
,
  saveUnitGuideData(data){ localStorage.setItem(LS.unit_guide(this.currentEvent?.event_id||'isd_2026'), JSON.stringify(data)); }
,
  renderUnitGuideModule(c){
    const container=c||this._unitGuideContainer||document.getElementById('module-content');
    this._unitGuideContainer=container;
    if(!container) return;
    const data=this.getUnitGuideData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900">
          <b>📖 旅團須知：</b>供參加旅團／公眾查閱的須知、指引與注意事項（報到、服飾裝備、交通、場地等）。公開可看。
        </div>
        <div class="flex gap-2 flex-wrap">
          ${canEdit?`<button onclick="app.openUnitGuideForm()" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增須知</button>`:''}
          <button onclick="app.exportUnitGuide()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${data.docs.map(d=>`
          <div class="border rounded-xl p-4 bg-white space-y-2">
            <div class="flex justify-between items-start gap-2"><div><b class="text-[13px]">${escapeHtml(d.title)}</b> <span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border ml-1">${escapeHtml(d.category)}</span></div><div class="flex gap-1 flex-shrink-0">${canEdit?`<button onclick="app.openUnitGuideForm('${d.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteUnitGuide('${d.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`:''}</div></div>
            <div class="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">${escapeHtml(d.description)}</div>
            ${(d.file_url||d.file_data)?`<div class="flex gap-1 flex-wrap">${d.file_url?`<a href="${escapeHtml(d.file_url)}" target="_blank" rel="noopener" class="bg-white border px-2.5 py-1 rounded-xl text-[10px] font-bold">📄 開啟附件</a>`:''}${d.file_data?`<button onclick="app.downloadUnitGuideFile('${d.id}')" class="bg-white border px-2.5 py-1 rounded-xl text-[10px] font-bold">📥 下載附件</button>`:''}</div>`:''}
          </div>
        `).join('') || '<p class="text-xs text-slate-400 py-4 text-center">暫無須知</p>'}</div>
      </div>
    `;
  }
,
  openUnitGuideForm(id=null){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60){ showToast('僅管理員或副主席以上可編輯','error'); return; }
    const data=this.getUnitGuideData();
    const existing=id?data.docs.find(d=>d.id===id):null;
    let html=`<input type="hidden" id="ug-mode" value="${existing?'edit':'create'}"><input type="hidden" id="ug-id" value="${existing?.id||''}">
      <div><label class="text-[11px] font-bold">標題 *</label><input id="ug-title" value="${escapeHtml(existing?.title||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">分類</label><input id="ug-category" value="${escapeHtml(existing?.category||'報到')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">內容</label><textarea id="ug-desc" rows="5" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>
      <div class="mt-3 border-t pt-3">
        <label class="text-[11px] font-bold">附件（檔案或連結，可選）</label>
        <input type="file" id="ug-file" accept=".jpg,.jpeg,.png,.pdf,.docx,.doc,.xlsx,.xls,.txt" class="w-full text-xs mt-1">
        <input id="ug-url" value="${escapeHtml(existing?.file_url||'')}" placeholder="或貼上連結（例如 Drive／網上指南）" class="w-full px-3 py-2 border rounded-xl text-sm mt-2">
        ${existing&&(existing.file_name||existing.file_url)?`<div class="text-[10px] text-slate-500 mt-1">已有附件：${escapeHtml(existing.file_name||existing.file_url)}（重新上傳檔案或填新連結會取代）</div>`:''}
      </div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯旅團須知':'新增旅團須知';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitUnitGuideForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async submitUnitGuideForm(){
    const mode=document.getElementById('ug-mode').value, id=document.getElementById('ug-id').value;
    const title=document.getElementById('ug-title').value.trim(), category=document.getElementById('ug-category').value.trim(), description=document.getElementById('ug-desc').value.trim();
    if(!title){ showToast('請填寫標題','error'); return; }
    const data=this.getUnitGuideData();
    const existing=mode==='edit'?data.docs.find(d=>d.id===id):null;
    // v13.1：須知可附檔案或連結（可選——文字內容本身就係須知，附件係加強）
    const file=document.getElementById('ug-file').files[0];
    const url=document.getElementById('ug-url').value.trim();
    let fileName=existing?.file_name||'', fileData=existing?.file_data||'', fileUrl=existing?.file_url||'';
    if(file){ fileData=await fileToDataUrl(file); fileName=file.name; fileUrl=url; }
    else if(url){ fileUrl=url; fileData=''; fileName=''; }
    if(mode==='edit'){ const i=data.docs.findIndex(d=>d.id===id); if(i>=0) data.docs[i]={...data.docs[i],title,category,description,file_name:fileName,file_data:fileData,file_url:fileUrl,updated_by:this.currentUser?.name||'',updated_at:new Date().toISOString()}; }
    else data.docs.push({id:'ug_'+Date.now(),title,category,description,file_name:fileName,file_data:fileData,file_url:fileUrl,created_by:this.currentUser?.name||'',created_at:new Date().toISOString()});
    this.saveUnitGuideData(data); this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存','success'); this.renderUnitGuideModule();
  }
,
  downloadUnitGuideFile(id){
    const d=this.getUnitGuideData().docs.find(x=>x.id===id);
    if(!d) return;
    if(d.file_data) downloadDataUrl(d.file_name||`${d.title||'unit_guide'}`, d.file_data);
    else if(d.file_url) window.open(d.file_url,'_blank');
  }
,
  deleteUnitGuide(id){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60){ showToast('僅管理員或副主席以上可刪除','error'); return; }
    if(!confirm('確定刪除？')) return;
    const data=this.getUnitGuideData(); data.docs=data.docs.filter(d=>d.id!==id);
    this.saveUnitGuideData(data); this.renderUnitGuideModule();
  }
,
  exportUnitGuide(){
    const data=this.getUnitGuideData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`unit_guide_${todayISO()}.json`; a.click();
  }
,
});
