const fs=require('fs');
const jsx='./src/MCrossEstimateSheet.jsx';
const css='./src/MCrossEstimateSheet.css';
let s=fs.readFileSync(jsx,'utf8');
let c=fs.readFileSync(css,'utf8');
const mark='M-CROSS_WORK_DRAG_SELECT_V3_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_WORK_CHECKBOX_LEFT_V1_SAFE')){console.error('ERROR: 左チェック版がありません。変更していません。');process.exit(1)}
const newRowLine="const newRow=()=>({id:'estimate-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name:'',spec:'',quantity:1,unit:'式',rate:''})";
if((s.split(newRowLine).length-1)!==1){console.error('ERROR: newRow位置が一致しません。変更していません。');process.exit(1)}
const toggle=" const toggleWork=id=>setSelectedWorkIds(prev=>prev.includes(id)?prev.filter(v=>v!==id):[...prev,id])";
if((s.split(toggle).length-1)!==1){console.error('ERROR: toggleWork位置が一致しません。変更していません。');process.exit(1)}
const cell="<span className='mcrossWorkCheckCell'><input type='checkbox' checked={selectedWorkIds.includes(row.id)} onChange={()=>toggleWork(row.id)} aria-label={(workText(row)||'作業')+'を作業用に選択'} /></span>";
if((s.split(cell).length-1)!==1){console.error('ERROR: チェックセル位置が一致しません。変更していません。');process.exit(1)}
fs.copyFileSync(jsx,'./src/MCrossEstimateSheet.before_work_drag_select_v3.jsx');
fs.copyFileSync(css,'./src/MCrossEstimateSheet.before_work_drag_select_v3.css');
s=s.replace(newRowLine,newRowLine+"\n/* "+mark+" */\nlet mcrossWorkSlide={active:false,selecting:true,touched:new Set()}");
const handlers=` const setWorkSelected=(id,selected)=>setSelectedWorkIds(prev=>selected?(prev.includes(id)?prev:[...prev,id]):prev.filter(v=>v!==id))
 const beginWorkSlide=(event,id)=>{if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();const selecting=!selectedWorkIds.includes(id);mcrossWorkSlide={active:true,selecting,touched:new Set([id])};setWorkSelected(id,selecting)}
 const moveWorkSlide=event=>{if(!mcrossWorkSlide.active)return;event.preventDefault();const hit=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('[data-work-check-id]');const id=hit?.dataset?.workCheckId;if(!id||mcrossWorkSlide.touched.has(id))return;mcrossWorkSlide.touched.add(id);setWorkSelected(id,mcrossWorkSlide.selecting)}
 const endWorkSlide=()=>{mcrossWorkSlide.active=false}`;
s=s.replace(toggle,toggle+'\n'+handlers);
const newCell="<span className={'mcrossWorkCheckCell '+(selectedWorkIds.includes(row.id)?'selected':'')} data-work-check-id={row.id} onPointerDown={event=>beginWorkSlide(event,row.id)} onPointerMove={moveWorkSlide} onPointerUp={endWorkSlide} onPointerCancel={endWorkSlide}><input type='checkbox' checked={selectedWorkIds.includes(row.id)} onChange={()=>{}} aria-label={(workText(row)||'作業')+'を作業用に選択'} /></span>";
s=s.replace(cell,newCell);
c+=`\n/* ${mark} */\n.mcrossWorkCheckCell{user-select:none;-webkit-user-select:none;cursor:pointer}.mcrossWorkCheckCell.selected{background:rgba(95,190,161,.22)!important}.mcrossWorkCheckCell.selected input[type=checkbox]{outline:2px solid rgba(95,190,161,.45);outline-offset:1px}@media(hover:none) and (pointer:coarse){.mcrossWorkCheckCell{touch-action:none!important}}\n`;
fs.writeFileSync(jsx,s,'utf8');
fs.writeFileSync(css,c,'utf8');
console.log('OK: useRefなしで、左の選択列をなぞって連続選択・解除できるようにしました。');
