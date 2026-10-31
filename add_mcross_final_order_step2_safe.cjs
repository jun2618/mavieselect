const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_INTERNAL_FINAL_ORDER_STEP2_SAFE';
const backup=file+'.internal-final-step2-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('M-Cross本発注書STEP2はすでに適用されています。');
if(!original.includes('M-CROSS_INTERNAL_FINAL_ORDER_STEP1_SAFE'))fail('STEP1が見つかりません。先にSTEP1を適用してください。');

let next=original;

// 1) 本発注書プレビュー用の合計表示を、明細の直後に追加
const previewClose='</div>\n                          </article>';
const previewPos=next.indexOf(previewClose,next.indexOf('purchaseOrderPreviewItems'));
if(previewPos<0)fail('発注書プレビュー明細の終了位置が見つかりません。');

const totals=`</div>
                            {selected.status==='本発注' && (()=>{
                              const subtotal=(selected.items||[]).reduce((sum,item)=>{
                                const amount=item.orderAmount==null||item.orderAmount===''?(Number(item.orderQuantity)||0)*(Number(item.orderRate)||0):Number(item.orderAmount||0)
                                return sum+(Number(amount)||0)
                              },0)
                              const tax=Math.round(subtotal*0.1)
                              const total=subtotal+tax
                              return <>
                                <section className="mcrossFinalOrderNotes">
                                  <strong>備考</strong>
                                  <div>{selected.contractorMemo||' '}</div>
                                </section>
                                <section className="mcrossFinalOrderTotals">
                                  <div><span>小計</span><strong>{formatYen(subtotal)}</strong></div>
                                  <div><span>消費税</span><strong>{formatYen(tax)}</strong></div>
                                  <div className="grandTotal"><span>合計</span><strong>{formatYen(total)}</strong></div>
                                </section>
                                <div className="mcrossFinalOrderOutputActions">
                                  <button type="button" onClick={()=>window.print()}>🖨 印刷 / PDF</button>
                                </div>
                              </>
                            })()}
                          </article>`;
next=next.slice(0,previewPos)+totals+next.slice(previewPos+previewClose.length);

// 2) STEP1で残っている旧Excel転記ボタン類を、本発注書ルートでは非表示にする
const oldExportButtonRegex=/<button type="button" onClick=\{\(\)=>\{const payload=localStorage\.getItem\('mcross_final_purchase_order_export_v1'\);[\s\S]*?<\/button>/g;
next=next.replace(oldExportButtonRegex,'');

// 3) 本発注書プレビューのヘッダーに発注日を表示
const infoNeedle="<p>{selected.propertyName} {selected.unit}号室</p>";
if(!next.includes(infoNeedle))fail('物件名表示位置が見つかりません。');
next=next.replace(infoNeedle,`<p>{selected.propertyName} {selected.unit}号室</p>{selected.status==='本発注'&&<p className="finalOrderIssuedAt">発注日：{new Date(selected.issuedAt||selected.finalizedAt||selected.createdAt).toLocaleDateString('ja-JP')}</p>}`);

// 4) CSS
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .mcrossFinalOrderNotes{display:grid;grid-template-columns:90px minmax(0,1fr);min-height:64px;margin-top:14px;border:1px solid #86919a;background:#fff}.mcrossFinalOrderNotes strong{display:grid;place-items:center;padding:10px;border-right:1px solid #86919a;background:#eef1f3}.mcrossFinalOrderNotes div{padding:10px;white-space:pre-wrap}
  .mcrossFinalOrderTotals{width:min(100%,420px);margin:14px 0 0 auto;border:1px solid #86919a;background:#fff}.mcrossFinalOrderTotals>div{display:grid;grid-template-columns:120px minmax(0,1fr);border-bottom:1px solid #c4c8cb}.mcrossFinalOrderTotals>div:last-child{border-bottom:0}.mcrossFinalOrderTotals span,.mcrossFinalOrderTotals strong{padding:9px 12px}.mcrossFinalOrderTotals span{background:#eef1f3;font-weight:900}.mcrossFinalOrderTotals strong{text-align:right}.mcrossFinalOrderTotals .grandTotal strong{font-size:20px;color:#d84d83}.mcrossFinalOrderOutputActions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.mcrossFinalOrderOutputActions button{min-height:44px;padding:8px 14px;border:1px solid #59636d;border-radius:9px;background:#59636d;color:#fff;font:inherit;font-weight:900}.finalOrderIssuedAt{font-size:13px;color:#65727c}
  @media(max-width:620px){.mcrossFinalOrderNotes{grid-template-columns:1fr}.mcrossFinalOrderNotes strong{border-right:0;border-bottom:1px solid #86919a}.mcrossFinalOrderTotals{width:100%}.mcrossFinalOrderTotals>div{grid-template-columns:100px minmax(0,1fr)}.mcrossFinalOrderOutputActions button{width:100%}}
  @media print{body *{visibility:hidden!important}.mcrossFinalOrderDocument,.mcrossFinalOrderDocument *{visibility:visible!important}.mcrossFinalOrderDocument{position:absolute!important;left:0!important;top:0!important;width:100%!important;box-shadow:none!important;border:1px solid #000!important;padding:14mm!important}.mcrossFinalOrderDocument .purchaseOrderPreviewHeader button,.mcrossFinalOrderOutputActions,.finalPurchaseOrderActions{display:none!important}.mcrossFinalOrderDocument::before{color:#000!important}.mcrossFinalOrderTotals .grandTotal strong{color:#000!important}}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('M-Cross本発注書STEP2の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: M-Cross本発注書STEP2を適用しました。');
  console.log('・小計 / 消費税10% / 合計を表示');
  console.log('・備考欄を追加');
  console.log('・発注日を表示');
  console.log('・印刷 / PDFボタンを追加');
  console.log('・旧「転記データを出力」ボタンを除去');
  console.log('・Excel転記は本線から外しました');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
