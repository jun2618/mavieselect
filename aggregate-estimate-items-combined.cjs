const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-aggregation-combined')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const start = source.indexOf('function buildEstimateRows(')
const end = source.indexOf('\nfunction estimateRowsToClipboardText(', start)

if (start === -1 || end === -1) {
  console.error('見積集計処理が見つかりません。変更せず終了しました。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
console.log('OK: バックアップ作成 ' + backup)

const newFunction = `function buildEstimateRows(records, cfRecords, softRecords, rooms, factor, pricingSettings) {
  const rows = []

  function combinedMemo(targetRecords) {
    return [...new Set(
      targetRecords
        .map(record => String(record.memo || '').trim())
        .filter(Boolean)
    )].join('・')
  }

  rooms.forEach(roomName => {
    const ceilingRecords = records.filter(record =>
      record.room === roomName && record.type === '天井'
    )
    const ceilingQuantity = ceilingRecords.reduce(
      (sum, record) => sum + getRecordQuantity(record), 0
    ) * factor
    if (ceilingQuantity > 0) {
      const rate = Number(pricingSettings.crossRates['天井'] || 0)
      rows.push({
        room: roomName,
        parts: [roomName, '天井', 'クロス貼替'],
        memo: combinedMemo(ceilingRecords),
        category: 'cross',
        quantity: ceilingQuantity,
        unit: '㎡',
        rate,
        amount: ceilingQuantity * rate,
      })
    }

    const wallRecords = records.filter(record =>
      record.room === roomName && record.type === '壁'
    )
    const wallQuantity = wallRecords.reduce(
      (sum, record) => sum + getRecordQuantity(record), 0
    ) * factor
    if (wallQuantity > 0) {
      const rate = Number(pricingSettings.crossRates['壁'] || 0)
      rows.push({
        room: roomName,
        parts: [roomName, '壁', 'クロス貼替'],
        memo: combinedMemo(wallRecords),
        category: 'cross',
        quantity: wallQuantity,
        unit: '㎡',
        rate,
        amount: wallQuantity * rate,
      })
    }

    const storageRecords = records.filter(record =>
      record.room === roomName &&
      (record.type === '収納天井' || record.type === '収納壁')
    )
    const storageQuantity = storageRecords.reduce(
      (sum, record) => sum + getRecordQuantity(record), 0
    ) * factor
    if (storageQuantity > 0) {
      const storageAmount = storageRecords.reduce((sum, record) => {
        const rate = Number(pricingSettings.crossRates[record.type] || 0)
        return sum + getRecordQuantity(record) * factor * rate
      }, 0)
      const inputMemo = combinedMemo(storageRecords)
      rows.push({
        room: roomName,
        parts: [roomName, '収納', 'クロス貼替'],
        memo: ['天井壁', inputMemo].filter(Boolean).join('・'),
        category: 'cross',
        quantity: storageQuantity,
        unit: '㎡',
        rate: storageQuantity > 0 ? storageAmount / storageQuantity : 0,
        amount: storageAmount,
      })
    }

    const roomCfRecords = cfRecords.filter(record => record.room === roomName)
    const cfQuantity = roomCfRecords.reduce(
      (sum, record) => sum + getLengthQuantity(record), 0
    )
    if (cfQuantity > 0) {
      const rate = Number(pricingSettings.cfRate || 0)
      rows.push({
        room: roomName,
        parts: [roomName, 'CF貼替'],
        memo: combinedMemo(roomCfRecords),
        category: 'cf',
        quantity: cfQuantity,
        unit: '㎡',
        rate,
        amount: cfQuantity * rate,
      })
    }
  })

  const softQuantity = softRecords.reduce(
    (sum, record) => sum + getSoftBaseboardQuantity(record), 0
  )
  if (softQuantity > 0) {
    const rate = Number(pricingSettings.softRate || 0)
    rows.push({
      room: '__ALL_ROOMS__',
      parts: ['ソフト巾木貼替'],
      memo: combinedMemo(softRecords),
      category: 'soft',
      quantity: softQuantity,
      unit: '枚',
      rate,
      amount: softQuantity * rate,
    })
  }

  return rows.map(row => ({
    ...row,
    label: row.parts.join(' '),
  }))
}
`

source = source.slice(0, start) + newFunction + source.slice(end)
fs.writeFileSync(file, source, 'utf8')

console.log('OK: 部屋ごとの天井を合算')
console.log('OK: 部屋ごとの壁を合算')
console.log('OK: 収納天井と収納壁を合算')
console.log('OK: 収納を「居間 収納 クロス貼替｜天井壁」として出力')
console.log('OK: CFを部屋ごとに合算')
console.log('OK: ソフト巾木を全室合計に変更')
console.log('OK: 入力メモは重複を除き「・」で連結')
console.log('完了: 次に npm run build を実行してください。')
