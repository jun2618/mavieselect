const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-excel-style-order-pricebook-v1';
const mark='M-CROSS_EXCEL_STYLE_ORDER_PRICEBOOK_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: Excel風発注書・単価表V1は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_EDIT_V1_SAFE'))fail('業者編集V1が見つかりません。変更していません。');
if(!s.includes('M-CROSS_ORDER_CREATION_STEP2_V1_SAFE'))fail('発注STEP2が見つかりません。変更していません。');

const stateAnchor="  const [editingContractorId, setEditingContractorId] = useState('')";
const statePos=s.indexOf(stateAnchor);if(statePos<0)fail('業者編集stateを特定できません。');
const memoNeedle='<label className="contractorFormWide"><span>メモ</span>';
const memoPos=s.indexOf(memoNeedle);if(memoPos<0)fail('業者編集メモ欄を特定できません。');
const draftItems='<div className="orderDraftItems">';
const draftPos=s.indexOf(draftItems);if(draftPos<0)fail('発注明細欄を特定できません。');

fs.copyFileSync(p,b);
try{
  // Price-book editor state.
  const states=`\n  /* ${mark} */\n  const [contractorPriceSearch,setContractorPriceSearch]=useState('')\n  const blankPriceRow=()=>({id:'price-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name:'',unit:'',priceType:'fixed',price:'',rate:'',note:''})\n`;
  s=s.slice(0,statePos+stateAnchor.length)+states+s.slice(statePos+stateAnchor.length);

  // Extend edit form load with priceBook if missing.
  const editTail="address:item.address||''";
  const ep=s.indexOf(editTail);
  if(ep<0)throw new Error('業者編集データ読込を特定できません。');
  if(!s.slice(ep,ep+500).includes('priceBook:')) s=s.slice(0,ep+editTail.length)+",priceBook:Array.isArray(item.priceBook)?item.priceBook.map(row=>({...row})):[]"+s.slice(ep+editTail.length);

  // Extend create/reset form shapes.
  s=s.replaceAll("rates:{cross:'',cf:'',soft:'',floorTrim:'',wallBase:'',floorBase:''}}","rates:{cross:'',cf:'',soft:'',floorTrim:'',wallBase:'',floorBase:''},priceBook:[]}");
  s=s.replaceAll("address:''}","address:'',priceBook:[]}");

  // Persist priceBook in contractor values.
  const valuesStart="const values={name,trade:contractorForm.trade||'その他'";
  const vp=s.indexOf(valuesStart);if(vp<0)throw new Error('業者保存valuesを特定できません。');
  const ve=s.indexOf('}',vp);if(ve<0||ve-vp>1600)throw new Error('業者保存values終端を特定できません。');
  let values=s.slice(vp,ve+1);
  if(!values.includes('priceBook:')){
    values=values.slice(0,-1)+",priceBook:(Array.isArray(contractorForm.priceBook)?contractorForm.priceBook:[]).map(row=>({...row,name:String(row.name||'').trim(),unit:String(row.unit||'').trim(),note:String(row.note||'').trim()})).filter(row=>row.name)}";
    s=s.slice(0,vp)+values+s.slice(ve+1);
  }

  // Add free-form price book before memo.
  const mp=s.indexOf(memoNeedle);
  const priceEditor=`{/* ${mark} */}\n                          <section className="contractorPriceBookEditor contractorFormWide">\n                            <div className="priceBookTitle"><div><strong>業者単価表</strong><small>Excelと同じ感覚で品名・単位・単価・掛率・備考を管理</small></div><button type="button" onClick={()=>setContractorForm(previous=>({...previous,priceBook:[...(previous.priceBook||[]),blankPriceRow()]}))}>＋ 行追加</button></div>\n                            <div className="priceBookEditorTable">\n                              <div className="priceBookEditorHead"><span>品名</span><span>単位</span><span>価格方式</span><span>価格</span><span>備考</span><span></span></div>\n                              {(contractorForm.priceBook||[]).map((row,index)=><div className="priceBookEditorRow" key={row.id||index}>\n                                <input value={row.name||''} onChange={event=>setContractorForm(previous=>({...previous,priceBook:(previous.priceBook||[]).map((current,i)=>i===index?{...current,name:event.target.value}:current)}))} placeholder="品名"/>\n                                <input value={row.unit||''} onChange={event=>setContractorForm(previous=>({...previous,priceBook:(previous.priceBook||[]).map((current,i)=>i===index?{...current,unit:event.target.value}:current)}))} placeholder="㎡・m・枚"/>\n                                <select value={row.priceType||'fixed'} onChange={event=>setContractorForm(previous=>({...previous,priceBook:(previous.priceBook||[]).map((current,i)=>i===index?{...current,priceType:event.target.value}:current)}))}><option value="fixed">固定単価</option><option value="rate">掛率</option><option value="unset">未定</option></select>\n                                <input type="number" min="0" step="0.1" value={(row.priceType==='rate'?row.rate:row.price)??''} onChange={event=>setContractorForm(previous=>({...previous,priceBook:(previous.priceBook||[]).map((current,i)=>i===index?{...current,[current.priceType==='rate'?'rate':'price']:event.target.value}:current)}))} placeholder={row.priceType==='rate'?'％':'円'}/>\n                                <input value={row.note||''} onChange={event=>setContractorForm(previous=>({...previous,priceBook:(previous.priceBook||[]).map((current,i)=>i===index?{...current,note:event.target.value}:current)}))} placeholder="備考"/>\n                                <button type="button" className="danger" onClick={()=>setContractorForm(previous=>({...previous,priceBook:(previous.priceBook||[]).filter((_,i)=>i!==index)}))}>×</button>\n                              </div>)}\n                              {(contractorForm.priceBook||[]).length===0&&<p className="empty">単価表は未登録です</p>}\n                            </div>\n                          </section>\n                          `;
  s=s.slice(0,mp)+priceEditor+s.slice(mp);

  // Add price-book pane beside order items inside STEP2.
  const dp=s.indexOf(draftItems);
  const selectedContractorExpr="contractors.find(contractor=>contractor.id===orderDraft.contractorId)";
  const replacement=`<div className="orderExcelWorkspace">\n                        <section className="orderExcelSheet">\n                          <div className="orderExcelSheetTitle"><strong>発 注 書</strong><span>{orderDraft.contractor||'発注先未選択'}</span></div>\n                          <div className="orderExcelHeader"><span>商品名</span><span>数量</span><span>単位</span><span>単価</span><span>金額</span></div>\n                          ${draftItems}`;
  s=s.slice(0,dp)+replacement+s.slice(dp+draftItems.length);
  // Close left section after orderDraftItems closing div, detected before orderDraftFooter.
  const footer=s.indexOf('<div className="orderDraftFooter">',dp);
  if(footer<0)throw new Error('発注フッターを特定できません。');
  const itemsClose=s.lastIndexOf('</div>',footer);
  if(itemsClose<dp)throw new Error('発注明細終了を特定できません。');
  const sidePane=`</section>\n                        <aside className="contractorPriceBookPane">\n                          <div className="priceBookPaneHeader"><div><strong>業者単価表</strong><small>{orderDraft.contractor||'発注先を選択してください'}</small></div><input value={contractorPriceSearch} onChange={event=>setContractorPriceSearch(event.target.value)} placeholder="🔎 品名を検索"/></div>\n                          <div className="priceBookViewHead"><span>品名</span><span>単位</span><span>単価/掛率</span><span>備考</span></div>\n                          <div className="priceBookViewRows">{(((${selectedContractorExpr})?.priceBook)||[]).filter(row=>[row.name,row.unit,row.note].join(' ').toLocaleLowerCase('ja').includes(contractorPriceSearch.trim().toLocaleLowerCase('ja'))).map((row,index)=><div className="priceBookViewRow" key={row.id||index}><strong>{row.name}</strong><span>{row.unit}</span><b>{row.priceType==='rate'?'掛率 '+formatQuantity(row.rate)+'%':row.priceType==='unset'?'未定':formatYen(row.price)}</b><small>{row.note}</small></div>)}</div>\n                          {!(${selectedContractorExpr})&&<p className="empty">発注先を選ぶと単価表を表示します</p>}\n                          {(${selectedContractorExpr})&&!((${selectedContractorExpr})?.priceBook||[]).length&&<p className="empty">この業者の単価表は未登録です</p>}\n                        </aside>\n                      </div>`;
  s=s.slice(0,itemsClose+6)+sidePane+s.slice(itemsClose+6);

  // CSS.
  const cssAnchor='.orderDraftItems{display:grid;gap:12px}';
  if(!s.includes(cssAnchor))throw new Error('発注明細CSS位置を特定できません。');
  const css=`.orderExcelWorkspace{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(340px,.9fr);gap:14px;align-items:start}.orderExcelSheet,.contractorPriceBookPane{border:1px solid #86919a;background:#fff;color:#20252a}.orderExcelSheetTitle{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-bottom:2px solid #59636d;background:#eef1f3}.orderExcelSheetTitle strong{font-size:20px;letter-spacing:.3em}.orderExcelHeader,.priceBookViewHead{display:grid;grid-template-columns:minmax(180px,1fr) 80px 60px 100px 110px;background:#737a80;color:#fff;font-weight:800}.orderExcelHeader span,.priceBookViewHead span{padding:7px;border-right:1px solid #aeb4b8;text-align:center}.orderExcelSheet .orderDraftItems{gap:0}.orderExcelSheet .orderDraftItem{grid-template-columns:minmax(180px,1fr) 80px 60px 100px 110px;gap:0;padding:0;border:0;border-bottom:1px solid #aeb4b8;border-radius:0;background:#fff}.orderExcelSheet .orderDraftItem>strong{padding:8px;border-right:1px solid #aeb4b8}.orderExcelSheet .orderDraftItem>small{grid-column:1;padding:0 8px 7px}.contractorPriceBookPane{position:sticky;top:12px;max-height:80vh;overflow:auto}.priceBookPaneHeader{display:grid;gap:8px;padding:10px;background:#eff3f7;border-bottom:1px solid #86919a}.priceBookPaneHeader input{width:100%;box-sizing:border-box}.priceBookViewHead{grid-template-columns:minmax(160px,1fr) 60px 105px minmax(120px,.8fr)}.priceBookViewRows{display:grid}.priceBookViewRow{display:grid;grid-template-columns:minmax(160px,1fr) 60px 105px minmax(120px,.8fr);border-bottom:1px solid #c4c8cb}.priceBookViewRow>*{padding:7px;border-right:1px solid #c4c8cb}.priceBookViewRow b{text-align:right}.priceBookViewRow small{color:#555}.contractorPriceBookEditor{display:grid;gap:10px;padding:12px;border:1px solid #86919a;border-radius:12px;background:#f7f9fa}.priceBookTitle{display:flex;align-items:center;justify-content:space-between;gap:10px}.priceBookTitle>div{display:grid}.priceBookTitle button{min-height:40px}.priceBookEditorTable{overflow:auto}.priceBookEditorHead,.priceBookEditorRow{display:grid;grid-template-columns:minmax(180px,1.2fr) 70px 100px 100px minmax(140px,1fr) 40px;min-width:720px}.priceBookEditorHead{background:#737a80;color:#fff;font-weight:800}.priceBookEditorHead span,.priceBookEditorRow>*{padding:6px;border:1px solid #c4c8cb}.priceBookEditorRow input,.priceBookEditorRow select{min-width:0;border-radius:0}.priceBookEditorRow .danger{color:#b73f53;background:#fff}@media(max-width:850px){.orderExcelWorkspace{grid-template-columns:1fr}.contractorPriceBookPane{position:static;max-height:none}}@media(max-width:620px){.orderExcelSheet{overflow:auto}.orderExcelHeader,.orderExcelSheet .orderDraftItem{min-width:650px}.contractorPriceBookPane{display:block}.priceBookViewHead,.priceBookViewRow{min-width:620px}.contractorPriceBookPane{overflow:auto}}`;
  s=s.replace(cssAnchor,cssAnchor+css);

  fs.writeFileSync(p,s,'utf8');
  console.log('Excel風の発注書＋業者単価表、および自由編集できる単価表マスターを追加しました。');
  childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: Excel風発注書・業者単価表V1を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1);
}
