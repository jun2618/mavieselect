const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_REMOVE_SAVED_ESTIMATE_VERSION_EXPORT_V28_SAFE';
const backup=file+'.remove-saved-estimate-export-v28-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('保存済み見積の版出力削除V28はすでに適用されています。');

// 現在の実コードではボタン文字列ではなく onDownloadVersion prop から版出力が渡されている。
const key='onDownloadVersion={version => downloadEstimateExcel({';
const start=original.indexOf(key);
if(start<0)fail('onDownloadVersion の版出力処理が見つかりません。');
if(original.indexOf(key,start+1)>=0)fail('onDownloadVersion が複数見つかりました。安全のため停止します。');

// JSX prop の { ... } を波括弧対応で正確に切り出す。
const braceStart=original.indexOf('{',start);
if(braceStart<0)fail('onDownloadVersion の開始波括弧が見つかりません。');
let depth=0,end=-1;
let quote=null,escaped=false;
for(let i=braceStart;i<original.length;i++){
  const ch=original[i];
  if(quote){
    if(escaped){escaped=false;continue}
    if(ch==='\\'){escaped=true;continue}
    if(ch===quote)quote=null;
    continue;
  }
  if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}
  if(ch==='{')depth++;
  else if(ch==='}'){
    depth--;
    if(depth===0){end=i+1;break}
  }
}
if(end<0)fail('onDownloadVersion の終了位置を特定できません。');
const prop=original.slice(start,end);
if(!prop.includes('downloadEstimateExcel')||!prop.includes('version.rows'))fail('保存済み版出力propではありません。');

// prop自体を削除。保存履歴・カード・削除・通常の見積Excel出力はそのまま残す。
let next=original.slice(0,start)+`/* ${marker} */`+original.slice(end);
if(next===original||!next.includes(marker))fail('V28の適用に失敗しました。');

fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 保存済み見積の「この版を出力」機能削除V28を適用しました。');
  console.log('・onDownloadVersion だけ削除');
  console.log('・保存済み見積履歴/金額/日時/削除は維持');
  console.log('・通常の見積書Excel出力は維持');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
