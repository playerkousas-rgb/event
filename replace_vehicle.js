const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace "app.openModule('supplies'); setTimeout(()=>app.switchSuppliesTab('vehicle'),300)" with "app.openModule('parking')"
html = html.replace(/app\.openModule\('supplies'\);\s*setTimeout\(\(\)=>app\.switchSuppliesTab\('vehicle'\),\s*300\)/g, "app.openModule('parking')");
html = html.replace(/app\.openModule\('supplies'\);\s*setTimeout\(\(\)=>app\.switchSuppliesTab\('vehicle'\),\s*60\)/g, "app.openModule('parking')");

// Remove vehicle tab buttons and divs from renderSuppliesModule
html = html.replace(/<button onclick="app\.switchSuppliesTab\('vehicle'\)".*?<\/button>/g, '');
html = html.replace(/<div id="supplies-tab-vehicle".*?<\/div>/g, '');

// From module-actions in supplies, remove the vehicle button
html = html.replace(/\$\{canSubmit\?`<button onclick="app\.openVehiclePassForm.*?<\/button>`:''\}/g, '');

fs.writeFileSync('index.html', html, 'utf8');
