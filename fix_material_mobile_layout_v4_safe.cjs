const fs=require('fs');
const cp=require('child_process');
const appFile='./src/App.jsx';
const cssCandidates=['./src/App.css','./src/index.css','./src/main.css'];
const cssFile=cssCandidates.find(p=>fs.existsSync(p));
const marker='M-CROSS_MATERIAL_MOBILE_LAYOUT_V4_SAFE';
const stamp=Date.now();
function fail(m){console.error('ERROR: '+m);console.error('変更していません。');process.exit(1)}
if(!fs.existsSync(appFile))fail('src/App.jsx が見つかりません。');
if(!cssFile)fail('CSSファイルが見つかりません。');
const originalApp=fs.readFileSync(appFile,'utf8');
const originalCss=fs.readFileSync(cssFile,'utf8');
if(originalApp.includes(marker)||originalCss.includes(marker))fail('スマホレイアウトV4はすでに適用されています。');
let app=originalApp;

// 材料発注パネル専用クラスを保証
if(!app.includes('materialMobilePanel')){
  const panel='<section className="orderDraftPanel" aria-label="材料発注">';
  if((app.split(panel).length-1)!==1)fail('材料発注パネルを一意に特定できません。');
  app=app.replace(panel,'<section className="orderDraftPanel materialMobilePanel" aria-label="材料発注">');
}

// 確認用単価表の各行に専用クラスを付ける。最初の priceBook.map が材料発注側。
const mapPos=app.indexOf('{priceBook.map((row, index) => (');
if(mapPos<0)fail('材料単価表のpriceBook.mapが見つかりません。');
const keyNeedle='<div\n                                            key={row.id || index}';
const rowPos=app.indexOf(keyNeedle,mapPos);
if(rowPos<0)fail('材料単価表の行を特定できません。');
const replacement='<div\n                                            className="materialPriceBookRow"\n                                            key={row.id || index}';
app=app.slice(0,rowPos)+app.slice(rowPos).replace(keyNeedle,replacement);

// 単価表ブロック自体にクラスを付けるため、タイトル直前の親divを限定
const titlePos=app.indexOf('{supplier.name} 単価表',mapPos-2500);
if(titlePos<0)fail('材料単価表タイトルが見つかりません。');
const parentStart=app.lastIndexOf('<div style={{',titlePos);
if(parentStart>=0){
  app=app.slice(0,parentStart)+app.slice(parentStart).replace('<div style={{','<div className="materialPriceBookPanel" style={{');
}

// 材料明細の金額表示に専用クラスを付ける
const amountText='>\n                                    金額\n                                  </span>';
const amountPos=app.indexOf(amountText);
if(amountPos>=0){
  const amountDiv=app.lastIndexOf('<div>',amountPos);
  if(amountDiv>=0) app=app.slice(0,amountDiv)+app.slice(amountDiv).replace('<div>','<div className="materialAmountCell">');
}

