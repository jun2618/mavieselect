const fs = require('fs')
const path = require('path')

const appPath = path.join(process.cwd(), 'src', 'App.jsx')
const cssPath = path.join(process.cwd(), 'src', 'App.css')
const appBackup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-full-editor-v4')
const cssBackup = path.join(process.cwd(), 'src', 'App.css.before-estimate-full-editor-v4')
const marker = 'M-CROSS_ESTIMATE_FULL_EDITOR_V4_SAFE'

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。')
  process.exit(1)
}

let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 見積明細フル編集V4は適用済みです。')
  process.exit(0)
}
if (!source.includes('M-CROSS_ESTIMATE_ROW_TAP_EDIT_V2_SAFE')) {
  console.error('ERROR: 概算明細タップ編集V2が見つかりません。変更していません。')
  process.exit(1)
}

const oldApply = `function applyEstimateEdits(rows, edits) {
  const map = edits && typeof edits === 'object' ? edits : {}
  return (Array.isArray(rows) ? rows : []).map(row => {
    const key = estimateEditKey(row)
    if (!Object.prototype.hasOwnProperty.call(map, key)) return row
    const rate = Math.max(0, Number(map[key]) || 0)
    const quantity = Number(row?.quantity) || 0
    return { ...row, rate, amount: quantity * rate }
  })
}`

const newApply = `/* ${marker} */
function applyEstimateEdits(rows, edits) {
  const map = edits && typeof edits === 'object' ? edits : {}
  return (Array.isArray(rows) ? rows : []).map(row => {
    const key = estimateEditKey(row)
    if (!Object.prototype.hasOwnProperty.call(map, key)) return row
    const edit = map[key]
    if (!edit || typeof edit !== 'object' || Array.isArray(edit)) {
      const rate = Math.max(0, Number(edit) || 0)
      const quantity = Number(row?.quantity) || 0
      return { ...row, rate, amount: quantity * rate }
    }
    const parts = Array.isArray(edit.parts) ? edit.parts.map(value => String(value ?? '')) : row.parts
    const quantity = edit.quantity === '' ? '' : Math.max(0, Number(edit.quantity) || 0)
    const rate = edit.rate === '' ? '' : Math.max(0, Number(edit.rate) || 0)
    const amount = edit.amountMode === 'manual'
      ? (edit.amount === '' ? '' : Math.max(0, Number(edit.amount) || 0))
      : (quantity === '' || rate === '' ? '' : Number(quantity) * Number(rate))
    return {
      ...row,
      parts,
      label: parts.filter(Boolean).join(' '),
      memo: String(edit.memo ?? row.memo ?? ''),
      quantity,
      unit: String(edit.unit ?? row.unit ?? ''),
      rate,
      amount,
      estimateEdited: true,
    }
  })
}`

const stateAnchor = "  const [showEstimate, setShowEstimate] = useState(false)"
const stateInsert = `${stateAnchor}
  const [estimateEditor, setEstimateEditor] = useState(null)`

const rowOpenStart = `                          <div
                            className="estimateRow estimateRowTapEdit"`
const rowOpenEnd = `                          >`
const rowStart = source.indexOf(rowOpenStart)
const rowEnd = source.indexOf(rowOpenEnd, rowStart)

const modalAnchor = `                  <div className="estimateTotal">`

if (!source.includes(oldApply)) {
  console.error('ERROR: V2の編集反映関数が見つかりません。変更していません。')
  process.exit(1)
}
if (!source.includes(stateAnchor)) {
  console.error('ERROR: showEstimate stateが見つかりません。変更していません。')
  process.exit(1)
}
if (rowStart < 0 || rowEnd < 0) {
  console.error('ERROR: 現在の概算行タップ処理が見つかりません。変更していません。')
  process.exit(1)
}
if (!source.includes(modalAnchor)) {
  console.error('ERROR: 概算合計欄が見つかりません。変更していません。')
  process.exit(1)
}

fs.copyFileSync(appPath, appBackup)
if (fs.existsSync(cssPath)) fs.copyFileSync(cssPath, cssBackup)

