const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_AUTO_APPLY_CONTRACTOR_PRICEBOOK_V3_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const eol=s.includes('\r\n')?'\r\n':'\n';
let lines=s.split(/\r?\n/);
const idx=lines.findIndex(line=>line.includes("const masterRate=rateKey && item.rates?.[rateKey]!==''") && line.includes('current.orderRate'));
if(idx<0){console.error('ERROR: masterRate行が見つかりません。変更していません。');process.exit(1)}
if(!lines[idx+1] || !lines[idx+1].includes('return {...current,rateKey,orderRate:Number.isFinite(masterRate)?masterRate:\'\'}')){console.error('ERROR: return行が想定と違います。変更していません。');process.exit(1)}
const indent=lines[idx].match(/^\s*/)[0];
const replacement=[
  indent+'/* '+mark+' */',
  indent+"const directRate=rateKey && item.rates?.[rateKey]!=='' && item.rates?.[rateKey]!=null ? Number(item.rates[rateKey]) : NaN",
  indent+"const names=rateKey==='cross'?['クロス施工費','クロス施工','クロス']:rateKey==='cf'?['CF施工費','CF施工','CF']:rateKey==='soft'?['巾木施工費','ソフト巾木施工費','巾木','ソフト巾木']:rateKey==='floorTrim'?['床見切り施工費','床見切り']:rateKey==='wallBase'?['壁下地処理','壁下地']:rateKey==='floorBase'?['床下地処理','床下地']:[]",
  indent+"const priceRow=(Array.isArray(item.priceBook)?item.priceBook:[]).find(row=>names.includes(String(row?.name||'').trim()) && row?.priceType==='fixed' && row?.price!=='' && row?.price!=null)",
  indent+"const priceBookRate=priceRow?Number(priceRow.price):NaN",
  indent+"const currentRate=current.orderRate===''||current.orderRate==null?NaN:Number(current.orderRate)",
  indent+"const masterRate=Number.isFinite(directRate)?directRate:Number.isFinite(priceBookRate)?priceBookRate:currentRate",
  indent+"return {...current,rateKey,orderRate:Number.isFinite(masterRate)?masterRate:''}"
];
lines.splice(idx,2,...replacement);
fs.copyFileSync(p,'./src/App.before_auto_apply_contractor_pricebook_v3.jsx');
fs.writeFileSync(p,lines.join(eol),'utf8');
console.log('OK: 基本単価→施工単価表の順で発注単価を自動反映します。');
