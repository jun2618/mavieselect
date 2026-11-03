const fs=require('fs');
const p='./src/MCrossServiceOrderSheet.css';
if(!fs.existsSync(p)){console.error('ERROR: MCrossServiceOrderSheet.css not found. no changes');process.exit(1)}
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_SERVICE_ORDER_GRID_V10_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
fs.copyFileSync(p,'./src/MCrossServiceOrderSheet.before_grid_v10.css');
s += `\n/* ${mark} */\n.mcrossServiceSheetTable{border-top:1px solid var(--grid)!important;border-left:1px solid var(--grid)!important;border-right:0!important;border-bottom:0!important}\n.mcrossServiceSheetRow{column-gap:0!important;row-gap:0!important}\n.mcrossServiceSheetRow>span{box-sizing:border-box!important;border-right:1px solid var(--grid)!important;border-bottom:1px solid var(--grid)!important}\n.mcrossServiceSheetRow:not(.head)>span:nth-child(2),.mcrossServiceSheetRow:not(.head)>span:nth-child(3),.mcrossServiceSheetRow:not(.head)>span:nth-child(4),.mcrossServiceSheetRow:not(.head)>span:nth-child(6){margin:0!important;height:33px!important;min-height:33px!important;border-top:0!important;border-left:0!important;border-right:1px solid var(--grid)!important;border-bottom:1px solid var(--grid)!important;border-radius:0!important;background:rgba(255,255,255,.28)!important}\n.mcrossServiceSheetRow .rate input{height:27px!important;min-height:27px!important;margin:2px 4px!important;width:calc(100% - 8px)!important;border:1px solid #d89cac!important;border-radius:8px!important;background:#fffaf8!important}\n@media(max-width:1024px){.mcrossServiceSheetRow:not(.head)>span:nth-child(2),.mcrossServiceSheetRow:not(.head)>span:nth-child(3),.mcrossServiceSheetRow:not(.head)>span:nth-child(4),.mcrossServiceSheetRow:not(.head)>span:nth-child(6){height:31px!important;min-height:31px!important}}\n`;
fs.writeFileSync(p,s,'utf8');
console.log('OK: 明細の全セルを縦横罫線でつないだ表に統一しました。');
