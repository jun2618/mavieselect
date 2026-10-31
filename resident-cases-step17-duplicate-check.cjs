const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step17-duplicate-check-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP17_DUPLICATE_CHECK */'
if (s.includes(marker)) { console.log('STEP17 重複チェックは適用済みです'); process.exit(0) }
if (!s.includes('residentCases')) { console.error('入居中案件機能が見つかりません。変更しませんでした。'); process.exit(1) }

const helperTarget = 'function normalizeResidentCase(value) {'
if (!s.includes(helperTarget)) { console.error('共通関数位置が見つかりません。'); process.exit(1) }
const helper = `${marker}
function normalizeResidentDuplicateText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('ja')
    .replace(/[\\s　・･、。,.()（）「」『』【】\\-]/g, '')
}

function residentRequestSimilarity(leftValue, rightValue) {
  const left = normalizeResidentDuplicateText(leftValue)
  const right = normalizeResidentDuplicateText(rightValue)
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) return Math.min(left.length, right.length) / Math.max(left.length, right.length)
  const makeBigrams = text => {
    const result = new Set()
    for (let i = 0; i < text.length - 1; i += 1) result.add(text.slice(i, i + 2))
    return result
  }
  const a = makeBigrams(left)
  const b = makeBigrams(right)
  if (!a.size || !b.size) return 0
  let common = 0
  a.forEach(token => { if (b.has(token)) common += 1 })
  return (2 * common) / (a.size + b.size)
}

function findResidentDuplicate(cases, candidate) {
  const property = normalizeResidentDuplicateText(candidate?.propertyName)
  const unit = normalizeResidentDuplicateText(candidate?.unit).replace(/号室$/u, '')
  if (!property || !unit) return null

  const sameRoom = (Array.isArray(cases) ? cases : []).filter(item => {
    if (item.completed || item.status === '完了') return false
    return normalizeResidentDuplicateText(item.propertyName) === property
      && normalizeResidentDuplicateText(item.unit).replace(/号室$/u, '') === unit
  })
  if (!sameRoom.length) return null

  const ranked = sameRoom
    .map(item => ({ item, score: residentRequestSimilarity(item.requestDetails, candidate.requestDetails) }))
    .sort((a, b) => b.score - a.score)

  // Same room is always worth warning; similarity >= .35 is labelled as especially similar.
  return ranked[0] || null
}

`
s = s.replace(helperTarget, helper + helperTarget)

// Manual new case registration: insert check before creating now/nextCase.
const manualNeedle = `                      const now = new Date().toISOString()
                      const nextCase = normalizeResidentCase({
                        ...residentCaseForm,`
if (!s.includes(manualNeedle)) { console.error('新規案件登録処理が見つかりません。変更しませんでした。'); process.exit(1) }
const manualCheck = `                      const candidateCase = { ...residentCaseForm, propertyName, unit: unitValue, requestDetails: details }
                      const duplicate = findResidentDuplicate(residentCases, candidateCase)
                      if (duplicate) {
                        const existing = duplicate.item
                        const similarText = duplicate.score >= 0.35 ? '\\n依頼内容も似ています。' : '\\n同じ部屋の未完了案件があります。'
                        const proceed = window.confirm(
                          '⚠ 重複の可能性があります\\n\\n'
                          + (existing.propertyName || '') + ' ' + (existing.unit || '') + '号室\\n'
                          + '進捗：' + (existing.status || '未設定') + '\\n'
                          + '依頼：' + (existing.requestDetails || '未入力')
                          + similarText
                          + '\\n\\nそれでも新規登録しますか？'
                        )
                        if (!proceed) { setSelectedResidentCaseId(existing.id); setShowResidentCaseForm(false); return }
                      }
                      const now = new Date().toISOString()
                      const nextCase = normalizeResidentCase({
                        ...residentCaseForm,`
s = s.replace(manualNeedle, manualCheck)

// Quick/AI registration: check before creating item.
const quickNeedle = `                        const now = new Date().toISOString()
                        const item = normalizeResidentCase({...residentQuickPreview, id:createResidentCaseId(), propertyName, requestDetails,`
if (!s.includes(quickNeedle)) { console.error('簡単入力登録処理が見つかりません。変更しませんでした。'); process.exit(1) }
const quickCheck = `                        const duplicate = findResidentDuplicate(residentCases, { ...residentQuickPreview, propertyName, requestDetails })
                        if (duplicate) {
                          const existing = duplicate.item
                          const similarText = duplicate.score >= 0.35 ? '\\n依頼内容も似ています。' : '\\n同じ部屋の未完了案件があります。'
                          const proceed = window.confirm(
                            '⚠ 重複の可能性があります\\n\\n'
                            + (existing.propertyName || '') + ' ' + (existing.unit || '') + '号室\\n'
                            + '進捗：' + (existing.status || '未設定') + '\\n'
                            + '依頼：' + (existing.requestDetails || '未入力')
                            + similarText
                            + '\\n\\nそれでも新規登録しますか？'
                          )
                          if (!proceed) { setSelectedResidentCaseId(existing.id); setShowResidentQuickPaste(false); return }
                        }
                        const now = new Date().toISOString()
                        const item = normalizeResidentCase({...residentQuickPreview, id:createResidentCaseId(), propertyName, requestDetails,`
s = s.replace(quickNeedle, quickCheck)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP17 重複チェック OK')
console.log('新規登録とAI簡単入力の両方で、同じ物件・同じ号室の未完了案件を警告します')
console.log('依頼内容が近い場合は「依頼内容も似ています」と表示します')
console.log('キャンセルした場合は既存案件を開き、新規登録しません')
console.log('「それでも新規登録」で別件として登録できます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
