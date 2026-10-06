/* 50-cross-check.js — 跨組對帳：邊組改咗，邊組未跟（v24）
   ──────────────────────────────────────────────────────────────────────────
   用戶原話：「例如攤位我是節目組知道人名改了，但協調組和行政組其實未改名字，
              那就影響派章和派飯了」

   呢個就係要醫嗰樣。2026 真實情況：

     攤位資料   主題節目組　A01「主節目組總部」人手 7　午膳 7
     編更名單   行政組　　　A1 Core　實際 7 人
     派章名單   行政組　　　另一份 290 行
     午膳點算   協調組　　　攤位表加總 173

     四個數字：編更 279 ／ 派章 290 ／ 攤位人手 193 ／ 攤位午膳 173

   呢度唔會夾硬改人哋啲資料——改人哋嘅嘢係錯嘅。
   呢度只做三件事：
     ① 用寬鬆鍵（js/49-key-match.js）認得返邊個攤位係邊個，就算 A01 vs 「A1 Core」
     ② 一眼睇到邊幾格對唔上，同埋係邊兩個組之間對唔上
     ③ 寫明「呢格係邊組話事」，所以要搵邊個跟進，唔使周圍問
   ────────────────────────────────────────────────────────────────────────── */

Object.assign(ScoutEventApp.prototype,{

  /* 邊份資料邊組話事 —— 呢個就係「格有名字」 */
  CROSS_OWNERS:{
    booth:   {label:'攤位資料',  owner:'主題節目組', where:'攤位總表'},
    roster:  {label:'編更名單',  owner:'行政組',     where:'工作人員編更'},
    stamp:   {label:'派章名單',  owner:'行政組',     where:'紀念章派發（工作人員）'},
    meal:    {label:'午膳點算',  owner:'協調組',     where:'膳食批核／代訂餐盒'}
  },

  /* ══════ 逐個攤位夾數 ══════ */
  crossCheckRows(){
    const d=this.eventData||{};
    const booths=(d.activities&&d.activities.booths)||[];
    const roster=(d.staff&&d.staff.event_staff_roster)||[];
    const stamps=(d.souvenirs&&d.souvenirs.staff_roster_2026)||[];
    const K=this.kmBooth?this:(typeof window!=='undefined'?window:null);
    if(!K||!K.kmBooth) return [];

    const byKey={};
    const touch=k=>(byKey[k]=byKey[k]||{key:k,booth:null,rosterN:0,stampN:0,rosterRaw:new Set(),stampRaw:new Set()});

    booths.forEach(b=>{ const k=K.kmBooth(b.booth_no); if(k) touch(k).booth=b; });
    roster.forEach(r=>{ const k=K.kmBooth(r.booth); if(!k) return; const e=touch(k); e.rosterN++; if(r.booth) e.rosterRaw.add(String(r.booth)); });
    stamps.forEach(r=>{ const k=K.kmBooth(r.booth); if(!k) return; const e=touch(k); e.stampN++; if(r.booth) e.stampRaw.add(String(r.booth)); });

    return Object.values(byKey).map(e=>{
      const b=e.booth;
      const plan   = b?(parseInt(b.staff_count,10)||0):0;        // 主題節目組報嘅人手
      const lunch  = b?(parseInt(b.lunch,10)||0):0;              // 協調組要訂嘅飯
      const flags=[];
      if(!b)                       flags.push({t:'攤位表冇呢個攤位',c:'rose',who:'主題節目組'});
      if(b&&e.rosterN===0)         flags.push({t:'冇人編更',c:'rose',who:'行政組'});
      if(b&&plan&&e.rosterN&&plan!==e.rosterN)
                                   flags.push({t:`人手對唔上（攤位表 ${plan}／編更 ${e.rosterN}）`,c:'amber',who:'主題節目組 × 行政組'});
      if(b&&e.rosterN&&e.stampN&&e.rosterN!==e.stampN)
                                   flags.push({t:`派章人數對唔上（編更 ${e.rosterN}／派章 ${e.stampN}）`,c:'amber',who:'行政組'});
      if(b&&lunch&&e.rosterN&&lunch!==e.rosterN)
                                   flags.push({t:`飯數對唔上（午膳 ${lunch}／編更 ${e.rosterN}）`,c:'amber',who:'協調組 × 行政組'});
      const raws=new Set([...(b?[b.booth_no]:[]),...e.rosterRaw,...e.stampRaw]);
      if(raws.size>1)              flags.push({t:'同一個攤位寫法唔同：'+[...raws].join(' ／ '),c:'slate',who:'寫法問題，系統已自動認返'});
      return {key:e.key, name:b?b.booth_name:'(攤位表冇)', group:b?b.group_name:'',
        plan, lunch, rosterN:e.rosterN, stampN:e.stampN, raws:[...raws], flags};
    }).sort((a,b)=>(b.flags.length-a.flags.length)||String(a.key).localeCompare(String(b.key)));
  },

  crossCheckTotals(){
    const d=this.eventData||{};
    const booths=(d.activities&&d.activities.booths)||[];
    return {
      roster:((d.staff&&d.staff.event_staff_roster)||[]).length,
      stamp:((d.souvenirs&&d.souvenirs.staff_roster_2026)||[]).length,
      plan:booths.reduce((s,b)=>s+(parseInt(b.staff_count,10)||0),0),
      lunch:booths.reduce((s,b)=>s+(parseInt(b.lunch,10)||0),0),
      booths:booths.length
    };
  },

  /* ══════ 旅團：只係認得返，唔夾埋（兩件事）══════ */
  crossCheckTroops(){
    const d=this.eventData||{};
    const merit=(d.ceremony&&d.ceremony.meritRoster)||[];
    const part=((d.public_channel_2027&&d.public_channel_2027.manual&&d.public_channel_2027.manual.participants)||{}).rows||[];
    const kk=s=>{ const v=this.kmTroop&&this.kmTroop(s); return v&&v.key; };
    const M=new Map(), P=new Map();
    merit.forEach(r=>{ const k=kk(r.unit); if(k&&!M.has(k)) M.set(k,r.unit); });
    part.forEach(r=>{ const k=kk(r[1]); if(k&&!P.has(k)) P.set(k,r[1]); });
    const sameTroop=[...M.keys()].filter(k=>P.has(k));
    return {merit:M.size, part:P.size, recognised:sameTroop.length,
      spelling:sameTroop.filter(k=>M.get(k)!==P.get(k)).map(k=>({merit:M.get(k),part:P.get(k)}))};
  },

  /* ══════ 版面 ══════ */
  crossOnly:'',
  renderCrossCheck(box){
    const el=box||document.getElementById('module-content'); if(!el) return;
    el.innerHTML=this.crossCheckHTML();
  },
  crossSetFilter(v){ this.crossOnly=(this.crossOnly===v?'':v); const b=document.getElementById('cross-body'); if(b) b.innerHTML=this.crossBodyHTML(); },


  /* ───────── 入口守門（v25） ─────────
     用戶原話：「其實可能未必係唔知到只係大家習慣左用唔同既編譯方式…
                 但現在我們是直接寫進後端，我們可以規限他填寫時的格式，
                 例如旅團 只準填港島第1旅 不能填港島第一旅 或填1 這種的」

     上面個對帳區係【補鑊】——落咗格先夾返。
     呢個區係【守門】——根本唔畀佢落錯格。
     2026 源頭係 Google Form，人想點填就點填，所以冇所謂填錯；
     2027 直接寫後端，同一套認字能力搬去入口，就係呢個分別。
     規矩同 templates/2027/ 啲 Excel 彈出嗰個輸入提示係同一份定義（js/51-field-format.js）。 */
  GATE_SPECS:[
    {src:'guest_roster.guests',  title:'嘉賓名單',       owner:'嘉賓接待組', cols:[
      {k:'name',label:'姓名',format:'person'},{k:'car_plate',label:'車牌',format:'plate'}]},
    {src:'staff.contacts',       title:'組織架構及聯絡',  owner:'秘書處',    cols:[
      {k:'name',label:'姓名',format:'person'},{k:'contact',label:'電話',format:'phone'}]},
    {src:'activities.booths',    title:'攤位資料',       owner:'主題節目組', cols:[
      {k:'booth_no',label:'攤位編號',format:'booth'},{k:'staff_count',label:'人手',format:'count'},
      {k:'lunch',label:'午膳數',format:'count'}]},
    {src:'ceremony.meritRoster', title:'優異旅團獲獎名單',owner:'會操及典禮組',cols:[
      {k:'unit',label:'旅名',format:'troop'}]}
  ],

  gateAudit(){
    // 51-field-format.js 會把 ffAudit 掛落 ScoutEventApp.prototype 同 window
    const FF=(typeof this.ffAudit==='function') ? this
           : (typeof window!=='undefined'&&typeof window.ffAudit==='function') ? window : null;
    if(!FF) return null;
    const d=this.eventData||{};
    const T={ok:0,fixed:0,reject:0,total:0}, sections=[];
    this.GATE_SPECS.forEach(sp=>{
      const rows=sp.src.split('.').reduce((x,k)=>(x==null?undefined:x[k]),d);
      if(!Array.isArray(rows)||!rows.length) return;
      const a=FF.ffAudit(rows,sp.cols);
      T.ok+=a.ok; T.fixed+=a.fixed; T.reject+=a.reject; T.total+=a.total;
      sections.push({title:sp.title,owner:sp.owner,rows:rows.length,a});
    });
    return {totals:T,sections};
  },

  gateHTML(){
    const g=this.gateAudit();
    if(!g||!g.totals.total) return '';
    const T=g.totals, pct=n=>T.total?Math.round(n/T.total*100):0;
    const bad=[], fix=[], seen={};
    g.sections.forEach(s=>s.a.samples.forEach(x=>{
      if(x.state==='reject') bad.push(Object.assign({t:s.title},x));
      else if(x.state==='fixed'){ const k=s.title+'|'+x.field+'|'+x.why; if(!seen[k]){seen[k]=1; fix.push(Object.assign({t:s.title},x));} }
    }));
    const box=(n,l,c,bg)=>`<div class="${bg} border rounded-xl px-2 py-2 text-center"><div class="text-[17px] font-black ${c}">${n}</div><div class="text-[9.5px] text-slate-500 leading-tight mt-0.5">${l}</div></div>`;
    return `
      <div class="bg-white border rounded-xl p-3 mt-3">
        <div class="text-[11.5px] font-bold text-slate-700 mb-1"><i class="fa-solid fa-shield-halved mr-1 text-indigo-500"></i>入口守門：2027 填嗰陣就卡住</div>
        <div class="text-[10.5px] text-slate-500 leading-relaxed mb-2">
          上面個對帳係<b>補鑊</b>——落咗格先夾返。呢度係<b>守門</b>：根本唔畀佢落錯格。<br>
          2026 係 Google Form，人想點填就點填，所以唔存在填錯。2027 直接寫後端，規矩可以擺喺入口。
          下面係攞 2026 真資料照新規矩行一次，答「如果當時有守門，會擋到幾多」。
        </div>
        <div class="grid grid-cols-3 gap-1.5">
          ${box(T.ok,`✓ 本身合格<br>${pct(T.ok)}%`,'text-emerald-600','bg-emerald-50')}
          ${box(T.fixed,`⟳ 自動改正<br>${pct(T.fixed)}%`,'text-amber-600','bg-amber-50')}
          ${box(T.reject,`✗ 當場彈返<br>${pct(T.reject)}%`,'text-rose-600','bg-rose-50')}
        </div>
        <div class="mt-2 space-y-1">
          ${g.sections.map(s=>`<div class="bg-slate-50 rounded-lg px-2 py-1.5">
            <div class="flex items-center justify-between text-[10.5px]">
              <span class="font-bold text-slate-700">${escapeHtml(s.title)} <span class="text-slate-400 font-normal">${s.rows} 行・${escapeHtml(s.owner)}</span></span>
              <span class="font-mono text-[10px]"><span class="text-emerald-600">✓${s.a.ok}</span>
                ${s.a.fixed?`<span class="text-amber-600 ml-1">⟳${s.a.fixed}</span>`:''}
                ${s.a.reject?`<span class="text-rose-600 ml-1 font-black">✗${s.a.reject}</span>`:''}</span>
            </div></div>`).join('')}
        </div>
        ${fix.length?`<details class="mt-2" open><summary class="cursor-pointer text-[10.5px] font-bold text-amber-700">⟳ 入口自動改成標準寫法，唔使人手跟（${g.totals.fixed} 格）</summary>
          <div class="mt-1 space-y-0.5">${fix.slice(0,8).map(x=>`<div class="text-[10px] bg-amber-50 rounded px-2 py-1">
            <span class="text-slate-400">${escapeHtml(x.label)}</span>
            <code class="text-slate-700">${escapeHtml(String(x.was).slice(0,22))}</code>
            <span class="text-slate-400 mx-1">→</span><code class="text-emerald-700 font-bold">${escapeHtml(String(x.value).slice(0,22))}</code>
            <span class="text-slate-400 ml-1">${escapeHtml(x.why)}</span></div>`).join('')}</div></details>`:''}
        ${bad.length?`<details class="mt-2" open><summary class="cursor-pointer text-[10.5px] font-bold text-rose-700">✗ 入口唔收，叫返填嘅人即場改（${bad.length} 格）</summary>
          <div class="mt-1 space-y-0.5">${bad.slice(0,15).map(x=>`<div class="text-[10px] bg-rose-50 rounded px-2 py-1">
            <span class="text-slate-400">${escapeHtml(x.t)}・${escapeHtml(x.label)}</span>
            <code class="text-rose-800 font-bold">${escapeHtml(String(x.was).slice(0,22))}</code>
            <div class="text-slate-500 mt-0.5">${escapeHtml(x.why)}　<span class="text-slate-400">應該：${escapeHtml(x.how)}</span></div>
          </div>`).join('')}</div></details>`:''}
        <div class="mt-2 text-[9.5px] text-slate-400 leading-relaxed">
          同一份規矩已經寫入 <code>templates/2027/</code> 啲 Excel：人撳落個格就會彈出「只准咁填 ✓ ／ 唔好咁填 ✗」，唔使翻文件。
          改 <code>js/51-field-format.js</code> 一處，網站同範本一齊跟。
        </div>
      </div>`;
  },

  crossCheckHTML(){
    const t=this.crossCheckTotals();
    const rows=this.crossCheckRows();
    const bad=rows.filter(r=>r.flags.some(f=>f.c!=='slate')).length;
    const tr=this.crossCheckTroops();
    const cell=(n,l,c)=>`<div class="bg-white border rounded-xl px-2 py-2 text-center"><div class="text-[17px] font-black ${c||'text-slate-800'}">${n}</div><div class="text-[9.5px] text-slate-400 leading-tight mt-0.5">${l}</div></div>`;
    return `
      <div class="space-y-3">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900">
          <b><i class="fa-solid fa-code-compare mr-1"></i>跨組對帳：邊組改咗，邊組未跟。</b>
          同一個攤位，主題節目組寫「A01」、行政組編更寫「A1 Core」——系統已經自動認返係同一個，
          但<b>數字對唔上就一定要人睇</b>，因為咁就會派錯章、訂錯飯。
          <br><span class="text-amber-700">呢頁唔會改人哋啲資料。只係指出邊格對唔上、要搵邊個組。</span>
        </div>

        <div class="bg-white border rounded-xl p-2.5">
          <div class="text-[11px] font-bold text-slate-600 mb-1.5">「幾多人做嘢」有幾多個答案</div>
          <div class="grid grid-cols-4 gap-1.5">
            ${cell(t.roster,'編更名單<br>行政組')}
            ${cell(t.stamp,'派章名單<br>行政組')}
            ${cell(t.plan,'攤位人手<br>主題節目組')}
            ${cell(t.lunch,'攤位午膳<br>協調組')}
          </div>
          ${new Set([t.roster,t.stamp,t.plan,t.lunch]).size>1
            ?`<div class="mt-2 text-[10.5px] text-rose-700 bg-rose-50 rounded-lg p-2"><b>四個數字唔一樣。</b>派章照派章嗰份、訂飯照攤位表嗰個數——所以邊一份改咗，另外三份都唔會知。</div>`
            :`<div class="mt-2 text-[10.5px] text-emerald-700 bg-emerald-50 rounded-lg p-2">四個數字一致。</div>`}
        </div>

        <div class="flex gap-1.5">
          <button onclick="app.crossSetFilter('bad')" class="flex-1 px-2 py-2 rounded-xl text-[11.5px] font-bold ${this.crossOnly==='bad'?'bg-rose-600 text-white':'bg-white border text-slate-600'}">⚠ 要跟進 ${bad}</button>
          <button onclick="app.crossSetFilter('')" class="flex-1 px-2 py-2 rounded-xl text-[11.5px] font-bold ${this.crossOnly===''?'bg-slate-700 text-white':'bg-white border text-slate-600'}">全部 ${rows.length}</button>
        </div>

        <div id="cross-body">${this.crossBodyHTML()}</div>

        <div class="bg-white border rounded-xl p-3">
          <div class="text-[11.5px] font-bold text-slate-700 mb-1">旅團名稱：認得返，但唔夾埋</div>
          <div class="text-[10.5px] text-slate-500 leading-relaxed">
            優異旅團 <b>${tr.merit}</b> 個旅 × 參加旅團 <b>${tr.part}</b> 個旅，系統認得返同一個旅嘅有 <b class="text-indigo-600">${tr.recognised}</b> 個
            （其中 <b>${tr.spelling.length}</b> 個兩邊寫法唔同，已自動夾返）。
            <div class="mt-1.5 bg-slate-50 rounded-lg p-2">
              <b>⚠ 呢兩張表係兩件事，唔會夾埋。</b>有人嚟攞獎唔等如個旅有嚟；個旅有嚟亦唔等如會攞獎。
            </div>
            ${tr.spelling.length?`<details class="mt-1.5"><summary class="cursor-pointer text-[10px] font-bold text-slate-500">睇寫法唔同嘅 ${tr.spelling.length} 個</summary>
              <div class="mt-1 space-y-0.5">${tr.spelling.slice(0,30).map(s=>`<div class="text-[10px] font-mono text-slate-500">${escapeHtml(s.merit)} ＝ ${escapeHtml(s.part)}</div>`).join('')}</div></details>`:''}
          </div>
        </div>
        ${this.gateHTML()}
      </div>`;
  },

  crossBodyHTML(){
    let rows=this.crossCheckRows();
    if(this.crossOnly==='bad') rows=rows.filter(r=>r.flags.some(f=>f.c!=='slate'));
    if(!rows.length) return '<div class="bg-white border-2 border-dashed rounded-xl p-6 text-center text-[12px] text-slate-400">全部夾得返</div>';
    return rows.map(r=>`
      <div class="bg-white border rounded-xl p-2.5 mb-1.5">
        <div class="flex items-start gap-2">
          <span class="px-1.5 py-0.5 rounded-md bg-slate-800 text-white text-[11px] font-black font-mono shrink-0">${escapeHtml(r.key)}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-[12px] font-bold text-slate-800 leading-snug">${escapeHtml(r.name)}</span>
            <span class="block text-[10px] text-slate-400">${escapeHtml(r.group||'')}</span>
          </span>
        </div>
        <div class="grid grid-cols-4 gap-1 mt-2 text-center">
          ${[['攤位人手',r.plan,'主題節目組'],['編更',r.rosterN,'行政組'],['派章',r.stampN,'行政組'],['午膳',r.lunch,'協調組']]
            .map(([l,v,g])=>`<div class="bg-slate-50 rounded-lg py-1"><div class="text-[13px] font-bold ${v?'text-slate-800':'text-slate-300'}">${v}</div><div class="text-[8.5px] text-slate-400 leading-tight">${l}<br>${g}</div></div>`).join('')}
        </div>
        ${r.flags.length?`<div class="mt-1.5 space-y-1">${r.flags.map(f=>`
          <div class="text-[10px] px-2 py-1 rounded-lg bg-${f.c}-50 text-${f.c}-800 flex items-start gap-1.5">
            <span class="flex-1">${escapeHtml(f.t)}</span>
            <span class="shrink-0 font-bold opacity-70">${escapeHtml(f.who)}</span>
          </div>`).join('')}</div>`:''}
      </div>`).join('');
  }

});
