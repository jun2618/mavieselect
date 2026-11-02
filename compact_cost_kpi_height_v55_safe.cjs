const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_KPI_COMPACT_V55_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-kpi-compact-v55-'+Date.now()+'.bak';fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* KPI4枚だけ高さを短く。横幅・表・計算ロジックは変更しない。 */\n.cc-kpis article{min-height:68px!important;padding:6px 11px!important}\n.cc-kpis svg{width:36px!important;height:36px!important}\n.cc-kpis b{font-size:13px!important;line-height:1.05!important}\n.cc-kpis strong,.cc-kpis label{font-size:27px!important;line-height:1!important}\n.cc-kpis small{font-size:10px!important;line-height:1!important}\n@media print{.cc-kpis article{min-height:10.5mm!important;padding:.4mm .8mm!important}.cc-kpis svg{width:4.7mm!important;height:4.7mm!important}.cc-kpis b{font-size:4.9pt!important}.cc-kpis strong,.cc-kpis label{font-size:10pt!important}.cc-kpis small{font-size:3.8pt!important}}\n`;
fs.writeFileSync(css,s,'utf8');
console.log('OK: KPI card height compacted V55');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
