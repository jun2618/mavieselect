const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_SKIP_DUPLICATE_ORDER_SELECTION_V4_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const old='onCreateServiceOrder={picked=>{/* M-CROSS_SELECTED_SERVICE_ORDER_EXISTING_FLOW_V3_SAFE */ const keys=picked.map(row=>String(row.sourceKey||\'\')).filter(Boolean);setSelectedOrderKeys([...new Set(keys)]);window.setTimeout(()=>{const buttons=[...document.querySelectorAll(\'button\')];const createButton=buttons.find(button=>String(button.textContent||\'\').includes(\'② 職人を選んで発注書を作る\'));if(createButton){createButton.click()}else{document.querySelector(\'.orderSelectionPanel\')?.scrollIntoView({behavior:\'smooth\',block:\'start\'})}},120)}}';
const neu='onCreateServiceOrder={picked=>{/* '+mark+' */ const keys=picked.map(row=>String(row.sourceKey||\'\')).filter(Boolean);setSelectedOrderKeys([...new Set(keys)]);window.setTimeout(()=>{const buttons=[...document.querySelectorAll(\'button\')];const createButton=buttons.find(button=>String(button.textContent||\'\').includes(\'② 職人を選んで発注書を作る\'));if(createButton){createButton.click();window.setTimeout(()=>document.querySelector(\'.serviceOrderPanel\')?.scrollIntoView({behavior:\'smooth\',block:\'start\'}),80)}},120)}}';
const n=s.split(old).length-1;if(n!==1){console.error('ERROR: V3接続位置 MATCH='+n+'。変更していません。');process.exit(1)}
fs.copyFileSync(p,'./src/App.before_skip_duplicate_order_selection_v4.jsx');
s=s.replace(old,neu);
fs.writeFileSync(p,s,'utf8');
console.log('OK: 見積チェックからの施工発注は再チェック画面を飛ばして施工発注書作成へ直行します。');
