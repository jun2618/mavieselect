const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_EXCEL_EXPORT_LIKE_ESTIMATE_V1_SAFE';
const backup=file+'.final-excel-like-estimate-v1-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('発注書Excel出力V1はすでに適用されています。');

// 見積書出力と同じExcelJS系が存在することを確認
if(!/ExcelJS|new\s+Workbook\s*\(/.test(original))fail('見積書で使用中のExcelライブラリを確認できません。');
if(!original.includes("fetch(new URL('/mcross-estimate-template.xlsx'"))fail('見積書テンプレート出力処理が見つかりません。');
if(!original.includes('M-CROSS_INTERNAL_FINAL_ORDER_STEP1_SAFE'))fail('M-Cross本発注書STEP1が未適用です。');

let next=original;

// ExcelJS の実際の識別子を決定
let workbookExpression='new ExcelJS.Workbook()';
if(!/ExcelJS/.test(original) && /new\s+Workbook\s*\(/.test(original))workbookExpression='new Workbook()';

// 本発注確定関数の前へ、見積書と同じブラウザ内Excel生成関数を追加
const functionAnchor='  function finalizePurchaseOrder(id){';
if((next.split(functionAnchor).length-1)!==1)fail('finalizePurchaseOrderを一意に特定できません。');
const exportFunction=`  /* ${marker} */
  async function exportFinalPurchaseOrderExcel(order){
    try{
      if(!order)throw new Error('発注書が選択されていません')
      const rows=(order.items||[]).map((item,index)=>({
        no:index+1,
        type:order.orderMode==='material'?'材料':'施工',
        name:String(item.label||item.productCode||''),
        memo:String(item.memo||''),
        quantity:Number(item.orderQuantity||0),
        unit:String(item.unit||''),
        rate:item.orderRate==null||item.orderRate===''?'':Number(item.orderRate||0)
      }))
      if(!rows.length)throw new Error('発注明細がありません')
      if(rows.length>27)throw new Error('明細は27行までです')

      const response=await fetch(new URL('/templates/工事カードNew3.xlsm',window.location.origin),{cache:'no-store'})
      if(!response.ok)throw new Error('発注書テンプレート読込失敗 HTTP '+response.status)
      const bytes=await response.arrayBuffer()
      const workbook=${workbookExpression}
      await workbook.xlsx.load(bytes)
      const sheet=workbook.getWorksheet('発注書')
      if(!sheet)throw new Error('発注書シートが見つかりません')

      const issuedAt=new Date(order.issuedAt||order.finalizedAt||order.createdAt||Date.now())
      sheet.getCell('I2').value=issuedAt.toLocaleDateString('ja-JP')
      sheet.getCell('A5').value=order.contractorName||''
      sheet.getCell('A6').value=[order.contractorPostalCode,order.contractorAddress,order.contractorContact,order.contractorPhone].filter(Boolean).join('\\n')
      sheet.getCell('A6').alignment={...(sheet.getCell('A6').alignment||{}),wrapText:true,vertical:'top'}
      sheet.getCell('B12').value=order.propertyName||''
      sheet.getCell('E12').value=String(order.unit||'')
      sheet.getCell('B13').value=order.address||''
      sheet.getCell('A49').value=['工事名: '+String(order.workName||''),String(order.contractorMemo||'')].filter(Boolean).join('\\n')
      sheet.getCell('A49').alignment={...(sheet.getCell('A49').alignment||{}),wrapText:true,vertical:'top'}

      for(let row=22;row<=48;row++){
        for(let col=1;col<=9;col++)sheet.getCell(row,col).value=null
        sheet.getCell(row,10).value={formula:'SUM(G'+row+'*I'+row+')'}
      }
      rows.forEach((row,index)=>{
        const excelRow=22+index
        sheet.getCell(excelRow,1).value=row.type
        sheet.getCell(excelRow,2).value=[row.name,row.memo].filter(Boolean).join(' ')
        sheet.getCell(excelRow,7).value=row.quantity
        sheet.getCell(excelRow,8).value=row.unit
        if(row.rate!=='')sheet.getCell(excelRow,9).value=row.rate
      })
      sheet.getCell('J49').value={formula:'SUM(J22:J48)'}
      sheet.getCell('J50').value={formula:'SUM(J49*0.1)'}
      sheet.getCell('J51').value={formula:'SUM(J49:J50)'}
      sheet.getCell('D18').value={formula:'J51'}
      ;['J14','J15','J16','J17','J18'].forEach(address=>sheet.getCell(address).value=null)

      if(sheet.pageSetup){
        sheet.pageSetup.paperSize=9
        sheet.pageSetup.orientation='portrait'
        sheet.pageSetup.fitToPage=true
        sheet.pageSetup.fitToWidth=1
        sheet.pageSetup.fitToHeight=1
        sheet.pageSetup.printArea='A1:J51'
        sheet.pageSetup.margins={left:0.25,right:0.25,top:0.35,bottom:0.35,header:0.1,footer:0.1}
      }

      const out=await workbook.xlsx.writeBuffer()
      const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
      const safe=value=>String(value||'').replace(/[\\\\/:*?\"<>|]/g,'_')
      const fileName=['本発注書',safe(order.propertyName),safe(order.unit?order.unit+'号室':''),safe(order.contractorName)].filter(Boolean).join('_')+'.xlsx'
      const url=URL.createObjectURL(blob)
      const link=document.createElement('a')
      link.href=url
      link.download=fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setSaveStatus('本発注書Excelを出力しました')
    }catch(error){
      window.alert('本発注書Excel出力に失敗しました。\\n'+(error?.message||String(error)))
    }
  }

`;
next=next.replace(functionAnchor,exportFunction+functionAnchor);

// 本発注書プレビューに新しいExcel出力ボタン。旧CSS印刷ボタンは非表示化。
const deleteButton='<button className="danger" type="button" onClick={()=>deletePurchaseOrder(selected.id)}>削除</button>';
if((next.split(deleteButton).length-1)!==1)fail('発注書削除ボタンを一意に特定できません。');
const excelButton=`{selected.status==='本発注'&&<button className="finalOrderExcelButton" type="button" onClick={()=>exportFinalPurchaseOrderExcel(selected)}>⬇ 本物のExcel書式で出力</button>}${deleteButton}`;
next=next.replace(deleteButton,excelButton);

// OneDriveテンプレート準備ボタンと旧印刷ボタンは本線外として隠すCSS
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */
  .finalOrderExcelButton{min-height:42px;padding:8px 13px;border:1px solid #217346;border-radius:9px;background:#217346;color:#fff;font:inherit;font-weight:900}
  .excelStylePrintButton,.mcrossFinalOrderOutputActions{display:none!important}
  @media(max-width:620px){.finalOrderExcelButton{width:100%}}
`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('発注書Excel出力V1の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 見積書と同方式の本発注書Excel出力V1を適用しました。');
  console.log('・publicテンプレートをブラウザで読込');
  console.log('・本物の発注書シートへ転記');
  console.log('・A4縦1ページ設定');
  console.log('・PC/スマホ共通で.xlsxを直接ダウンロード');
  console.log('・OneDrive/JSON/PowerShell手順は不要');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
