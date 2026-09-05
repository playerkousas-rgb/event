/* 35-ceremony.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== 典禮儀式 (公開) ===================== */
  getCeremonyData(){
    const key=LS.ceremony(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local) return local;
    // 內建官方典禮程序（2026-10-04 定稿，不會再改）——所有活動一併內建，可於 APP 內編輯覆蓋
    const officialRundown=[
      {id:'rd_o0',time:'10:45',program:'嘉賓接待（典禮嘉賓接待處）',location:'莫榮大樓地下'},
      {id:'rd_o1',time:'10:55',program:'嘉賓就座',location:'大操場'},
      {id:'rd_o2',time:'11:00',program:'第一部分典禮：優異旅團及各項獎勵頒發儀式（吳家麗會長主禮）— 頒發優異旅團彩帶及證書／頒發支部最高獎章嘉許信／頒發領袖及委員獎勵／致送協助單位紀念品',location:'大操場'},
      {id:'rd_o3',time:'12:00',program:'第二部分典禮：會操檢閱及頒獎儀式（港島總區指揮官區永樑先生主禮）— 主禮嘉賓進場／檢閱步操比賽隊伍／幼童軍團呼及頒獎／主禮嘉賓致辭／頒發升旗比賽獎項／頒發步操比賽獎項／頒發隊列比賽獎項／頒發區際錦標／步操隊伍離場',location:'大操場'},
      {id:'rd_o4',time:'13:00',program:'頒獎典禮完畢；嘉賓茶聚（儀式完結後隨即開始）',location:'莫榮大樓地下'},
      {id:'rd_o5',time:'14:00',program:'參觀主題活動區',location:'全場'}
    ];
    if(!this.isDemoEvent()) return {rundown:officialRundown,mc_script:[],speech:null,guests:[],seating:[],files:[],meritRoster:[],responses:[]}; // 真實活動：內建官方典禮程序、附件及優異旅團名單版位
    return {
      rundown:officialRundown,
      files:[],
      meritRoster:[],
      responses:[],
      mc_script:[
        {id:'mc0_1',seq:1,text:'【優異旅團頒獎典禮（15:00）】司儀（蔡小晴）：我係柴灣區副區總監蔡小晴。司儀（曾令勤）：我係港島地域深資童軍議會主席曾令勤。歡迎各位參加「港島童軍繽紛日2025」，典禮即將開始，請各位保持安靜。'},
        {id:'mc0_2',seq:2,text:'司儀（蔡小晴）：「港島童軍繽紛日」係港島地域一年一度的盛事，嘉許優異旅團、表揚有出色表現的青少年成員、領袖及會務委員。司儀（曾令勤）：今年活動以「童心傳承、明日領袖」為主軸。'},
        {id:'mc0_3',seq:3,text:'司儀（曾令勤）：今天的活動分為三個部分：第一部分係上午的主題攤位節目，第二部分係現在的優異旅團及各項獎勵頒獎典禮，第三部分則係稍後的會操檢閱及步操比賽頒獎典禮。'},
        {id:'mc0_4',seq:4,text:'司儀（曾令勤）：首先頒發「2025年優異旅團彩帶及證書」。現在有請地域總監區子君為我們頒發彩帶及證書，並請副地域總監（常務）陳子明陪同到台前。'},
        {id:'mc0_5',seq:5,text:'司儀（蔡小晴）：首先係頒發小童軍支部，今年共有39個小童軍團獲獎。司儀（曾令勤）：接住係幼童軍支部（57團）、童軍支部（44團）、深資童軍支部（35團）及樂行童軍支部（15團）。恭喜各獲獎旅團。'},
        {id:'mc0_6',seq:6,text:'司儀（曾令勤）：接著頒發「支部最高獎章嘉許信」。恭請地域主席區子君為我們頒發總領袖獎章嘉許信，請副地域總監（活動與訓練）陳子明陪同。今年共有36位童軍考獲總領袖獎章、2位深資童軍考獲榮譽童軍獎章、4位樂行童軍考獲貝登堡獎章。'},
        {id:'mc0_7',seq:7,text:'司儀（曾令勤）：接著有請地域總監區子君頒發「總監委任書」，獲頒發的總監分別係：藍嘉恩女士、莫家榮先生、龔文輝先生、何凱威先生及范璟珩先生。現在進行覆誓儀式。'},
        {id:'mc0_8',seq:8,text:'司儀（蔡小晴）：接著頒授童軍獎勵，有請香港童軍總會執行委員會主席陳大文頒授各項童軍獎勵。首先係頒授「5年長期服務獎狀」（鄭國柱、陸富强），接著係「10年長期服務獎狀」（余咏兒）、「長期服務一星獎章」（秦伯強）、「長期服務四星獎章」（羅定國）。'},
        {id:'mc0_9',seq:9,text:'司儀（曾令勤）：接著請地域總監區子君頒授「優異服務獎章」（文家豪、高家豪）。司儀（蔡小晴）：現在有請「小童軍快樂傘比賽」的三支隊伍為我們表演（港島第6旅A隊、港島第6旅B隊、港島第175旅）。'},
        {id:'mc0_10',seq:10,text:'司儀（蔡小晴）：現在請地域主席區子君頒發「小童軍填色比賽」獎項（優異獎：唐心瑜、葉家柏；季軍：岑伊曦；亞軍：謝柏君；冠軍：孫穎淳）。司儀（曾令勤）：接著頒發「幼童軍創作比賽」獎項（冠軍：曹澔霆、亞軍：甄已立、季軍：彭卓恒）。'},
        {id:'mc0_11',seq:11,text:'司儀（蔡小晴）：現在請地域會長區子君頒發「小童軍快樂傘比賽」獎項（冠軍：港島第6旅A隊、亞軍：港島第6旅B隊）。司儀（曾令勤）：現在有請地域會長為我們致送感謝狀給協助機構（香港警察學院、聖約翰救傷隊）。'},
        {id:'mc1',seq:12,text:'司儀（蔡小晴）：我係柴灣區區領袖蔡小晴。司儀（陳梓衡）：我係柴灣區區領袖陳梓衡。稍後即將進行「港島童軍繽紛日2025」會操檢閱暨頒獎典禮。請將手提電話及響鬧裝置轉為靜音。'},
        {id:'mc2',seq:13,text:'司儀（蔡小晴）：現在請會操副司令員港島第十二旅深資童軍團長鍾曉虎先生帶領步操隊伍進場。（S.I.C. Parade will March On, By the Left Quick March）'},
        {id:'mc3',seq:14,text:'司儀（陳梓衡）：現在請會操司令員港島第15旅深資海童軍副團長莫志達先生進場。'},
        {id:'mc4',seq:15,text:'司儀（蔡小晴）：現在香港童軍總會港島地域旗隊進場，請各位嘉賓、各位童軍起立。'},
        {id:'mc5',seq:16,text:'司儀（蔡小晴）：主禮嘉賓現在到場，請各位肅靜。（主禮嘉賓於1555在行政樓登上政府私家車，開往吹氣拱門，由各總監迎接）'},
        {id:'mc6',seq:17,text:'司儀（陳梓衡）：現在恭請地域會長、地域總監、地域主席、各副地域總監及活動籌委會主席陪同主禮嘉賓進場，請各位起立。'},
        {id:'mc7',seq:18,text:'司儀（蔡小晴）：現在由會操隊伍向主禮嘉賓致敬。（P.C. Parade, General Salute, Present Staff）'},
        {id:'mc8',seq:19,text:'司儀（陳梓衡）：現在恭請主禮嘉賓香港警察學院院長盧詠儀檢閱會操隊伍，並由副地域總監陳子明及潘志強陪同。'},
        {id:'mc9',seq:20,text:'司儀（蔡小晴）：步操係童軍運動中一個非常重要嘅訓練項目。各位可以看到在場嘅比賽隊伍精神奕奕，的確十分神氣，相信佢哋下過唔少苦功。（檢閱完畢）'},
        {id:'mc10',seq:21,text:'司儀（陳梓衡）：會操隊伍即將進行分列式步操，並請盧院長接受會操隊伍致敬。（P.C. Parade will March Past in Quick Time）'},
        {id:'mc11',seq:22,text:'司儀（蔡小晴）：香港童軍總會港島地域旗隊即將經過檢閱台，請各位嘉賓起立。隨後係各支青少年制服團體嘅隊伍（民眾安全服務隊少年團、聖約翰救傷隊少青團）及步操比賽隊伍。'},
        {id:'mc12',seq:23,text:'司儀（蔡小晴）：現在有請主禮嘉賓接受會操隊伍最高致敬，請各位起立。（P.C. Parade will Advance, In Review Order, By the Centre, Quick March 16 paces）'},
        {id:'mc13',seq:24,text:'司儀（蔡小晴）：現在恭請香港警察學院院長盧詠儀致辭。（致辭完畢）司儀（陳梓衡）：多謝盧院長。'},
        {id:'mc14',seq:25,text:'司儀（蔡小晴）：現在頒發「港島地域步操比賽2025」嘅獎項，比賽分為升旗比賽、步操比賽及隊列比賽。有請盧院長到台前為我們頒發獎項。'},
        {id:'mc15',seq:26,text:'司儀（陳梓衡）：首先係頒發升旗比賽獎項。司儀（蔡小晴）：接著係頒發步操比賽（初級組）獎項。司儀（陳梓衡）：接著係頒發步操比賽（選拔組）獎項。司儀（蔡小晴）：接著係頒發隊列比賽獎項。'},
        {id:'mc16',seq:27,text:'司儀（陳梓衡）：本年度獲得「區際錦標」嘅區會係港島西區。請港島西區區總監秦伯強代表接受獎項。'},
        {id:'mc17',seq:28,text:'司儀（蔡小晴）：現在有請盧院長移步到檢閱台，準備接受步操隊伍敬禮。步操隊伍即將離場。'},
        {id:'mc18',seq:29,text:'司儀（蔡小晴）：現在有請主禮嘉賓及各嘉賓到拍照區合照。合照分兩輪：第一輪步操隊與主禮嘉賓、地域會長、地域主席、地域總監及三位副地域總監合照；第二輪步操隊與全體嘉賓合照。'},
        {id:'mc19',seq:30,text:'司儀（蔡小晴）：今年嘅會操已經完結，多謝各位參與。請各位嘉賓移步到莫榮大樓，大會安排了茶點招待。明年再見。Bye Bye'}
      ],
      speech:{title:'主禮嘉賓致辭擬稿',content:'葉主席、吳會長、楊總監、李主席、各位嘉賓、各位童軍，大家好！我非常榮幸能夠代表香港警務處，以檢閱官身份出席「港島童軍繽紛日」呢個一年一度的盛會。青年是香港未來的主人翁，作為全港成員人數最多的青少年制服團體，香港童軍總會一直積極配合特區政府的青少年發展政策，透過多元創新、具挑戰性、富教育意義的活動與訓練，培育青年人成為有助於社會的良好公民。步操活動是制服團體展現紀律訓練的重要一環，剛才經過檢閱台的青少年成員英姿颯爽、步步鏗鏘，正正體現了青少年成員刻苦鍛練的豐碩成果。最後，我要特別祝賀今日獲獎的每一位青年人，希望你們繼續勇於挑戰、自強不息、再創高峰！祝願「港島童軍繽紛日」活動圓滿成功。'},
      guests:[
        {id:'g1',name:'盧詠儀',title:'香港警察學院院長（會操檢閱主禮嘉賓）',note:'檢閱會操隊伍、致辭、頒發步操比賽獎項'},
        {id:'g2',name:'區子君會長',title:'香港童軍總會港島地域會長',note:'頒發支部最高獎章嘉許信、迎接主禮嘉賓'},
        {id:'g3',name:'石敬文總監',title:'香港童軍總會港島地域總監（優異旅團頒獎典禮主禮）',note:'頒發優異旅團彩帶及證書、總監委任書、授旗禮'},
        {id:'g4',name:'陳永康主席',title:'香港童軍總會港島地域執行委員會主席',note:'致送協助單位紀念品、迎接主禮嘉賓'},
        {id:'g5',name:'陳子明',title:'副地域總監（常務）',note:'陪同檢閱、頒獎'},
        {id:'g6',name:'潘志強',title:'副地域總監（活動與訓練）',note:'陪同頒發優異旅團彩帶及證書'},
        {id:'g7',name:'梁國豪',title:'副地域總監',note:'陪同檢閱、迎接主禮嘉賓'},
        {id:'g8',name:'高家豪',title:'港島童軍繽紛日籌委會主席',note:'迎接主禮嘉賓、陪同進場'},
        {id:'g9',name:'區嘉欣',title:'副地域總監',note:'見證授旗禮'},
        {id:'g10',name:'蔡子豪',title:'副地域總監',note:'頒發小童軍及幼童軍比賽獎項'}
      ],
      seating:[
        {id:'s1',zone:'檢閱台',arrangement:'主禮嘉賓盧詠儀院長立於檢閱台面向操場，陳子明總監及梁國豪總監站立左右兩側（會操）；優異旅團頒獎時由石敬文總監主持' },
        {id:'s2',zone:'進場排位',arrangement:'風笛手→盧詠儀院長→區子君會長→石敬文總監→陳永康主席→各副地域總監→高家豪總監' },
        {id:'s3',zone:'拱門',arrangement:'主禮嘉賓於行政樓登上政府七人車，經吹氣拱門旁下車，青少年成員向主禮嘉賓敬禮' },
        {id:'s4',zone:'會操隊伍',arrangement:'15隊步操隊伍於操場列隊，檢閱時檢閱官逐排檢閱 Front Rank' },
        {id:'s5',zone:'嘉賓席（第1行）',arrangement:'檢閱台前最前一行，面向操場，頒獎嘉賓及主禮嘉賓就座' },
        {id:'s6',zone:'嘉賓席（第2-3行）',arrangement:'各區總監、各嘉賓及獲獎人士代表' },
        {id:'s7',zone:'嘉賓席（第4-5行）',arrangement:'各旅團代表、獲獎領袖及委員' }
      ]
    };
  }
