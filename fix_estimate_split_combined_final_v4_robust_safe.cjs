const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-estimate-split-combined-final-v4';
const marker='M-CROSS_ESTIMATE_SPLIT_COMBINED_FINAL_V4_ROBUST_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p)) fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 最終仕様V4は適用済みです。');process.exit(0)}
const fn=s.indexOf('async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {');
const endFn=s.indexOf('\nasync function downloadEstimateExcelLegacy',fn);
if(fn<0||endFn<0) fail('使用中のdownloadEstimateExcelを特定できません。');
let x=s.slice(fn,endFn);
const output=x.indexOf('    outputRows.forEach((row, index) => {');
const memo=x.indexOf("      const memo = String(row?.memo || '').trim()",output);
const qty=x.indexOf("      ws.cell('H' + rowNumber).value(cellValue(row?.quantity))",memo);
if(output<0||memo<0||qty<0||qty-memo>3000) fail('名称出力範囲を構造的に特定できません。変更していません。');
const afterMemo=x.indexOf('\n',memo)+1;
fs.copyFileSync(p,b);
try{
 const layout=`\n      /* ${marker} */\n      if (format === 'split') {\n        // 社員見本: C=項目1 D=項目2 E=項目3 F=項目4+メモ G=空欄\n        const splitRange = ws.range('C' + rowNumber + ':G' + rowNumber)\n        if (splitRange.merged()) splitRange.merged(false)\n        const p0 = String(rawParts[0] || '').trim()\n        const p1 = String(rawParts[1] || '').trim()\n        const p2 = String(rawParts[2] || '').trim()\n        const p3 = String(rawParts[3] || '').trim()\n        ws.cell('C' + rowNumber).value(p0)\n        ws.cell('D' + rowNumber).value(p1)\n        ws.cell('E' + rowNumber).value(p2)\n        ws.cell('F' + rowNumber).value([p3, memo].filter(Boolean).join(' '))\n        ws.cell('G' + rowNumber).value('')\n      } else {\n        // まとめる: C:G結合、項目1〜4+メモを1行表示\n        const combinedRange = ws.range('C' + rowNumber + ':G' + rowNumber)\n        if (!combinedRange.merged()) combinedRange.merged(true)\n        ws.cell('C' + rowNumber).value([...rawParts.filter(Boolean), memo].filter(Boolean).join(' '))\n      }\n`;
 x=x.slice(0,afterMemo)+layout+x.slice(qty);
 s=s.slice(0,fn)+x+s.slice(endFn);
 fs.writeFileSync(p,s,'utf8');
 console.log('社員見本の最終仕様を現在コードへ構造判定で適用しました。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 分ける=C/D/E/F、メモはF、G空欄。まとめる=C:G結合。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
