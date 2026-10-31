const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-order-selection-step1-v1';
const mark='M-CROSS_ORDER_SELECTION_STEP1_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 発注選択STEP1 V1は適用済みです。');process.exit(0)}

// State: anchor around estimate state so we don't hit other list-selection states.
const estimateState="  const [estimateEdits, setEstimateEdits] = useState({})";
const st=s.indexOf(estimateState);
if(st<0)fail('estimateEdits stateが見つかりません。変更していません。');

// Estimate IIFE anchors confirmed from current code.
const totalLine='              const totalAmount = estimateRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) + additionalWorkTotal';
const totalPos=s.indexOf(totalLine,st);
if(totalPos<0)fail('見積画面のtotalAmount位置が見つかりません。');

const cardStart='                <section className="card">';
const cardPos=s.indexOf(cardStart,totalPos);
if(cardPos<0||cardPos-totalPos>1500)fail('見積カード開始位置を特定できません。');

// Row renderer exact start from current UTF-8 snippet.
const rowMap='                        {section.rows.map((row, index) => (';
const rowMapPos=s.indexOf(rowMap,cardPos);
if(rowMapPos<0)fail('見積行mapを特定できません。');
const rowDiv='                          <div\n                            className="estimateRow estimateRowTapEdit"';
const rowDivPos=s.indexOf(rowDiv,rowMapPos);
if(rowDivPos<0||rowDivPos-rowMapPos>500)fail('見積行divを特定できません。');

