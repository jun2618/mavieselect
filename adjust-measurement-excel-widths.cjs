const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-measurement-column-widths')

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
      }, 10)
      const headerText = String(columns[columnIndex - 1] || '')
      const minimumWidth = headerText === '数量' ? 8 : headerText === '単位' ? 6 : 6
      worksheet.getColumn(columnIndex).width = Math.max(minimumWidth, Math.min(maxLength + 2, 40))
      worksheet.getColumn(columnIndex).alignment = { vertical: 'middle', wrapText: maxLength > 40 }
    }`

const newBlock = `    function getMeasurementDisplayLength(value) {
      return [...String(value ?? '')].reduce((length, character) => {
        const code = character.charCodeAt(0)
        return length + (code > 0xff ? 2 : 1)
      }, 0)
    }

    for (let columnIndex = 1; columnIndex <= lastColumn; columnIndex += 1) {
      const column = worksheet.getColumn(columnIndex)
      const headerText = String(columns[columnIndex - 1] || '')
      const maxLength = column.values.reduce(
        (max, value) => Math.max(max, getMeasurementDisplayLength(value)),
        getMeasurementDisplayLength(headerText)
      )

      let minimumWidth = 6
      let maximumWidth = 20
      let extraWidth = 1.5

      if (headerText === '部屋名') {
        minimumWidth = 8
        maximumWidth = 16
      } else if (headerText === '採寸区分') {
        minimumWidth = 10
        maximumWidth = 16
      } else if (headerText === 'メモ') {
        minimumWidth = 14
        maximumWidth = 30
        extraWidth = 2
      } else if (['長さ', '高さ', '本数', '枚数', '数量'].includes(headerText)) {
        minimumWidth = 8
        maximumWidth = 10
        extraWidth = 1
      } else if (headerText === '単位') {
        minimumWidth = 5
        maximumWidth = 6
        extraWidth = 1
      } else if (['部屋①', '部屋②'].includes(headerText)) {
        minimumWidth = 10
        maximumWidth = 18
      } else if (headerText === 'カラー') {
        minimumWidth = 10
        maximumWidth = 14
      }

      column.width = Math.max(
        minimumWidth,
        Math.min(maximumWidth, maxLength + extraWidth)
      )
      column.alignment = {
        vertical: 'middle',
        horizontal: ['長さ', '高さ', '本数', '枚数', '数量'].includes(headerText) ? 'right' : 'left',
        wrapText: maxLength + extraWidth > maximumWidth,
      }
    }`

const count = source.split(oldBlock).length - 1
if (count !== 1) {
  console.error(`採寸Excelの列幅処理を特定できません（一致数: ${count}）。`)
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
console.log('OK: クロス・CF・ソフト巾木・床見切りの採寸Excel列幅を自動調整')
console.log('OK: メモ列は広め、数量系はコンパクト、長文は折り返し')
console.log('完了: 次に npm run build を実行してください。')
