const fs=require('fs');
const p='./src/MCrossEstimateSheet.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_ESTIMATE_DECIMAL1_BY_WORKTYPE_V3_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const old="return Array.isArray(saved?.rows)?saved.rows.map(row=>({...row,quantity:row.quantity===''?'':(String(row.unit||'').trim()==='m'?Math.round((Number(row.quantity)||0)*10)/10:Math.round((Number(row.quantity)||0)*100)/100),rate:row.rate===''?'':Math.round(Number(row.rate)||0)})):[]";
const neu="return Array.isArray(saved?.rows)?saved.rows.map(row=>{const text=String(row.name||row.label||'');const linear=String(row.unit||'').trim()==='m'||/クロス|CF貼/.test(text);return {...row,quantity:row.quantity===''?'':(linear?Math.round((Number(row.quantity)||0)*10)/10:Math.round((Number(row.quantity)||0)*100)/100),rate:row.rate===''?'':Math.round(Number(row.rate)||0)}}):[]";
const n=s.split(old).length-1;
if(n!==1){console.error('ERROR: 保存済み数量処理 MATCH='+n+'。変更していません。');process.exit(1)}
const displayOld="value={String(row.unit||'').trim()==='m'?Math.round((Number(row.quantity)||0)*10)/10:row.quantity}";
const displayNew="value={(String(row.unit||'').trim()==='m'||/クロス|CF貼/.test(String(row.name||'')))?Math.round((Number(row.quantity)||0)*10)/10:row.quantity}";
const d=s.split(displayOld).length-1;
if(d!==1){console.error('ERROR: 数量表示処理 MATCH='+d+'。変更していません。');process.exit(1)}
fs.copyFileSync(p,'./src/MCrossEstimateSheet.before_decimal1_by_worktype_v3.jsx');
s=s.replace(old,neu).replace(displayOld,displayNew);
s=s.replace('/* M-CROSS_ESTIMATE_DISPLAY_DECIMAL1_V2_SAFE */','/* M-CROSS_ESTIMATE_DISPLAY_DECIMAL1_V2_SAFE */\n/* '+mark+' */');
fs.writeFileSync(p,s,'utf8');
console.log('OK: 旧データの単位表記に依存せず、クロス・CF見積を小数1桁へ統一しました。');
