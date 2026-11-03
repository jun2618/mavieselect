const fs=require('fs');
const jsx='./src/MCrossEstimateSheet.jsx';
const css='./src/MCrossEstimateSheet.css';
let j=fs.readFileSync(jsx,'utf8');
let c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_PAD6_MATCH_PARENT_ROUND_V2_SAFE';
if(j.includes(mark)||c.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const loadOld="return Array.isArray(saved?.rows)?saved.rows.map(row=>({...row,quantity:row.quantity===''?'':Math.round((Number(row.quantity)||0)*100)/100,rate:row.rate===''?'':Math.round(Number(row.rate)||0)})):[]";
const loadNew="return Array.isArray(saved?.rows)?saved.rows.map(row=>({...row,quantity:row.quantity===''?'':(String(row.unit||'').trim()==='m'?Math.round((Number(row.quantity)||0)*10)/10:Math.round((Number(row.quantity)||0)*100)/100),rate:row.rate===''?'':Math.round(Number(row.rate)||0)})):[]";
const importOld="quantity:Math.round((Number(row.quantity)||0)*100)/100,unit:String(row.unit||''),rate:row.rate===''||row.rate==null?'':Math.round(Number(row.rate)||0)";
const importNew="quantity:String(row.unit||'').trim()==='m'?Math.round((Number(row.quantity)||0)*10)/10:Math.round((Number(row.quantity)||0)*100)/100,unit:String(row.unit||''),rate:row.rate===''||row.rate==null?'':Math.round(Number(row.rate)||0)";
for(const [a,b,nm] of [[loadOld,loadNew,'saved rows'],[importOld,importNew,'import rows']]){const n=j.split(a).length-1;if(n!==1){console.error('ERROR: '+nm+' MATCH='+n+' - no changes');process.exit(1)}j=j.replace(a,b)}
j=j.replace("import './MCrossEstimateSheet.css'","import './MCrossEstimateSheet.css'\n/* "+mark+" */");
const add=`\n/* ${mark} */\n@media screen and (min-width:701px) and (max-width:1024px){\n .mcrossEstimateWorkspace{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;box-sizing:border-box!important;overflow-x:hidden!important;}\n .mcrossEstimateNavigation,.mcrossEstimatePaper{width:100%!important;max-width:100%!important;margin-left:0!important;margin-right:0!important;transform:none!important;box-sizing:border-box!important;}\n .mcrossEstimateNavigation{grid-template-columns:repeat(4,minmax(0,1fr))!important;padding:0!important;}\n .mcrossEstimateNavigation button{min-width:0!important;font-size:12px!important;padding:7px 3px!important;white-space:normal!important;}\n .mcrossEstimatePaper{padding:10px!important;overflow:hidden!important;}\n .mcrossEstimateTable.editable{width:100%!important;min-width:0!important;overflow:hidden!important;}\n .mcrossEstimateTable.editable .mcrossEstimateRow{grid-template-columns:34px 40px minmax(0,2fr) minmax(0,.78fr) 56px 44px 74px 82px 34px!important;width:100%!important;min-width:0!important;}\n .mcrossEstimateTable.editable .mcrossEstimateRow span,.mcrossEstimateTable.editable .mcrossEstimateRow input{min-width:0!important;font-size:11.5px!important;padding-left:2px!important;padding-right:2px!important;}\n .mcrossEstimateMeta{grid-template-columns:minmax(0,1.2fr) minmax(190px,.8fr)!important;gap:8px!important;}\n .mcrossEstimateMeta>*{min-width:0!important;}\n}\n@media print{.mcrossEstimateWorkspace,.mcrossEstimateNavigation,.mcrossEstimatePaper{transform:none!important;}}\n`;
fs.copyFileSync(jsx,'./src/MCrossEstimateSheet.before_pad6_match_parent_round_v2.jsx');
fs.copyFileSync(css,'./src/MCrossEstimateSheet.before_pad6_match_parent_round_v2.css');
fs.writeFileSync(jsx,j,'utf8');
fs.writeFileSync(css,c+add,'utf8');
console.log('OK: Pad 6 estimate now matches parent width and m quantities use 1 decimal.');
