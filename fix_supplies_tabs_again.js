const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `          <button onclick="app.switchSuppliesTab('requests')" class="tab-btn \${this.suppliesSubTab==='requests'?'active':''}"><i class="fa-solid fa-list mr-1"></i> 物資申請 (\${data.requests.length})</button>
          
          <button onclick="app.switchSuppliesTab('my')" class="tab-btn \${this.suppliesSubTab==='my'?'active':''}"><i class="fa-solid fa-user mr-1"></i> 我的申請 (\${myRequests.length})</button>`;

const replaceStr = `          <button onclick="app.switchSuppliesTab('my')" class="tab-btn \${this.suppliesSubTab==='my'?'active':''}"><i class="fa-solid fa-user mr-1"></i> 我的申請 (\${myRequests.length})</button>`;

html = html.replace(targetStr, replaceStr);

fs.writeFileSync('index.html', html, 'utf8');
