const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-individual-estimate-restore-v11'
const emergencyPath = appPath + '.before-rollback-individual-restore-v11'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(backupPath)) fail('V11適用前バックアップが見つかりません: ' + backupPath)
if (fs.existsSync(appPath)) fs.copyFileSync(appPath, emergencyPath)

try {
  fs.copyFileSync(backupPath, appPath)
  console.log('V11適用前のApp.jsxへ戻しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: V11を取り消し、タップできていたV10時点へ戻しました。')
  console.log('V10の「内装工事以外を見積から外す」は残ります。')
  console.log('BACKUP: ' + emergencyPath)
} catch (error) {
  console.error('復旧後のビルドに失敗したため、ロールバック直前へ戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(emergencyPath)) fs.copyFileSync(emergencyPath, appPath)
  process.exit(1)
}
