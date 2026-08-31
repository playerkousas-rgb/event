/* 10-app-core.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
class ScoutEventApp{
  // 本地資料模式 (無開關)：「模擬示範版」活動永遠是 100% 本地沙盒 (改動不會寫出後端，介紹/示範用)；未設定後端網址時整站亦以本地資料運行。正式活動在已設定 GAS 時自動連線同步，無需人手切換。
  get mockMode(){ return this.isDemoEvent() || !this.gasUrl; }

  // ⚠️ 注意：constructor 必須係 class 內部真正嘅 constructor。
  // v-split（PR#30）曾經將佢搬去 Object.assign(ScoutEventApp.prototype,{constructor(){...}})，
  // 咁做 prototype.constructor 只係普通屬性，new ScoutEventApp() 會行預設空 constructor：
  // init() 永遠唔會跑 → 活動清單載入唔到（要手動按營帳圖示）、gasUrl 留空 →
  // mockMode 永遠 true → 所有經後端驗證嘅帳戶都登入失敗、資料唔再同步後端。
  constructor(){
    // v8.13：改用前端內建預設值做底（/api/config 只係可選覆寫），避免 /api/config 失敗時後端成個失聯
    this.gasUrl=localStorage.getItem(LS.gasUrl)||DEFAULT_GAS_URL; this.apiKey=localStorage.getItem(LS.apiKey)||DEFAULT_API_KEY; this.backendConfigStatus='';
    this.currentUser=JSON.parse(localStorage.getItem(LS.currentUser)||'null'); this.currentEvent=JSON.parse(localStorage.getItem(LS.currentEvent)||'null');
    if(this.currentUser){
      this.currentUser.group_name=normalizeGroupName(this.currentUser.group_name);
      if(this.currentUser.user_id==='exec_vp'||(this.currentUser.job_title||'').includes('執行副主席')) this.currentUser.role='executive_vice_chairperson';
      if(this.currentUser.role!=='super_admin' && isLegacyLatinLogin(this.currentUser.user_id) && (this.currentUser.name||'').trim()){
        this.currentUser.user_id=this.currentUser.name.trim();
      }
      localStorage.setItem(LS.currentUser,JSON.stringify(this.currentUser));
    }
    this.eventsList=JSON.parse(localStorage.getItem(LS.events)||'null')||[]; this.eventData={}; this.usersList=[]; this.currentModule=null; this.navHistory=[]; this._restoringNav=false; this.staffSubTab='org_chart'; this.execManualSubTab='staff';
    this.pendingChanges=JSON.parse(localStorage.getItem(LS.pending(this.currentEvent?.event_id||'isd_2026'))||'[]'); this.bulkPending=[]; this.meetingsCache=[]; this.currentMeetingId=null; this.tempFiles={}; this.meetingDetailTab='agenda'; this.meetingDriveViewMode=localStorage.getItem('meeting_drive_view_mode')||'list'; this.approvalPerms=[]; this.approvalRouting=this.getLocalApprovalRouting(); this.approvalViewMode='byPerson';
    this.systemConfig=JSON.parse(localStorage.getItem(LS.config(this.currentEvent?.event_id||'global'))||'null')||{bannerText:'第4次籌備會議：2026-08-18 19:15 @ 1704室',nextMeeting:'2026-08-18 19:15',meetingLocation:'1704室',allowPublic:true,defaultPwd:'1234',meeting_folder_link:'https://drive.google.com/drive/folders/13P0gJ3c-1zXTzniZFZL6VT2EZP_FDTYM',meeting_folder_id:'13P0gJ3c-1zXTzniZFZL6VT2EZP_FDTYM'};
    // 防誤觸導航（幽靈點擊）：非同步載入完成時若正在觸控／剛完成觸控，避免即時替換畫面上的卡片 DOM，
    // 否則瀏覽器會把 touchend 合成的 click 落在新插入的卡片上，令主頁「自動跳入」某個部門卡片。
    this._touchActive=false; this._lastTouchAt=0;
    try{
      const tStart=()=>{this._touchActive=true;this._lastTouchAt=Date.now();};
      const tEnd=()=>{this._touchActive=false;this._lastTouchAt=Date.now();};
      document.addEventListener('touchstart',tStart,{passive:true});
      document.addEventListener('touchend',tEnd,{passive:true});
      document.addEventListener('touchcancel',tEnd,{passive:true});
      document.addEventListener('pointerdown',()=>{this._lastTouchAt=Date.now();},{passive:true});
    }catch(e){}
    this.init();
  }
}
Object.assign(ScoutEventApp.prototype,{
  async init(){
    // v8.13：記低 /api/config 嘅結果俾「後端連線診斷」睇；失敗都用內建預設值繼續行（唔會再成個後端失聯）
    try{
      const res=await fetch('/api/config').catch(()=>null);
      if(res&&res.ok){
        const txt=await res.text().catch(()=>'');
        try{ const j=JSON.parse(txt); if(j&&j.success){ this.apiKey=j.apiKey||this.apiKey; if(j.gasUrl) this.gasUrl=j.gasUrl; this.backendConfigStatus='OK（/api/config）'; } else this.backendConfigStatus='HTTP '+res.status+' 但 success=false'; }
        catch(pe){ this.backendConfigStatus='HTTP '+res.status+' 回應唔係 JSON：'+String(txt||'').slice(0,60); }
      } else {
        this.backendConfigStatus=res?('HTTP '+res.status+' '+(res.statusText||'')):'無法連線（無回應）';
        console.warn('[後端] /api/config '+this.backendConfigStatus+' → 改用前端內建預設 GAS 網址');
      }
    }catch(e){ this.backendConfigStatus='例外：'+(e&&e.message||e); }
    if(this.currentUser) this.updateUserUI(); this.applyBannerConfig(); this.updateAdminNav();
    // 一入 APP 直接顯示「選擇活動」首頁（像 trip APP）：登入狀態保留，但每次都先見到活動可選，
    // 唔使再按最頂營帳圖示先返到活動選擇頁。掃碼 hash（#donate-*）會喺 handleHashRoute 另行進入活動。
    this.goHome();
    this.updateSaveBar();
    // QR Code hash routing：掃碼後自動開啟捐贈表
    this.handleHashRoute();
  }
,
  closeModal(id){document.getElementById(id).classList.add('hidden');}
,
  openSettingsModal(){document.getElementById('gas-url-input').value=this.gasUrl; document.getElementById('api-key-input').value=this.apiKey; document.getElementById('modal-settings').classList.remove('hidden');}
,
  openLoginModal(){const demo=document.getElementById('mock-demo-login'); if(demo) demo.classList.toggle('hidden', !(this.mockMode && this.isDemoEvent())); document.getElementById('modal-login').classList.remove('hidden');}
,
  openGuideModal(){document.getElementById('modal-guide').classList.remove('hidden');}
,
  openBulkModal(){document.getElementById('modal-bulk').classList.remove('hidden');}
,
  switchTopTab(view,btn){
    if(view==='approvals' && this.roleLevel(this.currentUser?.role)<40){ showToast('批核中心只供總主任以上查看；各負責組按範疇批核','warning'); return; }
    if(view==='approvalmatrix' && !this.isAdmin()){ showToast('批核權限表只供 L1 或以上（管理員／顧問／主席／執行副主席）使用','warning'); return; }
    if(view==='users' && !this.canManageUsersPage()){ showToast('用戶管理只供主任以上使用','warning'); return; }
    this.pushNavHistory({view});
    ['landing','dashboard','module','users','bulk','approvals','approvalmatrix','system'].forEach(v=>{const el=document.getElementById('view-'+v); if(el) el.classList.add('hidden');});
    const target=document.getElementById('view-'+view); if(target) target.classList.remove('hidden');
    document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active')); if(btn) btn.classList.add('active'); else document.querySelector(`.nav-tab[data-view="${view}"]`)?.classList.add('active');
    this.updateBottomNav(); this.updateAdminNav(); // v8.13：頂 BAR 登入掣要跟住「有冇選活動」同步
    if(view==='users') this.loadUsers(); else if(view==='approvals') this.renderApprovalCenter(); else if(view==='approvalmatrix') this.renderApprovalMatrixView(); else if(view==='landing') this.loadEvents();
  }
,
  saveSettings(e){e.preventDefault(); this.gasUrl=document.getElementById('gas-url-input').value.trim(); this.apiKey=document.getElementById('api-key-input').value.trim()||this.apiKey; localStorage.setItem(LS.gasUrl,this.gasUrl); localStorage.setItem(LS.apiKey,this.apiKey); showToast('設定已保存','success'); this.closeModal('modal-settings'); this.loadEvents();}
,
  async loadEvents(){
    const grid=document.getElementById('events-grid'); if(grid) grid.innerHTML='<div class="col-span-2 text-center py-8 text-slate-400 text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i> 載入活動...</div>';
    let loaded=false;
    // 首頁清單固定以內建 events.json 為主 (保證「模擬示範版」沙盒及其他活動永遠顯示)，再合併後端 Events 表新增的正式活動
    try{const res=await fetch('data/events.json'); const data=await res.json(); if(Array.isArray(data)&&data.length){this.eventsList=data; loaded=true;}}catch(e){}
    if(this.gasUrl){try{const res=await fetch(`${this.gasUrl}?action=getEvents&api_key=${this.apiKey}`); const j=await res.json(); if(j.success&&Array.isArray(j.data)){ const known=new Set(this.eventsList.map(e=>e.event_id)); j.data.forEach(ev=>{ if(ev && ev.event_id && !known.has(ev.event_id)) this.eventsList.push(ev); }); if(this.eventsList.length) loaded=true; }}catch(e){}}
    if(!loaded && this.eventsList.length===0){this.eventsList=[{event_id:'isd_2026',event_name:'2026 港島童軍繽紛日',category:'isd',description:'港島地域年度旗艦',start_date:'2026-10-04',end_date:'2026-10-04',status:'active'},{event_id:'isd_2027',event_name:'2027 港島童軍繽紛日',category:'isd',description:'港島童軍繽紛日',start_date:'2027-10-01',end_date:'2027-10-04',status:'upcoming'}];}
    // 修正類別：避免舊快取 (無 category) 被誤判到「其他大型活動」
    this.eventsList=this.eventsList.map(ev=>{
      if(!ev.category){
        if((ev.event_id||'').startsWith('isd')||(ev.event_name||'').includes('繽紛')) ev.category='isd';
        else if((ev.event_id||'').startsWith('trailwalk')||(ev.event_name||'').includes('毅行')) ev.category='trailwalk';
        else ev.category='other';
      }
      return ev;
    });
    localStorage.setItem(LS.events,JSON.stringify(this.eventsList)); this.updateAdminNav(); this.renderEventsGrid();
  }
,
  categoryEvents(catKey){ return this.eventsList.filter(ev=>(ev.category||'other')===catKey); }
,
  catSelection(catKey){
    if(!this._catSel) this._catSel={};
    return this._catSel[catKey]||'';
  }
,
  renderEventsGrid(){
    const grid=document.getElementById('events-grid'); if(!grid) return;
    if(!this.eventsList.length){grid.innerHTML='<div class="col-span-3 text-center py-8 text-slate-400">暫無活動</div>'; return;}
    grid.innerHTML=EVENT_CATEGORIES.map(cat=>{
      const list=this.categoryEvents(cat.key);
      const sel=this.catSelection(cat.key);
      const current=list.find(ev=>ev.event_id===sel)||list[0];
      const options=list.map(ev=>`<option value="${escapeHtml(ev.event_id)}" ${ev.event_id===sel?'selected':''}>${escapeHtml(ev.event_name)}${ev.status==='active'?'（進行中）':''}</option>`).join('');
      const body=list.length
        ? `<select id="cat-${cat.key}-select" onchange="app.onCatSelect('${cat.key}',this.value)" class="w-full px-3 py-2.5 border rounded-xl text-sm bg-white mb-3">${options||''}</select>
           ${current?`
           <div class="text-[12px] text-slate-600 space-y-1.5 mb-4">
             <div class="flex items-center gap-2"><i class="fa-regular fa-calendar text-slate-400 w-4"></i>${escapeHtml([current.start_date,current.end_date].filter(Boolean).join(' → ')||'日期待公佈')}</div>
             <div class="flex items-center gap-2"><i class="fa-solid fa-location-dot text-slate-400 w-4"></i>${escapeHtml(current.location||'地點待公佈')}</div>
           </div>
           <button onclick="app.accessEvent('${current.event_id}')" class="w-full bg-gradient-to-r ${cat.gradient} text-white py-2.5 rounded-xl text-[13px] font-bold btn-mobile"><i class="fa-solid fa-right-to-bracket mr-1"></i>進入活動</button>`
          :`<div class="text-[12px] text-slate-400 py-6 text-center">暫無活動</div>`}`
        : `<div class="text-[12px] text-slate-400 py-8 text-center">此類別暫無活動</div>`;
      return `<div class="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
        <div class="bg-gradient-to-r ${cat.gradient} text-white px-4 py-3 flex items-center gap-2.5">
          <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-base flex-shrink-0"><i class="${cat.icon}"></i></div>
          <div class="min-w-0 flex-1"><h4 class="font-bold text-[15px] leading-tight">${cat.title}</h4><p class="text-[11px] text-white/80 truncate">${cat.desc}</p></div>
        </div>
        <div class="p-4 flex flex-col flex-1">
          <label class="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1"><i class="fa-solid fa-calendar-plus"></i>選擇年份／屆別</label>
          ${body}
        </div>
      </div>`;
    }).join('');
  }
,
  onCatSelect(catKey,val){ if(!this._catSel) this._catSel={}; this._catSel[catKey]=val; }
,
  accessEvent(id){this.pendingEventId=id; this.verifyAndEnterEvent(id);}
,
  submitEventPassword(e){e.preventDefault(); this.verifyAndEnterEvent(this.pendingEventId);}
,
  async verifyAndEnterEvent(id){const ev=this.eventsList.find(e=>e.event_id===id); if(!ev){showToast('找不到活動','error'); return;} this.currentEvent=ev; this.approvalRouting=this.getLocalApprovalRouting(); localStorage.setItem(LS.currentEvent,JSON.stringify(ev)); this.closeModal('modal-password'); this.showDashboard();}
,
  goHome(){this.pushNavHistory({view:'landing'}); this.currentEvent=null; localStorage.removeItem(LS.currentEvent); document.getElementById('view-landing').classList.remove('hidden'); ['dashboard','module','users','bulk','system','approvals','approvalmatrix'].forEach(v=>document.getElementById('view-'+v)?.classList.add('hidden')); document.getElementById('current-event-subtitle').textContent='選擇活動後即可查看該活動全部資料'; this.updateBottomNav(); this.updateAdminNav(); this.loadEvents();}
,
  async enterFirstEvent(){if(this.currentEvent){this.showDashboard(); return;} if(!this.eventsList.length) await this.loadEvents(); const ev=this.eventsList[0]; if(ev) this.accessEvent(ev.event_id); else showToast('暫無活動可進入','warning');}
,
  async showDashboard(){document.getElementById('view-landing').classList.add('hidden'); document.getElementById('view-dashboard').classList.remove('hidden'); ['module','users','bulk','system','approvals','approvalmatrix'].forEach(v=>document.getElementById('view-'+v)?.classList.add('hidden')); const ev=this.currentEvent; const dashTitleEl=document.getElementById('dash-event-title'); if(dashTitleEl) dashTitleEl.textContent=ev.event_name; document.getElementById('dash-event-desc').textContent=ev.description||''; document.getElementById('current-event-subtitle').textContent=ev.event_name; const evDates=[ev.start_date,ev.end_date].filter(Boolean).join(' → ')||'日期待公佈'; const datesEl=document.getElementById('dash-event-dates'); if(datesEl) datesEl.textContent=evDates; const stEl=document.getElementById('dash-status-badge'); if(stEl) stEl.textContent=ev.status==='active'?'進行中':'即將舉行'; const timeEl=document.getElementById('dash-event-time'); if(timeEl) timeEl.textContent=ev.time||'時間待公佈'; const locEl=document.getElementById('dash-event-location'); if(locEl) locEl.textContent=ev.location||'地點待公佈'; const wxEl=document.getElementById('dash-event-weather'); if(wxEl) wxEl.textContent='載入天氣中…'; this.loadHkoWeather(); const newsBox=document.getElementById('dash-news-box'); const newsEl=document.getElementById('dash-event-news'); if(newsBox&&newsEl){ if(ev.news){ newsBox.classList.remove('hidden'); newsEl.textContent=ev.news; } else newsBox.classList.add('hidden'); } if(this.currentUser){const roleDisplayEl=document.getElementById('dash-role-display'); if(roleDisplayEl) roleDisplayEl.textContent=ROLE_LABELS[this.currentUser.role]||this.currentUser.role; document.getElementById('banner-admin-actions')?.classList.toggle('hidden', !this.canSendMeetingReminder());} const grpSec=document.getElementById('group-management-section'); if(grpSec) grpSec.classList.toggle('hidden',!this.currentUser); await this.loadEventData(); await this.loadUsers(); await Promise.all([this.loadApprovalPermissions(),this.loadApprovalRouting()]); this.renderGroupQuickAccess(); this.applyDashboardMode(); this.updateBottomNav(); setTimeout(()=>this.checkAndShowNotifications(), 800); this.autoSyncDriveSources();}
,

  // 天文台 (HKO) 天氣 API 即時讀取；失敗時退回活動自設天氣欄位
  async loadHkoWeather(){
    const fallback=this.currentEvent?.weather;
    try{
      const res=await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc');
      if(!res.ok) throw new Error('http');
      const j=await res.json();
      let temps=[], humid='';
      if(j.temperature && j.temperature.data){ temps=(j.temperature.data||[]).filter(d=>d && d.place && d.value!==undefined); }
      if(j.humidity && j.humidity.data){ const h=j.humidity.data.find(d=>d && d.place && d.value!==undefined); if(h) humid=' 濕度 '+h.value+'%'; }
      const preferred=['香港天文台','京士柏','黃竹坑','跑馬地'];
      const pick=preferred.map(p=>temps.find(t=>t.place===p)).find(Boolean)||temps[0];
      let txt='';
      if(pick) txt=pick.place+' '+pick.value+'°C'+humid;
      else if(temps.length) txt='溫度約 '+temps.map(t=>t.value).join('/')+'°C'+humid;
      const el=document.getElementById('dash-event-weather');
      if(el) el.textContent=txt||(fallback||'天氣待公佈');
      return;
    }catch(e){}
    const el2=document.getElementById('dash-event-weather');
    if(el2) el2.textContent=fallback||'天氣待公佈';
  }
,
  roleLevel(role){ if(this.currentUser&&this.currentUser.mock_admin&&role&&role===this.currentUser.role) return 100; return ROLE_HIERARCHY[role]||0; } // v8.7：MOCK（模擬示範版）登入身份帶 mock_admin 標記＝所有管理權限全開（僅本地沙盒）
,
  // 是否「模擬示範」活動：所有假資料僅在模擬示範活動顯示，真實活動(ISD等)則為預留版位(空白)
  isDemoEvent(){ return this.currentEvent && (this.currentEvent.event_id==='mock_demo' || this.currentEvent.category==='demo'); }
,
  // 會議預告「發送提醒」權限：執行副主席以上 ＋ 秘書處
  // 執行副主席以上＝主席／顧問／執行副主席／管理員／系統管理員（等同 L1–L2）；秘書處＝「秘書處」組別
  canSendMeetingReminder(){
    if(!this.currentUser) return false;
    if(this.currentUser.mock_admin) return true;
    const role=this.currentUser.role||'';
    if(['super_admin','advisor','admin','chairperson','executive_vice_chairperson'].includes(role)) return true;
    const g=normalizeGroupName(this.currentUser.group_name||'');
    return g==='秘書處'||g.includes('秘書');
  }
,
  /* ===== v8.13 後端連線：統一 POST + 連線診斷 =====================================
     以前所有後端 POST 都係 try/catch + res.json()。一旦 Google 回 HTTP 400／401／404／5xx
     （回應係 HTML 或空），畫面只會彈「後端回應唔係 JSON」，完全睇唔到真正嘅 HTTP 狀態，
     最高層管理帳號登入唔到嗰陣根本無從判斷係「密碼錯」定「後端死咗」。
     而家 gasPost() 一律回傳 {ok,status,statusText,json,text,error}，登入等流程可以畀準確提示；
     再加「後端連線診斷」一次過試 /api/config、GET、POST，直接睇到邊一層斷。 */
  async gasPost(payload,opts){
    opts=opts||{};
    const out={ok:false,status:0,statusText:'',json:null,text:'',error:''};
    if(!this.gasUrl){ out.error='尚未設定後端網址 (GAS URL)'; return out; }
    try{
      // text/plain（唔係 application/json）＝瀏覽器唔會發 CORS 預檢 OPTIONS，Google Apps Script 先收得到
      const res=await fetch(this.gasUrl,{
        method:'POST',
        headers:{'Content-Type':opts.contentType||'text/plain;charset=UTF-8'},
        body:typeof payload==='string'?payload:JSON.stringify(payload),
        redirect:'follow',
        credentials:'omit'
      });
      out.status=res.status; out.statusText=res.statusText||''; out.ok=!!(res.ok!==undefined?res.ok:(res.status>=200&&res.status<300));
      // 優先 res.text()；遇到得 json() 嘅回應（舊測試 stub／部分 polyfill）都唔會炸
      let raw='';
      try{ raw = (typeof res.text==='function') ? await res.text() : (typeof res.json==='function' ? JSON.stringify(await res.json()) : ''); }
      catch(te){ raw=''; }
      if(raw==null) raw='';
      out.text=String(raw||'').slice(0,300);           // 只係畀人睇／診斷用
      try{ out.json=JSON.parse(raw); }
      catch(pe){ out.error=(out.ok?'HTTP 200 但回應唔係 JSON':'HTTP '+res.status+' 回應唔係 JSON'); }
      if(!out.json&&!out.error) out.error='回應唔係 JSON';
      return out;
    }catch(err){
      out.error='網絡錯誤：'+((err&&err.message)||err)+'（可能被廣告攔截器／CORS／公司網絡擋咗）';
      return out;
    }
  }
