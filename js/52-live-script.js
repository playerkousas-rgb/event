/* 52-live-script.js — 活司儀稿：稿唔係檔案，係一個會自己跟住現場變嘅位置（v26）
   ──────────────────────────────────────────────────────────────────────────
   用戶原話：「像司儀稿這些會不停改的東西，我想先讓他能放在指定位置會自動 UPDATE，
               未來當然聯通點名，就更實在。優異旅團他報到了才讀出來，沒報到就不讀，
               只動同步」

   ── 2026 嗰份稿實際長成點（唔係估，係 mock_demo.json 原文）──

     司儀（男）：首先係頒發小童軍支部，今年共有  38   個小童軍團獲獎。
                出席頒獎禮的有：
                請參閱附件（小童軍優異旅團）        ← 名單唔喺稿度，要揭附件

     司儀（女）：出席頒獎禮嘅有     位，佢哋係：     ← 一片空白，等人手填
                請參閱附件（榮譽童軍獎章名單）

                今日共有＿＿位總監接受「總監委任書」  ← 底線，等人手填

   三個洞，三種慘：
     ① 「請參閱附件」—— 司儀一邊讀稿一邊揭另一份檔，而嗰份檔自己又不停改版
     ② 「出席頒獎禮嘅有＿＿位」—— 要等報到完先填得到，但稿星期五已經印好
     ③ 版本 V1→V5 —— 每次有旅團加減就要重出一次，然後要通知所有人換版

   ── 呢個檔做乜 ──

   稿唔再係一份檔案。骨架（司儀講嘅話）照舊，但入面啲洞改成【活位】：

     活位               由邊度嚟                      幾時變
     獲獎總數 38        ceremony.meritRoster 計       名單改就變
     出席 N 位          merit_award 點名 TICK         現場剔一個就變
     出席名單           meritRoster × 點名            現場剔一個就變

   所以：
     • 冇 V6 V7 —— 冇版本，因為冇檔案。開個位就係最新。
     • 報到咗先讀 —— 未 TICK 嘅旅團自動劃走（仍然見到，因為可能臨時到，
       一 TICK 就即刻跳返入稿）。
     • 只動同步 —— 冇人要手動改稿。

   ── 一個來源，兩種寫法（呢個係故意嘅，唔係 bug）──
     讀稿要「港島第六旅」　司儀要讀得出口，阿拉伯數字讀唔到
     對帳要「港島第6旅」　 要同報到、派章、訂飯夾得返
   所以 meritRoster 原文照出畀司儀讀，另外用 kmTroop() 出一條標準鍵做對帳。
   ────────────────────────────────────────────────────────────────────────── */

