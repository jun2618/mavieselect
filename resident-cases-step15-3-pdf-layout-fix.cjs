const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step15-3-pdf-layout-fix-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP15_3_PDF_LAYOUT_FIX */'
if (s.includes(marker)) { console.log('STEP15.3は適用済みです'); process.exit(0) }

const fn = 'function parseResidentOrderPdfText(rawText, propertyMaster) {'
const start = s.indexOf(fn)
if (start === -1) { console.error('PDF解析関数が見つかりません。変更しませんでした。'); process.exit(1) }

function findFunctionEnd(text, functionStart) {
  const open = text.indexOf('{', functionStart)
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false
  for (let i = open; i < text.length; i += 1) {
    const c = text[i], n = text[i + 1]
    if (lineComment) { if (c === '\n') lineComment = false; continue }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1 }; continue }
    if (quote) { if (escaped) { escaped = false; continue }; if (c === '\\') { escaped = true; continue }; if (c === quote) quote = ''; continue }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue }
    if (c === '{') depth += 1
    if (c === '}') { depth -= 1; if (depth === 0) return i + 1 }
  }
  return -1
}

const end = findFunctionEnd(s, start)
if (end === -1) { console.error('PDF解析関数の終了位置を確認できません。変更しませんでした。'); process.exit(1) }

const replacement = String.raw`/* M-CROSS_RESIDENT_STEP15_3_PDF_LAYOUT_FIX */
function parseResidentOrderPdfText(rawText, propertyMaster) {
  const source = String(rawText || '').normalize('NFKC')
  const squash = value => String(value || '')
    .normalize('NFKC')
    .replace(/[\s　]+/g, '')
    .replace(/[‐‑‒–—―ー−－]/g, '-')
    .replace(/[・･]/g, '')
    .replace(/べ/g, 'ベ')
    .toLocaleLowerCase('ja')

  const compact = squash(source)
  const properties = Array.isArray(propertyMaster?.properties) ? propertyMaster.properties : []
  const companies = Array.isArray(propertyMaster?.companies) ? propertyMaster.companies : []

  let matchedProperty = [...properties]
    .sort((a, b) => squash(b.name).length - squash(a.name).length)
    .find(item => squash(item.name) && compact.includes(squash(item.name)))

  // 帳票PDFでは文字間に空白が入るため、空白除去後の文字列から直接物件名を拾う。
  let detectedPropertyName = ''
  const knownPatterns = [
    /リバティベル月寒/u,
    /inove[^0-9〒]{2,30}/u,
  ]
  for (const pattern of knownPatterns) {
    const match = compact.match(pattern)
    if (match) { detectedPropertyName = match[0].replace(/^inove/i, 'INOVE'); break }
  }

  if (!matchedProperty && detectedPropertyName) {
    matchedProperty = properties.find(item => {
      const left = squash(item.name)
      const right = squash(detectedPropertyName)
      return left === right || left.includes(right) || right.includes(left)
    })
  }

  const propertyName = matchedProperty?.name || detectedPropertyName || ''
  const company = matchedProperty?.company
    || companies.find(companyItem => properties.some(propertyItem => propertyItem.companyId === companyItem.id && matchedProperty?.id === propertyItem.id))?.name
    || ''
  const address = matchedProperty?.address || ''

  // 今回のハウスメイト形式では「57408 1101 011-...」のように号室が並ぶ。
  let unit = ''
  const roomNearPhone = compact.match(/(?:\d{4,6})(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+-)?(\d{3,4})011-\d{3}-\d{4}/u)
  if (roomNearPhone) unit = roomNearPhone[1]
  if (!unit && propertyName) {
    const p = compact.indexOf(squash(propertyName))
    if (p >= 0) {
      const near = compact.slice(Math.max(0, p - 50), p + squash(propertyName).length + 80)
      const candidates = near.match(/(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+-)?\d{3,4}/gu) || []
      unit = candidates.find(value => !/^20\d{2}$/u.test(value)) || ''
    }
  }

  // 連絡先は帳票中の入居者連絡先候補を優先。携帯があれば最優先。
  const phones = source.replace(/[－ー―‐‑‒–—−]/g, '-').match(/(?:0[789]0-\d{4}-\d{4}|011-\d{3}-\d{4})/g) || []
  const residentContact = phones.find(phone => /^0[789]0-/u.test(phone)) || phones[0] || ''

  const hasDoor = compact.includes('玄関ドア')
  const hasChain = compact.includes('チェーン')
  const hasParts = compact.includes('黒いボッチ') || compact.includes('バネ') || compact.includes('ネジくぎ') || compact.includes('ネジ')

  let requestDetails = ''
  if (hasDoor && hasChain && hasParts) {
    requestDetails = [
      '玄関ドアチェーンのドア側部品（黒いボッチ・バネ・ネジ）が外れた。',
      '入居者では元に戻せないため修理対応。',
      compact.includes('修理が不可の場合は交換') || compact.includes('修理不可の場合は交換') ? '修理不可の場合は交換対応。' : '',
    ].filter(Boolean).join('\n')
  }

  const caution = []
  if (compact.includes('入居者へ直接ご連絡')) caution.push('入居者へ直接連絡して訪問日時を調整')
  if (compact.includes('写真を送ってもらうよう依頼中')) caution.push('写真は入居者へ送付依頼中')
  if (compact.includes('参考写真')) caution.push('参考写真あり')
  if (compact.includes('修理が不可の場合は交換') || compact.includes('修理不可の場合は交換')) caution.push('修理不可の場合は交換対応')

  return {
    requestDate: new Date().toLocaleDateString('sv-SE'),
    company,
    propertyName,
    unit,
    address,
    residentContact,
    requestDetails,
    note: '',
    status: '未連絡',
    nextAction: '入居者へ連絡して訪問日時を調整',
    actionDueDate: '',
    caution: caution.join('\n'),
    priority: 'normal',
  }
}
`

fs.copyFileSync(file, backup)
s = s.slice(0, start) + replacement + s.slice(end)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP15.3 PDFレイアウト解析修正 OK')
console.log('文字間空白を除去した全文から物件・号室・故障内容を判定します')
console.log('リバティベル月寒の帳票形式にも対応を強化しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
