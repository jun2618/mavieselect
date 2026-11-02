const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_BULK_MATERIAL_RATE_PANEL_V3_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const nl=s.includes('\r\n')?'\r\n':'\n';
const backup=file+'.before-bulk-material-rate-panel-v3-'+Date.now()+'.bak';
function once(label,a,b){const n=s.split(a).length-1;if(n!==1){console.error('ERROR: '+label+' MATCH='+n+'; no changes');process.exit(1)}s=s.replace(a,b)}

const stateAnchor='  const [copiedMaterialRate,setCopiedMaterialRate]=useState(null)';
const stateBlock=[stateAnchor,`  /* ${marker} */`,`  const [showBulkMaterialRates,setShowBulkMaterialRates]=useState(false)`,`  const [bulkMaterialRates,setBulkMaterialRates]=useState({cross:'',cf:'',soft:'',floorTrim:''})`].join(nl);
once('state',stateAnchor,stateBlock);

const buttonClose='                            ＋ 材料行を追加'+nl+'                          </button>';
const panel=[buttonClose,
`                          <button type="button" className="secondaryButton" style={{marginTop:'8px'}} onClick={()=>setShowBulkMaterialRates(true)}>💰 工種別単価を一括設定</button>`,
`                          {showBulkMaterialRates&&<section style={{display:'grid',gap:'12px',margin:'10px 0',padding:'14px',border:'2px solid rgba(47,125,87,.48)',borderRadius:'14px',background:'#f5fff9',color:'#243d31'}}>`,
`                            <div style={{display:'grid',gap:'3px'}}><strong>工種別単価を一括設定</strong><small>入力した工種だけ反映します</small></div>`,
`                            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'10px'}}>`,
`                              {[['cross','クロス','円/m'],['cf','CF','円/m'],['soft','ソフト巾木','円/枚'],['floorTrim','床見切り','円/本']].map(([key,label,unit])=><label key={key} style={{margin:0}}><span>{label}</span><div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',alignItems:'center',gap:'6px'}}><input type="number" min="0" step="1" inputMode="numeric" value={bulkMaterialRates[key]} onChange={event=>setBulkMaterialRates(previous=>({...previous,[key]:event.target.value}))} placeholder="未設定" style={{textAlign:'right'}}/><b style={{fontSize:'12px',whiteSpace:'nowrap'}}>{unit}</b></div></label>)}`,
`                            </div>`,
`                            <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:'8px'}}>`,
`                              <button type="button" onClick={()=>{setShowBulkMaterialRates(false);setBulkMaterialRates({cross:'',cf:'',soft:'',floorTrim:''})}}>取消</button>`,
`                              <button type="button" className="primary" onClick={()=>{setMaterialOrderItems(previous=>(Array.isArray(previous)?previous:[]).map(item=>{const rate=bulkMaterialRates[item.materialType];return rate===''||rate==null?item:{...item,unitPrice:Math.max(0,Number(rate)||0)}}));setShowBulkMaterialRates(false);setBulkMaterialRates({cross:'',cf:'',soft:'',floorTrim:''});setMaterialAddNotice('工種別単価を反映しました');window.setTimeout(()=>setMaterialAddNotice(''),2200)}}>各材料に単価を反映</button>`,
`                            </div>`,
`                          </section>}`
].join(nl);
once('panel insertion',buttonClose,panel);

fs.copyFileSync(file,backup);fs.writeFileSync(file,s,'utf8');
console.log('OK: bulk material rate panel V3 added');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
