const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
const backup = file + '.legacy-estimate-excel-v4-backup';
const marker = 'M-CROSS_LEGACY_ESTIMATE_EXCEL_V4_SAFE';

if (!fs.existsSync(file)) {
  console.error('ERROR: src/App.jsx が見つかりません。crossmeasureフォルダーで実行してください。');
  process.exit(1);
}

let source = fs.readFileSync(file, 'utf8');
if (source.includes(marker)) {
  console.log('ALREADY APPLIED');
  process.exit(0);
}

const original = source;
function replaceRegex(label, regex, replacement) {
  const matches = source.match(regex);
  if (!matches) throw new Error(label + ' MATCH=0');
  source = source.replace(regex, replacement);
}

try {
  // 見積範囲外もExcel関数へ渡す。通常合計には含めない。
  replaceRegex(
    'worksForCombined',
    /const worksForCombined = additionalWorks\.filter\(\(item,index\) => !estimateEdits\['additionalWork:' \+ \(item\.id \|\| index\)\]\?\.excluded\)/,
    `/* ${marker} */
                const worksForCombined = additionalWorks.map((item,index) => ({
                  ...item,
                  legacyEstimateExcluded: Boolean(estimateEdits['additionalWork:' + (item.id || index)]?.excluded),
                }))`
  );

  // 追加工事をExcel行へ変換する際に「見積範囲外」フラグを保持。
  replaceRegex(
    'additionalRows',
    /const additionalRows=\(Array\.isArray\(additionalWorks\)\?additionalWorks:\[\]\)\.map\(item=>\(\{parts:[\s\S]*?amount:item\.unitPrice===''\|\|item\.unitPrice==null\?'':Number\(item\.amount\|\|\(Number\(item\.quantity\)\|\|0\)\*\(Number\(item\.unitPrice\)\|\|0\)\)\}\)\)/,
    `const additionalRows=(Array.isArray(additionalWorks)?additionalWorks:[]).map(item=>({
      parts:Array.isArray(item.estimateParts)&&item.estimateParts.length?[0,1,2,3].map(i=>String(item.estimateParts[i]||'')):[item.room||'','',item.work||'',''],
      memo:item.memo||'',
      quantity:item.legacyEstimateExcluded?'':Number(item.quantity||0),
      unit:item.legacyEstimateExcluded?'':(item.unit||'式'),
      rate:item.legacyEstimateExcluded?'':(item.unitPrice===''||item.unitPrice==null?'':Number(item.unitPrice||0)),
      amount:item.legacyEstimateExcluded?'':(item.unitPrice===''||item.unitPrice==null?'':Number(item.amount||(Number(item.quantity)||0)*(Number(item.unitPrice)||0))),
      excluded:Boolean(item.legacyEstimateExcluded)
    }))`
  );

  // 現在の1行書き込みを、折返し・行高・見積範囲外表示対応へ置換。
  const writeStart = source.indexOf("    out.forEach((row,i)=>{const r=23+i");
  const writeEnd = source.indexOf("\n    const subtotal=", writeStart);
  if (writeStart < 0 || writeEnd < 0) throw new Error('writeRows MATCH=0');

  const newWriter = `    out.forEach((row,i)=>{
      const r=23+i
      const raw=Array.isArray(row.parts)?row.parts.map(v=>String(v||'').trim()):[]
      const memo=String(row.memo||'').trim()
      if(format==='split'){
        const q=[0,1,2,3].map(j=>raw[j]||'')
        if(q[0]&&q[1].startsWith(q[0]))q[1]=q[1].slice(q[0].length).trim()
        ws.cell('C'+r).value(q[0])
        ws.cell('D'+r).value(q[1])
        ws.cell('E'+r).value(q[2])
        ws.cell('F'+r).value([q[3],memo].filter(Boolean).join(' '))
        ws.cell('G'+r).value(row.excluded?'見積範囲外':'')
      }else{
        const rg=ws.range('C'+r+':G'+r)
        if(!rg.merged())rg.merged(true)
        ws.cell('C'+r).value([...raw.filter(Boolean),memo,row.excluded?'【見積範囲外】':''].filter(Boolean).join(' '))
      }
      for(const c of ['C','D','E','F','G']){
        ws.cell(c+r).style({wrapText:true,verticalAlignment:'center',horizontalAlignment:'left'})
      }
      const textLength=[...raw,memo,row.excluded?'見積範囲外':''].join(' ').length
      try{ws.row(r).height(textLength>48?42:textLength>26?29:18)}catch{}
      ws.cell('H'+r).value(cv(row.quantity))
      ws.cell('I'+r).value(row.unit||'')
      ws.cell('J'+r).value(cv(row.rate))
      ws.cell('K'+r).value(cv(row.amount))
    })`;
  source = source.slice(0, writeStart) + newWriter + source.slice(writeEnd);

  replaceRegex(
    'subtotal',
    /const subtotal=out\.reduce\(\(sum,row\)=>sum\+\(row\.amount===''\|\|row\.amount==null\?0:\(Number\(row\.amount\)\|\|0\)\),0\),tax=/,
    "const subtotal=out.reduce((sum,row)=>sum+(row.excluded?0:(row.amount===''||row.amount==null?0:(Number(row.amount)||0))),0),tax="
  );

  if (source === original) throw new Error('変更対象がありません');
  fs.copyFileSync(file, backup);
  fs.writeFileSync(file, source, 'utf8');
  console.log('OK: 見積範囲外表示とExcel長文折返しV4を適用しました');
  console.log('BACKUP:', backup);
} catch (error) {
  console.error('ERROR:', error.message);
  console.error('変更していません。');
  process.exit(1);
}
