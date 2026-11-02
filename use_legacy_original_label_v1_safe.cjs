const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_LEGACY_RAW_LABEL_OUTPUT_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let src=fs.readFileSync(file,'utf8');
if(src.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(src.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const start=src.indexOf('async function downloadCombinedEstimateMeasurementExcel(');
const end=src.indexOf('async function downloadEstimateExcelLegacy(',start);
if(start<0||end<0){console.error('ERROR: combined export function not found');process.exit(1)}
let head=src.slice(0,start),fn=src.slice(start,end),tail=src.slice(end);
function once(label,a,b){const n=fn.split(a).length-1;if(n!==1){console.error('ERROR: '+label+' MATCH='+n+'; no changes');process.exit(1)}fn=fn.replace(a,b)}
const nl=fn.includes('\r\n')?'\r\n':'\n';
const amount="      amount:item.amount===''||item.amount==null?'':Number(item.amount||0)";
once('carry raw label',amount,amount+','+nl+"      legacyRawLabel:String(item.legacyRawLabel||'')");
const anchor="      const q=[0,1,2,3].map(j=>raw[j]||'')";
const block=[anchor,`      /* ${marker} */`,`      if(row.legacyRawLabel){`,`        const rg=ws.range('C'+r+':G'+r);if(!rg.merged())rg.merged(true)`,`        ws.cell('C'+r).value(row.legacyRawLabel)`,`      }else if(format==='split'){`].join(nl);
once('raw label branch start',anchor+nl+"      if(format==='split'){",block);
const oldEnd=["      }else{","        const rg=ws.range('C'+r+':G'+r);if(!rg.merged())rg.merged(true)","        ws.cell('C'+r).value(raw.filter(Boolean).join(' '))","      }"].join(nl);
// Existing else belongs to the newly inserted else-if and remains structurally correct; no second change needed.
const next=head+fn+tail,backup=file+'.before-legacy-raw-label-output-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
console.log('OK: legacy original C-cell labels enabled');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}console.log('OK: BUILD SUCCESS');
