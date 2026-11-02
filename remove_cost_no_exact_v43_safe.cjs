const fs=require('fs'),cp=require('child_process'),path=require('path');
const root=process.cwd();
const jsx=path.join(root,'src','CostCalculationPage.jsx');
const css=path.join(root,'src','CostCalculationPage.css');
const marker='M-CROSS_REMOVE_COST_NO_EXACT_V43_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8'),c=fs.readFileSync(css,'utf8');
if(j.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const h='<div className="costHead"><span>No.</span>';
const r='<div className="costRow" key={r.id}><span>{i+1}</span>';
const hc=j.split(h).length-1, rc=j.split(r).length-1;
if(hc!==1||rc!==1){console.error(`ERROR: exact MATCH head=${hc} row=${rc}; no changes`);process.exit(1)}
const bj=jsx+'.before-remove-no-exact-v43-'+Date.now()+'.bak';
const bc=css+'.before-remove-no-exact-v43-'+Date.now()+'.bak';
fs.copyFileSync(jsx,bj);fs.copyFileSync(css,bc);
j=j.replace(h,`<div className="costHead">{/* ${marker} */}`).replace(r,'<div className="costRow" key={r.id}>');
// Existing page currently defines 9 grid tracks. Override to 8 tracks only.
c+=`\n/* ${marker} */\n.costHead,.costRow{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr) 70px 62px 88px 100px 132px 58px!important}\n.costHead>*:first-child,.costRow>*:first-child{border-left:1px solid var(--line,#b7bec9)!important}\n@media(max-width:820px){.costHead,.costRow{grid-template-columns:minmax(150px,1.35fr) minmax(125px,1fr) 70px 62px 88px 100px 132px 58px!important}}\n@media print{.costHead,.costRow{grid-template-columns:minmax(33mm,1.3fr) minmax(27mm,1fr) 11mm 10mm 16mm 18mm 23mm 7mm!important;min-width:0!important}.costHead>*:first-child,.costRow>*:first-child{border-left:.22mm solid #778598!important}}\n`;
fs.writeFileSync(jsx,j,'utf8');fs.writeFileSync(css,c,'utf8');
console.log('OK: No. column removed from actual JSX V43');
console.log('BACKUP JSX:',bj);console.log('BACKUP CSS:',bc);
const res=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(res.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; restored');process.exit(res.status||1)}
console.log('OK: BUILD SUCCESS');
