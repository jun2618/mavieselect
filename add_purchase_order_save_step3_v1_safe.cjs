const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-purchase-order-save-step3-v1';
const mark='M-CROSS_PURCHASE_ORDER_SAVE_STEP3_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 発注書保存STEP3 V1は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_ORDER_CREATION_STEP2_V1_SAFE'))fail('発注STEP2 V1が見つかりません。変更していません。');
if(!s.includes('M-CROSS_CONTRACTOR_MASTER_PICKER_V2_SAFE'))fail('業者マスターV2が見つかりません。変更していません。');

const stateAnchor='  const [orderDraft, setOrderDraft] = useState(null)';
const statePos=s.indexOf(stateAnchor);
if(statePos<0)fail('orderDraft stateを特定できません。');

const oldButton='<button className="primary" type="button" onClick={() => window.alert(\'STEP2の入力内容を確認しました。次のSTEPで発注書として保存します。\')}>内容を確認して次へ</button>';
if((s.split(oldButton).length-1)!==1)fail('STEP2確認ボタンを一意に特定できません。変更していません。');

fs.copyFileSync(p,b);
try{
  const state=`\n  /* ${mark} */\n  const purchaseOrderStorageKey='mcross_purchase_orders_v1'\n  const [purchaseOrders,setPurchaseOrders]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem(purchaseOrderStorageKey)||'[]');return Array.isArray(saved)?saved:[]}catch{return []}})\n  function savePurchaseOrders(next){setPurchaseOrders(next);try{localStorage.setItem(purchaseOrderStorageKey,JSON.stringify(next))}catch{}}\n  function saveCurrentPurchaseOrder(){\n    if(!orderDraft)return\n    const contractorName=String(orderDraft.contractor||'').trim()\n    if(!contractorName){window.alert('発注先を選択してください。');return}\n    if(!Array.isArray(orderDraft.items)||orderDraft.items.length===0){window.alert('発注明細がありません。');return}\n    const contractor=contractors.find(item=>item.id===orderDraft.contractorId)||null\n    const now=new Date().toISOString()\n    const snapshot={\n      id:'purchase-order-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),\n      createdAt:now,updatedAt:now,status:'下書き',\n      company:String(company||''),propertyId:selectedProperty?.id||'',propertyName:selectedProperty?.name||'',address:selectedProperty?.address||'',unit:String(unit||''),workName:String(workName||''),\n      contractorId:orderDraft.contractorId||'',contractorName,contractorTrade:contractor?.trade||'',contractorPostalCode:contractor?.postalCode||'',contractorAddress:contractor?.address||'',contractorContact:contractor?.contact||'',contractorPhone:contractor?.phone||'',contractorMemo:contractor?.memo||'',\n      items:orderDraft.items.map(item=>({id:item.id||'',label:String(item.label||''),memo:String(item.memo||''),category:String(item.category||''),sourceQuantity:Number(item.sourceQuantity||0),factor:Number(item.factor||1),orderQuantity:Number(item.orderQuantity||0),unit:String(item.unit||''),rate:Number(item.rate||0),amount:Number(item.amount||0)})),\n    }\n    const next=[snapshot,...purchaseOrders]\n    savePurchaseOrders(next)\n    setOrderDraft(null);setSelectedOrderKeys([])\n    setSaveStatus('発注書を下書き保存しました')\n    window.alert('発注書を下書き保存しました。')\n  }`;
  s=s.slice(0,statePos+stateAnchor.length)+state+s.slice(statePos+stateAnchor.length);

  const newButton='<button className="primary" type="button" onClick={saveCurrentPurchaseOrder}>📦 発注書を下書き保存</button>';
  s=s.replace(oldButton,newButton);

  // Show a small save summary below STEP2 button without building the explorer yet.
  const footerNeedle='<div className="orderDraftFooter"><span>{orderDraft.items.length}項目</span><button className="primary" type="button" onClick={saveCurrentPurchaseOrder}>📦 発注書を下書き保存</button></div>';
  if(!s.includes(footerNeedle))throw new Error('STEP2フッターを特定できません。');
  s=s.replace(footerNeedle,footerNeedle+'<small className="purchaseOrderSaveNote">保存後は採寸・見積と独立した発注書データになります。</small>');

  const cssAnchor='.orderDraftFooter{padding-top:4px}';
  if(!s.includes(cssAnchor))throw new Error('STEP2フッターCSSを特定できません。');
  s=s.replace(cssAnchor,cssAnchor+'.purchaseOrderSaveNote{display:block;color:#756a78;text-align:center}.theme-dark .purchaseOrderSaveNote,.theme-cyber .purchaseOrderSaveNote,.theme-luxury .purchaseOrderSaveNote,.theme-retro .purchaseOrderSaveNote,.theme-galaxy .purchaseOrderSaveNote{color:#dffcff}');

  fs.writeFileSync(p,s,'utf8');
  console.log('発注書保存STEP3を追加しました。自動ビルド確認を行います。');
  childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 発注書保存STEP3 V1を適用しました。');
  console.log('発注書は下書きとして共通localStorageへ保存されます。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
