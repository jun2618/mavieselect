const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-merged-spacers')
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
let s = all.slice(fnStart, fnEnd)
const original = s

// This version assumes the split format already has one spacer column.
const oldCounts = `    const spacerCount = format === 'split' ? 1 : 0
    const spacerColumnIndex = format === 'split' ? maxParts + 1 : 0
    const memoColumnIndex = maxParts + spacerCount + 1`
const newCounts = `    const spacerCount = format === 'split' ? 1 : 2
    const firstSpacerColumnIndex = maxParts + 1
    const memoColumnIndex = maxParts + spacerCount + 1`
if (!s.includes(oldCounts)) {
  console.error('前回の空白列処理が見つかりません。変更せず終了しました。')
  process.exit(1)
}
s = s.replace(oldCounts, newCounts)

const oldRows = `        ...(format === 'split' ? [''] : []),
        row.memo || '',`
const newRows = `        ...Array(spacerCount).fill(''),
        row.memo || '',`
if (!s.includes(oldRows)) {
  console.error('見積データの空白列追加位置が見つかりません。')
  process.exit(1)
}
s = s.replace(oldRows, newRows)

const oldHeaders = `    if (format === 'split') headers.push('')
    headers.push('メモ', '数量', '単位')`
const newHeaders = `    headers.push(...Array(spacerCount).fill(''))
    headers.push('メモ', '数量', '単位')`
if (!s.includes(oldHeaders)) {
  console.error('見積見出しの空白列追加位置が見つかりません。')
  process.exit(1)
}
s = s.replace(oldHeaders, newHeaders)

const oldDetect = `      const isSpacerColumn = format === 'split' && columnIndex === spacerColumnIndex`
const newDetect = `      const isSpacerColumn = columnIndex >= firstSpacerColumnIndex && columnIndex < memoColumnIndex`
if (!s.includes(oldDetect)) {
  console.error('空白列の列幅判定が見つかりません。')
  process.exit(1)
}
s = s.replace(oldDetect, newDetect)

// Keep split spacer narrow and make merged three spacer columns narrow as well.
// width=3 already applies via isSpacerColumn.

if (s === original) {
  console.error('変更がありません。')
  process.exit(1)
}
fs.copyFileSync(file, backup)
all = all.slice(0, fnStart) + s + all.slice(fnEnd)
fs.writeFileSync(file, all, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: 項目をまとめる形式は「工事項目｜空白｜空白｜メモ｜数量｜単位」に変更')
console.log('OK: 追加した2列は幅3の小さい列')
console.log('OK: 項目を分ける形式の空白列1つはそのまま維持')
console.log('完了: npm run build を実行してください。')
