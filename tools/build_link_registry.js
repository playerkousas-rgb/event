#!/usr/bin/env node
'use strict';
/**
 * 由 data/mock_demo.json 掃出全部連結，去重，砌成「連結總表」(link_registry)。
 *
 * 點解要有：同一條 Drive 連結而家散落喺好多個位（最誇張一條通告 PDF 出現 14 次、
 * Drive 資料夾 13 次）。換一次檔要改十四處，必然漏——呢個就係「連結冇做好」。
 * 登記處＝一條連結得一個主人、一個 URL；所有用到嘅位記喺 targets[]。
 * 之後後台改一次 URL，開頁時自動寫返入全部 targets，即係 **一處更新、全站同步**。
 *
 *   node tools/build_link_registry.js            # 寫入 data/mock_demo.json 嘅 link_registry
 *   node tools/build_link_registry.js --dry      # 只顯示唔寫檔
 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'data/mock_demo.json');
const d=JSON.parse(fs.readFileSync(file,'utf8'));

/* ── 掃描：淨係收「整條字串就係一個 URL」嘅欄位，唔郁夾雜喺內文嘅連結 ── */
const SKIP_TOP=['link_registry'];
const occ={};                                   // url -> [path,…]
const inline={};                                // url -> [path,…]（內文夾住，只記錄唔接管）
const walk=(o,p,top)=>{
  if(o==null) return;
  if(typeof o==='string'){
    const s=o.trim();
    if(/^https?:\/\/\S+$/.test(s)){ (occ[s]=occ[s]||[]).push(p); return; }
    const m=o.match(/https?:\/\/[^\s)"'<>]+/g);
    if(m) m.forEach(u=>{ u=u.replace(/[.,;)]+$/,''); (inline[u]=inline[u]||[]).push(p); });
    return;
  }
  if(Array.isArray(o)) return o.forEach((v,i)=>walk(v,p+'['+i+']',top));
  if(typeof o==='object') return Object.keys(o).forEach(k=>walk(o[k],p?p+'.'+k:k,top||k));
};
Object.keys(d).filter(k=>SKIP_TOP.indexOf(k)<0).forEach(k=>walk(d[k],k,k));

/* ── 類型 ── */
const kindOf=(url,label)=>{
  const s=(label||'')+' '+url;
  if(/drive\.google\.com\/drive\/folders/.test(url)) return 'folder';
  if(/docs\.google\.com\/spreadsheets/.test(url)||/\.xlsx?$/i.test(s)) return 'excel';
  if(/docs\.google\.com\/document/.test(url)||/\.docx?$/i.test(s)) return 'word';
  if(/docs\.google\.com\/forms|forms\.gle/.test(url)) return 'form';
  if(/maps\.(app\.)?goo\.gl|google\.com\/maps/.test(url)) return 'map';
  if(/\.pdf$/i.test(s)||/drive\.google\.com\/file/.test(url)) return 'pdf';
  return 'web';
};
const KIND_ZH={folder:'📁 資料夾',excel:'📊 EXCEL',word:'📝 WORD',form:'📋 表單',map:'🗺️ 地圖',pdf:'📄 PDF',web:'🌐 網頁'};

const getAt=(o,p)=>{
  const parts=String(p).replace(/\[(\d+)\]/g,'.$1').split('.');
  return parts.reduce((x,k)=>(x==null?undefined:x[k]),o);
};

