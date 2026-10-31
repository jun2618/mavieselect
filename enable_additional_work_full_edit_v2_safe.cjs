const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backup = appPath + '.before-additional-work-full-edit-v2'
const marker = 'M-CROSS_ADDITIONAL_WORK_FULL_EDIT_V2_SAFE'

function stop(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) stop('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 内装工事以外フル編集V2は適用済みです。')
  process.exit(0)
}
if (!source.includes('M-CROSS_ESTIMATE_FULL_EDITOR_V5_SAFE')) {
  stop('見積明細フル編集V5系が見つかりません。変更していません。')
}

fs.copyFileSync(appPath, backup)

function replaceOnce(text, oldText, newText, label) {
  const first = text.indexOf(oldText)
  if (first < 0) throw new Error(label + 'が見つかりません。')
  if (text.indexOf(oldText, first + oldText.length) >= 0) throw new Error(label + 'が複数見つかりました。')
  return text.slice(0, first) + newText + text.slice(first + oldText.length)
}

try {
  // 1. 概算画面の additionalWorks にID・index・4分割項目を持たせる。
  const oldMap = `rows: additionalWorks.map(item => ({
                          category: 'additionalWork',
                          label: [item.room, item.work].filter(Boolean).join(' '),
                          memo: item.memo || '',
                          quantity: Number(item.quantity || 0),
                          unit: item.unit || '式',
                          rate: Number(item.unitPrice || 0),
                          amount: Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
                        })),`

  const newMap = `rows: additionalWorks.map((item, additionalWorkIndex) => ({
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
  source = replaceOnce(source, oldMap, newMap, '追加作業の概算変換')

  // 2. 追加作業も編集パネルを開く。
  const oldClickHead = `                            onClick={() => {
                              if (row.category === 'additionalWork') return
                              const key = estimateEditKey(row)`
  const newClickHead = `                            onClick={() => {
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
  source = replaceOnce(source, oldClickHead, newClickHead, '追加作業のクリック処理')

  source = replaceOnce(source, "role={row.category === 'additionalWork' ? undefined : 'button'}", 'role="button"', 'role属性')
  source = replaceOnce(source, "tabIndex={row.category === 'additionalWork' ? undefined : 0}", 'tabIndex={0}', 'tabIndex属性')
  source = replaceOnce(source, "title={row.category === 'additionalWork' ? undefined : 'タップして見積明細を編集'}", 'title="タップして見積明細を編集"', 'title属性')
  source = replaceOnce(source, "if (row.category !== 'additionalWork' && (event.key === 'Enter' || event.key === ' '))", "if (event.key === 'Enter' || event.key === ' ')", 'キーボード操作')

  // 3. 元に戻す時は estimateParts を外して登録時の内容へ戻す。
  const oldReset = `                    onReset={key => {
                      setEstimateEdits(previous => {`
  const newReset = `                    onReset={key => {
                      if (estimateEditor?.additionalWorkId || Number.isInteger(estimateEditor?.additionalWorkIndex)) {
                        setAdditionalWorks(previous => previous.map((item, index) => {
                          const matched = estimateEditor.additionalWorkId
                            ? item.id === estimateEditor.additionalWorkId
                            : index === estimateEditor.additionalWorkIndex
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
  source = replaceOnce(source, oldReset, newReset, '元に戻す処理')

  // 4. 保存時は additionalWorks 本体を更新する。
  const oldAfterValidation = `                      const edit = { parts: form.parts.map(value => String(value || '').trim()), memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount, amountMode: amount === '' ? 'auto' : 'manual' }
                      setEstimateEdits(previous => {`
  const newAfterValidation = `                      const cleanParts = form.parts.map(value => String(value || '').trim())
                      if (form.additionalWorkId || Number.isInteger(form.additionalWorkIndex)) {
                        const finalAmount = amount === '' ? Number(quantity || 0) * Number(rate || 0) : amount
                        setAdditionalWorks(previous => previous.map((item, index) => {
                          const matched = form.additionalWorkId
                            ? item.id === form.additionalWorkId
                            : index === form.additionalWorkIndex
                          if (!matched) return item
                          return {
                            ...item,
                            room: cleanParts[0] || '',
                            work: cleanParts.slice(1).filter(Boolean).join(' ') || cleanParts[0] || '',
                            estimateParts: cleanParts,
                            memo: String(form.memo || '').trim(),
                            quantity,
                            unit: String(form.unit || '').trim(),
                            unitPrice: rate,
                            amount: finalAmount,
                          }
                        }))
                        setEstimateEditor(null)
                        setIsDirty(true)
                        setSaveStatus('追加作業の見積明細を変更しました')
                        return
                      }
                      const edit = { parts: cleanParts, memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount, amountMode: amount === '' ? 'auto' : 'manual' }
                      setEstimateEdits(previous => {`
  source = replaceOnce(source, oldAfterValidation, newAfterValidation, '追加作業の保存処理')

  // 5. テンプレートExcelにも4分割項目を渡す。
  const oldExcelParts = `      parts: [item.room || '', item.work || ''].filter(Boolean),`
  const newExcelParts = `      parts: Array.isArray(item.estimateParts) && item.estimateParts.length
        ? [0, 1, 2, 3].map(index => String(item.estimateParts[index] || ''))
        : [item.room || '', '', item.work || '', ''],`
  source = replaceOnce(source, oldExcelParts, newExcelParts, 'テンプレートExcelの追加作業parts')

  fs.writeFileSync(appPath, source, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 内装工事以外のフル編集V2を適用し、ビルド成功を確認しました。')
  console.log('  - 概算画面で追加作業をタップ編集')
  console.log('  - 項目1～4、メモ、数量、単位、単価、金額を保存')
  console.log('  - 分割Excelでは空白位置を保持')
  console.log('  - まとめExcelでは空欄を除いて結合')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  process.exit(1)
}
