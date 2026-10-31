const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-room-part-row-color-v3';
const mark='M-CROSS_ROOM_PART_ROW_COLOR_V3_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: V3適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_FULL_ROW_ROOM_COLOR_V2_SAFE'))fail('行全体色分けV2が見つかりません。変更していません。');
const a=s.indexOf('async function downloadCombinedEstimateMeasurementExcel('),z=s.indexOf('\nasync function downloadEstimateExcelLegacy',a);
if(a<0||z<0)fail('一括出力関数を特定できません。');
let x=s.slice(a,z);
const roomFnStart=x.indexOf('    function roomFill(room){');
const partFnStart=x.indexOf('    function partFill(part){',roomFnStart);
const addStart=x.indexOf('    function addSheet(',partFnStart);
if(roomFnStart<0||partFnStart<0||addStart<0)fail('現在の色決定関数を特定できません。');
const oldData=`        const base=roomFill(values[0])\n        /* M-CROSS_FULL_ROW_ROOM_COLOR_V2_SAFE */\n        // 部屋ごとの色を、その採寸データ行の全セルへ統一して適用する。\n        values.forEach((v,ci)=>sh.cell(9+ri,1+ci).value(v).style('fill',base))`;
if((x.split(oldData).length-1)!==1)fail('現在の行全体色処理を一意に特定できません。');
const colorFns=`    /* ${mark} */\n    const roomBaseColors=['EAF2FF','EAF8EF','FFF7D6','F3ECFF','FFF0DF','E5FAFB','FFEAF0','F1F3F5']\n    const partTints={ ceiling:'D8E9FF', wall:'DDF3E4', storage:'FFE5C2', other:'EEF2F6' }\n    function roomBaseIndex(room){\n      const name=String(room||'').trim()\n      if(!name)return 0\n      let hash=0; for(const ch of name)hash=(hash*31+ch.charCodeAt(0))>>>0\n      return hash%roomBaseColors.length\n    }\n    function hexMix(a,b,weight=.38){\n      const parse=h=>[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]\n      const x=parse(a),y=parse(b)\n      return x.map((v,i)=>Math.round(v*(1-weight)+y[i]*weight).toString(16).padStart(2,'0')).join('').toUpperCase()\n    }\n    function rowFill(room,part,name){\n      const roomColor=roomBaseColors[roomBaseIndex(room)]\n      if(name!=='クロス採寸')return roomColor\n      const v=String(part||'')\n      const tint=v.includes('天井')?partTints.ceiling:v.includes('収納')?partTints.storage:v.includes('壁')?partTints.wall:partTints.other\n      return hexMix(roomColor,tint,.48)\n    }\n`;
x=x.slice(0,roomFnStart)+colorFns+x.slice(addStart);
const newData=`        const base=rowFill(values[0],values[1],name)\n        // 部屋 × 部位 の組み合わせ色を、その行の全セルへ適用する。\n        values.forEach((v,ci)=>sh.cell(9+ri,1+ci).value(v).style('fill',base))`;
x=x.replace(oldData,newData);
fs.copyFileSync(p,b);
try{
 s=s.slice(0,a)+x+s.slice(z);
 fs.writeFileSync(p,s,'utf8');
 console.log('部屋×部位の組み合わせごとに、行全体を色分けする処理へ変更しました。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 部屋×部位 行全体色分けV3を適用しました。');
 console.log('クロス: 部屋色 + 天井/壁/収納の色味を合成');
 console.log('CF/巾木等: 部屋ごとの色を行全体へ適用');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
