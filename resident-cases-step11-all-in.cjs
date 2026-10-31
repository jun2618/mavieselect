const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step11-all-in-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP11_ALL_IN */'

if (s.includes(marker)) {
  console.log('入居中案件 STEP11 全部乗せは適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP10 */')) {
  console.error('STEP10が見つかりません。変更しませんでした。')
  process.exit(1)
}

/* 1. 保留ステータスを追加 */
const statusNeedle = "  '見積提出済（発注待ち）',"
if (!s.includes(statusNeedle)) {
  console.error('ステータス一覧の追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(statusNeedle, `${statusNeedle}\n  '保留',`)

/* 2. 案件データへ全部乗せ項目を追加 */
const dataNeedle = `    nextAction: source.nextAction || getResidentNextAction(source.status || '未連絡'),
    actionDueDate: source.actionDueDate || '',`
if (!s.includes(dataNeedle)) {
  console.error('案件データ項目の追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(dataNeedle, `    nextAction: source.nextAction || getResidentNextAction(source.status || '未連絡'),
    actionDueDate: source.actionDueDate || '',
    waitingFor: source.waitingFor || '',
    priority: ['urgent', 'normal', 'low'].includes(source.priority) ? source.priority : 'normal',
    isOnHold: Boolean(source.isOnHold) || source.status === '保留',
    holdReason: source.holdReason || '',
    lastActionAt: source.lastActionAt || source.updatedAt || source.createdAt || '',`)

/* 3. 保留時の次の行動 */
const nextActionNeedle = "    '見積提出済（発注待ち）': '発注状況を確認',"
if (!s.includes(nextActionNeedle)) {
  console.error('次の行動マップが見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(nextActionNeedle, `${nextActionNeedle}\n    '保留': '保留中',`)

/* 4. 更新時に最終対応日を自動更新 */
const updateReturnNeedle = `      return normalizeResidentCase({ ...item, ...patch, history: nextHistory, updatedAt: now })`
if (!s.includes(updateReturnNeedle)) {
  console.error('案件更新処理が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(updateReturnNeedle, `      return normalizeResidentCase({
        ...item,
        ...patch,
        history: nextHistory,
        lastActionAt: historyStatus || historyMemo ? now : (item.lastActionAt || now),
        updatedAt: now,
      })`)

/* 5. 保留・復帰関数 */
const quickFunctionNeedle = '  function applyResidentQuickStatus(caseId, status) {'
if (!s.includes(quickFunctionNeedle)) {
  console.error('クイック進捗関数が見つかりません。変更しませんでした。')
  process.exit(1)
}
const holdFunctions = `  ${marker}
  function holdResidentCase(caseId, reason) {
    updateResidentCase(caseId, {
      status: '保留',
      isOnHold: true,
      holdReason: reason || '時期未定',
      nextAction: '保留中',
      actionDueDate: '',
      waitingFor: '',
    }, '保留', reason || '時期未定')
  }

  function resumeResidentCase(caseId) {
    updateResidentCase(caseId, {
      status: '発注（未連絡）',
      isOnHold: false,
      holdReason: '',
      nextAction: '入居者へ工事日を連絡',
    }, '保留解除', '対応中へ戻しました')
  }

`
s = s.replace(quickFunctionNeedle, holdFunctions + quickFunctionNeedle)

/* 6. activeCasesから保留を除外し、保留・長期停滞を計算 */
const activeNeedle = `                  const activeCases = residentCases.filter(item => !item.completed && item.status !== '完了')`
if (!s.includes(activeNeedle)) {
  console.error('対応中案件の計算位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(activeNeedle, `                  const holdCases = residentCases.filter(item => item.isOnHold || item.status === '保留')
                  const activeCases = residentCases.filter(item => !item.completed && item.status !== '完了' && !item.isOnHold && item.status !== '保留')`)

const noDueNeedle = `                  const noDueCases = activeCases.filter(item => !item.actionDueDate && !item.siteVisitAt && !item.workVisitAt)`
if (!s.includes(noDueNeedle)) {
  console.error('見落とし計算位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(noDueNeedle, `${noDueNeedle}
                  const staleBorder = Date.now() - 30 * 24 * 60 * 60 * 1000
                  const staleCases = activeCases.filter(item => {
                    const lastValue = item.lastActionAt || item.updatedAt || item.createdAt
                    const lastDate = lastValue ? new Date(lastValue) : null
                    return lastDate && !Number.isNaN(lastDate.getTime()) && lastDate.getTime() < staleBorder
                  })`)

/* 7. フィルタ対象に保留・待ち・優先度・停滞を追加 */
const sourceNeedle = `                  const sourceCases = residentCaseFilter === 'completed' ? completedCases : activeCases`
if (!s.includes(sourceNeedle)) {
  console.error('フィルタ元案件の計算位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(sourceNeedle, `                  const sourceCases = residentCaseFilter === 'completed'
                    ? completedCases
                    : residentCaseFilter === 'hold'
                      ? holdCases
                      : activeCases`)

const filterNeedle = `                    if (residentCaseFilter === 'nodue' && !noDueCases.some(caseItem => caseItem.id === item.id)) return false`
if (!s.includes(filterNeedle)) {
  console.error('フィルタ条件の追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(filterNeedle, `${filterNeedle}
                    if (residentCaseFilter === 'stale' && !staleCases.some(caseItem => caseItem.id === item.id)) return false
                    if (residentCaseFilter === 'waiting' && !item.waitingFor) return false
                    if (residentCaseFilter === 'urgent' && item.priority !== 'urgent') return false`)

/* 8. 全体件数を4区分へ */
const overallStartNeedle = '<div className="residentOverallCounts">'
const attentionStartNeedle = '<div className={`residentAttentionBanner'
const overallStart = s.indexOf(overallStartNeedle)
const attentionStart = s.indexOf(attentionStartNeedle, overallStart)

if (overallStart === -1 || attentionStart === -1) {
  console.error('全体件数表示の範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

const overallReplacement = `<div className="residentOverallCounts residentOverallCountsFour">
                      <button type="button" className={residentCaseFilter === 'all' ? 'active' : ''} onClick={() => { setResidentCaseFilter('all'); setResidentCaseVisibleCount(10) }}><span>対応中</span><strong>{activeCases.length}</strong></button>
                      <button type="button" className={residentCaseFilter === 'hold' ? 'active' : ''} onClick={() => { setResidentCaseFilter('hold'); setResidentCaseVisibleCount(10) }}><span>保留</span><strong>{holdCases.length}</strong></button>
                      <button type="button" className={residentCaseFilter === 'completed' ? 'active' : ''} onClick={() => { setResidentCaseFilter('completed'); setResidentCaseVisibleCount(10) }}><span>完了</span><strong>{completedCases.length}</strong></button>
                      <div><span>全案件</span><strong>{residentCases.length}</strong></div>
                    </div>
                    `

s = s.slice(0, overallStart) + overallReplacement + s.slice(attentionStart)

/* 9. 見落としバナーに長期停滞を追加 */
const bannerButtonNeedle = `{noDueCases.length > 0 && <button type="button" onClick={() => { setResidentCaseFilter('nodue'); setResidentCaseVisibleCount(10) }}>次回対応日なし {noDueCases.length}件</button>}`
if (!s.includes(bannerButtonNeedle)) {
  console.error('見落としバナーのボタンが見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(bannerButtonNeedle, `<div className="residentAttentionButtons">
                        {noDueCases.length > 0 && <button type="button" onClick={() => { setResidentCaseFilter('nodue'); setResidentCaseVisibleCount(10) }}>次回対応日なし {noDueCases.length}件</button>}
                        {staleCases.length > 0 && <button type="button" onClick={() => { setResidentCaseFilter('stale'); setResidentCaseVisibleCount(10) }}>30日以上動きなし {staleCases.length}件</button>}
                      </div>`)

/* 10. 詳細画面へ誰待ち・優先度・最終対応・保留操作 */
const detailGridNeedle = `<label><span>対応期限</span><input type="date" value={item.actionDueDate || ''} onChange={event => updateResidentCase(item.id, { actionDueDate: event.target.value })} /></label>`
if (!s.includes(detailGridNeedle)) {
  console.error('詳細画面の対応期限欄が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(detailGridNeedle, `${detailGridNeedle}
                          <label><span>誰待ち</span><select value={item.waitingFor || ''} onChange={event => updateResidentCase(item.id, { waitingFor: event.target.value })}>
                            <option value="">自社対応</option><option value="入居者">入居者待ち</option><option value="管理会社">管理会社待ち</option><option value="オーナー">オーナー待ち</option><option value="業者">業者待ち</option>
                          </select></label>
                          <label><span>優先度</span><select value={item.priority || 'normal'} onChange={event => updateResidentCase(item.id, { priority: event.target.value })}>
                            <option value="urgent">🔴 急ぎ</option><option value="normal">🟡 通常</option><option value="low">⚪ 低</option>
                          </select></label>`)

const detailRequestNeedle = `<p className="residentCaseDetailRequest">{item.requestDetails || '依頼内容未入力'}</p>`
if (!s.includes(detailRequestNeedle)) {
  console.error('詳細画面の依頼内容位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(detailRequestNeedle, `${detailRequestNeedle}
                        <div className="residentCaseMetaBadges">
                          <span className={\`priority-\${item.priority || 'normal'}\`}>{item.priority === 'urgent' ? '🔴 急ぎ' : item.priority === 'low' ? '⚪ 低' : '🟡 通常'}</span>
                          {item.waitingFor && <span>⏳ {item.waitingFor}待ち</span>}
                          {item.lastActionAt && <span>最終対応：{new Date(item.lastActionAt).toLocaleDateString('ja-JP')}</span>}
                          {(item.isOnHold || item.status === '保留') && <span className="hold">保留：{item.holdReason || '理由未設定'}</span>}
                        </div>`)

const quickActionsEnd = `                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '完了')}>完了</button>
                        </div>`
if (!s.includes(quickActionsEnd)) {
  console.error('クイック操作の追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(quickActionsEnd, `                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '完了')}>完了</button>
                          {item.isOnHold || item.status === '保留' ? (
                            <button type="button" onClick={() => resumeResidentCase(item.id)}>対応中へ戻す</button>
                          ) : (
                            <button type="button" onClick={() => {
                              const reason = window.prompt('保留理由を入力してください', '管理会社判断待ち')
                              if (reason === null) return
                              holdResidentCase(item.id, reason.trim() || '時期未定')
                            }}>保留にする</button>
                          )}
                        </div>`)

/* 11. 一覧カードにも優先度・誰待ち・最終対応を表示 */
const cardNextNeedle = `<div className="residentCaseNext">
                              <span>次にやること</span>`
if (!s.includes(cardNextNeedle)) {
  console.error('案件カードの次の行動位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(cardNextNeedle, `<div className="residentCardBadges">
                              {item.priority === 'urgent' && <span className="urgent">🔴 急ぎ</span>}
                              {item.waitingFor && <span>⏳ {item.waitingFor}待ち</span>}
                              {(item.isOnHold || item.status === '保留') && <span className="hold">保留</span>}
                            </div>
                            <div className="residentCaseNext">
                              <span>次にやること</span>`)

const dueNeedle = `{item.actionDueDate ? <small>期限：{item.actionDueDate}</small> : (!item.completed && item.status !== '完了' && <small className="residentNoDue">⚠ 次回対応日が未設定</small>)}`
if (!s.includes(dueNeedle)) {
  console.error('カード期限表示が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(dueNeedle, `${dueNeedle}
                            {item.lastActionAt && <small>最終対応：{new Date(item.lastActionAt).toLocaleDateString('ja-JP')}</small>}`)

/* 12. CSS */
const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
const css = `/* M-CROSS_RESIDENT_CASES_STEP11_ALL_IN_STYLE */
.residentOverallCountsFour{grid-template-columns:repeat(4,minmax(0,1fr))}.residentAttentionButtons{display:flex;flex-wrap:wrap;gap:6px}.residentCaseMetaBadges,.residentCardBadges{display:flex;flex-wrap:wrap;gap:6px}.residentCaseMetaBadges span,.residentCardBadges span{padding:4px 8px;border-radius:999px;background:rgba(95,125,180,.1);font-size:11px;font-weight:850}.residentCaseMetaBadges .priority-urgent,.residentCardBadges .urgent{background:rgba(210,70,70,.12);color:#bd3e3e}.residentCaseMetaBadges .priority-low{background:rgba(120,130,145,.10);color:#6d7480}.residentCaseMetaBadges .hold,.residentCardBadges .hold{background:rgba(120,105,155,.13);color:#735a9c}.residentQuickActions button:last-child{border-color:rgba(120,105,155,.35);background:rgba(120,105,155,.08)}@media(max-width:560px){.residentOverallCountsFour{grid-template-columns:repeat(2,1fr)}.residentAttentionButtons{display:grid;width:100%}.residentAttentionButtons button{width:100%}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('入居中案件 STEP11 全部乗せ OK')
console.log('追加: 保留 / 保留理由 / 復帰 / 誰待ち / 優先度 / 最終対応日 / 30日停滞 / 一覧絞込')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
