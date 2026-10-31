const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step6-download-delete-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP6_DOWNLOAD_DELETE_V1 */'

if (s.includes(marker)) {
  console.log('カレンダー説明・案件削除対応は適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP5 */')) {
  console.error('STEP5が見つかりません。変更しませんでした。')
  process.exit(1)
}

// 案件削除関数を追加
const functionTarget = '  function applyResidentQuickStatus(caseId, status) {'
if (!s.includes(functionTarget)) {
  console.error('案件操作関数の追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const deleteFunction = `  ${marker}
  function deleteResidentCase(caseId) {
    const target = residentCases.find(item => item.id === caseId)
    if (!target) return
    const label = (target.propertyName || '物件名未設定') + (target.unit ? ' ' + target.unit + '号室' : '')
    if (!window.confirm('「' + label + '」の入居中案件を削除しますか？\\n\\nこの操作は元に戻せません。')) return
    setResidentCases(previous => previous.filter(item => item.id !== caseId))
    setSelectedResidentCaseId('')
    setResidentHistoryMemo('')
  }

`
s = s.replace(functionTarget, deleteFunction + functionTarget)

// 詳細画面の末尾、履歴の後に削除ボタンを追加
const detailEnd = `                        <div className="residentHistoryList">
                          <h3>対応履歴</h3>`
if (!s.includes(detailEnd)) {
  console.error('対応履歴の位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

// residentHistoryList の閉じ div の直後を狙うため、履歴mapの既知行を使用
const historyClosePattern = `                          {history.length === 0 ? <p className="empty">履歴はありません</p> : history.map(log => <div className="residentHistoryItem" key={log.id || log.at}><div><strong>{log.status || '対応'}</strong><small>{log.at ? new Date(log.at).toLocaleString('ja-JP') : ''}</small></div>{log.memo && <p>{log.memo}</p>}</div>)}
                        </div>`

if (!s.includes(historyClosePattern)) {
  console.error('対応履歴の終了位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(historyClosePattern, `${historyClosePattern}
                        <div className="residentDangerZone">
                          <button className="dangerButton residentDeleteCaseButton" type="button" onClick={() => deleteResidentCase(item.id)}>この案件を削除</button>
                        </div>`)

// 既存のICSボタンの直前に説明を表示。ダウンロード動作自体は現状維持。
const calendarButtons = [
  `                            <button className="secondaryButton residentCalendarButton" type="button" disabled={!item.siteVisitAt || !item.siteVisitEndAt || new Date(item.siteVisitEndAt) <= new Date(item.siteVisitAt)} onClick={() => downloadResidentCaseCalendar(item, 'site')}>📅 現調をカレンダーへ追加</button>`,
  `                            <button className="secondaryButton residentCalendarButton" type="button" disabled={!item.workVisitAt || !item.workVisitEndAt || new Date(item.workVisitEndAt) <= new Date(item.workVisitAt)} onClick={() => downloadResidentCaseCalendar(item, 'work')}>📅 工事をカレンダーへ追加</button>`,
]

let calendarNoteAdded = false
calendarButtons.forEach(button => {
  if (s.includes(button)) {
    s = s.replace(button, `                            <p className="residentCalendarNote">予定ファイル（.ics）をダウンロードします。ダウンロード後に開いてカレンダーへ追加してください。</p>\n${button}`)
    calendarNoteAdded = true
  }
})

if (!calendarNoteAdded) {
  console.log('注意: カレンダーボタン形式が異なるため説明文の追加はスキップしました。案件削除は追加されます。')
}

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const css = `/* M-CROSS_RESIDENT_STEP6_DOWNLOAD_DELETE_V1_STYLE */
.residentCalendarNote{margin:0;color:#6e7580;font-size:11px;line-height:1.5}.residentDangerZone{margin-top:8px;padding-top:14px;border-top:1px dashed rgba(190,75,85,.35)}.residentDeleteCaseButton{width:100%;min-height:44px;margin:0}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('カレンダー説明・案件削除対応 OK')
console.log('ICSがダウンロードされることを画面に明記しました')
console.log('案件詳細の一番下に「この案件を削除」を追加しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
