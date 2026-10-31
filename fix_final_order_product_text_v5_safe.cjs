const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_PRODUCT_TEXT_V5_SAFE';
const backup=file+'.final-order-product-text-v5-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('商品名テキスト修正V5はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_EXCEL_EXPORT_LIKE_ESTIMATE_V1_SAFE'))fail('本発注書Excel出力V1が見つかりません。');

let next=original;

// Excel出力時の商品名は品番/商品名だけ。item.memo（居間、脱衣所、ソフト巾木等）は連結しない。
const oldLine="        sheet.getCell(excelRow,2).value=[row.name,row.memo].filter(Boolean).join(' ')";
const count=next.split(oldLine).length-1;
if(count!==1)fail('商品名転記処理を一意に特定できません。検出数: '+count);

const newLine=`        /* ${marker} */
        sheet.getCell(excelRow,2).value=row.name`;
next=next.replace(oldLine,newLine);

if(next===original||!next.includes(marker))fail('商品名テキスト修正V5の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 発注書の商品名テキスト修正V5を適用しました。');
  console.log('・品番の右に「居間」「ホール」「脱衣所」等を出力しません');
  console.log('・「ソフト巾木」等の補助テキストも商品名へ連結しません');
  console.log('・品番/商品名そのものだけをExcelへ出力します');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
