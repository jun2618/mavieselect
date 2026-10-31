const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step7-fix-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP7 */')) {
  console.error('STEP7が見つかりません。変更しませんでした。')
  process.exit(1)
}

const functionStart = s.indexOf('  async function importResidentCasesExcel(fileValue) {')
const functionEnd = s.indexOf('\n  function updateResidentCase(', functionStart)

if (functionStart === -1 || functionEnd === -1) {
  console.error('Excel取込関数の範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

let block = s.slice(functionStart, functionEnd)

// CJSのテンプレート文字列で失われた正規表現を、正しいコードへ修復します。
const brokenDateLine = "        return text(value).replace(///g, '-').replace(/./g, '-')"
const fixedDateLine = "        return text(value).replace(/\\//g, '-').replace(/\\./g, '-')"

if (!block.includes(brokenDateLine)) {
  console.error('日付変換の壊れた行が見つかりません。変更しませんでした。')
  process.exit(1)
}
block = block.replace(brokenDateLine, fixedDateLine)

// 改行・半角空白・全角空白を除去する正規表現へ修復します。
const normalizeStart = block.indexOf('      const normalizeHeader = value =>')
const findSheetStart = block.indexOf('      const findSheet = names =>', normalizeStart)

if (normalizeStart === -1 || findSheetStart === -1) {
  console.error('見出し正規化処理が見つかりません。変更しませんでした。')
  process.exit(1)
}

const fixedNormalize = "      const normalizeHeader = value => text(value).replace(/[\\s　\\r\\n]+/g, '')\n"
block = block.slice(0, normalizeStart) + fixedNormalize + block.slice(findSheetStart)

fs.copyFileSync(file, backup)
s = s.slice(0, functionStart) + block + s.slice(functionEnd)
fs.writeFileSync(file, s, 'utf8')

console.log('入居中案件 STEP7 修正 OK')
console.log('日付変換と見出し正規化の壊れた正規表現を修復しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