,
  // 由 HTTP 狀態碼推斷後端發生咩事（俾登入失敗提示用）
  loginFailureHint(status){
    if(status===400||status===401||status===403) return 'Google 拒絕咗呢個 POST 請求 → 絕大多數係 Apps Script 部署問題：請開 Code.gs「部署 → 管理部署 → 新版本」重新部署，並確認「誰可以存取」＝任何人。';
    if(status===404) return 'GAS 網址失效（部署已刪除／網址錯）→ 請重新部署並更新 GAS 網址。';
    if(status===405) return '後端唔接受 POST（部署唔係 Web App，或 doPost 已遺失）→ 請重新部署 Code.gs。';
    if(status===429) return '短時間內太多請求（Google 配額）→ 等一陣再試。';
    if(status>=500) return 'Google 伺服器端錯誤（HTTP '+status+'）→ 等一陣再試。';
    return '請按「後端連線診斷」睇實際 HTTP 狀態同回應內容。';
  }
,
  openBackendDiagModal(){
    const m=document.getElementById('modal-diag'); if(!m) return;
    m.classList.remove('hidden'); this.runBackendDiag();
  }
,
  async runBackendDiag(){
    const box=document.getElementById('diag-content'); if(!box) return;
    const cls={ok:'bg-emerald-100 text-emerald-700 border-emerald-200',bad:'bg-rose-100 text-rose-700 border-rose-200',warn:'bg-amber-100 text-amber-700 border-amber-200'};
    const row=(t,state,detail)=>`<div class="border rounded-xl p-2.5"><div class="flex items-start justify-between gap-2 flex-wrap"><b class="text-[12px]">${escapeHtml(t)}</b><span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls[state]||cls.warn}">${state==='ok'?'正常':(state==='bad'?'異常':'警告')}</span></div>${detail?`<div class="mt-1 text-[10.5px] text-slate-500 leading-relaxed whitespace-pre-line break-all">${escapeHtml(detail)}</div>`:''}</div>`;
    box.innerHTML='<div class="text-[11px] text-slate-400 py-4 text-center"><i class="fa-solid fa-spinner fa-spin mr-1"></i>測試中…</div>';
    const rows=[];
    const gasShort=this.gasUrl?this.gasUrl.slice(0,52)+'…':'（空）';
    const keyShort=this.apiKey?(this.apiKey.slice(0,10)+'…'+'('+this.apiKey.length+' 位)'):'（空）';
    rows.push(row('前端設定',this.gasUrl&&this.apiKey?'ok':'bad',
      `GAS：${gasShort}\nAPI Key：${keyShort}\n/api/config：${this.backendConfigStatus||'（未測試）'}\n模式：${this.mockMode?'本地／示範 (mockMode)':'正式（連後端）'}\n活動：${this.currentEvent?this.currentEvent.event_id:'（未選活動）'}`));

    // ① GET：睇部署係咪仲活著、版本係幾多
    let version='';
    try{
      const res=await fetch(`${this.gasUrl}?action=getEvents&api_key=${encodeURIComponent(this.apiKey)}`);
      const txt=await res.text();
      let j=null; try{ j=JSON.parse(txt); }catch(e){}
      if(res.ok&&j&&j.success){ version=j.version||''; rows.push(row('① GET getEvents（部署存活）','ok',`HTTP ${res.status}｜版本 ${version||'（無回報）'}｜活動數 ${(j.data||[]).length}`)); }
      else rows.push(row('① GET getEvents（部署存活）',res.ok?'bad':'bad',`HTTP ${res.status} ${res.statusText||''}｜${String(txt||'').slice(0,160)}`));
    }catch(err){ rows.push(row('① GET getEvents（部署存活）','bad','連線失敗：'+(err&&err.message||err))); }

    // ② POST doPost 係咪執行到（用一個必定唔存在嘅帳號，正常應該回 JSON 錯誤而唔係 HTTP 錯誤）
    const probe=await this.gasPost({action:'login',user_id:'__diag_probe__',password:'__diag_probe__'});
    if(probe.ok&&probe.json) rows.push(row('② POST doPost（後端有執行）','ok',`HTTP ${probe.status}｜後端版本 ${probe.json.version||'（冇回報）'}｜回應 ${probe.json.error||'（success='+probe.json.success+'）'}`));
    else rows.push(row('② POST doPost（後端有執行）','bad',`HTTP ${probe.status||'0'} ${probe.statusText||''}｜${probe.error||''}\n${probe.text.slice(0,160)}\n→ ${this.loginFailureHint(probe.status)}`));

    // ③ API Key 係咪有效（getAllUsers 需要正確 api_key）
    const users=await this.gasPost({action:'getAllUsers',api_key:this.apiKey});
    if(users.ok&&users.json&&users.json.success) rows.push(row('③ API Key 驗證 (getAllUsers)','ok',`HTTP ${users.status}｜後端帳戶 ${(users.json.users||[]).length} 個`));
    else rows.push(row('③ API Key 驗證 (getAllUsers)',users.ok?'warn':'bad',`HTTP ${users.status||'0'}｜${(users.json&&users.json.error)||users.error||''}\n（API Key 唔啱唔影響登入，但會令所有寫入／名單同步失敗）`));

    // ④ 指定帳號體檢（需要後端 v8.5：accountCheck）——查「點解呢個帳號登入唔到」
    const acc=(document.getElementById('diag-account')?.value||'').trim();
    const accPwd=(document.getElementById('diag-password')?.value||'').trim();   // v8.14c：密碼探針（只同後端 SCRIPT 常數比較，唔外洩）
    let accVerdict='';
    if(acc){
      const chkPayload={action:'accountCheck',api_key:this.apiKey,user_id:acc};
      if(accPwd) chkPayload.password=accPwd;
      const chk=await this.gasPost(chkPayload);
      if(chk.ok&&chk.json&&chk.json.success){
        const j=chk.json;
        if(!j.found&&!j.builtin_account){
          const masked=j.super_admin_id_masked?'（SCRIPT 內建最高層帳號係「'+j.super_admin_id_masked+'」）':'';
          rows.push(row('④ 帳號體檢：'+acc,'bad',`後端 Users 表搵唔到呢個帳號（builtin=${j.builtin_account}）${masked} → 一定登入唔到。請喺後端 Users 表／開戶加返，或 check 有冇打錯字（要用中文全名）。`));
          accVerdict='後端冇「'+acc+'」呢個帳號 → 要先開戶／加返入 Users 表'+(masked?'；'+masked:'')+'。';
        } else {
          const info=(j.rows||[]).map(r=>`${r.user_id}｜${r.role}｜${r.group_name||'（冇組別）'}｜${r.status||''}｜${r.has_password?(r.is_default_password?'密碼＝預設 1234':(r.is_script_password?'密碼＝SCRIPT 內建':'密碼已改過')):'⚠️ 冇密碼（登入唔到）'}`).join('\n');
          rows.push(row('④ 帳號體檢：'+acc,'ok',`後端搵到 ${j.found} 筆（SCRIPT 內建帳號：${j.builtin_account?'係':'唔係'}）\n${info||'（只靠 SCRIPT 常數密碼登入）'}`));
          const probeTxt=(j.script_password_match===true)?'\n✅ 密碼探針：呢個密碼同後端 SCRIPT 常數一致 → 應該入到；入唔到多數係 /exec 仲係舊版本，請「部署 → 管理部署 → 新版本」重新部署 Code.gs。'
            :(j.script_password_match===false)?'\n❌ 密碼探針：呢個密碼同後端 SCRIPT 常數唔一致 → 要用 Code.gs 入面 SUPER_ADMIN_PASS 嗰個密碼。'
            :'\n（想測密碼請喺「密碼（選填）」格仔填返你平時用嗰個）';
          if(j.builtin_account&&!j.found){
            accVerdict='呢個係 SCRIPT 內建最高層管理帳號：Users 表入面冇佢嘅紀錄屬正常，一定要用 SCRIPT 常數（或「改密碼」後寫入 Users 表）嗰個密碼。'+(accPwd?probeTxt:'');
            rows.push(row('④ 密碼探針','ok',escapeHtml(probeTxt.trim())));
          }
          else if((j.rows||[]).some(r=>!r.has_password)) accVerdict='⚠️ 呢個帳號喺 Users 表冇密碼（password_hash 空）→ 一定登入唔到，要喺後端設返密碼（或開戶）。';
          else if(j.builtin_account&&accPwd){ accVerdict='呢個係 SCRIPT 內建最高層管理帳號，Users 表亦有紀錄。'+probeTxt; rows.push(row('④ 密碼探針','ok',escapeHtml(probeTxt.trim()))); }
        }
      } else {
        rows.push(row('④ 帳號體檢：'+acc,'warn',`後端未支援 accountCheck（HTTP ${chk.status||'0'} ${chk.error||''}）→ 請先喺 Apps Script 重新部署最新 Code.gs（v8.6）再做呢項檢查。`));
      }
    }

    // 總結
    const postDown=!(probe.ok&&probe.json);
    const verdict=accVerdict?('結論（帳號體檢）：'+accVerdict):(postDown
      ? '結論：後端 POST 被拒／無回應（'+ (probe.status||'網絡錯誤') +'）。呢個唔係密碼問題——最高層管理帳號等只存喺後端嘅帳戶會全部登入唔到。請喺 Apps Script 開最新 Code.gs →「部署 → 管理部署 → 新版本」重新部署（存取權限＝任何人），部��完再按「重新測試」。'
      : (version&&/v8\.[4-9]/.test(version)?'結論：後端正常（已係最新版 Code.gs '+version+'）。登入唔到就係帳號／密碼問題，或者帳戶唔喺後端 Users 表。'
        :'結論：後端正常（版本 '+(version||'未知')+'）。注意：後端部署嘅 Code.gs 可能唔係最新版本，如有異常請重新部署「新版本」後再試。'));
    box.innerHTML=`<div class="space-y-2">${rows.join('')}<div class="border-2 ${postDown?'border-rose-300 bg-rose-50':'border-emerald-300 bg-emerald-50'} rounded-xl p-3 text-[11.5px] leading-relaxed">${escapeHtml(verdict)}</div></div>`;
    this._diagReport=[...rows.map(r=>r.replace(/<[^>]+>/g,' ').trim()),verdict].join('\n');
  }
,
  async copyDiagReport(){
    const text=this._diagReport||'';
    try{ await navigator.clipboard.writeText(text); showToast('診斷報告已複製，可貼俾技術人員','success'); }
    catch(e){ showToast('複製失敗，請手動選取內容複製','error'); }
  }
,
  /* ===== v8.14 組別歸屬：邊個組負責邊張卡、邊個可以看邊個部門 ===== */
  // 呢張卡係咪由我個組負責？（行政組統管全站＝任何卡都係 true；其餘按 CARD_OWNER_GROUPS）
  isCardOwnerGroup(cardId){
    if(!this.currentUser) return false;
    if(this.isAdmin()||this.currentUser.mock_admin) return true;      // 管理層／MOCK 全權
    const lvl=this.roleLevel(this.currentUser.role);
    if(lvl>=100) return true;
    if(lvl<CARD_OWNER_MIN_LEVEL) return false;                        // 負責組內都要主任以上
    // v8.14d：呢張卡有「唔理邊組都改到」嘅角色（執行手冊／會議卡片開畀總主任・副主席）
    if((CARD_OWNER_EXTRA_ROLES[cardId]||[]).includes(this.currentUser.role)) return true;
    const g=normalizeGroupName(this.currentUser.group_name||'');
    if(!g) return false;
    if(g==='行政組'||g.includes('行政')) return true;                 // 行政組統管全站
    const owners=CARD_OWNER_GROUPS[cardId]||[];
    return owners.some(x=>{const ox=normalizeGroupName(x); return ox===g||g.includes(ox)||ox.includes(g);});
  }
