const fs=require('fs');
const p='./src/MCrossEstimateSheet.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_ESTIMATE_M_DECIMAL1_ONLY_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const backup='./src/MCrossEstimateSheet.before_m_decimal1_only_v1.jsx';
const roundExpr="(String(row.unit||'').trim()==='m'?Math.round((Number(row.quantity)||0)*10)/10:Math.round((Number(row.quantity)||0)*100)/100)";
let changes=0;
// Saved editable rows: only alter the quantity normalization expression, leave layout/CSS untouched.
s=s.replace(/quantity:row\.quantity===''\?'':(?:\([^\n]*?\)|Math\.round\(\(Number\(row\.quantity\)\|\|0\)\*100\)\/100)/g,m=>{changes++;return "quantity:row.quantity===''?'':"+roundExpr});
// Imported source rows: normalize m to 1 decimal, all other units keep 2 decimals.
s=s.replace(/quantity:Math\.round\(\(Number\(row\.quantity\)\|\|0\)\*100\)\/100,unit:String\(row\.unit\|\|''\)/g,()=>{changes++;return "quantity:"+roundExpr+",unit:String(row.unit||'')"});
// Fallback for older import form using raw Number(row.quantity).
s=s.replace(/quantity:Number\(row\.quantity\)\|\|0,unit:String\(row\.unit\|\|''\)/g,()=>{changes++;return "quantity:"+roundExpr+",unit:String(row.unit||'')"});
if(changes<1){console.error('ERROR: 数量処理を特定できません。変更していません。');process.exit(1)}
fs.copyFileSync(p,backup);
const anchor="import './MCrossEstimateSheet.css'";
if(s.includes(anchor))s=s.replace(anchor,anchor+"\n/* "+mark+" */"); else s='/* '+mark+' */\n'+s;
fs.writeFileSync(p,s,'utf8');
console.log('OK: 見積のm数量だけ小数1桁に統一しました。レイアウトCSSは変更していません。 changes='+changes);
