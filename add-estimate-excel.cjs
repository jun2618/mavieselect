const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-excel')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const original = source

if (!source.includes('function buildEstimateRows(')) {
  console.error('見積コピー機能が入った現在版ではありません。処理を中止しました。')
  process.exit(1)
}
if (source.includes('function downloadEstimateExcel(')) {
  console.error('見積用Excel出力はすでに追加されています。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
console.log('OK: バックアップ作成 ' + backup)

const excelFunction = `async function downloadEstimateExcel(entry, rows, format) {
  try {
    if (!rows.length) {
      window.alert('出力できる見積項目がありません。')
      return
    }
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'MavieSelect'
    workbook.created = new Date()
    const worksheet = workbook.addWorksheet('見積用')
    const outputRows = rows.map(row => {
      const itemCells = format === 'split' ? row.parts : [row.parts.join(' ')]
      return [...itemCells, Number(formatQuantity(row.quantity)), row.unit]
    })
    outputRows.forEach(values => {
      const dataRow = worksheet.addRow(values)
      dataRow.eachCell(cell => {
        cell.font = { name: 'Yu Gothic', size: 11 }
        cell.alignment = { vertical: 'middle' }
      })
    })
    const lastColumn = Math.max(...outputRows.map(row => row.length))
    for (let columnIndex = 1; columnIndex <= lastColumn; columnIndex += 1) {
      const values = worksheet.getColumn(columnIndex).values
      const maxLength = values.reduce((max, value) => {
        const text = String(value ?? '')
        const displayLength = [...text].reduce(
          (length, character) => length + (character.charCodeAt(0) > 0xff ? 2 : 1),
          0
        )
        return Math.max(max, displayLength)
      }, 0)
      const isQuantityColumn = outputRows.every(row =>
        typeof row[columnIndex - 1] === 'number' || row[columnIndex - 1] == null
      )
      const isUnitColumn = outputRows.every(row =>
        ['㎡', '枚', 'm', undefined].includes(row[columnIndex - 1])
      )
      const minimumWidth = isQuantityColumn ? 8 : isUnitColumn ? 6 : 6
      worksheet.getColumn(columnIndex).width = Math.max(
        minimumWidth,
        Math.min(maxLength + 2, 40)
      )
      worksheet.getColumn(columnIndex).alignment = {
        vertical: 'middle',
        wrapText: maxLength > 40,
      }
    }
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

const functionAnchor = 'function createRecordId() {'
if (!source.includes(functionAnchor)) {
  console.error('追加位置が見つかりません。変更せず終了しました。')
  process.exit(1)
}
source = source.replace(functionAnchor, excelFunction + functionAnchor)
console.log('OK: 見積用Excel作成処理を追加')

source = source.replace("  const [copyStatus, setCopyStatus] = useState('')\n", '')

const copyMethodStart = source.indexOf('  async function copyEstimateRows(rows) {')
const copyMethodEnd = source.indexOf('  function savePropertyMaster(', copyMethodStart)
if (copyMethodStart === -1 || copyMethodEnd === -1) {
  console.error('既存コピー処理が見つかりません。変更せず終了しました。')
  process.exit(1)
}
source = source.slice(0, copyMethodStart) + source.slice(copyMethodEnd)
console.log('OK: クリップボードコピー処理を削除')

const copyButtonPattern = /\s*<button className="secondaryButton" type="button" onClick=\{\(\) => copyEstimateRows\(estimateRows\)\}>[\s\S]*?<\/button>\s*\{copyStatus && <p className="copyStatus" role="status">\{copyStatus\}<\/p>\}/
if (!copyButtonPattern.test(source)) {
  console.error('既存の「見積用にコピー」ボタンが見つかりません。変更せず終了しました。')
  process.exit(1)
}
const excelButton = `
                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => downloadEstimateExcel({
                      propertyName: selectedProperty?.name || '',
                      unit,
                    }, estimateRows, estimateCopyFormat)}
                  >
                    📊 見積用Excel出力
                  </button>`
source = source.replace(copyButtonPattern, excelButton)
console.log('OK: コピーを見積用Excel出力へ変更')

if (source === original) {
  console.error('変更がありません。処理を中止しました。')
  process.exit(1)
}

fs.writeFileSync(file, source, 'utf8')
console.log('完了: src\\App.jsx を更新しました。')
console.log('次に npm run build を実行してください。')
