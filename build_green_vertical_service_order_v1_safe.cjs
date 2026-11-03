const fs=require('fs');
const app='./src/App.jsx';
const sheet='./src/MCrossEstimateSheet.jsx';
const css='./src/App.css';
let a=fs.readFileSync(app,'utf8');
let s=fs.readFileSync(sheet,'utf8');
let c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_GREEN_VERTICAL_SERVICE_ORDER_V1_SAFE';
if(a.includes(mark)||s.includes(mark)||c.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}

// Preserve category when estimate rows are imported into the editable estimate.
const importTail="unit:String(row.unit||''),rate:row.rate===''||row.rate==null?'':Math.round(Number(row.rate)||0)}));setRows";
const importTailNew="unit:String(row.unit||''),rate:row.rate===''||row.rate==null?'':Math.round(Number(row.rate)||0),category:String(row.category||''),parts:Array.isArray(row.parts)?row.parts.map(value=>String(value||'')):[],memo:String(row.memo||'')}));setRows";
if((s.split(importTail).length-1)!==1){console.error('ERROR: 見積取込の行データ位置を特定できません。変更していません。');process.exit(1)}
s=s.replace(importTail,importTailNew);

// Replace the temporary click-through route with direct, safe orderDraft creation.
const route=/onCreateServiceOrder=\{picked=>\{\/\* M-CROSS_SKIP_DUPLICATE_ORDER_SELECTION_V4_SAFE \*\/[\s\S]*?\}\}\s*onExportEstimate=/;
if(!route.test(a)){console.error('ERROR: V4施工発注ルートを特定できません。変更していません。');process.exit(1)}
const routeNew=`onCreateServiceOrder={picked=>{/* ${mark} */ const items=(Array.isArray(picked)?picked:[]).map((row,index)=>{const category=String(row.category||'');const sourceQuantity=Math.max(0,Number(row.quantity)||0);const factor=['cross','cf'].includes(category)?0.9:1;return {id:'selected-service-'+Date.now()+'-'+index,sourceKey:String(row.sourceKey||row.id||index),label:String(row.name||row.label||''),parts:Array.isArray(row.parts)?row.parts.map(value=>String(value||'')):[],memo:String(row.memo||''),productCode:String(row.spec||row.productCode||''),category,sourceQuantity,factor,orderQuantity:Math.round(sourceQuantity*factor*100)/100,unit:String(row.unit||''),rate:Number(row.rate||0),amount:sourceQuantity*Number(row.rate||0),orderRate:''}});setSelectedOrderKeys(items.map(item=>item.sourceKey));setOrderDraft({contractor:'',contractorId:'',orderMode:'service',items});setPendingPurchaseOrderItems([]);setPurchaseOrderBranch(null);window.setTimeout(()=>document.querySelector('.serviceOrderPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}} onExportEstimate=`;
a=a.replace(route,routeNew);

const style=`\n/* ${mark} */\n.serviceOrderPanel{background:#f3fbf4!important;border:2px solid #83c99a!important;border-radius:22px!important;box-shadow:0 12px 30px rgba(45,105,68,.12)!important;font-family:MCrossBIZUDP,'BIZ UDPGothic','Yu Gothic',sans-serif!important}\n.serviceOrderPanel .orderDraftHeader{border-bottom:1px solid #b8ddc3!important;padding-bottom:12px!important}\n.serviceOrderPanel .orderDraftHeader small,.serviceOrderPanel .orderDraftHeader h3{color:#286b43!important}\n.serviceOrderPanel .contractorPickerField,.serviceOrderPanel .orderGroupRate,.serviceOrderPanel .orderExcelSheet,.serviceOrderPanel .orderDraftFooter{background:#fff!important;border:1px solid #b8ddc3!important;border-radius:16px!important}\n.serviceOrderPanel .contractorSelectButton{border-color:#72bd8a!important;background:#fbfffc!important;color:#245d3a!important}\n.serviceOrderPanel .orderFactorButtons button.active{background:#3f9b61!important;border-color:#3f9b61!important;color:#fff!important}\n.serviceOrderPanel .orderExcelSheetTitle,.serviceOrderPanel .orderExcelHeader{background:#dcefe1!important;color:#245d3a!important}\n.serviceOrderPanel .orderDraftItems{display:grid!important;grid-template-columns:1fr!important;gap:12px!important;padding:12px!important}\n.serviceOrderPanel .orderDraftItem{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;padding:14px!important;border:1px solid #b8ddc3!important;border-radius:16px!important;background:#fbfffc!important}\n.serviceOrderPanel .orderDraftItem>strong{font-size:17px!important;color:#214d31!important}\n.serviceOrderPanel .orderQuantityCompare{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}\n.serviceOrderPanel .orderQuantityCompare span,.serviceOrderPanel .orderQuantityCompare b{padding:9px!important;border-radius:10px!important;background:#eef8f0!important;text-align:center!important}\n.serviceOrderPanel .orderRateField,.serviceOrderPanel .orderLineAmount{border-top:1px dashed #acd2b7!important;padding-top:8px!important}\n.serviceOrderPanel .orderDraftFooter .primary{background:#3f9b61!important;border-color:#3f9b61!important}\n@media(max-width:700px){.serviceOrderPanel{border-radius:14px!important}.serviceOrderPanel .orderDraftItems{padding:6px!important}.serviceOrderPanel .orderDraftItem{padding:11px!important}.serviceOrderPanel .orderQuantityCompare{grid-template-columns:1fr!important}}\n`;
c += style;

fs.copyFileSync(app,'./src/App.before_green_vertical_service_order_v1.jsx');
fs.copyFileSync(sheet,'./src/MCrossEstimateSheet.before_green_vertical_service_order_v1.jsx');
fs.copyFileSync(css,'./src/App.before_green_vertical_service_order_v1.css');
fs.writeFileSync(app,a,'utf8');
fs.writeFileSync(sheet,s,'utf8');
fs.writeFileSync(css,c,'utf8');
console.log('OK: 見積選択から再チェックなしで、緑の縦型施工発注書へ直接進むようにしました。');
