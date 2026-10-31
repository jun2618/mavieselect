const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-cross-finish-registration-v6';
const mark='M-CROSS_CROSS_FINISH_REGISTRATION_V6_MINIMAL_SAFE';
function die(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))die('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: V6適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CROSS_FINISH_STEP1_V4_SAFE'))die('STEP1 V4が見つかりません。');
const a=s.indexOf('  function addCrossRecord(event) {'),e=s.indexOf('\n  function deleteCrossRecord(id) {',a);
if(a<0||e<0)die('addCrossRecordを特定できません。');
let f=s.slice(a,e);
// STEP1 V4 may already preserve the selection depending on exact generated variant.
// Only ensure the record actually captures the selected state and make it visible in the list.
const qty='      quantity: numericHeight * numericCount,';
if(!f.includes("crossFinish: measurementType === '壁' ? crossFinish : 'normal'")){
 if(!f.includes(qty))die('quantity行を特定できません。');
 f=f.replace(qty,qty+"\n      crossFinish: measurementType === '壁' ? crossFinish : 'normal',\n      surfaceName: measurementType === '壁' && crossFinish === 'color' ? surfaceName.trim() : '',");
}
// Remove reset if present, otherwise leave untouched.
f=f.replace("\n    setCrossFinish('normal')",'').replace("\n    setSurfaceName('')",'');
s=s.slice(0,a)+f+s.slice(e);
const listA='                              <strong>{item.type}</strong>';
const listB='                              <small>{Number(item.height).toFixed(2)}m × {item.count}本</small>';
const lp=s.indexOf(listA,s.indexOf('roomRecords.map(item =>'));
if(lp<0)die('クロス登録一覧を特定できません。');
const bp=s.indexOf(listB,lp);
if(bp<0||bp-lp>500)die('クロス登録一覧の寸法表示を特定できません。');
s=s.slice(0,lp)+`                              {/* ${mark} */}\n                              <strong>{item.type}{item.type === '壁' ? (item.crossFinish === 'color' ? '・カラークロス' : '・通常クロス') : ''}</strong>\n`+s.slice(lp+listA.length+1);
const bp2=s.indexOf(listB,lp);
s=s.slice(0,bp2+listB.length)+"\n                              {item.type === '壁' && item.crossFinish === 'color' && item.surfaceName && <small>施工面：{item.surfaceName}</small>}"+s.slice(bp2+listB.length);
fs.copyFileSync(p,b);
try{
 fs.writeFileSync(p,s,'utf8');
 console.log('V6: 選択中のクロス種別を登録データへ保存し、登録一覧へ表示する最小修正を適用しました。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: V6ビルド成功。見積変換ルールはまだ変更していません。');
 console.log('BACKUP: '+b);
}catch(err){console.error('適用またはビルド失敗のため自動復旧します。');console.error(err.message||String(err));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
