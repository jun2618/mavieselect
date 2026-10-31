const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_PRODUCT_MERGE_V8_SAFE';
const backup=file+'.product-merge-v8-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('商品名欄修正V8はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_XLSX_POPULATE_V6_SAFE'))fail('xlsx-populate V6が見つかりません。');
let next=original;

// B:F を商品名欄として使う。各明細行で結合し、品番がB列だけで切れないようにする。
const clearOld=`      for(let r=22;r<=48;r++){
        for(const c of ['A','B','C','D','E','F','G','H','I','J'])ws.cell(c+r).value('')
      }`;
const clearNew=`      /* ${marker} */
      for(let r=22;r<=48;r++){
        const productRange=ws.range('B'+r+':F'+r)
        try{if(productRange.merged())productRange.merged(false)}catch{}
        for(const c of ['A','B','C','D','E','F','G','H','I','J'])ws.cell(c+r).value('')
        if(!productRange.merged())productRange.merged(true)
        ws.cell('B'+r).style({horizontalAlignment:'left',verticalAlignment:'center',wrapText:false})
      }`;
if((next.split(clearOld).length-1)!==1)fail('明細クリア処理を一意に特定できません。');
next=next.replace(clearOld,clearNew);

// 商品名は結合セルB:Fの左端Bへ書く。
const productOld="        ws.cell('B'+r).value(row.name)";
const productNew="        ws.cell('B'+r).value(row.name).style({horizontalAlignment:'left',verticalAlignment:'center',wrapText:false})";
if((next.split(productOld).length-1)!==1)fail('商品名転記処理を一意に特定できません。');
next=next.replace(productOld,productNew);

if(next===original||!next.includes(marker))fail('商品名欄修正V8の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 発注書の商品名欄修正V8を適用しました。');
  console.log('・明細22～48行の商品名欄 B:F を結合');
  console.log('・HM-10558等の品番が途中で切れないように修正');
  console.log('・数量G / 単位H / 単価I / 金額J は維持');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
