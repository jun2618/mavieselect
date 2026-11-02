const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_PURCHASE_ORDER_EXPLORER_CURRENT_PROPERTY_V32_SAFE';
const backup=file+'.purchase-explorer-current-property-v32-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('現在物件限定V32はすでに適用されています。');
let next=original;

// 発注書エクスプローラーのツリー表示だけを現在の「管理会社・物件・号室」に限定する。
const oldMap='{[...groups.values()].map(group=><details open key={[group.companyName,group.propertyName,group.unitName].join(\'|\')}>';
const count=next.split(oldMap).length-1;
if(count!==1)fail('発注書ツリー描画位置の検出数が '+count+' 件です。');

const newMap=`{/* ${marker} */}{[...groups.values()].filter(group=>{
                              const currentCompany=String(company||'').trim()
                              const currentProperty=String(selectedProperty?.name||'').trim()
                              const currentUnit=String(unit||'').trim().replace(/号室$/,'')
                              const groupCompany=String(group.companyName||'').trim()
                              const groupProperty=String(group.propertyName||'').trim()
                              const groupUnit=String(group.unitName||'').trim().replace(/号室$/,'')
                              return (!currentCompany||groupCompany===currentCompany) && (!currentProperty||groupProperty===currentProperty) && (!currentUnit||groupUnit===currentUnit)
                            }).map(group=><details open key={[group.companyName,group.propertyName,group.unitName].join('|')}>`;
next=next.replace(oldMap,newMap);

// 見出しに「現在の物件のみ」と表示して範囲を明確化。
const header='<header><div><small>PURCHASE ORDERS</small><h2>📁 発注書</h2></div>';
if(next.includes(header)){
  next=next.replace(header,'<header><div><small>PURCHASE ORDERS</small><h2>📁 発注書</h2><small className="purchaseOrderCurrentScope">現在の物件・号室のみ</small></div>');
}

const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */\n  .purchaseOrderCurrentScope{display:block;margin-top:3px;color:#756a78;font-size:12px;font-weight:800}.theme-dark .purchaseOrderCurrentScope,.theme-cyber .purchaseOrderCurrentScope,.theme-luxury .purchaseOrderCurrentScope,.theme-retro .purchaseOrderCurrentScope,.theme-galaxy .purchaseOrderCurrentScope{color:#cfefff}\n`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('現在物件限定V32の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 発注書エクスプローラー 現在物件限定V32を適用しました。');
  console.log('・現在選択中の管理会社 / 物件 / 号室だけ表示');
  console.log('・他物件の発注書データは削除しません');
  console.log('・他物件を開けば、その物件の発注書だけ表示します');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
