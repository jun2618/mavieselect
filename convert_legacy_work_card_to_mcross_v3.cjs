const fs=require('fs');
const path=require('path');
const XLSX=require('xlsx');
const txt=v=>String(v??'').replace(/\r\n/g,'\n').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const safe=v=>txt(v).replace(/[\\/:*?"<>|]/g,'_');
const cell=(s,a)=>s?.[a]?.v??'';
const clean=v=>txt(v).replace(/[\s　]+/g,' ').trim();

function classify(raw){
  const full=clean(raw);
  const names=['浴室','トイレ','キッチン','台所','居間','洋室','和室','玄関','廊下','洗面所'];
  const prefix=names.find(x=>full.startsWith(x));
  const room=prefix==='キッチン'?'キッチン':(prefix||'その他');
  const work=prefix?full.slice(prefix.length).trim():full;
  return {room,work:work||full};
}
function readAccess(wb,company,propertyName){
  for(const name of [`${company}_マスター`,'マスター','マスター (2)']){
    const s=wb.Sheets[name]; if(!s?.['!ref'])continue;
    const rg=XLSX.utils.decode_range(s['!ref']);
    for(let r=1;r<=rg.e.r;r++){
      if(txt(cell(s,XLSX.utils.encode_cell({r,c:0})))!==propertyName)continue;
      return {autoLock:txt(cell(s,XLSX.utils.encode_cell({r,c:3}))),keyBox:txt(cell(s,XLSX.utils.encode_cell({r,c:5}))),joiner:txt(cell(s,XLSX.utils.encode_cell({r,c:4}))),myLock:txt(cell(s,XLSX.utils.encode_cell({r,c:6}))),entranceOpen:''};
    }
  }
  return {autoLock:'',keyBox:'',joiner:'',myLock:'',entranceOpen:''};
}
const input=process.argv[2]?path.resolve(process.argv[2]):'';
if(!input||!fs.existsSync(input)){console.error('使い方: node convert_legacy_work_card_to_mcross_v3.cjs "工事カード.xlsm"');process.exit(1)}
const wb=XLSX.readFile(input,{bookVBA:true,cellDates:true,cellFormula:true});
const card=wb.Sheets['工事カード'],estimate=wb.Sheets['見積書'];
if(!card||!estimate){console.error('ERROR: 工事カード/見積書シートがありません');process.exit(1)}
const company=txt(cell(card,'C3')),propertyName=txt(cell(card,'C7')),unit=txt(cell(card,'C9')).replace(/号室$/u,''),address=txt(cell(card,'C11'));
if(!company||!propertyName||!unit){console.error('ERROR: 管理会社・物件・号室を読めません');process.exit(1)}

const additionalWorks=[];
for(let row=23;row<=56;row++){
  const raw=txt(cell(estimate,`C${row}`));
  if(!raw)continue;
  const {room,work}=classify(raw);
  const quantity=cell(estimate,`H${row}`)===''?'':num(cell(estimate,`H${row}`));
  const unitName=txt(cell(estimate,`I${row}`));
  const unitPrice=cell(estimate,`J${row}`)===''?'':num(cell(estimate,`J${row}`));
  const amount=cell(estimate,`K${row}`)===''?'':num(cell(estimate,`K${row}`));
  additionalWorks.push({
    id:`legacy-estimate-row-${row}`,room,work,spec:'',
    estimateParts:[room,'',work,''],
    quantity,unit:unitName,unitPrice,amount,
    memo:'',sourceSheet:'見積書',sourceRow:row,legacyRawLabel:raw
  });
}
const legacyEstimateNotes=[];
for(let row=22;row<=56;row++){
  const value=txt(cell(estimate,`M${row}`));
  if(value)legacyEstimateNotes.push({row,text:value});
}
const subtotal=additionalWorks.reduce((sum,item)=>sum+(item.amount===''?0:num(item.amount)),0);
const tax=Math.floor(subtotal*.1),total=subtotal+tax;
const rooms=[...new Set(additionalWorks.map(x=>x.room).filter(Boolean))];
const now=new Date().toISOString();
const out={schema:'m-cross-legacy-import:v3',importMode:'single-preview',source:{fileName:path.basename(input),sheet:'工事カード / 見積書',importedAt:now},entry:{company,propertyName,propertyId:'',address,unit,workName:'諸工事',propertyAccess:readAccess(wb,company,propertyName),rooms,customRooms:rooms,records:[],cfRecords:[],cfMaterialGroups:[],softRecords:[],floorTrimRecords:[],additionalWorks,legacyEstimateNotes,draftMemo:'',siteMemo:'',requestContent:'',roomConfirmations:{},estimateEdits:{},estimateVersions:[],pageIndex:0,cfPageIndex:0,softPageIndex:0,activePage:'additional',measurementType:'天井',createdAt:now,updatedAt:now,archived:false,importSource:'旧工事カード'},totals:{subtotal,tax,total},validation:{expectedTotal:67650,totalMatches:total===67650,itemCount:additionalWorks.length,noteCount:legacyEstimateNotes.length}};
const output=path.join(path.dirname(input),`${safe(propertyName)}_${safe(unit)}号室_${safe(out.entry.workName)}_v3.mcross.json`);
fs.writeFileSync(output,JSON.stringify(out,null,2),'utf8');
console.log('OK: M-Cross取込用JSON V3を作成しました');
console.log('出力:',output);
console.log('見積明細:',additionalWorks.length+'件（金額なし含む）');
console.log('M列文章:',legacyEstimateNotes.length+'件');
console.log('合計:',total.toLocaleString('ja-JP')+'円');
console.log('合計照合:',out.validation.totalMatches?'一致':'不一致');
