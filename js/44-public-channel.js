/* 44-public-channel.js — 公眾頻道 2027 形態示範（階段 1・2026-10-04）
   ═══════════════════════════════════════════════════════════════════════════
   公眾（非工作人員・免登入）嘅入口體驗：一入嚟先揀「你係邊類人」，唔同類型見到唔同版面。
   ・ 六類入口：家長訪客／旅團領袖／優異旅團／獎項得主／嘉賓／制服團體・NGO
     ——各有專屬內容組合（基本盤・報名・須知・程序・攤位・交通・求助・捐贈），
     生產版每類受眾一條專屬連結／QR（?pub=troop 等），開門即見自己版本。
   ・ 卡片只喺 eventData.public_channel_2027 存在時顯示（requiresData，只有 mock_demo 有）
     → 2026（凍結）／2027（範本）完全不受影響。
   ・ 數據由 tools/build_pc2027_demo.js 產生（攤位／旅團／優異旅團直接抽自 isd_2026.json）。
   ・ 委員預覽：入口頁底部「一頁睇晒」＝舊版 8 個分頁（含手冊）全部開放。
   回歸測試：tests/pc2027_public_channel_test.js */
Object.assign(ScoutEventApp.prototype,{
  pcDemoMode:'pick',        // pick=身份入口選擇 | audience=某受眾專屬版面 | tabs=委員一頁睇晒
  pcDemoAudience:'',        // 當前受眾 id（visitor/troop/merit/awardee/guest/ug）
  pcDemoTab:'home', pcDemoZone:'all', pcDemoGuideKey:'',
  _pcPubChecked:false,

  pcDemoData(){ return (this.eventData && this.eventData.public_channel_2027) || null; },
  pcDemoAudienceDef(id){ const d=this.pcDemoData(); return (d && (d.audiences||[]).find(a=>a.id===id)) || null; },

  /* ?pub=xxx 深連結：生產版每類受眾專屬入口（示範版模擬同一機制） */
  pcDemoUrlAudience(){
    if(this._pcPubChecked) return null;
    this._pcPubChecked=true;
    try{
      if(typeof location!=='undefined' && location.search){
        const p=new URLSearchParams(location.search).get('pub');
        if(p && this.pcDemoAudienceDef(p)){ this.pcDemoMode='audience'; this.pcDemoAudience=p; return p; }
      }
    }catch(e){}
    return null;
  },

  openPublicChannelTab(t){ this.pcDemoMode='tabs'; this.pcDemoTab=t; this.renderPublicChannelDemo(); },
  pcDemoOpenTabs(){ this.pcDemoMode='tabs'; this.pcDemoTab='home'; this.renderPublicChannelDemo(); },
  pcDemoPickAudience(id){ this.pcDemoMode='audience'; this.pcDemoAudience=id; this.renderPublicChannelDemo(); },
  pcDemoBackToPick(){ this.pcDemoMode='pick'; this.pcDemoAudience=''; this.renderPublicChannelDemo(); },
  pcDemoSetZone(z){ this.pcDemoZone=z; this.renderPublicChannelDemo(); },
  pcDemoSetGuide(g){ this.pcDemoGuideKey=g; this.renderPublicChannelDemo(); },

  renderPublicChannelDemo(){
    const container=document.getElementById('module-content');
    const d=this.pcDemoData();
    if(!d){ container.innerHTML='<p class="text-sm text-slate-400">此活動未有公眾頻道示範資料</p>'; return; }
    if(!this.pcDemoGuideKey){ const g=Object.keys(d.guides||{})[0]; if(g) this.pcDemoGuideKey=g; }
    if(this.pcDemoMode==='pick') this.pcDemoUrlAudience();
    const aud=this.pcDemoAudienceDef(this.pcDemoAudience);
    let body;
    if(this.pcDemoMode==='tabs'){ body=this.pcDemoTabsBody(d); }
    else if(this.pcDemoMode==='audience' && aud){ body=this.pcDemoAudienceBody(d,aud); }
    else { body=this.pcDemoPickerBody(d); }
    container.innerHTML=`
      <div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-[11.5px] leading-relaxed mb-3">
        <b>🧪 階段 1 成品示範</b> — 公眾（非工作人員）嘅分眾入口：唔同類型訪客見到唔同版面；生產版每類入口有專屬連結／QR（?pub=xxx）。數據＝2026 真實資料（docs/2027_FIELD_CONTRACT.md）。
      </div>
      ${body}`;
  },

  /* ═══════════ 入口選擇頁 ═══════════ */
  pcDemoPickerBody(d){
    const auds=d.audiences||[];
    const labels=d.section_labels||{};
    return `
      <div class="text-center py-3">
        <div class="text-[13px] font-bold text-slate-500">歡迎嚟到</div>
        <div class="text-xl font-black text-indigo-800">2027 港島童軍繽紛日</div>
        <div class="text-[13px] font-bold text-indigo-700 mt-2">你係邊類人？揀你嘅入口 👇</div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        ${auds.map(a=>`
        <div class="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col" style="border-top:4px solid #6d28d9">
          <div class="text-2xl mb-1">${a.icon}</div>
          <b class="text-[13.5px] leading-tight">${escapeHtml(a.name)}</b>
          <div class="text-[11px] text-slate-500 mt-1 leading-relaxed">${escapeHtml(a.desc)}</div>
          <div class="flex flex-wrap gap-1 mt-2">
            ${(a.sections||[]).map(s=>`<span class="text-[9.5px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-1.5 py-0.5">${escapeHtml(labels[s]||s)}</span>`).join('')}
          </div>
          <button onclick="app.pcDemoPickAudience('${escapeHtml(a.id)}')" class="mt-3 bg-sky-600 text-white text-[12px] font-bold rounded-lg py-2">進入 →</button>
          <div class="text-[9.5px] text-slate-400 mt-1.5 text-center">🔗 專屬入口：?pub=${escapeHtml(a.id)}</div>
        </div>`).join('')}
      </div>
      <div class="text-center mt-4">
        <button onclick="app.pcDemoOpenTabs()" class="text-[11.5px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-4 py-2">📊 委員預覽：一頁睇晒全部內容（8 個分頁）</button>
      </div>`;
  },

  /* ═══════════ 受眾專屬版面 ═══════════ */
  pcDemoAudienceBody(d,aud){
    const labels=d.section_labels||{};
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-1">
        <div class="flex items-center gap-3">
          <div class="text-3xl">${aud.icon}</div>
          <div class="min-w-0">
            <div class="text-[10.5px] font-bold text-slate-400">你的入口・${escapeHtml(aud.name)}</div>
            <div class="text-[15px] font-black text-indigo-800 leading-tight">2027 港島童軍繽紛日</div>
            <div class="text-[11.5px] text-slate-500">${escapeHtml(aud.desc)}</div>
          </div>
          <button onclick="app.pcDemoBackToPick()" class="ml-auto shrink-0 bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-lg px-3 py-2">切換身份</button>
        </div>
      </div>
      ${(aud.sections||[]).map((s,i)=>`
        <div class="flex items-center gap-2 font-black text-[14.5px] text-slate-800 mt-4 mb-2">
          <span class="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-[12px] flex items-center justify-center shrink-0">${i+1}</span>${escapeHtml(labels[s]||s)}
        </div>
        ${this.pcDemoSectionFor(d,aud,s)}`).join('')}
      <div class="text-center text-[10.5px] text-slate-400 mt-5">生產版：呢個版面有專屬連結／QR（?pub=${escapeHtml(aud.id)}），唔使揀身份直接入</div>`;
  },

  pcDemoSectionFor(d,aud,s){
    switch(s){
      case 'banner': return aud.banner==='guest'?this.pcDemoGuestBannerHTML(d):this.pcDemoHomeHTML(d);
      case 'apply': return this.pcDemoApplyForHTML(d,aud.featured||[]);
      case 'guide': return this.pcDemoGuideForHTML(d,aud.guide||[]);
      case 'program': return this.pcDemoProgramHTML(d);
      case 'booths': return this.pcDemoBoothsHTML(d);
      case 'transport': return this.pcDemoTransportHTML(d);
      case 'help': return this.pcDemoHelpHTML(d);
      case 'donate': return this.pcDemoDonateHTML(d);
      default: return '';
    }
  },

  /* ── 嘉賓版基本盤（唔講名額／費用，講接待安排） ── */
  pcDemoGuestBannerHTML(d){
    const g=(d.banner_guest||{});
    return `
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div class="hero-gradient text-white p-4">
          <div class="text-[15px] font-black">${escapeHtml(g.title||'嘉賓專屬安排')}</div>
          <div class="text-[11px] mt-0.5" style="color:#ddd6fe">香港黃竹坑海洋公園道18號 香港警察學院・2027年10月3日（星期日）</div>
        </div>
        <div class="p-2">
          ${(g.rows||[]).map(r=>`<div class="flex gap-2.5 px-2 py-2.5 border-t border-slate-100 text-[13px]" style="border-top:none"><div class="w-16 shrink-0 font-bold text-slate-500 text-[12px]">${escapeHtml(r[0])}</div><div>${escapeHtml(r[1])}</div></div>`).join('')}
        </div>
      </div>`;
  },

  /* ── 報名：該受眾嘅表特大，其他收埋 ── */
  pcDemoApplyForHTML(d,featured){
    const forms=d.apply_forms||[];
    const big=forms.filter(f=>featured.includes(f.name));
    const rest=forms.filter(f=>!featured.includes(f.name));
    return `
      ${big.map(f=>`
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-2" style="border-left:4px solid #6d28d9">
        <div class="flex items-center gap-3">
          <div class="text-2xl">${f.icon}</div>
          <div class="min-w-0">
            <b class="text-[14px]">${escapeHtml(f.name)}</b>
            <div class="text-[11.5px] text-slate-500">${escapeHtml(f.target)}｜${escapeHtml(f.desc)}</div>
          </div>
        </div>
        <button onclick="showToast('示範版：報名表將於階段 2 接入 — 提交即入系統、自動出名單','warning')" class="mt-3 w-full bg-sky-600 text-white text-[13px] font-bold rounded-xl py-2.5">立即報名 →</button>
        <div class="text-[10.5px] text-slate-400 mt-1.5 text-center">免登入・提交即有申請編號可查進度</div>
      </div>`).join('')}
      ${rest.length?`
      <details class="bg-white border border-slate-200 rounded-2xl p-3">
        <summary class="font-bold text-[12px] text-slate-500 cursor-pointer">其他參與方式（${rest.length} 個）</summary>
        <div class="grid grid-cols-2 gap-2 mt-2">
          ${rest.map(f=>`
          <div class="border border-slate-200 rounded-xl p-2.5">
            <div class="text-lg">${f.icon}</div>
            <b class="text-[11.5px] leading-tight">${escapeHtml(f.name)}</b>
            <div class="text-[10.5px] text-slate-500">${escapeHtml(f.target)}</div>
          </div>`).join('')}
        </div>
      </details>`:''}`;
  },

  /* ── 須知：該受眾身份嘅版本（唔使再揀 tab） ── */
  pcDemoGuideForHTML(d,keys){
    const guides=d.guides||{};
    return keys.filter(k=>guides[k]).map(k=>`
      <div class="bg-white border border-slate-200 rounded-2xl p-4 ${keys.length>1?'mb-2':''}">
        <div class="font-black text-[14px] text-indigo-800 mb-2">👤 ${escapeHtml(k)}・須知</div>
        ${(guides[k]||[]).map(r=>`<div class="flex gap-2.5 py-2 border-t border-slate-100 text-[13px]"><div class="w-24 shrink-0 font-bold text-slate-500 text-[12px]">${escapeHtml(r[0])}</div><div>${escapeHtml(r[1])}</div></div>`).join('')}
      </div>`).join('')+
      `<details class="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2">
        <summary class="font-bold text-[12.5px] text-slate-600 cursor-pointer">📖 共用須知（日期・天氣・熱線・同意書）</summary>
        <ul class="mt-2 space-y-1.5 text-[12.5px] text-slate-700 list-disc pl-5">
          ${(d.guide_common||[]).map(c=>`<li><b>${escapeHtml(c[0])}</b>：${escapeHtml(c[1])}</li>`).join('')}
        </ul>
      </details>`;
  },

  /* ── 捐贈（訪客版） ── */
  pcDemoDonateHTML(d){
    const f=(d.apply_forms||[]).find(x=>x.name==='童心捐贈');
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 text-center">
        <div class="text-2xl mb-1">${f?f.icon:'❤️'}</div>
        <b class="text-[13.5px] text-rose-700">童心捐贈大行動</b>
        <p class="text-[12px] text-slate-500 mt-1">物品／食品捐贈・現場掃 QR Code 登記</p>
        <button onclick="showToast('示範版：捐贈表將於階段 2 接入','warning')" class="mt-2.5 bg-rose-600 text-white text-[12px] font-bold rounded-lg px-4 py-2">我要捐贈 ❤</button>
      </div>`;
  },

  /* ═══════════ 委員一頁睇晒（8 分頁，含手冊） ═══════════ */
  pcDemoTabsBody(d){
    const tabs=[['home','基本盤','fa-solid fa-circle-info'],['transport','交通','fa-solid fa-bus'],['program','程序','fa-regular fa-calendar-check'],['booths','攤位','fa-solid fa-store'],['apply','報名','fa-solid fa-file-pen'],['guide','須知','fa-solid fa-book-open'],['help','求助','fa-solid fa-life-ring'],['manual','手冊','fa-solid fa-book']];
    return `
      <div class="flex justify-between items-center mb-2">
        <div class="text-[11.5px] font-bold text-slate-500">📊 委員預覽・一頁睇晒（公眾實際會按身份見到唔同組合，見「切換身份」）</div>
        <button onclick="app.pcDemoBackToPick()" class="shrink-0 bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-lg px-3 py-1.5">返入口選擇</button>
      </div>
      <div class="flex border-b border-slate-200 overflow-x-auto mb-4">
        ${tabs.map(([k,l,i])=>`<button class="nav-tab ${this.pcDemoTab===k?'active':''}" onclick="app.openPublicChannelTab('${k}')"><i class="${i} mr-1"></i>${l}</button>`).join('')}
      </div>
      <div>${this.pcDemoTabSectionHTML(d)}</div>`;
  },

  pcDemoTabSectionHTML(d){
    switch(this.pcDemoTab){
      case 'transport': return this.pcDemoTransportHTML(d);
      case 'program': return this.pcDemoProgramHTML(d);
      case 'booths': return this.pcDemoBoothsHTML(d);
      case 'apply': return this.pcDemoApplyHTML(d);
      case 'guide': return this.pcDemoGuideTabsHTML(d);
      case 'help': return this.pcDemoHelpHTML(d);
      case 'manual': return this.pcDemoManualHTML(d);
      default: return this.pcDemoHomeHTML(d);
    }
  },

  /* ═══════════ 共用分頁渲染 ═══════════ */

  /* 基本盤 */
  pcDemoHomeHTML(d){
    const b=d.banner||{};
    return `
      <div class="rounded-2xl overflow-hidden border border-slate-200">
        <div class="hero-gradient text-white p-5">
          <div class="text-[11px] font-bold rounded-full px-3 py-1 mb-2 inline-block" style="background:rgba(255,255,255,.2)">${escapeHtml(b.tag||'')}</div>
          <h2 class="text-2xl font-black leading-tight">${escapeHtml(b.event_name||'')}</h2>
          <div class="mt-1 text-sm font-semibold" style="color:#ddd6fe">${escapeHtml(b.en_name||'')}</div>
          <div class="mt-4 grid grid-cols-2 gap-2 text-[12.5px]">
            <div class="rounded-xl p-3" style="background:rgba(255,255,255,.15)"><div class="text-[10.5px] font-bold mb-1" style="color:#ddd6fe"><i class="fa-regular fa-calendar"></i> 日期</div><b>${escapeHtml(b.date||'')}</b></div>
            <div class="rounded-xl p-3" style="background:rgba(255,255,255,.15)"><div class="text-[10.5px] font-bold mb-1" style="color:#ddd6fe"><i class="fa-regular fa-clock"></i> 時間</div><b>${escapeHtml(b.time||'')}</b></div>
            <div class="rounded-xl p-3 col-span-2" style="background:rgba(255,255,255,.15)"><div class="text-[10.5px] font-bold mb-1" style="color:#ddd6fe"><i class="fa-solid fa-location-dot"></i> 地點</div><b>${escapeHtml(b.location||'')}</b></div>
          </div>
        </div>
        <div class="p-4 grid grid-cols-2 gap-2 text-center">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3"><div class="text-[10.5px] font-bold text-amber-700">名額（先到先得）</div><div class="text-lg font-black text-amber-900">${escapeHtml(b.quota||'')}</div></div>
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><div class="text-[10.5px] font-bold text-emerald-700">費用（連紀念章）</div><div class="text-lg font-black text-emerald-900">${escapeHtml(b.fee||'')}</div></div>
        </div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mt-3" style="border-left:4px solid #6d28d9">
        <div class="flex items-center justify-between mb-1.5">
          <div class="font-black text-sm text-indigo-800"><i class="fa-solid fa-bullhorn"></i> 最新消息</div>
          <div class="text-[10.5px] text-slate-400">更新：${escapeHtml((b.news&&b.news.updated_at)||'')}・${escapeHtml((b.news&&b.news.updated_by)||'')}</div>
        </div>
        <p class="text-[13px] leading-relaxed">${escapeHtml((b.news&&b.news.text)||'')}</p>
      </div>
      <div class="bg-rose-50 border border-rose-200 rounded-2xl p-4 mt-3" style="border-left:4px solid #ef4444">
        <div class="font-black text-sm text-rose-700 mb-1"><i class="fa-solid fa-triangle-exclamation"></i> 惡劣天氣安排</div>
        <p class="text-[12.5px] leading-relaxed text-rose-900">${escapeHtml(b.weather_rule||'')}</p>
      </div>`;
  },

  /* 交通與入場 */
  pcDemoTransportHTML(d){
    const t=d.transport||{};
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-[13px]">
        ${(t.items||[]).map(x=>`
        <div class="flex gap-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${x.danger?'bg-rose-100 text-rose-700':'bg-indigo-100 text-indigo-700'}"><i class="${escapeHtml(x.icon||'fa-solid fa-circle')}"></i></div>
          <div><b>${escapeHtml(x.title||'')}</b><br><span class="text-slate-500 text-[12px]">${escapeHtml(x.detail||'')}</span></div>
        </div>`).join('')}
        <hr class="border-slate-100">
        <div class="font-black text-indigo-800 text-[12.5px]">📍 報到位置分流</div>
        <div class="grid grid-cols-2 gap-2 text-center text-[12px]">
          ${(t.checkin||[]).map(c=>`<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5"><b>${escapeHtml(c.who)}</b><br>${escapeHtml(c.where)}</div>`).join('')}
        </div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-3 mt-3">
        <div class="font-black text-[13px] mb-2"><i class="fa-solid fa-map-location-dot text-indigo-600"></i> ${escapeHtml(t.map_title||'場地指示圖')}</div>
        ${t.map_url?`<img src="${escapeHtml(t.map_url)}" alt="場地指示圖" class="w-full rounded-xl border border-slate-200">`:''}
        ${t.map_pdf?`<a href="${escapeHtml(t.map_pdf)}" target="_blank" class="mt-2 inline-block text-[12px] font-bold text-indigo-700">📎 下載完整場地指示圖（PDF）↗</a>`:''}
      </div>`;
  },

  /* 當日程序 */
  pcDemoProgramHTML(d){
    const p=d.program||{};
    const nowTime=p.now_time||'';
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4">
        <div class="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1 inline-block font-bold mb-3">
          <span style="width:8px;height:8px;background:#ef4444;border-radius:50%;display:inline-block;animation:pulse 1.5s infinite;margin-right:6px"></span>而家進行緊：${escapeHtml(p.now_label||'')}
        </div>
        <div class="space-y-3">
          ${(p.items||[]).map(x=>{
            const isNow=x.time===nowTime;
            return `<div class="flex gap-3 ${isNow?'rounded-xl bg-indigo-50 border border-indigo-200 p-2.5':''}">
              <div class="font-black text-indigo-700 text-[13px]" style="min-width:52px">${escapeHtml(x.time)}</div>
              <div class="text-[13px] pt-0.5"><b>${escapeHtml(x.title)}</b><br><span class="text-slate-500 text-[12px]">${escapeHtml(x.detail||'')}</span></div>
            </div>`;
          }).join('')}
        </div>
        ${p.note?`<div class="mt-3 text-[11px] text-slate-400">${escapeHtml(p.note)}</div>`:''}
      </div>`;
  },

  /* 攤位與地圖 */
  pcDemoBoothsHTML(d){
    const bd=d.booths||{};
    const list=bd.list||[];
    const zones=[...new Set(list.map(r=>r[0]))];
    const shown=this.pcDemoZone==='all'?list:list.filter(r=>r[0]===this.pcDemoZone);
    const themeChip=(t)=>t?`<span class="ml-auto text-[10px] font-bold rounded-full px-2 py-0.5 border border-indigo-200 bg-indigo-50 text-indigo-700 whitespace-nowrap">${escapeHtml(t)}</span>`:'';
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4">
        <div class="flex flex-wrap gap-1.5 mb-3">
          ${['all',...zones].map(z=>`<button class="px-3 py-1.5 rounded-full text-[12px] font-bold border ${this.pcDemoZone===z?'bg-sky-600 text-white border-sky-500':'bg-white border-slate-200 text-slate-600'}" onclick="app.pcDemoSetZone('${z}')">${z==='all'?'全部 '+list.length:z+' 區'}</button>`).join('')}
        </div>
        <div class="grid grid-cols-2 gap-2 text-center text-[12px] mb-3">
          ${(bd.stats||[]).map(s=>`<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-2"><b class="text-indigo-800">${escapeHtml(s[0])}</b><br><span class="text-slate-600">${escapeHtml(s[1])}</span></div>`).join('')}
        </div>
        <div class="space-y-2">
          ${shown.map(b=>`
          <div class="border border-slate-200 rounded-xl p-2.5">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="text-white font-black text-[11px] rounded-lg px-2 py-1" style="background:#6d28d9">${escapeHtml(b[1])}</span>
              <b class="text-[13px]">${escapeHtml(b[4]||b[3])}</b>
              ${themeChip(b[2])}
            </div>
            <div class="text-[11.5px] text-slate-500">${escapeHtml(b[3])}${b[5]?'｜'+escapeHtml(b[5]):''}</div>
          </div>`).join('')}
        </div>
        ${bd.note?`<div class="mt-2 text-[11px] text-slate-400">${escapeHtml(bd.note)}</div>`:''}
        <div class="mt-3 flex gap-2 text-[12px]">
          ${bd.game_card?`<a href="${escapeHtml(bd.game_card)}" target="_blank" class="flex-1 text-center bg-amber-100 border border-amber-300 text-amber-900 rounded-xl py-2 font-bold">🎮 遊戲卡</a>`:''}
          ${bd.site_plan?`<a href="${escapeHtml(bd.site_plan)}" target="_blank" class="flex-1 text-center bg-indigo-100 border border-indigo-400 text-indigo-900 rounded-xl py-2 font-bold">🗺️ 場地佈置圖</a>`:''}
        </div>
      </div>`;
  },

  /* 八大報名（一頁睇晒版） */
  pcDemoApplyHTML(d){
    return `
      <div class="text-[12px] text-slate-500 mb-2 px-1">${escapeHtml(d.apply_note||'')}</div>
      <div class="grid grid-cols-2 gap-2">
        ${(d.apply_forms||[]).map(f=>`
        <div class="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col">
          <div class="text-xl mb-1">${f.icon}</div>
          <b class="text-[12.5px] leading-tight">${escapeHtml(f.name)}</b>
          <div class="text-[11px] text-slate-500 mt-0.5">${escapeHtml(f.target)}<br>${escapeHtml(f.desc)}</div>
          <button onclick="showToast('示範版：報名表將於階段 2 接入 — 提交即入系統、自動出名單','warning')" class="mt-2.5 bg-sky-600 text-white text-[11.5px] font-bold rounded-lg py-1.5">立即報名 →</button>
        </div>`).join('')}
      </div>`;
  },

  /* 須知分眾 tabs（一頁睇晒版） */
  pcDemoGuideTabsHTML(d){
    const keys=Object.keys(d.guides||{});
    const shortLabels={'嘉賓':'嘉賓','普通旅團':'旅團','優異旅團':'優異旅團','步操隊伍':'步操','其他制服團體':'制服團體','支部最高獎勵得主':'支部獎勵','成人獎勵得主':'成人獎勵'};
    const rows=(d.guides||{})[this.pcDemoGuideKey]||[];
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4">
        <div class="grid grid-cols-4 gap-1.5 mb-4">
          ${keys.map(k=>`<button class="py-2 text-[12px] font-bold border rounded-lg ${this.pcDemoGuideKey===k?'bg-sky-600 text-white border-sky-500':'bg-white text-slate-600 border-slate-200'}" onclick="app.pcDemoSetGuide('${escapeHtml(k)}')">${escapeHtml(shortLabels[k]||k)}</button>`).join('')}
        </div>
        <div class="font-black text-[15px] text-indigo-800 mb-2.5">👤 ${escapeHtml(this.pcDemoGuideKey)}・須知</div>
        ${rows.map(r=>`<div class="flex gap-2.5 py-2 border-t border-slate-100 text-[13px]"><div class="w-24 shrink-0 font-bold text-slate-500 text-[12px]">${escapeHtml(r[0])}</div><div>${escapeHtml(r[1])}</div></div>`).join('')}
        <details class="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <summary class="font-bold text-[12.5px] text-slate-600 cursor-pointer">📖 共用須知（各身份通用）</summary>
          <ul class="mt-2 space-y-1.5 text-[12.5px] text-slate-700 list-disc pl-5">
            ${(d.guide_common||[]).map(c=>`<li><b>${escapeHtml(c[0])}</b>：${escapeHtml(c[1])}</li>`).join('')}
          </ul>
        </details>
      </div>`;
  },

  /* 活動日求助 */
  pcDemoHelpHTML(d){
    const h=d.help||{};
    const cards=[['🔍','失物認領',h.lost_found],['☎️','查詢窗口',h.hotline],['⛑️','急救站',h.first_aid]];
    return `
      <div class="grid grid-cols-3 gap-2 text-center">
        ${cards.map(c=>`
        <div class="bg-white border border-slate-200 rounded-2xl p-3">
          <div class="text-xl mb-1">${c[0]}</div>
          <b class="text-[12px]">${escapeHtml(c[1])}</b>
          <div class="text-[11px] text-slate-500 mt-1 leading-relaxed">${escapeHtml(c[2]||'')}</div>
        </div>`).join('')}
      </div>`;
  },

  /* 執行手冊（一頁睇晒版） */
  pcDemoManualHTML(d){
    const m=d.manual||{};
    const pt=m.participants||{};
    const rows=pt.rows||[];
    const merit=m.merit||{};
    const byArea=merit.byArea||{};
    const th='style="background:#f5f3ff;color:#4c1d95;text-align:left;padding:7px 6px;font-size:11.5px;white-space:nowrap"';
    const thRight='style="background:#f5f3ff;color:#4c1d95;text-align:right;padding:7px 6px;font-size:11.5px;white-space:nowrap"';
    const td='style="padding:6px 6px;border-top:1px solid #f1f5f9;vertical-align:top"';
    const meritTotalCount=Object.values(byArea).reduce((a,arr)=>a+arr.length,0);
    return `
      <div class="text-[12px] text-slate-500 px-1 mb-2">15 個分頁・自動由資料渲染（下面示範其中兩頁）：</div>
      <div class="bg-white border border-slate-200 rounded-2xl p-3 mb-3">
        <div class="flex flex-wrap gap-1.5">
          ${(m.tabs||[]).map((t,i)=>`<span class="text-[11px] font-bold rounded-full px-2.5 py-1 border ${i===5||i===9?'bg-sky-600 text-white border-sky-500':'bg-white border-slate-200 text-slate-600'}">${escapeHtml(t[0])} <span style="opacity:.7">·${escapeHtml(t[1])}</span></span>`).join('')}
        </div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4">
        <div class="font-black text-[14px] text-emerald-700 mb-1">🧾 參加旅團名單 <span class="text-[10.5px] font-bold text-slate-400">${escapeHtml(pt.note||'')}</span></div>
        <div class="grid grid-cols-3 gap-2 text-center my-3 text-[12px]">
          ${(pt.stats||[]).map(s=>`<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2"><b class="text-emerald-800">${escapeHtml(s)}</b></div>`).join('')}
        </div>
        <div class="overflow-auto max-h-[280px] rounded-xl border border-slate-200">
          <table class="w-full" style="border-collapse:collapse;font-size:12px">
            <thead><tr>${(pt.cols||[]).map((c,i)=>`<th ${(i===3||i===4)?thRight:th}>${escapeHtml(c)}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map(r=>`
              <tr>
                <td ${td} class="text-slate-400">${escapeHtml(String(r[0]))}</td>
                <td ${td}><b>${escapeHtml(r[1])}</b></td>
                <td ${td} class="text-[11.5px] text-slate-500">${escapeHtml(r[2])}</td>
                <td ${td} style="text-align:right;font-weight:700">${escapeHtml(String(r[3]))}</td>
                <td ${td} style="text-align:right;${r[4]?'color:#e11d48;font-weight:700':'color:#cbd5e1'}">${r[4]?escapeHtml(String(r[4])):'–'}</td>
                <td ${td} class="text-[11.5px]">${escapeHtml(r[5])}</td>
              </tr>`).join('')}
              <tr style="background:#f5f3ff;font-weight:900">
                <td ${td}></td>
                <td ${td}>合共 ${rows.length} 團</td>
                <td ${td}></td>
                <td ${td} style="text-align:right">${escapeHtml(String(rows.reduce((a,r)=>a+(+r[3]||0),0)))}</td>
                <td ${td} style="text-align:right;color:#e11d48">${escapeHtml(String(rows.reduce((a,r)=>a+(+r[4]||0),0)))}</td>
                <td ${td}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mt-3">
        <div class="font-black text-[14px] text-indigo-700 mb-1">🏆 優異旅團獲獎名單 <span class="text-[10.5px] font-bold text-slate-400">（示範・2026 資料・${escapeHtml(String(merit.total||meritTotalCount))} 團次）</span></div>
        <div class="space-y-2">
          ${Object.entries(byArea).map(([area,arr])=>`
          <details class="border border-indigo-200 rounded-xl overflow-hidden">
            <summary class="bg-indigo-50 px-3 py-2 cursor-pointer flex justify-between items-center"><b class="text-[13px] text-indigo-800">${escapeHtml(area)}</b><span class="text-[11px] font-bold text-indigo-600">${arr.length} 團次 ▾</span></summary>
            <div class="p-2.5 flex flex-wrap gap-1.5">
              ${arr.map(u=>`<span class="text-[12px] rounded-lg px-2 py-1" style="background:#f5f3ff;border:1px solid #ddd6fe;color:#4c1d95">🏆 ${escapeHtml(u)}</span>`).join('')}
            </div>
          </details>`).join('')}
        </div>
      </div>`;
  },
});
