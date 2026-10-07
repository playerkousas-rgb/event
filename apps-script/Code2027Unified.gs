// ═══════════════════════════════════════════════════════════════════════════
//  ISD 2027 一體化後端 GS（2026 資料連通 ＋ 系統主SHEET 同步 ＋ 受控來源發佈）
//  version: 2027-unified-gs-v1    event_id: isd_2027
// ───────────────────────────────────────────────────────────────────────────
//  一個檔做齊四件事：
//    ① 一體化索引（getUnifiedIndex / findAsset / get2026Reference）
//       讀取 Drive 上「ISD 2027－2026資料連通索引（一體化版）.json」：
//       96 受控來源、14 份 07_參考快照（2026 唯讀副本）、25 分頁主SHEET 模型、
//       25 條子SHEET 同步路由、10 個填寫入口、2026 封存數據集統計。
//    ② 系統主SHEET 同步引擎（upsertMasterRows / registerChildSheet / pullChildSheet）
//       按 02_資料字典 欄位鍵名合約驗證 → 按 source_record_id／業務鍵 upsert →
//       04_同步狀態／05_欄位錯誤／24_修正紀錄 全自動留痕（error-return workflow）。
//    ③ 受控來源發佈適配器（update2027Source / get2027Output）
//       與 apps-script/Code2027.gs v1 相同規則（revision／owner／approval／封鎖 2026 引用）。
//    ④ 延伸登記（register2027Extension）——「再加上 2027 的 SHEET 和 SCRIPT」嘅正式入口。
//
//  邊界（不可跨越）：
//    － event_id 只接受 isd_2027；拒絕 event_id=isd_2026。
//    － 2026 檔案／Sheet 只作唯讀參考：本 GS 不會寫入任何 2026 檔案，
//      payload 出現 data/isd_2026.json／ISD2026_GAS_URL／event_id=isd_2026 一律拒收。
//    － 索引及參考查閱只含 Metadata 及統計數字，不含姓名／電話／車牌等個人資料。
//
//  部署（全新獨立 project，切勿貼入 2026 backend）：
//    1. 開啟系統主SHEET「ISD 2027－系統主SHEET（公眾輸出頁簽增補覆核版）」
//       （Extensions → Apps Script），或另建新 Sheet／新 project 亦可（本 GS 用
//       openById 存取主SHEET，唔一定要 bound）。
//    2. 刪走預設程式碼，貼上本檔全部內容，儲存。
//    3. 在編輯器執行一次 initializeUnifiedBackend()：
//       － 產生／讀取 ISD2027_APIKEY（記低，只放受限設定，不入 Git／瀏覽器）；
//       － 喺主SHEET 建立 2027_Audit_Log／2027_資產索引／2027_登記表 三個分頁；
//       － 驗證主SHEET 及連通索引可讀。
//    4. Deploy → New deployment → Web app：Execute as「我」；Who has access
//       用最小權限。/exec URL 即 ISD2027_GAS_URL。
//    5. 測試：GET .../exec?action=getHealth 應回 event_id:"isd_2027"、index_loaded:true。
//
//  詳細說明：docs/2027_UNIFIED_GS_GUIDE.md
// ═══════════════════════════════════════════════════════════════════════════

/* ── 0. CONFIG ─────────────────────────────────────────────────────────── */
const ISD2027_UNIFIED_VERSION = '2027-unified-gs-v1.2';
const ISD2027_EVENT_ID = 'isd_2027';

/* ── 0b. 防呆上限（v1.2：避免 Vercel／瀏覽器／Google 配額爆掉）────────── */
const ISD2027_MAX_REQUEST_CHARS = 8 * 1024 * 1024;   // 單一請求 body 上限 8MB（GAS 實際上限 50MB，但大 body 必超 30 秒執行限時）
const ISD2027_MAX_RESPONSE_CHARS = 10 * 1024 * 1024; // 單一回應上限 10MB（前端 GASGuard 同步設 10MB，超過即兩邊都拒）
const ISD2027_RATE_LIMIT = { windowMs: 60000, max: 120 }; // 每分鐘最多 120 個請求（防 loop／機械人打到 Google 配額 429）

// Drive 上嘅連通索引檔（00_系統及資料 內；由 tools/build_2027_unified_connection_index.js 產生）
const ISD2027_CONNECTION_INDEX_FILE_ID = '1JXD_zudm8p9S5CSZLp0_vIhWwnjE2NX1';

// 受控來源 Drive 登記檔（Code2027.gs v1 同一檔案）
const ISD2027_DRIVE_REGISTRY_FILE_ID = '1mUiVpt-DIvCLHZnySt-sruhnfQBIqGcR';

// 系統主SHEET（25 分頁；如日後另建正式工作副本，只改呢一個 ID）
const ISD2027_MASTER_SHEET_ID = '1aQYNIq41ek3w5zfoLP12KuT_LAeWQLNv6UTAR_1SWPg';

const ISD2027_AUDIT_SHEET = '2027_Audit_Log';
const ISD2027_INDEX_SHEET = '2027_資產索引';
const ISD2027_REGISTRY_SHEET = '2027_登記表';
const ISD2027_BLOCKED_REFERENCES = ['data/isd_2026.json', 'ISD2026_GAS_URL', 'event_id=isd_2026'];

// 主SHEET 版面（title=1, note=2, header=3, data 由 4 開始）
const MASTER_LAYOUT = { title_row: 1, note_row: 2, header_row: 3, data_from_row: 4 };
const MASTER_MAX_ROWS = 2000;      // getMasterTab 讀取上限
const UPSERT_MAX_ROWS = 500;       // 每次最多 upsert 行數

/* ── 1. 進入點 ─────────────────────────────────────────────────────────── */
function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || 'getHealth');
  try {
    if (!rateLimitOk_()) return jsonOut_({ success: false, error: 'rate_limited', retry_after_ms: ISD2027_RATE_LIMIT.windowMs, message: '請求太密（每分鐘上限 ' + ISD2027_RATE_LIMIT.max + ' 個），請一分鐘後再試' });
    if (action === 'getHealth') return jsonOut_(getHealth_());
    const data = (e && e.parameter) || {};
    verify2027Request_(data);
    if (action === 'getUnifiedIndex') return jsonOut_(getUnifiedIndex_(data));
    if (action === 'get2026Reference') return jsonOut_(get2026Reference_(data));
    if (action === 'findAsset') return jsonOut_(findAsset_(data));
    if (action === 'getMasterModel') return jsonOut_(getMasterModel_(data));
    if (action === 'getMasterTab') return jsonOut_(getMasterTab_(data));
    if (action === 'getEntryRoutes') return jsonOut_(getEntryRoutes_(data));
    if (action === 'getChildRoutes') return jsonOut_(getChildRoutes_(data));
    if (action === 'listSyncStatus') return jsonOut_(listLogTab_('04_同步狀態', data));
    if (action === 'listFieldErrors') return jsonOut_(listLogTab_('05_欄位錯誤', data));
    if (action === 'get2027Output') return jsonOut_(get2027Output_(String(data.output_id || '')));
    return jsonOut_({ success: false, error: 'Unknown action: ' + action });
  } catch (error) {
    return jsonOut_({ success: false, error: String(error) });
  }
}

