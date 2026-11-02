const fs=require('fs'),cp=require('child_process'),path=require('path');
const root=process.cwd();
const jsx=path.join(root,'src','CostCalculationPage.jsx');
const css=path.join(root,'src','CostCalculationPage.css');
const marker='M-CROSS_COST_CLEAN_REBUILD_V40_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: CostCalculationPage files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8');
if(j.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const stamp=Date.now(),bj=jsx+'.before-clean-v40-'+stamp+'.bak',bc=css+'.before-clean-v40-'+stamp+'.bak';
fs.copyFileSync(jsx,bj);fs.copyFileSync(css,bc);

// Remove the No. header and every known historical No. row element.
j=j.replace('<span>No.</span>','');
j=j.replace(/<div className="costPlainNoCell">\{i\+1\}<\/div>(?:\{\/\*[^*]*\*\/\})?/g,'');
j=j.replace(/<span className="costRowNumber">\{i\+1\}<\/span>(?:\{\/\*[^*]*\*\/\})?/g,'');
j=j.replace(/<div className="costNoSpacer"><\/div>/g,'');
// Add exactly one marker near the page root.
j=j.replace('return <div className={\'costPage \'+printDensity}',`/* ${marker} */\n  return <div className={'costPage '+printDensity}`);
if(!j.includes(marker)){console.error('ERROR: page root anchor not found; no changes');process.exit(1)}

const cleanCss=`/* ${marker} */
:root{--ink:#273250;--line:#8190a5;--paper:#fff;--head:#e8eef6;--pink:#fde8ef;--green:#e2f5ee;--blue:#e4f0ff;--orange:#fff0e3}
.costPage,.costPage *{box-sizing:border-box}
.costPage{max-width:1180px;margin:0 auto;padding:8px 10px;background:#fff;color:var(--ink);font-family:"BIZ UDPGothic","BIZ UDP Gothic","Yu Gothic UI","Yu Gothic",Meiryo,sans-serif}
.costHero{display:grid;grid-template-columns:1fr auto;align-items:center;padding:5px 8px;border-bottom:2px solid #4d86b4}
.costHero h1{margin:0;font-size:28px;font-weight:800}.costHeroActions{display:flex;gap:6px}.costHeroActions button,.sectionTotal button{border:1px solid #aeb9c8;border-radius:8px;background:#fff;padding:5px 9px;font:inherit;font-weight:700}
.costBrand{display:none}
.costInfoCard{display:grid;grid-template-columns:52px minmax(0,1fr) 58px 120px 58px 145px;gap:3px 6px;padding:5px 7px;border:1px solid #a7b2c2;margin:4px 0}.costInfoCard label{display:contents}.costInfoCard label>span{display:flex;align-items:center;justify-content:center;background:#edf1f6;border:1px solid #c5cdd9;font-size:12px;font-weight:800}.costInfoCard input{min-width:0;height:27px;border:1px solid #c5cdd9;padding:2px 6px;font:inherit;font-size:13px}.costPropertyCombined>div{display:grid;grid-template-columns:minmax(0,1fr) 75px;gap:5px}
.costKpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:5px 0}.costKpis article{display:grid;grid-template-columns:42px 1fr;grid-template-rows:auto 1fr auto;min-height:68px;padding:6px 8px;border:1px solid #b8c3d0;border-radius:12px}.costKpis .estimate{background:var(--pink)}.costKpis .cost{background:var(--green)}.costKpis .profit{background:var(--blue)}.costKpis .margin{background:var(--orange)}.kpiArt{grid-row:1/4;display:grid;place-items:center;width:36px;height:36px;align-self:center}.kpiArt svg{width:30px;height:30px;fill:currentColor}.costKpis article>span{font-size:11px;font-weight:800}.costKpis article>strong,.estimateAmountEditor{font-size:24px;font-weight:800;line-height:1}.costKpis article>small{font-size:9px}.estimateAmountEditor{display:flex;align-items:baseline;min-width:0}.estimateAmountEditor input{width:100%;min-width:0;border:0;background:transparent;font:inherit;color:inherit;padding:0}.estimateYen{font:inherit}
.costSection{margin:4px 0;border:1px solid var(--line)}.costSection>header{display:flex;align-items:center;justify-content:space-between;min-height:31px;padding:3px 7px;border-bottom:1px solid var(--line)}.costSection.blue>header{background:#e8f2ff}.costSection.pink>header{background:#fde8ef}.costSection.green>header{background:#e6f6ef}.costSection.purple>header{background:#f1e8ff}.costSection.gray>header{background:#edf0f4}.costSectionTitle{display:flex;align-items:center;gap:6px}.costSectionIcon{display:grid;place-items:center;width:24px;height:24px}.costSectionIcon svg{width:18px;height:18px;fill:currentColor}.costNumberBadge{display:none}.costSectionTitle strong{font-size:14px}.costSectionTitle small{font-size:9px}.sectionTotal{display:flex;align-items:center;gap:7px}.sectionTotal>span{font-size:10px}.sectionTotal>strong{min-width:78px;text-align:right;font-size:18px}
.costTable{overflow:auto}.costHead,.costRow{display:grid;grid-template-columns:minmax(150px,1.35fr) minmax(125px,1fr) 58px 50px 82px 92px 102px 40px;min-width:820px}.costHead>*{display:flex;align-items:center;justify-content:center;height:25px;background:var(--head);font-size:11px;font-weight:800;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.costHead>*:first-child{border-left:0}.costRow>*{height:31px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:2px 4px}.costRow input{width:100%;height:26px;border:0;background:transparent;padding:1px 5px;font:inherit;font-size:12px}.costRow>strong,.taxIncludedCell{display:flex;align-items:center;justify-content:flex-end;font-size:13px;font-weight:800}.taxIncludedCell{background:#fff9f0}.taxIncludedCell input{text-align:right}.costRow>button{display:grid;place-items:center;margin:auto;width:22px;height:22px;border:1px solid #efaac0;border-radius:50%;background:#fff4f8;color:#c94f79}.costEmpty{padding:12px;text-align:center}
.costBottom,.costPrintOnly{display:none}
@media(max-width:820px){.costPage{padding:6px}.costInfoCard{grid-template-columns:64px minmax(0,1fr)}.costKpis{grid-template-columns:repeat(2,minmax(0,1fr))}.costHead,.costRow{min-width:760px}}
@media print{
 @page{size:A4 portrait;margin:3mm}
 html,body,#root{margin:0;padding:0;background:#fff}
 .costPage{width:204mm;max-width:204mm;margin:0;padding:0;color:#111;zoom:1}
 .costHero{padding:.5mm 1mm}.costHero h1{font-size:14pt}.costHeroActions,.sectionTotal button,.costRow>button{display:none}
 .costInfoCard{grid-template-columns:12mm minmax(0,1fr) 13mm 23mm 13mm 27mm;gap:.3mm .8mm;padding:.5mm .8mm;margin:.5mm 0}.costInfoCard label>span,.costInfoCard input{height:4.5mm;font-size:5.8pt;padding:.1mm .5mm}
 .costKpis{gap:.8mm;margin:.6mm 0}.costKpis article{min-height:13mm;padding:.6mm .8mm;border-radius:1.5mm}.kpiArt{width:6mm;height:6mm}.kpiArt svg{width:4.7mm;height:4.7mm}.costKpis article>span{font-size:5.3pt}.costKpis article>strong,.estimateAmountEditor{font-size:11.5pt}.costKpis article>small{font-size:4.2pt}
 .costSection{margin:.55mm 0;break-inside:avoid}.costSection>header{min-height:4.7mm;padding:.2mm .7mm}.costSectionIcon{width:3.7mm;height:3.7mm}.costSectionIcon svg{width:2.8mm;height:2.8mm}.costSectionTitle strong{font-size:6.4pt}.costSectionTitle small{font-size:4.2pt}.sectionTotal>span{font-size:4.4pt}.sectionTotal>strong{font-size:7pt}
 .costTable{overflow:visible}.costHead,.costRow{grid-template-columns:minmax(31mm,1.35fr) minmax(24mm,1fr) 11mm 10mm 16mm 18mm 21mm 7mm;min-width:0}.costHead>*{height:4mm;font-size:5.3pt;border-right:.22mm solid #66758a;border-bottom:.22mm solid #66758a}.costRow>*{height:4.7mm;padding:.1mm .35mm;border-right:.22mm solid #66758a;border-bottom:.22mm solid #8390a2}.costRow input{height:4.2mm;padding:0 .3mm;font-size:5.8pt}.costRow>strong,.taxIncludedCell{font-size:6.1pt}.costEmpty{display:none}
}
`;
fs.writeFileSync(jsx,j,'utf8');
fs.writeFileSync(css,cleanCss,'utf8');
console.log('OK: Cost page rebuilt cleanly V40');
console.log('BACKUP JSX:',bj);console.log('BACKUP CSS:',bc);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
