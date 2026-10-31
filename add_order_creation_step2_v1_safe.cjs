const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-order-creation-step2-v1';
const mark='M-CROSS_ORDER_CREATION_STEP2_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 発注STEP2 V1は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_ORDER_SELECTION_STEP1_V4_STRUCTURAL_SAFE'))fail('発注選択STEP1 V4が見つかりません。変更していません。');

// 1. State: append beside STEP1 temporary selection state.
const state="  const [selectedOrderKeys, setSelectedOrderKeys] = useState([])";
const statePos=s.indexOf(state);
if(statePos<0)fail('selectedOrderKeys stateが見つかりません。');

// 2. Locate STEP1 toolbar and its create button structurally.
const panelStart='<section className="orderSelectionPanel" aria-label="発注項目の選択">';
const ps=s.indexOf(panelStart);
if(ps<0)fail('発注選択パネルが見つかりません。');
const createText='📦 選択した項目から発注書を作成';
const ct=s.indexOf(createText,ps);
if(ct<0)fail('STEP1作成ボタンが見つかりません。');
const buttonStart=s.lastIndexOf('<button',ct);
const buttonEnd=s.indexOf('</button>',ct)+9;
if(buttonStart<ps||buttonEnd<9)fail('STEP1作成ボタン範囲を特定できません。');

// 3. Locate panel end for modal insertion.
const panelEnd=s.indexOf('</section>',buttonEnd)+10;
if(panelEnd<10)fail('発注選択パネル終了位置を特定できません。');

