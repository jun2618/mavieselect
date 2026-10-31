const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-cross-finish-registration-v5';
const marker='M-CROSS_CROSS_FINISH_REGISTRATION_V5_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: V5適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CROSS_FINISH_STEP1_V4_SAFE'))fail('STEP1 V4が見つかりません。変更していません。');
const fnStart=s.indexOf('  function addCrossRecord(event) {');
const fnEnd=s.indexOf('\n  function deleteCrossRecord(id) {',fnStart);
if(fnStart<0||fnEnd<0)fail('addCrossRecordを特定できません。');
let fn=s.slice(fnStart,fnEnd);
const reset=`    setMemo('')\n    setCrossFinish('normal')\n    setSurfaceName('')\n    setActiveInput('height')`;
if(!fn.includes(reset))fail('登録後の通常クロスへ戻す処理を特定できません。');
const listNeedle=`                              <strong>{item.type}</strong>\n                              <small>{Number(item.height).toFixed(2)}m × {item.count}本</small>`;
if(!s.includes(listNeedle))fail('クロス登録一覧の表示位置を特定できません。');
fs.copyFileSync(p,b);
try{
  // Keep the selected finish/surface after registering, so consecutive measurements remain color when chosen.
  fn=fn.replace(reset,`    setMemo('')\n    /* ${marker} */\n    setActiveInput('height')`);
  s=s.slice(0,fnStart)+fn+s.slice(fnEnd);

  // Make the saved classification visible in the registration list.
  s=s.replace(listNeedle,`                              <strong>{item.type}{item.type === '壁' ? (item.crossFinish === 'color' ? '・カラークロス' : '・通常クロス') : ''}</strong>\n                              <small>{Number(item.height).toFixed(2)}m × {item.count}本</small>\n                              {item.type === '壁' && item.crossFinish === 'color' && item.surfaceName && <small>施工面：{item.surfaceName}</small>}`);

  fs.writeFileSync(p,s,'utf8');
  console.log('カラークロス登録後に通常クロスへ勝手に戻らないよう修正しました。');
  console.log('登録一覧にも「カラークロス / 施工面」を表示します。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: クロス種別登録V5を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
