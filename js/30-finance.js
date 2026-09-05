/* 30-finance.js — 由 index.html 內嵌腳本原樣拆出（v-split 2026-08-27）；方法內容未經任何改寫 */
Object.assign(ScoutEventApp.prototype,{

  /* ===================== Finance Enhanced Module v6.4 ===================== */
  getFinanceData(){
    const key=LS.finance?LS.finance(this.currentEvent?.event_id||'isd_2026'):`event_finance_v6_${this.currentEvent?.event_id||'isd_2026'}`;
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(local){
      (local.group_itemized_budgets||[]).forEach(b=>{b.group_name=normalizeGroupName(b.group_name);});
      (local.income||[]).forEach(i=>{i.group_name=normalizeGroupName(i.group_name);});
      const deleted=this.getDeletedRecordIds('Finance_Expenses');
      local.expenses=(local.expenses||[]).filter(e=>!deleted.has(String(e.id)));
      local.expenses.forEach(e=>{e.group_name=normalizeGroupName(e.group_name);});
      return local;
    }
    const raw=this.eventData['finance']||{group_itemized_budgets:[],income:[],expenses:[]};
    // Normalize expenses
    return {
      group_itemized_budgets: (raw.group_itemized_budgets||[]).map(b=>({...b,group_name:normalizeGroupName(b.group_name||b.group)})),
      income: (raw.income||[]).map(i=>({...i,group_name:normalizeGroupName(i.group_name||i.group)})),
      expenses: (raw.expenses||[]).map((e,i)=>({
        id:e.id||'exp_'+i,
        voucher:e.voucher||'',
        item_name:e.item_name||e.item||'',
        group_name:normalizeGroupName(e.group_name),
        budget:e.budget||0,
        actual:e.actual||e.actual_amt||0,
        date:e.date||'',
        description:e.description||e.notes||'',
        receipt_name:e.receipt_name||'',
        receipt_data:e.receipt_data||'',
        receipt_url:e.receipt_url||'',
        status:e.status||'pending',
        submitted_by:e.submitted_by||'',
        submitted_by_id:e.submitted_by_id||'',
        requester_role:e.requester_role||'',
        group_confirmation_status:e.group_confirmation_status||'',
        group_confirmed_by:e.group_confirmed_by||'',
        group_confirmed_at:e.group_confirmed_at||'',
        approved_by:e.approved_by||'',
        created_at:e.created_at||''
      })).filter(e=>!this.getDeletedRecordIds('Finance_Expenses').has(String(e.id))),
      drive_folder_link: raw.drive_folder_link||'https://drive.google.com/drive/folders/1zkJI5Yp1xv6PNSp8e7kJRKcjRjlyDO8C?usp=sharing',
      drive_folder_id: '1zkJI5Yp1xv6PNSp8e7kJRKcjRjlyDO8C',
      budget_source: raw.budget_source||null
    };
  }
,
  saveFinanceData(data){
    const eid=this.currentEvent?.event_id||'isd_2026';
    const key=LS.finance?LS.finance(eid):`event_finance_v6_${eid}`;
    localStorage.setItem(key, JSON.stringify(data));
    this.eventData['finance']=data;
    if(!this.mockMode&&this.gasUrl){
      (data.expenses||[]).forEach(e=>{
        const record={id:e.id,event_id:e.event_id||eid,voucher:e.voucher||'',item_name:e.item_name||'',group_name:e.group_name||'',budget:e.budget||0,actual:e.actual||0,date:e.date||'',description:e.description||'',receipt_name:e.receipt_name||'',receipt_url:e.receipt_url||'',status:e.status||'pending',submitted_by:e.submitted_by||'',submitted_by_id:e.submitted_by_id||'',requester_role:e.requester_role||'',group_confirmation_status:e.group_confirmation_status||'',group_confirmed_by:e.group_confirmed_by||'',group_confirmed_at:e.group_confirmed_at||'',approved_by:e.approved_by||'',approved_at:e.approved_at||'',created_at:e.created_at||''};
        fetch(this.gasUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'saveRecord',api_key:this.apiKey,module:'Finance_Expenses',record})}).catch(()=>{});
      });
    }
  }
