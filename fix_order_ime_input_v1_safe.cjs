const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_ORDER_IME_INPUT_V1_SAFE';
const backup=file+'.ime-v1-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('IME改善V1はすでに適用されています。');
let next=original;

const materialStart=next.indexOf("purchaseOrderBranch === 'material'");
const serviceStart=next.indexOf('{orderDraft && (');
if(materialStart<0||serviceStart<0)fail('発注画面の開始位置が見つかりません。');

// 日本語入力向けの明示属性。既存valueをキーにピンポイント追加。
const replacements=[
  ["value={item.productCode}","lang=\"ja\" inputMode=\"text\" autoCapitalize=\"off\" autoCorrect=\"off\" value={item.productCode}"],
  ["value={materialPriceAddForm.name}","lang=\"ja\" inputMode=\"text\" autoCapitalize=\"off\" value={materialPriceAddForm.name}"],
  ["value={materialPriceAddForm.note}","lang=\"ja\" inputMode=\"text\" autoCapitalize=\"off\" value={materialPriceAddForm.note}"],
  ["value={servicePriceAddForm.name}","lang=\"ja\" inputMode=\"text\" autoCapitalize=\"off\" value={servicePriceAddForm.name}"],
  ["value={contractorForm.name}","lang=\"ja\" inputMode=\"text\" autoCapitalize=\"off\" value={contractorForm.name}"],
  ["value={contractorForm.contact}","lang=\"ja\" inputMode=\"text\" autoCapitalize=\"off\" value={contractorForm.contact}"],
  ["value={contractorForm.memo}","lang=\"ja\" inputMode=\"text\" autoCapitalize=\"off\" value={contractorForm.memo}"]
];
let changed=0;
for(const [from,to] of replacements){
  if(next.includes(from)){
    next=next.replace(from,to);
    changed++;
  }
}
if(changed<3)fail('日本語入力欄の検出数が少なすぎます。安全のため中止しました。');

// 数値欄はモバイルキーボード種別だけ明示。IME状態をJSで強制しない。
next=next.replace(/<input type="number" min="0" step="1" value=\{item\.orderRate \?\? ''\}/g,'<input type="number" inputMode="numeric" min="0" step="1" value={item.orderRate ?? \'\'}');
next=next.replace(/<input type="number" min="0" step="0\.1" value=\{item\.orderQuantity\}/g,'<input type="number" inputMode="decimal" min="0" step="0.1" value={item.orderQuantity}');

// class marker via harmless JSX comment near material screen
const markerAnchor="{/* M-CROSS_MATERIAL_ORDER_SCREEN_V1_SAFE */}";
if(!next.includes(markerAnchor))fail('材料発注画面マーカーが見つかりません。');
next=next.replace(markerAnchor,markerAnchor+'\n                  {/* '+marker+' */}');

if(next===original||!next.includes(marker))fail('IME改善の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 発注画面IME入力改善V1を適用しました。');
  console.log('・日本語入力欄に lang=ja / inputMode=text を追加');
  console.log('・数量/単価は numeric / decimal を明示');
  console.log('・Windows IMEそのものを強制切替する処理は入れていません');
  console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
