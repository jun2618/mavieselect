const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_PURCHASE_ORDER_DRAFT_EDIT_LAYOUT_V2_SAFE';
const backup=file+'.draft-edit-layout-v2-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('下書き編集レイアウトV2はすでに適用されています。');
if(!original.includes('M-CROSS_PURCHASE_ORDER_DRAFT_EDIT_V1_SAFE'))fail('下書き編集V1が見つかりません。');
let next=original;

// プレビュー明細にも金額を表示。既存の見積/倍率/発注表示は維持。
const previewTail="<b>発注 {formatQuantity(item.orderQuantity)}{item.unit}</b></div></section>)}";
const previewCount=next.split(previewTail).length-1;
if(previewCount!==1)fail('下書きプレビュー明細末尾を一意に特定できません。検出数: '+previewCount);
const previewNew=`<b>発注 {formatQuantity(item.orderQuantity)}{item.unit}</b><strong className="purchaseOrderPreviewAmount">{item.orderRate===''||item.orderRate==null?'単価未設定':formatYen(item.orderAmount==null||item.orderAmount===''?(Number(item.orderQuantity)||0)*(Number(item.orderRate)||0):Number(item.orderAmount||0))}</strong></div></section>)}`;
next=next.replace(previewTail,previewNew);

// CSSを既存style領域へ追加。PCは広げ、スマホはビューポートいっぱいにする。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .purchaseOrderPreviewAmount{display:block;margin-top:5px;color:#d84d83;font-size:16px;text-align:right}
  .purchaseOrderExplorer{width:min(calc(100vw - 24px),1320px)!important;max-width:1320px!important}
  .purchaseOrderExplorerBody{grid-template-columns:minmax(230px,.55fr) minmax(0,1.75fr)!important}
  .purchaseOrderPreview{min-width:0!important;overflow:visible!important}
  .draftOrderEditor{width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden!important;box-sizing:border-box!important}
  .draftOrderEditRows,.draftOrderEditRow{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important}
  .draftOrderEditRow{grid-template-columns:minmax(220px,1.8fr) minmax(90px,.65fr) minmax(80px,.5fr) minmax(100px,.65fr) minmax(110px,.7fr) auto!important}
  .draftOrderEditAmount strong{display:block;color:#d84d83;font-size:16px;white-space:nowrap}
  @media(max-width:720px){
    .purchaseOrderExplorerBackdrop{padding:0!important;align-items:stretch!important;justify-items:stretch!important}
    .purchaseOrderExplorer{width:100vw!important;max-width:100vw!important;min-height:100vh!important;margin:0!important;padding:8px!important;border-radius:0!important;box-sizing:border-box!important;overflow-x:hidden!important}
    .purchaseOrderExplorer>header{position:sticky!important;top:0!important;z-index:5!important;padding:6px 2px!important;background:#fffaf6!important}
    .purchaseOrderExplorerBody{display:block!important;margin-top:6px!important;width:100%!important;max-width:100%!important}
    .purchaseOrderTree{display:none!important}
    .purchaseOrderPreview{width:100%!important;max-width:100%!important;min-width:0!important;padding:8px!important;border-radius:10px!important;box-sizing:border-box!important;overflow:hidden!important}
    .purchaseOrderPreviewHeader{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
    .purchaseOrderPreviewHeader>div{min-width:0!important}
    .draftOrderEditor{margin:8px 0!important;padding:8px!important;border-radius:10px!important;overflow:hidden!important}
    .draftOrderEditRow{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:7px!important;padding:8px!important;overflow:hidden!important}
    .draftOrderEditRow .wide{grid-column:1/-1!important}
    .draftOrderEditRow label,.draftOrderEditRow input{min-width:0!important;max-width:100%!important;width:100%!important;box-sizing:border-box!important}
    .draftOrderEditAmount{min-width:0!important;text-align:left!important;align-self:center!important}
    .draftOrderEditRow>.danger{width:100%!important;min-width:0!important}
    .draftOrderAddRow{width:100%!important}
    .draftOrderEditor>footer{display:grid!important;grid-template-columns:1fr!important;width:100%!important}
    .draftOrderEditor>footer button{width:100%!important}
    .purchaseOrderPreviewAmount{text-align:right!important;font-size:15px!important}
  }
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('下書き編集レイアウトV2の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 下書き編集レイアウトV2を適用しました。');
  console.log('・下書きプレビューに金額表示');
  console.log('・PCの編集エリアを拡幅し、はみ出しを抑制');
  console.log('・スマホは発注書画面を100vwで全面表示');
  console.log('・スマホ編集行は2列カード、品名は全幅');
  console.log('・左の発注書ツリーはスマホ編集中は非表示');
  console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
