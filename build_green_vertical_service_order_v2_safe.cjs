const fs=require('fs');
const app='./src/App.jsx';
const css='./src/App.css';
let a=fs.readFileSync(app,'utf8');
let c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_GREEN_VERTICAL_SERVICE_ORDER_V2_SAFE';
if(a.includes(mark)||c.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const start='onCreateServiceOrder={picked=>{';
const end=' onExportEstimate={';
const i=a.indexOf(start);
const j=i>=0?a.indexOf(end,i):-1;
if(i<0||j<0){console.error('ERROR: onCreateServiceOrder位置を特定できません。変更していません。');process.exit(1)}
const selected=a.slice(i,j);
if(!selected.includes('selectedOrderKeys')&&!selected.includes('setSelectedOrderKeys')){console.error('ERROR: 現在の施工発注ルートが想定外です。変更していません。');process.exit(1)}
const replacement=`onCreateServiceOrder={picked=>{/* ${mark} */ const items=(Array.isArray(picked)?picked:[]).map((row,index)=>{const text=String(row.name||row.label||'');const category=String(row.category||(/CF貼/i.test(text)?'cf':/クロス/.test(text)?'cross':'service'));const sourceQuantity=Math.max(0,Number(row.quantity)||0);const factor=['cross','cf'].includes(category)?0.9:1;return {id:'selected-service-'+Date.now()+'-'+index,sourceKey:String(row.sourceKey||row.id||index),label:text,parts:Array.isArray(row.parts)?row.parts.map(v=>String(v||'')):[],memo:String(row.memo||''),productCode:String(row.spec||row.productCode||''),category,sourceQuantity,factor,orderQuantity:Math.round(sourceQuantity*factor*100)/100,unit:String(row.unit||''),rate:Number(row.rate||0),amount:sourceQuantity*Number(row.rate||0),orderRate:''}});setSelectedOrderKeys(items.map(item=>item.sourceKey));setOrderDraft({contractor:'',contractorId:'',orderMode:'service',items});setPendingPurchaseOrderItems([]);setPurchaseOrderBranch(null);window.setTimeout(()=>document.querySelector('.serviceOrderPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}}`;
a=a.slice(0,i)+replacement+a.slice(j);
const style=`\n/* ${mark} */\n.serviceOrderPanel{background:#f3fbf4!important;border:2px solid #83c99a!important;border-radius:22px!important;box-shadow:0 12px 30px rgba(45,105,68,.12)!important}\n.serviceOrderPanel .orderDraftHeader small,.serviceOrderPanel .orderDraftHeader h3{color:#286b43!important}\n.serviceOrderPanel .contractorPickerField,.serviceOrderPanel .orderGroupRate,.serviceOrderPanel .orderExcelSheet,.serviceOrderPanel .orderDraftFooter{background:#fff!important;border:1px solid #b8ddc3!important;border-radius:16px!important}\n.serviceOrderPanel .contractorSelectButton{border-color:#72bd8a!important;background:#fbfffc!important;color:#245d3a!important}\n.serviceOrderPanel .orderFactorButtons button.active{background:#3f9b61!important;border-color:#3f9b61!important;color:#fff!important}\n.serviceOrderPanel .orderExcelSheetTitle,.serviceOrderPanel .orderExcelHeader{background:#dcefe1!important;color:#245d3a!important}\n.serviceOrderPanel .orderDraftItems{display:grid!important;grid-template-columns:1fr!important;gap:12px!important;padding:12px!important}\n.serviceOrderPanel .orderDraftItem{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;padding:14px!important;border:1px solid #b8ddc3!important;border-radius:16px!important;background:#fbfffc!important}\n.serviceOrderPanel .orderDraftItem>strong{font-size:17px!important;color:#214d31!important}\n.serviceOrderPanel .orderQuantityCompare{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}\n.serviceOrderPanel .orderQuantityCompare span,.serviceOrderPanel .orderQuantityCompare b{padding:9px!important;border-radius:10px!important;background:#eef8f0!important;text-align:center!important}\n.serviceOrderPanel .orderDraftFooter .primary{background:#3f9b61!important;border-color:#3f9b61!important}\n@media(max-width:1024px){.serviceOrderPanel .orderDraftItems{grid-template-columns:1fr!important}}\n@media(max-width:700px){.serviceOrderPanel{border-radius:14px!important}.serviceOrderPanel .orderDraftItems{padding:6px!important}.serviceOrderPanel .orderDraftItem{padding:11px!important}.serviceOrderPanel .orderQuantityCompare{grid-template-columns:1fr!important}}\n`;
fs.copyFileSync(app,'./src/App.before_green_vertical_service_order_v2.jsx');
fs.copyFileSync(css,'./src/App.before_green_vertical_service_order_v2.css');
fs.writeFileSync(app,a,'utf8');
fs.writeFileSync(css,c+style,'utf8');
console.log('OK: 現在の施工発注ルートを直接置換し、再チェックなしの緑縦型発注Draftへ接続しました。');
