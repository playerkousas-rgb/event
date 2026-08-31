/* 38-donations.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== 童心捐贈大行動 (物品·食品捐贈) ===================== */
  getDonationsData(){
    const key=LS.config(this.currentEvent?.event_id||'isd_2026')+'_donations';
    return JSON.parse(localStorage.getItem(key)||'{"goods":[],"food":[]}');
  }
,
  saveDonationsData(data){
    const key=LS.config(this.currentEvent?.event_id||'isd_2026')+'_donations';
    localStorage.setItem(key,JSON.stringify(data));
    // 同步到後端（GAS）
    if(!this.mockMode && this.gasUrl){
      fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Donations',record:{event_id:this.currentEvent?.event_id||'isd_2026',data_json:JSON.stringify(data),updated_by:this.currentUser?.name||''}})}).catch(()=>{});
    }
  }
,
  renderDonationSummaryForGroup(){
    const data=this.getDonationsData();
    const goods=data.goods||[];
    const food=data.food||[];
    const tqg=goods.reduce((s,g)=>s+(g.items||[]).reduce((a,i)=>a+(parseInt(i.quantity)||0),0),0);
    const tqf=food.reduce((s,f)=>s+(f.items||[]).reduce((a,i)=>a+(parseInt(i.quantity)||0),0),0);
    return '<div class="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">'
      +'<h4 class="font-bold text-sm text-rose-900"><i class="fa-solid fa-hand-holding-heart mr-1"></i>童心捐贈大行動 - 統計總覽</h4>'
      +'<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'
      +'<div class="bg-blue-50 border border-blue-200 rounded-xl p-3"><h5 class="font-bold text-xs text-blue-800 mb-2"><i class="fa-solid fa-box-open mr-1"></i>物品捐贈</h5><div class="grid grid-cols-3 gap-2 text-center"><div><div class="text-[10px] text-slate-500">表格</div><div class="text-lg font-extrabold text-blue-600">'+goods.length+'</div></div><div><div class="text-[10px] text-slate-500">人次</div><div class="text-lg font-extrabold text-blue-600">'+goods.reduce((s,g)=>s+(g.items||[]).length,0)+'</div></div><div><div class="text-[10px] text-slate-500">總數量</div><div class="text-lg font-extrabold text-blue-600">'+tqg+'</div></div></div></div>'
      +'<div class="bg-amber-50 border border-amber-200 rounded-xl p-3"><h5 class="font-bold text-xs text-amber-800 mb-2"><i class="fa-solid fa-apple-whole mr-1"></i>食品捐贈</h5><div class="grid grid-cols-3 gap-2 text-center"><div><div class="text-[10px] text-slate-500">表格</div><div class="text-lg font-extrabold text-amber-600">'+food.length+'</div></div><div><div class="text-[10px] text-slate-500">人次</div><div class="text-lg font-extrabold text-amber-600">'+food.reduce((s,f)=>s+(f.items||[]).length,0)+'</div></div><div><div class="text-[10px] text-slate-500">總數量</div><div class="text-lg font-extrabold text-amber-600">'+tqf+'</div></div></div></div>'
      +'</div>'
      +'<button onclick="app.openModule(&quot;donations&quot;)" class="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-expand mr-1"></i>進入完整捐贈管理頁</button>'
      +'</div>';
  }
,
  /* 捐贈統計／紀錄只供：服務及發展組、副主席或以上、管理層；公眾只可填表及掃碼。 */
  canViewDonationsStats(){
    const u=this.currentUser;
    if(!u) return false;
    if(this.isAdmin()) return true;
    if((ROLE_HIERARCHY[u.role]||0)>=60) return true;
    // v8.14：童心捐贈歸服務及發展組，行政組亦可管
    return normalizeGroupName(u.group_name||'').includes('服務及發展') || this.isCardOwnerGroup('donations');
  }
