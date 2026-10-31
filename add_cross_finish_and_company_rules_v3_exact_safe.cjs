const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-cross-finish-company-rules-v3';
const marker='M-CROSS_CROSS_FINISH_COMPANY_RULES_V3_EXACT_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: V3適用済みです。');process.exit(0)}

// ----- exact anchors confirmed from current App.jsx -----
const stateAnchor="  const [memo, setMemo] = useState('')";
const addFnStart='  function addCrossRecord(event) {';
const delFnStart='\n  function deleteCrossRecord(id) {';
const qtyAnchor='      quantity: numericHeight * numericCount,';
const memoPlaceholder='placeholder="例：窓面、部分張替え"';
const buildStart='function buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings) {';
const defsStart='  orderedRooms.forEach(roomName => {';
const defsEnd='\n  // 2. クロスが終わった後に、CFを全部屋分並べます。';

const mt=s.indexOf("  const [measurementType, setMeasurementType] = useState('天井')");
const st=s.indexOf(stateAnchor,mt);
const af=s.indexOf(addFnStart);
const ae=s.indexOf(delFnStart,af);
const bs=s.indexOf(buildStart);
const ds=s.indexOf(defsStart,bs);
const de=s.indexOf(defsEnd,ds);
const ph=s.indexOf(memoPlaceholder);
if(mt<0||st<0||st-mt>1000||af<0||ae<0||bs<0||ds<0||de<0||ph<0)fail('現在コードの必要位置を安全に特定できません。変更していません。');
let add=s.slice(af,ae);
if((add.split(qtyAnchor).length-1)!==1)fail('addCrossRecordのquantity位置が一意ではありません。');

