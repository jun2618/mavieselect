const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-cross-cf-package-v1')
const marker = '/* M-CROSS_CROSS_CF_PACKAGE_V1 */'

if (!fs.existsSync(file)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: クロス・CF一式工事V1は適用済みです。')
  process.exit(0)
}

const functionAnchor = 'async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {'
if (!source.includes(functionAnchor)) {
  console.error('ERROR: downloadEstimateExcel関数が見つかりません。App.jsxは変更していません。')
  process.exit(1)
}

fs.copyFileSync(file, backup)

const helper = `${marker}
const crossPackageAreaLimit = 35
const cfPackageAreaLimit = 20
const crossPackagePrice = 23000
const cfPackagePrice = 23000

function packageText(value) {
  return String(value ?? '').trim()
}

function packageNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const matched = packageText(value).replace(/,/g, '').match(/-?\\d+(?:\\.\\d+)?/)
  return matched ? Number(matched[0]) || 0 : 0
}

function packageRowLabel(row) {
  if (!row || typeof row !== 'object') return ''
  return [
    row.name, row.label, row.item, row.itemName, row.description,
    row.workName, row.room, row.roomName, row.location, row.memo,
    row.type, row.category, row.material,
  ].map(packageText).filter(Boolean).join(' ')
}

function packageRowArea(row) {
  if (!row || typeof row !== 'object') return 0
  for (const key of ['area', 'quantity', 'qty', 'total', 'totalArea', 'squareMeters', 'sqm']) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const number = packageNumber(row[key])
      if (number > 0) return number
    }
  }
  return 0
}

function packageNameKey(row) {
  for (const key of ['name', 'label', 'itemName', 'item', 'description', 'workName']) {
    if (Object.prototype.hasOwnProperty.call(row || {}, key)) return key
  }
  return 'name'
}

function packageSetName(row, value) {
  return { ...row, [packageNameKey(row)]: value }
}

function packageBlankDetail(row, name) {
  const next = packageSetName(row, name)
  for (const key of ['quantity', 'qty', 'unit', 'unitPrice', 'price', 'amount', 'subtotal', 'totalPrice']) {
    if (Object.prototype.hasOwnProperty.call(next, key)) next[key] = ''
  }
  return next
}

function packageSummaryRow(baseRow, name, price) {
  const next = packageSetName({ ...(baseRow || {}) }, name)
  const values = {
    quantity: 1, qty: 1, unit: '式', unitPrice: price,
    price, amount: price, subtotal: price, totalPrice: price,
  }
  for (const [key, value] of Object.entries(values)) {
    if (Object.prototype.hasOwnProperty.call(next, key) || ['quantity', 'unit', 'unitPrice', 'amount'].includes(key)) {
      next[key] = value
    }
  }
  return next
}

function packageRoomName(row) {
  return packageText(row?.roomName || row?.room || row?.space || '').replace(/CF|貼り|張替/g, '').trim()
}

function packageCrossDetailName(row) {
  const room = packageText(row?.roomName || row?.room || '')
  const place = packageText(row?.memo || row?.location || row?.surface || row?.position || '')
  if (room) return (room + 'クロス張替' + (place ? '　' + place : '')).trim()
  const original = packageRowLabel(row)
  return original.includes('クロス') ? original.replace(/貼替/g, '張替') : original
}

function applyCrossCfPackageRules(inputRows) {
  const rows = Array.isArray(inputRows) ? inputRows : []
  if (!rows.length) return rows

  const crossRows = []
  const cfRows = []
  const otherRows = []

  rows.forEach(row => {
    const label = packageRowLabel(row)
    const normalized = label.toUpperCase()
    if (normalized.includes('CF') || label.includes('クッションフロア')) cfRows.push(row)
    else if (label.includes('クロス') || label.includes('天井') || label.includes('収納天井') || label.includes('収納壁')) crossRows.push(row)
    else otherRows.push(row)
  })

  const crossArea = crossRows.reduce((sum, row) => sum + packageRowArea(row), 0)
  const cfArea = cfRows.reduce((sum, row) => sum + packageRowArea(row), 0)
  const output = [...otherRows]

  if (crossRows.length && crossArea > 0 && crossArea <= crossPackageAreaLimit) {
    crossRows.forEach(row => output.push(packageBlankDetail(row, packageCrossDetailName(row))))
    output.push(packageSummaryRow(
      crossRows[crossRows.length - 1],
      '上記クロス張替　' + Math.round(crossArea) + '㎡程度',
      crossPackagePrice
    ))
  } else {
    output.push(...crossRows)
  }

  if (cfRows.length && cfArea > 0 && cfArea <= cfPackageAreaLimit) {
    const rooms = [...new Set(cfRows.map(packageRoomName).filter(Boolean))]
    const cfName = (rooms.length ? rooms.join('、') + ' ' : '') + 'CF貼り　' + Math.round(cfArea) + '㎡程度'
    output.push(packageSummaryRow(cfRows[cfRows.length - 1], cfName, cfPackagePrice))
  } else {
    output.push(...cfRows)
  }

  return output
}

`

source = source.replace(functionAnchor, helper + functionAnchor + `
  rows = applyCrossCfPackageRules(rows)`)
fs.writeFileSync(file, source, 'utf8')

console.log('OK: クロス・CF一式工事V1を適用しました。')
console.log('  クロス: 35㎡以下 → 箇所明細 + 上記クロス張替 ○㎡程度 1式 23,000円')
console.log('  CF: 20㎡以下 → 部屋名を連結 + CF貼り ○㎡程度 1式 23,000円')
console.log('  基準超過時は従来の㎡計算を維持します。')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
