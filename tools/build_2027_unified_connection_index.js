#!/usr/bin/env node
'use strict';
/*
 * Build the 2026→2027 unified connection index (data/2027_unified_connection_index.json).
 *
 * 這份索引把「而家已經存在嘅嘢」一體化連通：
 *   ① ISD 2027 Drive 內 8 個受控來源 domain 檔 + 登記 JSON
 *   ② 07_參考快照 內 14 份「2027 參考快照」（2026 唯讀副本，已上載至 Drive）
 *   ③ 系統主SHEET（25 分頁資料模型）+ 8 個子SHEET範本 + 25 條子SHEET同步路由 + 10 個填寫入口
 *   ④ 覆核表／演練包／執行手冊資產
 *   ⑤ 2026 封存數據集（只記 count／結構／來源檔；不含個人資料）+ 2026 關鍵 Sheet／Drive 資料夾
 *     + repo google_drive/ 27 個 2026 檔案快照 SHA-256
 *
 * 邊界：2026 一律唯讀參考（provenance）。讀 data/isd_2026.json 前必先驗證
 * data/2026_reference_lock.json 的 SHA-256；本工具絕不寫回 2026。
 * 所有 maps_to_source_ids / related_source_ids 都會對 data/2027_canonical_source_registry.json
 * 的 96 個受控 source ID 驗證。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const writeJson = (file, value) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n');
};
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const link = (id) => `https://drive.google.com/file/d/${id}/view`;
const folderLink = (id) => `https://drive.google.com/drive/folders/${id}`;

/* ── 2026 evidence lock（先驗證、後讀取；只取統計數字） ───────────────── */
const lock = readJson('data/2026_reference_lock.json');
if (hashFile(lock.reference_file) !== lock.sha256) throw new Error('2026 evidence lock checksum failed');
const evidence = readJson(lock.reference_file);

/* ── 2027 registries（受控框架；唯一權威） ─────────────────────────────── */
const sourceRegistry = readJson('data/2027_canonical_source_registry.json');
const outputRegistry = readJson('data/2027_output_connection_registry.json');
const driveRegistry = readJson('data/2027_drive_registry.json');
const sheetRegistry = readJson('data/2027_sheet_template_registry.json');
const simulationRegistry = readJson('data/2027_simulation_drive_registry.json');

const sourceIds = new Set(sourceRegistry.sources.map((s) => s.source_id));
const sourceById = new Map(sourceRegistry.sources.map((s) => [s.source_id, s]));
if (sourceIds.size !== 96) throw new Error(`expected 96 canonical sources, found ${sourceIds.size}`);
const assertSources = (ids, label) => {
  ids.forEach((id) => {
    if (!sourceIds.has(id)) throw new Error(`${label} references unknown source id: ${id}`);
  });
};

/* ══ ① 系統主SHEET 資料模型（2026-10-06 由 Drive 匯出覆核：字典=欄位 100% 一致） ══ */
const MASTER_TABS = [
  { tab: '00_閱讀指引', kind: 'guide', owner: '系統', business_key: '', field_keys: [], note: '主SHEET 使用規則；不可同步。' },
  { tab: '01_十個入口', kind: 'entry_routes', owner: '系統', business_key: '', field_keys: [], note: 'IN01–IN10 填寫入口定義。' },
  { tab: '02_資料字典', kind: 'dictionary', owner: '系統', business_key: '', field_keys: [], note: '欄位鍵名合約；欄位鍵名／次序不可改。' },
  { tab: '03_子SHEET映射', kind: 'child_mapping', owner: '系統', business_key: '', field_keys: [], note: '子SHEET 分頁同步路由。' },
  { tab: '04_同步狀態', kind: 'sync_log', owner: '系統', business_key: 'sync_id', field_keys: ['sync_id', 'source_sheet', 'source_tab', 'source_record_id', 'template_version', 'result', 'message', 'synced_at'], note: 'GS 同步結果自動寫入。' },
  { tab: '05_欄位錯誤', kind: 'error_log', owner: '系統', business_key: 'error_id', field_keys: ['error_id', 'source_sheet', 'source_tab', 'source_record_id', 'field_key', 'error_code', 'message', 'detected_at', 'resolved_at'], note: 'GS 拒收紀錄自動寫入；原組別依此修正。' },
  { tab: '10_組織', kind: 'data', owner: '行政／地域', business_key: 'organisation_id', field_keys: ['organisation_id', 'organisation_type', 'organisation_name', 'unit_number', 'area_code', 'primary_contact_person_id', 'status', 'source_record_id', 'updated_at'] },
  { tab: '11_人員', kind: 'data', owner: '秘書／行政', business_key: 'person_id', field_keys: ['person_id', 'display_name', 'english_name', 'person_type', 'organisation_id', 'role_title', 'phone', 'email', 'privacy_consent', 'status', 'source_record_id', 'updated_at'] },
  { tab: '12_邀請', kind: 'data', owner: '秘書', business_key: 'invitation_id', field_keys: ['invitation_id', 'entry_route_id', 'recipient_person_id', 'recipient_organisation_id', 'invitation_status', 'sent_at', 'response_due_at', 'secure_link_ref', 'source_record_id', 'updated_at'] },
  { tab: '13_報名', kind: 'data', owner: '秘書／行政', business_key: 'registration_id', field_keys: ['registration_id', 'entry_route_id', 'organisation_id', 'primary_person_id', 'response_status', 'submitted_at', 'admin_status', 'source_record_id', 'updated_at'] },
  { tab: '14_出席', kind: 'data', owner: '秘書／各相關組', business_key: 'attendance_id', field_keys: ['attendance_id', 'registration_id', 'person_id', 'organisation_id', 'activity_code', 'attendance_role', 'youth_count', 'adult_count', 'companion_count', 'arrival_window', 'departure_window', 'status', 'updated_at'] },
  { tab: '15_工作人員', kind: 'data', owner: '行政／各組', business_key: 'staff_id', field_keys: ['staff_id', 'person_id', 'home_group_code', 'employment_type', 'availability', 'meal_required', 'dietary_need', 'badge_status', 'source_record_id', 'updated_at'] },
  { tab: '16_當值安排', kind: 'data', owner: '各組', business_key: 'assignment_id', field_keys: ['assignment_id', 'staff_id', 'department_code', 'role_code', 'booth_id', 'location_code', 'shift_start', 'shift_end', 'assignment_status', 'updated_at'] },
  { tab: '17_攤位', kind: 'data', owner: '主題節目組', business_key: 'booth_id', field_keys: ['booth_id', 'zone_code', 'booth_number', 'theme', 'booth_name', 'owner_organisation_id', 'lead_person_id', 'status', 'updated_at'] },
  { tab: '18_攤位人手', kind: 'data', owner: '主題節目組／各組', business_key: 'booth_staffing_id', field_keys: ['booth_staffing_id', 'booth_id', 'staff_id', 'person_id', 'role_code', 'shift_start', 'shift_end', 'meal_required', 'status', 'updated_at'] },
  { tab: '19_膳食', kind: 'data', owner: '後勤／膳食', business_key: 'meal_id', field_keys: ['meal_id', 'person_id', 'organisation_id', 'registration_id', 'meal_type', 'meal_qty', 'dietary_need', 'distribution_location', 'ticket_status', 'updated_at'] },
  { tab: '20_交通泊車', kind: 'data', owner: '協調／場地', business_key: 'transport_id', field_keys: ['transport_id', 'registration_id', 'organisation_id', 'transport_mode', 'vehicle_type', 'vehicle_plate', 'vehicle_qty', 'coach_qty', 'parking_status', 'arrival_window', 'updated_at'] },
  { tab: '21_典禮', kind: 'data', owner: '會操及典禮', business_key: 'ceremony_id', field_keys: ['ceremony_id', 'person_id', 'organisation_id', 'ceremony_item_code', 'award_code', 'stage_order', 'seat_code', 'rehearsal_required', 'attendance_status', 'updated_at'] },
  { tab: '22_報到', kind: 'data', owner: '行政／接待', business_key: 'checkin_id', field_keys: ['checkin_id', 'person_id', 'organisation_id', 'registration_id', 'checkin_location', 'checkin_status', 'checked_in_at', 'badge_issued', 'meal_issued', 'updated_at'] },
  { tab: '23_物資', kind: 'data', owner: '後勤／各組', business_key: 'supply_request_id', field_keys: ['supply_request_id', 'department_code', 'booth_id', 'item_code', 'item_name', 'requested_qty', 'approved_qty', 'issued_qty', 'delivery_location', 'status', 'updated_at'] },
  { tab: '24_修正紀錄', kind: 'correction_log', owner: '秘書／行政', business_key: 'change_id', field_keys: ['change_id', 'entity_type', 'entity_id', 'field_key', 'old_value', 'new_value', 'change_reason', 'changed_by', 'changed_at', 'source_channel'], note: '中央更正專用；upsertMasterRows 帶 change_reason 時逐欄寫入。' },
  { tab: '25_基本資訊', kind: 'data', owner: '秘書處／行政組', business_key: 'info_id', field_keys: ['info_id', 'audience_scope', 'info_title', 'info_content', 'visibility', 'status', 'source_record_id', 'updated_at'] },
  { tab: '26_日程及地圖', kind: 'data', owner: '協調組／會操及典禮組', business_key: 'schedule_map_id', field_keys: ['schedule_map_id', 'record_type', 'audience_scope', 'title', 'start_at', 'end_at', 'location_code', 'map_asset_id', 'content', 'status', 'source_record_id', 'updated_at'] },
  { tab: '27_公告及求助', kind: 'data', owner: '秘書處／協調組／服務及發展組', business_key: 'notice_support_id', field_keys: ['notice_support_id', 'record_type', 'audience_scope', 'title', 'content', 'contact_role', 'contact_method', 'urgency', 'status', 'source_record_id', 'updated_at'] },
  { tab: '90_代碼表', kind: 'data', owner: '行政／系統', business_key: 'code_set+code', field_keys: ['code_set', 'code', 'label_zh', 'label_en', 'active', 'sort_order', 'updated_at'] }
];

