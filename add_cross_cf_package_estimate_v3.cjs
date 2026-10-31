const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-cross-cf-package-v3')
const v2Marker = '/* M-CROSS_CROSS_CF_PACKAGE_V2 */'
const v3Marker = '/* M-CROSS_CROSS_CF_PACKAGE_V3 */'
const exportAnchor = 'async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')
if (source.includes(v3Marker)) {
  console.log('SKIP: クロス・CF一式工事V3は適用済みです。')
  process.exit(0)
}
if (!source.includes(exportAnchor)) {
  console.error('ERROR: downloadEstimateExcel関数が見つかりません。変更していません。')
  process.exit(1)
}

fs.copyFileSync(target, backup)

// V2の実装ブロックを削除する。
if (source.includes(v2Marker)) {
  const start = source.indexOf(v2Marker)
  const end = source.indexOf(exportAnchor, start)
  if (start < 0 || end < 0) {
    console.error('ERROR: V2ブロックの範囲を特定できません。変更していません。')
    process.exit(1)
  }
  source = source.slice(0, start) + source.slice(end)
  source = source.replace(/\n\s*rows\s*=\s*applyCrossCfPackageRulesV2\(rows\)\s*/, '\n')
}

const implementation = `${v3Marker}
const CROSS_PACKAGE_LIMIT_V3 = 35
const CF_SQUARE_METRE_START_V3 = 20

function areaTextV3(value) {
  const rounded = Math.round((Number(value || 0) + Number.EPSILON) * 10) / 10
  return rounded + '㎡程度'
}

function blankPriceV3(row) {
  return { ...row, rate: '', amount: '' }
}

function crossDetailRowV3(row) {
  const room = String(row?.room || row?.parts?.[0] || '').trim()
  const memo = String(row?.memo || '').trim()
  return {
    ...blankPriceV3(row),
    parts: [(room ? room : '') + 'クロス張替'],
    memo,
    quantity: '',
    unit: '',
  }
}

function crossPackageRowV3(baseRow, totalArea) {
  return {
    ...blankPriceV3(baseRow || {}),
    room: baseRow?.room || '__CROSS_PACKAGE__',
    parts: ['上記クロス張替　' + areaTextV3(totalArea)],
    memo: '',
    category: 'crossPackage',
    quantity: 1,
    unit: '式',
  }
}

function cfPackageRowV3(cfRows, totalArea) {
  const rooms = [...new Set(cfRows
    .map(row => String(row?.room || row?.parts?.[0] || '').trim())
    .filter(Boolean))]
  const roomText = rooms.join('、')
  return {
    ...blankPriceV3(cfRows[cfRows.length - 1] || {}),
    room: cfRows[0]?.room || '__CF_PACKAGE__',
    parts: [(roomText ? roomText + '　' : '') + 'CF貼り　' + areaTextV3(totalArea)],
    memo: '',
    category: 'cfPackage',
    quantity: 1,
    unit: '式',
  }
}

function applyCrossCfPackageRulesV3(inputRows) {
  const rows = Array.isArray(inputRows) ? inputRows : []
  const crossRows = rows.filter(row => row?.category === 'cross')
  const cfRows = rows.filter(row => row?.category === 'cf')
  const crossArea = crossRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
  const cfArea = cfRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)

  // クロスは35㎡以下を一式。CFは20㎡未満だけ一式で、20㎡ちょうどから㎡単価。
  const useCrossPackage = crossRows.length > 0 && crossArea > 0 && crossArea <= CROSS_PACKAGE_LIMIT_V3
  const useCfPackage = cfRows.length > 0 && cfArea > 0 && cfArea < CF_SQUARE_METRE_START_V3

  const result = []
  let crossSummaryAdded = false
  let cfSummaryAdded = false

  rows.forEach(row => {
    if (useCrossPackage && row?.category === 'cross') {
      result.push(crossDetailRowV3(row))
      if (!crossSummaryAdded && row === crossRows[crossRows.length - 1]) {
        result.push(crossPackageRowV3(row, crossArea))
        crossSummaryAdded = true
      }
      return
    }

    if (useCfPackage && row?.category === 'cf') {
      if (!cfSummaryAdded && row === cfRows[cfRows.length - 1]) {
        result.push(cfPackageRowV3(cfRows, cfArea))
        cfSummaryAdded = true
      }
      return
    }

    result.push(row)
  })

  return result
}

`

source = source.replace(exportAnchor, implementation + exportAnchor + `
  rows = applyCrossCfPackageRulesV3(rows)`)

// Excel出力時、V3の空欄を0へ戻さない。
const exportStart = source.indexOf(exportAnchor)
const nextFunction = source.indexOf('\nasync function ', exportStart + exportAnchor.length)
const exportEnd = nextFunction >= 0 ? nextFunction : source.length
let exportBlock = source.slice(exportStart, exportEnd)

const replacements = [
  [/Number\(row\.rate\s*\|\|\s*0\)/g, "row.rate === '' || row.rate == null ? '' : Number(row.rate || 0)"],
  [/Number\(row\.amount\s*\|\|\s*0\)/g, "row.amount === '' || row.amount == null ? '' : Number(row.amount || 0)"],
  [/row\.rate\s*\|\|\s*0/g, "row.rate === '' || row.rate == null ? '' : row.rate"],
  [/row\.amount\s*\|\|\s*0/g, "row.amount === '' || row.amount == null ? '' : row.amount"],
]
replacements.forEach(([pattern, replacement]) => { exportBlock = exportBlock.replace(pattern, replacement) })
source = source.slice(0, exportStart) + exportBlock + source.slice(exportEnd)

fs.writeFileSync(target, source, 'utf8')

console.log('OK: クロス・CF一式工事V3を適用しました。')
console.log('  - クロス35㎡以下: 施工箇所を残し、最後に「上記クロス張替 ○㎡程度」1式')
console.log('  - CF20㎡未満: 「脱衣所、トイレ　CF貼り　○㎡程度」1式')
console.log('  - CF20㎡ちょうどから: 従来の㎡単価')
console.log('  - 一式行の単価・金額: 空欄')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
