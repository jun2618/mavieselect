const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd();
const file=path.join(root,'src','EstimateVersionPanel.jsx');
const backup=file+'.before-updated-datetime-v2';
const marker='M-CROSS_ESTIMATE_VERSION_UPDATED_DATETIME_V2_EXACT_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(file))fail('src/EstimateVersionPanel.jsx が見つかりません。');
let s=fs.readFileSync(file,'utf8');
if(s.includes(marker)){console.log('SKIP: 更新日時V2は適用済みです。');process.exit(0)}
const old="{new Date(item.createdAt).toLocaleString('ja-JP')}";
const next="{new Date(item.updatedAt || item.createdAt).toLocaleString('ja-JP')}";
const count=s.split(old).length-1;
if(count!==1)fail('日時表示の一致数が '+count+' 件です。変更していません。');
fs.copyFileSync(file,backup);
try{
 s=s.replace(old,next);
 s=s.replace("export default function EstimateVersionPanel",`// ${marker}\nexport default function EstimateVersionPanel`);
 fs.writeFileSync(file,s,'utf8');
 console.log('日時表示1か所だけ変更しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 保存済み見積は updatedAt があれば更新日時、なければ作成日時を表示します。');
 console.log('BACKUP: '+backup);
}catch(e){
 console.error('適用またはビルド失敗のため自動復旧します。');
 console.error(e.message||String(e));
 if(fs.existsSync(backup))fs.copyFileSync(backup,file);
 process.exit(1);
}
