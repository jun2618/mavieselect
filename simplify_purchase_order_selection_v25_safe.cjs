const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_SIMPLIFY_PURCHASE_ORDER_SELECTION_V25_SAFE';
const backup=file+'.simplify-order-selection-v25-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('発注項目選択整理V25はすでに適用されています。');
let next=original;

// 現在の発注項目選択パネルだけを対象にする。
const panelMarker='発注する項目を選択';
const panelPos=next.indexOf(panelMarker);
if(panelPos<0)fail('「発注する項目を選択」が見つかりません。');
const scopeStart=Math.max(0,panelPos-5000);
const scopeEnd=Math.min(next.length,panelPos+7000);

function renameButtonText(oldText,newText){
  const pos=next.indexOf(oldText,scopeStart);
  if(pos<0||pos>scopeEnd)fail('「'+oldText+'」ボタンが発注項目選択パネル内に見つかりません。');
  next=next.slice(0,pos)+newText+next.slice(pos+oldText.length);
}
function removeButtonByText(text){
  const pos=next.indexOf(text,scopeStart);
  if(pos<0||pos>scopeEnd)fail('「'+text+'」ボタンが発注項目選択パネル内に見つかりません。');
  const start=next.lastIndexOf('<button',pos);
  const end=next.indexOf('</button>',pos);
  if(start<scopeStart||end<0||end>scopeEnd)fail('「'+text+'」button範囲を特定できません。');
  const block=next.slice(start,end+9);
  if(!block.includes(text))fail('「'+text+'」以外のbuttonを検出しました。');
  next=next.slice(0,start)+next.slice(end+9);
}

// 「内装一括」は機能を変えず、対象が分かる名前へ。
renameButtonText('内装一括','クロス・CF・巾木を一括選択');
// その他工事は発注先が異なるため一括選択を廃止。
removeButtonByText('その他のみ');
// 全選択も通常運用では不要なので廃止。
removeButtonByText('全選択');

// クリアは残す。個別選択は下の見積明細チェックを使うことが分かる補足を追加。
const summaryAnchor='<div className="orderSelectionSummary">';
const summaryPos=next.indexOf(summaryAnchor,scopeStart);
if(summaryPos<0||summaryPos>scopeEnd)fail('選択中サマリーが見つかりません。');
const note=`{/* ${marker} */}\n                    <small className="orderSelectionIndividualNote">その他工事は下の見積明細から必要な項目だけ選択してください。</small>\n                    `;
next=next.slice(0,summaryPos)+note+next.slice(summaryPos);

// 2列グリッドを1列/操作2要素に自然化。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */\n  .orderSelectionQuickButtons{grid-template-columns:minmax(0,1fr) minmax(120px,.34fr)!important}.orderSelectionIndividualNote{display:block;margin:2px 2px 8px;color:#756a78;font-size:12px;line-height:1.5}.theme-dark .orderSelectionIndividualNote,.theme-cyber .orderSelectionIndividualNote,.theme-luxury .orderSelectionIndividualNote,.theme-retro .orderSelectionIndividualNote,.theme-galaxy .orderSelectionIndividualNote{color:#d9f8ff}@media(max-width:520px){.orderSelectionQuickButtons{grid-template-columns:1fr!important}}\n`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('発注項目選択整理V25の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');
 console.log('OK: 発注項目選択整理V25を適用しました。');
 console.log('・内装一括 -> クロス・CF・巾木を一括選択');
 console.log('・その他のみ を削除');
 console.log('・全選択 を削除');
 console.log('・クリア を維持');
 console.log('・その他工事は見積明細から個別選択する案内を追加');
 console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
