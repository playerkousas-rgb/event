const fs = require('fs');

async function testFetch(){
  const url = 'https://docs.google.com/spreadsheets/d/1S1mNNjhcBY_IsMOYtI8sZLoKUht5yTdD7ICZUfJiBGE/gviz/tq?tqx=out:json&tq=&gid=0';
  const res = await fetch(url);
  const text = await res.text();
  const raw = text.replace(/^[/O_o]+?\s*\(/,'').replace(/\);?$/,'');
  const json = JSON.parse(raw);
  const rows = json.table.rows.map(r => (r.c || []).map(cell => cell ? cell.v : ''));
  console.log(rows.slice(0, 20));
}
testFetch();
