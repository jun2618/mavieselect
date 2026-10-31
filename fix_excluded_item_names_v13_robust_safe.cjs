const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),appPath=path.join(root,'src','App.jsx');
const backup=appPath+'.before-excluded-item-names-v13';
const marker='M-CROSS_EXCLUDED_ITEM_NAMES_V13_ROBUST_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(appPath))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(appPath,'utf8');
if(s.includes(marker)){console.log('SKIP: 除外項目名V13は適用済みです。');process.exit(0)}

// 現在のonExclude内にある [form.key] の保存オブジェクトを、書式ではなく構造で探す。
const re=/\[form\.key\]\s*:\s*\{([\s\S]{0,900}?)excluded\s*:\s*true\s*,?([\s\S]{0,120}?)\}/g;
const matches=[...s.matchAll(re)];
if(matches.length!==1) fail('除外保存オブジェクトの一致数が '+matches.length+' 件です。変更していません。');

fs.copyFileSync(appPath,backup);
try{
  const full=matches[0][0];
  const before=matches[0][1];
  // すでにparts等が保存されている場合は二重追加しない。
  let enriched=before;
  const additions=[];
  if(!/\bparts\s*:/.test(before)) additions.push("parts: Array.isArray(form.parts) ? [...form.parts] : (previous[form.key]?.parts || []),")
  if(!/\bmemo\s*:/.test(before)) additions.push("memo: form.memo ?? previous[form.key]?.memo ?? '',")
  if(!/\bquantity\s*:/.test(before)) additions.push("quantity: form.quantity ?? previous[form.key]?.quantity ?? '',")
  if(!/\bunit\s*:/.test(before)) additions.push("unit: form.unit ?? previous[form.key]?.unit ?? '',")
  if(!/\brate\s*:/.test(before)) additions.push("rate: form.rate ?? previous[form.key]?.rate ?? '',")
  if(!/\bamount\s*:/.test(before)) additions.push("amount: form.amount ?? previous[form.key]?.amount ?? '',")
  if(additions.length){
    const indent='\n                          ';
    enriched=before+indent+`/* ${marker} */`+indent+additions.join(indent)+indent;
  } else {
    enriched=before+`\n                          /* ${marker}: values already preserved */\n                          `;
  }
  const replacement='[form.key]: {'+enriched+'excluded: true'+matches[0][2]+'}';
  s=s.replace(full,replacement);
  fs.writeFileSync(appPath,s,'utf8');
  console.log('変更を適用しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 除外時に項目名・数量・単価・金額を保持するV13を適用しました。');
  console.log('見積行のタップ処理・その他工事の除外処理・個別復元UIには触れていません。');
  console.log('BACKUP: '+backup);
}catch(e){
  console.error('適用またはビルドに失敗したため、自動で元に戻します。');
  console.error(e.message||String(e));
  if(fs.existsSync(backup))fs.copyFileSync(backup,appPath);
  process.exit(1);
}
