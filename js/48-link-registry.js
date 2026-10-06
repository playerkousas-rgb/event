/* 48-link-registry.js — 連結總表：後台一處更新，全站同步（v22）
   ──────────────────────────────────────────────────────────────────────────
   問題：同一條連結散落好多個位。2026 版實測——
     ・特別通告第12/26號 PDF ── 出現 13 處（通告庫／公告／旅團指南／各支部須知…）
     ・會議 Drive 資料夾     ── 出現 13 處（6 次會議 × 多個欄位）
     ・74 條獨立連結，合共 121 個位置
   換一次檔要手改十幾處，必然漏一兩處，然後就「對唔上」。

   做法：一條連結一個主人一個 URL，所有用到嘅位記喺 targets[]。
   後台改一次 → 開頁時 applyLinkRegistry() 自動寫返入全部 targets → 全站同步。

   注意兩件事：
     ① 換檔 ≠ 改字。呢度只換「成張表單／EXCEL／WORD／PDF／地圖」。
        入面啲細字唔喺呢度改——格式跟規矩。
     ② 夾喺內文中間嘅連結（inline_uses）唔會自動換，會着燈叫人處理。
   ────────────────────────────────────────────────────────────────────────── */

const LINK_KIND_META={
  folder:{zh:'資料夾',icon:'fa-solid fa-folder-open',cls:'bg-amber-100 text-amber-700'},
  excel :{zh:'EXCEL', icon:'fa-solid fa-file-excel', cls:'bg-emerald-100 text-emerald-700'},
  word  :{zh:'WORD',  icon:'fa-solid fa-file-word',  cls:'bg-blue-100 text-blue-700'},
  form  :{zh:'表單',  icon:'fa-solid fa-clipboard-list',cls:'bg-violet-100 text-violet-700'},
  map   :{zh:'地圖',  icon:'fa-solid fa-map-location-dot',cls:'bg-teal-100 text-teal-700'},
  pdf   :{zh:'PDF',   icon:'fa-solid fa-file-pdf',   cls:'bg-rose-100 text-rose-700'},
  web   :{zh:'網頁',  icon:'fa-solid fa-globe',      cls:'bg-slate-100 text-slate-600'}
};

