const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd();
const appPath=path.join(root,'src','App.jsx');
const backup=appPath+'.before-additional-work-restore-v8';
const marker='M-CROSS_ADDITIONAL_WORK_RESTORE_V8_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(appPath,'utf8');
if(s.includes(marker)){console.log('SKIP: その他工事除外・個別復元V8は適用済みです。');process.exit(0)}

// V6適用済み/未適用の両方に対応
const filterV6="              const estimateRows = allEstimateRows.filter(row => !estimateEdits[row.exclusionKey || estimateEditKey(row)]?.excluded)";
const filterV5="              const estimateRows = allEstimateRows.filter(row => !estimateEdits[estimateEditKey(row)]?.excluded)";
if(!s.includes(filterV6)&&!s.includes(filterV5)) fail('現在の見積除外フィルターが見つかりません。変更していません。');

const additionalRowAnchor="                      rows: additionalWorks.map((item, additionalWorkIndex) => ({";
if(!s.includes(additionalRowAnchor)) fail('内装工事以外の行生成が見つかりません。');
const editorKey="                                  key: 'additionalWork:' + (row.additionalWorkId || row.additionalWorkIndex),";
if(!s.includes(editorKey)) fail('内装工事以外の編集キーが見つかりません。');

// V5の復元UIを実コードから探す
const restoreStart="                  {Object.values(estimateEdits).some(edit => edit && typeof edit === 'object' && edit.excluded) && (";
if(!s.includes(restoreStart)) fail('現在の「すべて見積へ戻す」欄が見つかりません。');

fs.copyFileSync(appPath,backup);
try{
  // 内装工事以外の各行に、Editorと同じ除外キーを持たせる（既にあれば追加しない）
  const keyLine="                        exclusionKey: 'additionalWork:' + (item.id || additionalWorkIndex),";
  if(!s.includes(keyLine)){
    s=s.replace(additionalRowAnchor,additionalRowAnchor+'\n'+keyLine);
  }

  // フィルターを共通化
  if(s.includes(filterV5)){
    s=s.replace(filterV5,"              const estimateRows = allEstimateRows.filter(row => !estimateEdits[row.exclusionKey || estimateEditKey(row)]?.excluded)");
  }

  // 「すべて戻す」ブロックを、括弧の対応を壊さないよう既知の次コンポーネント直前まで置換
  const start=s.indexOf(restoreStart);
  const panel=s.indexOf('                  <EstimateVersionPanel',start);
  if(start<0||panel<0) throw new Error('復元欄の範囲を特定できません。');
  const restoreBlock=`                  {/* ${marker} */}\n                  {Object.entries(estimateEdits).some(([, edit]) => edit && typeof edit === 'object' && edit.excluded) && (\n                    <div className="estimateExcludedRestoreV8">\n                      <strong>見積から外した項目</strong>\n                      {Object.entries(estimateEdits)\n                        .filter(([, edit]) => edit && typeof edit === 'object' && edit.excluded)\n                        .map(([key, edit]) => (\n                          <div className="estimateExcludedRestoreItemV8" key={key}>\n                            <span>{Array.isArray(edit.parts) && edit.parts.filter(Boolean).length ? edit.parts.filter(Boolean).join(' ') : (key.startsWith('additionalWork:') ? '内装工事以外の項目' : '見積項目')}</span>\n                            <button type="button" onClick={() => {\n                              setEstimateEdits(previous => {\n                                const next = { ...previous }\n                                const restored = { ...(next[key] || {}) }\n                                delete restored.excluded\n                                if (Object.keys(restored).length > 0) next[key] = restored\n                                else delete next[key]\n                                try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}\n                                return next\n                              })\n                              setSaveStatus('選んだ項目を見積へ戻しました')\n                            }}>↩ この項目を戻す</button>\n                          </div>\n                        ))}\n                    </div>\n                  )}\n\n`;
  s=s.slice(0,start)+restoreBlock+s.slice(panel);

  // 除外時に値を保持する。V5の単純フラグ保存が残っている場合だけ置換。
  const simple=`[form.key]: { ...(previous[form.key] || {}), excluded: true },`;
  if(s.includes(simple)){
    s=s.replace(simple,`[form.key]: {\n                          ...(previous[form.key] || {}),\n                          parts: Array.isArray(form.parts) ? [...form.parts] : (previous[form.key]?.parts || []),\n                          memo: form.memo ?? previous[form.key]?.memo ?? '',\n                          quantity: form.quantity ?? previous[form.key]?.quantity ?? '',\n                          unit: form.unit ?? previous[form.key]?.unit ?? '',\n                          rate: form.rate ?? previous[form.key]?.rate ?? '',\n                          amount: form.amount ?? previous[form.key]?.amount ?? '',\n                          excluded: true,\n                        },`);
  }

  // App内styleへCSSを追加
  const styleAnchor='/* M-CROSS_ESTIMATE_NUMBERS_LARGE_V1 */';
  if(!s.includes(styleAnchor)) throw new Error('見積CSS挿入位置が見つかりません。');
  s=s.replace(styleAnchor,`/* ${marker} */\n.estimateExcludedRestoreV8{display:grid;gap:8px;margin:12px 0;padding:12px;border:1px dashed rgba(90,120,170,.35);border-radius:12px}\n.estimateExcludedRestoreItemV8{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid rgba(90,120,170,.14)}\n.estimateExcludedRestoreItemV8 button{min-height:38px;padding:7px 11px;border:1px solid rgba(90,120,170,.3);border-radius:9px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}\n@media(max-width:700px){.estimateExcludedRestoreItemV8{align-items:stretch;flex-direction:column}.estimateExcludedRestoreItemV8 button{width:100%}}\n${styleAnchor}`);

  fs.writeFileSync(appPath,s,'utf8');
  console.log('変更を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 内装工事以外の除外と個別復元V8を適用し、ビルド成功を確認しました。');
  console.log('  - 内装工事以外も見積から外せます');
  console.log('  - 復元は1項目ずつです');
  console.log('  - 数量・単価・金額を保持して戻します');
  console.log('  - 元のその他工事データは削除しません');
  console.log('BACKUP: '+backup);
}catch(e){
  console.error('適用またはビルドに失敗したため、自動で元に戻します。');
  console.error(e.message||String(e));
  if(fs.existsSync(backup))fs.copyFileSync(backup,appPath);
  process.exit(1);
}