function doPost(e) {
  let data = {};
  try {
    const rawBody = (e && e.postData && e.postData.contents) || '';
    if (rawBody.length > ISD2027_MAX_REQUEST_CHARS) return jsonOut_({ success: false, error: 'request_too_large', max_chars: ISD2027_MAX_REQUEST_CHARS, message: '請求 body ' + Math.round(rawBody.length / 1048576) + 'MB 超過 8MB 上限；請分批（upsertMasterRows 每次最多 500 行）' });
    if (!rateLimitOk_()) return jsonOut_({ success: false, error: 'rate_limited', retry_after_ms: ISD2027_RATE_LIMIT.windowMs, message: '請求太密（每分鐘上限 ' + ISD2027_RATE_LIMIT.max + ' 個），請一分鐘後再試' });
    data = parse2027Request_(e);
    const action = String(data.action || '');
    verify2027Request_(data);
    if (action === 'initializeUnifiedBackend') return jsonOut_(initializeUnifiedBackend_());
    if (action === 'refreshUnifiedIndex') return jsonOut_(refreshUnifiedIndex_(data));
    if (action === 'upsertMasterRows') return jsonOut_(upsertMasterRows_(data));
    if (action === 'registerChildSheet') return jsonOut_(registerChildSheet_(data));
    if (action === 'pullChildSheet') return jsonOut_(pullChildSheet_(data));
    if (action === 'register2027Extension') return jsonOut_(register2027Extension_(data));
    if (action === 'resolveFieldError') return jsonOut_(resolveFieldError_(data));
    if (action === 'update2027Source') return jsonOut_(update2027Source_(data));
    if (action === 'get2027Output') return jsonOut_(get2027Output_(String(data.output_id || '')));
    if (action === 'getUnifiedIndex') return jsonOut_(getUnifiedIndex_(data));
    if (action === 'get2026Reference') return jsonOut_(get2026Reference_(data));
    if (action === 'getMasterModel') return jsonOut_(getMasterModel_(data));
    if (action === 'getMasterTab') return jsonOut_(getMasterTab_(data));
    if (action === 'getHealth') return jsonOut_(getHealth_());
    return jsonOut_({ success: false, error: 'Unknown action: ' + action });
  } catch (error) {
    try { auditUnified_('api_error', 'error', String(data.action || ''), String(error), String(data.updated_by || data.registered_by || '')); } catch (ignored) {}
    return jsonOut_({ success: false, error: String(error) });
  }
}

/* ── 2. 初始化／API key ────────────────────────────────────────────────── */
function initializeUnifiedBackend_() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('ISD2027_APIKEY');
  if (!key) {
    key = 'isd2027_' + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('ISD2027_APIKEY', key);
  }
  const setup = setupUnifiedSheets_();
  const health = getHealth_();
  auditUnified_('initializeUnifiedBackend', 'ok', ISD2027_EVENT_ID, JSON.stringify(setup), '');
  return {
    success: true,
    event_id: ISD2027_EVENT_ID,
    version: ISD2027_UNIFIED_VERSION,
    api_key: key,
    setup: setup,
    health: health,
    next: 'Deploy as Web App（Execute as：我）。ISD2027_GAS_URL=/exec URL；API key 只放受限設定，不得入 Git／瀏覽器。'
  };
}

// 舊 v1 文件沿用嘅名稱：行為等同 initializeUnifiedBackend
function initialize2027Backend() { return initializeUnifiedBackend_(); }

// 編輯器手動執行（首次部署）：等同 doPost action=initializeUnifiedBackend
function initializeUnifiedBackend() { return initializeUnifiedBackend_(); }

function getHealth_() {
  const health = {
    success: true, version: ISD2027_UNIFIED_VERSION, event_id: ISD2027_EVENT_ID,
    configured: !!get2027ApiKey_(),
    index_file_id: ISD2027_CONNECTION_INDEX_FILE_ID,
    drive_registry_file_id: ISD2027_DRIVE_REGISTRY_FILE_ID,
    master_sheet_id: ISD2027_MASTER_SHEET_ID
  };
  try {
    const idx = getConnectionIndex_();
    health.index_loaded = true;
    health.index_counts = {
      master_tabs: idx.master_sheet.tabs.length,
      child_routes: idx.child_sheet_routes.length,
      child_routes_ready: idx.child_sheet_routes.filter(function (r) { return r.state === 'route_ready'; }).length,
      entry_routes: idx.entry_routes.length,
      reference_snapshots: idx.assets_2027.reference_snapshots.length,
      datasets_2026: idx.datasets_2026.length
    };
  } catch (error) {
    health.index_loaded = false;
    health.index_error = String(error);
  }
  try {
    const ss = getMasterSheet_();
    health.master_sheet_reachable = true;
    health.master_sheet_name = ss.getName();
  } catch (error) {
    health.master_sheet_reachable = false;
    health.master_sheet_error = String(error);
  }
  return health;
}

function get2027ApiKey_() {
  return String(PropertiesService.getScriptProperties().getProperty('ISD2027_APIKEY') || '');
}

function parse2027Request_(e) {
  const raw = e && e.postData && e.postData.contents;
  if (raw) return JSON.parse(raw);
  return (e && e.parameter) || {};
}

function verify2027Request_(data) {
  if (String(data.event_id || '') !== ISD2027_EVENT_ID) throw new Error('2027 endpoint only accepts event_id=' + ISD2027_EVENT_ID);
  const key = get2027ApiKey_();
  if (!key) throw new Error('2027 backend is not initialized');
  if (String(data.api_key || '') !== key) throw new Error('Unauthorized 2027 API key');
}

function jsonOut_(value) {
  const text = JSON.stringify(value);
  if (text && text.length > ISD2027_MAX_RESPONSE_CHARS) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'response_too_large', max_chars: ISD2027_MAX_RESPONSE_CHARS, message: '回應超過 10MB 上限：請用 section／limit／tab 參數細分請求，唔好一次過攞成個索引／成個分頁' })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

/* 防呆：簡易 rate limit（每分鐘視窗計數，存 ScriptProperties；視窗過咗自動歸零） */
function rateLimitOk_() {
  const props = PropertiesService.getScriptProperties();
  const win = Math.floor(Date.now() / ISD2027_RATE_LIMIT.windowMs);
  const key = 'rl_win_' + win;
  const count = Number(props.getProperty(key) || '0') + 1;
  props.setProperty(key, String(count));
  try { props.deleteProperty('rl_win_' + (win - 2)); } catch (ignored) {} // 順手清兩個視窗前嘅舊計數
  return count <= ISD2027_RATE_LIMIT.max;
}

/* ── 3. Drive JSON 讀寫 ────────────────────────────────────────────────── */
function readJsonFile_(fileId) {
  return JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8'));
}

function writeJsonFile_(fileId, value) {
  DriveApp.getFileById(fileId).setContent(JSON.stringify(value, null, 2) + '\n');
}