,
  // v8.14：邊個可以管理「會議卡片」（原本只係管理員）→ 秘書處負責，行政組統管
  // v8.14c：會議卡片＝秘書處負責，行政組統管，執副以上（主席／顧問／執副主席／管理員）一律管到
  canManageMeetings(){ return this.isAdmin()||this.isExecViceOrChair()||this.isCardOwnerGroup('meetings'); }
,
  // 可以睇晒全部部門嘅人：執副以上 ＋ 行政組（統管全站）
  // v8.14d：可以睇晒全部部門嘅人＝ 執副以上 ＋ 副主席 ＋ 行政組總主任 ＋ 參事主任 ＋ 行政組（統管全站）
  // 其餘（包括各組總主任）一律淨係睇自己部門
  isAllGroupViewer(){
    if(!this.currentUser) return false;
    if(this.isExecViceOrChair()||this.isAdmin()||this.currentUser.mock_admin) return true;   // 執副以上（主席／顧問／執副主席／管理員）
    const role=this.currentUser.role||'';
    const lvl=this.roleLevel(role);
    if(role==='vice_chairperson') return true;                                              // 副主席
    const g=normalizeGroupName(this.currentUser.group_name||'');
    if(role==='general_director'&&(g==='行政組'||g.includes('行政'))) return true;            // 行政組總主任
    if(lvl>=CARD_OWNER_MIN_LEVEL&&(this.currentUser.job_title||'').includes('參事')) return true; // 參事主任
    return !!g&&(g==='行政組'||g.includes('行政'))&&lvl>=CARD_OWNER_MIN_LEVEL;                // 行政組統管全站
  }
,
  // 我可唔可以睇／入呢個部門？（執副以上／行政組＝全部；其餘淨係自己組）
  canViewGroup(groupName){
    if(!this.currentUser) return false;
    if(this.isAllGroupViewer()) return true;
    const g=normalizeGroupName(groupName||'');
    const my=normalizeGroupName(this.currentUser.group_name||'');
    if(my && (my===g||my.includes(g)||g.includes(my))) return true;
    // 上級明確授權（perm_see）都可以睇
    const def=DASH_CARD_DEFS.find(d=>GROUP_CARD_IDS.has(d.id)&&(d.groups||[]).some(x=>normalizeGroupName(x)===g));
    if(def) return this.canSeeRoleCard(def);
    return false;
  }
,
  canSeeRoleCard(def){
    if(!this.currentUser) return def.minLevel<=0;
    const u=this.currentUser;
    const lvl=this.roleLevel(u.role);
    if(lvl>=100) return true;
    // v8.14：部門卡（group_*）只畀「本組」＋「執副以上」＋「行政組（統管）」＋上級明確授權者睇
    if(GROUP_CARD_IDS.has(def.id)){
      const ps=u.perm_see;
      if(Array.isArray(ps)&&ps.includes(def.id)) return true;
      if(this.isAllGroupViewer()) return true;
      const myG=normalizeGroupName(u.group_name||'');
      return !!myG&&(def.groups||[]).some(x=>normalizeGroupName(x)===myG);
    }
    // 內容卡片：有明確授權（perm_see）時，以授權為準；管理層（admin/顧問/主席/執行副主席）默認全看
    if(PERM_IDS.has(def.id)){
      const ps=u.perm_see;
      if(Array.isArray(ps)) return ps.includes(def.id);
      if(lvl>=70) return true;
    }
    if(lvl>=def.minLevel) return true;
    if(def.groups&&def.groups.length){const g=u.group_name||''; if(def.groups.some(x=>g.includes(x)||x.includes(g))) return true;}
    return false;
  }
,
  canEditRoleCard(def){
    if(!this.currentUser) return false;
    // v8.14：負責組別（行政組統管全站／秘書處管會議／服務組管捐贈／協調組管膳食物資車／節目組管攤位）可改
    const ownerOk=this.isCardOwnerGroup(def.id);
    if(def.readOnly) return ownerOk;          // 公開只讀卡（執行手冊・申請中心）：只有負責組可以改
    const role=this.currentUser.role||'', lvl=this.roleLevel(role), g=this.currentUser.group_name||'';
    if(lvl>=100) return true;
    if(ownerOk) return true;                  // 負責組別優先（行政組唔會因為舊授權紀錄而失去管理權）
    // 內容卡片：有明確授權（perm_edit）時，以授權為準；管理層默認全管
    if(PERM_IDS.has(def.id)){
      const pe=this.currentUser.perm_edit;
      if(Array.isArray(pe)) return pe.includes(def.id);
      if(lvl>=70) return true;
    }
    // 使用各模組真實權限函數，與卡片內按鈕顯示完全一致
    const f={
      announcements:()=>lvl>=30,
      schedule:()=>lvl>=60||this.isCardOwnerGroup('schedule'),
      activities:()=>this.canUploadActivity()||this.isCardOwnerGroup('activities'),
      staff:()=>this.isAdmin()||lvl>=40||g.includes('行政'),
      theme_badges:()=>this.canUploadThemeBadge(),
      meals:()=>this.canManageMealMenu()||this.isCardOwnerGroup('meals'),
      documents:()=>this.canUploadDocument()||this.isCardOwnerGroup('documents'),
      unit_guide:()=>lvl>=60||this.isCardOwnerGroup('unit_guide'),
      ceremony:()=>lvl>=60||this.isCardOwnerGroup('ceremony'),
      awards:()=>lvl>=60,
      crisis:()=>lvl>=60||this.isCardOwnerGroup('crisis'),
      supplies:()=>this.canSubmitSupply(),
      parking:()=>lvl>=40,
      oral_quotes:()=>lvl>=40,
      finance:()=>this.canApproveFinance()||this.isAdmin(),
      admin_group:()=>this.isAdmin()||g.includes('行政'),
      coordinator_group:()=>this.isAdmin()||g.includes('協調'),
      group_ceremony:()=>this.isAdmin()||g.includes('會操及典禮'),
      group_theme:()=>this.isAdmin()||g.includes('主題節目'),
      group_brand:()=>this.isAdmin()||g.includes('品牌推廣'),
      group_reception:()=>this.isAdmin()||g.includes('嘉賓接待'),
      group_service:()=>this.isAdmin()||g.includes('服務及發展'),
      group_secretariat:()=>this.isAdmin()||g.includes('秘書處'),
      group_advisors:()=>this.isAdmin()||g.includes('顧問'),
      group_leadership:()=>this.isAdmin()||normalizeGroupName(g)==='主席及執行副主席',
      meetings:()=>this.isCardOwnerGroup('meetings'),   // v8.14：會議卡片歸秘書處（行政組亦可管）
      approvals:()=>APPROVAL_AREAS.some(a=>this.canApproveArea(a.id)),
      users_bulk:()=>this.isAdmin(),
      my_monitor:()=>false,
      donations:()=>this.isCardOwnerGroup('donations'), // v8.14：童心捐贈歸服務及發展組（行政組亦可管）
    };
    if(f[def.id]) return f[def.id]();
    if(lvl>=def.editLevel) return true;
    if(def.editGroups&&def.editGroups.length) return def.editGroups.some(x=>g.includes(x)||x.includes(g));
    return false;
  }
,
  cardHTML(def,opts){
    const locked=opts&&opts.locked;
    const badge=opts&&opts.badge;
    const canEdit=opts&&opts.canEdit;
    const isOwnGroup=!!(opts&&opts.isOwnGroup);
    // 全部卡片統一白底無顏色（更整潔）；圖示一律中性灰，不再使用彩色卡面
    const cardClass='bg-white border shadow-sm';
    const badgeHTML=locked
      ?'<span class="absolute top-3 right-3 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-amber-700 border border-amber-200 whitespace-nowrap"><i class="fa-solid fa-lock mr-0.5"></i>登入解鎖</span>'
      :(badge==='可修改'?'<span class="absolute top-3 right-3 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white whitespace-nowrap"><i class="fa-solid fa-pen mr-0.5"></i>可修改</span>'
        :(badge==='只讀'?'<span class="absolute top-3 right-3 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 whitespace-nowrap"><i class="fa-solid fa-eye mr-0.5"></i>只讀</span>'
          :'<span class="absolute top-3 right-3 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-emerald-700 border border-emerald-200 whitespace-nowrap"><i class="fa-solid fa-globe mr-0.5"></i>公開可看</span>'));
    const footer=(!locked&&(badge==='可修改'||badge==='只讀'))?`<div class="dash-footer mt-1.5 text-[9.5px] font-semibold ${canEdit?'text-emerald-600':'text-slate-400'}"><i class="fa-solid ${canEdit?'fa-pen':'fa-eye'} mr-1"></i>${canEdit?'可修改':'只讀'} · ${def.editLabel||''}</div>`:'';
    const overlay=locked?'<div class="absolute inset-0 bg-white/30 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition"><span class="bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-full font-bold"><i class="fa-solid fa-lock mr-1"></i>登入解鎖</span></div>':'';
    const ownGroupBanner=isOwnGroup?'<div class="inline-flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-2.5 shadow-sm"><i class="fa-solid fa-star"></i>我的組別</div>':'';
    return `<div onclick="${locked?"app.openLoginModal()":(def.action||("app.openModule('"+def.id+"')"))}" class="relative dash-card p-4 rounded-2xl shadow-sm card-hover cursor-pointer ${cardClass} ${locked?'opacity-60':''} ${isOwnGroup?'ring-4 ring-indigo-200 border-indigo-500':''}">${badgeHTML}${ownGroupBanner}<div class="dash-icon w-11 h-11 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center text-lg mb-2.5"><i class="${def.icon}"></i></div><h4 class="dash-title font-bold text-[13px] pr-2">${escapeHtml(def.title)}</h4>${def.desc?`<p class="dash-desc text-[11px] text-slate-500 mt-0.5">${escapeHtml(def.desc)}</p>`:''}${footer}${overlay}</div>`;
  }
,
  // 我的監察摘要：供活動橫幅監察區塊及「我的監察」頁共用
  monitorSummary(){
    const all=this.collectApplications();
    const scope=this.monitorScope();
    const canApproveAny=APPROVAL_AREAS.some(a=>this.canApproveArea(a.id));
    const privileged=canApproveAny||scope.level!=='self';
    const inScope=(g)=>scope.level==='all'||scope.groups.some(x=>x&&(g.includes(x)||x.includes(g)));
    const mine=all.filter(r=>this.monitorIsMine(r));
    const others=scope.level==='self'?[]:all.filter(r=>!this.monitorIsMine(r)&&inScope(r.group||''));
    const recs=[...mine,...others];
    const scopeText=scope.level==='all'?'全部組別':(scope.level==='group'?(scope.groups.join('、')||'本組'):'我自己');
    return {all,mine,others,recs,scope,privileged,canApproveAny,scopeText,
      total:recs.length,
      pending:recs.filter(r=>r.color_name==='amber'||r.color_name==='sky').length,
      approved:recs.filter(r=>r.color_name==='emerald').length,
      rejected:recs.filter(r=>r.color_name==='rose').length};
  }
,
  renderIdentityBar(){
    const user=this.currentUser;
    const card=document.getElementById('identity-card'); // 身份卡片：只喺未登入（訪客）時顯示，登入後隱藏
    const heroMon=document.getElementById('dash-hero-monitor');
    if(!user){
      // 未登入：顯示身份卡片（話俾訪客知點開戶／點登入），但唔顯示「我的監察」；登入掣只喺最頂 BAR 右上角
      if(card) card.classList.remove('hidden');
      const nameEl=document.getElementById('identity-name');
      const roleBadge=document.getElementById('identity-role-badge');
      const groupBadge=document.getElementById('identity-group-badge');
      const desc=document.getElementById('identity-desc');
      const avatar=document.getElementById('identity-avatar');
      const mockBadge=document.getElementById('identity-mock-badge');
      if(mockBadge) mockBadge.classList.toggle('hidden',!this.mockMode);
      if(nameEl) nameEl.textContent='訪客';
      if(roleBadge){roleBadge.textContent='公開'; roleBadge.className='bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full border border-slate-200 whitespace-nowrap';}
      if(groupBadge) groupBadge.classList.add('hidden');
      if(desc) desc.innerHTML='<span class="inline-flex items-center gap-1 font-semibold text-slate-700"><i class="fa-solid fa-key text-amber-600"></i>初始帳戶：<b>中文姓名</b>（例如「陳子明」）｜初始密碼：<b>1234</b></span><span class="mx-1.5 text-slate-300">｜</span><span class="text-indigo-700 font-semibold">如需要開戶請找所屬組別的總主任</span><br><span class="text-slate-500">（所有公開資料無需登入即可查閱；登入後可依職級與組別管理相應卡片）</span><br><span class="text-slate-400">要登入請按右上角<b class="text-slate-500">「登入」</b>。</span>';
      if(avatar) avatar.innerHTML='<i class="fa-solid fa-user"></i>';
      if(heroMon){ heroMon.classList.add('hidden'); heroMon.innerHTML=''; }
      return;
    }
    // 登入後：身份卡片隱藏（身份已喺最頂 BAR 右上角），只保留活動橫幅監察區塊
    if(card) card.classList.add('hidden');
    if(heroMon){
      const sum=this.monitorSummary();
      const canGoApprovals=sum.canApproveAny||this.roleLevel(user.role)>=40;
      // 有權限人士：數字跳轉批核中心處理；無權限人士：數字帶自己到「我的監察」看自己進度
      const clickAttr=canGoApprovals?'onclick="app.switchTopTab(\'approvals\')" ':'onclick="app.openModule(\'my_monitor\')" ';
      const chipBase='rounded-lg px-2 py-1 text-center cursor-pointer hover:brightness-110 shadow-sm';
      const chip=(v,l,cls)=>`<button ${clickAttr}class="${cls} ${chipBase}"><span class="block text-[15px] font-extrabold leading-none">${v}</span><span class="block text-[9.5px] mt-0.5 font-semibold">${l}</span></button>`;
      const minePending=sum.mine.filter(r=>r.color_name==='amber'||r.color_name==='sky').length;
      const mineApproved=sum.mine.filter(r=>r.color_name==='emerald').length;
      const mineRejected=sum.mine.filter(r=>r.color_name==='rose').length;
      const chips=sum.privileged
        ?chip(sum.total,'總申請','bg-white text-purple-900')
        +chip(sum.pending,'待處理',sum.pending?'bg-amber-400 text-amber-950':'bg-white/30 text-white')
        +chip(sum.approved,'已批核',sum.approved?'bg-emerald-600 text-white':'bg-white/30 text-white')
        +chip(sum.rejected,'已拒絕',sum.rejected?'bg-rose-500 text-white':'bg-white/30 text-white')
        :(sum.mine.length
          ?chip(sum.mine.length,'總申請','bg-white text-purple-900')
          +chip(minePending,'待處理',minePending?'bg-amber-400 text-amber-950':'bg-white/30 text-white')
          +chip(mineApproved,'已批核',mineApproved?'bg-emerald-600 text-white':'bg-white/30 text-white')
          +chip(mineRejected,'已拒絕',mineRejected?'bg-rose-500 text-white':'bg-white/30 text-white')
          :`<span class="text-[10.5px] text-white/80">你暫時未有申請紀錄</span><button onclick="app.openModule('apply_hub')" class="bg-emerald-400 text-emerald-950 px-2.5 py-1 rounded-lg text-[10.5px] font-bold btn-mobile whitespace-nowrap"><i class="fa-solid fa-file-pen mr-1"></i>前往申請中心</button>`);
      heroMon.classList.remove('hidden');
      heroMon.innerHTML=`<div class="bg-white/15 backdrop-blur border border-white/25 rounded-xl px-3 py-2.5">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <div class="flex items-center gap-1.5 text-[11px] font-bold flex-wrap flex-shrink-0"><i class="fa-solid fa-eye"></i>我的監察 <span class="bg-white/25 text-white text-[9.5px] px-1.5 py-0.5 rounded-full border border-white/30 font-normal">範圍：${escapeHtml(sum.scopeText)}</span></div>
          <div class="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">${chips}</div>
          <button onclick="app.openModule('my_monitor')" class="bg-white text-purple-700 px-2.5 py-1 rounded-lg text-[10.5px] font-bold btn-mobile whitespace-nowrap flex-shrink-0"><i class="fa-solid fa-eye mr-1"></i>前往我的監察</button>
        </div>
        ${sum.privileged&&sum.mine.length?`<button onclick="app.openModule('my_monitor')" class="mt-2 w-full sm:w-auto sm:min-w-[340px] flex items-center justify-between gap-2 bg-white text-purple-800 border border-white/60 rounded-lg px-2.5 py-1.5 text-[10.5px] font-semibold"><span class="truncate text-left"><i class="fa-solid fa-user mr-1"></i>我的申請 <b>${sum.mine.length}</b> 項（待處理 <b>${minePending}</b>）</span><span class="font-bold whitespace-nowrap">查看詳情 <i class="fa-solid fa-chevron-right text-[9px]"></i></span></button>`:''}
      </div>`;
    }
  }
