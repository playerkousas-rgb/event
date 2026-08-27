/* 36-crisis.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== 危機處理 (籌委) - 依上年手冊細分 ===================== */
  getCrisisData(){
    const key=LS.crisis(this.currentEvent?.event_id||'isd_2026');
    const local=JSON.parse(localStorage.getItem(key)||'null');
    const stripMockAcc=arr=>{
      if(!Array.isArray(arr)) return this.isDemoEvent()?arr:[];
      if(this.isDemoEvent()) return arr;
      return arr.filter(a=>a && a.victim_name!=='陳小明' && a.id!=='acc_1');
    };
    const defaultManuals=[
      {
        id:'cm_1',
        title:'港島童軍繽紛日危機處理計劃（組織、職責及運作）手冊',
        version:'2026 年版（依 2025 手冊修訂）',
        category:'危機手冊',
        summary:'涵蓋危機定義、危機應變小組職責、惡劣天氣與空氣污染、傳染病、嚴重意外、事故撤離程序、急救及保險安排。',
        description:'港島童軍繽紛日危機處理計劃（組織、職責及運作）2026 年修訂版。\n\n主要章節：\n一、危機定義與分級標準\n二、危機處理小組目的、架構與職責\n三、小組運作時間及指揮中心地點\n四、惡劣天氣及空氣污染處理機制\n五、傳染病應變程序\n六、嚴重意外事件處理\n七、嚴重事故及取消活動程序\n八、急救站駐守（聖約翰救傷隊）與醫療送院安排\n九、童軍活動綜合保險保障範圍\n十、緊急聯絡通訊錄',
        file_name:'isd_crisis_management_manual_2026.pdf',
        file_url:'',
        file_data:'',
        uploaded_by:'危機處理主任（何家騏） / 秘書處',
        date:'2026-08-20'
      }
    ];
    // v8.2：localStorage 只保留使用者產生的 accidents(意外報告)，
    // team/contacts/docs/manuals 一律以 data/isd_2026.json 為單一事實來源，
    // 這樣秘書處在 JSON 更新的排序／人員異動可以立即反映到 App，不會被舊 local 卡住。
    const rawJson=this.eventData['crisis']||null;
    const jsonHasCore=rawJson && (Array.isArray(rawJson.team)||Array.isArray(rawJson.docs)||Array.isArray(rawJson.contacts)||Array.isArray(rawJson.manuals));
    if(local && jsonHasCore){
      // 只保留 accidents，其他清空以走 JSON path
      const kept={ accidents: Array.isArray(local.accidents)?stripMockAcc(local.accidents):[] };
      // 若 user 曾經編輯 team/contacts/docs 並打上 _userEdited 標記，才保留其對應項目
      if(Array.isArray(local.team) && local.team.some(x=>x&&x._userEdited)) kept._userTeam=local.team.filter(x=>x&&x._userEdited);
      if(Array.isArray(local.contacts) && local.contacts.some(x=>x&&x._userEdited)) kept._userContacts=local.contacts.filter(x=>x&&x._userEdited);
      if(Array.isArray(local.docs) && local.docs.some(x=>x&&x._userEdited)) kept._userDocs=local.docs.filter(x=>x&&x._userEdited);
      // 覆寫 localStorage 為精簡版
      localStorage.setItem(key, JSON.stringify(kept));
      // 讓下面 JSON 分支處理（把 accidents 合併回去）
      this._crisisLocalKept=kept;
    } else if(local && (local.team?.length||local.contacts?.length||local.docs?.length||local.manuals?.length||local.accidents?.length)){
      if(!Array.isArray(local.manuals)) local.manuals=defaultManuals;
      if(!Array.isArray(local.accidents)) local.accidents=[{
        id:'acc_1',
        report_no:'ISD2026-ACC-001',
        report_date:'2026-10-04',
        region:'港島地域',
        district:'柴灣區',
        group_unit:'港島第6旅',
        event_name:'港島童軍繽紛日 2026',
        event_date:'2026-10-04',
        event_time:'14:30',
        event_location:'香港黃竹坑香港警察學院 (大操場南側)',
        leader_name:'張佳良',
        leader_role:'副主席（會操及典禮）',
        leader_phone:'94222222',
        victim_name:'陳小明',
        victim_name_en:'Chan Siu Ming',
        victim_gender:'男',
        victim_age:'12',
        victim_dob:'2014-03-15',
        victim_hkid:'Y123456(7)',
        victim_member_type:'童軍 (Scout)',
        victim_group_no:'港島第6旅',
        victim_address:'香港柴灣柴灣道233號新翠花園4座12樓B室',
        victim_phone:'2890 1234 / 9123 4567',
        parent_name:'陳大文 (父親)',
        parent_phone:'9876 5432',
        acc_datetime:'2026-10-04 14:15',
        acc_location:'大操場中央草坪 (近步操檢閱台)',
        injury_nature:'擦傷及右腳踝輕微扭傷 (Sprain of right ankle & abrasions)',
        injury_part:'右腳踝、右膝及雙手手掌',
        acc_description:'參加者於大操場進行步操彩排進場時，不慎失足跌倒於草坪邊緣，右腳踝扭傷並擦傷右膝及雙手手掌。',
        weather_condition:'晴天，氣溫約 29°C，地面乾燥',
        first_aid_given:'聖約翰救傷隊當值隊員即時於現場救傷站進行急救，包括消毒清潔傷口、包紮擦傷部位、為右腳踝進行冰敷及彈性繃帶固定加壓。',
        first_aid_provider:'聖約翰救傷隊 救護員 李先生',
        ambulance_called:'否 (傷者由領袖陪同乘私家車前往瑪麗醫院進一步檢查)',
        ambulance_call_time:'',
        ambulance_arrival_time:'',
        hospital_name:'瑪麗醫院 (急症室)',
        escort_leader:'文幹皓（總主任 運作） / 9234 5678',
        diagnosis_result:'經急症室醫生照 X 光檢查，證實無骨折，屬輕度腳踝韌帶扭傷，獲發消炎止痛藥物及彈性繃帶，當日已出院回家休息。',
        parent_notified:'是 (已即時致電傷者父親陳大文先生，家長於 15:30 抵達醫院會合)',
        region_notified:'是 (已向活動主席朱家聰及秘書處通報備案)',
        witness1_name:'梁文澧 (總主任 會操)',
        witness1_phone:'9345 6789',
        witness1_address:'港島地域總部',
        witness2_name:'黃志樂 (會操顧問)',
        witness2_phone:'9456 7890',
        witness2_address:'港島地域總部',
        reporter_name:'何家騏',
        reporter_role:'危機處理主任 / 顧問',
        reporter_date:'2026-10-04',
        reporter_signature:'何家騏',
        claim_status:'已備案 (香港童軍總會活動綜合保險備案編號：ISD2026-INS-042)',
        remarks:'傷者已平安返家，領袖於活動翌日進行電話跟進，康復情況良好。'
      }];
      if(local) local.accidents=stripMockAcc(local.accidents);
      return local;
    }
    // 內置資料：2026 危機處理計劃（以 2025 手冊為藍本，來自 data/isd_2026.json）
    const raw=this.eventData['crisis']||null;
    if(raw && (Array.isArray(raw.team)||Array.isArray(raw.docs)||Array.isArray(raw.contacts)||Array.isArray(raw.manuals))){
      const norm={team:[],contacts:[],docs:[],manuals:[]};
      (raw.team||[]).forEach((m,i)=>{ norm.team.push({id:m.id||'ct_'+i,role:m.role||m.role_title||'',name:m.name||'',phone:m.phone||m.contact||'',match:m.match||[],auto:m.auto?1:0}); });
      (raw.contacts||[]).forEach((c,i)=>{ norm.contacts.push({id:c.id||'cc_'+i,org:c.org||'',name:c.name||'',phone:c.phone||''}); });
      (raw.docs||[]).forEach((d,i)=>{ norm.docs.push({id:d.id||'cr_'+i,title:d.title||'',category:d.category||'其他',description:d.description||''}); });
      if(Array.isArray(raw.manuals)&&raw.manuals.length){
        norm.manuals=raw.manuals.map((m,i)=>({id:m.id||'cm_'+i,title:m.title||'',version:m.version||'2026 年版',category:m.category||'危機手冊',summary:m.summary||'',description:m.description||'',file_name:m.file_name||'',file_data:m.file_data||'',file_url:m.file_url||'',uploaded_by:m.uploaded_by||'',date:m.date||''}));
      } else {
        norm.manuals=defaultManuals;
      }
      norm.accidents = Array.isArray(raw.accidents) && raw.accidents.length ? raw.accidents : [{
        id:'acc_1',
        report_no:'ISD2026-ACC-001',
        report_date:'2026-10-04',
        region:'港島地域',
        district:'柴灣區',
        group_unit:'港島第6旅',
        event_name:'港島童軍繽紛日 2026',
        event_date:'2026-10-04',
        event_time:'14:30',
        event_location:'香港黃竹坑香港警察學院 (大操場南側)',
        leader_name:'張佳良',
        leader_role:'副主席（會操及典禮）',
        leader_phone:'94222222',
        victim_name:'陳小明',
        victim_name_en:'Chan Siu Ming',
        victim_gender:'男',
        victim_age:'12',
        victim_dob:'2014-03-15',
        victim_hkid:'Y123456(7)',
        victim_member_type:'童軍 (Scout)',
        victim_group_no:'港島第6旅',
        victim_address:'香港柴灣柴灣道233號新翠花園4座12樓B室',
        victim_phone:'2890 1234 / 9123 4567',
        parent_name:'陳大文 (父親)',
        parent_phone:'9876 5432',
        acc_datetime:'2026-10-04 14:15',
        acc_location:'大操場中央草坪 (近步操檢閱台)',
        injury_nature:'擦傷及右腳踝輕微扭傷 (Sprain of right ankle & abrasions)',
        injury_part:'右腳踝、右膝及雙手手掌',
        acc_description:'參加者於大操場進行步操彩排進場時，不慎失足跌倒於草坪邊緣，右腳踝扭傷並擦傷右膝及雙手手掌。',
        weather_condition:'晴天，氣溫約 29°C，地面乾燥',
        first_aid_given:'聖約翰救傷隊當值隊員即時於現場救傷站進行急救，包括消毒清潔傷口、包紮擦傷部位、為右腳踝進行冰敷及彈性繃帶固定加壓。',
        first_aid_provider:'聖約翰救傷隊 救護員 李先生',
        ambulance_called:'否 (傷者由領袖陪同乘私家車前往瑪麗醫院進一步檢查)',
        ambulance_call_time:'',
        ambulance_arrival_time:'',
        hospital_name:'瑪麗醫院 (急症室)',
        escort_leader:'文幹皓（總主任 運作） / 9234 5678',
        diagnosis_result:'經急症室醫生照 X 光檢查，證實無骨折，屬輕度腳踝韌帶扭傷，獲發消炎止痛藥物及彈性繃帶，當日已出院回家休息。',
        parent_notified:'是 (已即時致電傷者父親陳大文先生，家長於 15:30 抵達醫院會合)',
        region_notified:'是 (已向活動主席朱家聰及秘書處通報備案)',
        witness1_name:'梁文澧 (總主任 會操)',
        witness1_phone:'9345 6789',
        witness1_address:'港島地域總部',
        witness2_name:'黃志樂 (會操顧問)',
        witness2_phone:'9456 7890',
        witness2_address:'港島地域總部',
        reporter_name:'何家騏',
        reporter_role:'危機處理主任 / 顧問',
        reporter_date:'2026-10-04',
        reporter_signature:'何家騏',
        claim_status:'已備案 (香港童軍總會活動綜合保險備案編號：ISD2026-INS-042)',
        remarks:'傷者已平安返家，領袖於活動翌日進行電話跟進，康復情況良好。'
      }];
      norm.accidents=stripMockAcc(norm.accidents);
      // v8.2：合併使用者保存的 accidents / 手動編輯項
      const kept=this._crisisLocalKept;
      if(kept){
        if(Array.isArray(kept.accidents)&&kept.accidents.length) norm.accidents=stripMockAcc(kept.accidents);
        if(Array.isArray(kept._userTeam)){ kept._userTeam.forEach(u=>{ const i=norm.team.findIndex(x=>x.id===u.id); if(i>=0) norm.team[i]={...norm.team[i],...u}; else norm.team.push(u); }); }
        if(Array.isArray(kept._userContacts)){ kept._userContacts.forEach(u=>{ const i=norm.contacts.findIndex(x=>x.id===u.id); if(i>=0) norm.contacts[i]={...norm.contacts[i],...u}; else norm.contacts.push(u); }); }
        if(Array.isArray(kept._userDocs)){ kept._userDocs.forEach(u=>{ const i=norm.docs.findIndex(x=>x.id===u.id); if(i>=0) norm.docs[i]={...norm.docs[i],...u}; else norm.docs.push(u); }); }
      }
      return norm;
    }
    if(!this.isDemoEvent()) return {team:[],contacts:[],docs:[],manuals:defaultManuals,accidents:[]};
    return {
      team:[
        {id:'ct_preset_1',role:'活動主席（危機處理小組主席）',match:['主席'],auto:1},
        {id:'ct_preset_2',role:'執行副主席（行政）',match:['執行副主席','行政'],auto:1},
        {id:'ct_preset_3',role:'副主席（會操及典禮）',match:['會操及典禮'],auto:1},
        {id:'ct_preset_4',role:'副主席（主題節目）',match:['主題節目'],auto:1},
        {id:'ct_preset_5',role:'副主席（品牌推廣）',match:['品牌推廣'],auto:1},
        {id:'ct_preset_6',role:'副主席（協調）',match:['協調'],auto:1},
        {id:'ct_preset_7',role:'副主席（行政）',match:['行政'],auto:1},
        {id:'ct_preset_8',role:'危機處理主任',match:['危機'],auto:1},
        {id:'ct_preset_9',role:'秘書處主管（小組秘書）',match:['秘書','執行幹事'],auto:1}
      ],
      contacts:[
        {org:'香港天文台',name:'一般查詢／天氣電話',phone:'2926 8200 / 187 8200'},
        {org:'衞生防護中心',name:'',phone:'2125 1111'},
        {org:'衞生署',name:'',phone:'2961 8989'},
        {org:'香港仔分區警署',name:'',phone:'3661 1614'},
        {org:'瑪麗醫院',name:'',phone:'2255 3838'}
      ],
      docs:[
        {id:'cr_1',title:'危機的定義',category:'定義',description:'在活動期間出現以下事故而影響或將會影響參加者及（或）整個活動的安全：\n1. 惡劣天氣及空氣污染情況；\n2. 致命性傳染病；\n3. 嚴重意外事件（牽涉人命或眾多傷者）；\n4. 嚴重事故（對全體參加者有嚴重影響或引致活動未能正常運作）。'},
        {id:'cr_2',title:'危機處理小組 - 目的及職責',category:'小組',description:'在活動期間出現事故時，危機處理小組協助活動主席迅速決定及指揮各單位處理，確保活動安全。\n職責：1.收集資料 2.分析及評估影響 3.依既定方法處理 4.向活動主席匯報及建議 5.指揮及協調各單位行動。\n對外發言：活動主席為唯一對外發言人，未得同意不得向傳媒透露事故經過。'},
        {id:'cr_3',title:'危機處理小組 - 運作時間及地點',category:'小組',description:'當上述任何事故出現，小組即時開始運作直至解決。成員須盡快齊集並全期等候指令。\n活動前：港島地域總部；活動中：香港警察學院大會指揮中心。'},
        {id:'cr_4',title:'惡劣天氣及空氣污染 - 處理',category:'天氣',description:'活動前三小時內及活動期間：\n• 一號戒備／山泥傾瀉／霜凍／寒冷／酷熱警告：如常進行\n• 雷暴警告（活動所在地區）：延期或取消\n• 三號強風或更高信號：延期或取消\n• 黃色、紅色或黑色暴雨警告：延期或取消\n• 空氣質素健康指數7或以上：勸喻敏感人士不要參加\n• 空氣質素健康指數10以上（嚴重）：延期或取消'},
        {id:'cr_5',title:'傳染病 - 處理',category:'傳染病',description:'凡參加者感覺不適（如發燒），即時送到救傷站由救護人員探熱登記。救護人員判斷：(一)繼續活動／(二)停止返家／(三)轉送醫院，並通知活動副主席（協調）及活動主席。\n懷疑傳染病個案：患者小隊提早停止活動、供應口罩及洗手設施；活動主席啟動小組處理。'},
        {id:'cr_6',title:'嚴重意外事件 - 處理',category:'意外',description:'1. 立即將傷者送往救護站，若不能移動即通知救護站派員救援；\n2. 即時通知活動主席；\n3. 如牽涉人命或眾多傷者，活動主席啟動小組，通知傷者領袖／家長及港島地域總監；\n4. 如傷者送院，有關副主席到醫院協助。'},
        {id:'cr_7',title:'嚴重事故 - 處理',category:'事故',description:'各副主席發現可能對全體參加者有嚴重影響的事故，即通知活動主席。活動主席按嚴重性啟動小組，評估影響、制訂方案、發出指令指揮各單位執行。'},
        {id:'cr_8',title:'取消活動程序',category:'取消',description:'1. 取消指令由活動主席發出並即時生效；\n2. 知會地域總監、副地域總監及執行幹事；\n3. 以廣播、電話、電郵、網頁、短訊通知各參加者、工作人員和嘉賓；\n4. 未能通知者，委員仍須前往集合點通知及照顧；\n5. 如需撤離，副主席（協調）會同秩序及交通主任指示安全離去；\n6. 秘書處返回地域辦事處應付查詢。'},
        {id:'cr_9',title:'保險安排',category:'保險',description:'香港童軍總會已為童軍活動購買保險（涵蓋已登記參加者及工作人員）。'},
        {id:'cr_10',title:'急救安排 (聖約翰救傷隊)',category:'急救',description:'活動場地有聖約翰救傷隊駐守（救傷站），行政組已提交急救服務申請。凡參加者感覺不適，即時送到救傷站處理。'},
        {id:'cr_11',title:'其他大會準備措施',category:'其他',description:'保險：香港童軍總會已購買保險；急救：場地有聖約翰救傷隊駐守；衞生：設洗手間，爆發傳染病時準備洗手設施及口罩；場地：已視察及評估安全；聯絡：秘書處及各組備有負責人名單及電話。'}
      ],
      manuals: defaultManuals,
      accidents: [{
        id:'acc_1',
        report_no:'ISD2026-ACC-001',
        report_date:'2026-10-04',
        region:'港島地域',
        district:'柴灣區',
        group_unit:'港島第6旅',
        event_name:'港島童軍繽紛日 2026',
        event_date:'2026-10-04',
        event_time:'14:30',
        event_location:'香港黃竹坑香港警察學院 (大操場南側)',
        leader_name:'張佳良',
        leader_role:'副主席（會操及典禮）',
        leader_phone:'94222222',
        victim_name:'陳小明',
        victim_name_en:'Chan Siu Ming',
        victim_gender:'男',
        victim_age:'12',
        victim_dob:'2014-03-15',
        victim_hkid:'Y123456(7)',
        victim_member_type:'童軍 (Scout)',
        victim_group_no:'港島第6旅',
        victim_address:'香港柴灣柴灣道233號新翠花園4座12樓B室',
        victim_phone:'2890 1234 / 9123 4567',
        parent_name:'陳大文 (父親)',
        parent_phone:'9876 5432',
        acc_datetime:'2026-10-04 14:15',
        acc_location:'大操場中央草坪 (近步操檢閱台)',
        injury_nature:'擦傷及右腳踝輕微扭傷 (Sprain of right ankle & abrasions)',
        injury_part:'右腳踝、右膝及雙手手掌',
        acc_description:'參加者於大操場進行步操彩排進場時，不慎失足跌倒於草坪邊緣，右腳踝扭傷並擦傷右膝及雙手手掌。',
        weather_condition:'晴天，氣溫約 29°C，地面乾燥',
        first_aid_given:'聖約翰救傷隊當值隊員即時於現場救傷站進行急救，包括消毒清潔傷口、包紮擦傷部位、為右腳踝進行冰敷及彈性繃帶固定加壓。',
        first_aid_provider:'聖約翰救傷隊 救護員 李先生',
        ambulance_called:'否 (傷者由領袖陪同乘私家車前往瑪麗醫院進一步檢查)',
        ambulance_call_time:'',
        ambulance_arrival_time:'',
        hospital_name:'瑪麗醫院 (急症室)',
        escort_leader:'文幹皓（總主任 運作） / 9234 5678',
        diagnosis_result:'經急症室醫生照 X 光檢查，證實無骨折，屬輕度腳踝韌帶扭傷，獲發消炎止痛藥物及彈性繃帶，當日已出院回家休息。',
        parent_notified:'是 (已即時致電傷者父親陳大文先生，家長於 15:30 抵達醫院會合)',
        region_notified:'是 (已向活動主席朱家聰及秘書處通報備案)',
        witness1_name:'梁文澧 (總主任 會操)',
        witness1_phone:'9345 6789',
        witness1_address:'港島地域總部',
        witness2_name:'黃志樂 (會操顧問)',
        witness2_phone:'9456 7890',
        witness2_address:'港島地域總部',
        reporter_name:'何家騏',
        reporter_role:'危機處理主任 / 顧問',
        reporter_date:'2026-10-04',
        reporter_signature:'何家騏',
        claim_status:'已備案 (香港童軍總會活動綜合保險備案編號：ISD2026-INS-042)',
        remarks:'傷者已平安返家，領袖於活動翌日進行電話跟進，康復情況良好。'
      }]
    };
  }
