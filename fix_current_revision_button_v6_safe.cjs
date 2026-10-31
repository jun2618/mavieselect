const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-current-revision-button-v6'
const marker = 'M-CROSS_CURRENT_REVISION_BUTTON_V6_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')

if (source.includes(marker)) {
  console.log('SKIP: 現在修正版ボタンV6は適用済みです。')
  process.exit(0)
}

const wrongClick = `onClick={() => { const firstVersion = versions.find(item => Number(item.version) === 1); if (firstVersion) openSavedEstimateVersion(entry, firstVersion); else { setOpenedEstimateVersion(1); openSavedEntry(entry) } }}`
const currentLabel = `{baseName}{versions.length ? estimateVersionMark(Math.max(...versions.map(item => Number(item.version) || 0)) + 1) : ''}`

if (!source.includes(wrongClick)) {
  fail('現在の②ファイルにある誤ったクリック処理が見つかりません。変更していません。')
}
if (!source.includes(currentLabel)) {
  fail('現在編集中ファイルの版番号表示が見つかりません。変更していません。')
}

fs.copyFileSync(appPath, backupPath)

try {
  // 重要:
  // エクスプローラー先頭の「現在編集中の見積②」は保存履歴version1ではなく、
  // 通常案件側に保持されている現在の編集内容を開く。
  const correctClick = `onClick={() => {
                                const currentVersion = versions.length
                                  ? Math.max(...versions.map(item => Number(item.version) || 0)) + 1
                                  : 1
                                setOpenedEstimateRows(null)
                                setOpenedEstimateVersion(currentVersion)
                                openSavedEntry(entry)
                              }} /* ${marker} */`

  source = source.replace(wrongClick, correctClick)

  // 保存済みの過去版ボタンは引き続きversion.rowsを開く。
  // 診断用クリックが残っている場合は通常処理へ戻す。
  source = source.replace(
    `onClick={(event) => { event.stopPropagation(); openEstimateVersionDiagnostics(entry, versions) }}`,
    `onClick={() => openSavedEstimateVersion(entry, version)}`
  )

  // 診断importが残っている場合だけ削除。
  source = source.replace(/^import \{ openEstimateVersionDiagnostics \} from ['"]\.\/estimateVersionDiagnostics['"].*\r?\n?/m, '')

  fs.writeFileSync(appPath, source, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 現在編集中の②を押したとき、初回snapshotではなく現在の編集内容を開くよう修正しました。')
  console.log('  - 無印の過去版: version1 snapshot')
  console.log('  - 現在編集中の②: 通常案件の現在データ')
  console.log('  - ②を保存して③を作った後: ②はversion2 snapshot')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
