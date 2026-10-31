const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd();
const appPath=path.join(root,'src','App.jsx');
const panelPath=path.join(root,'src','EstimateVersionPanel.jsx');
const appBak=appPath+'.before-main-save-version-v2';
const panelBak=panelPath+'.before-main-save-version-v2';
const marker='M-CROSS_MAIN_SAVE_UPDATES_OPENED_VERSION_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath)||!fs.existsSync(panelPath))fail('App.jsx または EstimateVersionPanel.jsx が見つかりません。');
let app=fs.readFileSync(appPath,'utf8');
let panel=fs.readFileSync(panelPath,'utf8');
if(app.includes(marker)){console.log('SKIP: メイン保存版上書きV2は適用済みです。');process.exit(0)}
const anchor=`      localStorage.setItem(storageKey, serialized)\n      localStorage.removeItem(workingDraftKey)`;
if((app.split(anchor).length-1)!==1)fail('saveCurrentData内の保存位置を一意に特定できません。変更していません。');
fs.copyFileSync(appPath,appBak);fs.copyFileSync(panelPath,panelBak);
try{
  const patch=`      localStorage.setItem(storageKey, serialized)\n\n      /* ${marker} */\n      if (openedEstimateVersion) {\n        const savedVersionNumber = Number(openedEstimateVersion)\n        const factor = Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)\n        const rawRowsForVersion = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)\n        const editedRowsForVersion = openedEstimateRows ?? applyEstimateEdits(rawRowsForVersion, estimateEdits)\n        const rowsForVersion = editedRowsForVersion.filter(row => !estimateEdits[row.exclusionKey || estimateEditKey(row)]?.excluded)\n        const additionalWorksForVersion = additionalWorks.filter((item, index) => !estimateEdits['additionalWork:' + (item.id || index)]?.excluded)\n        const totalForVersion = rowsForVersion.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)\n          + additionalWorksForVersion.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)\n        const savedAt = new Date().toISOString()\n        setEstimateVersions(previous => {\n          const next = previous.map(version => Number(version.version) === savedVersionNumber ? {\n            ...version,\n            rows: JSON.parse(JSON.stringify(rowsForVersion)),\n            additionalWorks: JSON.parse(JSON.stringify(additionalWorksForVersion)),\n            totalAmount: totalForVersion,\n            updatedAt: savedAt,\n          } : version)\n          try { localStorage.setItem(estimateVersionStorageKey, JSON.stringify(next)) } catch {}\n          return next\n        })\n        setOpenedEstimateRows(rowsForVersion)\n      }\n\n      localStorage.removeItem(workingDraftKey)`;
  app=app.replace(anchor,patch);

  // 保存済み版の日付表示は更新日時を優先。存在しない古い版だけ作成日時を使う。
  let dateChanged=false;
  panel=panel.replace(/version\.createdAt/g,()=>{dateChanged=true;return '(version.updatedAt || version.createdAt)'});
  panel=panel.replace(/item\.createdAt/g,()=>{dateChanged=true;return '(item.updatedAt || item.createdAt)'});
  if(!dateChanged) console.log('NOTE: 日付表示のcreatedAt表記は見つからなかったため、金額・版データ更新のみ適用します。');

  fs.writeFileSync(appPath,app,'utf8');fs.writeFileSync(panelPath,panel,'utf8');
  console.log('変更を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: ②などを開いた状態で「保存する」を押すと、その版の明細・金額・更新日時も上書きします。');
  console.log('BACKUP: '+appBak);
}catch(e){
  console.error('適用またはビルドに失敗したため、自動で元に戻します。');
  console.error(e.message||String(e));
  if(fs.existsSync(appBak))fs.copyFileSync(appBak,appPath);
  if(fs.existsSync(panelBak))fs.copyFileSync(panelBak,panelPath);
  process.exit(1);
}
