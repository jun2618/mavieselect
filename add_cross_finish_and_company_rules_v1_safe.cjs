const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-cross-finish-company-rules-v1';
const marker='M-CROSS_CROSS_FINISH_COMPANY_RULES_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 通常/カラークロスV1は適用済みです。');process.exit(0)}

const state="  const [memo, setMemo] = useState('')";
const addRecord=`      quantity: numericHeight * numericCount,\n      memo: memo.trim(),`;
const memoLabel=`                        <label>\n                          <span>メモ</span>\n                          <input\n                            ref={memoInputRef}`;
const groupLoop=`      groupByMemo(definition.records).forEach((groupRecords, inputMemo) => {`;
const pushStart=`        crossRows.push({\n          room: roomName,\n          parts: definition.parts,\n          memo: definition.storage ? ['天井壁', inputMemo].filter(Boolean).join('・') : inputMemo,`;
for(const [n,a] of [['state',state],['addRecord',addRecord],['memoUI',memoLabel],['groupLoop',groupLoop],['push',pushStart]]){
 if(!s.includes(a))fail(n+' の対象コードが見つかりません。変更していません。');
}
fs.copyFileSync(p,b);
try{
 // State: old records without these fields remain normal via fallback.
 s=s.replace(state,`${state}\n  /* ${marker} */\n  const [crossFinish, setCrossFinish] = useState('normal')\n  const [surfaceName, setSurfaceName] = useState('')`);

 // Save new attributes on each cross measurement record.
 s=s.replace(addRecord,`      quantity: numericHeight * numericCount,\n      crossFinish: measurementType === '壁' ? crossFinish : 'normal',\n      surfaceName: measurementType === '壁' && crossFinish === 'color' ? surfaceName.trim() : '',\n      memo: memo.trim(),`);

 // Reset transient color fields when moving rooms and after registration.
 s=s.replaceAll("    setMemo('')\n\n    if (nextIndex < rooms.length)","    setMemo('')\n    setCrossFinish('normal')\n    setSurfaceName('')\n\n    if (nextIndex < rooms.length)");
 s=s.replace("    setMemo('')\n    setActiveInput('height')","    setMemo('')\n    setCrossFinish('normal')\n    setSurfaceName('')\n    setActiveInput('height')");

 // UI appears only for wall measurements. Color requires a surface name.
 const finishUI=`                        {measurementType === '壁' && (\n                          <section className="crossFinishPanel" aria-label="クロス種別">\n                            <span>クロス種別</span>\n                            <div className="crossFinishButtons">\n                              <button type="button" className={crossFinish === 'normal' ? 'active' : ''} onClick={() => { setCrossFinish('normal'); setSurfaceName(''); markUnsaved() }}>通常クロス</button>\n                              <button type="button" className={crossFinish === 'color' ? 'active' : ''} onClick={() => { setCrossFinish('color'); markUnsaved() }}>カラークロス</button>\n                            </div>\n                            {crossFinish === 'color' && (\n                              <label>\n                                <span>施工面</span>\n                                <input value={surfaceName} onChange={event => { setSurfaceName(event.target.value); markUnsaved() }} placeholder="例：バルコニー、正面" />\n                              </label>\n                            )}\n                          </section>\n                        )}\n`;
 s=s.replace(memoLabel,finishUI+memoLabel);

 // Prevent color registration without a surface name.
 s=s.replace("    if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return\n\n    setRecords",`    if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return\n    if (measurementType === '壁' && crossFinish === 'color' && !surfaceName.trim()) {\n      window.alert('カラークロスの施工面を入力してください。')\n      return\n    }\n\n    setRecords`);

 // Group wall records by finish/surface/memo so normal and color never merge.
 s=s.replace(groupLoop,`      const groupedRecords = new Map()\n      definition.records.forEach(record => {\n        const finish = record.crossFinish === 'color' ? 'color' : 'normal'\n        const surface = finish === 'color' ? String(record.surfaceName || '').trim() : ''\n        const recordMemo = String(record.memo || '').trim()\n        const key = [finish, surface, recordMemo].join('||')\n        if (!groupedRecords.has(key)) groupedRecords.set(key, [])\n        groupedRecords.get(key).push(record)\n      })\n      groupedRecords.forEach(groupRecords => {\n        const firstRecord = groupRecords[0] || {}\n        const finish = firstRecord.crossFinish === 'color' ? 'color' : 'normal'\n        const surface = finish === 'color' ? String(firstRecord.surfaceName || '').trim() : ''\n        const inputMemo = String(firstRecord.memo || '').trim()`);

 // Apply company wording only to wall. Ceiling/storage keep existing wording.
 s=s.replace(pushStart,`        const estimateParts = definition.parts[1] === '壁'\n          ? (finish === 'color'\n              ? [roomName, surface || '壁', 'カラークロス施工']\n              : [roomName, '壁', 'クロス部分張替'])\n          : definition.parts\n        crossRows.push({\n          room: roomName,\n          parts: estimateParts,\n          memo: definition.storage ? ['天井壁', inputMemo].filter(Boolean).join('・') : inputMemo,`);

 // CSS.
 const cssAnchor='  .measurementActions { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; margin:16px 0 20px; }';
 if(!s.includes(cssAnchor))throw new Error('CSS挿入位置が見つかりません。');
 s=s.replace(cssAnchor,cssAnchor+`\n  .crossFinishPanel { display:grid; gap:10px; margin:0 0 18px; padding:14px; border:1px solid #ead8cb; border-radius:14px; background:#fffaf5; }\n  .crossFinishPanel>span,.crossFinishPanel label>span { color:#817183; font-size:15px; font-weight:800; }\n  .crossFinishButtons { display:grid; grid-template-columns:1fr 1fr; gap:8px; }\n  .crossFinishButtons button { min-height:48px; border:1px solid #d8c9df; border-radius:12px; background:#fff; color:#65596a; font:inherit; font-weight:800; }\n  .crossFinishButtons button.active { color:#fff; border-color:#6e91e8; background:#6e91e8; }\n  .crossFinishPanel label { margin:0; }`);

 fs.writeFileSync(p,s,'utf8');
 console.log('通常/カラークロスの入力・保存・社内表記ルールを追加しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 通常クロス/カラークロス 社内表記ルールV1を適用しました。');
 console.log('通常壁: 部屋 | 壁 | クロス部分張替');
 console.log('カラー: 部屋 | 施工面 | カラークロス施工');
 console.log('既存データ: 通常クロスとして互換表示');
 console.log('BACKUP: '+b);
}catch(e){
 console.error('適用またはビルド失敗のため自動復旧します。');
 console.error(e.message||String(e));
 if(fs.existsSync(b))fs.copyFileSync(b,p);
 process.exit(1);
}
