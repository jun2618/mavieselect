const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_SERVICE_PRICEBOOK_STEP2_SAFE';
const backup=file+'.service-pricebook-step2-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('施工単価表STEP2はすでに適用されています。');
let next=original;

// state
const stateAnchor="const [contractorPriceSearch,setContractorPriceSearch]=useState('')";
if(!next.includes(stateAnchor))fail('contractorPriceSearch state が見つかりません。');
next=next.replace(stateAnchor,stateAnchor+"\n  /* "+marker+" */\n  const [showServicePriceBook,setShowServicePriceBook]=useState(false)\n  const [showServicePriceAdd,setShowServicePriceAdd]=useState(false)\n  const [servicePriceAddForm,setServicePriceAddForm]=useState({name:'',unit:'m²',price:''})");

// 発注先選択の直後へボタンを追加
const pickerEnd=`                      </section>
                      {(() => {`;
if(!next.includes(pickerEnd))fail('発注先選択欄の終了位置が見つかりません。');
const serviceToolbar=`                      </section>
                      {(orderDraft.orderMode||'service')==='service' && orderDraft.contractorId && (
                        <section className="servicePriceBookToolbar">
                          <button type="button" onClick={()=>setShowServicePriceBook(previous=>!previous)}>
                            {showServicePriceBook?'施工単価表を閉じる':'施工単価表を見る'}
                          </button>
                        </section>
                      )}
                      {(() => {`;
next=next.replace(pickerEnd,serviceToolbar);

// 既存右側単価表paneを施工では非表示、表示時だけ別途下へ出す
const paneStart='<aside className="contractorPriceBookPane">';
const panePos=next.indexOf(paneStart);
if(panePos<0)fail('既存の業者単価表paneが見つかりません。');
let depth=0,end=-1;
const tokenRe=/<aside\b|<\/aside>/g;
tokenRe.lastIndex=panePos;
let m;
while((m=tokenRe.exec(next))){
  if(m[0].startsWith('</')) depth--; else depth++;
  if(depth===0){end=tokenRe.lastIndex;break;}
}
if(end<0)fail('業者単価表paneの終了位置を特定できません。');
const oldPane=next.slice(panePos,end);
const wrappedPane=`{(orderDraft.orderMode||'service')!=='service' && (${oldPane})}`;
next=next.slice(0,panePos)+wrappedPane+next.slice(end);

// 施工専用の直接編集単価表を orderExcelWorkspace の後ろへ追加
const workspaceCloseNeedle='                        </div>\n                      </div><div className="orderDraftFooter">';
if(!next.includes(workspaceCloseNeedle))fail('orderExcelWorkspace終了位置が見つかりません。');
const servicePriceBook=`                        </div>

                      {(orderDraft.orderMode||'service')==='service' && showServicePriceBook && orderDraft.contractorId && (()=>{
                        const supplier=contractors.find(item=>item.id===orderDraft.contractorId)
                        if(!supplier)return null
                        const priceBook=Array.isArray(supplier.priceBook)?supplier.priceBook:[]
                        return <section className="serviceInlinePriceBook">
                          <div className="serviceInlinePriceBookHeader">
                            <div><strong>{supplier.name} 施工単価表</strong><small>確認用。発注書の施工単価には自動反映しません。</small></div>
                            <button type="button" onClick={()=>setShowServicePriceAdd(previous=>!previous)}>＋ 項目追加</button>
                          </div>
                          {showServicePriceAdd&&<div className="servicePriceAddRow">
                            <label><span>施工項目</span><input value={servicePriceAddForm.name} onChange={e=>setServicePriceAddForm(p=>({...p,name:e.target.value}))}/></label>
                            <label><span>単位</span><input value={servicePriceAddForm.unit} onChange={e=>setServicePriceAddForm(p=>({...p,unit:e.target.value}))}/></label>
                            <label><span>単価</span><input type="number" min="0" step="1" value={servicePriceAddForm.price} onChange={e=>setServicePriceAddForm(p=>({...p,price:e.target.value}))}/></label>
                            <button type="button" className="primary" onClick={()=>{
                              const name=String(servicePriceAddForm.name||'').trim();if(!name){window.alert('施工項目を入力してください。');return}
                              const row={id:'service-price-'+Date.now(),name,unit:String(servicePriceAddForm.unit||'').trim(),priceType:'fixed',price:servicePriceAddForm.price===''?'':Math.max(0,Number(servicePriceAddForm.price)||0),rate:'',note:'',referenceOnly:false}
                              saveContractors(contractors.map(current=>current.id===supplier.id?{...current,priceBook:[...(Array.isArray(current.priceBook)?current.priceBook:[]),row],updatedAt:new Date().toISOString()}:current))
                              setServicePriceAddForm({name:'',unit:'m²',price:''});setShowServicePriceAdd(false)
                            }}>追加して保存</button>
                          </div>}
                          <div className="servicePriceRows">
                            {priceBook.length===0?<p className="empty">施工単価表は未登録です。</p>:priceBook.map((row,index)=><div className="servicePriceRow" key={row.id||index}>
                              <strong>{row.name||''}</strong>
                              <span>{row.unit||''}</span>
                              {row.priceType==='rate'?<span>掛率 {formatQuantity(Number(row.rate||0))}%</span>:<label><input type="number" min="0" step="1" value={row.price??''} onChange={event=>{
                                const value=event.target.value
                                const nextPriceBook=priceBook.map((current,rowIndex)=>rowIndex===index?{...current,priceType:'fixed',price:value===''?'':Math.max(0,Number(value)||0),rate:''}:current)
                                saveContractors(contractors.map(current=>current.id===supplier.id?{...current,priceBook:nextPriceBook,updatedAt:new Date().toISOString()}:current))
                              }}/><b>円</b></label>}
                              <button type="button" className="danger" onClick={()=>{
                                if(!window.confirm(String(row.name||'')+'を施工単価表から削除しますか？'))return
                                const nextPriceBook=priceBook.filter((_,rowIndex)=>rowIndex!==index)
                                saveContractors(contractors.map(current=>current.id===supplier.id?{...current,priceBook:nextPriceBook,updatedAt:new Date().toISOString()}:current))
                              }}>削除</button>
                            </div>)}
                          </div>
                        </section>
                      })()}
                      </div><div className="orderDraftFooter">`;
