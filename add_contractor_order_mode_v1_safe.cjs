const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-contractor-order-mode-v1';
const mark='M-CROSS_CONTRACTOR_ORDER_MODE_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 発注タイプV1は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_EDIT_V1_SAFE'))fail('業者編集V1が見つかりません。変更していません。');
if(!s.includes('M-CROSS_EXCEL_STYLE_ORDER_PRICEBOOK_V1_SAFE'))fail('Excel風発注書・単価表V1が見つかりません。変更していません。');

const tradeLabel='<label><span>業種</span>';
const tradePos=s.indexOf(tradeLabel,s.indexOf('className="contractorForm"'));
if(tradePos<0)fail('業種入力欄を特定できません。');
const tradeEnd=s.indexOf('</label>',tradePos)+8;
if(tradeEnd<8)fail('業種入力欄の終了を特定できません。');
const editTail="priceBook:Array.isArray(item.priceBook)?item.priceBook.map(row=>({...row})):[]";
if(!s.includes(editTail))fail('業者編集時の単価表読込を特定できません。');
const valuesStart="const values={name,trade:contractorForm.trade||'その他'";
const valuesPos=s.indexOf(valuesStart);
if(valuesPos<0)fail('業者保存処理を特定できません。');

fs.copyFileSync(p,b);
try{
  // 1) Add order mode to all new/reset form shapes.
  s=s.replaceAll("priceBook:[]}","priceBook:[],orderMode:'service'}");

  // 2) Load existing contractor mode. Default material for 材料 trade, otherwise service.
  s=s.replace(editTail,editTail+",orderMode:item.orderMode||(item.trade==='材料'?'material':'service')");

  // 3) Persist order mode in values object, structurally before its closing brace.
  const vp=s.indexOf(valuesStart),ve=s.indexOf('}',vp);
  if(ve<0||ve-vp>2200)throw new Error('業者保存values終了を特定できません。');
  let values=s.slice(vp,ve+1);
  if(!values.includes('orderMode:')){
    values=values.slice(0,-1)+",orderMode:contractorForm.orderMode||'service'}";
    s=s.slice(0,vp)+values+s.slice(ve+1);
  }

  // 4) Add mode selector after trade.
  const tp=s.indexOf(tradeLabel,s.indexOf('className="contractorForm"'));
  const te=s.indexOf('</label>',tp)+8;
  const modeUi=`\n                          {/* ${mark} */}\n                          <label className="contractorOrderModeField"><span>発注タイプ</span><select value={contractorForm.orderMode||'service'} onChange={event=>setContractorForm(previous=>({...previous,orderMode:event.target.value}))}><option value="service">施工</option><option value="material">材料</option><option value="both">施工・材料</option></select></label>`;
  s=s.slice(0,te)+modeUi+s.slice(te);

  // 5) When selecting a contractor, copy mode to order draft.
  const selection="contractor:item.name,contractorId:item.id,items:previous.items.map";
  if(!s.includes(selection))throw new Error('業者選択処理を特定できません。');
  s=s.replace(selection,"contractor:item.name,contractorId:item.id,orderMode:item.orderMode||(item.trade==='材料'?'material':'service'),items:previous.items.map");

  // 6) Material mode toolbar above Excel workspace.
  const workspace='<div className="orderExcelWorkspace">';
  const wp=s.indexOf(workspace);
  if(wp<0)throw new Error('Excel風発注ワークスペースを特定できません。');
  const materialTools=`{/* ${mark} */}\n                      {(orderDraft.orderMode==='material'||orderDraft.orderMode==='both')&&<section className="materialOrderToolbar">\n                        <div><strong>材料発注モード</strong><small>商品名・数量・単位・単価をExcel感覚で直接入力</small></div>\n                        <button type="button" onClick={()=>setOrderDraft(previous=>({...previous,items:[...previous.items,{id:'material-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),label:'',memo:'',category:'material',sourceQuantity:0,factor:1,orderQuantity:1,unit:'m',orderRate:'',rate:0,amount:0}]}))}>＋ 商品行を追加</button>\n                      </section>\n                      `;
  s=s.slice(0,wp)+materialTools+s.slice(wp);

  // 7) Material rows: make product name editable and allow removing the row.
  const orderStrong='<strong>{item.label}</strong>';
  if(!s.includes(orderStrong))throw new Error('発注明細の商品名表示を特定できません。');
  s=s.replace(orderStrong,`{item.category==='material'?<div className="materialProductCell"><input value={item.label} onChange={event=>setOrderDraft(previous=>({...previous,items:previous.items.map((current,index)=>index===itemIndex?{...current,label:event.target.value}:current)}))} placeholder="例：LB-9882"/><button type="button" onClick={()=>setOrderDraft(previous=>({...previous,items:previous.items.filter((_,index)=>index!==itemIndex)}))}>×</button></div>:<strong>{item.label}</strong>}`);

  // Unit must be editable for material rows.
  const quantityField='<label className="orderQuantityField"><span>発注数量</span><input type="number" min="0" step="0.1" value={item.orderQuantity}';
  const qfp=s.indexOf(quantityField);
  if(qfp<0)throw new Error('発注数量入力欄を特定できません。');
  const qfEnd=s.indexOf('</label>',qfp)+8;
  const qf=s.slice(qfp,qfEnd);
  const qfNew=qf.replace('<b>{item.unit}</b>',`{item.category==='material'?<input className="materialUnitInput" value={item.unit} onChange={event=>setOrderDraft(previous=>({...previous,items:previous.items.map((current,index)=>index===itemIndex?{...current,unit:event.target.value}:current)}))} placeholder="単位"/>:<b>{item.unit}</b>}`);
  s=s.slice(0,qfp)+qfNew+s.slice(qfEnd);

  // 8) Click a fixed-price reference row to copy product/unit/price into the first blank material row.
  const priceRow='<div className="priceBookViewRow" key={row.id||index}>';
  if(!s.includes(priceRow))throw new Error('右側単価表の行を特定できません。');
  s=s.replace(priceRow,`<button type="button" className="priceBookViewRow" key={row.id||index} onClick={()=>{\n                            if(row.priceType!=='fixed')return\n                            setOrderDraft(previous=>{\n                              let applied=false\n                              const items=previous.items.map(item=>{if(applied||item.category!=='material'||String(item.label||'').trim())return item;applied=true;return {...item,label:row.name||'',unit:row.unit||item.unit,orderRate:row.price===''?'':Number(row.price||0)}})\n                              return {...previous,items:applied?items:[...items,{id:'material-'+Date.now(),label:row.name||'',memo:'',category:'material',sourceQuantity:0,factor:1,orderQuantity:1,unit:row.unit||'',orderRate:row.price===''?'':Number(row.price||0),rate:0,amount:0}]}\n                            })\n                          }}>`);
  s=s.replace('</div>)}</div>\n                          {!(',`</button>)}</div>\n                          {!(`);

  // 9) Snapshot mode/type and product data are already stored in items; add orderMode if STEP3 exists.
  const snapshotContractor="contractorId:orderDraft.contractorId||'',contractorName";
  if(s.includes(snapshotContractor))s=s.replace(snapshotContractor,"orderMode:orderDraft.orderMode||'service',contractorId:orderDraft.contractorId||'',contractorName");

  // CSS.
  const cssAnchor='.orderExcelWorkspace{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(340px,.9fr);gap:14px;align-items:start}';
  if(!s.includes(cssAnchor))throw new Error('Excel風発注CSS位置を特定できません。');
  const css=`.materialOrderToolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid #86919a;background:#eef1f3;color:#20252a}.materialOrderToolbar>div{display:grid}.materialOrderToolbar button{min-height:42px;border:1px solid #6e91e8;border-radius:9px;background:#6e91e8;color:#fff;font:inherit;font-weight:800}.materialProductCell{display:grid;grid-template-columns:minmax(0,1fr) 34px;gap:5px;padding:6px}.materialProductCell input{min-width:0}.materialProductCell button{border:0;border-radius:7px;background:#f5e9ed;color:#b73f53;font-weight:900}.materialUnitInput{width:100%;min-width:0;text-align:center}.priceBookViewRow{width:100%;padding:0;border:0;border-bottom:1px solid #c4c8cb;background:#fff;color:#20252a;text-align:left;font:inherit;cursor:pointer}.priceBookViewRow:hover,.priceBookViewRow:focus-visible{background:#edf2ff;outline:2px solid #6e91e8;outline-offset:-2px}.contractorOrderModeField{margin:0}@media(max-width:620px){.materialOrderToolbar{align-items:stretch;flex-direction:column}.materialOrderToolbar button{width:100%}}`;
  s=s.replace(cssAnchor,cssAnchor+css);

  fs.writeFileSync(p,s,'utf8');
  console.log('施工・材料・両方の発注タイプと、材料発注のExcel風直接入力を追加しました。');
  childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 発注タイプ・材料発注V1を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1);
}
