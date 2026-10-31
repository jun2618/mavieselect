const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-remove-archive-v1';
const marker='M-CROSS_REMOVE_ARCHIVE_FEATURE_V1_EXACT_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: アーカイブ削除V1は適用済みです。');process.exit(0)}
const required=[
"  const [showArchived, setShowArchived] = useState(false)",
"      .filter(entry => Boolean(entry.archived) === showArchived)",
"  function setEntryArchived(entry, archived) {",
"  function bulkArchiveSelected() {",
"                  {showArchived ? '選択を一覧へ戻す' : '選択をアーカイブ'}",
"                          <button className=\"actionButton actionOverwrite\" type=\"button\" onClick={() => setEntryArchived(entry, !showArchived)}>{showArchived ? '一覧に戻す' : 'アーカイブ'}</button>"
];
for(const x of required)if(!s.includes(x))fail('対象コードが見つからないため変更していません: '+x.slice(0,55));
fs.copyFileSync(p,b);
try{
 // stateとフィルター: 全保存データを表示
 s=s.replace("  const [showArchived, setShowArchived] = useState(false)\n",`  /* ${marker} */\n`);
 s=s.replace("      .filter(entry => Boolean(entry.archived) === showArchived)\n",'');
 s=s.replace("  }, [savedEntries, savedSearch, savedCompanyFilter, savedSortOrder, showArchived])","  }, [savedEntries, savedSearch, savedCompanyFilter, savedSortOrder])");
 s=s.replace(/  const savedCount = savedEntries\.filter\(\s*entry => Boolean\(entry\.archived\) === showArchived\s*\)\.length/,'  const savedCount = savedEntries.length');
 // browser history no longer stores archive tab
 s=s.replace("    if (showSavedList && !started) return { kind: 'saved', archived: showArchived }","    if (showSavedList && !started) return { kind: 'saved' }");
 s=s.replace("      setShowArchived(Boolean(view.archived))\n",'');
 s=s.replace(", showArchived, started, activePage",", started, activePage");
 s=s.replace(/\s*setShowArchived\(false\);/g,'');
 // archive functions remove by exact function ranges
 for(const name of ['setEntryArchived','bulkArchiveSelected']){
   const st=s.indexOf(`  function ${name}(`); if(st<0)throw new Error(name+'開始位置なし');
   const en=s.indexOf('\n  function ',st+10); if(en<0)throw new Error(name+'終了位置なし');
   s=s.slice(0,st)+s.slice(en+1);
 }
 // save data no longer preserves archived flag: old archived data remains harmless in localStorage until next save
 s=s.replace(/    let archived = false\n\n    try \{[\s\S]*?    \}\n\n    const saveData = \{/,'    const saveData = {');
 s=s.replace("      archived,\n",'');
 // overwrite no longer copies archive status
 s=s.replace("        archived: Boolean(entry.archived),\n",'');
 // top archive tabs block -> single heading; locate exact UI range
 const uiStart=s.indexOf('              <div className="settingsOptions" style={{ marginBottom: 18 }}>');
 const uiEnd=s.indexOf('              <input ref={importFileInputRef}',uiStart);
 if(uiStart<0||uiEnd<0)throw new Error('保存済み/アーカイブ切替UI位置なし');
 s=s.slice(0,uiStart)+s.slice(uiEnd);
 s=s.replace("            <h1>{showArchived ? 'アーカイブ一覧' : '保存済み一覧'}</h1>","            <h1>保存済み一覧</h1>");
 s=s.replace("                  <span>{showArchived ? 'アーカイブ' : '保存済み'} {savedCount}件</span>","                  <span>保存済み {savedCount}件</span>");
 // bulk archive button remove
 const bulkBtn=/\s*<button className="actionButton actionCsv" type="button" onClick=\{bulkArchiveSelected\} disabled=\{selectedSavedKeys\.length === 0\}>[\s\S]*?<\/button>/;
 if(!bulkBtn.test(s))throw new Error('一括アーカイブボタンなし'); s=s.replace(bulkBtn,'');
 // empty message
 s=s.replace("                  {showArchived ? 'アーカイブされたデータはありません' : '保存済みデータはありません'}","                  保存済みデータはありません");
 // individual archive button
 s=s.replace(/\s*<button className="actionButton actionOverwrite" type="button" onClick=\{\(\) => setEntryArchived\(entry, !showArchived\)\}>\{showArchived \? '一覧に戻す' : 'アーカイブ'\}<\/button>/,'');
 // read/normalize can keep legacy archived property for compatibility; but display ignores it.
 fs.writeFileSync(p,s,'utf8');
 console.log('アーカイブUIと絞り込みを削除しました。既存データは削除していません。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: アーカイブ機能を安全に削除しました。保存済み一覧・フォルダには全案件を表示します。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
