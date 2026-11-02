const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_MATERIAL_BUTTON_STYLE_V3_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const nl=s.includes('\r\n')?'\r\n':'\n';
const backup=f+'.before-material-button-style-v3-'+Date.now()+'.bak';
function addClassBeforeLabel(label, className){
  const pos=s.indexOf(label); if(pos<0) throw new Error('label not found: '+label);
  const open=s.lastIndexOf('<button',pos); if(open<0) throw new Error('button open not found: '+label);
  const chunk=s.slice(open,pos);
  if(chunk.includes('className=')) throw new Error('button already has className: '+label);
  const typeEnd=s.indexOf('type="button"',open); if(typeEnd<0||typeEnd>pos) throw new Error('type button not found: '+label);
  const insertAt=typeEnd+'type="button"'.length;
  s=s.slice(0,insertAt)+nl+'                                  className="'+className+'"'+s.slice(insertAt);
}
try{
  addClassBeforeLabel('発注先を選択','materialChooseSupplierButton');
  addClassBeforeLabel('＋ その他材料を追加','materialOtherAddButton');
}catch(e){console.error('ERROR:',e.message,'; no changes');process.exit(1)}
const anchor='  /* M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE */';
const i=s.indexOf(anchor);if(i<0){console.error('ERROR: CSS anchor missing; no changes');process.exit(1)}
const css=`  /* ${marker} */${nl}  .materialChooseSupplierButton,.materialOtherAddButton{appearance:none!important;min-height:52px!important;padding:10px 18px!important;border:0!important;border-radius:15px!important;font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif!important;font-size:16px!important;font-weight:900!important;letter-spacing:.04em!important;color:#fff!important;background:linear-gradient(180deg,#78cdb9,#54ae98)!important;box-shadow:0 5px 0 #318a77!important;cursor:pointer!important}.materialChooseSupplierButton:active,.materialOtherAddButton:active{transform:translateY(2px)!important;box-shadow:0 3px 0 #318a77!important}.theme-dark .materialChooseSupplierButton,.theme-dark .materialOtherAddButton,.theme-cyber .materialChooseSupplierButton,.theme-cyber .materialOtherAddButton,.theme-luxury .materialChooseSupplierButton,.theme-luxury .materialOtherAddButton,.theme-retro .materialChooseSupplierButton,.theme-retro .materialOtherAddButton,.theme-galaxy .materialChooseSupplierButton,.theme-galaxy .materialOtherAddButton{background:linear-gradient(180deg,#309d8b,#1f7568)!important;box-shadow:0 5px 0 #145146!important;color:#fff!important}@media(max-width:620px){.materialChooseSupplierButton,.materialOtherAddButton{width:100%!important}}${nl}`;
s=s.slice(0,i)+css+s.slice(i);
fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
console.log('OK: exact material buttons styled V3');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
