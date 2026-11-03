const fs=require('fs');
const p='./src/MCrossEstimateSheet.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_WORK_INSTRUCTION_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_WORK_COPY_V2_SAFE')){console.error('ERROR: 作業コピーV2が見つかりません。変更していません。');process.exit(1)}
const state=" const[selectedWorkIds,setSelectedWorkIds]=useState([])";
if((s.split(state).length-1)!==1){console.error('ERROR: 選択状態位置が一致しません。変更していません。');process.exit(1)}
s=s.replace(state,state+"\n /* "+mark+" */\n const[showWorkInstruction,setShowWorkInstruction]=useState(false)");
const helper=" const workText=row=>String(row.name||'').replace(/[　 ]+/g,' ').trim()";
if((s.split(helper).length-1)!==1){console.error('ERROR: workText位置が一致しません。変更していません。');process.exit(1)}
s=s.replace(helper,helper+"\n const selectedWorkRows=()=>rows.filter(row=>selectedWorkIds.includes(row.id))\n const workQuantityText=row=>{const q=Number(row.quantity),u=String(row.unit||'').trim();return Number.isFinite(q)&&q>0&&u&&!(q===1&&u==='式')?String(Number.isInteger(q)?q:Math.round(q*10)/10)+u:''}");
const toolbarEnd="<button type='button' className='mcrossWorkCopyButton' onClick={copySelectedWork}>📋 選択した作業をコピー（{selectedWorkIds.length}件）</button></div>";
const toolbarNew="<button type='button' className='mcrossWorkCopyButton' onClick={copySelectedWork}>📋 選択した作業をコピー（{selectedWorkIds.length}件）</button><button type='button' className='mcrossWorkInstructionButton' onClick={()=>selectedWorkIds.length?setShowWorkInstruction(true):window.alert('作業指示書に載せる項目を選択してください。')}>📄 作業指示書（{selectedWorkIds.length}件）</button></div>";
if((s.split(toolbarEnd).length-1)!==1){console.error('ERROR: ツールバー位置が一致しません。変更していません。');process.exit(1)}s=s.replace(toolbarEnd,toolbarNew);
const close="  </section>\n </section>";
if((s.split(close).length-1)!==1){console.error('ERROR: 見積末尾位置が一致しません。変更していません。');process.exit(1)}
const access=`{showWorkInstruction&&<div className='mcrossWorkInstructionBackdrop' onClick={()=>setShowWorkInstruction(false)}><section className='mcrossWorkInstruction' onClick={e=>e.stopPropagation()}><header><div><small>WORK INSTRUCTION</small><h2>作 業 指 示 書</h2></div><button type='button' onClick={()=>setShowWorkInstruction(false)}>× 閉じる</button></header><div className='mcrossWorkInstructionMeta'><p><b>物件：</b>{[propertyName,unit?String(unit).replace(/号室$/,'')+'号室':''].filter(Boolean).join(' ')}</p>{address&&<p><b>住所：</b>{address}</p>}<p><b>工事名：</b>{workName}</p></div>{[['オートロック',propertyAccess.autoLock],['キーボックス',propertyAccess.keyBox],['ドアジョイナー',propertyAccess.joiner],['マイロック',propertyAccess.myLock],['玄関開放',propertyAccess.entranceOpen]].some(([,v])=>String(v||'').trim())&&<section className='mcrossWorkInstructionAccess'><h3>🔑 鍵・入館情報</h3>{[['オートロック',propertyAccess.autoLock],['キーボックス',propertyAccess.keyBox],['ドアジョイナー',propertyAccess.joiner],['マイロック',propertyAccess.myLock],['玄関開放',propertyAccess.entranceOpen]].filter(([,v])=>String(v||'').trim()).map(([label,v])=><p key={label}><b>{label}：</b>{String(v)}</p>)}</section>}<section className='mcrossWorkInstructionJobs'><h3>作業内容</h3>{selectedWorkRows().map((row,index)=><div key={row.id}><span>{index+1}</span><strong>{workText(row)}</strong>{workQuantityText(row)&&<b>{workQuantityText(row)}</b>}</div>)}</section><footer><button type='button' onClick={()=>window.print()}>🖨 印刷 / PDF</button></footer></section></div>}`;
s=s.replace(close,"  </section>\n  "+access+"\n </section>");
fs.copyFileSync(p,'./src/MCrossEstimateSheet.before_work_instruction_v1.jsx');
fs.writeFileSync(p,s,'utf8');
console.log('OK: 選択した見積項目から作業指示書プレビューを作れるようにしました。');
