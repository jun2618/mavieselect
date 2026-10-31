const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=process.cwd();
const appPath=path.join(root,'src','App.jsx');
const backup=appPath+'.before-work-name-v4';
const marker='M-CROSS_WORK_NAME_V4_EXACT';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(appPath,'utf8');
if(s.includes(marker)){console.log('SKIP: 工事名V4は適用済みです。');process.exit(0)}
const unitState="  const [unit, setUnit] = useState('')";
const unitInput='<input value={unit} onChange={event => setUnit(event.target.value)} placeholder="例：501" />';
const keyFn=`function getSaveKey(company, property, unit) {\n  return \`${'${storagePrefix}${JSON.stringify(['}\n    company,\n    property?.name || '',\n    property?.address || '',\n    unit.trim(),\n  ])}\`\n}`;
if(!s.includes(unitState))fail('unit stateが見つかりません。');
if((s.split(unitInput).length-1)!==1)fail('新規登録側の号室inputを一意に特定できません。');
if(!s.includes(keyFn))fail('現在のgetSaveKey関数が見つかりません。');
fs.copyFileSync(appPath,backup);
try{
  s=s.replace(unitState,unitState+`\n  /* ${marker} */\n  const [workName, setWorkName] = useState('原状回復工事')`);
  // insert after the exact unit label containing the unique input
  const inputPos=s.indexOf(unitInput); const closePos=s.indexOf('</label>',inputPos); if(closePos<0)throw new Error('号室label終了位置が見つかりません。');
  const insertPos=closePos+'</label>'.length;
  const ui=`\n\n              <label className="workNameField">\n                <span>工事名 *</span>\n                <input list="mcross-work-name-options" value={workName} onChange={event => { setWorkName(event.target.value); setSaveStatus('') }} placeholder="例：原状回復工事" />\n                <datalist id="mcross-work-name-options"><option value="原状回復工事" /><option value="内装工事" /><option value="修繕工事" /><option value="設備工事" /></datalist>\n                <small>同じ物件・号室でも工事名が違えば別案件になります。</small>\n              </label>`;
  s=s.slice(0,insertPos)+ui+s.slice(insertPos);
  s=s.replace(keyFn,`function getSaveKey(company, property, unit, workName = '') {\n  return \`${'${storagePrefix}${JSON.stringify(['}\n    company,\n    property?.name || '',\n    property?.address || '',\n    unit.trim(),\n    String(workName || '').trim(),\n  ])}\`\n}`);
  // only exact current-case key calls
  s=s.replace(/getSaveKey\(company,\s*selectedProperty,\s*unit\)/g,'getSaveKey(company, selectedProperty, unit, workName)');
  // imported entry keeps work name
  s=s.replace(/getSaveKey\(imported\.company,\s*\{ name: imported\.propertyName, address: imported\.address \},\s*imported\.unit\)/g,"getSaveKey(imported.company, { name: imported.propertyName, address: imported.address }, imported.unit, imported.workName || '原状回復工事')");
  // start validation
  const start='  function startMeasurement() {'; if(!s.includes(start))throw new Error('startMeasurementが見つかりません。');
  s=s.replace(start,start+`\n    if (!String(workName || '').trim()) { window.alert('工事名を入力してください。'); return }`);
  // load saved entry
  const load="    setUnit(entry.unit || '')"; if(!s.includes(load))throw new Error('保存案件の号室復元処理が見つかりません。');
  s=s.replace(load,load+`\n    setWorkName(entry.workName || '原状回復工事')`);
  // payload: add to every object block containing selected property and unit, but only first save payload with records nearby
  const payloadNeedle="      unit,\n      siteMemo,";
  if(!s.includes(payloadNeedle))throw new Error('保存データのunit/siteMemo位置が見つかりません。');
  s=s.replace(payloadNeedle,`      unit,\n      workName: String(workName || '').trim() || '原状回復工事',\n      siteMemo,`);
  // new registration reset paths
  s=s.replace(/setUnit\(''\)/g,m=>m+`\n    setWorkName('原状回復工事')`);
  // title
  const line='<p className="propertyLine">{selectedProperty?.name}　{unit}号室</p>';
  if(s.includes(line))s=s.replace(line,'<p className="propertyLine">{selectedProperty?.name}　{unit}号室　{workName}</p>');
  fs.writeFileSync(appPath,s,'utf8');
  console.log('変更を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 工事名V4を適用し、ビルド成功を確認しました。');
  console.log('BACKUP: '+backup);
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));if(fs.existsSync(backup))fs.copyFileSync(backup,appPath);process.exit(1)}
