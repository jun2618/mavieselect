const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-reset-cross-finish-after-registration-v7';
const mark='M-CROSS_RESET_CROSS_FINISH_AFTER_REGISTRATION_V7_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p)) fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: V7適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CROSS_FINISH_STEP1_V4_SAFE')) fail('通常/カラークロスSTEP1が見つかりません。');
const a=s.indexOf('  function addCrossRecord(event) {');
const e=s.indexOf('\n  function deleteCrossRecord(id) {',a);
if(a<0||e<0) fail('addCrossRecordを特定できません。');
let f=s.slice(a,e);
const memoReset="    setMemo('')";
const pos=f.indexOf(memoReset);
if(pos<0||f.indexOf(memoReset,pos+1)>=0) fail('addCrossRecord内のsetMemoリセットを一意に特定できません。');
// If resets already follow setMemo, don't duplicate.
const tail=f.slice(pos+memoReset.length,pos+memoReset.length+120);
if(tail.includes("setCrossFinish('normal')")){console.log('SKIP: 登録後に通常クロスへ戻る処理は既にあります。');process.exit(0)}
fs.copyFileSync(p,b);
try{
  f=f.slice(0,pos+memoReset.length)+`\n    /* ${mark} */\n    setCrossFinish('normal')\n    setSurfaceName('')`+f.slice(pos+memoReset.length);
  s=s.slice(0,a)+f+s.slice(e);
  fs.writeFileSync(p,s,'utf8');
  console.log('クロス登録後の初期値を「通常クロス」に戻す処理を追加しました。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 登録後は通常クロスに戻り、施工面もクリアされます。');
  console.log('BACKUP: '+b);
}catch(err){console.error('適用またはビルド失敗のため自動復旧します。');console.error(err.message||String(err));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
