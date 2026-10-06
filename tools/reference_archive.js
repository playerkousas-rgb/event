#!/usr/bin/env node
'use strict';
/* Shared reader for completed-event reference data.
   Consumers may read the archive only after its committed checksum is verified. */
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');

function sha256(buffer){ return crypto.createHash('sha256').update(buffer).digest('hex'); }

function readReferenceArchive(root, eventId='isd_2026'){
  const lockPath=path.join(root,'data','2026_reference_lock.json');
  const lock=JSON.parse(fs.readFileSync(lockPath,'utf8'));
  if(lock.reference_event_id!==eventId || lock.status!=='archived_read_only')
    throw new Error(`Reference archive lock is invalid for ${eventId}`);
  const rel=String(lock.reference_file||'');
  if(!rel || path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..'))
    throw new Error(`Reference archive path is invalid: ${rel}`);
  const file=path.join(root,rel);
  const raw=fs.readFileSync(file);
  const actual=sha256(raw);
  if(actual!==lock.sha256)
    throw new Error(`${eventId} reference checksum mismatch (${actual}); do not regenerate products until the archived source is reviewed and explicitly recovered.`);
  return {data:JSON.parse(raw.toString('utf8')),lock,file};
}

module.exports={readReferenceArchive,sha256};
