const fs=require('fs');
const cp=require('child_process');
const appFile='./src/App.jsx';
const cssCandidates=['./src/App.css','./src/index.css','./src/main.css'];
const cssFile=cssCandidates.find(p=>fs.existsSync(p));
const marker='M-CROSS_MATERIAL_MOBILE_LAYOUT_V41_SAFE';
const stamp=Date.now();
function fail(m){console.error('ERROR: '+m);console.error('変更していません。');process.exit(1)}
if(!fs.existsSync(appFile))fail('src/App.jsx が見つかりません。');
if(!cssFile)fail('CSSファイルが見つかりません。');
const originalApp=fs.readFileSync(appFile,'utf8');
const originalCss=fs.readFileSync(cssFile,'utf8');
if(originalApp.includes(marker)||originalCss.includes(marker))fail('V4.1はすでに適用されています。');
let app=originalApp;
if(!app.includes('materialMobilePanel'))fail('materialMobilePanel がありません。先にCSS版V2を適用してください。');

// 実コード位置 10106 付近の最初の確認用 priceBook.map の各行へ class を付与
const anchor='{/* M-CROSS_PRICEBOOK_V41_INLINE_EDIT_SAFE */}';
const anchorPos=app.indexOf(anchor);
if(anchorPos<0)fail('V4.1単価表マーカーが見つかりません。');
const mapPos=app.indexOf('{priceBook.map((row, index) => (',anchorPos);
if(mapPos<0)fail('確認用priceBook.mapが見つかりません。');
const divPos=app.indexOf('<div',mapPos);
const keyPos=app.indexOf('key={row.id || index}',divPos);
if(divPos<0||keyPos<0||keyPos-divPos>300)fail('確認用単価表の行divを特定できません。');
const divOpenEnd=app.indexOf('>',keyPos);
const divOpen=app.slice(divPos,divOpenEnd+1);
if(!divOpen.includes('className=')){
  const newOpen=divOpen.replace('<div','<div className="materialPriceBookRow"');
  app=app.slice(0,divPos)+newOpen+app.slice(divOpenEnd+1);
}

// タイトルを含む単価表コンテナへ class。タイトルの直前ではなく V3-B の marginTop パネルを後方探索
const titlePos=app.indexOf('{supplier.name} 単価表',anchorPos-3000);
if(titlePos<0)fail('単価表タイトルが見つかりません。');
let panelPos=app.lastIndexOf('<div style={{',titlePos);
if(panelPos<0)fail('単価表パネルを特定できません。');
const panelOpenEnd=app.indexOf('>',panelPos);
const panelOpen=app.slice(panelPos,panelOpenEnd+1);
if(!panelOpen.includes('className=')){
  app=app.slice(0,panelPos)+panelOpen.replace('<div','<div className="materialPriceBookPanel"')+app.slice(panelOpenEnd+1);
}

// 材料明細の金額セルはテキスト位置から class を付与
const amountPos=app.indexOf('金額',mapPos);
if(amountPos>=0){
  const amountDiv=app.lastIndexOf('<div',amountPos);
  const amountDivEnd=app.indexOf('>',amountDiv);
  if(amountDiv>=0 && amountDivEnd>amountDiv){
    const open=app.slice(amountDiv,amountDivEnd+1);
    if(!open.includes('className=')) app=app.slice(0,amountDiv)+open.replace('<div','<div className="materialAmountCell"')+app.slice(amountDivEnd+1);
  }
}

const panelNeedle='<section className="orderDraftPanel materialMobilePanel" aria-label="材料発注">';
app=app.replace(panelNeedle,panelNeedle+'\n                      {/* '+marker+' */}');

