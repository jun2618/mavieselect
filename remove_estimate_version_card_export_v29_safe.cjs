const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_REMOVE_ESTIMATE_VERSION_CARD_EXPORT_V29_SAFE';
const backup=file+'.remove-version-card-export-v29-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('V29はすでに適用されています。');
let next=original;

// App.jsx 側の onDownloadVersion 有無に関係なく、カード上の版出力ボタンをCSSで確実に非表示にする。
// 保存済み見積カード周辺にある「削除」は残す。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');

const css=`  /* ${marker} */
  /* 保存済み見積カードの「この版を出力」だけ非表示。削除ボタンは維持。 */
  .savedEstimateVersionExportButton,
  .estimateVersionDownloadButton,
  button[aria-label="この版を出力"],
  button[title="この版を出力"]{display:none!important}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

// EstimatePreview等で onDownloadVersion により描画される場合に備え、prop名も無効化。
// 既にV28で消えていれば何もしない。
next=next.replace(/\s+onDownloadVersion=\{version\s*=>\s*downloadEstimateExcel\(\{[\s\S]*?\}\s*,\s*version\.rows\s*\|\|\s*\[\]\s*,\s*version\.copyFormat\s*\|\|\s*estimateCopyFormat\s*,\s*version\.additionalWorks\s*\|\|\s*\[\]\s*\)\}/,'');

if(next===original||!next.includes(marker))fail('V29の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');console.log('OK: 保存済み見積カードの版出力削除V29を適用しました。');
 console.log('・「この版を出力」を非表示');
 console.log('・削除ボタンは維持');
 console.log('・保存履歴/金額/日時は維持');
 console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
