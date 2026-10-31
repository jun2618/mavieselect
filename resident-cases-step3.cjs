const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step3-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP3 */'

if (s.includes(marker)) {
  console.log('入居中案件 STEP3 はすでに適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP2_V2 */')) {
  console.error('STEP2-V2が見つかりません。変更しませんでした。')
  process.exit(1)
}

const oldBlock = `              <section className="card residentCasesPlaceholder" aria-label="入居中案件">
                <button className="back" type="button" onClick={() => setShowResidentCases(false)}>← 戻る</button>
                <p className="eyebrow">M-Cross WORK</p>
                <h1>入居中案件</h1>
                <p className="subtitle">入居中案件の一覧・新規登録画面をここに作ります。</p>
                <div className="summary">
                  <div className="summaryLine summaryGrand">
                    <span>登録済み案件</span>
                    <strong>{residentCases.length}件</strong>
                  </div>
                </div>
              </section>`

if (!s.includes(oldBlock)) {
  console.error('STEP2の仮画面が見つかりません。変更しませんでした。')
  process.exit(1)
}

const newBlock = `              <section className="residentCasesHome" aria-label="入居中案件">
                {/* M-CROSS_RESIDENT_CASES_STEP3 */}
                <div className="residentCasesTopbar">
                  <button className="back" type="button" onClick={() => setShowResidentCases(false)}>← 戻る</button>
                  <button className="primary residentNewCaseButton" type="button" onClick={() => window.alert('新規案件登録はSTEP4で追加します')}>＋ 新規案件</button>
                </div>
                <p className="eyebrow">M-Cross WORK</p>
                <h1>入居中案件</h1>
                <p className="subtitle">次に対応する案件を先に確認できる一覧です。</p>

                {(() => {
                  const todayKey = new Date().toLocaleDateString('sv-SE')
                  const activeCases = residentCases.filter(item => !item.completed && item.status !== '完了')
                  const overdueCases = activeCases.filter(item => item.actionDueDate && item.actionDueDate < todayKey)
                  const todayActionCases = activeCases.filter(item => item.actionDueDate === todayKey)
                  const todayVisitCases = activeCases.filter(item =>
                    String(item.siteVisitAt || '').startsWith(todayKey) || String(item.workVisitAt || '').startsWith(todayKey)
                  )
                  const contactCases = activeCases.filter(item => ['未連絡', '不通', '不通（メール送信）', '発注（未連絡）', '発注（不通）'].includes(item.status))
                  const orderCases = activeCases.filter(item => item.status === '見積提出済（発注待ち）')
                  const unreportedCases = activeCases.filter(item => item.status === '完了（未報告）')
                  const priorityCases = [...activeCases].sort((a, b) => {
                    const aDue = a.actionDueDate || '9999-12-31'
                    const bDue = b.actionDueDate || '9999-12-31'
                    if (aDue !== bDue) return aDue.localeCompare(bDue)
                    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
                  })

                  return <>
                    <div className="residentDashboardGrid">
                      <div className="residentDashboardCard urgent"><span>期限超過</span><strong>{overdueCases.length}</strong></div>
                      <div className="residentDashboardCard today"><span>今日やる</span><strong>{todayActionCases.length}</strong></div>
                      <div className="residentDashboardCard visit"><span>今日の訪問</span><strong>{todayVisitCases.length}</strong></div>
                      <div className="residentDashboardCard contact"><span>未連絡・再連絡</span><strong>{contactCases.length}</strong></div>
                      <div className="residentDashboardCard order"><span>発注待ち</span><strong>{orderCases.length}</strong></div>
                      <div className="residentDashboardCard report"><span>完了・未報告</span><strong>{unreportedCases.length}</strong></div>
                    </div>

                    <div className="residentCasesListHeader">
                      <h2>案件一覧</h2>
                      <span>{activeCases.length}件</span>
                    </div>

                    {priorityCases.length === 0 ? (
                      <div className="card residentEmptyCard">
                        <strong>現在の入居中案件はありません</strong>
                        <span>「＋ 新規案件」から登録できます。</span>
                      </div>
                    ) : (
                      <div className="residentCaseList">
                        {priorityCases.map(item => (
                          <article className="residentCaseCard" key={item.id}>
                            <div className="residentCaseCardTop">
                              <strong>{item.propertyName || '物件名未設定'} {item.unit ? item.unit + '号室' : ''}</strong>
                              <span>{item.status || '未連絡'}</span>
                            </div>
                            <p>{item.requestDetails || '依頼内容未入力'}</p>
                            <div className="residentCaseNext">
                              <span>次にやること</span>
                              <strong>{item.nextAction || '未設定'}</strong>
                            </div>
                            {item.actionDueDate && <small>期限：{item.actionDueDate}</small>}
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                })()}
              </section>`