,
  renderDonationsModule(){
    const container=document.getElementById('module-content');
    if(!container) return;
    const canStats=this.canViewDonationsStats();
    if(!this.donSubTab) this.donSubTab=canStats?'dashboard':'entry';
    if(!canStats && this.donSubTab!=='entry') this.donSubTab='entry';
    if(canStats && !['dashboard','goods','food','qrcode'].includes(this.donSubTab)) this.donSubTab='dashboard';
    const data=this.getDonationsData();
    const goods=data.goods||[];
    const food=data.food||[];
    const canManage=canStats&&(this.isAdmin()||this.isExecViceOrChair()||(this.currentUser?.group_name||'').includes('服務及發展'));
    const tabs=canStats
      ? [
          {k:'dashboard',icon:'fa-solid fa-chart-pie',label:'統計總覽'},
          {k:'goods',icon:'fa-solid fa-box-open',label:'物品捐贈'},
          {k:'food',icon:'fa-solid fa-apple-whole',label:'食品捐贈'},
          {k:'qrcode',icon:'fa-solid fa-qrcode',label:'QR Code'}
        ]
      : [{k:'entry',icon:'fa-solid fa-pen-to-square',label:'捐贈登記'}];
    const tabBtns=canStats?tabs.map(t=>`<button onclick="app.switchDonTab('${t.k}')" class="tab-btn ${this.donSubTab===t.k?'active':''}"><i class="${t.icon} mr-1"></i>${t.label}</button>`).join(''):'';
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-900">
          <b><i class="fa-solid fa-hand-holding-heart mr-1"></i>童心捐贈大行動：</b>${canStats?'掃碼或填表登記物品／食品捐贈；統計只供服務及發展組／管理層查看。':'多謝你嘅心意！直接以下兩個表登記物品／食品捐贈，或影 QR Code 表格填寫（無須登入）。統計及紀錄只供服務及發展組／管理層查閱。'}
        </div>
        ${tabBtns?`<div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">${tabBtns}</div>`:''}
        <div id="don-tab-body"></div>
      </div>`;
    const body=document.getElementById('don-tab-body');
    if(this.donSubTab==='dashboard') this.renderDonDashboard(body,goods,food,canManage);
    else if(this.donSubTab==='goods') this.renderDonGoods(body,goods,canManage);
    else if(this.donSubTab==='food') this.renderDonFood(body,food,canManage);
    else if(this.donSubTab==='entry') this.renderDonPublicEntry(body);
    else this.renderDonQRCode(body);
  }
,
  renderDonPublicEntry(body){
    const baseUrl=window.location.origin+window.location.pathname;
    const goodsUrl=baseUrl+'#donate-goods';
    const foodUrl=baseUrl+'#donate-food';
    // QR Code／下載屬籌辦方派發用途；公眾直接填表即可，唔顯示呢舊欄
    const qrBlock=this.canViewDonationsStats()?`
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white border rounded-xl p-5 text-center space-y-3">
            <h4 class="font-bold text-sm text-blue-700"><i class="fa-solid fa-qrcode mr-1"></i>物品捐贈 QR Code</h4>
            <div id="qr-goods" class="flex justify-center"></div>
            <p class="text-[10px] text-slate-500 break-all">${escapeHtml(goodsUrl)}</p>
            <button onclick="app.downloadQR('qr-goods','物品捐贈QRCode')" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>下載 QR Code</button>
          </div>
          <div class="bg-white border rounded-xl p-5 text-center space-y-3">
            <h4 class="font-bold text-sm text-amber-700"><i class="fa-solid fa-qrcode mr-1"></i>食品捐贈 QR Code</h4>
            <div id="qr-food" class="flex justify-center"></div>
            <p class="text-[10px] text-slate-500 break-all">${escapeHtml(foodUrl)}</p>
            <button onclick="app.downloadQR('qr-food','食品捐贈QRCode')" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>下載 QR Code</button>
          </div>
        </div>`:'';
    body.innerHTML=`
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onclick="app.openGoodsDonationForm()" class="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-5 text-left card-hover cursor-pointer">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl mb-2"><i class="fa-solid fa-box-open"></i></div>
            <h4 class="font-bold">物品捐贈表</h4><p class="text-[11px] text-blue-100 mt-1">填寫旅團、領袖及捐贈者名單</p>
          </button>
          <button onclick="app.openFoodDonationForm()" class="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 text-left card-hover cursor-pointer">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl mb-2"><i class="fa-solid fa-apple-whole"></i></div>
            <h4 class="font-bold">食品捐贈表</h4><p class="text-[11px] text-amber-100 mt-1">填寫旅團、領袖及捐贈者名單</p>
          </button>
        </div>
        ${qrBlock}
      </div>`;
    if(qrBlock) setTimeout(()=>{ this.generateQR('qr-goods',goodsUrl); this.generateQR('qr-food',foodUrl); },100);
  }
,
  switchDonTab(tab){ this.donSubTab=tab; this.renderDonationsModule(); }
,
  renderDonDashboard(body,goods,food,canManage){
    const totalForms=goods.length+food.length;
    const totalDonors=goods.reduce((s,g)=>s+(g.items||[]).length,0)+food.reduce((s,f)=>s+(f.items||[]).length,0);
    const totalQtyGoods=goods.reduce((s,g)=>s+(g.items||[]).reduce((a,i)=>a+(parseInt(i.quantity)||0),0),0);
    const totalQtyFood=food.reduce((s,f)=>s+(f.items||[]).reduce((a,i)=>a+(parseInt(i.quantity)||0),0),0);
    body.innerHTML=`
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4"><h5 class="font-bold text-sm text-blue-800 mb-3"><i class="fa-solid fa-box-open mr-1"></i>物品捐贈統計</h5><div class="grid grid-cols-3 gap-2 text-center"><div><div class="text-[10px] text-slate-500">表格</div><div class="text-2xl font-extrabold text-blue-600">${goods.length}</div></div><div><div class="text-[10px] text-slate-500">人次</div><div class="text-2xl font-extrabold text-blue-600">${goods.reduce((s,g)=>s+(g.items||[]).length,0)}</div></div><div><div class="text-[10px] text-slate-500">總數量</div><div class="text-2xl font-extrabold text-blue-600">${totalQtyGoods}</div><div class="text-[10px] text-slate-400">單位</div></div></div></div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4"><h5 class="font-bold text-sm text-amber-800 mb-3"><i class="fa-solid fa-apple-whole mr-1"></i>食品捐贈統計</h5><div class="grid grid-cols-3 gap-2 text-center"><div><div class="text-[10px] text-slate-500">表格</div><div class="text-2xl font-extrabold text-amber-600">${food.length}</div></div><div><div class="text-[10px] text-slate-500">人次</div><div class="text-2xl font-extrabold text-amber-600">${food.reduce((s,f)=>s+(f.items||[]).length,0)}</div></div><div><div class="text-[10px] text-slate-500">總數量</div><div class="text-2xl font-extrabold text-amber-600">${totalQtyFood}</div><div class="text-[10px] text-slate-400">件</div></div></div></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white border rounded-xl p-4">
            <h4 class="font-bold text-sm mb-2"><i class="fa-solid fa-box-open text-blue-600 mr-1"></i>物品捐贈紀錄 (${goods.length})</h4>
            <div class="space-y-2 max-h-[300px] overflow-y-auto">${goods.length?goods.map(g=>`<div class="border rounded-lg p-2.5 bg-slate-50"><div class="flex justify-between"><b class="text-[12px]">${escapeHtml(g.scout_group||'未填')}</b><span class="text-[10px] text-slate-400">${escapeHtml(g.date||'')}</span></div><div class="text-[11px] text-slate-600">領袖：${escapeHtml(g.leader_name||'')} · ${(g.items||[]).length} 人捐贈 · 共 ${g.items.reduce((s,i)=>s+(parseInt(i.quantity)||0),0)} 單位</div></div>`).join(''):'<p class="text-xs text-slate-400">暫無物品捐贈紀錄</p>'}</div>
          </div>
          <div class="bg-white border rounded-xl p-4">
            <h4 class="font-bold text-sm mb-2"><i class="fa-solid fa-apple-whole text-amber-600 mr-1"></i>食品捐贈紀錄 (${food.length})</h4>
            <div class="space-y-2 max-h-[300px] overflow-y-auto">${food.length?food.map(f=>`<div class="border rounded-lg p-2.5 bg-slate-50"><div class="flex justify-between"><b class="text-[12px]">${escapeHtml(f.scout_group||'未填')}</b><span class="text-[10px] text-slate-400">${escapeHtml(f.date||'')}</span></div><div class="text-[11px] text-slate-600">領袖：${escapeHtml(f.leader_name||'')} · ${(f.items||[]).length} 人捐贈 · 共 ${f.items.reduce((s,i)=>s+(parseInt(i.quantity)||0),0)} 件</div></div>`).join(''):'<p class="text-xs text-slate-400">暫無食品捐贈紀錄</p>'}</div>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button onclick="app.exportDonationsData()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>匯出全部 JSON</button>
          <button onclick="app.exportDonationsCSV()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>匯出 CSV</button>
        </div>
      </div>`;
  }
,
  renderDonGoods(body,goods,canManage){
    const baseUrl=window.location.origin+window.location.pathname;
    const goodsUrl=baseUrl+'#donate-goods';
    body.innerHTML=`
      <div class="space-y-4">
        <div class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
          <div class="flex-1"><h4 class="font-bold text-sm"><i class="fa-solid fa-qrcode mr-1"></i>物品捐贈 QR Code</h4><p class="text-[11px] text-blue-100 mt-1">掃碼填表 → 提交 → 下一個人掃同一個碼再填。一個 QR Code 處理全部捐贈！</p><p class="text-[10px] text-blue-200 mt-1 break-all font-mono">${escapeHtml(goodsUrl)}</p></div>
          <div id="qr-goods-inline" class="flex-shrink-0"></div>
          <div class="flex gap-2 flex-shrink-0"><button onclick="app.downloadQR('qr-goods-inline','物品捐贈QRCode')" class="bg-white text-blue-700 px-3 py-2 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載QR</button><button onclick="window.open('${goodsUrl}','_blank')" class="bg-white/20 text-white px-3 py-2 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>預覽</button></div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button onclick="app.openGoodsDonationForm()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>填寫物品捐贈表</button>
          <button onclick="app.exportDonationsCSV('goods')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出物品 CSV</button>
        </div>
        ${goods.length?`<div class="space-y-3">${goods.map(g=>{
          const total=g.items.reduce((s,i)=>s+(parseInt(i.quantity)||0),0);
          return `<div class="bg-white border rounded-xl p-4 space-y-2">
            <div class="flex justify-between items-start gap-2"><div><b class="text-[14px]">${escapeHtml(g.scout_group||'未填旅團')}</b><div class="text-[11px] text-slate-500 mt-1">領袖：${escapeHtml(g.leader_name||'')} ${escapeHtml(g.leader_position||'')} · 電話：${escapeHtml(g.leader_phone||'')} · ${escapeHtml(g.leader_email||'')}</div></div><div class="text-right"><div class="text-[10px] text-slate-400">${escapeHtml(g.date||'')}</div>${canManage?`<button onclick="app.deleteDonation('goods','${g.id}')" class="text-rose-500 text-[10px] mt-1"><i class="fa-solid fa-trash"></i></button>`:''}</div></div>
            <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">#</th><th class="px-2 py-1 text-left">捐贈者姓名</th><th class="px-2 py-1 text-center">數量</th></tr></thead><tbody class="divide-y">${(g.items||[]).map((it,i)=>`<tr><td class="px-2 py-1">${i+1}</td><td class="px-2 py-1 font-medium">${escapeHtml(it.name||'')}</td><td class="px-2 py-1 text-center">${escapeHtml(String(it.quantity||''))}</td></tr>`).join('')}</tbody></table></div>
            <div class="text-[11px] text-emerald-700 font-bold">總數量：${total} 單位 · 共 ${(g.items||[]).length} 人捐贈</div>
          </div>`;
        }).join('')}</div>`:'<div class="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center"><div class="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mx-auto"><i class="fa-solid fa-box-open"></i></div><h4 class="font-bold text-sm mt-3">暫無物品捐贈紀錄</h4><p class="text-xs text-slate-400 mt-1">點擊「填寫物品捐贈表」開始記錄</p></div>'}
      </div>`;
    setTimeout(()=>{ this.generateQR('qr-goods-inline',goodsUrl); },100);
  }
,
  renderDonFood(body,food,canManage){
    const baseUrl=window.location.origin+window.location.pathname;
    const foodUrl=baseUrl+'#donate-food';
    body.innerHTML=`
      <div class="space-y-4">
        <div class="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
          <div class="flex-1"><h4 class="font-bold text-sm"><i class="fa-solid fa-qrcode mr-1"></i>食品捐贈 QR Code</h4><p class="text-[11px] text-amber-100 mt-1">掃碼填表 → 提交 → 下一個人掃同一個碼再填。一個 QR Code 處理全部捐贈！</p><p class="text-[10px] text-amber-200 mt-1 break-all font-mono">${escapeHtml(foodUrl)}</p></div>
          <div id="qr-food-inline" class="flex-shrink-0"></div>
          <div class="flex gap-2 flex-shrink-0"><button onclick="app.downloadQR('qr-food-inline','食品捐贈QRCode')" class="bg-white text-amber-700 px-3 py-2 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載QR</button><button onclick="window.open('${foodUrl}','_blank')" class="bg-white/20 text-white px-3 py-2 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>預覽</button></div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button onclick="app.openFoodDonationForm()" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>填寫食品捐贈表</button>
          <button onclick="app.exportDonationsCSV('food')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出食品 CSV</button>
        </div>
        ${food.length?`<div class="space-y-3">${food.map(f=>{
          const total=f.items.reduce((s,i)=>s+(parseInt(i.quantity)||0),0);
          return `<div class="bg-white border rounded-xl p-4 space-y-2">
            <div class="flex justify-between items-start gap-2"><div><b class="text-[14px]">${escapeHtml(f.scout_group||'未填旅團')}</b><div class="text-[11px] text-slate-500 mt-1">領袖：${escapeHtml(f.leader_name||'')} ${escapeHtml(f.leader_position||'')} · 電話：${escapeHtml(f.leader_phone||'')} · ${escapeHtml(f.leader_email||'')}</div></div><div class="text-right"><div class="text-[10px] text-slate-400">${escapeHtml(f.date||'')}</div>${canManage?`<button onclick="app.deleteDonation('food','${f.id}')" class="text-rose-500 text-[10px] mt-1"><i class="fa-solid fa-trash"></i></button>`:''}</div></div>
            <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">#</th><th class="px-2 py-1 text-left">捐贈者姓名</th><th class="px-2 py-1 text-center">數量</th></tr></thead><tbody class="divide-y">${(f.items||[]).map((it,i)=>`<tr><td class="px-2 py-1">${i+1}</td><td class="px-2 py-1 font-medium">${escapeHtml(it.name||'')}</td><td class="px-2 py-1 text-center">${escapeHtml(String(it.quantity||''))}</td></tr>`).join('')}</tbody></table></div>
            <div class="text-[11px] text-amber-700 font-bold">總數量：${total} 件 · 共 ${(f.items||[]).length} 人捐贈</div>
          </div>`;
        }).join('')}</div>`:'<div class="bg-white border-2 border-dashed border-amber-200 rounded-2xl p-8 text-center"><div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mx-auto"><i class="fa-solid fa-apple-whole"></i></div><h4 class="font-bold text-sm mt-3">暫無食品捐贈紀錄</h4><p class="text-xs text-slate-400 mt-1">點擊「填寫食品捐贈表」開始記錄</p></div>'}
      </div>`;
    setTimeout(()=>{ this.generateQR('qr-food-inline',foodUrl); },100);
  }
,
  renderDonQRCode(body){
    const baseUrl=window.location.origin+window.location.pathname;
    const goodsUrl=baseUrl+'#donate-goods';
    const foodUrl=baseUrl+'#donate-food';
    body.innerHTML=`
      <div class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900">
          <b><i class="fa-solid fa-qrcode mr-1"></i>QR Code：</b>產生 QR Code 後，可列印或分享給捐贈人士掃碼填表。掃碼後直接進入 APP 的捐贈填表頁面，填完自動存入系統。
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white border rounded-xl p-5 text-center space-y-3">
            <h4 class="font-bold text-sm text-blue-700"><i class="fa-solid fa-box-open mr-1"></i>物品捐贈 QR Code</h4>
            <div id="qr-goods" class="flex justify-center"></div>
            <p class="text-[10px] text-slate-500 break-all">${escapeHtml(goodsUrl)}</p>
            <button onclick="app.downloadQR('qr-goods','物品捐贈QRCode')" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>下載 QR Code</button>
          </div>
          <div class="bg-white border rounded-xl p-5 text-center space-y-3">
            <h4 class="font-bold text-sm text-amber-700"><i class="fa-solid fa-apple-whole mr-1"></i>食品捐贈 QR Code</h4>
            <div id="qr-food" class="flex justify-center"></div>
            <p class="text-[10px] text-slate-500 break-all">${escapeHtml(foodUrl)}</p>
            <button onclick="app.downloadQR('qr-food','食品捐贈QRCode')" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>下載 QR Code</button>
          </div>
        </div>
      </div>`;
    setTimeout(()=>{
      this.generateQR('qr-goods',goodsUrl);
      this.generateQR('qr-food',foodUrl);
    },100);
  }
,
  generateQR(containerId,text){
    const container=document.getElementById(containerId);
    if(!container) return;
    // 簡易 QR Code 產生（使用 Google Charts API）
    const size=200;
    const url=`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
    container.innerHTML=`<img src="${url}" width="${size}" height="${size}" alt="QR Code" class="rounded-xl border">`;
  }
