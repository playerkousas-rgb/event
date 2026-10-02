#!/usr/bin/env node
/* Lightweight, dependency-free guardrail for this static app.
 * It deliberately validates rather than rewrites source files.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
const required = ['index.html', 'assets/tailwind.css', 'js/00-config.js', 'js/90-bootstrap.js', 'api/config.js', 'vercel.json'];
const errors = [];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`missing runtime file: ${file}`);
const jsDir = path.join(root, 'js');
for (const file of fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort()) {
  try { cp.execFileSync(process.execPath, ['--check', path.join(jsDir, file)], { stdio: 'ignore' }); }
  catch { errors.push(`JavaScript syntax error: js/${file}`); }
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  const asset = match[1].split('?')[0];
  if (/^(https?:|#|mailto:|data:|javascript:)/i.test(asset)) continue;
  if (!fs.existsSync(path.join(root, asset))) errors.push(`broken local reference: ${asset}`);
}
for (const name of ['.bak', '.tmp', '.old']) {
  const found = []; const walk = d => { for (const f of fs.readdirSync(d, {withFileTypes:true})) { if (f.name === '.git' || f.name === 'node_modules') continue; const p=path.join(d,f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith(name)) found.push(path.relative(root,p)); } };
  walk(root); if (found.length) errors.push(`forbidden temporary files: ${found.join(', ')}`);
}
if (errors.length) { console.error(errors.map(e => `✖ ${e}`).join('\n')); process.exit(1); }
console.log('✓ runtime files, local references and JavaScript syntax verified');
console.log('✓ no build dependencies required; Vercel serves the static root directly');