/* 主SHEET 分頁 ↔ 2027 受控來源（導航性對應；權威對應仍係 output connection registry） */
const MASTER_TAB_SOURCES = {
  '10_組織': ['DATA-ORGANISATION', 'DATA-GROUP-APPLICATION'],
  '11_人員': ['DATA-ORGANISATION', 'DATA-COMMISSION'],
  '12_邀請': ['DOC-GUEST-INVITATION', 'DOC-OC-INVITATION', 'DATA-GUEST'],
  '13_報名': ['DATA-GROUP-APPLICATION', 'IN01', 'IN04'],
  '14_出席': ['DATA-UG-ATTENDANCE', 'DATA-PARTICIPANT'],
  '15_工作人員': ['DATA-JOB-DUTY', 'SCHEDULE-STAFF'],
  '16_當值安排': ['SCHEDULE-STAFF', 'DATA-JOB-DUTY'],
  '17_攤位': ['DATA-BOOTH'],
  '18_攤位人手': ['DATA-BOOTH', 'DATA-THEME-PROGRAMME'],
  '19_膳食': ['DATA-MEAL-ORDER', 'DATA-MENU', 'DATA-STAFF-MEAL', 'DATA-MEAL-DISTRIBUTION'],
  '20_交通泊車': ['DATA-VEHICLE', 'DATA-PARKING', 'IN-PARKING'],
  '21_典禮': ['DATA-CEREMONY-PROGRAMME', 'DATA-AWARD-MERIT', 'DATA-AWARD-SECTION', 'DATA-AWARD-LEADER', 'DATA-INSPECTION-ROUTE'],
  '22_報到': ['DATA-PARTICIPANT', 'DATA-GUEST', 'DATA-CROSSCHECK'],
  '23_物資': ['DATA-SUPPLY', 'DATA-BORROW'],
  '24_修正紀錄': [],
  '25_基本資訊': ['DATA-EVENT-BRIEF', 'DATA-PUBLIC-CONTENT'],
  '26_日程及地圖': ['SCHEDULE-ALL', 'SCHEDULE-TROOP', 'MAP-BASE', 'MAP-TROOP', 'MAP-VENUE-DETAIL'],
  '27_公告及求助': ['DATA-PUBLIC-CONTENT', 'NOTICE-WEATHER', 'DATA-CRISIS-CONTACT'],
  '90_代碼表': ['REGISTRY-LINKS']
};
Object.entries(MASTER_TAB_SOURCES).forEach(([tab, ids]) => assertSources(ids, `master tab ${tab}`));

