const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),appPath=path.join(root,'src','App.jsx');
const backup=appPath+'.before-additional-work-exclusion-v7';
const marker='M-CROSS_ADDITIONAL_WORK_EXCLUSION_RESTORE_V7_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath))fail('src/App.jsx が見つかりません。');let s=fs.readFileSync(appPath,'utf8');
if(s.includes(marker)){console.log('SKIP: その他工事除外・個別復元V7は適用済みです。');process.exit(0)}
const mapAnchor=`                      rows: additionalWorks.map((item, additionalWorkIndex) => ({`;
const editorAdditional=`                                  key: 'additionalWork:' + (row.additionalWorkId || row.additionalWorkIndex),`;
const v5Filter=`              const estimateRows = allEstimateRows.filter(row => !estimateEdits[estimateEditKey(row)]?.excluded)`;
if(!s.includes(mapAnchor))fail('その他工事の見積行生成が見つかりません。');
if(!s.includes(editorAdditional))fail('その他工事の編集キーが見つかりません。');
if(!s.includes(v5Filter))fail('V5の除外フィルターが見つかりません。');
fs.copyFileSync(appPath,backup);
try{
 // Give additional-work rows the same key used by editor: additionalWork:<id or index>
 s=s.replace(mapAnchor,`${mapAnchor}\n                        exclusionKey: 'additionalWork:' + (item.id || additionalWorkIndex),`);
 s=s.replace(v5Filter,`              /* ${marker} */\n              const estimateRows = allEstimateRows.filter(row => !estimateEdits[row.exclusionKey || estimateEditKey(row)]?.excluded)`);
 // Replace V5 exclude callback's key selection so additional work uses form.key reliably.
 const oldKey=`                      const key = form.key || estimateEditKey(form)`;
 if(s.includes(oldKey)){
   s=s.replace(oldKey,`                      const key = form.key || estimateEditKey(form)`);
 }
 // Replace existing restore-all UI with per-item restore UI if present.
 const restoreRegex=/\{Object\.values\(estimateEdits\)\.some\(edit => edit && typeof edit === 'object' && edit\.excluded\) && \([\s\S]*?<\/div>\s*\)\}/;
 if(restoreRegex.test(s)){
   s=s.replace(restoreRegex,`{Object.entries(estimateEdits).some(([, edit]) => edit && typeof edit === 'object' && edit.excluded) && (\n                    <div className="estimateExcludedRestoreV7">\n                      <strong>見積から外した項目</strong>\n                      {Object.entries(estimateEdits).filter(([, edit]) => edit && typeof edit === 'object' && edit.excluded).map(([key, edit]) => (\n                        <div className="estimateExcludedRestoreItemV7" key={key}>\n                          <span>{Array.isArray(edit.parts) ? edit.parts.filter(Boolean).join(' ') : (key.startsWith('additionalWork:') ? '内装工事以外の項目' : key)}</span>\n                          <button type="button" onClick={() => {\n                            setEstimateEdits(previous => {\n                              const next = { ...previous }\n                              const restored = { ...(next[key] || {}) }\n                              delete restored.excluded\n                              if (Object.keys(restored).length) next[key] = restored\n                              else delete next[key]\n                              try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}\n                              return next\n                            })\n                            setSaveStatus('選んだ項目を見積へ戻しました')\n                          }}>↩ この項目を戻す</button>\n                        </div>\n                      ))}\n                    </div>\n                  )}`);
 }
 // Ensure exclude action for additional works does NOT mutate additionalWorks; it only flags estimateEdits.
 const exclusionCallbackNeedle=`[form.key]: { ...(previous[form.key] || {}), excluded: true },`;
 if(!s.includes(exclusionCallbackNeedle))throw new Error('V5の除外保存処理が見つかりません。');
 s=s.replace(exclusionCallbackNeedle,`[form.key]: {\n                            ...(previous[form.key] || {}),\n                            parts: Array.isArray(form.parts) ? form.parts : (previous[form.key]?.parts || []),\n                            memo: form.memo ?? previous[form.key]?.memo ?? '',\n                            quantity: form.quantity ?? previous[form.key]?.quantity ?? '',\n                            unit: form.unit ?? previous[form.key]?.unit ?? '',\n                            rate: form.rate ?? previous[form.key]?.rate ?? '',\n                            amount: form.amount ?? previous[form.key]?.amount ?? '',\n                            excluded: true,\n                          },`);
 // Add minimal CSS inside existing inline style area, avoiding App.css dependencies.
 const styleAnchor='/* M-CROSS_ESTIMATE_NUMBERS_LARGE_V1 */';
 if(s.includes(styleAnchor)) s=s.replace(styleAnchor,`/* ${marker} */\n.estimateExcludedRestoreV7{display:grid;gap:8px;margin:12px 0;padding:12px;border:1px dashed rgba(90,120,170,.35);border-radius:12px}.estimateExcludedRestoreItemV7{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid rgba(90,120,170,.13)}.estimateExcludedRestoreItemV7 button{min-height:38px;border:1px solid rgba(90,120,170,.3);border-radius:9px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}@media(max-width:700px){.estimateExcludedRestoreItemV7{align-items:stretch;flex-direction:column}.estimateExcludedRestoreItemV7 button{width:100%}}\n${styleAnchor}`);
 fs.writeFileSync(appPath,s,'utf8');console.log('変更を適用しました。自動ビルド確認を行います。');cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: その他工事の見積除外と個別復元V7を適用し、ビルド成功を確認しました。');
 console.log('  - 内装工事以外も見積から除外可能');
 console.log('  - 元データは削除しない');
 console.log('  - 復元は項目ごと');
 console.log('  - 復元時の数量・単価・金額を保持');
 console.log('BACKUP: '+backup);
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));if(fs.existsSync(backup))fs.copyFileSync(backup,appPath);process.exit(1)}
