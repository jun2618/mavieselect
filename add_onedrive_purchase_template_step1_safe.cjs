const fs=require('fs');
const cp=require('child_process');

const file='./src/OneDriveSyncPanel.jsx';
const marker='M-CROSS_ONEDRIVE_PURCHASE_TEMPLATE_STEP1_SAFE';
const backup=file+'.purchase-template-step1-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('OneDriveSyncPanel.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/OneDriveSyncPanel.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('OneDrive発注書テンプレートSTEP1はすでに適用されています。');
let next=original;

// Excel Workbook APIで必要な書込み権限を追加。既存AppFolderバックアップも維持。
const scopeOld="const graphScopes = ['User.Read', 'Files.ReadWrite.AppFolder']";
const scopeNew="const graphScopes = ['User.Read', 'Files.ReadWrite.AppFolder', 'Files.ReadWrite']";
if((next.split(scopeOld).length-1)!==1)fail('graphScopesを一意に特定できません。');
next=next.replace(scopeOld,scopeNew);

// 既存の認証関数 getAccessToken を再利用して、publicの原本をAppFolderへ保存。
const functionAnchor='  async function backupToOneDrive() {';
if((next.split(functionAnchor).length-1)!==1)fail('backupToOneDriveの位置を一意に特定できません。');
const fn=`  /* ${marker} */
  async function uploadPurchaseOrderTemplate(){
    try{
      setStatus('発注書テンプレートをOneDriveへ準備しています…')
      const token=await getAccessToken()
      const templateResponse=await fetch(new URL('/templates/工事カードNew3.xlsm',window.location.origin),{cache:'no-store'})
      if(!templateResponse.ok)throw new Error('テンプレート読込失敗 HTTP '+templateResponse.status)
      const bytes=await templateResponse.arrayBuffer()
      const templateUrl='https://graph.microsoft.com/v1.0/me/drive/special/approot:/templates/%E5%B7%A5%E4%BA%8B%E3%82%AB%E3%83%BC%E3%83%89New3.xlsm:/content'
      const response=await fetch(templateUrl,{
        method:'PUT',
        headers:{
          Authorization:'Bearer '+token,
          'Content-Type':'application/vnd.ms-excel.sheet.macroEnabled.12'
        },
        body:bytes
      })
      if(!response.ok){
        const detail=await response.text().catch(()=>'')
        throw new Error('OneDrive保存失敗 HTTP '+response.status+(detail?' '+detail.slice(0,180):''))
      }
      const item=await response.json()
      localStorage.setItem('mcross_purchase_template_driveitem_v1',JSON.stringify({id:item.id,name:item.name,webUrl:item.webUrl||'',updatedAt:new Date().toISOString()}))
      setStatus('発注書テンプレートをOneDriveへ準備しました。PC・スマホ共通で使用できます。')
    }catch(error){
      setStatus('発注書テンプレート準備失敗: '+(error?.message||String(error)))
    }
  }

`;
next=next.replace(functionAnchor,fn+functionAnchor);

// OneDriveパネルへ準備ボタン。既存バックアップボタンの直前に置く。
const buttonAnchor='<button className="oneDriveAction" type="button" onClick={backupToOneDrive}>';
if((next.split(buttonAnchor).length-1)!==1)fail('OneDriveバックアップボタンを一意に特定できません。');
const button=`<button className="oneDriveAction purchaseTemplateAction" type="button" onClick={uploadPurchaseOrderTemplate}>📄 発注書テンプレートをOneDriveへ準備</button>
            `;
next=next.replace(buttonAnchor,button+buttonAnchor);

if(next===original||!next.includes(marker))fail('STEP1の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: OneDrive発注書テンプレートSTEP1を適用しました。');
  console.log('・既存Files.ReadWrite.AppFolderを維持');
  console.log('・Excel操作用Files.ReadWriteを追加');
  console.log('・OneDriveパネルにテンプレート準備ボタンを追加');
  console.log('・public/templates/工事カードNew3.xlsmをAppFolderへ保存');
  console.log('・既存バックアップ/同期処理は変更していません。');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。OneDriveSyncPanel.jsxを自動復旧しました。');
  process.exit(1);
}
