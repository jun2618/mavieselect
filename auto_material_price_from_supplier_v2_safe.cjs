const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_MATERIAL_SUPPLIER_AUTO_PRICE_V2_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}

const start=s.indexOf("                                        setMaterialSupplierId(item.id)");
if(start<0){console.error('ERROR: supplier selection anchor not found; no changes');process.exit(1)}
const end=s.indexOf("                                        setShowMaterialPriceBook(true)",start);
if(end<0||end-start>1000){console.error('ERROR: supplier selection block end not found; no changes');process.exit(1)}
const endLine=s.indexOf('\n',end);
if(endLine<0){console.error('ERROR: supplier block line end not found; no changes');process.exit(1)}
const old=s.slice(start,endLine);
const replacement=`                                        /* ${marker} */
                                        setMaterialSupplierId(item.id)
                                        const normalizeMaterialCode=value=>String(value||'').toUpperCase().replace(/[\\s　・ー―‐‑–—－_]/g,'')
                                        const priceRows=Array.isArray(item.priceBook)?item.priceBook:[]
                                        setMaterialOrderItems(previous=>(Array.isArray(previous)?previous:[]).map(material=>{
                                          if(material.unitPrice!==''&&material.unitPrice!=null)return material
                                          const productCode=String(material.productCode||'').trim()
                                          const normalizedProduct=normalizeMaterialCode(productCode)
                                          if(!normalizedProduct)return material
                                          let matched=priceRows.find(row=>row?.priceType==='fixed'&&row?.price!==''&&row?.price!=null&&normalizeMaterialCode([row?.name,row?.note].filter(Boolean).join(' ')).includes(normalizedProduct))
                                          if(!matched&&material.materialType==='cross'&&/^(SP|LB)/.test(normalizedProduct))matched=priceRows.find(row=>row?.priceType==='fixed'&&String(row?.name||'').includes('クロス (#500)'))
                                          if(!matched&&material.materialType==='cf')matched=priceRows.find(row=>row?.priceType==='fixed'&&String(row?.name||'').includes('住宅用CF'))
                                          return matched?{...material,unitPrice:Number(matched.price||0)}:material
                                        }))
                                        setShowMaterialSupplierPicker(false)
                                        setShowMaterialPriceBook(true)`;

const backup=file+'.before-material-supplier-auto-price-v2-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);
s=s.slice(0,start)+replacement+s.slice(endLine);
fs.writeFileSync(file,s,'utf8');
console.log('OK: supplier auto pricing V2 applied');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
