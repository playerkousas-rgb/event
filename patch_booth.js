const fs = require('fs');
const file = './data/isd_2026.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.activities.booth_source = {
  mode: "drive_sheet",
  name: "ISD2026 攤位資料 (主題節目組)",
  drive_file_id: "1Po1UGjl1E3Q6HWlYlFqnE_tcXjblmFle",
  sheet_id: "1Po1UGjl1E3Q6HWlYlFqnE_tcXjblmFle",
  gid: 0,
  folder: "主題節目組",
  note: "2026 攤位資料 xlsx"
};
fs.writeFileSync(file, JSON.stringify(data, null, 2));
