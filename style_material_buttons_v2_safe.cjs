const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_MATERIAL_BUTTON_STYLE_V2_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=f+'.before-material-button-style-v2-'+Date.now()+'.bak';
// Add classes by replacing only the opening fragments immediately before stable labels/handlers.
const supplierNeedle='type="button"\n                                  onClick={() =>\n                                    setShowMaterialSupplierPicker(true)';
const supplierRepl='type="button"\n                                  className="materialChooseSupplierButton"\n                                  onClick={() =>\n                                    setShowMaterialSupplierPicker(true)';
let n=s.split(supplierNeedle).length-1;if(n!==1){console.error('ERROR: supplier MATCH='+n+'; no changes');process.exit(1)}
s=s.replace(supplierNeedle,supplierRepl);
const addNeedle='type="button"\n                            onClick={() => {\n                              const id =';
const addRepl='type="button"\n                            className="materialOtherAddButton"\n                            onClick={() => {\n                              const id =';
n=s.split(addNeedle).length-1;if(n!==1){console.error('ERROR: add MATCH='+n+'; no changes');process.exit(1)}
s=s.replace(addNeedle,addRepl);
const anchor='  /* M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE */';
const i=s.indexOf(anchor);if(i<0){console.error('ERROR: CSS anchor missing; no changes');process.exit(1)}
const css=`  /* ${marker} */\n  .materialChooseSupplierButton,.materialOtherAddButton{appearance:none!important;min-height:52px!important;padding:10px 18px!important;border:0!important;border-radius:15px!important;font:900 16px "Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif!important;letter-spacing:.04em!important;color:#fff!important;cursor:pointer!important}.materialChooseSupplierButton{background:linear-gradient(180deg,#78cdb9,#54ae98)!important;box-shadow:0 5px 0 #318a77!important}.materialOtherAddButton{background:linear-gradient(180deg,#78cdb9,#54ae98)!important;box-shadow:0 5px 0 #318a77!important}.materialChooseSupplierButton:active,.materialOtherAddButton:active{transform:translateY(2px)!important;box-shadow:0 3px 0 #318a77!important}.theme-dark .materialChooseSupplierButton,.theme-dark .materialOtherAddButton,.theme-cyber .materialChooseSupplierButton,.theme-cyber .materialOtherAddButton,.theme-luxury .materialChooseSupplierButton,.theme-luxury .materialOtherAddButton,.theme-retro .materialChooseSupplierButton,.theme-retro .materialOtherAddButton,.theme-galaxy .materialChooseSupplierButton,.theme-galaxy .materialOtherAddButton{background:linear-gradient(180deg,#309d8b,#1f7568)!important;box-shadow:0 5px 0 #145146!important}@media(max-width:620px){.materialChooseSupplierButton,.materialOtherAddButton{width:100%!important}}\n`;
s=s.slice(0,i)+css+s.slice(i);
fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
console.log('OK: material buttons V2 styled');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
