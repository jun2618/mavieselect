const fs = require('fs')
const path = require('path')

const appPath = path.join(process.cwd(), 'src', 'App.jsx')
const cssPath = path.join(process.cwd(), 'src', 'App.css')
const appBackup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-full-row-edit-v3')
const marker = 'M-CROSS_ESTIMATE_FULL_ROW_EDIT_V3'

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。')
  process.exit(1)
}

let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 見積明細フル編集V3は適用済みです。')
  process.exit(0)
}
if (!source.includes('M-CROSS_ESTIMATE_ROW_TAP_EDIT_V2_SAFE')) {
  console.error('ERROR: 先に概算明細タップ編集V2を適用してください。変更していません。')
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
    const parts = Array.isArray(edit.parts) ? edit.parts.map(value => String(value || '')) : row.parts
    const quantity = edit.quantity === '' ? '' : Math.max(0, Number(edit.quantity) || 0)
    const rate = edit.rate === '' ? '' : Math.max(0, Number(edit.rate) || 0)
    const calculatedAmount = quantity === '' || rate === '' ? '' : Number(quantity) * Number(rate)
    const amount = edit.amountMode === 'manual'
      ? (edit.amount === '' ? '' : Math.max(0, Number(edit.amount) || 0))
      : calculatedAmount
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

if (!source.includes(oldApply)) {
  console.error('ERROR: V2の編集反映処理が見つかりません。変更していません。')
  process.exit(1)
}

const oldPromptStart = `                              const key = estimateEditKey(row)
                              const currentRate = Number(row.rate || 0)
                              const answer = window.prompt(`
const oldPromptEnd = `                              setIsDirty(true)
                              setSaveStatus(text === '戻す' ? '概算単価を元に戻しました' : '概算単価を変更しました')`

const promptStartIndex = source.indexOf(oldPromptStart)
const promptEndIndex = source.indexOf(oldPromptEnd, promptStartIndex)
if (promptStartIndex < 0 || promptEndIndex < 0) {
  console.error('ERROR: V2のタップ編集処理が見つかりません。変更していません。')
  process.exit(1)
}
const promptReplaceEnd = promptEndIndex + oldPromptEnd.length

const newPrompt = `                              const key = estimateEditKey(row)
                              const existing = estimateEdits[key]
                              const current = existing && typeof existing === 'object' && !Array.isArray(existing)
                                ? existing
                                : {
                                    parts: Array.isArray(row.parts) ? row.parts : [row.label || ''],
                                    memo: row.memo || '',
                                    quantity: row.quantity ?? '',
                                    unit: row.unit || '',
                                    rate: row.rate ?? '',
                                    amount: row.amount ?? '',
                                    amountMode: 'auto',
                                  }

                              const first = window.prompt(
                                '項目1を入力してください。\\n「戻す」でこの明細を自動生成状態へ戻します。',
                                String(current.parts?.[0] || '')
                              )
                              if (first === null) return
                              if (String(first).trim() === '戻す') {
                                setEstimateEdits(previous => {
                                  const next = { ...previous }
                                  delete next[key]
                                  try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                                  return next
                                })
                                setIsDirty(true)
                                setSaveStatus('見積明細を元に戻しました')
                                return
                              }

                              const second = window.prompt('項目2（空欄可）', String(current.parts?.[1] || ''))
                              if (second === null) return
                              const third = window.prompt('項目3（空欄可）', String(current.parts?.[2] || ''))
                              if (third === null) return
                              const fourth = window.prompt('項目4（空欄可）', String(current.parts?.[3] || ''))
                              if (fourth === null) return
                              const memoInput = window.prompt('メモ・仕様（空欄可）', String(current.memo || ''))
                              if (memoInput === null) return
                              const quantityInput = window.prompt('数量', String(current.quantity ?? ''))
                              if (quantityInput === null) return
                              const unitInput = window.prompt('単位', String(current.unit || ''))
                              if (unitInput === null) return
                              const rateInput = window.prompt('単価（空欄可）', String(current.rate ?? ''))
                              if (rateInput === null) return
                              const amountInput = window.prompt(
                                '金額を直接指定する場合は入力してください。\\n空欄なら「数量 × 単価」で自動計算します。',
                                current.amountMode === 'manual' ? String(current.amount ?? '') : ''
                              )
                              if (amountInput === null) return

                              const parseOptionalNumber = value => {
                                const text = String(value ?? '').replace(/,/g, '').trim()
                                if (!text) return ''
                                const number = Number(text)
                                return Number.isFinite(number) && number >= 0 ? number : null
                              }
                              const nextQuantity = parseOptionalNumber(quantityInput)
                              const nextRate = parseOptionalNumber(rateInput)
                              const nextAmount = parseOptionalNumber(amountInput)
                              if (nextQuantity === null || nextRate === null || nextAmount === null) {
                                window.alert('数量・単価・金額は0以上の数字で入力してください。')
                                return
                              }

                              const edit = {
                                parts: [first, second, third, fourth].map(value => String(value || '').trim()),
                                memo: String(memoInput || '').trim(),
                                quantity: nextQuantity,
                                unit: String(unitInput || '').trim(),
                                rate: nextRate,
                                amount: nextAmount,
                                amountMode: nextAmount === '' ? 'auto' : 'manual',
                              }
                              setEstimateEdits(previous => {
                                const next = { ...previous, [key]: edit }
                                try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                                return next
                              })
                              setIsDirty(true)
                              setSaveStatus('見積明細を変更しました')`

fs.copyFileSync(appPath, appBackup)
source = source.replace(oldApply, newApply)
source = source.slice(0, promptStartIndex) + newPrompt + source.slice(promptReplaceEnd)
fs.writeFileSync(appPath, source, 'utf8')

if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8')
  if (!css.includes(marker)) {
    css += `\n/* ${marker} */\n.estimateRowTapEdit[role="button"]::after{content:"タップで編集";display:inline-block;margin-left:10px;font-size:12px;font-weight:700;opacity:.62}\n`
    fs.writeFileSync(cssPath, css, 'utf8')
  }
}

console.log('OK: 見積明細フル編集V3を適用しました。')
console.log('  - 項目1～4、メモ、数量、単位、単価、金額を編集可能')
console.log('  - 金額空欄なら数量×単価、金額入力時は直接指定を優先')
console.log('  - 「戻す」で自動生成状態へ復帰')
console.log('  - 編集後のparts/memo/数量/単価/金額は概算とExcelへ反映')
console.log('BACKUP: ' + appBackup)
console.log('NEXT: npm run build')
