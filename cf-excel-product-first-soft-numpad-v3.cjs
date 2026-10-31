const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-product-first-soft-numpad-v3-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_CF_PRODUCT_FIRST_SOFT_NUMPAD_V3 */'

if (s.includes(marker)) {
  console.log('V3はすでに適用済みです')
  process.exit(0)
}

const original = s

// ---------------------------------------------------------
// 1. CF Excel: 「品番・商品名」を先頭へ移動
// ---------------------------------------------------------
const rowPattern = /  const cfRows = combinedCfOrdersForExcel\.map\(item => \[\r?\n\s*item\.usage,\r?\n\s*item\.breakdown,\r?\n\s*item\.orderLength,\r?\n\s*item\.count,\r?\n\s*Number\(formatQuantity\(item\.orderLength \* item\.count\)\),\r?\n\s*item\.productCode,\r?\n\s*\]\)/

if (!rowPattern.test(s)) {
  console.error('CF Excelの行データ（V6形式）が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(rowPattern, `  ${marker}
  const cfRows = combinedCfOrdersForExcel.map(item => [
    item.productCode,
    item.usage,
    item.breakdown,
    item.orderLength,
    item.count,
    Number(formatQuantity(item.orderLength * item.count)),
  ])`)

const oldHeader = "  addWorksheet('CF', 'FF6E91E8', ['使用箇所', '長さ内訳', '注文長(m)', '本数', '注文数量(m)', '品番・商品名'], cfRows)"
const newHeader = "  addWorksheet('CF', 'FF6E91E8', ['品番・商品名', '使用箇所', '長さ内訳', '注文長(m)', '本数', '注文数量(m)'], cfRows)"

if (!s.includes(oldHeader)) {
  console.error('CF Excelの見出し（V6形式）が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(oldHeader, newHeader)

// ---------------------------------------------------------
// 2. LengthMeasurementPage内だけソフト巾木テンキー対応
// ---------------------------------------------------------
const componentStart = s.indexOf('function LengthMeasurementPage({')
const componentEnd = s.indexOf('\nfunction FloorTrimSection(', componentStart)

if (componentStart === -1 || componentEnd === -1) {
  console.error('LengthMeasurementPageの範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

let c = s.slice(componentStart, componentEnd)

// countOnlyでも物理テンキー監視を有効にする。
const guardPattern = /if \(countOnly \|\| !activeInput\) return undefined/
if (!guardPattern.test(c)) {
  console.error('現在のcountOnlyテンキーガードが見つかりません。変更しませんでした。')
  process.exit(1)
}
c = c.replace(guardPattern, 'if (!activeInput) return undefined')

// Enter処理はCRLF/LFどちらでも一致する正規表現で置換。
const enterPattern = /if \(event\.code === 'NumpadEnter' \|\| event\.key === 'Enter'\) \{\r?\n\s*event\.preventDefault\(\)\r?\n\s*handleMeasurementEnter\(\)\r?\n\s*return\r?\n\s*\}/

if (!enterPattern.test(c)) {
  console.error('現在のEnter処理が見つかりません。変更しませんでした。')
  process.exit(1)
}

c = c.replace(enterPattern, `if (event.code === 'NumpadEnter' || event.key === 'Enter') {
        event.preventDefault()

        if (countOnly) {
          const numericQuantity = Number(count)
          if (!Number.isInteger(numericQuantity) || numericQuantity < 1) return
          addRecord({ preventDefault() {} })
          requestAnimationFrame(() => setActiveInput('count'))
          return
        }

        handleMeasurementEnter()
        return
      }`)

s = s.slice(0, componentStart) + c + s.slice(componentEnd)

if (s === original) {
  console.error('変更がありません。保存しませんでした。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('品番先頭・ソフト巾木テンキー V3 OK')
console.log('CF Excel: 品番・商品名 / 使用箇所 / 長さ内訳 / 注文長 / 本数 / 注文数量')
console.log('ソフト巾木: テンキー数字 / Backspace / Delete・Esc / Enter登録に対応')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
