const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const pkgFile='./package.json';
const marker='M-CROSS_FINAL_ORDER_EXCELJS_IMPORT_V2_SAFE';
const backup=file+'.exceljs-import-v2-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
if(!fs.existsSync(pkgFile))fail('package.json が見つかりません。');

const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('ExcelJS import修正V2はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_EXCEL_EXPORT_LIKE_ESTIMATE_V1_SAFE'))fail('本発注書Excel出力V1が見つかりません。');

const pkg=JSON.parse(fs.readFileSync(pkgFile,'utf8'));
const deps={...(pkg.dependencies||{}),...(pkg.devDependencies||{})};
if(!deps.exceljs)fail('package.json に exceljs がありません。見積書出力で使っている実ライブラリの確認が必要です。');

let next=original;

// 既存のexceljs importを確認。
const hasExcelJsImport=/from\s+['"]exceljs['"]/.test(next) || /import\s+['"]exceljs['"]/.test(next);

if(!hasExcelJsImport){
  // App.jsxのimport群の最後へ追加。
  const importMatches=[...next.matchAll(/^import[^\n]+$/gm)];
  if(!importMatches.length)fail('App.jsx のimport行を特定できません。');
  const last=importMatches[importMatches.length-1];
  const insertPos=last.index+last[0].length;
  next=next.slice(0,insertPos)+"\nimport ExcelJS from 'exceljs' // "+marker+next.slice(insertPos);
}else{
  // import済みの場合はマーカーだけ安全に追加。
  const firstImport=next.match(/^import[^\n]+$/m);
  if(!firstImport)fail('import行を特定できません。');
  const pos=firstImport.index+firstImport[0].length;
  next=next.slice(0,pos)+"\n// "+marker+next.slice(pos);
}

// 出力関数が誤って未定義globalを参照している場合、import済みExcelJSに統一。
const bad='const workbook=new ExcelJS.Workbook()';
if(!next.includes(bad))fail('本発注書Excel出力のWorkbook生成位置が見つかりません。');
// bad自体はimport追加後なら正しいのでそのまま。

if(next===original||!next.includes(marker))fail('ExcelJS import修正の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 本発注書Excel出力のExcelJS import修正V2を適用しました。');
  console.log('・ExcelJSをApp.jsxへ明示import');
  console.log('・本発注書Excel出力V1の処理は維持');
  console.log('・build失敗時は自動復旧');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('');
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
