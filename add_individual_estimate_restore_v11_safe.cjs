const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(), appPath=path.join(root,'src','App.jsx');
const backup=appPath+'.before-individual-estimate-restore-v11';
const marker='M-CROSS_INDIVIDUAL_ESTIMATE_RESTORE_V11_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(appPath,'utf8');
if(s.includes(marker)){console.log('SKIP: 個別復元V11は適用済みです。');process.exit(0)}

// V5の復元欄だけを対象にする。タップ、その他工事map、Editorは変更しない。
const startToken="                  {Object.values(estimateEdits).some(edit => edit && typeof edit === 'object' && edit.excluded) && (";
const panelToken="                  <EstimateVersionPanel";
const start=s.indexOf(startToken), end=s.indexOf(panelToken,start);
if(start<0)fail('現在の「すべて見積へ戻す」欄が見つかりません。');
if(end<0)fail('復元欄の終了位置が見つかりません。');
fs.copyFileSync(appPath,backup);
try{
 const replacement=`                  {/* ${marker} */}\n                  {Object.entries(estimateEdits).some(([, edit]) => edit && typeof edit === 'object' && edit.excluded) && (\n                    <div className="estimateExcludedRestoreV11">\n                      <strong>見積から外した項目</strong>\n                      {Object.entries(estimateEdits)\n                        .filter(([, edit]) => edit && typeof edit === 'object' && edit.excluded)\n                        .map(([key, edit]) => (\n                          <div className="estimateExcludedRestoreItemV11" key={key}>\n                            <span>{Array.isArray(edit.parts) && edit.parts.filter(Boolean).length ? edit.parts.filter(Boolean).join(' ') : (key.startsWith('additionalWork:') ? '内装工事以外の項目' : '見積項目')}</span>\n                            <button type="button" onClick={() => {\n                              setEstimateEdits(previous => {\n                                const next = { ...previous }\n                                const restored = { ...(next[key] || {}) }\n                                delete restored.excluded\n                                if (Object.keys(restored).length) next[key] = restored\n                                else delete next[key]\n                                try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}\n                                return next\n                              })\n                              setIsDirty(true)\n                              setSaveStatus('選んだ項目を見積へ戻しました')\n                            }}>↩ この項目を戻す</button>\n                          </div>\n                        ))}\n                    </div>\n                  )}\n\n`;
 s=s.slice(0,start)+replacement+s.slice(end);
 const style='/* M-CROSS_ESTIMATE_NUMBERS_LARGE_V1 */';
 if(!s.includes(style))throw new Error('CSS挿入位置が見つかりません。');
 s=s.replace(style,`/* ${marker} */\n.estimateExcludedRestoreV11{display:grid;gap:8px;margin:12px 0;padding:12px;border:1px dashed rgba(90,120,170,.35);border-radius:12px}\n.estimateExcludedRestoreItemV11{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid rgba(90,120,170,.14)}\n.estimateExcludedRestoreItemV11 button{min-height:38px;padding:7px 11px;border:1px solid rgba(90,120,170,.3);border-radius:9px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}\n@media(max-width:700px){.estimateExcludedRestoreItemV11{align-items:stretch;flex-direction:column}.estimateExcludedRestoreItemV11 button{width:100%}}\n${style}`);
 fs.writeFileSync(appPath,s,'utf8');
 console.log('変更を適用しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 見積から外した項目を1件ずつ戻せるV11を適用しました。');
 console.log('タップ処理・除外処理・その他工事mapには触れていません。');
 console.log('BACKUP: '+backup);
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));if(fs.existsSync(backup))fs.copyFileSync(backup,appPath);process.exit(1)}
