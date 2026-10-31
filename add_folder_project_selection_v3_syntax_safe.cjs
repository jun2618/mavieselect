const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-folder-project-selection-v3';
const marker='M-CROSS_FOLDER_PROJECT_SELECTION_V3_SYNTAX_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: V3適用済みです。');process.exit(0)}
const files=s.indexOf('<div className="savedExplorerFiles">');
if(files<0)fail('savedExplorerFiles が見つかりません。');
const items=s.indexOf('const items = [',files);
if(items<0||items-files>9000)fail('const items = [ を特定できません。');
const needle='<button className="savedExplorerFile" type="button" key={(entry.storageKey || index) + \'-current\'}';
const btn=s.indexOf(needle,items);
if(btn<0||btn-items>4000)fail('現在案件ボタンを特定できません。');
fs.copyFileSync(p,b);
try{
  // In a JS array, JSX may be preceded by a comment, but it must remain a valid array element.
  // Insert one complete JSX element immediately before the existing button and terminate it with a comma.
  const indent=(s.slice(0,btn).match(/\n([ \t]*)[^\n]*$/)||['',''])[1];
  const add=`{/* ${marker} */}\n${indent}<button className="savedExplorerFile savedExplorerSelectFile" type="button" key={(entry.storageKey || index) + '-select'} aria-pressed={selectedSavedKeys.includes(entry.storageKey)} onClick={() => toggleSavedSelection(entry.storageKey)}>\n${indent}  <span>{selectedSavedKeys.includes(entry.storageKey) ? '☑' : '□'}</span>\n${indent}  <div><strong>{selectedSavedKeys.includes(entry.storageKey) ? '選択中' : 'この案件を選択'}</strong><small>{baseName}</small></div>\n${indent}</button>,\n${indent}`;
  s=s.slice(0,btn)+add+s.slice(btn);
  fs.writeFileSync(p,s,'utf8');
  console.log('選択ボタンを追加しました。構文チェック兼ビルドを実行します。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: フォルダ内で案件を選択/解除できるV3を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('ビルド失敗のためApp.jsxを自動復旧しました。');
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  console.error(e.message||String(e));
  process.exit(1);
}
