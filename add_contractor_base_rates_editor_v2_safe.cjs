const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-contractor-base-rates-editor-v2';
const mark='M-CROSS_CONTRACTOR_BASE_RATES_EDITOR_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 業者基本単価V2は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_EDIT_V1_SAFE'))fail('業者編集V1が見つかりません。');

const formStateNeedle="const [contractorForm, setContractorForm] = useState(";
const fsPos=s.indexOf(formStateNeedle);
if(fsPos<0)fail('contractorForm stateを特定できません。');

// 1) Extend every known reset/create form shape with rates, only if rates not already present.
if(!s.includes("rates:{cross:")){
  s=s.replaceAll("{name:'',trade:'内装',contact:'',phone:'',memo:'',postalCode:'',address:''}","{name:'',trade:'内装',contact:'',phone:'',memo:'',postalCode:'',address:'',rates:{cross:'',cf:'',soft:'',floorTrim:'',wallBase:'',floorBase:''}}")
  s=s.replaceAll("{name:'',trade:'内装',contact:'',phone:'',memo:''}","{name:'',trade:'内装',contact:'',phone:'',memo:'',postalCode:'',address:'',rates:{cross:'',cf:'',soft:'',floorTrim:'',wallBase:'',floorBase:''}}")
}

// 2) Add rates to edit-load object using postalCode/address as a stable tail.
const editTail="postalCode:item.postalCode||'',address:item.address||''";
const ep=s.indexOf(editTail);
if(ep<0)fail('業者編集時のデータ読込位置を特定できません。');
if(!s.slice(ep,ep+350).includes('rates:')){
  s=s.slice(0,ep+editTail.length)+",rates:{cross:item.rates?.cross??'',cf:item.rates?.cf??'',soft:item.rates?.soft??'',floorTrim:item.rates?.floorTrim??'',wallBase:item.rates?.wallBase??'',floorBase:item.rates?.floorBase??''}"+s.slice(ep+editTail.length);
}

// 3) Persist rates in values object.
const valuesStart="const values={name,trade:contractorForm.trade||'その他'";
const vp=s.indexOf(valuesStart);
if(vp<0)fail('業者保存valuesを特定できません。');
const valuesEnd=s.indexOf('}',vp);
if(valuesEnd<0||valuesEnd-vp>1000)fail('業者保存values終了を特定できません。');
let values=s.slice(vp,valuesEnd+1);
if(!values.includes('rates:')){
  const insert=",rates:{cross:contractorForm.rates?.cross??'',cf:contractorForm.rates?.cf??'',soft:contractorForm.rates?.soft??'',floorTrim:contractorForm.rates?.floorTrim??'',wallBase:contractorForm.rates?.wallBase??'',floorBase:contractorForm.rates?.floorBase??''}";
  values=values.slice(0,-1)+insert+'}';
  s=s.slice(0,vp)+values+s.slice(valuesEnd+1);
}

// 4) Insert editor UI before memo, only once.
const memoNeedle='<label className="contractorFormWide"><span>メモ</span>';
const mp=s.indexOf(memoNeedle);
if(mp<0)fail('業者メモ欄を特定できません。');
const rateUi=`{/* ${mark} */}\n                          <section className="contractorRateMaster contractorFormWide">\n                            <div className="contractorRateTitle"><strong>基本単価</strong><small>通常はこの単価を発注時に使用</small></div>\n                            <div className="contractorRateGrid">\n                              {[\n                                ['cross','クロス施工','㎡'],\n                                ['cf','CF施工','㎡'],\n                                ['soft','ソフト巾木','枚'],\n                                ['floorTrim','床見切り','本'],\n                                ['wallBase','壁下地処理','式'],\n                                ['floorBase','床下地処理','式'],\n                              ].map(([key,label,unitName]) => (\n                                <label key={key}>\n                                  <span>{label}</span>\n                                  <div className="contractorRateInput">\n                                    <input type="number" min="0" step="1" value={contractorForm.rates?.[key] ?? ''} onChange={event => setContractorForm(previous => ({...previous,rates:{...(previous.rates||{}),[key]:event.target.value}}))} placeholder="未設定" />\n                                    <b>円/{unitName}</b>\n                                  </div>\n                                </label>\n                              ))}\n                            </div>\n                            <small>塗装など案件ごとに変わる工事は未設定のままでOKです。</small>\n                          </section>\n                          `;
s=s.slice(0,mp)+rateUi+s.slice(mp);

// 5) CSS, self-contained.
const cssAnchor='.contractorFormWide{grid-column:1/-1}';
if(!s.includes(cssAnchor))fail('業者フォームCSS位置を特定できません。');
const css=`.contractorRateMaster{display:grid;gap:10px;padding:13px;border:1px solid rgba(110,145,232,.4);border-radius:13px;background:rgba(110,145,232,.06)}.contractorRateTitle{display:flex;align-items:center;justify-content:space-between;gap:8px}.contractorRateTitle small,.contractorRateMaster>small{color:#756a78}.contractorRateGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.contractorRateGrid label{margin:0}.contractorRateInput{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px}.contractorRateInput input{text-align:right}.contractorRateInput b{font-size:12px;white-space:nowrap;color:#756a78}@media(max-width:520px){.contractorRateGrid{grid-template-columns:1fr}}`;
s=s.replace(cssAnchor,cssAnchor+css);

fs.copyFileSync(p,b);
try{
  fs.writeFileSync(p,s,'utf8');
  console.log('業者編集画面に基本単価設定欄を追加しました。');
  childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 業者基本単価エディタV2を適用しました。');
  console.log('基本単価: クロス / CF / ソフト巾木 / 床見切り / 壁下地 / 床下地');
  console.log('BACKUP: '+b);
}catch(e){
  console.error('適用またはビルド失敗のため自動復旧します。');
  console.error(e.message||String(e));
  if(fs.existsSync(b))fs.copyFileSync(b,p);
  process.exit(1);
}
