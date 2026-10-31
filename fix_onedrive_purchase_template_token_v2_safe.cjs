const fs=require('fs');
const cp=require('child_process');

const file='./src/OneDriveSyncPanel.jsx';
const marker='M-CROSS_ONEDRIVE_PURCHASE_TEMPLATE_TOKEN_V2_SAFE';
const backup=file+'.purchase-template-token-v2-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('OneDriveSyncPanel.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/OneDriveSyncPanel.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('Token修正V2はすでに適用されています。');
if(!original.includes('M-CROSS_ONEDRIVE_PURCHASE_TEMPLATE_STEP1_SAFE'))fail('OneDrive発注書テンプレートSTEP1が見つかりません。');
if(!original.includes('async function uploadPurchaseOrderTemplate(){'))fail('uploadPurchaseOrderTemplate が見つかりません。');

let next=original;

// STEP1で誤って呼んだ getAccessToken() を、このコンポーネントに実在するMSAL取得処理へ置換する。
const wrong='      const token=await getAccessToken()';
const count=next.split(wrong).length-1;
if(count!==1)fail('getAccessToken呼出しの検出数が '+count+' 件です。');
const fixed=`      /* ${marker} */
      await ensureMsalInitialized()
      let activeAccount=msal.getActiveAccount()||msal.getAllAccounts()[0]||null
      if(!activeAccount){
        const loginResult=await msal.loginPopup({scopes:graphScopes})
        activeAccount=loginResult.account
        if(activeAccount)msal.setActiveAccount(activeAccount)
      }
      if(!activeAccount)throw new Error('Microsoftアカウントへサインインできませんでした')
      let token=''
      try{
        token=(await msal.acquireTokenSilent({scopes:graphScopes,account:activeAccount})).accessToken
      }catch{
        token=(await msal.acquireTokenPopup({scopes:graphScopes,account:activeAccount})).accessToken
      }`;
next=next.replace(wrong,fixed);

if(next===original||!next.includes(marker))fail('Token修正V2の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: OneDrive発注書テンプレート Token修正V2を適用しました。');
  console.log('・未定義 getAccessToken() を廃止');
  console.log('・既存MSALのサインイン状態と acquireTokenSilent/Popup を使用');
  console.log('・OneDriveバックアップ処理そのものは変更していません');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。OneDriveSyncPanel.jsxを自動復旧しました。');
  process.exit(1);
}
