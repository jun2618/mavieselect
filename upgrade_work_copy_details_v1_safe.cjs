const fs=require('fs');
const p='./src/MCrossEstimateSheet.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_WORK_COPY_DETAILS_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_WORK_COPY_V2_SAFE')){console.error('ERROR: 作業コピーV2が見つかりません。変更していません。');process.exit(1)}
const start=s.indexOf(' const copySelectedWork=async()=>{');
const end=s.indexOf('\n const importMeasurement=',start);
if(start<0||end<0){console.error('ERROR: コピー処理位置が見つかりません。変更していません。');process.exit(1)}
const replacement=` /* ${mark} */
 const copySelectedWork=async()=>{
  const picked=rows.filter(row=>selectedWorkIds.includes(row.id))
  if(!picked.length){window.alert('コピーする作業項目を選択してください。');return}
  const propertyLine=[propertyName,unit?String(unit).replace(/号室$/,'')+'号室':''].filter(Boolean).join(' ')
  const workLines=picked.map(row=>{
   const name=workText(row)
   const quantity=Number(row.quantity)
   const unitName=String(row.unit||'').trim()
   const showQuantity=Number.isFinite(quantity)&&quantity>0&&unitName&&!(quantity===1&&unitName==='式')
   const quantityText=showQuantity?' '+String(Number.isInteger(quantity)?quantity:Math.round(quantity*10)/10)+unitName:''
   return name?'・'+name+quantityText:''
  }).filter(Boolean)
  const text=[propertyLine?'【物件】\\n'+propertyLine:'',address?'【住所】\\n'+address:'','【作業内容】',...workLines].filter(Boolean).join('\\n\\n')
  try{await navigator.clipboard.writeText(text)}catch{const area=document.createElement('textarea');area.value=text;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove()}
  window.alert(picked.length+'件の作業内容をコピーしました。')
 }`;
fs.copyFileSync(p,'./src/MCrossEstimateSheet.before_work_copy_details_v1.jsx');
s=s.slice(0,start)+replacement+s.slice(end);
fs.writeFileSync(p,s,'utf8');
console.log('OK: 物件名・号室・住所と、1式を除く数量単位を作業コピーへ追加しました。');
