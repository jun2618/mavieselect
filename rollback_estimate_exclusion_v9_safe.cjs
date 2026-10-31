const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-estimate-exclusion-v9'
const emergencyPath = appPath + '.before-rollback-estimate-exclusion-v9'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(backupPath)) fail('V9適用前のバックアップが見つかりません: ' + backupPath)
if (fs.existsSync(appPath)) fs.copyFileSync(appPath, emergencyPath)

try {
  fs.copyFileSync(backupPath, appPath)
  console.log('V9適用前のApp.jsxへ戻しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 見積除外V9を取り消し、タップできていた状態へ復旧しました。')
  console.log('BACKUP: ' + emergencyPath)
} catch (error) {
  console.error('復旧後のビルドに失敗したため、ロールバック直前へ戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(emergencyPath)) fs.copyFileSync(emergencyPath, appPath)
  process.exit(1)
}
