const fs=require('fs'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx'),backup=f+'.legacy-exact-layout-v5-backup',marker='M-CROSS_LEGACY_EXACT_LAYOUT_V5_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx が見つかりません');process.exit(1)}
let s=fs.readFileSync(f,'utf8');if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const original=s;
try{
  // v3 schema acceptance and explicit preservation through normalization
  s=s.replace(/\['m-cross-legacy-import:v1','m-cross-legacy-import:v2'\]\.includes\(packageData\?\.schema\)/,"['m-cross-legacy-import:v1','m-cross-legacy-import:v2','m-cross-legacy-import:v3'].includes(packageData?.schema)");
  if(!s.includes("m-cross-legacy-import:v3"))throw new Error('schema判定を更新できません');
  const norm=/imported = normalizeImportedEntry\(\{([\s\S]*?)\n\s*\}\)/;
  const nm=s.match(norm);if(!nm)throw new Error('normalizeImportedEntry位置なし');
  if(!nm[0].includes('legacyEstimateNotes')){
    s=s.replace(norm,match=>match.replace(/\n\s*\}\)$/,"\n          legacyEstimateNotes: Array.isArray(packageData.entry.legacyEstimateNotes) ? packageData.entry.legacyEstimateNotes : [],\n        })"));
  }
  // all additional works go to Excel; no exclusion mapping
  s=s.replace(/\/\* M-CROSS_LEGACY_ESTIMATE_EXCEL_V4_SAFE \*\/[\s\S]*?const worksForCombined = additionalWorks\.map\([\s\S]*?\}\)\)/,
`/* ${marker} */
                const worksForCombined = additionalWorks`);
  s=s.replace(/const worksForCombined = additionalWorks\.filter\(\(item,index\) => !estimateEdits\['additionalWork:' \+ \(item\.id \|\| index\)\]\?\.excluded\)/,
`/* ${marker} */
                const worksForCombined = additionalWorks`);
  if(!s.includes(marker))throw new Error('worksForCombined位置なし');

  // Replace additional rows mapping up to const out
  const arStart=s.indexOf('    const additionalRows=(Array.isArray(additionalWorks)?additionalWorks:[])');
  const arEnd=s.indexOf('\n    const out=',arStart);
  if(arStart<0||arEnd<0)throw new Error('additionalRows位置なし');
  const ar=`    const additionalRows=(Array.isArray(additionalWorks)?additionalWorks:[]).map(item=>({
      parts:Array.isArray(item.estimateParts)&&item.estimateParts.length?[0,1,2,3].map(i=>String(item.estimateParts[i]||'')):[item.room||'','',item.work||'',''],
      memo:'',
      quantity:item.quantity===''?'':Number(item.quantity||0),
      unit:item.unit||'',
      rate:item.unitPrice===''||item.unitPrice==null?'':Number(item.unitPrice||0),
      amount:item.amount===''||item.amount==null?'':Number(item.amount||0)
    }))`;
  s=s.slice(0,arStart)+ar+s.slice(arEnd);

  // Replace writer with no wrap/no height changes; shrink-to-fit, one row
  const wStart=s.indexOf('    out.forEach((row,i)=>{',arStart);
  const wEnd=s.indexOf('\n    const subtotal=',wStart);
  if(wStart<0||wEnd<0)throw new Error('writeRows位置なし');
  const writer=`    out.forEach((row,i)=>{
      const r=23+i,raw=Array.isArray(row.parts)?row.parts.map(v=>String(v||'').trim()):[]
      const q=[0,1,2,3].map(j=>raw[j]||'')
      if(format==='split'){
        ws.cell('C'+r).value(q[0])
        ws.cell('D'+r).value(q[1])
        ws.cell('E'+r).value(q[2])
        ws.cell('F'+r).value(q[3])
        ws.cell('G'+r).value('')
      }else{
        const rg=ws.range('C'+r+':G'+r);if(!rg.merged())rg.merged(true)
        ws.cell('C'+r).value(raw.filter(Boolean).join(' '))
      }
      for(const c of ['C','D','E','F','G'])ws.cell(c+r).style({wrapText:false,shrinkToFit:true,verticalAlignment:'center',horizontalAlignment:'left'})
      try{ws.row(r).height(13.15)}catch{}
      ws.cell('H'+r).value(cv(row.quantity));ws.cell('I'+r).value(row.unit||'');ws.cell('J'+r).value(cv(row.rate));ws.cell('K'+r).value(cv(row.amount))
    })`;
  s=s.slice(0,wStart)+writer+s.slice(wEnd);
  // subtotal simple, all blank amounts count zero
  s=s.replace(/const subtotal=out\.reduce\([\s\S]*?\),tax=Math\.floor\(subtotal\*\.1\),total=subtotal\+tax;/,
"const subtotal=out.reduce((sum,row)=>sum+(row.amount===''||row.amount==null?0:(Number(row.amount)||0)),0),tax=Math.floor(subtotal*.1),total=subtotal+tax;");

  // Write source M-column notes as-is and remove stale values first
  const totalLine="ws.cell('K55').value(subtotal);ws.cell('K56').value(tax);ws.cell('K57').value(total);ws.cell('E19').value(total)";
  if(!s.includes(totalLine))throw new Error('total書込位置なし');
  s=s.replace(totalLine,totalLine+`;for(let r=22;r<=56;r++)ws.cell('M'+r).value('');(Array.isArray(entry.legacyEstimateNotes)?entry.legacyEstimateNotes:[]).forEach(note=>{const r=Number(note?.row);if(r>=22&&r<=56)ws.cell('M'+r).value(String(note?.text||'')).style({wrapText:false,shrinkToFit:false,verticalAlignment:'center',horizontalAlignment:'left'})});try{ws.column('M').width(95)}catch{}`);

  fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
  console.log('OK: 元工事カード同等レイアウトV5を適用しました');console.log('BACKUP: '+backup);
}catch(e){console.error('ERROR: '+e.message);console.error('変更していません。');process.exit(1)}
