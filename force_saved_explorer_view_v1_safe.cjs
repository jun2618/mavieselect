const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-force-explorer-v1';
const marker='M-CROSS_FORCE_SAVED_EXPLORER_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: フォルダ表示固定V1は適用済みです。');process.exit(0)}
const state="  const [savedViewMode, setSavedViewMode] = useState('list')";
const switchStart='              <div className="savedViewSwitch" aria-label="保存済み表示形式">';
const switchEnd='              </div>';
const listOpen='              {visibleSavedEntries.length === 0 ? (';
if(!s.includes(state)||!s.includes(switchStart)||!s.includes(listOpen))fail('対象コードが想定と一致しません。変更していません。');
fs.copyFileSync(p,b);
try{
 s=s.replace(state,`  /* ${marker} */\n  const [savedViewMode, setSavedViewMode] = useState('explorer')`);
 const st=s.indexOf(switchStart), en=s.indexOf(switchEnd,st);
 if(st<0||en<0)throw new Error('表示切替UIの範囲を特定できません。');
 s=s.slice(0,st)+s.slice(en+switchEnd.length+1);
 // 一覧カードは削除せず非表示のまま残す。既存explorer描画にだけ固定するので復旧が容易。
 s=s.replace("{savedViewMode === 'explorer' && visibleSavedEntries.length > 0 && (() => {","{visibleSavedEntries.length > 0 && (() => {");
 // empty state remains useful. list card already has display based on savedViewMode and will stay none.
 fs.writeFileSync(p,s,'utf8');
 console.log('フォルダ表示を初期・固定表示にしました。一覧カードのコード自体は安全のため残しています。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 保存済み画面をフォルダ表示固定にしました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
