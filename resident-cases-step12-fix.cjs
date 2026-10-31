const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step12-fix-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP12_QUICK_PASTE */')) {
  console.error('STEP12が見つかりません。変更しませんでした。')
  process.exit(1)
}

const start = s.indexOf('function parseResidentRequestText(rawText, propertyMaster) {')
const end = s.indexOf('\nfunction normalizeResidentCase(value) {', start)

if (start === -1 || end === -1) {
  console.error('簡単入力解析関数の範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

// 正規表現をテンプレート文字列経由で再生成せず、文字列操作中心の安全な実装へ置換します。
const fixed = `function parseResidentRequestText(rawText, propertyMaster) {
  const source = String(rawText || '').split('\\r\\n').join('\\n').trim()
  const lines = source.split('\\n').map(line => line.trim()).filter(Boolean)

  const readLabel = labels => {
    for (const line of lines) {
      for (const label of labels) {
        const prefixes = [label + '：', label + ':']
        for (const prefix of prefixes) {
          if (line.startsWith(prefix)) return line.slice(prefix.length).trim()
        }
      }
    }
    return ''
  }

  const rawProperty = readLabel(['物件', '物件名'])
  const address = readLabel(['住所'])
  const residentName = readLabel(['氏名', '入居者', 'お名前'])
  const residentContact = readLabel(['連絡先', '電話', '電話番号'])

  const masterProperties = Array.isArray(propertyMaster?.properties) ? propertyMaster.properties : []
  const exactProperty = masterProperties.find(item => item.name === rawProperty)
    || masterProperties
      .filter(item => rawProperty && rawProperty.startsWith(item.name))
      .sort((a, b) => String(b.name || '').length - String(a.name || '').length)[0]

  let propertyName = exactProperty?.name || rawProperty
  let unit = ''

  if (exactProperty && rawProperty) {
    unit = rawProperty.slice(exactProperty.name.length).trim().replace(/号室$/u, '')
  } else if (rawProperty) {
    const parts = rawProperty.split(/[\\s　]+/u).filter(Boolean)
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 1].replace(/号室$/u, '')
      if (/^[0-9０-９A-Za-zⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ-]+$/u.test(candidate)) {
        unit = candidate
        propertyName = parts.slice(0, -1).join(' ')
      }
    }
  }

  const labeledPrefixes = ['物件：','物件:','物件名：','物件名:','住所：','住所:','氏名：','氏名:','入居者：','入居者:','お名前：','お名前:','連絡先：','連絡先:','電話：','電話:','電話番号：','電話番号:']
  const requestCandidates = lines.filter(line => {
    if (labeledPrefixes.some(prefix => line.startsWith(prefix))) return false
    if (['いつもお世話', '株式会社', '表題の件', 'お忙しいところ', 'よろしくお願い', 'ご対応のほど'].some(prefix => line.startsWith(prefix))) return false
    if (['今週中', '来週中', '本日中', '工事費', 'また、', '別で'].some(prefix => line.startsWith(prefix))) return false
    return line.length >= 8
  })

  const requestDetails = requestCandidates.slice(0, 3).join('\\n')
  const deadlineWords = ['今週中', '来週中', '本日中', '明日まで']
  const deadline = deadlineWords.find(word => source.includes(word)) || ''
  const approvalLine = lines.find(line => (line.includes('工事費') || line.includes('金額')) && line.includes('以内') && line.includes('発注')) || ''

  const notes = []
  if (residentName) notes.push('入居者：' + residentName)
  if (deadline) notes.push('連絡期限：' + deadline)
  if (approvalLine) notes.push('先行発注条件：' + approvalLine)

  return {
    requestDate: new Date().toLocaleDateString('sv-SE'),
    company: exactProperty?.company || '',
    propertyName,
    unit,
    address: exactProperty?.address || address,
    residentContact,
    requestDetails,
    note: notes.join('\\n'),
    status: '未連絡',
    nextAction: deadline ? '入居者へ連絡（' + deadline + '）' : '入居者へ連絡',
    actionDueDate: '',
    caution: approvalLine,
    priority: 'normal',
  }
}
`

fs.copyFileSync(file, backup)
s = s.slice(0, start) + fixed + s.slice(end)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP12 簡単入力 修正 OK')
console.log('壊れた正規表現を使わない安全な解析処理へ置き換えました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