let INDEX_CACHE_ = null;
function getConnectionIndex_() {
  if (INDEX_CACHE_) return INDEX_CACHE_;
  const idx = readJsonFile_(ISD2027_CONNECTION_INDEX_FILE_ID);
  if (idx.event_id !== ISD2027_EVENT_ID) throw new Error('Connection index event boundary failed');
  if (idx.schema_version !== '2027-unified-connection-index-v1') throw new Error('Unsupported connection index schema: ' + idx.schema_version);
  INDEX_CACHE_ = idx;
  return idx;
}

function getMasterSheet_() {
  return SpreadsheetApp.openById(ISD2027_MASTER_SHEET_ID);
}

/* ── 4. 主SHEET 內嘅統一分頁（稽核／索引／登記） ────────────────────────── */
function setupUnifiedSheets_() {
  const ss = getMasterSheet_();
  const created = [];
  // 2027_Audit_Log
  let audit = ss.getSheetByName(ISD2027_AUDIT_SHEET);
  if (!audit) { audit = ss.insertSheet(ISD2027_AUDIT_SHEET); created.push(ISD2027_AUDIT_SHEET); }
  if (audit.getLastRow() === 0) {
    audit.appendRow(['logged_at', 'action', 'outcome', 'event_id', 'subject', 'detail', 'updated_by']);
    audit.setFrozenRows(1);
  }
  // 2027_登記表
  let registry = ss.getSheetByName(ISD2027_REGISTRY_SHEET);
  if (!registry) { registry = ss.insertSheet(ISD2027_REGISTRY_SHEET); created.push(ISD2027_REGISTRY_SHEET); }
  if (registry.getLastRow() === 0) {
    registry.appendRow(['reg_id', 'registered_at', 'kind', 'name', 'drive_id_or_url', 'owner_group', 'template_code', 'note', 'registered_by', 'status']);
    registry.setFrozenRows(1);
  }
  // 2027_資產索引（由 Drive 索引重建）
  const refreshed = refreshIndexSheet_(ss);
  return { created_sheets: created, index_sheet: refreshed.sheet, index_rows: refreshed.rows, registry_entries: Math.max(0, registry.getLastRow() - 1) };
}

function auditUnified_(action, outcome, subject, detail, updatedBy) {
  const ss = getMasterSheet_();
  let sheet = ss.getSheetByName(ISD2027_AUDIT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ISD2027_AUDIT_SHEET);
    sheet.appendRow(['logged_at', 'action', 'outcome', 'event_id', 'subject', 'detail', 'updated_by']);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([new Date().toISOString(), action, outcome, ISD2027_EVENT_ID, String(subject || ''), String(detail || '').slice(0, 45000), String(updatedBy || '')]);
}

function refreshUnifiedIndex_(data) {
  INDEX_CACHE_ = null; // 強制重新讀 Drive
  const refreshed = refreshIndexSheet_(getMasterSheet_());
  auditUnified_('refreshUnifiedIndex', 'ok', ISD2027_INDEX_SHEET, JSON.stringify({ rows: refreshed.rows }), String(data.updated_by || ''));
  return { success: true, sheet: refreshed.sheet, rows: refreshed.rows, generated_on: refreshed.generated_on };
}

function refreshIndexSheet_(ss) {
  const idx = getConnectionIndex_();
  let sheet = ss.getSheetByName(ISD2027_INDEX_SHEET);
  if (!sheet) sheet = ss.insertSheet(ISD2027_INDEX_SHEET);
  const headers = ['asset_id', 'category', 'name', 'kind', 'drive_file_id', 'link', 'owner_group', 'maps_to_source_ids', 'master_tabs', 'origin_2026', 'note'];
  sheet.clear();
  sheet.clearFormats();
  const rows = [headers];
  const push = function (category, asset) {
    rows.push([
      String(asset.asset_id || ''), category, String(asset.name || ''), String(asset.kind || ''),
      String(asset.drive_file_id || ''), String(asset.link || ''), String(asset.owner_group || ''),
      (asset.maps_to_source_ids || []).map(function (m) { return typeof m === 'string' ? m : m.source_id; }).join('；'),
      (asset.master_tabs || []).join('；'), String(asset.origin_2026 || ''), String(asset.note || '')
    ]);
  };
  idx.assets_2027.controlled_domains.forEach(function (a) { push('2027受控來源', { asset_id: 'DOMAIN-' + a.domain_id, name: a.file, kind: 'json', drive_file_id: a.drive_file_id, link: a.link, note: a.record_count + ' 個 source record；' + a.status }); });
  idx.assets_2027.framework_catalogs.forEach(function (a) { push('2027登記檔', a); });
  idx.assets_2027.reference_snapshots.forEach(function (a) {
    push('2027參考快照', {
      asset_id: a.asset_id, name: a.name, kind: a.kind, drive_file_id: a.drive_file_id, link: a.link,
      maps_to_source_ids: a.maps_to_source_ids, origin_2026: a.origin_2026, note: a.note
    });
  });
  idx.assets_2027.master_and_templates.forEach(function (a) { push('2027主表及範本', a); });
  idx.assets_2027.review_sheets.forEach(function (a) { push('2027覆核表', a); });
  (idx.assets_2027.simulation_pack.files || []).forEach(function (a) { push('2027演練包', a); });
  idx.assets_2027.execution_manual_assets.forEach(function (a) { push('2027執行手冊資產', a); });
  idx.assets_2026_reference.key_assets.forEach(function (a) { push('2026關鍵Sheet', a); });
  idx.assets_2026_reference.drive_group_folders.forEach(function (a) { push('2026 Drive資料夾', a); });
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  return { sheet: ISD2027_INDEX_SHEET, rows: rows.length - 1, generated_on: idx.generated_on };
}

/* ── 5. 一體化索引／2026 參考（唯讀） ──────────────────────────────────── */
function getUnifiedIndex_(data) {
  const idx = getConnectionIndex_();
  if (data && String(data.section || '')) {
    const section = String(data.section);
    if (!idx[section]) throw new Error('Unknown index section: ' + section);
    return { success: true, event_id: ISD2027_EVENT_ID, section: section, data: idx[section] };
  }
  return { success: true, event_id: ISD2027_EVENT_ID, generated_on: idx.generated_on, status: idx.status, boundary: idx.boundary, index: idx };
}

function get2026Reference_(data) {
  const idx = getConnectionIndex_();
  const filterKey = String((data && data.key) || '');
  const datasets = idx.datasets_2026.filter(function (d) { return !filterKey || d.key === filterKey; });
  return {
    success: true,
    event_id: ISD2027_EVENT_ID,
    boundary: idx.boundary,
    reference_snapshots: idx.assets_2027.reference_snapshots,
    key_assets_2026: idx.assets_2026_reference.key_assets,
    drive_group_folders_2026: idx.assets_2026_reference.drive_group_folders,
    repo_file_snapshots: idx.assets_2026_reference.repo_file_snapshots,
    datasets_2026: datasets,
    note: '2026 一律唯讀參考（provenance／規劃參考）。本 API 只回 Metadata 及統計數字，不含個人資料；2027 資料請用受控來源或主SHEET 更新。'
  };
}

