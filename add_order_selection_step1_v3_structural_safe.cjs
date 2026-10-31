const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-order-selection-step1-v3';
const mark='M-CROSS_ORDER_SELECTION_STEP1_V3_STRUCTURAL_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 発注選択STEP1 V3は適用済みです。');process.exit(0)}

// State anchor near estimate settings.
const stateAnchor="  const [estimateCopyFormat, setEstimateCopyFormat] = useState(() => readPreference(estimateCopyFormatKey, 'merged'))";
const statePos=s.indexOf(stateAnchor);
if(statePos<0)fail('見積state位置を特定できません。変更していません。');

// Estimate render scope.
const estimateOpen='{showEstimate ? (() => {';
const estimatePos=s.indexOf(estimateOpen,statePos);
if(estimatePos<0)fail('見積画面開始を特定できません。');
const totalLine='              const totalAmount = estimateRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) + additionalWorkTotal';
const totalPos=s.indexOf(totalLine,estimatePos);
if(totalPos<0)fail('見積合計位置を特定できません。');

// Structural row detection: map -> class token -> opening tag end.
const mapToken='{section.rows.map((row, index) => (';
const mapPos=s.indexOf(mapToken,totalPos);
if(mapPos<0)fail('section.rows.map を特定できません。');
const classToken='className="estimateRow estimateRowTapEdit"';
const classPos=s.indexOf(classToken,mapPos);
if(classPos<0||classPos-mapPos>1000)fail('見積行classを構造的に特定できません。');
const divStart=s.lastIndexOf('<div',classPos);
const tagEnd=s.indexOf('>',classPos);
if(divStart<mapPos||tagEnd<0||tagEnd-classPos>2500)fail('見積行div開始タグを特定できません。');

// Heading anchor.
const h2Start=s.indexOf('<h2>{selectedProperty?.name}',totalPos);
const h2End=s.indexOf('</h2>',h2Start);
if(h2Start<0||h2End<0||h2End-h2Start>500)fail('見積見出しを特定できません。');

