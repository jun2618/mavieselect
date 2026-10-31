const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-contractor-base-rates-v1';
const mark='M-CROSS_CONTRACTOR_BASE_RATES_ORDER_OVERRIDE_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 業者基本単価V1は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_EDIT_V1_SAFE'))fail('業者編集V1が見つかりません。');
if(!s.includes('M-CROSS_ORDER_CREATION_STEP2_V1_SAFE'))fail('発注STEP2が見つかりません。');

const editForm='setContractorForm({name:item.name||\'\',trade:item.trade||\'その他\',contact:item.contact||\'\',phone:item.phone||\'\',memo:item.memo||\'\',postalCode:item.postalCode||\'\',address:item.address||\'\'})';
if(!s.includes(editForm))fail('業者編集データ読込を特定できません。');
const submitValues="const values={name,trade:contractorForm.trade||'その他',contact:contractorForm.contact.trim(),phone:contractorForm.phone.trim(),memo:contractorForm.memo.trim(),postalCode:String(contractorForm.postalCode||'').trim(),address:String(contractorForm.address||'').trim()}";
if(!s.includes(submitValues))fail('業者編集保存処理を特定できません。');
const memoLabel='<label className="contractorFormWide"><span>メモ</span><input value={contractorForm.memo}';
const ml=s.indexOf(memoLabel);if(ml<0)fail('業者メモ欄を特定できません。');
const createDraft='setOrderDraft({ contractor:\'\', items })';
if(!s.includes(createDraft))fail('発注ドラフト作成位置を特定できません。');

