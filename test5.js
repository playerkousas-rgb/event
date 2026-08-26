const fs = require('fs');
const isd = JSON.parse(fs.readFileSync('./data/isd_2026.json', 'utf8'));

function normalizeGroupName(value){
  let group=String(value||'').trim();
  group=group.replace(/\s*[（(]\s*Level\s*\d+\s*[）)]\s*$/i,'').trim();
  group=group.replace(/^[（(]+\s*/,'').replace(/\s*[）)]+$/,'').trim();
  if(group==='籌委會') return '主席及執行副主席';
  if(group==='管理') return '顧問團'; // Based on mock_demo.json mapping for 黃偉安 & 何家騏

  // Mapping abbreviations to standard names (especially from isd_2026.json)
  const map = {
    '典禮及會操': '會操及典禮組',
    '主題節目': '主題節目組',
    '品牌推廣': '品牌推廣組',
    '嘉賓接待': '嘉賓接待組',
    '協調': '協調組',
    '服務及發展': '服務及發展組',
    '行政': '行政組'
  };
  if(map[group]) return map[group];
  return group;
}
const ORG_GROUPS=['顧問團','主席及執行副主席','秘書處','會操及典禮組','主題節目組','品牌推廣組','嘉賓接待組','協調組','服務及發展組','行政組'];

const staffData = isd.staff || {};

const set=[];
const push=(g)=>{
  String(g||'').split(/[\/／、,，]/).forEach(part=>{
    const v=normalizeGroupName(part);
    if(!v||v==='未分組'||v==='未知') return;
    if(!set.includes(v)) set.push(v);
  });
};

(staffData.org_chart||[]).forEach(n=>push(n.group));
(staffData.contacts||[]).forEach(c=>push(c.group_name));

if(!set.length) ORG_GROUPS.forEach(push);

const ordered=ORG_GROUPS.filter(g=>set.includes(g));
set.forEach(g=>{ if(!ordered.includes(g)) ordered.push(g); });

console.log('Final ordered groups:');
console.log(ordered);
