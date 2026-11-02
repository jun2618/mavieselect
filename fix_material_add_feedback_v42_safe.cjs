const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_ADD_FEEDBACK_V42_SAFE';
const backup=file+'.material-add-feedback-v42-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('V42はすでに適用されています。');
if(!original.includes('M-CROSS_MATERIAL_PRICEBOOK_TO_ORDER_AND_BLANK_V38_SAFE'))fail('V38が見つかりません。');
if(!original.includes('materialAddNotice'))fail('V39のmaterialAddNoticeが見つかりません。');
let next=original;

// 「発注書へ追加」という文字列全体ではなく、V38で付けたclassを基準にボタンだけ特定。
const classToken='className="materialPriceBookAddToOrder"';
const classPos=next.indexOf(classToken);
if(classPos<0||next.indexOf(classToken,classPos+classToken.length)>=0)fail('materialPriceBookAddToOrderボタンを一意に特定できません。');
const start=next.lastIndexOf('<button',classPos);
const end=next.indexOf('</button>',classPos);
if(start<0||end<0)fail('発注書追加ボタン範囲を特定できません。');
const oldButton=next.slice(start,end+9);
if(!oldButton.includes('setMaterialOrderItems')||!oldButton.includes('row.name')||!oldButton.includes('row.price'))fail('V38の発注書追加ボタンではありません。');

const newButton=`{/* ${marker} */}<button
                                                type="button"
                                                className={'materialPriceBookAddToOrder'+(materialOrderItems.some(item=>String(item.productCode||'').trim()===String(row.name||'').trim())?' added':'')}
                                                disabled={materialOrderItems.some(item=>String(item.productCode||'').trim()===String(row.name||'').trim())}
                                                onClick={()=>{
                                                  const code=String(row.name||'').trim()
                                                  if(materialOrderItems.some(item=>String(item.productCode||'').trim()===code))return
                                                  setMaterialOrderItems(previous=>[...(Array.isArray(previous)?previous:[]),{
                                                    id:'material-order-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
                                                    materialType:'other',productCode:code,description:String(row.note||''),
                                                    unitPrice:Math.max(0,Number(row.price)||0),quantity:1,unit:String(row.unit||'')
                                                  }])
                                                  setSaveStatus('単価表から発注書へ追加しました')
                                                  setMaterialAddNotice(code+' を追加しました')
                                                  window.setTimeout(()=>setMaterialAddNotice(''),2200)
                                                  window.setTimeout(()=>document.querySelector('.materialOrderQuickSummary')?.scrollIntoView({behavior:'smooth',block:'center'}),80)
                                                }}
                                              >{materialOrderItems.some(item=>String(item.productCode||'').trim()===String(row.name||'').trim())?'✓ 追加済み':'＋ 発注書へ追加'}</button>`;
next=next.slice(0,start)+newButton+next.slice(end+9);

// V39のクイック確認欄が存在することを確認。追加通知はそこに既に表示される。
if(!next.includes('className="materialOrderQuickSummary"'))fail('V39のクイック確認欄が見つかりません。');

const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .materialPriceBookAddToOrder.added,.materialPriceBookAddToOrder:disabled{border-color:#78a98d!important;background:#dff2e6!important;color:#52705e!important;opacity:1!important;cursor:default!important}
  .materialOrderAddNotice{animation:mcrossMaterialNotice .18s ease-out}
  @keyframes mcrossMaterialNotice{from{transform:translateY(-4px);opacity:.25}to{transform:translateY(0);opacity:1}}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('V42の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 材料追加フィードバックV42を適用しました。');
  console.log('・追加直後にクイック確認欄へ移動');
  console.log('・「○○を追加しました」を約2.2秒表示');
  console.log('・ボタンを「✓ 追加済み」に変更');
  console.log('・同じ商品は再クリック不可で重複登録を防止');
  console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
