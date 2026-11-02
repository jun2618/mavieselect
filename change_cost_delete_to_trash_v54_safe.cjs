const fs=require('fs'),cp=require('child_process'),path=require('path');
const jsx=path.join(process.cwd(),'src','CostCalculationPage.jsx');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_TRASH_ICON_V54_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: cost page files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8'),c=fs.readFileSync(css,'utf8');
if(j.includes(marker)||c.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const old='<button onClick={()=>del(d.key,r.id)}>▣</button>';
const count=j.split(old).length-1;
if(count!==1){console.error('ERROR: delete button MATCH='+count+'; no changes');process.exit(1)}
const icon=`<button className="cc-trash" type="button" aria-label="行を削除" title="削除" onClick={()=>del(d.key,r.id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5h8M9.5 4.5l.7-1.5h3.6l.7 1.5M6.5 7h11l-.7 13H7.2L6.5 7Z"/><path d="M10 10v7M14 10v7"/></svg></button>{/* ${marker} */}`;
j=j.replace(old,icon);
c+=`\n/* ${marker} */\n.cc-row .op .cc-trash{display:grid;place-items:center;width:24px;height:24px;margin:auto;padding:0;border:1px solid #ef9fba;border-radius:50%;background:#fff5f8;color:#d84d7e;cursor:pointer}.cc-row .op .cc-trash svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.cc-row .op .cc-trash:hover{background:#ffe7ef;border-color:#e66c98}.cc-row .op .cc-trash:focus-visible{outline:2px solid #df5c8b;outline-offset:2px}@media print{.cc-row .op{display:none!important}}\n`;
const bj=jsx+'.before-trash-v54-'+Date.now()+'.bak',bc=css+'.before-trash-v54-'+Date.now()+'.bak';
fs.copyFileSync(jsx,bj);fs.copyFileSync(css,bc);fs.writeFileSync(jsx,j,'utf8');fs.writeFileSync(css,c,'utf8');
console.log('OK: delete control changed to trash icon V54');console.log('BACKUP JSX:',bj);console.log('BACKUP CSS:',bc);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
