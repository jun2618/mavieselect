const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_REMOVE_DUPLICATE_MATERIAL_ADD_V1_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const start=s.indexOf('{/* M-CROSS_MATERIAL_ADD_TOP_V48_SAFE */}');
const end=s.indexOf('{/* M-CROSS_MATERIAL_ORDER_LIKE_SERVICE_V45_SAFE */}',start);
if(start<0||end<0){console.error('ERROR: duplicate top add button block not found; no changes');process.exit(1)}
const backup=f+'.before-remove-duplicate-material-add-'+Date.now()+'.bak';
s=s.slice(0,start)+'{/* '+marker+' */}'+s.slice(end);
// Theme-friendly styling for the remaining controls, no fixed square-button appearance.
const anchor='  /* M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE */';
const i=s.indexOf(anchor);
if(i<0){console.error('ERROR: CSS anchor not found; no changes');process.exit(1)}
const css=`  /* ${marker} */\n  .materialMobilePanel .materialAddTopButton,.materialMobilePanel .secondaryButton{min-height:50px!important;padding:10px 16px!important;border-radius:15px!important;font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif!important;font-size:16px!important;font-weight:900!important;letter-spacing:.03em!important;box-shadow:0 4px 0 rgba(0,0,0,.12)!important}.materialMobilePanel .materialAddTopButton{border:0!important;background:linear-gradient(180deg,#78cdb9,#54ae98)!important;color:#fff!important}.theme-dark .materialMobilePanel .materialAddTopButton,.theme-cyber .materialMobilePanel .materialAddTopButton,.theme-luxury .materialMobilePanel .materialAddTopButton,.theme-retro .materialMobilePanel .materialAddTopButton,.theme-galaxy .materialMobilePanel .materialAddTopButton{background:linear-gradient(180deg,#309d8b,#1f7568)!important;color:#fff!important}@media(max-width:620px){.materialMobilePanel .materialAddTopButton,.materialMobilePanel .secondaryButton{width:100%!important;min-height:52px!important}}\n`;
s=s.slice(0,i)+css+s.slice(i);
fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
console.log('OK: duplicate material add button removed and remaining buttons themed');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
