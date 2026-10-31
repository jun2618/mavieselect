const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),appPath=path.join(root,'src','App.jsx');
const backup=appPath+'.before-excluded-item-names-v12';
const marker='M-CROSS_EXCLUDED_ITEM_NAMES_V12_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(appPath,'utf8');
if(s.includes(marker)){console.log('SKIP: 除外項目名V12は適用済みです。');process.exit(0)}

// This patch only enriches the existing onExclude payload. It does not touch row clicks, maps, or restore controls.
const anchor=`[form.key]: { ...(previous[form.key] || {}), excluded: true },`;
if(!s.includes(anchor)) fail('現在の除外保存処理が見つかりません。変更していません。');
fs.copyFileSync(appPath,backup);
try{
  s=s.replace(anchor,`[form.key]: {\n                          ...(previous[form.key] || {}),\n                          parts: Array.isArray(form.parts) ? [...form.parts] : (previous[form.key]?.parts || []),\n                          memo: form.memo ?? previous[form.key]?.memo ?? '',\n                          quantity: form.quantity ?? previous[form.key]?.quantity ?? '',\n                          unit: form.unit ?? previous[form.key]?.unit ?? '',\n                          rate: form.rate ?? previous[form.key]?.rate ?? '',\n                          amount: form.amount ?? previous[form.key]?.amount ?? '',\n                          excluded: true,\n                        }, // ${marker}`);
  fs.writeFileSync(appPath,s,'utf8');
  console.log('変更を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 除外時に工事項目名・数量・単価・金額を保持するV12を適用しました。');
  console.log('見積行のタップ処理には触れていません。');
  console.log('BACKUP: '+backup);
}catch(e){
  console.error('適用またはビルドに失敗したため、自動で元に戻します。');
  console.error(e.message||String(e));
  if(fs.existsSync(backup))fs.copyFileSync(backup,appPath);
  process.exit(1);
}
