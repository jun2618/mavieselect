const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_QUANTITY_ROUND_V4_SAFE';
const backup=file+'.quantity-v4-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('数量丸めV4はすでに適用されています。');
let next=original;
const stateAnchor="const [materialOrderItems, setMaterialOrderItems] = useState([])";
if(!next.includes(stateAnchor))fail('materialOrderItems stateが見つかりません。');
next=next.replace(stateAnchor,stateAnchor+"\n  /* "+marker+" */\n  const normalizeMaterialQuantity=value=>{if(value===''||value==null)return '';const n=Number(value);return Number.isFinite(n)?Math.round(n*100)/100:''}");
// Initial quantity values in material-order construction: normalize assignments without touching unrelated estimate data.
const materialBranch=next.indexOf("setPurchaseOrderBranch('material')");
if(materialBranch<0)fail('材料発注分岐が見つかりません。');
let head=next.slice(0,materialBranch+1), tail=next.slice(materialBranch+1);
// Work in nearby preceding material setup by replacing globally only the exact common initializer expressions.
next=next.replace(/quantity: Number\(item\.quantity \|\| 0\)/g,"quantity: normalizeMaterialQuantity(item.quantity)");
next=next.replace(/quantity: Number\(item\.length \|\| 0\)/g,"quantity: normalizeMaterialQuantity(item.length)");
next=next.replace(/quantity: noCodeCrossQuantity/g,"quantity: normalizeMaterialQuantity(noCodeCrossQuantity)");
next=next.replace(/quantity: Number\(softReferenceQuantity \|\| 0\)/g,"quantity: normalizeMaterialQuantity(softReferenceQuantity)");
// Quantity input: keep temporary blank; round on blur; select all on focus.
const labelPos=next.indexOf('<span>発注数量</span>');
if(labelPos<0)fail('発注数量欄が見つかりません。');
const inputStart=next.indexOf('<input',labelPos);
const inputEnd=next.indexOf('/>',inputStart);
if(inputStart<0||inputEnd<0)fail('発注数量inputを特定できません。');
const oldInput=next.slice(inputStart,inputEnd+2);
const newInput=`<input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={item.quantity ?? ''}
                                    onFocus={event=>event.target.select()}
                                    onChange={event=>{
                                      const raw=event.target.value
                                      setMaterialOrderItems(previous=>previous.map((current,index)=>index===itemIndex?{...current,quantity:raw===''?'':raw}:current))
                                    }}
                                    onBlur={event=>{
                                      const value=normalizeMaterialQuantity(event.target.value)
                                      setMaterialOrderItems(previous=>previous.map((current,index)=>index===itemIndex?{...current,quantity:value}:current))
                                    }}
                                  />`;
next=next.slice(0,inputStart)+newInput+next.slice(inputEnd+2);
if(next===original||!next.includes(marker))fail('数量修正の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{cp.execSync('npm run build',{stdio:'inherit',shell:true});console.log('');console.log('OK: 材料発注数量丸めV4を適用しました。');console.log('・92.55000000000001 -> 92.55');console.log('・最大で小数第2位まで保持');console.log('・入力中は空欄を許可');console.log('・フォーカス時に全選択');console.log('BACKUP: '+backup)}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
