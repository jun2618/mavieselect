const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_REMOVE_SAVED_ESTIMATE_VERSION_EXPORT_V27_SAFE';
const backup=file+'.remove-saved-estimate-export-v27-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('この版を出力削除V27はすでに適用されています。');
let next=original;

const text='この版を出力';
const positions=[];
let p=0;
while((p=next.indexOf(text,p))>=0){positions.push(p);p+=text.length}
if(positions.length!==1)fail('「'+text+'」の検出数が '+positions.length+' 件です。');
const textPos=positions[0];
const buttonStart=next.lastIndexOf('<button',textPos);
const buttonEnd=next.indexOf('</button>',textPos);
if(buttonStart<0||buttonEnd<0)fail('対象buttonの範囲を特定できません。');
const block=next.slice(buttonStart,buttonEnd+9);
if(!block.includes(text))fail('対象外のbuttonを検出しました。');
next=next.slice(0,buttonStart)+next.slice(buttonEnd+9);

// 保存済み見積カード自体と削除ボタンは維持。近傍へマーカーのみ追加。
const cardText='お見積り（初回・無印）';
const markPos=next.indexOf(cardText);
if(markPos>=0){
  const insert=next.lastIndexOf('<',markPos);
  if(insert>=0)next=next.slice(0,insert)+`{/* ${marker} */}`+next.slice(insert);
}else{
  const anchor='<OneDriveSyncPanel />';
  if(!next.includes(anchor))fail('安全マーカー位置が見つかりません。');
  next=next.replace(anchor,`{/* ${marker} */}\n              ${anchor}`);
}

if(next===original||!next.includes(marker))fail('V27の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 保存済み見積の「この版を出力」削除V27を適用しました。');
  console.log('・「この版を出力」ボタンだけ削除');
  console.log('・保存済み見積カード/金額/日時/削除ボタンは維持');
  console.log('・通常の見積書Excel出力機能には触れていません');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
