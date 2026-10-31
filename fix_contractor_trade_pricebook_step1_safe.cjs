const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_CONTRACTOR_TRADE_PRICEBOOK_STEP1_SAFE';
const backup=file+'.trade-pricebook-step1-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('業種別基本単価STEP1はすでに適用されています。');
let next=original;

// 業者編集フォームに業種別クラスを付ける
const formNeedle='<form className="contractorForm" onSubmit={event => {';
const formCount=next.split(formNeedle).length-1;
if(formCount!==1)fail('業者編集フォームの検出数が '+formCount+' 件です。');
next=next.replace(
  formNeedle,
  `<form className={"contractorForm trade-price-form " + (contractorForm.trade==='内装'?'trade-interior':'trade-custom')} onSubmit={event => {\n                          /* ${marker} */}`
);

// 既存の自由単価表エディターがあることを確認
if(!next.includes('contractorPriceBookEditor')){
  fail('既存の自由単価表エディター contractorPriceBookEditor が見つかりません。');
}
if(!next.includes('contractorRateMaster')){
  fail('既存の固定基本単価 contractorRateMaster が見つかりません。');
}

// 既存CSS文字列へ限定的な表示制御を追加
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');

const css=`  /* ${marker} */
  /* 内装業者だけ従来の固定6項目を表示。清掃など他業種は自由単価表を使用 */
  .trade-price-form.trade-custom .contractorRateMaster{
    display:none!important;
  }
  .trade-price-form.trade-custom .contractorPriceBookEditor{
    grid-column:1/-1;
    border:2px solid rgba(99,190,161,.55);
    background:rgba(99,190,161,.08);
  }
  .trade-price-form.trade-custom .contractorPriceBookEditor::before{
    content:'業種別 基本単価';
    display:block;
    margin-bottom:2px;
    font-size:18px;
    font-weight:900;
  }
  .trade-price-form.trade-custom .contractorPriceBookEditor::after{
    content:'清掃費・エアコン洗浄など、業者ごとの項目・単位・単価を自由に追加できます。';
    display:block;
    order:-1;
    margin-bottom:8px;
    color:#756a78;
    font-size:13px;
  }
  .trade-price-form.trade-interior .contractorPriceBookEditor::before{
    content:'追加の基本単価';
    display:block;
    margin-bottom:6px;
    font-weight:900;
  }
  @media(max-width:620px){
    .trade-price-form.trade-custom .contractorPriceBookEditor{
      padding:10px;
    }
    .trade-price-form.trade-custom .priceBookEditorHead{
      display:none;
    }
    .trade-price-form.trade-custom .priceBookEditorTable{
      overflow:visible;
    }
    .trade-price-form.trade-custom .priceBookEditorRow{
      display:grid;
      grid-template-columns:minmax(0,1fr) minmax(80px,.45fr);
      min-width:0;
      gap:7px;
      padding:9px;
      margin-bottom:9px;
      border:1px solid #c4c8cb;
      border-radius:10px;
    }
    .trade-price-form.trade-custom .priceBookEditorRow>*{
      padding:6px;
      border:1px solid #c4c8cb;
      min-width:0;
    }
    .trade-price-form.trade-custom .priceBookEditorRow>*:first-child{
      grid-column:1/-1;
    }
  }
  .theme-dark .trade-price-form.trade-custom .contractorPriceBookEditor,
  .theme-cyber .trade-price-form.trade-custom .contractorPriceBookEditor,
  .theme-luxury .trade-price-form.trade-custom .contractorPriceBookEditor,
  .theme-retro .trade-price-form.trade-custom .contractorPriceBookEditor,
  .theme-galaxy .trade-price-form.trade-custom .contractorPriceBookEditor{
    background:rgba(5,12,24,.82);
    color:#f3ffff;
  }
  .theme-dark .trade-price-form.trade-custom .contractorPriceBookEditor::after,
  .theme-cyber .trade-price-form.trade-custom .contractorPriceBookEditor::after,
  .theme-luxury .trade-price-form.trade-custom .contractorPriceBookEditor::after,
  .theme-retro .trade-price-form.trade-custom .contractorPriceBookEditor::after,
  .theme-galaxy .trade-price-form.trade-custom .contractorPriceBookEditor::after{
    color:#bfefff;
  }
`;

next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('業種別基本単価STEP1の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 業種別基本単価STEP1を適用しました。');
  console.log('・内装業者は従来のクロス/CF等の固定基本単価を維持');
  console.log('・清掃など他業種は固定6項目を非表示');
  console.log('・既存の自由単価表で項目/単位/金額/掛率を追加・削除可能');
  console.log('・既存データは削除していません。');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
