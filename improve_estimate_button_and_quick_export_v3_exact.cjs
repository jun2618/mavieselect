const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-estimate-button-quick-export-v3'
const cssBackup = cssPath + '.before-estimate-button-quick-export-v3'
const marker = 'M-CROSS_ESTIMATE_BUTTON_QUICK_EXPORT_V3_EXACT'

function die(msg){ console.error('ERROR: ' + msg); process.exit(1) }
if(!fs.existsSync(appPath)) die('src/App.jsx が見つかりません。')
if(!fs.existsSync(cssPath)) die('src/App.css が見つかりません。')
let app=fs.readFileSync(appPath,'utf8')
let css=fs.readFileSync(cssPath,'utf8')
if(app.includes(marker)){ console.log('SKIP: 見積導線改善V3は適用済みです。'); process.exit(0) }

const titleOld="                ? '概算金額'"
const toggleOld="                {showEstimate ? '← 採寸画面へ戻る' : '💰 概算金額'}"
const exportLabel='                📊 採寸データ出力'
if(!app.includes(titleOld)) die('見積画面タイトルが見つかりません。変更していません。')
if(!app.includes(toggleOld)) die('概算金額ボタンが見つかりません。変更していません。')

const labelPos=app.indexOf(exportLabel)
if(labelPos<0) die('採寸データ出力ラベルが見つかりません。変更していません。')
const closePos=app.indexOf('              </button>',labelPos)
if(closePos<0) die('採寸データ出力ボタンの終了位置が見つかりません。変更していません。')
const insertPos=closePos+'              </button>'.length

fs.copyFileSync(appPath,appBackup)
fs.copyFileSync(cssPath,cssBackup)
try{
  app=app.replace(titleOld,"                ? '見積内容'")
  app=app.replace(toggleOld,"                {showEstimate ? '← 採寸画面へ戻る' : '💰 見積内容を確認・編集'}")

  const quick=`\n              {/* ${marker} */}\n              <button\n                className="secondaryButton estimateQuickExportButton"\n                type="button"\n                onClick={() => {\n                  const factor = Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)\n                  const rawRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)\n                  const rowsForExport = applyEstimateEdits(rawRows, estimateEdits)\n                  downloadEstimateExcel({\n                    company,\n                    propertyName: selectedProperty?.name || '',\n                    address: selectedProperty?.address || '',\n                    unit,\n                  }, rowsForExport, estimateCopyFormat, additionalWorks)\n                }}\n              >\n                📄 見積書を出力\n              </button>`
  app=app.slice(0,insertPos)+quick+app.slice(insertPos)
  css += `\n/* ${marker} */\n.estimateQuickExportButton{font-weight:850!important;border:2px solid rgba(106,79,214,.45)!important}\n.theme-dark .estimateQuickExportButton,.theme-cyber .estimateQuickExportButton,.theme-luxury .estimateQuickExportButton,.theme-retro .estimateQuickExportButton,.theme-galaxy .estimateQuickExportButton{border-color:#bda6ff!important}\n`

  fs.writeFileSync(appPath,app,'utf8')
  fs.writeFileSync(cssPath,css,'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true})
  console.log('OK: 見積導線改善V3を適用し、ビルド成功を確認しました。')
  console.log('  - 見積画面タイトル: 見積内容')
  console.log('  - ボタン: 見積内容を確認・編集')
  console.log('  - 採寸データ出力の直下: 見積書を出力')
  console.log('BACKUP: '+appBackup)
}catch(e){
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(e.message||String(e))
  if(fs.existsSync(appBackup)) fs.copyFileSync(appBackup,appPath)
  if(fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup,cssPath)
  process.exit(1)
}
