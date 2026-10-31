const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-full-row-room-color-v2';
const mark='M-CROSS_FULL_ROW_ROOM_COLOR_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: V2適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_ROOM_PART_COLOR_V1_SAFE'))fail('部屋・部位色分けV1が見つかりません。変更していません。');
const a=s.indexOf('async function downloadCombinedEstimateMeasurementExcel('),z=s.indexOf('\nasync function downloadEstimateExcelLegacy',a);
if(a<0||z<0)fail('一括出力関数を特定できません。');
let x=s.slice(a,z);
const old=`        values.forEach((v,ci)=>sh.cell(9+ri,1+ci).value(v).style('fill',base))\n        if(name==='クロス採寸'&&values.length>1){const pf=partFill(values[1]);if(pf)sh.cell(9+ri,2).style({fill:pf,bold:true})}`;
if((x.split(old).length-1)!==1)fail('現在の行色＋部位セル色処理を一意に特定できません。変更していません。');
const neu=`        /* ${mark} */\n        // 部屋ごとの色を、その採寸データ行の全セルへ統一して適用する。\n        values.forEach((v,ci)=>sh.cell(9+ri,1+ci).value(v).style('fill',base))`;
fs.copyFileSync(p,b);
try{
 x=x.replace(old,neu);
 s=s.slice(0,a)+x+s.slice(z);
 fs.writeFileSync(p,s,'utf8');
 console.log('部位セルだけ別色にする処理を削除し、部屋色を行全体へ統一しました。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 部屋ごとの行全体色分けV2を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
