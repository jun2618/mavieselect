const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step4d1-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')

const marker = '/* M-CROSS_CF_MATERIAL_STEP4D1 */'

if (s.includes(marker)) {
  console.log('STEP4-D1はすでに適用済みです')
  process.exit(0)
}

const insertionTarget = 'function LengthMeasurementPage({'
const targetCount = s.split(insertionTarget).length - 1

if (targetCount !== 1) {
  console.error('LengthMeasurementPageの追加位置が' + targetCount + '件でした。変更しませんでした。')
  process.exit(1)
}

const helperCode = `/* M-CROSS_CF_MATERIAL_STEP4D1 */

function normalizeCfMaterialNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return number
}

function roundCfMaterialNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.round((number + Number.EPSILON) * 10000) / 10000
}

function getCfPieceKey(recordId, pieceIndex) {
  return String(recordId || '') + ':' + String(pieceIndex)
}

function buildCfPieces(records) {
  if (!Array.isArray(records)) return []

  return records.flatMap(record => {
    if (!record || !record.id) return []

    const baseLength = normalizeCfMaterialNumber(record.length)
    const count = normalizeCfMaterialNumber(record.count)
    if (baseLength <= 0 || count <= 0) return []

    const wholeCount = Math.floor(count)
    const fractionalCount = roundCfMaterialNumber(count - wholeCount)
    const pieces = []

    for (let pieceIndex = 0; pieceIndex < wholeCount; pieceIndex += 1) {
      pieces.push({
        pieceKey: getCfPieceKey(record.id, pieceIndex),
        recordId: record.id,
        pieceIndex,
        room: record.room || '',
        memo: record.memo || '',
        sourceLength: baseLength,
        sourceCount: count,
        quantity: 1,
        pieceLength: roundCfMaterialNumber(baseLength),
        label: String(pieceIndex + 1) + '本目',
        isFractional: false,
      })
    }

    if (fractionalCount > 0) {
      const pieceIndex = wholeCount
      pieces.push({
        pieceKey: getCfPieceKey(record.id, pieceIndex),
        recordId: record.id,
        pieceIndex,
        room: record.room || '',
        memo: record.memo || '',
        sourceLength: baseLength,
        sourceCount: count,
        quantity: fractionalCount,
        pieceLength: roundCfMaterialNumber(baseLength * fractionalCount),
        label: '端数' + formatQuantity(fractionalCount) + '本',
        isFractional: true,
      })
    }

    return pieces
  })
}

function getCfAllocationPieceKey(allocation) {
  if (!allocation || !allocation.recordId) return ''
  const pieceIndex = Number(allocation.pieceIndex)
  if (!Number.isInteger(pieceIndex) || pieceIndex < 0) return ''
  return getCfPieceKey(allocation.recordId, pieceIndex)
}

function getAllocatedCfPieceKeys(materialGroups) {
  const allocatedKeys = new Set()
  if (!Array.isArray(materialGroups)) return allocatedKeys

  materialGroups.forEach(group => {
    const allocations = Array.isArray(group?.allocations) ? group.allocations : []
    allocations.forEach(allocation => {
      const pieceKey = getCfAllocationPieceKey(allocation)
      if (pieceKey) allocatedKeys.add(pieceKey)
    })
  })

  return allocatedKeys
}

function getCfMaterialAllocationSummary(records, materialGroups) {
  const allPieces = buildCfPieces(records)
  const allocatedKeys = getAllocatedCfPieceKeys(materialGroups)
  const allocatedPieces = allPieces.filter(piece => allocatedKeys.has(piece.pieceKey))
  const unallocatedPieces = allPieces.filter(piece => !allocatedKeys.has(piece.pieceKey))

  const requiredLength = allPieces.reduce((sum, piece) => sum + piece.pieceLength, 0)
  const allocatedLength = allocatedPieces.reduce((sum, piece) => sum + piece.pieceLength, 0)
  const unallocatedLength = unallocatedPieces.reduce((sum, piece) => sum + piece.pieceLength, 0)

  return {
    allPieces,
    allocatedPieces,
    unallocatedPieces,
    requiredLength: roundCfMaterialNumber(requiredLength),
    allocatedLength: roundCfMaterialNumber(allocatedLength),
    unallocatedLength: roundCfMaterialNumber(unallocatedLength),
    isFullyAllocated: allPieces.length > 0 && unallocatedPieces.length === 0,
  }
}

function LengthMeasurementPage({`

fs.copyFileSync(file, backup)
s = s.replace(insertionTarget, helperCode)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP4-D1 OK')
console.log('CFを1本単位へ展開する共通処理を追加しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
