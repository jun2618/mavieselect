const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backup = appPath + '.before-simplify-estimate-text-v1'
const marker = 'M-CROSS_SIMPLIFY_ESTIMATE_TEXT_V1_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 見積画面テキスト整理V1は適用済みです。'); process.exit(0) }

const intro = `                  <p className="estimateIntro">退去時にお客様へ提示するための概算です。正式見積ではありません。</p>`
const total = `                    <span>概算合計</span>`
if (!app.includes(intro)) fail('削除対象の説明文が見つかりません。変更していません。')
if (!app.includes(total)) fail('「概算合計」が見つかりません。変更していません。')

fs.copyFileSync(appPath, backup)
try {
  app = app.replace(intro, `                  {/* ${marker} */}`)
  app = app.replace(total, `                    <span>合計金額</span>`)
  fs.writeFileSync(appPath, app, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 説明文を削除し、「概算合計」を「合計金額」へ変更しました。')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  process.exit(1)
}
