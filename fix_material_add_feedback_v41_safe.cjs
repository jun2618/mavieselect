const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_ADD_FEEDBACK_V41_SAFE';
const backup=file+'.material-add-feedback-v41-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('材料追加フィードバックV41はすでに適用されています。');
if(!original.includes('M-CROSS_MATERIAL_PRICEBOOK_TO_ORDER_AND_BLANK_V38_SAFE'))fail('V38が見つかりません。');
let next=original;

// 現在のV38「発注書へ追加」ボタンを実コードからピンポイント特定。
const text='発注書へ追加';
const textPos=next.indexOf(text);
if(textPos<0||next.indexOf(text,textPos+text.length)>=0)fail('「発注書へ追加」を一意に特定できません。');
const start=next.lastIndexOf('<button',textPos);
const end=next.indexOf('</button>',textPos);
if(start<0||end<0)fail('発注書へ追加ボタン範囲を特定できません。');
const oldButton=next.slice(start,end+9);
if(!oldButton.includes('row.name')||!oldButton.includes('setMaterialOrderItems'))fail('V38の発注書追加ボタンではありません。');

const newButton=`{/* ${marker} */}<button
                                                type="button"
                                                className={'materialPriceBookAddToOrder'+(materialOrderItems.some(item=>String(item.productCode||'').trim()===String(row.name||'').trim())?' added':'')}
                                                disabled={materialOrderItems.some(item=>String(item.productCode||'').trim()===String(row.name||'').trim())}
                                                onClick={()=>{
                                                  const code=String(row.name||'').trim()
                                                  if(materialOrderItems.some(item=>String(item.productCode||'').trim()===code)){
                                                    setMaterialAddNotice(code+' は追加済みです')
                                                    window.setTimeout(()=>setMaterialAddNotice(''),1800)
                                                    return
                                                  }
                                                  setMaterialOrderItems(previous=>[...(Array.isArray(previous)?previous:[]),{
                                                    id:'material-order-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
                                                    materialType:'other',
                                                    productCode:code,
                                                    description:String(row.note||''),
                                                    unitPrice:Math.max(0,Number(row.price)||0),
                                                    quantity:1,
                                                    unit:String(row.unit||'')
                                                  }])
                                                  setSaveStatus('単価表から発注書へ追加しました')
                                                  setMaterialAddNotice(code+' を追加しました')
                                                  window.setTimeout(()=>setMaterialAddNotice(''),1800)
                                                  window.setTimeout(()=>document.querySelector('.materialOrderQuickSummary')?.scrollIntoView({behavior:'smooth',block:'nearest'}),50)
                                                }}
                                              >{materialOrderItems.some(item=>String(item.productCode||'').trim()===String(row.name||'').trim())?'✓ 追加済み':'＋ 発注書へ追加'}</button>`;
next=next.slice(0,start)+newButton+next.slice(end+9);

// クイック確認が無い環境でも、追加直後の通知を単価表近くで見せる。
const priceBookTitle='泰平建材株式会社 単価表';
// supplier名は動的なので、単価表アクション列直前に汎用通知を追加。
const priceBookAction='<div style={{display:\'flex\',gap:\'5px\',flexWrap:\'wrap\'}}>';
const actionPos=next.indexOf(priceBookAction);
if(actionPos>=0){
  next=next.slice(0,actionPos)+`{materialAddNotice&&<div className="materialAddInlineNotice">✓ {materialAddNotice}</div>}`+next.slice(actionPos);
}

const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .materialPriceBookAddToOrder.added,.materialPriceBookAddToOrder:disabled{border-color:#78a98d!important;background:#e5f3ea!important;color:#537260!important;cursor:default!important;opacity:1!important}
  .materialAddInlineNotice{flex:1 1 100%;margin:2px 0 4px;padding:6px 8px;border-radius:7px;background:#dff7e9;color:#226443;font-size:12px;font-weight:900}
  .materialOrderQuickSummary{scroll-margin-top:12px}
  @media(max-width:620px){.materialAddInlineNotice{position:sticky;bottom:72px;z-index:10;text-align:center}}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('V41の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 材料追加フィードバックV41を適用しました。');
  console.log('・追加直後に「✓ ○○を追加しました」を表示');
  console.log('・追加した商品はボタンが「✓ 追加済み」に変わり再クリック不可');
  console.log('・同じ品番の連打による重複登録を防止');
  console.log('・PCではクイック確認欄が見える位置へ軽くスクロール');
  console.log('・スマホでは下部クイックバーで件数/合計を確認可能');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
