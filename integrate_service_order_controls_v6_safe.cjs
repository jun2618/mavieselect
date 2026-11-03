const fs=require('fs');
const p='./src/MCrossServiceOrderSheet.jsx';
const css='./src/MCrossServiceOrderSheet.css';
if(!fs.existsSync(p)||!fs.existsSync(css)){console.error('ERROR: modular service-order files not found. no changes');process.exit(1)}
let s=fs.readFileSync(p,'utf8'); let c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_SERVICE_ORDER_CONTROLS_V6_SAFE';
if(s.includes(mark)||c.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const sig="export default function MCrossServiceOrderSheet({orderDraft,setOrderDraft,propertyName='',unit='',address='',workName='',onSave}){";
if((s.split(sig).length-1)!==1){console.error('ERROR: component signature not found. no changes');process.exit(1)}
const newsig="export default function MCrossServiceOrderSheet({orderDraft,setOrderDraft,propertyName='',unit='',address='',workName='',onSave,onChooseContractor}){";
s=s.replace(sig,newsig);
const metaEnd='</section>\n  <div className="mcrossServiceSheetTable">';
if((s.split(metaEnd).length-1)!==1){console.error('ERROR: metadata/table boundary not found. no changes');process.exit(1)}
const controls=`</section>\n  {/* ${mark} */}\n  <section className="mcrossServiceSheetControls">\n    <button type="button" className="contractor" onClick={onChooseContractor}>🔎 {orderDraft?.contractor||'協力業者を選択'}</button>\n    {['cross','cf'].map(category=>{const group=items.filter(item=>item.category===category);if(!group.length)return null;const current=group[0]?.factor??1;return <div className="factor" key={category}><strong>{category==='cross'?'クロス':'CF'}</strong><span>{group.length}項目</span><div>{[1,.9,.85].map(value=><button type="button" key={value} className={current===value?'active':''} onClick={()=>setOrderDraft(previous=>({...previous,items:previous.items.map(item=>item.category===category?{...item,factor:value,orderQuantity:Math.round((Number(item.sourceQuantity)||0)*value*100)/100}:item)}))}>×{value.toFixed(2)}</button>)}</div></div>})}\n  </section>\n  <div className="mcrossServiceSheetTable">`;
s=s.replace(metaEnd,controls);
fs.copyFileSync(p,'./src/MCrossServiceOrderSheet.before_controls_v6.jsx');
fs.writeFileSync(p,s,'utf8');
const add=`\n/* ${mark} */\n.mcrossServiceSheet{width:min(100%,920px)!important;max-width:920px!important}\n.mcrossServiceSheetControls{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px;margin:6px 0 8px}.mcrossServiceSheetControls>button,.mcrossServiceSheetControls .factor{min-height:36px;border:1px solid #83a98b;border-radius:9px;background:#f7fcf5;box-sizing:border-box}.mcrossServiceSheetControls>button{padding:5px 8px;color:#285f3c;font:inherit;font-weight:900;text-align:left}.mcrossServiceSheetControls .factor{display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:5px;padding:4px 6px}.mcrossServiceSheetControls .factor>strong{font-size:11px;color:#285f3c}.mcrossServiceSheetControls .factor>span{font-size:9px;color:#67806c}.mcrossServiceSheetControls .factor>div{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}.mcrossServiceSheetControls .factor button{min-height:25px;padding:1px 4px;border:1px solid #9ec5a6;border-radius:6px;background:#fff;color:#526358;font-size:10px}.mcrossServiceSheetControls .factor button.active{background:#3f945c;color:#fff;border-color:#3f945c}\n@media(max-width:1024px){.mcrossServiceSheet{width:calc(100% - 18px)!important;max-width:920px!important}.mcrossServiceSheetControls{grid-template-columns:1.25fr 1fr 1fr}}\n@media(max-width:700px){.mcrossServiceSheetControls{grid-template-columns:1fr}.mcrossServiceSheetControls .factor{grid-template-columns:55px 45px 1fr}}\n`;
fs.writeFileSync(css,c+add,'utf8');
console.log('OK: 発注書を見積書と同じ920px幅に戻し、発注先・掛率操作を発注書内へコンパクトに統合しました。');
