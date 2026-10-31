const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-split-vs-combined-v1';
const marker='M-CROSS_ESTIMATE_SPLIT_VS_COMBINED_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 分ける/まとめる修正V1は適用済みです。');process.exit(0)}
const a=s.indexOf('async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {');
const z=s.indexOf('\nasync function downloadEstimateExcelLegacy',a);
if(a<0||z<0)fail('使用中の見積Excel関数を特定できません。');
let x=s.slice(a,z);
const rangeOld="      const nameRange = ws.range('C' + rowNumber + ':G' + rowNumber)\n      if (!nameRange.merged()) nameRange.merged(true)";
const fullStart=x.indexOf('      /* M-CROSS_ESTIMATE_NAME_FULL_WIDTH_V1_SAFE */');
const qty=x.indexOf("\n      ws.cell('H' + rowNumber).value(cellValue(row?.quantity))",fullStart);
if(!x.includes(rangeOld))fail('現在のC:G結合処理を特定できません。');
if(fullStart<0||qty<0)fail('現在の名称出力ブロックを特定できません。');
fs.copyFileSync(p,b);
try{
  x=x.replace(rangeOld,`      /* ${marker} */\n      // 「分ける」では C:G を結合しない。「まとめる」だけ C:G を結合する。\n      const nameRange = ws.range('C' + rowNumber + ':G' + rowNumber)\n      if (format !== 'split' && !nameRange.merged()) nameRange.merged(true)`);
  const replacement=`      /* M-CROSS_ESTIMATE_NAME_FULL_WIDTH_V1_SAFE */\n      if (format === 'split') {\n        const splitParts = [0, 1, 2, 3].map(index => parts[index] || '')\n        ;['C', 'D', 'E', 'F'].forEach((column, partIndex) => {\n          ws.cell(column + rowNumber).value(splitParts[partIndex])\n        })\n        ws.cell('G' + rowNumber).value('')\n        if (memo) {\n          let memoIndex = -1\n          for (let index = 3; index >= 0; index -= 1) {\n            if (!splitParts[index]) { memoIndex = index; break }\n          }\n          if (memoIndex >= 0) ws.cell(['C', 'D', 'E', 'F'][memoIndex] + rowNumber).value(memo)\n          else ws.cell('G' + rowNumber).value(memo)\n        }\n      } else {\n        const nameText = [parts.join(' '), memo].filter(Boolean).join(' ')\n        ws.cell('C' + rowNumber).value(nameText)\n        ws.cell('D' + rowNumber).value('')\n        ws.cell('E' + rowNumber).value('')\n        ws.cell('F' + rowNumber).value('')\n        ws.cell('G' + rowNumber).value('')\n      }\n`;
  x=x.slice(0,fullStart)+replacement+x.slice(qty+1);
  s=s.slice(0,a)+x+s.slice(z);
  fs.writeFileSync(p,s,'utf8');
  console.log('「分ける」と「まとめる」のExcelレイアウトを分離しました。ビルド確認します。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 分ける=非結合 / まとめる=C:G結合 を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
