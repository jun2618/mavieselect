const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step12-complete-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP12_COMPLETE_V1 */'
if (s.includes(marker)) { console.log('STEP12完全版は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP11_ALL_IN */')) { console.error('STEP11が見つかりません。変更しませんでした。'); process.exit(1) }

// 1) Parser, string-only implementation to avoid escaping breakage.
const helperTarget = 'function normalizeResidentCase(value) {'
if (!s.includes(helperTarget)) { console.error('normalizeResidentCaseが見つかりません。'); process.exit(1) }
const helper = `/* M-CROSS_RESIDENT_STEP12_COMPLETE_V1 */
function parseResidentRequestText(rawText, propertyMaster) {
  const source = String(rawText || '').split('\\r\\n').join('\\n').trim()
  const lines = source.split('\\n').map(line => line.trim()).filter(Boolean)
  const readLabel = labels => {
    for (const line of lines) {
      for (const label of labels) {
        for (const separator of ['：', ':']) {
          const prefix = label + separator
          if (line.startsWith(prefix)) return line.slice(prefix.length).trim()
        }
      }
    }
    return ''
  }
  const rawProperty = readLabel(['物件', '物件名'])
  const typedAddress = readLabel(['住所'])
  const residentName = readLabel(['氏名', '入居者', 'お名前'])
  const residentContact = readLabel(['連絡先', '電話', '電話番号'])
  const properties = Array.isArray(propertyMaster?.properties) ? propertyMaster.properties : []
  const matched = properties.find(item => item.name === rawProperty)
    || properties.filter(item => rawProperty && rawProperty.startsWith(item.name)).sort((a,b) => String(b.name||'').length - String(a.name||'').length)[0]
  let propertyName = matched?.name || rawProperty
  let unit = ''
  if (matched && rawProperty) unit = rawProperty.slice(matched.name.length).trim().replace(/号室$/u, '')
  else if (rawProperty) {
    const parts = rawProperty.split(' ').join('　').split('　').filter(Boolean)
    if (parts.length > 1) { unit = parts.pop().replace(/号室$/u, ''); propertyName = parts.join(' ') }
  }
  const labels = ['物件：','物件:','物件名：','物件名:','住所：','住所:','氏名：','氏名:','入居者：','入居者:','お名前：','お名前:','連絡先：','連絡先:','電話：','電話:','電話番号：','電話番号:']
  const ignorePrefixes = ['いつもお世話','株式会社','表題の件','お忙しいところ','よろしくお願い','ご対応のほど','今週中','来週中','本日中','また、','別で','工事費']
  const body = lines.filter(line => !labels.some(x => line.startsWith(x)) && !ignorePrefixes.some(x => line.startsWith(x)))
  const requestDetails = body.slice(0, 3).join('\\n')
  const deadline = ['今週中','来週中','本日中','明日まで'].find(word => source.includes(word)) || ''
  const approvalLine = lines.find(line => (line.includes('工事費') || line.includes('金額')) && line.includes('以内') && line.includes('発注')) || ''
  const noteParts = []
  if (residentName) noteParts.push('入居者：' + residentName)
  if (deadline) noteParts.push('連絡期限：' + deadline)
  if (approvalLine) noteParts.push('先行発注条件：' + approvalLine)
  return {
    requestDate: new Date().toLocaleDateString('sv-SE'), company: matched?.company || '',
    propertyName, unit, address: matched?.address || typedAddress, residentContact, requestDetails,
    note: noteParts.join('\\n'), status: '未連絡',
    nextAction: deadline ? '入居者へ連絡（' + deadline + '）' : '入居者へ連絡',
    actionDueDate: '', caution: approvalLine, priority: 'normal'
  }
}

`
s = s.replace(helperTarget, helper + helperTarget)

// 2) State.
const stateTarget = "  const [residentCaseVisibleCount, setResidentCaseVisibleCount] = useState(10)"
if (!s.includes(stateTarget)) { console.error('一覧stateが見つかりません。'); process.exit(1) }
s = s.replace(stateTarget, `${stateTarget}
  const [showResidentQuickPaste, setShowResidentQuickPaste] = useState(false)
  const [residentQuickPasteText, setResidentQuickPasteText] = useState('')
  const [residentQuickPreview, setResidentQuickPreview] = useState(null)
  const [residentQuickError, setResidentQuickError] = useState('')`)

// 3) Add button directly after visible Excel button.
const excelText = '📥 Excelから取り込む'
const excelPos = s.indexOf(excelText)
if (excelPos === -1) { console.error('Excelから取り込むボタンが見つかりません。'); process.exit(1) }
const excelButtonEnd = s.indexOf('</button>', excelPos)
if (excelButtonEnd === -1) { console.error('Excelボタン終端が見つかりません。'); process.exit(1) }
const insertPos = excelButtonEnd + '</button>'.length
const quickButton = `
                    <button className="secondaryButton residentQuickPasteButton" type="button" onClick={() => {
                      setResidentQuickPasteText(''); setResidentQuickPreview(null); setResidentQuickError(''); setShowResidentQuickPaste(true)
                    }}>📋 依頼文から簡単入力</button>`
s = s.slice(0, insertPos) + quickButton + s.slice(insertPos)

