// ============================================================
// ISD 2027 — controlled source / output publish adapter (v1)
//
// Deploy this file as a NEW standalone Apps Script bound to a NEW 2027 Audit
// Sheet. Do not paste it into the 2026 backend project. It operates only on
// the verified blank-framework JSON files in the ISD 2027 Drive root.
//
// Initial editor-only setup:
//   1. Create a new Google Sheet named “ISD 2027 — Audit Log”.
//   2. Open Extensions → Apps Script; replace Code.gs with this file.
//   3. Run initialize2027Backend() once and keep the returned API key secret.
//   4. Deploy as Web App; keep its URL/key in a restricted admin/server-side setting, never browser config.
// ============================================================

const ISD2027_VERSION = '2027-blank-framework-publish-v1';
const ISD2027_EVENT_ID = 'isd_2027';
const ISD2027_DRIVE_REGISTRY_FILE_ID = '1mUiVpt-DIvCLHZnySt-sruhnfQBIqGcR';
const ISD2027_AUDIT_SHEET = '2027_Audit_Log';
const ISD2027_BLOCKED_REFERENCES = ['data/isd_2026.json', 'ISD2026_GAS_URL', 'event_id=isd_2026'];

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || 'get2027Health');
  try {
    if (action === 'get2027Health') return json2027_({ success: true, version: ISD2027_VERSION, event_id: ISD2027_EVENT_ID, configured: !!get2027ApiKey_() });
    if (action === 'get2027Output') {
      const data = (e && e.parameter) || {};
      verify2027Request_(data);
      return json2027_(get2027Output_(String(data.output_id || '')));
    }
    return json2027_({ success: false, error: 'Unknown 2027 action: ' + action });
  } catch (error) {
    return json2027_({ success: false, error: String(error) });
  }
}

function doPost(e) {
  let data = {};
  try {
    data = parse2027Request_(e);
    const action = String(data.action || '');
    verify2027Request_(data);
    if (action === 'update2027Source') return json2027_(update2027Source_(data));
    if (action === 'get2027Output') return json2027_(get2027Output_(String(data.output_id || '')));
    if (action === 'get2027Health') return json2027_({ success: true, version: ISD2027_VERSION, event_id: ISD2027_EVENT_ID, configured: true });
    return json2027_({ success: false, error: 'Unknown 2027 action: ' + action });
  } catch (error) {
    return json2027_({ success: false, error: String(error) });
  }
}

// Run this only in the Apps Script editor. Its returned API key is not exposed
// by doGet/doPost and must be placed in the deployment environment securely.
function initialize2027Backend() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('ISD2027_APIKEY');
  if (!key) {
    key = 'isd2027_' + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('ISD2027_APIKEY', key);
  }
  ensure2027AuditSheet_();
  return {
    success: true,
    event_id: ISD2027_EVENT_ID,
    version: ISD2027_VERSION,
    api_key: key,
    next: 'Deploy as a new Web App, then set ISD2027_GAS_URL and ISD2027_APIKEY. Do not use a 2026 endpoint.'
  };
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
  if (String(data.event_id || '') !== ISD2027_EVENT_ID) throw new Error('2027 endpoint only accepts event_id=isd_2027');
  const key = get2027ApiKey_();
  if (!key) throw new Error('2027 backend is not initialized');
  if (String(data.api_key || '') !== key) throw new Error('Unauthorized 2027 API key');
}

function json2027_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function read2027JsonFile_(fileId) {
  return JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8'));
}

function write2027JsonFile_(fileId, value) {
  DriveApp.getFileById(fileId).setContent(JSON.stringify(value, null, 2) + '\n');
}

function get2027Registry_() {
  const registry = read2027JsonFile_(ISD2027_DRIVE_REGISTRY_FILE_ID);
  if (registry.event_id !== ISD2027_EVENT_ID || registry.status !== 'blank_framework_ready_not_live') throw new Error('Invalid 2027 Drive registry');
  if (!registry.framework_catalog || !registry.output_connection_registry || !registry.output_source_projection) throw new Error('2027 Drive registry is missing a controlled-source artifact');
  return registry;
}

function get2027Framework_() {
  const registry = get2027Registry_();
  const catalog = read2027JsonFile_(registry.framework_catalog.drive_file_id);
  const connections = read2027JsonFile_(registry.output_connection_registry.drive_file_id);
  if (catalog.event_id !== ISD2027_EVENT_ID || connections.event_id !== ISD2027_EVENT_ID) throw new Error('2027 framework event boundary failed');
  const sources = {};
  const domains = {};
  registry.domains.forEach(function (domain) {
    const data = read2027JsonFile_(domain.drive_file_id);
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

function forbidden2027Reference_(payload) {
  const text = JSON.stringify(payload || {});
  for (let i = 0; i < ISD2027_BLOCKED_REFERENCES.length; i++) {
    if (text.indexOf(ISD2027_BLOCKED_REFERENCES[i]) >= 0) return ISD2027_BLOCKED_REFERENCES[i];
  }
  return '';
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
  const previousProjection = read2027JsonFile_(framework.registry.output_source_projection.drive_file_id);
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
    write2027JsonFile_(domainFileId, located.domain.data);
    const projection = rebuild2027Projection_(framework);
    write2027JsonFile_(framework.registry.output_source_projection.drive_file_id, projection);
    append2027Audit_({
      outcome: 'approved', source_id: located.record.source_id, domain_id: located.domain_id,
      revision_before: previousRecord.revision, revision_after: located.record.revision,
      updated_by: data.updated_by, approved_by: data.approved_by, audit_id: data.audit_id,
      updated_at: data.updated_at, output_count: (source.output_ids || []).length, error: ''
    });
    return {
      success: true, event_id: ISD2027_EVENT_ID, source_id: located.record.source_id,
      domain_id: located.domain_id, revision: located.record.revision,
      affected_output_ids: source.output_ids || [], projection_output_count: projection.output_count
    };
  } catch (error) {
    // Source and pointer projection must move together. Restore both files if
    // a Drive write or audit action fails after the source content was touched.
    DriveApp.getFileById(domainFileId).setContent(previousDomain);
    write2027JsonFile_(framework.registry.output_source_projection.drive_file_id, previousProjection);
    append2027Audit_({
      outcome: 'reverted', source_id: located.record.source_id, domain_id: located.domain_id,
      revision_before: previousRecord.revision, revision_after: previousRecord.revision,
      updated_by: String(data.updated_by || ''), approved_by: String(data.approved_by || ''), audit_id: String(data.audit_id || ''),
      updated_at: new Date().toISOString(), output_count: 0, error: String(error)
    });
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
    // Only an approved source is returned; no output-side persistence occurs.
    payload: ready === 'ready_to_render' ? primary.record.payload : null
  };
}

function ensure2027AuditSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ISD2027_AUDIT_SHEET);
  if (!sheet) sheet = ss.insertSheet(ISD2027_AUDIT_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['logged_at', 'outcome', 'event_id', 'source_id', 'domain_id', 'revision_before', 'revision_after', 'updated_by', 'approved_by', 'audit_id', 'updated_at', 'affected_output_count', 'error']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function append2027Audit_(entry) {
  ensure2027AuditSheet_().appendRow([
    new Date().toISOString(), entry.outcome, ISD2027_EVENT_ID, entry.source_id, entry.domain_id,
    entry.revision_before, entry.revision_after, entry.updated_by, entry.approved_by,
    entry.audit_id, entry.updated_at, entry.output_count, entry.error
  ]);
}
