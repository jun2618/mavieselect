const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-estimate-row-exclusion-v2'
const cssBackup = cssPath + '.before-estimate-row-exclusion-v2'
const marker = 'M-CROSS_ESTIMATE_ROW_EXCLUSION_V2_EXACT'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath) || !fs.existsSync(cssPath)) fail('src/App.jsx または src/App.css が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 見積項目除外V2は適用済みです。'); process.exit(0) }

const stateAnchor = "  const [estimateEdits, setEstimateEdits] = useState({})"
const rowsAnchor = "              const estimateRows = openedEstimateRows ?? applyEstimateEdits(rawEstimateRows, estimateEdits)"
const rowMapAnchor = "                        {section.rows.map((row, index) => ("
const rowClassAnchor = '                            className="estimateRow estimateRowTapEdit"'
const totalAnchor = '                  <div className="estimateTotal">'

for (const [name, token] of [
  ['estimateEdits state', stateAnchor],
  ['estimateRows生成', rowsAnchor],
  ['見積行map', rowMapAnchor],
  ['見積行class', rowClassAnchor],
  ['合計欄', totalAnchor],
]) {
  if (!app.includes(token)) fail(name + 'が見つかりません。変更していません。')
}

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(cssPath, cssBackup)

try {
  app = app.replace(stateAnchor, `${stateAnchor}
  /* ${marker} */
  const [estimateExcludedKeys, setEstimateExcludedKeys] = useState({})
  const estimateExcludedStorageKey = 'mcross:estimate-excluded:' + [company, selectedProperty?.name || '', String(unit || '').trim(), String(workName || '').trim() || '原状回復工事', openedEstimateVersion || 'current'].join('|')
  useEffect(() => {
    try {
      const loaded = JSON.parse(localStorage.getItem(estimateExcludedStorageKey) || '{}')
      setEstimateExcludedKeys(loaded && typeof loaded === 'object' && !Array.isArray(loaded) ? loaded : {})
    } catch { setEstimateExcludedKeys({}) }
  }, [estimateExcludedStorageKey])`)

  app = app.replace(rowsAnchor, `              const allEstimateRows = openedEstimateRows ?? applyEstimateEdits(rawEstimateRows, estimateEdits)
              const estimateRows = allEstimateRows.filter(row => !estimateExcludedKeys[estimateEditKey(row)])`)

  // Locate the exact outer estimate-row block, then add the button immediately before its closing div.
  const mapStart = app.indexOf(rowMapAnchor)
  const mapEnd = app.indexOf('                        ))}', mapStart)
  if (mapStart < 0 || mapEnd < 0) throw new Error('見積行mapの終了位置が見つかりません。')
  const outerDivClose = app.lastIndexOf('                          </div>', mapEnd)
  if (outerDivClose < mapStart) throw new Error('見積行divの終了位置が見つかりません。')

  const excludeButton = `                          <button
                            className="estimateExcludeButton"
                            type="button"
                            onClick={event => {
                              event.stopPropagation()
                              if (!window.confirm('この項目を見積から外しますか？\\n採寸データは削除されません。')) return
                              const key = estimateEditKey(row)
                              const next = { ...estimateExcludedKeys, [key]: true }
                              setEstimateExcludedKeys(next)
                              localStorage.setItem(estimateExcludedStorageKey, JSON.stringify(next))
                              setSaveStatus('見積から項目を外しました。採寸データは残っています。')
                              setIsDirty(true)
                            }}
                          >見積から外す</button>
`
  app = app.slice(0, outerDivClose) + excludeButton + app.slice(outerDivClose)

  const restoreBox = `                  {Object.keys(estimateExcludedKeys).length > 0 && (
                    <div className="estimateExcludedBox">
                      <div><strong>見積から外した項目</strong><small>{Object.keys(estimateExcludedKeys).length}件あります。採寸データは残っています。</small></div>
                      <button type="button" onClick={() => {
                        setEstimateExcludedKeys({})
                        localStorage.removeItem(estimateExcludedStorageKey)
                        setSaveStatus('見積から外した項目をすべて戻しました')
                        setIsDirty(true)
                      }}>↩ すべて見積へ戻す</button>
                    </div>
                  )}

${totalAnchor}`
  app = app.replace(totalAnchor, restoreBox)

  css += `
/* ${marker} */
.estimateRow{position:relative}
.estimateExcludeButton{grid-column:1/-1;justify-self:start;margin-top:7px;padding:7px 11px;border:1px solid rgba(190,45,65,.35);border-radius:9px;background:rgba(190,45,65,.07);color:#b4233a;font:inherit;font-size:12px;font-weight:850;cursor:pointer}
.estimateExcludedBox{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0;padding:13px;border:1px dashed rgba(90,120,170,.38);border-radius:12px;background:rgba(127,127,127,.05)}
.estimateExcludedBox strong,.estimateExcludedBox small{display:block}.estimateExcludedBox small{margin-top:3px;opacity:.72}.estimateExcludedBox button{min-height:40px;padding:8px 12px;border:1px solid rgba(90,120,170,.3);border-radius:9px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}
@media(max-width:700px){.estimateExcludeButton{flex:0 0 auto!important;width:auto!important;min-height:38px}.estimateExcludedBox{align-items:stretch;flex-direction:column}.estimateExcludedBox button{width:100%}}
`

  fs.writeFileSync(appPath, app, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 見積項目だけを外すV2を適用し、ビルド成功を確認しました。')
  console.log('採寸データは削除しません。除外項目は「すべて見積へ戻す」で復元できます。')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
