const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-separate-service-material-v3';
const mark='M-CROSS_SEPARATE_SERVICE_MATERIAL_V3_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 施工・材料分離V3は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_EDIT_V1_SAFE'))fail('業者編集V1が見つかりません。');
if(!s.includes('M-CROSS_EXCEL_STYLE_ORDER_PRICEBOOK_V1_SAFE'))fail('Excel風発注書V1が見つかりません。');

const tradeLabel='<label><span>業種</span>';
const tradePos=s.indexOf(tradeLabel,s.indexOf('className="contractorForm"'));
if(tradePos<0)fail('業種欄を特定できません。');
const tradeEnd=s.indexOf('</label>',tradePos)+8;
if(tradeEnd<8)fail('業種欄の終了を特定できません。');

const editAnchor="priceBook:Array.isArray(item.priceBook)?item.priceBook.map(row=>({...row})):[]";
if(!s.includes(editAnchor))fail('業者編集時の単価表読込を特定できません。');
const valuesAnchor="const values={name,trade:contractorForm.trade||'その他'";
if(!s.includes(valuesAnchor))fail('業者保存処理を特定できません。');

const workspace='<div className="orderExcelWorkspace">';
const workspacePos=s.indexOf(workspace);
if(workspacePos<0)fail('発注書ワークスペースを特定できません。');
const footerPos=s.indexOf('<div className="orderDraftFooter">',workspacePos);
if(footerPos<0)fail('発注書フッターを特定できません。');

