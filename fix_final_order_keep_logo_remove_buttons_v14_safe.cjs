const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_KEEP_LOGO_REMOVE_BUTTONS_V14_SAFE';
const backup=file+'.keep-logo-v14-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('ロゴ保持V14はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_XLSX_POPULATE_V6_SAFE'))fail('xlsx-populate V6が見つかりません。');
let next=original;

// V13の drawing 全削除処理を無効化。drawingにはMSロゴも含まれるため触らない。
const legacyStart=next.indexOf('      /* M-CROSS_FINAL_ORDER_REMOVE_ALL_LEGACY_CONTROLS_V13_SAFE */');
if(legacyStart>=0){
  const issuedAnchor="      const issuedAt=new Date(order.issuedAt||order.finalizedAt||order.createdAt||Date.now())";
  const legacyEnd=next.indexOf(issuedAnchor,legacyStart);
  if(legacyEnd<0)fail('V13処理の終了位置を特定できません。');
  const safeReplacement=`      /* ${marker} */
      // drawingはMSロゴを含むため削除しない。
      // 旧ボタンは帳票外(K:Q)にあるので、セル内容だけを空白化してロゴを保持する。
      try{ws.range('K1:Q52').value('')}catch{}

`;
  next=next.slice(0,legacyStart)+safeReplacement+next.slice(legacyEnd);
}else{
  const anchor="      const issuedAt=new Date(order.issuedAt||order.finalizedAt||order.createdAt||Date.now())";
  if((next.split(anchor).length-1)!==1)fail('発注書転記開始位置を一意に特定できません。');
  const safeReplacement=`      /* ${marker} */
      // drawingはMSロゴを含むため削除しない。
      try{ws.range('K1:Q52').value('')}catch{}

`;
  next=next.replace(anchor,safeReplacement+anchor);
}

if(next===original||!next.includes(marker))fail('ロゴ保持V14の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');console.log('OK: MSロゴ保持V14を適用しました。');
 console.log('・drawing削除を停止してMSロゴを保持');
 console.log('・K:Qの旧操作エリアはセル内容のみ空白化');
 console.log('・元テンプレートは変更しません');
 console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
