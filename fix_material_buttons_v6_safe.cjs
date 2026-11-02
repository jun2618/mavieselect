const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_MATERIAL_BUTTONS_V6_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let lines=fs.readFileSync(f,'utf8').split(/\r?\n/);
if(lines.some(x=>x.includes(marker))){console.log('ALREADY APPLIED');process.exit(0)}
const backup=f+'.before-material-buttons-v6-'+Date.now()+'.bak';
function buttonStartFromHandler(handler){
  const hits=[]; lines.forEach((x,i)=>{if(x.includes(handler))hits.push(i)});
  if(hits.length!==1) throw new Error(handler+' MATCH='+hits.length);
  for(let i=hits[0];i>=Math.max(0,hits[0]-12);i--) if(lines[i].includes('<button')) return i;
  throw new Error('button start not found for '+handler);
}
function addClassAtButton(start,className){
  let end=-1; for(let i=start;i<Math.min(lines.length,start+20);i++){if(lines[i].trim()==='>'){end=i;break}}
  if(end<0) throw new Error('button tag end not found');
  const existing=lines.slice(start,end+1).findIndex(x=>x.includes('className='));
  if(existing>=0){
    const idx=start+existing;
    if(!lines[idx].includes(className)) lines[idx]=lines[idx].replace(/className="([^"]*)"/,(_,v)=>`className="${v} ${className}"`);
  } else {
    const indent=(lines[start].match(/^\s*/)||[''])[0]+'  ';
    lines.splice(start+1,0,indent+`className="${className}"`);
  }
}
try{
  addClassAtButton(buttonStartFromHandler('setShowMaterialSupplierPicker(true)'),'materialChooseSupplierButton');
  addClassAtButton(buttonStartFromHandler('disabled={!materialSupplierId}'),'materialPriceBookButton');
  const addHits=[];lines.forEach((x,i)=>{if(x.includes('＋ その他材料を追加'))addHits.push(i)});if(addHits.length!==1)throw new Error('other material label MATCH='+addHits.length);
  let addStart=-1;for(let i=addHits[0];i>=Math.max(0,addHits[0]-30);i--)if(lines[i].includes('<button')){addStart=i;break}if(addStart<0)throw new Error('other material button not found');
  addClassAtButton(addStart,'materialOtherAddButton');
}catch(e){console.error('ERROR:',e.message,'; no changes');process.exit(1)}
const jsxHits=[];lines.forEach((x,i)=>{if(x.includes('{/* M-CROSS_SIMPLIFY_MATERIAL_ORDER_SCREEN_V1_SAFE */}'))jsxHits.push(i)});if(jsxHits.length!==1){console.error('ERROR: material JSX marker MATCH='+jsxHits.length+'; no changes');process.exit(1)}
lines.splice(jsxHits[0]+1,0,
'                      {/* '+marker+' */}',
'                      <style>{`',
'                        .materialChooseSupplierButton,.materialPriceBookButton,.materialOtherAddButton{appearance:none!important;min-height:52px!important;padding:10px 18px!important;border:0!important;border-radius:15px!important;font:900 16px "Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif!important;letter-spacing:.04em!important;color:#fff!important;background:linear-gradient(180deg,#78cdb9,#54ae98)!important;box-shadow:0 5px 0 #318a77!important;cursor:pointer!important}',
'                        .materialPriceBookButton:disabled{opacity:.42!important;filter:grayscale(.25)!important;box-shadow:none!important;cursor:not-allowed!important}',
'                        .materialChooseSupplierButton:active,.materialPriceBookButton:active,.materialOtherAddButton:active{transform:translateY(2px)!important}',
'                        @media(max-width:620px){.materialChooseSupplierButton,.materialPriceBookButton,.materialOtherAddButton{width:100%!important}}',
'                      `}</style>'
);
fs.copyFileSync(f,backup);fs.writeFileSync(f,lines.join('\n'),'utf8');
console.log('OK: material buttons V6 applied');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
