const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-material-excel-backup'

let s = fs.readFileSync(file, 'utf8')

const marker = '/* M-CROSS_CF_MATERIAL_EXCEL_V1 */'

if (s.includes(marker)) {
  console.log('CF材料発注のExcel出力はすでに追加済みです')
  process.exit(0)
}

if (!s.includes('cfMaterialGroups')) {
  console.error(
    'cfMaterialGroupsが見つかりません。変更しませんでした。'
  )
  process.exit(1)
}

const target =
  `  addWorksheet('CF', 'FF6E91E8', ['部屋名', 'メモ', '長さ', '本数', '数量'], cfRows)`

const count = s.split(target).length - 1

if (count !== 1) {
  console.error(
    'CFシートの出力位置が' +
    count +
    '件でした。変更しませんでした。'
  )
  process.exit(1)
}

const replacement = `${target}

  /* M-CROSS_CF_MATERIAL_EXCEL_V1 */
  const cfMaterialRows = (entry.cfMaterialGroups || [])
    .map((group, index) => {
      const groupRecords = (entry.cfRecords || []).filter(record =>
        Array.isArray(group.recordIds)
          && group.recordIds.includes(record.id)
      )

      if (groupRecords.length === 0) return null

      const roomNames = [
        ...new Set(
          groupRecords
            .map(record => record.room || '')
            .filter(Boolean)
        ),
      ]

      const calculatedLength = groupRecords.reduce(
        (sum, record) => sum + getLengthQuantity(record),
        0
      )

      const recordDetails = groupRecords
        .map(record => {
          const roomName = record.room || '部屋未設定'
          const length = Number(record.length || 0)
          const recordCount = Number(record.count || 0)
          const quantity = getLengthQuantity(record)
          const memoText = record.memo
            ? '（' + record.memo + '）'
            : ''

          return (
            roomName +
            ' ' +
            formatQuantity(length) +
            'm × ' +
            formatQuantity(recordCount) +
            '本 = ' +
            formatQuantity(quantity) +
            'm' +
            memoText
          )
        })
        .join(' / ')

      const numericOrderLength = Number(group.orderLength)

      return [
        'CF材料' + (index + 1),
        roomNames.join(' ＋ '),
        recordDetails,
        Number(formatQuantity(calculatedLength)),
        Number.isFinite(numericOrderLength)
          ? numericOrderLength
          : Number(formatQuantity(calculatedLength)),
        group.productCode || '',
      ]
    })
    .filter(Boolean)

  if (cfMaterialRows.length > 0) {
    addWorksheet(
      'CF材料発注',
      'FF3FA7D6',
      [
        '材料名',
        '組み合わせ',
        '採寸内訳',
        '計算長',
        '注文長',
        '品番・商品名',
      ],
      cfMaterialRows
    )
  }`

fs.copyFileSync(file, backup)

s = s.replace(target, replacement)

fs.writeFileSync(file, s, 'utf8')

console.log('CF材料発注のExcel出力を追加しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')