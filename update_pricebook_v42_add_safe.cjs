const fs=require("fs");
const cp=require("child_process");
const file="./src/App.jsx";
const marker="M-CROSS_PRICEBOOK_V42_ADD_SAFE";
const backup=file+".v42-backup-"+Date.now();
function fail(m){console.error("ERROR: "+m);console.error("App.jsx は変更していません。");process.exit(1)}
if(!fs.existsSync(file))fail("src/App.jsx が見つかりません。");
const original=fs.readFileSync(file,"utf8");
if(original.includes(marker))fail("V4.2はすでに適用されています。");
let next=original;

const stateAnchor="const [showMaterialPriceBook, setShowMaterialPriceBook] = useState(false)";
if(!next.includes(stateAnchor))fail("材料単価表stateが見つかりません。");
next=next.replace(stateAnchor,stateAnchor+`\n  /* ${marker} */\n  const [showMaterialPriceAdd,setShowMaterialPriceAdd]=useState(false)\n  const [materialPriceAddForm,setMaterialPriceAddForm]=useState({name:'',unit:'',priceType:'fixed',value:'',note:''})`);

const titleNeedle=`{supplier.name} 単価表`;
const titlePos=next.indexOf(titleNeedle);
if(titlePos<0)fail("材料単価表タイトルが見つかりません。");
const headerEnd=next.indexOf("</div>",titlePos);
if(headerEnd<0)fail("材料単価表ヘッダー終了を特定できません。");
const addUi=`

                                    {/* ${marker} */}
                                    <div style={{margin:'10px 0'}}>
                                      <button type="button" onClick={()=>setShowMaterialPriceAdd(previous=>!previous)}>＋ 項目追加</button>
                                    </div>

                                    {showMaterialPriceAdd && (
                                      <div style={{padding:'10px',marginBottom:'12px',border:'1px solid rgba(120,120,120,.25)',borderRadius:'8px'}}>
                                        <div style={{display:'grid',gridTemplateColumns:'minmax(170px,2fr) 80px 110px 120px minmax(120px,1fr)',gap:'8px'}}>
                                          <label><span>品名</span><input value={materialPriceAddForm.name} onChange={e=>setMaterialPriceAddForm(p=>({...p,name:e.target.value}))}/></label>
                                          <label><span>単位</span><input value={materialPriceAddForm.unit} onChange={e=>setMaterialPriceAddForm(p=>({...p,unit:e.target.value}))}/></label>
                                          <label><span>種類</span><select value={materialPriceAddForm.priceType} onChange={e=>setMaterialPriceAddForm(p=>({...p,priceType:e.target.value,value:''}))}><option value="fixed">固定単価</option><option value="rate">掛率</option></select></label>
                                          <label><span>{materialPriceAddForm.priceType==='rate'?'掛率 %':'単価 円'}</span><input type="number" min="0" step={materialPriceAddForm.priceType==='rate'?'0.1':'1'} value={materialPriceAddForm.value} onChange={e=>setMaterialPriceAddForm(p=>({...p,value:e.target.value}))}/></label>
                                          <label><span>備考</span><input value={materialPriceAddForm.note} onChange={e=>setMaterialPriceAddForm(p=>({...p,note:e.target.value}))}/></label>
                                        </div>
                                        <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                                          <button type="button" className="primary" onClick={()=>{
                                            const name=String(materialPriceAddForm.name||'').trim();if(!name){window.alert('品名を入力してください。');return}
                                            const numeric=materialPriceAddForm.value===''?'':Math.max(0,Number(materialPriceAddForm.value)||0)
                                            const row={id:'manual-price-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),name,unit:String(materialPriceAddForm.unit||'').trim(),priceType:materialPriceAddForm.priceType==='rate'?'rate':'fixed',price:materialPriceAddForm.priceType==='rate'?'':numeric,rate:materialPriceAddForm.priceType==='rate'?numeric:'',note:String(materialPriceAddForm.note||'').trim(),referenceOnly:false}
                                            const nextPriceBook=[...priceBook,row]
                                            saveContractors(contractors.map(current=>current.id===supplier.id?{...current,priceBook:nextPriceBook,updatedAt:new Date().toISOString()}:current))
                                            setMaterialPriceAddForm({name:'',unit:'',priceType:'fixed',value:'',note:''});setShowMaterialPriceAdd(false)
                                          }}>追加して保存</button>
                                          <button type="button" onClick={()=>{setShowMaterialPriceAdd(false);setMaterialPriceAddForm({name:'',unit:'',priceType:'fixed',value:'',note:''})}}>取消</button>
                                        </div>
                                      </div>
                                    )}
`;
next=next.slice(0,headerEnd+6)+addUi+next.slice(headerEnd+6);

// V4.1 inline edit/delete exists check. If absent, stop to avoid applying V4.2 onto wrong base.
if(!next.includes("M-CROSS_PRICEBOOK_V41_INLINE_EDIT_SAFE"))fail("V4.1が未適用です。先にV4.1を適用してください。");
if(next===original||!next.includes(marker))fail("V4.2置換に失敗しました。");
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,"utf8");
try{cp.execSync("npm run build",{stdio:"inherit",shell:true});console.log("");console.log("OK: 単価表V4.2を適用しました。");console.log("・単価表内で項目追加");console.log("・固定単価／掛率を選択して登録");console.log("・V4.1の直接編集・削除・単価コピーを維持");console.log("BACKUP: "+backup)}catch(e){fs.copyFileSync(backup,file);console.error("ERROR: build失敗。App.jsxを自動復旧しました。");process.exit(1)}
