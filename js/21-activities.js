/* 21-activities.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== Activities Enhanced Module v6.8 ===================== */
  canUploadActivity(){
    const role=this.currentUser?.role||'';
    const lvl=ROLE_HIERARCHY[role]||0;
    // 相關主任、副主席或以上上傳；v8.14：行政組（負責組）亦可
    if(this.isCardOwnerGroup&&this.isCardOwnerGroup('activities')) return true;
    return lvl>=30 || ['super_admin','admin','chairperson','advisor','vice_chairperson','general_director','director'].includes(role);
  }
,
  getActivitiesData(){
    const key=LS.activities(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local) return local;
    const raw=this.eventData['activities']||[];
    // raw may be array of activities, convert to new structure
    let activities=[], maps=[], booths=[], gameCards=[], booth_source=null;
    if(Array.isArray(raw)){
      activities=raw.map((a,i)=>({id:a.activity_id||'act_'+i,title:a.title||a.name||'未命名活動',type:a.type||'攤位',location:a.location||'',description:a.description||'',details:a.details||a.details_json||'',created_at:a.created_at||''}));
    }else{
      activities=(raw.activities||[]).map((a,i)=>({id:a.id||'act_'+i,title:a.title||'',type:a.type||'',location:a.location||'',description:a.description||'',details:a.details||''}));
      maps=raw.maps||[];
      booths=raw.booths||[];
      gameCards=raw.gameCards||raw.game_cards||[];
      booth_source=raw.booth_source||null;
    }
    // 模擬示範活動才加入示範預設資料；真實活動(ISD等)為預留版位(空白)
    if(this.isDemoEvent()){
    // 場地分佈圖預設：依攤位 A-F 主題分區 (黃竹坑香港警察學院)
    if(maps.length===0){
      maps=[
        {id:'map_zone',title:'場地分佈圖 - 攤位 A-F 主題分區',description:'主營地按六大主題範疇分區：A 積極公民 · B 創新變革 · C 服務社群 · D 持續發展 · E 品格價值 · F 身心全健。正門入場後沿主營地中軸兩側設置攤位；大操場為典禮及檢閱場地；有蓋操場為拍照及午膳區；莫榮大樓為嘉賓茶聚地點。',file_url:'',file_data:'',file_name:'',created_by:'系統',created_at:''},
        {id:'map_site',title:'場地指示圖（舊手冊）',description:'港島童軍繽紛日場地指示圖，可開啟查看實際場地分佈及出入口／報到處位置。',file_url:'https://sites.google.com/hkirscout.org.hk/isd/%E5%A0%B4%E5%9C%B0%E6%8C%87%E7%A4%BA%E5%9C%96?authuser=0',file_data:'',file_name:'場地指示圖',created_by:'系統',created_at:''}
      ];
    }
    // 遊戲卡默認：六大範疇主題節目記錄冊 (集印章換紀念章)
    if(gameCards.length===0){
      gameCards=[{id:'gc_passport',title:'主題節目遊戲記錄冊（集印章換紀念章）',description:'「領袖能力值」蓋章記錄冊：完成六大範疇（積極公民／創新變革／服務社群／持續發展／品格價值／身心全健）每個範疇最少兩個活動，到換領處領取主題節目紀念章。可開啟查看設計。',file_name:'遊戲記錄冊',file_url:'https://drive.google.com/file/d/1SlQaC2XDyj6ZP6FH1edu7Xy1y6ct-5PW/view',file_data:'',created_by:'主題節目組',created_at:''}];
    }
    // 2025 真實攤位總表 (Copy of ISD2025 攤位資料)：攤位編號 + 負責單位真實，負責人用自創代號
    if(booths.length===0){
      const ZONE={A:'積極公民',B:'創新變革',C:'服務社群',D:'持續發展',E:'品格價值',F:'身心全健'};
      const MOCKP=['蔡永康','陳美琪','區志豪','石嘉欣','盧振邦','何詠詩','高俊傑','潘凱琳','蘇文軒','羅芷晴','黃嘉玲','吳天佑','林曉彤','鄭啟明','梁志豪','謝詠詩','張子軒','楊家俊','黎芷珊','麥健豪','袁可欣','鄧偉強','傅美玲','戴文傑','葉俊朗','譚嘉儀','曾俊熙','沈潔瑩','廖啟光','郭詠珊','崔志明','陸文靜','馬國輝','汪凱晴','朱敬軒','伍雅雯','阮俊龍','董家欣'];
      // [攤位號, 負責單位, 攤位名稱]
      const raw=[
        ['A01','主題節目組','積極公民·印章收集站'],['A02','港島航空組','飛行模擬體驗'],['A03','港島手工藝坊','童軍繩結挑戰'],['A04','港島手工藝坊','防騙小偵探'],['A05','港島手工藝坊','禁毒問答站'],['A06','港島地域步行宣傳委員會','步行宣傳互動站'],['A07','主題節目組','認識社會議題'],['A08','香港資助機構','資助機構資訊站'],
        ['B01','港島航空組','飛行模擬挑戰'],['B02','港島童軍總會','童軍技能創新'],['B03','灣仔區','AR解碼謎團'],['B04','港島地域海童軍保安委員會','海上拯救大作戰'],['B05','港島海童軍小組','消失的密碼'],
        ['C01','膳食回收組','衣物回收'],['C02','環境保護社會服務處','社區食物銀行'],['C03','食物回收站','食物回收行動'],['C04','港島地域發展部','直屬旅團招募'],['C05','港島地域發展部','直屬旅團宣傳'],['C07','港島童軍保安委員會','舊衣物回收'],['C08','港島童軍保安委員會','義工宣傳站'],
        ['D01','港島西區','環保回收站'],['D02','港島第6旅','海洋探險2.0'],['D03','港島童軍總會','永續生活展'],['D04','港島地域海童軍保安委員會','永續生活展'],['D05','港島海童軍小組','永續生活展'],
        ['E01','港島地域海童軍保安委員會','海上歷險'],['E02','港島地域國際及外交事務部','榮譽之路·光榮之旅'],['E03','港島第243旅','正向價值大轉盤'],['E04','港島第98旅','重視正向·無偏見'],['E05','港島第108旅','重視正向·無偏見'],
        ['F01','香港青少年服務中心','情緒急救站'],['F02','港島童軍總會發展部','青少年精神健康展'],['F03','港島童軍總會發展部','守護三步曲'],['F04','中國基建及教育','升旗體驗站'],['F05','香港中華基督教青少年教育中心','身心特訓'],['F06','港島童軍總部','DIY專章工作坊'],['F07','港島第186旅','精神大作戰'],['F08','港島童軍聯會','快問快答']
      ];
      booths=raw.map((r,i)=>{
        const zone=r[0].charAt(0);
        return {id:'booth_'+(i+1),booth_number:r[0],booth_name:r[2],location:'主營地 '+zone+'區',group_name:r[1],theme:ZONE[zone]||'',game_type:'攤位',responsible:MOCKP[i%MOCKP.length],contact:'9'+String(50000000+i*137).slice(-7),description:'『'+ZONE[zone]+'』主題攤位，完成遊戲可獲「領袖能力值」印章',file_name:'',file_data:'',file_url:'',created_by:'系統',created_at:''};
      });
    }
    }
    return {activities, maps, booths, gameCards, booth_source, drive_folder_link: (this.eventData['activities']?.drive_folder_link||'https://drive.google.com/drive/folders/1zkJI5Yp1xv6PNSp8e7kJRKcjRjlyDO8C')};
  }
,
  saveActivitiesData(data){
    const key=LS.activities(this.currentEvent?.event_id||'isd_2026');
    localStorage.setItem(key, JSON.stringify(data));
    this.eventData['activities']=data;
    if(!this.mockMode && this.gasUrl){
      // Save to GAS as Documents? For simplicity save to Activities sheet as JSON
      data.booths.forEach(b=>{
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Activities',record:{activity_id:b.id,event_id:this.currentEvent?.event_id||'isd_2026',title:b.booth_name||b.booth_number,type:'booth',location:b.location,description:b.description,details_json:JSON.stringify(b)}})}).catch(()=>{});
      });
    }
  }
