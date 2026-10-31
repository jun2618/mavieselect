const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-excel-style')
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}
let source = fs.readFileSync(file, 'utf8')
if (!source.includes('async function downloadEstimateExcel(')) {
  console.error('先に「見積用Excel出力」を追加してください。')
  process.exit(1)
}
fs.copyFileSync(file, backup)
console.log('OK: バックアップ作成')

// メモを工事項目から外し、行データの memo として保持する
const replacements = [
  ["parts: [roomName, ...splitMeasurementType(type), group.memo, 'クロス貼替'].filter(Boolean), category: 'cross'", "parts: [roomName, ...splitMeasurementType(type), 'クロス貼替'].filter(Boolean), memo: group.memo, category: 'cross'"],
  ["parts: [roomName, group.memo, 'CF貼替'].filter(Boolean), category: 'cf'", "parts: [roomName, 'CF貼替'].filter(Boolean), memo: group.memo, category: 'cf'"],
  ["parts: [roomName, group.memo, 'ソフト巾木貼替'].filter(Boolean), category: 'soft'", "parts: [roomName, 'ソフト巾木貼替'].filter(Boolean), memo: group.memo, category: 'soft'"],
]
for (const [oldText, newText] of replacements) {
  if (!source.includes(oldText)) {
    console.error('見積行の形式が想定と違います。変更せず終了しました。')
    process.exit(1)
  }
  source = source.replace(oldText, newText)
}
console.log('OK: メモを最後の列へ分離')

const start = source.indexOf('async function downloadEstimateExcel(')
const end = source.indexOf('\nfunction createRecordId()', start)
if (start === -1 || end === -1) {
  console.error('見積用Excel処理の範囲を特定できません。')
  process.exit(1)
}

const newFunction = `async function downloadEstimateExcel(entry, rows, format) {
  try {
    if (!rows.length) {
      window.alert('出力できる見積項目がありません。')
      return
    }
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'MavieSelect'
    workbook.created = new Date()
    const worksheet = workbook.addWorksheet('見積用', {
      views: [{ state: 'frozen', ySplit: 8 }],
    })
    worksheet.properties.defaultRowHeight = 21
    worksheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 8 }]

    const maxParts = format === 'split'
      ? Math.max(...rows.map(row => row.parts.length))
      : 1
    const lastColumn = maxParts + 3
    const outputRows = rows.map(row => {
      const itemCells = format === 'split' ? row.parts : [row.parts.join(' ')]
      const emptyFill = Array(Math.max(0, maxParts - itemCells.length)).fill('')
      return [
        ...itemCells,
        ...emptyFill,
        Number(formatQuantity(row.quantity)),
        row.unit,
        row.memo || '',
      ]
    })

    worksheet.mergeCells(1, 1, 1, lastColumn)
    const titleCell = worksheet.getCell(1, 1)
    titleCell.value = '見積用データ'
    titleCell.font = { name: 'Yu Gothic', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B72CF' } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.getRow(1).height = 30

    const metadata = [
      ['管理会社', entry.company || ''],
      ['物件名', entry.propertyName || ''],
      ['住所', entry.address || ''],
      ['号室', entry.unit || ''],
      ['出力日', new Intl.DateTimeFormat('ja-JP').format(new Date())],
    ]
    metadata.forEach(([label, value], index) => {
      const rowNumber = index + 3
      worksheet.getCell(rowNumber, 1).value = label
      worksheet.getCell(rowNumber, 1).font = { name: 'Yu Gothic', bold: true, color: { argb: 'FF666666' } }
      worksheet.getCell(rowNumber, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F7' } }
      worksheet.mergeCells(rowNumber, 2, rowNumber, lastColumn)
      worksheet.getCell(rowNumber, 2).value = value
      worksheet.getCell(rowNumber, 2).font = { name: 'Yu Gothic', color: { argb: 'FF008000' } }
      worksheet.getCell(rowNumber, 2).alignment = { vertical: 'middle', wrapText: true }
    })

    const headers = format === 'split'
      ? [...Array(maxParts)].map((_, index) => '項目' + (index + 1))
      : ['工事項目']
    headers.push('数量', '単位', 'メモ')
    const headerRow = worksheet.getRow(8)
    headerRow.values = headers
    headerRow.height = 24
    headerRow.eachCell(cell => {
      cell.font = { name: 'Yu Gothic', bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B72CF' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
    worksheet.autoFilter = {
      from: { row: 8, column: 1 },
      to: { row: 8, column: lastColumn },
    }

    outputRows.forEach((values, rowIndex) => {
      const dataRow = worksheet.addRow(values)
      dataRow.height = 23
      dataRow.eachCell((cell, columnIndex) => {
        cell.font = {
          name: 'Yu Gothic',
          size: 11,
          color: { argb: columnIndex > maxParts ? 'FF000000' : 'FF008000' },
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: columnIndex === maxParts + 1 ? 'right' : 'left',
          wrapText: true,
        }
        if (rowIndex % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBF8FD' } }
        }
      })
      dataRow.getCell(maxParts + 1).numFmt = '0.0'
    })

    for (let columnIndex = 1; columnIndex <= lastColumn; columnIndex += 1) {
      const maxLength = worksheet.getColumn(columnIndex).values.reduce((max, value) => {
        const text = String(value ?? '')
        const displayLength = [...text].reduce(
          (length, character) => length + (character.charCodeAt(0) > 0xff ? 2 : 1),
          0
        )
        return Math.max(max, displayLength)
      }, 0)
      const minimumWidth = columnIndex === maxParts + 1 ? 8 : columnIndex === maxParts + 2 ? 6 : 8
      worksheet.getColumn(columnIndex).width = Math.max(minimumWidth, Math.min(maxLength + 2, 40))
    }
    worksheet.getColumn(lastColumn).width = Math.max(16, worksheet.getColumn(lastColumn).width)

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const safeName = \`\${entry.propertyName || '物件'}_\${entry.unit || '号室'}\`
      .replace(/[\\\\/:*?"<>|]/g, '_')
    const fileName = \`\${safeName}_見積用.xlsx\`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error('見積用Excelを出力できませんでした。', error)
    window.alert('見積用Excelを出力できませんでした。')
  }
}
`
source = source.slice(0, start) + newFunction + source.slice(end)
console.log('OK: 見積用Excelの見た目を採寸Excel風に変更')

const oldCall = `onClick={() => downloadEstimateExcel({
                      propertyName: selectedProperty?.name || '',
                      unit,
                    }, estimateRows, estimateCopyFormat)}`
const newCall = `onClick={() => downloadEstimateExcel({
                      company,
                      propertyName: selectedProperty?.name || '',
                      address: selectedProperty?.address || '',
                      unit,
                    }, estimateRows, estimateCopyFormat)}`
if (!source.includes(oldCall)) {
  console.error('Excel出力ボタンの呼び出しが見つかりません。')
  process.exit(1)
}
source = source.replace(oldCall, newCall)
console.log('OK: 管理会社・住所を見積用Excelへ追加')

fs.writeFileSync(file, source, 'utf8')
console.log('完了: 見積用Excelの装飾とメモ列を追加しました。')
console.log('次に npm run build を実行してください。')
