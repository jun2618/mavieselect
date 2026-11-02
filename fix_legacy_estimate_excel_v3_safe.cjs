const fs=require('fs');
const path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const backup=f+'.legacy-estimate-excel-v3-backup';
const marker='M-CROSS_LEGACY_ESTIMATE_EXCEL_V3_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx が見つかりません');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const original=s;
function one(label,from,to){const n=s.split(from).length-1;if(n!==1)throw new Error(label+' MATCH='+n);s=s.replace(from,to)}
try{
  one('worksForCombined',
"const worksForCombined = additionalWorks.filter((item,index) => !estimateEdits['additionalWork:' + (item.id || index)]?.excluded)",
"/* "+marker+" */\n                const worksForCombined = additionalWorks.map((item,index) => ({ ...item, legacyEstimateExcluded: Boolean(estimateEdits['additionalWork:' + (item.id || index)]?.excluded) }))");

  one('additionalRows',
"const additionalRows=(Array.isArray(additionalWorks)?additionalWorks:[]).map(item=>({parts:Array.isArray(item.estimateParts)&&item.estimateParts.length?[0,1,2,3].map(i=>String(item.estimateParts[i]||'')):[item.room||'','',item.work||'',''],memo:item.memo||'',quantity:Number(item.quantity||0),unit:item.unit||'式',rate:item.unitPrice===''||item.unitPrice==null?'':Number(item.unitPrice||0),amount:item.unitPrice===''||item.unitPrice==null?'':Number(item.amount||(Number(item.quantity)||0)*(Number(item.unitPrice)||0))}))",
"const additionalRows=(Array.isArray(additionalWorks)?additionalWorks:[]).map(item=>({parts:Array.isArray(item.estimateParts)&&item.estimateParts.length?[0,1,2,3].map(i=>String(item.estimateParts[i]||'')):[item.room||'','',item.work||'',''],memo:item.memo||'',quantity:item.legacyEstimateExcluded?'':Number(item.quantity||0),unit:item.legacyEstimateExcluded?'':(item.unit||'式'),rate:item.legacyEstimateExcluded?'':(item.unitPrice===''||item.unitPrice==null?'':Number(item.unitPrice||0)),amount:item.legacyEstimateExcluded?'':(item.unitPrice===''||item.unitPrice==null?'':Number(item.amount||(Number(item.quantity)||0)*(Number(item.unitPrice)||0))),excluded:Boolean(item.legacyEstimateExcluded)}))");

  one('writeRows',
"out.forEach((row,i)=>{const r=23+i,raw=Array.isArray(row.parts)?row.parts.map(v=>String(v||'').trim()):[],memo=String(row.memo||'').trim();if(format==='split'){const q=[0,1,2,3].map(j=>raw[j]||'');ws.cell('C'+r).value(q[0]);ws.cell('D'+r).value(q[1]);ws.cell('E'+r).value(q[2]);ws.cell('F'+r).value([q[3],memo].filter(Boolean).join(''));ws.cell('G'+r).value('')}else{const rg=ws.range('C'+r+':G'+r);if(!rg.merged())rg.merged(true);ws.cell('C'+r).value([...raw.filter(Boolean),memo].filter(Boolean).join(' '))}ws.cell('H'+r).value(cv(row.quantity));ws.cell('I'+r).value(row.unit||'');ws.cell('J'+r).value(cv(row.rate));ws.cell('K'+r).value(cv(row.amount))})",
"out.forEach((row,i)=>{const r=23+i,raw=Array.isArray(row.parts)?row.parts.map(v=>String(v||'').trim()):[],memo=String(row.memo||'').trim();if(format==='split'){const q=[0,1,2,3].map(j=>raw[j]||'');ws.cell('C'+r).value(q[0]);ws.cell('D'+r).value(q[1]);ws.cell('E'+r).value(q[2]);ws.cell('F'+r).value([q[3],memo].filter(Boolean).join(''));ws.cell('G'+r).value(row.excluded?'見積範囲外':'')}else{const rg=ws.range('C'+r+':G'+r);if(!rg.merged())rg.merged(true);ws.cell('C'+r).value([...raw.filter(Boolean),memo,row.excluded?'【見積範囲外】':''].filter(Boolean).join(' '))}for(const c of ['C','D','E','F','G'])ws.cell(c+r).style({wrapText:true,verticalAlignment:'center',horizontalAlignment:'left'});const textLen=[...raw,memo,row.excluded?'見積範囲外':''].join(' ').length;try{ws.row(r).height(textLen>45?42:textLen>24?28:18)}catch{};ws.cell('H'+r).value(cv(row.quantity));ws.cell('I'+r).value(row.unit||'');ws.cell('J'+r).value(cv(row.rate));ws.cell('K'+r).value(cv(row.amount))})");

  one('subtotal',
"const subtotal=out.reduce((sum,row)=>sum+(row.amount===''||row.amount==null?0:(Number(row.amount)||0)),0),tax=Math.floor(subtotal*.1),total=subtotal+tax;",
"const subtotal=out.reduce((sum,row)=>sum+(row.excluded?0:(row.amount===''||row.amount==null?0:(Number(row.amount)||0))),0),tax=Math.floor(subtotal*.1),total=subtotal+tax;");

  fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
  console.log('OK: 見積範囲外表示とExcel長文折返しV3を適用しました');
  console.log('BACKUP: '+backup);
}catch(e){console.error('ERROR: '+e.message);console.error('変更していません。');if(s!==original){}process.exit(1)}
