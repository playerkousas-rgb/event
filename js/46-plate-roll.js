/* 46-plate-roll.js — 協調組「點車牌」（v20）
   ──────────────────────────────────────────────────────────────────────────
   點解要有：
     警察學院嘅閘門係警察睇，放唔放行由佢哋決定，唔係我哋。
     我哋可以做嘅只有兩件事 ——
       ① 事前：把所有要入校嘅車牌，一次過整理成一份名單交畀警校；
       ② 當日：閘口有人問「呢架車有冇報過？」時，三秒搵得返。
     所以呢個工具唔係「批核系統」（批核喺車輛通行證度做），
     係「申報清單＋閘口查冊」。界面每一處都寫明：最終放行權在警方。

   車牌三個來源，全部自動歸邊，唔使人手再抄一次：
     ・嘉賓     ← guest_roster.guests[].car_plate（已填 23／102）
     ・工作人員 ← supplies.vehicle_passes[]（已批核嗰啲先算數）
     ・其他     ← 本機自行加（供應商、租車、臨時加車）
   ────────────────────────────────────────────────────────────────────────── */
Object.assign(ScoutEventApp.prototype,{

  PLATE_SOURCES:[
    {k:'guest', label:'嘉賓', icon:'fa-solid fa-user-tie', cls:'bg-violet-100 text-violet-700'},
    {k:'staff', label:'工作人員', icon:'fa-solid fa-id-badge', cls:'bg-sky-100 text-sky-700'},
    {k:'other', label:'其他／供應商', icon:'fa-solid fa-truck', cls:'bg-amber-100 text-amber-800'}
  ],

  plateStoreKey(){ return 'event_plate_roll_v20_'+((this.currentEvent&&this.currentEvent.event_id)||'isd_2026'); },
  getPlateData(){
    try{
      const o=JSON.parse(localStorage.getItem(this.plateStoreKey())||'null');
      if(o&&typeof o==='object') return {extra:o.extra||[], arrived:o.arrived||{}, submitted:o.submitted||null, notes:o.notes||{}};
    }catch(e){}
    return {extra:[], arrived:{}, submitted:null, notes:{}};
  },
  savePlateData(d){
    try{ localStorage.setItem(this.plateStoreKey(), JSON.stringify(d||{})); }catch(e){}
    if(!this.mockMode && this.gasUrl){
      try{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'PlateRoll',record:{event_id:(this.currentEvent&&this.currentEvent.event_id)||'isd_2026',data_json:JSON.stringify(d),updated_by:(this.currentUser&&this.currentUser.name)||''}})}).catch(()=>{});
      }catch(e){}
    }
  },

  /* 車牌正規化：去走空格同符號、全大寫，用嚟比對（HK 車牌冇統一格式，人手輸入好易唔同） */
  plateNorm(s){ return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,''); },
  plateFmt(s){ return String(s||'').toUpperCase().trim(); },

  /* 三個來源合埋一張表 */
  plateRows(){
    const out=[], seen=new Map();
    const push=r=>{
      const n=this.plateNorm(r.plate);
      if(!n) return;
      if(seen.has(n)){                       // 同一個車牌兩處出現（例如嘉賓又係工作人員）
        const ex=seen.get(n);
        if(ex.owner!==r.owner) ex.dup=(ex.dup||[]).concat([r.owner+'（'+r.source_label+'）']);
        return;
      }
      const row=Object.assign({norm:n},r);
      seen.set(n,row); out.push(row);
    };

    /* ① 嘉賓 */
    const guests=(this.eventData&&this.eventData.guest_roster&&this.eventData.guest_roster.guests)||[];
    guests.forEach(g=>{
      if(!g||!g.car_plate||!String(g.car_plate).trim()) return;
      push({ plate:this.plateFmt(g.car_plate), source:'guest', source_label:'嘉賓',
        owner:g.name||'', detail:String(g.title||'').replace(/\s*\n\s*/g,'・'),
        extra:[g.ceremony_part_2?'出席會操':'', g.guest_tea?'茶聚':'', g.event_bus?'有大會車':''].filter(Boolean).join('・'),
        ref:g.id||'' });
    });

    /* ② 工作人員車輛通行證（只計已批核） */
    let sup=null;
    try{ sup=this.getSuppliesData?this.getSuppliesData():(this.eventData&&this.eventData.supplies); }catch(e){ sup=this.eventData&&this.eventData.supplies; }
    ((sup&&sup.vehicle_passes)||[]).forEach(v=>{
      if(!v||!v.plate) return;
      if(v.status&&v.status!=='approved') return;
      push({ plate:this.plateFmt(v.plate), source:'staff', source_label:'工作人員',
        owner:v.driver_name||v.requested_by||'', detail:[v.group_name,v.purpose].filter(Boolean).join('・'),
        extra:[v.parking_location?'泊 '+v.parking_location:'', v.entry_date?'入 '+v.entry_date:''].filter(Boolean).join('・'),
        ref:v.id||'' });
    });

    /* ③ 自行加（供應商／臨時） */
    (this.getPlateData().extra||[]).forEach(e=>{
      if(!e||!e.plate) return;
      push({ plate:this.plateFmt(e.plate), source:e.source||'other',
        source_label:(this.PLATE_SOURCES.find(s=>s.k===(e.source||'other'))||{}).label||'其他',
        owner:e.owner||'', detail:e.detail||'', extra:e.extra||'', ref:e.id||'', manual:true });
    });

    return out;
  },

  plateStats(){
    const rows=this.plateRows(), d=this.getPlateData();
    const by=k=>rows.filter(r=>r.source===k).length;
    return { total:rows.length, guest:by('guest'), staff:by('staff'), other:by('other'),
      arrived:rows.filter(r=>d.arrived[r.norm]).length, dup:rows.filter(r=>r.dup&&r.dup.length).length,
      submitted:d.submitted };
  },

  /* ══════════ 版面 ══════════ */
  plateQ:'', plateView:'all',

  renderPlateRoll(box){
    const el=box||document.getElementById('module-content');
    if(!el) return;
    el.innerHTML=this.plateRollHTML();
  },
  platePanelRefresh(){
    const b=document.getElementById('plate-body');
    if(b) b.innerHTML=this.plateBodyHTML();
    const h=document.getElementById('plate-head');
    if(h) h.innerHTML=this.plateHeadHTML();
  },
  plateSetQ(v){ this.plateQ=String(v||''); this.platePanelRefresh(); },
  plateSetView(v){ this.plateView=v; this.platePanelRefresh(); },

  plateHeadHTML(){
    const s=this.plateStats();
    const card=(v,l,cls)=>`<div class="rounded-xl py-2 text-center ${cls}"><div class="text-[19px] font-extrabold leading-none">${v}</div><div class="text-[9.5px] font-bold mt-0.5">${l}</div></div>`;
    return `<div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
      ${card(s.total,'總車牌','bg-slate-800 text-white')}
      ${card(s.guest,'嘉賓','bg-violet-50 text-violet-700 border border-violet-200')}
      ${card(s.staff,'工作人員','bg-sky-50 text-sky-700 border border-sky-200')}
      ${card(s.other,'其他／供應商','bg-amber-50 text-amber-800 border border-amber-200')}
      ${card(s.arrived,'當日已到','bg-emerald-600 text-white')}
    </div>
    ${s.dup?`<div class="mt-2 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">⚠️ 有 ${s.dup} 個車牌喺兩處都出現（已自動合併為一行，下面會標示）</div>`:''}
    ${s.submitted?`<div class="mt-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">✓ 已於 ${escapeHtml(s.submitted.at)} 由 ${escapeHtml(s.submitted.by)} 標示「已交警校」（${s.submitted.count} 個車牌）。之後新增嘅車牌要另行補交。</div>`
      :`<div class="mt-2 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">⚠️ 未標示交過警校。名單要喺截止前交，否則閘口冇得對。</div>`}`;
  },

  plateRollHTML(){
    return `
      <div class="space-y-3">
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] leading-relaxed text-slate-700">
          <b><i class="fa-solid fa-shield-halved mr-1 text-slate-500"></i>先講清楚：</b>
          警察學院閘門由<b>警方</b>把守，<b>放唔放行由警察決定</b>，呢度唔係批核系統。
          呢一頁淨係做兩件事：<b>①</b> 把全部要入校嘅車牌砌成一份名單交畀警校；
          <b>②</b> 當日閘口有人問「架車報咗未」，即刻查得到。
          車輛通行證嘅批核照舊喺「🚗 車輛批核」做。
        </div>

        <div id="plate-head">${this.plateHeadHTML()}</div>

        <div class="bg-white border rounded-xl p-3 flex gap-2 items-center flex-wrap">
          <div class="relative flex-1 min-w-[160px]">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[11px]"></i>
            <input id="plate-q" value="${escapeHtml(this.plateQ||'')}" oninput="app.plateSetQ(this.value)" placeholder="查車牌（打尾 4 位都搵到）／姓名" class="w-full pl-8 pr-3 py-2 border rounded-xl text-[12px]">
          </div>
          <select onchange="app.plateSetView(this.value)" class="px-3 py-2 border rounded-xl text-[12px]">
            ${[['all','全部'],['guest','嘉賓'],['staff','工作人員'],['other','其他／供應商'],['pending','未到'],['arrived','已到']]
              .map(([v,l])=>`<option value="${v}" ${this.plateView===v?'selected':''}>${l}</option>`).join('')}
          </select>
          <button onclick="app.plateAdd()" class="bg-slate-800 text-white text-[11px] font-bold rounded-lg px-3 py-2"><i class="fa-solid fa-plus mr-1"></i>加車牌</button>
          <button onclick="app.plateExport()" class="bg-white border text-slate-600 text-[11px] font-bold rounded-lg px-3 py-2"><i class="fa-solid fa-file-excel mr-1"></i>匯出</button>
          <button onclick="app.platePrintSubmission()" class="bg-indigo-600 text-white text-[11px] font-bold rounded-lg px-3 py-2"><i class="fa-solid fa-print mr-1"></i>交警校名單</button>
          <button onclick="app.plateMarkSubmitted()" class="bg-emerald-600 text-white text-[11px] font-bold rounded-lg px-3 py-2"><i class="fa-solid fa-check mr-1"></i>標示已交</button>
        </div>

        <div id="plate-body">${this.plateBodyHTML()}</div>
      </div>`;
  },

  plateFiltered(){
    const rows=this.plateRows(), d=this.getPlateData();
    const q=this.plateNorm(this.plateQ), qRaw=String(this.plateQ||'').trim();
    return rows.filter(r=>{
      if(this.plateView==='arrived'&&!d.arrived[r.norm]) return false;
      if(this.plateView==='pending'&&d.arrived[r.norm]) return false;
      if(['guest','staff','other'].includes(this.plateView)&&r.source!==this.plateView) return false;
      if(!qRaw) return true;
      if(q&&r.norm.includes(q)) return true;                       // 車牌（容許打尾 4 位）
      return (r.owner+' '+r.detail).includes(qRaw);
    });
  },

  plateBodyHTML(){
    const rows=this.plateFiltered(), d=this.getPlateData();
    if(!rows.length) return '<div class="bg-white border-2 border-dashed rounded-xl p-8 text-center text-[12px] text-slate-400">搵唔到</div>';
    return `<div class="space-y-1.5">${rows.map(r=>{
      const on=!!d.arrived[r.norm];
      const src=this.PLATE_SOURCES.find(s=>s.k===r.source)||this.PLATE_SOURCES[2];
      return `<div class="bg-white border rounded-xl p-2.5 flex items-center gap-3 ${on?'border-emerald-300 bg-emerald-50/40':''}">
        <button onclick="app.platePresent('${escapeHtml(r.norm)}')" class="shrink-0 w-9 h-9 rounded-lg border-2 ${on?'bg-emerald-600 border-emerald-600 text-white':'bg-white border-slate-300 text-transparent'} text-[13px]" title="到咗">
          <i class="fa-solid fa-check"></i>
        </button>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <b class="text-[15px] tracking-wider font-mono">${escapeHtml(r.plate)}</b>
            <span class="${src.cls} text-[9.5px] font-bold px-1.5 py-0.5 rounded"><i class="${src.icon} mr-0.5"></i>${src.label}</span>
            ${r.dup&&r.dup.length?`<span class="bg-amber-100 text-amber-800 text-[9.5px] font-bold px-1.5 py-0.5 rounded" title="${escapeHtml(r.dup.join('；'))}">亦見於 ${r.dup.length} 處</span>`:''}
            ${r.manual?'<span class="bg-slate-100 text-slate-500 text-[9.5px] px-1.5 py-0.5 rounded">手動</span>':''}
          </div>
          <div class="text-[11px] text-slate-600 truncate">${escapeHtml(r.owner||'—')}${r.detail?'・'+escapeHtml(r.detail):''}</div>
          ${r.extra?`<div class="text-[10px] text-slate-400 truncate">${escapeHtml(r.extra)}</div>`:''}
        </div>
        ${r.manual?`<button onclick="app.plateDel('${escapeHtml(r.ref)}')" class="shrink-0 text-slate-300 px-1.5"><i class="fa-solid fa-xmark"></i></button>`:''}
      </div>`;
    }).join('')}</div>`;
  },

  /* 閘口撳「到咗」：只係我哋自己嘅紀錄，唔代表警察放咗行 */
  platePresent(norm){
    const d=this.getPlateData();
    if(d.arrived[norm]) delete d.arrived[norm];
    else d.arrived[norm]={at:new Date().toTimeString().slice(0,5),by:(this.currentUser&&this.currentUser.name)||''};
    this.savePlateData(d);
    this.platePanelRefresh();
  },

  plateAdd(){
    const plate=prompt('車牌（例：AB1234）'); if(!plate||!plate.trim()) return;
    const owner=prompt('車主／司機姓名')||'';
    const detail=prompt('用途／單位（例：供應商・音響器材）')||'';
    const d=this.getPlateData();
    d.extra=d.extra||[];
    d.extra.push({id:'pl_'+Date.now(),plate:this.plateFmt(plate),owner,detail,source:'other'});
    this.savePlateData(d);
    showToast('已加入：'+this.plateFmt(plate)+'（記得補交畀警校）','success');
    this.platePanelRefresh();
  },
  plateDel(id){
    const d=this.getPlateData();
    d.extra=(d.extra||[]).filter(x=>x.id!==id);
    this.savePlateData(d);
    this.platePanelRefresh();
  },

  plateMarkSubmitted(){
    const n=this.plateRows().length;
    if(!confirm('標示呢 '+n+' 個車牌「已交警校」？\n（之後再加嘅車牌要另行補交）')) return;
    const d=this.getPlateData();
    d.submitted={at:new Date().toISOString().slice(0,16).replace('T',' '),by:(this.currentUser&&this.currentUser.name)||'',count:n};
    this.savePlateData(d);
    showToast('已標示交咗警校','success');
    this.platePanelRefresh();
  },

  plateExport(){
    const rows=this.plateRows();
    const out=[['車牌','身份','車主／司機','單位／職銜','備註']].concat(
      rows.map(r=>[r.plate,r.source_label,r.owner,r.detail,r.extra]));
    try{
      if(typeof downloadExcel==='function'){ downloadExcel('交警察學院車牌名單.xlsx',out); return; }
    }catch(e){}
    showToast('匯出失敗','error');
  },

  platePrintSubmission(){
    const rows=this.plateRows();
    const ev=(this.currentEvent&&(this.currentEvent.name||this.currentEvent.event_name))||'港島童軍繽紛日';
    const w=window.open('','_blank'); if(!w){ showToast('瀏覽器擋咗新視窗','warning'); return; }
    w.document.write(`<!doctype html><meta charset="utf-8"><title>交警察學院車牌名單</title>
      <style>body{font-family:"Microsoft JhengHei","PingFang HK",sans-serif;padding:22px;font-size:12px}
      h1{font-size:17px;margin:0 0 2px}.m{color:#555;margin-bottom:12px}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:5px 7px;text-align:left}
      th{background:#eee}td.p{font-family:monospace;font-size:14px;letter-spacing:1px;font-weight:bold}
      .f{margin-top:14px;color:#666;font-size:11px}@media print{body{padding:0}}</style>
      <h1>${escapeHtml(ev)}・入校車輛車牌名單</h1>
      <div class="m">共 ${rows.length} 架｜製表：${escapeHtml((this.currentUser&&this.currentUser.name)||'')}｜${new Date().toISOString().slice(0,10)}</div>
      <table><tr><th style="width:34px">#</th><th style="width:110px">車牌</th><th style="width:70px">身份</th><th>車主／司機</th><th>單位／職銜</th></tr>
      ${rows.map((r,i)=>`<tr><td>${i+1}</td><td class="p">${escapeHtml(r.plate)}</td><td>${escapeHtml(r.source_label)}</td><td>${escapeHtml(r.owner||'')}</td><td>${escapeHtml(r.detail||'')}</td></tr>`).join('')}
      </table>
      <div class="f">※ 本名單供香港警察學院保安審批之用。入校放行與否由警察學院閘門當值人員決定，本會不作保證。<br>
      ※ 名單提交後如有新增車輛，須另行補交。</div>`);
    w.document.close(); setTimeout(()=>{ try{ w.print(); }catch(e){} },400);
  }

});
