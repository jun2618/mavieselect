const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_BLANK_MATERIAL_ORDER_OPEN_V40_SAFE';
const backup=file+'.blank-material-order-open-v40-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('空材料発注書V40はすでに適用されています。');
if(!original.includes('M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE'))fail('V39が見つかりません。先にV39を適用してください。');
let next=original;

// 1) 空発注書ボタンを現在の実装から特定し、確認ダイアログなしで材料発注画面へ遷移する処理へ変更。
const text='＋ 空の発注書を作成';
const textPos=next.indexOf(text);
if(textPos<0||next.indexOf(text,textPos+text.length)>=0)fail('空の発注書ボタンを一意に特定できません。');
const start=next.lastIndexOf('<button',textPos);
const end=next.indexOf('</button>',textPos);
if(start<0||end<0)fail('空の発注書ボタン範囲を特定できません。');
const oldButton=next.slice(start,end+9);
if(!oldButton.includes('materialBlankOrder'))fail('V39の空発注書ボタンではありません。');

const newButton=`{/* ${marker} */}<button type="button" className="materialBlankOrderButton materialBlankOrderPrimary" onClick={()=>{
                      setSelectedOrderKeys([])
                      setOrderDraft(null)
                      setMaterialSupplierId('')
                      setShowMaterialSupplierPicker(false)
                      setShowMaterialPriceBook(false)
                      setCopiedMaterialRate('')
                      setMaterialOrderItems([{
                        id:'material-blank-'+Date.now(),
                        materialType:'other',
                        productCode:'',
                        description:'',
                        unitPrice:'',
                        quantity:1,
                        unit:''
                      }])
                      setPurchaseOrderBranch('material')
                      setSaveStatus('空の材料発注書を作成しました')
                      window.setTimeout(()=>document.querySelector('.materialMobilePanel')?.scrollIntoView({behavior:'smooth',block:'start'}),60)
                    }}>＋ 空の発注書を作成</button>`;
next=next.slice(0,start)+newButton+next.slice(end+9);

// 2) 空行の目的を初見でも分かるように補足を材料発注画面へ表示。
const screenMarker='{/* M-CROSS_MATERIAL_ORDER_SCREEN_V1_SAFE */}';
if(!next.includes(screenMarker))fail('材料発注画面マーカーが見つかりません。');
next=next.replace(screenMarker,`${screenMarker}\n                  {purchaseOrderBranch==='material'&&materialOrderItems.length===1&&!materialOrderItems[0]?.productCode&&<div className="blankMaterialOrderGuide">見積にない材料を自由に入力して発注できます。</div>}`);

// 3) スマホでも空発注書開始が見やすい。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */\n  .blankMaterialOrderGuide{margin:0 0 10px;padding:9px 11px;border:1px solid rgba(199,135,49,.4);border-radius:10px;background:#fff7e8;color:#7c5017;font-size:13px;font-weight:800}.theme-dark .blankMaterialOrderGuide,.theme-cyber .blankMaterialOrderGuide,.theme-luxury .blankMaterialOrderGuide,.theme-retro .blankMaterialOrderGuide,.theme-galaxy .blankMaterialOrderGuide{background:#251b0c;color:#ffe1a8}@media(max-width:620px){.blankMaterialOrderGuide{margin:6px 0 10px}}\n`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('V40の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');
 console.log('OK: 空の材料発注書V40を適用しました。');
 console.log('・確認ダイアログを廃止');
 console.log('・見積選択を使わず空の材料発注画面へ直接移動');
 console.log('・空の明細1行を表示');
 console.log('・商品名/数量/単位/単価を自由入力可能');
 console.log('・下書き保存→本発注→Excel出力へそのまま接続');
 console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