,
  renderRoleCards(){
    const publicGrid=document.getElementById('public-cards-grid');
    const identityGrid=document.getElementById('identity-cards-grid');
    const toolsGrid=document.getElementById('management-tools-grid');
    const publicSection=document.getElementById('public-section');
    const identitySection=document.getElementById('identity-section');
    const toolsSection=document.getElementById('management-tools-section');
    const publicCount=document.getElementById('public-count');
    const identityCount=document.getElementById('identity-count');
    const toolsCount=document.getElementById('management-tools-count');
    const identityTitle=document.getElementById('identity-section-title');
    const note=document.getElementById('simple-mode-note');
    if(!publicGrid||!identityGrid||!toolsGrid) return;
    const user=this.currentUser;
    const byOrder=(defs,order)=>defs.slice().sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
    const publicDefs=byOrder(DASH_CARD_DEFS.filter(d=>d.minLevel<=0&&!d.hideOnDashboard),PUBLIC_CARD_ORDER);
    const identityDefs=DASH_CARD_DEFS.filter(d=>d.minLevel>0&&!d.hideOnDashboard);
    const groupDefs=identityDefs.filter(d=>GROUP_CARD_IDS.has(d.id)).sort((a,b)=>ORG_GROUPS.indexOf(normalizeGroupName(a.groups?.[0]))-ORG_GROUPS.indexOf(normalizeGroupName(b.groups?.[0])));
    const toolDefs=byOrder(identityDefs.filter(d=>MANAGEMENT_TOOL_ORDER.includes(d.id)),MANAGEMENT_TOOL_ORDER);
    // 全部卡片一律白底無顏色（更整潔）；未登入／已登入都是同一款白底卡，只靠「可修改／只讀／公開可看」小標籤分辨
    this.renderIdentityBar();

    // ===== 未登入（訪客）v8.13：登入後先至有嘅「工作卡片／管理工具」全部收起，
    //      但 4 張公開資料卡（= 底部導覽列嗰 4 個按鈕：公告及溝通・執行手冊・申請中心・童心捐贈）
    //      照樣放喺中間，填滿版面（以前只留身份卡，中間一大片吉位，尤其手機更明顯）=====
    if(!user){
      if(identitySection) identitySection.classList.add('hidden');
      if(toolsSection) toolsSection.classList.add('hidden');
      if(note) note.classList.add('hidden');
      if(publicSection) publicSection.classList.remove('hidden');
      identityGrid.innerHTML='';
      toolsGrid.innerHTML='';
      this.deferredDashWrite(publicGrid, publicDefs.map(d=>this.cardHTML(d,{locked:false,badge:'公開可看',canEdit:false})).join(''));
      if(publicCount) publicCount.textContent=`${publicDefs.length} 張（公開可看）`;
      if(identityCount) identityCount.textContent='';
      if(toolsCount) toolsCount.textContent='';
      return;
    }
    // 登入後：還原原本設計（公開資料 → 工作卡片 → 管理工具 → 部門管理中心）
    if(publicSection) publicSection.classList.remove('hidden');
    if(identitySection) identitySection.classList.remove('hidden');
    if(note) note.classList.remove('hidden');

    // 公開資料固定順序（最先顯示）：公告及溝通 → 執行手冊 → 申請中心 → 童心捐贈大行動。
    this.deferredDashWrite(publicGrid, publicDefs.map(d=>{const canEdit=user&&this.canEditRoleCard(d); const highlightCeremony=!!user && d.id==='ceremony' && normalizeGroupName(user.group_name)==='會操及典禮組'; return this.cardHTML(d,{locked:false,badge:user?(canEdit?'可修改':'只讀'):'公開可看',canEdit,isOwnGroup:highlightCeremony});}).join(''));
    if(publicCount) publicCount.textContent=`${publicDefs.length} 張`;

    const userGroup=normalizeGroupName(user.group_name);
    const isSuper=user.role==='super_admin';
    const matchesUserGroup=(d)=>!isSuper&&(d.groups||[]).some(g=>normalizeGroupName(g)===userGroup);
    // 功能／工作卡片：會議卡片最前，其餘按定義順序；我的監察已併入頂部活動橫幅，不再重複顯示
    const workDefs=identityDefs.filter(d=>!GROUP_CARD_IDS.has(d.id)&&!MANAGEMENT_TOOL_ORDER.includes(d.id)&&d.id!=='my_monitor'&&this.canSeeRoleCard(d));
    const meetingsDef=workDefs.find(d=>d.id==='meetings');
    const restWork=workDefs.filter(d=>d.id!=='meetings');
    const functionCards=[...(meetingsDef?[meetingsDef]:[]),...restWork];
    // 組別卡片（自己組標亮，其餘組別預設只讀查閱）
    const visibleGroupDefs=groupDefs.filter(d=>this.canSeeRoleCard(d));
    const ownGroupDefs=visibleGroupDefs.filter(matchesUserGroup);
    const otherGroupDefs=visibleGroupDefs.filter(d=>!matchesUserGroup(d));
    const allCards=[...functionCards];
    const visibleTools=this.roleLevel(user.role)>=40?toolDefs.filter(d=>this.canSeeRoleCard(d)):[];

    if(identityTitle) identityTitle.textContent='工作卡片';
    this.deferredDashWrite(identityGrid, allCards.map(d=>{const canEdit=this.canEditRoleCard(d); return this.cardHTML(d,{locked:false,badge:canEdit?'可修改':'只讀',canEdit,isOwnGroup:matchesUserGroup(d)});}).join('')||'<div class="col-span-full text-center text-[12px] text-slate-400 bg-white border rounded-2xl p-6">暫無其他卡片</div>');
    if(identityCount) identityCount.textContent=`${allCards.length} 張`;

    if(toolsSection) toolsSection.classList.toggle('hidden',!visibleTools.length);
    this.deferredDashWrite(toolsGrid, visibleTools.map(d=>{const canEdit=this.canEditRoleCard(d); return this.cardHTML(d,{locked:false,badge:canEdit?'可修改':'只讀',canEdit});}).join(''));
    if(toolsCount) toolsCount.textContent=`${visibleTools.length} 張`;
    if(note) note.innerHTML=`排序：<b>公開資料 → 工作卡片（會議卡片在功能卡片最前）→ 管理工具 → 部門管理中心</b>。全部卡片白底無顏色；自己的組別已標亮；我的監察併入頂部活動資訊橫幅。最頂 BAR＝身份・開戶（有權限）・改密碼・登出；底部導覽列＝執行手冊・申請中心・批核中心（有權限）・部門中心（登入後：執副以上見列表／普通人入自己部門）。`;
  }
,
  updateAdminNav(){
    // 最頂 BAR（標題列）：身份・改密碼・登出（登入後不顯示登入，只顯示登出）
    // 底部導覽列（手機／電腦同步）：執行手冊・申請中心（人人可用）；批核中心（登入後有權限人士才可見）；部門中心（登入後可見）
    // 最頂 BAR：開戶（登入後總主任以上）＋改密碼＋登出；開戶已唔再佔底部導覽列位置
    const loggedIn=!!this.currentUser;
    const chiefOrAbove=this.roleLevel(this.currentUser?.role)>=40;
    // v8.13：未選活動（「選擇活動」首頁）時唔好顯示登入掣——
    // 未入活動＝未連後端個活動資料，呢個位登入一定唔會成功（只會彈「登入失敗」），反而令人以為後端壞咗。
    // 入咗活動先顯示；已登入就照舊淨係顯示登出。
    const noEvent=!this.currentEvent;
    const hLogin=document.getElementById('login-toggle-btn'); if(hLogin){ hLogin.style.display=(loggedIn||noEvent)?'none':''; if(noEvent&&!loggedIn) hLogin.title='請先選擇並進入活動，再按登入'; }
    const hLogout=document.getElementById('logout-btn'); if(hLogout) hLogout.style.display=loggedIn?'':'none';
    const tcp=document.getElementById('topbar-changepwd'); if(tcp) tcp.style.display=loggedIn?'':'none';
    const taSetup=document.getElementById('topbar-account-setup'); if(taSetup) taSetup.style.display=(loggedIn&&chiefOrAbove)?'':'none';
    // 底部導覽列（兩套）：
    // ① 未登入（訪客）＝4 個公開資料按鈕：公告及溝通・執行手冊・申請中心・童心捐贈
    // ② 登入後＝還原原本設計：執行手冊・申請中心・批核中心（有權限）・部門中心
    const setNav=(id,show)=>{const el=document.getElementById(id); if(el) el.style.display=show?'':'none';};
    setNav('bn-pub-announcements',!loggedIn);
    setNav('bn-pub-donations',!loggedIn);
    setNav('bn-exec',true);
    setNav('bn-apply',true);
    setNav('bn-approvals',loggedIn&&chiefOrAbove);
    setNav('bn-dept',loggedIn);
    const bn=document.getElementById('bottom-nav'); if(bn) bn.style.display='';
    this.updateBottomNav();
  }
,
  // 頂部 BAR「身份」：回到儀表板（未進入活動時回首頁）
  goIdentity(btn){
    document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
    if(btn) btn.classList.add('active');
    if(!this.currentEvent){ this.goHome(); return; }
    this.showDashboard();
  }
,
  // 底部導覽列：按目前頁面標示 active
  updateBottomNav(){
    document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));
    let id=null;
    const mod=this.currentModule;
    const loggedIn=!!this.currentUser;
    if(mod==='exec_manual'){ id='bn-exec'; }
    else if(mod==='apply_hub'){ id='bn-apply'; }
    else if(!loggedIn && mod==='announcements'){ id='bn-pub-announcements'; }
    else if(!loggedIn && mod==='donations'){ id='bn-pub-donations'; }
    else if(mod==='dept_hub'){ id='bn-dept'; }
    else if(mod==='group_management' && !this.isExecViceOrChair() && normalizeGroupName(this.currentGroupManaged||'')===normalizeGroupName(this.currentUser?.group_name||'')){ id='bn-dept'; }
    const apprEl=document.getElementById('view-approvals');
    if(apprEl && !apprEl.classList.contains('hidden')){ id='bn-approvals'; }
    if(id){ const el=document.getElementById(id); if(el) el.classList.add('active'); }
  }
,

  applyDashboardMode(){
    // 一律用卡片檢視（公開資料 → 工作卡片 → 管理工具 → 部門管理中心）；
    // 舊版「認識/參與/協作」彩色分組已於 2026-08-27 整段刪除，不再需要隱藏
    const simplePanel=document.getElementById('simple-card-panel');
    this.renderRoleCards();
    if(simplePanel) simplePanel.classList.remove('hidden');
    this.updateAdminNav();
  }
,
  // 各組別（以「組織架構圖」為準，不會憑空多出部門）
  getEventGroups(){
    const staffData=this.getStaffData();
    const set=[];
    const push=(g)=>{
      String(g||'').split(/[\/／、,，]/).forEach(part=>{
        const v=normalizeGroupName(part);
        if(!v||v==='未分組'||v==='未知') return;
        if(!set.includes(v)) set.push(v);
      });
    };
    (staffData.org_chart||[]).forEach(n=>push(n.group || this.parseGroupFromLevel(n.level)));
    (staffData.contacts||[]).forEach(c=>push(c.group_name));
    // 架構圖未載入時，用 2026 固定架構作後備
    if(!set.length) ORG_GROUPS.forEach(push);
    // 依固定架構次序排列，其餘排後
    const ordered=ORG_GROUPS.filter(g=>set.includes(g));
    set.forEach(g=>{ if(!ordered.includes(g)) ordered.push(g); });
    return ordered;
  }
,
  groupMeta(g){
    const M={
      '顧問團':{icon:'fa-solid fa-user-tie',cls:'bg-slate-100 text-slate-700'},
      '主席及執行副主席':{icon:'fa-solid fa-crown',cls:'bg-amber-100 text-amber-700'},
      '秘書處':{icon:'fa-solid fa-landmark',cls:'bg-slate-100 text-slate-700'},
      '會操及典禮組':{icon:'fa-solid fa-flag',cls:'bg-rose-100 text-rose-700'},
      '主題節目組':{icon:'fa-solid fa-gamepad',cls:'bg-fuchsia-100 text-fuchsia-700'},
      '品牌推廣組':{icon:'fa-solid fa-bullhorn',cls:'bg-sky-100 text-sky-700'},
      '嘉賓接待組':{icon:'fa-solid fa-handshake-angle',cls:'bg-teal-100 text-teal-700'},
      '協調組':{icon:'fa-solid fa-people-roof',cls:'bg-orange-100 text-orange-700'},
      '服務及發展組':{icon:'fa-solid fa-hands-holding-child',cls:'bg-lime-100 text-lime-700'},
      '行政組':{icon:'fa-solid fa-building',cls:'bg-emerald-100 text-emerald-700'}
    };
    return M[g]||{icon:'fa-solid fa-people-group',cls:'bg-indigo-100 text-indigo-700'};
  }
,
  // 該組別的申請統計（物資／攤位／車輛／膳食）
  groupApplyStats(groupName){
    const sup=this.getSuppliesData();
    const meals=this.getMealsData();
    const match=(x)=>{ const g=(x||''); return normalizeGroupName(g)===groupName || (!!g && (g.includes(groupName)||groupName.includes(g))); };
    const requests=(sup.requests||[]).filter(r=>match(r.group_name));
    const boothReqs=(sup.booth_requests||[]).filter(r=>match(r.group_name));
    const vehicles=(sup.vehicle_passes||[]).filter(v=>match(v.group_name));
    const orders=(meals.orders||[]).filter(o=>match(o.group_name));
    const cnt=(arr,st)=>arr.filter(x=>x.status===st).length;
    return {
      requests, boothReqs, vehicles, orders,
      supPending:cnt(requests,'pending'), supApproved:cnt(requests,'approved')+cnt(requests,'modified'),
      boothPending:cnt(boothReqs,'pending'), boothApproved:cnt(boothReqs,'approved')+cnt(boothReqs,'modified'),
      vehPending:cnt(vehicles,'pending'), vehApproved:cnt(vehicles,'approved'),
      mealPending:orders.filter(o=>o.status==='pending'||o.status==='group_ok').length,
      mealApproved:cnt(orders,'approved')
    };
  }
,
  // 本組崗位節點（「主頁部門卡片」與「部門管理中心」共用同一計算，確保崗位／人數兩處一致）
  getGroupOrgNodes(groupName){
    groupName=normalizeGroupName(groupName);
    const org=this.getStaffData().org_chart||[];
    const getLvl=(n)=>{ const m=String(n.level||'').match(/Level\s*(\d+)/i); return m?parseInt(m[1]):(n.level_num!=null?n.level_num:99); };
    // 排序：副主席(L3) → 總主任(L4) → 主任(L5) → 其他；同級再按職銜
    const rankOf=(n)=>{
      const v=getLvl(n);
      const title=String(n.title||'');
      if(/執行副主席|主席/.test(title) && v<=2) return v;
      if(v===3 || /副主席/.test(title)) return 3;
      if(v===4 || /總主任/.test(title)) return 4;
      if(v===5 || (/主任/.test(title) && !/總主任/.test(title))) return 5;
      return v||99;
    };
    const raw=org.filter(n=> normalizeGroupName(n.group || this.parseGroupFromLevel(n.level))===groupName || (n.group||'')===groupName).sort((a,b)=>{
      const ra=rankOf(a), rb=rankOf(b);
      if(ra!==rb) return ra-rb;
      return String(a.title||'').localeCompare(String(b.title||''),'zh-Hant');
    });
    // v8.6：去重 key 不再計 level 字串（舊快取的 level 編號格式與 JSON 可能不同，計入會令同一崗位計兩次）
    // v8.9：改用正規化 key（去換行／空格、統一半全形括號、人名拆分隔符後排序）——
    //        Drive 同步版與 JSON 種子往往只差格式，舊 key 擋唔住會令「N 崗位 · M 人」×2。
    return dedupeOrgNodes(raw, null, true);
  }
