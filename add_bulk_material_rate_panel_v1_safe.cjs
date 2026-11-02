const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_BULK_MATERIAL_RATE_PANEL_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=file+'.before-bulk-material-rate-panel-'+Date.now()+'.bak';
const nl=s.includes('\r\n')?'\r\n':'\n';
function one(label,a,b){const n=s.split(a).length-1;if(n!==1){console.error('ERROR: '+label+' MATCH='+n+'; no changes');process.exit(1)}s=s.replace(a,b)}

const stateAnchor="  const [copiedMaterialRate,setCopiedMaterialRate]=useState(null)";
const stateBlock=[stateAnchor,`  /* ${marker} */`,`  const [showBulkMaterialRates,setShowBulkMaterialRates]=useState(false)`,`  const [bulkMaterialRates,setBulkMaterialRates]=useState({cross:'',cf:'',soft:'',floorTrim:''})`].join(nl);
one('state anchor',stateAnchor,stateBlock);

const addButton=`                            {/* M-CROSS_MATERIAL_ADD_TOP_V48_SAFE */}<button type="button" className="materialAddTopButton" onClick={()=>setMaterialOrderItems(previous=>[...previous,{id:'material-free-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),materialType:'other',productCode:'',description:'',quantity:1,unit:''}])}>{'＋ 材料行を追加'}</button>{/* M-CROSS_MATERIAL_ORDER_LIKE_SERVICE_V45_SAFE */}`;
const panel=[addButton,
`                            <button type="button" className="secondaryButton" onClick={()=>setShowBulkMaterialRates(true)}>💰 工種別単価を一括設定</button>`,
`                            {showBulkMaterialRates&&<section className="bulkMaterialRatePanel">`,
`                              <header><strong>工種別単価を一括設定</strong><small>入力した工種だけ反映します</small></header>`,
`                              <div className="bulkMaterialRateGrid">`,
`                                {[['cross','クロス','円/m'],['cf','CF','円/m'],['soft','ソフト巾木','円/枚'],['floorTrim','床見切り','円/本']].map(([key,label,unit])=><label key={key}><span>{label}</span><div><input type="number" min="0" step="1" inputMode="numeric" value={bulkMaterialRates[key]} onChange={event=>setBulkMaterialRates(previous=>({...previous,[key]:event.target.value}))} placeholder="未設定"/><b>{unit}</b></div></label>)}`,
`                              </div>`,
`                              <div className="bulkMaterialRateActions"><button type="button" onClick={()=>setShowBulkMaterialRates(false)}>閉じる</button><button type="button" className="primary" onClick={()=>{setMaterialOrderItems(previous=>(Array.isArray(previous)?previous:[]).map(item=>{const value=bulkMaterialRates[item.materialType];return value===''||value==null?item:{...item,unitPrice:Math.max(0,Number(value)||0)}}));setShowBulkMaterialRates(false);setBulkMaterialRates({cross:'',cf:'',soft:'',floorTrim:''});setMaterialAddNotice('工種別単価を反映しました');window.setTimeout(()=>setMaterialAddNotice(''),2200)}}>各材料に単価を反映</button></div>`,
`                            </section>}`
].join(nl);
one('material add button',addButton,panel);

const cssAnchor='  /* M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE */';
const css=`  /* ${marker} */${nl}  .bulkMaterialRatePanel{display:grid;gap:12px;padding:14px;border:2px solid rgba(47,125,87,.45);border-radius:14px;background:#f5fff9;color:#243d31}.bulkMaterialRatePanel header{display:grid;gap:2px}.bulkMaterialRatePanel header small{color:#5f7569}.bulkMaterialRateGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.bulkMaterialRateGrid label{margin:0}.bulkMaterialRateGrid label>div{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px}.bulkMaterialRateGrid input{text-align:right}.bulkMaterialRateGrid b{font-size:12px;color:#5f7569}.bulkMaterialRateActions{display:grid;grid-template-columns:1fr 1.5fr;gap:8px}.bulkMaterialRateActions button{min-height:44px}@media(max-width:620px){.bulkMaterialRateGrid{grid-template-columns:1fr}.bulkMaterialRateActions{grid-template-columns:1fr}.bulkMaterialRatePanel{padding:11px}}${nl}`+cssAnchor;
one('css anchor',cssAnchor,css);

fs.copyFileSync(file,backup);fs.writeFileSync(file,s,'utf8');
console.log('OK: bulk material rate panel added');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