Object.assign(ScoutEventApp.prototype,{

  LINK_KIND_META,

  /* ══════ 路徑讀寫（支援 a.b[2].c）══════ */
  linkPathGet(root,p){
    return String(p).replace(/\[(\d+)\]/g,'.$1').split('.').reduce((x,k)=>(x==null?undefined:x[k]),root);
  },
  linkPathSet(root,p,v){
    const ks=String(p).replace(/\[(\d+)\]/g,'.$1').split('.');
    let o=root;
    for(let i=0;i<ks.length-1;i++){ if(o==null||typeof o!=='object') return false; o=o[ks[i]]; }
    if(o==null||typeof o!=='object') return false;
    o[ks[ks.length-1]]=v; return true;
  },

  /* ══════ 登記處 ══════ */
  linkRegistry(){ return (this.eventData&&this.eventData.link_registry)||null; },
  linkStoreKey(){ return 'event_link_registry_v22_'+((this.currentEvent&&this.currentEvent.event_id)||'mock_demo'); },
  getLinkOverrides(){ try{ const o=JSON.parse(localStorage.getItem(this.linkStoreKey())||'null'); if(o&&typeof o==='object') return o; }catch(e){} return {}; },
  saveLinkOverrides(o){
    try{ localStorage.setItem(this.linkStoreKey(), JSON.stringify(o||{})); }catch(e){}
    if(!this.mockMode&&this.gasUrl){
      try{ fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'LinkRegistry',record:{event_id:(this.currentEvent&&this.currentEvent.event_id)||'mock_demo',data_json:JSON.stringify(o),updated_by:(this.currentUser&&this.currentUser.name)||''}})}).catch(()=>{}); }catch(e){}
    }
  },

  /* 一條連結嘅現行值（override 優先） */
  linkOf(id){
    const reg=this.linkRegistry(); if(!reg) return null;
    const base=(reg.links||[]).find(l=>l.id===id); if(!base) return null;
    const ov=this.getLinkOverrides()[id];
    return ov?Object.assign({},base,ov):base;
  },
  linkList(){
    const reg=this.linkRegistry(); if(!reg) return [];
    const ov=this.getLinkOverrides();
    return (reg.links||[]).map(l=>ov[l.id]?Object.assign({},l,ov[l.id]):l);
  },

  /* ══════ 核心：一處更新 → 寫返入全部用到嘅位 ══════ */
  applyLinkRegistry(data){
    const d=data||this.eventData; if(!d||!d.link_registry) return {links:0,targets:0,missed:[]};
    const ov=this.getLinkOverrides();
    let links=0,targets=0; const missed=[];
    (d.link_registry.links||[]).forEach(l=>{
      const o=ov[l.id]; if(!o||!o.url||o.url===l.url) return;
      links++;
      (l.targets||[]).forEach(p=>{ if(this.linkPathSet(d,p,o.url)) targets++; else missed.push(p); });
      l.url=o.url; l.updated_by=o.updated_by||''; l.updated_at=o.updated_at||'';
    });
    this._linkApplied={links,targets,missed,at:new Date().toISOString()};
    return this._linkApplied;
  },

  /* ══════ 着燈：邊幾條要留意 ══════ */
  linkFlags(l){
    const f=[];
    if(!l.url||!/^https?:\/\//.test(l.url)) f.push({t:'冇連結',c:'rose'});
    else if(/2026|ISD2026|isd2026/.test(l.label+' '+l.url)&&!l.updated_at) f.push({t:'仲係 2026 版',c:'amber'});
    if(l.inline_uses>0) f.push({t:'有 '+l.inline_uses+' 處夾喺內文，要人手跟',c:'amber'});
    if(l.uses>=5) f.push({t:'用咗 '+l.uses+' 處',c:'indigo'});
    return f;
  },
  linkStats(){
    const ls=this.linkList();
    return {
      total:ls.length,
      targets:ls.reduce((s,l)=>s+(l.uses||0),0),
      updated:ls.filter(l=>l.updated_at).length,
      stale:ls.filter(l=>/2026/.test(l.label+' '+l.url)&&!l.updated_at).length,
      broken:ls.filter(l=>!l.url||!/^https?:\/\//.test(l.url)).length,
      inline:ls.reduce((s,l)=>s+(l.inline_uses||0),0)
    };
  },

  /* ══════ 版面 ══════ */
  linkFilterKind:'', linkFilterOwner:'', linkQuery:'', linkOpenId:'',

  renderLinkRegistry(box,opts){
    const el=box||document.getElementById('module-content'); if(!el) return;
    this._linkOpts=opts||{};
    el.innerHTML=this.linkRegistryHTML();
  },
  linkRefresh(){ const b=document.getElementById('link-reg-body'); if(b) b.innerHTML=this.linkBodyHTML(); const s=document.getElementById('link-reg-stats'); if(s) s.innerHTML=this.linkStatsHTML(); },
  linkSetKind(k){ this.linkFilterKind=(this.linkFilterKind===k?'':k); this.linkRefresh(); },
  linkSetOwner(g){ this.linkFilterOwner=g; this.linkRefresh(); },
  linkSearch(v){ this.linkQuery=String(v||'').trim().toLowerCase(); this.linkRefresh(); },
  linkToggle(id){ this.linkOpenId=(this.linkOpenId===id?'':id); this.linkRefresh(); },

  linkScopeOwner(){
    const o=this._linkOpts||{};
    if(o.scope==='group') return (this.currentUser&&this.currentUser.group_name)||'';
    return '';
  },
  linkVisible(){
    const scope=this.linkScopeOwner();
    let ls=this.linkList();
    if(scope) ls=ls.filter(l=>l.owner===scope);
    if(this.linkFilterOwner) ls=ls.filter(l=>l.owner===this.linkFilterOwner);
    if(this.linkFilterKind) ls=ls.filter(l=>l.kind===this.linkFilterKind);
    if(this.linkQuery){ const q=this.linkQuery; ls=ls.filter(l=>(l.label+' '+l.url+' '+l.owner+' '+(l.targets||[]).join(' ')).toLowerCase().indexOf(q)>=0); }
    return ls.sort((a,b)=>(b.uses||0)-(a.uses||0)||String(a.label).localeCompare(String(b.label),'zh-HK'));
  },

  linkCanEdit(l){
    if(this.isAdmin&&this.isAdmin()) return true;
    if(this.isExecViceOrChair&&this.isExecViceOrChair()) return true;
    const g=(this.currentUser&&this.currentUser.group_name)||'';
    return g===l.owner||g==='行政組'||g==='秘書處';
  },

  linkStatsHTML(){
    const s=this.linkStats();
    const cell=(n,t,c)=>`<div class="bg-white border rounded-xl px-2 py-2 text-center"><div class="text-[17px] font-black ${c||'text-slate-800'}">${n}</div><div class="text-[9.5px] text-slate-400 leading-tight mt-0.5">${t}</div></div>`;
    return `<div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
      ${cell(s.total,'條連結')}
      ${cell(s.targets,'個位置用緊','text-indigo-600')}
      ${cell(s.updated,'已更新','text-emerald-600')}
      ${cell(s.stale,'仲係 2026 版',s.stale?'text-amber-600':'text-slate-300')}
      ${cell(s.broken,'冇連結',s.broken?'text-rose-600':'text-slate-300')}
    </div>`;
  },

  linkRegistryHTML(){
    const reg=this.linkRegistry();
    if(!reg) return '<div class="bg-white border-2 border-dashed rounded-xl p-8 text-center text-[12px] text-slate-400">本活動未有連結總表</div>';
    const scope=this.linkScopeOwner();
    const owners=Array.from(new Set(this.linkList().map(l=>l.owner))).sort();
    const kinds=Object.keys(LINK_KIND_META);
    const cnt={}; this.linkList().forEach(l=>cnt[l.kind]=(cnt[l.kind]||0)+1);
    return `
      <div class="space-y-3">
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed text-indigo-900">
          <b><i class="fa-solid fa-link mr-1"></i>連結總表：改一次，全站同步。</b>
          一條連結得一個主人、一個 URL。你喺呢度換咗，<b>所有用到佢嘅位置會一齊變</b>——唔使再逐頁搵。
          <br><span class="text-indigo-700">呢度淨係換<b>成張</b>表單／EXCEL／WORD／PDF／地圖。文件入面啲細字唔喺呢度改。</span>
        </div>
        <div id="link-reg-stats">${this.linkStatsHTML()}</div>
        <div class="bg-white border rounded-xl p-2.5 space-y-2">
          <input oninput="app.linkSearch(this.value)" value="${escapeHtml(this.linkQuery)}" placeholder="搵檔名、連結、或者用喺邊個位…" class="w-full px-3 py-2 border rounded-xl text-[12.5px]">
          <div class="flex flex-wrap gap-1">
            ${kinds.filter(k=>cnt[k]).map(k=>`<button onclick="app.linkSetKind('${k}')" class="px-2 py-1 rounded-lg text-[10.5px] font-bold ${this.linkFilterKind===k?'bg-indigo-600 text-white':LINK_KIND_META[k].cls}"><i class="${LINK_KIND_META[k].icon} mr-0.5"></i>${LINK_KIND_META[k].zh} ${cnt[k]}</button>`).join('')}
          </div>
          ${scope?'':`<select onchange="app.linkSetOwner(this.value)" class="w-full px-3 py-2 border rounded-xl text-[12px] bg-white">
            <option value="">全部負責組</option>
            ${owners.map(o=>`<option value="${escapeHtml(o)}" ${this.linkFilterOwner===o?'selected':''}>${escapeHtml(o)}</option>`).join('')}
          </select>`}
        </div>
        <div id="link-reg-body">${this.linkBodyHTML()}</div>
      </div>`;
  },

  linkBodyHTML(){
    const ls=this.linkVisible();
    if(!ls.length) return '<div class="bg-white border-2 border-dashed rounded-xl p-8 text-center text-[12px] text-slate-400">冇符合嘅連結</div>';
    return ls.map(l=>{
      const m=LINK_KIND_META[l.kind]||LINK_KIND_META.web;
      const open=this.linkOpenId===l.id;
      const flags=this.linkFlags(l);
      const can=this.linkCanEdit(l);
      return `
        <div class="bg-white border rounded-xl overflow-hidden mb-2 ${open?'ring-1 ring-indigo-300':''}">
          <button onclick="app.linkToggle('${l.id}')" class="w-full text-left p-2.5 flex items-start gap-2.5">
            <span class="w-8 h-8 rounded-lg ${m.cls} flex items-center justify-center shrink-0 mt-0.5"><i class="${m.icon}"></i></span>
            <span class="min-w-0 flex-1">
              <span class="block font-bold text-[12.5px] text-slate-800 leading-snug">${escapeHtml(l.label)}</span>
              <span class="block text-[10px] text-slate-400 mt-0.5">${escapeHtml(l.owner)}・用喺 <b class="text-indigo-600">${l.uses}</b> 個位${l.updated_at?`・已更新 ${escapeHtml(l.updated_at)}`:''}</span>
              ${flags.length?`<span class="flex flex-wrap gap-1 mt-1">${flags.map(f=>`<span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-${f.c}-100 text-${f.c}-700">${escapeHtml(f.t)}</span>`).join('')}</span>`:''}
            </span>
            <i class="fa-solid fa-chevron-${open?'up':'down'} text-slate-300 text-[11px] mt-2"></i>
          </button>
          ${open?`<div class="px-2.5 pb-2.5 space-y-2 bg-slate-50 border-t pt-2.5">
            <div>
              <div class="text-[10.5px] font-bold text-slate-500 mb-1">連結（換咗之後，下面全部位置一齊變）</div>
              <input id="link-url-${l.id}" ${can?'':'disabled'} value="${escapeHtml(l.url||'')}" class="w-full px-3 py-2 border rounded-xl text-[11.5px] bg-white font-mono">
            </div>
            ${can?`<div class="flex gap-2">
              <button onclick="app.linkSave('${l.id}')" class="flex-1 bg-indigo-600 text-white text-[12px] font-bold rounded-xl py-2"><i class="fa-solid fa-rotate mr-1"></i>更新並同步 ${l.uses} 個位</button>
              ${l.updated_at?`<button onclick="app.linkReset('${l.id}')" class="bg-white border text-slate-500 text-[11.5px] font-bold rounded-xl px-3">還原</button>`:''}
              <a href="${escapeHtml(l.url||'#')}" target="_blank" rel="noopener" class="bg-white border text-slate-500 text-[11.5px] font-bold rounded-xl px-3 py-2"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
            </div>`:'<div class="text-[11px] text-slate-400 text-center py-1">唔係你組負責，只可以睇</div>'}
            <details class="bg-white border rounded-xl p-2">
              <summary class="text-[10.5px] font-bold text-slate-500 cursor-pointer">用喺邊 ${l.uses} 個位</summary>
              <div class="mt-1.5 space-y-0.5">${(l.targets||[]).map(t=>`<div class="text-[10px] font-mono text-slate-500 break-all">${escapeHtml(this.linkWhereZh(t))}<span class="text-slate-300"> · ${escapeHtml(t)}</span></div>`).join('')}</div>
              ${l.inline_uses?`<div class="mt-1.5 text-[10px] text-amber-700 bg-amber-50 rounded-lg p-1.5">另有 ${l.inline_uses} 處夾喺內文中間，唔會自動換，要人手跟。</div>`:''}
            </details>
          </div>`:''}
        </div>`;
    }).join('');
  },

  /* 路徑 → 人睇得明嘅位置 */
  linkWhereZh(p){
    const M=[[/^documents/,'文件庫'],[/^notices/,'通告'],[/^announcements/,'公告'],
      [/^meetings/,'會議'],[/^unit_guide/,'旅團指南'],[/^drive\./,'Drive 設定'],
      [/^finance/,'財務'],[/^crisis/,'危機手冊'],[/^ceremony/,'典禮'],
      [/^activities/,'攤位／活動'],[/^public_channel_2027/,'公眾頻道'],
      [/^guest_transport/,'嘉賓交通'],[/^staff/,'工作人員'],[/^souvenirs/,'紀念品']];
    for(const [re,zh] of M) if(re.test(p)) return zh;
    return p.split(/[.\[]/)[0];
  },

  linkSave(id){
    const l=this.linkOf(id); if(!l) return;
    if(!this.linkCanEdit(l)){ showToast('唔係你組負責嘅連結','error'); return; }
    const el=document.getElementById('link-url-'+id); if(!el) return;
    const url=String(el.value||'').trim();
    if(url&&!/^https?:\/\//.test(url)){ showToast('連結要以 http:// 或 https:// 開頭','error'); return; }
    const ov=this.getLinkOverrides();
    ov[id]={url, updated_by:(this.currentUser&&this.currentUser.name)||'', updated_at:new Date().toISOString().slice(0,16).replace('T',' ')};
    this.saveLinkOverrides(ov);
    const r=this.applyLinkRegistry();
    showToast('已更新，同步咗 '+(l.targets||[]).length+' 個位置','success');
    this.linkRefresh();
    return r;
  },
  linkReset(id){
    const l=this.linkOf(id); if(!l) return;
    if(!this.linkCanEdit(l)){ showToast('唔係你組負責嘅連結','error'); return; }
    if(!confirm('還原「'+l.label+'」做原本嘅連結？')) return;
    const ov=this.getLinkOverrides(); delete ov[id]; this.saveLinkOverrides(ov);
    showToast('已還原，請重新整理頁面','info');
    this.linkRefresh();
  }

});
