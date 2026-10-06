/* 53-output-board.js — 輸出總表：2027 要出嘅嘢，一版睇晒（第 1 步成果）
   ──────────────────────────────────────────────────────────────────────────
   用戶原話：「你有先放到 MOCK 我看看。我會先對公眾要看到的，再看一般工作人員
               要看到的，那就基本上是主要的輸出資料，之後再看各部門會在當天用到的。
               你可以先把有的填上，再在標簽上寫你建議有的，和缺失的，
               分類成 3 種顏色，看看我能不能補上」

   所以呢個面板淨係做兩件事：
     ① 按用戶要嘅次序分三層　公眾 → 一般工作人員 → 各部門當天
     ② 三種顏色
          🟢 有　　2026 有呢件嘢，資料亦都真係喺系統入面，出得到
          🔴 缺　　2026 有呢件嘢（有文件為證），但資料唔喺系統，或者有洞
          🟡 建議　2026 冇，我建議 2027 加。每條都附返 2026 原文根據

   冇自動化、冇生成、冇回追。資料源係第 2 步嘅嘢。
   呢度淨係畀用戶核對「數齊未、邊啲要佢補」。
   ────────────────────────────────────────────────────────────────────────── */

Object.assign(ScoutEventApp.prototype,{

  OB_TIERS:[
    {id:'public',label:'公眾睇到',   icon:'fa-solid fa-globe',  note:'旅團、家長、嘉賓、街外人攞得到嘅嘢'},
    {id:'staff', label:'一般工作人員',icon:'fa-solid fa-user-group',note:'所有工作人員都睇得到，唔分邊組'},
    {id:'dept',  label:'部門當天用', icon:'fa-solid fa-sitemap',note:'淨係該組當日要用，唔公開'}
  ],

  OB_COLORS:{
    have   :{dot:'🟢',label:'有',   cls:'emerald', desc:'2026 有，資料亦都喺系統入面，出得到'},
    gap    :{dot:'🔴',label:'缺',   cls:'rose',    desc:'2026 有呢件嘢，但資料唔喺系統，或者有洞'},
    suggest:{dot:'🟡',label:'建議', cls:'amber',   desc:'2026 冇，我建議加。每條都附返 2026 原文根據'}
  },

  obData(){
    const W=(typeof window!=='undefined')?window:{};
    return (W.OUTPUTS_2027&&W.OUTPUTS_2027.OUTPUTS)?W.OUTPUTS_2027:null;
  },

  obCount(list,k){ return list.filter(o=>o.have===k).length; },

  obTierRows(tier){
    const R=this.obData(); if(!R) return [];
    const order={gap:0,suggest:1,have:2};
    return R.OUTPUTS.filter(o=>o.aud===tier)
      .slice().sort((a,b)=>(order[a.have]-order[b.have])||a.title.localeCompare(b.title,'zh-HK'));
  },

  obHTML(){
    const R=this.obData();
    if(!R) return '<div class="bg-white border rounded-xl p-4 text-[12px] text-slate-400">輸出清單未載入。</div>';
    const all=R.OUTPUTS;
    const tier=this.obTier||'public';
    const only=this.obOnly||'';
    const C=this.OB_COLORS;

    let h='<div class="space-y-3">';

    /* 說明 */
    h+='<div class="bg-slate-50 border rounded-xl p-3 text-[11px] leading-relaxed text-slate-700">';
    h+='<b><i class="fa-solid fa-list-check mr-1"></i>第 1 步：數齊 2027 要出嘅嘢，一共 '+all.length+' 件。</b><br>';
    h+='呢版淨係點算，冇自動化亦都冇生成 —— 資料源同點樣出係第 2 步。<br>';
    h+='<span class="text-slate-500">依你講嘅次序排：公眾 → 一般工作人員 → 部門當天。</span>';
    h+='</div>';

    /* 三色總計 */
    h+='<div class="grid grid-cols-3 gap-1.5">';
    ['have','gap','suggest'].forEach(k=>{
      const n=this.obCount(all,k), c=C[k];
      h+='<div class="bg-'+c.cls+'-50 border border-'+c.cls+'-200 rounded-xl px-2 py-2 text-center">';
      h+='<div class="text-[18px] font-black text-'+c.cls+'-700">'+n+'</div>';
      h+='<div class="text-[10px] font-bold text-slate-700 mt-0.5">'+c.dot+' '+c.label+'</div>';
      h+='<div class="text-[8.5px] text-slate-500 leading-tight mt-0.5">'+escapeHtml(c.desc)+'</div>';
      h+='</div>';
    });
    h+='</div>';

    /* 三層 tab */
    h+='<div class="flex gap-1.5">';
    this.OB_TIERS.forEach(t=>{
      const rows=all.filter(o=>o.aud===t.id);
      const on=(tier===t.id);
      h+='<button onclick="app.obSetTier(\''+t.id+'\')" class="flex-1 px-2 py-2 rounded-xl text-[11px] font-bold '
        +(on?'bg-slate-800 text-white':'bg-white border text-slate-600')+'">';
      h+='<i class="'+t.icon+' mr-1"></i>'+escapeHtml(t.label)+'<br>';
      h+='<span class="text-[9.5px] font-normal opacity-80">'+rows.length+' 件　'
        +'🟢'+this.obCount(rows,'have')+' 🔴'+this.obCount(rows,'gap')+' 🟡'+this.obCount(rows,'suggest')+'</span>';
      h+='</button>';
    });
    h+='</div>';

    const cur=this.OB_TIERS.filter(t=>t.id===tier)[0]||this.OB_TIERS[0];
    const rows=this.obTierRows(tier);

    h+='<div class="bg-white border rounded-xl p-2.5">';
    h+='<div class="text-[11px] text-slate-500 mb-2">'+escapeHtml(cur.note)+'</div>';

    /* 色篩 */
    h+='<div class="flex gap-1.5 mb-2">';
    h+='<button onclick="app.obSetOnly(\'\')" class="px-2 py-1 rounded-lg text-[10.5px] font-bold '
      +(only===''?'bg-slate-700 text-white':'bg-slate-100 text-slate-600')+'">全部 '+rows.length+'</button>';
    ['gap','suggest','have'].forEach(k=>{
      const n=this.obCount(rows,k), c=C[k];
      if(!n) return;
      h+='<button onclick="app.obSetOnly(\''+k+'\')" class="px-2 py-1 rounded-lg text-[10.5px] font-bold '
        +(only===k?'bg-'+c.cls+'-600 text-white':'bg-'+c.cls+'-50 text-'+c.cls+'-700')+'">'+c.dot+' '+c.label+' '+n+'</button>';
    });
    h+='</div>';

    h+='<div id="ob-body">'+this.obBodyHTML()+'</div>';
    h+='</div>';

    h+='<div class="bg-white border rounded-xl p-3 text-[10.5px] text-slate-500 leading-relaxed">';
    h+='<b class="text-slate-700">🔴 缺</b> ＝ 2026 真係有出過呢件嘢（清單入面有文件為證），'
      +'但份資料唔喺系統，或者得一半。呢批就係要你補嘅。<br>';
    h+='<b class="text-slate-700">🟡 建議</b> ＝ 2026 冇做過，但我喺司儀稿或者資料入面見到應該要有。'
      +'每條都附咗 2026 原文，你睇完話我知使唔使。<br>';
    h+='<span class="text-slate-400">清單本身：<code>tools/schema/outputs_2027.js</code>　'
      +'文字版：<code>docs/2027_OUTPUT_INVENTORY.md</code></span>';
    h+='</div>';

    h+='</div>';
    return h;
  },

  obBodyHTML(){
    const R=this.obData(); if(!R) return '';
    const C=this.OB_COLORS;
    const only=this.obOnly||'';
    let rows=this.obTierRows(this.obTier||'public');
    if(only) rows=rows.filter(o=>o.have===only);
    if(!rows.length) return '<div class="text-[11.5px] text-slate-400 py-4 text-center">呢個分類冇嘢。</div>';

    let h='<div class="space-y-1.5">';
    rows.forEach(o=>{
      const c=C[o.have]||C.have;
      h+='<div class="border border-'+c.cls+'-200 bg-'+c.cls+'-50/40 rounded-xl p-2.5">';
      h+='<div class="flex items-start gap-2">';
      h+='<span class="text-[13px] shrink-0 leading-none mt-0.5">'+c.dot+'</span>';
      h+='<div class="min-w-0 flex-1">';
      h+='<div class="text-[12.5px] font-bold text-slate-800 leading-snug">'+escapeHtml(o.title)+'</div>';
      h+='<div class="flex flex-wrap gap-1 mt-1 text-[9px]">';
      h+='<span class="px-1.5 py-0.5 rounded bg-white border text-slate-500">'+escapeHtml(R.KIND[o.kind].label)+'</span>';
      h+='<span class="px-1.5 py-0.5 rounded bg-white border text-slate-500">'+escapeHtml(o.medium)+'</span>';
      if(o.who) h+='<span class="px-1.5 py-0.5 rounded bg-white border text-slate-500">'+escapeHtml(o.who)+'</span>';
      h+='</div>';

      (o.gaps||[]).forEach(g=>{
        h+='<div class="mt-1 text-[10.5px] text-'+c.cls+'-800 bg-white/70 rounded-lg px-2 py-1">⚠ '+escapeHtml(g)+'</div>';
      });
      if(o.note) h+='<div class="mt-1 text-[10px] text-slate-500 leading-relaxed">'+escapeHtml(o.note)+'</div>';

      h+='<details class="mt-1"><summary class="cursor-pointer text-[9.5px] text-slate-400 font-bold">2026 根據</summary>';
      h+='<div class="mt-1 space-y-0.5">';
      (o.ev||[]).forEach(e=>h+='<div class="text-[9.5px] font-mono text-slate-500 break-all">'+escapeHtml(e)+'</div>');
      h+='</div></details>';

      h+='</div></div></div>';
    });
    h+='</div>';
    return h;
  },

  obSetTier(t){ this.obTier=t; this.obOnly=''; this.renderOutputBoard(); },
  obSetOnly(k){
    this.obOnly=(this.obOnly===k?'':k);
    const b=document.getElementById('ob-body');
    if(b){ b.innerHTML=this.obBodyHTML(); } else { this.renderOutputBoard(); }
  },

  renderOutputBoard(box){
    const el=box||document.getElementById('module-content')||document.getElementById('group-tab-group_outputs');
    if(!el) return;
    el.innerHTML=this.obHTML();
  }

});
