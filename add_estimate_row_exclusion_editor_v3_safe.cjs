const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd();
const appPath=path.join(root,'src','App.jsx');
const editorPath=path.join(root,'src','EstimateRowEditor.jsx');
const editorCssPath=path.join(root,'src','EstimateRowEditor.css');
const backups=[[appPath,appPath+'.before-estimate-exclude-editor-v3'],[editorPath,editorPath+'.before-estimate-exclude-editor-v3'],[editorCssPath,editorCssPath+'.before-estimate-exclude-editor-v3']];
const marker='M-CROSS_ESTIMATE_EXCLUDE_EDITOR_V3_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
for(const [f] of backups) if(!fs.existsSync(f)) fail(path.basename(f)+' が見つかりません。');
let app=fs.readFileSync(appPath,'utf8'),editor=fs.readFileSync(editorPath,'utf8'),css=fs.readFileSync(editorCssPath,'utf8');
if(app.includes(marker)||editor.includes(marker)){console.log('SKIP: 見積除外Editor V3は適用済みです。');process.exit(0)}
const state="  const [estimateEdits, setEstimateEdits] = useState({})";
const rows="              const estimateRows = openedEstimateRows ?? applyEstimateEdits(rawEstimateRows, estimateEdits)";
const editorComponent='<EstimateRowEditor';
if(!app.includes(state)||!app.includes(rows)||!app.includes(editorComponent))fail('App.jsxの対象位置が見つかりません。');
const sig=editor.match(/export default function EstimateRowEditor\(([^)]*)\)/);if(!sig)fail('EstimateRowEditorの関数定義が見つかりません。');
for(const [f,b] of backups) fs.copyFileSync(f,b);
try{
 app=app.replace(state,`${state}\n  /* ${marker} */\n  const [estimateExcludedKeys, setEstimateExcludedKeys] = useState({})\n  const estimateExcludedStorageKey = 'mcross:estimate-excluded:' + [company, selectedProperty?.name || '', String(unit || '').trim(), String(workName || '').trim() || '原状回復工事', openedEstimateVersion || 'current'].join('|')\n  useEffect(() => { try { const v=JSON.parse(localStorage.getItem(estimateExcludedStorageKey)||'{}'); setEstimateExcludedKeys(v&&typeof v==='object'&&!Array.isArray(v)?v:{}) } catch { setEstimateExcludedKeys({}) } }, [estimateExcludedStorageKey])`);
 app=app.replace(rows,`              const allEstimateRows = openedEstimateRows ?? applyEstimateEdits(rawEstimateRows, estimateEdits)\n              const estimateRows = allEstimateRows.filter(row => !estimateExcludedKeys[estimateEditKey(row)])`);
 // Add callback prop at component invocation without touching row JSX.
 app=app.replace('<EstimateRowEditor\n                    value={estimateEditor}',`<EstimateRowEditor\n                    value={estimateEditor}\n                    onExclude={value => {\n                      if (!value) return\n                      if (!window.confirm('この項目を見積から外しますか？\\n採寸データは削除されません。')) return\n                      const key = value.key || estimateEditKey(value)\n                      const next = { ...estimateExcludedKeys, [key]: true }\n                      setEstimateExcludedKeys(next)\n                      localStorage.setItem(estimateExcludedStorageKey, JSON.stringify(next))\n                      setEstimateEditor(null)\n                      setSaveStatus('見積から項目を外しました。採寸データは残っています。')\n                    }}`);
 if(!app.includes('onExclude={value =>'))throw new Error('EstimateRowEditorへonExcludeを追加できませんでした。');
 // Restore-all box before version panel, safe simple insertion.
 const panel='<EstimateVersionPanel';
 const pos=app.indexOf(panel);if(pos<0)throw new Error('EstimateVersionPanel位置が見つかりません。');
 const box=`{Object.keys(estimateExcludedKeys).length > 0 && (\n                    <div className="estimateExcludedRestore">\n                      <span>見積から外した項目 {Object.keys(estimateExcludedKeys).length}件</span>\n                      <button type="button" onClick={() => { setEstimateExcludedKeys({}); localStorage.removeItem(estimateExcludedStorageKey); setSaveStatus('見積へ戻しました') }}>↩ すべて戻す</button>\n                    </div>\n                  )}\n\n                  `;
 app=app.slice(0,pos)+box+app.slice(pos);
 // Editor receives optional callback. Append button just before final actions closing area by inserting before component's final visible closing wrapper.
 const inside=sig[1].trim();
 if(inside.startsWith('{')&&inside.endsWith('}')){
   const names=inside.slice(1,-1).trim(); editor=editor.replace(sig[0],`export default function EstimateRowEditor({ ${names}${names?', ':''}onExclude })`);
 }else throw new Error('EstimateRowEditor引数形式が想定外です。');
 // insert before first button whose text/handler is close/reset/save is risky; instead before the final return closing </div> occurrence.
 const returnStart=editor.indexOf('return (');if(returnStart<0)throw new Error('Editor returnが見つかりません。');
 const lastDiv=editor.lastIndexOf('</div>');if(lastDiv<returnStart)throw new Error('Editor末尾divが見つかりません。');
 const btn=`{onExclude && value && !value.additionalWorkId && !Number.isInteger(value.additionalWorkIndex) && (\n        <button className="estimateEditorExclude" type="button" onClick={() => onExclude(value)}>🗑 見積から外す</button>\n      )}\n      `;
 editor=editor.slice(0,lastDiv)+btn+editor.slice(lastDiv);
 editor='/* '+marker+' */\n'+editor;
 css+=`\n/* ${marker} */\n.estimateEditorExclude{width:100%;min-height:44px;margin-top:10px;border:1px solid rgba(190,45,65,.4);border-radius:10px;background:rgba(190,45,65,.08);color:#b4233a;font:inherit;font-weight:850}.estimateExcludedRestore{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0;padding:10px 12px;border:1px dashed rgba(90,120,170,.35);border-radius:10px}.estimateExcludedRestore button{min-height:38px;border:1px solid rgba(90,120,170,.3);border-radius:9px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}@media(max-width:620px){.estimateExcludedRestore{align-items:stretch;flex-direction:column}}\n`;
 fs.writeFileSync(appPath,app,'utf8');fs.writeFileSync(editorPath,editor,'utf8');fs.writeFileSync(editorCssPath,css,'utf8');
 console.log('変更を適用しました。自動ビルド確認を行います。');cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 見積編集画面から項目を外すV3を適用し、ビルド成功を確認しました。');console.log('採寸データは削除しません。');
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));for(const [f,b] of backups)if(fs.existsSync(b))fs.copyFileSync(b,f);process.exit(1)}
