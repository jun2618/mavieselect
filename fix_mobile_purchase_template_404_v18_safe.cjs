const fs=require('fs');
const cp=require('child_process');
const path=require('path');

const appFile='./src/App.jsx';
const marker='M-CROSS_MOBILE_PURCHASE_TEMPLATE_404_V18_SAFE';
const backup=appFile+'.purchase-template-404-v18-backup-'+Date.now();
const sourceCandidates=[
  './public/templates/工事カードNew3.xlsm',
  './工事カードNew3.xlsm'
];
const source=sourceCandidates.find(p=>fs.existsSync(p));
const target='./public/mcross-purchase-order-template.xlsm';

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(appFile))fail('src/App.jsx が見つかりません。');
if(!source)fail('工事カードNew3.xlsm が見つかりません。');
const original=fs.readFileSync(appFile,'utf8');
if(original.includes(marker))fail('スマホテンプレート404修正V18はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_XLSX_POPULATE_V6_SAFE'))fail('xlsx-populate V6が見つかりません。');

// Vercel/スマホでも扱いやすいASCII名でpublic直下へコピー。
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.copyFileSync(source,target);
if(!fs.existsSync(target)||fs.statSync(target).size===0)fail('テンプレートのコピーに失敗しました。');

let next=original;
const oldFetch="      const response=await fetch(new URL('/templates/工事カードNew3.xlsm',window.location.origin),{cache:'no-store'})";
const count=next.split(oldFetch).length-1;
if(count!==1)fail('発注書テンプレートfetchの検出数が '+count+' 件です。');
const newFetch=`      /* ${marker} */
      const response=await fetch(new URL('/mcross-purchase-order-template.xlsm',window.location.origin),{cache:'no-store'})`;
next=next.replace(oldFetch,newFetch);

if(next===original||!next.includes(marker))fail('スマホテンプレート404修正V18の適用に失敗しました。');
fs.copyFileSync(appFile,backup);
fs.writeFileSync(appFile,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  const distTarget='./dist/mcross-purchase-order-template.xlsm';
  if(!fs.existsSync(distTarget))throw new Error('build後のdistにテンプレートがありません: '+distTarget);
  console.log('');
  console.log('OK: スマホ発注書テンプレート404修正V18を適用しました。');
  console.log('・テンプレートをASCII名でpublic直下へ配置');
  console.log('・出力URLを /mcross-purchase-order-template.xlsm へ変更');
  console.log('・distへのテンプレート配置も確認済み');
  console.log('重要: public/mcross-purchase-order-template.xlsm をGitへ追加してください。');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,appFile);
  console.error('ERROR: buildまたはテンプレート確認に失敗。App.jsxを自動復旧しました。');
  console.error(error?.message||String(error));
  process.exit(1);
}
