const fs = require('fs')
const path = require('path')

const appPath = path.join(process.cwd(), 'src', 'App.jsx')
const cssPath = path.join(process.cwd(), 'src', 'App.css')
const appBackup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-row-tap-edit-v2')
const cssBackup = path.join(process.cwd(), 'src', 'App.css.before-estimate-row-tap-edit-v2')
const marker = 'M-CROSS_ESTIMATE_ROW_TAP_EDIT_V2_SAFE'

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 概算明細タップ編集V2は適用済みです。')
  process.exit(0)
}

const appAnchor = 'export default function App() {'
const stateAnchor = "  const [showEstimate, setShowEstimate] = useState(false)"
const rowsAnchor = '              const estimateRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)'
const rowAnchor = '                          <div className="estimateRow" key={row.category + \'-\' + row.label + \'-\' + row.memo + \'-\' + index}>'

for (const [name, anchor] of [
  ['App開始位置', appAnchor],
  ['showEstimate state', stateAnchor],
  ['概算行生成', rowsAnchor],
  ['概算行表示', rowAnchor],
]) {
  if (!source.includes(anchor)) {
    console.error('ERROR: ' + name + 'が見つかりません。App.jsxは変更していません。')
    process.exit(1)
  }
}

fs.copyFileSync(appPath, appBackup)
if (fs.existsSync(cssPath)) fs.copyFileSync(cssPath, cssBackup)

const helpers = `/* ${marker} */
function estimateEditKey(row) {
  return [
    row?.category || '',
    row?.room || '',
    Array.isArray(row?.parts) ? row.parts.join('|') : (row?.label || ''),
    row?.memo || '',
  ].join('::')
}

function applyEstimateEdits(rows, edits) {
  const map = edits && typeof edits === 'object' ? edits : {}
  return (Array.isArray(rows) ? rows : []).map(row => {
    const key = estimateEditKey(row)
    if (!Object.prototype.hasOwnProperty.call(map, key)) return row
    const rate = Math.max(0, Number(map[key]) || 0)
    const quantity = Number(row?.quantity) || 0
    return { ...row, rate, amount: quantity * rate }
  })
}

function loadEstimateEdits(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

`
source = source.replace(appAnchor, helpers + appAnchor)

source = source.replace(stateAnchor, `${stateAnchor}
  const [estimateEdits, setEstimateEdits] = useState({})`)

const currentStorageLine = "  const [currentStorageKey, setCurrentStorageKey] = useState('')"
if (!source.includes(currentStorageLine)) {
  console.error('ERROR: currentStorageKey stateが見つかりません。バックアップから復元します。')
  fs.copyFileSync(appBackup, appPath)
  process.exit(1)
}
source = source.replace(currentStorageLine, `${currentStorageLine}
  const estimateEditStorageKey = 'mcross:estimate-edits:' + [company, selectedProperty?.name || '', String(unit || '').trim()].join('|')
  useEffect(() => {
    if (!company || !selectedProperty?.name || !String(unit || '').trim()) {
      setEstimateEdits({})
      return
    }
    setEstimateEdits(loadEstimateEdits(estimateEditStorageKey))
  }, [estimateEditStorageKey])`)

source = source.replace(rowsAnchor, `              const rawEstimateRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)
              const estimateRows = applyEstimateEdits(rawEstimateRows, estimateEdits)`)

const editableRow = `                          <div
                            className="estimateRow estimateRowTapEdit"
                            key={row.category + '-' + row.label + '-' + row.memo + '-' + index}
                            role={row.category === 'additionalWork' ? undefined : 'button'}
                            tabIndex={row.category === 'additionalWork' ? undefined : 0}
                            title={row.category === 'additionalWork' ? undefined : 'タップして単価を編集'}
                            onClick={() => {
                              if (row.category === 'additionalWork') return
                              const key = estimateEditKey(row)
                              const currentRate = Number(row.rate || 0)
                              const answer = window.prompt(
                                (row.label || '概算項目') + '\\n新しい単価を入力してください。\\n元の単価に戻す場合は「戻す」と入力してください。',
                                String(currentRate || '')
                              )
                              if (answer === null) return
                              const text = String(answer).trim()
                              setEstimateEdits(previous => {
                                const next = { ...previous }
                                if (text === '戻す') {
                                  delete next[key]
                                } else {
                                  const value = Number(text.replace(/,/g, ''))
                                  if (!Number.isFinite(value) || value < 0) {
                                    window.alert('0以上の金額を数字で入力してください。')
                                    return previous
                                  }
                                  next[key] = value
                                }
                                try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                                return next
                              })
                              setIsDirty(true)
                              setSaveStatus(text === '戻す' ? '概算単価を元に戻しました' : '概算単価を変更しました')
                            }}
                            onKeyDown={event => {
                              if (row.category !== 'additionalWork' && (event.key === 'Enter' || event.key === ' ')) {
                                event.preventDefault()
                                event.currentTarget.click()
                              }
                            }}
                          >`
source = source.replace(rowAnchor, editableRow)

fs.writeFileSync(appPath, source, 'utf8')

if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8')
  if (!css.includes(marker)) {
    css += `\n/* ${marker} */\n.estimateRowTapEdit[role="button"]{cursor:pointer;border-radius:10px;transition:background .15s ease,transform .15s ease}.estimateRowTapEdit[role="button"]:hover,.estimateRowTapEdit[role="button"]:focus-visible{background:rgba(38,114,236,.10);outline:2px solid rgba(38,114,236,.45);outline-offset:2px}.estimateRowTapEdit[role="button"]:active{transform:scale(.997)}\n`
    fs.writeFileSync(cssPath, css, 'utf8')
  }
}

console.log('OK: 概算明細タップ編集V2を適用しました。')
console.log('  - 明細行タップで単価編集')
console.log('  - 数量 × 編集単価で金額と合計を即時再計算')
console.log('  - 「戻す」で元の単価へ復帰')
console.log('  - 編集値は管理会社・物件・号室ごとに端末保存')
console.log('  - 見積用Excelへ編集後の単価・金額を渡します')
console.log('  - 追加作業は既存の編集画面を維持')
console.log('BACKUP: ' + appBackup)
console.log('NEXT: npm run build')
