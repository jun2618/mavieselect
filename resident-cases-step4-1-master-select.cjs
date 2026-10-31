const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step4-1-master-select-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP4_1 */'

if (s.includes(marker)) {
  console.log('入居中案件 STEP4.1 はすでに適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP4 */')) {
  console.error('STEP4が見つかりません。変更しませんでした。')
  process.exit(1)
}

// 管理会社選択用のstateを追加
const stateTarget = "  const [residentCaseFormError, setResidentCaseFormError] = useState('')"
if (!s.includes(stateTarget)) {
  console.error('入居中案件フォームstateが見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(
  stateTarget,
  `${stateTarget}\n  /* M-CROSS_RESIDENT_CASES_STEP4_1 */\n  const [residentCaseCompanyId, setResidentCaseCompanyId] = useState('')`
)

// 既存のcompanies計算直後に入居中案件フォーム用物件一覧を追加
const companiesTarget = '  const companies = mergedPropertyMaster.companies.map(item => item.name)'
if (!s.includes(companiesTarget)) {
  console.error('既存マスターのcompanies計算位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(
  companiesTarget,
  `${companiesTarget}\n  const residentCaseCompany = mergedPropertyMaster.companies.find(item => item.id === residentCaseCompanyId)\n  const residentCaseProperties = residentCaseCompanyId\n    ? mergedPropertyMaster.properties.filter(item => item.companyId === residentCaseCompanyId)\n    : []`
)

// 管理会社の手入力欄をselectへ変更
const oldCompany = `<label><span>管理会社</span><input type="text" value={residentCaseForm.company} onChange={e => setResidentCaseForm(v => ({ ...v, company: e.target.value }))} placeholder="例：○○管理" /></label>`
const newCompany = `<label><span>管理会社</span><select value={residentCaseCompanyId} onChange={e => {
                          const companyId = e.target.value
                          const selectedCompany = mergedPropertyMaster.companies.find(item => item.id === companyId)
                          setResidentCaseCompanyId(companyId)
                          setResidentCaseForm(v => ({
                            ...v,
                            company: selectedCompany?.name || '',
                            propertyName: '',
                            address: '',
                          }))
                        }}>
                          <option value="">管理会社を選択</option>
                          {mergedPropertyMaster.companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select></label>`

if (!s.includes(oldCompany)) {
  console.error('管理会社の手入力欄が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(oldCompany, newCompany)

// 物件名の手入力欄をselectへ変更。選択時に住所を自動入力
const oldProperty = `<label className="wide"><span>物件名 *</span><input type="text" value={residentCaseForm.propertyName} onChange={e => setResidentCaseForm(v => ({ ...v, propertyName: e.target.value }))} placeholder="物件名" /></label>`
const newProperty = `<label className="wide"><span>物件名 *</span><select value={residentCaseForm.propertyName} disabled={!residentCaseCompanyId} onChange={e => {
                          const propertyName = e.target.value
                          const selectedProperty = residentCaseProperties.find(item => item.name === propertyName)
                          setResidentCaseForm(v => ({
                            ...v,
                            propertyName,
                            address: selectedProperty?.address || '',
                          }))
                        }}>
                          <option value="">{residentCaseCompanyId ? '物件を選択' : '先に管理会社を選択'}</option>
                          {residentCaseProperties.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
                        </select></label>`

if (!s.includes(oldProperty)) {
  console.error('物件名の手入力欄が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(oldProperty, newProperty)

// 住所はマスターから自動入力されるためreadOnlyにする
const oldAddress = `<label className="wide"><span>住所</span><input type="text" value={residentCaseForm.address} onChange={e => setResidentCaseForm(v => ({ ...v, address: e.target.value }))} placeholder="住所" /></label>`
const newAddress = `<label className="wide"><span>住所（物件マスターから自動入力）</span><input type="text" readOnly value={residentCaseForm.address} placeholder="物件を選択すると表示されます" /></label>`

if (!s.includes(oldAddress)) {
  console.error('住所入力欄が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(oldAddress, newAddress)

// 登録後に管理会社選択もリセット
const resetTarget = `                      setResidentCaseFormError('')
                      setShowResidentCaseForm(false)`
if (!s.includes(resetTarget)) {
  console.error('フォーム登録後のリセット位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(
  resetTarget,
  `                      setResidentCaseCompanyId('')\n                      setResidentCaseFormError('')\n                      setShowResidentCaseForm(false)`
)

// 未登録物件用に既存の管理画面へ移動するボタンをフォーム内に追加
const propertySelectEnd = `                        </select></label>
                        <label><span>号室 *`
const propertyManageButton = `                        </select></label>
                        <div className="residentMasterShortcut wide">
                          <span>管理会社・物件が見つからない場合</span>
                          <button type="button" className="secondaryButton" onClick={() => {
                            setShowResidentCaseForm(false)
                            setShowResidentCases(false)
                            setSettingsPage('management')
                            setSettingsOpen(true)
                          }}>管理会社・物件管理を開く</button>
                        </div>
                        <label><span>号室 *`

if (!s.includes(propertySelectEnd)) {
  console.error('物件選択欄の直後位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(propertySelectEnd, propertyManageButton)

// select/readOnlyの見た目とショートカット
const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
const css = `/* M-CROSS_RESIDENT_CASES_STEP4_1_STYLE */
.residentMasterShortcut{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px dashed rgba(90,120,170,.35);border-radius:12px;background:rgba(90,130,200,.06)}.residentMasterShortcut>span{font-size:12px;font-weight:800;color:#687386}.residentMasterShortcut .secondaryButton{width:auto;margin:0;padding:9px 12px}.residentCaseFormGrid input[readonly]{background:rgba(120,130,145,.08);color:#687386}@media(max-width:560px){.residentMasterShortcut{align-items:stretch;flex-direction:column}.residentMasterShortcut .secondaryButton{width:100%}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('入居中案件 STEP4.1 OK')
console.log('管理会社・物件を既存M-Crossマスターから選択する方式へ変更しました')
console.log('物件選択時に住所を自動入力します')
console.log('未登録の場合は管理会社・物件管理画面へ移動できます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
