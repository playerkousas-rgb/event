/* 32-meetings.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== Meeting Enhanced Functions ===================== */
  isAdmin(){return !!this.currentUser&&(this.currentUser.mock_admin||['super_admin','advisor','admin','chairperson','executive_vice_chairperson'].includes(this.currentUser?.role));} // v8.7：MOCK mock_admin 標記＝全部管理權限
,
  isSuperAdmin(){ return !!this.currentUser&&(this.currentUser.mock_admin||this.currentUser?.role==='super_admin'); } // v8.7：MOCK mock_admin 標記＝全部管理權限
,
  getDeletedRecordIds(module){
    const all=JSON.parse(localStorage.getItem(LS.deletedRecords(this.currentEvent?.event_id||'isd_2026'))||'{}');
    return new Set(Array.isArray(all[module])?all[module]:[]);
  }
,
  markRecordDeleted(module,id){
    if(!module||!id) return;
    const key=LS.deletedRecords(this.currentEvent?.event_id||'isd_2026');
    const all=JSON.parse(localStorage.getItem(key)||'{}');
    all[module]=Array.from(new Set([...(Array.isArray(all[module])?all[module]:[]),String(id)])).slice(-500);
    localStorage.setItem(key,JSON.stringify(all));
  }
,
  async deleteGasRecord(module,id){
    this.markRecordDeleted(module,id);
    if(this.mockMode||!this.gasUrl) return {success:true,local:true};
    try{
      const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'deleteRecord',api_key:this.apiKey,module,id})});
      const out=await res.json();
      if(out.success||out.error==='Record not found') return {success:true};
      return {success:false,error:out.error||'後台刪除失敗'};
    }catch(e){ return {success:false,error:e.message}; }
  }
,
  isDirectorOrAbove(){const lvl=ROLE_HIERARCHY[this.currentUser?.role]||0; return lvl>=30;}
,
  canUploadGroup(){const lvl=ROLE_HIERARCHY[this.currentUser?.role]||0; return lvl>=40;} // general_director up
,
  getMeetingsRaw(){return this.eventData['meetings']||[];}
,
  getMeetings(){
    const deleted=this.getDeletedRecordIds('Meetings');
    let list=this.getMeetingsRaw().map(m=>this.normalizeMeeting(m)).filter(m=>!deleted.has(String(m.meeting_id)));
    // local override already merged in loadEventData, but also check to ensure enhanced fields
    // sort by meeting_number asc, then date
    list.sort((a,b)=>{ if(a.meeting_number!==b.meeting_number) return a.meeting_number-b.meeting_number; return (a.date||'').localeCompare(b.date||''); });
    return list;
  }
,
  normalizeMeeting(m){
    return {
      meeting_id:m.meeting_id||'m_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
      event_id:m.event_id||this.currentEvent?.event_id||'isd_2026',
      meeting_number: m.meeting_number!==undefined?parseInt(m.meeting_number): (m.title&&m.title.includes('第')?parseInt(m.title.match(/第(\d+)次/)?.[1]||'0'):0),
      title:m.title||'未命名會議',
      date:m.date||'',
      time:m.time||'19:15',
      location:m.location||m.place||'百周年紀念大樓1704室',
      status:m.status||'completed',
      visibility:m.visibility||'public',
      agenda:m.agenda||'',
      agenda_file_name:m.agenda_file_name||m.agenda_file||'',
      agenda_file_data:m.agenda_file_data||'',
      agenda_file_url:m.agenda_file_url||'',
      agenda_uploaded_by:m.agenda_uploaded_by||m.author||'',
      agenda_uploaded_at:m.agenda_uploaded_at||'',
      minutes:m.minutes||'',
      minutes_file_name:m.minutes_file_name||m.minutes_file||'',
      minutes_file_data:m.minutes_file_data||'',
      minutes_file_url:m.minutes_file_url||'',
      minutes_uploaded_by:m.minutes_uploaded_by||'',
      minutes_uploaded_at:m.minutes_uploaded_at||'',
      classified_files:m.classified_files||[],
      drive_root_url:m.drive_root_url||'',
      attachments:m.attachments||[],
      group_uploads:m.group_uploads||[],
      created_by:m.created_by||m.author||'',
      created_at:m.created_at||'',
      updated_at:m.updated_at||'',
      author:m.author||'',
      attendees:m.attendees||[]
    };
  }
,
  /* ===================== 內建議程／會議紀錄 (JSON, 免彈出 Drive) v8.3 =====================
     來源：data/meeting_records.json（隨 APP 一齊發佈）＋ 本機編輯覆蓋（localStorage）。
     目的：成員喺會議卡片入面直接讀晒議程、決議、跟進事項，唔使彈去 Google Drive / Drive APP。
     Drive PDF 仍然保留：喺卡片內用「內嵌預覽」睇，或按下載。                                   */
  meetingRecordsKey(){ return 'isd_meeting_records_'+(this.currentEvent?.event_id||'isd_2026'); }
,
  async loadMeetingRecords(){
    let base={meetings:[]};
    try{
      const res=await fetch(`data/meeting_records.json?t=${Date.now()}`);
      const j=await res.json();
      if(j && Array.isArray(j.meetings)) base=j;
    }catch(e){}
    try{
      const local=JSON.parse(localStorage.getItem(this.meetingRecordsKey())||'null');
      if(local && Array.isArray(local.meetings) && local.meetings.length){
        const byId=new Map((base.meetings||[]).map(r=>[String(r.meeting_id),r]));
        local.meetings.forEach(r=>{
          const k=String(r.meeting_id);
          byId.set(k,{...(byId.get(k)||{}),...r,_local:true});
        });
        base={...base,meetings:[...byId.values()]};
      }
    }catch(e){}
    this.meetingRecords=base;
    return base;
  }
,
  getMeetingRecord(m){
    if(!m) return null;
    const list=this.meetingRecords?.meetings||[];
    if(!list.length) return null;
    return list.find(r=>String(r.meeting_id)===String(m.meeting_id))
        || list.find(r=>r.meeting_number!==undefined && Number(r.meeting_number)===Number(m.meeting_number))
        || null;
  }
,
  hasBuiltInRecord(m,kind){
    const r=this.getMeetingRecord(m); if(!r) return false;
    if(kind==='agenda') return !!(r.agenda_items||[]).length;
    if(kind==='minutes') return !!((r.minutes_sections||[]).length||(r.decisions||[]).length||(r.action_items||[]).length);
    return !!((r.agenda_items||[]).length||(r.minutes_sections||[]).length);
  }
,
  driveFileIdFromUrl(url){
    if(!url) return '';
    const s=String(url);
    let m=s.match(/\/file\/d\/([a-zA-Z0-9-_]+)/); if(m) return m[1];
    m=s.match(/[?&]id=([a-zA-Z0-9-_]+)/); if(m) return m[1];
    return '';
  }
,
  builtInStatusBadge(rec){
    const full=rec?.content_status==='full';
    return `<span class="text-[10px] px-2 py-0.5 rounded-full border font-bold ${full?'bg-emerald-100 text-emerald-800 border-emerald-200':'bg-amber-100 text-amber-800 border-amber-200'}">${full?'已錄入全文':'摘要／重點版'}</span>`;
  }
,
  /* 內建議程（HTML，直接嵌喺頁面／卡片，無彈窗） */
  /* 摘要下面的「睇全文」入口：頁內預覽原檔（iframe）＋ 需要時先跳去 Drive 原檔 */
  builtInFullTextBar(m,kind,ctx){
    const rec=this.getMeetingRecord(m);
    const url=(kind==='agenda'?(m.agenda_file_url||rec?.source?.agenda_file_url):(m.minutes_file_url||rec?.source?.minutes_file_url))||'';
    const name=(kind==='agenda'?(m.agenda_file_name||rec?.source?.agenda_file_name):(m.minutes_file_name||rec?.source?.minutes_file_name))||'原檔';
    const folder=m.drive_root_url||rec?.source?.folder_url||'';
    const id=this.driveFileIdFromUrl(url);
    const pid=`mrfull-${m.meeting_id}-${kind}-${ctx||'inline'}`;
    if(!id){
      return folder?`<div class="mt-2 pt-2 border-t border-white/60 flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><span><i class="fa-solid fa-circle-info mr-1"></i>以上為摘要／重點；此次會議未有指定原檔。</span><a href="${escapeHtml(folder)}" target="_blank" rel="noopener" class="underline text-sky-700 font-bold">去 Drive 資料夾睇全文 ↗</a></div>`:'';
    }
    return `<div class="mt-2 pt-2 border-t border-white/60 space-y-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[10px] text-slate-500"><i class="fa-solid fa-circle-info mr-1"></i>以上為摘要／重點，全文請按右邊：</span>
        <button onclick="app.toggleInlineDrivePreview('${pid}','${id}')" class="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold"><i class="fa-solid fa-book-open-reader mr-1"></i>睇全文（頁內開啟）</button>
        <button onclick="app.downloadDriveFile('${escapeHtml(url)}')" class="text-[10px] px-2.5 py-1.5 rounded-lg bg-white border font-bold"><i class="fa-solid fa-download mr-1"></i>下載原檔</button>
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="text-[10px] underline text-slate-500">Drive 開啟 ↗</a>
        <span class="text-[10px] text-slate-400 truncate">${escapeHtml(name)}</span>
      </div>
      <div id="${pid}" class="hidden"></div>
    </div>`;
  }
,
  renderBuiltInAgendaHtml(m,ctx){
    const rec=this.getMeetingRecord(m);
    const items=rec?.agenda_items||[];
    if(!items.length){
      const txt=(m.agenda||'').trim();
      return `<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[12px] leading-relaxed whitespace-pre-line">${txt?escapeHtml(txt):'暫無內建議程內容（秘書處可於 data/meeting_records.json 補上，或喺下方編輯內建內容）。'}${this.builtInFullTextBar(m,'agenda',ctx)}</div>`;
    }
    const head=`<div class="flex flex-wrap items-center gap-2 mb-2">
      <b class="text-[12px] text-sky-900"><i class="fa-solid fa-list-check mr-1"></i>議程（APP 內建 · 免開 Drive）</b>
      ${this.builtInStatusBadge(rec)}
      ${rec.chair?`<span class="text-[10px] text-slate-500">主持：${escapeHtml(rec.chair)}</span>`:''}
      ${rec.recorder?`<span class="text-[10px] text-slate-500">紀錄：${escapeHtml(rec.recorder)}</span>`:''}
    </div>`;
    const meta=`<div class="text-[10px] text-slate-500 mb-2"><i class="fa-solid fa-calendar mr-1"></i>${escapeHtml(rec.date||m.date||'')} ${escapeHtml(rec.time||m.time||'')} · <i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(rec.location||m.location||'')}</div>`;
    const rows=items.map(it=>`<tr class="border-b last:border-0 align-top">
      <td class="px-2 py-1.5 text-[11px] font-bold text-slate-500 whitespace-nowrap">${escapeHtml(String(it.no||''))}</td>
      <td class="px-2 py-1.5 text-[12px] font-semibold">${escapeHtml(it.topic||'')}${it.notes?`<div class="text-[11px] font-normal text-slate-600 mt-0.5 leading-relaxed">${escapeHtml(it.notes)}</div>`:''}</td>
      <td class="px-2 py-1.5 text-[11px] text-slate-500 whitespace-nowrap">${escapeHtml(it.presenter||'')}</td>
    </tr>`).join('');
    return `<div class="bg-sky-50 border border-sky-200 rounded-xl p-3">${head}${meta}
      <div class="bg-white border rounded-xl overflow-hidden"><table class="min-w-full"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left text-[10px]">項</th><th class="px-2 py-1 text-left text-[10px]">議題</th><th class="px-2 py-1 text-left text-[10px]">負責</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${this.builtInFullTextBar(m,'agenda',ctx)}
    </div>`;
  }
