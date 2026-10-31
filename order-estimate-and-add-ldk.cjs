const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-order-and-ldk')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
fs.copyFileSync(file, backup)
console.log('OK: バックアップ作成 ' + backup)

// 既定部屋へLDKを追加。既存データの部屋は消しません。
const roomsPattern = /const defaultRooms = \[\s*[\s\S]*?\n\]/
const roomsMatch = source.match(roomsPattern)
if (!roomsMatch) {
  console.error('既定部屋一覧が見つかりません。変更せず終了しました。')
  process.exit(1)
}
const existingRoomsText = roomsMatch[0]
if (!existingRoomsText.includes("'LDK'")) {
  const newRoomsText = `const defaultRooms = [
  '居間', 'LDK', '台所', '洋間', '洋間2', '洋間3', '和室',
  '階段', 'ホール', '玄関', '脱衣所', 'トイレ',
]`
  source = source.replace(existingRoomsText, newRoomsText)
  console.log('OK: 既定部屋にLDKを追加')
} else {
  console.log('SKIP: LDKは追加済み')
}

const start = source.indexOf('function buildEstimateRows(')
const end = source.indexOf('\nfunction estimateRowsToClipboardText(', start)
if (start === -1 || end === -1) {
  console.error('見積集計処理が見つかりません。変更せず終了しました。')
  process.exit(1)
}

const newFunction = `function buildEstimateRows(records, cfRecords, softRecords, rooms, factor, pricingSettings) {
  const crossRows = []
  const cfRows = []
  const softRows = []
  const roomPriority = ['居間', 'LDK', '台所', '洋間', '和室', '階段', 'ホール', '玄関', '脱衣所', 'トイレ']

  function roomBaseName(roomName) {
    if (/^洋間\\d+$/.test(roomName)) return '洋間'
    if (/^和室\\d+$/.test(roomName)) return '和室'
    return roomName
  }

  function roomNumber(roomName) {
    const match = String(roomName).match(/(\\d+)$/)
    return match ? Number(match[1]) : 0
  }

  const orderedRooms = [...rooms].sort((a, b) => {
    const aIndex = roomPriority.indexOf(roomBaseName(a))
    const bIndex = roomPriority.indexOf(roomBaseName(b))
    const aRank = aIndex === -1 ? roomPriority.length : aIndex
    const bRank = bIndex === -1 ? roomPriority.length : bIndex
    if (aRank !== bRank) return aRank - bRank
    const numberDifference = roomNumber(a) - roomNumber(b)
    if (numberDifference !== 0) return numberDifference
    return String(a).localeCompare(String(b), 'ja')
  })

  function groupByMemo(targetRecords) {
    const groups = new Map()
    targetRecords.forEach(record => {
      const memo = String(record.memo || '').trim()
      if (!groups.has(memo)) groups.set(memo, [])
      groups.get(memo).push(record)
    })
    return groups
  }

  // 1. クロスを全部屋分、指定した部屋順で先に並べます。
  orderedRooms.forEach(roomName => {
    const definitions = [
      {
        parts: [roomName, '天井', 'クロス貼替'],
        records: records.filter(record => record.room === roomName && record.type === '天井'),
        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['天井'] || 0),
      },
      {
        parts: [roomName, '壁', 'クロス貼替'],
        records: records.filter(record => record.room === roomName && record.type === '壁'),
        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['壁'] || 0),
      },
      {
        parts: [roomName, '収納', 'クロス貼替'],
        records: records.filter(record => record.room === roomName && (record.type === '収納天井' || record.type === '収納壁')),
        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates[record.type] || 0),
        storage: true,
      },
    ]

    definitions.forEach(definition => {
      groupByMemo(definition.records).forEach((groupRecords, inputMemo) => {
        const quantity = groupRecords.reduce((sum, record) => sum + getRecordQuantity(record), 0) * factor
        if (quantity <= 0) return
        const amount = groupRecords.reduce((sum, record) => sum + definition.amountForRecord(record), 0)
        crossRows.push({
          room: roomName,
          parts: definition.parts,
          memo: definition.storage ? ['天井壁', inputMemo].filter(Boolean).join('・') : inputMemo,
          category: 'cross',
          quantity,
          unit: '㎡',
          rate: quantity > 0 ? amount / quantity : 0,
          amount,
        })
      })
    })
  })

  // 2. クロスが終わった後に、CFを全部屋分並べます。
  orderedRooms.forEach(roomName => {
    const roomCfRecords = cfRecords.filter(record => record.room === roomName)
    groupByMemo(roomCfRecords).forEach((groupRecords, memo) => {
      const quantity = groupRecords.reduce((sum, record) => sum + getLengthQuantity(record), 0)
      if (quantity <= 0) return
      const rate = Number(pricingSettings.cfRate || 0)
      cfRows.push({
        room: roomName,
        parts: [roomName, 'CF貼替'],
        memo,
        category: 'cf',
        quantity,
        unit: '㎡',
        rate,
        amount: quantity * rate,
      })
    })
  })

  // 3. 最後にソフト巾木。メモなしは全室合計、メモありはメモ別です。
  groupByMemo(softRecords).forEach((groupRecords, memo) => {
    const quantity = groupRecords.reduce((sum, record) => sum + getSoftBaseboardQuantity(record), 0)
    if (quantity <= 0) return
    const rate = Number(pricingSettings.softRate || 0)
    softRows.push({
      room: '__ALL_ROOMS__',
      parts: ['ソフト巾木貼替'],
      memo,
      category: 'soft',
      quantity,
      unit: '枚',
      rate,
      amount: quantity * rate,
    })
  })

  return [...crossRows, ...cfRows, ...softRows].map(row => ({
    ...row,
    label: row.parts.join(' '),
  }))
}
`

source = source.slice(0, start) + newFunction + source.slice(end)
fs.writeFileSync(file, source, 'utf8')

console.log('OK: クロス全項目 → CF全項目 → ソフト巾木の順に変更')
console.log('OK: 部屋順を 居間・LDK・台所・洋間・和室・階段・ホール・玄関・脱衣所・トイレ に変更')
console.log('OK: 洋間2・洋間3などは洋間の直後に番号順で配置')
console.log('OK: メモなし合算／メモあり別項目のルールを維持')
console.log('完了: 次に npm run build を実行してください。')