,
  downloadQR(containerId,fileName){
    const img=document.querySelector('#'+containerId+' img');
    if(!img){ showToast('QR Code 尚未產生','warning'); return; }
    const a=document.createElement('a'); a.href=img.src; a.download=(fileName||'qrcode')+'.png'; a.click();
    showToast('已下載 QR Code','success');
  }
,
  openGoodsDonationForm(existing=null){
    let itemsHtml='';
    for(let i=0;i<30;i++){
      const val=existing?.items?.[i]?.name||'';
      const qty=existing?.items?.[i]?.quantity||'';
      itemsHtml+=`<div class="flex gap-2 items-center"><span class="text-[10px] text-slate-400 w-6 text-right flex-shrink-0">${i+1}</span><input id="gd-name-${i}" value="${escapeHtml(val)}" placeholder="捐贈者姓名" class="flex-1 px-2 py-1.5 border rounded-lg text-sm"><input id="gd-qty-${i}" value="${escapeHtml(qty)}" placeholder="數量" type="number" min="0" class="w-20 px-2 py-1.5 border rounded-lg text-sm text-center"></div>`;
    }
    const html=`
      <input type="hidden" id="gd-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="gd-id" value="${existing?.id||''}">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">所屬童軍旅 *</label><input id="gd-group" value="${escapeHtml(existing?.scout_group||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">負責領袖姓名 *</label><input id="gd-leader" value="${escapeHtml(existing?.leader_name||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">職位</label><input id="gd-position" value="${escapeHtml(existing?.leader_position||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">聯絡電話</label><input id="gd-phone" value="${escapeHtml(existing?.leader_phone||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="sm:col-span-2"><label class="text-[11px] font-bold">電郵地址</label><input id="gd-email" value="${escapeHtml(existing?.leader_email||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      </div>
      <div class="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
        <label class="text-[11px] font-bold text-blue-900"><i class="fa-solid fa-list mr-1"></i>捐贈者名單（最多 30 人）· 文具以 10 件為 1 單位</label>
        <div class="mt-2 space-y-1.5 max-h-[300px] overflow-y-auto">${itemsHtml}</div>
      </div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯物品捐贈表':'填寫物品捐贈表（童心捐贈大行動）';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitGoodsDonationForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitGoodsDonationForm(){
    const mode=document.getElementById('gd-mode').value;
    const id=document.getElementById('gd-id').value;
    const items=[];
    for(let i=0;i<30;i++){
      const name=document.getElementById('gd-name-'+i)?.value.trim();
      const qty=document.getElementById('gd-qty-'+i)?.value.trim();
      if(name) items.push({name,quantity:qty||'1'});
    }
    const record={
      id:id||('gd_'+Date.now()),
      scout_group:document.getElementById('gd-group').value.trim(),
      leader_name:document.getElementById('gd-leader').value.trim(),
      leader_position:document.getElementById('gd-position').value.trim(),
      leader_phone:document.getElementById('gd-phone').value.trim(),
      leader_email:document.getElementById('gd-email').value.trim(),
      date:todayISO(),
      items:items
    };
    if(!record.scout_group||!record.leader_name){ showToast('請填寫旅團及領袖姓名','error'); return; }
    const data=this.getDonationsData();
    if(mode==='edit'){ const idx=data.goods.findIndex(g=>g.id===id); if(idx>=0) data.goods[idx]=record; }
    else data.goods.push(record);
    this.saveDonationsData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('物品捐贈表已保存','success');
    this.renderDonationsModule();
  }
,
  openFoodDonationForm(existing=null){
    let itemsHtml='';
    for(let i=0;i<30;i++){
      const val=existing?.items?.[i]?.name||'';
      const qty=existing?.items?.[i]?.quantity||'';
      itemsHtml+=`<div class="flex gap-2 items-center"><span class="text-[10px] text-slate-400 w-6 text-right flex-shrink-0">${i+1}</span><input id="fd-name-${i}" value="${escapeHtml(val)}" placeholder="捐贈者姓名" class="flex-1 px-2 py-1.5 border rounded-lg text-sm"><input id="fd-qty-${i}" value="${escapeHtml(qty)}" placeholder="數量" type="number" min="0" class="w-20 px-2 py-1.5 border rounded-lg text-sm text-center"></div>`;
    }
    const html=`
      <input type="hidden" id="fd-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="fd-id" value="${existing?.id||''}">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">所屬童軍旅 *</label><input id="fd-group" value="${escapeHtml(existing?.scout_group||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">負責領袖姓名 *</label><input id="fd-leader" value="${escapeHtml(existing?.leader_name||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">職位</label><input id="fd-position" value="${escapeHtml(existing?.leader_position||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">聯絡電話</label><input id="fd-phone" value="${escapeHtml(existing?.leader_phone||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="sm:col-span-2"><label class="text-[11px] font-bold">電郵地址</label><input id="fd-email" value="${escapeHtml(existing?.leader_email||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      </div>
      <div class="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <label class="text-[11px] font-bold text-amber-900"><i class="fa-solid fa-list mr-1"></i>捐贈者名單（最多 30 人）</label>
        <div class="mt-2 space-y-1.5 max-h-[300px] overflow-y-auto">${itemsHtml}</div>
      </div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯食品捐贈表':'填寫食品捐贈表（童心捐贈大行動）';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitFoodDonationForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitFoodDonationForm(){
    const mode=document.getElementById('fd-mode').value;
    const id=document.getElementById('fd-id').value;
    const items=[];
    for(let i=0;i<30;i++){
      const name=document.getElementById('fd-name-'+i)?.value.trim();
      const qty=document.getElementById('fd-qty-'+i)?.value.trim();
      if(name) items.push({name,quantity:qty||'1'});
    }
    const record={
      id:id||('fd_'+Date.now()),
      scout_group:document.getElementById('fd-group').value.trim(),
      leader_name:document.getElementById('fd-leader').value.trim(),
      leader_position:document.getElementById('fd-position').value.trim(),
      leader_phone:document.getElementById('fd-phone').value.trim(),
      leader_email:document.getElementById('fd-email').value.trim(),
      date:todayISO(),
      items:items
    };
    if(!record.scout_group||!record.leader_name){ showToast('請填寫旅團及領袖姓名','error'); return; }
    const data=this.getDonationsData();
    if(mode==='edit'){ const idx=data.food.findIndex(f=>f.id===id); if(idx>=0) data.food[idx]=record; }
    else data.food.push(record);
    this.saveDonationsData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('食品捐贈表已保存','success');
    this.renderDonationsModule();
  }
,
  deleteDonation(type,id){
    if(!confirm('確定刪除此捐贈紀錄？')) return;
    const data=this.getDonationsData();
    if(type==='goods') data.goods=(data.goods||[]).filter(g=>g.id!==id);
    else data.food=(data.food||[]).filter(f=>f.id!==id);
    this.saveDonationsData(data);
    showToast('已刪除','warning');
    this.renderDonationsModule();
  }
,
  exportDonationsData(){
    const data=this.getDonationsData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`donations_${todayISO()}.json`; a.click();
    showToast('已匯出捐贈資料 JSON','success');
  }
,
  exportDonationsCSV(type){
    const data=this.getDonationsData();
    const rows=[['類型','旅團','領袖','職位','電話','電郵','日期','捐贈者姓名','數量']];
    const addRows=(list,donType)=>list.forEach(f=>{(f.items||[]).forEach(it=>rows.push([donType,f.scout_group,f.leader_name,f.leader_position,f.leader_phone,f.leader_email,f.date,it.name,it.quantity]));});
    if(!type||type==='goods') addRows(data.goods||[],'物品');
    if(!type||type==='food') addRows(data.food||[],'食品');
    if(rows.length<=1){ showToast('暫無捐贈資料','warning'); return; }
    this.downloadCSV(`donations_${todayISO()}.csv`,rows);
  }
,
});