fs.copyFileSync(p,b);
try{
 // 1) Extend contractor form model with base rates, preserving missing legacy values as blank.
 s=s.replaceAll("{name:'',trade:'内装',contact:'',phone:'',memo:'',postalCode:'',address:''}","{name:'',trade:'内装',contact:'',phone:'',memo:'',postalCode:'',address:'',rates:{cross:'',cf:'',soft:'',floorTrim:'',wallBase:'',floorBase:''}}");
 s=s.replace(editForm,"setContractorForm({name:item.name||'',trade:item.trade||'その他',contact:item.contact||'',phone:item.phone||'',memo:item.memo||'',postalCode:item.postalCode||'',address:item.address||'',rates:{cross:item.rates?.cross??'',cf:item.rates?.cf??'',soft:item.rates?.soft??'',floorTrim:item.rates?.floorTrim??'',wallBase:item.rates?.wallBase??'',floorBase:item.rates?.floorBase??''}})");
 s=s.replace(submitValues,submitValues.replace("}",",rates:{cross:contractorForm.rates?.cross??'',cf:contractorForm.rates?.cf??'',soft:contractorForm.rates?.soft??'',floorTrim:contractorForm.rates?.floorTrim??'',wallBase:contractorForm.rates?.wallBase??'',floorBase:contractorForm.rates?.floorBase??''}}"));

 // 2) Basic-rate editor in contractor form.
 const beforeMemo=s.lastIndexOf('<label',ml);
 const rateUi=`<section className="contractorRateMaster contractorFormWide">\n                            <strong>基本単価</strong>\n                            <small>空欄の項目は発注時に手入力できます。</small>\n                            <div className="contractorRateGrid">\n                              {[['cross','クロス施工','㎡'],['cf','CF施工','㎡'],['soft','ソフト巾木','枚'],['floorTrim','床見切り','本'],['wallBase','壁下地処理','式'],['floorBase','床下地処理','式']].map(([key,label,unitName])=><label key={key}><span>{label}</span><div><input type="number" min="0" step="1" value={contractorForm.rates?.[key] ?? ''} onChange={event=>setContractorForm(previous=>({...previous,rates:{...(previous.rates||{}),[key]:event.target.value}}))} placeholder="未設定"/><b>円/{unitName}</b></div></label>)}\n                            </div>\n                          </section>\n                          `;
 s=s.slice(0,beforeMemo)+rateUi+s.slice(beforeMemo);

 // 3) When selecting contractor, copy current master rates to orderDraft and apply them to line items.
 const selectPattern="setOrderDraft(previous => ({...previous,contractor:item.name,contractorId:item.id}));setShowContractorPicker(false)";
 if(!s.includes(selectPattern))throw new Error('業者選択処理を特定できません。');
 const selectNew=`setOrderDraft(previous => ({...previous,contractor:item.name,contractorId:item.id,items:previous.items.map(current=>{\n                              const text=[current.label,current.memo].filter(Boolean).join(' ')\n                              const rateKey=current.category==='cross'?'cross':current.category==='cf'?'cf':current.category==='soft'?'soft':current.category==='floorTrim'?'floorTrim':text.includes('壁下地')?'wallBase':text.includes('床下地')?'floorBase':''\n                              const masterRate=rateKey && item.rates?.[rateKey]!=='' && item.rates?.[rateKey]!=null ? Number(item.rates[rateKey]) : current.orderRate\n                              return {...current,rateKey,orderRate:Number.isFinite(masterRate)?masterRate:''}\n                            })}));setShowContractorPicker(false)`;
 s=s.replace(selectPattern,selectNew);

 // 4) Ensure each draft item has an independent order rate, initially blank until contractor selection.
 const amountLine="amount: Number(row.amount || 0),";
 const createPos=s.indexOf('const items=selected.map');
 const amountPos=s.indexOf(amountLine,createPos);
 if(createPos<0||amountPos<0||amountPos-createPos>1500)throw new Error('発注明細生成を特定できません。');
 s=s.slice(0,amountPos+amountLine.length)+"\n                        orderRate: '',"+s.slice(amountPos+amountLine.length);

 // 5) Add editable order rate and calculated line amount in STEP2 item cards.
 const compare='<div className="orderQuantityCompare"><span>見積 {formatQuantity(item.sourceQuantity)}{item.unit}</span><b>→ 発注 {formatQuantity(item.orderQuantity)}{item.unit}</b></div>';
 if(!s.includes(compare))throw new Error('発注数量比較欄を特定できません。');
 const rateRow=`${compare}\n                          <label className="orderRateField"><span>発注単価</span><input type="number" min="0" step="1" value={item.orderRate ?? ''} onChange={event=>{const value=event.target.value;setOrderDraft(previous=>({...previous,items:previous.items.map((current,index)=>index===itemIndex?{...current,orderRate:value===''?'':Math.max(0,Number(value)||0)}:current)}))}} placeholder="未設定"/><b>円</b></label>\n                          <div className="orderLineAmount"><span>発注金額</span><strong>{item.orderRate===''||item.orderRate==null?'未設定':formatYen((Number(item.orderQuantity)||0)*(Number(item.orderRate)||0))}</strong></div>`;
 s=s.replace(compare,rateRow);

 // 6) Persist the actual order rate in purchase order snapshot when STEP3 is present.
 const snapshotRate='rate:Number(item.rate||0),amount:Number(item.amount||0)';
 if(s.includes(snapshotRate))s=s.replace(snapshotRate,"rate:Number(item.rate||0),amount:Number(item.amount||0),orderRate:item.orderRate===''?null:Number(item.orderRate||0),orderAmount:item.orderRate===''?null:(Number(item.orderQuantity)||0)*(Number(item.orderRate)||0)");

 // CSS
 const cssAnchor='.orderQuantityCompare{display:flex;align-items:center;justify-content:space-between;gap:10px}';
 if(!s.includes(cssAnchor))throw new Error('STEP2単価CSS位置を特定できません。');
 s=s.replace(cssAnchor,cssAnchor+`.orderRateField{display:grid;grid-template-columns:auto minmax(90px,1fr) auto;align-items:center;gap:8px;margin:0}.orderRateField input{text-align:right}.orderLineAmount{display:flex;align-items:center;justify-content:space-between;padding-top:6px;border-top:1px solid rgba(110,145,232,.22)}.orderLineAmount strong{color:#d84d83}.contractorRateMaster{display:grid;gap:8px;padding:12px;border:1px solid rgba(110,145,232,.36);border-radius:12px;background:rgba(110,145,232,.06)}.contractorRateGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.contractorRateGrid label{margin:0}.contractorRateGrid label>div{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px}.contractorRateGrid b{font-size:12px;color:#756a78}@media(max-width:520px){.contractorRateGrid{grid-template-columns:1fr}}`);

 // Add marker near rate UI.
 s=s.replace('<section className="contractorRateMaster contractorFormWide">',`{/* ${mark} */}<section className="contractorRateMaster contractorFormWide">`);
 fs.writeFileSync(p,s,'utf8');
 console.log('業者基本単価マスターと、発注時の単価自動読込・手修正を追加しました。');
 childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 業者基本単価＋発注単価上書きV1を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