fs.copyFileSync(p,b);
try{
  s=s.slice(0,statePos+state.length)+`\n  /* ${mark} */\n  const [orderDraft, setOrderDraft] = useState(null)`+s.slice(statePos+state.length);

  // Re-find after state insertion.
  const ps2=s.indexOf(panelStart), ct2=s.indexOf(createText,ps2), bs2=s.lastIndexOf('<button',ct2), be2=s.indexOf('</button>',ct2)+9;
  if(ps2<0||ct2<0||bs2<ps2||be2<9)throw new Error('作成ボタンの再特定に失敗しました。');

  const newButton=`<button className="primary" type="button" disabled={selectedOrderKeys.length===0} onClick={() => {\n                      const selected=orderCandidateRows.filter((row,index)=>selectedOrderKeys.includes(orderKeyForRow(row,index)))\n                      const items=selected.map((row,index)=>({\n                        id: orderKeyForRow(row,index),\n                        label: row.label || (Array.isArray(row.parts) ? row.parts.filter(Boolean).join(' ') : '発注明細'),\n                        memo: String(row.memo || ''),\n                        sourceQuantity: Number(row.quantity || 0),\n                        unit: String(row.unit || ''),\n                        factor: 1,\n                        orderQuantity: Number(row.quantity || 0),\n                        rate: Number(row.rate || 0),\n                        amount: Number(row.amount || 0),\n                        category: row.category || '',\n                      }))\n                      setOrderDraft({ contractor:'', items })\n                    }}>📦 選択した項目から発注書を作成</button>`;
  s=s.slice(0,bs2)+newButton+s.slice(be2);

  // Insert STEP2 editor immediately after selection panel.
  const pe=s.indexOf('</section>',s.indexOf(panelStart))+10;
  if(pe<10)throw new Error('発注選択パネル終了位置の再特定に失敗しました。');
  const editor=`\n                  {orderDraft && (\n                    <section className="orderDraftPanel" aria-label="発注書作成 STEP2">\n                      <div className="orderDraftHeader">\n                        <div><small>ORDER STEP 2</small><h3>発注先・掛率・発注数量</h3></div>\n                        <button type="button" onClick={() => setOrderDraft(null)}>× 閉じる</button>\n                      </div>\n                      <label className="orderContractorField">\n                        <span>発注先</span>\n                        <input value={orderDraft.contractor} onChange={event => setOrderDraft(previous => ({...previous, contractor:event.target.value}))} placeholder="例：インテリアヒサスエ" />\n                      </label>\n                      <div className="orderDraftItems">\n                        {orderDraft.items.map((item,itemIndex) => (\n                          <article className="orderDraftItem" key={item.id + '-' + itemIndex}>\n                            <strong>{item.label}</strong>\n                            {item.memo && <small>{item.memo}</small>}\n                            <div className="orderSourceQuantity"><span>見積数量</span><b>{formatQuantity(item.sourceQuantity)}{item.unit}</b></div>\n                            <div className="orderFactorButtons" aria-label="発注掛率">\n                              {[1,0.9,0.85].map(value => <button type="button" key={value} className={item.factor===value?'active':''} onClick={() => setOrderDraft(previous => ({...previous, items:previous.items.map((current,index) => index===itemIndex ? {...current, factor:value, orderQuantity:Math.round(current.sourceQuantity*value*10)/10} : current)}))}>×{value.toFixed(2)}</button>)}\n                            </div>\n                            <label className="orderQuantityField"><span>発注数量</span><input type="number" min="0" step="0.1" value={item.orderQuantity} onChange={event => { const value=Math.max(0,Number(event.target.value)||0); setOrderDraft(previous => ({...previous, items:previous.items.map((current,index) => index===itemIndex ? {...current, orderQuantity:value} : current)})) }} /><b>{item.unit}</b></label>\n                          </article>\n                        ))}\n                      </div>\n                      <div className="orderDraftFooter">\n                        <span>{orderDraft.items.length}項目</span>\n                        <button className="primary" type="button" onClick={() => window.alert('STEP2の入力内容を確認しました。次のSTEPで発注書として保存します。')}>内容を確認して次へ</button>\n                      </div>\n                    </section>\n                  )}`;
  s=s.slice(0,pe)+editor+s.slice(pe);

  // CSS.
  const cssAnchor='  .orderSelectionPanel{display:grid;gap:12px;margin:14px 0 20px;padding:14px;border:1px solid rgba(110,145,232,.42);border-radius:16px;background:rgba(110,145,232,.08)}';
  if(!s.includes(cssAnchor))throw new Error('STEP1 CSS位置が見つかりません。');
  const css=`\n  .orderDraftPanel{display:grid;gap:14px;margin:16px 0 22px;padding:16px;border:2px solid rgba(99,190,161,.55);border-radius:18px;background:rgba(99,190,161,.08)}.orderDraftHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}.orderDraftHeader h3{margin:2px 0 0}.orderDraftHeader>button{min-height:40px;padding:6px 12px;border:0;border-radius:10px;background:#806f7e;color:#fff;font:inherit;font-weight:800}.orderContractorField{margin:0}.orderContractorField input{width:100%;box-sizing:border-box}.orderDraftItems{display:grid;gap:12px}.orderDraftItem{display:grid;gap:9px;padding:13px;border:1px solid rgba(99,190,161,.42);border-radius:14px;background:rgba(255,255,255,.78)}.orderDraftItem small{color:#756a78}.orderSourceQuantity,.orderDraftFooter{display:flex;align-items:center;justify-content:space-between;gap:10px}.orderFactorButtons{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.orderFactorButtons button{min-height:42px;border:1px solid rgba(110,145,232,.5);border-radius:10px;background:#fff;color:#5b6270;font:inherit;font-weight:800}.orderFactorButtons button.active{background:#6e91e8;color:#fff}.orderQuantityField{display:grid;grid-template-columns:auto minmax(90px,1fr) auto;align-items:center;gap:8px;margin:0}.orderQuantityField input{text-align:right}.orderDraftFooter{padding-top:4px}.theme-dark .orderDraftPanel,.theme-cyber .orderDraftPanel,.theme-luxury .orderDraftPanel,.theme-retro .orderDraftPanel,.theme-galaxy .orderDraftPanel{background:rgba(5,12,24,.8)}.theme-dark .orderDraftItem,.theme-cyber .orderDraftItem,.theme-luxury .orderDraftItem,.theme-retro .orderDraftItem,.theme-galaxy .orderDraftItem{background:rgba(5,12,24,.72)}.theme-dark .orderFactorButtons button,.theme-cyber .orderFactorButtons button,.theme-luxury .orderFactorButtons button,.theme-retro .orderFactorButtons button,.theme-galaxy .orderFactorButtons button{background:rgba(5,12,24,.9);color:#efffff}.theme-dark .orderFactorButtons button.active,.theme-cyber .orderFactorButtons button.active,.theme-luxury .orderFactorButtons button.active,.theme-retro .orderFactorButtons button.active,.theme-galaxy .orderFactorButtons button.active{background:#6e91e8;color:#fff}@media(max-width:520px){.orderDraftFooter{align-items:stretch;flex-direction:column}.orderDraftFooter .primary{width:100%}}`;
  s=s.replace(cssAnchor,cssAnchor+css);

  fs.writeFileSync(p,s,'utf8');
  console.log('発注STEP2（発注先・掛率・発注数量）を追加しました。自動ビルド確認を行います。');
  childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 発注STEP2 V1を適用しました。正式保存はまだ行いません。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
