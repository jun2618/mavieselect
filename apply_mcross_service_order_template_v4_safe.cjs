const fs=require('fs');
const app='./src/App.jsx';
const css='./src/App.css';
let a=fs.readFileSync(app,'utf8');
let c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_SERVICE_ORDER_TEMPLATE_V4_SAFE';
if(a.includes(mark)||c.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}

const headerOld=`                      <div className="orderDraftHeader">
                        <div><small>ORDER STEP 2</small><h3>{(orderDraft.orderMode||'service')==='service'?'施工発注書作成':'発注先・発注掛率'}</h3></div>
                        <button type="button" onClick={() => setOrderDraft(null)}>× 閉じる</button>
                      </div>`;
const headerNew=`                      <div className="orderDraftHeader">
                        <div><small>ORDER STEP 2</small><h3>{(orderDraft.orderMode||'service')==='service'?'施工発注書作成':'発注先・発注掛率'}</h3></div>
                        <button type="button" onClick={() => setOrderDraft(null)}>× 閉じる</button>
                      </div>
                      {/* ${mark} */}
                      {(orderDraft.orderMode||'service')==='service'&&<>
                        <section className="mcrossServiceOrderIdentity">
                          <div className="mcrossServiceOrderBrand"><strong>M-Cross</strong><small>MavieSelect</small></div>
                          <h2>施 工 発 注 書</h2>
                          <div className="mcrossServiceOrderCompany"><strong>株式会社 MavieSelect</strong><span>〒060-0007</span><span>札幌市中央区北7条西22丁目1-12-201</span><span>TEL 011-699-6492　FAX 011-699-6493</span></div>
                        </section>
                        <section className="mcrossServiceOrderProperty">
                          <div><span>物件名</span><strong>{selectedProperty?.name||''}</strong></div>
                          <div><span>号室</span><strong>{unit?String(unit).replace(/号室$/,'')+'号室':''}</strong></div>
                          <div><span>住所</span><strong>{selectedProperty?.address||''}</strong></div>
                          <div><span>工事名</span><strong>{workName||'原状回復工事'}</strong></div>
                        </section>
                      </>}`;
const count=a.split(headerOld).length-1;
if(count!==1){console.error('ERROR: 現在の発注書ヘッダー MATCH='+count+'。変更していません。');process.exit(1)}
a=a.replace(headerOld,headerNew);

