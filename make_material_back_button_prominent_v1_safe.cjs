const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_MATERIAL_BACK_PROMINENT_V1_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const label='← 種類選択へ戻る';
const n=s.split(label).length-1;
if(n!==1){console.error('ERROR: back label MATCH='+n+'; no changes');process.exit(1)}
const backup=f+'.before-material-back-prominent-'+Date.now()+'.bak';
s=s.replace(label,'← 戻る');
const anchor='  /* M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE */';
const i=s.indexOf(anchor);
if(i<0){console.error('ERROR: CSS anchor not found; no changes');process.exit(1)}
const css=`  /* ${marker} */\n  .materialMobilePanel .orderDraftHeader>button{min-height:48px!important;padding:10px 18px!important;border:2px solid currentColor!important;border-radius:14px!important;font-size:16px!important;font-weight:900!important;box-shadow:0 4px 12px rgba(0,0,0,.14)!important}.materialMobilePanel .orderDraftHeader>button:focus-visible{outline:3px solid #6e91e8!important;outline-offset:2px!important}@media(max-width:620px){.materialMobilePanel .orderDraftHeader>button{min-width:112px!important;min-height:50px!important;font-size:17px!important}}\n`;
s=s.slice(0,i)+css+s.slice(i);
fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
console.log('OK: material back button renamed and emphasized');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
