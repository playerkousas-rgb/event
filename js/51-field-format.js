/* 51-field-format.js — 入口守門：唔畀佢填錯（v25）
   ──────────────────────────────────────────────────────────────────────────
   用戶定嘅方向（呢個係因果嘅關鍵）：

     2026 源頭係 Google Form，人想點填就點填 —— 所以有「港島第一旅」同「港島第6旅」
     兩種寫法，唔係有人唔知會，只係各有各嘅習慣。
     2027 直接寫後端 —— 我哋可以喺【填嗰陣】就規限格式。

   所以 v24 嗰個寬鬆對鍵係補鑊（落咗格之後先夾）。
   呢度調返轉：同一套認字能力搬去入口做守門。

   三種結果，唔係淨係「啱／唔啱」：
     ✓ ok      　完全合格，照收
     ⟳ fixed   　認得出你想講乜，自動改成標準寫法，同時話返你知改咗乜
     ✗ reject  　唔夠資料或者有歧義，唔收，而且要講明「應該點填」

   點解唔一律 reject：填「港島第一旅」係啱意思錯寫法，夾硬彈走只會逼人亂填。
   點解唔一律 fixed：填「1」我唔知你指邊區，估就係埋下一個錯。

   ⚠ 規矩寫喺呢度，同時出落 Excel 範本嘅輸入提示 —— 人填嗰陣就睇到，唔使翻文件。
   ────────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

const KM=(typeof require!=='undefined'&&typeof module!=='undefined')
  ? require('./49-key-match.js')
  : (typeof window!=='undefined'?window:{});

const R  =(value)=>({state:'ok',value});
const FIX=(value,was,why)=>({state:'fixed',value,was,why});
const NO =(was,why,how)=>({state:'reject',value:'',was,why,how});

const FORMATS={

  /* ─────────── 旅團 ─────────── */
  troop:{
    label:'旅團名稱',
    canon:'港島第1旅',
    rule:'只准填「港島第1旅」咁嘅寫法：區名 ＋ 第 ＋ 阿拉伯數字 ＋ 旅。',
    bad:['港島第一旅（中文數字）','1（冇區名）','第1旅（冇區名）','港島1（冇「第」同「旅」）'],
    good:['港島第1旅','港島第263旅','港島第5海童軍旅'],
    check(v){
      const raw=String(v==null?'':v);
      const s=KM.kmPlain(raw);
      if(!s) return NO(raw,'空白','要填，例：港島第1旅');
      if(/^\d+$/.test(s))        return NO(raw,'淨係一個數字，唔知邊區','要填全，例：港島第'+s+'旅');
      if(/^第/.test(s))          return NO(raw,'冇寫區名','要寫明邊區，例：港島'+s);
      const t=KM.kmTroop(s);
      if(!t)                     return NO(raw,'唔似旅團名','格式：區名第N旅，例：港島第1旅');
      if(!t.region)              return NO(raw,'冇寫區名','例：港島第'+t.num+'旅');
      if(raw.trim()===t.canon)   return R(t.canon);
      return FIX(t.canon,raw,'中文數字／空格／全形已改成標準寫法');
    }
  },

  /* ─────────── 攤位編號 ─────────── */
  booth:{
    label:'攤位編號',
    canon:'A01',
    rule:'只准填編號本身：一個英文區碼 ＋ 兩位數字。攤位名稱填落「攤位名稱」嗰欄。',
    bad:['A1（唔夠兩位）','A1 Core（夾埋名）','A-01（有符號）'],
    good:['A01','B07','E12'],
    check(v){
      const raw=String(v==null?'':v);
      const s=KM.kmPlain(raw);
      if(!s) return NO(raw,'空白','要填，例：A01');
      const k=KM.kmBooth(s);
      if(!k) return NO(raw,'唔似攤位編號','格式：英文區碼＋兩位數字，例：A01');
      if(raw.trim()===k) return R(k);
      if(/[\u4e00-\u9fff]|\s/.test(raw.trim()))
        return FIX(k,raw,'攤位編號只填編號；名稱請填落「攤位名稱」嗰欄');
      return FIX(k,raw,'已補成兩位數字／去除符號');
    }
  },

  /* ─────────── 電話 ─────────── */
  phone:{
    label:'電話',
    canon:'92157472',
    rule:'只准填 8 位數字。唔好加 +852、空格、斜線或者「／」。',
    bad:['+852 9215 7472','9215 7472','92157472/98765432（兩個號碼）','待定'],
    good:['92157472'],
    check(v){
      const raw=String(v==null?'':v);
      const s=KM.kmPlain(raw);
      if(!s) return R('');                                    // 空白＝未有，唔算錯（盡量級）
      if(/[,\/、;；]/.test(raw)) return NO(raw,'一格只准一個號碼','兩個人就開兩行');
      const p=KM.kmPhone(s);
      if(!p) return NO(raw,'唔係有效嘅 8 位香港電話','例：92157472');
      if(raw.trim()===p) return R(p);
      return FIX(p,raw,'已剝走 +852／空格／符號');
    }
  },

  /* ─────────── 人名（一格一個人）─────────── */
  person:{
    label:'姓名',
    canon:'陳大文',
    rule:'一格只准一個人。兩個人要開兩行 —— 2026 就係有一格寫咗兩個人，搞到 55 行變 54 人。',
    bad:['陳大文、李小明','陳大文/李小明','陳大文 (待定)'],
    good:['陳大文','區永樑先生'],
    check(v){
      const raw=String(v==null?'':v);
      const s=KM.kmPlain(raw);
      if(!s) return R('');
      if(/[,、\/／；;＆&]|\sand\s/i.test(raw)) return NO(raw,'一格有多過一個人名','一行一個人，第二個開新一行');
      return s===raw.trim()?R(s):FIX(s,raw,'已去除多餘空格');
    }
  },

  /* ─────────── 日期 ─────────── */
  date:{
    label:'日期',
    canon:'2027-10-03',
    rule:'只准填 YYYY-MM-DD。唔准填 3/10/27 —— 唔知係 3 月 10 號定 10 月 3 號。',
    bad:['3/10/27','2027年10月3日（可自動改）','10-3'],
    good:['2027-10-03'],
    check(v){
      const raw=String(v==null?'':v);
      if(v instanceof Date&&!isNaN(v)) return R(v.toISOString().slice(0,10));
      const s=KM.kmPlain(raw);
      if(!s) return R('');
      if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return R(s);
      let m=s.match(/^(\d{4})[年\/.](\d{1,2})[月\/.](\d{1,2})日?$/);
      if(m) return FIX(`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`,raw,'已改成 YYYY-MM-DD');
      if(/^\d{1,2}[\/.-]\d{1,2}([\/.-]\d{2,4})?$/.test(s))
        return NO(raw,'日月次序唔清楚','要填 YYYY-MM-DD，例：2027-10-03');
      return NO(raw,'唔似日期','要填 YYYY-MM-DD，例：2027-10-03');
    }
  },

  /* ─────────── 車牌 ─────────── */
  plate:{
    label:'車牌',
    canon:'AM1334',
    rule:'淨係填車牌本身，冇空格冇符號，英文大寫。',
    bad:['AM 1334','am1334','AM1334 (司機陳生)'],
    good:['AM1334'],
    check(v){
      const raw=String(v==null?'':v);
      const s=KM.kmPlain(raw).toUpperCase();
      if(!s) return R('');
      const c=s.replace(/[^A-Z0-9]/g,'');
      if(!/^[A-Z]{1,3}\d{1,4}$|^\d{1,4}$/.test(c)) return NO(raw,'唔似香港車牌','例：AM1334');
      return c===raw.trim()?R(c):FIX(c,raw,'已轉大寫／去除空格符號');
    }
  },

  /* ─────────── 是／否 ─────────── */
  yesno:{
    label:'是／否',
    canon:'Y',
    rule:'只准填 Y 或者留空。唔好填「是」「有」「✓」「1」。',
    bad:['是','有','✓','1','TRUE'],
    good:['Y','（留空）'],
    check(v){
      if(v===true) return FIX('Y',true,'已轉成 Y');
      if(v===false||v==null||v==='') return R('');
      const s=KM.kmPlain(v).toUpperCase();
      if(s==='Y'||s==='YES') return s==='Y'?R('Y'):FIX('Y',v,'已統一用 Y');
      if(['N','NO','X','-','／','/'].indexOf(s)>=0) return FIX('',v,'唔要就留空');
      if(['是','有','✓','√','1','TRUE'].indexOf(s)>=0) return FIX('Y',v,'已統一用 Y');
      return NO(v,'只收 Y 或者留空','要就填 Y，唔要就留空');
    }
  },

  /* ─────────── 整數 ─────────── */
  count:{
    label:'數目',
    canon:'7',
    rule:'只准填整數。唔好填「7.0」「約7」「7人」。',
    bad:['7.0','約7','7人','七'],
    good:['7','0'],
    check(v){
      const raw=String(v==null?'':v);
      const s=KM.kmPlain(raw);
      if(!s) return R('');
      if(/^\d+$/.test(raw.trim())) return R(parseInt(raw.trim(),10));
      if(/^\d+$/.test(s)) return FIX(parseInt(s,10),raw,'已去除空格／全形');
      const n=KM.kmNum(s);
      if(n!=null) return FIX(n,raw,'中文數字已轉成阿拉伯數字');
      const f=s.match(/^(\d+)\.0+$/);
      if(f) return FIX(parseInt(f[1],10),raw,'已去除小數點');
      const g=s.match(/^約?(\d+)\s*[人份個位]?$/);
      if(g) return FIX(parseInt(g[1],10),raw,'已淨返數字');
      return NO(raw,'唔係整數','淨係填數字，例：7');
    }
  }
};

