const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-product-first-soft-numpad-v2-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_CF_PRODUCT_FIRST_SOFT_NUMPAD_V2 */'

if (s.includes(marker)) {
  console.log('V2はすでに適用済みです')
  process.exit(0)
}

const original = s

// 1) CF Excel: 品番・商品名を先頭へ
const oldRow = `  const cfRows = combinedCfOrdersForExcel.map(item => [
    item.usage,
    item.breakdown,
    item.orderLength,
    item.count,
    Number(formatQuantity(item.orderLength * item.count)),
    item.productCode,
  ])`

const newRow = `  ${marker}
  const cfRows = combinedCfOrdersForExcel.map(item => [
    item.productCode,
    item.usage,
    item.breakdown,
    item.orderLength,
    item.count,
    Number(formatQuantity(item.orderLength * item.count)),
  ])`

if (!s.includes(oldRow)) {
  console.error('CF Excelの行データ（V6形式）が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(oldRow, newRow)

const oldHeader = "  addWorksheet('CF', 'FF6E91E8', ['使用箇所', '長さ内訳', '注文長(m)', '本数', '注文数量(m)', '品番・商品名'], cfRows)"
const newHeader = "  addWorksheet('CF', 'FF6E91E8', ['品番・商品名', '使用箇所', '長さ内訳', '注文長(m)', '本数', '注文数量(m)'], cfRows)"

if (!s.includes(oldHeader)) {
  console.error('CF Excelの見出し（V6形式）が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(oldHeader, newHeader)

// 2) LengthMeasurementPage 内の物理テンキー処理だけ変更
const componentStart = s.indexOf('function LengthMeasurementPage({')
const componentEnd = s.indexOf('\nfunction FloorTrimSection(', componentStart)
if (componentStart < 0 || componentEnd < 0) {
  console.error('LengthMeasurementPageの範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

let c = s.slice(componentStart, componentEnd)

const guard = '    if (countOnly || !activeInput) return undefined'
if (!c.includes(guard)) {
  console.error('現在のcountOnlyテンキーガードが見つかりません。変更しませんでした。')
  process.exit(1)
}
c = c.replace(guard, '    if (!activeInput) return undefined')

const enterOld = `      if (event.code === 'NumpadEnter' || event.key === 'Enter') {
        event.preventDefault()
        handleMeasurementEnter()
        return
      }`
const enterNew = `      if (event.code === 'NumpadEnter' || event.key === 'Enter') {
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
      }`

if (!c.includes(enterOld)) {
  console.error('現在のEnter処理が見つかりません。変更しませんでした。')
  process.exit(1)
}
c = c.replace(enterOld, enterNew)

// countOnlyでは小数点を無視。数字/Backspace/Delete/Escは既存updateInputをそのまま利用。
// 入力欄はreadOnlyなので物理テンキーイベントを横取りできます。

s = s.slice(0, componentStart) + c + s.slice(componentEnd)

if (s === original) {
  console.error('変更がありません。保存しませんでした。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('品番先頭・ソフト巾木テンキー V2 OK')
console.log('CF Excel: 品番・商品名を先頭列へ移動')
console.log('ソフト巾木: テンキー数字 / Backspace / Delete・Esc / Enter登録に対応')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
