const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_REMOVE_RESTORE_ALL_ESTIMATE_BUTTON_V26_SAFE';
const backup=file+'.remove-restore-all-estimate-v26-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('見積へ戻すボタン削除V26はすでに適用されています。');
let next=original;

// 「すべて見積へ戻す」ボタン要素だけを削除。除外データや個別処理ロジック自体には触れない。
const text='すべて見積へ戻す';
const positions=[];
let pos=0;
while((pos=next.indexOf(text,pos))>=0){positions.push(pos);pos+=text.length}
if(positions.length!==1)fail('「'+text+'」の検出数が '+positions.length+' 件です。');
const textPos=positions[0];
const buttonStart=next.lastIndexOf('<button',textPos);
const buttonEnd=next.indexOf('</button>',textPos);
if(buttonStart<0||buttonEnd<0)fail('対象buttonの範囲を特定できません。');
const block=next.slice(buttonStart,buttonEnd+9);
if(!block.includes(text))fail('対象外のbuttonを検出しました。');
next=next.slice(0,buttonStart)+next.slice(buttonEnd+9);

// 同じ案内行は残す。「見積から外した項目があります」は状態確認として維持。
const notice='見積から外した項目があります';
const noticePos=next.indexOf(notice);
if(noticePos<0)fail('除外項目の案内表示が見つかりません。');
const safeInsert=next.lastIndexOf('<',noticePos);
if(safeInsert<0)fail('安全マーカー位置が見つかりません。');
next=next.slice(0,safeInsert)+`{/* ${marker} */}`+next.slice(safeInsert);

if(next===original||!next.includes(marker))fail('V26の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 「すべて見積へ戻す」ボタン削除V26を適用しました。');
  console.log('・「見積から外した項目があります」の案内は残します');
  console.log('・見積除外データや他の見積機能には触れていません');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
