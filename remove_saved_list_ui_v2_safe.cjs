const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-remove-saved-list-ui-v2';
const mark='M-CROSS_REMOVE_SAVED_LIST_UI_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: V2適用済みです。');process.exit(0)}
const state="  const [savedViewMode, setSavedViewMode] = useState('list')";
const sw=`              <div className="savedViewSwitch" aria-label="保存済み表示形式">\n                <button type="button" className={savedViewMode === 'list' ? 'active' : ''} onClick={() => setSavedViewMode('list')}>☰ 一覧表示</button>\n                <button type="button" className={savedViewMode === 'explorer' ? 'active' : ''} onClick={() => { setSavedViewMode('explorer'); setSavedFolderPath([]) }}>📁 フォルダ表示</button>\n              </div>`;
const explorer="              {savedViewMode === 'explorer' && visibleSavedEntries.length > 0 && (() => {";
const listOpen=`                <div className="savedList" style={{ display: savedViewMode === 'list' ? undefined : 'none' }}>`;
for(const [n,x] of [['state',state],['switch',sw],['explorer',explorer],['list',listOpen]]) if(!s.includes(x)) fail(n+' の対象コードが見つかりません。変更していません。');
fs.copyFileSync(p,b);
try{
  // Keep state harmlessly fixed to explorer, remove user-facing toggle.
  s=s.replace(state,`  /* ${mark} */\n  const savedViewMode = 'explorer'`);
  s=s.replace(sw,'');
  s=s.replace(explorer,"              {visibleSavedEntries.length > 0 && (() => {");
  // Do not surgically delete a large JSX branch: hide its root unconditionally.
  s=s.replace(listOpen,`                <div className="savedList" style={{ display: 'none' }} aria-hidden="true">`);
  fs.writeFileSync(p,s,'utf8');
  console.log('一覧/フォルダ切替を削除し、フォルダ表示を固定しました。一覧カードは安全のため内部に非表示で残します。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 保存済み画面はフォルダ表示専用です。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
