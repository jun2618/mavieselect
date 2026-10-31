const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(), p=path.join(root,'src','App.jsx'), b=p+'.before-estimate-total-recalc-v2';
const marker='M-CROSS_ESTIMATE_TOTAL_RECALC_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p)) fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: V2適用済みです。');process.exit(0)}
const re=/([ \t]*)const additionalWorkTotal = additionalWorks\.reduce\(\(sum, item\) => sum \+ \(Number\(item\.amount\) \|\| \(Number\(item\.quantity\) \|\| 0\) \* \(Number\(item\.unitPrice\) \|\| 0\)\), 0\)\r?\n\1const totalAmount = estimateRows\.reduce\(\(sum, row\) => sum \+ row\.amount, 0\) \+ additionalWorkTotal/;
const m=s.match(re); if(!m) fail('現在の合計計算2行を特定できません。変更していません。');
fs.copyFileSync(p,b);
try{
 const i=m[1];
 const repl=`${i}/* ${marker} */\n${i}const visibleAdditionalWorks = additionalWorks.filter((item, index) => {\n${i}  const key = 'additionalWork:' + (item.id || index)\n${i}  return !estimateEdits[key]?.excluded\n${i}})\n${i}const additionalWorkTotal = visibleAdditionalWorks.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)\n${i}const totalAmount = estimateRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) + additionalWorkTotal`;
 s=s.replace(re,repl);
 const map=`                      rows: additionalWorks.map((item, additionalWorkIndex) => ({`;
 if(s.includes(map)) s=s.replace(map,`                      rows: visibleAdditionalWorks.map((item, additionalWorkIndex) => ({`);
 const empty=`                  {estimateRows.length === 0 && additionalWorks.length === 0 ? (`;
 if(s.includes(empty)) s=s.replace(empty,`                  {estimateRows.length === 0 && visibleAdditionalWorks.length === 0 ? (`);
 fs.writeFileSync(p,s,'utf8');
 console.log('変更を適用しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 除外後の項目だけで合計金額を再計算するV2を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルドに失敗したため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
