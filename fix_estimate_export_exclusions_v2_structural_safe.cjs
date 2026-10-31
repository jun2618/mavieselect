const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-estimate-export-exclusions-v2';
const marker='M-CROSS_ESTIMATE_EXPORT_EXCLUSIONS_V2_STRUCTURAL_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: V2適用済みです。');process.exit(0)}
const raw='                  const rawRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)';
const edit='                  const rowsForExport = applyEstimateEdits(rawRows, estimateEdits)';
const callStart='                  downloadEstimateExcel({';
const start=s.indexOf(raw);
if(start<0)fail('上部Excel出力の rawRows 行が見つかりません。変更していません。');
const editPos=s.indexOf(edit,start);
const callPos=s.indexOf(callStart,start);
if(editPos<0||callPos<0||editPos>callPos||callPos-start>2500)fail('上部Excel出力ブロックを安全に特定できません。変更していません。');
const nextButton=s.indexOf('              </button>',callPos);
if(nextButton<0||nextButton-callPos>2500)fail('上部Excel出力ボタンの終了を特定できません。');
let block=s.slice(start,nextButton);
if(!block.includes('}, rowsForExport, estimateCopyFormat, additionalWorks)'))fail('Excel出力引数が想定と違います。変更していません。');
fs.copyFileSync(p,b);
try{
 block=block.replace(edit,`                  /* ${marker} */\n                  const allRowsForExport = applyEstimateEdits(rawRows, estimateEdits)\n                  const rowsForExport = allRowsForExport.filter(row => !estimateEdits[row.exclusionKey || estimateEditKey(row)]?.excluded)\n                  const additionalWorksForExport = additionalWorks.filter((item, index) => {\n                    const key = 'additionalWork:' + (item.id || index)\n                    return !estimateEdits[key]?.excluded\n                  })`);
 block=block.replace('}, rowsForExport, estimateCopyFormat, additionalWorks)','}, rowsForExport, estimateCopyFormat, additionalWorksForExport)');
 s=s.slice(0,start)+block+s.slice(nextButton);
 fs.writeFileSync(p,s,'utf8');
 console.log('Excel出力時に除外済み項目をフィルターする処理を追加しました。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 見積Excel除外反映V2を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