/* ══ ② 07_參考快照：14 份「2027 參考快照」（Drive ID 已於 2026-10-06 逐一核實存在） ══ */
const REFERENCE_SNAPSHOTS = [
  { asset_id: 'SNAP-MC-MERIT', name: '2027 參考快照－優異旅團頒獎司儀稿.pdf', kind: 'pdf', drive_file_id: '1a0xl2cBrjmguMbuuBVZAjzlKZZSxzzCU', maps_to_source_ids: ['SCRIPT-MERIT'], origin_2026: '2026 司儀稿：1_司儀稿_優異旅團頒獎儀式 2026 (V5 2026-10-04).pdf' },
  { asset_id: 'SNAP-MC-PARADE', name: '2027 參考快照－會操檢閱司儀稿.pdf', kind: 'pdf', drive_file_id: '14CNb40X0eXTI5qJkimr54xAFA4BL2MXe', maps_to_source_ids: ['SCRIPT-PARADE'], origin_2026: '2026 司儀稿：2. 司儀稿_會操檢閱典禮2026 (V4 2026-10-04).pdf' },
  { asset_id: 'SNAP-MC-LUNCH', name: '2027 參考快照－嘉賓午膳司儀稿.pdf', kind: 'pdf', drive_file_id: '1PS50F4uvBMIX1kQiVP3svu62Uo9iUSV-', maps_to_source_ids: ['SCRIPT-LUNCH'], origin_2026: '2026 司儀稿：3_司儀稿_莫榮大樓自助餐 2026 (V2 2026-10-04).pdf' },
  { asset_id: 'SNAP-CIRCULAR', name: '2027 參考快照－活動特別通告.pdf', kind: 'pdf', drive_file_id: '1HA46I0rJCrnYRiUa9etqUVv0hdZpW2WX', maps_to_source_ids: ['DOC-MAIN-CIRCULAR', 'DOC-SPECIAL-CIRCULAR'], origin_2026: '2026 通告：sp12_26_isd2026.pdf（特別通告第12/26號）' },
  { asset_id: 'SNAP-DONATE-FOOD', name: '2027 參考快照－童心捐贈（食品捐贈）.doc', kind: 'doc', drive_file_id: '1_Km-OXf1mPg8vDopi8fDKZ6po7mkB1DJ', maps_to_source_ids: ['DOC-FOOD-DONATION'], origin_2026: '2026 通告：_FoodDonation.doc（童心捐贈大行動・食品捐贈）' },
  { asset_id: 'SNAP-DONATE-GOODS', name: '2027 參考快照－童心捐贈（物品回收）.doc', kind: 'doc', drive_file_id: '10R3X8eau7PO5wDc5hvQC3Y5uu23PnVAk', maps_to_source_ids: ['DOC-GOODS-DONATION'], origin_2026: '2026 通告：_Goods Donating.doc（童心捐贈大行動・物品回收）' },
  { asset_id: 'SNAP-UG-ATTEND', name: '2027 參考快照－其他制服團體出席清單.pdf', kind: 'pdf', drive_file_id: '1fAVXD5CwWf4wgMfJEqRcbRwL8Qc8sQAv', maps_to_source_ids: ['DATA-UG-ATTENDANCE'], origin_2026: '2026：出席UG及派隊清單_2026_as at 20260929.pdf' },
  { asset_id: 'SNAP-AWARD-MERIT', name: '2027 參考快照－優異旅團及獎項名單.docx', kind: 'docx', drive_file_id: '1JBz0Ph8ukHPmMlnjU4spatT5YzX025sR', maps_to_source_ids: ['DATA-AWARD-MERIT', 'DATA-AWARD-SECTION', 'DATA-AWARD-LEADER'], origin_2026: '2026 優異旅團獲獎名單（188 團次；ceremony.meritRoster）' },
  { asset_id: 'SNAP-GUEST-LIST', name: '2027 參考快照－嘉賓名單.csv', kind: 'csv', drive_file_id: '1Uhg6zQS-_V_eI_MBpnIY-O3EUcCNxiCu', maps_to_source_ids: ['DATA-GUEST'], origin_2026: '2026：港島童軍繽紛日2026 - 嘉賓名單 as at 02.10.2026.csv（102 位）' },
  { asset_id: 'SNAP-TROOP-REG', name: '2027 參考快照－旅團報名資料.xls', kind: 'xls', drive_file_id: '1cphnjNvWmSEhsgqoYftGIOqFER8I4xwB', maps_to_source_ids: ['DATA-GROUP-APPLICATION', 'DATA-PARTICIPANT'], origin_2026: '2026：旅團報名人數_2026 as 26.9.2026.xls（31 旅）' },
  { asset_id: 'SNAP-CEREMONY-SCHED', name: '2027 參考快照－第一部分典禮日程.docx', kind: 'docx', drive_file_id: '1GFAxiV5v5-KinBwElL3QEafRqnp3cjQ1', maps_to_source_ids: ['SCHEDULE-ALL', 'DATA-CEREMONY-PROGRAMME'], origin_2026: '2026：Rundown_All 2026 連獎項 Part 1 V5.docx（13 行）' },
  { asset_id: 'SNAP-CRISIS', name: '2027 參考快照－危機處理手冊.pdf', kind: 'pdf', drive_file_id: '1Yi0S4qNT12X0hOaBHOi8wM4Hz6QCWrcI', maps_to_source_ids: ['DOC-CRISIS-MANUAL', 'DATA-CRISIS-CONTACT'], origin_2026: '2026：ISD2026-RiskMangementManual_V1(Clean).pdf' },
  { asset_id: 'SNAP-ORG-CONTACTS', name: '2027 參考快照－組織架構及聯絡表.xlsx', kind: 'xlsx', drive_file_id: '1uM_dN9Bl7psrSGJJ1XU8T-SX17jJN7Cc', maps_to_source_ids: ['DATA-ORGANISATION'], origin_2026: '2026：ISD2026 Org Chart and Contact List（持續更新）.xlsx（54 崗位／80 聯絡）' },
  { asset_id: 'SNAP-SITE-MAP', name: '2027 參考快照－場地佈置圖.pdf', kind: 'pdf', drive_file_id: '1Qqi7OMu7viUPkwdOQiRZ2rSFm73swfTc', maps_to_source_ids: ['MAP-SITE-SETUP', 'MAP-BASE'], origin_2026: '2026：ISD2026 Site Setup Plan R10-SETUP PLAN-1.pdf' },
  { asset_id: 'SNAP-STAFF-ROSTER', name: '2027 參考快照－工作人員編更.xlsx', kind: 'xlsx', drive_file_id: '17eh4_ptcyKzyS6ze04Kh5c2vySqCI-99', maps_to_source_ids: ['SCHEDULE-STAFF', 'DATA-JOB-DUTY'], origin_2026: '2026：ISD2026 staff list ver2 (FROZEN).xlsx（活動日編更 279 人次）' },
  { asset_id: 'SNAP-BOOTH', name: '2027 參考快照－攤位資料.xlsx', kind: 'xlsx', drive_file_id: '1jFQxYgZSv11PIEromK_DviGixcMoCL3W', maps_to_source_ids: ['DATA-BOOTH'], origin_2026: '2026：ISD2026 攤位資料.xlsx（33 攤位 A–F 區）' }
];
REFERENCE_SNAPSHOTS.forEach((s) => assertSources(s.maps_to_source_ids, `snapshot ${s.asset_id}`));

/* ══ ③ 子SHEET 同步路由（fixed_fields = 主SHEET 03_子SHEET映射 原文；master_tabs/match_fields 為本輪連通覆核結果） ══
   state: route_ready = 欄位可直接按鍵名對上；pending_field_mapping = 欄位未對齊，GS 會拒收並回報，待 2027 owner 確認。 */