,
  // 職務大綱「拆位」：一組的職務大綱常是一大段（副主席…／總主任…／主任… 連埋），
  // 按「職位（姓名）：」開頭的行拆成各職位獨立小段，令所有該組職位一目了然（唔會堆成一堆只見到副主席）
  splitDutySections(text){
    const lines=String(text||'').split(/\r?\n/);
    const out=[]; let cur=null;
    lines.forEach(ln=>{
      const t=ln.trim();
      if(t && t.length<=40 && t.endsWith('：') && !/\d/.test(t)){
        if(cur) out.push(cur);
        cur={title:t.slice(0,-1).trim(), body:[]};
      } else if(cur){
        cur.body.push(ln);
      } else if(t){
        if(!out.length) out.push({title:'', body:[]});
        out[out.length-1].body.push(ln);
      }
    });
    if(cur) out.push(cur);
    return out.filter(s=>s.title||s.body.some(l=>l.trim()));
  }
,
  // 儀表板卡片安全寫入：內容相同就不重寫；使用者正在觸控／剛觸控完（450ms 內）則延後寫入，
  // 防止非同步資料載入後替換 DOM 時，把進行中的觸控合成 click 落在新卡片上（主頁「自動跳入」卡片 BUG）。
  deferredDashWrite(el,html){
    if(!el) return false;
    if(el.innerHTML===html) return true; // 內容無變化，不動 DOM
    const now=Date.now();
    if(this._touchActive || (now-(this._lastTouchAt||0)<450)){
      if(!el._deferTries) el._deferTries=0;
      if(++el._deferTries>10){ el._deferTries=0; el.innerHTML=html; return true; } // 最多等約 6 秒
      setTimeout(()=>this.deferredDashWrite(el,html),600);
      return false;
    }
    el._deferTries=0; el.innerHTML=html;
    return true;
  }
,
  // 部門卡片（共用）：儀表板「部門管理中心」與底部導覽「部門中心」列表頁都用同一份，兩處內容必定一致
  groupHubCardHTML(g,currentGroup,isAdmin){
    const meta=this.groupMeta(g);
    // 與「部門管理中心」同一份崗位計算（getGroupOrgNodes），主頁卡片與進入卡片後的崗位數／人數必定一致
    // （人數只計架構圖崗位上的人名；舊聯絡表「管理」分組含主席／執副主席，併入會令顧問團人數虛大，不再併計）
    const uniqPosts=this.getGroupOrgNodes(g);
    const members=new Set();
    uniqPosts.forEach(n=>{ orgNameList(n.names).forEach(x=>members.add(x)); });
    const st=this.groupApplyStats(g);
    const cleanGroup=normalizeGroupName(g);
    const isOwn=currentGroup && cleanGroup===currentGroup;
    const canManage=isAdmin || isOwn || this.isAllGroupViewer();   // v8.14：行政組統管全站，其他組別卡都可以改
    const pending=st.supPending+st.boothPending+st.vehPending+st.mealPending;
    // 協調組／行政組有專屬管理頁；其餘進入部門管理中心
    const action = g==='協調組' ? "app.openModule('coordinator_group')" : (g==='行政組' ? "app.openModule('admin_group')" : `app.openGroupManagement('${g.replace(/'/g,"")}')`);
    return `<div class="border rounded-2xl p-3.5 ${isOwn?'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-100':'bg-white'} hover:shadow-md transition cursor-pointer" onclick="${action}">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-10 h-10 ${meta.cls} rounded-xl flex items-center justify-center text-base flex-shrink-0"><i class="${meta.icon}"></i></div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap"><b class="text-[13px]">${escapeHtml(g)}</b>${isOwn?'<span class="bg-indigo-600 text-white text-[9.5px] px-2 py-0.5 rounded-full">我的組別</span>':''}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">${uniqPosts.length} 崗位 · ${members.size} 人</div>
          </div>
        </div>
        ${pending?`<span class="text-[9.5px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">${pending} 待批</span>`:''}
      </div>
      <div class="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
        <div class="bg-blue-50 border border-blue-100 rounded-lg py-1"><div class="text-[13px] font-extrabold text-blue-700">${st.requests.length}</div><div class="text-[9.5px] text-blue-600">物資</div></div>
        <div class="bg-orange-50 border border-orange-100 rounded-lg py-1"><div class="text-[13px] font-extrabold text-orange-700">${st.boothReqs.length}</div><div class="text-[9.5px] text-orange-600">攤位</div></div>
        <div class="bg-amber-50 border border-amber-100 rounded-lg py-1"><div class="text-[13px] font-extrabold text-amber-700">${st.vehicles.length}</div><div class="text-[9.5px] text-amber-600">車輛</div></div>
        <div class="bg-purple-50 border border-purple-100 rounded-lg py-1"><div class="text-[13px] font-extrabold text-purple-700">${st.orders.length}</div><div class="text-[9.5px] text-purple-600">膳食</div></div>
      </div>
      <div class="mt-2.5 flex items-center justify-between gap-2">
        <span class="text-[10px] text-slate-400">${canManage?'可修改／加入本組內容':'公開可看'}</span>
        <button class="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">${g==='協調組'?'物資・膳食・車輛統計':(g==='行政組'?'進入行政組':(canManage?'管理本組':'查看本組'))}</button>
      </div>
    </div>`;
  }
,
  // v8.14：可以睇到嘅部門（執副以上／行政組＝全部；其餘淨係自己組）
  visibleGroups(){
    const all=this.getEventGroups();
    if(!this.currentUser||this.isAllGroupViewer()) return all;
    const my=normalizeGroupName(this.currentUser.group_name||'');
    const own=all.filter(g=>normalizeGroupName(g)===my);
    return own.length?own:all.filter(g=>this.canViewGroup(g));
  }
,
  renderGroupQuickAccess(){
    const container=document.getElementById('group-quick-access');
    if(!container) return;
    if(!this.currentUser){ container.innerHTML=''; return; }
    const groupList=this.visibleGroups();
    const currentGroup=normalizeGroupName(this.currentUser?.group_name);
    const isAdmin=this.isAdmin();
    const html=groupList.length
      ? groupList.map(g=>this.groupHubCardHTML(g,currentGroup,isAdmin)).join('')
      : '<div class="col-span-full text-center text-[12px] text-slate-400 bg-white border rounded-2xl p-6">你只可以檢視／管理自己嘅部門（'+escapeHtml(currentGroup||'未設定組別')+'）。如要睇全部部門，請聯絡執行副主席以上或行政組。</div>';
    this.deferredDashWrite(container,html);
  }
,
  // 底部導覽「部門中心」v8.14：執副以上／行政組（isAllGroupViewer）→ 全部部門列表；其餘 → 一按直接跳自己部門
  openDeptHub(){
    if(!this.currentUser){ this.openLoginModal(); return; }
    if(this.isAllGroupViewer()){ this.openModule('dept_hub'); return; }
    const g=normalizeGroupName(this.currentUser?.group_name||'');
    if(g && this.getEventGroups().some(x=>normalizeGroupName(x)===g)){ this.openGroupManagement(g); return; }
    showToast('你嘅組別未喺組織架構圖入面，如有問題請聯絡管理員','warning');
    if(this.currentEvent) this.showDashboard();
  }
,
  // 部門中心列表頁（執副以上）：全部部門一次過見到，唔使喺儀表板轆頁
  renderDeptHubModule(){
    const container=document.getElementById('module-content');
    if(!container) return;
    if(!this.currentUser){ container.innerHTML='<p class="text-xs text-slate-500">請先登入以查看部門列表。</p>'; return; }
    // v8.14：非執副以上（亦非行政組）→ 直接入自己部門，唔畀列出全部部門
    if(!this.isAllGroupViewer()){
      const my=normalizeGroupName(this.currentUser.group_name||'');
      if(my&&this.getEventGroups().some(x=>normalizeGroupName(x)===my)){ this.openGroupManagement(my); return; }
      container.innerHTML='<p class="text-xs text-slate-500">部門列表只畀執行副主席以上／行政組查閱；你嘅組別亦未喺組織架構圖入面，如有問題請聯絡管理員。</p>'; return;
    }
    const groupList=this.getEventGroups();
    const currentGroup=normalizeGroupName(this.currentUser.group_name);
    const isAdmin=this.isAdmin();
    container.innerHTML='<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">'+groupList.map(g=>this.groupHubCardHTML(g,currentGroup,isAdmin)).join('')+'</div>';
  }
