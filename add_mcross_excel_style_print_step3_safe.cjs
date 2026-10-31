const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_EXCEL_STYLE_FINAL_ORDER_PRINT_STEP3_SAFE';
const backup=file+'.excel-style-print-step3-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('Excel書式印刷STEP3はすでに適用されています。');
if(!original.includes('M-CROSS_INTERNAL_FINAL_ORDER_STEP1_SAFE'))fail('M-Cross本発注書STEP1が見つかりません。');

let next=original;

// 発注書プレビューarticleの閉じ位置を、空表示メッセージを基準に特定。
const emptyNeedle=':<p className="empty">左の発注書を選択してください</p>';
const emptyPos=next.indexOf(emptyNeedle);
if(emptyPos<0)fail('発注書プレビューの空表示位置が見つかりません。');
const articleClosePos=next.lastIndexOf('</article>',emptyPos);
if(articleClosePos<0)fail('発注書プレビューarticleの終了位置が見つかりません。');

const printSheet=`
                            {/* ${marker} */}
                            {selected.status==='本発注' && (()=>{
                              const rows=(selected.items||[]).map((item,index)=>({
                                no:index+1,
                                type:selected.orderMode==='material'?'材料':'施工',
                                name:String(item.label||item.productCode||''),
                                memo:String(item.memo||''),
                                quantity:Number(item.orderQuantity||0),
                                unit:String(item.unit||''),
                                rate:item.orderRate==null||item.orderRate===''?'':Number(item.orderRate||0),
                                amount:item.orderAmount==null||item.orderAmount===''?(Number(item.orderQuantity)||0)*(Number(item.orderRate)||0):Number(item.orderAmount||0)
                              }))
                              const subtotal=rows.reduce((sum,row)=>sum+(Number(row.amount)||0),0)
                              const tax=Math.round(subtotal*0.1)
                              const total=subtotal+tax
                              const issuedAt=new Date(selected.issuedAt||selected.finalizedAt||selected.createdAt)
                              return <section className="mcrossExcelOrderPrintSheet" aria-label="Excel書式 本発注書">
                                <header className="excelOrderPrintHeader">
                                  <h1>発　注　書</h1>
                                  <div className="excelOrderDate">日付　{issuedAt.toLocaleDateString('ja-JP')}</div>
                                </header>

                                <section className="excelOrderParties">
                                  <div className="excelOrderVendor">
                                    <strong>{selected.contractorName||'発注先未設定'}</strong>
                                    <span>{[selected.contractorPostalCode,selected.contractorAddress].filter(Boolean).join(' ')}</span>
                                    <span>{[selected.contractorContact,selected.contractorPhone].filter(Boolean).join('　')}</span>
                                  </div>
                                  <div className="excelOrderCompany">
                                    <strong>株式会社MavieSelect</strong>
                                    <span>〒060-0007</span>
                                    <span>札幌市中央区北7条西22丁目1-12-201</span>
                                    <span>TEL：011-699-6492</span>
                                    <span>FAX：011-699-6493</span>
                                  </div>
                                </section>

                                <section className="excelOrderPropertyGrid">
                                  <div><b>物件名：</b><span>{selected.propertyName||''}</span></div>
                                  <div><b>号室：</b><span>{selected.unit||''}</span></div>
                                  <div className="wide"><b>現場住所：</b><span>{selected.address||''}</span></div>
                                  <div className="wide"><b>工事名：</b><span>{selected.workName||''}</span></div>
                                  <div className="wide totalTop"><b>合計金額：</b><strong>{formatYen(total)}</strong></div>
                                </section>

                                <table className="excelOrderDetailTable">
                                  <thead><tr><th>項目</th><th>商品名</th><th>数量</th><th>単位</th><th>単価</th><th>金額</th></tr></thead>
                                  <tbody>
                                    {Array.from({length:27},(_,index)=>{
                                      const row=rows[index]
                                      return <tr key={index}>
                                        <td>{row?.type||''}</td>
                                        <td>{row?[row.name,row.memo].filter(Boolean).join(' '):''}</td>
                                        <td>{row?formatQuantity(row.quantity):''}</td>
                                        <td>{row?.unit||''}</td>
                                        <td>{row&&row.rate!==''?formatYen(row.rate):''}</td>
                                        <td>{row&&row.rate!==''?formatYen(row.amount):''}</td>
                                      </tr>
                                    })}
                                  </tbody>
                                </table>

                                <section className="excelOrderBottom">
                                  <div className="excelOrderNote"><b>備考</b><span>{selected.contractorMemo||''}</span></div>
                                  <div className="excelOrderTotals">
                                    <div><b>小計</b><strong>{formatYen(subtotal)}</strong></div>
                                    <div><b>消費税</b><strong>{formatYen(tax)}</strong></div>
                                    <div><b>合計</b><strong>{formatYen(total)}</strong></div>
                                  </div>
                                </section>
                              </section>
                            })()}
`;
next=next.slice(0,articleClosePos)+printSheet+next.slice(articleClosePos);

