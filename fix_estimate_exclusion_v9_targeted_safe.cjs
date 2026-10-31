const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-estimate-exclusion-v9'
const marker = 'M-CROSS_ESTIMATE_EXCLUSION_V9_TARGETED_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 見積除外V9は適用済みです。')
  process.exit(0)
}

const additionalMapAnchor = "                      rows: additionalWorks.map((item, additionalWorkIndex) => ({"
const filterWithKey = "              const estimateRows = allEstimateRows.filter(row => !estimateEdits[row.exclusionKey || estimateEditKey(row)]?.excluded)"
const filterWithoutKey = "              const estimateRows = allEstimateRows.filter(row => !estimateEdits[estimateEditKey(row)]?.excluded)"
const excludeSaveAnchor = "[form.key]: { ...(previous[form.key] || {}), excluded: true },"
const restoreStart = "                  {Object.values(estimateEdits).some(edit => edit && typeof edit === 'object' && edit.excluded) && ("
const versionPanelAnchor = "                  <EstimateVersionPanel"

if (!source.includes(additionalMapAnchor)) fail('内装工事以外の行生成が見つかりません。')
if (!source.includes(filterWithKey) && !source.includes(filterWithoutKey)) fail('現在の除外フィルターが見つかりません。')
if (!source.includes(restoreStart)) fail('現在の「すべて見積へ戻す」欄が見つかりません。')
if (!source.includes(versionPanelAnchor)) fail('EstimateVersionPanel位置が見つかりません。')

fs.copyFileSync(appPath, backupPath)

try {
  // 1) その他工事に、編集画面のform.keyと同じ安定キーを持たせる。
  const exclusionKeyLine = "                        exclusionKey: 'additionalWork:' + (item.id || additionalWorkIndex),"
  if (!source.includes(exclusionKeyLine)) {
    source = source.replace(additionalMapAnchor, additionalMapAnchor + '\n' + exclusionKeyLine)
  }

  // 2) その他工事はexclusionKey、通常項目はestimateEditKeyで除外判定。
  if (source.includes(filterWithoutKey)) {
    source = source.replace(filterWithoutKey, filterWithKey)
  }

  // 3) 除外時に編集画面の値も保持。後で戻しても0円にしない。
  if (source.includes(excludeSaveAnchor)) {
    source = source.replace(excludeSaveAnchor, `[form.key]: {
                          ...(previous[form.key] || {}),
                          parts: Array.isArray(form.parts) ? [...form.parts] : (previous[form.key]?.parts || []),
                          memo: form.memo ?? previous[form.key]?.memo ?? '',
                          quantity: form.quantity ?? previous[form.key]?.quantity ?? '',
                          unit: form.unit ?? previous[form.key]?.unit ?? '',
                          rate: form.rate ?? previous[form.key]?.rate ?? '',
                          amount: form.amount ?? previous[form.key]?.amount ?? '',
                          excluded: true,
                        },`)
  }

  // 4) 「すべて戻す」だけを、項目ごとの復元一覧へ置換。
  //    見積行のonClickには一切触れない。
  const restoreIndex = source.indexOf(restoreStart)
  const panelIndex = source.indexOf(versionPanelAnchor, restoreIndex)
  if (restoreIndex < 0 || panelIndex < 0) throw new Error('復元欄の置換範囲を特定できません。')

  const individualRestore = `                  {/* ${marker} */}
                  {Object.entries(estimateEdits).some(([, edit]) => edit && typeof edit === 'object' && edit.excluded) && (
                    <div className="estimateExcludedRestoreV9">
                      <strong>見積から外した項目</strong>
                      {Object.entries(estimateEdits)
                        .filter(([, edit]) => edit && typeof edit === 'object' && edit.excluded)
                        .map(([key, edit]) => (
                          <div className="estimateExcludedRestoreItemV9" key={key}>
                            <span>{Array.isArray(edit.parts) && edit.parts.filter(Boolean).length
                              ? edit.parts.filter(Boolean).join(' ')
                              : (key.startsWith('additionalWork:') ? '内装工事以外の項目' : '見積項目')}</span>
                            <button type="button" onClick={() => {
                              setEstimateEdits(previous => {
                                const next = { ...previous }
                                const restored = { ...(next[key] || {}) }
                                delete restored.excluded
                                if (Object.keys(restored).length > 0) next[key] = restored
                                else delete next[key]
                                try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                                return next
                              })
                              setIsDirty(true)
                              setSaveStatus('選んだ項目を見積へ戻しました')
                            }}>↩ この項目を戻す</button>
                          </div>
                        ))}
                    </div>
                  )}

`

  source = source.slice(0, restoreIndex) + individualRestore + source.slice(panelIndex)

  // 5) 既存のApp内styleへ見た目だけ追加。タップ処理には触れない。
  const styleAnchor = '/* M-CROSS_ESTIMATE_NUMBERS_LARGE_V1 */'
  if (!source.includes(styleAnchor)) throw new Error('見積CSSの挿入位置が見つかりません。')
  source = source.replace(styleAnchor, `/* ${marker} */
.estimateExcludedRestoreV9{display:grid;gap:8px;margin:12px 0;padding:12px;border:1px dashed rgba(90,120,170,.35);border-radius:12px}
.estimateExcludedRestoreItemV9{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid rgba(90,120,170,.14)}
.estimateExcludedRestoreItemV9 button{min-height:38px;padding:7px 11px;border:1px solid rgba(90,120,170,.3);border-radius:9px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}
@media(max-width:700px){.estimateExcludedRestoreItemV9{align-items:stretch;flex-direction:column}.estimateExcludedRestoreItemV9 button{width:100%}}
${styleAnchor}`)

  fs.writeFileSync(appPath, source, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 見積除外V9を適用し、ビルド成功を確認しました。')
  console.log('  - 見積行のタップ処理は変更していません')
  console.log('  - 内装工事以外も除外可能')
  console.log('  - 復元は1項目ずつ')
  console.log('  - 数量・単価・金額を保持')
  console.log('  - 元データは削除しません')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