,
  renderFinanceModule(){
    const container=document.getElementById('module-content');
    const isAdmin=this.isAdmin();
    const canApprove=(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60;
    if(!this.financeSubTab) this.financeSubTab='guidance';
    const fin=this.getFinanceData();
    const folderLink=fin.drive_folder_link||'https://drive.google.com/drive/folders/1zkJI5Yp1xv6PNSp8e7kJRKcjRjlyDO8C?usp=sharing';
    // Drive files list from user provided
    const driveFiles=[
      {name:'ISD2026 財務指引及會計程序 ver 1.docx', id:'1QNWNG1BnVab3oHlI7yvIK_2YMMSFV-p4', type:'docx', desc:'總指引，含報銷程序、預算控制、會計程序'},
      {name:'ISD2026 附件1 - 報價要求.docx', id:'176X1zGzH_k7DJzzuzE5fHkAr6GE3_IHm', type:'docx', desc:'報價要求範本'},
      {name:'ISD2026 附件2 - 豁免商戶名單 (Rev Dec 2025).pdf', id:'1Z_VqtQ1LjKGI7fFqRCvN9sI8XrmJLbL2', type:'pdf', desc:'豁免報價商戶清單'},
      {name:'ISD2026 附件3 - 口頭報價資料記錄.xlsx', id:'1s5X9v7FJfbCZG1zDX5GX_yXpE2C_8BIq', type:'xlsx', desc:'口頭報價記錄表格'},
      {name:'ISD2026 附件4 - 書面報價比較表.docx', id:'1Qal9KVjgN54cb6GwxideH_lsRXJquVWy', type:'docx', desc:'書面報價比較表 (需3間報價)'},
      {name:'ISD2026 附件5 - 結算總表 (WORD).docx', id:'1FwpuK79mWDToX_p_csO_8Fg085lT0QkC', type:'docx', desc:'結算總表 Word 版'},
      {name:'ISD2026 附件5A - 結算總表 (WORD w autosum).docx', id:'16krtzQYD11b2cyL8h_Qdb0a8X4_wyDN-', type:'docx', desc:'結算總表 Word 自動計算版'},
      {name:'ISD2026 附件5B - 結算總表 (EXCEL).xlsx', id:'1boZYb4XxiZllAP_2sxxcdatiOQIZMfbJ', type:'xlsx', desc:'結算總表 Excel 版 (推薦)'},
      {name:'ISD2026 附件6 - 四格印簽名位置.docx', id:'19bmvieiDcnFBcQ6qPAGagN8UDXc3tAG2', type:'docx', desc:'簽名位置範本'},
    ];
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed">
          <b>💰 財務卡片升級：</b><b>財務指引全文已內建（官方定稿，不會再改）</b>——「指引文件」分頁直接閱讀，毋須開彈窗；原版檔案保留喺 Drive 作下載 <a href="${folderLink}" target="_blank" class="text-sky-700 underline">📂 資料夾</a><br>
          • 所有工作人員可查閱指引（內建全文，毋須登入／毋須開 Drive APP）<br>
          • 表格可在 APP 內填寫 + 上傳單據副本 (支援指定資料夾)<br>
          • 可列印結算總表 (含四格印簽名) + 批核功能 + 後台紀錄
        </div>
        <div class="flex gap-2 border-b pb-3 overflow-x-auto flex-wrap">
          <button onclick="app.switchFinanceTab('guidance')" class="tab-btn ${this.financeSubTab==='guidance'?'active':''}"><i class="fa-solid fa-book mr-1"></i> 財務指引（內建全文）</button>
          <button onclick="app.switchFinanceTab('budgets')" class="tab-btn ${this.financeSubTab==='budgets'?'active':''}"><i class="fa-solid fa-wallet mr-1"></i> 預算明細</button>
          <button onclick="app.switchFinanceTab('expense')" class="tab-btn ${this.financeSubTab==='expense'?'active':''}"><i class="fa-solid fa-receipt mr-1"></i> 開支申報 (填表+上傳單據)</button>
          <button onclick="app.switchFinanceTab('oral_quotes')" class="tab-btn ${this.financeSubTab==='oral_quotes'?'active':''}"><i class="fa-solid fa-file-signature mr-1"></i> 口頭報價登記</button>
          <button onclick="app.switchFinanceTab('settlement')" class="tab-btn ${this.financeSubTab==='settlement'?'active':''}"><i class="fa-solid fa-print mr-1"></i> 結算總表 (列印+批核)</button>
        </div>
        <div id="finance-tab-guidance" class="${this.financeSubTab==='guidance'?'':'hidden'}"></div>
        <div id="finance-tab-budgets" class="${this.financeSubTab==='budgets'?'':'hidden'}"></div>
        <div id="finance-tab-expense" class="${this.financeSubTab==='expense'?'':'hidden'}"></div>
        <div id="finance-tab-oral_quotes" class="${this.financeSubTab==='oral_quotes'?'':'hidden'}"></div>
        <div id="finance-tab-settlement" class="${this.financeSubTab==='settlement'?'':'hidden'}"></div>
      </div>
    `;
    this.renderFinanceGuidance(driveFiles, folderLink);
    this.renderFinanceBudgets();
    this.renderFinanceExpense();
    this.renderFinanceOralQuotesTab();
    this.renderFinanceSettlement();
  }
,
  switchFinanceTab(tab){
    this.financeSubTab=tab;
    document.querySelectorAll('[id^="finance-tab-"]').forEach(el=>el.classList.add('hidden'));
    document.getElementById('finance-tab-'+tab)?.classList.remove('hidden');
    document.querySelectorAll('[onclick^="app.switchFinanceTab"]').forEach(btn=>{
      const t=btn.getAttribute('onclick').match(/'([^']+)'/)[1];
      btn.className=t===tab?'tab-btn active':'tab-btn';
    });
  }
,
  renderFinanceOralQuotesTab(){
    const container=document.getElementById('finance-tab-oral_quotes'); if(!container) return;
    const canRecord=this.canRecordOralQuote();
    const data=this.getOralQuotesData();
    const canAll=this.canViewOralQuotesAll();
    const quotes=(data.quotes||[]).filter(q=>this.canViewOralQuote(q)).sort((a,b)=> (b.quote_date||'').localeCompare(a.quote_date||''));
    container.innerHTML=`
      <div class="space-y-3">
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] leading-relaxed text-indigo-900">
          <b>📝 口頭報價登記（對應附件3 口頭報價資料記錄）：</b>總主任以上可登記；行政組及執行副主席以上可查看全部，登記人及該組上級可查看本組/自己。報價金額達 $500 或以上須作書面報價（見財務指引）。<br>
          <span class="text-[10px] text-indigo-700">此分頁與「口頭報價登記」卡片內容一致，方便在財務內一併處理。</span>
        </div>
        <div class="flex gap-2 flex-wrap">
          ${canRecord?`<button onclick="app.openOralQuoteForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>登記口頭報價</button>`:''}
          <button onclick="app.exportOralQuotes()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出</button>
          <span class="text-[11px] bg-indigo-100 text-indigo-700 px-3 py-2 rounded-full border border-indigo-200">可見 ${quotes.length} 筆${canAll?'（全部）':'（本組/自己）'}</span>
        </div>
        <div class="space-y-3">${quotes.length?quotes.map(q=>`
          <div class="border rounded-xl p-3 bg-white space-y-1">
            <div class="flex justify-between items-start gap-2 flex-wrap">
              <div class="flex flex-wrap items-center gap-2"><b class="text-[13px]">${escapeHtml(q.vendor||'-')}</b><span class="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full border">${escapeHtml(q.group_name||'-')}</span><span class="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full border border-indigo-200">$${Number(q.amount)||0}</span></div>
              <div class="text-[10px] text-slate-400">${escapeHtml(q.quote_date||'')} | 登記人: ${escapeHtml(q.quoted_by||'-')}</div>
            </div>
            <div class="text-[11px] text-slate-600">項目: ${escapeHtml(q.item_desc||'-')}</div>
            <div class="text-[11px] text-slate-500">聯絡: ${escapeHtml(q.contact_person||'-')} ${q.contact_phone?`| ${escapeHtml(q.contact_phone)}`:''}</div>
            ${q.notes?`<div class="text-[10px] bg-slate-50 border rounded-xl p-2 mt-1">${escapeHtml(q.notes)}</div>`:''}
          </div>`).join(''):'<p class="text-xs text-slate-400 py-8 text-center">暫無口頭報價登記</p>'}</div>
      </div>`;
  }
,
  // v8.2：財務指引全文內建（官方定稿，不會再改）——直接喺頁面內閱讀，唔使開彈窗／Drive APP。
  financeGuideSections(){
    return [
      {id:'purpose',title:'一、適用範圍與基本原則',open:true,blocks:[
        {h:'適用範圍',items:['本指引適用於 2026 港島童軍繽紛日籌備委員會各組別之所有開支、報銷、預算控制及會計程序。','財政由行政組財政主任統籌、秘書處支援；所有報價、單據及結算文件副本交行政組存檔。']},
        {h:'基本原則',items:['先預算、後開支：開支須在已批核預算之內；超出預算須先獲批核。','先報價、後購買：未按規定取得報價及批核之開支，可能不獲發還。','單據必須保留：所有開支須附單據正本（豁免名單內商戶亦同）。','所有金額以港幣計算；同一項目不得拆單以規避報價門檻。']}
      ]},
      {id:'quote',title:'二、報價要求一覽（附件1 報價要求及批核人士）',open:true,blocks:[
        {h:'按銀碼之報價及批核',table:[['支出金額','報價要求','批核人士 (申請→批→再確認)'],['豁免名單 ≤$2,000 或其他 ≤$500','無須報價','各副主席批核'],['豁免 >$2,000 或其他 >$500–$5,000','1 個口頭報價（附件3）','各副主席推薦 → 主席批核'],['$5,001–$30,000','2 個口頭報價','主席推薦 → 助理地域總監(活動) 認可 → 副地域總監(活動與訓練) 批核'],['$10,001–$300,000','3 個書面報價（附件4）','主席推薦 → 助理地域總監認可 → 副地域總監批核'],['$30,001–$100,000','2 個書面報價（附件4）','主席推薦 → 助理地域總監認可 → 副地域總監批核'],['$300,001–$1,000,000','5 個書面報價（附件4）','主席推薦 → 助理地域總監(活動) 及 副地域總監認可 → 地域總監批核'],['超過 $1,000,000','投標，至少 5 個報價','投標小組委員會推薦 → 地域總監批核']],items:['批核鏈按「總銀碼」計算，唔係逐張單據；結算總表會按總額顯示對應批核鏈。','口頭報價用附件3 登記、書面報價用附件4 比較表，兩者副本都要交行政組。']}
      ]},
      {id:'exempt',title:'三、豁免報價商戶（附件2，Rev Dec 2025）',open:false,blocks:[
        {h:'重點',items:['附件2 清單內商戶可豁免報價程序，但必須保留單據正本並交行政組。','豁免上限：每項 $\u200B2,000 或以內免報價；超過 $2,000 仍須按附件1 程序處理。','豁免清單版本：Rev Dec 2025；僅以最新版本有效。','豁免商戶全名單以附件2 文件為準（下方原版檔案可下載）。']}
      ]},
      {id:'oral',title:'四、口頭報價程序（附件3 口頭報價資料記錄）',open:false,blocks:[
        {h:'記錄欄位（每項必填）',items:['報價日期','項目／服務內容','商戶名稱、聯絡人及聯絡電話','報價金額（港幣）','記錄人（總主任或以上）及所屬組別']},
        {h:'程序',items:['適用於超過 $500（豁免名單 $2,000）至 $5,000 之開支：1 個口頭報價，各副主席推薦後由主席批核。','記錄後副本交行政組存檔；APP「口頭報價登記」分頁可直接登記（等同填寫附件3）。','報價金額達 $5,000 以上須改用書面報價並按附件1 批核鏈處理。']}
      ]},
      {id:'written',title:'五、書面報價比較表（附件4）',open:false,blocks:[
        {h:'要求',items:['適用於 $5,001 或以上之開支（按銀碼需 2–5 個書面報價，見附件1 表）。','最少比較 3 間供應商；比較表須列明：供應商名稱、規格／內容、單價、總價、選取理由。']},
        {h:'批核鏈',items:['主席推薦 → 助理地域總監（活動）認可 → 副地域總監（活動與訓練）批核。','$300,001 以上：助理地域總監及副地域總監共同認可後，由地域總監批核。','超過 $1,000,000：須投標（至少 5 個報價），投標小組委員會推薦，地域總監批核。']}
      ]},
      {id:'settle',title:'六、結算總表（附件5／5A／5B）',open:false,blocks:[
        {h:'版本',items:['附件5：Word 手動版；附件5A：Word 自動計算版；附件5B：Excel 版（推薦，自動計算）。']},
        {h:'填寫重點',items:['逐項列出：憑單編號、支出項目、組別、預算金額、實際金額、日期、批核鏈。','APP「結算總表」分頁已內建同一格式，可直接列印（含四格印簽署位置及按銀碼批核鏈）。','活動結束後按行政組通知之截數日期前交回，連同全部單據正本。']}
      ]},
      {id:'stamp',title:'七、四格印簽署位置（附件6）',open:false,blocks:[
        {h:'四格位置',items:['第一格（經辦人／申請人）：填寫人姓名及貼上單據；經辦人無須簽署。','第二格 Checked by：各組副主席簽名，核實支出屬實。','第三格 Certified by：財政主任 或 總主任（行政）或 副主席（行政）簽名，審核單據真確性及金額是否在預算之內（不超出預算方簽署）。','第四格 Approved：按銀碼由主席／助理地域總監／副地域總監／地域總監批核（見附件1）。']},
        {h:'蓋印要求',items:['所有單據需蓋上四格印，印章至少 1/3 蓋在單據之上（防止重用）。','熱感式單據（如超級市場收據）須先影印，並在副本加蓋「COPY」章後使用。','支票／付款安排由秘書處辦理。']}
      ]},
      {id:'receipt',title:'八、單據要求與報銷程序',open:false,blocks:[
        {h:'單據必須載有',items:['商戶全名','交易日期','購買項目及數量','總金額','簽收／蓋章（如有）']},
        {h:'報銷程序',items:['填妥結算總表（附件5），貼妥單據並蓋四格印。','副本經 APP 開支申報上傳至財務資料夾；單據正本交行政組。','行政組對數 → 四格印逐格簽署 → 按銀碼由相應人士批核 → 秘書處安排付款。','未獲批核或單據不齊之開支，或須由經辦人自行承擔。']}
      ]}
    ];
  }
,
  renderBuiltinFinanceGuide(){
    const chip=(t)=>`<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">${t}</span>`;
    return `
      <div class="bg-white border rounded-2xl overflow-hidden">
        <div class="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="font-bold text-[13px] text-amber-900"><i class="fa-solid fa-book-bookmark mr-2"></i>財務指引及會計程序（全文內建）</h4>
            ${chip('官方定稿 · 不會再改')}${chip('附件1–6 已包含')}${chip('直接閱讀 · 毋須開彈窗')}
          </div>
          <p class="text-[11px] text-amber-800 mt-1.5 leading-relaxed">以下內容已按照「ISD2026 財務指引及會計程序 ver 1」及附件1–6 整理並直接內建喺呢一頁（附件2 豁免名單版本：Rev Dec 2025）。撳每節標題即可展開全文；原版 Word/PDF/Excel 檔案喺下方下載區。</p>
        </div>
        <div class="divide-y">
          ${this.financeGuideSections().map(s=>`
            <details ${s.open?'open':''} class="group">
              <summary class="px-4 py-3 cursor-pointer select-none font-bold text-[12.5px] flex items-center justify-between hover:bg-slate-50">
                <span>${escapeHtml(s.title)}</span><i class="fa-solid fa-chevron-down text-slate-400 text-[10px] transition group-open:rotate-180"></i>
              </summary>
              <div class="px-4 pb-4 space-y-3">
                ${s.blocks.map(b=>`
                  <div class="bg-slate-50 border rounded-xl p-3 space-y-1.5">
                    <div class="text-[11px] font-extrabold text-slate-700">${escapeHtml(b.h)}</div>
                    ${b.table?`<div class="table-responsive mt-1"><table class="min-w-full text-[11px]"><thead class="bg-amber-100"><tr>${b.table[0].map(h=>`<th class="border border-amber-200 px-2 py-1 text-left">${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${b.table.slice(1).map(r=>`<tr>${r.map(c=>`<td class="border border-slate-200 px-2 py-1 bg-white">${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}
                    ${(b.items||[]).length?`<ul class="list-disc pl-4 text-[11.5px] text-slate-600 leading-relaxed space-y-0.5">${b.items.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}</ul>`:''}
                  </div>`).join('')}
              </div>
            </details>`).join('')}
        </div>
      </div>`;
  }
,
  renderFinanceGuidance(driveFiles, folderLink){
    const container=document.getElementById('finance-tab-guidance');
    if(!container) return;
    container.innerHTML=`
      <div class="space-y-4">
        ${this.renderBuiltinFinanceGuide()}
        <div class="flex flex-wrap gap-2 items-center">
          <a href="${folderLink}" target="_blank" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-folder-open mr-1"></i> 開啟 Drive 指引資料夾（備用）</a>
          <button onclick="app.saveFinanceFolderLink()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">設定財務資料夾</button>
          <input id="finance-folder-link-input" value="${escapeHtml(folderLink)}" placeholder="貼上 Drive 資料夾連結" class="flex-1 min-w-[240px] px-3 py-2 border rounded-xl text-xs font-mono">
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-white border rounded-xl p-4 space-y-3">
            <h4 class="font-bold text-sm"><i class="fa-solid fa-book-open text-amber-600 mr-2"></i>原版檔案下載（指引全文已喺上方內建，唔使開檔案都睇到）</h4>
            <div class="space-y-2">${driveFiles.map(f=>{
              const previewUrl=`https://drive.google.com/file/d/${f.id}/preview`;
              const viewUrl=`https://drive.google.com/file/d/${f.id}/view`;
              const icon={docx:'fa-file-word text-sky-600',pdf:'fa-file-pdf text-red-600',xlsx:'fa-file-excel text-emerald-600'}[f.type]||'fa-file';
              return `<div class="border rounded-xl p-3 bg-slate-50 hover:bg-white transition">
                <div class="flex gap-3">
                  <div class="w-10 h-10 bg-white border rounded-xl flex items-center justify-center flex-shrink-0"><i class="fa-solid ${icon}"></i></div>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-[12px] leading-snug truncate">${escapeHtml(f.name)}</div>
                    <div class="text-[10px] text-slate-500 mt-0.5">${escapeHtml(f.desc)}</div>
                    <div class="flex gap-1 mt-2 flex-wrap">
                      <a href="${viewUrl}" target="_blank" class="bg-sky-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold">👁️ 查看</a>
                      <a href="https://drive.google.com/uc?export=download&id=${f.id}" target="_blank" class="bg-white border px-2.5 py-1 rounded-xl text-[10px] font-bold">⬇️ 下載</a>
                      <button onclick="app.previewDriveFile('${f.id}','${escapeHtml(f.name)}')" class="bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-xl text-[10px] font-bold">頁內預覽</button>
                    </div>
                  </div>
                </div>
              </div>`;
            }).join('')}</div>
          </div>
          <div class="space-y-3">
            <div class="bg-white border rounded-xl p-4">
              <h5 class="font-bold text-xs mb-2">一頁睇晒：報價門檻速查（詳細全文見上方內建指引）</h5>
              <div class="text-[11px] leading-relaxed space-y-2 max-h-[320px] overflow-y-auto pr-1">
                <div class="bg-slate-50 border rounded-xl p-2.5"><b>報價門檻（附件1）：</b><br>• ≤$500（豁免名單 ≤$2,000）：免報價 → 副主席批核<br>• ≤$5,000：1 個口頭報價（附件3）→ 副主席推薦 → 主席批核<br>• $5,001–$30,000：2 個口頭報價 → 主席推薦 → 助理地域總監認可 → 副地域總監批核<br>• $10,001–$300,000：3 個書面報價（附件4）→ 同上批核鏈<br>• >$1,000,000：投標（≥5 報價）→ 地域總監批核</div>
                <div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5"><b>豁免商戶（附件2）：</b>清單內商戶可豁免報價，但需保留單據（Rev Dec 2025 版本）</div>
                <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5"><b>單據要求：</b>必須有商戶名稱、日期、金額、項目、簽收；四格印至少 1/3 蓋喺單據上；熱感紙須影印加 COPY 章；副本上傳至指定資料夾</div>
                <div class="bg-sky-50 border border-sky-200 rounded-xl p-2.5"><b>結算總表（附件5/5A/5B）：</b>APP 內「結算總表」分頁可填寫及列印，含四格印簽名位置（附件6）</div>
              </div>
            </div>
            <div class="bg-white border rounded-xl p-3">
              <h5 class="font-bold text-xs mb-2">頁內預覽（可選，只在需要原版格式時使用）</h5>
              <div id="finance-preview-area" class="bg-slate-100 border rounded-xl h-[320px] flex items-center justify-center text-xs text-slate-500 px-3 text-center">一般查閱唔使開：指引全文已喺上方內建。如要睇原版檔案排版，先按左側檔案嘅「頁內預覽」。</div>
            </div>
            <div class="bg-slate-900 text-white rounded-xl p-3 text-[11px] leading-relaxed">
              <b>財務資料夾：</b><br>
              <span class="font-mono text-[10px] break-all">${escapeHtml(folderLink)}</span><br>
              管理員可在上方可改資料夾連結，所有上傳單據副本將自動去到該資料夾 (透過 GAS uploadFileToFolder)
            </div>
          </div>
        </div>
      </div>
    `;
  }
,
  previewDriveFile(fileId, fileName){
    const area=document.getElementById('finance-preview-area');
    if(!area) return;
    area.innerHTML=`<iframe src="https://drive.google.com/file/d/${fileId}/preview" class="w-full h-[320px] border-0 rounded-xl" allow="autoplay"></iframe><div class="mt-2 flex justify-between items-center text-[11px]"><span class="font-bold truncate">${escapeHtml(fileName)}</span><a href="https://drive.google.com/file/d/${fileId}/view" target="_blank" class="text-sky-600 underline">新分頁開啟</a></div>`;
  }
,
  saveFinanceFolderLink(){
    const input=document.getElementById('finance-folder-link-input');
    const link=input?input.value.trim():'';
    const fin=this.getFinanceData();
    fin.drive_folder_link=link;
    fin.drive_folder_id=this.extractDriveFolderId(link);
    this.saveFinanceData(fin);
    // Sync to system config
    this.systemConfig.meeting_folder_link=link;
    this.systemConfig.meeting_folder_id=fin.drive_folder_id;
    localStorage.setItem(LS.config(this.currentEvent?.event_id||'global'), JSON.stringify(this.systemConfig));
    showToast(fin.drive_folder_id?`已設定財務資料夾，ID: ${fin.drive_folder_id}`:'已清除財務資料夾','success');
    this.renderFinanceModule();
  }
,
  renderFinanceBudgets(){
    const container=document.getElementById('finance-tab-budgets');
    if(!container) return;
    const fin=this.getFinanceData();
    const budgets=fin.group_itemized_budgets||[];
    const income=fin.income||[];
    // 排序：有 2026 預算（項目預算>0）的組別在前；只有 2025 紀錄（2026 全空）的組別排最後
    const has2026=(g)=>(g.items||[]).some(it=>(parseFloat(it.budget)||0)>0);
    const orderedBudgets=budgets.map((g,i)=>({g,i})).sort((a,b)=>{
      const ha=has2026(a.g)?0:1, hb=has2026(b.g)?0:1;
      if(ha!==hb) return ha-hb;
      return a.i-b.i;
    }).map(x=>x.g);
    const groupCard=(g)=>{
      const items=g.items||[];
      const bTotal=items.reduce((s,it)=>s+(parseFloat(it.budget)||0),0);
      const aTotal=items.reduce((s,it)=>s+(parseFloat(it.actual)||0),0);
      return `<div class="border rounded-xl p-4 bg-white"><div class="flex justify-between items-center mb-2 flex-wrap gap-1"><h4 class="font-bold text-sm"><i class="fa-solid fa-folder-open text-amber-600 mr-2"></i>${escapeHtml(g.group_name)}</h4><span class="flex gap-1">${has2026(g)?'':'<span class="text-[10px] bg-slate-100 text-slate-500 border px-2 py-0.5 rounded-full">僅 2025 紀錄</span>'}<span class="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full">${items.length} 項</span></span></div><div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">憑單</th><th class="px-2 py-1 text-left">項目</th><th class="px-2 py-1 text-left">預算</th><th class="px-2 py-1 text-left">實際</th><th class="px-2 py-1 text-left">備註</th></tr></thead><tbody class="divide-y">${items.map(it=>`<tr><td class="px-2 py-1 font-mono">${escapeHtml(it.voucher)}</td><td class="px-2 py-1">${escapeHtml(it.item_name)}</td><td class="px-2 py-1">$${(parseFloat(it.budget)||0).toLocaleString()}</td><td class="px-2 py-1 font-bold text-rose-600">$${(parseFloat(it.actual)||0).toLocaleString()}</td><td class="px-2 py-1">${escapeHtml(it.notes||'')}</td></tr>`).join('')}<tr class="bg-amber-50 font-bold"><td class="px-2 py-1"></td><td class="px-2 py-1">小計</td><td class="px-2 py-1">$${bTotal.toLocaleString()}</td><td class="px-2 py-1 text-rose-600">$${aTotal.toLocaleString()}</td><td class="px-2 py-1"></td></tr></tbody></table></div></div>`;
    };
    container.innerHTML=`
      <div class="space-y-4">
        <div class="flex gap-2 flex-wrap">
          <button onclick="app.syncBudgetFromDrive()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>同步最新預算 (Drive)</button>
          ${(this.isAdmin()||(ROLE_HIERARCHY[this.currentUser?.role]||0)>=60)?`<label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">⬆️ 上傳 Excel 預算<input type="file" accept=".xlsx,.xls" class="hidden" onchange="app.handleBudgetExcelUpload(this.files[0])"></label>`:''}
          <button onclick="app.openExpenseForm()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">+ 新增開支申報</button>${(this.canApproveArea('finance')||this.canExecuteArea('finance'))?`<button onclick="app.exportFinanceData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button>`:''}
        </div>
        ${(this.getFinanceData().budget_source)?this.driveSyncNotice():''}
        ${(this.getFinanceData().budget_source)?`<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-sky-900">📊 預算來源：「${escapeHtml(this.getFinanceData().budget_source.name||'Budget')}」（由行政組/財務更新）。建議把 xlsx 另存為原生 Google 試算表後，點「同步最新」直接讀取。</div>`:''}
        ${orderedBudgets.map(groupCard).join('') || '<p class="text-xs text-slate-400">暫無預算明細</p>'}
        ${(income.length && !budgets.some(g=>normalizeGroupName(g.group_name)==='收入'))?`<div class="border rounded-xl p-4 bg-white"><h4 class="font-bold text-sm mb-2"><i class="fa-solid fa-coins text-emerald-600 mr-2"></i>收入</h4><div class="table-responsive"><table class="min-w-full text-xs"><thead class="bg-slate-100"><tr><th class="px-2 py-1 text-left">項目</th><th class="px-2 py-1">預算</th><th class="px-2 py-1">實際</th></tr></thead><tbody class="divide-y">${income.map(i=>`<tr><td class="px-2 py-1">${escapeHtml(i.item)}</td><td class="px-2 py-1">$${i.budget}</td><td class="px-2 py-1 font-bold text-emerald-700">$${i.actual}</td></tr>`).join('')}</tbody></table></div></div>`:''}
      </div>
    `;
  }
,
  renderFinanceExpense(){
    const container=document.getElementById('finance-tab-expense');
    if(!container) return;
    const fin=this.getFinanceData();
    const expenses=fin.expenses||[];
    const myId=this.currentUser?.user_id||'',myName=this.currentUser?.name||'',myGroup=normalizeGroupName(this.currentUser?.group_name),lvl=this.roleLevel(this.currentUser?.role);
    const isMine=e=>(e.submitted_by_id&&e.submitted_by_id===myId)||(myName&&e.submitted_by===myName);
    const canSeePendingAll=this.canApproveArea('finance')||this.canManageApprovalRouting();
    const canSeeFinalAll=this.canExecuteArea('finance')||this.canManageApprovalRouting();
    const pending=expenses.filter(e=>e.status==='pending'&&(canSeePendingAll||(lvl>=40&&normalizeGroupName(e.group_name)===myGroup)||isMine(e)));
    const approved=expenses.filter(e=>e.status==='approved'&&(canSeeFinalAll||isMine(e)));
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px]">
          <b>開支申報 (可在 APP 內填寫 + 上傳單據副本)</b><br>
          • 填寫憑單、項目、金額、組別、日期、說明<br>
          • 上傳單據副本 (圖片/PDF)，支援指定資料夾自動上傳到 Drive<br>
          • 低於總主任提交會先由本組確認，再交 ${escapeHtml(this.approvalRouteLabel('finance','approver_groups'))} 批核；批准後由 ${escapeHtml(this.approvalRouteLabel('finance','executor_groups'))} 檢視及執行<br>
          • 後台紀錄：全部寫入 localStorage + GAS Finance Sheet + AuditLog
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="app.openExpenseForm()" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增開支申報</button>
          <button onclick="app.downloadFinanceTemplate()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-excel mr-1"></i>下載申報 Excel 範本</button>
          ${(this.canApproveArea('finance')||this.canManageApprovalRouting())?`<label class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"><i class="fa-solid fa-file-excel mr-1"></i>上傳 Excel 批量申報<input type="file" accept=".xlsx,.xls,.json" class="hidden" onchange="app.handleFinanceFileUpload(this.files[0]);this.value=''"></label>`:''}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-white border rounded-xl p-4">
            <h4 class="font-bold text-xs mb-2">待確認／批核開支 (${pending.length}) ${pending.some(e=>this.applicationReadyForApproval(e))&&this.canApproveFinance()?`<button onclick="app.batchApproveExpenses()" class="ml-2 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px]">批量批准</button>`:''}</h4>
            <div class="space-y-2 max-h-[420px] overflow-y-auto">${pending.length?pending.map(e=>`
              <div class="border rounded-xl p-3 bg-amber-50 border-amber-200">
                <div class="flex justify-between"><div><b class="text-[12px]">${escapeHtml(e.item_name)}</b> <span class="text-[10px] bg-white border px-1.5 py-0.5 rounded-full">${escapeHtml(e.group_name)}</span><div class="text-[11px] text-slate-600 mt-1">憑單: ${escapeHtml(e.voucher)} | $${e.actual} | ${escapeHtml(e.date||'')} | ${escapeHtml(e.submitted_by||'')}</div><div class="text-[11px] text-slate-500 mt-1">${escapeHtml(e.description||'')}</div></div><div class="flex flex-col gap-1">
                  ${e.receipt_url?`<a href="${e.receipt_url}" target="_blank" class="bg-white border px-2 py-1 rounded-xl text-[10px] font-bold text-sky-700">查看單據</a>`:''}
                  ${e.receipt_data?`<button onclick="app.downloadFinanceReceipt('${e.id}')" class="bg-white border px-2 py-1 rounded-xl text-[10px]">下載單據</button>`:''}
                  ${this.canConfirmApplication(e)?`<button onclick="app.confirmApplication('finance','${e.id}')" class="bg-sky-600 text-white px-2 py-1 rounded-xl text-[10px] font-bold">本組確認</button>`:''}
                  ${this.canApproveFinance()&&this.applicationReadyForApproval(e)?`<button onclick="app.approveExpense('${e.id}')" class="bg-emerald-600 text-white px-2 py-1 rounded-xl text-[10px] font-bold">批准</button><button onclick="app.rejectExpense('${e.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">拒絕</button>`:''}
                  ${this.isSuperAdmin()?`<button onclick="app.deleteExpense('${e.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-xl text-[10px]">🗑️</button>`:''}
                </div></div>
              </div>
            `).join(''):'<p class="text-xs text-slate-400 py-4 text-center">暫無待批</p>'}</div>
          </div>
          <div class="bg-white border rounded-xl p-4">
            <h4 class="font-bold text-xs mb-2">已批核/已記錄 (${approved.length})</h4>
            <div class="space-y-2 max-h-[420px] overflow-y-auto">${approved.length?approved.map(e=>`
              <div class="border rounded-xl p-3 bg-emerald-50 border-emerald-200">
                <div class="flex justify-between"><div><b class="text-[12px]">${escapeHtml(e.item_name)}</b> <span class="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-200">已批核</span><div class="text-[11px] text-slate-600 mt-1">憑單: ${escapeHtml(e.voucher)} | $${e.actual} | 批核: ${escapeHtml(e.approved_by||'')}</div></div><div class="flex flex-col gap-1">${e.receipt_url?`<a href="${e.receipt_url}" target="_blank" class="bg-white border px-2 py-1 rounded-xl text-[10px]">查看單據</a>`:''}</div></div>
              </div>
            `).join(''):'<p class="text-xs text-slate-400 py-4 text-center">暫無已批核</p>'}</div>
          </div>
        </div>
      </div>
    `;
  }
,
  canApproveFinance(){ return this.canApproveArea('finance'); }
,
  /* v13：開支申報／批核後的刷新——留在目前所在的頁面
     （部門中心「開支申報」頁籤 → 重繪部門頁；財務頁 → 重繪開支＋結算分頁） */
  refreshFinanceViews(){
    if(this.currentModule==='group_management' && this.currentGroupManaged){ this.openGroupManagement(this.currentGroupManaged); return; }
    this.renderFinanceExpense();
    this.renderFinanceSettlement();
    if(document.getElementById('finance-tab-oral_quotes')) this.renderFinanceOralQuotesTab();
  }
,
  openExpenseForm(editId=null, presetGroup=null){
    if(!this.currentUser){ showToast('請先登入後提交開支申報','warning'); this.openLoginModal(); return; }
    const fin=this.getFinanceData();
    const existing=editId?fin.expenses.find(e=>e.id===editId):null;
    // v13：部門中心「開支申報」頁籤會帶入本組組別（presetGroup）；無帶入就用登記人自己組別
    const groupDefault=existing?.group_name||presetGroup||normalizeGroupName(this.currentUser?.group_name)||'主題節目組';
    const title=existing?'編輯開支申報':'新增開支申報 (填表+上傳單據)';
    let html=`
      <input type="hidden" id="exp-form-mode" value="${existing?'edit':'create'}">
      <input type="hidden" id="exp-form-id" value="${existing?.id||''}">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-[11px] font-bold">憑單編號 *</label><input id="exp-voucher" value="${escapeHtml(existing?.voucher||'')}" required placeholder="例如 憑單#01" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">所屬組別 *</label><input id="exp-group" value="${escapeHtml(groupDefault)}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">支出項目 *</label><input id="exp-item" value="${escapeHtml(existing?.item_name||'')}" required placeholder="例如 嘉賓紀念品" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">預算金額</label><input type="number" id="exp-budget" value="${existing?.budget||''}" placeholder="0" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">實際金額 *</label><input type="number" id="exp-actual" value="${existing?.actual||''}" required placeholder="金額" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">日期</label><input type="date" id="exp-date" value="${existing?.date||todayISO()}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div><label class="text-[11px] font-bold">提交人</label><input id="exp-submitter" value="${escapeHtml(existing?.submitted_by||this.currentUser?.name||'')}" class="w-full px-3 py-2 border rounded-xl text-sm mt-1"></div>
        <div class="col-span-2"><label class="text-[11px] font-bold">說明/備註</label><textarea id="exp-desc" rows="2" placeholder="實體單據須交行政組，報價門檻..." class="w-full px-3 py-2 border rounded-xl text-sm mt-1">${escapeHtml(existing?.description||'')}</textarea></div>
        <div class="col-span-2">
          <label class="text-[11px] font-bold">單據副本 (圖片/PDF，可多張，支援指定資料夾)</label>
          <input type="file" id="exp-receipt" accept=".jpg,.jpeg,.png,.pdf" multiple class="w-full text-xs mt-1">
          <div class="text-[10px] text-slate-500 mt-1">已設財務資料夾則自動上傳到 Drive，否則存本地 base64，後台紀錄好</div>
          ${existing?.receipt_name?`<div class="mt-2 text-[11px]">已上傳: ${escapeHtml(existing.receipt_name)} ${existing.receipt_url?`<a href="${existing.receipt_url}" target="_blank" class="text-sky-600 underline">查看</a>`:''}</div>`:''}
        </div>
      </div>
    `;
    document.getElementById('record-modal-title').textContent=title;
    document.getElementById('record-form-fields').innerHTML=html;
    const form=document.getElementById('record-form');
    form.onsubmit=(e)=>{ e.preventDefault(); this.submitExpenseForm(); };
    document.getElementById('modal-record').classList.remove('hidden');
  }
,
  async submitExpenseForm(){
    const mode=document.getElementById('exp-form-mode').value;
    const id=document.getElementById('exp-form-id').value;
    const fin=this.getFinanceData();
    let receiptName='', receiptData='', receiptUrl='';
    const files=document.getElementById('exp-receipt').files;
    if(files && files.length){
      const f=files[0]; // take first for simplicity, could handle multiple
      receiptName=f.name;
      const data=await fileToDataUrl(f);
      // check folder
      const folderCfg={link:fin.drive_folder_link, id:fin.drive_folder_id||this.extractDriveFolderId(fin.drive_folder_link)};
      const useDrive=!!folderCfg.id && !this.mockMode && this.gasUrl;
      if(useDrive){
        showToast('正在上傳單據到指定資料夾...','warning');
        const res=await this.uploadFileToDriveFolder(f.name, data, f.type);
        if(res.success){ receiptUrl=res.file_url||res.download_url; receiptData=''; showToast('單據已上傳到財務資料夾','success'); }
        else { receiptData=data; showToast('Drive上傳失敗，改本地','warning'); }
      } else receiptData=data;
    }
    const obj={
      id:id||'exp_'+Date.now(),
      event_id:this.currentEvent?.event_id||'isd_2026',
      voucher:document.getElementById('exp-voucher').value.trim(),
      item_name:document.getElementById('exp-item').value.trim(),
      group_name:document.getElementById('exp-group').value.trim(),
      budget:parseFloat(document.getElementById('exp-budget').value)||0,
      actual:parseFloat(document.getElementById('exp-actual').value)||0,
      date:document.getElementById('exp-date').value,
      submitted_by:document.getElementById('exp-submitter').value.trim(),
      submitted_by_id:this.currentUser?.user_id||'',
      ...this.applicationConfirmationMeta(this.currentUser),
      description:document.getElementById('exp-desc').value.trim(),
      receipt_name: receiptName || (mode==='edit'? (fin.expenses.find(e=>e.id===id)?.receipt_name||'') : ''),
      receipt_data: receiptData,
      receipt_url: receiptUrl,
      status: 'pending',
      created_at:new Date().toISOString()
    };
    if(this.roleLevel(this.currentUser?.role)<40) obj.group_name=normalizeGroupName(this.currentUser?.group_name);
    if(!obj.voucher||!obj.item_name||!obj.group_name){ showToast('請填寫憑單、項目、組別','error'); return; }
    if(mode==='edit'){
      const idx=fin.expenses.findIndex(e=>e.id===id);
      if(idx>=0){
        // keep old receipt if no new
        if(!receiptName){
          obj.receipt_name=fin.expenses[idx].receipt_name;
          obj.receipt_data=fin.expenses[idx].receipt_data;
          obj.receipt_url=fin.expenses[idx].receipt_url;
        }
        // 修改後重新進入「本組確認 → 指定組批核」流程。
        obj.status='pending';
        obj.approved_by='';
        obj.approved_at='';
        fin.expenses[idx]={...fin.expenses[idx],...obj};
      }
    }else{
      obj.status='pending';
      fin.expenses.push(obj);
    }
    this.saveFinanceData(fin);
    this.closeModal('modal-record');
    document.getElementById('record-form').onsubmit=(e)=>this.submitRecordForm(e);
    showToast(mode==='edit'?'已更新開支並重新進入流程':(this.applicationNeedsGroupConfirmation(obj)?'已提交開支：待本組總主任確認':'已提交開支：已交指定批核組'),'success');
    this.refreshFinanceViews();
  }
,
  downloadFinanceReceipt(expId){
    const fin=this.getFinanceData();
    const e=fin.expenses.find(x=>x.id===expId);
    if(!e){ showToast('找不到','error'); return; }
    const mine=(e.submitted_by_id&&e.submitted_by_id===this.currentUser?.user_id)||(e.submitted_by&&e.submitted_by===this.currentUser?.name);
    if(!mine&&!this.canApproveArea('finance')&&!(e.status==='approved'&&this.canExecuteArea('finance'))){ showToast('你無權下載此單據','error'); return; }
    if(e.receipt_url){ window.open(e.receipt_url,'_blank'); return; }
    if(e.receipt_data) downloadDataUrl(e.receipt_name||'receipt', e.receipt_data);
    else showToast('無單據','warning');
  }
,
  approveExpense(expId){
    if(!this.canApproveFinance()){ showToast('你不屬於目前指定的財務批核組別','error'); return; }
    const fin=this.getFinanceData();
    const idx=fin.expenses.findIndex(e=>e.id===expId);
    if(idx<0) return;
    if(!this.applicationReadyForApproval(fin.expenses[idx])){ showToast('須先由申請人所屬組別總主任以上確認','warning'); return; }
    fin.expenses[idx].status='approved';
    fin.expenses[idx].approved_by=(this.currentUser?.name||'')+`（${this.approvalRouteLabel('finance','approver_groups')}）`;
    fin.expenses[idx].approved_at=new Date().toISOString();
    this.saveFinanceData(fin);
    showToast('已批准開支','success');
    this.refreshFinanceViews();
  }
,
  rejectExpense(expId){
    if(!this.canApproveFinance()) return;
    const fin=this.getFinanceData();
    const idx=fin.expenses.findIndex(e=>e.id===expId);
    if(idx<0) return;
    if(!this.applicationReadyForApproval(fin.expenses[idx])){ showToast('須先完成本組確認','warning'); return; }
    if(!confirm('確定拒絕此開支申報？')) return;
    fin.expenses[idx].status='rejected';
    fin.expenses[idx].approved_by=this.currentUser?.name||'';
    fin.expenses[idx].approved_at=new Date().toISOString();
    this.saveFinanceData(fin);
    showToast('已拒絕','warning');
    this.refreshFinanceViews();
  }
,
  async deleteExpense(expId){
    if(!this.isSuperAdmin()){ showToast('權限不足，無法永久刪除紀錄','error'); return; }
    if(!confirm('確定永久刪除此開支申報？APP、本機快取及後台紀錄都會刪除。')) return;
    this.markRecordDeleted('Finance_Expenses',expId);
    const fin=this.getFinanceData();
    fin.expenses=fin.expenses.filter(e=>e.id!==expId);
    this.saveFinanceData(fin);
    const result=await this.deleteGasRecord('Finance_Expenses',expId);
    this.refreshFinanceViews();
    if(!document.getElementById('view-approvals')?.classList.contains('hidden')) this.renderApprovalCenter();
    showToast(result.success?'已從 APP 及後台永久刪除':`APP 已隱藏，但後台刪除失敗：${result.error}`,result.success?'warning':'error');
  }
,
  batchApproveExpenses(){
    if(!this.canApproveFinance()) return;
    if(!confirm('確定批量批准全部待批開支？')) return;
    const fin=this.getFinanceData();
    let count=0;
    fin.expenses.forEach(e=>{ if(e.status==='pending'&&this.applicationReadyForApproval(e)){ e.status='approved'; e.approved_by=(this.currentUser?.name||'')+`（${this.approvalRouteLabel('finance','approver_groups')}）`; e.approved_at=new Date().toISOString(); count++; } });
    this.saveFinanceData(fin);
    showToast(`已批量批准 ${count} 項；未完成本組確認的申請不會被批准`,'success');
    this.refreshFinanceViews();
  }
,
  // v14.1：範本一律 Excel（冇 CSV）
  downloadFinanceTemplate(){
    downloadExcel('開支申報範本.xlsx',[['voucher','item_name','group_name','budget','actual','date','description'],['憑單#01','嘉賓紀念品','會操及典禮組','500','246','2026-10-04','不超過$500免報價'],['憑單#02','遊戲道具','主題節目組','26000','13872.53','2026-10-04','各旅團支援費']],{sheet:'開支申報'});
  }
,
  // v14.1：批量匯入只收 Excel（.xlsx／.xls）或 JSON，唔再收 CSV
  async handleFinanceFileUpload(file){
    if(!this.canApproveArea('finance')&&!this.canManageApprovalRouting()){ showToast('只供指定財務批核組批量匯入','error'); return; }
    if(!file) return;
    let res; try{ res=await readTabularFile(file); }catch(err){ showToast('檔案讀取失敗：'+err.message,'error'); return; }
    {
      try{
        let parsed=[];
        if(res.kind==='json'){
          const json=res.rows;
          parsed=Array.isArray(json)?json:json.expenses||[json];
        }else{
          const rows=res.rows;
          parsed=rows.map(r=>({id:'exp_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),voucher:r.voucher||'',item_name:r.item_name||r.item||'',group_name:r.group_name||r.group||'',budget:parseFloat(r.budget||0),actual:parseFloat(r.actual||0),date:r.date||todayISO(),description:r.description||r.notes||'',status:'pending',submitted_by:this.currentUser?.name||'',created_at:new Date().toISOString()})).filter(r=>r.item_name);
        }
        if(!parsed.length){ showToast('無有效資料','error'); return; }
        const fin=this.getFinanceData();
        fin.expenses=[...fin.expenses,...parsed];
        this.saveFinanceData(fin);
        showToast(`已批量匯入 ${parsed.length} 筆開支申報`,'success');
        this.refreshFinanceViews();
      }catch(err){ showToast('解析失敗:'+err.message,'error'); }
    }
  }
,
  exportFinanceData(){
    const canApprove=this.canApproveArea('finance'),canExecute=this.canExecuteArea('finance');
    if(!canApprove&&!canExecute){ showToast('只供指定財務批核或執行組匯出','error'); return; }
    const source=this.getFinanceData();
    const fin={...source,expenses:canApprove?(source.expenses||[]):(source.expenses||[]).filter(e=>e.status==='approved')};
    const blob=new Blob([JSON.stringify(fin,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`finance_${todayISO()}.json`; a.click(); showToast('已匯出財務 JSON','success');
  }
,
  renderFinanceSettlement(){
    const container=document.getElementById('finance-tab-settlement');
    if(!container) return;
    if(!this.canExecuteArea('finance')){ container.innerHTML=`<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-900">財務結算／最後名單只供 ${escapeHtml(this.approvalRouteLabel('finance','executor_groups'))} 檢視。</div>`; return; }
    const fin=this.getFinanceData();
    const expenses=(fin.expenses||[]).filter(e=>e.status==='approved'||this.canApproveArea('finance'));
    const approved=expenses.filter(e=>e.status==='approved');
    const pending=expenses.filter(e=>e.status==='pending');
    const totalBudget=fin.group_itemized_budgets?.reduce((sum,g)=>sum+(g.items?.reduce((s,it)=>s+it.budget,0)||0),0) || expenses.reduce((s,e)=>s+e.budget,0);
    const totalActual=approved.reduce((s,e)=>s+e.actual,0);
    const totalPending=pending.reduce((s,e)=>s+e.actual,0);
    const totalAll=expenses.reduce((s,e)=>s+e.actual,0);
    // Approval chain based on attachment 1
    const getApprovalChain=(amount, isExempt=false)=>{
      // isExempt = shop in exempt list
      if(isExempt){
        if(amount<=2000) return {quotation:'無須報價 (豁免名單內 $2,000)', steps:[{role:'各副主席', action:'批核', by:'vice_chair'}]};
        if(amount<=5000) return {quotation:'1個口頭報價 (附件3)', steps:[{role:'各副主席', action:'推薦', by:'vice_chair'},{role:'主席', action:'批核', by:'chair'}]};
      }else{
        if(amount<=500) return {quotation:'無須報價 (其他商舖 ≤$500)', steps:[{role:'各副主席', action:'批核', by:'vice_chair'}]};
        if(amount<=5000) return {quotation:'1個口頭報價 (附件3)', steps:[{role:'各副主席', action:'推薦', by:'vice_chair'},{role:'主席', action:'批核', by:'chair'}]};
      }
      if(amount>=5001 && amount<=30000) return {quotation:'2個口頭報價 (附件3)', steps:[{role:'主席', action:'推薦', by:'chair'},{role:'助理地域總監(活動)', action:'認可', by:'assistant_rc'},{role:'副地域總監(活動與訓練)', action:'批核', by:'deputy_rc'}]};
      if(amount>=30001 && amount<=100000) return {quotation:'2個書面報價 (附件4)', steps:[{role:'主席', action:'推薦', by:'chair'},{role:'助理地域總監(活動)', action:'認可', by:'assistant_rc'},{role:'副地域總監(活動與訓練)', action:'批核', by:'deputy_rc'}]};
      if(amount>=10001 && amount<=300000) return {quotation:'3個書面報價 (附件4)', steps:[{role:'主席', action:'推薦', by:'chair'},{role:'助理地域總監(活動)', action:'認可', by:'assistant_rc'},{role:'副地域總監(活動與訓練)', action:'批核', by:'deputy_rc'}]};
      if(amount>=300001 && amount<=1000000) return {quotation:'5個書面報價 (附件4)', steps:[{role:'主席', action:'推薦', by:'chair'},{role:'助理地域總監(活動) 及 副地域總監', action:'認可', by:'assistant_deputy'},{role:'地域總監', action:'批核', by:'regional'}]};
      if(amount>1000000) return {quotation:'投標，至少5個報價', steps:[{role:'投標小組委員會', action:'推薦', by:'tender'},{role:'地域總監', action:'批核', by:'regional'}]};
      return {quotation:'未知', steps:[]};
    };
    // Four-grid stamp explanation from guidance + attachment 6
    const fourGridInfo=[
      {pos:'第一格 (經辦人)', who:'經辦人 (申請人)，按附件6「經辦人無須簽署」', desc:'填寫人姓名，貼單據，無須簽署'},
      {pos:'第二格 Checked by', who:'各組副主席', desc:'有關副主席在 Checked by 位置簽名，核實支出屬實'},
      {pos:'第三格 Certified by', who:'財政主任 或 總主任(行政) 或 副主席(行政)', desc:'審核真確性及是否在預算內，金額不超出預算則簽署'},
      {pos:'第四格 Approved / 秘書處', who:'秘書處安排支票 / 按銀碼由主席/助理地域總監/副地域總監/地域總監批核', desc:'見下表按銀碼批核鏈'}
    ];
    const overallChain=getApprovalChain(totalAll, false);
    container.innerHTML=`
      <div class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed">
          <b>⚠️ 結算總表批核已修正 (按附件1銀碼區分)：</b><br>
          舊版四格印僅寫「組別總主任/副主席」「行政/財務」「主席」，現已按附件1 <b>報價要求</b> 修正為不同銀碼不同批核鏈，並保留四格印 Checked/Certified 流程。請參照下表：<br>
          <div class="mt-2 bg-white border rounded-xl overflow-hidden">
            <table class="min-w-full text-[10px] border-collapse">
              <thead class="bg-slate-100 font-bold"><tr><th class="border px-2 py-1">支出金額</th><th class="border px-2 py-1">報價要求</th><th class="border px-2 py-1">批核人士 (申請→批→再確認)</th></tr></thead>
              <tbody>
                <tr><td class="border px-2 py-1">豁免名單 ≤$2,000 或其他 ≤$500</td><td class="border px-2 py-1">無須報價</td><td class="border px-2 py-1">各副主席批核</td></tr>
                <tr class="bg-amber-50"><td class="border px-2 py-1">豁免> $2,000 或其他 >$500 且 ≤$5,000</td><td class="border px-2 py-1">1個口頭報價 (附件3)</td><td class="border px-2 py-1">各副主席推薦 → 主席批核</td></tr>
                <tr><td class="border px-2 py-1">$5,001-$30,000</td><td class="border px-2 py-1">2個口頭報價</td><td class="border px-2 py-1">主席推薦 → 助理地域總監(活動)認可 → 副地域總監(活動與訓練)批核</td></tr>
                <tr class="bg-slate-50"><td class="border px-2 py-1">$30,001-$100,000</td><td class="border px-2 py-1">2個書面報價 (附件4)</td><td class="border px-2 py-1">主席推薦 → 助理地域總監認可 → 副地域總監批核</td></tr>
                <tr><td class="border px-2 py-1">$10,001-$300,000</td><td class="border px-2 py-1">3個書面報價</td><td class="border px-2 py-1">主席推薦 → 助理地域總監認可 → 副地域總監批核</td></tr>
                <tr class="bg-slate-50"><td class="border px-2 py-1">$300,001-$1,000,000</td><td class="border px-2 py-1">5個書面報價</td><td class="border px-2 py-1">主席推薦 → 助理+副地域總監認可 → 地域總監批核</td></tr>
                <tr><td class="border px-2 py-1">>$1,000,000</td><td class="border px-2 py-1">投標+5報價</td><td class="border px-2 py-1">投標小組推薦 → 地域總監批核</td></tr>
              </tbody>
            </table>
          </div>
          <div class="mt-2">本結算總表總額 <b>$${totalAll}</b> 屬於：<b>${overallChain.quotation}</b> → 批核鏈：${overallChain.steps.map(s=>`${s.role} ${s.action}`).join(' → ')}</div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="app.printSettlement()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-print mr-1"></i>列印結算總表 (含正確批核)</button>
          <button onclick="app.exportFinanceData()" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">匯出 JSON</button>
          <span class="text-[11px] bg-slate-100 px-3 py-2 rounded-full border">已批核 $${totalActual} | 待批 $${totalPending} | 總計 $${totalAll} | 預算 $${totalBudget}</span>
        </div>
        <div id="settlement-print-area" class="bg-white border rounded-xl p-6 space-y-4">
          <div class="text-center border-b-2 border-slate-900 pb-3">
            <h2 class="text-lg font-extrabold">港島童軍繽紛日 2026 結算總表 (附件5) - 已修正批核流程</h2>
            <p class="text-[11px] text-slate-500 mt-1">按附件1銀碼區分報價及批核，含四格印流程，後台紀錄</p>
            <div class="text-[11px] mt-2 flex justify-center gap-4 flex-wrap"><span>活動: ${escapeHtml(this.currentEvent?.event_name||'ISD2026')}</span><span>列印日期: ${todayISO()}</span><span>列印人: ${escapeHtml(this.currentUser?.name||'')}</span><span>總額: $${totalAll} (${overallChain.quotation})</span></div>
          </div>
          <div class="table-responsive"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100 font-bold"><tr><th class="border px-2 py-1 text-left">憑單編號</th><th class="border px-2 py-1 text-left">支出項目</th><th class="border px-2 py-1 text-left">組別</th><th class="border px-2 py-1 text-left">金額</th><th class="border px-2 py-1 text-left">報價要求</th><th class="border px-2 py-1 text-left">單據</th><th class="border px-2 py-1 text-left">申請→批核→再確認 (按銀碼)</th></tr></thead><tbody>${expenses.map(e=>{
            const chain=getApprovalChain(e.actual, false);
            return `
            <tr class="${e.status==='approved'?'bg-emerald-50':e.status==='pending'?'bg-amber-50':''}">
              <td class="border px-2 py-1 font-mono">${escapeHtml(e.voucher)}</td>
              <td class="border px-2 py-1 font-medium">${escapeHtml(e.item_name)}<div class="text-[10px] text-slate-500">${escapeHtml(e.description||'')}</div><div class="text-[10px] text-slate-400">申請人: ${escapeHtml(e.submitted_by||'經辦人')}</div></td>
              <td class="border px-2 py-1">${escapeHtml(e.group_name)}</td>
              <td class="border px-2 py-1 font-bold text-rose-700">$${e.actual}<div class="text-[9px] text-slate-500">預算 $${e.budget}</div></td>
              <td class="border px-2 py-1 text-[10px]">${escapeHtml(chain.quotation)}</td>
              <td class="border px-2 py-1">${e.receipt_name?`<span class="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">${escapeHtml(e.receipt_name)}</span>${e.receipt_url?`<br><a href="${e.receipt_url}" target="_blank" class="text-sky-600 underline text-[10px]">查看單據</a>`:''}`:'無'}</td>
              <td class="border px-2 py-1 text-[10px] leading-relaxed">
                <div><b>申請:</b> ${escapeHtml(e.submitted_by||'經辦人')} (經辦人無須簽署)</div>
                <div><b>Checked by:</b> 各組副主席 (${escapeHtml(e.group_name)}副主席)</div>
                <div><b>Certified by:</b> 財政主任 / 總主任(行政) / 副主席(行政)</div>
                <div><b>批核鏈 (${chain.quotation}):</b><br>${chain.steps.map(s=>`${s.role} ${s.action}`).join(' → ')}</div>
                <div class="mt-1"><span class="text-[10px] px-1.5 py-0.5 rounded-full ${e.status==='approved'?'bg-emerald-100 text-emerald-700 border border-emerald-200':e.status==='pending'?'bg-amber-100 text-amber-700 border border-amber-200':'bg-slate-100'}">${e.status==='approved'?'已批核 '+escapeHtml(e.approved_by||''):e.status==='pending'?'待批核':'已拒絕'}</span></div>
              </td>
            </tr>
          `}).join('') || '<tr><td colspan="7" class="border px-2 py-4 text-center text-slate-400">暫無開支申報</td></tr>'}
          <tr class="bg-slate-900 text-white font-bold"><td class="border px-2 py-1" colspan="3">總計 (實際)</td><td class="border px-2 py-1">$${totalAll}</td><td class="border px-2 py-1" colspan="3">已批核 $${totalActual} | 待批 $${totalPending} | 批核鏈: ${overallChain.steps.map(s=>`${s.role} ${s.action}`).join(' → ')}</td></tr>
          </tbody></table></div>
          <div class="bg-slate-50 border rounded-xl p-3 text-[11px] leading-relaxed">
            <b>四格印簽署位置說明 (附件6)：</b><br>
            ${fourGridInfo.map((g,i)=>`<div class="flex gap-2 mt-1"><span class="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-full">${i+1}</span><b>${escapeHtml(g.pos)}：</b>${escapeHtml(g.who)} - ${escapeHtml(g.desc)}</div>`).join('')}
            <div class="mt-2 text-[10px] text-slate-600">註：各組副主席（經辦人無須簽署）→ 財政主任或總主任（行政）或副主席（行政）→ 按銀碼再由主席/助理地域總監/副地域總監/地域總監批核 (見附件1)</div>
          </div>
          <div class="grid grid-cols-2 gap-6 pt-4">
            <div class="border rounded-xl p-3 h-[110px]"><div class="text-[11px] font-bold">1. 經辦人 / 申請人 (無須簽署，按附件6)：</div><div class="text-[10px] text-slate-500 mt-1">姓名：___________ 組別：___________</div><div class="mt-8 border-t border-slate-400 pt-1 text-[10px] text-slate-500">經辦人無須簽署 (附件6註明)</div></div>
            <div class="border rounded-xl p-3 h-[110px]"><div class="text-[11px] font-bold">2. Checked by 各組副主席：</div><div class="text-[10px] text-slate-500 mt-1">核實支出屬實</div><div class="mt-8 border-t border-slate-400 pt-1 text-[10px] text-slate-500">各組副主席簽名 / 日期 (第二行)</div></div>
            <div class="border rounded-xl p-3 h-[110px]"><div class="text-[11px] font-bold">3. Certified by 財政主任 / 總主任(行政) / 副主席(行政)：</div><div class="text-[10px] text-slate-500 mt-1">審核真確性及預算</div><div class="mt-8 border-t border-slate-400 pt-1 text-[10px] text-slate-500">財政主任或總主任(行政)或副主席(行政)簽名 / 日期 (第三行)</div></div>
            <div class="border rounded-xl p-3 h-[110px] bg-amber-50 border-amber-200"><div class="text-[11px] font-bold">4. Approved by 按銀碼批核 (附件1)：</div><div class="text-[10px] mt-1 leading-relaxed">${overallChain.steps.map(s=>`<div>• ${escapeHtml(s.role)}：${escapeHtml(s.action)}</div>`).join('')}${overallChain.steps.length===0?'<div>• 各副主席批核 (≤$500)</div>':''}</div><div class="mt-2 border-t border-amber-300 pt-1 text-[9px] text-amber-800">總額 $${totalAll} → ${escapeHtml(overallChain.quotation)}</div></div>
          </div>
          <div class="text-[10px] text-slate-500 mt-4 border-t pt-2">
            說明：本結算總表已修正，按附件1 <b>報價要求及批核人士</b> 區分銀碼，不同級數不同批核鏈；四格印按指引：第二行 Checked by 各組副主席，第三行 Certified by 財政主任/總主任(行政)/副主席(行政)，第一行經辦人無須簽署，第四行按銀碼由主席/助理地域總監/副地域總監/地域總監批核。所有單據需蓋四格印至少1/3在單據上，熱感式需影印加COPY章。後台已紀錄於 localStorage + GAS Finance Sheet + AuditLog。<br>
            指引文件：<a href="https://drive.google.com/drive/folders/1zkJI5Yp1xv6PNSp8e7kJRKcjRjlyDO8C" target="_blank" class="text-sky-600 underline">Drive 指引資料夾</a> 含財務指引 ver1、附件1報價要求 (本表依據)、附件2豁免名單、附件3口頭報價、附件4書面報價比較表 (主席推薦→助理地域總監認可→副地域總監批核)、附件5結算總表、附件6四格印簽名位置。
          </div>
        </div>
      </div>
    `;
  }
