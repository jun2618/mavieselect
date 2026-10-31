const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step6-layout-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP6_LAYOUT_FIX_V1 */'

if (s.includes(marker)) {
  console.log('STEP6 レイアウト修正は適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP6_TIME_RANGE */')) {
  console.error('時間帯対応STEP6が見つかりません。変更しませんでした。')
  process.exit(1)
}

// JSX内に誤って表示されているコメントを、正しいJSXコメントへ修正。
s = s.replace(
  '/* M-CROSS_RESIDENT_CASES_STEP6_TIME_RANGE */',
  '{/* M-CROSS_RESIDENT_CASES_STEP6_TIME_RANGE */}'
)

// 現在の2つの訪問ブロックを、スマホ向けに日付 + 開始 + 終了の3入力へ作り直す。
const siteStart = s.indexOf('<div className="residentVisitEditor wide">')
const workStart = s.indexOf('<div className="residentVisitEditor wide">', siteStart + 1)

if (siteStart === -1 || workStart === -1) {
  console.error('現調・工事入力ブロックが見つかりません。変更しませんでした。')
  process.exit(1)
}

function findBalancedDivEnd(text, start) {
  let depth = 0
  const re = /<div\b[^>]*>|<\/div>/g
  re.lastIndex = start
  let match
  while ((match = re.exec(text))) {
    if (match[0].startsWith('</div')) depth -= 1
    else depth += 1
    if (depth === 0) return re.lastIndex
  }
  return -1
}

const siteEnd = findBalancedDivEnd(s, siteStart)
const workStart2 = s.indexOf('<div className="residentVisitEditor wide">', siteEnd)
const workEnd = findBalancedDivEnd(s, workStart2)

if (siteEnd === -1 || workStart2 === -1 || workEnd === -1) {
  console.error('訪問入力ブロックの終了位置を確認できません。変更しませんでした。')
  process.exit(1)
}

