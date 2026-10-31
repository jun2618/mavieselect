const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd();
const appPath=path.join(root,'src','App.jsx');
const panelPath=path.join(root,'src','EstimateVersionPanel.jsx');
const appBak=appPath+'.before-version-card-total-v1';
const panelBak=panelPath+'.before-version-card-total-v1';
const marker='M-CROSS_VERSION_CARD_TOTAL_FROM_ROWS_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath)||!fs.existsSync(panelPath))fail('App.jsx または EstimateVersionPanel.jsx が見つかりません。');
let app=fs.readFileSync(appPath,'utf8');
let panel=fs.readFileSync(panelPath,'utf8');
if(app.includes(marker)||panel.includes(marker)){console.log('SKIP: 保存版金額表示V1は適用済みです。');process.exit(0)}
fs.copyFileSync(appPath,appBak);fs.copyFileSync(panelPath,panelBak);
try{
  // App.jsx の保存済みフォルダ一覧。version.totalAmount ではなく保存rowsから再集計。
  const explorerOld="Math.round(Number(version.totalAmount || 0)).toLocaleString('ja-JP')";
  if(!app.includes(explorerOld))throw new Error('保存済みフォルダの金額表示が見つかりません。');
  const explorerNew="Math.round((Array.isArray(version.rows) ? version.rows : []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0) + (Array.isArray(version.additionalWorks) ? version.additionalWorks : []).reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)).toLocaleString('ja-JP')";
  app=app.replace(explorerOld,explorerNew);
  app=app.replace("import './App.css'",`import './App.css'\n// ${marker}`);

  // EstimateVersionPanel側は、version.totalAmountを描画している箇所をrowsベースへ置換。
  const candidates=[
    /Math\.round\(Number\((?:version|item)\.totalAmount \|\| 0\)\)\.toLocaleString\('ja-JP'\)/g,
    /Number\((?:version|item)\.totalAmount \|\| 0\)\.toLocaleString\('ja-JP'\)/g
  ];
  let changed=false;
  for(const re of candidates){
    panel=panel.replace(re,match=>{
      changed=true;
      const varName=match.includes('version.totalAmount')?'version':'item';
      return `Math.round((Array.isArray(${varName}.rows) ? ${varName}.rows : []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0) + (Array.isArray(${varName}.additionalWorks) ? ${varName}.additionalWorks : []).reduce((sum, work) => sum + (Number(work.amount) || (Number(work.quantity) || 0) * (Number(work.unitPrice) || 0)), 0)).toLocaleString('ja-JP')`;
    });
  }
  if(!changed)throw new Error('EstimateVersionPanelの保存済み金額表示が見つかりません。');
  panel='// '+marker+'\n'+panel;

  fs.writeFileSync(appPath,app,'utf8');fs.writeFileSync(panelPath,panel,'utf8');
  console.log('変更を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 保存済み②③などの表示金額を、保存rowsの現在内容から再集計するよう修正しました。');
  console.log('BACKUP: '+appBak);
}catch(e){
  console.error('適用またはビルドに失敗したため、自動で元に戻します。');
  console.error(e.message||String(e));
  if(fs.existsSync(appBak))fs.copyFileSync(appBak,appPath);
  if(fs.existsSync(panelBak))fs.copyFileSync(panelBak,panelPath);
  process.exit(1);
}
