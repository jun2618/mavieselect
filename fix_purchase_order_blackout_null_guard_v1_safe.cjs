const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_PURCHASE_ORDER_BLACKOUT_NULL_GUARD_V1_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const start=s.indexOf('className="purchaseOrderPreviewItems"');
const end=s.indexOf('/* M-CROSS_MATERIAL_ORDER_REFERENCE_V5_SAFE */',start);
if(start<0||end<0){console.error('ERROR: purchase order preview range not found; no changes');process.exit(1)}
let head=s.slice(0,start), block=s.slice(start,end), tail=s.slice(end);
const before=block;
block=block.replaceAll('(selected.items||[])','(selected?.items||[])')
           .replaceAll('selected.orderMode','selected?.orderMode')
           .replaceAll('selected.propertyAccess','selected?.propertyAccess')
           .replaceAll('selected.status','selected?.status')
           .replaceAll('selected.id','selected?.id');
if(block===before){console.error('ERROR: no unsafe selected references found; no changes');process.exit(1)}
block='/* '+marker+' */\n'+block;
const backup=f+'.before-purchase-order-null-guard-'+Date.now()+'.bak';
fs.copyFileSync(f,backup);fs.writeFileSync(f,head+block+tail,'utf8');
console.log('OK: purchase order preview null guards added');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