,
  printSettlement(){
    const area=document.getElementById('settlement-print-area');
    if(!area){ showToast('找不到列印區域','error'); return; }
    const win=window.open('','_blank');
    win.document.write(`<html><head><title>結算總表</title><link rel="stylesheet" href="${location.origin}/assets/tailwind.css"><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:6px;font-size:11px} @media print{button{display:none}}</style></head><body>${area.innerHTML}<div class="mt-6 text-center"><button onclick="window.print()" class="bg-slate-900 text-white px-6 py-2 rounded-xl">列印</button></div></body></html>`);
    win.document.close();
  }
,
  /* ===================== v13 部門中心財務頁籤（全部門共設） =====================
     每個部門都有自己的「開支申報」頁籤：本組提交（組別自動帶入）→ 自動加入財務紀錄
     → 即時反映在行政組「財務匯總」及結算總表（毋須任何部門重新輸入）。 */
  renderGroupExpenseTabHTML(groupName){
    groupName=normalizeGroupName(groupName);
    const fin=this.getFinanceData();
    const groupBudget=(fin.group_itemized_budgets||[]).find(g=>normalizeGroupName(g.group_name)===groupName);
    const budgetItems=(groupBudget?.items||[]);
    const budgetTotal=budgetItems.reduce((s,i)=>s+(parseFloat(i.budget)||0),0);
    const exps=(fin.expenses||[]).filter(e=>normalizeGroupName(e.group_name)===groupName);
    const myId=this.currentUser?.user_id||'',myName=this.currentUser?.name||'',myGroup=normalizeGroupName(this.currentUser?.group_name);
    const lvl=this.roleLevel(this.currentUser?.role);
    const isMine=e=>(e.submitted_by_id&&e.submitted_by_id===myId)||(myName&&e.submitted_by===myName);
    const canApprove=this.canApproveArea('finance');
    const privileged=canApprove||this.canManageApprovalRouting()||this.isAllGroupViewer();
    const chief=!!this.currentUser&&myGroup===groupName&&lvl>=40;   // 本組總主任以上＝本組負責人
    const canSeeAll=privileged||chief;
    const visible=exps.filter(e=>canSeeAll||isMine(e));
    const cnt=st=>visible.filter(e=>e.status===st);
    const sum=arr=>arr.reduce((s,e)=>s+(parseFloat(e.actual)||0),0);
    const pending=cnt('pending'),approved=cnt('approved'),rejected=cnt('rejected');
    const claimedTotal=sum(pending)+sum(approved);
    const remain=budgetTotal-claimedTotal;
    const chip=(v,l,cls,t)=>`<div class="${cls} rounded-xl px-3 py-2 text-center" ${t?`title="${t}"`:''}><div class="text-[16px] font-extrabold">${v}</div><div class="text-[10px]">${l}</div></div>`;
    const rows=visible.slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).map(e=>{
      const act=[];
      if(this.canConfirmApplication(e)) act.push(`<button onclick="app.confirmApplication('finance','${e.id}')" class="bg-sky-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold">本組確認</button>`);
      if(canApprove&&this.applicationReadyForApproval(e)) act.push(`<button onclick="app.approveExpense('${e.id}')" class="bg-emerald-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold">批准</button><button onclick="app.rejectExpense('${e.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-lg text-[10px] font-bold">拒絕</button>`);
      if(this.isSuperAdmin()) act.push(`<button onclick="app.deleteExpense('${e.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-lg text-[10px]">🗑️</button>`);
      return `<tr>
        <td class="border px-2 py-1 font-mono">${escapeHtml(e.voucher||'')}</td>
        <td class="border px-2 py-1"><b>${escapeHtml(e.item_name||'')}</b><div class="text-[10px] text-slate-400">${escapeHtml(e.description||'')}</div></td>
        <td class="border px-2 py-1 text-center font-bold text-rose-700">$${(parseFloat(e.actual)||0).toLocaleString()}</td>
        <td class="border px-2 py-1 text-center">${escapeHtml(e.date||'-')}</td>
        <td class="border px-2 py-1">${escapeHtml(e.submitted_by||'')}</td>
        <td class="border px-2 py-1 text-center">${e.receipt_url?`<a href="${escapeHtml(e.receipt_url)}" target="_blank" class="text-sky-600 underline">單據</a>`:(e.receipt_data?`<button onclick="app.downloadFinanceReceipt('${e.id}')" class="text-sky-600 underline text-[10px]">下載單據</button>`:'-')}</td>
        <td class="border px-2 py-1 text-center">${this.coordStatusChip(e.status)}</td>
        <td class="border px-2 py-1 no-print">${act.length?`<div class="flex flex-wrap gap-1">${act.join('')}</div>`:'<span class="text-[10px] text-slate-400">-</span>'}</td>
      </tr>`;}).join('');
    return `
      <div class="space-y-3">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] leading-relaxed text-emerald-900">
          <b>💰 本組開支申報（${escapeHtml(groupName)}）：</b>在這裏提交的開支申報會<b>自動</b>加入財務紀錄（毋須行政組或本組重新輸入），即時反映在<b>行政組「財務匯總」</b>及「結算總表」，讓負責人更容易掌握財政狀況。<br>
          • 流程：填表＋上傳單據副本 → 低於總主任提交先由<b>本組總主任以上確認</b> → 交 ${escapeHtml(this.approvalRouteLabel('finance','approver_groups'))} 批核<br>
          • 報銷程序、報價門檻（≤$500 免報價等）見本部門「📖 財務指引」頁籤
        </div>
        ${!this.currentUser?`<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px]">開支申報需登入。請按右上角「登入」。</div>`:`
        <div class="flex gap-2 flex-wrap">
          <button onclick="app.openExpenseForm(null,'${escapeHtml(groupName)}')" class="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>新增開支申報（本組）</button>
          ${canApprove?`<button onclick="app.openFinanceFromAdminGroup('expense')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">進入財務頁批核</button>`:''}
          <span class="text-[11px] bg-slate-100 px-3 py-2 rounded-full border">本組 ${visible.length} 宗${canSeeAll?'（全組）':'（自己提交）'}</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
          ${chip('$'+budgetTotal.toLocaleString(),'本組預算總額','bg-slate-100 text-slate-700 border')}
          ${chip('$'+claimedTotal.toLocaleString(),'已申報總額（待批＋已批）','bg-sky-50 text-sky-700 border border-sky-200')}
          ${chip(pending.length+' 宗 · $'+sum(pending).toLocaleString(),'待批核','bg-amber-50 text-amber-700 border border-amber-200')}
          ${chip(approved.length+' 宗 · $'+sum(approved).toLocaleString(),'已批核','bg-emerald-50 text-emerald-700 border border-emerald-200')}
          ${chip('$'+remain.toLocaleString(),remain<0?'超支（超出預算）':'剩餘預算',remain<0?'bg-rose-50 text-rose-700 border border-rose-200':'bg-slate-50 text-slate-600 border')}
        </div>
        ${remain<0?`<div class="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-[11px] text-rose-700"><b>⚠️ 已超出預算：</b>本組已申報總額 $${claimedTotal.toLocaleString()} 超出預算 $${budgetTotal.toLocaleString()}（超出 $${Math.abs(remain).toLocaleString()}）。超出預算之開支須先獲批核，請參閱財務指引。</div>`:''}
        <div class="bg-white border rounded-xl p-3">
          <b class="text-[12px]"><i class="fa-solid fa-receipt text-emerald-600 mr-1"></i>本組開支申報紀錄 (${visible.length})</b>
          ${!canSeeAll?`<div class="text-[10px] text-slate-400 mt-0.5">你目前只會看到自己提交的申報；本組總主任以上可見全組申報。</div>`:''}
          <div class="table-responsive mt-2"><table class="min-w-full text-[11px] border"><thead class="bg-slate-100"><tr><th class="border px-2 py-1">憑單</th><th class="border px-2 py-1">項目</th><th class="border px-2 py-1">金額</th><th class="border px-2 py-1">日期</th><th class="border px-2 py-1">申請人</th><th class="border px-2 py-1">單據</th><th class="border px-2 py-1">狀態</th><th class="border px-2 py-1 no-print">操作</th></tr></thead>
          <tbody>${rows||`<tr><td colspan="8" class="border px-2 py-4 text-center text-slate-400">暫無開支申報（按上方「新增開支申報（本組）」提交）</td></tr>`}</tbody></table></div>
        </div>
        ${rejected.length?`<div class="text-[10.5px] text-slate-400">另有 ${rejected.length} 宗已拒絕申報（已列入上表）。</div>`:''}`}
      </div>`;
  }
,
  /* v13：部門中心「財務指引」頁籤——全文內建，方便各組查看（毋須開 Drive／毋須登入） */
  renderGroupFinanceGuideTabHTML(groupName){
    groupName=normalizeGroupName(groupName);
    const folderLink=(this.getFinanceData().drive_folder_link||'https://drive.google.com/drive/folders/1zkJI5Yp1xv6PNSp8e7kJRKcjRjlyDO8C?usp=sharing');
    return `
      <div class="space-y-3">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] leading-relaxed">
          <b>📖 財務指引（${escapeHtml(groupName)}專用入口）：</b>報銷程序、報價要求（附件1）、豁免商戶（附件2）、口頭報價（附件3）、書面報價（附件4）、結算總表（附件5）及四格印（附件6）全文內建，各組直接查看，毋須開 Drive APP。
        </div>
        ${this.renderBuiltinFinanceGuide()}
        <div class="flex gap-2 flex-wrap">
          <a href="${folderLink}" target="_blank" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-folder-open mr-1"></i> 開啟 Drive 指引資料夾</a>
          <button onclick="app.openModule('finance')" class="bg-white border px-3 py-2 rounded-xl text-xs font-bold">進入完整財務頁</button>
        </div>
      </div>`;
  }
,
});
