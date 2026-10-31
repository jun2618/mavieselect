const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(), p=path.join(root,'src','App.jsx'), b=p+'.before-remove-saved-list-ui-v1';
const marker='M-CROSS_REMOVE_SAVED_LIST_UI_V1_EXACT_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p)) fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 一覧表示UI削除V1は適用済みです。');process.exit(0)}
const state="  const [savedViewMode, setSavedViewMode] = useState('list')";
const switchStart='              <div className="savedViewSwitch" aria-label="保存済み表示形式">';
const explorerOld="              {savedViewMode === 'explorer' && visibleSavedEntries.length > 0 && (() => {";
const listStart="              {visibleSavedEntries.length === 0 ? (";
if(!s.includes(state)||!s.includes(switchStart)||!s.includes(explorerOld)||!s.includes(listStart)) fail('対象コードが現状と一致しません。変更していません。');
fs.copyFileSync(p,b);
try{
  // 1. view mode stateは削除。フォルダ階層stateは保持。
  s=s.replace(state,`  /* ${marker} */`);

  // 2. 表示切替UIだけ削除。
  const swStart=s.indexOf(switchStart);
  const swEnd=s.indexOf('              </div>',swStart);
  if(swStart<0||swEnd<0) throw new Error('表示切替UIの範囲を特定できません。');
  s=s.slice(0,swStart)+s.slice(swEnd+'              </div>'.length+1);

  // 3. フォルダ表示条件からsavedViewModeだけ外す。
  s=s.replace(explorerOld,"              {visibleSavedEntries.length > 0 && (() => {");

  // 4. 一覧カード描画だけ削除。empty表示は残す。
  const currentListStart=s.indexOf(listStart);
  if(currentListStart<0) throw new Error('一覧/空表示ブロック開始位置なし');
  const listDiv=s.indexOf('<div className="savedList"',currentListStart);
  if(listDiv<0) throw new Error('一覧カード開始位置なし');
  const elseToken=') : (';
  const elsePos=s.lastIndexOf(elseToken,listDiv);
  if(elsePos<currentListStart) throw new Error('一覧カードelse位置なし');
  const listCloseToken='              )}\n';
  const afterList=s.indexOf(listCloseToken,listDiv);
  if(afterList<0) throw new Error('一覧カード終了位置なし');
  // empty state条件を単独表示へ。リスト側は取り除く。
  const emptyPart=s.slice(currentListStart,elsePos).replace(/\s*$/,'') + '\n              )}\n';
  s=s.slice(0,currentListStart)+emptyPart+s.slice(afterList+listCloseToken.length);

  fs.writeFileSync(p,s,'utf8');
  console.log('一覧表示UIだけ削除しました。フォルダ表示・検索・管理会社・並び順・選択削除は保持します。');
  console.log('自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 保存済み画面をフォルダ表示専用に整理しました。');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b)) fs.copyFileSync(b,p);
  process.exit(1);
}
