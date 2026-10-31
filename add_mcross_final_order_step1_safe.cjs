const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_INTERNAL_FINAL_ORDER_STEP1_SAFE';
const backup=file+'.internal-final-step1-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('M-Cross本発注書STEP1はすでに適用されています。');

for(const token of [
  'function deletePurchaseOrder(id){',
  'function savePurchaseOrders',
  'className="purchaseOrderPreviewHeader"',
  'deletePurchaseOrder(selected.id)',
  'selected.status'
]){
  if(!original.includes(token))fail('前提コードが見つかりません: '+token);
}

let next=original;

// 1. 下書きをM-Cross内の本発注へ確定する処理
const functionAnchor='  function deletePurchaseOrder(id){';
const finalizeFunction=`  /* ${marker} */
  function finalizePurchaseOrder(id){
    const target=purchaseOrders.find(item=>item.id===id)
    if(!target){window.alert('発注書が見つかりません。');return}
    if(target.status==='本発注'){
      window.alert('この発注書はすでに本発注です。')
      return
    }
    if(!window.confirm('この下書きを本発注書として確定しますか？\\n確定時点の数量・単価・金額を保存します。'))return
    const issuedAt=new Date().toISOString()
    const nextOrders=purchaseOrders.map(item=>item.id===id?{
      ...item,
      status:'本発注',
      issuedAt,
      finalizedAt:issuedAt,
      items:(item.items||[]).map(row=>({...row}))
    }:item)
    savePurchaseOrders(nextOrders)
    setSaveStatus('本発注書として確定しました')
    window.alert('本発注書として確定しました。')
  }

`;
next=next.replace(functionAnchor,finalizeFunction+functionAnchor);

// 2. プレビューの削除ボタン直前に「本発注に確定」ボタンを追加
const deleteButton='<button className="danger" type="button" onClick={()=>deletePurchaseOrder(selected.id)}>削除</button>';
const deleteCount=next.split(deleteButton).length-1;
if(deleteCount!==1)fail('プレビュー削除ボタンの検出数が '+deleteCount+' 件です。');
const finalButton=`{selected.status!=='本発注'&&<button className="primary finalOrderConfirmButton" type="button" onClick={()=>finalizePurchaseOrder(selected.id)}>✓ 本発注書にする</button>}${deleteButton}`;
next=next.replace(deleteButton,finalButton);

// 3. プレビューへテンプレート風クラスを追加
const article='<main className="purchaseOrderPreview">{selected?<article>';
if(!next.includes(article))fail('発注書プレビューarticleが見つかりません。');
next=next.replace(article,'<main className="purchaseOrderPreview">{selected?<article className={selected.status===\'本発注\'?\'mcrossFinalOrderDocument\':\'mcrossDraftOrderDocument\'}>');

// 4. ステータス表示の直後に発注種別を表示
const statusSmall="<small>{selected.status||'下書き'}</small>";
if(!next.includes(statusSmall))fail('発注書ステータス表示が見つかりません。');
next=next.replace(statusSmall,"<small>{selected.status||'下書き'}・{selected.orderMode==='material'?'材料発注':'施工発注'}</small>");

// 5. テンプレート風の見た目。既存CSS領域へ追加。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .finalOrderConfirmButton{min-height:40px;padding:7px 12px;border:1px solid #2f7d57;border-radius:9px;background:#2f7d57;color:#fff;font:inherit;font-weight:900}
  .mcrossFinalOrderDocument{position:relative;padding:22px;border:2px solid #59636d;background:#fff;color:#20252a;box-shadow:0 8px 28px rgba(0,0,0,.12)}
  .mcrossFinalOrderDocument::before{content:'発　注　書';display:block;margin:0 0 18px;padding:0 0 12px;border-bottom:3px double #59636d;text-align:center;font-size:26px;font-weight:900;letter-spacing:.28em}
  .mcrossFinalOrderDocument .purchaseOrderPreviewHeader{padding-bottom:12px;border-bottom:1px solid #aeb4b8}
  .mcrossFinalOrderDocument .purchaseOrderPreviewHeader small{display:inline-block;padding:4px 9px;border-radius:999px;background:#2f7d57;color:#fff;font-weight:900}
  .mcrossFinalOrderDocument .purchaseOrderPreviewItems{gap:0;border:1px solid #86919a}
  .mcrossFinalOrderDocument .purchaseOrderPreviewItems section{border:0;border-bottom:1px solid #c4c8cb;border-radius:0;background:#fff}
  .mcrossFinalOrderDocument .purchaseOrderPreviewItems section:last-child{border-bottom:0}
  .mcrossFinalOrderDocument dl{border:1px solid #c4c8cb;padding:10px;background:#f7f9fa}
  @media(max-width:620px){.mcrossFinalOrderDocument{padding:12px}.mcrossFinalOrderDocument::before{font-size:21px;letter-spacing:.16em}.purchaseOrderPreviewHeader>div{min-width:0}.purchaseOrderPreviewHeader .finalOrderConfirmButton,.purchaseOrderPreviewHeader .danger{width:100%}}
  .theme-dark .mcrossFinalOrderDocument,.theme-cyber .mcrossFinalOrderDocument,.theme-luxury .mcrossFinalOrderDocument,.theme-retro .mcrossFinalOrderDocument,.theme-galaxy .mcrossFinalOrderDocument{background:#fff;color:#20252a}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('M-Cross本発注書STEP1の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: M-Cross内完結の本発注書STEP1を適用しました。');
  console.log('・下書きプレビューに「本発注書にする」ボタン');
  console.log('・statusを「本発注」へ更新');
  console.log('・確定時点の明細を保持');
  console.log('・ジュンちゃんのテンプレート構成を意識したM-Cross内表示');
  console.log('・Excelテンプレートは本体として使用しません');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('');
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
