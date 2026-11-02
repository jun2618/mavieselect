const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_ORDER_LIKE_SERVICE_V45_SAFE';
const backup=file+'.material-like-service-v45-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('材料発注上部表示V45はすでに適用されています。');
if(!original.includes('M-CROSS_MATERIAL_PRICEBOOK_TO_ORDER_AND_BLANK_V38_SAFE'))fail('V38が見つかりません。');
if(!original.includes('materialOrderItems'))fail('材料発注明細stateが見つかりません。');

let next=original;

// 材料発注画面内の単価表表示位置を探し、その直前へ施工発注と同様の上部プレビューを置く。
const materialStart=next.indexOf("purchaseOrderBranch === 'material'");
if(materialStart<0)fail('材料発注画面が見つかりません。');

const priceBookCandidates=[
  '{showMaterialPriceBook&&',
  '{showMaterialPriceBook &&',
  "{showMaterialPriceBook ?"
];
let insertPos=-1;
for(const token of priceBookCandidates){
  const pos=next.indexOf(token,materialStart);
  if(pos>=0){insertPos=pos;break}
}
if(insertPos<0){
  const titlePos=next.indexOf('単価表</strong>',materialStart);
  if(titlePos>=0)insertPos=next.lastIndexOf('<',titlePos);
}
if(insertPos<0)fail('材料単価表の表示開始位置が見つかりません。');

const preview=`{/* ${marker} */}
                        <section className="materialOrderTopPreview" aria-label="材料発注書プレビュー">
                          <header>
                            <div><strong>発　注　書</strong><small>材料</small></div>
                            <span>{materialSupplierId?(contractors.find(item=>item.id===materialSupplierId)?.name||'発注先未設定'):'発注先未設定'}</span>
                          </header>
                          {materialOrderItems.length===0?
                            <p className="empty">商品を単価表から追加するか、空の発注書を作成してください。</p>
                            :<div className="materialOrderTopRows">
                              {materialOrderItems.map((item,index)=><article key={(item.id||'top-item')+'-'+index} className="materialOrderTopRow">
                                <div><strong>{item.productCode||'商品名未入力'}</strong><small>{item.description||''}</small></div>
                                <span>{formatQuantity(Number(item.quantity)||0)}{item.unit||''}</span>
                                <span>{item.unitPrice===''||item.unitPrice==null?'単価未設定':formatYen(Number(item.unitPrice)||0)}</span>
                                <b>{item.unitPrice===''||item.unitPrice==null?'未設定':formatYen((Number(item.quantity)||0)*(Number(item.unitPrice)||0))}</b>
                              </article>)}
                            </div>
                          }
                          <footer>
                            <span>{materialOrderItems.length}件</span>
                            <strong>{formatYen((materialOrderItems||[]).reduce((sum,item)=>sum+((item.unitPrice===''||item.unitPrice==null)?0:(Number(item.quantity)||0)*(Number(item.unitPrice)||0)),0))}</strong>
                            <button type="button" onClick={()=>document.querySelector('.materialOrderMobileHeading')?.scrollIntoView({behavior:'smooth',block:'start'})}>数量・単価を編集</button>
                          </footer>
                          {materialAddNotice&&<div className="materialOrderTopNotice">✓ {materialAddNotice}</div>}
                        </section>
                        `;
next=next.slice(0,insertPos)+preview+next.slice(insertPos);

// V43の追加後強制スクロールは停止。上部プレビューが即時更新されるため不要。
next=next.replace(/\s*window\.setTimeout\(\(\)=>document\.querySelector\('\.materialOrderMobileHeading'\)\?\.scrollIntoView\(\{behavior:'smooth',block:'start'\}\),120\)/,'');

// V39の追従クイック表示は上部プレビューと役割が重なるため非表示にする。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .materialOrderQuickSummary{display:none!important}
  .materialOrderTopPreview{display:grid;gap:10px;margin:12px 0 16px;border:1px solid #8493a0;background:#fff;color:#222}
  .materialOrderTopPreview>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-bottom:1px solid #8493a0;background:#edf1f4}
  .materialOrderTopPreview>header>div{display:flex;align-items:center;gap:9px}.materialOrderTopPreview>header strong{font-size:19px;letter-spacing:.18em}.materialOrderTopPreview>header small{color:#68737d;font-weight:900}.materialOrderTopPreview>header>span{font-weight:900;text-align:right}
  .materialOrderTopPreview>.empty{margin:0;padding:18px;text-align:center}
  .materialOrderTopRows{display:grid}.materialOrderTopRow{display:grid;grid-template-columns:minmax(0,1fr) 100px 120px 125px;gap:8px;align-items:center;padding:10px 13px;border-bottom:1px solid #d6dadd}.materialOrderTopRow:last-child{border-bottom:0}.materialOrderTopRow>div{display:grid;min-width:0}.materialOrderTopRow small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#777}.materialOrderTopRow>span,.materialOrderTopRow>b{text-align:right}
  .materialOrderTopPreview>footer{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 13px;border-top:1px solid #8493a0;background:#f7f8f9}.materialOrderTopPreview>footer>strong{text-align:right;color:#d84d83;font-size:18px}.materialOrderTopPreview>footer button{min-height:38px;padding:6px 11px;border:1px solid #59636d;border-radius:8px;background:#59636d;color:#fff;font:inherit;font-weight:900}
  .materialOrderTopNotice{margin:0 10px 10px;padding:8px 10px;border-radius:8px;background:#dff7e9;color:#226443;font-weight:900;text-align:center}
  @media(max-width:620px){.materialOrderTopPreview{margin:8px 0 12px}.materialOrderTopPreview>header{align-items:flex-start;flex-direction:column}.materialOrderTopPreview>header>span{text-align:left}.materialOrderTopRow{grid-template-columns:minmax(0,1fr) auto;gap:5px 10px}.materialOrderTopRow>div{grid-column:1/-1}.materialOrderTopRow>span{text-align:left}.materialOrderTopRow>b{text-align:right}.materialOrderTopPreview>footer{grid-template-columns:1fr auto}.materialOrderTopPreview>footer button{grid-column:1/-1;width:100%}.materialMobilePanel{padding-bottom:18px!important}}
  .theme-dark .materialOrderTopPreview,.theme-cyber .materialOrderTopPreview,.theme-luxury .materialOrderTopPreview,.theme-retro .materialOrderTopPreview,.theme-galaxy .materialOrderTopPreview{background:#071522;color:#fff}.theme-dark .materialOrderTopPreview>header,.theme-dark .materialOrderTopPreview>footer,.theme-cyber .materialOrderTopPreview>header,.theme-cyber .materialOrderTopPreview>footer,.theme-luxury .materialOrderTopPreview>header,.theme-luxury .materialOrderTopPreview>footer,.theme-retro .materialOrderTopPreview>header,.theme-retro .materialOrderTopPreview>footer,.theme-galaxy .materialOrderTopPreview>header,.theme-galaxy .materialOrderTopPreview>footer{background:#101b27}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('V45の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 材料発注を施工発注と同じ上部発注書方式へ変更しました。');
  console.log('・発注先の下に材料発注書を常時表示');
  console.log('・単価表から追加すると上部発注書へ即時反映');
  console.log('・追加後の強制スクロールを停止');
  console.log('・件数/合計/追加完了を上部で確認');
  console.log('・数量・単価を編集ボタンで詳細明細へ移動');
  console.log('・スマホも上部発注書を全幅表示');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
