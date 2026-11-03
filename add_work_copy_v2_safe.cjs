const fs=require('fs');
const p='./src/MCrossEstimateSheet.jsx';
let s=fs.readFileSync(p,'utf8');
const marker='M-CROSS_WORK_COPY_V2_SAFE';
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup='./src/MCrossEstimateSheet.before_work_copy_v2.jsx';
const eol=s.includes('\r\n')?'\r\n':'\n';
let L=s.split(/\r?\n/);
function findOne(test,label){const hits=[];L.forEach((line,i)=>{if(test(line,i))hits.push(i)});if(hits.length!==1){console.error(`ERROR: ${label} MATCH=${hits.length}。変更していません。`);process.exit(1)}return hits[0]}

// Exact editable-estimate rows state at current line 8.
let i=findOne(line=>line.trim().startsWith("const[rows,setRows]=useState(() =>")||line.trim().startsWith("const[rows,setRows]=useState(()=>"),'見積rows state');
const stateLines=[
 ` /* ${marker} */`,
 ` const[selectedWorkIds,setSelectedWorkIds]=useState([])`,
 ` const toggleWork=id=>setSelectedWorkIds(prev=>prev.includes(id)?prev.filter(v=>v!==id):[...prev,id])`,
 ` const selectAllWork=()=>setSelectedWorkIds(rows.map(row=>row.id))`,
 ` const clearWork=()=>setSelectedWorkIds([])`,
 ` const workText=row=>String(row.name||'').replace(/[　 ]+/g,' ').trim()`,
 ` const copySelectedWork=async()=>{const picked=rows.filter(row=>selectedWorkIds.includes(row.id));if(!picked.length){window.alert('コピーする作業項目を選択してください。');return}const text=['【作業内容】',...picked.map(row=>'・'+workText(row)).filter(v=>v!=='・')].join('\\n');try{await navigator.clipboard.writeText(text)}catch{const a=document.createElement('textarea');a.value=text;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}window.alert(picked.length+'件の作業内容をコピーしました。')}`
];
L.splice(i+1,0,...stateLines);

// Replace toolbar line exactly, keeping existing two buttons and adding work controls.
i=findOne(line=>line.includes("<div className='mcrossEstimateToolbar'>") && line.includes('importMeasurement'),'見積ツールバー');
L[i]=`   <div className='mcrossEstimateToolbar'><button type='button' onClick={importMeasurement}>📐 採寸・工事内容から取り込む</button><button type='button' onClick={()=>setRows(previous=>[...previous,newRow()])}>＋ 空の行を追加</button><button type='button' onClick={selectAllWork}>☑ 作業をすべて選択</button><button type='button' onClick={clearWork}>選択解除</button><button type='button' className='mcrossWorkCopyButton' onClick={copySelectedWork}>📋 選択した作業をコピー（{selectedWorkIds.length}件）</button></div>`;

// Replace estimate table line exactly: only operation cell changes.
i=findOne(line=>line.includes("<div className='mcrossEstimateTable editable'>") && line.includes("mcrossEstimateDelete"),'見積明細行');
const oldOp="<span><button type='button' className='mcrossEstimateDelete' onClick={()=>remove(row.id)}>×</button></span>";
if(!L[i].includes(oldOp)){console.error('ERROR: 操作セルが現在コードと一致しません。変更していません。');process.exit(1)}
const newOp="<span className='mcrossEstimateActions'><label className='mcrossWorkSelect'><input type='checkbox' checked={selectedWorkIds.includes(row.id)} onChange={()=>toggleWork(row.id)} aria-label={(workText(row)||'作業')+'を作業用に選択'} /><small>作業</small></label><button type='button' className='mcrossEstimateDelete' onClick={()=>remove(row.id)}>×</button></span>";
L[i]=L[i].replace(oldOp,newOp);

fs.copyFileSync(p,backup);
fs.writeFileSync(p,L.join(eol),'utf8');
console.log('OK: 見積明細の複数選択とTimeTree用作業コピーを追加しました。');
