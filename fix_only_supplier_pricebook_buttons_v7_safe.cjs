const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_ONLY_SUPPLIER_PRICEBOOK_BUTTONS_V7_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=f+'.before-only-supplier-pricebook-v7-'+Date.now()+'.bak';
const old1=`                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowMaterialSupplierPicker(true)
                                  }
                                >
                                  発注先を選択
                                </button>`;
const new1=`                                <button
                                  type="button"
                                  className="materialChooseSupplierButtonV7"
                                  onClick={() =>
                                    setShowMaterialSupplierPicker(true)
                                  }
                                >
                                  発注先を選択
                                </button>`;
const old2=`                                <button
                                  type="button"
                                  disabled={!materialSupplierId}
                                  onClick={() =>
                                    setShowMaterialPriceBook(
                                      previous => !previous
                                    )
                                  }
                                >
                                  単価表
                                </button>`;
const new2=`                                <button
                                  type="button"
                                  className="materialPriceBookButtonV7"
                                  disabled={!materialSupplierId}
                                  onClick={() =>
                                    setShowMaterialPriceBook(
                                      previous => !previous
                                    )
                                  }
                                >
                                  単価表
                                </button>`;
const c1=s.split(old1).length-1,c2=s.split(old2).length-1;
if(c1!==1||c2!==1){console.error('ERROR: exact buttons supplier='+c1+' pricebook='+c2+'; no changes');process.exit(1)}
s=s.replace(old1,new1).replace(old2,new2);
const style=`\n  /* ${marker} */\n  .materialChooseSupplierButtonV7,.materialPriceBookButtonV7{min-height:52px!important;padding:10px 18px!important;border:0!important;border-radius:15px!important;font:900 16px "Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif!important;letter-spacing:.04em!important;color:#fff!important;background:linear-gradient(180deg,#78cdb9,#54ae98)!important;box-shadow:0 5px 0 #318a77!important;cursor:pointer!important}.materialPriceBookButtonV7:disabled{opacity:.42!important;filter:grayscale(.25)!important;box-shadow:none!important;cursor:not-allowed!important}@media(max-width:620px){.materialChooseSupplierButtonV7,.materialPriceBookButtonV7{width:100%!important}}\n`;
const cssAnchor='  /* M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE */';
const idx=s.indexOf(cssAnchor);if(idx<0){console.error('ERROR: CSS anchor missing; no changes');process.exit(1)}
s=s.slice(0,idx)+style+s.slice(idx);
fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
console.log('OK: ONLY supplier and pricebook buttons styled');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
