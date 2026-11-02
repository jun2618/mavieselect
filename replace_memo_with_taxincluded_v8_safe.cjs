const fs=require('fs'),cp=require('child_process'),path=require('path');
const jsx=path.join(process.cwd(),'src','CostCalculationPage.jsx');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_TAX_INCLUDED_COLUMN_V8_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: cost page files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8'),c=fs.readFileSync(css,'utf8');
if(j.includes(marker)||c.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const bj=jsx+'.before-taxincluded-v8-'+Date.now()+'.bak',bc=css+'.before-taxincluded-v8-'+Date.now()+'.bak';fs.copyFileSync(jsx,bj);fs.copyFileSync(css,bc);
const headOld='<span>単価</span><span>金額</span><span>メモ</span><span>操作</span>';
const headNew='<span>単価</span><span>金額</span><span>税込金額</span><span>操作</span>';
if((j.split(headOld).length-1)!==1){console.error('ERROR: header MATCH='+(j.split(headOld).length-1));process.exit(1)}
j=j.replace(headOld,headNew);
const rowOld='<strong>{yen(amount)}</strong><input value={r.memo} onChange={e=>update(t.key,r.id,\'memo\',e.target.value)}/><button onClick={()=>remove(t.key,r.id)}>▣</button>{t.key===\'retail\'&&<label className="taxIncluded"><span>税込</span><input type="number" value={r.taxIncluded} onChange={e=>update(t.key,r.id,\'taxIncluded\',e.target.value)}/></label>}';
const rowNew=`{/* ${marker} */}<strong>{yen(amount)}</strong><div className="taxIncludedCell">{t.key==='retail'?<input type="number" value={r.taxIncluded} onChange={e=>update(t.key,r.id,'taxIncluded',e.target.value)} placeholder="税込金額"/>:<strong>{yen(amount*1.1)}</strong>}</div><button onClick={()=>remove(t.key,r.id)}>▣</button>`;
if((j.split(rowOld).length-1)!==1){console.error('ERROR: row MATCH='+(j.split(rowOld).length-1));process.exit(1)}
j=j.replace(rowOld,rowNew);
c+=`\n/* ${marker} */\n.taxIncludedCell{display:flex!important;align-items:center!important;justify-content:flex-end!important;min-width:0;background:#fffaf4!important;border-right:1px solid #c3ccda!important;border-bottom:1px solid #c3ccda!important}.taxIncludedCell>strong{width:100%;text-align:right;color:#a75e2c;font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}.taxIncludedCell>input{width:100%!important;min-height:38px!important;box-sizing:border-box!important;border:1px solid #ead8c9!important;border-radius:9px!important;background:#fff!important;color:#8b4b22!important;text-align:right;font-weight:700!important}.costHead span:nth-child(8){background:#fff5ea!important;color:#8b4b22!important}@media(min-width:821px){.taxIncludedCell>strong{font-size:14px}.taxIncludedCell>input{min-height:25px!important;font-size:12px!important;padding:2px 5px!important;border-radius:6px!important}}@media(max-width:820px){.taxIncludedCell{grid-column:2/-1!important;min-height:44px!important;border-right:0!important}.taxIncludedCell:before{content:'税込金額';margin-right:auto;color:#8b6d57;font-size:12px;font-weight:800}.taxIncludedCell>strong{width:auto;font-size:19px}.taxIncludedCell>input{width:min(190px,65%)!important;font-size:16px!important}}@media print{.taxIncludedCell{background:#fff!important}.taxIncludedCell>strong{font-size:8px!important;color:#222!important}.taxIncludedCell>input{min-height:0!important;border:0!important;border-radius:0!important;padding:1px!important;font-size:7px!important}}\n`;
fs.writeFileSync(jsx,j,'utf8');fs.writeFileSync(css,c,'utf8');
console.log('OK: memo column replaced with tax-included amount');console.log('BACKUP JSX:',bj);console.log('BACKUP CSS:',bc);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; restored');process.exit(r.status||1)}console.log('OK: BUILD SUCCESS');