s = s.replace(oldBlock, newBlock)

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const css = `/* M-CROSS_RESIDENT_CASES_STEP3_STYLE */
.residentCasesHome{display:grid;gap:14px}.residentCasesTopbar{display:flex;align-items:center;justify-content:space-between;gap:10px}.residentNewCaseButton{width:auto;margin:0}.residentDashboardGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.residentDashboardCard{display:grid;gap:3px;padding:13px;border:1px solid rgba(100,120,150,.18);border-radius:15px;background:#fff;box-shadow:0 5px 15px rgba(50,70,100,.06)}.residentDashboardCard span{font-size:12px;font-weight:800;color:#656e7d}.residentDashboardCard strong{font-size:25px}.residentDashboardCard.urgent strong{color:#c84242}.residentDashboardCard.today strong{color:#d57c16}.residentDashboardCard.visit strong{color:#377fd1}.residentDashboardCard.contact strong{color:#8b5cc7}.residentDashboardCard.order strong{color:#348b69}.residentDashboardCard.report strong{color:#bb5a78}.residentCasesListHeader{display:flex;align-items:end;justify-content:space-between;margin-top:5px}.residentCasesListHeader h2{margin:0}.residentCasesListHeader span{font-weight:900;color:#687386}.residentCaseList{display:grid;gap:10px}.residentCaseCard{display:grid;gap:8px;padding:14px;border:1px solid rgba(100,120,150,.2);border-radius:17px;background:#fff;box-shadow:0 6px 18px rgba(50,70,100,.07)}.residentCaseCardTop{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.residentCaseCardTop>strong{font-size:16px}.residentCaseCardTop>span{flex:0 0 auto;padding:4px 8px;border-radius:999px;background:#edf3ff;color:#4d6fae;font-size:11px;font-weight:900}.residentCaseCard p{margin:0;color:inherit}.residentCaseNext{display:grid;gap:2px;padding:9px 10px;border-radius:11px;background:#fff7e8}.residentCaseNext span{font-size:11px;color:#8a7450;font-weight:800}.residentCaseNext strong{font-size:14px}.residentCaseCard small{color:#777}.residentEmptyCard{display:grid;gap:5px;text-align:center}.residentEmptyCard span{color:#777}@media(min-width:760px){.residentDashboardGrid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.theme-dark .residentDashboardCard,.theme-dark .residentCaseCard,.theme-cyber .residentDashboardCard,.theme-cyber .residentCaseCard,.theme-luxury .residentDashboardCard,.theme-luxury .residentCaseCard,.theme-retro .residentDashboardCard,.theme-retro .residentCaseCard,.theme-galaxy .residentDashboardCard,.theme-galaxy .residentCaseCard{background:rgba(7,14,27,.9);color:inherit}.theme-dark .residentCaseNext,.theme-cyber .residentCaseNext,.theme-luxury .residentCaseNext,.theme-retro .residentCaseNext,.theme-galaxy .residentCaseNext{background:rgba(110,85,20,.18)}
`

s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('入居中案件 STEP3 OK')
console.log('ダッシュボードと案件一覧画面を追加しました')
console.log('新規案件ボタンの登録フォームはSTEP4で追加します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
