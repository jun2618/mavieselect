const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_EXCEL_DETAILS_V4_SAFE';
const backup=file+'.final-order-details-v4-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('発注書Excel細部修正V4はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_EXCEL_EXPORT_LIKE_ESTIMATE_V1_SAFE'))fail('本発注書Excel出力V1が見つかりません。');

let next=original;

// 1. 日付を「2026年10月31日」形式へ
const dateOld="sheet.getCell('I2').value=issuedAt.toLocaleDateString('ja-JP')";
const dateNew=`/* ${marker} */
      sheet.getCell('I2').value=issuedAt.getFullYear()+'年'+(issuedAt.getMonth()+1)+'月'+issuedAt.getDate()+'日'`;
if((next.split(dateOld).length-1)!==1)fail('日付転記処理を一意に特定できません。');
next=next.replace(dateOld,dateNew);

// 2. 項目(A列)は空白。商品名(B列)だけ使用。
const itemOld="sheet.getCell(excelRow,1).value=row.type";
if((next.split(itemOld).length-1)!==1)fail('項目列の転記処理を一意に特定できません。');
next=next.replace(itemOld,"sheet.getCell(excelRow,1).value=null");

// 3. 空行の金額欄は0ではなく空白。
//    明細がある行だけJ列へ数式を設定する。
const clearBlockOld=`      for(let row=22;row<=48;row++){
        for(let col=1;col<=9;col++)sheet.getCell(row,col).value=null
        sheet.getCell(row,10).value={formula:'SUM(G'+row+'*I'+row+')'}
      }`;
const clearBlockNew=`      for(let row=22;row<=48;row++){
        for(let col=1;col<=10;col++)sheet.getCell(row,col).value=null
      }`;
if((next.split(clearBlockOld).length-1)!==1)fail('明細クリア処理を一意に特定できません。');
next=next.replace(clearBlockOld,clearBlockNew);

const rateOld="        if(row.rate!=='')sheet.getCell(excelRow,9).value=row.rate";
const rateNew=`        if(row.rate!==''){
          sheet.getCell(excelRow,9).value=row.rate
          sheet.getCell(excelRow,10).value={formula:'G'+excelRow+'*I'+excelRow}
        }else{
          sheet.getCell(excelRow,9).value=null
          sheet.getCell(excelRow,10).value=null
        }`;
if((next.split(rateOld).length-1)!==1)fail('単価転記処理を一意に特定できません。');
next=next.replace(rateOld,rateNew);

if(next===original||!next.includes(marker))fail('発注書Excel細部修正V4の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 発注書Excel細部修正V4を適用しました。');
  console.log('・日付: 2026/10/31 -> 2026年10月31日');
  console.log('・項目列(A列): 空白');
  console.log('・未使用行の金額0: 空白');
  console.log('・実明細行だけ金額計算式を設定');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
