const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step2-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP2 */'

if (s.includes(marker)) {
  console.log('入居中案件 STEP2 はすでに適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP1 */')) {
  console.error('STEP1が見つかりません。変更しませんでした。')
  process.exit(1)
}

// App内に、入居中案件画面を開くための状態だけ追加する。
const stateTarget = "  const [residentCases, setResidentCases] = useState(() => loadResidentCases())"
if (!s.includes(stateTarget)) {
  console.error('residentCases stateが見つかりません。変更しませんでした。')
  process.exit(1)
}

const stateReplacement = `${stateTarget}
  /* M-CROSS_RESIDENT_CASES_STEP2 */
  const [showResidentCases, setShowResidentCases] = useState(false)`
s = s.replace(stateTarget, stateReplacement)

// 既存の新規物件画面へ戻る処理で、入居中案件画面も閉じる。
const newPropertyTarget = `      setShowSavedList(false)
      setSettingsOpen(false)`
if (s.includes(newPropertyTarget)) {
  s = s.replace(
    newPropertyTarget,
    `      setShowSavedList(false)
      setShowResidentCases(false)
      setSettingsOpen(false)`
  )
}

// トップ画面内の「設定」ボタン周辺を探し、その直前に入居中案件ボタンを追加する。
// current code variationsに耐えるため、設定画面を開く onClick を目印にする。
const settingsPatterns = [
  '<button className="secondaryButton" type="button" onClick={() => setSettingsOpen(true)}>',
  '<button type="button" className="secondaryButton" onClick={() => setSettingsOpen(true)}>',
  '<button className="settingsMenuButton" type="button" onClick={() => setSettingsOpen(true)}>',
]

let settingsPos = -1
for (const pattern of settingsPatterns) {
  const pos = s.indexOf(pattern)
  if (pos !== -1) {
    settingsPos = pos
    break
  }
}

if (settingsPos === -1) {
  console.error('トップ画面の設定ボタン位置を安全に確認できません。STEP2は保存しませんでした。')
  process.exit(1)
}

const residentButton = `          <button
            className="secondaryButton residentCasesEntryButton"
            type="button"
            onClick={() => setShowResidentCases(true)}
          >
            入居中案件
          </button>
`

s = s.slice(0, settingsPos) + residentButton + s.slice(settingsPos)

// 画面本体はSTEP3で作るため、STEP2では押した時の仮画面のみ。
// App return内、既存の設定/保存一覧等より前で表示できる安全な位置として main の直前に差し込む。
const mainTarget = '<main className="main">'
const mainPos = s.indexOf(mainTarget)
if (mainPos === -1) {
  console.error('main画面の位置を確認できません。STEP2は保存しませんでした。')
  process.exit(1)
}

const placeholder = `{showResidentCases && (
        <section className="residentCasesPlaceholder" aria-label="入居中案件">
          <div className="card">
            <button className="back" type="button" onClick={() => setShowResidentCases(false)}>← 戻る</button>
            <h2>入居中案件</h2>
            <p className="subtitle">入居中案件の一覧・新規登録画面をここに作ります。</p>
            <div className="summary">
              <div className="summaryLine">
                <span>登録済み案件</span>
                <strong>{residentCases.length}件</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      `

s = s.slice(0, mainPos) + placeholder + s.slice(mainPos)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('入居中案件 STEP2 OK')
console.log('トップ画面に「入居中案件」入口を追加しました')
console.log('現段階では仮画面のみです。既存の採寸機能は変更していません')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
