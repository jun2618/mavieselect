const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_ORDER_NO_INVENTED_ITEM_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const old=[
"        const productRange=ws.range('B'+r+':F'+r)",
"        try{if(!productRange.merged())productRange.merged(true)}catch{}",
"        const useSplit=String(order.estimateCopyFormat||'combined')==='split'",
"        if(useSplit){",
"          ws.cell('A'+r).value(parts[0]||'')",
"          ws.cell('B'+r).value(parts.slice(1).filter(Boolean).join(' ')||row.name||'')",
"        }else{",
"          ws.cell('A'+r).value('')",
"          ws.cell('B'+r).value(parts.filter(Boolean).join(' ')||row.name||'')",
"        }"
].join('\n');
const neu=[
"        /* "+marker+" */",
"        const productRange=ws.range('B'+r+':F'+r)",
"        try{if(!productRange.merged())productRange.merged(true)}catch{}",
"        const useSplit=String(order.estimateCopyFormat||'combined')==='split'",
"        const originalItem=String(parts[0]||'').trim()",
"        const originalProduct=parts.slice(1).filter(Boolean).join(' ').trim()",
"        if(useSplit && originalItem && originalProduct){",
"          ws.cell('A'+r).value(originalItem)",
"          ws.cell('B'+r).value(originalProduct)",
"        }else{",
"          ws.cell('A'+r).value('')",
"          ws.cell('B'+r).value(row.name||parts.filter(Boolean).join(' ')||'')",
"        }"
].join('\n');
const n=s.split(old).length-1;
if(n!==1){console.error('ERROR: layout block MATCH='+n+'; no changes');process.exit(1)}
const backup=file+'.before-order-no-invented-item-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);s=s.replace(old,neu);fs.writeFileSync(file,s,'utf8');
console.log('OK: purchase order will not invent item labels');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
