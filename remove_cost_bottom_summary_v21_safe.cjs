const fs=require('fs'),cp=require('child_process'),path=require('path');
const jsx=path.join(process.cwd(),'src','CostCalculationPage.jsx');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_REMOVE_BOTTOM_V21_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: cost page files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8'),c=fs.readFileSync(css,'utf8');
if(j.includes(marker)||c.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const bj=jsx+'.before-remove-bottom-v21-'+Date.now()+'.bak',bc=css+'.before-remove-bottom-v21-'+Date.now()+'.bak';fs.copyFileSync(jsx,bj);fs.copyFileSync(css,bc);
const start=j.indexOf('<footer className="costBottom">');
const end=j.indexOf('</footer>',start);
if(start<0||end<0){console.error('ERROR: costBottom footer not found; no changes');process.exit(1)}
j=j.slice(0,start)+`{/* ${marker}: bottom memo/summary/profit blocks removed; totals remain in top KPI + section subtotals */}`+j.slice(end+'</footer>'.length);
// Make top KPI strip more useful after removing duplicate bottom summary.
c+=`\n/* ${marker} */\n.costBottom{display:none!important}.costKpis{grid-template-columns:repeat(3,minmax(0,1fr))!important}.costKpis article{min-height:68px!important}.costKpis article>strong{font-size:24px!important}.costSection:last-of-type{margin-bottom:0!important}@media print{.costBottom{display:none!important}.costKpis{grid-template-columns:repeat(3,minmax(0,1fr))!important;min-height:10mm!important;height:10mm!important}.costKpis article{min-height:10mm!important;height:10mm!important}.costKpis article>strong{font-size:9.5pt!important}.costSection:last-of-type{margin-bottom:0!important}}\n`;
fs.writeFileSync(jsx,j,'utf8');fs.writeFileSync(css,c,'utf8');
console.log('OK: bottom duplicate summary removed V21');console.log('BACKUP JSX:',bj);console.log('BACKUP CSS:',bc);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; restored');process.exit(r.status||1)}console.log('OK: BUILD SUCCESS');
