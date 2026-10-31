const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-initial-estimate-unmarked-v1'
const marker = 'M-CROSS_INITIAL_ESTIMATE_UNMARKED_V1_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')

if (source.includes(marker)) {
  console.log('SKIP: 初回見積を無印で開く修正V1は適用済みです。')
  process.exit(0)
}

// 現在の通常案件画面だけを対象にする。
// 見積履歴の最大番号から currentEstimateVersion=2 を計算していても、
// 通常案件（最初の見積）の見出しには版番号を付けない。
const headingOld = `<h2>{selectedProperty?.name} {unit}号室{estimateVersionMark(currentEstimateVersion)}</h2>`
const headingNew = `<h2>{selectedProperty?.name} {unit}号室{/* ${marker} 初回見積は無印 */}</h2>`

if (!source.includes(headingOld)) {
  fail('通常見積画面の版番号付き見出しが見つかりません。変更していません。')
}

fs.copyFileSync(appPath, backupPath)

try {
  source = source.replace(headingOld, headingNew)

  // 通常画面から直接出す見積書も、最初の見積は無印にする。
  // 過去版の個別出力（②・③）は別処理なので変更しない。
  const directOutputOld = `propertyName: (selectedProperty?.name || '') + estimateVersionMark(currentEstimateVersion),`
  if (source.includes(directOutputOld)) {
    source = source.replace(
      directOutputOld,
      `propertyName: selectedProperty?.name || '', // ${marker}: 通常の初回見積は無印`
    )
  }

  fs.writeFileSync(appPath, source, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 最初の見積を開いたときは無印で表示するよう修正しました。')
  console.log('  - 通常案件画面: 無印')
  console.log('  - 通常画面からの見積書出力名: 無印')
  console.log('  - 保存済み②・③の表示データには触れていません')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
