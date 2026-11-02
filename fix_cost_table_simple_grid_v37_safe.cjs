const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_SIMPLE_GRID_V37_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-simple-grid-v37-'+Date.now()+'.bak';
fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* No.列は幅を残すが数字だけ消す。表は全セルを単純な縦横罫線で統一。 */\n.costHead,.costRow{column-gap:0!important;row-gap:0!important}\n.costHead>*,.costRow>*{box-sizing:border-box!important;border-top:0!important;border-left:0!important;border-right:1px solid #8795a8!important;border-bottom:1px solid #8795a8!important;border-radius:0!important;box-shadow:none!important}\n.costHead>*:first-child,.costRow>*:first-child{border-left:1px solid #8795a8!important}\n.costHead>*{background:#e9eef6!important;color:#243252!important}\n.costRow>*{background:#fff!important}\n.costRow>.costPlainNoCell,.costRow>.costRowNumber{font-size:0!important;color:transparent!important;background:#fff!important}\n.costRow>.costPlainNoCell::before,.costRow>.costRowNumber::before{content:''!important}\n.costRow input,.taxIncludedCell>input{border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}\n.taxIncludedCell{border-radius:0!important;background:#fff9f1!important}\n@media(max-width:820px){.costRow>.costPlainNoCell,.costRow>.costRowNumber{display:block!important;font-size:0!important;color:transparent!important;height:auto!important;min-height:0!important;padding:0!important;border-radius:0!important}.costRow{border-radius:0!important;box-shadow:none!important}}\n@media print{.costHead>*,.costRow>*{border-right:.22mm solid #66758a!important;border-bottom:.22mm solid #66758a!important}.costHead>*:first-child,.costRow>*:first-child{border-left:.22mm solid #66758a!important}.costRow>.costPlainNoCell,.costRow>.costRowNumber{font-size:0!important;color:transparent!important;background:#fff!important}.costRow input,.taxIncludedCell>input{border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}}\n`;
fs.writeFileSync(css,s,'utf8');
console.log('OK: simple grid V37 applied');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
