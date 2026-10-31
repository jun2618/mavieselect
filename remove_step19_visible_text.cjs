const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-remove-step19-visible-text')
const bad = '              /* M-CROSS_STEP19_BUTTON_PLACEMENT_FIX */'
const good = '              {/* M-CROSS_STEP19_BUTTON_PLACEMENT_FIX */}'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。')
  process.exit(1)
}
let source = fs.readFileSync(target, 'utf8')
if (source.includes(good)) {
  console.log('SKIP: すでにJSXコメントへ修正済みです。')
  process.exit(0)
}
if (!source.includes(bad)) {
  console.error('ERROR: 対象テキストが見つかりません。App.jsxは変更していません。')
  process.exit(1)
}
fs.copyFileSync(target, backup)
source = source.replace(bad, good)
fs.writeFileSync(target, source, 'utf8')
console.log('OK: 画面に表示されていたSTEP19コメントを非表示にしました。')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
