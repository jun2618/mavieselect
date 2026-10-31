const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-estimate-split-combined-final-v3'
const marker = 'M-CROSS_ESTIMATE_SPLIT_COMBINED_FINAL_V3_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 最終仕様V3は適用済みです。')
  process.exit(0)
}

const fnStart = source.indexOf('async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {')
const fnEnd = source.indexOf('\nasync function downloadEstimateExcelLegacy', fnStart)
if (fnStart < 0 || fnEnd < 0) fail('使用中の downloadEstimateExcel 関数を特定できません。')

let block = source.slice(fnStart, fnEnd)
const blockStartMarker = '      /* M-CROSS_ESTIMATE_NAME_FULL_WIDTH_V1_SAFE */'
const quantityLine = "      ws.cell('H' + rowNumber).value(cellValue(row?.quantity))"
const start = block.indexOf(blockStartMarker)
const end = block.indexOf(quantityLine, start)
if (start < 0 || end < 0) fail('現在の名称出力ブロックを特定できません。変更していません。')
if (block.indexOf(blockStartMarker, start + 1) >= 0) fail('名称出力ブロックが複数あります。変更していません。')

fs.copyFileSync(appPath, backupPath)
try {
  const finalBlock = `      /* ${marker} */
      if (format === 'split') {
        // 分ける: C=項目1、D=項目2、E=項目3、F=項目4+メモ、G=空欄。
        const splitRange = ws.range('C' + rowNumber + ':G' + rowNumber)
        if (splitRange.merged()) splitRange.merged(false)

        const splitParts = [0, 1, 2, 3].map(partIndex => String(parts[partIndex] || '').trim())
        const specificationText = [splitParts[3], memo].filter(Boolean).join(' ')

        ws.cell('C' + rowNumber).value(splitParts[0])
        ws.cell('D' + rowNumber).value(splitParts[1])
        ws.cell('E' + rowNumber).value(splitParts[2])
        ws.cell('F' + rowNumber).value(specificationText)
        ws.cell('G' + rowNumber).value('')
      } else {
        // まとめる: C:Gを結合し、項目1〜4とメモを一続きで表示する。
        const combinedRange = ws.range('C' + rowNumber + ':G' + rowNumber)
        if (!combinedRange.merged()) combinedRange.merged(true)

        const nameText = [...parts.filter(Boolean), memo].filter(Boolean).join(' ')
        ws.cell('C' + rowNumber).value(nameText)
      }
`

  block = block.slice(0, start) + finalBlock + block.slice(end)
  source = source.slice(0, fnStart) + block + source.slice(fnEnd)
  fs.writeFileSync(appPath, source, 'utf8')

  console.log('社員見本に合わせた最終仕様を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 見積Excelの分ける/まとめる最終仕様V3を適用しました。')
  console.log('  分ける: C=項目1 D=項目2 E=項目3 F=項目4+メモ G=空欄')
  console.log('  まとめる: C:G結合、項目1〜4+メモ')
  console.log('  共通: H=数量 I=単位 J=単価 K=金額')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルド失敗のため自動復旧します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
