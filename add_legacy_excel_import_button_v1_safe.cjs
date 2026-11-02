const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_LEGACY_XLSM_DIRECT_IMPORT_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=file+'.before-legacy-xlsm-direct-import-'+Date.now()+'.bak';
const nl=s.includes('\r\n')?'\r\n':'\n';
function replaceOnce(label,a,b){const n=s.split(a).length-1;if(n!==1){console.error('ERROR: '+label+' MATCH='+n+'. No changes made.');process.exit(1)}s=s.replace(a,b)}

// Add ref near existing import ref declaration.
const refMatch=s.match(/^(\s*)const \[?[^\n]*importFileInputRef[^\n]*$/m);
if(!refMatch){console.error('ERROR: importFileInputRef declaration not found. No changes made.');process.exit(1)}
const refIndent=refMatch[1];
replaceOnce('legacy input ref',refMatch[0],refMatch[0]+nl+refIndent+`/* ${marker} */`+nl+refIndent+`const legacyWorkCardInputRef = useRef(null)`);

// Add direct XLSM/XLSX importer immediately before the existing importMCrossData function.
const importAnchor='  /* M-CROSS_LEGACY_SINGLE_IMPORT_V1_SAFE */'+nl+'  async function importMCrossData(event) {';
const importer=[
`  /* ${marker} */`,
`  async function importLegacyWorkCardExcel(event) {`,
`    const file=event.target.files?.[0]`,
`    event.target.value=''`,
`    if(!file)return`,
`    if(!/\\.(xlsm|xlsx)$/i.test(file.name)){window.alert('旧工事カードの .xlsm または .xlsx を選択してください。');return}`,
`    try{`,
`      const populateModule=await import('xlsx-populate/browser/xlsx-populate.min.js')`,
`      const XlsxPopulate=populateModule.default||globalThis.XlsxPopulate||populateModule`,
`      const wb=await XlsxPopulate.fromDataAsync(await file.arrayBuffer())`,
`      const card=wb.sheet('工事カード'),estimate=wb.sheet('見積書')`,
`      if(!card||!estimate)throw new Error('工事カード/見積書シートが見つかりません。')`,
`      const text=v=>String(v??'').replace(/\\r\\n/g,'\\n').trim()`,
`      const number=v=>Number.isFinite(Number(v))?Number(v):0`,
`      const company=text(card.cell('C3').value()),propertyName=text(card.cell('C7').value()),unit=text(card.cell('C9').value()).replace(/号室$/u,''),address=text(card.cell('C11').value())`,
`      if(!company||!propertyName||!unit)throw new Error('管理会社・物件名・号室を読み取れません。')`,
`      const classify=raw=>{const full=text(raw).replace(/[\\s　]+/g,' ').trim();const names=['浴室','トイレ','キッチン','台所','居間','洋室','和室','玄関','廊下','洗面所'];const room=names.find(n=>full.startsWith(n))||'その他';const work=room==='その他'?full:full.slice(room.length).trim();return{room,work:work||full}}`,
`      const additionalWorks=[]`,
`      for(let row=23;row<=56;row++){const raw=text(estimate.cell('C'+row).value());if(!raw)continue;const {room,work}=classify(raw);const q=estimate.cell('H'+row).value(),p=estimate.cell('J'+row).value(),a=estimate.cell('K'+row).value();additionalWorks.push({id:'legacy-estimate-row-'+row,room,work,spec:'',estimateParts:[room,'',work,''],quantity:q==null||q===''?'':number(q),unit:text(estimate.cell('I'+row).value()),unitPrice:p==null||p===''?'':number(p),amount:a==null||a===''?'':number(a),memo:'',sourceSheet:'見積書',sourceRow:row,legacyRawLabel:raw})}`,
`      const legacyEstimateNotes=[]`,
`      for(let row=22;row<=56;row++)for(const col of ['L','M','N','O','P','Q']){const value=text(estimate.cell(col+row).value());if(value)legacyEstimateNotes.push({row,cell:col+row,text:value})}`,
`      const rooms=[...new Set(additionalWorks.map(x=>x.room).filter(Boolean))]`,
`      const now=new Date().toISOString()`,
`      const imported=normalizeImportedEntry({company,propertyName,propertyId:'',address,unit,workName:'諸工事',rooms,customRooms:rooms,records:[],cfRecords:[],cfMaterialGroups:[],softRecords:[],floorTrimRecords:[],additionalWorks,legacyEstimateNotes,draftMemo:'',siteMemo:'',requestContent:'',roomConfirmations:{},estimateEdits:{},estimateVersions:[],pageIndex:0,cfPageIndex:0,softPageIndex:0,activePage:'additional',measurementType:'天井',createdAt:now,updatedAt:now,archived:false,importSource:'旧工事カードExcel'})`,
`      const storageKey=getSaveKey(imported.company,{name:imported.propertyName,address:imported.address},imported.unit,imported.workName||'原状回復工事')`,
`      if(localStorage.getItem(storageKey)!==null&&!window.confirm('同じ物件・号室・工事名が保存済みです。旧工事カードの内容で上書きしますか？'))return`,
`      localStorage.setItem(storageKey,JSON.stringify(imported))`,
`      setSavedEntries(readSavedEntries())`,
`      setSelectedSavedKeys([])`,
`      window.alert('旧工事カードを取り込みました。\\n見積明細: '+additionalWorks.length+'件\\n右側文章: '+legacyEstimateNotes.length+'件')`,
`    }catch(error){console.error(error);window.alert(error instanceof Error?error.message:'旧工事カードを読み込めませんでした。')}`,
`  }`,
``,
importAnchor
].join(nl);
replaceOnce('direct XLSM importer',importAnchor,importer);

// Add a separate visible button in Saved List, next to the existing M-Cross file importer.
const uiAnchor=`              <input ref={importFileInputRef} type="file" accept=".mcross,.json,.txt,application/json,text/plain" onChange={importMCrossData} style={{ display: 'none' }} />`+nl+`              <button className="secondaryButton" type="button" onClick={() => importFileInputRef.current?.click()} style={{ marginTop: 0, marginBottom: 18 }}>`+nl+`                📥 M-Crossファイルを読み込む`+nl+`              </button>`;
const ui=[
uiAnchor,
`              <input ref={legacyWorkCardInputRef} type="file" accept=".xlsm,.xlsx,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importLegacyWorkCardExcel} style={{ display: 'none' }} />`,
`              <button className="secondaryButton" type="button" onClick={() => legacyWorkCardInputRef.current?.click()} style={{ marginTop: 0, marginBottom: 18 }}>`,
`                📥 旧工事カードExcelを取り込む`,
`              </button>`
].join(nl);
replaceOnce('saved list import button',uiAnchor,ui);

fs.copyFileSync(file,backup);fs.writeFileSync(file,s,'utf8');
console.log('OK: legacy XLSM/XLSX direct import added');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}console.log('OK: BUILD SUCCESS');
