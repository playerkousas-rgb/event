const fs = require('fs');

function fixData(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const org = data.staff.org_chart;
  
  const nameMap = {};
  org.forEach(n => {
    let baseTitle = (n.title||'').trim();
    const cleanTitle = baseTitle.replace(/[（(].*?[）)]/g, '').trim();
    
    if (n.names) {
      if (!nameMap[baseTitle]) nameMap[baseTitle] = new Set();
      nameMap[baseTitle].add(n.names);
      
      if (!nameMap[cleanTitle]) nameMap[cleanTitle] = new Set();
      nameMap[cleanTitle].add(n.names);
    }
  });

  data.staff.job_duties.forEach(d => {
    let newDuty = d.duty;
    const lines = newDuty.split('\n');
    for (let i=0; i<lines.length; i++) {
      let line = lines[i];
      if (line.match(/：\s*$/)) {
        // extract title and name part
        const m = line.match(/^([^（(]+)(?:[（(]([^）)]+)[）)])?：\s*$/);
        if (m) {
          const rawTitle = m[1].trim(); 
          let bestTitle = null;
          let longest = 0;
          for (const t of Object.keys(nameMap)) {
            if (line.startsWith(t) && t.length > longest) {
              bestTitle = t;
              longest = t.length;
            }
          }
          if (bestTitle) {
            const names = Array.from(nameMap[bestTitle]).join('、');
            line = bestTitle + (names ? `（${names}）` : '') + '：';
            lines[i] = line;
          } else {
             lines[i] = rawTitle + '：';
          }
        }
      }
    }
    d.duty = lines.join('\n');
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Fixed', filePath);
}

fixData('./data/isd_2026.json');
fixData('./data/mock_demo.json');
