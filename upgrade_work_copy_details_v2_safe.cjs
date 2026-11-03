const fs=require('fs');
const p='./src/MCrossEstimateSheet.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_WORK_COPY_DETAILS_V2_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const old=" const copySelectedWork=async()=>{const picked=rows.filter(row=>selectedWorkIds.includes(row.id));if(!picked.length){window.alert('コピーする作業項目を選択してください。');return}const text=['【作業内容】',...picked.map(row=>'・'+workText(row)).filter(v=>v!=='・')].join('\\n');try{await navigator.clipboard.writeText(text)}catch{const a=document.createElement('textarea');a.value=text;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}window.alert(picked.length+'件の作業内容をコピーしました。')}";
const neu=` /* ${mark} */
 const copySelectedWork=async()=>{const picked=rows.filter(row=>selectedWorkIds.includes(row.id));if(!picked.length){window.alert('コピーする作業項目を選択してください。');return}const property=[propertyName,unit?String(unit).replace(/号室$/,'')+'号室':''].filter(Boolean).join(' ');const workLines=picked.map(row=>{const name=workText(row);const q=Number(row.quantity);const u=String(row.unit||'').trim();const qty=(Number.isFinite(q)&&q>0&&u&&!(q===1&&u==='式'))?' '+String(Number.isInteger(q)?q:Math.round(q*10)/10)+u:'';return name?'・'+name+qty:''}).filter(Boolean);const blocks=[];if(property)blocks.push('【物件】\\n'+property);if(address)blocks.push('【住所】\\n'+address);blocks.push('【作業内容】\\n'+workLines.join('\\n'));const text=blocks.join('\\n\\n');try{await navigator.clipboard.writeText(text)}catch{const a=document.createElement('textarea');a.value=text;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}window.alert(picked.length+'件の作業内容をコピーしました。')}`;
const n=s.split(old).length-1;
if(n!==1){console.error('ERROR: 現在のコピー処理 MATCH='+n+'。変更していません。');process.exit(1)}
fs.copyFileSync(p,'./src/MCrossEstimateSheet.before_work_copy_details_v2.jsx');
s=s.replace(old,neu);
fs.writeFileSync(p,s,'utf8');
console.log('OK: コピー内容へ物件名・号室・住所・数量単位を追加しました（1式は省略）。');
