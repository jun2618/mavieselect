const fs=require('fs');
const jsx='./src/MCrossEstimateSheet.jsx';
const css='./src/MCrossEstimateSheet.css';
let s=fs.readFileSync(jsx,'utf8');
let c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_WORK_DRAG_SELECT_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_WORK_CHECKBOX_LEFT_V1_SAFE')){console.error('ERROR: 左チェック版が見つかりません。変更していません。');process.exit(1)}
const old=" const toggleWork=id=>setSelectedWorkIds(prev=>prev.includes(id)?prev.filter(v=>v!==id):[...prev,id])";
const neu=` /* ${mark} */
 const workDragRef=useRef({active:false,selecting:true,touched:new Set()})
 const setWorkSelected=(id,selected)=>setSelectedWorkIds(prev=>selected?(prev.includes(id)?prev:[...prev,id]):prev.filter(v=>v!==id))
 const toggleWork=id=>setSelectedWorkIds(prev=>prev.includes(id)?prev.filter(v=>v!==id):[...prev,id])
 const beginWorkDrag=(event,id)=>{if(event.pointerType==='mouse'&&event.button!==0)return;const selecting=!selectedWorkIds.includes(id);workDragRef.current={active:true,selecting,touched:new Set([id])};setWorkSelected(id,selecting);try{event.currentTarget.setPointerCapture?.(event.pointerId)}catch{}}
 const moveWorkDrag=event=>{if(!workDragRef.current.active)return;const hit=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('[data-work-select-id]');const id=hit?.dataset?.workSelectId;if(!id||workDragRef.current.touched.has(id))return;workDragRef.current.touched.add(id);setWorkSelected(id,workDragRef.current.selecting)}
 const endWorkDrag=()=>{workDragRef.current.active=false}`;
let n=s.split(old).length-1;if(n!==1){console.error('ERROR: toggleWork位置 MATCH='+n+'。変更していません。');process.exit(1)}s=s.replace(old,neu);
const oldCell="<span className='mcrossWorkCheckCell'><input type='checkbox' checked={selectedWorkIds.includes(row.id)} onChange={()=>toggleWork(row.id)} aria-label={(workText(row)||'作業')+'を作業用に選択'} /></span>";
const newCell="<span className={'mcrossWorkCheckCell '+(selectedWorkIds.includes(row.id)?'selected':'')} data-work-select-id={row.id} onPointerDown={event=>beginWorkDrag(event,row.id)} onPointerMove={moveWorkDrag} onPointerUp={endWorkDrag} onPointerCancel={endWorkDrag}><input type='checkbox' checked={selectedWorkIds.includes(row.id)} onChange={()=>{}} aria-label={(workText(row)||'作業')+'を作業用に選択'} /></span>";
n=s.split(oldCell).length-1;if(n!==1){console.error('ERROR: 選択セル MATCH='+n+'。変更していません。');process.exit(1)}s=s.replace(oldCell,newCell);
// Copy quantity/unit only if not 1式.
const copyOld="const text=['【作業内容】',...picked.map(row=>'・'+workText(row)).filter(v=>v!=='・')].join('\\n')";
const copyNew="const text=['【作業内容】',...picked.map(row=>{const name=workText(row);const q=Number(row.quantity);const unit=String(row.unit||'').trim();const suffix=(q===1&&unit==='式')?'':(Number.isFinite(q)&&q>0&&unit?' '+String(Number.isInteger(q)?q:Math.round(q*10)/10)+unit:'');return name?'・'+name+suffix:''}).filter(Boolean)].join('\\n')";
n=s.split(copyOld).length-1;if(n!==1){console.error('ERROR: コピー処理 MATCH='+n+'。変更していません。');process.exit(1)}s=s.replace(copyOld,copyNew);
const cssAdd=`\n/* ${mark} */\n.mcrossWorkCheckCell{touch-action:pan-y;user-select:none;-webkit-user-select:none}.mcrossWorkCheckCell.selected{background:rgba(200,85,119,.16)!important}.mcrossWorkCheckCell.selected input[type=checkbox]{filter:saturate(1.15)}@media(hover:none) and (pointer:coarse){.mcrossWorkCheckCell{touch-action:none}}\n`;
c+=cssAdd;
fs.copyFileSync(jsx,'./src/MCrossEstimateSheet.before_work_drag_select_v1.jsx');
fs.copyFileSync(css,'./src/MCrossEstimateSheet.before_work_drag_select_v1.css');
fs.writeFileSync(jsx,s,'utf8');fs.writeFileSync(css,c,'utf8');
console.log('OK: チェック列のなぞり連続選択・解除と、1式省略コピーを追加しました。');
