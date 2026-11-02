const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_RENAME_ESTIMATE_ORDER_BUTTON_V24_SAFE';
const backup=file+'.rename-estimate-order-button-v24-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('名称変更V24はすでに適用されています。');
const oldText='💰 見積内容を確認・編集';
const count=original.split(oldText).length-1;
if(count!==1)fail('対象ボタンの検出数が '+count+' 件です。');
let next=original.replace(oldText,'💰 見積・発注書');
const anchor='<OneDriveSyncPanel />';
if(!next.includes(anchor))fail('安全マーカー位置が見つかりません。');
next=next.replace(anchor,`{/* ${marker} */}\n              ${anchor}`);
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: トップボタン名称を「💰 見積・発注書」に変更しました。');
  console.log('・ボタンの動作/遷移先は変更していません');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
