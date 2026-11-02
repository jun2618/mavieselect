const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_ORDER_LAYOUT_FOLLOWS_ESTIMATE_FORMAT_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=file+'.before-order-layout-follows-estimate-'+Date.now()+'.bak';

function replaceOnce(label,oldText,newText){
  const n=s.split(oldText).length-1;
  if(n!==1){console.error('ERROR: '+label+' MATCH='+n+'; no changes');process.exit(1)}
  s=s.replace(oldText,newText);
}

// Save the estimate display mode into newly created purchase orders.
const snapshotNeedle="      orderMode:orderDraft.orderMode||'service',orderMode:orderDraft.orderMode||'service',contractorId:";
const snapshotReplacement="      /* "+marker+" */\n      estimateCopyFormat:String(estimateCopyFormat||'combined'),\n      orderMode:orderDraft.orderMode||'service',orderMode:orderDraft.orderMode||'service',contractorId:";
replaceOnce('save estimateCopyFormat',snapshotNeedle,snapshotReplacement);

// Replace the previous parts-count based Excel layout with format-driven layout.
const rowNeedle=[
"        /* M-CROSS_ORDER_CELLS_MATCH_ESTIMATE_V1_SAFE */",
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
const rowReplacement=[
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
replaceOnce('purchase order layout',rowNeedle,rowReplacement);

fs.copyFileSync(file,backup);
fs.writeFileSync(file,s,'utf8');
console.log('OK: purchase-order layout now follows estimate split/combined mode');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