const css=originalCss+`\n\n/* ${marker} */
@media (max-width:640px){
  .materialMobilePanel{width:calc(100% - 12px)!important;max-width:calc(100% - 12px)!important;min-width:0!important;margin:6px!important;padding:8px!important;overflow-x:hidden!important;}
  .materialMobilePanel *{box-sizing:border-box!important;min-width:0!important;}
  .materialMobilePanel .orderDraftHeader{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:start!important;}
  .materialMobilePanel .orderDraftHeader h3{font-size:18px!important;line-height:1.35!important;margin:2px 0!important;}
  .materialMobilePanel .orderDraftHeader>button{max-width:110px!important;padding:7px!important;}

  .materialMobilePanel .materialPriceBookPanel{width:100%!important;max-width:100%!important;overflow:visible!important;}
  .materialMobilePanel .materialPriceBookRow{display:grid!important;grid-template-columns:minmax(0,1fr) 46px minmax(88px,100px)!important;grid-template-areas:'name unit value' 'note actions actions'!important;gap:7px!important;align-items:center!important;width:100%!important;min-height:0!important;padding:9px!important;margin:0 0 8px!important;}
  .materialMobilePanel .materialPriceBookRow>strong{grid-area:name!important;font-size:13px!important;line-height:1.35!important;white-space:normal!important;overflow:visible!important;word-break:break-word!important;}
  .materialMobilePanel .materialPriceBookRow>span{grid-area:unit!important;font-size:12px!important;text-align:center!important;}
  .materialMobilePanel .materialPriceBookRow>label{grid-area:value!important;display:flex!important;align-items:center!important;gap:3px!important;}
  .materialMobilePanel .materialPriceBookRow>label input{width:68px!important;min-height:36px!important;padding:5px!important;font-size:14px!important;}
  .materialMobilePanel .materialPriceBookRow>small{grid-area:note!important;font-size:10px!important;line-height:1.3!important;}
  .materialMobilePanel .materialPriceBookRow>div{grid-area:actions!important;display:flex!important;justify-content:flex-end!important;gap:4px!important;flex-wrap:wrap!important;}
  .materialMobilePanel .materialPriceBookRow>div button{width:auto!important;min-height:32px!important;padding:5px 7px!important;font-size:11px!important;}

  .materialMobilePanel .orderDraftItem{display:block!important;width:100%!important;max-width:100%!important;padding:10px!important;margin-bottom:10px!important;}
  .materialMobilePanel .orderDraftItem>div[style*="grid-template-columns"]{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;}
  .materialMobilePanel .orderDraftItem>div[style*="grid-template-columns"]>label:first-child{grid-column:1/-1!important;}
  .materialMobilePanel .orderDraftItem input,.materialMobilePanel .orderDraftItem select{width:100%!important;min-height:42px!important;font-size:16px!important;}
  .materialMobilePanel .materialAmountCell{display:block!important;width:100%!important;min-height:42px!important;padding:6px 2px!important;}
  .materialMobilePanel .materialAmountCell strong{display:block!important;font-size:16px!important;white-space:normal!important;overflow:visible!important;}

  [data-theme="cyber"] .materialMobilePanel .materialPriceBookRow,.theme-cyber .materialMobilePanel .materialPriceBookRow,body.cyber .materialMobilePanel .materialPriceBookRow{background:#0b1723!important;border:1px solid #1c718c!important;color:#f7fbff!important;}
  [data-theme="cyber"] .materialMobilePanel .materialPriceBookRow strong,[data-theme="cyber"] .materialMobilePanel .materialPriceBookRow span,.theme-cyber .materialMobilePanel .materialPriceBookRow strong,.theme-cyber .materialMobilePanel .materialPriceBookRow span,body.cyber .materialMobilePanel .materialPriceBookRow strong,body.cyber .materialMobilePanel .materialPriceBookRow span{color:#f7fbff!important;}
}
`;

const appBackup=appFile+'.mobile-layout-v41-backup-'+stamp;
const cssBackup=cssFile+'.mobile-layout-v41-backup-'+stamp;
fs.copyFileSync(appFile,appBackup);fs.copyFileSync(cssFile,cssBackup);
fs.writeFileSync(appFile,app,'utf8');fs.writeFileSync(cssFile,css,'utf8');
try{cp.execSync('npm run build',{stdio:'inherit',shell:true});console.log('');console.log('OK: スマホ材料発注レイアウトV4.1を適用しました。');console.log('・現在のV4.1単価表構造に対応');console.log('・単価/掛率/コピー/削除をスマホ画面内に配置');console.log('・材料明細の金額セルをスマホで表示');console.log('・PC表示は変更していません。');console.log('APP BACKUP: '+appBackup);console.log('CSS BACKUP: '+cssBackup);}catch(e){fs.copyFileSync(appBackup,appFile);fs.copyFileSync(cssBackup,cssFile);console.error('ERROR: build失敗。App.jsxとCSSを自動復旧しました。');process.exit(1)}
