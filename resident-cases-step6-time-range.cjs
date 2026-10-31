const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step6-time-range-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP6_TIME_RANGE */'

if (s.includes(marker)) {
  console.log('STEP6 時間帯対応はすでに適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP6 */')) {
  console.error('STEP6が見つかりません。変更しませんでした。')
  process.exit(1)
}

/* STEP6で壊れた可能性があるICSエスケープ関数も同時に修復 */
const escapeStart = s.indexOf('function escapeIcsText(value) {')
const escapeEnd = s.indexOf('\nfunction formatIcsLocalDateTime(value) {', escapeStart)
if (escapeStart === -1 || escapeEnd === -1) {
  console.error('ICSエスケープ関数が見つかりません。変更しませんでした。')
  process.exit(1)
}

const fixedEscape = `function escapeIcsText(value) {
  return String(value || '')
    .split('\\\\').join('\\\\\\\\')
    .split('\\r\\n').join('\\\\n')
    .split('\\n').join('\\\\n')
    .split(',').join('\\\\,')
    .split(';').join('\\\\;')
}
`
s = s.slice(0, escapeStart) + fixedEscape + s.slice(escapeEnd)

/* 終了日時を保存できるようにデータ形式を拡張 */
const dataTarget = `    siteVisitAt: source.siteVisitAt || '',
    workVisitAt: source.workVisitAt || '',`