,
  saveCeremonyData(data){ localStorage.setItem(LS.ceremony(this.currentEvent?.event_id||'isd_2026'), JSON.stringify(data)); }
,
  renderCeremonyModule(box){
    const container=box||document.getElementById('module-content');
    const ceremonyTabs=['rundown','mc','guests','seating','speech','awards','section_award','leader_award','map'];
    // 舊頁面曾有 exec_manual 子頁籤；快取或返回歷史指向它時安全回到 RUNDOWN。
    if(!ceremonyTabs.includes(this.ceremonySubTab)) this.ceremonySubTab='rundown';
    const data=this.getCeremonyData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    const canEditFiles=canEdit||this.isCardOwnerGroup('ceremony');
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900">
          <b>👑 典禮儀式：</b>供公眾查閱典禮流程（RUNDOWN）、司儀稿、嘉賓名單、座位表、優異旅團獲獎名單及支部／領袖獎勵名單。管理員／副主席以上可編輯；各項目可上傳 <b>PDF／Word／連結</b>，Word 會自動解析成文字，PDF 可直接預覽。
        </div>
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-[11px] leading-relaxed text-indigo-900"><b><i class="fa-solid fa-paperclip mr-1"></i>附件（PDF／Word／連結）</b> — 可用於 RUNDOWN、司儀稿、嘉賓名單、座位表、致辭稿、優異旅團獲獎名單及嘉賓地圖。</div>
            ${canEditFiles?`<button onclick="app.openCeremonyFileForm()" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳附件</button>`:''}
          </div>
          <div id="ceremony-files-list" class="grid grid-cols-1 md:grid-cols-2 gap-2"></div>
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchCeremonyTab('rundown')" class="tab-btn ${this.ceremonySubTab==='rundown'?'active':''}"><i class="fa-solid fa-list mr-1"></i> RUNDOWN</button>
          <button onclick="app.switchCeremonyTab('mc')" class="tab-btn ${this.ceremonySubTab==='mc'?'active':''}"><i class="fa-solid fa-microphone-lines mr-1"></i> 司儀稿</button>
          <button onclick="app.switchCeremonyTab('guests')" class="tab-btn ${this.ceremonySubTab==='guests'?'active':''}"><i class="fa-solid fa-user-tie mr-1"></i> 嘉賓名單</button>
          <button onclick="app.switchCeremonyTab('seating')" class="tab-btn ${this.ceremonySubTab==='seating'?'active':''}"><i class="fa-solid fa-chair mr-1"></i> 座位表</button>
          <button onclick="app.switchCeremonyTab('speech')" class="tab-btn ${this.ceremonySubTab==='speech'?'active':''}"><i class="fa-solid fa-comment-dots mr-1"></i> 致辭稿</button>
          <button onclick="app.switchCeremonyTab('awards')" class="tab-btn ${this.ceremonySubTab==='awards'?'active':''}"><i class="fa-solid fa-trophy mr-1"></i> 優異旅團獲獎名單</button>
          <button onclick="app.switchCeremonyTab('section_award')" class="tab-btn ${this.ceremonySubTab==='section_award'?'active':''}"><i class="fa-solid fa-medal mr-1"></i> 支部獎勵名單</button>
          <button onclick="app.switchCeremonyTab('leader_award')" class="tab-btn ${this.ceremonySubTab==='leader_award'?'active':''}"><i class="fa-solid fa-award mr-1"></i> 領袖獎勵名單</button>
          <button onclick="app.switchCeremonyTab('map')" class="tab-btn ${this.ceremonySubTab==='map'?'active':''}"><i class="fa-solid fa-map-location-dot mr-1"></i> 嘉賓地圖</button>
          <button onclick="app.openCeremonyApplicationForm()" class="tab-btn bg-emerald-600 text-white"><i class="fa-solid fa-file-pen mr-1"></i> 優異旅團回條（APP內填寫）</button>
        </div>
        <div id="ceremony-tab-rundown" class="${this.ceremonySubTab==='rundown'?'':'hidden'}"></div>
        <div id="ceremony-tab-mc" class="${this.ceremonySubTab==='mc'?'':'hidden'}"></div>
        <div id="ceremony-tab-guests" class="${this.ceremonySubTab==='guests'?'':'hidden'}"></div>
        <div id="ceremony-tab-seating" class="${this.ceremonySubTab==='seating'?'':'hidden'}"></div>
        <div id="ceremony-tab-speech" class="${this.ceremonySubTab==='speech'?'':'hidden'}"></div>
        <div id="ceremony-tab-awards" class="${this.ceremonySubTab==='awards'?'':'hidden'}"></div>
        <div id="ceremony-tab-section_award" class="${this.ceremonySubTab==='section_award'?'':'hidden'}">${this.ceremonySubTab==='section_award'?this.rosterPanelHTML('section_award',{scope:'cer'}):''}</div>
        <div id="ceremony-tab-leader_award" class="${this.ceremonySubTab==='leader_award'?'':'hidden'}">${this.ceremonySubTab==='leader_award'?this.rosterPanelHTML('leader_award',{scope:'cer'}):''}</div>
        <div id="ceremony-tab-map" class="${this.ceremonySubTab==='map'?'':'hidden'}"></div>
      </div>
    `;
    this.renderCeremonyRundown();
    this.renderCeremonyMc();
    this.renderCeremonyGuests();
    this.renderCeremonySeating();
    this.renderCeremonySpeech();
    this.renderCeremonyMap();
    this.renderCeremonyFiles();
    if(this.ceremonySubTab==='awards') this.renderAwardsModule(document.getElementById('ceremony-tab-awards'));
  }
,
  switchCeremonyTab(tab){
    const ceremonyTabs=['rundown','mc','guests','seating','speech','awards','section_award','leader_award','map'];
    if(!ceremonyTabs.includes(tab)) tab='rundown';
    this.ceremonySubTab=tab;
    ceremonyTabs.forEach(t=>{const el=document.getElementById('ceremony-tab-'+t); if(el) el.classList.toggle('hidden',t!==tab);});
    document.querySelectorAll('[onclick^="app.switchCeremonyTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'tab-btn active':'tab-btn';
    });
    if(tab==='awards'){ const c=document.getElementById('ceremony-tab-awards'); if(c && !c.dataset.rendered){ c.dataset.rendered='1'; this.renderAwardsModule(c); } }
    // 支部獎勵／領袖獎勵名單與部門中心共用同一份資料。
    if(tab==='section_award'||tab==='leader_award'){ const c=document.getElementById('ceremony-tab-'+tab); if(c && !c.innerHTML.trim()) c.innerHTML=this.rosterPanelHTML(tab,{scope:'cer'}); }
    if(tab==='map') this.renderCeremonyMap();
  }
,
  renderCeremonyMap(){
    const container=document.getElementById('ceremony-tab-map'); if(!container) return;
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] leading-relaxed text-rose-900">
          <b>🗺️ 嘉賓地圖及交通（內建·官方 2026 地圖資料，已定稿）：</b>香港警察學院場地及嘉賓安排總覽已內建於本卡，毋須另開連結。
        </div>
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-[13px] mb-2 flex items-center gap-2"><i class="fa-solid fa-map text-rose-600"></i>官方原圖（Police College Maps – Guest V2）</h4>
          <img id="ceremony-map-img" src="assets/ceremony/guest_map.png" onerror="this.style.display='none';document.getElementById('ceremony-map-pdf')?.classList.remove('hidden')" class="w-full h-auto rounded-xl border cursor-zoom-in" alt="嘉賓地圖原圖" onclick="window.open(this.src,'_blank')" title="點擊放大">
          <div id="ceremony-map-pdf" class="hidden"><iframe src="assets/ceremony/guest_map.pdf" class="w-full h-[65vh] rounded-xl border" title="嘉賓地圖原圖"></iframe></div>
          <div class="flex gap-2 mt-2 flex-wrap">
            <a href="assets/ceremony/guest_map.png" download class="bg-rose-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-download mr-1"></i>下載原圖</a>
            <a href="assets/ceremony/guest_map.png" target="_blank" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold">新分頁開啟</a>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="bg-white border rounded-xl p-4 space-y-2">
            <h4 class="font-bold text-[13px] flex items-center gap-2"><i class="fa-solid fa-door-open text-rose-600"></i>入口（東閘）</h4>
            <p class="text-[11px] text-slate-600 leading-relaxed">基於保安原因，<b>所有嘉賓必須利用東閘進入香港警察學院</b>。請按照指示牌，沿著<b>警校道</b>前往位於<b>有蓋操場</b>之<b>嘉賓報到處</b>。</p>
          </div>
          <div class="bg-white border rounded-xl p-4 space-y-2">
            <h4 class="font-bold text-[13px] flex items-center gap-2"><i class="fa-solid fa-mug-hot text-amber-600"></i>典禮嘉賓接待處</h4>
            <p class="text-[11px] text-slate-600 leading-relaxed">設於<b>莫榮大樓地下</b>。嘉賓接待、典禮後輕食茶點均在此進行。</p>
          </div>
          <div class="bg-white border rounded-xl p-4 space-y-2">
            <h4 class="font-bold text-[13px] flex items-center gap-2"><i class="fa-solid fa-car text-sky-600"></i>停車場</h4>
            <p class="text-[11px] text-slate-600 leading-relaxed">警察學院<b>不設停車場</b>。駕車赴會請使用<b>海洋公園正門收費停車場</b>【星期日每小時港幣 $55（每日最高收費港幣 $275）】。</p>
          </div>
          <div class="bg-white border rounded-xl p-4 space-y-2">
            <h4 class="font-bold text-[13px] flex items-center gap-2"><i class="fa-solid fa-bus text-emerald-600"></i>穿梭巴士</h4>
            <p class="text-[11px] text-slate-600 leading-relaxed">去程：<b>10:15</b> 灣仔愛群道伊利沙伯體育館門口開出；回程：<b>14:30</b> 香港警察學院停車場開出。（大會視乎最終示意人數決定是否安排，並另作通知）</p>
          </div>
        </div>
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-[13px] mb-3 flex items-center gap-2"><i class="fa-solid fa-map text-slate-600"></i>場地簡化示意（按官方地圖）</h4>
          <div class="flex flex-col items-stretch gap-2 text-[11px]">
            <div class="flex flex-wrap items-center gap-2">
              <span class="bg-rose-600 text-white px-3 py-2 rounded-xl font-bold whitespace-nowrap"><i class="fa-solid fa-door-open mr-1"></i>入口（東閘）</span>
              <span class="text-slate-400"><i class="fa-solid fa-arrow-right"></i></span>
              <span class="bg-sky-100 text-sky-800 border border-sky-200 px-3 py-2 rounded-xl font-bold">警校道</span>
              <span class="text-slate-400"><i class="fa-solid fa-arrow-right"></i></span>
              <span class="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl font-bold">有蓋操場<br><span class="font-normal text-[10px]">嘉賓報到處</span></span>
              <span class="text-slate-400"><i class="fa-solid fa-arrow-right"></i></span>
              <span class="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-2 rounded-xl font-bold">大操場<br><span class="font-normal text-[10px]">典禮（11:00 / 12:00）</span></span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="bg-slate-100 text-slate-600 border px-3 py-2 rounded-xl font-bold"><i class="fa-solid fa-building mr-1"></i>莫榮大樓地下<br><span class="font-normal text-[10px]">嘉賓接待處 · 茶聚（13:00）</span></span>
              <span class="text-slate-400"><i class="fa-solid fa-arrow-right"></i></span>
              <span class="bg-indigo-100 text-indigo-800 border border-indigo-200 px-3 py-2 rounded-xl font-bold">主題活動區<br><span class="font-normal text-[10px]">參觀（14:00 起）</span></span>
            </div>
            <div class="bg-slate-50 border rounded-xl p-2.5 text-[10px] text-slate-500">註：以上為簡化示意，實際以官方地圖為準。停車場設於海洋公園正門（收費），學院內不設停車場。</div>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <a href="https://www.google.com/maps/search/?api=1&query=%E9%A6%99%E6%B8%AF%E8%AD%A6%E5%AF%9F%E5%AD%B8%E9%99%A2+%E9%BB%83%E7%AB%B9%E5%9D%91" target="_blank" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-location-arrow mr-1"></i>導航前往（Google 地圖）</a>
          <button onclick="app.printCeremonyMap()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印</button>
        </div>
      </div>
    `;
  }
