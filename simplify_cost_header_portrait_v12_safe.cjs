const fs=require('fs'),cp=require('child_process'),path=require('path');
const root=process.cwd();
const jsx=path.join(root,'src','CostCalculationPage.jsx');
const css=path.join(root,'src','CostCalculationPage.css');
const marker='M-CROSS_COST_HEADER_PORTRAIT_V12_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: CostCalculationPage files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8'), c=fs.readFileSync(css,'utf8');
if(j.includes(marker)||c.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const bj=jsx+'.before-header-v12-'+Date.now()+'.bak';
const bc=css+'.before-header-v12-'+Date.now()+'.bak';
fs.copyFileSync(jsx,bj); fs.copyFileSync(css,bc);

// Replace the old 7-field property block with a compact 4-field block.
const old=`<section className="costInfoCard">{[['物件名','propertyName'],['管理会社','company'],['号室','unit'],['工事内容','workName'],['住所','address'],['担当','staff'],['工期','period']].map(([l,k])=><label className={k==='address'?'wide':''} key={k}><span>{l}</span><input value={info[k]} onChange={e=>setInfo({...info,[k]:e.target.value})}/></label>)}</section>`;
const neu=`<section className="costInfoCard costInfoCompact">{/* ${marker} */}<label className="costPropertyCombined"><span>物件</span><div><input className="propertyName" value={info.propertyName} onChange={e=>setInfo({...info,propertyName:e.target.value})} placeholder="物件名"/><input className="propertyUnit" value={info.unit} onChange={e=>setInfo({...info,unit:e.target.value})} placeholder="号室"/></div></label><label><span>管理会社</span><input value={info.company} onChange={e=>setInfo({...info,company:e.target.value})}/></label><label><span>担当</span><input value={info.staff} onChange={e=>setInfo({...info,staff:e.target.value})}/></label><label><span>完了日</span><input type="date" value={info.period||''} onChange={e=>setInfo({...info,period:e.target.value})}/></label></section>`;
const count=j.split(old).length-1;
if(count!==1){console.error('ERROR: info block MATCH='+count+'; no changes');process.exit(1)}
j=j.replace(old,neu);

// Keep the regular visible page for print. Disable the alternate print-only summary introduced by V10.
c+=`\n/* ${marker} */\n.costInfoCompact{grid-template-columns:84px minmax(0,1.45fr) 84px minmax(0,1fr)!important;gap:4px 8px!important;padding:5px 7px!important}.costInfoCompact label{display:contents!important}.costPropertyCombined>div{display:grid!important;grid-template-columns:minmax(0,1fr) 86px!important;gap:5px!important}.costPropertyCombined .propertyUnit{text-align:center!important}.costInfoCompact label>span{display:flex;align-items:center;justify-content:center}.costPrintOnly{display:none!important}\n@media(max-width:820px){.costInfoCompact{grid-template-columns:72px minmax(0,1fr)!important}.costPropertyCombined>div{grid-template-columns:minmax(0,1fr) 72px!important}.costInfoCompact input{min-width:0!important}}\n@media print{\n @page{size:A4 portrait;margin:3mm}\n .costPrintOnly{display:none!important}\n .costSection,.costBottom{display:block!important}\n .costInfoCompact{display:grid!important;grid-template-columns:18mm minmax(0,1.45fr) 18mm minmax(0,1fr)!important;gap:.5mm 1.2mm!important;padding:.8mm 1mm!important}.costInfoCompact label{display:contents!important}.costPropertyCombined>div{display:grid!important;grid-template-columns:minmax(0,1fr) 17mm!important;gap:1mm!important}.costInfoCompact label>span,.costInfoCompact input{font-size:5.2pt!important;min-height:5mm!important;padding:.2mm .7mm!important}\n}\n`;
fs.writeFileSync(jsx,j,'utf8'); fs.writeFileSync(css,c,'utf8');
console.log('OK: cost header simplified for portrait V12');
console.log('BACKUP JSX:',bj); console.log('BACKUP CSS:',bc);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