const CHILD_ROUTES = [
  { route_id: 'CS01-01', template_code: 'CS01', child_sheet_name: '01_參加單位及旅團', tab: '01_單位', fixed_fields: ['source_record_id', 'organisation_id', 'organisation_type', 'organisation_name', 'unit_number', 'area_code', 'contact_name', 'phone', 'email', 'template_version', 'updated_at'], master_tabs: ['10_組織'], match_fields: { '10_組織': ['source_record_id', 'organisation_id'] }, state: 'route_ready', note: 'contact_name／phone／email 為子表專欄，主SHEET 10_組織 無此鍵，同步時跳過並記錄。' },
  { route_id: 'CS01-02', template_code: 'CS01', child_sheet_name: '01_參加單位及旅團', tab: '02_出席', fixed_fields: ['source_record_id', 'registration_id', 'organisation_id', 'activity_code', 'youth_count', 'adult_count', 'companion_count', 'arrival_window', 'departure_window', 'status', 'template_version', 'updated_at'], master_tabs: ['14_出席'], match_fields: { '14_出席': ['registration_id', 'organisation_id', 'activity_code'] }, state: 'route_ready', note: '' },
  { route_id: 'CS01-03', template_code: 'CS01', child_sheet_name: '01_參加單位及旅團', tab: '03_膳食', fixed_fields: ['source_record_id', 'registration_id', 'organisation_id', 'meal_type', 'meal_qty', 'dietary_need', 'template_version', 'updated_at'], master_tabs: ['19_膳食'], match_fields: { '19_膳食': ['registration_id', 'organisation_id', 'meal_type'] }, state: 'route_ready', note: '' },
  { route_id: 'CS01-04', template_code: 'CS01', child_sheet_name: '01_參加單位及旅團', tab: '04_交通', fixed_fields: ['source_record_id', 'registration_id', 'organisation_id', 'transport_mode', 'vehicle_type', 'vehicle_plate', 'coach_qty', 'arrival_window', 'template_version', 'updated_at'], master_tabs: ['20_交通泊車'], match_fields: { '20_交通泊車': ['registration_id', 'organisation_id'] }, state: 'route_ready', note: '' },
  { route_id: 'CS02-01', template_code: 'CS02', child_sheet_name: '02_嘉賓獎勵及典禮對象', tab: '01_受邀對象', fixed_fields: ['source_record_id', 'person_id', 'invitation_id', 'entry_route_id', 'display_name', 'role_title', 'organisation_name', 'phone', 'email', 'invitation_status', 'template_version', 'updated_at'], master_tabs: ['11_人員', '12_邀請'], match_fields: { '11_人員': ['source_record_id'], '12_邀請': ['source_record_id', 'invitation_id'] }, state: 'route_ready', note: '同一行分寫 11_人員（person_id/display_name/phone/email）及 12_邀請（invitation_id/entry_route_id/invitation_status）。' },
  { route_id: 'CS02-02', template_code: 'CS02', child_sheet_name: '02_嘉賓獎勵及典禮對象', tab: '02_回覆出席', fixed_fields: ['source_record_id', 'registration_id', 'person_id', 'attendance_status', 'companion_count', 'meal_qty', 'dietary_need', 'transport_mode', 'vehicle_plate', 'template_version', 'updated_at'], master_tabs: [], match_fields: {}, state: 'pending_field_mapping', note: '建議目標 13_報名＋14_出席，但 attendance_status／companion_count／meal_qty 等鍵名與主SHEET（response_status／status）不一致；待秘書處確認鍵名對應後接通。' },
  { route_id: 'CS02-03', template_code: 'CS02', child_sheet_name: '02_嘉賓獎勵及典禮對象', tab: '03_典禮安排', fixed_fields: ['source_record_id', 'person_id', 'ceremony_item_code', 'award_code', 'stage_order', 'seat_code', 'rehearsal_required', 'template_version', 'updated_at'], master_tabs: ['21_典禮'], match_fields: { '21_典禮': ['person_id', 'ceremony_item_code'] }, state: 'route_ready', note: '' },
  { route_id: 'CS03-01', template_code: 'CS03', child_sheet_name: '03_工作人員及攤位人手', tab: '01_工作人員', fixed_fields: ['source_record_id', 'staff_id', 'person_id', 'display_name', 'phone', 'email', 'home_group_code', 'employment_type', 'availability', 'meal_required', 'dietary_need', 'template_version', 'updated_at'], master_tabs: ['15_工作人員'], match_fields: { '15_工作人員': ['source_record_id'] }, state: 'route_ready', note: 'display_name／phone／email 屬 11_人員；如需一併更新請另行以 upsertMasterRows 寫 11_人員。' },
  { route_id: 'CS03-02', template_code: 'CS03', child_sheet_name: '03_工作人員及攤位人手', tab: '02_當值安排', fixed_fields: ['source_record_id', 'assignment_id', 'staff_id', 'department_code', 'role_code', 'location_code', 'shift_start', 'shift_end', 'assignment_status', 'template_version', 'updated_at'], master_tabs: ['16_當值安排'], match_fields: { '16_當值安排': ['assignment_id'] }, state: 'route_ready', note: '' },
  { route_id: 'CS03-03', template_code: 'CS03', child_sheet_name: '03_工作人員及攤位人手', tab: '03_攤位人手', fixed_fields: ['source_record_id', 'booth_staffing_id', 'booth_id', 'staff_id', 'person_id', 'role_code', 'shift_start', 'shift_end', 'meal_required', 'template_version', 'updated_at'], master_tabs: ['18_攤位人手'], match_fields: { '18_攤位人手': ['booth_staffing_id'] }, state: 'route_ready', note: '' },
  { route_id: 'CS04-01', template_code: 'CS04', child_sheet_name: '04_攤位及主題活動', tab: '01_攤位', fixed_fields: ['source_record_id', 'booth_id', 'zone_code', 'booth_number', 'theme', 'booth_name', 'owner_organisation_id', 'lead_person_id', 'status', 'template_version', 'updated_at'], master_tabs: ['17_攤位'], match_fields: { '17_攤位': ['booth_id'] }, state: 'route_ready', note: '' },
  { route_id: 'CS04-02', template_code: 'CS04', child_sheet_name: '04_攤位及主題活動', tab: '02_活動安排', fixed_fields: ['source_record_id', 'activity_code', 'booth_id', 'activity_name', 'start_at', 'end_at', 'location_code', 'capacity_note', 'status', 'template_version', 'updated_at'], master_tabs: [], match_fields: {}, state: 'pending_field_mapping', note: 'activity_code／activity_name 與 26_日程及地圖（schedule_map_id／record_type／title）鍵名不一致；待主題節目組確認對應。' },
  { route_id: 'CS04-03', template_code: 'CS04', child_sheet_name: '04_攤位及主題活動', tab: '03_物資需求', fixed_fields: ['source_record_id', 'supply_request_id', 'booth_id', 'item_code', 'item_name', 'requested_qty', 'delivery_location', 'status', 'template_version', 'updated_at'], master_tabs: ['23_物資'], match_fields: { '23_物資': ['supply_request_id'] }, state: 'route_ready', note: '' },
  { route_id: 'CS05-01', template_code: 'CS05', child_sheet_name: '05_典禮及會操', tab: '01_典禮項目', fixed_fields: ['source_record_id', 'ceremony_item_code', 'ceremony_item_name', 'start_at', 'end_at', 'location_code', 'lead_person_id', 'status', 'template_version', 'updated_at'], master_tabs: [], match_fields: {}, state: 'pending_field_mapping', note: '典禮項目表與 26_日程及地圖 鍵名不一致（ceremony_item_name≠title）；待會操及典禮組確認。' },
  { route_id: 'CS05-02', template_code: 'CS05', child_sheet_name: '05_典禮及會操', tab: '02_唱名及上台', fixed_fields: ['source_record_id', 'ceremony_id', 'person_id', 'organisation_id', 'award_code', 'stage_order', 'attendance_status', 'template_version', 'updated_at'], master_tabs: ['21_典禮'], match_fields: { '21_典禮': ['ceremony_id', 'person_id'] }, state: 'route_ready', note: '' },
  { route_id: 'CS05-03', template_code: 'CS05', child_sheet_name: '05_典禮及會操', tab: '03_座位及步操', fixed_fields: ['source_record_id', 'person_id', 'organisation_id', 'seat_code', 'formation_code', 'rehearsal_required', 'status', 'template_version', 'updated_at'], master_tabs: ['21_典禮'], match_fields: { '21_典禮': ['person_id', 'seat_code'] }, state: 'route_ready', note: 'formation_code 主SHEET 21_典禮 無此鍵，同步時跳過並記錄。' },
  { route_id: 'CS06-01', template_code: 'CS06', child_sheet_name: '06_場地交通及泊車', tab: '01_場地', fixed_fields: ['source_record_id', 'location_code', 'location_name', 'zone_code', 'capacity_note', 'owner_department_code', 'status', 'template_version', 'updated_at'], master_tabs: [], match_fields: {}, state: 'pending_field_mapping', note: '場地代碼建議入 90_代碼表（code_set=location），屬語義轉換；待行政／系統確認，GS 不會自動改寫。' },
  { route_id: 'CS06-02', template_code: 'CS06', child_sheet_name: '06_場地交通及泊車', tab: '02_車輛泊車', fixed_fields: ['source_record_id', 'transport_id', 'registration_id', 'organisation_id', 'vehicle_type', 'vehicle_plate', 'vehicle_qty', 'parking_status', 'arrival_window', 'template_version', 'updated_at'], master_tabs: ['20_交通泊車'], match_fields: { '20_交通泊車': ['transport_id'] }, state: 'route_ready', note: '' },
  { route_id: 'CS06-03', template_code: 'CS06', child_sheet_name: '06_場地交通及泊車', tab: '03_旅遊巴', fixed_fields: ['source_record_id', 'transport_id', 'organisation_id', 'coach_qty', 'dropoff_location', 'arrival_window', 'departure_window', 'status', 'template_version', 'updated_at'], master_tabs: ['20_交通泊車'], match_fields: { '20_交通泊車': ['transport_id'] }, state: 'route_ready', note: 'dropoff_location／departure_window／status 主SHEET 20_交通泊車 無此鍵，同步時跳過並記錄。' },
  { route_id: 'CS07-01', template_code: 'CS07', child_sheet_name: '07_膳食物資及後勤', tab: '01_膳食', fixed_fields: ['source_record_id', 'meal_id', 'person_id', 'organisation_id', 'registration_id', 'meal_type', 'meal_qty', 'dietary_need', 'distribution_location', 'template_version', 'updated_at'], master_tabs: ['19_膳食'], match_fields: { '19_膳食': ['meal_id'] }, state: 'route_ready', note: '' },
  { route_id: 'CS07-02', template_code: 'CS07', child_sheet_name: '07_膳食物資及後勤', tab: '02_物資', fixed_fields: ['source_record_id', 'supply_request_id', 'department_code', 'booth_id', 'item_code', 'item_name', 'requested_qty', 'approved_qty', 'delivery_location', 'status', 'template_version', 'updated_at'], master_tabs: ['23_物資'], match_fields: { '23_物資': ['supply_request_id'] }, state: 'route_ready', note: '' },
  { route_id: 'CS07-03', template_code: 'CS07', child_sheet_name: '07_膳食物資及後勤', tab: '03_派發', fixed_fields: ['source_record_id', 'distribution_id', 'entity_type', 'entity_id', 'item_code', 'issued_qty', 'issued_at', 'issued_by', 'status', 'template_version', 'updated_at'], master_tabs: [], match_fields: {}, state: 'pending_field_mapping', note: '主SHEET 暫無派發分頁（23_物資 只有 issued_qty 欄位）；待後勤組確認歸屬。' },
  { route_id: 'CS08-01', template_code: 'CS08', child_sheet_name: '08_安全醫療及服務', tab: '01_服務人員', fixed_fields: ['source_record_id', 'staff_id', 'person_id', 'service_type', 'qualification', 'location_code', 'shift_start', 'shift_end', 'status', 'template_version', 'updated_at'], master_tabs: [], match_fields: {}, state: 'pending_field_mapping', note: 'service_type／qualification 主SHEET 15_工作人員／16_當值安排 均無此鍵；待行政確認。' },
  { route_id: 'CS08-02', template_code: 'CS08', child_sheet_name: '08_安全醫療及服務', tab: '02_安全安排', fixed_fields: ['source_record_id', 'safety_record_id', 'location_code', 'risk_code', 'control_measure', 'owner_department_code', 'status', 'template_version', 'updated_at'], master_tabs: [], match_fields: {}, state: 'pending_field_mapping', note: '主SHEET 暫無安全安排分頁；危機處理屬受控來源 DOC-CRISIS-MANUAL／DATA-CRISIS-CONTACT。' },
  { route_id: 'CS08-03', template_code: 'CS08', child_sheet_name: '08_安全醫療及服務', tab: '03_緊急資源', fixed_fields: ['source_record_id', 'resource_id', 'resource_type', 'location_code', 'contact_role', 'availability', 'status', 'template_version', 'updated_at'], master_tabs: [], match_fields: {}, state: 'pending_field_mapping', note: '主SHEET 暫無緊急資源分頁；待行政／系統確認（可考慮 90_代碼表 resource_type）。' }
];

