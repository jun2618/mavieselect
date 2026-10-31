const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const editorPath = path.join(root, 'src', 'EstimateRowEditor.jsx')
const appBackup = appPath + '.before-estimate-full-editor-v5'
const cssBackup = cssPath + '.before-estimate-full-editor-v5'
const marker = 'M-CROSS_ESTIMATE_FULL_EDITOR_V5_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
if (!fs.existsSync(cssPath)) fail('src/App.css が見つかりません。')

let app = fs.readFileSync(appPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')
if (app.includes(marker)) {
  console.log('SKIP: 見積明細フル編集V5は適用済みです。')
  process.exit(0)
}
if (!app.includes('M-CROSS_ESTIMATE_ROW_TAP_EDIT_V2_SAFE')) fail('概算明細タップ編集V2が見つかりません。変更していません。')
if (fs.existsSync(editorPath)) fail('src/EstimateRowEditor.jsx がすでに存在します。勝手に上書きしません。')

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(cssPath, cssBackup)

const component = `import { useEffect, useState } from 'react'
import './EstimateRowEditor.css'

export default function EstimateRowEditor({ value, onClose, onSave, onReset }) {
  const [form, setForm] = useState(value)
  useEffect(() => setForm(value), [value])
  if (!form) return null
  const setField = (field, next) => setForm(previous => ({ ...previous, [field]: next }))
  const setPart = (index, next) => setForm(previous => ({
    ...previous,
    parts: previous.parts.map((value, partIndex) => partIndex === index ? next : value),
  }))
  return (
    <div className="estimateEditorBackdrop" onClick={onClose}>
      <section className="estimateEditorPanel" role="dialog" aria-modal="true" aria-label="見積明細を編集" onClick={event => event.stopPropagation()}>
        <div className="estimateEditorHeader">
          <div><strong>見積明細を編集</strong><small>採寸データは変更せず、見積だけ変更します</small></div>
          <button type="button" onClick={onClose} aria-label="閉じる">×</button>
        </div>
        <div className="estimateEditorGrid">
          {form.parts.map((part, index) => <label key={index}><span>項目{index + 1}</span><input value={part} onChange={event => setPart(index, event.target.value)} /></label>)}
          <label className="wide"><span>メモ・仕様</span><input value={form.memo} onChange={event => setField('memo', event.target.value)} /></label>
          <label><span>数量</span><input inputMode="decimal" value={form.quantity} onChange={event => setField('quantity', event.target.value)} /></label>
          <label><span>単位</span><input value={form.unit} onChange={event => setField('unit', event.target.value)} /></label>
          <label><span>単価</span><input inputMode="numeric" value={form.rate} onChange={event => setField('rate', event.target.value)} /></label>
          <label><span>金額</span><input inputMode="numeric" value={form.amount} onChange={event => setField('amount', event.target.value)} placeholder="空欄なら数量×単価" /></label>
        </div>
        <div className="estimateEditorActions">
          <button type="button" className="secondaryButton" onClick={() => onReset(form.key)}>元に戻す</button>
          <button type="button" className="primary" onClick={() => onSave(form)}>変更を保存</button>
        </div>
      </section>
    </div>
  )
}
`
const editorCss = `/* ${marker} */
.estimateEditorBackdrop{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.58)}
.estimateEditorPanel{width:min(720px,100%);max-height:90vh;overflow:auto;padding:20px;border-radius:18px;background:#fff;color:#182230;box-shadow:0 24px 80px rgba(0,0,0,.36)}
.estimateEditorHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.estimateEditorHeader strong,.estimateEditorHeader small{display:block}.estimateEditorHeader small{margin-top:4px;opacity:.72}.estimateEditorHeader>button{width:42px;height:42px;border:0;border-radius:50%;font-size:24px}
.estimateEditorGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.estimateEditorGrid label{display:grid;gap:6px}.estimateEditorGrid .wide{grid-column:1/-1}.estimateEditorGrid input{width:100%;box-sizing:border-box}
.estimateEditorActions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.estimateEditorActions button{min-width:130px}
.theme-dark .estimateEditorPanel,.theme-cyber .estimateEditorPanel,.theme-luxury .estimateEditorPanel,.theme-retro .estimateEditorPanel,.theme-galaxy .estimateEditorPanel{background:#101827;color:#f7fbff}
@media(max-width:620px){.estimateEditorBackdrop{padding:0;place-items:stretch}.estimateEditorPanel{width:100%;height:100%;max-height:none;border-radius:0;box-sizing:border-box;padding:16px}.estimateEditorGrid{grid-template-columns:1fr}.estimateEditorGrid .wide{grid-column:auto}.estimateEditorActions{position:sticky;bottom:0;padding-top:12px;background:inherit}.estimateEditorActions button{min-width:0;flex:1}}
`

function replaceOnce(text, oldText, newText, label) {
  const first = text.indexOf(oldText)
  if (first < 0) throw new Error(label + 'が見つかりません。')
  if (text.indexOf(oldText, first + oldText.length) >= 0) throw new Error(label + 'が複数見つかりました。')
  return text.slice(0, first) + newText + text.slice(first + oldText.length)
}

try {
  app = replaceOnce(app, "import OneDriveSyncPanel from './OneDriveSyncPanel'", "import OneDriveSyncPanel from './OneDriveSyncPanel'\nimport EstimateRowEditor from './EstimateRowEditor'", 'import位置')
  app = replaceOnce(app, "  const [showEstimate, setShowEstimate] = useState(false)", "  const [showEstimate, setShowEstimate] = useState(false)\n  const [estimateEditor, setEstimateEditor] = useState(null)", 'showEstimate state')

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
      return { ...row, rate, amount: (Number(row?.quantity) || 0) * rate }
    }
    const parts = Array.isArray(edit.parts) ? edit.parts : row.parts
    const quantity = edit.quantity === '' ? '' : Math.max(0, Number(edit.quantity) || 0)
    const rate = edit.rate === '' ? '' : Math.max(0, Number(edit.rate) || 0)
    const amount = edit.amountMode === 'manual' ? Math.max(0, Number(edit.amount) || 0) : (quantity === '' || rate === '' ? '' : quantity * rate)
    return { ...row, parts, label: parts.filter(Boolean).join(' '), memo: edit.memo ?? row.memo ?? '', quantity, unit: edit.unit ?? row.unit ?? '', rate, amount }
  })
}`
  app = replaceOnce(app, oldApply, newApply, 'V2編集反映関数')

  const clickStart = app.indexOf('                            onClick={() => {\n                              if (row.category === \'additionalWork\') return')
  if (clickStart < 0) throw new Error('概算行onClickが見つかりません。')
  const keyDownStart = app.indexOf('                            onKeyDown={event => {', clickStart)
  if (keyDownStart < 0) throw new Error('概算行onKeyDownが見つかりません。')
  const clickReplacement = `                            onClick={() => {
                              if (row.category === 'additionalWork') return
                              const key = estimateEditKey(row)
                              const saved = estimateEdits[key]
                              const edit = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
                              const parts = Array.isArray(edit.parts) ? edit.parts : (Array.isArray(row.parts) ? row.parts : [row.label || ''])
                              setEstimateEditor({
                                key,
                                parts: [0,1,2,3].map(index => String(parts[index] || '')),
                                memo: String(edit.memo ?? row.memo ?? ''),
                                quantity: String(edit.quantity ?? row.quantity ?? ''),
                                unit: String(edit.unit ?? row.unit ?? ''),
                                rate: String(edit.rate ?? row.rate ?? ''),
                                amount: edit.amountMode === 'manual' ? String(edit.amount ?? '') : '',
                              })
                            }}
