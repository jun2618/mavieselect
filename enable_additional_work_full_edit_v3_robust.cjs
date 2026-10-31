const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backup = appPath + '.before-additional-work-full-edit-v3'
const marker = 'M-CROSS_ADDITIONAL_WORK_FULL_EDIT_V3_ROBUST'

function abort(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}
if (!fs.existsSync(appPath)) abort('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 内装工事以外フル編集V3は適用済みです。')
  process.exit(0)
}
if (!source.includes('M-CROSS_ESTIMATE_FULL_EDITOR_V5_SAFE')) abort('見積明細フル編集V5系が見つかりません。')
fs.copyFileSync(appPath, backup)

function replaceRegexOnce(text, regex, replacement, label) {
  const matches = [...text.matchAll(regex)]
  if (matches.length !== 1) throw new Error(label + 'の一致数が ' + matches.length + ' 件です。')
  return text.replace(regex, replacement)
}

try {
  // 現在の実コードに合わせ、空白や改行幅に依存しない正規表現で置換する。
  const mapRegex = /rows:\s*additionalWorks\.map\(item\s*=>\s*\(\{\s*category:\s*'additionalWork',\s*label:\s*\[item\.room,\s*item\.work\]\.filter\(Boolean\)\.join\(' '\),\s*memo:\s*item\.memo\s*\|\|\s*'',\s*quantity:\s*Number\(item\.quantity\s*\|\|\s*0\),\s*unit:\s*item\.unit\s*\|\|\s*'式',\s*rate:\s*Number\(item\.unitPrice\s*\|\|\s*0\),\s*amount:\s*Number\(item\.amount\s*\|\|\s*\(Number\(item\.quantity\)\s*\|\|\s*0\)\s*\*\s*\(Number\(item\.unitPrice\)\s*\|\|\s*0\)\),\s*\}\)\),/
  const mapReplacement = `rows: additionalWorks.map((item, additionalWorkIndex) => ({
                        /* ${marker} */
                        category: 'additionalWork',
                        additionalWorkId: item.id || '',
                        additionalWorkIndex,
                        parts: Array.isArray(item.estimateParts) && item.estimateParts.length
                          ? [0, 1, 2, 3].map(index => String(item.estimateParts[index] || ''))
                          : [item.room || '', '', item.work || '', ''],
                        label: (Array.isArray(item.estimateParts) && item.estimateParts.length
                          ? item.estimateParts
                          : [item.room, item.work]).filter(Boolean).join(' '),
                        memo: item.memo || '',
                        quantity: Number(item.quantity || 0),
                        unit: item.unit || '式',
                        rate: Number(item.unitPrice || 0),
                        amount: Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
                      })),`
  source = replaceRegexOnce(source, mapRegex, mapReplacement, '追加作業の概算変換')

  const clickRegex = /onClick=\{\(\)\s*=>\s*\{\s*if\s*\(row\.category\s*===\s*'additionalWork'\)\s*return\s*const key = estimateEditKey\(row\)/
  const clickReplacement = `onClick={() => {
                              if (row.category === 'additionalWork') {
                                const parts = Array.isArray(row.parts) ? row.parts : [row.label || '', '', '', '']
                                setEstimateEditor({
                                  key: 'additionalWork:' + (row.additionalWorkId || row.additionalWorkIndex),
                                  additionalWorkId: row.additionalWorkId || '',
                                  additionalWorkIndex: row.additionalWorkIndex,
                                  parts: [0, 1, 2, 3].map(index => String(parts[index] || '')),
                                  memo: String(row.memo || ''),
                                  quantity: String(row.quantity ?? ''),
                                  unit: String(row.unit || ''),
                                  rate: String(row.rate ?? ''),
                                  amount: '',
                                })
                                return
                              }
                              const key = estimateEditKey(row)`
  source = replaceRegexOnce(source, clickRegex, clickReplacement, '追加作業のクリック処理')

  source = source.replace("role={row.category === 'additionalWork' ? undefined : 'button'}", 'role="button"')
  source = source.replace("tabIndex={row.category === 'additionalWork' ? undefined : 0}", 'tabIndex={0}')
  source = source.replace("title={row.category === 'additionalWork' ? undefined : 'タップして単価を編集'}", 'title="タップして見積明細を編集"')
  source = source.replace("title={row.category === 'additionalWork' ? undefined : 'タップして見積明細を編集'}", 'title="タップして見積明細を編集"')
  source = source.replace("if (row.category !== 'additionalWork' && (event.key === 'Enter' || event.key === ' '))", "if (event.key === 'Enter' || event.key === ' ')")

  const resetAnchor = `                    onReset={key => {
                      setEstimateEdits(previous => {`
  const resetReplacement = `                    onReset={key => {
                      if (estimateEditor?.additionalWorkId || Number.isInteger(estimateEditor?.additionalWorkIndex)) {
                        setAdditionalWorks(previous => previous.map((item, index) => {
                          const matched = estimateEditor.additionalWorkId ? item.id === estimateEditor.additionalWorkId : index === estimateEditor.additionalWorkIndex
                          if (!matched) return item
                          const next = { ...item }
                          delete next.estimateParts
                          return next
                        }))
                        setEstimateEditor(null)
                        setIsDirty(true)
                        setSaveStatus('追加作業の見積明細を元に戻しました')
                        return
                      }
                      setEstimateEdits(previous => {`
  if (!source.includes(resetAnchor)) throw new Error('元に戻す処理が見つかりません。')
  source = source.replace(resetAnchor, resetReplacement)

  const saveAnchor = `                      const edit = { parts: form.parts.map(value => String(value || '').trim()), memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount, amountMode: amount === '' ? 'auto' : 'manual' }
                      setEstimateEdits(previous => {`
  const saveReplacement = `                      const cleanParts = form.parts.map(value => String(value || '').trim())
                      if (form.additionalWorkId || Number.isInteger(form.additionalWorkIndex)) {
                        const finalAmount = amount === '' ? Number(quantity || 0) * Number(rate || 0) : amount
                        setAdditionalWorks(previous => previous.map((item, index) => {
                          const matched = form.additionalWorkId ? item.id === form.additionalWorkId : index === form.additionalWorkIndex
                          if (!matched) return item
                          return { ...item, room: cleanParts[0] || '', work: cleanParts.slice(1).filter(Boolean).join(' ') || cleanParts[0] || '', estimateParts: cleanParts, memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), unitPrice: rate, amount: finalAmount }
                        }))
                        setEstimateEditor(null)
                        setIsDirty(true)
                        setSaveStatus('追加作業の見積明細を変更しました')
                        return
                      }
                      const edit = { parts: cleanParts, memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount, amountMode: amount === '' ? 'auto' : 'manual' }
                      setEstimateEdits(previous => {`
  if (!source.includes(saveAnchor)) throw new Error('編集保存処理が見つかりません。')
  source = source.replace(saveAnchor, saveReplacement)

  const excelRegex = /parts:\s*\[item\.room\s*\|\|\s*'',\s*item\.work\s*\|\|\s*''\]\.filter\(Boolean\),/
  const excelReplacement = `parts: Array.isArray(item.estimateParts) && item.estimateParts.length
        ? [0, 1, 2, 3].map(index => String(item.estimateParts[index] || ''))
        : [item.room || '', '', item.work || '', ''],`
  source = replaceRegexOnce(source, excelRegex, excelReplacement, 'テンプレートExcelの追加作業parts')

  fs.writeFileSync(appPath, source, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 内装工事以外フル編集V3を適用し、ビルド成功を確認しました。')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  process.exit(1)
}