function findAsset_(data) {
  const idx = getConnectionIndex_();
  const q = String((data && data.q) || '').toLowerCase().trim();
  if (!q) throw new Error('q is required');
  const sections = [
    ['2027受控來源', idx.assets_2027.controlled_domains.map(function (a) { return { asset_id: 'DOMAIN-' + a.domain_id, name: a.file, kind: 'json', drive_file_id: a.drive_file_id, link: a.link, note: a.record_count + ' records' }; })],
    ['2027登記檔', idx.assets_2027.framework_catalogs],
    ['2027參考快照', idx.assets_2027.reference_snapshots],
    ['2027主表及範本', idx.assets_2027.master_and_templates],
    ['2027覆核表', idx.assets_2027.review_sheets],
    ['2027演練包', idx.assets_2027.simulation_pack.files || []],
    ['2027執行手冊資產', idx.assets_2027.execution_manual_assets],
    ['2026關鍵Sheet', idx.assets_2026_reference.key_assets],
    ['2026 Drive資料夾', idx.assets_2026_reference.drive_group_folders],
    ['主SHEET分頁', idx.master_sheet.tabs],
    ['子SHEET路由', idx.child_sheet_routes],
    ['填寫入口', idx.entry_routes],
    ['2026數據集', idx.datasets_2026]
  ];
  const hits = [];
  sections.forEach(function (pair) {
    pair[1].forEach(function (asset) {
      const text = JSON.stringify(asset).toLowerCase();
      if (text.indexOf(q) >= 0) hits.push({ category: pair[0], asset: asset });
    });
  });
  return { success: true, event_id: ISD2027_EVENT_ID, q: q, count: hits.length, hits: hits.slice(0, 80) };
}

function getMasterModel_(data) {
  const idx = getConnectionIndex_();
  const ss = getMasterSheet_();
  const liveTabs = ss.getSheets().map(function (s) { return s.getName(); });
  const tabs = idx.master_sheet.tabs.map(function (t) {
    return Object.assign({}, t, { exists_in_live_sheet: liveTabs.indexOf(t.tab) >= 0 });
  });
  return {
    success: true, event_id: ISD2027_EVENT_ID,
    master_sheet: { drive_file_id: idx.master_sheet.drive_file_id, name: idx.master_sheet.name, layout: idx.master_sheet.layout },
    tabs: tabs, live_tab_count: liveTabs.length,
    child_sheet_routes: idx.child_sheet_routes,
    child_sheet_templates: idx.child_sheet_templates,
    entry_routes: idx.entry_routes
  };
}

function getEntryRoutes_(data) {
  const idx = getConnectionIndex_();
  return { success: true, event_id: ISD2027_EVENT_ID, entry_routes: idx.entry_routes };
}

function getChildRoutes_(data) {
  const idx = getConnectionIndex_();
  const templateCode = String((data && data.template_code) || '');
  const routes = idx.child_sheet_routes.filter(function (r) { return !templateCode || r.template_code === templateCode; });
  return {
    success: true, event_id: ISD2027_EVENT_ID, child_routes: routes,
    child_sheet_templates: idx.child_sheet_templates,
    note: 'state=route_ready 可直接 pullChildSheet；pending_field_mapping 需 2027 owner 確認欄位對應後更新索引。'
  };
}

/* ── 6. 主SHEET 讀取 ───────────────────────────────────────────────────── */
function masterTabDef_(tab) {
  const idx = getConnectionIndex_();
  const def = idx.master_sheet.tabs.filter(function (t) { return t.tab === tab; })[0];
  if (!def) throw new Error('Unknown master tab: ' + tab);
  return def;
}

function readTabAsObjects_(ss, tab, maxRows) {
  const sheet = ss.getSheetByName(tab);
  if (!sheet) throw new Error('Master sheet has no tab: ' + tab);
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headerRow = MASTER_LAYOUT.header_row;
  if (lastRow < headerRow) return { headers: [], rows: [] };
  const values = sheet.getRange(headerRow, 1, lastRow - headerRow + 1, lastCol).getValues();
  const headers = (values[0] || []).map(function (v) { return String(v || '').trim(); }).filter(function (v, i, arr) { return v && arr.indexOf(v) === i; });
  const rows = [];
  for (let i = 1; i < values.length && rows.length < (maxRows || MASTER_MAX_ROWS); i++) {
    const obj = {};
    let nonEmpty = false;
    (values[0] || []).forEach(function (h, col) {
      const key = String(h || '').trim();
      if (!key) return;
      const raw = values[i][col];
      obj[key] = raw instanceof Date ? raw.toISOString() : raw;
      if (raw !== '' && raw !== null) nonEmpty = true;
    });
    if (nonEmpty) rows.push(obj);
  }
  return { headers: headers, rows: rows };
}

function getMasterTab_(data) {
  const tab = String((data && data.tab) || '');
  if (!tab) throw new Error('tab is required');
  const def = masterTabDef_(tab);
  if (['guide', 'entry_routes', 'dictionary', 'child_mapping'].indexOf(def.kind) >= 0) {
    throw new Error(tab + ' 是模型分頁，請用 getMasterModel／getUnifiedIndex 讀取');
  }
  // v1.2 防呆：limit 參數（1..2000）——大分頁可以逐段攞，唔會一次過傳 10MB+
  const limit = Math.max(1, Math.min(Number((data && data.limit) || MASTER_MAX_ROWS) || MASTER_MAX_ROWS, MASTER_MAX_ROWS));
  const result = readTabAsObjects_(getMasterSheet_(), tab, limit);
  return { success: true, event_id: ISD2027_EVENT_ID, tab: tab, business_key: def.business_key, field_keys: def.field_keys, count: result.rows.length, limit: limit, rows: result.rows };
}

function listLogTab_(tab, data) {
  const limit = Math.min(Number((data && data.limit) || 200), 1000);
  const result = readTabAsObjects_(getMasterSheet_(), tab, limit);
  return { success: true, event_id: ISD2027_EVENT_ID, tab: tab, count: result.rows.length, rows: result.rows };
}

/* ── 7. 主SHEET 同步引擎（驗證＋upsert＋留痕） ─────────────────────────── */
function forbidden2027Reference_(payload) {
  const text = JSON.stringify(payload || {});
  for (let i = 0; i < ISD2027_BLOCKED_REFERENCES.length; i++) {
    if (text.indexOf(ISD2027_BLOCKED_REFERENCES[i]) >= 0) return ISD2027_BLOCKED_REFERENCES[i];
  }
  return '';
}