const block = `<div className="residentVisitEditor wide">
                            <h3>現調予定</h3>
                            <div className="residentVisitDateRow">
                              <label><span>日付</span><input type="date" value={(item.siteVisitAt || '').slice(0, 10)} onChange={event => {
                                const dateValue = event.target.value
                                const currentTime = (item.siteVisitAt || '').slice(11, 16) || '09:00'
                                const startValue = dateValue ? dateValue + 'T' + currentTime : ''
                                const endTime = (item.siteVisitEndAt || '').slice(11, 16) || '10:00'
                                const endValue = dateValue ? dateValue + 'T' + endTime : ''
                                updateResidentCase(item.id, {
                                  siteVisitAt: startValue,
                                  siteVisitEndAt: endValue,
                                  status: dateValue ? '連絡済（現調日確定）' : item.status,
                                  nextAction: dateValue ? '現調へ訪問' : item.nextAction,
                                }, dateValue ? '連絡済（現調日確定）' : '', dateValue ? '現調日を登録' : '')
                              }} /></label>
                              <label><span>開始</span><input type="time" value={(item.siteVisitAt || '').slice(11, 16)} disabled={!item.siteVisitAt} onChange={event => {
                                const dateValue = (item.siteVisitAt || '').slice(0, 10)
                                updateResidentCase(item.id, { siteVisitAt: dateValue && event.target.value ? dateValue + 'T' + event.target.value : '' })
                              }} /></label>
                              <label><span>終了</span><input type="time" value={(item.siteVisitEndAt || '').slice(11, 16)} disabled={!item.siteVisitAt} onChange={event => {
                                const dateValue = (item.siteVisitAt || '').slice(0, 10)
                                updateResidentCase(item.id, { siteVisitEndAt: dateValue && event.target.value ? dateValue + 'T' + event.target.value : '' })
                              }} /></label>
                            </div>
                            {item.siteVisitAt && item.siteVisitEndAt && new Date(item.siteVisitEndAt) <= new Date(item.siteVisitAt) && <p className="saveStatus" role="alert">終了時刻は開始時刻より後にしてください</p>}
                            <button className="secondaryButton residentCalendarButton" type="button" disabled={!item.siteVisitAt || !item.siteVisitEndAt || new Date(item.siteVisitEndAt) <= new Date(item.siteVisitAt)} onClick={() => downloadResidentCaseCalendar(item, 'site')}>📅 現調をカレンダーへ追加</button>
                          </div>
                          <div className="residentVisitEditor wide">
                            <h3>工事予定</h3>
                            <div className="residentVisitDateRow">
                              <label><span>日付</span><input type="date" value={(item.workVisitAt || '').slice(0, 10)} onChange={event => {
                                const dateValue = event.target.value
                                const currentTime = (item.workVisitAt || '').slice(11, 16) || '09:00'
                                const startValue = dateValue ? dateValue + 'T' + currentTime : ''
                                const endTime = (item.workVisitEndAt || '').slice(11, 16) || '10:00'
                                const endValue = dateValue ? dateValue + 'T' + endTime : ''
                                updateResidentCase(item.id, {
                                  workVisitAt: startValue,
                                  workVisitEndAt: endValue,
                                  status: dateValue ? '連絡済（作業日確定）' : item.status,
                                  nextAction: dateValue ? '工事へ訪問' : item.nextAction,
                                }, dateValue ? '連絡済（作業日確定）' : '', dateValue ? '工事日を登録' : '')
                              }} /></label>
                              <label><span>開始</span><input type="time" value={(item.workVisitAt || '').slice(11, 16)} disabled={!item.workVisitAt} onChange={event => {
                                const dateValue = (item.workVisitAt || '').slice(0, 10)
                                updateResidentCase(item.id, { workVisitAt: dateValue && event.target.value ? dateValue + 'T' + event.target.value : '' })
                              }} /></label>
                              <label><span>終了</span><input type="time" value={(item.workVisitEndAt || '').slice(11, 16)} disabled={!item.workVisitAt} onChange={event => {
                                const dateValue = (item.workVisitAt || '').slice(0, 10)
                                updateResidentCase(item.id, { workVisitEndAt: dateValue && event.target.value ? dateValue + 'T' + event.target.value : '' })
                              }} /></label>
                            </div>
                            {item.workVisitAt && item.workVisitEndAt && new Date(item.workVisitEndAt) <= new Date(item.workVisitAt) && <p className="saveStatus" role="alert">終了時刻は開始時刻より後にしてください</p>}
                            <button className="secondaryButton residentCalendarButton" type="button" disabled={!item.workVisitAt || !item.workVisitEndAt || new Date(item.workVisitEndAt) <= new Date(item.workVisitAt)} onClick={() => downloadResidentCaseCalendar(item, 'work')}>📅 工事をカレンダーへ追加</button>
                          </div>`

s = s.slice(0, siteStart) + block + s.slice(workEnd)

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const css = `/* M-CROSS_RESIDENT_STEP6_LAYOUT_FIX_V1 */
.residentVisitEditor{display:grid!important;grid-template-columns:1fr!important;gap:10px;padding:12px!important}.residentVisitEditor h3{margin:0;font-size:15px}.residentVisitDateRow{display:grid;grid-template-columns:minmax(150px,1.35fr) minmax(105px,.8fr) minmax(105px,.8fr);gap:8px;align-items:end}.residentVisitDateRow label{min-width:0}.residentVisitDateRow input{min-width:0;width:100%;box-sizing:border-box}.residentCalendarButton{width:100%!important;margin:0!important;min-height:44px}.residentVisitEditor>.saveStatus{margin:0}@media(max-width:620px){.residentVisitDateRow{grid-template-columns:1fr 1fr}.residentVisitDateRow label:first-child{grid-column:1/-1}.residentVisitDateRow input{font-size:16px}.residentCalendarButton{white-space:normal}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP6 表示修正 OK')
console.log('現調・工事を「日付 / 開始 / 終了」に分けました')
console.log('スマホではカレンダーボタンを下段100%幅で表示します')
console.log('画面に露出していたコメントも修正しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
