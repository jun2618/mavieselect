const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_LEGACY_WORKNAME_FROM_FILENAME_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const old="      const imported=normalizeImportedEntry({company,propertyName,propertyId:'',address,unit,workName:'諸工事',rooms,customRooms:rooms,records:[],cfRecords:[],cfMaterialGroups:[],softRecords:[],floorTrimRecords:[],additionalWorks,legacyEstimateNotes,draftMemo:'',siteMemo:'',requestContent:'',roomConfirmations:{},estimateEdits:{},estimateVersions:[],pageIndex:0,cfPageIndex:0,softPageIndex:0,activePage:'additional',measurementType:'天井',createdAt:now,updatedAt:now,archived:false,importSource:'旧工事カードExcel'})";
const neu=[
"      /* "+marker+" */",
"      const legacyBaseName=String(file.name||'').replace(/\\.(xlsm|xlsx)$/i,'').trim()",
"      const unitToken=String(unit||'').trim()+'号室'",
"      const tokenIndex=legacyBaseName.indexOf(unitToken)",
"      let legacyWorkName=tokenIndex>=0?legacyBaseName.slice(tokenIndex+unitToken.length).trim():''",
"      legacyWorkName=legacyWorkName.replace(/[①②③④⑤⑥⑦⑧⑨⑩]+$/u,'').replace(/[（(]\\s*\\d+\\s*[）)]$/u,'').trim()",
"      if(!legacyWorkName)legacyWorkName='原状回復工事'",
"      const imported=normalizeImportedEntry({company,propertyName,propertyId:'',address,unit,workName:legacyWorkName,rooms,customRooms:rooms,records:[],cfRecords:[],cfMaterialGroups:[],softRecords:[],floorTrimRecords:[],additionalWorks,legacyEstimateNotes,draftMemo:'',siteMemo:'',requestContent:'',roomConfirmations:{},estimateEdits:{},estimateVersions:[],pageIndex:0,cfPageIndex:0,softPageIndex:0,activePage:'additional',measurementType:'天井',createdAt:now,updatedAt:now,archived:false,importSource:'旧工事カードExcel'})"
].join('\n');
const n=s.split(old).length-1;if(n!==1){console.error('ERROR: fixed workName MATCH='+n+'; no changes');process.exit(1)}
const backup=file+'.before-legacy-workname-from-filename-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);s=s.replace(old,neu);fs.writeFileSync(file,s,'utf8');
console.log('OK: workName will be read from filename after unit number');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