function ensureLogSheet_(ss, tab, headers) {
  let sheet = ss.getSheetByName(tab);
  if (!sheet) sheet = ss.insertSheet(tab);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function logSyncRow_(ss, sourceSheet, sourceTab, sourceRecordId, result, message) {
  ensureLogSheet_(ss, '04_同步狀態', ['sync_id', 'source_sheet', 'source_tab', 'source_record_id', 'template_version', 'result', 'message', 'synced_at'])
    .appendRow(['SYN-' + Utilities.getUuid().slice(0, 8), sourceSheet, sourceTab, String(sourceRecordId || ''), '', result, String(message || '').slice(0, 800), new Date().toISOString()]);
}

function logFieldError_(ss, sourceSheet, sourceTab, sourceRecordId, fieldKey, errorCode, message) {
  ensureLogSheet_(ss, '05_欄位錯誤', ['error_id', 'source_sheet', 'source_tab', 'source_record_id', 'field_key', 'error_code', 'message', 'detected_at', 'resolved_at'])
    .appendRow(['ERR-' + Utilities.getUuid().slice(0, 8), sourceSheet, sourceTab, String(sourceRecordId || ''), String(fieldKey || ''), errorCode, String(message || '').slice(0, 800), new Date().toISOString(), '']);
}

function resolveFieldError_(data) {
  const errorId = String(data.error_id || '');
  if (!errorId) throw new Error('error_id is required');
  const ss = getMasterSheet_();
  const sheet = ss.getSheetByName('05_欄位錯誤');
  if (!sheet || sheet.getLastRow() < 2) throw new Error('No field errors logged');
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function (v) { return String(v || ''); });
  const idCol = headers.indexOf('error_id');
  const resolvedCol = headers.indexOf('resolved_at');
  let resolved = 0;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === errorId && !values[r][resolvedCol]) {
      sheet.getRange(r + 1, resolvedCol + 1).setValue(new Date().toISOString());
      resolved++;
    }
  }
  auditUnified_('resolveFieldError', resolved ? 'ok' : 'not_found', errorId, 'resolved=' + resolved, String(data.updated_by || ''));
  return { success: true, error_id: errorId, resolved: resolved };
}

// 直接 upsert 主SHEET 資料分頁（upsertMasterRows）
function upsertMasterRows_(data) {
  const tab = String(data.tab || '');
  const rows = data.rows || [];
  const def = masterTabDef_(tab);
  if (def.kind !== 'data') throw new Error(tab + ' 不接受 upsert（kind=' + def.kind + '）；只可寫入資料分頁');
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('rows[] is required');
  if (rows.length > UPSERT_MAX_ROWS) throw new Error('too many rows: ' + rows.length + ' > ' + UPSERT_MAX_ROWS);
  const updatedBy = String(data.updated_by || '');
  if (!updatedBy) throw new Error('updated_by is required');
  const changeReason = String(data.change_reason || '');
  const ss = getMasterSheet_();
  const sourceSheet = String(data.source_sheet || 'API');
  const sourceTab = tab;
  const results = rows.map(function (row) {
    return upsertOneRow_(ss, def, row, {
      sourceSheet: sourceSheet, sourceTab: sourceTab, updatedBy: updatedBy,
      changeReason: changeReason, auditId: String(data.audit_id || ''), matchFields: null
    });
  });
  const inserted = results.filter(function (r) { return r.result === 'inserted'; }).length;
  const updated = results.filter(function (r) { return r.result === 'updated'; }).length;
  const rejected = results.filter(function (r) { return r.result === 'rejected'; }).length;
  const summary = { success: rejected === 0, event_id: ISD2027_EVENT_ID, tab: tab, total: rows.length, inserted: inserted, updated: updated, rejected: rejected, results: results };
  auditUnified_('upsertMasterRows', rejected ? 'partial' : 'ok', tab, JSON.stringify({ total: rows.length, inserted: inserted, updated: updated, rejected: rejected, change_reason: changeReason }), updatedBy);
  return summary;
}

// 核心 upsert：一列資料 → 驗證 → insert/update → 留痕
// opts: {sourceSheet, sourceTab, updatedBy, changeReason, auditId, matchFields:{tab:[fields]}, skipFields:[...]}
function upsertOneRow_(ss, def, row, opts) {
  const tab = def.tab;
  const fieldKeys = def.field_keys;
  const businessKeyRaw = def.business_key; // e.g. 'organisation_id' 或 'code_set+code'
  const businessKeyParts = businessKeyRaw.split('+');
  const sourceSheet = opts.sourceSheet || '';
  const sourceTab = opts.sourceTab || tab;

  // 收乾 row：只接受合約欄位
  const clean = {};
  const unknown = [];
  Object.keys(row || {}).forEach(function (k) {
    const key = String(k).trim();
    if (!key) return;
    if (fieldKeys.indexOf(key) >= 0) {
      const v = row[k];
      clean[key] = v instanceof Date ? v.toISOString() : v;
    } else {
      unknown.push(key);
    }
  });
  const recordId = String(clean.source_record_id || '');

  // 未知欄位：拒收，绝不暗中改名（never silently remap）
  if (unknown.length) {
    logFieldError_(ss, sourceSheet, sourceTab, recordId, unknown[0], 'unknown_field', '欄位鍵名不在 ' + tab + ' 資料字典：' + unknown.join('、'));
    logSyncRow_(ss, sourceSheet, sourceTab, recordId, 'rejected', '未知欄位：' + unknown.join('、'));
    return { result: 'rejected', source_record_id: recordId, error: 'unknown_field', fields: unknown };
  }

  // 封鎖 2026 引用
  const blocked = forbidden2027Reference_(clean);
  if (blocked) {
    logFieldError_(ss, sourceSheet, sourceTab, recordId, '', 'blocked_2026_reference', '內容含被封鎖嘅 2026 引用：' + blocked);
    logSyncRow_(ss, sourceSheet, sourceTab, recordId, 'rejected', '封鎖 2026 引用：' + blocked);
    return { result: 'rejected', source_record_id: recordId, error: 'blocked_2026_reference' };
  }

  // 配對鍵（matchFields 由路由提供；直接 upsert 用 business key，退而 source_record_id）
  let matchFields = opts.matchFields;
  if (!matchFields) {
    const hasBusinessKey = businessKeyParts.every(function (p) { return String(clean[p] || '') !== ''; });
    if (hasBusinessKey) matchFields = businessKeyParts;
    else if (fieldKeys.indexOf('source_record_id') >= 0 && recordId) matchFields = ['source_record_id'];
  }
  if (!matchFields || !matchFields.every(function (f) { return String(clean[f] || '') !== ''; })) {
    logFieldError_(ss, sourceSheet, sourceTab, recordId, businessKeyRaw, 'missing_match_key', '缺配對鍵（' + businessKeyRaw + '／source_record_id）');
    logSyncRow_(ss, sourceSheet, sourceTab, recordId, 'rejected', '缺配對鍵');
    return { result: 'rejected', source_record_id: recordId, error: 'missing_match_key' };
  }

  // 新增時補業務鍵（自動編號）
  const missingKeyPart = businessKeyParts.filter(function (p) { return String(clean[p] || '') === ''; });
  if (missingKeyPart.length && businessKeyParts.length === 1) {
    clean[businessKeyParts[0]] = autoId_(ss, tab, businessKeyParts[0]);
  }

  if (!String(clean.updated_at || '')) clean.updated_at = new Date().toISOString();
  const fields = fieldKeys.filter(function (k) { return clean[k] !== undefined && clean[k] !== ''; });

  // 讀現有分頁資料
  const sheet = ss.getSheetByName(tab);
  if (!sheet) throw new Error('Master sheet has no tab: ' + tab);
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(1, sheet.getLastColumn());
  const grid = lastRow >= MASTER_LAYOUT.header_row ? sheet.getRange(MASTER_LAYOUT.header_row, 1, lastRow - MASTER_LAYOUT.header_row + 1, lastCol).getValues() : [];
  const headers = (grid[0] || []).map(function (v) { return String(v || '').trim(); });
  const colOf = function (key) { return headers.indexOf(key); };

  // 尋找現有列
  let rowIndex = -1;
  for (let i = 1; i < grid.length; i++) {
    let matched = true;
    for (let m = 0; m < matchFields.length; m++) {
      const col = colOf(matchFields[m]);
      if (col < 0 || String(grid[i][col] || '').trim() !== String(clean[matchFields[m]]).trim()) { matched = false; break; }
    }
    if (matched) { rowIndex = i; break; }
  }

  let outcome;
  if (rowIndex < 0) {
    // insert：成行寫入（只寫合約欄位）
    const rowValues = headers.map(function (h) { return clean[h] !== undefined ? clean[h] : ''; });
    sheet.appendRow(rowValues);
    outcome = 'inserted';
  } else {
    // update：只改有值嘅欄位；有 change_reason 就逐欄寫 24_修正紀錄
    const changes = [];
    fields.forEach(function (f) {
      const col = colOf(f);
      if (col < 0) return;
      const oldVal = grid[rowIndex][col];
      const oldStr = oldVal instanceof Date ? oldVal.toISOString() : String(oldVal || '');
      const newStr = String(clean[f] === undefined ? '' : clean[f]);
      if (oldStr !== newStr) {
        if (opts.changeReason) {
          ensureLogSheet_(ss, '24_修正紀錄', ['change_id', 'entity_type', 'entity_id', 'field_key', 'old_value', 'new_value', 'change_reason', 'changed_by', 'changed_at', 'source_channel'])
            .appendRow(['CHG-' + Utilities.getUuid().slice(0, 8), tab, String(clean[matchFields[0]] || recordId), f, oldStr.slice(0, 300), newStr.slice(0, 300), opts.changeReason, opts.updatedBy, new Date().toISOString(), sourceSheet]);
        }
        sheet.getRange(rowIndex + MASTER_LAYOUT.header_row, col + 1).setValue(clean[f]);
        changes.push(f);
      }
    });
    outcome = 'updated';
    if (changes.length === 0) {
      logSyncRow_(ss, sourceSheet, sourceTab, recordId, 'no_change', '全部欄位與現值相同');
      return { result: 'no_change', source_record_id: recordId, match: matchFields.map(function (f) { return clean[f]; }) };
    }
  }
  logSyncRow_(ss, sourceSheet, sourceTab, recordId, outcome, '配對鍵=' + matchFields.join('+') + '：' + matchFields.map(function (f) { return clean[f]; }).join('/') + (opts.auditId ? '；audit=' + opts.auditId : ''));
  return { result: outcome, source_record_id: recordId, match: matchFields.map(function (f) { return clean[f]; }) };
}

