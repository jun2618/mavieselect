const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step6-calendar-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP6 */'

if (s.includes(marker)) {
  console.log('入居中案件 STEP6 はすでに適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP5 */')) {
  console.error('STEP5が見つかりません。変更しませんでした。')
  process.exit(1)
}

/* ---------------------------------------------------------
   1. カレンダー（ICS）生成用の共通関数
--------------------------------------------------------- */
const helperTarget = 'function splitMeasurementType(type) {'
if (!s.includes(helperTarget)) {
  console.error('共通関数の追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const helperCode = `/* M-CROSS_RESIDENT_CASES_STEP6 */
function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatIcsLocalDateTime(value) {
  const text = String(value || '').replace(/[-:]/g, '')
  return text ? text + '00' : ''
}

function addMinutesToLocalDateTime(value, minutes) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() + minutes)
  const pad = number => String(number).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes())
}

function downloadResidentCaseCalendar(item, visitType) {
  const isWork = visitType === 'work'
  const startValue = isWork ? item.workVisitAt : item.siteVisitAt
  if (!startValue) return false

  const endValue = addMinutesToLocalDateTime(startValue, 60)
  const title = '【入居中・' + (isWork ? '工事' : '現調') + '】'
    + (item.propertyName || '物件名未設定')
    + (item.unit ? ' ' + item.unit + '号室' : '')

  const description = [
    item.requestDetails ? '依頼内容：' + item.requestDetails : '',
    item.residentContact ? '入居者連絡先：' + item.residentContact : '',
    item.note ? '備考：' + item.note : '',
    item.caution ? '注意事項：' + item.caution : '',
  ].filter(Boolean).join('\\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//M-Cross//Resident Case//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + escapeIcsText(item.id) + '-' + visitType + '@mcross.local',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\\.\\d{3}Z$/, 'Z'),
    'DTSTART:' + formatIcsLocalDateTime(startValue),
    'DTEND:' + formatIcsLocalDateTime(endValue),
    'SUMMARY:' + escapeIcsText(title),
    'LOCATION:' + escapeIcsText(item.address || ''),
    'DESCRIPTION:' + escapeIcsText(description),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\\r\\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = (title + '.ics').replace(/[\\/:*?"<>|]/g, '_')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return true
}

`

s = s.replace(helperTarget, helperCode + helperTarget)

/* ---------------------------------------------------------
   2. 詳細画面へ現調日時・工事日時・カレンダー追加を入れる
--------------------------------------------------------- */
const detailTarget = `<label><span>対応期限</span><input type="date" value={item.actionDueDate || ''} onChange={event => updateResidentCase(item.id, { actionDueDate: event.target.value })} /></label>
                          <label><span>連絡先</span><input value={item.residentContact || ''} onChange={event => updateResidentCase(item.id, { residentContact: event.target.value })} /></label>`

if (!s.includes(detailTarget)) {
  console.error('STEP5の詳細入力欄が見つかりません。変更しませんでした。')
  process.exit(1)
}

const detailReplacement = `<label><span>対応期限</span><input type="date" value={item.actionDueDate || ''} onChange={event => updateResidentCase(item.id, { actionDueDate: event.target.value })} /></label>
                          <label><span>連絡先</span><input value={item.residentContact || ''} onChange={event => updateResidentCase(item.id, { residentContact: event.target.value })} /></label>
                          <div className="residentVisitEditor wide">
                            <label><span>現調日時</span><input type="datetime-local" value={item.siteVisitAt || ''} onChange={event => updateResidentCase(item.id, {
                              siteVisitAt: event.target.value,
                              status: event.target.value ? '連絡済（現調日確定）' : item.status,
                              nextAction: event.target.value ? '現調へ訪問' : item.nextAction,
                            }, event.target.value ? '連絡済（現調日確定）' : '', event.target.value ? '現調日時を登録' : '')} /></label>
                            <button className="secondaryButton" type="button" disabled={!item.siteVisitAt} onClick={() => downloadResidentCaseCalendar(item, 'site')}>📅 現調をカレンダーへ追加</button>
                          </div>
                          <div className="residentVisitEditor wide">
                            <label><span>工事日時</span><input type="datetime-local" value={item.workVisitAt || ''} onChange={event => updateResidentCase(item.id, {
                              workVisitAt: event.target.value,
                              status: event.target.value ? '連絡済（作業日確定）' : item.status,
                              nextAction: event.target.value ? '工事へ訪問' : item.nextAction,
                            }, event.target.value ? '連絡済（作業日確定）' : '', event.target.value ? '工事日時を登録' : '')} /></label>
                            <button className="secondaryButton" type="button" disabled={!item.workVisitAt} onClick={() => downloadResidentCaseCalendar(item, 'work')}>📅 工事をカレンダーへ追加</button>
                          </div>`

s = s.replace(detailTarget, detailReplacement)

/* ---------------------------------------------------------
   3. 案件カードへ次の訪問日時を表示
--------------------------------------------------------- */
const cardDueTarget = `{item.actionDueDate && <small>期限：{item.actionDueDate}</small>}`
if (!s.includes(cardDueTarget)) {
  console.error('案件カードの期限表示位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(
  cardDueTarget,
  `{item.siteVisitAt && <small>現調：{new Date(item.siteVisitAt).toLocaleString('ja-JP')}</small>}
                            {item.workVisitAt && <small>工事：{new Date(item.workVisitAt).toLocaleString('ja-JP')}</small>}
                            {item.actionDueDate && <small>期限：{item.actionDueDate}</small>}`
)

/* ---------------------------------------------------------
   4. 表示調整
--------------------------------------------------------- */
const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const css = `/* M-CROSS_RESIDENT_CASES_STEP6_STYLE */
.residentVisitEditor{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:9px;padding:11px;border:1px solid rgba(80,135,205,.25);border-radius:13px;background:rgba(80,135,205,.06)}.residentVisitEditor label{display:grid;gap:5px}.residentVisitEditor .secondaryButton{width:auto;margin:0;white-space:nowrap}.residentVisitEditor .secondaryButton:disabled{opacity:.45;cursor:not-allowed}@media(max-width:620px){.residentVisitEditor{grid-template-columns:1fr}.residentVisitEditor .secondaryButton{width:100%}}
`

s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('入居中案件 STEP6 OK')
console.log('現調日時・工事日時とICSカレンダー追加を実装しました')
console.log('予定時間は登録日時から1時間で作成します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