/* ── 負責組：先睇資料本身有冇寫明（uploaded_by／owner_group），再睇分類，最後先靠路徑推 ── */
const GROUPS=new Set(((d.staff&&d.staff.org_chart)||[]).map(r=>r.group).filter(Boolean));
const CATEGORY_OWNER={
  '通告':'秘書處','公告':'秘書處','會議':'秘書處','合規政策':'行政組',
  '財務':'行政組','表格':'行政組','名單':'行政組','旅團報名人數':'行政組',
  '協調':'協調組','場地及旅團指示':'協調組','場地佈置及執行':'協調組','場地／帳篷資料':'協調組','箱頭紙':'協調組',
  '活動':'主題節目組','活動資料表':'主題節目組','遊戲卡':'主題節目組','參加旅團程序':'主題節目組',
  '嘉賓及典禮':'嘉賓接待組','嘉賓名單及點名':'嘉賓接待組',
  '典禮儀式':'會操及典禮組','司儀稿及典禮程序':'會操及典禮組','自助餐司儀稿':'會操及典禮組',
  '總流程及獎項':'會操及典禮組','主禮團進場':'會操及典禮組','優異旅團頒獎':'會操及典禮組','出席及派隊清單':'會操及典禮組',
  '品牌推廣':'品牌推廣組','NGO聯絡資料':'服務及發展組',
  '旅團通知書':'秘書處','共創明Teen通知書':'秘書處'
};
const OWNER_RULES=[
  [/^meetings/,                      '秘書處'],
  [/^notices|^announcements/,        '秘書處'],
  [/^unit_guide/,                    '秘書處'],
  [/^drive\./,                       '秘書處'],
  [/^finance|^expenses/,             '行政組'],
  [/^crisis/,                        '行政組'],
  [/^ceremony|mc_script/,            '會操及典禮組'],
  [/^activities|booth|venue_map/,    '主題節目組'],
  [/transport|guest_transport|map_/, '協調組'],
  [/donate/,                         '服務及發展組'],
  [/^staff|^souvenirs/,              '行政組'],
  [/^documents/,                     '秘書處']
];
const ownerOf=paths=>{
  for(const p of paths){                                   // ① 資料本身寫咗邊組
    const o=getAt(d,p.replace(/\.[^.\]]+$/,''));
    if(o&&typeof o==='object'){
      const g=o.owner_group||o.uploaded_by||o.group;
      if(typeof g==='string'&&GROUPS.has(g.trim())) return g.trim();
      const c=o.category;
      if(typeof c==='string'&&CATEGORY_OWNER[c.trim()]) return CATEGORY_OWNER[c.trim()];   // ② 分類
    }
  }
  for(const [re,g] of OWNER_RULES) if(paths.some(p=>re.test(p))) return g;                 // ③ 路徑
  return '行政組';
};

/* ── 名：由同一個物件入面嘅 *_name / title / name 欄位攞 ── */
const labelFor=(url,paths)=>{
  for(const p of paths){
    const parent=p.replace(/\.[^.\]]+$/,'');
    const o=getAt(d,parent);
    if(o&&typeof o==='object'){
      const v=o.file_name||o.name||o.title||o.label;
      if(typeof v==='string'&&v.trim()) return v.trim();
    }
  }
  const m=url.match(/\/([^\/?#]+)(?:[?#]|$)/g);
  return decodeURIComponent((m&&m[m.length-1]||url).replace(/\//g,''))||url;
};

/* ── 砌 id：穩定、可讀、唔撞 ── */
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g,'-').replace(/^-|-$/g,'').slice(0,44)||'link';
const seen={};
const mkId=(label,kind)=>{ let b=kind+'-'+slug(label),i=1,id=b; while(seen[id]) id=b+'-'+(++i); seen[id]=1; return id; };

const links=Object.keys(occ).sort().map(url=>{
  const paths=occ[url].slice().sort();
  const label=labelFor(url,paths);
  const kind=kindOf(url,label);
  return {id:mkId(label,kind),label,kind,kind_zh:KIND_ZH[kind],owner:ownerOf(paths),url,
    targets:paths, uses:paths.length,
    inline_uses:(inline[url]||[]).length,        // 夾喺內文嘅唔自動換，但要知有幾多處
    source:'2027', updated_by:'', updated_at:''};
});

const registry={
  generated_at:new Date().toISOString().slice(0,10),
  generated_by:'tools/build_link_registry.js',
  note:'一條連結一個主人一個 URL。後台「🔗 連結總表」改一次，開頁自動寫返入 targets 全部位置。唔好手改本段。',
  total_links:links.length,
  total_targets:links.reduce((s,l)=>s+l.uses,0),
  links
};

if(process.argv.indexOf('--dry')>=0){
  console.log(`獨立連結 ${registry.total_links} 條，接管 ${registry.total_targets} 個位置`);
  const byOwner={}; links.forEach(l=>byOwner[l.owner]=(byOwner[l.owner]||0)+1);
  Object.keys(byOwner).sort().forEach(o=>console.log('  '+o+'：'+byOwner[o]+' 條'));
  console.log('\n重覆最多：');
  links.slice().sort((a,b)=>b.uses-a.uses).slice(0,8).forEach(l=>
    console.log('  '+String(l.uses).padStart(3)+' 處  '+l.kind_zh+'  '+l.label.slice(0,48)));
  process.exit(0);
}

d.link_registry=registry;
fs.writeFileSync(file, JSON.stringify(d,null,2)+'\n', 'utf8');
console.log(`✓ 已寫入 data/mock_demo.json → link_registry：${registry.total_links} 條連結，接管 ${registry.total_targets} 個位置`);