function autoId_(ss, tab, key) {
  const prefixMap = {
    '10_組織': 'ORG', '11_人員': 'PRS', '12_邀請': 'INV', '13_報名': 'REG', '14_出席': 'ATT',
    '15_工作人員': 'STF', '16_當值安排': 'ASM', '17_攤位': 'BTH', '18_攤位人手': 'BST', '19_膳食': 'MEAL',
    '20_交通泊車': 'TRN', '21_典禮': 'CRM', '22_報到': 'CHK', '23_物資': 'SUP', '24_修正紀錄': 'CHG',
    '25_基本資訊': 'INF', '26_日程及地圖': 'SCH', '27_公告及求助': 'NTC', '90_代碼表': 'COD'
  };
  const prefix = prefixMap[tab] || 'ID';
  const sheet = ss.getSheetByName(tab);
  if (!sheet || sheet.getLastRow() < MASTER_LAYOUT.header_row + 1) return prefix + '-0001';
  const values = sheet.getDataRange().getValues();
  const headers = values[MASTER_LAYOUT.header_row - 1].map(function (v) { return String(v || '').trim(); });
  const col = headers.indexOf(key);
  let max = 0;
  if (col >= 0) {
    for (let r = MASTER_LAYOUT.header_row; r < values.length; r++) {
      const m = String(values[r][col] || '').match(new RegExp('^' + prefix + '-(\\d+)$'));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  }
  return prefix + '-' + String(max + 1).padStart(4, '0');
}

/* ── 8. 子SHEET 登記＋拉取同步 ─────────────────────────────────────────── */
function registryRows_(ss) {
  const sheet = ss.getSheetByName(ISD2027_REGISTRY_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function (v) { return String(v || '').trim(); });
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const obj = {};
    headers.forEach(function (h, c) { obj[h] = values[r][c]; });
    if (String(obj.kind || '')) rows.push(obj);
  }
  return rows;
}

function appendRegistryRow_(ss, entry) {
  ensureLogSheet_(ss, ISD2027_REGISTRY_SHEET, ['reg_id', 'registered_at', 'kind', 'name', 'drive_id_or_url', 'owner_group', 'template_code', 'note', 'registered_by', 'status'])
    .appendRow([
      'REG-' + Utilities.getUuid().slice(0, 8), new Date().toISOString(), entry.kind, entry.name,
      entry.drive_id_or_url, entry.owner_group || '', entry.template_code || '', String(entry.note || '').slice(0, 800),
      entry.registered_by || '', entry.status || 'active'
    ]);
}

function registerChildSheet_(data) {
  const idx = getConnectionIndex_();
  const templateCode = String(data.template_code || '');
  const spreadsheetId = String(data.spreadsheet_id || '');
  const ownerGroup = String(data.owner_group || '');
  const registeredBy = String(data.registered_by || data.updated_by || '');
  if (!templateCode) throw new Error('template_code is required (CS01–CS08)');
  if (!spreadsheetId || !/^[A-Za-z0-9_-]{20,}$/.test(spreadsheetId)) throw new Error('spreadsheet_id must be a Google Sheet ID');
  if (!ownerGroup) throw new Error('owner_group is required');
  if (!registeredBy) throw new Error('registered_by is required');
  const template = idx.child_sheet_templates.filter(function (t) { return t.template_code === templateCode; })[0];
  if (!template) throw new Error('Unknown template_code: ' + templateCode + '（可用：' + idx.child_sheet_templates.map(function (t) { return t.template_code; }).join('、') + '）');
  const ss = getMasterSheet_();
  appendRegistryRow_(ss, {
    kind: 'child_sheet', name: String(data.name || template.name + '（正式工作副本）'), drive_id_or_url: spreadsheetId,
    owner_group: ownerGroup, template_code: templateCode, note: data.note || '',
    registered_by: registeredBy, status: 'active'
  });
  auditUnified_('registerChildSheet', 'ok', templateCode, JSON.stringify({ spreadsheet_id: spreadsheetId, owner_group: ownerGroup }), registeredBy);
  return {
    success: true, event_id: ISD2027_EVENT_ID, template_code: templateCode, spreadsheet_id: spreadsheetId,
    tabs: template.tabs,
    routes: idx.child_sheet_routes.filter(function (r) { return r.template_code === templateCode; }),
    next: '用 pullChildSheet（指定 spreadsheet_id + tab）把子SHEET 分頁同步入主SHEET。'
  };
}

