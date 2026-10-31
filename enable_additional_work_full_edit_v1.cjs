const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const editorPath = path.join(root, 'src', 'EstimateRowEditor.jsx')
const appBackup = appPath + '.before-additional-work-full-edit-v1'
const editorBackup = editorPath + '.before-additional-work-full-edit-v1'
const marker = 'M-CROSS_ADDITIONAL_WORK_FULL_EDIT_V1'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (!fs.existsSync(editorPath)) fail('src/EstimateRowEditor.jsx が見つかりません。先にフル編集V5.1を適用してください。')

let app = fs.readFileSync(appPath, 'utf8')
let editor = fs.readFileSync(editorPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 内装工事以外フル編集V1は適用済みです。'); process.exit(0) }
if (!app.includes('M-CROSS_ESTIMATE_FULL_EDITOR_V5_SAFE')) fail('フル編集V5系が見つかりません。変更していません。')

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(editorPath, editorBackup)

function replaceOnce(text, oldText, newText, label) {
  const pos = text.indexOf(oldText)
  if (pos < 0) throw new Error(label + 'が見つかりません。')
  if (text.indexOf(oldText, pos + oldText.length) >= 0) throw new Error(label + 'が複数見つかりました。')
  return text.slice(0, pos) + newText + text.slice(pos + oldText.length)
}

try {
  // 概算画面の追加作業行へ、元データIDと4分割項目を渡す。
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
  app = replaceOnce(app, oldMap, newMap, '追加作業の概算変換')

  // タップ時の除外をやめて、追加作業も同じ編集パネルへ送る。
  const oldClick = `                            onClick={() => {
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
                            }}`
  const newClick = `                            onClick={() => {
                              if (row.category === 'additionalWork') {
                                const parts = Array.isArray(row.parts) ? row.parts : ['', '', row.label || '', '']
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
                            }}`
  app = replaceOnce(app, oldClick, newClick, '概算行クリック処理')

  // role/tabIndex/title/key操作も追加作業で有効にする。
  app = app.replace("role={row.category === 'additionalWork' ? undefined : 'button'}", "role=\"button\"")
  app = app.replace("tabIndex={row.category === 'additionalWork' ? undefined : 0}", "tabIndex={0}")
  app = app.replace("title={row.category === 'additionalWork' ? undefined : 'タップして見積明細を編集'}", "title=\"タップして見積明細を編集\"")
  app = app.replace("if (row.category !== 'additionalWork' && (event.key === 'Enter' || event.key === ' '))", "if (event.key === 'Enter' || event.key === ' ')")

  // リセット時、追加作業なら元の追加作業データからestimatePartsだけ外す。
  const resetAnchor = `                    onReset={key => {
                      setEstimateEdits(previous => {`
  const resetReplacement = `                    onReset={key => {
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
                        setSaveStatus('追加作業の項目分けを元に戻しました')
                        return
                      }
                      setEstimateEdits(previous => {`
  app = replaceOnce(app, resetAnchor, resetReplacement, '編集リセット処理')

  // 保存時、追加作業なら元のadditionalWorksそのものを更新する。
  const saveAnchor = `                    onSave={form => {
                      const parseNumber = value => {`
  const saveReplacement = `                    onSave={form => {
                      const parseNumber = value => {`
  app = replaceOnce(app, saveAnchor, saveReplacement, '編集保存処理開始')

  const validationEnd = `                      if (quantity === null || rate === null || amount === null) {
                        window.alert('数量・単価・金額は0以上の数字で入力してください。')
                        return
                      }
                      const edit = { parts: form.parts.map(value => String(value || '').trim()), memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount, amountMode: amount === '' ? 'auto' : 'manual' }`
  const validationReplacement = `                      if (quantity === null || rate === null || amount === null) {
                        window.alert('数量・単価・金額は0以上の数字で入力してください。')
                        return
                      }
                      const cleanParts = form.parts.map(value => String(value || '').trim())
                      if (form.additionalWorkId || Number.isInteger(form.additionalWorkIndex)) {
                        const finalAmount = amount === '' ? (Number(quantity || 0) * Number(rate || 0)) : amount
                        setAdditionalWorks(previous => previous.map((item, index) => {
                          const matched = form.additionalWorkId ? item.id === form.additionalWorkId : index === form.additionalWorkIndex
                          if (!matched) return item
                          return {
                            ...item,
                            room: cleanParts[0] || '',
                            work: cleanParts.filter(Boolean).slice(1).join(' ') || cleanParts[0] || '',
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
                      const edit = { parts: cleanParts, memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount, amountMode: amount === '' ? 'auto' : 'manual' }`
  app = replaceOnce(app, validationEnd, validationReplacement, '数値検証後の保存処理')

  // テンプレートExcelへadditionalWorksの4分割項目を渡す。
  const excelPartsOld = `      parts: [item.room || '', item.work || ''].filter(Boolean),`
  const excelPartsNew = `      parts: Array.isArray(item.estimateParts) && item.estimateParts.length
        ? [0, 1, 2, 3].map(index => String(item.estimateParts[index] || ''))
        : [item.room || '', '', item.work || '', ''],`
  app = replaceOnce(app, excelPartsOld, excelPartsNew, 'テンプレートExcel追加作業parts')

  fs.writeFileSync(appPath, app, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 内装工事以外の明細編集を追加し、ビルド成功を確認しました。')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(editorBackup)) fs.copyFileSync(editorBackup, editorPath)
  process.exit(1)
}
