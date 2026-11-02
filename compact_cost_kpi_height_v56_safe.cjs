const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_KPI_COMPACT_V56_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-kpi-compact-v56-'+Date.now()+'.bak';fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* KPI cards: reduce vertical height only, preserve 4-column layout and large numbers. */\n.cc-kpis{gap:7px!important;margin:4px 0!important}\n.cc-kpis article{min-height:54px!important;height:54px!important;padding:3px 9px!important;border-radius:13px!important;grid-template-columns:40px 1fr!important;grid-template-rows:16px 27px 11px!important}\n.cc-kpis svg{width:31px!important;height:31px!important}\n.cc-kpis b{font-size:11px!important;line-height:1!important}\n.cc-kpis strong,.cc-kpis label{font-size:25px!important;line-height:1!important;margin:0!important}\n.cc-kpis small{font-size:8px!important;line-height:1!important}\n.cc-kpis label input{height:27px!important;min-height:0!important;padding:0!important;line-height:1!important}\n@media print{.cc-kpis{gap:.6mm!important;margin:.35mm 0!important}.cc-kpis article{min-height:8mm!important;height:8mm!important;padding:.25mm .6mm!important;border-radius:1mm!important;grid-template-columns:5mm 1fr!important;grid-template-rows:2.5mm 4mm 1.5mm!important}.cc-kpis svg{width:4mm!important;height:4mm!important}.cc-kpis b{font-size:4.3pt!important}.cc-kpis strong,.cc-kpis label{font-size:9pt!important}.cc-kpis label input{height:4mm!important}.cc-kpis small{font-size:3.3pt!important}}\n`;
fs.writeFileSync(css,s,'utf8');
console.log('OK: KPI cards compacted further V56');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
