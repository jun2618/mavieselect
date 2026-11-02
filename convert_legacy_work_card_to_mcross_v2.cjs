const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const txt = v => String(v ?? '').replace(/\r\n/g, '\n').trim();
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const safe = v => txt(v).replace(/[\\/:*?"<>|]/g, '_');
const cell = (s, a) => s?.[a]?.v ?? '';
const clean = v => txt(v).replace(/[\s　]+/g, ' ').trim();
const idFor = (kind, row) => `legacy-${kind}-row-${row}`;

function classify(raw) {
  const full = clean(raw);
  const rooms = ['浴室','トイレ','キッチン','台所','居間','洋室','和室','玄関','廊下','洗面所'];
  const room = rooms.find(x => full.startsWith(x)) || 'その他';
  return { room, full };
}

function readAccess(wb, company, propertyName) {
  for (const name of [`${company}_マスター`, 'マスター', 'マスター (2)']) {
    const s = wb.Sheets[name];
    if (!s?.['!ref']) continue;
    const rg = XLSX.utils.decode_range(s['!ref']);
    for (let r=1; r<=rg.e.r; r++) {
      if (txt(cell(s,XLSX.utils.encode_cell({r,c:0}))) !== propertyName) continue;
      return {
        autoLock: txt(cell(s,XLSX.utils.encode_cell({r,c:3}))),
        keyBox: txt(cell(s,XLSX.utils.encode_cell({r,c:5}))),
        joiner: txt(cell(s,XLSX.utils.encode_cell({r,c:4}))),
        myLock: txt(cell(s,XLSX.utils.encode_cell({r,c:6}))),
        entranceOpen: ''
      };
    }
  }
  return {autoLock:'',keyBox:'',joiner:'',myLock:'',entranceOpen:''};
}

const input = process.argv[2] ? path.resolve(process.argv[2]) : '';
if (!input || !fs.existsSync(input)) {
  console.error('使い方: node convert_legacy_work_card_to_mcross_v2.cjs "工事カード.xlsm"');
  process.exit(1);
}
const wb = XLSX.readFile(input,{bookVBA:true,cellDates:true,cellFormula:true});
const card = wb.Sheets['工事カード'];
const estimate = wb.Sheets['見積書'];
if(!card||!estimate){console.error('ERROR: 工事カード/見積書シートがありません');process.exit(1)}

const company=txt(cell(card,'C3'));
const propertyName=txt(cell(card,'C7'));
const unit=txt(cell(card,'C9')).replace(/号室$/u,'');
const address=txt(cell(card,'C11'));
if(!company||!propertyName||!unit){console.error('ERROR: 管理会社・物件・号室を読めません');process.exit(1)}

const additionalWorks=[];
const estimateEdits={};
const excludedLabels=[];
for(let row=23;row<=56;row++){
  const raw=txt(cell(estimate,`C${row}`));
  if(!raw) continue;
  const q=num(cell(estimate,`H${row}`));
  const rate=num(cell(estimate,`J${row}`));
  const amount=num(cell(estimate,`K${row}`)) || q*rate;
  const included=q>0 && rate>0 && amount>0;
  const {room,full}=classify(raw);
  const id=idFor(included?'estimate':'excluded',row);
  const sameRowNote=txt(cell(estimate,`M${row}`));
  const memo=sameRowNote && !sameRowNote.startsWith('・') ? sameRowNote : '';
  const item={
    id, room, work:full, spec:'',
    estimateParts:[room,full,'',''],
    quantity: included ? q : 1,
    unit: included ? (txt(cell(estimate,`I${row}`))||'式') : '式',
    unitPrice: included ? rate : 0,
    amount: included ? amount : 0,
    memo,
    sourceSheet:'見積書',sourceRow:row,
    legacyRawLabel:raw,
    legacyEstimateScope:included?'included':'excluded'
  };
  additionalWorks.push(item);
  if(!included){
    const key='additionalWork:'+id;
    estimateEdits[key]={excluded:true};
    excludedLabels.push(raw);
  }
}
if(!additionalWorks.length){console.error('ERROR: 明細がありません');process.exit(1)}

const estimateNotes=[];
for(let row=22;row<=56;row++){
  const v=txt(cell(estimate,`M${row}`));
  if(v) estimateNotes.push(v);
}
const included=additionalWorks.filter(x=>x.legacyEstimateScope==='included');
const subtotal=included.reduce((s,x)=>s+x.amount,0);
const tax=Math.floor(subtotal*.1);
const total=subtotal+tax;
const rooms=[...new Set(additionalWorks.map(x=>x.room).filter(Boolean))];
const now=new Date().toISOString();
const out={
  schema:'m-cross-legacy-import:v2',
  importMode:'single-preview',
  source:{fileName:path.basename(input),sheet:'工事カード / 見積書',importedAt:now},
  entry:{
    company,propertyName,propertyId:'',address,unit,workName:'諸工事',
    propertyAccess:readAccess(wb,company,propertyName),
    rooms,customRooms:rooms,records:[],cfRecords:[],cfMaterialGroups:[],softRecords:[],floorTrimRecords:[],
    additionalWorks,estimateEdits,
    draftMemo:'',
    siteMemo:estimateNotes.join('\n'),
    requestContent:excludedLabels.length?'【見積範囲外】\n'+excludedLabels.join('\n'):'',
    roomConfirmations:{},estimateVersions:[],pageIndex:0,cfPageIndex:0,softPageIndex:0,
    activePage:'additional',measurementType:'天井',createdAt:now,updatedAt:now,archived:false,
    importSource:'旧工事カード'
  },
  totals:{subtotal,tax,total},
  validation:{expectedTotal:67650,totalMatches:total===67650,includedCount:included.length,excludedCount:excludedLabels.length}
};
const output=path.join(path.dirname(input),`${safe(propertyName)}_${safe(unit)}号室_${safe(out.entry.workName)}_v2.mcross.json`);
fs.writeFileSync(output,JSON.stringify(out,null,2),'utf8');
console.log('OK: M-Cross取込用JSON V2を作成しました');
console.log('出力:',output);
console.log('見積対象:',included.length+'件');
console.log('見積範囲外:',excludedLabels.length+'件');
console.log('合計:',total.toLocaleString('ja-JP')+'円');
console.log('合計照合:',out.validation.totalMatches?'一致':'不一致');
