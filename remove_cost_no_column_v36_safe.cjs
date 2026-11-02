const fs=require('fs'),cp=require('child_process'),path=require('path');
const jsx=path.join(process.cwd(),'src','CostCalculationPage.jsx');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_REMOVE_NO_COLUMN_V36_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: cost page files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8'),c=fs.readFileSync(css,'utf8');
if(j.includes(marker)||c.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const bj=jsx+'.before-remove-no-v36-'+Date.now()+'.bak',bc=css+'.before-remove-no-v36-'+Date.now()+'.bak';
fs.copyFileSync(jsx,bj);fs.copyFileSync(css,bc);
// Remove No header and the row-number cell completely. This avoids all accumulated No-column CSS conflicts.
const head='<span>No.</span>';
const row=/<div className="costPlainNoCell">\{i\+1\}<\/div>\{\/\* M-CROSS_COST_PLAIN_NO_CELL_V35_SAFE \*\/\}/;
if((j.split(head).length-1)!==1){console.error('ERROR: No header MATCH='+(j.split(head).length-1)+'; no changes');process.exit(1)}
if(!row.test(j)){console.error('ERROR: plain No cell not found; no changes');process.exit(1)}
j=j.replace(head,'{/* '+marker+' */}').replace(row,'');
// One authoritative 8-column grid. No first-child/No-specific geometry remains relevant.
c+=`\n/* ${marker} */\n.costHead,.costRow{grid-template-columns:minmax(150px,1.35fr) minmax(125px,1fr) 58px 50px 82px 92px 102px 40px!important}.costHead>span:first-child,.costRow>*:first-child{border-left:1px solid #8f9caf!important}.costPlainNoCell,.costRowNumber{display:none!important}\n@media(min-width:821px){.costHead,.costRow{grid-template-columns:minmax(150px,1.35fr) minmax(125px,1fr) 58px 50px 82px 92px 102px 40px!important}}\n@media(max-width:820px){.costHead{display:none!important}.costRow{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}.costRow>*:first-child{grid-column:1/-1!important}}\n@media print{.costHead,.costRow{grid-template-columns:minmax(31mm,1.35fr) minmax(24mm,1fr) 11mm 10mm 16mm 18mm 21mm 7mm!important;min-width:0!important}.costHead>span:first-child,.costRow>*:first-child{border-left:.27mm solid #69788d!important}.costPlainNoCell,.costRowNumber{display:none!important}}\n`;
fs.writeFileSync(jsx,j,'utf8');fs.writeFileSync(css,c,'utf8');
console.log('OK: No. column removed completely V36');console.log('BACKUP JSX:',bj);console.log('BACKUP CSS:',bc);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
