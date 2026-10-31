const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-color-coded-measurement-sheets-v1';
const mark='M-CROSS_COLOR_CODED_MEASUREMENT_SHEETS_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 色分けV1は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_COMBINED_ESTIMATE_MEASUREMENT_EXPORT_V2_STRUCTURAL_SAFE'))fail('一括出力V2が見つかりません。変更していません。');
const fnStart=s.indexOf('async function downloadCombinedEstimateMeasurementExcel(');
const fnEnd=s.indexOf('\nasync function downloadEstimateExcelLegacy',fnStart);
if(fnStart<0||fnEnd<0)fail('一括出力関数を特定できません。');
let block=s.slice(fnStart,fnEnd);
const addStart=block.indexOf('    function addSheet(');
const crossCall=block.indexOf("    addSheet('クロス採寸'",addStart);
if(addStart<0||crossCall<0)fail('採寸シート生成処理を特定できません。');
const oldHelper=block.slice(addStart,crossCall);
if(!oldHelper.includes("fill:'6E91E8'"))fail('現在の共通ヘッダー色を特定できません。');
const helper=`    /* ${mark} */\n    function addSheet(name,headers,data,colors){\n      const old=workbook.sheet(name); if(old)workbook.deleteSheet(name)\n      const sh=workbook.addSheet(name)\n      const headerColor=colors.header, paleColor=colors.pale, titleColor=colors.title || headerColor\n      sh.cell('A1').value(name+' 採寸データ').style({bold:true,fontSize:16,fill:titleColor,fontColor:'FFFFFF'})\n      [['管理会社',entry.company||''],['物件名',entry.propertyName||''],['住所',entry.address||''],['号室',entry.unit||'']].forEach((v,i)=>{\n        sh.cell(3+i,1).value(v[0]).style({bold:true,fill:paleColor})\n        sh.cell(3+i,2).value(v[1])\n      })\n      headers.forEach((h,i)=>sh.cell(8,i+1).value(h).style({bold:true,fill:headerColor,fontColor:'FFFFFF',horizontalAlignment:'center'}))\n      data.forEach((row,ri)=>row.forEach((v,ci)=>{\n        const cell=sh.cell(9+ri,1+ci).value(v)\n        if(ri%2===1) cell.style('fill',paleColor)\n      }))\n      headers.forEach((_,i)=>sh.column(i+1).width(i===0?16:14))\n      sh.freezePanes(8,0)\n    }\n`;
block=block.slice(0,addStart)+helper+block.slice(crossCall);
const replacements=[
 ["    addSheet('クロス採寸',","    addSheet('クロス採寸',"],
];
// Append palette argument to each addSheet call by replacing the closing double-parentheses unique per line.
const lines=block.split('\n');
const palettes={
 'クロス採寸':"{header:'5271C4',pale:'EAF0FF',title:'3658A7'}",
 'CF採寸':"{header:'2F9E75',pale:'E8F7F1',title:'237A5B'}",
 'ソフト巾木':"{header:'D08A28',pale:'FFF4DF',title:'A86B17'}",
 '床見切り':"{header:'8762B8',pale:'F2EBFA',title:'68458F'}",
 'その他工事':"{header:'C45E68',pale:'FCECEF',title:'9E434D'}",
};
for(let i=0;i<lines.length;i++){
 const m=lines[i].match(/^    addSheet\('([^']+)'/);
 if(!m||!palettes[m[1]])continue;
 const idx=lines[i].lastIndexOf('))');
 if(idx<0)fail(m[1]+'シート呼出しの終了を特定できません。');
 lines[i]=lines[i].slice(0,idx)+','+palettes[m[1]]+lines[i].slice(idx);
}
block=lines.join('\n');
for(const name of Object.keys(palettes)) if(!block.includes("addSheet('"+name))fail(name+'呼出しが見つかりません。');
fs.copyFileSync(p,b);
try{
 s=s.slice(0,fnStart)+block+s.slice(fnEnd);
 fs.writeFileSync(p,s,'utf8');
 console.log('一括Excelの採寸シートを種類別に色分けしました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 採寸シート色分けV1を適用しました。');
 console.log('クロス=青 / CF=緑 / ソフト巾木=橙 / 床見切り=紫 / その他工事=赤');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
