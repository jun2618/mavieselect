const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_REMOVE_HOME_EXPORT_SHORTCUTS_V22_SAFE';
const backup=file+'.remove-home-export-shortcuts-v22-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('トップ出力ボタン削除V22はすでに適用されています。');
let next=original;

// ボタンのテキストを基準に、そのbutton要素だけを削除する。出力関数自体は残す。
function removeButtonByText(source,text){
  const textPos=source.indexOf(text);
  if(textPos<0)fail('「'+text+'」ボタンが見つかりません。');
  const buttonStart=source.lastIndexOf('<button',textPos);
  const buttonEnd=source.indexOf('</button>',textPos);
  if(buttonStart<0||buttonEnd<0)fail('「'+text+'」ボタン範囲を特定できません。');
  const candidate=source.slice(buttonStart,buttonEnd+9);
  if(!candidate.includes(text))fail('「'+text+'」以外の要素を検出しました。');
  return source.slice(0,buttonStart)+source.slice(buttonEnd+9);
}

const measurementCount=(next.match(/採寸データ出力/g)||[]).length;
const estimateCount=(next.match(/見積書を出力/g)||[]).length;
if(measurementCount!==1)fail('「採寸データ出力」の検出数が '+measurementCount+' 件です。');
if(estimateCount!==1)fail('「見積書を出力」の検出数が '+estimateCount+' 件です。');

next=removeButtonByText(next,'採寸データ出力');
next=removeButtonByText(next,'見積書を出力');

// 近くの安全なJSXコメント位置へマーカーを追加。
const anchor='<OneDriveSyncPanel />';
if(!next.includes(anchor))fail('トップページのOneDriveSyncPanel位置が見つかりません。');
next=next.replace(anchor,`{/* ${marker} */}\n              ${anchor}`);

if(next===original||!next.includes(marker))fail('トップ出力ボタン削除V22の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: トップ出力ショートカット削除V22を適用しました。');
  console.log('・トップの「採寸データ出力」を削除');
  console.log('・トップの「見積書を出力」を削除');
  console.log('・採寸/見積の実際の出力機能は残しています');
  console.log('・案件/見積画面側の機能には触れていません');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
