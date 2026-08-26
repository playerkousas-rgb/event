const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace("const deadline=document.getElementById('vehicle-deadline')?.value||'';", "");
html = html.replace("if(!plate||!driver_name||!driver_contact||!purpose||!group_name||!entry_date||!deadline){ showToast('請填寫車牌、司機、聯絡、用途、組別、進場日期、截止日期','error'); return; }", "if(!plate||!driver_name||!driver_contact||!purpose||!group_name||!entry_date){ showToast('請填寫車牌、司機、聯絡、用途、組別、進場日期','error'); return; }");
html = html.replace("entry_date,exit_date,deadline,parking_location", "entry_date,exit_date,parking_location");
fs.writeFileSync('index.html', html, 'utf8');