/* ══ ④ 十個填寫入口（主SHEET 01_十個入口 原文） ══ */
const ENTRY_ROUTES = [
  { route_id: 'IN01', name: '一般參加旅團／單位', link_location: '地域通知書內連結', creates_updates: ['組織', '報名', '出席', '膳食', '交通'], feeds: ['報到／膳食／交通／場地'] },
  { route_id: 'IN02', name: '優異旅團／典禮旅團', link_location: '地域通知書內連結', creates_updates: ['組織', '報名', '出席', '典禮', '膳食'], feeds: ['典禮／報到／膳食／場地'] },
  { route_id: 'IN03', name: '步操／表演隊伍', link_location: '地域通知書內連結', creates_updates: ['組織', '出席', '典禮', '交通'], feeds: ['典禮／場地／交通／報到'] },
  { route_id: 'IN04', name: '受邀嘉賓', link_location: '邀請信內專屬連結', creates_updates: ['人員', '邀請', '報名', '出席', '膳食', '交通'], feeds: ['嘉賓接待／典禮／膳食／交通'] },
  { route_id: 'IN05', name: '支部最高獎勵得主', link_location: '邀請信內專屬連結', creates_updates: ['人員', '邀請', '典禮', '出席', '膳食'], feeds: ['典禮／嘉賓接待／報到'] },
  { route_id: 'IN06', name: '成人獎勵得主', link_location: '邀請信內專屬連結', creates_updates: ['人員', '邀請', '典禮', '出席', '膳食'], feeds: ['典禮／嘉賓接待／報到'] },
  { route_id: 'IN07', name: '其他制服團體／受邀隊伍', link_location: '地域通知書內連結', creates_updates: ['組織', '報名', '出席', '膳食', '交通'], feeds: ['報到／膳食／交通／場地'] },
  { route_id: 'IN08', name: 'NGO／合作／攤位夥伴', link_location: '合作邀請信內連結', creates_updates: ['組織', '人員', '攤位', '出席', '物資'], feeds: ['攤位／物資／場地／工作人員'] },
  { route_id: 'IN09', name: '一般工作人員／義工', link_location: '組別招募信內連結', creates_updates: ['人員', '工作人員', '當值', '膳食'], feeds: ['各組主管／膳食／派章／點名'] },
  { route_id: 'IN10', name: '攤位工作人員及人手', link_location: '攤位組指派連結', creates_updates: ['人員', '工作人員', '攤位人手', '物資', '膳食'], feeds: ['攤位／物資／膳食／點名'] }
];

/* ══ ⑤ 2026 關鍵 Sheet／Drive（唯讀參考；來源 docs/DRIVE_INVENTORY.md 及 docs/EXCEL_TO_SHEET_LIST.md） ══ */
const ASSETS_2026 = [
  { asset_id: 'D2026-STAFF-DRIVE', name: 'ISD 2026 Staff Drive（根資料夾）', kind: 'folder', drive_file_id: '1fqFMBRpMaujqoUSOMR0gzRprTeG-O8jF', maps_to_source_ids: [], note: '2026 全部工作檔案；唯讀證據。' },
  { asset_id: 'D2026-EVIDENCE', name: 'ISD 2026 證據庫（含 V8 座位表、03.10 嘉賓名單）', kind: 'folder', drive_file_id: '1hyzzIuRGxEh9iya4YvcIsKyfCAZ3sVlG', maps_to_source_ids: [], note: '2026-10-05 建立嘅活動日最後版本證據。' },
  { asset_id: 'S2026-BUDGET', name: 'ISD2026 Budget（已轉 Google Sheet）', kind: 'gsheet', drive_file_id: '1S1mNNjhcBY_IsMOYtI8sZLoKUht5yTdD7ICZUfJiBGE', maps_to_source_ids: ['DATA-FINANCE-BUDGET'], note: '2026 財務卡片自動讀取；原 xlsx=1tFl8f_E--bwDo6Jl3PcCgMRs06-hg3c_。' },
  { asset_id: 'S2026-ORG-CHART', name: 'ISD2026 組織架構及聯絡（已轉 Google Sheet）', kind: 'gsheet', drive_file_id: '1BaClx2C_4ozzOy0hkO0M-jTjWhBQTuo4MXfq6GgTKZo', maps_to_source_ids: ['DATA-ORGANISATION'], note: '2026 工作人員名單來源；原 xlsx=1__vfReg_Hal8qXBDXaidDVvN_lRgRKcp。' },
  { asset_id: 'S2026-PARKING', name: '港島童軍繽紛日2026－泊車證（已轉 Google Sheet）', kind: 'gsheet', drive_file_id: '1jmz2lLDJo9fB5qsdcPMrbeHqN0rGBQwoyhY5mavvzy4', maps_to_source_ids: ['DATA-PARKING'], note: '2026 泊車證卡片讀取；原 xlsx=1_O_7VZAeASGPEk5BqSD0VxTEPPLH5_h7。' },
  { asset_id: 'S2026-BOOTH-REF', name: 'ISD2025 攤位資料（參考 Sheet）', kind: 'gsheet', drive_file_id: '1Z6e8X51Zl952fZTjvuwsDImLNC656ftYROezHcZMlXY', maps_to_source_ids: ['ARCHIVE-REFERENCE-BOOTH-2025'], note: '用戶指示 2026 攤位卡片採用嘅參考來源。' },
  { asset_id: 'X2026-BOOTH', name: 'ISD2026 攤位資料.xlsx', kind: 'xlsx', drive_file_id: '1Po1UGjl1E3Q6HWlYlFqnE_tcXjblmFle', maps_to_source_ids: ['DATA-BOOTH'], note: '2026 攤位資料原檔（未轉 Sheet）。' }
];
ASSETS_2026.forEach((a) => assertSources(a.maps_to_source_ids, `2026 asset ${a.asset_id}`));

