/* 49-key-match.js — 寬鬆對鍵：寫法唔同都認得返同一件事（v24）
   ──────────────────────────────────────────────────────────────────────────
   2026 真實情況（機械查出，唔係估）：

     攤位編號   主題節目組寫「A01」　行政組編更／派章寫「A1 Core」　→ 33 × 25 零重疊
     旅團名稱   優異旅團表寫「港島第六旅」　參加旅團表寫「港島第6旅」→ 72 × 30 零重疊
     做嘢人數   編更 279 ／ 派章 290 ／ 攤位表人手 193 ／ 攤位表午膳 173 → 四個答案

   後果就係用戶講嗰句：主題節目組知道人名改咗，協調組同行政組未改，派章同派飯就出事。

   點解唔係「叫大家統一寫法」：
     ・2026 源頭係 Google Form ＋ 職員人手改，2027 直接寫後端，錯法只會更多。
     ・唱名要中文（港島第六旅），系統要數字（6）。兩邊都啱，唔應該夾硬揀一邊。
   所以唔靠人自律，靠機器寬鬆：中文數字、阿拉伯數字、全形、空格、後綴描述——通通都食。

   ⚠️ 一件事要講清楚：優異旅團同參加旅團係【兩件事】，唔應該夾埋。
      有人嚟攞獎唔等如個旅有嚟；個旅有嚟唔等如會攞獎。
      呢度做嘅只係「認得返係同一個旅」，唔係夾埋佢哋做一張表。
   ────────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

const CN={'零':0,'〇':0,'O':0,'o':0,'Ｏ':0,'ｏ':0,   // 有人打字用英文 O 當〇（2026 實際出現過）
          '一':1,'壹':1,'二':2,'兩':2,'貳':2,'三':3,'參':3,'四':4,'肆':4,
          '五':5,'伍':5,'六':6,'陸':6,'七':7,'柒':7,'八':8,'捌':8,'九':9,'玖':9};

/* 全形 → 半形、去空白 */
function kmPlain(s){
  return String(s==null?'':s)
    .replace(/[\uFF01-\uFF5E]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0))
    .replace(/[\s\u3000]+/g,'')
    .trim();
}

/* 中文或阿拉伯數字 → number。認得 六／6／九十／十六／二四三／1316 */
function kmNum(s){
  const t=kmPlain(s);
  if(t==='') return null;
  if(/^\d+$/.test(t)) return parseInt(t,10);
  if(!/^[零〇Oo Ｏｏ一壹二兩貳三參四肆五伍六陸七柒八捌九玖十拾百千]+$/.test(t.replace(/\s/g,''))) return null;
  // 十位制：十六＝16、九十＝90、九十六＝96
  let m=t.match(/^([零〇一壹二兩貳三參四肆五伍六陸七柒八捌九玖])?[十拾]([零〇一壹二兩貳三參四肆五伍六陸七柒八捌九玖])?$/);
  if(m) return (m[1]?CN[m[1]]:1)*10+(m[2]?CN[m[2]]:0);
  // 連寫制：二四三＝243、一三一六＝1316
  if([...t].every(c=>c in CN)) return parseInt([...t].map(c=>CN[c]).join(''),10);
  return null;
}

/* 旅團：港島第六旅 / 港島第6旅 / 港島第5海童軍旅 → {region,num,type,canon,key}
   ⚠ 支部類型（海童軍／空童軍）唔會夾埋：第5旅同第5海童軍旅係兩個旅。 */
function kmTroop(s){
  const t=kmPlain(s);
  if(!t) return null;
  const m=t.match(/^(.*?)第?([0-9零〇Oo Ｏｏ一壹二兩貳三參四肆五伍六陸七柒八捌九玖十拾]+)(海童軍|空童軍)?旅/);
  if(!m) return null;
  const num=kmNum(m[2]);
  if(num==null) return null;
  const region=m[1]||'';
  const type=m[3]||'';
  return {region,num,type,
    canon:region+'第'+num+type+'旅',
    key:(region||'?')+'#'+num+(type?'#'+type:'')};
}

/* 攤位：A01 / A1 / A-1 / Ａ０１ / 「A1 Core」/「A3 機電2」→ A01
   後面跟住嘅描述文字會剝走，因為嗰啲係名唔係鍵。 */
function kmBooth(s){
  const t=kmPlain(s).toUpperCase();
  if(!t) return null;
  const m=t.match(/^([A-Z]+)[-_.]?(\d{1,3})/);
  if(!m) return null;
  return m[1]+String(parseInt(m[2],10)).padStart(2,'0');
}

/* 人名：去空白、全形，保留原字。唔做簡繁轉換（會改錯名）。 */
function kmName(s){ return kmPlain(s); }

/* 電話：淨係數字。香港 8 位；有 852 前綴就剝走。 */
function kmPhone(s){
  let t=kmPlain(s).replace(/\D/g,'');
  if(t.length===11&&t.indexOf('852')===0) t=t.slice(3);
  return t.length===8?t:'';
}

/* 用寬鬆鍵砌索引：同一個鍵有多過一個寫法會記低（呢啲就係要跟進嗰啲） */
function kmIndex(rows,fn){
  const idx=new Map();
  (rows||[]).forEach((r,i)=>{
    const k=fn(r,i);
    if(k==null||k==='') return;
    if(!idx.has(k)) idx.set(k,{key:k,rows:[],raws:new Set()});
    const e=idx.get(k); e.rows.push(r);
    e.raws.add(typeof r==='string'?r:JSON.stringify(r).slice(0,60));
  });
  return idx;
}

/* 兩份名單對帳：夾得返幾多、各自獨有幾多、寫法唔同嘅有邊啲 */
function kmReconcile(aRows,aFn,bRows,bFn){
  const A=kmIndex(aRows,aFn), B=kmIndex(bRows,bFn);
  const both=[],onlyA=[],onlyB=[];
  A.forEach((v,k)=>{ (B.has(k)?both:onlyA).push(k); });
  B.forEach((v,k)=>{ if(!A.has(k)) onlyB.push(k); });
  return {a:A.size,b:B.size,both:both.length,onlyA,onlyB,keys:{A,B}};
}

const API={kmPlain,kmNum,kmTroop,kmBooth,kmName,kmPhone,kmIndex,kmReconcile};

if(typeof ScoutEventApp!=='undefined'&&ScoutEventApp.prototype){
  Object.assign(ScoutEventApp.prototype,API);
}
if(typeof window!=='undefined') Object.assign(window,API);
if(typeof module!=='undefined'&&module.exports) module.exports=API;
})();
