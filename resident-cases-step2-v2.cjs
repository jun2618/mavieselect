const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step2-v2-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP2_V2 */'

if (s.includes(marker)) {
  console.log('入居中案件 STEP2-V2 はすでに適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP1 */')) {
  console.error('STEP1が見つかりません。変更しませんでした。')
  process.exit(1)
}

const stateTarget = "  const [residentCases, setResidentCases] = useState(() => loadResidentCases())"
if (!s.includes(stateTarget)) {
  console.error('residentCases stateが見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(
  stateTarget,
  `${stateTarget}\n  /* M-CROSS_RESIDENT_CASES_STEP2_V2 */\n  const [showResidentCases, setShowResidentCases] = useState(false)`
)

// 実コードで確認したトップ画面の設定ボタンを目印にする。
const settingsButton = `              <button className="secondaryButton" type="button" onClick={() => { setSettingsPage('home'); setSettingsOpen(true) }}>⚙ M-Cross設定</button>`

if (!s.includes(settingsButton)) {
  console.error('確認済みのトップ画面設定ボタンが見つかりません。変更しませんでした。')
  process.exit(1)
}

const entryButton = `              <button
                className="secondaryButton residentCasesEntryButton"
                type="button"
                onClick={() => setShowResidentCases(true)}
              >
                入居中案件
              </button>\n`

s = s.replace(settingsButton, entryButton + settingsButton)

// トップ画面の main を特定し、既存カードの手前に仮画面を差し込むのではなく、
// started=false 側の main 内で showResidentCases により表示を切り替える。
const topMainStart = s.lastIndexOf('<main className="main">', s.indexOf(settingsButton))
if (topMainStart === -1) {
  console.error('トップ画面のmain開始位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const topMainClose = s.indexOf('          </main>', s.indexOf(settingsButton))
if (topMainClose === -1) {
  console.error('トップ画面のmain終了位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const mainOpenEnd = topMainStart + '<main className="main">'.length
const originalTopContent = s.slice(mainOpenEnd, topMainClose)

const replacementTopContent = `
            {showResidentCases ? (
              <section className="card residentCasesPlaceholder" aria-label="入居中案件">
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
              </section>
            ) : (
              <>
${originalTopContent}
              </>
            )}
`

s = s.slice(0, mainOpenEnd) + replacementTopContent + s.slice(topMainClose)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('入居中案件 STEP2-V2 OK')
console.log('トップ画面に「入居中案件」入口を追加しました')
console.log('押すと登録件数を表示する仮画面へ切り替わります')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
