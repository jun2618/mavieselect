const fs=require('fs');
const sheet='./src/MCrossEstimateSheet.jsx';
const app='./src/App.jsx';
let s=fs.readFileSync(sheet,'utf8');
let a=fs.readFileSync(app,'utf8');
const mark='M-CROSS_SELECTED_WORK_SERVICE_ORDER_V1_SAFE';
if(s.includes(mark)||a.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}

const propOld="onGoMeasurement,onGoOrder,onGoCost,onExportEstimate}";
const propNew="onGoMeasurement,onGoOrder,onGoCost,onExportEstimate,onCreateServiceOrder}";
if((s.split(propOld).length-1)!==1){console.error('ERROR: props位置を特定できません。変更していません。');process.exit(1)}
s=s.replace(propOld,propNew);

const btnAnchor="<button type='button' className='mcrossWorkInstructionButton' onClick={()=>selectedWorkIds.length?setShowWorkInstruction(true):window.alert('作業指示書に載せる項目を選択してください。')}>📄 作業指示書（{selectedWorkIds.length}件）</button>";
if((s.split(btnAnchor).length-1)!==1){console.error('ERROR: 作業指示書ボタン位置を特定できません。変更していません。');process.exit(1)}
const orderBtn=btnAnchor+"<button type='button' className='mcrossWorkOrderButton' onClick={()=>{const picked=rows.filter(row=>selectedWorkIds.includes(row.id));if(!picked.length){window.alert('施工発注する作業を選択してください。');return}if(typeof onCreateServiceOrder==='function')onCreateServiceOrder(picked)}}>👷 選択した作業を施工発注（{selectedWorkIds.length}件）</button>";
s=s.replace(btnAnchor,orderBtn);

const importAnchor="/* M-CROSS_ESTIMATE_DISPLAY_DECIMAL1_V2_SAFE */";
if(s.includes(importAnchor))s=s.replace(importAnchor,importAnchor+'\n/* '+mark+' */');else s='/* '+mark+' */\n'+s;

const goOrder=/onGoOrder=\{\(\)=>document\.querySelector\("\.orderSelectionPanel"\)\?\.scrollIntoView\(\{behavior:"smooth",block:"start"\}\)\}/;
if(!goOrder.test(a)){console.error('ERROR: App側の発注移動処理を特定できません。変更していません。');process.exit(1)}
const replacement=`onGoOrder={()=>document.querySelector(".orderSelectionPanel")?.scrollIntoView({behavior:"smooth",block:"start"})} onCreateServiceOrder={picked=>{/* ${mark} */ const keys=picked.map(row=>String(row.sourceKey||'')).filter(Boolean);setSelectedOrderKeys([...new Set(keys)]);window.setTimeout(()=>document.querySelector(".orderSelectionPanel")?.scrollIntoView({behavior:"smooth",block:"start"}),80)}}`;
a=a.replace(goOrder,replacement);

fs.copyFileSync(sheet,'./src/MCrossEstimateSheet.before_selected_service_order_v1.jsx');
fs.copyFileSync(app,'./src/App.before_selected_service_order_v1.jsx');
fs.writeFileSync(sheet,s,'utf8');
fs.writeFileSync(app,a,'utf8');
console.log('OK: 見積チェックから選択作業だけを既存の施工発注へ渡す入口を追加しました。');
