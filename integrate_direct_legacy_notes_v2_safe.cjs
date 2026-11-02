const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_DIRECT_LEGACY_EXCEL_PICKER_V2_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let src=fs.readFileSync(file,'utf8');
if(src.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(src.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const start=src.indexOf('async function downloadEstimateExcel(');
const end=src.indexOf('async function downloadCombinedEstimateMeasurementExcel(',start);
if(start<0||end<0){console.error('ERROR: target function range not found');process.exit(1)}
let head=src.slice(0,start),fn=src.slice(start,end),tail=src.slice(end);
function once(label,a,b){const n=fn.split(a).length-1;if(n!==1){console.error('ERROR: '+label+' MATCH='+n+'. No changes made.');process.exit(1)}fn=fn.replace(a,b)}
const nl=fn.includes('\r\n')?'\r\n':'\n';
const tryAnchor='  try {';
once('picker',tryAnchor,[tryAnchor,'    /* '+marker+' */',"    const legacyFile=await new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept='.xlsm,.xlsx';input.onchange=()=>resolve(input.files?.[0]||null);input.click()})",'    if(!legacyFile)return'].join(nl));
const init="    if (!XlsxPopulate?.fromDataAsync) throw new Error('xlsx-populateブラウザ版を初期化できません')";
once('workbook load',init,init+nl+'    const legacyWorkbook=await XlsxPopulate.fromDataAsync(await legacyFile.arrayBuffer())');
const wsAnchor="    if (!ws) throw new Error('「見積書」シートが見つかりません')";
const copy=[wsAnchor,"    const legacyWs=legacyWorkbook.sheet('見積書')","    if(!legacyWs)throw new Error('元工事カードに「見積書」シートが見つかりません')","    let copiedLegacyNotes=0","    for(let r=22;r<=56;r++){for(const c of ['L','M','N','O','P','Q']){const v=legacyWs.cell(c+r).value();if(v!==undefined&&v!==null&&String(v).trim()){ws.cell(c+r).value(v);copiedLegacyNotes++}}}","    for(const c of ['L','M','N','O','P','Q']){try{ws.column(c).width(legacyWs.column(c).width())}catch{}}","    if(!copiedLegacyNotes)throw new Error('元工事カードのL～Q列・22～56行に文章が見つかりません')"].join(nl);
once('copy notes',wsAnchor,copy);
const next=head+fn+tail;
const backup=file+'.before-direct-legacy-picker-v2-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
console.log('OK: integration applied');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}console.log('OK: BUILD SUCCESS');
