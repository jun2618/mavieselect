const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_MATERIAL_PRICEBOOK_REFERENCE_ONLY_V1_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const nl=s.includes('\r\n')?'\r\n':'\n';
const backup=f+'.before-material-pricebook-reference-only-'+Date.now()+'.bak';
// Do not auto-open pricebook after supplier selection.
const autoOpen='                                        setShowMaterialPriceBook(true)';
const c1=s.split(autoOpen).length-1;
if(c1!==1){console.error('ERROR: auto-open MATCH='+c1+'; no changes');process.exit(1)}
s=s.replace(autoOpen,"                                        setShowMaterialPriceBook(false)");
// Rename the visible toggle button if present.
s=s.replaceAll('>単価表</button>','>📖 単価表を見る</button>');
s=s.replaceAll('>閉じる</button>','>単価表を閉じる</button>');
// Hide pricebook-to-order buttons only inside material panel; retain edit/delete/reference data.
const anchor='  /* M-CROSS_MATERIAL_PRICEBOOK_TO_ORDER_AND_BLANK_V38_SAFE */';
const i=s.indexOf(anchor);
if(i<0){console.error('ERROR: CSS anchor missing; no changes');process.exit(1)}
const css=`  /* ${marker} */${nl}  .materialMobilePanel .materialPriceBookAddToOrder{display:none!important}${nl}`;
s=s.slice(0,i)+css+s.slice(i);
fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
console.log('OK: material pricebook is reference-only and closed by default');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
