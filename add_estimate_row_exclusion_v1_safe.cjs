const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=process.cwd();
const appPath=path.join(root,'src','App.jsx');
const cssPath=path.join(root,'src','App.css');
const appBak=appPath+'.before-estimate-row-exclusion-v1';
const cssBak=cssPath+'.before-estimate-row-exclusion-v1';
const marker='M-CROSS_ESTIMATE_ROW_EXCLUSION_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath)||!fs.existsSync(cssPath))fail('src/App.jsx または src/App.css が見つかりません。');
let app=fs.readFileSync(appPath,'utf8'),css=fs.readFileSync(cssPath,'utf8');
if(app.includes(marker)){console.log('SKIP: 見積項目除外V1は適用済みです。');process.exit(0)}
const state="  const [estimateEdits, setEstimateEdits] = useState({})";
const rows="              const estimateRows = openedEstimateRows ?? applyEstimateEdits(rawEstimateRows, estimateEdits)";
if(!app.includes(state))fail('estimateEdits stateが見つかりません。');
if(!app.includes(rows))fail('現在のestimateRows生成処理が見つかりません。');
fs.copyFileSync(appPath,appBak);fs.copyFileSync(cssPath,cssBak);
try{
 app=app.replace(state,`${state}\n  /* ${marker} */\n  const [estimateExcludedKeys, setEstimateExcludedKeys] = useState({})\n  const estimateExcludedStorageKey = 'mcross:estimate-excluded:' + [company, selectedProperty?.name || '', String(unit || '').trim(), String(workName || '').trim(), openedEstimateVersion || 'current'].join('|')\n  useEffect(() => {\n    try { setEstimateExcludedKeys(JSON.parse(localStorage.getItem(estimateExcludedStorageKey) || '{}') || {}) }\n    catch { setEstimateExcludedKeys({}) }\n  }, [estimateExcludedStorageKey])`);
 app=app.replace(rows,`              const allEstimateRows = openedEstimateRows ?? applyEstimateEdits(rawEstimateRows, estimateEdits)\n              const estimateRows = allEstimateRows.filter(row => !estimateExcludedKeys[estimateEditKey(row)])`);
 // add restore section before total panel
 const total='                  <div className="estimateTotal">';
 if(!app.includes(total))throw new Error('合計金額欄が見つかりません。');
 const restore=`                  {Object.keys(estimateExcludedKeys).length > 0 && (\n                    <div className="estimateExcludedBox">\n                      <strong>見積から外した項目 {Object.keys(estimateExcludedKeys).length}件</strong>\n                      <button type="button" onClick={() => { setEstimateExcludedKeys({}); localStorage.removeItem(estimateExcludedStorageKey); setSaveStatus('見積から外した項目を戻しました') }}>↩ すべて見積へ戻す</button>\n                    </div>\n                  )}\n\n${total}`;
 app=app.replace(total,restore);
 // inject delete button into clickable estimate row, immediately before closing row element where edit hint exists.
 const hint=`<small>タップで編集</small>`;
 const count=(app.match(/<small>タップで編集<\/small>/g)||[]).length;
 if(count<1)throw new Error('見積明細の「タップで編集」が見つかりません。');
 app=app.replace(/<small>タップで編集<\/small>/g,`${hint}\n                              <button className="estimateExcludeButton" type="button" onClick={event => {\n                                event.stopPropagation()\n                                const key = estimateEditKey(row)\n                                if (!window.confirm('この項目を見積から外しますか？\\n採寸データは削除されません。')) return\n                                const next = { ...estimateExcludedKeys, [key]: true }\n                                setEstimateExcludedKeys(next)\n                                localStorage.setItem(estimateExcludedStorageKey, JSON.stringify(next))\n                                setSaveStatus('見積から項目を外しました（採寸データは残っています）')\n                              }}>見積から外す</button>`);
 css+=`\n/* ${marker} */\n.estimateExcludeButton{margin-top:8px;padding:6px 10px;border:1px solid rgba(190,45,65,.35);border-radius:9px;background:rgba(190,45,65,.07);color:#b4233a;font-weight:800;cursor:pointer}.estimateExcludedBox{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0;padding:12px;border:1px dashed rgba(90,120,170,.35);border-radius:12px}.estimateExcludedBox button{min-height:38px;border:1px solid rgba(90,120,170,.3);border-radius:9px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}@media(max-width:620px){.estimateExcludedBox{align-items:stretch;flex-direction:column}.estimateExcludeButton{min-height:40px}}\n`;
 fs.writeFileSync(appPath,app,'utf8');fs.writeFileSync(cssPath,css,'utf8');
 console.log('変更を適用しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 見積項目だけを除外するV1を適用し、ビルド成功を確認しました。');
 console.log('採寸データは削除しません。');
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));if(fs.existsSync(appBak))fs.copyFileSync(appBak,appPath);if(fs.existsSync(cssBak))fs.copyFileSync(cssBak,cssPath);process.exit(1)}