,
  /* 內建會議紀錄（HTML，直接嵌喺頁面／卡片，無彈窗） */
  renderBuiltInMinutesHtml(m,ctx){
    const rec=this.getMeetingRecord(m);
    const secs=rec?.minutes_sections||[];
    const decisions=rec?.decisions||[];
    const actions=rec?.action_items||[];
    if(!secs.length && !decisions.length && !actions.length){
      const txt=(m.minutes||'').trim();
      return `<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[12px] leading-relaxed whitespace-pre-line">${txt?escapeHtml(txt):'暫無內建會議紀錄（會後由秘書處錄入，Drive PDF 仍可內嵌預覽）。'}${this.builtInFullTextBar(m,'minutes',ctx)}</div>`;
    }
    const head=`<div class="flex flex-wrap items-center gap-2 mb-2">
      <b class="text-[12px] text-emerald-900"><i class="fa-solid fa-clipboard-check mr-1"></i>會議紀錄（APP 內建 · 免開 Drive）</b>
      ${this.builtInStatusBadge(rec)}
    </div>`;
    const secHtml=secs.map(s=>`<div class="bg-white border rounded-xl p-2.5">
      <b class="text-[12px]">${escapeHtml(s.heading||'')}</b>
      <ul class="mt-1 space-y-1 list-disc pl-4 text-[12px] leading-relaxed">${(s.points||[]).map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>
    </div>`).join('');
    const decHtml=decisions.length?`<div class="bg-white border border-emerald-300 rounded-xl p-2.5">
      <b class="text-[12px] text-emerald-800"><i class="fa-solid fa-gavel mr-1"></i>議決事項</b>
      <ol class="mt-1 space-y-1 list-decimal pl-4 text-[12px] leading-relaxed">${decisions.map(d=>`<li>${escapeHtml(d)}</li>`).join('')}</ol>
    </div>`:'';
    const actHtml=actions.length?`<div class="bg-white border border-amber-300 rounded-xl p-2.5">
      <b class="text-[12px] text-amber-800"><i class="fa-solid fa-list-check mr-1"></i>跟進事項</b>
      <div class="mt-1 overflow-hidden rounded-lg border"><table class="min-w-full"><thead class="bg-amber-50"><tr><th class="px-2 py-1 text-left text-[10px]">事項</th><th class="px-2 py-1 text-left text-[10px]">負責</th><th class="px-2 py-1 text-left text-[10px]">限期</th></tr></thead><tbody>${actions.map(a=>`<tr class="border-t align-top"><td class="px-2 py-1.5 text-[12px]">${escapeHtml(a.item||'')}</td><td class="px-2 py-1.5 text-[11px] text-slate-600 whitespace-nowrap">${escapeHtml(a.owner||'')}</td><td class="px-2 py-1.5 text-[11px] text-slate-600 whitespace-nowrap">${escapeHtml(a.due||'')}</td></tr>`).join('')}</tbody></table></div>
    </div>`:'';
    return `<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">${head}${secHtml}${decHtml}${actHtml}${this.builtInFullTextBar(m,'minutes',ctx)}</div>`;
  }
,
  /* 內嵌預覽 Drive 檔案（頁內 iframe，唔會彈去 Drive APP） */
  renderMeetingFilesHtml(m){
    const rec=this.getMeetingRecord(m);
    const files=[];
    const push=(kind,label,name,url)=>{ if(url||name) files.push({kind,label,file_name:name||label,file_url:url||''}); };
    push('agenda','議程',m.agenda_file_name||rec?.source?.agenda_file_name,m.agenda_file_url||rec?.source?.agenda_file_url);
    push('minutes','會議紀錄',m.minutes_file_name||rec?.source?.minutes_file_name,m.minutes_file_url||rec?.source?.minutes_file_url);
    (m.classified_files||[]).forEach(f=>{ if(f.kind!=='agenda'&&f.kind!=='minutes') push(f.kind||'other',f.label||'其他資料',f.file_name,f.file_url); });
    (m.attachments||[]).forEach(a=>push('other','附件',a.file_name,a.file_url));
    if(!files.length) return `<div class="bg-white border rounded-xl p-3 text-[11px] text-slate-500">此會議暫未關聯 Drive 檔案。內建議程／紀錄已可直接喺上面閱讀。</div>`;
    const rows=files.map((f,i)=>{
      const fid=this.driveFileIdFromUrl(f.file_url);
      const pid=`mfp-${m.meeting_id}-${i}`;
      return `<div class="bg-white border rounded-xl p-2.5">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0"><div class="text-[12px] font-semibold truncate"><i class="fa-solid ${f.kind==='agenda'?'fa-file-lines text-sky-600':f.kind==='minutes'?'fa-clipboard-check text-emerald-600':'fa-paperclip text-amber-600'} mr-1"></i>${escapeHtml(f.label)} · ${escapeHtml(f.file_name||'')}</div></div>
          <div class="flex gap-1 flex-shrink-0">
            ${fid?`<button onclick="app.toggleInlineDrivePreview('${pid}','${fid}')" class="bg-sky-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold"><i class="fa-solid fa-eye mr-1"></i>頁內預覽</button>
            <a href="https://drive.google.com/uc?export=download&id=${fid}" class="bg-white border px-2.5 py-1 rounded-lg text-[10px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載</a>`:`<span class="text-[10px] text-slate-400">未有檔案連結</span>`}
          </div>
        </div>
        <div id="${pid}" class="hidden mt-2"></div>
      </div>`;
    }).join('');
    return `<div class="space-y-2">${rows}<div class="text-[10px] text-slate-400">「頁內預覽」直接喺 APP 內開啟檔案，唔會跳去 Google Drive APP；如需正式存檔請按下載。</div></div>`;
  }
,
  toggleInlineDrivePreview(containerId,fileId){
    const el=document.getElementById(containerId); if(!el) return;
    if(!el.classList.contains('hidden')){ el.classList.add('hidden'); el.innerHTML=''; return; }
    el.innerHTML=`<iframe src="https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview" class="w-full h-[60vh] rounded-xl border" title="檔案內嵌預覽" allow="autoplay"></iframe><div class="text-[10px] text-slate-400 mt-1">如預覽空白，代表該檔案未設為「知道連結的任何人可查看」，請通知秘書處。</div>`;
    el.classList.remove('hidden');
  }
,
  /* 會議卡片內的頁內展開（議程／紀錄／檔案），完全唔使彈窗 */
  toggleMeetingInline(meetingId,kind){
    const panel=document.getElementById('mi-'+meetingId); if(!panel) return;
    const m=this.getMeetings().find(x=>x.meeting_id===meetingId); if(!m) return;
    if(!panel.classList.contains('hidden') && panel.dataset.kind===kind){ panel.classList.add('hidden'); panel.innerHTML=''; panel.dataset.kind=''; this.markMeetingInlineButtons(meetingId,''); return; }
    let html='';
    if(kind==='agenda') html=this.renderBuiltInAgendaHtml(m,'card');
    else if(kind==='minutes') html=this.renderBuiltInMinutesHtml(m,'card');
    else html=this.renderMeetingFilesHtml(m);
    panel.innerHTML=html;
    panel.dataset.kind=kind;
    panel.classList.remove('hidden');
    this.markMeetingInlineButtons(meetingId,kind);
  }
,
  markMeetingInlineButtons(meetingId,kind){
    ['agenda','minutes','files'].forEach(k=>{
      const b=document.getElementById(`mib-${meetingId}-${k}`); if(!b) return;
      b.classList.toggle('ring-2',k===kind);
      b.classList.toggle('ring-sky-400',k===kind);
    });
  }
,
  exportMeetingRecordsJson(){
    const data=this.meetingRecords||{meetings:[]};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='meeting_records.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    showToast('已匯出 meeting_records.json，可覆蓋 data/meeting_records.json 發佈','success');
  }
,
  toggleMeetingRecordsEditor(){
    const box=document.getElementById('meeting-records-editor'); if(!box) return;
    if(!box.classList.contains('hidden')){ box.classList.add('hidden'); box.innerHTML=''; return; }
    if(!this.canManageMeetings()){ showToast('僅管理員／秘書處／行政組可編輯內建議程／紀錄','error'); return; }
    const json=JSON.stringify(this.meetingRecords||{meetings:[]},null,2);
    box.innerHTML=`<div class="bg-white border rounded-xl p-3 space-y-2">
      <div class="text-[11px] text-slate-600 leading-relaxed"><b><i class="fa-solid fa-pen-to-square mr-1 text-indigo-600"></i>編輯內建議程／會議紀錄（JSON）：</b>喺下面直接改文字，按「儲存到本機」即時生效（只影響本裝置）；正式發佈請按「匯出 JSON」並覆蓋 <code class="font-mono">data/meeting_records.json</code>。結構：<code class="font-mono">meetings[].agenda_items / minutes_sections / decisions / action_items</code>。</div>
      <textarea id="meeting-records-json" class="w-full h-[45vh] px-3 py-2 border rounded-xl text-[11px] font-mono" spellcheck="false">${escapeHtml(json)}</textarea>
      <div class="flex gap-2 flex-wrap">
        <button onclick="app.saveMeetingRecordsJson()" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-floppy-disk mr-1"></i>儲存到本機並套用</button>
        <button onclick="app.exportMeetingRecordsJson()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>匯出 JSON</button>
        <button onclick="app.resetMeetingRecordsLocal()" class="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate-left mr-1"></i>還原內建版本</button>
      </div>
    </div>`;
    box.classList.remove('hidden');
  }
,
  saveMeetingRecordsJson(){
    const ta=document.getElementById('meeting-records-json'); if(!ta) return;
    let parsed;
    try{ parsed=JSON.parse(ta.value); }catch(e){ showToast('JSON 格式錯誤：'+e.message,'error'); return; }
    if(!parsed||!Array.isArray(parsed.meetings)){ showToast('JSON 必須包含 meetings 陣列','error'); return; }
    localStorage.setItem(this.meetingRecordsKey(),JSON.stringify(parsed));
    this.meetingRecords=parsed;
    showToast('已儲存並套用內建議程／紀錄（本機）','success');
    this.renderMeetingsList();
  }
,
  async resetMeetingRecordsLocal(){
    localStorage.removeItem(this.meetingRecordsKey());
    await this.loadMeetingRecords();
    showToast('已還原為 data/meeting_records.json 內建版本','success');
    this.renderMeetingsList();
  }
,
  extractDriveFolderId(link){
    if(!link) return '';
    let m=link.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if(m) return m[1];
    m=link.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if(m) return m[1];
    m=link.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if(m) return m[1];
    if(link.length>15 && !link.includes('http')) return link.trim();
    return '';
  }
,
  getMeetingFolderConfig(){
    const eventId=this.eventData?.drive?.groups?.['會議']||this.eventData?.drive?.groups?.['會議(0 Pre-Meeting,1,2,3 Meeting)']||'';
    const uploadFolderId=this.eventData?.drive?.meeting_upload_folder_id||'';
    const configuredLink=this.systemConfig.meeting_folder_link||'';
    const configuredId=this.systemConfig.meeting_folder_id||this.extractDriveFolderId(configuredLink);
    const id=uploadFolderId||eventId||configuredId;
    const link=uploadFolderId?`https://drive.google.com/drive/folders/${uploadFolderId}`:(eventId?`https://drive.google.com/drive/folders/${eventId}`:configuredLink);
    return {link,id};
  }
,
  saveMeetingFolderLink(){
    const input=document.getElementById('meeting-folder-link-input');
    const link=input?input.value.trim():'';
    const id=this.extractDriveFolderId(link);
    this.systemConfig.meeting_folder_link=link;
    this.systemConfig.meeting_folder_id=id;
    localStorage.setItem(LS.config(this.currentEvent?.event_id||'global'), JSON.stringify(this.systemConfig));
    // also save to GAS SystemConfig if possible
    if(!this.mockMode && this.gasUrl){
      fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'updateConfig',api_key:this.apiKey,key:'meeting_folder_link',value:link,by:this.currentUser?.name||'admin'})}).catch(()=>{});
      fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'updateConfig',api_key:this.apiKey,key:'meeting_folder_id',value:id,by:this.currentUser?.name||'admin'})}).catch(()=>{});
    }
    showToast(id?`✅ 已設定指定資料夾，ID: ${id}，上傳將自動去到該資料夾`:'⚠️ 已清除資料夾設定，改回本地儲存','success');
    this.renderMeetingsList();
  }
