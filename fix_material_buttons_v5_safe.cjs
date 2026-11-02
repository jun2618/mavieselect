const fs=require('fs'),cp=require('child_process'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_MATERIAL_BUTTONS_V5_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let lines=fs.readFileSync(f,'utf8').split(/\r?\n/);
if(lines.some(x=>x.includes(marker))){console.log('ALREADY APPLIED');process.exit(0)}
const findUnique=(text)=>{const hits=[];lines.forEach((x,i)=>{if(x.includes(text))hits.push(i)});return hits};
const supplierHits=findUnique('発注先を選択');
const addHits=findUnique('＋ その他材料を追加');
if(supplierHits.length!==1||addHits.length!==1){console.error('ERROR: labels supplier='+supplierHits.length+' add='+addHits.length+'; no changes');process.exit(1)}
function addClassToButton(labelIndex,className){
  let start=-1;
  for(let i=labelIndex;i>=Math.max(0,labelIndex-20);i--){if(lines[i].includes('<button')){start=i;break}}
  if(start<0)throw new Error('button start not found');
  let end=-1;
  for(let i=start;i<labelIndex;i++){if(lines[i].trim()==='>'){end=i;break}}
  if(end<0)throw new Error('button opening tag end not found');
  for(let i=start;i<=end;i++) if(lines[i].includes('className=')) return;
  const indent=(lines[start].match(/^\s*/)||[''])[0]+'  ';
  lines.splice(start+1,0,indent+'className="'+className+'"');
}
try{
  addClassToButton(supplierHits[0],'materialChooseSupplierButton');
  // recompute because prior splice shifts indexes
  const newAdd=findUnique('＋ その他材料を追加');
  addClassToButton(newAdd[0],'materialOtherAddButton');
}catch(e){console.error('ERROR:',e.message,'; no changes');process.exit(1)}
// pricebook button is the button immediately after supplier button and carries disabled={!materialSupplierId}
const priceHits=findUnique('disabled={!materialSupplierId}');
if(priceHits.length!==1){console.error('ERROR: pricebook disabled anchor='+priceHits.length+'; no changes');process.exit(1)}
let pStart=-1,pEnd=-1;for(let i=priceHits[0];i>=Math.max(0,priceHits[0]-8);i--){if(lines[i].includes('<button')){pStart=i;break}}for(let i=pStart;i<=priceHits[0]+10;i++){if(lines[i]&&lines[i].trim()==='>'){pEnd=i;break}}
if(pStart<0||pEnd<0){console.error('ERROR: pricebook button bounds not found; no changes');process.exit(1)}
if(!lines.slice(pStart,pEnd+1).some(x=>x.includes('className='))){const indent=(lines[pStart].match(/^\s*/)||[''])[0]+'  ';lines.splice(pStart+1,0,indent+'className="materialPriceBookButton"')}
// insert self-contained style right before the unique material panel JSX marker rather than old CSS anchors
const jsxMarker=findUnique('{/* M-CROSS_SIMPLIFY_MATERIAL_ORDER_SCREEN_V1_SAFE */}');
if(jsxMarker.length!==1){console.error('ERROR: JSX marker='+jsxMarker.length+'; no changes');process.exit(1)}
const styleLines=[
'                      {/* '+marker+' */}',
'                      <style>{`',
'                        .materialChooseSupplierButton,.materialPriceBookButton,.materialOtherAddButton{min-height:52px;padding:10px 18px;border:0;border-radius:15px;font:900 16px "Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif;letter-spacing:.04em;color:#fff;background:linear-gradient(180deg,#78cdb9,#54ae98);box-shadow:0 5px 0 #318a77;cursor:pointer}',
'                        .materialChooseSupplierButton:active,.materialPriceBookButton:active,.materialOtherAddButton:active{transform:translateY(2px);box-shadow:0 3px 0 #318a77}',
'                        .materialPriceBookButton:disabled{opacity:.42;filter:grayscale(.25);box-shadow:none;cursor:not-allowed}',
'                        @media(max-width:620px){.materialChooseSupplierButton,.materialPriceBookButton,.materialOtherAddButton{width:100%}}',
'                      `}</style>'
];
lines.splice(jsxMarker[0]+1,0,...styleLines);
const backup=f+'.before-material-buttons-v5-'+Date.now()+'.bak';
fs.copyFileSync(f,backup);fs.writeFileSync(f,lines.join('\n'),'utf8');
console.log('OK: material buttons V5 applied');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,f);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