fs.copyFileSync(p,b);
try{
  // 1. Contractor order type in master.
  s=s.replaceAll("priceBook:[]}","priceBook:[],orderMode:'service'}");
  s=s.replace(editAnchor,editAnchor+",orderMode:item.orderMode||(item.trade==='材料'?'material':'service')");

  const vp=s.indexOf(valuesAnchor),ve=s.indexOf('}',vp);
  if(ve<0||ve-vp>2500)throw new Error('業者保存values終了を特定できません。');
  let values=s.slice(vp,ve+1);
  if(!values.includes('orderMode:')){
    values=values.slice(0,-1)+",orderMode:contractorForm.orderMode||'service'}";
    s=s.slice(0,vp)+values+s.slice(ve+1);
  }

  const tp=s.indexOf(tradeLabel,s.indexOf('className="contractorForm"'));
  const te=s.indexOf('</label>',tp)+8;
  const modeField=`\n                          {/* ${mark} */}\n                          <label><span>発注タイプ</span><select value={contractorForm.orderMode||'service'} onChange={event=>setContractorForm(previous=>({...previous,orderMode:event.target.value}))}><option value="service">施工発注</option><option value="material">材料発注</option><option value="both">施工・材料</option></select></label>`;
  s=s.slice(0,te)+modeField+s.slice(te);

  // 2. Contractor selection determines mode. Material mode starts with a blank sheet.
  const selectOld="setOrderDraft(previous => ({...previous,contractor:item.name,contractorId:item.id";
  const selectPos=s.indexOf(selectOld);
  if(selectPos<0)throw new Error('業者選択処理を特定できません。');
  s=s.replace(selectOld,"setOrderDraft(previous => { const mode=item.orderMode||(item.trade==='材料'?'material':'service'); return ({...previous,contractor:item.name,contractorId:item.id,orderMode:mode,serviceItems:previous.serviceItems||previous.items,items:mode==='material'?[{id:'material-'+Date.now(),label:'',memo:'',category:'material',sourceQuantity:0,factor:1,orderQuantity:1,unit:'m',orderRate:'',rate:0,amount:0}]:previous.serviceItems||previous.items");
  // Close new callback before picker close. Existing text ends with items mapping and })).
  const pickerClose='}));setShowContractorPicker(false)';
  const closePos=s.indexOf(pickerClose,selectPos);
  if(closePos<0)throw new Error('業者選択処理の終了を特定できません。');
  s=s.slice(0,closePos)+'}) }));setShowContractorPicker(false)'+s.slice(closePos+pickerClose.length);

  // 3. Wrap workspace in one mode-controlled element, avoiding adjacent JSX.
  const wp=s.indexOf(workspace);
  const fp=s.indexOf('<div className="orderDraftFooter">',wp);
  const wrapperStart=`<div className="orderModeWorkspace">\n                      {orderDraft.orderMode==='material' ? (\n                        <section className="materialOrderWorkspace">\n                          <div className="materialOrderToolbar"><div><strong>材料発注書</strong><small>品番・数量・単位・単価を自由入力。右側の見積品番・CF採寸・業者単価表を参考にします。</small></div><button type="button" onClick={()=>setOrderDraft(previous=>({...previous,items:[...previous.items,{id:'material-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),label:'',memo:'',category:'material',sourceQuantity:0,factor:1,orderQuantity:1,unit:'m',orderRate:'',rate:0,amount:0}]}))}>＋ 空行追加</button></div>\n                          ${workspace}`;
  s=s.slice(0,wp)+wrapperStart+s.slice(wp+workspace.length);
  const fp2=s.indexOf('<div className="orderDraftFooter">',wp);
  if(fp2<0)throw new Error('発注書フッター再検出に失敗しました。');
  // Close material branch, create service branch by reusing a simple table based on current items.
  const branchEnd=`\n                        </section>\n                      ) : (\n                        <section className="serviceOrderWorkspace">\n                          <div className="serviceOrderNotice"><strong>施工発注書</strong><small>見積から選択した施工項目を使用します。</small></div>\n                          <div className="serviceOrderRows">{orderDraft.items.map((item,index)=><div key={item.id+'-'+index}><strong>{item.label}</strong><span>{formatQuantity(item.orderQuantity)}{item.unit}</span><span>{item.orderRate===''||item.orderRate==null?'単価未設定':formatYen(item.orderRate)}</span><b>{item.orderRate===''||item.orderRate==null?'未設定':formatYen((Number(item.orderQuantity)||0)*(Number(item.orderRate)||0))}</b></div>)}</div>\n                        </section>\n                      )}\n                    </div>`;
  s=s.slice(0,fp2)+branchEnd+s.slice(fp2);

  // 4. Material rows are fully editable. Replace product label; quantity/unit/rate already editable in current sheet.
  const strong='<strong>{item.label}</strong>';
  const strongPos=s.indexOf(strong,wp);
  if(strongPos<0||strongPos>fp2)throw new Error('材料発注の商品名セルを特定できません。');
  const editable=`{item.category==='material'?<div className="materialProductCell"><input value={item.label} onChange={event=>setOrderDraft(previous=>({...previous,items:previous.items.map((current,i)=>i===itemIndex?{...current,label:event.target.value}:current)}))} placeholder="品番・商品名"/><button type="button" onClick={()=>setOrderDraft(previous=>({...previous,items:previous.items.filter((_,i)=>i!==itemIndex)}))}>×</button></div>:<strong>{item.label}</strong>}`;
  s=s.slice(0,strongPos)+editable+s.slice(strongPos+strong.length);

  // 5. Add reference panes for material workflow before contractor price book.
  const pricePane='<aside className="contractorPriceBookPane">';
  const pp=s.indexOf(pricePane,wp);
  if(pp<0)throw new Error('業者単価表ペインを特定できません。');
  const reference=`<aside className="materialReferencePane">\n                          <details open><summary>今回の見積・品番</summary><div className="materialReferenceRows">{orderCandidateRows.filter(row=>row.category==='cross').map((row,index)=><button type="button" key={'ref-'+index} onClick={()=>setOrderDraft(previous=>({...previous,items:[...previous.items,{id:'material-ref-'+Date.now()+'-'+index,label:(Array.isArray(row.parts)?row.parts[0]:'')||'',memo:row.memo||'',category:'material',sourceQuantity:Number(row.quantity||0),factor:1,orderQuantity:Number(row.quantity||0),unit:'m',orderRate:'',rate:0,amount:0}]}))}><strong>{(Array.isArray(row.parts)?row.parts[0]:'')||'品番未入力'}</strong><span>{formatQuantity(row.quantity)}m</span><small>{row.label}</small></button>)}</div></details>\n                          <details><summary>CF採寸データ</summary><div className="cfReferenceRows">{cfRecords.map((row,index)=><div key={row.id||index}><strong>{row.room}</strong><span>{Number(row.length||0).toFixed(2)}m × {row.count}本</span><small>{row.memo||''}</small></div>)}</div></details>\n                        </aside>\n                        `;
  s=s.slice(0,pp)+reference+s.slice(pp);

  // 6. Save order mode if STEP3 exists.
  const snapshot='contractorId:orderDraft.contractorId||\'\',contractorName';
  if(s.includes(snapshot))s=s.replace(snapshot,"orderMode:orderDraft.orderMode||'service',contractorId:orderDraft.contractorId||'',contractorName");

  // CSS.
  const cssAnchor='.orderExcelWorkspace{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(340px,.9fr);gap:14px;align-items:start}';
  if(!s.includes(cssAnchor))throw new Error('発注ワークスペースCSSを特定できません。');
  const css=`.orderModeWorkspace{display:block}.materialOrderToolbar,.serviceOrderNotice{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid #86919a;background:#eef1f3;color:#20252a}.materialOrderToolbar>div,.serviceOrderNotice{display:grid}.materialOrderToolbar button{min-height:42px;border:1px solid #6e91e8;border-radius:9px;background:#6e91e8;color:#fff;font:inherit;font-weight:800}.materialOrderWorkspace .orderExcelWorkspace{grid-template-columns:minmax(620px,1.2fr) minmax(280px,.65fr) minmax(340px,.85fr)}.materialProductCell{display:grid;grid-template-columns:minmax(0,1fr) 34px;gap:5px;padding:6px}.materialProductCell input{min-width:0}.materialProductCell button{border:0;border-radius:7px;background:#f5e9ed;color:#b73f53;font-weight:900}.materialReferencePane{display:grid;gap:10px}.materialReferencePane details{border:1px solid #86919a;background:#fff}.materialReferencePane summary{padding:9px;background:#eef1f3;font-weight:900;cursor:pointer}.materialReferenceRows,.cfReferenceRows{display:grid;max-height:330px;overflow:auto}.materialReferenceRows button,.cfReferenceRows>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px;padding:8px;border:0;border-bottom:1px solid #c4c8cb;background:#fff;color:#20252a;text-align:left;font:inherit}.materialReferenceRows button:hover{background:#edf2ff}.materialReferenceRows small,.cfReferenceRows small{grid-column:1/-1;color:#666}.serviceOrderRows{display:grid;border:1px solid #86919a}.serviceOrderRows>div{display:grid;grid-template-columns:minmax(240px,1fr) 100px 110px 120px;gap:0}.serviceOrderRows>div>*{padding:8px;border-right:1px solid #c4c8cb;border-bottom:1px solid #c4c8cb}.serviceOrderRows b{text-align:right}@media(max-width:1100px){.materialOrderWorkspace .orderExcelWorkspace{grid-template-columns:1fr}.materialReferencePane,.contractorPriceBookPane{position:static}}@media(max-width:620px){.materialOrderToolbar{align-items:stretch;flex-direction:column}.materialOrderToolbar button{width:100%}.serviceOrderRows{overflow:auto}.serviceOrderRows>div{min-width:650px}}`;
  s=s.replace(cssAnchor,cssAnchor+css);

  fs.writeFileSync(p,s,'utf8');
  console.log('施工発注と材料発注を完全分離しました。材料発注は空表＋参考情報方式です。');
  childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 施工・材料発注完全分離V3を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1);
}