,
  renderActivitiesModule(box){
    const container=box||document.getElementById('module-content');
    if(!this.activitiesSubTab) this.activitiesSubTab='maps';
    const data=this.getActivitiesData();
    const canUpload=this.canUploadActivity();
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-900">
          <b>場地與活動總覽：</b>地圖、攤位列表（Drive 攤位資料）、攤位總表（2026 總表）、場地佈置總覽、遊戲卡、活動列表；上傳需主任／副主席以上。
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchActivitiesTab('maps')" class="tab-btn ${this.activitiesSubTab==='maps'?'active':''}"><i class="fa-solid fa-map mr-1"></i> 地圖 (${data.maps.length})</button>
          <button onclick="app.switchActivitiesTab('booths')" class="tab-btn ${this.activitiesSubTab==='booths'?'active':''}"><i class="fa-solid fa-table mr-1"></i> 攤位列表 (${data.booths.length})</button>
          <button onclick="app.switchActivitiesTab('booth_master')" class="tab-btn ${this.activitiesSubTab==='booth_master'?'active':''}"><i class="fa-solid fa-store mr-1"></i> 攤位總表</button>
          <button onclick="app.switchActivitiesTab('venue_setup')" class="tab-btn ${this.activitiesSubTab==='venue_setup'?'active':''}"><i class="fa-solid fa-map-pin mr-1"></i> 場地佈置總覽</button>
          <button onclick="app.switchActivitiesTab('gamecards')" class="tab-btn ${this.activitiesSubTab==='gamecards'?'active':''}"><i class="fa-solid fa-id-card mr-1"></i> 遊戲卡 (${data.gameCards.length})</button>
          <button onclick="app.switchActivitiesTab('activities')" class="tab-btn ${this.activitiesSubTab==='activities'?'active':''}"><i class="fa-solid fa-list mr-1"></i> 活動列表 (${data.activities.length})</button>
        </div>
        <div id="activities-tab-maps" class="${this.activitiesSubTab==='maps'?'':'hidden'}"></div>
        <div id="activities-tab-booths" class="${this.activitiesSubTab==='booths'?'':'hidden'}"></div>
        <div id="activities-tab-booth_master" class="${this.activitiesSubTab==='booth_master'?'':'hidden'}">${this.boothMasterPanelHTML()}</div>
        <div id="activities-tab-venue_setup" class="${this.activitiesSubTab==='venue_setup'?'':'hidden'}"></div>
        <div id="activities-tab-gamecards" class="${this.activitiesSubTab==='gamecards'?'':'hidden'}"></div>
        <div id="activities-tab-activities" class="${this.activitiesSubTab==='activities'?'':'hidden'}"></div>
      </div>
    `;
    this.renderActivitiesMaps();
    this.renderActivitiesBooths();
    this.renderActivitiesVenueSetupPanel();   // v11：場地佈置總覽（上傳式，同遊戲卡）已移入本頁
    this.renderActivitiesGameCards();
    this.renderActivitiesList();
  }
,
  switchActivitiesTab(tab){
    this.activitiesSubTab=tab;
    document.querySelectorAll('[id^="activities-tab-"]').forEach(el=>el.classList.add('hidden'));
    document.getElementById('activities-tab-'+tab)?.classList.remove('hidden');
    document.querySelectorAll('[onclick^="app.switchActivitiesTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'tab-btn active':'tab-btn';
    });
  }
,
  renderActivitiesMaps(){
    const container=document.getElementById('activities-tab-maps');
    if(!container) return;
    const data=this.getActivitiesData();
    const canUpload=this.canUploadActivity();
    container.innerHTML=`
      <div class="space-y-3">
        <div class="flex flex-wrap gap-2">
          ${canUpload?`<button onclick="app.openActivityMapForm()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-map mr-1"></i>上傳地圖 (主任/副主席以上)</button>`:''}
          <button onclick="app.downloadActivityTemplate('map')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載地圖範本</button>
        </div>
        <div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-sky-900 leading-relaxed">上傳方式同「遊戲卡」：可上傳 <b>PDF／Word／圖片</b>，或貼上 <b>Drive 連結</b>；Word 會自動解析成文字內嵌，PDF 會整份內嵌預覽。</div>
        ${data.maps.length?`<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${data.maps.map(m=>`
          <div class="border rounded-xl p-3 bg-white space-y-2">
            <div class="flex justify-between items-start"><div><b class="text-[13px]">${escapeHtml(m.title||'場地地圖')}</b><div class="text-[11px] text-slate-500 mt-1">${escapeHtml(m.description||'')}</div><div class="text-[10px] text-slate-400 mt-1">上傳: ${escapeHtml(m.created_by||'')} | ${m.created_at?new Date(m.created_at).toLocaleString():''} | 版本: ${escapeHtml(m.version||'v1')}</div></div><div class="flex flex-col gap-1">${canUpload?`<button onclick="app.openActivityMapForm('${m.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteActivityMap('${m.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️ 刪除</button>`:''}</div></div>
            ${this.activityFilePreviewHTML(m,'map')}
            <div class="flex gap-2">${m.file_url?`<a href="${m.file_url}" target="_blank" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">開啟地圖</a>`:''}${m.file_data||m.file_name?`<button onclick="app.downloadActivityFile('${m.id}','map')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold">下載</button>`:''}</div>
          </div>
        `).join('')}</div>`:`<p class="text-xs text-slate-400 py-8 text-center">暫無地圖，相關主任、副主席或以上可上傳場地分佈圖 (參考舊手冊有地圖)</p>`}
      </div>
    `;
  }
,
  renderActivitiesBooths(){
    const container=document.getElementById('activities-tab-booths');
    if(!container) return;
    const data=this.getActivitiesData();
    const canUpload=this.canUploadActivity();
    const src=data.booth_source||null;
    container.innerHTML=`
      <div class="space-y-3">
        <div class="bg-slate-50 border rounded-xl p-2.5 text-[10.5px] text-slate-600 leading-relaxed"><b>「攤位列表」＝攤位基本資料一覽</b>（編號／名稱／位置／負責單位／負責人，由 Drive「ISD2026 攤位資料」同步）。<br>要有<b>已聯絡／已回覆／確認出席</b>聯絡進度及「攤位計劃書」自動填入內容嘅 <b>「2026 攤位總表」</b>，請按上方「攤位總表」分頁。</div>
        ${src?this.driveSyncNotice():''}
        ${src?`<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] leading-relaxed text-sky-900">
          <b><i class="fa-solid fa-cloud-arrow-down mr-1"></i>攤位資料來源（內建式，不用跳轉 Drive）：</b>「${escapeHtml(src.name||'ISD2026 攤位資料')}」
          <a href="https://drive.google.com/file/d/${escapeHtml(src.drive_file_id)}/view" target="_blank" class="text-sky-700 underline">📂 開啟 Drive 檔案</a>
          <br>• 由<b>節目組副主席</b>負責更新。若該檔為原生「Google 試算表」，點「同步最新」即直接在 APP 內讀取最新內容（各組在 Drive 一改，APP 即時同步）。
          <br>• 若仍是 .xlsx 檔：建議在 Drive「檔案 → 另存為 Google 試算表」後同步，或由副主席直接「上傳 Excel（同步到名單）」。
        </div>`:''}
        <div class="flex flex-wrap gap-2">
          <button onclick="app.syncBoothsFromDrive()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步最新 (Drive 直接讀)</button>
          ${canUpload?`<button onclick="app.openBoothForm()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增攤位</button>
          <label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">⬆️ 上傳 Excel（同步到名單）<input type="file" accept=".xlsx,.xls" class="hidden" onchange="app.handleBoothExcelUpload(this.files[0])"></label>`:''}
          <button onclick="app.downloadActivityTemplate('booth')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載範本 CSV</button>
          <button onclick="app.printBooths()" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold">列印列表</button>
        </div>
        <div id="booths-print-area" class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-sm mb-3">攤位列表 (共 ${data.booths.length} 個攤位 · 由節目組負責更新)</h4>
          <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">攤位編號</th><th class="px-2 py-1 text-left">攤位名稱</th><th class="px-2 py-1 text-left">位置</th><th class="px-2 py-1 text-left">組別/負責旅團</th><th class="px-2 py-1 text-left">主題/遊戲類型</th><th class="px-2 py-1 text-left">負責人/聯絡</th><th class="px-2 py-1 text-right">操作</th></tr></thead><tbody class="divide-y">${data.booths.map(b=>`
            <tr><td class="px-2 py-1 font-mono font-bold" data-label="編號">${escapeHtml(b.booth_number)}</td><td class="px-2 py-1 font-medium" data-label="名稱">${escapeHtml(b.booth_name)}</td><td class="px-2 py-1" data-label="位置">${escapeHtml(b.location)}</td><td class="px-2 py-1" data-label="組別">${escapeHtml(b.group_name)}</td><td class="px-2 py-1" data-label="主題">${escapeHtml(b.theme||'')}<br><span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full">${escapeHtml(b.game_type||'')}</span></td><td class="px-2 py-1" data-label="負責人">${escapeHtml(b.responsible||'')}<br><span class="text-[10px] text-slate-500">${escapeHtml(b.contact||'')}</span></td><td class="px-2 py-1 text-right" data-label="操作"><div class="flex gap-1 justify-end">${canUpload?`<button onclick="app.openBoothForm('${b.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteBooth('${b.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`:''}</div></td></tr>
          `).join('') || '<tr><td colspan="7" class="px-2 py-4 text-center text-slate-400">暫無攤位資料，請上傳攤位列表或新增</td></tr>'}</tbody></table></div>
          <div class="mt-3 text-[10px] text-slate-500">攤位欄位格式：攤位編號 · 攤位名稱 · 位置 · 組別/負責旅團 · 主題 · 遊戲類型 · 負責人 · 聯絡 · 描述。節目組副主席可在 Drive 更新 Google 試算表後點「同步最新」，或直接上傳 Excel 同步。</div>
        </div>
      </div>
    `;
  }
,
  /* —— 主題節目組卡片「攤位資料（Drive）」頁籤：完整攤位資料（同場地與活動總覽「攤位總覽」，含 Drive 來源）—— */
  renderGroupBoothDataHTML(){
    const data=this.getActivitiesData();
    const canUpload=this.canUploadActivity();
    const src=data.booth_source||null;
    const drive=this.eventData?.drive||{};
    const groupFolder=(drive.groups||{})['節目組']||'';
    const rows=(data.booths||[]).map(b=>`
      <tr><td class="px-2 py-1 font-mono font-bold" data-label="編號">${escapeHtml(b.booth_number||'')}</td><td class="px-2 py-1 font-medium" data-label="名稱">${escapeHtml(b.booth_name||'')}</td><td class="px-2 py-1" data-label="位置">${escapeHtml(b.location||'')}</td><td class="px-2 py-1" data-label="組別">${escapeHtml(b.group_name||'')}</td><td class="px-2 py-1" data-label="主題">${escapeHtml(b.theme||'')}<br><span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full">${escapeHtml(b.game_type||'')}</span></td><td class="px-2 py-1" data-label="負責人">${escapeHtml(b.responsible||'')}<br><span class="text-[10px] text-slate-500">${escapeHtml(b.contact||'')}</span></td>${b.description?`<td class="px-2 py-1 text-[10px]" data-label="描述">${escapeHtml(b.description)}</td>`:''}${canUpload?`<td class="px-2 py-1 text-right"><div class="flex gap-1 justify-end"><button onclick="app.openBoothForm('${b.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteBooth('${b.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></div></td>`:''}</tr>`).join('');
    return `<div class="space-y-3">
      ${src?this.driveSyncNotice():''}
      ${src?`<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] leading-relaxed text-sky-900">
        <b><i class="fa-solid fa-cloud-arrow-down mr-1"></i>攤位資料來源（DRIVE 內，內建式不用跳轉）：</b>「${escapeHtml(src.name||'ISD2026 攤位資料')}」
        <a href="https://drive.google.com/file/d/${escapeHtml(src.drive_file_id)}/view" target="_blank" class="text-sky-700 underline">📂 開啟 Drive 檔案</a>
        ${groupFolder?` · <a href="https://drive.google.com/drive/folders/${escapeHtml(groupFolder)}" target="_blank" class="text-sky-700 underline">📁 節目組 Drive 資料夾</a>`:''}
        <br>• 由<b>節目組副主席</b>負責更新；若為原生「Google 試算表」，點「同步最新」即 APP 內讀取最新內容。
      </div>`:(groupFolder?`<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-sky-900">攤位資料（DRIVE）：<a href="https://drive.google.com/drive/folders/${escapeHtml(groupFolder)}" target="_blank" class="text-sky-700 underline">📁 節目組 Drive 資料夾</a></div>`:'')}
      <div class="flex flex-wrap gap-2">
        <button onclick="app.syncBoothsFromDrive()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步最新 (Drive 直接讀)</button>
        ${canUpload?`<button onclick="app.openBoothForm()" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增攤位</button>
        <label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">⬆️ 上傳 Excel（同步到名單）<input type="file" accept=".xlsx,.xls" class="hidden" onchange="app.handleBoothExcelUpload(this.files[0])"></label>`:''}
        <button onclick="app.downloadActivityTemplate('booth')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載範本 CSV</button>
        <button onclick="app.printCoordArea('group-booth-print','2026 攤位總表（DRIVE 攤位資料）')" class="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印</button>
      </div>
      <div id="group-booth-print" class="bg-white border rounded-xl p-4">
        <h4 class="font-bold text-sm mb-3">攤位資料總表 (共 ${(data.booths||[]).length} 個攤位 · 由節目組負責更新)</h4>
        <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">攤位編號</th><th class="px-2 py-1 text-left">攤位名稱</th><th class="px-2 py-1 text-left">位置</th><th class="px-2 py-1 text-left">組別/負責旅團</th><th class="px-2 py-1 text-left">主題/遊戲類型</th><th class="px-2 py-1 text-left">負責人/聯絡</th>${(data.booths||[]).some(b=>b.description)?'<th class="px-2 py-1 text-left">描述</th>':''}${canUpload?'<th class="px-2 py-1 text-right">操作</th>':''}</tr></thead><tbody class="divide-y">${rows||'<tr><td colspan="7" class="px-2 py-4 text-center text-slate-400">暫無攤位資料，請同步 Drive 或上傳總表</td></tr>'}</tbody></table></div>
        <div class="mt-3 text-[10px] text-slate-500">攤位欄位格式：攤位編號 · 攤位名稱 · 位置 · 組別/負責旅團 · 主題 · 遊戲類型 · 負責人 · 聯絡 · 描述。</div>
      </div>
    </div>`;
  }
,
  renderActivitiesGameCards(){
    const container=document.getElementById('activities-tab-gamecards');
    if(!container) return;
    const data=this.getActivitiesData();
    const canUpload=this.canUploadActivity();
    const themes=[
      {en:'Active Citizenship',cn:'積極公民',icon:'fa-solid fa-handshake',color:'from-rose-500 to-pink-500',desc:'認識社會議題（防騙、禁毒、保護兒童等），鼓勵同儕參與，成為推動社會進步的關鍵力量'},
      {en:'Innovative Advancement',cn:'創新變革',icon:'fa-solid fa-lightbulb',color:'from-amber-500 to-orange-500',desc:'以傳統童軍技能配以創新思維，在挑戰中尋找新機會，創新地認識問題及提出解決方案'},
      {en:'Serving Our Community',cn:'服務社群',icon:'fa-solid fa-hand-holding-heart',color:'from-emerald-500 to-teal-500',desc:'以同理心服務他人，學習觀察社會需要，關懷社區內有需要人士，成為能支持他人的領袖'},
      {en:'Sustainable Development',cn:'持續發展',icon:'fa-solid fa-leaf',color:'from-green-500 to-lime-500',desc:'推動可持續生活模式，探索環境保護及聯合國可持續發展目標（UNSDGs）'},
      {en:'Valuable Traits',cn:'品格價值',icon:'fa-solid fa-medal',color:'from-indigo-500 to-blue-500',desc:'培養正向價值觀及國民身份認同，建立良好品格，以身作則影響他人'},
      {en:'Whole-Person Wellness',cn:'身心全健',icon:'fa-solid fa-heart-pulse',color:'from-violet-500 to-purple-500',desc:'強調身心平衡，涵蓋生理及心理健康管理，透過遊戲、身體覺察保持良好狀態'}
    ];
    container.innerHTML=`
      <div class="space-y-3">
        <!-- 主題節目六大範疇 (資料來源: 舊執行手冊「主題節目活動」頁) -->
        <div class="bg-gradient-to-r from-brand-700 to-fuchsia-600 text-white rounded-2xl p-4 relative overflow-hidden">
          <div class="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 text-6xl pointer-events-none"><i class="fa-solid fa-star"></i></div>
          <div class="relative z-10">
            <div class="flex items-center gap-2"><i class="fa-solid fa-star-of-life"></i><b class="text-[14px]">主題節目活動 — 六大範疇</b></div>
            <p class="text-[11px] text-white/85 mt-1 leading-relaxed">「港島童軍繽紛日」以「童心傳承、明日領袖；發展潛能、服務社群」為主軸，參加者於不同攤位遊戲或指定活動後，可獲「領袖能力值」蓋章記錄。在<b>每個範疇完成最少兩個活動</b>後，可到「換領處」領取「主題節目紀念章」乙個。</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-3">
              ${themes.map((t,i)=>`<div class="bg-white/15 backdrop-blur border border-white/25 rounded-xl p-2.5 flex flex-col gap-1.5">
                <div class="w-8 h-8 bg-white/25 rounded-lg flex items-center justify-center text-sm"><i class="${t.icon}"></i></div>
                <div class="font-bold text-[11px] leading-tight">${t.cn}<div class="text-[9px] text-white/70 font-normal">${t.en}</div></div>
              </div>`).join('')}
            </div>
            <div class="mt-2 text-[10px] text-white/70">參加者可在每個範疇完成活動後，於各攤位收集「領袖能力值」印章，集齊後到換領處領取紀念章。</div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          ${canUpload?`<button onclick="app.openGameCardForm()" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-id-card mr-1"></i>上傳遊戲卡 (主任/副主席以上)</button>`:''}
          <button onclick="app.downloadActivityTemplate('gamecard')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載遊戲卡範本</button>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">舊手冊有 <b>ISD2025_passport_v696_outline.pdf</b> 遊戲記錄冊 (集印章換禮物)。攤位按六大範疇分 A–F 區，各區攤位可參閱「攤位總表」，完成每個範疇最少兩個活動即可到換領處換取紀念章。新版可在 APP 內上傳遊戲卡設計，支援 <b>PDF／Word／圖片／Drive 連結</b>，Word 自動解析文字內嵌、PDF 整份內嵌，全部工作人員可查閱下載，手機友善</div>
        ${data.gameCards.length?`<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${data.gameCards.map(g=>`
          <div class="border rounded-xl p-3 bg-white space-y-2">
            <div class="flex justify-between"><div><b class="text-[13px]">${escapeHtml(g.title||'遊戲卡')}</b><div class="text-[11px] text-slate-500 mt-1">${escapeHtml(g.description||'')}</div><div class="text-[10px] text-slate-400 mt-1">上傳: ${escapeHtml(g.created_by||'')} | ${g.created_at?new Date(g.created_at).toLocaleString():''} | 版本: ${escapeHtml(g.version||'v1')}</div></div><div class="flex flex-col gap-1">${canUpload?`<button onclick="app.openGameCardForm('${g.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteGameCard('${g.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️ 刪除</button>`:''}</div></div>
            ${this.activityFilePreviewHTML(g,'gamecard')}
            <div class="flex gap-2">${g.file_url?`<a href="${g.file_url}" target="_blank" class="bg-amber-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">開啟遊戲卡</a>`:''}${g.file_data||g.file_name?`<button onclick="app.downloadActivityFile('${g.id}','gamecard')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold">下載</button>`:''}</div>
          </div>
        `).join('')}</div>`:`<p class="text-xs text-slate-400 py-8 text-center">暫無遊戲卡，相關主任、副主席或以上可上傳 (參考舊版 ISD2025_passport_v696_outline.pdf)</p>`}
      </div>
    `;
  }
,
  renderActivitiesList(){
    const container=document.getElementById('activities-tab-activities');
    if(!container) return;
    const data=this.getActivitiesData();
    container.innerHTML=`<div class="space-y-3"><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${data.activities.map(a=>`<div class="border rounded-xl p-3 bg-white"><b class="text-[13px]">${escapeHtml(a.title)}</b><div class="text-[11px] text-slate-500 mt-1">${escapeHtml(a.type||'')} | ${escapeHtml(a.location||'')} | ${escapeHtml(a.description||'')}</div></div>`).join('') || '<p class="text-xs text-slate-400">暫無活動項目</p>'}</div></div>`;
  }
,
  /* ── 檔案預覽（地圖／遊戲卡共用，上傳方式完全一致）：Drive 連結→iframe 預覽；圖片→img；PDF→整份內嵌；Word/JSON→解析文字內嵌 ── */
  activityFilePreviewHTML(f,type){
    if(!f) return '';
    const isSiteUrl=!!f.file_url&&String(f.file_url).includes('sites.google');
    const isImage=/^data:image\//.test(f.file_data||'');
    const isPdf=/^data:application\/pdf/.test(f.file_data||'');
    let out='';
    if(isSiteUrl){ out+=`<div class="bg-slate-50 border rounded-xl p-3 text-[11px] text-slate-600"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>${escapeHtml(type==='map'?'場地指示圖為網頁，請按下方「開啟地圖」查看':'此項為網頁，請按下方「開啟」查看')}</div>`; }
    if(f.file_url&&!isSiteUrl){ const src=String(f.file_url).includes('/preview')?f.file_url:String(f.file_url).replace('/view','/preview'); out+=`<iframe src="${escapeHtml(src)}" class="w-full h-[320px] border rounded-xl"></iframe>`; }
    if(isImage){ out+=`<img src="${f.file_data}" class="w-full max-h-[400px] object-contain border rounded-xl">`; }
    if(isPdf){ out+=`<iframe src="${f.file_data}" class="w-full h-[520px] border rounded-xl" title="完整PDF內嵌預覽"></iframe>`; }
    if(f.file_text){ out+=`<details class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900"><summary class="cursor-pointer font-bold"><i class="fa-solid fa-file-lines mr-1"></i>解析文字（JSON/Word 內嵌）</summary><div class="mt-2 whitespace-pre-line max-h-[240px] overflow-y-auto">${escapeHtml(f.file_text)}</div></details>`; }
    return out;
  }
