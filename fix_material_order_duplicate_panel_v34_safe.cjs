const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_ORDER_DUPLICATE_PANEL_V34_SAFE';
const backup=file+'.material-duplicate-v34-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('材料発注重複整理V34はすでに適用されています。');
let next=original;

// 旧「材料発注モード」パネルだけを特定して削除する。
const text='材料発注モード';
const textPos=next.indexOf(text);
if(textPos<0)fail('「材料発注モード」が見つかりません。');
if(next.indexOf(text,textPos+text.length)>=0)fail('「材料発注モード」が複数見つかりました。');

// 見出しを含む直近section/divブロックを探索。正規の「材料発注」専用UIは触らない。
let start=next.lastIndexOf('<section',textPos);
let tag='section';
const divStart=next.lastIndexOf('<div',textPos);
if(start<0 || divStart>start){start=divStart;tag='div'}
if(start<0)fail('旧材料発注モードの開始位置を特定できません。');

const tokenRe=new RegExp('<'+tag+'\\b|<\\/'+tag+'>','g');
tokenRe.lastIndex=start;
let depth=0,end=-1,m;
while((m=tokenRe.exec(next))){
  if(m[0].startsWith('</'))depth--;else depth++;
  if(depth===0){end=tokenRe.lastIndex;break}
}
if(end<0)fail('旧材料発注モードの終了位置を特定できません。');
const block=next.slice(start,end);
if(!block.includes('材料発注モード'))fail('削除対象ブロックが一致しません。');
if(!block.includes('商品行を追加'))fail('旧「商品行を追加」パネルではありません。安全停止します。');
if(block.includes('空の発注書にする')||block.includes('空行追加'))fail('新しい材料発注専用UIを巻き込むため停止しました。');

next=next.slice(0,start)+`{/* ${marker} */}`+next.slice(end);

if(next===original||!next.includes(marker))fail('材料発注重複整理V34の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 材料発注の重複パネル整理V34を適用しました。');
  console.log('・旧「材料発注モード / 商品行を追加」を削除');
  console.log('・新しい「材料発注 / 空の発注書にする / 空行追加」は維持');
  console.log('・参考数量/発注書明細/保存処理は変更していません');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
