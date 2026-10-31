const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const files = [
  path.join(root, 'src', 'App.jsx'),
  path.join(root, 'src', 'EstimateVersionPanel.jsx'),
  path.join(root, 'src', 'estimateSnapshotViewer.js'),
].filter(fs.existsSync)
const marker = 'M-CROSS_ESTIMATE_VERSION_NUMBERING_V4_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(path.join(root, 'src', 'App.jsx'))) fail('src/App.jsx が見つかりません。')
if (files.some(file => fs.readFileSync(file, 'utf8').includes(marker))) {
  console.log('SKIP: 見積番号修正V4は適用済みです。')
  process.exit(0)
}

const backups = []
try {
  for (const file of files) {
    const backup = file + '.before-version-numbering-v4'
    fs.copyFileSync(file, backup)
    backups.push([file, backup])
  }

  // App.jsx: 版番号の丸数字ルールと、エクスプローラーの現在版表示を修正。
  const appPath = path.join(root, 'src', 'App.jsx')
  let app = fs.readFileSync(appPath, 'utf8')

  const appMarkRegex = /function estimateVersionMark\(version\) \{[\s\S]*?\n\}/
  if (!appMarkRegex.test(app)) throw new Error('estimateVersionMark関数が見つかりません。')
  app = app.replace(appMarkRegex, `/* ${marker} */
function estimateVersionMark(version) {
  const marks = ['', '', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
  const number = Number(version) || 0
  return marks[number] ?? '（' + number + '）'
}`)

  // エクスプローラーの「採寸・現在の見積」ファイルは、現在版番号を明示する。
  const currentStrong = `<div><strong>{baseName}</strong><small>採寸・現在の見積 ／ 更新 {formatSavedDate(entry.updatedAt)}</small></div>`
  if (app.includes(currentStrong)) {
    app = app.replace(currentStrong, `<div><strong>{baseName}{versions.length ? estimateVersionMark(Math.max(...versions.map(item => Number(item.version) || 0)) + 1) : ''}</strong><small>{versions.length ? '現在編集中の見積' : '最初の見積'} ／ 更新 {formatSavedDate(entry.updatedAt)}</small></div>`)
  }

  // 保存済みスナップショット version=1 は無印として表示されるため、説明を明確化。
  const savedSmall = `<small>保存済み見積 ／ ¥{Number(version.totalAmount || 0).toLocaleString('ja-JP')}</small>`
  if (app.includes(savedSmall)) {
    app = app.replace(savedSmall, `<small>{Number(version.version) === 1 ? '最初の見積' : '修正版'} ／ ¥{Number(version.totalAmount || 0).toLocaleString('ja-JP')}</small>`)
  }
  fs.writeFileSync(appPath, app, 'utf8')

  // EstimateVersionPanel.jsx: version1を無印、version2以降を②③として表示。
  const panelPath = path.join(root, 'src', 'EstimateVersionPanel.jsx')
  if (fs.existsSync(panelPath)) {
    let panel = fs.readFileSync(panelPath, 'utf8')
    const labelRegex = /function versionLabel\(version\) \{[\s\S]*?\n\}/
    if (!labelRegex.test(panel)) throw new Error('EstimateVersionPanelのversionLabelが見つかりません。')
    panel = panel.replace(labelRegex, `/* ${marker} */
function versionLabel(version) {
  const marks = ['', '', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
  const number = Number(version) || 0
  return number === 1 ? 'お見積り（初回・無印）' : 'お見積り' + (marks[number] || '（' + number + '）')
}`)
    panel = panel.replace(/現在の内容が「お見積り①」としてここに残ります。/g, '現在の内容が「初回見積（無印）」としてここに残ります。')
    fs.writeFileSync(panelPath, panel, 'utf8')
  }

  // 閲覧専用Viewer: version1は①を付けず、無印として表示。
  const viewerPath = path.join(root, 'src', 'estimateSnapshotViewer.js')
  if (fs.existsSync(viewerPath)) {
    let viewer = fs.readFileSync(viewerPath, 'utf8')
    const markRegex = /function mark\(version\) \{[\s\S]*?\n\}/
    if (!markRegex.test(viewer)) throw new Error('estimateSnapshotViewerのmark関数が見つかりません。')
    viewer = viewer.replace(markRegex, `/* ${marker} */
function mark(version) {
  const marks = ['', '', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
  const number = Number(version) || 0
  return marks[number] || (number <= 1 ? '' : '（' + number + '）')
}`)
    fs.writeFileSync(viewerPath, viewer, 'utf8')
  }

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 見積番号を「無印 → ② → ③」に修正し、ビルド成功を確認しました。')
  console.log('  - 最初の見積: 無印')
  console.log('  - 1回目の修正版: ②')
  console.log('  - 2回目の修正版: ③')
  console.log('  - 保存済みversion1の閲覧画面・出力名から①を除去')
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  for (const [file, backup] of backups) if (fs.existsSync(backup)) fs.copyFileSync(backup, file)
  process.exit(1)
}
