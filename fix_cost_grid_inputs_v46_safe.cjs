const fs=require('fs'),cp=require('child_process'),path=require('path');
const css=path.join(process.cwd(),'src','CostCalculationPage.css');
const marker='M-CROSS_COST_GRID_INPUTS_V46_SAFE';
if(!fs.existsSync(css)){console.error('ERROR: CostCalculationPage.css not found');process.exit(1)}
let s=fs.readFileSync(css,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=css+'.before-grid-inputs-v46-'+Date.now()+'.bak';
fs.copyFileSync(css,backup);
s+=`\n/* ${marker} */\n/* V45の .costRow input { border:0!important } が入力列の罫線まで消していた。\n   入力欄自身を表セルとして黒罫線で描く。 */\n.costRow>input{border-top:0!important;border-left:0!important;border-right:1px solid #303746!important;border-bottom:1px solid #303746!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;margin:0!important}\n.costRow>input:first-child{border-left:1px solid #303746!important}\n.costRow>.taxIncludedCell,.costRow>strong,.costRow>button{border-right:1px solid #303746!important;border-bottom:1px solid #303746!important}\n.costHead>*{border-color:#303746!important}\n@media print{.costRow>input{border-top:0!important;border-left:0!important;border-right:.24mm solid #111!important;border-bottom:.24mm solid #111!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;margin:0!important}.costRow>input:first-child{border-left:.24mm solid #111!important}.costRow>.taxIncludedCell,.costRow>strong{border-right:.24mm solid #111!important;border-bottom:.24mm solid #111!important}.costHead>*{border-color:#111!important}}\n`;
fs.writeFileSync(css,s,'utf8');
console.log('OK: input-cell black grid restored V46');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,css);console.error('ERROR: build failed; CSS restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