// 本発注ヘッダーに専用印刷ボタンを追加。削除ボタンの直前へ。
const deleteButton='<button className="danger" type="button" onClick={()=>deletePurchaseOrder(selected.id)}>削除</button>';
if(!next.includes(deleteButton))fail('削除ボタンが見つかりません。');
next=next.replace(deleteButton,`{selected.status==='本発注'&&<button className="excelStylePrintButton" type="button" onClick={()=>window.print()}>🖨 Excel書式で印刷 / PDF</button>}${deleteButton}`);

// CSS
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .mcrossExcelOrderPrintSheet{display:none}
  .excelStylePrintButton{min-height:40px;padding:7px 12px;border:1px solid #59636d;border-radius:9px;background:#59636d;color:#fff;font:inherit;font-weight:900}
  @media print{
    @page{size:A4 portrait;margin:8mm}
    body *{visibility:hidden!important}
    .mcrossExcelOrderPrintSheet,.mcrossExcelOrderPrintSheet *{visibility:visible!important}
    .mcrossExcelOrderPrintSheet{display:block!important;position:absolute!important;left:0!important;top:0!important;width:194mm!important;min-height:281mm!important;padding:5mm!important;background:#fff!important;color:#000!important;font-family:'Yu Gothic','Meiryo',sans-serif!important;font-size:10pt!important}
    .excelOrderPrintHeader{position:relative;border-bottom:3px double #000;padding-bottom:4mm;margin-bottom:4mm}.excelOrderPrintHeader h1{margin:0;text-align:center;font-size:22pt;letter-spacing:.3em}.excelOrderDate{position:absolute;right:0;top:1mm;font-size:9pt}
    .excelOrderParties{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-bottom:4mm}.excelOrderVendor,.excelOrderCompany{display:grid;align-content:start;min-height:29mm;padding:3mm;border:1px solid #777}.excelOrderVendor strong,.excelOrderCompany strong{font-size:12pt}.excelOrderVendor span,.excelOrderCompany span{margin-top:1.5mm}
    .excelOrderPropertyGrid{display:grid;grid-template-columns:1fr 55mm;border:1px solid #000;border-bottom:0}.excelOrderPropertyGrid>div{display:grid;grid-template-columns:24mm 1fr;min-height:8mm;padding:1.5mm 2mm;border-bottom:1px solid #000}.excelOrderPropertyGrid>div:nth-child(odd):not(.wide){border-right:1px solid #000}.excelOrderPropertyGrid .wide{grid-column:1/-1}.excelOrderPropertyGrid .totalTop strong{text-align:right;font-size:14pt}
    .excelOrderDetailTable{width:100%;border-collapse:collapse;table-layout:fixed}.excelOrderDetailTable th,.excelOrderDetailTable td{border:1px solid #000;padding:1mm 1.5mm;height:6.2mm;overflow:hidden}.excelOrderDetailTable th{background:#eee;font-weight:900;text-align:center}.excelOrderDetailTable th:nth-child(1){width:17mm}.excelOrderDetailTable th:nth-child(2){width:auto}.excelOrderDetailTable th:nth-child(3){width:18mm}.excelOrderDetailTable th:nth-child(4){width:14mm}.excelOrderDetailTable th:nth-child(5){width:23mm}.excelOrderDetailTable th:nth-child(6){width:25mm}.excelOrderDetailTable td:nth-child(3),.excelOrderDetailTable td:nth-child(4){text-align:center}.excelOrderDetailTable td:nth-child(5),.excelOrderDetailTable td:nth-child(6){text-align:right}
    .excelOrderBottom{display:grid;grid-template-columns:1fr 64mm;border:1px solid #000;border-top:0}.excelOrderNote{display:grid;grid-template-columns:16mm 1fr;min-height:23mm}.excelOrderNote b{display:grid;place-items:center;border-right:1px solid #000;background:#eee}.excelOrderNote span{padding:2mm;white-space:pre-wrap}.excelOrderTotals{border-left:1px solid #000}.excelOrderTotals>div{display:grid;grid-template-columns:24mm 1fr;min-height:7.5mm;border-bottom:1px solid #000}.excelOrderTotals>div:last-child{border-bottom:0}.excelOrderTotals b{display:grid;place-items:center;border-right:1px solid #000;background:#eee}.excelOrderTotals strong{padding:1.5mm 2mm;text-align:right;font-size:11pt}
  }
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('Excel書式印刷STEP3の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: Excel書式の印刷/PDF STEP3を適用しました。');
  console.log('・工事カードの発注書構成をM-Cross内の印刷専用帳票として再現');
  console.log('・A4縦 / 最大27明細 / 小計 / 消費税 / 合計 / 備考');
  console.log('・画面上の編集カードは印刷されません');
  console.log('・Excelファイルを開かず印刷/PDF保存できます');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
