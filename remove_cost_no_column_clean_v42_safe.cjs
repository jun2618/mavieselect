const fs=require('fs'),cp=require('child_process'),path=require('path');
const jsx=path.join(process.cwd(),'src','CostCalculationPage.jsx');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_REMOVE_NO_CLEAN_V42_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: cost page files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8'),c=fs.readFileSync(css,'utf8');
if(j.includes(marker)||c.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const bj=jsx+'.before-remove-no-clean-v42-'+Date.now()+'.bak',bc=css+'.before-remove-no-clean-v42-'+Date.now()+'.bak';
fs.copyFileSync(jsx,bj);fs.copyFileSync(css,bc);

// Remove exactly the visible No. header and plain No. row cell from the current reference-based page.
const h='<span>No.</span>';
const r='<span className="costNo">{i+1}</span>';
if(j.split(h).length-1!==1){console.error('ERROR: No. header MATCH='+(j.split(h).length-1)+'; no changes');process.exit(1)}
if(j.split(r).length-1!==1){console.error('ERROR: No. row cell MATCH='+(j.split(r).length-1)+'; no changes');process.exit(1)}
j=j.replace(h,`{/* ${marker} */}`).replace(r,'');

// Change only the two grid definitions: 9 columns -> 8 columns. Everything else stays untouched.
const screenOld='grid-template-columns:46px minmax(150px,1.25fr) minmax(130px,1fr) 70px 62px 88px 100px 132px 58px;';
const screenNew='grid-template-columns:minmax(165px,1.3fr) minmax(140px,1fr) 70px 62px 88px 100px 132px 58px;';
const printOld='grid-template-columns:6mm minmax(30mm,1.25fr) minmax(25mm,1fr) 11mm 10mm 16mm 18mm 23mm 7mm;';
const printNew='grid-template-columns:minmax(33mm,1.3fr) minmax(27mm,1fr) 11mm 10mm 16mm 18mm 23mm 7mm;';
if(j.includes(marker) && c.split(screenOld).length-1!==1){console.error('ERROR: screen grid MATCH='+(c.split(screenOld).length-1)+'; no changes');process.exit(1)}
if(c.split(printOld).length-1!==1){console.error('ERROR: print grid MATCH='+(c.split(printOld).length-1)+'; no changes');process.exit(1)}
c=c.replace(screenOld,screenNew).replace(printOld,printNew);
fs.writeFileSync(jsx,j,'utf8');fs.writeFileSync(css,c,'utf8');
console.log('OK: No. column cleanly removed V42');console.log('BACKUP JSX:',bj);console.log('BACKUP CSS:',bc);
const res=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(res.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; restored');process.exit(res.status||1)}
console.log('OK: BUILD SUCCESS');
