const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step1-backup'

let s = fs.readFileSync(file, 'utf8')

const target = "  const [cfRecords, setCfRecords] = useState([])"
const addition = "  const [cfMaterialGroups, setCfMaterialGroups] = useState([])"

if (s.includes(addition)) {
  console.log('STEP1はすでに適用済みです')
  process.exit(0)
}

if (!s.includes(target)) {
  console.error('cfRecords が見つかりません。変更しませんでした。')
  process.exit(1)
}

fs.copyFileSync(file, backup)

s = s.replace(
  target,
  target + '\n' + addition
)

fs.writeFileSync(file, s, 'utf8')

console.log('STEP1 OK')
console.log('cfMaterialGroups を追加しました')
console.log('バックアップ:', backup)