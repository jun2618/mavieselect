const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-template-output-v2')
const marker = '/* M-CROSS_ESTIMATE_TEMPLATE_OUTPUT_V2_SAFE */'
const originalSignature = 'async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')

if (source.includes(marker)) {
  console.log('SKIP: テンプレート出力V2はすでに適用済みです。')
  process.exit(0)
}

if (!source.includes('/* M-CROSS_CROSS_CF_PACKAGE_V3 */')) {
  console.error('ERROR: クロス・CF一式工事V3が見つかりません。ファイルは変更していません。')
  process.exit(1)
}

const signatureIndex = source.indexOf(originalSignature)
if (signatureIndex < 0) {
  console.error('ERROR: downloadEstimateExcel関数が見つかりません。ファイルは変更していません。')
  process.exit(1)
}

fs.copyFileSync(target, backup)

// 既存関数は削除せず、名前だけ変更して安全に残す。
source = source.slice(0, signatureIndex)
  + source.slice(signatureIndex).replace(
      originalSignature,
      'async function downloadEstimateExcelLegacy(entry, rows, format, additionalWorks = []) {',
    )

const safeFunction = `${marker}
async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {
  try {
    const baseRows = Array.isArray(rows) ? rows : []
    const convertedRows = applyCrossCfPackageRulesV3(baseRows)

    const additionalRows = (Array.isArray(additionalWorks) ? additionalWorks : []).map(item => ({
      parts: [item.room || '', item.work || ''].filter(Boolean),
      memo: item.memo || '',
      category: 'additionalWork',
      quantity: Number(item.quantity || 0),
      unit: item.unit || '式',
      rate: item.unitPrice === '' || item.unitPrice == null ? '' : Number(item.unitPrice || 0),
      amount: item.unitPrice === '' || item.unitPrice == null
        ? ''
        : Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
    }))

    const outputRows = [...convertedRows, ...additionalRows]
    if (!outputRows.length) {
      window.alert('出力できる見積項目がありません。')
      return
    }
    if (outputRows.length > 32) {
      window.alert('見積明細は32行まで出力できます。現在 ' + outputRows.length + '行あります。')
      return
    }

    const populateModule = await import('xlsx-populate/browser/xlsx-populate.min.js')
    const XlsxPopulate = populateModule.default || globalThis.XlsxPopulate || populateModule
    if (!XlsxPopulate?.fromDataAsync) throw new Error('xlsx-populateブラウザ版を初期化できません')

    const templateResponse = await fetch(
      new URL('/mcross-estimate-template.xlsx', window.location.origin),
      { cache: 'no-store' },
    )
    if (!templateResponse.ok) {
      throw new Error('見積書テンプレートを読み込めません HTTP ' + templateResponse.status)
    }

    const workbook = await XlsxPopulate.fromDataAsync(await templateResponse.arrayBuffer())
    const ws = workbook.sheet('見積書')
    if (!ws) throw new Error('「見積書」シートが見つかりません')

    // 元テンプレートの書式、ロゴ、罫線、列幅、行高、印刷設定は維持する。
    ws.cell('B5').value(entry?.company ? entry.company + '　御中' : '')
    ws.cell('J5').value(new Date()).style('numberFormat', 'yyyy年m月d日')
    ws.cell('D13').value(entry?.propertyName || '')
    ws.cell('F13').value(entry?.unit || '')
    ws.cell('G13').value(entry?.unit ? '号室' : '')
    ws.cell('D14').value(entry?.address || '')

    for (let rowNumber = 23; rowNumber <= 54; rowNumber += 1) {
      for (const column of ['C', 'F', 'H', 'I', 'J', 'K']) {
        ws.cell(column + rowNumber).value('')
      }
    }

    function joinedParts(row) {
      if (!Array.isArray(row?.parts)) return String(row?.label || row?.name || '').trim()
      return row.parts.map(value => String(value || '').trim()).filter(Boolean).join('　')
    }

    function cellValue(value) {
      if (value === '' || value == null) return ''
      const numeric = Number(value)
      return Number.isFinite(numeric) ? numeric : value
    }

    outputRows.forEach((row, index) => {
      const rowNumber = 23 + index
      ws.cell('C' + rowNumber).value(joinedParts(row))
      ws.cell('F' + rowNumber).value(row?.memo || '')
      ws.cell('H' + rowNumber).value(cellValue(row?.quantity))
      ws.cell('I' + rowNumber).value(row?.unit || '')
      ws.cell('J' + rowNumber).value(cellValue(row?.rate))
      ws.cell('K' + rowNumber).value(cellValue(row?.amount))
    })

    const subtotal = outputRows.reduce((sum, row) => {
      if (row?.amount === '' || row?.amount == null) return sum
      const amount = Number(row.amount)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0)
    const tax = Math.floor(subtotal * 0.1)
    const total = subtotal + tax
    ws.cell('K55').value(subtotal)
    ws.cell('K56').value(tax)
    ws.cell('K57').value(total)
    ws.cell('E19').value(total)

    const output = await workbook.outputAsync()
    const blob = output instanceof Blob
      ? output
      : new Blob([output], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = [entry?.propertyName || '物件', entry?.unit ? entry.unit + '号室' : '']
      .filter(Boolean)
      .join('_')
      .replace(/[\\/:*?"<>|]/g, '_')
    link.href = url
    link.download = '見積書_' + safeName + '.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error(error)
    window.alert(error instanceof Error ? error.message : '見積書を出力できませんでした。')
  }
}

`

// 新関数は旧関数の直前へ追加。JSXや他の関数の範囲には触れない。
const legacyIndex = source.indexOf('async function downloadEstimateExcelLegacy(')
source = source.slice(0, legacyIndex) + safeFunction + source.slice(legacyIndex)
fs.writeFileSync(target, source, 'utf8')

console.log('OK: 安全版テンプレート出力V2を適用しました。')
console.log('  - 既存関数はdownloadEstimateExcelLegacyとして保持')
console.log('  - 新しいdownloadEstimateExcelを旧関数の直前へ追加')
console.log('  - JSXや後続コードは置換しません')
console.log('  - V3一式行の単価・金額は空欄')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
