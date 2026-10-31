const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backup = appPath + '.before-rename-final-review-v2'
const marker = 'M-CROSS_RENAME_FINAL_REVIEW_TO_OTHER_WORK_V2_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')

if (app.includes(marker)) {
  console.log('SKIP: その他工事への名称変更V2は適用済みです。')
  process.exit(0)
}

const oldTab = `                <button type="button" className={activePage === 'review' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('review')}>✅ 最終確認</button>`
const newTab = `                {/* ${marker} */}
                <button type="button" className={activePage === 'review' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('review')}>🔧 その他工事</button>`
const oldTitle = `: activePage === 'floorTrim' ? '床見切り' : '最終確認'}`
const newTitle = `: activePage === 'floorTrim' ? '床見切り' : 'その他工事'}`

if (!app.includes(oldTab)) fail('現在の「✅ 最終確認」タブが見つかりません。変更していません。')
if (!app.includes(oldTitle)) fail('現在の「最終確認」画面タイトルが見つかりません。変更していません。')

fs.copyFileSync(appPath, backup)

try {
  app = app.replace(oldTab, newTab)
  app = app.replace(oldTitle, newTitle)
  fs.writeFileSync(appPath, app, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 「最終確認」を「🔧 その他工事」へ変更し、ビルド成功を確認しました。')
  console.log('  - activePage=review の内部ロジックは変更していません')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  process.exit(1)
}
