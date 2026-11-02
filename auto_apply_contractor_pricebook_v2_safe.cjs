const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_AUTO_APPLY_CONTRACTOR_PRICEBOOK_V2_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const old="                              const masterRate=rateKey && item.rates?.[rateKey]!=='' && item.rates?.[rateKey]!=null ? Number(item.rates[rateKey]) : current.orderRate\n                              return {...current,rateKey,orderRate:Number.isFinite(masterRate)?masterRate:''}";
const neu=`                              /* ${mark} */
                              const directRate=rateKey && item.rates?.[rateKey]!=='' && item.rates?.[rateKey]!=null ? Number(item.rates[rateKey]) : NaN
                              const priceNames=rateKey==='cross'?['クロス施工費','クロス施工','クロス']:rateKey==='cf'?['CF施工費','CF施工','CF']:rateKey==='soft'?['巾木施工費','ソフト巾木施工費','巾木','ソフト巾木']:rateKey==='floorTrim'?['床見切り施工費','床見切り']:rateKey==='wallBase'?['壁下地処理','壁下地']:rateKey==='floorBase'?['床下地処理','床下地']:[]
                              const priceRows=Array.isArray(item.priceBook)?item.priceBook:[]
                              const priceRow=priceRows.find(row=>priceNames.includes(String(row?.name||'').trim()) && row?.priceType==='fixed' && row?.price!=='' && row?.price!=null)
                              const priceBookRate=priceRow?Number(priceRow.price):NaN
                              const currentRate=current.orderRate===''||current.orderRate==null?NaN:Number(current.orderRate)
                              const masterRate=Number.isFinite(directRate)?directRate:Number.isFinite(priceBookRate)?priceBookRate:currentRate
                              return {...current,rateKey,orderRate:Number.isFinite(masterRate)?masterRate:''}`;
const count=s.split(old).length-1;
if(count!==1){console.error('ERROR: 現在の職人単価処理 MATCH='+count+'。変更していません。');process.exit(1)}
fs.copyFileSync(p,'./src/App.before_auto_apply_contractor_pricebook_v2.jsx');
s=s.replace(old,neu);
fs.writeFileSync(p,s,'utf8');
console.log('OK: 基本単価→施工単価表の順で発注単価を自動反映するようにしました。');
