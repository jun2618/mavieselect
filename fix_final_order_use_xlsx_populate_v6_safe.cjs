const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_XLSX_POPULATE_V6_SAFE';
const backup=file+'.final-order-xlsx-populate-v6-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('発注書 xlsx-populate V6 はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_EXCEL_EXPORT_LIKE_ESTIMATE_V1_SAFE'))fail('本発注書Excel出力V1が見つかりません。');

const fnStart=original.indexOf('  async function exportFinalPurchaseOrderExcel(order){');
const fnEnd=original.indexOf('\n  function finalizePurchaseOrder(id){',fnStart);
if(fnStart<0||fnEnd<0)fail('本発注書Excel出力関数の範囲を特定できません。');

const newFn=`  /* ${marker} */
  async function exportFinalPurchaseOrderExcel(order){
    try{
      if(!order)throw new Error('発注書が選択されていません')
      const rows=(order.items||[]).map(item=>({
        name:String(item.label||item.productCode||''),
        quantity:Number(item.orderQuantity||0),
        unit:String(item.unit||''),
        rate:item.orderRate==null||item.orderRate===''?'':Number(item.orderRate||0)
      }))
      if(!rows.length)throw new Error('発注明細がありません')
      if(rows.length>27)throw new Error('明細は27行までです')

      // 見積書と同じ xlsx-populate を使用。テンプレートの画像・ロゴ・罫線・印刷設定を維持する。
      const populateModule=await import('xlsx-populate/browser/xlsx-populate.min.js')
      const XlsxPopulate=populateModule.default||globalThis.XlsxPopulate||populateModule
      if(!XlsxPopulate?.fromDataAsync)throw new Error('xlsx-populateブラウザ版を初期化できません')

      const response=await fetch(new URL('/templates/工事カードNew3.xlsm',window.location.origin),{cache:'no-store'})
      if(!response.ok)throw new Error('発注書テンプレート読込失敗 HTTP '+response.status)
      const workbook=await XlsxPopulate.fromDataAsync(await response.arrayBuffer())
      const ws=workbook.sheet('発注書')
      if(!ws)throw new Error('「発注書」シートが見つかりません')

      // 出力版は発注書シートだけ残す。
      workbook.sheets().filter(sheet=>sheet.name()!=='発注書').forEach(sheet=>workbook.deleteSheet(sheet))

      const issuedAt=new Date(order.issuedAt||order.finalizedAt||order.createdAt||Date.now())
      ws.cell('I2').value(issuedAt).style('numberFormat','yyyy年m月d日')
      ws.cell('A5').value(order.contractorName||'')
      ws.cell('A6').value([order.contractorPostalCode,order.contractorAddress,order.contractorContact,order.contractorPhone].filter(Boolean).join('\\n')).style('wrapText',true)
      ws.cell('B12').value(order.propertyName||'')
      ws.cell('E12').value(String(order.unit||''))
      ws.cell('B13').value(order.address||'')
      ws.cell('A49').value(['工事名: '+String(order.workName||''),String(order.contractorMemo||'')].filter(Boolean).join('\\n')).style('wrapText',true)

      // 外部リンク由来の欄は空白化。
      for(const address of ['J14','J15','J16','J17','J18'])ws.cell(address).value('')

      // 明細をクリア。項目列は常に空白、未使用行の金額も空白。
      for(let r=22;r<=48;r++){
        for(const c of ['A','B','C','D','E','F','G','H','I','J'])ws.cell(c+r).value('')
      }

      rows.forEach((row,index)=>{
        const r=22+index
        ws.cell('A'+r).value('')
        ws.cell('B'+r).value(row.name)
        ws.cell('G'+r).value(row.quantity)
        ws.cell('H'+r).value(row.unit)
        if(row.rate!==''){
          ws.cell('I'+r).value(row.rate)
          ws.cell('J'+r).formula('G'+r+'*I'+r)
        }
      })

      ws.cell('J49').formula('SUM(J22:J48)')
      ws.cell('J50').formula('SUM(J49*0.1)')
      ws.cell('J51').formula('SUM(J49:J50)')
      ws.cell('D18').formula('J51')

      const out=await workbook.outputAsync()
      const blob=new Blob([out],{type:'application/vnd.ms-excel.sheet.macroEnabled.12'})
      const safe=value=>String(value||'').replace(/[\\\\/:*?\"<>|]/g,'_')
      const fileName=['発注書',safe(order.propertyName),safe(order.unit?order.unit+'号室':''),safe(order.contractorName)].filter(Boolean).join('_')+'.xlsm'
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
      console.error(error)
      window.alert('本発注書Excel出力に失敗しました。\\n'+(error?.message||String(error)))
    }
  }
`;

let next=original.slice(0,fnStart)+newFn+original.slice(fnEnd);
if(next===original||!next.includes(marker))fail('V6置換に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 発注書Excel出力を見積書と同じ xlsx-populate 方式へ変更しました。');
  console.log('・元テンプレートのMSロゴ/画像/罫線/列幅/行高を維持');
  console.log('・発注書シートだけを出力');
  console.log('・品番横の補助テキストは出力しない');
  console.log('・項目列と未使用行の0は空白');
  console.log('・日付は yyyy年m月d日');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
