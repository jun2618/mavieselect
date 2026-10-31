const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-excel-simple-order-v5-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V5 */'

if (s.includes(marker)) {
  console.log('CF注文表V5はすでに適用済みです')
  process.exit(0)
}

let blockStart = -1
for (const oldMarker of [
  '  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V4 */',
  '  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V3 */',
  '  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V2 */',
  '  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V1 */',
]) {
  const pos = s.indexOf(oldMarker)
  if (pos !== -1) {
    blockStart = pos
    break
  }
}

if (blockStart === -1) {
  console.error('現在のCF Excel出力ブロックが見つかりません。変更しませんでした。')
  process.exit(1)
}

const softRowsStart = s.indexOf(
  '  const softRows = (entry.softRecords || []).map(record => {',
  blockStart
)

if (softRowsStart === -1) {
  console.error('softRowsの位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const v5Code = `  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V5 */
  const normalizedCfMaterialGroupsForExcel = normalizeCfMaterialGroups(
    entry.cfMaterialGroups || [],
    entry.cfRecords || []
  )

  const cfMaterialSummaryForExcel = getCfMaterialAllocationSummary(
    entry.cfRecords || [],
    normalizedCfMaterialGroupsForExcel
  )

  // Excelの注文表は、M-Crossで普段使う部屋順を優先します。
  // entry.roomsの登録順に左右されないため、台所が居間より先に来ることを防ぎます。
  const cfExcelRoomPriority = [
    '居間', 'LDK', '台所', '洋間', '和室', '階段', 'ホール',
    '玄関', '脱衣所', '洗面所', 'トイレ', '収納', '土間'
  ]

  const getCfRoomIndexForExcel = roomName => {
    const priorityIndex = cfExcelRoomPriority.indexOf(roomName)
    if (priorityIndex >= 0) return priorityIndex

    const projectRooms = Array.isArray(entry.rooms) ? entry.rooms : []
    const projectIndex = projectRooms.indexOf(roomName)
    return projectIndex >= 0
      ? cfExcelRoomPriority.length + projectIndex
      : Number.MAX_SAFE_INTEGER
  }

  const compareCfOrdersForExcel = (left, right) => {
    const sharedLength = Math.min(left.roomIndexes.length, right.roomIndexes.length)

    for (let index = 0; index < sharedLength; index += 1) {
      if (left.roomIndexes[index] !== right.roomIndexes[index]) {
        return left.roomIndexes[index] - right.roomIndexes[index]
      }
    }

    // 同じ先頭部屋なら、単独を先にしてから組み合わせを並べます。
    // 例: 居間 → 居間＋台所 → 居間＋玄関
    if (left.roomIndexes.length !== right.roomIndexes.length) {
      return left.roomIndexes.length - right.roomIndexes.length
    }

    if (left.usage !== right.usage) {
      return left.usage.localeCompare(right.usage, 'ja')
    }

    return left.orderLength - right.orderLength
  }

  const cfOrderItemsForExcel = [
    ...normalizedCfMaterialGroupsForExcel.map(group => {
      const pieces = getCfMaterialGroupPieces(group, entry.cfRecords || [])
      const roomNames = [
        ...new Set(pieces.map(piece => piece.room).filter(Boolean)),
      ].sort((left, right) =>
        getCfRoomIndexForExcel(left) - getCfRoomIndexForExcel(right)
      )

      const calculatedLength = getCfMaterialGroupLength(group, entry.cfRecords || [])
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
  ].sort(compareCfOrdersForExcel)

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

s = s.slice(0, blockStart) + v5Code + s.slice(softRowsStart)

const oldLines = [
  "  addWorksheet('CF', 'FF6E91E8', ['部屋名', 'メモ', '長さ', '本数', '数量'], cfRows)",
  "  addWorksheet('CF', 'FF6E91E8', ['使用箇所', '注文長(m)', '本数', '品番・商品名'], cfRows)",
  "  addWorksheet('CF', 'FF6E91E8', ['使用箇所', '長さ内訳', '本数', '注文長(m)', '品番・商品名'], cfRows)",
]
const newLine = "  addWorksheet('CF', 'FF6E91E8', ['使用箇所', '長さ内訳', '本数', '注文長(m)', '品番・商品名'], cfRows)"

let found = false
for (const line of oldLines) {
  if (s.includes(line)) {
    s = s.replace(line, newLine)
    found = true
    break
  }
}

if (!found && !s.includes(newLine)) {
  console.error('CFシート出力行が見つかりません。変更しませんでした。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('CF Excelシンプル注文表V5 OK')
console.log('並び順を 居間 → 居間＋台所 → 居間＋玄関 → 台所 の優先順へ修正しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
