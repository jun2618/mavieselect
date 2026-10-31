const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step3-backup'

let s = fs.readFileSync(file, 'utf8')

if (s.includes('/* M-CROSS_CF_MATERIAL_LOAD_V1 */')) {
  console.log('STEP3はすでに適用済みです')
  process.exit(0)
}

if (!s.includes('const [cfMaterialGroups, setCfMaterialGroups]')) {
  console.error('STEP1のcfMaterialGroupsが見つかりません。変更しませんでした。')
  process.exit(1)
}

let changes = 0

function addAfter(target, addition, label) {
  if (!s.includes(target)) {
    console.log('SKIP:', label)
    return
  }

  if (s.includes(target + '\n' + addition)) {
    console.log('既に追加済み:', label)
    return
  }

  s = s.replace(target, target + '\n' + addition)
  changes++
  console.log('追加:', label)
}

/* 保存済み案件を開く */
addAfter(
  `    setCfRecords(Array.isArray(entry.cfRecords) ? entry.cfRecords : [])`,
  `    setCfMaterialGroups(Array.isArray(entry.cfMaterialGroups) ? entry.cfMaterialGroups : [])`,
  '保存済み案件'
)

/* LocalStorageから案件データを読み込む */
addAfter(
  `      setCfRecords(Array.isArray(savedData?.cfRecords) ? savedData.cfRecords : [])`,
  `      setCfMaterialGroups(Array.isArray(savedData?.cfMaterialGroups) ? savedData.cfMaterialGroups : [])`,
  'LocalStorage読込'
)

/* 作業中ドラフトを復旧 */
addAfter(
  `    setCfRecords(Array.isArray(draft.cfRecords) ? draft.cfRecords : [])`,
  `    setCfMaterialGroups(Array.isArray(draft.cfMaterialGroups) ? draft.cfMaterialGroups : [])`,
  '作業中ドラフト復旧'
)

/* 読込エラー時のリセット */
addAfter(
  `      setCfRecords([])`,
  `      setCfMaterialGroups([])`,
  '読込失敗時リセット'
)

if (changes === 0) {
  console.error('読み込み処理の変更対象が見つかりませんでした。変更しませんでした。')
  process.exit(1)
}

/* マーカー */
const markerTarget =
  '  const [cfMaterialGroups, setCfMaterialGroups] = useState([])'

s = s.replace(
  markerTarget,
  `  /* M-CROSS_CF_MATERIAL_LOAD_V1 */
${markerTarget}`
)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('')
console.log('STEP3 OK')
console.log('cfMaterialGroups の読み込み・復旧処理を追加しました')
console.log('変更箇所:', changes)
console.log('バックアップ:', backup)