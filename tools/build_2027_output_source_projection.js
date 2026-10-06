#!/usr/bin/env node
'use strict';
/* Build a payload-free output routing index from the current 2027 source layer. */
const fs=require('fs');
const path=require('path');
const {loadFramework,sourceProjection}=require('./lib/controlled_2027_sources.js');
const root=path.resolve(__dirname,'..');
const projection=sourceProjection(loadFramework(root));
const target=path.join(root,'data/2027_output_source_projection.json');
fs.writeFileSync(target,JSON.stringify(projection,null,2)+'\n');
console.log(`Built ${projection.output_count} output source pointers → data/2027_output_source_projection.json`);
