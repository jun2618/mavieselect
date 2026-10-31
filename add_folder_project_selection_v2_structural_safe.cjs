const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-folder-project-selection-v2';
const marker='M-CROSS_FOLDER_PROJECT_SELECTION_V2_STRUCTURAL_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p)) fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: フォルダ選択V2は適用済みです。');process.exit(0)}

// Japanese labels and exact indentation are intentionally not used for matching.
// Restrict search to the savedExplorerFiles block, then locate the current project button structurally.
const filesStart=s.indexOf('<div className="savedExplorerFiles">');
if(filesStart<0) fail('savedExplorerFiles が見つかりません。変更していません。');
const filesEnd=s.indexOf('</div>',filesStart+32);
if(filesEnd<0) fail('savedExplorerFiles の範囲を特定できません。変更していません。');
const searchEnd=Math.min(s.length,filesStart+9000);
const segment=s.slice(filesStart,searchEnd);
const itemsIndex=segment.indexOf('const items = [');
if(itemsIndex<0) fail('フォルダ内の const items = [ が見つかりません。変更していません。');
const currentNeedle='<button className="savedExplorerFile" type="button" key={(entry.storageKey || index) + \'-current\'}';
const currentRel=segment.indexOf(currentNeedle,itemsIndex);
if(currentRel<0) fail('現在案件ボタンを特定できません。変更していません。');
if(segment.indexOf(currentNeedle,currentRel+currentNeedle.length)>=0) fail('現在案件ボタンが複数見つかりました。変更していません。');

fs.copyFileSync(p,b);
try{
  const abs=filesStart+currentRel;
  const indent=(s.slice(0,abs).match(/(^|\n)([ \t]*)[^\n]*$/)||[])[2]||'';
  const add=`{/* ${marker} */}\n${indent}<button\n${indent}  className="savedExplorerFile savedExplorerSelectFile"\n${indent}  type="button"\n${indent}  key={(entry.storageKey || index) + '-select'}\n${indent}  aria-pressed={selectedSavedKeys.includes(entry.storageKey)}\n${indent}  onClick={() => toggleSavedSelection(entry.storageKey)}\n${indent}  style={{ borderColor: selectedSavedKeys.includes(entry.storageKey) ? '#6e91e8' : undefined }}\n${indent}>\n${indent}  <span>{selectedSavedKeys.includes(entry.storageKey) ? '☑' : '□'}</span>\n${indent}  <div>\n${indent}    <strong>{selectedSavedKeys.includes(entry.storageKey) ? '選択中' : 'この案件を選択'}</strong>\n${indent}    <small>{baseName}</small>\n${indent}  </div>\n${indent}</button>,\n${indent}`;
  s=s.slice(0,abs)+add+s.slice(abs);
  fs.writeFileSync(p,s,'utf8');
  console.log('フォルダ内の案件ファイル直前に選択ボタンを1件だけ追加しました。');
  console.log('自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: フォルダ表示で案件単位の選択・解除ができるV2を適用しました。');
  console.log('上部の「選択を削除」は既存の案件削除処理をそのまま使用します。');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1);
}
