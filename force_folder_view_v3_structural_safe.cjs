const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-force-folder-view-v3';
const marker='M-CROSS_FORCE_FOLDER_VIEW_V3_STRUCTURAL_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p)) fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: V3適用済みです。');process.exit(0)}
const state=/^\s*const \[savedViewMode, setSavedViewMode\] = useState\('list'\)\s*$/m;
const switchStart='<div className="savedViewSwitch"';
const explorerCond="{savedViewMode === 'explorer' && visibleSavedEntries.length > 0 && (() => {";
const listStyle="style={{ display: savedViewMode === 'list' ? undefined : 'none' }}";
if(!state.test(s)) fail('savedViewMode stateが見つかりません。変更していません。');
if(!s.includes(switchStart)) fail('savedViewSwitchが見つかりません。変更していません。');
if(!s.includes(explorerCond)) fail('フォルダ表示条件が見つかりません。変更していません。');
if(!s.includes(listStyle)) fail('一覧表示条件が見つかりません。変更していません。');
fs.copyFileSync(p,b);
try{
  s=s.replace(state,`  /* ${marker} */\n  const savedViewMode = 'explorer'`);
  // Remove the switch structurally, independent of Japanese text/encoding.
  const st=s.indexOf(switchStart);
  const openEnd=s.indexOf('>',st)+1;
  let pos=openEnd,depth=1;
  while(depth>0){
    const nextOpen=s.indexOf('<div',pos), nextClose=s.indexOf('</div>',pos);
    if(nextClose<0) throw new Error('savedViewSwitch終了位置を特定できません。');
    if(nextOpen>=0 && nextOpen<nextClose){depth++;pos=s.indexOf('>',nextOpen)+1;} else {depth--;pos=nextClose+6;}
  }
  s=s.slice(0,st)+s.slice(pos);
  s=s.replace(explorerCond,"{visibleSavedEntries.length > 0 && (() => {");
  // Keep list JSX intact but permanently hidden, avoiding risky large-block deletion.
  s=s.replace(listStyle,"style={{ display: 'none' }} aria-hidden=\"true\"");
  fs.writeFileSync(p,s,'utf8');
  console.log('切替UIを削除し、フォルダ表示を固定しました。一覧コードは非表示で温存しています。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: フォルダ表示固定V3を適用し、ビルド成功を確認しました。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
