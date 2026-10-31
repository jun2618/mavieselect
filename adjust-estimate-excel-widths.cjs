const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-column-widths')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const original = source

const oldBlock = `    for (let columnIndex = 1; columnIndex <= lastColumn; columnIndex += 1) {
      const maxLength = worksheet.getColumn(columnIndex).values.reduce((max, value) => {
        const text = String(value ?? '')
        const displayLength = [...text].reduce(
          (length, character) => length + (character.charCodeAt(0) > 0xff ? 2 : 1),
          0
        )
        return Math.max(max, displayLength)
      }, 0)
      const minimumWidth = columnIndex === maxParts + 1
        ? 16
        : columnIndex === maxParts + 2
          ? 8
          : columnIndex === maxParts + 3
            ? 6
            : 8
      worksheet.getColumn(columnIndex).width = Math.max(minimumWidth, Math.min(maxLength + 2, 40))
    }
    worksheet.getColumn(maxParts + 1).width = Math.max(16, worksheet.getColumn(maxParts + 1).width)`

const newBlock = `    function getDisplayLength(value) {
      return [...String(value ?? '')].reduce((length, character) => {
        const code = character.charCodeAt(0)
        return length + (code > 0xff ? 2 : 1)
      }, 0)
    }

    for (let columnIndex = 1; columnIndex <= lastColumn; columnIndex += 1) {
      const column = worksheet.getColumn(columnIndex)
      const maxLength = column.values.reduce(
        (max, value) => Math.max(max, getDisplayLength(value)),
        0
      )
      const isMemoColumn = columnIndex === maxParts + 1
      const isQuantityColumn = columnIndex === maxParts + 2
      const isUnitColumn = columnIndex === maxParts + 3

      let minimumWidth = 6
      let maximumWidth = 24
      let extraWidth = 1.5

      if (isMemoColumn) {
        minimumWidth = 12
        maximumWidth = 28
        extraWidth = 2
      } else if (isQuantityColumn) {
        minimumWidth = 8
        maximumWidth = 10
        extraWidth = 1
      } else if (isUnitColumn) {
        minimumWidth = 5
        maximumWidth = 6
        extraWidth = 1
      } else if (format === 'merged' && columnIndex === 1) {
        minimumWidth = 18
        maximumWidth = 36
        extraWidth = 2
      }

      column.width = Math.max(
        minimumWidth,
        Math.min(maximumWidth, maxLength + extraWidth)
      )
      column.alignment = {
        vertical: 'middle',
        horizontal: isQuantityColumn ? 'right' : 'left',
        wrapText: maxLength + extraWidth > maximumWidth,
      }
    }`

const count = source.split(oldBlock).length - 1
if (count !== 1) {
  console.error(`見積用Excelの列幅処理を特定できません（一致数: ${count}）。`)
  console.error('変更せず終了しました。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
source = source.replace(oldBlock, newBlock)

if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}

fs.writeFileSync(file, source, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: 見積用Excelの列幅を内容に合わせて自動調整')
console.log('OK: 項目列 6〜24、メモ列 12〜28、数量列 8〜10、単位列 5〜6')
console.log('OK: 項目をまとめる場合の工事項目列は 18〜36')
console.log('OK: 最大幅を超える文字はセル内で折り返し')
console.log('完了: 次に npm run build を実行してください。')
