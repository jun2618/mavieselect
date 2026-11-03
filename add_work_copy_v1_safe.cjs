const fs=require('fs');
const p='./src/MCrossEstimateSheet.jsx';
let s=fs.readFileSync(p,'utf8');
const marker='M-CROSS_WORK_COPY_V1_SAFE';
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup='./src/MCrossEstimateSheet.before_work_copy_v1.jsx';
function replaceOnce(re,replacement,label){const matches=s.match(re);if(!matches||matches.length!==1){console.error(`ERROR: ${label} MATCH=${matches?matches.length:0}。変更していません。`);process.exit(1)}s=s.replace(re,replacement)}

// selected work rows state: place after rows state declaration
replaceOnce(/(const\s*\[rows,setRows\]\s*=\s*useState\([^\n]+\))/,
`$1\n /* ${marker} */\n const[selectedWorkIds,setSelectedWorkIds]=useState([])\n const toggleWork=id=>setSelectedWorkIds(previous=>previous.includes(id)?previous.filter(value=>value!==id):[...previous,id])\n const selectAllWork=()=>setSelectedWorkIds(rows.map(row=>row.id))\n const clearWork=()=>setSelectedWorkIds([])\n const getWorkText=row=>String(row.workText||row.name||'').replace(/[　 ]+/g,' ').trim()\n const copySelectedWork=async()=>{const selected=rows.filter(row=>selectedWorkIds.includes(row.id));if(!selected.length){window.alert('コピーする作業項目を選択してください。');return}const text=['【作業内容】',...selected.map(row=>'・'+getWorkText(row))].join('\\n');try{await navigator.clipboard.writeText(text)}catch{const area=document.createElement('textarea');area.value=text;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove()}window.alert(selected.length+'件の作業内容をコピーしました。')}`,
'rows state');

// Imported source rows retain structured work text, but blank columns are not guessed or filled.
replaceOnce(/name:String\(\(Array\.isArray\(row\.parts\)&&row\.parts\.filter\(Boolean\)\.length\?row\.parts\.filter\(Boolean\)\.join\(' '\):row\.label\|\|' '\)\)\.replace\(\/クロス部分張替\/g,'クロス張替'\)\.replace\(\/\[　 \]\+\/g,' '\)\.trim\(\),spec:/,
`name:String((Array.isArray(row.parts)&&row.parts.filter(Boolean).length?row.parts.filter(Boolean).join(' '):row.label||'')).replace(/クロス部分張替/g,'クロス張替').replace(/[　 ]+/g,' ').trim(),workText:String((Array.isArray(row.parts)?row.parts:[]).map(value=>String(value||'').trim()).filter(Boolean).join(' ')||row.label||'').replace(/[　 ]+/g,' ').trim(),spec:`,
'import work text');

// Add work-copy controls to the existing toolbar.
replaceOnce(/(<div className='mcrossEstimateToolbar'>)([\s\S]*?)(<\/div>\s*<div className='mcrossEstimateTable editable'>)/,
`$1$2<button type='button' onClick={selectAllWork}>作業をすべて選択</button><button type='button' onClick={clearWork}>選択解除</button><button type='button' className='mcrossWorkCopyButton' onClick={copySelectedWork}>📋 選択した作業をコピー（{selectedWorkIds.length}件）</button>$3`,
'estimate toolbar');

// Put selection checkbox in the existing operation cell, preserving delete.
replaceOnce(/<span><button type='button' className='mcrossEstimateDelete' onClick=\{\(\)=>remove\(row\.id\)\}>×<\/button><\/span>/,
`<span className='mcrossEstimateActions'><label className='mcrossWorkSelect'><input type='checkbox' checked={selectedWorkIds.includes(row.id)} onChange={()=>toggleWork(row.id)} aria-label={(getWorkText(row)||'作業')+'を作業用に選択'} /><small>作業</small></label><button type='button' className='mcrossEstimateDelete' onClick={()=>remove(row.id)}>×</button></span>`,
'operation cell');

fs.copyFileSync(p,backup);
fs.writeFileSync(p,s,'utf8');
console.log('OK: 見積明細の複数選択とTimeTree向け作業内容コピーを追加しました。');
