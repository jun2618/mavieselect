const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_MATERIAL_ACTION_BUTTONS_POLISH_V1_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=f+'.before-material-action-buttons-polish-'+Date.now()+'.bak';
const anchor='  /* M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE */';
const i=s.indexOf(anchor);
if(i<0){console.error('ERROR: CSS anchor missing; no changes');process.exit(1)}
const css=`  /* ${marker} */\n  .materialMobilePanel .orderContractorField button,.materialMobilePanel .materialAddTopButton,.materialMobilePanel .secondaryButton{appearance:none!important;min-height:50px!important;padding:10px 16px!important;border:0!important;border-radius:15px!important;font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif!important;font-size:16px!important;font-weight:900!important;letter-spacing:.03em!important;color:#fff!important;background:linear-gradient(180deg,#78cdb9,#54ae98)!important;box-shadow:0 5px 0 #318a77!important}.materialMobilePanel .orderContractorField button:hover,.materialMobilePanel .materialAddTopButton:hover,.materialMobilePanel .secondaryButton:hover{filter:brightness(1.03)}.materialMobilePanel .orderContractorField button:active,.materialMobilePanel .materialAddTopButton:active,.materialMobilePanel .secondaryButton:active{transform:translateY(2px)!important;box-shadow:0 3px 0 #318a77!important}.materialMobilePanel button:disabled{opacity:.42!important;filter:grayscale(.35)!important;box-shadow:none!important}.theme-dark .materialMobilePanel .orderContractorField button,.theme-dark .materialMobilePanel .materialAddTopButton,.theme-dark .materialMobilePanel .secondaryButton,.theme-cyber .materialMobilePanel .orderContractorField button,.theme-cyber .materialMobilePanel .materialAddTopButton,.theme-cyber .materialMobilePanel .secondaryButton,.theme-luxury .materialMobilePanel .orderContractorField button,.theme-luxury .materialMobilePanel .materialAddTopButton,.theme-luxury .materialMobilePanel .secondaryButton,.theme-retro .materialMobilePanel .orderContractorField button,.theme-retro .materialMobilePanel .materialAddTopButton,.theme-retro .materialMobilePanel .secondaryButton,.theme-galaxy .materialMobilePanel .orderContractorField button,.theme-galaxy .materialMobilePanel .materialAddTopButton,.theme-galaxy .materialMobilePanel .secondaryButton{background:linear-gradient(180deg,#309d8b,#1f7568)!important;box-shadow:0 5px 0 #145146!important;color:#fff!important}@media(max-width:620px){.materialMobilePanel .orderContractorField button,.materialMobilePanel .materialAddTopButton,.materialMobilePanel .secondaryButton{width:100%!important;min-height:52px!important}}\n`;
s=s.slice(0,i)+css+s.slice(i);
fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
console.log('OK: material action buttons polished');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
