const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_REMOVE_OLD_FINAL_ORDER_CREATE_BUTTON_V16_SAFE';
const backup=file+'.remove-old-final-button-v16-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('V16はすでに適用されています。');
let next=original;

// JSX構造を壊さず、旧ボタン要素そのものだけを削除する。
const oldButtonStart='<button\n                                  type="button"\n                                  className="primary"\n                                  onClick={()=>{';
const markerPos=next.indexOf('{/* M-CROSS_FINAL_PURCHASE_ORDER_STEP1_SAFE */}');
if(markerPos<0)fail('旧STEP1マーカーが見つかりません。');
const btnStart=next.indexOf('<button',markerPos);
if(btnStart<0)fail('旧「本発注書を作成」ボタン開始位置が見つかりません。');
const textPos=next.indexOf('📄 本発注書を作成</button>',btnStart);
if(textPos<0)fail('旧「本発注書を作成」ボタン末尾が見つかりません。');
const btnEnd=textPos+'📄 本発注書を作成</button>'.length;
const candidate=next.slice(btnStart,btnEnd);
if(!candidate.includes("mcross_final_purchase_order_export_v1"))fail('対象が旧JSON準備ボタンではありません。安全のため停止します。');
next=next.slice(0,btnStart)+next.slice(btnEnd);

// 旧STEP1マーカーだけ新マーカーに置換。
next=next.replace('{/* M-CROSS_FINAL_PURCHASE_ORDER_STEP1_SAFE */}','{/* '+marker+' */}');
// 説明文のみ削除。兄弟要素には触れない。
next=next.replace(/\s*<div className="finalPurchaseOrderStepNote">[^<]*<\/div>/g,'');

if(next===original||!next.includes(marker))fail('V16の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');console.log('OK: 旧「本発注書を作成」ボタン削除V16を適用しました。');
 console.log('・ボタン要素だけ削除し、article/div構造は変更していません');
 console.log('・担当選択/Excel出力/削除ボタンは維持');
 console.log('BACKUP: '+backup);
}catch(e){
 fs.copyFileSync(backup,file);
 console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
 process.exit(1);
}