/* 2026 Drive 群組資料夾（isd_2026.json drive.groups 原文） */
const drive2026Groups = Object.entries(evidence.drive.groups || {}).map(([name, id]) => ({
  asset_id: `D2026-G-${name}`, name: `ISD 2026 Drive／${name}`, kind: 'folder', drive_file_id: id, maps_to_source_ids: [], note: ''
}));

/* ══ 2026 數據集清單（只記統計；個人資料一律不入索引） ══ */
const listLen = (v) => (Array.isArray(v) ? v.length : null);
const datasetDefs = [
  { key: 'users', label: '籌委帳戶（54 人預先開戶）', get: (d) => listLen(d.users), related_master_tabs: ['11_人員'], related_source_ids: ['DATA-ORGANISATION'] },
  { key: 'staff.org_chart', label: '組織架構崗位（封存原始行數；正規化後 54 人）', get: (d) => listLen(d.staff && d.staff.org_chart), related_master_tabs: ['10_組織', '11_人員'], related_source_ids: ['DATA-ORGANISATION'] },
  { key: 'staff.contacts', label: '聯絡表（封存原始行數）', get: (d) => listLen(d.staff && d.staff.contacts), related_master_tabs: ['11_人員'], related_source_ids: ['DATA-ORGANISATION'] },
  { key: 'staff.event_staff_roster', label: '活動日工作人員編更（人次）', get: (d) => listLen(d.staff && d.staff.event_staff_roster), related_master_tabs: ['15_工作人員', '16_當值安排'], related_source_ids: ['SCHEDULE-STAFF', 'DATA-JOB-DUTY'] },
  { key: 'participants', label: '參加旅團', get: (d) => listLen(d.participants), related_master_tabs: ['10_組織', '13_報名', '14_出席'], related_source_ids: ['DATA-PARTICIPANT', 'DATA-GROUP-APPLICATION'] },
  { key: 'guest_roster.guests', label: '嘉賓名單', get: (d) => listLen(d.guest_roster && d.guest_roster.guests), related_master_tabs: ['11_人員', '12_邀請', '21_典禮', '22_報到'], related_source_ids: ['DATA-GUEST'] },
  { key: 'guest_transport', label: '嘉賓車安排（乘大會車嘉賓）', get: (d) => listLen(d.guest_transport && d.guest_transport.guests), related_master_tabs: ['20_交通泊車'], related_source_ids: ['DATA-VEHICLE'] },
  { key: 'activities.booths', label: '攤位', get: (d) => listLen(d.activities && d.activities.booths), related_master_tabs: ['17_攤位', '18_攤位人手'], related_source_ids: ['DATA-BOOTH'] },
  { key: 'activities.activities', label: '主題活動', get: (d) => listLen(d.activities && d.activities.activities), related_master_tabs: ['17_攤位'], related_source_ids: ['DATA-THEME-PROGRAMME'] },
  { key: 'activities.gameCards', label: '遊戲卡', get: (d) => listLen(d.activities && d.activities.gameCards), related_master_tabs: [], related_source_ids: ['ASSET-GAME-CARD'] },
  { key: 'meals', label: '膳食訂餐紀錄', get: (d) => listLen(d.meals), related_master_tabs: ['19_膳食'], related_source_ids: ['DATA-MEAL-ORDER'] },
  { key: 'staff_meals_2026', label: '工作人員餐單統計', get: (d) => listLen(d.staff_meals_2026), related_master_tabs: ['19_膳食'], related_source_ids: ['DATA-STAFF-MEAL'] },
  { key: 'meal_menu_2026', label: '餐單', get: (d) => listLen(d.meal_menu_2026), related_master_tabs: ['19_膳食'], related_source_ids: ['DATA-MENU'] },
  { key: 'meal_logistics_2026', label: '派飯物流安排', get: (d) => listLen(d.meal_logistics_2026), related_master_tabs: ['19_膳食'], related_source_ids: ['DATA-MEAL-LOGISTICS', 'DATA-MEAL-DISTRIBUTION'] },
  { key: 'schedule', label: '全日時間表', get: (d) => listLen(d.schedule), related_master_tabs: ['26_日程及地圖'], related_source_ids: ['SCHEDULE-ALL'] },
  { key: 'ceremony.mc_scripts', label: '司儀稿（3 份全文）', get: (d) => listLen(d.ceremony && d.ceremony.mc_scripts), related_master_tabs: [], related_source_ids: ['SCRIPT-MERIT', 'SCRIPT-PARADE', 'SCRIPT-LUNCH'] },
  { key: 'ceremony.rundown_part1_v5', label: 'Rundown Part 1 V5（行）', get: (d) => listLen(d.ceremony && d.ceremony.rundown_part1_v5 && d.ceremony.rundown_part1_v5.rows), related_master_tabs: ['26_日程及地圖'], related_source_ids: ['SCHEDULE-ALL', 'DATA-CEREMONY-PROGRAMME'] },
  { key: 'ceremony.meritRoster', label: '優異旅團獲獎（團次）', get: (d) => listLen(d.ceremony && d.ceremony.meritRoster), related_master_tabs: ['21_典禮'], related_source_ids: ['DATA-AWARD-MERIT'] },
  { key: 'ceremony.adult_awards', label: '成年獎勵', get: (d) => listLen(d.ceremony && d.ceremony.adult_awards), related_master_tabs: ['21_典禮'], related_source_ids: ['DATA-AWARD-LEADER'] },
  { key: 'ceremony.ug_units', label: '其他制服團體單位', get: (d) => listLen(d.ceremony && d.ceremony.ug_units), related_master_tabs: ['14_出席', '10_組織'], related_source_ids: ['DATA-UG-ATTENDANCE'] },
  { key: 'troop_checkin', label: '旅團報到點名（旅）', get: (d) => listLen(d.troop_checkin), related_master_tabs: ['22_報到'], related_source_ids: ['DATA-PARTICIPANT'] },
  { key: 'notices', label: '特別通告', get: (d) => listLen(d.notices), related_master_tabs: ['27_公告及求助'], related_source_ids: ['DOC-SPECIAL-CIRCULAR', 'DOC-MAIN-CIRCULAR'] },
  { key: 'documents', label: '文件中心檔案', get: (d) => listLen(d.documents), related_master_tabs: [], related_source_ids: ['REGISTRY-ADMIN-DOCS', 'REGISTRY-COORD-DOCS'] },
  { key: 'meetings', label: '會議', get: (d) => listLen(d.meetings), related_master_tabs: [], related_source_ids: ['DATA-MEETING'] },
  { key: 'souvenirs.staff_roster_2026', label: '紀念章派發名單', get: (d) => listLen(d.souvenirs && d.souvenirs.staff_roster_2026), related_master_tabs: ['15_工作人員', '22_報到'], related_source_ids: ['DATA-STAFF-SOUVENIR', 'BADGE-STAFF'] }
];
datasetDefs.forEach((def) => assertSources(def.related_source_ids, `dataset ${def.key}`));
const validTabs = new Set(MASTER_TABS.map((t) => t.tab));
datasetDefs.forEach((def) => def.related_master_tabs.forEach((tab) => {
  if (!validTabs.has(tab)) throw new Error(`dataset ${def.key} references unknown master tab ${tab}`);
}));

