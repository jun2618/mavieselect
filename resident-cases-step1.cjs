const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step1-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP1 */'

if (s.includes(marker)) {
  console.log('入居中案件 STEP1 はすでに適用済みです')
  process.exit(0)
}

// Appコンポーネント内の既存stateを安全な目印として使います。
const stateTarget = "  const [additionalWorks, setAdditionalWorks] = useState([])"
if (!s.includes(stateTarget)) {
  console.error('additionalWorks state が見つかりません。変更しませんでした。')
  process.exit(1)
}

const helperTarget = 'function splitMeasurementType(type) {'
if (!s.includes(helperTarget)) {
  console.error('共通関数の追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const helperCode = `/* M-CROSS_RESIDENT_CASES_STEP1 */
const residentCasesStorageKey = 'mcross_resident_cases_v1'

const residentCaseStatuses = [
  '未連絡',
  '不通',
  '不通（メール送信）',
  '連絡済（現調日確定）',
  '連絡済（作業日確定）',
  '連絡済（入居者のスケジュール確認待ち）',
  '見積提出済（発注待ち）',
  '発注（未連絡）',
  '発注（不通）',
  '発注（工事日確定）',
  '完了（未報告）',
  '完了',
]

function createResidentCaseId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'resident-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
}

function normalizeResidentCase(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    id: source.id || createResidentCaseId(),
    requestDate: source.requestDate || '',
    company: source.company || '',
    propertyName: source.propertyName || '',
    unit: source.unit || '',
    address: source.address || '',
    residentContact: source.residentContact || '',
    requestDetails: source.requestDetails || '',
    note: source.note || '',
    status: residentCaseStatuses.includes(source.status) ? source.status : '未連絡',
    nextAction: source.nextAction || '',
    actionDueDate: source.actionDueDate || '',
    siteVisitAt: source.siteVisitAt || '',
    workVisitAt: source.workVisitAt || '',
    caution: source.caution || '',
    history: Array.isArray(source.history) ? source.history : [],
    completed: Boolean(source.completed),
    createdAt: source.createdAt || new Date().toISOString(),
    updatedAt: source.updatedAt || new Date().toISOString(),
  }
}

function loadResidentCases() {
  try {
    const raw = localStorage.getItem(residentCasesStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeResidentCase) : []
  } catch (error) {
    console.error('入居中案件を読み込めませんでした。', error)
    return []
  }
}

function saveResidentCases(cases) {
  try {
    localStorage.setItem(
      residentCasesStorageKey,
      JSON.stringify(Array.isArray(cases) ? cases : [])
    )
    return true
  } catch (error) {
    console.error('入居中案件を保存できませんでした。', error)
    return false
  }
}

`

s = s.replace(helperTarget, helperCode + helperTarget)

const stateReplacement = `${stateTarget}
  const [residentCases, setResidentCases] = useState(() => loadResidentCases())`
s = s.replace(stateTarget, stateReplacement)

// residentCasesが変わるたびに端末へ保存する土台だけ追加します。
const roomsTarget = '  const rooms = projectRooms'
if (!s.includes(roomsTarget)) {
  console.error('rooms state の位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const saveEffect = `${roomsTarget}

  useEffect(() => {
    saveResidentCases(residentCases)
  }, [residentCases])`
s = s.replace(roomsTarget, saveEffect)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('入居中案件 STEP1 OK')
console.log('追加内容: データ形式 / ステータス / ID / localStorage保存 / residentCases state')
console.log('画面はまだ変更していません')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
