const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-template-output-v1')
const marker = '/* M-CROSS_ESTIMATE_TEMPLATE_OUTPUT_V1 */'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')

if (source.includes(marker)) {
  console.log('SKIP: テンプレート見積出力V1はすでに適用済みです。')
  process.exit(0)
}

const functionName = 'downloadEstimateExcel'
const functionMarker = `async function ${functionName}(`
const start = source.indexOf(functionMarker)
if (start < 0) {
  console.error('ERROR: downloadEstimateExcel関数が見つかりません。変更していません。')
  process.exit(1)
}

function findFunctionEnd(text, startIndex) {
  const braceStart = text.indexOf('{', startIndex)
  if (braceStart < 0) throw new Error('関数開始位置を検出できません。')

  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let i = braceStart; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]

    if (lineComment) {
      if (ch === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false
        i += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '/' && next === '/') {
      lineComment = true
      i += 1
      continue
    }
    if (ch === '/' && next === '*') {
      blockComment = true
      i += 1
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '{') depth += 1
    if (ch === '}') {
      depth -= 1
      if (depth === 0) return i + 1
    }
  }
  throw new Error('関数終了位置を検出できません。')
}

const end = findFunctionEnd(source, start)
fs.copyFileSync(target, backup)

const replacement = `${marker}
async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {
  try {
    const convertedRows = typeof applyCrossCfPackageRulesV3 === 'function'
      ? applyCrossCfPackageRulesV3(Array.isArray(rows) ? rows : [])
      : (Array.isArray(rows) ? rows : [])

    const additionalRows = (Array.isArray(additionalWorks) ? additionalWorks : []).map(item => ({
      parts: [item.room || '', item.work || ''].filter(Boolean),
      memo: item.memo || '',
      category: 'additionalWork',
      quantity: Number(item.quantity || 0),
      unit: item.unit || '式',
      rate: item.unitPrice === '' || item.unitPrice == null ? '' : Number(item.unitPrice || 0),
      amount: item.amount === '' || item.amount == null
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
    if (!XlsxPopulate?.fromDataAsync) {
      throw new Error('xlsx-populateブラウザ版を初期化できません')
    }

    const templateResponse = await fetch(
      new URL('/mcross-estimate-template.xlsx', window.location.origin),
      { cache: 'no-store' }
    )
    if (!templateResponse.ok) {
      throw new Error('見積書テンプレートを読み込めません HTTP ' + templateResponse.status)
    }

    const workbook = await XlsxPopulate.fromDataAsync(await templateResponse.arrayBuffer())
    const ws = workbook.sheet('見積書')
    if (!ws) throw new Error('「見積書」シートが見つかりません')

    // テンプレートのロゴ、会社情報、罫線、列幅、行高、印刷設定は維持する。
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

    function itemName(row) {
      return Array.isArray(row?.parts)
        ? row.parts.map(value => String(value || '').trim()).filter(Boolean).join('　')
        : String(row?.label || row?.name || row?.item || '').trim()
    }

    function excelValue(value) {
      if (value === '' || value == null) return ''
      const numeric = Number(value)
      return Number.isFinite(numeric) ? numeric : value
    }

    outputRows.forEach((row, index) => {
      const rowNumber = 23 + index
      ws.cell('C' + rowNumber).value(itemName(row))
      ws.cell('F' + rowNumber).value(row?.memo || '')
      ws.cell('H' + rowNumber).value(excelValue(row?.quantity))
      ws.cell('I' + rowNumber).value(row?.unit || '')
      ws.cell('J' + rowNumber).value(excelValue(row?.rate))
      ws.cell('K' + rowNumber).value(excelValue(row?.amount))
    })

    // 合計欄は、出力時点で金額が入っている行だけを集計する。
    const subtotal = outputRows.reduce((sum, row) => {
      const value = Number(row?.amount)
      return sum + (Number.isFinite(value) ? value : 0)
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
}`

source = source.slice(0, start) + replacement + source.slice(end)
fs.writeFileSync(target, source, 'utf8')

console.log('OK: 見積用Excel出力を既存テンプレート方式へ変更しました。')
console.log('  - テンプレート: public/mcross-estimate-template.xlsx')
console.log('  - シート: 見積書')
console.log('  - 明細: 23行目から54行目まで')
console.log('  - V3の一式行は単価・金額を空欄で出力')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
