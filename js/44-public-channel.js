/* 44-public-channel.js — 公眾頻道 2027 形態示範（階段 1・2026-10-04）
   ═══════════════════════════════════════════════════════════════════════════
   公眾（非工作人員・免登入）嘅入口體驗：一入嚟先揀「你係邊類人」，唔同類型見到唔同版面。
   ・ 七類入口（須知分眾七類）：嘉賓／旅團／優異旅團獲獎／步操隊伍／其他制服團體／支部最高獎勵／成人獎勵
     ——每類各有自己嘅時間表（schedules）＋報到地點／路線／地圖重點（arrivals），手機直排優先、電話可撳打。
     生產版每類受眾一條專屬連結／QR（?pub=troop 等），開門即見自己版本。
   ・ 卡片只喺 eventData.public_channel_2027 存在時顯示（requiresData，只有 mock_demo 有）
     → 2026（凍結）／2027（範本）完全不受影響。
   ・ 數據由 tools/build_pc2027_demo.js 產生（攤位／旅團／優異旅團直接抽自 isd_2026.json）。
   ・ 公眾 landing（mock_demo・未登入）：一進APP＝公眾頻道（applyDashboardMode 分流）；工作人員入口收埋喺頁尾
     —— 工作人員打 4 位密碼（staff_gate.pin）、籌委用帳號密碼（一個登入口分流）。
   ・ 報到 QR：只有旅團（團體單位）有 token（T001–T031）；個人／隊伍＝工作人員按名單點名（checkin_note）。
   ・ 場地示意圖（venue_map 數據驅動）：每類人嘅路線＋報到點📍直接標喺圖上——生產版由籌委提供源點，為不同人士製作幾張唔同嘅圖。
     （minLevel 20・requiresData 同樣 gated）掃描／輸入即見旅團・人數・餐盒，一撳確認報到。
   ・ 委員預覽：入口頁底部「一頁睇晒」＝舊版全部分頁（含手冊）全部開放。
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
        if(p && this.pcDemoAudienceDef(p)) return p;
      }
    }catch(e){}
    return null;
  },

  openPublicChannelTab(t){ this.pcDemoMode='tabs'; this.pcDemoTab=t; this.renderPublicChannelDemo(); },
  pcDemoOpenTabs(){ this.pcDemoMode='tabs'; this.pcDemoTab='home'; this.renderPublicChannelDemo(); },
  pcDemoPickAudience(id){ this.pcDemoMode='audience'; this.pcDemoAudience=id; this.pcAudTab=''; this.renderPublicChannelDemo(); },
  pcDemoBackToPick(){ this.pcDemoMode='pick'; this.pcDemoAudience=''; this.pcAudTab=''; this.renderPublicChannelDemo(); },
  pcDemoSetZone(z){ this.pcDemoZone=z; this.renderPublicChannelDemo(); },
  pcDemoSetGuide(g){ this.pcDemoGuideKey=g; this.renderPublicChannelDemo(); },

  renderPublicChannelDemo(){
    const container=document.getElementById('module-content');
    const d=this.pcDemoData();
    if(!d){ container.innerHTML='<p class="text-sm text-slate-400">此活動未有公眾頻道示範資料</p>'; return; }
    if(!this.pcDemoGuideKey){ const g=Object.keys(d.guides||{})[0]; if(g) this.pcDemoGuideKey=g; }
    if(this.pcDemoMode==='pick'){ const u=this.pcDemoUrlAudience(); if(u){ this.pcDemoMode='audience'; this.pcDemoAudience=u; } }
    const aud=this.pcDemoAudienceDef(this.pcDemoAudience);
    let body;
    if(this.pcDemoMode==='form' && this.pcFormId){ body=this.pcFormBody(d); }
    else if(this.pcDemoMode==='tabs'){ body=this.pcDemoTabsBody(d); }
    else if(this.pcDemoMode==='audience' && aud){ body=this.pcDemoAudienceBody(d,aud); }
    else { body=this.pcDemoPickerBody(d); }
    container.innerHTML=`
      <div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-[11.5px] leading-relaxed mb-3">
        <b>🧪 階段 1 成品示範</b> — 公眾（非工作人員）嘅分眾入口：唔同類型訪客見到唔同版面；生產版每類入口有專屬連結／QR（?pub=xxx）。數據＝2026 真實資料（docs/2027_FIELD_CONTRACT.md）。
      </div>
      ${body}`;
    if(typeof setTimeout==='function') setTimeout(()=>this.pcSyncTabbarOffset(),0);
  },

  /* ═══════════ 入口選擇頁 ═══════════ */
  pcDemoPickerBody(d,pickFn='pcDemoPickAudience',opts={}){
    const auds=d.audiences||[];
    const labels=d.section_labels||{};
    return `
      <div class="text-center py-3">
        <div class="text-[13px] font-bold text-slate-500">歡迎嚟到</div>
        <div class="text-xl font-black text-indigo-800">2027 港島童軍繽紛日</div>
        <div class="text-[13px] font-bold text-indigo-700 mt-2">你係邊類人？揀你嘅入口 👇</div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        ${auds.map(a=>`
        <div class="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col" style="border-top:4px solid #6d28d9">
          <div class="text-2xl mb-1">${a.icon}</div>
          <b class="text-[13.5px] leading-tight">${escapeHtml(a.name)}</b>
          <div class="text-[11px] text-slate-500 mt-1 leading-relaxed">${escapeHtml(a.desc)}</div>
          <div class="flex flex-wrap gap-1 mt-2">
            ${(a.sections||[]).map(s=>`<span class="text-[9.5px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-1.5 py-0.5">${escapeHtml(labels[s]||s)}</span>`).join('')}
          </div>
          <button onclick="app.${pickFn}('${escapeHtml(a.id)}')" class="mt-3 bg-sky-600 text-white text-[12px] font-bold rounded-lg py-2">進入 →</button>
          <div class="text-[9.5px] text-slate-400 mt-1.5 text-center">🔗 專屬入口：?pub=${escapeHtml(a.id)}</div>
        </div>`).join('')}
      </div>
${opts.tabsLink!==false?`      <div class="text-center mt-4">
        <button onclick="app.pcDemoOpenTabs()" class="text-[11.5px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-4 py-2">📊 委員預覽：一頁睇晒全部內容</button>
      </div>`:''}`;
  },

  /* ═══════════ 受眾專屬版面 ═══════════ */
  /* ── 受眾專屬版面（v2・活動日版）：改為「頁簽」——唔再長長一版要不停拖拉 ──
       pcAudTab 記住目前頁簽；切換身份會重設返第一個頁簽。 */
  pcAudTab:'',
  pcSectionIcon(s){
    return ({banner:'fa-solid fa-circle-info',schedule:'fa-regular fa-clock',arrival:'fa-solid fa-location-dot',
      venue:'fa-solid fa-map',ceremony:'fa-solid fa-award',seating:'fa-solid fa-chair',lunch:'fa-solid fa-utensils',
      mess:'fa-solid fa-champagne-glasses',guide:'fa-solid fa-book-open',help:'fa-solid fa-life-ring',
      program:'fa-regular fa-calendar-check',booths:'fa-solid fa-store',transport:'fa-solid fa-bus',donate:'fa-solid fa-heart'})[s]||'fa-solid fa-circle';
  },
  /* 頁簽列黐頂：避開最頂 BAR（高度會因手機分行而變，所以實時量度） */
  pcSyncTabbarOffset(){
    try{
      const bar=document.getElementById('pc-aud-tabs'); if(!bar||!bar.style) return;
      const hd=document.querySelector&&document.querySelector('header');
      bar.style.top=((hd&&hd.offsetHeight)||56)+'px';
    }catch(e){}
  },
  pcRerenderAudience(){
    const land=document.getElementById('public-landing');
    if(land && !land.classList.contains('hidden')) this.renderPublicLanding();
    else this.renderPublicChannelDemo();
  },
  pcSetAudTab(k){
    this.pcAudTab=k;
    this.pcRerenderAudience();
    try{ const el=document.getElementById('pc-aud-tabs'); if(el&&el.scrollIntoView) el.scrollIntoView({block:'start'}); else window.scrollTo(0,0); }catch(e){ }
  },

  pcDemoAudienceBody(d,aud,backFn='pcDemoBackToPick'){
    const labels=d.section_labels||{};
    const secs=(aud.sections||[]);
    if(!secs.includes(this.pcAudTab)) this.pcAudTab=secs[0]||'';
    const cur=this.pcAudTab;
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-2">
        <div class="flex items-center gap-3">
          <div class="text-3xl">${aud.icon}</div>
          <div class="min-w-0">
            <div class="text-[10.5px] font-bold text-slate-400">你的入口・${escapeHtml(aud.name)}</div>
            <div class="text-[15px] font-black text-indigo-800 leading-tight">2027 港島童軍繽紛日</div>
            <div class="text-[11.5px] text-slate-500">${escapeHtml(aud.desc)}</div>
          </div>
          <button onclick="app.${backFn}()" class="ml-auto shrink-0 bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-lg px-3 py-2">切換身份</button>
        </div>
        ${d.notices&&d.notices[aud.id]?`<button onclick="showToast('📄 正式通知書（地域格式）＝秘書出嗰封：掉入 ISD2027/${escapeHtml(d.notices[aud.id])} 就得——原名原檔唔使改名，系統自動攞最新嗰份（示範版）','info')" class="mt-2.5 w-full bg-white border border-indigo-200 text-indigo-700 text-[11.5px] font-bold rounded-lg py-2.5">📄 你的正式通知書（PDF）</button>
        ${(this.pcUploadState&&this.pcUploadState['notices:'+aud.id])?`<div class="mt-1.5 text-[10px] text-emerald-600 font-bold text-center truncate">✓ 最新版本：${escapeHtml(this.pcUploadState['notices:'+aud.id].file)}（${escapeHtml(this.pcUploadState['notices:'+aud.id].at)}・經源頭上傳中心）</div>`:''}`:''}
      </div>
      <div id="pc-aud-tabs" class="pc-tabbar sticky top-0 z-20 -mx-1 px-1 py-2 bg-slate-50/95 backdrop-blur border-b border-slate-200 mb-3">
        <div class="flex gap-1.5 overflow-x-auto no-scrollbar" style="scrollbar-width:none">
          ${secs.map(sx=>`<button onclick="app.pcSetAudTab('${escapeHtml(sx)}')" class="shrink-0 whitespace-nowrap text-[12px] font-bold rounded-full px-3 py-2 border ${cur===sx?'bg-indigo-600 text-white border-indigo-600 shadow-sm':'bg-white text-slate-600 border-slate-200'}"><i class="${this.pcSectionIcon(sx)} mr-1"></i>${escapeHtml(labels[sx]||sx)}</button>`).join('')}
        </div>
      </div>
      <div class="flex items-center gap-2 font-black text-[15px] text-slate-800 mb-2">
        <span class="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] flex items-center justify-center shrink-0"><i class="${this.pcSectionIcon(cur)}"></i></span>${escapeHtml(labels[cur]||cur)}
        <span class="ml-auto text-[10.5px] font-bold text-slate-400">${secs.indexOf(cur)+1} / ${secs.length}</span>
      </div>
      <div id="pc-aud-panel">${this.pcDemoSectionFor(d,aud,cur)}</div>
      ${secs.length>1?`
      <div class="flex gap-2 mt-4">
        ${secs.indexOf(cur)>0?`<button onclick="app.pcSetAudTab('${escapeHtml(secs[secs.indexOf(cur)-1])}')" class="flex-1 bg-white border border-slate-200 text-slate-600 text-[12px] font-bold rounded-xl py-2.5">← ${escapeHtml(labels[secs[secs.indexOf(cur)-1]]||'')}</button>`:''}
        ${secs.indexOf(cur)<secs.length-1?`<button onclick="app.pcSetAudTab('${escapeHtml(secs[secs.indexOf(cur)+1])}')" class="flex-1 bg-indigo-600 text-white text-[12px] font-bold rounded-xl py-2.5">${escapeHtml(labels[secs[secs.indexOf(cur)+1]]||'')} →</button>`:''}
      </div>`:''}
      <div class="text-center text-[10.5px] text-slate-400 mt-5">生產版：呢個版面有專屬連結／QR（?pub=${escapeHtml(aud.id)}），唔使揀身份直接入</div>`;
  },

  pcDemoSectionFor(d,aud,s){
    switch(s){
      case 'banner': return aud.banner==='guest'?this.pcDemoGuestBannerHTML(d):this.pcDemoHomeHTML(d);
      case 'schedule': return this.pcDemoScheduleForHTML(d,aud);
      case 'arrival': return this.pcDemoArrivalHTML(d,aud);
      case 'venue': return this.pcDemoVenueFullHTML(d);
      case 'ceremony': return this.pcDemoCeremonyFlowHTML(d,aud);
      case 'seating': return this.pcDemoSeatingHTML(d);
      case 'lunch': return this.pcDemoLunchHTML(d);
      case 'mess': return this.pcDemoMessCeremonyHTML(d);
      case 'guide': return this.pcDemoGuideForHTML(d,aud.guide||[]);
      case 'program': return this.pcDemoProgramHTML(d);
      case 'booths': return this.pcDemoBoothsHTML(d);
      case 'transport': return this.pcDemoTransportHTML(d);
      case 'help': return this.pcDemoHelpHTML(d);
      case 'donate': return this.pcDemoDonateHTML(d);
      default: return '';
    }
  },

  /* ── 你的時間表（每類各有各嗰條線；手機直排大字） ── */
  pcDemoScheduleForHTML(d,aud){
    const sc=(d.schedules||{})[aud.id]||{items:[]};
    const nowTime=sc.now||'';
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4">
        <div class="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1 inline-block font-bold mb-3">
          <span style="width:8px;height:8px;background:#ef4444;border-radius:50%;display:inline-block;animation:pulse 1.5s infinite;margin-right:6px"></span>而家：${escapeHtml(sc.now_label||'')}
        </div>
        <div class="space-y-3">
          ${(sc.items||[]).map(x=>{
            const isNow=x.time===nowTime;
            return `<div class="flex gap-3 ${isNow?'rounded-xl bg-indigo-50 border border-indigo-200 p-2.5':''}">
              <div class="font-black text-indigo-700 text-[13px]" style="min-width:72px">${escapeHtml(x.time)}</div>
              <div class="text-[13.5px] pt-0.5 min-w-0"><b>${escapeHtml(x.title)}</b><br><span class="text-slate-500 text-[12px]">${escapeHtml(x.detail||'')}</span></div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  /* ── 場地示意圖（示意就好）：每類人嘅路線（虛線＋①②③）＋報到點（📍紅點脈衝）直接標喺圖上
       生產版：籌委提供源點（報到點＋路線節點座標）→ 為不同人士自動產生幾張唔同嘅標註地圖 ── */
  pcDemoVenueMapHTML(d,aud){
    const vm=d.venue_map||{}; const nodes=vm.nodes||[];
    if(!nodes.length) return '';
    const byId={}; nodes.forEach(n=>byId[n.id]=n);
    const ar=(d.arrivals||{})[aud.id]||{};
    const route=(ar.route||[]).map(id=>byId[id]).filter(Boolean);
    const routeIds=new Set((ar.route||[]));
    const pin=byId[ar.pin_at];
    const cx=n=>n.x+n.w/2, cy=n=>n.y+n.h/2;
    const pathD=route.length>1?route.map((n,i)=>(i?'L':'M')+cx(n)+' '+cy(n)).join(' '):'';
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-3 mt-2">
        <div class="font-black text-[13px] mb-2"><i class="fa-solid fa-map-location-dot text-indigo-600"></i> 你要去嘅地方（示意圖）</div>
        <svg viewBox="0 0 380 520" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="380" height="520" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>
          ${pathD?`<path d="${pathD}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-dasharray="7 5" stroke-linecap="round"/>`:''}
          ${nodes.map(n=>{
            const hl=routeIds.has(n.id), isPin=pin&&n.id===pin.id;
            return `<g>
              <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${isPin?'#fee2e2':hl?'#eef2ff':'#ffffff'}" stroke="${isPin?'#ef4444':hl?'#6366f1':'#cbd5e1'}" stroke-width="${isPin?3:(hl?2:1.5)}"/>
              <text x="${cx(n)}" y="${cy(n)-(n.sub?3:0)}" text-anchor="middle" font-size="11" font-weight="700" fill="${isPin?'#b91c1c':(hl?'#3730a3':'#475569')}">${escapeHtml(n.label)}</text>
              ${n.sub?`<text x="${cx(n)}" y="${cy(n)+11}" text-anchor="middle" font-size="8.5" fill="#94a3b8">${escapeHtml(n.sub)}</text>`:''}
            </g>`;
          }).join('')}
          ${route.map((n,i)=>`<circle cx="${n.x+n.w-10}" cy="${n.y+10}" r="9" fill="#6366f1" stroke="#fff" stroke-width="2"/><text x="${n.x+n.w-10}" y="${n.y+13.5}" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">${i+1}</text>`).join('')}
          ${pin?`
          <g id="pc-map-pin">
            <circle cx="${cx(pin)}" cy="${cy(pin)}" r="12" fill="#ef4444" opacity="0.4">
              <animate attributeName="r" values="10;22;10" dur="1.8s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="${cx(pin)}" cy="${cy(pin)}" r="7" fill="#ef4444" stroke="#fff" stroke-width="2.5"/>
            <rect x="${Math.max(Math.min(cx(pin)-64,380-130),4)}" y="${Math.max(pin.y-30,6)}" width="126" height="22" rx="11" fill="#ef4444"/>
            <text x="${Math.max(Math.min(cx(pin),380-67),67)}" y="${Math.max(pin.y-15,21)}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">📍 你喺呢度報到</text>
          </g>`:''}
        </svg>
        <div class="text-[10px] text-slate-400 mt-1.5 leading-relaxed">①②③ 粗框藍線＝你嘅路線；📍＝你嘅報到點。生產版：籌委提供源點（報到點＋路線），為不同人士製作幾張唔同嘅標註地圖。</div>
      </div>`;
  },

  /* ── 報到資訊（v2）：每個參加者有自己嘅地圖——清楚知道去邊報到、路線點走。
       報到 QR 唔會喺呢度顯示（公開頁、唔使登入）：QR 以電郵發俾負責領袖，當日由佢出示作登記。 ── */
  pcDemoArrivalHTML(d,aud){
    const ar=(d.arrivals||{})[aud.id]||{};
    const qr=ar.qr_email||null;
    const rule=d.checkin_qr_rule||{};
    return `
      <div class="bg-white border-2 border-indigo-500 rounded-2xl p-4 text-center">
        <div class="text-[10.5px] font-bold text-indigo-600">📍 你的報到地點</div>
        <div class="text-[17px] font-black text-indigo-900 leading-snug mt-1">${escapeHtml((ar.checkin||[])[1]||'')}</div>
        <div class="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 mt-2 text-[12px] font-bold text-indigo-700"><i class="fa-regular fa-clock"></i>${escapeHtml((ar.checkin||[])[0]||'')}</div>
        ${ar.checkin_note?`<div class="mt-2.5 text-[11.5px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2"><i class="fa-solid fa-clipboard-check text-slate-400 mr-1"></i>${escapeHtml(ar.checkin_note)}</div>`:''}
      </div>
      ${this.pcDemoVenueMapHTML(d,aud)}
      ${(ar.points||[]).length?`
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mt-2">
        <div class="font-black text-[13px] mb-2.5">🚶 你的路線（由入口行到報到點）</div>
        <div class="space-y-0">
          ${(ar.points||[]).map((pt,i,all)=>`
          <div class="flex gap-2.5 text-[13.5px]">
            <div class="flex flex-col items-center shrink-0">
              <span class="w-6 h-6 rounded-full ${i===all.length-1?'bg-rose-500':'bg-indigo-600'} text-white text-[11px] font-black flex items-center justify-center">${i+1}</span>
              ${i<all.length-1?'<span style="width:2px;flex:1;min-height:14px;background:#c7d2fe"></span>':''}
            </div>
            <div class="min-w-0 pb-3 pt-0.5">${escapeHtml(pt)}</div>
          </div>`).join('')}
        </div>
      </div>`:''}
      ${(ar.transport||[]).length?`
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mt-2 space-y-2">
        <div class="font-black text-[13px]">🚍 你的交通提示</div>
        ${(ar.transport||[]).map(x=>`<div class="flex gap-2 text-[12.5px] text-slate-700 leading-relaxed"><i class="fa-solid fa-circle-info text-slate-400 mt-1"></i><span>${escapeHtml(x)}</span></div>`).join('')}
      </div>`:''}
      <div class="bg-white border-2 border-amber-300 rounded-2xl p-4 mt-2">
        <div class="flex items-start gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><i class="fa-solid fa-envelope-circle-check"></i></div>
          <div class="min-w-0">
            <b class="text-[13.5px] text-amber-900">${escapeHtml(rule.headline||'報到 QR Code 已電郵給負責領袖')}</b>
            <div class="text-[11.5px] text-slate-600 leading-relaxed mt-1">${escapeHtml(rule.detail||'')}</div>
          </div>
        </div>
        ${qr?`
        <div class="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div class="text-[10px] font-bold text-slate-400 mb-1.5">📧 已發出的電郵（示範）</div>
          <div class="text-[12px]"><b>收件人：</b>${escapeHtml(qr.to||'')}</div>
          <div class="text-[12px]"><b>主旨：</b>${escapeHtml(qr.subject||'')}</div>
          <div class="text-[12px]"><b>發送時間：</b>${escapeHtml(qr.sent_at||'')}</div>
          ${(qr.shows||[]).length?`<div class="text-[11.5px] text-slate-500 mt-1.5">登記 BOOTH 掃描後會見到：${(qr.shows||[]).map(x=>`<span class="inline-block bg-white border border-slate-200 rounded-full px-2 py-0.5 text-[10.5px] mr-1 mb-1">${escapeHtml(x)}</span>`).join('')}</div>`:''}
        </div>`:''}
        ${(rule.points||[]).length?`
        <ul class="mt-2.5 space-y-1 text-[11.5px] text-slate-600 list-disc pl-5">
          ${(rule.points||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}
        </ul>`:''}
      </div>`;
  },

  /* ── 活動地圖（所有人都要睇到）：全場地圖＋設施位置＋圖例＋官方地圖下載 ── */
  pcDemoVenueFullHTML(d){
    const vm=d.venue_map||{}; const nodes=vm.nodes||[]; const t=d.transport||{};
    const cx=n=>n.x+n.w/2, cy=n=>n.y+n.h/2;
    const accent=id=>({parade:'#ede9fe',booths:'#ecfdf5',east_gate:'#fef3c7',morrison:'#e0f2fe',checkin:'#fff1f2'})[id]||'#ffffff';
    const stroke=id=>({parade:'#8b5cf6',booths:'#10b981',east_gate:'#f59e0b',morrison:'#0ea5e9',checkin:'#f43f5e'})[id]||'#cbd5e1';
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-3">
        <div class="font-black text-[13.5px] mb-1"><i class="fa-solid fa-map text-indigo-600"></i> 全場活動地圖（示意圖）</div>
        <div class="text-[11px] text-slate-500 mb-2">香港警察學院・2027年10月3日（星期日）</div>
        <svg viewBox="0 0 380 520" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="380" height="520" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>
          ${nodes.map(n=>`<g>
            <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${accent(n.id)}" stroke="${stroke(n.id)}" stroke-width="2"/>
            <text x="${cx(n)}" y="${cy(n)-(n.sub?3:0)}" text-anchor="middle" font-size="11" font-weight="700" fill="#334155">${escapeHtml(n.label)}</text>
            ${n.sub?`<text x="${cx(n)}" y="${cy(n)+11}" text-anchor="middle" font-size="8.5" fill="#94a3b8">${escapeHtml(n.sub)}</text>`:''}
          </g>`).join('')}
        </svg>
        ${vm.zones_note?`<div class="text-[11px] text-slate-500 mt-2 leading-relaxed">${escapeHtml(vm.zones_note)}</div>`:''}
      </div>
      ${(vm.facilities||[]).length?`
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mt-2">
        <div class="font-black text-[13px] mb-2.5">🏥 場內設施位置</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          ${(vm.facilities||[]).map(f=>`
          <div class="flex items-start gap-2 border border-slate-100 rounded-xl p-2.5">
            <span class="text-base shrink-0">${f.icon}</span>
            <div class="min-w-0"><b class="text-[12.5px]">${escapeHtml(f.name)}</b><div class="text-[11px] text-slate-500 leading-snug">${escapeHtml(f.where)}</div></div>
          </div>`).join('')}
        </div>
      </div>`:''}
      ${(vm.legend||[]).length?`
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 mt-2">
        <div class="font-bold text-[12px] text-slate-600 mb-1.5">圖例</div>
        ${(vm.legend||[]).map(l=>`<div class="text-[11.5px] text-slate-600 leading-relaxed">${escapeHtml(l[0])}　＝　${escapeHtml(l[1])}</div>`).join('')}
      </div>`:''}
      <div class="bg-white border border-slate-200 rounded-2xl p-3 mt-2">
        <div class="font-black text-[13px] mb-2"><i class="fa-solid fa-map-location-dot text-indigo-600"></i> 官方場地指示圖</div>
        ${t.map_url?`<img src="${escapeHtml(t.map_url)}" alt="場地指示圖" class="w-full rounded-xl border border-slate-200">`:''}
        ${t.map_pdf?`<a href="${escapeHtml(t.map_pdf)}" target="_blank" class="mt-2 inline-block text-[12px] font-bold text-indigo-700">📎 下載完整場地指示圖（PDF）↗</a>`:''}
      </div>`;
  },

  /* ── 典禮儀式流程（所有人）：三部分，可逐部分開合 ── */
  pcDemoCeremonyFlowHTML(d,aud){
    const cf=d.ceremony_flow||{};
    const isGuest=!!(aud&&aud.id==='guest');
    const parts=(cf.parts||[]).filter(p=>!p.guest_only||isGuest);
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4">
        <div class="font-black text-[15px] text-indigo-900">👑 ${escapeHtml(cf.title||'典禮儀式流程')}</div>
        <div class="text-[11.5px] text-slate-500 mt-0.5">${escapeHtml(cf.venue||'')}</div>
        <div class="grid grid-cols-1 gap-1.5 mt-2.5 text-[12px]">
          <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"><b class="text-slate-500">服裝：</b>${escapeHtml(cf.dress||'')}</div>
          ${cf.salute_note?`<div class="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-900"><b>敬禮提示：</b>${escapeHtml(cf.salute_note)}</div>`:''}
        </div>
      </div>
      ${parts.map((p,i)=>`
      <details class="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-2" ${i===0?'open':''}>
        <summary class="cursor-pointer px-4 py-3 flex items-center gap-2.5" style="background:${p.guest_only?'#fff7ed':'#eef2ff'}">
          <span class="text-[10px] font-black rounded-full px-2 py-1 ${p.guest_only?'bg-amber-500':'bg-indigo-600'} text-white shrink-0">${escapeHtml(p.badge||'')}</span>
          <div class="min-w-0 flex-1">
            <b class="text-[13.5px] leading-tight">${escapeHtml(p.name||'')}</b>
            <div class="text-[11px] text-slate-500">${escapeHtml(p.time||'')}｜${escapeHtml(p.place||'')}</div>
          </div>
          <i class="fa-solid fa-chevron-down text-slate-400 text-[11px]"></i>
        </summary>
        <div class="p-3">
          <div class="text-[11.5px] text-slate-500 mb-2">${escapeHtml(p.officiant||'')}${p.mc?'｜'+escapeHtml(p.mc):''}</div>
          ${p.guest_only?'<div class="bg-amber-50 border border-amber-200 text-amber-900 text-[11.5px] rounded-xl px-3 py-2 mb-2">⚠️ 此部分只限獲邀嘉賓出席。</div>':''}
          <div class="space-y-0">
            ${(p.rows||[]).map((r,j,all)=>`
            <div class="flex gap-2.5">
              <div class="flex flex-col items-center shrink-0">
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1.5"></span>
                ${j<all.length-1?'<span style="width:2px;flex:1;background:#e0e7ff"></span>':''}
              </div>
              <div class="pb-3 min-w-0">
                <div class="font-black text-[12.5px] text-indigo-700">${escapeHtml(r.time||'')}</div>
                <div class="text-[13px] leading-snug">${escapeHtml(r.item||'')}</div>
                ${r.who?`<div class="text-[11px] text-slate-500 mt-0.5">${escapeHtml(r.who)}</div>`:''}
              </div>
            </div>`).join('')}
          </div>
        </div>
      </details>`).join('')}
      ${cf.public_note?`<div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 mt-2 text-[11.5px] text-slate-600 leading-relaxed">${escapeHtml(cf.public_note)}</div>`:''}
      ${cf.note?`<div class="text-[10.5px] text-slate-400 mt-2 text-center">${escapeHtml(cf.note)}</div>`:''}`;
  },

  /* ── 嘉賓座位表 ── */
  pcDemoSeatingHTML(d){
    const st=d.seating||{};
    const blocks=st.blocks||[];
    const my=st.my_seat||null;
    const bw=300, bx=40;
    let y=52;
    const rects=blocks.map((b,i)=>{ const h=34+(i<4?4:0); const r={b,x:bx,y,w:bw,h}; y+=h+7; return r; });
    const vh=y+14;
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4">
        <div class="font-black text-[15px] text-indigo-900">🪑 ${escapeHtml(st.title||'座位表')}</div>
        <div class="text-[11.5px] text-slate-500 mt-0.5">${escapeHtml(st.subtitle||'')}</div>
        ${my?`
        <div class="mt-3 bg-rose-50 border-2 border-rose-300 rounded-xl p-3 text-center">
          <div class="text-[10.5px] font-bold text-rose-500">你的座位</div>
          <div class="text-2xl font-black text-rose-700 tracking-wider">${escapeHtml(my.seat||'')}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">${escapeHtml((blocks.find(b=>b.id===my.block)||{}).label||'')}</div>
          ${my.note?`<div class="text-[10px] text-slate-400 mt-1">${escapeHtml(my.note)}</div>`:''}
        </div>`:''}
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-3 mt-2">
        <svg viewBox="0 0 380 ${vh}" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">
          <rect x="${bx}" y="10" width="${bw}" height="30" rx="8" fill="#1e293b"/>
          <text x="${bx+bw/2}" y="29" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">${escapeHtml(st.stage_label||'主禮台')}</text>
          ${rects.map(r=>{
            const mine=my&&my.block===r.b.id;
            return `<g>
              <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="7" fill="${r.b.color||'#64748b'}1a" stroke="${mine?'#e11d48':(r.b.color||'#94a3b8')}" stroke-width="${mine?3:1.6}"/>
              <text x="${r.x+10}" y="${r.y+r.h/2+4}" font-size="11" font-weight="800" fill="${r.b.color||'#475569'}">${escapeHtml(r.b.label)}</text>
              <text x="${r.x+r.w-10}" y="${r.y+r.h/2+4}" text-anchor="end" font-size="9.5" fill="#64748b">${escapeHtml(r.b.seats)}</text>
            </g>`;
          }).join('')}
        </svg>
        <div class="text-[10px] text-slate-400 mt-1 text-center">↑ 面向主禮台方向（示意圖）</div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-3 mt-2">
        <div class="font-black text-[13px] mb-2">分區安排</div>
        ${blocks.map(b=>`
        <div class="border-t border-slate-100 py-2.5 first:border-t-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-white text-[10.5px] font-black rounded-lg px-2 py-0.5" style="background:${b.color||'#64748b'}">${escapeHtml(b.id)}</span>
            <b class="text-[12.5px]">${escapeHtml(b.label)}</b>
            <span class="text-[10.5px] text-slate-400">${escapeHtml(b.rows)}・${escapeHtml(b.seats)}</span>
          </div>
          <div class="text-[11.5px] text-slate-500 mt-1 leading-relaxed">${escapeHtml(b.who)}</div>
        </div>`).join('')}
      </div>
      ${(st.rules||[]).length?`
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 mt-2">
        <div class="font-bold text-[12px] text-slate-600 mb-1.5">就座須知</div>
        <ul class="space-y-1 text-[11.5px] text-slate-600 list-disc pl-5">
          ${(st.rules||[]).map(r=>`<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>`:''}`;
  },

  /* ── 午膳安排（嘉賓） ── */
  pcDemoLunchHTML(d){
    const l=d.lunch||{};
    const hd=l.headline||[];
    return `
      <div class="bg-white border-2 border-emerald-400 rounded-2xl p-4 text-center">
        <div class="text-2xl">🍽️</div>
        <div class="text-[18px] font-black text-emerald-800 mt-1">${escapeHtml(hd[0]||'')}</div>
        <div class="text-[13px] font-bold text-slate-700 mt-0.5">${escapeHtml(hd[1]||'')}</div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-2 mt-2">
        ${(l.rows||[]).map(r=>`
        <div class="flex gap-2.5 px-2 py-2.5 border-t border-slate-100 first:border-t-0 text-[13px]">
          <div class="w-[72px] shrink-0 font-bold text-slate-500 text-[12px]">${escapeHtml(r[0])}</div>
          <div class="min-w-0 leading-relaxed">${escapeHtml(r[1])}</div>
        </div>`).join('')}
      </div>
      ${l.note?`<div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 mt-2 text-[11.5px] leading-relaxed">${escapeHtml(l.note)}</div>`:''}`;
  },

  /* ── 午膳儀式（Officer Mess・只限嘉賓） ── */
  pcDemoMessCeremonyHTML(d){
    const m=d.mess_ceremony||{};
    return `
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div class="p-4" style="background:linear-gradient(135deg,#7c2d12,#b45309);color:#fff">
          <div class="text-[10.5px] font-bold" style="color:#fed7aa">只限嘉賓・第三部分典禮</div>
          <div class="text-[16px] font-black leading-tight mt-0.5">🥂 ${escapeHtml(m.title||'午膳儀式')}</div>
          <div class="text-[11.5px] mt-1" style="color:#fed7aa">${escapeHtml(m.subtitle||'')}</div>
          <div class="inline-block mt-2 rounded-full px-3 py-1 text-[12px] font-bold" style="background:rgba(255,255,255,.2)"><i class="fa-regular fa-clock mr-1"></i>${escapeHtml(m.time||'')}</div>
        </div>
        <div class="p-4 text-[12.5px] text-slate-600 leading-relaxed">${escapeHtml(m.intro||'')}${m.mc?`<div class="text-[11px] text-slate-400 mt-1.5">${escapeHtml(m.mc)}</div>`:''}</div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mt-2">
        <div class="font-black text-[13px] mb-2.5">儀式流程</div>
        <div class="space-y-0">
          ${(m.rows||[]).map((r,i,all)=>`
          <div class="flex gap-2.5">
            <div class="flex flex-col items-center shrink-0">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5"></span>
              ${i<all.length-1?'<span style="width:2px;flex:1;background:#fde68a"></span>':''}
            </div>
            <div class="pb-3 min-w-0">
              <div class="font-black text-[12.5px] text-amber-700">${escapeHtml(r.time||'')}</div>
              <div class="text-[13px] leading-snug">${escapeHtml(r.item||'')}</div>
              ${r.who?`<div class="text-[11px] text-slate-500 mt-0.5">${escapeHtml(r.who)}</div>`:''}
            </div>
          </div>`).join('')}
        </div>
      </div>
      ${(m.recipients||[]).length?`
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mt-2">
        <div class="font-black text-[13px] mb-2">致送名單</div>
        ${(m.recipients||[]).map(r=>`<div class="flex gap-2.5 py-2 border-t border-slate-100 first:border-t-0 text-[12.5px]"><div class="w-[70px] shrink-0 font-bold text-slate-500 text-[11.5px]">${escapeHtml(r[0])}</div><div class="min-w-0">${escapeHtml(r[1])}</div></div>`).join('')}
      </div>`:''}
      ${(m.reminders||[]).length?`
      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-3 mt-2">
        <div class="font-bold text-[12px] text-amber-800 mb-1.5">注意事項</div>
        <ul class="space-y-1 text-[11.5px] text-amber-900 list-disc pl-5">
          ${(m.reminders||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}
        </ul>
      </div>`:''}`;
  },

  /* ── 求助卡：電話號碼變可撥 tel: 連結（手機直接撳打） ── */
  pcTelHTML(text){
    return escapeHtml(text||'').replace(/(\d{4})\s?(\d{4})/g,(m,a,b)=>`<a href="tel:${a}${b}" class="text-sky-700 font-bold underline">${a} ${b}</a>`);
  },

  /* ── QR 產生器（共用）：報到站（工作人員端）及報名回條仍會用到。
       ⚠️ v2：公開頁（分眾入口）唔再顯示報到 QR——QR 以電郵發俾負責領袖，
       由佢當日出示作登記，登記 BOOTH 掃描即見該單位資料（見「報到資訊」頁簽）。 ── */
  pcQrSvg(text){
    try{
      if(typeof qrcode!=='undefined'){
        const qr=qrcode(0,'M'); qr.addData(text); qr.make();
        return qr.createSvgTag({cellSize:5,margin:2}); // 本地 vendor：js/vendor/qrcode.min.js（MIT・Kazuhiko Arase）
      }
    }catch(e){}
    return '<div data-pcqr-fallback style="width:130px;height:130px;border:2px dashed #94a3b8;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#64748b">QR Code</div>';
  },

  /* ═══════════ 嘉賓接待站（工作人員端）：102 位嘉賓・逐位唔同安排・接待報到 ═══════════
     數據＝真實 2026 嘉賓名單（102 位）。2026 病徵：底部手寫合計 97/95，
     實際逐格加＝96/94（人手合計冇人更新）→ 2027 合計實時計。 */
  pcGuestF:{q:'',view:'',cat:''},
  pcGuestArr:{},
  renderGuestReception(){
    const container=document.getElementById('module-content');
    const d=this.pcDemoData();
    if(!d){ container.innerHTML='<p class="text-sm text-slate-400">此活動未有嘉賓接待示範資料</p>'; return; }
    const all=d.guests_rows||[];
    const T={total:all.length,c1:0,c2:0,tea:0,bus:0,present:0,awardee:0};
    all.forEach(g=>{T.c1+=g[4];T.c2+=g[5];T.tea+=g[6];T.bus+=g[7];if(g[8]==='頒獎')T.present++;if(g[8]==='AWARD')T.awardee++;});
    const arr=this.pcGuestArr||{};
    const arrived=Object.keys(arr).length;
    const f=this.pcGuestF||{q:'',view:'',cat:''};
    const cats=[...new Set(all.map(g=>g[1]))];
    const catCount=c=>all.filter(g=>g[1]===c).length;
    const match=g=>{
      if(f.cat&&g[1]!==f.cat) return false;
      if(f.view==='present'&&g[8]!=='頒獎') return false;
      if(f.view==='awardee'&&g[8]!=='AWARD') return false;
      if(f.view==='bus'&&g[7]!==1) return false;
      if(f.view==='tea'&&g[6]!==1) return false;
      if(f.view==='arrived'&&!arr[g[0]]) return false;
      if(f.q){const q=f.q.toLowerCase();const hay=(g[2]+' '+g[3]+' '+g[9]+' '+g[10]).toLowerCase();if(!hay.includes(q)) return false;}
      return true;
    };
    const shown=all.filter(match);
    const chip=(on,label,cls)=>on?`<span class="text-[9px] font-bold rounded-full px-1.5 py-0.5 ${cls}">${label}</span>`:'';
    container.innerHTML=`
      <div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-[11.5px] leading-relaxed mb-3">
        <b>🧪 階段 1 成品示範</b> — 真實 2026 嘉賓名單（102 位）。最麻煩在於<b>逐位唔同</b>：典禮①②／茶聚／大會車各自勾、頒獎定受獎、車牌、備注。2026 檔案底部手寫合計「97/95」，實際逐格加係 <b>96/94</b>——人手合計冇人更新；2027 合計實時計（下面個bar）。生產版：名單由嘉賓報名表／上傳中心餵入，接待組用手機版即場報到。
      </div>
      ${(d.guest_lastmin)?`
      <div class="bg-white border border-rose-200 rounded-2xl p-4 mb-3">
        <div class="font-black text-[13px] mb-2 text-rose-700">⏱️ 2026 實錄：活動當日仲改緊（最後一分鐘變動係常態）</div>
        ${(d.guest_lastmin.events||[]).map(e=>`
        <div class="flex gap-2.5 py-2 border-t border-slate-100 first:border-t-0">
          <span class="shrink-0 text-[11px] font-black text-rose-600 w-9 pt-0.5">${escapeHtml(e.date)}</span>
          <div class="min-w-0">
            <b class="text-[12px]">${escapeHtml(e.label)}</b>
            <div class="text-[10.5px] text-slate-500 leading-relaxed">${escapeHtml(e.detail)}</div>
          </div>
        </div>`).join('')}
        <div class="mt-2 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">💡 ${escapeHtml(d.guest_lastmin.lesson)}</div>
      </div>`:''}
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-3">
        <div class="grid grid-cols-4 gap-2 text-center">
          <div class="bg-slate-50 rounded-xl py-2"><div class="text-[10px] text-slate-400">嘉賓總數</div><div class="text-lg font-black">${T.total}</div></div>
          <div class="bg-slate-50 rounded-xl py-2"><div class="text-[10px] text-slate-400">典禮①出席</div><div class="text-lg font-black">${T.c1}</div></div>
          <div class="bg-slate-50 rounded-xl py-2"><div class="text-[10px] text-slate-400">典禮②出席</div><div class="text-lg font-black">${T.c2}</div></div>
          <div class="bg-slate-50 rounded-xl py-2"><div class="text-[10px] text-slate-400">茶聚</div><div class="text-lg font-black">${T.tea}</div></div>
        </div>
        <div class="grid grid-cols-4 gap-2 text-center mt-2">
          <div class="bg-slate-50 rounded-xl py-2"><div class="text-[10px] text-slate-400">🎖頒獎台</div><div class="text-lg font-black">${T.present}</div></div>
          <div class="bg-slate-50 rounded-xl py-2"><div class="text-[10px] text-slate-400">🏆獲獎出席</div><div class="text-lg font-black">${T.awardee}</div></div>
          <div class="bg-slate-50 rounded-xl py-2"><div class="text-[10px] text-slate-400">🚌大會車</div><div class="text-lg font-black">${T.bus}</div></div>
          <div class="bg-emerald-50 rounded-xl py-2 border border-emerald-200"><div class="text-[10px] text-emerald-600">✓ 已到達</div><div class="text-lg font-black text-emerald-600">${arrived}</div></div>
        </div>
        <div class="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-emerald-500" style="width:${T.total?Math.round(arrived/T.total*100):0}%"></div></div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-3 mb-3">
        <input value="${escapeHtml(f.q)}" oninput="app.pcGuestSearch(this.value)" placeholder="🔍 搜尋姓名／職銜／車牌／備注…" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12.5px]">
        <div class="flex flex-wrap gap-1.5 mt-2">
          ${[['','全部'],['present','🎖頒獎台 '+T.present],['awardee','🏆獲獎 '+T.awardee],['bus','🚌大會車 '+T.bus],['tea','🍵茶聚 '+T.tea],['arrived','✓已到達 '+arrived]].map(([v,l])=>`<button onclick="app.pcGuestSetView('${v}')" class="text-[10.5px] font-bold rounded-full px-2.5 py-1 border ${f.view===v?'bg-slate-800 text-white border-slate-800':'bg-white text-slate-600 border-slate-200'}">${l}</button>`).join('')}
        </div>
        <div class="flex flex-wrap gap-1.5 mt-1.5">
          ${[['',...['全部 '+T.total]],...cats.map(c=>[c,c+' '+catCount(c)])].map(([v,l])=>`<button onclick="app.pcGuestSetCat('${escapeHtml(v)}')" class="text-[10.5px] rounded-full px-2.5 py-1 border ${f.cat===v?'bg-amber-500 text-white border-amber-500':'bg-white text-slate-500 border-slate-200'}">${escapeHtml(l)}</button>`).join('')}
        </div>
      </div>
      <div class="text-[10.5px] text-slate-400 mb-2">顯示 ${shown.length}/${T.total} 位</div>
      ${cats.filter(c=>shown.some(g=>g[1]===c)).map(c=>{
        const group=shown.filter(g=>g[1]===c);
        return `
        <div class="bg-white border border-slate-200 rounded-2xl p-3 mb-2">
          <div class="text-[12px] font-black mb-2">${escapeHtml(c)} <span class="text-slate-400 font-bold">${group.length}</span></div>
          ${group.map(g=>{
            const a=arr[g[0]];
            return `
            <div class="flex items-center gap-2 py-2 border-t border-slate-100 first:border-t-0">
              <span class="shrink-0 text-[10px] text-slate-400 font-mono w-7">#${String(g[0]).padStart(2,'0')}</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <b class="text-[12.5px]">${escapeHtml(g[2])}</b>
                  ${a?`<span class="text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full px-1.5 py-0.5">✓ ${escapeHtml(a)}</span>`:''}
                </div>
                <div class="text-[10.5px] text-slate-500 truncate">${escapeHtml(g[3])}</div>
                <div class="flex flex-wrap gap-1 mt-1">
                  ${chip(g[4],'典禮①','bg-indigo-50 text-indigo-700 border border-indigo-200')}
                  ${chip(g[5],'典禮②','bg-indigo-50 text-indigo-700 border border-indigo-200')}
                  ${chip(g[6],'🍵茶聚','bg-teal-50 text-teal-700 border border-teal-200')}
                  ${chip(g[7],'🚌大會車','bg-sky-50 text-sky-700 border border-sky-200')}
                  ${chip(g[8]==='頒獎','🎖頒獎台','bg-amber-100 text-amber-800 border border-amber-300')}
                  ${chip(g[8]==='AWARD','🏆獲獎','bg-violet-50 text-violet-700 border border-violet-200')}
                  ${g[9]?`<span class="text-[9px] font-bold font-mono bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">🚗 ${escapeHtml(g[9])}</span>`:''}
                  ${g[10]?`<span class="text-[9px] bg-rose-50 text-rose-600 border border-rose-200 rounded-full px-1.5 py-0.5" title="${escapeHtml(g[10])}">💬 ${escapeHtml(g[10].length>10?g[10].slice(0,10)+'…':g[10])}</span>`:''}
                </div>
              </div>
              <button onclick="app.pcGuestToggle(${g[0]})" class="shrink-0 text-[10.5px] font-bold rounded-lg px-3 py-2 border ${a?'bg-emerald-500 text-white border-emerald-500':'bg-white text-emerald-700 border-emerald-300'}">${a?'✓ 已到達':'接待報到'}</button>
            </div>`;
          }).join('')}
        </div>`;
      }).join('')}
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[11px] text-slate-500 leading-relaxed">
        💡 嘉賓報到＝接待處職員按名單㩒掣（唔使 QR，按姓名報到即可）｜大會車名單（${T.bus} 位）＋頒獎台次序＋茶聚安排一鍵篩出｜嘉賓入口（?pub=guest）顯示大會車・座位・茶聚安排。
      </div>`;
  },
  pcGuestSearch(q){ this.pcGuestF=this.pcGuestF||{q:'',view:'',cat:''}; this.pcGuestF.q=q; this.renderGuestReception(); },
  pcGuestSetView(v){ this.pcGuestF=this.pcGuestF||{q:'',view:'',cat:''}; this.pcGuestF.view=v; this.renderGuestReception(); },
  pcGuestSetCat(c){ this.pcGuestF=this.pcGuestF||{q:'',view:'',cat:''}; this.pcGuestF.cat=c; this.renderGuestReception(); },
  pcGuestToggle(n){
    const d=this.pcDemoData(); const g=(d&&d.guests_rows||[]).find(x=>x[0]===n); if(!g) return;
    this.pcGuestArr=this.pcGuestArr||{};
    if(this.pcGuestArr[n]){ delete this.pcGuestArr[n]; showToast('↩ 已取消 '+g[2]+' 嘅接待報到','info'); }
    else{ const t=new Date(); this.pcGuestArr[n]=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0'); showToast('✓ '+g[2]+' 已到達（'+this.pcGuestArr[n]+'）——接待處報到','success'); }
    this.renderGuestReception();
  },

  /* ═══════════ 源頭上傳中心（工作人員前端）：7 通知書＋7 地圖上傳入口 ═══════════
     見到自己負責嘅掣 → 揀檔案 → 完成。系統自動存入後端 Drive 指定資料夾＋記錄上傳時間
     （攞最新 100% 可靠）；上傳者永遠唔使入 Drive、唔使搵 folder、唔使改名。 */
  pcUploadState:{},
  pcUploadSlot(group,id){
    const d=this.pcDemoData(); if(!d) return null;
    for(const g of (d.upload_slots||[])){ if(g.group!==group) continue;
      const it=(g.items||[]).find(x=>x.id===id); if(it) return {path:it.path,label:it.label,groupTitle:g.title};
    }
    return null;
  },
  renderUploadCenter(){
    const container=document.getElementById('module-content');
    const d=this.pcDemoData();
    if(!d){ container.innerHTML='<p class="text-sm text-slate-400">此活動未有上傳中心示範資料</p>'; return; }
    const st=this.pcUploadState||{};
    container.innerHTML=`
      <div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-[11.5px] leading-relaxed mb-3">
        <b>🧪 階段 1 成品示範</b> — 每類嘢一個上傳掣：撳掣・揀檔案・完成。檔案自動存入後端 Drive 指定位置（路徑喺每個掣下面），上傳時間由系統記錄——「攞最新」100% 可靠。上傳者唔使入 Drive、唔使搵 folder、唔使改名（原檔名照用）。生產版＝GAS DriveApp 寫入對應資料夾（直入後端）。
      </div>
      ${(d.upload_slots||[]).map(g=>`
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-3">
        <div class="font-black text-[14px] mb-3">${g.group==='notices'?'📄':'🗺️'} ${escapeHtml(g.title)}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${(g.items||[]).map(it=>{
            const rec=st[g.group+':'+it.id];
            return `
            <div class="border ${rec?'border-emerald-300 bg-emerald-50/40':'border-slate-200'} rounded-xl p-3">
              <div class="flex items-center gap-2">
                <b class="text-[12.5px] min-w-0 truncate">${escapeHtml(it.label)}</b>
                ${rec?'<span class="ml-auto shrink-0 text-[9.5px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full px-2 py-0.5">✓ 已上傳</span>':''}
              </div>
              <div class="text-[9.5px] text-slate-400 mt-0.5 truncate">→ Drive：ISD2027/${escapeHtml(it.path)}/</div>
              ${rec?`<div class="text-[10.5px] text-emerald-700 font-bold mt-1.5 truncate">📄 ${escapeHtml(rec.file)}（${escapeHtml(rec.at)}）</div>`:'<div class="text-[10.5px] text-slate-400 mt-1.5">未上傳</div>'}
              <label class="mt-2 block bg-sky-600 text-white text-[11.5px] font-bold rounded-lg py-2 text-center cursor-pointer">📤 上傳檔案<input type="file" class="hidden" accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg" onchange="app.pcUploadFile('${escapeHtml(g.group)}','${escapeHtml(it.id)}',this)"></label>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('')}
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[11px] text-slate-500 leading-relaxed">
        💡 公眾頻道各入口會即時讀取「最新」嗰份：通知書掣顯示最新檔案；場地圖顯示該類專屬版本。上傳後唔使做任何嘢。
      </div>`;
  },
  pcUploadFile(group,id,input){
    const f=input&&input.files&&input.files[0];
    if(!f){ return; }
    const t=new Date();
    const at=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
    this.pcUploadState=this.pcUploadState||{};
    this.pcUploadState[group+':'+id]={file:f.name,at:at,size:f.size};
    const slot=this.pcUploadSlot(group,id);
    showToast('✓ 已上傳「'+f.name+'」→ Drive：ISD2027/'+((slot&&slot.path)||'')+'／（系統自動歸位・記錄時間・攞最新）（示範版）','success');
    this.renderUploadCenter();
    if(input) input.value='';
  },

  /* ═══════════ 八大報名表（階段 2）：免登入・提交即出申請編號・旅團=T 編號 QR 一條血脈 ═══════════ */
  pcFormId:null, pcFormDone:null, pcIntakeSubs:[],
  pcOpenForm(id){ this.pcDemoMode='form'; this.pcFormId=id; this.pcFormDone=null; this.renderPublicChannelDemo(); },
  pcOpenFormByName(name){
    const d=this.pcDemoData(); const f=((d&&d.intake_forms)||[]).find(x=>x.name===name);
    if(!f){ showToast('示範版：此表暫未接入','warning'); return; }
    this.pcOpenForm(f.id);
  },
  pcFormBack(){ this.pcDemoMode='tabs'; this.pcFormId=null; this.pcFormDone=null; this.renderPublicChannelDemo(); },
  pcFormBody(d){
    const f=((d.intake_forms)||[]).find(x=>x.id===this.pcFormId);
    if(!f){ return '<p class="text-sm text-slate-400">找不到表格</p>'; }
    if(this.pcFormDone){
      const no=this.pcFormDone.no; const isTroop=f.id==='troop_registration';
      return `
      <div class="max-w-md mx-auto">
        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
          <div class="text-3xl">✓</div>
          <div class="font-black text-[15px] text-emerald-800 mt-1">已收到「${escapeHtml(f.name)}」</div>
          <div class="mt-3 bg-white border border-emerald-300 rounded-xl py-2.5">
            <div class="text-[10.5px] text-slate-400 font-bold">申請編號</div>
            <div class="text-2xl font-black tracking-wider text-emerald-700">${escapeHtml(no)}</div>
          </div>
          ${isTroop?`
          <div class="mt-4 bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-[11px] font-bold text-slate-500 mb-2">你嘅報到 QR（活動當日出示呢個就得）</div>
            <div class="flex justify-center">${this.pcQrSvg(no)}</div>
            <div class="text-[10.5px] text-slate-400 mt-2">人數・餐盒已自動入名冊；工作人員掃呢個 QR 即見你旅團資料</div>
          </div>`:''}
          <div class="mt-3 text-[10.5px] text-emerald-700 leading-relaxed">公眾用「申請編號＋電話」查進度｜之後改動原地改，冇新版本｜確認後以電郵通知繳費（$10/人・餐盒 $60/份）</div>
        </div>
        <button onclick="app.pcFormBack()" class="mt-3 w-full bg-slate-100 border border-slate-200 text-slate-600 text-[12.5px] font-bold rounded-xl py-2.5">← 返回報名</button>
      </div>`;
    }
    return `
    <div class="max-w-md mx-auto">
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-3" style="border-left:4px solid #6d28d9">
        <div class="flex items-center gap-3">
          <div class="text-2xl">${f.icon}</div>
          <div class="min-w-0">
            <b class="text-[14px]">${escapeHtml(f.name)}</b>
            <div class="text-[11px] text-slate-500">${escapeHtml(f.target||'')}</div>
          </div>
        </div>
      </div>
      <form onsubmit="app.pcFormSubmit(event,'${escapeHtml(f.id)}')" class="bg-white border border-slate-200 rounded-2xl p-4">
        ${(f.fields||[]).map(fl=>{
          const req=fl.required?'<span class="text-rose-500">*</span>':'';
          if(fl.type==='check'){
            return `<label class="flex items-start gap-2.5 py-2 border-t border-slate-100 first:border-t-0 cursor-pointer">
              <input type="checkbox" data-pcf="${escapeHtml(fl.key)}" class="mt-0.5 w-4 h-4" ${fl.required?'required':''}>
              <span class="text-[12.5px] text-slate-700">${escapeHtml(fl.label)} ${req}</span></label>`;
          }
          if(fl.type==='select'){
            return `<div class="py-2 border-t border-slate-100 first:border-t-0">
              <div class="text-[12px] font-bold text-slate-600 mb-1">${escapeHtml(fl.label)} ${req}</div>
              <select data-pcf="${escapeHtml(fl.key)}" ${fl.required?'required':''} class="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-[13px] bg-white">
                <option value="">請選擇…</option>
                ${(fl.options||[]).map(o=>`<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
              </select></div>`;
          }
          return `<div class="py-2 border-t border-slate-100 first:border-t-0">
            <div class="text-[12px] font-bold text-slate-600 mb-1">${escapeHtml(fl.label)} ${req}</div>
            <input type="${fl.type==='number'?'number':'text'}" data-pcf="${escapeHtml(fl.key)}" ${fl.required?'required':''} ${fl.type==='number'?'min="0"':''} class="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-[13px]"></div>`;
        }).join('')}
        <div class="text-[10.5px] text-slate-400 mt-3 leading-relaxed">${escapeHtml(d.intake_note||'')}</div>
        <button type="submit" class="mt-3 w-full bg-sky-600 text-white text-[13.5px] font-bold rounded-xl py-3">提交 → 出申請編號</button>
        <button type="button" onclick="app.pcFormBack()" class="mt-2 w-full bg-slate-100 border border-slate-200 text-slate-500 text-[12px] font-bold rounded-xl py-2">取消</button>
      </form>
    </div>`;
  },
  pcFormSubmit(ev,id){
    ev.preventDefault();
    const d=this.pcDemoData(); const f=((d&&d.intake_forms)||[]).find(x=>x.id===id); if(!f) return;
    const vals={};
    (f.fields||[]).forEach(fl=>{
      const el=document.querySelector('[data-pcf="'+fl.key+'"]');
      if(!el) return;
      vals[fl.key]=fl.type==='check'?el.checked:(fl.type==='number'?(+el.value||0):el.value.trim());
    });
    this.pcSubmitForm(id,vals);
  },
  pcSubmitForm(id,vals){
    const d=this.pcDemoData(); const f=((d&&d.intake_forms)||[]).find(x=>x.id===id); if(!f) return false;
    for(const fl of (f.fields||[])){
      if(!fl.required) continue;
      const v=vals[fl.key];
      const empty=(fl.type==='check')? !v : (v===undefined||String(v).trim()===''||(fl.type==='number'&&!(+v>0)));
      if(empty){ showToast('⚠️ 請填好必填欄位：'+fl.label,'warning'); return false; }
    }
    const subs=this.pcIntakeSubs=this.pcIntakeSubs||[];
    const t=new Date(); const at=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
    let no;
    if(id==='troop_registration'){
      const list=((d.checkin_demo||{}).entries)||[];
      no='T'+String(list.length+1).padStart(3,'0');
      list.push({ token:no, kind:'旅團', name:(vals.troop_no+(vals.group?'・'+vals.group:'')), area:vals.area, headcount:+vals.headcount||0, meal_boxes:+vals.meals||0, note:'領隊：'+vals.leader+(vals.phone?'（'+vals.phone+'）':'') });
    }else{
      no=f.prefix+String(subs.filter(x=>x.prefix===f.prefix).length+1).padStart(3,'0');
    }
    subs.push({ form:id, prefix:f.prefix, no, vals, at });
    this.pcFormDone={ no, form:id };
    showToast('✓ 已提交——申請編號 '+no+(id==='troop_registration'?'（報到 QR・人數・餐盒已自動生成）':''),'success');
    this.renderPublicChannelDemo();
    return true;
  },

  /* ═══════════ 報名總覽（工作人員）：八大表提交集中化＋名額自動着燈 ═══════════ */
  renderIntakeBoard(){
    const container=document.getElementById('module-content');
    const d=this.pcDemoData();
    if(!d){ container.innerHTML='<p class="text-sm text-slate-400">此活動未有報名總覽示範資料</p>'; return; }
    const subs=this.pcIntakeSubs||[];
    const forms=d.intake_forms||[];
    const troopSubs=subs.filter(s=>s.form==='troop_registration');
    const totalPax=troopSubs.reduce((a,s)=>a+(+s.vals.headcount||0),0);
    const totalMeals=troopSubs.reduce((a,s)=>a+(+s.vals.meals||0),0);
    const CAP_PAX=2000, CAP_MEAL=700;
    const bar=(v,cap)=>`<div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-violet-500" style="width:${Math.min(100,Math.round(v/cap*100))}%"></div></div>`;
    container.innerHTML=`
      <div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-[11.5px] leading-relaxed mb-3">
        <b>🧪 階段 2 成品示範</b> — 八大報名表（欄位照 FIELD_CONTRACT）：公眾免登入提交→申請編號→旅團自動生成 T 編號・報到 QR・人數・餐盒（一條血脈）。2026 報名散落 email／WhatsApp／Excel；2027 集中一處、名額自動着燈。生產版＝GAS <code>onIntakeSubmit</code>（Google Forms 觸發）→ <code>Public_2027_Intake</code> Sheet＋自動電郵確認。
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-3">
        <div class="font-black text-[13.5px] mb-3">📊 名額自動着燈（提交即刻計）</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="flex justify-between text-[11.5px] font-bold mb-1"><span>人數（名額 2,000）</span><span>${totalPax} 人</span></div>
            ${bar(totalPax,CAP_PAX)}
          </div>
          <div>
            <div class="flex justify-between text-[11.5px] font-bold mb-1"><span>代訂餐盒（上限 700・$60/份）</span><span>${totalMeals} 份</span></div>
            ${bar(totalMeals,CAP_MEAL)}
          </div>
        </div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-3">
        <div class="font-black text-[13.5px] mb-2">📥 八大報名表提交統計</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${forms.map(f=>{
            const n=subs.filter(s=>s.form===f.id).length;
            return `<div class="border ${n?'border-violet-300 bg-violet-50':'border-slate-200'} rounded-xl p-2.5 text-center">
              <div class="text-lg">${f.icon}</div>
              <div class="text-[10.5px] font-bold text-slate-600 leading-tight mt-0.5">${escapeHtml(f.name)}</div>
              <div class="text-lg font-black ${n?'text-violet-700':'text-slate-300'}">${n}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4">
        <div class="font-black text-[13.5px] mb-2">📋 最新提交（最新在上）</div>
        ${subs.length?subs.slice().reverse().map(s=>{
          const f=forms.find(x=>x.id===s.form)||{};
          const sum=(f.summary||[]).map(k=>s.vals[k]).filter(v=>v!==undefined&&v!=='').join('・');
          return `<div class="flex items-center gap-2.5 py-2 border-t border-slate-100 first:border-t-0">
            <span class="shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700">${escapeHtml(s.no)}</span>
            <div class="min-w-0 flex-1">
              <b class="text-[12.5px]">${escapeHtml(f.name||s.form)}</b>
              <div class="text-[11px] text-slate-500 truncate">${escapeHtml(String(sum||''))}</div>
            </div>
            <span class="shrink-0 text-[10.5px] text-slate-400 font-bold">${escapeHtml(s.at)}</span>
          </div>`;
        }).join(''):'<div class="text-[12px] text-slate-400 text-center py-6">未有提交——去公眾頻道「報名」分頁試下填一張（旅團報名會即時生成 T 編號 QR）</div>'}
      </div>`;
  },

  /* ═══════════ 報到站（工作人員端）：掃描／輸入 token → 即見單位資料 → 確認報到 ═══════════ */
  pcCheckinFound:null, pcCheckinArrivals:[],
  renderCheckinStation(){
    const container=document.getElementById('module-content');
    const d=this.pcDemoData();
    if(!d){ container.innerHTML='<p class="text-sm text-slate-400">此活動未有報到站示範資料</p>'; return; }
    const entries=((d.checkin_demo||{}).entries)||[];
    const arrivals=this.pcCheckinArrivals||[];
    const arrivedSet=new Set(arrivals.map(a=>a.token));
    container.innerHTML=`
      <div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-[11.5px] leading-relaxed mb-3">
        <b>🧪 階段 1 成品示範</b> — 工作人員報到工具：對方喺手機出示報到 QR（公眾頻道「你的報到 QR」）→ 呢度掃描／輸入編號 → 即見旅團・人數・餐盒 → 一撳確認。生產版＝掃描器直接讀 QR，報到紀錄自動寫入執行手冊名冊。
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4">
        <div class="font-black text-[14px] mb-2">📱 掃描／輸入報到編號</div>
        <form onsubmit="app.pcCheckinLookupSubmit(event)" class="flex gap-2">
          <input id="pc-checkin-input" placeholder="掃描 QR 或輸入編號（例：T001）" class="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-[13px]">
          <button type="submit" class="bg-sky-600 text-white text-[12.5px] font-bold rounded-xl px-4">查找</button>
        </form>
        <button onclick="app.pcCheckinSimulate()" class="mt-2 w-full bg-slate-100 border border-slate-200 text-slate-600 text-[12px] font-bold rounded-xl py-2">🎲 模擬掃描（隨機抽一個未報到單位）</button>
      </div>
      <div id="pc-checkin-result" class="mt-3">${this.pcCheckinResultHTML()}</div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mt-3">
        <div class="flex items-center justify-between mb-2">
          <div class="font-black text-[13px]">📋 今日報到紀錄</div>
          <span class="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5">${arrivals.length}/${entries.length} 已報到</span>
        </div>
        ${arrivals.length?arrivals.map(a=>`
          <div class="flex items-center gap-2.5 py-2 border-t border-slate-100 text-[13px]">
            <span class="text-emerald-600 font-black">✓</span>
            <span class="font-bold text-slate-400 text-[11.5px]" style="min-width:46px">${escapeHtml(a.at)}</span>
            <span class="rounded-lg px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600">${escapeHtml(a.token)}</span>
            <span class="font-bold min-w-0 truncate">${escapeHtml(a.name)}</span>
            <span class="ml-auto text-[10.5px] text-slate-400 whitespace-nowrap">${escapeHtml(a.kind)}</span>
          </div>`).join(''):'<div class="text-center text-[12px] text-slate-400 py-4">未有報到紀錄——試撳「模擬掃描」</div>'}
      </div>`;
  },
  pcCheckinLookupSubmit(ev){ ev.preventDefault(); const el=document.getElementById('pc-checkin-input'); this.pcCheckinLookup(el?(el.value||''):''); },
  pcCheckinLookup(v){
    const d=this.pcDemoData(); const entries=((d&&d.checkin_demo||{}).entries)||[];
    const tok=String(v||'').trim().toUpperCase().replace(/^PC2027:/,'');
    this.pcCheckinFound=entries.find(en=>en.token.toUpperCase()===tok)||null;
    if(!this.pcCheckinFound){ showToast('搵唔到編號「'+tok+'」——請對方重新出示 QR','error'); }
    this.renderCheckinStation();
  },
  pcCheckinSimulate(){
    const d=this.pcDemoData(); const entries=((d&&d.checkin_demo||{}).entries)||[];
    const arrived=new Set((this.pcCheckinArrivals||[]).map(a=>a.token));
    const pending=entries.filter(en=>!arrived.has(en.token));
    if(!pending.length){ showToast('全部單位已報到 🎉','success'); return; }
    this.pcCheckinFound=pending[Math.floor(Math.random()*pending.length)];
    this.renderCheckinStation();
  },
  pcCheckinResultHTML(){
    const e=this.pcCheckinFound;
    if(!e) return '<div class="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center text-[12px] text-slate-400">掃描後即顯示單位資料</div>';
    const arrived=(this.pcCheckinArrivals||[]).some(a=>a.token===e.token);
    return `
      <div class="bg-white border-2 ${arrived?'border-emerald-400':'border-sky-500'} rounded-2xl p-4">
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <span class="rounded-lg px-2 py-0.5 text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">${escapeHtml(e.kind)}</span>
          <span class="rounded-lg px-2 py-0.5 text-[10.5px] font-bold bg-slate-100 text-slate-600">${escapeHtml(e.token)}</span>
          ${arrived?'<span class="rounded-lg px-2 py-0.5 text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ 已報到</span>':''}
        </div>
        <div class="font-black text-[17px] text-slate-900 leading-snug">${escapeHtml(e.name)}</div>
        ${e.area&&e.area!=='—'?`<div class="text-[12px] text-slate-500 mt-0.5">${escapeHtml(e.area)}</div>`:''}
        <div class="grid grid-cols-3 gap-2 mt-3 text-center">
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-2"><div class="text-[10px] font-bold text-slate-400">人數</div><b class="text-[16px]">${escapeHtml(String(e.headcount))}</b></div>
          <div class="bg-rose-50 border border-rose-200 rounded-xl p-2"><div class="text-[10px] font-bold text-rose-400">代訂餐盒</div><b class="text-[16px] text-rose-700">${escapeHtml(String(e.meal_boxes))}</b></div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-2"><div class="text-[10px] font-bold text-amber-500">備註</div><div class="text-[10.5px] font-bold text-amber-900 leading-tight mt-1">${escapeHtml((e.note||'—').slice(0,30))}</div></div>
        </div>
        ${arrived
          ? '<div class="mt-3 text-center text-[12px] font-bold text-emerald-600">此單位已於今日報到</div>'
          : `<button onclick="app.pcCheckinConfirm()" class="mt-3 w-full bg-emerald-600 text-white text-[14px] font-black rounded-xl py-3">✓ 確認報到</button>`}
      </div>`;
  },
  pcCheckinConfirm(){
    const e=this.pcCheckinFound; if(!e) return;
    const arr=this.pcCheckinArrivals=this.pcCheckinArrivals||[];
    if(!arr.some(a=>a.token===e.token)){
      const t=new Date();
      const hh=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
      arr.unshift({token:e.token,kind:e.kind,name:e.name,at:hh});
    }
    showToast('✓ 已確認報到：'+e.name+'（'+e.headcount+' 人'+(e.meal_boxes?'・餐盒 '+e.meal_boxes:'')+'）','success');
    this.renderCheckinStation();
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
  /* ═══════════ 童心捐贈大行動（v18）：公眾頻道＝純看版 ═══════════
     定位：呢度淨係「出門前睇清楚帶咩、點交、幾時交」，唔收表、唔寫任何嘢、唔駁後端。
     實際入數：當日喺收集攤位由發展組工作人員用「童心捐贈大行動」模組（js/38-donations.js）逐張輸入。
     所以呢個 function 只係 render，冇 submit、冇 state、冇 localStorage 寫入。 */
  pcDonateDef(d){ return (d||this.pcDemoData()||{}).donate||null; },

  pcDemoDonateHTML(d){
    const dn=this.pcDonateDef(d);
    if(!dn) return '';
    const c=dn.collect||{};
    const list=(arr,ok)=>`<ul class="space-y-1">${(arr||[]).map(x=>`<li class="flex gap-1.5 text-[11.5px] leading-relaxed"><span class="${ok?'text-emerald-600':'text-rose-500'} shrink-0 font-bold">${ok?'✓':'✕'}</span><span class="${ok?'text-slate-600':'text-slate-400'}">${escapeHtml(x)}</span></li>`).join('')}</ul>`;
    return `
      <div class="space-y-3">
        <div class="rounded-2xl p-4 text-white" style="background:linear-gradient(135deg,#e11d48,#be123c)">
          <div class="text-[11px] font-bold" style="opacity:.85">❤ ${escapeHtml(dn.title||'')}</div>
          <div class="text-[18px] font-black mt-0.5">${escapeHtml(dn.tagline||'')}</div>
          <div class="text-[11.5px] mt-1.5 leading-relaxed" style="opacity:.9">${escapeHtml(dn.why||'')}</div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <div class="text-[11.5px] font-bold text-slate-500 mb-2">📍 幾時・邊度交</div>
          <div class="space-y-1.5 text-[12.5px]">
            ${[['日期',c.date],['時間',c.time],['地點',c.place],['邊個可以捐',dn.eligible]]
              .filter(r=>r[1]).map(r=>`<div class="flex gap-2"><span class="text-slate-400 shrink-0" style="min-width:68px">${escapeHtml(r[0])}</span><b class="text-slate-700">${escapeHtml(r[1])}</b></div>`).join('')}
          </div>
        </div>

        ${(dn.steps||[]).length?`
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <div class="text-[11.5px] font-bold text-slate-500 mb-2.5">🧭 點樣交（邊個填・幾時填）</div>
          <div class="space-y-2.5">
            ${dn.steps.map((st,i)=>`
              <div class="flex gap-2.5">
                <span class="shrink-0 w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10.5px] font-extrabold flex items-center justify-center mt-0.5">${i+1}</span>
                <div class="min-w-0">
                  <div class="text-[12.5px] font-bold text-slate-700">${escapeHtml(st.t||'')}</div>
                  <div class="text-[11.5px] text-slate-500 leading-relaxed">${escapeHtml(st.d||'')}</div>
                </div>
              </div>`).join('')}
          </div>
          ${dn.paper&&dn.paper.url?`<a href="${escapeHtml(dn.paper.url)}" target="_blank" rel="noopener" class="mt-3 block text-center bg-rose-600 text-white text-[12.5px] font-bold rounded-xl py-2.5"><i class="fa-solid fa-download mr-1"></i>${escapeHtml(dn.paper.label||'下載捐贈表格')}</a>
          <div class="text-[10.5px] text-slate-400 text-center mt-1.5 leading-relaxed">${escapeHtml(dn.paper.note||'')}</div>`:''}
        </div>`:''}

        <div class="text-[11.5px] font-bold text-slate-500 pt-0.5">🔎 出門前對一對：帶咩先收得</div>
        ${(dn.schemes||[]).map(sc=>`
          <div class="bg-white border border-slate-200 rounded-2xl p-4">
            <div class="flex items-center gap-2 flex-wrap mb-1.5">
              <span class="text-[20px]">${escapeHtml(sc.icon||'')}</span>
              <b class="text-[14px] text-slate-800">${escapeHtml(sc.name||'')}</b>
              <span class="text-[10px] text-slate-400">${escapeHtml(sc.en||'')}</span>
            </div>
            <div class="text-[11.5px] text-slate-500 mb-2.5">受惠機構：<b class="text-slate-700">${escapeHtml(sc.beneficiary||'')}</b>　<span class="text-slate-400">${escapeHtml(sc.beneficiary_note||'')}</span></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><div class="text-[11px] font-bold text-emerald-800 mb-1.5">✓ 收呢啲</div>${list(sc.accept,true)}</div>
              <div class="bg-rose-50 border border-rose-200 rounded-xl p-3"><div class="text-[11px] font-bold text-rose-700 mb-1.5">✕ 唔收呢啲</div>${list(sc.reject,false)}</div>
            </div>
            ${(sc.rules||[]).length?`<div class="mt-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3"><div class="text-[11px] font-bold text-amber-900 mb-1">⚠️ 計唔計得數，睇呢幾點</div>${sc.rules.map(r=>`<div class="text-[11.5px] text-amber-900 leading-relaxed">・${escapeHtml(r)}</div>`).join('')}</div>`:''}
            <div class="mt-2 text-[11px] text-slate-500 leading-relaxed">🏅 ${escapeHtml(sc.badge||'')}${sc.bonus?`；${escapeHtml(sc.bonus.text)}`:''}</div>
            <div class="mt-1.5 text-[10.5px] text-slate-400">查詢：${escapeHtml(sc.enquiry||'')}</div>
          </div>`).join('')}

        ${dn.counter_note?`<div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[11.5px] text-slate-600 leading-relaxed"><b class="text-slate-700">攤位點運作：</b>${escapeHtml(dn.counter_note)}</div>`:''}
        ${dn.note?`<div class="text-[10.5px] text-slate-400 leading-relaxed">${escapeHtml(dn.note)}</div>`:''}
      </div>`;
  },

  /* ═══════════ 委員一頁睇晒（全部分頁，含手冊） ═══════════ */
  pcDemoTabsBody(d){
    const tabs=[['home','基本資訊','fa-solid fa-circle-info'],['program','全日程序','fa-regular fa-calendar-check'],['venue','活動地圖','fa-solid fa-map'],['ceremony','典禮儀式流程','fa-solid fa-award'],['seating','座位表','fa-solid fa-chair'],['lunch','午膳安排','fa-solid fa-utensils'],['mess','午膳儀式','fa-solid fa-champagne-glasses'],['transport','交通','fa-solid fa-bus'],['booths','攤位','fa-solid fa-store'],['guide','須知','fa-solid fa-book-open'],['donate','童心捐贈','fa-solid fa-heart'],['help','求助','fa-solid fa-life-ring'],['manual','手冊','fa-solid fa-book']];
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
      case 'venue': return this.pcDemoVenueFullHTML(d);
      case 'ceremony': return this.pcDemoCeremonyFlowHTML(d,{id:'guest'});
      case 'seating': return this.pcDemoSeatingHTML(d);
      case 'lunch': return this.pcDemoLunchHTML(d);
      case 'mess': return this.pcDemoMessCeremonyHTML(d);
      case 'booths': return this.pcDemoBoothsHTML(d);
      case 'guide': return this.pcDemoGuideTabsHTML(d);
      case 'help': return this.pcDemoHelpHTML(d);
      case 'donate': return this.pcDemoDonateHTML(d);
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

  /* 求助（活動日） */
  pcDemoHelpHTML(d){
    const h=d.help||{};
    const cards=[['🔍','失物認領',h.lost_found],['☎️','查詢窗口',h.hotline],['⛑️','急救站',h.first_aid]];
    return `
      <div class="grid grid-cols-3 gap-2 text-center">
        ${cards.map(c=>`
        <div class="bg-white border border-slate-200 rounded-2xl p-3">
          <div class="text-xl mb-1">${c[0]}</div>
          <b class="text-[12px]">${escapeHtml(c[1])}</b>
          <div class="text-[11px] text-slate-500 mt-1 leading-relaxed">${this.pcTelHTML(c[2])}</div>
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

  /* ═══════════ 公眾頻道 landing（一進APP就是公眾頻道・mock_demo 未登入） ═══════════ */
  pcLandAudience:'',
  pcPinBuf:'',

  pcPublicLandingActive(){ return !!(this.eventData && this.eventData.public_channel_2027 && !this.currentUser); },

  renderPublicLanding(){
    const el=document.getElementById('public-landing'); if(!el) return;
    const d=this.pcDemoData(); if(!d) return;
    // 收起儀表板組件（活動橫幅含會議預告＝內部資訊，公眾唔見）
    ['dash-hero','simple-card-panel','group-management-section'].forEach(id=>{const x=document.getElementById(id); if(x) x.classList.add('hidden');});
    const bn=document.getElementById('bottom-nav'); if(bn) bn.style.display='none';
    if(!this.pcLandAudience){ const u=this.pcDemoUrlAudience(); if(u) this.pcLandAudience=u; }
    const aud=this.pcDemoAudienceDef(this.pcLandAudience);
    const b=d.banner||{};
    el.classList.remove('hidden');
    el.innerHTML=`
      <div class="text-center text-[10.5px] text-slate-400 pt-1">🧪 階段 1 形態示範（模擬示範版）</div>
      ${!aud?`
      <div class="hero-gradient text-white rounded-[20px] p-4 sm:p-5 mt-2 shadow-2xl relative overflow-hidden">
        <div class="absolute right-0 bottom-0 opacity-10 translate-x-6 translate-y-6 text-7xl pointer-events-none"><i class="fa-solid fa-tower-broadcast"></i></div>
        <div class="relative z-10">
          <h2 class="text-2xl font-black leading-tight">${escapeHtml(b.event_name||'')}</h2>
          <div class="mt-1 text-[13px] font-semibold" style="color:#ddd6fe">${escapeHtml(b.en_name||'')}</div>
          <div class="mt-3 flex flex-wrap gap-2 text-[12px]">
            <span class="rounded-xl px-3 py-1.5" style="background:rgba(255,255,255,.15)"><i class="fa-regular fa-calendar mr-1"></i>${escapeHtml(b.date||'')}</span>
            <span class="rounded-xl px-3 py-1.5" style="background:rgba(255,255,255,.15)"><i class="fa-regular fa-clock mr-1"></i>${escapeHtml(b.time||'')}</span>
            <span class="rounded-xl px-3 py-1.5" style="background:rgba(255,255,255,.15)"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(b.location||'')}</span>
          </div>
        </div>
      </div>
      ${b.news&&b.news.text?`
      <div class="bg-white border border-slate-200 rounded-2xl p-3 mt-3 flex items-start gap-2.5">
        <span class="bg-amber-100 text-amber-800 text-[10.5px] font-bold px-2 py-1 rounded-lg shrink-0 mt-0.5"><i class="fa-solid fa-bullhorn mr-0.5"></i>最新</span>
        <div class="text-[12.5px] leading-relaxed text-slate-700">${escapeHtml(b.news.text)}<span class="block text-[10px] text-slate-400 mt-0.5">${escapeHtml(b.news.updated_at||'')}・${escapeHtml(b.news.updated_by||'')}</span></div>
      </div>`:''}
      <div class="mt-5">${this.pcDemoPickerBody(d,'pcLandPick',{tabsLink:false})}</div>`:''}
      ${aud?this.pcDemoAudienceBody(d,aud,'pcLandBack'):''}
      <div class="text-center mt-10 pb-4">
        <button onclick="app.pcStaffGate()" class="text-[10px] text-slate-300 font-bold" style="letter-spacing:.25em;color:#cbd5e1" onmouseover="this.style.color=''#64748b''" onmouseout="this.style.color=''#cbd5e1''">工作人員入口</button>
      </div>`;
    if(typeof setTimeout==='function') setTimeout(()=>this.pcSyncTabbarOffset(),0);
  },

  pcLandPick(id){ this.pcLandAudience=id; this.pcAudTab=''; this.renderPublicLanding(); if(typeof window!=='undefined') window.scrollTo(0,0); },
  pcLandBack(){ this.pcLandAudience=''; this.pcAudTab=''; this.renderPublicLanding(); if(typeof window!=='undefined') window.scrollTo(0,0); },

  /* ═══════════ 工作人員入口（頁尾隱藏入口）：一個入口分流 ═══════════
     ① 普通工作人員＝4 位活動密碼 → 只見「工作人員公開資料」
     ② 籌委／職員＝帳號＋密碼 → 公開資料＋部門中心嗰啲（同 2026 設計一樣）
  */
  pcStaffGateDef(){
    const d=this.pcDemoData(); const sg=(d&&d.staff_gate)||{};
    const lanes=Array.isArray(sg.lanes)&&sg.lanes.length?sg.lanes:[
      {id:'staff',icon:'🦺',name:'普通工作人員',badge:'只需活動密碼',desc:'打一次 4 位活動密碼，即可查看工作人員公開資料。',cta:'打密碼入 →',can:[],cannot:[]},
      {id:'committee',icon:'🎖️',name:'籌委／職員（有帳戶）',badge:'帳號＋密碼',desc:'用管理員開設嘅帳戶登入，額外有部門中心嗰啲。',cta:'帳號密碼登入 →',can:[],cannot:[]}
    ];
    return Object.assign({},sg,{lanes});
  },
  pcStaffLaneDef(id){ return (this.pcStaffGateDef().lanes||[]).find(l=>l.id===id)||null; },

  pcStaffGate(){
    this.pcPinBuf='';
    const m=document.getElementById('modal-staff-gate');
    this.pcGateRender();
    this.pcGateSetMode('choose');
    if(m) m.classList.remove('hidden');
  },

  // 分流畫面（由 data.staff_gate 砌，唔使改 HTML 都改得到文案）
  pcGateRender(){
    const sg=this.pcStaffGateDef();
    const t=document.getElementById('pc-gate-title'); if(t) t.textContent=sg.title||'工作人員入口';
    const rm=document.getElementById('pc-gate-remember'); if(rm) rm.textContent=sg.remember_note||'';
    const pl=document.getElementById('pc-pin-label'); if(pl) pl.textContent=sg.pin_label||'普通工作人員・請輸入 4 位活動密碼';
    const ph=document.getElementById('pc-pin-hint'); if(ph) ph.textContent=sg.pin_hint||'';
    const list=(items,ok)=>!items||!items.length?'':`<ul class="mt-1.5 space-y-0.5">${items.map(x=>`<li class="flex gap-1.5 items-start"><span class="${ok?'text-emerald-600':'text-rose-400'} shrink-0">${ok?'✓':'✕'}</span><span class="${ok?'text-slate-600':'text-slate-400'}">${escapeHtml(x)}</span></li>`).join('')}</ul>`;
    const box=document.getElementById('pc-gate-choose');
    if(box){
      box.innerHTML=`
      ${sg.intro?`<p class="text-[11.5px] text-slate-500 leading-relaxed">${escapeHtml(sg.intro)}</p>`:''}
      ${(sg.lanes||[]).map(l=>`
        <button type="button" onclick="app.pcGatePick('${l.id}')" data-lane="${l.id}" class="w-full text-left border-2 border-slate-200 hover:border-slate-900 rounded-2xl p-3.5 btn-mobile transition">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[18px]">${escapeHtml(l.icon||'')}</span>
            <span class="font-bold text-[13.5px] text-slate-800">${escapeHtml(l.name||'')}</span>
            <span class="bg-slate-900 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full">${escapeHtml(l.badge||'')}</span>
          </div>
          <div class="text-[11px] text-slate-500 leading-relaxed mt-1.5">${escapeHtml(l.desc||'')}</div>
          <div class="text-[10.5px] leading-relaxed mt-2">${list(l.can,true)}${list(l.cannot,false)}</div>
          <div class="text-[11.5px] font-bold text-slate-900 mt-2.5">${escapeHtml(l.cta||'入 →')}</div>
        </button>`).join('')}
      ${sg.account_hint?`<div class="text-[10px] text-slate-400 text-center leading-relaxed">${escapeHtml(sg.account_hint)}</div>`:''}`;
    }
    const scope=document.getElementById('pc-pin-scope');
    const lane=this.pcStaffLaneDef('staff');
    if(scope&&lane){
      scope.innerHTML=`<div class="font-bold text-slate-600 mb-1">入咗之後睇到／睇唔到</div>${list(lane.can,true)}${list(lane.cannot,false)}`;
    }
  },

  pcGateSetMode(mode){
    this.pcGateMode=mode||'choose';
    const c=document.getElementById('pc-gate-choose'); const p=document.getElementById('pc-gate-pin');
    if(c) c.classList.toggle('hidden',this.pcGateMode!=='choose');
    if(p) p.classList.toggle('hidden',this.pcGateMode!=='pin');
    if(this.pcGateMode==='pin'){ this.pcPinBuf=''; this.pcPinRender(); }
  },

  pcGatePick(id){
    if(id==='committee'){ this.pcCommitteeLogin(); return; }
    this.pcGateSetMode('pin');
  },

  pcPinPress(k){
    if(k==='clr'){ this.pcPinBuf=''; }
    else if(k==='del'){ this.pcPinBuf=(this.pcPinBuf||'').slice(0,-1); }
    else if((this.pcPinBuf||'').length<4 && /^[0-9]$/.test(k)){ this.pcPinBuf=(this.pcPinBuf||'')+k; }
    this.pcPinRender();
    if((this.pcPinBuf||'').length===4) setTimeout(()=>this.pcPinCheck(),120);
  },
  pcPinRender(){
    const dots=document.getElementById('pc-pin-dots'); if(!dots) return;
    let html='';
    for(let i=0;i<4;i++){ html+=`<span class="rounded-full" style="width:14px;height:14px;${i<(this.pcPinBuf||'').length?'background:#1e293b':'background:#e2e8f0'}"></span>`; }
    dots.innerHTML=html;
  },
  /* ╔══════════════════════════════════════════════════════════════════╗
     ║ 【唯一要搬去後端嘅位】活動密碼驗證                                  ║
     ║ 而家：前端對 data.staff_gate.pin（示範用，開 DevTools 睇得到）。     ║
     ║ 之後：整個 function 換成叫 GAS 就得，呼叫方唔使改——                 ║
     ║   async pcVerifyStaffPin(pin){                                    ║
     ║     const r=await fetch(this.gasUrl,{method:'POST',               ║
     ║       headers:{'Content-Type':'text/plain'},                      ║
     ║       body:JSON.stringify({action:'verifyStaffPin',               ║
     ║         api_key:this.apiKey, event_id:this.currentEvent?.event_id,║
     ║         pin})});                                                  ║
     ║     const j=await r.json(); return !!(j&&j.success);              ║
     ║   }                                                               ║
     ║ pcPinCheck() 同時食 boolean 同 Promise，所以轉 async 唔使改其他嘢。 ║
     ╚══════════════════════════════════════════════════════════════════╝ */
  pcVerifyStaffPin(pin,sg){
    const def=sg||this.pcStaffGateDef();
    return !!(def.pin && String(pin)===String(def.pin));
  },

  pcPinCheck(){
    const sg=this.pcStaffGateDef();
    const entered=this.pcPinBuf;
    const done=(pass)=>{
      if(pass){ this.pcStaffLogin(sg); }
      else{ showToast('密碼不正確，請重試','error'); this.pcPinBuf=''; this.pcPinRender(); }
    };
    const r=this.pcVerifyStaffPin(entered,sg);
    if(r && typeof r.then==='function') r.then(done,()=>done(false)); else done(r);
  },

  // ① 普通工作人員：密碼過咗 → 受限身份（role=staff，無 mock_admin，staff_pin=true）
  pcStaffLogin(sg){
    const m=document.getElementById('modal-staff-gate'); if(m) m.classList.add('hidden');
    const def=(sg&&sg.pin_user)||{};
    const lane=this.pcStaffLaneDef('staff')||{};
    this.currentUser={
      user_id: def.user_id||'staff_pin',
      name: def.name||'工作人員',
      role: def.role||'staff',
      group_name: def.group_name||'未分組',
      staff_pin: true   // ← 關鍵旗標：只開「工作人員公開資料」，唔開部門中心／工作卡片／批核／管理工具
    };
    try{ localStorage.setItem(LS.currentUser,JSON.stringify(this.currentUser)); }catch(e){}
    this.pcLandAudience=''; this.pcAudTab='';
    if(typeof this.updateUserUI==='function') this.updateUserUI();
    if(typeof this.updateAdminNav==='function') this.updateAdminNav();
    showToast('已以「'+(lane.name||'普通工作人員')+'」身份入咗（只睇工作人員公開資料）','success');
    if(this.currentEvent && typeof this.showDashboard==='function') this.showDashboard();
    if(typeof window!=='undefined'&&window.scrollTo) window.scrollTo(0,0);
  },

  // ② 籌委／職員：帳號＋密碼（沿用 2026 既有登入視窗）
  pcCommitteeLogin(){
    const m=document.getElementById('modal-staff-gate'); if(m) m.classList.add('hidden');
    if(typeof this.openLoginModal==='function') this.openLoginModal();
  },

  // 普通工作人員想升做籌委：由儀表板橫額直接叫出帳密登入
  pcUpgradeToCommittee(){
    if(typeof this.openLoginModal==='function') this.openLoginModal();
    else this.pcStaffGate();
  },

  // 受限身份判斷（俾 10-app-core 用）
  isPinStaff(){ return !!(this.currentUser && this.currentUser.staff_pin); },

  // 儀表板頂部提示條（只喺普通工作人員身份顯示）
  pcPinStaffNoticeHTML(){
    const lane=this.pcStaffLaneDef('staff')||{};
    const cannot=(lane.cannot||[]).slice(0,3).join('、');
    return `<div class="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-4">
      <div class="flex items-start gap-2.5 flex-wrap">
        <span class="text-[16px] leading-none mt-0.5">🦺</span>
        <div class="flex-1 min-w-[180px]">
          <div class="font-bold text-[12.5px] text-amber-900">普通工作人員模式（活動密碼登入）</div>
          <div class="text-[11px] text-amber-800 leading-relaxed mt-0.5">你而家睇到嘅係<b>工作人員公開資料</b>。${cannot?`<br>未開放：${escapeHtml(cannot)}等——需要籌委帳戶。`:''}</div>
        </div>
        <button type="button" onclick="app.pcUpgradeToCommittee()" class="bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl btn-mobile whitespace-nowrap"><i class="fa-solid fa-id-card mr-1"></i>我係籌委・帳號登入</button>
      </div>
    </div>`;
  },
});
