const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_ORDER_TOP_ADDED_ONLY_V46_SAFE';
const backup=file+'.material-top-added-only-v46-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('上部発注書追加分限定V46はすでに適用されています。');
if(!original.includes('M-CROSS_MATERIAL_ORDER_LIKE_SERVICE_V45_SAFE'))fail('V45が見つかりません。');
let next=original;

// materialOrderItems の直後に「単価表追加・自由入力」の明細だけを取り出す派生配列を追加。
const stateAnchor='const [materialOrderItems, setMaterialOrderItems] = useState([])';
const stateCount=next.split(stateAnchor).length-1;
if(stateCount!==1)fail('materialOrderItems state の検出数が '+stateCount+' 件です。');
next=next.replace(stateAnchor,stateAnchor+`\n  /* ${marker} */\n  const materialAddedOrderItems=materialOrderItems.filter(item=>item.materialType==='other')`);

// V45で追加した上部発注書ブロック内だけ、表示・件数・合計を追加分限定へ変更。
const blockStart=next.indexOf('{/* M-CROSS_MATERIAL_ORDER_LIKE_SERVICE_V45_SAFE */}');
if(blockStart<0)fail('V45上部発注書ブロック開始位置が見つかりません。');
const blockEnd=next.indexOf('</section>',blockStart);
if(blockEnd<0)fail('V45上部発注書ブロック終了位置が見つかりません。');
let block=next.slice(blockStart,blockEnd+10);

const replacements=[
  ['materialOrderItems.length===0','materialAddedOrderItems.length===0'],
  ['materialOrderItems.map((item,index)=>','materialAddedOrderItems.map((item,index)=>'],
  ['{materialOrderItems.length}件','{materialAddedOrderItems.length}件'],
  ["(materialOrderItems||[]).reduce((sum,item)=>","(materialAddedOrderItems||[]).reduce((sum,item)=>"]
];
for(const [from,to] of replacements){
  if(!block.includes(from))fail('V45上部発注書内の対象が見つかりません: '+from);
  block=block.replace(from,to);
}

// 空表示の説明を実際の動きに合わせる。
block=block.replace('商品を単価表から追加するか、空の発注書を作成してください。','単価表の「発注書へ追加」または「空の発注書を作成」から商品を追加してください。');
next=next.slice(0,blockStart)+block+next.slice(blockEnd+10);

// 上部プレビューに対象範囲を明記。
const headerNeedle='<small>材料</small>';
const headerPos=next.indexOf(headerNeedle,blockStart);
if(headerPos<0)fail('上部発注書の材料表示が見つかりません。');
next=next.slice(0,headerPos+headerNeedle.length)+`<em className="materialOrderAddedOnlyLabel">追加した商品のみ</em>`+next.slice(headerPos+headerNeedle.length);

const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .materialOrderAddedOnlyLabel{padding:3px 7px;border-radius:999px;background:#dff7e9;color:#226443;font-size:11px;font-style:normal;font-weight:900;letter-spacing:0}
  .theme-dark .materialOrderAddedOnlyLabel,.theme-cyber .materialOrderAddedOnlyLabel,.theme-luxury .materialOrderAddedOnlyLabel,.theme-retro .materialOrderAddedOnlyLabel,.theme-galaxy .materialOrderAddedOnlyLabel{background:#16452f;color:#baffd4}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('V46の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 材料発注 上部表示V46を適用しました。');
  console.log('・上部発注書は「単価表から追加した商品」と「自由入力した商品」だけ表示');
  console.log('・クロス/CF/巾木の参考明細は上部発注書へ勝手に表示しません');
  console.log('・件数と合計も追加商品のみで計算');
  console.log('・既存の参考数量/詳細編集/保存処理は変更していません');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
