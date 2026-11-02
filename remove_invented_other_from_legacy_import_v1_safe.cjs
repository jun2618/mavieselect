const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_LEGACY_NO_INVENTED_OTHER_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const old="const classify=raw=>{const full=text(raw).replace(/[\\s　]+/g,' ').trim();const names=['浴室','トイレ','キッチン','台所','居間','洋室','和室','玄関','廊下','洗面所'];const room=names.find(n=>full.startsWith(n))||'その他';const work=room==='その他'?full:full.slice(room.length).trim();return{room,work:work||full}}";
const neu="/* "+marker+" */ const classify=raw=>{const full=text(raw).replace(/[\\s　]+/g,' ').trim();const names=['浴室','トイレ','キッチン','台所','居間','洋間','洋室','和室','玄関','廊下','洗面所'];const room=names.find(n=>full.startsWith(n))||'';const work=room?full.slice(room.length).trim():full;return{room,work:work||full}}";
const n=s.split(old).length-1;
if(n!==1){console.error('ERROR: legacy classify MATCH='+n+'; no changes');process.exit(1)}
const backup=file+'.before-legacy-no-invented-other-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);s=s.replace(old,neu);fs.writeFileSync(file,s,'utf8');
console.log('OK: invented Other removed; recognized room names only');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
