const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step4d4-excel-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')

const marker = '/* M-CROSS_CF_MATERIAL_EXCEL_D4 */'

if (s.includes(marker)) {
  console.log('STEP4-D4 Excel出力はすでに適用済みです')
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

const cfWorksheetLine = "  addWorksheet('CF', 'FF6E91E8', ['部屋名', 'メモ', '長さ', '本数', '数量'], cfRows)"
const softWorksheetLine = "  addWorksheet('ソフト巾木', 'FF63BEA1', ['部屋名', '枚数', '数量'], softRows)"

const cfPos = s.indexOf(cfWorksheetLine)
const softPos = s.indexOf(softWorksheetLine, cfPos)

if (cfPos === -1 || softPos === -1) {
  console.error('Excel出力のCFまたはソフト巾木の位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const betweenStart = cfPos + cfWorksheetLine.length
const between = s.slice(betweenStart, softPos)

// 以前追加したCF材料発注ブロックがあれば、この範囲だけ安全に置き換えます。
// CFとソフト巾木の出力行は残します。
const oldMarker = '/* M-CROSS_CF_MATERIAL_EXCEL_V1 */'
if (between.trim() && !between.includes(oldMarker)) {
  console.error('CFシートとソフト巾木シートの間に未確認コードがあります。変更しませんでした。')
  process.exit(1)
}

const excelCode = `

  /* M-CROSS_CF_MATERIAL_EXCEL_D4 */
  const normalizedCfMaterialGroups = normalizeCfMaterialGroups(
    entry.cfMaterialGroups || [],
    entry.cfRecords || []
  )

  const cfMaterialSummary = getCfMaterialAllocationSummary(
    entry.cfRecords || [],
    normalizedCfMaterialGroups
  )

  const cfMaterialRows = normalizedCfMaterialGroups.map((group, index) => {
    const pieces = getCfMaterialGroupPieces(group, entry.cfRecords || [])
    const roomNames = [...new Set(pieces.map(piece => piece.room).filter(Boolean))]
    const calculatedLength = getCfMaterialGroupLength(group, entry.cfRecords || [])
    const numericOrderLength = Number(group.orderLength)

    const details = pieces.map(piece => {
      const room = piece.room || '部屋未設定'
      const pieceLabel = piece.label || String(piece.pieceIndex + 1) + '本目'
      const memo = piece.memo ? '（' + piece.memo + '）' : ''
      return room + ' ' + pieceLabel + ' ' + formatQuantity(piece.pieceLength) + 'm' + memo
    }).join(' / ')

    return [
      'CF材料' + (index + 1),
      roomNames.join(' ＋ '),
      details,
      Number(formatQuantity(calculatedLength)),
      Number.isFinite(numericOrderLength) && numericOrderLength > 0
        ? numericOrderLength
        : Number(formatQuantity(calculatedLength)),
      group.productCode || '',
    ]
  })

  const unallocatedDetails = cfMaterialSummary.unallocatedPieces
    .map(piece => {
      const room = piece.room || '部屋未設定'
      const pieceLabel = piece.label || String(piece.pieceIndex + 1) + '本目'
      return room + ' ' + pieceLabel + ' ' + formatQuantity(piece.pieceLength) + 'm'
    })
    .join(' / ')

  const cfMaterialOutputRows = [
    ...cfMaterialRows,
    ['', '', '', '', '', ''],
    ['確認', '必要長合計', '', Number(formatQuantity(cfMaterialSummary.requiredLength)), '', ''],
    ['確認', '割当済み', '', Number(formatQuantity(cfMaterialSummary.allocatedLength)), '', ''],
    ['確認', '未割当', unallocatedDetails, Number(formatQuantity(cfMaterialSummary.unallocatedLength)), '', ''],
  ]

  if (cfMaterialSummary.allPieces.length > 0 || normalizedCfMaterialGroups.length > 0) {
    addWorksheet(
      'CF材料発注',
      'FF3FA7D6',
      ['材料名', '使用箇所', '1本単位の内訳', '計算長(m)', '注文長(m)', '品番・商品名'],
      cfMaterialOutputRows
    )
  }

`

fs.copyFileSync(file, backup)

s = s.slice(0, betweenStart) + excelCode + s.slice(softPos)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP4-D4 Excel OK')
console.log('CF材料発注シートを1本単位のallocations方式へ更新しました')
console.log('必要長合計・割当済み・未割当・未割当内訳も出力します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
