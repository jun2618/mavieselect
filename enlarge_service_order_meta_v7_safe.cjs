const fs=require('fs');
const p='./src/MCrossServiceOrderSheet.css';
if(!fs.existsSync(p)){console.error('ERROR: MCrossServiceOrderSheet.css not found. no changes');process.exit(1)}
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_SERVICE_ORDER_META_LARGE_V7_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
fs.copyFileSync(p,'./src/MCrossServiceOrderSheet.before_meta_large_v7.css');
s += `\n/* ${mark} */\n.mcrossServiceSheetMeta>div{min-height:29px!important;grid-template-columns:78px 1fr!important;font-size:15px!important}\n.mcrossServiceSheetMeta span{font-size:14px!important;font-weight:900!important}\n.mcrossServiceSheetMeta strong{font-size:16px!important;font-weight:700!important;line-height:1.2!important}\n.mcrossServiceSheetMeta .wide strong{font-size:17px!important;color:#245d38!important}\n@media(max-width:1024px){.mcrossServiceSheetMeta>div{min-height:28px!important;font-size:14px!important}.mcrossServiceSheetMeta span{font-size:13px!important}.mcrossServiceSheetMeta strong{font-size:15px!important}.mcrossServiceSheetMeta .wide strong{font-size:16px!important}}\n`;
fs.writeFileSync(p,s,'utf8');
console.log('OK: 物件名・号室・住所・工事名・発注先を大きく読みやすくしました。');
