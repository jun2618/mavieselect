const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-excel-simple-order-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')

const marker = '/* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V1 */'

if (s.includes(marker)) {
  console.log('シンプルなCF注文表はすでに適用済みです')
  process.exit(0)
}

for (const required of [
  '/* M-CROSS_CF_MATERIAL_STEP4D1 */',
  '/* M-CROSS_CF_MATERIAL_STEP4D2 */',
]) {
  if (!s.includes(required)) {
    console.error(required + ' が見つかりません。変更しませんでした。')
    process.exit(1)
  }
}

const cfRowsStart = s.indexOf('  const cfRows = (entry.cfRecords || []).map(record => [')
const softRowsStart = s.indexOf('  const softRows = (entry.softRecords || []).map(record => {', cfRowsStart)

if (cfRowsStart === -1 || softRowsStart === -1) {
  console.error('現在のCF行作成処理が見つかりません。変更しませんでした。')
  process.exit(1)
}

const simpleCfRowsCode = `  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V1 */
  const normalizedCfMaterialGroupsForExcel = normalizeCfMaterialGroups(
    entry.cfMaterialGroups || [],
    entry.cfRecords || []
  )

  const cfMaterialSummaryForExcel = getCfMaterialAllocationSummary(
    entry.cfRecords || [],
    normalizedCfMaterialGroupsForExcel
  )

  const cfRows = [
    ...normalizedCfMaterialGroupsForExcel.map(group => {
      const pieces = getCfMaterialGroupPieces(group, entry.cfRecords || [])
      const roomNames = [
        ...new Set(pieces.map(piece => piece.room).filter(Boolean)),
      ]
      const calculatedLength = getCfMaterialGroupLength(
        group,
        entry.cfRecords || []
      )
      const numericOrderLength = Number(group.orderLength)
      const orderLength =
        Number.isFinite(numericOrderLength) && numericOrderLength > 0
          ? numericOrderLength
          : calculatedLength

      return [
        roomNames.join('＋') || '使用箇所未設定',
        Number(formatQuantity(orderLength)),
        1,
        group.productCode || '',
      ]
    }),
    ...cfMaterialSummaryForExcel.unallocatedPieces.map(piece => [
      '未割当：' + (piece.room || '部屋未設定'),
      Number(formatQuantity(piece.pieceLength)),
      1,
      '',
    ]),
  ]
`

s = s.slice(0, cfRowsStart) + simpleCfRowsCode + s.slice(softRowsStart)

const oldCfWorksheet = "  addWorksheet('CF', 'FF6E91E8', ['部屋名', 'メモ', '長さ', '本数', '数量'], cfRows)"
const newCfWorksheet = "  addWorksheet('CF', 'FF6E91E8', ['使用箇所', '注文長(m)', '本数', '品番・商品名'], cfRows)"

if (!s.includes(oldCfWorksheet)) {
  console.error('CFシート出力行が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(oldCfWorksheet, newCfWorksheet)

// 以前の「CF材料発注」別シート処理があれば削除し、CFシート1枚に統合します。
const cfWorksheetPos = s.indexOf(newCfWorksheet)
const softWorksheetLine = "  addWorksheet('ソフト巾木', 'FF63BEA1', ['部屋名', '枚数', '数量'], softRows)"
const softWorksheetPos = s.indexOf(softWorksheetLine, cfWorksheetPos)

if (cfWorksheetPos === -1 || softWorksheetPos === -1) {
  console.error('CFまたはソフト巾木のシート出力位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const betweenStart = cfWorksheetPos + newCfWorksheet.length
const between = s.slice(betweenStart, softWorksheetPos)

if (between.trim()) {
  const knownMaterialExport =
    between.includes('M-CROSS_CF_MATERIAL_EXCEL_V1') ||
    between.includes('M-CROSS_CF_MATERIAL_EXCEL_D4')

  if (!knownMaterialExport) {
    console.error('CFとソフト巾木の間に未確認コードがあります。変更しませんでした。')
    process.exit(1)
  }

  s = s.slice(0, betweenStart) + '\n' + s.slice(softWorksheetPos)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('CF Excelシンプル注文表 OK')
console.log('CF採寸シートを、使用箇所・注文長・本数・品番の形式へ置き換えました')
console.log('未割当のCFは「未割当：部屋名」として同じシートへ表示します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
