const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_PURCHASE_ORDER_STEP1_SAFE';
const backup=file+'.final-order-step1-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('本発注書STEP1はすでに適用されています。');
let next=original;

// 発注書プレビューの削除ボタンを基準に、本発注書作成ボタンを追加。
const deleteButtonRegex=/<button\s+className="danger"\s+type="button"\s+onClick=\{\(\)=>deletePurchaseOrder\(selected\.id\)\}>削除<\/button>/;
const matches=next.match(new RegExp(deleteButtonRegex.source,'g'))||[];
if(matches.length!==1)fail('発注書プレビューの削除ボタンを一意に特定できません。検出数: '+matches.length);

const actionButtons=`{/* ${marker} */}
                              <div className="finalPurchaseOrderActions">
                                <button
                                  type="button"
                                  className="primary"
                                  onClick={()=>{
                                    const rows=(selected.items||[]).map((item,index)=>({
                                      no:index+1,
                                      item:String(item.label||item.productCode||''),
                                      specification:String(item.memo||''),
                                      quantity:Number(item.orderQuantity||0),
                                      unit:String(item.unit||''),
                                      unitPrice:item.orderRate==null||item.orderRate===''?'':Number(item.orderRate||0),
                                      amount:item.orderAmount==null||item.orderAmount===''?((Number(item.orderQuantity)||0)*(Number(item.orderRate)||0)):Number(item.orderAmount||0)
                                    }))
                                    if(!rows.length){window.alert('発注明細がありません。');return}
                                    const payload={
                                      version:1,
                                      template:'工事カードNew3 40.xlsm',
                                      sheetName:'発注書',
                                      sourcePurchaseOrderId:selected.id,
                                      orderMode:selected.orderMode||'service',
                                      status:'本発注準備',
                                      createdAt:new Date().toISOString(),
                                      contractor:{
                                        id:selected.contractorId||'',
                                        name:selected.contractorName||'',
                                        trade:selected.contractorTrade||'',
                                        postalCode:selected.contractorPostalCode||'',
                                        address:selected.contractorAddress||'',
                                        contact:selected.contractorContact||'',
                                        phone:selected.contractorPhone||''
                                      },
                                      property:{
                                        company:selected.company||'',
                                        id:selected.propertyId||'',
                                        name:selected.propertyName||'',
                                        unit:String(selected.unit||''),
                                        address:selected.address||'',
                                        workName:selected.workName||''
                                      },
                                      rows,
                                      subtotal:rows.reduce((sum,row)=>sum+(Number(row.amount)||0),0),
                                      tax:0,
                                      total:rows.reduce((sum,row)=>sum+(Number(row.amount)||0),0)
                                    }
                                    localStorage.setItem('mcross_final_purchase_order_export_v1',JSON.stringify(payload))
                                    window.alert('本発注書のExcel出力データを準備しました。次のSTEPでExcelテンプレートへ出力します。')
                                  }}
                                >📄 本発注書を作成</button>
                                ${matches[0]}
                              </div>`;
next=next.replace(deleteButtonRegex,actionButtons);

// STEP1の状態が分かる説明をプレビュー明細の下へ追加。
const previewItemsNeedle='<div className="purchaseOrderPreviewItems">';
if(!next.includes(previewItemsNeedle))fail('発注書プレビュー明細が見つかりません。');
next=next.replace(previewItemsNeedle,`<div className="finalPurchaseOrderStepNote">下書き内容を確認して「本発注書を作成」を押すと、Excelテンプレート出力用データを準備します。</div>${previewItemsNeedle}`);

// CSSはApp.jsx内の既存CSS領域へ追加。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .finalPurchaseOrderActions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
  .finalPurchaseOrderActions .primary{min-height:40px;padding:7px 12px;border:1px solid #4b77d1;border-radius:9px;background:#4b77d1;color:#fff;font:inherit;font-weight:900}
  .finalPurchaseOrderStepNote{margin:12px 0;padding:10px;border:1px solid rgba(75,119,209,.35);border-radius:10px;background:rgba(75,119,209,.08);font-size:13px;color:#5f6872}
  @media(max-width:620px){.purchaseOrderPreviewHeader{display:grid;grid-template-columns:minmax(0,1fr)}.finalPurchaseOrderActions{justify-content:stretch}.finalPurchaseOrderActions button{flex:1 1 auto}.finalPurchaseOrderActions .primary{width:100%}}
  .theme-dark .finalPurchaseOrderStepNote,.theme-cyber .finalPurchaseOrderStepNote,.theme-luxury .finalPurchaseOrderStepNote,.theme-retro .finalPurchaseOrderStepNote,.theme-galaxy .finalPurchaseOrderStepNote{color:#dffcff;background:rgba(75,119,209,.16)}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('本発注書STEP1の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 本発注書作成STEP1を適用しました。');
  console.log('・下書きプレビューに「本発注書を作成」ボタンを追加');
  console.log('・発注先/物件/明細/数量/単位/単価/金額をExcel出力用データへ整理');
  console.log('・元の下書きステータスはまだ変更しません');
  console.log('・Excelファイル出力は次のSTEPで追加します');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
