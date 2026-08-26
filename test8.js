const fs = require('fs');
const mockDemo = JSON.parse(fs.readFileSync('./data/mock_demo.json', 'utf8'));

const org = mockDemo.staff.org_chart;
function parseGroupFromLevel(levelStr){
  const match=(levelStr||'').match(/^(.+?)\s*\(Level\s*\d+\)/);
  return match?match[1].trim():'';
}
function normalizeGroupName(value){
  let group=String(value||'').trim();
  group=group.replace(/\s*[（(]\s*Level\s*\d+\s*[）)]\s*$/i,'').trim();
  group=group.replace(/^[（(]+\s*/,'').replace(/\s*[）)]+$/,'').trim();
  if(group==='籌委會') return '主席及執行副主席';
  if(group==='管理') return '顧問團';

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

const posts=org.filter(n=>normalizeGroupName(n.group || parseGroupFromLevel(n.level))==='主席及執行副主席');
console.log(posts.length, posts);
