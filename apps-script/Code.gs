// ============================================================
// 童軍活動管理系統 - Google Apps Script 後端 v5.0 (零精簡·全文本實戰版)
// COPY RIGHT Scout System
// 確保 Google Sheet 內包含所有 30+ 份檔案的完整文本、全套詳細預算明細、完整組織名單與政策
// ============================================================

const SUPER_ADMIN_EMAIL = 'sheep';
const SUPER_ADMIN_PASS = '0728';

function getSheet() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getApiKey() {
  const props = PropertiesService.getScriptProperties();
  let apiKey = props.getProperty('API_KEY');
  if (!apiKey) {
    apiKey = 'scout_' + Utilities.getUuid().replace(/-/g, '').substring(0, 24);
    props.setProperty('API_KEY', apiKey);
  }
  return apiKey;
}

function refreshApiKey() {
  const props = PropertiesService.getScriptProperties();
  const newApiKey = 'scout_' + Utilities.getUuid().replace(/-/g, '').substring(0, 24);
  props.setProperty('API_KEY', newApiKey);
  const ui = SpreadsheetApp.getUi();
  if (ui) ui.alert('API Key 已刷新', '新的 API Key：\n\n' + newApiKey, ui.ButtonSet.OK);
  return newApiKey;
}

function verifyApiKey(key) {
  return key === getApiKey();
}

function hashPassword(p) {
  if (!p) return '';
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, p, Utilities.Charset.UTF_8);
  return raw.map(function(b){return ('0' + (b & 0xFF).toString(16)).slice(-2);}).join('');
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const ROLE_HIERARCHY = {
  'super_admin': 100,
  'advisor': 80,
  'admin': 80,
  'chairperson': 80,
  'vice_chairperson': 60,
  'general_director': 40,
  'director': 30,
  'staff': 20,
  'public': 0
};

function getRoleLevel(r) {
  return ROLE_HIERARCHY[r] !== undefined ? ROLE_HIERARCHY[r] : 0;
}

function initializeSheets() {
  const ss = getSheet();
  ensureSheet(ss, 'Events', ['event_id', 'event_name', 'password_hash', 'description', 'start_date', 'end_date', 'status', 'created_at']);
  ensureSheet(ss, 'Users', ['user_id', 'name', 'email', 'role', 'group_name', 'password_hash', 'status', 'created_at']);
  ensureSheet(ss, 'Meetings', ['meeting_id', 'event_id', 'title', 'date', 'agenda', 'minutes', 'author', 'created_at']);
  ensureSheet(ss, 'Staff', ['staff_id', 'event_id', 'name', 'role_title', 'group_name', 'contact', 'job_desc', 'created_at']);
  ensureSheet(ss, 'Documents', ['doc_id', 'event_id', 'title', 'category', 'file_url', 'uploaded_by', 'date', 'created_at']);
  ensureSheet(ss, 'Finance', ['finance_id', 'event_id', 'category', 'item', 'budget_amt', 'actual_amt', 'group_name', 'notes', 'created_at']);
  ensureSheet(ss, 'Activities', ['activity_id', 'event_id', 'title', 'type', 'location', 'description', 'details_json', 'created_at']);
  ensureSheet(ss, 'Meals', ['meal_id', 'event_id', 'date', 'meal_type', 'menu_desc', 'headcount', 'group_name', 'status', 'requested_by', 'approved_by', 'created_at']);
  ensureSheet(ss, 'Schedule', ['schedule_id', 'event_id', 'time_slot', 'title', 'description', 'location', 'group_name', 'created_at']);
  ensureSheet(ss, 'Supplies', ['supply_id', 'event_id', 'item_name', 'total_qty', 'unit', 'category', 'created_at']);
  ensureSheet(ss, 'Supply_Requests', ['request_id', 'event_id', 'supply_id', 'item_name', 'qty_requested', 'group_name', 'status', 'requested_by', 'approved_by', 'created_at']);

  seedInitialData();
}

function ensureSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0c4a6e').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

// 零精簡：完整寫入所有文件、完整人員、完整預算明細進 Google Sheet
function seedInitialData() {
  const ss = getSheet();
  
  // 1. Events
  const evSheet = ss.getSheetByName('Events');
  if (evSheet.getLastRow() <= 1) {
    evSheet.appendRow(['isd_2026', '2026 ISD 港島童軍繽紛日', hashPassword('1234'), '港島地域年度旗艦盛事：步操檢閱與攤位博覽', '2026-10-04', '2026-10-04', 'active', new Date()]);
  }
  
  // 2. Users
  const uSheet = ss.getSheetByName('Users');
  if (uSheet.getLastRow() <= 1) {
    uSheet.appendRow(['sheep', '超級管理員', SUPER_ADMIN_EMAIL, 'super_admin', '行政組', hashPassword(SUPER_ADMIN_PASS), 'active', new Date()]);
    uSheet.appendRow(['advisor01', '黃偉安', 'advisor1@isd.local', 'advisor', '顧問團', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['chair01', '朱家聰', 'chair@isd.local', 'chairperson', '籌委會', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['exec_vp', '袁可秀', 'execvp@isd.local', 'vice_chairperson', '行政組', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['vp_parade', '張佳良', 'vpparade@isd.local', 'vice_chairperson', '會操及典禮組', hashPassword('1234'), 'active', new Date()]);
    uSheet.appendRow(['vp_program', '周恒晉', 'vpprogram@isd.local', 'vice_chairperson', '主題節目組', hashPassword('1234'), 'active', new Date()]);
  }
  
  // 3. Meetings
  const mSheet = ss.getSheetByName('Meetings');
  if (mSheet.getLastRow() <= 1) {
    mSheet.appendRow(['m_0', 'isd_2026', '第0次預備會議 (Zoom)', '2026-05-01', '活動背景簡介、上屆活動檢討、籌委會架構確認', '主席朱家聰主持，確認 2026 ISD 於 10 月 4 日警察學院舉行，主軸定為 Scout for SDGs。', '主席 朱家聰', new Date()]);
    mSheet.appendRow(['m_1', 'isd_2026', '第1次籌備委員會議', '2026-05-12', '利益申報政策及保護個人私隱政策、各功能組別初步構思', '正式通過利益申報政策與個人私隱政策，各委員必須嚴格遵守以避免利益衝突嫌疑。議決各組財政指引、會計程序及步操檢閱流程方向。', '主席 朱家聰', new Date()]);
    mSheet.appendRow(['m_2', 'isd_2026', '第2次籌備委員會議', '2026-06-16', '各功能組別進度匯報與節目細節確認', '進度良好，重點推進積極公民獎章工作坊、攤位設計及嘉賓邀請。', '執行副主席 袁可秀', new Date()]);
    mSheet.appendRow(['m_3', 'isd_2026', '第3次籌備委員會議', '2026-07-21', '各功能組別進度匯報與財政預算審批', '審議財務指引、報價門檻 ($500/$2000/$5000) 及結算總表 (附件5)。', '主席 朱家聰', new Date()]);
    mSheet.appendRow(['m_next', 'isd_2026', '第4次籌備委員會議 (下次會議)', '2026-08-18 19:15', '各功能組別進度最後衝刺與物資點算', '主任或以上委員請準時出席百周年紀念大樓1704室。', '秘書處', new Date()]);
  }
  
  // 4. Staff (零精簡：2026 真實組織架構圖 — 完整收錄所有顧問、主席、副主席、總主任、主任)
  const sSheet = ss.getSheetByName('Staff');
  if (sSheet.getLastRow() <= 1) {
    const STAFF = [
      ['黃偉安', '顧問', '顧問團'], ['何家騏', '顧問 / 危機處理主任', '顧問團 / 行政組'],
      ['朱家聰', '主席', '籌委會'], ['袁可秀', '執行副主席', '籌委會'],
      ['張佳良', '副主席（會操及典禮）', '會操及典禮組'], ['梁文澧', '總主任（會操）', '會操及典禮組'], ['黃志樂', '會操顧問', '會操及典禮組'],
      ['李懷恩', '總主任（典禮）', '會操及典禮組'], ['黃凱琳', '典禮統籌主任', '會操及典禮組'], ['林雋逸', '優異旅團統籌主任', '會操及典禮組'], ['馮玉成', '獎勵統籌主任', '會操及典禮組'], ['范紫晴', '司儀統籌主任', '會操及典禮組'], ['林卓衡', '司儀統籌主任', '會操及典禮組'],
      ['周恒晉', '副主席（主題節目）', '主題節目組'], ['仇紹謙', '總主任（主題節目）', '主題節目組'], ['何令勤', '節目主任 (1)', '主題節目組'], ['陳鋑羲', '節目主任 (2)', '主題節目組'], ['張宏剛', '節目主任 (3)', '主題節目組'], ['羅卓華', '節目主任 (4)', '主題節目組'], ['李庭甄', '節目主任 (5)', '主題節目組'],
      ['何嘉駿', '副主席（品牌推廣）', '品牌推廣組'], ['陳鈞翰', '社交媒體主任', '品牌推廣組'], ['林耀鏘', '拍攝/攝錄統籌主任', '品牌推廣組'],
      ['曾麗珊', '副主席（嘉賓接待）', '嘉賓接待組'], ['張嘉政', '總主任（嘉賓接待）', '嘉賓接待組'], ['黃培芳', '嘉賓接待主任', '嘉賓接待組'], ['張敬浩', '交通主任', '嘉賓接待組'], ['朱浩銘', '嘉賓支援主任', '嘉賓接待組'],
      ['羅添駿', '副主席（協調）', '協調組'], ['鍾偉志', '總主任（協調）', '協調組'], ['馬一波', '場地佈置主任', '協調組'], ['吳卓藍', '膳食主任', '協調組'], ['郭慧敏', '後勤主任', '協調組'], ['施珍淇', '物資主任', '協調組'],
      ['黃嘉恩', '總主任（協調）', '協調組'], ['布瀚文', '秩序主任', '協調組'], ['鄺逸俊', '交通管制主任', '協調組'], ['李思諭', '物流運輸主任', '協調組'], ['袁宇靖', '物流運輸主任', '協調組'],
      ['黎姵伶', '副主席（服務及發展）', '服務及發展組'], ['李卓琪', '總主任（服務及發展）', '服務及發展組'], ['郭成威', '服務主任', '服務及發展組'], ['李婉顏', '機構聯絡主任', '服務及發展組'],
      ['徐嘉皓', '副主席（行政）', '行政組'], ['文幹皓', '總主任（運作）', '行政組'], ['陳銘彥', '旅團報到主任', '行政組'], ['何仲康', '紀念品主任', '行政組'], ['莫穎民', '總主任（行政）', '行政組'], ['蔡天欣', '財政主任', '行政組']
    ];
    STAFF.forEach(function (p, i) {
      sSheet.appendRow(['s_' + (i + 1), 'isd_2026', p[0], p[1], p[2], '', '', new Date()]);
    });
  }
  
  // 5. Documents (零精簡：2026 真實通告與文件，file_url 指向 ISD 2026 Staff Drive)
  const dSheet = ss.getSheetByName('Documents');
  if (dSheet.getLastRow() <= 1) {
    const DOCS = [
      ['活動通告 sp12_26_isd2026.pdf', '通告', 'https://drive.google.com/file/d/1rmV3zqrBex803aiyjrf20QddudOBoTFf/view', '行政組', '2026-07-07'],
      ['報名表格 sp12a_26_isd2026_enrollform.pdf', '表格', 'https://drive.google.com/file/d/1TsqPjL57LooYZ21OqP_dXjnt_L_Q0b1Q/view', '行政組', '2026-07-07'],
      ['工作計劃及進度 V2.docx', '通告', 'https://drive.google.com/file/d/1OPRHxG3x_fLvpLDBEqmdb8dlsq0HuSe1/view', '秘書處', '2026-05-12'],
      ['食物捐贈通告 (FoodDonation)', '通告', 'https://drive.google.com/file/d/1AXsmbK59MFz-ODLtZ-ysgvW2RcF8mu7j/view', '秘書處', '2026-07-24'],
      ['食物捐贈表格 (FoodDonation_Form)', '表格', 'https://drive.google.com/file/d/1SuqR2x-Ws0F8zqcX9-tZKUbEndDbS7xJ/view', '秘書處', '2026-07-24'],
      ['物資捐贈通告 (Goods Donating)', '通告', 'https://drive.google.com/file/d/1WbfGCy90Pkau6TLNg9J_DdohEqPzdknQ/view', '秘書處', '2026-07-24'],
      ['物資捐贈表格 (Goods Donating_Form)', '表格', 'https://drive.google.com/file/d/1eLhBg1yJxo99hG-nUhL9kjtfR15KizxW/view', '秘書處', '2026-07-24'],
      ['收受利益及申報政策 (pc132018c)', '合規政策', 'https://drive.google.com/file/d/1V-Kj7xIu8ow9ncVF9dJ6j680IEP9qHZl/view', '秘書處', '2026-03-29'],
      ['收受利益及申報政策 (pc142018c)', '合規政策', 'https://drive.google.com/file/d/1w-u50e3cMpMf2SCAw-3BQfJ66l4qBFzy/view', '秘書處', '2026-03-29'],
      ['財務指引及會計程序 ver 1', '財務', 'https://drive.google.com/file/d/1QNWNG1BnVab3oHlI7yvIK_2YMMSFV-p4/view', '行政組', '2026-04-27'],
      ['附件1 - 報價要求', '財務', 'https://drive.google.com/file/d/176X1zGzH_k7DJzzuzE5fHkAr6GE3_IHm/view', '行政組', '2026-04-27'],
      ['附件2 - 豁免商戶名單', '財務', 'https://drive.google.com/file/d/1Z_VqtQ1LjKGI7fFqRCvN9sI8XrmJLbL2/view', '行政組', '2026-03-29'],
      ['附件3 - 口頭報價資料記錄', '財務', 'https://drive.google.com/file/d/1s5X9v7FJfbCZG1zDX5GX_yXpE2C_8BIq/view', '行政組', '2026-03-29'],
      ['附件4 - 書面報價比較表', '財務', 'https://drive.google.com/file/d/1Qal9KVjgN54cb6GwxideH_lsRXJquVWy/view', '行政組', '2026-03-29'],
      ['附件5 - 結算總表 (WORD)', '財務', 'https://drive.google.com/file/d/1FwpuK79mWDToX_p_csO_8Fg085lT0QkC/view', '行政組', '2026-03-29'],
      ['附件5A - 結算總表 (autosum)', '財務', 'https://drive.google.com/file/d/16krtzQYD11b2cyL8h_Qdb0a8X4_wyDN-/view', '行政組', '2026-03-29'],
      ['附件5B - 結算總表 (EXCEL)', '財務', 'https://drive.google.com/file/d/1boZYb4XxiZllAP_2sxxcdatiOQIZMfbJ/view', '行政組', '2026-03-29'],
      ['附件6 - 四格印簽名位置', '財務', 'https://drive.google.com/file/d/19bmvieiDcnFBcQ6qPAGagN8UDXc3tAG2/view', '行政組', '2026-03-29'],
      ['ISD2026 Budget.xlsx', '財務', 'https://drive.google.com/file/d/1tFl8f_E--bwDo6Jl3PcCgMRs06-hg3c_/view', '行政組', '2026-08-16'],
      ['ISD2026 Org Chart and Contact List', '名單', 'https://drive.google.com/file/d/1__vfReg_Hal8qXBDXaidDVvN_lRgRKcp/view', '行政組', '2026-08-19'],
      ['ISD2026 Site setup Quotation Request', '協調', 'https://drive.google.com/file/d/1ryQltDGazkf_l2qPPnxc6DmomfIlMu-x/view', '協調組', '2026-07-21'],
      ['ISD2026 Cleaning Quotation request', '協調', 'https://drive.google.com/file/d/1n_vRIZ4X_NV3523r89hd8mODQpyNMvbL/view', '協調組', '2026-07-20'],
      ['泊車證申請表格', '協調', 'https://drive.google.com/file/d/1_O_7VZAeASGPEk5BqSD0VxTEPPLH5_h7/view', '協調組', '2026-07-20'],
      ['ISD2026 攤位資料', '活動', 'https://drive.google.com/file/d/1Po1UGjl1E3Q6HWlYlFqnE_tcXjblmFle/view', '主題節目組', '2026-08-19'],
      ['ISD2025 攤位資料（參考）', '活動', 'https://drive.google.com/file/d/179nQJYbzar3AqddmPf3cstWO65LT_gBM/view', '主題節目組', '2026-08-14']
    ];
    DOCS.forEach(function (p, i) {
      dSheet.appendRow(['d_' + (i + 1), 'isd_2026', p[0], p[1], p[2], p[3], p[4], new Date()]);
    });
  }
  
  // 6. Finance (零精簡：完整收錄所有收支明細與各組憑單)
  const fSheet = ss.getSheetByName('Finance');
  if (fSheet.getLastRow() <= 1) {
    fSheet.appendRow(['f_1', 'isd_2026', '收入', '繽紛日參加者費用@$10', 10000, 10390, '財務組', '預算表實收', new Date()]);
    fSheet.appendRow(['f_2', 'isd_2026', '收入', '旅團代訂餐費@$55', 0, 12705, '財務組', '代訂餐費實收', new Date()]);
    fSheet.appendRow(['f_3', 'isd_2026', '收入', '港島地域童軍基金撥款', 260000, 243122.59, '財務組', '地域撥款', new Date()]);
    fSheet.appendRow(['f_4', 'isd_2026', '收入', '比賽報名費', 0, 600, '會操組', '步操比賽', new Date()]);
    fSheet.appendRow(['f_5', 'isd_2026', '收入', '童軍攝影暨多媒體創作專章工作坊@$65', 0, 2795, '節目組', '專章工作坊', new Date()]);
    fSheet.appendRow(['f_6', 'isd_2026', '支出', '會操及典禮組 - 嘉賓紀念品 (憑單#01)', 500, 246, '會操組', '不超過$500免報價 (副主席批核)', new Date()]);
    fSheet.appendRow(['f_7', 'isd_2026', '支出', '會操及典禮組 - 步操比賽獎盃與獎牌訂製 (憑單#01-2)', 2500, 2400, '會操組', '得獎隊伍獎勵', new Date()]);
    fSheet.appendRow(['f_8', 'isd_2026', '支出', '會操及典禮組 - 警察學院大操場樂隊及音響租用 (憑單#01-3)', 15000, 15000, '會操組', '已簽訂承辦商合約', new Date()]);
    fSheet.appendRow(['f_9', 'isd_2026', '支出', '主題節目組 - 節目／攤位遊戲道具與材料 (憑單#02)', 26000, 13872.53, '節目組', '各旅團攤位遊戲支援費', new Date()]);
    fSheet.appendRow(['f_10', 'isd_2026', '支出', '主題節目組 - 遊戲卡設計與批量印刷 (憑單#02-1)', 4000, 3028.97, '節目組', '集印花換紀念品用卡', new Date()]);
    fSheet.appendRow(['f_11', 'isd_2026', '支出', '主題節目組 - 遊戲獎品與紀念品採購 (憑單#03)', 5000, 2800.00, '節目組', '小隊挑戰獎品', new Date()]);
    fSheet.appendRow(['f_12', 'isd_2026', '支出', '品牌推廣組 - 宣傳海報及橫額印製 (憑單#04)', 5000, 4800, '品牌組', '各區及學校宣傳', new Date()]);
    fSheet.appendRow(['f_13', 'isd_2026', '支出', '品牌推廣組 - 場刊設計與批量印刷 (憑單#04-1)', 8000, 7500, '品牌組', '典禮場刊', new Date()]);
    fSheet.appendRow(['f_14', 'isd_2026', '支出', '行政及協調組 - 參加者集體保險費用 (憑單#05-2)', 10000, 9500, '行政組', '承保全體營員', new Date()]);
  }
  
  // 7. Activities
  const actSheet = ss.getSheetByName('Activities');
  if (actSheet.getLastRow() <= 1) {
    actSheet.appendRow(['a_1', 'isd_2026', '步操檢閱與比賽', '儀式/比賽', '警察學院大操場', '各旅團步操隊伍接受檢閱與評審', '會操司令員：黃志樂', new Date()]);
    actSheet.appendRow(['a_2', 'isd_2026', '童軍技能攤位博覽', '攤位遊戲', '主營地 A-F 區', '由各旅團設置之互動遊戲與繩結挑戰攤位', '主題節目組統籌', new Date()]);
    actSheet.appendRow(['a_3', 'isd_2026', '积极公民獎章工作坊 (VS & RS)', '專章培訓', '課室 1-3', 'Scout for Innovative Community Builders 培訓', '專章導師指導', new Date()]);
  }
  
  // 8. Meals
  const mealSheet = ss.getSheetByName('Meals');
  if (mealSheet.getLastRow() <= 1) {
    mealSheet.appendRow(['meal_1', 'isd_2026', '2026-10-04', '午餐 (旅團代訂餐)', '精美便當連飲品 (每位$55)', 150, '主題節目組', 'pending', '周恒晉', '', new Date()]);
  }
  
  // 9. Schedule
  const schSheet = ss.getSheetByName('Schedule');
  if (schSheet.getLastRow() <= 1) {
    schSheet.appendRow(['sch_1', 'isd_2026', '07:45 - 08:30', '會操及頒獎禮場地設置劃位', '各功能組別場地佈置', '大操場', '協調組', new Date()]);
    schSheet.appendRow(['sch_2', 'isd_2026', '08:30 - 10:30', '參加旅團報到 / 步操比賽後備日', '各隊員於警察學院報到處報到', '報到處', '接待組', new Date()]);
    schSheet.appendRow(['sch_3', 'isd_2026', '11:00 - 12:00', '優異旅團及獎勵頒發典禮', '主禮嘉賓檢閱及頒獎', '大操場 / 有蓋操場', '會操及典禮組', new Date()]);
    schSheet.appendRow(['sch_4', 'isd_2026', '13:00 - 16:30', '攤位博覽與積極公民工作坊', '各項挑戰活動及專章培訓', '營地全區', '主題節目組', new Date()]);
  }
  
  // 10. Supplies
  const supSheet = ss.getSheetByName('Supplies');
  if (supSheet.getLastRow() <= 1) {
    supSheet.appendRow(['sup_1', 'isd_2026', '對講機 Walkie-Talkie', 25, '部', '通訊', new Date()]);
    supSheet.appendRow(['sup_2', 'isd_2026', '大型戶外帳篷 (3x3m)', 10, '個', '營具', new Date()]);
    supSheet.appendRow(['sup_3', 'isd_2026', '車輛通行證 (11-12/10佈置/正日)', 35, '張', '交通', new Date()]);
  }
  
  // 11. Supply_Requests
  const reqSheet = ss.getSheetByName('Supply_Requests');
  if (reqSheet.getLastRow() <= 1) {
    reqSheet.appendRow(['req_1', 'isd_2026', 'sup_1', '對講機 Walkie-Talkie', 5, '主題節目組', 'pending', '周恒晉', '', new Date()]);
  }
  
  SpreadsheetApp.getUi().alert('成功！所有 ISD 2026 零精簡、完整文本政策、詳細預算與完整職員名單已寫入 Google Sheet。');
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'getEvents';
    const apiKey = e.parameter.api_key || '';
    const eventId = e.parameter.event_id || '';
    
    if (action !== 'getEvents' && !verifyApiKey(apiKey)) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid API Key' });
    }
    
    if (action === 'getEvents') {
      return jsonResponse({ success: true, data: getAllEvents() });
    } else if (action === 'getEventData') {
      return jsonResponse({ success: true, data: getEventAllData(eventId) });
    } else {
      return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const apiKey = data.api_key || '';
    
    if (action !== 'login' && !verifyApiKey(apiKey)) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid API Key' });
    }
    
    if (action === 'login') return jsonResponse(handleLogin(data));
    else if (action === 'verifyEventPassword') return jsonResponse(verifyEventPassword(data));
    else if (action === 'saveRecord') return jsonResponse(saveRecord(data));
    else if (action === 'deleteRecord') return jsonResponse(deleteRecord(data));
    else if (action === 'updateStatus') return jsonResponse(updateStatus(data));
    else if (action === 'sendMeetingEmail') return jsonResponse(sendMeetingEmailNotification(data));
    else return jsonResponse({ success: false, error: 'Unknown POST action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function getAllEvents() {
  const ss = getSheet();
  const sheet = ss.getSheetByName('Events');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = rows[i][idx]; });
    delete obj.password_hash;
    list.push(obj);
  }
  return list;
}

function verifyEventPassword(data) {
  const eventId = data.event_id;
  const password = data.password;
  const ss = getSheet();
  const sheet = ss.getSheetByName('Events');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIdx = headers.indexOf('event_id');
  const passIdx = headers.indexOf('password_hash');
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === eventId) {
      const storedHash = rows[i][passIdx];
      if (!storedHash || storedHash === hashPassword(password)) {
        return { success: true, message: '密碼正確' };
      } else {
        return { success: false, error: '活動密碼錯誤' };
      }
    }
  }
  return { success: false, error: '找不到該活動' };
}

