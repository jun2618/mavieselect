const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_RENAME_FINAL_ORDER_EXCEL_BUTTON_V17_SAFE';
const backup=file+'.rename-excel-button-v17-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('ボタン名変更V17はすでに適用されています。');
const oldText='⬇ 本物のExcel書式で出力';
const count=original.split(oldText).length-1;
if(count!==1)fail('対象ボタン名の検出数が '+count+' 件です。');
const next=original.replace(oldText,'⬇ Excel書式で出力')
  .replace('/* M-CROSS_FINAL_ORDER_EXCEL_EXPORT_LIKE_ESTIMATE_V1_SAFE */','/* M-CROSS_FINAL_ORDER_EXCEL_EXPORT_LIKE_ESTIMATE_V1_SAFE */\n  /* '+marker+' */');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{cp.execSync('npm run build',{stdio:'inherit',shell:true});console.log('');console.log('OK: ボタン名を「Excel書式で出力」に変更しました。');console.log('BACKUP: '+backup)}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