,
  // 部門卡片共用的 4 格資訊：成員／職務大綱／文件／攤位·預算（逐項列明）。
  // 協調組、行政組與其他組別的「部門管理中心」都用同一份，確保內容一致（預算逐項顯示，不是只寫「共 N 項」）。
  groupInfoBoxesHTML(groupName){
    groupName=normalizeGroupName(groupName);
    const staffData=this.getStaffData();
    const groupOrg=this.getGroupOrgNodes(groupName);
    const duties=(staffData.job_duties||[]).filter(j=> normalizeGroupName(j.group)===groupName || (j.group||'').includes(groupName)||groupName.includes(j.group||''));
    const dutySections=duties.flatMap(j=>this.splitDutySections(j.duty));
    const docsData=this.getDocumentsData();
    const groupDocs=(docsData.docs||[]).filter(d=> (d.category||'').includes(groupName) || (d.title||'').includes(groupName));
    const booths=this.getActivitiesData().booths.filter(b=> normalizeGroupName(b.group_name)===groupName || (b.group_name||'').includes(groupName));
    const fin=this.getFinanceData();
    const groupBudget = (fin.group_itemized_budgets||[]).find(g=>normalizeGroupName(g.group_name)===groupName) || {items:[]};
    const budgetItems=(groupBudget.items||[]);
    const budgetTotal = budgetItems.reduce((s,i)=>s+(parseFloat(i.budget)||0), 0);
    const actualTotal = budgetItems.reduce((s,i)=>s+(parseFloat(i.actual)||0), 0);
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-white border rounded-xl p-3"><h4 class="font-bold text-xs mb-2">👥 本組崗位／成員 (${groupOrg.length})</h4><div class="text-[11px] space-y-1 max-h-[140px] overflow-y-auto">${groupOrg.map(n=>`<div class="flex justify-between gap-2"><span>${escapeHtml(n.title||'')}</span><span class="text-slate-500">${escapeHtml(n.names||'')}</span></div>`).join('')||'<span class="text-slate-400">暫無（可於「組織架構與聯絡」加入）</span>'}</div><button onclick="app.openModule('staff')" class="mt-2 bg-white border px-2 py-1 rounded-xl text-[10px]">前往組織架構</button></div>
          <div class="bg-white border rounded-xl p-3"><h4 class="font-bold text-xs mb-2">📋 職務大綱（各職位） (${dutySections.length} 位)</h4><div class="text-[11px] space-y-2 max-h-[180px] overflow-y-auto">${dutySections.map(s=>`<div class="bg-slate-50 border rounded p-1.5 leading-relaxed">${s.title?`<div class="font-bold text-slate-800 mb-0.5">${escapeHtml(s.title)}</div>`:''}<div class="whitespace-pre-wrap text-slate-600">${escapeHtml(s.body.join('\n').trim())}</div></div>`).join('')||'<span class="text-slate-400">暫無</span>'}</div></div>
          <div class="bg-white border rounded-xl p-3"><h4 class="font-bold text-xs mb-2">📁 本組文件 (${groupDocs.length})</h4><div class="text-[11px] space-y-1 max-h-[140px] overflow-y-auto">${groupDocs.map(d=>`<div>• ${d.file_url?`<a href="${escapeHtml(d.file_url)}" target="_blank" class="text-sky-600 hover:underline">`:''}${escapeHtml(d.title||'')}${d.file_url?`</a>`:''}</div>`).join('')||'<span class="text-slate-400">暫無</span>'}</div><button onclick="app.openModule('documents')" class="mt-2 bg-white border px-2 py-1 rounded-xl text-[10px]">前往文件中心</button></div>
          <div class="bg-white border rounded-xl p-3 flex flex-col"><h4 class="font-bold text-xs mb-2">🎪 攤位 (${booths.length}) · 💰 預算</h4>
            <div class="text-[11px] space-y-1 flex-1">
              <div><b>攤位：</b>${booths.length?booths.map(b=>escapeHtml(b.booth_name)).join('、'):'無'}</div>
              <div class="mt-2 border-t pt-2"><b>本組預算（逐項）</b></div>
              <div class="space-y-0.5 max-h-[150px] overflow-y-auto">${budgetItems.map(it=>`<div class="flex justify-between gap-2" ${it.notes?`title="${escapeHtml(it.notes)}"`:''}><span class="truncate">${escapeHtml(it.item_name||'')}</span><span class="whitespace-nowrap">$${(parseFloat(it.budget)||0).toLocaleString()}<span class="text-rose-600">${(parseFloat(it.actual)||0)?`／實$${(parseFloat(it.actual)||0).toLocaleString()}`:''}</span></span></div>`).join('')||'<span class="text-slate-400">暫無預算項目</span>'}</div>
              <div class="mt-1 border-t pt-1 flex justify-between"><b>預算總額</b><b class="text-slate-700">$${budgetTotal.toLocaleString()}</b></div>
              <div class="flex justify-between"><b>實際開支</b><b class="text-rose-600">$${actualTotal.toLocaleString()}</b></div>
            </div>
            <div class="flex gap-1 mt-2"><button onclick="app.openModule('activities')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">攤位</button><button onclick="app.openModule('finance')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">財務</button></div>
          </div>
        </div>`;
  }
,
  openGroupManagement(groupName){
    groupName=normalizeGroupName(groupName);
    // v8.14：總主任／副主席等只可以入自己部門（執副以上／行政組／獲授權者除外）
    if(this.currentUser && !this.canViewGroup(groupName)){
      showToast('你只可以檢視／管理自己嘅部門（'+normalizeGroupName(this.currentUser.group_name||'未設定組別')+'）','warning');
      if(this.currentEvent) this.showDashboard(); else this.goHome();
      return;
    }
    this.pushNavHistory({view:'module',module:'group_management',group:groupName});
    this.currentModule='group_management';
    this.currentGroupManaged=groupName;
    ['landing','dashboard','users','bulk','system','approvals'].forEach(v=>document.getElementById('view-'+v)?.classList.add('hidden'));
    document.getElementById('view-module').classList.remove('hidden');
    document.getElementById('module-title').textContent=`${groupName} - 部門管理中心`;
    const isOwn=normalizeGroupName(this.currentUser?.group_name)===groupName;
    const canManage=this.isAdmin() || isOwn;
    // v8.8：主題節目組卡片加「攤位資料(Drive)／攤位總表／借用統計」頁籤（填完計劃書後的兩部分＋DRIVE 攤位資料）
    const isThemeGroup=groupName==='主題節目組';
    // v11：行政組加「紀念章派發（工作人員）」＋「失物認領」；嘉賓接待組加「紀念章派發（嘉賓）」
    const groupExtraTabs=[
      ...(groupName==='行政組'?[{k:'stamp_staff',label:'🏅 紀念章派發（工作人員）'},{k:'lost_found',label:'🧳 失物認領'}]:[]),
      ...(groupName==='嘉賓接待組'?[{k:'stamp_guest',label:'🏅 紀念章派發（嘉賓）'}]:[])
    ];
    const groupTabList=[
      {k:'apps',label:'📋 本組申請'},
      ...(isThemeGroup?[{k:'drive',label:'📁 攤位資料 (Drive)'},{k:'master',label:'🗒️ 攤位總表'},{k:'borrow',label:'📊 借用統計＋招牌'}]:[]),
      ...groupExtraTabs
    ];
    const hasGroupTabs=groupTabList.length>1;
    if(!this.groupBoothTab||!groupTabList.some(t=>t.k===this.groupBoothTab)) this.groupBoothTab='apps';
    document.getElementById('module-actions').innerHTML=`<div class="flex gap-2 flex-wrap"><button onclick="app.printCoordArea('group-print-${escapeHtml(groupName)}','${escapeHtml(groupName)} - 本組申請統計')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印本組統計</button></div>`;
    const container=document.getElementById('module-content');
    const staffData=this.getStaffData();
    const groupContacts=(staffData.contacts||[]).filter(c=> normalizeGroupName(c.group_name)===groupName || (c.group_name||'').includes(groupName) || groupName.includes(c.group_name||''));
    // 與主頁部門卡片共用同一份崗位計算（getGroupOrgNodes），主頁與進入卡片後的崗位數必定一致
    const groupOrg=this.getGroupOrgNodes(groupName);
    const st=this.groupApplyStats(groupName);
    const mealsData=this.getMealsData();
    const chip=(v,l,cls)=>`<div class="${cls} rounded-xl px-3 py-2 text-center"><div class="text-[17px] font-extrabold">${v}</div><div class="text-[10px]">${l}</div></div>`;
    const supRows=st.requests.map(r=>`<tr><td class="border px-2 py-1">${escapeHtml(r.item_name||'')}</td><td class="border px-2 py-1 text-center">${r.qty_requested||0}${escapeHtml(r.unit||'')}</td><td class="border px-2 py-1 text-center">${r.qty_approved!==null&&r.qty_approved!==undefined?r.qty_approved:'-'}</td><td class="border px-2 py-1">${escapeHtml(r.date_needed||'-')}</td><td class="border px-2 py-1">${escapeHtml(r.requested_by||'')}</td><td class="border px-2 py-1 text-center">${this.coordStatusChip(r.status)}</td></tr>`).join('');
    const vehRows=st.vehicles.map(v=>`<tr><td class="border px-2 py-1 font-bold">${escapeHtml(v.plate||'')}</td><td class="border px-2 py-1">${escapeHtml(v.driver_name||'')}</td><td class="border px-2 py-1">${escapeHtml(v.entry_date||'')}→${escapeHtml(v.exit_date||'')}</td><td class="border px-2 py-1">${escapeHtml(v.parking_location||'待定')}</td><td class="border px-2 py-1 text-center">${this.coordStatusChip(v.status)}</td></tr>`).join('');
    const mealRows=st.orders.map(o=>{ const m=(mealsData.menus||[]).find(x=>x.menu_id===o.menu_id)||{}; return `<tr><td class="border px-2 py-1">${escapeHtml(m.date||'')} ${escapeHtml(m.meal_type||'')}</td><td class="border px-2 py-1">${escapeHtml(o.user_name||'')}</td><td class="border px-2 py-1 font-bold">${escapeHtml(o.selection||'')}</td><td class="border px-2 py-1">${escapeHtml(o.remarks||'')}</td><td class="border px-2 py-1 text-center">${this.coordStatusChip(o.status)}</td></tr>`; }).join('');
    const boothRows=st.boothReqs.map(r=>`<tr><td class="border px-2 py-1">${escapeHtml(r.item_name||'')}</td><td class="border px-2 py-1 text-center">${r.qty_requested||0}${escapeHtml(r.unit||'')}</td><td class="border px-2 py-1 text-center">${r.qty_approved!==null&&r.qty_approved!==undefined?r.qty_approved:'-'}</td><td class="border px-2 py-1">${escapeHtml(r.purpose||'-')}</td><td class="border px-2 py-1">${escapeHtml(r.requested_by||'')}</td><td class="border px-2 py-1 text-center">${this.coordStatusChip(r.status)}</td></tr>`).join('');
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed">
          <b>部門管理中心 - ${escapeHtml(groupName)}</b><br>
          本組的人、職務、文件、攤位，以及本組提交的<b>所有申請及批核狀態</b>都在此。低於總主任提交的申請先由本組總主任以上確認，再按批核權限頁的多選路由交指定組別批核及執行。<br>
          登入成員可查看，僅本組或管理層可修改。${canManage?'<b class="text-emerald-700">你可管理本組內容。</b>':''}
        </div>
        <!-- 組別介紹下的快捷按鈕：正常組別只有「前往申請中心」＋「我的監察」；個別組別另有專屬按鈕（主題節目組＝攤位總覽、服務及發展組＝童心捐贈大行動、協調組＝物資／膳食／車輛統計） -->
        <div class="flex gap-2 flex-wrap">
          <button onclick="app.openModule('apply_hub')" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-pen mr-1"></i>前往申請中心提交申請</button>
          <button onclick="app.openModule('my_monitor')" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-eye mr-1"></i>我的監察</button>
          <button onclick="app.openBoxLabelModal('${escapeHtml(groupName)}')" class="bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-box-open mr-1"></i>箱頭紙</button>
          ${groupName==='主題節目組'?`<button onclick="app.openModule('activities'); setTimeout(()=>app.switchActivitiesTab('booth'),300)" class="bg-fuchsia-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-store mr-1"></i>攤位總覽</button>`:''}
          ${groupName==='服務及發展組'&&this.canViewDonationsStats()?`<button onclick="app.openModule('donations')" class="bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-hand-holding-heart mr-1"></i>童心捐贈大行動</button>`:''}
        </div>
        ${hasGroupTabs?(()=>{ const tabCls=t=>this.groupBoothTab===t?'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-900 text-white shadow':'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200'; return `<div class="flex gap-2 border-b pb-2 overflow-x-auto flex-wrap">
          ${groupTabList.map(t=>`<button onclick="app.switchGroupTab('${t.k}')" class="group-tab-btn ${tabCls(t.k)}">${t.label}</button>`).join('')}
        </div>`; })():''}
        <div id="group-tab-apps" class="space-y-4 ${this.groupBoothTab==='apps'?'':'hidden'}">
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
          ${chip(groupOrg.length,'崗位','bg-slate-100 text-slate-700 border')}
          ${chip(st.requests.length,'物資申請','bg-blue-50 text-blue-700 border border-blue-200')}
          ${chip(st.boothReqs.length,'攤位申請','bg-orange-50 text-orange-700 border border-orange-200')}
          ${chip(st.vehicles.length,'車輛申請','bg-amber-50 text-amber-700 border border-amber-200')}
          ${chip(st.orders.length,'膳食訂餐','bg-purple-50 text-purple-700 border border-purple-200')}
        </div>
        ${this.groupInfoBoxesHTML(groupName)}
        <div id="group-print-${escapeHtml(groupName)}" class="space-y-3">
          <div class="bg-white border rounded-xl p-3">
            <b class="text-[12px]"><i class="fa-solid fa-boxes-stacked text-blue-600 mr-1"></i>本組物資申請及狀態 (${st.requests.length}，待批 ${st.supPending})</b>
            <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">物資</th><th class="border px-2 py-1">申請</th><th class="border px-2 py-1">批核</th><th class="border px-2 py-1">需用日期</th><th class="border px-2 py-1">申請人</th><th class="border px-2 py-1">狀態</th></tr></thead><tbody>${supRows||'<tr><td colspan="6" class="border px-2 py-4 text-center text-slate-400">暫無</td></tr>'}</tbody></table></div>
          </div>
          <div class="bg-white border rounded-xl p-3">
            <b class="text-[12px]"><i class="fa-solid fa-store text-orange-600 mr-1"></i>本組攤位申請及狀態 (${st.boothReqs.length}，待批 ${st.boothPending})</b>
            <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">攤位物資</th><th class="border px-2 py-1">申請</th><th class="border px-2 py-1">批核</th><th class="border px-2 py-1">用途</th><th class="border px-2 py-1">申請人</th><th class="border px-2 py-1">狀態</th></tr></thead><tbody>${boothRows||'<tr><td colspan="6" class="border px-2 py-4 text-center text-slate-400">暫無</td></tr>'}</tbody></table></div>
          </div>
          <div class="bg-white border rounded-xl p-3">
            <b class="text-[12px]"><i class="fa-solid fa-car text-amber-600 mr-1"></i>本組車輛通行證及狀態 (${st.vehicles.length}，待批 ${st.vehPending})</b>
            <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">車牌</th><th class="border px-2 py-1">司機</th><th class="border px-2 py-1">進出</th><th class="border px-2 py-1">停泊</th><th class="border px-2 py-1">狀態</th></tr></thead><tbody>${vehRows||'<tr><td colspan="5" class="border px-2 py-4 text-center text-slate-400">暫無</td></tr>'}</tbody></table></div>
          </div>
          <div class="bg-white border rounded-xl p-3">
            <b class="text-[12px]"><i class="fa-solid fa-utensils text-purple-600 mr-1"></i>本組膳食訂餐及狀態 (${st.orders.length}，待處理 ${st.mealPending})</b>
            <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">日期/餐別</th><th class="border px-2 py-1">姓名</th><th class="border px-2 py-1">選擇</th><th class="border px-2 py-1">備註</th><th class="border px-2 py-1">狀態</th></tr></thead><tbody>${mealRows||'<tr><td colspan="5" class="border px-2 py-4 text-center text-slate-400">暫無</td></tr>'}</tbody></table></div>
          </div>
        </div>
        <!-- 快捷按鈕已移至組別介紹下方（正常組別：前往申請中心＋我的監察；個別組別另有專屬按鈕） -->
        ${groupName==='服務及發展組'&&this.canViewDonationsStats()?this.renderDonationSummaryForGroup():''}
        </div>
        ${isThemeGroup?`<div id="group-tab-drive" class="hidden"></div><div id="group-tab-master" class="hidden"></div><div id="group-tab-borrow" class="hidden"></div>`:''}
        ${groupExtraTabs.map(t=>`<div id="group-tab-${t.k}" class="${this.groupBoothTab===t.k?'':'hidden'}"></div>`).join('')}
      </div>`;
    // v11：行政組／嘉賓接待組專屬頁籤內容（紀念章派發 TICK 人名；失物認領由行政組紀錄）
    groupExtraTabs.forEach(t=>{
      const el=document.getElementById('group-tab-'+t.k);
      if(!el) return;
      if(t.k==='stamp_staff') el.innerHTML=this.renderSouvenirStampsHTML('staff');
      else if(t.k==='stamp_guest') el.innerHTML=this.renderSouvenirStampsHTML('guests');
      else if(t.k==='lost_found') el.innerHTML=this.renderLostFoundHTML({compact:true});
    });
    if(isThemeGroup){
      const agg=this.boothPlanAggregates(this.getSuppliesData().booth_requests||[]);
      const isPublic=!this.currentUser;
      const canBoothExport=this.isAdmin()||this.isCoordinatorViceChair();
      const driveEl=document.getElementById('group-tab-drive');
      const masterEl=document.getElementById('group-tab-master');
      const borrowEl=document.getElementById('group-tab-borrow');
      if(driveEl) driveEl.innerHTML=this.renderGroupBoothDataHTML();
      if(masterEl) masterEl.innerHTML=`<div class="space-y-3">
        <div class="flex gap-2 flex-wrap"><button onclick="app.openModule('booth')" class="bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>提交／查看攤位計劃書（借用統計）</button>${canBoothExport?`<button onclick="app.exportBoothCSV()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>匯出總表 CSV</button><button onclick="app.printCoordArea('group-master-print','2026 攤位總表')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印總表</button>`:''}</div>
        <div id="group-master-print">${this.renderBoothMasterTableHTML(agg,isPublic)}</div>
      </div>`;
      if(borrowEl) borrowEl.innerHTML=`<div class="space-y-3">${this.renderBoothBorrowStatsHTML(agg,isPublic)}${this.renderBoothSignboardHTML(isPublic)}</div>`;
      ['apps','drive','master','borrow'].forEach(t=>{ const el=document.getElementById('group-tab-'+t); if(el) el.classList.toggle('hidden',t!==this.groupBoothTab); });
    }
  }
,
  switchGroupTab(tab){
    this.groupBoothTab=tab;
    // v11：加入行政組／嘉賓接待組專屬頁籤（紀念章派發＋失物認領）
    ['apps','drive','master','borrow','stamp_staff','stamp_guest','lost_found'].forEach(t=>{ const el=document.getElementById('group-tab-'+t); if(el) el.classList.toggle('hidden',t!==tab); });
    document.querySelectorAll('.group-tab-btn').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className='group-tab-btn '+(t===tab?'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-900 text-white shadow':'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200');
    });
  }
,
  async loadEventData(){this.eventData={}; if(this.mockMode){try{const res=await fetch(`data/${this.currentEvent.event_id}.json`); this.eventData=await res.json();}catch(e){}} if(!this.eventData.meetings) this.eventData.meetings=[]; if(!this.eventData.staff) this.eventData.staff={org_chart:[],contacts:[],job_duties:[]};
    // 正式活動（已連後端）：內置靜態資料仍從 JSON 載入（無後端模組），後端/本地改動優先
    if(!this.isDemoEvent() && this.currentEvent){
      try{
        const r2=await fetch(`data/${this.currentEvent.event_id}.json?t=${Date.now()}`); const j2=await r2.json();
        if(j2){
          // v8.2：JSON 版本檢查。data_version 變更時，自動清 staff / crisis 舊 localStorage 快取，
          // 讓「秘書處在 JSON 更新後強制刷新也看不到」的問題不再發生。
          try{
            const dvKey='event_data_version_'+this.currentEvent.event_id;
            const lastDv=localStorage.getItem(dvKey);
            const newDv=j2.data_version||'';
            if(newDv && newDv!==lastDv){
              localStorage.removeItem(LS.staff(this.currentEvent.event_id));
              localStorage.removeItem(LS.crisis(this.currentEvent.event_id));
              this._crisisLocalKept=null;
              localStorage.setItem(dvKey, newDv);
              console.log('[ISD] data_version changed → cleared staff/crisis local cache:', lastDv, '→', newDv);
            }
          }catch(e){}
          // 「以 JSON 為單一事實來源」的模組：只要 JSON 有,一律覆蓋（避免空 skeleton 卡住新資料）
          ['staff','crisis','documents','parking_source','schedule_source','participants_source','drive','theme_badges','awards','ceremony','unit_guide','announcements'].forEach(k=>{ if(j2[k]!==undefined && j2[k]!==null) this.eventData[k]=j2[k]; });
          // finance / activities：只併入「資料來源指標」
          if(j2.finance && j2.finance.budget_source) this.eventData.finance={budget_source:j2.finance.budget_source};
          if(j2.activities && j2.activities.booth_source) this.eventData.activities={booth_source:j2.activities.booth_source};
          if(!this.eventData.meetings||!this.eventData.meetings.length) this.eventData.meetings=Array.isArray(j2.meetings)?j2.meetings:[];
          if(!this.eventData.staff) this.eventData.staff={org_chart:[],contacts:[],job_duties:[]};
        }
      }catch(e){}
    }
    const localKey=LS.meetings(this.currentEvent.event_id); const localMeetings=JSON.parse(localStorage.getItem(localKey)||'null');
    // 會議：localStorage 僅作暫存（未上傳的草稿），已上傳的以 JSON 為準
    if(localMeetings&&Array.isArray(localMeetings)&&localMeetings.length){
      const jsonMeetings=this.eventData.meetings||[];
      // 合併：JSON 為主，localStorage 只補充 JSON 沒有的新會議（未上傳草稿）
      const jsonIds=new Set(jsonMeetings.map(m=>m.meeting_id));
      const drafts=localMeetings.filter(m=>!jsonIds.has(m.meeting_id));
      this.eventData.meetings=[...jsonMeetings,...drafts];
    }
    // Staff/Crisis/其他：全部以 JSON 為準，不從 localStorage 覆蓋
    // localStorage 僅用於暫存未上傳的修改，上傳後 JSON 會更新
    // 會議議程／紀錄「內建 JSON」：data/meeting_records.json（+ 本機編輯覆蓋），令成員唔使彈出 Drive APP 都睇到全文
    await this.loadMeetingRecords();
    // 正式活動（非示範沙盒）且已連後端：拉取 Meal_Orders 合併（組長確認/行政審批狀態跨裝置同步）
    this.syncApplicationsFromGas();
  }
,
  // ── 返回導航：「返回」＝返回上一頁（例如由申請中心進入子頁，返回就回到申請中心，而不是主控台）──
  // 每次真正切換頁面（openModule / openGroupManagement / switchTopTab / goHome）前把「目前頁面」push 入棧；
  // 按「返回」時 pop 上一頁還原。同頁重複進入不會重疊入棧。
  currentNavState(){
    const vis=id=>{const el=document.getElementById('view-'+id); return el && !el.classList.contains('hidden');};
    if(vis('module')) return {view:'module', module:this.currentModule, group:this.currentModule==='group_management'?this.currentGroupManaged:undefined};
    if(vis('landing')) return {view:'landing'};
    if(vis('dashboard')) return {view:'dashboard'};
    for(const v of ['users','bulk','system','approvals','approvalmatrix']) if(vis(v)) return {view:v};
    return {view:'dashboard'};
  }
,
  // target＝即將進入的頁面；若目前已在該頁（重複點擊）就不入棧，避免返回棧被重疊污染
  // 「返回」還原上一頁時（_restoringNav）不入棧，避免把「往回走」又變成「往前走」
  pushNavHistory(target){
    if(this._restoringNav) return;
    if(!Array.isArray(this.navHistory)) this.navHistory=[];
    const cur=this.currentNavState();
    const sameState=(a,b)=>a.view===b.view && (a.view!=='module' || (a.module===b.module && (b.group===undefined || a.group===b.group)));
    if(target){
      if(sameState(cur,target)) return;
    } else {
      const top=this.navHistory[this.navHistory.length-1];
      if(top && sameState(top,cur)) return;
    }
    this.navHistory.push(cur);
    if(this.navHistory.length>30) this.navHistory.shift();
  }
,
  restoreNavState(st){
    if(!st){ this.showDashboard(); return; }
    this._restoringNav=true;
    try{
      if(st.view==='module' && st.module){
        if(st.module==='group_management'){ if(st.group) this.openGroupManagement(st.group); else this.showDashboard(); return; }
        this.openModule(st.module); return;
      }
      if(st.view==='landing'){ this.goHome(); return; }
      if(st.view==='dashboard'){ this.showDashboard(); return; }
      this.switchTopTab(st.view);
    } finally { this._restoringNav=false; }
  }
,
  backToDashboard(){
    // 「返回」＝返回上一層級：有歷史即回上一頁（申請中心子頁→申請中心；部門卡片→儀表板）；
    // 無歷史時若已選活動則回儀表板，未選活動回「選擇活動」頁（避免 showDashboard 冇 currentEvent 出錯）。
    const prev=(Array.isArray(this.navHistory)&&this.navHistory.length)?this.navHistory.pop():null;
    if(!prev&&!this.currentEvent){ this.goHome(); return; }
    this.restoreNavState(prev);
  }
,
  // v8.13：模組右上角通用「新增」掣嘅顯示準則——同一個模組入面嗰啲新增／編輯掣用同一套權限。
  // ・未登入（訪客）＝一律唔顯示（公開資料只可以睇，唔可以改）
  // ・有卡片定義（DASH_CARD_DEFS）＝用 canEditRoleCard（例如公告／旅團須知／日程表各有自己門檻）
  // ・冇卡片定義嘅舊模組＝主任（30）以上先顯示
  canAddModuleRecord(key,def){
    if(!this.currentUser) return false;
    if(this.roleLevel(this.currentUser.role)>=100) return true;
    if(def) return this.canEditRoleCard(def);
    return this.roleLevel(this.currentUser.role)>=30;
  }
,
  openModule(key){
    if((key==='account_setup'||key==='permissions') && this.roleLevel(this.currentUser?.role)<40){ showToast('此管理工具只供總主任以上使用','warning'); return; }
    this.pushNavHistory({view:'module',module:key});
    this.currentModule=key; ['landing','dashboard','users','bulk','system','approvals'].forEach(v=>document.getElementById('view-'+v)?.classList.add('hidden')); document.getElementById('view-module').classList.remove('hidden'); document.getElementById('module-title').textContent={meetings:'會議卡片',staff:'工作人員卡片',finance:'財務',activities:'活動與攤位',meals:'膳食',schedule:'日程表',supplies:'物資申請',booth:'攤位計劃書',parking:'泊車證',oral_quotes:'口頭報價登記',documents:'文件檔案',unit_guide:'旅團須知',ceremony:'典禮儀式',awards:'獲獎名單',crisis:'危機處理',theme_badges:'活動主題章',announcements:'公告及溝通',exec_manual:'執行手冊',apply_hub:'申請中心',my_monitor:'我的監察',admin_group:'行政組',coordinator_group:'協調組',transport:'交通及泊車',account_setup:'開戶',permissions:'權限管理',donations:'童心捐贈大行動',dept_hub:'部門管理中心'}[key]||key;
    if(key==='meetings'){
      // 正式活動已有會議 Drive 時，點擊會議卡片直接顯示各次會議資料夾及最新議程／紀錄。
      this.meetingSubTab='list';
      const isAdmin=this.canManageMeetings();
      document.getElementById('module-actions').innerHTML=`<div class="flex gap-2"><input id="meeting-search" placeholder="搜尋會議/第X次" oninput="app.renderMeetingsList()" class="px-3 py-2 border rounded-xl text-xs w-32 sm:w-48"><select id="meeting-visibility-filter" onchange="app.renderMeetingsList()" class="px-2 py-2 border rounded-xl text-xs bg-white"><option value="">全部可見度</option><option value="public">公開</option><option value="private">僅管理員</option><option value="attendees">僅主任以上</option></select>${isAdmin?'<button onclick="app.openMeetingFormModal()" class="bg-sky-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增會議</button>':''}<button onclick="app.exportMeetings()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button>${isAdmin?'<button onclick="app.toggleMeetingRecordsEditor()" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-code mr-1"></i>內建議程 JSON</button>':''}<button onclick="app.downloadAllMeetingsFiles()" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>下載全部</button></div>`;
    } else if(key==='staff'){
      const canManageStaff=this.canManageStaffContacts();
      document.getElementById('module-actions').innerHTML=canManageStaff
        ?`<div class="flex gap-2 flex-wrap"><button onclick="app.openStaffFormModal()" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold">+ 單欄新增</button><button onclick="app.downloadStaffTemplate('contacts')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載名單範本</button><label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">上傳文件轉JSON<input type="file" accept=".csv,.json" class="hidden" onchange="app.handleStaffFileUpload(this.files[0],'contacts')"></label>${this.currentUser?`<button onclick="app.exportStaffData('contacts')" class="bg-slate-100 border px-3 py-2 rounded-xl text-xs font-bold">匯出</button>`:''}</div>`
        :`<div class="flex gap-2 flex-wrap items-center"><span class="text-[11px] bg-indigo-50 text-indigo-700 px-3 py-2 rounded-full border border-indigo-200"><i class="fa-solid fa-globe mr-1"></i>組織架構公開可看；聯絡資料 (電話/Email) 需登入</span>${this.currentUser?`<button onclick="app.exportStaffData('contacts')" class="bg-slate-100 border px-3 py-2 rounded-xl text-xs font-bold">匯出</button>`:''}</div>`;
    } else if(key==='activities'){
      const canUpload=this.canUploadActivity();
      document.getElementById('module-actions').innerHTML=`<div class="flex gap-2 flex-wrap">${canUpload?`<button onclick="app.openActivityMapForm()" class="bg-sky-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-map mr-1"></i>上傳地圖</button><button onclick="app.openBoothForm()" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-store mr-1"></i>新增攤位</button><button onclick="app.openGameCardForm()" class="bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-id-card mr-1"></i>上傳遊戲卡</button>`:''}<button onclick="app.downloadActivityTemplate()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載範本</button><button onclick="app.exportActivitiesData()" class="bg-slate-100 border px-3 py-2 rounded-xl text-xs font-bold">匯出</button></div>`;
    } else if(key==='documents'){
      document.getElementById('module-actions').innerHTML=`<div class="flex gap-2 flex-wrap">${this.canUploadDocument()?`<button onclick="app.openDocumentForm()" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳文件 (管理員/行政總主任以上)</button>`:''}<button onclick="app.downloadDocumentTemplate()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載範本</button><button onclick="app.exportDocumentsData()" class="bg-slate-100 border px-3 py-2 rounded-xl text-xs font-bold">匯出</button></div>`;
    } else if(key==='theme_badges'){
      document.getElementById('module-actions').innerHTML=`<div class="flex gap-2 flex-wrap">${this.canUploadThemeBadge()?`<button onclick="app.openThemeBadgeForm()" class="bg-purple-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-award mr-1"></i>上傳主題章 (副主席以上)</button>`:''}<button onclick="app.exportThemeBadges()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button></div>`;
    } else if(key==='account_setup'){
      document.getElementById('module-actions').innerHTML=`<span class="text-[11px] bg-teal-50 text-teal-700 px-3 py-2 rounded-full border border-teal-200">開戶（預設密碼 1234）</span>`;
    } else if(key==='dept_hub'){
      document.getElementById('module-actions').innerHTML='<span class="text-[11px] bg-indigo-50 text-indigo-700 px-3 py-2 rounded-full border border-indigo-200"><i class="fa-solid fa-sitemap mr-1"></i>一按即見全部部門，點部門卡進入部門管理中心</span>';
    } else if(key==='my_monitor'||key==='apply_hub'||key==='exec_manual'||key==='coordinator_group'){
      document.getElementById('module-actions').innerHTML='';
    } else if(key==='donations'){
      document.getElementById('module-actions').innerHTML=this.canViewDonationsStats()
        ?`<div class="flex gap-2 flex-wrap"><button onclick="app.exportDonationsData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>匯出全部</button></div>`
        :'';
    } else if(key==='permissions'){
      document.getElementById('module-actions').innerHTML=`<button onclick="app.renderPermissionsModule()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>重新整理</button>`;
    } else {
      // v8.13：呢個「新增」掣以前係無條件兜底顯示（任何模組、任何人都出），
      // 結果未登入（訪客）入「公告及溝通」都會見到「新增」——但公告係主任以上先可以發佈。
      // 而家改為跟返「呢張卡你有冇權改」同一套判斷（canEditRoleCard），
      // 即係：顯示出嚟嘅「新增」掣，一定同卡入面嗰啲新增／編輯掣一致；無權限＝唔顯示。
      const def=DASH_CARD_DEFS.find(d=>d.id===key);
      document.getElementById('module-actions').innerHTML=this.canAddModuleRecord(key,def)
        ?`<button onclick="app.openAddRecordModal('${key}')" class="bg-sky-600 text-white px-3 py-2 rounded-xl text-xs font-bold">新增</button>`
        :'';
    }
    this.renderModuleContent(key);
    this.updateBottomNav();
  }
