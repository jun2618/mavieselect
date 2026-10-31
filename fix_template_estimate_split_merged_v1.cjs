const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-template-split-merged-v1')
const marker = 'M-CROSS_TEMPLATE_SPLIT_MERGED_V1'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: テンプレート見積の分割・まとめ対応は適用済みです。')
  process.exit(0)
}
if (!source.includes('M-CROSS_ESTIMATE_TEMPLATE_OUTPUT_V2_SAFE')) {
  console.error('ERROR: 安全版テンプレート出力V2が見つかりません。App.jsxは変更していません。')
  process.exit(1)
}

const functionStart = source.indexOf('async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {')
const legacyStart = source.indexOf('async function downloadEstimateExcelLegacy(', functionStart)
if (functionStart < 0 || legacyStart < 0) {
  console.error('ERROR: 現在のテンプレート出力関数を特定できません。App.jsxは変更していません。')
  process.exit(1)
}

const before = source.slice(0, functionStart)
let block = source.slice(functionStart, legacyStart)
const after = source.slice(legacyStart)

const clearOld = `      for (const column of ['C', 'F', 'H', 'I', 'J', 'K']) {
        ws.cell(column + rowNumber).value('')
      }`
const clearNew = `      /* ${marker} */
      for (const column of ['C', 'D', 'E', 'F', 'H', 'I', 'J', 'K']) {
        ws.cell(column + rowNumber).value('')
      }`

const writeOld = `    outputRows.forEach((row, index) => {
      const rowNumber = 23 + index
      ws.cell('C' + rowNumber).value(joinedParts(row))
      ws.cell('F' + rowNumber).value(row?.memo || '')
      ws.cell('H' + rowNumber).value(cellValue(row?.quantity))
      ws.cell('I' + rowNumber).value(row?.unit || '')
      ws.cell('J' + rowNumber).value(cellValue(row?.rate))
      ws.cell('K' + rowNumber).value(cellValue(row?.amount))
    })`

const writeNew = `    outputRows.forEach((row, index) => {
      const rowNumber = 23 + index
      const parts = Array.isArray(row?.parts)
        ? row.parts.map(value => String(value || '').trim()).filter(Boolean)
        : [String(row?.label || row?.name || '').trim()].filter(Boolean)
      const memo = String(row?.memo || '').trim()

      if (format === 'split') {
        // 社員用: 工事項目をC～F列へ分ける。
        const splitParts = parts.slice(0, 4)
        ;['C', 'D', 'E', 'F'].forEach((column, partIndex) => {
          ws.cell(column + rowNumber).value(splitParts[partIndex] || '')
        })
        // 4項目未満なら、空いている次の項目列へメモを表示する。
        if (memo && splitParts.length < 4) {
          const memoColumn = ['C', 'D', 'E', 'F'][splitParts.length]
          ws.cell(memoColumn + rowNumber).value(memo)
        } else if (memo && splitParts.length >= 4) {
          // 4項目すべて使用中の場合は、最後の項目へメモを追記する。
          ws.cell('F' + rowNumber).value((splitParts[3] || '') + '　' + memo)
        }
      } else {
        // 自分用: 工事項目をC列へまとめ、メモはF列へ出す。
        ws.cell('C' + rowNumber).value(parts.join(' '))
        ws.cell('D' + rowNumber).value('')
        ws.cell('E' + rowNumber).value('')
        ws.cell('F' + rowNumber).value(memo)
      }

      ws.cell('H' + rowNumber).value(cellValue(row?.quantity))
      ws.cell('I' + rowNumber).value(row?.unit || '')
      ws.cell('J' + rowNumber).value(cellValue(row?.rate))
      ws.cell('K' + rowNumber).value(cellValue(row?.amount))
    })`

if (!block.includes(clearOld)) {
  console.error('ERROR: 明細クリア処理が想定と違います。App.jsxは変更していません。')
  process.exit(1)
}
if (!block.includes(writeOld)) {
  console.error('ERROR: 明細書き込み処理が想定と違います。App.jsxは変更していません。')
  process.exit(1)
}

fs.copyFileSync(target, backup)
block = block.replace(clearOld, clearNew).replace(writeOld, writeNew)
source = before + block + after
fs.writeFileSync(target, source, 'utf8')

console.log('OK: テンプレート見積へ「項目を分ける／まとめる」を反映しました。')
console.log('  - 項目を分ける: C～F列へ分割')
console.log('  - 項目をまとめる: C列へ結合、メモはF列')
console.log('  - 数量H、単位I、単価J、金額Kは維持')
console.log('  - クロス・CF一式V3も維持')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
