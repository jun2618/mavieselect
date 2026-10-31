const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_REMOVE_ALL_LEGACY_CONTROLS_V13_SAFE';
const backup=file+'.remove-legacy-controls-v13-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('旧ボタン完全削除V13はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_XLSX_POPULATE_V6_SAFE'))fail('xlsx-populate V6が見つかりません。');
let next=original;

const anchor="      const issuedAt=new Date(order.issuedAt||order.finalizedAt||order.createdAt||Date.now())";
if((next.split(anchor).length-1)!==1)fail('発注書転記開始位置を一意に特定できません。');

const injected=`      /* ${marker} */
      // 発注書として不要なテンプレート上の旧フォームコントロール/描画オブジェクトを削除する。
      // 見積書本体のセル・ロゴ・会社情報は維持する。
      try{
        const rawSheet=ws._sheet||ws
        const node=rawSheet._node||rawSheet._sheetNode||null
        if(node&&Array.isArray(node.children)){
          node.children=node.children.filter(child=>{
            const name=String(child?.name||child?.nodeName||child?.tagName||'').toLowerCase()
            return !['legacydrawing','legacydrawinghf','drawing','oleobjects','controls','control'].includes(name)
          })
        }
      }catch{}
      // 旧操作エリアのセル内容も完全に空白化。
      try{ws.range('K1:Q52').value('')}catch{}

`;
next=next.replace(anchor,injected+anchor);

if(next===original||!next.includes(marker))fail('旧ボタン完全削除V13の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 発注書の旧ボタン完全削除V13を適用しました。');
  console.log('・発注済スタンプ');
  console.log('・原価計算へ転記');
  console.log('・工程表へ書出し');
  console.log('・数量再計算');
  console.log('など旧テンプレート操作オブジェクトを出力版から除外します。');
  console.log('・発注書本体/ロゴ/会社情報は維持します。');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
