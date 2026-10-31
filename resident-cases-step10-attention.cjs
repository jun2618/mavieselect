const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step10-attention-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP10 */'
if (s.includes(marker)) { console.log('入居中案件 STEP10 は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP9 */')) { console.error('STEP9が見つかりません。変更しませんでした。'); process.exit(1) }

const countTarget = `                  const todayVisitCases = activeCases.filter(item =>
                    String(item.siteVisitAt || '').startsWith(todayKey) || String(item.workVisitAt || '').startsWith(todayKey)
                  )`
if (!s.includes(countTarget)) { console.error('今日の訪問計算が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(countTarget, `${countTarget}
                  /* M-CROSS_RESIDENT_CASES_STEP10 */
                  const noDueCases = activeCases.filter(item => !item.actionDueDate && !item.siteVisitAt && !item.workVisitAt)
                  const attentionCaseIds = new Set([
                    ...overdueCases.map(item => item.id),
                    ...todayActionCases.map(item => item.id),
                    ...todayVisitCases.map(item => item.id),
                    ...noDueCases.map(item => item.id),
                  ])
                  const attentionCases = activeCases.filter(item => attentionCaseIds.has(item.id))`)

const overallTarget = `                    <h2 className="residentSectionTitle">要対応</h2>`
if (!s.includes(overallTarget)) { console.error('要対応見出しが見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(overallTarget, `                    <div className={\`residentAttentionBanner\${attentionCases.length ? ' hasAttention' : ''}\`}>
                      <div><span>見落としチェック</span><strong>{attentionCases.length ? attentionCases.length + '件 要確認' : '現在なし'}</strong></div>
                      {noDueCases.length > 0 && <button type="button" onClick={() => { setResidentCaseFilter('nodue'); setResidentCaseVisibleCount(10) }}>次回対応日なし {noDueCases.length}件</button>}
                    </div>
                    <h2 className="residentSectionTitle">要対応</h2>`)

const filterNeedle = `                    if (residentCaseFilter === 'today' && !todayActionCases.some(caseItem => caseItem.id === item.id)) return false`
if (!s.includes(filterNeedle)) { console.error('絞り込み処理が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(filterNeedle, `${filterNeedle}
                    if (residentCaseFilter === 'nodue' && !noDueCases.some(caseItem => caseItem.id === item.id)) return false`)

const cardTop = `<article className="residentCaseCard" key={item.id} role="button" tabIndex={0}`
if (!s.includes(cardTop)) { console.error('案件カードが見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(cardTop, `<article className={\`residentCaseCard\${overdueCases.some(caseItem => caseItem.id === item.id) ? ' overdue' : ''}\${todayVisitCases.some(caseItem => caseItem.id === item.id) ? ' todayVisit' : ''}\`} key={item.id} role="button" tabIndex={0}`)

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS位置が見つかりません。変更しませんでした。'); process.exit(1) }
const css = `/* M-CROSS_RESIDENT_CASES_STEP10_STYLE */
.residentAttentionBanner{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border:1px solid rgba(80,150,105,.25);border-radius:15px;background:rgba(80,150,105,.07)}.residentAttentionBanner.hasAttention{border-color:rgba(214,105,58,.4);background:rgba(255,154,85,.10)}.residentAttentionBanner>div{display:grid;gap:2px}.residentAttentionBanner span{font-size:11px;font-weight:850;color:#697386}.residentAttentionBanner strong{font-size:17px}.residentAttentionBanner button{padding:8px 10px;border:1px solid rgba(210,130,55,.35);border-radius:10px;background:#fff7e8;color:#9a621d;font-weight:850}.residentCaseCard.overdue{border-color:rgba(210,70,70,.5);box-shadow:inset 4px 0 #d24b4b,0 6px 18px rgba(50,70,100,.07)}.residentCaseCard.todayVisit{box-shadow:inset 4px 0 #4f8fd9,0 6px 18px rgba(50,70,100,.07)}@media(max-width:560px){.residentAttentionBanner{align-items:stretch;flex-direction:column}.residentAttentionBanner button{width:100%}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('入居中案件 STEP10 OK')
console.log('見落としチェック / 次回対応日なし / 期限超過・今日訪問の強調を追加しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