next=next.replace(workspaceCloseNeedle,servicePriceBook);

// CSS
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .servicePriceBookToolbar{display:flex;justify-content:flex-end;margin:-4px 0 2px}.servicePriceBookToolbar button{min-height:42px;padding:8px 12px;border:1px solid #6e91e8;border-radius:10px;background:#fff;color:#5b6270;font:inherit;font-weight:800}
  .serviceInlinePriceBook{display:grid;gap:10px;padding:12px;border:1px solid #86919a;border-radius:12px;background:#f7f9fa;color:#20252a}.serviceInlinePriceBookHeader{display:flex;align-items:center;justify-content:space-between;gap:10px}.serviceInlinePriceBookHeader>div{display:grid}.serviceInlinePriceBookHeader small{color:#67717a}.serviceInlinePriceBookHeader button{min-height:40px}.servicePriceAddRow{display:grid;grid-template-columns:minmax(180px,1fr) 90px 120px auto;gap:8px;align-items:end}.servicePriceAddRow label{margin:0}.servicePriceRows{display:grid;gap:7px}.servicePriceRow{display:grid;grid-template-columns:minmax(180px,1fr) 70px minmax(120px,.7fr) auto;align-items:center;gap:8px;padding:9px;border:1px solid #c4c8cb;border-radius:9px;background:#fff}.servicePriceRow label{display:flex;align-items:center;gap:4px;margin:0}.servicePriceRow input{width:92px;min-width:0}.servicePriceRow .danger{min-height:36px;padding:6px 9px}
  @media(max-width:620px){.servicePriceBookToolbar{justify-content:stretch}.servicePriceBookToolbar button{width:100%}.serviceInlinePriceBookHeader{align-items:stretch;flex-direction:column}.serviceInlinePriceBookHeader button{width:100%}.servicePriceAddRow{grid-template-columns:1fr 1fr}.servicePriceAddRow label:first-child{grid-column:1/-1}.servicePriceAddRow button{grid-column:1/-1}.servicePriceRow{grid-template-columns:minmax(0,1fr) auto;gap:6px}.servicePriceRow>strong{grid-column:1/-1}.servicePriceRow label{justify-content:flex-end}.servicePriceRow .danger{width:auto}.serviceInlinePriceBook{padding:9px}}
  .theme-dark .serviceInlinePriceBook,.theme-cyber .serviceInlinePriceBook,.theme-luxury .serviceInlinePriceBook,.theme-retro .serviceInlinePriceBook,.theme-galaxy .serviceInlinePriceBook{background:rgba(5,12,24,.88);color:#f3ffff}.theme-dark .servicePriceRow,.theme-cyber .servicePriceRow,.theme-luxury .servicePriceRow,.theme-retro .servicePriceRow,.theme-galaxy .servicePriceRow{background:rgba(5,12,24,.75);color:#f3ffff}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('施工単価表STEP2の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{cp.execSync('npm run build',{stdio:'inherit',shell:true});console.log('');console.log('OK: 施工単価表STEP2を適用しました。');console.log('・右側の業者単価表を施工時は非表示');console.log('・施工単価表を見る/閉じるボタンを追加');console.log('・施工単価をその場で編集');console.log('・項目追加/削除');console.log('・発注書への自動反映はしません');console.log('・材料発注は変更していません');console.log('BACKUP: '+backup);}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
