const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_SEPARATE_LEGACY_IMPORT_EXPORT_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let src=fs.readFileSync(file,'utf8');
if(src.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(src.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=file+'.before-separate-legacy-import-export-'+Date.now()+'.bak';
const nl=src.includes('\r\n')?'\r\n':'\n';
function count(x){return src.split(x).length-1}
function one(label,a,b){const n=count(a);if(n!==1){console.error('ERROR: '+label+' MATCH='+n+'; no changes');process.exit(1)}src=src.replace(a,b)}

// 1) Preserve original source cell along with row/text during normalization.
const normOld="legacyEstimateNotes: Array.isArray(value.legacyEstimateNotes) ? value.legacyEstimateNotes.map(note => ({ row: Number(note?.row || 0), text: String(note?.text || '') })).filter(note => note.row > 0 && note.text) : []";
const normNew="legacyEstimateNotes: Array.isArray(value.legacyEstimateNotes) ? value.legacyEstimateNotes.map(note => ({ row: Number(note?.row || 0), cell: String(note?.cell || ''), text: String(note?.text || '') })).filter(note => note.row > 0 && note.text) : []";
one('preserve note cell',normOld,normNew);

// 2) Remove old-card file picker from the normal combined export.
const fnStart=src.indexOf('async function downloadCombinedEstimateMeasurementExcel(');
const fnEnd=src.indexOf('async function downloadEstimateExcelLegacy(',fnStart);
if(fnStart<0||fnEnd<0){console.error('ERROR: combined export function range not found; no changes');process.exit(1)}
let head=src.slice(0,fnStart),fn=src.slice(fnStart,fnEnd),tail=src.slice(fnEnd);
const picker=`    /* M-CROSS_COMBINED_DIRECT_LEGACY_EXCEL_PICKER_V1_SAFE */${nl}    const legacyFile=await new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept='.xlsm,.xlsx';input.onchange=()=>resolve(input.files?.[0]||null);input.click()})${nl}    if(!legacyFile)return${nl}`;
if(fn.includes(picker)) fn=fn.replace(picker,'');
const load=`    const legacyWorkbook=await XlsxPopulate.fromDataAsync(await legacyFile.arrayBuffer())${nl}`;
if(fn.includes(load)) fn=fn.replace(load,'');
const startCopy="    const legacyWs=legacyWorkbook.sheet('見積書')";
const endCopy="    if(!copiedLegacyNotes)throw new Error('元工事カードのL～Q列・22～56行に文章が見つかりません')";
const a=fn.indexOf(startCopy),b=fn.indexOf(endCopy,a);
if(a>=0&&b>=0){const e=b+endCopy.length;fn=fn.slice(0,a)+fn.slice(e).replace(/^\r?\n/,'')}

// 3) After normal estimate rows are written, restore imported old-card notes from saved M-Cross data.
const rowEnd="      ws.cell('H'+r).value(cv(row.quantity));ws.cell('I'+r).value(row.unit||'');ws.cell('J'+r).value(cv(row.rate));ws.cell('K'+r).value(cv(row.amount))"+nl+"    })";
const noteBlock=[rowEnd,
`    /* ${marker} */`,
`    ;(Array.isArray(entry.legacyEstimateNotes)?entry.legacyEstimateNotes:[]).forEach(note=>{`,
`      const r=Number(note?.row)`,
`      const cell=String(note?.cell||'')`,
`      const m=cell.match(/^([L-Q])(\\d+)$/i)`,
`      if(m&&r>=22&&r<=56)ws.cell(m[1].toUpperCase()+r).value(String(note?.text||''))`,
`    })`
].join(nl);
const n=(fn.split(rowEnd).length-1);if(n!==1){console.error('ERROR: combined row end MATCH='+n+'; no changes');process.exit(1)}
fn=fn.replace(rowEnd,noteBlock);
src=head+fn+tail;

// 4) Pass saved legacy notes into the normal combined export entry object.
const callOld='floorTrimRecords,additionalWorks}, rowsForCombined, estimateCopyFormat, worksForCombined)';
const callNew='floorTrimRecords,additionalWorks,legacyEstimateNotes}, rowsForCombined, estimateCopyFormat, worksForCombined)';
const cn=src.split(callOld).length-1;if(cn!==1){console.error('ERROR: combined call MATCH='+cn+'; no changes');process.exit(1)}
src=src.replace(callOld,callNew);

fs.copyFileSync(file,backup);fs.writeFileSync(file,src,'utf8');
console.log('OK: legacy import and normal export separated');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
