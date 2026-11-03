const fs=require('fs');
const app='./src/App.jsx';
const comp='./src/MCrossServiceOrderSheet.jsx';
const css='./src/MCrossServiceOrderSheet.css';
if(!fs.existsSync(app)||!fs.existsSync(comp)||!fs.existsSync(css)){console.error('ERROR: target files missing. no changes');process.exit(1)}
let a=fs.readFileSync(app,'utf8'), s=fs.readFileSync(comp,'utf8'), c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_SERVICE_ORDER_TEXT_SPINNER_VENDOR_V9_SAFE';
if(a.includes(mark)||s.includes(mark)||c.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}

// 1) Make the in-sheet contractor selector actually open the existing contractor picker.
let sig="export default function MCrossServiceOrderSheet({orderDraft,setOrderDraft,propertyName='',unit='',address='',workName='',onSave,onChooseContractor}){";
if(!s.includes(sig)){
  const old="export default function MCrossServiceOrderSheet({orderDraft,setOrderDraft,propertyName='',unit='',address='',workName='',onSave}){";
  if(!s.includes(old)){console.error('ERROR: component signature not found. no changes');process.exit(1)}
  s=s.replace(old,sig);
}
// 2) Hide native number spinners while retaining numeric input.
c += `\n/* ${mark} */\n.mcrossServiceSheetRow>span{height:33px!important;min-height:33px!important;font-size:13px!important;padding:2px 4px!important}\n.mcrossServiceSheetRow.head>span{height:31px!important;min-height:31px!important;font-size:12px!important}\n.mcrossServiceSheetRow input{height:27px!important;min-height:27px!important;font-size:13px!important;padding:1px 4px!important}\n.mcrossServiceSheetRow input[type=number]{appearance:textfield!important;-moz-appearance:textfield!important}\n.mcrossServiceSheetRow input[type=number]::-webkit-inner-spin-button,.mcrossServiceSheetRow input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none!important;margin:0!important}\n.mcrossServiceSheetMeta>div{min-height:31px!important}.mcrossServiceSheetMeta span{font-size:15px!important}.mcrossServiceSheetMeta strong{font-size:17px!important}.mcrossServiceSheetMeta .wide strong{font-size:18px!important}\n@media(max-width:1024px){.mcrossServiceSheetRow>span{height:31px!important;min-height:31px!important;font-size:12px!important}.mcrossServiceSheetRow.head>span{height:29px!important;min-height:29px!important;font-size:11.5px!important}.mcrossServiceSheetRow input{height:25px!important;min-height:25px!important;font-size:12px!important}}\n`;

// 3) Pass existing contractor picker action into modular sheet.
const needle='<MCrossServiceOrderSheet orderDraft={orderDraft} setOrderDraft={setOrderDraft} propertyName={selectedProperty?.name||\'\'} unit={unit} address={selectedProperty?.address||\'\'} workName={workName||\'\'} onSave={saveCurrentPurchaseOrder}/>';
if(!a.includes(needle)){console.error('ERROR: MCrossServiceOrderSheet usage not found. no changes');process.exit(1)}
const repl='<MCrossServiceOrderSheet orderDraft={orderDraft} setOrderDraft={setOrderDraft} propertyName={selectedProperty?.name||\'\'} unit={unit} address={selectedProperty?.address||\'\'} workName={workName||\'\'} onSave={saveCurrentPurchaseOrder} onChooseContractor={()=>{setShowContractorPicker(true);window.setTimeout(()=>{const b=document.querySelector(\'.contractorPickerBackdrop\');const p=document.querySelector(\'.contractorPickerPanel\');if(b){b.scrollTop=0;b.scrollLeft=0}if(p){p.scrollTop=0;p.scrollLeft=0}},50)}}/>';
a=a.replace(needle,repl);

// 4) Hide duplicate legacy contractor/rate controls now embedded in the sheet.
c += `\n.serviceOrderPanel>.contractorPickerField,.serviceOrderPanel>.orderGroupRate{display:none!important}\n`;

fs.copyFileSync(app,'./src/App.before_service_order_text_vendor_v9.jsx');
fs.copyFileSync(comp,'./src/MCrossServiceOrderSheet.before_service_order_text_vendor_v9.jsx');
fs.copyFileSync(css,'./src/MCrossServiceOrderSheet.before_service_order_text_vendor_v9.css');
fs.writeFileSync(app,a,'utf8');fs.writeFileSync(comp,s,'utf8');fs.writeFileSync(css,c,'utf8');
console.log('OK: text/row sizes enlarged, number spinners hidden, and in-sheet contractor picker restored.');
