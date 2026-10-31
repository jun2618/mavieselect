const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step15-1-order-pdf-parser-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP15_1_ORDER_PDF_PARSER */'

if (s.includes(marker)) {
  console.log('STEP15.1 発注書PDF解析は適用済みです')
  process.exit(0)
}

if (!s.includes('async function importResidentCasePdf(fileValue)')) {
  console.error('STEP15のPDF取込機能が見つかりません。変更しませんでした。')
  process.exit(1)
}

const helperTarget = 'function normalizeResidentCase(value) {'
if (!s.includes(helperTarget)) {
  console.error('共通関数の追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const parser = `/* M-CROSS_RESIDENT_STEP15_1_ORDER_PDF_PARSER */
function parseResidentOrderPdfText(rawText, propertyMaster) {
  const source = String(rawText || '').split('\\r\\n').join('\\n')
  const compact = source.replace(/[\\s　]+/g, '')
  const properties = Array.isArray(propertyMaster?.properties) ? propertyMaster.properties : []

  // PDF内に含まれる登録済み物件名を、長い名前から優先して照合します。
  const matchedProperty = [...properties]
    .sort((a, b) => String(b.name || '').length - String(a.name || '').length)
    .find(item => {
      const name = String(item.name || '').replace(/[\\s　]+/g, '')
      return name && compact.includes(name)
    })

  let propertyName = matchedProperty?.name || ''
  let company = matchedProperty?.company || ''
  let address = matchedProperty?.address || ''

  // マスターに無い場合は「リバティベル月寒」等の候補を本文から拾います。
  if (!propertyName) {
    const knownSuffixes = ['マンション', 'ハイツ', 'コーポ', 'レジデンス', 'パレス', 'ベル', '月寒']
    const words = source.split(/[\\s　]+/u).map(value => value.trim()).filter(Boolean)
    propertyName = words.find(word => knownSuffixes.some(suffix => word.includes(suffix)) && word.length >= 4) || ''
  }

  // 号室は物件名直後を優先し、次に3〜4桁の候補から取得します。
  let unit = ''
  if (matchedProperty) {
    const propertyPosition = compact.indexOf(String(matchedProperty.name || '').replace(/[\\s　]+/g, ''))
    const afterProperty = compact.slice(propertyPosition + String(matchedProperty.name || '').replace(/[\\s　]+/g, '').length)
    const unitCandidate = afterProperty.match(/(?:Ⅰ-|Ⅱ-|Ⅲ-|Ⅳ-|Ⅴ-)?[0-9]{3,4}/u)
    if (unitCandidate) unit = unitCandidate[0]
  }
  if (!unit) {
    const candidates = compact.match(/(?:Ⅰ-|Ⅱ-|Ⅲ-|Ⅳ-|Ⅴ-)?[0-9]{3,4}/gu) || []
    unit = candidates.find(value => !String(value).startsWith('2026') && !String(value).startsWith('011')) || ''
  }

  // 電話番号は携帯を優先し、無ければ011番号を取得します。
  const normalizedPhoneText = source.replace(/[－ー―]/g, '-')
  const mobilePhones = normalizedPhoneText.match(/0[789]0-[0-9]{4}-[0-9]{4}/g) || []
  const localPhones = normalizedPhoneText.match(/011-[0-9]{3}-[0-9]{4}/g) || []
  const residentContact = mobilePhones[0] || localPhones[0] || ''

  // 発注書でよく使われる本文開始位置から、依頼内容を切り出します。
  const requestStarts = [
    '本日玄関ドア',
    '入居者へ直接ご連絡',
    '下記物件の障害対応',
  ]
  let requestPosition = -1
  for (const phrase of requestStarts) {
    const position = source.indexOf(phrase)
    if (position >= 0 && (requestPosition < 0 || position < requestPosition)) requestPosition = position
  }

  let requestDetails = ''
  if (requestPosition >= 0) {
    const requestSource = source.slice(requestPosition)
    const stopPhrases = ['依頼日時：', '作成日 ', '＜依頼者＞', '支払い期日：']
    let stopPosition = requestSource.length
    for (const phrase of stopPhrases) {
      const position = requestSource.indexOf(phrase)
      if (position > 0 && position < stopPosition) stopPosition = position
    }
    requestDetails = requestSource.slice(0, stopPosition).replace(/[\\s　]+/g, ' ').trim()
  }

  // 長過ぎる帳票情報を避け、修理依頼として読める範囲へ整えます。
  if (requestDetails.length > 650) requestDetails = requestDetails.slice(0, 650).trim()

  const cautionParts = []
  if (source.includes('入居者へ直接ご連絡')) cautionParts.push('入居者へ直接連絡して訪問日時を調整')
  if (source.includes('修理が不可の場合は交換')) cautionParts.push('修理不可の場合は交換対応')
  if (source.includes('写真を送ってもらうよう依頼中')) cautionParts.push('写真は入居者へ送付依頼中')
  if (source.includes('参考写真')) cautionParts.push('参考写真あり')

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
    caution: cautionParts.join('\\n'),
    priority: 'normal',
  }
}

`

s = s.replace(helperTarget, parser + helperTarget)

const parseTarget = `      const parsed = parseResidentRequestText(extractedText, mergedPropertyMaster)`
if (!s.includes(parseTarget)) {
  console.error('PDF取込内の解析呼び出しが見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(parseTarget, `      const orderParsed = parseResidentOrderPdfText(extractedText, mergedPropertyMaster)
      const genericParsed = parseResidentRequestText(extractedText, mergedPropertyMaster)
      const parsed = {
        ...genericParsed,
        ...Object.fromEntries(
          Object.entries(orderParsed).filter(([, value]) => value !== '' && value != null)
        ),
      }`)

// 登録前画面でPDF解析結果と物件マスターを手動選択できるよう、会社IDも解析結果から設定します。
const companyTarget = `      setResidentQuickCompanyId(
        mergedPropertyMaster.companies.find(companyItem => companyItem.name === parsed.company)?.id || ''
      )`
if (!s.includes(companyTarget)) {
  console.error('PDF取込後の管理会社設定位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP15.1 発注書PDF解析 OK')
console.log('登録済み物件マスター照合 / 号室 / 電話 / 依頼本文 / 注意事項の抽出を強化しました')
console.log('抽出後はこれまで通り登録前画面で確認・修正できます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
