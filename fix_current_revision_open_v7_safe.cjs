const fs=require('fs');const path=require('path');const cp=require('child_process');
const root=process.cwd(),appPath=path.join(root,'src','App.jsx'),backup=appPath+'.before-current-revision-open-v7';
const marker='M-CROSS_CURRENT_REVISION_OPEN_V7_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath))fail('src/App.jsx が見つかりません。');let s=fs.readFileSync(appPath,'utf8');
if(s.includes(marker)){console.log('SKIP: 現在修正版V7は適用済みです。');process.exit(0)}
const wrong=`onClick={() => { const firstVersion = versions.find(item => Number(item.version) === 1); if (firstVersion) openSavedEstimateVersion(entry, firstVersion); else { setOpenedEstimateVersion(1); openSavedEntry(entry) } }}`;
if(!s.includes(wrong))fail('現在編集中ファイルの古いクリック処理が見つかりません。すでに別修正済みの可能性があります。');
fs.copyFileSync(appPath,backup);
try{
 const right=`onClick={() => {\n                                const currentVersion = versions.length ? Math.max(...versions.map(item => Number(item.version) || 0)) + 1 : 1\n                                setOpenedEstimateRows(null)\n                                setOpenedEstimateVersion(currentVersion)\n                                openSavedEntry(entry)\n                              }} /* ${marker} */`;
 s=s.replace(wrong,right);
 // If diagnostic click remains, restore actual saved-version opening.
 s=s.replace(`onClick={(event) => { event.stopPropagation(); openEstimateVersionDiagnostics(entry, versions) }}`,`onClick={() => openSavedEstimateVersion(entry, version)}`);
 s=s.replace(/^import \{ openEstimateVersionDiagnostics \} from ['"]\.\/estimateVersionDiagnostics['"].*\r?\n?/m,'');
 fs.writeFileSync(appPath,s,'utf8');
 console.log('変更を適用しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 現在編集中の②/③は現在データを開き、保存済み版は各snapshotを開くよう修正しました。');
 console.log('BACKUP: '+backup);
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));if(fs.existsSync(backup))fs.copyFileSync(backup,appPath);process.exit(1)}
