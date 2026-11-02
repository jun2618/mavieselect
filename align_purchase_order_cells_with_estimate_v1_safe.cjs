const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_ORDER_CELLS_MATCH_ESTIMATE_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const old="        if(parts.some(Boolean)){ws.cell('B'+r).value(parts[0]||'');ws.cell('C'+r).value(parts[1]||'');ws.cell('D'+r).value(parts[2]||'');ws.cell('E'+r).value(parts[3]||'')}else{ws.cell('B'+r).value(row.name)}";
const neu=[
"        /* "+marker+" */",
"        const splitParts=parts.filter(Boolean)",
"        const hasSeparatedItem=splitParts.length>=2",
"        const productRange=ws.range('B'+r+':F'+r)",
"        try{if(!productRange.merged())productRange.merged(true)}catch{}",
"        if(hasSeparatedItem){",
"          ws.cell('A'+r).value(parts[0]||'')",
"          ws.cell('B'+r).value(parts.slice(1).filter(Boolean).join(' '))",
"        }else{",
"          ws.cell('A'+r).value('')",
"          ws.cell('B'+r).value(row.name||parts[0]||'')",
"        }"
].join('\n');
const n=s.split(old).length-1;if(n!==1){console.error('ERROR: purchase-order row writer MATCH='+n+'; no changes');process.exit(1)}
const backup=file+'.before-order-cells-match-estimate-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);s=s.replace(old,neu);fs.writeFileSync(file,s,'utf8');
console.log('OK: purchase-order cell layout aligned with estimate structure');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