Object.assign(ScoutEventApp.prototype,{

  /* 五個支部：稿入面點叫 ／ meritRoster.section 點樣歸邊
     （meritRoster 有「幼童軍 A 團」「小童軍 B 團」「海童軍團」呢啲，要歸返大支部） */
  LS_SECTIONS:[
    {id:'cub',    label:'小童軍',   test:/^小童軍/},
    {id:'grasshopper', label:'幼童軍', test:/^幼童軍/},
    {id:'scout',  label:'童軍',     test:/^(童軍|海童軍|空童軍)/},
    {id:'venture',label:'深資童軍', test:/^深資/},
    {id:'rover',  label:'樂行童軍', test:/^樂行/}
  ],

  /* 把 meritRoster 按五個支部分好，順便帶埋點名狀態 */
  liveMeritSections(){
    const cer=(this.getCeremonyData?this.getCeremonyData():(this.eventData&&this.eventData.ceremony))||{};
    const master=Array.isArray(cer.meritRoster)?cer.meritRoster:[];
    // 點名狀態：行 key 同 41-roster-lists.js 嗰條一樣（unit|section），所以剔邊度都對得返
    let ticked={};
    try{
      const rows=(typeof this.rosterRows==='function')?this.rosterRows('merit_award'):[];
      rows.forEach(r=>{ if(r&&r._checked) ticked[this.lsRowKey(r)]=true; });
    }catch(e){ ticked={}; }

    return this.LS_SECTIONS.map(sec=>{
      const all=master.filter(r=>sec.test.test(String(r.section||'')));
      const items=all.map(r=>{
        const key=this.lsRowKey(r);
        const km=(typeof this.kmTroop==='function')?this.kmTroop(r.unit):null;
        return {
          unit:r.unit||'',              // 讀稿用：原文中文數字，司儀讀得出
          canon:km?km.canon:'',         // 對帳用：港島第6旅
          area:r.area||'', section:r.section||'',
          present:!!ticked[key], key:key
        };
      });
      const present=items.filter(x=>x.present);
      return {id:sec.id, label:sec.label, total:all.length,
              present:present.length, absent:all.length-present.length, items:items};
    });
  },

  lsRowKey(r){
    const f=[r.unit,r.section];
    return f.map(k=>String(k==null?'':k).trim().toLowerCase().replace(/\s+/g,'')).join('|');
  },

  /* 現場讀稿進度：已點 / 總數 */
  liveMeritTotals(){
    const secs=this.liveMeritSections();
    const t={total:0,present:0};
    secs.forEach(s=>{ t.total+=s.total; t.present+=s.present; });
    t.absent=t.total-t.present;
    t.pct=t.total?Math.round(t.present/t.total*100):0;
    return t;
  },

  /* ── 把 2026 稿入面啲洞換成活位 ──────────────────────────────────
     唔改司儀講嘅字，淨係換咗三種洞：
       「請參閱附件（X優異旅團）」　→　真名單（報到咗先黑字）
       「今年共有 N 個X團獲獎」　　→　實時總數
       「出席頒獎禮嘅有＿＿位」　　→　實時出席數                       */
  liveFillScript(content){
    const secs=this.liveMeritSections();
    const byLabel={}; secs.forEach(s=>byLabel[s.label]=s);
    let html=escapeHtml(String(content||''));
    const self=this;

    // ① 名單：請參閱附件（小童軍優異旅團）
    html=html.replace(/請參閱附件（\s*([^）]*?)優異旅團\s*）/g,(m,label)=>{
      const sec=byLabel[String(label).trim()];
      if(!sec) return self.lsUnresolved(m,'搵唔到呢個支部');
      return self.lsListBlock(sec);
    });

    // ② 總數：今年共有  38   個小童軍團獲獎
    html=html.replace(/共有\s*([0-9０-９]+)\s*個\s*([^\s團]{1,5})團獲獎/g,(m,oldN,label)=>{
      const sec=byLabel[String(label).trim()];
      if(!sec) return m;
      return '共有 '+self.lsNum(sec.total,oldN)+' 個'+escapeHtml(label)+'團獲獎';
    });
    html=html.replace(/獲獎的有\s*([0-9０-９]+)\s*個\s*([^\s團]{1,5})團/g,(m,oldN,label)=>{
      const sec=byLabel[String(label).trim()];
      if(!sec) return m;
      return '獲獎的有 '+self.lsNum(sec.total,oldN)+' 個'+escapeHtml(label)+'團';
    });

    // ③ 出席數：出席頒獎禮嘅有     位，佢哋係：
    //    呢個洞 2026 係空白嘅 —— 要等報到完先知，所以根本填唔切。
    html=html.replace(/出席頒獎禮(嘅|的)有\s*([0-9０-９]*)\s*位/g,(m,de)=>{
      return '出席頒獎禮'+de+'有 '+self.lsSlot('attend','（下面個名單有幾多個黑字就係幾多位）')+' 位';
    });

    // ④ 仲未接通嘅洞：照標出嚟，唔好扮冇事
    html=html.replace(/請參閱附件（([^）]*)）/g,(m,what)=>self.lsUnresolved(m,'呢份名單仲未接落系統'));
    html=html.replace(/＿＿+/g,m=>self.lsUnresolved(m,'呢格仲係等人手填'));

    return html;
  },

  lsNum(n,wasRaw){
    const was=String(wasRaw||'').trim();
    const changed=(String(n)!==was);
    const cls=changed?'bg-amber-100 text-amber-900 border-amber-300':'bg-emerald-50 text-emerald-800 border-emerald-200';
    const tip=changed?('稿原本寫 '+was+'，現時名單實際係 '+n):'同稿原本寫嘅一樣';
    return '<b class="px-1.5 py-0.5 rounded border '+cls+' font-black" title="'+escapeHtml(tip)+'">'+n+'</b>';
  },

  lsSlot(id,tip){
    return '<span class="px-1.5 py-0.5 rounded border border-sky-300 bg-sky-50 text-sky-800 font-black" title="'+escapeHtml(tip||'')+'">●</span>';
  },

  lsUnresolved(txt,why){
    return '<span class="px-1 rounded bg-rose-50 text-rose-700 border border-rose-200" title="'+escapeHtml(why)+'">'
         + escapeHtml(txt)+' <i class="fa-solid fa-link-slash text-[9px]"></i></span>';
  },

  /* 一個支部嘅活名單：報到咗黑字（讀），未報到淡色劃走（唔讀） */
  lsListBlock(sec){
    const present=sec.items.filter(x=>x.present);
    const absent =sec.items.filter(x=>!x.present);
    let h='<div class="my-2 border-2 border-sky-300 rounded-xl overflow-hidden not-italic">';
    h+='<div class="bg-sky-100 px-2.5 py-1.5 flex items-center justify-between">';
    h+='<span class="text-[11px] font-black text-sky-900"><i class="fa-solid fa-bolt mr-1"></i>'
      +escapeHtml(sec.label)+'優異旅團　讀呢個名單</span>';
    h+='<span class="text-[10.5px] font-bold text-sky-800">報到 '+present.length+' ／ 共 '+sec.total+'</span>';
    h+='</div>';

    if(!sec.total){ h+='<div class="px-2.5 py-2 text-[11px] text-slate-400">名單仲未入。</div></div>'; return h; }

    h+='<div class="px-2.5 py-2 bg-white">';
    if(present.length){
      h+='<div class="text-[10px] font-bold text-emerald-700 mb-1">讀出以下 '+present.length+' 個：</div>';
      h+='<div class="flex flex-wrap gap-1">';
      present.forEach(x=>{
        h+='<span class="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] font-bold text-slate-800" title="'
          +escapeHtml((x.area||'')+'　對帳鍵 '+(x.canon||'—'))+'">'+escapeHtml(x.unit)+'</span>';
      });
      h+='</div>';
    }else{
      h+='<div class="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 font-bold">'
        +'呢個支部一個都未報到 —— 暫時冇嘢讀，跳過呢段。</div>';
    }
    if(absent.length){
      h+='<details class="mt-2"><summary class="cursor-pointer text-[10px] font-bold text-slate-400">'
        +'未報到 '+absent.length+' 個（唔讀，一剔到就自動跳返上面）</summary>';
      h+='<div class="flex flex-wrap gap-1 mt-1">';
      absent.forEach(x=>{
        h+='<span class="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-400 line-through">'
          +escapeHtml(x.unit)+'</span>';
      });
      h+='</div></details>';
    }
    h+='</div></div>';
    return h;
  },

  /* ── 指定位置：永遠係最新，冇版本 ──────────────────────────────── */
  liveScriptHTML(){
    const list=(this.eventData&&this.eventData.ceremony&&this.eventData.ceremony.mc_scripts)||[];
    const T=this.liveMeritTotals();
    const idx=Math.max(0,Math.min(this.lsPick|0,list.length-1));
    const cur=list[idx];

    let h='<div class="space-y-3">';

    h+='<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] leading-relaxed text-sky-900">';
    h+='<b><i class="fa-solid fa-tower-broadcast mr-1"></i>呢個位就係司儀稿本身，唔係一份檔案。</b><br>';
    h+='冇 V6 V7，因為冇檔案可以出版本。名單改咗、現場剔多一個，呢度即刻就係最新。<br>';
    h+='<span class="text-sky-700">黑字＝報到咗，讀。劃走咗＝未報到，跳過。一剔到就自動跳返入稿。</span>';
    h+='</div>';

    h+='<div class="bg-white border rounded-xl p-2.5">';
    h+='<div class="flex items-center justify-between mb-1.5">';
    h+='<span class="text-[11px] font-bold text-slate-600">優異旅團報到進度</span>';
    h+='<span class="text-[10px] text-slate-400">點名入口：典禮儀式 → 優異旅團獲獎名單</span>';
    h+='</div>';
    h+='<div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">';
    h+='<div class="h-full bg-emerald-500 transition-all" style="width:'+T.pct+'%"></div></div>';
    h+='<div class="grid grid-cols-3 gap-1.5 mt-2">';
    h+='<div class="text-center bg-emerald-50 rounded-lg py-1.5"><div class="text-[16px] font-black text-emerald-700">'+T.present+'</div><div class="text-[9px] text-slate-500">已報到・要讀</div></div>';
    h+='<div class="text-center bg-slate-50 rounded-lg py-1.5"><div class="text-[16px] font-black text-slate-400">'+T.absent+'</div><div class="text-[9px] text-slate-500">未報到・唔讀</div></div>';
    h+='<div class="text-center bg-white border rounded-lg py-1.5"><div class="text-[16px] font-black text-slate-700">'+T.total+'</div><div class="text-[9px] text-slate-500">名單總數</div></div>';
    h+='</div>';
    h+='<div class="grid grid-cols-5 gap-1 mt-1.5">';
    this.liveMeritSections().forEach(s=>{
      const c=s.present?'text-emerald-700':'text-slate-300';
      h+='<div class="text-center bg-slate-50 rounded py-1"><div class="text-[12px] font-black '+c+'">'
        +s.present+'<span class="text-[9px] text-slate-400">/'+s.total+'</span></div>'
        +'<div class="text-[8.5px] text-slate-400">'+escapeHtml(s.label)+'</div></div>';
    });
    h+='</div></div>';

    if(!list.length){ h+='<div class="bg-white border rounded-xl p-4 text-[12px] text-slate-400">仲未有司儀稿。</div></div>'; return h; }

    h+='<div class="flex gap-1.5 flex-wrap">';
    list.forEach((m,i)=>{
      const on=(i===idx);
      h+='<button onclick="app.lsPickScript('+i+')" class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold '
        +(on?'bg-sky-600 text-white':'bg-white border text-slate-600')+'">'
        +escapeHtml(String(m.part||(i+1)))+'　'+escapeHtml(String(m.title||'').replace(/\s*司儀稿\s*$/,''))+'</button>';
    });
    h+='</div>';

    h+='<div class="bg-white border rounded-xl overflow-hidden">';
    h+='<div class="bg-slate-50 border-b px-3 py-2">';
    h+='<div class="text-[12.5px] font-black text-slate-800">'+escapeHtml(cur.title||'')+'</div>';
    h+='<div class="text-[10px] text-slate-500 mt-0.5">司儀：'+escapeHtml(cur.mc||'—')+'</div>';
    h+='<div class="mt-1.5 flex flex-wrap gap-1 text-[9.5px]">';
    h+='<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">活版本・一直跟住現場</span>';
    h+='<span class="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">原檔 '+escapeHtml(String(cur.version||''))+'　'+escapeHtml(String(cur.updated_at||''))+'　已經唔使再出新版</span>';
    if(cur.file_url) h+='<a href="'+escapeHtml(cur.file_url)+'" target="_blank" rel="noopener" class="px-1.5 py-0.5 rounded bg-white border text-slate-500">開啟原版 PDF</a>';
    h+='</div></div>';
    h+='<div class="px-3 py-3 text-[12.5px] leading-[1.9] text-slate-800 whitespace-pre-wrap font-serif">'
      + this.liveFillScript(cur.content||'') + '</div>';
    h+='</div>';

    h+='<div class="bg-white border rounded-xl p-3 text-[10.5px] text-slate-500 leading-relaxed">';
    h+='<b class="text-slate-700">稿入面啲色代表乜</b><br>';
    h+='<span class="px-1.5 py-0.5 rounded border bg-emerald-50 border-emerald-200 text-emerald-800 font-black">38</span> 數字同原稿一樣　';
    h+='<span class="px-1.5 py-0.5 rounded border bg-amber-100 border-amber-300 text-amber-900 font-black">41</span> 數字已經同原稿唔同，呢度係啱嗰個　';
    h+='<span class="px-1 rounded bg-rose-50 text-rose-700 border border-rose-200">請參閱附件（…）<i class="fa-solid fa-link-slash text-[9px]"></i></span> 呢個洞仲未接落系統';
    h+='</div>';

    h+='</div>';
    return h;
  },

  lsPickScript(i){ this.lsPick=i|0; this.renderLiveScript(); },

  renderLiveScript(box){
    const el=box||document.getElementById('module-content')||document.getElementById('group-tab-cer_live_script');
    if(!el) return;
    el.innerHTML=this.liveScriptHTML();
  }

});
