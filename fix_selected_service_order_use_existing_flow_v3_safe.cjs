const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_SELECTED_SERVICE_ORDER_EXISTING_FLOW_V3_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const re=/onCreateServiceOrder=\{picked=>\{\/\* M-CROSS_SELECTED_WORK_SERVICE_ORDER_V1_SAFE \*\/ const keys=picked\.map\(row=>String\(row\.sourceKey\|\|''\)\)\.filter\(Boolean\);setSelectedOrderKeys\(\[\.\.\.new Set\(keys\)\]\);window\.setTimeout\(\(\)=>document\.querySelector\("\.orderSelectionPanel"\)\?\.scrollIntoView\(\{behavior:"smooth",block:"start"\}\),80\)\}\}/;
const n=(s.match(re)||[]).length;
if(n!==1){console.error('ERROR: 見積→施工発注のV1受け渡し位置 MATCH='+n+'。変更していません。');process.exit(1)}
const replacement=`onCreateServiceOrder={picked=>{/* ${mark} */ const keys=picked.map(row=>String(row.sourceKey||'')).filter(Boolean);setSelectedOrderKeys([...new Set(keys)]);window.setTimeout(()=>{const buttons=[...document.querySelectorAll('button')];const createButton=buttons.find(button=>String(button.textContent||'').includes('② 職人を選んで発注書を作る'));if(createButton){createButton.click()}else{document.querySelector('.orderSelectionPanel')?.scrollIntoView({behavior:'smooth',block:'start'})}},120)}}`;
fs.copyFileSync(p,'./src/App.before_selected_service_existing_flow_v3.jsx');
s=s.replace(re,replacement);
fs.writeFileSync(p,s,'utf8');
console.log('OK: 見積チェック→施工発注を、既存の正常な発注Draft生成処理へ接続しました。');
