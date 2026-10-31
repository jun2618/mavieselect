const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-simplify-folder-delete-v2';
const marker='M-CROSS_SIMPLIFY_FOLDER_DELETE_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 個別削除整理V2は適用済みです。');process.exit(0)}
const selectStart='                            /* M-CROSS_FOLDER_PROJECT_SELECTION_V4_ARRAY_SAFE */';
const selectEnd='                            </button>,';
const toolbarStart="              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 18px' }}>";
if(!s.includes(selectStart)||!s.includes(toolbarStart))fail('必要な現在コードを特定できません。変更していません。');
// Verify individual delete buttons already exist for both current project and saved revisions.
if(!s.includes('deleteSavedEntry(entry)'))fail('案件個別削除が見つかりません。');
if(!s.includes("window.confirm('この保存済み見積を削除しますか？')"))fail('保存済み見積の個別削除が見つかりません。');
fs.copyFileSync(p,b);
try{
  // Remove top bulk selection toolbar structurally.
  const ts=s.indexOf(toolbarStart);
  let pos=s.indexOf('>',ts)+1,depth=1;
  while(depth>0){
    const no=s.indexOf('<div',pos), nc=s.indexOf('</div>',pos);
    if(nc<0)throw new Error('上部選択ツールバーの終了位置を特定できません。');
    if(no>=0&&no<nc){depth++;pos=s.indexOf('>',no)+1}else{depth--;pos=nc+6}
  }
  s=s.slice(0,ts)+`              {/* ${marker} */}\n`+s.slice(pos);
  // Remove V4 selection card only; keep current project row and its delete button.
  const ss=s.indexOf(selectStart);
  const se=s.indexOf(selectEnd,ss);
  if(ss<0||se<0)throw new Error('案件選択カード範囲を特定できません。');
  s=s.slice(0,ss)+s.slice(se+selectEnd.length+1);
  fs.writeFileSync(p,s,'utf8');
  console.log('一括選択UIと「この案件を選択」を削除しました。個別削除ボタンは保持します。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: フォルダ画面を個別削除方式に整理しました。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
