const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-estimate-button-quick-export-v2'
const cssBackup = cssPath + '.before-estimate-button-quick-export-v2'
const marker = 'M-CROSS_ESTIMATE_BUTTON_QUICK_EXPORT_V2_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (!fs.existsSync(cssPath)) fail('src/App.css が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 見積導線改善V2は適用済みです。'); process.exit(0) }

const oldEstimate = `{showEstimate ? '← 採寸画面へ戻る' : '💰 概算金額'}`
const oldTitle = `? '概算金額'`
const dataExportEnd = `                📊 採寸データ出力
              </button>`

if (!app.includes(oldEstimate)) fail('現在の「概算金額」ボタンが見つかりません。変更していません。')
if (!app.includes(oldTitle)) fail('見積画面タイトルが見つかりません。変更していません。')
if (!app.includes(dataExportEnd)) fail('「採寸データ出力」ボタンが見つかりません。変更していません。')

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(cssPath, cssBackup)

try {
  app = app.replace(oldEstimate, `{showEstimate ? '← 採寸画面へ戻る' : '💰 見積内容を確認・編集'}`)
  app = app.replace(oldTitle, `? '見積内容'`)

  const quickExport = `${dataExportEnd}
              {/* ${marker} */}
              <button
                className="secondaryButton estimateQuickExportButton"
                type="button"
                onClick={() => {
                  const factor = Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)
                  const rawRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)
                  const estimateRowsForExport = applyEstimateEdits(rawRows, estimateEdits)
                  downloadEstimateExcel({
                    company,
                    propertyName: selectedProperty?.name || '',
                    address: selectedProperty?.address || '',
                    unit,
                  }, estimateRowsForExport, estimateCopyFormat, additionalWorks)
                }}
              >
                📄 見積書を出力
              </button>`
  app = app.replace(dataExportEnd, quickExport)

  css += `
/* ${marker} */
.estimateQuickExportButton{font-weight:850!important;border:2px solid rgba(106,79,214,.45)!important}
.theme-dark .estimateQuickExportButton,.theme-cyber .estimateQuickExportButton,.theme-luxury .estimateQuickExportButton,.theme-retro .estimateQuickExportButton,.theme-galaxy .estimateQuickExportButton{border-color:#bda6ff!important}
`

  fs.writeFileSync(appPath, app, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 見積導線改善V2を適用し、ビルド成功を確認しました。')
  console.log('  - 概算金額 -> 見積内容を確認・編集')
  console.log('  - 採寸データ出力の直下に「見積書を出力」')
  console.log('  - 見積画面タイトル -> 見積内容')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