,
  async uploadFileToDriveFolder(fileName, dataUrl, mimeType=''){
    const cfg=this.getMeetingFolderConfig();
    if(!cfg.id && !cfg.link){ return {success:false, error:'未設定資料夾'}; }
    if(this.mockMode){ return {success:false, error:'示範沙盒／未連接後端時不支援上傳到 Drive（正式活動連接後端後可用）'}; }
    if(!this.gasUrl){ return {success:false, error:'未設定GAS URL'}; }
    try{
      const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'uploadFileToFolder',api_key:this.apiKey,file_name:fileName,file_data:dataUrl,mime_type:mimeType,folder_id:cfg.id,folder_link:cfg.link,uploaded_by:this.currentUser?.name||'',meeting_id:this.currentMeetingId||''})});
      const json=await res.json();
      return json;
    }catch(e){ return {success:false, error:e.message}; }
  }
,
  saveMeetings(list){
    const key=LS.meetings(this.currentEvent.event_id);
    localStorage.setItem(key,JSON.stringify(list));
    this.eventData.meetings=list;
    if(!this.mockMode && this.gasUrl){
      list.forEach(m=>{
        const rec={
          meeting_id:m.meeting_id,event_id:m.event_id,meeting_number:m.meeting_number,title:m.title,date:m.date,time:m.time,location:m.location,status:m.status,visibility:m.visibility,
          agenda:m.agenda,agenda_file_name:m.agenda_file_name,agenda_file_data:m.agenda_file_data?m.agenda_file_data.slice(0,40000):'', // avoid sheet limit
          minutes:m.minutes,minutes_file_name:m.minutes_file_name,
          attachments_json:JSON.stringify((m.attachments||[]).map(a=>({file_id:a.file_id,file_name:a.file_name,file_url:a.file_url||'',folder_id:a.folder_id||''}))).slice(0,40000),
          group_uploads_json:JSON.stringify((m.group_uploads||[]).map(g=>({upload_id:g.upload_id,group_name:g.group_name,title:g.title,file_name:g.file_name,file_url:g.file_url||''}))).slice(0,40000),
          author:m.author||m.created_by
        };
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Meetings',record:rec})}).catch(()=>{});
      });
    }
  }
,
  switchMeetingSubTab(tab){
    this.meetingSubTab=tab;
    this.renderMeetingsList();
  }
,
  // ── 會議 Drive 即時連通 ──
  getMeetingDriveFolderId(){
    return this.getMeetingFolderConfig().id||'';
  }
,
  renderMeetingDriveTab(container){
    if(!container) return;
    const folderId=this.getMeetingDriveFolderId();
    const tabBar=`<div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
      <button onclick="app.switchMeetingSubTab('list')" class="tab-btn ${this.meetingSubTab==='list'?'active':''}"><i class="fa-solid fa-list mr-1"></i>會議列表</button>
      <button onclick="app.switchMeetingSubTab('drive')" class="tab-btn ${this.meetingSubTab==='drive'?'active':''}"><i class="fa-solid fa-folder-open mr-1"></i>會議 Drive（即時）</button>
    </div>`;
    container.innerHTML=`<div class="space-y-4">${tabBar}
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900">
        <b>📁 會議 Drive（即時連通）：</b>直接讀取會議 Drive 資料夾，跟 Drive 內嘅<b>分次會議資料夾</b>（0 Pre-Meeting、第1次、第2次…）排列 — 秘書處／管理員喺 Drive 更新檔案後，呢度即刻見到（每次進入自動重新載入）。成員點擊資料夾即可展開睇該次會議嘅議程、紀錄及附件（已按檔名自動分類：議程／會議紀錄／簡報／其他）。無需在 APP 再上傳一次；秘書處繼續放 Drive 即可。<br>
        ${folderId?`📂 目前資料夾：<code class="font-mono">${escapeHtml(folderId)}</code> <a href="https://drive.google.com/drive/folders/${escapeHtml(folderId)}" target="_blank" class="text-sky-700 underline">開啟 Drive 資料夾 ↗</a>`:'⚠️ 未偵測到會議資料夾，請喺下方貼上 Drive 資料夾連結。'}
      </div>
      <div class="flex items-center justify-between gap-2 flex-wrap bg-white border rounded-xl p-2.5">
        <span class="text-[11px] text-slate-500"><i class="fa-solid fa-eye mr-1"></i>顯示模式</span>
        <div class="inline-flex rounded-xl border bg-slate-50 p-1" role="group" aria-label="會議 Drive 顯示模式">
          <button onclick="app.switchMeetingDriveView('list')" class="px-3 py-1.5 rounded-lg text-[11px] font-bold ${this.meetingDriveViewMode==='list'?'bg-sky-600 text-white shadow':'text-slate-600'}"><i class="fa-solid fa-list mr-1"></i>清單</button>
          <button onclick="app.switchMeetingDriveView('embed')" class="px-3 py-1.5 rounded-lg text-[11px] font-bold ${this.meetingDriveViewMode==='embed'?'bg-sky-600 text-white shadow':'text-slate-600'}"><i class="fa-solid fa-window-maximize mr-1"></i>內嵌</button>
        </div>
      </div>
      <div id="meeting-drive-body" class="space-y-3"><div class="text-center py-10 text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>正在讀取會議 Drive…</div></div>
    </div>`;
    this.loadMeetingDrive(folderId);
  }
,
  switchMeetingDriveView(mode){
    if(!['list','embed'].includes(mode)) return;
    this.meetingDriveViewMode=mode;
    localStorage.setItem('meeting_drive_view_mode',mode);
    this.renderMeetingDriveTab(document.getElementById('module-content'));
  }
,
  async loadMeetingDrive(folderId){
    const body=document.getElementById('meeting-drive-body'); if(!body) return;
    if(!folderId){
      body.innerHTML=`<div class="bg-white border rounded-xl p-4 text-[11px] text-slate-600 space-y-2">
        <b>未設定會議 Drive 資料夾。</b>管理員可喺下面貼上資料夾連結（例：<code class="font-mono">https://drive.google.com/drive/folders/1-abB...</code>）：<br>
        <div class="flex gap-2 flex-col sm:flex-row"><input id="md-folder-input" placeholder="貼上會議 Drive 資料夾連結" class="flex-1 px-3 py-2 border rounded-xl text-xs font-mono"><button onclick="app.saveMeetingDriveFolder()" class="bg-sky-600 text-white px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap">💾 設定並載入</button></div>
      </div>`; return;
    }
    if(this.meetingDriveViewMode==='embed'){
      body.innerHTML=`<div class="bg-white border rounded-xl p-3 space-y-2">
        <div class="text-[11px] text-slate-500"><i class="fa-solid fa-window-maximize mr-1 text-sky-600"></i>內嵌模式會直接顯示公開 Drive 資料夾；如畫面要求登入，請確認資料夾已設為「知道連結的任何人可查看」。</div>
        <iframe src="https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list" class="w-full h-[65vh] rounded-xl border" title="會議 Drive 內嵌檢視"></iframe>
      </div>`;
      return;
    }
    body.innerHTML='<div class="text-center py-10 text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>正在讀取會議 Drive…</div>';
    // 清單模式：正式環境經 GAS 的公開 UrlFetchApp 讀取（Drive 更新即時反映）
    if(!this.mockMode && this.gasUrl){
      try{
        const res=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'listDriveFolder',api_key:this.apiKey,folder_id:folderId})});
        const j=await res.json();
        if(j && j.success){
          localStorage.setItem(LS.config(this.currentEvent?.event_id||'isd_2026')+'_meeting_drive', JSON.stringify({fetched_at:Date.now(), folder:j.folder, subfolders:j.subfolders, files:j.files}));
          this.renderMeetingDriveTree(body,j); return;
        }
        throw new Error((j&&j.error)||'讀取失敗');
      }catch(e){
        const cached=JSON.parse(localStorage.getItem(LS.config(this.currentEvent?.event_id||'isd_2026')+'_meeting_drive')||'null');
        if(cached && (cached.subfolders||cached.files)){
          this.renderMeetingDriveTree(body,cached,folderId,true);
          body.insertAdjacentHTML('afterbegin',`<div class="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-800"><i class="fa-solid fa-circle-exclamation mr-1"></i>未能連線後端（${escapeHtml(e.message)}），顯示上次快取。點「重新整理」再試。</div>`);
          return;
        }
      }
    }
    // 無後端／Mock：直接內嵌 Drive 資料夾（瀏覽器即時顯示，Drive 更新即時可見）
    body.innerHTML=`<div class="bg-white border rounded-xl p-3 space-y-2">
      <div class="text-[11px] text-slate-500"><i class="fa-solid fa-circle-info mr-1 text-sky-600"></i>目前未連後端（示範/本地模式），顯示 Drive 內嵌資料夾即時檢視：</div>
      <iframe src="https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list" class="w-full h-[65vh] rounded-xl border" title="會議 Drive"></iframe>
    </div>`;
  }
,
  classifyMeetingFileKind(name){
    const n=String(name||'');
    if(/議程|agenda/i.test(n)) return 'agenda';
    if(/紀錄|會議記錄|minutes|minite/i.test(n)) return 'minutes';
    if(/簡報|ppt|presentation|進度/i.test(n)) return 'slides';
    return 'other';
  }
