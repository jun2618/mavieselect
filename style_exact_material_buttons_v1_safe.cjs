const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_EXACT_MATERIAL_BUTTON_STYLE_V1_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=f+'.before-exact-material-buttons-'+Date.now()+'.bak';
const supplierText='                                  発注先を選択';
const supplierPos=s.indexOf(supplierText);
if(supplierPos<0){console.error('ERROR: supplier button label not found; no changes');process.exit(1)}
const supplierOpen=s.lastIndexOf('<button',supplierPos);
const supplierClose=s.indexOf('>',supplierOpen);
if(supplierOpen<0||supplierClose<0||supplierClose>supplierPos){console.error('ERROR: supplier button tag not found; no changes');process.exit(1)}
let supplierTag=s.slice(supplierOpen,supplierClose+1);
if(!/className=/.test(supplierTag)) supplierTag=supplierTag.slice(0,-1)+' className="materialPrimaryAction">';
else supplierTag=supplierTag.replace(/className="([^"]*)"/, 'className="$1 materialPrimaryAction"');
s=s.slice(0,supplierOpen)+supplierTag+s.slice(supplierClose+1);
const addText='                            ＋ その他材料を追加';
const addPos=s.indexOf(addText);
if(addPos<0){console.error('ERROR: add-material button label not found; no changes');process.exit(1)}
const addOpen=s.lastIndexOf('<button',addPos);
const addClose=s.indexOf('>',addOpen);
if(addOpen<0||addClose<0||addClose>addPos){console.error('ERROR: add-material button tag not found; no changes');process.exit(1)}
let addTag=s.slice(addOpen,addClose+1);
if(!/className=/.test(addTag)) addTag=addTag.slice(0,-1)+' className="materialSecondaryAction">';
else addTag=addTag.replace(/className="([^"]*)"/, 'className="$1 materialSecondaryAction"');
s=s.slice(0,addOpen)+addTag+s.slice(addClose+1);
const anchor='  /* M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE */';
const i=s.indexOf(anchor);
if(i<0){console.error('ERROR: CSS anchor missing; no changes');process.exit(1)}
const css=`  /* ${marker} */\n  .materialMobilePanel .materialPrimaryAction,.materialMobilePanel .materialSecondaryAction{appearance:none!important;min-height:52px!important;padding:10px 18px!important;border:0!important;border-radius:15px!important;font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif!important;font-size:16px!important;font-weight:900!important;letter-spacing:.04em!important;cursor:pointer!important}.materialMobilePanel .materialPrimaryAction{background:linear-gradient(180deg,#78cdb9,#54ae98)!important;color:#fff!important;box-shadow:0 5px 0 #318a77!important}.materialMobilePanel .materialSecondaryAction{background:linear-gradient(180deg,#7eb7f2,#5b8fd8)!important;color:#fff!important;box-shadow:0 5px 0 #3c68a5!important}.materialMobilePanel .materialPrimaryAction:active,.materialMobilePanel .materialSecondaryAction:active{transform:translateY(2px)!important;box-shadow:0 3px 0 rgba(0,0,0,.28)!important}.theme-dark .materialMobilePanel .materialPrimaryAction,.theme-cyber .materialMobilePanel .materialPrimaryAction,.theme-luxury .materialMobilePanel .materialPrimaryAction,.theme-retro .materialMobilePanel .materialPrimaryAction,.theme-galaxy .materialMobilePanel .materialPrimaryAction{background:linear-gradient(180deg,#309d8b,#1f7568)!important;box-shadow:0 5px 0 #145146!important}.theme-dark .materialMobilePanel .materialSecondaryAction,.theme-cyber .materialMobilePanel .materialSecondaryAction,.theme-luxury .materialMobilePanel .materialSecondaryAction,.theme-retro .materialMobilePanel .materialSecondaryAction,.theme-galaxy .materialMobilePanel .materialSecondaryAction{background:linear-gradient(180deg,#527fc5,#365c98)!important;box-shadow:0 5px 0 #243f69!important}@media(max-width:620px){.materialMobilePanel .materialPrimaryAction,.materialMobilePanel .materialSecondaryAction{width:100%!important}}\n`;
s=s.slice(0,i)+css+s.slice(i);
fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
console.log('OK: exact material buttons styled');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
