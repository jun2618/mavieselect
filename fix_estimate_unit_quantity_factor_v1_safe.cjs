const fs=require('fs');
const app='./src/App.jsx';
const sheet='./src/MCrossEstimateSheet.jsx';
let a=fs.readFileSync(app,'utf8');
let s=fs.readFileSync(sheet,'utf8');
const mark='M-CROSS_ESTIMATE_UNIT_QUANTITY_FACTOR_V1_SAFE';
if(a.includes(mark)||s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
function replaceExact(text,oldValue,newValue,label,expected=1){
 const count=text.split(oldValue).length-1;
 if(count!==expected){console.error(`ERROR: ${label} MATCH=${count}。変更していません。`);process.exit(1)}
 return text.replace(oldValue,newValue);
}
// Customer estimate: cross and CF use metres, while retaining current quantity calculations.
const unitNeedle="unit: '㎡',";
const unitCount=a.split(unitNeedle).length-1;
if(unitCount!==2){console.error(`ERROR: 見積単位 MATCH=${unitCount}。変更していません。`);process.exit(1)}
a=a.split(unitNeedle).join("unit: 'm',");
// Contractor order: default to 0.90 for cross/CF, other categories stay 1.00.
a=replaceExact(a,"                        factor: 1,","                        /* "+mark+" */\n                        factor: ['cross','cf'].includes(row.category) ? 0.9 : 1,",'発注掛率');
a=replaceExact(a,"                        orderQuantity: Math.round(Number(row.quantity || 0) * 10) / 10,","                        orderQuantity: Math.round(Number(row.quantity || 0) * (['cross','cf'].includes(row.category) ? 0.9 : 1) * 100) / 100,",'発注数量');
// Existing locally saved estimate rows: normalize quantity to max 2 decimals and estimate rate to integer.
const loadOld="return Array.isArray(saved?.rows)?saved.rows:[]";
const loadNew="return Array.isArray(saved?.rows)?saved.rows.map(row=>({...row,quantity:row.quantity===''?'':Math.round((Number(row.quantity)||0)*100)/100,rate:row.rate===''?'':Math.round(Number(row.rate)||0)})):[]";
s=replaceExact(s,loadOld,loadNew,'保存済み見積の丸め');
// Newly imported estimate rows: prevent floating-point tails from entering editable estimate data.
const importQty="quantity:Number(row.quantity)||0,unit:String(row.unit||''),rate:row.rate===''||row.rate==null?'':Number(row.rate)||0";
const importQtyNew="quantity:Math.round((Number(row.quantity)||0)*100)/100,unit:String(row.unit||''),rate:row.rate===''||row.rate==null?'':Math.round(Number(row.rate)||0)";
s=replaceExact(s,importQty,importQtyNew,'取込数量単価の丸め');
s=s.replace("import './MCrossEstimateSheet.css'","import './MCrossEstimateSheet.css'\n/* "+mark+" */");
fs.copyFileSync(app,'./src/App.before_estimate_unit_quantity_factor_v1.jsx');
fs.copyFileSync(sheet,'./src/MCrossEstimateSheet.before_estimate_unit_quantity_factor_v1.jsx');
fs.writeFileSync(app,a,'utf8');
fs.writeFileSync(sheet,s,'utf8');
console.log('OK: 見積のクロス・CFをm表示、数量を最大2桁、単価を整数、職人発注を標準0.90へ戻しました。');