,
  saveCrisisData(data){ localStorage.setItem(LS.crisis(this.currentEvent?.event_id||'isd_2026'), JSON.stringify(data));
    if(!this.mockMode && this.gasUrl){
      fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Crisis',record:{event_id:this.currentEvent?.event_id||'isd_2026',data_json:JSON.stringify(data),updated_by:this.currentUser?.name||''}})}).catch(()=>{});
    }
  }
,
  renderCrisisModule(box){
    this.migrateLegacySafety(); // 舊「安全及醫療」資料自動併入
    const container=box||document.getElementById('module-content');
    if(!this.crisisSubTab) this.crisisSubTab='docs';
    const data=this.getCrisisData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-900 shadow-sm">
          <b>危機處理：</b>應變指引、急救、保險、危機手冊、應變小組及緊急聯絡，公開可看；僅修改需副主席以上登入。
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchCrisisTab('docs')" class="tab-btn ${this.crisisSubTab==='docs'?'active':''}"><i class="fa-solid fa-book mr-1"></i> 應變指引 (急救·保險)</button>
          <button onclick="app.switchCrisisTab('accident')" class="tab-btn ${this.crisisSubTab==='accident'?'active':''}"><i class="fa-solid fa-file-waveform mr-1"></i> 意外事件報告表 (${(data.accidents||[]).length})</button>
          <button onclick="app.switchCrisisTab('manual')" class="tab-btn ${this.crisisSubTab==='manual'?'active':''}"><i class="fa-solid fa-file-arrow-up mr-1"></i> 上傳危機處理手冊</button>
          <button onclick="app.switchCrisisTab('team')" class="tab-btn ${this.crisisSubTab==='team'?'active':''}"><i class="fa-solid fa-people-group mr-1"></i> 危機應變小組</button>
          <button onclick="app.switchCrisisTab('contacts')" class="tab-btn ${this.crisisSubTab==='contacts'?'active':''}"><i class="fa-solid fa-phone mr-1"></i> 緊急聯絡</button>
        </div>
        <div id="crisis-tab-docs" class="${this.crisisSubTab==='docs'?'':'hidden'}"></div>
        <div id="crisis-tab-accident" class="${this.crisisSubTab==='accident'?'':'hidden'}"></div>
        <div id="crisis-tab-manual" class="${this.crisisSubTab==='manual'?'':'hidden'}"></div>
        <div id="crisis-tab-team" class="${this.crisisSubTab==='team'?'':'hidden'}"></div>
        <div id="crisis-tab-contacts" class="${this.crisisSubTab==='contacts'?'':'hidden'}"></div>
      </div>
    `;
    this.renderCrisisDocs();
    this.renderCrisisAccidents();
    this.renderCrisisManual();
    this.renderCrisisTeam();
    this.renderCrisisContacts();
  }
,
  switchCrisisTab(tab){
    this.crisisSubTab=tab;
    ['team','contacts','docs','manual','accident'].forEach(t=>{const el=document.getElementById('crisis-tab-'+t); if(el) el.classList.toggle('hidden',t!==tab);});
    document.querySelectorAll('[onclick^="app.switchCrisisTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'tab-btn active':'tab-btn';
    });
  }
,
  renderCrisisAccidents(){
    const container=document.getElementById('crisis-tab-accident');
    if(!container) return;
    const data=this.getCrisisData();
    const accidents=Array.isArray(data.accidents)?data.accidents:[];
    const canEdit=!!this.currentUser; // 任何已登入領袖/工作人員均可填報意外
    let html=`<div class="space-y-4">
      <div class="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-[11px] leading-relaxed text-rose-950 shadow-sm">
        <div class="font-bold text-[13px] text-rose-900 mb-1 flex items-center"><i class="fa-solid fa-file-waveform mr-1.5 text-rose-600"></i>香港童軍總會 意外事件報告表 (Accident Report Form - AR-1)</div>
        • 本表單嚴格參照<b>香港童軍總會標準《意外事件報告表》（表格編號：AR-1）</b>格式設計<br>
        • 活動期間發生之任何受傷或意外事故均須在此填報，<b>支援多單紀錄及管理</b><br>
        • 填寫完成後可點擊<b>「🖨️ 列印報告表」</b>，直接列印或儲存為<b>官方標準 A4 格式報告表</b>，供地域存檔及保險索償使用
      </div>
      <div class="flex gap-2 flex-wrap items-center">
        <button onclick="app.openAccidentReportForm()" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow"><i class="fa-solid fa-plus mr-1"></i>填寫新意外事件報告表</button>
        <button onclick="app.exportAccidentReports()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>匯出所有意外紀錄 (JSON)</button>
        <span class="text-xs text-slate-500 ml-auto">共 <b>${accidents.length}</b> 宗意外紀錄</span>
      </div>`;

    if(!accidents.length){
      html+=`
      <div class="border-2 border-dashed border-rose-200 rounded-2xl p-8 text-center bg-rose-50/40 space-y-3">
        <div class="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto"><i class="fa-solid fa-clipboard-check"></i></div>
        <h4 class="font-bold text-sm text-rose-900">暫無意外事件報告紀錄</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">活動期間如發生任何參加者或工作人員受傷/意外，請點擊上方按鈕填寫報告表並列印呈交地域存檔及保險索償。</p>
        <button onclick="app.openAccidentReportForm()" class="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold mt-2"><i class="fa-solid fa-plus mr-1"></i>立即填寫報告表</button>
      </div>`;
    } else {
      html+=`<div class="space-y-3">`;
      accidents.forEach((acc, idx)=>{
        html+=`
        <div class="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-sm space-y-3">
          <div class="flex justify-between items-start gap-2 flex-wrap">
            <div class="flex items-start gap-3 min-w-0">
              <div class="w-11 h-11 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                <i class="fa-solid fa-user-injured"></i>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <b class="text-[14px] text-slate-900">${escapeHtml(acc.victim_name||'未知名稱')}</b>
                  ${acc.victim_name_en?`<span class="text-[11px] text-slate-500 font-medium">(${escapeHtml(acc.victim_name_en)})</span>`:''}
                  <span class="bg-rose-100 text-rose-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-rose-200 font-mono">${escapeHtml(acc.report_no||('ACC-'+(idx+1)))}</span>
                  <span class="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(acc.victim_member_type||'童軍成員')}</span>
                </div>
                <div class="text-[11px] text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span><i class="fa-solid fa-clock mr-1 text-slate-400"></i>${escapeHtml(acc.acc_datetime||acc.event_date||'')}</span>
                  <span><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i>${escapeHtml(acc.acc_location||acc.event_location||'')}</span>
                  <span><i class="fa-solid fa-people-group mr-1 text-slate-400"></i>${escapeHtml(acc.group_unit||acc.victim_group_no||'')}</span>
                </div>
              </div>
            </div>
            <div class="flex gap-1.5 flex-wrap">
              <button onclick="app.printAccidentReport('${acc.id}')" class="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm inline-flex items-center"><i class="fa-solid fa-print mr-1"></i>列印報告表 (A4官方格式)</button>
              <button onclick="app.toggleAccidentDetail('${acc.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 border px-3 py-1.5 rounded-xl text-[11px] font-bold">👁️ 詳細內容</button>
              <button onclick="app.openAccidentReportForm('${acc.id}')" class="bg-white hover:bg-slate-50 border px-2.5 py-1.5 rounded-xl text-[11px] font-bold">✏️ 編輯</button>
              <button onclick="app.deleteAccidentReport('${acc.id}')" class="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 px-2.5 py-1.5 rounded-xl text-[11px] font-bold">🗑️ 刪除</button>
            </div>
          </div>
          <div class="bg-slate-50 border rounded-xl p-3 text-[11px] space-y-1.5">
            <div><b class="text-slate-700"><i class="fa-solid fa-hand-dots text-rose-500 mr-1"></i>受傷性質及部位：</b><span class="font-medium text-rose-900">${escapeHtml(acc.injury_nature||'')}（${escapeHtml(acc.injury_part||'')}）</span></div>
            <div><b class="text-slate-700"><i class="fa-solid fa-kit-medical text-emerald-600 mr-1"></i>急救及送院狀況：</b><span>${escapeHtml(acc.first_aid_given||'現場急救處理')} ｜ 送院：${escapeHtml(acc.hospital_name||'無送院')}</span></div>
            <div><b class="text-slate-700"><i class="fa-solid fa-shield-halved text-sky-600 mr-1"></i>保險跟進：</b><span class="text-sky-800">${escapeHtml(acc.claim_status||'已備案')}</span></div>
          </div>
          <div id="acc-detail-${acc.id}" class="hidden space-y-3 border-t pt-3 mt-2 text-[11px] leading-relaxed text-slate-700">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white border rounded-xl p-3.5">
              <div>
                <b class="text-slate-900 text-xs block mb-1">【傷者資料】</b>
                • 姓名：${escapeHtml(acc.victim_name||'')} (${escapeHtml(acc.victim_name_en||'')})<br>
                • 性別/年齡：${escapeHtml(acc.victim_gender||'')} / ${escapeHtml(acc.victim_age||'')}歲 (出生日期: ${escapeHtml(acc.victim_dob||'')})<br>
                • 身分證：${escapeHtml(acc.victim_hkid||'')}<br>
                • 旅團/身份：${escapeHtml(acc.victim_group_no||'')} (${escapeHtml(acc.victim_member_type||'')})<br>
                • 電話：${escapeHtml(acc.victim_phone||'')}<br>
                • 地址：${escapeHtml(acc.victim_address||'')}<br>
                • 家長/緊急聯絡人：${escapeHtml(acc.parent_name||'')} (${escapeHtml(acc.parent_phone||'')})
              </div>
              <div>
                <b class="text-slate-900 text-xs block mb-1">【活動與主辦資料】</b>
                • 活動名稱：${escapeHtml(acc.event_name||'')}<br>
                • 活動日期時間：${escapeHtml(acc.event_date||'')} ${escapeHtml(acc.event_time||'')}<br>
                • 活動地點：${escapeHtml(acc.event_location||'')}<br>
                • 所屬地域/區：${escapeHtml(acc.region||'')} / ${escapeHtml(acc.district||'')}<br>
                • 負責領袖：${escapeHtml(acc.leader_name||'')} (${escapeHtml(acc.leader_role||'')}, 電話: ${escapeHtml(acc.leader_phone||'')})<br>
                • 填報人：${escapeHtml(acc.reporter_name||'')} (${escapeHtml(acc.reporter_role||'')}, 報告日期: ${escapeHtml(acc.reporter_date||'')})
              </div>
            </div>
            <div class="bg-white border rounded-xl p-3.5 space-y-1.5">
              <b class="text-slate-900 text-xs block">【意外經過與原因】</b>
              <div class="whitespace-pre-line bg-slate-50 p-2.5 rounded-lg border">${escapeHtml(acc.acc_description||'')}</div>
              <div><b>當時天氣環境：</b>${escapeHtml(acc.weather_condition||'')}</div>
            </div>
            <div class="bg-white border rounded-xl p-3.5 space-y-1.5">
              <b class="text-slate-900 text-xs block">【急救、送院及跟進】</b>
              <div>• <b>急救處理：</b>${escapeHtml(acc.first_aid_given||'')} (急救員: ${escapeHtml(acc.first_aid_provider||'')})</div>
              <div>• <b>救護車/送院：</b>召喚救護車: ${escapeHtml(acc.ambulance_called||'')} ｜ 醫院: ${escapeHtml(acc.hospital_name||'')} ｜ 陪同領袖: ${escapeHtml(acc.escort_leader||'')}</div>
              <div>• <b>醫生診斷：</b>${escapeHtml(acc.diagnosis_result||'')}</div>
              <div>• <b>通知紀錄：</b>已通知家長: ${escapeHtml(acc.parent_notified||'')} ｜ 已通報地域: ${escapeHtml(acc.region_notified||'')}</div>
              <div>• <b>目擊證人：</b>1. ${escapeHtml(acc.witness1_name||'無')} (${escapeHtml(acc.witness1_phone||'')}) ｜ 2. ${escapeHtml(acc.witness2_name||'無')} (${escapeHtml(acc.witness2_phone||'')})</div>
              <div>• <b>備註說明：</b>${escapeHtml(acc.remarks||'')}</div>
            </div>
          </div>
        </div>`;
      });
      html+=`</div>`;
    }
    html+=`</div>`;
    container.innerHTML=html;
  }
,
  toggleAccidentDetail(id){
    const el=document.getElementById('acc-detail-'+id);
    if(el) el.classList.toggle('hidden');
  }
,
  openAccidentReportForm(id=null){
    const data=this.getCrisisData();
    const existing=id?(data.accidents||[]).find(a=>a.id===id):null;
    const isEdit=!!existing;
    const ev=this.currentEvent||{};
    const me=this.currentUser||{};
    const repNo=existing?.report_no||('ISD2026-ACC-'+String((data.accidents||[]).length+1).padStart(3,'0'));

    let html=`
      <input type="hidden" id="arf-mode" value="${isEdit?'edit':'create'}">
      <input type="hidden" id="arf-id" value="${existing?.id||''}">
      
      <div class="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-rose-900 flex justify-between items-center">
          <b><i class="fa-solid fa-file-waveform mr-1 text-rose-600"></i>香港童軍總會 意外事件報告表 (AR-1)</b>
          <span class="font-mono bg-white px-2 py-0.5 rounded border border-rose-300 font-bold">報告編號：${repNo}</span>
        </div>

        <!-- 甲、主辦單位及活動資料 -->
        <div class="border rounded-xl p-3.5 bg-slate-50 space-y-3">
          <h5 class="font-bold text-slate-900 border-b pb-1 text-xs"><i class="fa-solid fa-flag text-indigo-600 mr-1"></i>甲、主辦單位及活動資料</h5>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div><label class="font-bold">地域 / 總部單位 *</label><input id="arf-region" value="${escapeHtml(existing?.region||'港島地域')}" required class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">區 / 旅團</label><input id="arf-district" value="${escapeHtml(existing?.district||'柴灣區')}" placeholder="例如 柴灣區" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">主辦旅團 / 組別</label><input id="arf-group-unit" value="${escapeHtml(existing?.group_unit||me.group_name||'港島童軍繽紛日籌委會')}" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div class="sm:col-span-2"><label class="font-bold">活動名稱 *</label><input id="arf-event-name" value="${escapeHtml(existing?.event_name||ev.event_name||'港島童軍繽紛日 2026')}" required class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">活動日期 *</label><input id="arf-event-date" type="date" value="${escapeHtml(existing?.event_date||ev.start_date||'2026-10-04')}" required class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div class="sm:col-span-2"><label class="font-bold">活動地點 *</label><input id="arf-event-location" value="${escapeHtml(existing?.event_location||ev.location||'香港黃竹坑香港警察學院')}" required class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">活動時間</label><input id="arf-event-time" value="${escapeHtml(existing?.event_time||ev.time||'07:45 - 17:30')}" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div><label class="font-bold">活動負責領袖 *</label><input id="arf-leader-name" value="${escapeHtml(existing?.leader_name||'朱家聰')}" required class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">職銜</label><input id="arf-leader-role" value="${escapeHtml(existing?.leader_role||'活動主席')}" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">聯絡電話 *</label><input id="arf-leader-phone" value="${escapeHtml(existing?.leader_phone||'92222222')}" required class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
        </div>

        <!-- 乙、傷者資料 -->
        <div class="border rounded-xl p-3.5 bg-slate-50 space-y-3">
          <h5 class="font-bold text-slate-900 border-b pb-1 text-xs"><i class="fa-solid fa-user text-rose-600 mr-1"></i>乙、傷者資料</h5>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div><label class="font-bold">中文姓名 *</label><input id="arf-victim-name" value="${escapeHtml(existing?.victim_name||'')}" required placeholder="例如 陳小明" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">英文姓名</label><input id="arf-victim-name-en" value="${escapeHtml(existing?.victim_name_en||'')}" placeholder="Chan Siu Ming" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">性別</label><select id="arf-victim-gender" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"><option value="男" ${existing?.victim_gender==='男'?'selected':''}>男</option><option value="女" ${existing?.victim_gender==='女'?'selected':''}>女</option></select></div>
            <div><label class="font-bold">年齡</label><input id="arf-victim-age" type="number" value="${escapeHtml(existing?.victim_age||'')}" placeholder="12" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div><label class="font-bold">出生日期</label><input id="arf-victim-dob" type="date" value="${escapeHtml(existing?.victim_dob||'')}" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">香港身分證號碼</label><input id="arf-victim-hkid" value="${escapeHtml(existing?.victim_hkid||'')}" placeholder="例如 Y123456(7)" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">童軍身份/類別</label><select id="arf-victim-member-type" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"><option value="童軍 (Scout)" ${existing?.victim_member_type?.includes('童軍')?'selected':''}>童軍</option><option value="幼童軍 (Cub)" ${existing?.victim_member_type?.includes('幼童軍')?'selected':''}>幼童軍</option><option value="小童軍 (Grasshopper)" ${existing?.victim_member_type?.includes('小童軍')?'selected':''}>小童軍</option><option value="深資童軍 (Venture)" ${existing?.victim_member_type?.includes('深資')?'selected':''}>深資童軍</option><option value="樂行童軍 (Rover)" ${existing?.victim_member_type?.includes('樂行')?'selected':''}>樂行童軍</option><option value="領袖 (Leader)" ${existing?.victim_member_type?.includes('領袖')?'selected':''}>領袖</option><option value="工作人員 (Staff)" ${existing?.victim_member_type?.includes('工作人員')?'selected':''}>工作人員</option><option value="嘉賓/公眾 (Public)" ${existing?.victim_member_type?.includes('公眾')?'selected':''}>嘉賓 / 公眾人士</option></select></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div><label class="font-bold">所屬旅團編號</label><input id="arf-victim-group-no" value="${escapeHtml(existing?.victim_group_no||'')}" placeholder="例如 港島第6旅" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">傷者聯絡電話</label><input id="arf-victim-phone" value="${escapeHtml(existing?.victim_phone||'')}" placeholder="例如 2890 1234 / 9123 4567" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
          <div><label class="font-bold">住宅地址</label><input id="arf-victim-address" value="${escapeHtml(existing?.victim_address||'')}" placeholder="傷者住址" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div><label class="font-bold">家長 / 監護人姓名及關係</label><input id="arf-parent-name" value="${escapeHtml(existing?.parent_name||'')}" placeholder="例如 陳大文 (父親)" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">家長緊急聯絡電話 *</label><input id="arf-parent-phone" value="${escapeHtml(existing?.parent_phone||'')}" required placeholder="例如 9876 5432" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
        </div>

        <!-- 丙、意外發生詳情 -->
        <div class="border rounded-xl p-3.5 bg-slate-50 space-y-3">
          <h5 class="font-bold text-slate-900 border-b pb-1 text-xs"><i class="fa-solid fa-triangle-exclamation text-amber-600 mr-1"></i>丙、意外發生詳情</h5>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div><label class="font-bold">意外發生日期及時間 *</label><input id="arf-acc-datetime" value="${escapeHtml(existing?.acc_datetime||todayISO()+' 14:00')}" required placeholder="2026-10-04 14:00" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">意外確實地點 *</label><input id="arf-acc-location" value="${escapeHtml(existing?.acc_location||'香港警察學院 大操場')}" required placeholder="例如 大操場中央草坪" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div><label class="font-bold">受傷性質 (擦傷/扭傷/骨折/割傷等) *</label><input id="arf-injury-nature" value="${escapeHtml(existing?.injury_nature||'')}" required placeholder="例如 擦傷及右腳踝扭傷" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">受傷部位 *</label><input id="arf-injury-part" value="${escapeHtml(existing?.injury_part||'')}" required placeholder="例如 右腳踝、右膝" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
          <div>
            <label class="font-bold">意外發生經過及原因詳細記錄 *</label>
            <textarea id="arf-acc-description" rows="3" required placeholder="詳細記錄意外發生的前因後果、經過、如何受傷..." class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white">${escapeHtml(existing?.acc_description||'')}</textarea>
          </div>
          <div><label class="font-bold">當時天氣及環境狀況</label><input id="arf-weather-condition" value="${escapeHtml(existing?.weather_condition||'晴天，氣溫約 29°C，地面乾燥')}" placeholder="天氣、光線、地面狀況等" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
        </div>

        <!-- 丁、現場急救及送院治療情況 -->
        <div class="border rounded-xl p-3.5 bg-slate-50 space-y-3">
          <h5 class="font-bold text-slate-900 border-b pb-1 text-xs"><i class="fa-solid fa-truck-medical text-red-600 mr-1"></i>丁、現場急救及送院治療情況</h5>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div><label class="font-bold">現場急救處理情況</label><textarea id="arf-first-aid-given" rows="2" placeholder="聖約翰救傷隊消毒清潔、包紮、冰敷..." class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white">${escapeHtml(existing?.first_aid_given||'聖約翰救傷隊現場急救處理')}</textarea></div>
            <div><label class="font-bold">急救員姓名 / 單位</label><input id="arf-first-aid-provider" value="${escapeHtml(existing?.first_aid_provider||'聖約翰救傷隊 救護員')}" placeholder="急救員姓名" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div><label class="font-bold">是否召喚救護車</label><input id="arf-ambulance-called" value="${escapeHtml(existing?.ambulance_called||'否')}" placeholder="是 / 否 (私家車前往)" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">送往醫院名稱</label><input id="arf-hospital-name" value="${escapeHtml(existing?.hospital_name||'瑪麗醫院 (急症室)')}" placeholder="例如 瑪麗醫院" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">陪同送院領袖及電話</label><input id="arf-escort-leader" value="${escapeHtml(existing?.escort_leader||'')}" placeholder="領袖姓名及電話" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
          <div><label class="font-bold">醫生診斷結果 / 傷勢評估 / 出院情況</label><textarea id="arf-diagnosis-result" rows="2" placeholder="照X光無骨折，屬輕度扭傷，已出院回家休息..." class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white">${escapeHtml(existing?.diagnosis_result||'')}</textarea></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div><label class="font-bold">通知家長情況</label><input id="arf-parent-notified" value="${escapeHtml(existing?.parent_notified||'是 (已即時致電通知家長)')}" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">通報地域情況</label><input id="arf-region-notified" value="${escapeHtml(existing?.region_notified||'是 (已向活動主席及秘書處通報備案)')}" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
        </div>

        <!-- 戊、目擊證人資料 -->
        <div class="border rounded-xl p-3.5 bg-slate-50 space-y-3">
          <h5 class="font-bold text-slate-900 border-b pb-1 text-xs"><i class="fa-solid fa-eye text-sky-600 mr-1"></i>戊、目擊證人資料</h5>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div><label class="font-bold">目擊證人 1 姓名</label><input id="arf-w1-name" value="${escapeHtml(existing?.witness1_name||'')}" placeholder="證人姓名" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">證人 1 電話</label><input id="arf-w1-phone" value="${escapeHtml(existing?.witness1_phone||'')}" placeholder="聯絡電話" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">證人 1 職銜 / 地址</label><input id="arf-w1-addr" value="${escapeHtml(existing?.witness1_address||'')}" placeholder="職銜或單位" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div><label class="font-bold">目擊證人 2 姓名</label><input id="arf-w2-name" value="${escapeHtml(existing?.witness2_name||'')}" placeholder="證人姓名" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">證人 2 電話</label><input id="arf-w2-phone" value="${escapeHtml(existing?.witness2_phone||'')}" placeholder="聯絡電話" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">證人 2 職銜 / 地址</label><input id="arf-w2-addr" value="${escapeHtml(existing?.witness2_address||'')}" placeholder="職銜或單位" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
        </div>

        <!-- 己、填報人資料及聲明 -->
        <div class="border rounded-xl p-3.5 bg-slate-50 space-y-3">
          <h5 class="font-bold text-slate-900 border-b pb-1 text-xs"><i class="fa-solid fa-signature text-emerald-600 mr-1"></i>己、填報人資料及聲明</h5>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div><label class="font-bold">填報人姓名 *</label><input id="arf-reporter-name" value="${escapeHtml(existing?.reporter_name||me.name||'何家騏')}" required class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">職銜 *</label><input id="arf-reporter-role" value="${escapeHtml(existing?.reporter_role||me.role||'危機處理主任')}" required class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">申報日期 *</label><input id="arf-reporter-date" type="date" value="${escapeHtml(existing?.reporter_date||todayISO())}" required class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">簽署聲明</label><input id="arf-reporter-signature" value="${escapeHtml(existing?.reporter_signature||existing?.reporter_name||me.name||'何家騏')}" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white font-serif"></div>
          </div>
        </div>

        <!-- 庚、保險索償及跟進 -->
        <div class="border rounded-xl p-3.5 bg-slate-50 space-y-3">
          <h5 class="font-bold text-slate-900 border-b pb-1 text-xs"><i class="fa-solid fa-file-shield text-blue-600 mr-1"></i>庚、保險索償及跟進備註</h5>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div><label class="font-bold">保險索償備案狀況</label><input id="arf-claim-status" value="${escapeHtml(existing?.claim_status||'已備案 (香港童軍總會活動綜合保險)')}" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
            <div><label class="font-bold">跟進備註</label><input id="arf-remarks" value="${escapeHtml(existing?.remarks||'已跟進康復進度，無其他併發情況。')}" class="w-full px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('record-modal-title').textContent=isEdit?'編輯意外事件報告表':'填寫新意外事件報告表 (AR-1)';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitAccidentReportForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitAccidentReportForm(){
    const mode=document.getElementById('arf-mode')?.value||'create';
    const id=document.getElementById('arf-id')?.value;
    const victim_name=document.getElementById('arf-victim-name')?.value.trim();
    if(!victim_name){ showToast('請填寫傷者姓名','error'); return; }

    const data=this.getCrisisData();
    if(!Array.isArray(data.accidents)) data.accidents=[];
    const existing=id?data.accidents.find(a=>a.id===id):null;
    const repNo=existing?.report_no||('ISD2026-ACC-'+String(data.accidents.length+1).padStart(3,'0'));

    const record={
      id: id || ('acc_'+Date.now()),
      report_no: repNo,
      region: document.getElementById('arf-region')?.value.trim()||'港島地域',
      district: document.getElementById('arf-district')?.value.trim()||'',
      group_unit: document.getElementById('arf-group-unit')?.value.trim()||'',
      event_name: document.getElementById('arf-event-name')?.value.trim()||'',
      event_date: document.getElementById('arf-event-date')?.value||'',
      event_time: document.getElementById('arf-event-time')?.value.trim()||'',
      event_location: document.getElementById('arf-event-location')?.value.trim()||'',
      leader_name: document.getElementById('arf-leader-name')?.value.trim()||'',
      leader_role: document.getElementById('arf-leader-role')?.value.trim()||'',
      leader_phone: document.getElementById('arf-leader-phone')?.value.trim()||'',
      victim_name: victim_name,
      victim_name_en: document.getElementById('arf-victim-name-en')?.value.trim()||'',
      victim_gender: document.getElementById('arf-victim-gender')?.value||'男',
      victim_age: document.getElementById('arf-victim-age')?.value.trim()||'',
      victim_dob: document.getElementById('arf-victim-dob')?.value||'',
      victim_hkid: document.getElementById('arf-victim-hkid')?.value.trim()||'',
      victim_member_type: document.getElementById('arf-victim-member-type')?.value||'',
      victim_group_no: document.getElementById('arf-victim-group-no')?.value.trim()||'',
      victim_phone: document.getElementById('arf-victim-phone')?.value.trim()||'',
      victim_address: document.getElementById('arf-victim-address')?.value.trim()||'',
      parent_name: document.getElementById('arf-parent-name')?.value.trim()||'',
      parent_phone: document.getElementById('arf-parent-phone')?.value.trim()||'',
      acc_datetime: document.getElementById('arf-acc-datetime')?.value.trim()||'',
      acc_location: document.getElementById('arf-acc-location')?.value.trim()||'',
      injury_nature: document.getElementById('arf-injury-nature')?.value.trim()||'',
      injury_part: document.getElementById('arf-injury-part')?.value.trim()||'',
      acc_description: document.getElementById('arf-acc-description')?.value.trim()||'',
      weather_condition: document.getElementById('arf-weather-condition')?.value.trim()||'',
      first_aid_given: document.getElementById('arf-first-aid-given')?.value.trim()||'',
      first_aid_provider: document.getElementById('arf-first-aid-provider')?.value.trim()||'',
      ambulance_called: document.getElementById('arf-ambulance-called')?.value.trim()||'否',
      hospital_name: document.getElementById('arf-hospital-name')?.value.trim()||'',
      escort_leader: document.getElementById('arf-escort-leader')?.value.trim()||'',
      diagnosis_result: document.getElementById('arf-diagnosis-result')?.value.trim()||'',
      parent_notified: document.getElementById('arf-parent-notified')?.value.trim()||'',
      region_notified: document.getElementById('arf-region-notified')?.value.trim()||'',
      witness1_name: document.getElementById('arf-w1-name')?.value.trim()||'',
      witness1_phone: document.getElementById('arf-w1-phone')?.value.trim()||'',
      witness1_address: document.getElementById('arf-w1-addr')?.value.trim()||'',
      witness2_name: document.getElementById('arf-w2-name')?.value.trim()||'',
      witness2_phone: document.getElementById('arf-w2-phone')?.value.trim()||'',
      witness2_address: document.getElementById('arf-w2-addr')?.value.trim()||'',
      reporter_name: document.getElementById('arf-reporter-name')?.value.trim()||'',
      reporter_role: document.getElementById('arf-reporter-role')?.value.trim()||'',
      reporter_date: document.getElementById('arf-reporter-date')?.value||todayISO(),
      reporter_signature: document.getElementById('arf-reporter-signature')?.value.trim()||'',
      claim_status: document.getElementById('arf-claim-status')?.value.trim()||'',
      remarks: document.getElementById('arf-remarks')?.value.trim()||''
    };

    if(mode==='edit'){
      const idx=data.accidents.findIndex(a=>a.id===id);
      if(idx>=0) data.accidents[idx]={...data.accidents[idx],...record};
    } else {
      data.accidents.unshift(record);
    }
    this.saveCrisisData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'意外事件報告表已更新':'意外事件報告表已保存','success');
    this.renderCrisisModule();
  }
