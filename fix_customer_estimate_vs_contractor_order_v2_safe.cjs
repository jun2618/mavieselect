const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_CUSTOMER_ESTIMATE_CONTRACTOR_ORDER_V2_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const checks=[
 ["factor: 1,",1,'現在の発注掛率'],
 ["orderQuantity: Math.round(Number(row.quantity || 0) * 10) / 10,",1,'現在の発注数量'],
 ["unit: '㎡',",2,'見積クロス・CF単位']
];
for(const [x,n,label] of checks){const c=s.split(x).length-1;if(c!==n){console.error(`ERROR: ${label} MATCH=${c}。変更していません。`);process.exit(1)}}
fs.copyFileSync(p,'./src/App.before_customer_estimate_contractor_order_v2.jsx');
// customer estimate units: the two estimate-builder occurrences only
s=s.split("unit: '㎡',").join("unit: 'm',");
// contractor order defaults
s=s.replace("                        factor: 1,","                        /* "+mark+" */\n                        factor: ['cross','cf'].includes(row.category) ? 0.9 : 1,");
s=s.replace("                        orderQuantity: Math.round(Number(row.quantity || 0) * 10) / 10,","                        orderQuantity: Math.round(Number(row.quantity || 0) * (['cross','cf'].includes(row.category) ? 0.9 : 1) * 100) / 100,");
fs.writeFileSync(p,s,'utf8');
console.log('OK: 先方見積はm、職人発注はクロス・CF標準0.90（最大2桁）に整理しました。');
