const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-remove-measurement-new-registration-v1';
const marker='M-CROSS_REMOVE_MEASUREMENT_NEW_REGISTRATION_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 適用済みです。');process.exit(0)}
const actions='            <div className="measurementActions">';
const start=s.indexOf(actions);
if(start<0)fail('measurementActions が見つかりません。');
const buttonStart=s.indexOf('<button className="newRegistrationInlineButton"',start);
const saveStart=s.indexOf('<div className="saveActionWithFeedback">',start);
if(buttonStart<0||saveStart<0||buttonStart>saveStart)fail('採寸画面の新規登録ボタンを安全に特定できません。変更していません。');
const buttonEnd=s.indexOf('</button>',buttonStart);
if(buttonEnd<0||buttonEnd>saveStart)fail('新規登録ボタン終了位置を特定できません。');
fs.copyFileSync(p,b);
try{
  s=s.slice(0,buttonStart)+`{/* ${marker} */}\n              `+s.slice(buttonEnd+9);
  fs.writeFileSync(p,s,'utf8');
  console.log('採寸画面の「＋ 新規登録」ボタンだけ削除しました。機能本体は残しています。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 自動ビルド成功。');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  console.error(e.message||String(e));process.exit(1);
}
