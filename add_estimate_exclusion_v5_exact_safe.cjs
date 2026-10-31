const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const editorPath = path.join(root, 'src', 'EstimateRowEditor.jsx')
const cssPath = path.join(root, 'src', 'EstimateRowEditor.css')
const appBackup = appPath + '.before-estimate-exclusion-v5'
const editorBackup = editorPath + '.before-estimate-exclusion-v5'
const cssBackup = cssPath + '.before-estimate-exclusion-v5'
const marker = 'M-CROSS_ESTIMATE_EXCLUSION_V5_EXACT_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

for (const file of [appPath, editorPath, cssPath]) {
  if (!fs.existsSync(file)) fail(path.basename(file) + ' が見つかりません。')
}

let app = fs.readFileSync(appPath, 'utf8')
let editor = fs.readFileSync(editorPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')

if (app.includes(marker) || editor.includes(marker)) {
  console.log('SKIP: 見積除外V5は適用済みです。')
  process.exit(0)
}

const rowsAnchor = "              const estimateRows = openedEstimateRows ?? applyEstimateEdits(rawEstimateRows, estimateEdits)"
const editorCallAnchor = `                  <EstimateRowEditor
                    value={estimateEditor}
                    onClose={() => setEstimateEditor(null)}`
const editorSignature = `export default function EstimateRowEditor({ value, onClose, onSave, onReset }) {`
const editorActions = `        <div className="estimateEditorActions">
          <button type="button" className="secondaryButton" onClick={() => onReset(form.key)}>元に戻す</button>
          <button type="button" className="primary" onClick={() => onSave(form)}>変更を保存</button>
        </div>`

for (const [label, token, text] of [
  ['estimateRows生成', rowsAnchor, app],
  ['EstimateRowEditor呼出し', editorCallAnchor, app],
  ['EstimateRowEditor関数定義', editorSignature, editor],
  ['EstimateRowEditor操作欄', editorActions, editor],
]) {
  const count = text.split(token).length - 1
  if (count !== 1) fail(label + 'の一致数が ' + count + ' 件です。変更していません。')
}

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(editorPath, editorBackup)
fs.copyFileSync(cssPath, cssBackup)

try {
  // 既存estimateEditsに excluded:true を保持。採寸データには触れない。
  app = app.replace(rowsAnchor, `              /* ${marker} */
              const allEstimateRows = openedEstimateRows ?? applyEstimateEdits(rawEstimateRows, estimateEdits)
              const estimateRows = allEstimateRows.filter(row => !estimateEdits[estimateEditKey(row)]?.excluded)`)

  // 編集画面へ「見積から外す」処理を渡す。
  app = app.replace(editorCallAnchor, `                  <EstimateRowEditor
                    value={estimateEditor}
                    onClose={() => setEstimateEditor(null)}
                    onExclude={form => {
                      if (!form?.key) return
                      if (!window.confirm('この項目を見積から外しますか？\\n採寸データは削除されません。')) return
                      setEstimateEdits(previous => {
                        const next = {
                          ...previous,
                          [form.key]: { ...(previous[form.key] || {}), excluded: true },
                        }
                        try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                        return next
                      })
                      setEstimateEditor(null)
                      setIsDirty(true)
                      setSaveStatus('見積から項目を外しました。採寸データは残っています。')
                    }}`)

  // 除外項目をすべて戻す操作。既存の編集値は維持し、excludedだけ削除。
  const restoreBlock = `                  {Object.values(estimateEdits).some(edit => edit && typeof edit === 'object' && edit.excluded) && (
                    <div className="estimateExcludedRestoreV4">
                      <span>見積から外した項目があります</span>
                      <button type="button" onClick={() => {
                        setEstimateEdits(previous => {
                          const next = Object.fromEntries(Object.entries(previous).map(([key, edit]) => {
                            if (!edit || typeof edit !== 'object' || Array.isArray(edit)) return [key, edit]
                            const restored = { ...edit }
                            delete restored.excluded
                            return [key, restored]
                          }))
                          try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                          return next
                        })
                        setIsDirty(true)
                        setSaveStatus('見積から外した項目をすべて戻しました')
                      }}>↩ すべて見積へ戻す</button>
                    </div>
                  )}

${editorCallAnchor}`
  app = app.replace(editorCallAnchor, restoreBlock)

  // EstimateRowEditor 実コードへ正確に追加。
  editor = editor.replace(editorSignature, `/* ${marker} */
export default function EstimateRowEditor({ value, onClose, onSave, onReset, onExclude }) {`)

  editor = editor.replace(editorActions, `        <div className="estimateEditorActions">
          <button type="button" className="secondaryButton" onClick={() => onReset(form.key)}>元に戻す</button>
          <button type="button" className="primary" onClick={() => onSave(form)}>変更を保存</button>
        </div>
        {onExclude && (
          <button type="button" className="estimateEditorExcludeV4" onClick={() => onExclude(form)}>
            🗑 見積から外す
          </button>
        )}`)

  css += `
/* ${marker} */
.estimateEditorExcludeV4{width:100%;min-height:46px;margin-top:12px;border:1px solid rgba(190,45,65,.42);border-radius:12px;background:rgba(190,45,65,.08);color:#b4233a;font:inherit;font-weight:850;cursor:pointer}
.estimateExcludedRestoreV4{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;padding:12px;border:1px dashed rgba(90,120,170,.36);border-radius:12px;background:rgba(127,127,127,.05)}
.estimateExcludedRestoreV4 span{font-weight:800}.estimateExcludedRestoreV4 button{min-height:40px;padding:8px 12px;border:1px solid rgba(90,120,170,.3);border-radius:9px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}
@media(max-width:620px){.estimateExcludedRestoreV4{align-items:stretch;flex-direction:column}.estimateExcludedRestoreV4 button{width:100%}}
`

  fs.writeFileSync(appPath, app, 'utf8')
  fs.writeFileSync(editorPath, editor, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 実コード対応の見積除外V5を適用し、ビルド成功を確認しました。')
  console.log('採寸データは削除せず、estimateEditsのexcludedフラグだけを保存します。')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(editorBackup)) fs.copyFileSync(editorBackup, editorPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
