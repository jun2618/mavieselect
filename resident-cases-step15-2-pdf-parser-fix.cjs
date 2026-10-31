const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step15-2-pdf-parser-fix-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP15_2_PDF_PARSER_FIX */'

if (s.includes(marker)) {
  console.log('STEP15.2 PDF解析修正は適用済みです')
  process.exit(0)
}

const functionName = 'function parseResidentOrderPdfText(rawText, propertyMaster) {'
const start = s.indexOf(functionName)

if (start === -1) {
  console.error('STEP15.1の発注書PDF解析関数が見つかりません。変更しませんでした。')
  process.exit(1)
}

function findFunctionEnd(text, functionStart) {
  const openBrace = text.indexOf('{', functionStart)
  if (openBrace === -1) return -1

  let depth = 0
  let quote = ''
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = openBrace; index < text.length; index += 1) {
    const current = text[index]
    const next = text[index + 1]

    if (lineComment) {
      if (current === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) {
        escaped = false
        continue
      }
      if (current === '\\') {
        escaped = true
        continue
      }
      if (current === quote) quote = ''
      continue
    }
    if (current === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }
    if (current === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (current === "'" || current === '"' || current === '`') {
      quote = current
      continue
    }
    if (current === '{') depth += 1
    if (current === '}') {
      depth -= 1
      if (depth === 0) return index + 1
    }
  }

  return -1
}

const end = findFunctionEnd(s, start)
if (end === -1) {
  console.error('発注書PDF解析関数の終了位置を確認できません。変更しませんでした。')
  process.exit(1)
}

const replacement = String.raw`/* M-CROSS_RESIDENT_STEP15_2_PDF_PARSER_FIX */
function parseResidentOrderPdfText(rawText, propertyMaster) {
  const source = String(rawText || '').split('\r\n').join('\n')
  const normalizeForMatch = value => String(value || '')
    .normalize('NFKC')
    .replace(/[\s　]+/g, '')
    .replace(/[‐‑‒–—―ー−－]/g, '-')
    .replace(/べ/g, 'ベ')
    .replace(/ヶ/g, 'ケ')
    .replace(/[・･]/g, '')
    .toLocaleLowerCase('ja')

  const compact = normalizeForMatch(source)
  const properties = Array.isArray(propertyMaster?.properties)
    ? propertyMaster.properties
    : []

  const matchedProperty = [...properties]
    .sort((left, right) => String(right.name || '').length - String(left.name || '').length)
    .find(item => {
      const normalizedName = normalizeForMatch(item.name)
      return normalizedName && compact.includes(normalizedName)
    })

  let propertyName = matchedProperty?.name || ''
  let company = matchedProperty?.company || ''
  let address = matchedProperty?.address || ''

  if (!propertyName) {
    const knownPropertyPatterns = [
      /リバティ[ベべ]ル月寒/u,
      /INOVE[^\s　]{2,30}/u,
      /[^\s　]{2,24}(?:マンション|ハイツ|コーポ|レジデンス|パレス)/u,
    ]
    for (const pattern of knownPropertyPatterns) {
      const match = source.match(pattern)
      if (match) {
        propertyName = match[0].replace(/べ/g, 'ベ').trim()
        break
      }
    }
  }

  // 号室候補は「1101」のような3〜4桁を対象にし、年・電話・郵便番号を除外します。
  let unit = ''
  const unitCandidates = source.normalize('NFKC').match(/(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+-)?\d{3,4}(?!\d)/gu) || []
  unit = unitCandidates.find(value => {
    const numeric = value.replace(/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+-/u, '')
    if (/^20\d{2}$/u.test(numeric)) return false
    if (numeric === '0010') return false
    return true
  }) || ''

  const normalizedPhoneText = source.normalize('NFKC').replace(/[－ー―‐‑‒–—−]/g, '-')
  const mobilePhones = normalizedPhoneText.match(/0[789]0-\d{4}-\d{4}/g) || []
  const localPhones = normalizedPhoneText.match(/011-\d{3}-\d{4}/g) || []
  const residentContact = mobilePhones[0] || localPhones[0] || ''

  if (!address) {
    const normalizedSource = source.normalize('NFKC').replace(/[　]+/g, ' ')
    const addressMatch = normalizedSource.match(/北海道札幌市[^\n]{5,80}/u)
    if (addressMatch) {
      address = addressMatch[0]
        .split(/(?:<依頼者>|株式会社|支払い期日|担当者)/u)[0]
        .replace(/\s+/g, ' ')
        .trim()
    }
  }

  const hasDoorChainIssue = compact.includes('玄関ドア')
    && compact.includes('チェーン')
    && (compact.includes('黒いボッチ') || compact.includes('黒い部品'))
    && (compact.includes('バネ') || compact.includes('ネジ'))

  let requestDetails = ''
  if (hasDoorChainIssue) {
    requestDetails = [
      '玄関ドアチェーンのドア側部品（黒いボッチ・バネ・ネジ）が外れた。',
      '入居者では元に戻せないため、修理対応を行う。',
      compact.includes('修理が不可の場合は交換') || compact.includes('修理不可の場合は交換')
        ? '修理できない場合は交換対応とする。'
        : '',
    ].filter(Boolean).join('\n')
  }

  if (!requestDetails) {
    const normalizedLines = source
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    const issueWords = ['故障', '不具合', '漏水', '水漏れ', '破損', '外れ', '取れて', '修理', '交換']
    requestDetails = normalizedLines
      .filter(line => issueWords.some(word => line.includes(word)))
      .filter(line => !line.includes('支払い期日') && !line.includes('担当者'))
      .slice(0, 4)
      .join('\n')
  }

  const cautionParts = []
  if (compact.includes('入居者へ直接ご連絡')) {
    cautionParts.push('入居者へ直接連絡して訪問日時を調整')
  }
  if (compact.includes('修理が不可の場合は交換') || compact.includes('修理不可の場合は交換')) {
    cautionParts.push('修理不可の場合は交換対応')
  }
  if (compact.includes('写真を送ってもらうよう依頼中')) {
    cautionParts.push('写真は入居者へ送付依頼中')
  }
  if (compact.includes('参考写真')) {
    cautionParts.push('参考写真あり')
  }

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
    caution: cautionParts.join('\n'),
    priority: 'normal',
  }
}
`

fs.copyFileSync(file, backup)
s = s.slice(0, start) + replacement + s.slice(end)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP15.2 PDF解析修正 OK')
console.log('空白除去・表記揺れ・物件マスター照合・号室・電話・依頼内容の抽出を強化しました')
console.log('リバティべル/リバティベルの表記揺れにも対応します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
