const fs=require('fs'),cp=require('child_process'),path=require('path');
const root=process.cwd();
const jsx=path.join(root,'src','CostCalculationPage.jsx');
const css=path.join(root,'src','CostCalculationPage.css');
const marker='M-CROSS_COST_NO_COLUMN_FINAL_V34_SAFE';
if(!fs.existsSync(jsx)||!fs.existsSync(css)){console.error('ERROR: CostCalculationPage files not found');process.exit(1)}
let j=fs.readFileSync(jsx,'utf8'),c=fs.readFileSync(css,'utf8');
if(j.includes(marker)||c.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const bj=jsx+'.before-no-final-v34-'+Date.now()+'.bak';
const bc=css+'.before-no-final-v34-'+Date.now()+'.bak';
fs.copyFileSync(jsx,bj);fs.copyFileSync(css,bc);

// Give the No. cell its own class so old first-child rules can no longer control it ambiguously.
const old='<span>{i+1}</span><input value={r.name}';
const neu=`<span className="costRowNumber">{i+1}</span>{/* ${marker} */}<input value={r.name}`;
const count=j.split(old).length-1;
if(count!==1){console.error('ERROR: row number JSX MATCH='+count+'; no changes');process.exit(1)}
j=j.replace(old,neu);

// Final authoritative rule. Keep it simple: ordinary centered grid cell, no badge/flex/position/transform.
c+=`\n/* ${marker} */\n.costRow .costRowNumber{display:grid!important;place-items:center!important;position:static!important;transform:none!important;float:none!important;width:auto!important;min-width:0!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#263552!important;font-weight:700!important;text-align:center!important;line-height:normal!important;overflow:hidden!important}\n@media(max-width:820px){.costRow .costRowNumber{grid-column:1!important;grid-row:auto!important;display:grid!important;place-items:center!important;width:auto!important;height:100%!important;min-height:0!important;padding:0!important;border-radius:0!important;background:transparent!important}}\n@media print{.costRow .costRowNumber{display:grid!important;place-items:center!important;position:static!important;transform:none!important;width:auto!important;min-width:0!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;color:#111!important;font-weight:600!important;text-align:center!important;line-height:normal!important;overflow:hidden!important}.costHead>span:first-child{display:grid!important;place-items:center!important;padding:0!important;line-height:normal!important}}\n`;

fs.writeFileSync(jsx,j,'utf8');
fs.writeFileSync(css,c,'utf8');
console.log('OK: No. column final class applied V34');
console.log('BACKUP JSX:',bj);
console.log('BACKUP CSS:',bc);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(bj,jsx);fs.copyFileSync(bc,css);console.error('ERROR: build failed; files restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
