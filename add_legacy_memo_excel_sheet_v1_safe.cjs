const fs=require('fs'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const backup=f+'.legacy-memo-excel-sheet-v1-backup';
const marker='M-CROSS_LEGACY_MEMO_EXCEL_SHEET_V1_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx が見つかりません');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
try{
  // Pass notes to the single estimate Excel export.
  const single=`                      unit,\n                    }, estimateRows, estimateCopyFormat, additionalWorks)}`;
  if(!s.includes(single))throw new Error('見積用Excel出力の引数位置が見つかりません');
  s=s.replace(single,`                      unit,\n                      legacyEstimateNotes,\n                    }, estimateRows, estimateCopyFormat, additionalWorks)}`);

  // Pass notes to the combined estimate/measurement export.
  const combined=`downloadCombinedEstimateMeasurementExcel({company,propertyName:selectedProperty?.name||'',address:selectedProperty?.address||'',unit,records,cfRecords,cfMaterialGroups,softRecords,floorTrimRecords,additionalWorks}, rowsForCombined, estimateCopyFormat, worksForCombined)`;
  if(!s.includes(combined))throw new Error('見積・採寸一括出力の引数位置が見つかりません');
  s=s.replace(combined,`downloadCombinedEstimateMeasurementExcel({company,propertyName:selectedProperty?.name||'',address:selectedProperty?.address||'',unit,records,cfRecords,cfMaterialGroups,softRecords,floorTrimRecords,additionalWorks,legacyEstimateNotes}, rowsForCombined, estimateCopyFormat, worksForCombined)`);

  // Add a Memo sheet immediately after the estimate sheet is obtained in the combined export.
  const combinedAnchor=`    const ws = workbook.sheet('見積書')\n    if (!ws) throw new Error('「見積書」シートが見つかりません')\n    const convertedRows=applyCrossCfPackageRulesV3(Array.isArray(rows)?rows:[])`;
  if(!s.includes(combinedAnchor))throw new Error('一括出力の見積書シート位置が見つかりません');
  const memoBlock=`    const ws = workbook.sheet('見積書')\n    if (!ws) throw new Error('「見積書」シートが見つかりません')\n    /* ${marker} */\n    const legacyNotes=Array.isArray(entry?.legacyEstimateNotes)?entry.legacyEstimateNotes.filter(note=>String(note?.text||'').trim()):[]\n    if(legacyNotes.length){\n      const oldMemo=workbook.sheet('メモ');if(oldMemo)workbook.deleteSheet('メモ')\n      const memoSheet=workbook.addSheet('メモ')\n      memoSheet.column('A').width(16);memoSheet.column('B').width(90)\n      memoSheet.cell('A1').value('旧工事カード確認メモ').style({bold:true,fontSize:16})\n      memoSheet.cell('A2').value('元位置').style({bold:true,fill:'EAF2FF'});memoSheet.cell('B2').value('内容').style({bold:true,fill:'EAF2FF'})\n      ;[...legacyNotes].sort((a,b)=>(Number(a.row)||0)-(Number(b.row)||0)).forEach((note,index)=>{const r=3+index;memoSheet.cell('A'+r).value(note.cell||('行 '+(Number(note.row)||'')));memoSheet.cell('B'+r).value(String(note.text||'')).style({wrapText:true,verticalAlignment:'top'});try{memoSheet.row(r).height(34)}catch{}})\n    }\n    const convertedRows=applyCrossCfPackageRulesV3(Array.isArray(rows)?rows:[])`;
  s=s.replace(combinedAnchor,memoBlock);

  // Single estimate export uses another template load at first occurrence around line 920.
  const singleAnchor=`    const ws = workbook.sheet('見積書')\n    if (!ws) throw new Error('「見積書」シートが見つかりません')\n\n    // 元テンプレートの書式、ロゴ、罫線、列幅、行高、印刷設定は維持する。`;
  if(!s.includes(singleAnchor))throw new Error('単体見積出力の見積書シート位置が見つかりません');
  const singleMemo=`    const ws = workbook.sheet('見積書')\n    if (!ws) throw new Error('「見積書」シートが見つかりません')\n    const legacyNotesForExcel=Array.isArray(entry?.legacyEstimateNotes)?entry.legacyEstimateNotes.filter(note=>String(note?.text||'').trim()):[]\n    if(legacyNotesForExcel.length){\n      const oldMemo=workbook.sheet('メモ');if(oldMemo)workbook.deleteSheet('メモ')\n      const memoSheet=workbook.addSheet('メモ')\n      memoSheet.column('A').width(16);memoSheet.column('B').width(90)\n      memoSheet.cell('A1').value('旧工事カード確認メモ').style({bold:true,fontSize:16})\n      memoSheet.cell('A2').value('元位置').style({bold:true,fill:'EAF2FF'});memoSheet.cell('B2').value('内容').style({bold:true,fill:'EAF2FF'})\n      ;[...legacyNotesForExcel].sort((a,b)=>(Number(a.row)||0)-(Number(b.row)||0)).forEach((note,index)=>{const r=3+index;memoSheet.cell('A'+r).value(note.cell||('行 '+(Number(note.row)||'')));memoSheet.cell('B'+r).value(String(note.text||'')).style({wrapText:true,verticalAlignment:'top'});try{memoSheet.row(r).height(34)}catch{}})\n    }\n\n    // 元テンプレートの書式、ロゴ、罫線、列幅、行高、印刷設定は維持する。`;
  s=s.replace(singleAnchor,singleMemo);

  fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
  console.log('OK: Excel出力へ「メモ」シート追加処理を実装しました');
  console.log('BACKUP: '+backup);
}catch(e){console.error('ERROR: '+e.message);console.error('変更していません。');process.exit(1)}