,
  printCeremonyMap(){
    const area=document.getElementById('ceremony-tab-map');
    if(!area){ showToast('找不到嘉賓地圖內容','error'); return; }
    const win=window.open('','_blank');
    if(!win){ showToast('請允許彈出視窗以列印','warning'); return; }
    win.document.write(`<html><head><title>嘉賓地圖</title><link rel="stylesheet" href="${location.origin}/assets/tailwind.css"><style>body{font-family:sans-serif;padding:20px} @media print{button,a{display:none!important}}</style></head><body>${area.innerHTML}<div class="mt-6 text-center"><button onclick="window.print()" class="bg-slate-900 text-white px-6 py-2 rounded-xl">列印</button></div></body></html>`);
    win.document.close();
  }
,
  renderCeremonyRundown(){
    const container=document.getElementById('ceremony-tab-rundown'); if(!container) return;
    const data=this.getCeremonyData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    container.innerHTML=`
      <div class="space-y-3">
        <div class="flex gap-2 flex-wrap">${canEdit?`<button onclick="app.openCeremonyFileForm(null,'rundown')" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳 RUNDOWN</button>`:''}</div>
        <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">時間</th><th class="px-2 py-1 text-left">節目</th><th class="px-2 py-1 text-left">位置</th>${canEdit?'<th class="px-2 py-1 text-right">操作</th>':''}</tr></thead><tbody class="divide-y">${data.rundown.map(x=>`<tr><td class="px-2 py-1 font-mono font-bold" data-label="時間">${escapeHtml(x.time)}</td><td class="px-2 py-1" data-label="節目">${escapeHtml(x.program)}</td><td class="px-2 py-1" data-label="位置">${escapeHtml(x.location)}</td>${canEdit?`<td class="px-2 py-1 text-right" data-label="操作"><button onclick="app.openCeremonyItemForm('rundown','${x.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button> <button onclick="app.deleteCeremonyItem('rundown','${x.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></td>`:''}</tr>`).join('')||'<tr><td colspan="4" class="px-2 py-4 text-center text-slate-400">暫無RUNDOWN</td></tr>'}</tbody></table></div>
      </div>`;
  }
