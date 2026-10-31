const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),appPath=path.join(root,'src','App.jsx'),editorPath=path.join(root,'src','EstimateRowEditor.jsx');
const appBak=appPath+'.before-additional-work-exclusion-v6',editorBak=editorPath+'.before-additional-work-exclusion-v6';
const marker='M-CROSS_ADDITIONAL_WORK_ESTIMATE_EXCLUSION_V6_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath)||!fs.existsSync(editorPath))fail('App.jsx または EstimateRowEditor.jsx が見つかりません。');
let app=fs.readFileSync(appPath,'utf8'),editor=fs.readFileSync(editorPath,'utf8');
if(app.includes(marker)){console.log('SKIP: その他工事の見積除外V6は適用済みです。');process.exit(0)}
const sig='export default function EstimateRowEditor({ value, onClose, onSave, onReset, onExclude }) {';
if(!editor.includes(sig))fail('V5適用後のEstimateRowEditorが見つかりません。');
const btnCond='{onExclude && (';if(!editor.includes(btnCond))fail('見積から外すボタンが見つかりません。');
const additionalMap=`                      rows: additionalWorks.map((item, additionalWorkIndex) => ({`;
if(!app.includes(additionalMap))fail('その他工事の見積行生成が見つかりません。');
const filterAnchor=`              const estimateRows = allEstimateRows.filter(row => !estimateEdits[estimateEditKey(row)]?.excluded)`;
if(!app.includes(filterAnchor))fail('V5の除外フィルターが見つかりません。');
fs.copyFileSync(appPath,appBak);fs.copyFileSync(editorPath,editorBak);
try{
  // その他工事行にも安定した除外キーを持たせる。
  app=app.replace(additionalMap,`${additionalMap}\n                        exclusionKey: 'additionalWork:' + (item.id || additionalWorkIndex),`);
  // estimateEditKeyではなく、その他工事は専用keyを優先。
  app=app.replace(filterAnchor,`              /* ${marker} */\n              const estimateRows = allEstimateRows.filter(row => !estimateEdits[row.exclusionKey || estimateEditKey(row)]?.excluded)`);
  // その他工事を編集画面へ渡すvalueに key は既に additionalWork:... が入っているため、V5 onExcludeをそのまま利用できる。
  // V5ではEditor側でその他工事を隠していない実装なので念のためボタン表示を明示的に全行許可する。
  editor=editor.replace(btnCond,`{/* ${marker}: その他工事も同じ除外ボタンを表示 */}\n        {onExclude && (`);
  fs.writeFileSync(appPath,app,'utf8');fs.writeFileSync(editorPath,editor,'utf8');
  console.log('変更を適用しました。自動ビルド確認を行います。');cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: その他工事も「見積から外す」に対応し、ビルド成功を確認しました。');
  console.log('その他工事データ自体は削除しません。');
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));if(fs.existsSync(appBak))fs.copyFileSync(appBak,appPath);if(fs.existsSync(editorBak))fs.copyFileSync(editorBak,editorPath);process.exit(1)}
