const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step6-fix-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP6 */')) {
  console.error('STEP6が見つかりません。変更しませんでした。')
  process.exit(1)
}

// 壊れたescapeIcsText関数だけ、安全な実装へ丸ごと置換します。
const start = s.indexOf('function escapeIcsText(value) {')
const end = s.indexOf('\nfunction formatIcsLocalDateTime(value) {', start)

if (start === -1 || end === -1) {
  console.error('escapeIcsTextの範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

const fixed = `function escapeIcsText(value) {
  return String(value || '')
    .split('\\\\').join('\\\\\\\\')
    .split('\\r\\n').join('\\\\n')
    .split('\\n').join('\\\\n')
    .split(',').join('\\\\,')
    .split(';').join('\\\\;')
}
`

fs.copyFileSync(file, backup)
s = s.slice(0, start) + fixed + s.slice(end)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP6 escapeIcsText 修正 OK')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
