const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_REMOVE_WORKNAME_V7_SAFE';
const backup=file+'.remove-workname-v7-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('工事名削除V7はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_XLSX_POPULATE_V6_SAFE'))fail('xlsx-populate V6が見つかりません。');

let next=original;
const oldLine="      ws.cell('A49').value(['工事名: '+String(order.workName||''),String(order.contractorMemo||'')].filter(Boolean).join('\\n')).style('wrapText',true)";
const count=next.split(oldLine).length-1;
if(count!==1)fail('A49の工事名転記処理を一意に特定できません。検出数: '+count);

const newLine=`      /* ${marker} */
      // 発注書では「原状回復工事」等の工事名を印字しない。備考がある場合だけA49へ表示する。
      ws.cell('A49').value(String(order.contractorMemo||'')).style('wrapText',true)`;
next=next.replace(oldLine,newLine);

if(next===original||!next.includes(marker))fail('工事名削除V7の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 発注書の工事名削除V7を適用しました。');
  console.log('・「工事名: 原状回復工事」は出力しません');
  console.log('・備考がある場合のみA49へ表示します');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
