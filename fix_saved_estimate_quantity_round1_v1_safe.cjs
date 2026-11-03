const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_SAVED_ESTIMATE_QUANTITY_ROUND1_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const old="    const quantity = edit.quantity === '' ? '' : Math.max(0, Number(edit.quantity) || 0)";
const neu="    /* "+mark+" */\n    const rawEditedQuantity = edit.quantity === '' ? '' : Math.max(0, Number(edit.quantity) || 0)\n    const quantity = rawEditedQuantity === '' ? '' : (['cross','cf'].includes(row.category) ? Math.round(rawEditedQuantity * 10) / 10 : rawEditedQuantity)";
const count=s.split(old).length-1;
if(count!==1){console.error('ERROR: applyEstimateEdits数量位置 MATCH='+count+'。変更していません。');process.exit(1)}
fs.copyFileSync(p,'./src/App.before_saved_estimate_quantity_round1_v1.jsx');
s=s.replace(old,neu);
fs.writeFileSync(p,s,'utf8');
console.log('OK: 保存済み見積編集のクロス・CF数量も小数1桁に統一しました。');
