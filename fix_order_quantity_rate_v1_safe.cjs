const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_ORDER_QUANTITY_RATE_FIX_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const targets=[
 ["factor: ['cross','cf'].includes(row.category) ? 0.9 : 1,","factor: 1,"],
 ["orderQuantity: Math.round(Number(row.quantity || 0) * (['cross','cf'].includes(row.category) ? 0.9 : 1) * 10) / 10,","orderQuantity: Math.round(Number(row.quantity || 0) * 10) / 10,"],
 ["<small>確認用。発注書の施工単価には自動反映しません。</small>","<small>職人選択時、登録済みの基本単価を優先して発注単価へ反映します。基本単価が空欄の場合は施工単価表を参照します。</small>"]
];
for(const [a,b] of targets){const n=s.split(a).length-1;if(n!==1){console.error('ERROR: '+a.slice(0,45)+' MATCH='+n+'。変更していません。');process.exit(1)}s=s.replace(a,b)}
// Keep one basic-rate editor visible: hide the older duplicated block by marking its opening section.
const oldDup="{/* M-CROSS_CONTRACTOR_BASE_RATES_ORDER_OVERRIDE_V1_SAFE */}<section className=\"contractorRateMaster contractorFormWide\">";
const newDup="{/* "+mark+" */}{/* M-CROSS_CONTRACTOR_BASE_RATES_ORDER_OVERRIDE_V1_SAFE */}<section className=\"contractorRateMaster contractorFormWide legacyContractorRateMaster\">";
const dn=s.split(oldDup).length-1;
if(dn!==1){console.error('ERROR: 重複する基本単価欄 MATCH='+dn+'。変更していません。');process.exit(1)}
s=s.replace(oldDup,newDup);
const cssAnchor='.contractorRateMaster{display:grid;gap:8px;';
if(!s.includes(cssAnchor)){console.error('ERROR: CSS anchorなし。変更していません。');process.exit(1)}
s=s.replace(cssAnchor,'.legacyContractorRateMaster{display:none!important}.contractorRateMaster{display:grid;gap:8px;');
fs.copyFileSync(p,'./src/App.before_order_quantity_rate_fix_v1.jsx');
fs.writeFileSync(p,s,'utf8');
console.log('OK: 発注数量の初期値を見積数量と同じにし、重複単価欄と説明を整理しました。');
