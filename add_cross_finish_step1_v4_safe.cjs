const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-cross-finish-step1-v4';
const mark='M-CROSS_CROSS_FINISH_STEP1_V4_SAFE';
function die(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))die('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: STEP1 V4は適用済みです。');process.exit(0)}
const mtype="  const [measurementType, setMeasurementType] = useState('天井')";
const mp=s.indexOf(mtype), memoState="  const [memo, setMemo] = useState('')", sp=s.indexOf(memoState,mp);
const af=s.indexOf('  function addCrossRecord(event) {'), ae=s.indexOf('\n  function deleteCrossRecord(id) {',af);
const placeholder='placeholder="例：窓面、部分張替え"', ph=s.indexOf(placeholder), label=s.lastIndexOf('                        <label>',ph);
if(mp<0||sp<0||sp-mp>1000||af<0||ae<0||ph<0||label<0)die('必要位置を特定できません。変更していません。');
let fn=s.slice(af,ae);
const validation='    if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return';
const qty='      quantity: numericHeight * numericCount,';
const memoReset="    setMemo('')";
if(!fn.includes(validation)||!fn.includes(qty)||!fn.includes(memoReset))die('addCrossRecordの現在コードが想定と違います。変更していません。');
fs.copyFileSync(p,b);
try{
  s=s.slice(0,sp+memoState.length)+`\n  /* ${mark} */\n  const [crossFinish, setCrossFinish] = useState('normal')\n  const [surfaceName, setSurfaceName] = useState('')`+s.slice(sp+memoState.length);
  let a=s.indexOf('  function addCrossRecord(event) {'), e=s.indexOf('\n  function deleteCrossRecord(id) {',a), f=s.slice(a,e);
  f=f.replace(validation,validation+`\n    if (measurementType === '壁' && crossFinish === 'color' && !surfaceName.trim()) {\n      window.alert('カラークロスの施工面を入力してください。')\n      return\n    }`);
  f=f.replace(qty,qty+`\n      crossFinish: measurementType === '壁' ? crossFinish : 'normal',\n      surfaceName: measurementType === '壁' && crossFinish === 'color' ? surfaceName.trim() : '',`);
  // Insert resets directly after the unique setMemo line within this function, independent of adjacent lines.
  const resetPos=f.indexOf(memoReset);
  if(resetPos<0||f.indexOf(memoReset,resetPos+1)>=0)throw new Error('addCrossRecord内のsetMemoリセットが一意ではありません。');
  f=f.slice(0,resetPos+memoReset.length)+`\n    setCrossFinish('normal')\n    setSurfaceName('')`+f.slice(resetPos+memoReset.length);
  s=s.slice(0,a)+f+s.slice(e);
  // Insert UI before the cross memo label.
  const ph2=s.indexOf(placeholder), l=s.lastIndexOf('                        <label>',ph2);
  const ui=`                        {measurementType === '壁' && (\n                          <section className="crossFinishPanel" aria-label="クロス種別">\n                            <span>クロス種別</span>\n                            <div className="crossFinishButtons">\n                              <button type="button" className={crossFinish === 'normal' ? 'active' : ''} onClick={() => { setCrossFinish('normal'); setSurfaceName(''); markUnsaved() }}>通常クロス</button>\n                              <button type="button" className={crossFinish === 'color' ? 'active' : ''} onClick={() => { setCrossFinish('color'); markUnsaved() }}>カラークロス</button>\n                            </div>\n                            {crossFinish === 'color' && <label><span>施工面</span><input value={surfaceName} onChange={event => { setSurfaceName(event.target.value); markUnsaved() }} placeholder="例：バルコニー、正面" /></label>}\n                          </section>\n                        )}\n`;
  s=s.slice(0,l)+ui+s.slice(l);
  const css='  .measurementActions { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; margin:16px 0 20px; }';
  if(!s.includes(css))throw new Error('CSS挿入位置が見つかりません。');
  s=s.replace(css,css+`\n  .crossFinishPanel{display:grid;gap:10px;margin:0 0 18px;padding:14px;border:1px solid #ead8cb;border-radius:14px;background:#fffaf5}.crossFinishPanel>span,.crossFinishPanel label>span{color:#817183;font-size:15px;font-weight:800}.crossFinishButtons{display:grid;grid-template-columns:1fr 1fr;gap:8px}.crossFinishButtons button{min-height:48px;border:1px solid #d8c9df;border-radius:12px;background:#fff;color:#65596a;font:inherit;font-weight:800}.crossFinishButtons button.active{color:#fff;border-color:#6e91e8;background:#6e91e8}.crossFinishPanel label{margin:0}`);
  fs.writeFileSync(p,s,'utf8');
  console.log('STEP1: 通常/カラークロス選択と施工面保存だけ追加しました。ビルド確認します。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: STEP1 V4適用成功。見積変換ルールはまだ変更していません。');
  console.log('BACKUP: '+b);
}catch(err){console.error('適用またはビルド失敗のため自動復旧します。');console.error(err.message||String(err));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