const style=`
/* ${mark} */
.serviceOrderPanel{--order-paper:#f1f8ec;--order-accent:#3f945c;--order-grid:#78947c;background-color:var(--order-paper)!important;background-image:radial-gradient(rgba(55,95,61,.045) .6px,transparent .7px),radial-gradient(rgba(255,255,255,.24) .7px,transparent .8px)!important;background-size:7px 7px,9px 9px!important;border:1px solid rgba(61,103,67,.34)!important;border-radius:3px!important;box-shadow:0 10px 30px rgba(38,76,45,.14)!important;font-family:MCrossBIZUDP,'BIZ UDPGothic','Yu Gothic',sans-serif!important;color:#243b29!important;padding:24px!important}
.serviceOrderPanel .orderDraftHeader{display:flex!important;align-items:center!important;justify-content:space-between!important;margin-bottom:8px!important;padding:0 0 10px!important;border-bottom:1px solid var(--order-grid)!important}.serviceOrderPanel .orderDraftHeader h3{margin:2px 0!important;color:#285f3c!important}.serviceOrderPanel .orderDraftHeader small{color:#578065!important}
.mcrossServiceOrderIdentity{display:grid;grid-template-columns:1fr 1.1fr 1fr;align-items:start;gap:18px;margin:8px 0 12px}.mcrossServiceOrderBrand{display:grid;color:#2f8a52;line-height:1}.mcrossServiceOrderBrand strong{font-size:32px}.mcrossServiceOrderBrand small{margin-top:5px;letter-spacing:.16em}.mcrossServiceOrderIdentity h2{margin:4px 0;text-align:center;font-size:30px;letter-spacing:.22em;color:#173e28}.mcrossServiceOrderCompany{display:grid;justify-items:center;gap:2px;text-align:center;font-size:12px}.mcrossServiceOrderCompany strong{font-size:17px;margin-bottom:5px}
.mcrossServiceOrderProperty{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;margin:8px 0 14px}.mcrossServiceOrderProperty>div{display:grid;grid-template-columns:78px 1fr;align-items:center;min-height:30px;border-bottom:1px solid rgba(118,151,125,.58)}.mcrossServiceOrderProperty span{font-weight:800}.mcrossServiceOrderProperty strong{font-weight:600;min-width:0;overflow-wrap:anywhere}
.serviceOrderPanel .contractorPickerField{display:grid!important;grid-template-columns:90px minmax(0,1fr) auto!important;align-items:center!important;gap:8px!important;padding:10px!important;margin:10px 0!important;border:1px solid var(--order-grid)!important;border-radius:10px!important;background:rgba(255,255,255,.55)!important}.serviceOrderPanel .contractorPickerField>span{font-weight:900;color:#285f3c}.serviceOrderPanel .contractorSelectButton{min-height:44px!important;border-color:#72ae82!important;background:#fff!important;color:#244f32!important;text-align:left!important;font-weight:900!important}
.serviceOrderPanel .orderGroupRate{display:grid!important;grid-template-columns:minmax(120px,.7fr) minmax(0,1.3fr)!important;align-items:center!important;gap:12px!important;padding:10px 12px!important;margin:8px 0!important;border:1px solid #a8c8ae!important;border-radius:10px!important;background:rgba(255,255,255,.55)!important}.serviceOrderPanel .orderFactorButtons{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}.serviceOrderPanel .orderFactorButtons button{min-height:42px!important;border:1px solid #85b590!important;border-radius:9px!important;background:#fff!important}.serviceOrderPanel .orderFactorButtons button.active{background:var(--order-accent)!important;border-color:var(--order-accent)!important;color:#fff!important}
.serviceOrderPanel .orderExcelSheet{margin-top:14px!important;border:1px solid var(--order-grid)!important;border-radius:0!important;background:rgba(255,255,255,.32)!important;overflow:hidden!important}.serviceOrderPanel .orderExcelSheetTitle{display:flex!important;justify-content:space-between!important;align-items:center!important;padding:10px 12px!important;background:#d8ead9!important;color:#173e28!important}.serviceOrderPanel .orderExcelSheetTitle strong{font-size:20px;letter-spacing:.16em}.serviceOrderPanel .orderExcelHeader{display:grid!important;grid-template-columns:minmax(210px,1.8fr) 150px 64px 120px 125px!important;background:#c9e2ce!important;color:#173e28!important;border-top:1px solid var(--order-grid)!important}.serviceOrderPanel .orderExcelHeader span{padding:8px 6px!important;border-right:1px solid var(--order-grid)!important;text-align:center!important;font-weight:900!important}
.serviceOrderPanel .orderDraftItems{display:grid!important;grid-template-columns:1fr!important;gap:0!important;padding:0!important}.serviceOrderPanel .orderDraftItem{display:grid!important;grid-template-columns:minmax(210px,1.8fr) 150px 64px 120px 125px!important;align-items:stretch!important;gap:0!important;padding:0!important;border:0!important;border-top:1px solid var(--order-grid)!important;border-radius:0!important;background:rgba(255,255,255,.56)!important}.serviceOrderPanel .orderDraftItem>strong{display:flex!important;align-items:center!important;padding:8px!important;border-right:1px solid var(--order-grid)!important;color:#203b29!important;font-size:14px!important}.serviceOrderPanel .orderDraftItem>small{grid-column:1;padding:0 8px 7px!important;border-right:1px solid var(--order-grid)!important}.serviceOrderPanel .orderQuantityCompare{grid-column:2;grid-row:1 / span 2;display:grid!important;align-content:center!important;gap:4px!important;padding:6px!important;border-right:1px solid var(--order-grid)!important}.serviceOrderPanel .orderQuantityCompare span,.serviceOrderPanel .orderQuantityCompare b{padding:4px!important;border-radius:6px!important;background:#edf7ee!important;text-align:center!important}.serviceOrderPanel .orderRateField{grid-column:4;grid-row:1 / span 2;display:grid!important;grid-template-columns:1fr auto!important;align-content:center!important;gap:4px!important;padding:6px!important;border-right:1px solid var(--order-grid)!important}.serviceOrderPanel .orderRateField span{grid-column:1/-1;text-align:center;font-weight:800}.serviceOrderPanel .orderLineAmount{grid-column:5;grid-row:1 / span 2;display:grid!important;align-content:center!important;gap:5px!important;padding:6px!important;text-align:right!important}.serviceOrderPanel .orderLineAmount span{text-align:center}.serviceOrderPanel .orderQuantityField{grid-column:3;grid-row:1 / span 2;display:grid!important;align-content:center!important;padding:6px!important;border-right:1px solid var(--order-grid)!important}.serviceOrderPanel .orderDraftFooter{display:flex!important;justify-content:space-between!important;align-items:center!important;margin-top:14px!important;padding:12px!important;border:1px solid var(--order-grid)!important;background:#dceedd!important}.serviceOrderPanel .orderDraftFooter .primary{background:#2f8550!important;border-color:#2f8550!important;color:#fff!important}
@media(max-width:1024px){.serviceOrderPanel{padding:14px!important}.mcrossServiceOrderIdentity{grid-template-columns:1fr 1fr}.mcrossServiceOrderCompany{grid-column:1/-1}.serviceOrderPanel .orderExcelHeader,.serviceOrderPanel .orderDraftItem{grid-template-columns:minmax(180px,1.6fr) 135px 58px 105px 115px!important}}
@media(max-width:700px){.serviceOrderPanel{padding:9px!important;border-radius:0!important}.mcrossServiceOrderIdentity{grid-template-columns:1fr}.mcrossServiceOrderIdentity h2{text-align:left;font-size:25px}.mcrossServiceOrderCompany{justify-items:start;text-align:left}.mcrossServiceOrderProperty{grid-template-columns:1fr}.serviceOrderPanel .contractorPickerField,.serviceOrderPanel .orderGroupRate{grid-template-columns:1fr!important}.serviceOrderPanel .orderExcelSheet{overflow-x:auto!important}.serviceOrderPanel .orderExcelHeader,.serviceOrderPanel .orderDraftItem{min-width:730px!important}.serviceOrderPanel .orderDraftFooter{align-items:stretch!important;flex-direction:column!important}}
`;
fs.copyFileSync(app,'./src/App.before_service_order_template_v4.jsx');
fs.copyFileSync(css,'./src/App.before_service_order_template_v4.css');
fs.writeFileSync(app,a,'utf8');
fs.writeFileSync(css,c+style,'utf8');
console.log('OK: 現在の実コードへ見積書型ミントグリーン施工発注書テンプレートを反映しました。');
