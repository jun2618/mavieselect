const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=process.cwd();
const appPath=path.join(root,'src','App.jsx');
const panelPath=path.join(root,'src','EstimateVersionPanel.jsx');
const backupApp=appPath+'.before-round-estimate-v1';
const backupPanel=panelPath+'.before-round-estimate-v1';
const marker='M-CROSS_ROUND_ESTIMATE_AMOUNTS_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath))fail('src/App.jsx が見つかりません。');
let app=fs.readFileSync(appPath,'utf8');
let panel=fs.existsSync(panelPath)?fs.readFileSync(panelPath,'utf8'):'';
if(app.includes(marker)||panel.includes(marker)){console.log('SKIP: 金額四捨五入V1は適用済みです。');process.exit(0)}
fs.copyFileSync(appPath,backupApp);if(panel)fs.copyFileSync(panelPath,backupPanel);
try{
  // formatYen があれば、画面全体の円表示を1円単位で四捨五入。
  const formatRegex=/function formatYen\(value\) \{[\s\S]*?\n\}/;
  if(!formatRegex.test(app)) throw new Error('formatYen関数が見つかりません。');
  app=app.replace(formatRegex,`/* ${marker} */\nfunction formatYen(value) {\n  return '¥' + Math.round(Number(value) || 0).toLocaleString('ja-JP')\n}`);

  // 保存済みエクスプローラーで直接toLocaleStringしている見積合計も丸める。
  app=app.replace(/Number\(version\.totalAmount \|\| 0\)\.toLocaleString\('ja-JP'\)/g,"Math.round(Number(version.totalAmount || 0)).toLocaleString('ja-JP')");

  // 見積履歴パネルも直接表示箇所を丸める。
  if(panel){
    panel=panel.replace(/Number\(currentTotal \|\| 0\)\.toLocaleString\('ja-JP'\)/g,"Math.round(Number(currentTotal || 0)).toLocaleString('ja-JP')");
    panel=panel.replace(/Number\(item\.totalAmount \|\| 0\)\.toLocaleString\('ja-JP'\)/g,"Math.round(Number(item.totalAmount || 0)).toLocaleString('ja-JP')");
    panel='/* '+marker+' */\n'+panel;
  }

  fs.writeFileSync(appPath,app,'utf8');if(panel)fs.writeFileSync(panelPath,panel,'utf8');
  console.log('変更を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 見積金額を1円単位で四捨五入表示するV1を適用しました。');
  console.log('例: 208,543.5 -> 208,544円 / 205,043.5 -> 205,044円');
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));if(fs.existsSync(backupApp))fs.copyFileSync(backupApp,appPath);if(panel&&fs.existsSync(backupPanel))fs.copyFileSync(backupPanel,panelPath);process.exit(1)}
