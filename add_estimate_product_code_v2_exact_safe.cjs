const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd();
const app=path.join(root,'src','App.jsx');
const editor=path.join(root,'src','EstimateRowEditor.jsx');
const appBak=app+'.before-estimate-product-code-v2';
const editorBak=editor+'.before-estimate-product-code-v2';
const mark='M-CROSS_ESTIMATE_PRODUCT_CODE_V2_EXACT_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(app)||!fs.existsSync(editor))fail('src/App.jsx または src/EstimateRowEditor.jsx が見つかりません。');
let a=fs.readFileSync(app,'utf8'),e=fs.readFileSync(editor,'utf8');
if(a.includes(mark)||e.includes(mark)){console.log('SKIP: 見積品番V2は適用済みです。');process.exit(0)}
if(!a.includes('M-CROSS_MATERIAL_ORDER_REFERENCE_V5_SAFE'))fail('材料発注参考V5が見つかりません。');

// Editor: add a dedicated productCode field before the existing parts. Never repurpose parts[0].
const grid='<div className="estimateEditorGrid">';
const gp=e.indexOf(grid);
const partsLine='{form.parts.map((part, index) => <label key={index}><span>項目{index + 1}</span><input value={part} onChange={event => setPart(index, event.target.value)} /></label>)}';
const pp=e.indexOf(partsLine,gp);
if(gp<0||pp<0)fail('EstimateRowEditorの項目入力欄を特定できません。');
const productField=`{/* ${mark} */}\n          <label className="wide estimateProductCodeField"><span>品番（任意）</span><input value={form.productCode || ''} onChange={event => setField('productCode', event.target.value)} placeholder="例：SP-2564 / LB-9882" /></label>\n          `;
e=e.slice(0,pp)+productField+e.slice(pp);

// App: every editor opening object gets productCode from saved edit/row.
// Standard estimate row editor.
const standardMemo="                                memo: String(edit.memo ?? row.memo ?? ''),";
if(!a.includes(standardMemo))fail('通常見積の編集初期化を特定できません。');
a=a.replace(standardMemo,"                                productCode: String(edit.productCode ?? row.productCode ?? ''),\n"+standardMemo);
// Additional work editor: keep supported but blank/default from item if present.
const addMemo="                                  memo: String(row.memo || ''),";
if(a.includes(addMemo))a=a.replace(addMemo,"                                  productCode: String(row.productCode || ''),\n"+addMemo);

// Exact save handlers from current App.jsx.
const normalEdit="const edit = { parts: cleanParts, memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount, amountMode: amount === '' ? 'auto' : 'manual' }";
if(!a.includes(normalEdit))fail('通常見積の保存処理を特定できません。変更していません。');
a=a.replace(normalEdit,"const edit = { parts: cleanParts, productCode: String(form.productCode || '').trim(), memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount, amountMode: amount === '' ? 'auto' : 'manual' }");
const additionalReturn="return { ...item, room: cleanParts[0] || '', work: cleanParts.slice(1).filter(Boolean).join(' ') || cleanParts[0] || '', estimateParts: cleanParts, memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), unitPrice: rate, amount: finalAmount }";
if(a.includes(additionalReturn))a=a.replace(additionalReturn,"return { ...item, room: cleanParts[0] || '', work: cleanParts.slice(1).filter(Boolean).join(' ') || cleanParts[0] || '', estimateParts: cleanParts, productCode: String(form.productCode || '').trim(), memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), unitPrice: rate, amount: finalAmount }");
const versionReturn="return { ...row, parts: cleanParts, label: cleanParts.filter(Boolean).join(' '), memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount: numericAmount }";
if(a.includes(versionReturn))a=a.replace(versionReturn,"return { ...row, parts: cleanParts, label: cleanParts.filter(Boolean).join(' '), productCode: String(form.productCode || '').trim(), memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount: numericAmount }");

// Ensure applyEstimateEdits carries productCode from edit to row.
const applyMemoPatterns=[
  "memo: edit.memo ?? row.memo,",
  "memo: edit.memo !== undefined ? edit.memo : row.memo,",
  "memo: edit.memo || row.memo,"
];
let applied=false;
for(const pat of applyMemoPatterns){
  if(a.includes(pat)){
    a=a.replace(pat,"productCode: edit.productCode ?? row.productCode ?? '',\n      "+pat);
    applied=true;
    break;
  }
}
if(!applied){
  // Fallback: rows produced by applyEstimateEdits may use object spread. Material reference reads edits by key instead.
  console.log('INFO: applyEstimateEditsのmemo形は未一致。参考集計側でestimateEditsから直接品番を取得します。');
}

// Replace V5 heuristic product-code extraction with the explicit saved productCode.
const heuristic="const possible=[parts[0],parts[1],parts[2],parts[3],row.memo].map(v=>String(v||'').trim()).filter(Boolean)\n                  const code=possible.find(v=>/^[A-Za-z]{1,4}[-－]?[A-Za-z0-9]{2,}$/.test(v))||''";
if(!a.includes(heuristic))fail('材料発注V5の品番推測処理を特定できません。');
const explicit=`const edit=estimateEdits[row.exclusionKey || estimateEditKey(row)]\n                  const code=String((edit && typeof edit==='object' ? edit.productCode : '') || row.productCode || '').trim()`;
a=a.replace(heuristic,explicit);

// Include productCode in saved purchase-order items if STEP3 exists.
const poItem="memo:String(item.memo||''),category:String(item.category||'')";
if(a.includes(poItem))a=a.replace(poItem,"memo:String(item.memo||''),productCode:String(item.productCode||''),category:String(item.category||'')");

fs.copyFileSync(app,appBak);fs.copyFileSync(editor,editorBak);
try{
  fs.writeFileSync(app,a,'utf8');fs.writeFileSync(editor,e,'utf8');
  console.log('見積編集に独立した「品番」欄を追加し、クロス材料参考集計へ接続しました。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 見積品番V2を適用しました。');
  console.log('クロス: 同じ品番を参考数量として自動集計 / CF: 従来どおり裁断単位で非集計');
  console.log('BACKUP APP: '+appBak);console.log('BACKUP EDITOR: '+editorBak);
}catch(err){
  console.error('適用またはビルド失敗のため2ファイルを自動復旧します。');
  console.error(err.message||String(err));
  if(fs.existsSync(appBak))fs.copyFileSync(appBak,app);
  if(fs.existsSync(editorBak))fs.copyFileSync(editorBak,editor);
  process.exit(1);
}
