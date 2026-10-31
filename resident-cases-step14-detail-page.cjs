const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step14-detail-page-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP14_DETAIL_PAGE */'
if (s.includes(marker)) { console.log('STEP14 案件詳細ページ化は適用済みです'); process.exit(0) }
if (!s.includes('selectedResidentCaseId')) { console.error('案件詳細機能が見つかりません。変更しませんでした。'); process.exit(1) }

// Opening a case should also move viewport to top, giving it a page-like feel.
const clickOld = `onClick={() => { setSelectedResidentCaseId(item.id); setResidentHistoryMemo('') }}`
const clickNew = `onClick={() => { setSelectedResidentCaseId(item.id); setResidentHistoryMemo(''); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' })) }}`
if (!s.includes(clickOld)) { console.error('案件カードのクリック処理が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(clickOld, clickNew)

const keyOld = `onKeyDown={event => { if (event.key === 'Enter') { setSelectedResidentCaseId(item.id); setResidentHistoryMemo('') } }}`
const keyNew = `onKeyDown={event => { if (event.key === 'Enter') { setSelectedResidentCaseId(item.id); setResidentHistoryMemo(''); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' })) } }}`
if (s.includes(keyOld)) s = s.replace(keyOld, keyNew)

// Turn detail into page-overlay within resident area, so user never scrolls through list to reach it.
const detailOld = `<section className="card residentCaseDetail">`
const detailNew = `<section className="residentCaseDetailPage" aria-label="入居中案件詳細">
                        ${marker}
                        <div className="card residentCaseDetail">`
if (!s.includes(detailOld)) { console.error('案件詳細sectionが見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(detailOld, detailNew)

// Close additional wrapper just before the detail IIFE closes. Use the unique delete-zone tail.
const tailOld = `                        <div className="residentDangerZone">
                          <button className="dangerButton residentDeleteCaseButton" type="button" onClick={() => deleteResidentCase(item.id)}>この案件を削除</button>
                        </div>
                      </section>`
const tailNew = `                        <div className="residentDangerZone">
                          <button className="dangerButton residentDeleteCaseButton" type="button" onClick={() => deleteResidentCase(item.id)}>この案件を削除</button>
                        </div>
                        </div>
                      </section>`
if (!s.includes(tailOld)) { console.error('案件詳細末尾が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(tailOld, tailNew)

// Detail close returns to top of list.
const closeOld = `<button className="back" type="button" onClick={() => setSelectedResidentCaseId('')}>閉じる</button>`
const closeNew = `<button className="back" type="button" onClick={() => { setSelectedResidentCaseId(''); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' })) }}>← 案件一覧へ</button>`
if (!s.includes(closeOld)) { console.error('詳細の閉じるボタンが見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(closeOld, closeNew)

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS追加位置が見つかりません。変更しませんでした。'); process.exit(1) }
const css = `/* M-CROSS_RESIDENT_CASES_STEP14_DETAIL_PAGE_STYLE */
.residentCaseDetailPage{position:fixed;inset:0;z-index:1200;overflow-y:auto;background:var(--page-bg,#f6f5f1);padding:18px max(12px,calc((100vw - 760px)/2));overscroll-behavior:contain}.residentCaseDetailPage>.residentCaseDetail{margin:0;min-height:calc(100vh - 36px);box-sizing:border-box}.residentCaseDetailPage .residentCaseDetailTop{position:sticky;top:0;z-index:4;padding:8px 0 10px;background:inherit}.theme-dark .residentCaseDetailPage,.theme-cyber .residentCaseDetailPage,.theme-luxury .residentCaseDetailPage,.theme-retro .residentCaseDetailPage,.theme-galaxy .residentCaseDetailPage{background:#07101c}@media(max-width:620px){.residentCaseDetailPage{padding:10px}.residentCaseDetailPage>.residentCaseDetail{min-height:calc(100vh - 20px)}.residentCaseDetailPage .residentCaseDetailTop{padding-top:4px}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP14 案件詳細ページ化 OK')
console.log('案件カードを押すと一覧の下ではなく、独立した詳細ページ風に開きます')
console.log('「案件一覧へ」で元の一覧へ戻れます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