,
  openActivityMapForm(editId=null){
    if(!this.canUploadActivity()){ showToast('僅相關主任、副主席或以上可上傳','error'); return; }
    const data=this.getActivitiesData();
    const existing=editId?(data.maps||[]).find(m=>m.id===editId):null;
    let html=`
      <input type="hidden" id="activity-map-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="activity-map-id" value="${existing?.id||''}">
      <div class="space-y-3">
        <div><label class="text-[11px] font-bold">地圖標題 *</label><input id="activity-map-title" value="${escapeHtml(existing?.title||'場地分佈圖')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">描述</label><textarea id="activity-map-desc" rows="2" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>
        <div><label class="text-[11px] font-bold">版本</label><input id="activity-map-version" value="${escapeHtml(existing?.version||'v1')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">上傳地圖文件 (PDF/Word/圖片)</label><input type="file" id="activity-map-file" accept=".jpg,.jpeg,.png,.pdf,.docx,.doc" class="w-full text-xs mt-1"></div>
        <div><label class="text-[11px] font-bold">或貼上 Drive 連結</label><input id="activity-map-url" value="${escapeHtml(existing?.file_url||'')}" placeholder="https://drive.google.com/file/d/.../view" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        ${existing?.file_name?`<div class="text-[11px]">已上傳: ${escapeHtml(existing.file_name)}</div>`:''}
      </div>
    `;
    document.getElementById('record-modal-title').textContent=existing?'編輯地圖':'上傳地圖 (主任/副主席以上)';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=async (e)=>{ e.preventDefault(); await this.submitActivityMapForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async submitActivityMapForm(){
    const mode=document.getElementById('activity-map-mode').value;
    const id=document.getElementById('activity-map-id').value;
    const title=document.getElementById('activity-map-title').value.trim();
    const desc=document.getElementById('activity-map-desc').value.trim();
    const version=document.getElementById('activity-map-version').value.trim()||'v1';
    const url=document.getElementById('activity-map-url').value.trim();
    const fileInput=document.getElementById('activity-map-file');
    let file_name='', file_data='', file_url=url, file_text='';
    if(fileInput.files[0]){
      const f=fileInput.files[0];
      file_name=f.name;
      file_data=await fileToDataUrl(f);
      // Word 檔案：用 mammoth 解析文字作 JSON 內嵌摘要；PDF：整份 base64 內嵌
      if(/\.docx?$/i.test(f.name) && typeof mammoth!=='undefined'){
        try{ const ab=await f.arrayBuffer(); const r=await mammoth.extractRawText({arrayBuffer:ab}); file_text=(r.value||'').trim(); }catch(e){ file_text=''; }
      }
      // Try Drive upload if folder set
      const folderCfg=this.getMeetingFolderConfig();
      if(folderCfg.id && !this.mockMode && this.gasUrl){
        const res=await this.uploadFileToDriveFolder(f.name, file_data, f.type);
        if(res.success){ file_url=res.file_url||res.download_url; file_data=''; }
      }
    }
    if(!title){ showToast('請填寫標題','error'); return; }
    const data=this.getActivitiesData();
    if(mode==='edit'){
      const idx=data.maps.findIndex(m=>m.id===id);
      if(idx>=0) data.maps[idx]={...data.maps[idx], title, description:desc, version, file_name:file_name||data.maps[idx].file_name, file_data:file_data||data.maps[idx].file_data, file_url:file_url||data.maps[idx].file_url, file_text:file_text||data.maps[idx].file_text||'', updated_at:new Date().toISOString()};
    }else{
      data.maps.push({id:'map_'+Date.now(), title, description:desc, version, file_name, file_data, file_url, file_text, created_by:this.currentUser?.name||'', created_at:new Date().toISOString()});
    }
    this.saveActivitiesData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新地圖':'已上傳地圖','success');
    this.renderActivitiesMaps();
  }
,
  deleteActivityMap(id){
    if(!this.canUploadActivity()){ showToast('無權限','error'); return; }
    if(!confirm('確定刪除此地圖？')) return;
    const data=this.getActivitiesData();
    data.maps=data.maps.filter(m=>m.id!==id);
    this.saveActivitiesData(data);
    this.renderActivitiesMaps();
    showToast('已刪除地圖','warning');
  }
,
  downloadActivityFile(id, type){
    const data=this.getActivitiesData();
    let file=null;
    if(type==='map') file=(data.maps||[]).find(m=>m.id===id);
    else if(type==='gamecard') file=(data.gameCards||[]).find(g=>g.id===id);
    else if(type==='booth') file=(data.booths||[]).find(b=>b.id===id);
    if(!file){ showToast('找不到檔案','error'); return; }
    if(file.file_url){ window.open(file.file_url,'_blank'); return; }
    if(file.file_data) downloadDataUrl(file.file_name||'download', file.file_data);
    else showToast('無檔案','warning');
  }
,
  openBoothForm(editId=null){
    if(!this.canUploadActivity()){ showToast('僅相關主任、副主席或以上可上傳','error'); return; }
    const data=this.getActivitiesData();
    const existing=editId?data.booths.find(b=>b.id===editId):null;
    let html=`
      <input type="hidden" id="booth-form-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="booth-form-id" value="${existing?.id||''}">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">攤位編號 *</label><input id="booth-number" value="${escapeHtml(existing?.booth_number||'')}" required placeholder="例如 A01" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">攤位名稱 *</label><input id="booth-name" value="${escapeHtml(existing?.booth_name||'')}" required placeholder="例如 童軍技能挑戰" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">位置</label><input id="booth-location" value="${escapeHtml(existing?.location||'')}" placeholder="主營地 A區" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">組別/負責旅團</label><input id="booth-group" value="${escapeHtml(existing?.group_name||'')}" placeholder="第12旅" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">主題</label><input id="booth-theme" value="${escapeHtml(existing?.theme||'')}" placeholder="繩結" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">遊戲類型</label><input id="booth-game-type" value="${escapeHtml(existing?.game_type||'')}" placeholder="挑戰/定向" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">負責人</label><input id="booth-responsible" value="${escapeHtml(existing?.responsible||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">聯絡</label><input id="booth-contact" value="${escapeHtml(existing?.contact||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">描述</label><textarea id="booth-desc" rows="2" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>
      </div>
    `;
    document.getElementById('record-modal-title').textContent=existing?'編輯攤位':'新增攤位 (主任/副主席以上)';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitBoothForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitBoothForm(){
    const mode=document.getElementById('booth-form-mode').value;
    const id=document.getElementById('booth-form-id').value;
    const booth_number=document.getElementById('booth-number').value.trim();
    const booth_name=document.getElementById('booth-name').value.trim();
    const location=document.getElementById('booth-location').value.trim();
    const group_name=document.getElementById('booth-group').value.trim();
    const theme=document.getElementById('booth-theme').value.trim();
    const game_type=document.getElementById('booth-game-type').value.trim();
    const responsible=document.getElementById('booth-responsible').value.trim();
    const contact=document.getElementById('booth-contact').value.trim();
    const description=document.getElementById('booth-desc').value.trim();
    if(!booth_number||!booth_name){ showToast('請填寫攤位編號和名稱','error'); return; }
    const data=this.getActivitiesData();
    if(mode==='edit'){
      const idx=data.booths.findIndex(b=>b.id===id);
      if(idx>=0) data.booths[idx]={...data.booths[idx], booth_number, booth_name, location, group_name, theme, game_type, responsible, contact, description, updated_at:new Date().toISOString()};
    }else{
      data.booths.push({id:'booth_'+Date.now(), booth_number, booth_name, location, group_name, theme, game_type, responsible, contact, description, file_name:'', file_data:'', file_url:'', created_by:this.currentUser?.name||'', created_at:new Date().toISOString()});
    }
    this.saveActivitiesData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新攤位':'已新增攤位','success');
    this.renderActivitiesBooths();
  }
,
  deleteBooth(id){
    if(!this.canUploadActivity()){ showToast('無權限','error'); return; }
    if(!confirm('確定刪除此攤位？')) return;
    const data=this.getActivitiesData();
    data.booths=data.booths.filter(b=>b.id!==id);
    this.saveActivitiesData(data);
    this.renderActivitiesBooths();
    showToast('已刪除攤位','warning');
  }
,
  // ── 攤位資料同步：模式 A (Drive 直接讀 = 內建式) / 模式 B (副主席上傳 Excel → 寫後端) ──
  boothHeaderMap(){
    return {
      booth_number:['攤位編號','攤位號','編號','booth_number','booth','booth no','no'],
      booth_name:['攤位名稱','攤位','名稱','booth_name','name','title'],
      location:['位置','地點','location','區'],
      group_name:['組別','負責單位','負責旅團','單位','group_name','group','unit'],
      theme:['主題','範疇','主題範疇','theme','zone'],
      game_type:['遊戲類型','類型','game_type','type','形式'],
      responsible:['負責人','負責','responsible','pic','leader'],
      contact:['聯絡','電話','聯絡電話','contact','phone','tel'],
      description:['描述','備註','說明','description','remarks','desc','預計攤位內容','攤位內容','內容','其他場地及物資需求（如有）','運送物資需求','其他需求（如有）','其他場地及物資需求','其他需求']
    };
  }
,
  normalizeBoothRow(r){
    if(!r) return null;
    const map=this.boothHeaderMap();
    const keys=Object.keys(r);
    const fuzzy=(key)=>{ const want=map[key]; for(const k of keys){ if(want.some(w=>String(k).trim()===w)) return r[k]; } return ''; };
    const v=(key)=>{ const x=fuzzy(key); return (x===undefined||x===null)?'':String(x).trim(); };
    const booth_number=v('booth_number');
    const booth_name=v('booth_name');
    const location=v('location');
    const group_name=v('group_name');
    const theme=v('theme');
    const game_type=v('game_type');
    const responsible=v('responsible');
    const contact=v('contact');
    const description=v('description');
    if(!booth_number && !booth_name) return null;
    return {id:'booth_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), booth_number, booth_name, location, group_name, theme, game_type, responsible, contact, description, created_by:'同步', created_at:new Date().toISOString()};
  }
,
  rowsToBooths(rows){ return (rows||[]).map(r=>this.normalizeBoothRow(r)).filter(Boolean); }
,
  applyBooths(booths, srcLabel, silent){
    const data=this.getActivitiesData();
    data.booths=booths;
    this.saveActivitiesData(data);
    if(!silent) showToast(`已從「${srcLabel}」更新 ${booths.length} 筆攤位`,'success');
    this.renderActivitiesBooths();
  }
,
  // 模式 A：直接從 Drive 讀最新（原生 Google Sheet → export=csv；xlsx → 下載後 SheetJS 解析）
  async fetchDriveSheetRows(sheetId, gid){
    gid=gid||0;
    // 1) 原生 Google 試算表：export=csv 直讀（瀏覽器 CORS 友善，最可靠）
    try{
      const csvUrl=`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      const res=await fetch(csvUrl);
      const text=await res.text();
      if(res.ok && text.trim() && !text.trim().startsWith('<') && text.includes(',')){
        return {ok:true, rows:parseCSV(text), via:'sheet'};
      }
    }catch(e){}
    // 2) xlsx 後備：下載後用 SheetJS 解析（.xlsx 二進位在瀏覽器可能受 CORS 限制）
    if(typeof XLSX!=='undefined'){
      try{
        const r2=await fetch(`https://drive.google.com/uc?export=download&id=${sheetId}`);
        if(r2.ok){
          const ab=await r2.arrayBuffer();
          const wb=XLSX.read(ab,{type:'array'});
          return {ok:true, rows:XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''}), via:'xlsx'};
        }
      }catch(e){}
    }
    // 3) Google Visualization API 後備：export=csv 被拒或合併儲存格分頁時，仍可直接讀取表格
    try{
      const gvizUrl=`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
      const res=await fetch(gvizUrl);
      const text=await res.text();
      if(res.ok && text.trim() && !text.trim().startsWith('<') && text.includes(',')){
        return {ok:true, rows:parseCSV(text), via:'gviz'};
      }
    }catch(e){}
    return {ok:false, rows:[], via:'none'};
  }
,
  // 原樣讀取 Sheet（保留空白欄、合併儲存格結構）→ 回傳「陣列行」（組織架構圖等合併儲存格格式用）
  async fetchDriveSheetGridRaw(sheetId, gid){
    gid=gid||0;
    const parseRaw=(text)=>{
      const out=[];
      splitCSVLines(text).forEach(line=>{
        if(!line.trim()) return;
        const cols=[]; let cur='', inQ=false;
        for(let c=0;c<line.length;c++){
          const ch=line[c];
          if(ch==='"') inQ=!inQ;
          else if(ch===','&&!inQ){ cols.push(cur.trim().replace(/^"|"$/g,'')); cur=''; }
          else cur+=ch;
        }
        cols.push(cur.trim().replace(/^"|"$/g,''));
        out.push(cols);
      });
      return out;
    };
    try{
      const res=await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
      const text=await res.text();
      if(res.ok && text.trim() && !text.trim().startsWith('<') && text.includes(',')) return {ok:true, rows:parseRaw(text), via:'sheet'};
    }catch(e){}
    try{
      const res=await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
      const text=await res.text();
      if(res.ok && text.trim() && !text.trim().startsWith('<') && text.includes(',')) return {ok:true, rows:parseRaw(text), via:'gviz'};
    }catch(e){}
    return {ok:false, rows:[], via:'none'};
  }
,
  // 模式 B：上傳 Excel → SheetJS 解析成 rows（供各卡片「上傳寫後端」共用）
  async parseExcelToRows(file){
    const ab=await file.arrayBuffer();
    if(typeof XLSX==='undefined') throw new Error('未載入 Excel 解析庫 (需連線 CDN)');
    const wb=XLSX.read(ab,{type:'array'});
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
  }
,
  // 原生 Google 試算表 (export=csv/gviz) 回傳的是「陣列行」，把第一行當表頭轉成物件行（空缺表頭欄自動跳過）
  gridToObjects(rows){
    if(!rows || !rows.length) return [];
    let hi=0;
    while(hi<rows.length && !(rows[hi]||[]).some(c=>String(c||'').trim()!=='')) hi++;
    const headers=(rows[hi]||[]).map(h=>String(h||'').trim());
    const out=[];
    for(let i=hi+1;i<rows.length;i++){
      const row=rows[i]||[];
      if(!row.some(c=>String(c||'').trim()!=='')) continue;
      const obj={};
      headers.forEach((h,j)=>{ if(h){ obj[h]=(row[j]!==undefined&&row[j]!==null)?String(row[j]).trim():''; } });
      out.push(obj);
    }
    return out;
  }
,
  /* ── 預算總表 (Google Sheet 合併儲存格格式) 解析：
     格式：收入區（項目@第1欄、2026預算@第3欄、ISD2025實際@第5欄、ISD2025預算@第6欄）
          支出區以「XX組」行為組別標題，項目同收入格式；備用支出/總支出/剩餘為合計行略過 */
  parseBudgetGrid(rows){
    const skipRe=/^(總收入|總支出|剩餘|備用支出)/;
    // 組別標題行：標準組別名（含模糊配對，如「協調」→「協調組」），或任何以「組」結尾的名稱。
    // 未知組別標題（如「可持續發展組」，或「姐/姊」之「組」字誤打）也獨立成一個預算分組，
    // 不會把該組項目錯混入上一組；若行政組日後把標題改為 2026 正式組別名，即自動對回該組預算格。
    const groupOfRow=(c0)=>{
      const n=normalizeGroupName(c0);
      if(!n) return null;
      if(ORG_GROUPS.includes(n)) return n;
      const hit=ORG_GROUPS.find(g=>g===n||g.includes(n)||n.includes(g));
      if(hit) return hit;
      if(/[組姊姐]$/.test(n)) return n;
      return null;
    };
    const groups={};
    let curGroup='收入';
    for(let i=0;i<rows.length;i++){
      const row=rows[i]||[];
      const c0=String(row[0]||'').trim();
      const c1=String(row[1]||'').trim();
      const grp=groupOfRow(c0);
      if(grp){ curGroup=grp; continue; }
      if(!c1 || skipRe.test(c1)) continue;
      if(/^(預算|實際|總計|小計)/.test(c1)) continue;
      const budget=parseFloat(String(row[3]||'').replace(/[$,]/g,''))||0;
      const actual2025=String(row[5]||'').trim();
      const budget2025=String(row[6]||'').trim();
      const notes=[];
      if(actual2025 && actual2025!=='-') notes.push('ISD2025實際: '+actual2025);
      if(budget2025 && budget2025!=='-') notes.push('ISD2025預算: '+budget2025);
      if(!groups[curGroup]) groups[curGroup]=[];
      groups[curGroup].push({ group_name:curGroup, item_name:c1, budget, actual:0, notes:notes.join(' ／ ') });
    }
    return Object.keys(groups).map(g=>({group_name:g, items:groups[g]}));
  }
,
  // 統一提示：各組只需在 Drive 更新 Google Sheet，APP 即自動同步
  driveSyncNotice(){ return '<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-800 leading-relaxed"><i class="fa-solid fa-sync mr-1"></i><b>自動同步：</b>各組只要在 Drive 內更新 Google Sheet 表單，APP 開啟即自動同步最新資料（也可手動點「同步最新」）。</div>'; }
,
  // 開 APP 時自動從 Drive 讀取最新表格（靜默、拆解後內建顯示，不跳轉）
  async autoSyncDriveSources(){
    if(this.isDemoEvent()) return; // 模擬示範活動不使用 Drive 資料源
    try{
      const act=this.getActivitiesData();
      if(act.booth_source && (act.booth_source.sheet_id||act.booth_source.drive_file_id)) await this.syncBoothsFromDrive(true);
    }catch(e){}
    try{
      const fin=this.getFinanceData();
      if(fin.budget_source && (fin.budget_source.sheet_id||fin.budget_source.drive_file_id)) await this.syncBudgetFromDrive(true);
    }catch(e){}
    try{
      const st=this.getStaffData();
      if(st.staff_source && (st.staff_source.sheet_id||st.staff_source.drive_file_id)){
        if(st.staff_source.kind==='org_chart_grid') await this.syncOrgChartFromDrive(true);
        else await this.syncStaffFromDrive(true);
      }
      if(st.contact_source && (st.contact_source.sheet_id||st.contact_source.drive_file_id)) await this.syncContactListFromDrive(true);
    }catch(e){}
    try{
      const ss=this.eventData['schedule_source'];
      if(ss && (ss.sheet_id||ss.drive_file_id)) await this.syncScheduleFromDrive(true);
    }catch(e){}
    try{
      const ps=this.eventData['participants_source'];
      if(ps && (ps.sheet_id||ps.drive_file_id)) await this.syncParticipantsFromDrive(true);
    }catch(e){}
  }
,
  // 依 header map 模糊配對欄位（各卡片用同一套）
  pickCol(obj, want, fallback){
    if(!obj) return fallback;
    const keys=Object.keys(obj);
    const lower={};
    keys.forEach(k=>lower[String(k).trim().toLowerCase()]=obj[k]);
    const wants=(Array.isArray(want)?want:[want]).map(w=>String(w).trim().toLowerCase());
    for(const w of wants){ if(lower[w]!==undefined && lower[w]!==null && String(lower[w]).trim()!=='') return String(lower[w]).trim(); }
    return fallback;
  }
,
  async syncBoothsFromDrive(silent){
    const src=(this.getActivitiesData().booth_source)||{};
    const sheetId=src.sheet_id||src.drive_file_id;
    if(!sheetId){ if(!silent) showToast('尚未設定攤位資料來源 (booth_source)','warning'); return; }
    if(!silent) showToast('正在從 Drive 讀取最新攤位資料…','');
    const overlay=document.getElementById('savingOverlay'); if(overlay && !silent) overlay.classList.add('active');
    try{
      const got=await this.fetchDriveSheetRows(sheetId, src.gid||0);
      if(got.ok && got.rows.length){
        const rows=(Array.isArray(got.rows[0]))?this.gridToObjects(got.rows):got.rows;
        const booths=this.rowsToBooths(rows);
        if(booths.length){ this.applyBooths(booths,'Drive 直接同步 ('+got.via+')', silent); return; }
      }
      if(!silent) showToast('未能從 Drive 讀取。建議把 xlsx 另存為原生「Google 試算表」再同步','error');
    }catch(e){ if(!silent) showToast('同步失敗：'+e.message+'（如為 CORS，請把 xlsx 轉為 Google 試算表）','error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  // 模式 B：副主席上傳 Excel → SheetJS 轉 CSV/JSON → 寫入後端 Sheet (GAS) + 本地
  async handleBoothExcelUpload(file){
    if(!file){ return; }
    if(!this.canUploadActivity()){ showToast('僅節目組副主席/主任以上可上傳','error'); return; }
    const overlay=document.getElementById('savingOverlay'); if(overlay) overlay.classList.add('active');
    try{
      const rows=await this.parseExcelToRows(file);
      const booths=this.rowsToBooths(rows);
      if(!booths.length){ showToast('解析不到攤位資料，請確認表頭（攤位編號/攤位名稱/組別…）','error'); return; }
      const data=this.getActivitiesData();
      data.booths=booths;
      this.saveActivitiesData(data);
      if(!this.mockMode && this.gasUrl){
        try{
          const r=await fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveBooths',api_key:this.apiKey,event_id:this.currentEvent?.event_id||'isd_2026',booths})});
          const j=await r.json();
          showToast(j&&j.success?`已上傳 ${booths.length} 筆並同步`:`已暫存 ${booths.length} 筆（同步未成功：${(j&&j.error)||'請稍後再試'}）`, j&&j.success?'success':'warning');
        }catch(e){ showToast(`已暫存 ${booths.length} 筆，但同步失敗，請稍後再試`,'warning'); }
      } else {
        showToast(`已解析 ${booths.length} 筆攤位（示範模式：只暫存喺你部機，唔會影響正式活動）`,'success');
      }
      this.renderActivitiesBooths();
    }catch(e){ showToast('上傳失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  printBooths(){
    const area=document.getElementById('booths-print-area');
    if(!area){ showToast('找不到列印區域','error'); return; }
    const win=window.open('','_blank');
    win.document.write(`<html><head><title>攤位列表</title><link rel="stylesheet" href="${location.origin}/assets/tailwind.css"><style>body{padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:6px;font-size:11px}</style></head><body>${area.innerHTML}<div class="mt-4 text-center"><button onclick="window.print()" class="bg-slate-900 text-white px-6 py-2 rounded-xl">列印</button></div></body></html>`);
    win.document.close();
  }
,
  // ═══ 預算（財務）資料源 + 同步 ═══
  budgetHeaderMap(){ return { group_name:['組別','組','group','group_name','department','組名'], voucher:['憑單','憑單編號','voucher','voucher no','單號'], item_name:['項目','項目名稱','item','item_name','名稱','name','description','開支項目'], budget:['預算','budget','budget_amt','預算金額','計劃'], actual:['實際','實際金額','actual','actual_amt','實付'], notes:['備註','notes','remark','說明','remarks'] }; }
,
  normalizeBudgetRow(r){
    const b=(w)=>{ const want=(Array.isArray(w)?w:[w]).map(x=>String(x).trim().toLowerCase()); for(const kk of Object.keys(r)){ if(want.includes(String(kk).trim().toLowerCase())){ const v=r[kk]; if(v!==undefined&&v!==null&&String(v).trim()!=='') return String(v).trim(); } } return ''; };
    const item_name=b(this.budgetHeaderMap().item_name);
    if(!item_name) return null;
    const budget=parseFloat(String(b(this.budgetHeaderMap().budget)).replace(/[$,]/g,''))||0;
    const actual=parseFloat(String(b(this.budgetHeaderMap().actual)).replace(/[$,]/g,''))||0;
    return { voucher:b(this.budgetHeaderMap().voucher), item_name, group_name:b(this.budgetHeaderMap().group_name)||'未分組', budget, actual, notes:b(this.budgetHeaderMap().notes) };
  }
,
  rowsToBudgets(rows){
    const items=(rows||[]).map(r=>this.normalizeBudgetRow(r)).filter(Boolean);
    const groups={};
    items.forEach(it=>{ if(!groups[it.group_name]) groups[it.group_name]=[]; groups[it.group_name].push(it); });
    return Object.keys(groups).map(g=>({group_name:g, items:groups[g]}));
  }
,
  async syncBudgetFromDrive(silent){
    const src=(this.getFinanceData().budget_source)||{};
    const sheetId=src.sheet_id||src.drive_file_id;
    if(!sheetId){ if(!silent) showToast('尚未設定預算資料來源 (budget_source)','warning'); return; }
    if(!silent) showToast('正在讀取最新預算（Google 試算表）…','');
    const overlay=document.getElementById('savingOverlay'); if(overlay && !silent) overlay.classList.add('active');
    try{
      let gb=[], via='none';
      if(src.kind==='budget_grid'){
        // 合併儲存格格式（「XX組」組別標題行＋項目行）：要原樣讀「格線」（保留空白欄）先交 parseBudgetGrid 拆組
        const raw=await this.fetchDriveSheetGridRaw(sheetId, src.gid||0);
        if(raw.ok && raw.rows.length){ gb=this.parseBudgetGrid(raw.rows); via=raw.via; }
      } else {
        const got=await this.fetchDriveSheetRows(sheetId, src.gid||0);
        if(got.ok && got.rows.length){ gb=this.rowsToBudgets((Array.isArray(got.rows[0]))?this.gridToObjects(got.rows):got.rows); via=got.via; }
      }
      if(gb.length){
        const fin=this.getFinanceData();
        fin.group_itemized_budgets=gb;
        this.saveFinanceData(fin);
        if(!silent) showToast(`已同步 ${gb.length} 組預算（共 ${gb.reduce((s,g)=>s+g.items.length,0)} 項，via ${via}）`,'success');
        this.renderFinanceBudgets();
        return;
      }
      if(!silent) showToast('未能讀取預算。試算表須設「任何有連結者均可檢視」，合併儲存格格式需保留「XX組」組別標題行','error');
    }catch(e){ if(!silent) showToast('同步失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  async handleBudgetExcelUpload(file){
    if(!file) return;
    if(!(this.isAdmin() || (ROLE_HIERARCHY[this.currentUser?.role]||0)>=60)){ showToast('僅副主席以上可上傳預算','error'); return; }
    const overlay=document.getElementById('savingOverlay'); if(overlay) overlay.classList.add('active');
    try{
      const rows=await this.parseExcelToRows(file);
      const gb=this.rowsToBudgets(rows);
      if(!gb.length){ showToast('解析不到預算，請確認欄位（組別/項目/預算/實際）','error'); return; }
      const fin=this.getFinanceData();
      fin.group_itemized_budgets=gb;
      this.saveFinanceData(fin);
      showToast(`已解析 ${gb.length} 組預算（示範模式：只暫存喺你部機，唔會影響正式活動）`,'success');
      this.renderFinanceBudgets();
    }catch(e){ showToast('上傳失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  // ═══ 工作人員名單資料源 + 同步 ═══
  staffHeaderMap(){ return { name:['姓名','name','名字','人員'], role_title:['職銜','職位','role','role_title','title','崗位'], group_name:['組別','組','group','group_name','部門'], contact:['電話','聯絡','聯絡電話','contact','phone','mobile','tel'], job_desc:['職務','job_desc','duty','職責','工作'] }; }
,
  normalizeStaffRow(r){
    const b=(w)=>{ const want=(Array.isArray(w)?w:[w]).map(x=>String(x).trim().toLowerCase()); for(const kk of Object.keys(r)){ if(want.includes(String(kk).trim().toLowerCase())){ const v=r[kk]; if(v!==undefined&&v!==null&&String(v).trim()!=='') return String(v).trim(); } } return ''; };
    const name=b(this.staffHeaderMap().name);
    if(!name) return null;
    return { name, role_title:b(this.staffHeaderMap().role_title), group_name:b(this.staffHeaderMap().group_name)||'未分組', contact:b(this.staffHeaderMap().contact), job_desc:b(this.staffHeaderMap().job_desc) };
  }
,
  rowsToContacts(rows){ return (rows||[]).map(r=>this.normalizeStaffRow(r)).filter(Boolean); }
,
  normalizeContactListRow(r){
    const cells=Array.isArray(r)?r:null;
    if(cells){
      const group=String(cells[0]||'').trim(), level=String(cells[1]||'').trim(), title=String(cells[2]||'').trim(), name=String(cells[3]||'').trim(), phone=String(cells[4]||'').trim(), email=String(cells[5]||'').trim();
      if((!name && !title) || name==='姓名' || title==='職位' || group==='組別') return null;
      return {name, role_title:title, group_name:group, level, contact:phone, email, job_desc:''};
    }
    const name=this.pickCol(r,['姓名','name'],'');
    const title=this.pickCol(r,['職位','職銜','title'],'');
    const group=this.pickCol(r,['組別','group'],'');
    if((!name && !title) || name==='姓名' || title==='職位' || group==='組別') return null;
    return {name, role_title:title, group_name:group, level:this.pickCol(r,['級別','level'],''), contact:this.pickCol(r,['電話','phone','聯絡'],''), email:this.pickCol(r,['電郵','email'],''), job_desc:''};
  }
,
  async syncContactListFromDrive(silent){
    const src=(this.getStaffData().contact_source)||this.eventData.staff?.contact_source||{};
    const sheetId=src.sheet_id||src.drive_file_id;
    if(!sheetId){ if(!silent) showToast('尚未設定聯絡表來源','warning'); return; }
    try{
      let via='none', rows=[];
      const raw=await this.fetchDriveSheetGridRaw(sheetId, src.gid||1330364782);
      if(raw.ok && raw.rows.length){ rows=this.gridToObjects(raw.rows); via=raw.via; }
      if(!rows.length){
        const got=await this.fetchDriveSheetRows(sheetId, src.gid||1330364782);
        if(got.ok && got.rows.length){ rows=(Array.isArray(got.rows[0]))?this.gridToObjects(got.rows):got.rows; via=got.via; }
      }
      if(!rows.length){ if(!silent) showToast('未能讀取聯絡表','warning'); return; }
      const list=[];
      rows.forEach((r,i)=>{
        const rec=this.normalizeContactListRow(r);
        if(rec){ rec.id='contact_'+i; list.push(rec); }
      });
      if(!list.length){ if(!silent) showToast('聯絡表沒有資料列','warning'); return; }
      const data=this.getStaffData();
      data.contacts=list;
      data.contact_source=src;
      this.saveStaffData(data);
      if(!silent) showToast(`已同步聯絡表 ${list.length} 列（via ${via}，與試算表一致）`,'success');
      this.renderStaffContacts();
    }catch(e){ if(!silent) showToast('聯絡表同步失敗：'+e.message,'error'); }
  }
,
  async syncStaffFromDrive(silent){
    const src=(this.getStaffData().staff_source)||this.eventData.staff?.staff_source||{};
    const sheetId=src.sheet_id||src.drive_file_id;
    if(!sheetId){ if(!silent) showToast('尚未設定名單資料來源 (staff_source)','warning'); return; }
    if(!silent) showToast('正在從 Drive 讀取最新名單…','');
    const overlay=document.getElementById('savingOverlay'); if(overlay && !silent) overlay.classList.add('active');
    try{
      const got=await this.fetchDriveSheetRows(sheetId, src.gid||0);
      if(got.ok && got.rows.length){
        const rows=(Array.isArray(got.rows[0]))?this.gridToObjects(got.rows):got.rows;
        const contacts=this.rowsToContacts(rows);
        if(contacts.length){
          const data=this.getStaffData();
          data.contacts=contacts;
          this.saveStaffData(data);
          if(!silent) showToast(`已同步 ${contacts.length} 位工作人員（via ${got.via}）`,'success');
          this.renderStaffContacts();
          return;
        }
      }
      if(!silent) showToast('未能自動解析名單。Org Chart 為架構圖，建議另設「聯絡名單」扁平分頁（姓名/職銜/組別/電話）再同步','warning');
    }catch(e){ if(!silent) showToast('同步失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  /* ═══ 組織架構圖 (Google Sheet 合併儲存格格式) 解析 + 同步 ═══
     分頁格式（行政組範本）：職位在某一列，其下一列同一欄為人名；
     左側「副主席（X）」決定所屬組別；主席/執行副主席 = 主席及執行副主席，顧問 = 顧問團 */
  parseOrgChartGrid(rows){
    const TITLE_RE=/主席|副主席|顧問|總主任|主任|統籌|司令|總監|秘書|主管|幹事/;
    const isTitleCell=v=>{ v=String(v||'').trim(); return !!v && TITLE_RE.test(v); };
    const levelNumOf=t=>{
      if(/副主席/.test(t)) return 3;
      if(/總主任|總監/.test(t)) return 4;
      if(/^顧問$|^主席$/.test(t)) return 2;
      return 5;
    };
    // v8.9：职位格常含換行／全形空格，而括號可能係半形「(」——先清洗一次先算組別，
    // 否則會拆出「會操及典禮)組」呢類幽靈組別（該組喺部門管理中心會多出一張卡／數字唔啱）。
    const cleanTitle=v=>String(v||'').replace(/[\r\n\t\u3000]+/g,'').replace(/\s+/g,'').trim();
    const groupFromViceTitle=c=>{ const nm=cleanTitle(c).replace(/副主席[（(]?/,'').replace(/[）)]?組?$/,'').replace(/[）)]/g,''); return nm?(/組$/.test(nm)?nm:nm+'組'):'主席及執行副主席'; };
    const groupOfTitle=(t,row,rowIdx,colIdx,rows)=>{
      t=cleanTitle(t);
      if(/執行副主席/.test(t)) return '主席及執行副主席';
      if(/副主席/.test(t)) return groupFromViceTitle(t);
      if(/^顧問$/.test(t)) return '顧問團';
      if(/^主席$/.test(t)) return '主席及執行副主席';
      // 1) 同一列向左找最近的 副主席（決定組別）
      for(let k=colIdx-1;k>=0;k--){ const c=cleanTitle(row[k]); if(/副主席/.test(c)) return groupFromViceTitle(c); }
      // 2) 向上逐列找（該列或左側）最近的 副主席
      for(let r=rowIdx-1;r>=0;r--){ const rr=rows[r]||[]; for(let k=Math.min(colIdx,rr.length-1);k>=0;k--){ const c=cleanTitle(rr[k]); if(/副主席/.test(c)) return groupFromViceTitle(c); } }
      return '未分組';
    };
    const normNames=v=>orgNameList(v).join('、');
    const recs=[];
    for(let i=0;i<rows.length-1;i++){
      const row=rows[i]||[];
      const next=rows[i+1]||[];
      // 找出本列的職位儲存格
      const titleCols=[];
      for(let j=0;j<row.length;j++){ if(isTitleCell(row[j])) titleCols.push(j); }
      if(!titleCols.length) continue;
      // 由右至左認領人名（人名可橫跨多個儲存格；已被右方職位認領的即停）
      const claimed=new Set();
      for(let ti=titleCols.length-1;ti>=0;ti--){
        const j=titleCols[ti];
        const title=cleanTitle(row[j]);
        const nameParts=[];
        for(let k=j;k<next.length;k++){
          if(claimed.has(k)) break;
          const v=String(next[k]||'').trim();
          if(!v) break;
          nameParts.push(v);
          claimed.add(k);
        }
        const names=normNames(nameParts.join('\n'));
        const level_num=levelNumOf(title);
        const group=groupOfTitle(title,row,i,j,rows);
        recs.push({level:`${group} (Level ${level_num})`, level_num, group, title, names});
      }
    }
    // 顧問團兩人分開兩行（黃偉安、何家騏）
    const split=[];
    recs.forEach(r=>{
      if(/^顧問$/.test(cleanTitle(r.title)) && /[、,，/]/.test(r.names||'')){
        orgNameList(r.names).forEach(nm=>split.push({...r, names:nm}));
      } else split.push(r);
    });
    return split;
  }
,
  mergeOrgChartPreserveDesc(existing, parsed){
    // v8.9：① id 改用「穩定 id」（由正規化 key 推出），令下一次載入按 id 直接覆蓋種子行，
    //          唔再出現「種子 49 行 ＋ Drive 49 行」各計一次；
    //        ② descMap 都用正規化 key（以前用原文 group|title，格式一唔同就攞唔返職務描述）；
    //        ③ 同一次解析先自己去重（合併儲存格偶發會解出重複行）。
    const descMap={}, idMap={};
    (existing||[]).forEach(n=>{ const k=orgNodeKey(n); if(!descMap[k]&&n.desc) descMap[k]=n.desc; if(!idMap[k]&&n.id) idMap[k]=n.id; });
    const rows=uniqOrgNodesBy(parsed||[]).map(p=>({
      id:idMap[orgNodeKey(p)]||orgStableId(p), ...p, desc:descMap[orgNodeKey(p)]||'', parent_id:p.parent_id||null, created_at:p.created_at||new Date().toISOString()
    }));
    return rows;
  }
,
  // v8.9 同步前比較：只比「正規化後嘅崗位集合」，內容冇變就唔寫快取
  // （以前每次開 APP 都靜默同步＋整份重寫 localStorage，令 id 一直變、舊行一直留低 → 數字越滾越大）
  orgChartSignature(rows){
    return (rows||[]).map(n=>orgNodeKey(n)+'@'+(n.desc?'1':'0')).sort().join('#');
  }
,
  async syncOrgChartFromDrive(silent){
    const src=(this.getStaffData().staff_source)||this.eventData.staff?.staff_source||{};
    const sheetId=src.sheet_id||src.drive_file_id;
    if(!sheetId){ if(!silent) showToast('尚未設定架構資料來源 (staff_source)','warning'); return; }
    if(!silent) showToast('正在從 Google Sheet 讀取最新組織架構…','');
    const overlay=document.getElementById('savingOverlay'); if(overlay && !silent) overlay.classList.add('active');
    try{
      const got=await this.fetchDriveSheetGridRaw(sheetId, src.gid||0);
      if(got.ok && got.rows.length){
        const parsed=this.parseOrgChartGrid(got.rows);
        if(parsed.length){
          const data=this.getStaffData();
          // 保留原有職務描述，並同步更新名單（人名 → 職銜/組別）
          const merged=this.mergeOrgChartPreserveDesc(data.org_chart, parsed);
          // 內容冇實際變化 → 唔寫後台／唔改快取（靜默同步時尤其重要），只用來重繪
          const changed=this.orgChartSignature(merged)!==this.orgChartSignature(data.org_chart);
          if(changed){ data.org_chart=merged; this.saveStaffData(data); }
          if(!silent) showToast(changed?`已同步組織架構 ${merged.length} 個崗位（via ${got.via}）。聯絡表獨立同步，不會被架構圖覆蓋。`:`組織架構已係最新（${merged.length} 個崗位，冇變動）`,'success');
          this.renderOrgChartTree();
          this.renderStaffContacts();
          return;
        }
      }
      if(!silent) showToast('未能解析架構圖。請確認試算表已設定「任何有連結者均可檢視」，並保留職位／人名分行的格式','warning');
    }catch(e){ if(!silent) showToast('同步失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  async handleStaffExcelUpload(file){
    if(!file) return;
    if(!(this.isAdmin() || (ROLE_HIERARCHY[this.currentUser?.role]||0)>=40)){ showToast('僅主任以上可上傳名單','error'); return; }
    const overlay=document.getElementById('savingOverlay'); if(overlay) overlay.classList.add('active');
    try{
      const rows=await this.parseExcelToRows(file);
      const contacts=this.rowsToContacts(rows);
      if(!contacts.length){ showToast('解析不到名單，請確認欄位（姓名/職銜/組別/電話）','error'); return; }
      const data=this.getStaffData();
      data.contacts=contacts;
      this.saveStaffData(data);
      showToast(`已解析 ${contacts.length} 位工作人員（示範模式：只暫存喺你部機，唔會影響正式活動）`,'success');
      this.renderStaffContacts();
    }catch(e){ showToast('上傳失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  // ═══ 日程表 (Run Down) 資料源 + 同步 ═══
  getScheduleData(){
    const key=LS.schedule(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local && Array.isArray(local)) return local;
    const raw=this.eventData['schedule']||[];
    if(Array.isArray(raw)) return raw;
    return [];
  }
,
  saveScheduleData(data){ localStorage.setItem(LS.schedule(this.currentEvent?.event_id||'isd_2026'), JSON.stringify(data||[])); this.eventData['schedule']=data||[];
    // 同步到後端（GAS）
    if(!this.mockMode && this.gasUrl){
      fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Schedule',record:{event_id:this.currentEvent?.event_id||'isd_2026',data_json:JSON.stringify(data||[]),updated_by:this.currentUser?.name||''}})}).catch(()=>{});
    }
  }
,
  scheduleHeaderMap(){ return { time_slot:['時段','時間','time','time_slot','slot'], title:['節目','項目','title','program','內容','活動'], location:['位置','地點','location','place'], group_name:['組別','組','group','group_name','負責組'], description:['說明','描述','description','備註','desc','notes'] }; }
,
  normalizeScheduleRow(r){
    const b=(w)=>{ const want=(Array.isArray(w)?w:[w]).map(x=>String(x).trim().toLowerCase()); for(const kk of Object.keys(r)){ if(want.includes(String(kk).trim().toLowerCase())){ const v=r[kk]; if(v!==undefined&&v!==null&&String(v).trim()!=='') return String(v).trim(); } } return ''; };
    const title=b(this.scheduleHeaderMap().title);
    if(!title) return null;
    return { time_slot:b(this.scheduleHeaderMap().time_slot), title, location:b(this.scheduleHeaderMap().location), group_name:b(this.scheduleHeaderMap().group_name), description:b(this.scheduleHeaderMap().description) };
  }
,
  rowsToSchedule(rows){ return (rows||[]).map(r=>this.normalizeScheduleRow(r)).filter(Boolean); }
,
  async syncScheduleFromDrive(silent){
    const src=this.eventData['schedule_source']||{};
    const sheetId=src.sheet_id||src.drive_file_id;
    if(!sheetId){ if(!silent) showToast('尚未設定日程表資料來源 (schedule_source)','warning'); return; }
    if(!silent) showToast('正在從 Drive 讀取最新日程…','');
    const overlay=document.getElementById('savingOverlay'); if(overlay && !silent) overlay.classList.add('active');
    try{
      const got=await this.fetchDriveSheetRows(sheetId, src.gid||0);
      if(got.ok && got.rows.length){
        const sch=this.rowsToSchedule(got.rows);
        if(sch.length){ this.saveScheduleData(sch); if(!silent) showToast(`已同步 ${sch.length} 個時段（via ${got.via}）`,'success'); this.renderScheduleModule(); return; }
      }
      if(!silent) showToast('未能從 Drive 讀取日程。建議另存為原生「Google 試算表」再同步','error');
    }catch(e){ if(!silent) showToast('同步失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  async handleScheduleExcelUpload(file){
    if(!file) return;
    if(!((ROLE_HIERARCHY[this.currentUser?.role]||0)>=60)){ showToast('僅副主席以上可上傳日程','error'); return; }
    const overlay=document.getElementById('savingOverlay'); if(overlay) overlay.classList.add('active');
    try{
      const rows=await this.parseExcelToRows(file);
      const sch=this.rowsToSchedule(rows);
      if(!sch.length){ showToast('解析不到日程，請確認欄位（時段/節目/位置/組別）','error'); return; }
      this.saveScheduleData(sch);
      showToast(`已解析 ${sch.length} 個時段（示範模式：只暫存喺你部機，唔會影響正式活動）`,'success');
      this.renderScheduleModule();
    }catch(e){ showToast('上傳失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  // ═══ 參加旅團名單資料源 + 同步 ═══
  getParticipantsData(){
    const key=LS.participants(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local) return local;
    const raw=this.eventData['participants']||[];
    if(Array.isArray(raw)) return raw;
    return [];
  }
,
  saveParticipantsData(data){ localStorage.setItem(LS.participants(this.currentEvent?.event_id||'isd_2026'), JSON.stringify(data||[])); this.eventData['participants']=data||[]; }
,
  participantHeaderMap(){ return { unit_name:['旅團','旅團名稱','單位','unit','unit_name','group','名稱'], section:['支部','section','支部名稱','組別'], headcount:['人數','headcount','count','參加人數'], notes:['備註','notes','說明','remark'] }; }
,
  normalizeParticipantRow(r){
    const b=(w)=>{ const want=(Array.isArray(w)?w:[w]).map(x=>String(x).trim().toLowerCase()); for(const kk of Object.keys(r)){ if(want.includes(String(kk).trim().toLowerCase())){ const v=r[kk]; if(v!==undefined&&v!==null&&String(v).trim()!=='') return String(v).trim(); } } return ''; };
    const unit_name=b(this.participantHeaderMap().unit_name);
    if(!unit_name) return null;
    return { unit_name, section:b(this.participantHeaderMap().section), headcount:b(this.participantHeaderMap().headcount), notes:b(this.participantHeaderMap().notes) };
  }
,
  rowsToParticipants(rows){ return (rows||[]).map(r=>this.normalizeParticipantRow(r)).filter(Boolean); }
,
  async syncParticipantsFromDrive(silent){
    const src=this.eventData['participants_source']||{};
    const sheetId=src.sheet_id||src.drive_file_id;
    if(!sheetId){ if(!silent) showToast('尚未設定參加旅團名單來源 (participants_source)','warning'); return; }
    if(!silent) showToast('正在從 Drive 讀取最新參加旅團名單…','');
    const overlay=document.getElementById('savingOverlay'); if(overlay && !silent) overlay.classList.add('active');
    try{
      const got=await this.fetchDriveSheetRows(sheetId, src.gid||0);
      if(got.ok && got.rows.length){
        const p=this.rowsToParticipants(got.rows);
        if(p.length){ this.saveParticipantsData(p); if(!silent) showToast(`已同步 ${p.length} 個旅團（via ${got.via}）`,'success'); this.renderAdminGroupModule(); return; }
      }
      if(!silent) showToast('未能從 Drive 讀取參加旅團名單','error');
    }catch(e){ if(!silent) showToast('同步失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  async handleParticipantsExcelUpload(file){
    if(!file) return;
    if(!(this.isAdmin() || (ROLE_HIERARCHY[this.currentUser?.role]||0)>=40)){ showToast('僅行政組主任以上可上傳','error'); return; }
    const overlay=document.getElementById('savingOverlay'); if(overlay) overlay.classList.add('active');
    try{
      const rows=await this.parseExcelToRows(file);
      const p=this.rowsToParticipants(rows);
      if(!p.length){ showToast('解析不到名單，請確認欄位（旅團/支部/人數）','error'); return; }
      this.saveParticipantsData(p);
      showToast(`已解析 ${p.length} 個旅團（示範模式：只暫存喺你部機，唔會影響正式活動）`,'success');
      this.renderAdminGroupModule();
    }catch(e){ showToast('上傳失敗：'+e.message,'error'); }
    finally{ if(overlay) overlay.classList.remove('active'); }
  }
,
  downloadScheduleTemplate(){
    const csv='time_slot,title,location,group_name,description\n07:45 - 08:30,會操及頒獎禮場地設置劃位,大操場,協調組,各功能組別場地佈置\n08:30 - 10:30,參加旅團報到及攤位最後佈置,報到處,行政組,旅團報到及攤位佈置\n10:45 - 10:55,嘉賓接待及就座,莫榮大樓地下,行政組,嘉賓接待後就座大操場\n11:00 - 12:00,第一部分典禮：優異旅團及各項獎勵頒發儀式,大操場,會操及典禮組,吳家麗會長主禮\n12:00 - 13:00,第二部分典禮：會操檢閱及頒獎儀式,大操場,會操及典禮組,區永樑指揮官主禮\n13:00 - 14:00,嘉賓茶聚,莫榮大樓地下,行政組,嘉賓茶聚及工作人員午膳\n14:00 - 17:00,主題攤位節目／參觀主題活動區,營地全區,主題節目組,公眾參觀攤位\n';
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='schedule_template.csv'; a.click(); showToast('已下載日程表範本','success');
  }
,
  downloadParticipantsTemplate(){
    const csv='unit_name,section,headcount,notes\n港島第1旅,童軍,30,\n港島第2旅,幼童軍,45,\n港島第3旅,小童軍,25,\n';
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='participants_template.csv'; a.click(); showToast('已下載參加旅團名單範本','success');
  }
,
  openGameCardForm(editId=null){
    if(!this.canUploadActivity()){ showToast('僅相關主任、副主席或以上可上傳','error'); return; }
    const data=this.getActivitiesData();
    const existing=editId?(data.gameCards||[]).find(g=>g.id===editId):null;
    let html=`
      <input type="hidden" id="gamecard-form-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="gamecard-form-id" value="${existing?.id||''}">
      <div class="space-y-3">
        <div><label class="text-[11px] font-bold">遊戲卡標題 *</label><input id="gamecard-title" value="${escapeHtml(existing?.title||'')}" required placeholder="例如 遊戲記錄冊 / 集印卡" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">描述</label><textarea id="gamecard-desc" rows="2" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>
        <div><label class="text-[11px] font-bold">版本</label><input id="gamecard-version" value="${escapeHtml(existing?.version||'v1')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">上傳遊戲卡文件 (PDF/Word/圖片)</label><input type="file" id="gamecard-file" accept=".jpg,.jpeg,.png,.pdf,.docx,.doc" class="w-full text-xs mt-1"></div>
        <div><label class="text-[11px] font-bold">或貼上 Drive 連結</label><input id="gamecard-url" value="${escapeHtml(existing?.file_url||'')}" placeholder="https://drive.google.com/file/d/.../view" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      </div>
    `;
    document.getElementById('record-modal-title').textContent=existing?'編輯遊戲卡':'上傳遊戲卡 (主任/副主席以上)';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=async (e)=>{ e.preventDefault(); await this.submitGameCardForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async submitGameCardForm(){
    const mode=document.getElementById('gamecard-form-mode').value;
    const id=document.getElementById('gamecard-form-id').value;
    const title=document.getElementById('gamecard-title').value.trim();
    const desc=document.getElementById('gamecard-desc').value.trim();
    const version=document.getElementById('gamecard-version').value.trim()||'v1';
    const url=document.getElementById('gamecard-url').value.trim();
    const fileInput=document.getElementById('gamecard-file');
    let file_name='', file_data='', file_url=url, file_text='';
    if(fileInput.files[0]){
      const f=fileInput.files[0];
      file_name=f.name;
      file_data=await fileToDataUrl(f);
      // Word 檔案：用 mammoth 解析文字作 JSON 內嵌摘要；PDF：整份 base64 內嵌
      if(/\.docx?$/i.test(f.name) && typeof mammoth!=='undefined'){
        try{ const ab=await f.arrayBuffer(); const r=await mammoth.extractRawText({arrayBuffer:ab}); file_text=(r.value||'').trim(); }catch(e){ file_text=''; }
      }
      const folderCfg=this.getMeetingFolderConfig();
      if(folderCfg.id && !this.mockMode && this.gasUrl){
        const res=await this.uploadFileToDriveFolder(f.name, file_data, f.type);
        if(res.success){ file_url=res.file_url||res.download_url; file_data=''; }
      }
    }
    if(!title){ showToast('請填寫標題','error'); return; }
    const data=this.getActivitiesData();
    if(mode==='edit'){
      const idx=data.gameCards.findIndex(g=>g.id===id);
      if(idx>=0) data.gameCards[idx]={...data.gameCards[idx], title, description:desc, version, file_name:file_name||data.gameCards[idx].file_name, file_data:file_data||data.gameCards[idx].file_data, file_url:file_url||data.gameCards[idx].file_url, file_text:file_text||data.gameCards[idx].file_text||'', updated_at:new Date().toISOString()};
    }else{
      data.gameCards.push({id:'gamecard_'+Date.now(), title, description:desc, version, file_name, file_data, file_url, file_text, created_by:this.currentUser?.name||'', created_at:new Date().toISOString()});
    }
    this.saveActivitiesData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新遊戲卡':'已上傳遊戲卡','success');
    this.renderActivitiesGameCards();
  }
,
  deleteGameCard(id){
    if(!this.canUploadActivity()){ showToast('無權限','error'); return; }
    if(!confirm('確定刪除此遊戲卡？')) return;
    const data=this.getActivitiesData();
    data.gameCards=data.gameCards.filter(g=>g.id!==id);
    this.saveActivitiesData(data);
    this.renderActivitiesGameCards();
    showToast('已刪除遊戲卡','warning');
  }
,
  async handleActivityFileUpload(file, type){
    if(!file){ showToast('請選擇檔案','warning'); return; }
    if(type==='booth' && (file.name.endsWith('.xlsx')||file.name.endsWith('.xls'))){ return this.handleBoothExcelUpload(file); }
    const reader=new FileReader();
    reader.onload=async (e)=>{
      try{
        const text=e.target.result;
        if(file.name.endsWith('.json')){
          const json=JSON.parse(text);
          const data=this.getActivitiesData();
          if(type==='booth' && (json.booths||Array.isArray(json))){
            const arr=json.booths||json;
            data.booths=[...data.booths,...arr.map((b,i)=>({id:'booth_'+Date.now()+'_'+i,booth_number:b.booth_number||'',booth_name:b.booth_name||b.name||'',location:b.location||'',group_name:b.group_name||'',theme:b.theme||'',game_type:b.game_type||'',responsible:b.responsible||'',contact:b.contact||'',description:b.description||''}))];
            this.saveActivitiesData(data);
            showToast(`已匯入 ${arr.length} 筆攤位`,'success');
            this.renderActivitiesBooths();
          }
        }else if(file.name.endsWith('.csv')){
          const rows=parseCSV(text);
          if(type==='booth'){
            const parsed=rows.map(r=>({id:'booth_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),booth_number:r.booth_number||r.編號||'',booth_name:r.booth_name||r.名稱||'',location:r.location||r.位置||'',group_name:r.group_name||r.組別||'',theme:r.theme||r.主題||'',game_type:r.game_type||r.遊戲類型||'',responsible:r.responsible||r.負責人||'',contact:r.contact||r.聯絡||'',description:r.description||r.描述||''})).filter(b=>b.booth_number||b.booth_name);
            const data=this.getActivitiesData();
            data.booths=[...data.booths,...parsed];
            this.saveActivitiesData(data);
            showToast(`已匯入 ${parsed.length} 筆攤位`,'success');
            this.renderActivitiesBooths();
          }else if(type==='map'){
            // For map, if CSV contains title,description,url
            const data=this.getActivitiesData();
            const parsed=rows.map(r=>({id:'map_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),title:r.title||r.標題||'地圖',description:r.description||r.描述||'',file_url:r.file_url||r.url||'',file_name:r.file_name||'',created_by:this.currentUser?.name||'',created_at:new Date().toISOString()}));
            data.maps=[...data.maps,...parsed];
            this.saveActivitiesData(data);
            showToast(`已匯入 ${parsed.length} 筆地圖`,'success');
            this.renderActivitiesMaps();
          }
        }else{
          // For map/gamecard image/pdf, directly upload as map or gamecard
          const dataUrl=text;
          if(type==='map'){
            const data=this.getActivitiesData();
            data.maps.push({id:'map_'+Date.now(), title:file.name, description:'', file_name:file.name, file_data:dataUrl, file_url:'', created_by:this.currentUser?.name||'', created_at:new Date().toISOString()});
            this.saveActivitiesData(data);
            this.renderActivitiesMaps();
            showToast('已上傳地圖','success');
          }else if(type==='gamecard'){
            const data=this.getActivitiesData();
            data.gameCards.push({id:'gamecard_'+Date.now(), title:file.name, description:'', file_name:file.name, file_data:dataUrl, file_url:'', version:'v1', created_by:this.currentUser?.name||'', created_at:new Date().toISOString()});
            this.saveActivitiesData(data);
            this.renderActivitiesGameCards();
            showToast('已上傳遊戲卡','success');
          }
        }
      }catch(err){ showToast('解析失敗:'+err.message,'error'); }
    };
    if(file.type.startsWith('image/') || file.name.endsWith('.pdf')) reader.readAsDataURL(file);
    else reader.readAsText(file);
  }
,
  downloadActivityTemplate(type){
    let csv='', filename='';
    if(type==='booth'){
      csv='booth_number,booth_name,location,group_name,theme,game_type,responsible,contact,description\nA01,童軍技能挑戰,主營地 A區,港島第1旅,繩結,挑戰,負責人,91234567,繩結挑戰\nA02,定向追蹤,主營地 A區,港島第2旅,定向,定向,負責人,92345678,定向追蹤遊戲\n';
      filename='booth_template.csv';
    }else if(type==='map'){
      csv='title,description,file_url\n場地分佈圖,主營地及警察學院分佈,https://drive.google.com/file/d/.../view\n泊車位置圖,停車場及車輛進出路線,\n';
      filename='map_template.csv';
    }else if(type==='gamecard'){
      csv='title,description,version,file_url\n遊戲記錄冊,集印章換禮物，含10個攤位印章,v1,https://drive.google.com/file/d/.../view\n積極公民獎章回條,幼童軍支部回條,v1,\n';
      filename='gamecard_template.csv';
    }
    const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); showToast('已下載範本 '+filename,'success');
  }
,
  exportActivitiesData(){
    const data=this.getActivitiesData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`activities_${todayISO()}.json`; a.click(); showToast('已匯出活動資料 JSON','success');
  }
,


  /* ===================== Documents & Theme Badge Modules ===================== */
  canUploadDocument(){
    const role=this.currentUser?.role||'';
    const group=this.currentUser?.group_name||'';
    const lvl=ROLE_HIERARCHY[role]||0;
    // v8.14：行政組（負責組）主任以上亦可上傳文件
    return this.isAdmin() || lvl>=60 || (lvl>=40 && group.includes('行政')) || (this.isCardOwnerGroup&&this.isCardOwnerGroup('documents'));
  }
,
  canUploadThemeBadge(){
    const lvl=ROLE_HIERARCHY[this.currentUser?.role]||0;
    return this.isAdmin() || lvl>=60;
  }
,
  getDocumentsData(){
    const key=LS.documents(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    const normalize=(raw)=>{
      const list=Array.isArray(raw)?raw:(raw?.docs||raw?.documents||[]);
      return {docs:list.map((d,i)=>({
        id:d.id||d.document_id||'doc_'+i,
        title:d.title||d.name||'未命名文件',
        category:d.category||'文件',
        summary:d.summary||d.摘要||'',
        description:d.description||d.desc||'',
        file_name:d.file_name||d.fileName||'',
        file_url:d.file_url||d.url||'',
        file_data:d.file_data||d.data_url||'',
        drive_id:d.drive_id||d.fileId||'',
        uploaded_by:d.uploaded_by||d.created_by||'',
        date:d.date||d.created_at||''
      }))};
    };
    if(local) return normalize(local);
    return normalize(this.eventData['documents']||[]);
  }
,
  saveDocumentsData(data){
    const normalized={docs:(data.docs||[])};
    localStorage.setItem(LS.documents(this.currentEvent?.event_id||'isd_2026'), JSON.stringify(normalized));
    this.eventData['documents']=normalized.docs;
  }
,
  renderDocumentsModule(box){
    const container=box||document.getElementById('module-content');
    if(!container) return;
    const data=this.getDocumentsData();
    const q=(document.getElementById('document-search')?.value||'').toLowerCase();
    const cat=(document.getElementById('document-category-filter')?.value||'');
    const canUpload=this.canUploadDocument();
    const categories=[...new Set(data.docs.map(d=>d.category).filter(Boolean))].sort();
    const filtered=data.docs.filter(d=>{
      const hit=!q || (d.title+d.category+d.description+d.uploaded_by).toLowerCase().includes(q);
      const catOk=!cat || d.category===cat;
      return hit && catOk;
    });
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-slate-50 border rounded-xl p-3 text-[11px] text-slate-700">
          <b>通告及文件：</b>通告、指引、表格，公開可查閱；上傳需權限。
        </div>
        <div class="flex gap-2 flex-wrap">
          ${canUpload?`<button onclick="app.openDocumentForm()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳文件</button>`:''}
          <input id="document-search" value="${escapeHtml(q)}" placeholder="搜尋文件/分類" oninput="app.renderDocumentsModule()" class="px-3 py-2 border rounded-xl text-xs flex-1 min-w-[180px]">
          <select id="document-category-filter" onchange="app.renderDocumentsModule()" class="px-3 py-2 border rounded-xl text-xs bg-white"><option value="">全部分類</option>${categories.map(c=>`<option value="${escapeHtml(c)}" ${cat===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}</select>
          <button onclick="app.downloadDocumentTemplate()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">下載範本</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${filtered.map(d=>{
            const driveId=this.docDriveId(d);
            return `
            <div class="border rounded-xl p-4 bg-white space-y-2 flex flex-col">
              <div class="flex justify-between items-start gap-2"><div class="min-w-0"><b class="text-[13px]">${escapeHtml(d.title)}</b><div class="mt-1 flex gap-2 flex-wrap"><span class="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(d.category)}</span>${d.file_name?`<span class="bg-sky-50 text-sky-700 text-[10px] px-2 py-0.5 rounded-full border border-sky-200">${escapeHtml(d.file_name)}</span>`:''}</div></div><div class="flex gap-1 flex-shrink-0">${canUpload?`<button onclick="app.openDocumentForm('${d.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteDocument('${d.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`:''}</div></div>
              ${d.summary?`<div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-slate-700 leading-relaxed"><b class="text-amber-800"><i class="fa-solid fa-align-left mr-1"></i>擇要：</b>${escapeHtml(d.summary)}</div>`:''}
              <div class="text-[10px] text-slate-400">上載：${escapeHtml(d.uploaded_by||'')} ${d.date?' | '+escapeHtml(d.date):''}</div>
              <div class="flex gap-2 flex-wrap mt-auto pt-1">
                ${driveId?`<button onclick="app.previewDocument('${d.id}')" class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-eye mr-1"></i>嵌入預覽</button><a href="https://drive.google.com/uc?export=download&id=${driveId}" target="_blank" class="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載</a>`:''}
                <button onclick="app.downloadDocument('${d.id}')" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>開啟</button>
                <button onclick="app.toggleDocumentDetail('${d.id}')" class="bg-slate-100 border px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-circle-info mr-1"></i>詳細</button>
              </div>
              <div id="doc-detail-${d.id}" class="hidden space-y-2 border-t pt-2 mt-1">
                ${d.description?`<div class="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">${escapeHtml(d.description)}</div>`:''}
                ${driveId?`<iframe src="https://drive.google.com/file/d/${driveId}/preview" class="w-full h-[320px] border rounded-xl" allow="autoplay"></iframe>`:''}
              </div>
            </div>`;
          }).join('') || '<p class="text-xs text-slate-400 py-8 text-center md:col-span-2">暫無文件</p>'}
        </div>
      </div>
    `;
  }
,
  openDocumentForm(id=null){
    if(!this.canUploadDocument()){ showToast('僅管理員/行政組總主任以上可上傳','error'); return; }
    const data=this.getDocumentsData();
    const existing=id?data.docs.find(d=>d.id===id):null;
    const html=`
      <input type="hidden" id="doc-form-mode" value="${existing?'edit':'create'}"><input type="hidden" id="doc-form-id" value="${existing?.id||''}">
      <div class="space-y-3">
        <div><label class="text-[11px] font-bold">文件標題 *</label><input id="doc-title" value="${escapeHtml(existing?.title||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="text-[11px] font-bold">分類</label><input id="doc-category" value="${escapeHtml(existing?.category||'通告')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">外部連結 (Drive)</label><input id="doc-url" value="${escapeHtml(existing?.file_url||'')}" placeholder="https://drive.google.com/file/d/.../view" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div></div>
        <div><label class="text-[11px] font-bold">擇要 (摘要：讓用戶一眼知道內容)</label><textarea id="doc-summary" rows="2" placeholder="簡短摘錄此文件重點…" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.summary||'')}</textarea></div>
        <div><label class="text-[11px] font-bold">說明</label><textarea id="doc-desc" rows="3" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>
        <div><label class="text-[11px] font-bold">上傳檔案 (可選，儲存在瀏覽器)</label><input type="file" id="doc-file" class="w-full text-xs mt-1"><div class="text-[10px] text-slate-400 mt-1">${existing?.file_name?'現有檔案：'+escapeHtml(existing.file_name):'如不選擇檔案，可只填外部連結。'}</div></div>
      </div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯文件':'上傳文件';
    document.getElementById('record-form-fields').innerHTML=html;
    document.getElementById('record-form').onsubmit=(e)=>{e.preventDefault(); this.submitDocumentForm();};
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async submitDocumentForm(){
    const mode=document.getElementById('doc-form-mode').value;
    const id=document.getElementById('doc-form-id').value;
    const title=document.getElementById('doc-title').value.trim();
    if(!title){ showToast('請填寫文件標題','error'); return; }
    const data=this.getDocumentsData();
    const existing=id?data.docs.find(d=>d.id===id):null;
    const file=document.getElementById('doc-file').files[0];
    let fileData=existing?.file_data||'';
    let fileName=existing?.file_name||'';
    if(file){ fileData=await fileToDataUrl(file); fileName=file.name; }
    const record={
      id:existing?.id||'doc_'+Date.now(),
      title,
      category:document.getElementById('doc-category').value.trim()||'文件',
      summary:document.getElementById('doc-summary').value.trim(),
      description:document.getElementById('doc-desc').value.trim(),
      file_url:document.getElementById('doc-url').value.trim(),
      file_name:fileName,
      file_data:fileData,
      uploaded_by:this.currentUser?.name||'',
      date:existing?.date||todayISO()
    };
    if(mode==='edit'){
      const idx=data.docs.findIndex(d=>d.id===id);
      if(idx>=0) data.docs[idx]={...data.docs[idx],...record};
    }else data.docs.unshift(record);
    this.saveDocumentsData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('文件已保存','success');
    this.renderDocumentsModule();
  }
,
  downloadDocument(id){
    const d=this.getDocumentsData().docs.find(x=>x.id===id);
    if(!d) return;
    if(d.file_data){ downloadDataUrl(d.file_name||`${d.title}.txt`, d.file_data); return; }
    if(d.file_url && d.file_url!=='#'){ window.open(d.file_url,'_blank'); return; }
    showToast('此文件暫未附加檔案或連結','warning');
  }
,
  // 從 file_url / drive_id 抽取 Google Drive 檔案 ID (供預覽、下載)
  docDriveId(d){
    if(d.drive_id) return d.drive_id;
    const u=d.file_url||'';
    const m=u.match(/\/file\/d\/([0-9a-zA-Z_-]{20,})/)||u.match(/[?&]id=([0-9a-zA-Z_-]{20,})/)||u.match(/\/open\?id=([0-9a-zA-Z_-]{20,})/);
    return m?m[1]:'';
  }
,
  previewDocument(id){
    const d=this.getDocumentsData().docs.find(x=>x.id===id);
    if(!d) return;
    const driveId=this.docDriveId(d);
    const area=document.getElementById('doc-detail-'+id);
    if(!area) return;
    area.classList.remove('hidden');
    if(!driveId){ showToast('此文件無可嵌入預覽的 Drive 連結','warning'); return; }
    if(!area.querySelector('iframe')){
      const fr=document.createElement('iframe');
      fr.src='https://drive.google.com/file/d/'+driveId+'/preview';
      fr.className='w-full h-[320px] border rounded-xl';
      fr.allow='autoplay';
      area.insertAdjacentElement('afterbegin', fr);
    }
  }
,
  toggleDocumentDetail(id){
    const area=document.getElementById('doc-detail-'+id);
    if(area) area.classList.toggle('hidden');
  }
,
  deleteDocument(id){
    if(!this.canUploadDocument()) return;
    if(!confirm('確定刪除此文件？')) return;
    const data=this.getDocumentsData();
    data.docs=data.docs.filter(d=>d.id!==id);
    this.saveDocumentsData(data);
    this.renderDocumentsModule();
    showToast('文件已刪除','warning');
  }
,
  downloadDocumentTemplate(){
    const csv='title,category,description,file_url\n活動通告,通告,活動重要資訊,https://example.com/file.pdf\n報名表格,表格,旅團報名資料,\n';
    const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='documents_template.csv'; a.click(); showToast('已下載文件範本','success');
  }
,
  exportDocumentsData(){
    const data=this.getDocumentsData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`documents_${todayISO()}.json`; a.click(); showToast('已匯出文件 JSON','success');
  }
,
  getThemeBadgesData(){
    const key=LS.theme_badges(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    const normalize=(raw)=>{
      const list=Array.isArray(raw)?raw:(raw?.badges||[]);
      return {badges:list.map((b,i)=>({
        id:b.id||b.badge_id||'badge_'+i,
        title:b.title||b.name||'活動主題章',
        branch:b.branch||'全體成員',
        requirements:b.requirements||b.criteria||'',
        description:b.description||b.desc||'',
        file_name:b.file_name||'',
        file_url:b.file_url||b.url||'',
        file_data:b.file_data||'',
        created_by:b.created_by||'',
        created_at:b.created_at||''
      }))};
    };
    if(local) return normalize(local);
    if(!this.isDemoEvent()) return normalize([]); // 真實活動：預留版位
    return normalize(this.eventData['theme_badges']||[
      {id:'badge_1',title:'Scout for SDGs 活動主題章',branch:'小童軍 / 幼童軍 / 童軍 / 深資童軍 / 樂行童軍',requirements:'完成指定攤位任務及集印，認識可持續發展目標。',description:'主題章資料公開可看；詳細參加條件可由副主席以上上傳更新。',created_by:'主題節目組',created_at:todayISO()},
      {id:'badge_2',title:'積極公民獎章活動記錄',branch:'幼童軍及童軍',requirements:'參與活動並完成指定服務/學習紀錄。',description:'可下載或查閱回條、記錄冊及參與條件。',created_by:'行政組',created_at:todayISO()}
    ]);
  }
,
  saveThemeBadgesData(data){
    const normalized={badges:data.badges||[]};
    localStorage.setItem(LS.theme_badges(this.currentEvent?.event_id||'isd_2026'), JSON.stringify(normalized));
    this.eventData['theme_badges']=normalized.badges;
  }
,
  renderThemeBadgesModule(c){
    const container=c||this._themeContainer||document.getElementById('module-content');
    this._themeContainer=container;
    if(!container) return;
    const data=this.getThemeBadgesData();
    const q=(document.getElementById('theme-badge-search')?.value||'').toLowerCase();
    const canUpload=this.canUploadThemeBadge();
    const list=data.badges.filter(b=>!q||(b.title+b.branch+b.requirements+b.description).toLowerCase().includes(q));
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-3 text-[11px] leading-relaxed text-purple-900"><b>🏅 活動主題章：</b>參加條件、回條、記錄冊及相關文件集中在這裡；全部公開可看，副主席以上可更新。</div>
        <div class="flex gap-2 flex-wrap">${canUpload?`<button onclick="app.openThemeBadgeForm()" class="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-award mr-1"></i>新增主題章</button>`:''}<input id="theme-badge-search" value="${escapeHtml(q)}" placeholder="搜尋主題章/支部/條件" oninput="app.renderThemeBadgesModule(this._themeContainer||document.getElementById('module-content'))" class="px-3 py-2 border rounded-xl text-xs flex-1 min-w-[180px]"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${list.map(b=>`
          <div class="border rounded-xl p-4 bg-white space-y-2">
            <div class="flex justify-between items-start gap-2"><div><b class="text-[14px] text-purple-900">${escapeHtml(b.title)}</b><div class="text-[10px] text-purple-700 mt-1 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5 inline-block">${escapeHtml(b.branch)}</div></div><div class="flex gap-1">${canUpload?`<button onclick="app.openThemeBadgeForm('${b.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteThemeBadge('${b.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`:''}</div></div>
            <div class="text-[11px] text-slate-700 whitespace-pre-line"><b>參加條件：</b>${escapeHtml(b.requirements||'待補充')}</div>
            <div class="text-[11px] text-slate-600 whitespace-pre-line">${escapeHtml(b.description||'')}</div>
            <div class="text-[10px] text-slate-400">更新：${escapeHtml(b.created_by||'')} ${b.created_at?' | '+escapeHtml(b.created_at):''}</div>
            <div class="flex gap-2">${(b.file_data||b.file_url)?`<button onclick="app.downloadThemeBadgeFile('${b.id}')" class="bg-purple-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載資料</button>`:'<span class="text-[10px] text-slate-400">暫無附件</span>'}</div>
          </div>
        `).join('') || '<p class="text-xs text-slate-400 py-8 text-center md:col-span-2">暫無主題章資料</p>'}</div>
      </div>
    `;
  }
,
  openThemeBadgeForm(id=null){
    if(!this.canUploadThemeBadge()){ showToast('僅副主席以上可上傳主題章資料','error'); return; }
    const data=this.getThemeBadgesData();
    const existing=id?data.badges.find(b=>b.id===id):null;
    const html=`
      <input type="hidden" id="badge-form-mode" value="${existing?'edit':'create'}"><input type="hidden" id="badge-form-id" value="${existing?.id||''}">
      <div class="space-y-3">
        <div><label class="text-[11px] font-bold">主題章名稱 *</label><input id="badge-title" value="${escapeHtml(existing?.title||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">適用支部</label><input id="badge-branch" value="${escapeHtml(existing?.branch||'全體成員')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">參加條件</label><textarea id="badge-requirements" rows="3" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.requirements||'')}</textarea></div>
        <div><label class="text-[11px] font-bold">說明</label><textarea id="badge-desc" rows="3" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>
        <div><label class="text-[11px] font-bold">外部連結</label><input id="badge-url" value="${escapeHtml(existing?.file_url||'')}" placeholder="https://..." class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">附件 (可選)</label><input type="file" id="badge-file" class="w-full text-xs mt-1"><div class="text-[10px] text-slate-400 mt-1">${existing?.file_name?'現有附件：'+escapeHtml(existing.file_name):'可上傳回條、記錄冊或主題章圖片。'}</div></div>
      </div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯活動主題章':'新增活動主題章';
    document.getElementById('record-form-fields').innerHTML=html;
    document.getElementById('record-form').onsubmit=(e)=>{e.preventDefault(); this.submitThemeBadgeForm();};
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async submitThemeBadgeForm(){
    const mode=document.getElementById('badge-form-mode').value;
    const id=document.getElementById('badge-form-id').value;
    const title=document.getElementById('badge-title').value.trim();
    if(!title){ showToast('請填寫主題章名稱','error'); return; }
    const data=this.getThemeBadgesData();
    const existing=id?data.badges.find(b=>b.id===id):null;
    const file=document.getElementById('badge-file').files[0];
    let fileData=existing?.file_data||'';
    let fileName=existing?.file_name||'';
    if(file){ fileData=await fileToDataUrl(file); fileName=file.name; }
    const record={
      id:existing?.id||'badge_'+Date.now(),
      title,
      branch:document.getElementById('badge-branch').value.trim()||'全體成員',
      requirements:document.getElementById('badge-requirements').value.trim(),
      description:document.getElementById('badge-desc').value.trim(),
      file_url:document.getElementById('badge-url').value.trim(),
      file_name:fileName,
      file_data:fileData,
      created_by:this.currentUser?.name||'',
      created_at:existing?.created_at||todayISO()
    };
    if(mode==='edit'){
      const idx=data.badges.findIndex(b=>b.id===id);
      if(idx>=0) data.badges[idx]={...data.badges[idx],...record};
    }else data.badges.unshift(record);
    this.saveThemeBadgesData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('主題章資料已保存','success');
    this.renderThemeBadgesModule();
  }
,
  downloadThemeBadgeFile(id){
    const b=this.getThemeBadgesData().badges.find(x=>x.id===id);
    if(!b) return;
    if(b.file_data){ downloadDataUrl(b.file_name||`${b.title}.txt`, b.file_data); return; }
    if(b.file_url && b.file_url!=='#'){ window.open(b.file_url,'_blank'); return; }
    showToast('此主題章暫未附加檔案或連結','warning');
  }
,
  deleteThemeBadge(id){
    if(!this.canUploadThemeBadge()) return;
    if(!confirm('確定刪除此主題章資料？')) return;
    const data=this.getThemeBadgesData();
    data.badges=data.badges.filter(b=>b.id!==id);
    this.saveThemeBadgesData(data);
    this.renderThemeBadgesModule();
    showToast('主題章資料已刪除','warning');
  }
,
  exportThemeBadges(){
    const data=this.getThemeBadgesData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`theme_badges_${todayISO()}.json`; a.click(); showToast('已匯出主題章 JSON','success');
  }
,
});
