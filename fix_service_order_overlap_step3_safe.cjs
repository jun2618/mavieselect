const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_SERVICE_ORDER_OVERLAP_STEP3_SAFE';
const backup=file+'.service-overlap-step3-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('施工発注の重なり修正STEP3はすでに適用されています。');

// 現在の施工UIが入っていることを確認
for(const token of [
  'M-CROSS_SERVICE_ORDER_STEP1_UI_SAFE',
  'M-CROSS_SERVICE_PRICEBOOK_STEP2_V3_SAFE',
  'className="orderQuantityCompare"',
  'className="orderRateField"',
  'className="orderLineAmount"'
]){
  if(!original.includes(token))fail('前提コードが見つかりません: '+token);
}

const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=original.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');

const css=`  /* ${marker} */
  /* 施工発注PC: 見積数量・発注数量・施工単価・金額の重なりを解消 */
  .serviceOrderPanel .orderExcelWorkspace{
    display:block;
    width:100%;
    overflow:visible;
  }
  .serviceOrderPanel .orderExcelSheet{
    width:100%;
    min-width:0;
    overflow:visible;
  }
  .serviceOrderPanel .orderExcelHeader{
    grid-template-columns:minmax(260px,1fr) 140px 150px 145px;
  }
  .serviceOrderPanel .orderExcelHeader span:nth-child(3){display:none}
  .serviceOrderPanel .orderExcelSheet .orderDraftItem{
    grid-template-columns:minmax(260px,1fr) 140px 150px 145px!important;
    min-width:0!important;
    min-height:96px;
    align-items:stretch;
  }
  .serviceOrderPanel .orderExcelSheet .orderDraftItem>strong{
    grid-column:1!important;
    grid-row:1!important;
    padding:12px!important;
    border-right:1px solid #aeb4b8!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderDraftItem>small{
    grid-column:1!important;
    grid-row:2!important;
    padding:0 12px 10px!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderQuantityCompare{
    grid-column:2!important;
    grid-row:1!important;
    display:grid!important;
    grid-template-columns:1fr!important;
    align-content:center!important;
    justify-items:center!important;
    gap:4px!important;
    padding:10px!important;
    border-left:0!important;
    border-right:1px solid #aeb4b8!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderQuantityCompare span,
  .serviceOrderPanel .orderExcelSheet .orderQuantityCompare b{
    display:block!important;
    width:100%!important;
    text-align:center!important;
    white-space:normal!important;
    line-height:1.35!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderQuantityField{
    grid-column:2!important;
    grid-row:2!important;
    display:grid!important;
    grid-template-columns:minmax(0,1fr) auto!important;
    align-items:center!important;
    gap:5px!important;
    padding:6px 10px 10px!important;
    border-left:0!important;
    border-right:1px solid #aeb4b8!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderQuantityField span{
    grid-column:1/-1!important;
    text-align:center!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderQuantityField input{
    width:100%!important;
    min-width:0!important;
    min-height:40px!important;
    text-align:right!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderRateField{
    grid-column:3!important;
    grid-row:1 / span 2!important;
    display:grid!important;
    grid-template-columns:minmax(0,1fr) auto!important;
    align-content:center!important;
    align-items:center!important;
    gap:6px!important;
    padding:10px!important;
    border-left:0!important;
    border-right:1px solid #aeb4b8!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderRateField span{
    grid-column:1/-1!important;
    text-align:center!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderRateField input{
    width:100%!important;
    min-width:0!important;
    min-height:42px!important;
    text-align:right!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderLineAmount{
    grid-column:4!important;
    grid-row:1 / span 2!important;
    display:grid!important;
    align-content:center!important;
    justify-items:center!important;
    gap:6px!important;
    padding:10px!important;
    border-left:0!important;
    border-top:0!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderLineAmount span,
  .serviceOrderPanel .orderExcelSheet .orderLineAmount strong{
    display:block!important;
    width:100%!important;
    text-align:center!important;
    white-space:normal!important;
  }
  .serviceOrderPanel .orderExcelSheet .orderDraftItem:has(.orderQuantityCompare)::after{
    display:none!important;
  }

  /* スマホ: 1施工項目1カードで入力欄を分離 */
  @media(max-width:620px){
    .serviceOrderPanel .orderExcelHeader{display:none!important}
    .serviceOrderPanel .orderExcelSheet .orderDraftItem{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
      min-height:0!important;
      gap:8px!important;
      padding:10px!important;
      border:1px solid #aeb4b8!important;
      border-radius:12px!important;
      margin-bottom:10px!important;
    }
    .serviceOrderPanel .orderExcelSheet .orderDraftItem>strong,
    .serviceOrderPanel .orderExcelSheet .orderDraftItem>small{
      grid-column:1/-1!important;
      grid-row:auto!important;
      border:0!important;
      padding:2px 0!important;
    }
    .serviceOrderPanel .orderExcelSheet .orderQuantityCompare{
      grid-column:1!important;
      grid-row:auto!important;
      border:0!important;
      border-radius:9px!important;
      background:rgba(110,145,232,.09)!important;
      padding:8px!important;
    }
    .serviceOrderPanel .orderExcelSheet .orderQuantityField{
      grid-column:1!important;
      grid-row:auto!important;
      border:0!important;
      border-radius:9px!important;
      background:rgba(110,145,232,.09)!important;
      padding:8px!important;
    }
    .serviceOrderPanel .orderExcelSheet .orderRateField{
      grid-column:2!important;
      grid-row:auto!important;
      border:0!important;
      border-radius:9px!important;
      background:rgba(216,77,131,.07)!important;
      padding:8px!important;
    }
    .serviceOrderPanel .orderExcelSheet .orderLineAmount{
      grid-column:1/-1!important;
      grid-row:auto!important;
      border-top:1px solid rgba(110,145,232,.25)!important;
      padding:9px!important;
    }
  }
`;

const next=original.slice(0,cssPos)+css+original.slice(cssPos);
if(next===original||!next.includes(marker))fail('施工発注の重なり修正に失敗しました。');

fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 施工発注の重なり修正STEP3を適用しました。');
  console.log('・PCは 施工内容 / 数量 / 施工単価 / 金額 の4列');
  console.log('・数量内で見積数量と発注数量を上下配置');
  console.log('・施工単価と金額を独立表示');
  console.log('・スマホは1施工項目1カード');
  console.log('・材料発注と保存処理は変更していません。');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