,
  // 批核中心：待批項目（物資／車位／財務），用 canApproveArea 控制批准/拒絕
  async renderApprovalCenter(){
    if(this.roleLevel(this.currentUser?.role)<40){ showToast('批核中心只供總主任以上查看','warning'); this.showDashboard(); return; }
    document.getElementById('view-landing').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-module').classList.add('hidden');
    document.getElementById('view-approvals').classList.remove('hidden');
    await Promise.all([this.loadApprovalPermissions(),this.loadApprovalRouting()]);
    const container=document.getElementById('approval-content');
    if(!container) return;
    const sup=this.getSuppliesData();
    const parking=this.getParkingData();
    const fin=this.getFinanceData();
    const mealsData=this.getMealsData();
    const pendingSupplies=(sup.requests||[]).filter(r=>r.status==='pending');
    const pendingVehicles=(sup.vehicle_passes||[]).filter(v=>v.status==='pending');
    const pendingParking=(parking.applications||[]).filter(p=>p.status==='pending');
    const pendingMeals=(mealsData.orders||[]).filter(o=>o.status==='pending'||o.status==='group_ok');
    const pendingExpenses=(fin.expenses||[]).filter(e=>e.status==='pending');
    const pendingTotal=pendingSupplies.length+pendingVehicles.length+pendingParking.length+pendingMeals.length+pendingExpenses.length;
    const badge=document.getElementById('badge-pending-count');
    if(badge){ if(pendingTotal>0){ badge.textContent=pendingTotal; badge.classList.remove('hidden'); } else badge.classList.add('hidden'); }
    const routeChips=(area)=>`<div class="flex flex-wrap gap-1 mt-1.5"><span class="text-[9.5px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full"><i class="fa-solid fa-user-check mr-1"></i>批核：${escapeHtml(this.approvalRouteLabel(area,'approver_groups'))}</span><span class="text-[9.5px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full"><i class="fa-solid fa-clipboard-check mr-1"></i>執行／名單：${escapeHtml(this.approvalRouteLabel(area,'executor_groups'))}</span></div>`;
    const actionButtons=(area,record,id,approveCall,rejectCall)=>{
      const needs=this.applicationNeedsGroupConfirmation(record);
      const canConfirm=needs&&this.canConfirmApplication(record);
      const ready=!needs;
      const canFinal=ready&&this.canApproveArea(area);
      const buttons=[];
      if(canConfirm) buttons.push(`<button onclick="app.confirmApplication('${area}','${id}')" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-user-check mr-1"></i>本組確認</button>`);
      if(canFinal){
        buttons.push(`<button onclick="${approveCall};app.renderApprovalCenter()" class="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">批准</button>`);
        buttons.push(`<button onclick="${rejectCall};app.renderApprovalCenter()" class="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1.5 rounded-xl text-[11px] font-bold">拒絕</button>`);
      }
      if(this.isSuperAdmin()){
        const del=area==='supplies'?`app.deleteSupplyRequest('${id}')`:area==='vehicle'?(record.parking_id?`app.deleteParkingRequest('${id}')`:`app.deleteVehiclePass('${id}')`):area==='meals'?`app.deleteMealOrder('${id}')`:area==='finance'?`app.deleteExpense('${id}')`:'';
        if(del) buttons.push(`<button onclick="${del}" class="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-trash mr-1"></i>永久刪除</button>`);
      }
      if(!buttons.length) buttons.push(`<span class="text-[10px] text-slate-400">${needs?'待申請人所屬組別確認':'非指定批核組／無批核權'}</span>`);
      return `<div class="flex gap-1 flex-wrap flex-shrink-0">${buttons.join('')}</div>`;
    };
    const section=(area,icon,color,title,records,rowsHTML)=>`
      <div class="border rounded-xl p-4 bg-white">
        <div class="flex items-center gap-2"><i class="${icon} ${color}"></i><b class="text-[13px]">${title}</b><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border">${records.length} 待處理</span></div>
        ${routeChips(area)}
        <div class="space-y-2 mt-3">${rowsHTML||'<p class="text-xs text-slate-400">暫無待處理項目</p>'}</div>
      </div>`;
    const supRows=pendingSupplies.map(r=>`<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-xl p-2.5 bg-slate-50">
      <div class="min-w-0"><div class="flex flex-wrap gap-1.5 items-center"><b class="text-[12px]">${escapeHtml(r.item_name)}</b><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border">${escapeHtml(r.group_name||'')}</span>${this.applicationStageHTML(r)}</div><div class="text-[11px] text-slate-500 mt-1">申請 ${r.qty_requested} ${escapeHtml(r.unit||'個')} · ${escapeHtml(r.requested_by||'')}</div></div>
      ${actionButtons('supplies',r,r.request_id,`app.approveSupplyRequest('${r.request_id}')`,`app.rejectSupplyRequest('${r.request_id}')`)}
    </div>`).join('');
    const vehRows=[
      ...pendingVehicles.map(v=>`<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-xl p-2.5 bg-slate-50">
        <div class="min-w-0"><div class="flex flex-wrap gap-1.5 items-center"><b class="text-[12px]">${escapeHtml(v.plate||'')}</b><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border">${escapeHtml(v.group_name||'')}</span>${this.applicationStageHTML(v)}</div><div class="text-[11px] text-slate-500 mt-1">車輛通行證 · 司機 ${escapeHtml(v.driver_name||'')} · 用途 ${escapeHtml(v.purpose||'')}</div></div>
        ${actionButtons('vehicle',v,v.pass_id,`app.approveVehiclePass('${v.pass_id}')`,`app.rejectVehiclePass('${v.pass_id}')`)}
      </div>`),
      ...pendingParking.map(p=>`<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-xl p-2.5 bg-slate-50">
        <div class="min-w-0"><div class="flex flex-wrap gap-1.5 items-center"><b class="text-[12px]">${escapeHtml(p.plate||'')}</b><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border">${escapeHtml(p.group_name||'')}</span>${this.applicationStageHTML(p)}</div><div class="text-[11px] text-slate-500 mt-1">泊車證 · 司機 ${escapeHtml(p.driver_name||'')} · ${escapeHtml(p.park_date||'')}</div></div>
        ${actionButtons('vehicle',p,p.parking_id,`app.approveParkingRequest('${p.parking_id}')`,`app.rejectParkingRequest('${p.parking_id}')`).replace(`confirmApplication('vehicle'`,`confirmApplication('parking'`)}
      </div>`)
    ].join('');
    const mealRows=pendingMeals.map(o=>{ const menu=(mealsData.menus||[]).find(m=>m.menu_id===o.menu_id)||{}; return `<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-xl p-2.5 bg-slate-50">
      <div class="min-w-0"><div class="flex flex-wrap gap-1.5 items-center"><b class="text-[12px]">${escapeHtml(o.user_name||'')} · ${escapeHtml(menu.meal_type||'膳食')}</b><span class="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border">${escapeHtml(o.group_name||'')}</span>${this.applicationStageHTML(o)}</div><div class="text-[11px] text-slate-500 mt-1">${escapeHtml(o.selection||'')}</div></div>
      ${actionButtons('meals',o,o.order_id,`app.approveMealOrder('${o.order_id}')`,`app.rejectMealOrder('${o.order_id}')`)}
    </div>`; }).join('');
    const finRows=pendingExpenses.map(e=>`<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-xl p-2.5 bg-slate-50">
      <div class="min-w-0"><div class="flex flex-wrap gap-1.5 items-center"><b class="text-[12px]">${escapeHtml(e.item_name)}</b><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border">${escapeHtml(e.group_name||'')}</span>${this.applicationStageHTML(e)}</div><div class="text-[11px] text-slate-500 mt-1">金額 $${e.actual} · ${escapeHtml(e.submitted_by||'')}</div></div>
      ${actionButtons('finance',e,e.id,`app.approveExpense('${e.id}')`,`app.rejectExpense('${e.id}')`)}
    </div>`).join('');

    // 執行／最後名單：只有設定為 executor_groups 的組別（以及管理層）可在此看到。
    const finalRows={
      supplies:(sup.requests||[]).filter(r=>['approved','modified'].includes(r.status)).map(r=>`<div class="border rounded-xl p-2.5 bg-blue-50 text-[11px]"><b>${escapeHtml(r.item_name)}</b> · ${r.qty_approved??r.qty_requested} ${escapeHtml(r.unit||'個')} · ${escapeHtml(r.group_name||'')}<div class="text-[10px] text-slate-500">${escapeHtml(r.requested_by||'')} · ${escapeHtml(r.approved_by||'')}</div></div>`).join(''),
      vehicle:[
        ...(sup.vehicle_passes||[]).filter(v=>v.status==='approved').map(v=>`<div class="border rounded-xl p-2.5 bg-amber-50 text-[11px]"><b>${escapeHtml(v.plate||'')}</b> · 車輛通行證 · ${escapeHtml(v.driver_name||'')} · ${escapeHtml(v.parking_location||'待定')}<div class="text-[10px] text-slate-500">${escapeHtml(v.group_name||'')} · ${escapeHtml(v.approved_by||'')}</div></div>`),
        ...(parking.applications||[]).filter(p=>p.status==='approved').map(p=>`<div class="border rounded-xl p-2.5 bg-amber-50 text-[11px]"><b>${escapeHtml(p.plate||'')}</b> · 泊車證 · ${escapeHtml(p.driver_name||'')} · ${escapeHtml(p.park_date||'')}<div class="text-[10px] text-slate-500">${escapeHtml(p.group_name||'')} · ${escapeHtml(p.approved_by||'')}</div></div>`)
      ].join(''),
      meals:(mealsData.orders||[]).filter(o=>o.status==='approved').map(o=>{const m=(mealsData.menus||[]).find(x=>x.menu_id===o.menu_id)||{};return `<div class="border rounded-xl p-2.5 bg-purple-50 text-[11px]"><b>${escapeHtml(o.user_name||'')}</b> · ${escapeHtml(m.date||'')} ${escapeHtml(m.meal_type||'膳食')} · ${escapeHtml(o.selection||'')}<div class="text-[10px] text-slate-500">${escapeHtml(o.group_name||'')} · ${escapeHtml(o.remarks||'')}</div></div>`;}).join(''),
      finance:(fin.expenses||[]).filter(e=>e.status==='approved').map(e=>`<div class="border rounded-xl p-2.5 bg-emerald-50 text-[11px]"><b>${escapeHtml(e.item_name||'')}</b> · $${e.actual} · ${escapeHtml(e.group_name||'')}<div class="text-[10px] text-slate-500">${escapeHtml(e.submitted_by||'')} · ${escapeHtml(e.approved_by||'')}</div></div>`).join('')
    };
    const executionCards=APPROVAL_AREAS.filter(a=>this.canExecuteArea(a.id)).map(a=>`<div class="border rounded-xl bg-white p-4">
      <div class="flex items-center justify-between gap-2 mb-2"><div class="flex items-center gap-2"><i class="${a.icon}"></i><b class="text-[12px]">${escapeHtml(a.label)}最後名單／執行檢視</b></div><span class="text-[9.5px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">${escapeHtml(this.approvalRouteLabel(a.id,'executor_groups'))}</span></div>
      <div class="space-y-1.5 max-h-72 overflow-y-auto">${finalRows[a.id]||'<p class="text-[11px] text-slate-400">暫無已批核項目</p>'}</div>
    </div>`).join('');

    const myName=this.currentUser?.name||'';
    const myId=this.currentUser?.user_id||'';
    const myMeals=(mealsData.orders||[]).filter(o=>o.user_id===myId||o.user_name===myName);
    const mySupplies=(sup.requests||[]).filter(r=>r.requested_by_id===myId||r.requested_by===myName);
    const myVehicles=(sup.vehicle_passes||[]).filter(v=>v.requested_by_id===myId||v.requested_by===myName);
    const myParking=(parking.applications||[]).filter(p=>p.requested_by_id===myId||p.requested_by===myName);
    const myExpenses=(fin.expenses||[]).filter(e=>e.submitted_by===myName||e.submitted_by_id===myId);
    const myRows=[
      ...myMeals.map(o=>({title:`膳食：${o.selection||''}`,record:o,status:o.status})),
      ...mySupplies.map(r=>({title:`物資：${r.item_name||''} x ${r.qty_requested||0}`,record:r,status:r.status})),
      ...myVehicles.map(v=>({title:`車輛：${v.plate||''} ${v.driver_name||''}`,record:v,status:v.status})),
      ...myParking.map(p=>({title:`泊車證：${p.plate||''} ${p.driver_name||''}`,record:p,status:p.status})),
      ...myExpenses.map(e=>({title:`開支：${e.item_name||''} $${e.actual||0}`,record:e,status:e.status}))
    ];
    const mySection=`<div class="border rounded-xl p-4 bg-white"><div class="flex items-center gap-2 mb-2"><i class="fa-solid fa-user text-indigo-600"></i><b class="text-[13px]">我的申請</b><span class="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border">${myRows.length} 項</span></div><div class="grid grid-cols-1 md:grid-cols-2 gap-2">${myRows.map(x=>`<div class="border rounded-xl p-2.5 bg-slate-50"><div class="flex flex-wrap gap-1.5 items-center"><b class="text-[11px]">${escapeHtml(x.title)}</b>${this.applicationStageHTML(x.record)}</div><div class="text-[10px] text-slate-500 mt-1">狀態：${escapeHtml(x.status||'pending')}</div></div>`).join('')||'<p class="text-xs text-slate-400">你暫時未有申請紀錄。</p>'}</div></div>`;

    container.innerHTML=`<div class="space-y-4">
      <div class="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] leading-relaxed text-rose-900">
        <b>批核中心用途：</b>這裡集中處理各組已提交、正等候確認／批准的膳食、物資、車輛及財務申請。你只會看到自己有權處理的項目，按按鈕批准或拒絕。<br>
        流程：低於總主任提交 → 本組總主任以上確認 → 指定組別批核 → 指定組別執行／取得最後名單。總主任以上親自提交則跳過第一步。<br>
        誰批核、誰執行由 L1 或以上在「批核權限表」設定（不會即時生效，須按確定）。
      </div>
      <div class="flex gap-2 flex-wrap"><button onclick="app.renderApprovalCenter()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>重新整理</button><button onclick="app.switchTopTab('approvalmatrix')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-route mr-1"></i>設定批核／執行組別（多選）</button></div>
      ${section('meals','fa-solid fa-utensils','text-purple-600','膳食待確認／批核',pendingMeals,mealRows)}
      ${section('supplies','fa-solid fa-boxes-stacked','text-blue-600','物資待確認／批核',pendingSupplies,supRows)}
      ${section('vehicle','fa-solid fa-car','text-amber-600','泊車證／車輛待確認／批核',[...pendingVehicles,...pendingParking],vehRows)}
      ${section('finance','fa-solid fa-wallet','text-emerald-600','財務待確認／批核',pendingExpenses,finRows)}
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><b class="text-[12px] text-emerald-900"><i class="fa-solid fa-clipboard-check mr-1"></i>執行／最後名單</b><div class="text-[10px] text-emerald-800 mt-1">只顯示你所屬執行組別負責的已批核項目；多組執行時，各指定組別均可檢視同一份名單。</div></div>
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">${executionCards||'<p class="text-xs text-slate-400">你目前不屬於任何執行組別。</p>'}</div>
      ${mySection}
    </div>`;
  }
,
  // 「批核權限表」分頁（橫看人×頁 / 直看頁×人）
  async renderApprovalMatrixView(){
    if(!this.isAdmin()){ showToast('批核權限表只供 L1 或以上（管理員／顧問／主席／執行副主席）使用','warning'); this.showDashboard(); return; }
    document.getElementById('view-landing').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-module').classList.add('hidden');
    document.getElementById('view-approvals').classList.add('hidden');
    document.getElementById('view-approvalmatrix').classList.remove('hidden');
    await Promise.all([this.loadApprovalPermissions(),this.loadApprovalRouting()]);
    this.renderApprovalMatrix();
  }
,
  // 批核權限矩陣（兩種檢視：橫看人×頁 / 直看頁×人，顏色＋文字分類）
  renderApprovalMatrix(){
    const container=document.getElementById('approval-matrix-content');
    if(!container) return;
    const perms=this.approvalPerms||[];
    const mode=this.approvalViewMode||'byPerson';
    const chip=(on,area)=> on
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${area.chip}"><span class="w-2 h-2 rounded-full ${area.dot}"></span>有權</span>`
      : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold bg-slate-50 text-slate-400 border-slate-200"><span class="w-2 h-2 rounded-full bg-slate-300"></span>無權</span>`;
    // 橫看（人 → 頁）
    const byPerson=perms.length?`
      <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-900 text-white"><tr>
        <th class="px-3 py-2 text-left">批核人</th><th class="px-3 py-2 text-left">組別</th>
        ${APPROVAL_AREAS.map(a=>`<th class="px-2 py-2 text-center"><i class="${a.icon}"></i> ${escapeHtml(a.label.replace('批核',''))}</th>`).join('')}
      </tr></thead><tbody class="divide-y bg-white">
      ${perms.map(p=>`<tr><td class="px-3 py-2 font-bold">${escapeHtml(p.name||p.user_id)}${p.name!==p.user_id&&p.user_id?`<div class="text-[10px] text-slate-400 font-mono">${escapeHtml(p.user_id)}</div>`:''}</td><td class="px-3 py-2">${escapeHtml(p.group_name||'')}</td>${APPROVAL_AREAS.map(a=>`<td class="px-2 py-2 text-center">${chip(p[a],a)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>`
      :'<p class="text-xs text-slate-400 py-4">尚未設定批核權限（請在後端 Sheet「Approval_Permissions」填寫）</p>';
    // 直看（頁 → 人）
    const byArea=APPROVAL_AREAS.map(a=>{
      const holders=perms.filter(p=>p[a]);
      return `<div class="border rounded-xl p-3 bg-white">
        <div class="flex items-center gap-2 mb-2"><span class="w-3 h-3 rounded-full ${a.dot}"></span><b class="text-[13px]">${escapeHtml(a.label)}</b><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border">${holders.length} 人</span></div>
        <div class="flex flex-wrap gap-1.5">${holders.length?holders.map(p=>`<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-bold ${a.chip}">${escapeHtml(p.name||p.user_id)}${p.group_name?`<span class="text-[9px] font-normal opacity-70">${escapeHtml(p.group_name)}</span>`:''}</span>`).join(''):'<span class="text-[11px] text-slate-400">暫無批核人</span>'}</div>
      </div>`;
    }).join('');
    const canRoute=this.isAdmin(); // L1 或以上（管理員／顧問／主席／執行副主席）可修改
    const groupButtons=(area,field)=>ORG_GROUPS.map(group=>{
      const selected=((this.pendingApprovalRouting?.[area]||this.getApprovalRoute(area))[field]||[]).includes(group);
      return `<button type="button" aria-pressed="${selected?'true':'false'}" ${canRoute?`onclick="app.toggleApprovalRouting('${area}','${field}','${group}')"`:'disabled'} class="px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition ${selected?'bg-indigo-600 text-white border-indigo-600 shadow-sm':'bg-white text-slate-500 border-slate-200'} ${canRoute?'hover:border-indigo-400':'opacity-80 cursor-default'}"><i class="fa-solid ${selected?'fa-square-check':'fa-square'} mr-1"></i>${escapeHtml(group)}</button>`;
    }).join('');
    const routingCards=APPROVAL_AREAS.map(a=>`<div class="border rounded-2xl bg-white p-4 space-y-3">
      <div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2"><span class="w-9 h-9 rounded-xl ${a.chip} border flex items-center justify-center"><i class="${a.icon}"></i></span><b class="text-[13px]">${escapeHtml(a.label)}</b></div><span class="text-[9.5px] bg-slate-100 text-slate-600 border px-2 py-0.5 rounded-full">可多選</span></div>
      <div><div class="text-[10px] font-bold text-rose-700 mb-1.5"><i class="fa-solid fa-user-check mr-1"></i>批核組別</div><div class="flex flex-wrap gap-1.5">${groupButtons(a.id,'approver_groups')}</div></div>
      <div><div class="text-[10px] font-bold text-emerald-700 mb-1.5"><i class="fa-solid fa-clipboard-check mr-1"></i>執行／最後名單組別</div><div class="flex flex-wrap gap-1.5">${groupButtons(a.id,'executor_groups')}</div></div>
    </div>`).join('');
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed text-indigo-900">
          <b><i class="fa-solid fa-route mr-1"></i>申請流程：</b>低於總主任提交的所有申請，先由<b>本組總主任以上確認</b>，再交下方所選「批核組別」；批准後由所選「執行／最後名單組別」跟進。<br>
          每格均為<b>多選按鈕</b>，不是下拉選單；可同時交多個組別執行。${canRoute?'改動只暫存在此頁，必須按下方「確定更新批核表」才會套用。':'只限 L1 或以上（管理員／顧問／主席／執行副主席）可修改。'}
        </div>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">${routingCards}</div>
        ${canRoute?`<div class="flex justify-end"><button onclick="app.confirmApprovalRouting()" class="bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow"><i class="fa-solid fa-check mr-1"></i>確定更新批核表</button></div>`:''}
        <div class="bg-slate-50 border rounded-xl p-3 text-[11px] text-slate-600">
          下方「人員權限表」可在已獲指派的批核組內再收窄至指定總主任；沒有個別紀錄時，該批核組的總主任以上均可處理。管理層保留監察及代批權。
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <button onclick="app.approvalViewMode='byPerson';app.renderApprovalMatrix()" class="px-4 py-2 rounded-xl text-xs font-bold ${mode==='byPerson'?'bg-slate-900 text-white':'bg-white border text-slate-600'}"><i class="fa-solid fa-arrows-left-right mr-1"></i>橫看（人 → 頁）</button>
          <button onclick="app.approvalViewMode='byArea';app.renderApprovalMatrix()" class="px-4 py-2 rounded-xl text-xs font-bold ${mode==='byArea'?'bg-slate-900 text-white':'bg-white border text-slate-600'}"><i class="fa-solid fa-arrows-up-down mr-1"></i>直看（頁 → 人）</button>
          <button onclick="app.renderApprovalMatrixView()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>重新整理</button>
        </div>
        ${mode==='byPerson'?byPerson:byArea}
      </div>
    `;
  }
,
  renderModuleContent(mod){
    const container=document.getElementById('module-content');
    // 直接開啟模組時，重置嵌入式容器（避免渲染去錯公告/典禮分頁）
    if(mod==='schedule'||mod==='unit_guide'||mod==='theme_badges'||mod==='awards'||mod==='announcements'){ this._scheduleContainer=null; this._unitGuideContainer=null; this._themeContainer=null; this._awardsContainer=null; }
    if(mod==='staff'){ this.renderStaffModule(); return;}
    if(mod==='finance'){ this.renderFinanceModule(); return;}
    if(mod==='meetings'){this.renderMeetingsList(); return;}
    if(mod==='supplies'){this.renderSuppliesModule(); return;}
    if(mod==='booth'){ this.renderBoothModule(); return; } // v8.6：攤位物資＝獨立模組，不再借道「物資申請」卡片（兩項申請完全分開）
    if(mod==='parking'){ this.renderParkingModule(); return; } // 獨立車輛／泊車證模組
    if(mod==='oral_quotes'){this.renderOralQuotesModule(); return;}
    if(mod==='meals'){this.renderMealsModule(); return;}
    if(mod==='activities'){this.renderActivitiesModule(); return;}
    if(mod==='documents'){this.renderDocumentsModule(); return;}
    if(mod==='unit_guide'){this.renderUnitGuideModule(); return;}
    if(mod==='ceremony'){this.renderCeremonyModule(); return;}
    if(mod==='awards'){this.renderAwardsModule(); return;}
    if(mod==='crisis'){this.renderCrisisModule(); return;}
    if(mod==='theme_badges'){this.renderThemeBadgesModule(); return;}
    if(mod==='announcements'){this.renderAnnouncementsModule(); return;}
    if(mod==='exec_manual'){this.renderExecManualModule(); return;}
    if(mod==='apply_hub'){this.renderApplyHubModule(); return;}
    if(mod==='my_monitor'){this.renderMyMonitorModule(); return;}
    if(mod==='admin_group'){this.renderAdminGroupModule(); return;}
    if(mod==='coordinator_group'){this.renderCoordinatorGroupModule(); return;}
    if(mod==='transport'){this.renderTransportModule(); return;}
    if(mod==='schedule'){this.renderScheduleModule(); return;}
    if(mod==='donations'){this.renderDonationsModule(); return;}
    if(mod==='account_setup'){this.renderAccountSetupModule(); return;}
    if(mod==='dept_hub'){this.renderDeptHubModule(); return;}
    if(mod==='permissions'){this.renderPermissionsModule(); return;}
    container.innerHTML='<p class="text-sm text-slate-400">此模組內容 (全前端演示) 尚未有資料，點擊右上新增</p>';
  }
,
});
