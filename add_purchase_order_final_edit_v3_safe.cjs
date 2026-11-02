const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_PURCHASE_ORDER_FINAL_EDIT_V3_SAFE';
const backup=file+'.final-edit-v3-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('本発注編集V3はすでに適用されています。');
if(!original.includes('M-CROSS_PURCHASE_ORDER_DRAFT_EDIT_V1_SAFE'))fail('下書き編集V1が見つかりません。');
let next=original;

// 本発注に編集ボタン。確認後に既存編集stateへコピー。
const excelButton='{selected.status===\'本発注\'&&<button className="finalOrderExcelButton" type="button" onClick={()=>exportFinalPurchaseOrderExcel(selected)}>⬇ Excel書式で出力</button>}';
if((next.split(excelButton).length-1)!==1)fail('Excel出力ボタンを一意に特定できません。');
const finalEdit=`{/* ${marker} */}{selected.status==='本発注'&&<button className="finalOrderEditButton" type="button" onClick={()=>{if(!window.confirm('本発注書を編集しますか？\\n保存すると現在の本発注書を更新します。'))return;setEditingPurchaseOrderId(selected.id);setPurchaseOrderEditItems((selected.items||[]).map(item=>({...item})))}}>✏ 本発注書を編集</button>}${excelButton}`;
next=next.replace(excelButton,finalEdit);

// 編集パネルを下書き限定から、editing ID一致なら本発注にも出す。
const editorCondition="{selected.status!=='本発注'&&editingPurchaseOrderId===selected.id&&<section className=\"draftOrderEditor\">";
if((next.split(editorCondition).length-1)!==1)fail('編集パネル条件を一意に特定できません。');
next=next.replace(editorCondition,"{editingPurchaseOrderId===selected.id&&<section className=\"draftOrderEditor\">");

// 見出しと注意書きをstatusで切替。
next=next.replace('<header><strong>下書き編集</strong><small>この発注書だけを変更します。採寸・見積データは変更しません。</small></header>',
`<header><strong>{selected.status==='本発注'?'本発注書編集':'下書き編集'}</strong><small>{selected.status==='本発注'?'この本発注書を更新します。採寸・見積データは変更しません。':'この発注書だけを変更します。採寸・見積データは変更しません。'}</small></header>`);

// 保存ボタンのラベルをstatusで切替。保存処理は同じpurchaseOrdersを更新するため再利用。
const saveText='>下書きを上書き保存</button>';
if((next.split(saveText).length-1)!==1)fail('上書き保存ボタンを特定できません。');
next=next.replace(saveText,`>{selected.status==='本発注'?'本発注書を更新':'下書きを上書き保存'}</button>`);

// 保存後メッセージをstatus別にする。
const message="setSaveStatus('下書きを上書き保存しました');window.alert('下書きを上書き保存しました。')";
if((next.split(message).length-1)!==1)fail('保存後メッセージを特定できません。');
next=next.replace(message,"setSaveStatus(selected.status==='本発注'?'本発注書を更新しました':'下書きを上書き保存しました');window.alert(selected.status==='本発注'?'本発注書を更新しました。':'下書きを上書き保存しました。')");

// 本発注更新時に更新履歴スナップショットを残す。
const updateLine="const updated=purchaseOrders.map(order=>order.id===selected.id?{...order,items:cleaned,updatedAt:new Date().toISOString()}:order)";
if((next.split(updateLine).length-1)!==1)fail('発注書更新処理を特定できません。');
next=next.replace(updateLine,`const updatedAt=new Date().toISOString();const updated=purchaseOrders.map(order=>order.id===selected.id?{...order,items:cleaned,updatedAt,revisionHistory:selected.status==='本発注'?[...(Array.isArray(order.revisionHistory)?order.revisionHistory:[]),{updatedAt,items:(order.items||[]).map(item=>({...item}))}]:order.revisionHistory}:order)`);

// CSS
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */\n  .finalOrderEditButton{min-height:42px;padding:8px 13px;border:1px solid #c78731;border-radius:9px;background:#fff7e8;color:#8b5614;font:inherit;font-weight:900}@media(max-width:720px){.finalOrderEditButton{width:100%}}\n`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('本発注編集V3の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{cp.execSync('npm run build',{stdio:'inherit',shell:true});console.log('');console.log('OK: 本発注書編集V3を適用しました。');console.log('・本発注に「本発注書を編集」ボタン');console.log('・確認ダイアログ後に編集');console.log('・品名/数量/単位/単価/金額、明細追加削除');console.log('・確定前の内容をrevisionHistoryへ保存');console.log('・採寸/見積データは変更しません');console.log('BACKUP: '+backup);}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
