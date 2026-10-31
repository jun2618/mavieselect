const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step8-list-usability-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP8 */'
if (s.includes(marker)) { console.log('入居中案件 STEP8 は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP7 */')) { console.error('STEP7が見つかりません。変更しませんでした。'); process.exit(1) }

const stateTarget = "  const [residentExcelInputRef" // intentionally not exact; use stable ref line below
const refLine = '  const residentExcelInputRef = useRef(null)'
if (!s.includes(refLine)) { console.error('STEP7のExcel input refが見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(refLine, `${refLine}
  /* M-CROSS_RESIDENT_CASES_STEP8 */
  const [residentCaseSearch, setResidentCaseSearch] = useState('')
  const [residentCaseFilter, setResidentCaseFilter] = useState('all')
  const [residentCaseVisibleCount, setResidentCaseVisibleCount] = useState(10)`)

const iifeStart = `                {(() => {
                  const todayKey = new Date().toLocaleDateString('sv-SE')`
if (!s.includes(iifeStart)) { console.error('入居中案件ダッシュボード計算部が見つかりません。変更しませんでした。'); process.exit(1) }

const oldPriority = `                  const priorityCases = [...activeCases].sort((a, b) => {
                    const aDue = a.actionDueDate || '9999-12-31'
                    const bDue = b.actionDueDate || '9999-12-31'
                    if (aDue !== bDue) return aDue.localeCompare(bDue)
                    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
                  })`

if (!s.includes(oldPriority)) { console.error('案件並び替え処理が見つかりません。変更しませんでした。'); process.exit(1) }

const newPriority = `                  const completedCases = residentCases.filter(item => item.completed || item.status === '完了')
                  const normalizeResidentSearch = value => String(value || '').toLocaleLowerCase('ja').replace(/[\\s　]+/g, '')
                  const searchToken = normalizeResidentSearch(residentCaseSearch)
                  const sourceCases = residentCaseFilter === 'completed' ? completedCases : activeCases
                  const filteredResidentCases = sourceCases.filter(item => {
                    if (residentCaseFilter === 'contact' && !contactCases.some(caseItem => caseItem.id === item.id)) return false
                    if (residentCaseFilter === 'visit' && !(item.siteVisitAt || item.workVisitAt)) return false
                    if (residentCaseFilter === 'order' && item.status !== '見積提出済（発注待ち）') return false
                    if (residentCaseFilter === 'unreported' && item.status !== '完了（未報告）') return false
                    if (residentCaseFilter === 'overdue' && !overdueCases.some(caseItem => caseItem.id === item.id)) return false
                    if (residentCaseFilter === 'today' && !todayActionCases.some(caseItem => caseItem.id === item.id)) return false
                    if (!searchToken) return true
                    const haystack = normalizeResidentSearch([
                      item.company, item.propertyName, item.unit, item.address,
                      item.residentContact, item.requestDetails, item.note,
                      item.status, item.nextAction, item.caution,
                    ].join(' '))
                    return haystack.includes(searchToken)
                  })
                  const priorityCases = [...filteredResidentCases].sort((a, b) => {
                    const aDue = a.actionDueDate || '9999-12-31'
                    const bDue = b.actionDueDate || '9999-12-31'
                    if (aDue !== bDue) return aDue.localeCompare(bDue)
                    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
                  })
                  const visibleResidentCases = priorityCases.slice(0, residentCaseVisibleCount)`
s = s.replace(oldPriority, newPriority)

const dashboardStart = `                    <div className="residentDashboardGrid">`
const listHeader = `                    <div className="residentCasesListHeader">
                      <h2>案件一覧</h2>
                      <span>{activeCases.length}件</span>
                    </div>`
if (!s.includes(dashboardStart) || !s.includes(listHeader)) { console.error('ダッシュボードまたは案件一覧見出しが見つかりません。変更しませんでした。'); process.exit(1) }

s = s.replace(dashboardStart, `                    <div className="residentOverallCounts">
                      <button type="button" className={residentCaseFilter === 'all' ? 'active' : ''} onClick={() => { setResidentCaseFilter('all'); setResidentCaseVisibleCount(10) }}><span>対応中</span><strong>{activeCases.length}</strong></button>
                      <button type="button" className={residentCaseFilter === 'completed' ? 'active' : ''} onClick={() => { setResidentCaseFilter('completed'); setResidentCaseVisibleCount(10) }}><span>完了</span><strong>{completedCases.length}</strong></button>
                      <div><span>全案件</span><strong>{residentCases.length}</strong></div>
                    </div>
                    <h2 className="residentSectionTitle">要対応</h2>
                    <div className="residentDashboardGrid">`)

// Make dashboard cards clickable filters.
const cardReplacements = [
  ['<div className="residentDashboardCard urgent"><span>期限超過</span><strong>{overdueCases.length}</strong></div>', '<button type="button" className={`residentDashboardCard urgent${residentCaseFilter === \'overdue\' ? \' active\' : \'\'}`} onClick={() => { setResidentCaseFilter(\'overdue\'); setResidentCaseVisibleCount(10) }}><span>期限超過</span><strong>{overdueCases.length}</strong></button>'],
  ['<div className="residentDashboardCard today"><span>今日やる</span><strong>{todayActionCases.length}</strong></div>', '<button type="button" className={`residentDashboardCard today${residentCaseFilter === \'today\' ? \' active\' : \'\'}`} onClick={() => { setResidentCaseFilter(\'today\'); setResidentCaseVisibleCount(10) }}><span>今日やる</span><strong>{todayActionCases.length}</strong></button>'],
  ['<div className="residentDashboardCard visit"><span>今日の訪問</span><strong>{todayVisitCases.length}</strong></div>', '<button type="button" className={`residentDashboardCard visit${residentCaseFilter === \'visit\' ? \' active\' : \'\'}`} onClick={() => { setResidentCaseFilter(\'visit\'); setResidentCaseVisibleCount(10) }}><span>予定あり</span><strong>{activeCases.filter(item => item.siteVisitAt || item.workVisitAt).length}</strong></button>'],
  ['<div className="residentDashboardCard contact"><span>未連絡・再連絡</span><strong>{contactCases.length}</strong></div>', '<button type="button" className={`residentDashboardCard contact${residentCaseFilter === \'contact\' ? \' active\' : \'\'}`} onClick={() => { setResidentCaseFilter(\'contact\'); setResidentCaseVisibleCount(10) }}><span>未連絡・再連絡</span><strong>{contactCases.length}</strong></button>'],
  ['<div className="residentDashboardCard order"><span>発注待ち</span><strong>{orderCases.length}</strong></div>', '<button type="button" className={`residentDashboardCard order${residentCaseFilter === \'order\' ? \' active\' : \'\'}`} onClick={() => { setResidentCaseFilter(\'order\'); setResidentCaseVisibleCount(10) }}><span>発注待ち</span><strong>{orderCases.length}</strong></button>'],
  ['<div className="residentDashboardCard report"><span>完了・未報告</span><strong>{unreportedCases.length}</strong></div>', '<button type="button" className={`residentDashboardCard report${residentCaseFilter === \'unreported\' ? \' active\' : \'\'}`} onClick={() => { setResidentCaseFilter(\'unreported\'); setResidentCaseVisibleCount(10) }}><span>完了・未報告</span><strong>{unreportedCases.length}</strong></button>'],
]
for (const [oldText, newText] of cardReplacements) {
  if (!s.includes(oldText)) { console.error('要対応カードが見つかりません。変更しませんでした。'); process.exit(1) }
  s = s.replace(oldText, newText)
}

s = s.replace(listHeader, `                    <div className="residentCasesListHeader">
                      <h2>案件一覧</h2>
                      <span>{priorityCases.length}件</span>
                    </div>
                    <div className="residentCaseSearchBar">
                      <input type="search" value={residentCaseSearch} onChange={event => { setResidentCaseSearch(event.target.value); setResidentCaseVisibleCount(10) }} placeholder="物件名・号室・依頼内容などを検索" />
                      {(residentCaseSearch || residentCaseFilter !== 'all') && <button type="button" onClick={() => { setResidentCaseSearch(''); setResidentCaseFilter('all'); setResidentCaseVisibleCount(10) }}>解除</button>}
                    </div>`)

const mapTarget = `{priorityCases.map(item => (`
if (!s.includes(mapTarget)) { console.error('案件一覧mapが見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(mapTarget, `{visibleResidentCases.map(item => (`)

const listClose = `                      </div>
                    )}

                    {selectedResidentCaseId && (() => {`
if (!s.includes(listClose)) { console.error('案件一覧末尾が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(listClose, `                      </div>
                    )}
                    {residentCaseVisibleCount < priorityCases.length && (
                      <button className="secondaryButton residentMoreButton" type="button" onClick={() => setResidentCaseVisibleCount(previous => previous + 10)}>もっと見る（残り {priorityCases.length - residentCaseVisibleCount}件）</button>
                    )}

                    {selectedResidentCaseId && (() => {`)

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS位置が見つかりません。変更しませんでした。'); process.exit(1) }
const css = `/* M-CROSS_RESIDENT_CASES_STEP8_STYLE */
.residentOverallCounts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.residentOverallCounts>button,.residentOverallCounts>div{display:grid;gap:2px;padding:11px;border:1px solid rgba(100,120,150,.2);border-radius:14px;background:#fff;color:inherit;text-align:center}.residentOverallCounts button{font:inherit;cursor:pointer}.residentOverallCounts .active,.residentDashboardCard.active{outline:3px solid rgba(90,135,220,.25);border-color:#6b8fd8}.residentOverallCounts span{font-size:11px;font-weight:850;color:#687386}.residentOverallCounts strong{font-size:22px}.residentSectionTitle{margin:4px 0 -4px}.residentDashboardCard{font:inherit;text-align:left;cursor:pointer}.residentCaseSearchBar{display:grid;grid-template-columns:1fr auto;gap:8px}.residentCaseSearchBar input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(100,120,150,.3);border-radius:12px;background:#fff;color:inherit;font:inherit}.residentCaseSearchBar button{padding:8px 12px;border:1px solid rgba(100,120,150,.25);border-radius:11px;background:#fff;color:inherit;font-weight:800}.residentMoreButton{width:100%;margin:2px 0 8px}@media(max-width:520px){.residentOverallCounts{grid-template-columns:repeat(3,1fr)}.residentOverallCounts>button,.residentOverallCounts>div{padding:9px 4px}.residentCaseSearchBar{grid-template-columns:1fr}.residentCaseSearchBar button{width:100%}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('入居中案件 STEP8 OK')
console.log('全案件/対応中/完了、検索、絞り込み、10件表示、もっと見るを追加しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
