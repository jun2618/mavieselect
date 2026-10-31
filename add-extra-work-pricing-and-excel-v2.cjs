const fs = require('fs')
const path = require('path')
const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-extra-work-pricing-v2')
if (!fs.existsSync(file)) { console.error('見つかりません: ' + file); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const original = s
function rep(a,b,label){const c=s.split(a).length-1;if(c!==1){console.error(`置換失敗: ${label}（一致数: ${c}）`);process.exit(1)}s=s.replace(a,b);console.log('OK: '+label)}
if(!s.includes('function FinalReviewPage(')){console.error('先に最終確認画面を追加してください。');process.exit(1)}

rep("  const [unit, setUnit] = useState('式')\n  const [memo, setMemo] = useState('')","  const [unit, setUnit] = useState('式')\n  const [unitPrice, setUnitPrice] = useState('')\n  const [memo, setMemo] = useState('')",'単価state')
rep(`    const numericQuantity = Number(quantity)
    if (!room || !work.trim() || !Number.isFinite(numericQuantity) || numericQuantity <= 0) return
    setAdditionalWorks(previous => [...previous, {
      id: createRecordId(), room, work: work.trim(), quantity: numericQuantity, unit, memo: memo.trim(),
    }])`,`    const numericQuantity = Number(quantity)
    const numericUnitPrice = Math.max(0, Number(unitPrice) || 0)
    if (!room || !work.trim() || !Number.isFinite(numericQuantity) || numericQuantity <= 0) return
    setAdditionalWorks(previous => [...previous, {
      id: createRecordId(), room, work: work.trim(), quantity: numericQuantity, unit,
      unitPrice: numericUnitPrice, amount: numericQuantity * numericUnitPrice, memo: memo.trim(),
    }])`,'単価と金額を物件へ保存')
rep("    setQuantity('1')\n    setMemo('')","    setQuantity('1')\n    setUnitPrice('')\n    setMemo('')",'単価リセット')
rep(`<div className="additionalWorkGrid">
            <label><span>数量</span><input type="number" min="0.1" step="0.1" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
            <label><span>単位</span><select value={unit} onChange={event => setUnit(event.target.value)}>{['式','個','本','枚','台','箇所'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label><span>メモ</span><input value={memo} onChange={event => setMemo(event.target.value)} placeholder="任意" /></label>
          </div>`,`<div className="additionalWorkGrid">
            <label><span>数量</span><input type="number" min="0.1" step="0.1" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
            <label><span>単位</span><select value={unit} onChange={event => setUnit(event.target.value)}>{['式','個','本','枚','台','箇所'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label><span>単価（円）</span><input type="number" min="0" step="1" value={unitPrice} onChange={event => setUnitPrice(event.target.value)} placeholder="0" /></label>
            <label><span>金額</span><input type="text" readOnly value={formatYen((Number(quantity) || 0) * (Number(unitPrice) || 0))} /></label>
            <label><span>メモ</span><input value={memo} onChange={event => setMemo(event.target.value)} placeholder="任意" /></label>
          </div>`,'単価・金額入力欄')
rep("<b>{formatQuantity(item.quantity)}{item.unit}</b>","<div><b>{formatQuantity(item.quantity)}{item.unit}</b><small>{formatYen(Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</small></div>",'登録済み金額表示')

// Estimate Excel combined rows.
rep('async function downloadEstimateExcel(entry, rows, format) {','async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {','Excel引数')
rep("    if (!rows.length) {\n      window.alert('出力できる見積項目がありません。')","    if (!rows.length && !additionalWorks.length) {\n      window.alert('出力できる見積項目がありません。')",'追加作業だけでも出力')
rep(`    const maxParts = format === 'split'
      ? Math.max(...rows.map(row => row.parts.length))
      : 1`,`    const estimateOutputRows = [
      ...rows,
      ...additionalWorks.map(item => ({
        room: item.room || '',
        parts: [item.room || '', item.work || '', ''],
        memo: item.memo || '',
        category: 'additionalWork',
        quantity: Number(item.quantity || 0),
        unit: item.unit || '式',
        rate: Number(item.unitPrice || 0),
        amount: Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
      })),
    ]
    const maxParts = format === 'split'
      ? Math.max(1, ...estimateOutputRows.map(row => row.parts.length))
      : 1`,'追加作業を見積最後へ結合')
rep('    const outputRows = rows.map(row => {','    const outputRows = estimateOutputRows.map(row => {','結合行を出力')
rep("    const unitColumnIndex = maxParts + spacerCount + 3\n    const lastColumn = unitColumnIndex","    const unitColumnIndex = maxParts + spacerCount + 3\n    const unitPriceColumnIndex = unitColumnIndex + 1\n    const amountColumnIndex = unitColumnIndex + 2\n    const lastColumn = amountColumnIndex",'単価・金額列位置')
rep(`        Number(formatQuantity(row.quantity)),
        row.unit,
      ]`,`        Number(formatQuantity(row.quantity)),
        row.unit,
        Number(row.rate || 0),
        Number(row.amount || 0),
      ]`,'Excel行へ単価・金額')
rep("    headers.push('メモ', '数量', '単位')","    headers.push('メモ', '数量', '単位', '単価', '金額')",'Excel見出し')
rep("      dataRow.getCell(quantityColumnIndex).numFmt = '0.0'","      dataRow.getCell(quantityColumnIndex).numFmt = '0.0'\n      dataRow.getCell(unitPriceColumnIndex).numFmt = '#,##0'\n      dataRow.getCell(amountColumnIndex).numFmt = '#,##0'",'金額書式')
rep('                    }, estimateRows, estimateCopyFormat)}','                    }, estimateRows, estimateCopyFormat, additionalWorks)}','見積Excel呼出し')

// Measurement Excel extra sheet.
const floor=`  if (floorTrimRows.length > 0) addWorksheet('床見切り', 'FFC6A4E8', ['部屋①', '部屋②', 'カラー', '数量', '単位'], floorTrimRows)`
rep(floor,`${floor}
  const additionalWorkRows = (entry.additionalWorks || []).map(item => [
    item.room || '', item.work || '', Number(item.quantity || 0), item.unit || '式',
    Number(item.unitPrice || 0), Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), item.memo || '',
  ])
  if (additionalWorkRows.length > 0) addWorksheet('追加作業', 'FFF0A36E', ['部屋', '作業内容', '数量', '単位', '単価', '金額', 'メモ'], additionalWorkRows)`,'採寸Excel追加作業シート')
rep("                  floorTrimRecords,\n                })","                  floorTrimRecords,\n                  additionalWorks,\n                })",'採寸Excel呼出し')

// Conceptual total includes extra works.
rep("              const totalAmount = estimateRows.reduce((sum, row) => sum + row.amount, 0)","              const additionalWorkTotal = additionalWorks.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)\n              const totalAmount = estimateRows.reduce((sum, row) => sum + row.amount, 0) + additionalWorkTotal",'概算合計')

if(s===original){console.error('変更なし');process.exit(1)}
fs.copyFileSync(file,backup);fs.writeFileSync(file,s,'utf8')
console.log('OK: バックアップ '+backup)
console.log('完了: 単価・金額・見積Excel・採寸Excelへ追加作業を反映')
console.log('次に npm run build を実行してください。')
