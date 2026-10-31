const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-spacer-column')
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let all = fs.readFileSync(file, 'utf8')
const fnStart = all.indexOf('async function downloadEstimateExcel(')
const fnEnd = all.indexOf('\nfunction createRecordId()', fnStart)
if (fnStart === -1 || fnEnd === -1) {
  console.error('見積用Excel出力処理が見つかりません。変更せず終了しました。')
  process.exit(1)
}
let source = all.slice(fnStart, fnEnd)
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

replaceOnce(
`    const lastColumn = maxParts + 3`,
`    // 「項目を分ける」場合だけ、項目3とメモの間へ空白の調整列を1列入れる。
    const spacerCount = format === 'split' ? 1 : 0
    const spacerColumnIndex = format === 'split' ? maxParts + 1 : 0
    const memoColumnIndex = maxParts + spacerCount + 1
    const quantityColumnIndex = maxParts + spacerCount + 2
    const unitColumnIndex = maxParts + spacerCount + 3
    const lastColumn = unitColumnIndex`,
'調整列の位置を定義'
)

replaceOnce(
`        ...itemCells,
        ...emptyFill,
        row.memo || '',`,
`        ...itemCells,
        ...emptyFill,
        ...(format === 'split' ? [''] : []),
        row.memo || '',`,
'項目3とメモの間へ空白セルを追加'
)

replaceOnce(
`    headers.push('メモ', '数量', '単位')`,
`    if (format === 'split') headers.push('')
    headers.push('メモ', '数量', '単位')`,
'見出しにも空白列を追加'
)

replaceOnce(
`          color: { argb: columnIndex > maxParts + 1 ? 'FF000000' : 'FF008000' },`,
`          color: { argb: columnIndex >= memoColumnIndex ? 'FF000000' : 'FF008000' },`,
'追加列後の文字色位置を調整'
)

replaceOnce(
`          horizontal: columnIndex === maxParts + 2 ? 'right' : 'left',`,
`          horizontal: columnIndex === quantityColumnIndex ? 'right' : 'left',`,
'追加列後の数量位置を調整'
)

replaceOnce(
`      dataRow.getCell(maxParts + 2).numFmt = '0.0'`,
`      dataRow.getCell(quantityColumnIndex).numFmt = '0.0'`,
'追加列後の数量書式を調整'
)

replaceOnce(
`      const isMemoColumn = columnIndex === maxParts + 1
      const isQuantityColumn = columnIndex === maxParts + 2
      const isUnitColumn = columnIndex === maxParts + 3`,
`      const isSpacerColumn = format === 'split' && columnIndex === spacerColumnIndex
      const isMemoColumn = columnIndex === memoColumnIndex
      const isQuantityColumn = columnIndex === quantityColumnIndex
      const isUnitColumn = columnIndex === unitColumnIndex`,
'各列の判定位置を調整'
)

// Add narrow width rule before memo rule.
replaceOnce(
`      if (isMemoColumn) {`,
`      if (isSpacerColumn) {
        minimumWidth = 3
        maximumWidth = 3
        extraWidth = 0
      } else if (isMemoColumn) {`,
'調整列の幅を3に固定'
)

// After generic width assignment, force exact spacer width and no fill/alignment issues.
const widthAssignment = `      column.width = Math.max(
        minimumWidth,
        Math.min(maximumWidth, maxLength + extraWidth)
      )`
if (!source.includes(widthAssignment)) {
  console.error('列幅の設定箇所が見つかりません。変更せず終了しました。')
  process.exit(1)
}
source = source.replace(widthAssignment, widthAssignment + `
      if (isSpacerColumn) column.width = 3`)
console.log('OK: 調整列を小さめの幅に固定')

if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
all = all.slice(0, fnStart) + source + all.slice(fnEnd)
fs.writeFileSync(file, all, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: 項目を分ける場合のみ「項目3｜空白列｜メモ｜数量｜単位」に変更')
console.log('OK: 空白列の幅は3に固定')
console.log('OK: 項目をまとめる形式は変更していません')
console.log('完了: npm run build を実行してください。')
