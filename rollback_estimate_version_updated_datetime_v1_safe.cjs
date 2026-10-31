const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd();
const file=path.join(root,'src','EstimateVersionPanel.jsx');
const backup=file+'.before-updated-datetime-v1';
const emergency=file+'.before-rollback-updated-datetime-v1';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(backup))fail('更新日時V1適用前のバックアップが見つかりません: '+backup);
if(fs.existsSync(file))fs.copyFileSync(file,emergency);
try{
 fs.copyFileSync(backup,file);
 console.log('更新日時V1適用前のEstimateVersionPanel.jsxへ戻しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 更新日時表示V1を取り消し、黒画面になる前へ復旧しました。');
 console.log('BACKUP: '+emergency);
}catch(e){
 console.error('復旧後のビルドに失敗したため、ロールバック直前へ戻します。');
 console.error(e.message||String(e));
 if(fs.existsSync(emergency))fs.copyFileSync(emergency,file);
 process.exit(1);
}
