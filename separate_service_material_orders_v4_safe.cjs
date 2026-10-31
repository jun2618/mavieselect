const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-separate-service-material-v4';
const mark='M-CROSS_SEPARATE_SERVICE_MATERIAL_V4_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 施工・材料分離V4は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_EDIT_V1_SAFE'))fail('業者編集V1が見つかりません。');
if(!s.includes('M-CROSS_EXCEL_STYLE_ORDER_PRICEBOOK_V1_SAFE'))fail('Excel風発注書V1が見つかりません。');
if(s.includes('M-CROSS_SEPARATE_SERVICE_MATERIAL_V3_SAFE'))fail('V3の変更が残っています。先にApp.jsxの状態を確認してください。');

const formMark='className="contractorForm"';
const fp=s.indexOf(formMark);
const trade=s.indexOf('<label><span>業種</span>',fp);
const tradeEnd=s.indexOf('</label>',trade)+8;
if(fp<0||trade<0||tradeEnd<8)fail('業者編集フォームの業種欄を特定できません。');

const editAnchor="priceBook:Array.isArray(item.priceBook)?item.priceBook.map(row=>({...row})):[]";
if(!s.includes(editAnchor))fail('業者編集時の単価表読込を特定できません。');
const valuesAnchor="const values={name,trade:contractorForm.trade||'その他'";
if(!s.includes(valuesAnchor))fail('業者保存処理を特定できません。');
const workspace='<div className="orderExcelWorkspace">';
if(!s.includes(workspace))fail('Excel風発注書ワークスペースを特定できません。');
const selectNeedle='setOrderDraft(previous => ({...previous,contractor:item.name,contractorId:item.id';
if(!s.includes(selectNeedle))fail('業者選択処理を特定できません。');

