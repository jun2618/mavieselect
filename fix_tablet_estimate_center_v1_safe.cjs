const fs=require('fs');
const p='./src/MCrossEstimateSheet.css';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_TABLET_ESTIMATE_CENTER_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const css=`\n/* ${mark} */\n@media screen and (min-width:701px) and (max-width:1024px){\n  .mcrossEstimateWorkspace{width:100%!important;max-width:100%!important;margin:0!important;padding:0 4px!important;box-sizing:border-box!important;}\n  .mcrossEstimatePaper,.mcrossEstimateNavigation{width:100%!important;max-width:920px!important;margin-left:auto!important;margin-right:auto!important;transform:translateX(-4px);box-sizing:border-box!important;}\n}\n@media print{.mcrossEstimatePaper,.mcrossEstimateNavigation{transform:none!important;}}\n`;
fs.copyFileSync(p,'./src/MCrossEstimateSheet.before_tablet_center_v1.css');
fs.writeFileSync(p,s+css,'utf8');
console.log('OK: タブレットだけ見積書を4px左へ補正しました。スマホ・PC・印刷は変更していません。');