source = source.replace(oldApply, newApply)
source = source.replace(stateAnchor, stateInsert)

const oldOpening = source.slice(rowStart, rowEnd + rowOpenEnd.length)
const newOpening = `                          <div
                            className="estimateRow estimateRowTapEdit"
                            key={row.category + '-' + row.label + '-' + row.memo + '-' + index}
                            role={row.category === 'additionalWork' ? undefined : 'button'}
                            tabIndex={row.category === 'additionalWork' ? undefined : 0}
                            title={row.category === 'additionalWork' ? undefined : 'タップして見積明細を編集'}
                            onClick={() => {
                              if (row.category === 'additionalWork') return
                              const key = estimateEditKey(row)
                              const saved = estimateEdits[key]
                              const base = saved && typeof saved === 'object' && !Array.isArray(saved)
                                ? saved
                                : {
                                    parts: Array.isArray(row.parts) ? row.parts : [row.label || ''],
                                    memo: row.memo || '',
                                    quantity: row.quantity ?? '',
                                    unit: row.unit || '',
                                    rate: row.rate ?? '',
                                    amount: row.amount ?? '',
                                    amountMode: 'auto',
                                  }
                              setEstimateEditor({
                                key,
                                parts: [0, 1, 2, 3].map(i => String(base.parts?.[i] || '')),
                                memo: String(base.memo || ''),
                                quantity: String(base.quantity ?? ''),
                                unit: String(base.unit || ''),
                                rate: String(base.rate ?? ''),
                                amount: base.amountMode === 'manual' ? String(base.amount ?? '') : '',
                                amountMode: base.amountMode === 'manual' ? 'manual' : 'auto',
                              })
                            }}
                            onKeyDown={event => {
                              if (row.category !== 'additionalWork' && (event.key === 'Enter' || event.key === ' ')) {
                                event.preventDefault()
                                event.currentTarget.click()
                              }
                            }}
                          >`
source = source.replace(oldOpening, newOpening)

const modal = `                  {estimateEditor && (
                    <div className="estimateEditorBackdrop" onClick={() => setEstimateEditor(null)}>
                      <section className="estimateEditorPanel" role="dialog" aria-modal="true" aria-label="見積明細を編集" onClick={event => event.stopPropagation()}>
                        <div className="estimateEditorHeader">
                          <div><strong>見積明細を編集</strong><small>採寸データは変更せず、見積だけ変更します</small></div>
                          <button type="button" onClick={() => setEstimateEditor(null)} aria-label="閉じる">×</button>
                        </div>
                        <div className="estimateEditorGrid">
                          {[0, 1, 2, 3].map(partIndex => (
                            <label key={partIndex}><span>項目{partIndex + 1}</span><input value={estimateEditor.parts[partIndex]} onChange={event => setEstimateEditor(previous => ({ ...previous, parts: previous.parts.map((value, index) => index === partIndex ? event.target.value : value) }))} /></label>
                          ))}
                          <label className="wide"><span>メモ・仕様</span><input value={estimateEditor.memo} onChange={event => setEstimateEditor(previous => ({ ...previous, memo: event.target.value }))} /></label>
                          <label><span>数量</span><input inputMode="decimal" value={estimateEditor.quantity} onChange={event => setEstimateEditor(previous => ({ ...previous, quantity: event.target.value }))} /></label>
                          <label><span>単位</span><input value={estimateEditor.unit} onChange={event => setEstimateEditor(previous => ({ ...previous, unit: event.target.value }))} /></label>
                          <label><span>単価</span><input inputMode="numeric" value={estimateEditor.rate} onChange={event => setEstimateEditor(previous => ({ ...previous, rate: event.target.value }))} /></label>
                          <label><span>金額</span><input inputMode="numeric" value={estimateEditor.amount} onChange={event => setEstimateEditor(previous => ({ ...previous, amount: event.target.value, amountMode: event.target.value.trim() ? 'manual' : 'auto' }))} placeholder="空欄なら数量×単価" /></label>
                        </div>
                        <div className="estimateEditorActions">
                          <button type="button" className="secondaryButton" onClick={() => {
                            setEstimateEdits(previous => {
                              const next = { ...previous }
                              delete next[estimateEditor.key]
                              try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                              return next
                            })
                            setEstimateEditor(null)
                            setIsDirty(true)
                            setSaveStatus('見積明細を元に戻しました')
                          }}>元に戻す</button>
                          <button type="button" className="primary" onClick={() => {
                            const parseNumber = value => {
                              const text = String(value || '').replace(/,/g, '').trim()
                              if (!text) return ''
                              const number = Number(text)
                              return Number.isFinite(number) && number >= 0 ? number : null
                            }
                            const quantity = parseNumber(estimateEditor.quantity)
                            const rate = parseNumber(estimateEditor.rate)
                            const amount = parseNumber(estimateEditor.amount)
                            if (quantity === null || rate === null || amount === null) {
                              window.alert('数量・単価・金額は0以上の数字で入力してください。')
                              return
                            }
                            const edit = {
                              parts: estimateEditor.parts.map(value => String(value || '').trim()),
                              memo: String(estimateEditor.memo || '').trim(),
                              quantity,
                              unit: String(estimateEditor.unit || '').trim(),
                              rate,
                              amount,
                              amountMode: estimateEditor.amountMode,
                            }
                            setEstimateEdits(previous => {
                              const next = { ...previous, [estimateEditor.key]: edit }
                              try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                              return next
                            })
                            setEstimateEditor(null)
                            setIsDirty(true)
                            setSaveStatus('見積明細を変更しました')
                          }}>変更を保存</button>
                        </div>
                      </section>
                    </div>
                  )}

${modalAnchor}`
source = source.replace(modalAnchor, modal)
fs.writeFileSync(appPath, source, 'utf8')

