const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-cross-cf-package-v2')
const v1Marker = '/* M-CROSS_CROSS_CF_PACKAGE_V1 */'
const v2Marker = '/* M-CROSS_CROSS_CF_PACKAGE_V2 */'
const exportAnchor = 'async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')
if (source.includes(v2Marker)) {
  console.log('SKIP: クロス・CF一式工事V2は適用済みです。')
  process.exit(0)
}
if (!source.includes(exportAnchor)) {
  console.error('ERROR: downloadEstimateExcel関数が見つかりません。変更していません。')
  process.exit(1)
}

fs.copyFileSync(target, backup)

// V1を適用済みなら、V1の変換ブロックと呼び出しを除去してからV2を入れる。
if (source.includes(v1Marker)) {
  const start = source.indexOf(v1Marker)
  const end = source.indexOf(exportAnchor, start)
  if (start < 0 || end < 0) {
    console.error('ERROR: V1ブロックの範囲を特定できません。変更していません。')
    process.exit(1)
  }
  source = source.slice(0, start) + source.slice(end)
  source = source.replace(/\n\s*rows\s*=\s*applyCrossCfPackageRules\(rows\)\s*/, '\n')
}

const implementation = `${v2Marker}
const CROSS_PACKAGE_LIMIT_V2 = 35
const CF_PACKAGE_LIMIT_V2 = 20

function estimateTextV2(value) {
  return String(value ?? '').trim()
}

function estimateNumberV2(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const match = estimateTextV2(value).replace(/,/g, '').match(/-?\\d+(?:\\.\\d+)?/)
  return match ? Number(match[0]) || 0 : 0
}

function estimateFirstV2(row, keys) {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && estimateTextV2(value) !== '') return value
  }
  return ''
}

function estimateNameKeyV2(row) {
  return ['description', 'name', 'itemName', 'item', 'label', 'workName', 'title']
    .find(key => Object.prototype.hasOwnProperty.call(row || {}, key)) || 'description'
}

function estimateLabelV2(row) {
  return [
    estimateFirstV2(row, ['description', 'name', 'itemName', 'item', 'label', 'workName', 'title']),
    estimateFirstV2(row, ['roomName', 'room', 'space']),
    estimateFirstV2(row, ['memo', 'location', 'surface', 'position']),
    estimateFirstV2(row, ['type', 'category', 'material']),
  ].map(estimateTextV2).filter(Boolean).join(' ')
}

function estimateAreaV2(row) {
  const value = estimateFirstV2(row, [
    'area', 'totalArea', 'quantity', 'qty', 'squareMeters', 'sqm',
    'calculatedArea', 'estimateQuantity', 'total',
  ])
  return Math.max(0, estimateNumberV2(value))
}

function estimateRoomV2(row) {
  return estimateTextV2(estimateFirstV2(row, ['roomName', 'room', 'space']))
    .replace(/クロス|CF|クッションフロア|張替|貼替|貼り/g, '').trim()
}

function estimatePlaceV2(row) {
  return estimateTextV2(estimateFirstV2(row, ['memo', 'location', 'surface', 'position', 'place']))
}

function setEstimateNameV2(row, name) {
  return { ...(row || {}), [estimateNameKeyV2(row)]: name }
}

function clearEstimateMoneyV2(row) {
  const next = { ...row }
  for (const key of [
    'unitPrice', 'price', 'amount', 'subtotal', 'totalPrice', 'salesPrice',
    'cost', 'totalAmount', 'estimateAmount',
  ]) {
    if (Object.prototype.hasOwnProperty.call(next, key)) next[key] = ''
  }
  return next
}

function makeDetailRowV2(row, name) {
  const next = clearEstimateMoneyV2(setEstimateNameV2(row, name))
  for (const key of ['quantity', 'qty', 'unit', 'area', 'totalArea', 'estimateQuantity']) {
    if (Object.prototype.hasOwnProperty.call(next, key)) next[key] = ''
  }
  next.quantity = ''
  next.unit = ''
  return next
}

function makePackageRowV2(base, name, area) {
  const next = clearEstimateMoneyV2(setEstimateNameV2(base || {}, name))
  next.quantity = 1
  next.unit = '式'
  if (Object.prototype.hasOwnProperty.call(next, 'qty')) next.qty = 1
  if (Object.prototype.hasOwnProperty.call(next, 'area')) next.area = area
  if (Object.prototype.hasOwnProperty.call(next, 'totalArea')) next.totalArea = area
  return next
}

function roundedAreaTextV2(area) {
  return Math.round((area + Number.EPSILON) * 10) / 10 + '㎡程度'
}

function crossDetailNameV2(row) {
  const room = estimateRoomV2(row)
  const place = estimatePlaceV2(row)
  const original = estimateTextV2(estimateFirstV2(row, [
    'description', 'name', 'itemName', 'item', 'label', 'workName', 'title',
  ]))
  if (room) return room + 'クロス張替' + (place ? '　' + place : '')
  return original.replace(/クロス貼替/g, 'クロス張替').replace(/クロス貼り/g, 'クロス張替')
}

function applyCrossCfPackageRulesV2(inputRows) {
  const rows = Array.isArray(inputRows) ? inputRows : []
  if (!rows.length) return rows

  const crossIndexes = []
  const cfIndexes = []
  rows.forEach((row, index) => {
    const label = estimateLabelV2(row)
    const upper = label.toUpperCase()
    if (upper.includes('CF') || label.includes('クッションフロア')) cfIndexes.push(index)
    else if (label.includes('クロス')) crossIndexes.push(index)
  })

  const crossArea = crossIndexes.reduce((sum, index) => sum + estimateAreaV2(rows[index]), 0)
  const cfArea = cfIndexes.reduce((sum, index) => sum + estimateAreaV2(rows[index]), 0)
  const crossPackage = crossIndexes.length > 0 && crossArea > 0 && crossArea <= CROSS_PACKAGE_LIMIT_V2
  const cfPackage = cfIndexes.length > 0 && cfArea > 0 && cfArea <= CF_PACKAGE_LIMIT_V2

  const output = []
  rows.forEach((row, index) => {
    if (crossPackage && crossIndexes.includes(index)) {
      output.push(makeDetailRowV2(row, crossDetailNameV2(row)))
      if (index === crossIndexes[crossIndexes.length - 1]) {
        output.push(makePackageRowV2(
          row,
          '上記クロス張替　' + roundedAreaTextV2(crossArea),
          crossArea
        ))
      }
      return
    }

    if (cfPackage && cfIndexes.includes(index)) {
      if (index === cfIndexes[cfIndexes.length - 1]) {
        const rooms = [...new Set(cfIndexes.map(i => estimateRoomV2(rows[i])).filter(Boolean))]
        const roomText = rooms.length ? rooms.join('、') + ' ' : ''
        output.push(makePackageRowV2(
          row,
          roomText + 'CF貼り　' + roundedAreaTextV2(cfArea),
          cfArea
        ))
      }
      return
    }

    output.push(row)
  })

  return output
}

`

source = source.replace(exportAnchor, implementation + exportAnchor + `
  rows = applyCrossCfPackageRulesV2(rows)`)
fs.writeFileSync(target, source, 'utf8')

console.log('OK: クロス・CF一式工事V2を適用しました。')
console.log('  - クロス35㎡以下: 施工箇所 + 上記クロス張替 ○㎡程度 / 1式')
console.log('  - CF20㎡以下: 部屋名をまとめて CF貼り ○㎡程度 / 1式')
console.log('  - 単価・金額は自動設定せず空欄')
console.log('  - V1適用済みの場合はV1を置換')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
