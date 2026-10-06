/* 47-pc-content-editor.js — 公眾頻道內容・各組自助編輯（v21）
   ──────────────────────────────────────────────────────────────────────────
   目標：邊個組嘅嘢邊個組自己改，隨時改，唔使搵人郁程式。

   分工（呢條界好重要）：
     ┌ 結構 ─ 分眾入口、頁簽組合、section_labels、資料之間點連 ─ 由我哋定，鎖死，組改唔到。
     └ 內容 ─ 每一格嘅字、時間、地點、清單 ─ 由負責組自己改，即改即生效。
   所以組點改都唔會整爛個框；而框一鎖，自動更新先至信得過。

   技術：
     ・PC_CONTENT_SCHEMA 就係「2027 欄位合約」本身 —— 表單由佢自動生成，
       改 schema 等於同時改表單同改合約，兩邊唔會脫節。
     ・改動存落 overrides（唔會覆蓋 data/mock_demo.json），開頁時疊返上去。
     ・每格有 updated_by／updated_at ＝ 原地改，冇 R2 R3 版本地獄。
   ────────────────────────────────────────────────────────────────────────── */

/* 欄位型別：
     text     單行
     textarea 多行
     list     一行一項（string[]）
     pairs    兩欄表（[[左,右],…]），cols:['標題','內容']
     objlist  物件清單，sub:[{k,label,type}]
*/
const PC_CONTENT_SCHEMA = [
  { key:'banner', label:'活動基本資訊', icon:'fa-solid fa-circle-info', owner:'行政組',
    note:'公眾一入嚟第一眼見到嗰幅。改咗即刻全部七類入口一齊變。',
    fields:[
      {k:'tag',label:'標籤',type:'text'},
      {k:'event_name',label:'活動名稱',type:'text'},
      {k:'en_name',label:'英文名稱',type:'text'},
      {k:'date',label:'日期',type:'text'},
      {k:'time',label:'時間',type:'text'},
      {k:'location',label:'地點',type:'text'},
      {k:'weather_rule',label:'惡劣天氣安排',type:'textarea'},
      {k:'news.text',label:'最新消息',type:'textarea',hint:'留空＝唔顯示嗰條橫額'},
      {k:'news.updated_at',label:'消息日期',type:'text'},
      {k:'news.updated_by',label:'消息發布者',type:'text'}
    ]},

  { key:'program', label:'全日程序', icon:'fa-regular fa-calendar-check', owner:'協調組',
    fields:[
      {k:'now_label',label:'現時階段標示',type:'text'},
      {k:'now_time',label:'現時時間',type:'text'},
      {k:'note',label:'附註',type:'textarea'},
      {k:'items',label:'程序項目',type:'objlist',sub:[
        {k:'time',label:'時間',type:'text'},{k:'title',label:'項目',type:'text'},
        {k:'detail',label:'詳情',type:'textarea'}]}
    ]},

  { key:'transport', label:'交通與入場', icon:'fa-solid fa-bus', owner:'協調組',
    fields:[
      {k:'map_title',label:'地圖標題',type:'text'},
      {k:'map_url',label:'地圖連結',type:'text'},
      {k:'checkin',label:'入場提示',type:'textarea'},
      {k:'items',label:'交通方式',type:'objlist',sub:[
        {k:'title',label:'方式／入口',type:'text'},{k:'detail',label:'詳情',type:'textarea'}]}
    ]},

  { key:'lunch', label:'午膳安排', icon:'fa-solid fa-utensils', owner:'協調組',
    fields:[
      {k:'title',label:'標題',type:'text'},
      {k:'headline',label:'重點',type:'textarea'},
      {k:'note',label:'附註',type:'textarea'},
      {k:'rows',label:'安排',type:'pairs',cols:['項目','內容']}
    ]},

  { key:'ceremony_flow', label:'典禮儀式流程', icon:'fa-solid fa-award', owner:'會操及典禮組',
    fields:[
      {k:'title',label:'標題',type:'text'},
      {k:'venue',label:'場地',type:'text'},
      {k:'dress',label:'服裝',type:'text'},
      {k:'salute_note',label:'敬禮提示',type:'textarea'},
      {k:'note',label:'附註',type:'textarea'},
      {k:'public_note',label:'公眾注意',type:'textarea'}
    ]},

  { key:'seating', label:'座位表', icon:'fa-solid fa-chair', owner:'會操及典禮組',
    fields:[
      {k:'title',label:'標題',type:'text'},
      {k:'subtitle',label:'副題',type:'text'},
      {k:'stage_label',label:'台嘅標示',type:'text'},
      {k:'my_seat',label:'搵自己位嘅說明',type:'textarea'},
      {k:'rules',label:'座位規則',type:'list'}
    ]},

  { key:'mess_ceremony', label:'午膳儀式（嘉賓）', icon:'fa-solid fa-champagne-glasses', owner:'會操及典禮組',
    fields:[
      {k:'title',label:'標題',type:'text'},
      {k:'subtitle',label:'副題',type:'text'},
      {k:'time',label:'時間',type:'text'},
      {k:'mc',label:'司儀',type:'text'},
      {k:'intro',label:'引言',type:'textarea'},
      {k:'reminders',label:'提示',type:'list'},
      {k:'rows',label:'流程',type:'objlist',sub:[
        {k:'time',label:'時間',type:'text'},{k:'item',label:'內容',type:'text'},{k:'who',label:'對象',type:'text'}]}
    ]},

  { key:'banner_guest', label:'嘉賓專屬安排', icon:'fa-solid fa-user-tie', owner:'嘉賓接待組',
    fields:[
      {k:'title',label:'標題',type:'text'},
      {k:'rows',label:'安排',type:'pairs',cols:['項目','內容']}
    ]},

  { key:'donate', label:'童心捐贈', icon:'fa-solid fa-heart', owner:'服務及發展組',
    note:'收／唔收清單同規格改咗，公眾出門前就睇到——呢度最緊要準。',
    fields:[
      {k:'title',label:'標題',type:'text'},
      {k:'tagline',label:'大字標語',type:'text'},
      {k:'why',label:'點解要捐',type:'textarea'},
      {k:'eligible',label:'邊個可以捐',type:'textarea'},
      {k:'collect.date',label:'收集日期',type:'text'},
      {k:'collect.time',label:'收集時間',type:'text'},
      {k:'collect.place',label:'收集地點／攤位編號',type:'text'},
      {k:'steps',label:'四步流程',type:'objlist',sub:[
        {k:'t',label:'標題',type:'text'},{k:'d',label:'說明',type:'textarea'}]},
      {k:'schemes',label:'捐贈計劃',type:'objlist',sub:[
        {k:'name',label:'計劃名稱',type:'text'},
        {k:'beneficiary',label:'受惠機構',type:'text'},
        {k:'beneficiary_note',label:'機構說明',type:'text'},
        {k:'accept',label:'✓ 收呢啲',type:'list'},
        {k:'reject',label:'✕ 唔收呢啲',type:'list'},
        {k:'rules',label:'規格要求',type:'list'},
        {k:'badge',label:'紀念章規則',type:'text'},
        {k:'enquiry',label:'查詢',type:'text'}]},
      {k:'paper.label',label:'紙本表格掣文字',type:'text'},
      {k:'paper.url',label:'紙本表格連結',type:'text'},
      {k:'paper.note',label:'紙本表格說明',type:'textarea'},
      {k:'privacy',label:'私隱說明',type:'textarea'},
      {k:'note',label:'頁尾備註',type:'textarea'}
    ]},

  { key:'help', label:'求助', icon:'fa-solid fa-life-ring', owner:'行政組',
    fields:[
      {k:'hotline',label:'大會熱線',type:'text',hint:'電話＋負責人'},
      {k:'first_aid',label:'急救站',type:'text'},
      {k:'lost_found',label:'失物處理',type:'text'}
    ]},

  { key:'checkin_qr_rule', label:'報到 QR 規則', icon:'fa-solid fa-qrcode', owner:'行政組',
    fields:[
      {k:'headline',label:'標題',type:'text'},
      {k:'detail',label:'說明',type:'textarea'},
      {k:'points',label:'要點',type:'list'}
    ]},

  { key:'notice_rule', label:'通知書規則', icon:'fa-solid fa-file-lines', owner:'秘書處',
    fields:[{k:'',label:'規則說明',type:'textarea'}]},

  { key:'guest_lastmin', label:'嘉賓最後一分鐘變動', icon:'fa-solid fa-bolt', owner:'嘉賓接待組',
    fields:[
      {k:'lesson',label:'經驗教訓',type:'textarea'},
      {k:'events',label:'變動實錄',type:'objlist',sub:[
        {k:'date',label:'日期',type:'text'},{k:'label',label:'發生咩事',type:'text'},
        {k:'detail',label:'詳情',type:'textarea'}]}
    ]},

  { key:'guide_common', label:'共同須知（七類都見到）', icon:'fa-solid fa-book-open', owner:'行政組',
    fields:[{k:'',label:'共同須知',type:'pairs',cols:['項目','內容']}]}
];

