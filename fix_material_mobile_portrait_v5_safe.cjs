const fs=require('fs');
const cp=require('child_process');

const app='./src/App.jsx';
const cssCandidates=['./src/App.css','./src/index.css','./src/main.css'];
const css=cssCandidates.find(p=>fs.existsSync(p));
const marker='M-CROSS_MATERIAL_MOBILE_PORTRAIT_V5_SAFE';
const stamp=Date.now();

function fail(m){console.error('ERROR: '+m);console.error('変更していません。');process.exit(1)}
if(!fs.existsSync(app))fail('src/App.jsx が見つかりません。');
if(!css)fail('CSSファイルが見つかりません。');
const appText=fs.readFileSync(app,'utf8');
const oldCss=fs.readFileSync(css,'utf8');
if(oldCss.includes(marker))fail('V5はすでに適用されています。');
if(!appText.includes('materialMobilePanel'))fail('materialMobilePanel が見つかりません。');
if(!appText.includes('materialPriceBookRow'))fail('materialPriceBookRow が見つかりません。先にV4.2まで適用してください。');

const add=`

/* ${marker} */
/* Mobile-only override. Break the material screen out of narrow desktop containers. */
@media (hover:none) and (pointer:coarse), (max-width:640px){
  .materialMobilePanel{
    position:relative!important;
    left:50%!important;
    right:auto!important;
    transform:translateX(-50%)!important;
    width:calc(100vw - 12px)!important;
    max-width:calc(100vw - 12px)!important;
    min-width:0!important;
    margin:6px 0!important;
    padding:8px!important;
    overflow-x:hidden!important;
  }
  .materialMobilePanel *{box-sizing:border-box!important;min-width:0!important;max-width:100%;}

  .materialMobilePanel .orderDraftHeader{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) auto!important;
    gap:8px!important;
    width:100%!important;
    align-items:start!important;
  }
  .materialMobilePanel .orderDraftHeader>button{
    width:auto!important;
    max-width:104px!important;
    padding:7px 8px!important;
    font-size:12px!important;
    line-height:1.25!important;
  }

  /* Supplier block and price-book container use the full phone width. */
  .materialMobilePanel section,
  .materialMobilePanel .materialPriceBookPanel{
    width:100%!important;
    max-width:100%!important;
    margin-left:0!important;
    margin-right:0!important;
  }

  /* Price book: compact, readable card. */
  .materialMobilePanel .materialPriceBookRow{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) 38px 88px!important;
    grid-template-areas:
      'name unit value'
      'note note note'
      'actions actions actions'!important;
    gap:6px 7px!important;
    align-items:center!important;
    width:100%!important;
    max-width:100%!important;
    min-height:0!important;
    height:auto!important;
    padding:9px!important;
    margin:0 0 7px!important;
    overflow:visible!important;
  }
  .materialMobilePanel .materialPriceBookRow>strong{
    grid-area:name!important;
    display:block!important;
    width:auto!important;
    font-size:13px!important;
    line-height:1.35!important;
    white-space:normal!important;
    word-break:break-word!important;
    overflow:visible!important;
    text-overflow:clip!important;
  }
  .materialMobilePanel .materialPriceBookRow>span{
    grid-area:unit!important;
    width:auto!important;
    font-size:12px!important;
    text-align:center!important;
  }
  .materialMobilePanel .materialPriceBookRow>label{
    grid-area:value!important;
    display:flex!important;
    width:88px!important;
    align-items:center!important;
    gap:2px!important;
    margin:0!important;
  }
  .materialMobilePanel .materialPriceBookRow>label input{
    width:64px!important;
    max-width:64px!important;
    min-height:36px!important;
    height:36px!important;
    padding:5px!important;
    font-size:14px!important;
  }
  .materialMobilePanel .materialPriceBookRow>small{
    grid-area:note!important;
    display:block!important;
    width:100%!important;
    font-size:10px!important;
    line-height:1.25!important;
    white-space:normal!important;
  }
  .materialMobilePanel .materialPriceBookRow>div{
    grid-area:actions!important;
    display:flex!important;
    width:100%!important;
    justify-content:flex-end!important;
    align-items:center!important;
    gap:5px!important;
    flex-wrap:wrap!important;
  }
  .materialMobilePanel .materialPriceBookRow>div button{
    width:auto!important;
    min-height:32px!important;
    padding:5px 8px!important;
    font-size:11px!important;
    line-height:1.2!important;
    white-space:nowrap!important;
  }

  /* Material order lines: 2 columns, with amount always visible. */
  .materialMobilePanel .materialOrderMobileCard,
  .materialMobilePanel .orderDraftItem{
    display:block!important;
    width:100%!important;
    max-width:100%!important;
    height:auto!important;
    min-height:0!important;
    padding:10px!important;
    margin:0 0 9px!important;
  }
  .materialMobilePanel .materialOrderMobileCard>div[style*="grid-template-columns"],
  .materialMobilePanel .orderDraftItem>div[style*="grid-template-columns"]{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
    gap:8px!important;
    width:100%!important;
  }
  .materialMobilePanel .materialOrderMobileCard>div[style*="grid-template-columns"]>label:first-child,
  .materialMobilePanel .orderDraftItem>div[style*="grid-template-columns"]>label:first-child{
    grid-column:1/-1!important;
  }
  .materialMobilePanel .materialOrderMobileCard input,
  .materialMobilePanel .orderDraftItem input{
    width:100%!important;
    min-height:42px!important;
    font-size:16px!important;
  }
  .materialMobilePanel .materialAmountCell,
  .materialMobilePanel .materialOrderMobileCard>div[style*="grid-template-columns"]>div:last-child,
  .materialMobilePanel .orderDraftItem>div[style*="grid-template-columns"]>div:last-child{
    display:block!important;
    width:100%!important;
    min-height:42px!important;
    padding:6px 2px!important;
    visibility:visible!important;
    opacity:1!important;
    overflow:visible!important;
  }
  .materialMobilePanel .materialAmountCell strong,
  .materialMobilePanel .materialOrderMobileCard>div[style*="grid-template-columns"]>div:last-child strong,
  .materialMobilePanel .orderDraftItem>div[style*="grid-template-columns"]>div:last-child strong{
    display:block!important;
    font-size:16px!important;
    line-height:1.3!important;
    white-space:normal!important;
    overflow:visible!important;
  }
}

/* Portrait gets the tightest layout. */
@media (max-width:430px) and (orientation:portrait){
  .materialMobilePanel{width:calc(100vw - 8px)!important;max-width:calc(100vw - 8px)!important;padding:6px!important;}
  .materialMobilePanel .materialPriceBookRow{grid-template-columns:minmax(0,1fr) 34px 82px!important;padding:8px!important;}
  .materialMobilePanel .materialPriceBookRow>label{width:82px!important;}
  .materialMobilePanel .materialPriceBookRow>label input{width:58px!important;max-width:58px!important;}
}
`;

const backup=css+'.portrait-v5-backup-'+stamp;
fs.copyFileSync(css,backup);
fs.writeFileSync(css,oldCss+add,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: スマホ縦横レイアウトV5を適用しました。');
  console.log('・縦画面で材料発注をビューポート幅まで拡張');
  console.log('・単価表を3段のコンパクトカード化');
  console.log('・単価/掛率、コピー、削除を画面内に保持');
  console.log('・材料明細の金額を強制表示');
  console.log('・横画面にもmobile overrideを適用');
  console.log('CSS BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,css);
  console.error('ERROR: build失敗。CSSを自動復旧しました。');
  process.exit(1);
}
