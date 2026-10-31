const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const diagJs = path.join(root, 'src', 'estimateVersionDiagnostics.js')
const diagCss = path.join(root, 'src', 'estimateVersionDiagnostics.css')
const backup = appPath + '.before-version-display-snapshot-v5'
const marker = 'M-CROSS_VERSION_DISPLAY_FROM_SNAPSHOT_V5_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 見積版表示V5は適用済みです。'); process.exit(0) }

const stateAnchor = "  const [openedEstimateVersion, setOpenedEstimateVersion] = useState(null)"
const functionRegex = /  \/\* M-CROSS_ESTIMATE_VERSION_RESTORE_DELAY_V4_SAFE \*\/[\s\S]*?  function openSavedEstimateVersion\(entry, version\) \{[\s\S]*?\n  \}\n\n/
const rowsAnchor = `              const estimateRows = applyEstimateEdits(rawEstimateRows, estimateEdits)`
const diagImportRegex = /^import \{ openEstimateVersionDiagnostics \} from ['"]\.\/estimateVersionDiagnostics['"].*\r?\n?/m
const diagnosticClick = `onClick={(event) => { event.stopPropagation(); openEstimateVersionDiagnostics(entry, versions) }}`

if (!app.includes(stateAnchor)) fail('openedEstimateVersion stateが見つかりません。')
if (!functionRegex.test(app)) fail('現在のopenSavedEstimateVersion関数を特定できません。')
if (!app.includes(rowsAnchor)) fail('estimateRows生成位置が見つかりません。')
if (!app.includes(diagnosticClick)) fail('診断用クリック処理が見つかりません。')

fs.copyFileSync(appPath, backup)
try {
  // 診断中の一時処理を外す。
  app = app.replace(diagImportRegex, '')
  app = app.replace(diagnosticClick, 'onClick={() => openSavedEstimateVersion(entry, version)}')

  // 選択した版の完成済み明細を、そのまま表示する専用state。
  app = app.replace(stateAnchor, `${stateAnchor}\n  /* ${marker} */\n  const [openedEstimateRows, setOpenedEstimateRows] = useState(null)`)

  // estimateEditKeyへの再変換をやめる。保存されたrowsを直接表示する。
  const newFunction = `  /* ${marker} */
  function openSavedEstimateVersion(entry, version) {
    const snapshotRows = Array.isArray(version?.rows)
      ? JSON.parse(JSON.stringify(version.rows))
      : []
    const snapshotAdditionalWorks = Array.isArray(version?.additionalWorks)
      ? JSON.parse(JSON.stringify(version.additionalWorks))
      : []

    openSavedEntry(entry)
    window.setTimeout(() => {
      setOpenedEstimateRows(snapshotRows)
      setAdditionalWorks(snapshotAdditionalWorks)
      setOpenedEstimateVersion(Number(version?.version) || 1)
      setShowEstimate(true)
      setShowRoomManagement(false)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }, 0)
  }

`
  app = app.replace(functionRegex, newFunction)

  // 版ファイルを開いている間はsnapshot rowsを優先して描画する。
  app = app.replace(rowsAnchor, `              const estimateRows = openedEstimateRows ?? applyEstimateEdits(rawEstimateRows, estimateEdits)`)

  // 通常の保存済みカードから案件を開いた場合は、版表示を解除する。
  const openSavedEntryAnchor = `  function openSavedEntry(entry) {\n    requestNavigation(() => loadSavedEntry(entry))\n  }`
  if (app.includes(openSavedEntryAnchor)) {
    app = app.replace(openSavedEntryAnchor, `  function openSavedEntry(entry) {\n    if (openedEstimateVersion == null) setOpenedEstimateRows(null)\n    requestNavigation(() => loadSavedEntry(entry))\n  }`)
  }

  fs.writeFileSync(appPath, app, 'utf8')

  // 診断専用ファイルは今回の修正後は不要。
  if (fs.existsSync(diagJs)) fs.unlinkSync(diagJs)
  if (fs.existsSync(diagCss)) fs.unlinkSync(diagCss)

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 無印・②・③を保存済みsnapshotの内容で直接表示するV5を適用しました。')
  console.log('  - estimateEditKeyへの再変換を廃止')
  console.log('  - version.rowsをそのまま見積画面へ表示')
  console.log('  - 診断用クリック処理を解除')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  process.exit(1)
}
