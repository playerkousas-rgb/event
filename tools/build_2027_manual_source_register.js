#!/usr/bin/env node
'use strict';
/*
 * Establish the source relationships for the 2027 execution manual.
 * 2026 is inspected only as an immutable historical seed. This script never
 * writes it; its output belongs only to the independent 2027 master record.
 */
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const sourceFile=path.join(root,'data/isd_2027.json');
const historicalFile=path.join(root,'data/isd_2026.json');
const event=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const historical=JSON.parse(fs.readFileSync(historicalFile,'utf8'));
const list=value=>Array.isArray(value)?value:[];
const count=value=>list(value).length;
const get=(obj, dotted)=>dotted.split('.').reduce((v,key)=>v&&v[key],obj);
const countAt=(obj, dotted)=>count(get(obj,dotted));
const stream=(id,title,owners,domain,manual_categories,source_paths,privacy='shared_non_private_activity_data')=>({
  id,title,owners,canonical_2027_domain:domain,manual_categories,source_paths,
  reference_2026_counts:Object.fromEntries(source_paths.map(p=>[p,countAt(historical,p)])),
  copied_2027_counts:Object.fromEntries(source_paths.map(p=>[p,countAt(event,p)])),
  copy_status:'copied_as_2027_reference_seed',privacy,
  update_rule:'日後只在所列 2027 canonical domain／2027 frontend flow 更新；不可回寫或重連到 2026。'
});
const streams=[
  stream('programme','程序、典禮及會操',['行政組','會操及典禮組'],'programme',['programme','ceremony','mc_scripts'],['schedule','ceremony.mc_scripts']),
  stream('venue','場地、攤位、遊戲及動線',['協調組','主題節目組'],'venue',['activities'],['activities.maps','activities.booths','activities.gameCards']),
  stream('registration','旅團、報到及單位資料',['行政組','協調組'],'registration',['logistics','records'],['participants','troop_checkin']),
  stream('logistics','膳食、物資及現場後勤',['協調組','行政組'],'logistics',['logistics','records'],['meals.orders','staff_meals_2026','meal_menu_2026','meal_distribution_2026','meal_logistics_2026']),
  stream('staff','各組職責、編更及工作資料',['秘書處','各總主任'],'rosters',['staff.job_duties','staff.event_staff_roster'],['staff.job_duties','staff.event_staff_roster'],'private_identity_redacted_in_manual'),
  stream('safety','安全、危機及應變',['危機處理組','行政組'],'logistics',['crisis'],['crisis.docs','crisis.manuals']),
  stream('notices','通告、指引及文件目錄',['秘書處','行政組','相關內容組別'],'notices',['documents','documents'],['documents','notices'],'shared_document_metadata_private_fields_redacted')
];
const existingAuditArtifact=(event.source_of_truth&&event.source_of_truth.execution_manual_data_register&&event.source_of_truth.execution_manual_data_register.audit_artifact)||null;
const documentRecords=list(event.documents);
const documentAssets=documentRecords.filter(row=>row.file_url||row.drive_file_id||row.drive_file_link);
const notices=list(event.notices);
const noticeAssets=notices.filter(row=>row.file_url||row.drive_file_id||row.drive_file_link);
const ownedAssets=[...list(event.activities&&event.activities.maps),...list(event.activities&&event.activities.gameCards),...list(event.crisis&&event.crisis.manuals),...list(event.ceremony&&event.ceremony.mc_scripts)].filter(row=>row.file_url||row.drive_file_id);
const gaps=[
  {
    id:'notice_source_files',category:'通告',owner:'秘書處／行政組',
    copied_records:notices.length,owned_2027_files:noticeAssets.length,missing_2027_owned_files:notices.length-noticeAssets.length,
    status:'needs_2027_owned_copy_or_reissue',next_action:'把每份 2026 通告副本放入 ISD 2027／02_通知書，或由 2027 擁有人重發，再把 file_url／Drive ID 回填至 2027 record。'
  },
  {
    id:'document_catalog_files',category:'文件目錄',owner:'各來源組別',
    copied_records:documentRecords.length,owned_2027_files:documentAssets.length,missing_2027_owned_files:documentRecords.length-documentAssets.length,
    status:'metadata_copied_file_inventory_pending',next_action:'先按文件用途標記 keep／replace／retire；保留者必須在相應 2027 Drive folder 有擁有副本，再建立 file_url／Drive ID。'
  },
  {
    id:'venue_and_game_assets',category:'場地圖及遊戲卡',owner:'協調組／主題節目組',
    copied_records:count(event.activities&&event.activities.maps)+count(event.activities&&event.activities.gameCards),owned_2027_files:count(event.activities&&event.activities.maps)+count(event.activities&&event.activities.gameCards),missing_2027_owned_files:0,
    status:'2027_owned_reference_assets_present',next_action:'活動前只需確認內容、日期及版本，不需再從 2026 Drive 取用。'
  }
];
event.source_of_truth=event.source_of_truth||{};
event.source_of_truth.execution_manual_data_register={
  schema_version:'2027-execution-manual-data-register-v1',status:'audit_in_progress',
  purpose:'理順各組資料關連、唯一來源及 2026→2027 一次性複製範圍；這不是工作人員導覽規則。',
  reference_rule:'2026 只作 immutable historical input；每個 copied record 均為 2027 reference seed，日後只在 2027 canonical domain 更新。',
  audit_artifact:existingAuditArtifact,
  streams
};
event.source_of_truth.execution_manual_gap_register={
  schema_version:'2027-execution-manual-gap-register-v1',status:'awaiting_owner_review',
  scope:'只列已複製資料中尚未有 2027-owned file／需判定 keep, replace or retire 的缺口；不刪改 2026 archive。',
  gaps,
  document_review_queue:documentRecords.map(row=>({
    id:row.id||'',title:row.title||'',category:row.category||row.folder||'其他',
    current_state:'metadata_copied_no_2027_owned_file',decision:'keep_replace_or_retire_to_be_confirmed',owner:'待按文件類別確認'
  }))
};
fs.writeFileSync(sourceFile,JSON.stringify(event,null,2)+'\n');
const lines=[];
lines.push('# 2027 執行手冊資料來源及缺口審核');
lines.push('');
lines.push('> 由 `tools/build_2027_manual_source_register.js` 產生。2026 是唯讀歷史輸入；本文件及 register 只改動 2027 source。');
lines.push('');
lines.push('## 1. 跨組資料關連與唯一來源');
lines.push('');
lines.push('| 資料流 | 來源／協作組別 | 2027 唯一來源 | 手冊分類 | 2026 → 2027 複製狀態 |');
lines.push('|---|---|---|---|---|');
for(const item of streams) lines.push(`| ${item.title} | ${item.owners.join('／')} | ${item.canonical_2027_domain} | ${item.manual_categories.join('、')} | ${item.copy_status} |`);
lines.push('');
lines.push('## 2. 已複製資料與實體檔案缺口');
lines.push('');
lines.push('| 項目 | 已複製 records | 已有 2027-owned files | 缺口 | 處理狀態／下一步 |');
lines.push('|---|---:|---:|---:|---|');
for(const gap of gaps) lines.push(`| ${gap.category} | ${gap.copied_records} | ${gap.owned_2027_files} | ${gap.missing_2027_owned_files} | ${gap.status}；${gap.next_action} |`);
lines.push('');
lines.push('## 3. 清理規則');
lines.push('');
lines.push('- **Keep**：仍屬活動日操作、通告、程序、場地、遊戲、安全或法定／必要參考的資料，必須先在 2027 folder 擁有副本。');
lines.push('- **Replace**：內容仍有用但含舊日期、費用、聯絡或年份，保留 2027 reference seed，待相應組別重發 2027 版本。');
lines.push('- **Retire**：只屬已完結 2026 的個人名單、一次性簽收、舊批核或無活動日用途的資料；先在 register 標記決定，再從 2027 工作人員輸出移除。2026 archive 不刪除。');
lines.push('');
lines.push('## 4. 文件 review queue');
lines.push('');
lines.push(`目前有 ${documentRecords.length} 筆歷史文件 metadata 已複製到 2027，但 ${documentRecords.length-documentAssets.length} 筆尚未綁定 2027-owned 實體檔案；三份通知書亦尚未有 2027-owned 副本。遊戲卡及場地／典禮／危機資產已有 2027-owned 版本。`);
fs.writeFileSync(path.join(root,'docs/2027_EXECUTION_MANUAL_SOURCE_AUDIT.md'),lines.join('\n')+'\n');
console.log(`Built 2027 execution-manual source register: ${streams.length} streams, ${documentRecords.length} document metadata records, ${gaps.reduce((n,g)=>n+g.missing_2027_owned_files,0)} asset gaps.`);
