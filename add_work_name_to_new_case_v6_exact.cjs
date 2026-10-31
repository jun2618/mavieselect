const fs=require('fs');const path=require('path');const cp=require('child_process');
const root=process.cwd(), appPath=path.join(root,'src','App.jsx'), backup=appPath+'.before-work-name-v6';
const marker='M-CROSS_WORK_NAME_V6_EXACT';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath))fail('src/App.jsx が見つかりません。');let s=fs.readFileSync(appPath,'utf8');
if(s.includes(marker)){console.log('SKIP: 工事名V6は適用済みです。');process.exit(0)}
const unitState="  const [unit, setUnit] = useState('')";
const unitInput='<input value={unit} onChange={event => setUnit(event.target.value)} placeholder="例：501" />';
const keyStart='function getSaveKey(company, property, unit) {';
const saveDataAnchor=`    const saveData = {\n      company,\n      propertyName: selectedProperty.name,\n      address: selectedProperty.address,\n      unit: unit.trim(),\n      siteMemo: siteMemo.trim(),`;
const draftAnchor=`    const draft = {\n      company,\n      propertyName: selectedProperty.name || '',\n      address: selectedProperty.address || '',\n      unit: unit.trim(),\n      siteMemo: siteMemo.trim(),`;
const normalizeAnchor=`    company: value.company, propertyName: value.propertyName, address: value.address, unit: value.unit.trim(),`;
const overwriteAnchor=`        company: entry.company || '',\n        propertyName: entry.propertyName || '',\n        address: entry.address || '',\n        unit: entry.unit || '',\n        siteMemo: entry.siteMemo || '',`;
if(!s.includes(unitState))fail('unit stateが見つかりません。');
if((s.split(unitInput).length-1)!==1)fail('新規登録の号室inputの一致数が '+(s.split(unitInput).length-1)+' 件です。');
if(!s.includes(keyStart))fail('getSaveKey開始位置が見つかりません。');
if(!s.includes(saveDataAnchor))fail('saveData実コードが見つかりません。');
if(!s.includes(draftAnchor))fail('working draft実コードが見つかりません。');
if(!s.includes(normalizeAnchor))fail('import正規化位置が見つかりません。');
if(!s.includes(overwriteAnchor))fail('上書き保存位置が見つかりません。');
fs.copyFileSync(appPath,backup);
try{
 s=s.replace(unitState,unitState+`\n  /* ${marker} */\n  const [workName, setWorkName] = useState('原状回復工事')`);
 // getSaveKey: parse by known end brace, no full-text matching
 const ks=s.indexOf(keyStart), ke=s.indexOf('\n}',ks); if(ke<0)throw new Error('getSaveKey終了位置が見つかりません。');
 const newKey=`function getSaveKey(company, property, unit, workName = '') {\n  return \`\${storagePrefix}\${JSON.stringify([\n    company,\n    property?.name || '',\n    property?.address || '',\n    unit.trim(),\n    String(workName || '').trim(),\n  ])}\`\n}`;
 s=s.slice(0,ks)+newKey+s.slice(ke+2);
 // UI directly after unique unit label
 const ip=s.indexOf(unitInput), lc=s.indexOf('</label>',ip); if(lc<0)throw new Error('号室label終了位置が見つかりません。');
 const ii=lc+'</label>'.length;
 const ui=`\n\n              <label className="workNameField">\n                <span>工事名 *</span>\n                <input list="mcross-work-name-options" value={workName} onChange={event => { setWorkName(event.target.value); setSaveStatus('') }} placeholder="例：原状回復工事" />\n                <datalist id="mcross-work-name-options"><option value="原状回復工事" /><option value="内装工事" /><option value="修繕工事" /><option value="設備工事" /></datalist>\n                <small>同じ物件・号室でも工事名が違えば別案件として保存します。</small>\n              </label>`;
 s=s.slice(0,ii)+ui+s.slice(ii);
 // Persist in every known data path
 s=s.replace(saveDataAnchor,saveDataAnchor.replace('      siteMemo:',"      workName: String(workName || '').trim() || '原状回復工事',\n      siteMemo:"));
 s=s.replace(draftAnchor,draftAnchor.replace('      siteMemo:',"      workName: String(workName || '').trim() || '原状回復工事',\n      siteMemo:"));
 s=s.replace(normalizeAnchor,normalizeAnchor+`\n    workName: typeof value.workName === 'string' && value.workName.trim() ? value.workName.trim() : '原状回復工事',`);
 s=s.replace(overwriteAnchor,overwriteAnchor.replace('        siteMemo:',"        workName: entry.workName || '原状回復工事',\n        siteMemo:"));
 // Current storage keys. Old generic/import calls remain valid due optional 4th arg.
 let calls=0;s=s.replace(/getSaveKey\(company,\s*selectedProperty,\s*unit\)/g,()=>{calls++;return 'getSaveKey(company, selectedProperty, unit, workName)'});
 if(calls<1)throw new Error('現在案件のgetSaveKey呼び出しが見つかりません。');
 s=s.replace(/getSaveKey\(imported\.company,\s*\{\s*name:\s*imported\.propertyName,\s*address:\s*imported\.address\s*\},\s*imported\.unit\)/g,"getSaveKey(imported.company, { name: imported.propertyName, address: imported.address }, imported.unit, imported.workName || '原状回復工事')");
 // Restore from saved and draft
 const load="    setUnit(entry.unit || '')";if(!s.includes(load))throw new Error('保存案件load位置が見つかりません。');s=s.replace(load,load+`\n    setWorkName(entry.workName || '原状回復工事')`);
 const draftLoad="    setUnit(draft.unit || '')";if(s.includes(draftLoad))s=s.replace(draftLoad,draftLoad+`\n    setWorkName(draft.workName || '原状回復工事')`);
 // Require and reset
 const start='  function startMeasurement() {';if(!s.includes(start))throw new Error('startMeasurementが見つかりません。');s=s.replace(start,start+`\n    if (!String(workName || '').trim()) { window.alert('工事名を入力してください。'); return }`);
 for(const fn of ['resetForNewRegistration','showNewPropertyScreen']){const a=s.indexOf('function '+fn+'(');if(a<0)continue;const b=s.indexOf('\n  function ',a+10);const e=b>a?b:s.length;let block=s.slice(a,e);if(block.includes("setUnit('')")&&!block.includes("setWorkName('原状回復工事')")){block=block.replace("setUnit('')","setUnit('')\n    setWorkName('原状回復工事')");s=s.slice(0,a)+block+s.slice(e)}}
 // Screen title
 const pl='<p className="propertyLine">{selectedProperty?.name}　{unit}号室</p>';if(s.includes(pl))s=s.replace(pl,'<p className="propertyLine">{selectedProperty?.name}　{unit}号室　{workName}</p>');
 fs.writeFileSync(appPath,s,'utf8');console.log('変更を適用しました。自動ビルド確認を行います。');cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 工事名V6を適用し、ビルド成功を確認しました。');console.log('BACKUP: '+backup);
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));if(fs.existsSync(backup))fs.copyFileSync(backup,appPath);process.exit(1)}