/* ══ repo google_drive/ 2026 檔案快照（SHA-256 provenance） ══ */
const snapshotDir = path.join(root, 'google_drive');
const repoSnapshots = fs.readdirSync(snapshotDir)
  .filter((f) => fs.statSync(path.join(snapshotDir, f)).isFile())
  .sort()
  .map((f) => {
    const buf = fs.readFileSync(path.join(snapshotDir, f));
    return { name: f, bytes: buf.length, sha256: sha256(buf) };
  });

/* ══ 組裝索引 ══ */
const generatedOn = '2026-10-06';
// 注意：索引內容刻意不含自身 Drive 檔 ID 或 GS Drive 檔 ID（避免「上載→改 ID→再上載」
// 嘅循環依賴）。兩者嘅 Drive ID 記錄喺 docs/2027_UNIFIED_GS_GUIDE.md 及
// apps-script/Code2027Unified.gs 嘅 ISD2027_CONNECTION_INDEX_FILE_ID 常數。
const index = {
  schema_version: '2027-unified-connection-index-v1',
  event_id: 'isd_2027',
  status: 'connected_reference_index_gs_ready_not_live',
  generated_on: generatedOn,
  purpose: '一體化連通索引：ISD 2027 Drive 受控來源、07_參考快照（2026 唯讀副本）、系統主SHEET 資料模型、子SHEET 同步路由、十個填寫入口、覆核表／演練包，以及 2026 封存數據集統計。apps-script/Code2027Unified.gs 以本檔為唯一索引來源。',
  boundary: {
    rule: '2026 檔案／Sheet／數據集一律唯讀參考（provenance／規劃參考）。2027 資料只可由受控來源或主SHEET 更新；本索引不建立任何 2026 live link 或寫回路徑。',
    reference_lock: { reference_file: lock.reference_file, sha256: lock.sha256, locked_on: lock.locked_on, status: lock.status },
    prohibited: ['寫回、同步或修改 2026 Drive／Sheet／封存檔', '把 2026 檔案當成 2027 live source', '在本索引或 GS 儲存姓名、電話、電郵、車牌等個人資料'],
    privacy: '索引只含檔案 Metadata、資料夾 ID 及統計數字（record_count），不含任何個人資料。'
  },
  drive_roots: {
    isd_2027_root: { id: driveRegistry.canonical_root.root_folder_id, link: driveRegistry.canonical_root.root_folder_link, name: 'ISD 2027' },
    isd_2027_folders: driveRegistry.canonical_root.folders,
    isd_2026_staff_drive: { id: '1fqFMBRpMaujqoUSOMR0gzRprTeG-O8jF', link: folderLink('1fqFMBRpMaujqoUSOMR0gzRprTeG-O8jF'), name: 'ISD 2026 Staff Drive（唯讀參考）' },
    isd_2026_evidence_folder: { id: '1hyzzIuRGxEh9iya4YvcIsKyfCAZ3sVlG', link: folderLink('1hyzzIuRGxEh9iya4YvcIsKyfCAZ3sVlG'), name: 'ISD 2026 證據庫（唯讀參考）' },
    simulation_review_folder: { id: simulationRegistry.drive_folder.id, link: simulationRegistry.drive_folder.web_view_link, name: simulationRegistry.drive_folder.name, note: '假資料演練覆核包；非 live。' }
  },
  master_sheet: {
    drive_file_id: sheetRegistry.master_sheet.id,
    name: sheetRegistry.master_sheet.name,
    location: sheetRegistry.master_sheet.location,
    layout: { title_row: 1, note_row: 2, header_row: 3, data_from_row: 4 },
    tabs: MASTER_TABS.map((t) => ({
      tab: t.tab,
      kind: t.kind,
      owner: t.owner,
      business_key: t.business_key,
      field_keys: t.field_keys,
      related_source_ids: (MASTER_TAB_SOURCES[t.tab] || []).map((id) => ({
        source_id: id,
        domain: sourceById.get(id).canonical_domain,
        owner_group: sourceById.get(id).owner_group
      })),
      note: t.note || ''
    }))
  },
  child_sheet_routes: CHILD_ROUTES.map((r) => ({
    route_id: r.route_id,
    template_code: r.template_code,
    child_sheet_name: r.child_sheet_name,
    tab: r.tab,
    fixed_fields: r.fixed_fields,
    master_tabs: r.master_tabs,
    match_fields: r.match_fields,
    state: r.state,
    note: r.note
  })),
  child_sheet_templates: sheetRegistry.child_sheets.map((c) => ({
    template_code: c.template_code,
    name: c.name,
    drive_file_id: c.id,
    link: link(c.id),
    tabs: c.tabs
  })),
  entry_routes: ENTRY_ROUTES,
  assets_2027: {
    controlled_domains: driveRegistry.domains.map((d) => ({
      domain_id: d.id,
      file: d.file,
      drive_file_id: d.drive_file_id,
      link: d.drive_file_link,
      record_count: d.record_count,
      status: d.status
    })),
    framework_catalogs: [
      { asset_id: 'REG-DRIVE', name: 'ISD 2027－Drive 來源登記（空白實框架／連通版）.json', drive_file_id: '1mUiVpt-DIvCLHZnySt-sruhnfQBIqGcR', note: '受控來源檔案索引；Code2027Unified.gs 直接讀取。' },
      { asset_id: 'REG-SOURCE-CATALOG', name: 'ISD 2027－受控來源目錄（空白實框架）.json', drive_file_id: '1Y1ge9mctv_jJS5y7-HDSnwbIRyuy_xag', note: '96 個 source ID 目錄。' },
      { asset_id: 'REG-OUTPUT-CONNECTIONS', name: 'ISD 2027－輸出連通目錄（空白實框架）.json', drive_file_id: '1paVJR-Zx330ojpa9xn7sbH6HmAXJ9XVP', note: '109 個輸出連通。' },
      { asset_id: 'REG-OUTPUT-PROJECTION', name: 'ISD 2027－輸出來源指標（空白實框架）.json', drive_file_id: '1BDCPaD1b8m0PaDj4hXr4f530TbHnqgzo', note: '輸出→來源 pointer projection。' }
    ],
    reference_snapshots: REFERENCE_SNAPSHOTS.map((s) => ({
      asset_id: s.asset_id,
      name: s.name,
      kind: s.kind,
      drive_file_id: s.drive_file_id,
      link: link(s.drive_file_id),
      maps_to_source_ids: s.maps_to_source_ids.map((id) => ({ source_id: id, domain: sourceById.get(id).canonical_domain, owner_group: sourceById.get(id).owner_group })),
      origin_2026: s.origin_2026,
      note: '07_參考快照（唯讀）：2026 資料嘅獨立副本，只作規劃參考；不可作 2027 live source。'
    })),
    master_and_templates: [
      { asset_id: 'MASTER-SHEET', name: sheetRegistry.master_sheet.name, kind: 'gsheet', drive_file_id: sheetRegistry.master_sheet.id, note: '2027 唯一主資料模型（25 分頁）。' },
      ...sheetRegistry.child_sheets.map((c) => ({ asset_id: `TEMPLATE-${c.template_code}`, name: c.name, kind: 'gsheet', drive_file_id: c.id, note: `子SHEET範本 ${c.template_code}。` })),
      { asset_id: 'BLANK-STAFF-XLSX', name: 'ISD 2027－工作人員名單（空白範本）', kind: 'xlsx', drive_file_id: '1nTVrcCxQtQrnksDxawoSS3Yg2tZ7Cymu', note: 'root 空白範本。' },
      { asset_id: 'BLANK-WORKPLAN-DOCX', name: 'ISD 2027－工作計劃及進度（空白範本）', kind: 'docx', drive_file_id: '13iMSIUwye3rlIfLA7xllrcNTKrQH2lwr', note: 'root 空白範本。' },
      { asset_id: 'BLANK-PARKING-SHEET', name: 'ISD 2027－泊車證申請表格（空白範本）', kind: 'gsheet', drive_file_id: '1GQ6pWWCJllyjyIpq6rDodU5kWy-mWhmbKrJ4R_KO8eg', note: 'root 空白範本。' }
    ],
    review_sheets: [
      { asset_id: 'REVIEW-SOURCE-EXPLAIN', name: '完整資料來源解釋覆核表（2026證據基礎／全項完成版）', drive_file_id: '1KK7XzYH5zd0VmzxUmvXZG36geaClPZEaRt2Tkl5OcTE', note: '109 輸出＋9 手冊頁簽＋7 公眾對象覆核。' },
      { asset_id: 'REVIEW-PUBLIC-DOCS', name: '公眾文件及入口來源對照表（已覆核版）', drive_file_id: '1Yen7oSIGBBl_Oh-3VvUHRDuwAcJpjD42cqKzXMQNyaQ', note: '26 項。' },
      { asset_id: 'REVIEW-STAFF-DOCS', name: '工作人員文件及工作視圖來源對照表（已覆核版）', drive_file_id: '1kmcamyyfxeCaL1W_yxfX1UiWO2m4aYhXfNgY2bo-Wac', note: '25 項。' },
      { asset_id: 'REVIEW-DEPT-CENTRE', name: '部門中心及內部輸出來源對照表（已覆核版）', drive_file_id: '1oq5cWFixYmhQQk6FAZNx1boskB2-uSuMs7FEQMZoZ2A', note: '58 項。' },
      { asset_id: 'REVIEW-EXEC-MANUAL', name: '工作人員執行手冊頁簽來源對照表（已確認無紅色版）', drive_file_id: '11TsVXVfx-cPTjOz7h4YTYTu0MaHnar6wtl9luXX_gNU', note: '9 頁簽／35 項。' },
      { asset_id: 'REVIEW-PUBLIC7', name: '活動日輸出頁簽及輸入對照表（公眾七類／四欄覆核版）', drive_file_id: '1z95kU9ghiBTW8JAlnfNJoSxVSazjzgbOgZzIUODlB18', note: '公眾七類。' },
      { asset_id: 'REVIEW-GUIDE', name: 'ISD 2027－覆核導覽.md', drive_file_id: '1nXVSR8sFS9mdw1pean_mGYjiuC5Y7edf', note: '範本覆核導覽。' }
    ],
    simulation_pack: {
      folder: { id: simulationRegistry.drive_folder.id, link: simulationRegistry.drive_folder.web_view_link },
      files: [
        simulationRegistry.published_artifacts.source_registry,
        simulationRegistry.published_artifacts.output_connection_registry,
        simulationRegistry.published_artifacts.output_projection,
        simulationRegistry.published_artifacts.review,
        simulationRegistry.published_artifacts.change_audit,
        ...simulationRegistry.published_artifacts.domains,
        simulationRegistry.published_artifacts.review_guide,
        simulationRegistry.published_artifacts.review_interface_source
      ].map((f, i) => ({ asset_id: `SIM-${String(i + 1).padStart(2, '0')}`, name: f.name, drive_file_id: f.id, note: 'SIMULATION_ONLY；非 live。' }))
    },
    execution_manual_assets: driveRegistry.execution_manual_assets.map((a) => ({
      asset_id: a.asset_id, name: a.asset_id, drive_file_id: a.drive_file_id, link: a.drive_file_link, note: '執行手冊 2027 資產。'
    }))
  },
  assets_2026_reference: {
    key_assets: ASSETS_2026.map((a) => ({ ...a, link: a.kind === 'folder' ? folderLink(a.drive_file_id) : link(a.drive_file_id) })),
    drive_group_folders: drive2026Groups.map((g) => ({ ...g, link: folderLink(g.drive_file_id) })),
    repo_file_snapshots: repoSnapshots,
    repo_snapshot_note: 'repo google_drive/ 內 2026 檔案快照（SHA-256）；唯讀 provenance。'
  },
  datasets_2026: datasetDefs.map((def) => ({
    key: def.key,
    label: def.label,
    record_count: def.get(evidence),
    related_master_tabs: def.related_master_tabs,
    related_source_ids: def.related_source_ids.map((id) => ({ source_id: id, domain: sourceById.get(id).canonical_domain, owner_group: sourceById.get(id).owner_group })),
    privacy: '只記數量；不含個人資料。'
  })),
  unified_gs: {
    repo_file: 'apps-script/Code2027Unified.gs',
    version: '2027-unified-gs-v1',
    drive_folder: '00_系統及資料',
    note: '一體化後端 GS（本索引嘅唯一消費者）；由 repo 貼入 Apps Script 部署。'
  }
};

