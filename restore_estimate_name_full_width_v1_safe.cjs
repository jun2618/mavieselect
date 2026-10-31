const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-estimate-name-full-width-v1';
const marker='M-CROSS_ESTIMATE_NAME_FULL_WIDTH_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 名称欄横長V1は適用済みです。');process.exit(0)}
const fs0=s.indexOf('async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {');
const fe=s.indexOf('\nasync function downloadEstimateExcelLegacy',fs0);
if(fs0<0||fe<0)fail('現在の見積Excel出力関数を特定できません。');
let x=s.slice(fs0,fe);
const splitBlock=`      if (format === 'split') {`;
const elseNeedle=`      } else {`;
const qtyNeedle=`\n      ws.cell('H' + rowNumber).value(cellValue(row?.quantity))`;
const sb=x.indexOf(splitBlock), q=x.indexOf(qtyNeedle,sb);
if(sb<0||q<0)fail('明細名称の出力ブロックを特定できません。');
fs.copyFileSync(p,b);
try{
 const replacement=`      /* ${marker} */\n      // 名称欄は C:F を分割せず、C に全文を入れて右隣の空セルへ表示させる。\n      // テンプレートの列幅・罫線・数量以降(H:K)は変更しない。\n      const nameText = format === 'split'\n        ? [...parts.filter(Boolean), memo].filter(Boolean).join(' ')\n        : [parts.join(' '), memo].filter(Boolean).join(' ')\n      ws.cell('C' + rowNumber).value(nameText)\n      ws.cell('D' + rowNumber).value('')\n      ws.cell('E' + rowNumber).value('')\n      ws.cell('F' + rowNumber).value('')\n`;
 x=x.slice(0,sb)+replacement+x.slice(q+1);
 s=s.slice(0,fs0)+x+s.slice(fe);
 fs.writeFileSync(p,s,'utf8');
 console.log('名称欄C:Fの分割出力をやめ、Cセルから横方向へ全文表示する方式に変更しました。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 見積名称欄 横長表示V1を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
