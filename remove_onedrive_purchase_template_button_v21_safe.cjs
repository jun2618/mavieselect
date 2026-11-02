const fs=require('fs');
const cp=require('child_process');
const file='./src/OneDriveSyncPanel.jsx';
const marker='M-CROSS_REMOVE_ONEDRIVE_PURCHASE_TEMPLATE_BUTTON_V21_SAFE';
const backup=file+'.remove-purchase-template-button-v21-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('OneDriveSyncPanel.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/OneDriveSyncPanel.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('V21はすでに適用されています。');
let next=original;

// 専用関数だけ削除。既存OneDrive同期・バックアップ関数は触らない。
const fnMarker='  /* M-CROSS_ONEDRIVE_PURCHASE_TEMPLATE_STEP1_SAFE */';
const fnStart=next.indexOf(fnMarker);
const backupFn='  async function backupToOneDrive() {';
const fnEnd=next.indexOf(backupFn,fnStart);
if(fnStart<0||fnEnd<0)fail('発注書テンプレート準備関数を特定できません。');
const fnBlock=next.slice(fnStart,fnEnd);
if(!fnBlock.includes('uploadPurchaseOrderTemplate'))fail('対象関数が発注書テンプレート準備処理ではありません。');
next=next.slice(0,fnStart)+`  /* ${marker} */\n`+next.slice(fnEnd);

// 専用ボタンだけ削除。
const button='<button className="oneDriveAction purchaseTemplateAction" type="button" onClick={uploadPurchaseOrderTemplate}>📄 発注書テンプレートをOneDriveへ準備</button>';
const buttonCount=next.split(button).length-1;
if(buttonCount!==1)fail('発注書テンプレート準備ボタンの検出数が '+buttonCount+' 件です。');
next=next.replace(button,'');

// この機能だけで追加した Files.ReadWrite を外し、従来AppFolder権限へ戻す。
const scopeNew="const graphScopes = ['User.Read', 'Files.ReadWrite.AppFolder', 'Files.ReadWrite']";
const scopeOld="const graphScopes = ['User.Read', 'Files.ReadWrite.AppFolder']";
if(next.includes(scopeNew))next=next.replace(scopeNew,scopeOld);

if(next===original||!next.includes(marker))fail('V21の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');console.log('OK: OneDrive発注書テンプレート準備ボタン削除V21を適用しました。');
 console.log('・発注書テンプレート準備ボタンを削除');
 console.log('・専用アップロード処理を削除');
 console.log('・Files.ReadWrite追加権限を外し、従来AppFolder権限へ戻しました');
 console.log('・既存OneDrive同期/バックアップ機能は維持');
 console.log('BACKUP: '+backup);
}catch(e){
 fs.copyFileSync(backup,file);
 console.error('ERROR: build失敗。OneDriveSyncPanel.jsxを自動復旧しました。');
 process.exit(1);
}
