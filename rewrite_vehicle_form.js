const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// remove vehicle-deadline
html = html.replace(/<div><label class="text-\[11px\] font-bold">截止日期 \(列明\) \*<\/label><input type="datetime-local" id="vehicle-deadline" value="\$\{existing\?\.deadline\|\|''\}" required class="w-full px-3 py-2 border rounded-xl text-sm mt-1"><\/div>/, '');

fs.writeFileSync('index.html', html, 'utf8');