fs.copyFileSync(p,b);
try{
  // 1) temporary selection state only.
  s=s.slice(0,statePos+stateAnchor.length)+`\n  /* ${mark} */\n  const [selectedOrderKeys, setSelectedOrderKeys] = useState([])`+s.slice(statePos+stateAnchor.length);

  // 2) Helpers inside estimate IIFE.
  let t=s.indexOf(totalLine,s.indexOf(estimateOpen));
  const helper=`\n              const orderKeyForRow = (row, index = 0) => row.exclusionKey || (row.category === 'additionalWork' ? 'additionalWork:' + (row.additionalWorkId || row.additionalWorkIndex || index) : estimateEditKey(row))\n              const orderCandidateRows = [\n                ...estimateRows,\n                ...visibleAdditionalWorks.map((item, index) => ({\n                  exclusionKey: 'additionalWork:' + (item.id || index), category: 'additionalWork', additionalWorkId: item.id || '', additionalWorkIndex: index,\n                  parts: Array.isArray(item.estimateParts) && item.estimateParts.length ? [0,1,2,3].map(i => String(item.estimateParts[i] || '')) : [item.room || '', '', item.work || '', ''],\n                  label: (Array.isArray(item.estimateParts) && item.estimateParts.length ? item.estimateParts : [item.room,item.work]).filter(Boolean).join(' '),\n                  memo: item.memo || '', quantity: Number(item.quantity || 0), unit: item.unit || '式', rate: Number(item.unitPrice || 0), amount: Number(item.amount || (Number(item.quantity)||0)*(Number(item.unitPrice)||0)),\n                }))\n              ]\n              const allOrderKeys = orderCandidateRows.map((row,index) => orderKeyForRow(row,index))\n              const interiorOrderKeys = orderCandidateRows.map((row,index) => ({row,key:orderKeyForRow(row,index)})).filter(({row}) => ['cross','cf','soft','floorTrim','crossPackage','cfPackage'].includes(row.category)).map(({key}) => key)\n              const additionalOrderKeys = orderCandidateRows.map((row,index) => ({row,key:orderKeyForRow(row,index)})).filter(({row}) => row.category === 'additionalWork').map(({key}) => key)\n`;
  s=s.slice(0,t+totalLine.length)+helper+s.slice(t+totalLine.length);

  // 3) Quick-selection toolbar after h2, structurally re-find.
  const ep=s.indexOf(estimateOpen), h=s.indexOf('<h2>{selectedProperty?.name}',ep), he=s.indexOf('</h2>',h)+5;
  if(h<0||he<5)throw new Error('見積見出しの再特定に失敗しました。');
  const toolbar=`\n                  <section className="orderSelectionPanel" aria-label="発注項目の選択">\n                    <strong>📦 発注する項目を選択</strong>\n                    <div className="orderSelectionQuickButtons">\n                      <button type="button" onClick={() => setSelectedOrderKeys(allOrderKeys)}>すべて選択</button>\n                      <button type="button" onClick={() => setSelectedOrderKeys(interiorOrderKeys)}>内装工事を選択</button>\n                      <button type="button" onClick={() => setSelectedOrderKeys(additionalOrderKeys)}>その他工事を選択</button>\n                      <button type="button" onClick={() => setSelectedOrderKeys([])}>選択解除</button>\n                    </div>\n                    <div className="orderSelectionSummary"><span>選択中</span><strong>{selectedOrderKeys.length}件</strong></div>\n                    <button className="primary" type="button" disabled={selectedOrderKeys.length===0} onClick={() => {\n                      const selected=orderCandidateRows.filter((row,index)=>selectedOrderKeys.includes(orderKeyForRow(row,index)))\n                      console.log('M-Cross order selection STEP1',selected)\n                      window.alert('発注候補を'+selected.length+'件選択しました。次のSTEPで発注先・掛率・発注数量を設定します。')\n                    }}>📦 選択した項目から発注書を作成</button>\n                  </section>`;
  s=s.slice(0,he)+toolbar+s.slice(he);

  // 4) Find row structurally again after insertions.
  const mp=s.indexOf(mapToken,s.indexOf(estimateOpen));
  const classPos2=s.indexOf(classToken,mp);
  const ds=s.lastIndexOf('<div',classPos2);
  const te=s.indexOf('>',classPos2);
  if(mp<0||classPos2<0||ds<mp||te<0)throw new Error('見積行の再検出に失敗しました。');
  const checkbox=`\n                            <input className="orderSelectCheckbox" type="checkbox"\n                              checked={selectedOrderKeys.includes(orderKeyForRow(row,index))}\n                              onClick={event => event.stopPropagation()}\n                              onChange={event => { event.stopPropagation(); const key=orderKeyForRow(row,index); setSelectedOrderKeys(previous => event.target.checked ? [...new Set([...previous,key])] : previous.filter(value => value !== key)) }}\n                              aria-label={(row.label || '見積項目') + 'を発注対象に選択'}\n                            />`;
  s=s.slice(0,te+1)+checkbox+s.slice(te+1);

  // 5) New UI CSS. Don't replace existing estimate styles; append contained rules.
  const cssAnchor='  .measurementActions { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; margin:16px 0 20px; }';
  if(!s.includes(cssAnchor))throw new Error('CSS挿入位置が見つかりません。');
  const css=`\n  .orderSelectionPanel{display:grid;gap:12px;margin:14px 0 20px;padding:14px;border:1px solid rgba(110,145,232,.42);border-radius:16px;background:rgba(110,145,232,.08)}\n  .orderSelectionQuickButtons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.orderSelectionQuickButtons button{min-height:44px;border:1px solid rgba(110,145,232,.5);border-radius:11px;background:#fff;color:#5b6270;font:inherit;font-weight:800}.orderSelectionSummary{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.72)}\n  .orderSelectCheckbox{width:24px;height:24px;min-width:24px;margin:0 8px 0 0;accent-color:#6e91e8;align-self:center}.estimateRowTapEdit:has(.orderSelectCheckbox){grid-template-columns:auto minmax(0,1fr) auto auto auto}\n  .theme-dark .orderSelectionPanel,.theme-cyber .orderSelectionPanel,.theme-luxury .orderSelectionPanel,.theme-retro .orderSelectionPanel,.theme-galaxy .orderSelectionPanel{background:rgba(5,12,24,.72)}.theme-dark .orderSelectionQuickButtons button,.theme-cyber .orderSelectionQuickButtons button,.theme-luxury .orderSelectionQuickButtons button,.theme-retro .orderSelectionQuickButtons button,.theme-galaxy .orderSelectionQuickButtons button{color:#f3ffff;background:rgba(5,12,24,.92)}\n  @media(max-width:520px){.orderSelectionQuickButtons{grid-template-columns:1fr}.estimateRowTapEdit:has(.orderSelectCheckbox){grid-template-columns:auto minmax(0,1fr);gap:8px}.estimateRowTapEdit:has(.orderSelectCheckbox)>.estimateNumber{grid-column:2}}`;
  s=s.replace(cssAnchor,cssAnchor+css);

  fs.writeFileSync(p,s,'utf8');
  console.log('構造検出版の発注選択STEP1を適用しました。自動ビルド確認を行います。');
  childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 発注選択STEP1 V3を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
