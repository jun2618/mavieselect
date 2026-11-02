const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_PRINT_CLIPPED_NUMBERS_V31_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-clipped-numbers-v31-'+Date.now()+'.bak';fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* 印刷時のNo.数字が下端で切れないよう、行高に対するline-height/overflowをリセット */\n@media print{\n .costRow{overflow:visible!important}\n .costRow>*{overflow:visible!important;line-height:normal!important}\n .costRow>span:first-child{display:flex!important;align-items:center!important;justify-content:center!important;height:100%!important;min-height:0!important;padding:0!important;margin:0!important;line-height:1!important;overflow:visible!important;position:relative!important;top:0!important;transform:none!important;text-align:center!important}\n .costRow input,.taxIncludedCell>input{line-height:1!important;vertical-align:middle!important}\n .costHead>span:first-child{display:flex!important;align-items:center!important;justify-content:center!important;line-height:1!important}\n}\n`;
fs.writeFileSync(css,s,'utf8');console.log('OK: clipped row numbers fixed V31');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}console.log('OK: BUILD SUCCESS');
