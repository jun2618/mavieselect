const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_PRICEBOOK_TO_ORDER_AND_BLANK_V38_SAFE';
const backup=file+'.material-pricebook-order-v38-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('V38はすでに適用されています。');
if(!original.includes('setMaterialOrderItems'))fail('材料発注明細stateが見つかりません。');
let next=original;

// 1) 現在の実コード上の「単価コピー」を正確に置換。
const oldCopy=`{row.priceType==='fixed' && row.price!=='' && row.price!=null && typeof setCopiedMaterialRate==='function' && (
                                                <button type="button" onClick={()=>setCopiedMaterialRate(Number(row.price)||0)}>単価コピー</button>
                                              )}`;
const copyCount=next.split(oldCopy).length-1;
if(copyCount!==1)fail('現在の「単価コピー」ブロックの検出数が '+copyCount+' 件です。');
const newCopy=`{row.priceType==='fixed' && row.price!=='' && row.price!=null && (
                                                <button type="button" className="materialPriceBookAddToOrder" onClick={()=>{
                                                  setMaterialOrderItems(previous=>[...(Array.isArray(previous)?previous:[]),{
                                                    id:'material-order-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
                                                    materialType:'other',
                                                    productCode:String(row.name||''),
                                                    description:String(row.note||''),
                                                    unitPrice:Math.max(0,Number(row.price)||0),
                                                    quantity:1,
                                                    unit:String(row.unit||'')
                                                  }])
                                                  setSaveStatus('単価表から発注書へ追加しました')
                                                }}>発注書へ追加</button>
                                              )}`;
next=next.replace(oldCopy,newCopy);

// 2) 現在の「＋ 材料行を追加」ボタンの直前へ空発注書作成ボタンを追加。
const addText='＋ 材料行を追加';
const addTextPos=next.indexOf(addText);
if(addTextPos<0||next.indexOf(addText,addTextPos+addText.length)>=0)fail('「＋ 材料行を追加」を一意に特定できません。');
const addStart=next.lastIndexOf('<button',addTextPos);
if(addStart<0)fail('材料行追加ボタン開始位置が見つかりません。');
const blankButton=`{/* ${marker} */}
                          <button type="button" className="materialBlankOrderButton" onClick={()=>{
                            if(materialOrderItems.length>0&&!window.confirm('現在の材料明細を空の発注書へ置き換えますか？'))return
                            setMaterialOrderItems([{
                              id:'material-blank-'+Date.now(),
                              materialType:'other',
                              productCode:'',
                              description:'',
                              unitPrice:'',
                              quantity:1,
                              unit:''
                            }])
                            setSaveStatus('空の材料発注書を作成しました')
                          }}>＋ 空の発注書を作成</button>
                          `;
next=next.slice(0,addStart)+blankButton+next.slice(addStart);

// 3) 操作性。スマホはボタンを全幅。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .materialPriceBookAddToOrder{min-height:38px;padding:6px 10px;border:1px solid #2f7d57;border-radius:8px;background:#eefaf4;color:#226443;font:inherit;font-weight:900}
  .materialBlankOrderButton{min-height:42px;padding:7px 12px;border:1px solid #c78731;border-radius:9px;background:#fff7e8;color:#8b5614;font:inherit;font-weight:900}
  @media(max-width:620px){.materialPriceBookAddToOrder,.materialBlankOrderButton{width:100%}}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('V38の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 材料単価表→発注書追加＋空発注書V38を適用しました。');
  console.log('・現在の row.name / row.unit / row.price を使用');
  console.log('・単価コピー → 発注書へ追加');
  console.log('・数量1 / 単位 / 登録単価を材料明細へ追加');
  console.log('・＋空の発注書を作成を追加');
  console.log('・既存の＋材料行を追加も維持');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
