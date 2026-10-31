const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-memo-grouping-and-quick-memos')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const original = source

fs.copyFileSync(file, backup)
console.log('OK: バックアップ作成 ' + backup)

// よく使うメモを指定された内容に変更
const quickMemoPattern = /const quickMemos = \[[^\n]*\]/
if (!quickMemoPattern.test(source)) {
  console.error('quickMemos が見つかりません。変更せず終了しました。')
  process.exit(1)
}
source = source.replace(
  quickMemoPattern,
  "const quickMemos = ['窓面', '窓向かって右面', '窓向かって左面', '正面', '右面', '左面', 'シンク背面', 'シンク向かって右面', 'シンク向かって左面', '梁含む', '梁除く', '下がり天井']"
)
console.log('OK: よく使うメモを変更')

const start = source.indexOf('function buildEstimateRows(')
const end = source.indexOf('\nfunction estimateRowsToClipboardText(', start)
if (start === -1 || end === -1) {
  console.error('見積集計処理が見つかりません。変更せず終了しました。')
  process.exit(1)
}

const newFunction = `function buildEstimateRows(records, cfRecords, softRecords, rooms, factor, pricingSettings) {
  const rows = []

  function groupByMemo(targetRecords) {
    const groups = new Map()
    targetRecords.forEach(record => {
      const memo = String(record.memo || '').trim()
      if (!groups.has(memo)) groups.set(memo, [])
      groups.get(memo).push(record)
    })
    return groups
  }

  rooms.forEach(roomName => {
    const crossDefinitions = [
      {
        parts: [roomName, '天井', 'クロス貼替'],
        records: records.filter(record =>
          record.room === roomName && record.type === '天井'
        ),
        amountForRecord: record =>
          getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['天井'] || 0),
      },
      {
        parts: [roomName, '壁', 'クロス貼替'],
        records: records.filter(record =>
          record.room === roomName && record.type === '壁'
        ),
        amountForRecord: record =>
          getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['壁'] || 0),
      },
      {
        parts: [roomName, '収納', 'クロス貼替'],
        records: records.filter(record =>
          record.room === roomName &&
          (record.type === '収納天井' || record.type === '収納壁')
        ),
        amountForRecord: record =>
          getRecordQuantity(record) * factor * Number(pricingSettings.crossRates[record.type] || 0),
        storage: true,
      },
    ]

    crossDefinitions.forEach(definition => {
      groupByMemo(definition.records).forEach((groupRecords, inputMemo) => {
        const quantity = groupRecords.reduce(
          (sum, record) => sum + getRecordQuantity(record), 0
        ) * factor
        if (quantity <= 0) return
        const amount = groupRecords.reduce(
          (sum, record) => sum + definition.amountForRecord(record), 0
        )
        const memo = definition.storage
          ? ['天井壁', inputMemo].filter(Boolean).join('・')
          : inputMemo
        rows.push({
          room: roomName,
          parts: definition.parts,
          memo,
          category: 'cross',
          quantity,
          unit: '㎡',
          rate: quantity > 0 ? amount / quantity : 0,
          amount,
        })
      })
    })

    const roomCfRecords = cfRecords.filter(record => record.room === roomName)
    groupByMemo(roomCfRecords).forEach((groupRecords, memo) => {
      const quantity = groupRecords.reduce(
        (sum, record) => sum + getLengthQuantity(record), 0
      )
      if (quantity <= 0) return
      const rate = Number(pricingSettings.cfRate || 0)
      rows.push({
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

  // ソフト巾木も、メモなしは全室合算、メモありはメモごとに別行にします。
  groupByMemo(softRecords).forEach((groupRecords, memo) => {
    const quantity = groupRecords.reduce(
      (sum, record) => sum + getSoftBaseboardQuantity(record), 0
    )
    if (quantity <= 0) return
    const rate = Number(pricingSettings.softRate || 0)
    rows.push({
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

  return rows.map(row => ({
    ...row,
    label: row.parts.join(' '),
  }))
}
`

source = source.slice(0, start) + newFunction + source.slice(end)

if (source === original) {
  console.error('変更がありません。処理を中止しました。')
  process.exit(1)
}

fs.writeFileSync(file, source, 'utf8')
console.log('OK: メモなしを部屋・箇所ごとに合算')
console.log('OK: メモありをメモごとの別項目として出力')
console.log('OK: 同じメモは同じ項目として合算')
console.log('OK: 収納は「天井壁」＋入力メモで出力')
console.log('OK: CFは部屋ごと、メモごとに集計')
console.log('OK: ソフト巾木は全室合計、メモありはメモごとに別行')
console.log('完了: 次に npm run build を実行してください。')