,
  deleteAccidentReport(id){
    if(!confirm('確定刪除此意外事件報告表紀錄？')) return;
    const data=this.getCrisisData();
    data.accidents=(data.accidents||[]).filter(a=>a.id!==id);
    this.saveCrisisData(data);
    showToast('意外報告已刪除','warning');
    this.renderCrisisModule();
  }
,
  exportAccidentReports(){
    const data=this.getCrisisData();
    const blob=new Blob([JSON.stringify(data.accidents||[],null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`accident_reports_${todayISO()}.json`; a.click();
    showToast('已匯出所有意外紀錄 JSON','success');
  }
,
  printAccidentReport(id){
    const data=this.getCrisisData();
    const acc=(data.accidents||[]).find(a=>a.id===id);
    if(!acc){ showToast('找不到意外報告','error'); return; }

    const printHtml=`<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<title>香港童軍總會 意外事件報告表 - ${escapeHtml(acc.report_no||'AR-1')}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 15mm; }
  body { font-family: "PingFang HK", "Microsoft JhengHei", "Noto Sans TC", sans-serif; color: #111; line-height: 1.4; font-size: 11pt; margin: 0; padding: 15px; }
  .header-box { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
  .header-title { font-size: 16pt; font-weight: bold; margin: 0; }
  .header-en { font-size: 12pt; font-weight: bold; margin: 2px 0 0; }
  .header-formno { font-size: 9pt; text-align: right; margin-top: 4px; color: #333; }
  .table-grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  .table-grid th, .table-grid td { border: 1px solid #333; padding: 5px 8px; font-size: 10pt; text-align: left; vertical-align: top; }
  .table-grid th { background-color: #f2f2f2; font-weight: bold; width: 22%; }
  .section-hdr { background-color: #222 !important; color: #fff !important; font-size: 10.5pt; font-weight: bold; padding: 4px 8px; }
  .val-text { font-weight: 500; }
  .sign-box { border: 1px solid #333; padding: 8px; margin-top: 10px; font-size: 10pt; }
  .footer-note { font-size: 8.5pt; color: #555; margin-top: 12px; line-height: 1.3; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="no-print" style="margin-bottom:15px; padding:10px; background:#fef3c7; border:1px solid #f59e0b; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
  <span><b>🖨️ 列印預覽：</b>已依據香港童軍總會標準《意外事件報告表》排版，按右方按鈕即可列印或存為 PDF。</span>
  <button onclick="window.print()" style="background:#dc2626; color:#fff; font-weight:bold; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">立即列印 / 存為 PDF</button>
</div>

<div class="header-box">
  <div class="header-title">香 港 童 軍 總 會</div>
  <div class="header-en">SCOUT ASSOCIATION OF HONG KONG</div>
  <div style="font-size:14pt; font-weight:bold; margin-top:4px;">意外事件報告表 ACCIDENT / INCIDENT REPORT FORM</div>
  <div class="header-formno">表格編號：AR-1 (2019/07修訂版) ｜ 報告編號：<b>${escapeHtml(acc.report_no||'ISD2026-ACC-001')}</b></div>
</div>

<table class="table-grid">
  <tr><td colspan="4" class="section-hdr">甲、主辦單位及活動資料 (Organizing Unit & Activity Details)</td></tr>
  <tr>
    <th>地域 / 總部單位</th><td>${escapeHtml(acc.region||'港島地域')}</td>
    <th>區 / 旅團</th><td>${escapeHtml(acc.district||'')} / ${escapeHtml(acc.group_unit||'')}</td>
  </tr>
  <tr>
    <th>活動名稱</th><td>${escapeHtml(acc.event_name||'')}</td>
    <th>活動日期及時間</th><td>${escapeHtml(acc.event_date||'')} ${escapeHtml(acc.event_time||'')}</td>
  </tr>
  <tr>
    <th>活動地點</th><td>${escapeHtml(acc.event_location||'')}</td>
    <th>負責領袖及電話</th><td>${escapeHtml(acc.leader_name||'')} (${escapeHtml(acc.leader_role||'')})<br>電話：${escapeHtml(acc.leader_phone||'')}</td>
  </tr>

  <tr><td colspan="4" class="section-hdr">乙、傷者資料 (Particulars of Injured Person)</td></tr>
  <tr>
    <th>姓名 (中/英文)</th><td><b>${escapeHtml(acc.victim_name||'')}</b> ${acc.victim_name_en?`(${escapeHtml(acc.victim_name_en)})`:''}</td>
    <th>性別 / 年齡</th><td>${escapeHtml(acc.victim_gender||'')} / ${escapeHtml(acc.victim_age||'')}歲 (出生日期: ${escapeHtml(acc.victim_dob||'')})</td>
  </tr>
  <tr>
    <th>身分證號碼</th><td>${escapeHtml(acc.victim_hkid||'')}</td>
    <th>童軍身份及旅團</th><td>${escapeHtml(acc.victim_member_type||'')} ｜ 旅團：${escapeHtml(acc.victim_group_no||'')}</td>
  </tr>
  <tr>
    <th>聯絡電話</th><td>${escapeHtml(acc.victim_phone||'')}</td>
    <th>住宅地址</th><td>${escapeHtml(acc.victim_address||'')}</td>
  </tr>
  <tr>
    <th>家長 / 監護人姓名</th><td>${escapeHtml(acc.parent_name||'')}</td>
    <th>家長緊急聯絡電話</th><td><b>${escapeHtml(acc.parent_phone||'')}</b></td>
  </tr>

  <tr><td colspan="4" class="section-hdr">丙、意外發生詳情 (Details of Accident / Incident)</td></tr>
  <tr>
    <th>意外發生日期及時間</th><td>${escapeHtml(acc.acc_datetime||'')}</td>
    <th>意外發生確實地點</th><td>${escapeHtml(acc.acc_location||'')}</td>
  </tr>
  <tr>
    <th>受傷性質及受傷部位</th><td colspan="3"><b style="color:#b91c1c;">${escapeHtml(acc.injury_nature||'')}</b> (受傷部位：${escapeHtml(acc.injury_part||'')})</td>
  </tr>
  <tr>
    <th>意外發生經過及原因<br>(詳細記錄)</th>
    <td colspan="3" style="min-height:60px; line-height:1.5;">${escapeHtml(acc.acc_description||'').replace(/\n/g,'<br>')}</td>
  </tr>
  <tr>
    <th>當時天氣及環境狀況</th><td colspan="3">${escapeHtml(acc.weather_condition||'')}</td>
  </tr>

  <tr><td colspan="4" class="section-hdr">丁、現場急救及送院治療情況 (First Aid & Hospital Treatment)</td></tr>
  <tr>
    <th>現場急救處理情況</th><td colspan="3">${escapeHtml(acc.first_aid_given||'')} (急救員：${escapeHtml(acc.first_aid_provider||'')})</td>
  </tr>
  <tr>
    <th>救護車 / 送往醫院</th><td>召喚救護車：${escapeHtml(acc.ambulance_called||'否')}<br>送往：<b>${escapeHtml(acc.hospital_name||'')}</b></td>
    <th>陪同送院領袖</th><td>${escapeHtml(acc.escort_leader||'')}</td>
  </tr>
  <tr>
    <th>醫生診斷及出院情況</th><td colspan="3">${escapeHtml(acc.diagnosis_result||'')}</td>
  </tr>
  <tr>
    <th>已通知家長狀況</th><td>${escapeHtml(acc.parent_notified||'')}</td>
    <th>已通報地域狀況</th><td>${escapeHtml(acc.region_notified||'')}</td>
  </tr>

  <tr><td colspan="4" class="section-hdr">戊、目擊證人資料 (Particulars of Witnesses)</td></tr>
  <tr>
    <th>目擊證人 1</th><td>姓名：${escapeHtml(acc.witness1_name||'無')}<br>電話：${escapeHtml(acc.witness1_phone||'')}</td>
    <th>目擊證人 2</th><td>姓名：${escapeHtml(acc.witness2_name||'無')}<br>電話：${escapeHtml(acc.witness2_phone||'')}</td>
  </tr>
</table>

<div class="sign-box">
  <div style="display:flex; justify-content:space-between;">
    <div>
      <b>己、填報人聲明：</b>本人謹此聲明，上述所填報之意外事件內容均屬真實無訛。<br><br>
      填報人姓名：<b>${escapeHtml(acc.reporter_name||'')}</b> ｜ 職銜：<b>${escapeHtml(acc.reporter_role||'')}</b> ｜ 申報日期：${escapeHtml(acc.reporter_date||'')}
    </div>
    <div style="text-align:center; min-width:180px;">
      <div style="font-family:serif; font-size:16pt; font-style:italic; border-bottom:1px solid #000; padding:10px 10px 2px;">${escapeHtml(acc.reporter_signature||acc.reporter_name||'')}</div>
      <div style="font-size:9pt; margin-top:3px;">負責領袖 / 填報人簽署</div>
    </div>
  </div>
</div>

<div class="sign-box" style="background-color:#f9f9f9; margin-top:8px;">
  <b>庚、地域 / 總部處理及保險跟進 (Region / HQ Follow-up & Insurance):</b><br>
  • 保險備案狀態：${escapeHtml(acc.claim_status||'已備案 (香港童軍總會活動綜合保險)')}<br>
  • 跟進備註：${escapeHtml(acc.remarks||'已跟進傷者狀況。')}
</div>

<div class="footer-note">
  註：本表格填妥後須於意外發生後盡快送交所屬地域辦事處存檔；如涉及保險索償，請連同急診室醫療單據及醫生診斷證明書一併呈交。
</div>
</body>
</html>`;

    const printWin=window.open('','_blank','width=900,height=800');
    if(printWin){
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    } else {
      showToast('請允許彈出視窗以進行列印','warning');
    }
  }
,

  renderCrisisManual(){
    const container=document.getElementById('crisis-tab-manual');
    if(!container) return;
    const data=this.getCrisisData();
    const manuals=Array.isArray(data.manuals)?data.manuals:[];
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60 || this.isAdmin() || this.isExecViceOrChair();
    let html=`<div class="space-y-4">
      <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] leading-relaxed text-red-900">
        <b><i class="fa-solid fa-file-arrow-up mr-1"></i>危機處理手冊（上傳與查閱專頁）：</b><br>
        • 本分頁預留用作上傳及公開查閱《港島童軍繽紛日危機處理計劃手冊》（組織、職責、緊急應變、急救保險及運作指引）<br>
        • 管理員／副主席以上可點擊「上傳手冊檔案」新增或更新手冊檔案（支援 PDF、Word、圖片或 Google Drive 連結）<br>
        • 所有工作人員及公眾均可公開查閱、預覽及下載手冊檔案
      </div>
      <div class="flex gap-2 flex-wrap items-center">
        ${canEdit?`<button onclick="app.openCrisisManualForm()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow"><i class="fa-solid fa-file-arrow-up mr-1"></i>上傳手冊檔案</button>`:''}
        <button onclick="app.exportCrisisManuals()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download mr-1"></i>匯出手冊清單</button>
      </div>`;

    if(!manuals.length){
      html+=`
      <div class="border-2 border-dashed border-red-200 rounded-2xl p-8 text-center bg-red-50/40 space-y-3">
        <div class="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-2xl mx-auto"><i class="fa-solid fa-book-medical"></i></div>
        <h4 class="font-bold text-sm text-red-900">已預留分頁用作上傳危機處理手冊</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">尚未上傳手冊檔案。管理員／副主席以上可點擊上方「上傳手冊檔案」按鈕上傳手冊（支援 PDF、Word、圖片或 Google Drive 連結）。所有人公開可查閱。</p>
        ${canEdit?`<button onclick="app.openCrisisManualForm()" class="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold mt-2"><i class="fa-solid fa-file-arrow-up mr-1"></i>立即上傳手冊</button>`:''}
      </div>`;
    } else {
      html+=`<div class="grid grid-cols-1 gap-4">`;
      manuals.forEach(m=>{
        const driveId=this.docDriveId(m);
        html+=`
        <div class="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-3 flex flex-col">
          <div class="flex justify-between items-start gap-2 flex-wrap">
            <div class="flex items-start gap-3 min-w-0">
              <div class="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"><i class="fa-solid fa-file-pdf"></i></div>
              <div>
                <b class="text-[14px] text-slate-800">${escapeHtml(m.title)}</b>
                <div class="mt-1 flex gap-2 flex-wrap items-center">
                  <span class="bg-red-100 text-red-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-red-200">${escapeHtml(m.version||'2026年版')}</span>
                  <span class="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(m.category||'危機手冊')}</span>
                  ${m.file_name?`<span class="bg-sky-50 text-sky-700 text-[10px] px-2 py-0.5 rounded-full border border-sky-200 font-mono">${escapeHtml(m.file_name)}</span>`:''}
                </div>
              </div>
            </div>
            ${canEdit?`<div class="flex gap-1 flex-shrink-0"><button onclick="app.openCrisisManualForm('${m.id}')" class="bg-white border px-2.5 py-1 rounded-xl text-[11px] font-bold hover:bg-slate-50">✏️ 編輯</button><button onclick="app.deleteCrisisManual('${m.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2.5 py-1 rounded-xl text-[11px] font-bold hover:bg-rose-100">🗑️ 刪除</button></div>`:''}
          </div>
          ${m.summary?`<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-950 leading-relaxed"><b class="text-amber-800"><i class="fa-solid fa-align-left mr-1"></i>手冊擇要：</b>${escapeHtml(m.summary)}</div>`:''}
          <div class="text-[10px] text-slate-400">發佈／上載：${escapeHtml(m.uploaded_by||'秘書處')} ${m.date?` | ${escapeHtml(m.date)}`:''}</div>
          <div class="flex gap-2 flex-wrap pt-1">
            <button onclick="app.openCrisisManualInApp('${m.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-[11px] font-bold shadow-sm"><i class="fa-solid fa-book-open mr-1"></i>在 APP 內開啟 PDF</button>
            <button onclick="app.downloadCrisisManual('${m.id}')" class="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl text-[11px] font-bold shadow-sm"><i class="fa-solid fa-download mr-1"></i>下載手冊</button>
            <button onclick="app.toggleCrisisManualDetail('${m.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 border px-3.5 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-circle-info mr-1"></i>詳細內容 / 章節</button>
            ${m.file_url?`<a href="${escapeHtml(m.file_url)}" target="_blank" class="bg-sky-50 text-sky-700 border border-sky-200 px-3.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>開啟外部連結</a>`:''}
          </div>
          <div id="cman-detail-${m.id}" class="hidden space-y-2 border-t pt-3 mt-1">
            ${m.description?`<div class="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 border rounded-xl p-3.5">${escapeHtml(m.description)}</div>`:''}
            ${driveId?`<iframe src="https://drive.google.com/file/d/${driveId}/preview" class="w-full h-[360px] border rounded-xl" allow="autoplay"></iframe>`:''}
          </div>
        </div>`;
      });
      html+=`</div>`;
    }
    html+=`</div>`;
    container.innerHTML=html;
  }
,
  openCrisisManualForm(id=null){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isAdmin() && !this.isExecViceOrChair()){ showToast('僅管理員或副主席以上可上傳/編輯手冊','error'); return; }
    const data=this.getCrisisData();
    const existing=id?(data.manuals||[]).find(m=>m.id===id):null;
    let html=`
      <input type="hidden" id="cman-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="cman-id" value="${existing?.id||''}">
      <div>
        <label class="text-[11px] font-bold">手冊名稱 *</label>
        <input id="cman-title" value="${escapeHtml(existing?.title||'港島童軍繽紛日危機處理計劃（組織、職責及運作）手冊')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1">
      </div>
      <div class="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label class="text-[11px] font-bold">版本／年份</label>
          <input id="cman-version" value="${escapeHtml(existing?.version||'2026 年版')}" placeholder="例如 2026 年版" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">
        </div>
        <div>
          <label class="text-[11px] font-bold">分類</label>
          <input id="cman-category" value="${escapeHtml(existing?.category||'危機手冊')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">
        </div>
      </div>
      <div class="mt-3">
        <label class="text-[11px] font-bold">手冊擇要（簡述）</label>
        <input id="cman-summary" value="${escapeHtml(existing?.summary||'涵蓋危機定義、應變小組職責、惡劣天氣、意外急救、保險及取消程序')}" placeholder="例如 涵蓋應變指引、急救、保險、惡劣天氣及緊急撤離流程" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">
      </div>
      <div class="mt-3">
        <label class="text-[11px] font-bold">手冊內容 / 詳細說明</label>
        <textarea id="cman-desc" rows="6" class="w-full px-3 py-2 border rounded-xl text-sm mt-1" placeholder="手冊章節、重點指引或使用說明...">${escapeHtml(existing?.description||'')}</textarea>
      </div>
      <div class="mt-3 bg-slate-50 border rounded-xl p-3 space-y-2">
        <label class="text-[11px] font-bold flex items-center gap-1"><i class="fa-solid fa-file-arrow-up text-red-600"></i>上傳手冊檔案 (PDF / Word / 圖片)</label>
        <input type="file" id="cman-file-input" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" class="w-full text-xs" onchange="app.handleCrisisManualFile(this.files[0])">
        <div id="cman-file-info" class="text-[11px] text-slate-500">${existing?.file_name?`現有檔案：<b>${escapeHtml(existing.file_name)}</b>`:''}${!existing?.file_name?'尚未選擇檔案':''}</div>
      </div>
      <div class="mt-3">
        <label class="text-[11px] font-bold">或填寫 Google Drive 連結 / 文件網址</label>
        <input id="cman-url" value="${escapeHtml(existing?.file_url||'')}" placeholder="https://drive.google.com/..." class="w-full px-3 py-2 border rounded-xl text-sm mt-1">
      </div>
    `;
    document.getElementById('record-modal-title').textContent=existing?'編輯危機處理手冊':'上傳危機處理手冊';
    document.getElementById('record-form-fields').innerHTML=html;
    this._cmanTempFile=existing?{name:existing.file_name||'', data:existing.file_data||''}:{name:'', data:''};
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitCrisisManualForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async handleCrisisManualFile(file){
    if(!file) return;
    try{
      const dataUrl=await fileToDataUrl(file);
      this._cmanTempFile={name:file.name, data:dataUrl};
      const infoEl=document.getElementById('cman-file-info');
      if(infoEl) infoEl.innerHTML=`<span class="text-emerald-700 font-bold"><i class="fa-solid fa-check mr-1"></i>已選擇檔案：${escapeHtml(file.name)} (${(file.size/1024).toFixed(1)} KB)</span>`;
      showToast(`已載入手冊檔案：${file.name}`,'success');
    }catch(err){ showToast('讀取檔案失敗：'+err.message,'error'); }
  }
,
  submitCrisisManualForm(){
    const mode=document.getElementById('cman-mode')?.value||'create';
    const id=document.getElementById('cman-id')?.value;
    const title=document.getElementById('cman-title')?.value.trim();
    const version=document.getElementById('cman-version')?.value.trim()||'2026 年版';
    const category=document.getElementById('cman-category')?.value.trim()||'危機手冊';
    const summary=document.getElementById('cman-summary')?.value.trim()||'';
    const description=document.getElementById('cman-desc')?.value.trim()||'';
    const file_url=document.getElementById('cman-url')?.value.trim()||'';
    if(!title){ showToast('請填寫手冊名稱','error'); return; }
    const data=this.getCrisisData();
    if(!Array.isArray(data.manuals)) data.manuals=[];
    const fileInfo=this._cmanTempFile||{};
    const record={
      id:id||('cm_'+Date.now()),
      title,
      version,
      category,
      summary,
      description,
      file_name:fileInfo.name||'',
      file_data:fileInfo.data||'',
      file_url,
      uploaded_by:this.currentUser?.name||'秘書處 / 危機應變小組',
      date:todayISO()
    };
    if(mode==='edit'){
      const idx=data.manuals.findIndex(m=>m.id===id);
      if(idx>=0){
        if(!record.file_data && data.manuals[idx].file_data){ record.file_data=data.manuals[idx].file_data; record.file_name=data.manuals[idx].file_name; }
        data.manuals[idx]={...data.manuals[idx],...record};
      }
    }else{
      data.manuals.unshift(record);
    }
    this.saveCrisisData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'手冊已更新':'危機處理手冊已上傳','success');
    this.renderCrisisModule();
  }
,
  deleteCrisisManual(id){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60 && !this.isAdmin() && !this.isExecViceOrChair()){ showToast('僅管理員或副主席以上可刪除','error'); return; }
    if(!confirm('確定刪除此危機處理手冊？')) return;
    const data=this.getCrisisData();
    data.manuals=(data.manuals||[]).filter(m=>m.id!==id);
    this.saveCrisisData(data);
    showToast('手冊已刪除','warning');
    this.renderCrisisModule();
  }
,
  downloadCrisisManual(id){
    const data=this.getCrisisData();
    const m=(data.manuals||[]).find(x=>x.id===id);
    if(!m){ showToast('找不到手冊','error'); return; }
    if(m.file_data){ downloadDataUrl(m.file_name||(m.title+'.pdf'), m.file_data); showToast('已開始下載手冊','success'); return; }
    if(m.file_url && m.file_url!=='#'){ window.open(m.file_url,'_blank'); return; }
    if(m.description){
      const blob=new Blob([`${m.title}\n版本：${m.version}\n\n擇要：\n${m.summary}\n\n詳細內容：\n${m.description}`],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=(m.title+'.txt'); a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      showToast('已下載手冊文字內容','success');
      return;
    }
    showToast('此手冊暫未附加檔案或內容','warning');
  }
,
  toggleCrisisManualDetail(id){
    const el=document.getElementById('cman-detail-'+id);
    if(el) el.classList.toggle('hidden');
  }
,
  openCrisisManualInApp(id){
    const data=this.getCrisisData();
    const m=(data.manuals||[]).find(x=>x.id===id);
    if(!m){ showToast('找不到手冊','error'); return; }
    const driveId=this.docDriveId(m);
    let viewer='';
    if(m.file_data && String(m.file_data).startsWith('data:')){
      viewer=`<iframe src="${m.file_data}" class="w-full h-[75vh] rounded-xl border bg-white" title="手冊預覽"></iframe>`;
    } else if(driveId){
      viewer=`<iframe src="https://drive.google.com/file/d/${driveId}/preview" class="w-full h-[75vh] rounded-xl border" allow="autoplay" title="手冊預覽"></iframe>`;
    } else if(m.file_url){
      const url=m.file_url.includes('/preview')?m.file_url:m.file_url.replace('/view','/preview');
      viewer=`<iframe src="${escapeHtml(url)}" class="w-full h-[75vh] rounded-xl border" title="手冊預覽"></iframe>`;
    } else {
      viewer=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[12px] text-amber-900 leading-relaxed">尚未上載 PDF 檔案。管理員可於本分頁「上傳手冊檔案」加入 PDF 或 Google Drive 連結後，即可在 APP 內直接閱讀（不必先下載）。目前仍可查看下方章節摘要。</div>
        <div class="text-[12px] text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 border rounded-xl p-3.5 mt-2">${escapeHtml(m.description||m.summary||'')}</div>`;
    }
    document.getElementById('record-modal-title').textContent=m.title||'危機處理計劃手冊';
    document.getElementById('record-form-fields').innerHTML=`<div class="space-y-2">${viewer}<div class="text-[10px] text-slate-400 text-center">可於 APP 內翻頁閱讀；如預覽未能載入，請改用下載或外部連結。</div></div>`;
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  exportCrisisManuals(){
    const data=this.getCrisisData();
    const blob=new Blob([JSON.stringify(data.manuals||[],null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`crisis_manuals_${todayISO()}.json`; a.click();
    showToast('已匯出手冊清單 JSON','success');
  }
,
  // 依職稱關鍵字自動對應籌委成員（staff contacts 或 users），帶入姓名電話
  resolveCrisisTeam(data){
    const pool=this.getStaffData().contacts||[];
    // 合併 usersList（登入帳戶）確保電話來源更完整
    (this.usersList||[]).forEach(u=>{ if(!pool.some(c=>c.name===u.name)) pool.push({name:u.name,role_title:u.job_title||u.role,group_name:u.group_name,contact:u.contact||'',email:u.email||''}); });
    (data.team||[]).forEach(m=>{
      if(!m.auto) return;
      if(m.name && !m._manual) return; // 已手動填過則保留
      const kws=(m.match||[]).filter(k=>k);
      let hit=null;
      for(const kw of kws){
        if(!kw) continue;
        hit=pool.find(c=>{
          const r=c.role_title||''; const g=c.group_name||''; const n=c.name||'';
          if(kw==='行政') return (r.includes('行政')||g.includes('行政')) && !(r.includes('秘書')||g.includes('秘書'));
          return (r.includes(kw)||g.includes(kw)||n.includes(kw));
        });
        if(hit) break;
      }
      if(hit){ m.name=hit.name; m.phone=m.phone||hit.contact||''; m._resolvedBy=hit.role_title||hit.group_name; }
      // 後備：如已有 name 但無 phone，嘗試從 pool 補電話
      if(m.name && !m.phone){
        const byName=pool.find(c=>c.name===m.name);
        if(byName) m.phone=byName.contact||'';
      }
    });
    return data;
  }
,
  renderCrisisTeam(){
    const container=document.getElementById('crisis-tab-team'); if(!container) return;
    const data=this.resolveCrisisTeam(this.getCrisisData());
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    container.innerHTML=`
      <div class="space-y-3">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">危機應變小組以職位預設，登入後會自動對應到籌委成員（按職稱／組別），姓名電話自動帶入。如自動對應不正確，管理員／副主席以上可按 ✏️ 手動修改。</div>
        <div class="flex gap-2 flex-wrap">
          ${canEdit?`<button onclick="app.openCrisisTeamForm()" class="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增成員</button>`:''}
          <button onclick="app.exportCrisis()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button>
        </div>
        <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">角色</th><th class="px-2 py-1 text-left">姓名</th><th class="px-2 py-1 text-left">電話</th>${canEdit?'<th class="px-2 py-1 text-right">操作</th>':''}</tr></thead><tbody class="divide-y">${data.team.map(m=>`<tr><td class="px-2 py-1" data-label="角色">${escapeHtml(m.role)}${m.auto?'<span class="ml-1 bg-sky-100 text-sky-700 text-[9px] px-1.5 py-0.5 rounded-full border border-sky-200">自動</span>':''}</td><td class="px-2 py-1 font-bold" data-label="姓名">${escapeHtml(m.name)||'—'}${m._resolvedBy?`<div class="text-[9px] text-sky-600">自動對應：${escapeHtml(m._resolvedBy)}</div>`:''}</td><td class="px-2 py-1 font-mono" data-label="電話">${escapeHtml(m.phone)||'—'}</td>${canEdit?`<td class="px-2 py-1 text-right" data-label="操作"><button onclick="app.openCrisisTeamForm('${m.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button> <button onclick="app.deleteCrisisTeam('${m.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></td>`:''}</tr>`).join('')||'<tr><td colspan="4" class="px-2 py-4 text-center text-slate-400">暫無成員</td></tr>'}</tbody></table></div>
      </div>
    `;
  }
,
  renderCrisisContacts(){
    const container=document.getElementById('crisis-tab-contacts'); if(!container) return;
    const data=this.getCrisisData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    container.innerHTML=`
      <div class="space-y-3">
        <div class="flex gap-2 flex-wrap">
          ${canEdit?`<button onclick="app.openCrisisContactForm()" class="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增聯絡</button>`:''}
        </div>
        <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">單位</th><th class="px-2 py-1 text-left">聯絡人</th><th class="px-2 py-1 text-left">電話</th>${canEdit?'<th class="px-2 py-1 text-right">操作</th>':''}</tr></thead><tbody class="divide-y">${data.contacts.map(c=>`<tr><td class="px-2 py-1 font-medium" data-label="單位">${escapeHtml(c.org)}</td><td class="px-2 py-1" data-label="聯絡人">${escapeHtml(c.name)||'—'}</td><td class="px-2 py-1 font-mono" data-label="電話">${escapeHtml(c.phone)||'—'}</td>${canEdit?`<td class="px-2 py-1 text-right" data-label="操作"><button onclick="app.openCrisisContactForm('${c.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button> <button onclick="app.deleteCrisisContact('${c.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></td>`:''}</tr>`).join('')||'<tr><td colspan="4" class="px-2 py-4 text-center text-slate-400">暫無聯絡</td></tr>'}</tbody></table></div>
      </div>
    `;
  }
,
  renderCrisisDocs(){
    const container=document.getElementById('crisis-tab-docs'); if(!container) return;
    const data=this.getCrisisData();
    const canEdit=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    const cats=['定義','小組','天氣','傳染病','意外','事故','取消','急救','保險','其他'];
    container.innerHTML=`<div class="space-y-4">${cats.map(cat=>{
      const items=data.docs.filter(d=>d.category===cat);
      if(!items.length) return '';
      return `<div class="bg-white border rounded-xl p-4">
        <h4 class="font-bold text-[13px] mb-3 text-red-700"><i class="fa-solid fa-folder mr-2"></i>${escapeHtml(cat)}（${items.length}）</h4>
        <div class="space-y-2">${items.map(d=>`
          <div class="border rounded-xl p-3 bg-slate-50">
            <div class="flex justify-between items-start gap-2"><b class="text-[12px]">${escapeHtml(d.title)}</b>${canEdit?`<div class="flex gap-1 flex-shrink-0"><button onclick="app.openCrisisDocForm('${d.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteCrisisDoc('${d.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></div>`:''}</div>
            <div class="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">${escapeHtml(d.description)}</div>
          </div>`).join('')}</div>
        ${canEdit?`<button onclick="app.openCrisisDocForm(null,'${cat}')" class="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-plus mr-1"></i>新增${escapeHtml(cat)}指引</button>`:''}
      </div>`;
    }).join('')}</div>`;
  }
,
  openCrisisDocForm(id=null,cat='天氣'){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60){ showToast('僅管理員或副主席以上可編輯','error'); return; }
    const data=this.getCrisisData();
    const existing=id?data.docs.find(d=>d.id===id):null;
    let html=`<input type="hidden" id="cr-mode" value="${existing?'edit':'create'}"><input type="hidden" id="cr-id" value="${existing?.id||''}">
      <div><label class="text-[11px] font-bold">標題 *</label><input id="cr-title" value="${escapeHtml(existing?.title||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">分類</label><select id="cr-category" class="w-full px-3 py-2 border rounded-xl text-sm bg-white mt-1"><option value="定義">定義</option><option value="小組">小組</option><option value="天氣">天氣</option><option value="傳染病">傳染病</option><option value="意外">意外</option><option value="事故">事故</option><option value="取消">取消</option><option value="急救">急救</option><option value="保險">保險</option><option value="其他">其他</option></select></div>
      <div class="mt-3"><label class="text-[11px] font-bold">內容</label><textarea id="cr-desc" rows="6" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯危機指引':'新增危機指引';
    document.getElementById('record-form-fields').innerHTML=html;
    if(existing) document.getElementById('cr-category').value=existing.category; else document.getElementById('cr-category').value=cat;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitCrisisDocForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitCrisisDocForm(){
    const mode=document.getElementById('cr-mode').value, id=document.getElementById('cr-id').value;
    const title=document.getElementById('cr-title').value.trim(), category=document.getElementById('cr-category').value, description=document.getElementById('cr-desc').value.trim();
    if(!title){ showToast('請填寫標題','error'); return; }
    const data=this.getCrisisData();
    if(mode==='edit'){ const i=data.docs.findIndex(d=>d.id===id); if(i>=0) data.docs[i]={...data.docs[i],title,category,description}; }
    else data.docs.push({id:'cr_'+Date.now(),title,category,description,created_at:new Date().toISOString()});
    this.saveCrisisData(data); this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存','success'); this.renderCrisisModule();
  }
,
  deleteCrisisDoc(id){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60){ showToast('僅管理員或副主席以上可刪除','error'); return; }
    if(!confirm('確定刪除？')) return;
    const data=this.getCrisisData(); data.docs=data.docs.filter(d=>d.id!==id);
    this.saveCrisisData(data); this.renderCrisisModule();
  }
,
  openCrisisTeamForm(id=null){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60){ showToast('僅管理員或副主席以上可編輯','error'); return; }
    const data=this.getCrisisData();
    const existing=id?data.team.find(m=>m.id===id):null;
    let html=`<input type="hidden" id="ct-mode" value="${existing?'edit':'create'}"><input type="hidden" id="ct-id" value="${existing?.id||''}">
      <div><label class="text-[11px] font-bold">角色 *</label><input id="ct-role" value="${escapeHtml(existing?.role||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">姓名</label><input id="ct-name" value="${escapeHtml(existing?.name||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">電話</label><input id="ct-phone" value="${escapeHtml(existing?.phone||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯危機應變小組成員':'新增危機應變小組成員';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitCrisisTeamForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitCrisisTeamForm(){
    const mode=document.getElementById('ct-mode').value, id=document.getElementById('ct-id').value;
    const role=document.getElementById('ct-role').value.trim(), name=document.getElementById('ct-name').value.trim(), phone=document.getElementById('ct-phone').value.trim();
    if(!role){ showToast('請填寫角色','error'); return; }
    const data=this.getCrisisData();
    if(mode==='edit'){ const i=data.team.findIndex(m=>m.id===id); if(i>=0) data.team[i]={...data.team[i],role,name,phone}; }
    else data.team.push({id:'ct_'+Date.now(),role,name,phone});
    this.saveCrisisData(data); this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存','success'); this.renderCrisisModule();
  }
,
  deleteCrisisTeam(id){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60){ showToast('僅管理員或副主席以上可刪除','error'); return; }
    if(!confirm('確定刪除？')) return;
    const data=this.getCrisisData(); data.team=data.team.filter(m=>m.id!==id);
    this.saveCrisisData(data); this.renderCrisisModule();
  }
,
  openCrisisContactForm(id=null){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60){ showToast('僅管理員或副主席以上可編輯','error'); return; }
    const data=this.getCrisisData();
    const existing=id?data.contacts.find(c=>c.id===id):null;
    let html=`<input type="hidden" id="cc-mode" value="${existing?'edit':'create'}"><input type="hidden" id="cc-id" value="${existing?.id||''}">
      <div><label class="text-[11px] font-bold">單位 *</label><input id="cc-org" value="${escapeHtml(existing?.org||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">聯絡人</label><input id="cc-name" value="${escapeHtml(existing?.name||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">電話</label><input id="cc-phone" value="${escapeHtml(existing?.phone||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯緊急聯絡':'新增緊急聯絡';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitCrisisContactForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitCrisisContactForm(){
    const mode=document.getElementById('cc-mode').value, id=document.getElementById('cc-id').value;
    const org=document.getElementById('cc-org').value.trim(), name=document.getElementById('cc-name').value.trim(), phone=document.getElementById('cc-phone').value.trim();
    if(!org){ showToast('請填寫單位','error'); return; }
    const data=this.getCrisisData();
    if(mode==='edit'){ const i=data.contacts.findIndex(c=>c.id===id); if(i>=0) data.contacts[i]={...data.contacts[i],org,name,phone}; }
    else data.contacts.push({id:'cc_'+Date.now(),org,name,phone});
    this.saveCrisisData(data); this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存','success'); this.renderCrisisModule();
  }
,
  deleteCrisisContact(id){
    if((ROLE_HIERARCHY[this.currentUser?.role]||0)<60){ showToast('僅管理員或副主席以上可刪除','error'); return; }
    if(!confirm('確定刪除？')) return;
    const data=this.getCrisisData(); data.contacts=data.contacts.filter(c=>c.id!==id);
    this.saveCrisisData(data); this.renderCrisisModule();
  }
,
  exportCrisis(){
    const data=this.getCrisisData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`crisis_${todayISO()}.json`; a.click();
  }
,
  getAdminGroupData(){
    const key=LS.config(this.currentEvent?.event_id||'isd_2026')+'_admin_group';
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local) return local;
    if(!this.isDemoEvent()) return {docs:[],tickets:[]}; // 真實活動：預留版位
    return {docs:[
      {id:'admin_1',title:'活動通告 sp12_25_isd2025.pdf',category:'通告',description:'舊版行政組活動通告，參考舊手冊行政組頁面',file_url:'',created_at:''},
      {id:'admin_2',title:'報名表格 sp12a_25_isd2025enrollform.pdf',category:'報名',description:'舊版報名表',file_url:'',created_at:''},
      {id:'admin_3',title:'參加旅團名單 20251012',category:'名單',description:'旅團報名人數延期舉行版',file_url:'',created_at:''},
      {id:'admin_4',title:'膳食安排',category:'膳食',description:'膳食安排圖片 (舊手冊行政組)',file_url:'',created_at:''}
    ], tickets:[
      {id:'tk_1',name:'遊戲券',desc:'攤位遊戲用，參加者集印花換紀念品'},
      {id:'tk_2',name:'水券',desc:'憑券到飲水站換取飲用水'},
      {id:'tk_3',name:'飯券',desc:'工作人員午膳憑券領取飯盒'}
    ]};
  }
,
  saveAdminGroupData(data){ localStorage.setItem(LS.config(this.currentEvent?.event_id||'isd_2026')+'_admin_group', JSON.stringify(data)); }
,
  renderAdminGroupModule(){
    const container=document.getElementById('module-content');
    const data=this.getAdminGroupData();
    const canUpload=this.canUploadDocument()||this.isAdmin();
    const participants=this.getParticipantsData();
    const pSrc=this.eventData['participants_source']||{};
    // 財務已歸入行政組：在此顯示概覽 + 快速入口（完整財務頁仍可用）
    const fin=this.getFinanceData();
    const budgets=fin.group_itemized_budgets||[];
    const budgetItems=budgets.reduce((s,g)=>s+(g.items||[]).length,0);
    const expenses=fin.expenses||[];
    const pendingExp=expenses.filter(e=>e.status==='pending').length;
    const incomeTotal=(fin.income||[]).reduce((s,i)=>s+(parseFloat(i.actual)||0),0);
    const expenseTotal=expenses.reduce((s,e)=>s+(parseFloat(e.actual)||0),0);
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] leading-relaxed"><b>🏢 行政組 (完全取代舊手冊行政組頁面)：</b><br>舊版有活動通告、報名表、急救申請、膳食安排、參加旅團名單，現全部整合至此卡片，公開可看，僅修改需登入，部門間溝通更完善</div>
        <div class="flex gap-2 flex-wrap">
          <button onclick="app.openModule('apply_hub')" class="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-pen mr-1"></i>前往申請中心提交申請</button>
          <button onclick="app.openModule('my_monitor')" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-eye mr-1"></i>我的監察</button>
        </div>
        ${this.groupInfoBoxesHTML('行政組')}
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div class="flex justify-between items-center mb-2 flex-wrap gap-2">
            <h4 class="font-bold text-[13px] flex items-center gap-2"><i class="fa-solid fa-wallet text-amber-600"></i>💰 財務管理（行政組轄下）</h4>
            <button onclick="app.openModule('finance')" class="bg-amber-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-expand mr-1"></i>進入完整財務頁</button>
          </div>
          <div class="text-[11px] text-slate-600 mb-3">財務屬行政組管轄（對應舊手冊「行政組/財務」資料夾），故不另設獨立卡片：指引、預算、開支申報、口頭報價、結算批核全部在此處理。</div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <div class="bg-white border rounded-xl p-2.5 text-center"><div class="text-[10px] text-slate-500">預算組別 / 項目</div><div class="font-bold text-sm text-amber-700">${budgets.length} / ${budgetItems}</div></div>
            <div class="bg-white border rounded-xl p-2.5 text-center"><div class="text-[10px] text-slate-500">收入 (實際)</div><div class="font-bold text-sm text-emerald-700">$${incomeTotal.toLocaleString()}</div></div>
            <div class="bg-white border rounded-xl p-2.5 text-center"><div class="text-[10px] text-slate-500">開支 (實際)</div><div class="font-bold text-sm text-rose-600">$${expenseTotal.toLocaleString()}</div></div>
            <div class="bg-white border rounded-xl p-2.5 text-center"><div class="text-[10px] text-slate-500">待批開支</div><div class="font-bold text-sm ${pendingExp?'text-amber-600':'text-slate-400'}">${pendingExp} 項</div></div>
          </div>
          <div class="flex gap-2 flex-wrap">
            <button onclick="app.openFinanceFromAdminGroup('guidance')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-book text-amber-600 mr-1"></i>財務指引</button>
            <button onclick="app.openFinanceFromAdminGroup('budgets')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-wallet text-amber-600 mr-1"></i>預算明細</button>
            <button onclick="app.openFinanceFromAdminGroup('expense')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-receipt text-emerald-600 mr-1"></i>開支申報${pendingExp?`<span class="ml-1 bg-amber-500 text-white text-[9.5px] px-1.5 py-0.5 rounded-full">${pendingExp}</span>`:''}</button>
            <button onclick="app.openFinanceFromAdminGroup('oral_quotes')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-file-signature text-indigo-600 mr-1"></i>口頭報價</button>
            <button onclick="app.openFinanceFromAdminGroup('settlement')" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-print text-slate-600 mr-1"></i>結算總表</button>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">${canUpload?`<button onclick="app.openAdminDocForm()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">+ 上傳文件</button>`:''}<button onclick="app.exportAdminGroup()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button></div>
        <div class="bg-white border rounded-xl p-4">
          <div class="flex justify-between items-center mb-2"><h4 class="font-bold text-[13px] flex items-center gap-2"><i class="fa-solid fa-people-group text-emerald-700"></i>參加旅團名單 (${participants.length})</h4><div class="flex gap-2 flex-wrap"><button onclick="app.syncParticipantsFromDrive()" class="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步</button>${canUpload?`<label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer">上傳 Excel<input type="file" accept=".xlsx,.xls" class="hidden" onchange="app.handleParticipantsExcelUpload(this.files[0])"></label>`:''}<button onclick="app.downloadParticipantsTemplate()" class="bg-white border px-3 py-1.5 rounded-xl text-[11px] font-bold">下載欄位範本 CSV</button></div></div>
          ${(pSrc.sheet_id||pSrc.drive_file_id)?`<div class="text-[10px] text-slate-500 mb-2">來源：「${escapeHtml(pSrc.name||'參加旅團名單')}」由行政組更新，可一鍵／自動同步。${this.driveSyncNotice()}</div>`:'<div class="text-[10px] text-slate-400 mb-2">尚未設定名單來源（participants_source）。行政組提供 Google Sheet 後即可同步。</div>'}
          <div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">旅團</th><th class="px-2 py-1 text-left">支部</th><th class="px-2 py-1 text-left">人數</th><th class="px-2 py-1 text-left">備註</th></tr></thead><tbody class="divide-y">${participants.map(p=>`<tr><td class="px-2 py-1 font-medium" data-label="旅團">${escapeHtml(p.unit_name)}</td><td class="px-2 py-1" data-label="支部">${escapeHtml(p.section||'')}</td><td class="px-2 py-1" data-label="人數">${escapeHtml(p.headcount||'')}</td><td class="px-2 py-1" data-label="備註">${escapeHtml(p.notes||'')}</td></tr>`).join('') || '<tr><td colspan="4" class="px-2 py-4 text-center text-slate-400">暫無參加旅團資料</td></tr>'}</tbody></table></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${data.docs.map(d=>`
          <div class="border rounded-xl p-4 bg-white space-y-2">
            <div class="flex justify-between"><b class="text-[13px]">${escapeHtml(d.title)}</b><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(d.category)}</span></div>
            <div class="text-[11px] text-slate-600">${escapeHtml(d.description)}</div>
            <div class="flex gap-2">${canUpload?`<button onclick="app.openAdminDocForm('${d.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteAdminDoc('${d.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`:''}</div>
          </div>
        `).join('')}</div>
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div class="flex justify-between items-center mb-3"><h4 class="font-bold text-[13px] flex items-center gap-2"><i class="fa-solid fa-ticket text-indigo-600"></i>票券（行政組專用）</h4>${canUpload?`<button onclick="app.openAdminTicketForm()" class="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"><i class="fa-solid fa-plus mr-1"></i>新增票券</button>`:''}</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">${data.tickets.map(t=>`
            <div class="border rounded-xl p-3 bg-white">
              <div class="flex justify-between items-start gap-2"><b class="text-[13px]">${escapeHtml(t.name)}</b>${canUpload?`<div class="flex gap-1 flex-shrink-0"><button onclick="app.openAdminTicketForm('${t.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">✏️</button><button onclick="app.deleteAdminTicket('${t.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button></div>`:''}</div>
              <div class="text-[11px] text-slate-600 mt-1">${escapeHtml(t.desc)}</div>
            </div>`).join('')||'<p class="text-xs text-slate-400">暫無票券</p>'}
          </div>
        </div>
      </div>
    `;
  }
,
  openFinanceFromAdminGroup(tab){
    this.financeSubTab=tab||'guidance';
    this.openModule('finance');
  }
,
  openAdminTicketForm(id=null){
    if(!(this.canUploadDocument()||this.isAdmin())){ showToast('僅管理員/行政總主任以上可編輯','error'); return; }
    const data=this.getAdminGroupData();
    const existing=id?data.tickets.find(t=>t.id===id):null;
    let html=`<input type="hidden" id="tk-mode" value="${existing?'edit':'create'}"><input type="hidden" id="tk-id" value="${existing?.id||''}"><div><label class="text-[11px] font-bold">票券名稱</label><input id="tk-name" value="${escapeHtml(existing?.name||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div><div class="mt-3"><label class="text-[11px] font-bold">用途/說明</label><textarea id="tk-desc" rows="3" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.desc||'')}</textarea></div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯票券':'新增票券（行政組）';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitAdminTicketForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitAdminTicketForm(){
    const mode=document.getElementById('tk-mode').value, id=document.getElementById('tk-id').value;
    const name=document.getElementById('tk-name').value.trim(), desc=document.getElementById('tk-desc').value.trim();
    if(!name){ showToast('請填寫票券名稱','error'); return; }
    const data=this.getAdminGroupData();
    if(mode==='edit'){ const i=data.tickets.findIndex(t=>t.id===id); if(i>=0) data.tickets[i]={...data.tickets[i],name,desc}; }
    else data.tickets.push({id:'tk_'+Date.now(),name,desc});
    this.saveAdminGroupData(data); this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存','success'); this.renderAdminGroupModule();
  }
,
  deleteAdminTicket(id){
    if(!(this.canUploadDocument()||this.isAdmin())){ showToast('僅管理員/行政總主任以上可刪除','error'); return; }
    if(!confirm('確定刪除？')) return;
    const data=this.getAdminGroupData(); data.tickets=data.tickets.filter(t=>t.id!==id);
    this.saveAdminGroupData(data); this.renderAdminGroupModule();
  }
,
  openAdminDocForm(id=null){
    if(!this.canUploadDocument() && !this.isAdmin()){ showToast('僅管理員/行政組總主任以上可上傳','error'); return; }
    const data=this.getAdminGroupData();
    const existing=id?data.docs.find(d=>d.id===id):null;
    let html=`<input type="hidden" id="admin-doc-mode" value="${existing?'edit':'create'}"><input type="hidden" id="admin-doc-id" value="${existing?.id||''}">
      <div><label class="text-[11px] font-bold">標題 *</label><input id="admin-doc-title" value="${escapeHtml(existing?.title||'')}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">分類</label><input id="admin-doc-category" value="${escapeHtml(existing?.category||'通告')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
      <div class="mt-3"><label class="text-[11px] font-bold">描述</label><textarea id="admin-doc-desc" rows="3" class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>`;
    document.getElementById('record-modal-title').textContent=existing?'編輯行政文件':'新增行政文件';
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitAdminDocForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  submitAdminDocForm(){
    const mode=document.getElementById('admin-doc-mode').value;
    const id=document.getElementById('admin-doc-id').value;
    const title=document.getElementById('admin-doc-title').value.trim();
    const category=document.getElementById('admin-doc-category').value.trim();
    const desc=document.getElementById('admin-doc-desc').value.trim();
    if(!title){ showToast('請填寫標題','error'); return; }
    const data=this.getAdminGroupData();
    if(mode==='edit'){
      const idx=data.docs.findIndex(d=>d.id===id);
      if(idx>=0) data.docs[idx]={...data.docs[idx], title, category, description:desc};
    }else data.docs.push({id:'admin_'+Date.now(), title, category, description:desc, created_at:new Date().toISOString()});
    this.saveAdminGroupData(data);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast('已保存行政文件','success');
    this.renderAdminGroupModule();
  }
,
  deleteAdminDoc(id){
    if(!this.isAdmin()) return;
    if(!confirm('確定刪除？')) return;
    const data=this.getAdminGroupData();
    data.docs=data.docs.filter(d=>d.id!==id);
    this.saveAdminGroupData(data);
    this.renderAdminGroupModule();
  }
,
  exportAdminGroup(){
    const data=this.getAdminGroupData();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`admin_group_${todayISO()}.json`; a.click();
  }
,
  getCoordinatorGroupData(){
    const key=LS.config(this.currentEvent?.event_id||'isd_2026')+'_coord_group';
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local) return local;
    if(!this.isDemoEvent()) return {docs:[]}; // 真實活動：預留版位
    return {docs:[
      {id:'coord_1',title:'ISD2024 Site Setup Plan R7-SETUP PLAN.pdf',category:'場地佈置',description:'舊版協調組場地佈置圖，參考舊手冊協調組頁面',file_url:'',created_at:''},
      {id:'coord_2',title:'物資借用表格 v.3 Fillable Form.pdf',category:'物資借用',description:'物資借用表格，可填寫',file_url:'',created_at:''},
      {id:'coord_3',title:'箱頭紙.pdf',category:'箱頭紙',description:'箱頭紙範本',file_url:'',created_at:''},
      {id:'coord_4',title:'場地佈置數據（2025）',category:'數據',description:'Spreadsheet 連結，舊版 場地佈置數據（2025）',file_url:'https://drive.google.com/open?id=1dLQnhQlA8MPpKkGHvHmtVZmI9IAVcDkrw8mt7b3S3WI',created_at:''}
    ]};
  }
,
  saveCoordinatorGroupData(data){ localStorage.setItem(LS.config(this.currentEvent?.event_id||'isd_2026')+'_coord_group', JSON.stringify(data)); }
,
  // 動作後重新整理：留在目前所在的頁面（協調組 / 物資 / 攤位物資 / 膳食）
  refreshSuppliesViews(){
    if(this.currentModule==='coordinator_group'){ this.renderCoordinatorGroupModule(); return; }
    if(this.currentModule==='group_management' && this.currentGroupManaged){ this.openGroupManagement(this.currentGroupManaged); return; }
    if(this.currentModule==='my_monitor'){ this.renderMyMonitorModule(); return; }
    if(this.currentModule==='booth'){ this.renderBoothModule(); return; } // v8.6：攤位物資＝獨立模組，提交後留在本頁刷新
    if(document.getElementById('supplies-tab-requests')) this.renderSuppliesModule();
  }
,
  refreshMealsViews(){
    if(this.currentModule==='coordinator_group'){ this.renderCoordinatorGroupModule(); return; }
    if(this.currentModule==='group_management' && this.currentGroupManaged){ this.openGroupManagement(this.currentGroupManaged); return; }
    if(this.currentModule==='my_monitor'){ this.renderMyMonitorModule(); return; }
    if(document.getElementById('meals-tab-menus')) this.renderMealsModule();
  }
,
});
