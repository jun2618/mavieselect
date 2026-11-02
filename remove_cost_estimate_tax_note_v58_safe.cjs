const fs=require('fs'),cp=require('child_process'),path=require('path');
const jsx=path.join(process.cwd(),'src','CostCalculationPage.jsx');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_REMOVE_ESTIMATE_TAX_NOTE_V58_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: cost page files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8'),c=fs.readFileSync(css,'utf8');
if(j.includes(marker)||c.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const pattern=/<small>税込 \{yen\(num\(info\.estimate\)\*1\.1\)\}<\/small>/;
const matches=j.match(pattern);
if(!matches){console.error('ERROR: estimate tax note not found; no changes');process.exit(1)}
const bj=jsx+'.before-remove-estimate-tax-v58-'+Date.now()+'.bak';
const bc=css+'.before-remove-estimate-tax-v58-'+Date.now()+'.bak';
fs.copyFileSync(jsx,bj);fs.copyFileSync(css,bc);
j=j.replace(pattern,`{/* ${marker} */}`);
c+=`\n/* ${marker} */\n/* 見積金額カードはタイトル＋金額だけ。税込補足を表示しない。 */\n.cc-kpis .estimate>div{grid-template-rows:auto auto!important;align-content:center!important}.cc-kpis .estimate small{display:none!important}\n`;
fs.writeFileSync(jsx,j,'utf8');fs.writeFileSync(css,c,'utf8');
console.log('OK: estimate tax note removed V58');
console.log('BACKUP JSX:',bj);console.log('BACKUP CSS:',bc);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
