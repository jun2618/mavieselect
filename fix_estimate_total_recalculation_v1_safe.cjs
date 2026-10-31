const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-estimate-total-recalculation-v1'
const marker = 'M-CROSS_ESTIMATE_TOTAL_RECALCULATION_V1_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 見積合計再計算V1は適用済みです。')
  process.exit(0)
}

const oldBlock = `              const additionalWorkTotal = additionalWorks.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)
              const totalAmount = estimateRows.reduce((sum, row) => sum + row.amount, 0) + additionalWorkTotal`

const count = source.split(oldBlock).length - 1
if (count !== 1) fail('合計計算ブロックの一致数が ' + count + ' 件です。変更していません。')

fs.copyFileSync(appPath, backupPath)

try {
  const newBlock = `              /* ${marker} */
              const visibleAdditionalWorks = additionalWorks.filter((item, index) => {
                const key = 'additionalWork:' + (item.id || index)
                return !estimateEdits[key]?.excluded
              })
              const additionalWorkTotal = visibleAdditionalWorks.reduce(
                (sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
                0,
              )
              const totalAmount = estimateRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) + additionalWorkTotal`

  source = source.replace(oldBlock, newBlock)

  // 「内装工事以外」の表示も合計と同じ対象に統一する。
  const mapAnchor = `                      rows: additionalWorks.map((item, additionalWorkIndex) => ({`
  if (source.includes(mapAnchor)) {
    source = source.replace(mapAnchor, `                      rows: visibleAdditionalWorks.map((item, additionalWorkIndex) => ({`)
  }

  // 空表示判定も、除外後のその他工事件数に合わせる。
  source = source.replace(
    `                  {estimateRows.length === 0 && additionalWorks.length === 0 ? (`,
    `                  {estimateRows.length === 0 && visibleAdditionalWorks.length === 0 ? (`,
  )

  fs.writeFileSync(appPath, source, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 見積から外した項目を除いて合計金額を再計算するV1を適用しました。')
  console.log('  - クロス・CF等: estimateRowsの除外後金額を使用')
  console.log('  - 内装工事以外: 除外後の項目だけを合計')
  console.log('  - 元の採寸・その他工事データは削除しません')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
