const fs=require('fs');
const p='./src/MCrossEstimateSheet.css';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_XIAOMI_PAD6_FULLCENTER_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
fs.copyFileSync(p,'./src/MCrossEstimateSheet.before_xiaomi_pad6_fullcenter_v1.css');
const css=`\n/* ${mark} */\n@media screen and (min-width:701px) and (max-width:1024px){\n  .mcrossEstimateWorkspace{\n    width:100vw!important;max-width:100vw!important;\n    margin-left:calc(50% - 50vw)!important;margin-right:calc(50% - 50vw)!important;\n    padding:0 8px!important;box-sizing:border-box!important;overflow-x:hidden!important;\n  }\n  .mcrossEstimateNavigation,.mcrossEstimatePaper{\n    width:100%!important;max-width:none!important;\n    margin-left:auto!important;margin-right:auto!important;\n    transform:none!important;box-sizing:border-box!important;\n  }\n  .mcrossEstimatePaper{padding-left:10px!important;padding-right:10px!important;}\n}\n@media print{.mcrossEstimateWorkspace{width:auto!important;max-width:none!important;margin:0!important;padding:0!important}.mcrossEstimateNavigation,.mcrossEstimatePaper{transform:none!important}}\n`;
fs.writeFileSync(p,s+css,'utf8');
console.log('OK: Xiaomi Pad 6向けに見積画面を全画面・ど真ん中へ修正しました。');
