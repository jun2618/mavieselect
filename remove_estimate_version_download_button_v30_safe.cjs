const fs=require('fs');
const cp=require('child_process');
const file='./src/EstimateVersionPanel.jsx';
const marker='M-CROSS_REMOVE_ESTIMATE_VERSION_DOWNLOAD_BUTTON_V30_SAFE';
const backup=file+'.remove-download-v30-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('EstimateVersionPanel.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/EstimateVersionPanel.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('V30はすでに適用されています。');
let next=original;

const button='<button type="button" onClick={() => onDownloadVersion(item)}>📄 この版を出力</button>';
const count=next.split(button).length-1;
if(count!==1)fail('「この版を出力」buttonの検出数が '+count+' 件です。');
next=next.replace(button,`{/* ${marker} */}`);

// propは互換性のため引数から残しても害はないが、未使用警告を避けるため削除
next=next.replace(/\n\s*onDownloadVersion,/, '');

if(!next.includes(marker))fail('V30の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: EstimateVersionPanelの「この版を出力」を直接削除しました。');
  console.log('・削除ボタンは維持');
  console.log('・保存済み見積履歴/日時/金額は維持');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。EstimateVersionPanel.jsxを自動復旧しました。');
  process.exit(1);
}