// 4) Full UI just after subtitle.
const subtitle = '<p className="subtitle">次に対応する案件を先に確認できる一覧です。</p>'
if (!s.includes(subtitle)) { console.error('入居中案件subtitleが見つかりません。'); process.exit(1) }
const ui = `${subtitle}
                {showResidentQuickPaste && (
                  <section className="card residentQuickPasteCard">
                    <div className="residentCaseFormTitle"><div><p className="eyebrow">QUICK INPUT</p><h2>依頼文から簡単入力</h2></div><button className="back" type="button" onClick={() => setShowResidentQuickPaste(false)}>閉じる</button></div>
                    <p className="subtitle">依頼メールやメッセージをそのまま貼り付けます。</p>
                    <textarea rows="11" value={residentQuickPasteText} onChange={e => { setResidentQuickPasteText(e.target.value); setResidentQuickPreview(null); setResidentQuickError('') }} placeholder="依頼文を貼り付け" />
                    <button className="secondaryButton" type="button" onClick={() => {
                      const parsed = parseResidentRequestText(residentQuickPasteText, mergedPropertyMaster)
                      setResidentQuickPreview(parsed)
                      setResidentQuickError(!parsed.propertyName || !parsed.requestDetails ? '読み取れない項目があります。確認して修正してください。' : '')
                    }}>内容を読み取る</button>
                    {residentQuickError && <p className="saveStatus">{residentQuickError}</p>}
                    {residentQuickPreview && <div className="residentQuickPreview">
                      <h3>登録前の確認</h3>
                      <div className="residentCaseFormGrid">
                        <label><span>管理会社</span><input value={residentQuickPreview.company || ''} onChange={e => setResidentQuickPreview(v => ({...v, company:e.target.value}))} /></label>
                        <label><span>物件名 *</span><input value={residentQuickPreview.propertyName || ''} onChange={e => setResidentQuickPreview(v => ({...v, propertyName:e.target.value}))} /></label>
                        <label><span>号室</span><input value={residentQuickPreview.unit || ''} onChange={e => setResidentQuickPreview(v => ({...v, unit:e.target.value}))} /></label>
                        <label><span>連絡先</span><input value={residentQuickPreview.residentContact || ''} onChange={e => setResidentQuickPreview(v => ({...v, residentContact:e.target.value}))} /></label>
                        <label className="wide"><span>住所</span><input value={residentQuickPreview.address || ''} onChange={e => setResidentQuickPreview(v => ({...v, address:e.target.value}))} /></label>
                        <label className="wide"><span>依頼内容 *</span><textarea rows="4" value={residentQuickPreview.requestDetails || ''} onChange={e => setResidentQuickPreview(v => ({...v, requestDetails:e.target.value}))} /></label>
                        <label className="wide"><span>備考</span><textarea rows="3" value={residentQuickPreview.note || ''} onChange={e => setResidentQuickPreview(v => ({...v, note:e.target.value}))} /></label>
                        <label><span>次にやること</span><input value={residentQuickPreview.nextAction || ''} onChange={e => setResidentQuickPreview(v => ({...v, nextAction:e.target.value}))} /></label>
                        <label className="wide"><span>注意事項</span><textarea rows="2" value={residentQuickPreview.caution || ''} onChange={e => setResidentQuickPreview(v => ({...v, caution:e.target.value}))} /></label>
                      </div>
                      <button className="primary" type="button" onClick={() => {
                        const propertyName = String(residentQuickPreview.propertyName || '').trim()
                        const requestDetails = String(residentQuickPreview.requestDetails || '').trim()
                        if (!propertyName || !requestDetails) { setResidentQuickError('物件名と依頼内容を確認してください。'); return }
                        const now = new Date().toISOString()
                        const item = normalizeResidentCase({...residentQuickPreview, id:createResidentCaseId(), propertyName, requestDetails, history:[{id:createResidentCaseId(),at:now,status:'簡単入力',memo:'依頼文から登録'}], createdAt:now, updatedAt:now, lastActionAt:now})
                        setResidentCases(prev => [item, ...prev]); setResidentQuickPasteText(''); setResidentQuickPreview(null); setResidentQuickError(''); setShowResidentQuickPaste(false)
                      }}>この内容で案件登録</button>
                    </div>}
                  </section>
                )}`
s = s.replace(subtitle, ui)

// 5) CSS.
const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS位置が見つかりません。'); process.exit(1) }
const css = `/* M-CROSS_RESIDENT_STEP12_COMPLETE_V1_STYLE */
.residentQuickPasteCard{display:grid;gap:12px;border:2px solid rgba(76,135,204,.28)}.residentQuickPasteCard>textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid rgba(100,120,150,.3);border-radius:13px;background:#fff;color:inherit;font:inherit;line-height:1.6}.residentQuickPreview{display:grid;gap:10px;padding-top:12px;border-top:1px dashed rgba(100,120,150,.3)}.residentImportActions{flex-wrap:wrap}.residentImportActions .residentQuickPasteButton{width:auto;margin:0}@media(max-width:620px){.residentImportActions{display:grid;grid-template-columns:1fr}.residentImportActions .residentQuickPasteButton{width:100%}.residentQuickPasteCard>textarea{font-size:16px}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP12 完全版 OK')
console.log('簡単入力の本体・state・ボタン・確認画面をまとめて追加しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
