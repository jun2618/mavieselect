const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_PRINT_ROW_NUMBER_V30_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-row-number-v30-'+Date.now()+'.bak';
fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* 印刷時のNo.数字を各明細行の中央へ固定 */\n@media print{\n .costRow>span:first-child{\n   display:flex!important;\n   align-items:center!important;\n   justify-content:center!important;\n   width:100%!important;\n   height:100%!important;\n   min-height:0!important;\n   margin:0!important;\n   padding:0!important;\n   line-height:1!important;\n   text-align:center!important;\n   vertical-align:middle!important;\n   position:static!important;\n   transform:none!important;\n   overflow:visible!important;\n   color:#111!important;\n }\n .costHead>span:first-child{\n   display:flex!important;\n   align-items:center!important;\n   justify-content:center!important;\n   text-align:center!important;\n }\n}\n`;
fs.writeFileSync(css,s,'utf8');
console.log('OK: print row numbers centered V30');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
