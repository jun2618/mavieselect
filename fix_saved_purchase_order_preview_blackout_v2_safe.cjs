const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_SAVED_ORDER_PREVIEW_READONLY_V2_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const start=s.indexOf('className="purchaseOrderPreviewItems"');
const end=s.indexOf('/* M-CROSS_PURCHASE_ORDER_ACCESS_PREVIEW_V1_SAFE */',start);
if(start<0||end<0){console.error('ERROR: saved-order preview range not found; no changes');process.exit(1)}
let head=s.slice(0,start),block=s.slice(start,end),tail=s.slice(end);
const pattern=/\{item\.category==='material'\?<div className="materialProductCell"><input value=\{item\.label\}[\s\S]*?\/><\/div>\s*:<strong>\{item\.label\}<\/strong>\}/;
if(!pattern.test(block)){console.error('ERROR: editable material preview input not found; no changes');process.exit(1)}
block=block.replace(pattern,`{/* ${marker} */}<strong>{item.label||item.productCode||'品番未入力'}</strong>`);
const backup=f+'.before-saved-order-preview-readonly-v2-'+Date.now()+'.bak';
fs.copyFileSync(f,backup);fs.writeFileSync(f,head+block+tail,'utf8');
console.log('OK: saved purchase-order preview made read-only');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
