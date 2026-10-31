const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-row-tap-edit-v1')
const marker = 'M-CROSS_ESTIMATE_ROW_TAP_EDIT_V1'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}
let source = fs.readFileSync(target, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 概算明細タップ編集V1は適用済みです。')
  process.exit(0)
}

const helperAnchor = 'export default function App() {'
const stateAnchor = `  const [unit, setUnit] = useState('')
  const [siteMemo, setSiteMemo] = useState('')`
const rowsAnchor = '              const estimateRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)'
const rowDivAnchor = `                          <div className="estimateRow" key={row.category + '-' + row.label + '-' + row.memo + '-' + index}>`

for (const [label, anchor] of [
  ['App開始位置', helperAnchor],
  ['案件state', stateAnchor],
  ['概算行生成', rowsAnchor],
  ['概算行表示', rowDivAnchor],
]) {
  if (!source.includes(anchor)) {
    console.error('ERROR: ' + label + 'が見つかりません。App.jsxは変更していません。')
    process.exit(1)
  }
}

fs.copyFileSync(target, backup)

const helpers = `/* ${marker} */
function estimateOverrideRowKey(row) {
  return [
    row?.category || '',
    row?.room || '',
    Array.isArray(row?.parts) ? row.parts.join('|') : (row?.label || ''),
    row?.memo || '',
  ].join('::')
}

function applyEstimatePriceOverrides(rows, overrides) {
  const sourceRows = Array.isArray(rows) ? rows : []
  const map = overrides && typeof overrides === 'object' ? overrides : {}
  return sourceRows.map(row => {
    const key = estimateOverrideRowKey(row)
    if (!Object.prototype.hasOwnProperty.call(map, key)) return row
    const rate = Math.max(0, Number(map[key]) || 0)
    const quantity = Number(row?.quantity) || 0
    return { ...row, rate, amount: quantity * rate }
  })
}

function readEstimatePriceOverrides(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

`
source = source.replace(helperAnchor, helpers + helperAnchor)

const stateReplacement = `  const [unit, setUnit] = useState('')
  const [siteMemo, setSiteMemo] = useState('')
  const [estimatePriceOverrides, setEstimatePriceOverrides] = useState({})
  const estimateOverrideStorageKey = 'mcross:estimate-price-overrides:' + [company, selectedProperty?.name || '', unit].join('|')
  useEffect(() => {
    if (!company || !selectedProperty?.name || !String(unit || '').trim()) {
      setEstimatePriceOverrides({})
      return
    }
    setEstimatePriceOverrides(readEstimatePriceOverrides(estimateOverrideStorageKey))
  }, [estimateOverrideStorageKey])`
source = source.replace(stateAnchor, stateReplacement)

const rowsReplacement = `              const baseEstimateRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)
              const estimateRows = applyEstimatePriceOverrides(baseEstimateRows, estimatePriceOverrides)`
source = source.replace(rowsAnchor, rowsReplacement)

const rowDivReplacement = `                          <div
                            className="estimateRow estimateRowEditable"
                            key={row.category + '-' + row.label + '-' + row.memo + '-' + index}
                            role="button"
                            tabIndex={0}
                            title="タップして単価を編集"
                            onClick={() => {
                              const rowKey = estimateOverrideRowKey(row)
                              const currentRate = Number(row.rate || 0)
                              const input = window.prompt(
                                (row.label || '概算項目') + '\\n単価または1式金額を入力してください。\\n空欄でキャンセル、0で金額を0円にします。',
                                String(currentRate || '')
                              )
                              if (input === null || String(input).trim() === '') return
                              const nextRate = Number(String(input).replace(/,/g, ''))
                              if (!Number.isFinite(nextRate) || nextRate < 0) {
                                window.alert('0以上の金額を数字で入力してください。')
                                return
                              }
                              setEstimatePriceOverrides(previous => {
                                const next = { ...previous, [rowKey]: nextRate }
                                try { localStorage.setItem(estimateOverrideStorageKey, JSON.stringify(next)) } catch {}
                                return next
                              })
                              setIsDirty(true)
                              setSaveStatus('概算単価を変更しました')
                            }}
                            onKeyDown={event => {
                              if (event.key === 'Enter' || event.key === ' ') event.currentTarget.click()
                            }}
                          >`
source = source.replace(rowDivAnchor, rowDivReplacement)

// 視認性とタップ可能表示はApp.cssへ追記する方が安全。
fs.writeFileSync(target, source, 'utf8')

const cssPath = path.join(process.cwd(), 'src', 'App.css')
if (fs.existsSync(cssPath)) {
  const cssBackup = path.join(process.cwd(), 'src', 'App.css.before-estimate-row-tap-edit-v1')
  let css = fs.readFileSync(cssPath, 'utf8')
  if (!css.includes(marker)) {
    fs.copyFileSync(cssPath, cssBackup)
    css += `\n/* ${marker} */\n.estimateRowEditable{cursor:pointer;border-radius:10px;transition:background .15s ease,transform .15s ease}.estimateRowEditable:hover,.estimateRowEditable:focus-visible{background:rgba(38,114,236,.09);outline:2px solid rgba(38,114,236,.42);outline-offset:2px}.estimateRowEditable:active{transform:scale(.997)}\n`
    fs.writeFileSync(cssPath, css, 'utf8')
  }
}

console.log('OK: 概算明細をタップして単価・1式金額を編集できるようにしました。')
console.log('  - 通常項目: 数量 × 編集単価で再計算')
console.log('  - 1式行: 入力値がそのまま1式金額')
console.log('  - 概算合計とExcel出力へ反映')
console.log('  - 案件ごとにlocalStorageへ保持')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
