const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const file = path.join(root, 'src', 'EstimateVersionPanel.jsx')
const backup = file + '.before-updated-datetime-v1'
const marker = 'M-CROSS_ESTIMATE_VERSION_UPDATED_DATETIME_V1_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(file)) fail('src/EstimateVersionPanel.jsx が見つかりません。')
let source = fs.readFileSync(file, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 更新日時表示V1は適用済みです。')
  process.exit(0)
}

// 表示用途の createdAt を updatedAt 優先へ変更する。
const replacements = [
  [/(version)\.createdAt/g, '($1.updatedAt || $1.createdAt)'],
  [/(item)\.createdAt/g, '($1.updatedAt || $1.createdAt)'],
]

let changed = 0
for (const [pattern, replacement] of replacements) {
  source = source.replace(pattern, () => {
    changed += 1
    return replacement.replace('$1', pattern.source.startsWith('(version') ? 'version' : 'item')
  })
}

if (changed === 0) fail('日時表示に使われている createdAt が見つかりません。変更していません。')

fs.copyFileSync(file, backup)
try {
  source = `// ${marker}\n` + source
  fs.writeFileSync(file, source, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 保存済み見積の日時を updatedAt 優先で表示するV1を適用しました。')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, file)
  process.exit(1)
}
