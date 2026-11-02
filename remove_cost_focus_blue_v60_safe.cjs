const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_NO_BLUE_FOCUS_V60_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-no-blue-focus-v60-'+Date.now()+'.bak';fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* 入力セルをタップ/クリックしても水色のフォーカス枠を出さない */\n.cc-page .cc-row input:focus,\n.cc-page .cc-row input:focus-visible,\n.cc-page .cc-info input:focus,\n.cc-page .cc-info input:focus-visible,\n.cc-page .cc-kpis input:focus,\n.cc-page .cc-kpis input:focus-visible{\n outline:none!important;\n outline-offset:0!important;\n box-shadow:none!important;\n border-color:transparent!important;\n}\n.cc-page .cc-row input{caret-color:#000!important}\n`;
fs.writeFileSync(css,s,'utf8');
console.log('OK: blue input focus ring removed V60');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
