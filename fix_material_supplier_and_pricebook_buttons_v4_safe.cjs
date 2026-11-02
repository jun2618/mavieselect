const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_MATERIAL_SUPPLIER_PRICEBOOK_BUTTONS_V4_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=f+'.before-material-supplier-pricebook-v4-'+Date.now()+'.bak';
// Remove the mistakenly-added class from the unrelated delete button if present.
s=s.replace('className="materialChooseSupplierButton" onClick={event => { event.stopPropagation(); if (editingAdditionalWorkId === item.id)', 'onClick={event => { event.stopPropagation(); if (editingAdditionalWorkId === item.id)');
// Add class to the actual supplier button using its unique handler.
const supplier=`<button
                                  type="button"
                                  onClick={() =>
                                    setShowMaterialSupplierPicker(true)
                                  }
                                >`;
const supplierNew=`<button
                                  type="button"
                                  className="materialChooseSupplierButton"
                                  onClick={() =>
                                    setShowMaterialSupplierPicker(true)
                                  }
                                >`;
let n=s.split(supplier).length-1;if(n!==1){console.error('ERROR: supplier button MATCH='+n+'; no changes');process.exit(1)}
s=s.replace(supplier,supplierNew);
// Add class to the adjacent pricebook button, without touching its logic.
const pricebook=`<button
                                  type="button"
                                  disabled={!materialSupplierId}
                                  onClick={() =>
                                    setShowMaterialPriceBook(`;
const pricebookNew=`<button
                                  type="button"
                                  className="materialPriceBookButton"
                                  disabled={!materialSupplierId}
                                  onClick={() =>
                                    setShowMaterialPriceBook(`;
n=s.split(pricebook).length-1;if(n!==1){console.error('ERROR: pricebook button MATCH='+n+'; no changes');process.exit(1)}
s=s.replace(pricebook,pricebookNew);
const anchor='  /* M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE */';
const i=s.indexOf(anchor);if(i<0){console.error('ERROR: CSS anchor missing; no changes');process.exit(1)}
const css=`  /* ${marker} */\n  .materialChooseSupplierButton,.materialPriceBookButton,.materialOtherAddButton{appearance:none!important;min-height:52px!important;padding:10px 18px!important;border:0!important;border-radius:15px!important;font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif!important;font-size:16px!important;font-weight:900!important;letter-spacing:.04em!important;color:#fff!important;background:linear-gradient(180deg,#78cdb9,#54ae98)!important;box-shadow:0 5px 0 #318a77!important;cursor:pointer!important}.materialChooseSupplierButton:active,.materialPriceBookButton:active,.materialOtherAddButton:active{transform:translateY(2px)!important;box-shadow:0 3px 0 #318a77!important}.materialPriceBookButton:disabled{opacity:.42!important;filter:grayscale(.25)!important;box-shadow:none!important;cursor:not-allowed!important}.theme-dark .materialChooseSupplierButton,.theme-dark .materialPriceBookButton,.theme-dark .materialOtherAddButton,.theme-cyber .materialChooseSupplierButton,.theme-cyber .materialPriceBookButton,.theme-cyber .materialOtherAddButton,.theme-luxury .materialChooseSupplierButton,.theme-luxury .materialPriceBookButton,.theme-luxury .materialOtherAddButton,.theme-retro .materialChooseSupplierButton,.theme-retro .materialPriceBookButton,.theme-retro .materialOtherAddButton,.theme-galaxy .materialChooseSupplierButton,.theme-galaxy .materialPriceBookButton,.theme-galaxy .materialOtherAddButton{background:linear-gradient(180deg,#309d8b,#1f7568)!important;box-shadow:0 5px 0 #145146!important;color:#fff!important}@media(max-width:620px){.materialChooseSupplierButton,.materialPriceBookButton,.materialOtherAddButton{width:100%!important}}\n`;
s=s.slice(0,i)+css+s.slice(i);
fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
console.log('OK: supplier / pricebook / material add buttons fixed');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
