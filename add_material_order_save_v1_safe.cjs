const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_ORDER_SAVE_V1_SAFE';
const backup=file+'.material-save-v1-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('材料発注保存V1はすでに適用されています。');
let next=original;

// 既存のpurchaseOrders / savePurchaseOrders / 物件情報 / materialOrderItemsを再利用する。
for(const token of ['const [materialOrderItems, setMaterialOrderItems] = useState([])','const [purchaseOrders,setPurchaseOrders]','function savePurchaseOrders','purchaseOrderStorageKey']){
  if(!next.includes(token))fail('前提コードが見つかりません: '+token);
}

const stateAnchor='const [materialOrderItems, setMaterialOrderItems] = useState([])';
next=next.replace(stateAnchor,stateAnchor+`\n  /* ${marker} */\n  function saveCurrentMaterialPurchaseOrder(){\n    const supplier=contractors.find(item=>item.id===materialSupplierId)||null\n    if(!supplier){window.alert('材料発注先を選択してください。');return}\n    const items=(materialOrderItems||[]).map(item=>({\n      id:item.id||'',\n      category:'material',\n      materialType:item.materialType||'other',\n      label:String(item.productCode||'').trim(),\n      productCode:String(item.productCode||'').trim(),\n      memo:String(item.description||''),\n      sourceQuantity:Number(item.quantity||0),\n      factor:1,\n      orderQuantity:Number(item.quantity||0),\n      unit:String(item.unit||''),\n      rate:0,\n      amount:0,\n      orderRate:item.unitPrice===''||item.unitPrice==null?null:Number(item.unitPrice||0),\n      orderAmount:item.unitPrice===''||item.unitPrice==null?null:(Number(item.quantity)||0)*(Number(item.unitPrice)||0)\n    })).filter(item=>item.productCode||item.orderQuantity>0)\n    if(!items.length){window.alert('保存できる材料明細がありません。');return}\n    const snapshot={\n      id:'purchase-material-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),\n      status:'下書き',\n      createdAt:new Date().toISOString(),\n      company:String(company||''),\n      propertyId:selectedProperty?.id||'',\n      propertyName:selectedProperty?.name||'',\n      address:selectedProperty?.address||'',\n      unit:String(unit||''),\n      workName:String(workName||''),\n      orderMode:'material',\n      contractorId:supplier.id||'',\n      contractorName:supplier.name||'',\n      contractorTrade:supplier.trade||'',\n      contractorPostalCode:supplier.postalCode||'',\n      contractorAddress:supplier.address||'',\n      contractorContact:supplier.contact||'',\n      contractorPhone:supplier.phone||'',\n      contractorMemo:supplier.memo||'',\n      items\n    }\n    savePurchaseOrders([snapshot,...purchaseOrders])\n    setSaveStatus('材料発注書を下書き保存しました')\n    window.alert('材料発注書を下書き保存しました。')\n  }`);

// 材料発注画面の最後、既存の案内ブロック直前へ保存UIを追加。
const materialStart=next.indexOf("purchaseOrderBranch === 'material'");
if(materialStart<0)fail('材料発注画面が見つかりません。');
const notice='材料発注先と業者別単価表を選択できます。材料発注書の保存は次のSTEPで追加します。';
const noticePos=next.indexOf(notice,materialStart);
if(noticePos<0)fail('材料発注画面の保存案内を特定できません。');
const blockStart=next.lastIndexOf('<div style={{',noticePos);
const blockEnd=next.indexOf('</div>',noticePos);
if(blockStart<0||blockEnd<0)fail('保存案内ブロックを特定できません。');
const oldBlock=next.slice(blockStart,blockEnd+6);
const saveUi=`<div className="materialOrderSaveArea" style={{marginTop:'16px',display:'grid',gap:'8px'}}>\n                          <div style={{display:'flex',justifyContent:'space-between',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>\n                            <strong>発注合計</strong>\n                            <strong style={{fontSize:'20px'}}>{formatYen((materialOrderItems||[]).reduce((sum,item)=>sum+((item.unitPrice===''||item.unitPrice==null)?0:(Number(item.quantity)||0)*(Number(item.unitPrice)||0)),0))}</strong>\n                          </div>\n                          <button type="button" className="primary" onClick={saveCurrentMaterialPurchaseOrder} style={{minHeight:'50px',fontWeight:900}}>📦 材料発注書を下書き保存</button>\n                          <small style={{textAlign:'center',color:'#777'}}>保存後は見積・業者単価表とは独立した発注書データとして保持します。</small>\n                        </div>`;
next=next.slice(0,blockStart)+saveUi+next.slice(blockEnd+6);

if(next===original||!next.includes(marker))fail('材料発注保存V1の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{cp.execSync('npm run build',{stdio:'inherit',shell:true});console.log('');console.log('OK: 材料発注保存V1を適用しました。');console.log('・材料発注画面下部に下書き保存ボタン');console.log('・現在入力中の品番/数量/単位/単価/金額をスナップショット保存');console.log('・orderMode=materialとして既存purchaseOrdersへ保存');console.log('・業者単価表を後で変更しても保存済み発注書は変わりません');console.log('BACKUP: '+backup);}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
