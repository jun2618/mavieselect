const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-estimate-version-restore-delay-v4'
const marker = 'M-CROSS_ESTIMATE_VERSION_RESTORE_DELAY_V4_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')

if (source.includes(marker)) {
  console.log('SKIP: 見積版復元待機V4は適用済みです。')
  process.exit(0)
}

const helperRegex = /  function openSavedEstimateVersion\(entry, version\) \{[\s\S]*?\n  \}\n\n  function openSavedEntry\(entry\) \{/
const match = source.match(helperRegex)
if (!match) fail('openSavedEstimateVersion関数の実コードが見つかりません。変更していません。')

const helperBlock = match[0]
const delayMatches = helperBlock.match(/\},\s*0\)/g) || []
if (delayMatches.length !== 1) {
  fail('見積版復元タイマーの一致数が ' + delayMatches.length + ' 件です。変更していません。')
}

fs.copyFileSync(appPath, backupPath)

try {
  // 既存関数の構造は変えず、通常案件の読込完了後に保存版を反映するよう待機時間だけ修正。
  const updatedBlock = helperBlock
    .replace('  function openSavedEstimateVersion(entry, version) {', `  /* ${marker} */\n  function openSavedEstimateVersion(entry, version) {`)
    .replace(/\},\s*0\)/, '}, 180)')

  source = source.replace(helperBlock, updatedBlock)
  fs.writeFileSync(appPath, source, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: ②・③の保存内容を通常読込後に反映するV4を適用しました。')
  console.log('  - 関数の追加・移動はしていません')
  console.log('  - 既存の復元処理の待機時間だけ 0ms から 180ms へ変更')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
