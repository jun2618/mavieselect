const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-estimate-button-quick-export-v1'
const cssBackup = cssPath + '.before-estimate-button-quick-export-v1'
const marker = 'M-CROSS_ESTIMATE_BUTTON_QUICK_EXPORT_V1_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (!fs.existsSync(cssPath)) fail('src/App.css が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 見積導線改善V1は適用済みです。'); process.exit(0) }

const estimateButtonRegex = /<button\s+className="[^\"]*"\s+type="button"\s+onClick=\{\(\)\s*=>\s*setShowEstimate\(true\)\}\s*>[\s\S]*?概算金額[\s\S]*?<\/button>/
const matches = app.match(estimateButtonRegex)
if (!matches) fail('「概算金額」ボタンが見つかりません。変更していません。')

const exportButtonNeedle = `              <button
                className="secondaryButton"
                type="button"
                onClick={() => downloadExcel({`
const exportButtonEndNeedle = `              </button>`
const exportStart = app.indexOf(exportButtonNeedle)
if (exportStart < 0) fail('採寸データ出力ボタンが見つかりません。変更していません。')
const exportEnd = app.indexOf(exportButtonEndNeedle, exportStart)
if (exportEnd < 0) fail('採寸データ出力ボタンの終了位置が見つかりません。変更していません。')
const insertPos = exportEnd + exportButtonEndNeedle.length

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(cssPath, cssBackup)
try {
  // 概算金額 -> 見積内容を確認・編集
  const oldEstimateButton = matches[0]
  const classMatch = oldEstimateButton.match(/className="([^"]*)"/)
  const className = classMatch ? classMatch[1] : 'secondaryButton'
  const newEstimateButton = `/* ${marker} */
              <button className="${className} estimateReviewButton" type="button" onClick={() => setShowEstimate(true)}>
                💰 見積内容を確認・編集
              </button>`
  app = app.replace(oldEstimateButton, newEstimateButton)

  // 採寸データ出力の直下に見積書出力ボタンを追加。
  const quickExport = `
              <button
                className="secondaryButton estimateQuickExportButton"
                type="button"
                onClick={() => {
                  // 既存の概算画面を一度表示し、同じ見積生成ロジックと出力処理を利用する。
                  setShowEstimate(true)
                  window.setTimeout(() => {
                    const button = [...document.querySelectorAll('button')].find(item => item.textContent?.includes('見積用Excel出力'))
                    if (button) button.click()
                    else window.alert('見積内容を確認・編集を開いてから「見積用Excel出力」を押してください。')
                  }, 0)
                }}
              >
                📄 見積書を出力
              </button>`
  app = app.slice(0, insertPos) + quickExport + app.slice(insertPos)

  // 概算画面のタイトルだけ明確化。結果ラベルの「概算合計」は残す。
  app = app.replace("? '概算金額'", "? '見積内容'")

  css += `
/* ${marker} */
.estimateReviewButton{font-weight:900!important}.estimateQuickExportButton{border:2px solid rgba(106,79,214,.45)!important;font-weight:850!important}.theme-dark .estimateQuickExportButton,.theme-cyber .estimateQuickExportButton,.theme-luxury .estimateQuickExportButton,.theme-retro .estimateQuickExportButton,.theme-galaxy .estimateQuickExportButton{border-color:#bda6ff!important}
`
  fs.writeFileSync(appPath, app, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 「見積内容を確認・編集」と「見積書を出力」を追加し、ビルド成功を確認しました。')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
