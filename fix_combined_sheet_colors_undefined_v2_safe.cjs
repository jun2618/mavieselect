const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-fix-combined-sheet-colors-v2';
const mark='M-CROSS_FIX_COMBINED_SHEET_COLORS_UNDEFINED_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 色分けエラー修正V2は適用済みです。');process.exit(0)}
const fnStart=s.indexOf('async function downloadCombinedEstimateMeasurementExcel(');
const fnEnd=s.indexOf('\nasync function downloadEstimateExcelLegacy',fnStart);
if(fnStart<0||fnEnd<0)fail('一括出力関数を特定できません。変更していません。');
let block=s.slice(fnStart,fnEnd);
const old=`      const headerColor=colors.header, paleColor=colors.pale, titleColor=colors.title || headerColor`;
if((block.split(old).length-1)!==1)fail('colors使用箇所を一意に特定できません。変更していません。');
const replacement=`      /* ${mark} */\n      const fallbackColors={header:'5271C4',pale:'EAF0FF',title:'3658A7'}\n      const safeColors=colors && typeof colors === 'object' ? colors : fallbackColors\n      const headerColor=safeColors.header || fallbackColors.header\n      const paleColor=safeColors.pale || fallbackColors.pale\n      const titleColor=safeColors.title || headerColor`;
fs.copyFileSync(p,b);
try{
 block=block.replace(old,replacement);
 s=s.slice(0,fnStart)+block+s.slice(fnEnd);
 fs.writeFileSync(p,s,'utf8');
 console.log('colors未指定でも落ちないフォールバックを追加しました。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 色分けエラー修正V2を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
