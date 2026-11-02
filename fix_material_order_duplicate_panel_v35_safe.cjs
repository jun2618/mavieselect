const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_ORDER_DUPLICATE_PANEL_V35_SAFE';
const backup=file+'.material-duplicate-v35-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('材料発注重複整理V35はすでに適用されています。');
let next=original;

const oldBlock=`                      {(orderDraft.orderMode==='material'||orderDraft.orderMode==='both')&&<section className="materialOrderToolbar">
                        <div><strong>材料発注モード</strong><small>商品名・数量・単位・単価をExcel感覚で直接入力</small></div>
                        <button type="button" onClick={()=>setOrderDraft(previous=>({...previous,items:[...previous.items,{id:'material-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),label:'',memo:'',category:'material',sourceQuantity:0,factor:1,orderQuantity:1,unit:'m',orderRate:'',rate:0,amount:0}]}))}>＋ 商品行を追加</button>
                      </section>}`;
const count=next.split(oldBlock).length-1;
if(count!==1)fail('旧「材料発注モード」ブロックの検出数が '+count+' 件です。');
next=next.replace(oldBlock,`                      {/* ${marker} */}`);

// 新しい材料発注UIが残っていることを必ず確認
for(const token of ['<strong>材料発注</strong>','空の発注書にする','＋ 空行追加','クロス品番・参考数量']){
  if(!next.includes(token))fail('残すべき新UIが見つかりません: '+token);
}

fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 材料発注の重複パネル整理V35を適用しました。');
  console.log('・旧「材料発注モード / ＋商品行を追加」を削除');
  console.log('・新「材料発注 / 空の発注書にする / ＋空行追加」は維持');
  console.log('・クロス/CF/巾木の参考情報は維持');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
