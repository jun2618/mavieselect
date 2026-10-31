const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-merge-estimate-name-cells-v2';
const marker='M-CROSS_MERGE_ESTIMATE_NAME_CELLS_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 名称欄結合V2は適用済みです。');process.exit(0)}
const fs0=s.indexOf('async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {');
const fe=s.indexOf('\nasync function downloadEstimateExcelLegacy',fs0);
if(fs0<0||fe<0)fail('使用中の見積Excel出力関数を特定できません。');
let x=s.slice(fs0,fe);
const clearLoop="    for (let rowNumber = 23; rowNumber <= 54; rowNumber += 1) {";
const nameMarker='/* M-CROSS_ESTIMATE_NAME_FULL_WIDTH_V1_SAFE */';
if(!x.includes(clearLoop))fail('23～54行の初期化ループが見つかりません。');
if(!x.includes(nameMarker))fail('現在の横長名称出力V1が見つかりません。先に現状を維持します。');
fs.copyFileSync(p,b);
try{
  x=x.replace(clearLoop,`    /* ${marker} */\n    // 名称欄はテンプレート見出しと同じ横幅を使うため C:F を1セルとして結合する。\n    for (let rowNumber = 23; rowNumber <= 54; rowNumber += 1) {\n      const nameRange = ws.range('C' + rowNumber + ':F' + rowNumber)\n      if (!nameRange.merged()) nameRange.merged(true)`);
  s=s.slice(0,fs0)+x+s.slice(fe);
  fs.writeFileSync(p,s,'utf8');
  console.log('名称欄 C:F を明細行ごとに結合する修正を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 見積名称欄 C:F 結合V2を適用しました。');
  console.log('  - 文字サイズは変更しません');
  console.log('  - 数量 H / 単位 I / 単価 J / 金額 K は変更しません');
  console.log('  - ビルド失敗時は自動復旧します');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1);
}
