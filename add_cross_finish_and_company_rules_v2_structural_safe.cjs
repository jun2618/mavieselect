const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-cross-finish-company-rules-v2';
const marker='M-CROSS_CROSS_FINISH_COMPANY_RULES_V2_STRUCTURAL_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p)) fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: V2適用済みです。');process.exit(0)}

// 1) Main cross state only: anchor from measurementType, not other components' memo state.
const mt="  const [measurementType, setMeasurementType] = useState('天井')";
const mtPos=s.indexOf(mt);
const memoState="  const [memo, setMemo] = useState('')";
const memoStatePos=s.indexOf(memoState,mtPos);
if(mtPos<0||memoStatePos<0||memoStatePos-mtPos>1500) fail('クロス入力用stateを特定できません。');

// 2) addCrossRecord exact function range.
const addStart=s.indexOf('  function addCrossRecord(event) {');
const addEnd=s.indexOf('\n  function deleteCrossRecord',addStart);
if(addStart<0||addEnd<0) fail('addCrossRecord関数を特定できません。');
let addBlock=s.slice(addStart,addEnd);
const qtyLine='      quantity: numericHeight * numericCount,';
if((addBlock.split(qtyLine).length-1)!==1) fail('addCrossRecordのquantity行を一意に特定できません。');

// 3) Estimate builder wall definition/group block.
const buildStart=s.indexOf('function buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings) {');
const buildEnd=s.indexOf('\nfunction estimateRowsToClipboardText',buildStart);
if(buildStart<0||buildEnd<0) fail('buildEstimateRowsを特定できません。');
let build=s.slice(buildStart,buildEnd);
const groupOld='      groupByMemo(definition.records).forEach((groupRecords, inputMemo) => {';
const pushOld=`        crossRows.push({\n          room: roomName,\n          parts: definition.parts,\n          memo: definition.storage ? ['天井壁', inputMemo].filter(Boolean).join('・') : inputMemo,`;
if((build.split(groupOld).length-1)!==1) fail('クロスのグループ処理を一意に特定できません。');
if((build.split(pushOld).length-1)!==1) fail('クロス見積行生成を一意に特定できません。');

// 4) UI: identify the cross memo input label via its unique placeholder.
const placeholder='placeholder="例：窓面、部分張替え"';
const ph=s.indexOf(placeholder);
if(ph<0) fail('クロス採寸メモ欄を特定できません。');
const labelStart=s.lastIndexOf('                        <label>',ph);
if(labelStart<0||ph-labelStart>1200) fail('クロス採寸メモlabel開始を特定できません。');

