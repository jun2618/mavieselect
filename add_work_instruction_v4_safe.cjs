const fs=require('fs');
const path=require('path');
const main='./src/MCrossEstimateSheet.jsx';
const component='./src/WorkInstructionModal.jsx';
const css='./src/WorkInstructionModal.css';
let s=fs.readFileSync(main,'utf8');
const mark='M-CROSS_WORK_INSTRUCTION_V4_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_WORK_COPY_V2_SAFE')){console.error('ERROR: 作業コピーV2がありません。変更していません。');process.exit(1)}
const importAnchor="import './MCrossEstimateSheet.css'";
const stateAnchor=" const[selectedWorkIds,setSelectedWorkIds]=useState([])";
const copyStart="<button type='button' className='mcrossWorkCopyButton' onClick={copySelectedWork}>";
for(const [value,label] of [[importAnchor,'import位置'],[stateAnchor,'選択state'],[copyStart,'コピーボタン']]){
 const n=s.split(value).length-1;if(n!==1){console.error(`ERROR: ${label} MATCH=${n}。変更していません。`);process.exit(1)}
}
const copyIndex=s.indexOf(copyStart);
const copyEnd=s.indexOf('</button>',copyIndex);
const lastSection=s.lastIndexOf('</section>');
if(copyEnd<0||lastSection<0){console.error('ERROR: 挿入位置を特定できません。変更していません。');process.exit(1)}
const componentCode=`import './WorkInstructionModal.css'\n\nexport default function WorkInstructionModal({open,onClose,propertyName='',unit='',address='',workName='',propertyAccess={},rows=[],selectedIds=[]}){\n if(!open)return null\n const selected=rows.filter(row=>selectedIds.includes(row.id))\n const quantity=row=>{const q=Number(row.quantity),u=String(row.unit||'').trim();return Number.isFinite(q)&&q>0&&u&&!(q===1&&u==='式')?String(Number.isInteger(q)?q:Math.round(q*10)/10)+u:''}\n const access=[['オートロック',propertyAccess.autoLock],['キーボックス',propertyAccess.keyBox],['ドアジョイナー',propertyAccess.joiner],['マイロック',propertyAccess.myLock],['玄関開放',propertyAccess.entranceOpen]].filter(([,value])=>String(value||'').trim())\n return <div className="workInstructionBackdrop" onClick={onClose}><section className="workInstructionSheet" onClick={event=>event.stopPropagation()}>\n  <header><div><small>WORK INSTRUCTION</small><h2>作 業 指 示 書</h2></div><button type="button" onClick={onClose}>× 閉じる</button></header>\n  <section className="workInstructionMeta"><p><b>物件：</b>{[propertyName,unit?String(unit).replace(/号室$/,'')+'号室':''].filter(Boolean).join(' ')}</p>{address&&<p><b>住所：</b>{address}</p>}<p><b>工事名：</b>{workName}</p></section>\n  {access.length>0&&<section className="workInstructionAccess"><h3>🔑 鍵・入館情報</h3>{access.map(([label,value])=><p key={label}><b>{label}：</b>{String(value)}</p>)}</section>}\n  <section className="workInstructionJobs"><h3>作業内容</h3>{selected.map((row,index)=><div key={row.id}><span>{index+1}</span><strong>{String(row.name||'').replace(/[　 ]+/g,' ').trim()}</strong>{quantity(row)&&<b>{quantity(row)}</b>}</div>)}</section>\n  <footer><button type="button" onClick={()=>window.print()}>🖨 印刷 / PDF</button></footer>\n </section></div>\n}\n`;
const cssCode=`.workInstructionBackdrop{position:fixed;z-index:5000;inset:0;padding:14px;background:rgba(0,0,0,.72);overflow:auto}.workInstructionSheet{width:min(100%,860px);margin:0 auto;padding:22px;border-radius:18px;background:#fff;color:#2d2926;box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,.35)}.workInstructionSheet>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:2px solid #c98a96}.workInstructionSheet h2{margin:2px 0;text-align:left}.workInstructionSheet header button,.workInstructionSheet footer button{min-height:44px;padding:8px 14px}.workInstructionMeta{padding:12px 0}.workInstructionMeta p,.workInstructionAccess p{margin:5px 0}.workInstructionAccess{padding:10px 12px;border-radius:12px;background:#fff4e5}.workInstructionAccess h3,.workInstructionJobs h3{margin:0 0 8px}.workInstructionJobs{margin-top:14px}.workInstructionJobs>div{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px 4px;border-bottom:1px solid #ddd}.workInstructionSheet footer{display:flex;justify-content:flex-end;margin-top:16px}@media(max-width:620px){.workInstructionBackdrop{padding:4px}.workInstructionSheet{padding:14px;border-radius:10px}.workInstructionJobs>div{grid-template-columns:28px minmax(0,1fr) auto}}@media print{body *{visibility:hidden!important}.workInstructionBackdrop,.workInstructionBackdrop *{visibility:visible!important}.workInstructionBackdrop{position:absolute!important;inset:0!important;padding:0!important;background:#fff!important}.workInstructionSheet{width:100%!important;max-width:none!important;margin:0!important;padding:10mm!important;box-shadow:none!important;border-radius:0!important}.workInstructionSheet header button,.workInstructionSheet footer{display:none!important}}\n`;
fs.copyFileSync(main,'./src/MCrossEstimateSheet.before_work_instruction_v4.jsx');
if(fs.existsSync(component))fs.copyFileSync(component,component+'.before-v4');
if(fs.existsSync(css))fs.copyFileSync(css,css+'.before-v4');
s=s.replace(importAnchor,importAnchor+"\nimport WorkInstructionModal from './WorkInstructionModal.jsx'\n/* "+mark+" */");
s=s.replace(stateAnchor,stateAnchor+"\n const[showWorkInstruction,setShowWorkInstruction]=useState(false)");
const button="<button type='button' className='mcrossWorkInstructionButton' onClick={()=>selectedWorkIds.length?setShowWorkInstruction(true):window.alert('作業指示書に載せる項目を選択してください。')}>📄 作業指示書（{selectedWorkIds.length}件）</button>";
s=s.slice(0,s.indexOf(copyStart)+s.slice(s.indexOf(copyStart)).indexOf('</button>')+9)+button+s.slice(s.indexOf(copyStart)+s.slice(s.indexOf(copyStart)).indexOf('</button>')+9);
const insert=s.lastIndexOf('</section>');
const modal="<WorkInstructionModal open={showWorkInstruction} onClose={()=>setShowWorkInstruction(false)} propertyName={propertyName} unit={unit} address={address} workName={workName} propertyAccess={propertyAccess} rows={rows} selectedIds={selectedWorkIds} />\n ";
s=s.slice(0,insert)+modal+s.slice(insert);
fs.writeFileSync(component,componentCode,'utf8');
fs.writeFileSync(css,cssCode,'utf8');
fs.writeFileSync(main,s,'utf8');
console.log('OK: 作業指示書V4を別コンポーネントとして追加しました。');