if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8')
  if (!css.includes(marker)) {
    css += `
/* ${marker} */
.estimateEditorBackdrop{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.58)}
.estimateEditorPanel{width:min(720px,100%);max-height:90vh;overflow:auto;padding:20px;border-radius:18px;background:#fff;color:#182230;box-shadow:0 24px 80px rgba(0,0,0,.36)}
.estimateEditorHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.estimateEditorHeader strong,.estimateEditorHeader small{display:block}.estimateEditorHeader small{margin-top:4px;opacity:.72}.estimateEditorHeader>button{width:42px;height:42px;border:0;border-radius:50%;font-size:24px}
.estimateEditorGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.estimateEditorGrid label{display:grid;gap:6px}.estimateEditorGrid .wide{grid-column:1/-1}.estimateEditorGrid input{width:100%;box-sizing:border-box}
.estimateEditorActions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.estimateEditorActions button{min-width:130px}
.theme-dark .estimateEditorPanel,.theme-cyber .estimateEditorPanel,.theme-luxury .estimateEditorPanel,.theme-retro .estimateEditorPanel,.theme-galaxy .estimateEditorPanel{background:#101827;color:#f7fbff}
@media(max-width:620px){.estimateEditorBackdrop{padding:0;place-items:stretch}.estimateEditorPanel{width:100%;height:100%;max-height:none;border-radius:0;box-sizing:border-box;padding:16px}.estimateEditorGrid{grid-template-columns:1fr}.estimateEditorGrid .wide{grid-column:auto}.estimateEditorActions{position:sticky;bottom:0;padding-top:12px;background:inherit}.estimateEditorActions button{min-width:0;flex:1}}
`
    fs.writeFileSync(cssPath, css, 'utf8')
  }
}

console.log('OK: 見積明細フル編集V4を適用しました。')
console.log('  - 項目1～4、メモ、数量、単位、単価、金額を編集')
console.log('  - 金額空欄なら数量×単価、入力時は直接指定')
console.log('  - 元に戻す対応')
console.log('  - 概算合計とテンプレートExcelへ編集内容を反映')
console.log('BACKUP: ' + appBackup)
console.log('NEXT: npm run build')