fs.copyFileSync(p,b);
try{
  // STATES
  s=s.slice(0,memoStatePos+memoState.length)+`\n  /* ${marker} */\n  const [crossFinish, setCrossFinish] = useState('normal')\n  const [surfaceName, setSurfaceName] = useState('')`+s.slice(memoStatePos+memoState.length);

  // Re-find function after state insertion.
  let a1=s.indexOf('  function addCrossRecord(event) {');
  let a2=s.indexOf('\n  function deleteCrossRecord',a1);
  let ab=s.slice(a1,a2);
  ab=ab.replace(qtyLine,`${qtyLine}\n      crossFinish: measurementType === '壁' ? crossFinish : 'normal',\n      surfaceName: measurementType === '壁' && crossFinish === 'color' ? surfaceName.trim() : '',`);
  const validation='    if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return';
  if(!ab.includes(validation)) throw new Error('addCrossRecordの入力検証行が見つかりません。');
  ab=ab.replace(validation,`${validation}\n    if (measurementType === '壁' && crossFinish === 'color' && !surfaceName.trim()) {\n      window.alert('カラークロスの施工面を入力してください。')\n      return\n    }`);
  const reset='    setMemo(\'\')\n    setActiveInput(\'height\')';
  if(!ab.includes(reset)) throw new Error('addCrossRecordのリセット処理が見つかりません。');
  ab=ab.replace(reset,`    setMemo('')\n    setCrossFinish('normal')\n    setSurfaceName('')\n    setActiveInput('height')`);
  s=s.slice(0,a1)+ab+s.slice(a2);

  // ESTIMATE RULES
  let bs=s.indexOf('function buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings) {');
  let be=s.indexOf('\nfunction estimateRowsToClipboardText',bs);
  build=s.slice(bs,be);
  build=build.replace(groupOld,`      const groupedRecords = new Map()\n      definition.records.forEach(record => {\n        const finish = record.crossFinish === 'color' ? 'color' : 'normal'\n        const surface = finish === 'color' ? String(record.surfaceName || '').trim() : ''\n        const recordMemo = String(record.memo || '').trim()\n        const groupKey = [finish, surface, recordMemo].join('||')\n        if (!groupedRecords.has(groupKey)) groupedRecords.set(groupKey, [])\n        groupedRecords.get(groupKey).push(record)\n      })\n      groupedRecords.forEach(groupRecords => {\n        const firstRecord = groupRecords[0] || {}\n        const finish = firstRecord.crossFinish === 'color' ? 'color' : 'normal'\n        const surface = finish === 'color' ? String(firstRecord.surfaceName || '').trim() : ''\n        const inputMemo = String(firstRecord.memo || '').trim()`);
  build=build.replace(pushOld,`        const estimateParts = definition.parts[1] === '壁'\n          ? (finish === 'color'\n              ? [roomName, surface || '壁', 'カラークロス施工']\n              : [roomName, '壁', 'クロス部分張替'])\n          : definition.parts\n        crossRows.push({\n          room: roomName,\n          parts: estimateParts,\n          memo: definition.storage ? ['天井壁', inputMemo].filter(Boolean).join('・') : inputMemo,`);
  s=s.slice(0,bs)+build+s.slice(be);

  // UI re-find by placeholder after prior edits.
  const ph2=s.indexOf(placeholder);
  const ls=s.lastIndexOf('                        <label>',ph2);
  const ui=`                        {measurementType === '壁' && (\n                          <section className="crossFinishPanel" aria-label="クロス種別">\n                            <span>クロス種別</span>\n                            <div className="crossFinishButtons">\n                              <button type="button" className={crossFinish === 'normal' ? 'active' : ''} onClick={() => { setCrossFinish('normal'); setSurfaceName(''); markUnsaved() }}>通常クロス</button>\n                              <button type="button" className={crossFinish === 'color' ? 'active' : ''} onClick={() => { setCrossFinish('color'); markUnsaved() }}>カラークロス</button>\n                            </div>\n                            {crossFinish === 'color' && (\n                              <label>\n                                <span>施工面</span>\n                                <input value={surfaceName} onChange={event => { setSurfaceName(event.target.value); markUnsaved() }} placeholder="例：バルコニー、正面" />\n                              </label>\n                            )}\n                          </section>\n                        )}\n`;
  s=s.slice(0,ls)+ui+s.slice(ls);

  // CSS
  const cssAnchor='  .measurementActions { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; margin:16px 0 20px; }';
  if(!s.includes(cssAnchor)) throw new Error('CSS挿入位置が見つかりません。');
  s=s.replace(cssAnchor,cssAnchor+`\n  .crossFinishPanel { display:grid; gap:10px; margin:0 0 18px; padding:14px; border:1px solid #ead8cb; border-radius:14px; background:#fffaf5; }\n  .crossFinishPanel>span,.crossFinishPanel label>span { color:#817183; font-size:15px; font-weight:800; }\n  .crossFinishButtons { display:grid; grid-template-columns:1fr 1fr; gap:8px; }\n  .crossFinishButtons button { min-height:48px; border:1px solid #d8c9df; border-radius:12px; background:#fff; color:#65596a; font:inherit; font-weight:800; }\n  .crossFinishButtons button.active { color:#fff; border-color:#6e91e8; background:#6e91e8; }\n  .crossFinishPanel label { margin:0; }`);

  fs.writeFileSync(p,s,'utf8');
  console.log('通常/カラークロスV2を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 通常/カラークロス 社内表記ルールV2を適用しました。');
  console.log('通常壁: 部屋 | 壁 | クロス部分張替');
  console.log('カラー: 部屋 | 施工面 | カラークロス施工');
  console.log('既存データ: crossFinishなし = 通常クロス');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1);
}