fs.copyFileSync(p,b);
try{
  // 1) Contractor master: order type.
  s=s.replaceAll("priceBook:[]}","priceBook:[],orderMode:'service'}");
  s=s.replace(editAnchor,editAnchor+",orderMode:item.orderMode||(item.trade==='材料'?'material':'service')");
  let vp=s.indexOf(valuesAnchor),ve=s.indexOf('}',vp);
  if(ve<0||ve-vp>2600)throw new Error('業者保存valuesの終端を特定できません。');
  let values=s.slice(vp,ve+1);
  if(!values.includes('orderMode:')){
    values=values.slice(0,-1)+",orderMode:contractorForm.orderMode||'service'}";
    s=s.slice(0,vp)+values+s.slice(ve+1);
  }
  const fp2=s.indexOf(formMark),tr=s.indexOf('<label><span>業種</span>',fp2),te=s.indexOf('</label>',tr)+8;
  s=s.slice(0,te)+`\n                          {/* ${mark} */}\n                          <label><span>発注タイプ</span><select value={contractorForm.orderMode||'service'} onChange={event=>setContractorForm(previous=>({...previous,orderMode:event.target.value}))}><option value="service">施工発注</option><option value="material">材料発注</option><option value="both">施工・材料</option></select></label>`+s.slice(te);

  // 2) On contractor selection: only set the mode. Keep existing items intact until user explicitly switches to blank material sheet.
  s=s.replace(selectNeedle,"setOrderDraft(previous => ({...previous,contractor:item.name,contractorId:item.id,orderMode:item.orderMode||(item.trade==='材料'?'material':'service')");

  // 3) Material toolbar before existing workspace. No wrapping/re-parenting of current JSX.
  const wp=s.indexOf(workspace);
  const toolbar=`{/* ${mark} */}\n                      {(orderDraft.orderMode==='material'||orderDraft.orderMode==='both')&&<section className="materialOrderToolbar">\n                        <div><strong>材料発注</strong><small>見積明細とは別に、品番・数量・単位・単価を自由入力します。</small></div>\n                        <div className="materialOrderToolbarButtons">\n                          <button type="button" onClick={()=>setOrderDraft(previous=>({...previous,items:[{id:'material-'+Date.now(),label:'',memo:'',category:'material',sourceQuantity:0,factor:1,orderQuantity:1,unit:'m',orderRate:'',rate:0,amount:0}]}))}>空の発注書にする</button>\n                          <button type="button" onClick={()=>setOrderDraft(previous=>({...previous,items:[...previous.items,{id:'material-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),label:'',memo:'',category:'material',sourceQuantity:0,factor:1,orderQuantity:1,unit:'m',orderRate:'',rate:0,amount:0}]}))}>＋ 空行追加</button>\n                        </div>\n                      </section>}\n                      `;
  s=s.slice(0,wp)+toolbar+s.slice(wp);

  // 4) Make product name editable for material rows only.
  const strong='<strong>{item.label}</strong>';
  const sp=s.indexOf(strong,wp);
  if(sp<0)throw new Error('発注明細の商品名を特定できません。');
  const editable=`{item.category==='material'?<div className="materialProductCell"><input value={item.label} onChange={event=>setOrderDraft(previous=>({...previous,items:previous.items.map((current,i)=>i===itemIndex?{...current,label:event.target.value}:current)}))} placeholder="品番・商品名"/><button type="button" onClick={()=>setOrderDraft(previous=>({...previous,items:previous.items.filter((_,i)=>i!==itemIndex)}))}>×</button></div>:<strong>{item.label}</strong>}`;
  s=s.slice(0,sp)+editable+s.slice(sp+strong.length);

  // 5) Reference information: insert above the existing contractor price book, without changing workspace hierarchy.
  const pricePane='<aside className="contractorPriceBookPane">';
  const pp=s.indexOf(pricePane,wp);
  if(pp<0)throw new Error('業者単価表ペインを特定できません。');
  const refs=`{(orderDraft.orderMode==='material'||orderDraft.orderMode==='both')&&<aside className="materialReferencePane">\n                          <details open><summary>今回の見積・品番</summary><div className="materialReferenceRows">{orderCandidateRows.filter(row=>row.category==='cross').map((row,index)=><div key={'cross-ref-'+index}><strong>{(Array.isArray(row.parts)&&row.parts[0])||'品番未入力'}</strong><span>{formatQuantity(row.quantity)}m</span><small>{row.label}</small></div>)}</div></details>\n                          <details><summary>CF採寸データ</summary><div className="cfReferenceRows">{cfRecords.map((row,index)=><div key={row.id||index}><strong>{row.room}</strong><span>{Number(row.length||0).toFixed(2)}m × {row.count}本</span><small>{row.memo||''}</small></div>)}</div></details>\n                        </aside>}\n                        `;
  s=s.slice(0,pp)+refs+s.slice(pp);

  // 6) Carry order mode into saved snapshot where STEP3 is installed.
  const snap="contractorId:orderDraft.contractorId||'',contractorName";
  if(s.includes(snap))s=s.replace(snap,"orderMode:orderDraft.orderMode||'service',contractorId:orderDraft.contractorId||'',contractorName");

  // 7) CSS only. No DOM hierarchy changes.
  const cssAnchor='.orderExcelWorkspace{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(340px,.9fr);gap:14px;align-items:start}';
  if(!s.includes(cssAnchor))throw new Error('発注書CSS位置を特定できません。');
  const css=`.materialOrderToolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;padding:11px 12px;border:1px solid #86919a;background:#eef1f3;color:#20252a}.materialOrderToolbar>div:first-child{display:grid}.materialOrderToolbarButtons{display:flex;gap:8px}.materialOrderToolbar button{min-height:42px;border:1px solid #6e91e8;border-radius:9px;background:#6e91e8;color:#fff;font:inherit;font-weight:800}.materialProductCell{display:grid;grid-template-columns:minmax(0,1fr) 34px;gap:5px;padding:6px}.materialProductCell input{min-width:0}.materialProductCell button{border:0;border-radius:7px;background:#f5e9ed;color:#b73f53;font-weight:900}.materialReferencePane{display:grid;gap:10px}.materialReferencePane details{border:1px solid #86919a;background:#fff;color:#20252a}.materialReferencePane summary{padding:9px;background:#eef1f3;font-weight:900;cursor:pointer}.materialReferenceRows,.cfReferenceRows{display:grid;max-height:300px;overflow:auto}.materialReferenceRows>div,.cfReferenceRows>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px;padding:8px;border-bottom:1px solid #c4c8cb}.materialReferenceRows small,.cfReferenceRows small{grid-column:1/-1;color:#666}@media(max-width:850px){.materialOrderToolbar{align-items:stretch;flex-direction:column}.materialOrderToolbarButtons{display:grid;grid-template-columns:1fr 1fr}.materialReferencePane{order:2}}@media(max-width:520px){.materialOrderToolbarButtons{grid-template-columns:1fr}}`;
  s=s.replace(cssAnchor,cssAnchor+css);

  fs.writeFileSync(p,s,'utf8');
  console.log('施工発注は既存見積連携を維持し、材料発注は空表＋参考情報方式を追加しました。');
  childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 施工・材料発注分離V4を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1);
}
