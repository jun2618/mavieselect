const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-estimate-file-open-content-step2'
const marker = 'M-CROSS_ESTIMATE_FILE_OPEN_CONTENT_STEP2_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 見積ファイル内容読込STEP2は適用済みです。'); process.exit(0) }

const stateAnchor = "  const [estimateVersions, setEstimateVersions] = useState([])"
const explorerStart = "                          const items = ["
const currentClick = "onClick={() => openSavedEntry(entry)}"
const versionClick = "onClick={() => openSavedEntry(entry)}"

if (!app.includes(stateAnchor)) fail('estimateVersions stateが見つかりません。')
if (!app.includes(explorerStart)) fail('エクスプローラーの見積ファイル生成位置が見つかりません。')

// エクスプローラーの版ファイルbuttonを正確に取得。
const versionButtonRegex = /<button className="savedExplorerFile estimateVersionExplorerFile"[\s\S]*?<\/button>/g
const versionButtons = app.match(versionButtonRegex) || []
if (versionButtons.length !== 1) fail('保存済み見積版ボタンの一致数が ' + versionButtons.length + ' 件です。')
if (!versionButtons[0].includes(versionClick)) fail('見積版ボタンのopenSavedEntry処理が見つかりません。')

// 無印ファイルbuttonを正確に取得。
const currentButtonRegex = /<button className="savedExplorerFile" type="button" key=\{\(entry\.storageKey \|\| index\) \+ '-current'\}[\s\S]*?<\/button>/g
const currentButtons = app.match(currentButtonRegex) || []
if (currentButtons.length !== 1) fail('無印見積ボタンの一致数が ' + currentButtons.length + ' 件です。')
if (!currentButtons[0].includes(currentClick)) fail('無印見積ボタンのopenSavedEntry処理が見つかりません。')

fs.copyFileSync(appPath, backupPath)

try {
  // どの版を開いたかを保持する。nullは現在案件、1以上は保存済み版。
  app = app.replace(stateAnchor, `${stateAnchor}\n  /* ${marker} */\n  const [openedEstimateVersion, setOpenedEstimateVersion] = useState(null)`)

  // 保存済み版を通常画面へ読み込む関数。
  // snapshot.rowsをestimateEditsへ戻し、snapshot.additionalWorksも復元する。
  const helperAnchor = '  function openSavedEntry(entry) {'
  if (!app.includes(helperAnchor)) throw new Error('openSavedEntry関数が見つかりません。')
  const helper = `  function openSavedEstimateVersion(entry, version) {
    openSavedEntry(entry)
    window.setTimeout(() => {
      const restoredEdits = {}
      ;(Array.isArray(version?.rows) ? version.rows : []).forEach(row => {
        try {
          const key = estimateEditKey(row)
          restoredEdits[key] = {
            parts: Array.isArray(row.parts) ? [0, 1, 2, 3].map(index => String(row.parts[index] || '')) : [String(row.label || row.name || ''), '', '', ''],
            memo: String(row.memo || ''),
            quantity: row.quantity ?? '',
            unit: String(row.unit || ''),
            rate: row.rate ?? '',
            amount: row.amount ?? '',
            amountMode: 'manual',
          }
        } catch (error) {
          console.error('見積版の明細復元に失敗', error, row)
        }
      })
      setEstimateEdits(restoredEdits)
      setAdditionalWorks(Array.isArray(version?.additionalWorks) ? JSON.parse(JSON.stringify(version.additionalWorks)) : [])
      setOpenedEstimateVersion(Number(version?.version) || 1)
      setShowEstimate(true)
      setShowRoomManagement(false)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }, 0)
  }

${helperAnchor}`
  app = app.replace(helperAnchor, helper)

  // 無印ファイル: 保存済みversion1があれば、その内容を開く。なければ従来案件を開く。
  const oldCurrent = currentButtons[0]
  const newCurrent = oldCurrent.replace(
    currentClick,
    "onClick={() => { const firstVersion = versions.find(item => Number(item.version) === 1); if (firstVersion) openSavedEstimateVersion(entry, firstVersion); else { setOpenedEstimateVersion(1); openSavedEntry(entry) } }}"
  )
  app = app.replace(oldCurrent, newCurrent)

  // ②・③ファイル: 選んだsnapshotの内容を通常画面へ復元して開く。
  const oldVersion = versionButtons[0]
  const newVersion = oldVersion.replace(versionClick, 'onClick={() => openSavedEstimateVersion(entry, version)}')
  app = app.replace(oldVersion, newVersion)

  // 通常の現在案件を開く場所では、開いている版をクリア。
  const loadFnAnchor = '  function loadSavedEntry(entry) {'
  if (!app.includes(loadFnAnchor)) throw new Error('loadSavedEntry関数が見つかりません。')
  app = app.replace(loadFnAnchor, `${loadFnAnchor}\n    if (openedEstimateVersion == null) setOpenedEstimateVersion(null)`)

  // 見積画面の見出しは、選択した版を優先する。
  const headingCandidates = [
    `<h2>{selectedProperty?.name} {unit}号室{/* M-CROSS_INITIAL_ESTIMATE_UNMARKED_V1_SAFE 初回見積は無印 */}</h2>`,
    `<h2>{selectedProperty?.name} {unit}号室</h2>`,
  ]
  let headingChanged = false
  for (const heading of headingCandidates) {
    if (app.includes(heading)) {
      app = app.replace(heading, `<h2>{selectedProperty?.name} {unit}号室{openedEstimateVersion ? estimateVersionMark(openedEstimateVersion) : ''}</h2>`)
      headingChanged = true
      break
    }
  }
  if (!headingChanged) throw new Error('見積画面の見出しが見つかりません。')

  // 「現在編集中」の名称も、開いた版を優先。
  const panelProp = `currentVersion={currentEstimateVersion}`
  if (app.includes(panelProp)) {
    app = app.replace(panelProp, `currentVersion={openedEstimateVersion || currentEstimateVersion}`)
  }

  fs.writeFileSync(appPath, app, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 無印・②・③を選んだ内容で通常画面へ開くSTEP2を適用しました。')
  console.log('  - 無印は保存済みversion1の内容を復元')
  console.log('  - ②はversion2、③はversion3の内容を復元')
  console.log('  - 閲覧専用モーダルは使用しません')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
