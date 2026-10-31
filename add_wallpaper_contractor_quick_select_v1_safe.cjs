const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-wallpaper-contractor-quick-select-v1';
const mark='M-CROSS_WALLPAPER_CONTRACTOR_QUICK_SELECT_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: クロス屋一括選択V1は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_ORDER_SELECTION_STEP1_V4_STRUCTURAL_SAFE'))fail('発注選択STEP1 V4が見つかりません。変更していません。');

const interiorLine="              const interiorOrderKeys = orderCandidateRows.map((row,index) => ({row,key:orderKeyForRow(row,index)})).filter(({row}) => ['cross','cf','soft','floorTrim','crossPackage','cfPackage'].includes(row.category)).map(({key}) => key)";
if((s.split(interiorLine).length-1)!==1)fail('内装工事一括選択ロジックを一意に特定できません。変更していません。');

const oldButton='<button type="button" onClick={() => setSelectedOrderKeys(interiorOrderKeys)}>内装工事を選択</button>';
if((s.split(oldButton).length-1)!==1)fail('内装工事を選択ボタンを一意に特定できません。変更していません。');

fs.copyFileSync(p,b);
try{
 const logic=`              /* ${mark} */\n              const wallpaperContractorKeywords = ['壁下地処理','壁下地','床下地処理','床下地']\n              const wallpaperContractorKeys = orderCandidateRows.map((row,index) => ({row,key:orderKeyForRow(row,index)})).filter(({row}) => {\n                if (['cross','cf','soft','floorTrim','crossPackage','cfPackage'].includes(row.category)) return true\n                if (row.category !== 'additionalWork') return false\n                const text = [row.label, ...(Array.isArray(row.parts) ? row.parts : []), row.memo].filter(Boolean).join(' ')\n                return wallpaperContractorKeywords.some(keyword => text.includes(keyword))\n              }).map(({key}) => key)`;
 s=s.replace(interiorLine,interiorLine+'\n'+logic);
 s=s.replace(oldButton,'<button type="button" onClick={() => setSelectedOrderKeys(wallpaperContractorKeys)}>クロス屋を一括選択</button>');
 fs.writeFileSync(p,s,'utf8');
 console.log('「内装工事を選択」を「クロス屋を一括選択」へ変更しました。');
 console.log('対象: クロス / CF / ソフト巾木 / 床見切り / 壁下地処理 / 床下地処理');
 childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: クロス屋一括選択V1を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