/* 驗一格 */
function ffCheck(fmt,v){
  const F=FORMATS[fmt];
  if(!F) return R(v);
  try{ return F.check(v); }catch(e){ return NO(v,'驗唔到：'+e.message,''); }
}

/* 驗一批，出統計 —— 可以用嚟問「如果 2027 用呢套規矩，2026 啲資料會點」 */
function ffAudit(rows,specs){
  const out={total:0,ok:0,fixed:0,reject:0,byField:{},samples:[]};
  (rows||[]).forEach((r,ri)=>{
    specs.forEach(sp=>{
      const v=typeof sp.get==='function'?sp.get(r):r[sp.k];
      if(v===undefined) return;
      const res=ffCheck(sp.format,v);
      out.total++;
      out[res.state]++;
      const b=(out.byField[sp.k]=out.byField[sp.k]||{label:sp.label||sp.k,format:sp.format,ok:0,fixed:0,reject:0});
      b[res.state]++;
      if(res.state!=='ok'&&out.samples.length<400)
        out.samples.push({row:ri+1,field:sp.k,label:sp.label||sp.k,state:res.state,
          was:res.was,value:res.value,why:res.why,how:res.how||''});
    });
  });
  return out;
}

/* 畀 Excel 用嘅輸入提示（人填嗰陣就睇到，唔使翻文件） */
function ffPrompt(fmt){
  const F=FORMATS[fmt]; if(!F) return null;
  return {title:F.label+'　格式',
    text:F.rule+'\n\n✓ 可以：'+F.good.join('、')+'\n✗ 唔好：'+F.bad.join('、')};
}

const API={FIELD_FORMATS:FORMATS,ffCheck,ffAudit,ffPrompt};
if(typeof ScoutEventApp!=='undefined'&&ScoutEventApp.prototype) Object.assign(ScoutEventApp.prototype,API);
if(typeof window!=='undefined') Object.assign(window,API);
if(typeof module!=='undefined'&&module.exports) module.exports=API;
})();
