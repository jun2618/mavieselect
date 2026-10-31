const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step4d2-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')

const marker = '/* M-CROSS_CF_MATERIAL_STEP4D2 */'

if (s.includes(marker)) {
  console.log('STEP4-D2はすでに適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_CF_MATERIAL_STEP4D1 */')) {
  console.error('STEP4-D1が見つかりません。変更しませんでした。')
  process.exit(1)
}

const insertionTarget = 'function LengthMeasurementPage({'
const targetCount = s.split(insertionTarget).length - 1

if (targetCount !== 1) {
  console.error('LengthMeasurementPageの追加位置が' + targetCount + '件でした。変更しませんでした。')
  process.exit(1)
}

const helperCode = `/* M-CROSS_CF_MATERIAL_STEP4D2 */

/*
  新しい材料グループ形式：
  {
    id,
    allocations: [
      { recordId, pieceIndex, quantity }
    ],
    orderLength,
    productCode
  }

  古いrecordIds形式は、該当する採寸行の全本数を
  allocationsへ展開して互換性を保ちます。
*/

function buildCfAllocationsFromRecordIds(recordIds, records) {
  const wantedIds = new Set(
    Array.isArray(recordIds) ? recordIds.filter(Boolean) : []
  )

  return buildCfPieces(records)
    .filter(piece => wantedIds.has(piece.recordId))
    .map(piece => ({
      recordId: piece.recordId,
      pieceIndex: piece.pieceIndex,
      quantity: piece.quantity,
    }))
}

function normalizeCfMaterialAllocation(allocation, pieceMap) {
  if (!allocation || !allocation.recordId) return null

  const pieceIndex = Number(allocation.pieceIndex)
  if (!Number.isInteger(pieceIndex) || pieceIndex < 0) return null

  const pieceKey = getCfPieceKey(allocation.recordId, pieceIndex)
  const piece = pieceMap.get(pieceKey)
  if (!piece) return null

  return {
    recordId: piece.recordId,
    pieceIndex: piece.pieceIndex,
    quantity: piece.quantity,
  }
}

function normalizeCfMaterialGroups(groups, records) {
  const sourceGroups = Array.isArray(groups) ? groups : []
  const allPieces = buildCfPieces(records)
  const pieceMap = new Map(
    allPieces.map(piece => [piece.pieceKey, piece])
  )
  const alreadyAllocated = new Set()

  return sourceGroups
    .map(group => {
      if (!group || typeof group !== 'object') return null

      const sourceAllocations = Array.isArray(group.allocations)
        ? group.allocations
        : buildCfAllocationsFromRecordIds(group.recordIds, records)

      const allocations = []

      sourceAllocations.forEach(allocation => {
        const normalized = normalizeCfMaterialAllocation(
          allocation,
          pieceMap
        )

        if (!normalized) return

        const pieceKey = getCfPieceKey(
          normalized.recordId,
          normalized.pieceIndex
        )

        // 同じ1本が複数グループへ重複しないよう、先に出たグループを優先します。
        if (alreadyAllocated.has(pieceKey)) return

        alreadyAllocated.add(pieceKey)
        allocations.push(normalized)
      })

      if (allocations.length === 0) return null

      return {
        id: group.id || createRecordId(),
        allocations,
        orderLength: group.orderLength ?? '',
        productCode: group.productCode || '',
      }
    })
    .filter(Boolean)
}

function areCfMaterialGroupsEqual(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return false
  }
}

function getCfMaterialGroupPieces(group, records) {
  const pieceMap = new Map(
    buildCfPieces(records).map(piece => [piece.pieceKey, piece])
  )

  const allocations = Array.isArray(group?.allocations)
    ? group.allocations
    : buildCfAllocationsFromRecordIds(group?.recordIds, records)

  return allocations
    .map(allocation => {
      const pieceKey = getCfAllocationPieceKey(allocation)
      return pieceKey ? pieceMap.get(pieceKey) : null
    })
    .filter(Boolean)
}

function getCfMaterialGroupLength(group, records) {
  return roundCfMaterialNumber(
    getCfMaterialGroupPieces(group, records).reduce(
      (sum, piece) => sum + piece.pieceLength,
      0
    )
  )
}

function LengthMeasurementPage({`

fs.copyFileSync(file, backup)
s = s.replace(insertionTarget, helperCode)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP4-D2 OK')
console.log('1本単位のallocations形式と旧recordIds互換処理を追加しました')
console.log('この段階では画面表示と既存保存データはまだ変更しません')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
