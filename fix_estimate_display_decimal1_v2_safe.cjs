const fs=require('fs');
const p='./src/MCrossEstimateSheet.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_ESTIMATE_DISPLAY_DECIMAL1_V2_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const old="<input type='number' min='0' step='0.01' value={row.quantity} onChange={e=>edit(row.id,'quantity',e.target.value)}/>";
const neu="<input type='number' min='0' step='0.1' value={String(row.unit||'').trim()==='m'?Math.round((Number(row.quantity)||0)*10)/10:row.quantity} onChange={e=>edit(row.id,'quantity',e.target.value)}/>";
const n=s.split(old).length-1;
if(n!==1){console.error('ERROR: 数量入力欄 MATCH='+n+'。変更していません。');process.exit(1)}
fs.copyFileSync(p,'./src/MCrossEstimateSheet.before_display_decimal1_v2.jsx');
s=s.replace(old,neu);
const anchor="/* M-CROSS_ESTIMATE_M_DECIMAL1_ONLY_V1_SAFE */";
if(s.includes(anchor))s=s.replace(anchor,anchor+'\n/* '+mark+' */'); else s='/* '+mark+' */\n'+s;
fs.writeFileSync(p,s,'utf8');
console.log('OK: 見積表のm数量を表示時にも必ず小数1桁へ統一しました。CSSは変更していません。');
