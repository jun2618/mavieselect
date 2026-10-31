const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-purchase-order-save-step3-v2';
const mark='M-CROSS_PURCHASE_ORDER_SAVE_STEP3_V2_STRUCTURAL_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 発注書保存STEP3 V2は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_ORDER_SELECTION_STEP1_V4_STRUCTURAL_SAFE'))fail('発注選択STEP1 V4が見つかりません。');
if(!s.includes('M-CROSS_ORDER_CREATION_STEP2_V1_SAFE'))fail('発注STEP2が見つかりません。');
if(!s.includes('M-CROSS_CONTRACTOR_MASTER_PICKER_V2_SAFE'))fail('業者マスターV2が見つかりません。');

const stateAnchor='  const [orderDraft, setOrderDraft] = useState(null)';
const statePos=s.indexOf(stateAnchor);
if(statePos<0)fail('orderDraft stateを特定できません。');

// Current STEP2 may have been simplified after V1. Detect the footer structurally, not by button source text.
const panelPos=s.indexOf('<section className="orderDraftPanel"');
const footerPos=s.indexOf('<div className="orderDraftFooter">',panelPos);
if(panelPos<0||footerPos<0)fail('STEP2フッターを特定できません。');
const primaryPos=s.indexOf('<button className="primary"',footerPos);
const primaryEnd=s.indexOf('</button>',primaryPos)+9;
if(primaryPos<0||primaryEnd<9||primaryEnd-footerPos>1200)fail('STEP2の次へボタンを構造的に特定できません。');

fs.copyFileSync(p,b);
try{
  const state=`\n  /* ${mark} */\n  const purchaseOrderStorageKey='mcross_purchase_orders_v1'\n  const [purchaseOrders,setPurchaseOrders]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem(purchaseOrderStorageKey)||'[]');return Array.isArray(saved)?saved:[]}catch{return []}})\n  function savePurchaseOrders(next){setPurchaseOrders(next);try{localStorage.setItem(purchaseOrderStorageKey,JSON.stringify(next))}catch{}}\n  function saveCurrentPurchaseOrder(){\n    if(!orderDraft)return\n    const contractorName=String(orderDraft.contractor||'').trim()\n    if(!contractorName){window.alert('発注先を選択してください。');return}\n    if(!Array.isArray(orderDraft.items)||orderDraft.items.length===0){window.alert('発注明細がありません。');return}\n    const contractor=contractors.find(item=>item.id===orderDraft.contractorId)||null\n    const now=new Date().toISOString()\n    const snapshot={\n      id:'purchase-order-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),\n      createdAt:now,updatedAt:now,status:'下書き',\n      company:String(company||''),propertyId:selectedProperty?.id||'',propertyName:selectedProperty?.name||'',address:selectedProperty?.address||'',unit:String(unit||''),workName:String(workName||''),\n      contractorId:orderDraft.contractorId||'',contractorName,contractorTrade:contractor?.trade||'',contractorPostalCode:contractor?.postalCode||'',contractorAddress:contractor?.address||'',contractorContact:contractor?.contact||'',contractorPhone:contractor?.phone||'',contractorMemo:contractor?.memo||'',\n      items:orderDraft.items.map(item=>({id:item.id||'',label:String(item.label||''),memo:String(item.memo||''),category:String(item.category||''),sourceQuantity:Number(item.sourceQuantity||0),factor:Number(item.factor||1),orderQuantity:Number(item.orderQuantity||0),unit:String(item.unit||''),rate:Number(item.rate||0),amount:Number(item.amount||0)})),\n    }\n    savePurchaseOrders([snapshot,...purchaseOrders])\n    setOrderDraft(null)\n    setSelectedOrderKeys([])\n    setSaveStatus('発注書を下書き保存しました')\n    window.alert('発注書を下書き保存しました。')\n  }`;
  s=s.slice(0,statePos+stateAnchor.length)+state+s.slice(statePos+stateAnchor.length);

  // Re-find footer after state insertion and replace only its primary action button.
  const panel2=s.indexOf('<section className="orderDraftPanel"');
  const footer2=s.indexOf('<div className="orderDraftFooter">',panel2);
  const btn2=s.indexOf('<button className="primary"',footer2);
  const btnEnd2=s.indexOf('</button>',btn2)+9;
  if(panel2<0||footer2<0||btn2<0||btnEnd2<9)throw new Error('STEP2保存ボタン位置の再特定に失敗しました。');
  const saveButton='<button className="primary" type="button" onClick={saveCurrentPurchaseOrder}>📦 発注書を下書き保存</button>';
  s=s.slice(0,btn2)+saveButton+s.slice(btnEnd2);

  // Add explanatory text immediately after footer.
  const footerClose=s.indexOf('</div>',btn2)+6;
  if(footerClose<6)throw new Error('STEP2フッター終了を特定できません。');
  s=s.slice(0,footerClose)+'<small className="purchaseOrderSaveNote">保存後は採寸・見積とは独立した発注書データとして保持します。</small>'+s.slice(footerClose);

  const cssAnchor='.orderDraftFooter{padding-top:4px}';
  if(!s.includes(cssAnchor))throw new Error('STEP2フッターCSSを特定できません。');
  s=s.replace(cssAnchor,cssAnchor+'.purchaseOrderSaveNote{display:block;color:#756a78;text-align:center}.theme-dark .purchaseOrderSaveNote,.theme-cyber .purchaseOrderSaveNote,.theme-luxury .purchaseOrderSaveNote,.theme-retro .purchaseOrderSaveNote,.theme-galaxy .purchaseOrderSaveNote{color:#dffcff}');

  fs.writeFileSync(p,s,'utf8');
  console.log('現在のSTEP2構造に合わせて、発注書下書き保存を追加しました。');
  childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 発注書保存STEP3 V2を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1)
}
