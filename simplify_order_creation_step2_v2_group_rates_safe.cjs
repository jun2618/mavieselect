const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-order-step2-group-rates-v2';
const mark='M-CROSS_ORDER_STEP2_GROUP_RATES_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: STEP2グループ掛率V2は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_ORDER_CREATION_STEP2_V1_SAFE'))fail('STEP2 V1が見つかりません。変更していません。');

const panelStart='<section className="orderDraftPanel" aria-label="発注書作成 STEP2">';
const ps=s.indexOf(panelStart);
if(ps<0)fail('STEP2パネル開始を特定できません。');
// balance nested section tags to find this panel end.
let cursor=ps,depth=0,end=-1;
while(cursor<s.length){
 const nextOpen=s.indexOf('<section',cursor), nextClose=s.indexOf('</section>',cursor);
 if(nextClose<0)break;
 if(nextOpen>=0&&nextOpen<nextClose){depth++;cursor=nextOpen+8;continue;}
 depth--;cursor=nextClose+10;if(depth===0){end=cursor;break;}
}
if(end<0)fail('STEP2パネル終了を特定できません。');

const panel=`<section className="orderDraftPanel" aria-label="発注書作成 STEP2">\n                      {/* ${mark} */}\n                      <div className="orderDraftHeader">\n                        <div><small>ORDER STEP 2</small><h3>発注先・発注掛率</h3></div>\n                        <button type="button" onClick={() => setOrderDraft(null)}>× 閉じる</button>\n                      </div>\n                      <label className="orderContractorField"><span>発注先</span><input value={orderDraft.contractor} onChange={event => setOrderDraft(previous => ({...previous,contractor:event.target.value}))} placeholder="例：インテリアヒサスエ" /></label>\n                      {(() => {\n                        const applyGroupFactor=(category,value)=>setOrderDraft(previous=>({...previous,items:previous.items.map(item=>item.category===category?{...item,factor:value,orderQuantity:Math.round(item.sourceQuantity*value*10)/10}:item)}))\n                        const crossItems=orderDraft.items.filter(item=>item.category==='cross')\n                        const cfItems=orderDraft.items.filter(item=>item.category==='cf')\n                        const crossFactor=crossItems[0]?.factor ?? 1\n                        const cfFactor=cfItems[0]?.factor ?? 1\n                        return <>\n                          {crossItems.length>0&&<div className="orderGroupRate"><div><strong>クロス</strong><small>{crossItems.length}項目を一括変更</small></div><div className="orderFactorButtons">{[1,0.9,0.85].map(value=><button type="button" key={value} className={crossFactor===value?'active':''} onClick={()=>applyGroupFactor('cross',value)}>×{value.toFixed(2)}</button>)}</div></div>}\n                          {cfItems.length>0&&<div className="orderGroupRate"><div><strong>CF</strong><small>{cfItems.length}項目を一括変更</small></div><div className="orderFactorButtons">{[1,0.9,0.85].map(value=><button type="button" key={value} className={cfFactor===value?'active':''} onClick={()=>applyGroupFactor('cf',value)}>×{value.toFixed(2)}</button>)}</div></div>}\n                        </>\n                      })()}\n                      <div className="orderDraftItems">\n                        {orderDraft.items.map((item,itemIndex)=><article className="orderDraftItem" key={item.id+'-'+itemIndex}>\n                          <strong>{item.label}</strong>{item.memo&&<small>{item.memo}</small>}\n                          <div className="orderQuantityCompare"><span>見積 {formatQuantity(item.sourceQuantity)}{item.unit}</span><b>→ 発注 {formatQuantity(item.orderQuantity)}{item.unit}</b></div>\n                          {!['cross','cf'].includes(item.category)&&<label className="orderQuantityField"><span>発注数量</span><input type="number" min="0" step="0.1" value={item.orderQuantity} onChange={event=>{const value=Math.max(0,Number(event.target.value)||0);setOrderDraft(previous=>({...previous,items:previous.items.map((current,index)=>index===itemIndex?{...current,orderQuantity:value}:current)}))}}/><b>{item.unit}</b></label>}\n                        </article>)}\n                      </div>\n                      <div className="orderDraftFooter"><span>{orderDraft.items.length}項目</span><button className="primary" type="button" onClick={()=>window.alert('STEP2の入力内容を確認しました。次のSTEPで発注書として保存します。')}>内容を確認して次へ</button></div>\n                    </section>`;

fs.copyFileSync(p,b);
try{
 s=s.slice(0,ps)+panel+s.slice(end);
 // add only supplementary CSS, preserving STEP2 base CSS.
 const cssAnchor='.orderDraftItems{display:grid;gap:12px}';
 if(!s.includes(cssAnchor))throw new Error('STEP2 CSS位置が見つかりません。');
 s=s.replace(cssAnchor,cssAnchor+`.orderGroupRate{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,.8fr);align-items:center;gap:12px;padding:13px;border:1px solid rgba(110,145,232,.42);border-radius:14px;background:rgba(255,255,255,.72)}.orderGroupRate>div:first-child{display:grid;gap:2px}.orderGroupRate small{color:#756a78}.orderQuantityCompare{display:flex;align-items:center;justify-content:space-between;gap:10px}.orderQuantityCompare b{color:#d84d83}@media(max-width:520px){.orderGroupRate{grid-template-columns:1fr}}`);
 fs.writeFileSync(p,s,'utf8');
 console.log('STEP2をクロス/CF別の一括掛率方式へ変更しました。');
 childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: STEP2グループ掛率V2を適用しました。');
 console.log('クロス掛率とCF掛率は別々に一括設定できます。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
