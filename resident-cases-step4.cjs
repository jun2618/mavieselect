const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step4-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP4 */'

if (s.includes(marker)) {
  console.log('入居中案件 STEP4 はすでに適用済みです')
  process.exit(0)
}
if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP3 */')) {
  console.error('STEP3が見つかりません。変更しませんでした。')
  process.exit(1)
}

const stateTarget = '  const [showResidentCases, setShowResidentCases] = useState(false)'
if (!s.includes(stateTarget)) {
  console.error('showResidentCases stateが見つかりません。変更しませんでした。')
  process.exit(1)
}

const extraStates = `${stateTarget}
  /* M-CROSS_RESIDENT_CASES_STEP4 */
  const [showResidentCaseForm, setShowResidentCaseForm] = useState(false)
  const [residentCaseForm, setResidentCaseForm] = useState(() => ({
    requestDate: new Date().toLocaleDateString('sv-SE'),
    company: '', propertyName: '', unit: '', address: '', residentContact: '',
    requestDetails: '', note: '', status: '未連絡', nextAction: '入居者へ連絡',
    actionDueDate: '', caution: '',
  }))
  const [residentCaseFormError, setResidentCaseFormError] = useState('')`
s = s.replace(stateTarget, extraStates)

// STEP3の仮新規ボタンを本物のフォーム表示へ
const oldButton = `<button className="primary residentNewCaseButton" type="button" onClick={() => window.alert('新規案件登録はSTEP4で追加します')}>＋ 新規案件</button>`
const newButton = `<button className="primary residentNewCaseButton" type="button" onClick={() => { setResidentCaseFormError(''); setShowResidentCaseForm(true) }}>＋ 新規案件</button>`
if (!s.includes(oldButton)) {
  console.error('STEP3の新規案件ボタンが見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(oldButton, newButton)

// subtitle直後にフォームを追加
const insertTarget = `<p className="subtitle">次に対応する案件を先に確認できる一覧です。</p>`
if (!s.includes(insertTarget)) {
  console.error('入居中案件ホームの追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const form = `${insertTarget}

                {showResidentCaseForm && (
                  <section className="card residentCaseFormCard">
                    <div className="residentCaseFormTitle">
                      <div><p className="eyebrow">NEW CASE</p><h2>新規案件</h2></div>
                      <button type="button" className="back" onClick={() => setShowResidentCaseForm(false)}>閉じる</button>
                    </div>
                    <form onSubmit={event => {
                      event.preventDefault()
                      const propertyName = residentCaseForm.propertyName.trim()
                      const unitValue = residentCaseForm.unit.trim()
                      const details = residentCaseForm.requestDetails.trim()
                      if (!propertyName || !unitValue || !details) {
                        setResidentCaseFormError('物件名・号室・依頼内容を入力してください')
                        return
                      }
                      const now = new Date().toISOString()
                      const nextCase = normalizeResidentCase({
                        ...residentCaseForm,
                        propertyName,
                        unit: unitValue,
                        requestDetails: details,
                        id: createResidentCaseId(),
                        history: [{ id: createResidentCaseId(), at: now, status: residentCaseForm.status || '未連絡', memo: '案件登録' }],
                        createdAt: now,
                        updatedAt: now,
                      })
                      setResidentCases(previous => [nextCase, ...previous])
                      setResidentCaseForm({
                        requestDate: new Date().toLocaleDateString('sv-SE'),
                        company: '', propertyName: '', unit: '', address: '', residentContact: '',
                        requestDetails: '', note: '', status: '未連絡', nextAction: '入居者へ連絡',
                        actionDueDate: '', caution: '',
                      })
                      setResidentCaseFormError('')
                      setShowResidentCaseForm(false)
                    }}>
                      <div className="residentCaseFormGrid">
                        <label><span>依頼日</span><input type="date" value={residentCaseForm.requestDate} onChange={e => setResidentCaseForm(v => ({ ...v, requestDate: e.target.value }))} /></label>
                        <label><span>管理会社</span><input type="text" value={residentCaseForm.company} onChange={e => setResidentCaseForm(v => ({ ...v, company: e.target.value }))} placeholder="例：○○管理" /></label>
                        <label className="wide"><span>物件名 *</span><input type="text" value={residentCaseForm.propertyName} onChange={e => setResidentCaseForm(v => ({ ...v, propertyName: e.target.value }))} placeholder="物件名" /></label>
                        <label><span>号室 *</span><input type="text" value={residentCaseForm.unit} onChange={e => setResidentCaseForm(v => ({ ...v, unit: e.target.value }))} placeholder="101" /></label>
                        <label><span>入居者連絡先</span><input type="tel" inputMode="tel" value={residentCaseForm.residentContact} onChange={e => setResidentCaseForm(v => ({ ...v, residentContact: e.target.value }))} placeholder="電話番号" /></label>
                        <label className="wide"><span>住所</span><input type="text" value={residentCaseForm.address} onChange={e => setResidentCaseForm(v => ({ ...v, address: e.target.value }))} placeholder="住所" /></label>
                        <label className="wide"><span>依頼内容 *</span><textarea rows="3" value={residentCaseForm.requestDetails} onChange={e => setResidentCaseForm(v => ({ ...v, requestDetails: e.target.value }))} placeholder="例：台所水栓から漏水" /></label>
                        <label className="wide"><span>備考</span><textarea rows="2" value={residentCaseForm.note} onChange={e => setResidentCaseForm(v => ({ ...v, note: e.target.value }))} /></label>
                        <label><span>進捗</span><select value={residentCaseForm.status} onChange={e => setResidentCaseForm(v => ({ ...v, status: e.target.value }))}>{residentCaseStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
                        <label><span>次にやること</span><input type="text" value={residentCaseForm.nextAction} onChange={e => setResidentCaseForm(v => ({ ...v, nextAction: e.target.value }))} /></label>
                        <label><span>対応期限</span><input type="date" value={residentCaseForm.actionDueDate} onChange={e => setResidentCaseForm(v => ({ ...v, actionDueDate: e.target.value }))} /></label>
                        <label className="wide"><span>注意事項</span><textarea rows="2" value={residentCaseForm.caution} onChange={e => setResidentCaseForm(v => ({ ...v, caution: e.target.value }))} /></label>
                      </div>
                      {residentCaseFormError && <p className="saveStatus" role="alert">{residentCaseFormError}</p>}
                      <button className="primary" type="submit">この案件を登録</button>
                    </form>
                  </section>
                )}`
s = s.replace(insertTarget, form)

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
const css = `/* M-CROSS_RESIDENT_CASES_STEP4_STYLE */
.residentCaseFormCard{display:grid;gap:12px;border:2px solid rgba(85,125,205,.25)}.residentCaseFormTitle{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.residentCaseFormTitle h2,.residentCaseFormTitle p{margin:0}.residentCaseFormGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:10px 0 14px}.residentCaseFormGrid label{display:grid;gap:5px}.residentCaseFormGrid label>span{font-size:12px;font-weight:850;color:#687386}.residentCaseFormGrid input,.residentCaseFormGrid select,.residentCaseFormGrid textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(100,120,150,.28);border-radius:12px;background:#fff;color:inherit;font:inherit}.residentCaseFormGrid textarea{resize:vertical}.residentCaseFormGrid .wide{grid-column:1/-1}@media(max-width:560px){.residentCaseFormGrid{grid-template-columns:1fr}.residentCaseFormGrid .wide{grid-column:auto}}.theme-dark .residentCaseFormGrid input,.theme-dark .residentCaseFormGrid select,.theme-dark .residentCaseFormGrid textarea,.theme-cyber .residentCaseFormGrid input,.theme-cyber .residentCaseFormGrid select,.theme-cyber .residentCaseFormGrid textarea,.theme-luxury .residentCaseFormGrid input,.theme-luxury .residentCaseFormGrid select,.theme-luxury .residentCaseFormGrid textarea,.theme-retro .residentCaseFormGrid input,.theme-retro .residentCaseFormGrid select,.theme-retro .residentCaseFormGrid textarea,.theme-galaxy .residentCaseFormGrid input,.theme-galaxy .residentCaseFormGrid select,.theme-galaxy .residentCaseFormGrid textarea{background:rgba(6,14,26,.9);color:inherit}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('入居中案件 STEP4 OK')
console.log('新規案件登録フォームを追加しました')
console.log('必須: 物件名 / 号室 / 依頼内容')
console.log('登録すると一覧へ即反映・localStorageへ自動保存されます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