,
  renderCeremonyMc(){
    const container=document.getElementById('ceremony-tab-mc'); if(!container) return;
    const data=this.getCeremonyData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    container.innerHTML=`
      <div class="space-y-3">
        <div class="flex gap-2 flex-wrap">${canEdit?`<button onclick="app.openCeremonyFileForm(null,'mc')" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳司儀稿</button>`:''}</div>
        <div class="space-y-2">${data.mc_script.map(x=>`<div class="border rounded-xl p-3 bg-slate-50"><div class="flex justify-between items-start gap-2"><span class="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">${x.seq}</span>${canEdit?`<div class="flex gap-1 flex-shrink-0"><button onclick="app.openCeremonyItemForm('mc','${x.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteCeremonyItem('mc','${x.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></div>`:''}</div><div class="text-[12px] text-slate-700 mt-1 leading-relaxed">${escapeHtml(x.text)}</div></div>`).join('')||'<p class="text-xs text-slate-400 py-4 text-center">暫無司儀稿</p>'}</div>
      </div>`;
  }
,
  renderCeremonyGuests(){
    const container=document.getElementById('ceremony-tab-guests'); if(!container) return;
    const data=this.getCeremonyData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    container.innerHTML=`
      <div class="space-y-3">
        <div class="flex gap-2 flex-wrap">${canEdit?`<button onclick="app.openCeremonyFileForm(null,'guests')" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳嘉賓名單</button>`:''}</div>
        <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">姓名</th><th class="px-2 py-1 text-left">職銜</th><th class="px-2 py-1 text-left">備註</th>${canEdit?'<th class="px-2 py-1 text-right">操作</th>':''}</tr></thead><tbody class="divide-y">${data.guests.map(g=>`<tr><td class="px-2 py-1 font-bold" data-label="姓名">${escapeHtml(g.name)}</td><td class="px-2 py-1" data-label="職銜">${escapeHtml(g.title)}</td><td class="px-2 py-1" data-label="備註">${escapeHtml(g.note)}</td>${canEdit?`<td class="px-2 py-1 text-right" data-label="操作"><button onclick="app.openCeremonyItemForm('guests','${g.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button> <button onclick="app.deleteCeremonyItem('guests','${g.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></td>`:''}</tr>`).join('')||'<tr><td colspan="4" class="px-2 py-4 text-center text-slate-400">暫無嘉賓</td></tr>'}</tbody></table></div>
      </div>`;
  }
,
  renderCeremonySeating(){
    const container=document.getElementById('ceremony-tab-seating'); if(!container) return;
    const data=this.getCeremonyData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    container.innerHTML=`
      <div class="space-y-3">
        <div class="flex gap-2 flex-wrap">${canEdit?`<button onclick="app.openCeremonyFileForm(null,'seating')" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳座位表</button>`:''}</div>
        <div class="space-y-2">${data.seating.map(x=>`<div class="border rounded-xl p-3 bg-white"><div class="flex justify-between items-start gap-2"><b class="text-[13px]">${escapeHtml(x.zone)}</b>${canEdit?`<div class="flex gap-1 flex-shrink-0"><button onclick="app.openCeremonyItemForm('seating','${x.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteCeremonyItem('seating','${x.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></div>`:''}</div><div class="text-[12px] text-slate-600 mt-1 leading-relaxed">${escapeHtml(x.arrangement)}</div></div>`).join('')||'<p class="text-xs text-slate-400 py-4 text-center">暫無座位表</p>'}</div>
      </div>`;
  }
