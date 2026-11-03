const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_ESTIMATE_EDITOR_ROUNDING_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const changes=[
 ["quantity: String(row.quantity ?? ''),","quantity: row.quantity===''?'':String(Math.round((Number(row.quantity)||0)*100)/100),"],
 ["rate: String(row.rate ?? ''),","rate: row.rate===''?'':String(Math.round(Number(row.rate)||0)),"],
 ["quantity: edit.quantity != null ? String(edit.quantity) : (Number.isFinite(Number(row.quantity)) ? String(Math.round((Number(row.quantity) + Number.EPSILON) * 100) / 100) : ''),","quantity: edit.quantity != null ? String(Math.round((Number(edit.quantity)||0)*100)/100) : (Number.isFinite(Number(row.quantity)) ? String(Math.round((Number(row.quantity) + Number.EPSILON) * 100) / 100) : ''),"],
 ["rate: String(edit.rate ?? row.rate ?? ''),","rate: (edit.rate ?? row.rate ?? '')===''?'':String(Math.round(Number(edit.rate ?? row.rate)||0)),"]
];
for(const [oldValue,newValue] of changes){const n=s.split(oldValue).length-1;if(n!==1){console.error('ERROR: '+oldValue.slice(0,45)+' MATCH='+n+'。変更していません。');process.exit(1)}s=s.replace(oldValue,newValue)}
const parseOld="const quantity = parseNumber(form.quantity)\n                      const rate = parseNumber(form.rate)";
const parseNew="/* "+mark+" */\n                      const parsedQuantity = parseNumber(form.quantity)\n                      const parsedRate = parseNumber(form.rate)\n                      const quantity = parsedQuantity===''||parsedQuantity===null?parsedQuantity:Math.round(parsedQuantity*100)/100\n                      const rate = parsedRate===''||parsedRate===null?parsedRate:Math.round(parsedRate)";
const pn=s.split(parseOld).length-1;if(pn!==1){console.error('ERROR: 保存時丸め位置 MATCH='+pn+'。変更していません。');process.exit(1)}s=s.replace(parseOld,parseNew);
fs.copyFileSync(p,'./src/App.before_estimate_editor_rounding_v1.jsx');
fs.writeFileSync(p,s,'utf8');
console.log('OK: 見積明細編集の数量を最大2桁、単価を整数に統一しました。');
