const fs=require('fs');
const jsx='./src/MCrossEstimateSheet.jsx';
const css='./src/MCrossEstimateSheet.css';
let s=fs.readFileSync(jsx,'utf8');
let c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_WORK_DRAG_SELECT_V2_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_WORK_CHECKBOX_LEFT_V1_SAFE')){console.error('ERROR: 左チェック版がありません。変更していません。');process.exit(1)}
if(!/import\s*\{[^}]*useRef[^}]*\}\s*from\s*['"]react['"]/.test(s)){console.error('ERROR: React import に useRef がありません。変更していません。');process.exit(1)}
const toggle=" const toggleWork=id=>setSelectedWorkIds(prev=>prev.includes(id)?prev.filter(v=>v!==id):[...prev,id])";
if(s.split(toggle).length-1!==1){console.error('ERROR: toggleWork位置不一致。変更していません。');process.exit(1)}
const drag=` /* ${mark} */
 const workDrag=useRef({active:false,selecting:true,touched:new Set()})
 const setWorkSelected=(id,selected)=>setSelectedWorkIds(prev=>selected?(prev.includes(id)?prev:[...prev,id]):prev.filter(v=>v!==id))
 const beginWorkSlide=(event,id)=>{if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();const selecting=!selectedWorkIds.includes(id);workDrag.current={active:true,selecting,touched:new Set([id])};setWorkSelected(id,selecting)}
 const moveWorkSlide=event=>{if(!workDrag.current.active)return;event.preventDefault();const target=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('[data-work-check-id]');const id=target?.dataset?.workCheckId;if(!id||workDrag.current.touched.has(id))return;workDrag.current.touched.add(id);setWorkSelected(id,workDrag.current.selecting)}
 const endWorkSlide=()=>{workDrag.current.active=false}`;
s=s.replace(toggle,toggle+'\n'+drag);
const cell="<span className='mcrossWorkCheckCell'><input type='checkbox' checked={selectedWorkIds.includes(row.id)} onChange={()=>toggleWork(row.id)} aria-label={(workText(row)||'作業')+'を作業用に選択'} /></span>";
if(s.split(cell).length-1!==1){console.error('ERROR: チェックセル位置不一致。変更していません。');process.exit(1)}
const newCell="<span className={'mcrossWorkCheckCell '+(selectedWorkIds.includes(row.id)?'selected':'')} data-work-check-id={row.id} onPointerDown={event=>beginWorkSlide(event,row.id)} onPointerMove={moveWorkSlide} onPointerUp={endWorkSlide} onPointerCancel={endWorkSlide}><input type='checkbox' checked={selectedWorkIds.includes(row.id)} onChange={()=>{}} aria-label={(workText(row)||'作業')+'を作業用に選択'} /></span>";
s=s.replace(cell,newCell);
c+=`\n/* ${mark} */\n.mcrossWorkCheckCell{user-select:none;-webkit-user-select:none;cursor:pointer}.mcrossWorkCheckCell.selected{background:rgba(95,190,161,.2)!important}.mcrossWorkCheckCell.selected input{outline:2px solid rgba(95,190,161,.45)}@media(hover:none) and (pointer:coarse){.mcrossWorkCheckCell{touch-action:none!important}}\n`;
fs.copyFileSync(jsx,'./src/MCrossEstimateSheet.before_work_drag_select_v2.jsx');
fs.copyFileSync(css,'./src/MCrossEstimateSheet.before_work_drag_select_v2.css');
fs.writeFileSync(jsx,s,'utf8');
fs.writeFileSync(css,c,'utf8');
console.log('OK: 左の選択列だけ、押したまま上下になぞって連続選択・解除できるようにしました。');
