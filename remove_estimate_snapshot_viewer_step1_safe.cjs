const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const viewerPath = path.join(root, 'src', 'estimateSnapshotViewer.js')
const cssPath = path.join(root, 'src', 'estimateSnapshotViewer.css')
const appBackup = appPath + '.before-remove-estimate-snapshot-viewer-step1'
const viewerBackup = viewerPath + '.before-remove-step1'
const cssBackup = cssPath + '.before-remove-step1'
const marker = 'M-CROSS_REMOVE_ESTIMATE_SNAPSHOT_VIEWER_STEP1_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) {
  console.log('SKIP: 閲覧専用画面の削除STEP1は適用済みです。')
  process.exit(0)
}

const importRegex = /^import \{ openEstimateSnapshotViewer \} from ['"]\.\/estimateSnapshotViewer['"].*$/m
const buttonRegex = /<button className="savedExplorerFile estimateVersionExplorerFile"[\s\S]*?<\/button>/g
const buttons = app.match(buttonRegex) || []
if (buttons.length !== 1) fail('保存済み見積ボタンの一致数が ' + buttons.length + ' 件です。変更していません。')
if (!importRegex.test(app)) fail('閲覧専用画面のimportが見つかりません。変更していません。')
if (!buttons[0].includes('openEstimateSnapshotViewer')) fail('保存済み見積ボタンに閲覧専用処理が見つかりません。')

fs.copyFileSync(appPath, appBackup)
if (fs.existsSync(viewerPath)) fs.copyFileSync(viewerPath, viewerBackup)
if (fs.existsSync(cssPath)) fs.copyFileSync(cssPath, cssBackup)

try {
  app = app.replace(importRegex, `// ${marker}`)

  const oldButton = buttons[0]
  const onClickRegex = /onClick=\{\(\) => openEstimateSnapshotViewer\(\{[\s\S]*?\}\)\}/
  if (!onClickRegex.test(oldButton)) throw new Error('閲覧専用onClickの範囲を特定できません。')

  // STEP1では不要な閲覧専用モーダルだけ外す。
  // 次のSTEPで、openSavedEntry(entry, version) に差し替えて独立編集版を実装する。
  const newButton = oldButton.replace(onClickRegex, 'onClick={() => openSavedEntry(entry)}')
  app = app.replace(oldButton, newButton)
  fs.writeFileSync(appPath, app, 'utf8')

  if (fs.existsSync(viewerPath)) fs.unlinkSync(viewerPath)
  if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath)

  console.log('閲覧専用画面を削除しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 不要な「保存済み見積・閲覧専用」画面を削除し、ビルド成功を確認しました。')
  console.log('注意: これはSTEP1です。無印・②・③の独立編集化は次のSTEPで実装します。')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(viewerBackup)) fs.copyFileSync(viewerBackup, viewerPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
