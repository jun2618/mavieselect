const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-measurement-excel-layout-v2')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const original = source

function replaceOnce(oldText, newText, label) {
  const count = source.split(oldText).length - 1
  if (count !== 1) {
    console.error(`置換失敗: ${label}（一致数: ${count}）`)
    process.exit(1)
  }
  source = source.replace(oldText, newText)
  console.log('OK: ' + label)
}

replaceOnce(
`    const lastColumn = columns.length

    worksheet.mergeCells(1, 1, 1, lastColumn)`,
`    const lastColumn = columns.length
    // タイトルと物件情報は最低6列分の表示幅を確保する。
    // ソフト巾木のようにデータ列が3列しかなくても文字を切らさない。
    const displayLastColumn = Math.max(lastColumn, 6)

    worksheet.mergeCells(1, 1, 1, displayLastColumn)`,
'タイトル表示幅を最低6列に拡張'
)

replaceOnce(
`      worksheet.mergeCells(rowNumber, 2, rowNumber, lastColumn)`,
`      worksheet.mergeCells(rowNumber, 2, rowNumber, displayLastColumn)`,
'物件情報の表示幅を最低6列に拡張'
)

// title alignment may already have horizontal:left from previous patch, support either state.
if (source.includes("titleCell.alignment = { vertical: 'middle' }")) {
  source = source.replace(
    "titleCell.alignment = { vertical: 'middle' }",
    "titleCell.alignment = { vertical: 'middle', horizontal: 'left' }"
  )
  console.log('OK: タイトルを左揃え')
}

const oldValueBlock = `      const valueCell = worksheet.getCell(rowNumber, 2)
      valueCell.value = value
      valueCell.font = { name: 'Yu Gothic' }`
const newValueBlock = `      const valueCell = worksheet.getCell(rowNumber, 2)
      valueCell.value = value
      valueCell.font = { name: 'Yu Gothic' }
      valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
      labelCell.alignment = { vertical: 'middle', horizontal: 'left' }`

if (source.includes(oldValueBlock)) {
  source = source.replace(oldValueBlock, newValueBlock)
  console.log('OK: 物件情報を左揃え')
} else if (source.includes("valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }")) {
  source = source.replace(
    "valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }",
    "valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }"
  )
  console.log('OK: 物件情報左揃えを維持し折返しを解除')
} else {
  console.error('物件情報セルの設定箇所が見つかりません。')
  process.exit(1)
}

// 列全体のalignment設定後に、物件情報セルへ左揃えを再適用する。
// これにより「数量」などの列設定が管理会社・物件名へ波及しない。
const insertionAnchor = `    rows.forEach(row => {
      const dataRow = worksheet.addRow(row)`
if (!source.includes(insertionAnchor)) {
  console.error('データ行の追加位置が見つかりません。')
  process.exit(1)
}

// Insert just before rows.forEach; this is after metadata setup and before column widths, so additionally
// force alignment after width loop via a block before function closes.
const widthEndCandidates = [
`    if (name === 'ソフト巾木') {
      worksheet.getColumn(1).width = Math.max(12, worksheet.getColumn(1).width || 0)
      worksheet.getColumn(2).width = Math.max(10, worksheet.getColumn(2).width || 0)
      worksheet.getColumn(3).width = Math.max(10, worksheet.getColumn(3).width || 0)
    }`,
`    for (let columnIndex = 1; columnIndex <= lastColumn; columnIndex += 1) {`
]

if (source.includes(widthEndCandidates[0])) {
  source = source.replace(widthEndCandidates[0], widthEndCandidates[0] + `

    // 列書式より優先して、物件情報は常にB列の左端から表示する。
    metadata.forEach(([, value], index) => {
      const rowNumber = index + 3
      const valueCell = worksheet.getCell(rowNumber, 2)
      valueCell.value = value
      valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
    })`)
  console.log('OK: 列書式後に物件情報の左揃えを再適用')
} else {
  // Locate end of width loop by a reliable statement that precedes rows export completion.
  const marker = `      column.alignment = {`
  const start = source.indexOf(marker, source.indexOf('function addWorksheet'))
  if (start === -1) {
    console.error('列幅調整処理が見つかりません。')
    process.exit(1)
  }
  const loopClose = source.indexOf('\n    }', source.indexOf('wrapText:', start))
  if (loopClose === -1) {
    console.error('列幅調整処理の終了位置が見つかりません。')
    process.exit(1)
  }
  const insertAt = loopClose + '\n    }'.length
  const block = `

    // 列書式より優先して、物件情報は常にB列の左端から表示する。
    metadata.forEach(([, value], index) => {
      const rowNumber = index + 3
      const valueCell = worksheet.getCell(rowNumber, 2)
      valueCell.value = value
      valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
    })`
  source = source.slice(0, insertAt) + block + source.slice(insertAt)
  console.log('OK: 物件情報の左揃えを再適用')
}

// ソフト巾木は3列だけなので、明示的に十分な幅を保証。
if (!source.includes("if (name === 'ソフト巾木')")) {
  const headerAnchor = `    worksheet.autoFilter = {
      from: { row: 8, column: 1 },
      to: { row: 8, column: lastColumn },
    }`
  replaceOnce(
    headerAnchor,
    headerAnchor + `

    if (name === 'ソフト巾木') {
      worksheet.getColumn(1).width = 16
      worksheet.getColumn(2).width = 12
      worksheet.getColumn(3).width = 12
    }`,
    'ソフト巾木の列幅を確保'
  )
} else {
  source = source.replace(
    /if \(name === 'ソフト巾木'\) \{[\s\S]*?\n    \}/,
`if (name === 'ソフト巾木') {
      worksheet.getColumn(1).width = Math.max(16, worksheet.getColumn(1).width || 0)
      worksheet.getColumn(2).width = Math.max(12, worksheet.getColumn(2).width || 0)
      worksheet.getColumn(3).width = Math.max(12, worksheet.getColumn(3).width || 0)
    }`
  )
  console.log('OK: ソフト巾木の列幅を16/12/12以上に拡張')
}

if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, source, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('完了: 物件情報左揃え + ソフト巾木表示幅を修正しました。')
console.log('次に npm run build を実行してください。')
