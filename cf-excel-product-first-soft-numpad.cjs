const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-product-first-soft-numpad-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_CF_PRODUCT_FIRST_SOFT_NUMPAD_V1 */'

if (s.includes(marker)) {
  console.log('品番先頭・ソフト巾木テンキー対応はすでに適用済みです')
  process.exit(0)
}

const original = s

/* =========================================================
   1. CF Excel: 品番・商品名を先頭列へ移動
   ========================================================= */

const oldRow = `  const cfRows = combinedCfOrdersForExcel.map(item => [
    item.usage,
    item.breakdown,
    item.orderLength,
    item.count,
    Number(formatQuantity(item.orderLength * item.count)),
    item.productCode,
  ])`

const newRow = `  /* M-CROSS_CF_PRODUCT_FIRST_SOFT_NUMPAD_V1 */
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

/* =========================================================
   2. LengthMeasurementPage内だけを対象にする
   ========================================================= */

const componentStart = s.indexOf('function LengthMeasurementPage({')
const componentEnd = s.indexOf('\nfunction FloorTrimSection(', componentStart)

if (componentStart === -1 || componentEnd === -1) {
  console.error('LengthMeasurementPageの範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

let component = s.slice(componentStart, componentEnd)

/* countOnly（ソフト巾木）でも物理テンキー監視を有効にする */
const oldEffectGuard = `  useEffect(() => {
    if (countOnly || !activeInput) return undefined`
const newEffectGuard = `  useEffect(() => {
    if (!activeInput) return undefined`

if (!component.includes(oldEffectGuard)) {
  console.error('物理テンキー監視の開始条件が見つかりません。変更しませんでした。')
  process.exit(1)
}

component = component.replace(oldEffectGuard, newEffectGuard)

/* Enter時：ソフト巾木なら枚数を登録する */
const oldEnterBranch = `      if (event.code === 'NumpadEnter' || event.key === 'Enter') {
        event.preventDefault()
        handleMeasurementEnter()
        return
      }`

const newEnterBranch = `      if (event.code === 'NumpadEnter' || event.key === 'Enter') {
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

if (!component.includes(oldEnterBranch)) {
  console.error('物理テンキーのEnter処理が見つかりません。変更しませんでした。')
  process.exit(1)
}

component = component.replace(oldEnterBranch, newEnterBranch)

/* ソフト巾木の枚数欄を、PCテンキー対象として明示 */
const oldCountOnlyInput = `<input type="text" inputMode="none" readOnly value={count} onFocus={() => setActiveInput('count')} onClick={() => setActiveInput('count')} placeholder="タップ" />`
const newCountOnlyInput = `<input type="text" inputMode="none" readOnly data-soft-count="true" aria-label="ソフト巾木枚数入力" value={count} onFocus={() => setActiveInput('count')} onClick={() => setActiveInput('count')} placeholder="タップ" />`

if (!component.includes(oldCountOnlyInput)) {
  console.error('ソフト巾木の枚数入力欄が見つかりません。変更しませんでした。')
  process.exit(1)
}

component = component.replace(oldCountOnlyInput, newCountOnlyInput)

s = s.slice(0, componentStart) + component + s.slice(componentEnd)

/* 変更が揃ってからバックアップ・保存 */
if (s === original) {
  console.error('変更箇所がありません。保存しませんでした。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('品番先頭・ソフト巾木テンキー対応 OK')
console.log('CF Excel列順: 品番・商品名 / 使用箇所 / 長さ内訳 / 注文長 / 本数 / 注文数量')
console.log('ソフト巾木: テンキー数字・Backspace・Delete/Esc・Enter登録に対応')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