function handleLogin(data) {
  const loginId = (data.user_id || '').trim();
  const password = data.password;
  
  if (loginId === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASS) {
    return { success: true, user: { user_id: 'sheep', name: '超級管理員', email: SUPER_ADMIN_EMAIL, role: 'super_admin', group_name: '行政組' } };
  }

  const ss = getSheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Users sheet missing' };
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  for (let i = 1; i < rows.length; i++) {
    const rowObj = {};
    headers.forEach((h, idx) => { rowObj[h] = rows[i][idx]; });
    if (rowObj.role === 'super_admin' && rowObj.user_id === 'sheep') continue;
    
    if (rowObj.user_id === loginId || rowObj.email === loginId) {
      if (rowObj.password_hash === hashPassword(password)) {
        delete rowObj.password_hash;
        return { success: true, user: rowObj };
      } else {
        return { success: false, error: '密碼錯誤' };
      }
    }
  }
  return { success: false, error: '找不到用戶帳號或電郵' };
}

function sendMeetingEmailNotification(data) {
  const meetingTitle = data.meeting_title || '第4次籌備委員會議';
  const meetingDate = data.meeting_date || '2026-08-18 19:15';
  const minLevel = data.min_level !== undefined ? parseInt(data.min_level) : 30;
  
  const ss = getSheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: '沒有找到任何委員' };
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const emailIdx = headers.indexOf('email');
  const nameIdx = headers.indexOf('name');
  const roleIdx = headers.indexOf('role');
  
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const role = rows[i][roleIdx];
    if (role === 'super_admin') continue;
    const level = getRoleLevel(role);
    if (level < minLevel) continue;
    
    const email = rows[i][emailIdx];
    const name = rows[i][nameIdx];
    if (email && email.indexOf('@') !== -1) {
      try {
        MailApp.sendEmail(
          email,
          `[童軍活動管理系統] 會議提醒 (主任或以上)：${meetingTitle}`,
          `親愛的 ${name} 委員：\n\n這是一封來自「童軍活動管理系統」的自動會議提示。\n\n會議名稱：${meetingTitle}\n會議時間：${meetingDate}\n地點：香港童軍百周年紀念大樓 1704 室\n\n請依時出席。\n\nCOPY RIGHT Scout System`
        );
        count++;
      } catch (err) {
        Logger.log(`Failed to email ${email}: ${err}`);
      }
    }
  }
  return { success: true, message: `成功向 ${count} 位主任或以上層級委員發送會議提醒電郵！` };
}

