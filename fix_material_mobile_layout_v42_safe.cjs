const fs=require('fs');
const cp=require('child_process');
const appFile='./src/App.jsx';
const cssCandidates=['./src/App.css','./src/index.css','./src/main.css'];
const cssFile=cssCandidates.find(p=>fs.existsSync(p));
const marker='M-CROSS_MATERIAL_MOBILE_LAYOUT_V42_SAFE';
const stamp=Date.now();
function fail(m){console.error('ERROR: '+m);console.error('変更していません。');process.exit(1)}
if(!fs.existsSync(appFile))fail('src/App.jsx が見つかりません。');
if(!cssFile)fail('CSSファイルが見つかりません。');
const originalApp=fs.readFileSync(appFile,'utf8');
const originalCss=fs.readFileSync(cssFile,'utf8');
if(originalApp.includes(marker)||originalCss.includes(marker))fail('V4.2はすでに適用されています。');
let app=originalApp;
if(!app.includes('materialMobilePanel'))fail('materialMobilePanel が見つかりません。');

// 現在の実コードで確実に存在するV4.1マーカーと直後のpriceBook.mapを基準にする
const anchor='{/* M-CROSS_PRICEBOOK_V41_INLINE_EDIT_SAFE */}';
const anchorPos=app.indexOf(anchor);
if(anchorPos<0)fail('V4.1単価表マーカーが見つかりません。');
const mapNeedle='{priceBook.map((row, index) => (';
const mapPos=app.indexOf(mapNeedle,anchorPos);
if(mapPos<0)fail('確認用priceBook.mapが見つかりません。');
const rowDiv=app.indexOf('<div',mapPos);
const rowKey=app.indexOf('key={row.id || index}',rowDiv);
if(rowDiv<0||rowKey<0||rowKey-rowDiv>350)fail('確認用単価表の行divを特定できません。');
const rowOpenEnd=app.indexOf('>',rowKey);
const rowOpen=app.slice(rowDiv,rowOpenEnd+1);
if(!rowOpen.includes('className=')){
  app=app.slice(0,rowDiv)+rowOpen.replace('<div','<div className="materialPriceBookRow"')+app.slice(rowOpenEnd+1);
}else if(!rowOpen.includes('materialPriceBookRow')){
  fail('単価表行に別classNameがあり、安全に追記できません。');
}

// 材料明細のarticle群に専用classを付ける
const materialMapNeedle='{materialOrderItems.map((item, itemIndex) => (';
const materialMapPos=app.indexOf(materialMapNeedle);
if(materialMapPos>=0){
  const articlePos=app.indexOf('<article',materialMapPos);
  const articleEnd=app.indexOf('>',articlePos);
  if(articlePos>=0&&articleEnd>articlePos){
    const open=app.slice(articlePos,articleEnd+1);
    if(!open.includes('className=')) app=app.slice(0,articlePos)+open.replace('<article','<article className="materialOrderMobileCard"')+app.slice(articleEnd+1);
  }
}

// JSXマーカーは材料パネル直後
const panel='<section className="orderDraftPanel materialMobilePanel" aria-label="材料発注">';
if(!app.includes(panel))fail('材料発注パネルが見つかりません。');
app=app.replace(panel,panel+'\n                      {/* '+marker+' */}');

