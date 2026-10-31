const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step12-quick-paste-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP12_QUICK_PASTE */'

if (s.includes(marker)) {
  console.log('入居中案件 STEP12 簡単入力は適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP11_ALL_IN */')) {
  console.error('STEP11が見つかりません。変更しませんでした。')
  process.exit(1)
}

// ---------------------------------------------------------
// 1. 貼り付け本文を解析する共通関数
// ---------------------------------------------------------
const helperTarget = 'function normalizeResidentCase(value) {'
if (!s.includes(helperTarget)) {
  console.error('共通関数の追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const helperCode = `/* M-CROSS_RESIDENT_CASES_STEP12_QUICK_PASTE */
function parseResidentRequestText(rawText, propertyMaster) {
  const source = String(rawText || '').replace(/\\r\\n/g, '\\n').trim()
  const lines = source.split('\\n').map(line => line.trim()).filter(Boolean)

  const findLabeledValue = labels => {
    for (const line of lines) {
      for (const label of labels) {
        const match = line.match(new RegExp('^' + label + '[\\s　]*[：:][\\s　]*(.+)$'))
        if (match) return match[1].trim()
      }
    }
    return ''
  }

  const rawProperty = findLabeledValue(['物件', '物件名'])
  const address = findLabeledValue(['住所'])
  const residentName = findLabeledValue(['氏名', '入居者', 'お名前'])
  const residentContact = findLabeledValue(['連絡先', '電話', '電話番号'])

  let propertyName = rawProperty
  let unit = ''
  const unitMatch = rawProperty.match(/^(.*?)[\\s　]+([^\\s　]+(?:号室)?)$/)
  if (unitMatch) {
    const candidateUnit = unitMatch[2].replace(/号室$/u, '')
    if (/[0-9０-９一二三四五六七八九十百千A-Za-zⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ-]+/u.test(candidateUnit)) {
      propertyName = unitMatch[1].trim()
      unit = candidateUnit
    }
  }

  const masterProperties = Array.isArray(propertyMaster?.properties) ? propertyMaster.properties : []
  const exactProperty = masterProperties.find(item => item.name === propertyName)
    || masterProperties.find(item => rawProperty.startsWith(item.name))
  const company = exactProperty?.company || ''
  if (exactProperty) {
    propertyName = exactProperty.name
    if (!unit) {
      const remainder = rawProperty.slice(exactProperty.name.length).trim().replace(/号室$/u, '')
      if (remainder) unit = remainder
    }
  }

  const labeledLineIndexes = new Set()
  lines.forEach((line, index) => {
    if (/^(物件|物件名|住所|氏名|入居者|お名前|連絡先|電話|電話番号)[\\s　]*[：:]/u.test(line)) {
      labeledLineIndexes.add(index)
    }
  })

  const requestCandidates = lines.filter((line, index) => {
    if (labeledLineIndexes.has(index)) return false
    if (/^(いつもお世話|株式会社|表題の件|お忙しいところ|よろしくお願い|ご確認|ご対応)/u.test(line)) return false
    if (/^(今週中|来週中|本日中|工事費|見積|また、|別で)/u.test(line)) return false
    return line.length >= 8
  })

  const requestDetails = requestCandidates.slice(0, 3).join('\\n')

  const deadlineMatch = source.match(/(今週中|来週中|本日中|明日まで|\\d{1,2}月\\d{1,2}日まで)/u)
  const advanceApprovalMatch = source.match(/(?:工事費|金額)[^\\n]{0,20}?([0-9０-９,，]+)万円以内[^\\n]*(?:先行発注|発注)[^\\n]*/u)
  const notes = []
  if (residentName) notes.push('入居者：' + residentName)
  if (deadlineMatch) notes.push('連絡期限：' + deadlineMatch[1])
  if (advanceApprovalMatch) notes.push('先行発注条件：' + advanceApprovalMatch[0].trim())

  const nextAction = deadlineMatch ? '入居者へ連絡（' + deadlineMatch[1] + '）' : '入居者へ連絡'

  return {
    requestDate: new Date().toLocaleDateString('sv-SE'),
    company,
    propertyName,
    unit,
    address: exactProperty?.address || address,
    residentContact,
    requestDetails,
    note: notes.join('\\n'),
    status: '未連絡',
    nextAction,
    actionDueDate: '',
    caution: advanceApprovalMatch ? advanceApprovalMatch[0].trim() : '',
  }
}

`
s = s.replace(helperTarget, helperCode + helperTarget)

// ---------------------------------------------------------
// 2. state追加
// ---------------------------------------------------------
const stateTarget = "  const [residentCaseVisibleCount, setResidentCaseVisibleCount] = useState(10)"
if (!s.includes(stateTarget)) {
  console.error('STEP8の一覧stateが見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(stateTarget, `${stateTarget}
  const [showResidentQuickPaste, setShowResidentQuickPaste] = useState(false)
  const [residentQuickPasteText, setResidentQuickPasteText] = useState('')
  const [residentQuickPreview, setResidentQuickPreview] = useState(null)
  const [residentQuickError, setResidentQuickError] = useState('')`)

// ---------------------------------------------------------
// 3. トップの操作ボタンへ「簡単入力」を追加
// ---------------------------------------------------------
const newCaseButton = `<button className="primary residentNewCaseButton" type="button" onClick={() => { setResidentCaseFormError(''); setShowResidentCaseForm(true) }}>＋ 新規案件</button>`
if (!s.includes(newCaseButton)) {
  console.error('新規案件ボタンが見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(newCaseButton, `${newCaseButton}
                    <button className="secondaryButton residentQuickPasteButton" type="button" onClick={() => {
                      setResidentQuickPasteText('')
                      setResidentQuickPreview(null)
                      setResidentQuickError('')
                      setShowResidentQuickPaste(true)
                    }}>📋 依頼文から簡単入力</button>`)

// ---------------------------------------------------------
// 4. ホームの説明文直後へ簡単入力画面を追加
// ---------------------------------------------------------
const insertTarget = `<p className="subtitle">次に対応する案件を先に確認できる一覧です。</p>`
if (!s.includes(insertTarget)) {
  console.error('入居中案件ホームの追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const quickUi = `${insertTarget}

                {showResidentQuickPaste && (
                  <section className="card residentQuickPasteCard">
                    <div className="residentCaseFormTitle">
                      <div><p className="eyebrow">QUICK INPUT</p><h2>依頼文から簡単入力</h2></div>
                      <button className="back" type="button" onClick={() => setShowResidentQuickPaste(false)}>閉じる</button>
                    </div>
                    <p className="subtitle">メールやメッセージ本文をそのまま貼り付け、内容を確認してから登録します。</p>
                    <textarea rows="12" value={residentQuickPasteText} onChange={event => { setResidentQuickPasteText(event.target.value); setResidentQuickPreview(null); setResidentQuickError('') }} placeholder="依頼文をここへ貼り付け" />
                    <button className="secondaryButton" type="button" onClick={() => {
                      const parsed = parseResidentRequestText(residentQuickPasteText, mergedPropertyMaster)
                      if (!parsed.propertyName || !parsed.requestDetails) {
                        setResidentQuickError('物件名または依頼内容を読み取れませんでした。本文を確認してください。')
                        setResidentQuickPreview(parsed)
                        return
                      }
                      setResidentQuickError('')
                      setResidentQuickPreview(parsed)
                    }}>内容を読み取る</button>

                    {residentQuickError && <p className="saveStatus" role="alert">{residentQuickError}</p>}

                    {residentQuickPreview && (
                      <div className="residentQuickPreview">
                        <h3>登録前の確認</h3>
                        <div className="residentCaseFormGrid">
                          <label><span>管理会社</span><input value={residentQuickPreview.company || ''} onChange={event => setResidentQuickPreview(v => ({ ...v, company: event.target.value }))} /></label>
                          <label><span>物件名 *</span><input value={residentQuickPreview.propertyName || ''} onChange={event => setResidentQuickPreview(v => ({ ...v, propertyName: event.target.value }))} /></label>
                          <label><span>号室</span><input value={residentQuickPreview.unit || ''} onChange={event => setResidentQuickPreview(v => ({ ...v, unit: event.target.value }))} /></label>
                          <label><span>連絡先</span><input type="tel" value={residentQuickPreview.residentContact || ''} onChange={event => setResidentQuickPreview(v => ({ ...v, residentContact: event.target.value }))} /></label>
                          <label className="wide"><span>住所</span><input value={residentQuickPreview.address || ''} onChange={event => setResidentQuickPreview(v => ({ ...v, address: event.target.value }))} /></label>
                          <label className="wide"><span>依頼内容 *</span><textarea rows="4" value={residentQuickPreview.requestDetails || ''} onChange={event => setResidentQuickPreview(v => ({ ...v, requestDetails: event.target.value }))} /></label>
                          <label className="wide"><span>備考</span><textarea rows="3" value={residentQuickPreview.note || ''} onChange={event => setResidentQuickPreview(v => ({ ...v, note: event.target.value }))} /></label>
                          <label><span>次にやること</span><input value={residentQuickPreview.nextAction || ''} onChange={event => setResidentQuickPreview(v => ({ ...v, nextAction: event.target.value }))} /></label>
                          <label><span>優先度</span><select value={residentQuickPreview.priority || 'normal'} onChange={event => setResidentQuickPreview(v => ({ ...v, priority: event.target.value }))}><option value="urgent">🔴 急ぎ</option><option value="normal">🟡 通常</option><option value="low">⚪ 低</option></select></label>
                          <label className="wide"><span>注意事項</span><textarea rows="2" value={residentQuickPreview.caution || ''} onChange={event => setResidentQuickPreview(v => ({ ...v, caution: event.target.value }))} /></label>
                        </div>
                        <button className="primary" type="button" onClick={() => {
                          const propertyName = String(residentQuickPreview.propertyName || '').trim()
                          const requestDetails = String(residentQuickPreview.requestDetails || '').trim()
                          if (!propertyName || !requestDetails) {
                            setResidentQuickError('物件名と依頼内容を確認してください。')
                            return
                          }
                          const now = new Date().toISOString()
                          const nextCase = normalizeResidentCase({
                            ...residentQuickPreview,
                            propertyName,
                            requestDetails,
                            id: createResidentCaseId(),
                            priority: residentQuickPreview.priority || 'normal',
                            history: [{ id: createResidentCaseId(), at: now, status: '簡単入力', memo: '依頼文から登録' }],
                            createdAt: now,
                            updatedAt: now,
                            lastActionAt: now,
                          })
                          setResidentCases(previous => [nextCase, ...previous])
                          setResidentQuickPasteText('')
                          setResidentQuickPreview(null)
                          setResidentQuickError('')
                          setShowResidentQuickPaste(false)
                        }}>この内容で案件登録</button>
                      </div>
                    )}
                  </section>
                )}`

s = s.replace(insertTarget, quickUi)

// ---------------------------------------------------------
// 5. 見た目
// ---------------------------------------------------------
const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const css = `/* M-CROSS_RESIDENT_CASES_STEP12_QUICK_PASTE_STYLE */
.residentQuickPasteCard{display:grid;gap:12px;border:2px solid rgba(76,135,204,.28)}.residentQuickPasteCard>textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid rgba(100,120,150,.3);border-radius:13px;background:#fff;color:inherit;font:inherit;line-height:1.6;resize:vertical}.residentQuickPreview{display:grid;gap:10px;padding-top:12px;border-top:1px dashed rgba(100,120,150,.3)}.residentQuickPreview h3{margin:0}.residentImportActions{flex-wrap:wrap}.residentImportActions .residentQuickPasteButton{width:auto;margin:0}@media(max-width:620px){.residentImportActions .residentQuickPasteButton{width:100%}.residentQuickPasteCard>textarea{font-size:16px}}
.theme-dark .residentQuickPasteCard>textarea,.theme-cyber .residentQuickPasteCard>textarea,.theme-luxury .residentQuickPasteCard>textarea,.theme-retro .residentQuickPasteCard>textarea,.theme-galaxy .residentQuickPasteCard>textarea{background:rgba(6,14,26,.9);color:inherit}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('入居中案件 STEP12 簡単入力 OK')
console.log('依頼文貼り付け → 自動抽出 → 確認編集 → 案件登録 を追加しました')
console.log('抽出: 物件・号室・住所・氏名・連絡先・依頼内容・期限表現・先行発注条件')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
