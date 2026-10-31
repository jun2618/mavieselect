const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step5-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP5 */'
if (s.includes(marker)) { console.log('入居中案件 STEP5 は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP4_1 */')) { console.error('STEP4.1が見つかりません。変更しませんでした。'); process.exit(1) }

const stateTarget = "  const [residentCaseCompanyId, setResidentCaseCompanyId] = useState('')"
if (!s.includes(stateTarget)) { console.error('STEP4.1 stateが見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(stateTarget, `${stateTarget}\n  /* M-CROSS_RESIDENT_CASES_STEP5 */\n  const [selectedResidentCaseId, setSelectedResidentCaseId] = useState('')\n  const [residentHistoryMemo, setResidentHistoryMemo] = useState('')`)

const buttonHelpersTarget = '  function changeFontSize(value) {'
if (!s.includes(buttonHelpersTarget)) { console.error('関数追加位置が見つかりません。変更しませんでした。'); process.exit(1) }
const helpers = `  function updateResidentCase(caseId, patch, historyStatus = '', historyMemo = '') {
    const now = new Date().toISOString()
    setResidentCases(previous => previous.map(item => {
      if (item.id !== caseId) return item
      const nextHistory = historyStatus
        ? [...(Array.isArray(item.history) ? item.history : []), {
            id: createResidentCaseId(), at: now, status: historyStatus, memo: historyMemo,
          }]
        : (Array.isArray(item.history) ? item.history : [])
      return normalizeResidentCase({ ...item, ...patch, history: nextHistory, updatedAt: now })
    }))
  }

  function applyResidentQuickStatus(caseId, status) {
    const nextActionMap = {
      '未連絡': '入居者へ連絡',
      '不通': '入居者へ再連絡',
      '不通（メール送信）': '入居者からの連絡を確認',
      '連絡済（入居者のスケジュール確認待ち）': '入居者から日程回答を確認',
      '見積提出済（発注待ち）': '発注状況を確認',
      '発注（未連絡）': '入居者へ工事日を連絡',
      '発注（不通）': '入居者へ再連絡',
      '完了（未報告）': '管理会社へ完了報告',
      '完了': '対応完了',
    }
    updateResidentCase(caseId, {
      status,
      nextAction: nextActionMap[status] || '',
      completed: status === '完了',
    }, status, '')
  }

`
s = s.replace(buttonHelpersTarget, helpers + buttonHelpersTarget)

// Make each case card clickable and add detail panel after the list.
const oldArticle = `<article className="residentCaseCard" key={item.id}>`
const newArticle = `<article className="residentCaseCard" key={item.id} role="button" tabIndex={0} onClick={() => { setSelectedResidentCaseId(item.id); setResidentHistoryMemo('') }} onKeyDown={event => { if (event.key === 'Enter') { setSelectedResidentCaseId(item.id); setResidentHistoryMemo('') } }}>`
if (!s.includes(oldArticle)) { console.error('案件カードが見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(oldArticle, newArticle)

const listEndTarget = `                      </div>
                    )}
                  </>`
if (!s.includes(listEndTarget)) { console.error('案件一覧の終了位置が見つかりません。変更しませんでした。'); process.exit(1) }
const detail = `                      </div>
                    )}

                    {selectedResidentCaseId && (() => {
                      const item = residentCases.find(caseItem => caseItem.id === selectedResidentCaseId)
                      if (!item) return null
                      const history = [...(item.history || [])].sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
                      return <section className="card residentCaseDetail">
                        <div className="residentCaseDetailTop">
                          <div><p className="eyebrow">CASE DETAIL</p><h2>{item.propertyName || '物件名未設定'} {item.unit ? item.unit + '号室' : ''}</h2></div>
                          <button className="back" type="button" onClick={() => setSelectedResidentCaseId('')}>閉じる</button>
                        </div>
                        <p className="residentCaseDetailRequest">{item.requestDetails || '依頼内容未入力'}</p>
                        {item.residentContact && <a className="primary residentCallButton" href={'tel:' + item.residentContact}>📞 入居者へ電話する</a>}
                        <div className="residentQuickActions">
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '不通')}>不通</button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '不通（メール送信）')}>メール送信済</button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '連絡済（入居者のスケジュール確認待ち）')}>日程回答待ち</button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '見積提出済（発注待ち）')}>発注待ち</button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '完了（未報告）')}>完了・未報告</button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '完了')}>完了</button>
                        </div>
                        <div className="residentCaseDetailGrid">
                          <label><span>進捗</span><select value={item.status} onChange={event => applyResidentQuickStatus(item.id, event.target.value)}>{residentCaseStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
                          <label><span>次にやること</span><input value={item.nextAction || ''} onChange={event => updateResidentCase(item.id, { nextAction: event.target.value })} /></label>
                          <label><span>対応期限</span><input type="date" value={item.actionDueDate || ''} onChange={event => updateResidentCase(item.id, { actionDueDate: event.target.value })} /></label>
                          <label><span>連絡先</span><input value={item.residentContact || ''} onChange={event => updateResidentCase(item.id, { residentContact: event.target.value })} /></label>
                          <label className="wide"><span>備考</span><textarea rows="2" value={item.note || ''} onChange={event => updateResidentCase(item.id, { note: event.target.value })} /></label>
                        </div>
                        <div className="residentHistoryAdd">
                          <input type="text" value={residentHistoryMemo} onChange={event => setResidentHistoryMemo(event.target.value)} placeholder="対応メモを入力" />
                          <button className="secondaryButton" type="button" onClick={() => {
                            const memoText = residentHistoryMemo.trim()
                            if (!memoText) return
                            updateResidentCase(item.id, {}, item.status || '対応メモ', memoText)
                            setResidentHistoryMemo('')
                          }}>履歴に追加</button>
                        </div>
                        <div className="residentHistoryList">
                          <h3>対応履歴</h3>
                          {history.length === 0 ? <p className="empty">履歴はありません</p> : history.map(log => <div className="residentHistoryItem" key={log.id || log.at}><div><strong>{log.status || '対応'}</strong><small>{log.at ? new Date(log.at).toLocaleString('ja-JP') : ''}</small></div>{log.memo && <p>{log.memo}</p>}</div>)}
                        </div>
                      </section>
                    })()}
                  </>`
s = s.replace(listEndTarget, detail)

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS追加位置が見つかりません。変更しませんでした。'); process.exit(1) }
const css = `/* M-CROSS_RESIDENT_CASES_STEP5_STYLE */
.residentCaseCard{cursor:pointer}.residentCaseCard:focus-visible{outline:3px solid #78a4ee;outline-offset:2px}.residentCaseDetail{display:grid;gap:13px;margin-top:8px}.residentCaseDetailTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.residentCaseDetailTop h2,.residentCaseDetailTop p{margin:0}.residentCaseDetailRequest{margin:0;padding:12px;border-radius:12px;background:rgba(90,130,200,.07);font-weight:750}.residentCallButton{display:block;text-decoration:none;text-align:center}.residentQuickActions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.residentQuickActions button{min-height:44px;padding:9px;border:1px solid rgba(95,125,180,.28);border-radius:12px;background:#fff;color:inherit;font-weight:850}.residentCaseDetailGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.residentCaseDetailGrid label{display:grid;gap:5px}.residentCaseDetailGrid label>span{font-size:12px;font-weight:850;color:#687386}.residentCaseDetailGrid input,.residentCaseDetailGrid select,.residentCaseDetailGrid textarea,.residentHistoryAdd input{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid rgba(100,120,150,.28);border-radius:11px;background:#fff;color:inherit;font:inherit}.residentCaseDetailGrid .wide{grid-column:1/-1}.residentHistoryAdd{display:grid;grid-template-columns:1fr auto;gap:8px}.residentHistoryAdd .secondaryButton{width:auto;margin:0}.residentHistoryList{display:grid;gap:8px}.residentHistoryList h3{margin:5px 0}.residentHistoryItem{display:grid;gap:5px;padding:10px 12px;border-left:4px solid #7f9fe3;border-radius:10px;background:rgba(105,135,200,.07)}.residentHistoryItem>div{display:flex;align-items:center;justify-content:space-between;gap:8px}.residentHistoryItem small{color:#777}.residentHistoryItem p{margin:0}@media(max-width:560px){.residentCaseDetailGrid{grid-template-columns:1fr}.residentCaseDetailGrid .wide{grid-column:auto}.residentHistoryAdd{grid-template-columns:1fr}.residentHistoryAdd .secondaryButton{width:100%}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('入居中案件 STEP5 OK')
console.log('案件詳細 / 電話 / 進捗変更 / 次の行動 / 対応履歴を追加しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
