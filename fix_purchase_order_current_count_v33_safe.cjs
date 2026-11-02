const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_PURCHASE_ORDER_CURRENT_COUNT_V33_SAFE';
const backup=file+'.purchase-order-current-count-v33-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('現在物件件数V33はすでに適用されています。');
if(!original.includes('M-CROSS_PURCHASE_ORDER_EXPLORER_CURRENT_PROPERTY_V32_SAFE'))fail('現在物件限定V32が見つかりません。');
let next=original;

// 現在のボタンは全purchaseOrders件数を表示しているため、現在の管理会社/物件/号室で絞った件数へ変更。
const oldButton='<button className="purchaseOrderExplorerOpen" type="button" onClick={() => setShowPurchaseOrderExplorer(true)}>📁 保存済み発注書 <span>{purchaseOrders.length}</span></button>';
const count=next.split(oldButton).length-1;
if(count!==1)fail('保存済み発注書ボタンの検出数が '+count+' 件です。');

const newButton=`{/* ${marker} */}
                    <button className="purchaseOrderExplorerOpen" type="button" onClick={() => setShowPurchaseOrderExplorer(true)}>📁 保存済み発注書 <span>{purchaseOrders.filter(order=>{
                      const currentCompany=String(company||'').trim()
                      const currentProperty=String(selectedProperty?.name||'').trim()
                      const currentUnit=String(unit||'').trim().replace(/号室$/,'')
                      const orderCompany=String(order.company||'').trim()
                      const orderProperty=String(order.propertyName||'').trim()
                      const orderUnit=String(order.unit||'').trim().replace(/号室$/,'')
                      return (!currentCompany||orderCompany===currentCompany) && (!currentProperty||orderProperty===currentProperty) && (!currentUnit||orderUnit===currentUnit)
                    }).length}</span></button>`;
next=next.replace(oldButton,newButton);

if(next===original||!next.includes(marker))fail('現在物件件数V33の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 保存済み発注書の件数V33を現在物件・号室の件数へ変更しました。');
  console.log('・全物件のpurchaseOrders.lengthは表示しません');
  console.log('・現在の管理会社 / 物件 / 号室で絞った件数を表示');
  console.log('・発注書データ自体は削除しません');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