fs.copyFileSync(p,b);
try{
  // 1. Temporary selection state only. It is deliberately not persisted.
  s=s.slice(0,st+estimateState.length)+`\n  /* ${mark} */\n  const [selectedOrderKeys, setSelectedOrderKeys] = useState([])`+s.slice(st+estimateState.length);

  // Re-find total line after state insertion and add candidate helpers inside the estimate render scope.
  let tp=s.indexOf(totalLine);
  const helpers=`\n              const orderKeyForRow = (row, index = 0) => row.exclusionKey || (row.category === 'additionalWork' ? 'additionalWork:' + (row.additionalWorkId || row.additionalWorkIndex ?? index) : estimateEditKey(row))\n              const orderCandidateRows = [\n                ...estimateRows,\n                ...visibleAdditionalWorks.map((item, index) => ({\n                  exclusionKey: 'additionalWork:' + (item.id || index),\n                  category: 'additionalWork',\n                  additionalWorkId: item.id || '',\n                  additionalWorkIndex: index,\n                  parts: Array.isArray(item.estimateParts) && item.estimateParts.length ? [0,1,2,3].map(i => String(item.estimateParts[i] || '')) : [item.room || '', '', item.work || '', ''],\n                  label: (Array.isArray(item.estimateParts) && item.estimateParts.length ? item.estimateParts : [item.room,item.work]).filter(Boolean).join(' '),\n                  memo: item.memo || '',\n                  quantity: Number(item.quantity || 0), unit: item.unit || '式', rate: Number(item.unitPrice || 0), amount: Number(item.amount || (Number(item.quantity)||0)*(Number(item.unitPrice)||0)),\n                }))\n              ]\n              const allOrderKeys = orderCandidateRows.map((row,index) => orderKeyForRow(row,index))\n              const interiorOrderKeys = orderCandidateRows.map((row,index) => ({ row, key: orderKeyForRow(row,index) })).filter(({row}) => ['cross','cf','soft','floorTrim'].includes(row.category)).map(({key}) => key)\n              const additionalOrderKeys = orderCandidateRows.map((row,index) => ({ row, key: orderKeyForRow(row,index) })).filter(({row}) => row.category === 'additionalWork').map(({key}) => key)\n`;
  s=s.slice(0,tp+totalLine.length)+helpers+s.slice(tp+totalLine.length);

  // 2. Add quick selection box right after the estimate heading line, before existing restoration action.
  const headingNeedle="                  <h2>{selectedProperty?.name} {unit}号室{openedEstimateVersion ? estimateVersionMark(openedEstimateVersion) : ''}</h2>";
  let hp=s.indexOf(headingNeedle,tp);
  if(hp<0)throw new Error('見積見出し位置が見つかりません。');
  const toolbar=`\n                  <section className="orderSelectionPanel" aria-label="発注項目の選択">\n                    <strong>📦 発注する項目を選択</strong>\n                    <div className="orderSelectionQuickButtons">\n                      <button type="button" onClick={() => setSelectedOrderKeys(allOrderKeys)}>すべて選択</button>\n                      <button type="button" onClick={() => setSelectedOrderKeys(interiorOrderKeys)}>内装工事を選択</button>\n                      <button type="button" onClick={() => setSelectedOrderKeys(additionalOrderKeys)}>その他工事を選択</button>\n                      <button type="button" onClick={() => setSelectedOrderKeys([])}>選択解除</button>\n                    </div>\n                    <div className="orderSelectionSummary"><span>選択中</span><strong>{selectedOrderKeys.length}件</strong></div>\n                    <button className="primary" type="button" disabled={selectedOrderKeys.length === 0} onClick={() => {\n                      const selected = orderCandidateRows.filter((row,index) => selectedOrderKeys.includes(orderKeyForRow(row,index)))\n                      console.log('M-Cross order selection STEP1', selected)\n                      window.alert('発注候補を' + selected.length + '件選択しました。次のSTEPで発注先・掛率・発注数量を設定します。')\n                    }}>📦 選択した項目から発注書を作成</button>\n                  </section>`;
  s=s.slice(0,hp+headingNeedle.length)+toolbar+s.slice(hp+headingNeedle.length);

  // 3. Insert checkbox into every estimate row. stopPropagation prevents opening the row editor.
  let rm=s.indexOf(rowMap,hp);
  let rd=s.indexOf(rowDiv,rm);
  if(rm<0||rd<0)throw new Error('見積行位置の再特定に失敗しました。');
  const openingEnd=s.indexOf('                          >',rd);
  if(openingEnd<0||openingEnd-rd>1800)throw new Error('見積行div開始タグの終了を特定できません。');
  const checkbox=`\n                            <input\n                              className="orderSelectCheckbox"\n                              type="checkbox"\n                              checked={selectedOrderKeys.includes(orderKeyForRow(row, index))}\n                              onClick={event => event.stopPropagation()}\n                              onChange={event => {\n                                const key = orderKeyForRow(row, index)\n                                setSelectedOrderKeys(previous => event.target.checked ? [...new Set([...previous, key])] : previous.filter(value => value !== key))\n                              }}\n                              aria-label={(row.label || '見積項目') + 'を発注対象に選択'}\n                            />`;
  s=s.slice(0,openingEnd+'                          >'.length)+checkbox+s.slice(openingEnd+'                          >'.length);

  // 4. CSS only for the new STEP1 UI.
  const cssAnchor='  .measurementActions { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; margin:16px 0 20px; }';
  if(!s.includes(cssAnchor))throw new Error('CSS挿入位置が見つかりません。');
  const css=`\n  .orderSelectionPanel{display:grid;gap:12px;margin:14px 0 20px;padding:14px;border:1px solid rgba(110,145,232,.42);border-radius:16px;background:rgba(110,145,232,.08)}\n  .orderSelectionQuickButtons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.orderSelectionQuickButtons button{min-height:44px;border:1px solid rgba(110,145,232,.5);border-radius:11px;background:#fff;color:#5b6270;font:inherit;font-weight:800}.orderSelectionSummary{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.72)}\n  .estimateRowTapEdit{grid-template-columns:auto minmax(0,1fr) auto auto auto}.orderSelectCheckbox{width:24px;height:24px;margin:0;accent-color:#6e91e8;align-self:center}.theme-dark .orderSelectionPanel,.theme-cyber .orderSelectionPanel,.theme-luxury .orderSelectionPanel,.theme-retro .orderSelectionPanel,.theme-galaxy .orderSelectionPanel{background:rgba(5,12,24,.72)}.theme-dark .orderSelectionQuickButtons button,.theme-cyber .orderSelectionQuickButtons button,.theme-luxury .orderSelectionQuickButtons button,.theme-retro .orderSelectionQuickButtons button,.theme-galaxy .orderSelectionQuickButtons button{color:#f3ffff;background:rgba(5,12,24,.92)}\n  @media(max-width:520px){.orderSelectionQuickButtons{grid-template-columns:1fr}.estimateRowTapEdit{grid-template-columns:auto minmax(0,1fr);gap:8px}.estimateRowTapEdit>.estimateNumber{grid-column:2}}`;
  s=s.replace(cssAnchor,cssAnchor+css);

  fs.writeFileSync(p,s,'utf8');
  console.log('発注選択STEP1を追加しました。採寸・見積・保存データは変更しません。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 発注選択STEP1 V1を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1);
}
