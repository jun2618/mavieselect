const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-excel-simple-order-v2-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V2 */'

if (s.includes(marker)) {
  console.log('CF注文表V2はすでに適用済みです')
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

// CF行作成部分を、現在の形式に関係なくsoftRows直前まで置き換えます。
let cfRowsStart = s.indexOf('  const cfRows = (entry.cfRecords || []).map(record => [')
if (cfRowsStart === -1) {
  cfRowsStart = s.indexOf('  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V1 */')
}

const softRowsStart = s.indexOf(
  '  const softRows = (entry.softRecords || []).map(record => {',
  cfRowsStart
)

if (cfRowsStart === -1 || softRowsStart === -1) {
  console.error('CF行作成処理の範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

const v2RowsCode = `  /* M-CROSS_CF_EXCEL_SIMPLE_ORDER_V2 */
  const normalizedCfMaterialGroupsForExcel = normalizeCfMaterialGroups(
    entry.cfMaterialGroups || [],
    entry.cfRecords || []
  )

  const cfRoomOrderForExcel = Array.isArray(entry.rooms)
    ? entry.rooms
    : []

  const getCfRoomIndexForExcel = roomName => {
    const index = cfRoomOrderForExcel.indexOf(roomName)
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER
  }

  const cfOrderItemsForExcel = normalizedCfMaterialGroupsForExcel
    .map(group => {
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
        orderLength: Number(formatQuantity(orderLength)),
        productCode: group.productCode || '',
      }
    })
    .sort((left, right) => {
      const maxLength = Math.max(
        left.roomIndexes.length,
        right.roomIndexes.length
      )

      for (let index = 0; index < maxLength; index += 1) {
        const leftIndex = left.roomIndexes[index] ?? Number.MAX_SAFE_INTEGER
        const rightIndex = right.roomIndexes[index] ?? Number.MAX_SAFE_INTEGER
        if (leftIndex !== rightIndex) return leftIndex - rightIndex
      }

      if (left.roomIndexes.length !== right.roomIndexes.length) {
        return left.roomIndexes.length - right.roomIndexes.length
      }

      return left.orderLength - right.orderLength
    })

  const combinedCfOrdersForExcel = []

  cfOrderItemsForExcel.forEach(item => {
    const existing = combinedCfOrdersForExcel.find(row =>
      row.usage === item.usage
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
    item.orderLength,
    item.count,
    item.productCode,
  ])
`

s = s.slice(0, cfRowsStart) + v2RowsCode + s.slice(softRowsStart)

const worksheetPatterns = [
  "  addWorksheet('CF', 'FF6E91E8', ['部屋名', 'メモ', '長さ', '本数', '数量'], cfRows)",
  "  addWorksheet('CF', 'FF6E91E8', ['使用箇所', '注文長(m)', '本数', '品番・商品名'], cfRows)",
]
const newWorksheetLine =
  "  addWorksheet('CF', 'FF6E91E8', ['使用箇所', '注文長(m)', '本数', '品番・商品名'], cfRows)"

let worksheetReplaced = false
for (const pattern of worksheetPatterns) {
  if (s.includes(pattern)) {
    s = s.replace(pattern, newWorksheetLine)
    worksheetReplaced = true
    break
  }
}

if (!worksheetReplaced) {
  console.error('CFシート出力行が見つかりません。変更しませんでした。')
  process.exit(1)
}

// 以前のCF材料発注別シートがあれば削除し、CFシートだけに統合します。
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

console.log('CF Excelシンプル注文表V2 OK')
console.log('未割当はExcelへ出力しません')
console.log('使用箇所を部屋順に並べます')
console.log('同じ使用箇所・注文長・品番は本数をまとめます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
