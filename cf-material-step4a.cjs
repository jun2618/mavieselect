const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step4a-backup'

let s = fs.readFileSync(file, 'utf8')

const marker = '/* M-CROSS_CF_MATERIAL_STEP4A */'

if (s.includes(marker)) {
  console.log('STEP4-Aはすでに適用済みです')
  process.exit(0)
}

const start = s.indexOf('function LengthMeasurementPage({')
const end = s.indexOf('}) {', start)

if (start === -1 || end === -1) {
  console.error('LengthMeasurementPageが見つかりません。変更しませんでした。')
  process.exit(1)
}

const headerEnd = end + 4
const header = s.slice(start, headerEnd)

if (!header.includes('  onRegistered,')) {
  console.error('LengthMeasurementPage内のonRegisteredが見つかりません。変更しませんでした。')
  process.exit(1)
}

const newHeader = header.replace(
  '  onRegistered,',
`  onRegistered,
  materialGroups = [],
  setMaterialGroups,
  onMaterialGroupsChanged,`
)

const replacement =
  newHeader +
  '\n  ' +
  marker

fs.copyFileSync(file, backup)

s =
  s.slice(0, start) +
  replacement +
  s.slice(headerEnd)

fs.writeFileSync(file, s, 'utf8')

console.log('STEP4-A OK')
console.log('LengthMeasurementPageに材料グループ用propsを追加しました')
console.log('バックアップ:', backup)