`
  app = app.slice(0, clickStart) + clickReplacement + app.slice(keyDownStart)

  const totalAnchor = '                  <div className="estimateTotal">'
  const editorJsx = `                  <EstimateRowEditor
                    value={estimateEditor}
                    onClose={() => setEstimateEditor(null)}
                    onReset={key => {
                      setEstimateEdits(previous => {
                        const next = { ...previous }
                        delete next[key]
                        try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                        return next
                      })
                      setEstimateEditor(null)
                      setIsDirty(true)
                      setSaveStatus('見積明細を元に戻しました')
                    }}
                    onSave={form => {
                      const parseNumber = value => {
                        const text = String(value || '').replace(/,/g, '').trim()
                        if (!text) return ''
                        const number = Number(text)
                        return Number.isFinite(number) && number >= 0 ? number : null
                      }
                      const quantity = parseNumber(form.quantity)
                      const rate = parseNumber(form.rate)
                      const amount = parseNumber(form.amount)
                      if (quantity === null || rate === null || amount === null) {
                        window.alert('数量・単価・金額は0以上の数字で入力してください。')
                        return
                      }
                      const edit = { parts: form.parts.map(value => String(value || '').trim()), memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount, amountMode: amount === '' ? 'auto' : 'manual' }
                      setEstimateEdits(previous => {
                        const next = { ...previous, [form.key]: edit }
                        try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                        return next
                      })
                      setEstimateEditor(null)
                      setIsDirty(true)
                      setSaveStatus('見積明細を変更しました')
                    }}
                  />

${totalAnchor}`
  app = replaceOnce(app, totalAnchor, editorJsx, '概算合計欄')

  fs.writeFileSync(editorPath, component, 'utf8')
  fs.writeFileSync(path.join(root, 'src', 'EstimateRowEditor.css'), editorCss, 'utf8')
  fs.writeFileSync(appPath, app, 'utf8')

  console.log('変更を適用しました。続けて自動ビルド確認を行います。')
  cp.execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: root, stdio: 'inherit' })
  console.log('OK: 見積明細フル編集V5を適用し、ビルド成功を確認しました。')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  if (fs.existsSync(editorPath)) fs.unlinkSync(editorPath)
  const editorCssPath = path.join(root, 'src', 'EstimateRowEditor.css')
  if (fs.existsSync(editorCssPath)) fs.unlinkSync(editorCssPath)
  process.exit(1)
}