const css=originalCss+`\n\n/* ${marker} */
@media (max-width:640px){
  .materialMobilePanel{
    width:calc(100% - 12px)!important;
    max-width:calc(100% - 12px)!important;
    min-width:0!important;
    margin:6px!important;
    padding:8px!important;
    overflow-x:hidden!important;
  }
  .materialMobilePanel *{box-sizing:border-box!important;min-width:0!important;}

  .materialMobilePanel .orderDraftHeader{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) auto!important;
    gap:8px!important;
    align-items:start!important;
  }
  .materialMobilePanel .orderDraftHeader h3{font-size:18px!important;line-height:1.3!important;margin:2px 0!important;}
  .materialMobilePanel .orderDraftHeader>button{max-width:108px!important;padding:7px!important;font-size:12px!important;}

  /* 確認用単価表 */
  .materialMobilePanel .materialPriceBookRow{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) 42px minmax(82px,96px)!important;
    grid-template-areas:'name unit value' 'note actions actions'!important;
    gap:7px!important;
    align-items:center!important;
    width:100%!important;
    max-width:100%!important;
    min-height:0!important;
    padding:9px!important;
    margin:0 0 8px!important;
  }
  .materialMobilePanel .materialPriceBookRow>strong{grid-area:name!important;display:block!important;font-size:13px!important;line-height:1.35!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;word-break:break-word!important;}
  .materialMobilePanel .materialPriceBookRow>span{grid-area:unit!important;font-size:12px!important;text-align:center!important;}
  .materialMobilePanel .materialPriceBookRow>label{grid-area:value!important;display:flex!important;align-items:center!important;gap:3px!important;margin:0!important;}
  .materialMobilePanel .materialPriceBookRow>label input{width:65px!important;min-height:36px!important;padding:5px!important;font-size:14px!important;}
  .materialMobilePanel .materialPriceBookRow>small{grid-area:note!important;font-size:10px!important;line-height:1.25!important;}
  .materialMobilePanel .materialPriceBookRow>div{grid-area:actions!important;display:flex!important;justify-content:flex-end!important;gap:4px!important;flex-wrap:wrap!important;}
  .materialMobilePanel .materialPriceBookRow>div button{width:auto!important;min-height:32px!important;padding:5px 7px!important;font-size:11px!important;white-space:nowrap!important;}

  /* 材料明細。品番=全幅、数量/単位、単価/金額 */
  .materialMobilePanel .materialOrderMobileCard{
    display:block!important;
    width:100%!important;
    max-width:100%!important;
    padding:10px!important;
    margin:0 0 10px!important;
  }
  .materialMobilePanel .materialOrderMobileCard>div[style*="grid-template-columns"]{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
    gap:8px!important;
    width:100%!important;
  }
  .materialMobilePanel .materialOrderMobileCard>div[style*="grid-template-columns"]>label:first-child{grid-column:1/-1!important;}
  .materialMobilePanel .materialOrderMobileCard input,
  .materialMobilePanel .materialOrderMobileCard select{width:100%!important;min-height:42px!important;font-size:16px!important;}
  .materialMobilePanel .materialOrderMobileCard>div[style*="grid-template-columns"]>div:last-child{
    display:block!important;
    width:100%!important;
    min-height:42px!important;
    padding:6px 2px!important;
  }
  .materialMobilePanel .materialOrderMobileCard>div[style*="grid-template-columns"]>div:last-child strong{
    display:block!important;
    font-size:16px!important;
    line-height:1.35!important;
    white-space:normal!important;
    overflow:visible!important;
    color:#f4f8ff!important;
  }

  /* Cyber */
  [data-theme="cyber"] .materialMobilePanel .materialPriceBookRow,
  .theme-cyber .materialMobilePanel .materialPriceBookRow,
  body.cyber .materialMobilePanel .materialPriceBookRow{
    background:#0b1723!important;
    border:1px solid #1c718c!important;
    color:#f7fbff!important;
  }
  [data-theme="cyber"] .materialMobilePanel .materialPriceBookRow strong,
  [data-theme="cyber"] .materialMobilePanel .materialPriceBookRow span,
  .theme-cyber .materialMobilePanel .materialPriceBookRow strong,
  .theme-cyber .materialMobilePanel .materialPriceBookRow span,
  body.cyber .materialMobilePanel .materialPriceBookRow strong,
  body.cyber .materialMobilePanel .materialPriceBookRow span{color:#f7fbff!important;}
}
`;

const appBackup=appFile+'.mobile-layout-v42-backup-'+stamp;
const cssBackup=cssFile+'.mobile-layout-v42-backup-'+stamp;
fs.copyFileSync(appFile,appBackup);fs.copyFileSync(cssFile,cssBackup);
fs.writeFileSync(appFile,app,'utf8');fs.writeFileSync(cssFile,css,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: スマホ材料発注レイアウトV4.2を適用しました。');
  console.log('・タイトル探索を廃止し、V4.1 priceBook.mapを基準に修正');
  console.log('・単価/掛率/コピー/削除を画面内に配置');
  console.log('・材料明細の金額をスマホで表示');
  console.log('・PC表示は変更していません。');
  console.log('APP BACKUP: '+appBackup);console.log('CSS BACKUP: '+cssBackup);
}catch(e){
  fs.copyFileSync(appBackup,appFile);fs.copyFileSync(cssBackup,cssFile);
  console.error('ERROR: build失敗。App.jsxとCSSを自動復旧しました。');process.exit(1);
}
