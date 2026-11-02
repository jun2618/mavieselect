const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_LEGACY_IMPORT_DYNAMIC_LAST_ROW_V2_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let lines=fs.readFileSync(file,'utf8').split(/\r?\n/);
if(lines.some(x=>x.includes(marker))){console.log('ALREADY APPLIED');process.exit(0)}
const workIndex=lines.findIndex(x=>x.includes('for(let row=23;row<=56;row++){const raw=text(estimate.cell(\'C\'+row).value())'));
const noteIndex=lines.findIndex(x=>x.includes("for(let row=22;row<=56;row++)for(const col of ['L','M','N','O','P','Q'])"));
if(workIndex<0||noteIndex<0){console.error('ERROR: targets works='+workIndex+' notes='+noteIndex+'; no changes');process.exit(1)}
const indent=(lines[workIndex].match(/^\s*/)||[''])[0];
const originalWork=lines[workIndex];
const dynamic=[
indent+'/* '+marker+' */',
indent+"const legacyFooterLabels=new Set(['小計','消費税','消費税(10%)','消費税（10%）','合計','備考'])",
indent+'let legacyDetailLastRow=22',
indent+'for(let row=23;row<=300;row++){',
indent+"  const footerHit=['A','B','C','D','E','F','G','H','I','J','K'].some(col=>legacyFooterLabels.has(text(estimate.cell(col+row).value())))",
indent+'  if(footerHit)break',
indent+"  const hasDetail=['C','H','I','J','K'].some(col=>text(estimate.cell(col+row).value())!=='')",
indent+'  if(hasDetail)legacyDetailLastRow=row',
indent+'}',
originalWork.replace('for(let row=23;row<=56;row++)','for(let row=23;row<=legacyDetailLastRow;row++)')
];
lines.splice(workIndex,1,...dynamic);
const shiftedNote=lines.findIndex(x=>x.includes("for(let row=22;row<=56;row++)for(const col of ['L','M','N','O','P','Q'])"));
if(shiftedNote<0){console.error('ERROR: notes target shifted away; no changes');process.exit(1)}
lines[shiftedNote]=lines[shiftedNote].replace('for(let row=22;row<=56;row++)','for(let row=22;row<=legacyDetailLastRow;row++)');
const backup=file+'.before-legacy-row-limit-v2-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);fs.writeFileSync(file,lines.join('\n'),'utf8');
console.log('OK: legacy import row 56 limit removed V2');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