/* ══════════════════════════════════════════════════════════════════════════
   v22【全鎖定】
   文字內容一律唔開放畀組改。原因（用戶定嘅規矩）：
     ・呢啲表單係今年 Google Form 內置化嘅成果，明年直接沿用，唔會大改。
     ・「字眼上嘅改」＝ 換成張表單／EXCEL／WORD／PDF（去「🔗 連結總表」做）。
     ・細字微調由技術方統一改——格式跟規矩，唔係各組各自寫。
   所以下面個表變成【唯讀合約視圖】：睇到邊格屬邊組、幾時由邊份文件嚟，但改唔到。
   將來要局部開放，淨係要喺 PC_CONTENT_UNLOCKED 加返個 key。
   ══════════════════════════════════════════════════════════════════════════ */
const PC_CONTENT_LOCKED = true;
const PC_CONTENT_UNLOCKED = [];     // 例外名單：將來想開返邊個區塊就加喺呢度

/* 結構類 key：唔開放編輯，由我哋定 */
const PC_LOCKED_KEYS = ['audiences','section_labels','guides','notices','schedules','arrivals',
  'manual','guests_rows','booths','venue_map','apply_forms','intake_forms','staff_gate','upload_slots','checkin_demo'];

Object.assign(ScoutEventApp.prototype,{

  PC_CONTENT_SCHEMA, PC_LOCKED_KEYS, PC_CONTENT_LOCKED, PC_CONTENT_UNLOCKED,

  /* ══════ 存取 ══════ */
  pcEditStoreKey(){ return 'event_pc_content_v21_'+((this.currentEvent&&this.currentEvent.event_id)||'mock_demo'); },
  getPcOverrides(){
    try{ const o=JSON.parse(localStorage.getItem(this.pcEditStoreKey())||'null'); if(o&&typeof o==='object') return o; }catch(e){}
    return {};
  },
  savePcOverrides(o){
    try{ localStorage.setItem(this.pcEditStoreKey(), JSON.stringify(o||{})); }catch(e){}
    if(!this.mockMode && this.gasUrl){
      try{ fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'PublicChannelContent',record:{event_id:(this.currentEvent&&this.currentEvent.event_id)||'mock_demo',data_json:JSON.stringify(o),updated_by:(this.currentUser&&this.currentUser.name)||''}})}).catch(()=>{}); }catch(e){}
    }
  },

  /* 疊返落 public_channel_2027（唔郁原始 JSON） */
  pcApplyContentOverrides(base){
    const ov=this.getPcOverrides();
    Object.keys(ov).forEach(sec=>{
      if(this.PC_LOCKED_KEYS.indexOf(sec)>=0) return;       // 結構類：就算 store 入面有都唔疊
      const v=ov[sec]&&ov[sec].value;
      if(v===undefined) return;
      base[sec]=v;
    });
    return base;
  },
  pcContentMeta(sectionKey){ const o=this.getPcOverrides()[sectionKey]; return o?{by:o.by,at:o.at}:null; },

  /* ══════ 權限：本組嘅嘢本組改；主席／行政組／admin 全開 ══════ */
  pcEditCanEdit(sectionKey){
    const def=this.PC_CONTENT_SCHEMA.find(s=>s.key===sectionKey); if(!def) return false;
    // v22 全鎖定：除非喺例外名單，否則邊個都改唔到（連管理員都唔得——規矩就係規矩）
    if(this.PC_CONTENT_LOCKED && this.PC_CONTENT_UNLOCKED.indexOf(sectionKey)<0) return false;
    const u=this.currentUser||{};
    if(this.isAdmin&&this.isAdmin()) return true;
    if(this.isExecViceOrChair&&this.isExecViceOrChair()) return true;
    const g=String(u.group_name||'');
    return g===def.owner || g==='行政組';
  },
  pcEditSectionsForGroup(group){
    const g=String(group||(this.currentUser&&this.currentUser.group_name)||'');
    const all=(this.isAdmin&&this.isAdmin())||(this.isExecViceOrChair&&this.isExecViceOrChair())||g==='行政組';
    return this.PC_CONTENT_SCHEMA.filter(s=>all||s.owner===g);
  },

  /* ══════ 路徑存取（支援 'a.b' ）══════ */
  pcGet(obj,path){
    if(!path) return obj;
    return String(path).split('.').reduce((o,k)=>(o==null?undefined:o[k]),obj);
  },
  pcSet(obj,path,val){
    if(!path) return val;
    const ks=String(path).split('.'); let o=obj;
    for(let i=0;i<ks.length-1;i++){ if(o[ks[i]]==null||typeof o[ks[i]]!=='object') o[ks[i]]={}; o=o[ks[i]]; }
    o[ks[ks.length-1]]=val; return obj;
  },

  /* ══════ 版面 ══════ */
  pcEditOpenKey:'',

  renderPcContentEditor(box){
    const el=box||document.getElementById('module-content'); if(!el) return;
    el.innerHTML=this.pcContentEditorHTML();
  },
  pcEditRefresh(){
    const b=document.getElementById('pc-edit-body');
    if(b) b.innerHTML=this.pcEditBodyHTML();
  },
  pcEditOpen(k){ this.pcEditOpenKey=(this.pcEditOpenKey===k?'':k); this.pcEditRefresh(); },

  pcContentEditorHTML(){
    const mine=this.pcEditSectionsForGroup();
    return `
      <div class="space-y-3">
        ${this.PC_CONTENT_LOCKED?`
        <div class="bg-slate-100 border border-slate-300 rounded-xl p-3 text-[11px] leading-relaxed text-slate-700">
          <b><i class="fa-solid fa-lock mr-1"></i>格式已鎖定——呢頁只可以睇。</b>
          下面係你組負責嗰幾格嘅內容同埋佢哋喺公眾頁邊個位出。呢啲嘢係今年表單內置化嘅成果，明年直接沿用。
          <ul class="list-disc pl-4 mt-1.5 space-y-0.5 text-slate-600">
            <li><b>想換成張表單／EXCEL／WORD／PDF／地圖</b> → 去「🔗 連結總表」自己換，改一次全站同步。</li>
            <li><b>想改入面啲細字</b> → 搵技術組統一改。格式跟規矩，唔係各組各自寫。</li>
            <li><b>2027 想加新項目</b> → 到時再傾，而家先用返 2026 版行通條線。</li>
          </ul>
        </div>`:`
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed text-indigo-900">
          <b><i class="fa-solid fa-pen-to-square mr-1"></i>公眾頻道內容：</b>呢度係你組負責嗰幾格嘅文字。
          改完撳「儲存」即刻生效，公眾頁同手冊會自動用新內容。
          <br><span class="text-indigo-700">分眾入口、頁簽組合呢啲<b>結構</b>唔喺呢度改——框鎖死咗，你點改內容都唔會整爛個版。</span>
        </div>`}
        ${mine.length?'':'<div class="bg-white border-2 border-dashed rounded-xl p-8 text-center text-[12px] text-slate-400">你組暫時冇負責公眾頻道嘅內容</div>'}
        <div id="pc-edit-body">${this.pcEditBodyHTML()}</div>
      </div>`;
  },

  pcEditBodyHTML(){
    const d=this.pcDemoData()||{};
    return this.pcEditSectionsForGroup().map(sec=>{
      const open=this.pcEditOpenKey===sec.key;
      const meta=this.pcContentMeta(sec.key);
      const can=this.pcEditCanEdit(sec.key);
      return `
        <div class="bg-white border rounded-xl overflow-hidden mb-2">
          <button onclick="app.pcEditOpen('${sec.key}')" class="w-full text-left p-3 flex items-center gap-2.5 ${open?'border-b':''}">
            <span class="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><i class="${sec.icon}"></i></span>
            <span class="min-w-0 flex-1">
              <span class="block font-bold text-[13px] text-slate-800">${escapeHtml(sec.label)}</span>
              <span class="block text-[10.5px] text-slate-400">負責：${escapeHtml(sec.owner)}・${sec.fields.length} 格${meta?`・上次改：${escapeHtml(meta.at)} ${escapeHtml(meta.by)}`:(this.PC_CONTENT_LOCKED?'・<i class="fa-solid fa-lock"></i> 已鎖定':'・未改過')}</span>
            </span>
            <i class="fa-solid fa-chevron-${open?'up':'down'} text-slate-300 text-[11px]"></i>
          </button>
          ${open?`<div class="p-3 bg-slate-50 space-y-3">
            ${sec.note?`<div class="text-[11px] text-slate-500 leading-relaxed">${escapeHtml(sec.note)}</div>`:''}
            ${sec.fields.map((f,fi)=>this.pcEditFieldHTML(sec,f,fi,this.pcGet(d[sec.key],f.k))).join('')}
            ${can?`<div class="flex gap-2 pt-1">
              <button onclick="app.pcEditSave('${sec.key}')" class="flex-1 bg-indigo-600 text-white text-[12.5px] font-bold rounded-xl py-2.5"><i class="fa-solid fa-check mr-1"></i>儲存</button>
              <button onclick="app.pcEditReset('${sec.key}')" class="bg-white border text-slate-500 text-[12px] font-bold rounded-xl px-3">還原預設</button>
            </div>`:(this.PC_CONTENT_LOCKED
              ?'<div class="text-[10.5px] text-slate-400 text-center py-2"><i class="fa-solid fa-lock mr-1"></i>格式鎖定中。換文件去「🔗 連結總表」，改細字搵技術組。</div>'
              :'<div class="text-[11px] text-slate-400 text-center py-2">唔係你組負責，只可以睇</div>')}
          </div>`:''}
        </div>`;
    }).join('');
  },

  pcEditFieldHTML(sec,f,fi,val){
    const id=`pce-${sec.key}-${fi}`;
    const dis=this.pcEditCanEdit(sec.key)?'':'disabled';
    const lab=`<div class="text-[11.5px] font-bold text-slate-600 mb-1">${escapeHtml(f.label)}${f.hint?`<span class="font-normal text-slate-400">　${escapeHtml(f.hint)}</span>`:''}</div>`;
    const box=inner=>`<div data-pce-field="${fi}" data-pce-type="${f.type}">${lab}${inner}</div>`;

    if(f.type==='text')
      return box(`<input id="${id}" ${dis} value="${escapeHtml(val==null?'':val)}" class="w-full px-3 py-2 border rounded-xl text-[12.5px] bg-white">`);
    if(f.type==='textarea')
      return box(`<textarea id="${id}" ${dis} rows="3" class="w-full px-3 py-2 border rounded-xl text-[12.5px] bg-white">${escapeHtml(val==null?'':val)}</textarea>`);
    if(f.type==='list')
      return box(`<textarea id="${id}" ${dis} rows="${Math.min(10,Math.max(3,(val||[]).length+1))}" placeholder="一行一項" class="w-full px-3 py-2 border rounded-xl text-[12.5px] bg-white">${escapeHtml((val||[]).join('\n'))}</textarea>
        <div class="text-[10px] text-slate-400 mt-0.5">一行一項</div>`);
    if(f.type==='pairs'){
      const cols=f.cols||['左','右'];
      return box(`<textarea id="${id}" ${dis} rows="${Math.min(12,Math.max(3,(val||[]).length+1))}" class="w-full px-3 py-2 border rounded-xl text-[12.5px] bg-white font-mono">${escapeHtml((val||[]).map(r=>(r[0]||'')+' | '+(r[1]||'')).join('\n'))}</textarea>
        <div class="text-[10px] text-slate-400 mt-0.5">一行一項，用 <b>|</b> 分開「${escapeHtml(cols[0])}」同「${escapeHtml(cols[1])}」</div>`);
    }
    if(f.type==='objlist'){
      const sub=f.sub||[];
      const rows=Array.isArray(val)?val:[];
      return box(`<div class="space-y-2">
        ${rows.map((r,ri)=>`<div class="bg-white border rounded-xl p-2.5 space-y-1.5" data-pce-obj="${ri}">
            <div class="text-[10px] font-bold text-slate-400">#${ri+1}</div>
            ${sub.map(sf=>{
              const v=r?r[sf.k]:'';
              const sid=`${id}-${ri}-${sf.k}`;
              if(sf.type==='list') return `<div><div class="text-[10.5px] text-slate-500">${escapeHtml(sf.label)}（一行一項）</div><textarea id="${sid}" ${dis} rows="${Math.min(8,Math.max(2,(v||[]).length+1))}" class="w-full px-2.5 py-1.5 border rounded-lg text-[12px]">${escapeHtml((v||[]).join('\n'))}</textarea></div>`;
              if(sf.type==='textarea') return `<div><div class="text-[10.5px] text-slate-500">${escapeHtml(sf.label)}</div><textarea id="${sid}" ${dis} rows="2" class="w-full px-2.5 py-1.5 border rounded-lg text-[12px]">${escapeHtml(v==null?'':v)}</textarea></div>`;
              return `<div><div class="text-[10.5px] text-slate-500">${escapeHtml(sf.label)}</div><input id="${sid}" ${dis} value="${escapeHtml(v==null?'':v)}" class="w-full px-2.5 py-1.5 border rounded-lg text-[12px]"></div>`;
            }).join('')}
          </div>`).join('')}
        </div>
        <div class="text-[10px] text-slate-400 mt-1">共 ${rows.length} 項（加／減項目要搵管理員，避免改爛連結）</div>`);
    }
    return box('<div class="text-[11px] text-slate-400">未支援嘅型別</div>');
  },

  /* ══════ 儲存 ══════ */
  pcEditReadSection(sec){
    const d=this.pcDemoData()||{};
    const cur=d[sec.key];
    const out=(cur&&typeof cur==='object'&&!Array.isArray(cur))?JSON.parse(JSON.stringify(cur)):(Array.isArray(cur)?JSON.parse(JSON.stringify(cur)):{});
    let scalar;
    sec.fields.forEach((f,fi)=>{
      const id=`pce-${sec.key}-${fi}`;
      const el=document.getElementById(id);
      let v;
      if(f.type==='objlist'){
        const base=this.pcGet(d[sec.key],f.k)||[];
        v=base.map((r,ri)=>{
          const o=Object.assign({},r);
          (f.sub||[]).forEach(sf=>{
            const se=document.getElementById(`${id}-${ri}-${sf.k}`);
            if(!se) return;
            o[sf.k]= sf.type==='list' ? String(se.value||'').split('\n').map(x=>x.trim()).filter(Boolean) : se.value;
          });
          return o;
        });
      } else if(!el) return;
      else if(f.type==='list') v=String(el.value||'').split('\n').map(x=>x.trim()).filter(Boolean);
      else if(f.type==='pairs') v=String(el.value||'').split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{const i=line.indexOf('|');return i<0?[line,'']:[line.slice(0,i).trim(),line.slice(i+1).trim()];});
      else v=el.value;
      if(!f.k) scalar=v; else this.pcSet(out,f.k,v);
    });
    return scalar!==undefined?scalar:out;
  },

  pcEditSave(key){
    const sec=this.PC_CONTENT_SCHEMA.find(s=>s.key===key); if(!sec) return;
    if(!this.pcEditCanEdit(key)){ showToast('唔係你組負責嘅內容','error'); return; }
    const value=this.pcEditReadSection(sec);
    const ov=this.getPcOverrides();
    ov[key]={value, by:(this.currentUser&&this.currentUser.name)||'', at:new Date().toISOString().slice(0,16).replace('T',' ')};
    this.savePcOverrides(ov);
    // 即刻疊返落記憶體，公眾頁／手冊下次開就係新內容
    const base=this.eventData&&this.eventData.public_channel_2027;
    if(base) base[key]=value;
    showToast('已儲存：'+sec.label+'（公眾頁即刻生效）','success');
    this.pcEditRefresh();
  },

  pcEditReset(key){
    const sec=this.PC_CONTENT_SCHEMA.find(s=>s.key===key); if(!sec) return;
    if(!this.pcEditCanEdit(key)){ showToast('唔係你組負責嘅內容','error'); return; }
    if(!confirm('還原「'+sec.label+'」做預設內容？你改過嘅嘢會冇咗。')) return;
    const ov=this.getPcOverrides(); delete ov[key]; this.savePcOverrides(ov);
    showToast('已還原，請重新整理頁面載入預設內容','info');
    this.pcEditRefresh();
  },

  /* ══════ 欄位合約：schema 即合約，一鍵睇晒邊格屬邊組 ══════ */
  pcContractRows(){
    const out=[];
    this.PC_CONTENT_SCHEMA.forEach(s=>s.fields.forEach(f=>
      out.push({section:s.label,owner:s.owner,path:'public_channel_2027.'+s.key+(f.k?'.'+f.k:''),field:f.label,type:f.type})));
    return out;
  }

});
