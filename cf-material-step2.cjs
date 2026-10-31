const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step2-backup'

let s = fs.readFileSync(file, 'utf8')

if (s.includes('/* M-CROSS_CF_MATERIAL_SAVE_V1 */')) {
  console.log('STEP2はすでに適用済みです')
  process.exit(0)
}

const original = s

// 1. cfRecords の直後に保存項目を追加
s = s.replace(
  /^(\s*)cfRecords,\r?$/gm,
  `$1cfRecords,
$1cfMaterialGroups,`
)

// 2. 自動保存 useEffect の依存配列にも追加
s = s.replace(
  /^(\s*)cfRecords,\r?$/gm,
  match => match
)

// マーカーをstateの直前へ追加
const stateTarget =
  "  const [cfMaterialGroups, setCfMaterialGroups] = useState([])"

if (!s.includes(stateTarget)) {
  console.error('STEP1のcfMaterialGroupsが見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(
  stateTarget,
  `  /* M-CROSS_CF_MATERIAL_SAVE_V1 */
${stateTarget}`
)

if (s === original) {
  console.error('変更対象が見つかりませんでした。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP2 OK')
console.log('cfMaterialGroups を保存対象へ追加しました')
console.log('バックアップ:', backup)