const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-folder-project-selection-v4';
const marker='M-CROSS_FOLDER_PROJECT_SELECTION_V4_ARRAY_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: V4適用済みです。');process.exit(0)}
const files=s.indexOf('<div className="savedExplorerFiles">');
const items=s.indexOf('const items = [',files);
const needle='<button className="savedExplorerFile" type="button" key={(entry.storageKey || index) + \'-current\'}';
const btn=s.indexOf(needle,items);
if(files<0||items<0||btn<0||btn-items>4000)fail('フォルダ内の現在案件ボタンを安全に特定できません。変更していません。');
fs.copyFileSync(p,b);
try{
 const indent=(s.slice(0,btn).match(/\n([ \t]*)[^\n]*$/)||['',''])[1];
 // Important: inside `const items = [ ... ]`, a JSX comment cannot stand alone as an array element.
 // Put the marker in a normal JS block comment before the JSX element.
 const add=`/* ${marker} */\n${indent}<button className="savedExplorerFile savedExplorerSelectFile" type="button" key={(entry.storageKey || index) + '-select'} aria-pressed={selectedSavedKeys.includes(entry.storageKey)} onClick={() => toggleSavedSelection(entry.storageKey)}>\n${indent}  <span>{selectedSavedKeys.includes(entry.storageKey) ? '☑' : '□'}</span>\n${indent}  <div><strong>{selectedSavedKeys.includes(entry.storageKey) ? '選択中' : 'この案件を選択'}</strong><small>{baseName}</small></div>\n${indent}</button>,\n${indent}`;
 s=s.slice(0,btn)+add+s.slice(btn);
 fs.writeFileSync(p,s,'utf8');
 console.log('V4を適用しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: フォルダ内で案件単位の選択/解除を使えるようにしました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