if (!s.includes(dataTarget)) {
  console.error('訪問日時のデータ項目が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(dataTarget, `    siteVisitAt: source.siteVisitAt || '',
    siteVisitEndAt: source.siteVisitEndAt || '',
    workVisitAt: source.workVisitAt || '',
    workVisitEndAt: source.workVisitEndAt || '',`)

/* ICSは自動1時間ではなく、登録された終了日時を使用 */
const downloadStart = s.indexOf('function downloadResidentCaseCalendar(item, visitType) {')
const downloadEnd = s.indexOf('\n}\n\n', downloadStart)
if (downloadStart === -1 || downloadEnd === -1) {
  console.error('カレンダー生成関数の範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

let downloadFunction = s.slice(downloadStart, downloadEnd + 2)
downloadFunction = downloadFunction.replace(
  `  const startValue = isWork ? item.workVisitAt : item.siteVisitAt
  if (!startValue) return false

  const endValue = addMinutesToLocalDateTime(startValue, 60)`,
  `  const startValue = isWork ? item.workVisitAt : item.siteVisitAt
  const endValue = isWork ? item.workVisitEndAt : item.siteVisitEndAt
  if (!startValue || !endValue || new Date(endValue) <= new Date(startValue)) return false`
)

if (!downloadFunction.includes("const endValue = isWork ? item.workVisitEndAt : item.siteVisitEndAt")) {
  console.error('カレンダー終了日時処理を変更できませんでした。変更しませんでした。')
  process.exit(1)
}
s = s.slice(0, downloadStart) + downloadFunction + s.slice(downloadEnd + 2)

/* 現調・工事の入力UIを開始/終了の2項目へ変更 */
const siteStart = s.indexOf('<div className="residentVisitEditor wide">')
const workStart = s.indexOf('<div className="residentVisitEditor wide">', siteStart + 1)
const workEnd = s.indexOf('</div>', workStart)

if (siteStart === -1 || workStart === -1 || workEnd === -1) {
  console.error('現調・工事日時の入力欄が見つかりません。変更しませんでした。')
  process.exit(1)
}

const visitBlockEnd = workEnd + '</div>'.length
const replacement = `/* M-CROSS_RESIDENT_CASES_STEP6_TIME_RANGE */
                          <div className="residentVisitEditor wide">
                            <div className="residentVisitTimeFields">
                              <label><span>現調開始</span><input type="datetime-local" value={item.siteVisitAt || ''} onChange={event => {
                                const startValue = event.target.value
                                const suggestedEnd = startValue && (!item.siteVisitEndAt || new Date(item.siteVisitEndAt) <= new Date(startValue))
                                  ? addMinutesToLocalDateTime(startValue, 60)
                                  : item.siteVisitEndAt
                                updateResidentCase(item.id, {
                                  siteVisitAt: startValue,
                                  siteVisitEndAt: startValue ? suggestedEnd : '',
                                  status: startValue ? '連絡済（現調日確定）' : item.status,
                                  nextAction: startValue ? '現調へ訪問' : item.nextAction,
                                }, startValue ? '連絡済（現調日確定）' : '', startValue ? '現調時間帯を登録' : '')
                              }} /></label>
                              <label><span>現調終了</span><input type="datetime-local" min={item.siteVisitAt || ''} value={item.siteVisitEndAt || ''} onChange={event => updateResidentCase(item.id, { siteVisitEndAt: event.target.value })} /></label>
                            </div>
                            {item.siteVisitAt && item.siteVisitEndAt && new Date(item.siteVisitEndAt) <= new Date(item.siteVisitAt) && <p className="saveStatus" role="alert">終了時刻は開始時刻より後にしてください</p>}
                            <button className="secondaryButton" type="button" disabled={!item.siteVisitAt || !item.siteVisitEndAt || new Date(item.siteVisitEndAt) <= new Date(item.siteVisitAt)} onClick={() => downloadResidentCaseCalendar(item, 'site')}>📅 現調をカレンダーへ追加</button>
                          </div>
                          <div className="residentVisitEditor wide">
                            <div className="residentVisitTimeFields">
                              <label><span>工事開始</span><input type="datetime-local" value={item.workVisitAt || ''} onChange={event => {
                                const startValue = event.target.value
                                const suggestedEnd = startValue && (!item.workVisitEndAt || new Date(item.workVisitEndAt) <= new Date(startValue))
                                  ? addMinutesToLocalDateTime(startValue, 60)
                                  : item.workVisitEndAt
                                updateResidentCase(item.id, {
                                  workVisitAt: startValue,
                                  workVisitEndAt: startValue ? suggestedEnd : '',
                                  status: startValue ? '連絡済（作業日確定）' : item.status,
                                  nextAction: startValue ? '工事へ訪問' : item.nextAction,
                                }, startValue ? '連絡済（作業日確定）' : '', startValue ? '工事時間帯を登録' : '')
                              }} /></label>
                              <label><span>工事終了</span><input type="datetime-local" min={item.workVisitAt || ''} value={item.workVisitEndAt || ''} onChange={event => updateResidentCase(item.id, { workVisitEndAt: event.target.value })} /></label>
                            </div>
                            {item.workVisitAt && item.workVisitEndAt && new Date(item.workVisitEndAt) <= new Date(item.workVisitAt) && <p className="saveStatus" role="alert">終了時刻は開始時刻より後にしてください</p>}
                            <button className="secondaryButton" type="button" disabled={!item.workVisitAt || !item.workVisitEndAt || new Date(item.workVisitEndAt) <= new Date(item.workVisitAt)} onClick={() => downloadResidentCaseCalendar(item, 'work')}>📅 工事をカレンダーへ追加</button>
                          </div>`

s = s.slice(0, siteStart) + replacement + s.slice(visitBlockEnd)

/* 一覧カードも 9:00～10:00 の時間帯表示へ */
s = s.replace(
  `{item.siteVisitAt && <small>現調：{new Date(item.siteVisitAt).toLocaleString('ja-JP')}</small>}`,
  `{item.siteVisitAt && <small>現調：{new Date(item.siteVisitAt).toLocaleString('ja-JP')}{item.siteVisitEndAt ? ' ～ ' + new Date(item.siteVisitEndAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''}</small>}`
)
s = s.replace(
  `{item.workVisitAt && <small>工事：{new Date(item.workVisitAt).toLocaleString('ja-JP')}</small>}`,
  `{item.workVisitAt && <small>工事：{new Date(item.workVisitAt).toLocaleString('ja-JP')}{item.workVisitEndAt ? ' ～ ' + new Date(item.workVisitEndAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''}</small>}`
)

/* 時間入力2列のスタイル */
const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
const css = `/* M-CROSS_RESIDENT_CASES_STEP6_TIME_RANGE_STYLE */
.residentVisitTimeFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.residentVisitEditor{display:grid;grid-template-columns:minmax(0,1fr) auto}.residentVisitEditor>.saveStatus{grid-column:1/-1;margin:0}@media(max-width:620px){.residentVisitTimeFields{grid-template-columns:1fr}.residentVisitEditor{grid-template-columns:1fr}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP6 時間帯対応 OK')
console.log('現調・工事に開始日時と終了日時を追加しました')
console.log('ICS予定にも登録した終了日時を使用します')
console.log('開始入力時は終了を1時間後で仮入力し、自由に変更できます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
