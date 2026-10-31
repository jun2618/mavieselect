const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-estimate-export-exclusions-v1';
const marker='M-CROSS_ESTIMATE_EXPORT_EXCLUSIONS_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p)) fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 見積Excel除外反映V1は適用済みです。');process.exit(0)}
const old=`                  const rowsForExport = applyEstimateEdits(rawRows, estimateEdits)\n                  downloadEstimateExcel({`;
const count=s.split(old).length-1;
if(count!==1) fail('上部の見積書出力処理の一致数が '+count+' 件です。変更していません。');
fs.copyFileSync(p,b);
try{
 const neu=`                  /* ${marker} */\n                  const allRowsForExport = applyEstimateEdits(rawRows, estimateEdits)\n                  const rowsForExport = allRowsForExport.filter(row => !estimateEdits[row.exclusionKey || estimateEditKey(row)]?.excluded)\n                  const additionalWorksForExport = additionalWorks.filter((item, index) => {\n                    const key = 'additionalWork:' + (item.id || index)\n                    return !estimateEdits[key]?.excluded\n                  })\n                  downloadEstimateExcel({`;
 s=s.replace(old,neu);
 const callOld=`                  }, rowsForExport, estimateCopyFormat, additionalWorks)`;
 const callCount=s.split(callOld).length-1;
 if(callCount!==1) throw new Error('上部出力のadditionalWorks引数を一意に特定できません。');
 s=s.replace(callOld,`                  }, rowsForExport, estimateCopyFormat, additionalWorksForExport)`);
 fs.writeFileSync(p,s,'utf8');
 console.log('見積書出力直前に、見積から除外済みの通常項目とその他工事をフィルターする処理を追加しました。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 見積Excel除外反映V1を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
