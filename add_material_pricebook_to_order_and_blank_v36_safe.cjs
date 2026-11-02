const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_PRICEBOOK_TO_ORDER_AND_BLANK_V36_SAFE';
const backup=file+'.material-pricebook-order-v36-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('材料単価表転記V36はすでに適用されています。');

for(const token of [
  'materialOrderItems',
  'setMaterialOrderItems',
  '単価コピー',
  '材料行を追加'
]){
  if(!original.includes(token))fail('前提コードが見つかりません: '+token);
}

let next=original;

// 1) 業者単価表の「単価コピー」を「発注書へ追加」へ変更。
//    ボタン全体だけを置換し、単価表の編集・削除処理は触らない。
const copyText='単価コピー';
const copyPositions=[];
let searchPos=0;
while((searchPos=next.indexOf(copyText,searchPos))>=0){copyPositions.push(searchPos);searchPos+=copyText.length}
if(copyPositions.length!==1)fail('「単価コピー」の検出数が '+copyPositions.length+' 件です。');

const copyPos=copyPositions[0];
const copyButtonStart=next.lastIndexOf('<button',copyPos);
const copyButtonEnd=next.indexOf('</button>',copyPos);
if(copyButtonStart<0||copyButtonEnd<0)fail('「単価コピー」ボタン範囲を特定できません。');
const copyButton=next.slice(copyButtonStart,copyButtonEnd+9);
if(!copyButton.includes(copyText))fail('対象外ボタンを検出しました。');

// 単価表のmap変数は現在の実装で row を使用している想定。
// 周辺コードに row.name / row.unit / row.price があることを確認してから適用。
const surrounding=next.slice(Math.max(0,copyButtonStart-1800),Math.min(next.length,copyButtonEnd+1000));
if(!surrounding.includes('row.name')||!surrounding.includes('row.unit')||!surrounding.includes('row.price')){
  fail('単価表行の row.name / row.unit / row.price を確認できません。');
}

const addFromPriceBook=`<button type="button" className="materialPriceBookAddToOrder" onClick={()=>{
                                  const item={
                                    id:'material-order-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
                                    materialType:'other',
                                    productCode:String(row.name||''),
                                    description:String(row.note||''),
                                    quantity:1,
                                    unit:String(row.unit||''),
                                    unitPrice:row.price===''||row.price==null?'':Math.max(0,Number(row.price)||0)
                                  }
                                  setMaterialOrderItems(previous=>[...(Array.isArray(previous)?previous:[]),item])
                                  setSaveStatus('単価表から発注書へ追加しました')
                                }}>発注書へ追加</button>`;
next=next.slice(0,copyButtonStart)+addFromPriceBook+next.slice(copyButtonEnd+9);

// 2) 「材料行を追加」の隣に、見積にない材料用の空発注書作成ボタンを追加。
const addRowText='材料行を追加';
const addRowPositions=[];
searchPos=0;
while((searchPos=next.indexOf(addRowText,searchPos))>=0){addRowPositions.push(searchPos);searchPos+=addRowText.length}
if(addRowPositions.length!==1)fail('「材料行を追加」の検出数が '+addRowPositions.length+' 件です。');

const addRowPos=addRowPositions[0];
const addRowButtonStart=next.lastIndexOf('<button',addRowPos);
if(addRowButtonStart<0)fail('「材料行を追加」ボタン開始位置が見つかりません。');

const blankButton=`{/* ${marker} */}
                        <button type="button" className="materialBlankOrderButton" onClick={()=>{
                          if(materialOrderItems.length>0&&!window.confirm('現在の材料明細を空の発注書へ置き換えますか？'))return
                          setMaterialOrderItems([{
                            id:'material-blank-'+Date.now(),
                            materialType:'other',
                            productCode:'',
                            description:'',
                            quantity:1,
                            unit:'台',
                            unitPrice:''
                          }])
                          setSaveStatus('空の材料発注書を作成しました')
                        }}>＋ 空の発注書を作成</button>
                        `;
next=next.slice(0,addRowButtonStart)+blankButton+next.slice(addRowButtonStart);

// 3) PC・スマホでボタンを操作しやすくする。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .materialPriceBookAddToOrder{min-height:38px;padding:6px 10px;border:1px solid #2f7d57;border-radius:8px;background:#eefaf4;color:#226443;font:inherit;font-weight:900}
  .materialBlankOrderButton{min-height:42px;padding:7px 12px;border:1px solid #c78731;border-radius:9px;background:#fff7e8;color:#8b5614;font:inherit;font-weight:900}
  @media(max-width:620px){.materialPriceBookAddToOrder,.materialBlankOrderButton{width:100%}}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('材料単価表転記V36の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 材料単価表転記＋空発注書V36を適用しました。');
  console.log('・「単価コピー」を「発注書へ追加」へ変更');
  console.log('・商品名 / 単位 / 登録単価 / 数量1 を材料明細へ追加');
  console.log('・「＋ 空の発注書を作成」を追加');
  console.log('・見積にない材料を自由入力可能');
  console.log('・既存の材料行追加 / 下書き保存 / 本発注処理は維持');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
