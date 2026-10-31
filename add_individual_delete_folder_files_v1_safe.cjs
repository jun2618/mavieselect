const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-individual-folder-delete-v1';
const marker='M-CROSS_INDIVIDUAL_FOLDER_DELETE_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 個別削除V1は適用済みです。');process.exit(0)}
const currentBtn='<button className="savedExplorerFile" type="button" key={(entry.storageKey || index) + \'-current\'}';
const versionBtn='<button className="savedExplorerFile estimateVersionExplorerFile" type="button" key={(entry.storageKey || index) + \'-estimate-\' + version.version}';
if(!s.includes(currentBtn)||!s.includes(versionBtn))fail('フォルダ内ファイルを安全に特定できません。変更していません。');
fs.copyFileSync(p,b);
try{
  // Add small delete buttons adjacent to current project and saved estimate version files by wrapping each in Fragment.
  s=s.replace(currentBtn,`<div className="savedExplorerFileRow" key={(entry.storageKey || index) + '-current-row'}>\n                              ${currentBtn.replace(' key={(entry.storageKey || index) + \'-current\'}','')}`);
  const currentClose=s.indexOf('</button>',s.indexOf("'-current-row'"));
  if(currentClose<0)throw new Error('現在案件ボタンの終了位置を特定できません。');
  const currentEnd=currentClose+9;
  const currentDelete=`\n                              <button className="actionButton actionDelete savedExplorerDeleteButton" type="button" onClick={() => deleteSavedEntry(entry)}>削除</button>\n                            </div>`;
  s=s.slice(0,currentEnd)+currentDelete+s.slice(currentEnd);

  s=s.replace(versionBtn,`<div className="savedExplorerFileRow" key={(entry.storageKey || index) + '-estimate-row-' + version.version}>\n                              ${versionBtn.replace(" key={(entry.storageKey || index) + '-estimate-' + version.version}",'')}`);
  const verStart=s.indexOf("'-estimate-row-' + version.version");
  const verClose=s.indexOf('</button>',verStart);
  if(verClose<0)throw new Error('保存見積ボタンの終了位置を特定できません。');
  const verEnd=verClose+9;
  const verDelete=`\n                              <button className="actionButton actionDelete savedExplorerDeleteButton" type="button" onClick={() => {\n                                if (!window.confirm('この保存済み見積を削除しますか？')) return\n                                const next = estimateVersions.filter(item => item.id !== version.id)\n                                try { localStorage.setItem(estimateVersionStorageKey, JSON.stringify(next)) } catch {}\n                                setEstimateVersions(next)\n                              }}>削除</button>\n                            </div>`;
  s=s.slice(0,verEnd)+verDelete+s.slice(verEnd);

  // CSS kept inline in existing template string area by adding a style rule next to compatible saved explorer CSS if found.
  const cssAnchor='.savedExplorerFiles {';
  const cssAt=s.indexOf(cssAnchor);
  if(cssAt>=0){
    const lineEnd=s.indexOf('\n',cssAt);
    s=s.slice(0,lineEnd+1)+`  /* ${marker} */\n  .savedExplorerFileRow { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:stretch; }\n  .savedExplorerDeleteButton { min-width:72px; margin:0; }\n`+s.slice(lineEnd+1);
  } else {
    s=s.replace('/* M-CROSS_SAVED_EXPLORER_V6_MINIMAL_SAFE */',`/* ${marker} */\n              /* M-CROSS_SAVED_EXPLORER_V6_MINIMAL_SAFE */`);
  }
  fs.writeFileSync(p,s,'utf8');
  console.log('案件本体と保存済み見積に個別削除ボタンを追加しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: フォルダ内の個別削除V1を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
