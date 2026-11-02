const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_PRICEBOOK_TO_ORDER_AND_BLANK_V37_SAFE';
const backup=file+'.material-pricebook-order-v37-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('V37はすでに適用されています。');
if(!original.includes('materialOrderItems')||!original.includes('setMaterialOrderItems'))fail('材料発注明細stateが見つかりません。');
let next=original;

// 1) 単価コピーの実装から、その場で使われている商品名/単位/単価の式を再利用する。
const copyText='単価コピー';
const copyPos=next.indexOf(copyText);
if(copyPos<0||next.indexOf(copyText,copyPos+copyText.length)>=0)fail('「単価コピー」を一意に特定できません。');
const btnStart=next.lastIndexOf('<button',copyPos);
const btnEnd=next.indexOf('</button>',copyPos);
if(btnStart<0||btnEnd<0)fail('単価コピーボタン範囲を特定できません。');
const oldButton=next.slice(btnStart,btnEnd+9);

// 周辺mapの変数名を特定。
const aroundStart=Math.max(0,btnStart-5000);
const before=next.slice(aroundStart,btnStart);
const mapMatches=[...before.matchAll(/\.map\(\((\w+)(?:,\s*\w+)?\)\s*=>/g)];
const itemVar=mapMatches.length?mapMatches[mapMatches.length-1][1]:null;
if(!itemVar)fail('単価表行の変数名を特定できません。');
const vicinity=next.slice(Math.max(0,btnStart-2200),Math.min(next.length,btnEnd+800));
const required=[itemVar+'.name',itemVar+'.unit'];
for(const t of required)if(!vicinity.includes(t))fail('単価表周辺に '+t+' が見つかりません。');
let priceExpr='';
for(const candidate of [itemVar+'.price',itemVar+'.unitPrice',itemVar+'.rate']){if(vicinity.includes(candidate)){priceExpr=candidate;break}}
if(!priceExpr)fail('単価表の価格フィールドを特定できません。');

const newButton=`<button type="button" className="materialPriceBookAddToOrder" onClick={()=>{const entry=${itemVar};const price=${priceExpr};setMaterialOrderItems(previous=>[...(Array.isArray(previous)?previous:[]),{id:'material-order-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),materialType:'other',productCode:String(entry.name||''),description:String(entry.note||''),quantity:1,unit:String(entry.unit||''),unitPrice:price===''||price==null?'':Math.max(0,Number(price)||0)}]);setSaveStatus('単価表から発注書へ追加しました')}}>発注書へ追加</button>`;
next=next.slice(0,btnStart)+newButton+next.slice(btnEnd+9);

// 2) 既存の「材料行を追加」の直前へ空発注書作成。
const addText='材料行を追加';
const addPos=next.indexOf(addText);
if(addPos<0||next.indexOf(addText,addPos+addText.length)>=0)fail('「材料行を追加」を一意に特定できません。');
const addBtnStart=next.lastIndexOf('<button',addPos);
if(addBtnStart<0)fail('材料行追加ボタン開始位置が見つかりません。');
const blank=`{/* ${marker} */}<button type="button" className="materialBlankOrderButton" onClick={()=>{if(materialOrderItems.length>0&&!window.confirm('現在の材料明細を空の発注書へ置き換えますか？'))return;setMaterialOrderItems([{id:'material-blank-'+Date.now(),materialType:'other',productCode:'',description:'',quantity:1,unit:'台',unitPrice:''}]);setSaveStatus('空の材料発注書を作成しました')}}>＋ 空の発注書を作成</button>`;
next=next.slice(0,addBtnStart)+blank+next.slice(addBtnStart);

const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */\n  .materialPriceBookAddToOrder{min-height:38px;padding:6px 10px;border:1px solid #2f7d57;border-radius:8px;background:#eefaf4;color:#226443;font:inherit;font-weight:900}.materialBlankOrderButton{min-height:42px;padding:7px 12px;border:1px solid #c78731;border-radius:9px;background:#fff7e8;color:#8b5614;font:inherit;font-weight:900}@media(max-width:620px){.materialPriceBookAddToOrder,.materialBlankOrderButton{width:100%}}\n`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);
if(next===original||!next.includes(marker))fail('V37の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{cp.execSync('npm run build',{stdio:'inherit',shell:true});console.log('');console.log('OK: 材料単価表→発注書追加＋空発注書V37を適用しました。');console.log('・単価表の実際の変数/価格フィールドを自動判定');console.log('・単価コピー → 発注書へ追加');console.log('・＋空の発注書を作成');console.log('・既存保存/本発注処理は維持');console.log('BACKUP: '+backup);}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