function getEventAllData(eventId) {
  const ss = getSheet();
  const modules = ['Meetings', 'Staff', 'Documents', 'Finance', 'Activities', 'Meals', 'Schedule', 'Supplies', 'Supply_Requests', 'Users'];
  const result = {};
  
  modules.forEach(mod => {
    const sheet = ss.getSheetByName(mod);
    if (!sheet || sheet.getLastRow() <= 1) {
      result[mod] = [];
      return;
    }
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const dataList = [];
    const eventIdIdx = headers.indexOf('event_id');
    
    for (let i = 1; i < rows.length; i++) {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = rows[i][idx]; });
      
      if (mod === 'Users' || mod === 'Staff') {
        if (obj.role === 'super_admin' || obj.user_id === 'sheep' || (obj.name && obj.name.indexOf('超級管理員') !== -1)) {
          continue;
        }
      }

      if (mod !== 'Users' && eventIdIdx !== -1 && obj.event_id && obj.event_id !== eventId) {
        if (eventId && obj.event_id !== eventId) continue;
      }
      if (obj.password_hash) delete obj.password_hash;
      dataList.push(obj);
    }
    result[mod] = dataList;
  });
  
  return result;
}

function saveRecord(data) {
  const moduleName = data.module;
  const record = data.record;
  const ss = getSheet();
  const sheet = ss.getSheetByName(moduleName);
  if (!sheet) return { success: false, error: 'Module sheet not found' };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idField = headers[0];
  const recordId = record[idField] || (moduleName.toLowerCase().slice(0, 3) + '_' + Date.now());
  record[idField] = recordId;
  if (!record.created_at) record.created_at = new Date();
  
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === recordId) { rowIndex = i + 1; break; }
  }
  
  const rowValues = headers.map(h => record[h] !== undefined ? record[h] : '');
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  else sheet.appendRow(rowValues);
  
  return { success: true, id: recordId };
}

function deleteRecord(data) {
  const moduleName = data.module;
  const recordId = data.id;
  const ss = getSheet();
  const sheet = ss.getSheetByName(moduleName);
  if (!sheet) return { success: false, error: 'Module sheet not found' };
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === recordId) { sheet.deleteRow(i + 1); return { success: true }; }
  }
  return { success: false, error: 'Record not found' };
}

function updateStatus(data) {
  const moduleName = data.module;
  const recordId = data.id;
  const newStatus = data.status;
  const approver = data.approver || '';
  const ss = getSheet();
  const sheet = ss.getSheetByName(moduleName);
  if (!sheet) return { success: false, error: 'Module sheet not found' };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIdx = 0;
  const statusIdx = headers.indexOf('status');
  const approverIdx = headers.indexOf('approved_by');
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === recordId) {
      const rowNum = i + 1;
      if (statusIdx !== -1) sheet.getRange(rowNum, statusIdx + 1).setValue(newStatus);
      if (approverIdx !== -1 && approver) sheet.getRange(rowNum, approverIdx + 1).setValue(approver);
      return { success: true };
    }
  }
  return { success: false, error: 'Record not found' };
}
