const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_REMOVE_TEMPLATE_CONTROLS_V11_SAFE';
const backup=file+'.remove-template-controls-v11-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('テンプレート操作部削除V11はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_XLSX_POPULATE_V6_SAFE'))fail('xlsx-populate V6が見つかりません。');

const fnStart=original.indexOf('  async function exportFinalPurchaseOrderExcel(order){');
const fnEnd=original.indexOf('\n  function finalizePurchaseOrder(id){',fnStart);
if(fnStart<0||fnEnd<0)fail('発注書Excel出力関数を特定できません。');
let fn=original.slice(fnStart,fnEnd);

// 発注書シート内の帳票外エリア(K列以右)を削除してから出力する。
const anchor="      const issuedAt=new Date(order.issuedAt||order.finalizedAt||order.createdAt||Date.now())";
if(!fn.includes(anchor))fail('発注書転記開始位置が見つかりません。');
const injected=`      /* ${marker} */
      // 発注書として不要な右側の旧操作部（ボタン、掛率欄、見積依頼欄等）を出力版から除去。
      // 主要帳票はA:Jなので、K列以右を削除して発注書だけにする。
      try{
        ws.range('K1:Q52').value('')
        ws.range('K1:Q52').style({fill:null,border:null,fontColor:'FFFFFF'})
      }catch{}

`;
fn=fn.replace(anchor,injected+anchor);

let next=original.slice(0,fnStart)+fn+original.slice(fnEnd);
if(next===original||!next.includes(marker))fail('テンプレート操作部削除V11の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 発注書テンプレート操作部削除V11を適用しました。');
  console.log('・発注済スタンプ/原価計算へ転記/工程表へ書出しを非表示');
  console.log('・数量再計算/0.9掛/0.85掛を非表示');
  console.log('・右側の見積依頼/着工日/完了日の旧エリアも非表示');
  console.log('・A:Jの発注書本体は維持');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
