const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_PURCHASE_ORDER_DRAFT_EDIT_V1_SAFE';
const backup=file+'.draft-edit-v1-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('下書き編集V1はすでに適用されています。');
for(const token of ['const [purchaseOrders,setPurchaseOrders]','function savePurchaseOrders','selected.status','className="purchaseOrderPreviewItems"']){
  if(!original.includes(token))fail('前提コードが見つかりません: '+token);
}
let next=original;

// 1) 編集状態
const stateAnchor='const [purchaseOrders,setPurchaseOrders]';
const statePos=next.indexOf(stateAnchor);
const stateLineEnd=next.indexOf('\n',statePos);
if(statePos<0||stateLineEnd<0)fail('purchaseOrders state位置を特定できません。');
const states=`\n  /* ${marker} */\n  const [editingPurchaseOrderId,setEditingPurchaseOrderId]=useState('')\n  const [purchaseOrderEditItems,setPurchaseOrderEditItems]=useState([])`;
next=next.slice(0,stateLineEnd)+states+next.slice(stateLineEnd);

// 2) 下書き専用の編集開始ボタン。確定ボタンの直前に追加。
const confirmButton="{selected.status!=='本発注'&&<button className=\"primary finalOrderConfirmButton\" type=\"button\" onClick={()=>finalizePurchaseOrder(selected.id)}>✓ 本発注書にする</button>}";
if((next.split(confirmButton).length-1)!==1)fail('本発注確定ボタンを一意に特定できません。');
const editButton=`{selected.status!=='本発注'&&<button className="draftOrderEditButton" type="button" onClick={()=>{setEditingPurchaseOrderId(selected.id);setPurchaseOrderEditItems((selected.items||[]).map(item=>({...item})))}}>✏ 下書きを編集</button>}${confirmButton}`;
next=next.replace(confirmButton,editButton);

// 3) 明細プレビュー直前へ編集パネルを挿入。
const itemsAnchor='<div className="purchaseOrderPreviewItems">';
const itemsPos=next.indexOf(itemsAnchor);
if(itemsPos<0)fail('発注書プレビュー明細が見つかりません。');
const editor=`{selected.status!=='本発注'&&editingPurchaseOrderId===selected.id&&<section className="draftOrderEditor">\n                              <header><strong>下書き編集</strong><small>この発注書だけを変更します。採寸・見積データは変更しません。</small></header>\n                              <div className="draftOrderEditRows">\n                                {purchaseOrderEditItems.map((item,index)=><article className="draftOrderEditRow" key={(item.id||'draft')+'-'+index}>\n                                  <label className="wide"><span>{selected.orderMode==='material'?'品番・商品名':'施工内容'}</span><input value={item.label||item.productCode||''} onChange={event=>setPurchaseOrderEditItems(previous=>previous.map((current,i)=>i===index?{...current,label:event.target.value,productCode:selected.orderMode==='material'?event.target.value:current.productCode}:current))}/></label>\n                                  <label><span>数量</span><input type="number" inputMode="decimal" min="0" step="0.01" value={item.orderQuantity??''} onFocus={event=>event.target.select()} onChange={event=>{const raw=event.target.value;setPurchaseOrderEditItems(previous=>previous.map((current,i)=>i===index?{...current,orderQuantity:raw}:current))}}/></label>\n                                  <label><span>単位</span><input value={item.unit||''} onChange={event=>setPurchaseOrderEditItems(previous=>previous.map((current,i)=>i===index?{...current,unit:event.target.value}:current))}/></label>\n                                  <label><span>単価</span><input type="number" inputMode="numeric" min="0" step="1" value={item.orderRate??''} onFocus={event=>event.target.select()} onChange={event=>{const raw=event.target.value;setPurchaseOrderEditItems(previous=>previous.map((current,i)=>i===index?{...current,orderRate:raw}:current))}}/></label>\n                                  <div className="draftOrderEditAmount"><span>金額</span><strong>{formatYen((Number(item.orderQuantity)||0)*(Number(item.orderRate)||0))}</strong></div>\n                                  <button type="button" className="danger" onClick={()=>setPurchaseOrderEditItems(previous=>previous.filter((_,i)=>i!==index))}>削除</button>\n                                </article>)}\n                              </div>\n                              <button type="button" className="draftOrderAddRow" onClick={()=>setPurchaseOrderEditItems(previous=>[...previous,{id:'draft-item-'+Date.now(),category:selected.orderMode==='material'?'material':'service',label:'',productCode:'',memo:'',sourceQuantity:0,factor:1,orderQuantity:'',unit:selected.orderMode==='material'?'':'式',orderRate:'',orderAmount:null}])}>＋ 明細追加</button>\n                              <footer>\n                                <button type="button" onClick={()=>{setEditingPurchaseOrderId('');setPurchaseOrderEditItems([])}}>取消</button>\n                                <button type="button" className="primary" onClick={()=>{\n                                  const cleaned=purchaseOrderEditItems.map(item=>{const quantity=item.orderQuantity===''?'':Math.max(0,Number(item.orderQuantity)||0);const rate=item.orderRate===''?'':Math.max(0,Number(item.orderRate)||0);return {...item,label:String(item.label||item.productCode||'').trim(),productCode:selected.orderMode==='material'?String(item.label||item.productCode||'').trim():item.productCode,orderQuantity:quantity,unit:String(item.unit||'').trim(),orderRate:rate,orderAmount:quantity===''||rate===''?null:Number(quantity)*Number(rate)}}).filter(item=>item.label||Number(item.orderQuantity)>0)\n                                  if(!cleaned.length){window.alert('明細を1件以上入力してください。');return}\n                                  const updated=purchaseOrders.map(order=>order.id===selected.id?{...order,items:cleaned,updatedAt:new Date().toISOString()}:order)\n                                  savePurchaseOrders(updated);setEditingPurchaseOrderId('');setPurchaseOrderEditItems([]);setSaveStatus('下書きを上書き保存しました');window.alert('下書きを上書き保存しました。')\n                                }}>下書きを上書き保存</button>\n                              </footer>\n                            </section>}\n                            `;
next=next.slice(0,itemsPos)+editor+next.slice(itemsPos);

