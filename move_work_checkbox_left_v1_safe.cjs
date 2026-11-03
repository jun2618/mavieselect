const fs=require('fs');
const jsx='./src/MCrossEstimateSheet.jsx';
const css='./src/MCrossEstimateSheet.css';
let s=fs.readFileSync(jsx,'utf8');
let c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_WORK_CHECKBOX_LEFT_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_WORK_COPY_V2_SAFE')){console.error('ERROR: 作業コピーV2が見つかりません。変更していません。');process.exit(1)}
const headOld="<span>No.</span><span>工事項目</span>";
const headNew="<span>No.</span><span className='mcrossWorkCheckHead'>選択</span><span>工事項目</span>";
const rowOld="<span>{index+1}</span><span><input value={row.name}";
const rowNew="<span>{index+1}</span><span className='mcrossWorkCheckCell'><input type='checkbox' checked={selectedWorkIds.includes(row.id)} onChange={()=>toggleWork(row.id)} aria-label={(workText(row)||'作業')+'を作業用に選択'} /></span><span><input value={row.name}";
const opOld="<span className='mcrossEstimateActions'><label className='mcrossWorkSelect'><input type='checkbox' checked={selectedWorkIds.includes(row.id)} onChange={()=>toggleWork(row.id)} aria-label={(workText(row)||'作業')+'を作業用に選択'} /><small>作業</small></label><button type='button' className='mcrossEstimateDelete' onClick={()=>remove(row.id)}>×</button></span>";
const opNew="<span className='mcrossEstimateActions'><button type='button' className='mcrossEstimateDelete' onClick={()=>remove(row.id)} aria-label={(workText(row)||'見積項目')+'を削除'}>×</button></span>";
for(const [a,b,label] of [[headOld,headNew,'見出し'],[rowOld,rowNew,'明細先頭'],[opOld,opNew,'操作欄']]){const n=s.split(a).length-1;if(n!==1){console.error('ERROR: '+label+' MATCH='+n+'。変更していません。');process.exit(1)}s=s.replace(a,b)}
s=s.replace('/* M-CROSS_WORK_COPY_V2_SAFE */','/* M-CROSS_WORK_COPY_V2_SAFE */\n /* '+mark+' */');
const cssAdd=`\n/* ${mark} */\n.mcrossEstimateTable.editable .mcrossEstimateRow{grid-template-columns:38px 42px minmax(220px,1.9fr) minmax(105px,.8fr) 68px 54px 92px 108px 38px!important}.mcrossWorkCheckHead,.mcrossWorkCheckCell{justify-content:center!important;padding:2px!important}.mcrossWorkCheckCell input[type=checkbox]{width:22px!important;height:22px!important;min-width:22px!important;min-height:22px!important;margin:0!important;padding:0!important;accent-color:#c85577;cursor:pointer}.mcrossEstimateActions{justify-content:center!important}.mcrossWorkCopyButton{font-weight:900!important}@media(max-width:700px){.mcrossEstimateTable.editable .mcrossEstimateRow{grid-template-columns:28px 36px minmax(180px,2fr) minmax(90px,.9fr) 52px 42px 68px 78px 30px!important}.mcrossWorkCheckCell input[type=checkbox]{width:24px!important;height:24px!important;min-width:24px!important;min-height:24px!important}}@media print{.mcrossWorkCheckHead,.mcrossWorkCheckCell{display:none!important}.mcrossEstimateTable.editable .mcrossEstimateRow{grid-template-columns:8mm 69mm 29mm 15mm 12mm 22mm 26mm!important}}\n`;
c+=cssAdd;
fs.copyFileSync(jsx,'./src/MCrossEstimateSheet.before_work_checkbox_left_v1.jsx');
fs.copyFileSync(css,'./src/MCrossEstimateSheet.before_work_checkbox_left_v1.css');
fs.writeFileSync(jsx,s,'utf8');
fs.writeFileSync(css,c,'utf8');
console.log('OK: 作業チェックをNo.と工事項目の間へ移動し、右端は削除だけに戻しました。');
