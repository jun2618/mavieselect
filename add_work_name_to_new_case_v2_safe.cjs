const fs=require('fs');const path=require('path');const cp=require('child_process');
const root=process.cwd(), appPath=path.join(root,'src','App.jsx'), backup=appPath+'.before-work-name-v2';
const marker='M-CROSS_WORK_NAME_V2_SAFE';
function stop(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath))stop('src/App.jsx が見つかりません。');
let s=fs.readFileSync(appPath,'utf8'); if(s.includes(marker)){console.log('SKIP: 工事名V2は適用済みです。');process.exit(0)}
const unitState="  const [unit, setUnit] = useState('')";
const unitField=`              <label>\n                <span>号室</span>\n                <input value={unit} onChange={event => setUnit(event.target.value)} placeholder="例：501" />\n              </label>`;
if(!s.includes(unitState))stop('unit stateが見つかりません。');
if(!s.includes(unitField))stop('現在の新規登録画面の号室欄が見つかりません。');
const g=s.match(/function getSaveKey\(([^)]*)\)\s*\{([\s\S]*?)\n\}/); if(!g)stop('getSaveKey関数が見つかりません。');
fs.copyFileSync(appPath,backup);
try{
  s=s.replace(unitState,unitState+`\n  /* ${marker} */\n  const [workName, setWorkName] = useState('原状回復工事')`);
  s=s.replace(unitField,unitField+`\n\n              <label className="workNameField">\n                <span>工事名 *</span>\n                <input list="mcross-work-name-options" value={workName} onChange={event => { setWorkName(event.target.value); setSaveStatus('') }} placeholder="例：原状回復工事" />\n                <datalist id="mcross-work-name-options"><option value="原状回復工事" /><option value="内装工事" /><option value="修繕工事" /><option value="設備工事" /></datalist>\n                <small>同じ物件・号室でも工事名が違えば別案件として保存します。</small>\n              </label>`);
  // Extend getSaveKey compatibly: old 3-arg calls keep working; new current-case calls can provide workName.
  const oldFn=g[0], params=g[1].trim(); let body=g[2];
  if(!/\breturn\b/.test(body))throw new Error('getSaveKeyのreturnが見つかりません。');
  body=body.replace(/return\s+([^\n]+)/,(m,expr)=>`return (${expr.trim()}) + (workName ? '::work:' + String(workName).trim() : '')`);
  s=s.replace(oldFn,`function getSaveKey(${params}, workName = '') {${body}\n}`);
  // Current job key calls only: company + selectedProperty + unit.
  s=s.replace(/getSaveKey\(company,\s*selectedProperty,\s*unit\)/g,'getSaveKey(company, selectedProperty, unit, workName)');
  // Imported jobs retain their own work name.
  s=s.replace(/getSaveKey\(imported\.company,\s*\{ name: imported\.propertyName, address: imported\.address \},\s*imported\.unit\)/g,"getSaveKey(imported.company, { name: imported.propertyName, address: imported.address }, imported.unit, imported.workName || '原状回復工事')");
  // load saved entry
  const load=`    setUnit(entry.unit || '')`; if(!s.includes(load))throw new Error('保存案件ロード位置が見つかりません。');
  s=s.replace(load,load+`\n    setWorkName(entry.workName || '原状回復工事')`);
  // reset new registration: only functions that clear unit also reset workName. Safe broad addition, duplicate guarded by marker.
  s=s.replace(/setUnit\(''\)/g, m=>m+`\n    setWorkName('原状回復工事')`);
  // Save payload: insert after siteMemo where payload contains selected property context. Locate first nearby payload occurrence.
  const payload=/propertyName:\s*selectedProperty\?\.name\s*\|\|\s*'',([\s\S]{0,500}?)unit,([\s\S]{0,500}?)siteMemo,/;
  if(!payload.test(s))throw new Error('現在案件の保存データ構造が見つかりません。');
  s=s.replace(payload,(m,a,b)=>`propertyName: selectedProperty?.name || '',${a}unit,${b}siteMemo,\n      workName: String(workName || '').trim() || '原状回復工事',`);
  // Require work name before measurement starts.
  const start='  function startMeasurement() {'; if(!s.includes(start))throw new Error('startMeasurementが見つかりません。');
  s=s.replace(start,start+`\n    if (!String(workName || '').trim()) { window.alert('工事名を入力してください。'); return }`);
  // Visible case title.
  s=s.replace(`<p className="propertyLine">{selectedProperty?.name}　{unit}号室</p>`,`<p className="propertyLine">{selectedProperty?.name}　{unit}号室　{workName}</p>`);
  fs.writeFileSync(appPath,s,'utf8'); console.log('変更を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 新規案件の工事名V2を追加し、ビルド成功を確認しました。'); console.log('BACKUP: '+backup);
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));fs.copyFileSync(backup,appPath);process.exit(1)}
