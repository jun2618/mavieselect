const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd();
const file=path.join(root,'src','App.jsx');
const backup=file+'.before-folder-project-selection-v1';
const marker='M-CROSS_FOLDER_PROJECT_SELECTION_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(file)) fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(file,'utf8');
if(s.includes(marker)){console.log('SKIP: フォルダ選択V1は適用済みです。');process.exit(0)}

const itemsAnchor=`                          const items = [
                            <button className="savedExplorerFile" type="button" key={(entry.storageKey || index) + '-current'} onClick={() => {`;
const insert=`                          /* ${marker} */
                          const items = [
                            <button
                              className="savedExplorerFile savedExplorerSelectFile"
                              type="button"
                              key={(entry.storageKey || index) + '-select'}
                              aria-pressed={selectedSavedKeys.includes(entry.storageKey)}
                              onClick={() => toggleSavedSelection(entry.storageKey)}
                              style={{ borderColor: selectedSavedKeys.includes(entry.storageKey) ? '#6e91e8' : undefined }}
                            >
                              <span>{selectedSavedKeys.includes(entry.storageKey) ? '☑' : '□'}</span>
                              <div>
                                <strong>{selectedSavedKeys.includes(entry.storageKey) ? '選択中' : 'この案件を選択'}</strong>
                                <small>{baseName}</small>
                              </div>
                            </button>,
                            <button className="savedExplorerFile" type="button" key={(entry.storageKey || index) + '-current'} onClick={() => {`;

if((s.split(itemsAnchor).length-1)!==1) fail('フォルダ内の案件ファイル生成位置を一意に特定できません。変更していません。');
fs.copyFileSync(file,backup);
try{
  s=s.replace(itemsAnchor,insert);
  fs.writeFileSync(file,s,'utf8');
  console.log('フォルダ内に案件選択ボタンを追加しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: フォルダ表示で案件を選択し、上部の「選択を削除」を使えるようにしました。');
  console.log('注意: 見積②③は案件全体とは別物なので、この選択削除の対象にはしていません。');
  console.log('BACKUP: '+backup);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(backup)) fs.copyFileSync(backup,file);
  process.exit(1);
}