function pullChildSheet_(data) {
  const idx = getConnectionIndex_();
  const spreadsheetId = String(data.spreadsheet_id || '');
  const tab = String(data.tab || '');
  const registeredBy = String(data.registered_by || data.updated_by || '');
  if (!spreadsheetId) throw new Error('spreadsheet_id is required');
  if (!tab) throw new Error('tab is required（子SHEET 分頁名，例如 01_單位）');
  if (!registeredBy) throw new Error('registered_by is required');
  const templateCode = String(data.template_code || '');
  const routes = idx.child_sheet_routes.filter(function (r) { return r.tab === tab && (!templateCode || r.template_code === templateCode); });
  if (routes.length !== 1) throw new Error('route not unique for tab ' + tab + '（請加 template_code）');
  const route = routes[0];
  if (route.state !== 'route_ready') {
    const ss = getMasterSheet_();
    logFieldError_(ss, spreadsheetId, tab, '', '', 'route_pending_mapping', route.note || '路由欄位未對齊');
    throw new Error('此路由尚未接通（pending_field_mapping）：' + (route.note || ''));
  }
  const child = SpreadsheetApp.openById(spreadsheetId);
  const childSheet = child.getSheetByName(tab);
  if (!childSheet) throw new Error('Child sheet has no tab: ' + tab);
  const childLastRow = childSheet.getLastRow();
  if (childLastRow < MASTER_LAYOUT.header_row + 1) throw new Error('Child tab has no data rows');
  const childGrid = childSheet.getRange(MASTER_LAYOUT.header_row, 1, childLastRow - MASTER_LAYOUT.header_row + 1, Math.max(1, childSheet.getLastColumn())).getValues();
  const childHeaders = (childGrid[0] || []).map(function (v) { return String(v || '').trim(); }).filter(function (v) { return v; });

  // 分頁格式合約：欄位鍵名必須與路由 fixed_fields 完全一致（次序不限），絶不暗中改名
  const expected = route.fixed_fields;
  const missing = expected.filter(function (f) { return childHeaders.indexOf(f) < 0; });
  const extra = childHeaders.filter(function (f) { return expected.indexOf(f) < 0; });
  if (missing.length || extra.length) {
    const ss = getMasterSheet_();
    logFieldError_(ss, child.getName(), tab, '', missing[0] || extra[0], 'child_header_mismatch',
      '欄位與範本不一致：缺 ' + (missing.join('、') || '—') + '；多 ' + (extra.join('、') || '—'));
    auditUnified_('pullChildSheet', 'rejected', spreadsheetId + '/' + tab, 'header mismatch', registeredBy);
    throw new Error('子SHEET 欄位與範本不符：缺 ' + (missing.join('、') || '—') + '；多 ' + (extra.join('、') || '—') + '（不會暗中改名）');
  }

  const ss = getMasterSheet_();
  const perTabSummary = [];
  route.master_tabs.forEach(function (masterTab) {
    const def = masterTabDef_(masterTab);
    const matchFields = (route.match_fields && route.match_fields[masterTab]) || null;
    const childOnlyFields = expected.filter(function (f) { return def.field_keys.indexOf(f) < 0 && f !== 'template_version'; });
    let inserted = 0, updated = 0, rejected = 0, noChange = 0;
    for (let i = 1; i < childGrid.length; i++) {
      const row = {};
      let nonEmpty = false;
      childHeaders.forEach(function (h, c) {
        const v = childGrid[i][c];
        row[h] = v instanceof Date ? v.toISOString() : v;
        if (v !== '' && v !== null) nonEmpty = true;
      });
      if (!nonEmpty) continue;
      const res = upsertOneRow_(ss, def, row, {
        sourceSheet: child.getName(), sourceTab: tab, updatedBy: registeredBy,
        changeReason: '', auditId: String(data.audit_id || ''), matchFields: matchFields
      });
      if (res.result === 'inserted') inserted++;
      else if (res.result === 'updated') updated++;
      else if (res.result === 'rejected') rejected++;
      else noChange++;
    }
    perTabSummary.push({ master_tab: masterTab, match_fields: matchFields, inserted: inserted, updated: updated, rejected: rejected, no_change: noChange, skipped_child_only_fields: childOnlyFields });
  });
  auditUnified_('pullChildSheet', 'ok', spreadsheetId + '/' + tab, JSON.stringify(perTabSummary), registeredBy);
  return {
    success: true, event_id: ISD2027_EVENT_ID,
    child_sheet: child.getName(), tab: tab, route_id: route.route_id,
    rows_scanned: Math.max(0, childGrid.length - 1),
    per_master_tab: perTabSummary,
    note: '子表專欄（主SHEET 無此鍵）已略過並記錄；05_欄位錯誤 可查每列拒收原因。'
  };
}

/* ── 9. 延伸登記（＋2027 SHEET／SCRIPT 正式入口） ─────────────────────── */
function register2027Extension_(data) {
  const kind = String(data.kind || '');
  const name = String(data.name || '');
  const ref = String(data.drive_id_or_url || '');
  const registeredBy = String(data.registered_by || data.updated_by || '');
  const allowed = ['sheet', 'script', 'entry_route', 'endpoint', 'other'];
  if (allowed.indexOf(kind) < 0) throw new Error('kind must be one of: ' + allowed.join('、'));
  if (!name) throw new Error('name is required');
  if (!ref) throw new Error('drive_id_or_url is required');
  if (!registeredBy) throw new Error('registered_by is required');
  const ss = getMasterSheet_();
  appendRegistryRow_(ss, {
    kind: kind, name: name, drive_id_or_url: ref,
    owner_group: String(data.owner_group || ''), template_code: String(data.template_code || ''),
    note: String(data.note || ''), registered_by: registeredBy, status: 'active'
  });
  auditUnified_('register2027Extension', 'ok', kind + ':' + name, ref, registeredBy);
  return { success: true, event_id: ISD2027_EVENT_ID, kind: kind, name: name, note: '已登記於主SHEET「' + ISD2027_REGISTRY_SHEET + '」。' };
}

/* ── 10. 受控來源適配器（apps-script/Code2027.gs v1 規則） ─────────────── */
function get2027Registry_() {
  const registry = readJsonFile_(ISD2027_DRIVE_REGISTRY_FILE_ID);
  if (registry.event_id !== ISD2027_EVENT_ID || registry.status !== 'blank_framework_ready_not_live') throw new Error('Invalid 2027 Drive registry');
  if (!registry.framework_catalog || !registry.output_connection_registry || !registry.output_source_projection) throw new Error('2027 Drive registry is missing a controlled-source artifact');
  return registry;
}

function get2027Framework_() {
  const registry = get2027Registry_();
  const catalog = readJsonFile_(registry.framework_catalog.drive_file_id);
  const connections = readJsonFile_(registry.output_connection_registry.drive_file_id);
  if (catalog.event_id !== ISD2027_EVENT_ID || connections.event_id !== ISD2027_EVENT_ID) throw new Error('2027 framework event boundary failed');
  const sources = {};
  const domains = {};
  registry.domains.forEach(function (domain) {
    const data = readJsonFile_(domain.drive_file_id);
    if (data.event_id !== ISD2027_EVENT_ID || data.domain_id !== domain.id) throw new Error('Invalid source-domain file: ' + domain.id);
    domains[domain.id] = { config: domain, data: data };
    (data.records || []).forEach(function (record) {
      if (sources[record.source_id]) throw new Error('Duplicate 2027 source ID: ' + record.source_id);
      sources[record.source_id] = { domain_id: domain.id, record: record, domain: domains[domain.id] };
    });
  });
  if (Object.keys(sources).length !== catalog.source_count) throw new Error('2027 source count does not match the source catalogue');
  return { registry: registry, catalog: catalog, connections: connections, domains: domains, sources: sources };
}

