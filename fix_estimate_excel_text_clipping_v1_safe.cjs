const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-estimate-excel-text-clipping-v1'
const marker = 'M-CROSS_ESTIMATE_EXCEL_TEXT_CLIPPING_V1_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 見積Excel文字切れ修正V1は適用済みです。')
  process.exit(0)
}

const fnStart = source.indexOf('async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {')
const fnEnd = source.indexOf('\nasync function downloadEstimateExcelLegacy', fnStart)
if (fnStart < 0 || fnEnd < 0) fail('現在使用中の downloadEstimateExcel 関数を特定できません。')

let block = source.slice(fnStart, fnEnd)
const propertyLine = "    ws.cell('D13').value(entry?.propertyName || '')"
const addressLine = "    ws.cell('D14').value(entry?.address || '')"
const clearLoop = "    for (let rowNumber = 23; rowNumber <= 54; rowNumber += 1) {"

for (const [name, anchor] of [['物件名',propertyLine],['住所',addressLine],['明細ループ',clearLoop]]) {
  const count = block.split(anchor).length - 1
  if (count !== 1) fail(name + ' の一致数が ' + count + ' 件です。変更していません。')
}

fs.copyFileSync(appPath, backupPath)
try {
  block = block.replace(
    propertyLine,
    `${propertyLine}\n    ws.cell('D13').style('shrinkToFit', true) /* ${marker} */`
  )
  block = block.replace(
    addressLine,
    `${addressLine}\n    ws.cell('D14').style('shrinkToFit', true)`
  )
  block = block.replace(
    clearLoop,
    `    // 長い名称はテンプレートの列幅と行高を変えず、セル内で縮小して全文表示する。\n    for (let rowNumber = 23; rowNumber <= 54; rowNumber += 1) {\n      for (const column of ['C', 'D', 'E', 'F']) {\n        ws.cell(column + rowNumber).style('shrinkToFit', true)\n      }`
  )

  source = source.slice(0, fnStart) + block + source.slice(fnEnd)
  fs.writeFileSync(appPath, source, 'utf8')

  console.log('見積Excelの文字切れ修正を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 見積Excel文字切れ修正V1を適用しました。')
  console.log('  - D13 物件名: shrinkToFit')
  console.log('  - D14 住所: shrinkToFit')
  console.log('  - C:F 明細名称: shrinkToFit')
  console.log('  - 列幅・行高・罫線・金額列は変更なし')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルド失敗のため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
