const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_SERVICE_ORDER_STEP1_UI_SAFE';
const backup=file+'.service-step1-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('施工発注STEP1はすでに適用されています。');
let next=original;

// 施工発注STEP2パネルに専用classを追加
const panel='<section className="orderDraftPanel" aria-label="発注書作成 STEP2">';
if((next.split(panel).length-1)!==1)fail('STEP2パネルを一意に特定できません。');
next=next.replace(panel,'<section className={"orderDraftPanel " + ((orderDraft.orderMode||\'service\')===\'service\'?\'serviceOrderPanel\':\'\')} aria-label="発注書作成 STEP2">\n                      {/* '+marker+' */}');

// 見出しを施工のときだけ明確化
const heading='<div><small>ORDER STEP 2</small><h3>発注先・発注掛率</h3></div>';
if(!next.includes(heading))fail('STEP2見出しを特定できません。');
next=next.replace(heading,"<div><small>ORDER STEP 2</small><h3>{(orderDraft.orderMode||'service')==='service'?'施工発注書作成':'発注先・発注掛率'}</h3></div>");

// 材料参照ボードは施工では非表示
const refStart='<section className="materialOrderReferenceBoard">';
const refPos=next.indexOf(refStart);
if(refPos<0)fail('材料参考ボードが見つかりません。');
const refEnd=next.indexOf('</section>',refPos);
if(refEnd<0)fail('材料参考ボード終了を特定できません。');
const refBlock=next.slice(refPos,refEnd+10);
next=next.slice(0,refPos)+"{(orderDraft.orderMode||'service')!=='service' && (<>"+refBlock+"</>)}"+next.slice(refEnd+10);

// 施工発注時に表見出しを分かりやすく
const excelHeader='<div className="orderExcelHeader"><span>商品名</span><span>数量</span><span>単位</span><span>単価</span><span>金額</span></div>';
if(!next.includes(excelHeader))fail('発注書テーブル見出しが見つかりません。');
next=next.replace(excelHeader,"<div className=\"orderExcelHeader\"><span>{(orderDraft.orderMode||'service')==='service'?'施工内容':'商品名'}</span><span>数量</span><span>単位</span><span>{(orderDraft.orderMode||'service')==='service'?'施工単価':'単価'}</span><span>金額</span></div>");

// CSSをApp.jsx内の既存style定義へ追加。既存CSS文字列領域なので安全なプレーンCSS。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('既存CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .serviceOrderPanel .materialOrderReferenceBoard{display:none!important}
  .serviceOrderPanel .orderExcelSheetTitle strong{letter-spacing:.12em}
  .serviceOrderPanel .orderExcelSheetTitle strong::after{content:' 施工';font-size:12px;letter-spacing:0;margin-left:6px;color:#65727c}
  @media(max-width:620px){
    .serviceOrderPanel{width:calc(100vw - 12px)!important;max-width:calc(100vw - 12px)!important;position:relative!important;left:50%!important;transform:translateX(-50%)!important;margin:6px 0!important;padding:10px!important;overflow-x:hidden!important}
    .serviceOrderPanel .orderExcelWorkspace{display:block!important;width:100%!important;overflow:visible!important}
    .serviceOrderPanel .orderExcelSheet{width:100%!important;min-width:0!important;overflow:visible!important}
    .serviceOrderPanel .orderExcelHeader{display:none!important}
    .serviceOrderPanel .orderExcelSheet .orderDraftItems{display:grid!important;gap:10px!important}
    .serviceOrderPanel .orderExcelSheet .orderDraftItem{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;min-width:0!important;width:100%!important;gap:8px!important;padding:10px!important;border:1px solid #aeb4b8!important;border-radius:12px!important}
    .serviceOrderPanel .orderExcelSheet .orderDraftItem>strong{grid-column:1/-1!important;grid-row:auto!important;padding:4px 0!important;border:0!important;font-size:16px!important;white-space:normal!important}
    .serviceOrderPanel .orderExcelSheet .orderDraftItem>small{grid-column:1/-1!important;grid-row:auto!important;padding:0!important}
    .serviceOrderPanel .orderExcelSheet .orderQuantityCompare,.serviceOrderPanel .orderExcelSheet .orderSourceQuantity{grid-column:1!important;grid-row:auto!important;display:grid!important;justify-items:start!important;padding:8px!important;border:0!important;border-radius:9px!important;background:rgba(110,145,232,.08)!important}
    .serviceOrderPanel .orderExcelSheet .orderRateField{grid-column:2!important;grid-row:auto!important;display:grid!important;grid-template-columns:1fr auto!important;gap:6px!important;padding:8px!important;margin:0!important;border-radius:9px!important;background:rgba(216,77,131,.06)!important}
    .serviceOrderPanel .orderExcelSheet .orderRateField>span{grid-column:1/-1!important}
    .serviceOrderPanel .orderExcelSheet .orderRateField input{width:100%!important;min-width:0!important;min-height:42px!important;font-size:16px!important}
    .serviceOrderPanel .orderExcelSheet .orderLineAmount{grid-column:1/-1!important;grid-row:auto!important;display:flex!important;justify-content:space-between!important;padding:9px!important;border-top:1px solid rgba(110,145,232,.25)!important}
    .serviceOrderPanel .orderExcelSheet .orderDraftItem:has(.orderQuantityCompare)::after{display:none!important}
    .serviceOrderPanel .contractorPriceBookPane{width:100%!important;min-width:0!important;max-height:none!important;margin-top:12px!important;position:static!important;overflow:visible!important}
    .serviceOrderPanel .priceBookViewHead{display:none!important}
    .serviceOrderPanel .priceBookViewRow{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;min-width:0!important;padding:8px!important;gap:5px!important;border:1px solid #c4c8cb!important;border-radius:8px!important;margin-bottom:6px!important}
    .serviceOrderPanel .priceBookViewRow>*{padding:0!important;border:0!important}
    .serviceOrderPanel .priceBookViewRow small{grid-column:1/-1!important}
  }
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('施工発注STEP1の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{cp.execSync('npm run build',{stdio:'inherit',shell:true});console.log('');console.log('OK: 施工発注STEP1 UI整理を適用しました。');console.log('・施工では材料参考情報を非表示');console.log('・見出しを施工向けに整理');console.log('・PCは今の表形式を維持');console.log('・スマホは1施工項目1カード');console.log('・材料発注と保存処理は変更していません。');console.log('BACKUP: '+backup);}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