,
  classifyMeetingFileLabel(kind){
    return {agenda:'議程',minutes:'會議紀錄',slides:'簡報／進度',other:'其他資料'}[kind]||'其他資料';
  }
,
  renderMeetingDriveTree(body, tree, folderId, fromCache){
    const all=[...(tree.files||[]).map(f=>({...f,_root:true})), ...(tree.subfolders||[]).flatMap(sf=>(sf.files||[]).map(f=>({...f,_folder:sf.name,_folderId:sf.id})))];
    const fmtDate=(iso)=>{ if(!iso) return ''; try{ const d=new Date(iso); return d.toLocaleDateString('zh-HK')+' '+d.toLocaleTimeString('zh-HK',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } };
    const fmtSize=(n)=>{ if(n===undefined||n===null) return ''; if(n>=1048576) return (n/1048576).toFixed(1)+' MB'; if(n>=1024) return Math.round(n/1024)+' KB'; return n+' B'; };
    const iconFor=(m)=>{ m=m||''; if(m.includes('pdf')) return 'fa-file-pdf'; if(m.includes('word')||m.includes('document')) return 'fa-file-word'; if(m.includes('sheet')||m.includes('excel')) return 'fa-file-excel'; if(m.includes('image')) return 'fa-file-image'; if(m.includes('presentation')||m.includes('powerpoint')) return 'fa-file-powerpoint'; if(m.includes('folder')) return 'fa-folder'; return 'fa-file'; };
    const colorFor=(m)=>{ m=m||''; if(m.includes('pdf')) return 'text-rose-500'; if(m.includes('word')) return 'text-sky-600'; if(m.includes('sheet')||m.includes('excel')) return 'text-emerald-600'; if(m.includes('image')) return 'text-purple-500'; if(m.includes('presentation')) return 'text-orange-500'; return 'text-slate-400'; };
    const kindBadge=k=>{ const m={agenda:'bg-sky-100 text-sky-800 border-sky-200',minutes:'bg-emerald-100 text-emerald-800 border-emerald-200',slides:'bg-amber-100 text-amber-800 border-amber-200',other:'bg-slate-100 text-slate-600 border-slate-200'}; return `<span class="text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${m[k]||m.other}">${this.classifyMeetingFileLabel(k)}</span>`; };
    const fileRow=(f,idx)=>{
      const kind=this.classifyMeetingFileKind(f.name);
      return `
      <div class="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50">
        <div class="flex items-center gap-2 min-w-0">
          <i class="fa-solid ${iconFor(f.mimeType)} ${colorFor(f.mimeType)}"></i>
          <div class="min-w-0"><div class="text-[12px] font-medium truncate flex items-center gap-1.5 flex-wrap">${escapeHtml(f.name)} ${kindBadge(kind)}</div><div class="text-[10px] text-slate-400">${f._folder?escapeHtml(f._folder)+' · ':''}${fmtSize(f.size)}${f.modified?' · '+fmtDate(f.modified):''}</div></div>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <button onclick="app.toggleInlineDrivePreview('mdp-${f.id}','${f.id}')" class="bg-sky-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold"><i class="fa-solid fa-eye mr-1"></i>頁內預覽</button>
          <button onclick="app.downloadDriveFile('https://drive.google.com/file/d/${f.id}/view')" class="bg-white border px-2 py-1 rounded-lg text-[10px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載</button>
        </div>
      </div>
      <div id="mdp-${f.id}" class="hidden px-4 pb-3"></div>`; };
    const folderBlock=(sf,idx)=>`
      <div class="border rounded-xl bg-white overflow-hidden">
        <button onclick="app.toggleMdFolder('md-f-${idx}')" class="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 text-left">
          <span class="flex items-center gap-2 min-w-0"><i class="fa-solid fa-folder text-amber-500"></i><b class="text-[13px] truncate">${escapeHtml(sf.name)}</b><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border whitespace-nowrap">${(sf.files||[]).length} 個檔案</span></span>
          <span class="flex items-center gap-2 flex-shrink-0"><span class="text-[10px] text-slate-400 hidden sm:inline">${sf.modified?fmtDate(sf.modified):''}</span><i id="md-f-${idx}-icon" class="fa-solid fa-chevron-down text-slate-400 text-xs transition-transform"></i></span>
        </button>
        <div id="md-f-${idx}" class="hidden border-t divide-y divide-slate-100">
          ${(()=>{ const files=sf.files||[]; if(!files.length) return '<div class="px-4 py-4 text-[11px] text-slate-400 text-center">（此資料夾暫無檔案）</div>';
            const groups={agenda:[],minutes:[],slides:[],other:[]};
            files.forEach(f=>groups[this.classifyMeetingFileKind(f.name)].push(f));
            return ['agenda','minutes','slides','other'].filter(k=>groups[k].length).map(k=>`<div class="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-500">${this.classifyMeetingFileLabel(k)}</div>${groups[k].map(fileRow).join('')}`).join('');
          })()}
        </div>
      </div>`;
    const folderIdNow=folderId||this.getMeetingDriveFolderId();
    body.innerHTML=`
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-[11px] text-slate-500"><i class="fa-solid fa-folder-open text-amber-500 mr-1"></i><b>${escapeHtml(tree.folder||'會議 Drive')}</b>${fromCache?'（快取）':''} · 共 ${tree.subfolders?.length||0} 個會議資料夾 / ${all.length} 個檔案</div>
        <button onclick="app.loadMeetingDrive(app.getMeetingDriveFolderId())" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-rotate mr-1"></i>重新整理（讀取最新）</button>
      </div>
      ${(tree.subfolders||[]).map(folderBlock).join('')}
      ${(tree.files||[]).length?`<div class="border rounded-xl bg-white overflow-hidden">
        <button onclick="app.toggleMdFolder('md-f-root')" class="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 text-left">
          <span class="flex items-center gap-2 min-w-0"><i class="fa-solid fa-folder-open text-slate-500"></i><b class="text-[13px]">（根目錄）</b><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border">${(tree.files||[]).length} 個檔案</span></span>
          <i id="md-f-root-icon" class="fa-solid fa-chevron-down text-slate-400 text-xs"></i>
        </button>
        <div id="md-f-root" class="hidden border-t divide-y divide-slate-100">${(tree.files||[]).map(fileRow).join('')}</div>
      </div>`:''}
      <div class="text-[10px] text-slate-400">每次進入或按「重新整理」都會由 Google Drive 讀取最新內容；如未能連線後端，會顯示瀏覽器內嵌資料夾或上次快取。</div>`;
  }
,
  toggleMdFolder(id){
    const el=document.getElementById(id); if(!el) return;
    el.classList.toggle('hidden');
    const icon=document.getElementById(id+'-icon'); if(icon) icon.style.transform=el.classList.contains('hidden')?'':'rotate(180deg)';
  }
,
  previewDriveFile(fileId){
    if(!fileId) return;
    document.getElementById('record-modal-title').textContent='檔案預覽（Google Drive）';
    document.getElementById('record-form-fields').innerHTML=`<div class="space-y-2">
      <iframe src="https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview" class="w-full h-[70vh] rounded-xl border" title="檔案預覽"></iframe>
      <div class="text-[10px] text-slate-400 text-center">如未能載入預覽，可直接開啟或下載。</div>
    </div>`;
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  saveMeetingDriveFolder(){
    const link=(document.getElementById('md-folder-input')?.value||'').trim();
    const id=this.extractDriveFolderId(link);
    if(!id){ showToast('請貼上有效的 Drive 資料夾連結','error'); return; }
    if(!this.systemConfig) this.systemConfig={};
    this.systemConfig.meeting_folder_link=link;
    this.systemConfig.meeting_folder_id=id;
    localStorage.setItem(LS.config(this.currentEvent?.event_id||'isd_2026'), JSON.stringify(this.systemConfig));
    showToast('會議 Drive 資料夾已設定','success');
    this.renderMeetingDriveTab(document.getElementById('module-content'));
  }
,
  renderMeetingsList(){
    const container=document.getElementById('module-content');
    // 會議 Drive 分頁：直接連通會議 Drive 資料夾，跟子資料夾（分次會議）顯示，Drive 更新即時可見
    if(this.meetingSubTab==='drive'){ this.renderMeetingDriveTab(container); return; }
    if(!this.meetingSubTab) this.meetingSubTab='list';
    const q=(document.getElementById('meeting-search')?.value||'').toLowerCase();
    const visFilter=document.getElementById('meeting-visibility-filter')?.value||'';
    let list=this.getMeetings();
    // apply permission filter for non-admin
    const isAdmin=this.canManageMeetings();
    if(!isAdmin){
      list=list.filter(m=>{
        if(m.visibility==='private') return false; // private admin only
        if(m.visibility==='attendees' && !this.isDirectorOrAbove()) return false;
        return true;
      });
    }
    if(q){ list=list.filter(m=> (m.title+m.agenda+m.minutes+m.location).toLowerCase().includes(q) || String(m.meeting_number).includes(q) ); }
    if(visFilter){ list=list.filter(m=>m.visibility===visFilter); }
    if(list.length===0){ container.innerHTML=`<div class="text-center py-12 space-y-2"><div class="text-4xl mb-3">📭</div><p class="text-sm text-slate-500">暫無會議紀錄</p><p class="text-xs text-slate-400 mt-2">會議列表用來存放各次籌備會議的議程、會議紀錄與附件。${isAdmin?'管理員可按右上「新增會議」，或到「會議 Drive」看秘書處資料夾。':'若你應看到會議，請聯絡秘書處確認已上載議程／紀錄。'}</p><button onclick="app.switchMeetingSubTab('drive')" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold">開啟會議 Drive</button></div>`; return; }
    const isDirector=this.canUploadGroup();
    const storageInfo=this.mockMode?`瀏覽器 localStorage (本地/示範沙盒，5MB 限制，全前端，無需後端)`:`Google Sheet Meetings 分頁 + localStorage 快取 (雲端模式，大檔案建議轉 Google Drive 資料夾)`;
    const usedKB=Math.round(JSON.stringify(list).length/1024);
    const folderCfg=this.getMeetingFolderConfig();
    const folderStatus=folderCfg.id?`✅ 已設定指定資料夾 (ID: ${folderCfg.id})，上傳將自動去到該資料夾`:`⚠️ 未設定資料夾，目前本地儲存 (Mock) / Sheet (GAS)，大檔建議設定 Drive 資料夾`;
    container.innerHTML=`<div class="space-y-4">
      <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
        <button onclick="app.switchMeetingSubTab('list')" class="tab-btn ${this.meetingSubTab==='list'?'active':''}"><i class="fa-solid fa-list mr-1"></i>會議列表</button>
        <button onclick="app.switchMeetingSubTab('drive')" class="tab-btn ${this.meetingSubTab==='drive'?'active':''}"><i class="fa-solid fa-folder-open mr-1"></i>會議 Drive（即時）</button>
      </div>
      <div id="meeting-records-editor" class="hidden"></div>
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] leading-relaxed text-emerald-900">
        <b><i class="fa-solid fa-book-open mr-1"></i>議程／會議紀錄已「內建」喺 APP（免彈出 Google Drive APP）：</b>
        每張會議卡片下面按 <b>「議程（內建·即睇）」</b> 或 <b>「會議紀錄（內建·即睇）」</b>，內容會即刻喺卡片內展開（文字版：議程項目、議決事項、跟進事項），唔會跳去 Drive。
        原始 PDF 想睇就按 <b>「檔案（頁內預覽）」</b>，一樣係喺 APP 內用內嵌視窗打開，或直接下載。<br>
        資料來源：<code class="font-mono">data/meeting_records.json</code>（隨 APP 發佈，離線都睇到）${isAdmin?' · 管理員可按右上「內建議程 JSON」直接編輯／匯出':''}。
      </div>
      <div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] leading-relaxed text-sky-900 space-y-2">
        <div><b>會議卡片升級說明：</b><br>• 管理員可上傳議程及會議紀錄 (PDF/Word/圖片)，全部籌委成員點擊卡片即可觀看<br>• 分不同會議 (第0/1/2/3/4次) 上傳及觀看<br>• 各小組可上傳開會專用附件（簡報 PPT/PDF、活動章設計圖檔 PNG/JPG 等），議程及會議紀錄已直接關聯 Google Drive<br>• 全部文件支援下載 (單個或打包下載) · 管理員可刪除任何檔案 / 會議 / 組資料<br>• <b>指定資料夾 (FOLDER LINK)</b>：管理員可設定 Google Drive 資料夾連結，上傳時自動上傳到該資料夾，突破 5MB 限制</div>
        <div class="bg-white border border-sky-200 rounded-xl p-2.5">
          <div class="flex items-start gap-2"><i class="fa-solid fa-folder text-amber-500 mt-0.5"></i><div class="flex-1">
            <b>指定上傳資料夾 (FOLDER LINK)</b><br>
            <div class="flex gap-2 mt-1.5 flex-col sm:flex-row">
              <input id="meeting-folder-link-input" value="${escapeHtml(folderCfg.link||'')}" placeholder="貼上 Google Drive 資料夾連結，例如 https://drive.google.com/drive/folders/1AbC..." class="flex-1 px-3 py-2 border rounded-xl text-xs font-mono">
              <div class="flex gap-1">
                <button onclick="app.saveMeetingFolderLink()" class="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap">💾 設定資料夾</button>
                ${folderCfg.link?`<a href="${escapeHtml(folderCfg.link)}" target="_blank" class="bg-white border hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold text-sky-700">📂 開啟資料夾</a>`:''}
                ${folderCfg.link?`<button onclick="document.getElementById('meeting-folder-link-input').value=''; app.saveMeetingFolderLink()" class="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-2 rounded-xl text-xs font-bold">清除</button>`:''}
              </div>
            </div>
            <div class="mt-2 text-[10px]"><span class="bg-slate-100 px-2 py-0.5 rounded-full border font-mono">${folderStatus}</span> · 僅管理員可設定，其他人可見資料夾連結以便下載</div>
            <div class="mt-1.5 text-[10px] text-slate-600">如何取得？打開 Drive 資料夾 → 右鍵「取得連結」→ 複製連結貼上。設定後：GAS 模式下上傳自動調用 <code>uploadFileToFolder</code> 上傳到該資料夾 (DriveApp)，回傳 Drive 連結；Mock 模式提示需關閉 Mock 才能上傳到 Drive。</div>
          </div></div>
        </div>
        <div class="bg-white border border-sky-200 rounded-xl p-2.5">
          <div class="flex items-start gap-2"><i class="fa-solid fa-database text-sky-600 mt-0.5"></i><div class="flex-1"><b>檔案去了哪裡？</b><br>目前：<span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">${storageInfo}</span> · 已用 ${usedKB}KB<br>• Mock：base64 DataURL 存 localStorage，<code>key=${LS.meetings(this.currentEvent?.event_id||'')}</code>，5MB 限制<br>• GAS + 已設資料夾：檔案上傳到指定 Drive 資料夾，Sheet 只存連結，突破限制，可無限大檔<br>• GAS + 未設資料夾：存 localStorage 快取 + Sheet (50k 字元限制)，大檔建議設資料夾<br>• 管理員刪除：卡片 → 詳情 → 🗑️刪除，立即移除 localStorage / Drive (需手動到 Drive 刪)</div></div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">${list.map(m=>{
        const canView = isAdmin || m.visibility!=='private';
        const agendaBadge=m.agenda_file_name||m.agenda?'<span class="file-chip"><i class="fa-solid fa-file-lines text-sky-600"></i> 議程</span>':'';
        const minutesBadge=m.minutes_file_name||m.minutes?'<span class="file-chip"><i class="fa-solid fa-clipboard-check text-emerald-600"></i> 紀錄</span>':'';
        const attachCount=(m.attachments||[]).length;
        const groupCount=(m.group_uploads||[]).length;
        const visClass={public:'visibility-public',private:'visibility-private',attendees:'visibility-attendees'}[m.visibility]||'visibility-public';
        const visText={public:'全部可看',private:'僅管理員',attendees:'僅主任以上'}[m.visibility]||m.visibility;
        return `<div class="meeting-card" onclick="app.openMeetingDetail('${m.meeting_id}')">
          <div class="flex gap-3">
            <div class="meeting-number">${m.meeting_number===0?'預':m.meeting_number===99?'臨':m.meeting_number}</div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h4 class="font-bold text-[14px] leading-snug truncate">${escapeHtml(m.title)}</h4>
                <span class="visibility-badge ${visClass}">${visText}</span>
                <span class="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(m.status)}</span>
              </div>
              <div class="text-[11px] text-slate-500 flex flex-wrap gap-3">
                <span><i class="fa-solid fa-calendar mr-1"></i>${escapeHtml(m.date)} ${escapeHtml(m.time)}</span>
                <span><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(m.location)}</span>
                ${m.author?`<span><i class="fa-solid fa-user mr-1"></i>${escapeHtml(m.author)}</span>`:''}
              </div>
              <div class="mt-2 flex flex-wrap gap-1.5">${agendaBadge}${minutesBadge}${attachCount?`<span class="file-chip"><i class="fa-solid fa-paperclip"></i> ${attachCount} 附件</span>`:''}${groupCount?`<span class="file-chip bg-amber-50 border-amber-200 text-amber-800"><i class="fa-solid fa-users-rectangle"></i> ${groupCount} 組資料</span>`:''}</div>
              <div class="mt-2 space-y-1.5" onclick="event.stopPropagation()">
                <div class="flex flex-wrap gap-1.5">
                  <button id="mib-${m.meeting_id}-agenda" onclick="app.toggleMeetingInline('${m.meeting_id}','agenda')" class="text-[10px] px-2.5 py-1.5 rounded-lg border border-sky-300 bg-sky-50 text-sky-800 font-bold hover:bg-sky-100 transition"><i class="fa-solid fa-list-check mr-1"></i>議程（內建·即睇）</button>
                  <button id="mib-${m.meeting_id}-minutes" onclick="app.toggleMeetingInline('${m.meeting_id}','minutes')" class="text-[10px] px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 transition"><i class="fa-solid fa-clipboard-check mr-1"></i>會議紀錄（內建·即睇）</button>
                  <button id="mib-${m.meeting_id}-files" onclick="app.toggleMeetingInline('${m.meeting_id}','files')" class="text-[10px] px-2.5 py-1.5 rounded-lg border bg-white text-slate-700 font-bold hover:bg-slate-50 transition"><i class="fa-solid fa-paperclip mr-1"></i>檔案（頁內預覽）</button>
                </div>
                <div id="mi-${m.meeting_id}" class="hidden" data-kind=""></div>
              </div>
              ${m.agenda?`<p class="text-[11px] text-slate-600 mt-2 line-clamp-2 leading-relaxed">${escapeHtml(m.agenda.slice(0,80))}...</p>`:''}
            </div>
            <div class="flex flex-col gap-1 flex-shrink-0">
              ${isAdmin?`<button onclick="event.stopPropagation(); app.openMeetingFormModal('${m.meeting_id}')" class="bg-white border hover:bg-slate-50 px-2.5 py-1.5 rounded-xl text-[11px] font-bold">✏️ 編輯</button>`:''}
              <button onclick="event.stopPropagation(); app.openMeetingDetail('${m.meeting_id}')" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">查看 <i class="fa-solid fa-arrow-right ml-1"></i></button>
              ${canView?`<button onclick="event.stopPropagation(); app.downloadAllMeetingFiles('${m.meeting_id}')" class="bg-slate-800 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載</button>`:''}
              ${isAdmin?`<button onclick="event.stopPropagation(); app.deleteMeeting('${m.meeting_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2.5 py-1 rounded-xl text-[10px] font-bold"><i class="fa-solid fa-trash"></i> 刪除</button>`:''}
            </div>
          </div>
        </div>`;
      }).join('')}</div>
      <div class="text-[11px] text-slate-400 text-center pt-2">共 ${list.length} 場會議 · ${isAdmin?'管理員／秘書處／行政組可見全部':'僅顯示公開及權限內會議'} · 手機點擊卡片進入詳情，下載全部文件</div>
    </div>`;
  }
,
  openMeetingFormModal(meetingId=null){
    if(!this.canManageMeetings()){ showToast('僅管理員／秘書處／行政組可建立/編輯會議','error'); return; }
    document.getElementById('meeting-form-title').textContent=meetingId?'編輯會議 (分次·上傳下載)':'新增會議 (分次管理)';
    document.getElementById('mf-mode').value=meetingId?'edit':'create';
    document.getElementById('mf-original-id').value=meetingId||'';
    this.tempFiles={};
    if(meetingId){
      const m=this.getMeetings().find(x=>x.meeting_id===meetingId);
      if(!m) return;
      document.getElementById('mf-number').value=m.meeting_number;
      document.getElementById('mf-title').value=m.title;
      document.getElementById('mf-date').value=m.date||'';
      document.getElementById('mf-time').value=m.time||'19:15';
      document.getElementById('mf-location').value=m.location||'';
      document.getElementById('mf-visibility').value=m.visibility||'public';
      document.getElementById('mf-status').value=m.status||'completed';
      document.getElementById('mf-agenda').value=m.agenda||'';
      document.getElementById('mf-minutes').value=m.minutes||'';
      document.getElementById('mf-author').value=m.author||m.created_by||'';
      document.getElementById('mf-agenda-file-name').textContent=m.agenda_file_name?`已上傳: ${m.agenda_file_name}`:'';
      document.getElementById('mf-minutes-file-name').textContent=m.minutes_file_name?`已上傳: ${m.minutes_file_name}`:'';
      document.getElementById('mf-attachments-list').innerHTML=(m.attachments||[]).map(a=>`<span class="file-chip">${escapeHtml(a.file_name)} <button onclick="app.removeTempAttachment('${a.file_id}')" class="text-rose-500"><i class="fa-solid fa-xmark"></i></button></span>`).join('');
    }else{
      document.getElementById('mf-number').value='1';
      document.getElementById('mf-title').value='';
      document.getElementById('mf-date').value=todayISO();
      document.getElementById('mf-time').value='19:15';
      document.getElementById('mf-location').value='百周年紀念大樓1704室';
      document.getElementById('mf-visibility').value='public';
      document.getElementById('mf-status').value='upcoming';
      document.getElementById('mf-agenda').value=''; document.getElementById('mf-minutes').value=''; document.getElementById('mf-author').value=this.currentUser?.name||'';
      document.getElementById('mf-agenda-file-name').textContent=''; document.getElementById('mf-minutes-file-name').textContent=''; document.getElementById('mf-attachments-list').innerHTML='';
      document.getElementById('mf-agenda-file').value=''; document.getElementById('mf-minutes-file').value=''; document.getElementById('mf-attachments').value='';
    }
    document.getElementById('modal-meeting-form').classList.remove('hidden');
  }
,
  async submitMeetingForm(e){
    e.preventDefault();
    const mode=document.getElementById('mf-mode').value;
    const origId=document.getElementById('mf-original-id').value;
    const list=this.getMeetings();
    let agendaFileName='', agendaFileData='', agendaFileUrl='', minutesFileName='', minutesFileData='', minutesFileUrl='';
    const folderCfg=this.getMeetingFolderConfig();
    const useDrive=!!folderCfg.id && !this.mockMode && this.gasUrl;
    if(useDrive) showToast('正在上傳到指定資料夾...','warning');
    const agendaFile=document.getElementById('mf-agenda-file').files[0];
    if(agendaFile){ 
      agendaFileName=agendaFile.name; 
      const data=await fileToDataUrl(agendaFile);
      if(useDrive){
        const res=await this.uploadFileToDriveFolder(agendaFile.name, data, agendaFile.type);
        if(res.success){ agendaFileUrl=res.file_url||res.download_url; agendaFileData=''; showToast(`議程已上傳到資料夾: ${res.file_name}`,'success'); }
        else { agendaFileData=data; showToast('Drive上傳失敗，改本地儲存: '+res.error,'warning'); }
      } else agendaFileData=data;
    }
    const minutesFile=document.getElementById('mf-minutes-file').files[0];
    if(minutesFile){ 
      minutesFileName=minutesFile.name; 
      const data=await fileToDataUrl(minutesFile);
      if(useDrive){
        const res=await this.uploadFileToDriveFolder(minutesFile.name, data, minutesFile.type);
        if(res.success){ minutesFileUrl=res.file_url||res.download_url; minutesFileData=''; showToast(`紀錄已上傳到資料夾: ${res.file_name}`,'success'); }
        else { minutesFileData=data; showToast('Drive上傳失敗，改本地儲存','warning'); }
      } else minutesFileData=data;
    }
    const attachFiles=document.getElementById('mf-attachments').files;
    const attachments=[];
    for(let f of attachFiles){ 
      const data=await fileToDataUrl(f); 
      let fileUrl='', finalData=data;
      if(useDrive){
        const res=await this.uploadFileToDriveFolder(f.name, data, f.type);
        if(res.success){ fileUrl=res.file_url||res.download_url; finalData=''; }
      }
      attachments.push({file_id:'f_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),file_name:f.name,file_data:finalData,file_url:fileUrl,folder_id:folderCfg.id||'',file_size:f.size,uploaded_by:this.currentUser?.name||'',uploaded_at:new Date().toISOString(),description:''}); 
    }
    if(mode==='edit'){
      const idx=list.findIndex(x=>x.meeting_id===origId); if(idx<0) return;
      const old=list[idx];
      const updated={
        ...old,
        meeting_number:parseInt(document.getElementById('mf-number').value),
        title:document.getElementById('mf-title').value.trim(),
        date:document.getElementById('mf-date').value,
        time:document.getElementById('mf-time').value,
        location:document.getElementById('mf-location').value.trim(),
        visibility:document.getElementById('mf-visibility').value,
        status:document.getElementById('mf-status').value,
        agenda:document.getElementById('mf-agenda').value.trim(),
        minutes:document.getElementById('mf-minutes').value.trim(),
        author:document.getElementById('mf-author').value.trim(),
        updated_at:new Date().toISOString()
      };
      if(agendaFileName){ updated.agenda_file_name=agendaFileName; updated.agenda_file_data=agendaFileData; updated.agenda_file_url=agendaFileUrl||old.agenda_file_url||''; updated.agenda_uploaded_by=this.currentUser?.name||''; updated.agenda_uploaded_at=new Date().toISOString(); }
      if(minutesFileName){ updated.minutes_file_name=minutesFileName; updated.minutes_file_data=minutesFileData; updated.minutes_file_url=minutesFileUrl||old.minutes_file_url||''; updated.minutes_uploaded_by=this.currentUser?.name||''; updated.minutes_uploaded_at=new Date().toISOString(); }
      if(attachments.length){ updated.attachments=[...(old.attachments||[]),...attachments]; }
      list[idx]=updated;
    }else{
      const newMeeting={
        meeting_id:'m_'+Date.now(),
        event_id:this.currentEvent.event_id,
        meeting_number:parseInt(document.getElementById('mf-number').value),
        title:document.getElementById('mf-title').value.trim(),
        date:document.getElementById('mf-date').value,
        time:document.getElementById('mf-time').value,
        location:document.getElementById('mf-location').value.trim(),
        visibility:document.getElementById('mf-visibility').value,
        status:document.getElementById('mf-status').value,
        agenda:document.getElementById('mf-agenda').value.trim(),
        agenda_file_name:agendaFileName, agenda_file_data:agendaFileData, agenda_file_url:agendaFileUrl, agenda_uploaded_by:this.currentUser?.name||'', agenda_uploaded_at:new Date().toISOString(),
        minutes:document.getElementById('mf-minutes').value.trim(),
        minutes_file_name:minutesFileName, minutes_file_data:minutesFileData, minutes_file_url:minutesFileUrl, minutes_uploaded_by:this.currentUser?.name||'', minutes_uploaded_at:new Date().toISOString(),
        attachments:attachments,
        group_uploads:[],
        created_by:this.currentUser?.name||'', created_at:new Date().toISOString(), author:document.getElementById('mf-author').value.trim()
      };
      list.push(newMeeting);
    }
    this.saveMeetings(list);
    this.closeModal('modal-meeting-form');
    showToast(mode==='edit'?'✅ 會議已更新 (全前端)':'✅ 會議已新增 (分次管理)','success');
    this.renderMeetingsList();
  }
,
  openMeetingDetail(meetingId){
    const m=this.getMeetings().find(x=>x.meeting_id===meetingId);
    if(!m){ showToast('找不到會議','error'); return; }
    if(!this.canManageMeetings() && m.visibility==='private'){ showToast('此會議僅管理員／秘書處／行政組可看 (整理用)','error'); return; }
    if(m.visibility==='attendees' && !this.isDirectorOrAbove() && !this.canManageMeetings()){ showToast('僅主任或以上可看','error'); return; }
    this.currentMeetingId=meetingId;
    this.renderMeetingDetail(m);
    document.getElementById('modal-meeting-detail').classList.remove('hidden');
  }
,
  renderMeetingDetail(m){
    document.getElementById('md-number-badge').textContent=m.meeting_number===0?'第0次預備':m.meeting_number===99?'臨時會議':`第${m.meeting_number}次`;
    const visClass={public:'visibility-public',private:'visibility-private',attendees:'visibility-attendees'}[m.visibility]||'visibility-public';
    const visText={public:'全部與會者可看',private:'僅管理員 (整理用)',attendees:'僅主任或以上'}[m.visibility]||m.visibility;
    const visEl=document.getElementById('md-visibility-badge'); visEl.className='visibility-badge '+visClass; visEl.textContent=visText;
    document.getElementById('md-status-badge').textContent={upcoming:'即將舉行',completed:'已完成',draft:'草稿整理中'}[m.status]||m.status;
    document.getElementById('md-title').textContent=m.title;
    document.getElementById('md-date').textContent=m.date||'-'; document.getElementById('md-time').textContent=m.time||''; document.getElementById('md-location').textContent=m.location||''; document.getElementById('md-author').textContent=m.author||m.created_by||'';
    document.getElementById('md-agenda-text').innerHTML=this.renderBuiltInAgendaHtml(m,'detail');
    document.getElementById('md-minutes-text').innerHTML=this.renderBuiltInMinutesHtml(m,'detail');
    ['md-agenda-preview','md-minutes-preview'].forEach(id=>{const el=document.getElementById(id); if(el){ el.innerHTML=''; el.classList.add('hidden'); }});
    // Drive 資料夾連結：如會議設有 drive_root_url，在議程分頁頂部顯示
    const driveFolderHtml=m.drive_root_url?`<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2"><div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2 min-w-0"><i class="fa-solid fa-book-open text-emerald-600 text-lg flex-shrink-0"></i><div class="min-w-0"><b class="text-[12px] text-emerald-900">議程／紀錄已內建喺 APP（免開 Drive）</b><div class="text-[10px] text-emerald-700">下方文字版即時可讀；Drive 原檔可用「頁內預覽」或下載。</div></div></div><a href="${escapeHtml(m.drive_root_url)}" target="_blank" rel="noopener" class="text-[10px] text-emerald-700 underline flex-shrink-0">Drive 資料夾</a></div></div>`:'';
    const agendaArea=document.getElementById('md-agenda-file-area'); 
    if(m.agenda_file_name||m.agenda_file_url||m.agenda_file_data){ 
      agendaArea.classList.remove('hidden'); 
      document.getElementById('md-agenda-file-name').textContent=m.agenda_file_name||'議程檔案'; 
      const isAgendaDrive=m.agenda_file_url&&String(m.agenda_file_url).includes('drive.google.com');
      document.getElementById('md-agenda-file-meta').textContent=isAgendaDrive?'Google Drive 資料夾':`${m.agenda_uploaded_by||''} · ${m.agenda_uploaded_at?new Date(m.agenda_uploaded_at).toLocaleString():''}`;
      document.getElementById('md-agenda-file-info').innerHTML=isAgendaDrive?`<span class="text-emerald-700 font-bold"><i class="fa-brands fa-google-drive mr-1"></i>點擊「開啟」可瀏覽資料夾內所有議程檔案</span>`:`儲存位置：<b>${this.mockMode?'瀏覽器 localStorage':'Sheet + 快取'}</b>`;
      document.getElementById('md-agenda-delete-btn').classList.toggle('hidden',!this.canManageMeetings());
    } else agendaArea.classList.add('hidden');
    // 插入 Drive 資料夾連結到議程分頁頂部
    const driveBannerEl=document.getElementById('md-drive-folder-banner');
    if(driveBannerEl){ driveBannerEl.innerHTML=driveFolderHtml; driveBannerEl.classList.toggle('hidden',!driveFolderHtml); }
    const minutesArea=document.getElementById('md-minutes-file-area'); 
    if(m.minutes_file_name||m.minutes_file_url||m.minutes_file_data){ 
      minutesArea.classList.remove('hidden'); 
      document.getElementById('md-minutes-file-name').textContent=m.minutes_file_name||'會議紀錄檔案';
      const isMinutesDrive=m.minutes_file_url&&String(m.minutes_file_url).includes('drive.google.com');
      document.getElementById('md-minutes-file-meta').textContent=isMinutesDrive?'Google Drive 資料夾':`${m.minutes_uploaded_by||''} · ${m.minutes_uploaded_at?new Date(m.minutes_uploaded_at).toLocaleString():''}`;
      document.getElementById('md-minutes-file-info').innerHTML=isMinutesDrive?`<span class="text-emerald-700 font-bold"><i class="fa-brands fa-google-drive mr-1"></i>點擊「開啟」可瀏覽資料夾內所有會議紀錄檔案</span>`:`儲存位置：<b>${this.mockMode?'localStorage':'Sheet + 快取'}</b>`;
      document.getElementById('md-minutes-delete-btn').classList.toggle('hidden',!this.canManageMeetings());
    } else minutesArea.classList.add('hidden');
    document.getElementById('md-attach-count').textContent=(m.attachments||[]).length;
    document.getElementById('md-group-count').textContent=(m.group_uploads||[]).length;
    const attachList=document.getElementById('md-attachments-list');
    if((m.attachments||[]).length===0) attachList.innerHTML='<p class="text-xs text-slate-400 py-4 text-center">暫無附加文件</p>';
    else attachList.innerHTML=m.attachments.map(a=>`<div class="flex justify-between items-center bg-slate-50 border rounded-xl p-3"><div class="flex items-center gap-2 min-w-0 flex-1"><i class="fa-solid fa-file text-sky-600"></i><div class="min-w-0"><div class="text-[12px] font-bold truncate">${escapeHtml(a.file_name)}</div><div class="text-[10px] text-slate-500">${escapeHtml(a.uploaded_by||'')} · ${a.uploaded_at?new Date(a.uploaded_at).toLocaleString():''} · ${(a.file_size? (a.file_size/1024).toFixed(1)+'KB':'')}</div></div></div><div class="flex gap-1"><button onclick="app.downloadAttachment('${m.meeting_id}','${a.file_id}')" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載</button>${this.canManageMeetings()?`<button onclick="app.deleteAttachment('${m.meeting_id}','${a.file_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1.5 rounded-xl text-[11px]"><i class="fa-solid fa-trash"></i></button>`:''}</div></div>`).join('');
    const isAdmin=this.canManageMeetings();
    document.getElementById('md-agenda-admin-upload').classList.toggle('hidden',!isAdmin);
    document.getElementById('md-minutes-admin-upload').classList.toggle('hidden',!isAdmin);
    document.getElementById('md-attachments-admin').classList.toggle('hidden',!isAdmin);
    const groupForm=document.getElementById('md-group-upload-form');
    groupForm.classList.toggle('hidden',!(this.canUploadGroup()||isAdmin));
    const groupList=document.getElementById('md-group-list');
    if((m.group_uploads||[]).length===0) groupList.innerHTML='<p class="text-xs text-slate-400 py-3 text-center">暫無各小組資料，上傳後可在此查看與下載 (支援 PPT/PDF/圖檔/Drive連結)</p>';
    else{
      // filter by visibility for non-admin
      let uploads=m.group_uploads;
      if(!isAdmin){
        uploads=uploads.filter(u=>{
          if(u.visibility==='private') return false;
          if(u.visibility==='attendees' && !this.isDirectorOrAbove()) return false;
          return true;
        });
      }
      groupList.innerHTML=uploads.map(u=>{
        const visBadge={public:'<span class="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">公開</span>',private:'<span class="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full border border-rose-200">僅管理員</span>',attendees:'<span class="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-200">僅主任以上</span>'}[u.visibility]||'';
        return `<div class="border rounded-xl p-3 bg-white space-y-2">
          <div class="flex justify-between items-start gap-2"><div><div class="flex items-center gap-2 flex-wrap"><b class="text-[13px]">${escapeHtml(u.group_name)}</b> ${visBadge} <span class="text-[11px] text-slate-500">${escapeHtml(u.title||'會員資料')}</span></div><div class="text-[11px] text-slate-500 mt-1">${escapeHtml(u.uploaded_by||'')} · ${escapeHtml(u.role||'')} · ${u.uploaded_at?new Date(u.uploaded_at).toLocaleString():''}</div></div><div class="flex gap-1"><button onclick="app.downloadGroupFile('${m.meeting_id}','${u.upload_id}')" class="bg-amber-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載</button>${isAdmin?`<select onchange="app.changeGroupVisibility('${m.meeting_id}','${u.upload_id}',this.value)" class="text-[11px] border rounded-xl px-2 py-1 bg-white"><option value="public" ${u.visibility==='public'?'selected':''}>公開</option><option value="private" ${u.visibility==='private'?'selected':''}>僅管理員</option><option value="attendees" ${u.visibility==='attendees'?'selected':''}>僅主任以上</option></select><button onclick="app.deleteGroupUpload('${m.meeting_id}','${u.upload_id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[11px]"><i class="fa-solid fa-trash"></i></button>`:''}</div></div>
          ${u.member_data?`<div class="bg-slate-50 border rounded-xl p-2.5 text-[11px] leading-relaxed whitespace-pre-line">${escapeHtml(u.member_data)}</div>`:''}
          ${u.file_name?`<div class="flex items-center gap-2 text-[11px]"><i class="fa-solid fa-file text-amber-600"></i><span class="font-medium">${escapeHtml(u.file_name)}</span><span class="text-slate-400">${u.file_size? (u.file_size/1024).toFixed(1)+'KB':''}</span></div>`:''}
        </div>`;
      }).join('');
    }
    document.getElementById('md-edit-btn').classList.toggle('hidden',!isAdmin);
    document.getElementById('md-delete-btn').classList.toggle('hidden',!isAdmin);
    this.switchMeetingDetailTab('agenda');
  }
,
  switchMeetingDetailTab(tab,btn){
    this.meetingDetailTab=tab;
    document.querySelectorAll('#modal-meeting-detail .tab-btn').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active'); else document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
    ['agenda','minutes','attachments','group'].forEach(t=>{const el=document.getElementById('md-tab-'+t); if(el) el.classList.toggle('hidden',t!==tab);});
  }
,
  /* 直接下載 Drive 檔案（用隱藏 iframe，唔會彈出 Google Drive APP／新分頁） */
  downloadDriveFile(url,name){
    const id=this.driveFileIdFromUrl(url);
    if(!id){ if(url) window.open(url,'_blank','noopener'); return false; }
    const fr=document.createElement('iframe');
    fr.style.display='none';
    fr.src=`https://drive.google.com/uc?export=download&id=${id}`;
    document.body.appendChild(fr);
    setTimeout(()=>fr.remove(),60000);
    return true;
  }
,
  downloadCurrentMeetingFile(type){
    const m=this.getMeetings().find(x=>x.meeting_id===this.currentMeetingId); if(!m) return;
    const classified=(m.classified_files||[]).find(f=>f.kind===type && f.file_url);
    if(type==='agenda'){
      const url=m.agenda_file_url||classified?.file_url||'';
      if(url){ this.downloadDriveFile(url,m.agenda_file_name); showToast('議程檔案下載中（唔會跳去 Drive APP）','success'); return; }
      if(m.agenda_file_data) downloadDataUrl(m.agenda_file_name||'議程.pdf',m.agenda_file_data);
      else showToast('無文件可下載','warning');
    } else if(type==='minutes'){
      const url=m.minutes_file_url||classified?.file_url||'';
      if(url){ this.downloadDriveFile(url,m.minutes_file_name); showToast('會議紀錄下載中（唔會跳去 Drive APP）','success'); return; }
      if(m.minutes_file_data) downloadDataUrl(m.minutes_file_name||'紀錄.pdf',m.minutes_file_data);
      else showToast('無文件可下載','warning');
    }
  }
,
  /* 會議詳情：頁內預覽議程／紀錄 PDF（iframe，唔彈窗） */
  toggleMeetingDetailPreview(type){
    const m=this.getMeetings().find(x=>x.meeting_id===this.currentMeetingId); if(!m) return;
    const classified=(m.classified_files||[]).find(f=>f.kind===type && f.file_url);
    const rec=this.getMeetingRecord(m);
    const url=(type==='agenda'?(m.agenda_file_url||rec?.source?.agenda_file_url):(m.minutes_file_url||rec?.source?.minutes_file_url))||classified?.file_url||'';
    const id=this.driveFileIdFromUrl(url);
    if(!id){ showToast('此會議未有可預覽的 Drive 檔案（內建文字版已在上方）','warning'); return; }
    this.toggleInlineDrivePreview('md-'+type+'-preview',id);
  }
,
  downloadAttachment(meetingId,fileId){
    const m=this.getMeetings().find(x=>x.meeting_id===meetingId); if(!m) return;
    const f=(m.attachments||[]).find(x=>x.file_id===fileId); if(!f){ showToast('文件不存在','error'); return; }
    if(f.file_url){ this.downloadDriveFile(f.file_url,f.file_name); showToast('檔案下載中（唔會跳去 Drive APP）','success'); return; }
    if(!f.file_data){ showToast('文件不存在','error'); return; }
    downloadDataUrl(f.file_name,f.file_data);
  }
,
  downloadGroupFile(meetingId,uploadId){
    const m=this.getMeetings().find(x=>x.meeting_id===meetingId); if(!m) return;
    const u=(m.group_uploads||[]).find(x=>x.upload_id===uploadId); 
    if(!u){ showToast('找不到資料','error'); return; }
    if(u.file_url){ this.downloadDriveFile(u.file_url,u.file_name); showToast('檔案下載中（唔會跳去 Drive APP）','success'); return; }
    if(!u.file_data){ if(u.member_data){ const blob=new Blob([u.member_data],{type:'text/plain'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=(u.group_name||'group')+'_會員資料.txt'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); return;} showToast('無檔案，僅有文字資料','warning'); return; }
    downloadDataUrl(u.file_name||'group_file',u.file_data);
  }
,
  downloadAllMeetingFiles(meetingId=null){
    const id=meetingId||this.currentMeetingId;
    const m=this.getMeetings().find(x=>x.meeting_id===id); if(!m){ showToast('找不到會議','error'); return; }
    let count=0; let driveCount=0;
    if(m.agenda_file_url){ setTimeout(()=>this.downloadDriveFile(m.agenda_file_url,m.agenda_file_name),count*300); driveCount++; count++; }
    else if(m.agenda_file_data){ setTimeout(()=>downloadDataUrl(m.agenda_file_name||'議程',m.agenda_file_data),count*400); count++; }
    if(m.minutes_file_url){ setTimeout(()=>this.downloadDriveFile(m.minutes_file_url,m.minutes_file_name),count*300); driveCount++; count++; }
    else if(m.minutes_file_data){ setTimeout(()=>downloadDataUrl(m.minutes_file_name||'紀錄',m.minutes_file_data),count*400); count++; }
    (m.attachments||[]).forEach(a=>{ 
      if(a.file_url){ setTimeout(()=>this.downloadDriveFile(a.file_url,a.file_name),count*300); driveCount++; count++; }
      else if(a.file_data){ setTimeout(()=>downloadDataUrl(a.file_name,a.file_data),count*400); count++; } 
    });
    (m.group_uploads||[]).forEach(u=>{ if(this.canManageMeetings()||u.visibility!=='private'){ 
      if(u.file_url){ setTimeout(()=>this.downloadDriveFile(u.file_url,u.file_name),count*300); driveCount++; count++; }
      else if(u.file_data){ setTimeout(()=>downloadDataUrl(u.file_name||'會員資料',u.file_data),count*400); count++; } 
    } });
    if(count===0) showToast('此會議暫無可下載文件','warning'); else showToast(`已開始下載 ${count} 個文件（其中 ${driveCount} 個由 Drive 直接下載，唔會彈去 Drive APP）`, 'success');
  }
,
  downloadAllMeetingsFiles(){
    const list=this.getMeetings(); if(!list.length){ showToast('暫無會議','warning'); return; }
    const total=list.reduce((a,m)=>a+(m.attachments?.length||0)+(m.agenda_file_data||m.agenda_file_url?1:0)+(m.minutes_file_data||m.minutes_file_url?1:0),0);
    if(!confirm(`確定打包下載全部 ${list.length} 場會議的所有文件？瀏覽器會逐個彈出/開啟新分頁，共約 ${total} 個文件`)) return;
    let delay=0;
    list.forEach(m=>{
      if(m.agenda_file_url){ setTimeout(()=>this.downloadDriveFile(m.agenda_file_url,m.agenda_file_name),delay); delay+=400; }
      else if(m.agenda_file_data){ setTimeout(()=>downloadDataUrl(`第${m.meeting_number}次_${m.agenda_file_name||'議程'}`,m.agenda_file_data),delay); delay+=500; }
      if(m.minutes_file_url){ setTimeout(()=>this.downloadDriveFile(m.minutes_file_url,m.minutes_file_name),delay); delay+=400; }
      else if(m.minutes_file_data){ setTimeout(()=>downloadDataUrl(`第${m.meeting_number}次_${m.minutes_file_name||'紀錄'}`,m.minutes_file_data),delay); delay+=500; }
      (m.attachments||[]).forEach(a=>{ 
        if(a.file_url) setTimeout(()=>this.downloadDriveFile(a.file_url,a.file_name),delay);
        else setTimeout(()=>downloadDataUrl(`第${m.meeting_number}次_${a.file_name}`,a.file_data),delay);
        delay+=500; 
      });
    });
    showToast(`已開始打包下載全部會議文件，共約 ${Math.round(delay/500)} 個（Drive 檔案直接下載，唔會彈去 Drive APP）`, 'success');
  }
,
  exportMeetings(){
    const list=this.getMeetings(); const blob=new Blob([JSON.stringify(list,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`meetings_${todayISO()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); showToast('已匯出會議 JSON','success');
  }
,
  async uploadMeetingFileInDetail(type){
    const m=this.getMeetings().find(x=>x.meeting_id===this.currentMeetingId); if(!m) return;
    const inputId={agenda:'md-agenda-upload',minutes:'md-minutes-upload',attachment:'md-attachment-upload'}[type];
    const input=document.getElementById(inputId); if(!input||!input.files.length){ showToast('請選擇檔案','warning'); return; }
    const files=Array.from(input.files);
    const list=this.getMeetings(); const idx=list.findIndex(x=>x.meeting_id===this.currentMeetingId);
    const folderCfg=this.getMeetingFolderConfig();
    const useDrive=!!folderCfg.id && !this.mockMode && this.gasUrl;
    if(useDrive) showToast('正在上傳到指定資料夾 '+folderCfg.id+'...','warning');
    for(let f of files){
      const data=await fileToDataUrl(f);
      let fileUrl='';
      if(useDrive){
        const res=await this.uploadFileToDriveFolder(f.name, data, f.type);
        if(res.success){ fileUrl=res.file_url||res.download_url; showToast(`已上傳到資料夾: ${f.name}`,'success'); }
        else { showToast('Drive上傳失敗，改本地: '+res.error,'warning'); }
      }
      if(type==='agenda'){ list[idx].agenda_file_name=f.name; list[idx].agenda_file_data=fileUrl?'':data; list[idx].agenda_file_url=fileUrl; list[idx].agenda_uploaded_by=this.currentUser?.name||''; list[idx].agenda_uploaded_at=new Date().toISOString(); }
      else if(type==='minutes'){ list[idx].minutes_file_name=f.name; list[idx].minutes_file_data=fileUrl?'':data; list[idx].minutes_file_url=fileUrl; list[idx].minutes_uploaded_by=this.currentUser?.name||''; list[idx].minutes_uploaded_at=new Date().toISOString(); }
      else{ if(!list[idx].attachments) list[idx].attachments=[]; list[idx].attachments.push({file_id:'f_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),file_name:f.name,file_data:fileUrl?'':data,file_url:fileUrl,folder_id:folderCfg.id||'',file_size:f.size,uploaded_by:this.currentUser?.name||'',uploaded_at:new Date().toISOString(),description:''}); }
    }
    this.saveMeetings(list); this.renderMeetingDetail(list[idx]); this.renderMeetingsList(); showToast(useDrive?'✅ 文件已上傳到指定資料夾 (Drive)':'✅ 文件已上傳 (全前端)','success'); input.value='';
  }
,
  async submitGroupUpload(e){
    e.preventDefault();
    const mId=this.currentMeetingId; const list=this.getMeetings(); const idx=list.findIndex(x=>x.meeting_id===mId); if(idx<0) return;
    const group=document.getElementById('gu-group').value.trim(); const title=document.getElementById('gu-title').value.trim(); const memberData=document.getElementById('gu-member-data').value.trim(); const visibility=document.getElementById('gu-visibility').value; const fileInput=document.getElementById('gu-file'); let fileName='', fileData='', fileUrl='', fileSize=0;
    if(fileInput.files[0]){ const f=fileInput.files[0]; fileName=f.name; fileSize=f.size; const data=await fileToDataUrl(f); 
      const folderCfg=this.getMeetingFolderConfig();
      const useDrive=!!folderCfg.id && !this.mockMode && this.gasUrl;
      if(useDrive){
        const res=await this.uploadFileToDriveFolder(f.name, data, f.type);
        if(res.success){ fileUrl=res.file_url||res.download_url; fileData=''; showToast(`已上傳到指定資料夾: ${f.name}`,'success'); }
        else { fileData=data; showToast('Drive上傳失敗，改本地','warning'); }
      } else fileData=data;
    }
    if(!group||!title){ showToast('請填寫組別和標題','error'); return; }
    const upload={upload_id:'gu_'+Date.now(),group_name:group,title:title,file_name:fileName,file_data:fileData,file_url:fileUrl,folder_id:this.getMeetingFolderConfig().id||'',file_size:fileSize,member_data:memberData,uploaded_by:this.currentUser?.name||'',role:this.currentUser?.role||'',uploaded_at:new Date().toISOString(),visibility:visibility||'public'};
    if(!list[idx].group_uploads) list[idx].group_uploads=[]; list[idx].group_uploads.push(upload);
    this.saveMeetings(list); this.renderMeetingDetail(list[idx]); this.renderMeetingsList(); showToast('✅ 各小組資料已上傳','success');
    document.getElementById('gu-group').value=''; document.getElementById('gu-title').value=''; document.getElementById('gu-member-data').value=''; document.getElementById('gu-file').value='';
  }
,
  changeGroupVisibility(meetingId,uploadId,newVis){
    const list=this.getMeetings(); const idx=list.findIndex(x=>x.meeting_id===meetingId); if(idx<0) return; const upIdx=(list[idx].group_uploads||[]).findIndex(u=>u.upload_id===uploadId); if(upIdx<0) return; list[idx].group_uploads[upIdx].visibility=newVis; this.saveMeetings(list); this.renderMeetingDetail(list[idx]); showToast(`可見度已改為 ${newVis}`,'success');
  }
,
  deleteAttachment(meetingId,fileId){
    if(!this.canManageMeetings()){ showToast('僅管理員可刪除','error'); return; }
    if(!confirm('確定刪除此附件？管理員操作，無法復原')) return; const list=this.getMeetings(); const idx=list.findIndex(x=>x.meeting_id===meetingId); if(idx<0) return; list[idx].attachments=(list[idx].attachments||[]).filter(a=>a.file_id!==fileId); this.saveMeetings(list); this.renderMeetingDetail(list[idx]); this.renderMeetingsList(); showToast('已刪除附件 (管理員)','warning');
  }
,
  deleteGroupUpload(meetingId,uploadId){
    if(!this.canManageMeetings() && !this.canUploadGroup()){ showToast('無權限刪除','error'); return; }
    if(!confirm('確定刪除此小組資料？')) return; const list=this.getMeetings(); const idx=list.findIndex(x=>x.meeting_id===meetingId); if(idx<0) return; 
    // 只有管理員或上傳者本人可刪
    const upload=(list[idx].group_uploads||[]).find(u=>u.upload_id===uploadId);
    if(!this.canManageMeetings() && upload && upload.uploaded_by!==this.currentUser?.name){ showToast('只能刪除自己上傳的資料，管理員可刪全部','error'); return; }
    list[idx].group_uploads=(list[idx].group_uploads||[]).filter(u=>u.upload_id!==uploadId); this.saveMeetings(list); this.renderMeetingDetail(list[idx]); this.renderMeetingsList(); showToast('已刪除資料','warning');
  }
,
  deleteMeetingFile(type){
    if(!this.canManageMeetings()){ showToast('僅管理員可刪除會議檔案','error'); return; }
    const typeName={agenda:'議程',minutes:'會議紀錄'}[type]||type;
    if(!confirm(`確定刪除此會議的${typeName}檔案？管理員操作`)) return;
    const list=this.getMeetings(); const idx=list.findIndex(x=>x.meeting_id===this.currentMeetingId); if(idx<0) return;
    if(type==='agenda'){ list[idx].agenda_file_name=''; list[idx].agenda_file_data=''; list[idx].agenda_uploaded_by=''; list[idx].agenda_uploaded_at=''; }
    else if(type==='minutes'){ list[idx].minutes_file_name=''; list[idx].minutes_file_data=''; list[idx].minutes_uploaded_by=''; list[idx].minutes_uploaded_at=''; }
    this.saveMeetings(list); this.renderMeetingDetail(list[idx]); this.renderMeetingsList(); showToast(`已刪除${typeName}檔案 (管理員)`,'warning');
  }
,
  async deleteMeeting(meetingId){
    if(!this.canManageMeetings()){ showToast('僅管理員可刪除會議','error'); return; }
    if(!confirm('確定刪除此會議？所有議程、紀錄、附件、各組會員資料將一併刪除，無法復原！')) return;
    this.markRecordDeleted('Meetings',meetingId);
    let list=this.getMeetings().filter(x=>x.meeting_id!==meetingId); this.saveMeetings(list);
    const result=await this.deleteGasRecord('Meetings',meetingId);
    if(this.currentMeetingId===meetingId) this.closeModal('modal-meeting-detail');
    this.renderMeetingsList(); showToast(result.success?'會議已從 APP 及後台刪除':`APP 已隱藏，但後台刪除失敗：${result.error}`,result.success?'warning':'error');
  }
,
  editCurrentMeeting(){ const id=this.currentMeetingId; this.closeModal('modal-meeting-detail'); setTimeout(()=>this.openMeetingFormModal(id),200); }
,
  deleteCurrentMeeting(){ if(!this.currentMeetingId) return; this.deleteMeeting(this.currentMeetingId); }
,
  removeTempAttachment(fileId){/* for form */ }
,
});
