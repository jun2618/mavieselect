const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-estimate-name-c-to-g-v3';
const marker='M-CROSS_ESTIMATE_NAME_C_TO_G_V3_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: C:G名称欄V3は適用済みです。');process.exit(0)}
const fs0=s.indexOf('async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {');
const fe=s.indexOf('\nasync function downloadEstimateExcelLegacy',fs0);
if(fs0<0||fe<0)fail('使用中のdownloadEstimateExcelを特定できません。');
let x=s.slice(fs0,fe);
const oldRange="      const nameRange = ws.range('C' + rowNumber + ':F' + rowNumber)";
const oldF="      ws.cell('F' + rowNumber).value('')";
if((x.split(oldRange).length-1)!==1)fail('C:F結合処理が1件ではありません。現状を変更していません。');
if((x.split(oldF).length-1)!==1)fail('名称欄Fクリア処理が1件ではありません。現状を変更していません。');
fs.copyFileSync(p,b);
try{
 x=x.replace(oldRange,`      /* ${marker} */\n      const nameRange = ws.range('C' + rowNumber + ':G' + rowNumber)`);
 x=x.replace(oldF,`${oldF}\n      ws.cell('G' + rowNumber).value('')`);
 s=s.slice(0,fs0)+x+s.slice(fe);
 fs.writeFileSync(p,s,'utf8');
 console.log('名称欄を C:G に拡張しました。名称とメモは同じセル内に1行で連結します。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 見積名称欄 C:G 結合V3を適用しました。');
 console.log('  - 名称 + メモ: C:G');
 console.log('  - 数量: H / 単位: I / 単価: J / 金額: K');
 console.log('  - shrinkToFitは使用しません');
 console.log('  - 文字サイズ・行高・金額列は変更しません');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