fs.copyFileSync(p,b);
try{
  // state
  s=s.slice(0,st+stateAnchor.length)+`\n  /* ${marker} */\n  const [crossFinish, setCrossFinish] = useState('normal')\n  const [surfaceName, setSurfaceName] = useState('')`+s.slice(st+stateAnchor.length);

  // addCrossRecord - re-find after state insertion
  let a=s.indexOf(addFnStart), e=s.indexOf(delFnStart,a), block=s.slice(a,e);
  const validate='    if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return';
  if(!block.includes(validate))throw new Error('入力検証行が見つかりません。');
  block=block.replace(validate,`${validate}\n    if (measurementType === '壁' && crossFinish === 'color' && !surfaceName.trim()) {\n      window.alert('カラークロスの施工面を入力してください。')\n      return\n    }`);
  block=block.replace(qtyAnchor,`${qtyAnchor}\n      crossFinish: measurementType === '壁' ? crossFinish : 'normal',\n      surfaceName: measurementType === '壁' && crossFinish === 'color' ? surfaceName.trim() : '',`);
  const reset="    setMemo('')\n    setActiveInput('height')";
  if(!block.includes(reset))throw new Error('登録後リセット位置が見つかりません。');
  block=block.replace(reset,"    setMemo('')\n    setCrossFinish('normal')\n    setSurfaceName('')\n    setActiveInput('height')");
  s=s.slice(0,a)+block+s.slice(e);

  // buildEstimateRows: replace ONLY cross room loop, keep CF and below intact.
  let bstart=s.indexOf(buildStart), dstart=s.indexOf(defsStart,bstart), dend=s.indexOf(defsEnd,dstart);
  if(dstart<0||dend<0)throw new Error('クロス見積生成範囲を特定できません。');
  const newCross=`  orderedRooms.forEach(roomName => {\n    const definitions = [\n      {\n        kind: 'ceiling',\n        records: records.filter(record => record.room === roomName && record.type === '天井'),\n        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['天井'] || 0),\n      },\n      {\n        kind: 'wall',\n        records: records.filter(record => record.room === roomName && record.type === '壁'),\n        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['壁'] || 0),\n      },\n      {\n        kind: 'storage',\n        records: records.filter(record => record.room === roomName && (record.type === '収納天井' || record.type === '収納壁')),\n        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates[record.type] || 0),\n      },\n    ]\n\n    definitions.forEach(definition => {\n      const groups = new Map()\n      definition.records.forEach(record => {\n        const finish = definition.kind === 'wall' && record.crossFinish === 'color' ? 'color' : 'normal'\n        const surface = finish === 'color' ? String(record.surfaceName || '').trim() : ''\n        const recordMemo = String(record.memo || '').trim()\n        const key = [finish, surface, recordMemo].join('||')\n        if (!groups.has(key)) groups.set(key, [])\n        groups.get(key).push(record)\n      })\n\n      groups.forEach(groupRecords => {\n        const first = groupRecords[0] || {}\n        const finish = definition.kind === 'wall' && first.crossFinish === 'color' ? 'color' : 'normal'\n        const surface = finish === 'color' ? String(first.surfaceName || '').trim() : ''\n        const inputMemo = String(first.memo || '').trim()\n        const quantity = groupRecords.reduce((sum, record) => sum + getRecordQuantity(record), 0) * factor\n        if (quantity <= 0) return\n        const amount = groupRecords.reduce((sum, record) => sum + definition.amountForRecord(record), 0)\n\n        let parts\n        let outputMemo = inputMemo\n        if (definition.kind === 'wall') {\n          parts = finish === 'color'\n            ? [roomName, surface || '壁', 'カラークロス施工']\n            : [roomName, '壁', 'クロス部分張替']\n        } else if (definition.kind === 'storage') {\n          parts = [roomName, '収納', 'クロス貼替']\n          outputMemo = ['天井壁', inputMemo].filter(Boolean).join('・')\n        } else {\n          parts = [roomName, '天井', 'クロス貼替']\n        }\n\n        crossRows.push({\n          room: roomName,\n          parts,\n          memo: outputMemo,\n          category: 'cross',\n          quantity,\n          unit: '㎡',\n          rate: quantity > 0 ? amount / quantity : 0,\n          amount,\n        })\n      })\n    })\n  })\n`;
  s=s.slice(0,dstart)+newCross+s.slice(dend);

  // UI: re-find placeholder and enclosing label after edits.
  const p2=s.indexOf(memoPlaceholder), l2=s.lastIndexOf('                        <label>',p2);
  if(l2<0||p2-l2>1200)throw new Error('メモ欄UI位置を特定できません。');
  const ui=`                        {measurementType === '壁' && (\n                          <section className="crossFinishPanel" aria-label="クロス種別">\n                            <span>クロス種別</span>\n                            <div className="crossFinishButtons">\n                              <button type="button" className={crossFinish === 'normal' ? 'active' : ''} onClick={() => { setCrossFinish('normal'); setSurfaceName(''); markUnsaved() }}>通常クロス</button>\n                              <button type="button" className={crossFinish === 'color' ? 'active' : ''} onClick={() => { setCrossFinish('color'); markUnsaved() }}>カラークロス</button>\n                            </div>\n                            {crossFinish === 'color' && (\n                              <label>\n                                <span>施工面</span>\n                                <input value={surfaceName} onChange={event => { setSurfaceName(event.target.value); markUnsaved() }} placeholder="例：バルコニー、正面" />\n                              </label>\n                            )}\n                          </section>\n                        )}\n`;
  s=s.slice(0,l2)+ui+s.slice(l2);

  // CSS
  const css='  .measurementActions { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; margin:16px 0 20px; }';
  if(!s.includes(css))throw new Error('CSS挿入位置がありません。');
  s=s.replace(css,css+`\n  .crossFinishPanel { display:grid; gap:10px; margin:0 0 18px; padding:14px; border:1px solid #ead8cb; border-radius:14px; background:#fffaf5; }\n  .crossFinishPanel>span,.crossFinishPanel label>span { color:#817183; font-size:15px; font-weight:800; }\n  .crossFinishButtons { display:grid; grid-template-columns:1fr 1fr; gap:8px; }\n  .crossFinishButtons button { min-height:48px; border:1px solid #d8c9df; border-radius:12px; background:#fff; color:#65596a; font:inherit; font-weight:800; }\n  .crossFinishButtons button.active { color:#fff; border-color:#6e91e8; background:#6e91e8; }\n  .crossFinishPanel label { margin:0; }`);

  fs.writeFileSync(p,s,'utf8');
  console.log('V3を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 通常/カラークロス 社内表記ルールV3を適用しました。');
  console.log('通常壁 -> 部屋 | 壁 | クロス部分張替');
  console.log('カラー -> 部屋 | 施工面 | カラークロス施工');
  console.log('既存データ -> 通常クロス扱い');
  console.log('BACKUP: '+b);
}catch(err){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(err.message||String(err));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1);
}
