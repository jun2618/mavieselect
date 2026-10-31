const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-template-preserve-blank-parts-v2')
const marker = 'M-CROSS_TEMPLATE_PRESERVE_BLANK_PARTS_V2'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 空白項目保持V2は適用済みです。')
  process.exit(0)
}
if (!source.includes('M-CROSS_TEMPLATE_SPLIT_MERGED_V1')) {
  console.error('ERROR: テンプレートの分割・まとめ対応が見つかりません。変更していません。')
  process.exit(1)
}

const oldParts = `      const parts = Array.isArray(row?.parts)
        ? row.parts.map(value => String(value || '').trim()).filter(Boolean)
        : [String(row?.label || row?.name || '').trim()].filter(Boolean)
      const memo = String(row?.memo || '').trim()`

const newParts = `      /* ${marker} */
      // 分割形式では「項目2だけ空欄」のような位置情報を維持する。
      const rawParts = Array.isArray(row?.parts)
        ? row.parts.map(value => String(value || '').trim())
        : [String(row?.label || row?.name || '').trim()]
      const parts = format === 'split'
        ? [0, 1, 2, 3].map(index => rawParts[index] || '')
        : rawParts.filter(Boolean)
      const memo = String(row?.memo || '').trim()`

const oldSplit = `        const splitParts = parts.slice(0, 4)
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
        }`

const newSplit = `        const splitParts = [0, 1, 2, 3].map(index => parts[index] || '')
        ;['C', 'D', 'E', 'F'].forEach((column, partIndex) => {
          ws.cell(column + rowNumber).value(splitParts[partIndex])
        })
        // 分割形式では空白列を詰めない。メモは空いている末尾列へ入れる。
        if (memo) {
          let memoIndex = -1
          for (let index = 3; index >= 0; index -= 1) {
            if (!splitParts[index]) { memoIndex = index; break }
          }
          if (memoIndex >= 0) ws.cell(['C', 'D', 'E', 'F'][memoIndex] + rowNumber).value(memo)
          else ws.cell('F' + rowNumber).value(splitParts[3] + '　' + memo)
        }`

if (!source.includes(oldParts)) {
  console.error('ERROR: parts生成処理が想定と違います。変更していません。')
  process.exit(1)
}
if (!source.includes(oldSplit)) {
  console.error('ERROR: 分割出力処理が想定と違います。変更していません。')
  process.exit(1)
}

fs.copyFileSync(target, backup)
source = source.replace(oldParts, newParts).replace(oldSplit, newSplit)
fs.writeFileSync(target, source, 'utf8')

console.log('OK: 分割Excelで項目1～4の空白位置を保持するよう修正しました。')
console.log('例: 項目1=室内各所 / 項目2=空白 / 項目3=ソフト巾木貼替')
console.log('    C列=室内各所 / D列=空白 / E列=ソフト巾木貼替 / F列=空白')
console.log('「項目をまとめる」では従来どおり空白を除いてC列へ結合します。')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