// マーカー
const panelMarker='<section className="orderDraftPanel materialMobilePanel" aria-label="材料発注">';
app=app.replace(panelMarker,panelMarker+'\n                      {/* '+marker+' */}');

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

  /* 上部操作は縦に伸びすぎない */
  .materialMobilePanel .orderDraftHeader{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:start!important;}
  .materialMobilePanel .orderDraftHeader h3{font-size:18px!important;line-height:1.35!important;margin:2px 0!important;}
  .materialMobilePanel .orderDraftHeader button{max-width:112px!important;padding:8px!important;}

  /* 単価表: 1商品をコンパクトな2段カードへ */
  .materialMobilePanel .materialPriceBookPanel{width:100%!important;max-width:100%!important;overflow:visible!important;}
  .materialMobilePanel .materialPriceBookRow{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) 54px minmax(88px,105px)!important;
    grid-template-areas:
      'name unit value'
      'note actions actions'!important;
    gap:8px!important;
    align-items:center!important;
    width:100%!important;
    min-height:0!important;
    padding:10px!important;
    margin:0 0 8px!important;
  }
  .materialMobilePanel .materialPriceBookRow>strong{grid-area:name!important;display:block!important;font-size:14px!important;line-height:1.4!important;white-space:normal!important;overflow:visible!important;word-break:break-word!important;}
  .materialMobilePanel .materialPriceBookRow>span{grid-area:unit!important;font-size:13px!important;text-align:center!important;}
  .materialMobilePanel .materialPriceBookRow>label{grid-area:value!important;display:flex!important;align-items:center!important;gap:3px!important;}
  .materialMobilePanel .materialPriceBookRow>label input{width:72px!important;min-height:38px!important;padding:6px!important;font-size:15px!important;}
  .materialMobilePanel .materialPriceBookRow>small{grid-area:note!important;font-size:11px!important;line-height:1.3!important;}
  .materialMobilePanel .materialPriceBookRow>div{grid-area:actions!important;display:flex!important;justify-content:flex-end!important;gap:5px!important;flex-wrap:wrap!important;}
  .materialMobilePanel .materialPriceBookRow>div button{width:auto!important;min-height:34px!important;padding:6px 8px!important;font-size:12px!important;}

  /* 材料明細: 品番全幅、数量/単位、単価/金額の3段 */
  .materialMobilePanel .orderDraftItem{display:block!important;width:100%!important;padding:10px!important;margin-bottom:10px!important;}
  .materialMobilePanel .orderDraftItem>div[style*="grid-template-columns"]{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
    gap:8px!important;
  }
  .materialMobilePanel .orderDraftItem>div[style*="grid-template-columns"]>label:first-child{grid-column:1/-1!important;}
  .materialMobilePanel .orderDraftItem input,.materialMobilePanel .orderDraftItem select{width:100%!important;min-height:42px!important;font-size:16px!important;}
  .materialMobilePanel .materialAmountCell{display:block!important;width:100%!important;min-height:42px!important;padding:6px 2px!important;}
  .materialMobilePanel .materialAmountCell strong{display:block!important;font-size:17px!important;white-space:normal!important;overflow:visible!important;}

  /* Cyber: 白飛びを避けて高コントラスト */
  [data-theme="cyber"] .materialMobilePanel .materialPriceBookRow,
  .theme-cyber .materialMobilePanel .materialPriceBookRow,
  body.cyber .materialMobilePanel .materialPriceBookRow{background:#0b1723!important;border:1px solid #1c718c!important;color:#f7fbff!important;}
  [data-theme="cyber"] .materialMobilePanel .materialPriceBookRow strong,
  [data-theme="cyber"] .materialMobilePanel .materialPriceBookRow span,
  .theme-cyber .materialMobilePanel .materialPriceBookRow strong,
  .theme-cyber .materialMobilePanel .materialPriceBookRow span,
  body.cyber .materialMobilePanel .materialPriceBookRow strong,
  body.cyber .materialMobilePanel .materialPriceBookRow span{color:#f7fbff!important;}
}
`;

const appBackup=appFile+'.mobile-layout-v4-backup-'+stamp;
const cssBackup=cssFile+'.mobile-layout-v4-backup-'+stamp;
fs.copyFileSync(appFile,appBackup);fs.copyFileSync(cssFile,cssBackup);
fs.writeFileSync(appFile,app,'utf8');fs.writeFileSync(cssFile,css,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: スマホ材料発注レイアウトV4を適用しました。');
  console.log('・単価表をコンパクトな2段カード化');
  console.log('・単価/掛率と操作ボタンまで画面内に表示');
  console.log('・材料明細の金額を見える位置に固定');
  console.log('・PC表示は変更していません。');
  console.log('APP BACKUP: '+appBackup);console.log('CSS BACKUP: '+cssBackup);
}catch(e){fs.copyFileSync(appBackup,appFile);fs.copyFileSync(cssBackup,cssFile);console.error('ERROR: build失敗。App.jsxとCSSを自動復旧しました。');process.exit(1)}
