const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_PRINT_SECTION_TYPE_V59_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-print-section-type-v59-'+Date.now()+'.bak';
fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* Print only: section title larger; parenthetical note smaller. */\n@media print{\n .cc-section-title b{font-size:7.4pt!important;font-weight:800!important;line-height:1!important}\n .cc-section-title small{font-size:3.9pt!important;font-weight:600!important;line-height:1!important;opacity:.82!important}\n .cc-section-title{gap:.8mm!important;align-items:center!important}\n}\n`;
fs.writeFileSync(css,s,'utf8');
console.log('OK: print section title/note sizes reversed V59');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
