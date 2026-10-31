const fs=require('fs');
const cp=require('child_process');
const path=require('path');
const file='./src/App.jsx';
const marker='M-CROSS_FINAL_PURCHASE_ORDER_STEP2_TEMPLATE_V2_SAFE';
const backup=file+'.final-step2-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const templateCandidates=['./public/templates/工事カードNew3.xlsm','./public/工事カードNew3.xlsm','./工事カードNew3.xlsm','./public/templates/工事カードNew3 40.xlsm','./public/工事カードNew3 40.xlsm','./工事カードNew3 40.xlsm'];
const templatePath=templateCandidates.find(p=>fs.existsSync(p));
if(!templatePath)fail('Excelテンプレート 工事カードNew3.xlsm が見つかりません。crossmeasure直下またはpublic/templatesに置いてください。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('STEP2テンプレート準備はすでに適用されています。');
const publicTarget='./public/templates/工事カードNew3.xlsm';
fs.mkdirSync(path.dirname(publicTarget),{recursive:true});
if(path.resolve(templatePath)!==path.resolve(publicTarget))fs.copyFileSync(templatePath,publicTarget);
let next=original;
const step1='M-CROSS_FINAL_PURCHASE_ORDER_STEP1_SAFE';
if(!next.includes(step1))fail('本発注書STEP1が見つかりません。');
const buttonText='>📄 本発注書を作成</button>';
if(!next.includes(buttonText))fail('本発注書を作成ボタンが見つかりません。');
next=next.replace(buttonText,`>📄 本発注書を作成</button>\n                                {/* ${marker} */}\n                                <button type="button" onClick={()=>{const payload=localStorage.getItem('mcross_final_purchase_order_export_v1');if(!payload){window.alert('先に「本発注書を作成」を押してください。');return}const blob=new Blob([payload],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mcross_purchase_order_export.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);window.alert('Excelテンプレート転記用データを出力しました。STEP3で工事カードNew3.xlsmへ直接転記します。')}}>⬇ 転記データを出力</button>`);
if(next===original||!next.includes(marker))fail('STEP2の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{cp.execSync('npm run build',{stdio:'inherit',shell:true});console.log('');console.log('OK: 本発注書STEP2テンプレート準備を適用しました。');console.log('テンプレート: '+publicTarget);console.log('・STEP1の本発注データをJSONでダウンロード可能');console.log('・テンプレート原本はpublic/templatesへ保持');console.log('・原本Excelへ直接書き込む処理はSTEP3で実装');console.log('BACKUP: '+backup)}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
