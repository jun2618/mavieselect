const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.step20-estimate-export-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker='/* M-CROSS_STEP20_ESTIMATE_EXPORT */'
if (s.includes(marker)) { console.log('STEP20 見積書出力は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_STEP19_3_WORKORDER_DETAIL */')) { console.error('STEP19.3が見つかりません。'); process.exit(1) }

const fnTarget='  function updateWorkOrder(workOrderId, patch) {'
if (!s.includes(fnTarget)) { console.error('工事案件更新関数が見つかりません。'); process.exit(1) }
const fn=`  ${marker}
  async function exportWorkOrderEstimate(workOrder) {
    if (!workOrder) return
    const items = Array.isArray(workOrder.estimateItems) ? workOrder.estimateItems : []
    if (!items.length) { window.alert('見積明細がありません。原状回復の概算から工事案件を作成するか、見積明細を追加してください。'); return }
    try {
      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'MavieSelect / M-Cross'
      workbook.created = new Date()
      const ws = workbook.addWorksheet('見積書', { views:[{showGridLines:false}] })
      ws.pageSetup = { orientation:'portrait', paperSize:9, fitToPage:true, fitToWidth:1, fitToHeight:1, margins:{left:0.3,right:0.3,top:0.4,bottom:0.4,header:0.2,footer:0.2} }
      ws.columns = [
        {key:'name',width:27},{key:'spec',width:28},{key:'qty',width:11},{key:'unit',width:9},{key:'price',width:14},{key:'amount',width:16},{key:'note',width:22}
      ]
      ws.mergeCells('A1:G2'); const title=ws.getCell('A1'); title.value='御 見 積 書'; title.font={size:22,bold:true}; title.alignment={horizontal:'center',vertical:'middle'}
      ws.mergeCells('A4:D4'); ws.getCell('A4').value=(workOrder.company || '') + ' 御中'; ws.getCell('A4').font={size:12,bold:true}
      ws.mergeCells('E4:G4'); ws.getCell('E4').value='Mavie Select'; ws.getCell('E4').font={size:12,bold:true}; ws.getCell('E4').alignment={horizontal:'right'}
      ws.mergeCells('A5:D5'); ws.getCell('A5').value='物件：' + (workOrder.propertyName || '') + (workOrder.unit ? ' ' + workOrder.unit + '号室' : '')
      ws.mergeCells('A6:D6'); ws.getCell('A6').value='住所：' + (workOrder.address || '')
      ws.mergeCells('A8:G8'); ws.getCell('A8').value='御見積金額　￥' + Number(workOrder.estimateAmount || 0).toLocaleString() + '（税込）'; ws.getCell('A8').font={size:16,bold:true}; ws.getCell('A8').alignment={horizontal:'center'}
      const headerRow=10
      const headers=['名称','仕様・規格','数量','単位','単価','金額','備考']
      headers.forEach((value,index)=>{ const cell=ws.getCell(headerRow,index+1); cell.value=value; cell.font={bold:true,color:{argb:'FFFFFFFF'}}; cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF7650A8'}}; cell.alignment={horizontal:'center',vertical:'middle'}; cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}} })
      let rowNumber=headerRow+1
      items.forEach(item=>{
        const row=ws.getRow(rowNumber++)
        row.values=[item.name||'',item.specification||'',Number(item.quantity||0),item.unit||'',Number(item.unitPrice||0),Number(item.amount||0),'']
        row.getCell(3).numFmt='#,##0.0'
        row.getCell(5).numFmt='¥#,##0'
        row.getCell(6).numFmt='¥#,##0'
        row.eachCell(cell=>{ cell.border={top:{style:'thin',color:{argb:'FFD9D9D9'}},left:{style:'thin',color:{argb:'FFD9D9D9'}},bottom:{style:'thin',color:{argb:'FFD9D9D9'}},right:{style:'thin',color:{argb:'FFD9D9D9'}}}; cell.alignment={vertical:'middle',wrapText:true} })
      })
      const subtotal=items.reduce((sum,item)=>sum+(Number(item.amount)||0),0)
      const tax=Math.round(subtotal*0.1)
      const total=subtotal+tax
      ;[['小計',subtotal],['消費税10%',tax],['合計',total]].forEach(([label,value])=>{
        ws.mergeCells(rowNumber,1,rowNumber,5); ws.getCell(rowNumber,1).value=label; ws.getCell(rowNumber,1).alignment={horizontal:'right'}; ws.getCell(rowNumber,1).font={bold:true}
        ws.getCell(rowNumber,6).value=value; ws.getCell(rowNumber,6).numFmt='¥#,##0'; ws.getCell(rowNumber,6).font={bold:true}; rowNumber++
      })
      ws.getCell(rowNumber-1,1).font={bold:true,size:13}; ws.getCell(rowNumber-1,6).font={bold:true,size:13,color:{argb:'FFE91E63'}}
      const buffer=await workbook.xlsx.writeBuffer()
      const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
      const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url
      link.download=['見積書',workOrder.propertyName||'物件',workOrder.unit?workOrder.unit+'号室':''].filter(Boolean).join('_')+'.xlsx'
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
      updateWorkOrder(workOrder.id,{estimateStatus:'提出済'})
    } catch(error) { console.error(error); window.alert('見積書を出力できませんでした：'+(error?.message||String(error))) }
  }

`
s=s.replace(fnTarget,fn+fnTarget)

const oldBtn=`<button className="secondaryButton" type="button" onClick={() => window.alert('見積書出力はSTEP20で追加します')}>見積書を出力</button>`
if (!s.includes(oldBtn)) { console.error('STEP20仮ボタンが見つかりません。'); process.exit(1) }
s=s.replace(oldBtn,`<button className="secondaryButton" type="button" onClick={() => exportWorkOrderEstimate(item)}>📊 見積書を出力</button>`)

fs.copyFileSync(file,backup)
fs.writeFileSync(file,s,'utf8')
console.log('STEP20 見積書Excel出力 OK')
console.log('工事案件の見積明細から、名称・仕様規格・数量・単位・単価・金額を出力します')
console.log('小計・消費税10%・合計を計算します')
console.log('出力後は見積状態を「提出済」に更新します')
console.log('バックアップ:',backup)
console.log('次に npm run build を実行してください')
