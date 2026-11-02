const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const marker='M-CROSS_EASY_ORDER_ENTRY_V1_SAFE';
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const old=`                  {/* M-CROSS_COST_BUTTON_IN_PROJECT_V75_SAFE */}<button type="button" className="primary" style={{width:"100%",minHeight:"52px",marginBottom:"12px",fontWeight:900}} onClick={()=>setShowCostCalculation(true)}>💰 この物件の原価計算</button><section className="orderSelectionPanel" aria-label="発注項目の選択">
                    <strong>📦 発注する項目を選択</strong>
                    <div className="orderSelectionQuickButtons">
                      <button type="button" className="orderQuickPrimary" onClick={() => setSelectedOrderKeys(finishContractorKeys)}>クロス・CF・巾木を一括選択</button>


                      <button type="button" onClick={() => setSelectedOrderKeys([])}>クリア</button>
                    </div>`;
if(!s.includes(old)){console.error('ERROR: かんたん発注の入口位置が現在コードと一致しません。変更していません。');process.exit(1)}
const neu=`                  {/* M-CROSS_COST_BUTTON_IN_PROJECT_V75_SAFE */}<button type="button" className="primary" style={{width:"100%",minHeight:"52px",marginBottom:"12px",fontWeight:900}} onClick={()=>setShowCostCalculation(true)}>💰 この物件の原価計算</button><section className="orderSelectionPanel easyOrderPanel" aria-label="かんたん発注">
                    {/* ${marker} */}
                    <div className="easyOrderHero"><div><small>SMART ORDER</small><strong>📦 かんたん発注</strong><span>普段は「内装工事をまとめる → 職人を選ぶ → 発注書作成」だけ</span></div></div>
                    <section className="easyOrderPrimaryCard"><div><small>👷 施工発注</small><strong>内装工事をまとめて発注</strong><span>クロス・CF・巾木など ${'${'}finishContractorKeys.length}項目</span></div><button type="button" className="orderQuickPrimary easyOrderMainButton" onClick={() => { setSelectedOrderKeys(finishContractorKeys); const items=orderCandidateRows.filter((row,index)=>finishContractorKeys.includes(orderKeyForRow(row,index))).map((row,index)=>({id:row.id||('order-'+Date.now()+'-'+index),label:row.label||row.parts?.filter(Boolean).join(' ')||'工事項目',parts:Array.isArray(row.parts)?[0,1,2,3].map(i=>String(row.parts[i]||'')):[],memo:row.memo||'',sourceQuantity:Number(row.quantity||0),factor:1,orderQuantity:Number(row.quantity||0),unit:row.unit||'',rate:Number(row.rate||0),amount:Number(row.amount||0),orderRate:'',category:row.category||''})); setPendingPurchaseOrderItems(items); setPurchaseOrderBranch('select'); }}>職人を選んでまとめて発注 →</button></section>
                    <details className="easyOrderDetails"><summary>内容を確認・個別変更</summary><div className="orderSelectionQuickButtons"><button type="button" onClick={() => setSelectedOrderKeys(finishContractorKeys)}>内装工事を全部選択</button><button type="button" onClick={() => setSelectedOrderKeys([])}>クリア</button></div></details>`;
s=s.replace(old,neu);
const cssAnchor='  .orderSelectionPanel{display:grid;gap:12px;margin:14px 0 20px;padding:14px;border:1px solid rgba(110,145,232,.42);border-radius:16px;background:rgba(110,145,232,.08)}';
if(!s.includes(cssAnchor)){console.error('ERROR: 発注CSS位置が見つかりません。変更していません。');process.exit(1)}
const css=`  /* ${marker} */\n  .easyOrderPanel{gap:10px!important}.easyOrderHero{display:flex;align-items:center;justify-content:space-between;gap:10px}.easyOrderHero>div{display:grid;gap:2px}.easyOrderHero small{font-size:10px;font-weight:900;letter-spacing:.16em;opacity:.68}.easyOrderHero strong{font-size:20px}.easyOrderHero span{font-size:12px;opacity:.75}.easyOrderPrimaryCard{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.7fr);gap:10px;align-items:center;padding:13px;border:1px solid rgba(99,190,161,.5);border-radius:14px;background:rgba(99,190,161,.1)}.easyOrderPrimaryCard>div{display:grid;gap:3px}.easyOrderPrimaryCard small{font-weight:900}.easyOrderPrimaryCard strong{font-size:17px}.easyOrderPrimaryCard span{font-size:12px;opacity:.75}.easyOrderMainButton{min-height:50px!important}.easyOrderDetails{border:1px solid rgba(110,145,232,.3);border-radius:11px;background:rgba(255,255,255,.45)}.easyOrderDetails summary{padding:11px 12px;font-weight:900;cursor:pointer}.easyOrderDetails>div{padding:0 11px 11px}@media(max-width:620px){.easyOrderPanel{padding:10px!important;margin:8px 0 12px!important}.easyOrderHero span{display:none}.easyOrderPrimaryCard{grid-template-columns:1fr;padding:11px}.easyOrderMainButton{width:100%;min-height:54px!important}.easyOrderDetails summary{min-height:44px;display:flex;align-items:center}}\n`;
s=s.replace(cssAnchor,css+cssAnchor);
fs.copyFileSync(p,'./src/App.before_easy_order_entry_v1.jsx');
fs.writeFileSync(p,s,'utf8');
console.log('OK: かんたん発注の入口を追加しました。既存の詳細発注機能は残しています。');
