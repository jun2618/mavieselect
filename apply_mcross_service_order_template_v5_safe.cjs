const fs=require('fs');
const app='./src/App.jsx', css='./src/App.css';
let a=fs.readFileSync(app,'utf8'), c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_SERVICE_ORDER_TEMPLATE_V5_SAFE';
if(a.includes(mark)||c.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
let L=a.split(/\r?\n/), eol=a.includes('\r\n')?'\r\n':'\n';
const h=L.findIndex(x=>x.includes('<div className="orderDraftHeader">'));
if(h<0){console.error('ERROR: orderDraftHeader not found. no changes');process.exit(1)}
let end=-1;
for(let i=h;i<Math.min(L.length,h+12);i++){if(L[i].trim()==='</div>'){end=i;break}}
if(end<0||!L.slice(h,end+1).some(x=>x.includes('ORDER STEP 2'))){console.error('ERROR: header block unexpected. no changes');process.exit(1)}
const indent=L[h].match(/^\s*/)[0];
const add=[
 indent+`{/* ${mark} */}`,
 indent+`{(orderDraft.orderMode||'service')==='service'&&<>`,
 indent+`  <section className="mcrossServiceOrderIdentity">`,
 indent+`    <div className="mcrossServiceOrderBrand"><strong>M-Cross</strong><small>MavieSelect</small></div>`,
 indent+`    <h2>施 工 発 注 書</h2>`,
 indent+`    <div className="mcrossServiceOrderCompany"><strong>株式会社 MavieSelect</strong><span>〒060-0007</span><span>札幌市中央区北7条西22丁目1-12-201</span><span>TEL 011-699-6492　FAX 011-699-6493</span></div>`,
 indent+`  </section>`,
 indent+`  <section className="mcrossServiceOrderProperty">`,
 indent+`    <div><span>物件名</span><strong>{selectedProperty?.name||''}</strong></div>`,
 indent+`    <div><span>号室</span><strong>{unit?String(unit).replace(/号室$/,'')+'号室':''}</strong></div>`,
 indent+`    <div><span>住所</span><strong>{selectedProperty?.address||''}</strong></div>`,
 indent+`    <div><span>工事名</span><strong>{workName||'原状回復工事'}</strong></div>`,
 indent+`  </section>`,
 indent+`</>}`
];
L.splice(end+1,0,...add);
a=L.join(eol);
const style=`\n/* ${mark} */\n.serviceOrderPanel{--svc-paper:#f2f8ed;--svc-accent:#3f945c;--svc-grid:#78947c;background:var(--svc-paper)!important;border:1px solid rgba(61,103,67,.35)!important;border-radius:4px!important;padding:24px!important;color:#243b29!important;font-family:MCrossBIZUDP,'BIZ UDPGothic','Yu Gothic',sans-serif!important;box-shadow:0 10px 30px rgba(38,76,45,.14)!important}\n.mcrossServiceOrderIdentity{display:grid;grid-template-columns:1fr 1.1fr 1fr;align-items:start;gap:16px;margin:8px 0 14px}.mcrossServiceOrderBrand{display:grid;color:#2f8a52;line-height:1}.mcrossServiceOrderBrand strong{font-size:32px}.mcrossServiceOrderBrand small{margin-top:5px;letter-spacing:.16em}.mcrossServiceOrderIdentity h2{margin:4px 0;text-align:center;font-size:30px;letter-spacing:.22em;color:#173e28}.mcrossServiceOrderCompany{display:grid;justify-items:center;text-align:center;gap:2px;font-size:12px}.mcrossServiceOrderCompany strong{font-size:17px;margin-bottom:5px}.mcrossServiceOrderProperty{display:grid;grid-template-columns:1fr 1fr;gap:0 18px;margin:8px 0 14px}.mcrossServiceOrderProperty>div{display:grid;grid-template-columns:76px 1fr;align-items:center;min-height:30px;border-bottom:1px solid rgba(118,151,125,.6)}.mcrossServiceOrderProperty span{font-weight:900}.mcrossServiceOrderProperty strong{font-weight:600}.serviceOrderPanel .contractorPickerField,.serviceOrderPanel .orderGroupRate{border-color:#a6c6ad!important;background:rgba(255,255,255,.55)!important}.serviceOrderPanel .orderFactorButtons button.active{background:var(--svc-accent)!important;border-color:var(--svc-accent)!important;color:#fff!important}.serviceOrderPanel .orderExcelSheet{border:1px solid var(--svc-grid)!important;border-radius:0!important;background:rgba(255,255,255,.36)!important}.serviceOrderPanel .orderExcelSheetTitle,.serviceOrderPanel .orderExcelHeader{background:#d5ead8!important;color:#173e28!important}.serviceOrderPanel .orderDraftItem{border-color:var(--svc-grid)!important}.serviceOrderPanel .orderDraftFooter{background:#dceedd!important;border-color:var(--svc-grid)!important}.serviceOrderPanel .orderDraftFooter .primary{background:#2f8550!important;border-color:#2f8550!important}\n@media(max-width:1024px){.serviceOrderPanel{padding:14px!important}.mcrossServiceOrderIdentity{grid-template-columns:1fr 1fr}.mcrossServiceOrderCompany{grid-column:1/-1}.mcrossServiceOrderProperty{grid-template-columns:1fr}}\n@media(max-width:700px){.serviceOrderPanel{padding:9px!important}.mcrossServiceOrderIdentity{grid-template-columns:1fr}.mcrossServiceOrderIdentity h2{text-align:left;font-size:25px}.mcrossServiceOrderCompany{grid-column:auto;justify-items:start;text-align:left}}\n`;
fs.copyFileSync(app,'./src/App.before_service_order_template_v5.jsx');
fs.copyFileSync(css,'./src/App.before_service_order_template_v5.css');
fs.writeFileSync(app,a,'utf8'); fs.writeFileSync(css,c+style,'utf8');
console.log('OK: current header located structurally; service-order template applied.');
