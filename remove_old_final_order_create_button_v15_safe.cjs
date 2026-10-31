const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_REMOVE_OLD_FINAL_ORDER_CREATE_BUTTON_V15_SAFE';
const backup=file+'.remove-old-final-button-v15-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('旧本発注書作成ボタン削除V15はすでに適用されています。');
let next=original;

// STEP1で追加した旧「本発注書を作成」ボタンと、JSON転記準備処理をUIから完全に除去。
const startToken='{/* M-CROSS_FINAL_PURCHASE_ORDER_STEP1_SAFE */}';
const start=next.indexOf(startToken);
if(start<0)fail('旧本発注書STEP1ボタンが見つかりません。');
const deleteButton='<button className="danger" type="button" onClick={()=>deletePurchaseOrder(selected.id)}>削除</button>';
const deletePos=next.indexOf(deleteButton,start);
if(deletePos<0)fail('旧ボタン後方の削除ボタンが見つかりません。');

// 現在必要なボタン群はこのあと別実装で付与されているため、旧STEP1 blockのみ削る。
const oldBlock=next.slice(start,deletePos);
const createText='本発注書を作成';
if(!oldBlock.includes(createText))fail('対象範囲に「本発注書を作成」がありません。安全のため停止します。');

// oldBlock内から旧finalPurchaseOrderActionsだけ除去し、後から追加された担当/Excel出力は範囲外なので維持。
next=next.slice(0,start)+`{/* ${marker} */}\n                              `+next.slice(deletePos);

// STEP1説明文も削除
next=next.replace(/<div className="finalPurchaseOrderStepNote">[\s\S]*?<\/div>/g,'');

if(next===original||!next.includes(marker))fail('旧本発注書作成ボタン削除V15の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');console.log('OK: 旧「本発注書を作成」ボタン削除V15を適用しました。');
 console.log('・青い「本発注書を作成」を削除');
 console.log('・旧JSON転記準備UIを削除');
 console.log('・本発注化/担当選択/本物のExcel書式で出力は維持');
 console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
