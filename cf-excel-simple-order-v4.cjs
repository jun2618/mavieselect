const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-excel-simple-order-v4-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V4 */'

if (s.includes(marker)) {
  console.log('CF注文表V4はすでに適用済みです')
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

let cfRowsStart = s.indexOf('  const cfRows = (entry.cfRecords || []).map(record => [')
for (const oldMarker of [
  '  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V1 */',
  '  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V2 */',
  '  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V3 */',
]) {
  const position = s.indexOf(oldMarker)
  if (position !== -1 && (cfRowsStart === -1 || position < cfRowsStart)) {
    cfRowsStart = position
  }
}

const softRowsStart = s.indexOf(
  '  const softRows = (entry.softRecords || []).map(record => {',
  cfRowsStart
)

if (cfRowsStart === -1 || softRowsStart === -1) {
  console.error('CF行作成処理の範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

const v4RowsCode = `  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V4 */
  const normalizedCfMaterialGroupsForExcel = normalizeCfMaterialGroups(
    entry.cfMaterialGroups || [],
    entry.cfRecords || []
  )

  const cfMaterialSummaryForExcel = getCfMaterialAllocationSummary(
    entry.cfRecords || [],
    normalizedCfMaterialGroupsForExcel
  )

  const cfRoomOrderForExcel = Array.isArray(entry.rooms)
    ? entry.rooms
    : []

  const getCfRoomIndexForExcel = roomName => {
    const index = cfRoomOrderForExcel.indexOf(roomName)
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER
  }

  const compareCfRoomIndexesForExcel = (left, right) => {
    const sharedLength = Math.min(
      left.roomIndexes.length,
      right.roomIndexes.length
    )

    for (let index = 0; index < sharedLength; index += 1) {
      if (left.roomIndexes[index] !== right.roomIndexes[index]) {
        return left.roomIndexes[index] - right.roomIndexes[index]
      }
    }

    // 居間 → 居間＋台所 → 居間＋玄関 のように、単独部屋を先にします。
    if (left.roomIndexes.length !== right.roomIndexes.length) {
      return left.roomIndexes.length - right.roomIndexes.length
    }

    return left.orderLength - right.orderLength
  }

  const cfOrderItemsForExcel = [
    ...normalizedCfMaterialGroupsForExcel.map(group => {
      const pieces = getCfMaterialGroupPieces(
        group,
        entry.cfRecords || []
      )
      const roomNames = [
        ...new Set(pieces.map(piece => piece.room).filter(Boolean)),
      ].sort((left, right) =>
        getCfRoomIndexForExcel(left) - getCfRoomIndexForExcel(right)
      )
      const calculatedLength = getCfMaterialGroupLength(
        group,
        entry.cfRecords || []
      )
      const numericOrderLength = Number(group.orderLength)
      const orderLength =
        Number.isFinite(numericOrderLength) && numericOrderLength > 0
          ? numericOrderLength
          : calculatedLength

      return {
        usage: roomNames.join('＋') || '使用箇所未設定',
        roomIndexes: roomNames.map(getCfRoomIndexForExcel),
        breakdown: pieces
          .map(piece => formatQuantity(piece.pieceLength) + 'm')
          .join('＋'),
        orderLength: Number(formatQuantity(orderLength)),
        productCode: group.productCode || '',
      }
    }),
    ...cfMaterialSummaryForExcel.unallocatedPieces.map(piece => ({
      usage: piece.room || '使用箇所未設定',
      roomIndexes: [getCfRoomIndexForExcel(piece.room || '')],
      breakdown: formatQuantity(piece.pieceLength) + 'm',
      orderLength: Number(formatQuantity(piece.pieceLength)),
      productCode: '',
    })),
  ].sort(compareCfRoomIndexesForExcel)

  const combinedCfOrdersForExcel = []

  cfOrderItemsForExcel.forEach(item => {
    const existing = combinedCfOrdersForExcel.find(row =>
      row.usage === item.usage
      && row.breakdown === item.breakdown
      && row.orderLength === item.orderLength
      && row.productCode === item.productCode
    )

    if (existing) {
      existing.count += 1
      return
    }

    combinedCfOrdersForExcel.push({ ...item, count: 1 })
  })

  const cfRows = combinedCfOrdersForExcel.map(item => [
    item.usage,
    item.breakdown,
    item.count,
    item.orderLength,
    item.productCode,
  ])
`

s = s.slice(0, cfRowsStart) + v4RowsCode + s.slice(softRowsStart)

const worksheetPatterns = [
  "  addWorksheet('CF', 'FF6E91E8', ['部屋名', 'メモ', '長さ', '本数', '数量'], cfRows)",
  "  addWorksheet('CF', 'FF6E91E8', ['使用箇所', '注文長(m)', '本数', '品番・商品名'], cfRows)",
]
const newWorksheetLine =
  "  addWorksheet('CF', 'FF6E91E8', ['使用箇所', '長さ内訳', '本数', '注文長(m)', '品番・商品名'], cfRows)"

let worksheetReplaced = false
for (const pattern of worksheetPatterns) {
  if (s.includes(pattern)) {
    s = s.replace(pattern, newWorksheetLine)
    worksheetReplaced = true
    break
  }
}

if (!worksheetReplaced && !s.includes(newWorksheetLine)) {
  console.error('CFシート出力行が見つかりません。変更しませんでした。')
  process.exit(1)
}

const cfWorksheetPos = s.indexOf(newWorksheetLine)
const softWorksheetLine =
  "  addWorksheet('ソフト巾木', 'FF63BEA1', ['部屋名', '枚数', '数量'], softRows)"
const softWorksheetPos = s.indexOf(softWorksheetLine, cfWorksheetPos)

if (cfWorksheetPos === -1 || softWorksheetPos === -1) {
  console.error('CFまたはソフト巾木の出力位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const betweenStart = cfWorksheetPos + newWorksheetLine.length
const between = s.slice(betweenStart, softWorksheetPos)

if (between.trim()) {
  const knownOldExport =
    between.includes('M-CROSS_CF_MATERIAL_EXCEL_V1') ||
    between.includes('M-CROSS_CF_MATERIAL_EXCEL_D4')

  if (!knownOldExport) {
    console.error('CFとソフト巾木の間に未確認コードがあります。変更しませんでした。')
    process.exit(1)
  }

  s = s.slice(0, betweenStart) + '\n' + s.slice(softWorksheetPos)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('CF Excelシンプル注文表V4 OK')
console.log('使用箇所・長さ内訳・本数・注文長の形式へ変更しました')
console.log('並び順は 居間 → 居間＋台所 → 居間＋玄関 → 台所 の形式です')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
