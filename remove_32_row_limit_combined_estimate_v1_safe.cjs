const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_COMBINED_ESTIMATE_DYNAMIC_ROWS_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=file+'.before-combined-estimate-dynamic-rows-'+Date.now()+'.bak';
const oldLimit="    if(out.length>32)throw new Error('見積明細は32行まで出力できます。現在 '+out.length+'行あります。')";
const n=s.split(oldLimit).length-1;
if(n!==1){console.error('ERROR: combined 32-row limit MATCH='+n+'; no changes');process.exit(1)}
s=s.replace(oldLimit,`    /* ${marker} */\n    const extraEstimateRows=Math.max(0,out.length-32)\n    const estimateLastRow=54+extraEstimateRows\n    const subtotalRow=55+extraEstimateRows\n    const taxRow=56+extraEstimateRows\n    const totalRow=57+extraEstimateRows\n    if(extraEstimateRows>0){\n      for(let sourceRow=57;sourceRow>=55;sourceRow--){\n        const targetRow=sourceRow+extraEstimateRows\n        const sourceRange=ws.range('A'+sourceRow+':Q'+sourceRow)\n        const targetRange=ws.range('A'+targetRow+':Q'+targetRow)\n        targetRange.copyFrom(sourceRange,'all')\n        try{ws.row(targetRow).height(ws.row(sourceRow).height())}catch{}\n      }\n      for(let r=55;r<=estimateLastRow;r++){\n        ws.range('A54:Q54').copyTo(ws.range('A'+r+':Q'+r),'all')\n        try{ws.row(r).height(ws.row(54).height())}catch{}\n      }\n    }`);
const oldClear="    for(let r=23;r<=54;r++){try{const rg=ws.range('C'+r+':G'+r);if(rg.merged())rg.merged(false)}catch{};for(const c of ['C','D','E','F','G','H','I','J','K'])ws.cell(c+r).value('')}";
const newClear="    for(let r=23;r<=estimateLastRow;r++){try{const rg=ws.range('C'+r+':G'+r);if(rg.merged())rg.merged(false)}catch{};for(const c of ['C','D','E','F','G','H','I','J','K'])ws.cell(c+r).value('')}";
if(s.split(oldClear).length-1!==1){console.error('ERROR: detail clear block mismatch; no changes');process.exit(1)}
s=s.replace(oldClear,newClear);
const oldTotals="    const subtotal=out.reduce((sum,row)=>sum+(row.amount===''||row.amount==null?0:(Number(row.amount)||0)),0),tax=Math.floor(subtotal*.1),total=subtotal+tax;ws.cell('K55').value(subtotal);ws.cell('K56').value(tax);ws.cell('K57').value(total);ws.cell('E19').value(total)";
const newTotals="    const subtotal=out.reduce((sum,row)=>sum+(row.amount===''||row.amount==null?0:(Number(row.amount)||0)),0),tax=Math.floor(subtotal*.1),total=subtotal+tax;ws.cell('K'+subtotalRow).value(subtotal);ws.cell('K'+taxRow).value(tax);ws.cell('K'+totalRow).value(total);ws.cell('E19').value(total)";
if(s.split(oldTotals).length-1!==1){console.error('ERROR: totals block mismatch; no changes');process.exit(1)}
s=s.replace(oldTotals,newTotals);
fs.copyFileSync(file,backup);fs.writeFileSync(file,s,'utf8');
console.log('OK: combined estimate 32-row limit removed');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
console.log('NOTE: This changes only the combined estimate/measurement Excel export.');
