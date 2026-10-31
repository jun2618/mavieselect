const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-additional-work-restore-v8'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(backupPath)) fail('V8適用前のバックアップが見つかりません: ' + backupPath)

const emergencyBackup = appPath + '.before-rollback-v8'
if (fs.existsSync(appPath)) fs.copyFileSync(appPath, emergencyBackup)

try {
  fs.copyFileSync(backupPath, appPath)
  console.log('V8適用前のApp.jsxへ戻しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: V8を取り消し、項目タップが動いていた状態へ復旧しました。')
  console.log('BACKUP: ' + emergencyBackup)
} catch (error) {
  console.error('復旧後のビルドに失敗したため、ロールバック直前のApp.jsxへ戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(emergencyBackup)) fs.copyFileSync(emergencyBackup, appPath)
  process.exit(1)
}
