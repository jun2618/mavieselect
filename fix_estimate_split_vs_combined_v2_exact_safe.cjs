const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-split-vs-combined-v2';
const marker='M-CROSS_ESTIMATE_SPLIT_VS_COMBINED_V2_EXACT_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: V2適用済みです。');process.exit(0)}
const a=s.indexOf('async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {');
const z=s.indexOf('\nasync function downloadEstimateExcelLegacy',a);
if(a<0||z<0)fail('使用中の見積Excel関数を特定できません。');
let x=s.slice(a,z);
const start='      /* M-CROSS_ESTIMATE_NAME_FULL_WIDTH_V1_SAFE */';
const end="      ws.cell('H' + rowNumber).value(cellValue(row?.quantity))";
const si=x.indexOf(start),ei=x.indexOf(end,si);
if(si<0||ei<0)fail('名称出力ブロックを特定できません。変更していません。');
if(x.indexOf(start,si+1)>=0)fail('名称出力ブロックが複数あります。変更していません。');
fs.copyFileSync(p,b);
try{
 const newBlock=`      /* ${marker} */\n      if (format === 'split') {\n        // 分ける: C/D/E/F/G は結合せず、項目を個別表示する。\n        // 既に結合されている場合だけ解除する。\n        const splitRange = ws.range('C' + rowNumber + ':G' + rowNumber)\n        if (splitRange.merged()) splitRange.merged(false)\n        const splitParts = [0, 1, 2, 3].map(partIndex => parts[partIndex] || '')\n        ws.cell('C' + rowNumber).value(splitParts[0])\n        ws.cell('D' + rowNumber).value(splitParts[1])\n        ws.cell('E' + rowNumber).value(splitParts[2])\n        ws.cell('F' + rowNumber).value(splitParts[3])\n        ws.cell('G' + rowNumber).value(memo)\n      } else {\n        // まとめる: C:G を1つの名称欄として使い、名称とメモを続けて表示する。\n        const combinedRange = ws.range('C' + rowNumber + ':G' + rowNumber)\n        if (!combinedRange.merged()) combinedRange.merged(true)\n        const nameText = [parts.join(' '), memo].filter(Boolean).join(' ')\n        ws.cell('C' + rowNumber).value(nameText)\n      }\n`;
 x=x.slice(0,si)+newBlock+x.slice(ei);
 s=s.slice(0,a)+x+s.slice(z);
 fs.writeFileSync(p,s,'utf8');
 console.log('分ける/まとめるの名称欄だけを置換しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 分ける=非結合 C,D,E,F + メモG / まとめる=C:G結合 を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
