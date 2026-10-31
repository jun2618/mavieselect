const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-estimate-excel-text-clipping-v1';
const emergency=p+'.before-rollback-estimate-text-clipping-v1';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(b))fail('文字切れV1適用前バックアップが見つかりません: '+b);
if(fs.existsSync(p))fs.copyFileSync(p,emergency);
try{
 fs.copyFileSync(b,p);
 console.log('shrinkToFit適用前のApp.jsxへ戻しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 見積Excel文字縮小V1を取り消しました。');
 console.log('BACKUP: '+emergency);
}catch(e){
 console.error('復旧後のビルドに失敗したためロールバック直前へ戻します。');
 console.error(e.message||String(e));
 if(fs.existsSync(emergency))fs.copyFileSync(emergency,p);
 process.exit(1);
}
