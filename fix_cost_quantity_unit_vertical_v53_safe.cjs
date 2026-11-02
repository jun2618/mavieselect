const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_QTY_UNIT_VERTICAL_V53_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-qty-unit-vertical-v53-'+Date.now()+'.bak';
fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* 数量・単位だけをセル中央へ。V52のtext-shadow描画は解除。 */\n.cc-page .cc-section .cc-grid .cc-row>div:nth-child(3),\n.cc-page .cc-section .cc-grid .cc-row>div:nth-child(4){\n  display:flex!important;\n  align-items:center!important;\n}\n.cc-page .cc-section .cc-grid .cc-row>div:nth-child(3)>input,\n.cc-page .cc-section .cc-grid .cc-row>div:nth-child(4)>input{\n  display:block!important;\n  height:28px!important;\n  min-height:28px!important;\n  margin:0!important;\n  padding:0 5px!important;\n  border:0!important;\n  color:#000!important;\n  -webkit-text-fill-color:#000!important;\n  text-shadow:none!important;\n  opacity:1!important;\n  font-weight:700!important;\n  line-height:28px!important;\n  vertical-align:middle!important;\n}\n@media print{\n .cc-page .cc-section .cc-grid .cc-row>div:nth-child(3)>input,\n .cc-page .cc-section .cc-grid .cc-row>div:nth-child(4)>input{\n   height:4mm!important;min-height:4mm!important;margin:0!important;padding:0 .3mm!important;\n   color:#000!important;-webkit-text-fill-color:#000!important;text-shadow:none!important;\n   line-height:4mm!important;vertical-align:middle!important;\n }\n}\n`;
fs.writeFileSync(css,s,'utf8');
console.log('OK: quantity/unit vertically centered V53');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
