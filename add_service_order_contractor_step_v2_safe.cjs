const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_SELECTED_SERVICE_CONTRACTOR_STEP_V2_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
// Keep selected-work handoff, but after selecting items jump directly to contractor picker.
const old='onCreateServiceOrder={picked=>{/* M-CROSS_SELECTED_WORK_SERVICE_ORDER_V1_SAFE */ const keys=picked.map(row=>String(row.sourceKey||\'\')).filter(Boolean);setSelectedOrderKeys([...new Set(keys)]);window.setTimeout(()=>document.querySelector(".orderSelectionPanel")?.scrollIntoView({behavior:"smooth",block:"start"}),80)}}';
const neu='onCreateServiceOrder={picked=>{/* '+mark+' */ const keys=picked.map(row=>String(row.sourceKey||\'\')).filter(Boolean);setSelectedOrderKeys([...new Set(keys)]);setShowContractorPicker(true);window.setTimeout(()=>document.querySelector(".contractorPicker")?.scrollIntoView({behavior:"smooth",block:"start"}),80)}}';
const n=s.split(old).length-1;
if(n!==1){console.error('ERROR: 選択施工発注の受け渡し位置 MATCH='+n+'。変更していません。');process.exit(1)}
fs.copyFileSync(p,'./src/App.before_selected_service_contractor_step_v2.jsx');
s=s.replace(old,neu);
fs.writeFileSync(p,s,'utf8');
console.log('OK: 見積チェック→施工発注で、選択作業を保持したまま職人選択へ進むようにしました。');