function outputState2027_(record) {
  return record && record.publication_status === 'approved' && record.record_state === 'approved_2027_source' && Number(record.revision) > 0
    ? 'ready_to_render' : 'waiting_for_approved_2027_source';
}

function find2027CatalogSource_(framework, sourceId) {
  const source = (framework.catalog.sources || []).filter(function (row) { return row.source_id === sourceId; })[0];
  if (!source) throw new Error('Unknown 2027 source ID: ' + sourceId);
  return source;
}

function validIso2027_(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !isNaN(new Date(value).getTime());
}

function validate2027SourceChange_(data, framework, current, source) {
  if (!data.source_id || data.source_id !== current.source_id) throw new Error('Source ID mismatch');
  if (Number(data.expected_revision) !== Number(current.revision)) throw new Error('Revision conflict: refresh the canonical source before retrying');
  if (String(data.updated_by || '') !== String(current.owner_group || '')) throw new Error('Only the source owner group may update ' + current.source_id);
  if (!validIso2027_(data.updated_at)) throw new Error('updated_at must be an ISO timestamp');
  if (!String(data.audit_id || '').trim()) throw new Error('audit_id is required');
  if (String(data.publication_status || '') !== 'approved') throw new Error('Only approved 2027 source changes may be published');
  if (!data.payload || typeof data.payload !== 'object' || Array.isArray(data.payload)) throw new Error('payload must be an object');
  if (!Array.isArray(current.approved_by) || current.approved_by.indexOf(String(data.approved_by || '')) < 0) throw new Error('approved_by is not an established approval group for ' + current.source_id);
  if ((current.source_kind === 'structured_dataset' || current.source_kind === 'system_registry') && !Array.isArray(data.payload.records)) throw new Error(current.source_id + ' requires payload.records[]');
  const prohibited = forbidden2027Reference_(data.payload);
  if (prohibited) throw new Error('Blocked 2026/live reference in source payload: ' + prohibited);
  if (source.owner_group !== current.owner_group) throw new Error('Catalog/domain owner mismatch for ' + current.source_id);
}

function rebuild2027Projection_(framework) {
  const outputs = (framework.connections.outputs || []).map(function (output) {
    const primary = framework.sources[output.canonical_source_id];
    if (!primary) throw new Error('Output references unknown source: ' + output.output_id);
    const support = (output.supporting_source_ids || []).map(function (id) {
      if (!framework.sources[id]) throw new Error('Output references unknown supporting source: ' + id);
      return id;
    });
    return {
      output_id: output.output_id,
      final_output: output.final_output,
      canonical_source_id: primary.record.source_id,
      canonical_domain: primary.domain_id,
      source_file: primary.domain.config.file,
      source_revision: Number(primary.record.revision || 0),
      source_publication_status: primary.record.publication_status,
      state: outputState2027_(primary.record),
      supporting_source_ids: support
    };
  });
  return {
    schema_version: '2027-output-source-projection-v1',
    event_id: ISD2027_EVENT_ID,
    status: 'blank_framework_ready_not_live',
    rule: 'Pointers only: output endpoints resolve the current approved source record; no payload is duplicated here.',
    output_count: outputs.length,
    outputs: outputs
  };
}

function update2027Source_(data) {
  const framework = get2027Framework_();
  const located = framework.sources[String(data.source_id || '')];
  if (!located) throw new Error('Unknown 2027 source ID: ' + String(data.source_id || ''));
  const source = find2027CatalogSource_(framework, located.record.source_id);
  validate2027SourceChange_(data, framework, located.record, source);
  const domainFileId = located.domain.config.drive_file_id;
  const previousDomain = JSON.stringify(located.domain.data, null, 2) + '\n';
  const previousProjection = readJsonFile_(framework.registry.output_source_projection.drive_file_id);
  const previousRecord = JSON.parse(JSON.stringify(located.record));
  try {
    located.record.payload = data.payload;
    located.record.record_state = 'approved_2027_source';
    located.record.revision = Number(located.record.revision || 0) + 1;
    located.record.updated_by = data.updated_by;
    located.record.updated_at = data.updated_at;
    located.record.audit_id = data.audit_id;
    located.record.approval_record = { approved_by: data.approved_by, approved_at: data.updated_at };
    located.record.publication_status = 'approved';
    writeJsonFile_(domainFileId, located.domain.data);
    const projection = rebuild2027Projection_(framework);
    writeJsonFile_(framework.registry.output_source_projection.drive_file_id, projection);
    auditUnified_('update2027Source', 'approved', located.record.source_id,
      JSON.stringify({ revision_before: previousRecord.revision, revision_after: located.record.revision, domain_id: located.domain_id, approved_by: data.approved_by, audit_id: data.audit_id, outputs: (source.output_ids || []).length }),
      data.updated_by);
    return {
      success: true, event_id: ISD2027_EVENT_ID, source_id: located.record.source_id,
      domain_id: located.domain_id, revision: located.record.revision,
      affected_output_ids: source.output_ids || [], projection_output_count: projection.output_count
    };
  } catch (error) {
    DriveApp.getFileById(domainFileId).setContent(previousDomain);
    writeJsonFile_(framework.registry.output_source_projection.drive_file_id, previousProjection);
    auditUnified_('update2027Source', 'reverted', located.record.source_id, String(error), String(data.updated_by || ''));
    throw error;
  }
}

function get2027Output_(outputId) {
  const framework = get2027Framework_();
  const output = (framework.connections.outputs || []).filter(function (item) { return item.output_id === outputId; })[0];
  if (!output) throw new Error('Unknown 2027 output ID: ' + outputId);
  const primary = framework.sources[output.canonical_source_id];
  const ready = outputState2027_(primary.record);
  return {
    success: true,
    event_id: ISD2027_EVENT_ID,
    output_id: output.output_id,
    final_output: output.final_output,
    state: ready,
    canonical_source: {
      source_id: primary.record.source_id,
      domain_id: primary.domain_id,
      revision: primary.record.revision,
      publication_status: primary.record.publication_status
    },
    supporting_sources: (output.supporting_source_ids || []).map(function (id) {
      const support = framework.sources[id];
      return { source_id: id, domain_id: support.domain_id, revision: support.record.revision, publication_status: support.record.publication_status };
    }),
    payload: ready === 'ready_to_render' ? primary.record.payload : null
  };
}

/* ═══ 編輯器手動執行用 ═══
   initializeUnifiedBackend() — 首次部署（API key＋三個分頁＋索引重建）
   refreshUnifiedIndex()   — 索引 JSON 更新後重建 2027_資產索引（經 doPost 或改 data 直接行）
   ⚠ 本檔取代 apps-script/Code2027.gs v1（功能超集）；兩者不可同時貼入同一 project。 */
