const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-column-order')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const original = source

if (!source.includes('async function downloadEstimateExcel(')) {
  console.error('見積用Excel出力が入っていません。処理を中止しました。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
console.log('OK: バックアップ作成 ' + backup)

function replaceOnce(oldText, newText, label) {
  const count = source.split(oldText).length - 1
  if (count !== 1) {
    console.error(`置換失敗: ${label}（一致数: ${count}）`)
    process.exit(1)
  }
  source = source.replace(oldText, newText)
  console.log('OK: ' + label)
}

// 現在: 工事項目 → 数量 → 単位 → メモ
// 変更後: 工事項目 → メモ → 数量 → 単位
replaceOnce(
`      return [
        ...itemCells,
        ...emptyFill,
        Number(formatQuantity(row.quantity)),
        row.unit,
        row.memo || '',
      ]`,
`      return [
        ...itemCells,
        ...emptyFill,
        row.memo || '',
        Number(formatQuantity(row.quantity)),
        row.unit,
      ]`,
'データ列を「工事項目・メモ・数量・単位」の順に変更'
)

replaceOnce(
`    headers.push('数量', '単位', 'メモ')`,
`    headers.push('メモ', '数量', '単位')`,
'見出し列を「メモ・数量・単位」の順に変更'
)

replaceOnce(
`          color: { argb: columnIndex > maxParts ? 'FF000000' : 'FF008000' },`,
`          color: { argb: columnIndex > maxParts + 1 ? 'FF000000' : 'FF008000' },`,
'メモ列まで入力項目と同じ文字色に調整'
)

replaceOnce(
`          horizontal: columnIndex === maxParts + 1 ? 'right' : 'left',`,
`          horizontal: columnIndex === maxParts + 2 ? 'right' : 'left',`,
'数量列を右揃えに調整'
)

replaceOnce(
`      dataRow.getCell(maxParts + 1).numFmt = '0.0'`,
`      dataRow.getCell(maxParts + 2).numFmt = '0.0'`,
'数量列の小数第1位表示を調整'
)

replaceOnce(
`      const minimumWidth = columnIndex === maxParts + 1 ? 8 : columnIndex === maxParts + 2 ? 6 : 8`,
`      const minimumWidth = columnIndex === maxParts + 1
        ? 16
        : columnIndex === maxParts + 2
          ? 8
          : columnIndex === maxParts + 3
            ? 6
            : 8`,
'メモ・数量・単位の列幅を調整'
)

replaceOnce(
`    worksheet.getColumn(lastColumn).width = Math.max(16, worksheet.getColumn(lastColumn).width)`,
`    worksheet.getColumn(maxParts + 1).width = Math.max(16, worksheet.getColumn(maxParts + 1).width)`,
'メモ列の最小幅を16に設定'
)

if (source === original) {
  console.error('変更がありません。処理を中止しました。')
  process.exit(1)
}

fs.writeFileSync(file, source, 'utf8')
console.log('完了: 見積用Excelを「工事項目 → メモ → 数量 → 単位」に変更しました。')
console.log('次に npm run build を実行してください。')