/* ══ 自檢 ══ */
const masterTabNames = new Set(MASTER_TABS.map((t) => t.tab));
if (MASTER_TABS.length !== sheetRegistry.master_sheet.tabs.length) throw new Error('master tab count mismatch vs sheet registry');
MASTER_TABS.forEach((t) => {
  if (!sheetRegistry.master_sheet.tabs.includes(t.tab)) throw new Error(`master tab ${t.tab} not in sheet registry`);
  if (t.kind === 'data' && t.field_keys.indexOf(t.business_key.split('+')[0]) < 0) throw new Error(`business key not in fields: ${t.tab}`);
});
CHILD_ROUTES.forEach((r) => {
  if (!sheetRegistry.child_sheets.some((c) => c.template_code === r.template_code)) throw new Error(`unknown template code ${r.template_code}`);
  if (r.state === 'route_ready') {
    r.master_tabs.forEach((mt) => {
      if (!masterTabNames.has(mt)) throw new Error(`route ${r.route_id} unknown master tab ${mt}`);
      const tabDef = MASTER_TABS.find((t) => t.tab === mt);
      (r.match_fields[mt] || []).forEach((f) => {
        if (r.fixed_fields.indexOf(f) < 0) throw new Error(`route ${r.route_id} match field ${f} not in child fixed fields`);
        if (tabDef.field_keys.indexOf(f) < 0) throw new Error(`route ${r.route_id} match field ${f} not in master tab ${mt}`);
      });
    });
  }
});
if (ENTRY_ROUTES.length !== 10) throw new Error('expected 10 entry routes');
if (REFERENCE_SNAPSHOTS.length !== 16) throw new Error('expected 16 reference snapshots');
index.datasets_2026.forEach((d) => {
  if (d.record_count === null) throw new Error(`dataset ${d.key} count is null (path moved in 2026 archive)`);
  d.related_master_tabs.forEach((t) => { if (!masterTabNames.has(t)) throw new Error(`dataset ${d.key} bad tab ${t}`); });
});

writeJson('data/2027_unified_connection_index.json', index);
const ready = CHILD_ROUTES.filter((r) => r.state === 'route_ready').length;
console.log(`unified connection index written: ${MASTER_TABS.length} master tabs, ${CHILD_ROUTES.length} child routes (${ready} ready), ${ENTRY_ROUTES.length} entry routes, ${REFERENCE_SNAPSHOTS.length} snapshots, ${index.datasets_2026.length} 2026 datasets, ${repoSnapshots.length} repo file snapshots`);
