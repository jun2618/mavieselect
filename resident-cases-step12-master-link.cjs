const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step12-master-link-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP12_MASTER_LINK_V1 */'
if (s.includes(marker)) { console.log('簡単入力マスター連携は適用済みです'); process.exit(0) }
if (!s.includes('showResidentQuickPaste')) { console.error('STEP12完全版を先に適用してください。変更しませんでした。'); process.exit(1) }

const stateTarget = "  const [residentQuickError, setResidentQuickError] = useState('')"
if (!s.includes(stateTarget)) { console.error('簡単入力stateが見つかりません。'); process.exit(1) }
s = s.replace(stateTarget, `${stateTarget}\n  ${marker}\n  const [residentQuickCompanyId, setResidentQuickCompanyId] = useState('')`)

const companyInput = `<label><span>管理会社</span><input value={residentQuickPreview.company || ''} onChange={e => setResidentQuickPreview(v => ({...v, company:e.target.value}))} /></label>`
if (!s.includes(companyInput)) { console.error('簡単入力の管理会社欄が見つかりません。'); process.exit(1) }
const companySelect = `<label><span>管理会社</span><select value={residentQuickCompanyId || mergedPropertyMaster.companies.find(companyItem => companyItem.name === residentQuickPreview.company)?.id || ''} onChange={e => {
                          const companyId = e.target.value
                          const selectedCompany = mergedPropertyMaster.companies.find(companyItem => companyItem.id === companyId)
                          setResidentQuickCompanyId(companyId)
                          setResidentQuickPreview(v => ({ ...v, company: selectedCompany?.name || '', propertyName: '', address: '' }))
                        }}><option value="">管理会社を選択</option>{mergedPropertyMaster.companies.map(companyItem => <option key={companyItem.id} value={companyItem.id}>{companyItem.name}</option>)}</select></label>`
s = s.replace(companyInput, companySelect)

const propertyInput = `<label><span>物件名 *</span><input value={residentQuickPreview.propertyName || ''} onChange={e => setResidentQuickPreview(v => ({...v, propertyName:e.target.value}))} /></label>`
if (!s.includes(propertyInput)) { console.error('簡単入力の物件欄が見つかりません。'); process.exit(1) }
const propertySelect = `<label><span>物件名 *</span><select value={residentQuickPreview.propertyName || ''} onChange={e => {
                          const propertyName = e.target.value
                          const selectedCompanyId = residentQuickCompanyId || mergedPropertyMaster.companies.find(companyItem => companyItem.name === residentQuickPreview.company)?.id || ''
                          const selectedProperty = mergedPropertyMaster.properties.find(propertyItem => propertyItem.companyId === selectedCompanyId && propertyItem.name === propertyName)
                          setResidentQuickPreview(v => ({ ...v, propertyName, address: selectedProperty?.address || v.address || '' }))
                        }}><option value="">物件を選択</option>{mergedPropertyMaster.properties.filter(propertyItem => {
                          const selectedCompanyId = residentQuickCompanyId || mergedPropertyMaster.companies.find(companyItem => companyItem.name === residentQuickPreview.company)?.id || ''
                          return !selectedCompanyId || propertyItem.companyId === selectedCompanyId
                        }).map(propertyItem => <option key={propertyItem.id} value={propertyItem.name}>{propertyItem.name}</option>)}</select></label>`
s = s.replace(propertyInput, propertySelect)

// When parsed property already matched master, derive dropdown company id immediately when preview opens.
const previewSetter = `                      setResidentQuickPreview(parsed)\n                      setResidentQuickError(`
if (s.includes(previewSetter)) {
  s = s.replace(previewSetter, `                      setResidentQuickPreview(parsed)\n                      setResidentQuickCompanyId(mergedPropertyMaster.companies.find(companyItem => companyItem.name === parsed.company)?.id || '')\n                      setResidentQuickError(`)
}

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS位置が見つかりません。'); process.exit(1) }
const css = `/* M-CROSS_RESIDENT_STEP12_MASTER_LINK_V1_STYLE */\n.residentQuickPreview select{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(100,120,150,.28);border-radius:12px;background:#fff;color:inherit;font:inherit}\n`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('簡単入力マスター連携 OK')
console.log('管理会社が本文に無い場合でも、登録前確認でM-Crossマスターから選択できます')
console.log('管理会社を選ぶと、その管理会社の物件を選択できます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
