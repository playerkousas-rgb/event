/* 11-news.js — 「最新消息」APP 內編輯（v11.2 2026-09-01）
   ─────────────────────────────────────────────────────────────────────────────
   以前：最新消息只讀 data/events.json 的 news 欄位，要改就要改 repo → commit → push → Vercel 重新部署，
        APP 內完全冇入口，只有 GitHub 有寫入權限嘅人先改到。
   而家：執行副主席以上（主席／顧問／管理員／系統管理員）＋ 秘書處 可以喺 APP 內直接改，
        寫入後端 Events 表（news / news_updated_by / news_updated_at 三個欄，後端會自動補建），
        全部人重新載入即見；events.json 仍然係「未有人改過」時嘅預設值（fallback）。
   位置：v11.2 起「最新消息」＝全站最頂橫幅（原本係「會議預告」嘅位），
        「會議預告」＝活動資訊橫幅內（原本係「最新消息」嘅位）。兩者互換。 */
Object.assign(ScoutEventApp.prototype, {

  // 邊個可以改「最新消息」：執行副主席以上 ＋ 秘書處（與「發送會議提醒」同一批人）
  // 執行副主席以上＝系統管理員／管理員／顧問／主席／執行副主席；秘書處＝ group_name 為「秘書處」
  canEditEventNews(){
    if(!this.currentUser) return false;
    if(this.currentUser.mock_admin) return true;
    const role=this.currentUser.role||'';
    if(['super_admin','advisor','admin','chairperson','executive_vice_chairperson'].includes(role)) return true;
    const g=normalizeGroupName(this.currentUser.group_name||'');
    return g==='秘書處'||g.includes('秘書');
  }
,
  newsOverrideKey(eventId){ return 'event_news_override_v1_'+(eventId||this.currentEvent?.event_id||'isd_2026'); }
,
  // 本機暫存（即時生效 ＋ 後端未寫成功時唔會走失）
  getNewsOverride(eventId){
    try{ return JSON.parse(localStorage.getItem(this.newsOverrideKey(eventId))||'null'); }catch(e){ return null; }
  }
,
  setNewsOverride(eventId,payload){
    try{ localStorage.setItem(this.newsOverrideKey(eventId), JSON.stringify(payload)); }catch(e){}
  }
,
  // 把「後端 / 本機」嘅最新消息套落活動物件（events.json 只做預設值）
  applyNewsOverride(ev){
    if(!ev||!ev.event_id) return ev;
    const o=this.getNewsOverride(ev.event_id);
    if(!o) return ev;
    const backendAt=Date.parse(ev.news_updated_at||'')||0;
    const localAt=Date.parse(o.news_updated_at||'')||0;
    if(localAt>=backendAt){
      ev.news=String(o.news||'');
      ev.news_updated_by=o.news_updated_by||'';
      ev.news_updated_at=o.news_updated_at||'';
    }
    return ev;
  }
,
  // 顯示頂部「最新消息」橫幅（未選活動／無消息且無權編輯 ＝ 收起）
  renderEventNews(){
    const box=document.getElementById('top-news-banner');
    const textEl=document.getElementById('dash-event-news');
    if(!box||!textEl) return;
    const actions=document.getElementById('news-admin-actions');
    const metaEl=document.getElementById('news-updated-meta');
    const ev=this.currentEvent;
    if(!ev){ box.classList.add('hidden'); return; }
    this.applyNewsOverride(ev);
    const canEdit=this.canEditEventNews();
    const news=String(ev.news||'').trim();
    if(!news && !canEdit){ box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    textEl.textContent=news||'（暫未有最新消息——按右邊「修改最新消息」發佈）';
    textEl.classList.toggle('text-white/70', !news);
    if(metaEl){
      const by=String(ev.news_updated_by||'').trim();
      const at=String(ev.news_updated_at||'').trim();
      if(news&&(by||at)){
        let when='';
        if(at){ const d=new Date(at); if(!isNaN(d.getTime())) when=d.toLocaleString('zh-HK',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
        metaEl.textContent='更新：'+[by,when].filter(Boolean).join(' · ');
        metaEl.classList.remove('hidden');
      } else metaEl.classList.add('hidden');
    }
    if(actions) actions.classList.toggle('hidden', !canEdit);
  }
,
  openNewsEditor(){
    if(!this.currentEvent){ showToast('請先選擇活動','warning'); return; }
    if(!this.canEditEventNews()){ showToast('只有執行副主席以上或秘書處可以修改最新消息','error'); return; }
    const ev=this.currentEvent;
    const input=document.getElementById('news-input');
    if(input) input.value=String(ev.news||'');
    const meta=document.getElementById('news-editor-meta');
    if(meta){
      const by=String(ev.news_updated_by||'').trim();
      const at=String(ev.news_updated_at||'').trim();
      const parts=[];
      parts.push('活動：'+(ev.event_name||ev.event_id));
      if(by||at){ let when=at; const d=new Date(at); if(at&&!isNaN(d.getTime())) when=d.toLocaleString('zh-HK'); parts.push('上次更新：'+[by,when].filter(Boolean).join(' · ')); }
      else parts.push('上次更新：（未經 APP 修改過，現用 events.json 預設值）');
      if(this.mockMode) parts.push(this.isDemoEvent()?'模擬示範版：改動只留喺你嘅瀏覽器':'未連後端：改動只留喺你嘅瀏覽器');
      meta.textContent=parts.join('｜');
    }
    document.getElementById('modal-news')?.classList.remove('hidden');
  }
,
  clearEventNews(){
    if(!confirm('清除最新消息？橫幅會收起（其他人重新載入後生效）。')) return;
    const input=document.getElementById('news-input');
    if(input) input.value='';
    this.saveEventNews();
  }
,
  async saveEventNews(e){
    if(e&&e.preventDefault) e.preventDefault();
    if(!this.currentEvent){ showToast('請先選擇活動','warning'); return; }
    if(!this.canEditEventNews()){ showToast('只有執行副主席以上或秘書處可以修改最新消息','error'); return; }
    const news=String(document.getElementById('news-input')?.value||'').trim().slice(0,300);
    const eid=this.currentEvent.event_id;
    const by=this.currentUser?.name||this.currentUser?.user_id||'';
    const at=new Date().toISOString();

    // ① 先本機生效（即時睇到，亦保住未連到後端嗰陣嘅改動）
    this.currentEvent.news=news; this.currentEvent.news_updated_by=by; this.currentEvent.news_updated_at=at;
    this.setNewsOverride(eid,{news,news_updated_by:by,news_updated_at:at});
    try{ localStorage.setItem(LS.currentEvent, JSON.stringify(this.currentEvent)); }catch(err){}
    const inList=(this.eventsList||[]).find(x=>x.event_id===eid);
    if(inList){ inList.news=news; inList.news_updated_by=by; inList.news_updated_at=at; try{ localStorage.setItem(LS.events, JSON.stringify(this.eventsList)); }catch(err){} }
    this.renderEventNews();
    this.closeModal('modal-news');

    // ② 再寫後端（模擬示範版／未設定後端＝只留本機）
    if(this.mockMode){
      showToast('已更新（示範模式：只暫存喺你部機）','warning');
      return;
    }
    const res=await this.gasPost({action:'saveEventNews',api_key:this.apiKey,event_id:eid,news,updated_by:by});
    if(res&&res.json&&res.json.success){
      showToast(news?'最新消息已發佈，全部人即刻睇到':'最新消息已清除','success');
    }else{
      const why=(res&&res.json&&res.json.error)||(res&&res.error)||'未知錯誤';
      showToast('已喺你部機更新，但同步失敗，請稍後再試','error');
    }
  }
});