// 4) CSS
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */\n  .draftOrderEditButton{min-height:40px;padding:7px 12px;border:1px solid #c78731;border-radius:9px;background:#fff7e8;color:#8b5614;font:inherit;font-weight:900}.draftOrderEditor{display:grid;gap:12px;margin:14px 0;padding:14px;border:2px solid #e3a646;border-radius:14px;background:#fffaf0}.draftOrderEditor>header{display:grid;gap:3px}.draftOrderEditor>header small{color:#756a78}.draftOrderEditRows{display:grid;gap:9px}.draftOrderEditRow{display:grid;grid-template-columns:minmax(180px,1.6fr) 100px 80px 110px 120px auto;gap:8px;align-items:end;padding:10px;border:1px solid #e1c99f;border-radius:10px;background:#fff}.draftOrderEditRow label{display:grid;gap:4px;margin:0}.draftOrderEditRow label span,.draftOrderEditAmount span{font-size:11px;font-weight:900;color:#756a78}.draftOrderEditRow input{width:100%;min-width:0;min-height:40px;padding:7px;border:1px solid #c9b897;border-radius:8px;font:inherit}.draftOrderEditAmount{display:grid;gap:4px;padding-bottom:8px;text-align:right}.draftOrderAddRow{min-height:42px;border:1px dashed #c78731;border-radius:9px;background:#fff;color:#8b5614;font:inherit;font-weight:900}.draftOrderEditor>footer{display:flex;justify-content:flex-end;gap:8px}.draftOrderEditor>footer button{min-height:44px;padding:8px 13px}.theme-dark .draftOrderEditor,.theme-cyber .draftOrderEditor,.theme-luxury .draftOrderEditor,.theme-retro .draftOrderEditor,.theme-galaxy .draftOrderEditor{background:#071522;color:#fff}.theme-dark .draftOrderEditRow,.theme-cyber .draftOrderEditRow,.theme-luxury .draftOrderEditRow,.theme-retro .draftOrderEditRow,.theme-galaxy .draftOrderEditRow{background:#101b27;color:#fff}@media(max-width:720px){.draftOrderEditButton{width:100%}.draftOrderEditRow{grid-template-columns:1fr 1fr}.draftOrderEditRow .wide{grid-column:1/-1}.draftOrderEditAmount{align-self:center;text-align:left}.draftOrderEditRow>.danger{width:100%}.draftOrderEditor>footer{display:grid;grid-template-columns:1fr}.draftOrderEditor>footer button{width:100%}}\n`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('下書き編集V1の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');console.log('OK: 発注書下書き編集V1を適用しました。');
 console.log('・下書きだけ編集可能');console.log('・品名/数量/単位/単価の変更');console.log('・明細追加/削除');console.log('・下書き上書き保存');console.log('・採寸/見積データは変更しません');console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
