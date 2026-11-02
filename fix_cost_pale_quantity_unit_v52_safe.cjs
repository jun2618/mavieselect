const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_PALE_QTY_UNIT_V52_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-pale-qty-unit-v52-'+Date.now()+'.bak';fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* Quantity/unit were still visually pale. Paint the glyph itself in solid black. */\n.cc-page .cc-section .cc-row > div:nth-child(3) input,\n.cc-page .cc-section .cc-row > div:nth-child(4) input{\n color:transparent!important;\n -webkit-text-fill-color:transparent!important;\n text-shadow:0 0 0 #000!important;\n caret-color:#000!important;\n opacity:1!important;\n filter:none!important;\n font-weight:800!important;\n}\n.cc-page .cc-section .cc-row > div:nth-child(3) input::placeholder,\n.cc-page .cc-section .cc-row > div:nth-child(4) input::placeholder{\n color:#777!important;\n -webkit-text-fill-color:#777!important;\n text-shadow:none!important;\n}\n@media print{\n .cc-page .cc-section .cc-row > div:nth-child(3) input,\n .cc-page .cc-section .cc-row > div:nth-child(4) input{color:#000!important;-webkit-text-fill-color:#000!important;text-shadow:none!important;opacity:1!important}\n}\n`;
fs.writeFileSync(css,s,'utf8');
console.log('OK: quantity/unit glyphs forced to solid black V52');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
