const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_SERVICE_VENDOR_PRICEBOOKS_V1_SAFE';
const backup=file+'.service-vendor-pricebooks-v1-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('業者別施工単価V1はすでに適用されています。');
let next=original;

const stateAnchor='  const [contractors, setContractors] = useState(() => {';
if((next.split(stateAnchor).length-1)!==1)fail('contractors stateを一意に特定できません。');

const dataBlock=`  /* ${marker} */
  const serviceVendorPriceBooks=[
    {aliases:['インテリアヒサスエ'],trade:'内装',rows:[
      ['クロス施工費','㎡',430,''],['CF施工費','㎡',650,''],['巾木施工費','㎡',130,'']
    ]},
    {aliases:['NAKANO'],trade:'内装',rows:[
      ['クロス施工費','㎡',430,''],['CF施工費','㎡',650,''],['巾木施工費','㎡',130,'']
    ]},
    {aliases:['山本内装'],trade:'内装',rows:[
      ['クロス施工費','㎡',450,''],['CF施工費','㎡',650,''],['巾木施工費','㎡',130,'']
    ]},
    {aliases:['合同会社東勝'],trade:'内装',rows:[
      ['クロス施工費','㎡',450,''],['CF施工費','㎡',650,''],['巾木施工費','㎡',130,'']
    ]},
    {aliases:['ドリームインテリア'],trade:'内装',rows:[
      ['クロス施工費','㎡',430,''],['CF施工費','㎡',650,''],['巾木施工費','㎡',130,'']
    ]},
    {aliases:['有限会社衛生洗浄設備','衛生洗浄設備'],trade:'設備',rows:[
      ['シャンプードレッサー交換','式',18000,'溶接などがあれば別途'],
      ['レンジフード交換','式',16500,''],
      ['混合栓交換','式',10000,'点検口造作＋1,500円'],
      ['排水つまり抜き ラバーカップ','式',9000,''],
      ['オーバーフロー管交換','式',19500,'タンク脱着込み'],
      ['トイレ交換','式','', '単価未設定'],
      ['フランジ交換','式',17000,'便器脱着あり'],
      ['ボールタップ・ゴムフロート交換','式',15000,''],
      ['水抜栓・ピストン修理 パッキン交換','式',13000,''],
      ['ゲートバルブ交換','式',25000,'保温管3,000円別途'],
      ['ゲートバルブ交換附随工事','式',8000,'ポンプ止水・通水'],
      ['ワンホール混合栓交換（材工）','式',21000,'']
    ]},
    {aliases:['工藤畳商会'],trade:'畳',rows:[
      ['畳表替え','枚',3800,''],['新畳','枚',7200,''],['畳処分','枚',1300,'新畳を入れた場合'],['畳処分のみ','枚',1500,''],['琉球畳処分','枚',650,'']
    ]},
    {aliases:['泰平建材','泰平建材株式会社'],trade:'材料',rows:[
      ['シャンプードレッサー W600','台',29500,''],['シャンプードレッサー W750','台',32500,''],['シャンプードレッサー キャビネット W600','台',8000,''],['シャンプードレッサー キャビネット W750','台',9000,''],['シャンプードレッサー 洗面台 W600','台',21500,''],['シャンプードレッサー 洗面台 W750','台',23500,'']
    ]},
    {aliases:['株式会社ガラスフリーク','ガラスフリーク'],trade:'ガラス',rows:[
      ['ガラス交換','枚',5000,'']
    ]}
  ]
  const normalizeServiceVendorName=value=>String(value||'').replace(/[\\s　・＆&()（）]/g,'').toLowerCase()
  const mergeServiceVendorPriceBooks=list=>{
    let changed=false
    const result=list.map(contractor=>{
      const name=normalizeServiceVendorName(contractor?.name)
      const source=serviceVendorPriceBooks.find(book=>book.aliases.some(alias=>{const a=normalizeServiceVendorName(alias);return name===a||name.includes(a)||a.includes(name)}))
      if(!source)return contractor
      const current=Array.isArray(contractor.priceBook)?contractor.priceBook:[]
      const known=new Set(current.map(row=>normalizeServiceVendorName(row?.name)).filter(Boolean))
      const additions=source.rows.filter(row=>!known.has(normalizeServiceVendorName(row[0]))).map((row,index)=>({id:'service-reference-'+String(contractor.id||'vendor')+'-'+index,name:row[0],unit:row[1],priceType:'fixed',price:row[2],rate:'',note:row[3]||'',referenceOnly:true}))
      if(!additions.length)return contractor
      changed=true
      return {...contractor,priceBook:[...current,...additions]}
    })
    return {result,changed}
  }

`;
next=next.replace(stateAnchor,dataBlock+stateAnchor);

const afterState='  const [showContractorPicker, setShowContractorPicker] = useState(false)';
if((next.split(afterState).length-1)!==1)fail('contractors state直後を一意に特定できません。');
const effect=`  useEffect(()=>{
    const merged=mergeServiceVendorPriceBooks(contractors)
    if(!merged.changed)return
    setContractors(merged.result)
    localStorage.setItem(contractorMasterStorageKey,JSON.stringify(merged.result))
  },[])

`;
next=next.replace(afterState,effect+afterState);

if(next===original||!next.includes(marker))fail('業者別施工単価の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');console.log('OK: 業者別施工単価V1を適用しました。');
 console.log('・発注先ごとに別のpriceBookを使用');
 console.log('・衛生洗浄設備、内装5社、畳、建材、ガラスを登録');
 console.log('・既存単価は保持し、同名項目は重複追加しません');
 console.log('・発注書の施工単価へ自動反映はしません');
 console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
