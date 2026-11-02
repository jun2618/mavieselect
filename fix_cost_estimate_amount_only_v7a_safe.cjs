const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_ESTIMATE_AMOUNT_ONLY_V7A_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-estimate-amount-v7a-'+Date.now()+'.bak';fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* 見積金額だけ他のKPI数値と同じ大きさ・太さに固定 */\n.costKpis .estimate input[type="number"]{font-size:30px!important;font-weight:800!important;line-height:1!important;letter-spacing:.01em!important;color:#bd2c5a!important;width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;padding:0!important;margin:0!important;text-align:left!important;background:transparent!important;border:0!important;box-shadow:none!important;font-variant-numeric:tabular-nums!important}\n@media(max-width:820px){.costKpis .estimate input[type="number"]{font-size:27px!important}}\n@media print{.costKpis .estimate input[type="number"]{font-size:16px!important;color:#000!important}}\n`;
fs.writeFileSync(css,s,'utf8');
console.log('OK: estimate amount size fixed only');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}console.log('OK: BUILD SUCCESS');
