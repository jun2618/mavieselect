const fs=require('fs'),cp=require('child_process'),path=require('path');
const jsx=path.join(process.cwd(),'src','CostCalculationPage.jsx');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_KPIS_FOUR_ACROSS_V23_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: CostCalculationPage files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8'), c=fs.readFileSync(css,'utf8');
if(j.includes(marker)||c.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const bj=jsx+'.before-kpis-four-v23-'+Date.now()+'.bak',bc=css+'.before-kpis-four-v23-'+Date.now()+'.bak';
fs.copyFileSync(jsx,bj);fs.copyFileSync(css,bc);

// Undo V22's extra metrics in the compact property header. Keep the compact estimate field there for now.
const metrics=`<label className="headerMetric cost"><span>原価合計</span><strong>\${yen(totalCost)}</strong></label><label className="headerMetric profit"><span>粗利益</span><strong>\${yen(profit)}</strong></label><label className="headerMetric margin"><span>粗利率</span><strong>\${margin.toFixed(1)}%</strong></label>`;
if(j.includes(metrics)) j=j.replace(metrics,'');
else {
  // tolerate actual JSX braces rather than escaped template notation
  const m2=`<label className="headerMetric cost"><span>原価合計</span><strong>{yen(totalCost)}</strong></label><label className="headerMetric profit"><span>粗利益</span><strong>{yen(profit)}</strong></label><label className="headerMetric margin"><span>粗利率</span><strong>{margin.toFixed(1)}%</strong></label>`;
  if(!j.includes(m2)){console.error('ERROR: V22 header metrics not found; no changes');process.exit(1)}
  j=j.replace(m2,'');
}

// Remove estimate from the compact header so it appears only in the KPI row.
const headerEstimate=`<label className="headerEstimate"><span>見積金額</span><div><b>¥</b><input type="number" value={info.estimate===''||info.estimate==null?0:info.estimate} onFocus={e=>e.currentTarget.select()} onChange={e=>setInfo({...info,estimate:e.target.value})}/></div></label>`;
if(!j.includes(headerEstimate)){console.error('ERROR: header estimate not found; no changes');process.exit(1)}
j=j.replace(headerEstimate,'');

// Restore the estimate KPI as the first card in the existing KPI strip.
const kpiOpen='<section className="costKpis">';
if(!j.includes(kpiOpen)){console.error('ERROR: costKpis section not found; no changes');process.exit(1)}
const estimateCard=`${kpiOpen}{/* ${marker} */}<article className="estimate"><i className="kpiArt"><KpiIcon type="estimate"/></i><span>見積金額（税抜）</span><div className="estimateAmountEditor"><span className="estimateYen">¥</span><input type="number" value={info.estimate===''||info.estimate==null?0:info.estimate} onFocus={e=>e.currentTarget.select()} onChange={e=>setInfo({...info,estimate:e.target.value})}/></div><small>税込 {yen(qty(info.estimate)*1.1)}</small></article>`;
j=j.replace(kpiOpen,estimateCard);

// Final override: exactly four equal cards across. Remove the V22 overflow-causing long header grid.
c+=`\n/* ${marker} */\n.costInfoMinimal{grid-template-columns:52px minmax(260px,1.8fr) 58px minmax(105px,.65fr) 58px minmax(135px,.75fr)!important;gap:3px 6px!important}.costKpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;margin:4px 0!important}.costKpis article{display:grid!important;min-width:0!important;min-height:66px!important;height:66px!important;padding:5px 7px!important;border-radius:14px!important;grid-template-columns:38px minmax(0,1fr)!important;grid-template-rows:auto 1fr auto!important}.kpiArt{grid-column:1!important;grid-row:1/4!important;width:34px!important;height:34px!important;border-radius:11px!important}.kpiArt svg{width:26px!important;height:26px!important}.costKpis article>span{grid-column:2!important;font-size:10px!important;line-height:1!important}.costKpis article>strong,.costKpis article>input,.costKpis .estimate .estimateAmountEditor{grid-column:2!important;font-size:22px!important;line-height:1!important;min-width:0!important}.costKpis .estimate .estimateAmountEditor input[type="number"],.estimateYen{font-size:22px!important}.costKpis article>small{grid-column:2!important;font-size:8px!important;line-height:1!important}.headerMetric{display:none!important}@media(max-width:820px){.costInfoMinimal{grid-template-columns:64px minmax(0,1fr)!important}.costKpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}.costKpis article{height:auto!important;min-height:74px!important}}@media print{.costInfoMinimal{grid-template-columns:12mm minmax(0,1.5fr) 13mm 24mm 13mm 28mm!important}.costKpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:.7mm!important;height:11mm!important;min-height:11mm!important;margin:.4mm 0!important}.costKpis article{height:11mm!important;min-height:11mm!important;padding:.4mm .7mm!important;border-radius:1.2mm!important;grid-template-columns:5.5mm minmax(0,1fr)!important}.kpiArt{width:5mm!important;height:5mm!important}.kpiArt svg{width:3.7mm!important;height:3.7mm!important}.costKpis article>span{font-size:4.1pt!important}.costKpis article>strong,.costKpis article>input,.costKpis .estimate .estimateAmountEditor,.costKpis .estimate .estimateAmountEditor input[type="number"],.estimateYen{font-size:8.6pt!important}.costKpis article>small{font-size:3.5pt!important}}\n`;

fs.writeFileSync(jsx,j,'utf8');fs.writeFileSync(css,c,'utf8');
console.log('OK: restored four KPI cards in one row V23');console.log('BACKUP JSX:',bj);console.log('BACKUP CSS:',bc);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
