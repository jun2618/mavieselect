const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_MATERIAL_SUPPLIER_AUTO_PRICE_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const old=`                                      onClick={() => {
                                        setMaterialSupplierId(item.id)
                                        setShowMaterialSupplierPicker(false)
                                        setShowMaterialPriceBook(true)
                                      }}`;
const neu=`                                      onClick={() => {
                                        /* ${marker} */
                                        setMaterialSupplierId(item.id)
                                        const normalizeCode=value=>String(value||'').toUpperCase().replace(/[\\s　・ー―‐‑–—－_]/g,'')
                                        const priceRows=Array.isArray(item.priceBook)?item.priceBook:[]
                                        setMaterialOrderItems(previous=>(Array.isArray(previous)?previous:[]).map(material=>{
                                          if(material.unitPrice!==''&&material.unitPrice!=null)return material
                                          const productCode=String(material.productCode||'').trim()
                                          const normalizedProduct=normalizeCode(productCode)
                                          if(!normalizedProduct)return material
                                          let matched=priceRows.find(row=>row?.priceType==='fixed'&&Number(row?.price)>=0&&normalizeCode([row?.name,row?.note].filter(Boolean).join(' ')).includes(normalizedProduct))
                                          if(!matched&&material.materialType==='cross'&&/^(SP|LB)/.test(normalizedProduct))matched=priceRows.find(row=>row?.priceType==='fixed'&&String(row?.name||'').includes('クロス (#500)'))
                                          if(!matched&&material.materialType==='cf')matched=priceRows.find(row=>row?.priceType==='fixed'&&String(row?.name||'').includes('住宅用CF'))
                                          return matched?{...material,unitPrice:Number(matched.price||0)}:material
                                        }))
                                        setShowMaterialSupplierPicker(false)
                                        setShowMaterialPriceBook(true)
                                      }}`;
const n=s.split(old).length-1;if(n!==1){console.error('ERROR: supplier onClick MATCH='+n+'; no changes');process.exit(1)}
const backup=file+'.before-material-supplier-auto-price-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);s=s.replace(old,neu);fs.writeFileSync(file,s,'utf8');
console.log('OK: material supplier auto price enabled');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
