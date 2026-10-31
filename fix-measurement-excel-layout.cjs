const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-measurement-excel-layout-fix')
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const original = source

function replaceOnce(oldText, newText, label) {
  const count = source.split(oldText).length - 1
  if (count !== 1) {
    console.error(`置換失敗: ${label}（一致数: ${count}）`)
    process.exit(1)
  }
  source = source.replace(oldText, newText)
  console.log('OK: ' + label)
}

// タイトルを左揃えに統一
replaceOnce(
  "titleCell.alignment = { vertical: 'middle' }",
  "titleCell.alignment = { vertical: 'middle', horizontal: 'left' }",
  '採寸Excelのタイトルを左揃え'
)

// 管理会社・物件名・住所・号室・出力日を左揃え
replaceOnce(
`      const valueCell = worksheet.getCell(rowNumber, 2)
      valueCell.value = value
      valueCell.font = { name: 'Yu Gothic' }`,
`      const valueCell = worksheet.getCell(rowNumber, 2)
      valueCell.value = value
      valueCell.font = { name: 'Yu Gothic' }
      valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      labelCell.alignment = { vertical: 'middle', horizontal: 'left' }`,
  '物件情報を左揃え'
)

// 数値列の見出しが切れないように、幅の下限を引き上げる
replaceOnce(
`      } else if (['長さ', '高さ', '本数', '枚数', '数量'].includes(headerText)) {
        minimumWidth = 8
        maximumWidth = 10
        extraWidth = 1`,
`      } else if (['長さ', '高さ', '本数', '枚数', '数量'].includes(headerText)) {
        minimumWidth = 10
        maximumWidth = 12
        extraWidth = 2`,
  '枚数・数量などの見出し幅を拡張'
)

// ソフト巾木シートは特にA〜C列の最低幅を保証
const widthLoopEnd = `      column.alignment = {
        vertical: 'middle',
        horizontal: ['長さ', '高さ', '本数', '枚数', '数量'].includes(headerText) ? 'right' : 'left',
        wrapText: maxLength + extraWidth > maximumWidth,
      }
    }`
const widthLoopNew = `      column.alignment = {
        vertical: 'middle',
        horizontal: ['長さ', '高さ', '本数', '枚数', '数量'].includes(headerText) ? 'right' : 'left',
        wrapText: maxLength + extraWidth > maximumWidth,
      }
    }

    if (name === 'ソフト巾木') {
      worksheet.getColumn(1).width = Math.max(12, worksheet.getColumn(1).width || 0)
      worksheet.getColumn(2).width = Math.max(10, worksheet.getColumn(2).width || 0)
      worksheet.getColumn(3).width = Math.max(10, worksheet.getColumn(3).width || 0)
    }`
replaceOnce(widthLoopEnd, widthLoopNew, 'ソフト巾木の3列を読みやすい幅に固定')

if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, source, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: 管理会社・物件名・住所・号室・出力日を左揃え')
console.log('OK: ソフト巾木の「部屋名・枚数・数量」が切れない幅に調整')
console.log('完了: 次に npm run build を実行してください。')
