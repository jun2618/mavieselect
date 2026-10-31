const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-additional-work-exclusion-v10'
const marker = 'M-CROSS_ADDITIONAL_WORK_EXCLUSION_V10_MINIMAL_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')

if (source.includes(marker)) {
  console.log('SKIP: その他工事除外V10は適用済みです。')
  process.exit(0)
}

// 現在の実コード。タップ処理やEstimateRowEditorには一切触れない。
const mapStart = "                      rows: additionalWorks.map((item, additionalWorkIndex) => ({"
const mapEnd = "                      })),"

const startIndex = source.indexOf(mapStart)
if (startIndex < 0) fail('内装工事以外の行生成開始位置が見つかりません。')
const endIndex = source.indexOf(mapEnd, startIndex)
if (endIndex < 0) fail('内装工事以外の行生成終了位置が見つかりません。')

const blockEnd = endIndex + mapEnd.length
const originalBlock = source.slice(startIndex, blockEnd)

// 同じ処理ブロックが一意か確認。
if (source.indexOf(mapStart, startIndex + mapStart.length) >= 0) {
  fail('内装工事以外の行生成が複数見つかりました。変更していません。')
}

fs.copyFileSync(appPath, backupPath)

try {
  let newBlock = originalBlock

  // 各その他工事に、編集画面が使用しているものと同じ除外キーを付与。
  const objectStart = "                      rows: additionalWorks.map((item, additionalWorkIndex) => ({"
  const exclusionKey = "\n                        exclusionKey: 'additionalWork:' + (item.id || additionalWorkIndex),"
  if (!newBlock.includes('exclusionKey:')) {
    newBlock = newBlock.replace(objectStart, objectStart + exclusionKey)
  }

  // mapしたその他工事だけを、除外フラグで絞る。
  // estimateRows本体、タップ処理、Editor JSXには触れない。
  newBlock = newBlock.replace(
    /\}\)\),\s*$/,
    `})).filter(row => !estimateEdits[row.exclusionKey]?.excluded), // ${marker}`
  )

  if (!newBlock.includes('.filter(row => !estimateEdits[row.exclusionKey]?.excluded)')) {
    throw new Error('その他工事への除外フィルター追加に失敗しました。')
  }

  source = source.slice(0, startIndex) + newBlock + source.slice(blockEnd)
  fs.writeFileSync(appPath, source, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 内装工事以外も見積から外せるV10を適用し、ビルド成功を確認しました。')
  console.log('  - 見積行のタップ処理は変更していません')
  console.log('  - EstimateRowEditorは変更していません')
  console.log('  - その他工事の元データは削除しません')
  console.log('  - 今回は除外動作だけを修正しています')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
