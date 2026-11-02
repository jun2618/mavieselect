const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_LEGACY_ORDER_CATEGORY_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const old="exclusionKey: 'additionalWork:' + (item.id || index), category: 'additionalWork', additionalWorkId: item.id || '', additionalWorkIndex: index,";
const neu="/* "+marker+" */ exclusionKey: 'additionalWork:' + (item.id || index), category: ['cross','cf','soft','floorTrim'].includes(item.legacyTradeType) ? item.legacyTradeType : 'additionalWork', additionalWorkId: item.id || '', additionalWorkIndex: index,";
const n=s.split(old).length-1;
if(n!==1){console.error('ERROR: orderCandidate category MATCH='+n+'; no changes');process.exit(1)}
const backup=file+'.before-legacy-order-category-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);s=s.replace(old,neu);fs.writeFileSync(file,s,'utf8');
console.log('OK: legacy trade types connected to order categories');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