,
  renderCeremonySpeech(){
    const container=document.getElementById('ceremony-tab-speech'); if(!container) return;
    const data=this.getCeremonyData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    const sp=data.speech||{title:'主禮嘉賓致辭擬稿',content:''};
    container.innerHTML=`
      <div class="space-y-3">
        <div class="flex gap-2 flex-wrap">${canEdit?`<button onclick="app.openCeremonySpeechForm()" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-pen mr-1"></i>編輯致辭稿</button>`:''}</div>
        <div class="bg-white border rounded-xl p-4">
          <h4 class="font-bold text-[14px] mb-2">${escapeHtml(sp.title||'主禮嘉賓致辭')}</h4>
          <div class="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">${escapeHtml(sp.content||'暫無致辭稿')}</div>
        </div>
      </div>`;
  }
,
  openCeremonySpeechForm(){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isCardOwnerGroup('ceremony')){ showToast('僅管理員／副主席以上／行政組・總主任（負責組）可編輯','error'); return; }
    const data=this.getCeremonyData();
    const sp=data.speech||{title:'',content:''};
    let html=`<div><label class="text-[11px] font-bold">標題</label><input id="sp-title" value="${escapeHtml(sp.title||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div class="mt-3"><label class="text-[11px] font-bold">致辭內容</label><textarea id="sp-content" rows="12" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(sp.content||'')}</textarea></div>`;
    document.getElementById('record-modal-title').textContent='編輯致辭稿';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitCeremonySpeechForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitCeremonySpeechForm(){
    const data=this.getCeremonyData();
    data.speech={title:document.getElementById('sp-title').value.trim(),content:document.getElementById('sp-content').value.trim()};
    this.saveCeremonyData(data); this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存','success'); this.renderCeremonyModule();
  }
,
  openCeremonyItemForm(type,id=null){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isCardOwnerGroup('ceremony')){ showToast('僅管理員／副主席以上／行政組・總主任（負責組）可編輯','error'); return; }
    const data=this.getCeremonyData();
    const arr=data[type];
    const existing=id?arr.find(x=>x.id===id):null;
    const labels={rundown:'RUNDOWN',mc:'司儀稿項目',guests:'嘉賓',seating:'座位區'};
    let html=`<input type="hidden" id="cr-f-type" value="${type}"><input type="hidden" id="cr-f-mode" value="${existing?'edit':'create'}"><input type="hidden" id="cr-f-id" value="${existing?.id||''}">`;
    if(type==='rundown') html+=`<div class="grid grid-cols-2 gap-3"><div><label class="text-[11px] font-bold">時間</label><input id="cr-f-time" value="${escapeHtml(existing?.time||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div><label class="text-[11px] font-bold">位置</label><input id="cr-f-loc" value="${escapeHtml(existing?.location||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div></div><div class="mt-3"><label class="text-[11px] font-bold">節目</label><textarea id="cr-f-program" rows="3" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.program||'')}</textarea></div>`;
    else if(type==='mc') html+=`<div class="mt-3"><label class="text-[11px] font-bold">序號</label><input id="cr-f-seq" type="number" value="${existing?.seq||1}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div class="mt-3"><label class="text-[11px] font-bold">司儀稿內容</label><textarea id="cr-f-text" rows="4" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.text||'')}</textarea></div>`;
    else if(type==='guests') html+=`<div class="mt-3"><label class="text-[11px] font-bold">姓名</label><input id="cr-f-name" value="${escapeHtml(existing?.name||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div class="mt-3"><label class="text-[11px] font-bold">職銜</label><input id="cr-f-title" value="${escapeHtml(existing?.title||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div class="mt-3"><label class="text-[11px] font-bold">備註</label><input id="cr-f-note" value="${escapeHtml(existing?.note||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>`;
    else html+=`<div class="mt-3"><label class="text-[11px] font-bold">座位區</label><input id="cr-f-zone" value="${escapeHtml(existing?.zone||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div class="mt-3"><label class="text-[11px] font-bold">安排</label><textarea id="cr-f-arr" rows="3" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.arrangement||'')}</textarea></div>`;
    document.getElementById('record-modal-title').textContent=(existing?'編輯':'新增')+labels[type];
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitCeremonyItemForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitCeremonyItemForm(){
    const type=document.getElementById('cr-f-type').value, mode=document.getElementById('cr-f-mode').value, id=document.getElementById('cr-f-id').value;
    const data=this.getCeremonyData();
    let obj={};
    if(type==='rundown') obj={time:document.getElementById('cr-f-time').value.trim(),program:document.getElementById('cr-f-program').value.trim(),location:document.getElementById('cr-f-loc').value.trim()};
    else if(type==='mc') obj={seq:parseInt(document.getElementById('cr-f-seq').value)||1,text:document.getElementById('cr-f-text').value.trim()};
    else if(type==='guests') obj={name:document.getElementById('cr-f-name').value.trim(),title:document.getElementById('cr-f-title').value.trim(),note:document.getElementById('cr-f-note').value.trim()};
    else obj={zone:document.getElementById('cr-f-zone').value.trim(),arrangement:document.getElementById('cr-f-arr').value.trim()};
    if(type==='rundown' && !obj.program){ showToast('請填寫節目','error'); return; }
    if(type==='mc' && !obj.text){ showToast('請填寫司儀稿內容','error'); return; }
    if(type==='guests' && !obj.name){ showToast('請填寫姓名','error'); return; }
    if(type==='seating' && !obj.zone){ showToast('請填寫座位區','error'); return; }
    if(mode==='edit'){ const i=data[type].findIndex(x=>x.id===id); if(i>=0) data[type][i]={...data[type][i],...obj}; }
    else data[type].push({id:(type[0]+Date.now()),...obj});
    this.saveCeremonyData(data); this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存','success'); this.renderCeremonyModule();
  }
,
  deleteCeremonyItem(type,id){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isCardOwnerGroup('ceremony')){ showToast('僅管理員／副主席以上／行政組・總主任（負責組）可刪除','error'); return; }
    if(!confirm('確定刪除？')) return;
    const data=this.getCeremonyData(); data[type]=data[type].filter(x=>x.id!==id);
    this.saveCeremonyData(data); this.renderCeremonyModule();
  }
,

  /* ===================== 典禮附件 =====================
     所有項目（RUNDOWN／司儀稿／嘉賓名單／座位表／致辭稿／優異旅團獲獎名單／嘉賓地圖）均可上傳：
     PDF（整份內嵌）／Word（mammoth 解析成文字 JSON 內嵌＋原檔下載）／圖片／Drive 連結。 */
  ceremonyFileSections(){
    return [
      {k:'rundown',l:'RUNDOWN'},
      {k:'mc',l:'司儀稿'},
      {k:'guests',l:'嘉賓名單'},
      {k:'seating',l:'座位表'},
      {k:'speech',l:'致辭稿'},
      {k:'awards',l:'優異旅團獲獎名單'},
      {k:'map',l:'嘉賓地圖'}
    ];
  }
,
  renderCeremonyFiles(){
    const list=document.getElementById('ceremony-files-list'); if(!list) return;
    const data=this.getCeremonyData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60 || this.isCardOwnerGroup('ceremony');
    const secMap=Object.assign(Object.fromEntries(this.ceremonyFileSections().map(s=>[s.k,s.l])),{exec_manual:'過往附件',legacy:'過往附件'});
    const files=[...(data.files||[])].sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||''));
    if(!files.length){ list.innerHTML='<p class="text-[11px] text-slate-400 col-span-full text-center py-2">暫無附件 — 可按「上傳附件」加入 PDF／Word／連結。</p>'; return; }
    list.innerHTML=files.map(f=>this.ceremonyFileCardHTML(f,canEdit,secMap)).join('');
  }
