const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_ORDER_SAVE_V2_SAFE';
const backup=file+'.material-save-v2-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('材料発注保存V2はすでに適用されています。');

for(const token of [
  'const [materialOrderItems, setMaterialOrderItems] = useState([])',
  'const [purchaseOrders,setPurchaseOrders]',
  'function savePurchaseOrders',
  "purchaseOrderBranch === 'material'",
  'materialOrderItems.length === 0'
]){
  if(!original.includes(token))fail('前提コードが見つかりません: '+token);
}

let next=original;

const stateAnchor='const [materialOrderItems, setMaterialOrderItems] = useState([])';
const stateCount=next.split(stateAnchor).length-1;
if(stateCount!==1)fail('materialOrderItems state の検出数が '+stateCount+' 件です。');

const saveFunction=`${stateAnchor}
  /* ${marker} */
  function saveCurrentMaterialPurchaseOrder(){
    const supplier=contractors.find(item=>item.id===materialSupplierId)||null
    if(!supplier){window.alert('材料発注先を選択してください。');return}

    const items=(materialOrderItems||[]).map(item=>({
      id:item.id||'',
      category:'material',
      materialType:item.materialType||'other',
      label:String(item.productCode||'').trim(),
      productCode:String(item.productCode||'').trim(),
      memo:String(item.description||''),
      sourceQuantity:Number(item.quantity||0),
      factor:1,
      orderQuantity:Number(item.quantity||0),
      unit:String(item.unit||''),
      rate:0,
      amount:0,
      orderRate:item.unitPrice===''||item.unitPrice==null?null:Number(item.unitPrice||0),
      orderAmount:item.unitPrice===''||item.unitPrice==null?null:(Number(item.quantity)||0)*(Number(item.unitPrice)||0)
    })).filter(item=>item.productCode||item.orderQuantity>0)

    if(!items.length){window.alert('保存できる材料明細がありません。');return}

    const snapshot={
      id:'purchase-material-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
      status:'下書き',
      createdAt:new Date().toISOString(),
      company:String(company||''),
      propertyId:selectedProperty?.id||'',
      propertyName:selectedProperty?.name||'',
      address:selectedProperty?.address||'',
      unit:String(unit||''),
      workName:String(workName||''),
      orderMode:'material',
      contractorId:supplier.id||'',
      contractorName:supplier.name||'',
      contractorTrade:supplier.trade||'',
      contractorPostalCode:supplier.postalCode||'',
      contractorAddress:supplier.address||'',
      contractorContact:supplier.contact||'',
      contractorPhone:supplier.phone||'',
      contractorMemo:supplier.memo||'',
      items
    }

    savePurchaseOrders([snapshot,...purchaseOrders])
    setSaveStatus('材料発注書を下書き保存しました')
    window.alert('材料発注書を下書き保存しました。')
  }`;
next=next.replace(stateAnchor,saveFunction);

// 現在の実コード 10760 付近の「明細0件表示」を安全な挿入アンカーにする。
const materialStart=next.indexOf("purchaseOrderBranch === 'material'");
if(materialStart<0)fail('材料発注画面開始位置が見つかりません。');
const emptyAnchor='                        {materialOrderItems.length === 0 && (';
const emptyPos=next.indexOf(emptyAnchor,materialStart);
if(emptyPos<0)fail('材料明細0件表示の位置が見つかりません。');

const saveUi=`                        <section className="materialOrderSaveArea" style={{marginTop:'16px',display:'grid',gap:'10px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                            <span style={{fontWeight:800}}>発注合計</span>
                            <strong style={{fontSize:'20px'}}>
                              {formatYen((materialOrderItems||[]).reduce((sum,item)=>sum+((item.unitPrice===''||item.unitPrice==null)?0:(Number(item.quantity)||0)*(Number(item.unitPrice)||0)),0))}
                            </strong>
                          </div>
                          <button type="button" className="primary" onClick={saveCurrentMaterialPurchaseOrder} style={{minHeight:'52px',fontWeight:900}}>
                            📦 材料発注書を下書き保存
                          </button>
                          <small style={{textAlign:'center',color:'#777'}}>
                            保存時の品番・数量・単位・単価・金額を発注書として保持します。
                          </small>
                        </section>

`;
next=next.slice(0,emptyPos)+saveUi+next.slice(emptyPos);

if(next===original||!next.includes(marker))fail('材料発注保存V2の適用に失敗しました。');

fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 材料発注保存V2を適用しました。');
  console.log('・材料発注画面に発注合計を表示');
  console.log('・材料発注書を下書き保存ボタンを追加');
  console.log('・物件/号室/発注先/品番/数量/単位/単価/金額を保存');
  console.log('・orderMode=materialとして既存purchaseOrdersへ保存');
  console.log('・施工発注保存処理は変更していません。');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('');
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
