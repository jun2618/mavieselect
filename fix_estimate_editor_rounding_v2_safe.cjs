const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_ESTIMATE_EDITOR_ROUNDING_V2_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const edits=[
 ["quantity: edit.quantity != null ? String(edit.quantity) : (Number.isFinite(Number(row.quantity)) ? String(Math.round((Number(row.quantity) + Number.EPSILON) * 100) / 100) : ''),","quantity: edit.quantity != null ? String(Math.round((Number(edit.quantity)||0)*100)/100) : (Number.isFinite(Number(row.quantity)) ? String(Math.round((Number(row.quantity) + Number.EPSILON) * 100) / 100) : ''),"],
 ["rate: String(edit.rate ?? row.rate ?? ''),","rate: (edit.rate ?? row.rate ?? '') === '' ? '' : String(Math.round(Number(edit.rate ?? row.rate) || 0)),"],
 ["                      const quantity = parseNumber(form.quantity)","                      /* "+mark+" */\n                      const parsedQuantity = parseNumber(form.quantity)\n                      const quantity = parsedQuantity === '' || parsedQuantity === null ? parsedQuantity : Math.round(parsedQuantity * 100) / 100"],
 ["                      const rate = parseNumber(form.rate)","                      const parsedRate = parseNumber(form.rate)\n                      const rate = parsedRate === '' || parsedRate === null ? parsedRate : Math.round(parsedRate)"]
];
for(const [oldValue,newValue] of edits){const n=s.split(oldValue).length-1;if(n!==1){console.error('ERROR: '+oldValue.trim().slice(0,55)+' MATCH='+n+'。変更していません。');process.exit(1)}s=s.replace(oldValue,newValue)}
fs.copyFileSync(p,'./src/App.before_estimate_editor_rounding_v2.jsx');
fs.writeFileSync(p,s,'utf8');
console.log('OK: 見積編集の数量を最大2桁、単価を整数に統一しました。');