,
  ceremonyFileCardHTML(f,canEdit,secMap){
    const isSiteUrl=!!f.file_url&&String(f.file_url).includes('sites.google');
    const isImage=/^data:image\//.test(f.file_data||'');
    const isPdf=/^data:application\/pdf/.test(f.file_data||'');
    let prev='';
    if(f.file_url&&!isSiteUrl){ const src=String(f.file_url).includes('/preview')?f.file_url:String(f.file_url).replace('/view','/preview'); prev=`<iframe src="${escapeHtml(src)}" class="w-full h-[280px] border rounded-xl"></iframe>`; }
    if(isImage) prev+=`<img src="${f.file_data}" class="w-full max-h-[320px] object-contain border rounded-xl">`;
    if(isPdf) prev+=`<iframe src="${f.file_data}" class="w-full h-[420px] border rounded-xl" title="完整PDF內嵌預覽"></iframe>`;
    if(f.file_text) prev+=`<details class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900"><summary class="cursor-pointer font-bold"><i class="fa-solid fa-file-lines mr-1"></i>解析文字（JSON/Word 內嵌）</summary><div class="mt-2 whitespace-pre-line max-h-[220px] overflow-y-auto">${escapeHtml(f.file_text)}</div></details>`;
    return `<div class="border rounded-xl p-3 bg-white space-y-2">
      <div class="flex justify-between items-start gap-2">
        <div class="min-w-0"><span class="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full border border-indigo-200 font-bold">${escapeHtml(secMap[f.section]||f.section||'附件')}</span><b class="text-[12.5px] block mt-1">${escapeHtml(f.title||'未命名附件')}</b><div class="text-[10.5px] text-slate-500 mt-0.5">${escapeHtml(f.description||'')}</div><div class="text-[10px] text-slate-400 mt-0.5">上傳: ${escapeHtml(f.created_by||'')} | ${f.created_at?new Date(f.created_at).toLocaleString():''} | 版本: ${escapeHtml(f.version||'v1')}</div></div>
        <div class="flex flex-col gap-1 flex-shrink-0">${canEdit?`<button onclick="app.openCeremonyFileForm('${f.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteCeremonyFile('${f.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`:''}</div>
      </div>
      ${isSiteUrl?`<div class="bg-slate-50 border rounded-xl p-3 text-[11px] text-slate-600"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>此項為網頁，請按下方「開啟」查看</div>`:''}
      ${prev}
      <div class="flex gap-2 flex-wrap">${f.file_url?`<a href="${escapeHtml(f.file_url)}" target="_blank" class="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">開啟</a>`:''}${f.file_data||f.file_name?`<button onclick="app.downloadCeremonyFile('${f.id}')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold">下載</button>`:''}</div>
    </div>`;
  }
,
  openCeremonyFileForm(id=null, section=null){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isCardOwnerGroup('ceremony')){ showToast('僅管理員／副主席以上／行政組・總主任（負責組）可上傳','error'); return; }
    const data=this.getCeremonyData();
    const existing=id?(data.files||[]).find(f=>f.id===id):null;
    const isLegacySection=existing&&['exec_manual','legacy'].includes(existing.section);
    const secOpts=this.ceremonyFileSections().map(s=>`<option value="${s.k}" ${(existing?.section===s.k||(!existing&&section===s.k))?'selected':''}>${s.l}</option>`).join('')+(isLegacySection?'<option value="legacy" selected>過往附件</option>':'');
    let html=`
      <input type="hidden" id="crf-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="crf-id" value="${existing?.id||''}">
      <div class="space-y-3">
        <div><label class="text-[11px] font-bold">所屬項目</label><select id="crf-section" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${secOpts}</select></div>
        <div><label class="text-[11px] font-bold">附件標題 *</label><input id="crf-title" value="${escapeHtml(existing?.title||'')}" required placeholder="例如 RUNDOWN 官方版 / 司儀稿 Word 版" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">描述</label><textarea id="crf-desc" rows="2" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>
        <div><label class="text-[11px] font-bold">版本</label><input id="crf-version" value="${escapeHtml(existing?.version||'v1')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">上傳文件 (PDF/Word/圖片)</label><input type="file" id="crf-file" accept=".jpg,.jpeg,.png,.pdf,.docx,.doc" class="w-full text-xs mt-1"></div>
        <div><label class="text-[11px] font-bold">或貼上 Drive 連結</label><input id="crf-url" value="${escapeHtml(existing?.file_url||'')}" placeholder="https://drive.google.com/file/d/.../view" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        ${existing?.file_name?`<div class="text-[11px]">已上傳: ${escapeHtml(existing.file_name)}</div>`:''}
      </div>
    `;
    document.getElementById('record-modal-title').textContent=existing?'編輯附件':'上傳典禮附件';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=async (e)=>{ e.preventDefault(); await this.submitCeremonyFileForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async submitCeremonyFileForm(){
    const mode=document.getElementById('crf-mode').value, id=document.getElementById('crf-id').value;
    const section=document.getElementById('crf-section').value;
    const title=document.getElementById('crf-title').value.trim();
    const desc=document.getElementById('crf-desc').value.trim();
    const version=document.getElementById('crf-version').value.trim()||'v1';
    const url=document.getElementById('crf-url').value.trim();
    const fileInput=document.getElementById('crf-file');
    let file_name='', file_data='', file_url=url, file_text='';
    if(fileInput.files[0]){
      const f=fileInput.files[0];
      file_name=f.name; file_data=await fileToDataUrl(f);
      if(/\.docx?$/i.test(f.name) && typeof mammoth!=='undefined'){
        try{ const ab=await f.arrayBuffer(); const r=await mammoth.extractRawText({arrayBuffer:ab}); file_text=(r.value||'').trim(); }catch(e){ file_text=''; }
      }
      if(/\.json$/i.test(f.name)){ try{ const text=await f.text(); file_text=JSON.stringify(JSON.parse(text),null,2); }catch(e){} }
    }
    if(!title){ showToast('請填寫附件標題','error'); return; }
    const data=this.getCeremonyData();
    if(!data.files) data.files=[];
    if(mode==='edit'){
      const i=data.files.findIndex(x=>x.id===id);
      if(i>=0) data.files[i]={...data.files[i], section, title, description:desc, version, file_name:file_name||data.files[i].file_name, file_data:file_data||data.files[i].file_data, file_url:file_url||data.files[i].file_url, file_text:file_text||data.files[i].file_text||'', updated_at:new Date().toISOString()};
    }else{
      const replacement=data.files.findIndex(f=>f.section===section && String(f.title||'').trim().toLowerCase()===title.toLowerCase());
      const record={id:replacement>=0?data.files[replacement].id:'crf_'+Date.now(), section, title, description:desc, version, file_name, file_data, file_url, file_text, created_by:this.currentUser?.name||'', created_at:new Date().toISOString(), updated_at:replacement>=0?new Date().toISOString():''};
      if(replacement>=0) data.files[replacement]=record; else data.files.push(record);
    }
    this.saveCeremonyData(data); this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新附件':'已上傳附件','success'); this.renderCeremonyModule();
  }
,
  deleteCeremonyFile(id){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isCardOwnerGroup('ceremony')){ showToast('僅管理員／副主席以上／行政組・總主任（負責組）可刪除','error'); return; }
    if(!confirm('確定刪除此附件？')) return;
    const data=this.getCeremonyData(); data.files=(data.files||[]).filter(f=>f.id!==id);
    this.saveCeremonyData(data); this.renderCeremonyModule();
  }
,
  downloadCeremonyFile(id){
    const data=this.getCeremonyData(); const f=(data.files||[]).find(x=>x.id===id);
    if(!f){ showToast('找不到檔案','error'); return; }
    if(f.file_url){ window.open(f.file_url,'_blank'); return; }
    if(f.file_data) downloadDataUrl(f.file_name||'download', f.file_data);
    else showToast('無檔案','warning');
  }
,

  /* ===================== 優異旅團獲獎名單（公開） ===================== */
  getAwardsData(){
    const key=LS.awards(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local) return local;
    if(!this.isDemoEvent()) return {categories:[]}; // 真實活動：預留版位
    return {categories:[
      {id:'awc_1',name:'升旗比賽',items:[
        {id:'a1',place:'港島第16旅(E隊)',section:'冠軍'},
        {id:'a2',place:'港島第16旅(A隊)',section:'亞軍'},
        {id:'a3',place:'港島第17旅(A隊)',section:'季軍'},
        {id:'a4',place:'港島第16旅(D隊)',section:'最佳外觀隊伍獎'}
      ]},
      {id:'awc_2',name:'步操比賽（初級組）',items:[
        {id:'a5',place:'港島第1187旅',section:'冠軍'},
        {id:'a6',place:'港島第139旅(B隊)',section:'亞軍'},
        {id:'a7',place:'港島第139旅(A隊)',section:'最佳外觀隊伍獎'}
      ]},
      {id:'awc_3',name:'步操比賽（選拔組）',items:[
        {id:'a8',place:'筲箕灣區',section:'冠軍'},
        {id:'a9',place:'港島第16旅',section:'亞軍'},
        {id:'a10',place:'港島第15旅',section:'季軍'},
        {id:'a11',place:'港島第15旅',section:'最佳外觀隊伍獎'},
        {id:'a12',place:'沈冠傑【筲箕灣區】',section:'最佳司令員獎'}
      ]},
      {id:'awc_4',name:'隊列比賽',items:[
        {id:'a13',place:'港島第221旅',section:'冠軍（同時獲最佳外觀隊伍獎及最佳司令員獎 錢宏）'},
        {id:'a14',place:'港島第3海童軍旅A隊',section:'亞軍'}
      ]},
      {id:'awc_5',name:'區際錦標',items:[
        {id:'a15',place:'港島西區',section:'區際錦標（港島西區區總監 秦伯強先生代表）'}
      ]}
    ]};
  }
,
  saveAwardsData(data){ localStorage.setItem(LS.awards(this.currentEvent?.event_id||'isd_2026'), JSON.stringify(data)); }
,
  meritAwardReplyStatusHTML(){
    const ceremony=this.getCeremonyData();
    const master=Array.isArray(ceremony.meritRoster)?ceremony.meritRoster:[];
    const replies=Array.isArray(ceremony.responses)?ceremony.responses:[];
    const submitted=replies.filter(r=>r.attendance==='出席'||r.attendance==='不出席');
    const attended=submitted.filter(r=>r.attendance==='出席').length;
    const notAttending=submitted.filter(r=>r.attendance==='不出席').length;
    const pending=Math.max(0,master.length-submitted.length);
    if(!master.length&&!replies.length) return '';
    return `<div class="bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-[11px] leading-relaxed text-sky-900"><b><i class="fa-solid fa-file-circle-check mr-1"></i>優異旅團回條：</b>正式名單 ${master.length} 個旅團　｜　已回覆出席 ${attended}　｜　不出席 ${notAttending}${master.length?`　｜　待回覆 ${pending}`:''}</div>`;
  },

  renderAwardsModule(c){
    const container=c||this._awardsContainer||document.getElementById('module-content');
    this._awardsContainer=container;
    const data=this.getAwardsData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    const canTick=!!this.currentUser&&(canEdit||this.isCardOwnerGroup('ceremony'));
    data.categories.forEach(cat=>cat.items=(cat.items||[]).slice().sort((a,b)=>String(a.place||'').localeCompare(String(b.place||''),'zh-Hant')));
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-[11px] leading-relaxed text-yellow-900">
          <b>🏆 優異旅團獲獎名單：</b>優異旅團、步操比賽及支部／領袖獎勵名單，公眾可查閱。管理員／副主席以上可編輯。<br>
          <span class="text-[10px]">v14 起「支部獎勵」及「領袖獎勵」另有<b>專屬分頁（含點名 TICK＋Excel／Word／PDF 上傳）</b>：
          <button onclick="app.switchCeremonyTab('section_award')" class="underline font-bold">→ 支部獎勵名單</button>　
          <button onclick="app.switchCeremonyTab('leader_award')" class="underline font-bold">→ 領袖獎勵名單</button></span>
        </div>

        <div class="bg-sky-50 border border-sky-200 rounded-xl p-3">${this.rosterPanelHTML('merit_award',{scope:'merit'})}</div>

        <div class="space-y-3">
          <div class="flex gap-2 flex-wrap items-center">
            <b class="text-[13px] mr-auto"><i class="fa-solid fa-medal text-yellow-600 mr-1"></i>步操比賽及其他獲獎結果</b>
            ${canEdit?`<button onclick="app.openCeremonyFileForm(null,'awards')" class="bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳獲獎結果附件</button>`:''}
            <button onclick="app.exportAwards()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>匯出結果</button>
            ${canEdit?`<label class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"><i class="fa-solid fa-file-excel mr-1"></i>上傳 Excel 更新結果<input type="file" accept=".xlsx,.xls,.xlsm,.csv" class="hidden" onchange="app.handleCeremonyAwardsExcelUpload(this.files[0]);this.value=''"></label>`:''}
          </div>
          <div class="space-y-4">${data.categories.map(cat=>`
            <div class="bg-white border rounded-xl p-4">
              <div class="flex justify-between items-center mb-3"><h4 class="font-bold text-[13px] flex items-center gap-2"><i class="fa-solid fa-medal text-yellow-600"></i>${escapeHtml(cat.name)}</h4>${canEdit?`<div class="flex gap-1"><button onclick="app.openAwardCategoryForm('${cat.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteAwardCategory('${cat.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></div>`:''}</div>
              <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-center">已頒發</th><th class="px-2 py-1 text-left">單位</th><th class="px-2 py-1 text-left">獎項／類別</th>${canEdit?'<th class="px-2 py-1 text-right">操作</th>':''}</tr></thead><tbody class="divide-y">${cat.items.map(it=>`<tr><td class="px-2 py-1 text-center" data-label="已頒發"><input type="checkbox" ${it.checked?'checked':''} onchange="app.toggleAwardTick('${cat.id}','${it.id}',this.checked)" ${canTick?'':'disabled'} class="w-4 h-4 accent-emerald-600"></td><td class="px-2 py-1 font-medium" data-label="單位">${escapeHtml(it.place)}</td><td class="px-2 py-1" data-label="獎項／類別">${escapeHtml(it.section)}</td>${canEdit?`<td class="px-2 py-1 text-right" data-label="操作"><button onclick="app.openAwardItemForm('${cat.id}','${it.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button> <button onclick="app.deleteAwardItem('${cat.id}','${it.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></td>`:''}</tr>`).join('')||'<tr><td colspan="3" class="px-2 py-4 text-center text-slate-400">暫無獲獎結果</td></tr>'}</tbody></table></div>
            </div>`).join('')||'<p class="text-xs text-slate-400 py-4 text-center">暫無步操比賽或其他獲獎結果</p>'}</div>
        </div>
      </div>`;
  }
,
  // 保留舊函式名稱，讓既有連結仍可把優異旅團獲獎名單排序／點名，但全部走新的防錯流程。
  toggleCeremonySortDirection(){ this.rosterToggleSortDir('merit_award'); },
  sortCeremonyResponses(sort){ this.rosterSetSort('merit_award',sort||'area'); },
  toggleCeremonyResponseTick(id,checked){
    const rows=this.rosterRows('merit_award');
    let row=rows.find(r=>String(r.id)===String(id));
    if(!row&&String(id||'').startsWith('master_')) row=rows[Number(String(id).slice(7))]||null;
    if(!row){ showToast('找不到優異旅團獲獎名單項目','error'); return; }
    this.rosterTick('merit_award',encodeURIComponent(row._key),checked);
  },
  confirmCeremonyArea(area){ this.rosterConfirmGroup('merit_award',encodeURIComponent(String(area||''))); },
  openAwardCategoryForm(id=null){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isCardOwnerGroup('ceremony')){ showToast('僅管理員／副主席以上／行政組・總主任（負責組）可編輯','error'); return; }
    const data=this.getAwardsData();
    const existing=id?data.categories.find(c=>c.id===id):null;
    let html=`<input type="hidden" id="aw-mode" value="${existing?'edit':'create'}"><input type="hidden" id="aw-id" value="${existing?.id||''}"><div><label class="text-[11px] font-bold">獎項類別名稱</label><input id="aw-name" value="${escapeHtml(existing?.name||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯獎項類別':'新增獎項類別';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitAwardCategoryForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitAwardCategoryForm(){
    const mode=document.getElementById('aw-mode').value, id=document.getElementById('aw-id').value;
    const name=document.getElementById('aw-name').value.trim();
    if(!name){ showToast('請填寫類別名稱','error'); return; }
    const data=this.getAwardsData();
    if(mode==='edit'){ const i=data.categories.findIndex(c=>c.id===id); if(i>=0) data.categories[i]={...data.categories[i],name}; }
    else data.categories.push({id:'awc_'+Date.now(),name,items:[]});
    this.saveAwardsData(data); this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存','success'); this.renderAwardsModule();
  }
,
  deleteAwardCategory(id){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isCardOwnerGroup('ceremony')){ showToast('僅管理員／副主席以上／行政組・總主任（負責組）可刪除','error'); return; }
    if(!confirm('確定刪除整個獎項類別？')) return;
    const data=this.getAwardsData(); data.categories=data.categories.filter(c=>c.id!==id);
    this.saveAwardsData(data); this.renderAwardsModule();
  }
,
  openAwardItemForm(catId,id=null){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isCardOwnerGroup('ceremony')){ showToast('僅管理員／副主席以上／行政組・總主任（負責組）可編輯','error'); return; }
    const data=this.getAwardsData();
    const cat=data.categories.find(c=>c.id===catId); if(!cat) return;
    const existing=id?cat.items.find(it=>it.id===id):null;
    let html=`<input type="hidden" id="aw-cat" value="${catId}"><input type="hidden" id="aw-i-mode" value="${existing?'edit':'create'}"><input type="hidden" id="aw-i-id" value="${existing?.id||''}"><div><label class="text-[11px] font-bold">單位</label><input id="aw-place" value="${escapeHtml(existing?.place||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div class="mt-3"><label class="text-[11px] font-bold">獎項/類別</label><input id="aw-section" value="${escapeHtml(existing?.section||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯獲獎單位':'新增獲獎單位';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitAwardItemForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitAwardItemForm(){
    const catId=document.getElementById('aw-cat').value, mode=document.getElementById('aw-i-mode').value, id=document.getElementById('aw-i-id').value;
    const place=document.getElementById('aw-place').value.trim(), section=document.getElementById('aw-section').value.trim();
    if(!place){ showToast('請填寫單位','error'); return; }
    const data=this.getAwardsData();
    const cat=data.categories.find(c=>c.id===catId); if(!cat) return;
    if(mode==='edit'){ const i=cat.items.findIndex(it=>it.id===id); if(i>=0) cat.items[i]={...cat.items[i],place,section}; }
    else cat.items.push({id:'awi_'+Date.now(),place,section});
    this.saveAwardsData(data); this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存','success'); this.renderAwardsModule();
  }
,
  deleteAwardItem(catId,id){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isCardOwnerGroup('ceremony')){ showToast('僅管理員／副主席以上／行政組・總主任（負責組）可刪除','error'); return; }
    if(!confirm('確定刪除？')) return;
    const data=this.getAwardsData();
    const cat=data.categories.find(c=>c.id===catId); if(!cat) return;
    cat.items=cat.items.filter(it=>it.id!==id);
    this.saveAwardsData(data); this.renderAwardsModule();
  }
,
  openCeremonyApplicationForm(){
    const d=this.getCeremonyData(); const existing=d.responses||[];
    const html=`<div class="space-y-3"><div><label class="text-xs font-bold">出席優異旅團嘉許儀式 *</label><select id="ca-attend" class="w-full border rounded-xl px-3 py-2 mt-1"><option value="出席">派出一名代表出席嘉許儀式</option><option value="不出席">無暇出席</option></select></div><div><label class="text-xs font-bold">所屬區會 *</label><select id="ca-area" class="w-full border rounded-xl px-3 py-2 mt-1"><option>CHW 柴灣區</option><option>HKN 港島北區</option><option>HKS 港島南區</option><option>HKW 港島西區</option><option>SKW 筲箕灣區</option><option>VIC 維多利亞城區</option><option>WCH 灣仔區</option></select></div><div><label class="text-xs font-bold">童軍旅（只須填寫旅號，例如 157） *</label><input id="ca-unit" inputmode="numeric" required class="w-full border rounded-xl px-3 py-2 mt-1"></div><div><label class="text-xs font-bold">所屬支部 *</label><input id="ca-section" required class="w-full border rounded-xl px-3 py-2 mt-1"></div><p class="text-[11px] text-slate-500">截止日期：2026年9月21日；報到時間：上午8時30分。此為 APP 內建回條，不會跳轉 Google Form。</p></div>`;
    document.getElementById('record-modal-title').textContent='優異旅團嘉許儀式回條（APP內填寫）'; document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form'); form.onsubmit=(e)=>{e.preventDefault(); const unit=document.getElementById('ca-unit').value.trim(); if(!/^[0-9]+$/.test(unit)){showToast('旅號只可填寫數字','error');return;} const x={id:'ca_'+Date.now(),attendance:document.getElementById('ca-attend').value,area:document.getElementById('ca-area').value,unit,section:document.getElementById('ca-section').value.trim(),created_at:new Date().toISOString(),status:'待核對'}; if(!x.section){showToast('請填寫所屬支部','error');return;} d.responses=[...existing,x]; this.saveCeremonyData(d); this.closeModal('modal-record'); showToast('回條已提交','success');}; document.getElementById('modal-record').classList.remove('hidden');
  },
  // 舊按鈕入口保留作相容；現已統一使用優異旅團獲獎名單的 Excel／Word／PDF 匯入預覽流程。
  async importMeritFullList(file){ return this.rosterImportFile('merit_award',file); },
  toggleAwardTick(catId,id,checked){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60&&!this.isCardOwnerGroup('ceremony')){showToast('你沒有 TICK 權限','error');return;}
    const d=this.getAwardsData(), c=d.categories.find(x=>x.id===catId), i=c?.items.find(x=>x.id===id); if(!i) return;
    i.checked=!!checked; this.saveAwardsData(d);
  },
  async handleCeremonyAwardsExcelUpload(file){
    if(!file||typeof XLSX==='undefined'){showToast('請選擇 Excel 檔案並保持網絡連線','error');return;}
    try{ const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}), rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
      const d={categories:[]}, map=new Map(); rows.forEach((r,n)=>{const cat=String(r['類別']||r['獎項類別']||r['Category']||'步操比賽及其他獲獎結果').trim()||'步操比賽及其他獲獎結果'; const place=String(r['旅團']||r['單位']||r['團名']||r['Unit']||'').trim(); if(!place)return; if(!map.has(cat)){const c={id:'awc_'+Date.now()+'_'+n,name:cat,items:[]};map.set(cat,c);d.categories.push(c);} map.get(cat).items.push({id:'awi_'+Date.now()+'_'+n,place,section:String(r['獎項']||r['名次']||r['Award']||'').trim(),checked:false});});
      if(!d.categories.length){showToast('Excel 找不到旅團／單位欄位','error');return;} this.saveAwardsData(d); this.renderAwardsModule(); showToast('已用 Excel 更新獲獎結果','success');
    }catch(e){showToast('Excel 讀取失敗：'+e.message,'error');}
  },
  exportAwards(){
    const data=this.getAwardsData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`award_results_${todayISO()}.json`; a.click();
  }
,
});
