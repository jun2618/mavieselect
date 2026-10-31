const fs = require('fs')
const path = require('path')
const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-measurement-excel-layout-v3')
if (!fs.existsSync(file)) { console.error('見つかりません: ' + file); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const original = s
const fnStart = s.indexOf('  function addWorksheet(name, tabColor, columns, rows) {')
const fnEndMarker = '\n  }\n\n  const crossRows ='
const fnEnd = s.indexOf(fnEndMarker, fnStart)
if (fnStart < 0 || fnEnd < 0) { console.error('採寸Excel処理を特定できません。'); process.exit(1) }
let fn = s.slice(fnStart, fnEnd + 4)

// All sheets: reserve six columns for title / property information, regardless of data column count.
if (!fn.includes('const displayLastColumn = Math.max(lastColumn, 6)')) {
  fn = fn.replace('    const lastColumn = columns.length\n', '    const lastColumn = columns.length\n    const displayLastColumn = Math.max(lastColumn, 6)\n')
}
fn = fn.replace('worksheet.mergeCells(1, 1, 1, lastColumn)', 'worksheet.mergeCells(1, 1, 1, displayLastColumn)')
fn = fn.replace('worksheet.mergeCells(rowNumber, 2, rowNumber, lastColumn)', 'worksheet.mergeCells(rowNumber, 2, rowNumber, displayLastColumn)')

// Make alignment explicit. Remove possible old alignment lines first to avoid contradictory formatting.
fn = fn.replace(/titleCell\.alignment = \{[^\n]*\}/, "titleCell.alignment = { vertical: 'middle', horizontal: 'left' }")
if (!fn.includes("titleCell.alignment = { vertical: 'middle', horizontal: 'left' }")) {
  fn = fn.replace("titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tabColor } }", "titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tabColor } }\n    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }")
}

const metadataNeedle = "      valueCell.font = { name: 'Yu Gothic' }"
if (!fn.includes(metadataNeedle)) { console.error('物件情報セルが見つかりません。'); process.exit(1) }
// Ensure one explicit assignment right at metadata construction.
fn = fn.replace(/\n      valueCell\.alignment = \{[^\n]*\}/g, '')
fn = fn.replace(/\n      labelCell\.alignment = \{[^\n]*\}/g, '')
fn = fn.replace(metadataNeedle, metadataNeedle + "\n      valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }\n      labelCell.alignment = { vertical: 'middle', horizontal: 'left' }")

// Insert final formatting block at the very end of addWorksheet, AFTER all per-column formatting.
const finalBlock = `

    // Final layout override: make property information visibly start at the left edge.
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    metadata.forEach(([, value], index) => {
      const rowNumber = index + 3
      const labelCell = worksheet.getCell(rowNumber, 1)
      const valueCell = worksheet.getCell(rowNumber, 2)
      valueCell.value = value
      labelCell.alignment = { vertical: 'middle', horizontal: 'left' }
      valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
    })

    // Keep the soft-baseboard sheet as readable as the other measurement sheets.
    if (name === 'ソフト巾木') {
      worksheet.getColumn(1).width = 18
      worksheet.getColumn(2).width = 14
      worksheet.getColumn(3).width = 14
      worksheet.getColumn(4).width = 12
      worksheet.getColumn(5).width = 12
      worksheet.getColumn(6).width = 12
      worksheet.getRow(8).height = 24
      worksheet.getCell(8, 1).alignment = { vertical: 'middle', horizontal: 'left' }
      worksheet.getCell(8, 2).alignment = { vertical: 'middle', horizontal: 'center' }
      worksheet.getCell(8, 3).alignment = { vertical: 'middle', horizontal: 'center' }
    }`
// Avoid duplicate v3 block if rerun.
fn = fn.replace(/\n\n    \/\/ Final layout override:[\s\S]*?(?=\n  \}$)/, '')
fn = fn.replace(/\n  \}$/, finalBlock + '\n  }')

s = s.slice(0, fnStart) + fn + s.slice(fnEnd + 4)
if (s === original) { console.error('変更がありません。'); process.exit(1) }
fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: 物件情報の値をB列左端へ強制的に左揃え')
console.log('OK: 全シートのタイトル・物件情報を最低A〜F幅で表示')
console.log('OK: ソフト巾木をA〜F幅で表示し、部屋名・枚数・数量を切れない幅へ変更')
console.log('完了: npm run build を実行してください。')
