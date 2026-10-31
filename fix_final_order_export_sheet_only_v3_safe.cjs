const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_EXPORT_SHEET_ONLY_V3_SAFE';
const backup=file+'.final-order-sheet-only-v3-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('発注書シート限定V3はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_EXCEL_EXPORT_LIKE_ESTIMATE_V1_SAFE'))fail('本発注書Excel出力V1が見つかりません。');

let next=original;

const anchor=`      const sheet=workbook.getWorksheet('発注書')
      if(!sheet)throw new Error('発注書シートが見つかりません')`;
const count=next.split(anchor).length-1;
if(count!==1)fail('発注書シート取得処理の検出数が '+count+' 件です。');

const replacement=`      const sheet=workbook.getWorksheet('発注書')
      if(!sheet)throw new Error('発注書シートが見つかりません')

      /* ${marker} */
      // 出力版には「発注書」シートだけ残す。元テンプレート自体は変更しない。
      const removeSheetIds=workbook.worksheets.filter(ws=>ws.name!=='発注書').map(ws=>ws.id)
      removeSheetIds.forEach(id=>workbook.removeWorksheet(id))`;
next=next.replace(anchor,replacement);

// 出力ファイル名をわかりやすくする
next=next.replace("const fileName=['本発注書',safe(order.propertyName),safe(order.unit?order.unit+'号室':''),safe(order.contractorName)].filter(Boolean).join('_')+'.xlsx'",
"const fileName=['発注書',safe(order.propertyName),safe(order.unit?order.unit+'号室':''),safe(order.contractorName)].filter(Boolean).join('_')+'.xlsx'");

if(next===original||!next.includes(marker))fail('発注書シート限定V3の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 発注書Excelを「発注書」シートだけにしました。');
  console.log('・工事カード/入力フォーム/見積書など他シートは出力版から削除');
  console.log('・元の工事カードNew3.xlsmは変更しません');
  console.log('・発注書シートのレイアウト/罫線/数式は維持');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
