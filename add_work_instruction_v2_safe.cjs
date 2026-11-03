const fs=require('fs');
const jsx='./src/MCrossEstimateSheet.jsx';
const css='./src/MCrossEstimateSheet.css';
let s=fs.readFileSync(jsx,'utf8');
let c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_WORK_INSTRUCTION_V2_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_WORK_COPY_V2_SAFE')){console.error('ERROR: 作業コピーV2がありません。変更していません。');process.exit(1)}
const state=" const[selectedWorkIds,setSelectedWorkIds]=useState([])";
if(s.split(state).length-1!==1){console.error('ERROR: state位置不一致。変更していません。');process.exit(1)}
s=s.replace(state,state+"\n /* "+mark+" */\n const[showWorkInstruction,setShowWorkInstruction]=useState(false)");
const toolbarNeedle="<button type='button' className='mcrossWorkCopyButton' onClick={copySelectedWork}>";
const ti=s.indexOf(toolbarNeedle);
if(ti<0){console.error('ERROR: コピーボタン位置なし。変更していません。');process.exit(1)}
const tend=s.indexOf('</button>',ti);
if(tend<0){console.error('ERROR: コピーボタン終端なし。変更していません。');process.exit(1)}
const addButton="<button type='button' className='mcrossWorkInstructionButton' onClick={()=>selectedWorkIds.length?setShowWorkInstruction(true):window.alert('作業指示書に載せる項目を選択してください。')}>📄 作業指示書（{selectedWorkIds.length}件）</button>";
s=s.slice(0,tend+9)+addButton+s.slice(tend+9);
const last=s.lastIndexOf(" </section>\n}");
if(last<0){console.error('ERROR: コンポーネント末尾なし。変更していません。');process.exit(1)}
const modal=` {showWorkInstruction&&<div className='mcrossWorkInstructionBackdrop' onClick={()=>setShowWorkInstruction(false)}><section className='mcrossWorkInstruction' onClick={event=>event.stopPropagation()}><header><div><small>WORK INSTRUCTION</small><h2>作 業 指 示 書</h2></div><button type='button' onClick={()=>setShowWorkInstruction(false)}>× 閉じる</button></header><div className='mcrossWorkInstructionMeta'><p><b>物件：</b>{[propertyName,unit?String(unit).replace(/号室$/,'')+'号室':''].filter(Boolean).join(' ')}</p>{address&&<p><b>住所：</b>{address}</p>}<p><b>工事名：</b>{workName}</p></div>{[['オートロック',propertyAccess.autoLock],['キーボックス',propertyAccess.keyBox],['ドアジョイナー',propertyAccess.joiner],['マイロック',propertyAccess.myLock],['玄関開放',propertyAccess.entranceOpen]].some(([,v])=>String(v||'').trim())&&<section className='mcrossWorkInstructionAccess'><h3>🔑 鍵・入館情報</h3>{[['オートロック',propertyAccess.autoLock],['キーボックス',propertyAccess.keyBox],['ドアジョイナー',propertyAccess.joiner],['マイロック',propertyAccess.myLock],['玄関開放',propertyAccess.entranceOpen]].filter(([,v])=>String(v||'').trim()).map(([label,v])=><p key={label}><b>{label}：</b>{String(v)}</p>)}</section>}<section className='mcrossWorkInstructionJobs'><h3>作業内容</h3>{rows.filter(row=>selectedWorkIds.includes(row.id)).map((row,index)=>{const q=Number(row.quantity),u=String(row.unit||'').trim(),show=Number.isFinite(q)&&q>0&&u&&!(q===1&&u==='式');return <div key={row.id}><span>{index+1}</span><strong>{workText(row)}</strong>{show&&<b>{String(Number.isInteger(q)?q:Math.round(q*10)/10)}{u}</b>}</div>})}</section><footer><button type='button' onClick={()=>window.print()}>🖨 印刷 / PDF</button></footer></section></div>}\n`;
s=s.slice(0,last)+modal+s.slice(last);
const cssAdd=`\n/* ${mark} */\n.mcrossWorkInstructionButton{font-weight:900!important}.mcrossWorkInstructionBackdrop{position:fixed;z-index:5000;inset:0;padding:14px;background:rgba(0,0,0,.72);overflow:auto}.mcrossWorkInstruction{width:min(100%,860px);margin:0 auto;padding:22px;border-radius:18px;background:#fff;color:#2d2926;box-shadow:0 20px 60px rgba(0,0,0,.35)}.mcrossWorkInstruction>header{display:flex;align-items:start;justify-content:space-between;gap:12px;border-bottom:2px solid #c98a96;padding-bottom:12px}.mcrossWorkInstruction h2{margin:2px 0;text-align:left}.mcrossWorkInstruction header button{min-height:42px}.mcrossWorkInstructionMeta{padding:12px 0}.mcrossWorkInstructionMeta p,.mcrossWorkInstructionAccess p{margin:5px 0}.mcrossWorkInstructionAccess{padding:10px 12px;border-radius:12px;background:#fff4e5}.mcrossWorkInstructionAccess h3,.mcrossWorkInstructionJobs h3{margin:0 0 8px}.mcrossWorkInstructionJobs{margin-top:14px}.mcrossWorkInstructionJobs>div{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px 4px;border-bottom:1px solid #ddd}.mcrossWorkInstruction footer{display:flex;justify-content:flex-end;margin-top:16px}.mcrossWorkInstruction footer button{min-height:48px;padding:8px 18px}@media(max-width:620px){.mcrossWorkInstructionBackdrop{padding:4px}.mcrossWorkInstruction{padding:14px;border-radius:10px}.mcrossWorkInstructionJobs>div{grid-template-columns:28px minmax(0,1fr) auto}}@media print{.mcrossWorkInstructionBackdrop{position:absolute!important;inset:0!important;padding:0!important;background:#fff!important}.mcrossWorkInstruction{width:100%!important;max-width:none!important;margin:0!important;padding:10mm!important;box-shadow:none!important;border-radius:0!important}.mcrossWorkInstruction header button,.mcrossWorkInstruction footer{display:none!important}}\n`;
c+=cssAdd;
fs.copyFileSync(jsx,'./src/MCrossEstimateSheet.before_work_instruction_v2.jsx');
fs.copyFileSync(css,'./src/MCrossEstimateSheet.before_work_instruction_v2.css');
fs.writeFileSync(jsx,s,'utf8');
fs.writeFileSync(css,c,'utf8');
console.log('OK: 作業指示書V2を追加しました。');
